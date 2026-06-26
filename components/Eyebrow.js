import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TYPE, FONT } from '../data/constants';
import { useTheme } from '../data/appContext';

// Rótulo "eyebrow" partilhado (11px, espaçado, maiúsculas, heavy) — o canon do PageHeader.
// `dark` para fundos escuros. `style` para margens/cor pontuais. `...rest` passa props
// como `numberOfLines` ao <Text>.
export default function Eyebrow({ children, dark, style, ...rest }) {
  const C = useTheme();
  return <Text {...rest} style={[{ fontSize: TYPE.eyebrow, letterSpacing: 1.3, color: dark ? C.onDarkSub : C.sub, fontFamily: FONT.heavy, textTransform: 'uppercase' }, style]}>{children}</Text>;
}
