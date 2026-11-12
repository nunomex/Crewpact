// Motor do repouso do `main` contra o do ramo, nas mesmas escalas aleatórias: transições de veredicto por classe.
const path = require('path'), fs = require('fs'), Module = require('module');
const PROJ = process.cwd(), MAIN = process.env.MAIN;
const babel = require(path.join(PROJ, 'node_modules/@babel/core'));
const cjs = require.resolve('@babel/plugin-transform-modules-commonjs', { paths: [PROJ] });
const orig = Module._extensions['.js'];
Module._extensions['.js'] = function (m, f) { if (f.includes('node_modules')) return orig(m, f); m._compile(babel.transformSync(fs.readFileSync(f, 'utf8'), { filename: f, babelrc: false, configFile: false, presets: [], plugins: [cjs] }).code, f); };
const A = require(path.join(MAIN, 'data/today.js')), B = require(path.join(PROJ, 'data/today.js'));
const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
const MODE = process.argv[2] || 'plain', SEEDS = (process.argv[3] || '1,2,3').split(',').map(Number), N = Number(process.argv[4] || 1500);
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pad = (n) => String(n).padStart(2, '0');
const hmS = (m) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad((((m % 1440) + 1440) % 1440) % 60)}`;
const isoOf = (i) => { const d = new Date(2026, 0, 5 + i, 12); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const mk = (r) => {
  const lh = MODE !== 'plain', sb = MODE === 'all';
  const evs = []; let t = Math.floor(r() * 600) + 300, where = 'LIS'; const days = 6 + Math.floor(r() * 8);
  while (t < days * 1440) {
    const x = r(); let e; const dur = (lo, hi) => lo + Math.floor(r() * ((hi - lo) / 15 + 1)) * 15;
    if (x < 0.6) {
      const d = dur(120, 840);
      if (lh && where === 'LIS' && r() < 0.12) { e = { t, dur: 540, kind: 'flight', legs: ['LIS', 'EWR'] }; where = 'EWR'; }
      else if (where === 'EWR') { e = { t, dur: 480, kind: 'flight', legs: ['EWR', 'LIS'] }; where = 'LIS'; }
      else if (lh && where === 'LIS' && r() < 0.3) { e = { t, dur: d, kind: 'flight', route: 'LIS-FNC' }; where = 'FNC'; }
      else if (where === 'FNC') { e = { t, dur: d, kind: 'flight', route: 'FNC-LIS' }; where = 'LIS'; }
      else e = { t, dur: d, kind: 'flight', route: 'LIS-OPO-LIS' };
    } else if (sb && x < 0.75) e = { t, dur: dur(60, 900), kind: 'standby_home' };
    else if (x < 0.82) e = { t, dur: dur(60, 600), kind: 'standby_airport' };
    else if (x < 0.90) e = { t, dur: dur(60, 600), kind: 'office' };
    else if (x < 0.96) e = { t, dur: dur(60, 600), kind: 'training' };
    else if (sb) e = { t, dur: dur(240, 900), kind: 'reserve' };
    else { t += 1440; continue; }
    evs.push(e);
    const g = r(); const gap = g < 0.15 ? 60 + Math.floor(r() * 9) * 60 : g < 0.75 ? 540 + Math.floor(r() * 41) * 15 : 1200 + Math.floor(r() * 60) * 60;
    t += e.dur + gap;
  }
  return evs;
};
const toDuties = (evs) => { const d = {}; for (const e of evs) { const iso = isoOf(Math.floor(e.t / 1440)), rep = hmS(e.t), end = hmS(e.t + e.dur); let s;
  if (e.kind === 'flight') { s = { kind: 'flight', report_time: rep, block_off: hmS(e.t + 60), block_on: end, sectors: e.legs ? 1 : e.route.split('-').length - 1, flight_minutes: 60, route: e.route || e.legs.join('-') }; if (e.legs) s.legs = [{ dep: e.legs[0], arr: e.legs[1], off: hmS(e.t + 60), on: end }]; }
  else if (e.kind === 'reserve') s = { kind: 'reserve', report_time: rep, block_on: end };
  else s = { kind: e.kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null };
  if (!d[iso]) d[iso] = s; else d[iso] = { ...d[iso], extra: [...(d[iso].extra || []), s] }; } return d; };
let n = 0, same = 0; const tr = {}; const ex = {};
for (const seed of SEEDS) { const r = rng(seed * 104729 + 7);
  for (let k = 0; k < N; k++) { const d = toDuties(mk(r));
    const ka = new Map(), kb = new Map();
    for (const iso of Object.keys(d)) for (const s of [d[iso], ...(d[iso].extra || [])]) { if (!s.report_time || s.kind === 'reserve') continue;
      const ra = A.restAround(d, (x) => x === s, C), rb = B.restAround(d, (x) => x === s, C);
      const key = iso + ' ' + s.report_time + ' ' + s.kind;
      if (ra && ra.before && ra.before.status !== 'na') ka.set(key, ra.before); if (rb && rb.before && rb.before.status !== 'na') kb.set(key, rb.before); }
    for (const key of new Set([...ka.keys(), ...kb.keys()])) { n++; const a = ka.get(key), b = kb.get(key);
      const sa = a ? `${a.status}${a.kind ? '/' + a.kind : ''} ${a.requiredMin ?? '-'}${a.requiredHiMin != null ? '–' + a.requiredHiMin : ''}` : '(sem par)';
      const sbb = b ? `${b.status}${b.kind ? '/' + b.kind : ''} ${b.requiredMin ?? '-'}${b.requiredHiMin != null ? '–' + b.requiredHiMin : ''}` : '(sem par)';
      if (sa === sbb) { same++; continue; }
      const cls = `${a ? a.status + (a.kind ? '/' + a.kind : '') : '(sem par)'} → ${b ? b.status + (b.kind ? '/' + b.kind : '') : '(sem par)'}`;
      tr[cls] = (tr[cls] || 0) + 1; if (!ex[cls]) ex[cls] = { key, sa, sbb, d: JSON.stringify(d) };
    } } }
console.log(`${MODE}: ${n} veredictos, ${same} iguais, ${n - same} diferentes`);
for (const [c, q] of Object.entries(tr).sort((x, y) => y[1] - x[1])) console.log(String(q).padStart(6), c, process.argv[5] ? `\n        ex.: ${ex[c].key} | main: ${ex[c].sa} | ramo: ${ex[c].sbb}\n        ${ex[c].d.slice(0, 900)}` : '');
