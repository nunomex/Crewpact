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

const { yearStats, availableYears, monthStats } = require(path.resolve('data/stats.js'));
const { resolveCrew, addCrewChange, migrateCrew } = require(path.resolve('data/crewHistory.js'));

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

// ── crewHistory: effective-dating da categoria/contrato ──
const HIST = [
  { category: 'FO', contract: '12/12', from: '2024-01' },
  { category: 'SFO', contract: '14-14', from: '2026-03' },
];
eq('resolveCrew antes do 1.º período → usa o 1.º', resolveCrew(HIST, '2023-05'), { category: 'FO', contract: '12/12' });
eq('resolveCrew no FO', resolveCrew(HIST, '2026-02'), { category: 'FO', contract: '12/12' });
eq('resolveCrew no mês da promoção', resolveCrew(HIST, '2026-03'), { category: 'SFO', contract: '14-14' });
eq('resolveCrew depois', resolveCrew(HIST, '2026-09'), { category: 'SFO', contract: '14-14' });
eq('resolveCrew aceita YYYY-MM-DD', resolveCrew(HIST, '2026-03-15'), { category: 'SFO', contract: '14-14' });
eq('resolveCrew história vazia', resolveCrew([], '2026-01'), { category: null, contract: '12/12' });
eq('addCrewChange adiciona período', addCrewChange(HIST, { category: 'CPT', contract: '12/12', from: '2027-01' }).length, 3);
eq('addCrewChange colapsa mudança sem efeito', addCrewChange([{ category: 'FO', contract: '12/12', from: '2024-01' }], { category: 'FO', contract: '12/12', from: '2026-01' }).length, 1);
eq('migrateCrew do escalar → 1 período no mês do serviceStart', migrateCrew({ crewCategory: 'FO', crewContract: '12/12', serviceStart: '2022-06-01' }), [{ category: 'FO', contract: '12/12', from: '2022-06' }]);
eq('migrateCrew preserva história existente', migrateCrew({ crewHistory: HIST, crewCategory: 'XX' }), HIST);

// yearStats EFFECTIVE-DATED: promoção a meio do ano NÃO reescreve o passado.
const aeCat = { monthlyBase: (cat) => ({ FO: 3000, SFO: 5000 }[cat] || 0), perDiem: () => 0 };
const promo = [
  { category: 'FO', contract: '12/12', from: '2026-01' },
  { category: 'SFO', contract: '12/12', from: '2026-03' },
];
const rEff = yearStats({}, { year: 2026, ae: aeCat, crewHistory: promo, now: new Date('2026-04-15T12:00:00') });
eq('YTD effective-dated (Jan+Fev FO 3000 · Mar+Abr SFO 5000)', rEff.aeYtd.base, 16000);
const rNaive = yearStats({}, { year: 2026, ae: aeCat, category: 'SFO', now: new Date('2026-04-15T12:00:00') });
eq('YTD ingénuo (4× SFO 5000) — confirma a diferença', rNaive.aeYtd.base, 20000);

// ── monthStats — vista de Mês ──
const jm = monthStats(DUTIES, { ym: '2026-01', now: new Date('2026-04-15T12:00:00') });
eq('mês jan: scope', jm.scope, 'month');
eq('mês jan: ym', jm.ym, '2026-01');
eq('mês jan: count', jm.count, 2);
eq('mês jan: flights', jm.flights, 2);
eq('mês jan: flightMin', jm.flightMin, 555);
eq('mês jan: sectors', jm.sectors, 4);
eq('mês jan: nightStops', jm.nightStops, 1);
eq('mês jan: dias (31)', jm.days.length, 31);
eq('mês jan: dia 5 = 255', jm.days[4].flightMin, 255);
eq('mês jan: dia 20 = 300', jm.days[19].flightMin, 300);
eq('mês jan: offDays (mês passado: 31−2)', jm.offDays, 29);
eq('mês jan: sem AE → aeMonth null', jm.aeMonth, null);
ok('mês jan: topDest tem LIS', jm.topDest.some((d) => d.code === 'LIS'));

