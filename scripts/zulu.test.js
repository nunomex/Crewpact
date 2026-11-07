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

// A hora repetida na noite da mudança de hora (25/10/2026, Lisboa: 01:00–01:59 duas vezes), em pernas sem Zulu do calendário: a
// cadeia escolhe a ocorrência que dá uma duração de voo possível para a distância entre os aeroportos; se as duas forem possíveis,
// a conservadora (partida mais cedo, chegada mais tarde). Antes resolvia-se sempre para a 2.ª.
if (INTL_TZ_OK) {
  const { legsChainMs } = require(path.resolve('data/zulu.js'));
  const Z = (d, h, m) => Date.UTC(2026, 9, d, h, m);
  // LIS 00:30 (23:30Z) → FAO 01:20: 00:20Z (50 min) ou 01:20Z (1h50) — Lisboa–Faro (~240 km) não leva 1h50 → 00:20Z.
  const a = legsChainMs('2026-10-25', [{ dep: 'LIS', arr: 'FAO', off: '00:30', on: '01:20' }], '00:00');
  eqj('Hora repetida: chegada às 01:20 → a 1.ª (50 min de voo)', [a[0].offMs, a[0].onMs], [Z(24, 23, 30), Z(25, 0, 20)]);
  // Apresentação 01:10, partida 01:50, chegada 02:40 (já hora de inverno): só a 2.ª ocorrência da partida dá 50 min → 01:50Z.
  const b = legsChainMs('2026-10-25', [{ dep: 'LIS', arr: 'FAO', off: '01:50', on: '02:40' }], '01:10');
  eqj('Hora repetida: partida às 01:50 → a 2.ª (50 min de voo)', [b[0].offMs, b[0].onMs], [Z(25, 1, 50), Z(25, 2, 40)]);
  // Dubai 20:00 (16:00Z) → Lisboa 01:30: 8h30 ou 9h30, as duas possíveis para ~5900 km → a conservadora (a mais tarde).
  const c = legsChainMs('2026-10-24', [{ dep: 'DXB', arr: 'LIS', off: '20:00', on: '01:30' }], '18:30');
  eqj('Hora repetida: as duas possíveis → a chegada mais tarde', [c[0].offMs, c[0].onMs], [Z(24, 16, 0), Z(25, 1, 30)]);
}

// 2.ª revisão (2026-11-08): o tz-lookup põe o Bahrein no fuso de Teerão (+3:30) — corrige-se à mão; e o desvio de um aeroporto
// guarda-se por quarto de hora (por hora errava 30 min na mudança de hora da Terra Nova, −3:30 → −2:30 às 05:30Z de 8/3/2026).
if (INTL_TZ_OK) {
  eq('2.ª revisão: BAH no fuso do Bahrein', airportTz('BAH'), 'Asia/Bahrain');
  eq('2.ª revisão: BAH +3:00', airportOffsetMin('BAH', Date.UTC(2026, 0, 10, 12)), 180);
  eq('2.ª revisão: YYT 20 min antes da mudança de hora', airportOffsetMin('YYT', Date.UTC(2026, 2, 8, 5, 10)), -210);
  eq('2.ª revisão: YYT 15 min depois', airportOffsetMin('YYT', Date.UTC(2026, 2, 8, 5, 45)), -150);
}

// O fuso de CADA aeroporto do catálogo contra a tabela oficial da IANA (fontes/iana/zone.tab, zone1970.tab e backward — tzdb,
// domínio público, descarregadas a 2026-11-08): é um fuso do país do aeroporto, ou tem as mesmas horas que um deles (2025–2027).
// O tz-lookup (pelas coordenadas) erra perto de fronteiras e no mar: 49 aeroportos (Pago Pago com um dia inteiro de diferença,
// Holguín, Díli, Bahrein, Trail…) → data/tzOverride.js.
if (INTL_TZ_OK) {
  const airports = require(path.resolve('data/airports.json'));
  const z2c = new Map(), c2z = new Map();
  for (const f of ['zone.tab', 'zone1970.tab']) for (const ln of fs.readFileSync(path.resolve('fontes/iana', f), 'utf8').split('\n')) {
    if (!ln || ln[0] === '#') continue;
    const [cc, , z] = ln.split('\t');
    for (const c of cc.split(',')) { (z2c.get(z) || z2c.set(z, new Set()).get(z)).add(c); (c2z.get(c) || c2z.set(c, new Set()).get(c)).add(z); }
  }
  const link = new Map();
  for (const ln of fs.readFileSync(path.resolve('fontes/iana/backward'), 'utf8').split('\n')) { const m = /^Link\s+(\S+)\s+(\S+)/.exec(ln); if (m) link.set(m[2], m[1]); }
  const countriesOf = (z) => { const s = new Set(z2c.get(z) || []); const c = link.get(z); if (c) for (const x of (z2c.get(c) || [])) s.add(x); return s; };
  const dtf = new Map();
  const offAt = (tz, ms) => {
    let f = dtf.get(tz);
    if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); dtf.set(tz, f); }
    const p = {}; for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
    return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms) / 60000);
  };
  const samples = []; for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2028, 0, 1); t += 6 * 3600000) samples.push(t);
  const sameHours = (a, b) => samples.every((t) => offAt(a, t) === offAt(b, t));
  // Exceções conscientes: Hyder (Alasca) vive na hora do Pacífico, como Stewart (BC), do outro lado da fronteira; o Kosovo não tem
  // fuso próprio na IANA (usa o de Belgrado).
  const EXCEPT = new Set(['WHD']);
  const CC_ALIAS = { XK: 'RS' };
  const bad = [];
  for (const [iata, v] of Object.entries(airports)) {
    if (EXCEPT.has(iata)) continue;
    const cc = CC_ALIAS[v[5]] || v[5];
    const tz = airportTz(iata);
    if (!tz || countriesOf(tz).has(cc)) continue;
    const zones = c2z.get(cc);
    if (zones && [...zones].some((z) => sameHours(tz, z))) continue;
    bad.push(`${iata} ${cc} ${tz}`);
  }
  eqj('Fusos: todos os aeroportos do catálogo num fuso do seu país (IANA)', bad, []);
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
