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

console.log(`\n${fail === 0 ? '✅' : '❌'}  flightDetect: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