// mês corrente (parcial) — offDays só até hoje; apagada ignorada
const cmS = monthStats(DUTIES, { ym: '2026-04', now: new Date('2026-04-15T12:00:00') });
eq('mês abr: count (apagada ignorada)', cmS.count, 0);
eq('mês abr: offDays até dia 15', cmS.offDays, 15);

// AE do mês com stub completo (computeAeMonth)
const aeStub2 = {
  monthlyBase: () => 5000,
  computeAeMonth: ({ duties = [], nightStops = 0 }) => ({ base: 5000, perDiem: duties.length * 50, nightStops: nightStops * 46, total: 5000 + duties.length * 50 + nightStops * 46 }),
};
const am = monthStats(DUTIES, { ym: '2026-01', ae: aeStub2, category: 'CPT', now: new Date('2026-04-15T12:00:00') });
ok('mês jan: aeMonth existe', !!am.aeMonth);
eq('mês jan: aeMonth.base', am.aeMonth.base, 5000);
eq('mês jan: aeMonth.perDiem (2 voos ×50)', am.aeMonth.perDiem, 100);
eq('mês jan: aeMonth.pernoita (1×46)', am.aeMonth.nightStops, 46);
eq('mês jan: aeMonth.total', am.aeMonth.total, 5146);

// ── Multi-serviço (2.º FDP no mesmo dia, `duty.extra`) — a EASA conta por SERVIÇO (ORO.FTL.210):
// horas/voos/setores/per-diem SOMAM primária + extra; "dias de escala"/folgas/pernoita = por DIA. ──
const MS = {
  '2026-06-10': {
    duty_date: '2026-06-10', report_time: '06:00', block_on: '10:00', flight_minutes: 200, sectors: 2, route: 'LIS-OPO-LIS', kind: 'flight', nightStop: false,
    extra: [{ report_time: '14:00', block_on: '18:00', flight_minutes: 180, sectors: 2, route: 'LIS-FAO-LIS', kind: 'flight', nightStop: false, source: 'manual' }],
  },
};
const ms = yearStats(MS, { year: 2026, now: new Date('2026-06-30T12:00:00') });
eq('multi: count = 1 DIA (não 2 serviços)', ms.count, 1);
eq('multi: flights = 2 (primária + extra)', ms.flights, 2);
eq('multi: sectors = 4 (2+2)', ms.sectors, 4);
eq('multi: flightMin = 380 (200+180)', ms.flightMin, 380);
eq('multi: dutyMin = 480 (4h + 4h)', ms.dutyMin, 480);
eq('multi: byKind.flight = 2 serviços', ms.byKind.flight, 2);
eq('multi: nightStops = 0 (day-level)', ms.nightStops, 0);
eq('multi: mês jun flightMin = 380', ms.months[5].flightMin, 380);
ok('multi: topDest inclui FAO (do 2.º voo)', ms.topDest.some((d) => d.code === 'FAO'));
// AE: o per-diem conta os DOIS voos do dia (antes da correção dava só 1 → subcontava).
const msAe = yearStats(MS, { year: 2026, ae: aeStub, category: 'CPT', now: new Date('2026-06-30T12:00:00') });
eq('multi: aeYtd.perDiem = 100 (2 voos ×50)', msAe.aeYtd.perDiem, 100);
// monthStats: mesma soma por serviço.
const msM = monthStats(MS, { ym: '2026-06', now: new Date('2026-06-30T12:00:00') });
eq('multi mês: flightMin 380', msM.flightMin, 380);
eq('multi mês: sectors 4', msM.sectors, 4);
eq('multi mês: flights 2', msM.flights, 2);
eq('multi mês: count 1 dia', msM.count, 1);
eq('multi mês: dia 10 flightMin 380', msM.days[9].flightMin, 380);
const msMAe = monthStats(MS, { ym: '2026-06', ae: aeStub2, category: 'CPT', now: new Date('2026-06-30T12:00:00') });
eq('multi mês: aeMonth.perDiem 100 (2 voos)', msMAe.aeMonth.perDiem, 100);

console.log(`\n${fail === 0 ? '✅' : '❌'}  stats: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
