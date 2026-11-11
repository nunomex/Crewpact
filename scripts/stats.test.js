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

const { yearStats, availableYears, monthStats, ANNUAL_FLIGHT_LIMIT_H } = require(path.resolve('data/stats.js'));
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

// Limite do HERO da vista Ano = ANO CIVIL → 900 h (ORO.FTL.210 b), não 1000 (12 meses).
eq('limite ano civil = 900 h (ORO.FTL.210 b)', ANNUAL_FLIGHT_LIMIT_H, 900);

// ── Repouso com sign-off/débrief — mesma convenção do dutyMinutes (235c): o repouso só
// começa DEPOIS do pós-voo (sign-off real; senão block_on + débrief, só em voos). ──
const REST_S = {
  '2026-05-01': { duty_date: '2026-05-01', report_time: '14:00', block_on: '23:00', kind: 'flight', sectors: 2 },                    // sem sign-off → fim 23:00+30 = 23:30
  '2026-05-02': { duty_date: '2026-05-02', report_time: '08:00', block_on: '16:00', signOff: '16:45', kind: 'flight', sectors: 2 },  // sign-off REAL manda (sem débrief por cima)
  '2026-05-03': { duty_date: '2026-05-03', report_time: '10:00', block_on: '18:00', kind: 'office' },                                // não-voo: sem débrief
};
const rs = yearStats(REST_S, { year: 2026, postFlightMin: 30, now: new Date('2026-12-31T12:00:00') });
eq('rest c/ débrief: minRestH 8.5 (23:30→08:00)', rs.minRestH, 8.5);
eq('rest c/ débrief: reducedRests 1', rs.reducedRests, 1);
eq('rest c/ débrief: dutyMin 570+525+480', rs.dutyMin, 570 + 525 + 480);   // voo s/ sign-off +30 · sign-off real · office sem débrief

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

// ── LINHA DO TEMPO DO CONTRATO (2026-11-03, aprovada pelo Nuno): a companhia e a base também têm
// datas. Três linhas SEPARADAS: categoria/contrato · companhia+tipo · base. Mudar de companhia
// ("mudei") começa períodos novos na data de entrada; os meses antigos ficam com o AE antigo.
const { resolveCompany, migrateCompany, resolveBase, migrateBase, addBaseChange, startEmployment } = require(path.resolve('data/crewHistory.js'));
const { getAe } = require(path.resolve('ae/index.js'));

eq('migrateCompany do escalar → 1 período no mês do serviceStart', migrateCompany({ company: 'easyjet', crewType: 'cabin', serviceStart: '2018-05-01' }), [{ company: 'easyjet', crewType: 'cabin', from: '2018-05' }]);
eq('migrateCompany sem companhia → vazio', migrateCompany({}), []);
eq('migrateCompany preserva a linha existente', migrateCompany({ companyHistory: [{ company: 'tap', crewType: 'pilot', from: '2020-01' }], company: 'easyjet' }), [{ company: 'tap', crewType: 'pilot', from: '2020-01' }]);
eq('migrateBase do escalar (código em maiúsculas)', migrateBase({ base: 'lis', serviceStart: '2018-05-01' }), [{ base: 'LIS', from: '2018-05' }]);
eq('migrateBase sem serviceStart → 2000-01', migrateBase({ base: 'OPO' }), [{ base: 'OPO', from: '2000-01' }]);
eq('resolveCompany linha vazia', resolveCompany([], '2026-01'), { company: null, crewType: null });
eq('resolveBase linha vazia', resolveBase([], '2026-01'), null);

