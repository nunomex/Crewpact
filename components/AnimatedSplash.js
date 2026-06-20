import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Easing } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Splash animado — assume o lugar do splash nativo (visual idêntico) e mascara a
// hidratação que JÁ existe. Não adiciona tempo: sai assim que a app está pronta;
// MIN_SHOW só garante que o gesto completa (evita "flash" feio). Sem dep nova.
const INK = '#1B1B1B';
const RED = '#F5402C';
const LOGO = 240;                          // = imageWidth do splash nativo (handoff sem salto)
const DOT_X = 0.79844 * LOGO;              // luz de nav (ponto vermelho) na imagem splash-icon
const DOT_Y = 0.33242 * LOGO;
const RING = 60;
const MIN_SHOW = 650;                       // ms — deixa o gesto assentar
const FADE_OUT = 260;

export default function AnimatedSplash({ ready, onDone }) {
  const fade = useRef(new Animated.Value(1)).current;        // opacidade do overlay
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const ring = useRef(new Animated.Value(0)).current;        // pulso 0..1

  const readyRef = useRef(ready);
  const minElapsed = useRef(false);
  const finishing = useRef(false);

  const maybeFinish = () => {
    if (finishing.current || !readyRef.current || !minElapsed.current) return;
    finishing.current = true;
    Animated.timing(fade, { toValue: 0, duration: FADE_OUT, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      .start(() => onDone && onDone());
  };

  useEffect(() => {
    // Handoff: esconde o splash nativo agora que este (idêntico) já está pintado.
    SplashScreen.hideAsync().catch(() => {});
    // Entrada: o logo assenta (fade + spring).
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
    // Pulso da luz vermelha — 2 ciclos e pára (um gesto, com contenção).
    Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      { iterations: 2 },
    ).start();
    const t = setTimeout(() => { minElapsed.current = true; maybeFinish(); }, MIN_SHOW);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { readyRef.current = ready; maybeFinish(); }, [ready]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.4] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.5, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, { opacity: fade }]}>
      <View style={{ width: LOGO, height: LOGO }}>
        <Animated.Image
          source={require('../assets/splash-icon.png')} resizeMode="contain"
          style={{ width: LOGO, height: LOGO, opacity: logoOpacity, transform: [{ scale: logoScale }] }}
        />
        <Animated.View
          style={[styles.ring, { left: DOT_X - RING / 2, top: DOT_Y - RING / 2, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: RED },
});
