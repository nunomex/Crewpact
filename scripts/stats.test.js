/*
 * Testes do agregador de estatísticas anuais (data/stats.js). Sem framework
 * (igual aos golden AE/FTL). Executar:  node scripts/stats.test.js
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

const { yearStats, availableYears } = require(path.resolve('data/stats.js'));

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; console.error(`✗ ${label}\n    esperado: ${JSON.stringify(want)}\n    obtido:   ${JSON.stringify(got)}`); }
};
const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${label}`); } };

const DUTIES = {
  '2026-01-05': { duty_date: '2026-01-05', report_time: '06:00', block_on: '12:00', flight_minutes: 255, sectors: 2, route: 'LIS-OPO-LIS', kind: 'flight', nightStop: false },
  '2026-01-20': { duty_date: '2026-01-20', report_time: '14:00', block_on: '22:00', flight_minutes: 300, sectors: 2, route: 'LIS-FNC-LIS', kind: 'flight', nightStop: true },
  '2026-02-10': { duty_date: '2026-02-10', report_time: '05:00', block_on: null, sectors: 0, kind: 'standby_airport' },
  '2026-03-15': { duty_date: '2026-03-15', report_time: '08:00', block_on: '17:00', sectors: 0, kind: 'office' },
  '2025-12-30': { duty_date: '2025-12-30', report_time: '06:00', block_on: '10:00', flight_minutes: 200, sectors: 1, route: 'LIS-OPO', kind: 'flight' },
  '2026-04-01': { duty_date: '2026-04-01', deleted: true, kind: 'flight' }, // apagada → ignorada
};

const r = yearStats(DUTIES, { year: 2026, now: new Date('2026-04-15T12:00:00') });
eq('count (2026, sem apagadas)', r.count, 4);
eq('flights', r.flights, 2);
eq('sectors', r.sectors, 4);
eq('flightMin', r.flightMin, 555);
eq('flightHours', r.flightHours, 9.3);          // 555/60 = 9.25 → 9.3
eq('dutyMin', r.dutyMin, 360 + 480 + 540);      // jan05 6h + jan20 8h + mar15 9h (standby sem block_on não conta)
eq('dutyHours', r.dutyHours, 23);
eq('nightStops', r.nightStops, 1);
eq('byKind.flight', r.byKind.flight, 2);
eq('byKind.standby_airport', r.byKind.standby_airport, 1);
eq('byKind.office', r.byKind.office, 1);
eq('mês jan: count', r.months[0].count, 2);
eq('mês jan: flightMin', r.months[0].flightMin, 555);
eq('mês fev: count', r.months[1].count, 1);
eq('mês dez não conta (ano diferente)', r.months[11].count, 0);
eq('topDest[0]', r.topDest[0], { code: 'LIS', n: 2 }); // LIS aparece como destino 2× (volta de ambas as rotas)
ok('topDest inclui OPO e FNC', r.topDest.some((d) => d.code === 'OPO') && r.topDest.some((d) => d.code === 'FNC'));
eq('sem AE quando ae=null', r.aeYtd, null);

// AE YTD com stub (base fixa + per diem fixo por voo).
const aeStub = { monthlyBase: () => 5000, perDiem: () => 50 };
const ra = yearStats(DUTIES, { year: 2026, ae: aeStub, category: 'CPT', contract: '12/12', now: new Date('2026-04-15T12:00:00') });
ok('aeYtd existe', !!ra.aeYtd);
eq('aeYtd.monthsElapsed (abril)', ra.aeYtd.monthsElapsed, 4);
eq('aeYtd.base (5000×4)', ra.aeYtd.base, 20000);
eq('aeYtd.perDiem (2 voos ×50)', ra.aeYtd.perDiem, 100);
eq('aeYtd.total', ra.aeYtd.total, 20100);

// Ano passado → 12 meses de base.
const rp = yearStats(DUTIES, { year: 2025, ae: aeStub, category: 'CPT', now: new Date('2026-04-15T12:00:00') });
eq('2025: 1 voo', rp.flights, 1);
eq('2025: base 12 meses', rp.aeYtd.base, 60000);

// availableYears
eq('availableYears', availableYears(DUTIES), ['2026', '2025']);

// ── Repouso & folgas ──
eq('offDays (105−4)', r.offDays, 101);          // dayOfYear(2026-04-15)=105, count=4
eq('longestStreak (não-consecutivos)', r.longestStreak, 1);
ok('minRestH número', typeof r.minRestH === 'number' && r.minRestH > 0);

const REST_D = {
  '2026-05-01': { duty_date: '2026-05-01', report_time: '14:00', block_on: '23:00', kind: 'flight', sectors: 2 }, // fim 23:00
  '2026-05-02': { duty_date: '2026-05-02', report_time: '08:00', block_on: '16:00', kind: 'flight', sectors: 2 }, // rest 9h (<11) reduzido
  '2026-05-03': { duty_date: '2026-05-03', report_time: '10:00', block_on: '18:00', kind: 'flight', sectors: 2 }, // rest 18h
};
const rr = yearStats(REST_D, { year: 2026, now: new Date('2026-12-31T12:00:00') });
eq('minRestH = 9', rr.minRestH, 9);
eq('reducedRests = 1', rr.reducedRests, 1);
eq('longestStreak = 3', rr.longestStreak, 3);

console.log(`\n${fail === 0 ? '✅' : '❌'}  stats: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
