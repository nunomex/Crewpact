import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS } from '../data/constants';
import { useTheme } from '../App';

// Botão circular de ícone (voltar / favorito) reutilizável.
export function RoundIconButton({ name, size = 18, onPress, active, accessibilityLabel }) {
  const C = useTheme();
  const s = makeStyles(C);
  return (
    <TouchableOpacity onPress={onPress} hitSlop={8} accessibilityLabel={accessibilityLabel}
      style={[s.iconBtn, active && { backgroundColor: C.red }]}>
      <Ionicons name={name} size={size} color={active ? C.onDark : C.sub} />
    </TouchableOpacity>
  );
}

// Barra superior dos ecrãs de detalhe (voltar à esquerda, slot opcional à direita).
export default function DetailTopBar({ onBack, right, backLabel = 'Voltar' }) {
  const C = useTheme();
  const s = makeStyles(C);
  return (
    <View style={s.bar}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn} hitSlop={8} accessibilityLabel={backLabel}>
        <Ionicons name="arrow-back" size={20} color={C.ink} />
      </TouchableOpacity>
      {right || <View />}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
