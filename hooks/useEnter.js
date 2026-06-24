import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import useReduceMotion from './useReduceMotion';

// Entrada escalonada partilhada (mockup `.view.show > *` com delays): um valor
// 0→1 que cada secção interpola na sua sub-faixa. Devolve `seg(i)` — o estilo
// animado (opacity + translateY) da i-ésima secção. Re-toca sempre que o ecrã
// ganha foco, como o mockup quando uma view passa a `.show`.
export default function useEnter() {
  const enter = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useFocusEffect(useCallback(() => {
    if (reduce) { enter.setValue(1); return; }   // reduz-movimento: aparece já, sem deslizar
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 820, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, reduce]));
  return (i) => {
    if (reduce) return { opacity: 1 };
    const start = Math.min(0.55, i * 0.11);
    return {
      opacity: enter.interpolate({ inputRange: [start, start + 0.42], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ translateY: enter.interpolate({ inputRange: [start, start + 0.42], outputRange: [16, 0], extrapolate: 'clamp' }) }],
    };
  };
}