// MUDEI: easyJet cabine FA (LIS) desde maio/2018 → TAP cabine CAB2 (LIS) desde maio/2026.
const L0 = {
  crewHistory: [{ category: 'FA', contract: '12/12', from: '2018-05' }],
  companyHistory: migrateCompany({ company: 'easyjet', crewType: 'cabin', serviceStart: '2018-05-01' }),
  baseHistory: migrateBase({ base: 'LIS', serviceStart: '2018-05-01' }),
};
const L1 = startEmployment(L0, { company: 'tap', crewType: 'cabin', category: 'CAB2', contract: '12/12', base: 'LIS', from: '2026-05' });
eq('mudei: abril/2026 ainda é easyJet', resolveCompany(L1.companyHistory, '2026-04'), { company: 'easyjet', crewType: 'cabin' });
eq('mudei: maio/2026 já é TAP', resolveCompany(L1.companyHistory, '2026-05-20'), { company: 'tap', crewType: 'cabin' });
eq('mudei: maio/2025 é easyJet', resolveCompany(L1.companyHistory, '2025-05'), { company: 'easyjet', crewType: 'cabin' });
eq('mudei: categoria em abril = FA', resolveCrew(L1.crewHistory, '2026-04').category, 'FA');
eq('mudei: categoria em maio = CAB2', resolveCrew(L1.crewHistory, '2026-05').category, 'CAB2');
eq('mudei: mesma base nas duas → a linha não cria período', L1.baseHistory, [{ base: 'LIS', from: '2018-05' }]);
// Uma promoção da companhia ANTIGA marcada para depois da saída deixa de valer.
const L0p = { ...L0, crewHistory: [...L0.crewHistory, { category: 'CM', contract: '12/12', from: '2026-07' }] };
eq('mudei: promoção da antiga depois da saída cai', resolveCrew(startEmployment(L0p, { company: 'tap', crewType: 'cabin', category: 'CAB2', base: 'LIS', from: '2026-05' }).crewHistory, '2026-08').category, 'CAB2');
// Mudar também de base: OPO a partir do mês de entrada.
const L1o = startEmployment(L0, { company: 'tap', crewType: 'cabin', category: 'CAB2', base: 'OPO', from: '2026-05' });
eq('mudei com base nova: abril LIS · maio OPO', [resolveBase(L1o.baseHistory, '2026-04'), resolveBase(L1o.baseHistory, '2026-05')], ['LIS', 'OPO']);

