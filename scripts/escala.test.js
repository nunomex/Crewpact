/*
 * Golden da ESCALA 3.0 "cartões de cor" (data/escalaDay.js) — PURO, sem rede nem React.
 * Os dados do esboço aprovado (design/escala-cartoes.html, 2026-11-13: easyJet, piloto, base Lisboa, hoje = sexta 13 de
 * novembro de 2026) e as REGRAS trancadas:
 *   B1 a célula pela cor do tipo; o bloco junta a rotação com pernoita fora e as férias seguidas, e parte-se no fim da semana
 *   · a ordem do dia é a da hora (acerto 9) · a linha entre serviços só com o intervalo do motor atribuído ao par certo —
 *   nunca um "repouso ✓" de recurso (acerto 9) · B3 a régua no relógio do report com a duração real (os fusos acertados),
 *   o resto depois da meia-noite no dia seguinte, a pernoita a salva, a WOCL só num voo que começa na base, o "agora" só
 *   hoje · B2 as pernas com a duração real e a Zulu só quando difere · todo o € com cêntimos.
 * Executar:  node scripts/escala.test.js   (ou: npm run test:escala)
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
const cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs');
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: [cjsPlugin] }).code, filename);
};
const E = require(path.resolve('data/escalaDay.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}\n    tem:    ${g}\n    devia:  ${e}`); }
};
const yes = (label, cond, extra = '') => { if (cond) ok++; else { fail++; console.log(`✗ ${label}${extra ? ` — ${extra}` : ''}`); } };
const fmtEur = (n) => { const [i, d] = Number(n).toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${d} €`; };

// ── dados de teste (os do esboço) ──
const leg = (flightNo, dep, off, arr, on) => ({ flightNo, dep, off, arr, on });
const voo = (route, report, legs, extra = {}) => ({ kind: 'flight', route, report_time: report, legs, block_on: legs[legs.length - 1].on, ...extra });
const terra = (kind, start, end, extra = {}) => ({ kind, report_time: start, block_on: end, ...extra });
const D = {
  '2026-11-02': voo('LIS-FNC-LIS', '06:00', [leg('EZY8341', 'LIS', '06:45', 'FNC', '08:30'), leg('EZY8342', 'FNC', '09:15', 'LIS', '10:55')]),
  '2026-11-03': voo('LIS-LGW', '06:20', [leg('EZY8351', 'LIS', '07:05', 'LGW', '09:50')], { nightStop: true }),
  '2026-11-04': voo('LGW-LIS', '10:30', [leg('EZY8352', 'LGW', '11:15', 'LIS', '14:00')]),
  '2026-11-07': terra('standby_home', '06:00', '14:00'),
  '2026-11-12': { ...terra('training', '08:00', '12:00'), extra: [voo('LIS-FNC-LIS', '18:30', [leg('EZY8343', 'LIS', '19:15', 'FNC', '20:55'), leg('EZY8344', 'FNC', '21:45', 'LIS', '23:40')])] },
  '2026-11-13': voo('LIS-LGW', '05:30', [leg('EZY8351', 'LIS', '06:15', 'LGW', '09:00')], { nightStop: true }),
  '2026-11-14': voo('LGW-LIS', '07:30', [leg('EZY8352', 'LGW', '08:15', 'LIS', '11:00')]),
  '2026-11-15': voo('LIS-BCN', '05:50', [leg('EZY8411', 'LIS', '06:35', 'BCN', '09:30')], { nightStop: true }),   // domingo: o bloco não passa para segunda
  '2026-11-16': voo('BCN-LIS', '10:00', [leg('EZY8412', 'BCN', '10:45', 'LIS', '11:55')]),
  // o voo foi guardado PRIMEIRO e a assistência depois — a folha tem de os mostrar pela hora (acerto 9)
  '2026-11-19': { ...voo('LIS-MAD-LIS', '10:40', [leg('EZY8461', 'LIS', '11:25', 'MAD', '13:45'), leg('EZY8462', 'MAD', '14:30', 'LIS', '14:55')]), extra: [terra('standby_home', '06:00', '12:00')] },
  '2026-11-22': { ...voo('LIS-GVA-LIS', '07:00', [leg('EZY8471', 'LIS', '07:45', 'GVA', '11:35')]), deleted: true },
  '2026-11-28': { ...voo('LIS-FNC-LIS', '06:00', [leg('EZY8341', 'LIS', '06:45', 'FNC', '08:30')]), dirty: true },
  '2026-11-30': terra('reserve', '06:00', '18:00', { nightStop: true }),   // a pernoita no último dia do mês não junta a dezembro
};
const ABS = { '2026-11-24': 'vacDays', '2026-11-25': 'vacDays', '2026-11-26': 'vacDays', '2026-11-27': 'sickDays' };

// ════════ B1 · as células do mês ════════
const G = E.monthCells({ ym: '2026-11', duties: D, absences: ABS, base: () => 'LIS', today: '2026-11-13', sel: '2026-11-13' });
const C = (d) => G.cells[d - 1];
eq('novembro de 2026 começa ao domingo (coluna 6) e tem 6 semanas', [G.firstWeekday, G.nRows, G.dim], [6, 6, 30]);
eq('célula de voo: areia com o destino fora da base', [C(2).kind, C(2).code], ['voo', 'FNC']);
eq('assistência = serviço em terra (lilás) com SBY', [C(7).kind, C(7).code], ['terra', 'SBY']);
eq('folga = só o número', [C(5).kind, C(5).code], [null, null]);
eq('apagado não conta (dia 22 fica folga)', C(22).kind, null);
eq('férias e baixa = neutro, FÉR / DOE', [C(24).kind, C(24).code, C(27).kind, C(27).code], ['fer', 'FÉR', 'doe', 'DOE']);
eq('em inglês: LVE / SCK', [E.monthCells({ ym: '2026-11', duties: {}, absences: ABS, base: 'LIS', lang: 'en' }).cells[23].code], ['LVE']);
eq('a lua da pernoita', [C(3).ns, C(4).ns, C(13).ns], [true, false, true]);
eq('dois serviços = 2.ª camada (dias 12 e 19)', [C(12).two, C(19).two, C(13).two], [true, true, false]);
eq('alteração por rever (dia 28)', [C(28).dirty, C(2).dirty], [true, false]);
eq('hoje e o escolhido', [C(13).today, C(13).sel, C(12).today], [true, true, false]);
eq('a rotação 3–4 é um bloco', [C(3).joinR, C(4).joinL, C(4).joinR], [true, true, false]);
eq('a rotação 13–14 é um bloco', [C(13).joinR, C(14).joinL], [true, true]);
eq('o bloco não passa de domingo para segunda (15 → 16)', [C(15).col, C(15).joinR, C(16).joinL], [6, false, false]);
eq('as férias seguidas são um bloco (24–25–26); a baixa do dia 27 fica de fora', [C(24).joinR, C(25).joinL, C(25).joinR, C(26).joinL, C(26).joinR, C(27).joinL], [true, true, true, true, false, false]);
eq('dois dias de voo que voltam à base não se juntam (2 · 3)', [C(2).joinR, C(3).joinL], [false, false]);
eq('a pernoita no último dia do mês não junta', C(30).joinR, false);

// ════════ a ordem do dia: pela hora (acerto 9) ════════
const o19 = E.orderServices(D['2026-11-19']);
eq('dia 19: a assistência das 06:00 vem antes do voo das 10:40', o19.map((o) => [o.idx, o.svc.report_time]), [[1, '06:00'], [0, '10:40']]);
const o12 = E.orderServices(D['2026-11-12']);
eq('dia 12: formação 08:00 e voo 18:30 (idx guardado)', o12.map((o) => o.idx), [0, 1]);
eq('um dia apagado não tem serviços', E.orderServices(D['2026-11-22']), []);
const noRep = { kind: 'flight', route: 'LIS-OPO', legs: [leg('EZY1', 'LIS', '15:00', 'OPO', '16:00')], extra: [terra('office', '09:00', '12:00')] };
eq('sem report, ordena pela 1.ª partida', E.orderServices(noRep).map((o) => o.idx), [1, 0]);

// ════════ a linha entre serviços: só com o intervalo do motor no par certo ════════
const gRest = { gapMin: 390, requiredMin: 720, kind: 'split', place: 'base' };
eq('dois serviços, o motor deu um intervalo → atribui-se', E.attributeBetween(o12, [gRest]), [gRest]);
eq('dois serviços, o motor filtrou o intervalo (assistência + voo chamado) → nada', E.attributeBetween(o19, []), [null]);
eq('sem a lista do motor → nada (nunca um "repouso ✓" de recurso)', E.attributeBetween(o19, undefined), [null]);
eq('um serviço sem report → não se atribui', E.attributeBetween(E.orderServices(noRep), [gRest]), [null]);
const three = E.orderServices({ ...terra('office', '06:00', '08:00'), extra: [terra('training', '12:00', '14:00'), terra('office', '20:00', '22:00')] });
eq('três serviços e só um intervalo do motor → nenhum se atribui', E.attributeBetween(three, [gRest]), [null, null]);
eq('um só serviço → nada para atribuir', E.attributeBetween(E.orderServices(D['2026-11-13']), [gRest]), []);

// ════════ as horas: o relógio do report e a duração real ════════
eq('LIS → LGW 05:30: fim 09:30 com 30 min de débrief', (({ start, end }) => [start, end])(E.svcTimes('2026-11-13', D['2026-11-13'], 30)), [330, 570]);
const t19 = E.svcTimes('2026-11-19', D['2026-11-19'], 30);
eq('LIS → MAD → LIS: as pernas reais 1 h 20 e 1 h 25 (Madrid está +1); fim 15:25', [t19.start, t19.end, t19.legMin], [640, 925, [80, 85]]);
const t15 = E.svcTimes('2026-11-15', D['2026-11-15'], 30);
eq('LIS → BCN: a régua acaba às 09:00 no relógio do report (não às 10:00 do relógio de Barcelona)', [t15.start, t15.end, t15.legMin], [350, 540, [115]]);
const t12 = E.svcTimes('2026-11-12', D['2026-11-12'].extra[0], 30);
eq('o voo da noite do dia 12 acaba às 00:10 (1450 min)', [t12.start, t12.end], [1110, 1450]);
eq('assistência 06:00–12:00', (({ start, end }) => [start, end])(E.svcTimes('2026-11-19', D['2026-11-19'].extra[0], 30)), [360, 720]);
eq('uma entrada das 06:00 às 06:00 lê-se como 24 h', E.svcTimes('2026-11-07', terra('standby_airport', '06:00', '06:00'), 0).end, 1800);
eq('sign-off registado manda sobre o débrief estimado', E.svcTimes('2026-11-13', { ...D['2026-11-13'], signOff: '09:20' }, 30).end, 560);
eq('sem horas → sem régua', (({ start, end }) => [start, end])(E.svcTimes('2026-11-01', { kind: 'office' }, 0)), [null, null]);

// ════════ B3 · a régua ════════
const R13 = E.dayRuler({ iso: '2026-11-13', ordered: E.orderServices(D['2026-11-13']), prevOrdered: E.orderServices(D['2026-11-12']), ns: true, prevNs: false, base: 'LIS', postFlightMin: 30, nowMin: 490 });
eq('dia 13: o resto do voo da véspera (00:00–00:10), o serviço 05:30–09:30, a pernoita até ao fim', R13.blocks.map((b) => [b.a, b.b, b.color, !!b.toEnd, !!b.fromStart]),
  [[0, 10, 'sand', false, true], [330, 570, 'sand', false, false], [570, 1440, 'sage', true, false]]);
eq('dia 13: a WOCL porque o report às 05:30 cai dentro', R13.wocl, { a: 120, b: 360, note: 'WOCL 02:00–05:59 · o report às 05:30 cai dentro' });
eq('dia 13: o "agora" às 08:10', R13.now, 490);
const R12 = E.dayRuler({ iso: '2026-11-12', ordered: o12, prevOrdered: [], ns: false, base: 'LIS', postFlightMin: 30 });
eq('dia 12: formação 08–12 e voo 18:30 até ao fim (passa a meia-noite)', R12.blocks.map((b) => [b.a, b.b, b.color, !!b.toEnd]), [[480, 720, 'lilac', false], [1110, 1440, 'sand', true]]);
eq('dia 12: a linha de baixo diz a que horas acaba', R12.endNote, 'o serviço acaba às 00:10 de sexta-feira');
eq('dia 12: sem WOCL e sem "agora" (não é hoje)', [R12.wocl, R12.now], [null, null]);
const R14 = E.dayRuler({ iso: '2026-11-14', ordered: E.orderServices(D['2026-11-14']), prevOrdered: E.orderServices(D['2026-11-13']), ns: false, prevNs: true, base: 'LIS', postFlightMin: 30 });
eq('dia 14 (volta de LGW): a pernoita da véspera até ao report das 07:30, depois o voo', R14.blocks.map((b) => [b.a, b.b, b.color]), [[0, 450, 'sage'], [450, 690, 'sand']]);
eq('dia 14: o voo começa fora da base → sem WOCL', R14.wocl, null);
const R19 = E.dayRuler({ iso: '2026-11-19', ordered: o19, base: 'LIS', postFlightMin: 30 });
eq('dia 19: a assistência e o voo, pela hora', R19.blocks.map((b) => [b.a, b.b, b.color]), [[360, 720, 'lilac'], [640, 925, 'sand']]);
const late = { '2026-11-20': voo('LIS-FNC-LIS', '22:00', [leg('EZY1', 'LIS', '22:45', 'FNC', '00:30'), leg('EZY2', 'FNC', '01:15', 'LIS', '02:55')]) };
const R21 = E.dayRuler({ iso: '2026-11-21', ordered: [], prevOrdered: E.orderServices(late['2026-11-20']), base: 'LIS', postFlightMin: 30 });
eq('o voo da véspera que acaba às 03:25 abre a régua e toca na WOCL deste dia', [R21.blocks.map((b) => [b.a, b.b]), R21.wocl && R21.wocl.note], [[[0, 205]], 'WOCL 02:00–05:59 · o serviço da véspera passa por ela']);

// ════════ textos e cartões ════════
eq('durações: 50 min · 4 h · 6 h 30 · 1 h 05', [E.fmtDur(50), E.fmtDur(240), E.fmtDur(390), E.fmtDur(65)], ['50 min', '4 h', '6 h 30', '1 h 05']);
eq('repartido (220)', E.betweenText(gRest), { strong: '6 h 30 entre os dois', rest: 'um só serviço repartido (CS FTL.1.220)' });
eq('repouso cumprido', E.betweenText({ gapMin: 780, requiredMin: 720, kind: 'rest', place: 'base' }), { strong: '13 h entre os dois', rest: 'repouso cumprido (mín. 12 h na base)' });
eq('incerto (as duas leituras)', E.betweenText({ gapMin: 630, requiredMin: 720, kind: 'either', place: 'away' }), { strong: 'Incerto · 10 h 30 entre os dois', rest: 'serviço repartido ou repouso curto (mín. 12 h fora)' });
eq('perto de mais', E.betweenText({ gapMin: 90, requiredMin: 720, kind: 'continuous', place: 'base' }).rest, 'perto de mais: é o mesmo serviço');
eq('sem intervalo → sem texto', E.betweenText(null), null);

const kindLabel = (k) => ({ standby_home: 'Assistência em casa', training: 'Formação', flight: 'Voo' }[k] || k);
const cityOf = (c) => ({ LIS: 'Lisboa', LGW: 'Londres Gatwick', FNC: null, MAD: null }[c] || null);
const M13 = { 0: { total: 41.2, nightStop: 48 } };
const fold13 = E.dayCards({ iso: '2026-11-13', ordered: E.orderServices(D['2026-11-13']), open: false, money: M13, kindLabel, cityOf, nightStop: { station: 'LGW', hotel: 'Hotel Gatwick Norte' }, postFlightMin: 30, fmtEur });
eq('dobrado: uma linha fina por serviço e a pernoita', fold13.map((c) => [c.t, c.color, c.title, c.sub, c.value]), [
  ['slim', 'sand', 'LIS → LGW', 'EZY8351 · 06:15–09:00 · report 05:30', '+41,20 €'],
  ['slim', 'sage', 'Pernoita em LGW', 'Hotel Gatwick Norte', '+48,00 €']]);
eq('a linha do serviço abre o Detalhe desse serviço; a pernoita abre o hotel (toque longo edita)', [fold13[0].open, fold13[1].open, fold13[1].longOpen], [{ to: 'detail', idx: 0 }, { to: 'hotel' }, { to: 'hotelEdit' }]);
const noHotel = E.dayCards({ iso: '2026-11-13', ordered: E.orderServices(D['2026-11-13']), open: false, money: {}, kindLabel, cityOf, nightStop: { station: 'LGW', hotel: null }, postFlightMin: 30, fmtEur });
eq('sem hotel: pede para o guardar, sem € inventado', [noHotel[0].value, noHotel[1].sub, noHotel[1].value, noHotel[1].longOpen], [null, 'sem hotel guardado · toca para o guardar', null, null]);
const fold19 = E.dayCards({ iso: '2026-11-19', ordered: o19, open: false, money: { 0: { total: 23.4 } }, kindLabel, cityOf, postFlightMin: 30, fmtEur });
eq('dobrado, dia 19: a assistência primeiro, com as horas', fold19.map((c) => [c.color, c.title, c.sub]), [['lilac', 'Assistência em casa', '06:00–12:00'], ['sand', 'LIS → MAD → LIS', 'EZY8461 · 11:25–14:55 · report 10:40']]);
const open19 = E.dayCards({ iso: '2026-11-19', ordered: o19, open: true, money: { 0: { total: 23.4 } }, kindLabel, cityOf, postFlightMin: 30, fmtEur });
eq('aberto, dia 19: cartão da assistência com início, duração e fim', [open19[0].t, open19[0].kind, open19[0].a, open19[0].dur, open19[0].b], ['card', 'Serviço em terra', { v: '06:00', l: 'início' }, '6 h', { v: '12:00', l: 'fim' }]);
eq('aberto, dia 19: o voo com o report e o fim do serviço', [open19[1].kind, open19[1].sub, open19[1].gain], ['Voo · 2 setores', 'report 10:40 · fim do serviço 15:25', '+23,40 €']);
eq('B2: as pernas com a duração real, a Zulu só quando difere e o tempo no solo', open19[1].legs, [
  { fno: 'EZY8461', dh: false, z: 'chega 12:45Z', a: { v: '11:25', l: 'LIS · Lisboa' }, dur: '1 h 20', b: { v: '13:45', l: 'MAD' }, gap: '45 min no solo' },
  { fno: 'EZY8462', dh: false, z: 'parte 13:30Z', a: { v: '14:30', l: 'MAD' }, dur: '1 h 25', b: { v: '14:55', l: 'LIS · Lisboa' }, gap: null }]);
const open12 = E.dayCards({ iso: '2026-11-12', ordered: o12, open: true, money: {}, kindLabel, cityOf, postFlightMin: 30, fmtEur });
eq('aberto, dia 12: o voo que passa a meia-noite diz o dia', open12[1].sub, 'report 18:30 · fim do serviço 00:10 de sexta-feira');
eq('aberto: sem € não há pílula', open12.map((c) => c.gain), [null, null]);
yes('todo o € com cêntimos', [fold13[0].value, fold13[1].value, open19[1].gain].every((v) => /,\d\d €$/.test(v)));

// ════════ a agenda (A2 + os dias passados em D) ════════
eq('a rota para ler: hífenes → setas', [E.prettyRoute('LIS-OPO'), E.prettyRoute('LIS - FNC - LIS'), E.prettyRoute(''), E.prettyRoute(null)], ['LIS → OPO', 'LIS → FNC → LIS', null, null]);
const AG = E.agendaRows({ ym: '2026-11', duties: D, absences: ABS, today: '2026-11-13', money: (iso) => (iso === '2026-11-03' ? 89.2 : null), kindLabel, fmtEur });
const heads = AG.filter((r) => r.t === 'head').map((r) => r.text);
eq('cabeçalhos do mês corrente', heads, ['Já feito', 'Hoje · sexta 13', 'A seguir']);
const ixHoje = AG.findIndex((r) => r.t === 'head' && r.id === 'today');
eq('logo a seguir a "Hoje" vem o dia 13', [AG[ixHoje + 1].t, AG[ixHoje + 1].iso], ['bar', '2026-11-13']);
const bar = (iso) => AG.find((r) => r.t === 'bar' && r.iso === iso);
const off = (from) => AG.find((r) => r.t === 'off' && r.from === from);
eq('dia passado com € à direita (o que rendeu), com cêntimos', [bar('2026-11-03').past, bar('2026-11-03').right], [true, { gain: '+89,20 €' }]);
eq('dia passado sem € → a hora', bar('2026-11-04').right, { time: 'report 10:30' });
eq('dia que vem: a hora do report (voo) ou início–fim (terra)', [bar('2026-11-14').right, bar('2026-11-16').right], [{ time: 'report 07:30' }, { time: 'report 10:00' }]);
eq('dia em terra que já passou, sem €: início–fim', bar('2026-11-07').right, { time: '06:00–14:00' });
eq('a barra do dia 19: o voo manda no título, dois serviços', [bar('2026-11-19').kind, bar('2026-11-19').title, bar('2026-11-19').two], ['voo', 'LIS → MAD → LIS', true]);
eq('a pernoita na barra', [bar('2026-11-03').ns, bar('2026-11-04').ns], [true, false]);
eq('dias vazios entre serviços = Folga, juntos numa linha', [off('2026-11-05').label, off('2026-11-05').n, off('2026-11-05').dFrom, off('2026-11-05').dTo], ['Folga', 2, 5, 6]);
eq('o dia apagado (22) entra na folga', [off('2026-11-20').from, off('2026-11-20').to, off('2026-11-20').n], ['2026-11-20', '2026-11-23', 4]);
eq('o dia 1 (antes do 1.º serviço da escala) não se chama folga', off('2026-11-01').label, 'Sem serviços na escala');
eq('férias e baixa numa barra neutra', [bar('2026-11-24').kind, bar('2026-11-24').title, bar('2026-11-27').kind, bar('2026-11-27').title], ['fer', 'Férias', 'doe', 'Baixa']);
eq('hoje com serviço = barra própria marcada', [bar('2026-11-13').today, bar('2026-11-13').past], [true, false]);
const AGv = E.agendaRows({ ym: '2026-11', duties: { '2026-11-10': D['2026-11-13'], '2026-11-20': D['2026-11-13'] }, today: '2026-11-15', kindLabel, fmtEur });
eq('hoje sem serviço fica numa linha própria (folga), entre duas folgas', AGv.filter((r) => r.t === 'off').map((r) => [r.dFrom, r.dTo, r.today, r.label]), [[1, 9, false, 'Sem serviços na escala'], [11, 14, false, 'Folga'], [15, 15, true, 'Folga'], [16, 19, false, 'Folga'], [21, 30, false, 'Sem serviços na escala']]);
const AGpast = E.agendaRows({ ym: '2026-10', duties: D, today: '2026-11-13', kindLabel, fmtEur });
eq('mês passado: só "Já feito" no topo', AGpast.filter((r) => r.t === 'head').map((r) => r.text), ['Já feito']);
const AGfut = E.agendaRows({ ym: '2026-12', duties: D, today: '2026-11-13', kindLabel, fmtEur });
eq('mês futuro sem escala: sem cabeçalhos, uma linha "Sem serviços na escala"', [AGfut.filter((r) => r.t === 'head').length, AGfut.map((r) => [r.t, r.label, r.n])], [0, [['off', 'Sem serviços na escala', 31]]]);
eq('em inglês', E.agendaRows({ ym: '2026-11', duties: D, today: '2026-11-13', lang: 'en', kindLabel, fmtEur }).filter((r) => r.t === 'head').map((r) => r.text), ['Done', 'Today · Friday 13', 'Coming up']);

// ════════ o ano em meses (A1) ════════
const Y = E.yearMonths({ year: 2026, duties: D, today: '2026-11-13' });
eq('novembro: 12 dias com serviço (o apagado não conta), é o mês atual', [Y[10].label, Y[10].count, Y[10].current, Y[10].empty], ['Nov', 12, true, false]);
eq('dezembro sem escala', [Y[11].count, Y[11].empty, Y[11].current], [0, true, false]);
eq('doze meses', Y.length, 12);

console.log(`\n${fail ? '✗' : '✓'} escala (escalaDay): ${ok} certos, ${fail} errados`);
process.exit(fail ? 1 : 0);
