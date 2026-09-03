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
//   • Meteo (MET Norway, CC-BY): { wx: 'FNC' } → série horária TRIMADA (48 h: temp/vento/
//       símbolo/precipitação), CACHEADA 45 min na tabela `wx_cache` (correr supabase/wx-cache.sql).
//       As COORDS resolvem-se AQUI pelo catálogo (airports-coords.ts) — `lat/lon` do corpo são
//       IGNORADOS (auditoria 2026-09-03: a cache é por IATA e partilhada por todos + páginas da
//       família → coords do cliente = envenenamento). O digest/labels são do cliente (puro, golden).
//
// DEPLOY (Dashboard): Edge Functions → Deploy → nome `flight-status` → cola → Deploy.
//   Segredo: Edge Functions → Secrets → AIRLABS_KEY = <a tua key>.
// DEPLOY (CLI): `supabase functions deploy flight-status` + `supabase secrets set AIRLABS_KEY=...`
//
// ⚠️ RE-DEPLOY obrigatório (2026-09-03): coords da meteo no servidor + rate-limit por uid +
//    validação de ids + purga das linhas efémeras. (A app continua a mandar lat/lon — ignorados.)

import { createClient } from 'npm:@supabase/supabase-js@2';
import COORDS from './airports-coords.ts';   // { IATA: [lat, lon] } — cópia gerada por scripts/build-share-coords.js (igual à da share-day)

