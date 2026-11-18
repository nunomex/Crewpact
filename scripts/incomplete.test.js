/*
 * Golden dos SERVIÇOS A QUE FALTAM HORAS (sessão Fable 5.2, ponto 3, 2026-11-17): os dias "a corrigir" da importação entram
 * como "incerto", sem nunca se perder um dia. O que a escala não diz não se inventa — contam as duas pontas:
 *   · ORO.FTL.210 — no mínimo o que se sabe (nada); no máximo o tempo que o serviço pode ter ocupado: da apresentação até ao
 *     serviço seguinte, ou 24 h (sem fim); desde as 00:00 do dia até ao fim (sem início); o dia inteiro (sem horas). O teto das
 *     24 h e o "desde as 00:00 do próprio dia" são CONVENÇÃO da app, dita no ecrã: a lei não dá um teto ao período de serviço.
 *   · ORO.FTL.235 — um serviço sem início não está na linha do repouso (não se sabe quando começou), mas existe: o repouso à
 *     volta dele fica incerto, salvo quando é certo ou curto em todas as leituras.
 * Executar:  node scripts/incomplete.test.js   (ou: npm run test:incomplete)
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

const { incompleteSpans, unknownDayMax } = require(path.resolve('ftl/unknownCodes.js'));
const { reconcileDayLog, limitsAround } = require(path.resolve('ftl/index.js'));
const { restStatus, restVerdicts, restUntilAfter, legalStatus } = require(path.resolve('data/today.js'));
const { simulateDuty, issueText } = require(path.resolve('data/simulation.js'));
const { restItem } = require(path.resolve('data/hojeItems.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const at = (iso, hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };
const F = (rep, on, route = 'LIS-FNC-LIS', sectors = 2) => ({ kind: 'flight', report_time: rep, block_on: on, route, sectors, flight_minutes: 240 });
const C = { base: 'LIS', postFlightMin: 30, isPilot: true };
const OFC_NO_END = { kind: 'office', report_time: '09:00', block_on: null, sectors: 0, flight_minutes: 0 };
const OFC_NO_START = { kind: 'office', report_time: null, block_on: '17:00', sectors: 0, flight_minutes: 0 };
const FL_NO_TIMES = { kind: 'flight', report_time: null, block_off: null, block_on: null, route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 0 };
const FL_NO_BLOCKS = { kind: 'flight', report_time: '06:00', block_off: null, block_on: null, route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 0 };
// 1/7: voo 08:00–16:00 (acaba às 16:30) · 2/7: o serviço a que faltam horas · 3/7: voo 06:00–10:00 (acaba às 10:30)
const D = (x, d3 = '2026-07-03') => ({ '2026-07-01': F('08:00', '16:00'), '2026-07-02': x, [d3]: F('06:00', '10:00') });
const sp = (duties, o = C) => incompleteSpans(duties, o).map((u) => [u.iso, u.why, `${u.start.getDate()} ${String(u.start.getHours()).padStart(2, '0')}:${String(u.start.getMinutes()).padStart(2, '0')}`, `${u.end.getDate()} ${String(u.end.getHours()).padStart(2, '0')}:${String(u.end.getMinutes()).padStart(2, '0')}`, u.c210, u.rest, u.fdp]);

// ── 1 · O tempo que o serviço pode ter ocupado ──
{
  eq('sem fim (escritório às 09:00): até ao serviço seguinte (06:00 do dia 3)', sp(D(OFC_NO_END)), [['2026-07-02', 'noEnd', '2 09:00', '3 06:00', true, false, false]]);
  eq('sem fim e sem serviço a seguir: 24 h (convenção)', sp({ '2026-07-02': OFC_NO_END }), [['2026-07-02', 'noEnd', '2 09:00', '3 09:00', true, false, false]]);
  eq('sem início (escritório até às 17:00): desde as 00:00 do dia', sp(D(OFC_NO_START)), [['2026-07-02', 'noStart', '2 00:00', '2 17:00', true, true, false]]);
  // Um voo sem horas: o dia inteiro. Para o 210 o motor já o conta (o pós-voo no mínimo, mais 24 h no máximo — noReportEntry).
  eq('voo sem horas: o dia inteiro; o 210 já o conta pelo registo do voo', sp(D(FL_NO_TIMES)), [['2026-07-02', 'noTimes', '2 00:00', '3 00:00', false, true, true]]);
  eq('… sem pós-voo o registo do voo não o conta: conta aqui', sp(D(FL_NO_TIMES), { postFlightMin: 0 })[0][4], true);
  eq('voo com apresentação e sem calços: sem fim', sp(D(FL_NO_BLOCKS)), [['2026-07-02', 'noEnd', '2 06:00', '3 06:00', true, false, true]]);
  eq('serviços completos, voo sem apresentação mas com calços, reserva: nada', sp({ '2026-07-01': F('08:00', '16:00'), '2026-07-02': { kind: 'flight', report_time: null, block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120 }, '2026-07-03': { kind: 'reserve' } }), []);
  eq('o máximo por dia local (sem fim: 09:00–24:00 e 00:00–06:00)', unknownDayMax(null, D(OFC_NO_END), C), { '2026-07-02': { min: 900, codes: [], miss: 1, spill: true }, '2026-07-03': { min: 360, codes: [], miss: 1 } });
}

// ── 2 · ORO.FTL.210: nenhum dia se perde ──
{
  const pk = (e) => (e ? [e.src, e.servicoMin, e.servicoMaxMin === undefined ? null : e.servicoMaxMin, e.missN || 0] : null);
  const a = reconcileDayLog(D(OFC_NO_END), {}, C);
  eq('sem fim: o dia entra — no mínimo nada, no máximo até às 24:00', pk(a['2026-07-02']), ['unknown', 0, 900, 1]);
  eq('… e o resto (00:00–06:00) no dia seguinte, por cima do voo dele (4 h 30)', pk(a['2026-07-03']), ['duty', 270, 630, 1]);
  eq('sem início: no máximo desde as 00:00', pk(reconcileDayLog(D(OFC_NO_START), {}, C)['2026-07-02']), ['unknown', 0, 1020, 1]);
  eq('voo sem horas: como antes (o pós-voo, mais 24 h)', pk(reconcileDayLog(D(FL_NO_TIMES), {}, C)['2026-07-02']), ['duty', 30, 1470, 0]);
  eq('voo com apresentação e sem calços: entra', pk(reconcileDayLog(D(FL_NO_BLOCKS), {}, C)['2026-07-02']), ['unknown', 0, 1080, 1]);
  eq('idempotente', (() => { const l1 = reconcileDayLog(D(OFC_NO_END), {}, C); return reconcileDayLog(D(OFC_NO_END), l1, C) === l1; })(), true);
  // Quando a hora chega (a leitura seguinte do calendário), o dia passa a contar certo e o máximo sai.
  const fixed = reconcileDayLog(D({ ...OFC_NO_END, block_on: '17:00' }), a, C);
  eq('com a hora de fim: certo, sem máximo', [pk(fixed['2026-07-02']), pk(fixed['2026-07-03'])], [['duty', 480, null, 0], ['duty', 270, null, 0]]);
  // Os períodos: 6 dias de 9 h 40 (58 h) e um escritório sem fim no 7.º → até 15 h a mais nesse dia: incerto.
  const duties = {};
  for (let d = 1; d <= 6; d++) duties[`2026-07-0${d}`] = { kind: 'office', report_time: '08:00', block_on: '17:40', sectors: 0, flight_minutes: 0 };
  duties['2026-07-07'] = OFC_NO_END;
  const log = reconcileDayLog(duties, {}, C);
  const w7 = limitsAround(log, '2026-07-07').find((w) => w.key === 'servico' && w.days === 7);
  eq('7 dias: incerto pelas horas em falta', [!!w7.over, !!w7.uncertain, w7.doneMin, w7.doneMaxMin, w7.missDays, w7.unkDays], [false, true, 3480, 4380, 1, 0]);
  const ls = legalStatus({}, log, at('2026-07-07', '15:00'));
  eq('"Dentro dos limites?": incerto, com os dias a que faltam horas', [ls.kind, ls.doneMin, ls.doneMaxMin, ls.missDays, ls.unkDays], ['limitUncertain', 3480, 4380, 1, 0]);
  // (a verificação da importação: o dia na escala completa, scope 'day')
  const sim = simulateDuty({ duty_date: '2026-07-07', ...OFC_NO_END, extra: [] }, { duties, dayLog: {}, ...C, mode: 'replace', scope: 'day' });
  eq('importação: o dia a que faltam horas verifica-se e entra incerto', [sim.verdict, sim.issues.filter((i) => i.type === 'missingTimes').map((i) => issueText(i, 'pt'))], ['unc', ['falta a hora de fim: o dia entra incerto (conta, no máximo, até ao serviço seguinte ou 24 h)']]);
  const lu = sim.issues.find((i) => i.type === 'limitUnc');
  eq('Simulação/importação: a frase', lu && issueText(lu, 'pt', '2026-07-07'), 'serviço 58 h a 73 h em 7 dias (máx. 60 h): 1 dia com um serviço a que faltam horas (o máximo é uma convenção: até ao serviço seguinte ou 24 h, ou desde as 00:00)');
}

// ── 3 · ORO.FTL.235: o serviço sem início não fica invisível ──
{
  const pk = (r) => [r.status, r.kind || null, r.actualMin, r.unkWhy || null, r.unkIso || null];
  const now = at('2026-07-02', '23:00');
  // Escritório sem início, fim às 17:00, e o voo às 06:00 do dia seguinte: 13 h depois dele. Se começou às 00:00 durou 17 h e o
  // repouso a seguir teria de ser de 17 h → incerto. (Antes: "certo", 37 h 30 — o escritório não existia para o repouso.)
  // (2.ª revisão, achado 5: o repouso que houve conta do fim do escritório e é exato — 13 h; o que não se sabe é o mínimo.)
  eq('sem início, 13 h antes do voo → incerto', pk(restStatus(D(OFC_NO_START), '2026-07-02', now, C)), ['warn', 'unknownCode', 780, 'noStart', '2026-07-02']);
  // O voo só a 4/7 (37 h depois do fim do escritório): chega em qualquer leitura. Antes de um escritório a lei não fixa mínimo
  // (ORO.FTL.235(a)/(b): "antes de um PSV"), por isso as 7 h 30 entre o voo de 1/7 e as 00:00 não contam contra.
  eq('sem início, 37 h antes do voo → certo', pk(restStatus(D(OFC_NO_START, '2026-07-04'), '2026-07-02', now, C)).slice(0, 2), ['ok', null]);
  // Um VOO sem horas pode ser um PSV em qualquer hora do dia: o repouso antes dele (7 h 30 até às 00:00) pode ser curto → incerto.
  eq('voo sem horas no dia seguinte a um voo → incerto', pk(restStatus(D(FL_NO_TIMES, '2026-07-05'), '2026-07-02', now, C)).slice(0, 4), ['warn', 'unknownCode', 5130, 'noTimes']);
  eq('Estatísticas: o mesmo', restVerdicts(D(OFC_NO_START), C).map((v) => [v.status, v.kind, v.unkWhy]), [['unc', 'unknownCode', 'noStart']]);
  // "Repouso até" depois do voo de 1/7 (16:30 + 12 h = 04:30): o escritório sem início pode ter começado antes → só a ponta de baixo.
  const ru = restUntilAfter(D(OFC_NO_START), '2026-07-01', C);
  eq('"Repouso até" com um serviço sem início dentro do mínimo', [ru.uncertain, ru.why, ru.unkWhy, ru.requiredLoMin, ru.requiredHiMin], [true, 'unknownCode', 'noStart', 720, null]);
  // As frases.
  const it = restItem(restStatus(D(OFC_NO_START), '2026-07-02', now, C), { status: 'ok', issues: [] }, 'pt');
  eq('"Tenho descanso?" · sem início', [it.answer, it.suggestion], ['Incerto · 13 h antes do report',
    'A 02/07 a escala tem um serviço sem hora de início: não se sabe quanto durou, nem o repouso mínimo a seguir (ORO.FTL.235). A hora tem de vir do calendário.']);
  const it2 = restItem(restStatus(D(FL_NO_TIMES, '2026-07-05'), '2026-07-02', now, C), { status: 'ok', issues: [] }, 'pt');
  eq('"Tenho descanso?" · sem horas', it2.suggestion, 'A 02/07 a escala tem um serviço sem horas: não se sabe quando foi, nem o repouso antes e depois dele (ORO.FTL.235). As horas têm de vir do calendário.');
}

// ── 4 · 2.ª REVISÃO INDEPENDENTE (2026-11-18), achado 4: um serviço sem início com o fim de MADRUGADA pode ter acabado no dia
// seguinte (apresentou-se à noite) — convenção dita: um fim até ao meio-dia conta até ao dia seguinte. ──
{
  const ON3 = { kind: 'flight', report_time: null, block_off: null, block_on: '03:00', route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 200 };
  const Dn = { '2026-07-01': F('05:00', '09:00'), '2026-07-02': ON3, '2026-07-03': F('14:00', '18:00') };
  eq('só calços dentro às 03:00: pode ser a madrugada do dia seguinte', sp(Dn), [['2026-07-02', 'noStart', '2 00:00', '3 03:30', false, true, true]]);
  const r = restStatus(Dn, '2026-07-02', at('2026-07-02', '12:00'), C);
  eq('… o voo das 14:00 de 3/7 (10 h 30 depois, nessa leitura) → incerto', [r.status, r.kind, r.unkWhy], ['warn', 'unknownCode', 'noStart']);
}

console.log(`\nserviços a que faltam horas — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
