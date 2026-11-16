/*
 * Golden da FOLHA DA SIMULAÇÃO (data/simSheet.js) — S1 de design/simulacao-3.html, escolhida pelo Nuno a 2026-11-15:
 * "o cartão constrói-se enquanto escreves". O que se escreve (o formulário curto) vira o serviço que o motor simula
 * (simDutyOf); o resultado do motor (simulateDuty, golden test:simulation) vira os cartões do Início: em cima o veredicto e o
 * cartão do dia; em baixo, "O resultado" — os avisos (sem repetir o de cima), quanto recebes, o repouso, os limites à volta, as
 * validades e a fadiga. Sem um dado, o cartão diz qual falta (nunca um veredicto adivinhado).
 * Executar:  node scripts/simsheet.test.js   (ou: npm run test:simsheet)
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

const { simDutyOf, simMissing, simCards, simFlightRange } = require(path.resolve('data/simSheet.js'));
const { simulateDuty, issueText } = require(path.resolve('data/simulation.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}\n    tem:    ${g}\n    devia:  ${e}`); }
};
const CTX = { postFlightMin: 30, isPilot: true, base: 'LIS', mode: 'replace' };
const run = (duties, duty) => simulateDuty(duty, { ...CTX, duties, dayLog: {} });

// ── 1 · o que se escreve → o serviço que o motor simula ──
const FORM = { date: '2026-11-19', kind: 'flight', report: '06:00', dep: '07:00', on: '11:20', end: '', sectors: 2, route: 'lis fnc lis' };
const D1 = simDutyOf(FORM, { base: 'LIS' });
eq('voo: o serviço do motor', D1, { duty_date: '2026-11-19', kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '11:20', sectors: 2,
  flight_minutes: 260, route: 'LIS-FNC-LIS', nightStop: false, signOff: null, legs: null, special: null, accommodation: false });
eq('a rota manda nos setores (3 aeroportos → 2 setores; 4 → 3)', [simDutyOf({ ...FORM, sectors: 1 }, { base: 'LIS' }).sectors, simDutyOf({ ...FORM, route: 'LIS OPO LIS FNC' }, { base: 'LIS' }).sectors], [2, 3]);
eq('acaba fora da base → pernoita', simDutyOf({ ...FORM, route: 'LIS-LGW' }, { base: 'LIS' }).nightStop, true);
// o tempo de voo deste serviço sem as horas das pernas é o MÁXIMO possível (da partida ao último calço — com o tempo no solo, que
// não é voo: ORO.FTL.105(13)); sem a partida, do report. A Simulação faz a conta com as duas pontas (simFlightRange, caso 10).
eq('sem a partida: o máximo vai do report ao último calço', simDutyOf({ ...FORM, dep: '' }, { base: 'LIS' }).flight_minutes, 320);
eq('a passar a meia-noite', simDutyOf({ ...FORM, report: '22:00', dep: '23:00', on: '01:30' }, { base: 'LIS' }).flight_minutes, 150);
eq('standby em casa: início e fim', simDutyOf({ date: '2026-11-19', kind: 'standby_home', report: '06:00', end: '14:00', dep: '', on: '', sectors: 0, route: '' }, { base: 'LIS' }),
  { duty_date: '2026-11-19', kind: 'standby_home', report_time: '06:00', block_off: null, block_on: '14:00', sectors: 0, flight_minutes: 0, route: null, nightStop: false, signOff: null, legs: null, special: null, accommodation: false });
// os Pormenores (o formulário completo) devolvem as pernas, os casos especiais, o papel… — ficam por cima do formulário curto
eq('os pormenores ficam por cima', simDutyOf({ ...FORM, extra: { legs: [{ off: '07:00', on: '08:40' }], special: { augmented: null }, role: 'instr' } }, { base: 'LIS' }).role, 'instr');

// ── 2 · o que falta (o cartão diz qual) ──
eq('voo sem o último calço', simMissing({ ...FORM, on: '' }), ['o último calço']);
eq('voo sem nada', simMissing({ ...FORM, report: '', on: '' }), ['a hora do report', 'o último calço']);
eq('em terra sem o fim', simMissing({ date: '2026-11-19', kind: 'office', report: '09:00', end: '' }), ['a hora do fim']);
eq('sem o dia', simMissing({ ...FORM, date: '' }), ['o dia']);
eq('em inglês', simMissing({ ...FORM, on: '' }, 'en'), ['the last on-block']);

// ── 3 · tudo dentro: o cartão do dia do Início, com a linha do limite ──
const PREV = { '2026-11-18': { report_time: '08:00', block_on: '16:30', sectors: 2, flight_minutes: 300, route: 'LIS-OPO-LIS', kind: 'flight' } };
const okSim = run(PREV, D1);
const okC = simCards(okSim, D1, { lang: 'pt', missing: [], postFlightMin: 30, money: { total: 154.51, label: 'Per diem da rota · piloto' }, validity: null, replacing: null });
eq('dentro: em cima só o cartão do dia', okC.lead.map((c) => [c.t, c.id]), [['card', 'day']]);
eq('dentro: a linha do limite (o PSV de 5 h 20 em 13 h — ORO.FTL.205(b), tabela 2)', [okC.lead[0].quiet.l, okC.lead[0].quiet.sub, okC.lead[0].quiet.r], ['Dentro do limite', 'PSV 5 h 20 de 13 h', { k: 'margem', v: '7 h 40' }]);
eq('dentro: sem partilhar nem abrir (é simulado); o dinheiro não se repete no cartão', [okC.lead[0].corner, okC.lead[0].open, okC.lead[0].gain], [null, null, null]);
eq('o resultado: o título e as peças, por esta ordem', okC.result.map((c) => c.id), ['resHdr', 'money', 'rest', 'lim', 'fatigue']);
eq('quanto recebes (com os cêntimos)', [okC.result[1].title, okC.result[1].value, okC.result[1].gain], ['Quanto recebes', '+154,51 €', true]);
eq('o repouso: antes (do fim de quarta, 17:00) e o mínimo a seguir com a hora', okC.result[2].rows,
  [{ k: 'Antes · acima do mínimo', v: '13 h' }, { k: 'Depois · até às 23:50', v: 'mín. 12 h' }]);
eq('a fadiga: estimativa, sem cor', [okC.result[4].color, okC.result[4].title], ['neutral', 'Fadiga estimada']);

// ── 4 · acima do limite: o "✕" em cima com o 1.º motivo; o resto dos avisos em baixo, sem repetir ──
const SHORT = { '2026-11-18': { report_time: '12:00', block_on: '21:30', sectors: 2, flight_minutes: 300, route: 'LIS-OPO-LIS', kind: 'flight' } };
const badSim = run(SHORT, D1);
const badC = simCards(badSim, D1, { lang: 'pt', missing: [], postFlightMin: 30, money: null, validity: null, replacing: null });
const firstBad = [...badSim.issues.filter((i) => i.level === 'bad'), ...badSim.issues.filter((i) => i.level !== 'bad')][0];
eq('acima: o veredicto do motor', badSim.verdict, 'bad');
eq('acima: em cima o aviso vermelho com o "✕" e o 1.º motivo, depois o cartão do dia', [badC.lead[0].t, badC.lead[0].color, badC.lead[0].mark, badC.lead[0].title, badC.lead[0].sub, badC.lead[1].id],
  ['slim', 'stop', '✕', 'Acima do limite', issueText(firstBad, 'pt', '2026-11-19'), 'day']);
eq('acima: o cartão do dia sem a linha do limite (não está dentro)', badC.lead[1].quiet, null);
eq('acima: os avisos em baixo não repetem o de cima', badC.result.filter((c) => /^is/.test(c.id)).length, Math.max(0, badSim.issues.length - 1));
eq('acima: o repouso antes diz o mínimo que falta', badC.result.find((c) => c.id === 'rest').rows[0].k.startsWith('Antes · abaixo do mínimo de'), true);

// ── 5 · falta um dado: o cartão diz qual, sem veredicto nem resultado ──
const missC = simCards(run(PREV, simDutyOf({ ...FORM, on: '' }, { base: 'LIS' })), simDutyOf({ ...FORM, on: '' }, { base: 'LIS' }), { lang: 'pt', missing: ['o último calço'], postFlightMin: 30 });
eq('falta: o cartão do veredicto diz o que falta', missC.lead, [{ t: 'text', id: 'need', color: 'neutral', kind: 'O veredicto', text: 'Falta o último calço — o veredicto aparece aqui.' }]);
eq('falta: sem resultado', missC.result, []);
eq('falta dois: "e"', simCards(okSim, D1, { lang: 'pt', missing: ['a hora do report', 'o último calço'] }).lead[0].text, 'Falta a hora do report e o último calço — o veredicto aparece aqui.');
eq('em inglês', simCards(okSim, D1, { lang: 'en', missing: ['the last on-block'] }).lead[0], { t: 'text', id: 'need', color: 'neutral', kind: 'The verdict', text: 'Missing the last on-block — the verdict shows up here.' });

// ── 6 · nesse dia já há um serviço (o simulado fica no lugar dele); as validades no dia ──
const repC = simCards(okSim, D1, { lang: 'pt', missing: [], postFlightMin: 30, replacing: 'LIS-OPO-LIS', validity: { band: 'expiring', text: 'Médico · 5 d' } });
eq('substitui: diz qual', repC.result.find((c) => c.id === 'replace'), { t: 'text', id: 'replace', color: 'neutral', kind: 'Nesse dia', text: 'O simulado fica no lugar do serviço que tens (LIS-OPO-LIS).' });
eq('validades a caducar: âmbar com "!"', (({ color, mark, title, sub }) => ({ color, mark, title, sub }))(repC.result.find((c) => c.id === 'valid')),
  { color: 'alert', mark: '!', title: 'Validades no dia', sub: 'Médico · 5 d' });
eq('validades caducadas: vermelho com "✕"', simCards(okSim, D1, { lang: 'pt', missing: [], validity: { band: 'expired', text: 'Médico expirado' } }).result.find((c) => c.id === 'valid').color, 'stop');

// ── 7 · em terra (standby em casa): o cartão de serviço em terra ──
const SB = simDutyOf({ date: '2026-11-19', kind: 'standby_home', report: '06:00', end: '14:00' }, { base: 'LIS' });
const sbC = simCards(run(PREV, SB), SB, { lang: 'pt', missing: [], postFlightMin: 30 });
eq('em terra: o cartão do dia é o de serviço em terra', [sbC.lead[sbC.lead.length - 1].id, sbC.lead[sbC.lead.length - 1].kind, sbC.lead[sbC.lead.length - 1].color], ['day', 'Serviço em terra', 'ground']);

// ── 8 · os títulos do cartão: o voo sem rota diz "Voo"; em terra, o nome do tipo; o posicionamento diz-se ──
const T = (form) => { const d = simDutyOf(form, { base: 'LIS' }); const c = simCards(run(PREV, d), d, { lang: 'pt', missing: [], postFlightMin: 30 }); return c.lead[c.lead.length - 1]; };
const B = { date: '2026-11-19', report: '06:00', dep: '', on: '11:20', end: '14:00', sectors: 2, route: '' };
eq('voo sem rota: "Voo"', T({ ...B, kind: 'flight' }).title, 'Voo');
eq('formação: o nome do tipo', T({ ...B, kind: 'training' }).title, 'Formação');
eq('standby no aeroporto: o nome do tipo', T({ ...B, kind: 'standby_airport' }).title, 'Standby Aeroporto');
eq('posicionamento: o tipo diz-se em cima, a rota no título', [T({ ...B, kind: 'positioning', route: 'LIS OPO' }).kind, T({ ...B, kind: 'positioning', route: 'LIS OPO' }).title], ['Posicionamento', 'LIS → OPO']);

// ── 9 · a reserva: o motor não tem limites a verificar — a folha diz porquê (CS FTL.1.230(a) e (b), conferido em fontes/ftl/) ──
const RS = simDutyOf({ ...B, kind: 'reserve' }, { base: 'LIS' });
const rsSim = run(PREV, RS);
const rsC = simCards(rsSim, RS, { lang: 'pt', missing: [], postFlightMin: 30 });
eq('reserva: o motor não dá veredicto', rsSim.verdict, 'none');
eq('reserva: o resultado diz o que a lei diz', rsC.result.find((c) => c.id === 'none'), { t: 'text', id: 'none', color: 'neutral', kind: 'O que a lei diz',
  text: 'As horas de reserva não contam como serviço para os limites nem para o repouso (CS FTL.1.230(b)). Se te atribuírem um voo, o PSV conta desde a apresentação (CS FTL.1.230(a)).' });

// ── 10 · o tempo de voo sem as horas das pernas: as DUAS PONTAS (ORO.FTL.105(13) — conta-se por setor, sem o tempo no solo;
// "o mais restritivo não é a lei": se a resposta muda entre as pontas, é incerto, com as duas e o motivo) ──
const isoD = (y, m, d) => { const t = new Date(y, m - 1, d, 12); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const roster = (n, fm = 420) => { const R = {}; for (let k = 0; k < n; k++) R[isoD(2026, 10, 23 + 2 * k)] = { report_time: '06:00', block_on: '13:30', sectors: 4, flight_minutes: fm, route: 'LIS-OPO-LIS-OPO-LIS', kind: 'flight' }; return R; };
const range = (R) => simFlightRange(run(R, D1), run(R, { ...D1, flight_minutes: 0 }), { lang: 'pt' });
// 98 h de voo nos 27 dias antes (14 serviços de 7 h, dia sim, dia não): com o máximo (4 h 20) passa as 100 h; sem voo, não → incerto
const HV = range(roster(14));
eq('98 h antes: incerto (a resposta muda entre as pontas)', HV.verdict, 'unc');
const HVC = simCards(HV, D1, { lang: 'pt', missing: [], postFlightMin: 30 });
eq('98 h antes: em cima, neutro e tracejado, com as duas pontas e o motivo', (({ color, dashed, title, sub }) => ({ color, dashed, title, sub }))(HVC.lead[0]),
  { color: 'neutral', dashed: true, title: 'Incerto', sub: 'Voo em 28 dias: 98 h a 102 h 20 de 100 h — faltam as horas das pernas' });
eq('98 h antes: a linha dos limites com as duas pontas', HVC.result.find((c) => c.id === 'lim').rows.find((r) => /^Voo/.test(r.k)), { k: 'Voo em 28 dias', v: '98 h a 102 h 20 de 100 h' });
eq('… e a nota diz porquê', HVC.result.find((c) => c.id === 'lim').note, 'O voo deste serviço vai até 4 h 20 (da partida ao último calço, com o tempo no solo) — as horas de cada perna estão nos Pormenores.');
// 105 h antes (os mesmos 14 serviços com 7 h 30): passa mesmo sem voo deste serviço → acima (certo)
const OV = range(roster(14, 450));
eq('105 h antes: acima com as duas pontas (certo)', [OV.verdict, OV.issues.some((i) => i.level === 'bad' && i.type === 'limit' && i.key === 'voo')], ['bad', true]);
// a escala leve: dentro nas duas pontas → certo; a linha mostra as duas
const LT = range(PREV);
eq('escala leve: dentro (certo)', LT.verdict, 'ok');
eq('escala leve: a linha dos limites com as duas pontas', simCards(LT, D1, { lang: 'pt', missing: [], postFlightMin: 30 }).result.find((c) => c.id === 'lim').rows.find((r) => /^Voo/.test(r.k)).v, '5 h a 9 h 20 de 100 h');

// ── 11 · o que o VoiceOver ouve quando o veredicto muda (2026-11-16, da revisão das skills: o veredicto mudava só à vista) ──
// A frase vem dos cartões — o mesmo texto, sem nada novo; o "·" lê-se mal em voz alta e passa a vírgula. A folha anuncia-a quando
// muda (components/SimulationSheet.js), nunca a cada tecla.
eq('voz · dentro: a linha do limite', okC.voice, 'Dentro do limite. PSV 5 h 20 de 13 h, margem 7 h 40.');
eq('voz · acima: o título e o 1.º motivo', badC.voice, `Acima do limite. ${issueText(firstBad, 'pt', '2026-11-19')}`);
eq('voz · incerto: o título e as duas pontas', HVC.voice, 'Incerto. Voo em 28 dias: 98 h a 102 h 20 de 100 h — faltam as horas das pernas');
eq('voz · falta um dado: o que falta', missC.voice, 'Falta o último calço — o veredicto aparece aqui.');
eq('voz · reserva: o que a lei diz', rsC.voice, 'As horas de reserva não contam como serviço para os limites nem para o repouso (CS FTL.1.230(b)). Se te atribuírem um voo, o PSV conta desde a apresentação (CS FTL.1.230(a)).');
eq('voz · em terra, dentro e sem PSV: só o veredicto', [run(PREV, SB).verdict, sbC.voice], ['ok', 'Dentro do limite.']);
eq('voz · em inglês', simCards(okSim, D1, { lang: 'en', missing: [], postFlightMin: 30 }).voice, 'Within limits. FDP 5 h 20 of 13 h, margin 7 h 40.');

// ── 12 · o veredicto de cada dia num cartão só (a folha do dia, V3: fica no topo, por cima do teclado) ──
eq('veredicto · dentro: neutro, a linha do limite', okC.verdict, { t: 'slim', id: 'verdict', color: 'neutral', title: 'Dentro do limite', sub: 'PSV 5 h 20 de 13 h · margem 7 h 40' });
eq('veredicto · acima: o vermelho com "✕"', badC.verdict, badC.lead[0]);
eq('veredicto · falta um dado: o cartão que diz qual', missC.verdict, missC.lead[0]);
eq('veredicto · reserva: o que a lei diz', rsC.verdict, rsC.result.find((c) => c.id === 'none'));
eq('veredicto · em terra sem PSV: só "Dentro do limite"', [sbC.verdict.title, sbC.verdict.sub], ['Dentro do limite', null]);

// ── 13 · VÁRIAS SIMULAÇÕES SEGUIDAS — uma troca (V3 de design/simulacao-varias.html, escolhida pelo Nuno a 2026-11-16) ──
// Cada dia é verificado numa escala com OS OUTROS dias da troca já lá dentro (a folga tira o serviço desse dia; um serviço simulado
// fica no lugar do guardado) — o repouso entre eles e os limites acumulados contam com todos. Nada vai para a escala.
const { simSequence, seqCards, seqDayCards, seqMoney, nextFreeDate, FOLGA } = require(path.resolve('data/simSheet.js'));
const SWAP_R = {
  '2026-11-18': { report_time: '08:00', block_on: '16:30', sectors: 2, flight_minutes: 300, route: 'LIS-OPO-LIS', kind: 'flight' },   // quarta (fim 17:00)
  '2026-11-19': { report_time: '08:00', block_on: '16:30', sectors: 2, flight_minutes: 300, route: 'LIS-OPO-LIS', kind: 'flight' },   // quinta — a que dás
  '2026-11-20': { report_time: '14:00', block_on: '22:00', sectors: 2, flight_minutes: 300, route: 'LIS-FAO-LIS', kind: 'flight' },   // sexta — a tua, trocada
};
const E_QUI = { id: 'a', form: { date: '2026-11-19', kind: FOLGA } };
const E_SEX = { id: 'b', form: { date: '2026-11-20', kind: 'flight', report: '06:00', dep: '07:00', on: '11:20', end: '', sectors: 2, route: 'LIS FNC LIS' } };
const E_SAB = { id: 'c', form: { date: '2026-11-21', kind: 'flight', report: '05:15', dep: '06:15', on: '13:50', end: '', sectors: 2, route: 'LIS LGW LIS' } };
const SEQ_CTX = { duties: SWAP_R, dayLog: {}, ctx: { postFlightMin: 30, isPilot: true, base: 'LIS' }, base: 'LIS', lang: 'pt' };
const seq = (entries, o = {}) => simSequence(entries, { ...SEQ_CTX, ...o });
const SW = seq([E_SAB, E_QUI, E_SEX]);   // fora de ordem de propósito: a folha ordena pelo dia
const dOf = (S0, id) => S0.days.find((x) => x.id === id);
eq('troca · os dias por ordem', SW.days.map((x) => x.date), ['2026-11-19', '2026-11-20', '2026-11-21']);
eq('troca · a folga não simula nada; diz o que sai', [dOf(SW, 'a').folga, dOf(SW, 'a').sim, dOf(SW, 'a').had.route], [true, null, 'LIS-OPO-LIS']);
// sem a quinta (folga), o repouso antes da sexta conta desde quarta às 17:00: 37 h (com a quinta seriam 13 h)
eq('troca · a folga tira a quinta: repouso antes da sexta = 37 h', dOf(SW, 'b').sim.rest.before.actualMin, 37 * 60);
// o sábado conta com a sexta SIMULADA (fim 11:50), não com a tua (fim 22:30): 17 h 25 (com a tua seriam 6 h 45 — abaixo)
eq('troca · o sábado conta com a sexta simulada: 17 h 25', [dOf(SW, 'c').sim.rest.before.actualMin, dOf(SW, 'c').sim.rest.before.status], [17 * 60 + 25, 'ok']);
eq('troca · e a sexta vê o sábado a seguir', dOf(SW, 'b').sim.rest.after.actualMin, 17 * 60 + 25);
eq('troca · dentro nos três', [SW.verdict, dOf(SW, 'b').sim.verdict, dOf(SW, 'c').sim.verdict], ['ok', 'ok', 'ok']);
// o sábado com o último calço às 18:10: PSV 05:15–18:10 = 12 h 55 para 12 h 15 (ORO.FTL.205(b), tabela 2, 05:15–05:29, 1–2 setores;
// o PSV acaba no último calço, ORO.FTL.105(12))
const E_SAB_BAD = { ...E_SAB, form: { ...E_SAB.form, on: '18:10' } };
const SWB = seq([E_QUI, E_SEX, E_SAB_BAD]);
eq('troca · o sábado passa o PSV', [SWB.verdict, dOf(SWB, 'c').sim.verdict, dOf(SWB, 'c').sim.issues.some((i) => i.type === 'fdp' && i.level === 'bad')], ['bad', 'bad', true]);
// um dia por acabar: veredicto "falta"; os outros calculam-se com o que a escala tem nesse dia
const SWN = seq([E_QUI, E_SEX, { ...E_SAB, form: { ...E_SAB.form, on: '' } }]);
eq('troca · um dia por acabar: falta', [SWN.verdict, dOf(SWN, 'c').missing, dOf(SWN, 'c').sim], ['need', ['o último calço'], null]);
// a memória das contas é por dia e pelos outros dias: mudar um dia não pode deixar números velhos nos outros
const M = new Map();
seq([E_QUI, E_SEX, E_SAB], { memos: M });
const later = seq([E_QUI, E_SEX, { ...E_SAB, form: { ...E_SAB.form, report: '04:00', dep: '05:00' } }], { memos: M });
const fresh = seq([E_QUI, E_SEX, { ...E_SAB, form: { ...E_SAB.form, report: '04:00', dep: '05:00' } }]);
eq('troca · a memória não mistura dias', later.days.map((x) => x.sim && [x.sim.verdict, x.sim.rest.before && x.sim.rest.before.actualMin, x.sim.issues.length]),
  fresh.days.map((x) => x.sim && [x.sim.verdict, x.sim.rest.before && x.sim.rest.before.actualMin, x.sim.issues.length]));
// um só dia: o mesmo que a Simulação de um serviço (simCards)
const ONE = seq([{ id: 'x', form: FORM }], { duties: PREV });
eq('um só dia · o mesmo motor', [ONE.verdict, dOf(ONE, 'x').sim.psv && dOf(ONE, 'x').sim.psv.result], [okSim.verdict, okSim.psv && okSim.psv.result]);
eq('folga sozinha: sem serviço para verificar', seq([E_QUI]).verdict, 'none');

// ── 14 · o dia seguinte livre (juntar outro dia; mudar o dia sem cair noutro da troca) ──
const L3 = [E_QUI, E_SEX, E_SAB].map((e) => ({ id: e.id, date: e.form.date }));
eq('livre · depois do último', nextFreeDate(L3, '2026-11-21', 1), '2026-11-22');
eq('livre · a sexta para a frente salta o sábado', nextFreeDate(L3, '2026-11-20', 1, 'b'), '2026-11-22');
eq('livre · a sexta para trás salta a quinta', nextFreeDate(L3, '2026-11-20', -1, 'b'), '2026-11-18');

// ── 15 · o dinheiro da troca: o que ganhas nos dias novos menos o que perdes nos que dás (com os cêntimos) ──
const PAY = { 'LIS-OPO-LIS': 98.4, 'LIS-FNC-LIS': 154.51, 'LIS-LGW-LIS': 182.4, 'LIS-FAO-LIS': 120 };
const moneyOf = (d) => (d && PAY[d.route] != null ? PAY[d.route] : 0);
eq('dinheiro · por dia e o total', seqMoney(SW.days, moneyOf), { rows: [{ date: '2026-11-19', delta: -98.4 }, { date: '2026-11-20', delta: 34.51 }, { date: '2026-11-21', delta: 182.4 }], total: 118.51 });
eq('dinheiro · sem acordo (null) não se mostra meia conta', seqMoney(SW.days, (d) => (d && d.route === 'LIS-FAO-LIS' ? null : moneyOf(d))), null);

// ── 16 · a folha da troca: em cima o veredicto; a linha do tempo com o repouso entre os dias; em baixo o resultado ──
const SC = seqCards(SW, { lang: 'pt', postFlightMin: 30, money: seqMoney(SW.days, moneyOf) });
eq('folha · em cima: dentro, sem cor', SC.top, { t: 'slim', id: 'top', color: 'neutral', title: 'A troca fica dentro dos limites', sub: '3 dias · o repouso entre eles acima do mínimo' });
eq('folha · a linha do tempo: o dia, o cartão, o repouso antes', SC.rows.map((r) => [r.d, r.wd, r.gap, r.card.color, r.card.kind, r.card.title, r.card.sub]), [
  ['19', 'QUI', null, 'rest', 'Folga', 'No lugar de LIS → OPO → LIS', 'o serviço e o que ele paga saem da conta'],
  ['20', 'SEX', '37 h de repouso · mín. 12 h', 'flight', 'Voo · 2 setores', 'LIS → FNC → LIS', '06:00 → 11:50 · margem 7 h 40'],
  ['21', 'SÁB', '17 h 25 de repouso · mín. 12 h', 'flight', 'Voo · 2 setores', 'LIS → LGW → LIS', '05:15 → 14:20 · margem 3 h 40'],   // o PSV acaba no último calço (ORO.FTL.105(12)): 05:15–13:50 = 8 h 35 de 12 h 15
]);
eq('folha · o resultado, por esta ordem', SC.result.map((c) => c.id), ['replace', 'money', 'rest', 'lim', 'fatigue']);
eq('folha · os dias trocados dizem-se', SC.result[0].text, 'Na sexta, o simulado fica no lugar do serviço que tens (LIS-FAO-LIS).');
eq('folha · o dinheiro da troca', [SC.result[1].title, SC.result[1].sub, SC.result[1].value, SC.result[1].gain], ['Quanto recebes com a troca', 'qui −98,40 € · sex +34,51 € · sáb +182,40 €', '+118,51 €', true]);
eq('folha · o repouso antes de cada dia e o mínimo depois do último', SC.result[2].rows, [
  { k: 'Antes de sex · acima do mínimo', v: '37 h' }, { k: 'Antes de sáb · acima do mínimo', v: '17 h 25' }, { k: 'Depois de sáb · até às 02:20 (+1)', v: 'mín. 12 h' }]);
eq('folha · a voz é a de cima', SC.voice, 'A troca fica dentro dos limites. 3 dias, o repouso entre eles acima do mínimo');
const SCB = seqCards(SWB, { lang: 'pt', postFlightMin: 30 });
const badSab = [...dOf(SWB, 'c').sim.issues.filter((i) => i.level === 'bad')][0];
eq('folha · acima: o vermelho com "✕" e o dia', SCB.top, { t: 'slim', id: 'top', color: 'stop', mark: '✕', title: 'A troca passa o limite no sábado', sub: issueText(badSab, 'pt', '2026-11-21') });
eq('folha · o dia que passa leva o "✕" e o motivo', [SCB.rows[2].card.mark, SCB.rows[2].card.sub], ['✕', `05:15 → 18:40 · ${issueText(badSab, 'pt', '2026-11-21')}`]);
eq('folha · falta: diz o quê e de que dia', seqCards(SWN, { lang: 'pt', postFlightMin: 30 }).top, { t: 'text', id: 'top', color: 'neutral', kind: 'O veredicto', text: 'Falta o último calço de sábado — o veredicto aparece aqui.' });
eq('folha · o dia por acabar diz o que falta', seqCards(SWN, { lang: 'pt', postFlightMin: 30 }).rows[2].card.sub, 'falta o último calço');
eq('folha · folga num dia sem serviço', seqCards(seq([{ id: 'z', form: { date: '2026-11-23', kind: FOLGA } }]), { lang: 'pt' }).rows[0].card.title, 'Sem serviço nesse dia');
// um só dia: a folha é a da Simulação de um serviço (o mesmo veredicto e o mesmo resultado, sem o título "O resultado")
const SC1 = seqCards(ONE, { lang: 'pt', postFlightMin: 30, single: { money: { total: 154.51, label: 'Per diem da rota · piloto' } } });
eq('um só dia · em cima o veredicto do dia', SC1.top, okC.verdict);
eq('um só dia · o resultado de sempre', SC1.result.map((c) => c.id), ['money', 'rest', 'lim', 'fatigue']);
// a folha de cada dia (o que abre ao tocar): o veredicto desse dia e a voz
eq('a folha do dia · o sábado acima', seqDayCards(dOf(SWB, 'c'), { lang: 'pt', postFlightMin: 30 }).verdict.title, 'Acima do limite');
eq('a folha do dia · a folga', seqDayCards(dOf(SW, 'a'), { lang: 'pt' }), { verdict: { t: 'slim', id: 'verdict', color: 'rest', title: 'Folga', sub: 'No lugar de LIS → OPO → LIS — o serviço e o que ele paga saem da conta' }, voice: 'Folga. No lugar de LIS → OPO → LIS — o serviço e o que ele paga saem da conta' });

// ── 17 · da revisão independente (2026-11-16): os casos de bordo da troca ──
// (1) a reserva não tem veredicto do motor — as duas pontas do voo (por causa de outro dia sem pernas) não a podem pôr "dentro"
const E_RES = { id: 'r', form: { date: '2026-11-22', kind: 'reserve', report: '06:00', dep: '', on: '', end: '14:00', sectors: 0, route: '' } };
const E_LEGLESS = { id: 'f', form: { date: '2026-11-24', kind: 'flight', report: '06:00', dep: '07:00', on: '11:20', end: '', sectors: 2, route: 'LIS FNC LIS' } };
const RS2 = seq([E_RES, E_LEGLESS], { duties: {} });
eq('bordo · a reserva fica sem veredicto com um voo sem pernas ao lado', [dOf(RS2, 'r').sim.verdict, seqCards(RS2, { lang: 'pt', postFlightMin: 30 }).rows[0].card.sub], ['none', '06:00 → 14:00 · reserva: sem limites a verificar']);
// (2) o mesmo dia duas vezes: não se verifica um sem o outro — diz-se e espera-se que mude
const DUP = seq([E_SEX, { id: 'b2', form: { ...E_SEX.form, report: '15:00', dep: '16:00', on: '20:00' } }]);
const DUPC = seqCards(DUP, { lang: 'pt', postFlightMin: 30 });
eq('bordo · o mesmo dia duas vezes: falta mudar o dia', [DUP.verdict, DUPC.top.text, DUPC.rows[1].card.sub], ['need', 'Sexta 20 nov está duas vezes na troca — muda o dia de um deles.', 'este dia já está na troca — muda o dia']);
eq('bordo · e não entra no dinheiro', seqMoney(DUP.days, moneyOf), { rows: [{ date: '2026-11-20', delta: 34.51 }], total: 34.51 });
// (3) folga num dia com mais de um serviço: saem todos (o FTL e o dinheiro); trocar o principal deixa os outros
const R_EXTRA = { ...SWAP_R, '2026-11-19': { ...SWAP_R['2026-11-19'], extra: [{ kind: 'positioning', report_time: '18:00', block_on: '19:10', route: 'OPO-LIS' }] } };
const PAY2 = { ...PAY, 'OPO-LIS': 40 };
const moneyOf2 = (d) => (d && PAY2[d.route] != null ? PAY2[d.route] : 0);
const SWX = seq([E_QUI, E_SEX], { duties: R_EXTRA });
eq('bordo · folga com dois serviços: o dinheiro tira os dois', seqMoney(SWX.days, moneyOf2).rows[0], { date: '2026-11-19', delta: -138.4 });
eq('bordo · e o cartão diz que sai mais um', seqCards(SWX, { lang: 'pt', postFlightMin: 30 }).rows[0].card.title, 'No lugar de LIS → OPO → LIS e mais 1 serviço');
// (4) o serviço que passa a meia-noite: o mínimo a seguir é no dia seguinte — "(+1)"
const NIGHT = simDutyOf({ ...FORM, report: '22:00', dep: '23:00', on: '05:00' }, { base: 'LIS' });
const nightRows = simCards(run(PREV, NIGHT), NIGHT, { lang: 'pt', missing: [], postFlightMin: 30 }).result.find((c) => c.id === 'rest').rows;
eq('bordo · a meia-noite: "até às" com o (+1)', /^Depois · até às \d\d:\d\d \(\+1\)$/.test(nightRows[nightRows.length - 1].k), true);
// (5) o repouso entre duas linhas só se diz quando vem da linha de cima (aqui há serviços teus pelo meio, de 18 a 20)
const GAPX = seq([{ id: 'g1', form: { ...E_SEX.form, date: '2026-11-17' } }, { id: 'g2', form: { ...E_SAB.form } }]);
eq('bordo · serviços teus pelo meio: sem o repouso entre as linhas', seqCards(GAPX, { lang: 'pt', postFlightMin: 30 }).rows[1].gap, null);
eq('bordo · a folga pelo meio: o repouso diz-se (vem de antes dela)', SC.rows[1].gap, '37 h de repouso · mín. 12 h');
// (6) um repouso curto entre dois dias simulados é UMA falha (o "depois" de um é o "antes" do outro)
const E_DOM = { id: 'd1', form: { date: '2026-11-22', kind: 'flight', report: '14:00', dep: '15:00', on: '21:30', end: '', sectors: 2, route: 'LIS FNC LIS' } };
const E_SEG = { id: 'd2', form: { date: '2026-11-23', kind: 'flight', report: '05:30', dep: '06:30', on: '10:00', end: '', sectors: 2, route: 'LIS OPO LIS' } };
const SHORT2 = seq([E_DOM, E_SEG], { duties: {} });
eq('bordo · um repouso curto entre dois dias conta uma vez', [SHORT2.verdict, seqCards(SHORT2, { lang: 'pt', postFlightMin: 30 }).top.title], ['bad', 'A troca passa o limite na segunda']);
// (7) "o repouso entre eles" só quando se mediu um repouso entre dois dias simulados
eq('bordo · uma folga e um serviço: sem "o repouso entre eles"', seqCards(seq([E_QUI, E_SEX]), { lang: 'pt', postFlightMin: 30 }).top.sub, '2 dias');
// (8) a folha sem nada não rebenta; dois dias da mesma semana com o mesmo nome levam o número
eq('bordo · sem troca não rebenta', seqCards(null, { lang: 'pt' }).rows, []);
const TWOFRI = seq([E_SEX, { id: 'b7', form: { ...E_SEX.form, date: '2026-11-27' } }], { duties: {} });
eq('bordo · duas sextas: o dinheiro diz o dia', seqMoney(TWOFRI.days, moneyOf) && seqCards(TWOFRI, { lang: 'pt', postFlightMin: 30, money: seqMoney(TWOFRI.days, moneyOf) }).result.find((c) => c.id === 'money').sub, 'sex 20 +154,51 € · sex 27 +154,51 €');

// ── 18 · da 2.ª passagem da revisão (2026-11-16) ──
const DUPF = seqCards(seq([{ id: 'v', form: { ...E_SEX.form, date: '2026-11-19' } }, { id: 'w', form: { date: '2026-11-19', kind: FOLGA } }]), { lang: 'pt', postFlightMin: 30 });
eq('bordo · uma folga repetida diz "Folga", na cor do repouso', [DUPF.rows[1].card.color, DUPF.rows[1].card.kind, DUPF.rows[1].card.title, DUPF.rows[1].card.sub], ['rest', 'Folga', 'Folga', 'este dia já está na troca — muda o dia']);
const TWOSAT = seq([E_SAB, { id: 's2', form: { ...E_SAB.form, date: '2026-11-28', on: '' } }], { duties: {} });
eq('bordo · "falta" com dois sábados diz qual', seqCards(TWOSAT, { lang: 'pt', postFlightMin: 30 }).top.text, 'Falta o último calço de sábado 28 — o veredicto aparece aqui.');

console.log(`folha da simulação — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
