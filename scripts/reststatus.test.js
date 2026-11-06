/*
 * Golden do "Tenho descanso?" (data/today.js restStatus) — ORO.FTL.235: repouso entre o FIM do serviço anterior e o
 * REPORT do próximo, vs. o mínimo (na base: máx(12 h, duração do serviço anterior)). É a pílula REPOUSO ✓/CURTO do
 * Início (véspera e pernoita) e a frase que só diz "verificado" com ela (auditoria do tripulante, 2026-11-04).
 * Achado: o "próximo" era o 1.º serviço com data ≥ hoje — na pernoita/pós-voo era o de HOJE (já acabado), e media-se o
 * repouso ANTES dele. Agora o próximo é o 1.º cujo REPORT ainda não passou.
 * Executar:  node scripts/reststatus.test.js   (ou: npm run test:reststatus)
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

const { restStatus } = require(path.resolve('data/today.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const T = '2026-11-03';
const at = (iso, hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };
const pick = (r) => ({ status: r.status, prevIso: r.prevIso, nextIso: r.nextIso, actualMin: r.actualMin, requiredMin: r.requiredMin });

// Véspera: hoje sem serviço; ontem 08:00–20:00; amanhã report 06:20 → 34:20 de repouso, mínimo 12 h.
eq('véspera: ontem → amanhã', pick(restStatus({
  '2026-11-02': { report_time: '08:00', block_on: '20:00' },
  '2026-11-04': { report_time: '06:20', block_on: '09:50' },
}, T, at(T, '21:00'))), { status: 'ok', prevIso: '2026-11-02', nextIso: '2026-11-04', actualMin: 2060, requiredMin: 720 });

// PERNOITA / PÓS-VOO: o serviço de hoje (17:15–22:15) JÁ ACABOU → o próximo é o de amanhã e o anterior é o de hoje.
eq('pernoita: hoje (acabado) → amanhã', pick(restStatus({
  '2026-11-01': { report_time: '06:00', block_on: '10:00' },
  '2026-11-03': { report_time: '17:15', block_on: '22:15' },
  '2026-11-04': { report_time: '12:20', block_on: '15:50' },
}, T, at(T, '23:00'))), { status: 'ok', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 845, requiredMin: 720 });

// Repouso CURTO depois do serviço de hoje: 13:00–23:30, amanhã report 08:00 → 8:30 < 12 h.
eq('repouso curto depois de hoje', pick(restStatus({
  '2026-11-03': { report_time: '13:00', block_on: '23:30' },
  '2026-11-04': { report_time: '08:00', block_on: '11:00' },
}, T, at(T, '23:45'))), { status: 'bad', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 510, requiredMin: 720 });

// Pré-report de hoje (o report ainda não passou): o próximo é o de HOJE.
eq('pré-report: ontem → hoje', pick(restStatus({
  '2026-11-02': { report_time: '08:00', block_on: '18:00' },
  '2026-11-03': { report_time: '06:00', block_on: '14:00' },
}, T, at(T, '05:00'))), { status: 'ok', prevIso: '2026-11-02', nextIso: '2026-11-03', actualMin: 720, requiredMin: 720 });

// Em serviço (o report de hoje já passou): o próximo é o de amanhã; o anterior é o de hoje (fim planeado).
eq('em serviço: hoje → amanhã', pick(restStatus({
  '2026-11-03': { report_time: '06:00', block_on: '14:00' },
  '2026-11-04': { report_time: '07:00', block_on: '12:00' },
}, T, at(T, '10:00'))), { status: 'ok', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 1020, requiredMin: 720 });

// O de hoje vira a meia-noite (22:00 → 01:20) e já começou: repouso conta das 01:20 de amanhã.
eq('hoje vira a noite → amanhã 12:20', pick(restStatus({
  '2026-11-03': { report_time: '22:00', block_on: '01:20' },
  '2026-11-04': { report_time: '12:20', block_on: '15:50' },
}, T, at(T, '23:00'))), { status: 'bad', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 660, requiredMin: 720 });

// ── Auditoria 2026-11-06 (A-144/A-160): o repouso conta-se a partir do FIM do período de serviço (ORO.FTL.105(11):
// "incluindo o serviço pós-voo"), do ÚLTIMO serviço do dia, e o mínimo depende de onde se repousa (235(a)/(b)). ──
const T2 = '2026-11-10';
// (a) Calços 17:30, sign-off 18:00 (07:00 → 18:00 = 11:00 de serviço); report seguinte 05:45 → 11:45 < 12:00 → CURTO.
eq('A-144: conta desde o sign-off → curto', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '17:30', signOff: '18:00' },
  '2026-11-11': { report_time: '05:45', block_on: '09:00' },
}, T2, at(T2, '20:00'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 705, requiredMin: 720 });
// O mesmo sem sign-off, com o pós-voo de 30 min do perfil.
eq('A-144: sem sign-off, pós-voo de 30 min → curto', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '17:30' },
  '2026-11-11': { report_time: '05:45', block_on: '09:00' },
}, T2, at(T2, '20:00'), { postFlightMin: 30 })), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 705, requiredMin: 720 });
// A-160 (a): 06:00 → calços 19:30 + 30 min = 14:00 de serviço; report às 09:45 → 13:45 < 14:00 → CURTO (a app dizia ✓).
eq('A-160 (a): mínimo = o serviço (14:00) → curto', pick(restStatus({
  '2026-11-10': { report_time: '06:00', block_on: '19:30' },
  '2026-11-11': { report_time: '09:45', block_on: '13:00' },
}, T2, at(T2, '21:00'), { postFlightMin: 30 })), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 825, requiredMin: 840 });
// A-160 (b): dois serviços no dia (06:00–10:00 e 18:00–23:30); report às 08:00 → conta desde as 23:30 → 8:30 → CURTO.
eq('A-160 (b): o último serviço do dia', pick(restStatus({
  '2026-11-10': { report_time: '06:00', block_on: '10:00', extra: [{ report_time: '18:00', block_on: '23:30', kind: 'flight' }] },
  '2026-11-11': { report_time: '08:00', block_on: '12:00' },
}, T2, at(T2, '23:45'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 510, requiredMin: 720 });
// A-160 (c): pernoita no Funchal (base LIS), serviço de 9:30, 10:30 de repouso → fora da base o mínimo é 10 h → ✓.
eq('A-160 (c): fora da base, mínimo 10 h', pick(restStatus({
  '2026-11-10': { report_time: '10:00', block_on: '19:30', route: 'LIS-FNC', legs: [{ dep: 'LIS', arr: 'FNC', off: '17:30', on: '19:30' }] },
  '2026-11-11': { report_time: '06:00', block_on: '08:00' },
}, T2, at(T2, '21:00'), { base: 'LIS' })), { status: 'ok', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 630, requiredMin: 600 });
// ORO.FTL.205(d)(1): depois de um PSV prolongado (07:00 → 20:30, 1 setor: 13:30 > 13:00, cabe nas 14:00), o repouso
// sobe 2 h se o repouso ANTES também teve +2 h (opção i); senão 4 h (opção ii, o lado seguro). Report seguinte às 12:30.
eq('205(d): repouso antes longo → +2 h = 15:30 → ✓ com 16:00', pick(restStatus({
  '2026-11-09': { report_time: '06:00', block_on: '10:00' },
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '12:30', block_on: '15:00' },
}, T2, at(T2, '21:00'))), { status: 'ok', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 960, requiredMin: 930 });
eq('205(d): sem saber o repouso antes → +4 h = 17:30 → curto com 16:00', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '12:30', block_on: '15:00' },
}, T2, at(T2, '21:00'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 960, requiredMin: 1050 });

// Sem próximo serviço futuro → neutro.
eq('sem próximo → neutro', restStatus({ '2026-11-03': { report_time: '06:00', block_on: '14:00' } }, T, at(T, '20:00')).kind, 'noNext');

console.log(`\nrestStatus — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
