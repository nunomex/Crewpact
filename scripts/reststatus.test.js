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

// Sem próximo serviço futuro → neutro.
eq('sem próximo → neutro', restStatus({ '2026-11-03': { report_time: '06:00', block_on: '14:00' } }, T, at(T, '20:00')).kind, 'noNext');

console.log(`\nrestStatus — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
