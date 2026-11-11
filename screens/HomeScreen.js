import { nightSectorIssues } from '../data/simulation';
import React, { useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, AppState, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CARD, TXT, TXT3, SPACE, RADIUS, BRAND } from '../data/constants';
import NotificationsBell from '../components/NotificationsBell';
import FlightShareCard from '../components/FlightShareCard';
import { HomeTop, HomeCards, pillWidth } from '../components/HomeCards';
import { homeCards, fitGiant } from '../data/homeCards';
import { getUpcomingFlight } from '../data/calendar';
import { catLabel } from '../data/extras';
import { serviceMoney, aeIndex, annualLabel } from '../data/perdiem';
import { isLongHaulCompany } from '../data/capabilities';
import { computeDutyTime, computeFlightTime, computeDuty, ftlForDuty, liveFdpVerdict, splitFromLegs } from '../ftl';
import { restUntilAfter } from '../data/today';
import { unknownsText } from '../data/ftlUnknowns';
import { validityLabel } from '../data/validities';
import Skeleton from '../components/Skeleton';
import { useFocusEffect, useScrollToTop, useIsFocused } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, toZulu } from '../data/appContext';
import { airportZulu, legZulu, legsZulu } from '../data/zulu';
import QuestionDetailSheet from '../components/QuestionDetailSheet';
import { buildTodayItems } from './hojeItems';
import { fdpForDuty, dayNum } from '../ae/tapLimits';
import { fmtClock } from '../data/tapLimitsText';
import { monthStats, monthSplit } from '../data/stats';
import { fetchStationWx, wxDigest, wxIcon, wxSymbol } from '../data/weather';
import { dutyLine } from '../data/dutyLine';
import { crewState } from '../data/crewState';
import { monthAudit } from '../data/audit';
import AuditSheet from '../components/AuditSheet';
import { yearCount, eventCounts } from '../data/aeEvents';
import { liveRdp } from '../data/disruption';
import { fetchFlightStatus, fetchAircraftStatus, fetchAirportStats, hasDeviation, worstDelay, arrDelayMin, recordBehindLive, settledArrZ, schedArrZ, inboundGap, airportDisruption, activeLegIndex, legNo } from '../data/flightStatus';
import { nightStopStation } from '../data/hotels';
import { scheduleWakeUp } from '../data/reminders';
import HotelSheet from '../components/HotelSheet';
import AsyncStorage from '../data/secureStorage';
import WelcomeSheet from '../components/WelcomeSheet';
import Tip from '../components/Tip';

// ══ INÍCIO 3.0 "CARTÕES DE COR" (2026-11-11 — esboço APROVADO pelo Nuno: design/inicio-cartoes.html, design-system §14) ══
// Em cima, no fundo: a pílula do estado, o número do próximo marco em DUAS linhas e dois factos ao lado de um fio. Por baixo,
// a FOLHA branca: um cartão para o momento e um para o que vem a seguir — e, só se houver, um aviso. A COR é o TIPO (areia =
// voo · salva = repouso/pernoita · lilás = serviço em terra · neutro = dinheiro · laranja = atenção). Sem teclas e sem lista
// de serviços: partilhar é o ícone do cartão, a ação do momento é a barra ao fundo do cartão, a lista vive na Escala.
// FICAM intactos: o motor (data/crewState.js), todos os cálculos e as folhas que o Início abre. O que vai para onde decide-o
// data/homeCards.js (PURO, golden test:homecards); o desenho vive em components/HomeCards.js. Saíram do Início: a placa do
// painel de partidas, os dígitos Solari, a frase da voz (o esboço não a tem), os secundários em mosaico e as 3 teclas (v6).
// O movimento fica por decidir com a skill `animacoes` depois de a página estar parada e certa (decisoes, 2026-11-11).

