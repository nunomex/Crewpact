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
//   · "Incerto" no lugar do número quando falta um facto, com o que falta (a barra "Completar" saiu a 2026-11-14);
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
//   closed — pós-voo: { fdp, over, multi, signOffDone, gainToday, kindLabel, from, to, early, adj } (do ftlForDuty: o início e o fim do
//            PSV — os calços do último setor em funções —, os minutos que começou antes do report e o acerto do tempo decorrido)
//   week  — { done, limit, from, to } (serviço em 7 dias, ORO.FTL.210; from/to: as datas do período que o motor escolheu) · wxTmw — { v, label } (tempo de amanhã)
//   month — { name, total, base, unc:{ min, max, why, fix }, rows:[{ k, eur, max, open }], rest } · fechoDays
//   dis   — { mode:'delay'|'projection'|'cancelled'|'diverted', side, newHm, oldHm, delayMin, why, divertedTo,
//             verdict:{ verdict, realStr, maxStr, projected }, commander, lastArr, end }
//   vac   — { left, quota, retIso, fromIso, toIso } · sick — { day, first3, payText } · doc — { name, days, expiryIso, after }
//   empty — { rosterOk, lastRead } · demo · wake — { hm } · longHaul · restOk (véspera: true|false|null)
//   changes — as alterações da escala (E2): { seen:'hh:mm', items:[{ iso, type, kind, kindLabel, route, report, end, fields }] }
//   voice — a frase da folga, das férias e da baixa (V2): { bold, tail, to? } (data/stateVoice.js) · watch — os três sinais da folga
//           (W1): { roster:{ seen }|null, docs:true|null, month:true|null }
//   calm  — antes do report (W1): { from:'hh:mm' } antes da janela do ao vivo · ou { seen:'hh:mm', flight:true|false|null,
//           plane:{ here:true, st }|{ eta:'hh:mm' }|null, airport:true|null } (airportCalm de data/flightDelay.js)
//   warns — [{ id, title, sub, value, first, open, tone }] (já escritos pelo ecrã, por ordem de prioridade; no máx. 2;
//           tone 'stop' = fora do limite → vermelho com ✕, pelo mapa B; sem tone = olhar → laranja)
//
// SAÍDA: { state, top: { pill:{ text, live }, pill2:{ text, iso }|null, what, giant:{ l1, unit, l2, l2Grey, zulu? }, facts[] },
//          cards: [ card | slim | lines | text | checks | hdr ], caption, why }
//   why    = { facts:[{ text, strong:[…], law, prova, value, title, calc }|null] (alinhado com top.facts), giant:{…}|null } | null — o
//            porquê de cada número do topo (Q3, design/topo-porque-2.html): a folha da Prova com a conta desenhada (calc: sum+total | bar)
//   checks = { t:'checks', id:'calm', color:'neutral', title, seen, items:[{ k, v, ok:true|false|null }] } (W1; ok null = por ver)
//   voice  = { t:'voice', id:'voice', bold, tail, open } (V2; na folha, sem caixa) · checks com plain:true = os sinais da folga, sem caixa
//   changes = { t:'changes', id:'roster', color:'alert', mark:'!', kind, title, seen, rows:[{ day, wd, k, old, v, sub, struck }], more,
//              action:{ label, note }, open } (E2; no lugar do aviso da escala)
//   card  = { t:'card', id, color, kind, title, sub, gain, a:{v,l}, dur, b:{v,l,gain}, pct, corner:'share'|'chev', action, open }
//   slim  = { t:'slim', id, color, title, sub, value, gain, dark, open }
//   lines = { t:'lines', id, color, kind, rows:[{k,v,open}], foot, note, link, open }
//   text  = { t:'text', id, color, kind, text, open }
//   open/action.open = { to: 'day'|'stats'|'review'|'audit'|'extra'|'item'|'hotel'|'validades'|'sync'|'pdf'|'connect'|
//                       'demo'|'share'|'shareClose'|'wake'|'privacy'|'profile', iso?, id? }
// ════════════════════════════════════════════════════════════════════════════

