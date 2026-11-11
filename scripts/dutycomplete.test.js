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
// As horas reais num voo com fusos diferentes (auditoria A-179): LIS 10:00 → TLV, dentro às 18:00 em vez das 17:50 → 6 h de
// voo (antes o relógio dava 8 h, +2 h no voo dos 28 dias).
eq('horas reais com fusos diferentes: o block é o tempo decorrido', C.realTimesPatch({ kind: 'flight', report_time: '09:00', block_off: '10:00', block_on: '17:50', sectors: 1, flight_minutes: 350, route: 'LIS-TLV', legs: [{ dep: 'LIS', arr: 'TLV', off: '10:00', on: '17:50', offZ: '10:00', onZ: '15:50' }] }, { on: '18:00' }, { date: '2026-01-15' }).flight_minutes, 360);
eq('posicionamento no fim não é a última chegada operada', C.realTimesPatch({ ...voo, legs: [voo.legs[0], { dep: 'FNC', arr: 'LIS', off: '08:00', on: '09:40', dh: true }] }, { on: '07:55' }).legs.map((l) => l.on), ['07:55', '09:40']);
eq('a prevista vem da escala publicada', C.plannedOf({ ...voo, block_on: '07:55', snap: { block_on: '07:20' } }, 'block_on'), '07:20');
eq('sem diferença, sem prevista', C.plannedOf({ ...voo, snap: { block_on: '07:20' } }, 'block_on'), null);

// ── "Faltou um dado" ──
eq('sem apresentação → só esse campo', C.missingFields({ ...voo, report_time: null }).map((f) => f.key), ['report_time']);
eq('com tudo → nada', C.missingFields(voo), []);

if (fail) { console.log(fails.join('\n')); }
// ── As horas das pernas que não batem certo (2026-11-11, noite 10) ──
// Um serviço JÁ guardado com a volta a sair antes de a ida chegar (17:30–20:35 e 19:50–21:30) só se corrigia pela importação.
// O motor dá o PSV como incerto e diz o que falta (`legTimes`, ORO.FTL.105(13) e (24)): a linha "Horas das pernas" do
// Completar deixa corrigi-las no Detalhe, perna a perna.
{
  const ov = { kind: 'flight', duty_date: '2026-11-20', report_time: '16:30', block_off: '17:30', block_on: '21:30', sectors: 2, flight_minutes: 285, route: 'LIS-FNC-LIS',
    legs: [{ flightNo: 'EZY1', dep: 'LIS', arr: 'FNC', off: '17:30', on: '20:35', offZ: '17:30', onZ: '20:35' }, { flightNo: 'EZY2', dep: 'FNC', arr: 'LIS', off: '19:50', on: '21:30', offZ: '19:50', onZ: '21:30' }] };
  const unk = ftl.ftlForDuty(ov, { isPilot: true, base: 'LIS', date: '2026-11-20', postFlightMin: 30 }).fdp.unknowns;
  eq('pernas que não batem certo: o motor diz o que falta', unk, ['legTimes']);
  const rows = C.completeRows(ov, { isPilot: true, ae: ejPil, category: 'FO', unknowns: unk });
  const row = rows[0];
  eq('… e o Completar põe "Horas das pernas" em primeiro, a pedir resposta', [row.id, row.need, row.cite], ['legTimes', true, 'ORO.FTL.105(13)']);
  eq('… com a partida e a chegada de cada perna, já preenchidas com as da escala', row.sheet.fields.map((f) => [f.key, f.type, f.value]), [['off0', 'time', '17:30'], ['on0', 'time', '20:35'], ['off1', 'time', '19:50'], ['on1', 'time', '21:30']]);
  eq('… os rótulos dizem a perna e os aeroportos', row.sheet.fields.map((f) => f.label.pt), ['Perna 1 · LIS→FNC · partida', 'Perna 1 · LIS→FNC · chegada', 'Perna 2 · FNC→LIS · partida', 'Perna 2 · FNC→LIS · chegada']);
  // Sem mexer em nada não se grava (as horas continuam sem bater certo); com uma hora que não é hora, também não.
  eq('… as mesmas horas não são uma correção', row.valid({ off0: '17:30', on0: '20:35', off1: '19:50', on1: '21:30' }), false);
  eq('… uma hora inválida não passa', row.valid({ off0: '17:30', on0: '20:35', off1: '21:2', on1: '23:00' }), false);
  eq('… horas que continuam sobrepostas não passam', row.valid({ off0: '17:30', on0: '20:35', off1: '20:00', on1: '21:30' }), false);
  // A 1.ª partida não pode ficar antes da apresentação (16:30): o PSV conta da apresentação.
  eq('… uma partida antes da apresentação não passa', row.valid({ off0: '16:00', on0: '20:35', off1: '21:20', on1: '23:00' }), false);
  const fixed = { off0: '17:30', on0: '20:35', off1: '21:20', on1: '23:00' };
  eq('… a volta às 21:20–23:00 passa', row.valid(fixed), true);
  const patch = row.apply(fixed);
  // A perna corrigida perde a Zulu do calendário dessas horas (recalcula-se pelo fuso); os calços do serviço e o tempo de voo
  // acompanham: 3:05 + 1:40 = 4:45 (ORO.FTL.105(13): o tempo decorrido de cada setor).
  eq('… o que se grava: as pernas, os calços e o tempo de voo', [patch.legs.map((l) => [l.off, l.on, l.offZ || null, l.onZ || null]), patch.block_off, patch.block_on, patch.flight_minutes],
    [[['17:30', '20:35', '17:30', '20:35'], ['21:20', '23:00', null, null]], '17:30', '23:00', 285]);
  const after = ftl.ftlForDuty({ ...ov, ...patch }, { isPilot: true, base: 'LIS', date: '2026-11-20', postFlightMin: 30 });
  eq('… e o PSV deixa de estar incerto: 6:30 de 11:15', [after.fdp.actualFdpStr, after.fdp.maxFdpStr, !!after.fdp.uncertain, after.fdp.unknowns], ['06:30', '11:15', false, []]);
  eq('sem a dúvida das pernas, a linha não aparece', ids(C.completeRows({ ...ov, ...patch }, { isPilot: true, ae: ejPil, category: 'FO', unknowns: [] })).includes('legTimes'), false);
  // Um posicionamento no fim: o fim do serviço (sign-off lido da escala) acompanha a chegada dele.
  const dh = { ...ov, signOff: '21:30', sectors: 1, legs: [ov.legs[0], { ...ov.legs[1], dh: true }], block_on: '20:35' };
  const pDh = C.completeRows(dh, { isPilot: true, ae: ejPil, category: 'FO', unknowns: ['legTimes'] })[0].apply(fixed);
  eq('… com posicionamento no fim: calços do último setor operado e sign-off na chegada do DH', [pDh.block_on, pDh.signOff], ['20:35', '23:00']);
}

