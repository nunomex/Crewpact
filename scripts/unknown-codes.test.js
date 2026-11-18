/*
 * Golden da CAMADA 2 dos códigos que a app não conhece (sessão Fable 5.2, ponto 9, 2026-11-17): o MOTOR conta-os com as duas
 * pontas, sem nunca escolher ("a lei é que manda"). Um evento com horas e forma de código pode ser um serviço ou não ser nada:
 *   · ORO.FTL.210 — no mínimo nada, no máximo a duração do evento (menos o que já conta como serviço);
 *   · ORO.FTL.235 — o repouso à volta dele: curto só se o for em todas as leituras, certo só se o for em todas;
 *   · recuperação (ORO.FTL.235(d)) e noites seguidas (CS FTL.1.205(a)(1)) — o que só uma leitura dá fica incerto.
 * Executar:  node scripts/unknown-codes.test.js   (ou: npm run test:unknown)
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

const { unknownSpans, unknownDayMax, withUnknownAs, hasUnknown } = require(path.resolve('ftl/unknownCodes.js'));
const { reconcileDayLog, limitsAround, computeDutyTime } = require(path.resolve('ftl/index.js'));
const { restStatus, restUntilAfter, restVerdicts, restAround, legalStatus, recoveryIssues } = require(path.resolve('data/today.js'));
const { nightSectorIssues, simulateDuty, issueText } = require(path.resolve('data/simulation.js'));
const { restItem, buildTodayItems } = require(path.resolve('data/hojeItems.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const at = (iso, hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };
const F = (rep, on, route = 'LIS-FNC-LIS', sectors = 2) => ({ kind: 'flight', report_time: rep, block_on: on, route, sectors, flight_minutes: 240 });
const U = (code, start, end) => ({ code, title: `${code} ${start}-${end}`, start, end });
const C = { base: 'LIS', postFlightMin: 30, isPilot: true };

// ── 1 · Os eventos no tempo ──
{
  const unk = { '2026-07-01': [U('SBYX', '06:00', '14:00')], '2026-07-02': [U('XQT', '22:00', '06:30')], '2026-07-04': [{ code: 'ZZ', title: 'ZZ', start: null, end: null }] };
  const sp = unknownSpans(unk);
  eq('eventos: por ordem, com a duração (o que passa a meia-noite acaba no dia seguinte; sem horas não se situa)',
    sp.map((u) => [u.iso, u.code, Math.round((+u.end - +u.start) / 60000), u.end.getDate()]), [['2026-07-01', 'SBYX', 480, 1], ['2026-07-02', 'XQT', 510, 3]]);
  eq('há códigos novos?', [hasUnknown(unk), hasUnknown({}), hasUnknown(null), hasUnknown({ '2026-07-01': [] })], [true, false, false, false]);
  // O máximo por DIA LOCAL: o que passa a meia-noite reparte-se (22:00–24:00 = 2 h; 00:00–06:30 = 6 h 30).
  eq('máximo por dia local', unknownDayMax(unk, {}), { '2026-07-01': { min: 480, codes: ['SBYX'], voo: 480 }, '2026-07-02': { min: 120, codes: ['XQT'], voo: 120, spill: true }, '2026-07-03': { min: 390, codes: ['XQT'], voo: 390 } });
  // Um voo das 05:00 às 10:00 (+30 de pós-voo) no mesmo dia: o que o código tem DENTRO do voo já é serviço — só acrescenta o resto.
  eq('máximo: menos o que já conta como serviço (06:00–10:30 está dentro do voo)', unknownDayMax(unk, { '2026-07-01': F('05:00', '10:00') }, { postFlightMin: 30 })['2026-07-01'], { min: 210, codes: ['SBYX'], voo: 210 });
  eq('máximo: um código todo dentro de um serviço não acrescenta nada', unknownDayMax({ '2026-07-01': [U('MEAL', '07:00', '07:30')] }, { '2026-07-01': F('05:00', '10:00') }, { postFlightMin: 30 }), {});
  // A assistência em casa só conta 25 % (CS FTL.1.225(b)(3)): o código por cima dela pode ser um serviço inteiro — não se desconta.
  eq('máximo: por cima de uma assistência em casa não se desconta', unknownDayMax(unk, { '2026-07-01': { kind: 'standby_home', report_time: '06:00', block_on: '14:00', sectors: 0 } })['2026-07-01'].min, 480);
  // As leituras "é um serviço": entram na escala (só para comparar).
  const asOfc = withUnknownAs({ '2026-07-01': F('15:00', '19:00') }, unk, 'office');
  eq('leitura "serviço em terra": junta-se ao dia que já tem serviço, cria o dia que não tem',
    [asOfc['2026-07-01'].extra.map((s) => [s.kind, s.report_time, s.signOff]), [asOfc['2026-07-02'].kind, asOfc['2026-07-02'].report_time, asOfc['2026-07-02'].block_on], !!asOfc['2026-07-04']],
    [[['office', '06:00', '14:00']], ['office', '22:00', '06:30'], false]);
}

// ── 2 · ORO.FTL.210: o registo dos dias e os períodos ──
{
  const duties = {};
  for (let d = 1; d <= 6; d++) duties[`2026-07-0${d}`] = { kind: 'office', report_time: '08:00', block_on: '17:40', sectors: 0, flight_minutes: 0 };   // 9 h 40 × 6 = 58 h
  const unk = { '2026-07-07': [U('SBYX', '06:00', '14:00')] };   // 8 h: com ele, 66 h em 7 dias (máx. 60 h)
  const rc = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const log0 = reconcileDayLog(duties, {}, rc);
  const log = reconcileDayLog(duties, {}, { ...rc, unknown: unk });
  eq('registo: o dia só com um código novo — no mínimo nada, no máximo a duração', [log['2026-07-07'].src, log['2026-07-07'].servicoMin, log['2026-07-07'].vooMin, log['2026-07-07'].servicoMaxMin, log['2026-07-07'].unkMin, log['2026-07-07'].unkCodes], ['unknown', 0, 0, 480, 480, ['SBYX']]);
  eq('registo: os outros dias não mudam', [log['2026-07-01'].servicoMin, log['2026-07-01'].servicoMaxMin === undefined, log['2026-07-01'].sig === log0['2026-07-01'].sig], [580, true, true]);
  eq('registo: idempotente (a mesma referência à 2.ª vez)', reconcileDayLog(duties, log, { ...rc, unknown: unk }) === log, true);
  // O código no mesmo dia de um serviço: o máximo do dia = o serviço + o que o código tem fora dele.
  const unkSame = { '2026-07-06': [U('SBYX', '16:00', '20:00')] };   // 16:00–17:40 está dentro do escritório → acrescenta 2 h 20
  const logS = reconcileDayLog(duties, log0, { ...rc, unknown: unkSame });
  eq('registo: código no dia de um serviço', [logS['2026-07-06'].src, logS['2026-07-06'].servicoMin, logS['2026-07-06'].servicoMaxMin, logS['2026-07-06'].unkMin], ['duty', 580, 720, 140]);
  // O código desaparece da escala (a leitura seguinte já o conhece): o registo volta ao que era.
  const back = reconcileDayLog(duties, log, rc);
  eq('registo: sem o código, o dia só dele sai e nada fica marcado', [back['2026-07-07'] === undefined, Object.values(back).some((e) => e.unkMin)], [true, false]);
  const backS = reconcileDayLog(duties, logS, rc);
  eq('registo: sem o código, o dia do serviço perde o máximo', [backS['2026-07-06'].servicoMaxMin === undefined, backS['2026-07-06'].unkMin === undefined], [true, true]);
  // Os períodos que contêm o dia (a Simulação e a importação): 58 h certas, até 66 h → incerto (nem "dentro" nem "excede").
  const w7 = limitsAround(log, '2026-07-07').find((w) => w.key === 'servico' && w.days === 7);
  eq('7 dias à volta: incerto, com as duas pontas e os dias com código', [!!w7.over, !!w7.uncertain, w7.doneMin, w7.doneMaxMin, w7.unkDays, w7.unkCodes], [false, true, 3480, 3960, 1, ['SBYX']]);
  eq('7 dias à volta, sem o código: dentro', [!!limitsAround(log0, '2026-07-07').find((w) => w.key === 'servico' && w.days === 7).uncertain], [false]);
  // O período que acaba hoje (o "Dentro dos limites?" do Início).
  const t7 = computeDutyTime(log, at('2026-07-07', '15:00')).find((w) => w.days === 7);
  eq('7 dias até hoje: incerto', [!!t7.over, !!t7.uncertain, t7.doneMin, t7.doneMaxMin, t7.unkDays, t7.unkCodes], [false, true, 3480, 3960, 1, ['SBYX']]);
  const ls = legalStatus({}, log, at('2026-07-07', '15:00'));
  eq('"Dentro dos limites?": incerto pelo código novo', [ls.status, ls.kind, ls.cat, ls.days, ls.doneMin, ls.doneMaxMin, ls.unkCodes], ['warn', 'limitUncertain', 'servico', 7, 3480, 3960, ['SBYX']]);
  eq('"Dentro dos limites?" sem o código: como antes', [legalStatus({}, log0, at('2026-07-07', '15:00')).kind], ['legal']);
  // Um período já passado de certeza continua "excede" (o certo vem antes do incerto).
  const over = reconcileDayLog({ ...duties, '2026-07-07': { kind: 'office', report_time: '08:00', block_on: '11:00', sectors: 0, flight_minutes: 0 } }, {}, { ...rc, unknown: { '2026-07-07': [U('SBYX', '12:00', '14:00')] } });
  eq('"Dentro dos limites?": acima de certeza → excede', [legalStatus({}, over, at('2026-07-07', '15:00')).kind], ['limitOver']);
  // O código que passa a meia-noite conta em cada dia local a sua parte: os 7 dias que acabam a 7/7 só levam as 2 h até às 24:00.
  const logM = reconcileDayLog(duties, {}, { ...rc, unknown: { '2026-07-07': [U('XQT', '22:00', '06:00')] } });
  eq('passa a meia-noite: cada dia local leva a sua parte', [logM['2026-07-07'].servicoMaxMin, logM['2026-07-08'].servicoMaxMin, logM['2026-07-08'].src], [120, 360, 'unknown']);
  eq('passa a meia-noite: os 7 dias até 7/7 cabem (58 h + 2 h = 60 h, o limite não se passa)', !!computeDutyTime(logM, at('2026-07-07', '23:00')).find((w) => w.days === 7).uncertain, false);
  // A frase do "Dentro dos limites?".
  const items = buildTodayItems({ ftlSnap: {}, dayLog: log, duties: [], todayISO: '2026-07-07', now: at('2026-07-07', '15:00') }, 'pt');
  const li = (items || []).find((i) => i.id === 'legal');
  eq('a frase', li && [li.status, li.answer, li.suggestion], ['warn', 'Incerto — serviço em 7 dias entre 58 h e 66 h (máx. 60 h)',
    'Nesse período há 1 dia com um código que a app não conhece (SBYX): se for serviço, conta para o limite (ORO.FTL.210) — no mínimo nada, no máximo a duração do evento. Quem acrescenta o código é a CrewPact: avisa na Escala.']);
}

// ── 3 · ORO.FTL.235: o repouso à volta de um código novo ──
{
  const pk = (r) => [r.status, r.kind || null, r.actualMin, r.unkCode || null, r.unkIso || null];
  const D = { '2026-07-01': F('08:00', '16:00'), '2026-07-03': F('08:00', '12:00') };   // acaba às 16:30 de 1/7; apresenta-se às 08:00 de 3/7 (39 h 30)
  const now = at('2026-07-02', '20:00');
  // Longe de tudo: 13 h 30 depois do voo (o mínimo dele: 12 h) e 18 h antes do seguinte (o mais que um serviço de 8 h pode pedir:
  // 14 h + 4 h de um prolongamento) → certo em todas as leituras.
  eq('código longe dos dois serviços → continua certo', pk(restStatus(D, '2026-07-02', now, { ...C, unknown: { '2026-07-02': [U('SBYX', '06:00', '14:00')] } })), ['ok', null, 2370, null, null]);
  // Acaba 16 h antes do seguinte: se for um PSV prolongado com fuso, o repouso a seguir pode ter de ser 18 h → incerto.
  eq('código a 16 h do serviço seguinte → incerto', pk(restStatus(D, '2026-07-02', now, { ...C, unknown: { '2026-07-02': [U('SBYX', '06:00', '16:00')] } })), ['warn', 'unknownCode', 2370, 'SBYX', '2026-07-02']);
  // Começa 5 h 30 depois do voo: se for um PSV, o repouso antes DELE é curto → incerto.
  eq('código 5 h 30 depois do serviço anterior → incerto', pk(restStatus(D, '2026-07-02', now, { ...C, unknown: { '2026-07-01': [U('SBYX', '22:00', '23:00')] } })), ['warn', 'unknownCode', 2370, 'SBYX', '2026-07-01']);
  // Curto de certeza: o repouso já é curto sem o código, e depois do código há menos de 10 h.
  const S = { '2026-07-01': F('08:00', '20:00'), '2026-07-02': F('06:00', '10:00') };   // 20:30 → 06:00 = 9 h 30
  eq('curto com e sem o código → curto', pk(restStatus(S, '2026-07-01', at('2026-07-01', '21:00'), { ...C, unknown: { '2026-07-01': [U('SBYX', '22:00', '23:00')] } })).slice(0, 2), ['bad', null]);
  // Curto sem o código (11 h de 12 h 30), mas o código acaba 10 h antes do voo: se for um serviço à parte, mede-se por ele → incerto.
  const S2 = { '2026-07-01': F('08:00', '20:00'), '2026-07-02': F('07:30', '10:00') };   // 20:30 → 07:30 = 11 h
  eq('curto sem o código, mas 10 h depois dele → incerto', pk(restStatus(S2, '2026-07-01', at('2026-07-01', '21:00'), { ...C, unknown: { '2026-07-01': [U('SBYX', '21:00', '21:30')] } })).slice(0, 2), ['warn', 'unknownCode']);
  // O código COLADO antes do serviço anterior: pode ser o início do mesmo período de serviço (o "serviço precedente" é mais
  // longo). 05:00 → 18:30 = 13 h 30; o mais que pode pedir: 14 h + 4 h = 18 h; houve 14 h 30 → incerto. Com 18 h → certo.
  const G = { '2026-07-01': F('08:00', '18:00'), '2026-07-02': F('09:00', '12:00') };
  eq('código colado antes do serviço anterior → incerto', pk(restStatus(G, '2026-07-01', at('2026-07-01', '19:00'), { ...C, unknown: { '2026-07-01': [U('BRF', '05:00', '07:30')] } })), ['warn', 'unknownCode', 870, 'BRF', '2026-07-01']);
  const G2 = { ...G, '2026-07-02': F('12:30', '15:00') };
  eq('… com 18 h de repouso → certo', pk(restStatus(G2, '2026-07-01', at('2026-07-01', '19:00'), { ...C, unknown: { '2026-07-01': [U('BRF', '05:00', '07:30')] } })).slice(0, 3), ['ok', null, 1080]);
  // Sem códigos novos: nada muda.
  eq('sem códigos → como antes', pk(restStatus(D, '2026-07-02', now, C)), ['ok', null, 2370, null, null]);
  // As outras vistas dizem o mesmo.
  const unk = { '2026-07-02': [U('SBYX', '06:00', '16:00')] };
  eq('Estatísticas: o mesmo', restVerdicts(D, { ...C, unknown: unk }).map((v) => [v.status, v.kind]), [['unc', 'unknownCode']]);
  const ra = restAround(D, (s, iso) => iso === '2026-07-03', { ...C, unknown: unk });
  eq('à volta do serviço: o mesmo', [ra.before.status, ra.before.kind, ra.before.unkCode], ['unc', 'unknownCode', 'SBYX']);
  // "Repouso até": um código que começa antes de o mínimo se cumprir (16:30 + 12 h = 04:30) → só a ponta de baixo.
  const ru = restUntilAfter(D, '2026-07-01', { ...C, unknown: { '2026-07-01': [U('SBYX', '22:00', '23:00')] } });
  eq('"Repouso até" com um código dentro do mínimo → incerto, sem teto', [ru.uncertain, ru.why, ru.requiredLoMin, ru.requiredHiMin, ru.unkCode], [true, 'unknownCode', 720, null, 'SBYX']);
  eq('"Repouso até" com o código depois do mínimo → certo', !!restUntilAfter(D, '2026-07-01', { ...C, unknown: { '2026-07-02': [U('SBYX', '06:00', '14:00')] } }).uncertain, false);
  // A frase.
  const it = restItem(restStatus(D, '2026-07-02', now, { ...C, unknown: unk }), { status: 'ok', issues: [] }, 'pt');
  eq('"Tenho descanso?" · a frase', [it.answer, it.suggestion], ['Incerto · no máximo 39 h 30 antes do report',
    'A 02/07 a escala tem um código que a app não conhece (SBYX). Se for um serviço, muda o repouso que tiveste e o mínimo (ORO.FTL.235). Quem acrescenta o código é a CrewPact: avisa na Escala.']);
}

// ── 4 · A recuperação (ORO.FTL.235(d)): as três leituras ──
{
  const W = (rep = '08:00', on = '16:00') => F(rep, on);
  const duties = { '2026-06-27': W() };
  for (const d of ['01', '02', '03', '04', '05', '06', '09', '10']) duties[`2026-07-${d}`] = W();
  const ctx = { base: 'LIS', postFlightMin: 30, disruptiveType: 'early' };
  eq('recuperação sem códigos: sem avisos', recoveryIssues(duties, ctx).filter((x) => x.type === 'recovery168'), []);
  // O código parte ao meio a única recuperação (6/7 16:30 → 9/7 08:00): se for um serviço, passam mais de 168 h sem recuperação.
  const unk = { '2026-07-07': [U('XQT', '20:00', '04:00')] };
  eq('recuperação: o código pode tirá-la → incerto ("unknown")', recoveryIssues(duties, { ...ctx, unknown: unk }).filter((x) => x.type === 'recovery168').map((x) => [x.date, x.uncertain, x.why, x.unkCode]), [['2026-07-09', true, 'unknown', 'XQT']]);
  // Um código que não muda nada (um troço com 36 h e 2 noites fica de fora dele): sem avisos.
  eq('recuperação: o código não a tira → sem avisos', recoveryIssues(duties, { ...ctx, unknown: { '2026-07-08': [U('XQT', '20:00', '22:00')] } }).filter((x) => x.type === 'recovery168'), []);
}

// ── 5 · Noites seguidas (CS FTL.1.205(a)(1)): no máximo 4 setores por serviço ──
{
  const baseOf = () => 'LIS';
  const opts = { postFlightMin: 30, isPilot: true };
  const N5 = { kind: 'flight', report_time: '22:00', block_on: '05:00', route: 'LIS-FNC-LIS-OPO-LIS-FAO', sectors: 5, flight_minutes: 300 };
  const N2 = { kind: 'flight', report_time: '22:30', block_on: '04:00', route: 'FAO-LIS-FAO', sectors: 2, flight_minutes: 200 };
  const lv = (r) => r.map((x) => [x.level, x.it.sectors, x.it.why || null, x.it.unkCode || null]);
  eq('noite com 5 setores, sozinha: sem aviso', lv(nightSectorIssues({ '2026-07-10': N5 }, '2026-07-10', opts, baseOf, (f) => f.iso === '2026-07-10')), []);
  // O código da noite seguinte (23:00–05:30) pode ser um serviço noturno: então são noites seguidas → incerto.
  eq('… com um código na noite seguinte → incerto ("unknown")', lv(nightSectorIssues({ '2026-07-10': N5 }, '2026-07-10', opts, baseOf, (f) => f.iso === '2026-07-10', { '2026-07-11': [U('XQT', '23:00', '05:30')] })), [['unc', 5, 'unknown', 'XQT']]);
  // Um código de DIA não faz uma noite seguida.
  eq('… com um código de dia → sem aviso', lv(nightSectorIssues({ '2026-07-10': N5 }, '2026-07-10', opts, baseOf, (f) => f.iso === '2026-07-10', { '2026-07-11': [U('XQT', '14:00', '18:00')] })), []);
  // Duas noites seguidas certas (5 setores na 1.ª): excede. Com um código de dia ENTRE as duas pode haver um serviço pelo meio → incerto.
  const two = { '2026-07-10': N5, '2026-07-11': N2 };
  eq('duas noites seguidas: excede', lv(nightSectorIssues(two, '2026-07-10', opts, baseOf, (f) => f.iso === '2026-07-10')), [['bad', 5, null, null]]);
  eq('… com um código entre as duas → incerto', lv(nightSectorIssues(two, '2026-07-10', opts, baseOf, (f) => f.iso === '2026-07-10', { '2026-07-11': [U('XQT', '14:00', '15:00')] })).map((x) => x.slice(0, 3)), [['unc', 5, 'between']]);
}

// ── 6 · A Simulação: as mesmas contas ──
{
  const duties = {};
  for (let d = 1; d <= 5; d++) duties[`2026-07-0${d}`] = { kind: 'office', report_time: '08:00', block_on: '17:40', sectors: 0, flight_minutes: 0 };
  const unk = { '2026-07-06': [U('SBYX', '06:00', '14:00')] };
  const sim = { duty_date: '2026-07-07', kind: 'office', report_time: '08:00', block_on: '17:40', sectors: 0, flight_minutes: 0 };
  const r = simulateDuty(sim, { duties, dayLog: {}, ...C, unknown: unk });
  const lu = r.issues.find((i) => i.type === 'limitUnc');
  eq('Simulação: 7 dias incertos pelo código', [r.verdict, lu && lu.doneMin, lu && lu.doneMaxMin, lu && lu.unkDays], ['unc', 3480, 3960, 1]);
  eq('Simulação: a frase', lu && issueText(lu, 'pt', '2026-07-07'), 'serviço 58 h a 66 h em 7 dias (máx. 60 h): 1 dia com um código que a app não conhece (SBYX)');
  eq('Simulação sem o código: certo', simulateDuty(sim, { duties, dayLog: {}, ...C }).verdict, 'ok');
}

// ── 7 · REVISÃO INDEPENDENTE do ponto 9 (2026-11-18) ──
{
  const { headroomStatus } = require(path.resolve('data/today.js'));
  const pk = (r) => [r.status, r.kind || null];
  // Achado 2: depois de uma rotação com fuso o repouso na base conta-se em NOITES LOCAIS (CS FTL.1.235(b)(3)(i)). LIS→EWR a
  // 10/1, EWR→LIS a 11/1 (acaba às 07:00 de 12/1: 2 noites), voo a 15/1 às 14:00. Um código a 13/1 das 10:00 às 14:00: se for
  // um PSV, antes dele só houve 1 noite → incerto. A 14/1 já houve as 2 → certo.
  const out = { kind: 'flight', report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  const back = { kind: 'flight', report_time: '18:00', block_on: '06:30', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '19:00', on: '06:30', offZ: '00:00', onZ: '06:30' }] };
  const R = { '2026-01-10': out, '2026-01-11': back, '2026-01-15': { kind: 'flight', report_time: '14:00', block_on: '18:00', route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 200 } };
  const nowR = at('2026-01-13', '08:00');
  eq('revisão 2: a rotação sem códigos → certo (2 noites pedidas, 3 havidas)', pk(restStatus(R, '2026-01-13', nowR, C)), ['ok', null]);
  eq('revisão 2: código com 1 noite local antes dele → incerto', pk(restStatus(R, '2026-01-13', nowR, { ...C, unknown: { '2026-01-13': [U('XQT', '10:00', '14:00')] } })), ['warn', 'unknownCode']);
  eq('revisão 2: código com as 2 noites antes dele → certo', pk(restStatus(R, '2026-01-13', nowR, { ...C, unknown: { '2026-01-14': [U('XQT', '10:00', '14:00')] } })), ['ok', null]);
  // … e sem serviço seguinte: o "Tenho descanso?" e o "Repouso até" dizem o mesmo (incerto).
  const R0 = { '2026-01-10': out, '2026-01-11': back };
  const u13 = { '2026-01-13': [U('XQT', '10:00', '14:00')] };
  eq('revisão 2: sem serviço seguinte, as duas vistas dizem incerto', [restStatus(R0, '2026-01-12', at('2026-01-12', '09:00'), { ...C, unknown: u13 }).kind, restUntilAfter(R0, '2026-01-11', { ...C, unknown: u13 }).why], ['unknownCode', 'unknownCode']);

  // Achado 8: um código inofensivo pelo meio não esconde o código colado antes do serviço. LNG de 30/6 às 12:00 a 1/7 às
  // 07:30, voo 08:00–18:00, voo seguinte 32 h depois (o mais que o período pode pedir: 30 h 30 + 4 h).
  const G = { '2026-07-01': F('08:00', '18:00'), '2026-07-03': F('02:30', '06:00') };
  const glued = { '2026-06-30': [U('LNG', '12:00', '07:30')] };
  eq('revisão 8: só o código colado → incerto', pk(restStatus(G, '2026-07-01', at('2026-07-01', '19:00'), { ...C, unknown: glued })), ['warn', 'unknownCode']);
  eq('revisão 8: … mais um código inofensivo pelo meio → continua incerto', pk(restStatus(G, '2026-07-01', at('2026-07-01', '19:00'), { ...C, unknown: { ...glued, '2026-07-02': [U('XQT', '06:30', '07:00')] } })), ['warn', 'unknownCode']);
  // O caso colado: o repouso que houve é exato (o que muda é o mínimo) — a frase não diz "no máximo".
  const rg = restStatus(G, '2026-07-01', at('2026-07-01', '19:00'), { ...C, unknown: glued });
  eq('revisão 14: código colado — a frase', [restItem(rg, { status: 'ok', issues: [] }, 'pt').answer, rg.unkGlued], ['Incerto · 32 h antes do report', true]);

  // Dois códigos seguidos com pouco tempo entre eles: se o 1.º for um serviço e o 2.º um PSV, o repouso entre os dois é curto.
  const D2 = { '2026-07-01': F('08:00', '16:00'), '2026-07-06': F('08:00', '12:00') };
  const two = { '2026-07-02': [U('AAA', '08:00', '20:00')], '2026-07-03': [U('BBB', '04:00', '08:00')] };
  eq('dois códigos com 8 h entre eles, longe do resto → incerto', pk(restStatus(D2, '2026-07-04', at('2026-07-04', '12:00'), { ...C, unknown: two })), ['warn', 'unknownCode']);
  eq('… com 40 h entre eles → certo', pk(restStatus(D2, '2026-07-04', at('2026-07-04', '12:00'), { ...C, unknown: { '2026-07-02': [U('AAA', '08:00', '12:00')], '2026-07-04': [U('BBB', '04:00', '08:00')] } })), ['ok', null]);

  // Achado 4: o mínimo a seguir da Simulação (`need`) é o mesmo do "Repouso até".
  const D = { '2026-07-01': F('08:00', '16:00') };
  const u22 = { '2026-07-01': [U('SBYX', '22:00', '23:00')] };
  const nd = restAround(D, (s, iso) => iso === '2026-07-01', { ...C, unknown: u22 }).need;
  eq('revisão 4: o mínimo a seguir com um código dentro dele', [nd.uncertain, nd.why, nd.requiredLoMin, nd.requiredHiMin, nd.unkCode], [true, 'unknownCode', 720, null, 'SBYX']);
  const rs = simulateDuty({ duty_date: '2026-07-01', ...F('08:00', '16:00') }, { duties: {}, dayLog: {}, ...C, unknown: u22 });
  eq('revisão 4: a Simulação não dá "certo" com um código logo a seguir', [rs.verdict, rs.rest.need.uncertain], ['unc', true]);

  // Achado 5: um serviço sem apresentação pelo meio não apaga a dúvida do código (antes de um serviço que não é PSV).
  const D5 = { '2026-07-01': F('08:00', '16:00'), '2026-07-02': { kind: 'flight', report_time: null, block_off: '08:00', block_on: '09:00', sectors: 1, flight_minutes: 60, extra: [{ kind: 'office', report_time: '16:00', block_on: '18:00', sectors: 0, flight_minutes: 0 }] } };
  const b5 = restAround(D5, (s) => s.kind === 'office', { ...C, unknown: u22 }).before;
  eq('revisão 5: à volta do serviço, o código continua a dizer-se', [b5.status, b5.kind], ['unc', 'unknownCode']);

  // Achado 9: "Quanto me falta para o limite?" não afirma a folga quando o máximo possível passa o limite.
  const duties = {};
  for (let d = 1; d <= 6; d++) duties[`2026-07-0${d}`] = { kind: 'office', report_time: '08:00', block_on: '17:40', sectors: 0, flight_minutes: 0 };
  const log = reconcileDayLog(duties, {}, { ...C, unknown: { '2026-07-07': [U('SBYX', '06:00', '14:00')] } });
  const hd = headroomStatus(log, at('2026-07-07', '15:00'));
  eq('revisão 9: a folga com o máximo possível acima do limite → incerta', [hd.status, hd.uncertain, hd.windowId, hd.headroomMin, hd.doneMaxMin], ['warn', true, '7d', 120, 3960]);

  // Achado 10: se o código for um VOO, também o tempo de voo conta (ORO.FTL.210(b): 100 h em 28 dias) — no máximo a duração.
  const fl = {};
  for (let d = 1; d <= 23; d += 2) fl[`2026-07-${String(d).padStart(2, '0')}`] = { kind: 'flight', report_time: '06:00', block_on: '15:30', route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 495 };   // 12 × 8 h 15 = 99 h
  const logF = reconcileDayLog(fl, {}, { ...C, unknown: { '2026-07-25': [U('XQT', '06:00', '10:00')] } });
  eq('revisão 10: o dia do código leva o máximo de voo', [logF['2026-07-25'].vooMin, logF['2026-07-25'].vooMaxMin], [0, 240]);
  const v28 = limitsAround(logF, '2026-07-25').find((w) => w.key === 'voo' && w.id === '28d');
  eq('revisão 10: voo em 28 dias — 99 h certas, até 103 h → incerto', [!!v28.over, !!v28.uncertain, v28.doneMin, v28.doneMaxMin, v28.unkCodes], [false, true, 5940, 6180, ['XQT']]);
  const lf = legalStatus({}, logF, at('2026-07-25', '12:00'));
  eq('revisão 10: "Dentro dos limites?" diz o voo incerto', [lf.kind, lf.cat, lf.windowId, lf.doneMaxMin], ['limitUncertain', 'voo', '28d', 6180]);

  // Achado 11: um evento com início igual ao fim não tem duração conhecida (não se inventam 24 h); um evento de vários dias
  // conta até ao dia em que acaba (`endISO`).
  eq('revisão 11: início = fim → não se situa', unknownSpans({ '2026-07-01': [U('ZZ', '08:00', '08:00')] }), []);
  const multi = unknownSpans({ '2026-07-01': [{ code: 'TRN', title: 'TRN', start: '08:00', end: '17:00', endISO: '2026-07-03' }] });
  eq('revisão 11: evento de 3 dias → 57 h', multi.map((u) => [u.iso, Math.round((+u.end - +u.start) / 60000), u.end.getDate()]), [['2026-07-01', 3420, 3]]);

  // Achado 15: um código no próprio dia pode alongar o PSV de hoje (o posicionamento antes de operar conta como PSV,
  // ORO.FTL.215(a)) — o "Dentro dos limites?" não diz "Sim" (como o cartão do Início e a Escala).
  const it = buildTodayItems({ ftlSnap: {}, dayLog: {}, duties: {}, todayISO: '2026-07-01', now: at('2026-07-01', '12:00'), unknown: { '2026-07-01': [U('SBYX', '06:00', '14:00')] } }, 'pt').find((i) => i.id === 'legal');
  eq('revisão 15: código hoje → "Dentro dos limites?" incerto', [it.status, it.answer], ['warn', 'Incerto — falta saber o que é o código SBYX (a app não o conhece)']);
}

// ── 8 · Sem serviço anterior na escala: o código antes do 1.º voo também conta ──
{
  // Só um voo às 06:00 de 2/7, e um código na véspera das 12:00 às 20:00: se for um serviço, o repouso antes do voo são 10 h —
  // e um serviço de 8 h pode pedir até 18 h (14 h + 4 h). Antes: "sem dados" (não havia serviço anterior). Com o código dois
  // dias antes, chega em qualquer leitura: fica como estava.
  const one = { '2026-07-02': F('06:00', '10:00') };
  const r = restStatus(one, '2026-07-01', at('2026-07-01', '21:00'), { ...C, unknown: { '2026-07-01': [U('SBYX', '12:00', '20:00')] } });
  eq('código antes do 1.º voo da escala → incerto', [r.status, r.kind, r.actualMin, r.unkCode], ['warn', 'unknownCode', 600, 'SBYX']);
  const r2 = restStatus(one, '2026-07-01', at('2026-07-01', '21:00'), { ...C, unknown: { '2026-06-30': [U('SBYX', '08:00', '12:00')] } });
  eq('… dois dias antes → como antes (sem serviço anterior)', [r2.status, r2.kind], ['neutral', 'noPrev']);
  eq('as outras vistas dizem o mesmo', [restVerdicts(one, { ...C, unknown: { '2026-07-01': [U('SBYX', '12:00', '20:00')] } }).map((v) => [v.status, v.kind]), restAround(one, () => true, { ...C, unknown: { '2026-07-01': [U('SBYX', '12:00', '20:00')] } }).before.kind], [[['unc', 'unknownCode']], 'unknownCode']);
}

// ── 9 · 2.ª REVISÃO INDEPENDENTE (2026-11-18) ──
{
  const pk = (r) => [r.status, r.kind || null, !!r.unkPrev];
  // Achado 3: um código ANTES do serviço anterior (não colado: 13 h antes). Se for um serviço de 14 h, essas 13 h foram um repouso
  // reduzido (CS FTL.1.235(c)(1)) e o repouso seguinte "is extended by the difference" ((c)(3)). O mais que pode pedir: 14 h + 4 h
  // = 18 h → a diferença pode ir até 5 h: com 12 h 30 depois do voo é incerto; com 17 h já chega em qualquer leitura.
  const P = (rep3) => ({ '2026-07-02': F('09:00', '15:00'), '2026-07-03': F(rep3, '12:00') });   // o voo de 2/7 acaba às 15:30
  const x = { '2026-07-01': [U('XSIM', '06:00', '20:00')] };
  eq('revisão 2/3: código 13 h antes do serviço anterior, 12 h 30 depois dele → incerto', pk(restStatus(P('04:00'), '2026-07-02', at('2026-07-02', '16:00'), { ...C, unknown: x })), ['warn', 'unknownCode', true]);
  eq('revisão 2/3: … com 17 h → certo', pk(restStatus(P('08:30'), '2026-07-02', at('2026-07-02', '16:00'), { ...C, unknown: x })), ['ok', null, false]);
  eq('revisão 2/3: sem o código → certo', pk(restStatus(P('04:00'), '2026-07-02', at('2026-07-02', '16:00'), C)), ['ok', null, false]);
  const ru = restUntilAfter(P('04:00'), '2026-07-02', { ...C, unknown: x });
  eq('revisão 2/3: o "Repouso até" leva o mesmo teto', [ru.uncertain, ru.why, ru.requiredLoMin, ru.requiredHiMin], [true, 'unknownCode', 720, 1020]);
  // Achado 5: sem serviço anterior, o repouso conta do fim do código SE ele for um serviço — é o mínimo que houve, não o máximo.
  const one = { '2026-07-02': F('06:00', '10:00') };
  const r5 = restStatus(one, '2026-07-01', at('2026-07-01', '21:00'), { ...C, unknown: { '2026-07-01': [U('SBYX', '12:00', '20:00')] } });
  eq('revisão 2/5: código antes do 1.º voo — "pelo menos"', restItem(r5, { status: 'ok', issues: [] }, 'pt').answer, 'Incerto · pelo menos 10 h antes do report');
  // Achado 6: o voo de hoje passa a meia-noite e amanhã há um código — o período de 28 dias que acaba AMANHÃ também se vê.
  const fl = {};
  for (let d = 1; d <= 27; d++) fl[`2026-07-${String(d).padStart(2, '0')}`] = { kind: 'flight', report_time: '08:00', block_on: '12:00', route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 210 };
  fl['2026-07-28'] = { kind: 'flight', report_time: '20:00', block_off: '21:00', block_on: '01:00', route: 'LIS-FNC', sectors: 1, flight_minutes: 240, legs: [{ dep: 'LIS', arr: 'FNC', off: '21:00', on: '01:00' }] };
  const logS = reconcileDayLog(fl, {}, { ...C, unknown: { '2026-07-29': [U('XQT', '06:00', '14:00')] } });
  const lg = legalStatus({}, logS, at('2026-07-28', '22:00'));
  eq('revisão 2/6: voo que passa a meia-noite + código amanhã → voo em 28 dias incerto no Início', [lg.kind, lg.cat, lg.windowId], ['limitUncertain', 'voo', '28d']);
  // Achado 13: 12 meses — o máximo vê-se em TODOS os períodos que contêm o dia, não só no mais carregado pelo mínimo.
  const iso = (n) => { const t = new Date(2026, 6, 1 + n, 12); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  const log12 = { [iso(-350)]: { src: 'duty', vooMin: 1800, servicoMin: 0 }, [iso(-200)]: { src: 'duty', vooMin: 58000, servicoMin: 0 }, [iso(100)]: { src: 'unknown', vooMin: 600, vooMaxMin: 3000, servicoMin: 0, unkCodes: ['XQT'] } };
  const w12 = limitsAround(log12, iso(0)).find((w) => w.key === 'voo' && w.id === '12m');
  eq('revisão 2/13: 12 meses — o período com o máximo acima das 1 000 h', [!!w12.over, !!w12.uncertain, w12.doneMaxMin], [false, true, 61000]);
}

console.log(`\ncódigos novos (camada 2) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
