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

const { parseEasyjetRoster } = require(path.resolve('data/pdfRoster.js'));
const { dutyFromActivity, buildImportCandidates } = require(path.resolve('data/rosterImport.js'));

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

console.log(`\n${fail === 0 ? '✅' : '❌'}  pdfRoster: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