// O AE CERTO EM CADA MÊS (golden do plano): maio/2025 easyJet + maio/2026 TAP.
const aeAtL1 = (ym) => { const r = resolveCompany(L1.companyHistory, ym); return getAe(r.company, r.crewType); };
eq('aeAt maio/2025 = easyJet cabine', aeAtL1('2025-05').AE_ID, 'easyjet-snpvac');
eq('aeAt maio/2026 = TAP cabine', aeAtL1('2026-05').AE_ID, 'tap-snpvac');
// Ano de 2026 somado MÊS A MÊS: jan–abr easyJet FA (base 1346,57 + abono 78,55) · mai–dez TAP CAB2 (1627,02).
const NOW_DEC = new Date('2026-12-15T12:00:00');
// A data de entrada é a da TAP (maio de 2026): o subsídio de Natal da TAP em dezembro é proporcional (Cl. 17.ª, n.º 2: "No ano
// de admissão (...) na proporção do tempo de trabalho prestado") → 1 627,02 × 8/12 = 1 084,68 € (bloco 6).
// Com o DIA dado (entrou a 1 de maio): o mês da entrada inteiro.
const ySplit = yearStats({}, { year: 2026, aeAt: aeAtL1, crewHistory: L1.crewHistory, now: NOW_DEC, serviceStart: '2026-05-01', startExact: true });
eq('ano 2026 com mudança: base = 4×1346,57 + 8×1627,02', ySplit.aeYtd.base, 18402.44);
eq('ano 2026 com mudança: abono só nos meses easyJet (4×78,55)', ySplit.aeYtd.cash, 314.2);
eq('ano 2026 com mudança: subsídio de Natal da TAP, proporcional', ySplit.aeYtd.annual, 1084.68);
eq('ano 2026 com mudança: total', ySplit.aeYtd.total, 19801.32);
// Com a LINHA DA COMPANHIA (companyHistory), cada mês usa a data de entrada da companhia DESSE mês (easyJet: maio de 2018) e o
// ano da saída paga os proporcionais (Cl. 51.ª/1): em abril de 2026, Natal 4/12 (448,86) + férias 4/12 (448,86) da easyJet;
// mais o Natal da TAP (1 084,68) → 1 982,40. E 2025, o ano inteiro na easyJet, tem os dois subsídios (antes: nenhum, porque a
// data de entrada era sempre a da companhia atual).
const yCo = yearStats({}, { year: 2026, aeAt: aeAtL1, crewHistory: L1.crewHistory, companyHistory: L1.companyHistory, now: NOW_DEC, serviceStart: '2026-05-01', startExact: true });
eq('ano 2026 com a linha da companhia: subsídios = saída da easyJet + Natal da TAP', yCo.aeYtd.annual, 1982.4);
const y25 = yearStats({}, { year: 2025, aeAt: aeAtL1, crewHistory: L1.crewHistory, companyHistory: L1.companyHistory, now: NOW_DEC, serviceStart: '2026-05-01', startExact: true });
eq('ano 2025 na companhia antiga: férias + Natal (os dois subsídios)', y25.aeYtd.annual > 2000, true);
// R14 (revisão): o 1.º mês de uma companhia ANTERIOR conta inteiro (o dia dessa entrada não se pode dar no Perfil — ficava a
// base de 1 dia para sempre).
const Lr = [{ company: 'easyjet', crewType: 'cabin', from: '2025-03' }, { company: 'tap', crewType: 'cabin', from: '2026-05' }];
const mr = monthStats({}, { ym: '2025-03', ae: getAe('easyjet', 'cabin'), crewHistory: [{ category: 'FA', contract: '12/12', from: '2025-03' }], companyHistory: Lr, now: NOW_DEC, serviceStart: '2026-05-01' });
eq('1.º mês da companhia anterior: a base do mês inteiro, sem incerto', [mr.aeMonth.base > 1000, !!mr.aeMonth.baseRange], [true, false]);
// Sem o dia (a data guarda-se ao mês): maio vai de 1 dia (1 627,02 ÷ 30 = 54,23) ao mês todo, e o Natal de 7 meses e 1/31 a 8/12
// → o certo: base 4×1346,57 + 7×1627,02 + 54,23 = 16 829,65 €; Natal 1 627,02 × (7 + 1/31) ÷ 12 = 953,47 €; o ano fica incerto.
const yU = yearStats({}, { year: 2026, aeAt: aeAtL1, crewHistory: L1.crewHistory, now: NOW_DEC, serviceStart: '2026-05-01' });
eq('ano 2026 com mudança, dia por saber: base certa', yU.aeYtd.base, 16829.65);
eq('ano 2026 com mudança, dia por saber: Natal certo', yU.aeYtd.annual, 953.47);
eq('ano 2026 com mudança, dia por saber: incerto pelo dia da entrada', [yU.aeYtd.uncertain, (yU.aeYtd.uncertainReasons || []).includes('admission')], [true, true]);
// Sem a linha do tempo (o comportamento antigo): o ano inteiro calculado com a TAP.
const yOld = yearStats({}, { year: 2026, ae: getAe('tap', 'cabin'), crewHistory: [{ category: 'CAB2', contract: '12/12', from: '2026-05' }], now: NOW_DEC });
eq('sem linha do tempo: 12×1627,02 (o erro que a linha corrige)', yOld.aeYtd.base, 19524.24);
// O Ano bate com a soma dos Meses (cada mês com o SEU acordo).
let sumMonths = 0;
let sumMonthsU = 0;
for (let mo = 1; mo <= 12; mo++) {
  const ym = `2026-${String(mo).padStart(2, '0')}`;
  sumMonths += monthStats({}, { ym, ae: aeAtL1(ym), crewHistory: L1.crewHistory, now: NOW_DEC, serviceStart: '2026-05-01', startExact: true }).aeMonth.total;
  sumMonthsU += monthStats({}, { ym, ae: aeAtL1(ym), crewHistory: L1.crewHistory, now: NOW_DEC, serviceStart: '2026-05-01' }).aeMonth.total;
}
eq('ano = soma dos meses (com mudança de companhia)', +sumMonths.toFixed(2), ySplit.aeYtd.total);
eq('ano = soma dos meses (com mudança, dia da entrada por saber)', +sumMonthsU.toFixed(2), yU.aeYtd.total);
// Mudar para uma companhia SEM AE modelado: os meses novos ficam sem dinheiro, os antigos mantêm-se.
const L2 = startEmployment(L0, { company: 'hifly', crewType: 'cabin', category: null, base: 'LIS', from: '2026-05' });
const aeAtL2 = (ym) => { const r = resolveCompany(L2.companyHistory, ym); return getAe(r.company, r.crewType); };
eq('mudei para FTL-only: maio sem AE', aeAtL2('2026-05'), null);
eq('mudei para FTL-only: ano só com jan–abr easyJet', yearStats({}, { year: 2026, aeAt: aeAtL2, crewHistory: L2.crewHistory, now: NOW_DEC }).aeYtd.base, 5386.28);

