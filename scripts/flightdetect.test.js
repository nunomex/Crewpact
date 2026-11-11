/*
 * Testes do auto-fill por deteção de voo (data/flightDetect.js) — agregação de legs +
 * reconhecimento por histórico. Sem framework (igual aos restantes). node scripts/flightdetect.test.js
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

// Stub do supabase (evita carregar o cliente RN no Node) — só legFromApi o usa.
const supaPath = path.resolve('data/supabase.js');
require.cache[supaPath] = { id: supaPath, filename: supaPath, loaded: true,
  exports: { supabase: { functions: { invoke: async () => ({ data: null, error: 'stub' }) } } } };

const { aggregateLegs, legFromHistory, normFlightNo, isCompleteFlightNo } = require(path.resolve('data/flightDetect.js'));

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; console.error(`✗ ${label}\n    esperado: ${JSON.stringify(want)}\n    obtido:   ${JSON.stringify(got)}`); }
};
const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error('✗ ' + label); } };

// ── aggregateLegs — ida-volta LIS-CDG-LIS ──
const legs = [
  { flightNo: 'EJU7625', dep: 'LIS', arr: 'CDG', off: '06:20', on: '08:35', flightMin: 135, aircraft: '321' },
  { flightNo: 'EJU7626', dep: 'CDG', arr: 'LIS', off: '09:10', on: '11:25', flightMin: 135, aircraft: '321' },
];
const agg = aggregateLegs(legs);
eq('rota encadeada', agg.route, 'LIS-CDG-LIS');
eq('off = 1.º leg', agg.off, '06:20');
eq('on = último leg', agg.on, '11:25');
eq('setores', agg.sectors, 2);
eq('tempo de voo = soma', agg.flightMin, 270);
eq('aeronave', agg.aircraft, '321');
eq('ordena por hora de partida', aggregateLegs([legs[1], legs[0]]).route, 'LIS-CDG-LIS');

// flightMin derivado de off/on quando o leg não traz flightMin
eq('flightMin derivado (on-off)', aggregateLegs([{ dep: 'LIS', arr: 'OPO', off: '06:00', on: '07:00' }]).flightMin, 60);
eq('flightMin overnight (22:00→02:30)', aggregateLegs([{ dep: 'LIS', arr: 'PUJ', off: '22:00', on: '02:30' }]).flightMin, 270);
eq('sem legs válidos → null', aggregateLegs([]), null);

// ── legFromHistory — o leg MAIS RECENTE com esse nº ──
const duties = {
  '2026-05-10': { legs: [{ flightNo: 'EJU7625', dep: 'LIS', arr: 'CDG', off: '06:20', on: '08:35', aircraft: '320' }] },
  '2026-06-15': { legs: [{ flightNo: 'EJU7625', dep: 'LIS', arr: 'CDG', off: '06:25', on: '08:40', aircraft: '321' }] },
  '2026-06-20': { deleted: true, legs: [{ flightNo: 'EJU7625' }] },
};
const h = legFromHistory(' eju 7625 ', duties);   // tolera espaços/minúsculas
ok('histórico encontrou', !!h);
eq('histórico: o mais recente (jun-15)', h.off, '06:25');
eq('histórico: aeronave do recente', h.aircraft, '321');
eq('histórico: flightMin (on-off)', h.flightMin, 135);
eq('histórico: source', h.source, 'history');
eq('histórico: sem match → null', legFromHistory('XX9999', duties), null);
eq('normFlightNo limpa', normFlightNo(' eju 7625 '), 'EJU7625');
// Preserva a Zulu AUTORITATIVA já guardada (offZ/onZ) — display correto sem recálculo.
const hz = legFromHistory('EJU9001', { '2026-06-01': { legs: [{ flightNo: 'EJU9001', dep: 'LGW', arr: 'ATH', off: '08:30', on: '14:00', offZ: '07:30', onZ: '11:00' }] } });
eq('histórico: preserva offZ', hz.offZ, '07:30');
eq('histórico: preserva onZ', hz.onZ, '11:00');
eq('histórico: sem Zulu guardada → offZ null', h.offZ, null);

// ── isCompleteFlightNo — nº de voo COMPLETO (sigla + número) vs incompleto (→ vermelho no form) ──
ok('completo: EJU7625', isCompleteFlightNo('EJU7625'));
ok('completo: U27625 (IATA)', isCompleteFlightNo('U27625'));
ok('completo: TP1923', isCompleteFlightNo('TP1923'));
ok('completo: FR1234', isCompleteFlightNo('FR1234'));
ok('completo: tolera espaços/minúsculas', isCompleteFlightNo(' eju 7625 '));
ok('incompleto: só dígitos "7625" → vermelho', !isCompleteFlightNo('7625'));
ok('incompleto: só sigla "EJU" → vermelho', !isCompleteFlightNo('EJU'));
ok('incompleto: vazio → vermelho', !isCompleteFlightNo(''));
ok('incompleto: null → vermelho', !isCompleteFlightNo(null));

// ── Setores À MÃO (rota "2 estações + ✓") → aggregateLegs encadeia a rota; sem horas → flightMin null ──
const manual = [
  { flightNo: 'EJU7625', dep: 'LIS', arr: 'OPO', source: 'manual' },
  { flightNo: 'EJU7626', dep: 'OPO', arr: 'LIS', source: 'manual' },
];
const aggManual = aggregateLegs(manual);
eq('manual: rota encadeada', aggManual.route, 'LIS-OPO-LIS');
eq('manual: setores', aggManual.sectors, 2);
eq('manual: sem horas → flightMin null', aggManual.flightMin, null);
eq('manual: 1.º setor sozinho → rota LIS-OPO', aggregateLegs([manual[0]]).route, 'LIS-OPO');

// ── A ORDEM das pernas (auditoria A-249/A-250): nunca pela hora do relógio sozinha ──
// A-249: o serviço passa a meia-noite. LIS-FNC 22:30–00:15 e FNC-LIS 01:05–02:40 davam a rota 'FNC-LIS-FNC' (acabava "fora":
// pernoita a mais, +157,50 € no comandante). Com a apresentação (21:30), a ordem é a dos minutos depois dela.
const nite = [
  { flightNo: 'EJU1', dep: 'LIS', arr: 'FNC', off: '22:30', on: '00:15' },
  { flightNo: 'EJU2', dep: 'FNC', arr: 'LIS', off: '01:05', on: '02:40' },
];
const aN = aggregateLegs(nite, { report: '21:30' });
eq('A-249 passa a meia-noite, com apresentação: rota LIS-FNC-LIS', [aN.route, aN.off, aN.on], ['LIS-FNC-LIS', '22:30', '02:40']);
eq('A-249 … e introduzidas ao contrário', aggregateLegs([nite[1], nite[0]], { report: '21:30' }).route, 'LIS-FNC-LIS');
// Sem apresentação: o serviço começa depois do MAIOR intervalo sem voo (aqui das 02:40 às 22:30).
eq('A-249 sem apresentação: começa depois do maior intervalo', aggregateLegs([nite[1], nite[0]]).route, 'LIS-FNC-LIS');
// Revisão independente (E1): um serviço REPARTIDO sem apresentação — a pausa do meio (10 h 30) é maior do que a da noite
// (8 h 30). O intervalo da noite só deixa de ser o fim do serviço se for curto de mais para o ser (menos de 8 h); senão o
// serviço não passa a meia-noite (a ordem do relógio).
const rep4 = [
  { dep: 'LIS', arr: 'OPO', off: '05:00', on: '06:00' }, { dep: 'OPO', arr: 'LIS', off: '06:30', on: '07:30' },
  { dep: 'LIS', arr: 'FAO', off: '18:00', on: '19:00' }, { dep: 'FAO', arr: 'LIS', off: '19:30', on: '20:30' },
];
eq('E1 repartido sem apresentação: a ordem do relógio', aggregateLegs([rep4[2], rep4[3], rep4[0], rep4[1]]).route, 'LIS-OPO-LIS-FAO-LIS');
eq('E1 repartido pela noite sem apresentação (intervalo da noite de 5 h): começa depois do maior intervalo',
  aggregateLegs([{ dep: 'OPO', arr: 'LIS', off: '04:00', on: '06:00' }, { dep: 'LIS', arr: 'OPO', off: '21:00', on: '23:00' }]).route, 'LIS-OPO-LIS');
// A-250: a 3.ª perna foi tirada e posta outra vez depois da 4.ª — a rota E as pernas saem pela mesma ordem (antes a rota era
// reordenada e as horas ficavam pelo índice: o PSV acabava às 13:30 em vez das 17:00).
const four = [
  { flightNo: 'A1', dep: 'LIS', arr: 'FNC', off: '06:00', on: '07:45' },
  { flightNo: 'A2', dep: 'FNC', arr: 'LIS', off: '08:30', on: '10:05' },
  { flightNo: 'A4', dep: 'TFS', arr: 'LIS', off: '15:10', on: '17:00' },
  { flightNo: 'A3', dep: 'LIS', arr: 'TFS', off: '11:00', on: '13:30' },
];
const a4 = aggregateLegs(four, { report: '05:15' });
eq('A-250 a rota e as pernas pela mesma ordem', [a4.route, a4.legs.map((x) => x.flightNo).join(','), a4.on], ['LIS-FNC-LIS-TFS-LIS', 'A1,A2,A3,A4', '17:00']);
// Um serviço repartido (pausa de 13 h entre as pernas) introduzido ao contrário: a apresentação manda, não o maior intervalo.
const split = [{ dep: 'OPO', arr: 'LIS', off: '20:00', on: '21:00' }, { dep: 'LIS', arr: 'OPO', off: '06:00', on: '07:00' }];
eq('repartido com apresentação: a apresentação manda', aggregateLegs(split, { report: '05:00' }).route, 'LIS-OPO-LIS');
// Uma partida marcada uns minutos antes da apresentação (dado) não vai para o fim.
eq('partida uns minutos antes da apresentação fica em 1.º', aggregateLegs([{ dep: 'FNC', arr: 'LIS', off: '08:00', on: '09:40' }, { dep: 'LIS', arr: 'FNC', off: '05:10', on: '06:55' }], { report: '05:15' }).route, 'LIS-FNC-LIS');
// Uma perna à mão (sem horas) fica ONDE foi introduzida (antes ia sempre para o fim: 1.ª à mão + 2.ª detetada invertia a rota).
const mix = [{ flightNo: 'M1', dep: 'LIS', arr: 'FNC', source: 'manual' }, { flightNo: 'D2', dep: 'FNC', arr: 'LIS', off: '08:30', on: '10:05' }];
eq('perna à mão em 1.º fica em 1.º', aggregateLegs(mix, { report: '05:15' }).route, 'LIS-FNC-LIS');
eq('… e sem apresentação', aggregateLegs(mix).route, 'LIS-FNC-LIS');
eq('perna à mão no fim fica no fim', aggregateLegs([mix[1], { dep: 'LIS', arr: 'OPO', source: 'manual' }], { report: '07:30' }).route, 'FNC-LIS-OPO');

// ── Com a DATA, a ordem é pelos INSTANTES (o fuso de cada aeroporto): longo curso para leste ──
// Apresentação 08:00 em LIS; LIS→SIN 09:00–06:00 (+8 h); SIN→DPS às 07:30 de lá, 22 h 30 depois da 1.ª partida. No relógio,
// 07:30 vem "antes" da apresentação e a 2.ª perna passava para 1.ª (rota SIN-DPS-SIN…). Pelos instantes fica certa.
const east = [{ flightNo: 'L1', dep: 'LIS', arr: 'SIN', off: '09:00', on: '06:00' }, { flightNo: 'L2', dep: 'SIN', arr: 'DPS', off: '07:30', on: '10:10' }];
eq('longo curso para leste, com a data: a ordem pelos instantes', aggregateLegs(east, { report: '08:00', date: '2026-01-15' }).route, 'LIS-SIN-DPS');
eq('… introduzidas ao contrário', aggregateLegs([east[1], east[0]], { report: '08:00', date: '2026-01-15' }).route, 'LIS-SIN-DPS');
// Com a data, os casos de cima dão o mesmo.
eq('com a data: passa a meia-noite', aggregateLegs([nite[1], nite[0]], { report: '21:30', date: '2026-01-15' }).route, 'LIS-FNC-LIS');
eq('com a data: quatro pernas', aggregateLegs(four, { report: '05:15', date: '2026-01-15' }).legs.map((x) => x.flightNo).join(','), 'A1,A2,A3,A4');
eq('com a data: partida uns minutos antes da apresentação', aggregateLegs([{ dep: 'FNC', arr: 'LIS', off: '08:00', on: '09:40' }, { dep: 'LIS', arr: 'FNC', off: '05:10', on: '06:55' }], { report: '05:15', date: '2026-01-15' }).route, 'LIS-FNC-LIS');
eq('com a data: repartido', aggregateLegs(split, { report: '05:00', date: '2026-01-15' }).route, 'LIS-OPO-LIS');
eq('com a data: aeroporto sem fuso → o relógio, como sem data', aggregateLegs([{ dep: 'ZZZ', arr: 'LIS', off: '09:10', on: '11:25' }, { dep: 'LIS', arr: 'ZZZ', off: '06:20', on: '08:35' }], { report: '05:20', date: '2026-01-15' }).route, 'LIS-ZZZ-LIS');

// ── A Zulu de uma perna detetada é de OUTRO dia (histórico de julho num serviço de dezembro: a hora de verão já não é a mesma) ──
{
  const { legForDate, legsZulu } = require(path.resolve('data/zulu.js'));
  const summer = { flightNo: 'EJU7', dep: 'LIS', arr: 'MAD', off: '07:00', on: '09:20', offZ: '06:00', onZ: '07:20' };
  const w = legForDate('2026-12-10', summer);
  eq('perna do histórico: a Zulu de outro dia sai', [w.offZ, w.onZ], [null, null]);
  eq('… e a Zulu calcula-se pelo fuso no dia do serviço', legsZulu('2026-12-10', [w], '06:00')[0], { off: '07:00', on: '08:20' });
  // Revisão independente (E6): com UMA ponta sem fuso, as duas Zulu ficam (tirar só uma misturava a de inverno com a de verão).
  const half = legForDate('2026-12-10', { dep: 'LIS', arr: 'ZZZ', off: '07:00', on: '10:50', offZ: '06:00', onZ: '08:50' });
  eq('E6 uma ponta sem fuso: ficam as duas Zulu', [half.offZ, half.onZ], ['06:00', '08:50']);
  eq('aeroporto sem fuso conhecido: fica a Zulu que veio', legForDate('2026-12-10', { dep: 'ZZZ', arr: 'MAD', off: '07:00', on: '09:20', offZ: '06:00', onZ: '08:20' }).offZ, '06:00');
}

console.log(`\n${fail === 0 ? '✅' : '❌'}  flightDetect: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
