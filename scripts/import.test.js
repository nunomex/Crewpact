/*
 * Golden da IMPORTAÇÃO DA ESCALA (calendário e PDF) — auditoria dos cálculos, bloco 4 (S6, M12, L12 e o DH), 2026-11-06.
 * Os valores esperados saem do texto oficial em fontes/ (citado em cada caso), nunca do código:
 *   • nenhum serviço desaparece dos acumulados (ORO.FTL.210): sem fim, sem apresentação, dia de standby com voo, serviço
 *     repartido com pausa longa, evento de dia inteiro com horas no texto (A-220, A-221, A-222, A-227, A-228);
 *   • o posicionamento (DH) conta como serviço e, antes de operar, como PSV, mas nunca como setor nem tempo de voo
 *     (ORO.FTL.215, 105(12), 105(13)) (A-224, A-225, A-226, A-263);
 *   • eventos de vários dias contam cada dia (A-229, A-236); a cabine só regista os dias de doença pagos (Cl. 61.ª);
 *   • reimportar não deixa dados velhos (sign-off, e-learning, OFC, papel) nem duplica serviços (A-230 a A-233);
 *   • cada candidato é verificado com o motor da Simulação, com os outros candidatos da mesma leitura (A-254).
 * Executar:  node scripts/import.test.js   (ou: npm run test:import)
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

const { mapFlight, mapNonFlight, mapNonFlightDays, buildDuties, classify, sickDatesFromEvent, vacationDatesFromEvent } = require(path.resolve('data/calendarParse.js'));
const { codesFor } = require(path.resolve('data/rosterCodes.js'));
const { parseEasyjetRoster } = require(path.resolve('data/pdfRoster.js'));
const { dutyFromActivity, dutyFromNonFlight, buildImportCandidates, importSaveFields, candidateKind, importSections, diagSummary } = require(path.resolve('data/rosterImport.js'));
const { classify: classify3 } = require(path.resolve('data/rosterDiff.js'));
const { paidSickDays } = require(path.resolve('data/aeEvents.js'));
const { dayFtlFromDuties } = require(path.resolve('ftl/index.js'));
const { simulateDuty } = require(path.resolve('data/simulation.js'));

const codes = codesFor('easyjet');
let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
// Evento de calendário (horas locais do dispositivo, como o expo-calendar as dá).
const ev = (title, start, end, { notes = '', allDay = false, location = '' } = {}) => ({ title, notes, location, startDate: start, endDate: end, allDay });
const PIL = { postFlightMin: 30, isPilot: true, base: 'LIS' };
const day = (list, date, C = PIL) => dayFtlFromDuties(list, { ...C, date });
const acts = (evs, opts = { baseOf: () => 'LIS' }) => buildDuties(evs.map((e) => mapFlight(e, codes)).filter(Boolean), opts);

// ─────────────────────────────────────────────────────────────────────────────────────
// 0 · O texto oficial que os casos usam. O teste falha se a citação deixar de estar lá.
{
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-pt.txt'), 'utf8'));
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  const snpvac = norm(fs.readFileSync(path.resolve('fontes/ae-easyjet/easyjet-snpvac-2024.txt'), 'utf8'));
  const quotes = [
    [reg, 'O posicionamento após a apresentação ao serviço mas antes da entrada em funções é contabilizado como um PSV mas não conta como um setor.'],
    [reg, 'O tempo gasto no posicionamento conta todo como período de serviço.'],
    [reg, 'no final do último setor em que o tripulante desempenha funções'],
    [reg, 'o tempo decorrido entre o primeiro movimento de saída de uma aeronave do lugar de estacionamento'],
    [reg, 'O intervalo em terra deve contar todo como PSV.'],
    [reg, 'O serviço de assistência no aeroporto conta por inteiro como período de serviço para efeito das secções ORO.FTL.210 e ORO.FTL.235.'],
    [reg, 'O PSV começa a contar a partir da hora de apresentação ao serviço no aeroporto.'],
    [reg, 'deve ser pelo menos igual ao período de serviço precedente, ou de 12 horas'],
    [reg, 'deve ser pelo menos igual ao período de serviço precedente, ou de 10 horas'],
    [cs, '25 % of time spent on standby other than airport standby counts as duty time for the purpose of ORO.FTL.210'],
    [cs, 'standby ceases when the crew member reports at the designated reporting point'],
    [snpvac, 'após os 3 (três) dias de ausência iniciais'],
  ];
  quotes.forEach(([txt, q], i) => eq(`fonte ${i + 1}: «${q.slice(0, 48)}…»`, txt.includes(norm(q)), true));
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 1 · A-227 · Serviço repartido com pausa de mais de 6 h: é UM PSV (ORO.FTL.220(b): "O intervalo em terra deve contar todo
// como PSV"). Duas pernas só são serviços separados quando o intervalo pode ser um repouso (ORO.FTL.235: pelo menos 12 h na
// base / 10 h fora, ou o serviço anterior se for maior). O 2.º bloco não tem apresentação própria e saía dos 210.
for (const [gapLbl, off2, on2] of [['6h01', '14:16', '15:51'], ['7h00', '15:15', '16:50']]) {
  const a = acts([ev('EZY7001 LIS-FNC', '2026-10-12T06:40:00', '2026-10-12T08:15:00', { notes: 'RP 05:40' }),
    ev('EZY7002 FNC-LIS', `2026-10-12T${off2}:00`, `2026-10-12T${on2}:00`)]);
  eq(`A-227 pausa ${gapLbl}: um só serviço`, a.length, 1);
  const d = dutyFromActivity(a[0], 'LIS');
  eq(`A-227 pausa ${gapLbl}: o serviço`, [d.report_time, d.block_on, d.sectors, d.route, d.flight_minutes], ['05:40', on2, 2, 'LIS-FNC-LIS', 190]);
  const e = day([d], '2026-10-12');
  const [h, m] = on2.split(':').map(Number);
  const svc = h * 60 + m - (5 * 60 + 40) + 30;   // da apresentação aos calços + 30 min de pós-voo (OM easyJet)
  eq(`A-227 pausa ${gapLbl}: PSV desde a apresentação, 210 inteiro`, [e.psv.result, e.servicoMin, e.vooMin], [`${String(Math.floor((svc - 30) / 60)).padStart(2, '0')}:${String((svc - 30) % 60).padStart(2, '0')}`, svc, 190]);
}
{
  // No dia seguinte (21:45 até à apresentação, fora da base: mais do que as 10 h e o serviço anterior): dois serviços.
  const a = acts([ev('EZY7001 LIS-FNC', '2026-10-12T06:40:00', '2026-10-12T08:15:00', { notes: 'RP 05:40' }),
    ev('EZY7002 FNC-LIS', '2026-10-13T07:00:00', '2026-10-13T08:35:00', { notes: 'RP 06:00' })]);
  eq('A-227: com repouso a meio, dois serviços', a.map((x) => [x.dateISO, x.legs.length, x.report]), [['2026-10-12', 1, '05:40'], ['2026-10-13', 1, '06:00']]);
  // Na base, 11:30 de intervalo não é repouso (são precisas 12 h: ORO.FTL.235(a)) → o mesmo PSV. Sem saber a base, 11:30
  // podem ser um repouso fora (10 h) → serviços separados.
  const evs = [ev('EZY7101 LIS-OPO', '2026-10-14T06:00:00', '2026-10-14T07:00:00', { notes: 'RP 05:15' }),
    ev('EZY7102 OPO-LIS', '2026-10-14T08:00:00', '2026-10-14T09:00:00'),
    ev('EZY7103 LIS-FAO', '2026-10-14T20:30:00', '2026-10-14T21:30:00')];
  // Revisão E1/R4: com alojamento adequado na base o mínimo também é 10 h (ORO.FTL.235(a)(2)) — 11:30 PODE ser um repouso, na
  // base ou fora: ficam dois serviços, e o repouso entre eles é verificado depois (curto, se não houver alojamento).
  eq('A-227: 11:30 na base → podem ser dois (235(a)(2): 10 h com alojamento)', acts(evs).length, 2);
  eq('A-227: 11:30 sem saber a base → dois', acts(evs, {}).length, 2);
  // Revisão E1: um intervalo mais curto do que o serviço anterior mas de 10 h ou mais é um REPOUSO (abaixo do mínimo do 235), não
  // um PSV. 2026-11-11 (noite 10): fora da base, com 10 h ou mais, só é legal como repouso reduzido (CS FTL.1.235(c)(1)) → o dia entra
  // com o aviso como INCERTO (antes: "curto", estado 'warn'): dia 10 das 06:00 aos calços das 17:30 no OPO; dia 11 com apresentação às 04:45 → 11:15 de intervalo.
  const e1 = [ev('EZY1 LIS-TFS', '2026-10-10T07:00:00', '2026-10-10T09:50:00', { notes: 'RP 06:00' }), ev('EZY2 TFS-LIS', '2026-10-10T10:40:00', '2026-10-10T13:30:00'),
    ev('EZY3 LIS-OPO', '2026-10-10T16:30:00', '2026-10-10T17:30:00'), ev('EZY4 OPO-LIS', '2026-10-11T05:30:00', '2026-10-11T06:30:00', { notes: 'RP 04:45' }),
    ev('EZY5 LIS-FNC', '2026-10-11T07:45:00', '2026-10-11T09:25:00')];
  eq('E1: 11:15 depois de 11:30 de serviço → dois serviços', acts(e1).map((x) => [x.dateISO, x.report, x.legs.length]), [['2026-10-10', '06:00', 3], ['2026-10-11', '04:45', 2]]);
  const ce1 = buildImportCandidates({ activities: acts(e1), ...PIL });
  const d11 = ce1.find((c) => c.duty.duty_date === '2026-10-11');
  eq('E1: … e o repouso abaixo do mínimo aparece (10:45 desde o fim do serviço, de 12:00: o serviço anterior), como incerto', [d11.status, d11.prospect.verdict, d11.prospect.issues.some((i) => i.type === 'restBefore' && i.level === 'unc' && i.kind === 'reducedRest' && i.actualMin === 645 && i.requiredMin === 720)], ['ok', 'unc', true]);
  // Nunca um serviço de 24 h ou mais (as horas HH:MM dariam a volta ao relógio): 9 h de intervalo, mas o 2.º dia acaba às 08:00.
  const e1b = [ev('EZY1 LIS-TFS', '2026-10-12T07:00:00', '2026-10-12T09:50:00', { notes: 'RP 06:00' }), ev('EZY2 TFS-LIS', '2026-10-12T14:40:00', '2026-10-12T17:30:00'),
    ev('EZY3 LIS-OPO', '2026-10-13T02:30:00', '2026-10-13T03:30:00'), ev('EZY4 OPO-LIS', '2026-10-13T07:00:00', '2026-10-13T08:00:00')];
  eq('E1: nunca um serviço de 24 h ou mais', acts(e1b).length, 2);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 2 · A-228 · Evento de DIA INTEIRO com horas no texto: as horas são as do texto, nunca a meia-noite do evento (o tempo de voo
// é de calços a calços, ORO.FTL.105(13); a assistência no aeroporto conta por inteiro, ORO.FTL.225(c)).
{
  const AD = { allDay: true };
  const f = mapFlight(ev('EJU7001 LIS-FNC 06:40-08:15', '2026-10-12T00:00:00', '2026-10-13T00:00:00', { ...AD, notes: 'RP 05:40' }), codes);
  eq('A-228 voo de dia inteiro: horas do texto', f && [f.dateISO, f.report, f.depTime, f.arrTime], ['2026-10-12', '05:40', '06:40', '08:15']);
  eq('A-228 voo de dia inteiro: 95 min de voo (não 1440)', dutyFromActivity(buildDuties([f])[0]).flight_minutes, 95);
  const s = mapNonFlight(ev('ADTY LIS 0600-1000', '2026-10-12T00:00:00', '2026-10-13T00:00:00', AD), codes);
  eq('A-228 ADTY de dia inteiro: 06:00–10:00', s && [s.kind, s.start, s.end], ['standby_airport', '06:00', '10:00']);
  eq('A-228 ADTY de dia inteiro: 4 h nos 210', day([dutyFromNonFlight(s)], '2026-10-12').servicoMin, 240);
  const o = mapNonFlight(ev('OFC8 0900-1700', '2026-10-12T00:00:00', '2026-10-13T00:00:00', AD), codes);
  eq('A-228 OFC8 de dia inteiro: 09:00–17:00', o && [o.kind, o.start, o.end, o.officeType], ['office', '09:00', '17:00', 'ofc8']);
  eq('A-228 voo de dia inteiro sem horas de voo: não entra', mapFlight(ev('EJU7001 LIS-FNC', '2026-10-12T00:00:00', '2026-10-13T00:00:00', { ...AD, notes: 'RP 05:40' }), codes), null);
  const r = mapNonFlight(ev('ADTY LIS', '2026-10-12T00:00:00', '2026-10-13T00:00:00', { ...AD, notes: 'RP 06:00' }), codes);
  eq('A-228 ADTY de dia inteiro só com apresentação: fim por saber', r && [r.start, r.end], ['06:00', null]);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 3 · A-238 · O título decide o tipo; as notas não transformam um voo em formação ou escritório. "SEP" seguido de uma hora é
// formação (o mês "SEP 26" continua a não ser). A apresentação nas notas não é lida como hora de saída.
{
  const t = ['2026-10-12T06:40:00', '2026-10-12T08:15:00'];
  eq('A-238 voo com notas "DG on board" continua voo', [!!mapFlight(ev('EZY1234 LIS-FNC 06:40-08:15', ...t, { notes: 'DG on board' }), codes), mapNonFlight(ev('EZY1234 LIS-FNC 06:40-08:15', ...t, { notes: 'DG on board' }), codes)], [true, null]);
  eq('A-238 voo com notas "GND time 00:45" continua voo', !!mapFlight(ev('EZY1234 LIS-FNC', ...t, { notes: 'GND time 00:45' }), codes), true);
  eq('A-238 "SEP 09:00-17:00" é formação', mapNonFlight(ev('SEP 09:00-17:00', '2026-10-12T09:00:00', '2026-10-12T17:00:00'), codes).kind, 'training');
  eq('A-238 "SEP 26" (mês) continua a não ser formação', classify('ROSTER SEP 26', codes) !== 'training', true);
  const f = mapFlight(ev('EZY7841 LIS-FNC', ...t, { notes: 'RP 05:40 06:40-08:15' }), codes);
  eq('A-238 "RP 05:40 06:40-08:15": saída às 06:40, apresentação às 05:40', [f.report, f.depTime, f.arrTime], ['05:40', '06:40', '08:15']);
  const u = mapFlight(ev('U2 LIS/FNC 0640 0815', ...t), codes);
  eq('A-238 o formato "0640 0815" continua a ler-se', [u.depTime, u.arrTime], ['06:40', '08:15']);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 4 · DH (posicionamento) no calendário — A-225 / A-226. ORO.FTL.215: antes de operar é PSV mas não setor; o tempo todo conta
// como serviço. 105(12): o PSV acaba no fim do último setor em que o tripulante desempenha funções. 105(13): só o voo operado
// é tempo de voo.
{
  // (ii) DH antes do voo, com a apresentação nas notas do DH: um só PSV das 05:40 às 10:50, com 1 setor.
  const dh = ev('DH EZY7002 LIS-FNC', '2026-10-12T06:40:00', '2026-10-12T08:20:00', { notes: 'RP 05:40' });
  const fl = ev('EZY7003 FNC-LIS', '2026-10-12T09:10:00', '2026-10-12T10:50:00');
  eq('DH com rota é uma perna (não um não-voo à parte)', [!!(mapFlight(dh, codes) || {}).dh, mapNonFlight(dh, codes)], [true, null]);
  const d = dutyFromActivity(acts([dh, fl])[0], 'LIS');
  eq('A-225(ii) DH antes: o serviço', [d.kind, d.report_time, d.sectors, d.flight_minutes, d.route, d.block_on, d.signOff, d.nightStop], ['flight', '05:40', 1, 100, 'LIS-FNC-LIS', '10:50', null, false]);
  const e = day([d], '2026-10-12');
  eq('A-225(ii) DH antes: PSV 05:10 (1 setor, 0530–0544 → 12:30), 210 = 5:40', [e.psv.result, e.psv.max, e.servicoMin, e.vooMin], ['05:10', '12:30', 340, 100]);
  // (i) DH depois do voo, de volta à base: o PSV acaba nos calços do voo (08:20); o serviço vai até ao fim do DH (10:50);
  // sem pernoita (dormiu na base).
  const d2 = dutyFromActivity(acts([ev('EZY7001 LIS-FNC', '2026-10-12T06:40:00', '2026-10-12T08:20:00', { notes: 'RP 05:40' }),
    ev('DH EZY7002 FNC-LIS', '2026-10-12T09:10:00', '2026-10-12T10:50:00')])[0], 'LIS');
  eq('A-225(i) DH depois: o serviço', [d2.sectors, d2.flight_minutes, d2.route, d2.block_on, d2.signOff, d2.nightStop], [1, 100, 'LIS-FNC-LIS', '08:20', '10:50', false]);
  const e2 = day([d2], '2026-10-12');
  eq('A-225(i) DH depois: PSV 02:40, 210 até ao fim do DH (5:10)', [e2.psv.result, e2.servicoMin, e2.vooMin], ['02:40', 310, 100]);
  // (iii) DH sozinho: posicionamento, não PSV; sem apresentação, o tempo do DH conta como serviço (estimado).
  const d3 = dutyFromActivity(acts([ev('DH EZY7002 LIS-FNC', '2026-10-12T18:00:00', '2026-10-12T19:40:00')])[0], 'LIS');
  eq('A-225(iii) DH sozinho: posicionamento', [d3.kind, d3.report_time, d3.block_off, d3.block_on, d3.sectors, d3.flight_minutes, d3.route], ['positioning', null, '18:00', '19:40', 0, 0, 'LIS-FNC']);
  const e3 = day([d3], '2026-10-12');
  eq('A-225(iii) DH sozinho: 1:40 de serviço, não é PSV', [e3.servicoMin, e3.vooMin, e3.psv.fdp], [100, 0, false]);
  const d4 = dutyFromActivity(acts([ev('DH EZY7002 LIS-FNC', '2026-10-12T18:00:00', '2026-10-12T19:40:00', { notes: 'RP 17:00' })])[0], 'LIS');
  eq('A-225(iii) DH sozinho com apresentação: 2:40 de serviço', day([d4], '2026-10-12').servicoMin, 160);
  // A-226: pernas que não encadeiam (LIS-OPO e depois FNC-LIS) → sem rota, a corrigir; com o DH OPO-FNC no meio → encadeiam.
  const gap = dutyFromActivity(acts([ev('EZY1 LIS-OPO', '2026-10-15T06:40:00', '2026-10-15T07:40:00', { notes: 'RP 05:40' }),
    ev('EZY2 FNC-LIS', '2026-10-15T11:00:00', '2026-10-15T12:40:00')])[0], 'LIS');
  eq('A-226 pernas que não encadeiam: sem rota', gap.route, null);
  eq('A-226 … e o candidato fica a corrigir', candidateKind({ kind: 'flight', duty: gap }).kind, 'fix');
  const chain = dutyFromActivity(acts([ev('EZY1 LIS-OPO', '2026-10-15T06:40:00', '2026-10-15T07:40:00', { notes: 'RP 05:40' }),
    ev('DH EZY9 OPO-FNC', '2026-10-15T08:30:00', '2026-10-15T10:10:00'), ev('EZY2 FNC-LIS', '2026-10-15T11:00:00', '2026-10-15T12:40:00')])[0], 'LIS');
  eq('A-226 com o DH no meio: encadeiam, 2 setores', [chain.route, chain.sectors, chain.flight_minutes], ['LIS-OPO-FNC-LIS', 2, 160]);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 5 · PDF — A-220, A-221, A-222, A-223, A-224, A-237, A-236.
{
  const P = (txt) => parseEasyjetRoster(txt, 'easyjet', { baseOf: () => 'LIS' });
  // A-224 / A-263: a linha "DH" é posicionamento: fora dos setores e do tempo de voo; depois do último setor não é PSV, mas é
  // serviço até ao fim (215(b)). Report 06:00, 3 setores → Quadro 2, 0600–1329, 3 setores = 12:30.
  const r1 = P(`10/04/2025 Thu EJU7001 [320] LIS - FNC 06:00 A07:00 - A08:40
EJU7002 [320] FNC - LIS A09:30 - A11:10
EJU7003 [320] LIS - OPO A12:00 - A12:55
DH EJU7004 [320] OPO - LIS A13:40 - A14:35`);
  const d1 = dutyFromActivity(r1.activities[0], 'LIS');
  eq('A-224 PDF com DH no fim: o serviço', [r1.activities.length, d1.report_time, d1.sectors, d1.flight_minutes, d1.block_on, d1.signOff, d1.route],
    [1, '06:00', 3, 255, '12:55', '14:35', 'LIS-FNC-LIS-OPO-LIS']);
  const e1 = day([d1], '2025-04-10');
  eq('A-224 PDF com DH no fim: PSV 06:55 de 12:30, 210 = 8:35', [e1.psv.result, e1.psv.max, e1.servicoMin, e1.vooMin], ['06:55', '12:30', 515, 255]);
  const r2 = P('11/04/2025 Fri DH EJU1234 [320] LIS - OPO 06:00 A07:00 - A08:00');
  const d2 = dutyFromActivity(r2.activities[0], 'LIS');
  eq('A-224 PDF só DH: posicionamento, 2 h de serviço, não é PSV', [d2.kind, d2.report_time, d2.block_on, d2.sectors, d2.flight_minutes, day([d2], '2025-04-11').servicoMin, day([d2], '2025-04-11').psv.fdp],
    ['positioning', '06:00', '08:00', 0, 0, 120, false]);

  // A-220: o não-voo lê o fim na própria linha; sem fim, fica a corrigir (nunca pronto e fora dos 210).
  const r3 = P('06/04/2025 Sun ADTY LIS - LIS 06:00 A06:00 - A09:30');
  eq('A-220 ADTY com horas na linha', r3.nonflights.map((n) => [n.kind, n.start, n.end]), [['standby_airport', '06:00', '09:30']]);
  eq('A-220 ADTY: 3:30 nos 210 (225(c))', day([dutyFromNonFlight(r3.nonflights[0])], '2025-04-06').servicoMin, 210);
  const r4 = P('08/04/2025 Tue OFC8 09:00');
  eq('A-220 escritório sem fim', r4.nonflights.map((n) => [n.kind, n.start, n.end]), [['office', '09:00', null]]);
  const c4 = buildImportCandidates({ nonflights: r4.nonflights, ...PIL });
  eq('A-220 … a corrigir (falta o fim)', [candidateKind(c4[0]).kind, candidateKind(c4[0]).reason], ['fix', 'end']);

  // A-221: dia com HSBY e voos — os voos não desaparecem. Sem a hora em que acabou o standby (= apresentação para o voo, CS
  // FTL.1.225(b)(5)) o dia fica a corrigir; com ela, o standby é o "standby antes" do voo: PSV desde a apresentação e 25 %.
  const r5 = P(`09/04/2025 Wed HSBY 05:00
EJU7003 [320] LIS - OPO A13:30 - A14:20
EJU7004 [320] OPO - LIS A15:00 - A15:50`);
  eq('A-221 HSBY + voos: os voos ficam', [r5.activities.length, r5.activities[0] && r5.activities[0].legs.length, r5.activities[0] && r5.activities[0].legs[0].report], [1, 2, null]);
  eq('A-221 HSBY sem fim', r5.nonflights.map((n) => [n.kind, n.start, n.end]), [['standby_home', '05:00', null]]);
  const c5 = buildImportCandidates({ activities: r5.activities, nonflights: r5.nonflights, ...PIL });
  eq('A-221 … um candidato do dia, a corrigir (o standby à frente, para se corrigir)', [c5.length, candidateKind(c5[0]).kind, c5[0].kind], [1, 'fix', 'standby_home']);
  const r6 = P(`09/04/2025 Wed HSBY 05:00 A05:00 - A12:30
EJU7003 [320] LIS - OPO A13:30 - A14:20
EJU7004 [320] OPO - LIS A15:00 - A15:50`);
  eq('A-221 HSBY com fim: o voo apresenta-se quando o standby acaba', [r6.nonflights.map((n) => [n.start, n.end]), r6.activities[0].legs[0].report], [[['05:00', '12:30']], '12:30']);
  const e6 = day([dutyFromActivity(r6.activities[0], 'LIS'), dutyFromNonFlight({ ...r6.nonflights[0] })].map((x, i) => (i === 1 ? { ...x, kind: 'standby_home' } : x)), '2025-04-09');
  eq('A-221 (A-234): PSV 3:20 desde a apresentação; 210 = 25 % de 7:30 + 3:50', [e6.psv.result, e6.servicoMin], ['03:20', 343]);

  // A-222: sem hora de apresentação antes da 1.ª perna, a apresentação fica por saber (nunca o Debrief nem o atraso).
  const r7 = P(`01/04/2025 Tue EJU7695 [320] LIS - SID A12:02 - A16:26 21:41 08:06 10:51
EJU7696 [320] SID - LIS A17:29 - A21:11/00:12`);
  eq('A-222 sem report na linha: por saber', r7.activities[0].legs[0].report, null);
  // Noturno partido em duas datas: a perna de dia 12 sai de OPO 45 min depois dos calços de dia 11 → o mesmo serviço; sem pernoita.
  const r8 = P(`11/05/2025 Sun EJU7001 [320] LIS - OPO 23:00 A23:50 - A00:55
12/05/2025 Mon EJU7002 [320] OPO - LIS A01:40 - A02:45 03:15 03:05 04:15`);
  const d8 = dutyFromActivity(r8.activities[0], 'LIS');
  eq('A-222 noturno em duas linhas: um só serviço, sem pernoita', [r8.activities.length, d8.duty_date, d8.report_time, d8.route, d8.block_on, d8.nightStop], [1, '2025-05-11', '23:00', 'LIS-OPO-LIS', '02:45', false]);

  // A-223: ADTY e voo no mesmo dia. Sem a duração do ADTY: o PSV conta desde a apresentação no aeroporto (225(d)), sem standby à
  // parte. Com as horas do ADTY na linha: o ADTY entra com elas e o PSV continua a contar desde as 04:00, sem contar a dobrar.
  const r9 = P(`02/04/2025 Wed ADTY LIS - LIS 04:00
EJU7003 [320] LIS - OPO A10:00 - A10:50
EJU7004 [320] OPO - LIS A11:30 - A12:20`);
  eq('A-223 ADTY sem horas + voo: PSV desde as 04:00', [r9.activities[0].legs[0].report, r9.nonflights.length], ['04:00', 0]);
  const r10 = P(`02/04/2025 Wed ADTY LIS - LIS 04:00 A04:00 - A09:30
EJU7003 [320] LIS - OPO A10:00 - A10:50
EJU7004 [320] OPO - LIS A11:30 - A12:20`);
  eq('A-223 ADTY com horas + voo', [r10.nonflights.map((n) => [n.kind, n.start, n.end]), r10.activities[0].legs[0].report], [[['standby_airport', '04:00', '09:30']], '09:30']);
  const e10 = day([dutyFromActivity(r10.activities[0], 'LIS'), { ...dutyFromNonFlight(r10.nonflights[0]), kind: 'standby_airport' }], '2025-04-02');
  eq('A-223 com horas: PSV 08:20 desde as 04:00, 210 = 8:50 (sem contar a dobrar)', [e10.psv.result, e10.servicoMin], ['08:20', 530]);

  // A-237: as horas casam com a rota da mesma linha; uma perna cancelada (CNX) não é setor.
  const r11 = P(`13/04/2025 Sun EJU7001 [320] LIS - FNC 06:00 A07:00 - A08:45
EJU7002 [320] FNC - LIS A09:30 - A11:10
EJU7003 [320] LIS - OPO CNX
EJU7004 [320] OPO - LIS CNX`);
  const d11 = dutyFromActivity(r11.activities[0], 'LIS');
  eq('A-237 cancelados fora: 2 setores até às 11:10', [d11.sectors, d11.route, d11.block_on], [2, 'LIS-FNC-LIS', '11:10']);
  const r12 = P(`13/04/2025 Sun
EJU7001 [320]
EJU7002 [320]
LIS - FNC
FNC - LIS
06:00
A07:00 - A08:45`);
  const c12 = buildImportCandidates({ activities: r12.activities, ...PIL });
  eq('A-237 rotas e horas que não batem (células soltas): a corrigir', [candidateKind(c12[0]).kind, candidateKind(c12[0]).reason], ['fix', 'times']);

  // A-236: férias e doença no PDF também são sugeridas.
  const r13 = P(`14/04/2025 Mon LVE Annual leave
15/04/2025 Tue LVE Annual leave
16/04/2025 Wed SICK Sick`);
  eq('A-236 PDF: férias e doença sugeridas', [r13.vacDates, r13.sickDates], [['2025-04-14', '2025-04-15'], ['2025-04-16']]);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 6 · A-229 · Eventos de vários dias. Férias e doença: cada dia do evento (com ou sem horas). A cabine só regista os dias de
// doença PAGOS — a Cl. 61.ª paga "após os 3 (três) dias de ausência iniciais"; os pilotos registam o episódio (Art. 48.º).
{
  eq('A-229 SICK de 3 a 7 com horas: 5 dias', sickDatesFromEvent(ev('SICK', '2026-04-03T00:00:00', '2026-04-07T23:59:00'), codes), ['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-04-07']);
  eq('A-229 LVE de 10 a 14 com horas: 5 dias', vacationDatesFromEvent(ev('LVE', '2026-04-10T00:00:00', '2026-04-14T23:59:00'), codes).length, 5);
  eq('A-229 SICK com horas num só dia: 1 dia', sickDatesFromEvent(ev('SICK', '2026-04-03T06:00:00', '2026-04-03T14:00:00'), codes), ['2026-04-03']);
  const sick = ['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-04-07'];
  // Bloco 5: a cabine também regista o episódio INTEIRO — o motor paga do 4.º dia (Cl. 61.ª) e tira a base de todos os dias
  // de baixa (Código do Trabalho, art. 255.º); registar só os pagos escondia a base que sai.
  eq('A-229 cabine: o episódio inteiro (o motor paga do 4.º dia)', paidSickDays(sick, { sickFirst3: false }), sick);
  eq('A-229 pilotos: o episódio inteiro (o motor paga os dias 1 a 3)', paidSickDays(sick, { sickFirst3: true }), sick);
  eq('A-229 cabine, dois episódios: todos os dias', paidSickDays(['2026-05-03', '2026-05-04', '2026-05-05', '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14'], { sickFirst3: false }).length, 8);
  // Formação de 2.ª 09:00 a 4.ª 17:00 num só evento: um serviço por dia; as horas de cada dia não estão no evento → a corrigir.
  const tr = mapNonFlightDays(ev('SEP TRAINING LGW', '2026-04-20T09:00:00', '2026-04-22T17:00:00'), codes);
  eq('A-229 formação de 3 dias: 3 serviços', tr.map((x) => [x.dateISO, x.start, x.end, !!x.multiDay]), [['2026-04-20', '09:00', null, true], ['2026-04-21', null, null, true], ['2026-04-22', null, '17:00', true]]);
  const sb = mapNonFlightDays(ev('HSBY', '2026-04-20T20:00:00', '2026-04-21T04:00:00'), codes);
  eq('A-229 standby que passa a meia-noite (8 h): um só serviço', sb.map((x) => [x.dateISO, x.start, x.end]), [['2026-04-20', '20:00', '04:00']]);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 7 · Reimportar (M12) — A-230, A-231, A-232, A-233.
{
  const snapOf = (d) => ({ report_time: d.report_time, block_off: d.block_off, block_on: d.block_on, route: d.route, sectors: d.sectors, kind: d.kind });
  // A-231: a escala muda as horas → o sign-off antigo deixa de valer (ORO.FTL.105(11): o serviço acaba quando é libertado).
  const stored = { report_time: '05:40', block_off: '06:40', block_on: '10:35', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', source: 'calendar', signOff: '11:05' };
  stored.snap = snapOf(stored);
  const cand = { kind: 'flight', duty: { duty_date: '2026-10-12', report_time: '05:40', block_off: '06:40', block_on: '12:05', route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 190 } };
  eq('A-231 horas mudadas: o sign-off antigo sai', importSaveFields(cand, 'calendar', stored).signOff, null);
  const same = { kind: 'flight', duty: { ...cand.duty, block_on: '10:35', route: 'LIS-FNC-LIS' } };
  eq('A-231 horas iguais: o sign-off do tripulante fica', 'signOff' in importSaveFields(same, 'calendar', stored), false);
  eq('A-231 o fim do DH lido da escala vai como sign-off', importSaveFields({ kind: 'flight', duty: { ...cand.duty, signOff: '13:00' } }, 'calendar', stored).signOff, '13:00');
  // A-230: e-learning e OFC vão sempre (sem a chave, o valor antigo ficava); e o 3-vias vê a mudança só do código.
  const sim = mapNonFlight(ev('SIM LPC', '2026-10-13T06:00:00', '2026-10-13T12:00:00'), codes);
  const f230 = importSaveFields({ kind: 'training', duty: dutyFromNonFlight(sim) }, 'calendar', { kind: 'training', eLearning: true, report_time: '09:00', block_on: '12:00' });
  eq('A-230 CBT → SIM: e-learning desliga', [('eLearning' in f230), f230.eLearning], [true, false]);
  const ofc = mapNonFlight(ev('OFC LIS', '2026-10-14T09:00:00', '2026-10-14T13:00:00'), codes);
  const f230b = importSaveFields({ kind: 'office', duty: dutyFromNonFlight(ofc) }, 'calendar', { kind: 'office', officeType: 'ofc8' });
  eq('A-230 OFC8 → OFC: o OFC8 sai', [('officeType' in f230b), f230b.officeType], [true, null]);
  const sOfc8 = { kind: 'office', report_time: '09:00', block_on: '13:00', officeType: 'ofc8', snap: { kind: 'office', report_time: '09:00', block_on: '13:00', officeType: 'ofc8' } };
  eq('A-230 3-vias: OFC8 → OFC com as mesmas horas é uma mudança', classify3(sOfc8, { kind: 'office', report_time: '09:00', block_on: '13:00', officeType: null }).status, 'changed');
  const legacy = { kind: 'office', report_time: '09:00', block_on: '13:00', officeType: 'ofc8', snap: { kind: 'office', report_time: '09:00', block_on: '13:00' } };
  eq('A-230 3-vias: um registo antigo (snap sem OFC) igual ao calendário não é mudança', classify3(legacy, { kind: 'office', report_time: '09:00', block_on: '13:00', officeType: 'ofc8' }).status, 'same');
  const cbt = { kind: 'training', report_time: '09:00', block_on: '12:00', eLearning: true, snap: { kind: 'training', report_time: '09:00', block_on: '12:00' } };
  eq('A-230 3-vias: CBT → SEP com as mesmas horas é uma mudança', classify3(cbt, { kind: 'training', report_time: '09:00', block_on: '12:00', eLearning: false }).status, 'changed');
  // A-232: um 2.º serviço posto à mão que o calendário passa a trazer não fica duas vezes.
  const am = { report_time: '06:00', block_off: '06:45', block_on: '10:30', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight' };
  const pm = { report_time: '14:00', block_off: '14:45', block_on: '18:00', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight' };
  const storedDay = { ...am, source: 'calendar', snap: snapOf(am), extra: [{ ...pm, source: 'manual' }] };
  const f232 = importSaveFields({ kind: 'flight', duty: { ...am, duty_date: '2026-10-16', extra: [{ ...pm }] } }, 'calendar', storedDay);
  eq('A-232 o manual igual ao lido não fica a dobrar', f232.extra.map((x) => [x.report_time, x.source]), [['14:00', 'calendar']]);
  // A-233: o papel (upranker), a folga trabalhada e os casos especiais de um serviço extra ficam ao reimportar.
  const storedDay2 = { ...am, source: 'calendar', snap: { ...snapOf(am), extra: [snapOf(pm)] }, extra: [{ ...pm, source: 'calendar', role: 'uprank', dayOffWorked: 'ddo' }] };
  const f233 = importSaveFields({ kind: 'flight', duty: { ...am, block_on: '10:50', duty_date: '2026-10-16', extra: [{ ...pm }] } }, 'calendar', storedDay2);
  eq('A-233 o extra guarda o papel e a folga trabalhada', f233.extra.map((x) => [x.role, x.dayOffWorked]), [['uprank', 'ddo']]);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 8 · A cada candidato a mesma verificação da Simulação (A-254): com os outros candidatos da mesma leitura e o pós-voo do perfil.
{
  // 7 dias seguidos de 4 setores (06:00 → 16:10 + 30 min = 10:40 de serviço/dia, 6:40 de voo): ao 6.º dia 64:00 em 7 dias
  // (ORO.FTL.210(a)(1): 60 h); ao 16.º, 106:40 de voo em 28 dias (210(b)(1): 100 h). Na 1.ª leitura não há nada guardado.
  const leg = (date, dep, arr, off, on, rep = null) => ({ dateISO: date, depAirport: dep, arrAirport: arr, depTime: off, arrTime: on, report: rep, flightNo: 'EZY1', startDate: new Date(`${date}T${off}:00`), endDate: new Date(`${date}T${on}:00`) });
  const activities = [];
  for (let i = 1; i <= 16; i++) {
    const dt = `2026-10-${String(i).padStart(2, '0')}`;
    activities.push({ dateISO: dt, sectors: 4, legs: [leg(dt, 'LIS', 'FNC', '07:00', '08:40', '06:00'), leg(dt, 'FNC', 'LIS', '09:30', '11:10'), leg(dt, 'LIS', 'FNC', '12:00', '13:40'), leg(dt, 'FNC', 'LIS', '14:30', '16:10')] });
  }
  const t0 = Date.now();
  const cs = buildImportCandidates({ activities, ...PIL });
  const ms = Date.now() - t0;
  const byDate = (d) => cs.find((c) => c.duty.duty_date === d);
  const lim = (c, key, id) => c.prospect.issues.some((i) => i.type === 'limit' && i.key === key && i.id === id);
  eq('A-254 o pós-voo do perfil entra (10:40/dia)', byDate('2026-10-01').prospect.day.servicoMin, 640);
  eq('A-254 6.º dia: 64:00 em 7 dias → aviso', [byDate('2026-10-06').status, lim(byDate('2026-10-06'), 'servico', '7d')], ['warn', true]);
  eq('A-254 16.º dia: 106:40 de voo em 28 dias → aviso', lim(byDate('2026-10-16'), 'voo', '28d'), true);
  eq('A-254 o 1.º dia também passa a mostrar o período de 7 dias que ele integra', lim(byDate('2026-10-01'), 'servico', '7d'), true);
  if (ms > 8000) { fail++; console.log(`✗ A-254 16 candidatos demoram ${ms} ms`); } else ok++;

  // Sem apresentação: o PSV fica incerto (falta a hora de apresentação); o voo conta na mesma.
  const nr = buildImportCandidates({ activities: [{ dateISO: '2026-10-20', sectors: 2, legs: [leg('2026-10-20', 'LIS', 'OPO', '07:00', '08:00'), leg('2026-10-20', 'OPO', 'LIS', '08:40', '09:40')] }], ...PIL });
  eq('sem apresentação: incerto, com o que falta', [nr[0].prospect.verdict, nr[0].prospect.issues.some((i) => i.type === 'noReport')], ['unc', true]);

  // A-234 pela importação do calendário: HSBY 05:00–11:00 e voo com RP 11:00 até às 20:30 → PSV 09:30 (o standby acaba na
  // apresentação, CS FTL.1.225(b)(5)); 210 = 25 % de 6 h + 10:00 = 11:30; máximo 13:00 (0600–1329, 2 setores; das 05:00 às
  // 07:00 não conta para a redução e as 4 h restantes não passam das 6 h).
  const hs = mapNonFlightDays(ev('HSBY', '2026-10-21T05:00:00', '2026-10-21T11:00:00'), codes);
  const fa = buildDuties([mapFlight(ev('EZY8001 LIS-TFS', '2026-10-21T11:45:00', '2026-10-21T15:30:00', { notes: 'RP 11:00' }), codes),
    mapFlight(ev('EZY8002 TFS-LIS', '2026-10-21T16:30:00', '2026-10-21T20:30:00'), codes)], { baseOf: () => 'LIS' });
  const hc = buildImportCandidates({ activities: fa, nonflights: hs, ...PIL });
  // (2026-11-12, "tem que ser como diz a lei".) A assistência acaba na escala à hora da apresentação: a app não sabe se o voo
  // foi atribuído durante ela (sem repouso entre os dois, CS FTL.1.225(b)(5)) ou se já estava na escala (repouso curto) →
  // o PSV e o 210 ficam iguais, o veredicto passa a incerto, com o repouso antes do voo como motivo (antes: "ok").
  eq('A-234 HSBY + voo importados: PSV 09:30 de 13:00, 210 = 11:30; chamada ou repouso curto → incerto', [hc.length, hc[0].prospect.psv && hc[0].prospect.psv.result, hc[0].prospect.psv && hc[0].prospect.psv.max, hc[0].prospect.day.servicoMin, hc[0].prospect.verdict, hc[0].prospect.issues.filter((i) => i.type === 'restBefore').map((i) => i.kind)],
    [1, '09:30', '13:00', 690, 'unc', ['standbyCall']]);

  // Períodos do 210 com serviços sem apresentação: o serviço é um mínimo (de calços a calços + pós-voo). Excede só quando o
  // mínimo passa o limite; quando só o possível passa (a apresentação no próprio dia), incerto.
  const est = {};
  for (let i = 1; i <= 5; i++) est[`2026-11-0${i}`] = { block_off: '06:00', block_on: '16:00', sectors: 4, flight_minutes: 400, route: 'LIS-FNC-LIS-FNC-LIS', kind: 'flight', report_time: null };
  const simDay = { duty_date: '2026-11-06', report_time: '05:00', block_off: '06:00', block_on: '16:00', sectors: 4, flight_minutes: 400, route: 'LIS-FNC-LIS-FNC-LIS', kind: 'flight' };
  const over = simulateDuty(simDay, { duties: est, ...PIL });
  eq('210 com estimados: 5 × 10:30 + 11:30 = 64:00 ≥ 60 h → excede (o mínimo já passa)', over.issues.some((i) => i.type === 'limit' && i.key === 'servico' && i.id === '7d'), true);
  const est4 = { ...est }; delete est4['2026-11-01']; delete est4['2026-11-02'];
  const unc = simulateDuty(simDay, { duties: est4, ...PIL });
  eq('210 com estimados: 3 × 10:30 + 11:30 = 43:00, até 61:00 se a apresentação fosse à meia-noite → incerto',
    [unc.issues.some((i) => i.type === 'limitUnc' && i.key === 'servico' && i.id === '7d'), unc.verdict], [true, 'unc']);
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 9 · Revisão independente do bloco 4 (E2, E4–E7).
{
  const cabin = require(path.resolve('ae/easyjetSnpvac.js'));
  const { monthlyAe } = require(path.resolve('data/perdiem.js'));
  const { diffRoster } = require(path.resolve('data/rosterDiff.js'));
  // E2: o per-diem é "em serviço de voo (setor)" (SNPVAC Cl. 52.ª, n.º 1) — o DH não é setor. Voo LIS-FNC + DH FNC-LIS:
  // 1 setor médio (FA 1,2 × 21,00 = 25,20 €), não dois. (O pagamento do posicionamento, Cl. 57.ª / Anexo I.18, é o bloco 6.)
  const dDh = dutyFromActivity(acts([ev('EZY7001 LIS-FNC', '2026-11-12T06:40:00', '2026-11-12T08:20:00', { notes: 'RP 05:40' }),
    ev('DH EZY7002 FNC-LIS', '2026-11-12T09:10:00', '2026-11-12T10:50:00')])[0], 'LIS');
  eq('E2: o DH não entra no per-diem da cabine', monthlyAe({ '2026-11-12': dDh }, 'FA', '12/12', cabin, { ym: '2026-11' }).perDiem, 25.2);
  // E4: um prolongamento PLANEADO (ORO.FTL.205(d)) — a leitura É a escala publicada: 07:00 → 20:30 com 2 setores, máximo 13:00
  // prolongado para 14:00. Não é "excede".
  const ext = buildImportCandidates({ activities: acts([ev('EZY1 LIS-TFS', '2026-10-20T08:00:00', '2026-10-20T12:30:00', { notes: 'RP 07:00' }),
    ev('EZY2 TFS-LIS', '2026-10-20T13:30:00', '2026-10-20T20:30:00')]), ...PIL });
  eq('E4: prolongamento planeado na leitura → dentro', [ext[0].status, ext[0].prospect.psv.extended, ext[0].prospect.verdict], ['ok', true, 'ok']);
  // E5: o aviso que o serviço novo cria num dia que a leitura não traz (ou traz igual) passa para o serviço novo. Guardados: 20/2
  // e de 1 a 9/3 sem o dia 3 (a folga de 2 a 4 é a recuperação). A leitura traz o dia 3: deixa de haver recuperação entre 1/3
  // e 9/3 → mais de 168 h (ORO.FTL.235(d)).
  const W = () => ({ report_time: '06:00', block_off: '07:00', block_on: '13:00', sectors: 2, flight_minutes: 300, route: 'LIS-FNC-LIS', kind: 'flight', source: 'calendar' });
  const stored5 = { '2026-02-20': W() };
  for (const k of [1, 2, 4, 5, 6, 7, 8, 9]) stored5[`2026-03-0${k}`] = W();
  const leg5 = (date, dep, arr, off, on, rep = null) => ({ dateISO: date, depAirport: dep, arrAirport: arr, depTime: off, arrTime: on, report: rep, flightNo: 'EZY1', startDate: new Date(`${date}T${off}:00`), endDate: new Date(`${date}T${on}:00`) });
  const c5 = buildImportCandidates({ activities: [{ dateISO: '2026-03-03', sectors: 2, legs: [leg5('2026-03-03', 'LIS', 'FNC', '07:00', '09:30', '06:00'), leg5('2026-03-03', 'FNC', 'LIS', '10:30', '13:00')] }], duties: stored5, ...PIL });
  eq('E5: o aviso de recuperação noutro dia passa para o serviço novo', [c5[0].prospect.issues.some((i) => i.type === 'recovery' && i.kind === 'recovery168'), c5[0].status], [true, 'warn']);
  // E6: o fim do DH lido da escala é DA ESCALA: se o DH sai da escala (as horas voadas iguais), o sign-off dele sai também.
  const c6a = { kind: 'flight', duty: { duty_date: '2026-10-22', report_time: '06:00', block_off: '07:00', block_on: '08:00', route: 'LIS-OPO-LIS', sectors: 1, flight_minutes: 60, signOff: '10:00' } };
  const stored6 = { ...importSaveFields(c6a, 'calendar', null), duty_date: '2026-10-22' };
  const c6b = { kind: 'flight', duty: { duty_date: '2026-10-22', report_time: '06:00', block_off: '07:00', block_on: '08:00', route: 'LIS-OPO', sectors: 1, flight_minutes: 60 } };
  eq('E6: o DH saiu da escala → o sign-off dele sai', importSaveFields(c6b, 'calendar', stored6).signOff, null);
  const stored6u = { ...stored6, signOff: '08:45' };   // o tripulante escreveu o seu sign-off real
  eq('E6: o sign-off do tripulante, com as mesmas horas, fica', 'signOff' in importSaveFields(c6b, 'calendar', stored6u), false);
  // E7: dados gravados pela versão anterior (snap sem versão): um repartido gravado em 2 serviços que a leitura nova junta num só
  // NÃO é uma alteração da escala (as horas dos voos são as mesmas) — "refresh": aplica-se, mas não conta como mudança nem vai
  // para o arquivo do SNC/RDP (SNPVAC Cl. 66.ª: o SNC é "uma alteração de escala"). Com horas diferentes, é uma mudança.
  const L = (dep, arr, off, on) => ({ flightNo: 'EZY1', dep, arr, off, on });
  const s1 = { report_time: '05:40', block_off: '06:40', block_on: '08:15', route: 'LIS-FNC', sectors: 1, kind: 'flight', legs: [L('LIS', 'FNC', '06:40', '08:15')] };
  const s2 = { report_time: null, block_off: '15:00', block_on: '16:40', route: 'FNC-LIS', sectors: 1, kind: 'flight', legs: [L('FNC', 'LIS', '15:00', '16:40')] };
  const oldDay = { ...s1, source: 'calendar', snap: { report_time: '05:40', block_off: '06:40', block_on: '08:15', route: 'LIS-FNC', sectors: 1, kind: 'flight', extra: [{ ...s2 }] }, extra: [{ ...s2, source: 'calendar' }] };
  const newDay = { report_time: '05:40', block_off: '06:40', block_on: '16:40', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', legs: [L('LIS', 'FNC', '06:40', '08:15'), L('FNC', 'LIS', '15:00', '16:40')] };
  eq('E7: snap antigo com os mesmos voos → refresh (não é mudança)', classify3(oldDay, newDay).status, 'refresh');
  eq('E7: … e a deteção automática não o conta', diffRoster({ incoming: [{ ...newDay, duty_date: '2026-10-23' }], duties: { '2026-10-23': oldDay } }).counts.total, 0);
  const moved = { ...newDay, block_on: '17:10', legs: [L('LIS', 'FNC', '06:40', '08:15'), L('FNC', 'LIS', '15:30', '17:10')] };
  eq('E7: snap antigo com horas de voo diferentes → mudança', classify3(oldDay, moved).status, 'changed');
  eq('E7: o snap novo leva a versão da leitura', importSaveFields({ kind: 'flight', duty: { ...newDay, duty_date: '2026-10-23' } }, 'calendar', null).snap.v >= 2, true);
  // R1 (PDF): um fim de standby depois da 1.ª saída não é a apresentação do voo (é o fim planeado) → por saber.
  const r1 = parseEasyjetRoster(`09/04/2025 Wed HSBY 05:00 A05:00 - A17:00
EJU7003 [320] LIS - OPO A12:00 - A12:50
EJU7004 [320] OPO - LIS A13:30 - A14:20`, 'easyjet');
  eq('R1: fim do standby depois da saída → apresentação por saber, as pernas no próprio dia', [r1.activities[0].legs[0].report, r1.activities[0].dateISO, r1.activities[0].legs.length], [null, '2025-04-09', 2]);
  // R2 (PDF): uma perna cancelada que parte o encadeamento → a corrigir (não dois serviços, com pernoita e repouso inventados).
  const r2 = parseEasyjetRoster(`14/04/2025 Mon EJU8001 [320] LIS - LGW 06:00 A07:00 - A09:30
EJU8002 [320] LGW - LIS CNX
EJU8003 [320] LIS - OPO A20:00 - A21:00
EJU8004 [320] OPO - LIS A21:40 - A22:40`, 'easyjet');
  const c2 = buildImportCandidates({ activities: r2.activities, ...PIL });
  eq('R2: cancelada que parte o dia → um candidato, a corrigir', [c2.length, candidateKind(c2[0]).kind], [1, 'fix']);
}

// ───────────────────────────────────────────────────────────────────────────────
// IMPORTAÇÃO E FORMULÁRIO (2026-11-11)
{
  const { verifyCandidates } = require(path.resolve('data/rosterImport.js'));
  // O sítio entre dias: dia 10 acaba em LGW (pernoita), dia 11 parte de LIS sem posicionamento → o dia 11 fica "incerto".
  const g = [ev('EZY1 LIS-LGW', '2026-10-10T08:30:00', '2026-10-10T11:00:00', { notes: 'RP 07:30' }),
    ev('EZY2 LIS-FNC', '2026-10-11T13:00:00', '2026-10-11T14:45:00', { notes: 'RP 12:00' }), ev('EZY3 FNC-LIS', '2026-10-11T15:30:00', '2026-10-11T17:10:00')];
  const cg = buildImportCandidates({ activities: acts(g), ...PIL });
  const d10 = cg.find((c) => c.duty.duty_date === '2026-10-10'), d11 = cg.find((c) => c.duty.duty_date === '2026-10-11');
  const gap = d11.prospect.issues.find((i) => i.type === 'placeGap');
  eq('sítio entre dias: o dia 11 avisa (incerto), o dia 10 não', [d11.prospect.verdict, gap && gap.from, gap && gap.dep, d10.prospect.issues.some((i) => i.type === 'placeGap'), d11.status], ['unc', 'LGW', 'LIS', false, 'ok']);

  // Revisão independente (E4): o dia SEGUINTE já está guardado e é lido igual (não se aplica) — o aviso vai para o dia novo.
  const st11 = { report_time: '12:00', block_off: '13:00', block_on: '17:10', sectors: 2, flight_minutes: 205, route: 'LIS-FNC-LIS', kind: 'flight', source: 'calendar',
    legs: d11.duty.legs, snap: { report_time: '12:00', block_off: '13:00', block_on: '17:10', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', officeType: null, eLearning: false, signOff: null, v: 2 } };
  const cg2 = buildImportCandidates({ activities: acts(g), duties: { '2026-10-11': st11 }, ...PIL });
  const n10 = cg2.find((c) => c.duty.duty_date === '2026-10-10'), n11 = cg2.find((c) => c.duty.duty_date === '2026-10-11');
  const fwd = n10.prospect.issues.find((i) => i.type === 'placeGap');
  eq('E4 sítio: o dia seguinte guardado e igual → o aviso fica no dia novo', [n11.status, n10.prospect.verdict, fwd && fwd.next, fwd && fwd.arr, fwd && fwd.dep, fwd && fwd.nextIso], ['same', 'unc', true, 'LGW', 'LIS', '2026-10-11']);

  // R8: um candidato corrigido na folha volta a ser verificado COM os outros. Dia 10 sem horas das pernas ("a corrigir") e dia 11
  // cedo: enquanto o dia 10 está de fora, o dia 11 não tem aviso; corrigido o dia 10 (acaba às 23:30), o repouso do dia 11 é curto.
  const day11 = [ev('EZY5 LIS-FNC', '2026-10-11T07:00:00', '2026-10-11T08:45:00', { notes: 'RP 06:00' }), ev('EZY6 FNC-LIS', '2026-10-11T09:30:00', '2026-10-11T11:10:00')];
  const c8 = buildImportCandidates({ activities: acts(day11), ...PIL });
  const fix10 = { duty: { duty_date: '2026-10-10', kind: 'flight', report_time: '15:00', block_off: '16:00', block_on: '23:30', sectors: 2, flight_minutes: 300, route: 'LIS-FNC-LIS',
    legs: [{ dep: 'LIS', arr: 'FNC', off: '16:00', on: '17:45' }, { dep: 'FNC', arr: 'LIS', off: '21:50', on: '23:30' }] }, kind: 'flight', status: 'ok', exists: false, diff: [], prospect: null, selected: true, action: 'save' };
  eq('R8: antes da correção o dia 11 está bem', c8[0].prospect.verdict, 'ok');
  const again = verifyCandidates([fix10, ...c8.map((c) => ({ ...c }))], { duties: {}, dayLog: {}, ...PIL });
  const a11 = again.find((c) => c.duty.duty_date === '2026-10-11'), a10 = again.find((c) => c.duty.duty_date === '2026-10-10');
  eq('R8: depois da correção, o repouso curto do dia 11 aparece', [a11.status, a11.prospect.issues.some((i) => i.type === 'restBefore'), !!a10.prospect], ['warn', true, true]);
  // Depois da correção a lista volta à ordem da 1.ª leitura (os avisos antes dos "ok"): um aviso novo não fica escondido a meio.
  {
    const { sortCandidates } = require(path.resolve('data/rosterImport.js'));
    const mk = (date, status) => ({ duty: { duty_date: date }, status });
    eq('depois da correção: os avisos sobem', sortCandidates([mk('2026-10-09', 'ok'), mk('2026-10-12', 'ok'), mk('2026-10-11', 'warn'), mk('2026-10-10', 'warn'), mk('2026-10-13', 'removed')]).map((c) => [c.duty.duty_date.slice(8), c.status]),
      [['13', 'removed'], ['10', 'warn'], ['11', 'warn'], ['09', 'ok'], ['12', 'ok']]);
    // (na correção de cima, o dia 10 corrigido e o dia 11 ficam os dois com aviso: o repouso curto é dos dois lados)
    eq('… os dois dias do repouso curto ficam com aviso', again.map((c) => c.status).sort(), ['warn', 'warn']);
  }
  // … e o aviso sai quando a correção o resolve (o estado volta a "ok").
  const fixed = verifyCandidates([{ ...fix10, duty: { ...fix10.duty, block_on: '17:45', sectors: 1, route: 'LIS-FNC', legs: [fix10.duty.legs[0]] } }, ...again.filter((c) => c.duty.duty_date === '2026-10-11').map((c) => ({ ...c }))], { duties: {}, dayLog: {}, ...PIL });
  eq('R8: um aviso que deixou de valer sai', fixed.find((c) => c.duty.duty_date === '2026-10-11').prospect.issues.some((i) => i.type === 'restBefore'), false);

  // R10: o serviço PRINCIPAL do dia muda (entra um voo mais cedo): o papel fica no serviço em que foi registado, não no novo
  // principal. Guardado: voo das 12:00 como instrutor. Leitura: um voo novo às 06:00 (principal) + o das 12:00 (extra).
  const stored = { report_time: '12:00', block_off: '13:00', block_on: '15:00', sectors: 1, flight_minutes: 120, route: 'LIS-FNC', kind: 'flight', source: 'calendar', role: 'instr', dayOffWorked: 'ddo', special: { discretion: true } };
  const read = { duty: { duty_date: '2026-10-20', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO',
    extra: [{ report_time: '12:00', block_off: '13:00', block_on: '15:00', sectors: 1, flight_minutes: 120, route: 'LIS-FNC', kind: 'flight' }] }, kind: 'flight' };
  const f10 = importSaveFields(read, 'calendar', stored);
  eq('R10: o papel e o caso especial vão para o serviço em que foram registados (agora extra)', [f10.extra[0].role, f10.extra[0].special, f10.role, f10.special], ['instr', { discretion: true }, null, null]);
  eq('R10: a folga trabalhada segue o serviço em que foi registada', [f10.dayOffWorked, f10.extra[0].dayOffWorked], [null, 'ddo']);
  // O contrário: o principal guardado sai da leitura e o extra guardado passa a principal → leva o papel dele.
  const stored2 = { report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', kind: 'flight', source: 'calendar', role: 'uprank',
    extra: [{ report_time: '12:00', block_off: '13:00', block_on: '15:00', sectors: 1, flight_minutes: 120, route: 'LIS-FNC', kind: 'flight', source: 'calendar', role: 'instr' }] };
  const read2 = { duty: { duty_date: '2026-10-20', kind: 'flight', report_time: '12:00', block_off: '13:00', block_on: '15:00', sectors: 1, flight_minutes: 120, route: 'LIS-FNC' }, kind: 'flight' };
  eq('R10: o extra guardado que passa a principal leva o seu papel', importSaveFields(read2, 'calendar', stored2).role, 'instr');
  // Sem mudança de lugar (o mesmo principal): nada se escreve — o saveDuty mantém o que está guardado.
  const same = importSaveFields({ duty: { duty_date: '2026-10-20', kind: 'flight', report_time: '12:00', block_off: '13:00', block_on: '15:10', sectors: 1, flight_minutes: 130, route: 'LIS-FNC' }, kind: 'flight' }, 'calendar', stored);
  eq('R10: o mesmo principal → o papel não se toca', 'role' in same, false);
  // R11: um extra cuja apresentação mudou (o único da leitura e o único guardado, do mesmo tipo) continua a ser o mesmo serviço.
  const stored3 = { report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', kind: 'flight', source: 'calendar',
    extra: [{ report_time: '12:00', block_off: '13:00', block_on: '15:00', sectors: 1, flight_minutes: 120, route: 'LIS-FNC', kind: 'flight', source: 'calendar', role: 'instr', accommodation: 'suitable' }] };
  const read3 = { duty: { duty_date: '2026-10-20', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO',
    extra: [{ report_time: '12:30', block_off: '13:30', block_on: '15:30', sectors: 1, flight_minutes: 120, route: 'LIS-FNC', kind: 'flight' }] }, kind: 'flight' };
  const f11 = importSaveFields(read3, 'calendar', stored3);
  eq('R11: o extra com a apresentação mudada mantém o papel e o alojamento', [f11.extra[0].role, f11.extra[0].accommodation, f11.extra.length], ['instr', 'suitable', 1]);
  // Revisão independente (E2): o principal lido SEM par não apaga o que estava guardado no principal (antes do casamento o
  // saveDuty mantinha tudo). Caso A: o voo das 06:00 passa para as 06:30 e a leitura traz um posicionamento novo às 15:00.
  const stA = { report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', kind: 'flight', source: 'calendar', role: 'instr', dayOffWorked: 'ddo', special: { discretion: true }, accommodation: true };
  const rdA = { duty: { duty_date: '2026-10-22', kind: 'flight', report_time: '06:30', block_off: '07:30', block_on: '09:30', sectors: 1, flight_minutes: 120, route: 'LIS-OPO',
    extra: [{ kind: 'positioning', report_time: '15:00', block_on: '16:00', sectors: 0, flight_minutes: 0, route: 'OPO-LIS' }] }, kind: 'flight' };
  const fA = importSaveFields(rdA, 'calendar', stA);
  eq('E2-A: o único voo lido é o voo guardado (o posicionamento é outro tipo) → nada se apaga', ['role' in fA, 'dayOffWorked' in fA, 'special' in fA, 'accommodation' in fA, fA.extra[0].role || null], [false, false, false, false, null]);
  // Caso B: a assistência no aeroporto com DDO foi convertida num voo (outro tipo): o principal substitui o principal.
  const fB = importSaveFields({ duty: { duty_date: '2026-10-22', kind: 'flight', report_time: '08:00', block_off: '09:00', block_on: '11:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO' }, kind: 'flight' }, 'calendar',
    { report_time: '06:00', block_on: '12:00', sectors: 0, flight_minutes: 0, route: null, kind: 'standby_airport', source: 'calendar', dayOffWorked: 'ddo' });
  eq('E2-B: assistência convertida em voo → a folga trabalhada fica (não se escreve)', 'dayOffWorked' in fB, false);
  // A folga trabalhada é do DIA (paga-se por dia): se o serviço em que estava saiu da escala, fica no principal.
  const stC = { report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', kind: 'flight', source: 'calendar',
    extra: [{ kind: 'office', report_time: '14:00', block_on: '16:00', sectors: 0, flight_minutes: 0, route: null, source: 'calendar', dayOffWorked: 'ddo' }] };
  const fC = importSaveFields({ duty: { duty_date: '2026-10-22', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO' }, kind: 'flight' }, 'calendar', stC);
  eq('E2-C: o extra com a folga trabalhada saiu da escala → a folga fica no dia', [fC.dayOffWorked, fC.extra], ['ddo', null]);
  // O que se escreve na CORREÇÃO da importação (papel, folga trabalhada, casos especiais, alojamento) grava-se no principal.
  const corr = { duty: { duty_date: '2026-10-23', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', role: 'instr', dayOffWorked: 'wfly', special: { discretion: true }, accommodation: 'basic' }, kind: 'flight' };
  const fK = importSaveFields(corr, 'calendar', null);
  eq('correção na importação: o que se escreveu grava-se', [fK.role, fK.dayOffWorked, fK.special, fK.accommodation], ['instr', 'wfly', { discretion: true }, 'basic']);
  const fK2 = importSaveFields(corr, 'calendar', { report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', kind: 'flight', source: 'calendar', role: 'uprank' });
  eq('… e ganha ao que estava guardado', fK2.role, 'instr');
  const plain = importSaveFields({ duty: { duty_date: '2026-10-23', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO', special: null }, kind: 'flight' }, 'calendar', null);
  eq('… sem nada escrito, nada se escreve (o guardado fica)', ['role' in plain, 'dayOffWorked' in plain, 'special' in plain, 'accommodation' in plain], [false, false, false, false]);
  // O QUE ESTÁ GUARDADO acompanha o candidato (2026-11-11): a verificação da folha usa os casos especiais e o alojamento que o
  // tripulante já registou no serviço — um repartido de 9 h 30 com alojamento adequado guardado é "dentro", não "incerto".
  // (2026-11-11, noite 8: o exemplo tinha 11 h 30 em terra no Porto. Fora da base, 10 h ou mais já não é um "intervalo" —
  // ORO.FTL.105(6): inferior a um período de repouso, que longe da base é de 10 h, 235(b). Passou a 9 h 30: 08:00 → 17:30.)
  {
    const { storedFacts } = require(path.resolve('data/rosterImport.js'));
    const lg = [{ dep: 'LIS', arr: 'OPO', off: '07:00', on: '08:00' }, { dep: 'OPO', arr: 'LIS', off: '17:30', on: '20:30' }];
    const mkC = (extra = {}) => ({ duty: { duty_date: '2026-10-20', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '20:30', sectors: 2, flight_minutes: 130, route: 'LIS-OPO-LIS', legs: lg, ...extra }, kind: 'flight', status: 'changed', exists: true, diff: [], prospect: null, selected: false, action: 'save' });
    const stS = { report_time: '06:00', block_off: '07:00', block_on: '20:20', sectors: 2, flight_minutes: 120, route: 'LIS-OPO-LIS', kind: 'flight', source: 'calendar', accommodation: true, role: 'instr', dayOffWorked: 'ddo', special: { discretion: true },
      legs: [lg[0], { ...lg[1], on: '20:20' }] };
    const vr = (c, duties) => verifyCandidates([c], { duties, dayLog: {}, ...PIL })[0].prospect;
    eq('guardado: sem alojamento em lado nenhum → incerto', vr(mkC(), {}).issues.some((i) => i.type === 'fdpUncertain'), true);
    eq('guardado: o alojamento guardado entra na verificação', vr(mkC(), { '2026-10-20': stS }).issues.some((i) => i.type === 'fdpUncertain'), false);
    eq('guardado: o que o formulário mostra ao abrir a correção', storedFacts(mkC(), stS)[0], { role: 'instr', dayOffWorked: 'ddo', special: { discretion: true }, accommodation: true });
    // Depois de passar pela correção (`edited`), o que lá ficou escrito manda — vazio APAGA o guardado.
    const cleared = mkC({ edited: true, role: null, dayOffWorked: null, special: null, accommodation: false });
    const fE = importSaveFields(cleared, 'calendar', stS);
    eq('correção: vazio apaga o papel, a folga trabalhada, os casos especiais e o alojamento', [fE.role, fE.dayOffWorked, fE.special, fE.accommodation, 'edited' in fE], [null, null, null, false, false]);
    eq('correção: … e a verificação já não usa o alojamento guardado', vr(cleared, { '2026-10-20': stS }).issues.some((i) => i.type === 'fdpUncertain'), true);
    // Sem passar pela correção, vazio não apaga (o saveDuty mantém).
    eq('sem correção: nada se escreve', 'role' in importSaveFields(mkC(), 'calendar', stS), false);
    // Um extra: o guardado entra na verificação e, depois de corrigido e passado a extra, fica o que se escreveu.
    const stX = { report_time: '02:00', block_on: '03:00', sectors: 0, flight_minutes: 0, route: null, kind: 'office', source: 'calendar', extra: [{ ...stS, source: 'calendar' }] };
    const cX = { ...mkC(), duty: { duty_date: '2026-10-20', kind: 'office', report_time: '02:00', block_on: '03:00', sectors: 0, flight_minutes: 0, route: null, extra: [{ ...mkC().duty, duty_date: undefined }] }, kind: 'office' };
    eq('guardado num extra: o que acompanha', storedFacts(cX, stX)[1], { role: 'instr', dayOffWorked: 'ddo', special: { discretion: true }, accommodation: true });
    const cXe = { ...cX, duty: { ...cX.duty, extra: [{ ...cX.duty.extra[0], edited: true, role: 'uprank' }] } };
    const fX = importSaveFields(cXe, 'calendar', stX);
    eq('extra corrigido: fica o que se escreveu, sem a marca', [fX.extra[0].role, fX.extra[0].dayOffWorked || null, 'edited' in fX.extra[0], fX.snap.extra.some((e) => 'edited' in e || 'role' in e)], ['uprank', null, false, false]);
  }
  // R11: a pernoita ligada à mão numa formação fora (o calendário não a traz) fica quando a hora muda.
  const trnS = { report_time: '09:00', block_on: '17:00', sectors: 0, flight_minutes: 0, route: null, kind: 'training', source: 'calendar', nightStop: true };
  const trnR = { duty: { duty_date: '2026-10-21', kind: 'training', report_time: '09:30', block_off: null, block_on: '17:30', sectors: 0, flight_minutes: 0, route: null }, kind: 'training' };
  eq('R11: a pernoita à mão numa formação fica', importSaveFields(trnR, 'calendar', trnS).nightStop, true);
  eq('R11: … mas num voo manda a rota lida', importSaveFields({ duty: { duty_date: '2026-10-21', kind: 'flight', report_time: '09:30', block_off: '10:00', block_on: '12:00', sectors: 2, flight_minutes: 100, route: 'LIS-OPO-LIS', nightStop: false }, kind: 'flight' }, 'calendar', { ...trnS, kind: 'flight', route: 'LIS-OPO' }).nightStop, false);
  // … mas dois serviços por casar de cada lado não se adivinham.
  const stored4 = { ...stored3, extra: [stored3.extra[0], { ...stored3.extra[0], report_time: '18:00', block_off: '19:00', block_on: '21:00', role: 'uprank' }] };
  const read4 = { duty: { ...read3.duty, extra: [read3.duty.extra[0], { ...read3.duty.extra[0], report_time: '18:30', block_off: '19:30', block_on: '21:30' }] }, kind: 'flight' };
  eq('R11: dois por casar de cada lado → não se adivinha', importSaveFields(read4, 'calendar', stored4).extra.map((e) => e.role || null), [null, null]);
}

// ───────────────────────────────────────────────────────────────────────────────
// AS PERNAS NÃO BATEM CERTO (achado no iPhone a 2026-11-11, "testar o calendário"; o Nuno: "seguir o que diz a lei")
// A volta sai antes de a ida chegar (17:30–20:35 e 19:50–21:30). A lei:
//  · ORO.FTL.105(13) e (24): um setor não começa antes de o anterior acabar — alguma hora está errada;
//  · ORO.FTL.105(6) + 235: um "intervalo" é inferior a um período de repouso — 23 h 15 "em terra" não é um intervalo;
//  · ORO.FTL.210: o serviço e o voo atribuídos contam TODOS para os limites. O dia NÃO fica de fora (como o voo sem
//    apresentação, A-161): entra, conta no serviço, no voo e no repouso, sem repartido, e fica "incerto" até as horas se
//    corrigirem. A lei não tem tolerâncias de minutos: 1 minuto de sobreposição também é incerto.
// A pausa que passa a meia-noite (chega 23:50, sai 00:30) é um intervalo e entra sem aviso.
{
  const { verifyCandidates, missingOf } = require(path.resolve('data/rosterImport.js'));
  const legTimes = (c) => !!(c.prospect && c.prospect.issues.some((i) => i.type === 'fdpUncertain' && (i.unknowns || []).includes('legTimes')));
  const ov = [ev('EZY1 LIS-FNC', '2026-11-20T17:30:00', '2026-11-20T20:35:00', { notes: 'RP 16:30' }), ev('EZY2 FNC-LIS', '2026-11-20T19:50:00', '2026-11-20T21:30:00')];
  const co = buildImportCandidates({ activities: acts(ov), ...PIL });
  eq('sobrepostas: um candidato que ENTRA (não fica de fora), incerto, com o que falta', [co.length, candidateKind(co[0]).kind, co[0].status, co[0].prospect.verdict, legTimes(co[0])], [1, 'ready', 'ok', 'unc', true]);
  eq('sobrepostas: as horas lidas ficam (corrigem-se, não se apagam)', co[0].duty.legs.map((l) => `${l.off}-${l.on}`), ['17:30-20:35', '19:50-21:30']);
  // O dia conta (ORO.FTL.210): serviço 16:30 → 21:30 + 30 min = 5:30; voo = a soma das pernas, 4:45; PSV máximo 11:15, sem repartido.
  const fo = day([co[0].duty], '2026-11-20');
  eq('sobrepostas: o dia conta no serviço e no voo; PSV 5:00, máximo garantido 11:15 (possível 13:30), incerto, sem repartido', [fo.servicoMin, fo.vooMin, fo.psv.result, fo.psv.max, fo.psv.maxHi || null, fo.psv.uncertain, !!fo.split], [330, 285, '05:00', '11:15', '13:30', true, false]);
  // Um serviço a que FALTA uma hora (bloqueia a importação) passa à frente do que só tem as pernas a não bater certo: é esse
  // que a correção tem de abrir (2.ª revisão independente). Voo sobreposto + assistência sem hora de fim no mesmo dia.
  {
    const { promoteMissing } = require(path.resolve('data/rosterImport.js'));
    const pm = promoteMissing({ ...co[0].duty, extra: [{ kind: 'standby_airport', report_time: '08:00', block_on: null, sectors: 0, flight_minutes: 0, route: null }] }, 'flight');
    eq('promoção: primeiro o serviço a que falta uma hora', [pm.kind, pm.duty.report_time, pm.duty.extra[0].report_time], ['standby_airport', '08:00', '16:30']);
  }
  // A lei não tem tolerâncias: 1 minuto de sobreposição (chega 08:01, sai 08:00) também entra como incerto.
  const one = buildImportCandidates({ activities: acts([ev('EZY1 LIS-OPO', '2026-11-25T07:00:00', '2026-11-25T08:01:00', { notes: 'RP 06:00' }), ev('EZY2 OPO-LIS', '2026-11-25T08:00:00', '2026-11-25T09:00:00')]), ...PIL });
  eq('sobrepostas por 1 minuto: entra, incerto', [candidateKind(one[0]).kind, one[0].prospect.verdict, legTimes(one[0])], ['ready', 'unc', true]);
  // … e a chegada e a partida seguinte à MESMA hora (08:00 e 08:00) estão certas.
  const zero = buildImportCandidates({ activities: acts([ev('EZY1 LIS-OPO', '2026-11-26T07:00:00', '2026-11-26T08:00:00', { notes: 'RP 06:00' }), ev('EZY2 OPO-LIS', '2026-11-26T08:00:00', '2026-11-26T09:00:00')]), ...PIL });
  eq('chegada e partida à mesma hora: certo', [candidateKind(zero[0]).kind, zero[0].prospect.verdict], ['ready', 'ok']);
  // Corrigido na folha (a volta sai às 21:20 e chega às 23:00): a dúvida sai.
  const fixedDuty = { ...co[0].duty, block_on: '23:00', edited: true, legs: [co[0].duty.legs[0], { ...co[0].duty.legs[1], off: '21:20', on: '23:00', offZ: null, onZ: null }] };
  const cf = verifyCandidates([{ ...co[0], duty: fixedDuty }], { duties: {}, dayLog: {}, ...PIL });
  eq('sobrepostas: corrigidas → certo', [candidateKind(cf[0]).kind, cf[0].prospect.verdict, legTimes(cf[0])], ['ready', 'ok', false]);
  // Um serviço EXTRA do dia com as pernas sobrepostas: o dia entra e o aviso aparece na mesma.
  // (o 1.º serviço acaba às 03:30 + 30 min: até às 16:30 são 12 h 30 de repouso na base → dois serviços no mesmo dia)
  const withExtra = buildImportCandidates({ activities: acts([ev('EZY8 LIS-OPO', '2026-11-20T01:00:00', '2026-11-20T02:00:00', { notes: 'RP 00:10' }), ev('EZY9 OPO-LIS', '2026-11-20T02:30:00', '2026-11-20T03:30:00'), ...ov]), ...PIL });
  eq('sobrepostas num 2.º serviço do dia: o dia entra, incerto, com esse serviço à frente (é o que a correção abre)', [withExtra.length, candidateKind(withExtra[0]).kind, withExtra[0].duty.extra.length, withExtra[0].prospect.verdict, legTimes(withExtra[0]), withExtra[0].duty.report_time], [1, 'ready', 1, 'unc', true, '16:30']);
  // … e também quando o serviço com as horas erradas NÃO é o que se está a ver (um extra de um dia já montado).
  {
    const d0 = withExtra[0].duty, ex = d0.extra[0];
    const swapped = { duty_date: d0.duty_date, ...ex, extra: [{ ...d0, extra: undefined, duty_date: undefined }] };
    const vs = verifyCandidates([{ ...withExtra[0], duty: swapped }], { duties: {}, dayLog: {}, ...PIL });
    eq('sobrepostas num extra do dia: o aviso aparece na mesma', [vs[0].duty.report_time, vs[0].prospect.verdict, legTimes(vs[0])], ['00:10', 'unc', true]);
  }
  // Do PDF (horas locais, sem Zulu): um serviço só (antes: dois, com 23 h de "repouso" inventado), que entra incerto.
  const rp = parseEasyjetRoster(`20/11/2025 Thu EJU8001 [320] LIS - FNC 16:30 A17:30 - A20:35
EJU8002 [320] FNC - LIS A19:50 - A21:30`, 'easyjet');
  const cp = buildImportCandidates({ activities: rp.activities, ...PIL });
  eq('sobrepostas no PDF: um serviço, com as horas lidas, que entra incerto', [cp.length, candidateKind(cp[0]).kind, (cp[0].duty.extra || []).length, cp[0].duty.legs.map((l) => `${l.off}-${l.on}`), cp[0].prospect.verdict, legTimes(cp[0])], [1, 'ready', 0, ['17:30-20:35', '19:50-21:30'], 'unc', true]);
  eq('sobrepostas no PDF: o diagnóstico diz porquê', rp.diag[0].warn, 'horas das pernas não batem certo');
  // No PDF, dois serviços do mesmo dia em que o 2.º voa depois da meia-noite estão certos (05:00–09:00 e 00:30–02:00).
  const rp2 = parseEasyjetRoster(`22/11/2025 Sat EJU8011 [320] LIS - OPO 04:00 A05:00 - A06:00
EJU8012 [320] OPO - LIS A08:00 - A09:00
EJU8013 [320] LIS - FNC A00:30 - A02:00`, 'easyjet');
  eq('PDF: 2.º serviço depois da meia-noite está certo', [rp2.activities.length, rp2.activities.some((a) => a.needsFix), rp2.diag[0].warn || null], [2, false, null]);
  // A pausa real pela meia-noite: chega 23:50, sai 00:30 → um serviço, certo, PSV 3:40 (21:50 → 01:30), sem repartido.
  const mn = [ev('EZY3 LIS-OPO', '2026-11-21T22:50:00', '2026-11-21T23:50:00', { notes: 'RP 21:50' }), ev('EZY4 OPO-LIS', '2026-11-22T00:30:00', '2026-11-22T01:30:00')];
  const cm = buildImportCandidates({ activities: acts(mn), ...PIL });
  eq('meia-noite: um serviço certo', [cm.length, candidateKind(cm[0]).kind, cm[0].duty.duty_date, cm[0].duty.sectors, cm[0].prospect.verdict], [1, 'ready', '2026-11-21', 2, 'ok']);
  const fm = day([cm[0].duty], '2026-11-21');
  eq('meia-noite: PSV 3:40, máximo 11:00 (Quadro 2), sem repartido, certo', [fm.psv.result, fm.psv.max, !!fm.split, !!fm.psv.uncertain], ['03:40', '11:00', false, false]);
  // O repartido pela meia-noite (chega 19:00, sai 23:30): as pernas estão certas; fica a dúvida de SEMPRE num repartido — o
  // alojamento do intervalo (CS FTL.1.220) —, não a das horas.
  const sp = [ev('EZY5 LIS-OPO', '2026-11-23T18:00:00', '2026-11-23T19:00:00', { notes: 'RP 17:00' }), ev('EZY6 OPO-LIS', '2026-11-23T23:30:00', '2026-11-24T00:30:00')];
  const cs2 = buildImportCandidates({ activities: acts(sp), ...PIL });
  eq('repartido pela meia-noite: entra, sem a dúvida das horas', [cs2.length, candidateKind(cs2[0]).kind, missingOf({ ...cs2[0].duty, kind: 'flight' }), legTimes(cs2[0])], [1, 'ready', null, false]);
}


// ── R1 (design/janela-sincronizar.html, 2026-11-14): a janela "Rever a escala" arruma-se por secções, pelo que é preciso
//    fazer: "A corrigir" primeiro (o que só entra depois de corrigido — ganha a qualquer estado), depois o que mudou (alterado e
//    o que editaste), o novo (com ou sem aviso), o que deixou de aparecer e, por fim, o relido com a regra nova. Os iguais não
//    aparecem. Dentro de cada secção, pela data. ──
{
  const fl = (date, route, extra = {}) => ({ duty: { duty_date: date, route, report_time: '06:10', block_off: '06:55', block_on: '12:30', sectors: 2 }, kind: 'flight', action: 'save', selected: true, ...extra });
  const cands = [
    fl('2026-11-23', 'LIS-XYZ', { status: 'ok' }),                                   // aeroporto que a app não conhece → corrigir
    fl('2026-11-14', 'LIS-LGW-LIS', { status: 'changed', exists: true }),
    fl('2026-11-16', 'LIS-OPO-LIS', { status: 'conflict', exists: true }),
    fl('2026-11-18', 'LIS-FNC-LIS', { status: 'ok' }),
    fl('2026-11-12', 'LIS-MAD-LIS', { status: 'warn' }),
    { duty: { duty_date: '2026-11-22', route: 'LIS-BCN-LIS', kind: 'flight' }, kind: 'flight', status: 'removed', exists: true, action: 'delete', selected: false },
    fl('2026-11-10', 'LIS-PDL-LIS', { status: 'refresh', exists: true }),
    fl('2026-11-11', 'LIS-AGP-LIS', { status: 'same', exists: true }),             // igual → não aparece
    fl('2026-11-20', 'LIS-QQQ-LIS', { status: 'changed', exists: true }),           // mudou MAS tem um aeroporto desconhecido → corrigir
    { duty: { duty_date: '2026-11-19', report_time: '09:00', block_on: null }, kind: 'office', status: 'ok', action: 'save', selected: true },   // escritório sem fim → corrigir
  ];
  const secs = importSections(cands);
  eq('R1: as secções e a ordem', secs.map((x) => x.key), ['fix', 'changed', 'new', 'removed', 'refresh']);
  eq('R1: a corrigir, por data (ganha ao "mudou")', secs[0].items.map((c) => c.duty.duty_date), ['2026-11-19', '2026-11-20', '2026-11-23']);
  eq('R1: mudou = alterado e editado por ti', secs[1].items.map((c) => c.duty.duty_date), ['2026-11-14', '2026-11-16']);
  eq('R1: novo = com e sem aviso', secs[2].items.map((c) => c.duty.duty_date), ['2026-11-12', '2026-11-18']);
  eq('R1: deixou de aparecer', secs[3].items.map((c) => c.duty.duty_date), ['2026-11-22']);
  eq('R1: relido', secs[4].items.map((c) => c.duty.duty_date), ['2026-11-10']);
  eq('R1: secções vazias não aparecem', importSections([fl('2026-11-18', 'LIS-FNC-LIS', { status: 'ok' })]).map((x) => x.key), ['new']);
  eq('R1: só iguais = nada', importSections([fl('2026-11-11', 'LIS-AGP-LIS', { status: 'same', exists: true })]), []);
  // H2 + V1 (design/janela-sincronizar-3.html): o dia vai dentro do quadradinho, por isso quando uma secção passa de um mês para
  // o outro leva uma linha com o mês (num primeiro import com 12 meses nunca fica um "14" sem se saber de que mês).
  eq('H2: secção num mês só = sem linha do mês', secs.map((x) => x.multiMonth), [false, false, false, false, false]);
  const two = importSections([fl('2026-12-02', 'LIS-PDL-LIS', { status: 'ok' }), fl('2026-11-18', 'LIS-FNC-LIS', { status: 'ok' }), fl('2026-11-14', 'LIS-LGW-LIS', { status: 'changed', exists: true })]);
  eq('H2: novembro e dezembro na mesma secção = com a linha do mês', two.map((x) => [x.key, x.multiMonth]), [['changed', false], ['new', true]]);
  eq('H2: a linha do mês segue a data', two[1].items.map((c) => c.duty.duty_date), ['2026-11-18', '2026-12-02']);
}

// ── "O que a app leu do calendário" (L1 com os números em cima, design/lista-calendario.html, 2026-11-14): três números — voos,
//    em terra (standby, escritório, formação, posicionamento… a cor lilás da Escala) e de fora (o que a app não reconhece) — e os
//    eventos por dia, pela data. A folga conta à parte (não é serviço nem fica de fora). O dia: o tipo principal (voo se houver um
//    voo; senão em terra; senão folga) e se há alguma coisa de fora nesse dia (o selo "!"). ──
{
  const items = [
    { title: 'HSBY', dateISO: '2026-11-14', kind: 'standby_home' },
    { title: 'EZY1009 LIS-OPO', dateISO: '2026-11-13', kind: 'flight', route: 'LIS-OPO' },
    { title: 'SIM CHECK', dateISO: '2026-11-17', kind: 'other' },
    { title: 'ADTY LIS', dateISO: '2026-11-19', kind: 'standby_airport' },
    { title: 'EZY1003 LIS-OPO', dateISO: '2026-11-20', kind: 'flight', route: 'LIS-OPO' },
    { title: 'HSBY', dateISO: '2026-11-20', kind: 'standby_home' },
    { title: 'OFC LIS', dateISO: '2026-11-21', kind: 'office' },
    { title: 'OFF', dateISO: '2026-11-22', kind: 'off' },
    { title: 'MEETING', dateISO: '2026-11-21', kind: 'other' },
  ];
  const d = diagSummary(items);
  eq('lido: os três números e a folga', [d.total, d.flights, d.ground, d.unknown, d.off], [9, 2, 4, 2, 1]);
  eq('lido: os dias pela data', d.days.map((x) => x.iso), ['2026-11-13', '2026-11-14', '2026-11-17', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
  eq('lido: o tipo principal de cada dia', d.days.map((x) => x.main), ['flight', 'ground', null, 'ground', 'flight', 'ground', 'off']);
  eq('lido: o selo "!" nos dias com alguma coisa de fora', d.days.map((x) => x.unknown), [false, false, true, false, false, true, false]);
  eq('lido: os eventos do dia pela ordem do calendário', d.days[4].events.map((e) => e.title), ['EZY1003 LIS-OPO', 'HSBY']);
  eq('lido: sem eventos', diagSummary([]), { total: 0, flights: 0, ground: 0, unknown: 0, off: 0, days: [] });
}

console.log(`\nimportação (bloco 4) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
