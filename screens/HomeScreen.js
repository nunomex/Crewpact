import React, { useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import NotificationsBell from '../components/NotificationsBell';
import { getUpcomingFlight, requestCalendarAccess } from '../data/calendar';
import { catLabel } from '../data/extras';
import { monthlyAe, aeMonthTotal } from '../data/perdiem';
import { sectorDistanceNM } from '../data/airports';
import { yearStats, ANNUAL_FLIGHT_LIMIT_H } from '../data/stats';
import PageHeader from '../components/PageHeader';
import { computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty } from '../ftl';
import Skeleton from '../components/Skeleton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, toZulu } from '../data/appContext';
import { UpcomingDutiesCard } from '../components/HomeDutyCards';

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

// Skeleton do próximo voo — mesma FORMA do badge real (círculo + linhas + 2 tags),
// mostrado durante o 1º carregamento do calendário para evitar spinner + salto.
function NextFlightSkeleton({ s }) {
  return (
    <View style={s.nd}>
      <View style={s.ndCircWrap}><Skeleton circle h={78} /></View>
      <View style={s.ndX}>
        <Skeleton w={88} h={11} r={4} style={{ marginBottom: 9 }} />
        <Skeleton w={150} h={18} r={5} style={{ marginBottom: 9 }} />
        <Skeleton w={120} h={12} r={4} style={{ marginBottom: 13 }} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton w={104} h={20} r={99} />
          <Skeleton w={76} h={20} r={99} />
        </View>
      </View>
    </View>
  );
}

// Constrói um objeto "voo" (forma do calendário) a partir de um duty MANUAL do
// store, para a Home o poder mostrar no "próximo voo". startDate = report + 1 h
// porque o countdown da Home calcula partida − 1 h ≈ report.
function dutyToFlight(iso, d) {
  if (!d || d.deleted || !d.report_time) return null;
  const ap = String(d.route || '').split(/[^A-Za-z]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  const at = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); const dt = new Date(iso + 'T00:00:00'); dt.setHours(h || 0, m || 0, 0, 0); return dt; };
  const reportInstant = at(d.report_time);
  // Fim do duty (para esconder os já terminados). Com block-on: se a hora for mais
  // cedo que o report, o duty VIRA A NOITE → fim no dia seguinte. Sem block-on,
  // mantém-se até ao fim desse dia.
  let endDate;
  if (d.block_on) {
    const e = at(d.block_on);
    endDate = e.getTime() < reportInstant.getTime() ? new Date(e.getTime() + 86400000) : e;
  } else {
    endDate = at('23:59');
  }
  const dep = ap[0] || '—';
  const last = ap[ap.length - 1];
  const arr = (ap.length > 1 ? (last !== dep ? last : ap[1]) : dep) || '—';  // ida-volta → mostra a estação fora
  return {
    kind: d.kind || 'flight', nightStop: !!d.nightStop, manual: true, dateISO: iso,
    report: d.report_time,
    depTime: d.block_off || d.report_time,
    arrTime: d.block_on || d.report_time,
    depAirport: dep, arrAirport: arr,
    sectors: d.sectors || null,
    startDate: new Date(reportInstant.getTime() + 60 * 60 * 1000),
    endDate,
  };
}

