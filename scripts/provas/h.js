// Banco de cenários da verificação do repouso (fora do repositório). Correr com cwd = raiz do projeto (ou ROOT=…).
const path = require('path');
const fs = require('fs');
const Module = require('module');
const ROOT = process.env.ROOT || process.cwd();
const PROJ = process.env.PROJ || process.cwd();
const babel = require(path.join(PROJ, 'node_modules/@babel/core'));
const cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs', { paths: [PROJ] });
const transform = (src, filename) => babel.transformSync(src, { filename, babelrc: false, configFile: false, presets: [], plugins: [cjsPlugin] }).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename);
};
const today = require(path.join(ROOT, 'data/today.js'));
const ftl = require(path.join(ROOT, 'ftl/index.js'));
const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route ? route.split('-').length - 1 : 1, flight_minutes: 60, route, ...x });
const G = (kind, rep, end, route = null) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route });
const sbD = (rep, end) => G('standby_home', rep, end);
const hm = (m) => (m == null ? '—' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
const fmt = (r) => (r ? `${r.status}${r.kind ? '/' + r.kind : ''} real ${hm(r.actualMin)} mín ${hm(r.requiredMin)}${r.requiredHiMin != null ? '–' + hm(r.requiredHiMin) : ''}${r.nightsRequired ? ` noites ${r.nightsActual}/${r.nightsRequired}` : ''}${r.place ? ' ' + r.place : ''}${r.extOption ? ' ext:' + r.extOption : ''}` : 'null');
const befOf = (d, iso, rep, ctx = C) => { const r = today.restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), ctx); return r ? r.before : null; };
const needOf = (d, iso, pick, ctx = C) => { const r = today.restAround(d, pick || ((s, i) => i === iso), ctx); return r ? r.need : null; };
const at = (iso, hmS) => { const [h, m] = hmS.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };
const until = (d, iso, ctx = C) => { const r = today.restUntilAfter(d, iso, ctx); if (!r) return 'null'; const f = (ms) => (ms == null ? '—' : new Date(ms).toISOString().slice(5, 16)); return `mín ${hm(r.requiredMin)}${r.uncertain ? ` incerto ${hm(r.requiredLoMin)}–${hm(r.requiredHiMin)} (${r.why}) ${f(r.untilLoMs)}→${f(r.untilHiMs)}` : ''} até ${f(r.untilMs)}${r.nightsRequired ? ' noites ' + r.nightsRequired : ''}`; };
module.exports = { today, ftl, C, F, G, sbD, hm, fmt, befOf, needOf, at, until, ROOT };
