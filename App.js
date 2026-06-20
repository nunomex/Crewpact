import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet, AppState } from 'react-native';

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
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getLocales } from 'expo-localization';
import { C, RADIUS, PALETTES } from './data/constants';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';
import { fetchProfile, fetchAirlines } from './data/db';
import { getAeForProfile } from './ae';
import { fetchDuties, upsertDuty, deleteDuty } from './data/duties';
import { dutyToFtlDay } from './ftl';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import LockScreen         from './screens/LockScreen';
import HomeScreen         from './screens/HomeScreen';
import EscalaScreen       from './screens/EscalaScreen';
import FtlHubScreen       from './screens/FtlHubScreen';
import FtlDetailScreen    from './screens/FtlDetailScreen';
import FtlCalcScreen      from './screens/FtlCalcScreen';
import SettingsScreen     from './screens/SettingsScreen';
import OfflineBanner      from './components/OfflineBanner';

// Segura o splash nativo no arranque e esconde-o assim que a app está pronta
// (sem animação — o splash estático nativo cobre a janela de auth + hidratação).
// Chamado uma vez, no load do módulo.
SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

export const AppContext = React.createContext(null);

// Data local no formato 'YYYY-MM-DD' (chave do registo FTL por dia). Usa as
// componentes locais — não o UTC do toISOString() — para não trocar de dia
// perto da meia-noite consoante o fuso.
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Paleta ativa (modo claro/escuro). Ecrãs convertidos fazem `const C = useTheme()`
// — isso ensombra o import estático `C`, por isso tanto os estilos como as cores
// inline passam a usar a paleta do tema.
export const useTheme = () => useContext(AppContext)?.palette || PALETTES.light;

// Bloqueio biometria/PIN (opt-in): re-tranca a app ao voltar de segundo plano
// se já passaram 5 min — para reaberturas rápidas (ver a escala) não chatear.
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"      component={HomeScreen} />
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
      <Stack.Screen name="Escala"    component={EscalaScreen} />
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

