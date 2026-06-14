import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, TYPE } from '../data/constants';
import Eyebrow from './Eyebrow';

// Invólucro de calculadora estático: eyebrow "CALCULADORA · …" + caixa com borda.
// (AE / FTL — o Categorias usa um acordeão próprio.)
export function CalcCard({ title = 'CALCULADORA', children, style }) {
  return (
    <View style={style}>
      <View style={c.head}>
        <Ionicons name="calculator-outline" size={13} color={C.red} />
        <Eyebrow>{title}</Eyebrow>
      </View>
      <View style={c.inner}>{children}</View>
    </View>
  );
}

// Bloco de resultado (caixa preta, número a vermelho).
// API flexível: `lines` (multi-linha [{label,val}]) OU `label`+`value` (linha única).
export function ResultBlock({ label = 'TOTAL', value, foot, lines, valueSize = TYPE.display }) {
  const data = lines || [{ label, val: value }];
  return (
    <View style={c.result}>
      {data.map((ln, i) => (
        <View key={i} style={{ marginTop: i ? 10 : 0 }}>
          <Text style={c.resLabel}>{ln.label}</Text>
          <Text style={[c.resVal, { fontSize: valueSize }]}>{ln.val}</Text>
        </View>
      ))}
      {foot ? <Text style={c.resFoot}>{foot}</Text> : null}
    </View>
  );
}

const c = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  inner: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, padding: 14 },
  result: { marginTop: 12, backgroundColor: C.ink, borderRadius: 12, padding: 14 },
  resLabel: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' },
  resVal: { color: C.red, fontFamily: 'monospace', marginTop: 2 },
  resFoot: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 8, lineHeight: 16 },
});
