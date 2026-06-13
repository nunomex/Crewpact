import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { C, RADIUS, TYPE } from '../data/constants';

// Stepper numérico (− valor +) e seletor segmentado, partilhados pelas calculadoras.
export function Stepper({ label, value, setValue, min = 0, max = 9999 }) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <View style={st.stepRow}>
      <Text style={st.stepLabel}>{label}</Text>
      <View style={st.stepControls}>
        <TouchableOpacity onPress={() => setValue(clamp(value - 1))} style={st.stepBtn} hitSlop={6}><Text style={st.stepBtnTxt}>−</Text></TouchableOpacity>
        <TextInput value={String(value)} keyboardType="numeric" selectTextOnFocus
          onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setValue(clamp(isNaN(n) ? 0 : n)); }}
          style={st.stepInput} />
        <TouchableOpacity onPress={() => setValue(clamp(value + 1))} style={[st.stepBtn, { backgroundColor: C.ink }]} hitSlop={6}><Text style={[st.stepBtnTxt, { color: '#fff' }]}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export function Seg({ options, value, setValue }) {
  return (
    <View style={st.segWrap}>
      {options.map(o => (
        <TouchableOpacity key={o.id} onPress={() => setValue(o.id)} style={[st.segBtn, { backgroundColor: value === o.id ? C.ink : C.soft }]}>
          <Text style={[st.segTxt, { color: value === o.id ? '#fff' : C.sub }]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: TYPE.body, color: C.text, flex: 1, paddingRight: 8 },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  stepBtnTxt: { fontSize: 18, color: C.ink, lineHeight: 22 },
  stepInput: { width: 54, textAlign: 'center', fontFamily: 'monospace', fontSize: 13, backgroundColor: C.soft, borderRadius: 8, paddingVertical: 6, borderWidth: 1, borderColor: C.line, color: C.text },
  segWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  segBtn: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  segTxt: { fontSize: TYPE.label, fontWeight: '600' },
});