// (3.ª revisão independente.) Quando o 2.º serviço só parte no DIA SEGUINTE (pernas 15:00–20:00 e 07:00–09:00), não cabe
// como serviço extra do mesmo dia (ficava gravado ANTES do 1.º): a linha não oferece "são dois serviços".
{
  const nx = { kind: 'flight', duty_date: '2026-11-20', report_time: '14:00', block_off: '15:00', block_on: '09:00', sectors: 2, flight_minutes: 420, route: 'LIS-FNC-LIS', source: 'calendar',
    legs: [{ flightNo: 'EZY1', dep: 'LIS', arr: 'FNC', off: '15:00', on: '20:00' }, { flightNo: 'EZY2', dep: 'FNC', arr: 'LIS', off: '07:00', on: '09:00' }] };
  const rn = ftl.ftlForDuty(nx, { isPilot: true, base: 'LIS', date: '2026-11-20', postFlightMin: 30 });
  const rowN = C.completeRows(nx, { isPilot: true, ae: ejPil, category: 'FO', unknowns: rn.fdp.unknowns, legsBroken: rn.legsBroken, canSplit: true, postFlightMin: 30 })[0];
  eq('11 h em terra com o 2.º a partir no dia seguinte: só "corrigir as horas"', [rn.legsBroken, rowN.id, rowN.sheet.fields.some((f) => f.key === 'mode')], ['rest', 'legTimes', false]);
}

