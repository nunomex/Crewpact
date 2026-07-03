// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: `flight-status`  —  PROXY seguro do AirLabs (estado de voo)
// ════════════════════════════════════════════════════════════════════════════
// A API key do AirLabs NUNCA vai na app — fica como SEGREDO do servidor (`AIRLABS_KEY`).
// A app chama esta função com a sua sessão Supabase; devolvemos só a forma SLIM.
//
// MODOS (POST):
//   • Único  (card ao vivo):     { flight_iata: 'U25421' }  ou  { flight_icao: 'EJU7625' }
//   • Batch  (detetar/auto-fill): { flights: ['EJU7625','EJU7626'] }  → { ok, results:[slim|null] }
//   • Inbound (rotação):          { reg: 'G-UZHB' } → o voo ATUAL dessa matrícula (o avião
//       que nos vem buscar) — /flights?reg_number dá o ident, /flight dá a forma slim.
//   • Aeroporto (Airport Intelligence à crew): { airport: 'LIS' } → fotografia de HOJE
//       (% atrasados ≥15 min, atraso médio dos atrasados, % cancelados — partidas e
//       chegadas), agregada do /schedules e CACHEADA 12 min na tabela `airport_stats`
//       (correr supabase/airport-stats.sql antes; sem a tabela degrada — recalcula sempre).
//
// DEPLOY (Dashboard): Edge Functions → Deploy → nome `flight-status` → cola → Deploy.
//   Segredo: Edge Functions → Secrets → AIRLABS_KEY = <a tua key>.
// DEPLOY (CLI): `supabase functions deploy flight-status` + `supabase secrets set AIRLABS_KEY=...`
//
// ⚠️ Se já tinhas a versão anterior deployed, FAZ RE-DEPLOY (esta acrescenta o modo `airport`).

import { createClient } from 'npm:@supabase/supabase-js@2';

const AIRLABS = 'https://airlabs.co/api/v9/flight';
const AIRLABS_SCH = 'https://airlabs.co/api/v9/schedules';
const STATS_TTL_MIN = 12;

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const num = (v: unknown) => (v == null || v === '' ? null : Number(v));

// Tipo de aeronave ICAO → código IATA curto (como vem no PDF: "[321]"). Fallback = o que vier.
const ICAO_TO_IATA_AC: Record<string, string> = {
  A318: '318', A319: '319', A320: '320', A321: '321',
  A19N: '31N', A20N: '32N', A21N: '32Q',          // neos
  B737: '737', B738: '738', B739: '739', E190: 'E90', E195: 'E95',
};
const acShort = (icao: unknown) => {
  const k = String(icao || '').toUpperCase();
  return ICAO_TO_IATA_AC[k] || (icao ? String(icao) : null);
};

// deno-lint-ignore no-explicit-any
const slim = (f: Record<string, any>) => {
  if (!f || !f.flight_iata) return null;
  const depDelay = num(f.dep_delayed);
  const status = String(f.status || '').toLowerCase();
  return {
    flightIata: f.flight_iata, flightIcao: f.flight_icao, airline: f.airline_iata, status: f.status,
    duration: num(f.duration),     // minutos de voo (p/ o auto-fill: tempo de voo por leg)
    aircraft: { type: acShort(f.aircraft_icao), icao: f.aircraft_icao || null, model: f.model || null, reg: f.reg_number || null },
    dep: {
      iata: f.dep_iata,
      scheduled: f.dep_time, estimated: f.dep_estimated, actual: f.dep_actual,
      scheduledUtc: f.dep_time_utc, estimatedUtc: f.dep_estimated_utc, actualUtc: f.dep_actual_utc,
      scheduledTs: f.dep_time_ts, estimatedTs: f.dep_estimated_ts, actualTs: f.dep_actual_ts,
      delayMin: depDelay, gate: f.dep_gate ?? null, terminal: f.dep_terminal ?? null,
    },
    arr: {
      iata: f.arr_iata,
      scheduled: f.arr_time, estimated: f.arr_estimated, actual: f.arr_actual,
      scheduledUtc: f.arr_time_utc, estimatedUtc: f.arr_estimated_utc, actualUtc: f.arr_actual_utc,   // Zulu (UTC) da chegada
      scheduledTs: f.arr_time_ts, estimatedTs: f.arr_estimated_ts, delayMin: num(f.arr_delayed),
    },
    delayed: (depDelay ?? 0) >= 15 || ['delayed', 'cancelled', 'canceled', 'diverted'].includes(status),
    updatedTs: f.updated ?? null,
  };
};