// ── DEMO: voo de exemplo (o "ver um exemplo" da configuração). SHOW_DEMO_FLIGHT força-o sempre.
const SHOW_DEMO_FLIGHT = false;
// ── DEV: forçar um estado para o ver no iPhone sem esperar pelo gatilho real (a véspera só dispara
// ≥ 18h). Valores: 'setup' | 'folga' | 'hoje' | 'disrupcao' | 'vespera' | 'posvoo' | 'pernoita' |
// 'ferias' | 'doenca' | 'fecho' — ou null = estado REAL. Voltar a null depois de ver!
const FORCE_HOME_STATE = null;
const TUNE = {
  wakeBefore: 75,   // lembrete para acordar: report − 75 min (vestir + caminho)
};
const DEMO_FLIGHT = (() => {
  const dep = new Date(); dep.setDate(dep.getDate() + 1); dep.setHours(6, 40, 0, 0); // partida amanhã 06:40 (report 05:40)
  const iso = `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`;
  return { demo: true, kind: 'flight', dateISO: iso, report: '05:40', depAirport: 'LIS', arrAirport: 'FNC', depTime: '06:40', arrTime: '08:20', sectors: 1, stations: ['LIS', 'FNC'], startDate: dep };
})();
// Constrói um objeto "voo" (forma do calendário) a partir de um duty do store, para o Início o poder
// mostrar como o próximo serviço. startDate = report + 1 h (o calendário traz a partida).
// SEM report (evento do calendário sem RP/C-I): continua a ser o REGISTO — rota, pernoita, hotel e ganhos
// não dependem do report — e o relógio conta a partir da PARTIDA; o PSV fica "não calculado" (nunca
// partida − 1 h). Antes devolvia null e o Início caía no voo do calendário, sem nada disso (iPhone, 2026-11-03).
function dutyToFlight(iso, d) {
  if (!d || d.deleted) return null;
  const anchor = d.report_time || d.block_off;   // o 1.º instante conhecido do serviço
  if (!anchor) return null;
  const ap = String(d.route || '').split(/[^A-Za-z]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  const at = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); const dt = new Date(iso + 'T00:00:00'); dt.setHours(h || 0, m || 0, 0, 0); return dt; };
  const anchorInstant = at(anchor);
  const reportInstant = d.report_time ? anchorInstant : null;
  // Fim do duty (para esconder os já terminados). Com block-on mais cedo que o início, o duty VIRA A
  // NOITE → fim no dia seguinte. Sem block-on, mantém-se até ao fim desse dia.
  let endDate;
  if (d.block_on) {
    const e = at(d.block_on);
    endDate = e.getTime() < anchorInstant.getTime() ? new Date(e.getTime() + 86400000) : e;
  } else {
    endDate = at('23:59');
  }
  const dep = ap[0] || '—';
  const last = ap[ap.length - 1];
  const arr = (ap.length > 1 ? (last !== dep ? last : ap[1]) : dep) || '—';  // ida-volta → mostra a estação fora
  return {
    kind: d.kind || 'flight', nightStop: !!(d.nightStop || d.night_stop), manual: true, dateISO: iso,
    flightNo: (d.legs && d.legs[0] && d.legs[0].flightNo) || null,   // p/ o estado do voo ao vivo
    report: d.report_time || null,
    depTime: d.block_off || d.report_time,
    arrTime: d.block_on || anchor,
    depAirport: dep, arrAirport: arr,
    stations: ap.length ? ap : [dep],
    sectors: d.sectors || null,
    legs: Array.isArray(d.legs) ? d.legs : null,   // setores (off/on por leg) p/ o "setor ativo"
    route: d.route || null,                        // p/ o per-diem do DIA (todos os setores)
    blockOn: d.block_on || null, signOff: d.signOff || null,
    svc: d,                      // o SERVIÇO registado deste voo (primário ou um `extra`) — quem lê o registo usa ESTE, nunca duties[dia]
    reportDate: reportInstant,   // instante ABSOLUTO do report (o countdown usa-o, como no calendário); null sem report
    startDate: reportInstant ? new Date(reportInstant.getTime() + 60 * 60 * 1000) : anchorInstant,   // sem report: a partida
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

// Próximo voo efetivo = o mais próximo entre o duty GUARDADO (store) e o voo do calendário ao vivo.
// Empate de dia → o guardado ganha (offline-first; mesmo critério da Escala).
// Os serviços de um dia — o primário e os 2.º+ (`extra`, ver multi-service-day) — cada um como "voo".
function dayFlights(iso, d) {
  if (!d || d.deleted) return [];
  return [d, ...(Array.isArray(d.extra) ? d.extra : [])].map((svc) => dutyToFlight(iso, svc)).filter(Boolean);
}
function mergeNextFlight(calFlight, duties, now) {
  let best = null;
  // TODOS os serviços de cada dia: num dia com 2, o 2.º é o próximo quando o 1.º já acabou (ou não tem
  // report). Antes só se lia o primário → o dia inteiro era saltado e o Início caía no voo do calendário
  // (sem rota, pernoita nem ganhos) — achado no iPhone, 2026-11-03.
  for (const iso in duties) {
    for (const mf of dayFlights(iso, duties[iso])) {
      if (mf.endDate.getTime() < now) continue;   // JÁ TERMINADO
      if (!best || mf.dateISO < best.dateISO || (mf.dateISO === best.dateISO && mf.startDate < best.startDate)) best = mf;
    }
  }
  if (!best) return calFlight;
  if (!calFlight) return best;
  if (best.dateISO < calFlight.dateISO) return best;
  if (best.dateISO > calFlight.dateISO) return calFlight;
  return best;
}

const hmToMin = (x) => { const m = /^(\d{1,3}):(\d{2})$/.exec(String(x || '')); return m ? +m[1] * 60 + +m[2] : null; };
const minToHm = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const hmAdd = (hm, add) => { const t0 = hmToMin(hm); return t0 == null || add == null ? null : minToHm(t0 + add); };
const isoAdd = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// Tempo de UMA estação (MET Norway via Edge, cache 45 min). Devolve null até chegar.
function useStationWx(station) {
  const [wx, setWx] = useState(null);
  useEffect(() => {
    let alive = true;
    setWx(null);
    if (!station) return () => { alive = false; };
    (async () => {
      const raw = await fetchStationWx(station);
      if (!alive || !raw) return;
      const dig = wxDigest(raw.series);
      if (dig && dig.nowC != null) {
        const tmwIcon = wxIcon(dig.tomorrowSym);
        setWx({ station, c: Math.round(dig.nowC), icon: wxIcon(dig.nowSym), sym: dig.nowSym, min: dig.todayMin, max: dig.todayMax,
          tmwMin: dig.tomorrowMin, tmwMax: dig.tomorrowMax, tmwSym: dig.tomorrowSym,
          wind: dig.windKt != null ? Math.round(dig.windKt) : null,             // para a VOZ (meteo-voz)
          tmwRain: tmwIcon === 'rain' || tmwIcon === 'thunder' });
      }
    })();
    return () => { alive = false; };
  }, [station]);
  return wx;
}

export default function HomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { width: winW } = useWindowDimensions();
  const { user, lang, ftlSnap, dayLog, duties, company, calendarId, ae, crewCategory, crewContract, crewFleet, crewHistory, isPilot, rosterChanges, aeEvents, validities, markLiveSync, base, homeBaseAt, cabinGapMin, splitAdminMin, hotels, postFlightMin, vacationDaysYear, openSimulation, openExtra, setHomeNight, serviceStart, serviceStartExact, largada, rosterLog, notify, lifestyle } = useContext(AppContext);
  // O COMANDANTE (easyJet CPT · TAP CTE): a discrição do 205(f) é dele — para o FO e a cabine é informação (auditoria
  // do tripulante, 2026-11-04).
  const isCommander = !!isPilot && ['CPT', 'CTE'].includes(String(crewCategory || '').toUpperCase());
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // As perguntas da antiga Briefing (o MESMO `buildTodayItems` → consciente de tripulação/categoria).
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  // Limites do acordo (TAP) para o serviço de HOJE — o "Dentro dos limites?" usa o mais apertado (D1).
  const aeToday = useMemo(() => {
    const dt = duties && duties[todayISO];
    if (!dt || dt.deleted || !ae || !/^tap/.test(String(ae.AE_ID || ''))) return null;
    const ct = isPilot ? 'pilot' : 'cabin';
    // Com o mapa todo: o longo curso precisa da rotação (aclimatização) e da frota do dia (reforço, Cl. 42.ª).
    // O mapa inteiro: o período de serviço de voo junta o posicionamento antes e o 2.º voo do dia sem repouso (auditoria, bloco 3).
    const one = fdpForDuty({ duties, date: todayISO, crewType: ct, baseAt: base, fleetAt: crewFleet || null });
    const r = one ? one.fdp : null;
    if (!r || r.limit == null) return null;
    return { onBlockMax: r.limit - 30, latest: fmtClock(r.latestOnBlock), latestNextDay: r.latestOnBlock >= (dayNum(todayISO) + 1) * 1440,
      over: r.status === 'excede', excess: r.value - r.limit };
  }, [duties, ae, base, isPilot, todayISO, crewFleet]);
  // Noites seguidas com mais de 4 setores (CS FTL.1.205(a)(1)) no serviço de HOJE — a mesma regra da Simulação.
  const nightToday = useMemo(() => {
    const dt = duties && duties[todayISO];
    if (!dt || dt.deleted) return null;
    const is = nightSectorIssues(duties, todayISO, { postFlightMin, isPilot, cabinGapMin, splitAdminMin }, homeBaseAt, (f) => f.iso === todayISO)
      .filter((x) => x.it.date === todayISO);
    return is.find((x) => x.level === 'bad') || is[0] || null;
  }, [duties, todayISO, postFlightMin, isPilot, cabinGapMin, splitAdminMin, homeBaseAt]);
  const todayItems = useMemo(
    () => buildTodayItems({ ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, crewHistory, serviceStart, serviceStartExact, largada, lifestyle, aeEvents, validities, isPilot, todayISO, aeToday, nightToday, postFlightMin, baseAt: homeBaseAt, companySlug: company && company.slug }, lang),
    [ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, crewHistory, serviceStart, serviceStartExact, largada, lifestyle, aeEvents, validities, isPilot, todayISO, aeToday, nightToday, postFlightMin, homeBaseAt, company, lang],
  );
  const questionItems = todayItems.filter((it) =>
    (it.id === 'legal' && it.status !== 'neutral')
    || (it.id === 'rest' && it.status !== 'neutral')
    || it.id === 'roster'
    || it.id === 'validades');
  const qAlerts = questionItems.filter((it) => it.status === 'bad');
  const qChips = questionItems.filter((it) => it.status !== 'bad');
  const legalIt = todayItems.find((it) => it.id === 'legal') || null;
  const headroomIt = todayItems.find((it) => it.id === 'headroom') || null;

  // FTL — limites de tempo (ORO.FTL.210), calculados pelo MOTOR a partir do dayLog (store FTL).
  const dutyLimits = computeDutyTime(dayLog);     // serviço: 60/110/190 h em 7/14/28 dias
  const flightLimits = computeFlightTime(dayLog); // voo: 100/900/1000 h em 28 d / ano civil / 12 m
  const limLabel = (w) =>
    w.id === 'year' ? l('Ano civil', 'Calendar year') :
    w.id === '12m'  ? l('12 meses', '12 months') :
                      `${w.days} ${l('dias', 'days')}`;
  const hasLimitData = Object.values(dayLog).some((d) => (d?.voo > 0) || (d?.servico > 0));
  const worstOf = (arr) => arr.reduce((w, x) => (x.ratio > w.ratio ? x : w), { ratio: -1, limit: null, done: 0 });
  const limWorst = worstOf([...dutyLimits, ...flightLimits]);
  const limLevel = limWorst.ratio >= 1 ? 'over' : limWorst.ratio >= 0.85 ? 'warn' : 'ok';
  const psvOver = !!(ftlSnap.psv && ftlSnap.psv.over);
  const stateLevel = psvOver ? 'over' : (hasLimitData ? limLevel : 'neutral');
  const worstCat = dutyLimits.indexOf(limWorst) >= 0 ? 'servico' : flightLimits.indexOf(limWorst) >= 0 ? 'voo' : null;
  const stateReason = hasLimitData && limWorst.limit != null
    ? `${worstCat ? catLabel(worstCat, lang) + ' ' : ''}${limLabel(limWorst)} · ${Math.round(limWorst.ratio * 100)}%`
    : null;

  // ── Próximo voo (calendário) — carrega automaticamente ao abrir ──
  const [calFlight, setCalFlight] = useState(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null);
  const [calOk, setCalOk] = useState(true); // acesso ao calendário do telemóvel
  const [calErr, setCalErr] = useState(false); // a LEITURA rebentou (≠ "sem voos") — erro visível, não vazio falso
  const [syncing, setSyncing] = useState(true);
  const [syncDone, setSyncDone] = useState(false);
  const [lastReadMs, setLastReadMs] = useState(null);   // a hora da última leitura bem-sucedida (folga sem serviços)
  const syncingRef = useRef(false);
  const syncFlight = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      // Só lê o calendário se houver um LIGADO (sem prompt; sem leitura "às cegas").
      const res = calendarId ? await getUpcomingFlight(company, calendarId) : { ok: false, flight: null };
      setCalOk(res.ok); setCalErr(false);
      if (res.ok) setLastReadMs(Date.now());
      setCalFlight(res.flight || (SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null));
    } catch { setCalErr(true); setCalFlight(SHOW_DEMO_FLIGHT ? DEMO_FLIGHT : null); }   // falha ≠ vazio: mostra o erro
    setSyncDone(true); setSyncing(false);
    syncingRef.current = false;
  };
  // "Ligar o calendário" FAZ o que diz: dispara o fluxo de ligação na Escala (prompt + escolher o calendário).
  const requestAccess = () => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { connect: Date.now() } }); };
  // ref sempre atual (efeitos com deps [] guardariam o 1.º closure — calendarId/company do arranque).
  const syncRef = useRef(syncFlight);
  syncRef.current = syncFlight;
  useFocusEffect(useCallback(() => { syncRef.current(); }, []));
  // A app volta de segundo plano (ex.: a eCrew atualizou o calendário) → o voo novo aparece sem reabrir.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') syncRef.current(); });
    return () => sub.remove();
  }, []);

  const flight = useMemo(() => mergeNextFlight(calFlight, duties, Date.now()), [calFlight, duties]);

  // Relógio VIVO: re-renderiza a cada 30 s enquanto o ecrã está focado (a contagem não congela).
  const [, setNowTick] = useState(0);
  useFocusEffect(useCallback(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []));
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh: relê o calendário a pedido
  const homeScrollRef = useRef(null);
  useScrollToTop(homeScrollRef);   // re-tocar na aba Início → volta ao topo (convenção iOS)

  // ── BOAS-VINDAS + DICA do ＋ (design/boas-vindas.html, 2026-07-10) ──
  // Folha: 1× na vida, só nasce do funil ('pending' escrito no fim do onboarding). Dica do ＋: 1.ª visita
  // DEPOIS da folha (nunca as duas juntas). Morre a qualquer toque. Flags por utilizador.
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [plusTip, setPlusTip] = useState(false);
  const welcomeThisVisit = useRef(false);
  const plusTipTimer = useRef(null);
  const focusedRef = useRef(false);
  const homeBusyRef = useRef(false);
  useEffect(() => {
    let on = true;
    if (!user?.id) return () => { on = false; };
    AsyncStorage.getItem(`cp_welcome_${user.id}`).then((v) => {
      if (on && v === 'pending') { welcomeThisVisit.current = true; setWelcomeOpen(true); }
    }).catch(() => {});
    return () => { on = false; };
  }, [user?.id]);
  const closeWelcome = () => {
    setWelcomeOpen(false);
    if (user?.id) AsyncStorage.setItem(`cp_welcome_${user.id}`, 'seen').catch(() => {});
    // Dica do ＋ na MESMA visita (padrão TipKit): 3 s de respiro, só com o Início em foco e o palco livre.
    const uid = user?.id;
    if (!uid) return;
    if (plusTipTimer.current) clearTimeout(plusTipTimer.current);
    plusTipTimer.current = setTimeout(() => {
      if (!focusedRef.current || homeBusyRef.current) return;
      AsyncStorage.getItem(`cp_tip_plus_${uid}`)
        .then((tp) => { if (!tp && focusedRef.current && !homeBusyRef.current) setPlusTip(true); })
        .catch(() => {});
    }, 3000);
  };
  useFocusEffect(useCallback(() => {
    let on = true;
    focusedRef.current = true;
    if (user?.id && !welcomeThisVisit.current) {
      Promise.all([AsyncStorage.getItem(`cp_welcome_${user.id}`), AsyncStorage.getItem(`cp_tip_plus_${user.id}`)])
        .then(([w, tp]) => { if (on && w === 'seen' && !tp) setPlusTip(true); })
        .catch(() => {});
    }
    return () => {
      on = false; focusedRef.current = false; welcomeThisVisit.current = false;
      if (plusTipTimer.current) { clearTimeout(plusTipTimer.current); plusTipTimer.current = null; }
      setPlusTip((p) => { if (p && user?.id) AsyncStorage.setItem(`cp_tip_plus_${user.id}`, '1').catch(() => {}); return false; });
    };
  }, [user?.id]));
  const dismissPlusTip = () => {
    if (!plusTip) return;
    setPlusTip(false);
    if (user?.id) AsyncStorage.setItem(`cp_tip_plus_${user.id}`, '1').catch(() => {});
  };

  // ── Estado do voo AO VIVO (AirLabs via Edge `flight-status`, cache de 60 s no servidor) — só DENTRO DA
  // JANELA do dia (~4 h antes da partida até ~1 h depois do fim) → poupa pedidos.
  // SEGUE O SETOR ATIVO (2026-11-03): antes seguia o nº do 1.º setor o dia todo e um atraso dele punha os
  // setores seguintes em disrupção. O setor ativo avança pela chegada real/estimada do voo seguido (não pela
  // hora planeada) e nunca volta atrás no mesmo dia — `activeLegIndex` (data/flightDelay.js, test:flightstatus).
  const [fsRaw, setFsRaw] = useState(null);   // { no, st } — o estado E o voo a que pertence
  const sectorLegs = (flight && flight.kind === 'flight' && Array.isArray(flight.legs))
    ? flight.legs.filter((lg) => lg && (lg.dep || lg.arr)) : [];
  const legFloor = useRef({ iso: null, idx: 0 });
  const activeSector = (() => {
    if (!sectorLegs.length) return null;
    const live = fsRaw && fsRaw.st && fsRaw.st.arr ? { no: fsRaw.no, arrTs: fsRaw.st.arr.actualTs || fsRaw.st.arr.estimatedTs || null } : null;
    const floor = legFloor.current.iso === flight.dateISO ? legFloor.current.idx : 0;
    const idx = activeLegIndex(sectorLegs, { now: Date.now(), onMs: (lg) => { const d = legInstant(flight.dateISO, lg.on, flight.report || flight.depTime); return d ? d.getTime() : null; }, live, floor });
    legFloor.current = { iso: flight.dateISO, idx };   // o índice só sobe neste dia
    return { idx, total: sectorLegs.length, leg: sectorLegs[idx] };
  })();
  // O voo seguido: o do setor ativo (sem número nesse setor → não se segue nada, nunca o de outro setor).
  const flightNo = !flight ? null : activeSector ? (legNo(activeSector.leg) || null) : (flight.flightNo ? legNo({ flightNo: flight.flightNo }) : null);
  // O PSV acaba nos calços do último setor OPERADO (ORO.FTL.105(12)): um DH depois dele não conta para o veredicto ao vivo.
  const lastOpIdx = sectorLegs.reduce((k, lg, i) => (lg && !lg.dh ? i : k), -1);
  const trackingDhTail = !!(activeSector && activeSector.leg && activeSector.leg.dh && activeSector.idx > lastOpIdx);
  const trackingLast = !activeSector || activeSector.idx === (lastOpIdx >= 0 ? lastOpIdx : activeSector.total - 1);
  const depTs = (flight && flight.startDate) ? +new Date(flight.startDate) : null;
  const endTs = (flight && flight.endDate) ? +new Date(flight.endDate) : (depTs ? depTs + 3 * 3600e3 : null);
  const inFlightWindow = !!depTs && Date.now() >= depTs - 4 * 3600e3 && Date.now() <= (endTs || depTs) + 3600e3;
  const [detailItem, setDetailItem] = useState(null);   // pergunta aberta na folha "porquê"
  const [fsTick, setFsTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!flightNo || !inFlightWindow) { setFsRaw(null); return; }
    const no = flightNo;
    fetchFlightStatus(no).then((st) => { if (!cancelled) setFsRaw({ no, st: st || null }); });
    return () => { cancelled = true; };
  }, [flightNo, inFlightWindow, fsTick]);
  // Só vale o estado do voo que está a ser seguido (no instante da troca de setor, o antigo ainda está em memória).
  const flightStatus = fsRaw && fsRaw.no === flightNo ? fsRaw.st : null;
  // Ao voltar ao Início (aba ou app), pede o estado outra vez — o servidor guarda 60 s, é barato.
  useFocusEffect(useCallback(() => { setFsTick((n) => n + 1); }, []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') setFsTick((n) => n + 1); });
    return () => sub.remove();
  }, []);

  // INBOUND — onde anda o avião que nos vem buscar (só antes da nossa partida, com matrícula).
  const [inbound, setInbound] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const reg = flightStatus && flightStatus.aircraft && flightStatus.aircraft.reg;
    const preDep = !!(flightStatus && flightStatus.dep && !flightStatus.dep.actual);
    if (!reg || !preDep) { setInbound(null); return; }
    fetchAircraftStatus(reg).then((st) => { if (!cancelled) setInbound(st); });
    return () => { cancelled = true; };
  }, [flightStatus]);
  const inboundInfo = (inbound && flightStatus) ? inboundGap(inbound, {
    ourFlight: flightNo,
    ourDepZ: flightStatus.dep && flightStatus.dep.scheduledUtc,
    ourDepIata: flightStatus.dep && flightStatus.dep.iata,
  }) : null;
  const inboundLate = !!(inboundInfo && inboundInfo.projDelayMin >= 15);

  // O aeroporto de PARTIDA está "doente"? (só antes da partida; a Edge cacheia 12 min).
  const [depAirport, setDepAirport] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const iata = flightStatus && flightStatus.dep && flightStatus.dep.iata;
    const preDep = !!(flightStatus && flightStatus.dep && !flightStatus.dep.actual);
    if (!iata || !preDep) { setDepAirport(null); return; }
    fetchAirportStats(iata).then((st) => { if (!cancelled) setDepAirport(st); });
    return () => { cancelled = true; };
  }, [flightStatus]);
  const airportDis = (depAirport && flightStatus && flightStatus.dep && !flightStatus.dep.actual)
    ? airportDisruption(depAirport) : null;

  // ── Contagem até ao report REAL (calendário/registo). SEM report real, conta para a PARTIDA e di-lo
  // (inventar "partida − 1 h" pôs gente 15 min atrasada). Prefere o INSTANTE absoluto.
  const now = Date.now();
  const reportMs = !flight ? null
    : flight.reportDate ? (() => { const ts = +new Date(flight.reportDate); return isNaN(ts) ? null : ts; })()
    : (flight.report && /^\d{1,2}:\d{2}$/.test(flight.report)) ? (() => {
      const [rh, rm] = flight.report.split(':').map(Number);
      const dt = new Date(`${flight.dateISO}T00:00:00`); dt.setHours(rh, rm, 0, 0);
      return isNaN(dt.getTime()) ? null : dt.getTime();
    })() : null;
  const cdTarget = reportMs != null ? reportMs : (flight ? flight.startDate.getTime() : null);
  const cdMin = cdTarget != null ? Math.round((cdTarget - now) / 60000) : null;

  // PSV máx: com serviço registado nesse dia, exato; senão estima pelo voo (1 setor, não alimenta veredictos).
  let ndPsvMax = null, ndPsvActual = null, ndSectors = null, ndDuty = null, ndPsvHi = null;
  if (flight) {
    const reg = flight.svc || null;   // o serviço deste voo (num dia com 2, o 2.º — não o primário)
    if (flight.demo) {
      const d = computeDuty({ state: 'acc', report: flight.report, end: flight.arrTime, sectors: flight.sectors, isPilot });
      ndPsvMax = d.fdp.maxFdpStr; ndPsvActual = d.fdp.actualFdpStr; ndSectors = flight.sectors; ndDuty = d;
    } else if (reg && !reg.deleted && reg.report_time && reg.block_on) {
      // Serviço REGISTADO: o MESMO cálculo do dayLog (ftlForDuty: pós-voo, casos especiais, base/fora, split).
      // Um serviço que não é PSV (standby em casa, formação, escritório) não tem PSV máximo (ORO.FTL.105(12)).
      const d = ftlForDuty(reg, { postFlightMin, isPilot, base: flight.dateISO ? homeBaseAt(flight.dateISO) : base, date: flight.dateISO || null, cabinGapMin, splitAdminMin, duties });
      if (d && d.isFdp) { ndPsvMax = d.fdp.maxFdpStr; ndPsvHi = d.fdp.exact === false ? d.fdp.maxHiStr : null; ndPsvActual = d.fdp.actualFdpStr; ndSectors = reg.sectors || null; ndDuty = d; }
    } else if (flight.report) {
      // Só com apresentação REAL do calendário — não inventa dep − 1 h.
      const d = computeDuty({ state: 'acc', report: flight.report, end: flight.arrTime, sectors: 1, isPilot });
      ndPsvMax = d.fdp.maxFdpStr;
    }
  }
  // Voo ao vivo: recalcula o PSV com o ATRASO REAL à chegada e dá o veredicto (105/205).
  const ndArrDelay = flightStatus ? arrDelayMin(flightStatus) : 0;
  const liveVerdict = (ndArrDelay > 0 && ndDuty && !trackingDhTail)
    // Só é facto (não projeção) quando o setor seguido é o ÚLTIMO e já aterrou: o PSV acaba nos calços do último.
    ? liveFdpVerdict(ndDuty, ndArrDelay, { projected: !(trackingLast && flightStatus.arr && flightStatus.arr.actual) })
    : null;
  // O REGISTO guardado está atrás da chegada REAL? (aviso de sincronizar a escala eCrew).
  const ndReg = flight ? (flight.svc || null) : null;
  const ndOpLegs = (ndReg && Array.isArray(ndReg.legs)) ? (ndReg.legs.some((lg) => lg && !lg.dh) ? ndReg.legs.filter((lg) => lg && !lg.dh) : ndReg.legs) : [];   // o último setor OPERADO (o DH não)
  const ndOnLeg = ndOpLegs.length
    ? ndOpLegs[ndOpLegs.length - 1]
    : (flight && flight.arrTime ? { on: flight.arrTime, arr: (flightStatus && flightStatus.arr && flightStatus.arr.iata) || null } : null);
  // A chegada do último setor pela cadeia do serviço (data/zulu.js): o dia e o fuso certos, também no longo curso.
  const ndStoredOnZ = (flight && ndOnLeg && ndOnLeg.on)
    ? ((ndReg && Array.isArray(ndReg.legs) && ndReg.legs.includes(ndOnLeg))
      ? (legsZulu(flight.dateISO, ndReg.legs, ndReg.report_time || null)[ndReg.legs.indexOf(ndOnLeg)] || {}).on || null
      : legZulu(flight.dateISO, ndOnLeg, 'on', (ndReg && ndReg.report_time) || (ndOpLegs[0] && ndOpLegs[0].off) || null))
    : null;
  // Só com o ÚLTIMO setor seguido: o registo compara-se com os calços do último (é o que o App também limpa).
  const syncBehind = !!(trackingLast && flightStatus && ndStoredOnZ && recordBehindLive(flightStatus, ndStoredOnZ));
  // Só o Início vê o feed ao vivo → é aqui que se MARCA o sinal persistente (idempotente).
  useEffect(() => {
    if (syncBehind && flight) markLiveSync(flight.dateISO, { flightNo, realArrZ: settledArrZ(flightStatus), schedArrZ: schedArrZ(flightStatus) });
  }, [syncBehind, flightStatus, flight && flight.dateISO, flightNo]); // eslint-disable-line react-hooks/exhaustive-deps

  // € sempre com cêntimos (regra da casa) — "1 284,50" (o símbolo vem à parte).
  const eurBare = (n) => { const [i, d] = Number(n).toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ')}${lang === 'en' ? '.' : ','}${d}`; };
  const eur = (n, sign = '') => (lang === 'en' ? `${sign}€${eurBare(n)}` : `${sign}${eurBare(n)} €`);
  // Per-diem do DIA (todos os setores da rota).
  let dayPerDiem = null;
  if (flight && ae && crewCategory && flight.route) {
    // O MESMO valor que entra no mês (o índice do mês incluído — auditoria L10, bloco 6).
    dayPerDiem = serviceMoney(ae, crewCategory, flight, { date: flight.dateISO || todayISO, fleet: crewFleet, baseAt: homeBaseAt }).perDiem;
  }
  const loadingFlight = !flight && syncing && !syncDone && calOk;
  const isNonFlight = !!(flight && flight.kind && flight.kind !== 'flight');

  // Abrir o detalhe de um dia (`initial: false` mete a EscalaMain POR BAIXO: o ‹ volta à Escala).
  const openDayDetail = (iso, edit = false) => { select(); navigation.navigate('Escala', { screen: 'DutyDetail', initial: false, params: edit ? { date: iso, edit: Date.now() } : { date: iso } }); };
  const hasReg = (iso) => !!(iso && duties[iso] && !duties[iso].deleted && duties[iso].report_time);

  // ── Hotel da pernoita (catálogo por estação) — a estação deriva da ESCALA, nunca de GPS.
  const [hotelOpen, setHotelOpen] = useState(false);
  const nsHotelStation = (flight && flight.nightStop) ? (() => {
    const reg = flight.svc || null;
    const viaDuty = (reg && !reg.deleted) ? nightStopStation(reg, base) : null;
    if (viaDuty) return viaDuty;
    const stns = Array.isArray(flight.stations) ? flight.stations : [];
    const last = String(stns[stns.length - 1] || flight.arrAirport || '').toUpperCase();
    const b = String(base || '').toUpperCase();
    return /^[A-Z]{3}$/.test(last) && last !== b ? last : null;
  })() : null;
  const nsHotel = nsHotelStation ? (hotels || {})[nsHotelStation] : null;

  const hourNow = new Date().getHours();

  // ── O MOTOR da Living Interface (data/crewState.js — PURO, golden test:crewstate) ──
  const isToday = !!(flight && flight.dateISO === todayISO);
  const fsDev = !!(flightStatus && hasDeviation(flightStatus));
  const cs = crewState({
    now, hour: hourNow, todayISO,
    flight, cdMin,
    deviated: fsDev, inboundLate,
    calendarConnected: !!(calendarId && calOk),
    todayDuty: duties[todayISO] || null, base,
    events: aeEvents || [], hasAe: !!ae,
  });
  const homeState = FORCE_HOME_STATE || cs.state;
  const todayEnded = cs.ended ? (duties[todayISO] || null) : null;
  const closeMulti = cs.closeMulti;
  const closeNsStation = cs.nsStation;
  // Tema NOTURNO (véspera/pernoita) — publica-se ao contexto para a TabBar herdar.
  const night = homeState === 'vespera' || homeState === 'pernoita';
  const C = night ? CARD.night : CARD.day;   // os cartões de cor (design-system §14)
  useEffect(() => { setHomeNight && setHomeNight(night); }, [night, setHomeNight]);
  const inDuty = isToday && cdMin != null && cdMin <= 0;
  const kindLabel = flight && flight.kind ? t('duties.kind.' + flight.kind, lang) : '';
  const hm = (x) => (x ? String(x).slice(11, 16) : null);
  const wDelay = fsDev ? worstDelay(flightStatus) : null;
  const delayMin = fsDev ? ((wDelay && wDelay.min) || 0) : ((inboundInfo && inboundInfo.projDelayMin) || 0);
  const fsStatus = String((flightStatus && flightStatus.status) || '').toLowerCase();
  const fsCancelled = fsStatus === 'cancelled' || fsStatus === 'canceled';
  const fsDiverted = fsStatus === 'diverted';
  const longHaul = isLongHaulCompany(company, crewFleet);
  const fsDep = flightStatus && flightStatus.dep;
  const fsArr = flightStatus && flightStatus.arr;

  // ── A FASE do dia de voo (hoje): antes do report · em serviço em terra · no ar · aterrado ──
  // O feed ao vivo é SEMPRE do setor ativo (ver flightNo acima) → as horas reais valem também em dias de vários setores.
  const liveActive = !!flightStatus;
  const depPlan = flight ? (activeSector ? activeSector.leg.off : flight.depTime) : null;
  const arrPlan = flight ? (activeSector ? activeSector.leg.on : flight.arrTime) : null;
  const depHm = (liveActive && fsDep && hm(fsDep.actual || fsDep.estimated)) || depPlan || null;
  const arrHm = (liveActive && fsArr && hm(fsArr.actual || fsArr.estimated)) || arrPlan || null;
  const depMs = (() => {
    if (!flight) return null;
    const ts = liveActive && fsDep && (fsDep.actualTs || fsDep.estimatedTs);
    if (ts) return ts * 1000;
    const d = legInstant(flight.dateISO, depPlan, flight.report || flight.depTime); return d ? d.getTime() : null;
  })();
  const arrMs = (() => {
    if (!flight) return null;
    const ts = liveActive && fsArr && (fsArr.actualTs || fsArr.estimatedTs);
    if (ts) return ts * 1000;
    const d = legInstant(flight.dateISO, arrPlan, flight.report || flight.depTime); return d ? d.getTime() : null;
  })();
  const phase = !(isToday && flight && !isNonFlight) ? null
    : (cdMin != null && cdMin > 0) ? 'pre'
    : (depMs != null && now < depMs) ? 'duty'
    : (arrMs != null && now < arrMs) ? 'air'
    : 'landed';
  const minsTo = (ms) => (ms == null ? null : Math.max(0, Math.round((ms - now) / 60000)));
  const durTxt = (min) => {
    if (min == null) return '';
    if (min < 60) return `${min} min`;
    if (min < 48 * 60) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`; }
    const d = Math.round(min / 1440); return `${d} ${d === 1 ? l('dia', 'day') : l('dias', 'days')}`;
  };
  const legDep = String((activeSector && activeSector.leg.dep) || (flight && flight.depAirport) || '').toUpperCase();
  const legArr = String((activeSector && activeSector.leg.arr) || (flight && flight.arrAirport) || '').toUpperCase();

  // ── O TEMPO — só onde decide alguma coisa no 3.0: o de AMANHÃ na estação da pernoita (o facto "7° · amanhã · chuva").
  // Nos outros estados não se pede (o esboço não mostra o tempo; poupa pedidos à rede).
  const wxHereStation = homeState === 'pernoita' && closeNsStation ? String(closeNsStation).toUpperCase() : null;
  const wxHere = useStationWx(wxHereStation);

  // ── REPOUSO ATÉ (pós-voo/pernoita): a MESMA regra do restBetweenDuties (ORO.FTL.235 a/b). ──
  // A regra é a do motor (restAfterDuty): também as 14 h depois de repouso a bordo ou de fuso ≥ 4 h e as +2 h/+4 h
  // depois de um PSV prolongado (auditoria A-145/A-150/A-169). Sem localização fiável, o estado diz onde se repousa.
  const restUntil = (todayEnded && !closeMulti && (homeState === 'posvoo' || homeState === 'pernoita')) ? (() => {
    // A MESMA regra da pílula do repouso (restUntilAfter = restStatus): +2 h ou +4 h depois de um prolongamento.
    const ru = restUntilAfter(duties || {}, todayISO, { inBase: homeState === 'posvoo', baseAt: homeBaseAt, postFlightMin: postFlightMin || 0, isPilot });
    if (!ru) return null;
    const u = new Date(ru.untilMs);
    const uIso = `${u.getFullYear()}-${String(u.getMonth() + 1).padStart(2, '0')}-${String(u.getDate()).padStart(2, '0')}`;
    return { hm: `${String(u.getHours()).padStart(2, '0')}:${String(u.getMinutes()).padStart(2, '0')}`, nextDay: uIso > todayISO, untilIso: uIso, untilMs: ru.untilMs, endMs: ru.endMs };
  })() : null;

  // O repouso para o "repouso cumprido" da véspera (auditoria do tripulante, 2026-11-04): a MESMA conta da pílula
  // REPOUSO ✓/CURTO (restStatus, golden test:reststatus) → "verificado/tratado" só com ela a verde.
  const restVoice = (() => {
    const rI = (todayItems || []).find((it) => it.id === 'rest');
    const r = rI && rI.raw; if (!r || r.status === 'neutral') return { restOk: null };
    const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    // "Verificado" só com a pergunta inteira a verde — também a recuperação (ORO.FTL.235(d)).
    // Incerto (as pernas do serviço anterior não batem certo, 'legTimes'; ou dois serviços que podem ser um PSV repartido ou dois,
    // 'breakOrRest'): nem "verificado" nem "curto" — sem saber.
    if (r.kind === 'legTimes' || r.kind === 'breakOrRest' || r.kind === 'reducedRest' || r.kind === 'reducedRestAfter') return { restOk: null };
    return { restOk: rI.status === 'ok', restHave: r.actualMin != null ? hm(r.actualMin) : null, restNeed: r.requiredMin != null ? hm(r.requiredMin) : null };
  })();
  // ── PÓS-VOO: o balanço do dia fechado (motor computeDuty, o MESMO dos golden) ──
  const closeD = (todayEnded && !closeMulti) ? (() => {
    try {
      const r = ftlForDuty(todayEnded, { postFlightMin, isPilot, base: homeBaseAt(todayISO), date: todayISO, cabinGapMin, splitAdminMin, duties });
      return r && r.isFdp ? r : null;   // escritório/formação/standby em casa não são PSV (ORO.FTL.105(12))
    } catch { return null; }
  })() : null;
  let pdToday = null;
  if (todayEnded && !closeMulti && ae && crewCategory && todayEnded.route) {
    pdToday = serviceMoney(ae, crewCategory, todayEnded, { date: todayISO, fleet: crewFleet, baseAt: homeBaseAt, duties }).perDiem;   // índice do mês (L10)
  }
  // Acordar sugerido (véspera): report − 75 min (estimativa: vestir + caminho).
  const wakeMs = (homeState === 'vespera' && reportMs != null) ? reportMs - TUNE.wakeBefore * 60000 : null;
  const wakeAt = wakeMs != null ? (() => { const d = new Date(wakeMs); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })() : null;
  // ── PERNOITA: hotel da estação (catálogo local) + abono da noite (ae.nightStop, Art. 39) ──
  const closeHotel = closeNsStation ? (hotels || {})[closeNsStation] : null;
  // TAP: a noite depois de um dia de voo não paga estadia nesse dia (Cl. 7.ª/9.ª; bloco 5) → sem "+ €" aqui.
  const nsPay = (ae && ae.nightStop && crewCategory && !ae.PER_DIEM_BY_DAY) ? ae.nightStop(crewCategory, aeIndex(ae, todayISO), todayISO) : null;   // índice do mês (L10)
  // ── FÉRIAS: saldo do ano (Art. 238.º CT) + dia de regresso (fim do bloco consecutivo) ──
  const vacInfo = (homeState === 'ferias') ? (() => {
    const quota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
    const taken = yearCount(aeEvents || [], todayISO.slice(0, 4), 'vacDays', duties);
    const days = new Set((aeEvents || []).filter((e) => e && e.type === 'vacDays' && String(e.date).length === 10).map((e) => e.date));
    let back = todayISO;
    while (days.has(isoAdd(back, 1))) back = isoAdd(back, 1);
    const ret = isoAdd(back, 1);   // regresso = dia seguinte ao último dia consecutivo de férias
    // O PERÍODO destas férias (crítica externa, 2026-11-04): dá contexto e deixa verificar o desconto do saldo.
    let start = null;
    if (days.has(todayISO)) { start = todayISO; while (days.has(isoAdd(start, -1))) start = isoAdd(start, -1); }
    const MES = lang === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const dm = (iso) => `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]}`;
    const period = start ? l(`férias de ${dm(start)} a ${dm(back)}`, `leave from ${dm(start)} to ${dm(back)}`) : null;
    return { quota, taken, left: Math.max(0, quota - taken), retISO: ret, period, lastDay: ret === isoAdd(todayISO, 1), fromIso: start, toIso: start ? back : null,
      retLabel: new Date(ret + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/-feira/i, '') };
  })() : null;
  // ── DOENÇA: dia N do episódio + a regra de pagamento do ACORDO DO PERFIL (ae.SICK_STATE: easyJet pilotos Art. 48.º, cabine
  // Cl. 61.ª, TAP pilotos AE Cl. 37.ª, TAP cabine RRRGS Cl. 20.ª). Sem acordo modelado: nenhuma frase sobre pagamento (A-103/A-205).
  const sickState = ae && ae.SICK_STATE ? ae.SICK_STATE : null;
  const sickFirst3 = !!(sickState && sickState.paidFirst3);
  const sickDay = cs.sickDay || 0;
  // ── FECHO DO MÊS: dias que faltam ──
  const fechoDaysLeft = (homeState === 'fecho') ? (() => {
    const [y, m, d] = todayISO.split('-').map(Number);
    return new Date(y, m, 0).getDate() - d;
  })() : null;
  // ── EM VOO: o PSV a correr desde o report (o "PSV 7:30 de 11:45" do cartão do dia de serviço) ──
  const psvRunning = (inDuty && reportMs != null) ? (() => {
    const until = phase === 'landed' && trackingLast && arrMs != null ? Math.min(now, arrMs) : now;   // aterrado no último setor: o PSV fechou nos calços
    const min = Math.max(0, Math.round((until - reportMs) / 60000));
    return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
  })() : null;
  // ── STANDBY hoje: "se chamado agora → PSV até HH:MM" (o motor 225 dá o máx; report + máx = relógio) ──
  const isStandbyToday = !!(flight && isToday && isNonFlight && /standby|reserve/.test(String(flight.kind || '')));
  const psvUntil = (isStandbyToday && flight.report && ndPsvMax) ? hmAdd(flight.report, hmToMin(ndPsvMax)) : null;

  // € do MÊS estimado — o MESMO monthStats dos Números (nunca um nº novo). Guarda o aeMonth COMPLETO:
  // o fecho do mês mostra as parcelas (que SOMAM — auditável).
  const monthSt = useMemo(() => {
    if (!ae || !crewCategory) return null;
    try {
      const st0 = monthStats(duties, { ym: todayISO.slice(0, 7), ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents, serviceStart, startExact: serviceStartExact, largada, lifestyle, baseAt: homeBaseAt });
      return st0 || null;
    } catch { return null; }
  }, [duties, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, todayISO, serviceStart, serviceStartExact, largada, lifestyle, homeBaseAt]);
  const monthAe = monthSt && monthSt.aeMonth ? monthSt.aeMonth : null;
  const monthNightStops = monthSt && typeof monthSt.nightStops === 'number' ? monthSt.nightStops : null;
  const monthMoney = monthAe ? monthAe.total : null;
  // 9/3 e sazonais sem as datas de atividade (Cl. 48.ª/80.ª): o mês é INCERTO — diz-se, com o intervalo da base (bloco 5).
  const monthUnc = monthAe && monthAe.baseRange ? monthAe.baseRange : null;
  // Fecho: a parte variável dividida em "até hoje" e "resto do mês" (a MESMA conta do total — data/stats.js).
  const monthSplitNow = useMemo(() => {
    if (!ae || !crewCategory) return null;   // fecho (título) + o cartão do mês em todos os estados
    try {
      return monthSplit(duties, { ym: todayISO.slice(0, 7), ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents, todayISO, serviceStart, startExact: serviceStartExact, largada, lifestyle, baseAt: homeBaseAt });
    } catch { return null; }
  }, [homeState, duties, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, todayISO, serviceStart, serviceStartExact, largada, lifestyle, homeBaseAt]);
  const monthName = new Date().toLocaleDateString(locale, { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  // O que está DENTRO dos "Extras" do fecho (Nuno, 2026-11-04): a MESMA função do total (ae.monthExtras sobre os
  // eventos do mês) → as linhas somam o valor da parcela. + o que vem da escala (papéis · escritório) e o abono.
  const extrasItem = (homeState === 'fecho' && monthAe && ae && crewCategory) ? (() => {
    const ym = todayISO.slice(0, 7);
    const index = ae.indexFactor ? ae.indexFactor(ym) : 1;   // por mês (A-041)
    const xt = ae.monthExtras ? ae.monthExtras(crewCategory, eventCounts(aeEvents || [], ym, duties, ae.SICK_FIRST3 !== false), { index, ym, contract: crewContract || '12/12' }) : null;
    const kinds = Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS : [];
    const rows = [];
    for (const it of (xt && xt.items) || []) {
      const kd = kinds.find((x) => x.id === it.id);
      const nm = it.id === 'sickAbsence' ? l('Base dos dias de baixa (CT art. 255.º)', 'Base on sick days (Labour Code art. 255)')
        : kd && kd.label ? (kd.label[lang] || kd.label.pt) : it.id;
      rows.push({ k: it.each == null ? `${nm} · ${it.n} · ${l('sem valor na tabela', 'no value in the table')}` : `${nm} · ${it.n} × ${eur(it.each)}`, v: it.each == null ? '—' : eur(it.total) });
    }
    if (monthAe.extras) rows.push({ k: l('Da escala (papéis · escritório)', 'From the roster (roles · office)'), v: eur(monthAe.extras) });
    if (monthAe.cash) rows.push({ k: l('Abono para falhas', 'Cash-handling allowance'), v: eur(monthAe.cash) });
    const total = (monthAe.extras || 0) + (monthAe.events || 0) + (monthAe.cash || 0);
    return { id: 'extras', q: l(`Extras de ${monthName}`, `${monthCap} extras`), answer: eur(total), rows,
      suggestion: l('Cada linha vem de um registo teu (Evento) ou da escala. Algum a mais? Corrige-o nos Números.', 'Each line comes from an event you logged or from the roster. One too many? Fix it in Numbers.'),
      navTo: { root: 'Estatísticas', label: l('Abrir os Números', 'Open Numbers') } };
  })() : null;
  const d7 = dutyLimits.find((w) => w.days === 7) || null;

  // MODO EXEMPLO: o voo é FALSO e di-lo sempre (pílula "Exemplo · sair" no lugar do sino), e sai-se num toque.
  const demoOn = !!(flight && flight.demo);
  const exitDemo = () => { select(); setCalFlight(null); };

  // Documento crítico e alertas FTL (vermelhos) — sobem à cabeça da fila dos secundários.
  const docAlert = qAlerts.find((it) => it.id === 'validades') || null;
  const bandAlerts = qAlerts.filter((it) => it.id !== 'validades');
  const openItem = (it) => { select(); setDetailItem(it); };
  // "Limites": o porquê de hoje quando há veredicto; senão a margem; senão os Números.
  const openLimits = () => {
    if (legalIt && legalIt.status !== 'neutral' && !(legalIt.raw && legalIt.raw.kind === 'noData')) { openItem(legalIt); return; }
    if (headroomIt && headroomIt.status !== 'neutral' && !(headroomIt.raw && headroomIt.raw.kind === 'noData')) { openItem(headroomIt); return; }
    select(); navigation.navigate('Estatísticas');
  };
  const openReview = () => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { review: Date.now() } }); };

  // ── Partilhar UM voo (cartão + link ao vivo). O mesmo construtor serve o voo de HOJE, o de AMANHÃ
  // (véspera) e o já ATERRADO da pernoita — a página da família mostra "Aterrou ✓" o dia todo.
  const [sendCard, setSendCard] = useState(null);
  const openShareLeg = (lg, date, landed = false) => {
    if (!lg || !date) return;
    select();
    const dep = String(lg.dep || '').toUpperCase(), arr = String(lg.arr || '').toUpperCase();
    const fno = String(lg.flightNo || lg.flight || '').toUpperCase().replace(/\s+/g, '');
    const toMin2 = (z) => { const m = /^(\d{1,2}):(\d{2})$/.exec(z || ''); return m ? (+m[1] * 60 + +m[2]) : null; };
    const om = toMin2(legZulu(date, lg, 'off')), nm = toMin2(legZulu(date, lg, 'on'));
    const blockMin = (om != null && nm != null) ? ((nm - om + 1440) % 1440) : null;
    // Pílula de estado no cartão — SÓ do que o Início sabe de certeza.
    const nowM = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
    const offM = toMin2(lg.off);
    // Voo de outro dia (véspera): sem pílula — a do cartão diria "Hoje às" (o cartão já leva a data).
    const status = landed ? { kind: 'landed' } : date > todayISO ? null : (offM != null && nowM < offM) ? { kind: 'today' } : { kind: 'air' };
    setSendCard({ dep, arr, depTime: lg.off || '', arrTime: lg.on || '', flightNo: fno, date, sectors: 1, status,
      dateLabel: new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      duration: blockMin ? `${Math.floor(blockMin / 60)}H${String(blockMin % 60).padStart(2, '0')}` : '',
      legs: [{ flight: fno, dep, arr }] });
  };
  const shareLegs = sectorLegs.filter((lg) => lg && (lg.flightNo || lg.flight));
  const shareNext = () => {
    if (!flight) return;
    openShareLeg(shareLegs.length ? shareLegs[shareLegs.length - 1] : (flightNo ? { flightNo, dep: flight.depAirport, arr: flight.arrAirport, off: flight.depTime, on: flight.arrTime } : null), flight.dateISO);
  };
  const closeLegs = (todayEnded && Array.isArray(todayEnded.legs)) ? todayEnded.legs.filter((lg) => lg && (lg.flightNo || lg.flight)) : [];
  const shareClose = () => openShareLeg(closeLegs.length ? closeLegs[closeLegs.length - 1] : null, todayISO, true);
  const shareable = !!(flight && !isNonFlight && !flight.demo && (shareLegs.length || flightNo));
  const shareableClose = homeState === 'pernoita' && closeLegs.length > 0;

  // ── AUDITORIA DO MÊS (design/auditoria-mes.html v2): o radar corre SÓ no estado fecho.
  const [auditOpen, setAuditOpen] = useState(false);
  const audit = useMemo(() => (homeState === 'fecho' && ae && crewCategory
    ? monthAudit(duties || {}, { ym: todayISO.slice(0, 7), ae, cat: crewCategory, fleet: crewFleet, base, rosterLog: rosterLog || [], events: aeEvents || [], isPilot })
    : null), [homeState, duties, ae, crewCategory, crewFleet, base, rosterLog, aeEvents, isPilot, todayISO]);

  // Configuração: o "porquê" completo (privacidade + a dica do portal) vive ATRÁS de "Saber mais".
  const setupWhyItem = homeState === 'setup' ? {
    id: 'setupWhy', q: l('Privacidade', 'Privacy'),
    answer: l('O calendário é lido no teu telemóvel.', 'Your calendar is read on your phone.'),
    suggestion: (/easyjet|ezy/i.test([company && company.slug, company && company.name].filter(Boolean).join(' '))
      ? l('A app lê APENAS o calendário que escolheres (só leitura — nunca escreve nele) e os cálculos FTL/AE acontecem no dispositivo. A escala fica guardada na tua conta, para não a perderes se mudares de telemóvel. Dica: no eCrew, ativa o sync da escala para o calendário do telemóvel — com ele ligado, a escala chega sempre atualizada.',
          'The app reads ONLY the calendar you choose (read-only — it never writes) and FTL/CLA maths happen on-device. Your roster is kept in your account, so you do not lose it if you change phones. Tip: in eCrew, enable roster sync to your phone calendar — with it on, your roster always arrives fresh.')
      : l('A app lê APENAS o calendário que escolheres (só leitura — nunca escreve nele) e os cálculos FTL/AE acontecem no dispositivo. A escala fica guardada na tua conta, para não a perderes se mudares de telemóvel. Dica: no portal da companhia, ativa a exportação da escala para o calendário do telemóvel.',
          'The app reads ONLY the calendar you choose (read-only — it never writes) and FTL/CLA maths happen on-device. Your roster is kept in your account, so you do not lose it if you change phones. Tip: in your crew portal, enable roster export to your phone calendar.')),
  } : null;

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // O INÍCIO 3.0 — os FACTOS. Daqui para cima tudo vem dos motores; aqui juntam-se em objetos simples e o
  // data/homeCards.js (puro, golden test:homecards) decide o topo e os cartões. Nenhum número nasce aqui.
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // A hora-limite de calços (o "PSV até"): o veredicto de hoje quando o há; senão report + PSV máximo. Igual ao v6.
  const psvLatest = (() => {
    const r = legalIt && legalIt.raw && legalIt.raw.psv;
    // Sem report deste serviço, o "latest" do dia seria de OUTRO serviço — não se mostra.
    if (isToday && flight && flight.report && r && r.latest) return `${r.latest}${r.latestNextDay ? ' (+1)' : ''}`;
    return (ndDuty && flight && flight.report && ndPsvMax) ? hmAdd(flight.report, hmToMin(ndPsvMax)) : null;
  })();
  // ── A LINHA DO DIA DE SERVIÇO (em voo): report → limite do PSV (o MESMO "PSV até" de cima), setores como
  // troços, o "agora". data/dutyLine.js (golden test:dutyline). Dá a posição do "agora" e a margem à aterragem.
  const dl = (() => {
    if (!(isToday && flight && flight.report && reportMs != null && psvLatest)) return null;
    const m = /^(\d{1,2}):(\d{2})/.exec(psvLatest); if (!m) return null;
    const lim = new Date(`${flight.dateISO}T00:00:00`); lim.setHours(+m[1], +m[2], 0, 0);
    if (/\(\+1\)/.test(psvLatest) || lim.getTime() <= reportMs) lim.setDate(lim.getDate() + 1);
    const anchorHm = flight.report || flight.depTime;
    const legsMs = sectorLegs.length
      ? sectorLegs.map((lg, i) => (activeSector && i === activeSector.idx && depMs != null && arrMs != null)
        ? { startMs: depMs, endMs: arrMs }   // o setor ativo: com o voo ao vivo (atrasos), como o número grande
        : { startMs: legInstant(flight.dateISO, lg.off, anchorHm)?.getTime() ?? null, endMs: legInstant(flight.dateISO, lg.on, anchorHm)?.getTime() ?? null })
      : (depMs != null && arrMs != null ? [{ startMs: depMs, endMs: arrMs }] : []);
    return dutyLine({ reportMs, limitMs: lim.getTime(), sectors: legsMs, now });
  })();

  const hasDay = (iso) => !!(iso && duties[iso] && !duties[iso].deleted);
  const stationsOf =(route) => String(route || '').split(/[^A-Za-z]+/).filter(Boolean).map((x) => x.toUpperCase());
  const legsOf = (svc) => (Array.isArray(svc && svc.legs) ? svc.legs.filter((lg) => lg && (lg.off || lg.on || lg.dep || lg.arr)) : []);
  // Um serviço em factos simples. O fim de serviço = o sign-off registado ou os calços + o pós-voo (ORO.FTL.105: o serviço
  // acaba no sign-off); num serviço em terra, o fim do bloco.
  const brief = (iso, svc) => {
    if (!svc || svc.deleted) return null;
    const kind = svc.kind || 'flight';
    const fl = kind === 'flight' || kind === 'positioning';
    const lg = legsOf(svc);
    const st = stationsOf(svc.route);
    const signOff = /^\d{1,2}:\d{2}$/.test(String(svc.signOff || '')) ? svc.signOff : null;
    return { iso, kind, kindLabel: t('duties.kind.' + kind, lang), stations: st,
      sectors: svc.sectors || lg.length || (st.length > 1 ? st.length - 1 : null),
      report: svc.report_time || null, dep: (lg[0] && lg[0].off) || svc.block_off || null,
      lastArr: (lg.length && lg[lg.length - 1].on) || svc.block_on || null,
      end: signOff || (fl ? (svc.block_on ? hmAdd(svc.block_on, postFlightMin || 0) : null) : (svc.block_on || null)),
      depStation: st[0] || null, hasReg: hasDay(iso) };
  };
  // O primeiro serviço que ainda não acabou a partir do dia `fromISO` (o seu instante de início vem junto, para a folga).
  const nextBrief = (fromISO) => {
    for (const iso of Object.keys(duties).filter((k) => k >= fromISO).sort()) {
      const mf = dayFlights(iso, duties[iso]).find((f) => f.endDate.getTime() >= now);
      if (mf) { const b = brief(iso, mf.svc); if (b) return { ...b, startMs: mf.reportDate ? +mf.reportDate : +mf.startDate }; }
    }
    return null;
  };
  const nsPayOn = (iso) => (ae && ae.nightStop && crewCategory && !ae.PER_DIEM_BY_DAY ? ae.nightStop(crewCategory, aeIndex(ae, iso), iso) : null);   // TAP: a noite depois de um dia de voo não paga estadia (bloco 5)
  // O serviço de que o topo fala (o "flight" do Início): do registo quando existe; senão do calendário.
  const heroF = (() => {
    if (!flight) return null;
    const svc = flight.svc || null;
    const b = svc ? brief(flight.dateISO, svc) : {
      iso: flight.dateISO, kind: flight.kind || 'flight', kindLabel, stations: Array.isArray(flight.stations) ? flight.stations.map((x) => String(x).toUpperCase()) : [],
      sectors: flight.sectors || null, report: flight.report || null, dep: flight.depTime || null,
      lastArr: flight.arrTime && flight.arrTime !== flight.report ? flight.arrTime : null,
      end: flight.arrTime && flight.arrTime !== flight.report ? ((flight.kind || 'flight') === 'flight' ? hmAdd(flight.arrTime, postFlightMin || 0) : flight.arrTime) : null,
      depStation: flight.depAirport || null, hasReg: false };
    if (!b) return null;
    const latest = psvLatest ? psvLatest.replace(/\s*\(\+1\)/, '') : null;
    const legal = (() => {
      if (!isToday || !legalIt || !legalIt.raw) return null;
      const k = legalIt.raw.kind;
      if (k === 'psvUncertain' || k === 'nightUncertain') return { status: 'uncertain', missing: k === 'psvUncertain' && (legalIt.raw.unknowns || []).length ? unknownsText(legalIt.raw.unknowns, lang) : null };
      return legalIt.status === 'bad' ? { status: 'bad' } : legalIt.status === 'ok' ? { status: 'ok' } : null;
    })();
    const pay = (svc && ae && crewCategory && b.kind !== 'flight') ? (() => {
      try { const o = serviceMoney(ae, crewCategory, svc, { date: flight.dateISO, fleet: crewFleet, baseAt: homeBaseAt, duties }).other; return o && o.eur > 0 ? { eur: o.eur, lbl: o.lbl ? (o.lbl[lang] || o.lbl.pt) : null } : null; } catch { return null; }
    })() : null;
    const restAfterMin = (svc && flight.nightStop) ? (() => {
      try { const r = restUntilAfter(duties || {}, flight.dateISO, { inBase: false, baseAt: homeBaseAt, postFlightMin: postFlightMin || 0, isPilot }); return r ? r.requiredMin : null; } catch { return null; }
    })() : null;
    return { ...b,
      flightNo: flightNo ? String(flightNo).toUpperCase() : (flight.flightNo ? String(flight.flightNo).toUpperCase() : null),
      depStation: b.depStation || (legDep || null),
      station: /^[A-Z]{3}$/.test(String(flight.depAirport || '')) ? String(flight.depAirport) : (base ? String(base).toUpperCase() : null),
      psv: { max: ndPsvMax, hi: ndPsvHi, plan: ndPsvActual, running: psvRunning, latest,
        latestNextDay: !!(psvLatest && (/\(\+1\)/.test(psvLatest) || (flight.report && hmToMin(latest) < hmToMin(flight.report)))) },
      legal, split: !!(svc && ((svc.splitBreakH || 0) >= 3 || splitFromLegs(svc.legs, { date: flight.dateISO || null, report: svc.report_time || null }).splitBreakH > 0)),
      perDiem: dayPerDiem, pay,
      nightStop: flight.nightStop && nsHotelStation ? { station: nsHotelStation, hotel: nsHotel ? nsHotel.name : null, pay: nsPayOn(flight.dateISO) } : null,
      // A hora do report em UTC, pelo fuso do aeroporto de partida (data/zulu.js; sem aeroporto conhecido, o fuso do telemóvel) — como no v6.
      reportZ: flight.report ? (airportZulu(flight.dateISO, flight.report, flight.depAirport) || toZulu(flight.dateISO, flight.report) || null) : null,
      restAfterMin, shareable, hasReg: !flight.demo && hasDay(flight.dateISO) };
  })();
  // O dia de voo de hoje (setor ativo, a linha do dia de serviço, o standby).
  const endDtHero = heroF && heroF.end && flight ? legInstant(flight.dateISO, heroF.end, flight.report || flight.depTime) : null;
  const endMsHero = endDtHero ? endDtHero.getTime() : null;
  const liveF = {
    legIdx: activeSector ? activeSector.idx : 0, legTotal: activeSector ? activeSector.total : (sectorLegs.length || 1),
    legDep, legArr, depHm, arrHm, minsToDep: minsTo(depMs), minsToArr: minsTo(arrMs), cdMin,
    remainingMin: minsTo(endMsHero), elapsedMin: reportMs != null ? Math.max(0, Math.round((now - reportMs) / 60000)) : null,
    nowPct: dl ? dl.nowPct : null, marginMin: dl ? dl.marginMin : null,
    status: flightStatus ? (((fsDep && fsDep.delayMin) || 0) >= 15 ? 'late' : 'on') : null, delayMin: (fsDep && fsDep.delayMin) || 0,
    psvUntil,
    // A partida do setor seguinte ao ativo (o "próximo setor às 19:50" do cartão em voo); null no último setor.
    nextDep: activeSector && activeSector.idx < sectorLegs.length - 1 ? (sectorLegs[activeSector.idx + 1].off || null) : null,
  };
  // A disrupção: a hora nova, a antiga, o atraso, os limites com o atraso (liveFdpVerdict, ORO.FTL.205).
  const disF = (homeState === 'disrupcao' && flight) ? (() => {
    let x;
    if (fsCancelled) x = { mode: 'cancelled', oldHm: hm(fsDep && fsDep.scheduled) || depPlan };
    else if (fsDiverted) x = { mode: 'diverted', newHm: hm(fsArr && (fsArr.estimated || fsArr.actual)) };
    else if (fsDev) { const arrSide = !!(wDelay && wDelay.which === 'arr'); const leg = arrSide ? fsArr : fsDep; x = { mode: 'delay', side: arrSide ? 'arr' : 'dep', newHm: hm(leg && (leg.estimated || leg.actual)) || hm(leg && leg.scheduled), oldHm: hm(leg && leg.scheduled), delayMin }; }
    else { const sched = hm(fsDep && fsDep.scheduled) || depPlan; x = { mode: 'projection', newHm: hmAdd(sched, delayMin) || sched, oldHm: sched, delayMin }; }
    const why = inboundLate && inboundInfo
      ? l(`o avião ainda vem a caminho${inbound && inbound.flightIata ? ` (${inbound.flightIata})` : ''} · chega ~${inboundInfo.etaZ}Z`, `your aircraft is still inbound${inbound && inbound.flightIata ? ` (${inbound.flightIata})` : ''} · arrives ~${inboundInfo.etaZ}Z`)
      : [flightStatus && flightStatus.flightIata, flightStatus && flightStatus.aircraft && flightStatus.aircraft.reg].filter(Boolean).join(' · ') || null;
    const lastArr = (liveVerdict && flight.report) ? hmAdd(flight.report, hmToMin(liveVerdict.realStr)) : (heroF && heroF.lastArr && delayMin ? hmAdd(heroF.lastArr, delayMin) : null);
    return { ...x, why, commander: isCommander, lastArr, end: lastArr ? hmAdd(lastArr, postFlightMin || 0) : null,
      verdict: liveVerdict && isToday ? { verdict: liveVerdict.verdict, realStr: liveVerdict.realStr, maxStr: liveVerdict.maxStr, projected: liveVerdict.projected } : null };
  })() : null;
  // O repouso depois do dia de hoje (a MESMA regra da pílula do repouso: restUntilAfter, ORO.FTL.235).
  const restF = (homeState === 'posvoo' || homeState === 'pernoita') ? (() => {
    const where = { hotel: closeHotel ? closeHotel.name : null, pay: homeState === 'pernoita' ? nsPay : null, station: closeNsStation ? String(closeNsStation).toUpperCase() : null };
    if (!restUntil) return where;
    const e = new Date(restUntil.endMs);
    const span = Math.max(1, restUntil.untilMs - restUntil.endMs);
    return { ...where, signOff: `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`, until: restUntil.hm, untilIso: restUntil.untilIso,
      minMin: Math.round(span / 60000), pct: Math.max(0, Math.min(100, ((now - restUntil.endMs) / span) * 100)) };
  })() : null;
  // O documento a 7 dias ou menos: toma o topo na folga (esboço, estado "Documento a caducar").
  const docSoon = (() => {
    const vi = todayItems.find((it) => it.id === 'validades');
    const it0 = vi && vi.raw && Array.isArray(vi.raw.items) ? vi.raw.items[0] : null;
    if (!it0 || !it0.st || it0.st.band !== 'expiring' || it0.st.days == null || it0.st.days > 7) return null;
    const after = Object.keys(duties).filter((iso) => iso > it0.expiry && hasDay(iso)).length;
    return { name: validityLabel(it0.type, isPilot, lang, it0.program || null), days: it0.st.days, expiryIso: it0.expiry, after };
  })();
  // O mês: o MESMO monthStats dos Números; incerto → as duas pontas e porquê (A-198: os acordos dão valores brutos).
  const UNC_WHY = {
    admission: l('Falta o dia em que entraste na companhia.', 'The day you joined is missing.'),
    tapKpi: l('Os 2 % de 2026 dependem do resultado da TAP em 2025.', 'The extra 2% for 2026 depends on TAP’s 2025 result.'),
    tapSick: l('Nos dias de baixa a TAP paga o líquido, e a app não calcula líquidos.', 'On sick days TAP pays the net amount, and the app does not compute net pay.'),
    tapRaise: l('A atualização da base não está publicada no BTE.', 'The base pay update is not published in the BTE.'),
  };
  const monthF = monthAe ? (() => {
    const ext = (monthAe.extras || 0) + (monthAe.events || 0) + (monthAe.cash || 0);
    const nN = monthNightStops;
    return { name: monthCap, total: monthMoney, base: monthAe.base || 0, rest: monthSplitNow ? monthSplitNow.rest : null,
      unc: monthUnc ? { min: monthUnc.min, max: monthUnc.max, why: UNC_WHY[monthUnc.reason] || l('Faltam as datas de atividade do teu contrato.', 'Your contract’s activity dates are missing.'), fix: monthUnc.reason === 'admission' ? 'profile' : null } : null,
      rows: homeState !== 'fecho' ? [] : [
        { k: l('Base', 'Base'), eur: monthAe.base || 0 },
        monthAe.perDiem ? { k: 'Per-diem', eur: monthAe.perDiem } : null,
        monthAe.nightStops ? { k: nN ? l(`Pernoitas · ${nN} ${nN === 1 ? 'noite' : 'noites'}`, `Night stops · ${nN}`) : l('Pernoitas', 'Night stops'), eur: monthAe.nightStops } : null,
        monthAe.positioning ? { k: l('Posicionamento', 'Positioning'), eur: monthAe.positioning, max: monthAe.positioningMax || null } : null,
        ...(monthAe.annualItems || []).map((it) => ({ k: annualLabel(it, lang), eur: it.eur, max: it.max || null })),
        ext ? { k: 'Extras', eur: ext, open: extrasItem ? { to: 'item', id: 'extras' } : null } : null,
      ].filter(Boolean) };
  })() : null;
  const allOk = !qAlerts.length && !qChips.some((it) => it.status === 'warn');

  // ── OS AVISOS (laranja) — a fila de prioridades (living-interface §2); `first` = sobre ESTE serviço (vai antes do cartão
  // do momento), senão vai no fim. O homeCards mostra no máximo 2 e, com um aviso, o 2.º cartão passa a linha fina.
  const W = [];
  const pushW = (w) => { if (w && w.title && !W.some((x) => x.id === w.id)) W.push(w); };
  if (calErr) pushW({ id: 'cal', title: l('Calendário', 'Calendar'), sub: l('Não consegui ler. Puxa para atualizar ou vê a permissão nas Definições.', 'Couldn’t read it. Pull to refresh or check the permission in Settings.') });
  if (bandAlerts.length) pushW({ id: 'ftl', first: true, title: bandAlerts[0].q, sub: bandAlerts[0].answer, open: { to: 'item', id: bandAlerts[0].id } });
  else if (stateLevel === 'over') pushW({ id: 'ftl', first: true, title: l('Limites', 'Limits'), sub: `${t('home.statusOver', lang)}${stateReason ? ` · ${stateReason}` : ''}`, open: { to: 'stats' } });
  if (docAlert) pushW({ id: 'doc', title: l('Documentos', 'Documents'), sub: docAlert.answer, open: { to: 'item', id: 'validades' } });
  // POSSÍVEL RDP (só cabine, só com o acordo que o tem — easyJet × SNPVAC Cl. 67.ª): candidato, nunca "vais receber".
  if (homeState === 'disrupcao' && ae && typeof ae.rdp === 'function' && crewCategory) {
    const rdpC = liveRdp({ isPilot, kind: flight && flight.kind, fromStandby: !!(flight && flight.svc && flight.svc.special && flight.svc.special.preStandby),
      arrDelayMin: trackingLast && fsArr && (fsArr.estimated || fsArr.actual) ? ndArrDelay : null, sectorsChanged: fsDiverted || fsCancelled });
    if (rdpC) {
      const v = ae.rdp(crewCategory, todayISO.slice(0, 7));
      const why = rdpC.reason === 'sectors' ? l('Setores perdidos ou ganhos no dia', 'Sectors lost or gained on the day')
        : l(`Fim do serviço ${durTxt(Math.abs(rdpC.dEndMin))} ${rdpC.dEndMin > 0 ? 'depois' : 'antes'} do programado`, `Duty ends ${durTxt(Math.abs(rdpC.dEndMin))} ${rdpC.dEndMin > 0 ? 'later' : 'earlier'} than planned`);
      pushW({ id: 'rdp', first: true, title: l('Possível RDP · Cl. 67.ª', 'Possible RDP · Cl. 67'), sub: `${why} — ${l('reclama no RDF; a base aprova', 'claim it on the RDF; the base approves')}`, value: v ? `${l('até', 'up to')} ${eur(v)}` : null });
    }
  }
  if (syncBehind) pushW({ id: 'sync', first: true, title: l('O registo', 'Your record'), sub: l('Ainda tem o planeado. Sincroniza a escala eCrew pelo calendário.', 'Still shows the plan. Sync your eCrew roster via the calendar.') });
  if (airportDis) pushW({ id: 'apt', first: true, title: `${l('Aeroporto', 'Airport')} ${(fsDep && fsDep.iata) || ''}`.trim(),
    sub: `${airportDis.delayedPct}% ${airportDis.side === 'dep' ? l('das partidas atrasadas', 'of departures delayed') : l('das chegadas atrasadas', 'of arrivals delayed')}${airportDis.avgDelayMin ? ` · ${l('média', 'avg')} ${airportDis.avgDelayMin} min` : ''}` });
  if (rosterChanges && rosterChanges.counts && rosterChanges.counts.total) {
    const n = rosterChanges.counts.total;
    pushW({ id: 'roster', title: l('A escala mudou', 'Roster changed'), sub: l(`${n} ${n === 1 ? 'alteração' : 'alterações'} por rever · nada entra sem ti`, `${n} change${n === 1 ? '' : 's'} to review · nothing lands without you`), open: { to: 'review' } });
  }
  const valWarn = qChips.find((it) => it.id === 'validades' && it.status === 'warn');
  const docTakesTop = homeState === 'folga' && !!docSoon;
  if (valWarn && !docTakesTop && !['ferias', 'doenca', 'setup'].includes(homeState)) pushW({ id: 'docw', title: l('Documentos', 'Documents'), sub: valWarn.answer, open: { to: 'item', id: 'validades' } });
  // FÉRIAS POR GOZAR (2026-11-03): só na folga, de novembro em diante, se ainda sobram dias (gozam-se no ano civil, CT art. 240.º).
  if (homeState === 'folga' && Number(todayISO.slice(5, 7)) >= 11 && ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays')) {
    const quota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
    const left = Math.max(0, quota - yearCount(aeEvents || [], todayISO.slice(0, 4), 'vacDays', duties));
    const toYearEnd = Math.round((new Date(`${todayISO.slice(0, 4)}-12-31T12:00:00`) - new Date(`${todayISO}T12:00:00`)) / 86400000);
    if (left > 0) pushW({ id: 'vac', title: `${l('Férias', 'Leave')} ${todayISO.slice(0, 4)}`, open: { to: 'stats' },
      sub: l(`${left === 1 ? 'fica 1' : `ficam ${left}`} de ${quota} dias · o ano acaba daqui a ${toYearEnd} dias`, `${left} of ${quota} days left · the year ends in ${toYearEnd} days`) });
  }
  if (homeState === 'fecho') {
    if (audit && audit.count > 0) pushW({ id: 'audit', title: l('Auditoria do mês', 'Month audit'), open: { to: 'audit' },
      sub: `${audit.count} ${audit.count === 1 ? l('item por confirmar', 'item to confirm') : l('itens por confirmar', 'items to confirm')}${audit.totalEur > 0 ? ` · ≈ ${eur(audit.totalEur)} ${l('em causa', 'at stake')}` : ''}` });
    if (monthAe && monthAe.missing) pushW({ id: 'miss', title: 'Per-diem', sub: `${monthAe.missing} ${l('voo(s) sem rota — per-diem incompleto', 'flight(s) without a route — per-diem incomplete')}` });
  }

  // ── A ENTRADA do homeCards ──
  const nextF = ['hoje', 'disrupcao'].includes(homeState) ? (heroF ? nextBrief(isoAdd(heroF.iso, 1)) : null)
    : ['posvoo', 'pernoita'].includes(homeState) ? nextBrief(isoAdd(todayISO, 1))
    : ['folga', 'ferias', 'doenca'].includes(homeState) ? (demoOn && flight ? { iso: flight.dateISO, kind: 'flight', stations: (flight.stations || []).map((x) => String(x).toUpperCase()), sectors: flight.sectors || null, report: flight.report, end: flight.arrTime || null, hasReg: false, startMs: flight.reportDate ? +flight.reportDate : +flight.startDate } : nextBrief(todayISO))
    : null;
  const H = {
    lang, state: homeState, todayISO, phase,
    hero: ['hoje', 'disrupcao', 'vespera'].includes(homeState) || (homeState === 'pernoita' && flight && flight.report) ? heroF : null,
    live: liveF, next: nextF,
    untilMin: nextF && nextF.startMs != null ? Math.max(0, Math.floor((nextF.startMs - now) / 60000)) : null,
    rest: restF,
    closed: homeState === 'posvoo' && todayEnded ? { fdp: closeD && closeD.fdp ? closeD.fdp.actualFdpStr : null, over: !!(closeD && closeD.fdp && closeD.fdp.over),
      multi: closeMulti ? 1 + todayEnded.extra.length : null, signOffDone: !!todayEnded.signOff, gainToday: pdToday, kindLabel: todayEnded.kind ? t('duties.kind.' + todayEnded.kind, lang) : null } : null,
    week: hasLimitData && d7 && d7.limit ? { done: d7.done, limit: d7.limit } : null,
    wxTmw: homeState === 'pernoita' && wxHere && wxHere.tmwSym ? { v: wxHere.tmwMax != null ? `${Math.round(wxHere.tmwMax)}°` : null, label: (wxSymbol(wxHere.tmwSym, lang).label || '').toLowerCase() } : null,
    month: monthF, monthName: monthCap, fechoDays: fechoDaysLeft,
    dis: disF,
    vac: vacInfo ? { left: vacInfo.left, quota: vacInfo.quota, retIso: vacInfo.retISO, fromIso: vacInfo.fromIso, toIso: vacInfo.toIso } : null,
    sick: homeState === 'doenca' ? { day: sickDay, first3: sickFirst3, payText: sickState ? (sickDay <= 3 ? sickState.first : sickState.rest)[lang === 'en' ? 'en' : 'pt'] : null } : null,
    doc: docSoon, empty: { rosterOk: allOk && !calErr, lastRead: lastReadMs ? (() => { const d = new Date(lastReadMs); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })() : null },
    wake: wakeAt && wakeMs > now ? { hm: wakeAt } : null, restOk: restVoice.restOk,
    canExtra: !!(openExtra && ae && Array.isArray(ae.EXTRA_KINDS)), longHaul, shareClose: shareableClose,
    warns: W,
  };
  const out = homeCards(H);
  const giant = fitGiant(out.top, winW - SPACE.lgPlus * 2);

  // ── O QUE CADA TOQUE FAZ ──
  const goStats = () => { select(); navigation.navigate('Estatísticas'); };
  const wakeRun = async () => {
    select();
    const res = await scheduleWakeUp(wakeMs != null ? new Date(wakeMs) : null, { iso: flight && flight.dateISO, report: flight && flight.report, lang });
    if (!notify) return;
    // Uma notificação NÃO é um despertador (em silêncio ou no modo Dormir pode não tocar) — di-lo sempre.
    // O alarme a sério (AlarmKit, iOS 26) fica para o dev build (docs/dev-build.md).
    if (res === 'ok') notify(l(`Lembrete às ${wakeAt}`, `Reminder at ${wakeAt}`), l(`Report às ${flight.report}. Não substitui o despertador.`, `Report at ${flight.report}. It doesn’t replace your alarm.`), 'bell');
    else if (res === 'expo-go') notify(l('Os lembretes chegam com a app instalada', 'Reminders come with the installed app'), l('A Expo Go não tem notificações. Põe o despertador do iPhone.', 'Expo Go has no notifications. Set the iPhone alarm.'), 'alert');
    else if (res === 'denied') notify(l('Sem autorização para notificações', 'Notifications not allowed'), l('Ativa-as nas Definições do iPhone.', 'Turn them on in the iPhone Settings.'), 'alert');
    else if (res === 'past') notify(l('Essa hora já passou', 'That time has passed'), null, 'alert');
    else notify(l('Não consegui marcar o lembrete', 'Couldn’t set the reminder'), l('Põe o despertador do iPhone.', 'Set the iPhone alarm.'), 'alert');
  };
  // A pílula de contorno abre ESSE dia na Escala (salta para o mês, escolhe o dia e acende-o).
  const openPill2 = (iso) => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { flashDuty: iso, flashTs: Date.now() } }); };
  const onOpen = (o) => {
    if (!o) return;
    switch (o.to) {
      case 'day': openDayDetail(o.iso); break;
      case 'signoff': openDayDetail(o.iso || todayISO, !(todayEnded && todayEnded.signOff)); break;
      case 'stats': goStats(); break;
      case 'review': openReview(); break;
      case 'audit': select(); setAuditOpen(true); break;
      case 'extra': select(); if (openExtra) openExtra(); break;
      case 'item': { const it = o.id === 'extras' ? extrasItem : todayItems.find((x) => x.id === o.id); if (it) openItem(it); else goStats(); break; }
      case 'hotel': select(); setHotelOpen(true); break;
      case 'validades': select(); navigation.navigate('Perfil', { screen: 'Validades', initial: false }); break;
      case 'sync': select(); syncFlight(); break;
      case 'pdf': select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { pdf: Date.now() } }); break;
      case 'connect': requestAccess(); break;
      case 'demo': select(); setCalFlight(DEMO_FLIGHT); break;
      case 'share': shareNext(); break;
      case 'shareClose': shareClose(); break;
      case 'wake': wakeRun(); break;
      case 'privacy': if (setupWhyItem) openItem(setupWhyItem); break;
      case 'profile': select(); navigation.navigate('Perfil'); break;
      default: break;
    }
  };

  // Palco do Início ocupado? (folha/cartão) — a dica do ＋ não entra por cima (TipKit).
  useEffect(() => { homeBusyRef.current = !!(detailItem || sendCard); }, [detailItem, sendCard]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']} onTouchStart={plusTip ? dismissPlusTip : undefined}>
      {/* A barra de estado do iPhone: escura sobre o fundo claro; clara à noite. Só com o ecrã à vista. */}
      {isFocused ? <StatusBar style={night ? 'light' : 'dark'} /> : null}
      {loadingFlight ? <HomeSkeleton /> : (
        <HomeTop top={out.top} C={C} size={giant.size} onPill2={openPill2} l={l} rightW={demoOn ? pillWidth(l('Exemplo · sair', 'Example · exit'), true) - SPACE.sm : 44}
          right={demoOn ? (
            <TouchableOpacity style={[s.demo, { borderColor: C.ink }]} onPress={exitDemo} hitSlop={{ top: 3, bottom: 3 }}
              accessibilityRole="button" accessibilityLabel={l('Isto é um exemplo. Sair do exemplo', 'This is an example. Exit the example')}>
              <View style={[s.demoDot, { backgroundColor: BRAND.signal }]} />
              <Text style={[TXT3.pill, { color: C.ink }]} allowFontScaling={false}>{l('Exemplo · sair', 'Example · exit')}</Text>
            </TouchableOpacity>
          ) : <NotificationsBell variant="round" night={night} />} />
      )}
      {/* A FOLHA: o cartão do momento e o do que vem a seguir. Num iPhone pequeno desliza; o topo e a barra ficam. */}
      <View style={[s.sheet, { backgroundColor: C.sheet }]}>
        <ScrollView ref={homeScrollRef} style={s.sheetScroll} contentContainerStyle={s.sheetIn} showsVerticalScrollIndicator={false} alwaysBounceVertical
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.caption} colors={[C.caption]}
            onRefresh={async () => {
              setRefreshing(true); const t0 = Date.now();
              try { await syncFlight(); } catch { /* ignora */ }
              setFsTick((n) => n + 1);   // re-busca o estado do voo ao vivo
              const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
              setRefreshing(false);
            }} />}>
          {loadingFlight ? <SheetSkeleton /> : <HomeCards cards={out.cards} C={C} onOpen={onOpen} l={l} />}
          {!loadingFlight && out.caption ? <Text style={[TXT.caption, s.caption, { color: C.caption }]}>{out.caption}</Text> : null}
        </ScrollView>
      </View>

      {/* Hotel da pernoita — registar/editar (estação derivada da escala). */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={closeNsStation || nsHotelStation} />

      {/* Folha "porquê" — abre dos avisos e dos cartões. */}
      <QuestionDetailSheet item={detailItem} lang={lang}
        onClose={() => setDetailItem(null)}
        onNav={(dest) => {
          setDetailItem(null);
          if (dest && dest.root) navigation.navigate(dest.root, dest.screen ? { screen: dest.screen } : undefined);
        }} />

      {/* Partilhar um voo — o MESMO cartão editorial da família (sem pessoa). */}
      <FlightShareCard visible={!!sendCard} onClose={() => setSendCard(null)}
        dep={sendCard ? sendCard.dep : undefined} arr={sendCard ? sendCard.arr : undefined}
        depTime={sendCard ? sendCard.depTime : undefined} arrTime={sendCard ? sendCard.arrTime : undefined}
        flightNo={sendCard ? sendCard.flightNo : undefined} dateLabel={sendCard ? sendCard.dateLabel : undefined}
        sectors={sendCard ? sendCard.sectors : undefined} duration={sendCard ? sendCard.duration : undefined}
        date={sendCard ? sendCard.date : undefined} legs={sendCard ? sendCard.legs : undefined}
        status={sendCard ? sendCard.status : undefined} />

      {/* Dica do ＋ (1.ª visita pós-folha) — flutua acima da tab bar, seta ao ＋. */}
      <Tip visible={plusTip} arrow="down" lang={lang} style={{ bottom: SPACE.md }}
        bold={l('Cria aqui.', 'Create here.')}
        tail={l('Serviços, simulações e eventos — tudo nasce no ＋.', 'Duties, simulations and events — all born in the ＋.')}
        onDismiss={dismissPlusTip} />

      {/* Folha de boas-vindas — 1× na vida, só nascida do funil (flag 'pending'). */}
      <WelcomeSheet visible={welcomeOpen} onDone={closeWelcome} lang={lang} />

      {/* Auditoria do mês — a folha do radar (estado fecho). */}
      <AuditSheet visible={auditOpen} onClose={() => setAuditOpen(false)} audit={audit} monthName={monthName}
        lang={lang} provaCtx={{ companySlug: company && company.slug, companyName: company && company.name, isPilot, lang }}
        onOpenDay={(iso) => openDayDetail(iso)} onRegister={() => { if (openExtra) openExtra(); }} />
    </SafeAreaView>
  );
}

// Esqueleto do 1.º carregamento — a mesma forma do topo (pílulas · legenda · número em duas linhas).
function HomeSkeleton() {
  return (
    <View style={s.skTop}>
      <View style={s.skRow}><Skeleton w={96} h={38} r={RADIUS.pill} /><Skeleton w={88} h={38} r={RADIUS.pill} /></View>
      <Skeleton w={150} h={16} r={RADIUS.xs} />
      <Skeleton w={210} h={140} r={RADIUS.lg} />
    </View>
  );
}
function SheetSkeleton() {
  return (
    <View style={s.skSheet}>
      <Skeleton w={'100%'} h={170} r={RADIUS.xxl} />
      <Skeleton w={'100%'} h={64} r={RADIUS.xxl} />
    </View>
  );
}

// Medidas do esboço design/inicio-cartoes.html (390 × 844): a folha sobe 16 por cima do topo, raio 32, 12 de margem e 8
// entre cartões; o resto das medidas vive em components/HomeCards.js.
const s = StyleSheet.create({
  safe: { flex: 1 },
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  sheetScroll: { flex: 1 },
  sheetIn: { padding: SPACE.md, gap: SPACE.sm },
  caption: { paddingHorizontal: SPACE.xs, paddingTop: SPACE.xs },
  demo: { height: 38, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  demoDot: { width: 7, height: 7, borderRadius: RADIUS.pill },
  skTop: { paddingHorizontal: SPACE.lgPlus, paddingTop: SPACE.sm, paddingBottom: SPACE.xxl, gap: SPACE.lg },
  skRow: { flexDirection: 'row', gap: SPACE.sm },
  skSheet: { gap: SPACE.sm },
});
