import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, PELE, PELE_FONT } from '../data/constants';

// Botão secundário (ghost) canónico — PELE-FICADO 2026-07-09: hairline 1.5 + tinta ink
// sobre papel (o plano da pele). API intacta → consumidores sem mudanças.
export default function GhostButton({ label, onPress, icon, radius = 'pill', style, ...rest }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      accessibilityRole="button" accessibilityLabel={label}
      style={[s.base, { borderRadius: radius === 'lg' ? RADIUS.lg : RADIUS.pill }, style]} {...rest}>
      {icon ? <Ionicons name={icon} size={16} color={PELE.ink} /> : null}
      <Text style={s.txt}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: PELE.line, backgroundColor: 'transparent', paddingVertical: 14 },
  txt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
});
