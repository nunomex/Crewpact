import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { getUpcomingFlight, requestCalendarAccess } from '../data/calendar';
import { catLabel } from '../data/extras';
import { monthlyPerDiem } from '../data/perdiem';
import { sectorDistanceNM } from '../data/airports';
import PageHeader from '../components/PageHeader';
import { computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty } from '../ftl';
import BottomSheet from '../components/BottomSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

// Cor da barra por nível de consumo: verde < 70 %, âmbar 70–90 %, vermelho ≥ 90 %.
const barColor = (ratio, C) => (ratio >= 0.9 ? C.red : ratio >= 0.7 ? C.warn : C.green);

// Anel a pulsar (escala 1→1.7 + desvanece, em loop) — atrás do ponto de estado e
// do badge do report, como o mockup (@keyframes ring).
function PulseRing({ size, color, border = false, duration = 2400 }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', width: size, height: size, borderRadius: size / 2,
      ...(border ? { borderWidth: 2, borderColor: color } : { backgroundColor: color }),
      opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 0, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
    }} />
  );
}

// Mini-barra que enche de 0 → valor ao montar (mockup .wbar i com transição).
function MiniBar({ ratio, color, track, fill }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(1, ratio || 0)), duration: 800, delay: 300, useNativeDriver: false }).start();
  }, [ratio, w]);
  return (
    <View style={track}>
      <Animated.View style={[fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// Cartão de limites compacto (mockup .uc) — título + janelas, cada uma com
// mini-barra colorida por severidade. Usado na grelha 2-col do Início.
function LimitCard({ title, windows, limLabel, s, C }) {
  return (
    <View style={s.uc}>
      <View style={s.ucHead}>
        <View style={s.ucDot} />
        <Text style={s.ucTitle} numberOfLines={1}>{title}</Text>
      </View>
      {windows.map((w) => {
        const r = w.limit ? w.done / w.limit : 0;
        return (
          <View key={w.id} style={s.ucWin}>
            <View style={s.ucWl}>
              <Text style={s.ucA} numberOfLines={1}>{limLabel(w)}</Text>
              <Text style={s.ucB} numberOfLines={1}><Text style={s.ucBnum}>{Math.round(w.done)}</Text>/{Math.round(w.limit)}h</Text>
            </View>
            <MiniBar ratio={r} color={barColor(r, C)} track={s.ucBar} fill={s.ucBarFill} />
          </View>
        );
      })}
    </View>
  );
}

// ── DEMO: voo de exemplo no cartão "Próximo voo", para comparar com o mockup.
// TEMPORÁRIO — quando ligares o calendário real do telemóvel, põe SHOW_DEMO_FLIGHT = false.
const SHOW_DEMO_FLIGHT = true;
const DEMO_FLIGHT = (() => {
  const dep = new Date(); dep.setDate(dep.getDate() + 1); dep.setHours(6, 40, 0, 0); // partida amanhã 06:40 (report 05:40)
  const iso = `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`;
  return { demo: true, dateISO: iso, report: '05:40', depAirport: 'LIS', arrAirport: 'FNC', arrTime: '13:20', sectors: 2, startDate: dep };
})();

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { profile, user, lang, readNotifIds, setReadNotifIds, ftlSnap, dayLog, duties, company, ae, crewCategory, crewContract, isPilot } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

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

  // Estado global (pior janela de tudo) → linha de estado.
  const worstOf = (arr) => arr.reduce((w, x) => (x.ratio > w.ratio ? x : w), { ratio: -1, limit: null, done: 0 });
  const limWorst = worstOf([...dutyLimits, ...flightLimits]);
  const limLevel = limWorst.ratio >= 1 ? 'over' : limWorst.ratio >= 0.85 ? 'warn' : 'ok';

  // PSV de hoje — só interessa para o nível de estado (ilegal → vermelho).
  const psvOver = !!(ftlSnap.psv && ftlSnap.psv.over);

  // ── Linha de estado FTL: estado global (derivado dos cálculos existentes) ──
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

  const closeNotifs = () => {
    setNotifOpen(false);
    setReadNotifIds(new Set(notifs.map(n => n.id)));
  };

  // ── Próximo voo (calendário) — carrega automaticamente ao abrir ──
  const [flight, setFlight] = useState(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null);
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
      setFlight(res.flight || (SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null)); // sem voo real → mostra o exemplo
    } catch { setFlight(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null); }
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

  // ── Próximo duty — voo da escala (calendário) + contexto FTL do motor (read-only) ──
  const now = Date.now();
  const reportMs = flight ? flight.startDate.getTime() - 60 * 60 * 1000 : null; // apresentação ≈ partida − 1 h
  const cdMin = reportMs != null ? Math.round((reportMs - now) / 60000) : null;
  const countdownStr = cdMin == null ? null
    : cdMin <= 0 ? t('home.dutyNow', lang)
    : cdMin >= 2880 ? `${t('home.in', lang)} ${Math.round(cdMin / 1440)} ${t('home.days', lang)}` // ≥ 48 h → dias
    : `${t('home.in', lang)} ${Math.floor(cdMin / 60) > 0 ? `${Math.floor(cdMin / 60)} h ` : ''}${cdMin % 60} min`;
  const fatColor = (b) => b === 'high' ? C.red : b === 'elevated' ? C.warn : b === 'low' ? C.green : C.onDarkSub;
  const fatLabel = (b) => t('duties.fatigue' + b.charAt(0).toUpperCase() + b.slice(1), lang);
  // PSV máx + fadiga: se houver duty registada nesse dia, usa-a (exata); senão estima pelo voo (1 setor).
  let ndPsvMax = null, ndFat = null, ndSectors = null;
  if (flight) {
    const reg = duties[flight.dateISO];
    if (flight.demo) {
      // Voo de exemplo: gera PSV máx + fadiga a partir dos próprios dados (sem registo).
      const d = computeDuty({ state: 'acc', report: flight.report, end: flight.arrTime, sectors: flight.sectors });
      ndPsvMax = d.fdp.maxFdpStr; ndSectors = flight.sectors; ndFat = fatigueFromDuty(d);
    } else if (reg && !reg.deleted && reg.report_time && reg.block_on) {
      const d = computeDuty({ state: 'acc', report: reg.report_time, end: reg.block_on, sectors: reg.sectors || 0 });
      ndPsvMax = d.fdp.maxFdpStr; ndSectors = reg.sectors || null; ndFat = fatigueFromDuty(d);
    } else {
      const d = computeDuty({ state: 'acc', report: flight.report, end: flight.arrTime, sectors: 1 });
      ndPsvMax = d.fdp.maxFdpStr;
    }
  }
  const dutyDateLabel = flight ? (() => {
    const str = new Date(flight.dateISO + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  })() : null;

  // Formata € compacto (sem decimais) — cartão AE e meta do próximo voo.
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const grouped = Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${grouped}` : `${grouped} €`;
  };
  // Per diem do próximo voo — só companhias AE, com categoria e rota conhecida.
  let aeNextPd = null;
  if (flight && ae && crewCategory && flight.depAirport && flight.arrAirport) {
    const dist = sectorDistanceNM(flight.depAirport, flight.arrAirport);
    if (dist != null) aeNextPd = ae.perDiem(crewCategory, [dist]);
  }
  const fatBg = (b) => b === 'high' ? C.redSoft : b === 'elevated' ? C.warnSoft : b === 'low' ? C.greenSoft : C.soft;

  const nextDutyEl = flight ? (
    <View style={s.nd}>
      <View style={s.ndCircWrap}>
        <PulseRing size={78} color={C.red} border duration={2800} />
        <View style={s.ndCirc}>
          <Text style={s.ndCircTime}>{flight.report}</Text>
          <Text style={s.ndCircLbl}>Report</Text>
        </View>
      </View>
      <View style={s.ndX}>
        <View style={s.ndXTop}>
          <Text style={s.ndXEyebrow}>{t('home.nextDuty', lang)}</Text>
          {countdownStr ? <Text style={s.ndCountdown}>{countdownStr}</Text> : null}
        </View>
        <Text style={s.ndRoute} numberOfLines={1}>{flight.depAirport} · {flight.arrAirport}</Text>
        <Text style={s.ndMeta} numberOfLines={1}>
          {dutyDateLabel}{ndSectors ? ` · ${ndSectors} ${t('duties.sectorsShort', lang)}` : ''}
          {aeNextPd != null ? <Text> · per diem <Text style={s.ndMetaEm}>{fmtEur0(aeNextPd)}</Text></Text> : null}
        </Text>
        <View style={s.ndTags}>
          <View style={s.ndSrc}>
            <Ionicons name="calendar-outline" size={10} color={C.sub} />
            <Text style={s.ndSrcTxt}>{lang === 'en' ? 'from calendar' : 'do calendário'}</Text>
          </View>
          {ndFat ? (
            <View style={[s.ndFat, { backgroundColor: fatBg(ndFat.band) }]}>
              <View style={[s.ndFatDot, { backgroundColor: fatColor(ndFat.band) }]} />
              <Text style={[s.ndFatTxt, { color: fatColor(ndFat.band) }]}>{fatLabel(ndFat.band)}</Text>
            </View>
          ) : null}
          {ndPsvMax ? (
            <View style={s.ndSrc}>
              <Text style={s.ndSrcTxt}>{t('home.fdpMax', lang)} {ndPsvMax}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  ) : (
    <View style={s.flightCard}>
      <View style={s.flightTop}>
        <Text style={s.flightEyebrow}>{t('home.nextDuty', lang)}</Text>
        <View style={[s.flightBadge, { backgroundColor: C.soft }]}>
          {syncing ? <ActivityIndicator size="small" color={C.sub} /> : <Ionicons name="refresh" size={14} color={C.sub} />}
        </View>
      </View>
      {!calOk ? (
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

  // ── Cartão AE compacto (mockup .uc.ae) — entra na grelha de baixo (direita),
  // emparelhado com o cartão FTL·Voo. Só para companhias AE com categoria. Toca
  // → abre a página AE nos Cálculos. ──
  const aeMiniEl = (ae && crewCategory) ? (() => {
    const d = new Date();
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = (() => { const m = d.toLocaleDateString(locale, { month: 'long' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
    const base = ae.monthlyBase(crewCategory, { contract: crewContract || '12/12' });
    const pd = monthlyPerDiem(duties, crewCategory, ae, { ym });
    const pdTotal = pd ? pd.total : 0;
    const total = base + pdTotal;
    const fill = total > 0 ? Math.min(1, pdTotal / total) : 0;
    return (
      <TouchableOpacity style={s.uc} activeOpacity={0.9} onPress={() => { select(); navigation.navigate('FTL'); }}>
        <View style={s.ucHead}><View style={[s.ucDot, s.ucDotAe]} /><Text style={s.ucTitle} numberOfLines={1}>AE · {monthName}</Text></View>
        <View style={[s.aeMRow, s.aeMRow0]}><Text style={s.aeMK} numberOfLines={1}>Base ({crewContract || '12/12'})</Text><Text style={s.aeMV}>{fmtEur0(base)}</Text></View>
        <View style={s.aeMRow}><Text style={s.aeMK} numberOfLines={1}>Per diem</Text><Text style={[s.aeMV, { color: C.red }]}>+{fmtEur0(pdTotal)}</Text></View>
        <View style={s.aeMRow}><Text style={s.aeMKtot} numberOfLines={1}>{t('home.aeEst', lang)}</Text><Text style={s.aeMVtot}>{fmtEur0(total)}</Text></View>
        <MiniBar ratio={fill} color={C.red} track={s.aeMBar} fill={s.aeMBarFill} />
      </TouchableOpacity>
    );
  })() : null;

  // ── Cabeçalho premium + tira de 5 dias ──
  const firstName = ((user?.name || user?.email?.split('@')[0] || '').split(' ')[0]) || '';
  const crewWord = isPilot ? (lang === 'en' ? 'Pilot' : 'Piloto') : (lang === 'en' ? 'Cabin' : 'Cabine');
  const opEyebrow = [company?.name, ae ? 'AE' : 'FTL', crewWord].filter(Boolean).join(' · ').toUpperCase();
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayISO = isoOf(new Date());
  const nextFlightISO = flight?.dateISO || null;
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
    const iso = isoOf(d);
    const reg = duties[iso];
    const wd = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
    return { iso, day: d.getDate(), wd: wd.charAt(0).toUpperCase() + wd.slice(1), hasFlight: !!(reg && !reg.deleted && reg.report_time), isToday: iso === todayISO };
  });

  // Entrada escalonada das secções (hook partilhado, re-toca no foco) — mockup .rise.
  const seg = useEnter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>

        {/* Cabeçalho claro (PageHeader) — eyebrow do operador + sino + saudação */}
        <PageHeader
          eyebrow={opEyebrow}
          title={`${t('home.hello', lang)}${firstName ? `, ${firstName}` : ''}`}
          right={
            <TouchableOpacity style={s.hbtn} onPress={() => setNotifOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityLabel={t('home.notifsAria', lang)}>
              <Ionicons name="notifications-outline" size={18} color={C.text} />
              {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
            </TouchableOpacity>
          }
        />

        {/* Tira de 5 dias — hoje a contorno vermelho, próximo voo preenchido, ponto nos dias com voo */}
        <Animated.View style={[s.week, seg(0)]}>
          {weekDays.map((wdy) => {
            const isNext = nextFlightISO === wdy.iso;
            return (
              <TouchableOpacity key={wdy.iso} activeOpacity={0.8}
                onPress={() => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { view: 'month' } }); }}
                style={[s.wd, isNext && s.wdOn, wdy.isToday && !isNext && s.wdToday]}>
                <Text style={[s.wdNum, isNext && s.wdNumOn, wdy.isToday && !isNext && s.wdNumToday]}>{wdy.day}</Text>
                <Text style={[s.wdDay, isNext && s.wdDayOn]}>{wdy.wd}</Text>
                <View style={[s.wdDot, wdy.hasFlight && s.wdDotOn, isNext && wdy.hasFlight && s.wdDotWhite]} />
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Estado FTL — linha de estado (ponto semáforo a pulsar + contexto à direita) */}
        <Animated.View style={[s.statline, seg(1)]}>
          <View style={s.statDotWrap}>
            <PulseRing size={9} color={stateColor} duration={2400} />
            <View style={[s.statDot, { backgroundColor: stateColor }]} />
          </View>
          <Text style={s.statLabel} numberOfLines={1}>{stateLabel}</Text>
          <Text style={s.statCtx} numberOfLines={1}>{crewCategory ? `${crewCategory}${crewContract ? ' · ' + crewContract : ''}` : (stateReason || '')}</Text>
        </Animated.View>

        {/* Próximo voo — badge circular do report + rota + meta + etiquetas */}
        <Animated.View style={seg(2)}>{nextDutyEl}</Animated.View>

        {/* Grelha de baixo — FTL·Voo + (AE compacto | FTL·Serviço), como o mockup */}
        <Animated.View style={[s.grid2, seg(3)]}>
          <LimitCard title={`FTL · ${catLabel('voo', lang)}`} windows={flightLimits} limLabel={limLabel} s={s} C={C} />
          {ae && crewCategory ? aeMiniEl : <LimitCard title={`FTL · ${catLabel('servico', lang)}`} windows={dutyLimits} limLabel={limLabel} s={s} C={C} />}
        </Animated.View>
        {(!(ae && crewCategory) && !hasLimitData) ? <Text style={s.gridHint}>{t('home.limitsEmpty', lang)}</Text> : null}
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

  // Sino do cabeçalho (slot direito do PageHeader)
  hbtn: { position: 'relative', width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.canvas },
  headerBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: FONT.bold },

  // Tira de 5 dias
  week: { flexDirection: 'row', gap: 7, justifyContent: 'space-between', marginBottom: SPACE.md },
  wd: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line },
  wdOn: { backgroundColor: C.ink, borderColor: C.ink },
  wdToday: { borderColor: C.red },
  wdNum: { fontSize: 17, fontFamily: FONT.semibold, color: C.text, lineHeight: 18 },
  wdNumOn: { color: '#fff' },
  wdNumToday: { color: C.red },
  wdDay: { fontSize: 9, fontFamily: FONT.bold, textTransform: 'uppercase', color: C.sub, marginTop: 4 },
  wdDayOn: { color: C.onDarkSub },
  wdDot: { width: 5, height: 5, borderRadius: RADIUS.pill, backgroundColor: 'transparent', marginTop: 5 },
  wdDotOn: { backgroundColor: C.red },
  wdDotWhite: { backgroundColor: '#fff' },

  // Estado FTL — linha de estado (ponto semáforo + contexto à direita)
  statline: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: SPACE.md },
  statDotWrap: { width: 9, height: 9, alignItems: 'center', justifyContent: 'center' },
  statDot: { width: 9, height: 9, borderRadius: RADIUS.pill },
  statLabel: { fontSize: TYPE.label, fontFamily: FONT.heavy, color: C.text },
  statCtx: { marginLeft: 'auto', fontSize: 10, fontFamily: FONT.heavy, letterSpacing: 0.4, color: C.sub, textTransform: 'uppercase' },

  // Próximo voo — badge circular do report + texto
  nd: { flexDirection: 'row', alignItems: 'flex-start', gap: 15, marginBottom: SPACE.md },
  ndCircWrap: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ndCirc: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: C.red, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ndCircTime: { fontSize: 25, fontFamily: FONT.semibold, color: '#fff', lineHeight: 26 },
  ndCircLbl: { fontSize: 9, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  ndX: { flex: 1, minWidth: 0, paddingTop: 2 },
  ndXTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ndXEyebrow: { fontSize: 9, fontFamily: FONT.heavy, letterSpacing: 1.6, textTransform: 'uppercase', color: C.sub },
  ndCountdown: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.red },
  ndRoute: { fontSize: 26, fontFamily: FONT.semibold, color: C.text, letterSpacing: -0.4, marginTop: 5, marginBottom: 4 },
  ndMeta: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.sub },
  ndMetaEm: { color: C.red, fontFamily: FONT.bold },
  ndTags: { flexDirection: 'row', gap: 7, marginTop: 9, flexWrap: 'wrap' },
  ndSrc: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  ndSrcTxt: { fontSize: 9, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase', color: C.sub },
  ndFat: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  ndFatDot: { width: 7, height: 7, borderRadius: 99 },
  ndFatTxt: { fontSize: 9, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase' },

  // Grelha 2-col (mockup .grid2/.uc/.win/.wbar)
  grid2: { flexDirection: 'row', gap: 11, marginBottom: SPACE.md },
  gridHint: { fontSize: TYPE.micro, color: C.sub, marginTop: -8, marginBottom: SPACE.md, paddingHorizontal: 2, lineHeight: 16 },
  uc: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 15,
    shadowColor: '#14161A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  ucHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  ucDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: C.ink },
  ucTitle: { fontSize: 9.5, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: C.sub, flexShrink: 1 },
  ucWin: { marginTop: 10 },
  ucWl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 5 },
  ucA: { fontSize: 9.5, fontFamily: FONT.bold, color: C.sub, flexShrink: 1 },
  ucB: { fontSize: 10.5, color: C.sub, fontVariant: ['tabular-nums'] },
  ucBnum: { color: C.text, fontFamily: FONT.bold },
  ucBar: { height: 5, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  ucBarFill: { height: '100%', borderRadius: RADIUS.pill },
  // AE compacto (cartão direito da grelha, mockup .uc.ae)
  ucDotAe: { backgroundColor: C.red },
  aeMRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.line },
  aeMRow0: { borderTopWidth: 0 },
  aeMK: { fontFamily: FONT.bold, fontSize: 10.5, color: C.sub, flexShrink: 1 },
  aeMV: { fontFamily: FONT.semibold, fontSize: 13, color: C.text, fontVariant: ['tabular-nums'] },
  aeMKtot: { fontFamily: FONT.heavy, fontSize: 10.5, color: C.text },
  aeMVtot: { fontFamily: FONT.semibold, fontSize: 16, color: C.text, fontVariant: ['tabular-nums'] },
  aeMBar: { height: 6, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden', marginTop: 11 },
  aeMBarFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.red },

  // Próximo duty — estado vazio / sem permissão (cartão claro)
  flightCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.md, backgroundColor: C.card },
  flightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  flightEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.bold },
  flightBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, minHeight: 24, justifyContent: 'center' },
  flightEmpty: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm },
  flightEmptyTxt: { flex: 1, fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: SPACE.sm, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  grantBtnTxt: { color: '#fff', fontSize: TYPE.sub, fontFamily: FONT.semibold },

  // Notificações
  notifItem: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, marginTop: 6 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 10, fontFamily: FONT.semibold, color: C.text, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontFamily: FONT.medium, color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