// ── Um serviço lido como um que são dois (2026-11-12) ──
// 10 h ou mais em terra entre duas pernas (ftl legsBrokenKind 'rest'): com as horas certas não é um intervalo (ORO.FTL.105(6))
// — são dois serviços com um repouso no meio. A linha "Horas das pernas" deixa escolher "são dois serviços" e parte-o.
{
  const one = { kind: 'flight', duty_date: '2026-11-20', report_time: '05:00', block_off: '06:00', block_on: '23:30', sectors: 3, flight_minutes: 390, route: 'LIS-FAO-LIS-OPO', source: 'calendar',
    legs: [{ flightNo: 'EZY1', dep: 'LIS', arr: 'FAO', off: '06:00', on: '07:00' }, { flightNo: 'EZY2', dep: 'FAO', arr: 'LIS', off: '07:40', on: '08:40' }, { flightNo: 'EZY3', dep: 'LIS', arr: 'OPO', off: '22:30', on: '23:30' }] };
  const r = ftl.ftlForDuty(one, { isPilot: true, base: 'LIS', date: '2026-11-20', postFlightMin: 30 });
  eq('13 h 50 em terra entre pernas: o motor diz porquê', [r.legsBroken, r.fdp.unknowns], ['rest', ['legTimes']]);
  const row = C.completeRows(one, { isPilot: true, ae: ejPil, category: 'FO', unknowns: r.fdp.unknowns, legsBroken: r.legsBroken, canSplit: true })[0];
  eq('a linha oferece as duas saídas', [row.id, row.sheet.fields[0].key, row.sheet.fields[0].options.map((o) => o.id)], ['legTimes', 'mode', ['fix', 'two']]);
  eq('"são dois serviços" grava-se sem mexer nas horas; a apresentação do 2.º é opcional', [row.valid({ mode: 'two' }), row.valid({ mode: 'two', rep2: '21:30' }), row.valid({ mode: 'two', rep2: '9' })], [true, true, false]);
  // A apresentação do 2.º tem de ficar entre o fim do 1.º (calços das 08:40) e a partida dele (22:30).
  eq('a apresentação do 2.º depois da partida, ou ainda dentro do 1.º, não passa', [row.valid({ mode: 'two', rep2: '23:00' }), row.valid({ mode: 'two', rep2: '07:00' }), row.valid({ mode: 'two', rep2: '22:30' })], [false, false, true]);
  // … e o fim do 1.º é o fim do SERVIÇO (calços + o pós-voo do perfil, 30 min → 09:10), não os calços.
  const row30 = C.completeRows(one, { isPilot: true, ae: ejPil, category: 'FO', unknowns: r.fdp.unknowns, legsBroken: r.legsBroken, canSplit: true, postFlightMin: 30 })[0];
  eq('com 30 min de pós-voo, 08:50 ainda é o 1.º serviço; 09:10 já passa', [row30.valid({ mode: 'two', rep2: '08:50' }), row30.valid({ mode: 'two', rep2: '09:10' })], [false, true]);
  const p = row.apply({ mode: 'two', rep2: '21:30' });
  // O 1.º fica com as duas primeiras pernas; o 2.º (extra do dia) com a última e a sua apresentação. O voo é o de cada um.
  eq('o 1.º serviço: 05:00, calços 06:00–08:40, 2 setores, LIS-FAO-LIS, 2:00 de voo', [p.report_time, p.block_off, p.block_on, p.sectors, p.route, p.flight_minutes, p.legs.length], ['05:00', '06:00', '08:40', 2, 'LIS-FAO-LIS', 120, 2]);
  const x = p.extra[p.extra.length - 1];
  eq('o 2.º serviço: 21:30, calços 22:30–23:30, 1 setor, LIS-OPO, 1:00 de voo', [x.report_time, x.block_off, x.block_on, x.sectors, x.route, x.flight_minutes, x.kind, x.legs.length], ['21:30', '22:30', '23:30', 1, 'LIS-OPO', 60, 'flight', 1]);
  const two = ftl.dayFtlFromDuties([{ ...one, ...p, extra: undefined }, x], { isPilot: true, base: 'LIS', date: '2026-11-20', postFlightMin: 30 });
  eq('… e o dia passa a dois PSV com um repouso no meio, sem dúvida', [two.between[0].kind, !!two.psv.over, !!two.psv.uncertain], ['rest', false, false]);
  eq('sem a apresentação do 2.º, fica por indicar (não se inventa)', row.apply({ mode: 'two' }).extra[0].report_time, null);
  // Num serviço extra do dia não se pode partir daqui (canSplit falso): só a correção das horas.
  eq('num extra: só corrigir as horas', C.completeRows(one, { isPilot: true, ae: ejPil, category: 'FO', unknowns: r.fdp.unknowns, legsBroken: r.legsBroken, canSplit: false })[0].sheet.fields[0].key, 'off0');
  // Com uma partida antes da chegada anterior ('before') não há "dois serviços": as horas estão erradas.
  eq('partida antes da chegada: só corrigir as horas', C.completeRows(one, { isPilot: true, ae: ejPil, category: 'FO', unknowns: r.fdp.unknowns, legsBroken: 'before', canSplit: true })[0].sheet.fields[0].key, 'off0');
}

console.log(`completar o serviço — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
process.exit(fail ? 1 : 0);
