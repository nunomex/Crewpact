import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, ActivityIndicator, Text, TextInput } from 'react-native';

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { C, RADIUS, companyContent, PALETTES } from './data/constants';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import HomeScreen         from './screens/HomeScreen';
import AgreementHubScreen from './screens/AgreementHubScreen';
import ListScreen         from './screens/ListScreen';
import DetailScreen       from './screens/DetailScreen';
import FtlScreen          from './screens/FtlScreen';
import FtlDetailScreen    from './screens/FtlDetailScreen';
import FtlCalcScreen      from './screens/FtlCalcScreen';
import CategoriesScreen   from './screens/CategoriesScreen';
import SettingsScreen     from './screens/SettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

export const AppContext = React.createContext(null);

// Paleta ativa (modo claro/escuro). Ecrãs convertidos fazem `const C = useTheme()`
// — isso ensombra o import estático `C`, por isso tanto os estilos como as cores
// inline passam a usar a paleta do tema.
export const useTheme = () => useContext(AppContext)?.palette || PALETTES.light;

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"      component={HomeScreen} />
      <Stack.Screen name="Detail"    component={DetailScreen} />
      <Stack.Screen name="FtlDetail" component={FtlDetailScreen} />
    </Stack.Navigator>
  );
}

function AgreementStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Hub"    component={AgreementHubScreen} />
      <Stack.Screen name="List"   component={ListScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
      <Stack.Screen name="Ftl"       component={FtlScreen} />
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

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { lang, profile } = useContext(AppContext);
  const C = useTheme();
  const content = companyContent(profile.company); // 'ae' | 'ftl'
  const isFtl = content === 'ftl';
  const labels = {
    'Início': t('tab.home', lang),
    'AE/FTL': isFtl ? t('tab.ftl', lang) : t('tab.ae', lang),
    'Cálculos': t('tab.calc', lang),
    'Perfil': t('tab.profile', lang),
  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: labels[route.name] ?? route.name,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),
          height: 66,
          borderRadius: RADIUS.xxl,
          backgroundColor: C.canvas,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: C.line,
          paddingTop: 8,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 18,
          elevation: 10,
        },
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.sub,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: -2 },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            'Início':   focused ? 'home'             : 'home-outline',
            'AE/FTL':   isFtl ? (focused ? 'time' : 'time-outline') : (focused ? 'document-text' : 'document-text-outline'),
            'Cálculos': focused ? 'calculator'       : 'calculator-outline',
            'Perfil':   focused ? 'person'           : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início"   component={HomeStack} />
      <Tab.Screen name="AE/FTL"   component={AgreementStack} />
      <Tab.Screen name="Cálculos" component={CalcStack} />
      <Tab.Screen name="Perfil"   component={SettingsScreen} />
    </Tab.Navigator>
  );
}

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
  const [ftlSnap, setFtlSnap]           = useState({}); // último cálculo FTL: { psv, rest }
  const [hiddenShortcuts, setHiddenShortcuts] = useState(new Set()); // atalhos removidos pelo utilizador

  const removeShortcut = (id) => setHiddenShortcuts(prev => new Set(prev).add(id));
  const resetShortcuts = () => setHiddenShortcuts(new Set());

  const addExtra = (entry) =>
    setExtras(prev => [{
      id: String(Date.now()), ts: Date.now(),
      date: new Date().toISOString().slice(0, 10), // data do registo (hoje) p/ janela de 28 dias
      ...entry,
    }, ...prev]);
  const removeExtra = (id) =>
    setExtras(prev => prev.filter(e => e.id !== id));
  const updateFtlSnap = (key, val) => setFtlSnap(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }));

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
    if (!user?.id) { setReadNotifIds(new Set()); setExtras([]); setFtlSnap({}); setHiddenShortcuts(new Set()); return; }
    let cancelled = false;
    (async () => {
      try {
        const [r, x, fs, sc] = await Promise.all([
          AsyncStorage.getItem(`cp_read_${user.id}`),
          AsyncStorage.getItem(`cp_extras_${user.id}`),
          AsyncStorage.getItem(`cp_ftlsnap_${user.id}`),
          AsyncStorage.getItem(`cp_shortcuts_${user.id}`),
        ]);
        if (cancelled) return;
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
        setExtras(x ? JSON.parse(x) : []);
        setFtlSnap(fs ? JSON.parse(fs) : {});
        setHiddenShortcuts(sc ? new Set(JSON.parse(sc)) : new Set());
      } catch { /* primeira execução / storage indisponível */ }
      finally { if (!cancelled) hydrated.current = true; }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persistir (só depois de hidratar e com utilizador, para não apagar o guardado).
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_read_${user.id}`, JSON.stringify([...readNotifIds])).catch(() => {}); }, [readNotifIds, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_extras_${user.id}`, JSON.stringify(extras)).catch(() => {}); }, [extras, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_ftlsnap_${user.id}`, JSON.stringify(ftlSnap)).catch(() => {}); }, [ftlSnap, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_shortcuts_${user.id}`, JSON.stringify([...hiddenShortcuts])).catch(() => {}); }, [hiddenShortcuts, user?.id]);

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    lang, setLang,
    theme, setTheme, palette: PALETTES[theme] || PALETTES.light,
    readNotifIds, setReadNotifIds,
    extras, addExtra, removeExtra,
    ftlSnap, updateFtlSnap,
    hiddenShortcuts, removeShortcut, resetShortcuts,
    onboarded, setOnboarded,
  };

  // ── Render flow: Splash → Login → Onboarding → Main ──
  const renderScreen = () => {
    if (authLoading) return (
      <View style={{ flex: 1, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.ink} />
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
        <NavigationContainer theme={navTheme}>
          {renderScreen()}
        </NavigationContainer>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
