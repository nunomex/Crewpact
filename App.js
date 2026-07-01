import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet, AppState, Animated, useWindowDimensions } from 'react-native';

// Acessibilidade: respeita a definição "Texto grande" do sistema, mas limita a
// ampliação a 1.3× — chega para melhorar a leitura sem partir os layouts de
// altura fixa (inputs, badges, cartões).
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = 1.4;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier = 1.4;
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from './data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import NetInfo from '@react-native-community/netinfo';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { getLocales } from 'expo-localization';
import { C, RADIUS, PALETTES, FONT, SHADOW, TYPE } from './data/constants';
import { AppContext, isoDay, useTheme } from './data/appContext';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';
import { fetchProfile, fetchAirlines, fetchBases, fetchCountries } from './data/db';
import { getAeForProfile, aeStatus as aeStatusFor } from './ae';
import { capabilitiesFor } from './data/capabilities';
import { migrateCrew, resolveCrew } from './data/crewHistory';
import { fetchDuties, upsertDuty, deleteDuty } from './data/duties';
import { getDutiesInRange, getNonFlightInRange } from './data/calendar';
import { buildIncoming, rangeFromOption } from './data/rosterImport';
import { diffRoster } from './data/rosterDiff';
import { dutyToFtlDay, dayFtlFromDuties, reconcileDayLog } from './ftl';
import { syncReminders, notifyRosterChange, notifyLiveSync, cancelAllReminders, requestRemindersPermission } from './data/reminders';
import { legZulu } from './data/zulu';
import { storedMatchesReal } from './data/flightStatus';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import LockScreen         from './screens/LockScreen';
import ReactivateScreen   from './screens/ReactivateScreen';
import HomeScreen         from './screens/HomeScreen';
import EscalaScreen       from './screens/EscalaScreen';
import DutyDetailScreen   from './screens/DutyDetailScreen';
import FtlHubScreen       from './screens/FtlHubScreen';
import FtlDetailScreen    from './screens/FtlDetailScreen';
import StatsScreen        from './screens/StatsScreen';
import SettingsScreen     from './screens/SettingsScreen';
import ValidadesScreen    from './screens/ValidadesScreen';
import BibliotecaScreen   from './screens/BibliotecaScreen';
import SearchModal        from './components/SearchModal';
import { LinearGradient }  from 'expo-linear-gradient';
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

// AppContext / isoDay / useTheme vivem em data/appContext (módulo-folha) para
// QUEBRAR o ciclo de require App ↔ screens (que enchia os logs de WARN). São
// importados acima (uso interno) e reexportados aqui para compatibilidade.
export { AppContext, isoDay, useTheme };

// Bloqueio biometria/PIN (opt-in): re-tranca a app ao voltar de segundo plano
// se já passaram 5 min — para reaberturas rápidas (ver a escala) não chatear.
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

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

// FTL — calcular (Atividade + ferramentas) e consultar (artigos + PDF) fundidos
// numa só aba (substitui as antigas Cálculos e AE/FTL).
function FtlStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FtlHub"    component={FtlHubScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
      <Stack.Screen name="Biblioteca" component={BibliotecaScreen} />
    </Stack.Navigator>
  );
}

