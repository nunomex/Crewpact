import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { getUpcomingFlight, requestCalendarAccess } from '../data/calendar';
import { catLabel, fmtVal } from '../data/extras';
import { computeDutyTime, computeFlightTime, computeRestSequence } from '../ftl';
import ScreenHeader from '../components/ScreenHeader';
import BottomSheet from '../components/BottomSheet';
import { Seg } from '../components/Stepper';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../App';

// "11:30" → 11.5 (horas decimais).
const hhmmToH = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
};

// Cor da barra por nível de consumo: verde < 70 %, âmbar 70–90 %, vermelho ≥ 90 %.
// Recebe a paleta ativa (C) para acompanhar o tema (claro/escuro).
const barColor = (ratio, C) => (ratio >= 0.9 ? C.red : ratio >= 0.7 ? C.warn : C.green);

// Barra com preenchimento animado (0 → valor) sempre que o rácio muda — dá a
// sensação de "encher" ao abrir o Início depois de registar nos Cálculos.
function AnimatedBar({ ratio, color, s }) {
  const w = useRef(new Animated.Value(0)).current;
  const target = Math.max(0, Math.min(1, ratio || 0));
  useEffect(() => {
    Animated.timing(w, { toValue: target, duration: 550, useNativeDriver: false }).start();
  }, [target, w]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={s.progTrack}>
      <Animated.View style={[s.progFill, { width, backgroundColor: color }]} />
    </View>
  );
}

