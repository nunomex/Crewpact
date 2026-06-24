import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Reduz-movimento do SO (Acessibilidade → Movimento). Componentes usam-no para
// desligar loops/transições e mostrar já o estado final — sem perder o sinal, que
// se mantém pela COR/BORDA/ÍCONE (não pela animação). Atualiza-se se o user mudar.
export default function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (on) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { on = false; if (sub && sub.remove) sub.remove(); };
  }, []);
  return reduce;
}