// Próximo voo efetivo = o mais próximo entre o duty manual (store) e o voo do
// calendário. Empate de dia → o manual ganha (mesmo critério da roda da Escala).
function mergeNextFlight(calFlight, duties, now) {
  let best = null;
  for (const iso in duties) {
    const mf = dutyToFlight(iso, duties[iso]);
    if (!mf || mf.endDate.getTime() < now) continue;   // inválido/apagado ou JÁ TERMINADO
    // o mais próximo: por dia e, no mesmo dia, pela hora de início (apanha o em curso)
    if (!best || mf.dateISO < best.dateISO || (mf.dateISO === best.dateISO && mf.startDate < best.startDate)) best = mf;
  }
  if (!best) return calFlight;
  if (!calFlight) return best;
  if (best.dateISO < calFlight.dateISO) return best;
  if (best.dateISO > calFlight.dateISO) return calFlight;
  return calFlight; // mesmo dia → calendário ganha (eCrew tem prioridade)
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
const SHOW_DEMO_FLIGHT = false;
const DEMO_FLIGHT = (() => {
  const dep = new Date(); dep.setDate(dep.getDate() + 1); dep.setHours(6, 40, 0, 0); // partida amanhã 06:40 (report 05:40)
  const iso = `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`;
  return { demo: true, dateISO: iso, report: '05:40', depAirport: 'LIS', arrAirport: 'FNC', arrTime: '13:20', sectors: 2, startDate: dep };
})();

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { profile, user, lang, readNotifIds, setReadNotifIds, ftlSnap, dayLog, duties, company, ae, crewCategory, crewContract, isPilot, rosterChanges, aeExtras } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

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

  // ── Próximo voo (calendário) — carrega automaticamente ao abrir ──
  const [calFlight, setCalFlight] = useState(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null);
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
      setCalFlight(res.flight || (SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null)); // sem voo real → mostra o exemplo
    } catch { setCalFlight(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null); }
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

  // Próximo voo EFETIVO = funde o duty manual (store `duties`) com o voo do
  // calendário do telemóvel e mostra o mais próximo (empate de dia → manual ganha,
  // como a roda da Escala). Resolve "inseri um duty e não aparece na Home".
  const flight = useMemo(() => mergeNextFlight(calFlight, duties, Date.now()), [calFlight, duties]);

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
  // Dia do voo para o badge circular (número + dia da semana).
  const ndDayNum = flight ? new Date(flight.dateISO + 'T00:00:00').getDate() : null;
  const ndReportZ = flight ? toZulu(flight.dateISO, flight.report) : null;
  const ndDayWd = flight ? (() => {
    const w = new Date(flight.dateISO + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
    return w.charAt(0).toUpperCase() + w.slice(1);
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

  // Skeleton só no 1º carregamento real (a sincronizar, ainda sem resultado e com
  // acesso ao calendário) — não no estado "sem voo" nem no pedido de permissão.
  const loadingFlight = !flight && syncing && !syncDone && calOk;
  const nextDutyEl = flight ? (
    <View style={s.nd}>
      <View style={s.ndCircWrap}>
        {stateLevel === 'over' && <PulseRing size={78} color={C.red} border duration={2800} />}
        <View style={s.ndCirc}>
          <Text style={s.ndCircDay}>{ndDayNum}</Text>
          <Text style={s.ndCircLbl}>{ndDayWd}</Text>
        </View>
      </View>
      <View style={s.ndX}>
        <View style={s.ndXTop}>
          <Text style={s.ndXEyebrow}>{t('home.nextDuty', lang)}</Text>
          {countdownStr ? <Text style={s.ndCountdown}>{countdownStr}</Text> : null}
        </View>
        <Text style={s.ndRoute} numberOfLines={1}>{flight.kind && flight.kind !== 'flight' ? t('duties.kind.' + flight.kind, lang) : `${flight.depAirport} · ${flight.arrAirport}`}</Text>
        {flight.nightStop ? <Text style={{ fontSize: 11, fontFamily: FONT.semibold, color: C.text, marginTop: 2 }}>🌙 {lang === 'en' ? 'Night stop' : 'Paragem nocturna'}</Text> : null}
        <Text style={s.ndMeta} numberOfLines={1}>
          {ndSectors ? `${ndSectors} ${t('duties.sectorsShort', lang)}` : ''}
          {aeNextPd != null ? <Text>{ndSectors ? ' · ' : ''}per diem <Text style={s.ndMetaEm}>{fmtEur0(aeNextPd)}</Text></Text> : null}
        </Text>
        <View style={s.ndTags}>
          {/* Linha 1 — origem do voo + report */}
          <View style={s.ndTagRow}>
            <View style={s.ndSrc}>
              <Ionicons name="calendar-outline" size={10} color={C.sub} />
              <Text style={s.ndSrcTxt}>{lang === 'en' ? 'from calendar' : 'do calendário'}</Text>
            </View>
            <View style={s.ndSrc}>
              <Ionicons name="time-outline" size={10} color={C.sub} />
              <Text style={s.ndSrcTxt}>Report <Text style={s.ndSrcEm}>{flight.report}</Text></Text>
            </View>
          </View>
          {/* Linha 2 — fadiga + PSV máx */}
          {(ndFat || ndPsvMax) ? (
            <View style={s.ndTagRow}>
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
          ) : null}
        </View>
        <Text style={s.ndTimes} numberOfLines={1}>Local {flight.report}  ·  Zulu {ndReportZ || '—'}Z</Text>
      </View>
    </View>
  ) : loadingFlight ? (
    <NextFlightSkeleton s={s} />
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
    const index = ae.indexFactor ? ae.indexFactor(d.getFullYear()) : 1;   // indexação 2025+ (Anexo I)
    // Caminho único (= Perfil/Cálculos): monthlyAe (base+abono+per-diem+pernoita+escritório) + extras do mês.
    const m = monthlyAe(duties, crewCategory, crewContract || '12/12', ae, { ym, index });
    const base = m ? m.base : ae.monthlyBase(crewCategory, { contract: crewContract || '12/12', index });
    const total = aeMonthTotal(duties, crewCategory, crewContract || '12/12', ae, { ym, index, extras: (aeExtras && aeExtras[ym]) || {} }) || base;
    const variable = +(total - base).toFixed(2);
    const fill = total > 0 ? Math.min(1, variable / total) : 0;
    return (
      <TouchableOpacity style={s.uc} activeOpacity={0.9} onPress={() => { select(); navigation.navigate('FTL'); }}>
        <View style={s.ucHead}><View style={[s.ucDot, s.ucDotAe]} /><Text style={s.ucTitle} numberOfLines={1}>AE · {monthName}</Text></View>
        <View style={[s.aeMRow, s.aeMRow0]}><Text style={s.aeMK} numberOfLines={1}>Base ({crewContract || '12/12'})</Text><Text style={s.aeMV}>{fmtEur0(base)}</Text></View>
        <View style={s.aeMRow}><Text style={s.aeMK} numberOfLines={1}>{lang === 'en' ? 'Variable' : 'Variável'}</Text><Text style={[s.aeMV, { color: C.red }]}>+{fmtEur0(variable)}</Text></View>
        <View style={s.aeMRow}><Text style={s.aeMKtot} numberOfLines={1}>{t('home.aeEst', lang)}</Text><Text style={s.aeMVtot}>{fmtEur0(total)}</Text></View>
        <MiniBar ratio={fill} color={C.red} track={s.aeMBar} fill={s.aeMBarFill} />
      </TouchableOpacity>
    );
  })() : null;

  // ── Estatísticas YTD — cartão COMPACTO (.uc) na grelha, no lugar do FTL·Voo.
  // Toca → abre a página Stats. Mostra setores/dias + total de horas de voo do ano
  // com barra vs limite anual (1000 h). ──
  const statsYtd = useMemo(
    () => yearStats(duties, { year: new Date().getFullYear(), ae, category: crewCategory, contract: crewContract || '12/12' }),
    [duties, ae, crewCategory, crewContract],
  );
  const statRatio = Math.min(1, statsYtd.flightHours / ANNUAL_FLIGHT_LIMIT_H);
  const statsMiniEl = statsYtd.count > 0 ? (
    <TouchableOpacity style={s.uc} activeOpacity={0.9} onPress={() => { select(); navigation.navigate('Stats'); }}>
      <View style={s.ucHead}><View style={s.ucDot} /><Text style={s.ucTitle} numberOfLines={1}>{l('Estatísticas', 'Statistics')} · {new Date().getFullYear()}</Text></View>
      <View style={[s.aeMRow, s.aeMRow0]}><Text style={s.aeMK} numberOfLines={1}>{l('Setores', 'Sectors')}</Text><Text style={s.aeMV}>{statsYtd.sectors}</Text></View>
      <View style={s.aeMRow}><Text style={s.aeMK} numberOfLines={1}>{l('Dias de escala', 'Duty days')}</Text><Text style={s.aeMV}>{statsYtd.count}</Text></View>
      <View style={s.aeMRow}><Text style={s.aeMKtot} numberOfLines={1}>{l('Voo (ano)', 'Flight (yr)')}</Text><Text style={s.aeMVtot}>{statsYtd.flightHours.toLocaleString(locale, { maximumFractionDigits: 1 })} h</Text></View>
      <MiniBar ratio={statRatio} color={barColor(statRatio, C)} track={s.aeMBar} fill={s.aeMBarFill} />
    </TouchableOpacity>
  ) : null;

  // Cartão FTL · Voo (limites de voo). Vai para a grelha quando NÃO há stats; quando
  // há stats, o Stats ocupa o lugar e este desce para baixo das Próximas atividades.
  const ftlVooCard = (
    <LimitCard title={`FTL · ${catLabel('voo', lang)}`} windows={flightLimits} limLabel={limLabel} s={s} C={C} />
  );

  // ── Cabeçalho premium + tira de 5 dias ──
  const firstName = ((user?.name || user?.email?.split('@')[0] || '').split(' ')[0]) || '';
  const crewWord = isPilot ? (lang === 'en' ? 'Pilot' : 'Piloto') : (lang === 'en' ? 'Cabin' : 'Cabine');
  const opEyebrow = [company?.name, ae ? 'AE' : 'FTL', crewWord].filter(Boolean).join(' · ').toUpperCase();

  // Entrada escalonada das secções (hook partilhado, re-toca no foco) — mockup .rise.
  const seg = useEnter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>

        {/* Cabeçalho claro (PageHeader) — eyebrow do operador + sino + saudação */}
        <PageHeader
          eyebrow={opEyebrow}
          title={`${t('home.hello', lang)}${firstName ? `, ${firstName}` : ''}`}
          right={<NotificationsBell />}
        />

        {/* Estado FTL — linha de estado (ponto semáforo a pulsar + contexto à direita) */}
        <Animated.View style={[s.statline, seg(1)]}>
          <View style={s.statDotWrap}>
            {(stateLevel === 'over' || stateLevel === 'warn') && <PulseRing size={9} color={stateColor} duration={2400} />}
            <View style={[s.statDot, { backgroundColor: stateColor }]} />
          </View>
          <Text style={s.statLabel} numberOfLines={1}>{stateLabel}</Text>
          <Text style={s.statCtx} numberOfLines={1}>{crewCategory ? `${crewCategory}${crewContract ? ' · ' + crewContract : ''}` : (stateReason || '')}</Text>
        </Animated.View>

        {/* Alterações de escala (Fase 4) — aviso quando o calendário difere do guardado */}
        {(() => {
          const rc = rosterChanges?.counts || {};
          if (!rc.total) return null;
          const ch = (rc.changed || 0) + (rc.conflict || 0);
          const parts = [ch ? `${ch} ${l('alterada(s)', 'changed')}` : null, rc.added ? `${rc.added} ${l('nova(s)', 'new')}` : null, rc.removed ? `${rc.removed} ${l('cancelada(s)', 'cancelled')}` : null].filter(Boolean).join(' · ');
          return (
            <TouchableOpacity activeOpacity={0.9} onPress={() => { select(); navigation.navigate('Escala'); }} style={s.rcBanner}>
              <Ionicons name="sync-circle" size={22} color={C.warn || C.red} />
              <View style={{ flex: 1 }}>
                <Text style={s.rcTitle}>{l('Alterações na escala', 'Roster changes')}</Text>
                <Text style={s.rcSub} numberOfLines={1}>{parts}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.sub} />
            </TouchableOpacity>
          );
        })()}

        {/* Próximo voo — badge circular do report + rota + meta + etiquetas */}
        <Animated.View style={seg(2)}>{nextDutyEl}</Animated.View>

        {/* Grelha de baixo — Stats (compacto) + (AE compacto | FTL·Serviço). Quando
            ainda não há stats, o FTL·Voo fica aqui (fallback). */}
        <Animated.View style={[s.grid2, seg(3)]}>
          {statsMiniEl || ftlVooCard}
          {ae && crewCategory ? aeMiniEl : <LimitCard title={`FTL · ${catLabel('servico', lang)}`} windows={dutyLimits} limLabel={limLabel} s={s} C={C} />}
        </Animated.View>
        {(!(ae && crewCategory) && !hasLimitData) ? <Text style={s.gridHint}>{t('home.limitsEmpty', lang)}</Text> : null}

        {/* Próximas atividades (qualquer tipo de duty) — card no fundo */}
        <Animated.View style={seg(4)}><UpcomingDutiesCard duties={duties} lang={lang} /></Animated.View>

        {/* FTL · Voo — desce para baixo das Próximas atividades (largura inteira) quando
            o Stats lhe tomou o lugar na grelha. */}
        {statsMiniEl ? <Animated.View style={[s.grid2, seg(5)]}>{ftlVooCard}</Animated.View> : null}
      </ScrollView>
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

  // Estado FTL — linha de estado (ponto semáforo + contexto à direita)
  statline: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: SPACE.md },
  statDotWrap: { width: 9, height: 9, alignItems: 'center', justifyContent: 'center' },
  statDot: { width: 9, height: 9, borderRadius: RADIUS.pill },
  statLabel: { fontSize: TYPE.label, fontFamily: FONT.heavy, color: C.text },
  statCtx: { marginLeft: 'auto', fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.4, color: C.sub, textTransform: 'uppercase' },

  // Próximo voo — badge circular do report + texto
  nd: { flexDirection: 'row', alignItems: 'flex-start', gap: 15, marginBottom: SPACE.md },
  ndCircWrap: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ndCirc: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: C.red, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ndCircDay: { fontSize: 32, fontFamily: FONT.semibold, color: '#fff', lineHeight: 34, letterSpacing: -0.5, textAlign: 'center' },
  ndCircLbl: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.85, textTransform: 'uppercase', color: 'rgba(255,255,255,0.88)', marginTop: 1, textAlign: 'center', includeFontPadding: false },
  ndX: { flex: 1, minWidth: 0, paddingTop: 2 },
  ndXTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ndXEyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.6, textTransform: 'uppercase', color: C.sub },
  ndCountdown: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.red },
  ndRoute: { fontSize: 26, fontFamily: FONT.semibold, color: C.text, letterSpacing: -0.4, marginTop: 5, marginBottom: 4 },
  ndMeta: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.sub },
  ndMetaEm: { color: C.red, fontFamily: FONT.bold },
  ndTags: { marginTop: 9, gap: 7 },
  ndTagRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  ndSrc: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  ndSrcTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase', color: C.sub },
  ndTimes: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 10 },
  ndSrcEm: { color: C.text, fontFamily: FONT.heavy },
  ndFat: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  ndFatDot: { width: 7, height: 7, borderRadius: 99 },
  ndFatTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase' },

  // Grelha 2-col (mockup .grid2/.uc/.win/.wbar)
  grid2: { flexDirection: 'row', gap: 11, marginBottom: SPACE.md },
  gridHint: { fontSize: TYPE.micro, color: C.sub, marginTop: -8, marginBottom: SPACE.md, paddingHorizontal: 2, lineHeight: 16 },
  uc: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 15,
    shadowColor: '#14161A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  ucHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  ucDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: C.ink },
  ucTitle: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: C.sub, flexShrink: 1 },
  ucWin: { marginTop: 10 },
  ucWl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 5 },
  ucA: { fontSize: 11, fontFamily: FONT.bold, color: C.sub, flexShrink: 1 },
  ucB: { fontSize: 11, color: C.sub, fontVariant: ['tabular-nums'] },
  ucBnum: { color: C.text, fontFamily: FONT.bold },
  ucBar: { height: 5, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden' },
  ucBarFill: { height: '100%', borderRadius: RADIUS.pill },
  // AE compacto (cartão direito da grelha, mockup .uc.ae)
  ucDotAe: { backgroundColor: C.red },
  aeMRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.line },
  aeMRow0: { borderTopWidth: 0 },
  aeMK: { fontFamily: FONT.bold, fontSize: 11, color: C.sub, flexShrink: 1 },
  aeMV: { fontFamily: FONT.semibold, fontSize: 13, color: C.text, fontVariant: ['tabular-nums'] },
  aeMKtot: { fontFamily: FONT.heavy, fontSize: 11, color: C.text },
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

  // Alterações de escala (Fase 4) — banner de aviso
  rcBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.warnSoft || C.soft, borderWidth: 1, borderColor: C.warn || C.line, borderRadius: 16, padding: 13, marginBottom: SPACE.md },
  rcTitle: { fontSize: TYPE.label, fontFamily: FONT.heavy, color: C.text },
  rcSub: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.sub, marginTop: 2 },

  // Notificações
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.xl - 4, paddingVertical: SPACE.md + 5 },
  notifDot: { width: 8, height: 8, borderRadius: RADIUS.pill, flexShrink: 0 },
  notifMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
  tagBadge: { backgroundColor: C.soft, borderRadius: RADIUS.sm - 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagTxt: { fontSize: 11, fontFamily: FONT.semibold, color: C.text, letterSpacing: 0.5 },
  notifTime: { fontSize: TYPE.eyebrow, color: C.sub },
  notifItemTitle: { fontSize: 13, fontFamily: FONT.medium, color: C.text },
  notifItemBody: { fontSize: TYPE.label, color: C.sub, marginTop: 2, lineHeight: 17 },
  noMore: { textAlign: 'center', fontSize: 11, color: C.sub, padding: SPACE.lg },
});
