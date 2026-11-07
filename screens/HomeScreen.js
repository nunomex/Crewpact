import React, { useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, AppState, RefreshControl, Linking, Platform, useWindowDimensions, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PELE, PELE_NIGHT, PLATE, PELE_FONT, TXT, TYPE, SPACE, RADIUS, BRAND, GUTTER } from '../data/constants';
import Icon from '../components/Icon';
import NotificationsBell from '../components/NotificationsBell';
import FlightShareCard from '../components/FlightShareCard';
import { getUpcomingFlight } from '../data/calendar';
import { catLabel } from '../data/extras';
import { serviceMoney, aeIndex, annualLabel } from '../data/perdiem';
import { isLongHaulCompany } from '../data/capabilities';
import { computeDutyTime, computeFlightTime, computeDuty, ftlForDuty, liveFdpVerdict } from '../ftl';
import { restUntilAfter } from '../data/today';
import Skeleton from '../components/Skeleton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import useReduceMotion from '../hooks/useReduceMotion';
import { useFocusEffect, useScrollToTop, useIsFocused } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, toZulu } from '../data/appContext';
import { airportZulu, legZulu, legsZulu } from '../data/zulu';
import QuestionDetailSheet from '../components/QuestionDetailSheet';
import { buildTodayItems } from './hojeItems';
import { fdpForDuty, dayNum } from '../ae/tapLimits';
import { fmtClock } from '../data/tapLimitsText';
import { monthStats, yearStats, monthSplit } from '../data/stats';
import { fetchStationWx, wxDigest, wxIcon, wxSymbol } from '../data/weather';
import { stateVoice } from '../data/stateVoice';
import { dutyLine, fmtMargin } from '../data/dutyLine';
import { crewState } from '../data/crewState';
import { monthAudit } from '../data/audit';
import AuditSheet from '../components/AuditSheet';
import { yearCount, eventCounts } from '../data/aeEvents';
import { liveRdp } from '../data/disruption';
import { fetchFlightStatus, fetchAircraftStatus, fetchAirportStats, hasDeviation, worstDelay, arrDelayMin, recordBehindLive, settledArrZ, schedArrZ, inboundGap, airportDisruption, activeLegIndex, legNo } from '../data/flightStatus';
import { nightStopStation, hotelMapsUrl } from '../data/hotels';
import { scheduleWakeUp } from '../data/reminders';
import HotelSheet from '../components/HotelSheet';
import AsyncStorage from '../data/secureStorage';
import WelcomeSheet from '../components/WelcomeSheet';
import Tip from '../components/Tip';

// ══ INÍCIO v6 (2026-11-03 — esboço APROVADO pelo Nuno: design/inicio-v6.html, versão 3) ══════════════
// Um só sistema com duas intensidades:
//   AO VIVO (véspera · hoje · disrupção · pernoita) = a PLACA escura do painel de partidas: a HORA do
//     próximo marco a amarelo (BRAND.panel, fixo em todas as edições), a contagem no rótulo, o estado
//     numa pílula. Os dígitos viram como o painel Solari.
//   CALMO (folga · pós-voo · férias · doença · fecho · configuração) = papel e o NÚMERO enorme a tinta.
// Sempre: as linhas do painel com o que vem a seguir (hora · destino · dia), os 2 SECUNDÁRIOS da fila de
// prioridades (nunca vazio → o dinheiro do mês) e 3 TECLAS no mesmo sítio, ao polegar (tabela da v4).
// Saíram: o halo (sistema de luz), o bilhete manuscrito, o fantasma pálido, o chip das horas e a barra
// de ações. FICAM intactos: o motor (data/crewState.js), as frases (data/stateVoice.js) e os cálculos.
// Para quem usa: o tripulante às 4h, de pé, numa mão, com sono — um número enorme, poucas palavras,
// teclas grandes (≥ 88 pt de altura) na metade de baixo.

// ── DEMO: voo de exemplo (o "ver um exemplo" da configuração). SHOW_DEMO_FLIGHT força-o sempre.
const SHOW_DEMO_FLIGHT = false;
// ── DEV: forçar um estado para o ver no iPhone sem esperar pelo gatilho real (a véspera só dispara
// ≥ 18h). Valores: 'setup' | 'folga' | 'hoje' | 'disrupcao' | 'vespera' | 'posvoo' | 'pernoita' |
// 'ferias' | 'doenca' | 'fecho' — ou null = estado REAL. Voltar a null depois de ver!
const FORCE_HOME_STATE = null;
// ── AFINAÇÕES visuais (sessão "testar os estados") — números do olho, mexer AQUI.
const TUNE = {
  live: { size: 104 },                                  // a HORA ao vivo (esboço: 104 pt)
  calm: { max: 150, min: 56, charW: 0.5 },              // o número calmo: 150 pt, encolhe pelo comprimento (Barlow ≈ 0,47 em/dígito)
  // Altura da linha = o tamanho (a medida PROVADA no iPhone: abaixo disso o iOS cortou fantasmas). A Barlow tem
  // 1,2 em de altura natural e dígitos de 0,7 em (lido da fonte, 2026-11-03) → sobram ~0,1–0,2 em por cima e por
  // baixo. `trim` aperta a caixa com margens negativas (não cortam a letra): 0,08 em ≈ a linha de 0,84 do esboço.
  trim: 0.08,
  // Por baixo o vazio é maior (descendentes) — MEDIDO no iPhone a 2026-11-03, alvo ~20 pt visíveis (Tempo da Apple):
  //   por baixo a ROTA (Barlow 44, com vazio em cima): com 0,08 dava 35 pt (em voo, 104) → 0,22.
  //   por baixo uma FRASE (letra normal, sem vazio em cima): com 0,22 dava 6 pt no pós-voo (150) e ~11 no standby (104) → 0,13.
  //   (Era "ao vivo/calmo"; o standby — ao vivo com frase — mostrou que conta o que vem a SEGUIR. 2026-11-04.)
  trimBottom: { dest: 0.22, text: 0.13 },
  flip: { dur: 460, stagger: 70 },                       // Solari: cada dígito vira em 460 ms, cascata de 70 ms
  dot: { leg: 650 },                                     // ponto "ao vivo": 650 ms por perna (motion §3, loops)
  wakeBefore: 75,                                        // lembrete para acordar: report − 75 min (vestir + caminho)
  // Ritmo da placa — MEDIDO contra o Tempo da Apple (referencias/inicio/placa-ritmo-tempo-apple.jpg): ~20 pt
  // VISÍVEIS de cada lado do número. Os dígitos (Barlow, caixa aparada pelo `trim`) trazem ~7 pt vazios em cima e
  // em baixo dentro da própria caixa → rótulo→número = 12 + 7 ≈ 19 · número→rota = 7 + 6 + 7 ≈ 20.
  // (1.ª tentativa, 2 e 12, deu 9 e 33 visíveis no iPhone — "não está bom", Nuno 2026-11-03.)
  // `keys` = o salto EXTRA antes das teclas (somado ao gap 12 do corpo → 16 entre grupos; 8 entre secundários).
  // Contas (390 × 844): o estado mais cheio passa de 703 para 713 pt nos 714 úteis.
  rhythm: { inGroup: SPACE.md, between: SPACE.sm, keys: SPACE.xs },
  // A rota (Barlow 44, caixa de 46) traz ~7 pt vazios por baixo: com o que vem a seguir (linha/barra) a rota→linha
  // dava 16 pt visíveis = o salto número→rota (pernoita, iPhone 2026-11-03). Apara-se → ~9; número→rota sobe p/ ~20.
  destTrim: 0.15,
  // ARRUMAÇÃO "DOCUMENTO" (Nuno, 2026-11-03, refs Neo Financial · X Money · N26): tudo encostado ao topo, as
  // teclas LOGO a seguir aos secundários, o espaço livre no FIM (lê-se como o fim da página, não um buraco).
  // Recusado: número centrado numa placa que cresce ("palco" dentro de uma caixa com aresta — flutuava) e as
  // teclas presas ao fundo (deixavam o vazio entre os secundários e as teclas).
};
const DEMO_FLIGHT = (() => {
  const dep = new Date(); dep.setDate(dep.getDate() + 1); dep.setHours(6, 40, 0, 0); // partida amanhã 06:40 (report 05:40)
  const iso = `${dep.getFullYear()}-${String(dep.getMonth() + 1).padStart(2, '0')}-${String(dep.getDate()).padStart(2, '0')}`;
  return { demo: true, kind: 'flight', dateISO: iso, report: '05:40', depAirport: 'LIS', arrAirport: 'FNC', depTime: '06:40', arrTime: '08:20', sectors: 2, stations: ['LIS', 'FNC'], startDate: dep };
})();
// Código curto de um serviço que não é voo, para a coluna "Destino" do painel.
const KIND_CODE = {
  pt: { standby_airport: 'SBY', standby_home: 'SBY', reserve: 'RSV', training: 'FORM', office: 'ESC', positioning: 'POS' },
  en: { standby_airport: 'SBY', standby_home: 'SBY', reserve: 'RSV', training: 'TRG', office: 'OFF', positioning: 'POS' },
};

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

