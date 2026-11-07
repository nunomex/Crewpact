import React, { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER, BRAND, TXT, SPACE, RADIUS } from '../data/constants';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import PeleSide from '../components/PeleSide';
import PeleHeader from '../components/PeleHeader';
import DutyFormSheet from '../components/DutyFormSheet';
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

// Detalhe de um serviço (read-only) — o "Ver tudo" da folha do dia. Fiel a design/detalhe-servico.html:
// herói (rota + FANTASMA=FDP + estado FTL) + painéis Horário·Setores·FTL/Segurança·Pernoita·Pagamento.
// Tudo derivado dos motores (computeDuty/fatigueFromDuty + ae.perDiem) — a duty NÃO guarda FDP/per-diem.
// "Editar" abre o DutyFormSheet partilhado; apagar SÓ nos manuais (a fonte manda nos importados).
export default function DutyDetailScreen({ route, navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang, duties, crewAt, removeDuty, saveDuty, notify } = ctxAll;
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);   // folha "Hotel da pernoita" (registar/editar)
  const [prova, setProva] = useState(null);            // folha da PROVA ("a lei deste número")

  const date = route.params?.date;
  // `edit` (Início v6, tecla "Registar o sign-off"): abre logo o formulário — sem obrigar a procurar o "Editar".
  const editReq = route.params?.edit;
  useEffect(() => { if (editReq) setEditing(true); }, [editReq]);
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
  const duty = date ? duties[date] : null;
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

  if (!duty || duty.deleted) {
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
  const money = (ae && catD) ? serviceMoney(ae, catD, duty, { date, fleet: crewAt(date).fleet, daySvcs: [duty, ...(Array.isArray(duty.extra) ? duty.extra : [])] }) : null;
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
  const sources = { manual: l('Manual', 'Manual'), calendar: l('Calendário', 'Calendar'), pdf: 'PDF' };

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
          ) : (
            <View key={i} style={[s.row, i === 0 && s.rowFirst]}>{inner}</View>
          );
        })}
      </View>
    );
  };
  const Sec = ({ icon, children }) => (
    <View style={s.sec}><Icon name={icon} size={13} color={PELE.grey} /><Text style={s.secTxt}>{children}</Text></View>
  );

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
          <View style={[s.pill, statusPill.tone === 'red' ? s.pillRed : statusPill.tone === 'ok' ? s.pillOk : s.pillNeutral]}>
            {statusPill.tone === 'ok' ? <Icon name="check" size={12} color={PELE.ok} /> : statusPill.tone === 'red' ? <Icon name="alert" size={12} color={PELE.red} /> : null}
            <Text style={[s.pillTxt, { color: statusPill.tone === 'red' ? PELE.red : statusPill.tone === 'ok' ? PELE.ok : PELE.grey }]}>{statusPill.txt}</Text>
          </View>
          {duty.dirty ? <View style={s.pendRow}><View style={s.pendDot} /><Text style={s.pendTxt}>{t('duties.pending', lang)}</Text></View> : null}
        </View>
        <View style={s.hr} />

        <Sec icon="clock">{l('Horário', 'Schedule')}</Sec>
        <Panel rows={[
          duty.report_time && { k: l('Apresentação', 'Report'), v: tv(duty.report_time) },
          duty.block_off && { k: l('Block off', 'Block off'), v: tvL(duty.block_off, firstLeg, 'off') },
          duty.block_on && { k: l('Block on', 'Block on'), v: tvL(duty.block_on, lastLeg, 'on') },
          duty.signOff && { k: l('Fim de serviço', 'Sign-off'), v: tv(duty.signOff) },
          duty.flight_minutes && { k: 'Block hours', v: minToHhmm(duty.flight_minutes) },
          (d && d.dutyPeriodStr) && { k: 'Duty hours', v: d.dutyPeriodStr },
        ]} />

        {/* Setores — off/on de cada setor (read-only). Soma dos block = Block hours. */}
        {isFlight && legs.length ? (
          <>
            <Sec icon="plane">{l('Setores', 'Sectors')}</Sec>
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


        {/* Sem hora de report → o motor devolve null e a secção FTL desaparecia em SILÊNCIO
            (device 2026-09-03). Honestidade: dizer que o PSV não foi calculado e como corrigir. */}
        {(!d && !duty.report_time && (duty.kind || 'flight') === 'flight') ? (
          <>
            <Sec icon="gauge">{l('FTL · Segurança', 'FTL · Safety')}</Sec>
            <Panel rows={[
              { k: l('PSV', 'FDP'), v: l('não calculado — sem hora de report no calendário · Editar para corrigir', 'not calculated — no report time in the calendar · Edit to fix'), color: PELE.warn },
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
              // "A lei é que manda": entre o garantido e o possível, a lei depende de um dado que falta → incerto.
              (!sbAccD && !over && d.fdp.uncertain) && { k: l('Incerto', 'Uncertain'), v: l(`falta ${unknownsText(d.fdp.unknowns, 'pt')}`, `missing ${unknownsText(d.fdp.unknowns, 'en')}`), color: PELE.warn },
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
          duty.dayOffWorked && { k: l('Folga publicada trabalhada', 'Worked published day off'), v: duty.dayOffWorked === 'ddo' ? 'DDO' : duty.dayOffWorked === 'wfly' ? 'WFLY' : 'IDO', color: PELE.warn },
          duty.kind === 'office' && duty.officeType === 'ofc8' && { k: l('Dia de escritório', 'Office day'), v: l('Dia inteiro (OFC8) · 3 setores', 'Full day (OFC8) · 3 sectors') },
          duty.source && { k: l('Fonte', 'Source'), v: sources[duty.source] || duty.source, color: PELE.grey },
        ]} />

        {/* Outros períodos de serviço do MESMO dia (210/245) — lista compacta. */}
        {Array.isArray(duty.extra) && duty.extra.length ? (
          <>
            <Sec icon="ellipsis">{l('Outros serviços neste dia', 'Other services this day')}</Sec>
            <Panel rows={duty.extra.map((sv, i) => {
              const rr = ftlForDuty(sv, { postFlightMin: ctxAll.postFlightMin || 0, isPilot: isPilotD, base: baseD, date, cabinGapMin: gapD, splitAdminMin: ctxAll.splitAdminMin });
              const lbl = (!sv.kind || sv.kind === 'flight') ? (sv.route || l('Voo', 'Flight')) : t('duties.kind.' + sv.kind, lang);
              const psv = (rr && rr.isFdp && rr.fdp.actualFdpStr) ? rr.fdp.actualFdpStr : null;   // só PSV de quem tem setores
              return { k: `${i + 2}. ${lbl}`, v: `${sv.report_time || '—'} → ${sv.block_on || '—'}${psv ? `  ·  PSV ${psv}` : ''}` };
            })} />
            <Text style={s.foot}>{l('Os serviços do dia somam nos 28 dias (210). Vê o repouso entre eles na folha do dia.', 'The day’s services sum over 28 days (210). See the rest between them in the day detail.')}</Text>
          </>
        ) : null}

        <TouchableOpacity onPress={() => { select(); setEditing(true); }} activeOpacity={0.9} style={s.editBtn} accessibilityRole="button" accessibilityLabel={l('Editar serviço', 'Edit duty')}>
          <Icon name="edit" size={16} color={BRAND.onDark} />
          <Text style={s.editTxt}>{l('Editar serviço', 'Edit duty')}</Text>
        </TouchableOpacity>

        {isManual ? (
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

      {/* Edição (opção autossuficiente) — o form partilhado; ao guardar, o context atualiza-se e o ecrã reflete. */}
      <DutyFormSheet visible={!!editing} date={date} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setEdited(true); }} />
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

  stbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  pillOk: { backgroundColor: PELE.okSoft },
  pillRed: { backgroundColor: PELE.redSoft },
  pillNeutral: { backgroundColor: PELE.soft },
  pillTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  pendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.warn },
  pendTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase', color: PELE.grey },
  hr: { height: 1.5, backgroundColor: PELE.ink, marginTop: 12 },

  // Secções + painéis
  sec: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, marginBottom: 9 },
  secTxt: { fontFamily: PELE_FONT.bodyHeavy, fontSize: 10, letterSpacing: 1.3, textTransform: 'uppercase', color: PELE.grey },
  panel: { borderWidth: 1, borderColor: PELE.line, borderRadius: 16, backgroundColor: PELE.paper, paddingHorizontal: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: PELE.line },
  rowFirst: { borderTopWidth: 0 },
  rowK: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  rowV: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  // Limites do acordo: a marca "AE" ao lado do valor e a explicação com as duas fontes (D1).
  aeVal: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  aeTag: { backgroundColor: PELE.ink, borderRadius: RADIUS.xs, paddingHorizontal: SPACE.s, paddingVertical: SPACE.xxs },
  aeTagT: { ...TXT.tag, color: BRAND.signal },
  aeWhy: { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.sm, marginHorizontal: SPACE.xs },
  rowLaw: { fontSize: 9.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, marginTop: 2 },   // § inline da PROVA (metadado)
  rowLawS: { color: BRAND.signal },
  rowVZ: { fontSize: 10.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, fontVariant: ['tabular-nums'], textAlign: 'right', marginTop: 2, letterSpacing: 0.2 },

  fatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  fatDot: { width: 7, height: 7, borderRadius: 99 },
  fatTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.3, textTransform: 'uppercase' },


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
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PELE.ink, borderRadius: 14, paddingVertical: 15, marginTop: 22 },
  editTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.paper },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, marginTop: 10 },
  delTxt: { color: PELE.red, fontSize: 13, fontFamily: PELE_FONT.bodyBold },

  muted: { fontSize: 13, color: PELE.grey, lineHeight: 19 },
  foot: { fontSize: 10.5, fontFamily: PELE_FONT.body, color: PELE.grey, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },
});
