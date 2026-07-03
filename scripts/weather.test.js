/*
 * Golden da METEO (data/weather.js — digest PURO + símbolos; fonte MET Norway).
 * Sem framework (igual aos outros). Executar:  node scripts/weather.test.js
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
let cjsPlugin;
try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); } catch { cjsPlugin = null; }
const transform = (src, filename) => babel.transformSync(src, {
  filename, babelrc: false, configFile: false,
  presets: cjsPlugin ? [] : [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]],
  plugins: cjsPlugin ? [cjsPlugin] : [],
}).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename);
};

const { wxDigest, wxSymbol } = require(path.resolve('data/weather.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};

// ── Série sintética (FNC, 2 dias): hoje quente e seco, amanhã mais fresco c/ chuva ──
const S = (t, c, w, s, p) => ({ t, c, w, s, p });
const serie = [
  S('2026-07-03T14:00:00Z', 27.2, 7.0, 'clearsky_day', 0),
  S('2026-07-03T15:00:00Z', 27.8, 6.5, 'clearsky_day', 0),
  S('2026-07-03T18:00:00Z', 24.1, 5.0, 'fair_day', 0),
  S('2026-07-03T23:00:00Z', 21.3, 4.0, 'clearsky_night', 0),
  S('2026-07-04T06:00:00Z', 19.6, 6.0, 'partlycloudy_day', 0),
  S('2026-07-04T12:00:00Z', 22.4, 9.3, 'rainshowers_day', 1.2),
  S('2026-07-04T18:00:00Z', 20.9, 8.0, 'lightrain', 0.4),
];
const NOW = '2026-07-03T14:30:00Z';
const d = wxDigest(serie, NOW);
eq('agora: temp arredondada', d.nowC, 27);
eq('agora: símbolo', d.nowSym, 'clearsky_day');
eq('agora: vento m/s→kt (7.0→14)', d.windKt, 14);
eq('sem chuva nas próx. 6 h', d.rainNext6h, false);
eq('hoje min/max (21.3–27.8 → 21/28)', [d.todayMin, d.todayMax], [21, 28]);
eq('amanhã min/max (19.6–22.4 → 20/22)', [d.tomorrowMin, d.tomorrowMax], [20, 22]);
eq('amanhã: símbolo do meio-dia', d.tomorrowSym, 'rainshowers_day');
// Chuva próxima: às 07:00Z de dia 4, a entrada das 12Z (1.2 mm) cai fora das 6 h → false;
// às 08:00Z já entra → true.
eq('chuva 6 h: fora da janela', wxDigest(serie, '2026-07-04T05:00:00Z').rainNext6h, false);
eq('chuva 6 h: dentro da janela', wxDigest(serie, '2026-07-04T08:00:00Z').rainNext6h, true);
// Robustez.
eq('série vazia → null', wxDigest([], NOW), null);
eq('série nula → null', wxDigest(null, NOW), null);

// ── Símbolos → emoji/rótulo (PT e EN); desconhecido não inventa ──
eq('clearsky dia', wxSymbol('clearsky_day'), { emoji: '☀️', label: 'céu limpo' });
eq('clearsky noite → lua', wxSymbol('clearsky_night'), { emoji: '🌙', label: 'céu limpo' });
eq('aguaceiros', wxSymbol('rainshowers_day').emoji, '🌧');
eq('trovoada composta (rainandthunder)', wxSymbol('rainandthunder').emoji, '⛈');
eq('EN', wxSymbol('fog', 'en').label, 'fog');
eq('desconhecido → neutro', wxSymbol('marcianos_day').emoji, '·');

console.log(`\nmeteo — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
