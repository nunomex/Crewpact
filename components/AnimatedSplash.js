import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, withRepeat, runOnJS, Easing,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

// Splash animado (reanimated, UI thread) — assume o lugar do splash nativo (visual
// idêntico) e mascara a hidratação que JÁ existe. NÃO adiciona tempo: sai assim que
// a app está pronta; MIN_SHOW só deixa o gesto completar. Plugin babel via
// babel-preset-expo (auto) — não precisa de config extra.
const INK = '#1B1B1B';
const RED = '#F5402C';
const LOGO = 240;                    // = imageWidth do splash nativo (handoff sem salto)
const DOT_X = 0.79844 * LOGO;        // luz de nav (ponto vermelho) na imagem splash-icon
const DOT_Y = 0.33242 * LOGO;
const RING = 60;
const MIN_SHOW = 800;                // ms — deixa o voo + início do pulso aparecerem
const FADE_OUT = 300;

export default function AnimatedSplash({ ready, onDone }) {
  const fade = useSharedValue(1);          // opacidade do overlay (saída)
  const tx = useSharedValue(-150);         // avião entra de baixo-esquerda…
  const ty = useSharedValue(110);          // …e sobe para o centro (ao longo do eixo)
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const ring = useSharedValue(0);          // pulso da luz vermelha 0..1

  const readyRef = useRef(ready);
  const minElapsed = useRef(false);
  const finishing = useRef(false);

  const finish = () => {
    if (finishing.current || !readyRef.current || !minElapsed.current) return;
    finishing.current = true;
    fade.value = withTiming(0, { duration: FADE_OUT, easing: Easing.in(Easing.cubic) }, (f) => {
      'worklet';
      if (f) runOnJS(onDone)();
    });
  };

  useEffect(() => {
    // Handoff: esconde o splash nativo agora que este (idêntico) já está pintado.
    SplashScreen.hideAsync().catch(() => {});
    // Avião VOA para dentro (baixo-esq → centro), com mola e overshoot natural.
    const spring = { damping: 12, stiffness: 90, mass: 0.9 };
    opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    tx.value = withSpring(0, spring);
    ty.value = withSpring(0, spring);
    scale.value = withSpring(1, { damping: 11, stiffness: 95 });
    // Depois de assentar (~520ms), a luz de nav pulsa 2 vezes.
    ring.value = withDelay(520, withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) }), 2, false));
    const t = setTimeout(() => { minElapsed.current = true; finish(); }, MIN_SHOW);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { readyRef.current = ready; finish(); }, [ready]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const planeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => {
    const p = ring.value;
    const o = p < 0.12 ? (p / 0.12) * 0.5 : 0.5 * (1 - (p - 0.12) / 0.88);
    return { opacity: o, transform: [{ scale: 0.5 + p * 1.9 }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fill, containerStyle]}>
      <View style={{ width: LOGO, height: LOGO }}>
        <Animated.Image
          source={require('../assets/splash-icon.png')} resizeMode="contain"
          style={[{ width: LOGO, height: LOGO }, planeStyle]}
        />
        <Animated.View style={[styles.ring, { left: DOT_X - RING / 2, top: DOT_Y - RING / 2 }, ringStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: RED },
});
