import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, WEIGHT, TRACK_DISPLAY } from '../data/constants';
import { buildNotifications } from '../data/notifications';
import { getUpcomingFlight, requestCalendarAccess } from '../data/calendar';
import { catLabel, fmtVal } from '../data/extras';
import { monthlyPerDiem } from '../data/perdiem';
import { sectorDistanceNM } from '../data/airports';
import { computeDutyTime, computeFlightTime, computeRestSequence, computeDuty, fatigueFromDuty } from '../ftl';
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
  const { profile, user, lang, readNotifIds, setReadNotifIds, ftlSnap, dayLog, duties, company, ae, crewCategory, crewContract, isPilot } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [limCat, setLimCat] = useState('servico'); // categoria mostrada no separador Limites
  const [limExpanded, setLimExpanded] = useState(false); // Limites: pior janela vs. todas
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
    if (reg && !reg.deleted && reg.report_time && reg.block_on) {
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
      <View style={s.ndCirc}>
        <Text style={s.ndCircTime}>{flight.report}</Text>
        <Text style={s.ndCircLbl}>Report</Text>
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

  // ── Cartão AE (companhias com Acordo de Empresa) — base do contrato + per diem
  // do mês = estimado, igual ao cartão do Perfil. Toca → abre a página AE nos
  // Cálculos. Só aparece se a companhia é AE e a categoria está escolhida. ──
  const aeCardEl = (ae && crewCategory) ? (() => {
    const d = new Date();
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = (() => { const m = d.toLocaleDateString(locale, { month: 'long' }); return m.charAt(0).toUpperCase() + m.slice(1); })();
    const base = ae.monthlyBase(crewCategory, { contract: crewContract || '12/12' });
    const pd = monthlyPerDiem(duties, crewCategory, ae, { ym });
    const pdTotal = pd ? pd.total : 0;
    const total = base + pdTotal;
    const fill = total > 0 ? Math.min(1, pdTotal / total) : 0;
    return (
      <TouchableOpacity style={s.aeCard} activeOpacity={0.9} onPress={() => { select(); navigation.navigate('FTL'); }}>
        <View style={s.aeHead}>
          <View style={s.aeDot} />
          <Text style={s.aeEyebrow}>AE · {monthName}</Text>
          <Ionicons name="chevron-forward" size={16} color={C.sub} style={{ marginLeft: 'auto' }} />
        </View>
        <Text style={s.aeSub} numberOfLines={1}>{ae.categoryLabel(crewCategory, lang)} · {ae.contractLabel(crewContract || '12/12', lang)}</Text>
        <View style={s.aeRow}><Text style={s.aeK}>{t('profile.aeMonthlyBase', lang)}</Text><Text style={s.aeV}>{fmtEur0(base)}</Text></View>
        <View style={s.aeRow}><Text style={s.aeK}>{t('profile.aePerDiem', lang)}</Text><Text style={[s.aeV, { color: C.red }]}>+{fmtEur0(pdTotal)}</Text></View>
        <View style={s.aeBar}><View style={[s.aeBarFill, { width: `${Math.round(fill * 100)}%` }]} /></View>
        <View style={[s.aeRow, s.aeTotalRow]}><Text style={s.aeTotalK}>{t('profile.aeTotalEst', lang)}</Text><Text style={s.aeTotalV}>{fmtEur0(total)}</Text></View>
        {pd && pd.missing > 0 ? <Text style={s.aeMiss}>{pd.missing} {t('profile.aePdMissing', lang)}</Text> : null}
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

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>

        {/* Cabeçalho — eyebrow do operador (ponto vermelho) + sino + saudação */}
        <View style={s.htop}>
          <View style={s.hlw}>
            <View style={s.hrd} />
            <Text style={s.hl} numberOfLines={1}>{opEyebrow}</Text>
          </View>
          <TouchableOpacity style={s.hbtn} onPress={() => setNotifOpen(true)} activeOpacity={0.8} hitSlop={8} accessibilityLabel={t('home.notifsAria', lang)}>
            <Ionicons name="notifications-outline" size={18} color={C.text} />
            {unread > 0 && <View style={s.headerBadge}><Text style={s.headerBadgeTxt}>{unread}</Text></View>}
          </TouchableOpacity>
        </View>
        <Text style={s.ht}>{t('home.hello', lang)}{firstName ? `, ${firstName}` : ''}</Text>

        {/* Tira de 5 dias — hoje a contorno vermelho, próximo voo preenchido, ponto nos dias com voo */}
        <View style={s.week}>
          {weekDays.map((wdy) => {
            const isNext = nextFlightISO === wdy.iso;
            return (
              <TouchableOpacity key={wdy.iso} activeOpacity={0.8}
                onPress={() => { select(); navigation.navigate('Escala', { screen: 'Escala', params: { view: 'month' } }); }}
                style={[s.wd, isNext && s.wdOn, wdy.isToday && !isNext && s.wdToday]}>
                <Text style={[s.wdNum, isNext && s.wdNumOn, wdy.isToday && !isNext && s.wdNumToday]}>{wdy.day}</Text>
                <Text style={[s.wdDay, isNext && s.wdDayOn]}>{wdy.wd}</Text>
                <View style={[s.wdDot, wdy.hasFlight && s.wdDotOn, isNext && wdy.hasFlight && s.wdDotWhite]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Estado FTL — linha de estado (ponto semáforo + contexto à direita) */}
        <View style={s.statline}>
          <View style={[s.statDot, { backgroundColor: stateColor }]} />
          <Text style={s.statLabel} numberOfLines={1}>{stateLabel}</Text>
          <Text style={s.statCtx} numberOfLines={1}>{crewCategory ? `${crewCategory}${crewContract ? ' · ' + crewContract : ''}` : (stateReason || '')}</Text>
        </View>

        {/* Próximo voo — badge circular do report + rota + meta + etiquetas */}
        {nextDutyEl}

        {/* Cartão AE — companhias com Acordo de Empresa (pagamento do mês) */}
        {aeCardEl}

        {/* Alertas — só quando existem (urgente → acima dos limites) */}
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

        {/* Limites acumulados — pior janela em destaque + expandir */}
        <View style={s.panel}>
          <Text style={s.secTitle}>{t('home.dashLimits', lang)}</Text>
          <Seg options={[{ id: 'servico', label: catLabel('servico', lang) }, { id: 'voo', label: catLabel('voo', lang) }]} value={limCat} setValue={setLimCat} />
          {catLimits.some(w => w.done > 0) ? (
            <>
              <ProgressRow key={catWorst.id} label={limLabel(catWorst)} done={catWorst.done} limit={catWorst.limit} lang={lang} s={s} C={C} />
              {limExpanded ? catLimits.filter(w => w !== catWorst).map(w => (
                <ProgressRow key={w.id} label={limLabel(w)} done={w.done} limit={w.limit} lang={lang} s={s} C={C} />
              )) : null}
              <TouchableOpacity onPress={() => { select(); setLimExpanded(e => !e); }} hitSlop={6} activeOpacity={0.7}>
                <Text style={s.limToggle}>{limExpanded ? t('home.showLess', lang) : t('home.showAll', lang)}</Text>
              </TouchableOpacity>
            </>
          ) : <Text style={s.panelEmptyTxt}>{t('home.limitsEmpty', lang)}</Text>}
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
          <TouchableOpacity style={s.shortcut} activeOpacity={0.85} onPress={() => { select(); navigation.navigate('Escala', { screen: 'Escala', params: { view: 'month' } }); }}>
            <Ionicons name="calendar-outline" size={20} color={C.text} />
            <Text style={s.shortcutTxt}>{t('home.calTitle', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.shortcut} activeOpacity={0.85} onPress={() => { select(); navigation.navigate('Escala', { screen: 'Escala', params: { view: 'list' } }); }}>
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

  // Cabeçalho — eyebrow do operador + sino + saudação display
  htop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  hlw: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  hrd: { width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.red },
  hl: { fontSize: 10.5, fontWeight: WEIGHT.heavy, letterSpacing: 1.3, color: C.sub, textTransform: 'uppercase', flexShrink: 1 },
  hbtn: { position: 'relative', width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  headerBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.canvas },
  headerBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
  ht: { fontSize: 28, fontWeight: WEIGHT.heavy, letterSpacing: -0.6, color: C.text, lineHeight: 30, marginBottom: SPACE.lg },

  // Tira de 5 dias
  week: { flexDirection: 'row', gap: 7, justifyContent: 'space-between', marginBottom: SPACE.md },
  wd: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line },
  wdOn: { backgroundColor: C.ink, borderColor: C.ink },
  wdToday: { borderColor: C.red },
  wdNum: { fontSize: 17, fontWeight: WEIGHT.semibold, color: C.text, lineHeight: 18 },
  wdNumOn: { color: '#fff' },
  wdNumToday: { color: C.red },
  wdDay: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: C.sub, marginTop: 4 },
  wdDayOn: { color: C.onDarkSub },
  wdDot: { width: 5, height: 5, borderRadius: RADIUS.pill, backgroundColor: 'transparent', marginTop: 5 },
  wdDotOn: { backgroundColor: C.red },
  wdDotWhite: { backgroundColor: '#fff' },

  // Estado FTL — linha de estado (ponto semáforo + contexto à direita)
  statline: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: SPACE.md },
  statDot: { width: 9, height: 9, borderRadius: RADIUS.pill },
  statLabel: { fontSize: TYPE.label, fontWeight: WEIGHT.heavy, color: C.text },
  statCtx: { marginLeft: 'auto', fontSize: 10, fontWeight: WEIGHT.heavy, letterSpacing: 0.4, color: C.sub, textTransform: 'uppercase' },

  // Cartão AE — pagamento do mês (companhias com Acordo de Empresa)
  aeCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md, backgroundColor: C.card },
  aeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aeDot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: C.red },
  aeEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.sub, fontWeight: '800', textTransform: 'uppercase' },
  aeSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 4, marginBottom: 8 },
  aeRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 5 },
  aeK: { fontSize: TYPE.sub, color: C.sub, fontWeight: '500' },
  aeV: { fontSize: TYPE.body, color: C.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  aeBar: { height: 6, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden', marginTop: 6, marginBottom: 2 },
  aeBarFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.red },
  aeTotalRow: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 6, paddingTop: 10 },
  aeTotalK: { fontSize: TYPE.body, color: C.text, fontWeight: '700' },
  aeTotalV: { fontSize: TYPE.value + 2, color: C.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  aeMiss: { fontSize: TYPE.micro, color: C.sub, marginTop: 6 },

  // Próximo voo — badge circular do report + texto
  nd: { flexDirection: 'row', alignItems: 'flex-start', gap: 15, marginBottom: SPACE.md },
  ndCirc: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: C.red, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ndCircTime: { fontSize: 25, fontWeight: WEIGHT.semibold, color: '#fff', lineHeight: 26 },
  ndCircLbl: { fontSize: 9, fontWeight: WEIGHT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  ndX: { flex: 1, minWidth: 0, paddingTop: 2 },
  ndXTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ndXEyebrow: { fontSize: 9, fontWeight: WEIGHT.heavy, letterSpacing: 1.6, textTransform: 'uppercase', color: C.sub },
  ndCountdown: { fontSize: TYPE.micro, fontWeight: '700', color: C.red },
  ndRoute: { fontSize: 26, fontWeight: WEIGHT.semibold, color: C.text, letterSpacing: -0.4, marginTop: 5, marginBottom: 4 },
  ndMeta: { fontSize: TYPE.micro, fontWeight: '700', color: C.sub },
  ndMetaEm: { color: C.red, fontWeight: '700' },
  ndTags: { flexDirection: 'row', gap: 7, marginTop: 9, flexWrap: 'wrap' },
  ndSrc: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  ndSrcTxt: { fontSize: 9, fontWeight: WEIGHT.heavy, letterSpacing: 0.3, textTransform: 'uppercase', color: C.sub },
  ndFat: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  ndFatDot: { width: 7, height: 7, borderRadius: 99 },
  ndFatTxt: { fontSize: 9, fontWeight: WEIGHT.heavy, letterSpacing: 0.3, textTransform: 'uppercase' },
  bdLbl: { flex: 1, fontSize: TYPE.sub, color: C.onDarkSub },
  bdVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: '#fff', fontWeight: '600' },
  // Barras de progresso (limites · repouso)
  prog: { marginBottom: SPACE.md + 4 },
  progTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  progLbl: { fontSize: TYPE.sub, fontWeight: '600', color: C.text },
  progVal: { fontSize: TYPE.sub, fontFamily: 'monospace', color: C.sub },
  progTrack: { height: 10, borderRadius: RADIUS.pill, backgroundColor: C.line, overflow: 'hidden' },
  progFill: { height: 10, borderRadius: RADIUS.pill },
  progFoot: { fontSize: TYPE.micro, color: C.sub, marginTop: 6 },
  restItem: { marginBottom: SPACE.md },
  restItemLbl: { fontSize: TYPE.eyebrow, letterSpacing: 1, color: C.sub, fontWeight: '700' },
  restHero: { fontSize: TYPE.display, fontWeight: WEIGHT.semibold, letterSpacing: TRACK_DISPLAY, color: C.text, marginTop: 2, marginBottom: SPACE.sm },
  setoresRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Painéis claros (limites · repouso · alertas) + atalhos
  panel: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.md, backgroundColor: C.card },
  secTitle: { fontSize: TYPE.label, fontWeight: '700', color: C.text, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACE.md },
  panelEmptyTxt: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.sm },
  limToggle: { fontSize: TYPE.micro, color: C.sub, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  shortcutsRow: { flexDirection: 'row', gap: SPACE.md, marginBottom: SPACE.md },
  shortcut: { flex: 1, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingVertical: SPACE.md + 4, backgroundColor: C.card },
  shortcutTxt: { fontSize: TYPE.label, fontWeight: '600', color: C.text },
  alertCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.md, backgroundColor: C.card },
  alertHead: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginBottom: SPACE.sm },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  alertRowDiv: { borderTopWidth: 1, borderTopColor: C.line },
  alertTxt: { flex: 1, fontSize: TYPE.sub, color: C.text },
  simCta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.ink, borderRadius: RADIUS.xl, padding: SPACE.md + 2, marginBottom: SPACE.md },
  simIcon: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  simTitle: { fontSize: TYPE.body, fontWeight: '700', color: '#fff' },
  simSub: { fontSize: TYPE.micro, color: C.onDarkSub, marginTop: 2 },

  // Próximo duty — estado vazio / sem permissão (cartão claro)
  flightCard: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md + 2, marginBottom: SPACE.md, backgroundColor: C.card },
  flightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  flightEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700' },
  flightBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, minHeight: 24, justifyContent: 'center' },
  flightEmpty: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.sm },
  flightEmptyTxt: { flex: 1, fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: SPACE.sm, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  grantBtnTxt: { color: '#fff', fontSize: TYPE.sub, fontWeight: '600' },

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