// Fotografia do AEROPORTO (hoje): % atrasados (≥15 min), atraso médio DOS ATRASADOS,
// % cancelados — partidas e chegadas. Cache partilhada em `airport_stats` (TTL 12 min):
// o custo AirLabs fica ~5 pares de chamadas/hora/aeroporto no pior caso, seja quanta
// gente estiver a olhar. GÉMEA em share-day/index.ts — manter em sincronia.
// deno-lint-ignore no-explicit-any
async function airportStats(key: string, iata: string): Promise<Record<string, any> | null> {
  const code = String(iata || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (code.length !== 3) return null;
  try {
    const { data: c } = await admin().from('airport_stats').select('stats, computed_at').eq('iata', code).maybeSingle();
    if (c && Date.now() - new Date(c.computed_at).getTime() < STATS_TTL_MIN * 60e3) return c.stats;
  } catch { /* tabela ainda não criada → segue sem cache */ }
  const side = async (param: string) => {
    try {
      const r = await fetch(`${AIRLABS_SCH}?${param}=${code}&api_key=${key}`);
      const j = await r.json();
      // deno-lint-ignore no-explicit-any
      const rows: any[] = (!j || j.error || !Array.isArray(j.response)) ? [] : j.response;
      const dKey = param === 'dep_iata' ? 'dep_delayed' : 'arr_delayed';
      let n = 0, delayed = 0, cancelled = 0, sum = 0;
      for (const row of rows) {
        const st = String(row?.status || '').toLowerCase();
        if (!st) continue;
        n++;
        if (st === 'cancelled' || st === 'canceled') { cancelled++; continue; }
        const d = Number(row?.[dKey] ?? row?.delayed ?? 0) || 0;
        if (d >= 15) { delayed++; sum += d; }
      }
      return { n, delayedPct: n ? Math.round((delayed / n) * 100) : 0, avgDelayMin: delayed ? Math.round(sum / delayed) : 0, cancelPct: n ? Math.round((cancelled / n) * 100) : 0 };
    } catch { return { n: 0, delayedPct: 0, avgDelayMin: 0, cancelPct: 0 }; }
  };
  const [dep, arr] = await Promise.all([side('dep_iata'), side('arr_iata')]);
  if (!dep.n && !arr.n) return null;   // plano sem /schedules ou aeroporto desconhecido → sem stats (a app esconde)
  const stats = { iata: code, dep, arr, computedAt: Math.floor(Date.now() / 1000) };
  try { await admin().from('airport_stats').upsert({ iata: code, computed_at: new Date().toISOString(), stats }); } catch { /* sem cache */ }
  return stats;
}

// Procura UM voo no AirLabs por id (iata/icao). Devolve a forma slim ou null.
async function lookup(key: string, id: string): Promise<ReturnType<typeof slim> | null> {
  const clean = id.toUpperCase().replace(/\s+/g, '');
  if (!clean) return null;
  const p = /^[A-Z]{3}\d/.test(clean) ? 'flight_icao' : 'flight_iata';   // 3 letras+dígito = ICAO
  try {
    const r = await fetch(`${AIRLABS}?${p}=${encodeURIComponent(clean)}&api_key=${key}`);
    const j = await r.json();
    if (j.error) return null;
    return slim(j.response || {});
  } catch { return null; }
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const key = Deno.env.get('AIRLABS_KEY');
  if (!key) return json({ ok: false, error: 'no_key' }, 500);

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }

  // ── Modo BATCH (auto-fill): { flights: [...] } → array de resultados (mesma ordem) ──
  if (Array.isArray(body.flights)) {
    const ids = body.flights.slice(0, 8).map((x: unknown) => String(x || '')).filter(Boolean);  // teto 8 legs
    if (!ids.length) return json({ ok: false, error: 'no_flight' }, 400);
    const results = await Promise.all(ids.map((id: string) => lookup(key, id)));
    return json({ ok: true, results });
  }

  // ── Modo AEROPORTO (Airport Intelligence): { airport: 'LIS' } → fotografia de hoje ──
  if (body.airport) {
    const s = await airportStats(key, String(body.airport));
    return json(s ? { ok: true, found: true, airport: s } : { ok: true, found: false });
  }

  // ── Modo INBOUND (rotação): { reg } → onde anda o avião AGORA ──
  if (body.reg) {
    const reg = String(body.reg).toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!reg) return json({ ok: false, error: 'no_reg' }, 400);
    try {
      const r = await fetch(`https://airlabs.co/api/v9/flights?reg_number=${encodeURIComponent(reg)}&api_key=${key}`);
      const j = await r.json();
      const cur = Array.isArray(j?.response) && j.response.length ? j.response[0] : null;
      const id = cur && (cur.flight_icao || cur.flight_iata);
      if (!id) return json({ ok: true, found: false });
      const s = await lookup(key, String(id));
      return json(s ? { ok: true, found: true, ...s } : { ok: true, found: false });
    } catch { return json({ ok: true, found: false }); }
  }

  // ── Modo ÚNICO (card ao vivo): { flight_iata|flight_icao } ──
  const single = body.flight_iata || body.flight_icao;
  if (!single) return json({ ok: false, error: 'no_flight' }, 400);
  const s = await lookup(key, String(single));
  return json(s ? { ok: true, found: true, ...s } : { ok: true, found: false });
});
