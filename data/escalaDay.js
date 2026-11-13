// A ESCALA 3.0 "cartões de cor" — o que cada célula do mês e a folha do dia mostram (esboço aprovado
// design/escala-cartoes.html, 2026-11-13; peças B1–B4 do design-system §14). Função PURA (golden `npm run test:escala`).
// NENHUM NÚMERO NASCE AQUI: as durações vêm do motor (data/zulu.js · serviceRealMin, que acerta os fusos), o dinheiro vem
// do ecrã (data/perdiem.js · serviceMoney, o mesmo caminho dos Números), os intervalos entre serviços vêm do registo do dia
// (ftl/index.js · `between`) e a WOCL é a do motor (ftl/constants/tables.js). Aqui só se decide o que vai para onde e como
// se escreve:
//   · B1 a célula: a cor do tipo (areia voo · lilás serviço em terra · neutro férias e baixa), a etiqueta (o destino ou o
//     código), a lua da pernoita, a 2.ª camada dos dois serviços, o ponto da alteração por rever; e o BLOCO: a rotação com
//     pernoita fora e as férias seguidas juntam-se (o bloco parte-se no fim da semana e do mês). A folga é só o número.
//   · a ordem do dia é a da HORA (report; sem ele, a 1.ª partida), não a ordem em que os serviços foram guardados (acerto 9).
//   · a linha entre dois serviços só aparece quando o intervalo do motor se atribui ao par CERTO: todos os serviços com hora
//     de report e um intervalo por par (o motor ordena-os pelo report e filtra alguns). Senão não aparece nada — nunca um
//     "repouso ✓" de recurso (acerto 9: a folha inventava um repouso entre uma assistência e o voo chamado).
//   · B3 a régua das 24 h: os serviços na cor do tipo, no relógio do REPORT (o fim = report + a duração real do motor, por
//     isso um LIS → BCN não fica com uma hora a mais); o resto de um serviço que passou a meia-noite abre a régua do dia
//     seguinte; o repouso fora da base a salva (depois do serviço numa pernoita e, no dia seguinte, até ao report); a faixa
//     da WOCL só quando um voo que COMEÇA NA BASE lhe toca (aí o fuso de aclimatação é o da base — numa companhia de curto
//     curso a diferença fica na faixa de 2 h do Quadro 1 do CS FTL.1.105); o "agora" só no dia de hoje.
//   · o dia DOBRADO (com o mês inteiro à vista): uma linha fina por serviço; ABERTO (na semana): os cartões inteiros, com as
//     pernas (B2: as duas horas grandes, o código e a cidade por baixo, a duração real no selo, o tempo no solo entre pernas).
import { serviceRealMin, legsZulu } from './zulu';
import { WOCL } from '../ftl/constants/tables';

