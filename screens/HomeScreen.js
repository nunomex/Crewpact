import React, { useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Animated, Easing, AppState, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import HeaderActions from '../components/HeaderActions';
import Banner from '../components/Banner';
import { getUpcomingFlight } from '../data/calendar';
import { catLabel } from '../data/extras';
import { monthlyAe, aeMonthTotal, routeDistancesNM } from '../data/perdiem';
import { sectorDistanceNM } from '../data/airports';
import { yearStats, ANNUAL_FLIGHT_LIMIT_H } from '../data/stats';
import { isLongHaulCompany } from '../data/capabilities';
import PageHeader from '../components/PageHeader';
import Eyebrow from '../components/Eyebrow';
import { computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty, liveFdpVerdict } from '../ftl';
import Skeleton from '../components/Skeleton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import useReduceMotion from '../hooks/useReduceMotion';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, toZulu } from '../data/appContext';
import { airportZulu, legZulu } from '../data/zulu';
import { UpcomingDutiesCard } from '../components/HomeDutyCards';
import QuestionDetailSheet from '../components/QuestionDetailSheet';
import { buildTodayItems } from './hojeItems';
import { fetchFlightStatus, hasDeviation, worstDelay, arrDelayMin, recordBehindLive, settledArrZ, schedArrZ } from '../data/flightStatus';
import CountUp from '../components/CountUp';

// Cor da barra por nível de consumo: verde < 70 %, âmbar 70–90 %, vermelho ≥ 90 %.
const barColor = (ratio, C) => (ratio >= 0.9 ? C.red : ratio >= 0.7 ? C.warn : C.green);

// Anel a pulsar (escala 1→1.7 + desvanece, em loop) — atrás do ponto de estado e
// do badge do report, como o mockup (@keyframes ring).
function PulseRing({ size, color, border = false, duration = 2400, radius }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, duration, reduce]);
  // Reduz-movimento: anel ESTÁTICO (o sinal de perigo mantém-se pela cor/borda, sem pulsar).
  if (reduce) {
    return (
      <View pointerEvents="none" style={{
        position: 'absolute', width: size, height: size, borderRadius: radius != null ? radius : size / 2,
        ...(border ? { borderWidth: 2, borderColor: color } : { backgroundColor: color }), opacity: 0.35,
      }} />
    );
  }
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
// `mark` (0–1) = marca fina no limite → dupla-codificação: a proximidade do limite
// lê-se SEM depender da cor (p/ daltónicos). Respeita reduz-movimento (salta ao valor).
function MiniBar({ ratio, color, track, fill, mark }) {
  const C = useTheme();
  const reduce = useReduceMotion();
  const target = Math.max(0, Math.min(1, ratio || 0));
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { w.setValue(target); return; }
    Animated.timing(w, { toValue: target, duration: 800, delay: 300, useNativeDriver: false }).start();
  }, [target, w, reduce]);
  return (
    <View style={track}>
      <Animated.View style={[fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      {mark != null ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.round(mark * 100)}%`, width: 2, marginLeft: -1, backgroundColor: C.ink, opacity: 0.4 }} />
      ) : null}
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
    flightNo: (d.legs && d.legs[0] && d.legs[0].flightNo) || null,   // p/ o estado do voo ao vivo
    report: d.report_time,
    depTime: d.block_off || d.report_time,
    arrTime: d.block_on || d.report_time,
    depAirport: dep, arrAirport: arr,
    stations: ap.length ? ap : [dep],  // cadeia completa de escalas (multi-leg) p/ a linha principal da Home
    sectors: d.sectors || null,
    legs: Array.isArray(d.legs) ? d.legs : null,   // setores (off/on por leg) p/ o "setor ativo"
    route: d.route || null,                        // p/ o per-diem do DIA (todos os setores)
    blockOn: d.block_on || null, signOff: d.signOff || null,
    reportDate: reportInstant,   // instante ABSOLUTO do report (o countdown usa-o, como no calendário)
    startDate: new Date(reportInstant.getTime() + 60 * 60 * 1000),
    endDate,
  };
}

// HH:MM → instante no dia `iso`; se for ANTES da apresentação → vira a noite (dia seguinte).
function legInstant(iso, hhmm, report) {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(hhmm || '')); if (!m) return null;
  const dt = new Date(`${iso}T00:00:00`); dt.setHours(+m[1], +m[2], 0, 0);
  const r = /^(\d{1,2}):([0-5]\d)$/.exec(String(report || ''));
  if (r && (+m[1] * 60 + +m[2]) < (+r[1] * 60 + +r[2])) dt.setDate(dt.getDate() + 1);
  return dt;
}
// Block "H:MM" de um setor (on − off, volta-a-meia-noite). null se faltar.
function legBlockStr(lg) {
  const o = /^(\d{1,2}):([0-5]\d)$/.exec(String((lg && lg.off) || '')), n = /^(\d{1,2}):([0-5]\d)$/.exec(String((lg && lg.on) || ''));
  if (!o || !n) return null;
  const om = +o[1] * 60 + +o[2], nm = +n[1] * 60 + +n[2]; const d = nm >= om ? nm - om : nm + 1440 - om;
  return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
}

// Próximo voo efetivo = o mais próximo entre o duty GUARDADO (store) e o voo do
// calendário ao vivo. Empate de dia → o guardado ganha (offline-first; mesmo critério da roda).
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
  return best; // mesmo dia → o GUARDADO ganha (offline-first; já inclui o calendário auto-gravado + os teus edits)
}

// Cartão de limites compacto (mockup .uc) — título + janelas, cada uma com
// mini-barra colorida por severidade. Usado na grelha 2-col do Início.
function LimitCard({ title, question, windows, limLabel, s, C }) {
  return (
    <View style={s.uc}>
      {question ? <Text style={s.ucQ} numberOfLines={1}>{question}</Text> : null}
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
              <Text style={s.ucB} numberOfLines={1}>{Math.round(r * 100)}% · <Text style={s.ucBnum}>{Math.round(w.done)}</Text>/{Math.round(w.limit)}h</Text>
            </View>
            <MiniBar ratio={r} color={barColor(r, C)} track={s.ucBar} fill={s.ucBarFill} mark={0.9} />
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
  const { profile, user, lang, readNotifIds, setReadNotifIds, ftlSnap, dayLog, duties, company, calendarId, ae, crewCategory, crewContract, crewFleet, crewHistory, isPilot, rosterChanges, aeExtras, validities, markLiveSync } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Respostas da antiga Briefing no Início (reaproveita o MESMO `buildTodayItems` → consciente de
  // tripulação/categoria via ae/isPilot). "Estou legal?" só aparece quando ILEGAL (aviso vermelho);
  // as perguntas (descanso/escala/validades) vão por baixo do card Serviços.
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const todayItems = useMemo(
    () => buildTodayItems({ ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, aeExtras, validities, isPilot, todayISO }, lang),
    [ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, aeExtras, validities, isPilot, todayISO, lang],
  );
  // Perguntas (por baixo do card Serviços) — "Estou legal?" entra aqui (já ordenado por
  // severidade: ILEGAL sobe ao topo). Mostra-se quando há veredicto (esconde "sem dados").
  const questionItems = todayItems.filter((it) =>
    (it.id === 'legal' && it.status !== 'neutral')
    || (it.id === 'rest' && it.status !== 'neutral')
    || it.id === 'roster'
    || it.id === 'validades');
  // A+chips: o CRÍTICO (bad) vira ALERTA (com conselho à vista); o resto vira CHIPS (relance + tap).
  const qAlerts = questionItems.filter((it) => it.status === 'bad');
  const qChips = questionItems.filter((it) => it.status !== 'bad');
  const stColor = (st) => st === 'bad' ? C.red : st === 'warn' ? (C.warn || C.text) : st === 'ok' ? (C.greenText || C.green) : C.sub;

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
  // Disciplina do vermelho (Flight Deck): badge NEUTRO (ink) + sombra suave por defeito; PERTO
  // do limite (warn, ≥85%) acende com anel vermelho a pulsar; ACIMA (over, ≥100%) enche-se de
  // vermelho + glow. Texto branco legível sobre ink (warn) e sobre vermelho grande (over).
  const badgeColor = stateLevel === 'over' ? C.red : C.ink;

  // ── Próximo voo (calendário) — carrega automaticamente ao abrir ──
  const [calFlight, setCalFlight] = useState(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null);
  const [calOk, setCalOk] = useState(true); // acesso ao calendário do telemóvel
  const [calErr, setCalErr] = useState(false); // a LEITURA rebentou (≠ "sem voos") — erro visível, não vazio falso
  const [syncing, setSyncing] = useState(true);
  const [syncDone, setSyncDone] = useState(false);
  const syncingRef = useRef(false);
  const syncFlight = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      // Só lê o calendário se houver um LIGADO (sem prompt; sem leitura "às cegas").
      const res = calendarId ? await getUpcomingFlight(company, calendarId) : { ok: false, flight: null };
      setCalOk(res.ok); setCalErr(false);
      setCalFlight(res.flight || (SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null)); // sem voo real → mostra o exemplo
    } catch { setCalErr(true); setCalFlight(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null); }   // falha ≠ vazio: mostra o erro
    setSyncDone(true); setSyncing(false);
    syncingRef.current = false;
  };
  // "Dar acesso" FAZ o que diz: dispara o fluxo de ligação na Escala (prompt + escolher o
  // calendário) — antes só mudava de aba e o utilizador tinha de reencontrar o botão certo.
  const requestAccess = () => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { connect: Date.now() } }); };
  // Efeitos com deps [] guardariam o PRIMEIRO closure de syncFlight (calendarId/company de
  // arranque — ligar o calendário depois não surtia efeito no foco) → ref sempre atual.
  const syncRef = useRef(syncFlight);
  syncRef.current = syncFlight;
  // Re-lê o calendário do telemóvel sempre que o Início ganha foco (não só ao montar),
  // para o cartão refletir alterações da escala sem reabrir a app.
  useFocusEffect(useCallback(() => { syncRef.current(); }, []));

  // E também quando a app volta de segundo plano (ex.: a eCrew atualizou o calendário
  // enquanto estava minimizada) → o voo novo aparece sem reabrir a app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') syncRef.current(); });
    return () => sub.remove();
  }, []);

  // Próximo voo EFETIVO = funde o duty manual (store `duties`) com o voo do
  // calendário do telemóvel e mostra o mais próximo (empate de dia → manual ganha,
  // como a roda da Escala). Resolve "inseri um duty e não aparece na Home".
  const flight = useMemo(() => mergeNextFlight(calFlight, duties, Date.now()), [calFlight, duties]);

  // Countdown VIVO: re-renderiza a cada 30s enquanto o ecrã está focado, para o
  // "em X min" não congelar. Limpa o intervalo ao sair de foco (não é enfeite — é
  // dado vivo; o `now` abaixo recalcula a cada tick).
  const [, setNowTick] = useState(0);
  useFocusEffect(useCallback(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []));
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh: relê o calendário a pedido

  // ── Estado do voo AO VIVO (proxy AirLabs via Edge Function `flight-status`) ──
  // Só para o voo do card Serviços, e só DENTRO DA JANELA (~4 h antes da partida até ~1 h
  // depois da chegada) → poupa pedidos. Vira um aviso no topo SÓ quando há desvio.
  const flightNo = flight && flight.flightNo;
  const depTs = (flight && flight.startDate) ? +new Date(flight.startDate) : null;
  const endTs = (flight && flight.endDate) ? +new Date(flight.endDate) : (depTs ? depTs + 3 * 3600e3 : null);
  const inFlightWindow = !!depTs && Date.now() >= depTs - 4 * 3600e3 && Date.now() <= (endTs || depTs) + 3600e3;
  const [flightStatus, setFlightStatus] = useState(null);
  const [detailItem, setDetailItem] = useState(null);   // pergunta aberta na folha "porquê"
  const [fsTick, setFsTick] = useState(0);   // re-fetch a pedido (pull-to-refresh)
  useEffect(() => {
    let cancelled = false;
    if (!flightNo || !inFlightWindow) { setFlightStatus(null); return; }
    fetchFlightStatus(flightNo).then((st) => { if (!cancelled) setFlightStatus(st); });
    return () => { cancelled = true; };
  }, [flightNo, inFlightWindow, fsTick]);

  // ── Próximo duty — voo da escala (calendário) + contexto FTL do motor (read-only) ──
  const now = Date.now();
  // Contagem para a apresentação REAL (calendário/registo) quando existe. SEM report real,
  // conta para a PARTIDA e di-lo — antes inventava "partida − 1 h": se o report verdadeiro
  // fosse 1h15 antes, quem confiasse no card chegava 15 min ATRASADO à apresentação.
  // Prefere o INSTANTE absoluto (calendário e manual trazem reportDate) — reconstruir de
  // "dateISO + HH:MM" erra quando o report cai depois da meia-noite ou vem de outro fuso.
  const reportMs = !flight ? null
    : flight.reportDate ? (() => { const ts = +new Date(flight.reportDate); return isNaN(ts) ? null : ts; })()
    : (flight.report && /^\d{1,2}:\d{2}$/.test(flight.report)) ? (() => {
      const [rh, rm] = flight.report.split(':').map(Number);
      const dt = new Date(`${flight.dateISO}T00:00:00`); dt.setHours(rh, rm, 0, 0);
      return isNaN(dt.getTime()) ? null : dt.getTime();
    })() : null;
  const cdTarget = reportMs != null ? reportMs : (flight ? flight.startDate.getTime() : null);
  const cdMin = cdTarget != null ? Math.round((cdTarget - now) / 60000) : null;
  const cdBase = cdMin == null ? null
    : cdMin <= 0 ? t('home.dutyNow', lang)
    : cdMin >= 2880 ? `${t('home.in', lang)} ${Math.round(cdMin / 1440)} ${t('home.days', lang)}` // ≥ 48 h → dias
    : `${t('home.in', lang)} ${Math.floor(cdMin / 60) > 0 ? `${Math.floor(cdMin / 60)} h ` : ''}${cdMin % 60} min`;
  // Diz PARA QUÊ conta (report vs partida) — nunca um número sem alvo.
  const countdownStr = cdBase == null ? null
    : cdMin <= 0 ? cdBase
    : reportMs != null ? `${l('report', 'report')} ${cdBase}` : `${l('partida', 'departure')} ${cdBase}`;
  const fatColor = (b) => b === 'high' ? C.red : b === 'elevated' ? C.warn : b === 'low' ? C.green : C.onDarkSub; // fill (dot)
  const fatTextColor = (b) => b === 'high' ? C.redText : b === 'elevated' ? C.warnText : b === 'low' ? C.greenText : C.sub; // texto acessível sobre fatBg (*Soft)
  const fatLabel = (b) => t('duties.fatigue' + b.charAt(0).toUpperCase() + b.slice(1), lang);
  // PSV máx + fadiga: se houver duty registada nesse dia, usa-a (exata); senão estima pelo voo (1 setor).
  // PSV é por DUTY (apresentação → último on-block, com TODOS os setores) — NÃO por setor.
  // `actual` = PSV realizado/planeado; `over` = excede o máx (para a margem no card).
  let ndPsvMax = null, ndPsvActual = null, ndPsvOver = false, ndFat = null, ndSectors = null, ndDuty = null;
  if (flight) {
    const reg = duties[flight.dateISO];
    if (flight.demo) {
      // Voo de exemplo: gera PSV máx + fadiga a partir dos próprios dados (sem registo).
      const d = computeDuty({ state: 'acc', report: flight.report, end: flight.arrTime, sectors: flight.sectors, isPilot });
      ndPsvMax = d.fdp.maxFdpStr; ndPsvActual = d.fdp.actualFdpStr; ndPsvOver = !!d.fdp.over; ndSectors = flight.sectors; ndFat = fatigueFromDuty(d); ndDuty = d;
    } else if (reg && !reg.deleted && reg.report_time && reg.block_on) {
      // Serviço REGISTADO: crew-aware (isPilot) + casos especiais gravados (205 c/f/g, standby).
      const sp = reg.special || {};
      const d = computeDuty({ state: 'acc', report: reg.report_time, end: reg.block_on, sectors: reg.sectors || 0, isPilot, augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null });
      ndPsvMax = d.fdp.maxFdpStr; ndPsvActual = d.fdp.actualFdpStr; ndPsvOver = !!d.fdp.over; ndSectors = reg.sectors || null; ndFat = fatigueFromDuty(d); ndDuty = d;
    } else if (flight.report) {
      // Só estima PSV máx se o calendário trouxe apresentação REAL — não inventa dep − 1 h.
      // (Estimativa a 1 setor: NÃO alimenta o veredicto legal ao vivo — nº de setores incerto.)
      const d = computeDuty({ state: 'acc', report: flight.report, end: flight.arrTime, sectors: 1, isPilot });
      ndPsvMax = d.fdp.maxFdpStr;
    }
  }
  // Voo ao vivo (#2): recalcula o PSV com o ATRASO REAL à chegada e dá o veredicto legal (105/205).
  // Só com atraso à chegada (>0 → estica o PSV) E um serviço de nº de setores fiável (reg/demo).
  // projected = chegada ainda ESTIMADA (sem ATA) → é PROJEÇÃO, não facto consumado.
  const ndArrDelay = flightStatus ? arrDelayMin(flightStatus) : 0;
  const liveVerdict = (ndArrDelay > 0 && ndDuty)
    ? liveFdpVerdict(ndDuty, ndArrDelay, { projected: !(flightStatus.arr && flightStatus.arr.actual) })
    : null;
  // O REGISTO guardado está atrasado face à chegada REAL? (aviso de sincronizar a escala eCrew).
  // on-block GUARDADO em Zulu: setor gravado (onZ autoritativa) → fuso do aeroporto → dispositivo.
  const ndReg = flight ? duties[flight.dateISO] : null;
  const ndOnLeg = (ndReg && Array.isArray(ndReg.legs) && ndReg.legs.length)
    ? ndReg.legs[ndReg.legs.length - 1]
    : (flight && flight.arrTime ? { on: flight.arrTime, arr: (flightStatus && flightStatus.arr && flightStatus.arr.iata) || null } : null);
  const ndStoredOnZ = (flight && ndOnLeg && ndOnLeg.on) ? legZulu(flight.dateISO, ndOnLeg, 'on') : null;
  const syncBehind = !!(flightStatus && ndStoredOnZ && recordBehindLive(flightStatus, ndStoredOnZ));
  // Só o Início vê o feed ao vivo → é aqui que se MARCA o sinal persistente (pontinho + notif).
  // markLiveSync é idempotente (mesmo real → no-op); a limpeza vive no App (quando o registo apanha).
  useEffect(() => {
    if (syncBehind && flight) markLiveSync(flight.dateISO, { flightNo, realArrZ: settledArrZ(flightStatus), schedArrZ: schedArrZ(flightStatus) });
  }, [syncBehind, flightStatus, flight && flight.dateISO, flightNo]); // eslint-disable-line react-hooks/exhaustive-deps
  // Dia do voo para o badge circular (número + dia da semana).
  const ndDayNum = flight ? new Date(flight.dateISO + 'T00:00:00').getDate() : null;
  const ndReportZ = flight ? (airportZulu(flight.dateISO, flight.report, flight.depAirport) || toZulu(flight.dateISO, flight.report)) : null;
  const ndDayWd = flight ? (() => {
    const w = new Date(flight.dateISO + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
    return w.charAt(0).toUpperCase() + w.slice(1);
  })() : null;

  // Formata € compacto (sem decimais) — cartão AE e meta do próximo voo.
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const [int, dec] = Number(n).toFixed(2).split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${grouped}.${dec}` : `${grouped},${dec} €`;
  };
  // Per-diem do DIA (todos os setores da rota) — é o que vai no card (não o de 1 setor).
  let dayPerDiem = null;
  if (flight && ae && crewCategory && flight.route) {
    const dists = routeDistancesNM(flight.route);
    if (dists.length && !dists.some((x) => x == null)) dayPerDiem = ae.perDiem(crewCategory, dists, 1, crewFleet);
  }
  // Setor ATIVO (só voo): o que está a decorrer / o próximo (now vs on-block de cada leg).
  // Quando o setor aterra (now > on), avança para o seguinte; todos aterrados → fica no último.
  const sectorLegs = (flight && flight.kind === 'flight' && Array.isArray(flight.legs))
    ? flight.legs.filter((lg) => lg && (lg.dep || lg.arr)) : [];
  const activeSector = (() => {
    if (!sectorLegs.length) return null;
    let idx = sectorLegs.findIndex((lg) => { const on = legInstant(flight.dateISO, lg.on, flight.report); return !on || Date.now() <= on.getTime(); });
    if (idx < 0) idx = sectorLegs.length - 1;
    return { idx, total: sectorLegs.length, leg: sectorLegs[idx] };
  })();
  const secBlock = activeSector ? legBlockStr(activeSector.leg) : null;
  // Partida → chegada do card destaque (setor ativo, ou as horas do duty quando não há setores),
  // com Zulu pelo helper único (autoritativa → fuso do aeroporto → dispositivo). `flight` pode ser null.
  const ndDep = !flight ? null : (activeSector ? activeSector.leg.off : flight.depTime);
  const ndArr = !flight ? null : (activeSector ? activeSector.leg.on : flight.arrTime);
  const ndDepZ = !flight ? null : (activeSector ? legZulu(flight.dateISO, activeSector.leg, 'off')
    : (airportZulu(flight.dateISO, flight.depTime, flight.depAirport) || toZulu(flight.dateISO, flight.depTime)));
  const ndArrZ = !flight ? null : (activeSector ? legZulu(flight.dateISO, activeSector.leg, 'on')
    : (airportZulu(flight.dateISO, flight.arrTime, flight.arrAirport) || toZulu(flight.dateISO, flight.arrTime)));
  // Zulu ESTIMADA (não autoritativa) → mostra a nota da suposição (manual). Setor do calendário
  // tem offZ/onZ → não estimada.
  const ndZuluEst = !!(activeSector && activeSector.leg && !activeSector.leg.offZ && !activeSector.leg.onZ);
  const fatBg = (b) => b === 'high' ? C.redSoft : b === 'elevated' ? C.warnSoft : b === 'low' ? C.greenSoft : C.soft;

  // Skeleton só no 1º carregamento real (a sincronizar, ainda sem resultado e com
  // acesso ao calendário) — não no estado "sem voo" nem no pedido de permissão.
  const loadingFlight = !flight && syncing && !syncDone && calOk;
  const isNonFlight = !!(flight && flight.kind && flight.kind !== 'flight');
  // Mostra a sub-linha de horas: no setor ativo sempre; sem setores só se partida≠chegada (evita "05:40 → 05:40").
  const ndShowTimes = !isNonFlight && (activeSector ? !!(ndDep || ndArr) : !!(ndDep && ndArr && ndDep !== ndArr));
  // Dia relativo p/ a sub-linha "quando" (Hoje/Amanhã; senão usa só a contagem).
  const ndWhen = flight ? (() => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(flight.dateISO + 'T00:00:00').getTime() - t0.getTime()) / 86400000);
    return diff === 0 ? l('Hoje', 'Today') : diff === 1 ? l('Amanhã', 'Tomorrow') : null;
  })() : null;
  // PSV máx do DIA com MARGEM (realizado / máx); vermelho se exceder. (PSV é por duty, não por setor.)
  const psvCell = ndPsvMax ? { l: l('PSV máx', 'FDP max'), v: ndPsvActual ? `${ndPsvActual} / ${ndPsvMax}` : ndPsvMax, sub: l('dia', 'day'), red: ndPsvOver } : null;
  // Grelha 3-col. Voo c/ setores → SETOR ATIVO (horas do setor + block do setor + per-diem do DIA
  // + PSV do dia c/ margem). Voo sem setores → fallback (report/Zulu). Não-voo → início/fim.
  const ndCells = flight ? (isNonFlight ? [
    { l: l('Início', 'Start'), v: flight.report || '—' },
    (flight.arrTime && flight.arrTime !== flight.report) ? { l: l('Fim', 'End'), v: flight.arrTime } : null,
    ndPsvMax ? { l: l('PSV s/ chamado', 'FDP if called'), v: ndPsvMax } : null,
  ] : activeSector ? [
    // Início/Fim vivem na sub-linha (partida → chegada + Zulu); a grelha só acrescenta Block/Per-diem/PSV.
    secBlock ? { l: 'Block', v: secBlock, sub: l('setor', 'sector') } : null,
    dayPerDiem != null ? { l: 'Per-diem', v: `+${fmtEur0(dayPerDiem)}`, sub: l('dia', 'day'), green: true } : null,
    psvCell,
  ] : [
    { l: l('Report', 'Report'), v: flight.report || '—', sub: l('local', 'local') },
    ndReportZ ? { l: 'Zulu', v: ndReportZ, sub: 'Z' } : null,
    psvCell,
    ndSectors ? { l: l('Setores', 'Sectors'), v: String(ndSectors) } : null,
    dayPerDiem != null ? { l: 'Per-diem', v: `+${fmtEur0(dayPerDiem)}`, green: true } : null,
  ]).filter(Boolean) : [];

  // Tocar no serviço em destaque → detalhe desse dia (a tarefa mais frequente, antes custava
  // 4-5 toques noutra aba). Sem registo desse dia (ex. demo) não é tocável.
  const featuredReg = flight && !flight.demo ? duties[flight.dateISO] : null;
  const featuredTappable = !!(featuredReg && !featuredReg.deleted && featuredReg.report_time);
  // `initial: false` mete a EscalaMain POR BAIXO do detalhe: o "‹ Voltar" volta à Escala
  // (sem isto o detalhe vira raiz da stack e o back salta de aba).
  const openDayDetail = (iso) => { select(); navigation.navigate('Escala', { screen: 'DutyDetail', initial: false, params: { date: iso } }); };
  const openFeatured = () => { if (featuredTappable) openDayDetail(flight.dateISO); };

  const nextDutyEl = flight ? (
    <View>
      <Eyebrow style={{ marginBottom: 12 }}>{l('Serviços', 'Duties')}</Eyebrow>
      <View style={s.svc}>
        <TouchableOpacity activeOpacity={0.75} disabled={!featuredTappable} onPress={openFeatured}
          accessibilityRole={featuredTappable ? 'button' : undefined}
          accessibilityHint={featuredTappable ? l('Abre o detalhe do serviço', 'Opens the duty detail') : undefined}
          style={s.svcNd}>
          <View style={s.svcBadgeWrap}>
            {(stateLevel === 'over' || stateLevel === 'warn') ? (
              <PulseRing size={68} radius={RADIUS.lg} color={C.red} border={stateLevel === 'warn'} duration={2600} />
            ) : null}
            <View style={[s.svcBadge, { backgroundColor: badgeColor, shadowColor: badgeColor, shadowOpacity: stateLevel === 'over' ? 0.42 : 0.18 }]}>
              <Text style={s.svcBadgeDay}>{ndDayNum}</Text>
              <Text style={s.svcBadgeWd}>{ndDayWd}</Text>
            </View>
          </View>
          <View style={s.svcNdx}>
            <Eyebrow style={{ flex: 1 }} numberOfLines={1}>{isNonFlight ? t('duties.kind.' + flight.kind, lang) : `${l('Voo', 'Flight')}${activeSector ? ` · ${l('Setor', 'Sector')} ${activeSector.idx + 1}/${activeSector.total}` : ''}`}</Eyebrow>
            {/* Texto grande — VOO: o SETOR ATIVO (dep → arr), não a rota inteira. Encolhe, nunca quebra. */}
            {/* minimumFontScale 0.75 (era 0.5): a info primária do relance nunca encolhe p/ metade. */}
            <Text style={s.svcMain} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{isNonFlight
              ? (flight.arrTime && flight.arrTime !== flight.report ? `${flight.report} – ${flight.arrTime}` : flight.report)
              : (activeSector ? `${activeSector.leg.dep || '?'} → ${activeSector.leg.arr || '?'}`
                : (flight.stations && flight.stations.length > 1 ? flight.stations.join(' → ') : `${flight.depAirport} → ${flight.arrAirport}`))}</Text>
            {/* Partida → chegada (horas) + Zulu — só voo, à frente da rota. */}
            {ndShowTimes ? (
              <Text style={s.svcTimes} numberOfLines={1}>{ndDep || '—'} → {ndArr || '—'}
                {(ndDepZ || ndArrZ) ? <Text style={s.svcTimesZ}>  {ndDepZ || '—'}–{ndArrZ || '—'}Z</Text> : null}</Text>
            ) : null}
            {/* Sub-linha "quando": dia relativo (sub) + contagem */}
            {countdownStr ? (
              <Text style={s.svcCd} numberOfLines={1}>{ndWhen ? <Text style={s.svcCdDay}>{ndWhen} · </Text> : null}{countdownStr}</Text>
            ) : null}
            {/* Confirmação POSITIVA ao vivo — SÓ quando a API confirma SEM desvio (senão não afirmamos
                "a horas" sem saber; o desvio tem o seu próprio card em cima). Subtil, no contexto do serviço. */}
            {flightStatus && !hasDeviation(flightStatus) ? (
              <Text style={s.svcOntime} numberOfLines={1}>✓ {l('A horas', 'On time')}{flightStatus.dep && flightStatus.dep.gate ? ` · ${l('porta', 'gate')} ${flightStatus.dep.gate}` : ''}</Text>
            ) : null}
            {flight.nightStop ? <Text style={s.svcNight}>🌙 {l('Paragem nocturna', 'Night stop')}</Text> : null}
          </View>
        </TouchableOpacity>
        <View style={s.svcDiv} />
        {/* Grelha 3 colunas com a info do serviço */}
        <View style={s.svcGrid}>
          {ndCells.map((c, i) => (
            <View key={i} style={s.svcCell}>
              <Text style={s.svcCellL} numberOfLines={1}>{c.l}</Text>
              <Text style={[s.svcCellV, c.red ? { color: C.redText } : c.green ? { color: C.greenText } : null]} numberOfLines={1}>{c.v}{c.sub ? <Text style={s.svcCellSub}> {c.sub}</Text> : null}</Text>
              {c.zsub ? <Text style={s.svcCellZ} numberOfLines={1}>{c.zsub}Z</Text> : null}
            </View>
          ))}
          {ndFat ? (
            <View style={s.svcCell}>
              <Text style={s.svcCellL} numberOfLines={1}>{l('Fadiga', 'Fatigue')}</Text>
              <View style={[s.svcFat, { backgroundColor: fatBg(ndFat.band) }]}>
                <View style={[s.svcFatDot, { backgroundColor: fatColor(ndFat.band) }]} />
                <Text style={[s.svcFatTxt, { color: fatTextColor(ndFat.band) }]}>{fatLabel(ndFat.band)}</Text>
              </View>
            </View>
          ) : null}
        </View>
        {/* Nota honesta: a Zulu manual assume hora LOCAL do aeroporto (não há instante absoluto). */}
        {ndZuluEst ? <Text style={s.svcZuluNote}>{l('Zulu estimada da hora local do aeroporto.', 'Zulu estimated from airport local time.')}</Text> : null}
        {/* Próximas atividades — FUNDIDAS no card Serviços, por baixo do próximo serviço */}
        <UpcomingDutiesCard duties={duties} lang={lang} bare limit={4} featuredISO={flight.dateISO} activeIdx={activeSector ? activeSector.idx : null} onPressItem={openDayDetail} />
      </View>
    </View>
  ) : loadingFlight ? (
    <NextFlightSkeleton s={s} />
  ) : (
    <View style={s.flightCard}>
      <View style={s.flightTop}>
        <Text style={s.flightEyebrow}>{t('home.nextDuty', lang)}</Text>
        {/* O "refresh" É um botão (antes parecia tocável e não fazia nada). */}
        <TouchableOpacity onPress={() => { select(); syncFlight(); }} disabled={syncing} style={[s.flightBadge, { backgroundColor: C.soft }]}
          accessibilityRole="button" accessibilityLabel={l('Atualizar do calendário', 'Refresh from calendar')} hitSlop={6}>
          {syncing ? <ActivityIndicator size="small" color={C.sub} /> : <Ionicons name="refresh" size={14} color={C.sub} />}
        </TouchableOpacity>
      </View>
      {calErr ? (
        /* Falha de LEITURA ≠ "sem voos": diz o que aconteceu e o que fazer (Nielsen #9). */
        <View style={s.flightEmpty}>
          <Ionicons name="alert-circle-outline" size={18} color={C.warnText} />
          <Text style={[s.flightEmptyTxt, { color: C.warnText }]}>{l('Não consegui ler o calendário — puxa para atualizar ou verifica a permissão nas Definições.', 'Couldn’t read the calendar — pull to refresh or check the permission in Settings.')}</Text>
        </View>
      ) : !calOk ? (
        <View style={s.flightEmpty}>
          <Ionicons name="calendar-outline" size={18} color={C.sub} />
          <View style={{ flex: 1 }}>
            <Text style={s.flightEmptyTxt}>{t('cal.permission', lang)}</Text>
            <TouchableOpacity onPress={requestAccess} activeOpacity={0.85} style={s.grantBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
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

  // (Removidos do Início: cartões AE-compacto, Estatísticas-mini e FTL·limites — o
  //  salário vive nos Cálculos/FTL, as Estatísticas têm aba própria, e os limites
  //  cumulativos passaram para a aba Estatísticas. Ver StatsScreen.)

  // ── Cabeçalho premium + tira de 5 dias ──
  const firstName = ((user?.name || user?.email?.split('@')[0] || '').split(' ')[0]) || '';
  const crewWord = isPilot ? (lang === 'en' ? 'Pilot' : 'Piloto') : (lang === 'en' ? 'Cabin' : 'Cabine');
  const opEyebrow = [company?.name, ae ? 'AE' : 'FTL', crewWord].filter(Boolean).join(' · ').toUpperCase();

  // Entrada escalonada das secções (hook partilhado, re-toca no foco) — mockup .rise.
  const seg = useEnter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} alwaysBounceVertical
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.sub} colors={[C.sub]}
          onRefresh={async () => {
            setRefreshing(true); const t0 = Date.now();
            try { await syncFlight(); } catch { /* ignora */ }
            setFsTick((n) => n + 1);   // re-busca o estado do voo ao vivo
            const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
            setRefreshing(false);
          }} />}>

        {/* Cabeçalho claro (PageHeader) — eyebrow do operador + sino + saudação */}
        <PageHeader
          eyebrow={opEyebrow}
          title={`${t('home.hello', lang)}${firstName ? `, ${firstName}` : ''}`}
          right={<HeaderActions />}
        />

        {/* Aviso de VOO ao vivo — SÓ quando há desvio (atraso/cancelado/desviado). Estado do
            voo do card Serviços via Edge Function (AirLabs). Estipulado vs real + porta. */}
        {flightStatus && hasDeviation(flightStatus) ? (() => {
          const st = String(flightStatus.status || '').toLowerCase();
          const cancelled = st === 'cancelled' || st === 'canceled';
          const diverted = st === 'diverted';
          const bad = cancelled || diverted;
          const w = worstDelay(flightStatus);            // { min, which:'dep'|'arr' } — o PIOR conta
          const isArr = w.which === 'arr';
          const tone = bad ? C.red : C.warn, soft = bad ? C.redSoft : C.warnSoft, txt = bad ? C.redText : C.warnText;
          const hm = (x) => (x ? String(x).slice(11, 16) : '—');
          const dep = flightStatus.dep || {}, arr = flightStatus.arr || {};
          const leg = isArr ? arr : dep;                 // o lado relevante (partida vs chegada)
          const head = cancelled ? l('Voo cancelado', 'Flight cancelled')
            : diverted ? l('Voo desviado', 'Flight diverted')
            : isArr ? l(`Chega +${w.min} min`, `Arrives +${w.min} min`)
            : l(`Atrasado +${w.min} min`, `Delayed +${w.min} min`);
          // Veredicto legal do PSV com o atraso REAL (105/205) — supera a nota genérica.
          const vColor = liveVerdict ? (liveVerdict.verdict === 'over' ? C.redText : liveVerdict.verdict === 'discretion' ? C.warnText : C.greenText) : null;
          const vText = liveVerdict ? (() => {
            const pre = liveVerdict.projected ? l('Projeção', 'Projected') : l('Com o atraso', 'With the delay');
            const psv = l(`PSV ${liveVerdict.realStr} (máx ${liveVerdict.maxStr})`, `FDP ${liveVerdict.realStr} (max ${liveVerdict.maxStr})`);
            if (liveVerdict.verdict === 'legal') return `${pre}: ${psv} — ${l('dentro do limite', 'within the limit')}.`;
            if (liveVerdict.verdict === 'discretion') return `${pre}: ${psv} — ${l(`+${liveVerdict.overMaxStr} na discrição do comandante (205 f)`, `+${liveVerdict.overMaxStr} into commander's discretion (205 f)`)}.`;
            return `${pre}: ${psv} — ${l(`ACIMA da lei: +${liveVerdict.overDiscStr} além da discrição (205 f)`, `OVER the legal limit: +${liveVerdict.overDiscStr} beyond discretion (205 f)`)}.`;
          })() : null;
          return (
            <Animated.View style={[s.fdelay, { backgroundColor: soft, borderColor: tone + '55' }, seg(1)]}>
              <Ionicons name={cancelled ? 'close-circle' : diverted ? 'git-branch-outline' : 'time'} size={18} color={tone} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fdelayQ} numberOfLines={1}>{flightStatus.flightIata || flightNo}{dep.iata ? ` · ${dep.iata}→${arr.iata || '—'}` : ''}</Text>
                <Text style={[s.fdelayH, { color: txt }]} numberOfLines={1}>{head}</Text>
                {!bad ? <Text style={s.fdelayS} numberOfLines={2}>{isArr ? l('Chega', 'Arrives') : l('Sai', 'Departs')} {hm(leg.estimated || leg.actual)} · {l('estava', 'was')} {hm(leg.scheduled)}{!isArr && dep.gate ? ` · ${l('porta', 'gate')} ${dep.gate}` : ''}</Text> : null}
                {!bad && vText ? (
                  <Text style={[s.fdelayNote, { color: vColor, fontFamily: FONT.bold }]} numberOfLines={2}>{vText}</Text>
                ) : (!bad && w.min >= 30 ? (
                  <Text style={s.fdelayNote} numberOfLines={2}>{l('Atraso significativo — confirma o impacto no PSV/descanso.', 'Significant delay — check the impact on your FDP/rest.')}</Text>
                ) : null)}
                {!bad && syncBehind ? (
                  <Text style={[s.fdelayNote, { color: C.text, fontFamily: FONT.bold }]} numberOfLines={2}>↻ {l('O teu registo ainda tem o planeado — sincroniza a escala eCrew pelo calendário para o PSV/limites acertarem.', 'Your record still shows the plan — sync your eCrew roster via the calendar so your FDP/limits are correct.')}</Text>
                ) : null}
              </View>
            </Animated.View>
          );
        })() : null}

        {/* FTL automático assume aclimatizado/na-base — só vale p/ curto-curso (Hi Fly). */}
        {isLongHaulCompany(company) ? (
          <Banner tone="warn" icon="information-circle" style={{ marginBottom: SPACE.md }}
            title={l('Cálculo FTL automático', 'Automatic FTL calculation')}
            sub={l('Assume aclimatizado e na base. Em longo-curso, fusos ≥ 4 h ou fora-base, confirma na calculadora.', 'Assumes acclimatised and in-base. For long-haul, ≥4 h time zones or away-base, check the calculator.')}
            onPress={() => { select(); navigation.navigate('FTL'); }} />
        ) : null}

        {/* Card SERVIÇOS (principal) — próximo serviço + próximas atividades FUNDIDOS */}
        <Animated.View style={seg(2)}>{nextDutyEl}</Animated.View>
        {/* Sem próximo voo (estado vazio): mostra as próximas atividades à parte, p/ não se perderem */}
        {!flight ? <Animated.View style={seg(3)}><UpcomingDutiesCard duties={duties} lang={lang} onPressItem={openDayDetail} /></Animated.View> : null}

        {/* PERGUNTAS — A+chips. CRÍTICO (ILEGAL/expirado) → alerta vermelho com o conselho à vista
            (segurança FTL grita). O resto → chips coloridos (relance); "escala" toca → Escala. */}
        {(qAlerts.length || qChips.length) ? (
          <Animated.View style={[s.qWrap, seg(4)]}>
            {qAlerts.map((it) => (
              <TouchableOpacity key={it.id} style={s.qAlert} activeOpacity={0.85} onPress={() => { select(); setDetailItem(it); }}>
                <View style={s.qAlertIc}><Ionicons name="alert" size={18} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.qAlertQ}>{it.q}</Text>
                  <Text style={s.qAlertA} numberOfLines={2}>{it.answer}</Text>
                  {it.suggestion ? <Text style={s.qAlertS} numberOfLines={2}>{it.suggestion}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.redText} style={{ alignSelf: 'center' }} />
              </TouchableOpacity>
            ))}
            {qChips.length ? (
              <>
                <Text style={s.qSec}>{l('Perguntas', 'Questions')}</Text>
                <View style={s.qList}>
                  {qChips.map((it, i) => (
                    <TouchableOpacity key={it.id} activeOpacity={0.85} onPress={() => { select(); setDetailItem(it); }} style={[s.qRow, i > 0 && s.qRowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qRowQ} numberOfLines={1}>{it.q}</Text>
                        {it.suggestion ? <Text style={s.qRowS} numberOfLines={2}>{it.suggestion}</Text> : null}
                      </View>
                      <View style={[s.qPill, it.status === 'warn' ? s.qPillWarn : it.status === 'info' ? s.qPillInfo : it.status === 'ok' ? s.qPillOk : null]}>
                        <Text style={[s.qPillT, it.status === 'warn' ? { color: C.warnText } : it.status === 'info' ? { color: C.brand } : it.status === 'ok' ? { color: C.greenText } : null]} numberOfLines={1}>{it.short}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.sub} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Folha "porquê" — abre ao tocar numa pergunta (alerta ou linha). */}
      <QuestionDetailSheet item={detailItem} lang={lang}
        onClose={() => setDetailItem(null)}
        onNav={(dest) => {
          setDetailItem(null);
          // Destino: { root, screen? } — aba, opcionalmente com ecrã aninhado (ex. Perfil → Validades).
          if (dest && dest.root) navigation.navigate(dest.root, dest.screen ? { screen: dest.screen } : undefined);
        }} />
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
  ndCirc: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    shadowColor: C.ink, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ndCircDay: { fontSize: 32, fontFamily: FONT.display, color: '#fff', lineHeight: 34, letterSpacing: -0.5, textAlign: 'center' },
  ndCircLbl: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.85, textTransform: 'uppercase', color: 'rgba(255,255,255,0.88)', marginTop: 1, textAlign: 'center', includeFontPadding: false },
  ndX: { flex: 1, minWidth: 0, paddingTop: 2 },
  ndXTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ndXEyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.6, textTransform: 'uppercase', color: C.sub },
  ndCountdown: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.red },
  ndRoute: { fontSize: 26, fontFamily: FONT.display, color: C.text, letterSpacing: -0.4, marginTop: 5, marginBottom: 4 },
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

  // Serviço — cartão herói do próximo serviço (badge + linha principal largura-toda + grelha)  // Card COM fundo (preenchimento soft2) + borda + sombra subtil — o "fundo" que o user quer
  svc: { backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 18, marginBottom: SPACE.md,
    shadowColor: '#14161A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  svcNd: { flexDirection: 'row', alignItems: 'center', gap: 16 },   // dia (círculo) à esquerda · coluna direita, centrados
  svcNdx: { flex: 1, minWidth: 0 },
  svcTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },  // tipo (esq) + tempo que falta (dir)
  svcBadgeWrap: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  svcBadge: { width: 68, height: 68, borderRadius: RADIUS.lg, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', flexShrink: 0,   // quadrado-arredondado (= cartões) p/ combinar com a app
    shadowColor: C.ink, shadowOpacity: 0.20, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 7 },
  // número justo e centrado (includeFontPadding:false + lineHeight≈fontSize ⇒ não fica torto)
  svcBadgeDay: { fontSize: 36, fontFamily: FONT.display, color: '#fff', lineHeight: 36, letterSpacing: -0.5, textAlign: 'center', includeFontPadding: false },
  svcBadgeWd: { fontSize: 10, fontFamily: FONT.heavy, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.82)', marginTop: 2, includeFontPadding: false },  svcCd: { fontSize: 12.5, fontFamily: FONT.bold, color: C.text, marginTop: 6 },   // sub-linha "quando"
  svcCdDay: { color: C.sub, fontFamily: FONT.bold },
  // Rota grande — numberOfLines=1 + adjustsFontSizeToFit ⇒ encolhe p/ caber ao lado do badge, nunca quebra
  svcMain: { fontSize: 26, fontFamily: FONT.display, color: C.text, letterSpacing: -0.4, marginTop: 9, lineHeight: 30 },
  svcTimes: { fontSize: 13, fontFamily: FONT.bold, color: C.text, marginTop: 5, fontVariant: ['tabular-nums'] },
  svcTimesZ: { fontFamily: FONT.bold, color: C.brand },
  svcNight: { fontSize: 11, fontFamily: FONT.semibold, color: C.text, marginTop: 5 },
  svcOntime: { fontSize: 11.5, fontFamily: FONT.bold, color: C.greenText, marginTop: 6 },   // confirmação "a horas" ao vivo (subtil)
  // risca full-bleed + grelha 3 colunas (Report·Zulu·PSV / Setores·Per-diem·Fadiga)
  svcDiv: { height: 1, backgroundColor: C.line, marginTop: 16, marginHorizontal: -18 },
  svcGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15, marginTop: 16 },
  svcCell: { width: '33.33%', paddingRight: 8 },
  svcCellL: { fontSize: 9.5, fontFamily: FONT.heavy, letterSpacing: 0.5, textTransform: 'uppercase', color: C.sub, marginBottom: 4 },
  svcCellV: { fontSize: 16, fontFamily: FONT.display, color: C.text, fontVariant: ['tabular-nums'] },
  svcCellSub: { fontSize: 11, fontFamily: FONT.semibold, color: C.sub },
  svcCellZ: { fontSize: 11, fontFamily: FONT.bold, color: C.brand, fontVariant: ['tabular-nums'], marginTop: 2, letterSpacing: 0.2 },
  svcZuluNote: { fontSize: 10.5, fontFamily: FONT.medium, color: C.sub, marginTop: 10 },
  svcFat: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, marginTop: 1 },
  svcFatDot: { width: 7, height: 7, borderRadius: 99 },
  svcFatTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase' },

  // Grelha 2-col (mockup .grid2/.uc/.win/.wbar)
  grid2: { flexDirection: 'row', gap: 11, marginBottom: SPACE.md },

  // "Situação de hoje" — tira de segurança (legal/descanso/validade) no topo do Início
  sit: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 16, marginBottom: SPACE.md },
  sitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sitRowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  sitDot: { width: 9, height: 9, borderRadius: 4, flexShrink: 0 },
  sitQ: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub },
  sitA: { fontSize: 13.5, fontFamily: FONT.semibold, color: C.text, marginTop: 1 },
  sitS: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 3, lineHeight: 15 },
  // Eyebrow com a pergunta nos cartões que já respondem (destaque, sem duplicar)
  ucQ: { fontSize: 9.5, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub, marginBottom: 7 },
  qLead: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.8, textTransform: 'uppercase', color: C.sub, marginBottom: 8, marginLeft: 2 },
  // Secção "Perguntas" (por baixo do card Serviços) — reutiliza os cartões `sit*`
  qSec: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.9, textTransform: 'uppercase', color: C.sub, marginTop: 2, marginBottom: 9, marginLeft: 2 },

  // Perguntas — A+chips
  qWrap: { marginBottom: SPACE.md },
  // Alerta crítico (ILEGAL / expirado) — vermelho, com o conselho à vista
  qAlert: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: C.redSoft, borderWidth: 1, borderColor: C.red, borderRadius: RADIUS.lg, padding: 14, marginBottom: 12 },
  qAlertIc: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  qAlertQ: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.5, textTransform: 'uppercase', color: C.redText },
  qAlertA: { fontSize: 16, fontFamily: FONT.display, color: C.redText, letterSpacing: -0.2, marginTop: 2 },
  qAlertS: { fontSize: 11.5, fontFamily: FONT.medium, color: C.redText, opacity: 0.85, marginTop: 5, lineHeight: 16 },
  // Lista de perguntas (versão A) — cartão; cada linha: pergunta (+conselho) + estado em PILL à direita
  qList: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 16 },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
  qRowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  qRowQ: { fontSize: 13.5, fontFamily: FONT.bold, color: C.text },
  qRowS: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 3, lineHeight: 15 },
  qPill: { borderRadius: RADIUS.pill, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: C.soft, flexShrink: 0 },
  qPillOk: { backgroundColor: C.greenSoft || C.soft },
  qPillWarn: { backgroundColor: C.warnSoft || C.soft },
  qPillInfo: { backgroundColor: C.infoSoft || C.soft },
  qPillT: { fontSize: 12, fontFamily: FONT.heavy, color: C.sub, fontVariant: ['tabular-nums'] },
  // Aviso de voo ao vivo (atraso/cancelado/desviado) — topo do Início
  fdelay: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, marginBottom: SPACE.md },
  fdelayQ: { fontSize: 10, fontFamily: FONT.heavy, letterSpacing: 0.5, textTransform: 'uppercase', color: C.sub },
  fdelayH: { fontSize: 15, fontFamily: FONT.heavy, marginTop: 2 },
  fdelayS: { fontSize: 12.5, fontFamily: FONT.semibold, color: C.text, marginTop: 3 },
  fdelayNote: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 4, lineHeight: 15 },
  gridHint: { fontSize: TYPE.micro, color: C.sub, marginTop: -8, marginBottom: SPACE.md, paddingHorizontal: 2, lineHeight: 16 },
  uc: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 15 },
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
  ucDotAe: { backgroundColor: C.green },
  aeMRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, paddingVertical: 7, borderTopWidth: 1, borderTopColor: C.line },
  aeMRow0: { borderTopWidth: 0 },
  aeMK: { fontFamily: FONT.bold, fontSize: 11, color: C.sub, flexShrink: 1 },
  aeMV: { fontFamily: FONT.semibold, fontSize: 13, color: C.text, fontVariant: ['tabular-nums'] },
  aeMKtot: { fontFamily: FONT.heavy, fontSize: 11, color: C.text },
  aeMVtot: { fontFamily: FONT.display, fontSize: 16, color: C.text, fontVariant: ['tabular-nums'] },
  aeMBar: { height: 6, borderRadius: RADIUS.pill, backgroundColor: C.soft, overflow: 'hidden', marginTop: 11 },
  aeMBarFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.green },
  aeMNote: { fontFamily: FONT.regular, fontSize: 10, color: C.sub, marginTop: 9, lineHeight: 13 },

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
