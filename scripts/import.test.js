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
const { dutyFromActivity, dutyFromNonFlight, buildImportCandidates, importSaveFields, candidateKind } = require(path.resolve('data/rosterImport.js'));
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
  // Revisão E1: um intervalo mais curto do que o serviço anterior mas de 10 h ou mais é um REPOUSO CURTO (infração do 235), não
  // um PSV: dia 10 das 06:00 aos calços das 17:30 no OPO; dia 11 com apresentação às 04:45 → 11:15 de intervalo.
  const e1 = [ev('EZY1 LIS-TFS', '2026-10-10T07:00:00', '2026-10-10T09:50:00', { notes: 'RP 06:00' }), ev('EZY2 TFS-LIS', '2026-10-10T10:40:00', '2026-10-10T13:30:00'),
    ev('EZY3 LIS-OPO', '2026-10-10T16:30:00', '2026-10-10T17:30:00'), ev('EZY4 OPO-LIS', '2026-10-11T05:30:00', '2026-10-11T06:30:00', { notes: 'RP 04:45' }),
    ev('EZY5 LIS-FNC', '2026-10-11T07:45:00', '2026-10-11T09:25:00')];
  eq('E1: 11:15 depois de 11:30 de serviço → dois serviços', acts(e1).map((x) => [x.dateISO, x.report, x.legs.length]), [['2026-10-10', '06:00', 3], ['2026-10-11', '04:45', 2]]);
  const ce1 = buildImportCandidates({ activities: acts(e1), ...PIL });
  const d11 = ce1.find((c) => c.duty.duty_date === '2026-10-11');
  eq('E1: … e o repouso curto aparece (10:45 desde o fim do serviço, de 12:00: o serviço anterior)', [d11.status, d11.prospect.issues.some((i) => i.type === 'restBefore' && i.actualMin === 645 && i.requiredMin === 720)], ['warn', true]);
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
  eq('A-229 cabine: só os dias 4 e 5 do episódio', paidSickDays(sick, { sickFirst3: false }), ['2026-04-06', '2026-04-07']);
  eq('A-229 pilotos: o episódio inteiro (o motor paga os dias 1 a 3)', paidSickDays(sick, { sickFirst3: true }), sick);
  eq('A-229 cabine, dois episódios (3 dias e 5 dias)', paidSickDays(['2026-05-03', '2026-05-04', '2026-05-05', '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14'], { sickFirst3: false }), ['2026-05-13', '2026-05-14']);
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
  eq('A-234 HSBY + voo importados: PSV 09:30 de 13:00, 210 = 11:30', [hc.length, hc[0].prospect.psv && hc[0].prospect.psv.result, hc[0].prospect.psv && hc[0].prospect.psv.max, hc[0].prospect.day.servicoMin, hc[0].prospect.verdict],
    [1, '09:30', '13:00', 690, 'ok']);

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

console.log(`\nimportação (bloco 4) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
