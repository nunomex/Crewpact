import React, { useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, AppState, RefreshControl, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { PELE, PELE_NIGHT, PELE_FONT } from '../data/constants';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import NotificationsBell from '../components/NotificationsBell';
import FlightShareCard from '../components/FlightShareCard';
import { getUpcomingFlight } from '../data/calendar';
import { catLabel } from '../data/extras';
import { routeDistancesNM } from '../data/perdiem';
import { isLongHaulCompany } from '../data/capabilities';
import { computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty, liveFdpVerdict } from '../ftl';
import Skeleton from '../components/Skeleton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, toZulu } from '../data/appContext';
import { airportZulu, legZulu } from '../data/zulu';
import QuestionDetailSheet from '../components/QuestionDetailSheet';
import { buildTodayItems } from './hojeItems';
import { monthStats } from '../data/stats';
import { fetchStationWx, wxDigest, wxIcon, wxSymbol } from '../data/weather';
import { stateVoice } from '../data/stateVoice';
import { crewState } from '../data/crewState';
import { yearCount } from '../data/aeEvents';
import { fetchFlightStatus, fetchAircraftStatus, fetchAirportStats, hasDeviation, worstDelay, arrDelayMin, recordBehindLive, settledArrZ, schedArrZ, inboundGap, airportDisruption } from '../data/flightStatus';
import { nightStopStation, hotelMapsUrl } from '../data/hotels';
import HotelSheet from '../components/HotelSheet';

// Mapa old-theme → PELE: a LÓGICA (fatiga/estado/limites) usa C.x há muito — em vez de
// reescrever o motor do ecrã, o C passa a apontar para os tokens da pele (re-skin, não reescrita).
const C = {
  canvas: PELE.paper, card: PELE.paper, ink: PELE.ink, text: PELE.ink, sub: PELE.grey,
  line: PELE.line, soft: PELE.soft, soft2: PELE.soft2, brand: PELE.ink, onDarkSub: PELE.grey,
  green: PELE.ok, greenSoft: PELE.okSoft, greenText: PELE.ok,
  warn: PELE.warn, warnSoft: PELE.warnSoft, warnText: PELE.warn,
  red: PELE.red, redSoft: PELE.redSoft, redText: PELE.red, infoSoft: PELE.info,
};

// Anel a pulsar (escala 1→1.7 + desvanece, em loop) — atrás do ponto de estado e
// do badge do report, como o mockup (@keyframes ring).
// Donut da pele (mockup .donut, conic-gradient → SVG): anel 52 c/ furo, enche `p`%.
function Donut({ p = 0, color = PELE.yellow, label }) {
  const R = 19.5, CIRC = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, p));
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={52} height={52} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={26} cy={26} r={R} fill="none" stroke={PELE.line} strokeWidth={13} />
        <Circle cx={26} cy={26} r={R} fill="none" stroke={color} strokeWidth={13}
          strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`} />
      </Svg>
      {label ? <Text style={{ fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.5, color: PELE.grey, marginTop: 6 }} numberOfLines={1}>{label}</Text> : null}
    </View>
  );
}

// Skeleton do herói (1º carregamento do calendário) — mesma FORMA (fantasma + palavra + kick).
function HeroSkeleton() {
  return (
    <View style={{ minHeight: 190, justifyContent: 'flex-end', paddingBottom: 10 }}>
      <View style={{ position: 'absolute', right: 0, top: 0 }}><Skeleton w={150} h={120} r={12} /></View>
      <Skeleton w={170} h={44} r={8} style={{ marginBottom: 10 }} />
      <Skeleton w={230} h={13} r={5} />
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

// ── DEMO: voo de exemplo no cartão "Próximo voo", para comparar com o mockup.
// TEMPORÁRIO — quando ligares o calendário real do telemóvel, põe SHOW_DEMO_FLIGHT = false.
const SHOW_DEMO_FLIGHT = false;
// ── DEV: forçar um estado do Início p/ PRÉ-VISUALIZAR no device sem esperar pelo gatilho
// real (ex.: a véspera só dispara ≥18h). Valores: 'setup' | 'folga' | 'hoje' | 'disrupcao' |
// 'vespera' | 'posvoo' | 'pernoita' | 'ferias' | 'doenca' | 'fecho' — ou null = estado REAL.
// Voltar a null depois de ver!
const FORCE_HOME_STATE = null;
// ── AFINAÇÕES visuais (sessão "testar os estados") — mexer AQUI, são números do olho.
// (Fora deste ficheiro: rótulo lateral = components/PeleSide.js `top = 344`/width 320;
//  fantasma dos outros ecrãs = components/PeleHeader.js `ghost right: 14`.)
const TUNE = {
  ghost: { s3: 190, s4: 160, s5: 140 },                    // fantasma por nº de caracteres (1-3 · 4 · ≥5)
  wxSup: { right: 12, top: 2, size: 22 },                  // expoente do tempo no fantasma
  halo: { size: 430, right: -150, top: -100, op: 0.16 },   // brilho ambiente (folga/pós-voo/férias)
  lamp: { w: 360, h: 320, top: -70, op: 0.16 },            // candeeiro noturno (véspera/pernoita)
};
const DEMO_FLIGHT = (() => {
  const dep = new Date(); dep.setDate(dep.getDate() + 1); dep.setHours(6, 40, 0, 0); // partida amanhã 06:40 (report 05:40)
  const iso = `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`;
  return { demo: true, dateISO: iso, report: '05:40', depAirport: 'LIS', arrAirport: 'FNC', arrTime: '13:20', sectors: 2, startDate: dep };
})();

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const { profile, user, lang, ftlSnap, dayLog, duties, company, calendarId, ae, crewCategory, crewContract, crewFleet, crewHistory, isPilot, rosterChanges, aeEvents, validities, markLiveSync, base, hotels, postFlightMin, vacationDaysYear, openSimulation, openExtra, setHomeNight } = useContext(AppContext);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Respostas da antiga Briefing no Início (reaproveita o MESMO `buildTodayItems` → consciente de
  // tripulação/categoria via ae/isPilot). "Estou legal?" só aparece quando ILEGAL (aviso vermelho);
  // as perguntas (descanso/escala/validades) vão por baixo do card Serviços.
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const todayItems = useMemo(
    () => buildTodayItems({ ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, aeEvents, validities, isPilot, todayISO }, lang),
    [ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, aeEvents, validities, isPilot, todayISO, lang],
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
  const homeScrollRef = useRef(null);
  useScrollToTop(homeScrollRef);   // re-tocar na aba Início → volta ao topo (convenção iOS)

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

  // INBOUND — onde anda o avião que nos vem buscar. Só ANTES da nossa partida (depois é
  // irrelevante) e só quando o feed traz a matrícula. O atraso propaga-se pela rotação
  // antes de a API marcar o nosso voo — é aqui que o tripulante ganha minutos de aviso.
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

  // AIRPORT INTELLIGENCE — o aeroporto de PARTIDA está "doente" (atrasos/cancelamentos
  // generalizados)? Complementa o inbound: aquele é o TEU avião, este é o sistémico.
  // Só antes da partida; a Edge cacheia 12 min → custo fixo por aeroporto, não por olhar.
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

  // ── Hotel da pernoita (catálogo por estação) — só em dias com 🌙. A estação deriva
  // da ESCALA (registo > estações do voo), nunca de GPS. Sem registo → convite discreto.
  const [hotelOpen, setHotelOpen] = useState(false);
  const nsHotelStation = (flight && flight.nightStop) ? (() => {
    const reg = duties[flight.dateISO];
    const viaDuty = (reg && !reg.deleted) ? nightStopStation(reg, base) : null;
    if (viaDuty) return viaDuty;
    const stns = Array.isArray(flight.stations) ? flight.stations : [];
    const last = String(stns[stns.length - 1] || flight.arrAirport || '').toUpperCase();
    const b = String(base || '').toUpperCase();
    return /^[A-Z]{3}$/.test(last) && last !== b ? last : null;
  })() : null;
  const nsHotel = nsHotelStation ? (hotels || {})[nsHotelStation] : null;

  // ══ PELE · Início ADAPTATIVO (mockup design/pele-tipografica-final.html — "a líder + 3 adições") ══
  // 4 estados — setup (primeira vez) · folga · hoje (pré-report/em serviço) · disrupção — com a
  // MESMA anatomia: saudação · rótulo lateral · banda de alerta (sítio fixo) · herói (fantasma +
  // palavra + kick) · meio ADAPTATIVO (horas ↔ agenda ↔ setup) · micro-texto útil · dígitos
  // amarelos + donut · barra do polegar (chip + ações com rótulo). Re-skin: os cálculos acima
  // não mudaram — tudo aqui é derivação de apresentação.
  const seg = useEnter();
  const firstName = ((user?.name || user?.email?.split('@')[0] || '').split(' ')[0]) || '';
  // (avatar/sino saíram do topo 2026-07-09 — Perfil é aba, o sino vive lá)
  const hourNow = new Date().getHours();

  // ── O MOTOR da Living Interface (data/crewState.js — PURO, golden test:crewstate) ──
  // Todos os gatilhos e a precedência dos estados vivem lá (auditáveis como o FTL/AE);
  // aqui só se injeta o dia e veste-se o resultado. FORCE_HOME_STATE continua a mandar.
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
  // Tema NOTURNO (Living Interface camada 2): véspera e pernoita vivem no escuro.
  const night = homeState === 'vespera' || homeState === 'pernoita';
  const P = night ? PELE_NIGHT : PELE;
  const s = night ? sNight : sDay;
  // Publica o noturno ao contexto → a WordLine (navegação) herda o tema quando o
  // Início é a aba ativa (a linha faz parte da Living Interface, não flutua fora dela).
  useEffect(() => { setHomeNight && setHomeNight(night); }, [night, setHomeNight]);
  // Saudação: primeira-vez = "Bem-vindo" (mockup estado 0); resto pela hora do dia.
  const greet = homeState === 'setup'
    ? `${l('Bem-vindo', 'Welcome')}${firstName ? `, ${firstName}` : ''}`
    : `${hourNow < 12 ? l('Bom dia', 'Good morning') : hourNow < 20 ? l('Boa tarde', 'Good afternoon') : l('Boa noite', 'Good evening')}${firstName ? `, ${firstName}` : ''}`;
  const inDuty = isToday && cdMin != null && cdMin <= 0;
  const kindLabel = flight && flight.kind ? t('duties.kind.' + flight.kind, lang) : '';
  const hm = (x) => (x ? String(x).slice(11, 16) : null);
  const wDelay = fsDev ? worstDelay(flightStatus) : null;
  const delayMin = fsDev ? ((wDelay && wDelay.min) || 0) : ((inboundInfo && inboundInfo.projDelayMin) || 0);
  const fsStatus = String((flightStatus && flightStatus.status) || '').toLowerCase();
  const fsCancelled = fsStatus === 'cancelled' || fsStatus === 'canceled';
  const fsDiverted = fsStatus === 'diverted';
  const longHaul = isLongHaulCompany(company, crewFleet);

  // Tempo AGORA — no destino final do dia (célula da CHEGADA) em dia de voo; na FOLGA,
  // na BASE (símbolo como expoente do fantasma + min–máx no kick, à referência). Ícones
  // da pele (wxIcon, sem emoji). MET Norway via Edge (cache 45 min).
  const [wxArr, setWxArr] = useState(null);
  const wxStation = (isToday && flight && !isNonFlight)
    ? String((sectorLegs.length ? sectorLegs[sectorLegs.length - 1].arr : flight.arrAirport) || '').toUpperCase()
    : (homeState === 'pernoita' && closeNsStation) ? String(closeNsStation).toUpperCase()
    : ((homeState === 'folga' || homeState === 'ferias' || homeState === 'vespera') && base ? String(base).toUpperCase() : null);
  useEffect(() => {
    let alive = true;
    setWxArr(null);
    if (!wxStation) return () => { alive = false; };
    (async () => {
      const raw = await fetchStationWx(wxStation);
      if (!alive || !raw) return;
      const dig = wxDigest(raw.series);
      if (dig && dig.nowC != null) setWxArr({ c: Math.round(dig.nowC), icon: wxIcon(dig.nowSym), min: dig.todayMin, max: dig.todayMax,
        tmwMin: dig.tomorrowMin, tmwSym: dig.tomorrowSym });   // amanhã cedo — a pergunta da véspera/pernoita ("que visto às 4h?")
    })();
    return () => { alive = false; };
  }, [wxStation]);

  // "HH:MM" → minutos (vive AQUI, antes de TODOS os consumidores — lição TDZ).
  const hmToMin = (x) => { const m = /^(\d{1,3}):(\d{2})$/.exec(String(x || '')); return m ? +m[1] * 60 + +m[2] : null; };

  // ── REPOUSO ATÉ (pós-voo/pernoita): a MESMA regra do motor restBetweenDuties (ORO.FTL.235
  // a/b): fim = sign-off (ou block_on + débrief, só voo) · mínimo = max(12h base / 10h fora,
  // duração do serviço anterior). Multi-serviço fica de fora (o FDP combinado é outro motor). ──
  const restUntil = (todayEnded && !closeMulti && (homeState === 'posvoo' || homeState === 'pernoita')) ? (() => {
    const so = hmToMin(todayEnded.signOff), on = hmToMin(todayEnded.block_on), rep = hmToMin(todayEnded.report_time);
    const pf = ((todayEnded.kind || 'flight') === 'flight') ? (postFlightMin || 0) : 0;
    const end = so != null ? so : (on != null ? (on + pf) % 1440 : null);
    if (end == null) return null;
    let prevDuty = rep != null ? end - rep : 0; while (prevDuty < 0) prevDuty += 1440;
    const minRest = Math.max(homeState === 'posvoo' ? 720 : 600, prevDuty);
    const u = end + minRest;
    return { hm: `${String(Math.floor((u % 1440) / 60)).padStart(2, '0')}:${String(u % 60).padStart(2, '0')}`, nextDay: u >= 1440 };
  })() : null;
  const restUntilHm = restUntil ? restUntil.hm : null;

  // ── Atmosfera tipográfica (camada 1 do "fundos vivos", decisão 2026-07-09) ──
  // VOZ do estado: frase curada determinística (data/stateVoice.js, golden) — folga por agora;
  // véspera/pós-voo/pernoita herdam quando nascerem. HALO: brilho radial suave atrás do
  // fantasma, tom pelo tempo/hora — a dose que não custa leitura (mockup design/fundos-vivos.html ①).
  const voice = useMemo(
    () => stateVoice({ state: homeState, lang, dateISO: todayISO, wx: wxArr, hour: hourNow, ctx: { report: (flight && flight.report) || null, station: closeNsStation, restUntil: restUntilHm } }),
    [homeState, lang, todayISO, wxArr, hourNow, flight && flight.report, closeNsStation, restUntilHm],
  );
  // O bilhete POUSA na página com ângulo/posição LIVRES (user: "como num post-it de lado")
  // — determinísticos pelo DIA (nada de Math.random): cada dia cai um bocadinho diferente,
  // mas hoje cai sempre igual (re-renders não o fazem "dançar").
  const noteSeed = todayISO.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // Teto de contenção -3° (era -4.5°): manuscrita+marcador+ângulo são 3 sinais no mesmo
  // elemento — o ângulo é o 1.º a ceder p/ não virar "scrapbook" (auditoria à Apple).
  const noteTilt = -(1 + (noteSeed % 21) / 10);     // -1.0° … -3.0°
  const noteShift = noteSeed % 11;                  // 0 … 10 px de desvio
  const haloTone = (() => {
    if (homeState !== 'folga' && homeState !== 'posvoo' && homeState !== 'ferias') return null;
    const ic = wxArr && wxArr.icon;
    if (ic === 'rain' || ic === 'thunder') return '#5A7896';
    if (ic === 'snow' || ic === 'fog' || ic === 'cloud') return '#7E8CA0';
    if (hourNow >= 20 || hourNow < 7 || ic === 'moon') return '#2E4E78';
    return PELE.yellow;
  })();

  // ── PÓS-VOO: o balanço do dia fechado (motor computeDuty, o MESMO dos golden) ──
  const closeD = (todayEnded && !closeMulti) ? (() => {
    try {
      const sp = todayEnded.special || {};
      return computeDuty({ state: 'acc', report: todayEnded.report_time, end: todayEnded.block_on, sectors: todayEnded.sectors || 0, isPilot, augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null });
    } catch { return null; }
  })() : null;
  const closeBlock = (todayEnded && !closeMulti && todayEnded.flight_minutes)
    ? `${Math.floor(todayEnded.flight_minutes / 60)}:${String(todayEnded.flight_minutes % 60).padStart(2, '0')}` : null;
  const closePct = (() => {
    if (!closeD || !closeD.fdp) return null;
    const a = hmToMin(closeD.fdp.actualFdpStr), m = hmToMin(closeD.fdp.maxFdpStr);
    return (a != null && m) ? Math.min(100, Math.round((a / m) * 100)) : null;
  })();
  let pdToday = null;
  if (todayEnded && !closeMulti && ae && crewCategory && todayEnded.route) {
    const dists = routeDistancesNM(todayEnded.route);
    if (dists.length && !dists.some((x) => x == null)) pdToday = ae.perDiem(crewCategory, dists, 1, crewFleet);
  }
  // Acordar sugerido (véspera): report − 1h15 (estimativa "~" — vestir + deslocação).
  const wakeAt = (() => {
    if (homeState !== 'vespera' || !flight || !flight.report) return null;
    const m = hmToMin(flight.report); if (m == null) return null;
    const w = (m - 75 + 1440) % 1440;
    return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`;
  })();
  const restItem = questionItems.find((it) => it.id === 'rest') || null;
  const closeFno = todayEnded ? ((Array.isArray(todayEnded.legs) && todayEnded.legs[0] && (todayEnded.legs[0].flightNo || todayEnded.legs[0].flight))
    ? String(todayEnded.legs[0].flightNo || todayEnded.legs[0].flight).toUpperCase()
    : (todayEnded.kind && todayEnded.kind !== 'flight' ? t('duties.kind.' + todayEnded.kind, lang) : l('Voo', 'Flight'))) : null;
  // ── PERNOITA: hotel da estação (catálogo local) + abono da noite (ae.nightStop, Art. 39) ──
  const closeHotel = closeNsStation ? (hotels || {})[closeNsStation] : null;
  const nsPay = (homeState === 'pernoita' && ae && ae.nightStop && crewCategory) ? ae.nightStop(crewCategory) : null;
  // Saldo de férias LEVE p/ o útil da folga (mockup "férias: ficam 9 de 22") — só com AE
  // que regista vacDays (senão "22 de 22" mentiria: os dias gozados vivem nos eventos).
  const folgaVac = (homeState === 'folga' && ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays')) ? (() => {
    const quota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
    const taken = yearCount(aeEvents || [], todayISO.slice(0, 4), 'vacDays', duties);
    return { quota, left: Math.max(0, quota - taken) };
  })() : null;

  // ── FÉRIAS: saldo do ano (Art. 238.º CT) + dia de regresso (fim do bloco consecutivo) ──
  const vacInfo = (homeState === 'ferias') ? (() => {
    const quota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
    const taken = yearCount(aeEvents || [], todayISO.slice(0, 4), 'vacDays', duties);
    const days = new Set((aeEvents || []).filter((e) => e && e.type === 'vacDays' && String(e.date).length === 10).map((e) => e.date));
    let back = todayISO;
    const next = (iso) => { const [y, m, d] = iso.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d + 1)); const p = (n) => String(n).padStart(2, '0'); return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`; };
    while (days.has(next(back))) back = next(back);
    const ret = next(back);   // regresso = dia seguinte ao último dia consecutivo de férias
    return { quota, taken, left: Math.max(0, quota - taken), retISO: ret,
      retLabel: new Date(ret + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }) };
  })() : null;
  // ── DOENÇA: dia N do episódio + regra de pagamento crew-aware (Art. 48 piloto: dias 1-3;
  // cabine Art. 61: o user regista só os pagos) — o mesmo modelo do eventCounts. ──
  const sickFirst3 = !ae || ae.SICK_FIRST3 !== false;
  const sickDay = cs.sickDay || 0;
  // ── FECHO DO MÊS: dias que faltam (as parcelas vêm do monthAe, lido mais abaixo — TDZ!) ──
  const fechoDaysLeft = (homeState === 'fecho') ? (() => {
    const [y, m, d] = todayISO.split('-').map(Number);
    return new Date(y, m, 0).getDate() - d;
  })() : null;
  // ── EM VOO: progresso do setor ativo (instantes planeados; janela viva) + PSV a acumular ──
  const sectorPct = (inDuty && activeSector) ? (() => {
    // Com feed AO VIVO e voo de 1 setor, o progresso usa os instantes REAIS (partida real →
    // ETA); senão, os planeados das legs (legInstant). Nunca se mistura live com multi-setor
    // (o feed é do Nº DE VOO, não da perna).
    let offMs = null, onMs = null;
    if (sectorLegs.length === 1 && flightStatus) {
      const dts = flightStatus.dep && flightStatus.dep.actualTs;
      const ats = flightStatus.arr && (flightStatus.arr.estimatedTs || flightStatus.arr.scheduledTs);
      if (dts && ats) { offMs = dts * 1000; onMs = ats * 1000; }
    }
    if (offMs == null) {
      const off = legInstant(flight.dateISO, activeSector.leg.off, flight.report);
      const on = legInstant(flight.dateISO, activeSector.leg.on, flight.report);
      if (!off || !on) return null;
      offMs = off.getTime(); onMs = on.getTime();
    }
    if (onMs <= offMs) return null;
    return Math.max(0, Math.min(100, Math.round(((now - offMs) / (onMs - offMs)) * 100)));
  })() : null;
  const psvRunning = (inDuty && reportMs != null) ? (() => {
    const min = Math.max(0, Math.round((now - reportMs) / 60000));
    return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
  })() : null;

  // ── STANDBY hoje: "se chamado agora → PSV até HH:MM" (o motor 225 já dá o máx; report+máx = relógio) ──
  const isStandbyToday = !!(flight && isToday && isNonFlight && /standby|reserve/.test(String(flight.kind || '')));
  const psvUntil = (() => {
    if (!isStandbyToday || !flight.report || !ndPsvMax) return null;
    const r = hmToMin(flight.report), m = hmToMin(ndPsvMax);
    if (r == null || m == null) return null;
    const e = (r + m) % 1440;
    return `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`;
  })();

  // € do MÊS estimado (folga + fecho) — o MESMO monthStats das Estatísticas (nunca um nº novo).
  // Guarda o aeMonth COMPLETO: o fecho-do-mês mostra as parcelas (que SOMAM — auditável).
  const monthAe = useMemo(() => {
    if (!ae || !crewCategory) return null;
    try {
      const st0 = monthStats(duties, { ym: todayISO.slice(0, 7), ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents });
      return (st0 && st0.aeMonth) || null;
    } catch { return null; }
  }, [duties, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, todayISO]);
  const monthMoney = monthAe ? monthAe.total : null;
  const monthPct = Math.round((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100);
  const monthName = new Date().toLocaleDateString(locale, { month: 'long' });
  // € sem símbolo (o rótulo por baixo já diz EUR) — SEMPRE com cêntimos (regra da casa).
  const eurBare = (n) => { const [i, d] = Number(n).toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ')}${lang === 'en' ? '.' : ','}${d}`; };
  const psvPct = (() => {
    const mx = hmToMin(ndPsvMax); if (!mx) return null;
    const real = hmToMin(liveVerdict ? liveVerdict.realStr : ndPsvActual);
    return real != null ? Math.min(100, Math.round((real / mx) * 100)) : null;
  })();
  const f28 = flightLimits.find((w) => w.days === 28) || null;

  // Rótulo lateral (PeleSide) por estado.
  const sideL = homeState === 'setup' ? [l('PRIMEIRA VEZ', 'FIRST TIME'), 'SETUP']
    // FOLGA (decisão do user 2026-07-09, 2.ª iteração): fantasma = dia da semana CURTO
    // ("QUI" — a língua dos rosters, 3 letras = tamanho gigante) e o rótulo dá a coordenada
    // de calendário "9 JULHO" (o mês não aparecia em lado nenhum na folga). Dia de trabalho
    // fala em números, dia teu fala em palavras.
    : homeState === 'folga' ? [l('FOLGA', 'DAY OFF'), `${new Date().getDate()} ${new Date().toLocaleDateString(locale, { month: 'long' }).toUpperCase()}`]
    : homeState === 'vespera' ? [l('VÉSPERA', 'EVE'), `REPORT ${(flight && flight.report) || ''}`.trim()]
    : homeState === 'pernoita' ? [l('PERNOITA', 'NIGHT STOP'), l('FORA DA BASE', 'AWAY FROM BASE')]
    : homeState === 'posvoo' ? [String(closeFno || l('HOJE', 'TODAY')).toUpperCase(), l('HOJE ✓', 'TODAY ✓')]
    : homeState === 'ferias' ? [l('FÉRIAS', 'VACATION'), monthName.toUpperCase()]
    : homeState === 'doenca' ? [l('DOENÇA', 'SICK LEAVE'), l('EM PAUSA', 'ON HOLD')]
    : homeState === 'fecho' ? [l('FECHO', 'CLOSING'), monthName.toUpperCase()]
    : [String(flightNo || kindLabel || l('HOJE', 'TODAY')).toUpperCase(), ndSectors ? `${ndSectors} ${l('SETORES', 'SECTORS')}` : (sectorLegs.length ? `${sectorLegs.length} ${l('SETORES', 'SECTORS')}` : l('HOJE', 'TODAY'))];

  // Documento crítico (validade expirada/bad) NÃO vai à banda — vive AO PÉ DO ESTADO (útil),
  // em vermelho, tocável (decisão do user 2026-07-09). A banda fica p/ o FTL/operacional.
  const docAlert = qAlerts.find((it) => it.id === 'validades') || null;
  const bandAlerts = qAlerts.filter((it) => it.id !== 'validades');

  // Banda de alerta (sítio FIXO, uma de cada vez, por prioridade): segurança FTL (ILEGAL) >
  // limites acima > erro de leitura > desvio/cancelado > inbound > registo atrasado > aeroporto.
  const band = (() => {
    if (bandAlerts.length) return { tone: 'red', t: bandAlerts[0].q, s: bandAlerts[0].answer, onPress: () => { select(); setDetailItem(bandAlerts[0]); } };
    if (stateLevel === 'over') return { tone: 'red', t: l('Limites FTL acima do teto', 'FTL limits over the cap'), s: stateReason || '', onPress: () => { select(); navigation.navigate('Estatísticas'); } };
    if (calErr) return { tone: 'warn', t: l('Não consegui ler o calendário', 'Couldn’t read the calendar'), s: l('Puxa para atualizar ou verifica a permissão nas Definições.', 'Pull to refresh or check the permission in Settings.') };
    if (fsDev && (fsCancelled || fsDiverted)) return { tone: 'red', t: fsCancelled ? l('Voo cancelado', 'Flight cancelled') : l('Voo desviado', 'Flight diverted'), s: String(flightStatus.flightIata || flightNo || '') };
    if (fsDev) {
      const leg = (wDelay && wDelay.which === 'arr') ? flightStatus.arr : flightStatus.dep;
      return { tone: 'warn',
        t: `${flightStatus.flightIata || flightNo || ''} · ${(wDelay && wDelay.which === 'arr') ? l('chega', 'arrives') : l('sai', 'departs')} ${hm(leg && (leg.estimated || leg.actual)) || '—'} · ${l('estava', 'was')} ${hm(leg && leg.scheduled) || '—'}`,
        s: liveVerdict ? `${liveVerdict.projected ? l('Projeção', 'Projected') : l('Com o atraso', 'With the delay')}: PSV ${liveVerdict.realStr} / ${l('máx', 'max')} ${liveVerdict.maxStr}` : l('Confirma o impacto no PSV/descanso.', 'Check the FDP/rest impact.') };
    }
    if (inboundLate) return { tone: 'warn', t: l('O teu avião ainda vem a caminho', 'Your aircraft is still inbound'), s: `${(inbound && inbound.flightIata) || ''} ${l('chega', 'arrives')} ~${inboundInfo.etaZ}Z · ${l('rotação mín. ~35 min', 'min turnaround ~35 min')}${airportDis ? ` · ${airportDis.delayedPct}% ${l('atrasos', 'delays')}` : ''}` };
    if (syncBehind) return { tone: 'warn', t: l('O registo ainda tem o planeado', 'Your record still shows the plan'), s: l('Sincroniza a escala eCrew pelo calendário para o PSV/limites acertarem.', 'Sync your eCrew roster via the calendar so FDP/limits are right.') };
    // Escala mudou (ficha 9 — deteta→confirma→grava): nada entra sem confirmares; toca → Escala.
    if (rosterChanges && rosterChanges.counts && rosterChanges.counts.total) return { tone: 'warn',
      t: l(`A tua escala mudou — ${rosterChanges.counts.total} alteração(ões) por rever`, `Your roster changed — ${rosterChanges.counts.total} change(s) to review`),
      s: l('Nada entra na tua vida sem confirmares. Toca para rever.', 'Nothing enters your life unconfirmed. Tap to review.'),
      onPress: () => { select(); navigation.navigate('Escala'); } };
    if (airportDis) return { tone: airportDis.tone === 'bad' ? 'red' : 'warn', t: `${(flightStatus && flightStatus.dep && flightStatus.dep.iata) || ''} · ${airportDis.tone === 'bad' ? l('disrupção no aeroporto', 'airport disruption') : l('atrasos generalizados', 'widespread delays')}`, s: `${airportDis.delayedPct}% ${airportDis.side === 'dep' ? l('das partidas atrasadas', 'departures delayed') : l('das chegadas atrasadas', 'arrivals delayed')}${airportDis.avgDelayMin ? ` · ${l('média', 'avg')} ${airportDis.avgDelayMin} min` : ''}` };
    return null;
  })();

  // Herói por estado: fantasma (o DADO gigante) + palavra + kick (partes; {y:...} = amarelo).
  const cdGhost = cdMin != null && cdMin > 0 ? `${Math.floor(cdMin / 60)}:${String(cdMin % 60).padStart(2, '0')}` : null;
  const routeShort = flight ? (flight.stations && flight.stations.length > 1
    ? `${flight.stations[0]}→${flight.stations[flight.stations.length - 1]}`
    : `${flight.depAirport || ''}→${flight.arrAirport || ''}`) : '';
  const planeOk = !!(flightStatus && !fsDev && !inboundLate);
  const aptOk = !!(depAirport && !airportDis);
  const hero = (() => {
    if (homeState === 'setup') return { icon: 'plane', word: l('Olá!', 'Hello!'), arrow: 'arrow-diag', arrowRot: 90,
      kick: [l('liga o ', 'connect your '), { y: l('calendário do telemóvel', 'phone calendar') }, l(' e o Início ganha vida', ' and Home comes alive')] };
    if (homeState === 'disrupcao') return {
      ghost: (fsCancelled || fsDiverted) ? '!' : `+${delayMin}`, word: l('Atenção', 'Heads-up'), warn: true, arrow: 'alert',
      kick: fsCancelled ? [l('voo cancelado — confirma com o crewing', 'flight cancelled — check with crewing')]
        : fsDiverted ? [l('voo desviado — confirma o destino', 'flight diverted — check destination')]
        : fsDev ? [l('o voo segue ', 'the flight is running '), { y: `+${delayMin} min` }]
        : [l('a partida pode derrapar ', 'departure may slip '), { y: `~${delayMin} min` }] };
    if (homeState === 'hoje') {
      if (isNonFlight) {
        // Standby com a janela ATIVA: o fantasma responde "até quando podem chamar-me?"
        // → mostra o FIM da janela (o início já passou); antes de abrir, mostra o início.
        const sbActive = isStandbyToday && cdMin != null && cdMin <= 0 && flight.arrTime;
        return { ghost: (sbActive ? flight.arrTime : flight.report) || '—', word: kindLabel || l('Serviço', 'Duty'), arrow: 'arrow-u',
          kick: [l('início ', 'starts '), { y: flight.report || '—' }, (flight.arrTime && flight.arrTime !== flight.report) ? ` · ${l('fim', 'ends')} ${flight.arrTime}` : null] };
      }
      if (inDuty) return { ghost: (activeSector && activeSector.leg.on) || flight.arrTime || '—', word: l('Em voo', 'Airborne'), arrow: 'arrow-u',
        kick: activeSector ? [`${l('setor', 'sector')} ${activeSector.idx + 1}/${activeSector.total} · `, { y: `${activeSector.leg.dep || '?'}→${activeSector.leg.arr || '?'}` }, ` · ${l('termina', 'ends')} ~${flight.arrTime || '—'}`]
          : [{ y: routeShort }, ` · ${l('termina', 'ends')} ~${flight.arrTime || '—'}`] };
      return { ghost: cdGhost || flight.report || '—', word: 'Report', arrow: 'arrow-u',
        kick: [l('às ', 'at '), { y: `${flight.report || '—'}${ndReportZ ? ` · ${ndReportZ}Z` : ''}` },
          planeOk ? ` · ${l('avião', 'aircraft')} ✓` : null, aptOk ? ` · ${l('aeroporto', 'airport')} ✓` : null,
          (!flightStatus && ndSectors) ? ` · ${ndSectors} ${l('setores', 'sectors')}` : null] };
    }
    // VÉSPERA (noturno): fantasma = countdown ao report, palavra "Amanhã", kick com o
    // repouso verificado + acordar sugerido — "está tudo verificado, dorme".
    if (homeState === 'vespera') return {
      ghost: cdGhost || (flight && flight.report) || '—', word: l('Amanhã', 'Tomorrow'), arrow: 'moon',
      kick: [l('report às ', 'report at '), { y: `${(flight && flight.report) || '—'}${ndReportZ ? ` · ${ndReportZ}Z` : ''}` },
        restItem && restItem.status === 'ok' ? ` · ${l('repouso mínimo ✓', 'min rest ✓')}` : null,
        wakeAt ? ` · ${l('acordar', 'wake')} ~${wakeAt}` : null] };
    // PERNOITA (noturno): fantasma = a ESTAÇÃO onde dormes, hotel no kick — o estado do
    // quarto de hotel: tudo o que precisas numa cidade que não é a tua, a um toque.
    if (homeState === 'pernoita') return {
      ghost: closeNsStation || '—', word: l('Pernoita', 'Night stop'), arrow: 'moon',
      kick: closeHotel
        ? [{ y: closeHotel.name }, (flight && flight.report) ? ` · ${l('amanhã report', 'tomorrow report')} ${flight.report}` : null]
        : [l('sem hotel guardado — usa a ação Hotel', 'no hotel saved — use the Hotel action'), (flight && flight.report) ? ` · ${l('amanhã', 'tomorrow')} ${flight.report}` : null] };
    // PÓS-VOO: fantasma = duty total, palavra "Fechado", kick = o veredicto legal do dia.
    if (homeState === 'posvoo') return {
      ghost: (closeD && closeD.fdp && closeD.fdp.actualFdpStr) || (todayEnded && todayEnded.report_time) || '—',
      word: l('Fechado', 'Closed'), arrow: 'check',
      kick: (closeD && closeD.fdp) ? [
        { y: `PSV ${closeD.fdp.actualFdpStr || '—'}` }, ` / ${l('máx', 'max')} ${closeD.fdp.maxFdpStr || '—'}`,
        closeD.fdp.over ? ` · ${l('ACIMA do limite', 'OVER the limit')}` : ` · ${l('dentro dos limites ✓', 'within limits ✓')}`,
      ] : [l('serviço de hoje terminado ✓', 'today’s duty is done ✓')] };
    // FÉRIAS: fantasma = dias que RESTAM no ano, regresso no kick — afastamento máximo.
    if (homeState === 'ferias') return {
      ghost: vacInfo ? String(vacInfo.left) : '—', word: l('Férias', 'Vacation'), arrow: 'sun',
      kick: vacInfo ? [l('ficam ', 'left: '), { y: `${vacInfo.left} ${l('de', 'of')} ${vacInfo.quota}` }, ` · ${l('regressas', 'back')} ${vacInfo.retLabel}`] : [l('bom descanso', 'enjoy the rest')] };
    // DOENÇA: tom humano, baixo — o dia do episódio e o que a lei garante (Art. 48/61).
    if (homeState === 'doenca') return {
      ghost: String(sickDay), word: l('As melhoras', 'Get well'), arrow: 'heart',
      kick: [l('episódio: dia ', 'episode: day '), { y: String(sickDay) },
        sickFirst3 ? (sickDay <= 3 ? ` · ${l('pago (Art. 48)', 'paid (Art. 48)')}` : ` · ${l('do 4.º em diante — Segurança Social', 'from day 4 — social security')}`) : null] };
    // FECHO DO MÊS: o TOTAL vive só na datarow (a manchete de € da casa — sem eco);
    // o kick é o NUDGE dos extras.
    if (homeState === 'fecho') return {
      ghost: String(fechoDaysLeft != null ? fechoDaysLeft : '—'), word: l('Fecho do mês', 'Month close'), arrow: 'wallet',
      kick: [l('faltam extras? regista no ', 'missing extras? log via '), { y: '＋' }, l(' antes do fecho', ' before close')] };
    // Folga (2026-07-09, 3.ª iteração do user): fantasma = dia da semana CURTO de HOJE
    // ("QUI" — 3 letras, fica gigante; slice(0,3) porque o 'short' varia com o motor de
    // Intl: device "qui." · Node "quinta"); número do dia + mês no rótulo lateral.
    // SEM kick: o próximo serviço vive na agenda "A seguir" (régua abaixo) e o tempo vive
    // no EXPOENTE do fantasma (ícone + min–máx, sem a palavra "hoje" — o fantasma É hoje).
    return { ghost: new Date().toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase(), word: l('Folga', 'Day off'), arrow: 'arrow-diag', arrowRot: 90,
      kick: null };
  })();

  // Meio adaptativo — HORAS (voo hoje/disrupção) · linha simples (não-voo) · AGENDA (folga) · SETUP.
  const midTimes = ((homeState === 'hoje' || homeState === 'disrupcao' || homeState === 'vespera') && flight && !isNonFlight) ? (() => {
    const sLeg = activeSector ? activeSector.leg : null;
    const depAp = String((sLeg && sLeg.dep) || flight.depAirport || '—').toUpperCase();
    const arrAp = String((sLeg && sLeg.arr) || flight.arrAirport || '—').toUpperCase();
    const dep = flightStatus && flightStatus.dep, arr = flightStatus && flightStatus.arr;
    const depSched = hm(dep && dep.scheduled) || ndDep || '—';
    const depLive = hm(dep && (dep.actual || dep.estimated));
    const arrSched = hm(arr && arr.scheduled) || ndArr || '—';
    const arrLive = hm(arr && (arr.actual || arr.estimated));
    const depLate = !!(depLive && ((dep && dep.delayMin) || 0) >= 15);
    const arrLate = !!(arrLive && arrDelayMin(flightStatus || {}) >= 15);
    // Disrupção por ROTAÇÃO (inbound atrasado, o NOSSO voo ainda "limpo" no feed): as horas
    // mostram a PROJEÇÃO — planeada rasurada → ~nova (sched + derrapagem) — como o mockup.
    // Lei do LI: NUNCA se afirma "a tempo ✓" quando a rotação já o desmente.
    const projMin = (homeState === 'disrupcao' && !depLate && !arrLate && inboundLate && inboundInfo) ? (inboundInfo.projDelayMin || 0) : 0;
    if (projMin > 0) {
      const addMin = (hm0, m) => { const t0 = hmToMin(hm0); return t0 == null ? null : `${String(Math.floor(((t0 + m) % 1440) / 60)).padStart(2, '0')}:${String((t0 + m) % 60).padStart(2, '0')}`; };
      const dp = addMin(depSched, projMin), ar = addMin(arrSched, projMin);
      return [
        { ap: depAp, aps: l('PARTIDA', 'DEPARTURE'), big: dp ? `~${dp}` : depSched, cls: 'warn', old: dp ? depSched : null, st: l('derrapa', 'slipping'), stTone: 'warn', sts: l('projeção', 'projected') },
        { ap: arrAp, aps: l('CHEGADA', 'ARRIVAL'), big: ar ? `~${ar}` : arrSched, cls: 'warn', old: ar ? arrSched : null, st: l('projeção', 'projected'), stTone: 'warn', sts: l('rotação ~35 min', 'turnaround ~35 min') },
      ];
    }
    return [
      { ap: depAp, aps: l('PARTIDA', 'DEPARTURE'), big: depLate ? `~${depLive}` : (depLive || depSched), cls: depLate ? 'warn' : (flightStatus ? 'ok' : ''), old: depLate ? depSched : null,
        st: depLate ? l('derrapa', 'slipping') : (dep && dep.actual) ? l('partiu ✓', 'departed ✓') : flightStatus ? l('a tempo ✓', 'on time ✓') : l('planeado', 'planned'), stTone: depLate ? 'warn' : (flightStatus ? 'ok' : null),
        sts: (dep && dep.gate) ? `${l('porta', 'gate')} ${dep.gate}` : (ndDepZ ? `${ndDepZ}Z` : '') },
      { ap: arrAp, aps: l('CHEGADA', 'ARRIVAL'), big: arrLate ? `~${arrLive}` : (arrLive || arrSched), cls: arrLate ? 'warn' : (flightStatus ? 'ok' : ''), old: arrLate ? arrSched : null,
        st: arrLate ? l('projeção', 'projected') : flightStatus ? l('no plano', 'on plan') : l('planeado', 'planned'), stTone: arrLate ? 'warn' : (flightStatus ? 'ok' : null),
        sts: wxArr ? `${wxArr.c}°` : (ndArrZ ? `${ndArrZ}Z` : ''), stsIcon: wxArr ? wxArr.icon : null },
    ];
  })() : null;
  const midPlain = (homeState === 'hoje' && flight && isNonFlight)
    ? { t: kindLabel, s: `${flight.report || ''}${(flight.arrTime && flight.arrTime !== flight.report) ? ` – ${flight.arrTime}` : ''}` } : null;
  // Pernoita: o HOTEL é o meio (toque → mapas · toque longo → editar; sem hotel → convite).
  const midHotel = homeState === 'pernoita' ? { hotel: closeHotel, station: closeNsStation } : null;
  // Pós-voo: os TOTAIS do dia fechado (toque → detalhe do serviço).
  const midClose = (homeState === 'posvoo' && todayEnded && !closeMulti) ? [
    (closeD && closeD.fdp && closeD.fdp.actualFdpStr) ? { k: 'DUTY', v: closeD.fdp.actualFdpStr } : null,
    closeBlock ? { k: 'BLOCK', v: closeBlock } : null,
    todayEnded.sectors ? { k: l('SETORES', 'SECTORS'), v: String(todayEnded.sectors) } : null,
  ].filter(Boolean) : null;
  // Fecho do mês: as PARCELAS do aeMonth (que somam — auditável; toque → Estatísticas).
  const midFecho = (homeState === 'fecho' && monthAe) ? [
    { k: 'BASE', v: eurBare(monthAe.base || 0) },
    monthAe.perDiem ? { k: 'PER-DIEM', v: eurBare(monthAe.perDiem) } : null,
    monthAe.nightStops ? { k: l('PERNOITAS', 'NIGHT STOPS'), v: eurBare(monthAe.nightStops) } : null,
    ((monthAe.extras || 0) + (monthAe.events || 0)) ? { k: 'EXTRAS', v: eurBare((monthAe.extras || 0) + (monthAe.events || 0)) } : null,
  ].filter(Boolean) : null;
  const agendaRows = (homeState === 'folga') ? (() => {
    const out = [];
    for (const iso of Object.keys(duties).filter((k) => k >= todayISO).sort()) {
      const d = duties[iso]; if (!d || d.deleted || !d.report_time) continue;
      // Já TERMINOU (ex.: aterrou 15h, são 21h) → não é "próximo" — mesma regra do mergeNextFlight.
      const mf = dutyToFlight(iso, d); if (!mf || (mf.endDate && mf.endDate.getTime() < Date.now())) continue;
      const isF = !d.kind || d.kind === 'flight';
      const wd = new Date(iso + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase();
      const fno = (Array.isArray(d.legs) && d.legs[0] && (d.legs[0].flightNo || d.legs[0].flight)) ? String(d.legs[0].flightNo || d.legs[0].flight).toUpperCase() : null;
      const moon = (d.night_stop || d.nightStop) ? ` 🌙 ${l('pernoita', 'night stop')}` : '';   // no título, como o mockup
      // Linhas com a DATA explícita ("SEX 10" — o wd sozinho era ambíguo); o QUANDO relativo
      // (amanhã/faltam X h) vive no TÍTULO vivo da agenda, não repetido linha a linha.
      out.push({ iso,
        a1: `${isF ? [fno, d.route].filter(Boolean).join(' · ') || l('Voo', 'Flight') : t('duties.kind.' + d.kind, lang)}${moon}`,
        a2: `${wd} ${Number(iso.slice(8, 10))} · report ${d.report_time}${d.sectors ? ` · ${d.sectors} ${l('setores', 'sectors')}` : ''}` });
      if (out.length >= 3) break;
    }
    return out;
  })() : null;
  // TÍTULO VIVO da agenda (pedido do user: nada de "A SEGUIR" morto) — diz o estado do
  // próximo serviço: "EM 45 MIN" · "AMANHÃ · EM 16 H" · "EM 3 DIAS". O tempo vai a amarelo.
  const agendaWhen = (homeState === 'folga' && flight && cdMin != null && cdMin > 0) ? (() => {
    const diffD = Math.round((new Date(flight.dateISO + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 86400000);
    if (cdMin < 60) return { pre: null, hi: `${l('em', 'in')} ${cdMin} min` };
    if (cdMin < 2880) return { pre: diffD === 1 ? `${l('amanhã', 'tomorrow')} · ` : null, hi: `${l('em', 'in')} ${Math.floor(cdMin / 60)} h` };
    return { pre: null, hi: `${l('em', 'in')} ${Math.round(cdMin / 1440)} ${l('dias', 'days')}` };
  })() : null;

  // Micro-texto útil (título BC + frase) — o resumo das perguntas/estado; toca → folha "porquê".
  const utilTtl = homeState === 'setup' ? l('Porquê', 'Why') : homeState === 'folga' ? l('Estado', 'Status') : homeState === 'vespera' ? l('Amanhã', 'Tomorrow') : homeState === 'pernoita' ? l('Fora', 'Away') : homeState === 'posvoo' ? l('Fecho', 'Wrap-up') : homeState === 'ferias' ? l('Ano', 'Year') : homeState === 'doenca' ? l('Agora', 'Now') : homeState === 'fecho' ? l('Mês', 'Month') : homeState === 'disrupcao' ? 'PSV' : l('Hoje', 'Today');
  const utilTxt = (() => {
    if (homeState === 'setup') return l('Sem calendário ligado, a app não sabe nada de ti. Os teus dados ficam no teu telemóvel — e podes espreitar já um dia de exemplo.', 'Without a calendar connected the app knows nothing about you. Your data stays on your phone — and you can peek at an example day right away.');
    if (homeState === 'vespera') return [
      wakeAt ? `${l('acordar', 'wake')} ~${wakeAt}` : null,
      (wxArr && wxArr.tmwMin != null) ? `${l('amanhã cedo', 'early tomorrow')} ${wxArr.tmwMin}°${wxArr.tmwSym ? ` ${wxSymbol(wxArr.tmwSym, lang).label}` : ''}` : null,
      ndSectors ? `${ndSectors} ${l('setores', 'sectors')}` : null,
      ndPsvMax ? `PSV ${l('máx', 'max')} ${ndPsvMax}` : null,
      (flight && flight.nightStop) ? `🌙 ${l('pernoita amanhã', 'night stop tomorrow')}` : null,
    ].filter(Boolean).join(' · ') || l('está tudo verificado', 'all checked');
    if (homeState === 'ferias') return [
      vacInfo ? `${l('gozados', 'taken')} ${vacInfo.taken} ${l('de', 'of')} ${vacInfo.quota}` : null,
      wxArr ? `${wxArr.c}° ${l('hoje', 'today')}` : null,
      l('a app fica de vigia', 'the app keeps watch'),
    ].filter(Boolean).join(' · ');
    if (homeState === 'doenca') return l('tudo o operacional está em pausa — recupera ao teu ritmo.', 'everything operational is paused — recover at your pace.');
    if (homeState === 'fecho') return [
      (monthAe && monthAe.missing) ? `${monthAe.missing} ${l('voo(s) sem rota — per-diem incompleto', 'flight(s) without route — per-diem incomplete')}` : null,
      (monthAe && monthAe.estimated) ? l('índice do ano estimado', 'year index estimated') : null,
    ].filter(Boolean).join(' · ') || l('as parcelas em baixo somam o total', 'the parts below add up to the total');
    if (homeState === 'pernoita') return [
      restUntil ? `${l('repouso até', 'rest until')} ${restUntil.hm}${restUntil.nextDay ? ' ⁺¹' : ''} (235)` : l('repouso fora-base mín. 10h (235)', 'away-base rest min. 10h (235)'),
      nsPay != null ? `${l('pernoita', 'night stop')} +${eurBare(nsPay)} €` : null,
      (wxArr && wxArr.tmwMin != null) ? `${l('amanhã cedo', 'early tomorrow')} ${wxArr.tmwMin}°${wxArr.tmwSym ? ` ${wxSymbol(wxArr.tmwSym, lang).label}` : ''}` : (wxArr ? `${wxArr.c}° ${l('em', 'in')} ${closeNsStation}` : null),
    ].filter(Boolean).join(' · ');
    if (homeState === 'posvoo') return [
      restUntil ? `${l('repouso até', 'rest until')} ${restUntil.hm}${restUntil.nextDay ? ' ⁺¹' : ''} (235)` : (restItem && restItem.short ? `${l('repouso', 'rest')}: ${restItem.short}` : null),
      flight ? `${l('próximo', 'next')} ${(ndDayWd || '').toLowerCase()} · report ${flight.report || '—'}` : l('sem próximo serviço marcado', 'no next duty yet'),
      (todayEnded && !todayEnded.signOff && postFlightMin) ? l('sign-off do perfil usado — ajusta no serviço se saíste a outra hora', 'profile sign-off used — adjust in the duty if you left later') : null,
    ].filter(Boolean).join(' · ');
    if (homeState === 'disrupcao') return liveVerdict
      ? `PSV ${l('projetado', 'projected')} ${liveVerdict.realStr} / ${l('máx', 'max')} ${liveVerdict.maxStr} · ${liveVerdict.verdict === 'over' ? l('ACIMA da lei', 'OVER the limit') : liveVerdict.verdict === 'discretion' ? l('discrição 205(f) pronta', 'commander’s discretion (205f) ready') : l('dentro do limite', 'within the limit')}`
      : l('Confirma o impacto no PSV e no descanso.', 'Check the impact on your FDP and rest.');
    if (homeState === 'hoje') return [
      flightStatus && flightStatus.aircraft && flightStatus.aircraft.reg ? `${l('avião', 'aircraft')} ${flightStatus.aircraft.reg}` : null,
      (inDuty && psvRunning) ? `PSV ${psvRunning}${ndPsvMax ? ` / ${l('máx', 'max')} ${ndPsvMax}` : ''}` : ndPsvMax ? `PSV ${l('máx', 'max')} ${ndPsvMax}` : null,
      ndSectors ? `${l('aclimatizado', 'acclimatised')}, ${ndSectors} ${l('setores', 'sectors')}` : null,
      ndFat && (ndFat.band === 'high' || ndFat.band === 'elevated') ? `${l('fadiga', 'fatigue')} ${fatLabel(ndFat.band).toLowerCase()}` : null,
      flight && flight.nightStop ? `🌙 ${l('pernoita', 'night stop')}` : null,
      // Formação: papel pago (instrutor conta no mês pelo AE — a lei dos papéis).
      (flight && flight.kind === 'training' && ndReg && ndReg.role === 'instr') ? l('papel: instrutor — conta no mês (AE)', 'role: instructor — counts this month (AE)') : null,
      // Standby aeroporto: o alojamento muda como o tempo conta (sem artigo — wording do LI).
      (isStandbyToday && flight.kind === 'standby_airport') ? (ndReg && ndReg.accommodation ? l('com alojamento', 'with accommodation') : l('sem alojamento — conta por inteiro', 'no accommodation — counts in full')) : null,
    ].filter(Boolean).join(' · ') || l('sem mais nada a assinalar', 'nothing else to flag');
    const bits = qChips.slice(0, 3).map((it) => it.short).filter(Boolean);
    if (folgaVac) bits.push(`${l('férias: ficam', 'vacation: left')} ${folgaVac.left} ${l('de', 'of')} ${folgaVac.quota}`);
    return bits.length ? bits.join(' · ') : l('tudo em dia ✓', 'all in order ✓');
  })();
  const utilTap = (homeState === 'folga' || homeState === 'hoje' || homeState === 'vespera' || homeState === 'posvoo' || homeState === 'ferias' || homeState === 'fecho') && questionItems.length ? questionItems[0] : null;

  // Dígitos amarelos + donut por estado (o "número do dia").
  const datarow = (() => {
    if (homeState === 'setup') return { v: '~1 min', u: l('É O QUE O SETUP DEMORA', 'THAT’S ALL SETUP TAKES'), p: 15, lab: 'SETUP', color: PELE.yellow };
    if (homeState === 'vespera' || homeState === 'pernoita') return null;   // noites calmas — sem manchete de números (o € da pernoita vive no útil)
    if (homeState === 'ferias' || homeState === 'doenca') return null;      // afastamento/silêncio — nada de números a gritar
    // 'fecho' cai de propósito no ramo do € do mês (a manchete É o total + donut do mês)
    if (homeState === 'posvoo') {
      if (ae && pdToday != null) return { v: eurBare(pdToday), u: l('EUR · PER-DIEM DE HOJE', 'EUR · TODAY’S PER-DIEM'), p: closePct != null ? closePct : 0, lab: closePct != null ? `PSV ${closePct}%` : 'PSV', color: (closeD && closeD.fdp && closeD.fdp.over) ? PELE.red : PELE.yellow };
      if (closeD && closeD.fdp && closeD.fdp.actualFdpStr) return { v: closeD.fdp.actualFdpStr, u: `${l('PSV DE HOJE · MÁX', 'TODAY’S FDP · MAX')} ${closeD.fdp.maxFdpStr || '—'}`, p: closePct || 0, lab: closePct != null ? `PSV ${closePct}%` : 'PSV', color: closeD.fdp.over ? PELE.red : PELE.yellow };
      return null;
    }
    if (homeState === 'disrupcao' && liveVerdict) { const p = psvPct != null ? psvPct : 0; return { v: liveVerdict.realStr, u: `${l('PSV PROJETADO · MÁX', 'PROJECTED FDP · MAX')} ${liveVerdict.maxStr}`, p, lab: `PSV ${p}%`, color: liveVerdict.verdict === 'over' ? PELE.red : PELE.warn }; }
    if (homeState === 'hoje' || homeState === 'disrupcao') {
      // Na DISRUPÇÃO o dinheiro não é manchete — a pergunta é de segurança (PSV).
      if (homeState !== 'disrupcao' && ae && dayPerDiem != null) return { v: eurBare(dayPerDiem), u: l('EUR · PER-DIEM DE HOJE', 'EUR · TODAY’S PER-DIEM'), p: psvPct != null ? psvPct : 0, lab: psvPct != null ? `PSV ${psvPct}%` : 'PSV', color: PELE.yellow };
      if (ndPsvMax) return { v: ndPsvMax, u: l('PSV MÁXIMO DE HOJE', 'TODAY’S MAX FDP'), p: psvPct != null ? psvPct : 0, lab: psvPct != null ? `PSV ${psvPct}%` : 'PSV', color: homeState === 'disrupcao' ? PELE.warn : PELE.yellow };
      return null;
    }
    if (ae && monthMoney != null) return { v: eurBare(monthMoney), u: `EUROS · ${monthName.toUpperCase()} ${l('ESTIMADO', 'ESTIMATED')}`, p: monthPct, lab: `${l('MÊS', 'MONTH')} ${monthPct}%`, color: PELE.yellow };
    if (f28 && f28.limit) { const p = Math.min(100, Math.round((f28.done / f28.limit) * 100)); return { v: `${Math.round(f28.done)}h`, u: l('VOO · ÚLTIMOS 28 DIAS', 'FLIGHT · LAST 28 DAYS'), p, lab: `28D ${p}%`, color: p >= 90 ? PELE.red : p >= 70 ? PELE.warn : PELE.yellow }; }
    return null;
  })();

  // Chip do polegar (preto, dígitos amarelos) + ações COM RÓTULO (a primária destacada).
  const chip = (() => {
    if (homeState === 'setup') return { v: l('PASSO 1', 'STEP 1'), s: l('ligar o calendário', 'connect the calendar') };
    if (homeState === 'vespera') return { v: cdGhost || '—', s: l('até ao report', 'to report') };
    if (homeState === 'pernoita') return (flight && flight.report)
      ? { v: flight.report, s: l('report amanhã', 'report tomorrow') }
      : { v: closeNsStation || '—', s: l('boa noite', 'good night') };
    if (homeState === 'ferias') return { v: String(vacInfo ? vacInfo.left : '—'), s: l('dias restantes no ano', 'days left this year') };
    // Doença: o chip dá o HORIZONTE (próximo serviço) — "quando tenho de estar bom?"
    if (homeState === 'doenca') return flight
      ? { v: `${String(ndDayWd || '').toUpperCase()} ${flight.report || ''}`.trim(), s: l('próximo serviço — se continuares doente, avisa', 'next duty — still sick? let crewing know') }
      : { v: '—', s: l('sem serviço marcado', 'no duty scheduled') };
    if (homeState === 'fecho') return { v: fechoDaysLeft === 0 ? l('HOJE', 'TODAY') : `${fechoDaysLeft} ${fechoDaysLeft === 1 ? l('DIA', 'DAY') : l('DIAS', 'DAYS')}`, s: l('para fechar o mês', 'to month close') };
    if (homeState === 'posvoo') return restUntil
      ? { v: restUntil.hm, s: `${l('repouso até', 'rest until')}${restUntil.nextDay ? ' ⁺¹' : ''}` }
      : (closeD && closeD.fdp && closeD.fdp.actualFdpStr)
        ? { v: closeD.fdp.actualFdpStr, s: `PSV · ${l('máx', 'max')} ${closeD.fdp.maxFdpStr || '—'}` }
        : { v: '✓', s: l('dia fechado', 'day closed') };
    if (homeState === 'disrupcao') { const sch = hm(flightStatus && flightStatus.dep && flightStatus.dep.scheduled); const est = hm(flightStatus && flightStatus.dep && (flightStatus.dep.estimated || flightStatus.dep.actual)); return { old: sch, v: est ? `~${est}` : (sch || '—'), s: l('nova partida', 'new departure') }; }
    if (homeState === 'hoje') return inDuty ? { v: flight.arrTime || ndArr || '—', s: l('termina ~', 'ends ~') } : { v: flight.report || '—', s: `report${ndReportZ ? ` · ${ndReportZ}Z` : ''}` };
    if (!flight || cdMin == null) return { v: '—', s: l('sem próximo serviço', 'no next duty') };
    const v = cdMin >= 2880 ? `${Math.round(cdMin / 1440)} ${l('DIAS', 'DAYS')}` : cdMin >= 60 ? `${Math.floor(cdMin / 60)} H` : `${cdMin} MIN`;
    return { v, s: reportMs != null ? l('até ao report', 'to report') : l('até à partida', 'to departure') };
  })();

  // Partilhar UM voo (cartão + link ao vivo, sem pessoa — folha do sistema). O mesmo
  // construtor serve o voo de HOJE (pré/em voo) e o já ATERRADO da pernoita — a página
  // da família mostra "Aterrou ✓" o dia todo (memória na Edge), partilhar depois é válido.
  const [sendCard, setSendCard] = useState(null);
  const openShareLeg = (lg, date) => {
    if (!lg || !date) return;
    select();
    const dep = String(lg.dep || '').toUpperCase(), arr = String(lg.arr || '').toUpperCase();
    const fno = String(lg.flightNo || lg.flight || '').toUpperCase().replace(/\s+/g, '');
    const toMin2 = (z) => { const m = /^(\d{1,2}):(\d{2})$/.exec(z || ''); return m ? (+m[1] * 60 + +m[2]) : null; };
    const om = toMin2(legZulu(date, lg, 'off')), nm = toMin2(legZulu(date, lg, 'on'));
    const blockMin = (om != null && nm != null) ? ((nm - om + 1440) % 1440) : null;
    setSendCard({ dep, arr, depTime: lg.off || '', arrTime: lg.on || '', flightNo: fno, date, sectors: 1,
      dateLabel: new Date(`${date}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      duration: blockMin ? `${Math.floor(blockMin / 60)}H${String(blockMin % 60).padStart(2, '0')}` : '',
      legs: [{ flight: fno, dep, arr }] });
  };
  const openShareToday = () => {
    if (!flight) return;
    const legsL = sectorLegs.filter((lg) => lg && (lg.flightNo || lg.flight));
    openShareLeg(legsL.length ? legsL[legsL.length - 1] : (flightNo ? { flightNo, dep: flight.depAirport, arr: flight.arrAirport, off: flight.depTime, on: flight.arrTime } : null), flight.dateISO);
  };
  // Pernoita: partilha o voo de HOJE que aterrou fora (a última perna do dia fechado).
  const closeLegs = (todayEnded && Array.isArray(todayEnded.legs)) ? todayEnded.legs.filter((lg) => lg && (lg.flightNo || lg.flight)) : [];
  const openShareClose = () => openShareLeg(closeLegs.length ? closeLegs[closeLegs.length - 1] : null, todayISO);
  const shareable = isToday && !isNonFlight && !(flight && flight.demo) && (sectorLegs.some((lg) => lg && (lg.flightNo || lg.flight)) || !!flightNo);
  const shareableClose = homeState === 'pernoita' && closeLegs.length > 0;
  const acts = homeState === 'setup' ? [
    { ic: 'cal', lbl: l('Ligar calendário', 'Connect calendar'), hot: true, run: requestAccess },
    { ic: 'eye', lbl: l('Ver exemplo', 'See example'), run: () => { select(); setCalFlight(DEMO_FLIGHT); } },
  ] : homeState === 'folga' ? [
    // SEM ações na folga (user 2026-07-09): o ＋ central da tab bar já carrega
    // Serviço·Simulação·Evento — na folga a app baixa a voz (só o chip fica).
  ] : homeState === 'vespera' ? [
    ...(openSimulation ? [{ ic: 'gauge', lbl: l('Simular', 'Simulate'), hot: true, run: () => { select(); openSimulation(); } }] : []),
    ...(featuredTappable ? [{ ic: 'cal', lbl: l('Ver serviço', 'View duty'), run: () => openDayDetail(flight.dateISO) }] : []),
  ] : homeState === 'ferias' ? [
    // afastamento máximo — sem ações (o chip diz o essencial)
  ] : homeState === 'doenca' ? [
    ...(openExtra ? [{ ic: 'plus', lbl: l('Evento', 'Event'), run: () => { select(); openExtra(); } }] : []),   // estender a baixa
  ] : homeState === 'fecho' ? [
    ...(openExtra ? [{ ic: 'plus', lbl: l('Evento', 'Event'), hot: true, run: () => { select(); openExtra(); } }] : []),
    { ic: 'stats', lbl: l('Números', 'Numbers'), run: () => { select(); navigation.navigate('Estatísticas'); } },
  ] : homeState === 'pernoita' ? [
    { ic: 'bed', lbl: 'Hotel', hot: true, run: () => { select(); if (closeHotel) Linking.openURL(hotelMapsUrl(closeHotel.name, closeNsStation, Platform.OS)).catch(() => {}); else setHotelOpen(true); }, longRun: () => { select(); setHotelOpen(true); } },
    ...(shareableClose ? [{ ic: 'share', lbl: l('Partilhar', 'Share'), run: openShareClose }] : []),
    ...(openSimulation ? [{ ic: 'gauge', lbl: l('Simular', 'Simulate'), run: () => { select(); openSimulation(); } }] : []),
  ] : homeState === 'posvoo' ? [
    { ic: 'edit', lbl: 'Sign-off', hot: true, run: () => openDayDetail(todayISO) },
    ...(openSimulation ? [{ ic: 'gauge', lbl: l('Simular', 'Simulate'), run: () => { select(); openSimulation(); } }] : []),
  ] : [
    ...(shareable ? [{ ic: 'share', lbl: l('Partilhar', 'Share'), hot: true, run: openShareToday }] : []),
    ...((flight && flight.nightStop) ? [{ ic: 'bed', lbl: 'Hotel', run: () => { select(); if (nsHotel) Linking.openURL(hotelMapsUrl(nsHotel.name, nsHotelStation, Platform.OS)).catch(() => {}); else setHotelOpen(true); }, longRun: () => { select(); setHotelOpen(true); } }] : []),
    ...(openSimulation ? [{ ic: 'gauge', lbl: l('Simular', 'Simulate'), hot: !shareable, run: () => { select(); openSimulation(); } }] : []),
  ];

  // Tamanho do fantasma DETERMINÍSTICO pelo comprimento (Barlow Condensed ~0.47em/char;
  // largura útil ~346): 1–3 chars a 190 · 4 a 160 · ≥5 a 140. Nada de auto-encolher (bug iOS).
  const ghostLen = hero.ghost ? String(hero.ghost).length : 0;
  const ghostSize = ghostLen >= 5 ? { fontSize: TUNE.ghost.s5, lineHeight: TUNE.ghost.s5 + 2, top: -8 }
    : ghostLen === 4 ? { fontSize: TUNE.ghost.s4, lineHeight: TUNE.ghost.s4 + 2, top: -11 }
    : null;   // null = o TUNE.ghost.s3 do estilo base

  // Kick com partes coloridas ({y:...} = amarelo).
  const kickParts = (parts) => (
    <Text style={s.kick} numberOfLines={2}>
      {parts.map((p, i) => p == null ? null : typeof p === 'string' ? <Text key={i}>{p}</Text> : <Text key={i} style={s.kickY}>{p.y}</Text>)}
    </Text>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Atmosfera — noite: glow de candeeiro (véspera) · dia: HALO da cor do tempo */}
      {night ? (
        <View pointerEvents="none" style={[s.lampWrap, { top: TUNE.lamp.top }]}>
          <Svg width={TUNE.lamp.w} height={TUNE.lamp.h}>
            <Defs>
              <RadialGradient id="lamp" cx="50%" cy="42%" r="55%">
                <Stop offset="0%" stopColor="#FFD678" stopOpacity={String(TUNE.lamp.op)} />
                <Stop offset="60%" stopColor="#FFD678" stopOpacity={String(TUNE.lamp.op / 4)} />
                <Stop offset="100%" stopColor="#FFD678" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={TUNE.lamp.w / 2} cy={TUNE.lamp.h * 0.42} r={TUNE.lamp.w * 0.47} fill="url(#lamp)" />
          </Svg>
        </View>
      ) : haloTone ? (
        <View pointerEvents="none" style={[s.haloWrap, { right: TUNE.halo.right, top: TUNE.halo.top }]}>
          <Svg width={TUNE.halo.size} height={TUNE.halo.size}>
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={haloTone} stopOpacity={String(TUNE.halo.op)} />
                <Stop offset="55%" stopColor={haloTone} stopOpacity={String(TUNE.halo.op / 3)} />
                <Stop offset="100%" stopColor={haloTone} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={TUNE.halo.size / 2} cy={TUNE.halo.size / 2} r={TUNE.halo.size / 2} fill="url(#halo)" />
          </Svg>
        </View>
      ) : null}
      <PeleSide label={sideL[0]} accent={sideL[1]} color={night ? P.ink : undefined} />
      {/* homeScrollRef + useScrollToTop: re-tocar na aba Início volta ao topo (convenção iOS) */}
      <ScrollView ref={homeScrollRef} contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} alwaysBounceVertical
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={P.grey} colors={[P.grey]}
          onRefresh={async () => {
            setRefreshing(true); const t0 = Date.now();
            try { await syncFlight(); } catch { /* ignora */ }
            setFsTick((n) => n + 1);   // re-busca o estado do voo ao vivo
            const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
            setRefreshing(false);
          }} />}>

        {/* Topo LIMPO (2026-07-09): avatar → aba Perfil · sino fixo → header do Perfil.
            Aqui só a saudação + a PÍLULA de novidades — que SÓ EXISTE quando há por ler
            (o botão de notificações à Apple: informação quando há, mobília nunca). */}
        <Animated.View style={[seg(0), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }]}>
          <Text style={[s.greet, { marginTop: 0 }]}>{greet}</Text>
          <NotificationsBell variant="pill" night={night} />
        </Animated.View>

        {/* Banda de alerta — sítio fixo, uma de cada vez */}
        {band ? (
          <Animated.View style={seg(1)}>
            <TouchableOpacity activeOpacity={band.onPress ? 0.85 : 1} onPress={band.onPress} disabled={!band.onPress}
              style={[s.band, band.tone === 'red' ? s.bandRed : null]}
              accessibilityRole={band.onPress ? 'button' : undefined}>
              <Text style={[s.bandT, band.tone === 'red' ? s.bandTRed : null]} numberOfLines={2}>{band.t}</Text>
              {band.s ? <Text style={s.bandS} numberOfLines={2}>{band.s}</Text> : null}
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* HERÓI — fantasma + palavra + kick */}
        {loadingFlight ? <HeroSkeleton /> : (
          <Animated.View style={seg(1)}>
            <View style={s.hero}>
              <View style={s.arrowy}><Icon name={hero.arrow} size={24} color={PELE.yellow} rot={hero.arrowRot} /></View>
              {hero.icon
                ? <View style={s.ghostIcon}><Icon name={hero.icon} size={150} color={PELE.ghost} /></View>
                : /* SEM adjustsFontSizeToFit: no iOS um Text auto-encolhível pode ficar INVISÍVEL
                     num re-render de irmãos (ex.: a meteo a chegar) — tamanho por comprimento. */
                <Text style={[s.ghost, ghostSize]} numberOfLines={1} allowFontScaling={false}>{hero.ghost}</Text>}
              {/* Tempo como EXPOENTE do fantasma (folga: base · pernoita: a estação onde
                  dormes). Na FOLGA o expoente é o carimbo completo do dia: ícone + min–máx
                  por baixo (o kick morreu — sem "hoje" escrito, o fantasma É hoje). */}
              {(homeState === 'folga' || homeState === 'pernoita' || homeState === 'ferias') && wxArr && wxArr.icon ? (
                <View style={{ position: 'absolute', right: TUNE.wxSup.right, top: TUNE.wxSup.top, alignItems: 'flex-end' }}>
                  <Icon name={wxArr.icon} size={TUNE.wxSup.size} color={P.grey} />
                  {homeState === 'folga' ? (
                    <Text style={s.wxSupTxt} allowFontScaling={false}>
                      {(wxArr.min != null && wxArr.max != null) ? `${wxArr.min}°–${wxArr.max}°` : `${wxArr.c}°`}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Text style={[s.word, hero.warn ? s.wordWarn : null]} numberOfLines={1} allowFontScaling={false}>{hero.word}</Text>
              {hero.kick ? kickParts(hero.kick) : null}
            </View>
            <View style={s.hr} />
          </Animated.View>
        )}

        {/* A VOZ do estado — DECK de duas alturas sob a régua (4.ª iteração do user:
            "diferente a nível visual, o marcador fica"): a parte que importa em BARLOW
            CONDENSED grande (a família do poster) com o MARCADOR AMARELO por cima; a cauda
            desce para um sussurro Hanken cinza. Marcador em constantes PELE (ink sobre
            amarelo) — igual de dia e de noite, como um marcador real. */}
        {voice ? (
          <Animated.View style={[s.voiceWrap, seg(2), { transform: [{ rotate: `${noteTilt}deg` }], marginLeft: noteShift, marginRight: 10 - noteShift }]}>
            {/* cap 1.2 no dynamic type: manuscrita inclinada a escalar 1.4 quebrava o bilhete */}
            <Text style={s.voiceNote} numberOfLines={3} maxFontSizeMultiplier={1.2}><Text style={s.voiceHl}>{' '}{voice.bold}{' '}</Text> {voice.tail}</Text>
          </Animated.View>
        ) : null}

        {/* MEIO ADAPTATIVO — horas do voo · linha do serviço · agenda da folga · setup */}
        <Animated.View style={[s.mid, seg(2)]}>
          {/* EM VOO: barra de progresso do setor ativo (instantes planeados; anda com o tick) */}
          {midTimes && sectorPct != null ? (
            <View style={s.progRow}>
              <View style={s.tap}><Text style={s.tapS} numberOfLines={1}>PROG</Text></View>
              <View style={s.progTrack}><View style={[s.progFill, { width: `${sectorPct}%` }]} /></View>
              <Text style={s.progPct}>{sectorPct}%</Text>
            </View>
          ) : null}
          {midTimes ? midTimes.map((r, i) => (
            <TouchableOpacity key={i} activeOpacity={featuredTappable ? 0.75 : 1} onPress={openFeatured} disabled={!featuredTappable} style={s.trow}
              accessibilityRole={featuredTappable ? 'button' : undefined}>
              <View style={s.tap}><Text style={s.tapT} numberOfLines={1}>{r.ap}</Text><Text style={s.tapS} numberOfLines={1}>{r.aps}</Text></View>
              <Text style={[s.tbig, r.cls === 'ok' ? s.tbigOk : r.cls === 'warn' ? s.tbigWarn : null]} numberOfLines={1}>{r.big}</Text>
              {r.old ? <Text style={s.told} numberOfLines={1}>{r.old}</Text> : null}
              <View style={s.tst}>
                <Text style={[s.tstT, r.stTone === 'ok' ? { color: P.ok } : r.stTone === 'warn' ? { color: P.warn } : null]} numberOfLines={1}>{r.st}</Text>
                {r.sts ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                    {r.stsIcon ? <Icon name={r.stsIcon} size={12} color={P.grey} /> : null}
                    <Text style={[s.tstS, { marginTop: 0 }]} numberOfLines={1}>{r.sts}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )) : midPlain ? (
            <>
              <TouchableOpacity activeOpacity={featuredTappable ? 0.75 : 1} onPress={openFeatured} disabled={!featuredTappable} style={s.trow}>
                <View style={s.tap}><Text style={s.tapT} numberOfLines={1}>{midPlain.t}</Text><Text style={s.tapS}>{l('HOJE', 'TODAY')}</Text></View>
                <Text style={[s.tbig, midPlain.s.length > 11 ? { fontSize: 36, lineHeight: 38 } : null]} numberOfLines={1}>{midPlain.s}</Text>
              </TouchableOpacity>
              {/* Standby: a única pergunta que importa — "se me chamarem agora, até onde me podem levar?" (225) */}
              {psvUntil ? (
                <View style={s.trow}>
                  <View style={s.tap}><Text style={s.tapS} numberOfLines={1}>{l('SE CHAMADO', 'IF CALLED')}</Text></View>
                  <Text style={s.tbig} numberOfLines={1}>{psvUntil}</Text>
                  <View style={s.tst}>
                    <Text style={s.tstT} numberOfLines={1}>{l('PSV até', 'FDP until')}</Text>
                    <Text style={s.tstS} numberOfLines={1}>{l('máx', 'max')} {ndPsvMax}</Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : midHotel ? (
            midHotel.hotel ? (
              <TouchableOpacity style={s.hotelRow} activeOpacity={0.85}
                onPress={() => { select(); Linking.openURL(hotelMapsUrl(midHotel.hotel.name, midHotel.station, Platform.OS)).catch(() => {}); }}
                onLongPress={() => { select(); setHotelOpen(true); }}
                accessibilityRole="button" accessibilityLabel={midHotel.hotel.name}
                accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
                <Icon name="bed" size={18} color={P.ink} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.hotelName} numberOfLines={1}>{midHotel.hotel.name}</Text>
                  {midHotel.hotel.note ? <Text style={s.hotelNote} numberOfLines={1}>{midHotel.hotel.note}</Text> : null}
                </View>
                <Text style={s.hotelGo}>{l('Mapas', 'Maps')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.hotelAdd} activeOpacity={0.8} onPress={() => { select(); setHotelOpen(true); }} accessibilityRole="button">
                <Icon name="plus" size={14} color={P.grey} />
                <Text style={s.hotelAddTxt}>{l('adicionar o hotel desta pernoita', 'add this night stop’s hotel')}</Text>
              </TouchableOpacity>
            )
          ) : midClose ? midClose.map((c) => (
            <TouchableOpacity key={c.k} style={s.trow} activeOpacity={0.75} onPress={() => openDayDetail(todayISO)} accessibilityRole="button">
              <View style={s.tap}><Text style={s.tapS} numberOfLines={1}>{c.k}</Text></View>
              <Text style={s.tbig} numberOfLines={1}>{c.v}</Text>
            </TouchableOpacity>
          )) : midFecho ? midFecho.map((c) => (
            <TouchableOpacity key={c.k} style={s.trow} activeOpacity={0.75} onPress={() => { select(); navigation.navigate('Estatísticas'); }} accessibilityRole="button">
              <View style={[s.tap, { width: 96 }]}><Text style={s.tapS} numberOfLines={1}>{c.k}</Text></View>
              <Text style={[s.tbig, { fontSize: 32, lineHeight: 34 }]} numberOfLines={1}>{c.v}</Text>
            </TouchableOpacity>
          )) : agendaRows ? (agendaRows.length ? (
            <>
              {/* título VIVO: o estado do próximo serviço (amanhã / faltam X h), não etiqueta morta */}
              <Text style={s.agHead}>
                {agendaWhen ? (<>{agendaWhen.pre}<Text style={s.agHeadHi}>{agendaWhen.hi}</Text></>) : l('A seguir', 'Up next')}
              </Text>
              {agendaRows.map((a) => (
                <TouchableOpacity key={a.iso} style={s.ag} activeOpacity={0.75} onPress={() => openDayDetail(a.iso)} accessibilityRole="button">
                  <View style={{ alignItems: 'flex-end', flex: 1, minWidth: 0 }}>
                    <Text style={s.agA} numberOfLines={1}>{a.a1}</Text>
                    <Text style={s.agB} numberOfLines={1}>{a.a2}</Text>
                  </View>
                  <View style={s.agTick} />
                </TouchableOpacity>
              ))}
            </>
          ) : <Text style={s.agEmpty}>{l('nada marcado — desfruta ✌️', 'nothing scheduled — enjoy ✌️')}</Text>) : homeState === 'setup' ? (
            <>
              <TouchableOpacity style={s.stp} activeOpacity={0.8} onPress={requestAccess} accessibilityRole="button">
                <Text style={s.stpN}>1</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.stpT}>{l('Ligar o calendário do telemóvel', 'Connect your phone calendar')}</Text>
                  <Text style={s.stpS}>{l('é daí que a app lê a tua escala — nunca mais escreves um voo à mão', 'that’s where the app reads your roster — never type a flight again')}</Text>
                </View>
                <Icon name="chevron" size={14} color={PELE.ink} />
              </TouchableOpacity>
              <View style={s.tip}>
                <Icon name="sync" size={14} color={PELE.ink} />
                <Text style={s.tipTxt}>{l('No eCrew, ativa o sync para o calendário do telemóvel. Com ele ligado, a escala chega sempre atualizada — e a app trabalha sem erros.', 'In eCrew, enable sync to your phone calendar. With it on, your roster always arrives fresh — and the app just works.')}</Text>
              </View>
            </>
          ) : null}
        </Animated.View>

        {/* Micro-texto útil */}
        <Animated.View style={seg(3)}>
          <TouchableOpacity style={s.util} activeOpacity={utilTap ? 0.75 : 1} onPress={utilTap ? () => { select(); setDetailItem(utilTap); } : undefined} disabled={!utilTap}
            accessibilityRole={utilTap ? 'button' : undefined}>
            <Text style={s.utilTtl} numberOfLines={1}>{utilTtl}</Text>
            <Text style={s.utilP} numberOfLines={3}>{utilTxt}</Text>
          </TouchableOpacity>
          {/* Documento crítico — ao pé do Estado (não na banda): vermelho, toca → porquê. */}
          {docAlert ? (
            <TouchableOpacity style={s.docAlert} activeOpacity={0.8} onPress={() => { select(); setDetailItem(docAlert); }}
              accessibilityRole="button" accessibilityLabel={docAlert.q}>
              <Icon name="alert" size={14} color={P.red} />
              <Text style={s.docAlertTxt} numberOfLines={2}>{docAlert.answer}{docAlert.suggestion ? <Text style={s.docAlertSub}>  ·  {docAlert.suggestion}</Text> : null}</Text>
            </TouchableOpacity>
          ) : null}
          {longHaul ? <Text style={s.lhNote} numberOfLines={2}>{l('FTL automático assume aclimatizado e na base — em longo-curso confirma na calculadora.', 'Auto FTL assumes acclimatised and in-base — for long-haul check the calculator.')}</Text> : null}
        </Animated.View>

        {/* Dígitos amarelos + donut */}
        {datarow ? (
          <Animated.View style={[s.datarow, seg(4)]}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={[s.bigy, String(datarow.v).length > 9 ? { fontSize: 44, lineHeight: 46 } : null]} numberOfLines={1} allowFontScaling={false}>{datarow.v}</Text>
              <Text style={s.bigyU} numberOfLines={1}>{datarow.u}</Text>
            </View>
            <Donut p={datarow.p} color={datarow.color} label={datarow.lab} />
          </Animated.View>
        ) : null}

        {/* Barra do polegar — chip + ações com rótulo */}
        <Animated.View style={[s.thumb, seg(5)]}>
          <View style={s.chip}>
            <Text style={s.chipV} numberOfLines={1}>{chip.old ? <Text style={s.chipOld}>{chip.old} </Text> : null}{chip.v}</Text>
            <Text style={s.chipS} numberOfLines={1}>{chip.s}</Text>
          </View>
          <View style={s.acts}>
            {acts.map((a) => (
              <TouchableOpacity key={a.lbl} style={s.act} activeOpacity={0.8} onPress={a.run} onLongPress={a.longRun}
                accessibilityRole="button" accessibilityLabel={a.lbl}>
                <View style={[s.actC, a.hot ? s.actHot : null]}><Icon name={a.ic} size={16} color={a.hot ? (night ? PELE_NIGHT.paper : PELE.yellow) : P.ink} /></View>
                <Text style={[s.actL, a.hot ? { color: P.ink } : null]} numberOfLines={1}>{a.lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Hotel da pernoita — registar/editar (estação derivada da escala). */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={closeNsStation || nsHotelStation} />

      {/* Folha "porquê" — abre da banda (alerta) ou do micro-texto útil. */}
      <QuestionDetailSheet item={detailItem} lang={lang}
        onClose={() => setDetailItem(null)}
        onNav={(dest) => {
          setDetailItem(null);
          if (dest && dest.root) navigation.navigate(dest.root, dest.screen ? { screen: dest.screen } : undefined);
        }} />

      {/* Partilhar o voo de hoje — o MESMO cartão editorial da família (sem pessoa). */}
      <FlightShareCard visible={!!sendCard} onClose={() => setSendCard(null)}
        dep={sendCard ? sendCard.dep : undefined} arr={sendCard ? sendCard.arr : undefined}
        depTime={sendCard ? sendCard.depTime : undefined} arrTime={sendCard ? sendCard.arrTime : undefined}
        flightNo={sendCard ? sendCard.flightNo : undefined} dateLabel={sendCard ? sendCard.dateLabel : undefined}
        sectors={sendCard ? sendCard.sectors : undefined} duration={sendCard ? sendCard.duration : undefined}
        date={sendCard ? sendCard.date : undefined} legs={sendCard ? sendCard.legs : undefined} />
    </SafeAreaView>
  );
}

// ── Estilos da pele — FÁBRICA dia/noite (P = PELE ou PELE_NIGHT; medidas do mockup) ──
const makeSkin = (P, night) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.paper },
  scroll: { paddingHorizontal: 22, flexGrow: 1 },
  greet: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: P.grey, marginTop: 10 },

  // Banda de alerta (mockup .alertband): sangra até às margens, borda fina acima/abaixo.
  band: { marginTop: 9, marginHorizontal: -22, paddingHorizontal: 22, paddingVertical: 8, backgroundColor: P.warnSoft, borderTopWidth: 1, borderBottomWidth: 1, borderColor: night ? 'rgba(240,138,60,0.35)' : '#F2CBA5' },
  bandRed: { backgroundColor: P.redSoft, borderColor: night ? 'rgba(229,115,104,0.35)' : '#E7C0BA' },
  bandT: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: P.warn },
  bandTRed: { color: P.red },
  bandS: { fontSize: 10, fontFamily: PELE_FONT.bodyMed, color: night ? '#E8B27E' : '#B07840', marginTop: 1 },

  // Herói (mockup .hero/.ghostnum/.word/.kick — o Início fala mais alto: 170/56)
  hero: { position: 'relative', minHeight: 200, marginTop: 8, justifyContent: 'flex-end', paddingBottom: 4 },
  arrowy: { position: 'absolute', left: 2, top: 6 },
  // left:0 + right + textAlign right = largura LIMITADA — obrigatório: adjustsFontSizeToFit
  // num Text absoluto só-ancorado-à-direita não renderiza no iOS (padrão provado no FlightShareCard).
  // right 12 (era -2): o fantasma recua à esquerda p/ não pisar o rótulo rodado da margem.
  ghost: { position: 'absolute', left: 0, right: 12, top: -14, fontFamily: PELE_FONT.display, fontSize: TUNE.ghost.s3, lineHeight: TUNE.ghost.s3 + 2, letterSpacing: -4, color: P.ghost, textAlign: 'right' },
  ghostIcon: { position: 'absolute', right: 18, top: 10 },
  word: { fontFamily: PELE_FONT.display, fontSize: 56, lineHeight: 58, letterSpacing: -0.5, color: P.ink },
  wordWarn: { color: P.warn },
  kick: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: P.grey, marginTop: 6 },
  kickY: { color: P.yellow, fontFamily: PELE_FONT.bodyHeavy },
  // min–máx por baixo do ícone do tempo (expoente da folga) — o carimbo do dia
  wxSupTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyBold, color: P.grey, marginTop: 2 },
  hr: { height: 1.5, backgroundColor: P.ink, marginTop: 8 },

  // Meio adaptativo (mockup .mid/.trow/.ag/.stp/.tip)
  mid: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.line },
  trow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 6 },
  tap: { width: 74 },
  tapT: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy, color: P.ink },
  tapS: { fontSize: 9.5, fontFamily: PELE_FONT.bodyBold, letterSpacing: 1.5, color: P.grey, marginTop: 1 },
  tbig: { fontFamily: PELE_FONT.display, fontSize: 46, lineHeight: 48, color: P.ink },
  tbigOk: { color: P.ok },
  tbigWarn: { color: P.warn },
  told: { fontFamily: PELE_FONT.display, fontSize: 22, color: '#B9B8B2', textDecorationLine: 'line-through' },
  tst: { marginLeft: 'auto', alignItems: 'flex-end' },
  tstT: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: P.ink },
  tstS: { fontSize: 10, fontFamily: PELE_FONT.bodyMed, color: P.grey, marginTop: 1 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  progTrack: { flex: 1, height: 3, backgroundColor: P.line, borderRadius: 2, overflow: 'hidden' },
  progFill: { height: 3, backgroundColor: P.yellow, borderRadius: 2 },
  progPct: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: P.grey, width: 38, textAlign: 'right' },
  // título VIVO da agenda (folga) — alinhado à direita; o tempo que falta vai a amarelo
  agHead: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 2, textTransform: 'uppercase', color: P.grey, textAlign: 'right', marginTop: 2, marginBottom: 2 },
  agHeadHi: { color: P.yellow },
  ag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 9, paddingVertical: 6 },
  agA: { fontSize: 13, fontFamily: PELE_FONT.bodyHeavy, color: P.ink },
  agB: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: P.grey, marginTop: 1 },
  agTick: { width: 2.5, height: 26, backgroundColor: P.ink, borderRadius: 2 },
  agEmpty: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: P.grey, textAlign: 'right', paddingVertical: 10 },
  hotelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  hotelName: { fontSize: 14, fontFamily: PELE_FONT.bodyHeavy, color: P.ink },
  hotelNote: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: P.grey, marginTop: 1 },
  hotelGo: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: P.ink },
  hotelAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderWidth: 1.5, borderColor: P.line, borderStyle: 'dashed', borderRadius: 12, marginVertical: 4 },
  hotelAddTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: P.grey },
  stp: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 7 },
  stpN: { width: 40, fontFamily: PELE_FONT.display, fontSize: 34, color: P.yellow, lineHeight: 36 },
  stpT: { fontSize: 13, fontFamily: PELE_FONT.bodyHeavy, color: P.ink },
  stpS: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: P.grey, marginTop: 1 },
  tip: { marginTop: 8, backgroundColor: '#FFF6DC', borderWidth: 1, borderColor: '#F2E2AC', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipTxt: { flex: 1, fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: '#5C5232', lineHeight: 17 },

  // Micro-texto útil (mockup .util)
  util: { flexDirection: 'row', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.line },
  utilTtl: { width: 70, fontFamily: PELE_FONT.display, fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5, color: P.ink },
  utilP: { flex: 1, fontSize: 11.5, fontFamily: PELE_FONT.bodyMed, color: P.grey, lineHeight: 18 },
  haloWrap: { position: 'absolute', right: -150, top: -100, zIndex: 0 },
  lampWrap: { position: 'absolute', alignSelf: 'center', top: -70, zIndex: 0 },
  // A voz sob a régua — deck de duas alturas: display marcado + cauda-sussurro.
  // A voz sob a régua — BILHETE MANUSCRITO (Caveat, escolha final do user): uma caneta só,
  // marcador amarelo no que importa (constantes PELE — igual de dia e de noite). O ângulo
  // e o desvio são LIVRES e vêm inline (noteTilt/noteShift — determinísticos pelo dia).
  voiceWrap: { paddingTop: 22, paddingBottom: 10 },   // respiro sob a régua (user: "estava muito perto")
  voiceNote: { fontFamily: PELE_FONT.hand, fontSize: 25, lineHeight: 32, color: P.grey },
  voiceHl: { color: PELE.ink, backgroundColor: PELE.yellow },
  docAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: P.line },
  docAlertTxt: { flex: 1, fontSize: 11.5, fontFamily: PELE_FONT.bodyHeavy, color: P.red, lineHeight: 16 },
  docAlertSub: { fontFamily: PELE_FONT.bodyMed, color: P.grey },
  lhNote: { fontSize: 10, fontFamily: PELE_FONT.bodyMed, color: P.grey, marginTop: 6 },

  // Dígitos amarelos + donut (mockup .datarow/.bigy/.donut)
  datarow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 12, paddingBottom: 6 },
  bigy: { fontFamily: PELE_FONT.display, fontSize: 54, lineHeight: 56, color: P.yellow, letterSpacing: 1 },
  bigyU: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 2, color: P.grey, marginTop: 4 },

  // Barra do polegar (mockup .thumb/.chip/.acts)
  thumb: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 10, marginTop: 'auto' },
  chip: { backgroundColor: P.ink, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12 },
  chipV: { fontFamily: PELE_FONT.display, fontSize: 21, lineHeight: 22, color: night ? P.paper : P.yellow, letterSpacing: 0.5 },
  chipOld: { color: P.onInkSub, textDecorationLine: 'line-through' },
  chipS: { fontSize: 7.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.5, color: P.onInkFaint, marginTop: 3, textTransform: 'uppercase' },
  acts: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  act: { alignItems: 'center', gap: 3, maxWidth: 78 },
  actC: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: P.line, alignItems: 'center', justifyContent: 'center' },
  actHot: { backgroundColor: P.ink, borderColor: P.ink },
  actL: { fontSize: 8.5, fontFamily: PELE_FONT.bodyBold, color: P.grey, textAlign: 'center' },
});

const sDay = makeSkin(PELE, false);
const sNight = makeSkin(PELE_NIGHT, true);
