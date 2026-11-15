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

console.log(`folha da simulação — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
