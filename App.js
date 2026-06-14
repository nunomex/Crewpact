import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C, RADIUS } from './data/constants';
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
import CategoriesScreen   from './screens/CategoriesScreen';
import SettingsScreen     from './screens/SettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

export const AppContext = React.createContext(null);

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"   component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
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

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { lang } = useContext(AppContext);
  const labels = {
    'Início': t('tab.home', lang),
    'AE/FTL': t('tab.agreement', lang),
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
            'AE/FTL':   focused ? 'document-text'    : 'document-text-outline',
            'Cálculos': focused ? 'calculator'       : 'calculator-outline',
            'Perfil':   focused ? 'person'           : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início"   component={HomeStack} />
      <Tab.Screen name="AE/FTL"   component={AgreementStack} />
      <Tab.Screen name="Cálculos" component={CategoriesScreen} />
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

  const toggleFav = (n) =>
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

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
    setFavorites(new Set());
    setReadNotifIds(new Set());
    AsyncStorage.multiRemove(['cp_favorites', 'cp_readNotifs']).catch(() => {});
  };

  // Restore the existing session on launch (persisted via AsyncStorage adapter).
  // The user only re-authenticates if there is no valid session.
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

  // Hidratar preferências locais (favoritos / idioma / notificações lidas).
  useEffect(() => {
    (async () => {
      try {
        const [f, l, r] = await Promise.all([
          AsyncStorage.getItem('cp_favorites'),
          AsyncStorage.getItem('cp_lang'),
          AsyncStorage.getItem('cp_readNotifs'),
        ]);
        if (f) setFavorites(new Set(JSON.parse(f)));
        if (l) setLang(l);
        if (r) setReadNotifIds(new Set(JSON.parse(r)));
      } catch { /* primeira execução / storage indisponível */ }
      hydrated.current = true;
    })();
  }, []);

  // Persistir alterações (só depois de hidratar, para não apagar o que está guardado).
  useEffect(() => { if (hydrated.current) AsyncStorage.setItem('cp_favorites', JSON.stringify([...favorites])).catch(() => {}); }, [favorites]);
  useEffect(() => { if (hydrated.current) AsyncStorage.setItem('cp_lang', lang).catch(() => {}); }, [lang]);
  useEffect(() => { if (hydrated.current) AsyncStorage.setItem('cp_readNotifs', JSON.stringify([...readNotifIds])).catch(() => {}); }, [readNotifIds]);

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    favorites, toggleFav,
    lang, setLang,
    readNotifIds, setReadNotifIds,
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