// Corrigir depois a DATA DE ENTRADA ("Na TAP desde", no Perfil): a fronteira das três linhas acompanha.
const { moveEmploymentStart } = require(path.resolve('data/crewHistory.js'));
const Mv4 = moveEmploymentStart(L1o, '2026-04');
eq('entrada antecipada para abril: abril já é TAP', resolveCompany(Mv4.companyHistory, '2026-04').company, 'tap');
eq('entrada antecipada para abril: categoria e base acompanham', [resolveCrew(Mv4.crewHistory, '2026-04').category, resolveBase(Mv4.baseHistory, '2026-04')], ['CAB2', 'OPO']);
eq('entrada antecipada para abril: março continua easyJet/FA/LIS', [resolveCompany(Mv4.companyHistory, '2026-03').company, resolveCrew(Mv4.crewHistory, '2026-03').category, resolveBase(Mv4.baseHistory, '2026-03')], ['easyjet', 'FA', 'LIS']);
const Mv7 = moveEmploymentStart(L1o, '2026-07');
eq('entrada adiada para julho: junho ainda easyJet/FA/LIS', [resolveCompany(Mv7.companyHistory, '2026-06').company, resolveCrew(Mv7.crewHistory, '2026-06').category, resolveBase(Mv7.baseHistory, '2026-06')], ['easyjet', 'FA', 'LIS']);
eq('entrada adiada para julho: julho TAP/CAB2/OPO', [resolveCompany(Mv7.companyHistory, '2026-07').company, resolveCrew(Mv7.crewHistory, '2026-07').category, resolveBase(Mv7.baseHistory, '2026-07')], ['tap', 'CAB2', 'OPO']);
// Uma promoção na companhia antiga DEPOIS da nova data de entrada deixa de valer.
const L1cm = startEmployment({ ...L0, crewHistory: [...L0.crewHistory, { category: 'CM', contract: '12/12', from: '2026-03' }] }, { company: 'tap', crewType: 'cabin', category: 'CAB2', base: 'LIS', from: '2026-05' });
eq('entrada antecipada para fevereiro: a promoção de março na easyJet cai', resolveCrew(moveEmploymentStart(L1cm, '2026-02').crewHistory, '2026-03').category, 'CAB2');
// Uma só companhia: nada muda (a antiguidade não reescreve a categoria nem a base).
eq('uma só companhia: as linhas ficam iguais', moveEmploymentStart(L0, '2019-01'), { crewHistory: L0.crewHistory, companyHistory: L0.companyHistory, baseHistory: L0.baseHistory });

