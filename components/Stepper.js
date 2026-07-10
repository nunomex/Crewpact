import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { tap, select } from '../data/haptics';

// Stepper numérico (− valor +) e seletor segmentado, partilhados pelas calculadoras,
// pelo form do serviço e pelos diálogos do Perfil. PELE-FICADOS por dentro (2026-07-10),
// API intacta (Stepper: label/value/setValue/min/max · Seg: options/value/setValue/dark).
export function Stepper({ label, value, setValue, min = 0, max = 9999 }) {
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <View style={st.stepRow}>
      <Text style={st.stepLabel}>{label}</Text>
      <View style={st.stepControls}>
        <TouchableOpacity onPress={() => { tap(); setValue(clamp(value - 1)); }} style={st.stepBtn} hitSlop={6} accessibilityLabel={`Diminuir ${label}`}><Text style={st.stepBtnTxt}>−</Text></TouchableOpacity>
        <TextInput value={String(value)} keyboardType="numeric" selectTextOnFocus accessibilityLabel={label}
          onChangeText={(t) => { const n = parseInt(t.replace(/[^0-9]/g, ''), 10); setValue(clamp(isNaN(n) ? 0 : n)); }}
          style={st.stepInput} />
        <TouchableOpacity onPress={() => { tap(); setValue(clamp(value + 1)); }} style={[st.stepBtn, st.stepBtnInk]} hitSlop={6} accessibilityLabel={`Aumentar ${label}`}><Text style={[st.stepBtnTxt, st.stepBtnTxtInk]}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// `dark` — variante para placas ink: o selecionado vira pílula clara com texto escuro
// (caso contrário, sobre escuro, selecionado ≈ não-selecionado).
export function Seg({ options, value, setValue, dark }) {
  return (
    <View style={st.segWrap}>
      {options.map(o => {
        const sel = value === o.id;
        const bg = dark ? (sel ? P.paper : 'rgba(255,255,255,0.12)') : (sel ? P.ink : P.soft);
        const fg = dark ? (sel ? P.ink : P.onInkSub) : (sel ? P.onInk : P.grey);
        return (
          <TouchableOpacity key={o.id} onPress={() => { select(); setValue(o.id); }} style={[st.segBtn, { backgroundColor: bg }]}>
            <Text style={[st.segTxt, { color: fg }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  stepLabel: { fontSize: 13, fontFamily: F.bodyMed, color: P.ink, flex: 1, paddingRight: 8 },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  stepBtnInk: { backgroundColor: P.ink },
  stepBtnTxt: { fontSize: 20, color: P.ink, lineHeight: 24 },
  stepBtnTxtInk: { color: P.onInk },
  stepInput: { width: 56, textAlign: 'center', fontFamily: F.displayMed, fontSize: 16, backgroundColor: P.soft, borderRadius: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: P.line, color: P.ink },
  segWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  segBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  segTxt: { fontSize: 12.5, fontFamily: F.bodyBold },
});
