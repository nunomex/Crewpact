/*
 * Testes do helper airportZulu (data/zulu.js): hora LOCAL do aeroporto → Zulu (UTC), com o
 * fuso por COORDENADAS (tz-lookup) + horário de verão (Intl). Node tem ICU completo, por isso
 * valida a LÓGICA (no dispositivo, o Hermes é auto-detetado por INTL_TZ_OK; se faltar, fallback).
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

const { airportZulu, airportTz, INTL_TZ_OK } = require(path.resolve('data/zulu.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => { if (got === want) { pass++; } else { fail++; fails.push(`✗ ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); } };

eq('Intl/timeZone disponível (Node)', INTL_TZ_OK, true);
eq('Fuso LGW', airportTz('LGW'), 'Europe/London');
eq('Fuso FAO', airportTz('FAO'), 'Europe/Lisbon');
eq('Fuso ATH', airportTz('ATH'), 'Europe/Athens');
// Conversões com DST: verão (UTC+1/+2/+3) e inverno (UTC+0), leste e oeste.
eq('LGW verão 08:30 → 07:30Z', airportZulu('2026-07-14', '08:30', 'LGW'), '07:30');
eq('LGW inverno 08:30 → 08:30Z', airportZulu('2026-01-14', '08:30', 'LGW'), '08:30');
eq('ATH verão 14:00 → 11:00Z', airportZulu('2026-07-14', '14:00', 'ATH'), '11:00');
eq('FAO verão 10:45 → 09:45Z', airportZulu('2026-07-14', '10:45', 'FAO'), '09:45');
eq('JFK verão 18:00 → 22:00Z (oeste)', airportZulu('2026-07-14', '18:00', 'JFK'), '22:00');
// Degradação: aeroporto/hora inválidos → null (o chamador faz fallback ao fuso do dispositivo).
eq('Aeroporto desconhecido → null', airportZulu('2026-07-14', '08:30', 'ZZZ'), null);
eq('Hora inválida → null', airportZulu('2026-07-14', '8h30', 'LGW'), null);
eq('Sem aeroporto → null', airportZulu('2026-07-14', '08:30', null), null);

console.log(`\nzulu — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ airportZulu: hora local do aeroporto → UTC, com fuso por coordenadas + DST.');