// ── FROTA com datas (pilotos TAP, 2026-11-03): a frota faz parte do posto, como a categoria (linha da
// categoria). Passar de NB a WB em junho não muda as ajudas de custo de maio.
const HF = addCrewChange([{ category: 'OP3C', contract: '12/12', fleet: 'NB', from: '2020-01' }], { category: 'OP3C', contract: '12/12', fleet: 'WB', from: '2026-06' });
eq('frota: maio NB', resolveCrew(HF, '2026-05').fleet, 'NB');
eq('frota: junho WB', resolveCrew(HF, '2026-06').fleet, 'WB');
eq('frota igual não cria período', addCrewChange(HF, { category: 'OP3C', contract: '12/12', fleet: 'WB', from: '2026-09' }).length, 2);
eq('promoção sem frota indicada mantém a frota em vigor', resolveCrew(addCrewChange(HF, { category: 'OP2', contract: '12/12', from: '2026-09' }), '2026-10'), { category: 'OP2', contract: '12/12', fleet: 'WB' });
eq('migrateCrew guarda a frota', migrateCrew({ crewCategory: 'OP3C', crewFleet: 'NB', serviceStart: '2020-01-01' }), [{ category: 'OP3C', contract: '12/12', fleet: 'NB', from: '2020-01' }]);
const tapP = getAe('tap', 'pilot');
const DF = {
  '2026-05-10': { report_time: '06:00', block_on: '09:00', sectors: 2, flight_minutes: 100, route: 'LIS-OPO-LIS', kind: 'flight' },
  '2026-06-10': { report_time: '06:00', block_on: '09:00', sectors: 2, flight_minutes: 100, route: 'LIS-OPO-LIS', kind: 'flight' },
};
eq('frota datada: ano 2026 = maio NB 202,50 + junho WB 225,00', yearStats(DF, { year: 2026, ae: tapP, crewHistory: HF, fleet: 'WB', now: NOW_DEC }).aeYtd.perDiem, 427.5);
eq('sem datas (WB o ano todo): 450,00 (o erro que a frota datada corrige)', yearStats(DF, { year: 2026, ae: tapP, category: 'OP3C', fleet: 'WB', now: NOW_DEC }).aeYtd.perDiem, 450);
eq('frota datada: mês de maio pela NB', monthStats(DF, { ym: '2026-05', ae: tapP, crewHistory: HF, fleet: 'WB', now: NOW_DEC }).aeMonth.perDiem, 202.5);

