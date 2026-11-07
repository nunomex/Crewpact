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

const { airportZulu, airportTz, INTL_TZ_OK, legZulu, legDay } = require(path.resolve('data/zulu.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => { if (got === want) { pass++; } else { fail++; fails.push(`✗ ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); } };
const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));

eq('Intl/timeZone disponível (Node)', INTL_TZ_OK, true);
// Revisão do 8b: na noite de 24 para 25/10/2026 Lisboa recua 1 h às 02:00. LIS 22:45 (verão, 21:45Z) → OPO 04:00 do dia 25
// (inverno, 04:00Z). Antes a chegada convertia-se com o fuso do dia 24 → 03:00Z.
const lgDst = { dep: 'LIS', arr: 'OPO', off: '22:45', on: '04:00' };
eq('legZulu: partida 22:45 do dia 24 → 21:45Z', legZulu('2026-10-24', lgDst, 'off'), '21:45');
eq('legZulu: chegada 04:00 do dia 25 → 04:00Z', legZulu('2026-10-24', lgDst, 'on'), '04:00');
eq('legDay: a chegada antes da partida é do dia seguinte', legDay('2026-10-24', lgDst, 'on'), '2026-10-25');
// Uma partida antes da apresentação (no relógio) é do dia seguinte: apresentação 22:00, 2.ª perna 03:30 → 03:30Z (inverno).
const lg2 = { dep: 'OPO', arr: 'LIS', off: '03:30', on: '04:30' };
eqj('legZulu: 2.ª perna depois da meia-noite (ref 22:00)', [legZulu('2026-10-24', lg2, 'off', '22:00'), legZulu('2026-10-24', lg2, 'on', '22:00')], ['03:30', '04:30']);
// Em março (29/03/2026, adianta 1 h às 01:00): LIS 23:00 (inverno, 23:00Z) → FNC 03:00 do dia 29 (verão, 02:00Z).
eq('legZulu: março, chegada 03:00 do dia 29 → 02:00Z', legZulu('2026-03-28', { dep: 'LIS', arr: 'FNC', off: '23:00', on: '03:00' }, 'on'), '02:00');
// A Zulu autoritativa manda sempre.
eq('legZulu: onZ do calendário manda', legZulu('2026-10-24', { ...lgDst, onZ: '04:05' }, 'on'), '04:05');
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
