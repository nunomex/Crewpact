import React from 'react';
import { Text } from 'react-native';
import useCountUp from '../hooks/useCountUp';

// <CountUp value={n} format={fn} style={...} delay={300} /> — anima 0→n ao montar e
// mostra `format(valorAtual)`. Number-king "a calibrar". Reduz-movimento → valor final
// imediato (via useCountUp). Passa o resto das props ao <Text> (style, numberOfLines…).
export default function CountUp({ value, format, duration, delay, ...rest }) {
  const v = useCountUp(value, { duration, delay });
  return <Text {...rest}>{format ? format(v) : Math.round(v)}</Text>;
}
