import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { C as _C, RADIUS, TYPE, PALETTE_DARK, FONT } from '../data/constants';
import { tap, select } from '../data/haptics';
import { useTheme } from '../App';

// Stepper numérico (− valor +) e seletor segmentado, partilhados pelas calculadoras.
export function Stepper({ label, value, setValue, min = 0, max = 9999 }) {
  const C = useTheme();
  const st = makeSt(C);
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <View style={st.stepRow}>
      <Text style={st.stepLabel}>{label}</Text>
      <View style={st.stepControls}>
        <TouchableOpacity onPress={() => { tap(); setValue(clamp(value - 1)); }} style={st.stepBtn} hitSlop={6} accessibilityLabel={`Diminuir ${label}`}><Text style={st.stepBtnTxt}>−</Text></TouchableOpacity>
        <TextInput value={String(value)} keyboardType="numeric" selectTextOnFocus accessibilityLabel={label}
          onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setValue(clamp(isNaN(n) ? 0 : n)); }}
          style={st.stepInput} />
        <TouchableOpacity onPress={() => { tap(); setValue(clamp(value + 1)); }} style={[st.stepBtn, { backgroundColor: C.ink }]} hitSlop={6} accessibilityLabel={`Aumentar ${label}`}><Text style={[st.stepBtnTxt, { color: '#fff' }]}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// `dark` — variante para fundos escuros (ex.: cartão do Início).
export function Seg({ options, value, setValue, dark }) {
  const C = useTheme();
  const st = makeSt(C);
  // Em tema escuro (ou sobre superfície escura), o selecionado é uma pílula clara
  // com texto escuro — caso contrário, no escuro, selecionado ≈ não-selecionado.
  const onDark = dark || C === PALETTE_DARK;
  return (
    <View style={st.segWrap}>
      {options.map(o => {
        const sel = value === o.id;
        const bg = onDark ? (sel ? '#fff' : C.hairlineOnDark) : (sel ? C.ink : C.soft);
        const fg = onDark ? (sel ? C.ink : C.onDarkSub) : (sel ? '#fff' : C.sub);
        return (
          <TouchableOpacity key={o.id} onPress={() => { select(); setValue(o.id); }} style={[st.segBtn, { backgroundColor: bg }]}>
            <Text style={[st.segTxt, { color: fg }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeSt = (C) => StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: TYPE.body, color: C.text, flex: 1, paddingRight: 8 },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  stepBtnTxt: { fontSize: 20, color: C.text, lineHeight: 24 },
  stepInput: { width: 56, textAlign: 'center', fontFamily: FONT.medium, fontSize: TYPE.body, backgroundColor: C.soft, borderRadius: 8, paddingVertical: 9, borderWidth: 1, borderColor: C.line, color: C.text },
  segWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  segBtn: { borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  segTxt: { fontSize: TYPE.sub, fontFamily: FONT.semibold },
});
