import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, ActivityIndicator, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { C, RADIUS, companyContent, PALETTES } from './data/constants';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import HomeScreen         from './screens/HomeScreen';
import ListScreen         from './screens/ListScreen';
import DetailScreen       from './screens/DetailScreen';
import FtlScreen          from './screens/FtlScreen';
import FtlDetailScreen    from './screens/FtlDetailScreen';
import FtlCalcScreen      from './screens/FtlCalcScreen';
import CategoriesScreen   from './screens/CategoriesScreen';
import SettingsScreen     from './screens/SettingsScreen';
import CalendarScreen     from './screens/CalendarScreen';

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

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"      component={HomeScreen} />
      <Stack.Screen name="Calendar"  component={CalendarScreen} />
      <Stack.Screen name="FtlCalc"   component={FtlCalcScreen} />
      <Stack.Screen name="Detail"    component={DetailScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
    </Stack.Navigator>
  );
}

function AgreementStack() {
  // Cada companhia só tem um tipo de conteúdo (AE ou FTL), por isso a aba abre
  // diretamente a Lista ou o FTL — sem ecrã-hub intermédio de um só cartão.
  const { profile } = useContext(AppContext);
  const isFtl = companyContent(profile.company) === 'ftl';
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Reference">
        {props => (isFtl ? <FtlScreen {...props} /> : <ListScreen {...props} />)}
      </Stack.Screen>
      <Stack.Screen name="Detail" component={DetailScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
    </Stack.Navigator>
  );
}

function CalcStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Calc"    component={CategoriesScreen} />
      <Stack.Screen name="FtlCalc" component={FtlCalcScreen} />
      <Stack.Screen name="Detail"  component={DetailScreen} />
    </Stack.Navigator>
  );
}

