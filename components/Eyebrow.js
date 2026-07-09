import React from 'react';
import { Text } from 'react-native';
import { PELE, PELE_FONT } from '../data/constants';

// Rótulo "eyebrow" partilhado — PELE-FICADO por dentro (2026-07-09), API intacta.
// Canon do PeleHeader: 11px · bodyHeavy · letterSpacing 1.4 · maiúsculas · grey.
// `dark` para placas ink (onInkSub). `style` para margens/cor pontuais. `...rest`
// passa props como `numberOfLines` ao <Text>.
export default function Eyebrow({ children, dark, style, ...rest }) {
  return <Text {...rest} style={[{ fontSize: 11, letterSpacing: 1.4, color: dark ? PELE.onInkSub : PELE.grey, fontFamily: PELE_FONT.bodyHeavy, textTransform: 'uppercase' }, style]}>{children}</Text>;
}
