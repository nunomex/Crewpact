import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import useReduceMotion from './useReduceMotion';

// Conta 0 → `target` ao montar/mudar (sensação de instrumento a calibrar). Devolve o
// valor ATUAL (float durante a animação); o chamador formata (€, h…). Respeita
// reduz-movimento → devolve o `target` imediato, sem animar.
export default function useCountUp(target, { duration = 700, delay = 0 } = {}) {
  const reduce = useReduceMotion();
  const t = Number(target) || 0;
  const v = useRef(new Animated.Value(t)).current;
  const [val, setVal] = useState(t);
  useEffect(() => {
    if (reduce) { setVal(t); return; }
    v.setValue(0);
    const id = v.addListener(({ value }) => setVal(value));
    Animated.timing(v, { toValue: t, duration, delay, useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [t, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return reduce ? t : val;
}
