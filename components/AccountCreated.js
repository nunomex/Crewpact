import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT, TRACK_DISPLAY } from '../data/constants';
import { useTheme } from '../data/appContext';

// Página de transição pós-criação de conta. Um beat de celebração que preenche o
// instante que a app já gasta a resolver o perfil (não adiciona atraso): aparece
// ~2,5s e entra sozinha na app. Substitui o spinner anónimo por uma confirmação
// inequívoca — o utilizador SABE que a conta foi criada.
export default function AccountCreated({ name = '', lang = 'pt' }) {
  const C = useTheme();
  const styles = makeStyles(C);
  const ring = useRef(new Animated.Value(0)).current;   // escala do círculo (spring)
  const tick = useRef(new Animated.Value(0)).current;   // escala/opacidade do check
  const text = useRef(new Animated.Value(0)).current;   // fade + subida do texto
  const pulse = useRef(new Animated.Value(0)).current;  // pulsar de "a entrar"

  useEffect(() => {
    Animated.sequence([
      Animated.spring(ring, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(tick, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.timing(text, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const first = (name || '').trim().split(/\s+/)[0] || '';
  const ty = text.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const footOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ring }] }]}>
          <Animated.View style={{ opacity: tick, transform: [{ scale: tick }] }}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </Animated.View>
        </Animated.View>
        <Animated.View style={{ opacity: text, transform: [{ translateY: ty }] }}>
          <Text style={styles.title}>{lang === 'en' ? 'Account created' : 'Conta criada'}</Text>
          <Text style={styles.sub}>
            {first
              ? (lang === 'en' ? `Welcome, ${first}` : `Bem-vindo, ${first}`)
              : (lang === 'en' ? 'Welcome aboard' : 'Bem-vindo a bordo')}
          </Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.foot, { opacity: footOpacity }]}>
        <Text style={styles.footTxt}>{lang === 'en' ? 'Signing you in' : 'A entrar'}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  ring: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: C.red,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
    shadowColor: C.red, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  title: { fontSize: 26, fontFamily: FONT.semibold, color: C.text, textAlign: 'center', letterSpacing: TRACK_DISPLAY },
  sub: { fontSize: 15, fontFamily: FONT.regular, color: C.sub, textAlign: 'center', marginTop: 8 },
  foot: { alignItems: 'center', paddingBottom: 28 },
  footTxt: { fontSize: 12, fontFamily: FONT.medium, color: C.sub, letterSpacing: 1.5, textTransform: 'uppercase' },
});
