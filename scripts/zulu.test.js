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

const { airportZulu, airportTz, airportOffsetMin, INTL_TZ_OK, legZulu, legDay, legsZulu } = require(path.resolve('data/zulu.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => { if (got === want) { pass++; } else { fail++; fails.push(`✗ ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); } };
const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));

// 2.ª revisão (2026-11-08): o tz-lookup põe o Bahrein no fuso de Teerão (+3:30) — corrige-se à mão; e o desvio de um aeroporto
// guarda-se por quarto de hora (por hora errava 30 min na mudança de hora da Terra Nova, −3:30 → −2:30 às 05:30Z de 8/3/2026).
if (INTL_TZ_OK) {
  eq('2.ª revisão: BAH no fuso do Bahrein', airportTz('BAH'), 'Asia/Bahrain');
  eq('2.ª revisão: BAH +3:00', airportOffsetMin('BAH', Date.UTC(2026, 0, 10, 12)), 180);
  eq('2.ª revisão: YYT 20 min antes da mudança de hora', airportOffsetMin('YYT', Date.UTC(2026, 2, 8, 5, 10)), -210);
  eq('2.ª revisão: YYT 15 min depois', airportOffsetMin('YYT', Date.UTC(2026, 2, 8, 5, 45)), -150);
}

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
// A cadeia (revisão do 8b): já não depende de voo + fuso caber em 24 h nem do relógio "chegada antes da partida".
// Voo + fuso ≥ 24 h (o limite do relógio): LIS 08:00 (inverno, 08:00Z) → NRT 09:00 do dia seguinte (UTC+9 = 00:00Z, 16 h de
// voo). No relógio a chegada vem DEPOIS da partida → o relógio dizia "mesmo dia" (−8 h de voo); a cadeia acha as 16 h.
const chNrt = require(path.resolve('data/zulu.js')).legsChainMs('2026-11-10', [{ dep: 'LIS', arr: 'NRT', off: '08:00', on: '09:00' }], '06:45')[0];
eq('cadeia: LIS 08:00 → NRT 09:00 (+1) = 16 h de voo', (chNrt.onMs - chNrt.offMs) / 3600000, 16);
// Linha de mudança de data: NRT 21:00 (12:00Z) → HNL 09:30 do MESMO dia no relógio local (19:30Z, 7:30 de voo). O relógio
// ("chegada antes da partida → dia seguinte") dava 31:30 de voo; a cadeia dá 7:30.
const chHnl = require(path.resolve('data/zulu.js')).legsChainMs('2026-11-10', [{ dep: 'NRT', arr: 'HNL', off: '21:00', on: '09:30' }], '19:45')[0];
eq('cadeia: NRT 21:00 → HNL 09:30 (linha de data) = 7:30 de voo', (chHnl.onMs - chHnl.offMs) / 60000, 450);
// Leste: LIS 21:00 (21:00Z) → HKG 18:00 do dia seguinte (10:00Z).
eqj('cadeia: LIS 21:00 → HKG 18:00 (+1) = 21:00Z → 10:00Z', legsZulu('2026-11-10', [{ dep: 'LIS', arr: 'HKG', off: '21:00', on: '18:00' }], '19:45')[0], { off: '21:00', on: '10:00' });
// 2.ª perna depois da meia-noite, noutro fuso: apresentação LIS 22:00, LIS→FNC 22:45–00:30, FNC→LIS 01:15–02:50 (no inverno, mesmo fuso).
eqj('cadeia: 2 pernas pela meia-noite', legsZulu('2026-11-10', [{ dep: 'LIS', arr: 'FNC', off: '22:45', on: '00:30' }, { dep: 'FNC', arr: 'LIS', off: '01:15', on: '02:50' }], '22:00').map((z) => [z.off, z.on]), [['22:45', '00:30'], ['01:15', '02:50']]);
// E a noite da mudança de hora pela cadeia.
eq('cadeia: noite de 24/10, chegada 04:00 → 04:00Z', legsZulu('2026-10-24', [lgDst], '22:00')[0].on, '04:00');
// Uma perna sozinha (legZulu): a chegada pelo instante da partida também no leste longínquo.
eq('legZulu: LIS 21:00 → HKG 18:00 (+1) = 10:00Z', legZulu('2026-11-10', { dep: 'LIS', arr: 'HKG', off: '21:00', on: '18:00' }, 'on'), '10:00');
// Aeroporto da 1.ª partida SEM fuso conhecido, mas com a Zulu do calendário: o fuso da apresentação tira-se da própria perna
// (off local − offZ). Apresentação 23:30 num aeroporto a UTC−3 (02:30Z do dia 11), partida 00:30 local = 03:30Z do dia 11
// (antes ficava no dia 10, 24 h antes).
const chNoTz = require(path.resolve('data/zulu.js')).legsChainMs('2026-11-10', [{ dep: 'ZZZ', arr: 'ZZY', off: '00:30', on: '02:30', offZ: '03:30', onZ: '05:30' }], '23:30')[0];
eq('cadeia: sem fuso, pela offZ → partida a 11/11 03:30Z', new Date(chNoTz.offMs).toISOString().slice(0, 16), '2026-11-11T03:30');
eq('cadeia: sem fuso, a chegada 2 h depois', (chNoTz.onMs - chNoTz.offMs) / 60000, 120);
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
