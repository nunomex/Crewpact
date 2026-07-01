/*
 * Testes do parser de escala easyJet colada do PDF (data/pdfRoster.js). Modelados
 * sobre a imagem real do "Schedule Details" (abril 2025), em DUAS variantes de
 * colagem (a cópia de uma tabela PDF pode reflow-ar diferente):
 *   Variante A — cada linha visual numa linha (data+report na 1.ª, 2.ª perna na 2.ª).
 *   Variante B — cada CÉLULA numa linha.
 * Ambas têm de dar o MESMO resultado. Sem framework (igual aos golden AE/FTL).
 * Executar:  node scripts/pdf-roster.test.js
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));

let cjsPlugin;
try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); }
catch { cjsPlugin = null; }
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

const { parseEasyjetRoster, rosterLooksForeign } = require(path.resolve('data/pdfRoster.js'));
const { flightNoForeign } = require(path.resolve('data/rosterCodes.js'));
const { dutyFromActivity, buildImportCandidates, importSaveFields } = require(path.resolve('data/rosterImport.js'));

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.error(`✗ ${label}\n    esperado: ${JSON.stringify(want)}\n    obtido:   ${JSON.stringify(got)}`); }
};
const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${label}`); } };

// ── Texto de teste (da imagem) ────────────────────────────────────────────────
const VARIANT_A = `8           CESAR LIS-FA-319
Schedule Details
Date Duties Details Report times Actual times/Delays Debrief times Block hours Duty hours
01/04/2025 Tue EJU7695 [320] LIS - SID 10:50 A12:02 - A16:26 21:41 08:06 10:51
EJU7696 [320] SID - LIS A17:29 - A21:11/00:12
02/04/2025 Wed EJU8514 [320] LIS - LGW 14:55 A16:14 - A18:49 22:46 05:20 07:51
EJU8515 [320] LGW - LIS A19:31 - A22:16/00:19
03/04/2025 Thu FTGD Fatigued
04/04/2025 Fri D/O Day off
05/04/2025 Sat D/O Day off
06/04/2025 Sun D/O Day off
07/04/2025 Mon EJU8514 [321] LIS - LGW 15:00 A16:08 - A18:46 23:45 05:22 08:45
EJU8515 [321] LGW - LIS A20:18 - A23:02/00:08`;

const VARIANT_B = `Schedule Details
Date Duties Details Report times Actual times/Delays Debrief times Block hours Duty hours
01/04/2025 Tue
EJU7695 [320]
EJU7696 [320]
LIS - SID
SID - LIS
10:50
A12:02 - A16:26
A17:29 - A21:11/00:12
21:41
08:06
10:51
02/04/2025 Wed
EJU8514 [320]
EJU8515 [320]
LIS - LGW
LGW - LIS
14:55
A16:14 - A18:49
A19:31 - A22:16/00:19
22:46
05:20
07:51
03/04/2025 Thu
FTGD
Fatigued
04/04/2025 Fri
D/O
Day off
07/04/2025 Mon
EJU8514 [321]
EJU8515 [321]
LIS - LGW
LGW - LIS
15:00
A16:08 - A18:46
A20:18 - A23:02/00:08`;

const check = (name, text, expectOff) => {
  const r = parseEasyjetRoster(text, 'easyjet');
  ok(`${name}: 3 voos`, r.activities.length === 3);
  ok(`${name}: 0 não-voo`, r.nonflights.length === 0);
  ok(`${name}: ${expectOff} folgas no diag`, r.diag.filter((d) => d.kind === 'off').length === expectOff);
  ok(`${name}: 0 não reconhecidos`, r.diag.filter((d) => d.kind === 'other').length === 0);

  // Dia 1 (01/04) — 2 setores LIS-SID-LIS, report 10:50, block 12:02→21:11.
  const d1 = dutyFromActivity(r.activities[0]);
  eq(`${name}: d1.date`, d1.duty_date, '2025-04-01');
  eq(`${name}: d1.route`, d1.route, 'LIS-SID-LIS');
  eq(`${name}: d1.report`, d1.report_time, '10:50');
  eq(`${name}: d1.block_off`, d1.block_off, '12:02');
  eq(`${name}: d1.block_on`, d1.block_on, '21:11');
  eq(`${name}: d1.sectors`, d1.sectors, 2);
  ok(`${name}: d1.flight_minutes>0`, d1.flight_minutes > 0);

  // Dia 2 (02/04) — LIS-LGW-LIS, report 14:55.
  const d2 = dutyFromActivity(r.activities[1]);
  eq(`${name}: d2.route`, d2.route, 'LIS-LGW-LIS');
  eq(`${name}: d2.report`, d2.report_time, '14:55');
  eq(`${name}: d2.block_on`, d2.block_on, '22:16');

  // Último voo (07/04) — report 15:00.
  const d3 = dutyFromActivity(r.activities[2]);
  eq(`${name}: d3.date`, d3.duty_date, '2025-04-07');
  eq(`${name}: d3.report`, d3.report_time, '15:00');
  return r;
};

check('Variante A', VARIANT_A, 4);
check('Variante B', VARIANT_B, 2);

// Pipeline completo: parse → buildImportCandidates (sem duties existentes).
const r = parseEasyjetRoster(VARIANT_A, 'easyjet');
const cands = buildImportCandidates({ activities: r.activities, nonflights: r.nonflights, duties: {}, dayLog: {} });
ok('pipeline: 3 candidatos', cands.length === 3);
ok('pipeline: todos flight', cands.every((c) => c.kind === 'flight'));
ok('pipeline: ordenados por data', cands[0].duty.duty_date <= cands[1].duty.duty_date && cands[1].duty.duty_date <= cands[2].duty.duty_date);

// Dois FDP no MESMO dia (a EASA conta por serviço — 210) → FUNDEM num só candidato com `extra`.
const mkAct = (date, dep, arr, off, on, rep) => ({ dateISO: date, sectors: 1, legs: [{ depAirport: dep, arrAirport: arr, depTime: off, arrTime: on, report: rep, flightNo: 'EZY1', startDate: `${date}T${off}:00Z`, endDate: `${date}T${on}:00Z` }] });
const sameDay = buildImportCandidates({ activities: [mkAct('2026-06-16', 'LGW', 'CDG', '06:15', '07:45', '05:45'), mkAct('2026-06-16', 'CDG', 'LGW', '19:15', '20:45', '18:45')], nonflights: [], duties: {}, dayLog: {} });
ok('2 FDP/dia: 1 candidato (não sobrepõe)', sameDay.length === 1);
ok('2 FDP/dia: extra com 1 serviço', Array.isArray(sameDay[0].duty.extra) && sameDay[0].duty.extra.length === 1);
ok('2 FDP/dia: multi = 2', sameDay[0].multi === 2);
ok('2 FDP/dia: a 2.ª atividade vira extra (CDG-LGW)', sameDay[0].duty.extra[0].route === 'CDG-LGW');
ok('2 FDP/dia: a 1.ª fica primária (LGW-CDG)', sameDay[0].duty.route === 'LGW-CDG');
// Dias diferentes → NÃO funde (2 candidatos, sem multi).
const diffDay = buildImportCandidates({ activities: [mkAct('2026-06-16', 'LGW', 'CDG', '06:15', '07:45', '05:45'), mkAct('2026-06-17', 'CDG', 'LGW', '19:15', '20:45', '18:45')], nonflights: [], duties: {}, dayLog: {} });
ok('dias diferentes → 2 candidatos, sem merge', diffDay.length === 2 && !diffDay[0].multi && !diffDay[1].multi);

// Cancelado por AUSÊNCIA vem POR MARCAR (selected:false) — apagar é opt-in (ausência = sinal fraco).
const win = { start: '2026-06-16', end: '2026-06-22' };
const storedCal = { '2026-06-20': { duty_date: '2026-06-20', source: 'calendar', report_time: '06:00', block_on: '10:00', kind: 'flight' } };
const cancCands = buildImportCandidates({ activities: [], nonflights: [], duties: storedCal, dayLog: {}, window: win });
const rem = cancCands.find((c) => c.action === 'delete');
ok('cancelado por ausência é detetado (removed)', !!rem && rem.status === 'removed');
ok('cancelado vem POR MARCAR (selected:false)', !!rem && rem.selected === false);
// Manual/PDF ausentes NUNCA são cancelados (só o feed vivo).
const storedMan = { '2026-06-20': { duty_date: '2026-06-20', source: 'manual', report_time: '06:00', block_on: '10:00', kind: 'flight' } };
const manCands = buildImportCandidates({ activities: [], nonflights: [], duties: storedMan, dayLog: {}, window: win });
ok('manual ausente NUNCA é cancelado', !manCands.some((c) => c.action === 'delete'));
const storedPdf = { '2026-06-20': { duty_date: '2026-06-20', source: 'pdf', report_time: '06:00', block_on: '10:00', kind: 'flight' } };
const pdfCands = buildImportCandidates({ activities: [], nonflights: [], duties: storedPdf, dayLog: {}, window: win });
ok('PDF ausente NUNCA é cancelado', !pdfCands.some((c) => c.action === 'delete'));

// Proveniência POR-SERVIÇO: o commit faz MERGE — extras MANUAIS sobrevivem, extras do calendário
// vêm da leitura (a primária presente = leitura autoritativa para os serviços-do-calendário do dia).
const singleCand = { duty: dutyFromActivity(mkAct('2026-06-16', 'LGW', 'CDG', '06:15', '07:45', '05:45')), kind: 'flight' };
// (a) 1 atividade, nada guardado → extra null.
ok('merge: 1 atividade + sem extra → null', importSaveFields(singleCand, 'calendar').extra === null);
// (b) 1 atividade, mas há 2.º serviço MANUAL guardado → SOBREVIVE.
const manualExtra = [{ report_time: '18:45', block_on: '20:45', route: 'CDG-LGW', kind: 'flight', source: 'manual' }];
const withMan = importSaveFields(singleCand, 'calendar', manualExtra);
ok('merge: extra MANUAL sobrevive ao import', Array.isArray(withMan.extra) && withMan.extra.length === 1 && withMan.extra[0].source === 'manual');
// (c) 1 atividade, mas o extra guardado era do CALENDÁRIO → DESCARTADO (leitura autoritativa).
const calExtra = [{ report_time: '18:45', block_on: '20:45', route: 'CDG-LGW', kind: 'flight', source: 'calendar' }];
ok('merge: extra do CALENDÁRIO ausente da leitura é descartado', importSaveFields(singleCand, 'calendar', calExtra).extra === null);
// (d) 2 atividades → o 2.º serviço vem da leitura, com a fonte (calendar/pdf).
const multiCand = sameDay[0];
const mf = importSaveFields(multiCand, 'calendar');
ok('merge: 2 atividades → extra do calendário (tagged)', Array.isArray(mf.extra) && mf.extra.length === 1 && mf.extra[0].source === 'calendar');
// (e) 2 atividades + 1 manual guardado → AMBOS coexistem.
const mf2 = importSaveFields(multiCand, 'calendar', manualExtra);
ok('merge: calendário (leitura) + manual (guardado) coexistem', mf2.extra.length === 2 && mf2.extra.some((e) => e.source === 'calendar') && mf2.extra.some((e) => e.source === 'manual'));
ok('merge: source da primária propaga no commit', importSaveFields(singleCand, 'calendar').source === 'calendar');

// ── Guarda suave "companhia errada" (rosterLooksForeign) — não bloqueia, só sinaliza ──
ok('foreign: maioria other → true', rosterLooksForeign([{ kind: 'other' }, { kind: 'other' }, { kind: 'other' }, { kind: 'flight' }]) === true);   // 3/4 = 0.75 ≥ 0.7
ok('foreign: escala normal → false', rosterLooksForeign([{ kind: 'flight' }, { kind: 'flight' }, { kind: 'standby_airport' }, { kind: 'off' }]) === false);
ok('foreign: amostra pequena (<3) → false', rosterLooksForeign([{ kind: 'other' }, { kind: 'other' }]) === false);
ok('foreign: null/vazio → false', rosterLooksForeign(null) === false);

// ── flightNoForeign: aviso suave do "Detetar" no manual (só companhias modeladas) ──
ok('nº foreign: TP123 num easyJet → true', flightNoForeign('TP123', { slug: 'easyjet' }) === true);
ok('nº foreign: EJU7625 num easyJet → false', flightNoForeign('EJU7625', { slug: 'easyjet' }) === false);
ok('nº foreign: U28903 num easyJet → false', flightNoForeign('U28903', { slug: 'easyjet' }) === false);
ok('nº foreign: companhia NÃO modelada (tap) → false (não arrisca)', flightNoForeign('TP123', { slug: 'tap' }) === false);

console.log(`\n${fail === 0 ? '✅' : '❌'}  pdfRoster: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
