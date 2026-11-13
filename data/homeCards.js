// ════════════════════════════════════════════════════════════════════════════
// homeCards — o INÍCIO 3.0 "cartões de cor" (esboço aprovado design/inicio-cartoes.html, design-system §14, 2026-11-11)
// ════════════════════════════════════════════════════════════════════════════
// Função PURA (golden `npm run test:homecards`): de um ESTADO e dos FACTOS já calculados pelos motores (crewState, FTL,
// AE, dutyLine, restUntilAfter, monthStats…) devolve o TOPO e os CARTÕES do Início. Não calcula nenhum número novo:
// só decide o que vai para onde e como se escreve. As regras do esboço vivem aqui e estão trancadas no golden:
//   · o essencial e dois ou três factos: em cima a pílula do estado, o número em DUAS linhas e dois factos ao lado;
//   · na folha, UM cartão para o momento e UM para o que vem a seguir — nunca mais de dois grandes; com um aviso, o
//     segundo passa a LINHA FINA; o aviso vai em primeiro quando é sobre este serviço e em último quando é sobre outra coisa;
//   · NADA SE REPETE: o topo é o próximo marco; o cartão é o resto do dia (em voo: o topo é o setor, o cartão o dia todo);
//   · o selo entre duas horas é o INTERVALO entre elas; PSV e limites em h:mm ("PSV 8:35 de 11:45"); o que falta e o
//     que dura em "1 h 40";
//   · o que um serviço RENDE vai a verde numa pílula branca ("+45,40 €"); o total do mês a tinta, "estimado · bruto";
//     todo o € com cêntimos;
//   · "Incerto" no lugar do número quando falta um facto, com o que falta e a barra "Completar";
//   · a 2.ª linha do número é a tinta quando é o SÍTIO (LGW) e a cinzento quando QUALIFICA (estimado, livre, de 22).
//
// ENTRADA (H) — tudo opcional; o que falta não aparece (nunca se inventa):
//   lang 'pt'|'en' · state (o de crewState) · todayISO · phase 'pre'|'duty'|'air'|'landed'|null
//   hero  — o serviço de que o topo fala (hoje · véspera · disrupção · o de amanhã na pernoita):
//           { iso, kind, kindLabel, flightNo, stations[], sectors, report, dep, lastArr, end, depStation, station,
//             psv:{ max, hi, plan, latest, latestNextDay, running }, legal:{ status:'ok'|'bad'|'uncertain', missing },
//             split, perDiem, pay:{ eur, lbl }, nightStop:{ station, hotel, pay }, restAfterMin, shareable, hasReg,
//             reportZ: a hora do report em UTC ('HH:MM', do fuso do aeroporto de partida) }
//   live  — o dia de voo de hoje: { legIdx, legTotal, legDep, legArr, depHm, arrHm, minsToDep, minsToArr, cdMin,
//           remainingMin, elapsedMin, totalMin, nowPct, marginMin, status:'on'|'late', delayMin, psvUntil }
//   next  — o serviço que vem a seguir (mesma forma que o hero, sem os cálculos) · untilMin (folga: min até lá)
//   rest  — o repouso depois do dia de HOJE (pós-voo · pernoita): { signOff, until, minMin, pct, hotel, pay, station,
//           unc: { lo, hi, minLo, minHi, why, estDay } } — `unc` quando o mínimo depende de uma leitura que a lei não fecha: as
//           duas pontas (hora e duração; `hi`/`minHi` = null sem teto conhecido) e o motivo; `until`/`minMin` são então a de cima
//   closed — pós-voo: { fdp, over, multi, signOffDone, gainToday, kindLabel }
//   week  — { done, limit } (serviço nos últimos 7 dias, ORO.FTL.210) · wxTmw — { v, label } (tempo de amanhã)
//   month — { name, total, base, unc:{ min, max, why, fix }, rows:[{ k, eur, max, open }], rest } · fechoDays
//   dis   — { mode:'delay'|'projection'|'cancelled'|'diverted', side, newHm, oldHm, delayMin, why, divertedTo,
//             verdict:{ verdict, realStr, maxStr, projected }, commander, lastArr, end }
//   vac   — { left, quota, retIso, fromIso, toIso } · sick — { day, first3, payText } · doc — { name, days, expiryIso, after }
//   empty — { rosterOk, lastRead } · demo · wake — { hm } · canExtra · longHaul · restOk (véspera: true|false|null)
//   warns — [{ id, title, sub, value, first, open }] (já escritos pelo ecrã, por ordem de prioridade; no máx. 2)
//
// SAÍDA: { state, top: { pill:{ text, live }, pill2:{ text, iso }|null, what, giant:{ l1, unit, l2, l2Grey }, facts[] },
//          cards: [ card | slim | lines | text ], caption }
//   card  = { t:'card', id, color, kind, title, sub, gain, a:{v,l}, dur, b:{v,l,gain}, pct, corner:'share'|'chev', action, open }
//   slim  = { t:'slim', id, color, title, sub, value, gain, dark, open }
//   lines = { t:'lines', id, color, kind, rows:[{k,v,open}], foot, note, link, open }
//   text  = { t:'text', id, color, kind, text, open }
//   open/action.open = { to: 'day'|'stats'|'review'|'audit'|'extra'|'item'|'hotel'|'validades'|'sync'|'pdf'|'connect'|
//                       'demo'|'share'|'shareClose'|'wake'|'privacy'|'profile', iso?, id? }
// ════════════════════════════════════════════════════════════════════════════

import { textWidth } from './fontMetrics';

const WD = { pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
const WDS = { pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const MON = { pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };

const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const dayIdx = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
const dow = (iso) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay();
export const toMin = (hm) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); return m ? +m[1] * 60 + +m[2] : null; };
// Minutos de `a` a `b` no mesmo relógio (b antes de a → vira a noite).
const span = (a, b) => { const x = toMin(a), y = toMin(b); if (x == null || y == null) return null; return y >= x ? y - x : y + 1440 - x; };
// "08:35" → "8:35" (uma DURAÇÃO não tem zero à esquerda; "08:35" lia-se como uma hora — iPhone, 2026-11-03).
const noLead = (s) => String(s || '').replace(/^0(\d:)/, '$1');