// ── VÍNCULO com datas (2026-11-03): faz parte da relação de trabalho → linha da companhia. Agência até
// dezembro de 2024, contrato com a companhia desde janeiro de 2025: 2024 sem salário do AE, 2025 com.
// ("Abrangido pelo AE" fica SEM datas: datar a filiação sindical é dado sensível — RGPD art. 9.º.)
const { addEmploymentChange, coveredBy } = require(path.resolve('data/crewHistory.js'));
const CH = migrateCompany({ company: 'easyjet', crewType: 'cabin', employment: 'agency', serviceStart: '2018-05-01' });
eq('migrateCompany guarda o vínculo', CH, [{ company: 'easyjet', crewType: 'cabin', employment: 'agency', from: '2018-05' }]);
const CH2 = addEmploymentChange(CH, { employment: 'employee', from: '2025-01' });
eq('vínculo: dezembro/2024 agência', resolveCompany(CH2, '2024-12').employment, 'agency');
eq('vínculo: janeiro/2025 empresa, mesma companhia', [resolveCompany(CH2, '2025-01').employment, resolveCompany(CH2, '2025-01').company], ['employee', 'easyjet']);
eq('vínculo igual não cria período', addEmploymentChange(CH2, { employment: 'employee', from: '2026-01' }).length, 2);
eq('vínculo "sempre foi assim" desde a entrada: um só período', addEmploymentChange(CH2, { employment: 'employee', from: '2018-05', correct: true }), [{ company: 'easyjet', crewType: 'cabin', employment: 'employee', from: '2018-05' }]);
eq('coveredBy: agência nunca', coveredBy('agency', true), false);
eq('coveredBy: empresa por defeito', coveredBy('employee', undefined), true);
eq('coveredBy: empresa não abrangida', coveredBy('employee', false), false);
const aeAtV = (ym) => { const r = resolveCompany(CH2, ym); return coveredBy(r.employment, true) ? getAe(r.company, r.crewType) : null; };
const FA = [{ category: 'FA', contract: '12/12', from: '2018-05' }];
eq('vínculo datado: 2024 (agência) sem salário do AE', yearStats({}, { year: 2024, aeAt: aeAtV, crewHistory: FA, now: NOW_DEC }).aeYtd, null);
// 2025 com as tabelas do Anexo I de cada mês (bloco 5, A-019): jan = fev-2024 (16 870 / 14 = 1 205,00) · fev-out = fev-2025 (18 214 / 14 = 1 301,00) · nov-dez = nov-2025 (1 346,57).
eq('vínculo datado: 2025 (empresa) com a tabela de cada mês', yearStats({}, { year: 2025, aeAt: aeAtV, crewHistory: FA, now: NOW_DEC }).aeYtd.base, 15607.14);
// Mudar de companhia mantém o vínculo indicado; correção do vínculo só na companhia atual.
const LV = startEmployment({ crewHistory: FA, companyHistory: CH2, baseHistory: [] }, { company: 'tap', crewType: 'cabin', category: 'CAB2', employment: 'agency', base: 'LIS', from: '2026-05' });
eq('mudei com vínculo: maio/2026 TAP por agência', resolveCompany(LV.companyHistory, '2026-05').employment, 'agency');
eq('correção do vínculo desde a entrada na TAP não toca na easyJet', addEmploymentChange(LV.companyHistory, { employment: 'employee', from: '2026-05', correct: true }).map((p) => `${p.company}:${p.employment}:${p.from}`), ['easyjet:agency:2018-05', 'easyjet:employee:2025-01', 'tap:employee:2026-05']);

// BASE: transferência LIS→OPO em março não mexe em fevereiro.
const BH = addBaseChange(migrateBase({ base: 'LIS', serviceStart: '2018-05-01' }), { base: 'OPO', from: '2026-03' });
eq('transferência: fevereiro LIS', resolveBase(BH, '2026-02-27'), 'LIS');
eq('transferência: março OPO', resolveBase(BH, '2026-03-01'), 'OPO');
eq('transferência repetida no mesmo mês substitui', addBaseChange(BH, { base: 'FAO', from: '2026-03' }), [{ base: 'LIS', from: '2018-05' }, { base: 'FAO', from: '2026-03' }]);
eq('transferência para a mesma base não cria período', addBaseChange(BH, { base: 'OPO', from: '2026-06' }).length, 2);
// "Sempre foi esta" (correção) apaga a linha DESDE o início indicado e põe esta base aí.
eq('correção desde 2018-05: uma só base', addBaseChange(BH, { base: 'FAO', from: '2018-05', correct: true }), [{ base: 'FAO', from: '2018-05' }]);
// Correção só na companhia atual (desde maio/2026) mantém a base da companhia antiga.
eq('correção desde a entrada na atual mantém a antiga', addBaseChange(L1o.baseHistory, { base: 'FAO', from: '2026-05', correct: true }), [{ base: 'LIS', from: '2018-05' }, { base: 'FAO', from: '2026-05' }]);

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

