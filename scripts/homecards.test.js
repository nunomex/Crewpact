/*
 * Golden do INÍCIO 3.0 "cartões de cor" (data/homeCards.js) — PURO, sem rede nem React.
 * Os 16 estados do esboço aprovado (design/inicio-cartoes.html, 2026-11-11), com os dados de teste do esboço (easyJet,
 * piloto, base Lisboa; hoje = quarta 11 de novembro de 2026), e as REGRAS do esboço trancadas:
 *   nada se repete entre o topo e os cartões · nunca mais de dois cartões grandes · com um aviso o 2.º passa a linha fina ·
 *   o selo entre duas horas é o intervalo entre elas · todo o € com cêntimos · o total do mês "estimado · bruto" ·
 *   "Incerto" com o que falta (sem "Completar" no cartão de serviço — 2026-11-14) · o número gigante e os dois factos cabem lado a lado a 390 e a 375.
 * Diferenças ao esboço, de propósito (escritas em docs/decisoes.md): a folga a menos de 48 h conta em HORAS (regra da
 * auditoria do tripulante, 2026-11-04) · "Certificado médico caduca em" sem artigo (o artigo muda com o documento) ·
 * o standby diz que o PSV é uma estimativa a 1 setor (225) em vez de "não chamado até agora".
 * Executar:  node scripts/homecards.test.js   (ou: npm run test:homecards)
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
const { homeCards, fitGiant, fmt, toMin } = require(path.resolve('data/homeCards.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}\n    tem:    ${g}\n    devia:  ${e}`); }
};
const yes = (label, cond, extra = '') => { if (cond) ok++; else { fail++; console.log(`✗ ${label}${extra ? ` — ${extra}` : ''}`); } };
const pick = (c, keys) => Object.fromEntries(keys.filter((k) => k in c).map((k) => [k, c[k]]));
const C = (c) => pick(c, ['t', 'color', 'kind', 'title', 'sub', 'gain', 'a', 'dur', 'b', 'pct', 'corner', 'action', 'value', 'dark']);
const act = (a) => (a ? { id: a.id, icon: a.icon, label: a.label } : null);

const D11 = '2026-11-11', D12 = '2026-11-12', D13 = '2026-11-13', D14 = '2026-11-14', D16 = '2026-11-16';
const DIA = ['LIS', 'FNC', 'LIS', 'LGW'], IV = ['LIS', 'FNC', 'LIS'];
const NS = { station: 'LGW', hotel: 'Hotel do aeroporto', pay: 45.4 };
const NEXT_IV = (iso) => ({ iso, kind: 'flight', stations: IV, sectors: 2, report: '05:30', end: '11:10', hasReg: true });
const HERO = { iso: D11, kind: 'flight', flightNo: 'EJU7601', stations: DIA, sectors: 3, report: '05:15', dep: '06:15', lastArr: '13:50', end: '14:20',
  depStation: 'LIS', psv: { max: '11:45', plan: '08:35', latest: '17:00' }, legal: { status: 'ok' }, nightStop: NS, restAfterMin: 600, shareable: true, hasReg: true };
const MONTH = { name: 'Novembro', total: 2431.5, base: 1650, rest: 244.3,
  rows: [{ k: 'Base', eur: 1650 }, { k: 'Per-diem', eur: 484.5 }, { k: 'Pernoitas · 3 noites', eur: 136.2 }, { k: 'Extras', eur: 160.8 }] };
const ROSTER_W = { id: 'roster', title: 'A escala mudou', sub: '2 alterações por rever · nada entra sem ti', open: { to: 'review' } };

const S = {};
// ── 1 · Em voo ──
S.emVoo = { state: 'hoje', phase: 'air', todayISO: D11,
  hero: { ...HERO, flightNo: 'EJU7625', psv: { ...HERO.psv, running: '07:30' } },
  live: { legIdx: 2, legTotal: 3, legDep: 'LIS', legArr: 'LGW', arrHm: '13:50', minsToArr: 65, nowPct: 450 / 705, marginMin: 190, status: 'on' },
  next: { iso: D12, kind: 'flight', stations: ['LGW', 'LIS'], sectors: 1, report: '14:05', end: '18:15' }, warns: [ROSTER_W] };
// ── 2 · Antes do report ──
S.antes = { state: 'hoje', phase: 'pre', todayISO: D11, hero: HERO, live: { cdMin: 100 }, next: { iso: D12, kind: 'flight', stations: ['LGW', 'LIS'], sectors: 1, report: '14:05', end: '18:15' } };
// ── 3 · Disrupção ──
S.disrupcao = { state: 'disrupcao', todayISO: D11, hero: HERO, live: { legDep: 'LIS', legArr: 'FNC' },
  dis: { mode: 'delay', side: 'dep', newHm: '07:25', oldHm: '06:15', delayMin: 70, why: 'o avião ainda vem a caminho (EJU7450)',
    verdict: { verdict: 'ok', realStr: '09:45', maxStr: '11:45', projected: true }, lastArr: '15:00', end: '15:30' },
  next: { iso: D12, kind: 'flight', stations: ['LGW', 'LIS'], sectors: 1, report: '14:05', end: '18:15' } };
// ── 4 · Véspera (à noite) ──
S.vespera = { state: 'vespera', todayISO: D11, hero: { ...HERO, iso: D12 }, live: { cdMin: 455 }, restOk: true, wake: { hm: '04:00' } };
// ── 5 · Pernoita (à noite) ──
S.pernoita = { state: 'pernoita', todayISO: D11, rest: { signOff: '14:20', until: '00:20', minMin: 600, pct: 73, hotel: 'Hotel do aeroporto', pay: 45.4, station: 'LGW' },
  hero: { iso: D12, kind: 'flight', stations: ['LGW', 'LIS'], sectors: 1, report: '14:05', dep: '15:05', lastArr: '17:45', depStation: 'LGW', hasReg: true },
  live: { cdMin: 985 }, wxTmw: { v: '7°', label: 'chuva' } };
// ── 6 · Standby no aeroporto ──
S.standby = { state: 'hoje', todayISO: D11, hero: { iso: D11, kind: 'standby_airport', kindLabel: 'Standby no aeroporto', report: '08:00', end: '12:00', station: 'LIS', pay: { eur: 38.76 }, hasReg: true },
  live: { cdMin: -50, remainingMin: 190, elapsedMin: 50, psvUntil: '18:45' }, next: NEXT_IV(D14) };
// ── 7 · Folga (a mais de 48 h) e folga a menos de 48 h ──
S.folga = { state: 'folga', todayISO: D11, next: NEXT_IV(D13), untilMin: 2900, week: { done: 31, limit: 60 }, month: MONTH,
  warns: [{ id: 'vac', title: 'Férias 2026', sub: 'ficam 12 de 22 dias · o ano acaba daqui a 50 dias', open: { to: 'stats' } }] };
S.folgaHoras = { state: 'folga', todayISO: D11, next: NEXT_IV(D12), untilMin: 1110, week: { done: 31, limit: 60 } };
// ── 8 · Pós-voo ──
S.posvoo = { state: 'posvoo', todayISO: D13, closed: { fdp: '08:35', over: false, gainToday: 96.9, signOffDone: false }, week: { done: 31, limit: 60 },
  rest: { signOff: '14:20', until: '02:20', minMin: 720, pct: 3 }, next: NEXT_IV(D14) };
// ── 9 · Fecho do mês ──
S.fecho = { state: 'fecho', todayISO: '2026-11-27', fechoDays: 3, month: MONTH, canExtra: true,
  warns: [{ id: 'audit', title: 'Auditoria do mês', sub: '2 itens por confirmar · ≈ 45,40 € em causa', open: { to: 'audit' } }] };
// ── 10 · Férias ──
S.ferias = { state: 'ferias', todayISO: D11, vac: { left: 12, quota: 22, retIso: D16, fromIso: '2026-11-09', toIso: '2026-11-15' }, next: NEXT_IV(D16), month: MONTH };
// ── 11 · Folga sem serviços ──
S.vazia = { state: 'folga', todayISO: D11, next: null, empty: { rosterOk: true, lastRead: '12:40' } };
// ── 12 · Configuração ──
S.setup = { state: 'setup', todayISO: D11 };
// ── 13 · Incerto (dia de serviço) e o mês incerto ──
S.incerto = { state: 'hoje', phase: 'pre', todayISO: D11, live: { cdMin: 100 },
  hero: { ...HERO, stations: IV, sectors: 2, split: true, lastArr: '18:40', end: '19:10', nightStop: null, legal: { status: 'uncertain', missing: 'o alojamento da pausa' } }, next: NEXT_IV(D14) };
S.mesIncerto = { state: 'folga', todayISO: D11, next: NEXT_IV(D14), untilMin: 4000, month: { ...MONTH, unc: { min: 1398.5, max: 1650, why: 'Falta o dia em que entraste na companhia.', fix: 'profile' } } };
// ── 14 · Formação ──
S.formacao = { state: 'hoje', todayISO: D11, hero: { iso: D11, kind: 'training', kindLabel: 'Formação', report: '09:00', end: '17:00', station: 'LIS', hasReg: true }, live: { cdMin: 50 }, next: NEXT_IV(D14) };
// ── 15 · Documento a caducar ──
S.documento = { state: 'folga', todayISO: D11, doc: { name: 'certificado médico', days: 6, expiryIso: '2026-11-17', after: 2 }, next: NEXT_IV(D14), untilMin: 3900 };
// ── 16 · Baixa ──
S.baixa = { state: 'doenca', todayISO: D11, sick: { day: 2, first3: true, payText: 'Dias 1 a 3: o acordo paga 60 % da base do dia (Art. 48.º). Do 4.º dia em diante: só a Segurança Social.' }, next: NEXT_IV(D14) };

const R = Object.fromEntries(Object.entries(S).map(([k, v]) => [k, homeCards(v)]));

// ═══ 1 · Em voo — o topo é o SETOR; o cartão é o dia de serviço inteiro, do report ao limite ═══
eq('em voo · topo', R.emVoo.top, { pill: { text: 'Em voo', live: true }, pill2: { text: 'EJU7625', iso: D11 }, what: 'Aterras às',
  giant: { l1: '13:50', unit: null, l2: 'LGW', l2Grey: false }, facts: [{ v: '1 h 05', l: 'falta para aterrar', tone: null }, { v: '3:10', l: 'de margem no PSV', tone: null }] });
eq('em voo · cartões', R.emVoo.cards.map(C), [
  { t: 'card', color: 'flight', kind: 'Dia de serviço · setor 3 de 3', title: 'LIS → FNC → LIS → LGW', sub: 'a horas', gain: null, a: { v: '05:15', l: 'report' }, dur: 'PSV 7:30 de 11:45', b: { v: '17:00', l: 'limite' }, pct: 64, corner: 'share', action: null },
  { t: 'slim', color: 'rest', title: 'Pernoita em LGW', sub: 'fim de serviço 14:20 · Hotel do aeroporto', gain: true, value: '+45,40 €' },
  { t: 'slim', color: 'alert', title: 'A escala mudou', sub: '2 alterações por rever · nada entra sem ti', gain: false, value: null }]);

// ═══ 2 · Antes do report — o cartão começa na partida (não repete o report); a seguir, a pernoita com o intervalo REAL ═══
eq('antes · topo', R.antes.top, { pill: { text: 'Hoje', live: true }, pill2: { text: 'EJU7601', iso: D11 }, what: 'Report às',
  giant: { l1: '05:15', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '1 h 40', l: 'falta', tone: null }, { v: '17:00', l: 'PSV até', tone: null }] });
eq('antes · cartões', R.antes.cards.map(C), [
  { t: 'card', color: 'flight', kind: 'Dia de serviço · 3 setores', title: 'LIS → FNC → LIS → LGW', sub: 'PSV 8:35 de 11:45 · nos limites', gain: null, a: { v: '06:15', l: 'parte' }, dur: '7 h 35', b: { v: '13:50', l: 'última chegada' }, pct: null, corner: 'share', action: null },
  { t: 'card', color: 'rest', kind: 'A seguir', title: 'Pernoita em LGW', sub: 'Hotel do aeroporto · mínimo 10 h', gain: '+45,40 €', a: { v: '14:20', l: 'fim de serviço' }, dur: '23 h 45', b: { v: '14:05', l: 'report · qui 12' }, pct: null, corner: 'chev', action: null }]);

// ═══ 3 · Disrupção — a hora nova em grande, a antiga riscada; os limites com o atraso em PRIMEIRO ═══
eq('disrupção · topo', R.disrupcao.top, { pill: { text: 'Hoje', live: true }, pill2: { text: 'EJU7601', iso: D11 }, what: 'Nova partida às',
  giant: { l1: '07:25', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '06:15', l: 'hora da escala', tone: 'was' }, { v: '+70 min', l: 'de atraso', tone: null }] });
eq('disrupção · cartões', R.disrupcao.cards.map(C), [
  { t: 'slim', color: 'alert', title: 'Limites com o atraso', sub: 'projeção: ainda dentro · margem 2:00 até às 17:00', gain: false, value: null },
  { t: 'card', color: 'flight', kind: 'Dia de serviço · 3 setores', title: 'LIS → FNC → LIS → LGW', sub: 'o avião ainda vem a caminho (EJU7450)', gain: null, a: { v: '05:15', l: 'report' }, dur: 'PSV projetado 9:45 de 11:45', b: { v: '15:00', l: 'última chegada' }, pct: null, corner: 'share', action: null },
  { t: 'slim', color: 'rest', title: 'Pernoita em LGW', sub: 'fim de serviço 15:30 · Hotel do aeroporto', gain: true, value: '+45,40 €' }]);

// ═══ 4 · Véspera — a barra ao fundo do cartão marca o lembrete; a pernoita em linha fina ═══
eq('véspera · topo', R.vespera.top, { pill: { text: 'Amanhã', live: true }, pill2: { text: 'quinta 12', iso: D12 }, what: 'Report às',
  giant: { l1: '05:15', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '7 h 35', l: 'falta', tone: null }, { v: '17:00', l: 'PSV até', tone: null }] });
eq('véspera · cartões', R.vespera.cards.map(C), [
  { t: 'card', color: 'flight', kind: 'Dia de serviço · 3 setores', title: 'LIS → FNC → LIS → LGW', sub: 'PSV 8:35 de 11:45 · repouso cumprido', gain: null, a: { v: '06:15', l: 'parte' }, dur: '7 h 35', b: { v: '13:50', l: 'última chegada' }, pct: null, corner: 'chev', action: { id: 'wake', icon: 'bell', label: 'Lembrete 04:00', open: { to: 'wake' } } },
  { t: 'slim', color: 'rest', title: 'Pernoita em LGW', sub: 'fim de serviço 14:20 · Hotel do aeroporto', gain: true, value: '+45,40 €' }]);

// ═══ 5 · Pernoita — o repouso mínimo com o ponto no que já está cumprido; o voo de amanhã numa linha, sem repetir o report ═══
eq('pernoita · topo', R.pernoita.top, { pill: { text: 'Pernoita', live: false }, pill2: { text: 'LGW', iso: D11 }, what: 'Report amanhã às',
  giant: { l1: '14:05', unit: null, l2: 'LGW', l2Grey: false }, facts: [{ v: '16 h 25', l: 'falta', tone: null }, { v: '7°', l: 'amanhã · chuva', tone: null }] });
eq('pernoita · cartões', R.pernoita.cards.map(C), [
  { t: 'card', color: 'rest', kind: 'Repouso · fora da base', title: 'Hotel do aeroporto', sub: 'pernoita desta noite', gain: '+45,40 €', a: { v: '14:20', l: 'fim de serviço' }, dur: 'mínimo 10 h', b: { v: '00:20', l: 'cumprido' }, pct: 73, corner: 'chev', action: null },
  { t: 'slim', color: 'flight', title: 'LGW → LIS', sub: 'quinta 12 · parte 15:05 · chega 17:45', gain: false, value: null }]);

// ═══ 6 · Standby — lilás; o que já passou da janela e o que rende se não chamarem ═══
eq('standby · topo', R.standby.top, { pill: { text: 'Standby', live: true }, pill2: { text: 'aeroporto', iso: D11 }, what: 'A janela fecha às',
  giant: { l1: '12:00', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '3 h 10', l: 'falta', tone: null }, { v: '~18:45', l: 'PSV até, se chamarem já', tone: null }] });
eq('standby · cartões', R.standby.cards.map(C), [
  { t: 'card', color: 'ground', kind: 'Serviço em terra', title: 'Standby no aeroporto', sub: 'PSV estimado a 1 setor (225) · confirma na Simulação', gain: null, a: { v: '08:00', l: 'começou' }, dur: '50 min de 4 h', b: { v: '+38,76 €', l: 'se não chamarem', gain: true }, pct: 21, corner: 'chev', action: null },
  { t: 'card', color: 'flight', kind: 'A seguir', title: 'LIS → FNC → LIS', sub: 'sábado 14 · 2 setores', gain: null, a: { v: '05:30', l: 'report' }, dur: '5 h 40', b: { v: '11:10', l: 'fim' }, pct: null, corner: 'chev', action: null }]);

// ═══ 7 · Folga — o número é quanto falta; o dinheiro do mês numa linha; o aviso de outra coisa em último ═══
eq('folga · topo', R.folga.top, { pill: { text: 'Folga', live: false }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Próximo serviço daqui a',
  giant: { l1: '2', unit: 'dias', l2: 'livre', l2Grey: true }, facts: [{ v: 'sexta 13', l: 'até lá', tone: null }, { v: '31 h', l: 'de 60 em 7 dias', tone: null }] });
eq('folga · cartões', R.folga.cards.map(C), [
  { t: 'card', color: 'flight', kind: 'Próximo serviço', title: 'LIS → FNC → LIS', sub: '2 setores · ida e volta', gain: null, a: { v: '05:30', l: 'report' }, dur: '5 h 40', b: { v: '11:10', l: 'fim' }, pct: null, corner: 'chev', action: null },
  { t: 'slim', color: 'neutral', title: 'Novembro', sub: 'estimado · bruto', gain: false, value: '2 431,50 €' },
  { t: 'slim', color: 'alert', title: 'Férias 2026', sub: 'ficam 12 de 22 dias · o ano acaba daqui a 50 dias', gain: false, value: null }]);
// A menos de 48 h conta em HORAS (auditoria do tripulante, 2026-11-04: "amanhã às 06:00" era "1 dia" e eram 18 h).
eq('folga < 48 h · número em horas', R.folgaHoras.top.giant, { l1: '18', unit: 'h 30', l2: 'livre', l2Grey: true });
eq('folga < 48 h · "amanhã até lá"', R.folgaHoras.top.facts[0], { v: 'amanhã', l: 'até lá', tone: null });

// ═══ 8 · Pós-voo — o número é o PSV de hoje (duração, sem zero à esquerda) ═══
// A barra "Registar sign-off" SAIU (2026-11-14, regra do Nuno: a app só lê o calendário e calcula; o fim de serviço vem do calendário,
// que a companhia corrige depois). O cartão abre o dia pela seta.
eq('pós-voo · topo', R.posvoo.top, { pill: { text: 'Dia fechado', live: false }, pill2: { text: 'sexta 13', iso: D13 }, what: 'PSV de hoje',
  giant: { l1: '8:35', unit: 'h', l2: 'fechado', l2Grey: true }, facts: [{ v: '+96,90 €', l: 'ganhos de hoje', tone: 'gain' }, { v: '31 h', l: 'de 60 em 7 dias', tone: null }] });
eq('pós-voo · cartões', R.posvoo.cards.map(C), [
  { t: 'card', color: 'rest', kind: 'Repouso · na base', title: 'Descansa', sub: 'o dia fechou nos limites', gain: null, a: { v: '14:20', l: 'fim de serviço' }, dur: 'mínimo 12 h', b: { v: '02:20', l: 'cumprido' }, pct: 3, corner: 'chev', action: null },
  { t: 'card', color: 'flight', kind: 'A seguir', title: 'LIS → FNC → LIS', sub: 'sábado 14 · 2 setores', gain: null, a: { v: '05:30', l: 'report' }, dur: '5 h 40', b: { v: '11:10', l: 'fim' }, pct: null, corner: 'chev', action: null }]);
eq('pós-voo, com ou sem sign-off · nunca a barra de registar', [R.posvoo.cards[0].action, homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, signOffDone: true } }).cards[0].action], [null, null]);

// ═══ 9 · Fecho do mês — o valor inteiro com cêntimos, "estimado" por baixo; as parcelas SOMAM o número de cima ═══
eq('fecho · topo', R.fecho.top, { pill: { text: 'Novembro', live: false }, pill2: { text: 'fecha em 3 dias', iso: null }, what: 'Ganhos brutos do mês',
  giant: { l1: '2 431', unit: ',50 €', l2: 'estimado', l2Grey: true }, facts: null });
const par = R.fecho.cards[0];
eq('fecho · parcelas', pick(par, ['t', 'kind', 'rows', 'foot', 'note']), { t: 'lines', kind: 'As parcelas',
  rows: [{ k: 'Base', v: '1 650,00 €', open: null }, { k: 'Per-diem', v: '484,50 €', open: null }, { k: 'Pernoitas · 3 noites', v: '136,20 €', open: null }, { k: 'Extras', v: '160,80 €', open: null }],
  foot: [{ k: 'Já feito até hoje', v: '2 187,20 €' }, { k: 'Ainda na escala', v: '244,30 €' }], note: 'O recibo da companhia manda.' });
eq('fecho · "Como é calculado?"', par.link, { label: 'Como é calculado?', open: { to: 'stats' } });
const num = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
yes('fecho · as parcelas somam o total', Math.abs(par.rows.reduce((a, r) => a + num(r.v), 0) - MONTH.total) < 0.005);
yes('fecho · já feito + ainda na escala = total', Math.abs(par.foot.reduce((a, r) => a + num(r.v), 0) - MONTH.total) < 0.005);
// A regra do Nuno (2026-11-14): a app só lê o calendário e calcula — nada à mão, exceto na Simulação. O "Falta algum extra? regista
// antes do fecho" saiu: os extras vêm do calendário (mesmo com canExtra, a linha não volta).
eq('fecho · só a auditoria a seguir às parcelas (sem "Falta algum extra?")', R.fecho.cards.slice(1).map(C), [
  { t: 'slim', color: 'alert', title: 'Auditoria do mês', sub: '2 itens por confirmar · ≈ 45,40 € em causa', gain: false, value: null }]);

// ═══ 10 · Férias — só o regresso e o mês ═══
eq('férias · topo', R.ferias.top, { pill: { text: 'Férias', live: false }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Ficam no ano',
  giant: { l1: '12', unit: 'dias', l2: 'de 22', l2Grey: true }, facts: [{ v: 'segunda 16', l: 'regressas', tone: null }, { v: '9 a 15 nov', l: 'estas férias', tone: null }] });
eq('férias · cartões', R.ferias.cards.map((c) => pick(c, ['t', 'kind', 'title', 'sub', 'value'])), [
  { t: 'card', kind: 'No regresso', title: 'LIS → FNC → LIS', sub: '2 setores · ida e volta' }, { t: 'slim', title: 'Novembro', sub: 'estimado · bruto', value: '2 431,50 €' }]);

// ═══ 11 · Folga sem serviços — quando enche, a que horas foi lida, o que podes fazer ═══
eq('vazia · topo', R.vazia.top, { pill: { text: 'Folga', live: false }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Sem serviços na escala',
  giant: { l1: 'Livre', unit: null, l2: 'hoje', l2Grey: true }, facts: [{ v: 'Em dia', l: 'a tua escala', tone: null }, { v: '12:40', l: 'última leitura', tone: null }] });
eq('vazia · cartões', R.vazia.cards.map((c) => [c.t, c.title || c.kind, c.open && c.open.to, !!c.dark]), [['text', 'Quando aparecem', null, false], ['slim', 'Ler a escala agora', 'sync', true], ['slim', 'Importar o PDF', 'pdf', false]]);

// ═══ 12 · Configuração — três passos num cartão e o botão que começa ═══
eq('configuração · topo', R.setup.top, { pill: { text: 'Começar', live: false }, pill2: null, what: 'Para a app saber o teu dia',
  giant: { l1: 'Liga a', unit: null, l2: 'escala', l2Grey: false }, facts: [{ v: 'Só leitura', l: 'nada é alterado', tone: null }, { v: 'Com o teu sim', l: 'é que se grava', tone: null }] });
eq('configuração · as três ações da app', R.setup.cards.map((c) => [c.t, c.title || c.kind, c.open && c.open.to]),
  [['lines', 'Três passos', 'privacy'], ['slim', 'Ligar o calendário', 'connect'], ['slim', 'Importar o PDF', 'pdf'], ['slim', 'Ver um exemplo', 'demo']]);

// ═══ 13 · Incerto — "Incerto" no lugar do número, o que falta na linha pequena; o mês com as duas pontas ═══
// Regra do Nuno (2026-11-14): a app só lê o calendário e calcula — a barra "Completar" do cartão de serviço SAIU (o cartão inteiro
// abre o dia, pela seta do canto). O "Completar" do mês fica: leva ao Perfil (a data de entrada na companhia é do Perfil, à mão).
eq('incerto · factos', R.incerto.top.facts, [{ v: '1 h 40', l: 'falta', tone: null }, { v: 'Incerto', l: 'PSV até', tone: null }]);
eq('incerto · cartão', C(R.incerto.cards[0]), { t: 'card', color: 'flight', kind: 'Dia de serviço · repartido', title: 'LIS → FNC → LIS', sub: 'limites incertos · falta o alojamento da pausa', gain: null,
  a: { v: '06:15', l: 'parte' }, dur: '12 h 25', b: { v: '18:40', l: 'última chegada' }, pct: null, corner: 'chev', action: null });
const mi = R.mesIncerto.cards.find((c) => c.id === 'month');
eq('mês incerto · as duas pontas, nunca um valor inventado', pick(mi, ['t', 'kind', 'rows', 'note', 'link']), { t: 'lines', kind: 'Novembro · incerto · bruto',
  rows: [{ k: 'No mínimo', v: '2 180,00 €' }, { k: 'No máximo', v: '2 431,50 €' }], note: 'Falta o dia em que entraste na companhia.', link: { label: 'Completar', open: { to: 'profile' } } });
const fechoUnc = homeCards({ ...S.fecho, month: { ...MONTH, unc: { min: 1398.5, max: 1650, why: 'Falta o dia em que entraste na companhia.' } } });
eq('fecho incerto · "Incerto" no lugar do número', fechoUnc.top.giant, { l1: 'Incerto', unit: null, l2: null, l2Grey: false });
eq('fecho incerto · as pontas no pé das parcelas', fechoUnc.cards[0].foot, [{ k: 'No mínimo', v: '2 180,00 €' }, { k: 'No máximo', v: '2 431,50 €' }]);

// ═══ 14 · Formação — um dia em terra sem ruído de voo ═══
eq('formação · topo', R.formacao.top, { pill: { text: 'Hoje', live: true }, pill2: { text: 'formação', iso: D11 }, what: 'Começa às',
  giant: { l1: '09:00', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '50 min', l: 'falta', tone: null }, { v: '17:00', l: 'acaba', tone: null }] });
eq('formação · cartões', R.formacao.cards.map((c) => pick(c, ['t', 'color', 'kind', 'title', 'sub'])), [
  { t: 'slim', color: 'ground', title: 'Formação', sub: '8 h de serviço em terra' }, { t: 'card', color: 'flight', kind: 'A seguir', title: 'LIS → FNC → LIS', sub: 'sábado 14 · 2 setores' }]);

// ═══ 15 · Documento a caducar — a 7 dias ou menos toma o topo (só na folga) ═══
eq('documento · topo', R.documento.top, { pill: { text: 'Atenção', live: true }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Certificado médico caduca em',
  giant: { l1: '6', unit: 'dias', l2: '17 nov', l2Grey: false }, facts: [{ v: 'terça', l: 'último dia válido', tone: null }, { v: '2 serviços', l: 'marcados depois', tone: null }] });
eq('documento · cartões', R.documento.cards.map((c) => pick(c, ['t', 'color', 'kind', 'title', 'sub'])), [
  { t: 'card', color: 'alert', kind: 'Validades', title: 'Certificado médico', sub: 'Quando renovares, regista a data nova para o aviso sair.' },
  { t: 'card', color: 'flight', kind: 'Próximo serviço', title: 'LIS → FNC → LIS', sub: 'sábado 14 · ainda dentro da validade' }]);
eq('documento · a barra regista a data nova', act(R.documento.cards[0].action), { id: 'validades', icon: 'edit', label: 'Registar a data nova' });
eq('documento a 8 dias · não toma o topo', homeCards({ ...S.documento, doc: { ...S.documento.doc, days: 8 } }).state, 'folga');
eq('documento num dia de voo · não toma o topo', homeCards({ ...S.antes, doc: S.documento.doc }).state, 'hoje');

// ═══ 16 · Baixa — a app baixa a voz: o dia do episódio, o que o acordo garante, e mais nada ═══
eq('baixa · topo', R.baixa.top, { pill: { text: 'Baixa', live: false }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Dia do episódio',
  giant: { l1: '2', unit: 'de 3', l2: 'pagos', l2Grey: true }, facts: null });
eq('baixa · cartões', R.baixa.cards.map((c) => [c.t, c.kind || c.title, c.sub || c.text]), [
  ['text', 'O que o acordo garante', S.baixa.sick.payText], ['slim', 'Sábado 14, report 05:30', 'se continuares de baixa, avisa a escala']]);
eq('baixa sem acordo modelado · nenhuma frase sobre pagamento', homeCards({ ...S.baixa, sick: { day: 2, first3: false, payText: null } }).cards.map((c) => c.t), ['slim']);

// ═══ DA REVISÃO INDEPENDENTE (2026-11-11): um caso por achado ═══
// (1) Posicionamento hoje: não tem fases de voo no Início → "Termina às", nunca preso em "Report às"; com a cor de voo.
const pos = homeCards({ state: 'hoje', todayISO: D11, hero: { iso: D11, kind: 'positioning', kindLabel: 'Posicionamento', stations: ['LIS', 'OPO'], report: '06:00', end: '08:30', station: 'LIS', hasReg: true }, live: { cdMin: -90, remainingMin: 60 } });
eq('posicionamento a decorrer · topo', [pos.top.what, pos.top.giant.l1, pos.top.facts], ['Termina às', '08:30', [{ v: '1 h', l: 'falta', tone: null }, { v: '06:00', l: 'começou', tone: null }]]);
eq('posicionamento · linha fina areia', pick(pos.cards[0], ['t', 'color', 'title', 'sub']), { t: 'slim', color: 'flight', title: 'Posicionamento · LIS → OPO', sub: '2 h 30 de posicionamento' });
// (2) Disrupção: sem projeção (o último setor já aterrou) não diz "projeção"; com ela, di-lo também no selo.
const disReal = homeCards({ ...S.disrupcao, dis: { ...S.disrupcao.dis, verdict: { ...S.disrupcao.dis.verdict, projected: false } } });
eq('disrupção · facto (não projetado)', [disReal.cards[0].sub, disReal.cards[1].dur], ['ainda dentro · margem 2:00 até às 17:00', 'PSV 9:45 de 11:45']);
const disOver = homeCards({ ...S.disrupcao, dis: { ...S.disrupcao.dis, verdict: { verdict: 'over', realStr: '12:10', maxStr: '11:45', projected: true } } });
eq('disrupção · acima do limite, projetado', disOver.cards[0].sub, 'acima do limite · PSV projetado 12:10 de 11:45');
// (3) Pernoita num dia com 2 serviços (sem a hora do fim do repouso): o hotel e o € da noite ficam.
const per2 = homeCards({ state: 'pernoita', todayISO: D11, rest: { hotel: 'Hotel do aeroporto', pay: 45.4, station: 'LGW' }, next: null });
eq('pernoita sem a hora do fim · topo', [per2.top.what, per2.top.giant.l1], ['Pernoita em', 'LGW']);
eq('pernoita sem a hora do fim · o hotel e o €', pick(per2.cards[0], ['title', 'gain', 'a', 'b']), { title: 'Hotel do aeroporto', gain: '+45,40 €', a: null, b: null });
// (4) Incerto depois do report: continua incerto (nada de "margem" sobre um limite que não é certo).
const vooInc = homeCards({ ...S.emVoo, warns: [], hero: { ...S.emVoo.hero, legal: { status: 'uncertain', missing: 'o alojamento da pausa' } } });
eq('em voo incerto · facto', vooInc.top.facts[1], { v: 'Incerto', l: 'PSV até', tone: null });
eq('em voo incerto · cartão', [vooInc.cards[0].sub, vooInc.cards[0].b, act(vooInc.cards[0].action)], ['limites incertos · falta o alojamento da pausa', { v: '17:00', l: 'limite · incerto' }, null]);
// (6) Aterrado: o PSV de hoje (fechou nos calços), não "até agora".
const ater = homeCards({ ...S.emVoo, warns: [], phase: 'landed', hero: { ...S.emVoo.hero, psv: { ...S.emVoo.hero.psv, running: '08:35' } } });
eq('aterrado · topo', [ater.top.what, ater.top.facts[0]], ['Aterraste às', { v: '8:35', l: 'PSV de hoje', tone: null }]);
// (8) Sem hora de report, depois da partida: di-lo.
const semRep = homeCards({ ...S.emVoo, warns: [], phase: 'duty', hero: { ...S.emVoo.hero, report: null, psv: {} }, live: { ...S.emVoo.live, nowPct: null, marginMin: null, depHm: '09:00', minsToDep: 20, status: null } });
eq('sem report · facto e cartão', [semRep.top.facts[1], semRep.cards[0].sub], [{ v: 'Sem report', l: 'PSV não calculado', tone: null }, 'sem hora de report — PSV não calculado']);
const semRepAr = homeCards({ ...S.emVoo, warns: [], phase: 'air', hero: { ...S.emVoo.hero, report: null, psv: {}, dep: '15:56', lastArr: '21:35' }, live: { ...S.emVoo.live, nowPct: null, marginMin: null, arrHm: '17:15', minsToArr: 59, status: null } });
eq('sem report em voo · o cartão mostra partida e última chegada (iPhone)', [semRepAr.cards[0].a, semRepAr.cards[0].dur, semRepAr.cards[0].b], [{ v: '15:56', l: 'partida' }, '5 h 39', { v: '21:35', l: 'última chegada' }]);
// (9) O repouso que só acaba daqui a 2 dias (noites locais da rotação, CS FTL.1.235(b)(3)) diz o dia.
const rot = homeCards({ ...S.posvoo, rest: { ...S.posvoo.rest, until: '06:00', untilIso: '2026-11-15', minMin: 2380 } });
eq('repouso de 2 dias · o dia junto da hora', rot.cards[0].b, { v: '06:00', l: 'cumprido · dom 15' });

// ═══ O REPOUSO INCERTO (2026-11-12, "tem é que seguir a lei"): quando o mínimo depende de uma leitura que a lei não fecha, o
// cartão não escolhe — mostra as duas pontas, o motivo, e a hora grande só diz "Incerto" (o padrão do dinheiro incerto). ═══
const SB_CLOSED = { kindLabel: 'Standby em casa', signOffDone: true };
const restUnc = homeCards({ ...S.posvoo, closed: SB_CLOSED, rest: { signOff: '20:00', until: '14:00', untilIso: D14, minMin: 1080, pct: 3, unc: { lo: '12:00', hi: '14:00', minLo: 960, minHi: 1080, why: 'standbyHome' } } });
eq('repouso incerto · o cartão diz as duas pontas e o motivo', C(restUnc.cards[0]),
  { t: 'card', color: 'rest', kind: 'Repouso · na base', title: 'Descansa', sub: 'cumprido entre 12:00 e 14:00 · a companhia fixa o repouso depois da assistência', gain: null, a: { v: '20:00', l: 'fim de serviço' }, dur: 'mín. 16 h–18 h', b: { v: '14:00', l: 'no máximo' }, pct: 3, corner: 'chev', action: null });
const restNoRep = homeCards({ ...S.posvoo, closed: SB_CLOSED, rest: { signOff: '20:00', until: '08:00', untilIso: D14, minMin: 720, pct: 3, unc: { lo: '08:00', hi: null, minLo: 720, minHi: null, why: 'noReport', estDay: '09/11' } } });
eq('repouso incerto sem teto (falta uma apresentação) · só o mínimo, dito', [restNoRep.cards[0].sub, restNoRep.cards[0].dur, restNoRep.cards[0].b],
  ['falta a hora de apresentação do serviço de 09/11', 'mín. 12 h ou mais', { v: '08:00', l: 'no mínimo' }]);
eq('repouso incerto num dia que fechou acima do limite · as duas frases', homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, over: true }, rest: { ...S.posvoo.rest, unc: { lo: '02:20', hi: '03:20', minLo: 720, minHi: 780, why: 'legTimes' } } }).cards[0].sub,
  'dia acima do limite · repouso 02:20–03:20 · as horas das pernas não batem certo');
const perUnc = homeCards({ state: 'pernoita', todayISO: D11, rest: { signOff: '14:20', until: '03:20', minMin: 780, pct: 40, hotel: 'Hotel do aeroporto', pay: 45.4, station: 'FNC', unc: { lo: '00:20', hi: '03:20', minLo: 600, minHi: 780, why: 'standbyHome' } }, next: null });
eq('pernoita com o repouso incerto · topo "Incerto" com as duas pontas', [perUnc.top.what, perUnc.top.giant, perUnc.top.facts],
  ['Repouso até', { l1: 'Incerto', unit: null, l2: 'FNC', l2Grey: false }, [{ v: '00:20', l: 'no mínimo', tone: null }, { v: '03:20', l: 'no máximo', tone: null }]]);
eq('… e o cartão diz o mínimo nas duas pontas e o motivo', [perUnc.cards[0].dur, perUnc.cards[0].sub], ['mín. 10 h–13 h', 'cumprido entre 00:20 e 03:20 · a companhia fixa o repouso depois da assistência']);
eq('pernoita a seguir ao serviço de hoje · mínimo nas duas pontas', homeCards({ ...S.antes, hero: { ...HERO, restAfterMin: 780, restAfterLoMin: 600 } }).cards.find((c) => c.id === 'night').sub, 'Hotel do aeroporto · mínimo 10 h a 13 h');
for (const why of ['standbyHome', 'extAfterStandby', 'extPreRest', 'rotationNights', 'groundBetween', 'legTimes', 'breakOrRest', 'reducedRestAfter', 'noReport']) for (const lang of ['pt', 'en']) {
  const r = homeCards({ ...S.posvoo, lang, closed: SB_CLOSED, rest: { signOff: '20:00', until: '14:00', minMin: 1080, pct: 3, unc: { lo: '12:00', hi: why === 'noReport' ? null : '14:00', minLo: 960, minHi: why === 'noReport' ? null : 1080, why, estDay: '09/11' } } });
  yes(`repouso incerto · ${why} · ${lang} · frase com motivo, sem indefinidos`, r.cards[0].sub.length > 20 && r.cards[0].sub.length <= 82 && r.cards[0].dur.length <= 20 && r.cards[0].b.l.length <= 10 && !/undefined|null|NaN/.test(JSON.stringify([r.cards[0].sub, r.cards[0].dur, r.cards[0].b])));
}

eq('repouso incerto pelas noites locais · o motivo', homeCards({ ...S.posvoo, closed: SB_CLOSED, rest: { signOff: '16:00', until: '06:00', untilIso: '2026-11-15', minMin: 2280, pct: 3, unc: { lo: '04:00', hi: '06:00', minLo: 720, minHi: 2280, why: 'rotationNights' } } }).cards[0].sub,
  'cumprido entre 04:00 e 06:00 · a lei não diz se as noites locais ainda se pedem');

// ═══ A HORA ZULU do report (Nuno, 2026-11-11, opção A): 3.º facto, só quando é diferente da local ═══
const zAntes = homeCards({ ...S.antes, hero: { ...HERO, reportZ: '04:15' } });
eq('Zulu · antes do report, 3.º facto', zAntes.top.facts[2], { v: '04:15Z', l: 'report em UTC', tone: null });
eq('Zulu · igual à local (inverno em Lisboa) → não aparece', homeCards({ ...S.antes, hero: { ...HERO, reportZ: '05:15' } }).top.facts.length, 2);
eq('Zulu · véspera', homeCards({ ...S.vespera, hero: { ...S.vespera.hero, reportZ: '04:15' } }).top.facts.map((f) => f.v), ['7 h 35', '17:00', '04:15Z']);
eq('Zulu · pernoita em LGW', homeCards({ ...S.pernoita, hero: { ...S.pernoita.hero, reportZ: '14:05' } }).top.facts.length, 2);
eq('Zulu · pernoita fora, fuso diferente', homeCards({ ...S.pernoita, hero: { ...S.pernoita.hero, reportZ: '13:05' } }).top.facts[2], { v: '13:05Z', l: 'report em UTC', tone: null });
eq('Zulu · em voo não aparece (o número é a aterragem)', homeCards({ ...S.emVoo, hero: { ...S.emVoo.hero, reportZ: '04:15' } }).top.facts.length, 2);
yes('Zulu · o número não encolhe com o 3.º facto (390 e 375)', fitGiant(zAntes.top, 350).size === 86 && fitGiant(zAntes.top, 335).size === 86);
const zPern = homeCards({ ...S.pernoita, hero: { ...S.pernoita.hero, reportZ: '13:05' } });
yes('Zulu · pernoita em LGW: cabe a 86 em 390 e em 375', fitGiant(zPern.top, 350).size === 86 && fitGiant(zPern.top, 335).size === 86);

// ═══ Estado que precisa de um serviço e não o tem (o iPhone com a véspera forçada e a escala vazia) → a folga honesta ═══
for (const st of ['hoje', 'vespera', 'disrupcao', 'doenca', 'posvoo', 'pernoita']) {
  const r = homeCards({ state: st, todayISO: D11, next: null, sick: { day: 0 }, rest: { hotel: null }, empty: { rosterOk: true, lastRead: '12:40' } });
  eq(`${st} sem serviço · mostra a folga, nunca "—"`, [r.state, r.top.giant.l1, r.top.what], ['folga', 'Livre', 'Sem serviços na escala']);
}

// ═══ Em voo, a linha pequena: o próximo setor e a última chegada (Nuno, iPhone 2026-11-11) · o limite de amanhã diz-se ═══
const voo1 = homeCards({ ...S.emVoo, warns: [], hero: { ...S.emVoo.hero, stations: ['LIS', 'FNC', 'LIS'], lastArr: '21:35', psv: { max: '12:00', latest: '03:00', latestNextDay: true, running: '01:18' } },
  live: { ...S.emVoo.live, legIdx: 0, legTotal: 2, legArr: 'FNC', arrHm: '17:15', status: null, nextDep: '19:50' } });
eq('em voo · próximo setor e última chegada', voo1.cards[0].sub, 'próximo setor às 19:50 · última chegada 21:35');
eq('em voo · o limite depois da meia-noite diz "amanhã"', voo1.cards[0].b, { v: '03:00', l: 'limite · amanhã' });

// ═══ NUNCA VAZIO (Nuno, iPhone 2026-11-11): um só cartão num estado com serviço → a linha do mês ═══
const so1 = homeCards({ ...S.emVoo, warns: [], next: null, hero: { ...S.emVoo.hero, nightStop: null }, month: MONTH });
eq('em voo sem nada a seguir · junta o mês', so1.cards.map((c) => [c.t, c.id]), [['card', 'day'], ['slim', 'month']]);
eq('em voo com pernoita · não junta o mês', homeCards({ ...S.emVoo, warns: [], month: MONTH }).cards.map((c) => c.id), ['day', 'night']);
eq('baixa · nunca junta o mês (a app baixa a voz)', homeCards({ ...S.baixa, next: null, month: MONTH }).cards.map((c) => c.id), ['pay']);

// ═══ AS REGRAS, em todos os estados ═══
const F = fmt('pt');
const all = Object.entries(R);
for (const [k, r] of all) {
  const big = r.cards.filter((c) => c.t === 'card');
  yes(`${k} · nunca mais de dois cartões grandes`, big.length <= 2, `${big.length}`);
  const ws = (S[k].warns || []).length;
  if (ws) yes(`${k} · com um aviso, o 2.º cartão passa a linha fina`, big.length <= 1, `${big.length} grandes`);
  // NADA SE REPETE: nenhum valor do topo (o número e os factos) volta nas horas ou nos valores dos cartões.
  const topVals = [r.top.giant && r.top.giant.l1, ...(r.top.facts || []).filter((f) => f.tone !== 'was').map((f) => f.v)].filter(Boolean);
  const cardVals = r.cards.flatMap((c) => [c.a && c.a.v, c.b && c.b.v, c.value, c.gain]).filter((x) => typeof x === 'string');
  const rep = topVals.filter((v) => cardVals.includes(v));
  yes(`${k} · nada se repete entre o topo e os cartões`, !rep.length, rep.join(', '));
  // O SELO entre duas horas é o intervalo entre elas ("7 h 35", "mínimo 10 h", "PSV 7:30 de 11:45", "50 min de 4 h").
  for (const c of big) {
    if (!c.a || !c.b || !c.dur || c.b.gain) continue;
    const sp = toMin(c.b.v) >= toMin(c.a.v) ? toMin(c.b.v) - toMin(c.a.v) : toMin(c.b.v) + 1440 - toMin(c.a.v);
    // "PSV x de y": o intervalo é o x (até à última chegada) ou o y (até ao limite); "50 min de 4 h": o y; "mínimo 10 h"; "7 h 35".
    const m = /^PSV (?:projetado )?(\d+:\d\d)(?: (?:de|of) (\d+:\d\d))?$/.exec(c.dur);
    const m2 = /^(.+) (?:de|of) (.+)$/.exec(c.dur);
    const ok1 = m ? [m[1], m[2]].includes(F.hm(sp)) : m2 ? m2[2] === F.dur(sp) : c.dur.replace(/^mínimo /, '') === F.dur(sp);
    yes(`${k} · ${c.id}: o selo é o intervalo entre ${c.a.v} e ${c.b.v}`, ok1, `${c.dur} ≠ ${F.hm(sp)} / ${F.dur(sp)}`);
  }
  // € SEMPRE COM CÊNTIMOS, em tudo o que se escreve.
  const txt = JSON.stringify(r);
  const eurs = txt.match(/[+−-]?[\d ]+(?:,\d+)? €/g) || [];
  yes(`${k} · todo o € com cêntimos`, !/\d €/.test(txt.replace(/,\d{2} €/g, '')), eurs.join(' | '));
  yes(`${k} · nada indefinido`, !/undefined|NaN|null h|\[object/.test(txt));
}
yes('o total do mês diz sempre "estimado · bruto"', all.every(([, r]) => r.cards.filter((c) => c.id === 'month' && c.t === 'slim').every((c) => c.sub === 'estimado · bruto')));
yes('o que um serviço rende vai sempre numa pílula (gain), nunca no título', all.every(([, r]) => r.cards.every((c) => !/^\+/.test(c.title || ''))));

// ═══ O NÚMERO E OS DOIS FACTOS CABEM lado a lado (larguras da Hanken lidas do .ttf) — 390 (350 úteis) e 375 (335) ═══
const sizes = [];
for (const [k, r] of all) {
  const a = fitGiant(r.top, 390 - 40), b = fitGiant(r.top, 375 - 40);
  yes(`${k} · cabe a 390`, a.fits, `tamanho ${a.size}`);
  yes(`${k} · cabe a 375`, b.fits, `tamanho ${b.size}`);
  sizes.push(`${k} ${a.size}/${b.size}`);
}
yes('o tamanho máximo é 86 e o mínimo 60', all.every(([, r]) => { const z = fitGiant(r.top, 350).size; return z <= 86 && z >= 60; }));

// ═══ EM INGLÊS — os mesmos estados, nada indefinido ═══
for (const [k, v] of Object.entries(S)) {
  const r = homeCards({ ...v, lang: 'en' });
  yes(`en · ${k} · nada indefinido`, !/undefined|NaN|\[object/.test(JSON.stringify(r)));
}

console.log(`homecards: ${ok} ok, ${fail} falhou · tamanho do número (390/375): ${sizes.join(' · ')}`);
module.exports = { S };   // os dados de teste dos 16 estados (o desenho feito a partir do código usa-os)
if (require.main === module) process.exit(fail ? 1 : 0);