// A estação "fora" de uma rota (ida-volta LIS-CDG-LIS → CDG; LGW-LIS → LIS).
function awayStation(route) {
  const ap = String(route || '').split(/[^A-Za-z]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (!ap.length) return null;
  const dep = ap[0], last = ap[ap.length - 1];
  return ap.length > 1 ? (last !== dep ? last : ap[1]) : dep;
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

// ── SOLARI: cada dígito vira uma vez, em cascata, como o painel de partidas. Entra quando o ecrã
// ganha foco e quando o carácter muda (a chave do pai muda). Movimentos reduzidos = troca seca.
// Nada fica escondido: se a animação for interrompida, o dígito fica no estado final.
function FlipChar({ ch, delay, reduce, style }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  // Interpolações criadas UMA vez (re-renders a meio da viragem — o relógio de 30 s, o tempo a chegar — não as trocam).
  const anim = useRef(null);
  if (!anim.current) anim.current = {
    rotateX: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['-90deg', '12deg', '0deg'] }),
    opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
  };
  useEffect(() => {
    if (reduce) { v.setValue(1); return undefined; }
    const a = Animated.timing(v, { toValue: 1, duration: TUNE.flip.dur, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start(({ finished }) => { if (!finished) v.setValue(1); });
    return () => a.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (reduce) return <Text style={style} allowFontScaling={false}>{ch}</Text>;
  return <Animated.Text style={[style, { opacity: anim.current.opacity, transform: [{ perspective: 400 }, { rotateX: anim.current.rotateX }] }]} allowFontScaling={false}>{ch}</Animated.Text>;
}

// Ponto "ao vivo" (cor da edição: BRAND.onDark). Pulsa só com o ecrã à vista; reduzido = parado.
function LiveDot({ color, reduce, active }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce || !active) { v.setValue(1); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.35, duration: TUNE.dot.leg, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: TUNE.dot.leg, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, active, v]);
  return <Animated.View style={[st.dot, { backgroundColor: color, opacity: v }]} />;
}

// Esqueleto do 1.º carregamento — a mesma forma da placa (rótulo · número · destino · 2 linhas).
function BoardSkeleton() {
  return (
    <View style={{ paddingTop: SPACE.lg, gap: SPACE.md }}>
      <Skeleton w={150} h={12} r={4} />
      <Skeleton w={190} h={96} r={8} />
      <Skeleton w={240} h={20} r={6} />
      <Skeleton w={'100%'} h={40} r={6} />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
  const reduce = useReduceMotion();
  // "A seguir" (Nuno, 2026-11-03): ABERTO até 3 serviços; com mais, "Mais N ⌄" abre o resto (refs WHOOP/Meetup).
  // Até 3 SE COUBER sem deslizar: o ecrã mede-se (conteúdo vs. janela) e, se passar, desce para 2 — no "em voo"
  // com frase e 2 cartões de texto, 3 linhas passavam ~30 pt. Volta a 3 a cada estado/fase novo.
  const [nextOpen, setNextOpen] = useState(false);
  const [rowsCap, setRowsCap] = useState(3);
  const viewH = useRef(0);
  const toggleNext = () => {
    select();
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(280, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setNextOpen((v) => !v);
  };
  const isFocused = useIsFocused();
  const { width: winW } = useWindowDimensions();
  const { user, lang, ftlSnap, dayLog, duties, company, calendarId, ae, crewCategory, crewContract, crewFleet, crewHistory, isPilot, rosterChanges, aeEvents, validities, markLiveSync, base, homeBaseAt, cabinGapMin, splitAdminMin, hotels, postFlightMin, vacationDaysYear, openSimulation, openExtra, setHomeNight, serviceStart, largada, rosterLog, notify, lifestyle } = useContext(AppContext);
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
  const todayItems = useMemo(
    () => buildTodayItems({ ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, crewHistory, serviceStart, largada, lifestyle, aeEvents, validities, isPilot, todayISO, aeToday, postFlightMin, baseAt: homeBaseAt, companySlug: company && company.slug }, lang),
    [ftlSnap, dayLog, duties, rosterChanges, ae, crewCategory, crewContract, crewFleet, crewHistory, serviceStart, largada, lifestyle, aeEvents, validities, isPilot, todayISO, aeToday, postFlightMin, homeBaseAt, company, lang],
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
  const syncingRef = useRef(false);
  const syncFlight = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      // Só lê o calendário se houver um LIGADO (sem prompt; sem leitura "às cegas").
      const res = calendarId ? await getUpcomingFlight(company, calendarId) : { ok: false, flight: null };
      setCalOk(res.ok); setCalErr(false);
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
  // Solari: muda a cada foco → os dígitos viram outra vez (é a entrada do ecrã).
  const [flipKey, setFlipKey] = useState(0);
  useFocusEffect(useCallback(() => {
    setFlipKey((k) => k + 1);
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
  const ndReportZ = (flight && flight.report) ? (airportZulu(flight.dateISO, flight.report, flight.depAirport) || toZulu(flight.dateISO, flight.report)) : null;

  // € sempre com cêntimos (regra da casa) — "1 284,50" (o símbolo vem à parte).
  const eurBare = (n) => { const [i, d] = Number(n).toFixed(2).split('.'); return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ')}${lang === 'en' ? '.' : ','}${d}`; };
  const eur = (n, sign = '') => (lang === 'en' ? `${sign}€${eurBare(n)}` : `${sign}${eurBare(n)} €`);
  // Per-diem do DIA (todos os setores da rota).
  let dayPerDiem = null;
  if (flight && ae && crewCategory && flight.route) {
    // O MESMO valor que entra no mês (o índice do mês incluído — auditoria L10, bloco 6).
    dayPerDiem = serviceMoney(ae, crewCategory, flight, { date: flight.dateISO || todayISO, fleet: crewFleet }).perDiem;
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

  const enter = useEnter();
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
  // AO VIVO = a placa escura do painel de partidas.
  const live = homeState === 'vespera' || homeState === 'hoje' || homeState === 'disrupcao' || homeState === 'pernoita';
  const P = night ? PELE_NIGHT : PELE;
  const PL = night ? PLATE.night : PLATE.day;
  const s = night ? sNight : sDay;
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
  // (o rowsCap do "A seguir" volta a 3 a cada estado/fase — ver o useEffect por baixo do `phase`)
  const phase = !(isToday && flight && !isNonFlight) ? null
    : (cdMin != null && cdMin > 0) ? 'pre'
    : (depMs != null && now < depMs) ? 'duty'
    : (arrMs != null && now < arrMs) ? 'air'
    : 'landed';
  useEffect(() => { setRowsCap(3); setNextOpen(false); }, [homeState, phase]);
  const minsTo = (ms) => (ms == null ? null : Math.max(0, Math.round((ms - now) / 60000)));
  const durTxt = (min) => {
    if (min == null) return '';
    if (min < 60) return `${min} min`;
    if (min < 48 * 60) { const h = Math.floor(min / 60), m = min % 60; return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`; }
    const d = Math.round(min / 1440); return `${d} ${d === 1 ? l('dia', 'day') : l('dias', 'days')}`;
  };
  const legDep = String((activeSector && activeSector.leg.dep) || (flight && flight.depAirport) || '').toUpperCase();
  const legArr = String((activeSector && activeSector.leg.arr) || (flight && flight.arrAirport) || '').toUpperCase();
  const dayArr = flight ? String((sectorLegs.length ? sectorLegs[sectorLegs.length - 1].arr : flight.arrAirport) || '').toUpperCase() : '';

  // ── O TEMPO — onde ESTÁS (o topo da placa) e para onde VAIS (um secundário) ──
  const wxHereStation = (() => {
    const b = base ? String(base).toUpperCase() : null;
    if (homeState === 'pernoita') return closeNsStation ? String(closeNsStation).toUpperCase() : null;
    if (homeState === 'hoje' && !isNonFlight && flight) return phase === 'air' ? (legArr || null) : (legDep || b);
    if (homeState === 'disrupcao' && flight) return legDep || b;
    return b;
  })();
  const wxDestStation = ((homeState === 'hoje' && phase !== 'air') || homeState === 'vespera' || homeState === 'disrupcao') && flight && !isNonFlight
    && dayArr && /^[A-Z]{3}$/.test(dayArr) && dayArr !== wxHereStation ? dayArr : null;
  const wxHere = useStationWx(wxHereStation);
  const wxDest = useStationWx(wxDestStation);

  // ── REPOUSO ATÉ (pós-voo/pernoita): a MESMA regra do restBetweenDuties (ORO.FTL.235 a/b). ──
  // A regra é a do motor (restAfterDuty): também as 14 h depois de repouso a bordo ou de fuso ≥ 4 h e as +2 h/+4 h
  // depois de um PSV prolongado (auditoria A-145/A-150/A-169). Sem localização fiável, o estado diz onde se repousa.
  const restUntil = (todayEnded && !closeMulti && (homeState === 'posvoo' || homeState === 'pernoita')) ? (() => {
    // A MESMA regra da pílula do repouso (restUntilAfter = restStatus): +2 h ou +4 h depois de um prolongamento.
    const ru = restUntilAfter(duties || {}, todayISO, { inBase: homeState === 'posvoo', baseAt: homeBaseAt, postFlightMin: postFlightMin || 0, isPilot });
    if (!ru) return null;
    const u = new Date(ru.untilMs);
    const uIso = `${u.getFullYear()}-${String(u.getMonth() + 1).padStart(2, '0')}-${String(u.getDate()).padStart(2, '0')}`;
    return { hm: `${String(u.getHours()).padStart(2, '0')}:${String(u.getMinutes()).padStart(2, '0')}`, nextDay: uIso > todayISO };
  })() : null;
  const restUntilHm = restUntil ? restUntil.hm : null;

  // ── A VOZ do estado (data/stateVoice.js, golden): agora em LETRA NORMAL, por baixo da placa. A
  // disrupção não tem voz (quando aperta, só o operacional); a configuração e o "hoje" também não.
  // HOJE (2026-11-03): a frase do dia de serviço só diz o que os dados sustentam — "Tudo pronto." exige o voo
  // ao vivo sem atraso E os limites cumpridos; o tempo é o de AGORA no destino (golden test:voice).
  const voiceLiveOk = !!(flightStatus && !fsDev && !inboundLate);
  const voiceLegalOk = !!(legalIt && legalIt.status === 'ok');
  const voiceDest = (phase === 'pre' || phase === 'duty') && wxDest ? wxDest : null;
  // O repouso para a frase da véspera/pernoita (auditoria do tripulante, 2026-11-04): a MESMA conta da pílula
  // REPOUSO ✓/CURTO (restStatus, golden test:reststatus) → "verificado/tratado" só com ela a verde.
  const restVoice = (() => {
    const rI = (todayItems || []).find((it) => it.id === 'rest');
    const r = rI && rI.raw; if (!r || r.status === 'neutral') return { restOk: null };
    const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    // "Verificado" só com a pergunta inteira a verde — também a recuperação (ORO.FTL.235(d)).
    return { restOk: rI.status === 'ok', restHave: r.actualMin != null ? hm(r.actualMin) : null, restNeed: r.requiredMin != null ? hm(r.requiredMin) : null };
  })();
  // Último dia de férias (amanhã já não está marcado como férias) → a frase muda para o regresso (golden test:statevoice).
  const vacLast = homeState === 'ferias' && !(aeEvents || []).some((e) => e && e.type === 'vacDays' && e.date === isoAdd(todayISO, 1));
  const voice = useMemo(() => {
    if (!['folga', 'ferias', 'doenca', 'vespera', 'posvoo', 'pernoita', 'hoje'].includes(homeState)) return null;
    // `tmwReport` = report de AMANHÃ (se houver) → destrava as frases de DECISÃO da meteo (casaco/trânsito).
    const tmwISO = isoAdd(todayISO, 1);
    const tmwDuty = duties && duties[tmwISO] && !duties[tmwISO].deleted ? duties[tmwISO] : null;
    // MARCOS (marcos-voz, 2026-07-11): as horas do ano SÓ se calculam na folga (o único estado onde falam).
    const yearH = homeState === 'folga'
      ? (() => { try { return +(yearStats(duties || {}, { year: Number(todayISO.slice(0, 4)) }).flightMin / 60); } catch { return null; } })()
      : null;
    return stateVoice({ state: homeState, lang, dateISO: todayISO, wx: wxHere, hour: hourNow, ctx: { ...restVoice, lastVacDay: vacLast, report: (flight && flight.report) || null, station: closeNsStation, restUntil: restUntilHm, tmwReport: (tmwDuty && tmwDuty.report_time) || null,
      yearHours: yearH, serviceStart: serviceStart || null, companhia: (company && company.name) || null,
      aviso: (rosterChanges && rosterChanges.counts && rosterChanges.counts.total) ? true : null,
      phase: homeState === 'hoje' ? phase : null, liveOk: voiceLiveOk, legalOk: voiceLegalOk,
      dest: voiceDest ? voiceDest.station : null, destC: voiceDest ? voiceDest.c : null,
      destRain: voiceDest ? (voiceDest.icon === 'rain' || voiceDest.icon === 'thunder') : null } });
  }, [homeState, lang, todayISO, wxHere, hourNow, flight && flight.report, closeNsStation, restUntilHm, duties, rosterChanges, serviceStart, company, phase, voiceLiveOk, voiceLegalOk, voiceDest, restVoice.restOk, restVoice.restHave, restVoice.restNeed, vacLast]); // eslint-disable-line react-hooks/exhaustive-deps
  // Toque na voz: com destino navega ('escala' → rever alterações · 'numeros' · 'hoje'/'amanha' → o dia).
  const goVoice = (to) => {
    select();
    if (to === 'escala') { navigation.navigate('Escala', { screen: 'EscalaMain', params: { review: Date.now() } }); return; }
    if (to === 'numeros') { navigation.navigate('Estatísticas'); return; }
    const iso = to === 'hoje' ? todayISO : isoAdd(todayISO, 1);
    if (hasReg(iso)) openDayDetail(iso); else navigation.navigate('Escala');
  };

  // ── PÓS-VOO: o balanço do dia fechado (motor computeDuty, o MESMO dos golden) ──
  const closeD = (todayEnded && !closeMulti) ? (() => {
    try {
      const r = ftlForDuty(todayEnded, { postFlightMin, isPilot, base: homeBaseAt(todayISO), date: todayISO, cabinGapMin, splitAdminMin, duties });
      return r && r.isFdp ? r : null;   // escritório/formação/standby em casa não são PSV (ORO.FTL.105(12))
    } catch { return null; }
  })() : null;
  const closeBlock = (todayEnded && !closeMulti && todayEnded.flight_minutes)
    ? `${Math.floor(todayEnded.flight_minutes / 60)}:${String(todayEnded.flight_minutes % 60).padStart(2, '0')}` : null;
  let pdToday = null;
  if (todayEnded && !closeMulti && ae && crewCategory && todayEnded.route) {
    pdToday = serviceMoney(ae, crewCategory, todayEnded, { date: todayISO, fleet: crewFleet }).perDiem;   // índice do mês (L10)
  }
  // Acordar sugerido (véspera): report − 75 min (estimativa: vestir + caminho).
  const wakeMs = (homeState === 'vespera' && reportMs != null) ? reportMs - TUNE.wakeBefore * 60000 : null;
  const wakeAt = wakeMs != null ? (() => { const d = new Date(wakeMs); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })() : null;
  const restItem = questionItems.find((it) => it.id === 'rest') || null;
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
    return { quota, taken, left: Math.max(0, quota - taken), retISO: ret, period, lastDay: ret === isoAdd(todayISO, 1),
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
  // ── EM VOO: progresso do setor ativo (instantes reais com feed de 1 setor; senão os planeados) ──
  const sectorPct = (inDuty && depMs != null && arrMs != null && arrMs > depMs)
    ? Math.max(0, Math.min(100, Math.round(((now - depMs) / (arrMs - depMs)) * 100))) : null;
  const psvRunning = (inDuty && reportMs != null) ? (() => {
    const min = Math.max(0, Math.round((now - reportMs) / 60000));
    return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
  })() : null;
  // ── STANDBY hoje: "se chamado agora → PSV até HH:MM" (o motor 225 dá o máx; report + máx = relógio) ──
  const isStandbyToday = !!(flight && isToday && isNonFlight && /standby|reserve/.test(String(flight.kind || '')));
  const psvUntil = (isStandbyToday && flight.report && ndPsvMax) ? hmAdd(flight.report, hmToMin(ndPsvMax)) : null;

  // € do MÊS estimado — o MESMO monthStats dos Números (nunca um nº novo). Guarda o aeMonth COMPLETO:
  // o fecho do mês mostra as parcelas (que SOMAM — auditável).
  const monthAe = useMemo(() => {
    if (!ae || !crewCategory) return null;
    try {
      const st0 = monthStats(duties, { ym: todayISO.slice(0, 7), ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents, serviceStart, largada, lifestyle });
      return (st0 && st0.aeMonth) || null;
    } catch { return null; }
  }, [duties, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, todayISO, serviceStart, largada, lifestyle]);
  const monthMoney = monthAe ? monthAe.total : null;
  // 9/3 e sazonais sem as datas de atividade (Cl. 48.ª/80.ª): o mês é INCERTO — diz-se, com o intervalo da base (bloco 5).
  const monthUnc = monthAe && monthAe.baseRange ? monthAe.baseRange : null;
  const estLbl = monthUnc ? l('incerto · bruto', 'uncertain · gross') : l('estimado · bruto', 'estimated · gross');   // os acordos dão valores brutos (A-198)
  // Fecho: a parte variável dividida em "até hoje" e "resto do mês" (a MESMA conta do total — data/stats.js).
  const monthSplitNow = useMemo(() => {
    if (!ae || !crewCategory) return null;   // fecho (título) + o cartão do mês em todos os estados
    try {
      return monthSplit(duties, { ym: todayISO.slice(0, 7), ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, fleet: crewFleet, postFlightMin, events: aeEvents, todayISO, serviceStart, largada, lifestyle });
    } catch { return null; }
  }, [homeState, duties, ae, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, todayISO, serviceStart, largada, lifestyle]);
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);
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
  const psvPct = (() => {
    const mx = hmToMin(ndPsvMax); if (!mx) return null;
    const real = hmToMin(liveVerdict ? liveVerdict.realStr : ndPsvActual);
    return real != null ? Math.min(100, Math.round((real / mx) * 100)) : null;
  })();
  const f28 = flightLimits.find((w) => w.days === 28) || null;
  const d7 = dutyLimits.find((w) => w.days === 7) || null;

  // MODO EXEMPLO: o voo é FALSO e di-lo sempre (pílula no topo da placa), e sai-se num toque.
  const demoOn = !!(flight && flight.demo);
  const exitDemo = () => { select(); setCalFlight(null); };

  // Data do dia, legível ("Quinta · 5 novembro"): o 'long' do pt-PT traz "-feira" (fora).
  const dateLabel = (() => {
    const d = new Date();
    const wd = d.toLocaleDateString(locale, { weekday: 'long' }).replace(/-feira$/i, '');
    return `${wd} · ${d.getDate()} ${d.toLocaleDateString(locale, { month: 'long' })}`;
  })();
  const wdShort = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
  const wdLong = (iso) => { const w = new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { weekday: 'long' }).replace(/-feira$/i, ''); return w.charAt(0).toUpperCase() + w.slice(1); };

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

  // Configuração: os 3 passos — as MESMAS palavras do 7.º passo (OnboardingScreen, "Liga a tua escala").
  const setupSteps = homeState === 'setup' ? [
    [l('Autorizas o calendário', 'You allow calendar access'), l('o iPhone pergunta uma vez', 'your phone asks once')],
    [l('Escolhes o calendário da escala', 'You pick the roster calendar'),
      /easyjet|ezy/i.test([company && company.slug, company && company.name].filter(Boolean).join(' '))
        ? l('o que o eCrew preenche', 'the one eCrew fills') : l('o que o portal da companhia preenche', 'the one your crew portal fills')],
    [l('Confirmas os serviços', 'You confirm your duties'), l('nada se grava sem o teu sim', 'nothing is saved without your yes')],
  ] : [];
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
  // A PLACA — o que se mostra em cima, por estado. Tudo aqui é apresentação: os números vêm de cima.
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // As LINHAS do painel: os próximos serviços (hora do report · destino · dia). Ao vivo, sem o do herói.
  // Até 8 para o painel poder abrir ("mais N"); mostra-se até 3 (ver rowsCap).
  const upcomingRows = (skipISO, max = 8) => {
    const out = [];
    for (const iso of Object.keys(duties).filter((k) => k >= todayISO).sort()) {
      if (iso === skipISO) continue;
      // O 1.º serviço do dia que ainda não acabou (primário ou um 2.º serviço).
      const mf = dayFlights(iso, duties[iso]).find((f) => f.endDate.getTime() >= now); if (!mf) continue;
      const d = mf.svc;
      const isF = !d.kind || d.kind === 'flight';
      // A ROTA inteira, como no eCrew ("LIS–FNC–LIS") — só o destino escondia os setores do meio (LIS-FNC-LIS-OPO-LIS
      // mostrava só FNC). Nuno, 2026-11-04; refs Fly Delta/Air NZ. Sem rota → a estação de fora ou "Voo".
      const chain = String(d.route || '').split(/[^A-Za-z]+/).filter(Boolean).map((x) => x.toUpperCase()).join(' → ');   // a mesma seta do resto do Início (crítica 2026-11-04)
      const ds = isF || (d.kind === 'positioning' && d.route) ? (chain || awayStation(d.route) || l('Voo', 'Flight')) : ((KIND_CODE[lang] || KIND_CODE.pt)[d.kind] || '—');
      // Sem report → "—" na coluna do report (nunca a partida disfarçada de report).
      out.push({ key: iso, tm: d.report_time || '—', ds, dy: `${wdShort(iso)} ${Number(iso.slice(8, 10))}`,
        a11y: `${t('duties.kind.' + (d.kind || 'flight'), lang)} ${d.route || ''}, ${wdLong(iso)} ${Number(iso.slice(8, 10))}, ${d.report_time ? `report ${d.report_time}` : l('sem hora de report', 'no report time')}`,
        onPress: () => openDayDetail(iso) });
      if (out.length >= max) break;
    }
    return out;
  };
  const routeTxt = flight ? (legDep && legArr && legDep !== legArr ? `${legDep} → ${legArr}` : (legDep || legArr || '')) : '';
  // O repouso tem dois veredictos no motor (data/today.js): cumprido ou abaixo do mínimo (ORO.FTL.235).
  const restPill = restItem ? (restItem.status === 'bad' ? { tone: 'red', text: l('Repouso curto', 'Short rest') } : { tone: 'ok', text: l('Repouso ✓', 'Rest ✓') }) : null;
  const fsPill = flightStatus ? (((fsDep && fsDep.delayMin) || 0) >= 15 ? { tone: 'warn', text: `${l('Atraso', 'Delay')} +${fsDep.delayMin}` } : { tone: 'ok', text: l('A horas', 'On time') }) : null;
  const psvLatest = (() => {
    const r = legalIt && legalIt.raw && legalIt.raw.psv;
    // Sem report deste serviço, o "latest" do dia seria de OUTRO serviço — não se mostra.
    if (isToday && flight && flight.report && r && r.latest) return `${r.latest}${r.latestNextDay ? ' (+1)' : ''}`;
    return (ndDuty && flight && flight.report && ndPsvMax) ? hmAdd(flight.report, hmToMin(ndPsvMax)) : null;
  })();
  // ── A LINHA DO DIA DE SERVIÇO (em voo): report → limite do PSV (o MESMO "PSV até" de cima), setores como
  // troços, o "agora". data/dutyLine.js (golden test:dutyline). Sem report ou sem limite → a barra antiga.
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
    const r = dutyLine({ reportMs, limitMs: lim.getTime(), sectors: legsMs, now });
    return r ? { ...r, reportHm: flight.report, limitHm: psvLatest.replace(/\s*\(\+1\)/, '') } : null;
  })();
  const zuluTxt = (local, z) => (z && local && z !== local ? ` · ${z}Z` : '');
  // O tempo no topo só onde ajuda a decidir (Nuno, 2026-11-04): na folga e nos estados ao vivo (a estação onde estás
  // ou para onde vais). Fora do fecho, pós-voo, férias, doença e configuração — à meia-noite, "🌙 14°" não decidia nada.
  const wxHead = (live || homeState === 'folga') && wxHere && wxHere.icon ? { icon: wxHere.icon, text: live ? `${wxHere.c}° · ${wxHere.station}` : `${wxHere.c}°` } : null;

  const board = (() => {
    const b = { head: { left: dateLabel, dot: false }, lbl: null, digits: null, unit: null, was: null, dest: null, headline: null, title: null, pill: null, sub: null, prog: null, rows: [], kv: null, heroISO: null, link: null };
    if (homeState === 'setup') {
      return { ...b, lbl: l('Começar', 'Get started'), title: l('Liga a tua escala', 'Connect your roster'),
        sub: l('Lemos o calendário do telemóvel onde chega a escala. Só leitura: nada é alterado, e tu confirmas antes de gravar.', 'We read the phone calendar your roster arrives in. Read-only: nothing is changed, and you confirm before saving.'),
        link: { text: l('Privacidade · saber mais', 'Privacy · learn more'), onPress: () => openItem(setupWhyItem) } };
    }
    if (homeState === 'disrupcao' && flight) {
      const rep = flight.report ? ` · report ${flight.report}` : '';
      let x;
      if (fsCancelled) x = { lbl: l('Voo cancelado · confirma com o crewing', 'Flight cancelled · check with crewing'), digits: hm(fsDep && fsDep.scheduled) || depPlan || '—', pill: { tone: 'red', text: l('Cancelado', 'Cancelled') } };
      else if (fsDiverted) x = { lbl: l('Voo desviado · confirma o destino', 'Flight diverted · check the destination'), digits: hm(fsArr && (fsArr.estimated || fsArr.actual)) || '—', pill: { tone: 'red', text: l('Desviado', 'Diverted') } };
      else if (fsDev) {
        const arrSide = !!(wDelay && wDelay.which === 'arr'); const leg = arrSide ? fsArr : fsDep;
        const newHm = hm(leg && (leg.estimated || leg.actual)) || hm(leg && leg.scheduled) || '—';
        const oldHm = hm(leg && leg.scheduled);
        // O feed pode marcar "atrasado" sem dar a hora nova: então nada de "+0" nem hora riscada igual à grande.
        x = { lbl: `${arrSide ? l('Chegada prevista', 'Expected arrival') : l('Partida prevista', 'Expected departure')}${rep}`,
          digits: newHm, was: oldHm && oldHm !== newHm ? oldHm : null,
          pill: { tone: 'warn', text: delayMin > 0 ? `${l('Atraso', 'Delay')} +${delayMin}` : l('Atrasado', 'Delayed') } };
      } else {
        // Disrupção por ROTAÇÃO (o NOSSO voo ainda "limpo" no feed): mostra a PROJEÇÃO, nunca "a horas".
        const sched = hm(fsDep && fsDep.scheduled) || depPlan;
        x = { lbl: `${l('Partida prevista · projeção', 'Expected departure · projected')}${rep}`, digits: hmAdd(sched, delayMin) || sched || '—', was: sched,
          pill: { tone: 'warn', text: `${l('Atraso', 'Delay')} ~+${delayMin}` } };
      }
      const why = inboundLate && inboundInfo
        ? l(`O avião ainda vem a caminho${inbound && inbound.flightIata ? ` (${inbound.flightIata})` : ''} · chega ~${inboundInfo.etaZ}Z`, `Your aircraft is still inbound${inbound && inbound.flightIata ? ` (${inbound.flightIata})` : ''} · arrives ~${inboundInfo.etaZ}Z`)
        : [flightStatus && flightStatus.flightIata, flightStatus && flightStatus.aircraft && flightStatus.aircraft.reg].filter(Boolean).join(' · ') || null;
      return { ...b, head: { left: isToday ? l('Partidas · hoje', 'Departures · today') : l('Partidas · amanhã', 'Departures · tomorrow'), dot: true },
        // A linha do dia de serviço também aqui: a MARGEM COM O ATRASO (a aterragem estimada vs. o limite do PSV) — auditoria do tripulante.
        ...x, dest: routeTxt, sub: why, duty: isToday ? dl : null, dutyTxt: isToday && dl ? l('com o atraso', 'with the delay') : null, rows: upcomingRows(flight.dateISO, 1), heroISO: flight.dateISO };
    }
    if (homeState === 'hoje' && flight) {
      const rows = upcomingRows(flight.dateISO);
      if (isNonFlight) {
        const end = flight.arrTime && flight.arrTime !== flight.report ? flight.arrTime : null;
        if (isStandbyToday && cdMin != null && cdMin <= 0) {
          return { ...b, head: { left: kindLabel, dot: true }, lbl: end ? `${l('A janela fecha daqui a', 'Window closes in')} ${durTxt(minsTo(legInstant(flight.dateISO, end, flight.report || flight.depTime)?.getTime() ?? null))}` : l('Em standby', 'On standby'),
            digits: end || flight.report, headline: psvUntil ? `${l('Se te chamarem agora: PSV até', 'If called now: FDP until')} ~${psvUntil}` : l('À espera de chamada', 'Waiting for a call'),
            // HONESTO: o motor aqui NÃO aplica a 225 (sem `special.preStandby`) — é o PSV máximo a 1 setor contado
            // desde o início do standby. Di-lo e manda confirmar; nunca afirmar que o standby foi descontado.
            sub: psvUntil ? l('Estimativa a 1 setor (225) — confirma na Simulação.', 'Estimate at 1 sector (225) — check it in the Simulation.') : null, rows, heroISO: flight.dateISO };
        }
        if (cdMin != null && cdMin > 0) {
          return { ...b, head: { left: kindLabel, dot: true }, lbl: `${l('Começa daqui a', 'Starts in')} ${durTxt(cdMin)}`, digits: flight.report,
            headline: [kindLabel, end ? `${l('até às', 'until')} ${end}` : null].filter(Boolean).join(' · '), rows, heroISO: flight.dateISO };
        }
        return { ...b, head: { left: kindLabel, dot: true }, lbl: end ? l('Termina às', 'Ends at') : l('A decorrer', 'Ongoing'), digits: end || flight.report,
          headline: kindLabel, rows, heroISO: flight.dateISO };
      }
      const fno = flightNo || null;   // já é o do setor ativo
      const secTxt = activeSector && activeSector.total > 1 ? `${l('setor', 'sector')} ${activeSector.idx + 1}/${activeSector.total}` : null;
      if (phase === 'air') {
        return { ...b, head: { left: `${l('Em voo', 'In flight')}${fno ? ` · ${String(fno).toUpperCase()}` : ''}`, dot: true },
          lbl: `${l('Aterras daqui a', 'Landing in')} ${durTxt(minsTo(arrMs))}`, digits: arrHm || '—', dest: routeTxt, pill: fsPill,
          duty: dl,
          prog: dl ? null : { pct: sectorPct || 0, left: `${depHm || '—'} ${legDep}`, mid: psvRunning && ndPsvMax ? `PSV ${psvRunning} ${l('de', 'of')} ${ndPsvMax}${ndPsvHi ? `–${ndPsvHi}` : ''}` : (secTxt || ''), right: `${arrHm || '—'} ${legArr}` },
          dutyTxt: dl ? [psvRunning && ndPsvMax ? `PSV ${psvRunning} ${l('de', 'of')} ${ndPsvMax}` : null, secTxt].filter(Boolean).join(' · ') : null,
          rows, heroISO: flight.dateISO };
      }
      if (phase === 'landed') {
        return { ...b, head: { left: l('Partidas · hoje', 'Departures · today'), dot: true }, lbl: l('Aterraste · falta o sign-off', 'Landed · sign-off to go'),
          digits: arrHm || '—', dest: routeTxt, pill: fsPill, sub: [fno, secTxt].filter(Boolean).join(' · ') || null, rows, heroISO: flight.dateISO };
      }
      const pre = phase === 'pre';
      const hasRep = !!flight.report;
      return { ...b, head: { left: l('Partidas · hoje', 'Departures · today'), dot: true },
        lbl: pre ? `${hasRep ? l('Report daqui a', 'Report in') : l('Partida daqui a', 'Departure in')} ${durTxt(cdMin)}${hasRep ? zuluTxt(flight.report, ndReportZ) : ''}`
          : `${l('Partida daqui a', 'Departure in')} ${durTxt(minsTo(depMs))}${psvRunning ? ` · PSV ${psvRunning}` : ''}`,
        digits: (pre && hasRep ? flight.report : depHm) || '—', dest: routeTxt,
        pill: fsPill || (legalIt && legalIt.status === 'ok' ? { tone: 'ok', text: l('Nos limites', 'Within limits') } : null),
        sub: [fno ? String(fno).toUpperCase() : null, pre && hasRep && depHm ? `${l('parte', 'departs')} ${depHm}` : null, secTxt,
          flightStatus && flightStatus.aircraft && flightStatus.aircraft.reg ? `${l('avião', 'aircraft')} ${flightStatus.aircraft.reg}` : null,
          psvLatest ? `${l('PSV até', 'FDP until')} ${psvLatest}` : null,
          !hasRep ? l('sem hora de report — PSV não calculado', 'no report time — FDP not calculated') : null,
          // (sem "pernoita em …": a tecla Hotel já o diz, e a linha partia em 2 no iPhone — Nuno, 2026-11-04)
        ].filter(Boolean).join(' · ') || null,
        rows, heroISO: flight.dateISO };
    }
    if (homeState === 'vespera' && flight) {
      const dn = Number(flight.dateISO.slice(8, 10));
      // Sem hora de report (evento do calendário sem RP/C-I): a hora é a da PARTIDA e di-lo — nunca se
      // mostra a partida com o rótulo de report (o parser nunca inventa partida − 1 h).
      const hasRep = !!flight.report;
      return { ...b, head: { left: hasRep ? l('Report amanhã', 'Report tomorrow') : l('Partida amanhã', 'Departure tomorrow'), dot: true },
        lbl: `${l('Daqui a', 'In')} ${durTxt(cdMin)} · ${wdLong(flight.dateISO).toLowerCase()}, ${dn}${hasRep ? zuluTxt(flight.report, ndReportZ) : ` · ${l('sem hora de report', 'no report time')}`}`,
        digits: flight.report || flight.depTime || '—', dest: isNonFlight ? null : routeTxt, headline: isNonFlight ? kindLabel : null, pill: restPill,
        sub: isNonFlight ? (flight.arrTime && flight.arrTime !== flight.report ? `${l('até às', 'until')} ${flight.arrTime}` : null)
          : [flightNo ? String(flightNo).toUpperCase() : null, flight.report && flight.depTime && flight.depTime !== flight.report ? `${l('parte', 'departs')} ${flight.depTime}` : null,
            ndSectors > 1 ? `${ndSectors} ${l('setores', 'sectors')}` : null,
            flight.nightStop && nsHotelStation ? `${l('pernoita em', 'night stop in')} ${nsHotelStation}` : null].filter(Boolean).join(' · ') || null,
        rows: upcomingRows(flight.dateISO), heroISO: flight.dateISO };
    }
    if (homeState === 'pernoita') {
      const stn = closeNsStation ? String(closeNsStation).toUpperCase() : '';
      const restTxt = restUntil ? `${l('repouso até', 'rest until')} ${restUntil.hm}${restUntil.nextDay ? ` ${l('de amanhã', 'tomorrow')}` : ''} (235)` : l('repouso fora da base: mín. 10 h (235)', 'away-base rest: min 10 h (235)');
      const hotelTxt = closeHotel ? closeHotel.name : l('sem hotel guardado', 'no hotel saved');
      if (flight && flight.report) {
        // O próximo serviço pode não ser amanhã (pernoita de 2 noites): diz o dia.
        const whenTxt = flight.dateISO === isoAdd(todayISO, 1) ? l('amanhã', 'tomorrow') : `${wdLong(flight.dateISO).toLowerCase()} ${Number(flight.dateISO.slice(8, 10))}`;
        return { ...b, head: { left: `${l('Pernoita', 'Night stop')}${stn ? ` · ${stn}` : ''}`, dot: false },
          lbl: `${l('Report', 'Report')} ${whenTxt} · ${l('daqui a', 'in')} ${durTxt(cdMin)}`, digits: flight.report, dest: isNonFlight ? null : routeTxt, headline: isNonFlight ? kindLabel : null,
          pill: restPill, sub: `${hotelTxt} · ${restTxt}`, rows: upcomingRows(flight.dateISO), heroISO: flight.dateISO };
      }
      return { ...b, head: { left: `${l('Pernoita', 'Night stop')}${stn ? ` · ${stn}` : ''}`, dot: false },
        lbl: l('Repouso até', 'Rest until'), digits: restUntil ? restUntil.hm : '—', dest: stn || null, sub: hotelTxt, rows: upcomingRows(null) };
    }
    // ── CALMOS ──
    if (homeState === 'posvoo') {
      const stns = String((todayEnded && todayEnded.route) || '').split(/[^A-Za-z]+/).filter(Boolean).map((x) => x.toUpperCase());
      const sectorsN = (todayEnded && todayEnded.sectors) || Math.max(0, stns.length - 1);
      if (closeMulti) {
        return { ...b, head: { left: dateLabel }, lbl: l('Dia fechado', 'Day closed'), digits: String(1 + todayEnded.extra.length), unit: l('serviços', 'duties'),
          headline: l('Vários serviços no mesmo dia', 'Several duties in one day'), sub: l('O PSV combinado está no detalhe do dia.', 'The combined FDP is in the day detail.'), rows: upcomingRows(todayISO), heroISO: todayISO };
      }
      const over = !!(closeD && closeD.fdp && closeD.fdp.over);
      // O número é uma DURAÇÃO (o PSV de hoje): "5:00 h", sem zero à esquerda e com a unidade — "05:00" lia-se
      // como uma HORA (cinco da manhã), porque nos estados ao vivo o número grande É uma hora (iPhone, 2026-11-03).
      const fdpStr = closeD && closeD.fdp && closeD.fdp.actualFdpStr ? String(closeD.fdp.actualFdpStr).replace(/^0(\d:)/, '$1') : null;
      const routeLine = [stns.length ? stns.join(' → ') : null, sectorsN ? `${sectorsN} ${sectorsN === 1 ? l('setor', 'sector') : l('setores', 'sectors')}` : null,
        closeBlock ? `${closeBlock} ${l('de voo', 'flight time')}` : null].filter(Boolean).join(' · ') || null;
      // Em destaque, o que o tripulante quer saber a seguir: até quando descansa (ORO.FTL.235).
      const restLine = restUntil ? `${l('Repouso até', 'Rest until')} ${restUntil.nextDay ? `${l('amanhã', 'tomorrow')} ` : ''}${l('às', 'at')} ${restUntil.hm}` : null;
      return { ...b, head: { left: dateLabel }, lbl: fdpStr ? l('PSV de hoje · dia fechado', 'Today’s FDP · day closed') : l('Dia fechado · de serviço', 'Day closed · on duty'),
        digits: fdpStr || '✓', unit: fdpStr ? 'h' : null,
        headline: restLine || routeLine || l('Serviço de hoje', 'Today’s duty'),
        pill: closeD && closeD.fdp ? (over ? { tone: 'red', text: l('Acima do limite', 'Over the limit') } : { tone: 'calm', text: l('Nos limites', 'Within limits') }) : null,
        sub: restLine ? routeLine : null,
        rows: upcomingRows(todayISO), heroISO: todayISO };
    }
    if (homeState === 'ferias') {
      const retDuty = vacInfo && duties[vacInfo.retISO] && !duties[vacInfo.retISO].deleted ? duties[vacInfo.retISO] : null;
      return { ...b, lbl: l('Férias · ficam no ano', 'Vacation · left this year'), digits: vacInfo ? String(vacInfo.left) : '—', unit: vacInfo ? `${l('de', 'of')} ${vacInfo.quota} ${l('dias', 'days')}` : null,
        headline: vacInfo ? `${l('Regressas', 'Back on')} ${vacInfo.retLabel}` : null,
        // O período ("férias de 28 out a 4 nov") no lugar de "pelos dias que registaste": contexto + deixa verificar o saldo.
        // No último dia o regresso já está nos Próximos serviços (não se repete); a rota com a mesma seta do resto.
        sub: [...(vacInfo && vacInfo.lastDay ? [] : [retDuty && retDuty.report_time ? `report ${retDuty.report_time}` : null,
          retDuty ? (retDuty.route ? String(retDuty.route).split(/[^A-Za-z]+/).filter(Boolean).map((x) => x.toUpperCase()).join(' → ') : (retDuty.kind ? t('duties.kind.' + retDuty.kind, lang) : null)) : null]),
          vacInfo && vacInfo.period].filter(Boolean).join(' · ') || null,
        // No ÚLTIMO dia, os Próximos serviços aparecem (o resto das férias continua sossegado).
        rows: vacInfo && vacInfo.lastDay ? upcomingRows(todayISO) : [] };
    }
    if (homeState === 'doenca') {
      const payTxt = sickState ? (sickDay <= 3 ? sickState.first : sickState.rest)[lang === 'en' ? 'en' : 'pt'] : null;
      return { ...b, lbl: l('Baixa · dia do episódio', 'Sick leave · day of the episode'), // O número sem o "º" (a 150 pt desenhava-se enorme e sublinhado); a unidade diz quanto o acordo paga (2026-11-04):
        // pilotos easyJet (Art. 48.º, dias 1-3 de cada episódio) "de 3 pagos" até ao 3.º · depois, e nos outros acordos, "º dia".
        digits: String(sickDay), unit: sickFirst3 && sickDay <= 3 ? l('de 3 pagos', 'of 3 paid') : l('º dia', 'day'),
        headline: payTxt,
        sub: flight ? `${l('Próximo serviço', 'Next duty')}: ${wdLong(flight.dateISO).toLowerCase()} ${Number(flight.dateISO.slice(8, 10))}${flight.report ? `, report ${flight.report}` : ''} — ${l('se continuares de baixa, avisa a escala', 'if you’re still sick, tell crewing')}` : null };
    }
    if (homeState === 'fecho') {
      const daysTxt = fechoDaysLeft === 0 ? l('fecha hoje', 'closes today') : `${l('fecha em', 'closes in')} ${fechoDaysLeft} ${fechoDaysLeft === 1 ? l('dia', 'day') : l('dias', 'days')}`;
      if (monthAe) {
        return { ...b, lbl: `${monthCap} ${daysTxt} · ${estLbl}`, digits: eurBare(monthMoney), unit: '€',
          // Até hoje · resto do mês (Nuno, 2026-11-04): o que já está na escala até hoje e o que falta — no lugar de "As
          // parcelas somam o total" (era uma verificação, não informação). data/stats.js monthSplit, golden test:stats.
          headline: monthSplitNow ? l(`Até hoje ${eur(monthSplitNow.toDate)} · resto do mês ${eur(monthSplitNow.rest)}`, `So far ${eur(monthSplitNow.toDate)} · rest of the month ${eur(monthSplitNow.rest)}`) : null,
          sub: l('Variável pela escala; a base é fixa. A app estima; o recibo da companhia manda.', 'Variable from the roster; base pay is fixed. The app estimates; the company payslip rules.'),
          kv: [
            { k: l('Base', 'Base'), v: eur(monthAe.base || 0) },
            monthAe.perDiem ? { k: 'Per-diem', v: eur(monthAe.perDiem) } : null,
            monthAe.nightStops ? { k: l('Pernoitas', 'Night stops'), v: eur(monthAe.nightStops) } : null,
            monthAe.positioning ? { k: monthAe.positioningMax > monthAe.positioning ? l(`Posicionamento (até ${eur(monthAe.positioningMax)})`, `Positioning (up to ${eur(monthAe.positioningMax)})`) : l('Posicionamento', 'Positioning'), v: eur(monthAe.positioning) } : null,
            // Subsídios e prestações que caem neste mês (bloco 6): cada um na sua linha.
            ...(monthAe.annualItems || []).map((it) => ({ k: annualLabel(it, lang), v: it.max > it.eur ? `${eur(it.eur)} ${l('a', 'to')} ${eur(it.max)}` : eur(it.eur) })),
            // Extras = extras + eventos + abono para falhas (o MESMO agrupamento dos Números) — as parcelas
            // têm de SOMAR o total: base + per-diem + pernoitas + extras.
            ((monthAe.extras || 0) + (monthAe.events || 0) + (monthAe.cash || 0)) ? { k: 'Extras', v: eur((monthAe.extras || 0) + (monthAe.events || 0) + (monthAe.cash || 0)), onPress: extrasItem ? () => openItem(extrasItem) : undefined } : null,
          ].filter(Boolean) };
      }
      return { ...b, lbl: `${monthCap} ${daysTxt}`, digits: String(fechoDaysLeft != null ? fechoDaysLeft : '—'), unit: fechoDaysLeft === 1 ? l('dia', 'day') : l('dias', 'days'),
        headline: l('Falta algum extra? Regista antes do fecho.', 'Missing an extra? Log it before the close.') };
    }
    // FOLGA — o número é quantos dias faltam para o próximo serviço (dias de calendário).
    // Modo EXEMPLO: o voo de amostra não está na escala gravada — a folga lê-o daqui (senão o exemplo mostrava
    // "Sem serviços marcados" ao lado da pílula "Exemplo").
    const demoNext = demoOn && flight ? { iso: flight.dateISO, d: { kind: 'flight', route: (flight.stations || []).join('-'), report_time: flight.report },
      days: Math.round((new Date(`${flight.dateISO}T12:00:00`) - new Date(`${todayISO}T12:00:00`)) / 86400000),
      startMs: flight.reportDate ? +new Date(flight.reportDate) : (flight.startDate ? +new Date(flight.startDate) : null) } : null;
    const next = demoNext || (() => {
      for (const iso of Object.keys(duties).filter((k) => k >= todayISO).sort()) {
        const mf = dayFlights(iso, duties[iso]).find((f) => f.endDate.getTime() >= now); if (!mf) continue;
        const d = mf.svc;
        return { iso, d, days: Math.round((new Date(`${iso}T12:00:00`) - new Date(`${todayISO}T12:00:00`)) / 86400000),
          startMs: mf.reportDate ? +mf.reportDate : +mf.startDate };   // o report (sem report: a partida)
      }
      return null;
    })();
    const allOk = !qAlerts.length && !qChips.some((it) => it.status === 'warn');
    if (!next) return { ...b, headline: l('Sem serviços marcados', 'No duties scheduled'), pill: allOk ? { tone: 'calm', text: l('Escala em dia', 'Roster up to date') } : null };
    const what = (!next.d.kind || next.d.kind === 'flight') ? (String(next.d.route || '').split(/[^A-Za-z]+/).filter(Boolean).map((x) => x.toUpperCase()).join(' → ') || l('Voo', 'Flight')) : t('duties.kind.' + next.d.kind, lang);
    // FOLGA (auditoria do tripulante, 2026-11-04): o que um tripulante quer saber num dia livre é ATÉ QUANDO está livre.
    // Com menos de 48 h, o número é em HORAS ("amanhã às 06:00" era "1 dia" e eram 18 h).
    const untilMin = next.startMs != null ? Math.max(0, Math.floor((next.startMs - now) / 60000)) : null;
    const untilH = untilMin != null ? Math.floor(untilMin / 60) : null;
    const untilMm = untilMin != null ? untilMin % 60 : 0;   // para quem gere repouso, os minutos contam
    const inHours = untilH != null && untilH < 48;
    const repTm = next.d.report_time || null;
    return { ...b, lbl: next.days <= 0 && !inHours ? l('Próximo serviço', 'Next duty') : l('Próximo serviço daqui a', 'Next duty in'),
      digits: inHours ? String(untilH) : next.days <= 0 ? l('Hoje', 'Today') : String(next.days), unit: inHours ? (untilMm ? `h ${String(untilMm).padStart(2, '0')}` : 'h') : next.days <= 0 ? null : next.days === 1 ? l('dia', 'day') : l('dias', 'days'),
      // Curto para caber ao lado da pílula (iPhone 2026-11-04: partia em 2 e deixava a hora sozinha): < 48 h → "Livre até
      // hoje/amanhã às 06:00"; mais longe → "Livre até sábado 7" e o report desce para a linha cinzenta.
      headline: inHours && repTm
        ? `${l('Livre até', 'Free until')} ${next.days <= 0 ? l('hoje', 'today') : next.days === 1 ? l('amanhã', 'tomorrow') : wdLong(next.iso).toLowerCase()} ${l('às', 'at')} ${repTm}`
        : `${l('Livre até', 'Free until')} ${wdLong(next.iso).toLowerCase()} ${Number(next.iso.slice(8, 10))}`,
      sub: [inHours ? null : (repTm ? `report ${repTm}` : null), what].filter(Boolean).join(' · '), pill: allOk ? { tone: 'calm', text: l('Escala em dia', 'Roster up to date') } : null,
      rows: demoNext ? [{ key: 'demo', tm: flight.report, ds: String(flight.arrAirport || ''), dy: `${wdShort(flight.dateISO)} ${Number(flight.dateISO.slice(8, 10))}`,
        a11y: `${l('Exemplo', 'Example')}: ${flight.depAirport} → ${flight.arrAirport}, report ${flight.report}` }] : upcomingRows(next.iso),   // sem o do herói (repetia)
      heroISO: demoNext ? null : next.iso };
  })();

  // ── OS SECUNDÁRIOS (máx. 2) — a fila de prioridades do motor (living-interface §2): o urgente primeiro
  // (lei, documento, voo, escala), depois o que este momento pede, e nunca vazio (→ o dinheiro do mês).
  const quiet = homeState === 'ferias' || homeState === 'doenca' || homeState === 'setup';
  const secs = [];
  const pushSec = (x) => { if (x && !secs.some((y) => y.key === x.key)) secs.push(x); };
  if (calErr) pushSec({ key: 'cal', icon: 'alert', tone: 'warn', label: l('Calendário', 'Calendar'), text: l('Não consegui ler. Puxa para atualizar ou vê a permissão nas Definições.', 'Couldn’t read it. Pull to refresh or check the permission in Settings.') });
  if (bandAlerts.length) pushSec({ key: 'ftl', icon: 'shield', tone: 'red', label: bandAlerts[0].q, text: bandAlerts[0].answer, onPress: () => openItem(bandAlerts[0]) });
  else if (stateLevel === 'over') pushSec({ key: 'ftl', icon: 'shield', tone: 'red', label: l('Limites', 'Limits'), text: `${t('home.statusOver', lang)}${stateReason ? ` · ${stateReason}` : ''}`, onPress: () => { select(); navigation.navigate('Estatísticas'); } });
  if (docAlert) pushSec({ key: 'doc', icon: 'doc', tone: 'red', label: l('Documentos', 'Documents'), text: docAlert.answer, onPress: () => openItem(docAlert) });
  if (homeState === 'disrupcao' && liveVerdict) pushSec({ key: 'psvLive', icon: 'shield', tone: liveVerdict.verdict === 'over' ? 'red' : 'warn',
    label: l('Limites com o atraso', 'Limits with the delay'),
    text: `PSV ${liveVerdict.projected ? l('projetado ', 'projected ') : ''}${liveVerdict.realStr} ${l('de', 'of')} ${liveVerdict.maxStr}${liveVerdict.verdict === 'over' ? ` · ${l('acima do limite', 'over the limit')}` : liveVerdict.verdict === 'uncertain' ? ` · ${l('incerto — falta um dado no serviço', 'uncertain — a fact is missing in the duty')}` : liveVerdict.verdict === 'discretion' ? ` · ${isCommander ? l('discrição tua (205 f): até +2 h', 'your discretion (205 f): up to +2 h') : l('só com a discrição do comandante (205 f)', 'only with the commander’s discretion (205 f)')}` : ''}`,
    bar: psvPct, onPress: legalIt ? () => openItem(legalIt) : undefined });
  // POSSÍVEL RDP (só cabine, só com o acordo que o tem — easyJet × SNPVAC Cl. 67.ª, lida no BTE 2026-11-04): o fim do
  // serviço a ≥ 119 min do programado, medido pela chegada do ÚLTIMO setor no voo ao vivo; desvio/cancelamento = setores
  // perdidos/ganhos. Candidato, nunca "vais receber": reclama-se no RDF e a base aprova (n.º 7). data/disruption.js liveRdp.
  if (homeState === 'disrupcao' && ae && typeof ae.rdp === 'function' && crewCategory) {
    const rdpC = liveRdp({ isPilot, kind: flight && flight.kind, fromStandby: !!(flight && flight.svc && flight.svc.special && flight.svc.special.preStandby),
      arrDelayMin: trackingLast && fsArr && (fsArr.estimated || fsArr.actual) ? ndArrDelay : null, sectorsChanged: fsDiverted || fsCancelled });
    if (rdpC) {
      const v = ae.rdp(crewCategory, todayISO.slice(0, 7));
      const why = rdpC.reason === 'sectors' ? l('Setores perdidos ou ganhos no dia', 'Sectors lost or gained on the day')
        : l(`Fim do serviço ${durTxt(Math.abs(rdpC.dEndMin))} ${rdpC.dEndMin > 0 ? 'depois' : 'antes'} do programado`, `Duty ends ${durTxt(Math.abs(rdpC.dEndMin))} ${rdpC.dEndMin > 0 ? 'later' : 'earlier'} than planned`);
      pushSec({ key: 'rdp', icon: 'doc', label: l('Possível RDP · Cl. 67.ª', 'Possible RDP · Cl. 67'),
        text: `${why} — ${l('reclama no RDF; a base aprova', 'claim it on the RDF; the base approves')}`, value: v ? `${l('até', 'up to')} ${eur(v)}` : null });
    }
  }
  if (homeState !== 'disrupcao' && fsDev) {
    const arrSide = !!(wDelay && wDelay.which === 'arr'); const leg = arrSide ? fsArr : fsDep;
    pushSec({ key: 'fs', icon: 'plane', tone: 'warn', label: String((flightStatus && flightStatus.flightIata) || flightNo || l('Voo', 'Flight')),
      text: fsCancelled ? l('Voo cancelado — confirma com o crewing', 'Flight cancelled — check with crewing') : fsDiverted ? l('Voo desviado — confirma o destino', 'Flight diverted — check the destination')
        : `${arrSide ? l('Chega', 'Arrives') : l('Sai', 'Departs')} ${hm(leg && (leg.estimated || leg.actual)) || '—'} · ${l('estava', 'was')} ${hm(leg && leg.scheduled) || '—'}` });
  }
  if (syncBehind) pushSec({ key: 'sync', icon: 'sync', tone: 'warn', label: l('O registo', 'Your record'), text: l('Ainda tem o planeado. Sincroniza a escala eCrew pelo calendário.', 'Still shows the plan. Sync your eCrew roster via the calendar.') });
  if (rosterChanges && rosterChanges.counts && rosterChanges.counts.total && !(voice && voice.to === 'escala')) {
    const n = rosterChanges.counts.total;
    pushSec({ key: 'roster', icon: 'cal', tone: 'warn', label: l('A escala mudou', 'Roster changed'), text: l(`${n} ${n === 1 ? 'alteração' : 'alterações'} por rever · nada entra sem ti`, `${n} change${n === 1 ? '' : 's'} to review · nothing lands without you`), onPress: openReview });
  }
  if (airportDis) pushSec({ key: 'apt', icon: 'tower', tone: 'warn', label: `${l('Aeroporto', 'Airport')} ${(fsDep && fsDep.iata) || ''}`.trim(),
    text: `${airportDis.delayedPct}% ${airportDis.side === 'dep' ? l('das partidas atrasadas', 'of departures delayed') : l('das chegadas atrasadas', 'of arrivals delayed')}${airportDis.avgDelayMin ? ` · ${l('média', 'avg')} ${airportDis.avgDelayMin} min` : ''}` });
  const valWarn = qChips.find((it) => it.id === 'validades' && it.status === 'warn');
  if (valWarn && !quiet) pushSec({ key: 'docw', icon: 'doc', tone: 'warn', label: l('Documentos', 'Documents'), text: valWarn.answer, onPress: () => openItem(valWarn) });
  if (!quiet) {
    const wxLine = (w) => (w && w.sym ? wxSymbol(w.sym, lang).label : null);
    const tmwLine = (w) => (w && w.tmwSym ? wxSymbol(w.tmwSym, lang).label : null);
    // Mínima = máxima (ao fim do dia sobra 1 hora de previsão) → "19° a 19°" não diz nada: cala-se.
    const range = (a, z) => (a != null && z != null && Math.round(a) !== Math.round(z) ? `${a}° ${l('a', 'to')} ${z}°` : null);
    if (homeState === 'hoje' && !isNonFlight && phase !== 'air' && phase !== 'landed') {
      // "Rotação sem atraso" só quando o inbound foi lido de facto (sem dados, só a matrícula).
      if (flightStatus && flightStatus.aircraft && flightStatus.aircraft.reg) {
        pushSec({ key: 'plane', icon: 'plane', label: l('O teu avião', 'Your aircraft'), text: `${flightStatus.aircraft.reg}${inboundInfo && !inboundLate ? ` · ${l('rotação sem atraso', 'turnaround on time')}` : ''}` });
      }
      // Se a frase já falou do tempo no destino ("Leva o casaco: 7° agora em LGW"), o secundário não o repete.
      if (wxDest && !(voice && /°/.test(`${voice.bold} ${voice.tail}`))) pushSec({ key: 'wxd', icon: wxDest.icon || 'cloud', label: `${l('Em', 'In')} ${wxDest.station} ${l('hoje', 'today')}`, text: [wxLine(wxDest), range(wxDest.min, wxDest.max)].filter(Boolean).join(' · ') || `${wxDest.c}°`, value: `${wxDest.c}°` });
    }
    if (homeState === 'hoje' && phase === 'air') {
      // Só a pernoita (o próximo serviço já está na 1.ª linha do painel — não se repete).
      if (flight && flight.nightStop && nsHotelStation) pushSec({ key: 'after', icon: 'moon', label: l('Depois', 'Then'), text: `${l('Pernoita em', 'Night stop in')} ${nsHotelStation}${nsHotel ? ` · ${nsHotel.name}` : ''}` });
    }
    if (homeState === 'vespera' && wxDest) pushSec({ key: 'wxd', icon: wxIcon(wxDest.tmwSym) || 'cloud', label: `${l('Em', 'In')} ${wxDest.station} ${l('amanhã', 'tomorrow')}`, text: [tmwLine(wxDest), range(wxDest.tmwMin, wxDest.tmwMax)].filter(Boolean).join(' · ') || '—' });
    if ((homeState === 'hoje' || homeState === 'vespera') && flight && !isNonFlight && dayPerDiem != null) {
      const ns = flight.nightStop && nsPay != null ? nsPay : null;
      pushSec({ key: 'money', icon: 'wallet', label: homeState === 'vespera' ? l('Ganhos de amanhã', 'Tomorrow’s earnings') : l('Ganhos de hoje', 'Today’s earnings'),
        text: [`per-diem ${eur(dayPerDiem)}`, ns != null ? `${l('pernoita', 'night stop')} ${eur(ns)}` : null].filter(Boolean).join(' · '), value: eur(dayPerDiem + (ns || 0), '+'), gain: true,
        onPress: () => { select(); navigation.navigate('Estatísticas'); } });
    }
    if (homeState === 'pernoita') {
      if (nsPay != null) pushSec({ key: 'ns', icon: 'wallet', label: l('Esta noite', 'Tonight'), text: l('pernoita (acordo)', 'night stop (agreement)'), value: eur(nsPay, '+'), gain: true });
      if (wxHere && wxHere.tmwSym) pushSec({ key: 'wxt', icon: wxIcon(wxHere.tmwSym) || 'cloud', label: `${l('Em', 'In')} ${wxHere.station} ${l('amanhã', 'tomorrow')}`, text: [tmwLine(wxHere), range(wxHere.tmwMin, wxHere.tmwMax)].filter(Boolean).join(' · ') });
    }
    // FÉRIAS POR GOZAR (2026-11-03, Nuno "sim"): o saldo do ano vive nos Números; no Início só volta quando
    // importa — na folga, a partir de 1 de outubro, se ainda sobram dias (gozam-se no ano civil, CT art. 240.º).
    // Só com acordo que regista férias (senão "22 de 22" mentiria: os dias gozados vivem nos eventos).
    if (homeState === 'folga' && Number(todayISO.slice(5, 7)) >= 10 && ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays')) {
      const quota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
      const left = Math.max(0, quota - yearCount(aeEvents || [], todayISO.slice(0, 4), 'vacDays', duties));
      // De NOVEMBRO em diante, laranja (atenção) e quantos dias faltam para o fim do ano (crítica 2026-11-04). Os dias do
      // ano vêm do AE (easyJet cabine Cl. 72.ª: 25), não dos 22 do Código; gozam-se no ano civil (CT 240.º).
      const toYearEnd = Math.round((new Date(`${todayISO.slice(0, 4)}-12-31T12:00:00`) - new Date(`${todayISO}T12:00:00`)) / 86400000);
      const late = Number(todayISO.slice(5, 7)) >= 11;
      if (left > 0) pushSec({ key: 'vac', icon: 'sun', tone: late ? 'warn' : null, label: `${l('Férias', 'Leave')} ${todayISO.slice(0, 4)}`,
        text: late
          ? l(`${left === 1 ? 'Fica 1' : `Ficam ${left}`} de ${quota} dias · o ano acaba daqui a ${toYearEnd} dias (CT 240.º)`, `${left} of ${quota} days left · the year ends in ${toYearEnd} days (Labour Code 240)`)
          : l(`${left === 1 ? 'Fica 1' : `Ficam ${left}`} de ${quota} dias · gozam-se no ano (CT 240.º)`, `${left} of ${quota} days left · taken within the year (Labour Code 240)`),
        onPress: () => { select(); navigation.navigate('Estatísticas'); } });
    }
    if (homeState === 'posvoo' && d7 && d7.limit) {
      const p = Math.min(100, Math.round((d7.done / d7.limit) * 100));
      // "6 h" uma vez só; a lei (ORO.FTL.210) fica a UM toque, nos Números — não no cartão (2026-11-03).
      pushSec({ key: 'week', icon: 'shield', tone: p >= 85 ? 'warn' : null, label: l('Serviço · últimos 7 dias', 'Duty · last 7 days'), tileLabel: l('Serviço · 7 dias', 'Duty · 7 days'), text: `${Math.round(d7.done)} h ${l('de', 'of')} ${d7.limit} h`, bar: p,
        // Em mosaico: "6 h de 60" + as 7 barrinhas (uma por dia, do MESMO dayLog que soma o total — ref Jomo).
        tileValue: `${Math.round(d7.done)} h`, tileUnit: `${l('de', 'of')} ${d7.limit}`, tileText: null, tileNoBar: true,
        chart: (() => {
          // 3 letras ("Q S S D S T Q" repetia o Q e o S — crítica externa 2026-11-04).
          const ini = lang === 'en' ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] : ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
          const days = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const e = (dayLog || {})[iso];
            days.push({ iso, h: e && typeof e.servico === 'number' ? e.servico : 0, lbl: ini[d.getDay()], today: i === 0 });
          }
          const max = Math.max(13, ...days.map((x) => x.h));   // escala fixa ~um PSV longo: um dia de 6 h não enche
          return days.map((x) => ({ ...x, pct: x.h ? Math.max(8, Math.round((x.h / max) * 100)) : 0 }));
        })(),
        onPress: () => { select(); navigation.navigate('Estatísticas'); } });
    }
    if (homeState === 'fecho') {
      if (audit && audit.count > 0) pushSec({ key: 'audit', icon: 'doc', label: l('Auditoria do mês', 'Month audit'),
        text: `${audit.count} ${audit.count === 1 ? l('item por confirmar', 'item to confirm') : l('itens por confirmar', 'items to confirm')}${audit.totalEur > 0 ? ` · ≈ ${eur(audit.totalEur)} ${l('em causa', 'at stake')}` : ''}`,
        onPress: () => { select(); setAuditOpen(true); } });
      if (monthAe && monthAe.missing) pushSec({ key: 'miss', icon: 'alert', tone: 'warn', label: 'Per-diem', text: `${monthAe.missing} ${l('voo(s) sem rota — per-diem incompleto', 'flight(s) without a route — per-diem incomplete')}` });
      // 2.º cartão do fecho (2026-11-04): o próximo serviço — enche o vazio com o que se usa (não com uma data de
      // pagamento inventada: a app não sabe quando cada companhia paga).
      const nx = upcomingRows(null, 1)[0];
      if (nx) pushSec({ key: 'next', icon: 'cal', label: l('Próximo serviço', 'Next duty'), text: [nx.dy, nx.tm && nx.tm !== '—' ? `report ${nx.tm}` : null, nx.ds].filter(Boolean).join(' · '), onPress: nx.onPress });
    }
    // Nunca vazio: o dinheiro do mês (sem acordo modelado → as horas de voo dos últimos 28 dias).
    if (homeState !== 'fecho' && monthMoney != null) {
      // Pós-voo: o € de HOJE vive aqui (deixou de ser uma tecla — era informação com cara de botão).
      const todayTxt = homeState === 'posvoo' && pdToday != null ? `${l('hoje', 'today')} ${eur(pdToday, '+')} · ` : '';
      // "Variável até hoje" no lugar de "dia 4 de 30" (crítica 2026-11-04: o total igual dia após dia parecia fixo no código —
      // é a PREVISÃO do mês inteiro; isto mostra o que já está feito). A mesma conta do fecho (monthSplit).
      // "inclui X até hoje": diz que está DENTRO do total ("variável até hoje" não o dizia — crítica 2026-11-04).
      const soFar = monthSplitNow ? `${l('inclui', 'includes')} ${eur(monthSplitNow.toDate)} ${l('até hoje', 'so far')}` : l(`dia ${dayOfMonth} de ${daysInMonth}`, `day ${dayOfMonth} of ${daysInMonth}`);
      const uncTxt = monthUnc ? ` · ${l('base de', 'base')} ${eur(monthUnc.min)} ${l('a', 'to')} ${eur(monthUnc.max)}` : '';
      const mTxt = `${todayTxt}${soFar}${uncTxt}`;
      pushSec({ key: 'month', icon: 'wallet', label: `${monthCap} · ${estLbl}`, text: mTxt.charAt(0).toUpperCase() + mTxt.slice(1), value: eur(monthMoney),   // sem a barra: contava DIAS ao lado de euros e enganava (2026-11-04)
        // Em mosaico: só tipografia — o rótulo curto ("NOV · ESTIMADO": por extenso cortava em meia largura), o valor
        // grande, "+€ hoje" a verde, "inclui X € até hoje". Sem barra (contava DIAS ao lado de euros e enganava).
        tileLabel: `${monthCap.slice(0, 3)} · ${l('estimado', 'estimated')}`,
        tileDelta: todayTxt ? `${eur(pdToday, '+')} ${l('hoje', 'today')}` : null,
        tileText: soFar, tileNoBar: true,
        onPress: () => { select(); navigation.navigate('Estatísticas'); } });
    } else if (hasLimitData && f28 && f28.limit) {
      const p = Math.min(100, Math.round((f28.done / f28.limit) * 100));
      pushSec({ key: 'f28', icon: 'plane', tone: p >= 85 ? 'warn' : null, label: l('Tempo de voo · últimos 28 dias', 'Flight time · last 28 days'), tileLabel: l('Voo · 28 dias', 'Flight · 28 days'), text: `${Math.round(f28.done)} h ${l('de', 'of')} ${f28.limit} h`, bar: p, tileValue: `${Math.round(f28.done)} h`, tileUnit: `${l('de', 'of')} ${f28.limit}`, tileText: null,
        onPress: () => { select(); navigation.navigate('Estatísticas'); } });
    }
  }
  const secShow = secs.slice(0, 2);

  // ── AS 3 TECLAS — sempre no mesmo sítio, ao polegar; a 1.ª é a ação do momento (tabela da v4).
  // O que já está num secundário não se repete numa tecla. Férias e doença: nenhuma (a app baixa a voz).
  const goStats = () => { select(); navigation.navigate('Estatísticas'); };
  const hotelRun = (h, stn) => () => { select(); if (h) Linking.openURL(hotelMapsUrl(h.name, stn, Platform.OS)).catch(() => {}); else setHotelOpen(true); };
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
  const K = {
    escala: { id: 'escala', ic: 'cal', lbl: l('Ver a escala', 'See the roster'), run: () => { select(); navigation.navigate('Escala'); } },
    servico: (board.heroISO && hasReg(board.heroISO)) ? { id: 'servico', ic: 'cal', lbl: l('Ver o serviço', 'See the duty'), run: () => openDayDetail(board.heroISO) } : null,
    limites: { id: 'limites', ic: 'shield', lbl: homeState === 'disrupcao' ? l('Limites com o atraso', 'Limits with the delay') : l('Limites', 'Limits'), run: openLimits },
    simular: openSimulation ? { id: 'simular', ic: 'gauge', lbl: l('Simular', 'Simulate'), run: () => { select(); openSimulation(); } } : null,
    partilhar: shareable ? { id: 'partilhar', ic: 'share', lbl: homeState === 'disrupcao' ? l('Avisar a família', 'Tell the family') : phase === 'air' ? l('Partilhar a chegada', 'Share the arrival') : l('Partilhar o voo', 'Share the flight'), run: shareNext } : null,
    hotel: (flight && flight.nightStop && nsHotelStation) ? { id: 'hotel', ic: 'bed', lbl: 'Hotel', run: hotelRun(nsHotel, nsHotelStation), longRun: () => { select(); setHotelOpen(true); } } : null,
    lembrete: wakeAt && wakeMs > now ? { id: 'lembrete', ic: 'bell', lbl: `${l('Lembrete', 'Reminder')} ${wakeAt}`, a11y: l(`Marcar um lembrete para acordar às ${wakeAt}`, `Set a wake-up reminder at ${wakeAt}`), run: wakeRun } : null,
    hotelNs: homeState === 'pernoita' ? { id: 'hotelNs', ic: 'bed', lbl: closeHotel ? l('Hotel · mapas', 'Hotel · maps') : l('Guardar o hotel', 'Save the hotel'), run: hotelRun(closeHotel, closeNsStation), longRun: () => { select(); setHotelOpen(true); } } : null,
    reportAmanha: (homeState === 'pernoita' && flight && hasReg(flight.dateISO)) ? { id: 'reportAmanha', ic: 'cal', lbl: flight.dateISO === isoAdd(todayISO, 1) ? l('Serviço de amanhã', 'Tomorrow’s duty') : l('Próximo serviço', 'Next duty'), run: () => openDayDetail(flight.dateISO) } : null,
    partilharClose: shareableClose ? { id: 'partilharClose', ic: 'share', lbl: l('Partilhar', 'Share'), run: shareClose } : null,
    // Sem sign-off registado: abre logo o formulário do dia. Já registado: só ver o dia.
    signoff: (todayEnded && todayEnded.signOff)
      ? { id: 'signoff', ic: 'cal', lbl: l('Ver o dia', 'See the day'), run: () => openDayDetail(todayISO) }
      : { id: 'signoff', ic: 'edit', lbl: l('Registar o sign-off', 'Log the sign-off'), run: () => openDayDetail(todayISO, true) },
    ganhosHoje: pdToday != null ? { id: 'ganhosHoje', ic: 'wallet', val: eur(pdToday, '+'), lbl: l('hoje', 'today'), a11y: l(`Ganhos de hoje: ${eur(pdToday)}`, `Today’s earnings: ${eur(pdToday)}`), run: goStats } : null,
    amanha: (() => { const nx = upcomingRows(todayISO, 1)[0]; return nx ? { id: 'amanha', ic: 'cal', lbl: nx.key === isoAdd(todayISO, 1) ? l('Amanhã', 'Tomorrow') : l('Próximo serviço', 'Next duty'), run: () => openDayDetail(nx.key) } : null; })(),
    extra: openExtra ? { id: 'extra', ic: 'plus', lbl: l('Registar um extra', 'Log an extra'), run: () => { select(); openExtra(); } } : null,
    parcelas: { id: 'parcelas', ic: 'stats', lbl: l('Ver nos Números', 'See in Numbers'), run: goStats },
    relatorio: { id: 'relatorio', ic: 'doc', lbl: l('Relatório do mês', 'Month report'), run: () => { select(); navigation.navigate('Perfil', { screen: 'Relatorios', initial: false }); } },
    auditoria: (audit && audit.count > 0 && !secShow.some((x) => x.key === 'audit')) ? { id: 'auditoria', ic: 'doc', lbl: l('Auditoria', 'Audit'), run: () => { select(); setAuditOpen(true); } } : null,
    ligar: { id: 'ligar', ic: 'cal', lbl: l('Ligar o calendário', 'Connect the calendar'), run: requestAccess },
    pdf: { id: 'pdf', ic: 'doc', lbl: l('Importar o PDF', 'Import the PDF'), run: () => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params: { pdf: Date.now() } }); } },
    exemplo: { id: 'exemplo', ic: 'play', lbl: l('Ver um exemplo', 'See an example'), run: () => { select(); setCalFlight(DEMO_FLIGHT); } },
  };
  const keyOrder = homeState === 'setup' ? ['ligar', 'pdf', 'exemplo']
    : homeState === 'folga' ? ['servico', 'limites', 'simular']   // 'Ver o serviço' (era 'Ver a escala' = a aba)
    : homeState === 'vespera' ? ['lembrete', 'limites', 'partilhar', 'servico', 'simular']
    : homeState === 'disrupcao' ? ['partilhar', 'limites', 'simular', 'servico']
    : homeState === 'hoje' ? (isNonFlight ? (isStandbyToday ? ['simular', 'limites', 'servico'] : ['servico', 'limites', 'simular']) : ['partilhar', 'limites', 'hotel', 'simular', 'servico'])
    : homeState === 'pernoita' ? ['hotelNs', 'reportAmanha', 'partilharClose', 'simular']
    // Pós-voo: sem "Amanhã" (repetia a 1.ª linha do painel) nem o € como tecla (foi para o cartão do mês).
    // Com o sign-off já registado, a 1.ª tecla já é "Ver o dia" → a 3.ª passa a "Ver a escala".
    : homeState === 'posvoo' ? ['signoff', 'limites', (todayEnded && todayEnded.signOff) ? 'escala' : 'servico']
    // Fecho (2026-11-04): sai "Ver nos Números" (repetia a aba); entra o Relatório do mês (PDF/CSV, no Perfil).
    : homeState === 'fecho' ? ['extra', 'relatorio', 'auditoria', 'escala']
    : [];   // férias · doença
  const keys = keyOrder.map((k) => K[k]).filter(Boolean).slice(0, 3);

  // Palco do Início ocupado? (folha/cartão) — a dica do ＋ não entra por cima (TipKit).
  useEffect(() => { homeBusyRef.current = !!(detailItem || sendCard); }, [detailItem, sendCard]);

  // ── Medidas do número (determinísticas pelo comprimento — nada de auto-encolher, bug iOS) ──
  const digitsStyle = (() => {
    if (!board.digits) return null;
    if (live) return { fontSize: TUNE.live.size, lineHeight: TUNE.live.size, color: BRAND.panel };
    const avail = Math.max(240, winW - GUTTER * 2);
    const unitW = board.unit ? String(board.unit).length * 0.47 * TYPE.numXl + SPACE.sm : 0;
    const size = Math.max(TUNE.calm.min, Math.min(TUNE.calm.max, Math.floor((avail - unitW) / (Math.max(1, String(board.digits).length) * TUNE.calm.charW))));
    return { fontSize: size, lineHeight: size, color: P.ink };
  })();
  // Aparo ASSIMÉTRICO: por baixo dos dígitos a caixa traz mais vazio (o lugar dos descendentes) do que por cima.
  const digitsTrim = digitsStyle ? { marginTop: -Math.round(digitsStyle.fontSize * TUNE.trim), marginBottom: -Math.round(digitsStyle.fontSize * (board.dest ? TUNE.trimBottom.dest : TUNE.trimBottom.text)) } : null;
  const pillStyle = (tone) => {
    if (tone === 'calm') return [s.pill, { backgroundColor: P.soft }, { color: P.okText }];
    if (live) return [s.pill, { backgroundColor: tone === 'red' ? PLATE.redBg : tone === 'warn' ? PLATE.warnBg : PLATE.okBg }, { color: tone === 'red' ? PLATE.red : tone === 'warn' ? PLATE.warn : PLATE.ok }];
    // No papel, o vermelho é CHEIO com letra branca (5,30): vermelho sobre o redSoft dava 4,47.
    if (tone === 'red') return [s.pill, { backgroundColor: P.red }, { color: P.paper }];
    return [s.pill, { backgroundColor: tone === 'warn' ? P.warnSoft : P.soft }, { color: tone === 'warn' ? P.ink : P.okText }];
  };
  const onPlate = live ? { color: PL.fg } : null;
  const subColor = live ? PL.sub : P.grey;
  const ruleColor = live ? PL.rule : P.line;
  const heroTap = board.heroISO && hasReg(board.heroISO) ? () => openDayDetail(board.heroISO) : null;
  // O herói só é BOTÃO quando abre alguma coisa; senão é um bloco que o VoiceOver lê de uma vez (nunca um botão
  // "esbatido"). Com um link lá dentro (configuração), não se agrupa — o link tem de ser alcançável.
  const HeroBox = heroTap ? TouchableOpacity : View;
  const heroA11y = [board.lbl, board.digits ? `${board.digits}${board.unit ? ` ${board.unit}` : ''}` : null, board.was ? `${l('estava', 'was')} ${board.was}` : null, board.dest, board.headline, board.pill && board.pill.text, board.sub].filter(Boolean).join('. ');
  const heroProps = heroTap
    ? { activeOpacity: 0.85, onPress: heroTap, accessibilityRole: 'button', accessibilityLabel: heroA11y, accessibilityHint: l('Abre o detalhe do serviço', 'Opens the duty detail') }
    : { accessible: !board.link, accessibilityLabel: board.link ? undefined : heroA11y };
  const priBg = night ? P.ink : BRAND.action;
  const priFg = P.paper;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: live ? PL.bg : P.paper }]} edges={['top']} onTouchStart={plusTip ? dismissPlusTip : undefined}>
      {/* A barra de estado do iPhone fica clara sobre a placa escura (e à noite). Só com o ecrã à vista. */}
      {isFocused && (live || night) ? <StatusBar style="light" /> : null}
      {/* Papel por baixo da metade de baixo: o "ressalto" do fundo da lista mostra papel, o do topo mostra a placa. */}
      {live ? <View pointerEvents="none" style={[s.underlay, { backgroundColor: P.paper }]} /> : null}
      <ScrollView ref={homeScrollRef} style={s.scrollView} contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} alwaysBounceVertical
        onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; }}
        onContentSizeChange={(_w, h) => { if (!nextOpen && rowsCap > 2 && board.rows.length > 2 && viewH.current && h > viewH.current + 1) setRowsCap(2); }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={subColor} colors={[subColor]}
          onRefresh={async () => {
            setRefreshing(true); const t0 = Date.now();
            try { await syncFlight(); } catch { /* ignora */ }
            setFsTick((n) => n + 1);   // re-busca o estado do voo ao vivo
            const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
            setRefreshing(false);
          }} />}>

        {/* ═══ A PLACA ═══ */}
        <View style={[s.board, live ? { backgroundColor: PL.bg } : null]}>
          <View style={[s.bHead, { borderBottomColor: ruleColor }]}>
            <View style={s.bHeadL}>
              {board.head.dot ? <LiveDot color={BRAND.onDark} reduce={reduce} active={isFocused} /> : null}
              <Text style={[s.eyebrow, { color: live ? PL.sub : P.ink }]} numberOfLines={1}>{board.head.left}</Text>
            </View>
            <View style={s.bHeadR}>
              {demoOn ? (
                <TouchableOpacity style={[s.demoPill, live ? { backgroundColor: PL.track } : null]} onPress={exitDemo} hitSlop={8}
                  accessibilityRole="button" accessibilityLabel={l('Isto é um exemplo. Sair do exemplo', 'This is an example. Exit the example')}>
                  <View style={s.demoDot} />
                  <Text style={[s.demoTxt, onPlate]}>{l('Exemplo · sair', 'Example · exit')}</Text>
                </TouchableOpacity>
              ) : <NotificationsBell variant="pill" night={live || night} />}
              {wxHead ? (
                <View style={s.wx} accessibilityLabel={`${l('Tempo', 'Weather')}: ${wxHead.text.replace('°', ' graus')}`}>
                  <Icon name={wxHead.icon} size={14} color={live ? PL.sub : P.ink} />
                  <Text style={[s.eyebrow, { color: live ? PL.sub : P.ink }]} numberOfLines={1}>{wxHead.text}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {loadingFlight ? <BoardSkeleton /> : (
            <HeroBox style={[s.hero, (board.rows.length || board.kv) ? { borderBottomWidth: 1, borderBottomColor: ruleColor } : null]} {...heroProps}>
              {/* Ritmo por GRUPOS (Nuno, 2026-11-03, refs Tempo da Apple · Lapse): o rótulo COLADO ao número (um só
                  grupo) e um salto maior até à rota e à linha — antes tudo a 6 pt lia-se como uma pilha. */}
              <View style={s.heroTop}>
              {board.lbl ? <Text style={[s.tag, { color: subColor }]} numberOfLines={1}>{board.lbl}</Text> : null}
              {board.digits ? (
                <View style={[s.digitsRow, digitsTrim]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  {String(board.digits).split('').map((c, i) => (
                    <FlipChar key={`${flipKey}-${i}-${c}`} ch={c === ' ' ? ' ' : c} delay={i * TUNE.flip.stagger} reduce={reduce} style={[s.digit, digitsStyle]} />
                  ))}
                  {board.unit ? <Text style={[s.unit, live ? { color: PL.fg } : null]} allowFontScaling={false}>{board.unit}</Text> : null}
                  {board.was ? <Text style={[s.was, live ? { color: PL.fg } : null]} allowFontScaling={false}>{board.was}</Text> : null}
                </View>
              ) : null}
              {board.title ? <Text style={[s.title, onPlate]}>{board.title}</Text> : null}
              </View>
              {(board.dest || board.headline || board.pill || board.prog || board.duty || board.sub || board.link) ? (
              <View style={s.heroInfo}>
              {(board.dest || board.headline || board.pill) ? (
                <View style={[s.destRow, board.dest && ((board.dest && board.headline) || board.duty || board.prog || board.sub || board.link)
                  ? { marginBottom: -Math.round(TYPE.numXl * TUNE.destTrim) } : null]}>
                  {board.dest ? <Text style={[s.dest, onPlate]} numberOfLines={1} allowFontScaling={false}>{board.dest}</Text>
                    : board.headline ? <Text style={[s.headline, onPlate]} numberOfLines={2}>{board.headline}</Text> : <View />}
                  {board.pill ? (() => { const [box, bg, fg] = pillStyle(board.pill.tone); return (
                    <View style={[box, bg]}><Text style={[s.pillTxt, fg]} numberOfLines={1}>{board.pill.text}</Text></View>); })() : null}
                </View>
              ) : null}
              {board.dest && board.headline ? <Text style={[s.headline, onPlate]} numberOfLines={2}>{board.headline}</Text> : null}
              {board.duty ? (() => {
                // A LINHA DO DIA DE SERVIÇO: report ● ── troço(s) do voo (voado a amarelo) ── │ limite. ✈ = agora.
                const d = board.duty;
                const mTxt = d.marginMin == null ? null : d.over
                  ? l(`aterras ${fmtMargin(d.marginMin)} depois do limite`, `landing ${fmtMargin(d.marginMin)} past the limit`)
                  : l(`aterras com ${fmtMargin(d.marginMin)} de margem`, `landing with ${fmtMargin(d.marginMin)} to spare`);
                const a11y = [`${l('Dia de serviço', 'Duty day')}: report ${d.reportHm}, ${l('limite do PSV', 'FDP limit')} ${d.limitHm}`, board.dutyTxt, mTxt].filter(Boolean).join('. ');
                return (
                  <View style={s.dl} accessible accessibilityLabel={a11y}>
                    <View style={s.dlBar}>
                      <View style={[s.dlTrack, { backgroundColor: PL.track }]} />
                      <View style={[s.dlTrack, { width: `${d.nowPct * 100}%`, backgroundColor: BRAND.panel }]} />
                      {d.sectors.map((sec, i) => (
                        <View key={i} style={[s.dlSec, { left: `${sec.a * 100}%`, width: `${Math.max(0.01, sec.b - sec.a) * 100}%`, backgroundColor: PL.sub }]}>
                          <View style={[s.dlSecDone, { width: `${sec.done * 100}%`, backgroundColor: BRAND.panel }]} />
                        </View>
                      ))}
                      <View style={[s.dlTick, { left: `${d.limitPct * 100}%`, backgroundColor: d.over ? PLATE.red : PL.fg }]} />
                      <View style={[s.dlNow, { left: `${d.nowPct * 100}%`, backgroundColor: PL.bg }]}>
                        <Icon name="plane" rot={90} size={14} color={PL.fg} />
                      </View>
                    </View>
                    <View style={s.progEnds}>
                      <Text style={[s.caption, { color: PL.sub }]} numberOfLines={1}>{`${d.reportHm} · report`}</Text>
                      <Text style={[s.caption, { color: d.over ? PLATE.red : PL.sub }]} numberOfLines={1}>{`${l('limite', 'limit')} · ${d.limitHm}`}</Text>
                    </View>
                    <Text style={[s.label, { color: PL.sub }]} numberOfLines={2}>
                      {board.dutyTxt ? `${board.dutyTxt} · ` : ''}
                      {mTxt ? <Text style={{ color: d.over ? PLATE.red : PL.fg }}>{mTxt}</Text> : null}
                    </Text>
                  </View>
                );
              })() : null}
              {board.prog ? (
                <View style={s.prog}>
                  <View style={[s.track, { backgroundColor: PL.track }]}><View style={[s.trackFill, { width: `${board.prog.pct}%` }]} /></View>
                  <View style={s.progEnds}>
                    <Text style={[s.caption, { color: PL.sub }]} numberOfLines={1}>{board.prog.left}</Text>
                    <Text style={[s.caption, { color: PL.sub }]} numberOfLines={1}>{board.prog.mid}</Text>
                    <Text style={[s.caption, { color: PL.sub }]} numberOfLines={1}>{board.prog.right}</Text>
                  </View>
                </View>
              ) : null}
              {board.sub ? <Text style={[s.label, { color: subColor }]} numberOfLines={3}>{board.sub}</Text> : null}
              {board.link ? (
                <Text style={[s.link, { color: P.ink, textDecorationColor: BRAND.signal }]} onPress={board.link.onPress} suppressHighlighting
                  accessibilityRole="link">{board.link.text}</Text>
              ) : null}
              </View>
              ) : null}
            </HeroBox>
          )}

          {/* "A SEGUIR": o painel ABERTO até rowsCap (3, ou 2 se não couber sem deslizar); com mais, "Mais N ⌄" abre o
              resto e "Mostrar menos ⌃" fecha. Cada linha abre o seu dia. */}
          {!loadingFlight && board.rows.length ? (() => {
            const more = board.rows.length - rowsCap;
            const shown = nextOpen ? board.rows : board.rows.slice(0, rowsCap);
            return (
              <View>
                {/* Título da lista (Nuno, 2026-11-04): "serviços", não "voos" — também há standby, formação, escritório. */}
                <Text style={[s.tag, s.nextTitle, { color: live ? PL.fg : P.ink }]} accessibilityRole="header">{l('Próximos serviços', 'Next duties')}</Text>
                <View style={s.cols}>
                  <Text style={[s.tag, s.cTm, { color: subColor }]}>{l('Report', 'Report')}</Text>
                  <Text style={[s.tag, s.cDs, { color: subColor }]}>{l('Rota', 'Route')}</Text>
                  <Text style={[s.tag, s.cDy, { color: subColor }]}>{l('Dia', 'Day')}</Text>
                </View>
                {shown.map((r, i) => (
                  <TouchableOpacity key={r.key} style={[s.row, (i < shown.length - 1 || more > 0) ? { borderBottomWidth: 1, borderBottomColor: live ? PL.ruleFaint : P.line } : null]}
                    activeOpacity={0.75} onPress={r.onPress} disabled={!r.onPress} accessibilityRole={r.onPress ? 'button' : undefined} accessibilityLabel={r.a11y}>
                    <Text style={[s.rowBig, s.cTm, { color: live ? BRAND.panel : P.ink }]} numberOfLines={1} allowFontScaling={false}>{r.tm}</Text>
                    <Text style={[s.rowBig, s.cDs, onPlate]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}>{r.ds}</Text>
                    <Text style={[s.label, s.cDy, { color: subColor }]} numberOfLines={1}>{r.dy}</Text>
                  </TouchableOpacity>
                ))}
                {more > 0 ? (
                  <TouchableOpacity style={s.moreRow} activeOpacity={0.75} onPress={toggleNext} accessibilityRole="button"
                    accessibilityLabel={nextOpen ? l('Mostrar menos serviços', 'Show fewer duties') : l(`Mostrar mais ${more} serviços`, `Show ${more} more duties`)}>
                    <Text style={[s.label, { color: subColor }]}>{nextOpen ? l('Mostrar menos', 'Show less') : l(`Mais ${more}`, `${more} more`)}</Text>
                    <Icon name="chevron" rot={nextOpen ? -90 : 90} size={12} color={subColor} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })() : null}
          {/* Fecho do mês: as PARCELAS no lugar das linhas (somam o total — auditável) */}
          {!loadingFlight && board.kv ? (
            <View>
              {board.kv.map((r, i) => (
                <TouchableOpacity key={r.k} style={[s.row, i < board.kv.length - 1 ? { borderBottomWidth: 1, borderBottomColor: P.line } : null]}
                  activeOpacity={0.75} onPress={r.onPress || goStats} accessibilityRole="button" accessibilityLabel={`${r.k}: ${r.v}`}>
                  <Text style={[s.bodyStrong, { flex: 1, color: P.ink }]} numberOfLines={1}>{r.k}</Text>
                  <Text style={[s.rowBig, { color: P.ink }]} numberOfLines={1} allowFontScaling={false}>{r.v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* ═══ O CORPO — a frase · os 2 secundários · as 3 teclas ═══ */}
        <View style={[s.body, { backgroundColor: P.paper }]}>
          {/* No pós-voo a frase cala-se: repetia "Dia fechado" do rótulo e ficava solta entre o painel e os cartões. */}
          {voice && homeState !== 'posvoo' ? (
            <Animated.View style={enter(1)}>
              <Text style={[s.say, { color: P.grey }]} onPress={voice.to ? () => goVoice(voice.to) : undefined} suppressHighlighting
                accessibilityRole={voice.to ? 'button' : undefined} maxFontSizeMultiplier={1.4}>
                <Text style={[s.sayB, { color: P.ink }, voice.to ? { textDecorationLine: 'underline', textDecorationColor: BRAND.signal } : null]}>{voice.bold}</Text>{voice.tail ? ` ${voice.tail}` : null}
              </Text>
            </Animated.View>
          ) : null}

          {/* Configuração: os 3 passos do 7.º passo da configuração (mesmas palavras) enchem o meio — antes ficava vazio. */}
          {homeState === 'setup' ? (
            <Animated.View style={[s.steps, enter(2)]}>
              {setupSteps.map(([a, b], i) => (
                <View key={a} style={s.step} accessible accessibilityLabel={`${l('Passo', 'Step')} ${i + 1} ${l('de', 'of')} 3: ${a}. ${b}`}>
                  <View style={[s.stepNum, { backgroundColor: P.soft }]}><Text style={[s.stepNumTxt, { color: P.ink }]} allowFontScaling={false}>{i + 1}</Text></View>
                  <View style={s.stepTx}>
                    <Text style={[s.stepT, { color: P.ink }]}>{a}</Text>
                    <Text style={[s.stepS, { color: P.grey }]}>{b}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          ) : null}

          {secShow.length ? (() => {
            // MOSAICOS lado a lado (Nuno, 2026-11-03, ref WHOOP no Mobbin): quando os 2 secundários são NÚMEROS
            // (7 dias, mês, tempo, ganhos), meia largura cada — nada se esconde, ganha ~80 pt. Um aviso de texto
            // (lei a vermelho, documento, voo atrasado…) fica com a largura toda, como antes.
            const isStat = (x) => x.tone !== 'red' && (x.tileValue != null || x.value != null);
            if (secShow.length === 2 && secShow.every(isStat)) {
              return (
                <Animated.View style={[s.tiles, enter(2)]}>
                  {secShow.map((x) => {
                    const val = x.tileValue != null ? x.tileValue : x.value;
                    const txt = ('tileText' in x) ? x.tileText : x.text;   // tileText: null = sem linha (não cai na frase empilhada)
                    const lbl = x.tileLabel || x.label;
                    const TileBox = x.onPress ? TouchableOpacity : View;
                    const a11y = [lbl, `${val}${x.tileUnit ? ` ${x.tileUnit}` : ''}`, x.tileDelta, txt,
                      x.chart ? x.chart.map((d) => `${d.lbl} ${Math.round(d.h * 10) / 10} h`).join(', ') : null].filter(Boolean).join('. ');
                    const tileProps = x.onPress ? { activeOpacity: 0.8, onPress: x.onPress, accessibilityRole: 'button', accessibilityLabel: a11y } : { accessible: true, accessibilityLabel: a11y };
                    // Cores (regra 2026-11-04): verde = bom (dinheiro que ENTRA: os +€ do dia — o total do mês fica a tinta,
                    // é estimativa) · laranja = atenção · tinta = o resto. okText sobre o soft = 5,64:1.
                    const tone = x.tone === 'warn' ? P.warn : x.gain ? P.okText : P.ink;
                    return (
                      <TileBox key={x.key} style={[s.tile, { backgroundColor: P.soft }]} {...tileProps}>
                        {/* Como os widgets da Apple: o de CIMA alinha com o de cima (rótulo · número · delta) e o de BAIXO
                            fica preso ao fundo (gráfico / "dia 3 de 30") — os dois mosaicos leem-se como um par. */}
                        <View style={s.tileTop}>
                        <Text style={[s.tag, { color: P.greyOnSoft }]} numberOfLines={1}>{lbl}</Text>
                        <View style={s.tileValRow}>
                          <Text style={[s.tileVal, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}>{val}</Text>
                          {x.tileUnit ? <Text style={[s.tileTxt, { color: P.greyOnSoft }]} numberOfLines={1}>{x.tileUnit}</Text> : null}
                        </View>
                        {x.tileDelta ? <Text style={[s.tileDelta, { color: P.okText }]} numberOfLines={1}>{x.tileDelta}</Text> : null}
                        </View>
                        <View style={s.tileBottom}>
                        {txt ? <Text style={[s.tileTxt, { color: P.greyOnSoft }]} numberOfLines={2}>{txt}</Text> : null}
                        {x.chart ? (
                          <View style={s.wk} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                            {x.chart.map((d) => (
                              <View key={d.iso} style={s.wkCol}>
                                <View style={s.wkTrack}>
                                  {d.pct ? <View style={[s.wkBar, { height: Math.max(3, Math.round((28 * d.pct) / 100)), backgroundColor: d.today ? P.ink : P.greyOnSoft }]} />
                                    : <View style={[s.wkZero, { backgroundColor: P.ghost }]} />}{/* dia sem serviço: traço visível (o line quase desaparecia) */}
                                </View>
                                <Text style={[s.wkLbl, { color: d.today ? P.ink : P.greyOnSoft }, d.today ? s.wkLblToday : null]} numberOfLines={1} allowFontScaling={false}>{d.lbl}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        {x.bar != null && !x.tileNoBar ? (
                          <View style={[s.secBar, { backgroundColor: P.line }]}>
                            <View style={[s.secBarFill, { width: `${Math.max(0, Math.min(100, x.bar))}%`, backgroundColor: tone }]} />
                          </View>
                        ) : null}
                        </View>
                      </TileBox>
                    );
                  })}
                </Animated.View>
              );
            }
            return (
            <Animated.View style={[s.secs, enter(2)]}>
              {secShow.map((x) => {
                const tone = x.tone === 'red' ? P.red : x.tone === 'warn' ? P.warn : P.ink;
                // Botão só quando abre alguma coisa; senão um bloco lido de uma vez (nunca um botão "esbatido").
                const SecBox = x.onPress ? TouchableOpacity : View;
                const a11y = [x.label, x.text, x.value].filter(Boolean).join('. ');
                const secProps = x.onPress ? { activeOpacity: 0.8, onPress: x.onPress, accessibilityRole: 'button', accessibilityLabel: a11y } : { accessible: true, accessibilityLabel: a11y };
                return (
                  <SecBox key={x.key} style={[s.sec, { backgroundColor: P.soft }]} {...secProps}>
                    <View style={[s.secIc, { backgroundColor: P.paper }]}><Icon name={x.icon} size={16} color={tone} /></View>
                    <View style={s.secTx}>
                      <Text style={[s.tag, { color: P.greyOnSoft }]} numberOfLines={1}>{x.label}</Text>
                      <Text style={[s.bodyStrong, { color: x.tone === 'red' ? P.red : P.ink }]} numberOfLines={2}>{x.text}</Text>
                      {x.bar != null ? (
                        <View style={[s.secBar, { backgroundColor: P.line }]}>
                          <View style={[s.secBarFill, { width: `${Math.max(0, Math.min(100, x.bar))}%`, backgroundColor: x.tone === 'red' ? P.red : x.tone === 'warn' ? P.warn : P.ink }]} />
                        </View>
                      ) : null}
                    </View>
                    {x.value ? <Text style={[s.secVal, { color: x.gain ? P.okText : P.ink }]} numberOfLines={1} allowFontScaling={false}>{x.value}</Text>
                      : x.onPress ? <Icon name="chevron" size={12} color={P.greyOnSoft} /> : null}
                  </SecBox>
                );
              })}
            </Animated.View>
            );
          })() : null}

          {live && longHaul ? <Text style={[s.caption, { color: P.grey }]} numberOfLines={2}>{l('O FTL automático assume aclimatizado e na base. Em longo curso, confirma na Simulação.', 'Auto FTL assumes acclimatised and in-base. On long haul, check it in the Simulation.')}</Text> : null}

          {keys.length ? (
            <Animated.View style={[s.keys, enter(3)]}>
              {keys.map((k, i) => {
                const pri = i === 0;
                const fg = pri ? priFg : P.ink;
                return (
                  <TouchableOpacity key={k.id} style={[s.key, { backgroundColor: pri ? priBg : P.soft }]} activeOpacity={0.8} onPress={k.run} onLongPress={k.longRun}
                    accessibilityRole="button" accessibilityLabel={k.a11y || k.lbl}>
                    <Icon name={k.ic} size={20} color={fg} />
                    {k.val ? (
                      <View>
                        <Text style={[s.keyVal, { color: fg }]} numberOfLines={1} allowFontScaling={false}>{k.val}</Text>
                        <Text style={[s.label, { color: fg }]} numberOfLines={1}>{k.lbl}</Text>
                      </View>
                    ) : <Text style={[s.bodyStrong, { color: fg }]} numberOfLines={2}>{k.lbl}</Text>}
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {/* Hotel da pernoita — registar/editar (estação derivada da escala). */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={closeNsStation || nsHotelStation} />

      {/* Folha "porquê" — abre dos secundários e da tecla Limites. */}
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
      <Tip visible={plusTip} arrow="down" lang={lang} style={{ bottom: 12 }}
        bold={l('Cria aqui.', 'Create here.')}
        tail={l('Serviços, simulações e eventos — tudo nasce no ＋.', 'Duties, simulations and events — all born in the ＋.')}
        onDismiss={dismissPlusTip} />

      {/* Folha de boas-vindas — 1× na vida, só nascida do funil (flag 'pending'). */}
      <WelcomeSheet visible={welcomeOpen} onDone={closeWelcome} lang={lang} />

      {/* Auditoria do mês — a folha do radar (estado fecho). */}
      <AuditSheet visible={auditOpen} onClose={() => setAuditOpen(false)} audit={audit} monthName={monthName}
        lang={lang} provaCtx={{ companySlug: company && company.slug, companyName: company && company.name, isPilot, lang }}
        onOpenDay={(iso) => openDayDetail(iso)} onRegister={() => { openExtra && openExtra(); }} />
    </SafeAreaView>
  );
}

// Estilos fixos (não dependem do tema).
const st = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ── Estilos — FÁBRICA dia/noite (medidas do esboço design/inicio-v6.html; letra em TXT, espaço em SPACE) ──
const makeSkin = (P) => StyleSheet.create({
  safe: { flex: 1 },
  underlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '50%' },
  scrollView: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: GUTTER },

  // A placa: sangra até às margens (ao vivo é escura; no calmo é o papel)
  board: { marginHorizontal: -GUTTER, paddingHorizontal: GUTTER, paddingBottom: SPACE.sm },
  bHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.sm, borderBottomWidth: 1, minHeight: 40 },
  bHeadL: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexShrink: 1 },
  bHeadR: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  eyebrow: { ...TXT.eyebrow },
  wx: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  demoPill: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s, backgroundColor: P.soft, borderRadius: RADIUS.pill, paddingVertical: SPACE.xs, paddingHorizontal: SPACE.md },
  demoDot: { width: 6, height: 6, borderRadius: RADIUS.pill, backgroundColor: BRAND.signal },
  demoTxt: { ...TXT.label, color: P.ink },

  // O herói em dois grupos: [rótulo + número] e [rota · linha · barra] — o mesmo ar VISÍVEL (~20 pt) dos dois
  // lados do número (ver TUNE.rhythm). Encostado ao topo (arrumação "documento").
  hero: { gap: TUNE.rhythm.between, paddingTop: SPACE.sm, paddingBottom: SPACE.md },
  heroTop: { gap: TUNE.rhythm.inGroup },
  // Rota + linha + barra = UM grupo: apertado. MEDIDO no iPhone (em voo): com 6 + 4 a rota→barra dava 19 pt
  // visíveis (= o salto entre grupos, 18) — confundia. A caixa da rota já traz ~9 pt vazios → 2 dá ~11.
  heroInfo: { gap: SPACE.xxs },
  tag: { ...TXT.tag },
  // o NÚMERO: Barlow, dígitos de largura fixa; o tamanho vem do digitsStyle (ao vivo 104 · calmo até 150)
  // linha de base comum: a unidade ("dias") e a hora riscada assentam na mesma linha dos dígitos
  digitsRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap' },
  digit: { fontFamily: PELE_FONT.display, letterSpacing: -3, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: PELE_FONT.display, fontSize: TYPE.numXl, lineHeight: TYPE.numXl, letterSpacing: -1, color: P.ink, marginLeft: SPACE.sm },
  was: { fontFamily: PELE_FONT.display, fontSize: TYPE.numLg, lineHeight: TYPE.numLg, color: P.ink, opacity: 0.55, textDecorationLine: 'line-through', marginLeft: SPACE.md },
  title: { fontFamily: PELE_FONT.display, fontSize: TYPE.numXl, lineHeight: TYPE.numXl + 2, letterSpacing: -0.5, color: P.ink },
  destRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  dest: { fontFamily: PELE_FONT.display, fontSize: TYPE.numXl, lineHeight: TYPE.numXl + 2, letterSpacing: -0.5, color: P.ink, flexShrink: 1 },
  headline: { ...TXT.headline, color: P.ink, flexShrink: 1 },
  pill: { borderRadius: RADIUS.xs, paddingVertical: SPACE.xs, paddingHorizontal: SPACE.sm },
  pillTxt: { ...TXT.tag, fontSize: TYPE.micro, letterSpacing: 0.8 },
  label: { ...TXT.label },
  caption: { ...TXT.caption },
  bodyStrong: { ...TXT.bodyStrong },
  link: { ...TXT.label, textDecorationLine: 'underline', paddingVertical: SPACE.xs },
  prog: { gap: SPACE.s },
  // A linha do dia de serviço (em voo): faixa de 20 com o fio (2) ao meio, os troços (6), o traço do limite (14)
  // e o ✈ do "agora" num recorte da cor da placa (corta o fio por trás, como nos seguidores de voo).
  dl: { gap: SPACE.s },
  dlBar: { height: 20, justifyContent: 'center' },
  dlTrack: { position: 'absolute', left: 0, right: 0, top: 9, height: 2, borderRadius: RADIUS.pill },
  dlSec: { position: 'absolute', top: 7, height: 6, borderRadius: RADIUS.pill, overflow: 'hidden' },
  dlSecDone: { height: 6 },
  dlTick: { position: 'absolute', top: 3, width: 2, height: 14, marginLeft: -1, borderRadius: RADIUS.pill },
  dlNow: { position: 'absolute', top: 2, width: 16, height: 16, marginLeft: -SPACE.sm, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill },
  track: { height: 6, borderRadius: 6, overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 6, backgroundColor: BRAND.panel },
  progEnds: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACE.sm },

  // As linhas do painel: 76 · resto · 72 (como o esboço)
  nextTitle: { paddingTop: SPACE.md },
  cols: { flexDirection: 'row', gap: SPACE.sm, paddingTop: SPACE.xs, paddingBottom: SPACE.xxs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 44 },
  cTm: { width: 76 },
  cDs: { flex: 1 },
  cDy: { width: 72, textAlign: 'right' },
  // "A seguir" dobrado: o "+N ⌄" à direita · o "Dia ⌃" do cabeçalho aberto (fecha a lista)
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACE.xs, minHeight: 44 },
  rowBig: { fontFamily: PELE_FONT.display, fontSize: TYPE.display, lineHeight: TYPE.display + 2, color: P.ink },

  // O corpo
  // Medido (2026-11-03, métricas das fontes, 390 × 844): o estado mais alto (pós-voo com frase, 2 secundários com
  // barra e 2 linhas) dá 703 pt nos 714 úteis — com 16 entre blocos dava 715. Por isso 12.
  // flexGrow: o corpo enche até ao fundo (o papel por baixo) e as teclas, com marginTop 'auto', ficam lá presas.
  body: { flexGrow: 1, marginHorizontal: -GUTTER, paddingHorizontal: GUTTER, paddingTop: SPACE.lg, gap: SPACE.md },
  say: { ...TXT.body },
  sayB: { fontFamily: PELE_FONT.bodyBold },
  secs: { gap: SPACE.sm },
  sec: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, minHeight: 60 },
  secIc: { width: 32, height: 32, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  secTx: { flex: 1, minWidth: 0, gap: SPACE.xxs },
  secVal: { ...TXT.num },
  secBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: SPACE.xs },
  secBarFill: { height: 4, borderRadius: 2 },
  // Mosaicos lado a lado (2 secundários de números): rótulo · número · linha pequena · barra
  tiles: { flexDirection: 'row', gap: SPACE.sm },
  tile: { flex: 1, minWidth: 0, borderRadius: RADIUS.lg, paddingVertical: SPACE.md, paddingHorizontal: SPACE.md, gap: SPACE.md, justifyContent: 'space-between' },
  tileTop: { gap: SPACE.xxs },
  tileBottom: { gap: SPACE.xs },
  tileTxt: { ...TXT.footnote },
  tileValRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.xs },
  tileVal: { fontFamily: PELE_FONT.display, fontSize: TYPE.numLg, lineHeight: TYPE.numLg, letterSpacing: -0.5, flexShrink: 1 },
  tileDelta: { ...TXT.label },
  // As 7 barrinhas da semana (mosaico do serviço · 7 dias): 28 de altura, a de hoje a tinta
  wk: { flexDirection: 'row', justifyContent: 'space-between' },   // 7 colunas de LARGURA FIXA: com flex+gap a 7.ª saía para fora, por baixo do mosaico do mês (iPhone)
  wkCol: { width: 20, alignItems: 'center', gap: SPACE.xxs },   // 7 × 20 cabe nos ~150 pt do mosaico (3 letras)
  wkTrack: { height: 28, width: 8, justifyContent: 'flex-end' },   // alturas em PONTOS
  wkBar: { width: 8, borderRadius: RADIUS.pill },
  wkZero: { width: 8, height: 2, borderRadius: RADIUS.pill },
  wkLbl: { ...TXT.caption, width: 26, textAlign: 'center' },   // mais largo que a coluna (20): "dom"/"qua" partiam em 2 linhas
  wkLblToday: { fontFamily: PELE_FONT.bodyBold },
  // Os 3 passos da configuração (como no 7.º passo: círculo de 28 com o número, título e linha cinzenta)
  steps: { gap: SPACE.md },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  stepNum: { width: 28, height: 28, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { fontFamily: PELE_FONT.display, fontSize: TYPE.value },
  stepTx: { flex: 1, minWidth: 0, gap: SPACE.xxs },
  stepT: { ...TXT.callout },
  stepS: { ...TXT.footnote },
  // As 3 teclas: PRESAS AO FUNDO, sempre no mesmo sítio para o polegar (Nuno, 2026-11-03, depois dos mosaicos e do
  // "A seguir" dobrado: o conteúdo de cima ficou compacto e o espaço livre lê-se como respiro, não buraco; refs
  // Trainline/Tesla Robotaxi). Ecrã cheio: seguem os secundários a ≥ 16 pt (o gap 12 + rhythm.keys). ≥ 88 pt de altura.
  keys: { flexDirection: 'row', gap: SPACE.sm, marginTop: 'auto', paddingTop: TUNE.rhythm.keys },   // a folga por baixo é o useTabBarSpace (20)
  key: { flex: 1, minHeight: 88, borderRadius: RADIUS.lg, padding: SPACE.md, justifyContent: 'space-between', gap: SPACE.sm },
  keyVal: { ...TXT.num },
});

const sDay = makeSkin(PELE);
const sNight = makeSkin(PELE_NIGHT);
