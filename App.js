import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet, AppState, Animated, useWindowDimensions } from 'react-native';

// Acessibilidade: respeita a definição "Texto grande" do sistema, mas limita a
// ampliação a 1.3× — chega para melhorar a leitura sem partir os layouts de
// altura fixa (inputs, badges, cartões).
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.maxFontSizeMultiplier = 1.3;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.maxFontSizeMultiplier = 1.3;
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { getLocales } from 'expo-localization';
import { C, RADIUS, PALETTES, FONT, SHADOW, TYPE } from './data/constants';
import { AppContext, isoDay, useTheme } from './data/appContext';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';
import { fetchProfile, fetchAirlines } from './data/db';
import { getAeForProfile } from './ae';
import { capabilitiesFor } from './data/capabilities';
import { fetchDuties, upsertDuty, deleteDuty } from './data/duties';
import { getDutiesInRange, getNonFlightInRange } from './data/calendar';
import { buildIncoming, rangeFromOption } from './data/rosterImport';
import { diffRoster } from './data/rosterDiff';
import { dutyToFtlDay, reconcileDayLog } from './ftl';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import LockScreen         from './screens/LockScreen';
import HomeScreen         from './screens/HomeScreen';
import EscalaScreen       from './screens/EscalaScreen';
import FtlHubScreen       from './screens/FtlHubScreen';
import FtlDetailScreen    from './screens/FtlDetailScreen';
import FtlCalcScreen      from './screens/FtlCalcScreen';
import StatsScreen        from './screens/StatsScreen';
import SettingsScreen     from './screens/SettingsScreen';
import SearchModal        from './components/SearchModal';
import ConfirmDialog       from './components/ConfirmDialog';
import { LinearGradient }  from 'expo-linear-gradient';
import OfflineBanner      from './components/OfflineBanner';
import Toast              from './components/Toast';

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
      <Stack.Screen name="Stats"     component={StatsScreen} />
      <Stack.Screen name="FtlCalc"   component={FtlCalcScreen} />
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
      <Stack.Screen name="FtlCalc"   component={FtlCalcScreen} />
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
      <Stack.Screen name="FtlCalc"   component={FtlCalcScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
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
  const { lang, logout } = useContext(AppContext);
  const C = useTheme();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const ICON = {
    'Início': ['home', 'home-outline'],
    'Escala': ['calendar', 'calendar-outline'],
    'FTL':    ['time', 'time-outline'],
    'Perfil': ['person', 'person-outline'],
  };
  const active = state.routes[state.index];
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
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
  const ACTIONS = [
    { key: 'search', icon: 'search',          label: l('Pesquisa', 'Search'), run: () => setSearchOpen(true) },
    { key: 'duty',   icon: 'add',             label: l('Serviço', 'Duty'),    run: () => navigation.navigate('Escala', { screen: 'EscalaMain', params: { newDuty: Date.now() } }) },
    { key: 'logout', icon: 'log-out-outline', label: l('Sair', 'Log out'), danger: true, run: () => setLogoutOpen(true) },
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
      <ConfirmDialog visible={logoutOpen} danger icon="log-out-outline"
        title={l('Terminar sessão?', 'Log out?')}
        message={l('Vais sair da tua conta neste dispositivo.', 'You will be logged out on this device.')}
        cancelLabel={l('Não', 'No')} confirmLabel={l('Sim, sair', 'Yes, log out')}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); logout(); }} />
      {/* Degradê de fundo (canvas) — esconde o conteúdo que passa por trás da barra */}
      <LinearGradient pointerEvents="none" colors={[C.canvas + '00', C.canvas + '80', C.canvas]} locations={[0, 0.22, 0.36]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={tbar.fade} />
      {/* Scrim — fecha o menu ao tocar fora. Cobre o ecrã todo (ancorado ao fundo).
          Usa C.scrim (o mesmo overlay dos modais) p/ ser consistente com a app. */}
      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[tbar.scrim, { height: winH + 240, backgroundColor: C.scrim, opacity: anim }]}>
        <TouchableOpacity style={tbar.scrimFill} activeOpacity={1} onPress={closeMenu} />
      </Animated.View>
      <View style={[tbar.wrap, { bottom: fabBottom }]} pointerEvents="box-none">
        <View style={[tbar.dock, tbar.dockShadow, { backgroundColor: C.ink }]}>
          {state.routes.map(route => {
            const focused = active.key === route.key;
            const [on, off] = ICON[route.name];
            return (
              <TouchableOpacity key={route.key} onPress={() => go(route, focused)} activeOpacity={0.8}
                accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={t(`tab.${route.name === 'Início' ? 'home' : route.name === 'Escala' ? 'schedule' : route.name === 'FTL' ? 'ftl' : 'profile'}`, lang)}
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
              <Ionicons name={a.icon} size={20} color="#fff" />
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

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <FloatingTabBar {...props} />}>
      <Tab.Screen name="Início" component={HomeStack} />
      <Tab.Screen name="Escala" component={EscalaStack} />
      <Tab.Screen name="FTL"    component={FtlStack} />
      <Tab.Screen name="Perfil" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const tbar = StyleSheet.create({
  // Degradê de fundo atrás da barra (largura toda, do fundo até ~220px) — sólido
  // até ~140px (cobre os nomes do FAB) e desvanece suave (~80px, com easing) acima.
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 },
  // Scrim que escurece o ecrã quando o speed-dial está aberto (toca p/ fechar).
  // A cor (C.scrim) é aplicada inline (vem do tema, não cabe no StyleSheet estático).
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrimFill: { flex: 1 },
  // Dock (esquerda) + FAB (direita), separados como o mockup — mas maiores.
  wrap: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Dock escuro — 4 ícones, ponto vermelho na ativa
  dock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, borderRadius: 26, paddingHorizontal: 8 },
  dockShadow: { shadowColor: '#14161A', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.42, shadowRadius: 26, elevation: 14 },
  tb: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  tbHi: { position: 'absolute', width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.10)' },
  tbDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2 },
  // Coluna do FAB + mini-FABs, ancorada em baixo-direita (FAB é o último → fica em baixo).
  fabAnchor: { position: 'absolute', right: 20, alignItems: 'flex-end' },
  // FAB vermelho (direita) — maior, a condizer com a dock
  fab: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  fabShadow: { shadowColor: '#F5402C', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  // Mini-FAB do speed-dial: rótulo (chip card+hairline, o idiom dos chips da app) +
  // círculo (RADIUS.pill = redondo, como os botões de ação), alinhado ao centro do FAB.
  miniRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  miniLabel: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, marginRight: 12 },
  miniLabelTxt: { fontFamily: FONT.semibold, fontSize: TYPE.label },
  mini: { width: 52, height: 52, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
});

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Fonte Inter (1:1 com o mockup, igual em iOS+Android). Carrega os pesos que o
  // design usa; aplica-se por ecrã via FONT (fontFamily) à medida que se porta.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const fontsReady = fontsLoaded || !!fontError; // erro a carregar → arranca na mesma (fonte do sistema)
  const suppressAuth = useRef(false);
  const hydrated = useRef(false);

  // Profile filled during onboarding (pre-populated from user object if available)
  const [profile, setProfile] = useState({ company: null }); // FTL/cabine: só o operador (crewType fixo 'cabin')
  const [aeExtras, setAeExtras] = useState({});              // Extras do mês AE { "YYYY-MM": { <id>: n } } — partilhado por Home/Perfil/Cálculos
  const [splashHidden, setSplashHidden] = useState(false);   // splash nativo já escondido (controla a StatusBar)
  const [onboarded, setOnboarded] = useState(false);
  const [signupMode, setSignupMode] = useState(false); // wizard de criação de conta (pré-auth → conta criada no fim)

  const [lang, setLang]                 = useState('pt');
  const [theme, setTheme]               = useState('light'); // 'light' | 'dark' — preferência global do dispositivo
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [dayLog, setDayLog]             = useState({}); // cálculos FTL por dia: { 'YYYY-MM-DD': { psv, rest } }
  const [loadedUserId, setLoadedUserId] = useState(null); // uid cujo perfil já foi resolvido (gate de loading)
  const [airlines, setAirlines]         = useState([]);   // catálogo de companhias (tabela `airlines`)

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
          // ORIGEM imutável + SNAPSHOT (Fase 4): só mudam se vierem nos fields (import);
          // a edição manual NÃO os toca → uma importada editada continua 'calendar'.
          source: fields.source !== undefined ? fields.source : (ex?.source || 'manual'),
          snap: ('snap' in fields) ? fields.snap : (ex?.snap ?? null),
          duty_date: date,
          updated_at: new Date().toISOString(),
          dirty: true,
          deleted: false,
        },
      };
    });
    // Liga ao motor FTL: deriva o registo do dia (PSV/limites/repouso) a partir da
    // duty. `src:'duty'` marca-o como derivado; registos manuais (sem src) não são tocados.
    const entry = dutyToFtlDay({
      report_time: fields.report_time, block_off: fields.block_off, block_on: fields.block_on,
      sectors: fields.sectors, flight_minutes: fields.flight_minutes,
    });
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
          const err = await upsertDuty(uid, { duty_date: date, report_time: d.report_time, block_off: d.block_off, block_on: d.block_on, sectors: d.sectors, flight_minutes: d.flight_minutes, route: d.route, kind: d.kind, nightStop: d.nightStop, source: d.source, snap: d.snap });
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
          handleSetUser(mapUser(session.user));
          // Sessão restaurada (reabertura), não login fresco → exigir desbloqueio.
          if (enabled) setLocked(true);
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

  // Favoritos / notificações lidas são guardados POR UTILIZADOR no telemóvel.
  // Carregam quando o utilizador entra; ficam gravados para esse utilizador.
  useEffect(() => {
    hydrated.current = false;
    if (!user?.id) { setReadNotifIds(new Set()); setDayLog({}); setLoadedUserId(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [r, dl, fs, pf, al, ax] = await Promise.all([
          AsyncStorage.getItem(`cp_read_${user.id}`),
          AsyncStorage.getItem(`cp_daylog_${user.id}`),
          AsyncStorage.getItem(`cp_ftlsnap_${user.id}`),
          AsyncStorage.getItem(`cp_profile_${user.id}`),
          AsyncStorage.getItem('cp_airlines'),
          AsyncStorage.getItem(`cp_ae_extras_${user.id}`),
        ]);
        if (cancelled) return;
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
        try { setAeExtras(ax ? (JSON.parse(ax) || {}) : {}); } catch { setAeExtras({}); }   // extras do mês AE
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
          setProfile({ company: resolved.company, crewType: resolved.crewType || 'cabin', crewCategory, crewContract, serviceStart, base, lifestyle });
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
          // roster_meta (Fase 4): JSON { source, snap } — origem + snapshot da escala.
          let source = 'manual', snap = null;
          try { const m = row.roster_meta ? JSON.parse(row.roster_meta) : null; if (m) { source = m.source || 'manual'; snap = m.snap || null; } } catch { /* meta inválida */ }
          merged[row.duty_date] = {
            report_time: row.report_time, block_off: row.block_off, block_on: row.block_on,
            sectors: row.sectors, flight_minutes: row.flight_minutes, route: row.notes || null,
            kind: row.kind || 'flight', nightStop: !!row.night_stop, source, snap,
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

  // Reconstrói o histórico FTL (dayLog) a partir das duties SINCRONIZADAS — preenche só
  // os dias EM FALTA (dispositivo novo / pós-reinstalação: as duties vêm do servidor,
  // mas o dayLog é local). Corre quando a hidratação terminou (loadedUserId, com o
  // dayLog em cache já aplicado) e a cada mudança das duties. Fill-only e idempotente
  // (não toca em registos manuais nem nos derivados existentes; ref igual = no-op).
  useEffect(() => {
    if (!loadedUserId || !dutiesHydrated.current) return;
    setDayLog(prev => reconcileDayLog(duties, prev));
  }, [duties, loadedUserId]);

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
  const crewContract = profile?.crewContract || null;  // modalidade de contrato (AE)
  // Antiguidade: guardamos a DATA de início (metadata, estável) e derivamos os anos
  // completos de serviço — alimenta o prémio de permanência (AE piloto, Anexo I.9).
  const serviceStart = profile?.serviceStart || null;  // 'AAAA-MM-DD'
  const base = profile?.base || null;                  // base (LIS/OPO/FAO)
  const lifestyle = !!profile?.lifestyle;              // PPY como estilo de vida (Art. 66.9) → sem retenção
  const serviceYears = (() => {
    if (!serviceStart) return null;
    const sd = new Date(`${serviceStart}T00:00:00`);
    if (isNaN(sd)) return null;
    const now = new Date();
    let y = now.getFullYear() - sd.getFullYear();
    if (now.getMonth() < sd.getMonth() || (now.getMonth() === sd.getMonth() && now.getDate() < sd.getDate())) y--;
    return Math.max(0, y);
  })();
  // AE (Acordo de Empresa) aplicável às companhias com AE modelado, resolvido por
  // crewType — pilotos (SPAC) OU cabine (SNPVAC). Companhia FTL → ae = null.
  const ae = getAeForProfile({ company: company || profile?.company, crewType });
  // Matriz de capacidades — fonte única do que cada ecrã mostra/pede (AE↔FTL,
  // piloto↔cabine). `lifestyle` (Art. 66.9): PPY como estilo de vida → sem retenção.
  const caps = capabilitiesFor({ company: company || profile?.company, crewType, contract: crewContract || '12/12', lifestyle });

  // Fase 4 — deteção de alterações de escala (calendário vs guardado). Best-effort:
  // lê o próximo ~mês do calendário, compara com as duties e expõe o diff. Sem
  // permissão de calendário → não faz nada. NÃO altera nada (o utilizador revê/aplica).
  const checkRosterChanges = useCallback(async () => {
    try {
      const co = company?.slug;
      const { start, end } = rangeFromOption('month');
      const [fl, nf] = await Promise.all([getDutiesInRange(start, end, co), getNonFlightInRange(start, end, co)]);
      if (!fl.ok && !nf.ok) return;   // sem leitura válida → não marca cancelamentos
      const incoming = buildIncoming({ activities: fl.duties || [], nonflights: nf.items || [] });
      const window = { start: isoDay(start), end: isoDay(end) };
      setRosterChanges(diffRoster({ incoming, duties: dutiesRef.current, window }));
    } catch { /* best-effort */ }
  }, [company]);
  // Corre quando o perfil fica pronto e ao voltar ao foreground (auto, ao focar).
  useEffect(() => { if (onboarded && company) checkRosterChanges(); }, [onboarded, company, checkRosterChanges]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') checkRosterChanges(); });
    return () => sub.remove();
  }, [checkRosterChanges]);

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    airlines, company, crewType, isPilot, crewCategory, crewContract, serviceStart, serviceYears, base, lifestyle, ae, caps,
    aeExtras, setAeExtras,
    lockEnabled, setLockEnabled, locked, setLocked,
    lang, setLang,
    theme, setTheme, palette: PALETTES[theme] || PALETTES.light,
    readNotifIds, setReadNotifIds,
    ftlSnap, updateFtlSnap,
    dayLog, updateDayLog, removeDayLog,
    duties, saveDuty, removeDuty,
    rosterChanges, checkRosterChanges,
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
    // Espera a resolução do perfil (profiles → cache → metadata) antes de decidir
    // entre onboarding e app — evita "flash" do onboarding a quem já tem perfil.
    if (loadedUserId !== user.id) return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
    if (!onboarded)  return <OnboardingScreen />;
    return <MainTabs />;
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
        <Toast toast={toast} lang={lang} onHide={() => setToast(null)} />
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