// Tab bar flutuante: pílula com as abas de conteúdo (ativa = ícone + label numa
// pílula clara; inativas = só ícone) + um círculo destacado para o Perfil.
function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const META = {
    'Início': { label: t('tab.home', lang),     icon: ['home', 'home-outline'] },
    'Escala': { label: t('tab.schedule', lang), icon: ['calendar', 'calendar-outline'] },
    'FTL':    { label: t('tab.ftl', lang),      icon: ['time', 'time-outline'] },
    'Perfil': { label: t('tab.profile', lang),  icon: ['person', 'person-outline'] },
  };
  const go = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };
  const activeKey = state.routes[state.index].key;
  const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 10 };

  return (
    <View style={[tbar.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[tbar.pill, shadow, { backgroundColor: C.card, borderColor: C.line }]}>
        {state.routes.map(route => {
          const focused = activeKey === route.key;
          const m = META[route.name];
          return (
            <TouchableOpacity key={route.key} onPress={() => go(route, focused)} activeOpacity={0.8}
              accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={m.label}
              style={[tbar.item, focused && [tbar.itemActive, { backgroundColor: C.soft }]]}>
              <Text style={[tbar.label, { color: focused ? C.text : C.sub }]} numberOfLines={1}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, borderRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: RADIUS.lg },
  itemActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 5 },
  label: { fontSize: 14, fontWeight: '600' },
});

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const suppressAuth = useRef(false);
  const hydrated = useRef(false);

  // Profile filled during onboarding (pre-populated from user object if available)
  const [profile, setProfile] = useState({ company: null }); // FTL/cabine: só o operador (crewType fixo 'cabin')
  const [splashHidden, setSplashHidden] = useState(false);   // splash nativo já escondido (controla a StatusBar)
  const [onboarded, setOnboarded] = useState(false);

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

  // ── Duties (escala) ──
  // Escrita imediata em local (offline-first), marcada `dirty` para sincronizar.
  const saveDuty = (date, fields) => {
    setDuties(prev => ({
      ...prev,
      [date]: {
        report_time: fields.report_time || null,
        block_off: fields.block_off || null,
        block_on: fields.block_on || null,
        sectors: fields.sectors || 0,
        flight_minutes: fields.flight_minutes || 0,
        route: fields.route || null,        // rota "LIS-OPO-LIS" (per diem AE)
        duty_date: date,
        updated_at: new Date().toISOString(),
        dirty: true,
        deleted: false,
      },
    }));
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
    dutiesSyncing.current = true;
    try {
      for (const [date, d] of Object.entries(dutiesRef.current)) {
        if (d.deleted) {
          if (await deleteDuty(uid, date)) {
            setDuties(prev => { const n = { ...prev }; if (n[date]?.deleted && n[date]?.updated_at === d.updated_at) delete n[date]; return n; });
          }
        } else if (d.dirty) {
          if (await upsertDuty(uid, { duty_date: date, report_time: d.report_time, block_off: d.block_off, block_on: d.block_on, sectors: d.sectors, flight_minutes: d.flight_minutes, route: d.route })) {
            // Só limpa a flag se nada mudou entretanto (evita perder edições concorrentes).
            setDuties(prev => (prev[date] && prev[date].updated_at === d.updated_at ? { ...prev, [date]: { ...prev[date], dirty: false } } : prev));
          }
        }
      }
    } finally { dutiesSyncing.current = false; }
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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboarded(false);
    setProfile({ company: null });
    setLocked(false); // sai do estado trancado — o próximo login começa destrancado
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

  // Favoritos / notificações lidas são guardados POR UTILIZADOR no telemóvel.
  // Carregam quando o utilizador entra; ficam gravados para esse utilizador.
  useEffect(() => {
    hydrated.current = false;
    if (!user?.id) { setReadNotifIds(new Set()); setDayLog({}); setLoadedUserId(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [r, dl, fs, pf, al] = await Promise.all([
          AsyncStorage.getItem(`cp_read_${user.id}`),
          AsyncStorage.getItem(`cp_daylog_${user.id}`),
          AsyncStorage.getItem(`cp_ftlsnap_${user.id}`),
          AsyncStorage.getItem(`cp_profile_${user.id}`),
          AsyncStorage.getItem('cp_airlines'),
        ]);
        if (cancelled) return;
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
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
          setProfile({ company: resolved.company, crewType: resolved.crewType || 'cabin', crewCategory, crewContract });
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
          merged[row.duty_date] = {
            report_time: row.report_time, block_off: row.block_off, block_on: row.block_on,
            sectors: row.sectors, flight_minutes: row.flight_minutes, route: row.notes || null,
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
  // CrewPact refocado em FTL/cabine: o motor é sempre FTL (o conteúdo AE foi
  // desativado). Mantém-se `isFtl` no contexto (a true) para os ecrãs renderizarem
  // o ramo FTL; os ramos AE ficam código morto até serem removidos nos passos seguintes.
  const isFtl = true;
  // Papel da tripulação (onboarding → profiles.crew_type): adapta motor/UI.
  const crewType = profile?.crewType || 'cabin';   // 'cabin' | 'pilot'
  const isPilot = crewType === 'pilot';
  const crewCategory = profile?.crewCategory || null;  // CPT|SFO|FO|SO (pilotos com AE)
  const crewContract = profile?.crewContract || null;  // modalidade de contrato (AE)
  // AE (Acordo de Empresa) aplicável: só pilotos de companhias com AE modelado.
  const ae = getAeForProfile({ company: company || profile?.company, crewType });

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    airlines, company, isFtl, crewType, isPilot, crewCategory, crewContract, ae,
    lockEnabled, setLockEnabled, locked, setLocked,
    lang, setLang,
    theme, setTheme, palette: PALETTES[theme] || PALETTES.light,
    readNotifIds, setReadNotifIds,
    ftlSnap, updateFtlSnap,
    dayLog, updateDayLog, removeDayLog,
    duties, saveDuty, removeDuty,
    onboarded, setOnboarded,
    online,
  };

  // ── Render flow: Splash → Login → Onboarding → Main ──
  const renderScreen = () => {
    if (authLoading) return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
    if (!user)       return <LoginScreen />;
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
  const appReady = !authLoading && (!user || (lockEnabled && locked) || loadedUserId === user.id);

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
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