// ── AE completo: as PARCELAS somam ao total (auditável) + eventos do mês + Ano = Σ Meses ──
// Stub com o contrato inteiro dos 4 AEs reais: computeAeMonth (base/cashHandling/perDiem/
// nightStops/extras/total) + monthExtras (eventos €60) + OFFICE4_SECTORS (dia de escritório).
const aeStub3 = {
  monthlyBase: () => 5000,
  OFFICE4_SECTORS: 1.5,
  computeAeMonth: ({ duties = [], nightStops = 0, extraSectors = 0 }) => {
    const perDiem = duties.length * 50, night = nightStops * 46, extras = +(extraSectors * 10).toFixed(2), cash = 20;
    return { base: 5000, cashHandling: cash, perDiem, nightStops: night, extras, variable: perDiem + night + extras, total: +(5000 + cash + perDiem + night + extras).toFixed(2) };
  },
  monthExtras: (cat, counts = {}) => { const n = Object.values(counts).reduce((a, b) => a + (+b || 0), 0); return { items: [], total: n * 60 }; },
};
const EV = [
  { id: 'e1', date: '2026-01-12', type: 'snc' },   // datado (jan)
  { id: 'e2', date: '2026-01', type: 'ddo' },      // migrado só-mês (jan)
  { id: 'e3', date: '2026-02-03', type: 'snc' },   // datado (fev)
];
const am3 = monthStats(DUTIES, { ym: '2026-01', ae: aeStub3, category: 'CPT', events: EV, now: new Date('2026-04-15T12:00:00') });
eq('AE mês: base', am3.aeMonth.base, 5000);
eq('AE mês: abono p/ falhas (cash)', am3.aeMonth.cash, 20);
eq('AE mês: perDiem (2 voos ×50)', am3.aeMonth.perDiem, 100);
eq('AE mês: pernoitas €', am3.aeMonth.nightStops, 46);
eq('AE mês: eventos jan (snc+ddo ×60)', am3.aeMonth.events, 120);
eq('AE mês: total c/ eventos', am3.aeMonth.total, 5286);
eq('AE mês: as parcelas SOMAM ao total', +(am3.aeMonth.base + am3.aeMonth.cash + am3.aeMonth.perDiem + am3.aeMonth.nightStops + am3.aeMonth.extras + am3.aeMonth.events).toFixed(2), am3.aeMonth.total);
const mm3 = monthStats(DUTIES, { ym: '2026-03', ae: aeStub3, category: 'CPT', events: EV, now: new Date('2026-04-15T12:00:00') });
eq('AE mês mar: extras da escala (OFC4 1.5×10)', mm3.aeMonth.extras, 15);
eq('AE mês mar: total (sem eventos)', mm3.aeMonth.total, 5035);
// Ano: soma mês a mês pelo MESMO caminho (monthlyAe + eventos) → bate com Σ dos meses.
const ry3 = yearStats(DUTIES, { year: 2026, ae: aeStub3, category: 'CPT', events: EV, now: new Date('2026-04-15T12:00:00') });
eq('AE ano: base (5000×4)', ry3.aeYtd.base, 20000);
eq('AE ano: cash (20×4)', ry3.aeYtd.cash, 80);
eq('AE ano: perDiem', ry3.aeYtd.perDiem, 100);
eq('AE ano: pernoitas €', ry3.aeYtd.nightStops, 46);
eq('AE ano: extras da escala', ry3.aeYtd.extras, 15);
eq('AE ano: eventos (120+60)', ry3.aeYtd.events, 180);
eq('AE ano: total', ry3.aeYtd.total, 20421);
let sumM3 = 0;
for (const mo of ['2026-01', '2026-02', '2026-03', '2026-04']) {
  const mm = monthStats(DUTIES, { ym: mo, ae: aeStub3, category: 'CPT', events: EV, now: new Date('2026-04-15T12:00:00') });
  sumM3 += mm.aeMonth.total;
}
eq('AE: Ano = soma dos Meses', ry3.aeYtd.total, +sumM3.toFixed(2));
// Fallback (AE mínimo sem computeAeMonth/monthExtras): campos novos a 0, total inalterado.
eq('fallback: cash 0', ra.aeYtd.cash, 0);
eq('fallback: eventos 0', ra.aeYtd.events, 0);
eq('fallback: total base+perDiem inalterado', ra.aeYtd.total, 20100);

