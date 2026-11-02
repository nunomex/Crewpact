import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Reduz-movimento do SO (Acessibilidade → Movimento). Componentes usam-no para
// desligar loops/transições e mostrar já o estado final — sem perder o sinal, que
// se mantém pela COR/BORDA/ÍCONE (não pela animação). Atualiza-se se o user mudar.
export default function useReduceMotion() {
  const [reduce, setReduce] = useState(current);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (on) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { on = false; if (sub && sub.remove) sub.remove(); };
  }, []);
  return reduce;
}

// Leitura instantânea, para código FORA de componentes (ex.: um atalho de LayoutAnimation ao
// nível do módulo). Um só ouvinte para a app toda, vivo enquanto a app corre. (2026-11-02)
let current = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { current = !!v; }).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { current = !!v; });
export const reduceMotionNow = () => current;
