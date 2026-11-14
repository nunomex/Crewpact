import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER, BRAND, TXT, TXT3, SPACE, RADIUS, MONEY, CARD } from '../data/constants';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import { HomeCards } from '../components/HomeCards';
import DayRuler from '../components/DayRuler';
import PeleSheet from '../components/PeleSheet';
import { completeRows, plannedOf } from '../data/dutyComplete';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, warning, success } from '../data/haptics';
import { AppContext, isoDay, toZulu } from '../data/appContext';
import { ftlForDuty, fatigueFromDuty } from '../ftl';
import { unknownsText } from '../data/ftlUnknowns';
import { roleEurFor, serviceMoney } from '../data/perdiem';
import { nightStopStation, hotelMapsUrl, hotelTelUrl } from '../data/hotels';
import HotelSheet from '../components/HotelSheet';
import ProvaSheet from '../components/ProvaSheet';
import { provaFor } from '../data/prova';
import { legZulu, legsZulu } from '../data/zulu';
import { fdpForDuty, docFor, dayNum } from '../ae/tapLimits';
import { plainFor, fmtDur, fmtClock } from '../data/tapLimitsText';
import { AE_DEEPLINKS } from '../data/library';
import { dayCards, dayRuler, orderServices } from '../data/escalaDay';
import { baseCityName } from '../data/countries';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const hm = (m) => (m == null ? '—' : `${Math.floor(m / 60)}:${String(Math.round(m) % 60).padStart(2, '0')}`);
const addDayIso = (iso, n) => { const x = new Date(`${iso}T12:00:00`); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const hasNs = (dd) => !!(dd && !dd.deleted && (dd.nightStop || (Array.isArray(dd.extra) && dd.extra.some((x) => x && x.nightStop))));
const C3 = CARD.day;   // o "Ver tudo" no 3.0: de dia, como a Escala

// Detalhe de um serviço — o "Ver tudo" da folha do dia. Fiel a design/detalhe-servico.html (v2, aprovado 2026-11-08):
// herói (rota + FANTASMA=FDP + estado FTL) + Horário · Setores (vêm do calendário: SÓ SE LEEM — regra 4) · FTL/Segurança ·
// COMPLETAR (os factos que a lei ou o acordo precisam e o calendário não traz, um de cada vez — data/dutyComplete.js) ·
// Pernoita · Pagamento. O "Editar serviço" saiu: a saída "O calendário está errado?" leva às horas reais ou ao dado em falta.
// Tudo derivado dos motores — a duty NÃO guarda FDP/per-diem. Apagar SÓ nos manuais (a fonte manda nos importados).
// O CORPO (2026-11-13): separado do ecrã para viver também DENTRO da Escala (a janela do dia, por baixo do serviço tocado) e
// desenhado no 3.0 — escolha B de design/detalhe-3.html: o serviço no cartão de cor com a perna (B2; a continuidade pela cor do
// cartão tocado, M1) e os cartões neutros de cada tema (Limites com o PSV na barra B9 · Completar · Horário com a régua B3 ·
// Pernoita · Pagamento com o total em A1 · Outros serviços com a linha do tipo B7 · "o calendário está errado?"). A lógica é UMA
// (os motores não se duplicam) e serve o ecrã do Detalhe (abaixo) e a Escala. Fica neste ficheiro para a dívida antiga dos
// estilos não mudar de sítio. `onCollapse` (a Escala): tocar no cartão de cor fecha o serviço.
export function DutyDetailBody({ date, idx: idxIn = 0, editReq = null, navigation, onEdited, onDeleted, onOpenService, onCollapse }) {
  const ctxAll = useContext(AppContext);
  const { lang, duties, crewAt, removeDuty, saveDuty, updateDutyService, notify } = ctxAll;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [hotelOpen, setHotelOpen] = useState(false);   // folha "Hotel da pernoita" (registar/editar)
  const [prova, setProva] = useState(null);            // folha da PROVA ("a lei deste número")

  // (`editReq` abria as HORAS REAIS a partir da barra "Registar sign-off" do Início — saiu a 2026-11-14 com a regra do Nuno: a escala
  // só se lê; as horas reais vêm do calendário, que a companhia corrige depois.)
  // LINHA DO TEMPO DO CONTRATO (2026-11-03): o acordo, a companhia (a Prova cita o AE dela) e a base
  // DESTE dia — um serviço antigo noutra companhia mostra o dinheiro e a lei dessa companhia.
  const ae = date ? ctxAll.aeAt(date) : ctxAll.ae;
  const coD = (() => {
    const c = date ? ctxAll.companyAt(date) : null;
    return (c && c.company && (ctxAll.airlines || []).find((a) => a.id === c.company || a.slug === c.company)) || ctxAll.company;
  })();
  const isPilotD = date ? ctxAll.companyAt(date).crewType === 'pilot' : ctxAll.isPilot;
  const baseD = date ? ctxAll.homeBaseAt(date) : ctxAll.base;
  const provaCtx = { companySlug: coD && coD.slug, companyName: coD && coD.name, isPilot: isPilotD, lang };
  // `idx` (2026-11-08): 0 = o serviço principal do dia; n = o n.º serviço extra (o "Editar" da Escala saiu — abrem aqui).
  const idx = Math.max(0, Number(idxIn) || 0);
  const day = date ? duties[date] : null;
  const duty = !day ? null : idx > 0 ? ((Array.isArray(day.extra) ? day.extra : [])[idx - 1] || null) : day;
  // DESFAZER em vez de confirmar (mockup design/desfazer.html, aprovado 2026-07-15):
  // apaga JÁ e oferece 5 s de "Desfazer" no toast — o Alert morreu. O objeto é capturado
  // ANTES; repor = saveDuty com ele (repõe deleted:false + re-deriva o FTL do dia; o sync
  // re-upserta sozinho). Local = desfazível; os importados continuam bloqueados (a fonte manda).
  const confirmDelete = () => {
    const captured = duties[date] ? { ...duties[date] } : null;
    if (!captured) return;
    warning();
    removeDuty && removeDuty(date);
    if (onDeleted) onDeleted(); else navigation.goBack();
    const wd = (lang === 'en' ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] : ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'])[new Date(`${date}T12:00:00`).getDay()];
    const what = captured.route ? String(captured.route).replace(/-/g, ' → ') : t('duties.kind.' + (captured.kind || 'flight'), lang);
    notify && notify(
      l('Serviço apagado', 'Duty deleted'), `${wd} ${Number(date.slice(8, 10))} · ${what}`, 'del',
      { label: l('Desfazer', 'Undo'), onPress: () => { success(); saveDuty && saveDuty(date, captured); } },
    );
  };

  if (!duty || (day && day.deleted)) return null;   // o ecrã do Detalhe diz "Serviço não encontrado"

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const isManual = !duty.source || duty.source === 'manual';
  const todayISO = isoDay();
  const tx = (v) => (v == null ? '' : typeof v === 'string' ? v : (lang === 'en' ? v.en : v.pt) || v.pt || '');
  const hasEnd = !!(duty.report_time && duty.block_on);

  // ── Motor FTL (só com report; realizados só com block-on) — débrief SÓ em voo (ORO.FTL.235c). ──
  const pf = !isFlight ? 0 : (duty.signOff && duty.block_on)
    ? (() => { const on = clkMin(duty.block_on), so = clkMin(duty.signOff); return (on == null || so == null) ? (ctxAll.postFlightMin || 0) : (so >= on ? so - on : so + 1440 - on); })()
    : (ctxAll.postFlightMin || 0);
  // O MESMO cálculo do dayLog e do Início (ftlForDuty, auditoria A-175): pós-voo, casos especiais, split das legs,
  // base/fora pela localização real e a tripulação DESSE dia. `pf` (acima) fica para a linha do débrief.
  // ORO.FTL.205(c): a cabine (dessa data) leva a apresentação dos pilotos — do serviço, ou desconhecida.
  const gapD = isPilotD ? undefined : (ctxAll.cabinGapMin !== undefined ? ctxAll.cabinGapMin : null);
  const d = ftlForDuty(duty, { postFlightMin: ctxAll.postFlightMin || 0, isPilot: isPilotD, base: baseD, date, cabinGapMin: gapD, splitAdminMin: ctxAll.splitAdminMin, duties });
  const fat = (d && hasEnd && d.isFdp) ? fatigueFromDuty(d) : null;
  // A assistência de antes deste voo, por palavras: a da escala, a que indicaste, e o que tira ao PSV máximo (CS FTL.1.225).
  const sbNote = (() => {
    const b = d && d.standbyBefore;
    if (!b || !(b.roster || b.declared)) return null;
    const hh = (h) => { const m = Math.round((h || 0) * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
    const clk = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const where = (t) => (t === 'airport' ? l('no aeroporto', 'at the airport') : l('em casa', 'at home'));
    // (b)(7) quando reduz; dentro das primeiras 6 h o máximo conta da apresentação, sem redução: (b)(6).
    const cite = (t) => (t === 'airport' ? 'CS FTL.1.225(a)(2)' : (b.reductionMin > 0 || b.mismatch) ? 'CS FTL.1.225(b)(7)' : 'CS FTL.1.225(b)(6)');
    const red = b.reductionMin > 0 ? l(`tira ${hh(b.reductionMin / 60)} ao PSV máximo`, `takes ${hh(b.reductionMin / 60)} off the max FDP`) : l('não chega para reduzir o PSV máximo', 'is not enough to reduce the max FDP');
    const r = b.roster, o = b.declared;
    const since = (r && r.startMin != null) ? l(` desde as ${clk(r.startMin)}`, ` since ${clk(r.startMin)}`) : '';
    if (o && r && b.mismatch) return l(`Indicaste ${hh(o.standbyH)} ${where(o.type)}; a escala tem ${hh(r.standbyH)}${since} até à apresentação. Com as tuas horas vale o máximo de cima; com as da escala, o de baixo (${cite(r.type)}).`, `You entered ${hh(o.standbyH)} ${where(o.type)}; the roster has ${hh(r.standbyH)}${since} until report. With your hours the upper maximum applies; with the roster's, the lower one (${cite(r.type)}).`);
    if (o) return l(`Indicada por ti: ${hh(o.standbyH)} ${where(o.type)}${r ? ' (bate com a da escala)' : ''} — ${red} (${cite(o.type)}).`, `Entered by you: ${hh(o.standbyH)} ${where(o.type)}${r ? ' (matches the roster)' : ''} — it ${red} (${cite(o.type)}).`);
    if (r.either) return l(`Da escala: assistência ${where(r.type)}${since}, que acabou antes da apresentação. Se o voo te foi atribuído durante ela, são ${hh(r.standbyH)} de assistência e ${red}; se já estava na escala, não reduz (${cite(r.type)}).`, `From the roster: standby ${where(r.type)}${since}, which ended before report. If the flight was assigned during it, that is ${hh(r.standbyH)} of standby and it ${red}; if it was already rostered, no reduction (${cite(r.type)}).`);
    return l(`Da escala: ${hh(r.standbyH)} de assistência ${where(r.type)}${since}, até à apresentação — ${red} (${cite(r.type)}).`, `From the roster: ${hh(r.standbyH)} of standby ${where(r.type)}${since}, until report — it ${red} (${cite(r.type)}).`);
  })();
  // Não é PSV (standby em casa, formação, escritório, standby de aeroporto com alojamento) → nunca "excede" o Quadro 2.
  const over = !(d && d.isFdp) ? false : !!(d.fdp && (d.discretion ? d.discretion.over : d.fdp.over));
  const spD = duty.special || {};
  const sbAccD = !!d && !d.isFdp;   // não é PSV → sem teto, sem calços, "Duração" em vez de "FDP realizado"

  // ── LIMITES DO ACORDO (esboço design/limites-ae.html, ecrã 4, aprovado 2026-11-03) — só nos dias na TAP ──
  // Vale o limite MAIS APERTADO entre o AE e a regra europeia (D1), com as duas fontes. O limite do AE
  // conta até 30 min depois dos calços (pilotos Cl. 6.ª, n.º 40 · cabine Cl. 4.ª, n.º 25): compara-se o
  // equivalente até aos calços (limite − 30 min) com o PSV máximo europeu.
  const ctD = isPilotD ? 'pilot' : 'cabin';
  const tapAe = !!ae && /^tap/.test(String(ae.AE_ID || ''));
  // Com o mapa todo (o longo curso precisa da rotação para a aclimatização) e a frota de cada dia (Cl. 42.ª).
  const aeOne = tapAe && isFlight && date
    ? fdpForDuty({ duties, date, crewType: ctD, baseAt: ctxAll.homeBaseAt, fleetAt: (x) => (crewAt(x) || {}).fleet || null })   // o período inteiro (bloco 3)
    : null;
  const aeFdp = aeOne ? aeOne.fdp : null;
  const aeLc = !!(aeFdp && aeFdp.lc);
  const aeOk = !!(aeFdp && aeFdp.limit != null && !sbAccD);
  const aeOnBlockMax = aeOk ? aeFdp.limit - 30 : null;
  const easaMax = d && d.fdp && d.fdp.maxFdpMin != null ? d.fdp.maxFdpMin : null;
  const aeStricter = aeOk && (easaMax == null || aeOnBlockMax < easaMax);
  const aeOver = aeOk && hasEnd && aeFdp.status === 'excede';
  const aeNext = aeOne && hasEnd ? aeOne.next : null;
  const aeDoc = docFor(ctD);
  const aeUrl = AE_DEEPLINKS.tap && AE_DEEPLINKS.tap[ctD] ? AE_DEEPLINKS.tap[ctD].url : null;
  const aeFdpId = ctD === 'pilot' ? (aeLc ? 'P32' : 'P27') : (aeLc ? 'C26' : 'C23');
  const aeFdpCl = { P27: 'RUPT Cl. 35.ª', P32: 'RUPT Cl. 43.ª', C23: 'RUPT Cl. 23.ª', C26: 'RUPT Cl. 23.ª' }[aeFdpId];   // cada regulamento do BTE recomeça a numeração: diz-se qual (A-104)
  const aePsvProva = aeOk ? {
    title: l('PSV máx. · acordo da TAP', 'FDP max · TAP agreement'), lawTag: `${aeDoc.doc.replace(/ — RUPT$/, '')} · ${aeFdpCl}`,
    resumo: plainFor(aeFdpId, lang),
    art: { P27: 'RUPT, Cl. 35.ª, n.º 1, e Cl. 6.ª, n.º 40', P32: 'RUPT, Cl. 43.ª, n.os 1 a 3, Cl. 42.ª e Cl. 6.ª, n.º 40', C23: 'RUPT, Cl. 23.ª, n.º 1, e Cl. 4.ª, n.º 25', C26: 'RUPT, Cl. 23.ª, n.os 2 a 5, 10 e 11, e Cl. 24.ª, n.º 2' }[aeFdpId],
    ref: `${aeDoc.bte}, p. ${{ P27: '304–305', P32: '307', C23: '341', C26: '341–343' }[aeFdpId]}`, url: aeUrl,
  } : null;
  const aeRestProva = aeNext ? {
    title: l('Próxima saída de calços · acordo da TAP', 'Next off-blocks · TAP agreement'), lawTag: `${aeDoc.doc.replace(/ — RUPT$/, '')} · ${ctD === 'pilot' ? 'RUPT Cl. 25.ª, 34.ª e 24.ª' : 'RUPT Cl. 29.ª e 32.ª'}`,
    resumo: plainFor(ctD === 'pilot' ? 'P42' : 'C38', lang),
    art: ctD === 'pilot' ? 'RUPT, Cl. 25.ª, n.º 2, Cl. 34.ª, n.º 2, e Cl. 24.ª, n.º 3' : 'RUPT, Cl. 29.ª, n.os 2 e 7, e Cl. 32.ª, n.º 4',
    ref: `${aeDoc.bte}, p. ${ctD === 'pilot' ? '301 e 304' : '345–347'}`, url: aeUrl,
  } : null;
  const aeTagged = (v) => (
    <View style={s.aeVal}><View style={s.aeTag}><Text style={s.aeTagT}>AE</Text></View><Text style={s.rowV} numberOfLines={1}>{v}</Text></View>
  );

  // ── € do serviço (motor AE) — a MESMA função e o MESMO índice do total do mês (data/perdiem.js serviceMoney; auditoria L2,
  // L5 e L10, bloco 6): per diem, posicionamento, pernoita e o dia sem voo (formação, escritório, assistência; TAP por dia).
  const stations = String(duty.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
  const catD = crewAt(date).category;   // categoria EM VIGOR no mês desta duty (effective-dated)
  // COMPLETAR (data/dutyComplete.js): só as linhas que contam para este tripulante e este serviço; as que faltam para a lei
  // decidir (`need`, o motor disse "incerto" por esse facto) vêm primeiro e sobem a secção para logo a seguir ao FTL.
  const rows = completeRows(duty, { isPilot: isPilotD, ae, category: catD, instructorRated: !!ctxAll.instructorRated,
    unknowns: (d && d.fdp && d.fdp.unknowns) || [], extRefused: d ? d.extRefused : null, date, standbyRoster: (d && d.standbyBefore && d.standbyBefore.roster) || null,
    legsBroken: d ? d.legsBroken || null : null, canSplit: !(idx > 0), postFlightMin: ctxAll.postFlightMin || 0 });
  const needRows = rows.filter((r) => r.need);
  const money = (ae && catD) ? serviceMoney(ae, catD, duty, { date, fleet: crewAt(date).fleet, daySvcs: [duty, ...(Array.isArray(duty.extra) ? duty.extra : [])], baseAt: ctxAll.homeBaseAt, duties }) : null;
  const perDiem = money ? money.perDiem : null;
  const nsEur = money ? money.nightStop : null;   // TAP: estadia só nos dias sem voo (bloco 5) — serviceMoney não a dá por serviço
  const svcEur = money && money.other && money.other.eur != null ? { lbl: money.other.lbl[lang === 'en' ? 'en' : 'pt'], eur: money.other.eur, max: money.other.max } : null;
  const posEur = money && money.positioning != null ? { eur: money.positioning, max: money.positioningMax } : null;

  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const fmtDate = (iso) => {
    const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso;
    const str = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const fmtEur0 = (n) => { if (n == null) return '—'; const [i, dd] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dd}` : `${g},${dd} €`; };
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  const firstLeg = legs[0] || null, lastLeg = legs[legs.length - 1] || null;
  const tv = (hhmm) => { const z = toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  const zRef = duty.report_time || (firstLeg && firstLeg.off) || null;   // o dia de cada hora (data/zulu.js, legDay)
  // As horas Zulu de todas as pernas pela cadeia do serviço (apresentação → partida → chegada…; data/zulu.js, legsZulu).
  const legsZ = legsZulu(date, legs, duty.report_time || null);
  const zOf = (leg, which) => { const i = legs.indexOf(leg); return i >= 0 && legsZ[i] ? legsZ[i][which] : legZulu(date, leg, which, zRef); };
  const tvL = (hhmm, leg, which) => { const z = zOf(leg, which) || toZulu(date, hhmm); return z ? `${hhmm}  ·  ${z}Z` : hhmm; };
  const routeStr = stations.length > 1 ? stations.join(' → ') : (duty.route || l('Voo', 'Flight'));
  const headMain = isFlight
    ? routeStr
    : (duty.block_on && duty.block_on !== duty.report_time ? `${duty.report_time} – ${duty.block_on}` : (duty.report_time || '—'));

  // ── Herói (mockup): fantasma = FDP realizado (ou duty hours); kick = nº de voo · setores · pernoita ──
  const heroGhost = (d && hasEnd && d.fdp && d.fdp.actualFdpStr) || (d && d.dutyPeriodStr) || '';
  const nSec = (legs.some((lg) => lg && lg.dh) ? legs.filter((lg) => lg && !lg.dh).length : legs.length) || (duty.sectors || 0);   // o DH não é setor (215(a))
  const secLbl = nSec ? `${nSec} ${nSec === 1 ? l('setor', 'sector') : l('setores', 'sectors')}` : null;
  const kickParts = [
    (firstLeg && firstLeg.flightNo) ? firstLeg.flightNo : null,
    secLbl,
    duty.nightStop ? l('pernoita', 'night stop') : null,
  ].filter(Boolean);
  // Pílula de estado FTL (verde dentro / vermelho excede / neutra sem dados de fim).
  const statusPill = (!d || !hasEnd)
    ? { tone: 'neutral', txt: l('sem dados de fim', 'no end data') }
    : aeOver
      ? { tone: 'red', txt: l('Excede o limite do acordo', 'Exceeds the agreement limit') }
    : over
      ? { tone: 'red', txt: l('Excede o limite FTL', 'Exceeds FTL limit') }
    : (d && d.isFdp && d.fdp && d.fdp.uncertain)
      ? { tone: 'unc', txt: needRows.length ? (needRows.length === 1 ? l('Incerto · falta 1 dado', 'Uncertain · 1 fact missing') : l(`Incerto · faltam ${needRows.length} dados`, `Uncertain · ${needRows.length} facts missing`)) : l('Incerto', 'Uncertain') }
      : { tone: 'ok', txt: l('Dentro do limite FTL', 'Within FTL limit') };

  // Fadiga — o mapa das cores (§14): é um RISCO estimado, não um limite da lei → nunca vermelho. Alta = laranja forte (fundo +
  // ponto + texto), elevada = só o ponto laranja, baixa = sem cor (cockpit escuro). A palavra diz sempre o nível.
  const fatBg = (b) => b === 'high' ? PELE.warnSoft : PELE.soft;
  const fatDotC = (b) => (b === 'high' || b === 'elevated') ? PELE.warn : PELE.grey;
  const fatTxtC = (b) => b === 'high' ? PELE.warnText : PELE.ink;
  const fatLabel = (b) => t('duties.fatigue' + b.charAt(0).toUpperCase() + b.slice(1), lang);

  // Painel de linhas — aceita {k,v,color} ou {k,node}; ignora falsy; 1ª linha sem risca de topo.
  // PROVA (design/prova.html): uma linha com `prova` ganha o § inline sob o rótulo
  // (metadado, não etiqueta — a pílula morreu no passe do designer) e fica tocável
  // (linha inteira) → abre a folha "a lei deste número".
  const Panel = ({ rows }) => {
    const items = rows.filter(Boolean);
    if (!items.length) return null;
    return (
      <View style={s.panel}>
        {items.map((it, i) => {
          // Uma NOTA (o motivo de um "incerto" ou de um máximo com duas pontas): o título em cima e o texto inteiro por baixo,
          // sem cortar — visto no iPhone a 2026-11-13: numa linha só, o motivo ficava "falta quantas horas de assistência houve antes d…".
          if (it.note) return (
            <View key={i} style={[s.row, s.rowNote, i === 0 && s.rowFirst]}>
              <Text style={[s.rowK, { flex: 0 }, it.color ? { color: it.color } : null]}>{it.k}</Text>
              <Text style={s.rowNoteT}>{it.note}</Text>
            </View>
          );
          const inner = (
            <>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.rowK, { flex: 0 }]} numberOfLines={2}>{it.k}</Text>
                {it.prova ? <Text style={s.rowLaw} numberOfLines={1}><Text style={s.rowLawS}>§ </Text>{it.prova.art}</Text> : null}
              </View>
              {it.node || <Text style={[s.rowV, it.color ? { color: it.color } : null]} numberOfLines={1}>{it.v}</Text>}
            </>
          );
          return it.prova ? (
            <TouchableOpacity key={i} style={[s.row, i === 0 && s.rowFirst]} activeOpacity={0.7}
              onPress={() => { select(); setProva({ ...it.prova, value: typeof it.v === 'string' ? it.v : null }); }}
              accessibilityRole="button" accessibilityLabel={`${it.k} — ${l('ver a lei', 'see the law')}`}>
              {inner}
            </TouchableOpacity>
          ) : it.go ? (
            <TouchableOpacity key={i} style={[s.row, i === 0 && s.rowFirst]} activeOpacity={0.7} onPress={() => { select(); it.go(); }}
              accessibilityRole="button" accessibilityLabel={`${it.k}${typeof it.v === 'string' ? ` — ${it.v}` : ''}`}>
              {inner}
            </TouchableOpacity>
          ) : (
            <View key={i} style={[s.row, i === 0 && s.rowFirst]}>{inner}</View>
          );
        })}
      </View>
    );
  };
  // O cartão neutro de um tema (o "lines" do Início): o título dentro, em cima; à direita, de ONDE vêm os dados.
  const Card = ({ kind, src, children }) => (
    <View style={[s.card, { backgroundColor: C3.neutral }]}>
      {kind ? (
        <View style={s.cardHead}>
          <Text style={[TXT3.kind, s.flex1, { color: C3.neutralKind }]}>{kind}</Text>
          {src ? <Text style={[TXT3.kind, { color: C3.neutralKind }]}>{src}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
  const srcLbl = duty.source === 'pdf' ? l('do PDF', 'from the PDF') : duty.source === 'calendar' ? l('do calendário', 'from the calendar') : null;
  // Uma hora REAL (registada pelo tripulante) ao lado da prevista da escala publicada (`snap`): o selo "real" e, por baixo, a Zulu
  // e a prevista. O motor conta pela real (ORO.FTL.105(12)).
  const timeRow = (k, field, z) => {
    const v = duty[field];
    if (!v) return null;
    const plan = plannedOf(duty, field);
    const sub = [z ? `${z}Z` : null, plan ? l(`previsto ${plan}`, `planned ${plan}`) : null].filter(Boolean).join(' · ');
    return { k, v, node: (
      <View style={{ alignItems: 'flex-end' }}>
        <View style={s.realLine}>
          {plan ? <View style={s.realTag}><Text style={s.realTagT}>{l('real', 'actual')}</Text></View> : null}
          <Text style={s.rowV}>{v}</Text>
        </View>
        {sub ? <Text style={s.rowVZ}>{sub}</Text> : null}
      </View>
    ) };
  };
  // A régua das 24 h (B3): o dia todo (os serviços na cor do tipo, o repouso fora da base, a WOCL só quando o motor a dá).
  const prevDay = duties[addDayIso(date, -1)];
  const nowD = new Date();
  const ruler = dayRuler({ iso: date, ordered: orderServices(day), prevOrdered: orderServices(prevDay), ns: hasNs(day), prevNs: hasNs(prevDay), base: baseD,
    postFlightMin: ctxAll.postFlightMin || 0, nowMin: date === todayISO ? nowD.getHours() * 60 + nowD.getMinutes() : null, lang, locale });
  const schedule = (
    <Card kind={l('Horário', 'Schedule')} src={srcLbl}>
      <DayRuler ruler={ruler} C={C3} label={l('O dia em 24 horas: os serviços e o repouso', 'The day in 24 hours: duties and rest')} />
      <Panel rows={[
        timeRow(l('Apresentação', 'Report'), 'report_time', duty.report_time ? toZulu(date, duty.report_time) : null),
        timeRow(l('Calços fora', 'Off-blocks'), 'block_off', duty.block_off ? (zOf(firstLeg, 'off') || toZulu(date, duty.block_off)) : null),
        timeRow(l('Calços dentro', 'On-blocks'), 'block_on', duty.block_on ? (zOf(lastLeg, 'on') || toZulu(date, duty.block_on)) : null),
        timeRow(l('Fim de serviço', 'Sign-off'), 'signOff', duty.signOff ? toZulu(date, duty.signOff) : null),
        duty.flight_minutes && { k: l('Horas de voo', 'Flight hours'), v: minToHhmm(duty.flight_minutes) },
        (d && d.dutyPeriodStr) && { k: l('Horas de serviço', 'Duty hours'), v: d.dutyPeriodStr },
      ]} />
    </Card>
  );
  // O QUE FALTA PARA A LEI DECIDIR (2026-11-14, regra do Nuno: a app só lê o calendário e calcula — o cartão "Completar", onde se
  // preenchia à mão, SAIU). Fica o aviso, só informação: que factos faltam; têm de vir do calendário. Sem eles, o número é "incerto"
  // com as duas pontas (a lei é que manda).
  const completar = needRows.length ? (
    <View style={[s.needCard, { backgroundColor: C3.alert }]} accessible
      accessibilityLabel={`${needRows.length === 1 ? l('Para a lei decidir, falta 1 dado', 'For the law to decide, 1 fact is missing') : l(`Para a lei decidir, faltam ${needRows.length} dados`, `For the law to decide, ${needRows.length} facts are missing`)}: ${needRows.map((r) => tx(r.title)).join(', ')}`}>
      <Icon name="alert" size={16} color={CARD.onCard} />
      <View style={s.flex1}>
        <Text style={[TXT3.lineVal, { color: CARD.onCard }]}>{needRows.length === 1 ? l('Para a lei decidir, falta 1 dado', 'For the law to decide, 1 fact is missing') : l(`Para a lei decidir, faltam ${needRows.length} dados`, `For the law to decide, ${needRows.length} facts are missing`)}</Text>
        <Text style={[TXT3.cardSub, { color: CARD.onCardSub }]}>{l(`${needRows.map((r) => tx(r.title)).join(' · ')} — tem de vir do calendário.`, `${needRows.map((r) => tx(r.title)).join(' · ')} — it has to come from the calendar.`)}</Text>
      </View>
    </View>
  ) : null;


  const fatPill = fat ? (
    <View style={[s.fatPill, { backgroundColor: fat.band === 'high' ? PELE.warnSoft : CARD.chip }]}>
      <View style={[s.fatDot, { backgroundColor: fatDotC(fat.band) }]} />
      <Text style={[TXT3.dur, { color: fatTxtC(fat.band) }]}>{fatLabel(fat.band)}</Text>
    </View>
  ) : null;

  // ── O CARTÃO DE COR do serviço (o mesmo do Início e da Escala: data/escalaDay.js · dayCards): de onde, para onde, a perna
  // com as duas horas grandes (B2), o report, o fim e o que rende. ──
  const roleMoney = (() => {
    const role = duty.role || (duty.instructor ? 'instr' : null);
    if (!role || !ae) return null;
    const eur = roleEurFor(ae, catD, role, duty.sectors, date);   // a tabela do mês do serviço
    const def = (ae.ADDITIONAL_ROLES || []).find((r) => r.id === role);
    const lbl = (def && def.label && (def.label[lang] || def.label.pt)) || role;
    return { k: lbl, v: eur > 0 ? `+${fmtEur0(eur)}` : l('sem prestação no AE', 'no AE item'), color: eur > 0 ? MONEY.gain : null, eur: eur > 0 ? eur : 0 };
  })();
  const ranged = (svcEur && svcEur.max > svcEur.eur) || (posEur && posEur.max > posEur.eur);
  const payTotal = (perDiem || 0) + (svcEur ? svcEur.eur : 0) + (posEur ? posEur.eur : 0) + (duty.nightStop && nsEur != null ? nsEur : 0) + (roleMoney ? roleMoney.eur : 0);
  const mArr = []; mArr[idx] = money ? { total: (perDiem || 0) + (svcEur ? svcEur.eur : 0) + (posEur ? posEur.eur : 0), nightStop: nsEur || 0 } : null;
  const kindLabelD = (k) => (k === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + k, lang));
  const cityOfD = (code) => { const c = baseCityName(code, null, lang); return c && c !== code ? c : null; };
  const hero = dayCards({ iso: date, ordered: [{ svc: duty, idx }], open: true, money: mArr, kindLabel: kindLabelD, cityOf: cityOfD, nightStop: null,
    postFlightMin: ctxAll.postFlightMin || 0, lang, locale, fmtEur: fmtEur0 })[0];
  // ── B9 · O PSV numa barra: o valor com o máximo pequeno ("3:10 /13:00"), a barra a tinta e o que falta — nunca percentagem.
  // Quando a lei não fecha o máximo (duas pontas), dizem-se as duas; passa o limite = vermelho (o mapa: só quando passa). ──
  const psv = (d && d.isFdp && d.fdp && !sbAccD && (aeStricter || d.fdp.maxFdpMin != null)) ? (() => {
    const lo = aeStricter ? aeOnBlockMax : d.fdp.maxFdpMin;
    const hi = aeStricter ? aeOnBlockMax : (d.fdp.exact === false && d.fdp.maxHiMin != null ? d.fdp.maxHiMin : lo);
    const act = hasEnd ? d.fdp.actualFdpMin : null;
    return { lo, hi, act, two: hi !== lo, over: !!(over || aeOver) };
  })() : null;
  const psvBar = psv ? (
    <View style={[s.b9, { borderBottomColor: CARD.rule }]}>
      <Text style={[TXT3.kind, { color: C3.neutralKind }]}>{aeStricter ? l('PSV · acordo da TAP', 'FDP · TAP agreement') : l('Serviço de voo (PSV)', 'Flight duty period (FDP)')}</Text>
      <View style={s.b9Val}>
        <Text style={[TXT3.cardTitle, { color: psv.over ? PELE.red : C3.ink }]} allowFontScaling={false}>
          {psv.act != null ? hm(psv.act) : l('por calcular', 'not yet')}
          <Text style={[TXT3.line, { color: C3.tabSub }]}>{`  /${hm(psv.lo)}${psv.two ? `–${hm(psv.hi)}` : ''}`}</Text>
        </Text>
        {psv.act != null ? (
          <Text style={[TXT3.lineVal, { color: psv.over ? PELE.red : C3.ink }]}>
            {psv.over ? l(`passa ${hm(psv.act - psv.hi)}`, `over by ${hm(psv.act - psv.hi)}`)
              : psv.two ? l(`faltam ${hm(Math.max(0, psv.lo - psv.act))}–${hm(psv.hi - psv.act)}`, `${hm(Math.max(0, psv.lo - psv.act))}–${hm(psv.hi - psv.act)} left`)
              : l(`faltam ${hm(psv.lo - psv.act)}`, `${hm(psv.lo - psv.act)} left`)}
          </Text>
        ) : null}
      </View>
      <View style={[s.b9Track, { backgroundColor: CARD.onCardTrack }]}>
        <View style={[s.b9Fill, { width: `${psv.act != null && psv.hi ? Math.min(100, (psv.act / psv.hi) * 100) : 0}%`, backgroundColor: psv.over ? C3.stop : C3.ink }]} />
      </View>
    </View>
  ) : null;
  // O estado FTL numa linha (o mapa das cores: dentro sem cor; passa a vermelho com o ✕/alerta; incerto neutro tracejado).
  const stCol = statusPill.tone === 'red' ? PELE.red : statusPill.tone === 'warn' ? PELE.warnText : C3.ink;
  const statusRow = (
    <View style={[s.stRow, statusPill.tone === 'unc' ? [s.stUnc, { borderColor: C3.round }] : null]}>
      {statusPill.tone === 'ok' ? <View style={[s.stIc, { borderColor: C3.ink }]}><Icon name="check" size={11} color={C3.ink} /></View>
        : (statusPill.tone === 'red' || statusPill.tone === 'warn') ? <Icon name="alert" size={16} color={stCol} /> : null}
      <Text style={[TXT3.lineVal, s.flex1, { color: stCol }]}>{statusPill.txt}</Text>
      {duty.dirty ? <View style={s.pendRow}><View style={[s.pendDot, { backgroundColor: C3.alert }]} /><Text style={[TXT3.cardSub, { color: C3.tabSub }]}>{t('duties.pending', lang)}</Text></View> : null}
    </View>
  );
  const limits = (
    <Card kind={l('Limites · FTL', 'Limits · FTL')}>
      {(!d && !duty.report_time && (duty.kind || 'flight') === 'flight') ? (
        <Panel rows={[{ k: l('PSV', 'FDP'), v: l('não calculado — falta a hora de apresentação', 'not calculated — the report time is missing'), color: PELE.warnText }]} />
      ) : null}
      {d ? (
        <>
          {psvBar}
          {statusRow}
          <Panel rows={[
            aeStricter
              ? { k: l('Calços até às', 'On-blocks by'), v: `${fmtClock(aeFdp.latestOnBlock)}${aeFdp.latestOnBlock - (dayNum(date) * 1440) >= 1440 ? ' (+1)' : ''}`,
                  node: aeTagged(`${fmtClock(aeFdp.latestOnBlock)}${aeFdp.latestOnBlock - (dayNum(date) * 1440) >= 1440 ? ' (+1)' : ''}`), prova: aePsvProva }
              : (!sbAccD && d.latestOnBlockStr) && { k: d.fdp.exact === false ? l('Calços até às (garantido)', 'On-blocks by (guaranteed)') : l('Calços até às', 'On-blocks by'), v: `${d.latestOnBlockStr}${d.latestOnBlockNextDay ? ' (+1)' : ''}`, prova: provaFor('psvMax', provaCtx) },
            psv && !aeStricter && { k: l('PSV máximo', 'FDP max'), v: d.fdp.exact === false ? `${d.fdp.maxFdpStr}–${d.fdp.maxHiStr}` : d.fdp.maxFdpStr, prova: provaFor('psvMax', provaCtx) },
            aeOver && { k: l('Excesso (acordo)', 'Excess (agreement)'), v: fmtDur(aeFdp.value - aeFdp.limit), color: PELE.red },
            aeNext && { k: l('Próxima saída de calços', 'Next off-blocks'), v: `${fmtClock(aeNext.at)}${Math.floor(aeNext.at / 1440) > dayNum(date) ? ' (+1)' : ''}`,
              node: aeTagged(`${fmtClock(aeNext.at)}${Math.floor(aeNext.at / 1440) > dayNum(date) ? ' (+1)' : ''}`), prova: aeRestProva },
            sbAccD && { k: l('PSV', 'FDP'), v: kind === 'standby_airport' ? l('não se aplica — standby (225)', 'not applicable — standby (225)')
              : l('não se aplica — sem setores (ORO.FTL.105(12))', 'not applicable — no sectors (ORO.FTL.105(12))') },
            (sbAccD && hasEnd && d.fdp && d.fdp.actualFdpStr) && { k: l('Duração', 'Duration'), v: d.fdp.actualFdpStr },
            (spD.discretion && d.discretion) && { k: l('Discrição 205(f)', 'Discretion 205(f)'),
              v: d.discretion.over
                ? l(`ACIMA da margem (máx c/ discrição ${d.discretion.maxStr})`, `BEYOND the margin (max w/ discretion ${d.discretion.maxStr})`)
                : l(`usada — dentro da margem (até ${d.discretion.maxStr}) · reportável`, `used — within the margin (up to ${d.discretion.maxStr}) · reportable`),
              color: d.discretion.over ? PELE.red : PELE.warnText },
            (over && d.fdp.excessStr) && { k: l('Excesso', 'Excess'), v: d.fdp.excessStr, color: PELE.red },
            (!sbAccD && d.acclim && d.acclim.letter && d.acclim.letter !== 'in') && { k: l('Aclimatação (Quadro 1)', 'Acclimatisation (Table 1)'),
              v: d.acclim.letter === 'X' ? l('X — desconhecida · Quadro 3', 'X — unknown · Table 3')
                : d.acclim.letter === 'D' ? l('D — à hora local · Quadro 2', 'D — to local time · Table 2')
                : l('B — à hora da base · Quadro 2', 'B — to home-base time · Table 2') },
            (!sbAccD && d.extUsed && !over) && { k: l('Prolongamento (205(d))', 'Extension (205(d))'), v: l('planeado · repouso a seguir +2 h (ou +4 h)', 'planned · next rest +2 h (or +4 h)') },
            (!sbAccD && over && d.extRefused === '2in7') && { k: l('Prolongamento (205(d))', 'Extension (205(d))'), v: l('3.º em 7 dias — o limite é 2', '3rd in 7 days — the limit is 2'), color: PELE.red },
            (!sbAccD && sbNote) && { k: l('Assistência antes do voo', 'Standby before the flight'), note: sbNote },
            (!sbAccD && !over && d.fdp.uncertain) && { k: l('Incerto', 'Uncertain'), note: l(`Falta ${unknownsText(d.fdp.unknowns, 'pt')}.`, `Missing: ${unknownsText(d.fdp.unknowns, 'en')}.`) },
            (!sbAccD && over && d.fdp.exact === false && (d.fdp.unknowns || []).length > 0) && { k: l('Dois máximos', 'Two maximums'), note: l(`Falta ${unknownsText(d.fdp.unknowns, 'pt')}.`, `Missing: ${unknownsText(d.fdp.unknowns, 'en')}.`) },
            (hasEnd && d.rest && d.rest.restStr) && { k: l('Repouso mínimo depois', 'Min rest after'), v: d.rest.restStr, prova: provaFor('repouso', provaCtx) },
            fat && { k: l('Fadiga', 'Fatigue'), node: fatPill },
          ]} />
          {tapAe && aeFdp && aeFdp.limit == null ? (
            <Text style={[TXT3.cardSub, { color: C3.soft }]}>
              {{
                'sem-coluna': l('O acordo da TAP não tem limite para 5 ou mais aterragens: vale a regra europeia.', 'The TAP agreement has no limit for 5 or more landings: EU rules apply.'),
                'sem-fuso': l('Longo curso sem a hora UTC dos voos: a app não sabe a hora local de cada escala. Vale a regra europeia.', 'Long haul without the flights\' UTC times: the app does not know the local time at each station. EU rules apply.'),
                'sem-rotacao': l('Longo curso: a escala não mostra o início da rotação, por isso a app não sabe a aclimatização. Vale a regra europeia.', 'Long haul: the roster does not show the start of the rotation, so the app cannot tell acclimatisation. EU rules apply.'),
                'sem-banda': l('Mais de 12 h de diferença horária: fora do quadro do acordo da TAP (RUPT Cl. 23.ª, n.º 4). Vale a regra europeia.', 'More than 12 h of time difference: outside the TAP agreement table (RUPT Cl. 23, no. 4). EU rules apply.'),
                'sem-valor': l('O quadro do acordo da TAP não tem valor para 4 aterragens a esta hora. Vale a regra europeia.', 'The TAP agreement table has no value for 4 landings at this time. EU rules apply.'),
              }[aeFdp.reason] || l('Falta a posição de um aeroporto: a app não sabe se este voo é de médio curso. Vale a regra europeia.', 'An airport position is missing: the app cannot tell whether this flight is medium haul. EU rules apply.')}
            </Text>
          ) : null}
          {aeOk ? (
            <Text style={[TXT3.cardSub, { color: C3.soft }]}>
              {aeStricter ? l('Vale o limite mais apertado. ', 'The tighter limit applies. ') : l('Aqui a regra europeia é a mais apertada. ', 'Here the EU rule is the tighter one. ')}
              {l(`Acordo da TAP: ${fmtDur(aeFdp.limit)}, contado até 30 min depois dos calços (${aeFdpCl} e ${ctD === 'pilot' ? 'RUPT Cl. 6.ª, n.º 40' : 'RUPT Cl. 4.ª, n.º 25'}), ou seja ${fmtDur(aeOnBlockMax)} até aos calços.`,
                `TAP agreement: ${fmtDur(aeFdp.limit)}, counted to 30 min after on-blocks (${aeFdpCl.replace('.ª', '')} and ${ctD === 'pilot' ? 'RUPT Cl. 6, no. 40' : 'RUPT Cl. 4, no. 25'}), i.e. ${fmtDur(aeOnBlockMax)} to on-blocks.`)}
              {aeLc && aeFdp.limitMax ? l(` Longo curso: ${fmtDur(aeFdp.limit)} ou ${fmtDur(aeFdp.limitMax)}, conforme a aclimatização, que o acordo deixa em aberto aqui; a app mostra o mais apertado.`, ` Long haul: ${fmtDur(aeFdp.limit)} or ${fmtDur(aeFdp.limitMax)} depending on acclimatisation, which the agreement leaves open here; the app shows the tighter one.`) : ''}
              {aeFdp.reason === 'pode-ter-reforco' ? l(' Acima disto, só com tripulação reforçada (RUPT Cl. 42.ª), que a escala não mostra.', ' Beyond this, only with an augmented crew (RUPT Cl. 42), which the roster does not show.') : ''}
              {aeFdp.reason === 'pode-ter-ldmcr' ? l(' Acima disto, só com descanso a bordo (RUPT Cl. 24.ª, n.º 2), que a escala não mostra.', ' Beyond this, only with crew rest on board (RUPT Cl. 24, no. 2), which the roster does not show.') : ''}
              {easaMax != null ? l(` Regra europeia: ${fmtDur(easaMax)} até aos calços (ORO.FTL.205).`, ` EU rule: ${fmtDur(easaMax)} to on-blocks (ORO.FTL.205).`) : ''}
            </Text>
          ) : null}
          {aeNext ? (
            <Text style={[TXT3.cardSub, { color: C3.soft }]}>
              {l(`Próxima saída: ${fmtDur(aeNext.rest)} de repouso na base e ${fmtDur(aeNext.trans)} de transição (${ctD === 'pilot' ? 'RUPT Cl. 25.ª, n.º 2, Cl. 34.ª, n.º 2, e Cl. 24.ª, n.º 3' : 'RUPT Cl. 29.ª, n.os 2 e 7, e Cl. 32.ª, n.º 4'}), contadas a partir dos calços.`,
                `Next departure: ${fmtDur(aeNext.rest)} rest at base and ${fmtDur(aeNext.trans)} transition (${ctD === 'pilot' ? 'RUPT Cl. 25, no. 2, Cl. 34, no. 2, and Cl. 24, no. 3' : 'RUPT Cl. 29, nos. 2 and 7, and Cl. 32, no. 4'}), counted from on-blocks.`)}
            </Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
  // A pernoita: o hotel da estação (catálogo pessoal) — "Mapas ↗" abre fora da app (A2) e "Ligar"; sem hotel, guardá-lo.
  const nsSt = duty.nightStop ? nightStopStation(duty, baseD) : null;
  const nsHotel = nsSt ? (ctxAll.hotels || {})[nsSt] : null;
  const nightStop = duty.nightStop ? (
    <Card kind={`${l('Pernoita', 'Night stop')}${nsSt ? ` · ${cityOfD(nsSt) || nsSt}` : ''}`}>
      {nsHotel ? (
        <TouchableOpacity style={[s.hotel, { backgroundColor: CARD.chip }]} activeOpacity={0.85}
          onPress={() => { select(); Linking.openURL(hotelMapsUrl(nsHotel.name, nsSt, Platform.OS)).catch(() => {}); }}
          onLongPress={() => { select(); setHotelOpen(true); }}
          accessibilityRole="button" accessibilityLabel={`${l('Hotel', 'Hotel')} ${nsHotel.name}`}
          accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
          <View style={[s.hotelIc, { backgroundColor: C3.neutral }]}><Icon name="bed" size={18} color={C3.ink} /></View>
          <View style={s.flex1}>
            <Text style={[TXT3.lineVal, { color: C3.ink }]} numberOfLines={1}>{nsHotel.name}</Text>
            {nsHotel.note ? <Text style={[TXT3.cardSub, { color: C3.tabSub }]} numberOfLines={1}>{nsHotel.note}</Text> : null}
          </View>
          <View style={s.hotelActs}>
            <View style={[s.hpill, { backgroundColor: C3.neutral }]}><Text style={[TXT3.dur, { color: C3.ink }]}>{l('Mapas ↗', 'Maps ↗')}</Text></View>
            {nsHotel.phone ? (
              <TouchableOpacity style={[s.hpill, { backgroundColor: C3.neutral }]} hitSlop={6}
                onPress={() => { select(); Linking.openURL(hotelTelUrl(nsHotel.phone)).catch(() => {}); }}
                accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
                <Icon name="phone" size={12} color={C3.ink} /><Text style={[TXT3.dur, { color: C3.ink }]}>{l('Ligar', 'Call')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[s.hotelAdd, { borderColor: CARD.rule }]} activeOpacity={0.8} onPress={() => { select(); setHotelOpen(true); }} accessibilityRole="button">
          <Text style={[TXT3.lineVal, { color: C3.ink }]}>＋ {l('Guardar o hotel desta pernoita', 'Save this night stop’s hotel')}</Text>
        </TouchableOpacity>
      )}
    </Card>
  ) : null;
  // O pagamento: as parcelas (a verde o que se ganha) e o total com os cêntimos pequenos (A1) — só quando nada é um intervalo.
  const [payI, payC] = Number(payTotal).toFixed(2).split('.');
  const payment = (
    <Card kind={l('Pagamento · estimado', 'Pay · estimated')}>
      <Panel rows={[
        (perDiem != null) && { k: l('Per diem (AE)', 'Per diem'), v: `+${fmtEur0(perDiem)}`, color: MONEY.gain, prova: provaFor('perDiem', provaCtx) },
        (svcEur != null) && { k: svcEur.lbl, v: svcEur.max > svcEur.eur ? `+${fmtEur0(svcEur.eur)} ${l('a', 'to')} ${fmtEur0(svcEur.max)}` : `+${fmtEur0(svcEur.eur)}`, color: MONEY.gain },
        (posEur != null) && { k: l('Posicionamento', 'Positioning'), v: posEur.max > posEur.eur ? `+${fmtEur0(posEur.eur)} ${l('a', 'to')} ${fmtEur0(posEur.max)}` : `+${fmtEur0(posEur.eur)}`, color: MONEY.gain },
        duty.sectors && { k: l('Setores', 'Sectors'), v: String(duty.sectors) },
        duty.nightStop && { k: l('Paragem noturna', 'Night stop'), v: nsEur != null ? `+${fmtEur0(nsEur)}` : l('Sim', 'Yes'), color: nsEur != null ? MONEY.gain : null, prova: provaFor('pernoita', provaCtx) },
        roleMoney,
        duty.dayOffWorked && { k: l('Folga publicada trabalhada', 'Worked published day off'), v: String(duty.dayOffWorked).toUpperCase().replace('+', ' + ') },
        duty.kind === 'office' && duty.officeType === 'ofc8' && { k: l('Dia de escritório', 'Office day'), v: l('Dia inteiro (OFC8) · 3 setores', 'Full day (OFC8) · 3 sectors') },
      ]} />
      {(payTotal > 0 && !ranged) ? (
        <View style={[s.totRow, { borderTopColor: C3.ink }]}>
          <Text style={[TXT3.lineVal, s.flex1, { color: C3.ink }]}>{l('Este serviço', 'This duty')}</Text>
          <Text style={[TXT3.slimVal, { color: C3.ink }]} allowFontScaling={false}>
            {lang === 'en' ? `€${payI.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : payI.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            <Text style={[TXT3.line, { color: C3.tabSub }]}>{lang === 'en' ? `.${payC}` : `,${payC} €`}</Text>
          </Text>
        </View>
      ) : null}
    </Card>
  );
  // Os outros serviços do mesmo dia (210/245): a linha com o tipo (B7) — tocar abre esse serviço.
  const others = (idx === 0 && Array.isArray(duty.extra) && duty.extra.length) ? (
    <Card kind={l('Outros serviços neste dia', 'Other duties this day')}>
      {duty.extra.map((sv, i) => {
        if (!sv) return null;
        const rr = ftlForDuty(sv, { postFlightMin: ctxAll.postFlightMin || 0, isPilot: isPilotD, base: baseD, date, cabinGapMin: gapD, splitAdminMin: ctxAll.splitAdminMin });
        const fl = !sv.kind || sv.kind === 'flight';
        const lbl = fl ? (String(sv.route || '').replace(/-/g, ' → ') || l('Voo', 'Flight')) : t('duties.kind.' + sv.kind, lang);
        const psvX = (rr && rr.isFdp && rr.fdp.actualFdpStr) ? rr.fdp.actualFdpStr : null;   // só PSV de quem tem setores
        return (
          <TouchableOpacity key={`x${i}`} style={s.b7} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={lbl}
            onPress={() => { select(); if (onOpenService) onOpenService(i + 1); else navigation.push('DutyDetail', { date, idx: i + 1 }); }}>
            <View style={[s.b7Sq, { backgroundColor: fl ? C3.flight : C3.ground }]}><Icon name={fl ? 'plane' : 'home'} size={17} color={CARD.onCard} /></View>
            <View style={s.flex1}>
              <Text style={[TXT3.lineVal, { color: C3.ink }]} numberOfLines={1}>{lbl}</Text>
              <Text style={[TXT3.cardSub, { color: C3.tabSub }]} numberOfLines={1}>{`${sv.report_time || '—'} → ${sv.block_on || '—'}${psvX ? `  ·  PSV ${psvX}` : ''}`}</Text>
            </View>
            <Icon name="chevron" size={14} color={C3.tabSub} />
          </TouchableOpacity>
        );
      })}
      <Text style={[TXT3.cardSub, { color: C3.tabSub }]}>{l('Os serviços do dia somam nos 28 dias (210).', 'The day’s duties add up over 28 days (210).')}</Text>
    </Card>
  ) : null;

  return (
    <View style={s.body}>
      {hero ? <HomeCards cards={[{ ...hero, open: onCollapse ? hero.open : null }]} C={C3} onOpen={() => { if (onCollapse) { select(); onCollapse(); } }} l={l} /> : null}
      {limits}
      {completar}
      {schedule}
      {nightStop}
      {payment}
      {others}
      {/* A escala vem do calendário e só se lê (regra do Nuno, 2026-11-14: "o calendário vem sempre correto e sincronizado; se não
          estiver, é corrigido no calendário"). Saíram as portas das horas reais e do dado em falta. */}
      <Text style={[TXT3.cardSub, s.srcNote]}>{duty.source === 'pdf'
        ? l('A escala vem do PDF. Se algo estiver errado, importa o PDF atualizado: a app mostra a mudança para confirmares.', 'The roster comes from the PDF. If something is wrong, import the updated PDF: the app shows the change for you to confirm.')
        : l('A escala vem do calendário. Se algo estiver errado, corrige-se no eCrew e a app atualiza ao sincronizar.', 'The roster comes from the calendar. If something is wrong, it is fixed in eCrew and the app updates when you sync.')}</Text>
      {isManual && idx === 0 ? (
        <TouchableOpacity style={s.delBtn} activeOpacity={0.8} onPress={confirmDelete}>
          <Icon name="trash" size={16} color={PELE.red} />
          <Text style={[TXT3.lineVal, { color: PELE.red }]}>{l('Apagar serviço', 'Delete duty')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[TXT.caption, s.foot, { color: C3.tabSub }]}>{duty.source === 'pdf'
          ? l('Importado de um PDF — para o remover, importa na Escala o PDF atualizado da escala; os cancelados aparecem na revisão para confirmares.', 'Imported from a PDF — to remove it, import the updated roster PDF in the roster tab; cancellations show up in the review for you to confirm.')
          : l('Importado do calendário — para o remover, corrige na fonte (eCrew) e toca Sincronizar na Escala; os cancelados aparecem na revisão para confirmares.', 'Imported from the calendar — to remove it, fix it at the source (eCrew) and tap Sync in the roster; cancellations show up in the review for you to confirm.')}</Text>
      )}
      <Text style={[TXT.caption, s.foot, { color: C3.tabSub }]}>{t('common.ftlEstimate', lang)}</Text>

      {/* Hotel da pernoita — registar/editar o hotel desta estação (catálogo pessoal). */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={nsSt} />
      <ProvaSheet visible={!!prova} onClose={() => setProva(null)} prova={prova} lang={lang} />
    </View>
  );
}

// O ECRÃ do Detalhe (os caminhos de fora da Escala: o Início, as notificações, os outros serviços do dia): a moldura — a faixa
// lateral, o voltar e o deslizar — à volta do corpo inteiro.
export default function DutyDetailScreen({ route, navigation }) {
  const { lang, duties } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const [edited, setEdited] = useState(false);
  const date = route.params?.date;
  const idx = Math.max(0, Number(route.params?.idx) || 0);
  const day = date ? duties[date] : null;
  const duty = !day ? null : idx > 0 ? ((Array.isArray(day.extra) ? day.extra : [])[idx - 1] || null) : day;
  const goBack = () => {
    if (edited) navigation.navigate('EscalaMain', { flashDuty: date, flashTs: Date.now() });
    else navigation.goBack();
  };
  const BackBtn = () => (
    <View style={s.topbar}>
      <IconButton icon="back" onPress={goBack} label={t('common.back', lang)} style={{ backgroundColor: C3.round }} />
    </View>
  );
  if (!duty || (day && day.deleted)) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <BackBtn />
        <View style={{ padding: GUTTER }}>
          <Text style={s.muted}>{l('Serviço não encontrado.', 'Duty not found.')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C3.sheet }]} edges={['top']}>
      <BackBtn />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <DutyDetailBody date={date} idx={idx} editReq={route.params?.edit} navigation={navigation} onEdited={() => setEdited(true)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  topbar: { flexDirection: 'row', paddingHorizontal: GUTTER, paddingTop: SPACE.sm, paddingBottom: SPACE.sm },
  scroll: { paddingHorizontal: SPACE.md, paddingTop: SPACE.xs },
  flex1: { flex: 1, minWidth: 0 },
  muted: { ...TXT.body, color: PELE.grey },

  // O "Ver tudo" no 3.0 (design/detalhe-3.html, B): os cartões neutros de cada tema, empilhados
  body: { gap: SPACE.sm },
  card: { borderRadius: RADIUS.xxl, padding: SPACE.lg, gap: SPACE.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  // as linhas de um cartão (o Panel: rótulo à esquerda · valor à direita · o § por baixo do rótulo · as notas)
  panel: { },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, minHeight: 44, paddingVertical: SPACE.sm, borderTopWidth: 1, borderTopColor: CARD.rule },
  rowFirst: { borderTopWidth: 0 },
  rowK: { ...TXT3.line, flex: 1, color: C3.ink },
  rowNote: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: SPACE.xxs },
  rowNoteT: { ...TXT3.cardSub, color: C3.soft },
  rowV: { ...TXT3.lineVal, color: C3.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  rowLaw: { ...TXT.caption, color: C3.tabSub, marginTop: SPACE.xxs },   // § inline da PROVA (metadado; abre a folha da lei)
  rowLawS: { color: C3.tabSub },
  rowVZ: { ...TXT.caption, color: C3.tabSub, fontVariant: ['tabular-nums'], textAlign: 'right', marginTop: SPACE.xxs },
  // hora real ao lado da prevista
  realLine: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  realTag: { backgroundColor: CARD.chip, borderRadius: RADIUS.xs, paddingHorizontal: SPACE.s, paddingVertical: SPACE.xxs },
  realTagT: { ...TXT.tag, color: C3.ink },
  // B9 · a barra do limite
  b9: { gap: SPACE.s, paddingBottom: SPACE.md, borderBottomWidth: 1 },
  b9Val: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm },
  b9Track: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  b9Fill: { height: 8, borderRadius: RADIUS.pill },
  // o estado FTL numa linha
  stRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 32 },
  stUnc: { borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.pill, paddingHorizontal: SPACE.md },
  stIc: { width: 20, height: 20, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  pendDot: { width: 7, height: 7, borderRadius: RADIUS.pill },
  fatPill: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs },
  fatDot: { width: 7, height: 7, borderRadius: RADIUS.pill },
  // a marca "AE" ao lado do valor (os limites do acordo da TAP)
  aeVal: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  aeTag: { backgroundColor: C3.ink, borderRadius: RADIUS.xs, paddingHorizontal: SPACE.s, paddingVertical: SPACE.xxs },
  aeTagT: { ...TXT.tag, color: C3.sheet },
  // completar
  needCard: { flexDirection: 'row', gap: SPACE.md, borderRadius: RADIUS.xxl, padding: SPACE.lg },
  crow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 52, paddingVertical: SPACE.sm, borderTopWidth: 1 },
  crowV: { maxWidth: '45%', textAlign: 'right' },
  needDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  // a pernoita
  hotel: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderRadius: RADIUS.lg, padding: SPACE.md },
  hotelIc: { width: 36, height: 36, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  hotelActs: { flexDirection: 'row', gap: SPACE.s },
  hpill: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.s },
  hotelAdd: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: SPACE.md, alignItems: 'center' },
  // o total do pagamento (A1)
  totRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.md, paddingTop: SPACE.sm, borderTopWidth: 1.5 },
  // B7 · a linha com o tipo (outros serviços)
  b7: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 48 },
  b7Sq: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  // ações e notas
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, minHeight: 44 },
  foot: { paddingHorizontal: SPACE.xs },

  // A nota da fonte no fim (2026-11-14: a escala só se lê; corrige-se no calendário)
  srcNote: { color: CARD.day.tabSub, marginTop: SPACE.sm },
});
