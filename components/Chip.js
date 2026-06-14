import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';

// Linha de chips de filtro + chip individual (AE e FTL).
export function ChipRow({ children }) {
  return <View style={s.row}>{children}</View>;
}

export function Chip({ label, active, onPress, tone }) {
  const activeBg = tone === 'red' ? C.red : C.ink;
  return (
    <TouchableOpacity onPress={onPress}
      style={[s.chip, { backgroundColor: active ? activeBg : C.canvas, borderColor: active ? activeBg : C.line }]}>
      <Text style={[s.chipTxt, { color: active ? '#fff' : C.sub }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, paddingHorizontal: SPACE.lg, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: 16, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  chipTxt: { fontSize: TYPE.sub, fontWeight: '500' },
});