// Formatação (pura, sem Intl: o resultado é o mesmo no iPhone e no golden).
export function fmt(lang = 'pt') {
  const L = lang === 'en' ? 'en' : 'pt';
  const l = (pt, en) => (L === 'en' ? en : pt);
  const dur = (min) => {
    if (min == null || isNaN(min)) return null;
    const m0 = Math.max(0, Math.round(min));
    if (m0 < 60) return `${m0} min`;
    if (m0 < 48 * 60) { const h = Math.floor(m0 / 60), m = m0 % 60; return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`; }
    const d = Math.round(m0 / 1440); return `${d} ${d === 1 ? l('dia', 'day') : l('dias', 'days')}`;
  };
  const hm = (min) => { const m = Math.abs(Math.round(min)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
  const eurBare = (n) => { const [i, d] = Math.abs(Number(n)).toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, L === 'en' ? ',' : ' ')}${L === 'en' ? '.' : ','}${d}`; };
  const eur = (n, sign = '') => { if (n == null || isNaN(n)) return null; const s = sign || (Number(n) < 0 ? '−' : ''); return L === 'en' ? `${s}€${eurBare(n)}` : `${s}${eurBare(n)} €`; };
  const wd = (iso) => (isISO(iso) ? `${WD[L][dow(iso)]} ${Number(iso.slice(8, 10))}` : '');      // "quinta 12"
  const wdOnly = (iso) => (isISO(iso) ? WD[L][dow(iso)] : '');                                       // "terça"
  const wds = (iso) => (isISO(iso) ? `${WDS[L][dow(iso)]} ${Number(iso.slice(8, 10))}` : '');     // "qui 12"
  const dm = (iso) => (isISO(iso) ? `${Number(iso.slice(8, 10))} ${MON[L][Number(iso.slice(5, 7)) - 1]}` : '');   // "17 nov"
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  return { l, dur, hm, eur, eurBare, wd, wdOnly, wds, dm, cap };
}

const isFlightKind = (k) => !k || k === 'flight' || k === 'positioning';
const colorOf = (k) => (isFlightKind(k) ? 'flight' : 'ground');
const chain = (st) => (Array.isArray(st) ? st.filter(Boolean).join(' → ') : '');

export function homeCards(H = {}) {
  const lang = H.lang === 'en' ? 'en' : 'pt';
  const F = fmt(lang);
  const { l } = F;
  const today = H.todayISO || '';
  const tomorrow = isISO(today) ? (() => { const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + 1)); return d.toISOString().slice(0, 10); })() : '';
  const when = (iso) => (iso === today ? l('hoje', 'today') : iso === tomorrow ? l('amanhã', 'tomorrow') : F.wd(iso));
  const hero = H.hero || null;
  const live = H.live || {};
  const next = H.next || null;
  const docOn = H.state === 'folga' && H.doc && H.doc.days != null && H.doc.days >= 0 && H.doc.days <= 7;
  // Um estado que precisa de um serviço (hoje · véspera · disrupção) e não o tem (dados a meio, ou o estado forçado no
  // iPhone sem serviço na escala) mostra a FOLGA honesta — nunca um ecrã de recurso com "—" (iPhone, 2026-11-11).
  const noHero = (['hoje', 'vespera', 'disrupcao'].includes(H.state) && !hero)
    || (H.state === 'doenca' && !(H.sick && H.sick.day > 0))                      // baixa sem dia de episódio
    || (H.state === 'posvoo' && !H.closed)                                          // pós-voo sem o dia de hoje fechado
    || (H.state === 'pernoita' && !(H.rest && H.rest.station));                     // pernoita sem a estação onde se dorme
  const state = docOn ? 'documento' : noHero ? 'folga' : (H.state || 'folga');

  // ── peças ──
  const fact = (v, lbl, tone = null) => (v != null && v !== '' ? { v: String(v), l: lbl, tone } : null);
  const facts = (...xs) => { const f = xs.filter(Boolean).slice(0, 3); return f.length ? f : null; };
  // A HORA ZULU do report (Nuno, 2026-11-11, opção A): um 3.º facto na coluna ao lado do número, SÓ quando é diferente da
  // hora local (verão em Portugal, pernoitas fora, longo curso) e só quando o número grande É o report. Medido: não encolhe o
  // número nem acrescenta altura (3 factos = 135 pt ao lado de um número de 155).
  const zuluFact = (d) => (d && d.report && d.reportZ && toMin(d.reportZ) != null && toMin(d.reportZ) !== toMin(d.report) ? fact(`${d.reportZ}Z`, l('report em UTC', 'report in UTC')) : null);
  const secTxt = (d) => (d && d.sectors ? (d.sectors === 1 ? l('1 setor', '1 sector') : l(`${d.sectors} setores`, `${d.sectors} sectors`)) : null);
  const roundTrip = (d) => !!(d && Array.isArray(d.stations) && d.stations.length === 3 && d.stations[0] === d.stations[2]);
  const titleOf = (d) => (isFlightKind(d.kind) && Array.isArray(d.stations) && d.stations.length > 1 ? chain(d.stations) : (d.kindLabel || l('Serviço', 'Duty')));
  const openDay = (d) => (d && d.iso && d.hasReg !== false ? { to: 'day', iso: d.iso } : null);
  const top = (pill, pill2, what, giant, fx) => ({ pill, pill2: pill2 && pill2.text ? pill2 : null, what, giant, facts: fx || null });
  const giantOf = (l1, unit = null, l2 = null, l2Grey = false) => ({ l1: String(l1), unit: unit || null, l2: l2 || null, l2Grey: !!(l2 && l2Grey) });
  const psvOf = (ps) => (ps && ps.latest ? `${ps.latest}${ps.latestNextDay ? ' +1' : ''}` : null);
  const slimWarn = (w) => ({ t: 'slim', id: w.id, color: 'alert', title: w.title, sub: w.sub || null, value: w.value || null, gain: false, open: w.open || null });
  const warns = (H.warns || []).filter((w) => w && w.title).slice(0, 2);
  const wFirst = warns.filter((w) => w.first).map(slimWarn);
  const wLast = warns.filter((w) => !w.first).map(slimWarn);
  // Montagem com a regra dos dois cartões: [avisos deste serviço] · o do momento · o que vem a seguir (linha fina se houver
  // aviso) · [linhas finas próprias do estado] · [avisos de outra coisa].
  const assemble = (one, two, ...slims) => {
    const second = two && two.t === 'card' && warns.length ? (two.slim || null) : two;
    return [...wFirst, one, second, ...slims, ...wLast].filter(Boolean).map((c) => { if (c && c.slim) { const { slim, ...rest } = c; return rest; } return c; });
  };

  // O serviço seguinte como cartão grande (com a linha fina alternativa para quando há um aviso).
  const nextCard = (n, kindLbl, { withDay = true, extraSub = null } = {}) => {
    if (!n) return null;
    const fl = isFlightKind(n.kind);
    const sub = extraSub
      ? [withDay ? F.wd(n.iso) : null, extraSub].filter(Boolean).join(' · ')
      : [withDay ? F.wd(n.iso) : null, fl ? secTxt(n) : null, !withDay && fl && roundTrip(n) ? l('ida e volta', 'out and back') : null].filter(Boolean).join(' · ');
    // Sem apresentação (o calendário nem sempre a traz): a hora de partida, dita como tal — nunca um cartão só com o fim
    // (visto no iPhone a 2026-11-13).
    const a = n.report ? { v: n.report, l: fl ? 'report' : l('começa', 'starts') } : (fl && n.dep) ? { v: n.dep, l: l('partida', 'departure') } : null;
    const b = n.end ? { v: n.end, l: l('fim', 'end') } : null;
    const card = { t: 'card', id: 'next', color: colorOf(n.kind), kind: kindLbl, title: titleOf(n), sub: sub || null, gain: null,
      a, dur: n.report && n.end ? F.dur(span(n.report, n.end)) : null, b, pct: null, corner: 'chev', action: null, open: openDay(n) };
    card.slim = { t: 'slim', id: 'next', color: colorOf(n.kind), title: titleOf(n), sub: [F.wd(n.iso), n.report ? `report ${n.report}` : null].filter(Boolean).join(' · ') || null, value: null, gain: false, open: openDay(n) };
    return card;
  };
  // A pernoita que vem a seguir ao serviço do hero (fim de serviço → report seguinte = o intervalo REAL; o mínimo na linha pequena).
  const nightCard = (d, n) => {
    const ns = d && d.nightStop; if (!ns || !ns.station) return null;
    const title = l(`Pernoita em ${ns.station}`, `Night stop in ${ns.station}`);
    const gain = ns.pay != null ? F.eur(ns.pay, '+') : null;
    const anchor = d.report || d.dep;
    const crossed = !!(anchor && d.end && toMin(d.end) < toMin(anchor));   // o serviço acaba depois da meia-noite
    let gap = null;
    if (d.end && n && n.report && isISO(n.iso) && isISO(d.iso)) {
      gap = (dayIdx(n.iso) - dayIdx(d.iso) - (crossed ? 1 : 0)) * 1440 + toMin(n.report) - toMin(d.end);
      if (gap < 0) gap = null;
    }
    const card = { t: 'card', id: 'night', color: 'rest', kind: l('A seguir', 'Next'), title,
      sub: [ns.hotel || l('sem hotel guardado', 'no hotel saved'), d.restAfterMin ? ((d.restAfterLoMin != null && d.restAfterLoMin < d.restAfterMin) ? minRange(d.restAfterLoMin, d.restAfterMin) : d.restAfterOpen ? minRange(d.restAfterMin, null) : `${l('mínimo', 'minimum')} ${F.dur(d.restAfterMin)}`) : null].filter(Boolean).join(' · '),
      gain, a: d.end ? { v: d.end, l: l('fim de serviço', 'duty ends') } : null, dur: gap != null ? F.dur(gap) : null,
      b: n && n.report ? { v: n.report, l: `report · ${F.wds(n.iso)}` } : null, pct: null, corner: 'chev', action: null, open: { to: 'hotel' } };
    card.slim = { t: 'slim', id: 'night', color: 'rest', title, sub: [d.end ? `${l('fim de serviço', 'duty ends')} ${d.end}` : null, ns.hotel || l('sem hotel guardado', 'no hotel saved')].filter(Boolean).join(' · '),
      value: gain, gain: !!gain, open: { to: 'hotel' } };
    return card;
  };
  // O cartão do dia de serviço PLANEADO (antes do report · véspera · disrupção): começa na partida, para não repetir o report de cima.
  const legalTail = (d) => (d.legal && d.legal.status === 'ok' ? l(' · nos limites', ' · within limits') : d.legal && d.legal.status === 'bad' ? l(' · acima do limite', ' · over the limit') : '');
  const uncertain = (d) => !!(d && d.legal && d.legal.status === 'uncertain');
  const psvPlanTxt = (ps) => (ps && ps.plan && ps.max ? `PSV ${noLead(ps.plan)} ${l('de', 'of')} ${noLead(ps.max)}${ps.hi ? `–${noLead(ps.hi)}` : ''}` : null);
  const planDayCard = (d, { sub, a, dur, b, action = null, gain = null } = {}) => {
    const fl = isFlightKind(d.kind);
    const kindLbl = fl ? [l('Dia de serviço', 'Duty day'), d.split ? l('repartido', 'split') : secTxt(d)].filter(Boolean).join(' · ') : l('Serviço em terra', 'Ground duty');
    const dep = d.dep && d.dep !== d.report ? d.dep : null;
    return { t: 'card', id: 'day', color: colorOf(d.kind), kind: kindLbl, title: titleOf(d), sub: sub || null, gain,
      a: a !== undefined ? a : (dep ? { v: dep, l: l('parte', 'departs') } : null),
      dur: dur !== undefined ? dur : (dep && d.lastArr ? F.dur(span(dep, d.lastArr)) : null),
      b: b !== undefined ? b : (d.lastArr ? { v: d.lastArr, l: l('última chegada', 'last arrival') } : null),
      pct: null, corner: action ? 'chev' : (d.shareable ? 'share' : 'chev'), action, open: openDay(d) };
  };
  const completar = (d) => ({ id: 'completar', icon: 'edit', label: l('Completar', 'Complete'), open: openDay(d) || { to: 'day', iso: d.iso } });
  // O dia de serviço A DECORRER (depois do report): do report ao limite do PSV, com o ponto onde vais (dutyLine).
  const liveDayCard = (d) => {
    const ps = d.psv || {};
    const line = live.nowPct != null;
    const kindLbl = live.legTotal > 1 ? l(`Dia de serviço · setor ${live.legIdx + 1} de ${live.legTotal}`, `Duty day · sector ${live.legIdx + 1} of ${live.legTotal}`) : l('Dia de serviço', 'Duty day');
    return { t: 'card', id: 'day', color: 'flight', kind: kindLbl, title: titleOf(d),
      // A linha pequena diz QUANDO o dia continua e acaba (Nuno, iPhone 2026-11-11: a margem era até à última chegada, mas a hora
      // não aparecia): o estado do voo ao vivo · o próximo setor · a última chegada. Sem uma 2.ª fila de horas (o selo é um só).
      sub: [live.status === 'late' ? l(`atraso +${live.delayMin} min`, `delay +${live.delayMin} min`) : live.status === 'on' ? l('a horas', 'on time') : null,
        live.nextDep ? l(`próximo setor às ${live.nextDep}`, `next sector at ${live.nextDep}`) : null,
        d.lastArr && d.lastArr !== (H.phase === 'duty' ? live.depHm : live.arrHm) ? l(`última chegada ${d.lastArr}`, `last arrival ${d.lastArr}`) : null].filter(Boolean).join(' · ') || null,
      gain: null, a: d.report ? { v: d.report, l: 'report' } : null,
      dur: ps.running ? `PSV ${noLead(ps.running)}${ps.max ? ` ${l('de', 'of')} ${noLead(ps.max)}` : ''}` : null,
      b: line && ps.latest ? { v: ps.latest, l: ps.latestNextDay ? l('limite · amanhã', 'limit · tomorrow') : l('limite', 'limit') } : null,   // o limite depois da meia-noite diz-se (iPhone, 2026-11-11)
      pct: line ? Math.max(0, Math.min(100, Math.round(live.nowPct * 100))) : null,
      corner: d.shareable ? 'share' : 'chev', action: null, open: openDay(d) };
  };
  const marginFact = () => (live.marginMin != null
    ? (live.marginMin < 0 ? fact(F.hm(live.marginMin), l('depois do limite do PSV', 'past the FDP limit')) : fact(F.hm(live.marginMin), l('de margem no PSV', 'FDP margin')))
    : null);
  // O REPOUSO INCERTO (2026-11-12, "a lei é que manda"): o motivo, numa frase curta, e o mínimo nas duas pontas.
  const restWhy = (u) => ({
    standbyHome: l('a companhia fixa o repouso depois da assistência', 'the operator sets the rest after standby'),
    extAfterStandby: l('o prolongamento pede mais 2 h ou 4 h', 'the extension adds 2 h or 4 h'),
    extPreRest: l('o prolongamento pede mais 2 h ou 4 h', 'the extension adds 2 h or 4 h'),
    rotationNights: l('a lei não diz se as noites locais ainda se pedem', 'the law does not say if local nights still apply'),
    groundBetween: l('não se sabe se as horas a mais do voo ainda contam', 'unclear if the flight’s extra hours still apply'),
    legTimes: l('as horas das pernas não batem certo', 'the leg times do not add up'),
    breakOrRest: l('serviço repartido ou dois serviços', 'one split duty or two duties'),
    reducedRestAfter: l('aumenta se o repouso anterior foi reduzido', 'longer if the previous rest was reduced'),
    noReport: l(`falta a hora de apresentação do serviço de ${u.estDay || '…'}`, `the duty on ${u.estDay || '…'} has no report time`),
    noEnd: l(`falta a hora de fim do serviço de ${u.estDay || '…'}`, `the duty on ${u.estDay || '…'} has no end time`),
  }[u.why] || l('falta um dado', 'a fact is missing'));
  const minRange = (lo, hi) => (hi != null && hi !== lo ? `${l('mínimo', 'minimum')} ${F.dur(lo)} ${l('a', 'to')} ${F.dur(hi)}` : `${l('mínimo', 'minimum')} ${F.dur(lo)} ${l('ou mais', 'or more')}`);
  const minChip = (lo, hi) => (hi != null && hi !== lo ? `${l('mín.', 'min')} ${F.dur(lo)}–${F.dur(hi)}` : `${l('mín.', 'min')} ${F.dur(lo)} ${l('ou mais', 'or more')}`);
  const restUncSub = (u) => (u.hi ? `${l('cumprido entre', 'met between')} ${u.lo} ${l('e', 'and')} ${u.hi} · ${restWhy(u)}` : restWhy(u));
  // O repouso depois do dia de hoje (pós-voo na base · pernoita fora).
  const restCard = (base, { sub = null, action = null, title = null, corner = 'chev', open = null, withUntil = true, keepSub = false } = {}) => {
    const r = H.rest || {};
    const u = r.unc && r.unc.lo ? r.unc : null;
    if (u) {
      return { t: 'card', id: 'rest', color: 'rest', kind: base ? l('Repouso · na base', 'Rest · at base') : l('Repouso · fora da base', 'Rest · away from base'),
        title: title || (base ? l('Descansa', 'Rest') : (r.hotel || l('Sem hotel guardado', 'No hotel saved'))),
        sub: keepSub && sub ? `${l('dia acima do limite', 'day over the limit')} · ${l('repouso', 'rest')} ${u.hi ? `${u.lo}–${u.hi}` : `${l('desde', 'from')} ${u.lo}`} · ${restWhy(u)}` : restUncSub(u),
        gain: !base && r.pay != null ? F.eur(r.pay, '+') : null,
        a: r.signOff ? { v: r.signOff, l: l('fim de serviço', 'duty ends') } : null,
        dur: minChip(u.minLo, u.minHi),
        b: withUntil ? (u.hi ? { v: u.hi, l: l('no máximo', 'at most') } : { v: u.lo, l: l('no mínimo', 'at least') }) : null,
        pct: r.pct != null ? Math.max(0, Math.min(100, Math.round(r.pct))) : null, corner, action, open };
    }
    return { t: 'card', id: 'rest', color: 'rest', kind: base ? l('Repouso · na base', 'Rest · at base') : l('Repouso · fora da base', 'Rest · away from base'),
      title: title || (base ? l('Descansa', 'Rest') : (r.hotel || l('Sem hotel guardado', 'No hotel saved'))),
      sub: sub != null ? sub : (base ? null : l('pernoita desta noite', 'tonight’s night stop')),
      gain: !base && r.pay != null ? F.eur(r.pay, '+') : null,
      a: r.signOff ? { v: r.signOff, l: l('fim de serviço', 'duty ends') } : null,
      dur: r.minMin ? `${l('mínimo', 'minimum')} ${F.dur(r.minMin)}` : null,
      b: withUntil && r.until ? { v: r.until, l: r.untilIso && isISO(today) && dayIdx(r.untilIso) - dayIdx(today) >= 2 ? `${l('cumprido', 'met')} · ${F.wds(r.untilIso)}` : l('cumprido', 'met') } : null,
      pct: r.pct != null ? Math.max(0, Math.min(100, Math.round(r.pct))) : null, corner, action, open };
  };
  // O dinheiro do mês: linha fina neutra; incerto → as duas pontas (nunca um valor inventado).
  const monthCard = () => {
    const m = H.month; if (!m || m.total == null) return null;
    if (m.unc && m.unc.min != null && m.unc.max != null) {
      const lo = m.total - (m.base || 0) + m.unc.min, hi = m.total - (m.base || 0) + m.unc.max;
      return { t: 'lines', id: 'month', color: 'neutral', kind: `${m.name} · ${l('incerto · bruto', 'uncertain · gross')}`,
        rows: [{ k: l('No mínimo', 'At least'), v: F.eur(Math.min(lo, hi)) }, { k: l('No máximo', 'At most'), v: F.eur(Math.max(lo, hi)) }],
        foot: null, note: m.unc.why || null, link: m.unc.fix === 'profile' ? { label: l('Completar', 'Complete'), open: { to: 'profile' } } : null, open: { to: 'stats' } };
    }
    return { t: 'slim', id: 'month', color: 'neutral', title: m.name, sub: l('estimado · bruto', 'estimated · gross'), value: F.eur(m.total), gain: false, open: { to: 'stats' } };
  };
  const weekFact = () => (H.week && H.week.limit ? fact(`${Math.round(H.week.done || 0)} h`, l(`de ${H.week.limit} em 7 dias`, `of ${H.week.limit} in 7 days`)) : null);
  const todayPill = (iso = today) => ({ text: F.wd(iso), iso });
  const kindShort = (k) => ({ training: l('formação', 'training'), office: l('escritório', 'office'), standby_airport: 'standby', standby_home: 'standby', reserve: l('reserva', 'reserve'), positioning: l('posicionamento', 'positioning') }[k] || l('serviço', 'duty'));

  let T = null, cards = [];

  if (state === 'setup') {
    T = top({ text: l('Começar', 'Get started'), live: false }, null, l('Para a app saber o teu dia', 'For the app to know your day'),
      giantOf(l('Liga a', 'Connect'), null, l('escala', 'roster')),
      facts(fact(l('Só leitura', 'Read-only'), l('nada é alterado', 'nothing is changed')), fact(l('Com o teu sim', 'With your yes'), l('é que se grava', 'is it saved'))));
    cards = [
      { t: 'lines', id: 'steps', color: 'neutral', kind: l('Três passos', 'Three steps'),
        rows: [l('1 · Autorizas o calendário', '1 · You allow calendar access'), l('2 · Escolhes o calendário da escala', '2 · You pick the roster calendar'), l('3 · Confirmas os serviços', '3 · You confirm your duties')].map((k) => ({ k, v: '' })),
        foot: null, note: null, link: null, open: { to: 'privacy' } },
      { t: 'slim', id: 'connect', color: 'dark', dark: true, title: l('Ligar o calendário', 'Connect the calendar'), sub: l('o iPhone pergunta uma vez', 'your phone asks once'), value: null, gain: false, open: { to: 'connect' } },
      { t: 'slim', id: 'pdf', color: 'neutral', title: l('Importar o PDF', 'Import the PDF'), sub: l('se a escala chegou por e-mail', 'if the roster came by e-mail'), value: null, gain: false, open: { to: 'pdf' } },
      { t: 'slim', id: 'demo', color: 'neutral', title: l('Ver um exemplo', 'See an example'), sub: l('um voo de amostra, sem ligar nada', 'a sample flight, nothing connected'), value: null, gain: false, open: { to: 'demo' } },
    ];
  } else if (state === 'documento') {
    const dc = H.doc;
    const name = F.cap(dc.name || l('Documento', 'Document'));
    T = top({ text: l('Atenção', 'Attention'), live: true }, todayPill(), dc.days === 0 ? l(`${name} caduca`, `${name} expires`) : l(`${name} caduca em`, `${name} expires in`),
      dc.days === 0 ? giantOf(l('Hoje', 'Today'), null, F.dm(dc.expiryIso)) : giantOf(dc.days, dc.days === 1 ? l('dia', 'day') : l('dias', 'days'), F.dm(dc.expiryIso)),
      facts(fact(F.wdOnly(dc.expiryIso), l('último dia válido', 'last valid day')), dc.after > 0 ? fact(dc.after === 1 ? l('1 serviço', '1 duty') : l(`${dc.after} serviços`, `${dc.after} duties`), l('marcados depois', 'rostered after')) : null));
    const docCard = { t: 'card', id: 'doc', color: 'alert', kind: l('Validades', 'Documents'), title: name,
      sub: l('Quando renovares, regista a data nova para o aviso sair.', 'When you renew, enter the new date to clear the warning.'), gain: null, a: null, dur: null, b: null, pct: null, corner: 'chev',
      action: { id: 'validades', icon: 'edit', label: l('Registar a data nova', 'Enter the new date'), open: { to: 'validades' } }, open: { to: 'validades' } };
    const nx = next ? nextCard(next, l('Próximo serviço', 'Next duty'), { withDay: true, extraSub: next.iso <= dc.expiryIso ? l('ainda dentro da validade', 'still within validity') : l('depois da validade', 'after the expiry') }) : null;
    cards = [docCard, nx && warns.length ? nx.slim : nx, ...wLast, ...wFirst].filter(Boolean).map((c) => { if (c.slim) { const { slim, ...r } = c; return r; } return c; });
  } else if (state === 'folga') {
    if (!next) {
      const em = H.empty || {};
      T = top({ text: l('Folga', 'Day off'), live: false }, todayPill(), l('Sem serviços na escala', 'No duties on the roster'), giantOf(l('Livre', 'Free'), null, l('hoje', 'today'), true),
        facts(em.rosterOk ? fact(l('Em dia', 'Up to date'), l('a tua escala', 'your roster')) : null, em.lastRead ? fact(em.lastRead, l('última leitura', 'last read')) : null));
      cards = [
        { t: 'text', id: 'when', color: 'neutral', kind: l('Quando aparecem', 'When they appear'), text: l('Quando a companhia publicar a escala no calendário, os serviços aparecem aqui.', 'When your airline publishes the roster to the calendar, your duties appear here.'), open: null },
        { t: 'slim', id: 'sync', color: 'dark', dark: true, title: l('Ler a escala agora', 'Read the roster now'), sub: l('ou puxa o ecrã para baixo', 'or pull the screen down'), value: null, gain: false, open: { to: 'sync' } },
        { t: 'slim', id: 'pdf', color: 'neutral', title: l('Importar o PDF', 'Import the PDF'), sub: l('se a escala chegou por e-mail', 'if the roster came by e-mail'), value: null, gain: false, open: { to: 'pdf' } },
        ...wLast, ...wFirst,
      ];
    } else {
      const u = H.untilMin;
      const inHours = u != null && u < 48 * 60;
      const days = isISO(next.iso) && isISO(today) ? dayIdx(next.iso) - dayIdx(today) : null;
      const g = inHours
        ? giantOf(Math.floor(u / 60), u % 60 ? `h ${String(u % 60).padStart(2, '0')}` : 'h', l('livre', 'free'), true)
        : giantOf(days != null ? days : '—', days === 1 ? l('dia', 'day') : l('dias', 'days'), l('livre', 'free'), true);
      T = top({ text: l('Folga', 'Day off'), live: false }, todayPill(), l('Próximo serviço daqui a', 'Next duty in'), g,
        facts(fact(when(next.iso), l('até lá', 'until then')), weekFact()));
      cards = assemble(nextCard(next, l('Próximo serviço', 'Next duty'), { withDay: false }), null, monthCard());
    }
  } else if (state === 'ferias') {
    const v = H.vac || {};
    const period = v.fromIso && v.toIso ? (v.fromIso.slice(0, 7) === v.toIso.slice(0, 7)
      ? l(`${Number(v.fromIso.slice(8, 10))} a ${F.dm(v.toIso)}`, `${Number(v.fromIso.slice(8, 10))}–${F.dm(v.toIso)}`)
      : l(`${F.dm(v.fromIso)} a ${F.dm(v.toIso)}`, `${F.dm(v.fromIso)}–${F.dm(v.toIso)}`)) : null;
    T = top({ text: l('Férias', 'Leave'), live: false }, todayPill(), l('Ficam no ano', 'Left this year'),
      giantOf(v.left != null ? v.left : '—', v.left === 1 ? l('dia', 'day') : l('dias', 'days'), v.quota ? l(`de ${v.quota}`, `of ${v.quota}`) : null, true),
      facts(v.retIso ? fact(F.wd(v.retIso), l('regressas', 'back')) : null, period ? fact(period, l('estas férias', 'this leave')) : null));
    cards = assemble(next ? nextCard(next, l('No regresso', 'On your return'), { withDay: next.iso !== v.retIso }) : null, null, monthCard());
  } else if (state === 'doenca') {
    const sk = H.sick || {};
    T = top({ text: l('Baixa', 'Sick leave'), live: false }, todayPill(), l('Dia do episódio', 'Day of the episode'),
      sk.first3 && sk.day <= 3 ? giantOf(sk.day, l('de 3', 'of 3'), l('pagos', 'paid'), true) : giantOf(sk.day || '—'), null);
    cards = [
      sk.payText ? { t: 'text', id: 'pay', color: 'neutral', kind: l('O que o acordo garante', 'What the agreement guarantees'), text: sk.payText, open: null } : null,
      next ? { t: 'slim', id: 'next', color: 'neutral', title: `${F.cap(F.wd(next.iso))}${next.report ? `, report ${next.report}` : ''}`, sub: l('se continuares de baixa, avisa a escala', 'if you’re still sick, tell crewing'), value: null, gain: false, open: openDay(next) } : null,
      ...wFirst, ...wLast,
    ].filter(Boolean);
  } else if (state === 'fecho') {
    const m = H.month;
    const d = H.fechoDays;
    const closes = d === 0 ? l('fecha hoje', 'closes today') : d === 1 ? l('fecha amanhã', 'closes tomorrow') : l(`fecha em ${d} dias`, `closes in ${d} days`);
    const extraSlim = H.canExtra ? { t: 'slim', id: 'extra', color: 'neutral', title: l('Falta algum extra?', 'Missing an extra?'), sub: l('regista antes do fecho', 'log it before the close'), value: null, gain: false, open: { to: 'extra' } } : null;
    if (m && m.total != null) {
      const unc = m.unc && m.unc.min != null && m.unc.max != null;
      const [ip, dp] = F.eurBare(m.total).split(lang === 'en' ? '.' : ',');
      T = top({ text: m.name, live: false }, { text: closes, iso: null }, l('Ganhos brutos do mês', 'Gross earnings this month'),
        unc ? giantOf(l('Incerto', 'Uncertain')) : giantOf(lang === 'en' ? `€${ip}` : ip, lang === 'en' ? `.${dp}` : `,${dp} €`, l('estimado', 'estimated'), true), null);
      const rows = (m.rows || []).filter((r) => r && r.k).map((r) => ({ k: r.k, v: r.max != null && r.max > r.eur ? `${F.eur(r.eur)} ${l('a', 'to')} ${F.eur(r.max)}` : (r.eur == null ? '—' : F.eur(r.eur)), open: r.open || null }));
      const lo = unc ? m.total - (m.base || 0) + m.unc.min : null, hi = unc ? m.total - (m.base || 0) + m.unc.max : null;
      const foot = unc
        ? [{ k: l('No mínimo', 'At least'), v: F.eur(Math.min(lo, hi)) }, { k: l('No máximo', 'At most'), v: F.eur(Math.max(lo, hi)) }]
        : (m.rest != null ? [{ k: l('Já feito até hoje', 'Done so far'), v: F.eur(m.total - m.rest) }, { k: l('Ainda na escala', 'Still on the roster'), v: F.eur(m.rest) }] : null);
      cards = [
        { t: 'lines', id: 'parcelas', color: 'neutral', kind: l('As parcelas', 'The parts'), rows, foot,
          note: [unc ? m.unc.why : null, l('O recibo da companhia manda.', 'The company payslip rules.')].filter(Boolean).join(' '),
          link: { label: l('Como é calculado?', 'How is it calculated?'), open: { to: 'stats' } }, open: null },
        ...wFirst, ...wLast, extraSlim,
      ].filter(Boolean);
    } else {
      T = top({ text: H.monthName || l('Mês', 'Month'), live: false }, null, l('O mês fecha em', 'The month closes in'), giantOf(d != null ? d : '—', d === 1 ? l('dia', 'day') : l('dias', 'days')), null);
      cards = [...wFirst, ...wLast, extraSlim].filter(Boolean);
    }
  } else if (state === 'posvoo') {
    const c = H.closed || {};
    const fx = facts(c.gainToday != null ? fact(F.eur(c.gainToday, '+'), l('ganhos de hoje', 'earned today'), 'gain') : null, weekFact());
    if (c.multi) {
      T = top({ text: l('Dia fechado', 'Day closed'), live: false }, todayPill(), l('Dia fechado', 'Day closed'), giantOf(c.multi, l('serviços', 'duties')), fx);
      cards = assemble({ t: 'text', id: 'multi', color: 'neutral', kind: l('Vários serviços no mesmo dia', 'Several duties in one day'), text: l('O PSV combinado está no detalhe do dia.', 'The combined FDP is in the day detail.'), open: { to: 'day', iso: today } },
        nextCard(next, l('A seguir', 'Next'), { withDay: true }));
    } else {
      T = top({ text: l('Dia fechado', 'Day closed'), live: false }, todayPill(), c.fdp ? l('PSV de hoje', 'Today’s FDP') : (c.kindLabel || l('Serviço de hoje', 'Today’s duty')),
        c.fdp ? giantOf(noLead(c.fdp), 'h', l('fechado', 'closed'), true) : giantOf(l('Fechado', 'Closed')), fx);
      const sub = c.fdp ? (c.over ? l('o dia fechou acima do limite', 'the day closed over the limit') : l('o dia fechou nos limites', 'the day closed within limits')) : null;
      const act = c.signOffDone ? null : { id: 'signoff', icon: 'edit', label: l('Registar sign-off', 'Log sign-off'), open: { to: 'signoff', iso: today } };
      cards = assemble(restCard(true, { sub, action: act, open: { to: 'day', iso: today }, keepSub: !!c.over }), nextCard(next, l('A seguir', 'Next'), { withDay: true }));
    }
  } else if (state === 'pernoita') {
    const r = H.rest || {};
    const stn = r.station || (hero && hero.depStation) || '';
    if (hero && hero.report) {
      const whenTxt = hero.iso === tomorrow ? l('Report amanhã às', 'Report tomorrow at') : l(`Report ${F.wd(hero.iso)} às`, `Report ${F.wd(hero.iso)} at`);
      T = top({ text: l('Pernoita', 'Night stop'), live: false }, { text: stn, iso: today }, whenTxt, giantOf(hero.report, null, hero.depStation || stn),
        facts(fact(F.dur(live.cdMin), l('falta', 'to go')), H.wxTmw && H.wxTmw.v ? fact(H.wxTmw.v, `${l('amanhã', 'tomorrow')}${H.wxTmw.label ? ` · ${H.wxTmw.label}` : ''}`) : null, zuluFact(hero)));
      const nx = { t: 'slim', id: 'next', color: colorOf(hero.kind), title: titleOf(hero),
        sub: [F.wd(hero.iso), hero.dep && hero.dep !== hero.report ? `${l('parte', 'departs')} ${hero.dep}` : null, hero.lastArr ? `${l('chega', 'arrives')} ${hero.lastArr}` : null].filter(Boolean).join(' · '),
        value: null, gain: false, open: openDay(hero) };
      cards = assemble(restCard(false, { corner: H.shareClose ? 'share' : 'chev', open: { to: 'hotel' } }), nx);
    } else {
      const ru = r.unc && r.unc.lo ? r.unc : null;
      T = ru
        ? top({ text: l('Pernoita', 'Night stop'), live: false }, { text: stn, iso: today }, l('Repouso até', 'Rest until'), giantOf(l('Incerto', 'Uncertain'), null, stn || null),
          facts(fact(ru.lo, l('no mínimo', 'at least')), ru.hi ? fact(ru.hi, l('no máximo', 'at most')) : null))
        : r.until
        ? top({ text: l('Pernoita', 'Night stop'), live: false }, { text: stn, iso: today }, l('Repouso até', 'Rest until'), giantOf(r.until, null, stn || null), null)
        : top({ text: l('Pernoita', 'Night stop'), live: false }, todayPill(), l('Pernoita em', 'Night stop in'), giantOf(stn || '—'), null);
      cards = assemble(restCard(false, { corner: H.shareClose ? 'share' : 'chev', open: { to: 'hotel' }, withUntil: false }), next ? nextCard(next, l('A seguir', 'Next'), { withDay: true }) : null);
    }
  } else if (state === 'vespera' && hero) {
    const fl = isFlightKind(hero.kind);
    const ps = hero.psv || {};
    const lat = psvOf(ps);
    T = top({ text: l('Amanhã', 'Tomorrow'), live: true }, { text: F.wd(hero.iso), iso: hero.iso },
      hero.report ? l('Report às', 'Report at') : (fl ? l('Partida às', 'Departure at') : l('Começa às', 'Starts at')),
      giantOf(hero.report || hero.dep || '—', null, hero.depStation || hero.station || null),
      facts(fact(F.dur(live.cdMin), l('falta', 'to go')), fl ? (lat ? fact(lat, l('PSV até', 'FDP until')) : (!hero.report ? fact(l('Sem report', 'No report'), l('PSV não calculado', 'FDP not calculated')) : null)) : (hero.end ? fact(hero.end, l('acaba', 'ends')) : null), zuluFact(hero)));
    const wake = H.wake && H.wake.hm ? { id: 'wake', icon: 'bell', label: l(`Lembrete ${H.wake.hm}`, `Reminder ${H.wake.hm}`), open: { to: 'wake' } } : null;
    const restTail = H.restOk === true ? l(' · repouso cumprido', ' · rest met') : H.restOk === false ? l(' · repouso curto', ' · short rest') : '';
    const plan = psvPlanTxt(ps);
    const one = fl
      ? planDayCard(hero, { sub: plan ? `${plan}${restTail}` : (restTail ? restTail.replace(/^ · /, '') : null), action: wake, gain: hero.perDiem != null ? F.eur(hero.perDiem, '+') : null })
      : { ...planDayCard(hero, { sub: hero.report && hero.end ? `${F.dur(span(hero.report, hero.end))} ${l('de serviço em terra', 'ground duty')}` : null, a: null, dur: null, b: null, action: wake, gain: hero.pay && hero.pay.eur ? F.eur(hero.pay.eur, '+') : null }) };
    const ns = nightCard(hero, null);
    cards = assemble(one, ns ? ns.slim : null);   // na véspera a pernoita é sempre linha fina (esboço, revisão de 2026-11-11)
  } else if (state === 'disrupcao' && hero) {
    const ds = H.dis || {};
    const legDep = live.legDep || hero.depStation || '';
    const legArr = live.legArr || '';
    const pill = ds.mode === 'cancelled' ? l('Cancelado', 'Cancelled') : ds.mode === 'diverted' ? l('Desviado', 'Diverted') : hero.iso === today ? l('Hoje', 'Today') : l('Amanhã', 'Tomorrow');
    let what, g, fx;
    if (ds.mode === 'cancelled') {
      what = l('Estava marcado para as', 'It was scheduled for'); g = giantOf(ds.oldHm || hero.dep || '—', null, legDep || null);
      fx = facts(fact(l('Cancelado', 'Cancelled'), l('confirma com o crewing', 'check with crewing')));
    } else if (ds.mode === 'diverted') {
      what = l('Chegada prevista às', 'Expected arrival at'); g = giantOf(ds.newHm || '—', null, ds.divertedTo || legArr || null);
      fx = facts(fact(l('Desviado', 'Diverted'), l('confirma o destino', 'check the destination')));
    } else if (ds.mode === 'projection') {
      what = l('Partida prevista às', 'Expected departure at'); g = giantOf(ds.newHm || '—', null, legDep || null);
      fx = facts(ds.oldHm && ds.oldHm !== ds.newHm ? fact(ds.oldHm, l('hora da escala', 'rostered time'), 'was') : null, fact(`~+${ds.delayMin || 0} min`, l('atraso previsto', 'expected delay')));
    } else {
      const arr = ds.side === 'arr';
      what = arr ? l('Nova chegada às', 'New arrival at') : l('Nova partida às', 'New departure at');
      g = giantOf(ds.newHm || '—', null, (arr ? legArr : legDep) || null);
      fx = facts(ds.oldHm && ds.oldHm !== ds.newHm ? fact(ds.oldHm, l('hora da escala', 'rostered time'), 'was') : null,
        ds.delayMin > 0 ? fact(`+${ds.delayMin} min`, l('de atraso', 'delay')) : fact(l('Atrasado', 'Delayed'), l('sem hora nova', 'no new time yet')));
    }
    T = top({ text: pill, live: true }, { text: hero.flightNo || F.wd(hero.iso), iso: hero.iso }, what, g, fx);
    // Os limites com o atraso: SOBRE ESTE SERVIÇO → o primeiro cartão (a mesma conta do liveFdpVerdict, ORO.FTL.205).
    const v = ds.verdict;
    const ps = hero.psv || {};
    const mx = v ? toMin(v.maxStr) : null, rl = v ? toMin(v.realStr) : null;
    const proj = !!(v && v.projected);
    const vTxt0 = !v ? null
      : v.verdict === 'over' ? l(`acima do limite · PSV ${v.projected ? 'projetado ' : ''}${noLead(v.realStr)} de ${noLead(v.maxStr)}`, `over the limit · ${v.projected ? 'projected ' : ''}FDP ${noLead(v.realStr)} of ${noLead(v.maxStr)}`)
      : v.verdict === 'uncertain' ? l('incerto — falta um dado no serviço', 'uncertain — a fact is missing in the duty')
      : v.verdict === 'discretion' ? (ds.commander ? l('discrição tua (205 f): até +2 h', 'your discretion (205 f): up to +2 h') : l('só com a discrição do comandante (205 f)', 'only with the commander’s discretion (205 f)'))
      : `${l('ainda dentro', 'still within')}${mx != null && rl != null ? ` · ${l('margem', 'margin')} ${F.hm(mx - rl)}` : ''}${psvOf(ps) ? ` ${l('até às', 'until')} ${psvOf(ps)}` : ''}`;
    const vTxt = vTxt0 && proj && v.verdict !== 'over' ? `${l('projeção', 'projection')}: ${vTxt0}` : vTxt0;
    const vSlim = vTxt ? { t: 'slim', id: 'psvLive', color: 'alert', title: l('Limites com o atraso', 'Limits with the delay'), sub: vTxt, value: null, gain: false, open: { to: 'item', id: 'legal' } } : null;
    const one = planDayCard(hero, { sub: ds.why || null, a: hero.report ? { v: hero.report, l: 'report' } : null,
      dur: v ? `PSV ${proj ? l('projetado ', 'projected ') : ''}${noLead(v.realStr)} ${l('de', 'of')} ${noLead(v.maxStr)}` : psvPlanTxt(ps), b: (ds.lastArr || hero.lastArr) ? { v: ds.lastArr || hero.lastArr, l: l('última chegada', 'last arrival') } : null });
    const second = nightCard({ ...hero, end: ds.end || hero.end }, next) || nextCard(next, l('A seguir', 'Next'), { withDay: true });
    // Com o aviso dos limites (é sobre ESTE serviço, vai em primeiro), o 2.º passa a linha fina — a regra dos dois cartões.
    cards = vSlim
      ? [vSlim, ...wFirst, one, second ? (second.slim || second) : null, ...wLast].filter(Boolean).map((c) => { if (c.slim) { const { slim, ...r } = c; return r; } return c; })
      : assemble(one, second);
  } else if (state === 'hoje' && hero) {
    // Aqui só o VOO tem fases (antes do report · em terra · no ar · aterrado); o posicionamento segue o ramo dos serviços
    // sem fase ("Começa às" · "Termina às"), com a cor de voo — como no motor do Início (isNonFlight).
    const fl = !hero.kind || hero.kind === 'flight';
    const ps = hero.psv || {};
    const pill2 = { text: hero.flightNo || (fl ? F.wd(hero.iso) : kindShort(hero.kind)), iso: hero.iso };
    if (!fl) {
      const stn = hero.station || hero.depStation || null;
      const pay = hero.pay && hero.pay.eur ? F.eur(hero.pay.eur, '+') : null;
      const isSb = /standby|reserve/.test(String(hero.kind || ''));
      const total = hero.report && hero.end ? span(hero.report, hero.end) : null;
      if (isSb && live.cdMin != null && live.cdMin <= 0) {
        T = top({ text: 'Standby', live: true }, { text: hero.kind === 'standby_airport' ? l('aeroporto', 'airport') : hero.kind === 'reserve' ? l('reserva', 'reserve') : l('em casa', 'at home'), iso: hero.iso },
          hero.end ? l('A janela fecha às', 'The window closes at') : l('Em standby', 'On standby'), giantOf(hero.end || hero.report || '—', null, stn),
          facts(hero.end ? fact(F.dur(live.remainingMin), l('falta', 'to go')) : null, live.psvUntil ? fact(`~${live.psvUntil}`, l('PSV até, se chamarem já', 'FDP until, if called now')) : null));
        const one = { t: 'card', id: 'day', color: 'ground', kind: l('Serviço em terra', 'Ground duty'), title: hero.kindLabel || 'Standby',
          // Honesto: a estimativa é o PSV máximo a 1 setor desde o início do standby — não aplica a 225 (confirma na Simulação).
          sub: live.psvUntil ? l('PSV estimado a 1 setor (225) · confirma na Simulação', 'FDP estimated at 1 sector (225) · check it in the Simulation') : l('à espera de chamada', 'waiting for a call'),
          gain: null, a: hero.report ? { v: hero.report, l: l('começou', 'started') } : null,
          dur: total ? `${F.dur(live.elapsedMin)} ${l('de', 'of')} ${F.dur(total)}` : null,
          b: pay ? { v: pay, l: hero.kind === 'standby_airport' ? l('se não chamarem', 'if not called') : (hero.pay.lbl || l('garantido', 'guaranteed')), gain: true } : null,
          pct: total && live.elapsedMin != null ? Math.max(0, Math.min(100, Math.round((live.elapsedMin / total) * 100))) : null, corner: 'chev', action: null, open: openDay(hero) };
        cards = assemble(one, nextCard(next, l('A seguir', 'Next'), { withDay: true }));
      } else {
        const pre = live.cdMin != null && live.cdMin > 0;
        T = top({ text: l('Hoje', 'Today'), live: true }, { text: kindShort(hero.kind), iso: hero.iso },
          pre ? l('Começa às', 'Starts at') : (hero.end ? l('Termina às', 'Ends at') : l('A decorrer', 'Ongoing')),
          giantOf((pre ? hero.report : hero.end || hero.report) || '—', null, stn),
          facts(pre ? fact(F.dur(live.cdMin), l('falta', 'to go')) : (hero.end ? fact(F.dur(live.remainingMin), l('falta', 'to go')) : null),
            pre ? (hero.end ? fact(hero.end, l('acaba', 'ends')) : null) : (hero.report ? fact(hero.report, l('começou', 'started')) : null)));
        const one = { t: 'slim', id: 'day', color: colorOf(hero.kind), title: hero.kind === 'positioning' && Array.isArray(hero.stations) && hero.stations.length > 1 ? `${hero.kindLabel || l('Posicionamento', 'Positioning')} · ${chain(hero.stations)}` : (hero.kindLabel || l('Serviço em terra', 'Ground duty')),
          sub: total ? `${F.dur(total)} ${hero.kind === 'positioning' ? l('de posicionamento', 'positioning') : l('de serviço em terra', 'ground duty')}` : null, value: pay, gain: !!pay, open: openDay(hero) };
        cards = assemble(one, nextCard(next, l('A seguir', 'Next'), { withDay: true }));
      }
    } else if (H.phase === 'pre' || !H.phase) {
      const unc = uncertain(hero);
      const lat = psvOf(ps);
      T = top({ text: l('Hoje', 'Today'), live: true }, pill2, hero.report ? l('Report às', 'Report at') : l('Partida às', 'Departure at'),
        giantOf(hero.report || hero.dep || '—', null, hero.depStation || null),
        facts(fact(F.dur(live.cdMin), l('falta', 'to go')),
          unc ? fact(l('Incerto', 'Uncertain'), l('PSV até', 'FDP until')) : lat ? fact(lat, l('PSV até', 'FDP until')) : (!hero.report ? fact(l('Sem report', 'No report'), l('PSV não calculado', 'FDP not calculated')) : null),
          zuluFact(hero)));
      const plan = psvPlanTxt(ps);
      const sub = unc ? l(`limites incertos · falta ${hero.legal.missing || 'um dado'}`, `uncertain limits · missing ${hero.legal.missing || 'a fact'}`) : (plan ? `${plan}${legalTail(hero)}` : null);
      const one = planDayCard(hero, { sub, action: unc ? completar(hero) : null, gain: hero.perDiem != null ? F.eur(hero.perDiem, '+') : null });
      cards = assemble(one, nightCard(hero, next) || nextCard(next, l('A seguir', 'Next'), { withDay: true }));
    } else {
      // A decorrer: depois do report (em terra · no ar · aterrado). O topo é o próximo marco do SETOR; o cartão é o dia todo.
      const ph = H.phase;
      const what = ph === 'air' ? l('Aterras às', 'Landing at') : ph === 'landed' ? l('Aterraste às', 'Landed at') : l('Partida às', 'Departure at');
      const big = ph === 'duty' ? live.depHm : live.arrHm;
      const stn = ph === 'duty' ? live.legDep : live.legArr;
      const unc = uncertain(hero);
      const f1 = ph === 'air' ? fact(F.dur(live.minsToArr), l('falta para aterrar', 'to landing')) : ph === 'duty' ? fact(F.dur(live.minsToDep), l('falta', 'to go'))
        : (ps.running ? fact(noLead(ps.running), l('PSV de hoje', 'today’s FDP')) : null);
      const card = liveDayCard(hero);
      if (unc) {   // "a lei é que manda": sem o facto que falta, o limite não é certo — nem antes nem depois do report
        card.sub = l(`limites incertos · falta ${hero.legal.missing || 'um dado'}`, `uncertain limits · missing ${hero.legal.missing || 'a fact'}`);
        if (card.b) card.b = { ...card.b, l: l('limite · incerto', 'limit · uncertain') };
        card.corner = 'chev'; card.action = completar(hero);
      } else if (!hero.report) {
        card.sub = [card.sub, l('sem hora de report — PSV não calculado', 'no report time — FDP not calculated')].filter(Boolean).join(' · ');
        // Sem report não há linha do PSV, mas o dia tem partida e última chegada (iPhone, 2026-11-11: o cartão ficava só com o título).
        if (!card.a && hero.dep) card.a = { v: hero.dep, l: l('partida', 'departure') };
        if (!card.b && hero.lastArr && hero.lastArr !== big) card.b = { v: hero.lastArr, l: l('última chegada', 'last arrival') };
        if (!card.dur && card.a && card.b) card.dur = F.dur(span(card.a.v, card.b.v));
        if (card.b && card.b.v === hero.lastArr) card.sub = card.sub.split(' · ').filter((x) => !x.startsWith(l('última chegada', 'last arrival'))).join(' · ') || null;   // a última chegada já está na fila: nada se repete
      }
      const f2 = unc ? fact(l('Incerto', 'Uncertain'), l('PSV até', 'FDP until'))
        : marginFact() || (!card.b && psvOf(ps) ? fact(psvOf(ps), l('PSV até', 'FDP until')) : (!hero.report ? fact(l('Sem report', 'No report'), l('PSV não calculado', 'FDP not calculated')) : null));
      T = top({ text: ph === 'air' ? l('Em voo', 'In flight') : l('Hoje', 'Today'), live: true }, pill2, what, giantOf(big || '—', null, stn || null), facts(f1, f2));
      cards = assemble(card, nightCard(hero, next) || nextCard(next, l('A seguir', 'Next'), { withDay: true }));
    }
  } else {
    // Estado desconhecido (não devia acontecer): a data de hoje e os avisos, sem números inventados.
    T = top({ text: l('Hoje', 'Today'), live: false }, todayPill(), F.cap(F.wdOnly(today)), giantOf(Number(today.slice(8, 10)) || ''), null);
    cards = [...wFirst, ...wLast];
  }

  // NUNCA VAZIO (Nuno, iPhone 2026-11-11: "metade de baixo vazia"; a regra do v6): num estado com serviço, se a folha fica
  // com um só cartão (sem nada a seguir), junta-se a linha do dinheiro do mês. A baixa fica de fora (a app baixa a voz).
  if (['hoje', 'vespera', 'disrupcao', 'pernoita', 'posvoo'].includes(state) && cards.filter(Boolean).length === 1) {
    const mc = monthCard(); if (mc) cards = [...cards, mc];
  }
  const liveState = ['hoje', 'vespera', 'disrupcao', 'pernoita'].includes(state);
  return {
    state,
    top: T,
    cards: cards.filter(Boolean),
    caption: liveState && H.longHaul ? l('O FTL automático assume aclimatizado e na base. Em longo curso, confirma na Simulação.', 'Auto FTL assumes acclimatised and in-base. On long haul, check it in the Simulation.') : null,
  };
}