// ── monthSplit — "Até hoje · resto do mês" do fecho (Nuno, 2026-11-04) ──
// A parte VARIÁVEL do mês dividida pela data (serviços e eventos ≤ hoje vs. depois); os FIXOS (base + abono, €/mês, e os
// subsídios do mês — em novembro o de Natal, bloco 6) à parte. A MESMA conta do total → fixos + até hoje + resto = total, AO CÊNTIMO, sempre.
{
  const { monthSplit } = require(path.resolve('data/stats.js'));
  const ejC = getAe('easyjet', 'cabin');
  const HC = [{ category: 'FA', contract: '12/12', from: '0000-01' }];
  const NOV = {
    '2026-11-02': { report_time: '07:00', block_off: '07:45', block_on: '11:15', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', nightStop: false },
    '2026-11-20': { report_time: '12:20', block_off: '13:05', block_on: '15:50', route: 'LIS-LGW', sectors: 1, kind: 'flight', nightStop: true },
  };
  const EV = [{ type: 'snc', date: '2026-11-02' }, { type: 'ddo', date: '2026-11-25' }];
  const o = (todayISO) => ({ ym: '2026-11', ae: ejC, crewHistory: HC, events: EV, todayISO, now: new Date('2026-11-04T12:00:00') });
  const all = monthStats(NOV, o('2026-11-04')).aeMonth;
  const c2 = (x) => Math.round(x * 100) / 100;
  const sp = monthSplit(NOV, o('2026-11-04'));
  eq('split: fixos = base + abono + subsídio de Natal', sp.fixed, c2(all.base + all.cash + all.annual));
  eq('split: novembro traz o subsídio de Natal (1/14 de 18 852)', all.annual, 1346.57);
  eq('split: fixos + até hoje + resto = total (ao cêntimo)', c2(sp.fixed + sp.toDate + sp.rest), all.total);
  eq('split: total igual ao do monthStats', sp.total, all.total);
  // Até hoje = o variável do mês SÓ com o que tem data ≤ hoje (o voo de 2 + o SNC de 2).
  const past = monthStats({ '2026-11-02': NOV['2026-11-02'] }, { ...o('2026-11-04'), events: [EV[0]] }).aeMonth;
  eq('split: até hoje = variável do serviço e do evento já passados', sp.toDate, c2(past.total - past.base - past.cash - past.annual));
  ok('split: há resto (o LGW de 20 e o DDO de 25)', sp.rest > 0);
  ok('split: até hoje > 0 (o voo de 2 + o SNC)', sp.toDate > 0);
  const fim = monthSplit(NOV, o('2026-11-30'));
  eq('split: no último dia, resto = 0', fim.rest, 0);
  eq('split: no último dia, até hoje = todo o variável', fim.toDate, c2(all.total - all.base - all.cash - all.annual));
  const antes = monthSplit(NOV, o('2026-10-31'));
  eq('split: antes do mês, até hoje = 0', antes.toDate, 0);
  eq('split: antes do mês, resto = todo o variável', antes.rest, c2(all.total - all.base - all.cash - all.annual));
  const mesOnly = monthSplit(NOV, { ...o('2026-11-04'), events: [...EV, { type: 'snc', date: '2026-11' }] });
  ok('split: evento só com o mês (sem dia) conta como já registado (até hoje)', mesOnly.toDate > sp.toDate && c2(mesOnly.rest) === c2(sp.rest));
  eq('split: sem acordo → null', monthSplit(NOV, { ym: '2026-11', todayISO: '2026-11-04' }), null);
}

// Revisão do 8b: o "incerto" do ano diz o motivo dos próprios meses. TAP pilotos 2026: o VB do ano é um intervalo (tapRaise).
{
  const tapP = getAe('tap', 'pilot');
  const ry = yearStats({}, { year: 2026, ae: tapP, category: 'CTE', contract: '12/12', now: new Date('2026-04-15T12:00:00') });
  eq('ano TAP pilotos: incerto pelo VB (tapRaise)', JSON.stringify([ry.aeYtd.uncertain, ry.aeYtd.uncertainReasons]), JSON.stringify([true, ['tapRaise']]));
}
console.log(`\n${fail === 0 ? '✅' : '❌'}  stats: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