const AIRLABS = 'https://airlabs.co/api/v9/flight';
const AIRLABS_SCH = 'https://airlabs.co/api/v9/schedules';
const STATS_TTL_MIN = 12;
const METNO = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const METNO_UA = 'CrewPact/1.0 (crewpact.app; funsnake@gmail.com)';   // TOS do met.no: identificação obrigatória
const WX_TTL_MIN = 45;   // o modelo atualiza ~1×/h; o TOS pede para não pedir mais

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Cache curto do lookup ao vivo (tabela `flight_live`, partilhada com share-day mas
// com PREFIXO `fs|`/`fsreg|` — nunca colide com as chaves "VOO|DIA" dela). Sem isto,
// cada card/auto-fill/rotação martelava o AirLabs → a função era a única alavanca de
// custo alcançável por quem tivesse a anon key. TTL curto porque o estado ao vivo muda.
const LIVE_TTL_SEC = 60;
// deno-lint-ignore no-explicit-any
async function cacheGet(rowKey: string): Promise<any | undefined> {
  try {
    const { data: c } = await admin().from('flight_live').select('data, computed_at').eq('flight', rowKey).maybeSingle();
    if (c && Date.now() - new Date(c.computed_at).getTime() < LIVE_TTL_SEC * 1000) return c.data ?? null;
  } catch { /* tabela ainda não criada → segue sem cache */ }
  return undefined;   // undefined = MISS (distinto de null = "sem voo" já cacheado)
}
// deno-lint-ignore no-explicit-any
async function cachePut(rowKey: string, val: any): Promise<void> {
  try { await admin().from('flight_live').upsert({ flight: rowKey, computed_at: new Date().toISOString(), data: val }); } catch { /* sem cache */ }
  // Higiene oportunista (~1 em 50 escritas): as linhas DESTA função (`fs|`, `fsreg|`, `rl|`) são
  // efémeras (TTL 60 s / 1 min) — sem purga a tabela crescia sem teto. As chaves "VOO|DIA" da
  // share-day NÃO são tocadas (a memória do "aterrou" tem de sobreviver o dia).
  if (Math.random() < 0.02) {
    try {
      await admin().from('flight_live').delete()
        .or('flight.like.fs|%,flight.like.fsreg|%,flight.like.rl|%')
        .lt('computed_at', new Date(Date.now() - 86_400_000).toISOString());
    } catch { /* best-effort */ }
  }
}

// Rate-limit por UTILIZADOR (auditoria 2026-09-03): balde fixo de 1 minuto guardado em
// `flight_live` (chave `rl|uid|minuto`, sem tabela nova). Falha da BD → deixa passar (o teto é
// defesa de quota AirLabs, não segurança; nunca bloquear a app por a cache não existir).
// Card ao vivo + batch + rotação + meteo + aeroporto juntos ficam bem abaixo de 30/min.
const RATE_PER_MIN = 30;
async function rateOk(uid: string): Promise<boolean> {
  const rowKey = `rl|${uid}|${Math.floor(Date.now() / 60_000)}`;
  try {
    const { data: c } = await admin().from('flight_live').select('data').eq('flight', rowKey).maybeSingle();
    const n = Number(c?.data?.n || 0) + 1;
    await admin().from('flight_live').upsert({ flight: rowKey, computed_at: new Date().toISOString(), data: { n } });
    return n <= RATE_PER_MIN;
  } catch { return true; }
}

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

// Meteo por estação (MET Norway) — série horária TRIMADA a 48 h, cache 45 min em
// `wx_cache`. Coords vêm do CATÁLOGO do servidor (arredondadas a 4 casas — TOS do met.no p/ caching).
// deno-lint-ignore no-explicit-any
async function stationWx(iata: string, lat: number, lon: number): Promise<Record<string, any> | null> {
  const code = String(iata || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const la = Math.round(Number(lat) * 1e4) / 1e4, lo = Math.round(Number(lon) * 1e4) / 1e4;
  if (code.length !== 3 || !isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  try {
    const { data: c } = await admin().from('wx_cache').select('wx, computed_at').eq('iata', code).maybeSingle();
    if (c && Date.now() - new Date(c.computed_at).getTime() < WX_TTL_MIN * 60e3) return c.wx;
  } catch { /* tabela ainda não criada → segue sem cache */ }
  try {
    const r = await fetch(`${METNO}?lat=${la}&lon=${lo}`, { headers: { 'User-Agent': METNO_UA } });
    const j = await r.json();
    // deno-lint-ignore no-explicit-any
    const ts: any[] = j?.properties?.timeseries || [];
    if (!ts.length) return null;
    const horizon = Date.now() + 48 * 3600e3;
    const series = ts.filter((e) => new Date(e.time).getTime() <= horizon).map((e) => {
      const inst = e?.data?.instant?.details || {};
      const n1 = e?.data?.next_1_hours, n6 = e?.data?.next_6_hours, n12 = e?.data?.next_12_hours;
      const nx = n1 || n6 || n12 || {};
      return {
        t: e.time,
        c: inst.air_temperature ?? null,          // °C
        w: inst.wind_speed ?? null,               // m/s
        s: nx?.summary?.symbol_code || null,      // ex. clearsky_day
        p: (n1 || n6)?.details?.precipitation_amount ?? null,   // mm
      };
    });
    const wx = { iata: code, updatedAt: j?.properties?.meta?.updated_at || null, series };
    try { await admin().from('wx_cache').upsert({ iata: code, computed_at: new Date().toISOString(), wx }); } catch { /* sem cache */ }
    return wx;
  } catch { return null; }
}

// Procura UM voo no AirLabs por id (iata/icao). Devolve a forma slim ou null.
async function lookup(key: string, id: string): Promise<ReturnType<typeof slim> | null> {
  const clean = id.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{3,8}$/.test(clean)) return null;   // só idents plausíveis (vai na URL do AirLabs)
  const p = /^[A-Z]{3}\d/.test(clean) ? 'flight_icao' : 'flight_iata';   // 3 letras+dígito = ICAO
  try {
    const r = await fetch(`${AIRLABS}?${p}=${encodeURIComponent(clean)}&api_key=${key}`);
    const j = await r.json();
    if (j.error) return null;
    return slim(j.response || {});
  } catch { return null; }
}

// lookup + CACHE curto (60 s) — cobre os modos single e batch e o 2.º passo do reg.
async function lookupCached(key: string, id: string): Promise<ReturnType<typeof slim> | null> {
  const clean = String(id || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{3,8}$/.test(clean)) return null;   // idem — nunca cachear lixo sem teto de tamanho
  const rowKey = `fs|${clean}`;
  const hit = await cacheGet(rowKey);
  if (hit !== undefined) return hit;   // slim OU null cacheado
  const s = await lookup(key, clean);
  await cachePut(rowKey, s);
  return s;
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  const key = Deno.env.get('AIRLABS_KEY');
  if (!key) return json({ ok: false, error: 'no_key' }, 500);

  // ── Auth: exige SESSÃO de utilizador (não basta a anon key, que vai no bundle) ──
  // A app invoca com o JWT da sessão (functions.invoke anexa-o); getUser REJEITA a anon
  // key → só contas registadas chamam esta função. Sobe a fasquia do abuso da quota
  // AirLabs de "qualquer um com a key pública" para "utilizador autenticado".
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ ok: false, error: 'unauthorized' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: uData, error: uErr } = await userClient.auth.getUser(jwt);
  if (uErr || !uData?.user) return json({ ok: false, error: 'unauthorized' }, 401);

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }

  // ── Rate-limit por utilizador (a share-day já tinha 10/min; esta não tinha nada) ──
  if (!(await rateOk(uData.user.id))) return json({ ok: false, error: 'rate' }, 429);

  // ── Modo BATCH (auto-fill): { flights: [...] } → array de resultados (mesma ordem) ──
  if (Array.isArray(body.flights)) {
    const ids = body.flights.slice(0, 8).map((x: unknown) => String(x || '')).filter(Boolean);  // teto 8 legs
    if (!ids.length) return json({ ok: false, error: 'no_flight' }, 400);
    const results = await Promise.all(ids.map((id: string) => lookupCached(key, id)));
    return json({ ok: true, results });
  }

  // ── Modo METEO (MET Norway): { wx, lat, lon } → série 48 h (não usa a AIRLABS_KEY) ──
  if (body.wx) {
    // Coords SÓ do catálogo do servidor (nunca do corpo — ver cabeçalho). Código desconhecido → found:false.
    const code = String(body.wx).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const co = (COORDS as Record<string, [number, number]>)[code];
    if (!co) return json({ ok: true, found: false });
    const s = await stationWx(code, co[0], co[1]);
    return json(s ? { ok: true, found: true, wx: s } : { ok: true, found: false });
  }

  // ── Modo AEROPORTO (Airport Intelligence): { airport: 'LIS' } → fotografia de hoje ──
  if (body.airport) {
    const s = await airportStats(key, String(body.airport));
    return json(s ? { ok: true, found: true, airport: s } : { ok: true, found: false });
  }

  // ── Modo INBOUND (rotação): { reg } → onde anda o avião AGORA ──
  if (body.reg) {
    const reg = String(body.reg).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    if (!/^[A-Z0-9-]{3,10}$/.test(reg)) return json({ ok: false, error: 'no_reg' }, 400);
    const rowKey = `fsreg|${reg}`;
    const hit = await cacheGet(rowKey);   // cacheia a resolução reg→voo (slim OU null)
    if (hit !== undefined) return json(hit ? { ok: true, found: true, ...hit } : { ok: true, found: false });
    try {
      const r = await fetch(`https://airlabs.co/api/v9/flights?reg_number=${encodeURIComponent(reg)}&api_key=${key}`);
      const j = await r.json();
      const cur = Array.isArray(j?.response) && j.response.length ? j.response[0] : null;
      const id = cur && (cur.flight_icao || cur.flight_iata);
      const s = id ? await lookup(key, String(id)) : null;
      await cachePut(rowKey, s);
      return json(s ? { ok: true, found: true, ...s } : { ok: true, found: false });
    } catch { return json({ ok: true, found: false }); }
  }

  // ── Modo ÚNICO (card ao vivo): { flight_iata|flight_icao } ──
  const single = body.flight_iata || body.flight_icao;
  if (!single) return json({ ok: false, error: 'no_flight' }, 400);
  const s = await lookupCached(key, String(single));
  return json(s ? { ok: true, found: true, ...s } : { ok: true, found: false });
});
