import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { C } from './data/constants';
import { supabase } from './data/supabase';

import LoginScreen        from './screens/LoginScreen';
import OnboardingScreen   from './screens/OnboardingScreen';
import HomeScreen         from './screens/HomeScreen';
import AgreementHubScreen from './screens/AgreementHubScreen';
import ListScreen         from './screens/ListScreen';
import DetailScreen       from './screens/DetailScreen';
import FtlScreen          from './screens/FtlScreen';
import FtlDetailScreen    from './screens/FtlDetailScreen';
import FavoritesScreen    from './screens/FavoritesScreen';
import SettingsScreen     from './screens/SettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

export const AppContext = React.createContext(null);

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

function FavoritesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FavList" component={FavoritesScreen} />
      <Stack.Screen name="Detail"  component={DetailScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderTopColor: C.line,
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.sub,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: -2 },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            'Início':         focused ? 'home'          : 'home-outline',
            'AE/FTL':         focused ? 'document-text' : 'document-text-outline',
            'Favoritos':      focused ? 'star'          : 'star-outline',
            'Definições':     focused ? 'settings'      : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início"         component={HomeScreen} />
      <Tab.Screen name="AE/FTL" component={AgreementStack} />
      <Tab.Screen name="Favoritos"      component={FavoritesStack} />
      <Tab.Screen name="Definições"     component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);
  const suppressAuth = useRef(false);

  // Profile filled during onboarding (pre-populated from user object if available)
  const [profile, setProfile] = useState({ company: null, rank: null, contract: null });
  const [onboarded, setOnboarded] = useState(false);

  const [favorites, setFavorites]       = useState(new Set([52]));
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
    setFavorites(new Set([52]));
    setReadNotifIds(new Set());
  };

  // Always start at the login screen — clear any persisted session on startup.
  // The user authenticates each time; only the onboarding profile is remembered
  // (stored in Supabase user_metadata and read back on login).
  useEffect(() => {
    supabase.auth.signOut();
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

  const ctx = {
    user, setUser: handleSetUser, logout,
    suppressAuth,
    profile, setProfile,
    favorites, toggleFav,
    lang, setLang,
    readNotifIds, setReadNotifIds,
    onboarded, setOnboarded,
  };

  // ── Render flow: Login → Onboarding → Main ──
  const renderScreen = () => {
    if (!user)       return <LoginScreen />;
    if (!onboarded)  return <OnboardingScreen />;
    return <MainTabs />;
  };

  return (
    <AppContext.Provider value={ctx}>
      <NavigationContainer>
        {renderScreen()}
      </NavigationContainer>
    </AppContext.Provider>
  );
}
