import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER, BRAND, TXT, SPACE, RADIUS } from '../data/constants';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import PeleSide from '../components/PeleSide';
import PeleHeader from '../components/PeleHeader';
import FactSheet from '../components/FactSheet';
import PeleSheet from '../components/PeleSheet';
import { completeRows, realTimesPatch, missingFields, plannedOf, isClock } from '../data/dutyComplete';
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

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// Detalhe de um serviço — o "Ver tudo" da folha do dia. Fiel a design/detalhe-servico.html (v2, aprovado 2026-11-08):
// herói (rota + FANTASMA=FDP + estado FTL) + Horário · Setores (vêm do calendário: SÓ SE LEEM — regra 4) · FTL/Segurança ·
// COMPLETAR (os factos que a lei ou o acordo precisam e o calendário não traz, um de cada vez — data/dutyComplete.js) ·
// Pernoita · Pagamento. O "Editar serviço" saiu: a saída "O calendário está errado?" leva às horas reais ou ao dado em falta.
// Tudo derivado dos motores — a duty NÃO guarda FDP/per-diem. Apagar SÓ nos manuais (a fonte manda nos importados).
export default function DutyDetailScreen({ route, navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang, duties, crewAt, removeDuty, saveDuty, updateDutyService, notify } = ctxAll;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const [fact, setFact] = useState(null);           // a linha do "Completar" aberta (a folha de UM dado)
  const lastFact = useRef(null);                    // a folha desce com o conteúdo (não pisca vazia ao fechar)
  if (fact) lastFact.current = fact;
  const sf = fact || lastFact.current;
  const [fixOpen, setFixOpen] = useState(false);    // "O calendário está errado?" — as duas portas
  const afterFix = useRef(null);                    // a folha a abrir DEPOIS de esta fechar (PeleSheet.onClosed — nunca dois Modais a cruzar-se)
  const [realOpen, setRealOpen] = useState(false);  // porta 1: as horas reais
  const [missOpen, setMissOpen] = useState(false);  // porta 2: o dado que faltou no calendário
  const [edited, setEdited] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);   // folha "Hotel da pernoita" (registar/editar)
  const [prova, setProva] = useState(null);            // folha da PROVA ("a lei deste número")

  const date = route.params?.date;
  // `edit` (Início v6, tecla "Registar o sign-off"): abre logo as HORAS REAIS (o formulário inteiro saiu, 2026-11-08).
  const editReq = route.params?.edit;
  useEffect(() => { if (editReq) setRealOpen(true); }, [editReq]);
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
  const idx = Math.max(0, Number(route.params?.idx) || 0);
  const day = date ? duties[date] : null;
  const duty = !day ? null : idx > 0 ? ((Array.isArray(day.extra) ? day.extra : [])[idx - 1] || null) : day;
  const goBack = () => {
    if (edited) navigation.navigate('EscalaMain', { flashDuty: date, flashTs: Date.now() });
    else navigation.goBack();
  };
  // DESFAZER em vez de confirmar (mockup design/desfazer.html, aprovado 2026-07-15):
  // apaga JÁ e oferece 5 s de "Desfazer" no toast — o Alert morreu. O objeto é capturado
  // ANTES; repor = saveDuty com ele (repõe deleted:false + re-deriva o FTL do dia; o sync
  // re-upserta sozinho). Local = desfazível; os importados continuam bloqueados (a fonte manda).
  const confirmDelete = () => {
    const captured = duties[date] ? { ...duties[date] } : null;
    if (!captured) return;
    warning();
    removeDuty && removeDuty(date);
    navigation.goBack();
    const wd = (lang === 'en' ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] : ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'])[new Date(`${date}T12:00:00`).getDay()];
    const what = captured.route ? String(captured.route).replace(/-/g, ' → ') : t('duties.kind.' + (captured.kind || 'flight'), lang);
    notify && notify(
      l('Serviço apagado', 'Duty deleted'), `${wd} ${Number(date.slice(8, 10))} · ${what}`, 'del',
      { label: l('Desfazer', 'Undo'), onPress: () => { success(); saveDuty && saveDuty(date, captured); } },
    );
  };

  const BackBtn = () => (
    <View style={s.topbar}>
      <IconButton icon="back" onPress={goBack} label={t('common.back', lang)} />
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

  const kind = duty.kind || 'flight';
  const isFlight = kind === 'flight';
  const isManual = !duty.source || duty.source === 'manual';
  const todayISO = isoDay();
  const tx = (v) => (v == null ? '' : typeof v === 'string' ? v : (lang === 'en' ? v.en : v.pt) || v.pt || '');
  // Grava UM facto: o serviço inteiro com só esse campo mudado (o saveDuty pede o serviço todo; a origem, a escala publicada
  // e as pernas ficam). Os extra gravam-se no seu lugar.
  const saveSvc = (patch, msg) => {
    if (idx > 0) updateDutyService && updateDutyService(date, idx - 1, { ...duty, ...patch });
    else saveDuty && saveDuty(date, { ...duty, ...patch });
    success(); setEdited(true);
    notify && notify(msg || l('Guardado', 'Saved'));
  };
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
    const cite = (t) => (t === 'airport' ? 'CS FTL.1.225(a)(2)' : 'CS FTL.1.225(b)(7)');
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
  const fixTitle = isManual ? l('As horas estão erradas?', 'Are the times wrong?') : duty.source === 'pdf' ? l('O PDF está errado?', 'Is the PDF wrong?') : l('O calendário está errado?', 'Is the calendar wrong?');

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
      ? { tone: 'warn', txt: needRows.length ? (needRows.length === 1 ? l('Incerto · falta 1 dado', 'Uncertain · 1 fact missing') : l(`Incerto · faltam ${needRows.length} dados`, `Uncertain · ${needRows.length} facts missing`)) : l('Incerto', 'Uncertain') }
      : { tone: 'ok', txt: l('Dentro do limite FTL', 'Within FTL limit') };

  // Fadiga — cores da pele
  const fatBg = (b) => b === 'high' ? PELE.redSoft : b === 'elevated' ? PELE.warnSoft : b === 'low' ? PELE.okSoft : PELE.soft;
  const fatDotC = (b) => b === 'high' ? PELE.red : b === 'elevated' ? PELE.warn : b === 'low' ? PELE.ok : PELE.grey;
  const fatTxtC = (b) => b === 'high' ? PELE.red : b === 'elevated' ? PELE.warn : b === 'low' ? PELE.ok : PELE.grey;
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
  // Secção: o rótulo à esquerda e, à direita, de ONDE vêm os dados (N26: "Details" da fonte vs. o que acrescentas).
  const Sec = ({ icon, children, src }) => (
    <View style={s.sec}>
      <Icon name={icon} size={13} color={PELE.grey} /><Text style={s.secTxt}>{children}</Text>
      {src ? <View style={s.secSrc}><Icon name="cal" size={12} color={PELE.grey} /><Text style={s.secSrcT}>{src}</Text></View> : null}
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
  const missing = missingFields(duty);
  const schedule = (
    <>
      <Sec icon="clock" src={srcLbl}>{l('Horário', 'Schedule')}</Sec>
      <Panel rows={[
        timeRow(l('Apresentação', 'Report'), 'report_time', duty.report_time ? toZulu(date, duty.report_time) : null),
        timeRow(l('Calços fora', 'Off-blocks'), 'block_off', duty.block_off ? (zOf(firstLeg, 'off') || toZulu(date, duty.block_off)) : null),
        timeRow(l('Calços dentro', 'On-blocks'), 'block_on', duty.block_on ? (zOf(lastLeg, 'on') || toZulu(date, duty.block_on)) : null),
        timeRow(l('Fim de serviço', 'Sign-off'), 'signOff', duty.signOff ? toZulu(date, duty.signOff) : null),
        duty.flight_minutes && { k: l('Horas de voo', 'Flight hours'), v: minToHhmm(duty.flight_minutes) },
        (d && d.dutyPeriodStr) && { k: l('Horas de serviço', 'Duty hours'), v: d.dutyPeriodStr },
      ]} />
      {/* Setores — off/on de cada setor (só leitura). Soma dos block = horas de voo. */}
      {isFlight && legs.length ? (
        <>
          <Sec icon="plane" src={srcLbl}>{l('Setores', 'Sectors')}</Sec>
          <Panel rows={legs.map((lg) => {
            const zo = zOf(lg, 'off'), zn = zOf(lg, 'on');
            return {
              k: `${lg.dh ? 'DH · ' : ''}${lg.flightNo ? `${lg.flightNo} · ` : ''}${lg.dep || '?'}→${lg.arr || '?'}`,
              node: (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.rowV}>{`${lg.off || '—'} → ${lg.on || '—'}`}</Text>
                  {(zo || zn) ? <Text style={s.rowVZ}>{`${zo || '—'} → ${zn || '—'}Z`}</Text> : null}
                </View>
              ),
            };
          })} />
        </>
      ) : null}
    </>
  );
  // COMPLETAR — uma linha por facto; a que falta (need) com o ponto e "Por indicar"; o cartão do Starling só com um "incerto".
  const completar = rows.length ? (
    <>
      <Sec icon="edit">{l('Completar', 'Complete')}</Sec>
      {needRows.length ? (
        <View style={s.needCard}>
          <Icon name="alert" size={16} color={PELE.warnText} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.needT}>{needRows.length === 1 ? l('Para a lei decidir, falta 1 dado', 'For the law to decide, 1 fact is missing') : l(`Para a lei decidir, faltam ${needRows.length} dados`, `For the law to decide, ${needRows.length} facts are missing`)}</Text>
            <Text style={s.needD}>{tx(needRows[0].sheet.intro)}</Text>
          </View>
        </View>
      ) : null}
      <View style={s.panel}>
        {rows.map((r, i) => (
          <TouchableOpacity key={r.id} style={[s.crow, i === 0 && s.rowFirst]} activeOpacity={0.7} onPress={() => { select(); setFact(r); }}
            accessibilityRole="button" accessibilityLabel={`${tx(r.title)}: ${tx(r.value)}`} accessibilityHint={l('Abre para indicar', 'Opens to fill in')}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.crowT}>{tx(r.title)}</Text>
              {r.cite ? <Text style={s.crowD} numberOfLines={1}>{r.cite}</Text> : null}
            </View>
            {r.need ? <View style={s.needDot} /> : null}
            <Text style={[s.crowV, r.need && s.crowVNeed]} numberOfLines={1}>{tx(r.value)}</Text>
            <Icon name="chevron" size={14} color={r.need ? PELE.warnText : PELE.affordance} />
          </TouchableOpacity>
        ))}
      </View>
      {!needRows.length ? <Text style={s.note}>{l('Só o que a lei ou o teu acordo precisam e o calendário não traz.', 'Only what the law or your agreement needs and the calendar does not bring.')}</Text> : null}
    </>
  ) : null;
  // As horas reais (porta 1): voo = calços fora/dentro e fim de serviço; os outros serviços = início e fim.
  const snapV = (f) => (duty.snap && duty.snap[f]) || null;
  const planHint = (f) => (snapV(f) ? { pt: `Na escala: ${snapV(f)}`, en: `Rostered: ${snapV(f)}` } : null);
  const realFields = isFlight ? [
    { key: 'off', type: 'time', label: { pt: 'Calços fora', en: 'Off-blocks' }, value: duty.block_off || '', optional: true, hint: planHint('block_off') },
    { key: 'on', type: 'time', label: { pt: 'Calços dentro', en: 'On-blocks' }, value: duty.block_on || '', optional: true, hint: planHint('block_on') },
    { key: 'signOff', type: 'time', label: { pt: 'Fim de serviço (sign-off)', en: 'Sign-off' }, value: duty.signOff || '', optional: true, hint: { pt: 'Depois do débrief. Vazio = calços dentro + o pós-voo do teu perfil.', en: 'After the debrief. Empty = on-blocks + your profile\'s post-flight time.' } },
  ] : [
    { key: 'start', type: 'time', label: { pt: 'Início', en: 'Start' }, value: duty.report_time || '', hint: planHint('report_time') },
    { key: 'end', type: 'time', label: { pt: 'Fim', en: 'End' }, value: duty.block_on || '', optional: true, hint: planHint('block_on') },
  ];
  const realPatch = (v) => (isFlight
    ? realTimesPatch(duty, { off: v.off && v.off !== duty.block_off ? v.off : null, on: v.on && v.on !== duty.block_on ? v.on : null, signOff: v.signOff || null }, { date })
    : { report_time: isClock(v.start) ? v.start : duty.report_time, block_on: isClock(v.end) ? v.end : (duty.block_on || null) });
  const missFields = missing.map((f) => ({ key: f.key, type: 'time', label: f.label, value: '' }));
  const missPatch = (v) => Object.fromEntries(missing.filter((f) => isClock(v[f.key])).map((f) => [f.key, v[f.key]]));


  const fatPill = fat ? (
    <View style={[s.fatPill, { backgroundColor: fatBg(fat.band) }]}>
      <View style={[s.fatDot, { backgroundColor: fatDotC(fat.band) }]} />
      <Text style={[s.fatTxt, { color: fatTxtC(fat.band) }]}>{fatLabel(fat.band)}</Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={(isFlight ? l('VOO', 'FLIGHT') : String(t('duties.kind.' + kind, lang) || '')).toUpperCase()} accent={((firstLeg && firstLeg.flightNo) || (isFlight ? routeStr : '')).toUpperCase()} />
      <BackBtn />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        {/* Herói — eyebrow + fantasma(FDP) + rota + kick + pílula de estado */}
        <PeleHeader
          size="detail" rule={false}
          eyebrow={`${isFlight ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang)} · ${fmtDate(date)}${date === todayISO ? ` · ${l('hoje', 'today')}` : ''}`}
          ghost={heroGhost || undefined}
          word={headMain}
          kick={kickParts.length ? kickParts.join(' · ') : undefined}
        />
        <View style={s.stbar}>
          <View style={[s.pill, statusPill.tone === 'red' ? s.pillRed : statusPill.tone === 'ok' ? s.pillOk : statusPill.tone === 'warn' ? s.pillWarn : s.pillNeutral]}>
            {statusPill.tone === 'ok' ? <Icon name="check" size={12} color={PELE.okText} /> : statusPill.tone === 'red' ? <Icon name="alert" size={12} color={PELE.red} /> : statusPill.tone === 'warn' ? <Icon name="alert" size={12} color={PELE.warnText} /> : null}
            <Text style={[s.pillTxt, { color: statusPill.tone === 'red' ? PELE.red : statusPill.tone === 'ok' ? PELE.okText : statusPill.tone === 'warn' ? PELE.warnText : PELE.grey }]}>{statusPill.txt}</Text>
          </View>
          {duty.dirty ? <View style={s.pendRow}><View style={s.pendDot} /><Text style={s.pendTxt}>{t('duties.pending', lang)}</Text></View> : null}
        </View>
        <View style={s.hr} />

        {!needRows.length ? schedule : null}

        {/* Sem hora de report → o motor devolve null e a secção FTL desaparecia em SILÊNCIO
            (device 2026-09-03). Honestidade: dizer que o PSV não foi calculado e como corrigir. */}
        {(!d && !duty.report_time && (duty.kind || 'flight') === 'flight') ? (
          <>
            <Sec icon="gauge">{l('FTL · Segurança', 'FTL · Safety')}</Sec>
            <Panel rows={[
              { k: l('PSV', 'FDP'), v: l('não calculado — falta a hora de apresentação', 'not calculated — the report time is missing'), color: PELE.warnText, go: () => setMissOpen(true) },
            ]} />
          </>
        ) : null}
        {d ? (
          <>
            <Sec icon="gauge">{l('FTL · Segurança', 'FTL · Safety')}</Sec>
            <Panel rows={[
              (hasEnd && d.fdp.actualFdpStr) && { k: sbAccD ? l('Duração', 'Duration') : l('FDP realizado', 'Actual FDP'), v: d.fdp.actualFdpStr, color: over ? PELE.red : null },
              aeStricter
                ? { k: l('PSV máx (FDP)', 'FDP max'), v: fmtDur(aeOnBlockMax), node: aeTagged(fmtDur(aeOnBlockMax)), prova: aePsvProva }
                : (!sbAccD && d.fdp.maxFdpStr) && { k: l('PSV máx (FDP)', 'FDP max'), v: d.fdp.exact === false ? `${d.fdp.maxFdpStr}–${d.fdp.maxHiStr}` : d.fdp.maxFdpStr, prova: provaFor('psvMax', provaCtx) },
              // A hora-limite de calços (2026-11-03): o número que toda a concorrência mostra primeiro —
              // o tripulante pensa em horas do relógio. Mesma hora da apresentação; +1 = dia seguinte.
              aeStricter
                ? { k: l('Calços até às', 'On-blocks by'), v: `${fmtClock(aeFdp.latestOnBlock)}${aeFdp.latestOnBlock - (dayNum(date) * 1440) >= 1440 ? ' (+1)' : ''}`,
                    node: aeTagged(`${fmtClock(aeFdp.latestOnBlock)}${aeFdp.latestOnBlock - (dayNum(date) * 1440) >= 1440 ? ' (+1)' : ''}`), prova: aePsvProva }
                : (!sbAccD && d.latestOnBlockStr) && { k: d.fdp.exact === false ? l('Calços até às (garantido)', 'On-blocks by (guaranteed)') : l('Calços até às', 'On-blocks by'), v: `${d.latestOnBlockStr}${d.latestOnBlockNextDay ? ' (+1)' : ''}`, prova: provaFor('psvMax', provaCtx) },
              aeOver && { k: l('Excesso (acordo)', 'Excess (agreement)'), v: fmtDur(aeFdp.value - aeFdp.limit), color: PELE.red },
              aeNext && { k: l('Próxima saída de calços', 'Next off-blocks'), v: `${fmtClock(aeNext.at)}${Math.floor(aeNext.at / 1440) > dayNum(date) ? ' (+1)' : ''}`,
                node: aeTagged(`${fmtClock(aeNext.at)}${Math.floor(aeNext.at / 1440) > dayNum(date) ? ' (+1)' : ''}`), prova: aeRestProva },
              sbAccD && { k: l('PSV', 'FDP'), v: kind === 'standby_airport' ? l('não se aplica — standby (225)', 'not applicable — standby (225)')
                : l('não se aplica — sem setores (ORO.FTL.105(12))', 'not applicable — no sectors (ORO.FTL.105(12))') },
              (spD.discretion && d.discretion) && { k: l('Discrição 205(f)', 'Discretion 205(f)'),
                v: d.discretion.over
                  ? l(`ACIMA da margem (máx c/ discrição ${d.discretion.maxStr})`, `BEYOND the margin (max w/ discretion ${d.discretion.maxStr})`)
                  : l(`usada — dentro da margem (até ${d.discretion.maxStr}) · reportável`, `used — within the margin (up to ${d.discretion.maxStr}) · reportable`),
                color: d.discretion.over ? PELE.red : PELE.warn },
              (over && d.fdp.excessStr) && { k: l('Excesso', 'Excess'), v: d.fdp.excessStr, color: PELE.red },
              // ORO.FTL.105(1) + Quadro 1: fora da faixa de 2 h da base, o estado de aclimatação decide o quadro.
              (!sbAccD && d.acclim && d.acclim.letter && d.acclim.letter !== 'in') && { k: l('Aclimatação (Quadro 1)', 'Acclimatisation (Table 1)'),
                v: d.acclim.letter === 'X' ? l('X — desconhecida · Quadro 3', 'X — unknown · Table 3')
                  : d.acclim.letter === 'D' ? l('D — à hora local · Quadro 2', 'D — to local time · Table 2')
                  : l('B — à hora da base · Quadro 2', 'B — to home-base time · Table 2') },
              // ORO.FTL.205(d): prolongamento planeado e dentro das condições; ou recusado (3.º em 7 dias / sem plano).
              (!sbAccD && d.extUsed && !over) && { k: l('Prolongamento (205(d))', 'Extension (205(d))'), v: l('planeado · repouso a seguir +2 h (ou +4 h)', 'planned · next rest +2 h (or +4 h)') },
              (!sbAccD && over && d.extRefused === '2in7') && { k: l('Prolongamento (205(d))', 'Extension (205(d))'), v: l('3.º em 7 dias — o limite é 2', '3rd in 7 days — the limit is 2'), color: PELE.red },
              // De onde vem a redução do máximo (visto no iPhone a 2026-11-13: "PSV máx 06:00 § 205(b)" sem dizer porquê).
              (!sbAccD && sbNote) && { k: l('Assistência antes do voo', 'Standby before the flight'), note: sbNote },
              // "A lei é que manda": entre o garantido e o possível, a lei depende de um dado que falta → incerto.
              (!sbAccD && !over && d.fdp.uncertain) && { k: l('Incerto', 'Uncertain'), note: l(`Falta ${unknownsText(d.fdp.unknowns, 'pt')}.`, `Missing: ${unknownsText(d.fdp.unknowns, 'en')}.`), color: PELE.warn },
              // … e quando EXCEDE nas duas leituras o máximo continua a ter duas pontas: diz-se porquê (visto no iPhone a
              // 2026-11-13: "06:00–10:00" sem explicação, com 7 h declaradas à mão contra as 11 h da escala).
              (!sbAccD && over && d.fdp.exact === false && (d.fdp.unknowns || []).length > 0) && { k: l('Dois máximos', 'Two maximums'), note: l(`Falta ${unknownsText(d.fdp.unknowns, 'pt')}.`, `Missing: ${unknownsText(d.fdp.unknowns, 'en')}.`), color: PELE.warn },
              (hasEnd && d.rest && d.rest.restStr) && { k: l('Repouso mínimo após', 'Min rest after'), v: d.rest.restStr, prova: provaFor('repouso', provaCtx) },
              fat && { k: l('Fadiga', 'Fatigue'), node: fatPill },
            ]} />
            {tapAe && aeFdp && aeFdp.limit == null ? (
              <Text style={s.aeWhy}>
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
              <Text style={s.aeWhy}>
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
              <Text style={s.aeWhy}>
                {l(`Próxima saída: ${fmtDur(aeNext.rest)} de repouso na base e ${fmtDur(aeNext.trans)} de transição (${ctD === 'pilot' ? 'RUPT Cl. 25.ª, n.º 2, Cl. 34.ª, n.º 2, e Cl. 24.ª, n.º 3' : 'RUPT Cl. 29.ª, n.os 2 e 7, e Cl. 32.ª, n.º 4'}), contadas a partir dos calços.`,
                  `Next departure: ${fmtDur(aeNext.rest)} rest at base and ${fmtDur(aeNext.trans)} transition (${ctD === 'pilot' ? 'RUPT Cl. 25, no. 2, Cl. 34, no. 2, and Cl. 24, no. 3' : 'RUPT Cl. 29, nos. 2 and 7, and Cl. 32, no. 4'}), counted from on-blocks.`)}
              </Text>
            ) : null}
          </>
        ) : null}

        {completar}
        {needRows.length ? schedule : null}

        {/* Pernoita — hotel da estação (catálogo pessoal, por IATA) — mapas + ligar. */}
        {duty.nightStop ? (() => {
          const st = nightStopStation(duty, baseD);
          const h = st ? (ctxAll.hotels || {})[st] : null;
          return (
            <>
              <Sec icon="bed">{l('Pernoita', 'Night stop')}{st ? ` · ${st}` : ''}</Sec>
              {h ? (
                <TouchableOpacity style={s.hotel} activeOpacity={0.85}
                  onPress={() => { select(); Linking.openURL(hotelMapsUrl(h.name, st, Platform.OS)).catch(() => {}); }}
                  onLongPress={() => { select(); setHotelOpen(true); }}
                  accessibilityRole="button" accessibilityLabel={`${l('Hotel', 'Hotel')} ${h.name}`}
                  accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
                  <View style={s.hotelIc}><Icon name="bed" size={19} color={PELE.ink} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.hotelName} numberOfLines={1}>{h.name}</Text>
                    {h.note ? <Text style={s.hotelNote} numberOfLines={1}>{h.note}</Text> : null}
                  </View>
                  <View style={s.hotelActs}>
                    <View style={s.hpillMap}><Icon name="pin" size={12} color="#2C6E8F" /><Text style={s.hpillMapTxt}>{l('Mapas', 'Maps')}</Text></View>
                    {h.phone ? (
                      <TouchableOpacity style={s.hpillCall} hitSlop={6}
                        onPress={() => { select(); Linking.openURL(hotelTelUrl(h.phone)).catch(() => {}); }}
                        accessibilityRole="button" accessibilityLabel={l('Ligar ao hotel', 'Call the hotel')}>
                        <Icon name="phone" size={12} color={PELE.ok} /><Text style={s.hpillCallTxt}>{l('Ligar', 'Call')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.hotelAdd} activeOpacity={0.8} onPress={() => { select(); setHotelOpen(true); }} accessibilityRole="button">
                  <Text style={s.hotelAddTxt}>＋ {l('adicionar hotel desta pernoita', 'add this night stop’s hotel')}</Text>
                </TouchableOpacity>
              )}
            </>
          );
        })() : null}

        <Sec icon="wallet">{l('Pagamento · detalhes', 'Pay · details')}</Sec>
        <Panel rows={[
          (perDiem != null) && { k: l('Per-diem (AE)', 'Per diem'), v: `+${fmtEur0(perDiem)}`, color: PELE.ok, prova: provaFor('perDiem', provaCtx) },
          (svcEur != null) && { k: svcEur.lbl, v: svcEur.max > svcEur.eur ? `+${fmtEur0(svcEur.eur)} ${l('a', 'to')} ${fmtEur0(svcEur.max)}` : `+${fmtEur0(svcEur.eur)}`, color: PELE.ok },
          (posEur != null) && { k: l('Posicionamento', 'Positioning'), v: posEur.max > posEur.eur ? `+${fmtEur0(posEur.eur)} ${l('a', 'to')} ${fmtEur0(posEur.max)}` : `+${fmtEur0(posEur.eur)}`, color: PELE.ok },
          duty.sectors && { k: l('Setores', 'Sectors'), v: String(duty.sectors) },
          duty.nightStop && { k: l('Paragem nocturna', 'Night stop'), v: nsEur != null ? `+${fmtEur0(nsEur)}` : l('Sim', 'Yes'), color: nsEur != null ? PELE.ok : null, prova: provaFor('pernoita', provaCtx) },
          (() => {
            const role = duty.role || (duty.instructor ? 'instr' : null);
            if (!role || !ae) return null;
            const eur = roleEurFor(ae, catD, role, duty.sectors, date);   // a tabela do mês do serviço
            const def = (ae.ADDITIONAL_ROLES || []).find((r) => r.id === role);
            const lbl = (def && def.label && (def.label[lang] || def.label.pt)) || role;
            return { k: lbl, v: eur > 0 ? `+${fmtEur0(eur)}` : l('sem prestação no AE', 'no AE item'), color: eur > 0 ? PELE.ok : null };
          })(),
          duty.dayOffWorked && { k: l('Folga publicada trabalhada', 'Worked published day off'), v: String(duty.dayOffWorked).toUpperCase().replace('+', ' + '), color: PELE.warn },
          duty.kind === 'office' && duty.officeType === 'ofc8' && { k: l('Dia de escritório', 'Office day'), v: l('Dia inteiro (OFC8) · 3 setores', 'Full day (OFC8) · 3 sectors') },
        ]} />

        {/* Outros períodos de serviço do MESMO dia (210/245) — lista compacta. */}
        {idx === 0 && Array.isArray(duty.extra) && duty.extra.length ? (
          <>
            <Sec icon="ellipsis">{l('Outros serviços neste dia', 'Other services this day')}</Sec>
            <Panel rows={duty.extra.map((sv, i) => {
              const rr = ftlForDuty(sv, { postFlightMin: ctxAll.postFlightMin || 0, isPilot: isPilotD, base: baseD, date, cabinGapMin: gapD, splitAdminMin: ctxAll.splitAdminMin });
              const lbl = (!sv.kind || sv.kind === 'flight') ? (sv.route || l('Voo', 'Flight')) : t('duties.kind.' + sv.kind, lang);
              const psv = (rr && rr.isFdp && rr.fdp.actualFdpStr) ? rr.fdp.actualFdpStr : null;   // só PSV de quem tem setores
              return { k: `${i + 2}. ${lbl}`, v: `${sv.report_time || '—'} → ${sv.block_on || '—'}${psv ? `  ·  PSV ${psv}` : ''}`, go: () => navigation.push('DutyDetail', { date, idx: i + 1 }) };
            })} />
            <Text style={s.foot}>{l('Os serviços do dia somam nos 28 dias (210). Vê o repouso entre eles na folha do dia.', 'The day’s services sum over 28 days (210). See the rest between them in the day detail.')}</Text>
          </>
        ) : null}

        {/* A saída discreta (Apple Wallet "Report an Issue"): as horas reais ou o dado que faltou — o resto corrige-se na fonte. */}
        <TouchableOpacity style={s.escape} activeOpacity={0.7} onPress={() => { select(); setFixOpen(true); }} accessibilityRole="button">
          <Text style={s.escapeT}>{fixTitle}</Text>
          <Icon name="chevron" size={13} color={PELE.ink} />
        </TouchableOpacity>

        {isManual && idx === 0 ? (
          <TouchableOpacity style={s.delBtn} activeOpacity={0.8} onPress={confirmDelete}>
            <Icon name="trash" size={16} color={PELE.red} />
            <Text style={s.delTxt}>{l('Apagar serviço', 'Delete duty')}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.foot}>{duty.source === 'pdf'
            ? l('Importado de um PDF — para o remover, importa na Escala o PDF atualizado da escala; os cancelados aparecem na revisão para confirmares.', 'Imported from a PDF — to remove it, import the updated roster PDF in the roster tab; cancellations show up in the review for you to confirm.')
            : l('Importado do calendário — para o remover, corrige na fonte (eCrew) e toca Sincronizar na Escala; os cancelados aparecem na revisão para confirmares.', 'Imported from the calendar — to remove it, fix it at the source (eCrew) and tap Sync in the roster; cancellations show up in the review for you to confirm.')}</Text>
        )}

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>

      {/* A folha de UM dado do Completar. */}
      <FactSheet visible={!!fact} onClose={() => setFact(null)} lang={lang}
        title={sf ? sf.title : ''} intro={sf ? sf.sheet.intro : null} cite={sf ? sf.cite : null} note={sf ? sf.sheet.note : null}
        fields={sf ? sf.sheet.fields : []} valid={sf ? sf.valid : null}
        onSave={(v) => { const r = fact; setFact(null); saveSvc(r.apply(v), l(`${tx(r.title)} · guardado`, `${tx(r.title)} · saved`)); }} />
      {/* "O calendário está errado?" — duas portas, cada uma com o seu formulário curto. */}
      <PeleSheet visible={fixOpen} onClose={() => setFixOpen(false)} onClosed={() => { const f = afterFix.current; afterFix.current = null; if (f) f(); }}>
        <Text style={s.fixT} accessibilityRole="header">{fixTitle}</Text>
        <Text style={s.fixD}>{isManual ? l('Há duas coisas que podes acrescentar aqui:', 'There are two things you can add here:') : l('A escala vem da fonte e a app não a muda. Há duas coisas que podes acrescentar aqui:', 'The roster comes from the source and the app does not change it. There are two things you can add here:')}</Text>
        <TouchableOpacity style={s.fixOpt} activeOpacity={0.8} onPress={() => { select(); afterFix.current = () => setRealOpen(true); setFixOpen(false); }} accessibilityRole="button">
          <View style={s.fixIc}><Icon name="clock" size={17} color={PELE.ink} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.crowT}>{l('Registar as horas reais', 'Record the actual times')}</Text>
            <Text style={s.crowD}>{isFlight ? l('Calços e fim de serviço quando houve atraso — a lei conta o real', 'Blocks and sign-off when there was a delay — the law counts the actual') : l('Início e fim, se não foram os da escala', 'Start and end, if they were not the rostered ones')}</Text>
          </View>
          <Icon name="chevron" size={14} color={PELE.affordance} />
        </TouchableOpacity>
        {missing.length ? (
          <TouchableOpacity style={s.fixOpt} activeOpacity={0.8} onPress={() => { select(); afterFix.current = () => setMissOpen(true); setFixOpen(false); }} accessibilityRole="button">
            <View style={s.fixIc}><Icon name="cal" size={17} color={PELE.ink} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.crowT}>{l('Faltou um dado', 'Something was missing')}</Text>
              <Text style={s.crowD}>{l(`Falta: ${missing.map((f) => f.label.pt.toLowerCase()).join(', ')}`, `Missing: ${missing.map((f) => f.label.en.toLowerCase()).join(', ')}`)}</Text>
            </View>
            <Icon name="chevron" size={14} color={PELE.affordance} />
          </TouchableOpacity>
        ) : null}
        {!isManual ? <Text style={s.fixFoot}>{duty.source === 'pdf'
          ? l('Outra coisa errada (rota, dia, serviço que não existe)? Importa na Escala o PDF atualizado: a app propõe a mudança para confirmares.', 'Something else wrong (route, day, a duty that does not exist)? Import the updated PDF in the roster: the app proposes the change for you to confirm.')
          : l('Outra coisa errada (rota, dia, serviço que não existe)? Corrige na fonte (eCrew) e toca em Sincronizar na Escala: a app propõe a mudança para confirmares.', 'Something else wrong (route, day, a duty that does not exist)? Fix it at the source (eCrew) and tap Sync in the roster: the app proposes the change for you to confirm.')}</Text> : null}
      </PeleSheet>
      <FactSheet visible={realOpen} onClose={() => setRealOpen(false)} lang={lang}
        title={{ pt: 'Horas reais', en: 'Actual times' }} intro={{ pt: 'O que aconteceu de facto. A escala publicada fica guardada ao lado, como prevista.', en: 'What actually happened. The published roster stays alongside, as planned.' }}
        cite="ORO.FTL.105(12)" fields={realFields}
        onSave={(v) => { setRealOpen(false); saveSvc(realPatch(v), l('Horas reais guardadas', 'Actual times saved')); }} />
      <FactSheet visible={missOpen} onClose={() => setMissOpen(false)} lang={lang}
        title={{ pt: 'Faltou um dado', en: 'Something was missing' }} intro={{ pt: 'O calendário não trouxe isto. Sem ele, a app não consegue calcular o PSV.', en: 'The calendar did not bring this. Without it, the app cannot calculate the FDP.' }}
        fields={missFields}
        onSave={(v) => { setMissOpen(false); saveSvc(missPatch(v), l('Guardado', 'Saved')); }} />
      {/* Hotel da pernoita — registar/editar o hotel desta estação (catálogo pessoal). */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={duty && duty.nightStop ? nightStopStation(duty, baseD) : null} />
      <ProvaSheet visible={!!prova} onClose={() => setProva(null)} prova={prova} lang={lang} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  topbar: { flexDirection: 'row', paddingHorizontal: GUTTER, paddingTop: 8 },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 2 },

  stbar: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.xs, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s, paddingHorizontal: SPACE.md, paddingVertical: SPACE.s, borderRadius: RADIUS.pill },
  pillOk: { backgroundColor: PELE.okSoft },
  pillRed: { backgroundColor: PELE.redSoft },
  pillWarn: { backgroundColor: PELE.warnSoft },
  pillNeutral: { backgroundColor: PELE.soft },
  pillTxt: { ...TXT.tag },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.warn },
  pendTxt: { ...TXT.tag, color: PELE.grey },
  hr: { height: 1.5, backgroundColor: PELE.ink, marginTop: SPACE.md },

  // Secções + painéis (a escala, design-system §9)
  sec: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s, marginTop: SPACE.xl, marginBottom: SPACE.sm },
  secTxt: { ...TXT.eyebrow, color: PELE.grey },
  secSrc: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  secSrcT: { ...TXT.caption, color: PELE.grey },
  panel: { borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, backgroundColor: PELE.paper, paddingHorizontal: SPACE.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, minHeight: 44, paddingVertical: SPACE.md, borderTopWidth: 1, borderTopColor: PELE.line },
  rowFirst: { borderTopWidth: 0 },
  rowK: { ...TXT.body, flex: 1, color: PELE.grey },
  rowNote: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', gap: SPACE.xxs },
  rowNoteT: { ...TXT.footnote, color: PELE.grey },
  rowV: { ...TXT.bodyStrong, color: PELE.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  // Hora real ao lado da prevista
  realLine: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  realTag: { backgroundColor: PELE.soft, borderRadius: RADIUS.xs, paddingHorizontal: SPACE.s, paddingVertical: SPACE.xxs },
  realTagT: { ...TXT.tag, color: PELE.ink },
  // Completar
  crow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 52, paddingVertical: SPACE.md, borderTopWidth: 1, borderTopColor: PELE.line },
  crowT: { ...TXT.bodyStrong, color: PELE.ink },
  crowD: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.xxs },
  crowV: { ...TXT.body, color: PELE.grey, maxWidth: '45%', textAlign: 'right' },
  crowVNeed: { ...TXT.bodyStrong, color: PELE.warnText },
  needDot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: PELE.warn },
  needCard: { flexDirection: 'row', gap: SPACE.md, backgroundColor: PELE.warnSoft, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, marginBottom: SPACE.sm },
  needT: { ...TXT.bodyStrong, color: PELE.ink },
  needD: { ...TXT.footnote, color: PELE.ink, marginTop: SPACE.xxs },
  note: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.sm, marginHorizontal: SPACE.xxs },
  // A saída discreta e as suas duas portas
  escape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, minHeight: 44, marginTop: SPACE.xl },
  escapeT: { ...TXT.bodyStrong, color: PELE.ink, textDecorationLine: 'underline', textDecorationColor: PELE.affordance },
  fixT: { ...TXT.title, color: PELE.ink },
  fixD: { ...TXT.body, color: PELE.grey, marginTop: SPACE.xs, marginBottom: SPACE.xs },
  fixOpt: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, marginTop: SPACE.sm },
  fixIc: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  fixFoot: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.md, marginBottom: SPACE.sm },
  // Limites do acordo: a marca "AE" ao lado do valor e a explicação com as duas fontes (D1).
  aeVal: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  aeTag: { backgroundColor: PELE.ink, borderRadius: RADIUS.xs, paddingHorizontal: SPACE.s, paddingVertical: SPACE.xxs },
  aeTagT: { ...TXT.tag, color: BRAND.signal },
  aeWhy: { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.sm, marginHorizontal: SPACE.xs },
  rowLaw: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.xxs },   // § inline da PROVA (metadado)
  rowLawS: { color: BRAND.signal },
  rowVZ: { ...TXT.caption, color: PELE.grey, fontVariant: ['tabular-nums'], textAlign: 'right', marginTop: SPACE.xxs },

  fatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  fatDot: { width: 7, height: 7, borderRadius: 99 },
  fatTxt: { ...TXT.tag },


  // Hotel da pernoita
  hotel: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: PELE.line, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11 },
  hotelIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  hotelName: { fontSize: 13.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  hotelNote: { fontSize: 10.5, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 1 },
  hotelActs: { flexDirection: 'row', gap: 7, marginLeft: 'auto' },
  hpillMap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PELE.info, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  hpillMapTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, color: '#2C6E8F' },
  hpillCall: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PELE.okSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  hpillCallTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },
  hotelAdd: { borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  hotelAddTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },

  // Ações
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, minHeight: 44, marginTop: SPACE.sm },
  delTxt: { ...TXT.bodyStrong, color: PELE.red },

  muted: { ...TXT.body, color: PELE.grey },
  foot: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.md, paddingHorizontal: SPACE.xxs },
});