// Barra de repouso mínimo: escala 0 → piso (12 h base / 10 h fora). O valor é o
// repouso exigido = máx(serviço anterior, piso); acima do piso assinala a vermelho.
function RestBar({ label, value, floor, prev, lang, s, C, at, atDir, atDay }) {
  const empty = value == null;
  const over = !empty && value > floor;
  const fill = empty ? 0 : Math.min(1, value / floor);
  return (
    <View style={s.restItem}>
      <Text style={s.restItemLbl}>{label}</Text>
      <Text style={[s.restHero, over && { color: C.red }]}>{empty ? '—' : fmtVal(value, 'h')}</Text>
      <AnimatedBar ratio={fill} color={over ? C.red : C.ink} s={s} />
      <Text style={[s.progFoot, over && { color: C.red }]}>
        {empty
          ? `${t('home.restNoLog', lang)} · ${t('home.restMin', lang)} ${floor}:00`
          : over
            ? `${t('home.restExt', lang)} · ${t('home.restMin', lang)} ${floor}:00`
            : `${t('home.restMin', lang)} ${floor}:00`}
      </Text>
      {at ? (
        <View style={[s.setoresRow, { marginTop: 6 }]}>
          <Text style={s.bdLbl}>{t(atDir === 'before' ? 'ftl.latestOff' : 'ftl.earliestReport', lang)}</Text>
          <Text style={s.bdVal}>{at}{atDay || ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Chip de cartão. Estado (Limites): verde (dentro) / âmbar (a aproximar-se) /
// vermelho (excedido) — só onde há consumo real vs. teto regulamentar.
// Neutro (PSV/Repouso): cinza — só informa (ex.: aclimatação), não avalia.
function StatusChip({ level, label, s, C }) {
  const col = level === 'over' ? C.red : level === 'warn' ? C.warn : level === 'neutral' ? C.onDarkSub : C.green;
  return (
    <View style={s.chip}>
      <View style={[s.chipDot, { backgroundColor: col }]} />
      <Text style={[s.chipTxt, { color: col }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// Barra de limite (FTL) — feito / limite, com horas em falta.
function ProgressRow({ label, done, limit, lang, s, C }) {
  const ratio = limit ? done / limit : 0;
  const fill = Math.min(1, ratio);
  const over = done > limit;
  const remaining = Math.max(0, limit - done);
  return (
    <View style={s.prog}>
      <View style={s.progTop}>
        <Text style={s.progLbl}>{label}</Text>
        <Text style={s.progVal}>{fmtVal(done, 'h')} / {limit} h</Text>
      </View>
      <AnimatedBar ratio={fill} color={barColor(ratio, C)} s={s} />
      <Text style={[s.progFoot, over && { color: C.red }]}>
        {over
          ? `${t('home.excess', lang)} ${fmtVal(done - limit, 'h')}`
          : `${t('home.remaining', lang)} ${fmtVal(remaining, 'h')}`}
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { profile, lang, readNotifIds, setReadNotifIds, ftlSnap, dayLog, duties, company } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);

  const [limCat, setLimCat] = useState('servico'); // categoria mostrada no separador Limites
  const [notifOpen, setNotifOpen] = useState(false);

  const notifs = buildNotifications(profile, lang);
  const unread = notifs.filter(n => !readNotifIds.has(n.id)).length;

  // FTL — limites de tempo (ORO.FTL.210), calculados pelo MOTOR a partir do dayLog (store FTL).
  const dutyLimits = computeDutyTime(dayLog);     // serviço: 60/110/190 h em 7/14/28 dias
  const flightLimits = computeFlightTime(dayLog); // voo: 100/900/1000 h em 28 d / ano civil / 12 m
  const limLabel = (w) =>
    w.id === 'year' ? (lang === 'en' ? 'Calendar year' : 'Ano civil') :
    w.id === '12m'  ? (lang === 'en' ? '12 months' : '12 meses') :
                      `${w.days} ${lang === 'en' ? 'days' : 'dias'}`;
  const hasLimitData = Object.values(dayLog).some(d => (d?.voo > 0) || (d?.servico > 0));

  // Estado global (pior janela de tudo) → mosaico Limites.
  const worstOf = (arr) => arr.reduce((w, x) => (x.ratio > w.ratio ? x : w), { ratio: -1, limit: null, done: 0 });
  const limWorst = worstOf([...dutyLimits, ...flightLimits]);
  const limLevel = limWorst.ratio >= 1 ? 'over' : limWorst.ratio >= 0.85 ? 'warn' : 'ok';

  // PSV de hoje: usa os dados reais do registo. O DutyCalc guarda o máximo da tabela
  // (psv.max) e o excesso (psv.over/psv.excess). Registos antigos (só PSV, sem
  // 'over') não têm excesso → sem badge (são o próprio máximo).
  const psvMax = ftlSnap.psv?.max || null;
  const psvOver = !!(ftlSnap.psv && ftlSnap.psv.over);
  const psvExcess = ftlSnap.psv?.excess || null;
  const psvRatio = ftlSnap.psv ? hhmmToH(ftlSnap.psv.result) / (psvMax ? hhmmToH(psvMax) : 13) : 0;
  const psvFoot = psvMax ? `${lang === 'en' ? 'max' : 'máx'} ${psvMax}` : t('home.psvMaxFoot', lang);

  // Anel + folga: pior janela DENTRO da categoria selecionada (coerente com as barras).
  const catLimits = limCat === 'voo' ? flightLimits : dutyLimits;
  const catWorst = worstOf(catLimits);
  const catLevel = catWorst.ratio >= 1 ? 'over' : catWorst.ratio >= 0.85 ? 'warn' : 'ok';
  const catColor = catLevel === 'over' ? C.red : catLevel === 'warn' ? C.warn : C.green;
  const catPct   = `${Math.round(Math.max(0, catWorst.ratio) * 100)}%`;
  const catFolga = catWorst.limit != null ? catWorst.limit - catWorst.done : 0; // horas
  const catOver  = catFolga < 0;
  const folgaNum   = (catOver ? '−' : '') + fmtVal(Math.abs(catFolga), 'h');
  const folgaLabel = catOver ? t('home.statusOver', lang) : t('home.headroom', lang);
  const folgaCtx   = `${catLabel(limCat, lang)} · ${catWorst.limit != null ? limLabel(catWorst) : ''}`;

  // ── Dashboard FTL: estado global + alertas (derivados dos cálculos existentes,
  // sem novas fórmulas) ──
  const stateLevel = psvOver ? 'over' : (hasLimitData ? limLevel : 'neutral');
  const worstCat = dutyLimits.indexOf(limWorst) >= 0 ? 'servico' : flightLimits.indexOf(limWorst) >= 0 ? 'voo' : null;
  const stateReason = hasLimitData && limWorst.limit != null
    ? `${worstCat ? catLabel(worstCat, lang) + ' ' : ''}${limLabel(limWorst)} · ${Math.round(limWorst.ratio * 100)}%`
    : null;
  const stateLabel = stateLevel === 'over' ? t('home.statusOver', lang)
    : stateLevel === 'warn' ? t('home.statusWarn', lang)
    : stateLevel === 'ok' ? t('home.statusOk', lang)
    : t('home.dashNoData', lang);
  const stateColor = stateLevel === 'over' ? C.red : stateLevel === 'warn' ? C.warn : stateLevel === 'neutral' ? C.onDarkSub : C.green;
  const ftlAlerts = [];
  {
    const pushLim = (arr, cat) => arr.forEach(w => {
      if (!(w.done > 0)) return;
      const lbl = `${catLabel(cat, lang)} ${limLabel(w)}`;
      if (w.ratio >= 1) ftlAlerts.push({ id: `${cat}-${w.id}`, level: 'over', text: `${lbl} · ${t('home.excess', lang)} ${fmtVal(w.done - w.limit, 'h')}` });
      else if (w.ratio >= 0.85) ftlAlerts.push({ id: `${cat}-${w.id}`, level: 'warn', text: `${lbl} · ${Math.round(w.ratio * 100)}%` });
    });
    pushLim(dutyLimits, 'servico');
    pushLim(flightLimits, 'voo');
    if (psvOver) ftlAlerts.push({ id: 'psv', level: 'over', text: `${t('home.psvMaxLbl', lang)} · ${t('home.illegal', lang)} +${psvExcess}` });
    // Sequência de escala (235(a)(2)/(d)): recuperação/disruptivos a partir das duties.
    computeRestSequence(duties || {}).issues.forEach((iss, k) => {
      const text = iss.type === 'recovery60' ? t('home.seqRecovery60', lang)
        : iss.type === 'recovery168' ? t('home.seqRecovery168', lang)
        : t('home.seqTransition', lang);
      ftlAlerts.push({ id: `seq-${iss.type}-${k}`, level: 'warn', text });
    });
  }

  const closeNotifs = () => {
    setNotifOpen(false);
    setReadNotifIds(new Set(notifs.map(n => n.id)));
  };

  // ── Próximo voo (calendário) — carrega automaticamente ao abrir ──
  const [flight, setFlight] = useState(null);
  const [calOk, setCalOk] = useState(true); // acesso ao calendário do telemóvel
  const [syncing, setSyncing] = useState(true);
  const [syncDone, setSyncDone] = useState(false);
  const syncingRef = useRef(false);
  const syncFlight = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await getUpcomingFlight();
      setCalOk(res.ok);
      setFlight(res.flight);
    } catch { setFlight(null); }
    setSyncDone(true); setSyncing(false);
    syncingRef.current = false;
  };
  // Pede acesso ao calendário; se já recusado de vez, abre as Definições.
  const requestAccess = async () => {
    select();
    const res = await requestCalendarAccess();
    if (res?.granted) syncFlight();
    else if (res && res.canAskAgain === false) Linking.openSettings();
  };
  // Re-lê o calendário do telemóvel sempre que o Início ganha foco (não só ao montar),
  // para o cartão refletir alterações da escala sem reabrir a app.
  useFocusEffect(useCallback(() => { syncFlight(); }, []));

  // E também quando a app volta de segundo plano (ex.: a eCrew atualizou o calendário
  // enquanto estava minimizada) → o voo novo aparece sem reabrir a app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') syncFlight(); });
    return () => sub.remove();
  }, []);

  // Cartão "Próximo voo" — definido como elemento para poder ir ao topo quando há
  // voo (mais relevante) ou ficar por baixo do cartão AE/FTL quando não há.
  const flightCardEl = (
    <View style={s.flightCard}>
      <View style={s.flightTop}>
        <Text style={s.flightEyebrow}>{t('home.flightEyebrow', lang)}</Text>
        <View style={[s.flightBadge, { backgroundColor: flight ? C.greenSoft : C.soft }]}>
          {syncing
            ? <ActivityIndicator size="small" color={C.sub} />
            : flight
              ? <Text style={[s.flightBadgeTxt, { color: C.green }]}>{t('home.flightOnTime', lang)}</Text>
              : <Ionicons name="refresh" size={14} color={C.sub} />}
        </View>
      </View>

      {flight ? (
        <>
          <View style={s.routeRow}>
            <Text style={s.routeAir}>{flight.depAirport}</Text>
            <Ionicons name="arrow-forward" size={20} color={C.text} style={{ marginHorizontal: 12 }} />
            <Text style={s.routeAir}>{flight.arrAirport}</Text>
            <View style={{ flex: 1 }} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.routeTime}>{flight.arrTimeZ}Z</Text>
              <Text style={s.routeTimeLocal}>{flight.arrTime}L</Text>
            </View>
          </View>
          <Text style={s.routeBoard}>{t('home.flightBoarding', lang)} {flight.reportZ}Z · {flight.report}L</Text>
          <Text style={s.flightMeta}>{flight.aircraft !== '—' ? `${flight.aircraft} · ` : ''}{flight.date}</Text>
        </>
      ) : !calOk ? (
        <View style={s.flightEmpty}>
          <Ionicons name="calendar-outline" size={18} color={C.sub} />
          <View style={{ flex: 1 }}>
            <Text style={s.flightEmptyTxt}>{t('cal.permission', lang)}</Text>
            <TouchableOpacity onPress={requestAccess} activeOpacity={0.85} style={s.grantBtn}>
              <Ionicons name="calendar-outline" size={15} color="#fff" />
              <Text style={s.grantBtnTxt}>{t('cal.grant', lang)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.flightEmpty}>
          <Ionicons name="calendar-outline" size={18} color={C.sub} />
          <Text style={s.flightEmptyTxt}>{syncDone ? t('home.flightNone', lang) : t('home.flightConnect', lang)}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>

        {/* Cabeçalho (cartão preto) */}
        <ScreenHeader
          eyebrow={t('home.eyebrowFtl', lang)}
          badge={<View style={s.codeBadge}><Text style={s.codeText}>{company?.code}</Text></View>}
          title={company?.name}
          style={{ margin: 0, marginBottom: SPACE.md }}
          right={
            <TouchableOpacity style={s.headerBell} onPress={() => setNotifOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityLabel={t('home.notifsAria', lang)}>
              <Ionicons name="notifications" size={18} color={C.onDark} />
              {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
            </TouchableOpacity>
          } />

        {/* Herói — estado operacional (cartão preto): semáforo + janela que o causa */}
        <View style={s.monthCard}>
          <Text style={s.heroEyebrow}>{t('home.dashState', lang)}</Text>
          <View style={s.heroStatusRow}>
            <View style={[s.heroDot, { backgroundColor: stateColor }]} />
            <Text style={[s.heroStatus, { color: stateColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{stateLabel}</Text>
          </View>
          {stateReason ? <Text style={s.dashReason}>{t('home.dashWorst', lang)}: {stateReason}</Text> : null}
        </View>

        {/* Próximo voo (sempre nesta posição — não salta) */}
        {flightCardEl}

        {/* Limites acumulados — cartão claro */}
        <View style={s.panel}>
          <Text style={s.secTitle}>{t('home.dashLimits', lang)}</Text>
          <Seg options={[{ id: 'servico', label: catLabel('servico', lang) }, { id: 'voo', label: catLabel('voo', lang) }]} value={limCat} setValue={setLimCat} />
          {catLimits.some(w => w.done > 0)
            ? catLimits.map(w => <ProgressRow key={w.id} label={limLabel(w)} done={w.done} limit={w.limit} lang={lang} s={s} C={C} />)
            : <Text style={s.panelEmptyTxt}>{t('home.limitsEmpty', lang)}</Text>}
        </View>

        {/* Repouso — cartão claro */}
        <View style={s.panel}>
          <Text style={s.secTitle}>{t('home.dashRest', lang)}</Text>
          {ftlSnap.rest ? (
            <>
              <RestBar label={t('home.restBase', lang)} value={ftlSnap.rest?.base} floor={12} prev={ftlSnap.rest?.basePrev} lang={lang} s={s} C={C} />
              <RestBar label={t('home.restAway', lang)} value={ftlSnap.rest?.away} floor={10} prev={ftlSnap.rest?.awayPrev} lang={lang} s={s} C={C} />
              <Text style={s.progFoot}>{t('home.recovery', lang)}</Text>
            </>
          ) : <Text style={s.panelEmptyTxt}>{t('home.restEmpty', lang)}</Text>}
        </View>

        {/* Alertas — só quando existem (o estado verde já vive no herói) */}
        {ftlAlerts.length > 0 ? (
          <View style={s.alertCard}>
            <Text style={s.alertHead}>{t('home.dashAlerts', lang)}</Text>
            {ftlAlerts.slice(0, 5).map((al, i) => (
              <View key={al.id} style={[s.alertRow, i > 0 && s.alertRowDiv]}>
                <Ionicons name={al.level === 'over' ? 'alert-circle' : 'warning'} size={18} color={al.level === 'over' ? C.red : C.warn} />
                <Text style={s.alertTxt}>{al.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Simulador — CTA primário */}
        <TouchableOpacity style={s.simCta} activeOpacity={0.9} onPress={() => { select(); navigation.navigate('FtlCalc', { duty: true }); }}>
          <View style={s.simIcon}><Ionicons name="play" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.simTitle}>{t('home.dashSim', lang)}</Text>
            <Text style={s.simSub}>{t('home.dashSimSub', lang)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.onDarkSub} />
        </TouchableOpacity>

        {/* Atalhos — 2 colunas */}
        <View style={s.shortcutsRow}>
          <TouchableOpacity style={s.shortcut} activeOpacity={0.85} onPress={() => navigation.navigate('Calendar')}>
            <Ionicons name="calendar-outline" size={20} color={C.text} />
            <Text style={s.shortcutTxt}>{t('home.calTitle', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.shortcut} activeOpacity={0.85} onPress={() => navigation.navigate('Duties')}>
            <Ionicons name="time-outline" size={20} color={C.text} />
            <Text style={s.shortcutTxt}>{t('duties.cardTitle', lang)}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notificações */}
      <BottomSheet visible={notifOpen} onClose={closeNotifs} eyebrow={t('home.notifsEyebrow', lang)} title={t('home.notifsTitle', lang)} maxHeight="80%" closeLabel={t('common.close', lang)}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: SPACE.xl + 8 }}>
          {notifs.map((n, i) => {
            const isNew = !readNotifIds.has(n.id);
            return (
              <View key={n.id} style={[s.notifItem, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <View style={[s.notifDot, { backgroundColor: isNew ? C.red : C.line }]} />
                <View style={{ flex: 1 }}>
                  <View style={s.notifMeta}>
                    <View style={s.tagBadge}><Text style={s.tagTxt}>{n.tag}</Text></View>
                    <Text style={s.notifTime}>{n.time}</Text>
                  </View>
                  <Text style={s.notifItemTitle}>{n.title}</Text>
                  <Text style={s.notifItemBody}>{n.body}</Text>
                </View>
              </View>
            );
          })}
          <Text style={s.noMore}>{t('home.noMore', lang)}</Text>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: SPACE.lg },

  headerBell: { position: 'relative', width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.ink },
  headerBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
  codeBadge: { backgroundColor: C.red, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  codeText: { color: '#fff', fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },

  // Este mês (extras)
  monthCard: { backgroundColor: C.ink, borderRadius: RADIUS.xl, padding: SPACE.lg, marginBottom: SPACE.md },
  cardTabs: { marginBottom: SPACE.md }, // wrapper das abas AE (Seg)
  // Anel de folga (aba Limites) — pequeno, à esquerda, com a folga em texto ao lado.
  ringWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  ringPct: { fontSize: TYPE.body, fontWeight: '700' },
  ringText: { flex: 1 },
  ringNum: { fontSize: TYPE.display, fontWeight: '400', letterSpacing: -0.5 },
  ringCtx: { fontSize: TYPE.micro, color: C.onDarkSub, marginTop: 3, fontWeight: '600', lineHeight: 16 },
  // Sparkline AE (mini-tendência).
  sparkWrap: { marginTop: SPACE.md, alignItems: 'flex-start' },
  sparkLbl: { fontSize: TYPE.eyebrow, color: C.onDarkFaint, fontWeight: '600', marginTop: 4, letterSpacing: 0.5 },
  // Chip de estado dos limites (verde/âmbar/vermelho) sobre o cartão preto.
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, marginBottom: SPACE.md },
  chipDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  chipTxt: { fontSize: TYPE.micro, fontWeight: '700', letterSpacing: 0.3 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  monthEyebrow: { flex: 1, fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.onDarkSub, fontWeight: '600' },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  monthBody: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.lg },
  monthLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkSub, fontWeight: '600' },
  monthTotal: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -1, color: '#fff', marginTop: 2 },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  pctTxt: { fontSize: TYPE.micro, fontWeight: '600' },
  breakdown: { flex: 1, justifyContent: 'center', gap: 8, paddingTop: 4 },
  bdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bdLbl: { flex: 1, fontSize: TYPE.sub, color: C.onDarkSub },
  bdVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: '#fff', fontWeight: '600' },
  noExtras: { fontSize: TYPE.micro, color: C.onDarkFaint, lineHeight: 17 },
  // Registos do mês agrupados por secção (slide 2 do cartão AE)
  recSection: { marginBottom: SPACE.md },
  recSecHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  recSecTitle: { fontSize: TYPE.micro, fontWeight: '700', color: C.onDark, letterSpacing: 0.5, textTransform: 'uppercase' },
  recSecTotal: { fontSize: TYPE.micro, fontFamily: 'monospace', fontWeight: '700', color: C.onDarkSub },
  recItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  monthDivider: { height: 1, backgroundColor: C.hairlineOnDark, marginVertical: SPACE.md },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, flex: 1 },
  chartCol: { alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  chartLbl: { fontSize: 10, color: C.onDarkFaint },
  // Barras de progresso FTL (PSV / limites / repouso)
  prog: { marginBottom: SPACE.md + 4 },
  progTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  // FTL agora vive em cartões CLAROS → texto/track em tons claros (AE usa estilos próprios).
  progLbl: { fontSize: TYPE.sub, fontWeight: '600', color: C.text },
  progVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: C.sub },
  progTrack: { height: 10, borderRadius: RADIUS.pill, backgroundColor: C.line, overflow: 'hidden' },
  progFill: { height: 10, borderRadius: RADIUS.pill },
  progFoot: { fontSize: TYPE.micro, color: C.sub, marginTop: 6 },
  psvHeroLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.onDarkSub, fontWeight: '600' },
  psvHeroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, marginTop: 2, marginBottom: SPACE.sm },
  psvHero: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -1, color: '#fff' },
  psvIllegal: { color: C.red, fontSize: TYPE.sub, fontWeight: '700', marginBottom: 6 },
  restItem: { marginBottom: SPACE.md },
  restItemLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.sub, fontWeight: '700' },
  restHero: { fontSize: TYPE.display, fontWeight: '300', letterSpacing: -0.5, color: C.text, marginTop: 2, marginBottom: SPACE.sm },
  psvEmpty: { alignItems: 'center', paddingVertical: SPACE.lg, gap: SPACE.sm },
  psvEmptyIcon: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, alignItems: 'center', justifyContent: 'center' },
  psvEmptyTxt: { fontSize: TYPE.sub, color: C.onDarkSub, textAlign: 'center', lineHeight: 18, maxWidth: 220 },
  setoresRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Dashboard FTL — herói (cartão preto = estado), painéis claros e atalhos.
  heroEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.onDarkSub, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACE.sm },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroDot: { width: 12, height: 12, borderRadius: RADIUS.pill },
  heroStatus: { flex: 1, fontSize: TYPE.heading, fontWeight: '700', letterSpacing: -0.3 },
  panel: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.md, backgroundColor: C.card },
  secTitle: { fontSize: TYPE.label, fontWeight: '700', color: C.text, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACE.md },
  panelEmptyTxt: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.sm },
  shortcutsRow: { flexDirection: 'row', gap: SPACE.md, marginBottom: SPACE.md },
  shortcut: { flex: 1, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingVertical: SPACE.md + 4, backgroundColor: C.card },
  shortcutTxt: { fontSize: TYPE.label, fontWeight: '600', color: C.text },
  dashSecLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.onDarkSub, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACE.sm },
  dashReason: { fontSize: TYPE.micro, color: C.onDarkSub, marginBottom: SPACE.md },
  dashHint: { fontSize: TYPE.sub, color: C.onDarkSub, lineHeight: 18, marginBottom: SPACE.sm },
  alertCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.md, backgroundColor: C.card },
  alertHead: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginBottom: SPACE.sm },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  alertRowDiv: { borderTopWidth: 1, borderTopColor: C.line },
  alertTxt: { flex: 1, fontSize: TYPE.sub, color: C.text },
  simCta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.ink, borderRadius: RADIUS.xl, padding: SPACE.md + 2, marginBottom: SPACE.md },
  simIcon: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  simTitle: { fontSize: TYPE.body, fontWeight: '700', color: '#fff' },
  simSub: { fontSize: TYPE.micro, color: C.onDarkSub, marginTop: 2 },

  // Próximo voo
  flightCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.lg, backgroundColor: C.card },
  flightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  flightEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700' },
  flightBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, minHeight: 24, justifyContent: 'center' },
  flightBadgeTxt: { fontSize: TYPE.micro, fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeAir: { fontSize: 24, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  routeTime: { fontSize: TYPE.lg, fontWeight: '700', color: C.text },
  routeTimeLocal: { fontSize: TYPE.micro, fontFamily: 'monospace', color: C.sub, marginTop: 1 },
  routeBoard: { fontSize: TYPE.micro, color: C.sub, marginTop: 8 },
  flightMeta: { fontSize: TYPE.sub, color: C.sub, marginTop: 8 },
  flightEmpty: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm },
  flightEmptyTxt: { flex: 1, fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: SPACE.sm, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  grantBtnTxt: { color: '#fff', fontSize: TYPE.sub, fontWeight: '600' },

  // Cartão Calendário (entrada dedicada)
  calCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.lg, backgroundColor: C.card },
  calIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  calTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text },
  calSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 2 },

  // Registar extra
  fieldLbl: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 8 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.pill, paddingHorizontal: 12, minHeight: 38 },
  catChipTxt: { fontSize: TYPE.label, fontWeight: '600' },
  amountInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.heading, fontFamily: 'monospace', color: C.text },
  saveBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },

  // Todos os meses

  // Notificações
  notifItem: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, marginTop: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 10, fontFamily: 'monospace', fontWeight: '600', color: C.text, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
