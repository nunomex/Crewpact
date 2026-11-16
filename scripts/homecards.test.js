/*
 * Golden do INÍCIO 3.0 "cartões de cor" (data/homeCards.js) — PURO, sem rede nem React.
 * Os 16 estados do esboço aprovado (design/inicio-cartoes.html, 2026-11-11), com os dados de teste do esboço (easyJet,
 * piloto, base Lisboa; hoje = quarta 11 de novembro de 2026), e as REGRAS do esboço trancadas:
 *   nada se repete entre o topo e os cartões · nunca mais de dois cartões grandes · com um aviso o 2.º passa a linha fina ·
 *   o selo entre duas horas é o intervalo entre elas · todo o € com cêntimos · o total do mês "estimado · bruto" ·
 *   "Incerto" com o que falta (sem "Completar" no cartão de serviço — 2026-11-14) · O TOPO LADO A LADO E IGUAL NAS TRÊS ABAS (L1 de
 *   design/topo-lado.html, 2026-11-14): o número no tamanho comum do Início, da Escala e dos Números (62 a 390, 58 a 375) e os
 *   factos à direita, com o fio; os Números só com o total.
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
const { homeCards, topGiant, commonGiant, fmt, toMin } = require(path.resolve('data/homeCards.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}\n    tem:    ${g}\n    devia:  ${e}`); }
};
const yes = (label, cond, extra = '') => { if (cond) ok++; else { fail++; console.log(`✗ ${label}${extra ? ` — ${extra}` : ''}`); } };
const pick = (c, keys) => Object.fromEntries(keys.filter((k) => k in c).map((k) => [k, c[k]]));
const C = (c) => pick(c, ['t', 'color', 'swatch', 'kind', 'title', 'sub', 'gain', 'a', 'dur', 'b', 'pct', 'corner', 'action', 'value', 'dark']);
const act = (a) => (a ? { id: a.id, icon: a.icon, label: a.label } : null);
// O cartão do voo E3 (design/cartoes-c2.html E3 + cartoes-e3.html V2 + cartoes-limite.html L2, escolhidos pelo Nuno a 2026-11-14).
const E = (c) => pick(c, ['t', 'color', 'swatch', 'kind', 'title', 'cities', 'flightNo', 'gain', 'gainLbl', 'line', 'quiet', 'sub', 'a', 'dur', 'b', 'corner', 'action']);
const pt = (v, l, end = false) => ({ v, l, end });

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
  live: { cdMin: 985 }, wx: { report: { c: 8, label: 'chuva', ic: 'rain', at: '14:05', st: 'LGW' } } };
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
  giant: { l1: '13:50', unit: null, l2: 'LGW', l2Grey: false }, facts: [{ v: '1 h 05', l: 'falta para aterrar', tone: null }, { v: '3 h 10', l: 'de margem no PSV', tone: null }] });
eq('em voo · cartões', R.emVoo.cards.map(C), [
  { t: 'card', color: 'flight', kind: 'Dia de serviço · setor 3 de 3', title: 'LIS → FNC → LIS → LGW', sub: 'a horas', gain: null, a: { v: '05:15', l: 'report' }, dur: 'PSV 7 h 30 de 11 h 45', b: { v: '17:00', l: 'limite' }, pct: 64, corner: 'share', action: null },
  { t: 'slim', color: 'neutral', swatch: 'rest', title: 'Pernoita em LGW', sub: 'fim de serviço 14:20 · Hotel do aeroporto', gain: true, value: '+45,40 €' },
  { t: 'slim', color: 'alert', title: 'A escala mudou', sub: '2 alterações por rever · nada entra sem ti', gain: false, value: null }]);

// ═══ 2 · Antes do report — o cartão começa na partida (não repete o report); a seguir, a pernoita com o intervalo REAL ═══
eq('antes · topo', R.antes.top, { pill: { text: 'Dia de voo', live: true }, pill2: { text: 'EJU7601', iso: D11 }, what: 'Report às',
  giant: { l1: '05:15', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '1 h 40', l: 'falta', tone: null }, { v: '17:00', l: 'PSV até', tone: null }] });
// O cartão do voo E3: o título de onde sais a onde acabas (4 sítios ou mais), as cidades em português por baixo, o dia pela ordem em
// que acontece (report → parte → chega → fim) com as escalas por cima (V2) e o limite numa linha discreta (L2) — sem o selo do meio.
eq('antes · o cartão do voo (E3)', E(R.antes.cards[0]), { t: 'card', color: 'flight', kind: 'Dia de serviço · 3 setores', title: 'LIS → LGW', cities: 'Lisboa → Londres Gatwick',
  flightNo: null, gain: null, gainLbl: null, line: { pts: [pt('05:15', 'report', true), pt('06:15', 'parte'), pt('13:50', 'chega'), pt('14:20', 'fim', true)], stops: ['LIS', 'FNC', 'LIS', 'LGW'] }, quiet: { l: 'Dentro do limite', sub: 'PSV 8 h 35 de 11 h 45', r: { k: 'margem', v: '3 h 10' } }, sub: null, a: null, dur: null, b: null, corner: 'share', action: null });
// em inglês o limite diz FDP (era "PSV" — achado ao fazer a voz da Simulação, 2026-11-16)
eq('antes · a linha do limite em inglês', homeCards({ ...S.antes, lang: 'en' }).cards[0].quiet, { l: 'Within limits', sub: 'FDP 8 h 35 of 11 h 45', r: { k: 'margin', v: '3 h 10' } });
eq('antes · cartões', R.antes.cards.slice(1).map(C), [
  { t: 'card', color: 'neutral', swatch: 'rest', kind: 'A seguir', title: 'Pernoita em LGW', sub: 'Hotel do aeroporto · mínimo 10 h', gain: '+45,40 €', a: { v: '14:20', l: 'fim de serviço' }, dur: '23 h 45', b: { v: '14:05', l: 'report · qui 12' }, pct: null, corner: 'chev', action: null }]);

// ═══ 3 · Disrupção — a hora nova em grande, a antiga riscada; os limites com o atraso em PRIMEIRO ═══
eq('disrupção · topo', R.disrupcao.top, { pill: { text: 'Atraso', live: true }, pill2: { text: 'EJU7601', iso: D11 }, what: 'Nova partida às',
  giant: { l1: '07:25', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '06:15', l: 'hora da escala', tone: 'was' }, { v: '+70 min', l: 'de atraso', tone: null }] });
eq('disrupção · cartões', R.disrupcao.cards.map(C), [
  { t: 'slim', color: 'alert', title: 'Limites com o atraso', sub: 'projeção: ainda dentro · margem 2 h até às 17:00', gain: false, value: null },
  { t: 'card', color: 'flight', kind: 'Dia de serviço · 3 setores', title: 'LIS → FNC → LIS → LGW', sub: 'o avião ainda vem a caminho (EJU7450)', gain: null, a: { v: '05:15', l: 'report' }, dur: 'PSV projetado 9 h 45 de 11 h 45', b: { v: '15:00', l: 'última chegada' }, pct: null, corner: 'share', action: null },
  { t: 'slim', color: 'neutral', swatch: 'rest', title: 'Pernoita em LGW', sub: 'fim de serviço 15:30 · Hotel do aeroporto', gain: true, value: '+45,40 €' }]);

// ═══ 4 · Véspera — a barra ao fundo do cartão marca o lembrete; a pernoita em linha fina ═══
eq('véspera · topo', R.vespera.top, { pill: { text: 'Voo amanhã', live: true }, pill2: { text: 'quinta 12', iso: D12 }, what: 'Report às',
  giant: { l1: '05:15', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '7 h 35', l: 'falta', tone: null }, { v: '17:00', l: 'PSV até', tone: null }] });
eq('véspera · o cartão do voo (E3)', E(R.vespera.cards[0]), { t: 'card', color: 'flight', kind: 'Dia de serviço · 3 setores', title: 'LIS → LGW', cities: 'Lisboa → Londres Gatwick',
  flightNo: null, gain: null, gainLbl: null, line: { pts: [pt('05:15', 'report', true), pt('06:15', 'parte'), pt('13:50', 'chega'), pt('14:20', 'fim', true)], stops: ['LIS', 'FNC', 'LIS', 'LGW'] }, quiet: { l: 'Dentro do limite', sub: 'PSV 8 h 35 de 11 h 45 · repouso acima do mínimo', r: { k: 'margem', v: '3 h 10' } }, sub: null, a: null, dur: null, b: null, corner: 'chev', action: { id: 'wake', icon: 'bell', label: 'Lembrete 04:00', open: { to: 'wake' } } });
eq('véspera · cartões', R.vespera.cards.slice(1).map(C), [
  { t: 'slim', color: 'neutral', swatch: 'rest', title: 'Pernoita em LGW', sub: 'fim de serviço 14:20 · Hotel do aeroporto', gain: true, value: '+45,40 €' }]);

// ═══ 5 · Pernoita — o repouso mínimo com o ponto no que já está cumprido; o voo de amanhã numa linha, sem repetir o report ═══
eq('pernoita · topo', R.pernoita.top, { pill: { text: 'Pernoita', live: false }, pill2: { text: 'LGW', iso: D11 }, what: 'Report amanhã às',
  giant: { l1: '14:05', unit: null, l2: 'LGW', l2Grey: false }, facts: [{ v: '16 h 25', l: 'falta', tone: null }, { v: '8 °C', l: 'chuva às 14:05', tone: null, ic: 'rain' }] });
eq('pernoita · cartões', R.pernoita.cards.map(C), [
  { t: 'card', color: 'rest', kind: 'Repouso · fora da base', title: 'Hotel do aeroporto', sub: 'pernoita desta noite', gain: '+45,40 €', a: { v: '14:20', l: 'fim de serviço' }, dur: 'mínimo 10 h', b: { v: '00:20', l: 'cumpre-se' }, pct: 73, corner: 'chev', action: null },
  { t: 'slim', color: 'neutral', swatch: 'flight', title: 'LGW → LIS', sub: 'quinta 12 · parte 15:05 · chega 17:45', gain: false, value: null }]);

// ═══ 6 · Standby — lilás; o que já passou da janela e o que rende se não chamarem ═══
eq('standby · topo', R.standby.top, { pill: { text: 'Standby', live: true }, pill2: { text: 'aeroporto', iso: D11 }, what: 'A janela fecha às',
  giant: { l1: '12:00', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '3 h 10', l: 'falta', tone: null }, { v: '~18:45', l: 'PSV até, se chamarem já', tone: null }] });
eq('standby · cartões', R.standby.cards.slice(0, 1).map(C), [
  { t: 'card', color: 'ground', kind: 'Serviço em terra', title: 'Standby no aeroporto', sub: 'PSV estimado a 1 setor (225) · confirma na Simulação', gain: null, a: { v: '08:00', l: 'começou' }, dur: '50 min de 4 h', b: { v: '+38,76 €', l: 'se não chamarem', gain: true }, pct: 21, corner: 'chev', action: null }
]);
// O PRÓXIMO SERVIÇO NOUTRO DIA, num dia de serviço (B3 afinada de design/a-seguir-b3.html, escolhida pelo Nuno a 2026-11-14): um
// cabeçalho com o dia ("Amanhã · quinta 12"; "Sábado 14 · daqui a 3 dias") e uma linha fina com a hora do report à direita.
// "A seguir" fica só para o mesmo dia.
const HDR = (c) => pick(c, ['t', 'id', 'text']);
const LINEN = (c) => pick(c, ['t', 'id', 'color', 'swatch', 'title', 'sub', 'value', 'valueLbl']);
eq('standby · o próximo serviço daqui a 3 dias: o cabeçalho e a linha', [HDR(R.standby.cards[1]), LINEN(R.standby.cards[2])],
  [{ t: 'hdr', id: 'nextHdr', text: 'Sábado 14 · daqui a 3 dias' }, { t: 'slim', id: 'next', color: 'neutral', swatch: 'flight', title: 'LIS → FNC → LIS', sub: 'Lisboa → Funchal → Lisboa · 2 setores', value: '05:30', valueLbl: 'report' }]);

// ═══ 7 · Folga — o número é quanto falta; o dinheiro do mês numa linha; o aviso de outra coisa em último ═══
eq('folga · topo', R.folga.top, { pill: { text: 'Folga', live: false }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Próximo serviço daqui a',
  giant: { l1: '2', unit: 'dias', l2: null, l2Grey: false }, facts: [{ v: 'sexta 13', l: 'até lá', tone: null }, { v: '31 h', l: 'de 60 em 7 dias', tone: null }] });
// F2 (design/folga-1-2.html, escolhida pelo Nuno a 2026-11-14): a calma em cima (a voz e os três sinais — os dados vêm do ecrã), o
// próximo serviço numa linha com o dia (como a B3; o topo já diz quanto falta) e mais um secundário pela prioridade — o aviso que pede
// ação > a verificação > as férias (de novembro em diante) > o mês. Sem os dados da calma (o golden base), fica o resto.
eq('folga · F2: o próximo serviço numa linha com o dia; as férias (novembro) no 2.º lugar', R.folga.cards.map((c) => [c.t, c.id]), [['hdr', 'nextHdr'], ['slim', 'next'], ['slim', 'vac']]);
eq('folga · F2: o cabeçalho e a linha do próximo serviço', [HDR(R.folga.cards[0]), LINEN(R.folga.cards[1])],
  [{ t: 'hdr', id: 'nextHdr', text: 'Sexta 13 · daqui a 2 dias' }, { t: 'slim', id: 'next', color: 'flight', title: 'LIS → FNC → LIS', sub: 'Lisboa → Funchal → Lisboa · 2 setores', value: '05:30', valueLbl: 'report' }]);
// as férias por gozar são informação, não um cuidado: neutro (o âmbar é só para olhar — 14 CFR 25.1322, a lógica do cockpit)
eq('folga · as férias por gozar: neutro', C(R.folga.cards[2]), { t: 'slim', color: 'neutral', title: 'Férias 2026', sub: 'ficam 12 de 22 dias · o ano acaba daqui a 50 dias', gain: false, value: null });
// A menos de 48 h conta em HORAS (auditoria do tripulante, 2026-11-04: "amanhã às 06:00" era "1 dia" e eram 18 h).
eq('folga < 48 h · número em horas', R.folgaHoras.top.giant, { l1: '18', unit: 'h', l1b: '30', l2: null, l2Grey: false });
eq('folga a menos de 1 h · em minutos', homeCards({ ...S.folgaHoras, untilMin: 45 }).top.giant, { l1: '45', unit: 'min', l2: null, l2Grey: false });
eq('folga em horas certas · sem os minutos', homeCards({ ...S.folgaHoras, untilMin: 1080 }).top.giant, { l1: '18', unit: 'h', l2: null, l2Grey: false });
eq('folga < 48 h · "amanhã até lá"', R.folgaHoras.top.facts[0], { v: 'amanhã', l: 'até lá', tone: null });

// ═══ 8 · Pós-voo — o número é o PSV de hoje (duração, sem zero à esquerda) ═══
// A barra "Registar sign-off" SAIU (2026-11-14, regra do Nuno: a app só lê o calendário e calcula; o fim de serviço vem do calendário,
// que a companhia corrige depois). O cartão abre o dia pela seta.
eq('pós-voo · topo', R.posvoo.top, { pill: { text: 'Dia fechado', live: false }, pill2: { text: 'sexta 13', iso: D13 }, what: 'PSV de hoje',
  giant: { l1: '8', unit: 'h', l1b: '35', l2: null, l2Grey: false }, facts: [{ v: '+96,90 €', l: 'ganhos de hoje', tone: 'gain' }, { v: '31 h', l: 'de 60 em 7 dias', tone: null }] });
eq('pós-voo · cartões', R.posvoo.cards.slice(0, 1).map(C), [
  { t: 'card', color: 'rest', kind: 'Repouso · na base', title: 'Descansa', sub: 'o dia fechou dentro dos limites', gain: null, a: { v: '14:20', l: 'fim de serviço' }, dur: 'mínimo 12 h', b: { v: '02:20', l: 'cumpre-se' }, pct: 3, corner: 'chev', action: null }]);
eq('pós-voo · o próximo serviço é amanhã (E3)', E(R.posvoo.cards[1]), { t: 'card', color: 'neutral', swatch: 'flight', kind: 'Próximo serviço · amanhã · 2 setores', title: 'LIS → FNC → LIS', cities: 'Lisboa → Funchal → Lisboa', flightNo: null, gain: null, gainLbl: null, line: { pts: [pt('05:30', 'report', true), pt('11:10', 'fim', true)], stops: ['LIS', 'FNC', 'LIS'] }, quiet: null, sub: null, a: null, dur: null, b: null, corner: 'chev', action: null });
eq('pós-voo, com ou sem sign-off · nunca a barra de registar', [R.posvoo.cards[0].action, homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, signOffDone: true } }).cards[0].action], [null, null]);

// ═══ 9 · Fecho do mês — o valor inteiro com cêntimos, "estimado" por baixo; as parcelas SOMAM o número de cima ═══
eq('fecho · topo', R.fecho.top, { pill: { text: 'Fecho do mês', live: false }, pill2: { text: 'fecha em 3 dias', iso: null }, what: 'Ganhos brutos de novembro',
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
  { t: 'card', kind: 'No regresso · segunda 16 · 2 setores', title: 'LIS → FNC → LIS', sub: null }, { t: 'slim', title: 'Novembro', sub: 'estimado · bruto', value: '2 431,50 €' }]);

// ═══ 11 · Folga sem serviços — quando enche, a que horas foi lida, o que podes fazer ═══
eq('vazia · topo', R.vazia.top, { pill: { text: 'Folga', live: false }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Sem serviços na escala',
  giant: { l1: 'Livre', unit: null, l2: 'hoje', l2Grey: true }, facts: [{ v: 'Em dia', l: 'a tua escala', tone: null }, { v: '12:40', l: 'última leitura', tone: null }] });
eq('vazia · cartões', R.vazia.cards.map((c) => [c.t, c.title || c.kind, c.open && c.open.to, !!c.dark]), [['text', 'Quando aparecem', null, false], ['slim', 'Ler a escala agora', 'sync', true], ['slim', 'Importar o PDF', 'pdf', false]]);

// ═══ 12 · Configuração — três passos num cartão e o botão que começa ═══
eq('configuração · topo', R.setup.top, { pill: { text: 'Bem-vindo', live: false }, pill2: null, what: 'Para a app saber o teu dia',
  giant: { l1: 'Liga a', unit: null, l2: 'escala', l2Grey: false }, facts: [{ v: 'Só leitura', l: 'nada é alterado', tone: null }, { v: 'Com o teu sim', l: 'é que se grava', tone: null }] });
eq('configuração · as três ações da app', R.setup.cards.map((c) => [c.t, c.title || c.kind, c.open && c.open.to]),
  [['lines', 'Três passos', 'privacy'], ['slim', 'Ligar o calendário', 'connect'], ['slim', 'Importar o PDF', 'pdf'], ['slim', 'Ver um exemplo', 'demo']]);

// ═══ 13 · Incerto — "Incerto" no lugar do número, o que falta na linha pequena; o mês com as duas pontas ═══
// Regra do Nuno (2026-11-14): a app só lê o calendário e calcula — a barra "Completar" do cartão de serviço SAIU (o cartão inteiro
// abre o dia, pela seta do canto). O "Completar" do mês fica: leva ao Perfil (a data de entrada na companhia é do Perfil, à mão).
eq('incerto · factos', R.incerto.top.facts, [{ v: '1 h 40', l: 'falta', tone: null }, { v: 'Incerto', l: 'PSV até', tone: null }]);
// L2 (design/cartoes-limite.html): o limite incerto tem CARTÃO PRÓPRIO, por cima, neutro e tracejado, com o que falta; o cartão do voo
// fica sem a linha do limite (nunca "Dentro do limite" sobre um limite que não é certo).
eq('incerto · o limite num cartão à parte, por cima', pick(R.incerto.cards[0], ['t', 'id', 'color', 'dashed', 'kind', 'title', 'sub', 'open']),
  { t: 'slim', id: 'limit', color: 'neutral', dashed: true, kind: 'O limite de hoje', title: 'Limite incerto', sub: 'PSV 8 h 35 · falta o alojamento da pausa', open: { to: 'item', id: 'legal' } });
eq('incerto · o cartão do voo sem a linha do limite', E(R.incerto.cards[1]), { t: 'card', color: 'flight', kind: 'Dia de serviço · repartido', title: 'LIS → FNC → LIS', cities: 'Lisboa → Funchal → Lisboa',
  flightNo: null, gain: null, gainLbl: null, line: { pts: [pt('05:15', 'report', true), pt('06:15', 'parte'), pt('18:40', 'chega'), pt('19:10', 'fim', true)], stops: ['LIS', 'FNC', 'LIS'] }, quiet: null, sub: null, a: null, dur: null, b: null, corner: 'share', action: null });
{
  // com as duas pontas do máximo: a margem nas duas pontas
  const u2 = homeCards({ ...S.incerto, hero: { ...S.incerto.hero, psv: { ...HERO.psv, plan: '08:35', max: '11:45', hi: '12:30' } } });
  eq('incerto com as duas pontas · a margem de … a …', [u2.cards[0].title, u2.cards[0].sub], ['Incerto · margem 3 h 10 a 3 h 55', 'PSV 8 h 35 de 11 h 45 a 12 h 30 · falta o alojamento da pausa']);
  const vu = homeCards({ ...S.vespera, hero: { ...S.vespera.hero, legal: { status: 'uncertain', missing: 'o alojamento da pausa' } } });
  eq('véspera incerta · o limite de amanhã', [vu.cards[0].kind, vu.cards[0].id, vu.cards[1].quiet], ['O limite de amanhã', 'limit', null]);
}
const mi = R.mesIncerto.cards.find((c) => c.id === 'month');
eq('mês incerto · as duas pontas, nunca um valor inventado', pick(mi, ['t', 'kind', 'rows', 'note', 'link']), { t: 'lines', kind: 'Novembro · incerto · bruto',
  rows: [{ k: 'No mínimo', v: '2 180,00 €' }, { k: 'No máximo', v: '2 431,50 €' }], note: 'Falta o dia em que entraste na companhia.', link: { label: 'Completar', open: { to: 'profile' } } });
const fechoUnc = homeCards({ ...S.fecho, month: { ...MONTH, unc: { min: 1398.5, max: 1650, why: 'Falta o dia em que entraste na companhia.' } } });
eq('fecho incerto · "Incerto" no lugar do número', fechoUnc.top.giant, { l1: 'Incerto', unit: null, l2: null, l2Grey: false });
eq('fecho incerto · as pontas no pé das parcelas', fechoUnc.cards[0].foot, [{ k: 'No mínimo', v: '2 180,00 €' }, { k: 'No máximo', v: '2 431,50 €' }]);

// ═══ 14 · Formação — um dia em terra sem ruído de voo ═══
eq('formação · topo', R.formacao.top, { pill: { text: 'Formação', live: true }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Começa às',
  giant: { l1: '09:00', unit: null, l2: 'LIS', l2Grey: false }, facts: [{ v: '50 min', l: 'falta', tone: null }, { v: '17:00', l: 'acaba', tone: null }] });
eq('formação · cartões', R.formacao.cards.map((c) => pick(c, ['t', 'color', 'swatch', 'kind', 'title', 'sub'])), [
  { t: 'slim', color: 'ground', title: 'Formação', sub: '8 h de serviço em terra' }, { t: 'hdr', color: undefined, kind: undefined, title: undefined, sub: undefined }, { t: 'slim', color: 'neutral', swatch: 'flight', title: 'LIS → FNC → LIS', sub: 'Lisboa → Funchal → Lisboa · 2 setores' }]);

// ═══ 15 · Documento a caducar — a 7 dias ou menos toma o topo (só na folga) ═══
eq('documento · topo', R.documento.top, { pill: { text: 'Atenção', live: true }, pill2: { text: 'quarta 11', iso: D11 }, what: 'Certificado médico caduca em',
  giant: { l1: '6', unit: 'dias', l2: '17 nov', l2Grey: false }, facts: [{ v: 'terça', l: 'último dia válido', tone: null }, { v: '2 serviços', l: 'marcados depois', tone: null }] });
eq('documento · cartões', R.documento.cards.map((c) => pick(c, ['t', 'color', 'swatch', 'kind', 'title', 'sub'])), [
  { t: 'card', color: 'alert', kind: 'Validades', title: 'Certificado médico', sub: 'Quando renovares, regista a data nova para o aviso sair.' },
  { t: 'card', color: 'flight', kind: 'Próximo serviço · sábado 14 · 2 setores', title: 'LIS → FNC → LIS', sub: 'ainda dentro da validade' }]);
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
eq('disrupção · facto (não projetado)', [disReal.cards[0].sub, disReal.cards[1].dur], ['ainda dentro · margem 2 h até às 17:00', 'PSV 9 h 45 de 11 h 45']);
const disOver = homeCards({ ...S.disrupcao, dis: { ...S.disrupcao.dis, verdict: { verdict: 'over', realStr: '12:10', maxStr: '11:45', projected: true } } });
eq('disrupção · acima do limite, projetado', disOver.cards[0].sub, 'acima do limite · PSV projetado 12 h 10 de 11 h 45');
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
eq('aterrado · topo', [ater.top.what, ater.top.facts[0]], ['Aterraste às', { v: '8 h 35', l: 'PSV de hoje', tone: null }]);
// D1 · as durações com "h", os dois pontos só nas horas do relógio — também nos casos à margem
eq('D1 · o dia fechado com o PSV em horas certas e com menos de 1 h', [homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, fdp: '09:00' } }).top.giant, homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, fdp: '00:45' } }).top.giant],
  [{ l1: '9', unit: 'h', l2: null, l2Grey: false }, { l1: '45', unit: 'min', l2: null, l2Grey: false }]);
eq('D1 · a margem já passada, em voo', homeCards({ ...S.emVoo, live: { ...S.emVoo.live, marginMin: -20 } }).top.facts[1], { v: '20 min', l: 'depois do limite do PSV', tone: null });
eq('D1 · o PSV previsto com duas pontas (atraso sem veredicto)', homeCards({ ...S.disrupcao, dis: { ...S.disrupcao.dis, verdict: null }, hero: { ...HERO, psv: { ...HERO.psv, hi: '12:15' } } }).cards.find((c) => c.t === 'card').dur,
  'PSV 8 h 35 de 11 h 45–12 h 15');
// (8) Sem hora de report, depois da partida: di-lo.
const semRep = homeCards({ ...S.emVoo, warns: [], phase: 'duty', hero: { ...S.emVoo.hero, report: null, psv: {} }, live: { ...S.emVoo.live, nowPct: null, marginMin: null, depHm: '09:00', minsToDep: 20, status: null } });
eq('sem report · facto e cartão', [semRep.top.facts[1], semRep.cards[0].sub], [{ v: 'Sem report', l: 'PSV não calculado', tone: null }, 'sem hora de report — PSV não calculado']);
const semRepAr = homeCards({ ...S.emVoo, warns: [], phase: 'air', hero: { ...S.emVoo.hero, report: null, psv: {}, dep: '15:56', lastArr: '21:35' }, live: { ...S.emVoo.live, nowPct: null, marginMin: null, arrHm: '17:15', minsToArr: 59, status: null } });
eq('sem report em voo · o cartão mostra partida e última chegada (iPhone)', [semRepAr.cards[0].a, semRepAr.cards[0].dur, semRepAr.cards[0].b], [{ v: '15:56', l: 'partida' }, '5 h 39', { v: '21:35', l: 'última chegada' }]);
// (9) O repouso que só acaba daqui a 2 dias (noites locais da rotação, CS FTL.1.235(b)(3)) diz o dia.
const rot = homeCards({ ...S.posvoo, rest: { ...S.posvoo.rest, until: '06:00', untilIso: '2026-11-15', minMin: 2380 } });
eq('repouso de 2 dias · o dia junto da hora', rot.cards[0].b, { v: '06:00', l: 'cumpre-se · dom 15' });
// "cumpre-se" enquanto o repouso não chega à hora; "cumprido" quando chega (a barra a 100 %) — nunca o passado para uma hora que vem
const restDone = homeCards({ ...S.posvoo, rest: { ...S.posvoo.rest, pct: 100 } });
eq('repouso que já chegou à hora · "cumprido"', restDone.cards[0].b, { v: '02:20', l: 'cumprido' });
eq('em inglês · antes e depois', [homeCards({ ...S.posvoo, lang: 'en' }).cards[0].b.l, homeCards({ ...S.posvoo, lang: 'en', rest: { ...S.posvoo.rest, pct: 100 } }).cards[0].b.l], ['will be met', 'met']);
eq('o dia que fechou dentro dos limites · em inglês', homeCards({ ...S.posvoo, lang: 'en' }).cards[0].sub, 'the day closed within limits');

// ═══ O REPOUSO INCERTO (2026-11-12, "tem é que seguir a lei"): quando o mínimo depende de uma leitura que a lei não fecha, o
// cartão não escolhe — mostra as duas pontas, o motivo, e a hora grande só diz "Incerto" (o padrão do dinheiro incerto). ═══
const SB_CLOSED = { kindLabel: 'Standby em casa', signOffDone: true };
const restUnc = homeCards({ ...S.posvoo, closed: SB_CLOSED, rest: { signOff: '20:00', until: '14:00', untilIso: D14, minMin: 1080, pct: 3, unc: { lo: '12:00', hi: '14:00', minLo: 960, minHi: 1080, why: 'standbyHome' } } });
eq('repouso incerto · o cartão diz as duas pontas e o motivo', C(restUnc.cards[0]),
  { t: 'card', color: 'rest', kind: 'Repouso · na base', title: 'Descansa', sub: 'cumpre-se entre 12:00 e 14:00 · a companhia fixa o repouso depois da assistência', gain: null, a: { v: '20:00', l: 'fim de serviço' }, dur: 'mín. 16 h–18 h', b: { v: '14:00', l: 'no máximo' }, pct: 3, corner: 'chev', action: null });
const restNoRep = homeCards({ ...S.posvoo, closed: SB_CLOSED, rest: { signOff: '20:00', until: '08:00', untilIso: D14, minMin: 720, pct: 3, unc: { lo: '08:00', hi: null, minLo: 720, minHi: null, why: 'noReport', estDay: '09/11' } } });
eq('repouso incerto sem teto (falta uma apresentação) · só o mínimo, dito', [restNoRep.cards[0].sub, restNoRep.cards[0].dur, restNoRep.cards[0].b],
  ['falta a hora de apresentação do serviço de 09/11', 'mín. 12 h ou mais', { v: '08:00', l: 'no mínimo' }]);
eq('repouso incerto num dia que fechou acima do limite · as duas frases', homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, over: true }, rest: { ...S.posvoo.rest, unc: { lo: '02:20', hi: '03:20', minLo: 720, minHi: 780, why: 'legTimes' } } }).cards[0].sub,
  'dia acima do limite · repouso 02:20–03:20 · as horas das pernas não batem certo');
const perUnc = homeCards({ state: 'pernoita', todayISO: D11, rest: { signOff: '14:20', until: '03:20', minMin: 780, pct: 40, hotel: 'Hotel do aeroporto', pay: 45.4, station: 'FNC', unc: { lo: '00:20', hi: '03:20', minLo: 600, minHi: 780, why: 'standbyHome' } }, next: null });
eq('pernoita com o repouso incerto · topo "Incerto" com as duas pontas', [perUnc.top.what, perUnc.top.giant, perUnc.top.facts],
  ['Repouso até', { l1: 'Incerto', unit: null, l2: 'FNC', l2Grey: false }, [{ v: '00:20', l: 'no mínimo', tone: null }, { v: '03:20', l: 'no máximo', tone: null }]]);
eq('… e o cartão diz o mínimo nas duas pontas e o motivo', [perUnc.cards[0].dur, perUnc.cards[0].sub], ['mín. 10 h–13 h', 'cumpre-se entre 00:20 e 03:20 · a companhia fixa o repouso depois da assistência']);
eq('… e, chegada a hora, "cumprido entre"', homeCards({ state: 'pernoita', todayISO: D11, rest: { signOff: '14:20', until: '03:20', minMin: 780, pct: 100, hotel: 'Hotel do aeroporto', pay: 45.4, station: 'FNC', unc: { lo: '00:20', hi: '03:20', minLo: 600, minHi: 780, why: 'standbyHome' } }, next: null }).cards[0].sub,
  'cumprido entre 00:20 e 03:20 · a companhia fixa o repouso depois da assistência');
eq('pernoita a seguir ao serviço de hoje · mínimo nas duas pontas', homeCards({ ...S.antes, hero: { ...HERO, restAfterMin: 780, restAfterLoMin: 600 } }).cards.find((c) => c.id === 'night').sub, 'Hotel do aeroporto · mínimo 10 h a 13 h');
for (const why of ['standbyHome', 'extAfterStandby', 'extPreRest', 'rotationNights', 'groundBetween', 'legTimes', 'breakOrRest', 'reducedRestAfter', 'noReport']) for (const lang of ['pt', 'en']) {
  const r = homeCards({ ...S.posvoo, lang, closed: SB_CLOSED, rest: { signOff: '20:00', until: '14:00', minMin: 1080, pct: 3, unc: { lo: '12:00', hi: why === 'noReport' ? null : '14:00', minLo: 960, minHi: why === 'noReport' ? null : 1080, why, estDay: '09/11' } } });
  yes(`repouso incerto · ${why} · ${lang} · frase com motivo, sem indefinidos`, r.cards[0].sub.length > 20 && r.cards[0].sub.length <= 82 && r.cards[0].dur.length <= 20 && r.cards[0].b.l.length <= 10 && !/undefined|null|NaN/.test(JSON.stringify([r.cards[0].sub, r.cards[0].dur, r.cards[0].b])));
}

eq('repouso incerto pelas noites locais · o motivo', homeCards({ ...S.posvoo, closed: SB_CLOSED, rest: { signOff: '16:00', until: '06:00', untilIso: '2026-11-15', minMin: 2280, pct: 3, unc: { lo: '04:00', hi: '06:00', minLo: 720, minHi: 2280, why: 'rotationNights' } } }).cards[0].sub,
  'cumpre-se entre 04:00 e 06:00 · a lei não diz se as noites locais ainda se pedem');

// ═══ A HORA ZULU do report — JUNTO DO SÍTIO, por baixo da hora do report (a) de design/meteo-topo.html, 2026-11-14) ═══
// Era o 3.º facto (opção A, 2026-11-11). Com o tempo no topo seriam quatro factos e só cabem três: a hora UTC passa para a 2.ª
// linha do número, ao lado do sítio ("LIS 04:15Z"), só quando é diferente da local e só quando o número grande É o report.
const zAntes = homeCards({ ...S.antes, hero: { ...HERO, reportZ: '04:15' } });
eq('Zulu · antes do report, junto do sítio (não é facto)', [zAntes.top.giant.zulu || null, zAntes.top.facts.map((f) => f.v)], ['04:15Z', ['1 h 40', '17:00']]);
eq('Zulu · igual à local (inverno em Lisboa) → não aparece', homeCards({ ...S.antes, hero: { ...HERO, reportZ: '05:15' } }).top.giant.zulu || null, null);
{
  const vz = homeCards({ ...S.vespera, hero: { ...S.vespera.hero, reportZ: '04:15' } }).top;
  eq('Zulu · véspera', [vz.giant.zulu || null, vz.facts.map((f) => f.v)], ['04:15Z', ['7 h 35', '17:00']]);
}
eq('Zulu · pernoita em LGW, igual à local', homeCards({ ...S.pernoita, hero: { ...S.pernoita.hero, reportZ: '14:05' } }).top.giant.zulu || null, null);
eq('Zulu · pernoita fora, fuso diferente', homeCards({ ...S.pernoita, hero: { ...S.pernoita.hero, reportZ: '13:05' } }).top.giant.zulu || null, '13:05Z');
eq('Zulu · em voo não aparece (o número é a aterragem)', homeCards({ ...S.emVoo, hero: { ...S.emVoo.hero, reportZ: '04:15' } }).top.giant.zulu || null, null);
{
  const t = homeCards({ ...S.antes, hero: { ...HERO, reportZ: '04:15' }, wx: { report: { c: 4, label: 'nevoeiro', ic: 'fog', at: '05:15', st: 'LIS' } } }).top;
  yes('Zulu + 3 factos (com o tempo) · o número não encolhe e tudo cabe ao lado (390 e 375)', t.facts.length === 3 && topGiant(t, 350).size === 62 && topGiant(t, 335).size === 58 && topGiant(t, 350).fits && topGiant(t, 335).fits, JSON.stringify([topGiant(t, 350), topGiant(t, 335)]));
}
const zPern = homeCards({ ...S.pernoita, hero: { ...S.pernoita.hero, reportZ: '13:05' } });
yes('Zulu · pernoita em LGW: no tamanho comum e os três factos cabem ao lado (390 e 375)', topGiant(zPern.top, 350).size === 62 && topGiant(zPern.top, 335).size === 58 && topGiant(zPern.top, 350).fits && topGiant(zPern.top, 335).fits);

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
  // O SELO entre duas horas é o intervalo entre elas ("7 h 35", "mínimo 10 h", "PSV 7 h 30 de 11 h 45", "50 min de 4 h").
  for (const c of big) {
    if (!c.a || !c.b || !c.dur || c.b.gain) continue;
    const sp = toMin(c.b.v) >= toMin(c.a.v) ? toMin(c.b.v) - toMin(c.a.v) : toMin(c.b.v) + 1440 - toMin(c.a.v);
    // "PSV x de y": o intervalo é o x (até à última chegada) ou o y (até ao limite); "50 min de 4 h": o y; "mínimo 10 h"; "7 h 35".
    // (D1, 2026-11-14: as durações com "h" — o PSV também; nenhum selo com dois pontos, que são só das horas do relógio)
    const m = /^PSV (?:projetado )?(.+?)(?: (?:de|of) (.+))?$/.exec(c.dur);
    const m2 = /^(.+) (?:de|of) (.+)$/.exec(c.dur);
    const ok1 = !/\d:\d\d/.test(c.dur) && (m ? [m[1], m[2]].includes(F.dur(sp)) : m2 ? m2[2] === F.dur(sp) : c.dur.replace(/^mínimo /, '') === F.dur(sp));
    yes(`${k} · ${c.id}: o selo é o intervalo entre ${c.a.v} e ${c.b.v}`, ok1, `${c.dur} ≠ ${F.dur(sp)}`);
  }
  // € SEMPRE COM CÊNTIMOS, em tudo o que se escreve.
  const txt = JSON.stringify(r);
  const eurs = txt.match(/[+−-]?[\d ]+(?:,\d+)? €/g) || [];
  yes(`${k} · todo o € com cêntimos`, !/\d €/.test(txt.replace(/,\d{2} €/g, '')), eurs.join(' | '));
  yes(`${k} · nada indefinido`, !/undefined|NaN|null h|\[object/.test(txt));
}
yes('o total do mês diz sempre "estimado · bruto"', all.every(([, r]) => r.cards.filter((c) => c.id === 'month' && c.t === 'slim').every((c) => c.sub === 'estimado · bruto')));
yes('o que um serviço rende vai sempre numa pílula (gain), nunca no título', all.every(([, r]) => r.cards.every((c) => !/^\+/.test(c.title || ''))));

// ═══ O TOPO LADO A LADO E IGUAL NAS TRÊS ABAS (L1 de design/topo-lado.html, escolhida pelo Nuno a 2026-11-14) ═══
// O número à esquerda (duas linhas) e os factos à direita, com o fio — como antes — mas com UM tamanho para o Início, a Escala e
// os Números, o maior em que tudo cabe lado a lado: a Escala é a mais apertada ("serviços" e o per diem de quatro algarismos) e
// os Números ficam só com o total (o "acima da base" passa para o cartão "De onde vem"; as horas estão na linha "Voo").
// Larguras da Hanken lidas do .ttf; 390 (350 úteis) e 375 (335). O € nunca se corta. O mesmo tamanho nas duas línguas.
// (Antes: H1 — os factos por baixo, a 82 — de que o Nuno não gostou; e antes disso cada aba no seu tamanho: 86 · 62 · 86.)
eq('o tamanho comum: 62 a 390 e 58 a 375', [commonGiant(350), commonGiant(335)], [62, 58]);
const sizes = [];
const sameTop = (label, t) => {
  const a = topGiant(t, 350), b = topGiant(t, 335);
  yes(`${label} · no tamanho comum, com os factos ao lado (390 e 375)`, a.size === commonGiant(350) && b.size === commonGiant(335) && a.fits && b.fits, `${a.size}/${b.size}`);
  sizes.push(`${label} ${a.size}/${b.size}`);
};
for (const [k, r] of all) sameTop(`Início · ${k}`, r.top);
for (const [k, v] of Object.entries(S)) sameTop(`Início en · ${k}`, homeCards({ ...v, lang: 'en' }).top);
eq('en · antes de ligar a escala: "Link" (o "Connect" não cabia ao lado)', homeCards({ ...S.setup, lang: 'en' }).top.giant.l1, 'Link');
// A Escala (o topo é feito em screens/EscalaScreen.js): os casos mais compridos — "serviços", o per diem de quatro algarismos.
const ESC = {
  '11 serviços':  { giant: { l1: '11', l2: 'serviços' }, facts: [{ v: '6', l: 'pernoitas' }, { v: '1 732,80 €', l: 'per diem · estimado' }] },
  '31 serviços':  { giant: { l1: '31', l2: 'serviços' }, facts: [{ v: '15', l: 'pernoitas' }, { v: '4 999,99 €', l: 'per diem · estimado' }] },
  '1 serviço':    { giant: { l1: '1', l2: 'serviço' }, facts: [{ v: '0', l: 'pernoitas' }] },
  'en 31 duties': { giant: { l1: '31', l2: 'duties' }, facts: [{ v: '15', l: 'night stops' }, { v: '€4,999.99', l: 'per diem · estimated' }] },
};
for (const [k, t] of Object.entries(ESC)) sameTop(`Escala · ${k}`, t);
// Os Números (screens/StatsScreen.js): SÓ o total no topo, sem factos.
const NUM = {
  'mês 15 137,64 €':  { giant: { l1: '15 137', unit: ',64 €', l2: 'estimado' }, facts: null },
  'ano 127 912,70 €': { giant: { l1: '127 912', unit: ',70 €', l2: 'estimado' }, facts: null },
  'ano 199 999,99 €': { giant: { l1: '199 999', unit: ',99 €', l2: 'incerto' }, facts: null },
  'en €199,999.99':   { giant: { l1: '€199,999', unit: '.99', l2: 'uncertain' }, facts: null },
  'incerto':          { giant: { l1: 'Incerto', unit: null, l2: null }, facts: null },
  'horas do ano':     { giant: { l1: '612,5', unit: 'h', l2: null }, facts: null },
};
for (const [k, t] of Object.entries(NUM)) sameTop(`Números · ${k}`, t);

// ═══ A METEOROLOGIA NO TOPO (D3 de design/meteo-amanha.html + a) de design/meteo-topo.html, escolhidas pelo Nuno a 2026-11-14) ═══
// O tempo é um FACTO DO TOPO (o último dos três) em todos os estados com serviço — um sítio e uma hora: a folga e o pós-voo com o
// serviço AMANHÃ e a véspera e antes do report (a base à hora do report), em serviço e em voo (o destino do setor à chegada), a
// pernoita (à hora do report). Sai das linhas dos cartões (era a M1), para não se repetir — menos a cidade da pernoita à chegada,
// no cartão da pernoita (outro sítio, outra hora). Sem serviço não há tempo (a app não usa a localização). O crédito do MET Norway
// (CC BY 4.0) aparece sempre que há tempo.
const WXR = { c: 4, label: 'nevoeiro', ic: 'fog', at: '05:15', st: 'LIS' };
const WXN = { c: 12, label: 'chuva', ic: 'rain', st: 'LGW' };
const WXA = { c: 12, label: 'chuva', ic: 'rain', st: 'LGW' };
const WXF = { c: 4, label: 'nevoeiro', ic: 'fog', at: '05:30', st: 'LIS' };
{
  const v = homeCards({ ...S.vespera, wx: { report: WXR, night: WXN } });
  eq('véspera · o tempo é o 3.º facto (à hora do report)', v.top.facts[2], { v: '4 °C', l: 'nevoeiro às 05:15', tone: null, ic: 'fog' });
  eq('véspera · o cartão do dia já não repete o tempo', v.cards.find((c) => c.id === 'day').wx || null, null);
  const n = v.cards.find((c) => c.id === 'night');
  yes('véspera · a cidade da pernoita à chegada fica no cartão da pernoita', /· 12 °C, chuva à chegada$/.test(n.sub), n.sub);
  eq('véspera · o crédito do MET Norway', v.credit, 'Meteorologia: MET Norway');
  eq('véspera sem tempo · dois factos e sem crédito', [homeCards(S.vespera).top.facts.length, homeCards(S.vespera).credit || null], [2, null]);
  const a = homeCards({ ...S.antes, wx: { report: WXR } });
  eq('antes do report · o 3.º facto, e o cartão sem linha', [a.top.facts[2], a.cards.find((c) => c.id === 'day').wx || null], [{ v: '4 °C', l: 'nevoeiro às 05:15', tone: null, ic: 'fog' }, null]);
  const f = homeCards({ ...S.emVoo, wx: { arrival: WXA } });
  eq('em voo · o tempo do destino à chegada, o 3.º facto', [f.top.facts[2], f.cards.find((c) => c.id === 'day').wx || null], [{ v: '12 °C', l: 'chuva em LGW à chegada', tone: null, ic: 'rain' }, null]);
  eq('em voo · o crédito', f.credit, 'Meteorologia: MET Norway');
  eq('pernoita · o facto à hora do report (a condição primeiro)', homeCards(S.pernoita).top.facts[1], { v: '8 °C', l: 'chuva às 14:05', tone: null, ic: 'rain' });
  eq('pernoita · o crédito', homeCards(S.pernoita).credit, 'Meteorologia: MET Norway');
  const fh = homeCards({ ...S.folgaHoras, wx: { report: WXF } });
  eq('folga com o serviço amanhã · o 3.º facto', [fh.top.facts.map((x) => x.v), fh.top.facts[2], fh.credit], [['amanhã', '31 h', '4 °C'], { v: '4 °C', l: 'nevoeiro às 05:30', tone: null, ic: 'fog' }, 'Meteorologia: MET Norway']);
  const pv = homeCards({ ...S.posvoo, wx: { report: WXF } });
  eq('pós-voo com o serviço amanhã · o 3.º facto', pv.top.facts.map((x) => x.v), ['+96,90 €', '31 h', '4 °C']);
  const fl = homeCards({ ...S.folga, wx: { report: WXF } });
  eq('folga com o serviço daqui a 2 dias · sem tempo', [fl.top.facts.length, fl.credit || null], [2, null]);
  for (const k of ['ferias', 'baixa', 'standby', 'fecho', 'vazia']) {
    const r = homeCards({ ...S[k], wx: { report: WXR, night: WXN, arrival: WXA } });
    yes(`${k} · sem tempo nem crédito`, !r.credit && !r.cards.some((c) => c.wx) && !JSON.stringify(r.top).includes('°C'), JSON.stringify(r.credit));
  }
  for (const [k, t] of [['véspera', v.top], ['antes', a.top], ['em voo', f.top], ['pernoita', homeCards(S.pernoita).top], ['folga', fh.top], ['pós-voo', pv.top]]) {
    yes(`${k} com o tempo · o número fica no tamanho comum (62 · 58) e tudo cabe`, topGiant(t, 350).size === 62 && topGiant(t, 335).size === 58 && topGiant(t, 335).fits, JSON.stringify([k, topGiant(t, 350), topGiant(t, 335)]));
  }
  const ve = homeCards({ ...S.vespera, lang: 'en', wx: { report: { ...WXR, label: 'fog' }, night: { ...WXN, label: 'rain' } } });
  eq('en · véspera', [ve.top.facts[2], ve.credit], [{ v: '4 °C', l: 'fog at 05:15', tone: null, ic: 'fog' }, 'Weather data: MET Norway']);
  eq('en · em voo', homeCards({ ...S.emVoo, lang: 'en', wx: { arrival: WXA } }).top.facts[2].l, 'chuva in LGW on arrival');
}

// ═══ O MAPA B NOS AVISOS (visto no iPhone a 2026-11-14): passar o limite = VERMELHO com "✕"; olhar = laranja ═══
// O "Tenho descanso?" com ✕ aparecia laranja no Início e vermelho com ✕ na folha. Um aviso com `tone: 'stop'` (fora dos
// limites FTL, documento expirado) é vermelho e leva o ✕; os outros ficam laranja, sem sinal.
{
  const STOP_W = { id: 'ftl', first: true, tone: 'stop', title: 'Tenho descanso?', sub: 'Não · falta uma noite local antes do matinal de 15/11', open: { to: 'item', id: 'rest' } };
  const r = homeCards({ ...S.folga, warns: [STOP_W, ROSTER_W] });
  const ftl = r.cards.find((c) => c.id === 'ftl'), ros = r.cards.find((c) => c.id === 'roster');
  eq('aviso fora do limite · vermelho com ✕', ftl && [ftl.color, ftl.mark], ['stop', '✕']);
  // o mapa B: o laranja leva o "!" (a cor nunca sozinha — Apple HIG, 2026-11-14)
  eq('aviso de olhar · laranja com "!"', ros && [ros.color, ros.mark || null], ['alert', '!']);
}

// ═══ O CARTÃO DO VOO E3 — os pormenores (2026-11-14) ═══
{
  // 1 setor: o número do voo no selo, as cidades das duas pontas, sem escalas; o per diem com o nome
  const one = homeCards({ ...S.antes, hero: { ...HERO, stations: ['OPO', 'LIS'], sectors: 1, flightNo: 'EZY1010', report: '15:15', dep: '16:00', lastArr: '16:50', end: '17:20', perDiem: 154.51,
    psv: { max: '12:00', plan: '01:35', latest: '03:15', latestNextDay: true }, nightStop: null } }).cards[0];
  eq('1 setor · o voo, as cidades, o per diem com o nome, a linha sem escalas, o limite discreto',
    [one.title, one.cities, one.flightNo, one.gain, one.gainLbl, one.line.stops, one.line.pts.map((x) => x.v), one.quiet],
    ['OPO → LIS', 'Porto → Lisboa', 'EZY1010', '+154,51 €', 'per diem', null, ['15:15', '16:00', '16:50', '17:20'], { l: 'Dentro do limite', sub: 'PSV 1 h 35 de 12 h', r: { k: 'margem', v: '10 h 25' } }]);
  // as cidades só em português quando a app as tem (data/countries.js) ou o aeroporto é português; senão, nenhuma linha
  const tfs = homeCards({ ...S.antes, hero: { ...HERO, stations: ['LIS', 'TFS'], sectors: 1 } }).cards[0];
  eq('cidade sem nome em português (Tenerife) · sem a linha das cidades', tfs.cities, null);
  eq('em inglês · as cidades do catálogo', homeCards({ ...S.antes, lang: 'en', hero: { ...HERO, stations: ['OPO', 'LIS'], sectors: 1 } }).cards[0].cities, 'Porto → Lisbon');
  // sem hora de report: a linha começa na partida
  const nr = homeCards({ ...S.antes, hero: { ...HERO, report: null, psv: {} } }).cards[0];
  eq('sem report · a linha começa na partida, sem limite', [nr.line.pts.map((x) => x.l), nr.quiet], [['parte', 'chega', 'fim'], null]);
  // acima do limite: o cartão do voo sem a linha (o aviso vermelho vem do ecrã, por cima)
  eq('acima do limite · sem a linha discreta', homeCards({ ...S.antes, hero: { ...HERO, legal: { status: 'bad' } } }).cards[0].quiet, null);
  // o próximo serviço com o PSV conhecido (vem do mesmo voo do topo): o limite discreto, sem dizer "Dentro do limite" sem os acumulados
  // (na folga o próximo serviço passou a linha — F2; o cartão grande do próximo serviço continua no pós-voo e no regresso das férias)
  const nx = homeCards({ ...S.posvoo, next: { ...NEXT_IV(D14), psv: { max: '12:15', plan: '05:10' }, perDiem: 120.4, flightNo: 'EZY7841' } }).cards.find((c) => c.id === 'next');
  eq('próximo serviço com o PSV · "PSV dentro do limite" e o per diem', [nx.quiet, nx.gain, nx.flightNo], [{ l: 'PSV dentro do limite', sub: '5 h 10 de 12 h 15', r: { k: 'margem', v: '7 h 05' } }, '+120,40 €', null]);
  // os avisos podem levar o tema por cima (o limite excedido: "O limite de hoje")
  const ov = homeCards({ ...S.folga, warns: [{ id: 'ftl', first: true, tone: 'stop', kind: 'O limite de hoje', title: 'Acima do limite · 45 min a mais', sub: 'PSV 12 h 45 de 12 h', open: { to: 'item', id: 'legal' } }] }).cards.find((c) => c.id === 'ftl');
  eq('aviso com o tema por cima', [ov.kind, ov.title, ov.color, ov.mark], ['O limite de hoje', 'Acima do limite · 45 min a mais', 'stop', '✕']);
}

// ═══ O ESTADO COMO TÍTULO — as palavras (design/estados-s2.html, 2026-11-14) ═══
// O estado é o título do Início (S2 + T2): diz sempre onde estás no teu dia, sem precisar da pílula ao lado. "Hoje" (quatro
// situações), "Amanhã", "Novembro" e "Começar" não chegavam sozinhos.
{
  const t = (h) => h.top.pill.text;
  eq('depois do report, em terra · "Em serviço"', t(homeCards({ ...S.emVoo, phase: 'duty' })), 'Em serviço');
  eq('no ar · "Em voo"', t(R.emVoo), 'Em voo');
  eq('depois de aterrar · "Aterrado"', t(homeCards({ ...S.emVoo, phase: 'landed' })), 'Aterrado');
  eq('disrupção · cancelado e desviado ficam', [t(homeCards({ ...S.disrupcao, dis: { ...S.disrupcao.dis, mode: 'cancelled' } })), t(homeCards({ ...S.disrupcao, dis: { ...S.disrupcao.dis, mode: 'diverted' } }))], ['Cancelado', 'Desviado']);
  const vg = homeCards({ ...S.vespera, hero: { iso: D12, kind: 'training', kindLabel: 'Formação', report: '09:00', end: '17:00', station: 'LIS', hasReg: true } });
  eq('véspera de uma formação · "Formação amanhã"', t(vg), 'Formação amanhã');
  eq('a véspera sem o repouso verificado · sem "repouso acima do mínimo"', homeCards({ ...S.vespera, restOk: null }).cards[0].quiet.sub, 'PSV 8 h 35 de 11 h 45');
  eq('R1 · em inglês, o repouso na fila do PSV', homeCards({ ...S.vespera, lang: 'en' }).cards[0].quiet.sub.endsWith(' · rest above the minimum'), true);
  eq('R1 · o PSV sem "Dentro do limite" (legal por confirmar): o repouso a seguir ao intervalo', homeCards({ ...S.vespera, hero: { ...S.vespera.hero, legal: { status: 'pending' } } }).cards[0].quiet.sub, '8 h 35 de 11 h 45 · repouso acima do mínimo');
  eq('a véspera com o repouso curto · o aviso diz-o, a linha não repete', homeCards({ ...S.vespera, restOk: false }).cards[0].quiet.sub, 'PSV 8 h 35 de 11 h 45');
  const en = (h) => homeCards({ ...h, lang: 'en' }).top.pill.text;
  eq('em inglês', [en(S.antes), en(S.vespera), en({ ...S.emVoo, phase: 'duty' }), en({ ...S.emVoo, phase: 'landed' }), en(S.fecho), en(S.setup)],
    ['Flight day', 'Flight tomorrow', 'On duty', 'Landed', 'Month close', 'Welcome']);
}

// ═══ "A SEGUIR" SÓ NO MESMO DIA; NOUTRO DIA, "PRÓXIMO SERVIÇO" (B3 afinada, 2026-11-14) ═══
{
  // em voo sem pernoita, com o próximo serviço amanhã: o cabeçalho "Amanhã · quinta 12" e a linha com o report à direita
  const ev = homeCards({ ...S.emVoo, warns: [], hero: { ...S.emVoo.hero, nightStop: null } });
  eq('em voo, o próximo é amanhã · o cabeçalho e a linha', [ev.cards.map((c) => c.t), HDR(ev.cards[1]), LINEN(ev.cards[2])],
    [['card', 'hdr', 'slim'], { t: 'hdr', id: 'nextHdr', text: 'Amanhã · quinta 12' }, { t: 'slim', id: 'next', color: 'neutral', swatch: 'flight', title: 'LGW → LIS', sub: 'Londres Gatwick → Lisboa · 1 setor', value: '14:05', valueLbl: 'report' }]);
  eq('… e a regra "nunca vazio" não junta o mês (já há a linha)', ev.cards.some((c) => c.id === 'month'), false);
  // sem hora de report: a hora da partida, dita como tal
  const ed = homeCards({ ...S.emVoo, warns: [], hero: { ...S.emVoo.hero, nightStop: null }, next: { ...S.emVoo.next, report: null, dep: '15:05' } });
  eq('sem report · a partida à direita', [ed.cards[2].value, ed.cards[2].valueLbl], ['15:05', 'partida']);
  // o mesmo dia: "A seguir · hoje", o cartão grande
  const sd = homeCards({ ...S.standby, next: NEXT_IV(D11) });
  eq('o próximo é hoje · "A seguir · hoje", o cartão grande', [sd.cards[1].t, sd.cards[1].kind], ['card', 'A seguir · hoje · 2 setores']);
  // a pernoita continua a ser o que vem a seguir ao voo de hoje
  eq('com pernoita · o cartão da pernoita (como antes)', R.antes.cards[1].id, 'night');
  // a folga e o pós-voo: "Próximo serviço · amanhã"
  eq('folga com o voo amanhã · o cabeçalho "Amanhã · quinta 12" (F2)', HDR(R.folgaHoras.cards[0]), { t: 'hdr', id: 'nextHdr', text: 'Amanhã · quinta 12' });
  // em inglês
  const ee = homeCards({ ...S.emVoo, lang: 'en', warns: [], hero: { ...S.emVoo.hero, nightStop: null } });
  eq('em inglês · o cabeçalho e a linha', [ee.cards[1].text, ee.cards[2].valueLbl], ['Tomorrow · Thursday 12', 'report']);
  eq('em inglês · daqui a 3 dias', homeCards({ ...S.standby, lang: 'en' }).cards[1].text, 'Saturday 14 · in 3 days');
}

// ═══ O2 · SÓ O PRINCIPAL CHEIO (design/cores-decisoes.html O2, escolhida pelo Nuno a 2026-11-14) ═══
// O primeiro cartão de tipo (voo · terra · repouso) — o serviço de agora — fica com a cor cheia; os outros de tipo passam a neutros
// com o quadradinho da sua cor (`swatch`). Os avisos (laranja, vermelho), o neutro e o tracejado não mudam.
{
  const TYPE = ['flight', 'ground', 'rest'];
  for (const [k, r] of [...Object.entries(R), ...Object.entries(S).map(([k2, v]) => [`${k2} (en)`, homeCards({ ...v, lang: 'en' })])]) {
    const cs = r.cards || [];
    const full = cs.filter((c) => TYPE.includes(c.color));
    yes(`O2 · ${k} · no máximo um cartão de tipo cheio`, full.length <= 1, full.map((c) => c.id).join(', '));
    const sw = cs.filter((c) => c.swatch);
    yes(`O2 · ${k} · o quadradinho só em neutros e com a cor de um tipo`, sw.every((c) => c.color === 'neutral' && TYPE.includes(c.swatch)));
    const iFull = cs.findIndex((c) => TYPE.includes(c.color)), iSw = cs.findIndex((c) => c.swatch);
    yes(`O2 · ${k} · o cheio vem antes dos neutros com o quadradinho`, iSw < 0 || (iFull >= 0 && iFull < iSw));
  }
  eq('O2 · em voo: o voo cheio, a pernoita neutra com o quadradinho do repouso, o aviso laranja igual',
    R.emVoo.cards.map((c) => [c.color, c.swatch || null]), [['flight', null], ['neutral', 'rest'], ['alert', null]]);
  eq('O2 · pernoita: o repouso cheio, o voo de amanhã neutro com o quadradinho do voo',
    R.pernoita.cards.map((c) => [c.color, c.swatch || null]), [['rest', null], ['neutral', 'flight']]);
  eq('O2 · documento: o aviso não conta — o voo é o primeiro de tipo e fica cheio',
    R.documento.cards.map((c) => [c.color, c.swatch || null]), [['alert', null], ['flight', null]]);
  eq('O2 · incerto: o tracejado fica neutro e sem quadradinho; o voo fica cheio',
    R.incerto.cards.slice(0, 2).map((c) => [c.color, c.swatch || null, !!c.dashed]), [['neutral', null, true], ['flight', null, false]]);
}

// ═══ W1 · A VERIFICAÇÃO ANTES DO REPORT (design/calma-uau.html W1, escolhida pelo Nuno a 2026-11-14) ═══
// Três sinais — Voo · Avião · Aeroporto — numa linha neutra logo a seguir ao cartão do voo, só com o que os dados dizem. "Tudo a
// horas" só com os três; sem um dado, esse sinal fica "sem dados" e o título passa a "Voo a horas"; o voo atrasado não tem calma
// (é o estado Atraso); com qualquer aviso (ou o limite incerto) a linha sai; antes da janela do ao vivo diz quando começa. Como faz
// um aviso, a pernoita passa a linha fina (a regra dos dois cartões).
{
  const CALM = { seen: '03:33', flight: true, plane: { here: true, st: 'LIS' }, airport: true };
  const CK = (c) => pick(c, ['t', 'id', 'color', 'title', 'seen', 'items']);
  const ok3 = homeCards({ ...S.antes, calm: CALM });
  eq('W1 · tudo bem: o voo, os três sinais, a pernoita em linha fina', ok3.cards.map((c) => [c.id, c.t]), [['day', 'card'], ['calm', 'checks'], ['night', 'slim']]);
  eq('W1 · tudo bem: "Tudo a horas", visto às 03:33, o avião já em LIS', CK(ok3.cards[1]),
    { t: 'checks', id: 'calm', color: 'neutral', title: 'Tudo a horas', seen: 'visto 03:33', items: [{ k: 'Voo', v: 'a horas', ok: true }, { k: 'Avião', v: 'já em LIS', ok: true }, { k: 'Aeroporto', v: 'normal', ok: true }] });
  eq('W1 · o avião a caminho, a tempo: "chega 05:20"', homeCards({ ...S.antes, calm: { ...CALM, plane: { eta: '05:20' } } }).cards[1].items[1], { k: 'Avião', v: 'chega 05:20', ok: true });
  const noPlane = homeCards({ ...S.antes, calm: { ...CALM, plane: null } }).cards[1];
  eq('W1 · sem o avião: "Voo a horas" e o sinal do avião "sem dados"', [noPlane.title, noPlane.items[1]], ['Voo a horas', { k: 'Avião', v: 'sem dados', ok: false }]);
  const noApt = homeCards({ ...S.antes, calm: { ...CALM, airport: null } }).cards[1];
  eq('W1 · sem o aeroporto: "Voo a horas" e "sem dados"', [noApt.title, noApt.items[2]], ['Voo a horas', { k: 'Aeroporto', v: 'sem dados', ok: false }]);
  const late = homeCards({ ...S.antes, calm: { ...CALM, flight: false } });
  eq('W1 · o voo não está a horas: sem a linha, e a pernoita fica cartão', late.cards.map((c) => [c.id, c.t]), [['day', 'card'], ['night', 'card']]);
  eq('W1 · sem saber do voo: sem a linha', homeCards({ ...S.antes, calm: { ...CALM, flight: null } }).cards.some((c) => c.id === 'calm'), false);
  const early = homeCards({ ...S.antes, calm: { from: '02:15' } }).cards[1];
  eq('W1 · antes da janela: "O voo ao vivo às 02:15" e os três por ver', CK(early),
    { t: 'checks', id: 'calm', color: 'neutral', title: 'O voo ao vivo às 02:15', seen: null, items: [{ k: 'Voo', v: 'por ver', ok: null }, { k: 'Avião', v: 'por ver', ok: null }, { k: 'Aeroporto', v: 'por ver', ok: null }] });
  eq('W1 · com um aviso no ecrã: a linha sai', homeCards({ ...S.antes, calm: CALM, warns: [ROSTER_W] }).cards.some((c) => c.id === 'calm'), false);
  eq('W1 · com o limite incerto (o cartão tracejado por cima): a linha sai', homeCards({ ...S.incerto, calm: CALM }).cards.some((c) => c.id === 'calm'), false);
  eq('W1 · só antes do report: em voo não aparece', homeCards({ ...S.emVoo, calm: CALM }).cards.some((c) => c.id === 'calm'), false);
  eq('W1 · sem calm: como antes', homeCards(S.antes).cards.map((c) => [c.id, c.t]), [['day', 'card'], ['night', 'card']]);
  const en = homeCards({ ...S.antes, lang: 'en', calm: { ...CALM, airport: null } }).cards[1];
  eq('W1 · em inglês', [en.title, en.seen, en.items.map((i) => `${i.k}: ${i.v}`)], ['Flight on time', 'seen 03:33', ['Flight: on time', 'Aircraft: already at LIS', 'Airport: no data']]);
  eq('W1 · em inglês, os três e antes da janela', [homeCards({ ...S.antes, lang: 'en', calm: CALM }).cards[1].title, homeCards({ ...S.antes, lang: 'en', calm: { from: '02:15' } }).cards[1].title], ['All on time', 'Live flight from 02:15']);
}

// ═══ E2 · "A ESCALA MUDOU" COM O QUÊ E QUANDO (design/escala-mudou.html E2, escolhida pelo Nuno a 2026-11-14) ═══
// O aviso da escala passa a cartão âmbar com "!", uma linha por alteração (a mais próxima primeiro): o dia grande à esquerda, o que
// mudou (o campo que mais pesa: report > rota > tipo > off-block > on-block > setores), o antes riscado e o novo a cheio; "lido às" a
// hora da leitura do calendário; até 3 linhas (e "e mais N"); "Rever e aceitar · nada entra sem ti". Os dados vêm do diff
// (data/rosterDiff.js) em H.changes; sem eles, fica a linha de antes (só a contagem).
{
  const F_ = (key, pt, before, after) => ({ key, label: { pt, en: pt }, before, after });
  const CH = { seen: '11:52', items: [
    { iso: '2026-11-17', type: 'removed', kind: 'standby_home', kindLabel: 'Standby em casa', route: null, report: '08:00', end: '14:00', fields: [] },
    { iso: D13, type: 'changed', kind: 'flight', route: 'LIS-FNC-LIS', report: '06:45', end: '12:25', fields: [F_('report_time', 'Report', '05:30', '06:45'), F_('block_on', 'On-block', '11:10', '12:25')] },
    { iso: '2026-11-15', type: 'added', kind: 'flight', route: 'LIS-LGW-LIS', report: '07:00', end: null, fields: [] },
  ] };
  const CW = { id: 'roster', title: 'A escala mudou', sub: '3 alterações por rever · nada entra sem ti', open: { to: 'review' } };
  const fo = homeCards({ ...S.folga, warns: [CW, ...S.folga.warns], changes: CH });
  const card = fo.cards.find((c) => c.id === 'roster');
  eq('E2 · a folga: o aviso da escala é o cartão das alterações (no lugar da linha)', [card.t, card.color, card.mark, card.kind, card.title, card.seen],
    ['changes', 'alert', '!', 'A escala mudou', '3 alterações', 'lido às 11:52']);
  eq('E2 · as linhas pela data: sexta 13 o report (o antes e o novo), domingo 15 o serviço novo, terça 17 o cancelado', card.rows, [
    { day: '13', wd: 'sex', k: 'Report', old: '05:30', v: '06:45', sub: 'LIS → FNC → LIS · On-block 11:10 → 12:25', struck: false },
    { day: '15', wd: 'dom', k: 'Serviço novo', old: null, v: null, sub: 'LIS → LGW → LIS · report 07:00', struck: false },
    { day: '17', wd: 'ter', k: 'Cancelado', old: null, v: null, sub: 'Standby em casa · 08:00–14:00', struck: true }]);
  eq('E2 · a ação e o que abre', [card.more, card.action, card.open], [0, { label: 'Rever e aceitar', note: 'nada entra sem ti' }, { to: 'review' }]);
  eq('E2 · na folga (F2) o cartão das alterações é o principal', fo.cards.map((c) => c.id), ['roster', 'nextHdr', 'next', 'vac']);
  // mais de 3: as 3 primeiras e "e mais N"
  const many = homeCards({ ...S.folga, warns: [CW], changes: { seen: '11:52', items: [...CH.items, { iso: '2026-11-20', type: 'added', kind: 'flight', route: 'LIS-OPO', report: '09:00', fields: [] }, { iso: '2026-11-21', type: 'removed', kind: 'flight', route: 'LIS-FNC', report: '06:00', end: '10:00', fields: [] }] } }).cards.find((c) => c.id === 'roster');
  eq('E2 · com 5: o título conta as 5, mostra 3 e "e mais 2"', [many.title, many.rows.length, many.more], ['5 alterações', 3, 2]);
  // uma só; o campo que mais pesa; os dois mexeram; um campo sem rótulo conhecido
  const one = (it) => homeCards({ ...S.folga, warns: [CW], changes: { seen: null, items: [it] } }).cards.find((c) => c.id === 'roster');
  eq('E2 · 1 alteração e sem a hora da leitura', [one(CH.items[1]).title, one(CH.items[1]).seen], ['1 alteração', null]);
  eq('E2 · a rota pesa mais do que o on-block', one({ iso: D13, type: 'changed', kind: 'flight', route: 'LIS-OPO-LIS', report: '05:30', fields: [F_('block_on', 'On-block', '11:10', '10:40'), F_('route', 'Rota', 'LIS-FNC-LIS', 'LIS-OPO-LIS')] }).rows[0],
    { day: '13', wd: 'sex', k: 'Rota', old: 'LIS → FNC → LIS', v: 'LIS → OPO → LIS', sub: 'On-block 11:10 → 10:40', struck: false });
  eq('E2 · os dois mexeram: diz que escolhes na revisão', one({ ...CH.items[1], type: 'conflict' }).rows[0].sub, 'LIS → FNC → LIS · On-block 11:10 → 12:25 · também o mudaste — escolhes na revisão');
  eq('E2 · o tipo mudou: o nome do serviço', one({ iso: D13, type: 'changed', kind: 'standby_airport', route: null, report: '06:00', fields: [F_('kind', 'Tipo', 'flight', 'standby_airport')] }).rows[0],
    { day: '13', wd: 'sex', k: 'Tipo', old: 'voo', v: 'standby', sub: 'report 06:00', struck: false });
  eq('E2 · mudou uma perna (sem campo principal): "Mudou" e o que mudou', one({ iso: D13, type: 'changed', kind: 'flight', route: 'LIS-FNC-LIS', report: '05:30', fields: [F_('leg2_off', 'Perna 2 · off-block', '08:10', '08:40')] }).rows[0],
    { day: '13', wd: 'sex', k: 'Mudou', old: null, v: null, sub: 'LIS → FNC → LIS · Perna 2 · off-block 08:10 → 08:40', struck: false });
  eq('E2 · sem H.changes: a linha de antes (só a contagem)', pick(homeCards({ ...S.folga, warns: [CW] }).cards.find((c) => c.id === 'roster'), ['t', 'title', 'sub', 'mark']),
    { t: 'slim', title: 'A escala mudou', sub: '3 alterações por rever · nada entra sem ti', mark: '!' });
  const en = homeCards({ ...S.folga, lang: 'en', warns: [CW], changes: CH }).cards.find((c) => c.id === 'roster');
  eq('E2 · em inglês', [en.kind, en.title, en.seen, en.rows.map((r) => `${r.wd} ${r.day} ${r.k}`), en.action],
    ['Roster changed', '3 changes', 'read at 11:52', ['Fri 13 Report', 'Sun 15 New duty', 'Tue 17 Cancelled'], { label: 'Review and accept', note: 'nothing lands without you' }]);
}

// ═══ F2 · A FOLGA COM 1 PRINCIPAL + 2, A VOZ (V2) E A VERIFICAÇÃO DA FOLGA (W1) — design/folga-1-2.html, 2026-11-14 ═══
{
  const V = { bold: 'Folga a sério.', tail: 'Nada pendente, nada a vigiar.' };
  const WT = { roster: { seen: '11:52' }, docs: true, month: true };
  const f = homeCards({ ...S.folga, voice: V, watch: WT });
  eq('F2 · a calma em cima: a voz, os três sinais, o próximo serviço, as férias', f.cards.map((c) => [c.t, c.id]), [['voice', 'voice'], ['checks', 'watch'], ['hdr', 'nextHdr'], ['slim', 'next'], ['slim', 'vac']]);
  eq('F2 · a voz', pick(f.cards[0], ['t', 'bold', 'tail', 'open']), { t: 'voice', bold: 'Folga a sério.', tail: 'Nada pendente, nada a vigiar.', open: null });
  eq('F2 · os três sinais da folga (sem caixa, por baixo da voz)', pick(f.cards[1], ['t', 'id', 'color', 'plain', 'title', 'seen', 'items']),
    { t: 'checks', id: 'watch', color: 'neutral', plain: true, title: null, seen: null, items: [{ k: 'Escala', v: 'lida às 11:52', ok: true }, { k: 'Validades', v: 'em dia', ok: true }, { k: 'O mês', v: 'nada por confirmar', ok: true }] });
  eq('F2 · a escala em dia sem a hora da leitura: "em dia"', homeCards({ ...S.folga, voice: V, watch: { ...WT, roster: { seen: null } } }).cards[1].items[0], { k: 'Escala', v: 'em dia', ok: true });
  eq('F2 · sem os dados: "sem dados" e "nenhuma registada"', homeCards({ ...S.folga, voice: V, watch: { roster: null, docs: null, month: null } }).cards[1].items,
    [{ k: 'Escala', v: 'sem dados', ok: false }, { k: 'Validades', v: 'nenhuma registada', ok: false }, { k: 'O mês', v: 'sem dados', ok: false }]);
  eq('F2 · sem H.watch: só a voz por cima', homeCards({ ...S.folga, voice: V }).cards.map((c) => c.id), ['voice', 'nextHdr', 'next', 'vac']);
  eq('F2 · sem as férias (de janeiro a outubro): entra o mês', homeCards({ ...S.folga, warns: [], voice: V, watch: WT }).cards.map((c) => c.id), ['voice', 'watch', 'nextHdr', 'next', 'month']);
  const ROSTER = { id: 'roster', title: 'A escala mudou', sub: '3 alterações por rever', open: { to: 'review' } };
  eq('F2 · a escala mudou: o aviso é o principal; a voz e a calma calam-se', homeCards({ ...S.folga, warns: [ROSTER, ...S.folga.warns], voice: V, watch: WT }).cards.map((c) => c.id), ['roster', 'nextHdr', 'next', 'vac']);
  eq('F2 · dois avisos: o 2.º no lugar das férias', homeCards({ ...S.folga, warns: [ROSTER, { id: 'audit', title: 'Auditoria do mês', sub: '2 itens por confirmar', open: { to: 'audit' } }], voice: V, watch: WT }).cards.map((c) => c.id), ['roster', 'nextHdr', 'next', 'audit']);
  eq('F2 · a voz que leva a algum lado (o marco → os Números)', homeCards({ ...S.folga, voice: { bold: '500 horas este ano.', tail: 'E o ano ainda não acabou.', to: 'numeros' }, watch: WT }).cards[0].open, { to: 'stats' });
  eq('F2 · em inglês', homeCards({ ...S.folga, lang: 'en', voice: V, watch: { roster: { seen: '11:52' }, docs: null, month: true } }).cards[1].items.map((i) => `${i.k}: ${i.v}`),
    ['Roster: read at 11:52', 'Documents: none saved', 'Month: nothing to confirm']);
  eq('F2 · os avisos que pedem ação passam à frente das férias (só cabem 2)', homeCards({ ...S.folga, warns: [...S.folga.warns, ROSTER, { id: 'audit', title: 'Auditoria do mês', sub: '2 itens por confirmar', open: { to: 'audit' } }], voice: V, watch: WT }).cards.map((c) => c.id), ['roster', 'nextHdr', 'next', 'audit']);
  eq('V2 · nas férias, a voz por cima', homeCards({ ...S.ferias, voice: { bold: 'Férias a sério.', tail: 'A escala não manda — desfruta.' } }).cards.map((c) => c.t), ['voice', 'card', 'slim']);
  eq('V2 · nas férias com um aviso, a voz cala-se', homeCards({ ...S.ferias, warns: [ROSTER], voice: V }).cards.some((c) => c.t === 'voice'), false);
  eq('V2 · na baixa, a voz por cima', homeCards({ ...S.baixa, voice: { bold: 'Cuida de ti.', tail: 'A escala pode esperar — as melhoras.' } }).cards.map((c) => c.t), ['voice', 'text', 'slim']);
  eq('V2 · num dia de voo, nunca', homeCards({ ...S.antes, voice: V }).cards.some((c) => c.t === 'voice'), false);
  eq('V2 · na folga sem serviços, não', homeCards({ ...S.vazia, voice: V }).cards.some((c) => c.t === 'voice'), false);
}

// ═══ Q3 · O PORQUÊ DOS NÚMEROS DO TOPO (design/topo-porque-2.html Q3, escolhida pelo Nuno a 2026-11-14 — antes a P2) ═══
// Tocar num número sublinhado abre a folha da Prova a começar pela conta desenhada: `title` (o título da folha) e `calc` (a soma
// de cima a baixo, ou a barra do limite). `text` fica para o leitor de ecrã.
// Cada número do topo com conta e lei leva o seu porquê — numa saída à parte (`why`), alinhada com os factos, para o topo não mudar:
// a conta numa linha (com os números do próprio serviço, as partes a cheio) e a chave da Prova (data/prova.js). Os sem conta nem lei
// (a contagem, o tempo, o dia) ficam a null; o PSV incerto também (o cartão tracejado já diz o porquê).
{
  // `value`: o que a folha da Prova mostra em "Neste serviço" (o valor dessa lei: no PSV máximo, o máximo — não a hora do topo)
  const W_PSV = { text: '17:00 = report 05:15 + 11 h 45 de máximo · 3 setores', strong: ['17:00', '11 h 45'], law: 'ORO.FTL.205(b)', prova: 'psvMax', value: '11 h 45',
    title: 'PSV até às 17:00', calc: { sum: [{ k: 'Report', v: '05:15' }, { k: '+ Máximo · 3 setores', v: '11 h 45' }], total: { k: '= PSV até', v: '17:00' } } };
  eq('P2 · antes do report: o "PSV até" tem a conta e a lei; a contagem não', R.antes.why, { facts: [null, W_PSV], giant: null });
  eq('P2 · o mesmo com o tempo no topo (3 factos)', homeCards({ ...S.antes, wx: { report: { c: 4, label: 'nevoeiro', ic: 'fog', at: '05:15', st: 'LIS' } } }).why.facts, [null, W_PSV, null]);
  eq('P2 · o PSV incerto não leva conta (o cartão tracejado diz o porquê)', R.incerto.why, null);
  eq('P2 · a véspera: o mesmo "PSV até"', R.vespera.why, { facts: [null, W_PSV], giant: null });
  eq('P2 · em voo: a margem — o máximo menos o PSV previsto', R.emVoo.why, { facts: [null, { text: '3 h 10 = 11 h 45 de máximo − 8 h 35 do PSV previsto', strong: ['3 h 10', '11 h 45'], law: 'ORO.FTL.205(b)', prova: 'psvMax', value: '11 h 45',
    title: 'Margem no PSV', calc: { sum: [{ k: 'Máximo', v: '11 h 45' }, { k: '− PSV previsto', v: '8 h 35' }], total: { k: '= Margem', v: '3 h 10' } } }], giant: null });
  const W_WEEK = { text: '31 h de serviço em 7 dias seguidos · o limite é 60 h — ficam 29 h', strong: ['31 h', '60 h'], law: 'ORO.FTL.210(a)(1)', prova: 'limites', value: '31 h de 60 h',
    title: 'Serviço em 7 dias', calc: { bar: { v: '31 h', of: 'de 60 h', pct: 52, left: 'ficam 29 h', over: false } } };
  eq('P2 · a folga: as horas de 7 dias (sem as datas do período, como antes)', R.folga.why, { facts: [null, W_WEEK], giant: null });
  // com as datas do período escolhido pelo motor (computeDutyTime: from/to) — a conta diz quais são os 7 dias
  const wd = homeCards({ ...S.folga, week: { done: 31, limit: 60, from: '2026-11-05', to: '2026-11-11' } }).why.facts[1];
  eq('Q3 · as horas de 7 dias com as datas (o mesmo mês)', [wd.text, wd.calc.bar.when], ['31 h de serviço de 5 a 11 nov · o limite é 60 h — ficam 29 h', 'de 5 a 11 nov']);
  const wx = homeCards({ ...S.folga, week: { done: 31, limit: 60, from: '2026-10-29', to: '2026-11-04' } }).why.facts[1];
  eq('Q3 · as horas de 7 dias com as datas (dois meses)', wx.text, '31 h de serviço de 29 out a 4 nov · o limite é 60 h — ficam 29 h');
  eq('Q3 · em inglês, com as datas', homeCards({ ...S.folga, lang: 'en', week: { done: 31, limit: 60, from: '2026-11-05', to: '2026-11-11' } }).why.facts[1].text, '31 h of duty 5–11 Nov · the limit is 60 h — 29 h left');
  // O fim do PSV é o que o motor usa (ORO.FTL.105(12): o último setor em funções — um posicionamento no fim já não conta); quando o PSV
  // não é só "fim − report", a conta ganha a linha que explica a diferença (começou antes; o acerto do tempo decorrido).
  const pv = homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, from: '05:15', to: '13:50' } });
  eq('Q3 · o dia fechado: o número grande — do report aos calços do último setor em funções; as horas de 7 dias', pv.why,
    { facts: [null, W_WEEK], giant: { text: '8 h 35 = do report às 05:15 aos calços às 13:50 do último setor em funções', strong: ['8 h 35'], law: 'ORO.FTL.105(12)', prova: 'psvDef', value: '8 h 35',
      title: 'PSV de hoje', calc: { sum: [{ k: 'Report', v: '05:15' }, { k: 'Calços do último setor em funções', v: '13:50' }], total: { k: '= PSV de hoje', v: '8 h 35' } } } });
  const pvE = homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, fdp: '09:05', from: '05:15', to: '13:50', early: 30 } }).why.giant;
  eq('Q3 · o PSV começou antes do report (2.ª notificação de um adiamento): a linha a mais', [pvE.calc.sum, pvE.calc.total, pvE.text],
    [[{ k: 'Report', v: '05:15' }, { k: 'Calços do último setor em funções', v: '13:50' }, { k: '+ Começou antes do report (2.ª notificação)', v: '30 min' }], { k: '= PSV de hoje', v: '9 h 05' },
      '9 h 05 = do report às 05:15 aos calços às 13:50 do último setor em funções · começou 30 min antes do report']);
  const pvA = homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, fdp: '09:35', from: '05:15', to: '13:50', adj: 60 } }).why.giant;
  eq('Q3 · o acerto do tempo decorrido (hora de verão, fusos): a linha a mais', [pvA.calc.sum[2], pvA.calc.total.v], [{ k: '+ Acerto do tempo decorrido (hora de verão ou fusos)', v: '1 h' }, '9 h 35']);
  const pvM = homeCards({ ...S.posvoo, closed: { ...S.posvoo.closed, fdp: '07:35', from: '05:15', to: '13:50', adj: -60 } }).why.giant;
  eq('Q3 · o acerto para menos', pvM.calc.sum[2], { k: '− Acerto do tempo decorrido (hora de verão ou fusos)', v: '1 h' });
  eq('P2 · o dia fechado sem as horas do report e dos calços: o número grande sem conta', R.posvoo.why.giant, null);
  const over = homeCards({ ...S.folga, week: { done: 63, limit: 60 } }).why.facts[1];
  eq('P2 · acima do limite das 60 h: "passa" (a barra cheia)', [over.text, over.calc.bar], ['63 h de serviço em 7 dias seguidos · o limite é 60 h — passa 3 h', { v: '63 h', of: 'de 60 h', pct: 100, left: 'passa 3 h', over: true }]);
  eq('P2 · sem números com conta: why null', [R.standby.why, R.formacao.why, R.ferias.why], [null, null, null]);
  eq('P2 · em inglês', homeCards({ ...S.antes, lang: 'en' }).why.facts[1].text, '17:00 = report 05:15 + 11 h 45 maximum · 3 sectors');
}

// ═══ EM INGLÊS — os mesmos estados, nada indefinido ═══
for (const [k, v] of Object.entries(S)) {
  const r = homeCards({ ...v, lang: 'en' });
  yes(`en · ${k} · nada indefinido`, !/undefined|NaN|\[object/.test(JSON.stringify(r)));
}

console.log(`homecards: ${ok} ok, ${fail} falhou · o topo das três abas: ${commonGiant(350)} a 390, ${commonGiant(335)} a 375 (${sizes.length} casos)`);
module.exports = { S };   // os dados de teste dos 16 estados (o desenho feito a partir do código usa-os)
if (require.main === module) process.exit(fail ? 1 : 0);