import { textWidth } from './fontMetrics';
import { baseCityName } from './countries';
import { airportInfo } from './airports';

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
  const fact = (v, lbl, tone = null, ic = null) => (v != null && v !== '' ? { v: String(v), l: lbl, tone, ...(ic ? { ic } : {}) } : null);
  // A METEOROLOGIA NO TOPO (D3 de design/meteo-amanha.html + a) de design/meteo-topo.html, escolhidas pelo Nuno a 2026-11-14; antes
  // era a M1, no cartão do sítio). O tempo é o ÚLTIMO FACTO DO TOPO, com o ícone, À HORA que conta e com "°C", em todos os estados
  // com serviço — um sítio e uma hora: a folga e o pós-voo com o serviço AMANHÃ, a véspera e antes do report (a base à hora do
  // report), em serviço e em voo (o destino do setor à chegada), a pernoita (à hora do report). Os cartões não o repetem — menos a
  // cidade da pernoita à chegada, no cartão da pernoita (outro sítio, outra hora). Sem serviço não há tempo (a app não usa a
  // localização). Sempre que há tempo, o crédito do MET Norway (CC BY 4.0 — docs.api.met.no/doc/License).
  const WX = H.wx || {};
  let wxUsed = false;
  const wxOk = (w) => !!(w && w.c != null && Number.isFinite(+w.c));
  const deg = (w) => `${Math.round(+w.c)} °C`;
  const wxNightTail = () => { const w = WX.night; if (!wxOk(w)) return null; wxUsed = true; return `${deg(w)}${w.label ? `, ${w.label}` : ''} ${l('à chegada', 'on arrival')}`; };
  const wxReportFact = () => { const w = WX.report; if (!wxOk(w) || !w.at) return null; wxUsed = true;
    return fact(deg(w), `${w.label ? `${w.label} ` : ''}${l('às', 'at')} ${w.at}`, null, w.ic || null); };
  const wxArrivalFact = () => { const w = WX.arrival; if (!wxOk(w) || !w.st) return null; wxUsed = true;
    return fact(deg(w), `${w.label ? `${w.label} ` : ''}${l('em', 'in')} ${w.st} ${l('à chegada', 'on arrival')}`, null, w.ic || null); };
  // Na folga e no pós-voo: só com o serviço AMANHÃ, e só se o tempo é o desse report (o mesmo serviço, a mesma hora).
  const wxTomorrow = () => (next && next.iso === tomorrow && next.report && WX.report && WX.report.at === next.report ? wxReportFact() : null);
  const facts = (...xs) => { const f = xs.filter(Boolean).slice(0, 3); return f.length ? f : null; };
  // ── Q3 · O PORQUÊ DOS NÚMEROS DO TOPO (design/topo-porque-2.html Q3, escolhida pelo Nuno a 2026-11-14 — antes a P2; o princípio 3) ──
  // Cada facto com conta e lei regista aqui o seu porquê (o facto fica igual); no fim, a saída `why` alinha-os com os factos do topo.
  // Tocar no número abre a folha da Prova a começar pela conta desenhada: `title` (o título da folha) e `calc` (a soma de cima a baixo,
  // `sum` + `total`, ou a barra do limite, `bar`). A conta usa os números do próprio serviço; a lei é a chave da Prova (data/prova.js);
  // `text` (a conta numa frase) fica para o leitor de ecrã.
  const WHY = new Map();
  let giantWhy = null;
  const withWhy = (f, w) => { if (f && w) WHY.set(f, w); return f; };
  const psvWhy = (d) => {   // "PSV até": o report mais o máximo do serviço
    const ps = (d && d.psv) || {}; const lat = psvOf(ps); const mx = toMin(ps.max);
    if (!lat || !d.report || mx == null) return null;
    const mxT = F.dur(mx); const n = d.sectors;
    const secT = n ? `${n} ${n === 1 ? l('setor', 'sector') : l('setores', 'sectors')}` : null;
    return { text: `${lat} = report ${d.report} + ${mxT} ${l('de máximo', 'maximum')}${secT ? ` · ${secT}` : ''}`,
      strong: [lat, mxT], law: 'ORO.FTL.205(b)', prova: 'psvMax', value: mxT, title: l(`PSV até às ${lat}`, `FDP until ${lat}`),
      calc: { sum: [{ k: 'Report', v: d.report }, { k: `+ ${l('Máximo', 'Maximum')}${secT ? ` · ${secT}` : ''}`, v: mxT }], total: { k: `= ${l('PSV até', 'FDP until')}`, v: lat } } };
  };
  // as horas de serviço em 7 dias: o motor (computeDutyTime) escolhe o pior período que contém hoje e diz as datas dele (from/to);
  // sem as datas, a conta não as inventa ("em 7 dias seguidos")
  const rangeTxt = (a, b) => (!isISO(a) || !isISO(b) ? null : a.slice(0, 7) === b.slice(0, 7)
    ? l(`${Number(a.slice(8, 10))} a ${F.dm(b)}`, `${Number(a.slice(8, 10))}–${F.dm(b)}`) : l(`${F.dm(a)} a ${F.dm(b)}`, `${F.dm(a)}–${F.dm(b)}`));
  const weekWhy = () => {
    const w = H.week; if (!w || !w.limit) return null;
    const done = Math.round(w.done || 0); const left = w.limit - done;
    const rg = rangeTxt(w.from, w.to);
    return { text: `${done} h ${rg ? l(`de serviço de ${rg}`, `of duty ${rg}`) : l('de serviço em 7 dias seguidos', 'of duty in 7 consecutive days')} · ${l('o limite é', 'the limit is')} ${w.limit} h — ${left >= 0 ? l(`ficam ${left} h`, `${left} h left`) : l(`passa ${-left} h`, `${-left} h over`)}`,
      strong: [`${done} h`, `${w.limit} h`], law: w.limit === 60 ? 'ORO.FTL.210(a)(1)' : 'ORO.FTL.210(a)', prova: 'limites', value: `${done} h ${l('de', 'of')} ${w.limit} h`,
      title: l('Serviço em 7 dias', 'Duty in 7 days'),
      calc: { bar: { v: `${done} h`, of: `${l('de', 'of')} ${w.limit} h`, pct: Math.max(0, Math.min(100, Math.round((done / w.limit) * 100))), left: left >= 0 ? l(`ficam ${left} h`, `${left} h left`) : l(`passa ${-left} h`, `${-left} h over`), over: left < 0,
        ...(rg ? { when: l(`de ${rg}`, rg) } : {}) } } };
  };
  // A HORA ZULU do report — JUNTO DO SÍTIO, na 2.ª linha do número ("LIS 04:40Z"; a) de design/meteo-topo.html, 2026-11-14). Era o
  // 3.º facto (opção A, 2026-11-11); com o tempo no topo seriam quatro e só cabem três. SÓ quando é diferente da hora local (verão
  // em Portugal, pernoitas fora, longo curso) e só quando o número grande É o report.
  const zuluOf = (d) => (d && d.report && d.reportZ && toMin(d.reportZ) != null && toMin(d.reportZ) !== toMin(d.report) ? `${d.reportZ}Z` : null);
  const secTxt = (d) => (d && d.sectors ? (d.sectors === 1 ? l('1 setor', '1 sector') : l(`${d.sectors} setores`, `${d.sectors} sectors`)) : null);
  const roundTrip = (d) => !!(d && Array.isArray(d.stations) && d.stations.length === 3 && d.stations[0] === d.stations[2]);
  const titleOf = (d) => (isFlightKind(d.kind) && Array.isArray(d.stations) && d.stations.length > 1 ? chain(d.stations) : (d.kindLabel || l('Serviço', 'Duty')));
  const openDay = (d) => (d && d.iso && d.hasReg !== false ? { to: 'day', iso: d.iso } : null);
  const top = (pill, pill2, what, giant, fx) => ({ pill, pill2: pill2 && pill2.text ? pill2 : null, what, giant, facts: fx || null });
  const giantOf = (l1, unit = null, l2 = null, l2Grey = false, zulu = null, l1b = null) => ({ l1: String(l1), unit: unit || null, ...(l1b != null && unit ? { l1b: String(l1b) } : {}), l2: l2 || null, l2Grey: !!(l2 && l2Grey), ...(zulu && l2 ? { zulu } : {}) });
  // D1 (design/duracoes.html, escolhida pelo Nuno a 2026-11-14): as durações escrevem-se SEMPRE com "h" ("8 h 35", "45 min"); os dois
  // pontos ficam só para as horas do relógio (no cartão do voo estão as duas lado a lado — "de 12:30" lia-se como uma hora).
  // No número grande, o "h" pequeno ao meio: { l1: '8', unit: 'h', l1b: '35' }; menos de 1 h, "45 min"; horas certas, "9 h".
  const giantDur = (min) => {
    const m0 = Math.max(0, Math.round(min));
    if (m0 < 60) return giantOf(m0, 'min');
    const h = Math.floor(m0 / 60), m = m0 % 60;
    return giantOf(h, 'h', null, false, null, m ? String(m).padStart(2, '0') : null);
  };
  // uma duração que chega do ecrã como "h:mm" (o PSV, o máximo) escrita com "h"; sem conta possível, fica como veio
  const durOf = (s) => { const m = toMin(s); return m != null ? F.dur(m) : noLead(s); };
  const psvOf = (ps) => (ps && ps.latest ? `${ps.latest}${ps.latestNextDay ? ' +1' : ''}` : null);
  // A cor dos avisos (o capítulo "Cor" do design system, 2026-11-14): fora do limite = vermelho com "✕"; olhar (cuidado, falta um
  // dado, pede uma ação) = laranja com "!"; informação = neutro, sem sinal (o laranja não se gasta no que não é cuidado — a lógica
  // dos alertas do cockpit, 14 CFR 25.1322). As férias por gozar são informação.
  const INFO_WARNS = ['vac'];
  const warnTone = (w) => (w.tone === 'stop' ? 'stop' : w.tone === 'info' || INFO_WARNS.includes(w.id) ? 'info' : 'alert');
  const slimWarn = (w) => { if (w.id === 'roster' && CHG) { const cc = changesCard(w); if (cc) return cc; }
    const tn = warnTone(w);
    return { t: 'slim', id: w.id, color: tn === 'stop' ? 'stop' : tn === 'info' ? 'neutral' : 'alert', ...(tn === 'stop' ? { mark: '✕' } : tn === 'alert' ? { mark: '!' } : {}),
      ...(w.kind ? { kind: w.kind } : {}), title: w.title, sub: w.sub || null, value: w.value || null, gain: false, open: w.open || null }; };
  const kindShort = (k) => ({ training: l('formação', 'training'), office: l('escritório', 'office'), standby_airport: 'standby', standby_home: 'standby', reserve: l('reserva', 'reserve'), positioning: l('posicionamento', 'positioning') }[k] || l('serviço', 'duty'));

  // ── E2 · "A ESCALA MUDOU" COM O QUÊ E QUANDO (design/escala-mudou.html E2, escolhida pelo Nuno a 2026-11-14) ──
  // O aviso da escala passa a cartão âmbar com uma linha por alteração, a mais próxima primeiro: o dia, o que mudou (o campo que
  // mais pesa), o antes riscado e o novo a cheio. H.changes = { seen:'hh:mm' (a leitura do calendário), items:[{ iso, type:'changed'|
  // 'conflict'|'added'|'removed', kind, kindLabel, route, report, end, fields:[{ key, label:{pt,en}, before, after }] }] } — a forma
  // do diff (data/rosterDiff.js). A app não sabe quando a empresa mudou (o calendário não o diz): diz quando leu.
  const CHG = H.changes && Array.isArray(H.changes.items) && H.changes.items.length ? H.changes : null;
  const CH_PRI = ['report_time', 'route', 'kind', 'block_off', 'block_on', 'sectors'];
  const routeTxt = (r) => (r ? String(r).split(/[-–>\s]+/).filter(Boolean).join(' → ') : null);
  const kindName = (k) => (!k || k === 'flight' ? l('voo', 'flight') : kindShort(k));
  const fval = (key, v) => (v == null || v === '' ? l('sem valor', 'none') : key === 'route' ? routeTxt(v) : key === 'kind' ? kindName(v) : String(v));
  const flabel = (f) => (f.label && (f.label[lang] || f.label.pt)) || f.key;
  const fTxt = (f) => `${flabel(f)} ${fval(f.key, f.before)} → ${fval(f.key, f.after)}`;
  const changeRow = (it) => {
    const day = String(Number(it.iso.slice(8, 10)));
    const wd = F.wds(it.iso).split(' ')[0];
    const where = it.kind && it.kind !== 'flight' && it.kindLabel ? it.kindLabel : routeTxt(it.route);
    const what = where || kindName(it.kind);
    if (it.type === 'added') return { day, wd, k: l('Serviço novo', 'New duty'), old: null, v: null, sub: [what, it.report ? `report ${it.report}` : null].filter(Boolean).join(' · '), struck: false };
    if (it.type === 'removed') return { day, wd, k: l('Cancelado', 'Cancelled'), old: null, v: null, sub: [what, it.report && it.end ? `${it.report}–${it.end}` : it.report ? `report ${it.report}` : null].filter(Boolean).join(' · '), struck: true };
    const fs = Array.isArray(it.fields) ? it.fields : [];
    const main = CH_PRI.map((k) => fs.find((f) => f && f.key === k)).find(Boolean) || null;
    const rest = fs.filter((f) => f && f !== main);
    const extra = rest.length ? `${fTxt(rest[0])}${rest.length > 1 ? ` ${l(`e mais ${rest.length - 1}`, `and ${rest.length - 1} more`)}` : ''}` : null;
    const both = it.type === 'conflict' ? l('também o mudaste — escolhes na revisão', 'you changed it too — choose in the review') : null;
    const parts = [main && main.key === 'route' ? null : where, extra, both].filter(Boolean);
    const sub = parts.length ? parts.join(' · ') : (it.report && !(main && main.key === 'report_time') ? `report ${it.report}` : null);
    return main ? { day, wd, k: flabel(main), old: fval(main.key, main.before), v: fval(main.key, main.after), sub, struck: false }
      : { day, wd, k: l('Mudou', 'Changed'), old: null, v: null, sub, struck: false };
  };
  const changesCard = (w) => {
    const items = CHG.items.filter((it) => it && isISO(it.iso)).sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
    if (!items.length) return null;
    const n = items.length;
    return { t: 'changes', id: w.id, color: 'alert', mark: '!', kind: l('A escala mudou', 'Roster changed'), title: n === 1 ? l('1 alteração', '1 change') : l(`${n} alterações`, `${n} changes`),
      seen: CHG.seen ? l(`lido às ${CHG.seen}`, `read at ${CHG.seen}`) : null, rows: items.slice(0, 3).map(changeRow), more: Math.max(0, n - 3),
      action: { label: l('Rever e aceitar', 'Review and accept'), note: l('nada entra sem ti', 'nothing lands without you') }, open: w.open || { to: 'review' } };
  };
  // os avisos que pedem ação primeiro, e só depois a informação (as férias) — guardam-se 2 (a regra 1 principal + 2)
  const warns0 = (H.warns || []).filter((w) => w && w.title);
  const warns = [...warns0.filter((w) => warnTone(w) !== 'info'), ...warns0.filter((w) => warnTone(w) === 'info')].slice(0, 2);
  const wFirst = warns.filter((w) => w.first).map(slimWarn);
  const wLast = warns.filter((w) => !w.first).map(slimWarn);
  const alertWarns = warns.filter((w) => warnTone(w) !== 'info');   // os avisos que pedem ação (âmbar · vermelho); as férias são informação

  // ── V2 · A VOZ (design/voz.html V2 + design/folga-1-2.html F2, escolhidas pelo Nuno a 2026-11-14) ──
  // Uma frase na folha, por cima dos cartões — só na folga, nas férias e na baixa, e só sem avisos que peçam ação ("nada pendente"
  // seria falso; quando aperta, a app fala só em interface). A frase vem pronta do motor data/stateVoice.js (golden test:voice), sem as
  // frases do tempo (a app já não usa a localização) nem a do aviso (diria o mesmo que o aviso). A que leva a algum lado toca-se.
  const voiceOpen = (to) => (to === 'numeros' ? { to: 'stats' } : to === 'amanha' && next ? openDay(next) : null);
  const voiceItem = H.voice && H.voice.bold && !alertWarns.length
    ? { t: 'voice', id: 'voice', bold: H.voice.bold, tail: H.voice.tail || '', open: voiceOpen(H.voice.to) } : null;
  // ── W1 NA FOLGA · os três sinais por baixo da voz: Escala · Validades · O mês — os avisos que estão calados (o silêncio também é
  // informação, princípio 4). H.watch = { roster: { seen }|null, docs: true|null, month: true|null } (o ecrã só os passa com os dados
  // que os sustentam); quando um falha, é o aviso dele que aparece (e esta linha sai: há um aviso que pede ação).
  const watchOf = (w) => {
    if (!w || alertWarns.length) return null;
    const r = w.roster;
    return { t: 'checks', id: 'watch', color: 'neutral', plain: true, title: null, seen: null, items: [
      { k: l('Escala', 'Roster'), v: r ? (r.seen ? l(`lida às ${r.seen}`, `read at ${r.seen}`) : l('em dia', 'up to date')) : l('sem dados', 'no data'), ok: !!r },
      { k: l('Validades', 'Documents'), v: w.docs ? l('em dia', 'up to date') : l('nenhuma registada', 'none saved'), ok: !!w.docs },
      { k: l('O mês', 'Month'), v: w.month ? l('nada por confirmar', 'nothing to confirm') : l('sem dados', 'no data'), ok: !!w.month }] };
  };
  // Montagem com a regra dos dois cartões: [avisos deste serviço] · o do momento · o que vem a seguir (linha fina se houver
  // aviso) · [linhas finas próprias do estado] · [avisos de outra coisa].
  let limCard = null;   // o limite incerto num cartão à parte (L2) — posto pelo estado antes de montar
  let calmCard = null;  // a verificação antes do report (W1) — posta pelo estado; ocupa o lugar de um aviso
  const assemble = (one, two, ...slims) => {
    const second = two && two.t === 'card' && (warns.length || limCard || calmCard) ? (two.slim || null) : two;
    return [limCard, ...wFirst, one, calmCard, second, ...slims, ...wLast].filter(Boolean).map((c) => { if (c && c.slim) { const { slim, ...rest } = c; return rest; } return c; });
  };

  // ── W1 · A VERIFICAÇÃO ANTES DO REPORT (design/calma-uau.html W1, escolhida pelo Nuno a 2026-11-14) ──
  // Três sinais — Voo · Avião · Aeroporto — só com o que os dados dizem (o ecrã passa-os em H.calm):
  //   { from: 'hh:mm' }  antes da janela do ao vivo (4 h antes da partida): diz quando começa, os três "por ver";
  //   { seen, flight: true|false|null, plane: { here, st } | { eta } | null, airport: true|null }  com os dados.
  // "Tudo a horas" só com os três (a regra antiga: "nunca se afirma o que a rotação desmente"); sem um dado, esse sinal fica "sem
  // dados" e o título passa a "Voo a horas"; o voo que não está a horas não tem calma (é o estado Atraso); com qualquer aviso ou o
  // limite incerto, a linha sai (1 principal + 2). Sem verde (dentro sem cor).
  const calmOf = (c) => {
    if (!c || warns.length || limCard) return null;
    const K = [l('Voo', 'Flight'), l('Avião', 'Aircraft'), l('Aeroporto', 'Airport')];
    if (c.from) return { t: 'checks', id: 'calm', color: 'neutral', title: l(`O voo ao vivo às ${c.from}`, `Live flight from ${c.from}`), seen: null,
      items: K.map((k) => ({ k, v: l('por ver', 'to check'), ok: null })) };
    if (c.flight !== true) return null;
    const pl = c.plane && c.plane.here && c.plane.st ? l(`já em ${c.plane.st}`, `already at ${c.plane.st}`)
      : c.plane && c.plane.eta ? l(`chega ${c.plane.eta}`, `lands ${c.plane.eta}`) : null;
    const items = [{ k: K[0], v: l('a horas', 'on time'), ok: true },
      { k: K[1], v: pl || l('sem dados', 'no data'), ok: !!pl },
      { k: K[2], v: c.airport ? l('normal', 'normal') : l('sem dados', 'no data'), ok: !!c.airport }];
    return { t: 'checks', id: 'calm', color: 'neutral', title: items.every((x) => x.ok) ? l('Tudo a horas', 'All on time') : l('Voo a horas', 'Flight on time'),
      seen: c.seen ? l(`visto ${c.seen}`, `seen ${c.seen}`) : null, items };
  };

  // ── O CARTÃO DO VOO E3 (design/cartoes-c2.html E3 + cartoes-e3.html V2 + cartoes-limite.html L2, escolhidos pelo Nuno a 2026-11-14) ──
  // Pela ordem do dia: report → parte → chega → fim numa linha (sem o selo do meio); com 3 sítios ou mais, as escalas por cima (V2);
  // as cidades numa linha pequena por baixo do título; o nº do voo (1 setor) e o per diem com o nome; o limite numa linha discreta
  // quando está dentro — o incerto vai num cartão à parte (por cima) e o acima é o aviso vermelho do ecrã.
  // As cidades: em português só quando a app tem o nome (data/countries.js) ou o aeroporto é português (o catálogo já o diz em
  // português: Porto, Funchal, Ponta Delgada); senão, nenhuma linha (nunca uma cidade em inglês num ecrã em português).
  const cityName = (code) => {
    const k = String(code || '').trim().toUpperCase(); if (!k) return null;
    const a = airportInfo(k);
    if (lang === 'en') return (a && a.city) || null;
    const pt = baseCityName(k, null, 'pt'); if (pt && pt !== k) return pt;
    return a && a.cc === 'PT' && a.city ? a.city : null;
  };
  const citiesOf = (d) => {
    const st = Array.isArray(d && d.stations) ? d.stations : []; if (st.length < 2) return null;
    const pick2 = st.length <= 3 ? st : [st[0], st[st.length - 1]];
    const names = pick2.map(cityName);
    return names.every(Boolean) ? names.join(' → ') : null;
  };
  const titleE3 = (d) => (Array.isArray(d.stations) && d.stations.length >= 4 ? chain([d.stations[0], d.stations[d.stations.length - 1]]) : titleOf(d));
  const lineOf = (d) => {
    const pts = [];
    if (d.report) pts.push({ v: d.report, l: 'report', end: true });
    if (d.dep && d.dep !== d.report) pts.push({ v: d.dep, l: l('parte', 'departs'), end: false });
    if (d.lastArr) pts.push({ v: d.lastArr, l: l('chega', 'arrives'), end: false });
    if (d.end) pts.push({ v: d.end, l: l('fim', 'end'), end: true });
    const st = Array.isArray(d.stations) ? d.stations : [];
    return pts.length >= 2 ? { pts, stops: st.length >= 3 ? st : null } : null;
  };
  // O limite discreto (L2): só com o PSV certo e dentro. "Dentro do limite" só quando o ecrã já verificou tudo (o PSV e os
  // acumulados, legal 'ok'); com só o PSV conhecido (véspera, próximo serviço), "PSV dentro do limite".
  const quietOf = (d, { rest = false } = {}) => {
    const ps = (d && d.psv) || {};
    if (!ps.plan || !ps.max || ps.hi || uncertain(d) || (d.legal && d.legal.status === 'bad')) return null;
    const pm = toMin(ps.plan), mx = toMin(ps.max);
    if (pm == null || mx == null || pm > mx) return null;
    const sure = !!(d.legal && d.legal.status === 'ok');
    const span = `${F.dur(pm)} ${l('de', 'of')} ${F.dur(mx)}`;
    // Na véspera, o repouso verificado diz-se ("está verificado, dorme" — a ficha da Living Interface); o curto é o aviso por cima.
    // Duas filas fixas no cartão (nunca se parte onde calha): em cima o veredicto e o repouso, à direita a margem; em baixo o PSV.
    return { l: sure ? l('Dentro do limite', 'Within limits') : l('PSV dentro do limite', 'FDP within the limit'),
      rest: rest ? l('repouso cumprido', 'rest met') : null, sub: sure ? `PSV ${span}` : span, r: { k: l('margem', 'margin'), v: F.dur(mx - pm) } };
  };
  // O limite incerto num cartão à parte (L2): neutro e tracejado, a margem nas duas pontas quando as há, e o que falta.
  const limUncOf = (d, kindLbl) => {
    const ps = (d && d.psv) || {};
    if (!d || !(uncertain(d) || ps.hi)) return null;
    const pm = toMin(ps.plan), lo = toMin(ps.max), hi = toMin(ps.hi);
    const both = pm != null && lo != null && hi != null && pm <= lo;
    return { t: 'slim', id: 'limit', color: 'neutral', dashed: true, kind: kindLbl,
      title: both ? `${l('Incerto', 'Uncertain')} · ${l('margem', 'margin')} ${F.dur(lo - pm)} ${l('a', 'to')} ${F.dur(hi - pm)}` : l('Limite incerto', 'Uncertain limit'),
      sub: [pm != null ? `PSV ${F.dur(pm)}${lo != null && hi != null ? ` ${l('de', 'of')} ${F.dur(lo)} ${l('a', 'to')} ${F.dur(hi)}` : ''}` : null,
        d.legal && d.legal.missing ? `${l('falta', 'missing')} ${d.legal.missing}` : null].filter(Boolean).join(' · ') || null,
      value: null, gain: false, open: { to: 'item', id: 'legal' } };
  };
  // As peças E3 de um serviço de voo (o resto do cartão — tipo, cor, canto, abrir — fica com quem o monta).
  const e3Of = (d, { rest = false } = {}) => {
    const gain = d.perDiem != null ? F.eur(d.perDiem, '+') : null;
    return { title: titleE3(d), cities: citiesOf(d), flightNo: d.sectors === 1 && d.flightNo ? String(d.flightNo) : null,
      gain, gainLbl: gain ? l('per diem', 'per diem') : null, line: lineOf(d), quiet: quietOf(d, { rest }), sub: null, a: null, dur: null, b: null, pct: null };
  };

  // O dia como se diz: "hoje", "amanhã", e daí em diante o dia da semana ("segunda 16").
  const dayWord = (iso) => (iso === today ? l('hoje', 'today') : iso === tomorrow ? l('amanhã', 'tomorrow') : F.wd(iso));
  // O PRÓXIMO SERVIÇO NOUTRO DIA, num dia de serviço (B3 afinada de design/a-seguir-b3.html, escolhida pelo Nuno a 2026-11-14): um
  // cabeçalho com o dia ("Amanhã · quinta 12"; "Sábado 14 · daqui a 3 dias") e uma linha fina com a hora do report à direita — avisa
  // da noite sem competir com o serviço de hoje (a ficha do "antes do report": as próximas duties não ocupam o ecrã).
  const laterOf = (n) => {
    if (!n) return [];
    const days = isISO(n.iso) && isISO(today) ? dayIdx(n.iso) - dayIdx(today) : null;
    const text = days === 1 ? `${l('Amanhã', 'Tomorrow')} · ${F.wd(n.iso)}`
      : `${F.cap(F.wd(n.iso))}${days != null && days > 1 ? ` · ${l(`daqui a ${days} dias`, `in ${days} days`)}` : ''}`;
    const fl = isFlightKind(n.kind);
    const v = n.report || (fl ? n.dep : null) || null;
    return [{ t: 'hdr', id: 'nextHdr', text },
      { t: 'slim', id: 'next', color: colorOf(n.kind), title: titleOf(n), sub: [fl ? citiesOf(n) : null, fl ? secTxt(n) : null].filter(Boolean).join(' · ') || null,
        value: v, valueLbl: v ? (n.report ? (fl ? 'report' : l('começa', 'starts')) : l('partida', 'departure')) : null, gain: false, open: openDay(n) }];
  };
  // O 2.º lugar num dia de serviço: a pernoita a seguir ao serviço de hoje; senão, o próximo serviço se for HOJE ("A seguir · hoje",
  // o cartão grande); noutro dia, o cabeçalho e a linha.
  const assembleDay = (one, night, n) => (night ? assemble(one, night)
    : n && n.iso === today ? assemble(one, nextCard(n, l('A seguir', 'Next'), { withDay: true }))
    : assemble(one, null, ...laterOf(n)));
  // O serviço seguinte como cartão grande (com a linha fina alternativa para quando há um aviso).
  const nextCard = (n, kindLbl0, { withDay = true, extraSub = null } = {}) => {
    if (!n) return null;
    const fl = isFlightKind(n.kind);
    // "A seguir" só no mesmo dia; noutro dia é o "Próximo serviço" (B3 afinada de design/a-seguir-b3.html, 2026-11-14)
    const kindLbl = kindLbl0 === l('A seguir', 'Next') && n.iso !== today ? l('Próximo serviço', 'Next duty') : kindLbl0;
    const sub = extraSub
      ? [withDay ? F.wd(n.iso) : null, extraSub].filter(Boolean).join(' · ')
      : [withDay ? F.wd(n.iso) : null, fl ? secTxt(n) : null, !withDay && fl && roundTrip(n) ? l('ida e volta', 'out and back') : null].filter(Boolean).join(' · ');
    // Sem apresentação (o calendário nem sempre a traz): a hora de partida, dita como tal — nunca um cartão só com o fim
    // (visto no iPhone a 2026-11-13).
    const a = n.report ? { v: n.report, l: fl ? 'report' : l('começa', 'starts') } : (fl && n.dep) ? { v: n.dep, l: l('partida', 'departure') } : null;
    const b = n.end ? { v: n.end, l: l('fim', 'end') } : null;
    const card = fl
      // E3: o dia e os setores no tipo (o "Próximo serviço" diz sempre o dia — a análise de 2026-11-14); a linha do dia; o limite discreto
      ? { t: 'card', id: 'next', color: colorOf(n.kind), kind: [kindLbl, dayWord(n.iso), secTxt(n)].filter(Boolean).join(' · '), ...e3Of(n), sub: extraSub || null,
        corner: 'chev', action: null, open: openDay(n) }
      : { t: 'card', id: 'next', color: colorOf(n.kind), kind: kindLbl, title: titleOf(n), sub: sub || null, gain: null,
        a, dur: n.report && n.end ? F.dur(span(n.report, n.end)) : null, b, pct: null, corner: 'chev', action: null, open: openDay(n) };
    card.slim = { t: 'slim', id: 'next', color: colorOf(n.kind), title: titleOf(n), sub: [dayWord(n.iso), n.report ? `report ${n.report}` : null].filter(Boolean).join(' · ') || null, value: null, gain: false, open: openDay(n) };
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
    const wxT = wxNightTail();   // o tempo da cidade onde se vai dormir, à chegada
    if (wxT) { card.sub = [card.sub, wxT].filter(Boolean).join(' · '); card.slim.sub = [card.slim.sub, wxT].filter(Boolean).join(' · '); }
    return card;
  };
  // O cartão do dia de serviço PLANEADO (antes do report · véspera · disrupção): começa na partida, para não repetir o report de cima.
  const uncertain = (d) => !!(d && d.legal && d.legal.status === 'uncertain');
  const psvPlanTxt = (ps) => (ps && ps.plan && ps.max ? `PSV ${durOf(ps.plan)} ${l('de', 'of')} ${durOf(ps.max)}${ps.hi ? `–${durOf(ps.hi)}` : ''}` : null);
  const planDayCard = (d, { sub, a, dur, b, action = null, gain = null, chev = false, e3 = false, restOk = false } = {}) => {
    const fl = isFlightKind(d.kind);
    const kindLbl = fl ? [l('Dia de serviço', 'Duty day'), d.split ? l('repartido', 'split') : secTxt(d)].filter(Boolean).join(' · ') : l('Serviço em terra', 'Ground duty');
    const dep = d.dep && d.dep !== d.report ? d.dep : null;
    if (e3 && fl) return { t: 'card', id: 'day', color: colorOf(d.kind), kind: kindLbl, ...e3Of(d, { rest: restOk }), corner: (action || chev) ? 'chev' : (d.shareable ? 'share' : 'chev'), action, open: openDay(d) };
    return { t: 'card', id: 'day', color: colorOf(d.kind), kind: kindLbl, title: titleOf(d), sub: sub || null, gain,
      a: a !== undefined ? a : (dep ? { v: dep, l: l('parte', 'departs') } : null),
      dur: dur !== undefined ? dur : (dep && d.lastArr ? F.dur(span(dep, d.lastArr)) : null),
      b: b !== undefined ? b : (d.lastArr ? { v: d.lastArr, l: l('última chegada', 'last arrival') } : null),
      pct: null, corner: (action || chev) ? 'chev' : (d.shareable ? 'share' : 'chev'), action, open: openDay(d) };
  };
  // A barra "Completar" do cartão de serviço SAIU (2026-11-14, regra do Nuno: a app só lê o calendário e calcula — golden
  // scripts/homecards.test.js). O cartão incerto diz o que falta e abre o dia pela seta do canto.
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
      dur: ps.running ? `PSV ${durOf(ps.running)}${ps.max ? ` ${l('de', 'of')} ${durOf(ps.max)}` : ''}` : null,
      b: line && ps.latest ? { v: ps.latest, l: ps.latestNextDay ? l('limite · amanhã', 'limit · tomorrow') : l('limite', 'limit') } : null,   // o limite depois da meia-noite diz-se (iPhone, 2026-11-11)
      pct: line ? Math.max(0, Math.min(100, Math.round(live.nowPct * 100))) : null,
      corner: d.shareable ? 'share' : 'chev', action: null, open: openDay(d) };
  };
  const marginWhy = () => {
    const mx = toMin(((hero && hero.psv) || {}).max); const m = live.marginMin;
    if (mx == null || m == null || m < 0) return null;
    const mT = F.dur(Math.abs(m));
    return { text: `${mT} = ${F.dur(mx)} ${l('de máximo', 'maximum')} − ${F.dur(mx - m)} ${l('do PSV previsto', 'of planned FDP')}`, strong: [mT, F.dur(mx)], law: 'ORO.FTL.205(b)', prova: 'psvMax', value: F.dur(mx),
      title: l('Margem no PSV', 'FDP margin'), calc: { sum: [{ k: l('Máximo', 'Maximum'), v: F.dur(mx) }, { k: `− ${l('PSV previsto', 'Planned FDP')}`, v: F.dur(mx - m) }], total: { k: `= ${l('Margem', 'Margin')}`, v: mT } } };
  };
  const marginFact = () => (live.marginMin != null
    ? (live.marginMin < 0 ? fact(F.dur(Math.abs(live.marginMin)), l('depois do limite do PSV', 'past the FDP limit')) : withWhy(fact(F.dur(live.marginMin), l('de margem no PSV', 'FDP margin')), marginWhy()))
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
  // "cumpre-se" enquanto o repouso não chega à hora; "cumprido" quando chega (a barra a 100 %) — às 22:07, "05:20 cumprido" lia-se
  // como já feito (iPhone, 2026-11-14). Sem a barra, não se sabe se já chegou: diz-se o que vem ("cumpre-se").
  const restMet = (r) => r.pct != null && r.pct >= 100;
  const metWord = (r) => (restMet(r) ? l('cumprido', 'met') : l('cumpre-se', 'will be met'));
  const restUncSub = (u, r) => (u.hi ? `${restMet(r) ? l('cumprido entre', 'met between') : l('cumpre-se entre', 'is met between')} ${u.lo} ${l('e', 'and')} ${u.hi} · ${restWhy(u)}` : restWhy(u));
  // O repouso depois do dia de hoje (pós-voo na base · pernoita fora).
  const restCard = (base, { sub = null, action = null, title = null, corner = 'chev', open = null, withUntil = true, keepSub = false } = {}) => {
    const r = H.rest || {};
    const u = r.unc && r.unc.lo ? r.unc : null;
    if (u) {
      return { t: 'card', id: 'rest', color: 'rest', kind: base ? l('Repouso · na base', 'Rest · at base') : l('Repouso · fora da base', 'Rest · away from base'),
        title: title || (base ? l('Descansa', 'Rest') : (r.hotel || l('Sem hotel guardado', 'No hotel saved'))),
        sub: keepSub && sub ? `${l('dia acima do limite', 'day over the limit')} · ${l('repouso', 'rest')} ${u.hi ? `${u.lo}–${u.hi}` : `${l('desde', 'from')} ${u.lo}`} · ${restWhy(u)}` : restUncSub(u, r),
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
      b: withUntil && r.until ? { v: r.until, l: r.untilIso && isISO(today) && dayIdx(r.untilIso) - dayIdx(today) >= 2 ? `${metWord(r)} · ${F.wds(r.untilIso)}` : metWord(r) } : null,
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
  const weekFact = () => (H.week && H.week.limit ? withWhy(fact(`${Math.round(H.week.done || 0)} h`, l(`de ${H.week.limit} em 7 dias`, `of ${H.week.limit} in 7 days`)), weekWhy()) : null);
  const todayPill = (iso = today) => ({ text: F.wd(iso), iso });

  let T = null, cards = [];

  if (state === 'setup') {
    T = top({ text: l('Bem-vindo', 'Welcome'), live: false }, null, l('Para a app saber o teu dia', 'For the app to know your day'),
      giantOf(l('Liga a', 'Link'), null, l('escala', 'roster')),
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
        ? giantDur(u)   // sem "livre": o título já diz "Folga" (D1: "18 h 30", com o "h" pequeno ao meio)
        : giantOf(days != null ? days : '—', days === 1 ? l('dia', 'day') : l('dias', 'days'));
      T = top({ text: l('Folga', 'Day off'), live: false }, todayPill(), l('Próximo serviço daqui a', 'Next duty in'), g,
        facts(fact(when(next.iso), l('até lá', 'until then')), weekFact(), wxTomorrow()));
      // F2 (design/folga-1-2.html, escolhida pelo Nuno a 2026-11-14): 1 principal + 2. O principal é o aviso que pede ação — ou, sem
      // ele, a calma (a voz e os três sinais). Depois o próximo serviço numa linha com o dia (como a B3: o topo já diz quanto falta).
      // Depois o 2.º aviso, ou as férias (de novembro em diante, com dias por gozar — CT art. 240.º), ou o mês (que fica nos Números).
      const infoW = warns.filter((w) => warnTone(w) === 'info');
      const lead = alertWarns.length ? [slimWarn(alertWarns[0])] : [voiceItem, watchOf(H.watch)];
      const sec = alertWarns[1] ? slimWarn(alertWarns[1]) : infoW[0] ? slimWarn(infoW[0]) : monthCard();
      cards = [...lead, ...laterOf(next), sec].filter(Boolean);
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
    // O "Falta algum extra? regista antes do fecho" saiu (2026-11-14, regra do Nuno: a app só lê o calendário e calcula — à mão só na
    // Simulação; golden scripts/homecards.test.js).
    if (m && m.total != null) {
      const unc = m.unc && m.unc.min != null && m.unc.max != null;
      const [ip, dp] = F.eurBare(m.total).split(lang === 'en' ? '.' : ',');
      // o mês diz-se na frase (o título passou a "Fecho do mês")
      T = top({ text: l('Fecho do mês', 'Month close'), live: false }, { text: closes, iso: null }, m.name ? l(`Ganhos brutos de ${String(m.name).toLowerCase()}`, `Gross earnings, ${m.name}`) : l('Ganhos brutos do mês', 'Gross earnings this month'),
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
        ...wFirst, ...wLast,
      ].filter(Boolean);
    } else {
      T = top({ text: l('Fecho do mês', 'Month close'), live: false }, H.monthName ? { text: H.monthName, iso: null } : null, l('O mês fecha em', 'The month closes in'), giantOf(d != null ? d : '—', d === 1 ? l('dia', 'day') : l('dias', 'days')), null);
      cards = [...wFirst, ...wLast].filter(Boolean);
    }
  } else if (state === 'posvoo') {
    const c = H.closed || {};
    const fx = facts(c.gainToday != null ? fact(F.eur(c.gainToday, '+'), l('ganhos de hoje', 'earned today'), 'gain') : null, weekFact(), wxTomorrow());
    if (c.multi) {
      T = top({ text: l('Dia fechado', 'Day closed'), live: false }, todayPill(), l('Dia fechado', 'Day closed'), giantOf(c.multi, l('serviços', 'duties')), fx);
      cards = assemble({ t: 'text', id: 'multi', color: 'neutral', kind: l('Vários serviços no mesmo dia', 'Several duties in one day'), text: l('O PSV combinado está no detalhe do dia.', 'The combined FDP is in the day detail.'), open: { to: 'day', iso: today } },
        nextCard(next, l('A seguir', 'Next'), { withDay: true }));
    } else {
      T = top({ text: l('Dia fechado', 'Day closed'), live: false }, todayPill(), c.fdp ? l('PSV de hoje', 'Today’s FDP') : (c.kindLabel || l('Serviço de hoje', 'Today’s duty')),
        c.fdp ? (toMin(c.fdp) != null ? giantDur(toMin(c.fdp)) : giantOf(noLead(c.fdp), 'h')) : giantOf(l('Fechado', 'Closed')), fx);   // sem "fechado": o título já diz "Dia fechado"
      // O PSV de hoje: do report aos calços do último setor em funções (o que o motor usa — ORO.FTL.105(12): um posicionamento no fim
      // já não conta). Quando não é só "fim − report", a linha que explica a diferença: começou antes do report (CS FTL.1.205(d)(1)(ii),
      // `early`) ou o acerto do tempo decorrido (hora de verão, fusos — `adj`, em minutos, com sinal). Vêm do ftlForDuty pelo ecrã.
      const fdpT = c.fdp && toMin(c.fdp) != null ? F.dur(toMin(c.fdp)) : null;
      const early = c.early > 0 ? c.early : 0; const adj = Number(c.adj) || 0;
      giantWhy = fdpT && c.from && c.to ? {
        text: `${fdpT} = ${l(`do report às ${c.from} aos calços às ${c.to} do último setor em funções`, `from report at ${c.from} to on-blocks at ${c.to} on the last operating sector`)}`
          + `${early ? ` · ${l(`começou ${F.dur(early)} antes do report`, `started ${F.dur(early)} before report`)}` : ''}${adj ? ` · ${l('acerto do tempo decorrido', 'elapsed-time correction')} ${adj > 0 ? '+' : '−'}${F.dur(Math.abs(adj))}` : ''}`,
        strong: [fdpT], law: 'ORO.FTL.105(12)', prova: 'psvDef', value: fdpT, title: l('PSV de hoje', 'Today’s FDP'),
        calc: { sum: [{ k: 'Report', v: c.from }, { k: l('Calços do último setor em funções', 'On-blocks, last operating sector'), v: c.to },
          ...(early ? [{ k: `+ ${l('Começou antes do report (2.ª notificação)', 'Started before report (2nd notification)')}`, v: F.dur(early) }] : []),
          ...(adj ? [{ k: `${adj > 0 ? '+' : '−'} ${l('Acerto do tempo decorrido (hora de verão ou fusos)', 'Elapsed-time correction (DST or time zones)')}`, v: F.dur(Math.abs(adj)) }] : [])],
          total: { k: `= ${l('PSV de hoje', 'Today’s FDP')}`, v: fdpT } } } : null;
      const sub = c.fdp ? (c.over ? l('o dia fechou acima do limite', 'the day closed over the limit') : l('o dia fechou dentro dos limites', 'the day closed within limits')) : null;
      // A barra "Registar sign-off" saiu (2026-11-14, regra do Nuno: o fim de serviço vem do calendário, que a companhia corrige depois).
      cards = assemble(restCard(true, { sub, action: null, open: { to: 'day', iso: today }, keepSub: !!c.over }), nextCard(next, l('A seguir', 'Next'), { withDay: true }));
    }
  } else if (state === 'pernoita') {
    const r = H.rest || {};
    const stn = r.station || (hero && hero.depStation) || '';
    if (hero && hero.report) {
      const whenTxt = hero.iso === tomorrow ? l('Report amanhã às', 'Report tomorrow at') : l(`Report ${F.wd(hero.iso)} às`, `Report ${F.wd(hero.iso)} at`);
      T = top({ text: l('Pernoita', 'Night stop'), live: false }, { text: stn, iso: today }, whenTxt, giantOf(hero.report, null, hero.depStation || stn, false, zuluOf(hero)),
        facts(fact(F.dur(live.cdMin), l('falta', 'to go')), wxReportFact()));
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
    T = top({ text: fl ? l('Voo amanhã', 'Flight tomorrow') : `${F.cap(kindShort(hero.kind))} ${l('amanhã', 'tomorrow')}`, live: true }, { text: F.wd(hero.iso), iso: hero.iso },
      hero.report ? l('Report às', 'Report at') : (fl ? l('Partida às', 'Departure at') : l('Começa às', 'Starts at')),
      giantOf(hero.report || hero.dep || '—', null, hero.depStation || hero.station || null, false, zuluOf(hero)),
      facts(fact(F.dur(live.cdMin), l('falta', 'to go')), fl ? (lat ? withWhy(fact(lat, l('PSV até', 'FDP until')), psvWhy(hero)) : (!hero.report ? fact(l('Sem report', 'No report'), l('PSV não calculado', 'FDP not calculated')) : null)) : (hero.end ? fact(hero.end, l('acaba', 'ends')) : null), wxReportFact()));
    const wake = H.wake && H.wake.hm ? { id: 'wake', icon: 'bell', label: l(`Lembrete ${H.wake.hm}`, `Reminder ${H.wake.hm}`), open: { to: 'wake' } } : null;
    // O "repouso cumprido/curto" saiu do cartão (E3): o repouso curto é o aviso "Tenho descanso?", por cima.
    if (fl) limCard = limUncOf(hero, l('O limite de amanhã', 'Tomorrow’s limit'));
    const one = fl
      ? planDayCard(hero, { e3: true, action: wake, restOk: H.restOk === true })
      : { ...planDayCard(hero, { sub: hero.report && hero.end ? `${F.dur(span(hero.report, hero.end))} ${l('de serviço em terra', 'ground duty')}` : null, a: null, dur: null, b: null, action: wake, gain: hero.pay && hero.pay.eur ? F.eur(hero.pay.eur, '+') : null }) };
    const ns = nightCard(hero, null);
    cards = assemble(one, ns ? ns.slim : null);   // na véspera a pernoita é sempre linha fina (esboço, revisão de 2026-11-11)
  } else if (state === 'disrupcao' && hero) {
    const ds = H.dis || {};
    const legDep = live.legDep || hero.depStation || '';
    const legArr = live.legArr || '';
    const pill = ds.mode === 'cancelled' ? l('Cancelado', 'Cancelled') : ds.mode === 'diverted' ? l('Desviado', 'Diverted') : l('Atraso', 'Delay');
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
      : v.verdict === 'over' ? l(`acima do limite · PSV ${v.projected ? 'projetado ' : ''}${durOf(v.realStr)} de ${durOf(v.maxStr)}`, `over the limit · ${v.projected ? 'projected ' : ''}FDP ${durOf(v.realStr)} of ${durOf(v.maxStr)}`)
      : v.verdict === 'uncertain' ? l('incerto — falta um dado no serviço', 'uncertain — a fact is missing in the duty')
      : v.verdict === 'discretion' ? (ds.commander ? l('discrição tua (205 f): até +2 h', 'your discretion (205 f): up to +2 h') : l('só com a discrição do comandante (205 f)', 'only with the commander’s discretion (205 f)'))
      : `${l('ainda dentro', 'still within')}${mx != null && rl != null ? ` · ${l('margem', 'margin')} ${F.dur(mx - rl)}` : ''}${psvOf(ps) ? ` ${l('até às', 'until')} ${psvOf(ps)}` : ''}`;
    const vTxt = vTxt0 && proj && v.verdict !== 'over' ? `${l('projeção', 'projection')}: ${vTxt0}` : vTxt0;
    const vSlim = vTxt ? { t: 'slim', id: 'psvLive', color: 'alert', title: l('Limites com o atraso', 'Limits with the delay'), sub: vTxt, value: null, gain: false, open: { to: 'item', id: 'legal' } } : null;
    const one = planDayCard(hero, { sub: ds.why || null, a: hero.report ? { v: hero.report, l: 'report' } : null,
      dur: v ? `PSV ${proj ? l('projetado ', 'projected ') : ''}${durOf(v.realStr)} ${l('de', 'of')} ${durOf(v.maxStr)}` : psvPlanTxt(ps), b: (ds.lastArr || hero.lastArr) ? { v: ds.lastArr || hero.lastArr, l: l('última chegada', 'last arrival') } : null });
    const night = nightCard({ ...hero, end: ds.end || hero.end }, next);
    const sameDay = !night && next && next.iso === today ? nextCard(next, l('A seguir', 'Next'), { withDay: true }) : null;
    // Com o aviso dos limites (é sobre ESTE serviço, vai em primeiro), o 2.º passa a linha fina — a regra dos dois cartões.
    cards = vSlim
      ? [vSlim, ...wFirst, one, ...(night || sameDay ? [(night || sameDay).slim || (night || sameDay)] : laterOf(next)), ...wLast].filter(Boolean).map((c) => { if (c.slim) { const { slim, ...r } = c; return r; } return c; })
      : assembleDay(one, night, next);
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
        cards = assembleDay(one, null, next);
      } else {
        const pre = live.cdMin != null && live.cdMin > 0;
        T = top({ text: F.cap(kindShort(hero.kind)), live: true }, { text: F.wd(hero.iso), iso: hero.iso },   // o tipo é o título; a pílula diz o dia
          pre ? l('Começa às', 'Starts at') : (hero.end ? l('Termina às', 'Ends at') : l('A decorrer', 'Ongoing')),
          giantOf((pre ? hero.report : hero.end || hero.report) || '—', null, stn),
          facts(pre ? fact(F.dur(live.cdMin), l('falta', 'to go')) : (hero.end ? fact(F.dur(live.remainingMin), l('falta', 'to go')) : null),
            pre ? (hero.end ? fact(hero.end, l('acaba', 'ends')) : null) : (hero.report ? fact(hero.report, l('começou', 'started')) : null)));
        const one = { t: 'slim', id: 'day', color: colorOf(hero.kind), title: hero.kind === 'positioning' && Array.isArray(hero.stations) && hero.stations.length > 1 ? `${hero.kindLabel || l('Posicionamento', 'Positioning')} · ${chain(hero.stations)}` : (hero.kindLabel || l('Serviço em terra', 'Ground duty')),
          sub: total ? `${F.dur(total)} ${hero.kind === 'positioning' ? l('de posicionamento', 'positioning') : l('de serviço em terra', 'ground duty')}` : null, value: pay, gain: !!pay, open: openDay(hero) };
        cards = assembleDay(one, null, next);
      }
    } else if (H.phase === 'pre' || !H.phase) {
      const unc = uncertain(hero);
      const lat = psvOf(ps);
      T = top({ text: l('Dia de voo', 'Flight day'), live: true }, pill2, hero.report ? l('Report às', 'Report at') : l('Partida às', 'Departure at'),
        giantOf(hero.report || hero.dep || '—', null, hero.depStation || null, false, zuluOf(hero)),
        facts(fact(F.dur(live.cdMin), l('falta', 'to go')),
          unc ? fact(l('Incerto', 'Uncertain'), l('PSV até', 'FDP until')) : lat ? withWhy(fact(lat, l('PSV até', 'FDP until')), psvWhy(hero)) : (!hero.report ? fact(l('Sem report', 'No report'), l('PSV não calculado', 'FDP not calculated')) : null),
          wxReportFact()));
      limCard = limUncOf(hero, l('O limite de hoje', 'Today’s limit'));   // incerto: um cartão à parte, por cima (L2), que abre o porquê
      calmCard = calmOf(H.calm);                                          // W1: a verificação, logo a seguir ao cartão do voo
      const one = planDayCard(hero, { e3: true });
      cards = assembleDay(one, nightCard(hero, next), next);
    } else {
      // A decorrer: depois do report (em terra · no ar · aterrado). O topo é o próximo marco do SETOR; o cartão é o dia todo.
      const ph = H.phase;
      const what = ph === 'air' ? l('Aterras às', 'Landing at') : ph === 'landed' ? l('Aterraste às', 'Landed at') : l('Partida às', 'Departure at');
      const big = ph === 'duty' ? live.depHm : live.arrHm;
      const stn = ph === 'duty' ? live.legDep : live.legArr;
      const unc = uncertain(hero);
      const f1 = ph === 'air' ? fact(F.dur(live.minsToArr), l('falta para aterrar', 'to landing')) : ph === 'duty' ? fact(F.dur(live.minsToDep), l('falta', 'to go'))
        : (ps.running ? fact(durOf(ps.running), l('PSV de hoje', 'today’s FDP')) : null);
      const card = liveDayCard(hero);
      if (unc) {   // "a lei é que manda": sem o facto que falta, o limite não é certo — nem antes nem depois do report
        card.sub = l(`limites incertos · falta ${hero.legal.missing || 'um dado'}`, `uncertain limits · missing ${hero.legal.missing || 'a fact'}`);
        if (card.b) card.b = { ...card.b, l: l('limite · incerto', 'limit · uncertain') };
        card.corner = 'chev'; card.action = null;
      } else if (!hero.report) {
        card.sub = [card.sub, l('sem hora de report — PSV não calculado', 'no report time — FDP not calculated')].filter(Boolean).join(' · ');
        // Sem report não há linha do PSV, mas o dia tem partida e última chegada (iPhone, 2026-11-11: o cartão ficava só com o título).
        if (!card.a && hero.dep) card.a = { v: hero.dep, l: l('partida', 'departure') };
        if (!card.b && hero.lastArr && hero.lastArr !== big) card.b = { v: hero.lastArr, l: l('última chegada', 'last arrival') };
        if (!card.dur && card.a && card.b) card.dur = F.dur(span(card.a.v, card.b.v));
        if (card.b && card.b.v === hero.lastArr) card.sub = card.sub.split(' · ').filter((x) => !x.startsWith(l('última chegada', 'last arrival'))).join(' · ') || null;   // a última chegada já está na fila: nada se repete
      }
      const f2 = unc ? fact(l('Incerto', 'Uncertain'), l('PSV até', 'FDP until'))
        : marginFact() || (!card.b && psvOf(ps) ? withWhy(fact(psvOf(ps), l('PSV até', 'FDP until')), psvWhy(hero)) : (!hero.report ? fact(l('Sem report', 'No report'), l('PSV não calculado', 'FDP not calculated')) : null));
      T = top({ text: ph === 'air' ? l('Em voo', 'In flight') : ph === 'landed' ? l('Aterrado', 'Landed') : l('Em serviço', 'On duty'), live: true }, pill2, what, giantOf(big || '—', null, stn || null), facts(f1, f2, (ph === 'duty' || ph === 'air') ? wxArrivalFact() : null));
      cards = assembleDay(card, nightCard(hero, next), next);
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
  // V2: nas férias e na baixa, a voz por cima (na folga já vai no principal).
  if ((state === 'ferias' || state === 'doenca') && voiceItem) cards = [voiceItem, ...cards.filter(Boolean)];
  const liveState = ['hoje', 'vespera', 'disrupcao', 'pernoita'].includes(state);
  return {
    state,
    top: T,
    cards: oneFull(cards.filter(Boolean)),
    why: (() => { const ws = ((T && T.facts) || []).map((f) => WHY.get(f) || null); return ws.some(Boolean) || giantWhy ? { facts: ws, giant: giantWhy } : null; })(),
    credit: wxUsed ? l('Meteorologia: MET Norway', 'Weather data: MET Norway') : null,
    caption: liveState && H.longHaul ? l('O FTL automático assume aclimatizado e na base. Em longo curso, confirma na Simulação.', 'Auto FTL assumes acclimatised and in-base. On long haul, check it in the Simulation.') : null,
  };
}

// ── O2 · SÓ O PRINCIPAL CHEIO (design/cores-decisoes.html O2, escolhida pelo Nuno a 2026-11-14; design-system "O padrão da cor") ──
// A cor de fundo diz "isto é o agora": o primeiro cartão de tipo (voo · terra · repouso) fica cheio; os outros de tipo passam a
// neutros com o quadradinho da sua cor (`swatch`), e leem-se sem competir. Os avisos (laranja, vermelho) ficam cheios — pedem olhar.
const TYPE_COLORS = ['flight', 'ground', 'rest'];
function oneFull(cards) {
  let seen = false;
  return cards.map((c) => {
    if (!c || !TYPE_COLORS.includes(c.color)) return c;
    if (!seen) { seen = true; return c; }
    return { ...c, color: 'neutral', swatch: c.color };
  });
}

// ── O TOPO LADO A LADO E IGUAL NAS TRÊS ABAS (L1 de design/topo-lado.html, escolhida pelo Nuno a 2026-11-14) ──
// O Início, a Escala e os Números usam o mesmo topo (components/HomeCards.js · HomeTop): o número em duas linhas à esquerda e os
// factos à direita, com o fio. UM tamanho para as três abas e as duas línguas: o maior (86 → 40, de 2 em 2) em que tudo cabe lado
// a lado — a Escala é a mais apertada ("serviços" e o per diem de quatro algarismos); os Números ficam só com o total (o € do ano
// não deixa factos ao lado). 62 a 390, 58 a 375. Antes: H1 (os factos por baixo, a 82 — o Nuno não gostou) e, antes disso, cada
// aba no seu tamanho (86 · 62 · 86 — a queixa: "o header tem tamanhos diferentes"). Medido com as larguras da Hanken lidas do
// .ttf (data/fontMetrics.js). Golden: test:homecards ("o topo lado a lado e igual nas três abas").
export const GIANT = { max: 86, min: 40, step: 2, ls: -0.046, unitSize: 34, unitLs: -1, unitGap: 6, gap: 16, sidePad: 16, sideRule: 1.5, factSize: 20, factLblSize: 11, factIc: 18, factIcGap: 4, zuluGap: 8 };
// Os topos mais compridos de cada aba (as referências do tamanho comum).
export const GIANT_REFS = [
  { giant: { l1: '31', l2: 'serviços' }, facts: [{ v: '15', l: 'pernoitas' }, { v: '4 999,99 €', l: 'per diem · estimado' }] },
  { giant: { l1: '31', l2: 'duties' }, facts: [{ v: '15', l: 'night stops' }, { v: '€4,999.99', l: 'per diem · estimated' }] },
  { giant: { l1: '199 999', unit: ',99 €', l2: 'estimado' }, facts: null },
  { giant: { l1: '€199,999', unit: '.99', l2: 'uncertain' }, facts: null },
];
export function factsWidth(fx) {
  if (!fx || !fx.length) return 0;
  const w = Math.max(...fx.map((f) => Math.max(textWidth(f.v, GIANT.factSize, 'b') + (f.ic ? GIANT.factIc + GIANT.factIcGap : 0), textWidth(f.l, GIANT.factLblSize, 'm'))));
  return Math.ceil(w + GIANT.sidePad + GIANT.sideRule);
}
export function giantWidth(g, z) {
  if (!g) return 0;
  const ls = z * GIANT.ls;
  // + o aperto devolvido depois da última letra (o iOS cortava o último algarismo — components/HomeCards.js, `tail`).
  // D1: com `l1b` (os minutos de uma duração), mais o mesmo espaço depois da unidade e os algarismos grandes (com o aperto devolvido).
  const w1 = textWidth(g.l1, z, 'b', ls) + (g.unit ? GIANT.unitGap + textWidth(g.unit, GIANT.unitSize, 'b', GIANT.unitLs) : -ls)
    + (g.unit && g.l1b ? GIANT.unitGap + textWidth(g.l1b, z, 'b', ls) - ls : 0);
  // A hora UTC ao lado do sítio (a letra dos factos), como a unidade na 1.ª linha.
  const w2 = g.l2 ? textWidth(g.l2, z, 'b', ls) + (g.zulu ? GIANT.zuluGap + textWidth(g.zulu, GIANT.factSize, 'b') : -ls) : 0;
  return Math.ceil(Math.max(w1, w2));
}
// O maior tamanho em que ESTE número e os seus factos cabem lado a lado. availW = largura do ecrã − as margens do topo (20 + 20).
export function fitGiant(t, availW) {
  if (!t || !t.giant) return { size: GIANT.max, fits: true };
  const side = t.facts && t.facts.length ? factsWidth(t.facts) + GIANT.gap : 0;
  let z = GIANT.max;
  while (z > GIANT.min && giantWidth(t.giant, z) + side > availW) z -= GIANT.step;
  return { size: z, fits: giantWidth(t.giant, z) + side <= availW };
}
// O tamanho comum das três abas nesta largura (62 a 390, 58 a 375).
export function commonGiant(availW) {
  return Math.min(...GIANT_REFS.map((t) => fitGiant(t, availW).size));
}
// O tamanho do número no topo de uma aba: o comum; só desce se um topo imprevisto não couber (nunca se corta — e o golden garante
// que todos os conhecidos ficam no comum, para o topo ser igual).
export function topGiant(t, availW) {
  const own = fitGiant(t, availW);
  return { size: Math.min(commonGiant(availW), own.size), fits: own.fits };
}
