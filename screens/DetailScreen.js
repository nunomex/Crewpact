import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, TYPE, GUTTER, SECTIONS, CALC, SALARY, SECTOR_TABLE, POSITIONING, PAY_NUM, RANK_ROW, BOND_REPAY, SECTOR_OPTS, STANDBY_OPTS, RANKS, DATA_VERSION } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import Eyebrow from '../components/Eyebrow';
import DetailTopBar from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t as T, tx, txv } from '../data/i18n';
import { AppContext, useTheme } from '../App';

const sectionTitle = (id) => SECTIONS.find(s => s.id === id)?.title ?? '';
const sectionN     = (id) => SECTIONS.find(s => s.id === id)?.n ?? 0;
const fmtEur = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ─── Value / Salary / Sector / Pos Tables ────────────────────────────────────
function ValueTable({ title, data }) {
  const C = useTheme();
  const t = makeT(C);
  return (
    <View style={t.wrap}>
      <Text style={t.title}>{title}</Text>
      <View style={t.header}>
        <Text style={[t.hcell, { flex: 2 }]}>Categoria</Text>
        {data.periods.map((p, i) => <Text key={i} style={[t.hcell, i === data.periods.length - 1 && { color: C.red }]}>{p}</Text>)}
      </View>
      {data.rows.map((r, ri) => (
        <View key={ri} style={t.row}>
          <Text style={[t.cell, { flex: 2, color: C.text }]}>{r.rank}</Text>
          {r.v.map((v, vi) => <Text key={vi} style={[t.cell, vi === data.periods.length - 1 && { color: C.red, fontWeight: '700' }]}>{v}</Text>)}
        </View>
      ))}
    </View>
  );
}
function PosTable() {
  const C = useTheme();
  const t = makeT(C);
  return (
    <View style={t.wrap}>
      <Text style={t.title}>Posicionamento · {DATA_VERSION.payRef} (€)</Text>
      <View style={t.header}>
        <Text style={[t.hcell, { flex: 2 }]}>Categoria</Text>
        {POSITIONING.header.map((h, i) => <Text key={i} style={t.hcell}>{h}</Text>)}
      </View>
      {POSITIONING.rows.map((r, ri) => (
        <View key={ri} style={t.row}>
          <Text style={[t.cell, { flex: 2, color: C.text }]}>{r.rank}</Text>
          {r.v.map((v, vi) => <Text key={vi} style={t.cell}>{v}</Text>)}
        </View>
      ))}
    </View>
  );
}
const makeT = (C) => StyleSheet.create({
  wrap: { marginTop: 16, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  title: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  header: { flexDirection: 'row', backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 6 },
  hcell: { flex: 1, fontSize: 11, color: C.sub, fontWeight: '600', textAlign: 'right' },
  row: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  cell: { flex: 1, fontSize: 11, fontFamily: 'monospace', color: C.sub, textAlign: 'right' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DetailScreen({ route, navigation }) {
  const { profile, lang } = useContext(AppContext);
  const C = useTheme();
  const d = makeD(C);
  const tabSpace = useTabBarSpace();
  const c = route.params?.clause;
  if (!c) return null;

  return (
    <SafeAreaView style={d.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={T('common.back', lang)} />

      <ScrollView contentContainerStyle={[d.scroll, { paddingBottom: tabSpace }]}>
        <Text style={d.eyebrow}>{lang === 'en' ? 'Section' : 'Secção'} {sectionN(c.section)} · {tx(sectionTitle(c.section), lang)}</Text>
        <Text style={d.number}>{c.number}</Text>
        <Text style={d.title}>{tx(c.title, lang)}</Text>

        {c.values && (
          <View style={d.valuesBox}>
            <Text style={d.valTitle}>{c.valuesTitle ? txv(c.valuesTitle, lang) : T('detail.values', lang)}</Text>
            {c.values.map((v, i) => (
              <View key={i} style={[d.valRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                <Text style={d.valLbl}>{txv(v.l, lang)}</Text>
                <Text style={d.valAmt}>{txv(v.a, lang)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[d.body, { marginTop: c.values ? 18 : 6 }]}>{tx(c.body, lang)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeD = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER },
  eyebrow: { fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  number: { fontSize: 34, fontWeight: '300', letterSpacing: -1, color: C.sub, lineHeight: 38 },
  title: { fontSize: TYPE.heading, fontWeight: '700', letterSpacing: -0.3, color: C.text, marginBottom: 14, marginTop: 2 },
  body: { fontSize: TYPE.value, lineHeight: 24, color: C.text },
  valuesBox: { marginTop: 16, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, overflow: 'hidden' },
  valTitle: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', backgroundColor: C.ink, padding: 10, fontWeight: '600' },
  valRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  valLbl: { fontSize: 13, color: C.sub },
  valAmt: { fontSize: 13, fontFamily: 'monospace', fontWeight: '600', color: C.text },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  relNum: { fontFamily: 'monospace', fontSize: TYPE.label, color: C.text },
  relLabel: { flex: 1, fontSize: 13, color: C.text },
});