// Tab bar flutuante: pílula com as abas de conteúdo (ativa = ícone + label numa
// pílula clara; inativas = só ícone) + um círculo destacado para o Perfil.
function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { lang, profile } = useContext(AppContext);
  const C = useTheme();
  const isFtl = companyContent(profile.company) === 'ftl';
  const META = {
    'Início':   { label: t('tab.home', lang),    icon: ['home', 'home-outline'] },
    'AE/FTL':   { label: isFtl ? t('tab.ftl', lang) : t('tab.ae', lang), icon: isFtl ? ['time', 'time-outline'] : ['document-text', 'document-text-outline'] },
    'Cálculos': { label: t('tab.calc', lang),    icon: ['calculator', 'calculator-outline'] },
    'Perfil':   { label: t('tab.profile', lang), icon: ['person', 'person-outline'] },
  };
  const go = (route, focused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };
  const activeKey = state.routes[state.index].key;
  const content = state.routes.slice(0, 3);
  const perfil = state.routes[3];
  const perfilFocused = activeKey === perfil.key;
  const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 10 };

  return (
    <View style={[tbar.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[tbar.pill, shadow, { backgroundColor: C.card, borderColor: C.line }]}>
        {content.map(route => {
          const focused = activeKey === route.key;
          const m = META[route.name];
          return (
            <TouchableOpacity key={route.key} onPress={() => go(route, focused)} activeOpacity={0.8}
              accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={m.label}
              style={[tbar.item, focused && { backgroundColor: C.soft }]}>
              <Ionicons name={m.icon[focused ? 0 : 1]} size={22} color={focused ? C.text : C.sub} />
              {focused && <Text style={[tbar.label, { color: C.text }]} numberOfLines={1}>{m.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity onPress={() => go(perfil, perfilFocused)} activeOpacity={0.85}
        accessibilityRole="button" accessibilityState={{ selected: perfilFocused }} accessibilityLabel={META['Perfil'].label}
        style={[tbar.circle, shadow, { backgroundColor: C.card, borderColor: C.line }]}>
        <Ionicons name={META['Perfil'].icon[perfilFocused ? 0 : 1]} size={22} color={perfilFocused ? C.text : C.sub} />
      </TouchableOpacity>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={props => <FloatingTabBar {...props} />}>
      <Tab.Screen name="Início"   component={HomeStack} />
      <Tab.Screen name="Cálculos" component={CalcStack} />
      <Tab.Screen name="AE/FTL"   component={AgreementStack} />
      <Tab.Screen name="Perfil"   component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const tbar = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, borderRadius: RADIUS.xl, borderWidth: 1, paddingHorizontal: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderRadius: RADIUS.lg },
  label: { fontSize: 14, fontWeight: '600' },
  circle: { width: 64, height: 64, borderRadius: RADIUS.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const suppressAuth = useRef(false);
  const hydrated = useRef(false);

  // Profile filled during onboarding (pre-populated from user object if available)
  const [profile, setProfile] = useState({ company: null, rank: null, contract: null });
  const [onboarded, setOnboarded] = useState(false);

  const [lang, setLang]                 = useState('pt');
  const [theme, setTheme]               = useState('light'); // 'light' | 'dark' — preferência global do dispositivo
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [extras, setExtras]             = useState([]); // extras mensais registados pelo utilizador
  const [dayLog, setDayLog]             = useState({}); // cálculos FTL por dia: { 'YYYY-MM-DD': { psv, rest } }

  const addExtra = (entry) =>
    setExtras(prev => [{
      id: String(Date.now()), ts: Date.now(),
      date: new Date().toISOString().slice(0, 10), // data do registo (hoje) p/ janela de 28 dias
      ...entry,
    }, ...prev]);
  const removeExtra = (id) =>
    setExtras(prev => prev.filter(e => e.id !== id));
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

  // When a user logs in, pre-populate profile if they already have one saved
  const handleSetUser = (u) => {
    setUser(u);
    if (u && u.company && u.rank && u.contract) {
      setProfile({ company: u.company, rank: u.rank, contract: u.contract });
      setOnboarded(true);
    } else {
      setOnboarded(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboarded(false);
    setProfile({ company: null, rank: null, contract: null });
    // Os favoritos/notificações ficam guardados por utilizador no telemóvel;
    // limpamos apenas o estado em memória (o efeito de user?.id trata disso).
  };

  // Sessão não é persistida (persistSession: false) — ao abrir a app não há
  // sessão guardada, por isso o login é sempre exigido. Mantemos o listener
  // para reagir a logout / recuperação de palavra-passe.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleSetUser(mapUser(session.user));
      setAuthLoading(false);
    }).catch(() => setAuthLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') return;
      if (suppressAuth.current) return;
      // Sign-in navigation is handled directly in the login handler so we control
      // the flow; here we only react to a sign-out (logout / password reset).
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setOnboarded(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
    if (!user?.id) { setReadNotifIds(new Set()); setExtras([]); setDayLog({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const [r, x, dl, fs] = await Promise.all([
          AsyncStorage.getItem(`cp_read_${user.id}`),
          AsyncStorage.getItem(`cp_extras_${user.id}`),
          AsyncStorage.getItem(`cp_daylog_${user.id}`),
          AsyncStorage.getItem(`cp_ftlsnap_${user.id}`),
        ]);
        if (cancelled) return;
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
        setExtras(x ? JSON.parse(x) : []);
        if (dl) {
          setDayLog(JSON.parse(dl));
        } else if (fs) {
          // Migração one-time: o snapshot único antigo passa para o dia de hoje.
          const old = JSON.parse(fs);
          setDayLog(old && Object.keys(old).length ? { [isoDay()]: old } : {});
        } else {
          setDayLog({});
        }
      } catch { /* primeira execução / storage indisponível */ }
      finally { if (!cancelled) hydrated.current = true; }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persistir (só depois de hidratar e com utilizador, para não apagar o guardado).
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_read_${user.id}`, JSON.stringify([...readNotifIds])).catch(() => {}); }, [readNotifIds, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_extras_${user.id}`, JSON.stringify(extras)).catch(() => {}); }, [extras, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_daylog_${user.id}`, JSON.stringify(dayLog)).catch(() => {}); }, [dayLog, user?.id]);

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    lang, setLang,
    theme, setTheme, palette: PALETTES[theme] || PALETTES.light,
    readNotifIds, setReadNotifIds,
    extras, addExtra, removeExtra,
    ftlSnap, updateFtlSnap,
    dayLog, updateDayLog, removeDayLog,
    onboarded, setOnboarded,
  };

  // ── Render flow: Splash → Login → Onboarding → Main ──
  const renderScreen = () => {
    if (authLoading) return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
    if (!user)       return <LoginScreen />;
    if (!onboarded)  return <OnboardingScreen />;
    return <MainTabs />;
  };

  const palette = PALETTES[theme] || PALETTES.light;
  const navTheme = {
    ...DefaultTheme,
    dark: theme === 'dark',
    colors: { ...DefaultTheme.colors, background: palette.canvas, card: palette.canvas, text: palette.text, border: palette.line, primary: palette.ink },
  };

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={ctx}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer theme={navTheme}>
          {renderScreen()}
        </NavigationContainer>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
