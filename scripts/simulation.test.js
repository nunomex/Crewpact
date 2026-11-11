/*
 * Golden da SIMULAÇÃO ("Posso aceitar este serviço?") — auditoria dos cálculos, bloco 2 (S7), 2026-11-06.
 * Os valores esperados saem do texto oficial em fontes/ (citado em cada caso), nunca do código. A Simulação junta o
 * serviço simulado à escala (o dia SOMADO, não substituído) e verifica tudo o que a lei pede a uma escala com ele:
 *   • o PSV do serviço (ORO.FTL.205) — o herói mostra o MESMO resultado do veredicto (A-248);
 *   • o repouso antes e depois (ORO.FTL.235(a)/(b), CS FTL.1.235(a)(1) e (b)(3)) (A-242);
 *   • a recuperação (ORO.FTL.235(d): 36 h com 2 noites locais, no máximo 168 h entre elas) (A-243);
 *   • o dia somado (ORO.FTL.210 conta por serviço) (A-244);
 *   • 4 setores por serviço em noites seguidas (CS FTL.1.205(a)(1)) (A-245);
 *   • todos os períodos do ORO.FTL.210 que contêm o dia, para trás e para a frente (A-165);
 *   • os limites do acordo da TAP, o mais apertado (A-258).
 * Executar:  node scripts/simulation.test.js   (ou: npm run test:simulation)
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

const { simulateDuty, SIM_RULES } = require(path.resolve('data/simulation.js'));
const { dayFtlFromDuties } = require(path.resolve('ftl/index.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const has = (r, type) => r.issues.some((i) => i.type === type);
const issue = (r, type) => r.issues.find((i) => i.type === type) || null;
const noTs = (p) => { if (!p) return p; const { ts: _t, ...x } = p; return x; };

// Serviço de voo na forma da tabela `duties`.
const F = (report, on, sectors, route = null, extra = {}) => ({ report_time: report, block_on: on, sectors, flight_minutes: sectors * 50, route, kind: 'flight', ...extra });
const OFC = (report, end) => ({ report_time: report, block_on: end, sectors: 0, flight_minutes: 0, route: null, kind: 'office' });
// Contexto como a App o passa: pós-voo de 30 min (OM easyJet, confirmado pelo Nuno), base LIS.
const PIL = { postFlightMin: 30, isPilot: true, base: 'LIS' };
const CAB = { postFlightMin: 30, isPilot: false, base: 'LIS', cabinGapMin: null, splitAdminMin: null };
const sim = (date, d) => ({ duty_date: date, ...d });

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 0 · O texto oficial que os casos usam (fontes/ftl). O teste falha se a citação deixar de estar lá.
{
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-pt.txt'), 'utf8'));
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  const quotes = [
    [reg, 'O período de repouso mínimo previsto antes de um PSV com início na base de afetação deve ser pelo menos igual ao período de serviço precedente, ou de 12 horas, conforme o período que for mais longo'],
    [reg, 'O período de repouso mínimo previsto antes de iniciar um PSV que começa longe da base deve ser pelo menos igual ao período de serviço precedente, ou de 10 horas'],
    [reg, 'é de 36 horas, incluindo 2 noites locais'],
    [reg, 'não poderá, em caso algum, ser superior a 168 horas'],
    [reg, '60 horas de serviço por período de 7 dias consecutivos'],
    [reg, '190 horas de serviço por período de 28 dias consecutivos'],
    [reg, '900 horas de tempo de voo por ano civil'],
    [reg, '1 000 horas de tempo de voo por período de 12 meses consecutivos'],
    [reg, 'um período de serviço que se sobrepõe a parte do período entre as 02h00 e as 04h59'],
    [cs, 'When establishing the maximum FDP for consecutive night duties, the number of sectors is limited to 4 sectors per duty.'],
    [cs, 'If a transition from a late finish/night duty to an early start is planned at home base, the rest period between the 2 FDPs includes 1 local night.'],
    [cs, 'The maximum FDP specified in ORO.FTL.205(b) may be increased by up to 50 % of the break.'],
  ];
  quotes.forEach(([txt, q], i) => eq(`fonte ${i + 1}: «${q.slice(0, 48)}…»`, txt.includes(norm(q)), true));
  // Cada aviso da Simulação cita a sua regra.
  eq('SIM_RULES', [SIM_RULES.restBefore, SIM_RULES.recovery168, SIM_RULES.transitionNight, SIM_RULES.nightSectors, SIM_RULES.limit],
    ['ORO.FTL.235(a)/(b)', 'ORO.FTL.235(d)', 'CS FTL.1.235(a)(1)', 'CS FTL.1.205(a)(1)', 'ORO.FTL.210']);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 1 · A-242 · Repouso ANTES do serviço (ORO.FTL.235(a)/(b)) — piloto e cabine (FTL universal).
for (const [who, C] of [['piloto', PIL], ['cabine', CAB]]) {
  // (1) Na base: 14:00–23:30 + 30 min = fim às 00:00 (serviço de 10:00); simulado às 05:00 → 5:00 de repouso.
  //     Mínimo = máx(12 h, 10:00) = 12:00 → excede.
  const r1 = simulateDuty(sim('2026-11-10', F('05:00', '09:00', 2, 'LIS-OPO-LIS')), { ...C, duties: { '2026-11-09': F('14:00', '23:30', 4, 'LIS-OPO-LIS-OPO-LIS') } });
  eq(`A-242(1) ${who}: repouso antes`, { st: r1.rest.before.status, a: r1.rest.before.actualMin, r: r1.rest.before.requiredMin, p: r1.rest.before.prevIso }, { st: 'bad', a: 300, r: 720, p: '2026-11-09' });
  eq(`A-242(1) ${who}: veredicto`, [r1.verdict, has(r1, 'restBefore')], ['bad', true]);
  // (2) Fora da base: acaba no FNC às 23:30 + 30 = 00:00 (serviço 19:30 → 00:00 = 4:30); simulado no FNC às 07:00 → 7:00.
  //     Mínimo fora da base = máx(10 h, 4:30) = 10:00 → excede.
  const r2 = simulateDuty(sim('2026-11-10', F('07:00', '08:45', 1, 'FNC-LIS')), { ...C, duties: { '2026-11-09': F('19:30', '23:30', 1, 'LIS-FNC') } });
  eq(`A-242(2) ${who}: fora da base`, { st: r2.rest.before.status, a: r2.rest.before.actualMin, r: r2.rest.before.requiredMin, pl: r2.rest.before.place }, { st: 'bad', a: 420, r: 600, pl: 'away' });
  // (3) O serviço anterior manda quando é maior: escritório 06:00–20:00 (14:00); simulado às 08:00 → 12:00 < 14:00. Com 12:00
  //     certas (o mínimo do repouso reduzido na base, CS FTL.1.235(c)(1)) só é legal como repouso reduzido → incerto (2026-11-11, noite
  //     10; antes "curto").
  const r3 = simulateDuty(sim('2026-11-10', F('08:00', '12:00', 2, 'LIS-OPO-LIS')), { ...C, duties: { '2026-11-09': OFC('06:00', '20:00') } });
  eq(`A-242(3) ${who}: serviço anterior maior`, { st: r3.rest.before.status, k: r3.rest.before.kind, a: r3.rest.before.actualMin, r: r3.rest.before.requiredMin }, { st: 'unc', k: 'reducedRest', a: 720, r: 840 });
  // (4) Tardio → matinal na base (CS FTL.1.235(a)(1)): fim às 01:30 de dia 10, simulado às 05:30 de dia 11. 28 h chegam
  //     para o mínimo, mas não têm nenhuma noite local de 8 h (22:00–05:30 = 7:30; 01:30–08:00 = 6:30). Largada às 01:30 é
  //     tardia nos dois tipos (23:00–01:59 e 00:00–01:59) e a entrada às 05:30 é matinal nos dois → certo, não incerto.
  const r4 = simulateDuty(sim('2026-11-11', F('05:30', '09:00', 2, 'LIS-OPO-LIS')), { ...C, duties: { '2026-11-09': F('17:00', '01:00', 2, 'LIS-FNC-LIS') } });
  const t4 = r4.issues.find((i) => i.type === 'recovery' && i.kind === 'transitionNight');
  eq(`A-242(4) ${who}: repouso chega`, r4.rest.before.status, 'ok');
  eq(`A-242(4) ${who}: falta a noite local`, t4 ? { d: t4.date, u: t4.uncertain } : null, { d: '2026-11-11', u: false });
  eq(`A-242(4) ${who}: veredicto`, r4.verdict, 'bad');
}

// Sem serviço antes → nada a medir. Serviço anterior sem fim conhecido → incerto (a lei precisa do fim).
{
  const r = simulateDuty(sim('2026-11-10', F('06:00', '09:00', 2, 'LIS-OPO-LIS')), { ...PIL, duties: {} });
  eq('sem serviço antes: nada a medir, dentro', [r.rest.before, r.verdict], [null, 'ok']);
  const u = simulateDuty(sim('2026-11-10', F('06:00', '09:00', 2, 'LIS-OPO-LIS')), { ...PIL, duties: { '2026-11-09': { report_time: '20:00', block_on: null, sectors: 0, kind: 'office' } } });
  eq('anterior sem fim: incerto', [u.rest.before.status, u.verdict], ['unc', 'unc']);
}

// Repouso DEPOIS: o simulado acaba às 00:00 e o serviço já escalado de dia 11 começa às 06:00 → 6:00 < 12:00.
{
  const r = simulateDuty(sim('2026-11-10', F('14:00', '23:30', 4, 'LIS-OPO-LIS-OPO-LIS')), { ...PIL, duties: { '2026-11-11': F('06:00', '10:00', 2, 'LIS-OPO-LIS') } });
  eq('repouso depois: o serviço seguinte fica curto', { st: r.rest.after.status, a: r.rest.after.actualMin, r: r.rest.after.requiredMin, n: r.rest.after.nextIso }, { st: 'bad', a: 360, r: 720, n: '2026-11-11' });
  eq('repouso depois: veredicto', [r.verdict, has(r, 'restAfter')], ['bad', true]);
  // Largada às 00:00 é tardia nos dois tipos; a entrada às 06:00 só é matinal no tipo tardio (05:00–06:59) → incerto.
  const t = r.issues.find((i) => i.type === 'recovery' && i.kind === 'transitionNight');
  eq('repouso depois: transição tardio→matinal só num tipo → incerta', t ? t.uncertain : null, true);
}

// Dois serviços no MESMO dia com 3:30 entre eles: é um serviço repartido (CS FTL.1.220), não um repouso curto.
{
  const r = simulateDuty(sim('2026-11-10', F('13:00', '15:00', 2, 'LIS-FAO-LIS')), { ...PIL, mode: 'append', duties: { '2026-11-10': F('06:00', '09:00', 2, 'LIS-OPO-LIS') } });
  eq('mesmo dia (repartido): não é aviso de repouso', [has(r, 'restBefore'), r.verdict], [false, 'ok']);
}

// Revisão do bloco 2: depois de um PSV REPARTIDO, o "período de serviço precedente" é o do bloco todo (ORO.FTL.235(a)(1)).
// 06:00–09:00 + 14:00–19:00 (+30): o bloco vai das 06:00 às 19:30 = 13:30; a 11 às 08:00 → 12:30 < 13:30. Com 12:30 (≥ as 12 h
// do repouso reduzido, CS FTL.1.235(c)(1)) só é legal como repouso reduzido → incerto (2026-11-11, noite 10; antes "curto").
{
  const day = { ...F('06:00', '09:00', 2, 'LIS-OPO-LIS', { accommodation: 'basic' }) };
  const next = F('08:00', '12:00', 2, 'LIS-OPO-LIS');
  const a = simulateDuty(sim('2026-11-10', F('14:00', '19:00', 2, 'LIS-FAO-LIS')), { ...PIL, mode: 'append', duties: { '2026-11-10': day, '2026-11-11': next } });
  eq('repartido (simulado = 2.ª metade): repouso depois', { st: a.rest.after.status, a: a.rest.after.actualMin, r: a.rest.after.requiredMin, need: a.rest.need.requiredMin }, { st: 'unc', a: 750, r: 810, need: 810 });
  const b = simulateDuty(sim('2026-11-10', day), { ...PIL, duties: { '2026-11-10': { ...day, extra: [F('14:00', '19:00', 2, 'LIS-FAO-LIS')] }, '2026-11-11': next } });
  eq('repartido (simulado = 1.ª metade): o repouso a seguir é o do bloco', { st: b.rest.after.status, r: b.rest.after.requiredMin, n: b.rest.after.nextIso }, { st: 'unc', r: 810, n: '2026-11-11' });
  eq('repartido: veredicto', [a.verdict, b.verdict], ['unc', 'unc']);
}
// ORO.FTL.235(a)/(b): o mínimo é "antes de um PSV"; a noite local da CS 235(a)(1) é "between the 2 FDPs". Voo até às 00:00 e
// escritório às 06:00 → sem mínimo antes do escritório e sem transição → dentro.
{
  const r = simulateDuty(sim('2026-11-10', F('14:00', '23:30', 4, 'LIS-OPO-LIS-OPO-LIS')), { ...PIL, duties: { '2026-11-11': OFC('06:00', '10:00') } });
  eq('antes de um escritório: sem mínimo', [r.rest.after.status, has(r, 'restAfter'), r.issues.some((i) => i.kind === 'transitionNight'), r.verdict], ['na', false, false, 'ok']);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 2 · A-243 · Recuperação (ORO.FTL.235(d)): no máximo 168 h entre o fim de uma recuperação e o início da seguinte.
//     Serviço a 6, folga a 7 e 8 (recuperação de 6 12:30 a 9 06:00: 65:30 com 3 noites locais), serviços de 9 a 15 às
//     06:00–12:00 (+30). O simulado a 16 às 06:00–12:30 acaba depois de 9 06:00 + 168 h = 16 06:00 → excede.
for (const [who, C] of [['piloto', PIL], ['cabine', CAB]]) {
  const duties = { '2026-11-06': F('06:00', '12:00', 2, 'LIS-OPO-LIS') };
  for (let d = 9; d <= 15; d++) duties[`2026-11-${String(d).padStart(2, '0')}`] = F('06:00', '12:00', 2, 'LIS-OPO-LIS');
  const r = simulateDuty(sim('2026-11-16', F('06:00', '12:00', 2, 'LIS-OPO-LIS')), { ...C, duties });
  const i = r.issues.find((x) => x.type === 'recovery' && x.kind === 'recovery168');
  eq(`A-243 ${who}: 8.º dia seguido`, i ? { d: i.date, u: i.uncertain } : null, { d: '2026-11-16', u: false });
  eq(`A-243 ${who}: veredicto`, r.verdict, 'bad');
  // Sem o simulado a escala está dentro: o aviso é DESTE serviço.
  const r0 = simulateDuty(sim('2026-11-17', F('06:00', '12:00', 2, 'LIS-OPO-LIS')), { ...C, duties: { ...duties } });
  eq(`A-243 ${who}: depois de uma folga a 16 → dentro`, r0.issues.filter((x) => x.type === 'recovery' && x.kind === 'recovery168').length, 0);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 3 · A-244 · O dia SOMADO (ORO.FTL.210 conta por serviço; dois serviços com menos de 12 h entre eles são um PSV repartido).
{
  // T4: dia guardado com 05:00–10:00 e 15:00–21:00. Simular a primária SEM mudar nada tem de dar o mesmo que o Início:
  // a pausa 10:00–15:00 é repartida (5:00 − 30 min = 4:30 contáveis… mas sem saber o alojamento não conta: (e)(1)) →
  // um PSV das 05:00 às 21:00 = 16:00, acima de qualquer máximo do Quadro 2 → excede.
  const prim = F('05:00', '10:00', 2, 'LIS-OPO-LIS'), ext = F('15:00', '21:00', 2, 'LIS-FNC-LIS');
  const r = simulateDuty(sim('2026-11-10', prim), { ...PIL, duties: { '2026-11-10': { ...prim, extra: [ext] } } });
  const home = dayFtlFromDuties([prim, ext], { postFlightMin: 30, isPilot: true, base: 'LIS', date: '2026-11-10' });
  eq('A-244 T4: o dia = o do Início (PSV)', noTs(r.day.psv), noTs(home.psv));
  eq('A-244 T4: o dia = o do Início (serviço)', r.day.servicoMin, home.servicoMin);
  eq('A-244 T4: veredicto', [r.verdict, has(r, 'fdp')], ['bad', true]);
  // Trocar (o modo da App): o preenchido substitui o guardado; os OUTROS serviços do dia continuam a contar.
  const day = { ...F('05:00', '13:30', 2, 'LIS-FNC-LIS') };
  const rep = simulateDuty(sim('2026-11-10', F('20:00', '23:00', 1, 'LIS-OPO')), { ...PIL, duties: { '2026-11-10': day } });
  eq('trocar: só o simulado no dia', rep.day.servicoMin, 210);   // 20:00 → 23:00 + 30
  // Juntar (o motor já o sabe fazer; a UI fica para depois): 05:00–13:30 + 20:00–23:00 com 6:00 entre eles = repartido →
  // um só PSV 05:00 → 23:00 (18:00) → excede; o serviço do dia vai de 05:00 a 23:30 = 18:30.
  const app = simulateDuty(sim('2026-11-10', F('20:00', '23:00', 1, 'LIS-OPO')), { ...PIL, mode: 'append', duties: { '2026-11-10': day } });
  eq('juntar: o dia somado', [app.day.servicoMin, app.verdict, has(app, 'fdp')], [1110, 'bad', true]);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 4 · A-245 · Noites seguidas: máximo 4 setores por serviço (CS FTL.1.205(a)(1)). Serviço noturno = sobrepõe 02:00–04:59.
for (const [who, C] of [['piloto', PIL], ['cabine', CAB]]) {
  // T3: noite de 9 (23:00–05:00, 4 setores) e simulado na noite de 10 (23:00–05:45, 5 setores). PSV 6:45, dentro do
  // Quadro 2 (23:00, 5 setores = 9:30); repouso 05:30 → 23:00 = 17:30. Só os setores excedem.
  const r = simulateDuty(sim('2026-11-10', F('23:00', '05:45', 5)), { ...C, duties: { '2026-11-09': F('23:00', '05:00', 4) } });
  const i = issue(r, 'nightSectors');
  eq(`A-245 ${who}: 5 setores em noites seguidas`, i ? { d: i.date, s: i.sectors } : null, { d: '2026-11-10', s: 5 });
  eq(`A-245 ${who}: veredicto`, [r.verdict, has(r, 'fdp')], ['bad', false]);
}
{
  // Uma noite isolada com 5 setores: o texto fala de noites SEGUIDAS → sem aviso de setores.
  const r = simulateDuty(sim('2026-11-10', F('23:00', '05:45', 5)), { ...PIL, duties: {} });
  eq('A-245: noite isolada com 5 setores → sem aviso', has(r, 'nightSectors'), false);
  // O simulado (3 setores) torna seguida a noite anterior, que tinha 5 → o aviso é dessa noite.
  const n = simulateDuty(sim('2026-11-10', F('23:00', '04:00', 3)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:45', 5) } });
  const i = issue(n, 'nightSectors');
  eq('A-245: a noite anterior passa a seguida', i ? { d: i.date, s: i.sectors } : null, { d: '2026-11-09', s: 5 });
  // Separadas por uma recuperação (36 h com 2 noites locais) já não são seguidas.
  const s = simulateDuty(sim('2026-11-12', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:00', 4) } });
  eq('A-245: depois de uma recuperação já não são seguidas', has(s, 'nightSectors'), false);
  // Uma noite livre pelo meio (noites de 9→10 e 11→12; 41:30 com 1 noite local, sem recuperação). A FAQ da EASA 47617:
  // "'Consecutive' is referring to two night duties only separated by a rest period" — só um repouso pelo meio → seguidas → excede.
  const g = simulateDuty(sim('2026-11-11', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:00', 4) } });
  const gi = issue(g, 'nightSectors');
  eq('A-245: noite livre pelo meio, só repouso → seguidas (FAQ 47617)', gi ? [gi.level, gi.gapNights] : null, ['bad', 1]);
  eq('A-245: noite livre pelo meio → veredicto', g.verdict, 'bad');
  // Um serviço NÃO noturno pelo meio, separado por repouso (escritório no dia 10, 16:00–20:00: 11 h depois do PSV de 9, 27 h antes
  // do de 11) quebra a sequência (FAQ 47617).
  const go = simulateDuty(sim('2026-11-11', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:00', 4), '2026-11-10': { kind: 'office', report_time: '16:00', block_on: '20:00', sectors: 0 } } });
  eq('A-245: escritório de dia pelo meio → já não são seguidas', has(go, 'nightSectors'), false);
  // A reserva e a assistência em casa não são repouso ("free of all duties, standby and reserve", ORO.FTL.105(21)) mas também
  // não são claramente um serviço → duas leituras → incerto (revisão do 8b, E3).
  const gr = simulateDuty(sim('2026-11-11', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:00', 4), '2026-11-10': { kind: 'reserve', report_time: '10:00', block_on: '16:00', sectors: 0 } } });
  eq('A-245: reserva pelo meio → incerto', (issue(gr, 'nightSectors') || {}).level, 'unc');
  // Um serviço sem horas pelo meio: pode ser de dia (quebra) ou não → incerto (E1).
  const gn = simulateDuty(sim('2026-11-11', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:00', 4), '2026-11-10': { kind: 'office', report_time: null, block_on: null, sectors: 0 } } });
  eq('A-245: escritório sem horas pelo meio → incerto', (issue(gn, 'nightSectors') || {}).level, 'unc');
  // Um posicionamento colado ao PSV (21:00–23:30, apresentação às 00:30) não é separado por repouso → não quebra (E2).
  const gp = simulateDuty(sim('2026-11-11', F('00:30', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('23:00', '05:00', 4), '2026-11-10': { kind: 'positioning', report_time: '21:00', block_on: '23:30', sectors: 0 } } });
  eq('A-245: posicionamento colado ao PSV não quebra → excede', (issue(gp, 'nightSectors') || {}).level, 'bad');
  // 2.ª revisão, E1: um PSV de dia (ou assistência no aeroporto, que é PSV) pelo meio segue as mesmas regras dos intervalos.
  // a: 9/11 22:00–02:00 (5 setores); PSV no dia 10 08:00–12:00 (5:30 depois de a) → incerto, não "quebra".
  const gf = simulateDuty(sim('2026-11-11', F('00:30', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('22:00', '02:00', 5), '2026-11-10': F('08:00', '12:00', 2) } });
  eq('A-245: PSV de dia a 5:30 de uma noite → incerto', (issue(gf, 'nightSectors') || {}).level, 'unc');
  // E2: uma reserva ou assistência em casa NOTURNA pelo meio também é dúvida (não é repouso nem claramente serviço).
  const gsn = simulateDuty(sim('2026-11-11', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': F('22:00', '02:30', 5), '2026-11-10': { kind: 'reserve', report_time: '20:00', block_on: '06:00', sectors: 0 } } });
  eq('A-245: reserva noturna pelo meio → incerto', (issue(gsn, 'nightSectors') || {}).level, 'unc');
  // E3: um serviço sem horas no próprio dia de uma das noites também pode estar entre elas → incerto.
  const gsd = simulateDuty(sim('2026-11-11', F('23:00', '05:45', 5)), { ...PIL, duties: { '2026-11-09': { ...F('23:00', '05:00', 4), extra: [{ kind: 'office', report_time: null, block_on: null, sectors: 0 }] } } });
  eq('A-245: escritório sem horas no dia da 1.ª noite → incerto', (issue(gsd, 'nightSectors') || {}).level, 'unc');
  // O Início usa a MESMA regra para o serviço de hoje (nightSectorIssues com o alvo do dia): noites de 9 e 10, 5 setores no dia 10.
  const { nightSectorIssues } = require(path.resolve('data/simulation.js'));
  const escH = { '2026-11-09': F('23:00', '05:00', 4), '2026-11-10': F('23:00', '05:45', 5) };
  const ih = nightSectorIssues(escH, '2026-11-10', { postFlightMin: 0, isPilot: true }, () => null, (f) => f.iso === '2026-11-10');
  eq('Início: o serviço de hoje com 5 setores na 2.ª noite seguida → excede', ih.map((x) => [x.level, x.it.date, x.it.sectors]), [['bad', '2026-11-10', 5]]);
  eq('Início: um dia sem noite não tem aviso', nightSectorIssues(escH, '2026-11-12', { postFlightMin: 0, isPilot: true }, () => null, (f) => f.iso === '2026-11-12'), []);
  // ── Noite no fuso de aclimatação (ORO.FTL.105(9): "no fuso horário a que o tripulante está aclimatado"), não nas horas da
  // escala, que estão no fuso de cada aeroporto. Base LIS, julho (LIS UTC+1, GRU UTC−3: 4 h).
  const { fdpsBetween } = require(path.resolve('data/simulation.js'));
  const LG = F('17:00', '00:30', 1, 'LIS-GRU', { legs: [{ dep: 'LIS', arr: 'GRU', off: '18:00', on: '00:30' }] });
  const SH = F('21:00', '22:15', 1, 'GRU-VCP', { legs: [{ dep: 'GRU', arr: 'VCP', off: '21:30', on: '22:15' }] });
  const PO = { postFlightMin: 30, isPilot: true };
  const nf = (esc, iso) => fdpsBetween(esc, iso, iso, PO, () => 'LIS').map((f) => [f.night, !!f.nightUnc]);
  // (1) Em faixa (parte da base): LIS 17:00 → GRU 00:30 locais = 03:30Z; com o pós-voo acaba às 05:00 de Lisboa → noturno.
  // Pelas horas da escala (17:00–01:00) não seria.
  eq('Aclimatação: LIS→GRU acaba às 05:00 de Lisboa → noturno (tempo decorrido real)', nf({ '2026-07-10': LG }, '2026-07-10'), [[true, false]]);
  // (2) Estado B (Quadro 1: menos de 48 h desde a última apresentação na faixa da base): em GRU às 21:00 locais = 01:00 de
  // Lisboa, até 02:45 de Lisboa → noturno pela hora da base. Pela hora local (21:00–22:45) não seria.
  eq('Aclimatação B: GRU 21:00–22:45 locais = 01:00–02:45 de Lisboa → noturno', nf({ '2026-07-10': LG, '2026-07-11': SH }, '2026-07-11'), [[true, false]]);
  // (3) Por saber (o 1.º registo da escala, fora da faixa): pela base é noturno, pela hora local não → incerto.
  eq('Aclimatação por saber: as duas leituras discordam → incerto', nf({ '2026-07-11': SH }, '2026-07-11'), [[true, true]]);
  // (4) Estado D (120 h ou mais: aclimatado ao fuso local): 21:00–22:45 em GRU → não noturno.
  eq('Aclimatação D: 21:00–22:45 locais → não noturno', nf({ '2026-07-01': F('08:00', '12:00', 2), '2026-07-11': SH }, '2026-07-11'), [[false, false]]);
  // A regra dos 4 setores vê-o: noite em Lisboa (9, 5 setores) e o LIS→GRU de 10 (noturno pela hora de Lisboa) → seguidas.
  const escG = { '2026-07-09': F('22:00', '04:00', 5), '2026-07-10': LG };
  eq('Aclimatação: a noite anterior com 5 setores fica seguida do LIS→GRU → excede',
    nightSectorIssues(escG, '2026-07-10', PO, () => 'LIS', (f) => f.iso === '2026-07-10').map((x) => [x.level, x.it.date, x.it.sectors]), [['bad', '2026-07-09', 5]]);
  // Com a aclimatação por saber, a noite que só uma leitura dá → incerto, com o motivo.
  const escU = { '2026-07-11': SH, '2026-07-12': F('22:00', '04:00', 5, 'GRU-GIG') };
  const iu = nightSectorIssues(escU, '2026-07-11', PO, () => 'LIS', (f) => f.iso === '2026-07-11');
  eq('Aclimatação por saber: 5 setores na noite seguinte → incerto, motivo aclimatação', iu.map((x) => [x.level, x.it.date, x.it.why]), [['unc', '2026-07-12', 'acclim']]);
  // ── Revisão independente (2026-11-08) ──
  // R1: um dia com 2 PSV noturnos (A 01:00–04:30 · reserva 08:00–12:00 · B 22:00–03:00 com 5 setores) e a noite seguinte só com
  // repouso pelo meio (C 23:00–04:00): o par B–C não tem dúvida → B excede. Antes só se olhava à volta do 1.º bloco (A–B: incerto).
  const RSV = { kind: 'reserve', report_time: '08:00', block_on: '12:00', sectors: 0, flight_minutes: 0 };
  const esc2b = { '2026-11-10': { ...F('01:00', '04:30', 2), extra: [RSV, F('22:00', '03:00', 5)] }, '2026-11-11': F('23:00', '04:00', 3) };
  eq('Revisão R1: dia com 2 PSV noturnos → o 2.º excede pela noite seguinte',
    nightSectorIssues(esc2b, '2026-11-10', PO, () => 'LIS', (f) => f.iso === '2026-11-10').filter((x) => x.it.date === '2026-11-10').map((x) => [x.level, x.it.sectors]), [['bad', 5]]);
  // R2: o serviço anterior sem pernas situa-se pela rota (LIS→GRU: apresentação em Lisboa, na faixa da base) → B → noturno.
  eq('Revisão R2: o anterior sem pernas, com rota → B → noturno', nf({ '2026-07-10': F('17:00', '00:30', 1, 'LIS-GRU'), '2026-07-11': SH }, '2026-07-11'), [[true, false]]);
  // Sem pernas nem rota não se situa: pela base seria B (32 h), sem ele D → a letra muda → por saber → incerto.
  eq('Revisão R2: o anterior sem pernas nem rota → por saber → incerto', nf({ '2026-07-10': F('17:00', '00:30', 1), '2026-07-11': SH }, '2026-07-11'), [[true, true]]);
  // R3: um bloco de 2 serviços (base OPO: OPO→LIS 14:00–15:00 e, 1:45 depois, LIS→EWR 18:15 → 21:30 locais = 01:30Z): com o
  // pós-voo acaba às 03:00 de Lisboa/Porto → noturno, como o mesmo trajeto num só serviço. Antes ficava o tempo do relógio.
  const opo = F('13:00', '15:00', 1, 'OPO-LIS', { legs: [{ dep: 'OPO', arr: 'LIS', off: '14:00', on: '15:00' }] });
  const ewr = F('17:15', '21:30', 1, 'LIS-EWR', { legs: [{ dep: 'LIS', arr: 'EWR', off: '18:15', on: '21:30' }] });
  eq('Revisão R3: bloco de 2 serviços até às 03:00 da base → noturno', fdpsBetween({ '2026-07-10': { ...opo, extra: [ewr] } }, '2026-07-10', '2026-07-10', PO, () => 'OPO').map((f) => [f.night, !!f.nightUnc]), [[true, false]]);
  // R3b: a última perna é um posicionamento (GRU→GIG em DH): o período de serviço acaba nos calços dela (ORO.FTL.105(9) fala do
  // período de serviço). LIS 13:00 → GRU 20:00 (23:00Z), DH GRU→GIG 21:00–22:00 (01:00Z) + pós-voo = 02:30 de Lisboa → noturno.
  const dhd = F('13:00', '22:00', 1, 'LIS-GRU-GIG', { legs: [{ dep: 'LIS', arr: 'GRU', off: '14:00', on: '20:00' }, { dep: 'GRU', arr: 'GIG', off: '21:00', on: '22:00', dh: true }] });
  eq('Revisão R3b: posicionamento no fim conta para a noite', nf({ '2026-07-10': dhd }, '2026-07-10'), [[true, false]]);
  // R4: em faixa a "faixa de 2 h" (ORO.FTL.105(1)) é uma convenção → o conservador: noturno se a hora da partida, da base ou da
  // chegada (dentro da faixa) o der. LIS 21:30 → BCN 02:15 locais + pós-voo = 02:45 de Barcelona (01:45 de Lisboa) → noturno, sem
  // "incerto"; com a noite anterior de 5 setores → excede (como antes de medir no fuso de aclimatação).
  const bcn = F('21:30', '02:15', 1, 'LIS-BCN', { legs: [{ dep: 'LIS', arr: 'BCN', off: '22:30', on: '02:15' }] });
  eq('Revisão R4: LIS→BCN até às 02:45 de Barcelona → noturno (faixa conservadora)', nf({ '2026-07-10': bcn }, '2026-07-10'), [[true, false]]);
  eq('Revisão R4: a noite anterior com 5 setores → excede',
    nightSectorIssues({ '2026-07-09': F('22:00', '04:00', 5), '2026-07-10': bcn }, '2026-07-10', PO, () => 'LIS', (f) => f.iso === '2026-07-10').map((x) => [x.level, x.it.date, x.it.sectors]), [['bad', '2026-07-09', 5]]);
  // ── 2.ª revisão (2026-11-08) ──
  // Uma assistência no aeroporto (sem pernas) antes do voo, no mesmo bloco: o fuso vem do voo (B → hora de Lisboa) → noturno.
  const SBA = { kind: 'standby_airport', report_time: '19:30', block_on: '21:00', sectors: 0, flight_minutes: 0 };
  eq('2.ª revisão: assistência antes do voo no mesmo bloco → o fuso vem do voo → noturno', nf({ '2026-07-10': LG, '2026-07-11': { ...SBA, extra: [SH] } }, '2026-07-11'), [[true, false]]);
  // Dois PSV noturnos no mesmo dia, os dois com mais de 4 setores → um aviso cada, com os seus setores.
  const esc2c = { '2026-11-10': { ...F('01:00', '04:30', 6), extra: [F('22:00', '03:00', 5)] }, '2026-11-11': F('23:00', '04:00', 3) };
  eq('2.ª revisão: 2 PSV noturnos no mesmo dia acima de 4 setores → um aviso cada',
    nightSectorIssues(esc2c, '2026-11-10', PO, () => 'LIS', (f) => f.iso === '2026-11-10').filter((x) => x.it.date === '2026-11-10').map((x) => [x.level, x.it.sectors]), [['bad', 6], ['bad', 5]]);
  // A citação da FAQ confere-se na cópia em fontes/ (como as outras fontes).
  const faq = require('fs').readFileSync(require('path').resolve('fontes/easa/faq-47617.txt'), 'utf8');
  const simSrc = require('fs').readFileSync(require('path').resolve('data/simulation.js'), 'utf8').replace(/\s*\/\/\s*/g, ' ').replace(/\s+/g, ' ');
  const quote = "'Consecutive' is referring to two night duties only separated by a rest period";
  eq('fonte: FAQ EASA 47617 literal em fontes/ e citada na Simulação', [faq.includes(quote), simSrc.includes(quote)], [true, true]);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 5 · A-165 · Todos os períodos do ORO.FTL.210 que contêm o dia (60 h em 7 dias), para trás e para a frente.
{
  // 5 dias de escritório 07:00–18:00 (11:00 cada = 55:00) e o simulado de 8:00 a seguir → 9 a 15 = 63:00 > 60:00.
  const back = {};
  for (let d = 10; d <= 14; d++) back[`2026-11-${d}`] = OFC('07:00', '18:00');
  const r = simulateDuty(sim('2026-11-15', OFC('08:00', '16:00')), { ...PIL, duties: back });
  const i = r.issues.find((x) => x.type === 'limit' && x.key === 'servico' && x.id === '7d');
  eq('A-165: 7 dias para trás', i ? { d: i.doneMin, l: i.limitMin, o: i.overMin, f: i.from, t: i.to } : null, { d: 3780, l: 3600, o: 180, f: '2026-11-09', t: '2026-11-15' });
  eq('A-165: veredicto', r.verdict, 'bad');
  // As 55 h escaladas nos 5 dias SEGUINTES: o 1.º período de 7 dias com 63:00 é de 14 a 20.
  const fwd = {};
  for (let d = 16; d <= 20; d++) fwd[`2026-11-${d}`] = OFC('07:00', '18:00');
  const f = simulateDuty(sim('2026-11-15', OFC('08:00', '16:00')), { ...PIL, duties: fwd });
  const j = f.issues.find((x) => x.type === 'limit' && x.key === 'servico' && x.id === '7d');
  eq('A-165: 7 dias para a frente', j ? { d: j.doneMin, f: j.from, t: j.to } : null, { d: 3780, f: '2026-11-14', t: '2026-11-20' });
  // Ano civil (900 h) e 12 meses seguidos (1 000 h): o registo do ano e o que vem a seguir contam.
  const y = simulateDuty(sim('2026-11-10', F('08:00', '10:00', 1, 'LIS-OPO', { flight_minutes: 120 })), { ...PIL, duties: {}, dayLog: { '2026-06-01': { vooMin: 899 * 60 } } });
  const yi = y.issues.find((x) => x.type === 'limit' && x.key === 'voo' && x.id === 'year');
  eq('A-165: ano civil', yi ? { d: yi.doneMin, l: yi.limitMin } : null, { d: 901 * 60, l: 900 * 60 });
  const m = simulateDuty(sim('2026-11-10', F('08:00', '10:00', 1, 'LIS-OPO', { flight_minutes: 120 })), { ...PIL, duties: {}, dayLog: { '2027-03-01': { vooMin: 999 * 60 } } });
  const mi = m.issues.find((x) => x.type === 'limit' && x.key === 'voo' && x.id === '12m');
  eq('A-165: 12 meses para a frente', mi ? { d: mi.doneMin, t: mi.to } : null, { d: 1001 * 60, t: '2027-03-01' });
  eq('A-165: o ano de 2027 não contém o dia', m.issues.some((x) => x.type === 'limit' && x.id === 'year'), false);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 6 · A-258 · TAP: o limite do acordo, o mais apertado. Apresentação 07:30, 4 aterragens, calços 19:15.
//     EASA: Quadro 2 (0600–1329, 4 setores) = 12:00; PSV 11:45 → dentro; calços até 07:30 + 12:00 = 19:30.
//     AE TAP: cabine Cl. 23.ª n.º 1 e pilotos Cl. 35.ª n.º 1, 7h00–7h59 = 12h00, contado até 30 min depois dos calços:
//     19:45 − 07:30 = 12:15 > 12:00 → excede 0:15; calços até 07:30 + 12:00 − 0:30 = 19:00.
for (const [who, C, ct] of [['cabine', CAB, 'cabin'], ['piloto', PIL, 'pilot']]) {
  const s = sim('2026-11-10', F('07:30', '19:15', 4, 'LIS-FNC-LIS-FNC-LIS'));
  const r = simulateDuty(s, { ...C, duties: {}, tap: { isTapAt: () => true, crewType: ct } });
  const i = issue(r, 'aeFdp');
  eq(`A-258 ${who}: excede o acordo`, i ? { st: i.status, x: i.excessMin } : null, { st: 'bad', x: 15 });
  eq(`A-258 ${who}: calços até (o mais apertado)`, [r.psv.latest, r.psv.latestSource], ['19:00', 'AE']);
  eq(`A-258 ${who}: veredicto`, r.verdict, 'bad');
  const e = simulateDuty(s, { ...C, duties: {} });
  eq(`A-258 ${who}: fora da TAP só a EASA`, [has(e, 'aeFdp'), e.psv.latest, e.verdict], [false, '19:30', 'ok']);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 7 · A-248 · O herói mostra o MESMO resultado do veredicto (o repartido tirado das legs). T6: apresentação 05:15;
//     LIS-FNC 06:00–07:45, FNC-LIS 08:30–10:15, pausa até às 15:00, LIS-OPO 15:00–16:00, OPO-LIS 16:45–17:45.
//     Pausa 10:15 → 15:00 = 4:45 − 30 min (CS 220(b)) = 4:15 contáveis, com alojamento (não adequado, 4:15 < 6 h, fora do WOCL).
//     Quadro 2 (0515–0529, 4 setores) = 11:15 + até 50 % da pausa (CS 220(c)) = 2:07:30 → 2:07 (até, nunca para cima)
//     → máximo 13:22, calços até às 18:37. PSV 12:30 → dentro.
{
  const legs = [
    { dep: 'LIS', arr: 'FNC', off: '06:00', on: '07:45' }, { dep: 'FNC', arr: 'LIS', off: '08:30', on: '10:15' },
    { dep: 'LIS', arr: 'OPO', off: '15:00', on: '16:00' }, { dep: 'OPO', arr: 'LIS', off: '16:45', on: '17:45' },
  ];
  const t6 = { report_time: '05:15', block_off: '06:00', block_on: '17:45', sectors: 4, flight_minutes: 330, route: 'LIS-FNC-LIS-OPO-LIS', kind: 'flight', legs, accommodation: 'basic' };
  const r = simulateDuty(sim('2026-11-10', t6), { ...PIL, duties: {} });
  eq('A-248: herói = veredicto', { res: r.psv.result, max: r.psv.max, lat: r.psv.latest, over: r.psv.over }, { res: r.day.psv.result, max: r.day.psv.max, lat: r.day.psv.latest, over: r.day.psv.over });
  eq('A-248: máximo com o repartido', [r.psv.result, r.psv.max, r.psv.latest, r.verdict], ['12:30', '13:22', '18:37', 'ok']);
  // Contas ao minuto inteiro: pausa 10:15 → 14:21 = 4:06, alojamento adequado (CS 220(d)) → 3:36 contáveis → até +1:48 →
  // 11:15 + 1:48 = 13:03 (as horas decimais davam 245,999… min e o arredondamento para baixo perdia 1 minuto).
  const legs2 = [legs[0], legs[1], { dep: 'LIS', arr: 'OPO', off: '14:21', on: '15:21' }, { dep: 'OPO', arr: 'LIS', off: '16:06', on: '17:06' }];
  const r2 = simulateDuty(sim('2026-11-10', { ...t6, legs: legs2, block_on: '17:06', accommodation: true }), { ...PIL, duties: {} });
  eq('CS 220(c): pausa de 4:06 → máximo 13:03', r2.psv.max, '13:03');
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// 8 · O simulado muda os OUTROS dias: com ele, o prolongamento planeado de dia 14 passa a ser o 3.º em 7 dias
//     (ORO.FTL.205(d)(1): "não mais do que duas vezes em cada período de 7 dias consecutivos").
//     07:00, 2 setores: Quadro 2 = 13:00; prolongado (CS FTL.1.205(b)) = 14:00. PSV 13:30 → só com o prolongamento.
{
  const X = (extra = {}) => F('07:00', '20:30', 2, 'LIS-FNC-LIS', { special: { plannedExt: true }, ...extra });
  const duties = { '2026-11-12': X(), '2026-11-14': X() };
  const r = simulateDuty(sim('2026-11-10', X()), { ...PIL, duties });
  const i = issue(r, 'fdpOther');
  eq('205(d)(1): o 3.º prolongamento em 7 dias é o de dia 14', i ? i.date : null, '2026-11-14');
  eq('205(d)(1): o simulado em si é o 1.º → dentro', has(r, 'fdp'), false);
  eq('205(d)(1): veredicto', r.verdict, 'bad');
}

// ───────────────────────────────────────────────────────────────────────────────
// O SÍTIO: a partida não bate com a última chegada (pendência de 2026-11-04: pernoita em LGW e o serviço seguinte a partir de
// LIS, sem posicionamento na escala). Onde se está decide o repouso (12 h na base, 10 h fora, ORO.FTL.235(a)/(b)) e a
// pernoita — a app não inventa a viagem que falta: avisa (incerto).
{
  const { issueText } = require(path.resolve('data/simulation.js'));
  const base = { '2026-03-10': F('08:00', '11:00', 1, 'LIS-LGW') };
  const r = simulateDuty(sim('2026-03-11', F('12:00', '18:00', 2, 'LIS-FNC-LIS')), { duties: base, ...PIL });
  const g = issue(r, 'placeGap');
  eq('sítio: parte de LIS depois de acabar em LGW → incerto', [g && g.level, g && g.dep, g && g.from, g && g.prevIso, r.verdict], ['unc', 'LIS', 'LGW', '2026-03-10', 'unc']);
  eq('sítio: o texto diz de onde e desde quando', issueText(g, 'pt', '2026-03-11'), 'parte de LIS, mas o serviço de 10/3 acabou em LGW — falta um posicionamento na escala?');
  // Encaixa: sem aviso.
  eq('sítio: parte de onde acabou → sem aviso', has(simulateDuty(sim('2026-03-11', F('12:00', '18:00', 1, 'LGW-LIS')), { duties: base, ...PIL }), 'placeGap'), false);
  // Um posicionamento pelo meio (com rota) fecha a cadeia.
  const withPos = { ...base, '2026-03-10': { ...base['2026-03-10'], extra: [{ kind: 'positioning', report_time: '12:00', block_on: '15:00', sectors: 0, flight_minutes: 0, route: 'LGW-LIS' }] } };
  eq('sítio: com o posicionamento na escala → sem aviso', has(simulateDuty(sim('2026-03-11', F('12:00', '18:00', 2, 'LIS-FNC-LIS')), { duties: withPos, ...PIL }), 'placeGap'), false);
  // Revisão independente (E3): um posicionamento SEM rota pelo meio (o calendário nem sempre a traz) — não se sabe para onde
  // foi, mas a viagem está na escala: não se avisa que falta.
  const posNoRoute = { ...base, '2026-03-11': { kind: 'positioning', report_time: '09:00', block_on: '12:00', sectors: 0, flight_minutes: 0, route: null } };
  eq('sítio: posicionamento sem rota pelo meio → sem aviso', has(simulateDuty(sim('2026-03-12', F('12:00', '18:00', 2, 'LIS-FNC-LIS')), { duties: posNoRoute, ...PIL }), 'placeGap'), false);
  // Um dia de escritório (sem rota) pelo meio não diz onde se está: o aviso mantém-se.
  const withOfc = { ...base, '2026-03-11': OFC('09:00', '13:00') };
  eq('sítio: escritório pelo meio não fecha a cadeia', has(simulateDuty(sim('2026-03-12', F('12:00', '18:00', 2, 'LIS-FNC-LIS')), { duties: withOfc, ...PIL }), 'placeGap'), true);
  // Mais de 7 dias depois (férias, folgas): já não se avisa.
  eq('sítio: 8 dias depois → sem aviso', has(simulateDuty(sim('2026-03-18', F('12:00', '18:00', 2, 'LIS-FNC-LIS')), { duties: base, ...PIL }), 'placeGap'), false);
  // O serviço simulado acaba num sítio e o SEGUINTE parte de outro.
  const nxt = { '2026-03-12': F('12:00', '18:00', 2, 'LIS-FNC-LIS') };
  const ra = simulateDuty(sim('2026-03-11', F('08:00', '11:00', 1, 'LIS-LGW')), { duties: nxt, ...PIL });
  const ga = issue(ra, 'placeGap');
  eq('sítio: acaba em LGW e o seguinte parte de LIS', [ga && ga.next, ga && ga.arr, ga && ga.dep, ga && ga.nextIso], [true, 'LGW', 'LIS', '2026-03-12']);
  eq('sítio: o texto do seguinte', issueText(ga, 'pt', '2026-03-11'), 'acaba em LGW, mas o serviço de 12/3 parte de LIS — falta um posicionamento na escala?');
  // Dois serviços no mesmo dia: o 2.º parte de onde o 1.º NÃO acabou.
  const two = { '2026-03-11': F('06:00', '08:00', 1, 'LIS-FNC') };
  const r2 = simulateDuty(sim('2026-03-11', F('20:00', '22:00', 1, 'LIS-OPO')), { duties: two, ...PIL, mode: 'append' });
  eq('sítio: 2.º serviço do dia a partir de outro aeroporto', [(issue(r2, 'placeGap') || {}).from, (issue(r2, 'placeGap') || {}).prevIso], ['FNC', '2026-03-11']);
  // Pelas pernas (a rota pode faltar): a 1.ª partida e a última chegada.
  const legsOnly = { '2026-03-10': { ...F('08:00', '11:00', 1, null), legs: [{ dep: 'LIS', arr: 'LGW', off: '08:30', on: '11:00' }] } };
  eq('sítio: pelas pernas, sem rota', (issue(simulateDuty(sim('2026-03-11', F('12:00', '18:00', 2, 'LIS-FNC-LIS')), { duties: legsOnly, ...PIL }), 'placeGap') || {}).from, 'LGW');
}

// ───────────────────────────────────────────────────────────────────────────────
// A MEMÓRIA do formulário (`ctx.memo`): o que só depende da escala guardada (a recuperação e os limites TAP SEM o simulado)
// calcula-se uma vez por abertura, não a cada tecla. O resultado tem de ser exatamente o mesmo, com e sem ela, à 1.ª e à 2.ª.
{
  const yr = {};
  for (let i = 0, d = new Date(2026, 0, 1, 12); i < 120; i++, d.setDate(d.getDate() + 1)) {
    if (i % 6 >= 4) continue;
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    yr[k] = { ...F('05:30', '14:30', 4, 'LIS-MAD-LIS-OPO-LIS'), legs: [{ dep: 'LIS', arr: 'MAD', off: '06:30', on: '08:50' }, { dep: 'MAD', arr: 'LIS', off: '09:30', on: '09:50' }, { dep: 'LIS', arr: 'OPO', off: '11:00', on: '12:00' }, { dep: 'OPO', arr: 'LIS', off: '13:30', on: '14:30' }] };
  }
  const strip = (r) => JSON.stringify(r, (k, v) => (k === 'ts' ? undefined : v));
  const tap = { isTapAt: () => true, crewType: 'cabin', fleetAt: () => 'NB' };
  for (const [name, extra] of [['easyJet', {}], ['TAP', { tap }]]) {
    const memo = new Map();
    const s1 = sim('2026-03-05', F('04:00', '15:00', 4, 'LIS-MAD-LIS-OPO-LIS')), s2 = sim('2026-03-05', F('12:00', '23:30', 2, 'LIS-FNC-LIS'));
    const plain1 = strip(simulateDuty(s1, { duties: yr, ...CAB, ...extra })), plain2 = strip(simulateDuty(s2, { duties: yr, ...CAB, ...extra }));
    eq(`memória (${name}): 1.ª conta igual`, strip(simulateDuty(s1, { duties: yr, ...CAB, ...extra, memo })) === plain1, true);
    eq(`memória (${name}): 2.ª conta (outro serviço, a mesma memória) igual`, strip(simulateDuty(s2, { duties: yr, ...CAB, ...extra, memo })) === plain2, true);
    eq(`memória (${name}): ficou guardada`, memo.size > 0, true);
    // Outro dia: a recuperação de base é a desse dia (a chave leva a data).
    const s3 = sim('2026-04-10', F('04:00', '15:00', 4, 'LIS-MAD-LIS-OPO-LIS'));
    eq(`memória (${name}): outro dia igual`, strip(simulateDuty(s3, { duties: yr, ...CAB, ...extra, memo })) === strip(simulateDuty(s3, { duties: yr, ...CAB, ...extra })), true);
  }
}

console.log(`\nSimulação: ${ok} ok · ${fail} falha(s)`);
if (fail) process.exit(1);
