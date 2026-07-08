// ════════════════════════════════════════════════════════════════════════════
// Supabase Edge Function: `share-day` — partilha da CHEGADA do dia com a família
// ════════════════════════════════════════════════════════════════════════════
// A ideia (Flighty→crew): o tripulante partilha UM LINK temporário; quem o recebe
// abre no BROWSER (sem app, sem conta) e vê a última perna do dia com a hora de
// chegada REAL (AirLabs, hora local do aeroporto), a atualizar sozinha. Privacidade:
// só as legs desse dia (nunca a escala), link expira (24 h), tabela fechada por RLS.
//
//   • POST (com sessão Supabase): { date:'YYYY-MM-DD', legs:[{flight,dep,arr}] }
//       → cria token DESCARTÁVEL (24 h) → { ok, url }
//   • POST família (links PERMANENTES — "Flighty Friends" camada 1):
//       { familyAction:'create', label:'Mãe' } → { ok, id, url }
//       { familyAction:'list' } → { ok, links:[{id,label,url,createdAt}] }
//       { familyAction:'revoke', id } → { ok } (apaga — o link morre já)
//     O link de família mostra SEMPRE a chegada de HOJE: resolvido na tabela
//     `duties` (que a app sincroniza) — legs do roster_meta, primária + extra.
//     ANTES: correr supabase/family-links.sql (tabela + purga de órfãos).
//   • GET  ?t=<token> (PÚBLICO — o link que a família abre): dados/página da
//       chegada ao vivo; descartável expira às 24 h, o de família não expira.
//
// DEPLOY (CLI):
//   supabase functions deploy share-day --no-verify-jwt
//   (o --no-verify-jwt é OBRIGATÓRIO: o GET é público por design; o POST valida a
//    sessão à mão cá dentro. Segredos já existentes: AIRLABS_KEY; usa também
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY, injetados.)
//   Importa ./airports-coords.ts (catálogo IATA→coords, gerado por scripts/build-share-coords.js)
//   — o bundler da CLI inclui-o; re-gerar se data/airports.json mudar.
// ANTES: correr no SQL Editor: supabase/share-day.sql (tabela + RLS + purga),
//   supabase/wx-cache.sql (cache do TEMPO, partilhada com flight-status) e
//   supabase/flight-live.sql (cache curta do voo ao vivo, TTL 60 s — limita as
//   chamadas AirLabs no link público). Todas degradam se faltarem (só perdem cache).
//
// ⚠️ HTML NO *.supabase.co É BLOQUEADO (verificado 2026-07-03): o gateway reescreve
//    text/html → text/plain + CSP sandbox (anti-phishing) — a página NÃO renderiza no
//    domínio deles. Por isso a página da família vive num DOMÍNIO NOSSO (web/chegada.html
//    em crewpact.app) e chama o GET ?t=..&j=1 (JSON, não afetado). O modo HTML fica cá
//    (funciona com custom domain do Supabase, se um dia existir). Para os links saírem
//    já com o domínio próprio: secret `SHARE_PAGE_URL` = https://crewpact.app/chegada
//    (Edge Functions → Secrets) — sem ele, o link cai no functions.supabase.co (texto cru).

import { createClient } from 'npm:@supabase/supabase-js@2';
import COORDS from './airports-coords.ts';   // { IATA: [lat, lon] } — gerado por scripts/build-share-coords.js

const AIRLABS = 'https://airlabs.co/api/v9/flight';
const AIRLABS_SCH = 'https://airlabs.co/api/v9/schedules';
const STATS_TTL_MIN = 12;
const LIVE_TTL_SEC = 60;   // cache do voo ao vivo: 60 s alinha com o refresh da página → ~1 chamada/voo/min
const TTL_HOURS = 24;
// Meteo do destino (MET Norway) — para a célula "Tempo" da página. GÉMEO de
// flight-status/index.ts: mesma função e MESMA cache `wx_cache` (chave por iata),
// por isso reutiliza-se a linha de cache entre as duas Edges. Manter em sincronia.
const METNO = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const METNO_UA = 'CrewPact/1.0 (crewpact.app; funsnake@gmail.com)';   // TOS do met.no: identificação obrigatória
const WX_TTL_MIN = 45;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' } });

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Token URL-safe (26 chars base32-ish) — não adivinhável.
const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => 'abcdefghijklmnopqrstuvwxyz234567'[b % 32]).join('');
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const num = (v: unknown) => (v == null || v === '' ? null : Number(v));

