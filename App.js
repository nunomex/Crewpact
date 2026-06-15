import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { C, RADIUS, companyContent } from './data/constants';
import { t } from './data/i18n';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import HomeScreen         from './screens/HomeScreen';
import FavoritesScreen     from './screens/FavoritesScreen';
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

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"      component={HomeScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
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
          backgroundColor: 'rgba(255,255,255,0.98)',
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

  const [favorites, setFavorites]       = useState(new Set());
  const [lang, setLang]                 = useState('pt');
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [extras, setExtras]             = useState([]); // extras mensais registados pelo utilizador
  const [ftlSnap, setFtlSnap]           = useState({}); // último cálculo FTL: { psv, rest }

  const addExtra = (entry) =>
    setExtras(prev => [{
      id: String(Date.now()), ts: Date.now(),
      date: new Date().toISOString().slice(0, 10), // data do registo (hoje) p/ janela de 28 dias
      ...entry,
    }, ...prev]);
  const removeExtra = (id) =>
    setExtras(prev => prev.filter(e => e.id !== id));
  const updateFtlSnap = (key, val) => setFtlSnap(prev => ({ ...prev, [key]: typeof val === 'function' ? val(prev[key]) : val }));

  // Limite de favoritos. Devolve { ok, full } para o ecrã poder avisar quando cheio.
  const FAV_LIMIT = 16;
  const toggleFav = (n) => {
    const has = favorites.has(n);
    if (!has && favorites.size >= FAV_LIMIT) return { ok: false, full: true };
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
    return { ok: true, added: !has };
  };

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

  // Favoritos / notificações lidas são guardados POR UTILIZADOR no telemóvel.
  // Carregam quando o utilizador entra; ficam gravados para esse utilizador.
  useEffect(() => {
    hydrated.current = false;
    if (!user?.id) { setFavorites(new Set()); setReadNotifIds(new Set()); setExtras([]); setFtlSnap({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const [f, r, x, fs] = await Promise.all([
          AsyncStorage.getItem(`cp_fav_${user.id}`),
          AsyncStorage.getItem(`cp_read_${user.id}`),
          AsyncStorage.getItem(`cp_extras_${user.id}`),
          AsyncStorage.getItem(`cp_ftlsnap_${user.id}`),
        ]);
        if (cancelled) return;
        setFavorites(f ? new Set(JSON.parse(f)) : new Set());
        setReadNotifIds(r ? new Set(JSON.parse(r)) : new Set());
        setExtras(x ? JSON.parse(x) : []);
        setFtlSnap(fs ? JSON.parse(fs) : {});
      } catch { /* primeira execução / storage indisponível */ }
      finally { if (!cancelled) hydrated.current = true; }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persistir (só depois de hidratar e com utilizador, para não apagar o guardado).
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_fav_${user.id}`, JSON.stringify([...favorites])).catch(() => {}); }, [favorites, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_read_${user.id}`, JSON.stringify([...readNotifIds])).catch(() => {}); }, [readNotifIds, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_extras_${user.id}`, JSON.stringify(extras)).catch(() => {}); }, [extras, user?.id]);
  useEffect(() => { if (hydrated.current && user?.id) AsyncStorage.setItem(`cp_ftlsnap_${user.id}`, JSON.stringify(ftlSnap)).catch(() => {}); }, [ftlSnap, user?.id]);

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    favorites, toggleFav,
    lang, setLang,
    readNotifIds, setReadNotifIds,
    extras, addExtra, removeExtra,
    ftlSnap, updateFtlSnap,
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

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={ctx}>
        <NavigationContainer>
          {renderScreen()}
        </NavigationContainer>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
