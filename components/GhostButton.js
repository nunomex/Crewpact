import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { useTheme } from '../data/appContext';

// Botão secundário (ghost/outlined) canónico (Fase B). Substitui btnGhost/dlgBtnGhost…
// — "borda C.line, fundo C.card, texto C.text". Mesmas dimensões do PrimaryButton.
// Props: label, onPress, icon, radius ('pill' default | 'lg'), style, + resto.
export default function GhostButton({ label, onPress, icon, radius = 'pill', style, ...rest }) {
  const C = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}
      accessibilityRole="button" accessibilityLabel={label}
      style={[s.base, { borderColor: C.line, backgroundColor: C.card, borderRadius: radius === 'lg' ? RADIUS.lg : RADIUS.pill }, style]} {...rest}>
      {icon ? <Ionicons name={icon} size={16} color={C.text} /> : null}
      <Text style={[s.txt, { color: C.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 14 },
  txt: { fontSize: TYPE.sub, fontFamily: FONT.semibold },
});
