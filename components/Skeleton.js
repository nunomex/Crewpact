import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { RADIUS, PELE } from '../data/constants';
import useReduceMotion from '../hooks/useReduceMotion';

// Placeholder de carregamento — shimmer por PULSE de opacidade (sem gradiente: leve
// e seguro em Expo Go / web). Usa-se para dar a FORMA do conteúdo enquanto carrega,
// evitando spinners e o salto de layout quando os dados chegam.
// PELE-FICADO por dentro (2026-07-10) + reduce-motion: bloco estático a meia-opacidade
// (a FORMA continua a comunicar "a carregar" — perde-se só o pulso).
//   circle → bolha (h = diâmetro) · senão bloco w×h com raio r (default RADIUS.sm).
export default function Skeleton({ w, h = 12, r, circle = false, style }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(0.5); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  return (
    <Animated.View pointerEvents="none" style={[{
      width: circle ? h : w,
      height: h,
      borderRadius: circle ? h / 2 : (r != null ? r : RADIUS.sm),
      backgroundColor: PELE.soft,
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] }),
    }, style]} />
  );
}