// Tab bar flutuante (mockup): dock escuro só-ícones (ponto vermelho na ativa) à
// esquerda + FAB vermelho "+" à direita. O "+" é um speed-dial: ao tocar, roda
// para "×" e expande em 3 mini-FABs — Pesquisa (search FTL), Serviço (nova duty
// na Escala) e Sair (logout). Igual em todas as abas (substitui os antigos FABs
// contextuais). Toca fora (scrim) ou no "×" para recolher.
function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { lang, openSimulation } = useContext(AppContext);
  const C = useTheme();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const ICON = {
    'Início':       ['home', 'home-outline'],
    'Estatísticas': ['stats-chart', 'stats-chart-outline'],
    'Escala':       ['calendar', 'calendar-outline'],
    'FTL':          ['time', 'time-outline'],
    'Perfil':       ['person', 'person-outline'],
  };
  const active = state.routes[state.index];
  const [searchOpen, setSearchOpen] = useState(false);
  const [open, setOpen] = useState(false);            // speed-dial expandido?
  const anim = useRef(new Animated.Value(0)).current; // 0=fechado · 1=aberto

  const animateTo = (to) => Animated.spring(anim, { toValue: to, useNativeDriver: true, friction: 8, tension: 90 }).start();
  const closeMenu = () => { if (open) { setOpen(false); animateTo(0); } };
  const toggleMenu = () => { const next = !open; setOpen(next); animateTo(next ? 1 : 0); };
  const fire = (fn) => { closeMenu(); fn(); };

  const go = (route, focused) => {
    closeMenu();
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  // Ações do speed-dial, na ordem baixo→cima a partir do FAB (Pesquisa mais perto).
  // Simulação fica ACIMA do Serviço (decisão do user).
  const ACTIONS = [
    { key: 'search', icon: 'search',          label: l('Pesquisa', 'Search'),     run: () => setSearchOpen(true) },
    { key: 'duty',   icon: 'add',             label: l('Serviço', 'Duty'),        run: () => navigation.navigate('Escala', { screen: 'EscalaMain', params: { newDuty: Date.now() } }) },
    { key: 'sim',    icon: 'flask-outline',   label: l('Simulação', 'Simulation'), run: () => openSimulation && openSimulation() },
    { key: 'import', icon: 'download-outline', label: l('Importar', 'Import'),     run: () => navigation.navigate('Escala', { screen: 'EscalaMain', params: { review: Date.now() } }) },
  ];

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  // Cascata: o item mais perto do FAB (i=0) entra primeiro; o de cima (i=2) por último.
  const itemAnim = (i) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.12 + i * 0.12, 0.5 + i * 0.12], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
    ],
  });

  const fabBottom = Math.max(insets.bottom, 16) + 4;

  return (
    <>
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} navigation={navigation} />
      {/* Esbatimento de fundo (canvas) — SUAVE, à maneira das melhores apps: transparente
          em cima (a última linha da lista descansa AQUI, nítida, graças ao inset maior do
          useTabBarSpace), veludo leve a entrar, e só sólido mesmo ATRÁS do dock. Antes era
          um bloco sólido de ~140px que tapava o fim da lista; agora só suaviza o conteúdo
          EM TRÂNSITO junto à barra — o que está parado no fim fica sempre legível. */}
      <LinearGradient pointerEvents="none"
        colors={[C.canvas + '00', C.canvas + '00', C.canvas + '40', C.canvas + 'B3', C.canvas]}
        locations={[0, 0.35, 0.62, 0.85, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={tbar.fade} />
      {/* Scrim — fecha o menu ao tocar fora. Cobre o ecrã todo (ancorado ao fundo).
          Usa C.scrim (o mesmo overlay dos modais) p/ ser consistente com a app. */}
      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[tbar.scrim, { height: winH + 240, backgroundColor: C.scrim, opacity: anim }]}>
        <TouchableOpacity style={tbar.scrimFill} activeOpacity={1} onPress={closeMenu} />
      </Animated.View>
      <View style={[tbar.wrap, { bottom: fabBottom }]} pointerEvents="box-none">
        <View style={[tbar.dock, tbar.dockShadow, { backgroundColor: C.brand }]}>
          {state.routes.map(route => {
            const focused = active.key === route.key;
            const [on, off] = ICON[route.name];
            return (
              <TouchableOpacity key={route.key} onPress={() => go(route, focused)} activeOpacity={0.8}
                accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={t(`tab.${route.name === 'Estatísticas' ? 'stats' : route.name === 'Início' ? 'home' : route.name === 'Escala' ? 'schedule' : route.name === 'FTL' ? 'ftl' : 'profile'}`, lang)}
                style={tbar.tb}>
                {focused && <View style={tbar.tbHi} />}
                <Ionicons name={focused ? on : off} size={24} color={focused ? '#fff' : 'rgba(255,255,255,0.6)'} />
                {focused && <View style={[tbar.tbDot, { backgroundColor: C.red }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {/* FAB + speed-dial: coluna alta ancorada em baixo-direita (FAB em baixo, mini-FABs
          por cima) para os mini-FABs ficarem DENTRO da caixa → toque fiável no Android. */}
      <View style={[tbar.fabAnchor, { bottom: fabBottom }]} pointerEvents="box-none">
        {ACTIONS.map((a, i) => ({ ...a, i })).reverse().map((a) => (
          <Animated.View key={a.key} pointerEvents={open ? 'auto' : 'none'} style={[tbar.miniRow, itemAnim(a.i)]}>
            <View style={[tbar.miniLabel, SHADOW.sm, { backgroundColor: C.card, borderColor: C.line }]}>
              <Text numberOfLines={1} style={[tbar.miniLabelTxt, { color: C.text }]}>{a.label}</Text>
            </View>
            <TouchableOpacity style={[tbar.mini, SHADOW.md, { backgroundColor: a.danger ? C.red : C.ink }]}
              activeOpacity={0.85} onPress={() => fire(a.run)} accessibilityRole="button" accessibilityLabel={a.label}>
              <Ionicons name={a.icon} size={22} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        ))}
        <TouchableOpacity style={[tbar.fab, tbar.fabShadow, { backgroundColor: C.red }]} activeOpacity={0.9}
          onPress={toggleMenu} accessibilityRole="button" accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? l('Fechar menu', 'Close menu') : l('Abrir ações', 'Open actions')}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="add" size={30} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}

// Perfil — definições + sub-ecrãs próprios (ex.: Validades & Documentos, premium).
function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PerfilMain" component={SettingsScreen} />
      <Stack.Screen name="Validades"  component={ValidadesScreen} />
      <Stack.Screen name="Biblioteca" component={BibliotecaScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <FloatingTabBar {...props} />}>
      <Tab.Screen name="Início"       component={HomeStack} />
      <Tab.Screen name="Estatísticas" component={StatsScreen} />
      <Tab.Screen name="Escala"       component={EscalaStack} />
      <Tab.Screen name="FTL"    component={FtlStack} />
    </Tab.Navigator>
  );
}

// Root: 4 abas operacionais + Perfil EMPURRADO por cima (já não é aba). O avatar do
// cabeçalho (HeaderActions) navega para "Perfil"; o "‹ Voltar" do Perfil volta às abas.
function RootNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"   component={MainTabs} />
      {/* Perfil = MODAL que sobe (abre pelo avatar do cabeçalho); arrastar p/ baixo fecha. */}
      <Stack.Screen name="Perfil" component={PerfilStack}
        options={{ ...TransitionPresets.ModalSlideFromBottomIOS, gestureEnabled: true }} />
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

const tbar = StyleSheet.create({
  // Esbatimento SUAVE atrás da barra (largura toda): transparente em cima → sólido só
  // mesmo atrás do dock (~últimos 15%). O inset (useTabBarSpace) garante que a última
  // linha descansa ACIMA disto, legível. (Antes: 220px com bloco sólido que tapava o fim.)
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  // Scrim que escurece o ecrã quando o speed-dial está aberto (toca p/ fechar).
  // A cor (C.scrim) é aplicada inline (vem do tema, não cabe no StyleSheet estático).
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrimFill: { flex: 1 },
  // Dock (esquerda) estica até encostar-se ao FAB (direita, em fabAnchor). O `right`
  // = FAB (right 20 + largura 64) + folga 16 (GUTTER) → o dock acaba 16px antes do FAB,
  // em qualquer largura de ecrã (responsivo, em vez do antigo buraco de ~46px).
  wrap: { position: 'absolute', left: 20, right: 100, flexDirection: 'row', alignItems: 'center' },
  // Dock escuro — 4 ícones, ponto vermelho na ativa. flex:1 → preenche o `wrap`.
  dock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, borderRadius: 26, paddingHorizontal: 8 },
  dockShadow: { shadowColor: '#14161A', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.42, shadowRadius: 26, elevation: 14 },
  tb: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center' },
  tbHi: { position: 'absolute', width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.10)' },
  tbDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2 },
  // Coluna do FAB + mini-FABs, ancorada em baixo-direita (FAB é o último → fica em baixo).
  fabAnchor: { position: 'absolute', right: 20, alignItems: 'flex-end' },
  // FAB vermelho (direita) — maior, quadrado-arredondado a condizer com a dock (raio 26, não círculo)
  fab: { width: 64, height: 64, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  fabShadow: { shadowColor: '#F5402C', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  // Mini-FAB do speed-dial: rótulo (chip card+hairline, o idiom dos chips da app) +
  // quadrado-arredondado (RADIUS.xl, a condizer com a dock/FAB — não círculo), alinhado ao centro do FAB.
  miniRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  miniLabel: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, marginRight: 12 },
  miniLabelTxt: { fontFamily: FONT.semibold, fontSize: TYPE.label },
  mini: { width: 56, height: 56, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
});

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Fonte Inter (1:1 com o mockup, igual em iOS+Android). Carrega os pesos que o
  // design usa; aplica-se por ecrã via FONT (fontFamily) à medida que se porta.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const fontsReady = fontsLoaded || !!fontError; // erro a carregar → arranca na mesma (fonte do sistema)
  const suppressAuth = useRef(false);
  const hydrated = useRef(false);

  // Profile filled during onboarding (pre-populated from user object if available)
  const [profile, setProfile] = useState({ company: null }); // FTL/cabine: só o operador (crewType fixo 'cabin')
  const [aeExtras, setAeExtras] = useState({});              // Extras do mês AE { "YYYY-MM": { <id>: n } } — partilhado por Home/Perfil/Cálculos
  const [validities, setValidities] = useState([]);          // Validades & docs (premium v1) — local: [{ id, type, expiry, note }]
  const [remindersOn, setRemindersOn] = useState(false);     // Lembretes locais (premium · #3) — opt-in (precisa permissão + dev build)
  const [calendarId, setCalendarId] = useState(null);        // calendário do telemóvel ESCOLHIDO (id); null = não ligado. Lemos SÓ este.
  const [calendarName, setCalendarName] = useState(null);    // nome do calendário escolhido — só para o selo "Calendário · <nome>"
  const [splashHidden, setSplashHidden] = useState(false);   // splash nativo já escondido (controla a StatusBar)
  const [onboarded, setOnboarded] = useState(false);
  const [signupMode, setSignupMode] = useState(false); // wizard de criação de conta (pré-auth → conta criada no fim)

  const [lang, setLang]                 = useState('pt');
  const [theme, setTheme]               = useState('light'); // 'light' | 'dark' — preferência global do dispositivo
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
  const [simulateOpen, setSimulateOpen] = useState(false);   // fluxo de simulação (speed-dial) aberto?
  // Toast de AÇÃO genérico (confirma guardar/apagar/aplicar) — exposto via contexto.
  const notify = (title, sub, kind) => setToast({ kind: kind || 'ok', title, sub: sub || null, ts: Date.now() });

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
      { postFlightMin: profile?.postFlightMin || 0, isPilot, base });   // + base p/ 12h/10h (235) por localização real
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
    legs: f.legs || null, special: f.special || null, accommodation: !!f.accommodation, source,
  });
  // A primária na forma de duty-irmã (p/ recalcular o dia com dayFtlFromDuties).
  const primaryOf = (cur) => ({ report_time: cur.report_time, block_off: cur.block_off, block_on: cur.block_on, sectors: cur.sectors, flight_minutes: cur.flight_minutes, kind: cur.kind, signOff: cur.signOff, special: cur.special, legs: cur.legs, route: cur.route, accommodation: cur.accommodation });
  // Recalcula o FTL do dia (primária + extra) e grava no dayLog.
  const recomputeDay = (date, cur, extra) => {
    const entry = dayFtlFromDuties([primaryOf(cur), ...(extra || [])], { postFlightMin: profile?.postFlightMin || 0, isPilot, base });
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
      let enabled = false;
      try { enabled = (await AsyncStorage.getItem('cp_lock')) === '1'; } catch { /* default desligado */ }
      if (enabled) setLockEnabled(true);
      lockHydrated.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
            handleSetUser(mapUser(u));
            // Sessão restaurada (reabertura), não login fresco → exigir desbloqueio.
            if (enabled) setLocked(true);
          }
        }
      } catch { /* sem sessão guardada / storage indisponível */ }
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
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persistir a preferência de bloqueio (só depois de hidratar, p/ não a apagar).
  useEffect(() => { if (lockHydrated.current) AsyncStorage.setItem('cp_lock', lockEnabled ? '1' : '0').catch(() => {}); }, [lockEnabled]);

  // Re-bloquear ao voltar de segundo plano se passou o timeout (e o bloqueio
  // estiver ativo). Reaberturas rápidas (< 5 min) não pedem desbloqueio.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (lockEnabled && bgAt.current && (Date.now() - bgAt.current > LOCK_TIMEOUT_MS)) setLocked(true);
        bgAt.current = null;
      } else if (bgAt.current == null) {
        bgAt.current = Date.now(); // 'background' / 'inactive'
      }
    });
    return () => sub.remove();
  }, [lockEnabled]);

  // Idioma é uma preferência do dispositivo (global) — hidratar no arranque.
  // Se nunca foi escolhido, deteta a língua do dispositivo (EN para sistemas em
  // inglês, caso contrário PT). Uma escolha guardada do utilizador prevalece sempre.
  const langHydrated = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('cp_lang');
        if (saved === 'pt' || saved === 'en') {
          setLang(saved);
        } else {
          const code = getLocales?.()[0]?.languageCode?.toLowerCase();
          setLang(code === 'en' ? 'en' : 'pt');
        }
      } catch { /* storage/locale indisponível — mantém o default 'pt' */ }
      langHydrated.current = true;
    })();
  }, []);
  useEffect(() => { if (langHydrated.current) AsyncStorage.setItem('cp_lang', lang).catch(() => {}); }, [lang]);

  // Tema (claro/escuro) — preferência global do dispositivo, como o idioma.
  const themeHydrated = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('cp_theme');
        if (saved === 'light' || saved === 'dark') setTheme(saved);
      } catch { /* mantém o default 'light' */ }
      themeHydrated.current = true;
    })();
  }, []);
  useEffect(() => { if (themeHydrated.current) AsyncStorage.setItem('cp_theme', theme).catch(() => {}); }, [theme]);

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
        const [r, dl, fs, pf, al, ax, vd, rm, ci, cn] = await Promise.all([
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
        ]);
        if (cancelled) return;
        setCalendarId(ci || null);   // calendário do telemóvel escolhido (id) ou null = não ligado
        setCalendarName(cn || null); // nome do calendário (para o selo "Calendário · <nome>")
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
        try { setAeExtras(ax ? (JSON.parse(ax) || {}) : {}); } catch { setAeExtras({}); }   // extras do mês AE
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
          // Duty hours/210/repouso como fallback do sign-off real. Default 0 até o user o definir.
          const postFlightMin = resolved.postFlightMin ?? localProfile?.postFlightMin ?? user.postFlightMin ?? 0;
          // Vínculo + cobertura do AE (lei: art. 496º CT). `employment` (por conta de outrem/agência/
          // independente) é o eixo legal; `aeCovered` é o override (raro: empregado não filiado).
          // Default: empregado + coberto → ZERO disrupção para quem já existe.
          const employment = resolved.employment || localProfile?.employment || user.employment || 'employee';
          const aeCovered = resolved.aeCovered ?? localProfile?.aeCovered ?? user.aeCovered ?? true;
          // Categoria/contrato EFFECTIVE-DATED: linha do tempo (metadados). Migração suave do
          // modelo antigo (escalar) → 1 período = valor atual cobre o passado (sem disrupção).
          const crewHistory = migrateCrew({ crewHistory: resolved.crewHistory || localProfile?.crewHistory || user.crewHistory, crewCategory, crewContract, serviceStart });
          setProfile({ company: resolved.company, crewType: resolved.crewType || 'cabin', crewCategory, crewContract, crewFleet, crewHistory, serviceStart, base, lifestyle, instructorRated, postFlightMin, employment, aeCovered });
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
          let source = 'manual', snap = null, legs = null, signOff = null, special = null, extra = null, accommodation = false;
          try { const m = row.roster_meta ? JSON.parse(row.roster_meta) : null; if (m) { source = m.source || 'manual'; snap = m.snap || null; legs = m.legs || null; signOff = m.signOff || null; special = m.special || null; accommodation = m.accommodation || false; extra = (m.extra && m.extra.length) ? m.extra : null; } } catch { /* meta inválida */ }
          merged[row.duty_date] = {
            report_time: row.report_time, block_off: row.block_off, block_on: row.block_on,
            sectors: row.sectors, flight_minutes: row.flight_minutes, route: row.notes || null,
            kind: row.kind || 'flight', nightStop: !!row.night_stop, source, snap, legs, signOff, special, accommodation, extra,
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
    setDayLog(prev => reconcileDayLog(duties, prev, { postFlightMin: profile?.postFlightMin || 0, isPilot, base }));
  }, [duties, loadedUserId, profile?.postFlightMin]); // isPilot lido por closure (fora das deps p/ evitar TDZ; estável)

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
  const postFlightMin = profile?.postFlightMin || 0;   // débrief/serviço pós-voo (min, do OM) → Duty hours/210/repouso
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

  // Fase 4 — deteção de alterações de escala (calendário vs guardado). Best-effort:
  // lê o próximo ~mês do calendário, compara com as duties e expõe o diff. Sem
  // permissão de calendário → não faz nada. NÃO altera nada (o utilizador revê/aplica).
  // Devolve o diff ({changed,added,removed,counts,...}) para quem chama (ex.: botão Sincronizar
  // dar feedback "em dia" vs "X mudanças"); null quando não leu (sem calendário/sem leitura/erro).
  const checkRosterChanges = useCallback(async () => {
    if (!calendarId) return null;   // só deteta se houver calendário LIGADO (sem prompt; sem leitura "às cegas")
    try {
      const co = company?.slug;
      const { start, end } = rangeFromOption('month');
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
    airlines, bases, countries, company, crewType, isPilot, crewCategory, crewContract, crewFleet, postFlightMin, employment, aeCovered: aeCoveredOverride, covered, crewHistory, crewAt, serviceStart, serviceYears, base, baseObj, lifestyle, instructorRated, ae, caps, aeStatus,
    aeExtras, setAeExtras,
    validities, addValidity, updateValidity, removeValidity,
    remindersOn, toggleReminders,
    lockEnabled, setLockEnabled, locked, setLocked,
    lang, setLang,
    theme, setTheme, palette: PALETTES[theme] || PALETTES.light,
    readNotifIds, setReadNotifIds,
    ftlSnap, updateFtlSnap,
    dayLog, updateDayLog, removeDayLog,
    duties, saveDuty, removeDuty, addDutyService, updateDutyService, removeDutyService,
    notify,
    rosterChanges, checkRosterChanges,
    liveSync, markLiveSync, dismissLiveSync,
    openSimulation: () => setSimulateOpen(true),
    calendarId, setCalendarId,
    calendarName, setCalendarName,
    onboarded, setOnboarded,
    signupMode, setSignupMode,
    online,
  };

  // ── Render flow: Splash → Login → Onboarding → Main ──
  const renderScreen = () => {
    if (authLoading) return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
    if (!user)       return signupMode ? <OnboardingScreen signup /> : <LoginScreen />;
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
      <View style={{ flex: 1, backgroundColor: palette.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
    if (!onboarded)  return <OnboardingScreen />;
    return <RootNav />;
  };

  const palette = PALETTES[theme] || PALETTES.light;
  const navTheme = {
    ...DefaultTheme,
    dark: theme === 'dark',
    colors: { ...DefaultTheme.colors, background: palette.canvas, card: palette.canvas, text: palette.text, border: palette.line, primary: palette.ink },
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
        <StatusBar style={(!splashHidden || theme === 'dark') ? 'light' : 'dark'} />
        <NavigationContainer theme={navTheme}>
          {renderScreen()}
        </NavigationContainer>
        <OfflineBanner />
        {onboarded ? <SimulationFlow visible={simulateOpen} onClose={() => setSimulateOpen(false)} /> : null}
        <Toast toast={toast} lang={lang} onHide={() => setToast(null)} />
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
