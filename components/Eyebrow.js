import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { C, TYPE } from '../data/constants';

// Rótulo "eyebrow" partilhado (10px, espaçado, maiúsculas).
// `dark` para fundos escuros. Aceita `style` para margens/cor pontuais.
export default function Eyebrow({ children, dark, style }) {
  return <Text style={[s.base, dark && { color: C.onDarkSub }, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  base: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '600', textTransform: 'uppercase' },
});
