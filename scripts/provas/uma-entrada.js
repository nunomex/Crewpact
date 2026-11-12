// UMA ENTRADA CONTRA A MESMA ASSISTÊNCIA PARTIDA: escalas aleatórias em que cada assistência (em casa, no aeroporto com e sem
// alojamento) se guarda numa entrada só e, na outra versão, partida em várias — contíguas, sobrepostas, duplicadas, uma dentro
// da outra, por outra ordem, e cortada à meia-noite como o calendário faz. Tem de dar o mesmo:
//   (1) o PSV de cada dia e de cada voo calculado sozinho (o Detalhe);
//   (2) o ORO.FTL.210 por dia local (o que os períodos de 7, 14 e 28 dias somam);
//   (3) o repouso antes de cada voo, os veredictos das Estatísticas e o "Repouso até" de cada dia.
// Correr da raiz:  node scripts/provas/uma-entrada.js [sementes] [escalas por semente] [exemplos]
const path = require('path');
const { today, ftl, C } = require('./h.js');
const { dayMin } = require(path.join(process.env.ROOT || process.cwd(), 'ftl/calculators/cumulativeCalculator.js'));
const SEEDS = (process.argv[2] || '1,2,3').split(',').map(Number);
const N = Number(process.argv[3] || 600);
const SHOW = Number(process.argv[4] || 3);
const O = { base: 'LIS', postFlightMin: 30, isPilot: true };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pad = (n) => String(n).padStart(2, '0');
const hmS = (m) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad((((m % 1440) + 1440) % 1440) % 60)}`;
const isoOf = (k) => { const d = new Date(2026, 0, 5 + k, 12); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const SB = new Set(['standby_home', 'standby_airport', 'airport_duty']);

// Uma escala = eventos { t (min desde as 00:00 do dia 0), dur, kind }. Muitas assistências, muitas vezes perto de um voo.
const mk = (r) => {
  const evs = []; let t = 300 + Math.floor(r() * 40) * 15; const days = 5 + Math.floor(r() * 6);
  const dur = (lo, hi) => lo + Math.floor(r() * ((hi - lo) / 15 + 1)) * 15;
  while (t < days * 1440) {
    const x = r(); let e;
    if (x < 0.40) e = { t, dur: dur(120, 780), kind: 'flight' };
    else if (x < 0.70) e = { t, dur: dur(60, 1020), kind: 'standby_home' };
    else if (x < 0.80) e = { t, dur: dur(60, 600), kind: 'standby_airport' };
    else if (x < 0.86) e = { t, dur: dur(60, 600), kind: 'airport_duty' };
    else if (x < 0.93) e = { t, dur: dur(60, 540), kind: 'office' };
    else { t += 1440; continue; }
    // Só um VOO começa durante uma assistência (a chamada): serviços diferentes sobrepostos são horas erradas, outro assunto.
    const prev = evs[evs.length - 1];
    if (prev && prev.during) { if (e.kind === 'flight') e.t = prev.t + prev.during; else { e.t = prev.t + prev.dur + 30; } t = e.t; }
    evs.push(e);
    // o seguinte: durante esta assistência, colado, perto dos limiares, ou longe
    const g = r();
    e.during = (SB.has(e.kind) && g < 0.35) ? Math.max(15, Math.floor(r() * (e.dur / 15)) * 15) : 0;
    t += e.dur + (g < 0.50 ? Math.floor(r() * 5) * 30 : g < 0.85 ? 480 + Math.floor(r() * 25) * 15 : 1200 + Math.floor(r() * 40) * 60);
  }
  return evs;
};
// As entradas em que uma assistência [a, b] se parte (a mesma união, sempre).
const pieces = (a, b, r) => {
  const q = (x) => Math.round(x / 15) * 15, mid = Math.min(b - 15, Math.max(a + 15, q(a + (b - a) * (0.2 + 0.6 * r()))));
  const dayCut = Math.floor(a / 1440) * 1440 + 1440;
  const opts = [];
  if (b - a >= 60) {
    opts.push([[a, mid], [mid, b]], [[mid, b], [a, mid]], [[a, b], [a, mid]], [[a, mid], [a, b]], [[a, b], [a + 15, b - 15]], [[a + 15, b - 15], [a, b]],
      [[a, Math.min(b, mid + 30)], [mid, b]], [[a, a + 15], [a + 15, mid], [mid, b]], [[mid, b], [a, a + 15], [a + 15, mid]], [[a, b], [a, b]]);
  }
  if (a < dayCut && b > dayCut) { opts.push([[a, dayCut], [dayCut, b]], [[a, Math.min(b, dayCut + 60)], [dayCut, b]]); opts.push([[a, dayCut], [dayCut, b]]); }
  if (!opts.length) return [[a, b]];
  return opts[Math.floor(r() * opts.length)].filter(([x, y]) => y > x);   // (uma entrada das 01:30 à 01:30 lê-se como 24 h: fora)
};
const toDuties = (evs, r = null) => {
  const d = {}; const flights = [];
  const put = (t, s) => { const iso = isoOf(Math.floor(t / 1440)); d[iso] = d[iso] ? { ...d[iso], extra: [...(d[iso].extra || []), s] } : s; };
  for (const e of evs) {
    if (e.kind === 'flight') {
      const s = { kind: 'flight', report_time: hmS(e.t), block_off: hmS(e.t + 45), block_on: hmS(e.t + e.dur), sectors: 2, flight_minutes: Math.max(30, e.dur - 90), route: 'LIS-OPO-LIS', _id: e.t };
      put(e.t, s); flights.push({ iso: isoOf(Math.floor(e.t / 1440)), s });
    } else if (SB.has(e.kind)) {
      const mkS = (x, y) => ({ kind: e.kind === 'standby_home' ? 'standby_home' : 'standby_airport', report_time: hmS(x), block_on: hmS(y), sectors: 0, flight_minutes: 0, route: null, ...(e.kind === 'standby_airport' ? { accommodation: true } : {}) });
      for (const [x, y] of (r ? pieces(e.t, e.t + e.dur, r) : [[e.t, e.t + e.dur]])) put(x, mkS(x, y));
    } else put(e.t, { kind: e.kind, report_time: hmS(e.t), block_on: hmS(e.t + e.dur), sectors: 0, flight_minutes: 0, route: null });
  }
  return { d, flights };
};
const psvKey = (p) => (p ? [p.result, p.max, p.maxHi || null, !!p.over, !!p.uncertain, !!p.sbOver, (p.unknowns || []).join('+')].join('|') : 'null');
const restKey = (x) => (x ? [x.status, x.kind || null, x.actualMin == null ? null : x.actualMin, x.requiredMin == null ? null : x.requiredMin, x.requiredHiMin == null ? null : x.requiredHiMin].join('|') : 'null');
const view = (evs, r) => {
  const { d, flights } = toDuties(evs, r);
  const out = { psv: {}, one: {}, d210: {}, rest: {}, stats: [], until: {} };
  const log = ftl.reconcileDayLog(d, {}, O);
  const span = Math.ceil((evs[evs.length - 1].t + evs[evs.length - 1].dur) / 1440) + 2;
  for (let k = 0; k < span; k++) { const iso = isoOf(k), m = dayMin(log, iso, 'servico'); if (m) out.d210[iso] = m; }
  for (const { iso, s } of flights) {
    const e = ftl.dayFtlFromDuties([d[iso], ...(d[iso].extra || [])], { ...O, date: iso, duties: d });
    out.psv[iso] = psvKey(e && e.psv) + (e ? `|+${e.servicoMaxMin ? e.servicoMaxMin - e.servicoMin : 0}` : '');
    const f = ftl.ftlForDuty(s, { ...O, date: iso, duties: d });
    out.one[s._id] = f ? [f.fdp.actualFdpStr, f.fdp.maxFdpStr, f.fdp.exact ? null : f.fdp.maxHiStr, !!f.fdp.over, !!f.fdp.uncertain].join('|') : 'null';
    const ra = today.restAround(d, (x) => x._id === s._id, C);
    out.rest[s._id] = ra ? restKey(ra.before) + ' → ' + restKey(ra.after) + ' need ' + (ra.need ? [ra.need.requiredMin, ra.need.requiredLoMin || null, ra.need.requiredHiMin || null, ra.need.why || null].join('|') : 'null') : 'null';
  }
  out.stats = today.restVerdicts(d, C).map((x) => `${x.nextIso}:${restKey(x)}`);
  return { out, d };
};
let n = 0, diffs = 0, exc = 0; const tags = {}, samples = [];
for (const seed of SEEDS) {
  const r = rng(seed * 104729 + 7), r2 = rng(seed * 7919 + 3);
  for (let i = 0; i < N; i++) {
    const evs = mk(r);
    if (!evs.some((e) => SB.has(e.kind))) continue;
    try {
      const a = view(evs, null), b = view(evs, r2);
      // o "Repouso até" dos dias que têm serviços na versão de uma entrada
      for (const iso of Object.keys(a.d)) { const f = (d) => { const u = today.restUntilAfter(d, iso, C); return u ? [u.untilMs, u.untilLoMs || null, u.untilHiMs || null, u.why || null].join('|') : 'null'; }; a.out.until[iso] = f(a.d); b.out.until[iso] = f(b.d); }
      n++;
      for (const k of ['psv', 'one', 'd210', 'rest', 'stats', 'until']) {
        const x = JSON.stringify(a.out[k]), y = JSON.stringify(b.out[k]);
        if (x !== y) { diffs++; tags[k] = (tags[k] || 0) + 1; if (samples.length < 40) samples.push({ k, x, y, a: JSON.stringify(a.d), b: JSON.stringify(b.d) }); }
      }
    } catch (e) { exc++; if (samples.length < 40) samples.push({ k: 'EXCEÇÃO', x: String(e && e.stack).slice(0, 500), y: '', a: '', b: '' }); }
  }
}
console.log(`uma entrada contra a mesma partida: ${n} escalas, ${diffs} diferenças, ${exc} exceções ${JSON.stringify(tags)}`);
const shown = {};
for (const s of samples) {
  if ((shown[s.k] = (shown[s.k] || 0) + 1) > SHOW) continue;
  // só o que difere
  let pa, pb; try { pa = JSON.parse(s.x); pb = JSON.parse(s.y); } catch { pa = pb = null; }
  const delta = pa && pb && !Array.isArray(pa) ? Object.keys({ ...pa, ...pb }).filter((k) => pa[k] !== pb[k]).map((k) => `${k}: ${pa[k]}  ≠  ${pb[k]}`) : [s.x.slice(0, 400), s.y.slice(0, 400)];
  console.log('—', s.k, '\n   ', delta.slice(0, 4).join('\n    '));
  const brief = (j) => Object.entries(JSON.parse(j)).map(([iso, x]) => `${iso.slice(8)}: ` + [x, ...(x.extra || [])].map((v) => `${({ flight: 'V', standby_home: 'C', office: 'E' })[v.kind] || (v.accommodation ? 'A' : 'S')}${v.report_time}-${v.block_on}`).join(' ')).join(' | ');
  if (process.argv[5]) { console.log('    única :', brief(s.a).slice(0, 700)); console.log('    várias:', brief(s.b).slice(0, 700)); }
}
