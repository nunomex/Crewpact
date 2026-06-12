import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { C } from './data/constants';
import { supabase } from './data/supabase';
import { mapUser } from './data/auth';

import LoginScreen      from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen       from './screens/HomeScreen';
import ListScreen       from './screens/ListScreen';
import DetailScreen     from './screens/DetailScreen';
import FavoritesScreen  from './screens/FavoritesScreen';
import SettingsScreen   from './screens/SettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

export const AppContext = React.createContext(null);

function AgreementStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="List"   component={ListScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
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
            'Acordo Empresa': focused ? 'document-text' : 'document-text-outline',
            'Favoritos':      focused ? 'star'          : 'star-outline',
            'Definições':     focused ? 'settings'      : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Início"         component={HomeScreen} />
      <Tab.Screen name="Acordo Empresa" component={AgreementStack} />
      <Tab.Screen name="Favoritos"      component={FavoritesStack} />
      <Tab.Screen name="Definições"     component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  // Auth state — null = not logged in
  const [user, setUser] = useState(null);

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

  // Restore session on startup + listen for auth changes (token refresh, sign out)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleSetUser(mapUser(session.user));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') return;
      if (session?.user) {
        handleSetUser(mapUser(session.user));
      } else {
        setUser(null);
        setOnboarded(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const ctx = {
    user, setUser: handleSetUser, logout,
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
