import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet, AppState, Animated, Alert } from 'react-native';

// Acessibilidade: respeita a definição "Texto grande" do sistema, mas limita a
// ampliação a 1.4× — chega para melhorar a leitura sem partir os layouts de
// altura fixa (inputs, badges, cartões).
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = 1.4;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier = 1.4;
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from './data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
// Pele nova (2026): Barlow Condensed (display/números) + Hanken Grotesk (corpo) + Caveat (voz).
// Inter + Space Grotesk EXTINTOS (2026-07-10, tema antigo morto) — menos arranque/memória.
import { BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import { HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';   // a VOZ manuscrita (o bilhete pessoal do Início — escolha final do user)
import { getLocales } from 'expo-localization';
import * as LocalAuthentication from 'expo-local-authentication';
import { TYPE, PELE, PELE_FONT } from './data/constants';
import { AppContext, isoDay } from './data/appContext';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { hasPendingReset, clearPendingReset } from './data/pendingReset';
import { mapUser } from './data/auth';
import { fetchProfile, fetchAirlines, fetchBases, fetchCountries } from './data/db';
import { getAeForProfile, aeStatus as aeStatusFor } from './ae';
import { capabilitiesFor, resolvePostFlight, resolveVacationDays } from './data/capabilities';
import { migrateCrew, resolveCrew } from './data/crewHistory';
import { fetchDuties, upsertDuty, deleteDuty } from './data/duties';
import { getDutiesInRange, getNonFlightInRange } from './data/calendar';
import { buildIncoming } from './data/rosterImport';
import { diffRoster } from './data/rosterDiff';
import { dutyToFtlDay, dayFtlFromDuties, reconcileDayLog } from './ftl';
import { countersToEvents } from './data/aeEvents';
import ExtraEventSheet from './components/ExtraEventSheet';
import ExtrasManager from './components/ExtrasManager';   // PORT pele: gestão de extras (ver/apagar) no mini-FAB
import { syncReminders, notifyRosterChange, notifyLiveSync, cancelAllReminders, requestRemindersPermission, remindersUnavailableReason } from './data/reminders';
import { legZulu } from './data/zulu';
import { storedMatchesReal } from './data/flightStatus';
import { hotelSetCurrent, hotelUpdateAt, hotelAddAsCurrent, hotelMakeCurrent, hotelRemoveAt } from './data/hotels';

// ── Caixa-negra de crashes (setup sem adb): um erro FATAL de JS fica gravado ANTES de a app
// morrer e é mostrado num Alert na reabertura seguinte (efeito no App). Sem isto, "a app vai
// abaixo" no device não diz porquê. Não altera o comportamento: repassa ao handler original.
try {
  const prevFatalHandler = global.ErrorUtils && global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
  if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
    global.ErrorUtils.setGlobalHandler((e, isFatal) => {
      try {
        const msg = `${isFatal ? 'FATAL' : 'não-fatal'} · ${(e && (e.message || String(e))) || '?'}\n${String((e && e.stack) || '').split('\n').slice(1, 7).join('\n')}`;
        AsyncStorage.setItem('cp_lasterror', msg).catch(() => {});
      } catch { /* nunca piorar um crash */ }
      if (prevFatalHandler) prevFatalHandler(e, isFatal);
    });
  }
} catch { /* ambiente sem ErrorUtils */ }

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import LockScreen         from './screens/LockScreen';
import ReactivateScreen   from './screens/ReactivateScreen';
import BiometricOfferScreen from './screens/BiometricOfferScreen';
import HomeScreen         from './screens/HomeScreen';
import EscalaScreen       from './screens/EscalaScreen';
import DutyDetailScreen   from './screens/DutyDetailScreen';
import InfoScreen         from './screens/InfoScreen';   // PORT pele: aba FTL/AE → INFO (incremental)
import FtlDetailScreen    from './screens/FtlDetailScreen';
import StatsScreen        from './screens/StatsScreen';
import SettingsScreen     from './screens/SettingsScreen';
import ValidadesScreen    from './screens/ValidadesScreen';
import HoteisScreen       from './screens/HoteisScreen';
import HotelStationScreen from './screens/HotelStationScreen';
import RelatoriosScreen   from './screens/RelatoriosScreen';
import DisrupcaoScreen    from './screens/DisrupcaoScreen';
import EstabilidadeScreen from './screens/EstabilidadeScreen';
import HotelDetailScreen  from './screens/HotelDetailScreen';
import TabBar             from './components/TabBar';   // a navegação: barra convencional polida (padrão "melhores apps")
import OfflineBanner      from './components/OfflineBanner';
import Toast              from './components/Toast';
import DutyFormSheet      from './components/DutyFormSheet';
import SimulationResult   from './components/SimulationResult';

// Segura o splash nativo no arranque e esconde-o assim que a app está pronta
// (sem animação — o splash estático nativo cobre a janela de auth + hidratação).
// Chamado uma vez, no load do módulo.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// AppContext / isoDay vivem em data/appContext (módulo-folha) para QUEBRAR o
// ciclo de require App ↔ screens (que enchia os logs de WARN). São importados
// acima (uso interno) e reexportados aqui para compatibilidade.
export { AppContext, isoDay };

// Bloqueio biometria/PIN (opt-in): re-tranca a app ao voltar de segundo plano
// se já passaram 5 min — para reaberturas rápidas (ver a escala) não chatear.
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

// Lê a preferência de bloqueio POR-UTILIZADOR (`cp_lock_<uid>`). Se não houver chave per-uid mas
// existir o global LEGADO (`cp_lock`, de builds antigos onde a preferência era única no device),
// CONSOME-o uma só vez: semeia a chave per-uid do utilizador atual E apaga o global — assim só a 1.ª
// conta após o upgrade (o dono do device) o herda; nenhuma conta seguinte o vê (senão o global, que
// nunca é reescrito, re-semeava o bloqueio em TODAS as contas novas — herança que isto vem eliminar).
// A leitura da preferência pode lançar (storage nativo indisponível) → deixa PROPAGAR para o chamador
// decidir (no restauro: fail-closed/tranca; no login fresco: manter estado). A migração é best-effort.
async function loadLockPref(uid) {
  const per = await AsyncStorage.getItem(`cp_lock_${uid}`);
  if (per != null) return per === '1';
  const legacy = await AsyncStorage.getItem('cp_lock');
  if (legacy == null) return false;
  const enabled = legacy === '1';
  try { await AsyncStorage.setItem(`cp_lock_${uid}`, enabled ? '1' : '0'); await AsyncStorage.removeItem('cp_lock'); } catch { /* migração best-effort */ }
  return enabled;
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"      component={HomeScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
    </Stack.Navigator>
  );
}

// Escala — Lista (duties) ⇄ Mês (calendário) num só ecrã + a calculadora para
// registar/editar um dia a partir do calendário.
function EscalaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EscalaMain" component={EscalaScreen} />
      <Stack.Screen name="DutyDetail" component={DutyDetailScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
    </Stack.Navigator>
  );
}

// A antiga aba INFO/FTL virou o cartão "Biblioteca" DENTRO do Perfil (decisão do user
// 2026-07-09): a referência (lei FTL + AE + fontes oficiais) é consulta, não operação —
// mora no Perfil como as Validades. As rotas vivem na PerfilStack.

// A navegação é a TAB BAR convencional polida (components/TabBar.js, padrão Flighty/
// Airbnb/iOS) — o dock flutuante + FAB speed-dial morreram 2026-07-09 (e a linha de
// palavras intermédia foi rejeitada no device). As funções do speed-dial realojadas:
// Serviço → FAB "+" da Escala · Simulação/Evento → linha do polegar do Início (acts
// por estado) · Pesquisa → a INFO tem procura própria (lei + AE) desde a fusão da
// Biblioteca. SearchModal (a antiga pesquisa global) foi APAGADO — órfão desde então.

// Perfil (ABA desde 2026-07-09) — definições + sub-ecrãs próprios: Validades, Hotéis,
// e a BIBLIOTECA (a antiga aba INFO: lei FTL + AE explicados + fontes, com a procura).
function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilMain" component={SettingsScreen} />
      <Stack.Screen name="Validades"  component={ValidadesScreen} />
      <Stack.Screen name="Hoteis"     component={HoteisScreen} />
      <Stack.Screen name="HotelStation" component={HotelStationScreen} />
      <Stack.Screen name="HotelDetail" component={HotelDetailScreen} />
      <Stack.Screen name="Relatorios" component={RelatoriosScreen} />
      <Stack.Screen name="Disrupcao" component={DisrupcaoScreen} />
      <Stack.Screen name="Estabilidade" component={EstabilidadeScreen} />
      <Stack.Screen name="Biblioteca" component={InfoScreen} />
      <Stack.Screen name="FtlDetail"  component={FtlDetailScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <TabBar {...props} />}>
      {/* Ordem do user (2026-07-09): Início · Escala · ＋ · Números · Perfil */}
      <Tab.Screen name="Início"       component={HomeStack} />
      <Tab.Screen name="Escala"       component={EscalaStack} />
      <Tab.Screen name="Estatísticas" component={StatsScreen} />
      <Tab.Screen name="Perfil"       component={PerfilStack} />
    </Tab.Navigator>
  );
}

