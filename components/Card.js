import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { C, RADIUS, SPACE } from '../data/constants';

// Cartão padrão (branco com borda) ou variante escura.
// Usa <Card onPress> para o tornar tocável. Override de padding/estilo via `style`.
export default function Card({ children, style, dark, onPress, ...rest }) {
  const base = [dark ? c.dark : c.light, style];
  if (onPress) {
    return <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={base} {...rest}>{children}</TouchableOpacity>;
  }
  return <View style={base} {...rest}>{children}</View>;
}

const c = StyleSheet.create({
  light: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.lg, backgroundColor: C.canvas },
  dark:  { borderRadius: RADIUS.xl, padding: SPACE.lg, backgroundColor: C.ink },
});