// ── O número gigante e os dois factos lado a lado: o maior tamanho (86 → 60, de 2 em 2) que cabe na largura útil,
// medido com as larguras da Hanken lidas do .ttf (data/fontMetrics.js). Igual ao esboço (que encolhia no navegador).
export const GIANT = { max: 86, min: 60, step: 2, ls: -0.046, unitSize: 34, unitLs: -1, unitGap: 6, gap: 16, sidePad: 16, sideRule: 1.5, factSize: 20, factLblSize: 11 };
export function factsWidth(fx) {
  if (!fx || !fx.length) return 0;
  const w = Math.max(...fx.map((f) => Math.max(textWidth(f.v, GIANT.factSize, 'b'), textWidth(f.l, GIANT.factLblSize, 'm'))));
  return Math.ceil(w + GIANT.sidePad + GIANT.sideRule);
}
export function giantWidth(g, z) {
  if (!g) return 0;
  const ls = z * GIANT.ls;
  // + o aperto devolvido depois da última letra (o iOS cortava o último algarismo — components/HomeCards.js, `tail`).
  const w1 = textWidth(g.l1, z, 'b', ls) + (g.unit ? GIANT.unitGap + textWidth(g.unit, GIANT.unitSize, 'b', GIANT.unitLs) : -ls);
  const w2 = g.l2 ? textWidth(g.l2, z, 'b', ls) - ls : 0;
  return Math.ceil(Math.max(w1, w2));
}
// availW = largura do ecrã − as margens do topo (20 + 20). Devolve { size, fits }.
export function fitGiant(t, availW) {
  if (!t || !t.giant) return { size: GIANT.max, fits: true };
  const side = t.facts ? factsWidth(t.facts) + GIANT.gap : 0;
  let z = GIANT.max;
  while (z > GIANT.min && giantWidth(t.giant, z) + side > availW) z -= GIANT.step;
  return { size: z, fits: giantWidth(t.giant, z) + side <= availW };
}