// Root: o Perfil voltou a ser ABA (decisão do user 2026-07-09) — os cabeçalhos das
// páginas ficaram SEM avatar e SEM sino (o sino vive no header do Perfil).
function RootNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

// Fluxo de SIMULAÇÃO (global, fora das abas): form em modo `simulate` (não grava) → resultado
// (perguntas/respostas). O form fica montado por baixo do resultado → "Editar" volta com os
// dados intactos. Fechar/concluir desmonta tudo (reinicia para a próxima simulação).
function SimulationFlow({ visible, onClose }) {
  const [simDuty, setSimDuty] = useState(null);
  if (!visible) return null;
  const close = () => { setSimDuty(null); onClose(); };
  return (
    <>
      <DutyFormSheet visible simulate onSimulate={setSimDuty} onClose={close} />
      <SimulationResult visible={!!simDuty} duty={simDuty} onEdit={() => setSimDuty(null)} onClose={close} />
    </>
  );
}

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Fonte Inter (1:1 com o mockup, igual em iOS+Android). Carrega os pesos que o
  // design usa; aplica-se por ecrã via PELE_FONT (fontFamily).
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_500Medium, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold,
    HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold,
    Caveat_600SemiBold });
  const fontsReady = fontsLoaded || !!fontError; // erro a carregar → arranca na mesma (fonte do sistema)
  const suppressAuth = useRef(false);
  const hydrated = useRef(false);

  // Profile filled during onboarding (pre-populated from user object if available)
  const [profile, setProfile] = useState({ company: null }); // FTL/cabine: só o operador (crewType fixo 'cabin')
  const [aeExtras, setAeExtras] = useState({});              // LEGADO: contadores antigos — migram p/ eventos no arranque e ficam vazios
  const [aeEvents, setAeEvents] = useState([]);              // Extras do mês como EVENTOS DATADOS [{id, date, type}] — a fonte única
  const [hotels, setHotels] = useState({});                  // Hotéis de pernoita POR ESTAÇÃO { IATA: {name, phone?, note?} } — local
  // Multi-hotel (3 níveis): o ATUAL no topo, os outros em `others[]` (data/hotels.js).
  // saveHotel preserva os outros (o antigo substituía o registo inteiro e apagava-os).
  const saveHotel = (station, h) => setHotels((prev) => { const k = String(station).toUpperCase(); return { ...prev, [k]: hotelSetCurrent(prev[k], h) }; });
  const saveHotelAt = (station, idx, h) => setHotels((prev) => { const k = String(station).toUpperCase(); return prev[k] ? { ...prev, [k]: hotelUpdateAt(prev[k], idx, h) } : prev; });
  const addHotelAlt = (station, h) => setHotels((prev) => { const k = String(station).toUpperCase(); return { ...prev, [k]: hotelAddAsCurrent(prev[k], h) }; });
  const makeHotelCurrent = (station, idx) => setHotels((prev) => { const k = String(station).toUpperCase(); return prev[k] ? { ...prev, [k]: hotelMakeCurrent(prev[k], idx) } : prev; });
  const removeHotelAt = (station, idx) => setHotels((prev) => { const k = String(station).toUpperCase(); const r = hotelRemoveAt(prev[k], idx); const n = { ...prev }; if (r) n[k] = r; else delete n[k]; return n; });
  const removeHotel = (station) => setHotels((prev) => { const n = { ...prev }; delete n[String(station).toUpperCase()]; return n; });
  // ARQUIVO de alterações de escala (disrupção SNC/RDP): cada alteração CONFIRMADA no import
  // fica com antes→depois + carimbo de DETEÇÃO — a testemunha com memória (o eCrew reescreve
  // a história; a prova só existe se alguém guardar as versões). Local, cap 400 entradas.
  const [rosterLog, setRosterLog] = useState([]);
  const addRosterLog = (list) => setRosterLog((prev) => [...prev, ...(list || [])].slice(-400));
  const [extraOpen, setExtraOpen] = useState(false);         // GESTÃO de extras (mini-FAB) — lista/apagar
  const [addExtraOpen, setAddExtraOpen] = useState(false);   // formulário de ADICIONAR extra (aberto pela gestão)
  const addAeEvents = (list) => setAeEvents((prev) => [
    ...prev,
    ...(list || []).filter((e) => e && e.type && e.date).map((e, i) => ({ id: e.id || `ev${Date.now().toString(36)}${prev.length + i}`, date: e.date, type: e.type })),
  ]);
  const removeAeEvent = (id) => setAeEvents((prev) => prev.filter((e) => e.id !== id));
  const [validities, setValidities] = useState([]);          // Validades & docs (premium v1) — local: [{ id, type, expiry, note }]
  const [remindersOn, setRemindersOn] = useState(false);     // Lembretes locais (premium · #3) — opt-in (precisa permissão + dev build)
  const [calendarId, setCalendarId] = useState(null);        // calendário do telemóvel ESCOLHIDO (id); null = não ligado. Lemos SÓ este.
  const [calendarName, setCalendarName] = useState(null);    // nome do calendário escolhido — só para o selo "Calendário · <nome>"
  const [splashHidden, setSplashHidden] = useState(false);   // splash nativo já escondido (controla a StatusBar)
  const [onboarded, setOnboarded] = useState(false);
  // (signupMode MORREU 2026-07-09: o criar-conta é uma vista do LoginScreen — conta primeiro.)

  const [lang, setLang]                 = useState(() => { const c = getLocales?.()[0]?.languageCode?.toLowerCase(); return c === 'pt' ? 'pt' : 'en'; });   // device: PT→PT, resto→EN
  // (theme/setTheme EXTINTOS 2026-07-10 — a pele é paper + noturno POR-ESTADO da LI;
  //  o toggle do Perfil saiu; cp_theme deixa de se ler/gravar.)
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [dayLog, setDayLog]             = useState({}); // cálculos FTL por dia: { 'YYYY-MM-DD': { psv, rest } }
  const [loadedUserId, setLoadedUserId] = useState(null); // uid cujo perfil já foi resolvido (gate de loading)
  const [airlines, setAirlines]         = useState([]);   // catálogo de companhias (tabela `airlines`)
  const [bases, setBases]               = useState([]);   // catálogo de bases (tabela `bases`, por companhia)
  const [countries, setCountries]       = useState([]);   // catálogo de países (tabela `countries`) — grupos do picker

  // Bloqueio biometria/PIN — preferência do dispositivo (opt-in, desligado por
  // omissão). `lockEnabled` = funcionalidade ativa; `locked` = app trancada agora.
  const [lockEnabled, setLockEnabled]   = useState(false);
  const [locked, setLocked]             = useState(false);
  const [bioAvailable, setBioAvailable] = useState(null);   // device tem biometria/código configurado?
  const [lockOffered, setLockOffered]   = useState(null);   // já ofereci o Face ID a este user? (por-uid)
  const [obscured, setObscured]         = useState(false);  // app em 2.º plano → tapa o conteúdo (app switcher)
  const lockHydrated = useRef(false);
  const bgAt = useRef(null); // timestamp de ida a segundo plano (para o timeout de re-bloqueio)

  // Estado de ligação (NetInfo): controla o banner offline e dispara o flush da
  // outbox na transição offline→online. Otimista por omissão (começa online).
  const [online, setOnline] = useState(true);
  const onlineRef = useRef(true);

  // Duties (registo bruto da escala) — offline-first com sync Supabase. Mapa por
  // dia: { 'YYYY-MM-DD': { report_time, block_off, block_on, sectors, flight_minutes,
  // updated_at, dirty, deleted } }. `dirty`/`deleted` = pendente de envio.
  const [duties, setDuties]   = useState({});
  const dutiesHydrated        = useRef(false);
  const dutiesSyncing         = useRef(false);
  const dutiesRef             = useRef({});
  useEffect(() => { dutiesRef.current = duties; }, [duties]);
  // Fase 4 — Alterações de escala detetadas (calendário vs guardado). { changed, added, counts }.
  const [rosterChanges, setRosterChanges] = useState({ changed: [], conflict: [], added: [], removed: [], counts: { changed: 0, conflict: 0, added: 0, removed: 0, total: 0 } });
  // Voo ao vivo — registo ATRASADO face às horas reais. Advisory; a app NUNCA escreve as horas
  // na duty (a fonte é a escala oficial, sincronizada pelo calendário). Mapa por dia:
  // { 'YYYY-MM-DD': { flightNo, realArrZ, schedArrZ, at } }. Persistido (sobrevive ao fecho);
  // limpo quando o on-block guardado apanha o real (sincronizaste). Só sinaliza (pontinho+notif).
  const [liveSync, setLiveSync] = useState({});
  const liveSyncHydrated = useRef(false);
  const lastLiveSyncDates = useRef(null);   // datas já notificadas (dedupe; semeado no load p/ não re-notificar ao arrancar)

  // ── Registo FTL por dia ──
  // dayLog: { 'YYYY-MM-DD': { psv, rest, … } }. As calculadoras registam num dia
  // (a data selecionada no calendário ou, por omissão, hoje).
  const updateDayLog = (date, key, val) =>
    setDayLog(prev => {
      const day = prev[date] || {};
      return { ...prev, [date]: { ...day, [key]: typeof val === 'function' ? val(day[key]) : val } };
    });
  const removeDayLog = (date, key) =>
    setDayLog(prev => {
      if (!prev[date]) return prev;
      const day = { ...prev[date] };
      delete day[key];
      const next = { ...prev };
      if (Object.keys(day).length) next[date] = day; else delete next[date];
      return next;
    });
  // Compat: o cartão do Início e as calculadoras ainda falam em "ftlSnap" = hoje.
  // (Fases seguintes ligam estes consumidores diretamente ao dia selecionado.)
  const ftlSnap = dayLog[isoDay()] || {};
  const updateFtlSnap = (key, val) => updateDayLog(isoDay(), key, val);

  // Toast global de feedback de sync (duties → Supabase). { kind: 'sync'|'warn', ts }.
  const [toast, setToast] = useState(null);
  const [simulateOpen, setSimulateOpen] = useState(false);   // fluxo de simulação aberto?
  // Tema NOTURNO do Início (véspera/pernoita) — o HomeScreen publica-o aqui para a
  // TabBar herdar o tema quando o Início é a aba ativa.
  const [homeNight, setHomeNight] = useState(false);
  // Toast de AÇÃO genérico (confirma guardar/apagar/aplicar) — exposto via contexto.
  // `action` (mockup desfazer, 2026-07-15): { label, onPress } — o toast ganha a pílula
  // "Desfazer" (5 s fixos, box-none). Sem ação, o toast continua puramente informativo.
  const notify = (title, sub, kind, action) => setToast({ kind: kind || 'ok', title, sub: sub || null, action: action || null, ts: Date.now() });

  // Caixa-negra: a sessão anterior morreu com erro fatal de JS? Mostra-o UMA vez (e limpa).
  useEffect(() => {
    AsyncStorage.getItem('cp_lasterror').then((v) => {
      if (!v) return;
      AsyncStorage.removeItem('cp_lasterror').catch(() => {});
      Alert.alert('Último crash (JS)', String(v).slice(0, 900));
    }).catch(() => {});
  }, []);

  // ── Duties (escala) ──
  // Escrita imediata em local (offline-first), marcada `dirty` para sincronizar.
  const saveDuty = (date, fields) => {
    setDuties(prev => {
      const ex = prev[date];
      return {
        ...prev,
        [date]: {
          report_time: fields.report_time || null,
          block_off: fields.block_off || null,
          block_on: fields.block_on || null,
          sectors: fields.sectors || 0,
          flight_minutes: fields.flight_minutes || 0,
          route: fields.route || null,        // rota "LIS-OPO-LIS" (per diem AE)
          kind: fields.kind || 'flight',      // tipo de atividade (voo/standby/terra…)
          nightStop: !!fields.nightStop,      // paragem nocturna (abono AE, Art. 39)
          // Alojamento na pausa do split-duty (opt-in, CS FTL.1.220 d/e): conta a pausa toda (>6h/WOCL)
          // para a extensão. Preserva-se na edição que não lhe toca (como snap/legs). Persiste em roster_meta.
          accommodation: ('accommodation' in fields) ? !!fields.accommodation : (ex?.accommodation ?? false),
          // ORIGEM imutável + SNAPSHOT (Fase 4) + LEGS (nº de voo p/ "ao vivo"): só mudam
          // se vierem nos fields (import); a edição manual NÃO lhes toca → uma importada
          // editada continua 'calendar' e mantém os números de voo.
          source: fields.source !== undefined ? fields.source : (ex?.source || 'manual'),
          snap: ('snap' in fields) ? fields.snap : (ex?.snap ?? null),
          legs: ('legs' in fields) ? fields.legs : (ex?.legs ?? null),
          // Sign-off REAL (fim de serviço, depois do debrief) — alimenta as Duty hours/210/repouso.
          signOff: ('signOff' in fields) ? (fields.signOff || null) : (ex?.signOff ?? null),
          // Casos especiais FTL (Fase 1): repouso a bordo/aumentada (205c), delayed (205g),
          // standby anterior (225) — mexem no TETO do PSV. Persistidos em roster_meta (sem migração).
          special: ('special' in fields) ? fields.special : (ex?.special ?? null),
          // PAPEL desempenhado (instr/uprank/CCLT/CTI — €/dia ou €/setor conforme a lei) e
          // FOLGA PUBLICADA trabalhada (ddo/wfly). Persistem em roster_meta.
          role: ('role' in fields) ? (fields.role || null) : (ex?.role ?? (ex?.instructor ? 'instr' : null)),
          dayOffWorked: ('dayOffWorked' in fields) ? (fields.dayOffWorked || null) : (ex?.dayOffWorked ?? null),
          // Dia de escritório OFC4/OFC8 (Anexo I.14). Persiste em roster_meta.
          officeType: ('officeType' in fields) ? (fields.officeType || null) : (ex?.officeType ?? null),
          // Formação e-learning (sem pagamento variável, Art. 43). Persiste em roster_meta.
          eLearning: ('eLearning' in fields) ? !!fields.eLearning : (ex?.eLearning ?? false),
          // 2.º+ período de serviço no MESMO dia civil (a lei conta períodos, não dias — 210).
          // Array de duties-irmãs (mesma forma da primária); persistido em roster_meta.
          extra: ('extra' in fields) ? (fields.extra && fields.extra.length ? fields.extra : null) : (ex?.extra ?? null),
          duty_date: date,
          updated_at: new Date().toISOString(),
          dirty: true,
          deleted: false,
        },
      };
    });
    // Liga ao motor FTL: deriva o registo do dia (PSV/limites/repouso) a partir da
    // duty. `src:'duty'` marca-o como derivado; registos manuais (sem src) não são tocados.
    // Um dia pode ter N períodos de serviço (a lei conta por SERVIÇO — 210): junta a primária
    // com os `extra` (efetivos: dos fields, ou os já guardados se a edição não lhes tocou).
    const primary = {
      report_time: fields.report_time, block_off: fields.block_off, block_on: fields.block_on,
      sectors: fields.sectors, flight_minutes: fields.flight_minutes, kind: fields.kind, signOff: fields.signOff, special: fields.special,
      legs: fields.legs, route: fields.route, accommodation: fields.accommodation,   // split (legs) + base/fora (rota) + alojamento (220 d/e)
    };
    const effExtra = ('extra' in fields) ? fields.extra : (dutiesRef.current?.[date]?.extra || null);
    const entry = dayFtlFromDuties([primary, ...((effExtra && effExtra.length) ? effExtra : [])],
      { postFlightMin, isPilot, base });   // pós-voo EFETIVO (user>OM>assumido) + base p/ 12h/10h (235)
    setDayLog(prev => {
      if (entry) return { ...prev, [date]: entry };
      if (prev[date]?.src === 'duty') { const n = { ...prev }; delete n[date]; return n; }
      return prev;
    });
  };
  // Apagar: marca `deleted` para propagar ao servidor (o flush remove no fim).
  const removeDuty = (date) => {
    setDuties(prev => (prev[date] ? { ...prev, [date]: { ...prev[date], deleted: true, dirty: true, updated_at: new Date().toISOString() } } : prev));
    // Remove o registo FTL derivado deste dia (preserva registos manuais sem src).
    setDayLog(prev => { if (prev[date]?.src === 'duty') { const n = { ...prev }; delete n[date]; return n; } return prev; });
  };
  // Um serviço-irmão (forma de `extra`) a partir dos campos do form. `source` por-SERVIÇO
  // (manual/calendar/pdf): distingue um 2.º serviço teu (sobrevive ao import) de um do calendário.
  const svcFromFields = (f, source = 'manual') => ({
    report_time: f.report_time || null, block_off: f.block_off || null, block_on: f.block_on || null,
    sectors: f.sectors || 0, flight_minutes: f.flight_minutes || 0, route: f.route || null,
    kind: f.kind || 'flight', nightStop: !!f.nightStop, signOff: f.signOff || null,
    legs: f.legs || null, special: f.special || null, accommodation: !!f.accommodation,
    role: f.role || null, dayOffWorked: f.dayOffWorked || null, officeType: f.officeType || null, eLearning: !!f.eLearning, source,
  });
  // A primária na forma de duty-irmã (p/ recalcular o dia com dayFtlFromDuties).
  const primaryOf = (cur) => ({ report_time: cur.report_time, block_off: cur.block_off, block_on: cur.block_on, sectors: cur.sectors, flight_minutes: cur.flight_minutes, kind: cur.kind, signOff: cur.signOff, special: cur.special, legs: cur.legs, route: cur.route, accommodation: cur.accommodation });
  // Recalcula o FTL do dia (primária + extra) e grava no dayLog.
  const recomputeDay = (date, cur, extra) => {
    const entry = dayFtlFromDuties([primaryOf(cur), ...(extra || [])], { postFlightMin, isPilot, base });
    setDayLog(prev => (entry ? { ...prev, [date]: entry } : prev));
  };
  // Adicionar um SERVIÇO ao dia (2.º+ período) — a EASA conta por SERVIÇO, não por dia (210).
  // Empilha em `extra` SEM tocar na primária e recalcula o FTL do dia com TODOS os serviços
  // (dayFtlFromDuties). Sem primária → é o 1.º serviço (cai no saveDuty normal).
  const addDutyService = (date, fields) => {
    const cur = dutiesRef.current?.[date];
    if (!cur || cur.deleted) { saveDuty(date, fields); return; }
    const newExtra = [...(cur.extra || []), svcFromFields(fields, 'manual')];   // novo 2.º serviço À MÃO
    setDuties(prev => (prev[date] ? { ...prev, [date]: { ...prev[date], extra: newExtra, updated_at: new Date().toISOString(), dirty: true } } : prev));
    recomputeDay(date, cur, newExtra);   // soma 210, pior PSV 205, repouso entre serviços 235
  };
  // Editar o SERVIÇO extra de índice `index` (0-based no array `extra`).
  const updateDutyService = (date, index, fields) => {
    const cur = dutiesRef.current?.[date];
    if (!cur || !Array.isArray(cur.extra) || index < 0 || index >= cur.extra.length) return;
    // Editar PRESERVA a proveniência do serviço (editar um do calendário à mão NÃO o torna manual).
    const newExtra = cur.extra.map((e, i) => (i === index ? svcFromFields(fields, e?.source || 'manual') : e));
    setDuties(prev => (prev[date] ? { ...prev, [date]: { ...prev[date], extra: newExtra, updated_at: new Date().toISOString(), dirty: true } } : prev));
    recomputeDay(date, cur, newExtra);
  };
  // Apagar o SERVIÇO extra de índice `index` — só os extra (a primária apaga-se no DutyDetail).
  const removeDutyService = (date, index) => {
    const cur = dutiesRef.current?.[date];
    if (!cur || !Array.isArray(cur.extra) || index < 0 || index >= cur.extra.length) return;
    const newExtra = cur.extra.filter((_, i) => i !== index);
    setDuties(prev => (prev[date] ? { ...prev, [date]: { ...prev[date], extra: newExtra.length ? newExtra : null, updated_at: new Date().toISOString(), dirty: true } } : prev));
    recomputeDay(date, cur, newExtra);
  };

  // Empurra pendentes (dirty/deleted) para o Supabase. Best-effort: o que falhar
  // (offline) fica pendente e tenta de novo no foreground / próxima alteração.
  const flushDuties = useCallback(async (uid) => {
    if (!uid || dutiesSyncing.current) return;
    const pend = Object.entries(dutiesRef.current).filter(([, d]) => d.dirty || d.deleted);
    if (!pend.length) return;
    dutiesSyncing.current = true;
    let okN = 0, failN = 0;
    try {
      for (const [date, d] of pend) {
        if (d.deleted) {
          const err = await deleteDuty(uid, date);
          if (!err) { setDuties(prev => { const n = { ...prev }; if (n[date]?.deleted && n[date]?.updated_at === d.updated_at) delete n[date]; return n; }); okN++; }
          else { console.warn('[duties] delete falhou', date, err); failN++; }
        } else if (d.dirty) {
          const err = await upsertDuty(uid, { duty_date: date, report_time: d.report_time, block_off: d.block_off, block_on: d.block_on, sectors: d.sectors, flight_minutes: d.flight_minutes, route: d.route, kind: d.kind, nightStop: d.nightStop, source: d.source, snap: d.snap, legs: d.legs, signOff: d.signOff, special: d.special, accommodation: d.accommodation, extra: d.extra });
          // Só limpa a flag se nada mudou entretanto (evita perder edições concorrentes).
          if (!err) { setDuties(prev => (prev[date] && prev[date].updated_at === d.updated_at ? { ...prev, [date]: { ...prev[date], dirty: false } } : prev)); okN++; }
          else { console.warn('[duties] upsert falhou', date, err); failN++; }
        }
      }
    } finally { dutiesSyncing.current = false; }
    // Feedback: tudo no servidor → "Sincronizado"; algo falhou (offline) → "Guardado offline".
    if (failN > 0) setToast({ kind: 'warn', ts: Date.now() });
    else if (okN > 0) setToast({ kind: 'sync', ts: Date.now() });
  }, []);

  // When a user logs in, pre-populate profile if they already have one saved
  const handleSetUser = (u) => {
    setUser(u);
    if (u && u.company) {
      setProfile({ company: u.company });
      setOnboarded(true);
    } else {
      setOnboarded(false);
    }
  };

  const logout = () => {
    // Limpa o estado local PRIMEIRO → vai já para o Login (mesmo offline/rede lenta).
    setUser(null);
    setOnboarded(false);
    setProfile({ company: null });
    setLocked(false); // sai do estado trancado — o próximo login começa destrancado
    // Termina a sessão no servidor em segundo plano (não bloqueia a navegação).
    supabase.auth.signOut().catch(() => {});
    // Os favoritos/notificações ficam guardados por utilizador no telemóvel;
    // limpamos apenas o estado em memória (o efeito de user?.id trata disso).
  };

  // Offline-first: a sessão é persistida (persistSession: true). No arranque,
  // getSession() lê a sessão guardada localmente (sem rede) e restaura-a — sem
  // novo login. O listener reage a logout / expiração (SIGNED_OUT) e à recuperação
  // de palavra-passe. Ler também a preferência de bloqueio (cp_lock) aqui evita
  // a corrida com o gate: se há sessão restaurada e o bloqueio está ativo, trancar.
  useEffect(() => {
    (async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();
        // Recuperação de password ABANDONADA (verifyResetCode criou sessão, resetPassword nunca
        // correu): NUNCA restaurar essa sessão — sai e limpa a marca (auditoria 2026-09-03).
        if (session?.user && await hasPendingReset()) {
          await supabase.auth.signOut().catch(() => {});
          session = null;
        }
        await clearPendingReset();
        if (session?.user) {
          let u = session.user;
          // Se a sessão persistida traz marca de eliminação, VALIDA no servidor (o JWT local pode
          // estar stale: reativou mas o refresh falhou → getUser traz a marca já limpa; ou o cron já
          // apagou a conta → getUser dá erro → sai limpo p/ o login, sem cair no gate de reativação).
          if (u.app_metadata?.deletion_scheduled_at) {
            try {
              const { data, error } = await supabase.auth.getUser();
              if (error) { await supabase.auth.signOut().catch(() => {}); u = null; }
              else if (data?.user) u = data.user;
            } catch { /* offline → mantém o local (conservador: mostra o gate, revalida quando houver rede) */ }
          }
          if (u) {
            // Preferência de bloqueio POR-UTILIZADOR (migra-e-limpa o global legado — ver loadLockPref).
            // Lida ANTES de mostrar qualquer ecrã → sem flash de conteúdo. FAIL-CLOSED: se a leitura
            // falhar, TRANCA (não expor dados na dúvida; recuperável pelo escape do LockScreen).
            let enabled = false;
            try { enabled = await loadLockPref(u.id); } catch { enabled = true; }
            // Sessão restaurada (reabertura), não login fresco → exigir desbloqueio já.
            if (enabled) { setLockEnabled(true); setLocked(true); }
            handleSetUser(mapUser(u));
          }
        }
      } catch { /* sem sessão guardada / storage indisponível */ }
      lockHydrated.current = true;
      setAuthLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') return;
      if (suppressAuth.current) return;
      // Sign-in navigation is handled directly in the login handler so we control
      // the flow; here we only react to a sign-out (logout / password reset).
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setOnboarded(false);
        setLocked(false);
        setLockEnabled(false); // limpa a preferência em memória → o próximo login não herda a de outra conta
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persistir a preferência de bloqueio POR-UTILIZADOR (só depois de hidratar, e só com sessão: no
  // logout reseta em memória mas NÃO apaga a chave guardada, p/ o próximo login a reencontrar).
  useEffect(() => {
    if (lockHydrated.current && user?.id) AsyncStorage.setItem(`cp_lock_${user.id}`, lockEnabled ? '1' : '0').catch(() => {});
  }, [lockEnabled]); // eslint-disable-line react-hooks/exhaustive-deps -- user lido do closure atual (dep [lockEnabled] de propósito, p/ não escrever na troca de conta)

  // Recarrega a preferência de bloqueio quando o UTILIZADOR muda (novo login no mesmo device) →
  // ninguém herda a de outra conta; migra do global antigo. Trancar já (sessão restaurada) é do
  // arranque — aqui NUNCA se tranca (login fresco não pede desbloqueio).
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try { setLockEnabled(await loadLockPref(user.id)); }
      catch { /* falha de leitura: mantém o estado; login fresco nunca tranca por causa disto */ }
    })();
  }, [user?.id]);

  // Face ID/PIN — oferta pós-1.º login (padrão Apple/bancos): deteta se o device consegue biometria
  // (hardware + configurado) e carrega, POR-UTILIZADOR, se já foi oferecido. Só se oferece uma vez.
  useEffect(() => {
    (async () => {
      try { const [hw, en] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]); setBioAvailable(!!(hw && en)); }
      catch { setBioAvailable(false); }
    })();
  }, []);
  useEffect(() => {
    if (!user?.id) { setLockOffered(null); return; }
    AsyncStorage.getItem(`cp_lock_offered_${user.id}`).then((v) => setLockOffered(v === '1')).catch(() => setLockOffered(false));
  }, [user?.id]);
  const markOffered = () => { setLockOffered(true); if (user?.id) AsyncStorage.setItem(`cp_lock_offered_${user.id}`, '1').catch(() => {}); };

  // Segundo plano: (1) privacidade — tapa o conteúdo enquanto não está 'active' para não aparecer
  // na pré-visualização do multitarefas (padrão banca); (2) re-bloqueia ao voltar se passou o
  // timeout e o bloqueio está ativo. Reaberturas rápidas (< 5 min) não pedem desbloqueio.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setObscured(false);
        if (lockEnabled && bgAt.current && (Date.now() - bgAt.current > LOCK_TIMEOUT_MS)) setLocked(true);
        bgAt.current = null;
      } else {
        setObscured(true); // 'background' / 'inactive'
        if (bgAt.current == null) bgAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [lockEnabled]);

  // Idioma: por defeito segue a língua do TELEMÓVEL (PT→PT, qualquer outra→EN) — já resolvido no
  // useState acima (síncrono, sem flash no login). Aqui só uma ESCOLHA GUARDADA do utilizador
  // (no Perfil) prevalece; sem escolha, fica o detetado do dispositivo.
  const langHydrated = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('cp_lang');
        if (saved === 'pt' || saved === 'en') setLang(saved);
      } catch { /* storage indisponível — mantém o detetado no useState */ }
      langHydrated.current = true;
    })();
  }, []);
  useEffect(() => { if (langHydrated.current) AsyncStorage.setItem('cp_lang', lang).catch(() => {}); }, [lang]);

  // Catálogo de companhias (global) — carrega já no ARRANQUE, também pré-login, para
  // o wizard de criação de conta poder mostrar as companhias antes de a conta existir.
  // Cache instantânea → refresca do servidor (precisa da política RLS anon, schema §10).
  useEffect(() => {
    AsyncStorage.getItem('cp_airlines').then((al) => { if (al) setAirlines(JSON.parse(al)); }).catch(() => {});
    fetchAirlines().then((fresh) => {
      if (fresh.length) { setAirlines(fresh); AsyncStorage.setItem('cp_airlines', JSON.stringify(fresh)).catch(() => {}); }
    });
  }, []);

  // Catálogo de BASES + PAÍSES (global) — carrega já no ARRANQUE, também pré-login, para o
  // wizard de criação de conta mostrar o picker de base agrupado por país. Cache instantânea
  // → refresca do servidor. Degrada com elegância ([] se as tabelas ainda não existirem).
  useEffect(() => {
    AsyncStorage.getItem('cp_bases').then((b) => { if (b) setBases(JSON.parse(b)); }).catch(() => {});
    AsyncStorage.getItem('cp_countries').then((c) => { if (c) setCountries(JSON.parse(c)); }).catch(() => {});
    fetchBases().then((fresh) => { if (fresh.length) { setBases(fresh); AsyncStorage.setItem('cp_bases', JSON.stringify(fresh)).catch(() => {}); } });
    fetchCountries().then((fresh) => { if (fresh.length) { setCountries(fresh); AsyncStorage.setItem('cp_countries', JSON.stringify(fresh)).catch(() => {}); } });
  }, []);

  // Favoritos / notificações lidas são guardados POR UTILIZADOR no telemóvel.
  // Carregam quando o utilizador entra; ficam gravados para esse utilizador.
  useEffect(() => {
    hydrated.current = false;
    if (!user?.id) { setReadNotifIds(new Set()); setDayLog({}); setValidities([]); setRemindersOn(false); setCalendarId(null); setCalendarName(null); cancelAllReminders(); setLoadedUserId(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [r, dl, fs, pf, al, ax, vd, rm, ci, cn, ev, ht, rlg] = await Promise.all([
          AsyncStorage.getItem(`cp_read_${user.id}`),
          AsyncStorage.getItem(`cp_daylog_${user.id}`),
          AsyncStorage.getItem(`cp_ftlsnap_${user.id}`),
          AsyncStorage.getItem(`cp_profile_${user.id}`),
          AsyncStorage.getItem('cp_airlines'),
          AsyncStorage.getItem(`cp_ae_extras_${user.id}`),
          AsyncStorage.getItem(`cp_validities_${user.id}`),
          AsyncStorage.getItem(`cp_reminders_${user.id}`),
          AsyncStorage.getItem(`cp_calendar_id_${user.id}`),
          AsyncStorage.getItem(`cp_calendar_name_${user.id}`),
          AsyncStorage.getItem(`cp_ae_events_${user.id}`),
          AsyncStorage.getItem(`cp_hotels_${user.id}`),
          AsyncStorage.getItem(`cp_rosterlog_${user.id}`),
        ]);
        if (cancelled) return;
        setCalendarId(ci || null);   // calendário do telemóvel escolhido (id) ou null = não ligado
        setCalendarName(cn || null); // nome do calendário (para o selo "Calendário · <nome>")
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
        // Extras do mês = EVENTOS DATADOS. Os CONTADORES antigos (cp_ae_extras) migram UMA
        // vez para eventos só-mês ("dia não registado") e o balde antigo esvazia-se —
        // um só modelo, tudo editável (nada fica "só leitura").
        try {
          let events = [];
          try { events = ev ? (JSON.parse(ev) || []) : []; } catch { events = []; }
          let counters = {};
          try { counters = ax ? (JSON.parse(ax) || {}) : {}; } catch { counters = {}; }
          if (Object.keys(counters).length) {
            events = [...countersToEvents(counters), ...events];
            setAeExtras({});   // migrado → esvazia (o efeito de persistência grava o vazio)
          } else {
            setAeExtras({});
          }
          setAeEvents(events);
        } catch { setAeEvents([]); setAeExtras({}); }
        try { setHotels(ht ? (JSON.parse(ht) || {}) : {}); } catch { setHotels({}); }   // hotéis de pernoita
        try { setRosterLog(rlg ? (JSON.parse(rlg) || []) : []); } catch { setRosterLog([]); }  // arquivo de alterações (disrupção)
        try { setValidities(vd ? (JSON.parse(vd) || []) : []); } catch { setValidities([]); }  // validades & docs
        setRemindersOn(rm === '1');                                                          // lembretes opt-in
        // Catálogo de companhias (global): cache instantânea → refresca do servidor.
        if (al) setAirlines(JSON.parse(al));
        fetchAirlines().then(fresh => {
          if (!cancelled && fresh.length) { setAirlines(fresh); AsyncStorage.setItem('cp_airlines', JSON.stringify(fresh)).catch(() => {}); }
        });
        if (dl) {
          setDayLog(JSON.parse(dl));
        } else if (fs) {
          // Migração one-time: o snapshot único antigo passa para o dia de hoje.
          const old = JSON.parse(fs);
          setDayLog(old && Object.keys(old).length ? { [isoDay()]: old } : {});
        } else {
          setDayLog({});
        }
        // Perfil: tabela `profiles` (servidor) → cache local → metadata do Auth.
        const localProfile = pf ? JSON.parse(pf) : null;
        let resolved = await fetchProfile(user.id);
        if (cancelled) return;
        if (!resolved) resolved = localProfile;
        if (!resolved && user.company) resolved = { company: user.company, crewType: user.crewType || 'cabin' };
        if (resolved && resolved.company) {
          // crewCategory/crewContract (piloto) não existem na tabela `profiles` —
          // vêm da cache local ou do metadata do Auth.
          const crewCategory = resolved.crewCategory || localProfile?.crewCategory || user.crewCategory || null;
          const crewContract = resolved.crewContract || localProfile?.crewContract || user.crewContract || null;
          const serviceStart = resolved.serviceStart || localProfile?.serviceStart || user.serviceStart || null;
          const base = resolved.base || localProfile?.base || user.base || null;
          // PPY como estilo de vida (Art. 66.9) → sem retenção. Metadata/cache (≠ tabela profiles).
          const lifestyle = resolved.lifestyle ?? localProfile?.lifestyle ?? user.lifestyle ?? false;
          const instructorRated = resolved.instructorRated ?? localProfile?.instructorRated ?? user.instructorRated ?? false;
          // Frota do piloto (WB/NB) — só os AE com `FLEETS` (TAP) a usam, p/ a coluna de per-diem.
          const crewFleet = resolved.crewFleet || localProfile?.crewFleet || user.crewFleet || null;
          // Serviço pós-voo / débrief (min) — definido pelo OM do operador (ORO.FTL.235c). Entra nas
          // Duty hours/210/repouso. NULL = "por definir" → a resolução efetiva (resolvePostFlight)
          // aplica o OM da companhia ou o assumido 30 (o default 0 antigo subcontava o serviço).
          const postFlightMin = resolved.postFlightMin ?? localProfile?.postFlightMin ?? user.postFlightMin ?? null;
          // Plafond ANUAL de férias (dias) — CT Art. 238.º: mínimo 22 dias úteis/ano; o AE/
          // contrato pode dar mais (ou menos, proporcional no ano de entrada). Alimenta o saldo.
          // NULL = "por derivar" → o resolver aplica AE (fonte BTE) ou a lei (Art. 238.º/239.º CT).
          const vacationDaysYear = resolved.vacationDaysYear ?? localProfile?.vacationDaysYear ?? user.vacationDaysYear ?? null;
          // Vínculo + cobertura do AE (lei: art. 496º CT). `employment` (por conta de outrem/agência/
          // independente) é o eixo legal; `aeCovered` é o override (raro: empregado não filiado).
          // Default: empregado + coberto → ZERO disrupção para quem já existe.
          const employment = resolved.employment || localProfile?.employment || user.employment || 'employee';
          const aeCovered = resolved.aeCovered ?? localProfile?.aeCovered ?? user.aeCovered ?? true;
          // Categoria/contrato EFFECTIVE-DATED: linha do tempo (metadados). Migração suave do
          // modelo antigo (escalar) → 1 período = valor atual cobre o passado (sem disrupção).
          const crewHistory = migrateCrew({ crewHistory: resolved.crewHistory || localProfile?.crewHistory || user.crewHistory, crewCategory, crewContract, serviceStart });
          setProfile({ company: resolved.company, crewType: resolved.crewType || 'cabin', crewCategory, crewContract, crewFleet, crewHistory, serviceStart, base, lifestyle, instructorRated, postFlightMin, vacationDaysYear, employment, aeCovered });
          setOnboarded(true);
        } else {
          setOnboarded(false);
        }
      } catch { /* primeira execução / storage indisponível */ }
      finally { if (!cancelled) { hydrated.current = true; setLoadedUserId(user.id); } }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persistir (só depois de hidratar e com utilizador, para não apagar o guardado).
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_read_${user.id}`, JSON.stringify([...readNotifIds])).catch(() => {}); }, [readNotifIds, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_daylog_${user.id}`, JSON.stringify(dayLog)).catch(() => {}); }, [dayLog, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_ae_extras_${user.id}`, JSON.stringify(aeExtras)).catch(() => {}); }, [aeExtras, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_ae_events_${user.id}`, JSON.stringify(aeEvents)).catch(() => {}); }, [aeEvents, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_hotels_${user.id}`, JSON.stringify(hotels)).catch(() => {}); }, [hotels, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_rosterlog_${user.id}`, JSON.stringify(rosterLog)).catch(() => {}); }, [rosterLog, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_validities_${user.id}`, JSON.stringify(validities)).catch(() => {}); }, [validities, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_reminders_${user.id}`, remindersOn ? '1' : '0').catch(() => {}); }, [remindersOn, user?.id]);
  useEffect(() => { if (!hydrated.current || !user?.id) return; if (calendarId) AsyncStorage.setItem(`cp_calendar_id_${user.id}`, calendarId).catch(() => {}); else AsyncStorage.removeItem(`cp_calendar_id_${user.id}`).catch(() => {}); }, [calendarId, user?.id]);
  useEffect(() => { if (!hydrated.current || !user?.id) return; if (calendarName) AsyncStorage.setItem(`cp_calendar_name_${user.id}`, calendarName).catch(() => {}); else AsyncStorage.removeItem(`cp_calendar_name_${user.id}`).catch(() => {}); }, [calendarName, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id && profile?.company) AsyncStorage.setItem(`cp_profile_${user.id}`, JSON.stringify(profile)).catch(() => {}); }, [profile, user?.id]);

  // Duties: cache local instantânea → merge com o servidor (histórico). Pendentes
  // locais (dirty/deleted) vencem sobre o servidor (ainda não foram enviados).
  useEffect(() => {
    dutiesHydrated.current = false;
    if (!user?.id) { setDuties({}); return; }
    let cancelled = false;
    (async () => {
      let local = {};
      try { const raw = await AsyncStorage.getItem(`cp_duties_${user.id}`); if (raw) local = JSON.parse(raw) || {}; } catch { /* primeira execução */ }
      if (cancelled) return;
      setDuties(local);
      dutiesHydrated.current = true;
      const server = await fetchDuties(user.id); // [] em erro/offline
      if (cancelled || !server.length) { if (!cancelled) flushDuties(user.id); return; }
      setDuties(prev => {
        const merged = { ...prev };
        for (const row of server) {
          const cur = merged[row.duty_date];
          if (cur && (cur.dirty || cur.deleted)) continue; // pendente local vence
          // roster_meta (Fase 4): JSON { source, snap, legs, signOff, special } — origem + snapshot
          // + nº de voo + fim de serviço + casos especiais FTL (205c/205g/225).
          let source = 'manual', snap = null, legs = null, signOff = null, special = null, extra = null, accommodation = false, role = null, dayOffWorked = null, officeType = null, eLearning = false;
          try { const m = row.roster_meta ? JSON.parse(row.roster_meta) : null; if (m) { source = m.source || 'manual'; snap = m.snap || null; legs = m.legs || null; signOff = m.signOff || null; special = m.special || null; accommodation = m.accommodation || false; role = m.role || (m.instructor ? 'instr' : null); dayOffWorked = m.dayOffWorked || null; officeType = m.officeType || null; eLearning = !!m.eLearning; extra = (m.extra && m.extra.length) ? m.extra : null; } } catch { /* meta inválida */ }
          merged[row.duty_date] = {
            report_time: row.report_time, block_off: row.block_off, block_on: row.block_on,
            sectors: row.sectors, flight_minutes: row.flight_minutes, route: row.notes || null,
            kind: row.kind || 'flight', nightStop: !!row.night_stop, source, snap, legs, signOff, special, accommodation, role, dayOffWorked, officeType, eLearning, extra,
            duty_date: row.duty_date, updated_at: row.updated_at, dirty: false, deleted: false,
          };
        }
        return merged;
      });
      flushDuties(user.id); // empurra pendentes acumulados offline
    })();
    return () => { cancelled = true; };
  }, [user?.id, flushDuties]);

  // Persistir a cache local sempre que mudar (depois de hidratar, com utilizador).
  useEffect(() => { if (dutiesHydrated.current && user?.id) AsyncStorage.setItem(`cp_duties_${user.id}`, JSON.stringify(duties)).catch(() => {}); }, [duties, user?.id]);

  // ── Voo ao vivo: marcadores de "registo atrasado face ao real" (load/save/mark/prune) ──
  // Persistidos à parte das duties (NÃO tocam na duty — só avisam). Carregar ao entrar.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    AsyncStorage.getItem(`cp_livesync_${user.id}`).then((raw) => {
      if (cancelled) return;
      try { if (raw) { const parsed = JSON.parse(raw) || {}; setLiveSync(parsed); lastLiveSyncDates.current = new Set(Object.keys(parsed)); } } catch { /* corrompido → ignora */ }
      liveSyncHydrated.current = true;
    }).catch(() => { liveSyncHydrated.current = true; });
    return () => { cancelled = true; };
  }, [user?.id]);
  useEffect(() => { if (liveSyncHydrated.current && user?.id) AsyncStorage.setItem(`cp_livesync_${user.id}`, JSON.stringify(liveSync)).catch(() => {}); }, [liveSync, user?.id]);
  // O Início deteta e MARCA (o feed ao vivo só existe lá). Idempotente: mesmo real → no-op.
  const markLiveSync = useCallback((date, info) => {
    if (!date || !info || !info.realArrZ) return;
    setLiveSync((prev) => {
      const cur = prev[date];
      if (cur && cur.realArrZ === info.realArrZ) return prev;   // já marcado com o mesmo real
      return { ...prev, [date]: { flightNo: info.flightNo || null, realArrZ: info.realArrZ, schedArrZ: info.schedArrZ || null, at: isoDay() } };
    });
  }, []);
  const dismissLiveSync = useCallback((date) => setLiveSync((prev) => { if (!prev[date]) return prev; const n = { ...prev }; delete n[date]; return n; }), []);
  // LIMPA sozinho: quando o on-block guardado apanha o real (sincronizaste) ou a duty desaparece.
  // Corre a cada mudança das duties (a sincronização acaba sempre por mexer nelas).
  useEffect(() => {
    if (!liveSyncHydrated.current) return;
    setLiveSync((prev) => {
      const dates = Object.keys(prev);
      if (!dates.length) return prev;
      let changed = false; const next = { ...prev };
      for (const date of dates) {
        const d = duties[date];
        if (!d || d.deleted) { delete next[date]; changed = true; continue; }       // duty apagada → sinal morto
        const leg = Array.isArray(d.legs) && d.legs.length ? d.legs[d.legs.length - 1] : (d.block_on ? { on: d.block_on } : null);
        const storedOnZ = leg ? legZulu(date, leg, 'on') : null;
        if (storedOnZ && storedMatchesReal(storedOnZ, prev[date].realArrZ)) { delete next[date]; changed = true; }  // apanhou o real
      }
      return changed ? next : prev;
    });
  }, [duties]);

  // Reconstrói o histórico FTL (dayLog) a partir das duties SINCRONIZADAS — preenche só
  // os dias EM FALTA (dispositivo novo / pós-reinstalação: as duties vêm do servidor,
  // mas o dayLog é local). Corre quando a hidratação terminou (loadedUserId, com o
  // dayLog em cache já aplicado) e a cada mudança das duties. Fill-only e idempotente
  // (não toca em registos manuais nem nos derivados existentes; ref igual = no-op).
  useEffect(() => {
    if (!loadedUserId || !dutiesHydrated.current) return;
    setDayLog(prev => reconcileDayLog(duties, prev, { postFlightMin, isPilot, base }));
    // deps em profile.* (não na const postFlightMin, declarada ABAIXO — a dep array avalia
    // no render = TDZ); company muda a resolução OM/assumido → também é dep.
  }, [duties, loadedUserId, profile?.postFlightMin, profile?.company]); // isPilot/postFlightMin lidos por closure

  // Sincronizar pendentes: a cada alteração com pendentes e ao voltar ao foreground.
  useEffect(() => {
    if (!dutiesHydrated.current || !user?.id) return;
    if (Object.values(duties).some(d => d.dirty || d.deleted)) flushDuties(user.id);
  }, [duties, user?.id, flushDuties]);
  useEffect(() => {
    if (!user?.id) return;
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') flushDuties(user.id); });
    return () => sub.remove();
  }, [user?.id, flushDuties]);
  // Ligação de rede: atualiza o banner e, ao reconectar (offline→online), empurra
  // a outbox — o gatilho que faltava ("o wifi voltou com a app aberta").
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const next = state.isConnected !== false; // null (a determinar) → otimista
      const wasOnline = onlineRef.current;
      onlineRef.current = next;
      setOnline(next);
      if (next && !wasOnline && user?.id) flushDuties(user.id);
    });
    return () => unsub();
  }, [user?.id, flushDuties]);

  // Companhia resolvida a partir do catálogo `airlines`. Tolera id (novo) OU slug
  // (dados legados de utilizadores anteriores) — ponte de migração. O motor deriva
  // do `engine_code`.
  const company = airlines.find(a => a.id === profile.company || a.slug === profile.company) || null;
  // Papel da tripulação (onboarding → profiles.crew_type): adapta motor/UI.
  const crewType = profile?.crewType || 'cabin';   // 'cabin' | 'pilot'
  const isPilot = crewType === 'pilot';
  const crewCategory = profile?.crewCategory || null;  // CPT|SFO|FO|SO (pilotos com AE)
  const crewContract = profile?.crewContract || null;  // modalidade de contrato (AE) — ATUAL
  const crewFleet = profile?.crewFleet || null;        // frota WB/NB (só AE com `FLEETS`, ex. TAP) → coluna per-diem
  // Débrief/pós-voo EFETIVO (3 estados honestos, 2026-07-11): teu valor > OM da companhia
  // (easyJet 30) > 30 ASSUMIDO (conservador). O Perfil mostra o estado (postFlightSource).
  const pfResolved = resolvePostFlight(profile?.postFlightMin, company);
  const postFlightMin = pfResolved.min;
  const postFlightSource = pfResolved.source;   // 'user' | 'om' | 'assumed'
  // (vacationDaysYear resolve-se ABAIXO, depois do `ae`/antiguidade — 3 camadas: teu > AE > lei.)
  // Categoria/contrato EFFECTIVE-DATED: a linha do tempo + um resolver por-mês. crewCategory/
  // crewContract (acima) = o ATUAL (último período); crewAt(ym) dá o que valia nesse mês — a
  // categoria escala o AE inteiro (base+per-diem+pernoita), por isso o passado fica congelado.
  const crewHistory = profile?.crewHistory || [];
  const crewAt = (ym) => resolveCrew(crewHistory, ym);
  // Antiguidade: guardamos a DATA de início (metadata, estável) e derivamos os anos
  // completos de serviço — alimenta o prémio de permanência (AE piloto, Anexo I.9).
  const serviceStart = profile?.serviceStart || null;  // 'AAAA-MM-DD'
  const base = profile?.base || null;                  // base = CÓDIGO IATA (ex. LIS), vem dos metadados
  // Base completa resolvida do catálogo (cidade/país) por (companhia, código). null se
  // não houver base ou o catálogo ainda não tiver carregado — os consumidores usam `base`
  // (o código) como fallback, por isso nada parte sem o catálogo.
  const baseObj = base ? (bases.find((b) => b.code === base && b.airline_id === company?.id) || bases.find((b) => b.code === base) || null) : null;
  const lifestyle = !!profile?.lifestyle;              // PPY como estilo de vida (Art. 66.9) → sem retenção
  const instructorRated = !!profile?.instructorRated;  // qualificação de instrutor (Art. 42) — opt-in
  const serviceYears = (() => {
    if (!serviceStart) return null;
    const sd = new Date(`${serviceStart}T00:00:00`);
    if (isNaN(sd)) return null;
    const now = new Date();
    let y = now.getFullYear() - sd.getFullYear();
    if (now.getMonth() < sd.getMonth() || (now.getMonth() === sd.getMonth() && now.getDate() < sd.getDate())) y--;
    return Math.max(0, y);
  })();
  // COBERTURA pelo AE (lei: art. 496º CT — o IRCT abrange os TRABALHADORES da empresa, filiados/
  // aderentes, na categoria). O vínculo é o eixo legal: empregado (por conta de outrem) → coberto
  // por default; agência/independente → NÃO coberto (estrutural). `aeCovered` é o override (raro:
  // empregado não filiado). Default tudo coberto → ZERO disrupção p/ quem já existe.
  const employment = profile?.employment || 'employee';      // vínculo: 'employee' | 'agency' | 'independent'
  const aeCoveredOverride = profile?.aeCovered;              // override (raro: empregado não filiado). Default ON.
  const covered = employment === 'employee' ? (aeCoveredOverride !== false) : false;  // cobertura EFETIVA
  // AE (Acordo de Empresa) da companhia, por crewType — SPAC piloto / SNPVAC cabine. Companhia FTL
  // → null. SE não-coberto → ae = null também (degrada o PAGAMENTO em toda a app; FTL fica intacto).
  const companyAe = getAeForProfile({ company: company || profile?.company, crewType });
  const ae = covered ? companyAe : null;
  // Matriz de capacidades — fonte única do que cada ecrã mostra/pede (AE↔FTL, piloto↔cabine).
  const caps = capabilitiesFor({ company: company || profile?.company, crewType, contract: crewContract || '12/12', lifestyle, aeCovered: covered });
  // Estado do AE (honesto): modeled (motor AE) / uncovered (companhia tem AE mas TU não estás
  // abrangido → FTL-only p/ pay) / pending (AE publicado por modelar) / none (sem AE). Ver ae/index.js.
  const aeStatus = aeStatusFor({ ae: companyAe, company, crewType, covered });

  // Férias/ano EFETIVO (3 camadas, 2026-07-11, BTE lido na fonte): teu valor > AE
  // (easyJet: pilotos Art. 68.º = 25 proporcional · cabine Cl. 72.ª = 25/26+contratos)
  // > lei (ano de admissão proporcional Art. 239.º · senão 22, Art. 238.º CT).
  const vacResolved = resolveVacationDays(profile?.vacationDaysYear, { ae, contract: crewContract || '12/12', serviceYears, serviceStart });
  const vacationDaysYear = vacResolved.days;
  const vacationSource = vacResolved.source;   // 'user' | 'ae' | 'law-first' | 'law'

  // Fase 4 — deteção de alterações de escala (calendário vs guardado). Best-effort:
  // lê o próximo ~mês do calendário, compara com as duties e expõe o diff. Sem
  // permissão de calendário → não faz nada. NÃO altera nada (o utilizador revê/aplica).
  // Devolve o diff ({changed,added,removed,counts,...}) para quem chama (ex.: botão Sincronizar
  // dar feedback "em dia" vs "X mudanças"); null quando não leu (sem calendário/sem leitura/erro).
  const checkRosterChanges = useCallback(async () => {
    if (!calendarId) return null;   // só deteta se houver calendário LIGADO (sem prompt; sem leitura "às cegas")
    try {
      const co = company?.slug;
      // Janela da DETEÇÃO: de HOJE até ao fim do mês SEGUINTE — explícita, porque a opção
      // 'month' do rangeFromOption passou a ser o mês civil seguinte (2026-07-10) e herdá-la
      // aqui deixava a deteção CEGA para o resto do mês corrente (onde vive o RDP no-dia).
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 2, 1);
      const [fl, nf] = await Promise.all([getDutiesInRange(start, end, co, calendarId), getNonFlightInRange(start, end, co, calendarId)]);
      if (!fl.ok && !nf.ok) return null;   // sem leitura válida → não marca cancelamentos
      const incoming = buildIncoming({ activities: fl.duties || [], nonflights: nf.items || [] });
      const window = { start: isoDay(start), end: isoDay(end) };
      // SÓ DETETA (não grava): expõe o diff p/ o user rever e CONFIRMAR no import (decisão do
      // user — nada entra no `duties` sem confirmação). Gravar = RosterImportSheet → saveDuty.
      const res = diffRoster({ incoming, duties: dutiesRef.current, window });
      setRosterChanges(res);
      return res;
    } catch { return null; /* best-effort */ }
  }, [company, calendarId]);
  // Corre quando o perfil fica pronto e ao voltar ao foreground (auto, ao focar) — SÓ se ligado.
  useEffect(() => { if (onboarded && company && calendarId) checkRosterChanges(); }, [onboarded, company, calendarId, checkRosterChanges]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') checkRosterChanges(); });
    return () => sub.remove();
  }, [checkRosterChanges]);

  // Validades & documentos (premium v1) — CRUD local simples.
  const addValidity = (item) => setValidities((prev) => [...prev, { id: `v${Date.now().toString(36)}${prev.length}`, ...item }]);
  const updateValidity = (id, patch) => setValidities((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const removeValidity = (id) => setValidities((prev) => prev.filter((v) => v.id !== id));

  // Lembretes locais (premium · #3) — opt-in. Reagenda quando validades/duties mudam e
  // notifica quando a escala muda. (isPilot/lang lidos por closure → fora das deps p/ evitar TDZ.)
  const lastRosterSig = useRef(null);
  const toggleReminders = async (on) => {
    if (on) {
      // Honesto, não mudo: no Expo Go o toggle não pode ligar (nativo amputado) — DIZ porquê
      // em vez de falhar em silêncio. No dev build este ramo nunca dispara.
      if (remindersUnavailableReason() === 'expo-go') {
        notify(
          lang === 'en' ? 'Reminders need the full app' : 'Lembretes precisam da app completa',
          lang === 'en' ? 'Notifications are disabled inside Expo Go — they will work in the final build.' : 'No Expo Go as notificações estão desativadas — ficam prontos na app final.',
          'warn',
        );
        return;
      }
      const granted = await requestRemindersPermission();
      if (!granted) return;                       // sem permissão → fica desligado
      setRemindersOn(true);
      syncReminders({ validities, isPilot, duties, todayISO: isoDay(), lang });
    } else { setRemindersOn(false); cancelAllReminders(); }
  };
  useEffect(() => {
    if (remindersOn) syncReminders({ validities, isPilot, duties, todayISO: isoDay(), lang });
  }, [remindersOn, validities, duties]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!remindersOn) return;
    const rc = rosterChanges;
    if (!rc || !rc.counts || !rc.counts.total) return;
    const sig = [...(rc.changed || []), ...(rc.conflict || []), ...(rc.added || []), ...(rc.removed || [])].map((x) => x.date).sort().join(',');
    if (sig && sig !== lastRosterSig.current) { lastRosterSig.current = sig; notifyRosterChange(rc.counts, lang); }
  }, [rosterChanges, remindersOn]); // eslint-disable-line react-hooks/exhaustive-deps
  // Notifica quando aparece um serviço NOVO com o registo atrasado face ao real (dedupe por
  // conjunto de datas: só dispara nas datas FRESCAS, nunca ao limpar). NUNCA notifica ao resolver.
  useEffect(() => {
    if (!remindersOn) return;
    const dates = Object.keys(liveSync);
    const prevSet = lastLiveSyncDates.current || new Set();
    const fresh = dates.filter((d) => !prevSet.has(d));
    lastLiveSyncDates.current = new Set(dates);
    if (fresh.length) notifyLiveSync(dates.length, lang);
  }, [liveSync, remindersOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    airlines, bases, countries, company, crewType, isPilot, crewCategory, crewContract, crewFleet, postFlightMin, postFlightSource, vacationDaysYear, vacationSource, employment, aeCovered: aeCoveredOverride, covered, crewHistory, crewAt, serviceStart, serviceYears, base, baseObj, lifestyle, instructorRated, ae, caps, aeStatus,
    aeExtras, setAeExtras,
    aeEvents, addAeEvents, removeAeEvent,
    openExtra: () => setExtraOpen(true),
    hotels, saveHotel, saveHotelAt, addHotelAlt, makeHotelCurrent, removeHotelAt, removeHotel,
    rosterLog, addRosterLog,
    validities, addValidity, updateValidity, removeValidity,
    remindersOn, toggleReminders,
    lockEnabled, setLockEnabled, locked, setLocked,
    lang, setLang,
    readNotifIds, setReadNotifIds,
    ftlSnap, updateFtlSnap,
    dayLog, updateDayLog, removeDayLog,
    duties, saveDuty, removeDuty, addDutyService, updateDutyService, removeDutyService,
    notify,
    rosterChanges, checkRosterChanges,
    liveSync, markLiveSync, dismissLiveSync,
    homeNight, setHomeNight,
    openSimulation: () => setSimulateOpen(true),
    calendarId, setCalendarId,
    calendarName, setCalendarName,
    onboarded, setOnboarded,
    online,
  };

  // ── Render flow: Splash → Login → Onboarding → Main ──
  const renderScreen = () => {
    if (authLoading) return (
      <View style={{ flex: 1, backgroundColor: PELE.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={PELE.ink} />
      </View>
    );
    // O criar-conta vive DENTRO do LoginScreen desde 2026-07-09 (conta primeiro → código →
    // sessão); o OnboardingScreen é só o perfil PÓS-login (gate `onboarded` abaixo).
    if (!user)       return <LoginScreen />;
    // Bloqueio biometria/PIN (opt-in): com sessão restaurada/timeout, exige
    // desbloqueio antes de mostrar qualquer dado. Camada por cima — não toca no
    // onboarding nem no fluxo de perfil.
    if (lockEnabled && locked) return <LockScreen />;
    // Conta AGENDADA para eliminação (período de graça): entrou (dentro do prazo, ou no lag antes do
    // cron correr) → oferece REATIVAR ou continuar a eliminação (sair). Camada por cima da app.
    if (user.deletionAt) {
      return <ReactivateScreen deletionAt={user.deletionAt} lang={lang}
        onReactivated={(u) => handleSetUser(u || { ...user, deletionAt: null })}
        onDismiss={logout} />;
    }
    // Espera a resolução do perfil (profiles → cache → metadata) antes de decidir
    // entre onboarding e app — evita "flash" do onboarding a quem já tem perfil.
    if (loadedUserId !== user.id) return (
      <View style={{ flex: 1, backgroundColor: PELE.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={PELE.ink} />
      </View>
    );
    if (!onboarded)  return <OnboardingScreen />;
    // Oferta de Face ID/PIN — uma vez, após o 1.º login, se o device tem biometria e ainda não decidiu.
    if (!lockEnabled && lockOffered === false && bioAvailable === true) {
      return <BiometricOfferScreen lang={lang} onEnable={() => { setLockEnabled(true); markOffered(); }} onSkip={markOffered} />;
    }
    return <RootNav />;
  };

  // Navegação sempre na pele (paper) — o tema antigo morreu (o noturno da LI é
  // por-estado, não global; theme/setTheme extintos 2026-07-10).
  const navTheme = {
    ...DefaultTheme,
    dark: false,
    colors: { ...DefaultTheme.colors, background: PELE.paper, card: PELE.paper, text: PELE.ink, border: PELE.line, primary: PELE.ink },
  };

  // Pronto = o renderScreen mostraria um ecrã REAL (não o spinner de carga). O
  // splash nativo (estático) cobre exatamente esta janela (auth + hidratação) e
  // só é escondido aqui — sem salto, porque o ecrã real já está montado por baixo.
  const appReady = fontsReady && !authLoading && (!user || (lockEnabled && locked) || loadedUserId === user.id);

  useEffect(() => {
    if (appReady && !splashHidden) {
      SplashScreen.hideAsync().catch(() => {}).finally(() => setSplashHidden(true));
    }
  }, [appReady, splashHidden]);

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={ctx}>
        <StatusBar style={!splashHidden ? 'light' : 'dark'} />
        <NavigationContainer theme={navTheme}>
          {renderScreen()}
        </NavigationContainer>
        <OfflineBanner />
        {onboarded ? <SimulationFlow visible={simulateOpen} onClose={() => setSimulateOpen(false)} /> : null}
        {/* Dois Modais NÃO podem transicionar ao mesmo tempo (iOS trava): fecha um, espera a
            saída (~240ms), só depois abre o outro. */}
        {onboarded ? <ExtrasManager visible={extraOpen} onClose={() => setExtraOpen(false)} onAdd={() => { setExtraOpen(false); setTimeout(() => setAddExtraOpen(true), 340); }} /> : null}
        {onboarded ? <ExtraEventSheet visible={addExtraOpen} onClose={() => { setAddExtraOpen(false); setTimeout(() => setExtraOpen(true), 340); }} /> : null}
        <Toast toast={toast} lang={lang} onHide={() => setToast(null)} />
        {/* Privacidade no multitarefas: tapa o conteúdo quando a app sai de 'active' (padrão banca).
            pointerEvents:none → nunca prende o utilizador; some assim que volta a 'active'. */}
        {obscured && user ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: PELE.paper, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Ionicons name="lock-closed" size={26} color={PELE.onInk} />
            </View>
            <Text style={{ fontSize: TYPE.hero, fontFamily: PELE_FONT.display, letterSpacing: -0.5, color: PELE.ink }}>CrewPact</Text>
          </View>
        ) : null}
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