export const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
export const fmtHm = (min) => { if (min == null) return null; const x = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
// O que dura e o que falta: "50 min" · "4 h" · "6 h 30" · "1 h 05" (design-system §14).
export const fmtDur = (min) => {
  if (min == null || !Number.isFinite(min) || min < 0) return null;
  const t = Math.round(min), h = Math.floor(t / 60), m = t % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};
const valid = (d) => !!(d && !d.deleted);
const isFlightSvc = (svc) => (svc && (svc.kind || 'flight')) === 'flight';
const legsOf = (svc) => (isFlightSvc(svc) && Array.isArray(svc.legs) ? svc.legs.filter(Boolean) : []);
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// A etiqueta curta da célula: voo → a estação fora da base (LGW); o resto → a sigla do tipo.
export const dutyCode = (d, base) => {
  const k = d.kind || 'flight';
  if (k === 'flight') {
    const aps = String(d.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
    const b = String(base || '').toUpperCase();
    return aps.find((a) => a !== b) || aps[aps.length - 1] || aps[0] || '✈';
  }
  return (k === 'standby_airport' || k === 'standby_home') ? 'SBY' : k === 'positioning' ? 'POS' : k === 'office' ? 'OFC' : k === 'training' ? 'FRM' : k === 'reserve' ? 'RES' : '•';
};
const hasNightStop = (d) => !!(valid(d) && (d.nightStop || (Array.isArray(d.extra) && d.extra.some((x) => x && x.nightStop))));

// A rota para ler: "LIS-OPO" → "LIS → OPO" (o calendário escreve-a com hífenes).
export const prettyRoute = (route) => {
  const aps = String(route || '').split(/\s*(?:-|–|—|→|>|\/)\s*/).map((x) => x.trim()).filter(Boolean);
  return aps.length ? aps.join(' → ') : null;
};
const WD_SHORT = { pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const WD_LONG = { pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
const wdIdx = (iso) => new Date(`${iso}T00:00:00`).getDay();

// ── A ESCALA EM AGENDA (A2 em acordeão + os dias passados em D; esboços design/escala-agenda.html e escala-passado.html,
// escolhidos pelo Nuno a 2026-11-13) ──
// Uma linha por dia do mês, pela ordem: os dias com serviço (ou férias/baixa) numa BARRA; os dias vazios seguidos numa só
// linha. Um dia vazio só se chama "Folga" quando há serviço antes E depois dele na escala; senão "Sem serviços na escala" — no
// fim do que o calendário trouxe, a app não sabe se é folga (nunca se inventa). Hoje fica sempre numa linha própria.
// Cabeçalhos: no mês corrente "Já feito" · "Hoje · sexta 13" · "A seguir"; num mês passado "Já feito"; num mês futuro, nenhum.
// money(iso) → o € do dia (do ecrã, serviceMoney) ou null; nos dias passados vai à direita em vez da hora.
export function agendaRows({ ym, duties = {}, absences = {}, today = null, money = () => null, kindLabel = (k) => k, fmtEur = (n) => String(n), lang = 'pt' }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [y, m] = String(ym).split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const isoOf = (d) => `${ym}-${String(d).padStart(2, '0')}`;
  const dutyDays = Object.keys(duties).filter((k) => valid(duties[k])).sort();
  const hasBefore = (iso) => dutyDays.some((k) => k < iso);
  const hasAfter = (iso) => dutyDays.some((k) => k > iso);
  const short = WD_SHORT[lang] || WD_SHORT.pt, long = WD_LONG[lang] || WD_LONG.pt;
  const items = [];
  let run = null;
  const flush = () => {
    if (!run) return;
    const folga = hasBefore(run.from) && hasAfter(run.to);
    items.push({ t: 'off', from: run.from, to: run.to, n: run.n, dFrom: Number(run.from.slice(8)), dTo: Number(run.to.slice(8)),
      label: folga ? l('Folga', 'Day off') : l('Sem serviços na escala', 'No duties in the roster'), folga,
      past: !!today && run.to < today, today: run.from === today, wd: short[wdIdx(run.from)] });
    run = null;
  };
  for (let d = 1; d <= dim; d++) {
    const iso = isoOf(d);
    const duty = valid(duties[iso]) ? duties[iso] : null;
    const abs = !duty ? (absences[iso] || null) : null;
    if (!duty && !abs) {
      if (iso === today) { flush(); run = { from: iso, to: iso, n: 1 }; flush(); continue; }
      if (run && run.to !== isoOf(d - 1)) flush();
      if (!run) run = { from: iso, to: iso, n: 0 };
      run.to = iso; run.n++;
      continue;
    }
    flush();
    const base = { t: 'bar', iso, day: d, wd: short[wdIdx(iso)], past: !!today && iso < today, today: iso === today };
    if (abs) {
      items.push({ ...base, kind: abs === 'sickDays' ? 'doe' : 'fer', title: abs === 'sickDays' ? l('Baixa', 'Sick leave') : l('Férias', 'Leave'), ns: false, two: false, right: null });
      continue;
    }
    const ord = orderServices(duty);
    const main = (ord.find((o) => isFlightSvc(o.svc)) || ord[0]).svc;
    const flight = isFlightSvc(main);
    const t = svcTimes(iso, main, 0);
    const time = flight
      ? (main.report_time ? `report ${main.report_time}` : (legsOf(main)[0] && legsOf(main)[0].off) || null)
      : (t.start != null ? `${fmtHm(t.start)}–${t.end != null ? fmtHm(t.end) : '—'}` : null);
    const eur = base.past ? money(iso) : null;
    // 1B (escolha do Nuno, design/escala-acertos.html): um dia com mais de um serviço diz o outro por escrito, numa 2.ª linha
    // ("e Standby Casa · 09:00–15:00"; com três ou mais, "· e mais 1") — sem símbolo para aprender.
    const others = ord.filter((o) => o.svc !== main);
    let also = null;
    if (others.length) {
      const o0 = others[0].svc, t0 = svcTimes(iso, o0, 0);
      const name0 = (o0.route ? prettyRoute(o0.route) : null) || kindLabel(o0.kind || 'flight');
      const when0 = isFlightSvc(o0) ? (o0.report_time ? `report ${o0.report_time}` : null) : (t0.start != null ? `${fmtHm(t0.start)}–${t0.end != null ? fmtHm(t0.end) : '—'}` : null);
      also = [l(`e ${name0}`, `and ${name0}`), when0, others.length > 1 ? l(`e mais ${others.length - 1}`, `and ${others.length - 1} more`) : null].filter(Boolean).join(' · ');
    }
    items.push({ ...base, kind: ord.some((o) => isFlightSvc(o.svc)) ? 'voo' : 'terra',
      title: (flight ? prettyRoute(main.route) : (main.route ? prettyRoute(main.route) : null)) || kindLabel(main.kind || 'flight'),
      ns: hasNightStop(duty), two: ord.length > 1, also, right: eur ? { gain: `+${fmtEur(eur)}` } : (time ? { time } : null) });
  }
  flush();
  // os cabeçalhos
  const out = [];
  const curYm = today ? today.slice(0, 7) : null;
  const firstIso = (it) => (it.t === 'off' ? it.from : it.iso);
  if (curYm && ym < curYm) out.push({ t: 'head', id: 'past', text: l('Já feito', 'Done') });
  let saidPast = false, saidNext = false;
  items.forEach((it) => {
    if (curYm === ym) {
      const iso = firstIso(it);
      if (iso < today && !saidPast) { out.push({ t: 'head', id: 'past', text: l('Já feito', 'Done') }); saidPast = true; }
      if (iso === today) out.push({ t: 'head', id: 'today', text: l(`Hoje · ${long[wdIdx(today)]} ${Number(today.slice(8))}`, `Today · ${long[wdIdx(today)]} ${Number(today.slice(8))}`) });
      if (iso > today && !saidNext) { out.push({ t: 'head', id: 'next', text: l('A seguir', 'Coming up') }); saidNext = true; }
    }
    out.push(it);
  });
  return out;
}

// O ano em meses (A1, 3439): quantos dias com serviço tem cada mês; o mês em que se está; os meses sem escala.
export function yearMonths({ year, duties = {}, today = null, lang = 'pt' }) {
  const names = lang === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return names.map((label, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
    const count = Object.keys(duties).filter((k) => k.startsWith(ym) && valid(duties[k])).length;
    return { m: i + 1, ym, label, count, current: !!today && today.startsWith(ym), empty: count === 0 };
  });
}

// ── B1 · as células do mês (desenho A de design/escala-mes.html, escolhido a 2026-11-13: número limpo + etiqueta) ──
// absences: { iso: 'vacDays' | 'sickDays' } (o 1.º evento de ausência do dia). base(ym) → código da base nesse mês.
// O VOO MANDA, como na Lista (1B): num dia com assistência e voo, a célula é do voo (cor, destino) e twoKind diz o tipo do
// outro serviço (a ponta da etiqueta). past = antes de hoje (a etiqueta fica neutra com o ponto da cor, como a Lista D).
export function monthCells({ ym, duties = {}, absences = {}, base, today = null, sel = null, lang = 'pt' }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [y, m] = String(ym).split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const firstWeekday = ((new Date(y, m - 1, 1).getDay()) + 6) % 7;
  const b = typeof base === 'function' ? base(ym) : base;
  const cells = [];
  for (let day = 1; day <= dim; day++) {
    const iso = `${ym}-${String(day).padStart(2, '0')}`;
    const d = valid(duties[iso]) ? duties[iso] : null;
    const abs = !d ? (absences[iso] || null) : null;
    const svcs = d ? orderServices(d).map((o) => o.svc) : [];
    const main = svcs.find(isFlightSvc) || svcs[0] || null;
    const other = main ? svcs.find((x) => x !== main) || null : null;
    const kind = main ? (isFlightSvc(main) ? 'voo' : 'terra') : abs ? (abs === 'sickDays' ? 'doe' : 'fer') : null;
    const code = main ? dutyCode(main, b) : abs ? (abs === 'sickDays' ? l('DOE', 'SCK') : l('FÉR', 'LVE')) : null;
    const col = (firstWeekday + day - 1) % 7;
    cells.push({ iso, day, col, row: Math.floor((firstWeekday + day - 1) / 7), kind, code,
      ns: hasNightStop(d), two: !!other, twoKind: other ? (isFlightSvc(other) ? 'voo' : 'terra') : null, dirty: !!(d && d.dirty),
      today: iso === today, sel: iso === sel, past: !!today && iso < today, joinR: false, joinL: false });
  }
  // O bloco: a rotação (pernoita fora e serviço no dia seguinte) e as férias seguidas, dentro da mesma semana e do mês.
  for (let i = 0; i < cells.length - 1; i++) {
    const c = cells[i], n = cells[i + 1];
    if (c.col === 6) continue;
    if ((c.kind === 'fer' && n.kind === 'fer') || (c.ns && (n.kind === 'voo' || n.kind === 'terra'))) { c.joinR = true; n.joinL = true; }
  }
  return { firstWeekday, nRows: Math.ceil((firstWeekday + dim) / 7), dim, cells };
}

// ── L2 · a legenda que filtra (escolhida a 2026-11-13): só as pílulas do que há neste mês; tocar numa acende esses dias ──
const LEGEND_KEYS = [['voo', 'Voo', 'Flight'], ['terra', 'Terra', 'Ground'], ['fer', 'Férias', 'Leave'], ['doe', 'Baixa', 'Sick'],
  ['ns', 'Pernoita', 'Night stop'], ['two', '2 serviços', '2 duties'], ['dirty', 'Por sincronizar', 'Pending sync']];
export const cellMatches = (c, key) => {
  if (!c) return false;
  if (key === 'voo' || key === 'terra') return c.kind === key || c.twoKind === key;
  if (key === 'fer' || key === 'doe') return c.kind === key;
  if (key === 'ns') return !!c.ns;
  if (key === 'two') return !!c.two;
  if (key === 'dirty') return !!c.dirty;
  return false;
};
export function monthLegend(cells = [], lang = 'pt') {
  return LEGEND_KEYS.filter(([key]) => cells.some((c) => cellMatches(c, key))).map(([key, pt, en]) => ({ key, label: lang === 'en' ? en : pt }));
}

// ── A LEGENDA J3 (design/escala-legenda-3.html, escolhida pelo Nuno a 2026-11-13): na 1.ª vez a GUIADA, depois a PEQUENA ──
// A guiada: um balão por sinal que EXISTA no mês, apontado a um dia que ainda vem (nunca hoje, que tem o seu balão no fim);
// pela ordem voo · terra · 2 ou mais · pernoita · por sincronizar · férias e baixa · feito, no máximo 5 sinais; no fim, "toca num
// dia" sobre hoje (sem hoje no mês: o 1.º dia com serviço que vem). Sem nenhum sinal no mês, não há guiada.
export function legendTour(cells = [], lang = 'pt') {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const pick = (pred) => cells.find((c) => pred(c) && !c.past && !c.today) || cells.find((c) => pred(c) && !c.today) || null;
  const SIGNS = [
    ['voo', (c) => c.kind === 'voo' && !c.two, l('Um anel azul é um dia de voo. Por baixo, o destino.', 'A blue ring is a flight day. Below it, the destination.')],
    ['terra', (c) => c.kind === 'terra' && !c.two, l('O anel lilás é um serviço em terra: assistência, formação, escritório.', 'A lilac ring is a ground duty: standby, training, office.')],
    ['two', (c) => c.two, l('Fatias: um dia com mais de um serviço — uma fatia por serviço, pela hora.', 'Slices: a day with more than one duty — one slice per duty, in time order.')],
    ['ns', (c) => c.ns, l('A lua ao lado do destino: dormes fora da base.', 'The moon next to the destination: you sleep away from base.')],
    ['dirty', (c) => c.dirty, l('O ponto laranja: a escala mudou no calendário e falta rever.', 'The orange dot: the roster changed in the calendar and needs a review.')],
    ['abs', (c) => c.kind === 'fer' || c.kind === 'doe', l('Tracejado: férias (FÉR) ou baixa (DOE).', 'Dashed: leave (LVE) or sick leave (SCK).')],
    ['past', (c) => c.past && !!c.kind, l('A cinzento: os dias que já passaram.', 'Grey: the days already done.')],
  ];
  const steps = [];
  for (const [key, pred, text] of SIGNS) {
    if (steps.length >= 5) break;
    const c = pick(pred);
    if (c) steps.push({ key, iso: c.iso, text });
  }
  if (!steps.length) return [];
  const t = cells.find((c) => c.today) || cells.find((c) => c.kind && !c.past) || cells.find((c) => c.kind);
  const tapTxt = l('Toca num dia para ver os serviços dele; tocar num serviço abre tudo o que é dele.', 'Tap a day to see its duties; tap a duty to open everything about it.');
  if (t) steps.push({ key: 'tap', iso: t.iso, text: t.today ? `${l('A tinta: hoje.', 'Ink: today.')} ${tapTxt}` : tapTxt });
  return steps;
}

// A pequena: os quatro grupos com TODOS os sinais (os que não há no mês ficam a 0 — o Nuno: "mete todas as legendas que
// existem"); os três primeiros contam e acendem os dias (cellMatches); "Os dias" só explicam (count null).
const LEGEND_GROUPS = [
  [['Serviços', 'Duties'], [['voo', 'Voo', 'Flight'], ['terra', 'Terra', 'Ground'], ['two', '2 ou mais', '2 or more']]],
  [['Ausências', 'Absences'], [['fer', 'Férias', 'Leave'], ['doe', 'Baixa', 'Sick']]],
  [['No dia', 'On the day'], [['ns', 'Pernoita', 'Night stop'], ['dirty', 'Por sincronizar', 'Pending sync']]],
  [['Os dias', 'The days'], [['today', 'Hoje', 'Today'], ['past', 'Feito', 'Done'], ['sel', 'Escolhido', 'Selected'], ['free', 'Folga', 'Day off']]],
];
export function legendGroups(cells = [], lang = 'pt') {
  const en = lang === 'en';
  return LEGEND_GROUPS.map(([t, items], gi) => ({
    title: en ? t[1] : t[0],
    items: items.map(([key, pt, enL]) => ({ key, label: en ? enL : pt, count: gi === 3 ? null : cells.filter((c) => cellMatches(c, key)).length })),
  }));
}

// ── a ordem do dia: pela HORA ──
const startKey = (svc) => {
  const r = clkMin(svc && svc.report_time); if (r != null) return r;
  const lg = legsOf(svc)[0]; const o = lg ? clkMin(lg.off) : null; if (o != null) return o;
  return Infinity;
};
export function orderServices(duty) {
  if (!valid(duty)) return [];
  const list = [duty, ...(Array.isArray(duty.extra) ? duty.extra : [])].map((svc, idx) => ({ svc, idx })).filter((o) => o.svc);
  return list.map((o, k) => ({ ...o, k, key: startKey(o.svc) })).sort((a, b) => (a.key - b.key) || (a.k - b.k)).map(({ svc, idx }) => ({ svc, idx }));
}

// O intervalo do motor para cada par seguido (ordered[i] → ordered[i+1]), ou null quando não se atribui com certeza.
export function attributeBetween(ordered, between) {
  const n = Math.max(0, (ordered || []).length - 1);
  const none = Array.from({ length: n }, () => null);
  if (!n || !Array.isArray(between)) return none;
  if (!ordered.every((o) => clkMin(o.svc.report_time) != null)) return none;
  if (between.length !== n) return none;
  return between.map((g) => (g && g.gapMin != null ? g : null));
}

// ── as horas de um serviço, no relógio do report ──
// start · end (minutos desde a meia-noite do dia; end pode passar de 1440) · legMin (a duração real de cada perna).
export function svcTimes(iso, svc, postFlightMin = 0) {
  const legs = legsOf(svc), rep = clkMin(svc && svc.report_time);
  const off0 = legs[0] ? clkMin(legs[0].off) : null;
  const start = rep != null ? rep : off0;
  if (start == null) return { start: null, end: null, legMin: legs.map(() => null) };
  if (legs.length) {
    const r = serviceRealMin(iso, legs, rep != null ? svc.report_time : legs[0].off);
    const lastOn = clkMin(legs[legs.length - 1].on);
    let fdp = r.fdpMin;
    if (fdp == null && lastOn != null) fdp = (((lastOn - start) % 1440) + 1440) % 1440;
    if (fdp == null) return { start, end: null, legMin: r.legMin };
    let end = start + fdp + (r.tailMin || 0) + (postFlightMin || 0);
    // O sign-off registado (no relógio de chegada) manda sobre o débrief estimado: passa-se ao relógio do report pelo desvio
    // entre a chegada no relógio local e a chegada no relógio do report.
    const so = clkMin(svc.signOff);
    if (so != null && lastOn != null) {
      let shift = lastOn - (start + fdp + (r.tailMin || 0)); while (shift > 720) shift -= 1440; while (shift < -720) shift += 1440;
      let soR = so - shift; while (soR < start) soR += 1440;
      if (soR - start <= 1440) end = soR;
    }
    return { start, end, legMin: r.legMin };
  }
  const e = clkMin(svc.signOff) != null ? clkMin(svc.signOff) : clkMin(svc.block_on);
  return { start, end: e == null ? null : (e > start ? e : e + 1440), legMin: [] };
}

// ── B3 · a régua das 24 h ──
// ordered/prevOrdered: os serviços do dia e da véspera (pela hora). ns/prevNs: há pernoita fora no dia / na véspera.
export function dayRuler({ iso, ordered = [], prevOrdered = [], ns = false, prevNs = false, base = null, postFlightMin = 0, nowMin = null, lang = 'pt', locale = 'pt-PT' }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const prevIso = addDays(iso, -1);
  const blocks = [];
  const colorOf = (svc) => (isFlightSvc(svc) ? 'flight' : 'ground');
  const T = ordered.map((o) => ({ o, ...svcTimes(iso, o.svc, postFlightMin) }));
  const P = prevOrdered.map((o) => ({ o, ...svcTimes(prevIso, o.svc, postFlightMin) }));
  // o resto da véspera que passou a meia-noite
  let carry = 0;
  P.forEach((t) => { if (t.end != null && t.end > 1440) { const b = Math.min(1440, t.end - 1440); blocks.push({ a: 0, b, color: colorOf(t.o.svc), fromStart: true }); carry = Math.max(carry, b); } });
  const timed = T.filter((t) => t.start != null);
  // o repouso fora da base que vem da véspera, até ao 1.º report
  if (prevNs && timed.length && timed[0].start > carry) blocks.push({ a: carry, b: timed[0].start, color: 'rest', fromStart: carry === 0 });
  timed.forEach((t) => {
    const b = t.end == null ? Math.min(1440, t.start + 30) : Math.min(1440, t.end);
    if (b > t.start) blocks.push({ a: t.start, b, color: colorOf(t.o.svc), toEnd: t.end != null && t.end > 1440, open: t.end == null });
  });
  const ends = timed.map((t) => t.end).filter((x) => x != null);
  const lastEnd = ends.length ? Math.max(...ends) : null;
  if (ns && lastEnd != null && lastEnd < 1440) blocks.push({ a: lastEnd, b: 1440, color: 'rest', toEnd: true });
  // a WOCL: um voo que começa na base e lhe toca (no dia ou, depois da meia-noite, no dia seguinte)
  const W = [[WOCL.start, WOCL.end], [WOCL.start + 1440, WOCL.end + 1440]];
  const B = String(base || '').toUpperCase();
  const fromBase = (svc) => { const lg = legsOf(svc)[0]; return !!(lg && B && String(lg.dep || '').toUpperCase() === B); };
  let woclNote = null;
  for (const t of timed) {
    if (!isFlightSvc(t.o.svc) || !fromBase(t.o.svc) || t.end == null) continue;
    const today = W[0][0] < t.end && t.start < W[0][1];
    if (!today) continue;
    woclNote = t.start >= W[0][0] && t.start < W[0][1] ? l(`o report às ${fmtHm(t.start)} cai dentro`, `the ${fmtHm(t.start)} report falls inside it`)
      : t.end > W[0][0] && t.end <= W[0][1] ? l(`o serviço acaba às ${fmtHm(t.end)}, dentro dela`, `the duty ends at ${fmtHm(t.end)}, inside it`)
      : l('o serviço atravessa-a', 'the duty runs through it');
    break;
  }
  if (!woclNote) {
    for (const t of P) {
      if (!isFlightSvc(t.o.svc) || !fromBase(t.o.svc) || t.end == null || t.end <= 1440) continue;
      if (W[1][0] < t.end && t.start < W[1][1]) { woclNote = l('o serviço da véspera passa por ela', 'the previous day’s duty runs through it'); break; }
    }
  }
  const nextWd = new Date(`${addDays(iso, 1)}T00:00:00`).toLocaleDateString(locale, { weekday: 'long' });
  const endNote = lastEnd != null && lastEnd > 1440 ? l(`o serviço acaba às ${fmtHm(lastEnd)} de ${nextWd}`, `the duty ends at ${fmtHm(lastEnd)} on ${nextWd}`) : null;
  return {
    blocks,
    wocl: woclNote ? { a: WOCL.start, b: WOCL.end, note: l(`WOCL ${fmtHm(WOCL.start)}–${fmtHm(WOCL.end - 1)} · ${woclNote}`, `WOCL ${fmtHm(WOCL.start)}–${fmtHm(WOCL.end - 1)} · ${woclNote}`) } : null,
    endNote,
    now: nowMin != null ? Math.max(0, Math.min(1439, nowMin)) : null,
  };
}

// O texto da pílula entre dois serviços (o kind e as durações vêm do motor; a lei já está no motor).
export function betweenText(g, lang = 'pt') {
  if (!g || g.gapMin == null) return null;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const gap = fmtDur(g.gapMin), req = fmtDur(g.requiredMin);
  const place = g.place === 'away' ? l('fora', 'away') : l('na base', 'at base');
  if (g.kind === 'rest') return { strong: l(`${gap} entre os dois`, `${gap} between them`), rest: l(`repouso cumprido (mín. ${req} ${place})`, `rest met (min ${req} ${place})`) };
  if (g.kind === 'either') return { strong: l(`Incerto · ${gap} entre os dois`, `Uncertain · ${gap} between them`), rest: l(`serviço repartido ou repouso curto (mín. ${req} ${place})`, `split duty or short rest (min ${req} ${place})`) };
  if (g.kind === 'split') return { strong: l(`${gap} entre os dois`, `${gap} between them`), rest: l('um só serviço repartido (CS FTL.1.220)', 'one split duty (CS FTL.1.220)') };
  return { strong: l(`${gap} entre os dois`, `${gap} between them`), rest: l('perto de mais: é o mesmo serviço', 'too close: it is the same duty') };
}

// ── a folha do dia: linhas finas (dobrado) ou cartões inteiros (aberto) ──
// money[idx] = { total, nightStop } (o € de cada serviço, já calculado pelo ecrã) · kindLabel(kind) · cityOf(code) ·
// nightStop = { station, hotel } (do ecrã) · fmtEur. Devolve os descritores que o components/HomeCards.js desenha.
export function dayCards({ iso, ordered = [], open = false, money = [], kindLabel = (k) => k, cityOf = () => null, nightStop = null, postFlightMin = 0, lang = 'pt', locale = 'pt-PT', fmtEur = (n) => String(n) }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const nextWd = new Date(`${addDays(iso, 1)}T00:00:00`).toLocaleDateString(locale, { weekday: 'long' });
  const place = (code) => { const c = String(code || '').toUpperCase(); const city = c ? cityOf(c) : null; return c ? (city && city !== c ? `${c} · ${city}` : c) : '—'; };
  const out = [];
  ordered.forEach((o) => {
    const svc = o.svc, kind = svc.kind || 'flight', flight = kind === 'flight', legs = legsOf(svc);
    const t = svcTimes(iso, svc, postFlightMin);
    const m = money[o.idx] || null;
    const gain = m && m.total ? `+${fmtEur(m.total)}` : null;
    const title = prettyRoute(svc.route) || kindLabel(kind);
    const id = `svc${o.idx}`, openTo = { to: 'detail', idx: o.idx };
    const endTxt = t.end == null ? null : `${fmtHm(t.end)}${t.end > 1440 ? l(` de ${nextWd}`, ` on ${nextWd}`) : ''}`;
    if (!open) {
      const sub = flight
        ? [legs[0] && legs[0].flightNo, legs.length ? `${legs[0].off || '—'}–${legs[legs.length - 1].on || '—'}` : null, svc.report_time ? `report ${svc.report_time}` : null]
        : [kindLabel(kind) !== title ? kindLabel(kind) : null, t.start != null ? `${fmtHm(t.start)}–${t.end != null ? fmtHm(t.end) : '—'}` : null];
      out.push({ t: 'slim', id, color: flight ? 'flight' : 'ground', title, sub: sub.filter(Boolean).join(' · ') || null, value: gain, gain: !!gain, open: openTo });
      return;
    }
    const nLegs = legs.filter((lg) => !lg.dh).length;
    const kindTxt = flight
      ? [l('Voo', 'Flight'), nLegs ? `${nLegs} ${nLegs === 1 ? l('setor', 'sector') : l('setores', 'sectors')}` : null, svc.nightStop ? l('pernoita', 'night stop') : null].filter(Boolean).join(' · ')
      : l('Serviço em terra', 'Ground duty');
    const card = { t: 'card', id, color: flight ? 'flight' : 'ground', kind: kindTxt, title, gain, open: openTo };
    if (flight && legs.length) {
      card.sub = [svc.report_time ? `report ${svc.report_time}` : null, endTxt ? l(`fim do serviço ${endTxt}`, `duty ends ${endTxt}`) : null].filter(Boolean).join(' · ') || null;
      const Z = legsZulu(iso, legs, svc.report_time || legs[0].off || null);
      card.legs = legs.map((lg, i) => {
        const z = Z[i] || {};
        const zt = [z.off && lg.off && z.off !== lg.off ? l(`parte ${z.off}Z`, `dep ${z.off}Z`) : null, z.on && lg.on && z.on !== lg.on ? l(`chega ${z.on}Z`, `arr ${z.on}Z`) : null].filter(Boolean).join(' · ');
        const nx = legs[i + 1], on = clkMin(lg.on), off2 = nx ? clkMin(nx.off) : null;
        const ground = on != null && off2 != null ? (((off2 - on) % 1440) + 1440) % 1440 : null;
        return { fno: lg.flightNo || null, dh: !!lg.dh, z: zt || null, a: { v: lg.off || '—', l: place(lg.dep) }, dur: fmtDur(t.legMin[i]), b: { v: lg.on || '—', l: place(lg.arr) },
          gap: nx && ground != null ? l(`${fmtDur(ground)} no solo`, `${fmtDur(ground)} on the ground`) : null };
      });
    } else {
      card.sub = kindLabel(kind) !== title ? kindLabel(kind) : null;
      if (t.start != null) {
        card.a = { v: fmtHm(t.start), l: l('início', 'start') };
        card.dur = t.end != null ? fmtDur(t.end - t.start) : null;
        card.b = t.end != null ? { v: fmtHm(t.end), l: t.end > 1440 ? l(`fim · ${nextWd}`, `end · ${nextWd}`) : l('fim', 'end') } : null;
      }
    }
    out.push(card);
  });
  if (nightStop && nightStop.station) {
    const nsEur = ordered.reduce((s, o) => s + ((money[o.idx] && money[o.idx].nightStop) || 0), 0);
    out.push({ t: 'slim', id: 'ns', color: 'rest', title: l(`Pernoita em ${nightStop.station}`, `Night stop in ${nightStop.station}`),
      sub: nightStop.hotel ? nightStop.hotel : l('sem hotel guardado · toca para o guardar', 'no hotel saved · tap to add it'),
      value: nsEur ? `+${fmtEur(nsEur)}` : null, gain: !!nsEur, open: { to: 'hotel' }, longOpen: nightStop.hotel ? { to: 'hotelEdit' } : null });
  }
  return out;
}