// Coordenadas do aeroporto por código IATA (catálogo embebido) — para o TEMPO do destino
// funcionar em QUALQUER link, incluindo os de FAMÍLIA (que resolvem as legs sem coords).
const coordFor = (code: unknown): { lat: number; lon: number } | null => {
  const c = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const e = (COORDS as Record<string, [number, number]>)[c];
  return e ? { lat: e[0], lon: e[1] } : null;
};

// ── Página HTML (mobile-first, sem JS além do refresh; estética FIDS/navy da app) ──
function page(title: string, inner: string, refresh = false) {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${refresh ? '<meta http-equiv="refresh" content="60">' : ''}
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  body{margin:0;background:#14263A;color:#fff;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
  .card{background:#1F4E79;border-radius:20px;padding:26px 24px;max-width:400px;width:100%;box-shadow:0 18px 50px rgba(0,0,0,.35)}
  .brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;letter-spacing:-.2px}
  .dot{width:8px;height:8px;border-radius:3px;background:#F5402C}
  .eyebrow{font-size:10.5px;letter-spacing:1.4px;color:rgba(255,255,255,.62);margin-top:20px;text-transform:uppercase;font-weight:800}
  .flight{font-size:28px;font-weight:800;letter-spacing:-.5px;margin-top:4px;font-variant-numeric:tabular-nums}
  .route{font-size:16px;color:rgba(255,255,255,.85);margin-top:2px;font-weight:600}
  .eta{font-size:44px;font-weight:800;letter-spacing:-1px;margin-top:14px;font-variant-numeric:tabular-nums}
  .etaSub{font-size:12.5px;color:rgba(255,255,255,.62);margin-top:4px;line-height:1.5}
  .status{display:inline-block;margin-top:16px;padding:6px 12px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.4px;background:rgba(255,255,255,.12)}
  .ok{background:#1f7a4d}.warn{background:#a35b00}.bad{background:#b3261e}
  .foot{font-size:11px;color:rgba(255,255,255,.45);margin-top:22px;text-align:center;line-height:1.6}
</style></head><body><div class="card">
<div class="brand"><span class="dot"></span>CrewPact</div>
${inner}
</div><div class="foot">Link temporário criado por um tripulante · expira sozinho.<br>Atualiza a cada minuto.</div></body></html>`;
}

// Extrai as legs de voo de UMA duty (roster_meta) — primária + cada serviço `extra`
// (multi-serviço), SÓ kind voo. Guarda o `off`/`on` (horas de parede de partida/chegada)
// da leg, usados para reconhecer um red-eye. [] se a duty não tiver voos.
// deno-lint-ignore no-explicit-any
function legsFromDuty(duty: any): { flight: string; dep: string; arr: string; off: string; on: string }[] {
  if (!duty) return [];
  // deno-lint-ignore no-explicit-any
  let meta: Record<string, any> = {};
  try { meta = JSON.parse(duty.roster_meta || '{}') || {}; } catch { /* legado sem meta */ }
  const out: { flight: string; dep: string; arr: string; off: string; on: string }[] = [];
  const push = (legs: unknown) => {
    if (!Array.isArray(legs)) return;
    for (const lg of legs) {
      // deno-lint-ignore no-explicit-any
      const l = lg as Record<string, any>;
      const flight = String(l?.flightNo || l?.flight || '').toUpperCase().replace(/\s+/g, '');
      if (!flight) continue;
      out.push({ flight, dep: String(l?.dep || '').toUpperCase().slice(0, 3), arr: String(l?.arr || '').toUpperCase().slice(0, 3), off: String(l?.off || ''), on: String(l?.on || '') });
    }
  };
  if ((duty.kind || 'flight') === 'flight') push(meta.legs);
  for (const ex of (Array.isArray(meta.extra) ? meta.extra : [])) {
    if (ex && (ex.kind || 'flight') === 'flight') push(ex.legs);
  }
  return out;
}

// "HH:MM" → minutos (null se inválido/vazio) — para comparar horas de parede das legs.
const hmMin = (hm: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? (+m[1] * 60 + +m[2]) : null; };

// Legs da chegada a mostrar num link de FAMÍLIA + o DIA a que pertencem. Normalmente é HOJE
// (UTC). EXCEÇÃO red-eye: um voo que parte no dia D e aterra depois da meia-noite deixaria de
// aparecer ("sem chegada hoje") com o avião ainda no ar, porque a duty está datada em D. Então:
// se hoje não tem voo e a última perna de ONTEM CRUZOU a meia-noite — chegada de parede ANTES da
// partida de parede (on<off, ex. off 22:00 → on 01:30) — essa chegada pertence de facto a HOJE e
// mostra-se o dia todo. Um voo matinal contido em ontem (off 04:40 → on 05:55) NÃO passa, e o
// teste é por hora de parede: vale para red-eyes que aterram depois das 06h UTC (oeste) também.
// Exige off E on presentes (evidência positiva; quick-adds manuais sem horas não disparam).
// O `day` volta como o dia REAL do voo → a chave VOO|DIA da memória do aterrou casa dos dois
// lados da meia-noite (às 23h de D e às 00h15 de D+1 é a mesma chave). [] = sem chegada hoje.
async function familyLegsFor(uid: string): Promise<{ legs: { flight: string; dep: string; arr: string }[]; day: string }> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const readDuty = async (d: string) =>
    (await admin().from('duties').select('kind, roster_meta').eq('user_id', uid).eq('duty_date', d).maybeSingle()).data;

  let legs = legsFromDuty(await readDuty(today));
  let day = today;
  if (!legs.length) {
    const yest = new Date(now.getTime() - 24 * 3600e3).toISOString().slice(0, 10);
    const yLegs = legsFromDuty(await readDuty(yest));
    const lastLeg = yLegs.length ? yLegs[yLegs.length - 1] : null;
    const om = lastLeg ? hmMin(lastLeg.off) : null, nm = lastLeg ? hmMin(lastLeg.on) : null;
    if (om != null && nm != null && nm < om) { legs = yLegs; day = yest; }   // cruzou a meia-noite → red-eye
  }
  return { legs: legs.map(({ flight, dep, arr }) => ({ flight, dep, arr })), day };   // não expõe off/on
}

// deno-lint-ignore no-explicit-any
async function liveFor(key: string, flight: string): Promise<Record<string, any> | null> {
  const clean = String(flight || '').toUpperCase().replace(/\s+/g, '');
  if (!clean) return null;
  const p = /^[A-Z]{3}\d/.test(clean) ? 'flight_icao' : 'flight_iata';
  try {
    const r = await fetch(`${AIRLABS}?${p}=${encodeURIComponent(clean)}&api_key=${key}`);
    const j = await r.json();
    return j && !j.error ? (j.response || null) : null;
  } catch { return null; }
}

// liveFor + CACHE (`flight_live`) com DUAS funções:
//  (1) Cache curta (TTL 60 s) — o GET é PÚBLICO e um link de família é permanente; sem cache,
//      cada refresh/pessoa/ataque martelava o AirLabs. Disciplina de wx_cache/airport_stats.
//  (2) MEMÓRIA do "aterrou" — o /flight do AirLabs LARGA o voo do feed pouco depois de aterrar;
//      sem memória, quem abrisse o link mais tarde perdia o "Aterrou" (regredia p/ "sem estimativa").
//      Ao ver `arr_actual` OU status 'landed' uma vez, guardamos e devolvemos SEMPRE esse estado o
//      resto do dia, sem re-chamar (também poupa quota: um voo aterrado = 0 chamadas AirLabs).
// Chave por VOO+DIA → o mesmo nº de voo de amanhã NÃO herda o aterrou de hoje. Cacheia também o
// null ("voo que o AirLabs não conhece"). Degrada se a tabela faltar. Correr supabase/flight-live.sql.

// "Aterrado" TEM de casar com a página (landed = st==='landed' || arr_actual): o AirLabs marca
// muitos voos como 'landed' por POSIÇÃO, sem hora real de calços (arr_actual null). Se a memória
// só olhasse a arr_actual, esses regrediam a "sem dados" quando o AirLabs largasse o voo.
// deno-lint-ignore no-explicit-any
const isLanded = (d: any) => !!(d && (d.arr_actual || String(d.status || '').toLowerCase() === 'landed'));

// deno-lint-ignore no-explicit-any
async function liveCached(key: string, flight: string, day: string): Promise<Record<string, any> | null> {
  const clean = String(flight || '').toUpperCase().replace(/\s+/g, '');
  if (!clean) return null;
  const rowKey = day ? `${clean}|${day}` : clean;   // voo+dia — sem colisão com o mesmo voo noutro dia
  try {
    const { data: c } = await admin().from('flight_live').select('data, computed_at').eq('flight', rowKey).maybeSingle();
    if (c && isLanded(c.data)) return c.data;   // já aterrou → memória: fica aterrado o dia todo (nunca re-busca → nunca é apagado com null)
    if (c && Date.now() - new Date(c.computed_at).getTime() < LIVE_TTL_SEC * 1000) return c.data ?? null;   // cache 60 s
  } catch { /* tabela ainda não criada → segue sem cache */ }
  const f = await liveFor(key, clean);
  try { await admin().from('flight_live').upsert({ flight: rowKey, computed_at: new Date().toISOString(), data: f }); } catch { /* sem cache */ }
  return f;
}

// Fotografia do AEROPORTO (Airport Intelligence) — GÉMEA de flight-status/index.ts,
// manter em sincronia. Cache `airport_stats` (TTL 12 min) limita o custo AirLabs.
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
  if (!dep.n && !arr.n) return null;
  const stats = { iata: code, dep, arr, computedAt: Math.floor(Date.now() / 1000) };
  try { await admin().from('airport_stats').upsert({ iata: code, computed_at: new Date().toISOString(), stats }); } catch { /* sem cache */ }
  return stats;
}

// Meteo por estação (MET Norway) — série horária a 48 h, cache 45 min em `wx_cache`
// (chave por iata). GÉMEA de flight-status/index.ts — MESMA forma do blob e MESMA
// linha de cache, para as duas Edges partilharem o pedido. Coords vêm da app.
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
      return { t: e.time, c: inst.air_temperature ?? null, w: inst.wind_speed ?? null, s: nx?.summary?.symbol_code || null, p: (n1 || n6)?.details?.precipitation_amount ?? null };
    });
    const wx = { iata: code, updatedAt: j?.properties?.meta?.updated_at || null, series };
    try { await admin().from('wx_cache').upsert({ iata: code, computed_at: new Date().toISOString(), wx }); } catch { /* sem cache */ }
    return wx;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);

  // ── GET público: os dados do link — `&j=1` (a página em crewpact.app) devolve JSON;
  //    sem `j` devolve HTML (só útil com custom domain — o *.supabase.co bloqueia-o). ──
  if (req.method === 'GET') {
    const wantJson = !!url.searchParams.get('j');
    const token = String(url.searchParams.get('t') || '').replace(/[^a-z2-7]/g, '');
    // 1.º o token DESCARTÁVEL (legs congeladas, 24 h); 2.º o de FAMÍLIA (permanente —
    // resolve as legs de HOJE na tabela duties); senão, inválido.
    // deno-lint-ignore no-explicit-any
    let legs: any[] = []; let isFamily = false; let found = false; let expired = false; let shareDate: string | null = null;
    const row = token
      ? (await admin().from('shared_days').select('legs, share_date, expires_at').eq('token', token).maybeSingle()).data
      : null;
    if (row) {
      found = true;
      expired = new Date(row.expires_at).getTime() < Date.now();
      legs = Array.isArray(row.legs) ? row.legs : [];
      shareDate = row.share_date;
    } else if (token) {
      const fam = (await admin().from('family_links').select('uid').eq('token', token).maybeSingle()).data;
      if (fam) { found = true; isFamily = true; const fr = await familyLegsFor(fam.uid); legs = fr.legs; shareDate = fr.day; }
    }
    if (!found) {
      if (wantJson) return json({ ok: true, found: false });
      return html(page('CrewPact', '<div class="eyebrow">Link inválido</div><div class="route">Pede um link novo a quem to enviou.</div>'), 404);
    }
    if (expired) {
      if (wantJson) return json({ ok: true, found: true, expired: true });
      return html(page('CrewPact', '<div class="eyebrow">Link expirado</div><div class="route">Este link já não está ativo — pede um novo.</div>'));
    }
    // Link de família SEM voo hoje: não é erro — a página convida a guardar o link.
    if (isFamily && !legs.length) {
      if (wantJson) return json({ ok: true, found: true, expired: false, noFlight: true, family: true });
      return html(page('CrewPact', '<div class="eyebrow">Sem chegada hoje</div><div class="route">Hoje não há voo para acompanhar. Guarda esta página — mostra sempre a chegada do dia. ✈️</div>'));
    }
    // Última perna do dia = a chegada que interessa à família.
    const last = legs[legs.length - 1] || {};
    const key = Deno.env.get('AIRLABS_KEY') || '';
    const f = key && last.flight ? await liveCached(key, last.flight, shareDate || '') : null;

    const dep = esc(f?.dep_iata || last.dep || '—');
    const arr = esc(f?.arr_iata || last.arr || '—');
    const fno = esc(f?.flight_iata || last.flight || '');
    const eta = f?.arr_actual || f?.arr_estimated || f?.arr_time || null;   // hora LOCAL do aeroporto (AirLabs)
    const etaHm = eta ? esc(String(eta).slice(11, 16)) : null;
    const st = String(f?.status || '').toLowerCase();
    const landed = st === 'landed' || !!f?.arr_actual;
    const delayed15 = (f?.dep_delayed ?? 0) >= 15;
    const statusCls = landed ? 'ok' : (st === 'cancelled' || st === 'canceled' || st === 'diverted') ? 'bad' : (delayed15 ? 'warn' : '');
    const statusTxt = landed ? 'Aterrou' : st === 'en-route' ? 'No ar' : st === 'scheduled' ? 'Agendado' : (st ? esc(f!.status) : 'Sem dados ao vivo');
    // Contexto do AEROPORTO de chegada (Airport Intelligence): só quando está mesmo
    // complicado — limiares GÉMEOS do airportDisruption (data/flightDelay.js): amostra
    // ≥8, aviso a ≥30% atrasados ou ≥10% cancelados. Explica à família o "porquê".
    let airportWarn: string | null = null;
    if (!landed && key && arr && arr !== '—') {
      const ap = await airportStats(key, arr);
      const a = ap && ap.arr;
      if (a && a.n >= 8 && (a.delayedPct >= 30 || a.cancelPct >= 10)) {
        airportWarn = `${arr} agora: ${a.delayedPct}% das chegadas atrasadas${a.avgDelayMin ? ` · média ${a.avgDelayMin} min` : ''}${a.cancelPct >= 10 ? ` · ${a.cancelPct}% canceladas` : ''}`;
      }
    }
    if (wantJson) {
      // Timestamps p/ o countdown ("aterra em ~N min") e a barra de progresso da página —
      // calculados LÁ com o relógio corrigido por `nowTs` (offset servidor−cliente), sem
      // custo extra de API. depTs SÓ com partida real (progresso de voo no chão não existe).
      const etaTs = num(f?.arr_actual_ts) ?? num(f?.arr_estimated_ts) ?? num(f?.arr_time_ts);
      const depTs = num(f?.dep_actual_ts);
      // Tira do cartão: Partida (hora real/estimada/prevista) + Duração (minutos de voo AirLabs).
      const depT = f?.dep_actual || f?.dep_estimated || f?.dep_time || null;   // hora LOCAL de partida
      const depHm = depT ? esc(String(depT).slice(11, 16)) : null;
      const durationMin = num(f?.duration);
      // Tempo AGORA no destino — coords do catálogo embebido (funciona em TODOS os links,
      // família incluída; a Edge não recebe coords). series[0] = agora. stationWx cacheia 45 min.
      let wxC: number | null = null, wxSym: string | null = null;
      const arrCode = String(f?.arr_iata || last.arr || '');
      const cc = coordFor(arrCode);
      if (cc) {
        const w = await stationWx(arrCode, cc.lat, cc.lon);
        // deno-lint-ignore no-explicit-any
        const s0: any = w && Array.isArray(w.series) ? w.series[0] : null;
        if (s0 && s0.c != null) { wxC = Math.round(Number(s0.c)); wxSym = s0.s || null; }
      }
      return json({ ok: true, found: true, expired: false, date: shareDate, legsCount: legs.length, family: isFamily,
        flight: fno, dep, arr, etaHm, depHm, durationMin, wxC, wxSym, landed, status: statusTxt, tone: statusCls || 'none',
        airportWarn, etaTs, depTs, nowTs: Math.floor(Date.now() / 1000) });
    }
    const inner = `
<div class="eyebrow">Chegada de hoje${legs.length > 1 ? ` · ${legs.length} voos` : ''}</div>
<div class="flight">${fno || 'Voo'}</div>
<div class="route">${dep} → ${arr}</div>
<div class="eta">${etaHm ? `~${etaHm}` : '—'}</div>
<div class="etaSub">${etaHm ? `hora local de ${arr}` : 'ainda sem estimativa — volta a abrir mais perto da hora'}${landed ? ' · já em terra ✓' : ''}</div>
<span class="status ${statusCls}">${statusTxt}</span>${airportWarn ? `<div class="etaSub" style="margin-top:10px">⚠️ ${airportWarn}</div>` : ''}`;
    return html(page(`${fno} ${dep}→${arr} · CrewPact`, inner, !landed));
  }

  // ── POST autenticado: criar o link (a app) ──
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const auth = req.headers.get('Authorization') || '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ ok: false, error: 'unauthorized' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ ok: false, error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  // deno-lint-ignore no-explicit-any
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* vazio */ }

  // ── FAMÍLIA (links permanentes) — criar / listar / revogar, sempre uid-scoped ──
  const pageBaseF = (Deno.env.get('SHARE_PAGE_URL') || '').replace(/\/+$/, '');
  const urlFor = (tk: string) => pageBaseF ? `${pageBaseF}/c/${tk}` : `${Deno.env.get('SUPABASE_URL')}/functions/v1/share-day?t=${tk}`;
  if (body.familyAction === 'create') {
    const label = String(body.label || '').slice(0, 40).trim();
    if (!label) return json({ ok: false, error: 'no_label' }, 400);
    const token = newToken();
    const { data: ins, error: insE } = await admin().from('family_links')
      .insert({ token, uid, label }).select('id').single();
    if (insE || !ins) return json({ ok: false, error: 'db' }, 500);
    return json({ ok: true, id: ins.id, label, url: urlFor(token) });
  }
  if (body.familyAction === 'list') {
    const { data: rows } = await admin().from('family_links')
      .select('id, label, token, created_at').eq('uid', uid).order('created_at', { ascending: true });
    return json({ ok: true, links: (rows || []).map((r) => ({ id: r.id, label: r.label, url: urlFor(r.token), createdAt: r.created_at })) });
  }
  if (body.familyAction === 'revoke') {
    const id = String(body.id || '');
    if (!id) return json({ ok: false, error: 'no_id' }, 400);
    // Apaga (hard delete, uid-scoped — ninguém revoga links de outro): o link morre já.
    const { error: delE } = await admin().from('family_links').delete().eq('id', id).eq('uid', uid);
    if (delE) return json({ ok: false, error: 'db' }, 500);
    return json({ ok: true });
  }

  const date = String(body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: 'bad_date' }, 400);
  const legs = (Array.isArray(body.legs) ? body.legs : []).slice(0, 8)
    .map((x: Record<string, unknown>) => ({
      flight: String(x?.flight || '').toUpperCase().replace(/\s+/g, '').slice(0, 8),
      dep: String(x?.dep || '').toUpperCase().slice(0, 3),
      arr: String(x?.arr || '').toUpperCase().slice(0, 3),
    }))
    .filter((x) => x.flight);
  if (!legs.length) return json({ ok: false, error: 'no_legs' }, 400);

  const token = newToken();
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
  const { error: insErr } = await admin().from('shared_days')
    .insert({ token, uid, share_date: date, legs, expires_at: expires });
  if (insErr) return json({ ok: false, error: 'db' }, 500);

  // Link da família: a PÁGINA no nosso domínio (secret SHARE_PAGE_URL = https://voo.crewpact.app),
  // formato de CAMINHO /c/<token> (estilo Flighty — o WhatsApp pré-visualiza melhor do que
  // raiz+query; rewrite no Pages via _redirects). Sem o secret → functions.supabase.co (texto cru).
  const pageBase = (Deno.env.get('SHARE_PAGE_URL') || '').replace(/\/+$/, '');
  const shareUrl = pageBase
    ? `${pageBase}/c/${token}`
    : `${Deno.env.get('SUPABASE_URL')}/functions/v1/share-day?t=${token}`;
  return json({ ok: true, url: shareUrl, expiresAt: expires });
});
