import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TYPE } from '../data/constants';
import { useTheme } from '../App';

// Rótulo "eyebrow" partilhado (10px, espaçado, maiúsculas).
// `dark` para fundos escuros. Aceita `style` para margens/cor pontuais.
export default function Eyebrow({ children, dark, style }) {
  const C = useTheme();
  return <Text style={[{ fontSize: TYPE.eyebrow, letterSpacing: 2, color: dark ? C.onDarkSub : C.sub, fontWeight: '600', textTransform: 'uppercase' }, style]}>{children}</Text>;
}
