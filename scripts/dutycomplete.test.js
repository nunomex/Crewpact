/*
 * Testes do "Completar" do serviço (data/dutyComplete.js) — esboço design/detalhe-servico.html v2 (2026-11-08).
 * A escala só se lê; os factos que a lei ou o acordo precisam e o calendário não traz completam-se um a um.
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
const C = require(path.resolve('data/dutyComplete.js'));
const ftl = require(path.resolve('ftl/index.js'));
const ejPil = require(path.resolve('ae/easyjetSpac.js'));
const ejCab = require(path.resolve('ae/easyjetSnpvac.js'));
const tapCab = require(path.resolve('ae/tapSnpvac.js'));
const tapPil = require(path.resolve('ae/tapSpac.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w); if (a === b) pass++; else { fail++; fails.push(`✗ ${n}: ${a} ≠ ${b}`); } };
const ids = (rows) => rows.map((r) => r.id);

// ── Que linhas aparecem ──
const voo = { kind: 'flight', report_time: '05:30', block_off: '05:45', block_on: '07:20', sectors: 1, route: 'LIS-FNC', flight_minutes: 95, legs: [{ dep: 'LIS', arr: 'FNC', off: '05:45', on: '07:20' }] };
eq('piloto easyJet, voo simples: discrição, adiamento, assistência, pernoita, folga', ids(C.completeRows(voo, { isPilot: true, ae: ejPil, category: 'FO' })), ['discretion', 'delayed', 'preStandby', 'nightStop', 'dayOffWorked']);
eq('cabine easyJet: + apresentação dos pilotos (ORO.FTL.205(c)) e o papel (CCLT/CTI…)', ids(C.completeRows(voo, { isPilot: false, ae: ejCab, category: 'CM' })), ['fcReport', 'discretion', 'delayed', 'preStandby', 'nightStop', 'role', 'dayOffWorked']);
const instrOpts = (C.completeRows(voo, { isPilot: true, ae: ejPil, category: 'FO', instructorRated: true }).find((r) => r.id === 'role') || { sheet: { fields: [{ options: [] }] } }).sheet.fields[0].options.map((o) => o.id);
eq('instrutor easyJet num voo: o instrutor é só em terra (Art. 42.º) → não aparece', instrOpts.includes('instr'), false);
eq('… numa formação aparece', C.completeRows({ kind: 'training', report_time: '09:00', block_on: '17:00' }, { isPilot: true, ae: ejPil, category: 'FO', instructorRated: true }).find((r) => r.id === 'role').sheet.fields[0].options.some((o) => o.id === 'instr'), true);
const tapVoo = C.completeRows(voo, { isPilot: true, ae: tapPil, category: 'OP3' });
eq('TAP pilotos: sem folga trabalhada nem papel', ids(tapVoo).filter((x) => x === 'dayOffWorked' || x === 'role'), []);

// ── O repartido: o alojamento na pausa, e "Por indicar" quando falta (o motor diz 'accommodation') ──
const rep = { kind: 'flight', report_time: '06:00', block_off: '06:30', block_on: '20:30', sectors: 4, route: 'LIS-OPO-LIS-FAO-LIS', flight_minutes: 300,
  legs: [{ dep: 'LIS', arr: 'OPO', off: '06:30', on: '07:30' }, { dep: 'OPO', arr: 'LIS', off: '08:30', on: '09:30' }, { dep: 'LIS', arr: 'FAO', off: '17:00', on: '18:00' }, { dep: 'FAO', arr: 'LIS', off: '19:30', on: '20:30' }] };
const d = ftl.ftlForDuty(rep, { isPilot: true, date: '2026-07-25', base: 'LIS' });
const rr = C.completeRows(rep, { isPilot: true, ae: ejPil, category: 'FO', unknowns: d.fdp.unknowns });
eq('repartido sem resposta: o motor dá "incerto" por falta do alojamento', [d.fdp.exact, d.fdp.unknowns.includes('accommodation')], [false, true]);
eq('… e o alojamento vem primeiro, "Por indicar", a faltar', [rr[0].id, rr[0].value.pt, rr[0].need], ['accommodation', 'Por indicar', true]);
const patchAcc = rr[0].apply({ acc: 'basic' });
eq('escolher "sala" grava accommodation: basic', patchAcc, { accommodation: 'basic' });
const d2 = ftl.ftlForDuty({ ...rep, ...patchAcc }, { isPilot: true, date: '2026-07-25', base: 'LIS' });
eq('com a sala respondida já não falta o alojamento', d2.fdp.unknowns.includes('accommodation'), false);
eq('… e a linha deixa de faltar', C.completeRows({ ...rep, ...patchAcc }, { isPilot: true, ae: ejPil, category: 'FO', unknowns: d2.fdp.unknowns }).find((r) => r.id === 'accommodation').need, false);

// ── O special: cada facto muda só o seu campo, e fica null quando tudo está vazio ──
const disc = C.completeRows(voo, { isPilot: true, ae: ejPil, category: 'FO' }).find((r) => r.id === 'discretion');
eq('discrição usada → special.discretion', disc.apply({ on: true }), { special: { discretion: true } });
eq('discrição desligada → special null', disc.apply({ on: false }), { special: null });
const withDisc = { ...voo, special: { discretion: true } };
const del = C.completeRows(withDisc, { isPilot: true, ae: ejPil, category: 'FO' }).find((r) => r.id === 'delayed');
eq('adiamento mantém a discrição (só muda o seu campo)', del.apply({ on: true, from: '04:30' }), { special: { discretion: true, delayedFrom: '04:30' } });
eq('adiamento sem hora original não é válido', del.valid({ on: true, from: '' }), false);
eq('2.º aviso só com as duas horas', del.apply({ on: true, from: '04:30', d1: '05:00', n2: '' }).special.delayed1, undefined);
const sb = C.completeRows(voo, { isPilot: true, ae: ejPil, category: 'FO' }).find((r) => r.id === 'preStandby');
eq('assistência em casa de 7 h', sb.apply({ type: 'other', h: 7 }), { special: { preStandby: { type: 'other', standbyH: 7 } } });
eq('… e "não" limpa', sb.apply({ type: 'none', h: 7 }), { special: null });

// ── TAP: tipo de formação a faltar (há formação sem per diem, RRRGS Cl. 10.ª) ──
const trn = { kind: 'training', report_time: '09:00', block_on: '17:00', sectors: 0 };
const tr = C.completeRows(trn, { isPilot: true, ae: tapPil, category: 'OP3' });
eq('TAP pilotos, formação sem tipo → "Por indicar"', [tr[0].id, tr[0].need], ['training', true]);
eq('… simulador como aluno', tr[0].apply({ t: 'sim' }), { eLearning: false, trainingType: 'sim' });
eq('TAP cabine, DHC em económica num posicionamento', ids(C.completeRows({ kind: 'positioning', report_time: '08:00', block_on: '10:00', route: 'LIS-OPO' }, { isPilot: false, ae: tapCab, category: 'CAB3' })), ['dhcEconomy']);

// ── Horas reais ──
const real = C.realTimesPatch(voo, { on: '07:55', signOff: '08:25' });
eq('horas reais: calços dentro e fim de serviço; a última perna acompanha; o block recalcula', [real.block_on, real.signOff, real.legs[0].on, real.flight_minutes], ['07:55', '08:25', '07:55', 130]);
eq('… a Zulu do calendário dessa hora sai (recalcula-se pelo fuso)', C.realTimesPatch({ ...voo, legs: [{ ...voo.legs[0], onZ: '06:20' }] }, { on: '07:55' }).legs[0].onZ, undefined);
eq('posicionamento no fim não é a última chegada operada', C.realTimesPatch({ ...voo, legs: [voo.legs[0], { dep: 'FNC', arr: 'LIS', off: '08:00', on: '09:40', dh: true }] }, { on: '07:55' }).legs.map((l) => l.on), ['07:55', '09:40']);
eq('a prevista vem da escala publicada', C.plannedOf({ ...voo, block_on: '07:55', snap: { block_on: '07:20' } }, 'block_on'), '07:20');
eq('sem diferença, sem prevista', C.plannedOf({ ...voo, snap: { block_on: '07:20' } }, 'block_on'), null);

// ── "Faltou um dado" ──
eq('sem apresentação → só esse campo', C.missingFields({ ...voo, report_time: null }).map((f) => f.key), ['report_time']);
eq('com tudo → nada', C.missingFields(voo), []);

if (fail) { console.log(fails.join('\n')); }
console.log(`completar o serviço — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
process.exit(fail ? 1 : 0);
