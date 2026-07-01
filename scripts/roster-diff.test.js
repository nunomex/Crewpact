/*
 * Testes do motor de Alterações de Escala (data/rosterDiff.js) — modelo de snapshot
 * (3 vias) + cancelamentos. Sem framework. Executar: node scripts/roster-diff.test.js
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
let cjsPlugin; try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); } catch { cjsPlugin = null; }
const transform = (src, filename) => babel.transformSync(src, { filename, babelrc: false, configFile: false, presets: cjsPlugin ? [] : [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]], plugins: cjsPlugin ? [cjsPlugin] : [] }).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) { if (filename.includes('node_modules')) return origJs(m, filename); m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename); };

const { diffDuty, classify, diffRoster } = require(path.resolve('data/rosterDiff.js'));

let pass = 0, fail = 0;
const eq = (label, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; else { fail++; console.error(`✗ ${label}\n    esperado: ${JSON.stringify(want)}\n    obtido:   ${JSON.stringify(got)}`); } };
const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${label}`); } };

// diffDuty
eq('iguais (case/—)', diffDuty({ report_time: '10:50', route: 'LIS-OPO', sectors: 2 }, { report_time: '10:50', route: 'lis-opo', sectors: 2 }), []);
eq('report mudou', diffDuty({ report_time: '10:50' }, { report_time: '11:30' }).map(f => f.key), ['report_time']);

// classify — calendário mudou, sem edição → changed
eq('classify changed', classify(
  { report_time: '10:50', kind: 'flight', snap: { report_time: '10:50', kind: 'flight' } },
  { report_time: '11:30', kind: 'flight' },
).status, 'changed');
// classify — só edição do utilizador (calendário igual à base) → same (sem nag)
eq('classify só-edição = same', classify(
  { report_time: '06:30', kind: 'flight', snap: { report_time: '06:00', kind: 'flight' } },
  { report_time: '06:00', kind: 'flight' },
).status, 'same');
// classify — mudaram os dois → conflict
eq('classify conflict', classify(
  { report_time: '14:30', kind: 'flight', snap: { report_time: '14:00', kind: 'flight' } },
  { report_time: '15:00', kind: 'flight' },
).status, 'conflict');

// diffRoster — cenário completo
const duties = {
  '2026-06-23': { duty_date: '2026-06-23', source: 'calendar', report_time: '10:50', block_on: '21:11', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight', snap: { report_time: '10:50', block_on: '21:11', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight' } },
  '2026-06-24': { duty_date: '2026-06-24', source: 'calendar', report_time: '06:30', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', snap: { report_time: '06:00', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight' } }, // tu editaste
  '2026-06-25': { duty_date: '2026-06-25', source: 'calendar', report_time: '14:30', route: 'LIS-MAD-LIS', sectors: 2, kind: 'flight', snap: { report_time: '14:00', route: 'LIS-MAD-LIS', sectors: 2, kind: 'flight' } }, // editaste
  '2026-06-26': { duty_date: '2026-06-26', source: 'calendar', report_time: '09:00', route: 'LIS-AGP-LIS', sectors: 2, kind: 'flight', snap: { report_time: '09:00', route: 'LIS-AGP-LIS', sectors: 2, kind: 'flight' } }, // sumiu → cancelado
  '2026-06-27': { duty_date: '2026-06-27', source: 'manual', report_time: '08:00', kind: 'flight' }, // manual → NUNCA cancelado
  '2026-06-28': { duty_date: '2026-06-28', source: 'calendar', report_time: '07:00', kind: 'flight', snap: { report_time: '07:00', kind: 'flight' } }, // fora da janela
};
const incoming = [
  { duty_date: '2026-06-23', report_time: '11:30', block_on: '21:11', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight' }, // changed
  { duty_date: '2026-06-24', report_time: '06:00', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight' },                    // = snap → same (não chateia)
  { duty_date: '2026-06-25', report_time: '15:00', route: 'LIS-MAD-LIS', sectors: 2, kind: 'flight' },                    // conflict
  { duty_date: '2026-06-30', report_time: '05:40', route: 'LIS-LGW-LIS', sectors: 2, kind: 'flight' },                    // added
];
const r = diffRoster({ incoming, duties, window: { start: '2026-06-20', end: '2026-06-27' } });
eq('changed=1', r.counts.changed, 1);
eq('conflict=1', r.counts.conflict, 1);
eq('added=1', r.counts.added, 1);
eq('removed=1', r.counts.removed, 1);
eq('total=4', r.counts.total, 4);
eq('changed date', r.changed[0].date, '2026-06-23');
eq('changed antes(snap)', r.changed[0].before.report_time, '10:50');
eq('changed depois', r.changed[0].after.report_time, '11:30');
eq('conflict date', r.conflict[0].date, '2026-06-25');
eq('added date', r.added[0].date, '2026-06-30');
eq('removed date (cal, na janela)', r.removed[0].date, '2026-06-26');
ok('24 não aparece (só edição)', ![...r.changed, ...r.conflict].some(x => x.date === '2026-06-24'));
ok('27 manual NÃO cancelado', !r.removed.some(x => x.date === '2026-06-27'));
ok('28 fora da janela NÃO cancelado', !r.removed.some(x => x.date === '2026-06-28'));

// sem janela → sem cancelamentos
eq('sem window → removed 0', diffRoster({ incoming, duties }).counts.removed, 0);

// ── Multi-serviço (a lei conta por SERVIÇO, não por dia) ──────────────────────
const S = (rep, off, on, route, sec) => ({ report_time: rep, block_off: off, block_on: on, route, sectors: sec, kind: 'flight' });
const AM = S('06:00', '06:40', '10:00', 'LGW-CDG', 1);   // serviço da manhã
const PM = S('19:00', '19:40', '21:00', 'CDG-LGW', 1);   // serviço da tarde
// 2 serviços iguais, ORDEM TROCADA → [] (o diff ordena por report; é independente da ordem)
eq('multi: 2 serviços iguais (ordem trocada) = []',
  diffDuty({ ...AM, extra: [PM] }, { ...PM, extra: [AM] }), []);
// report do 1.º serviço mudou → deteta, com o nº do serviço
const chg = diffDuty({ ...AM, extra: [PM] }, { ...S('06:30', '06:40', '10:00', 'LGW-CDG', 1), extra: [PM] });
eq('multi: report do 1.º serviço mudou', chg.map((f) => f.key), ['report_time']);
ok('multi: diff traz o nº do serviço', chg[0].service === 1);
// serviço a mais (1 → 2) e a menos (2 → 1)
eq('multi: serviço a mais', diffDuty(AM, { ...AM, extra: [PM] }).map((f) => f.key), ['service_added']);
eq('multi: serviço a menos', diffDuty({ ...AM, extra: [PM] }, AM).map((f) => f.key), ['service_removed']);
// classify: calendário ACRESCENTOU um serviço (snap 1, incoming 2) → changed
eq('classify multi: calendário acrescentou serviço → changed', classify(
  { ...AM, kind: 'flight', snap: { ...AM } },
  { ...AM, extra: [PM] },
).status, 'changed');
// classify: dia de 2 serviços inalterado (snap capta os 2) → same
eq('classify multi: 2 serviços inalterados → same', classify(
  { ...AM, extra: [PM], snap: { ...AM, extra: [PM] } },
  { ...AM, extra: [PM] },
).status, 'same');
// diffRoster: um dia que ganhou um serviço no calendário → changed=1
eq('diffRoster multi: dia ganhou serviço → changed=1', diffRoster({
  incoming: [{ duty_date: '2026-07-10', ...AM, extra: [PM] }],
  duties: { '2026-07-10': { duty_date: '2026-07-10', source: 'calendar', ...AM, snap: { ...AM } } },
}).counts.changed, 1);

console.log(`\n${fail === 0 ? '✅' : '❌'}  rosterDiff: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
