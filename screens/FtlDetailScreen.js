import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../data/constants';
import {
  FTL_ARTICLES, ftlSectionN, ftlSectionTitle,
  PSV_SECTORS, PSV_ACCLIMATISED, PSV_UNKNOWN_SECTORS, PSV_UNKNOWN, PSV_UNKNOWN_FRM,
  FTL_LIMITS, FTL_DEFINITIONS,
} from '../data/ftl';

// ─── Tabela PSV (aclimatados) — scroll horizontal ────────────────────────────
function PsvTable() {
  return (
    <View style={t.block}>
      <Text style={t.blockTitle}>QUADRO 2 · PSV MÁXIMO DIÁRIO (ACLIMATADOS)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[t.row, t.headRow]}>
            <Text style={[t.cell, t.startCell, t.headCell]}>Início</Text>
            {PSV_SECTORS.map(h => <Text key={h} style={[t.cell, t.headCell]}>{h}</Text>)}
          </View>
          {PSV_ACCLIMATISED.map((r, ri) => (
            <View key={r.start} style={[t.row, ri % 2 === 1 && t.zebra]}>
              <Text style={[t.cell, t.startCell]}>{r.start}</Text>
              {r.v.map((v, vi) => <Text key={vi} style={t.cell}>{v}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={t.note}>Linhas: hora de início do PSV. Colunas: nº de setores. Valores em h:mm.</Text>
    </View>
  );
}

function PsvUnknownTable({ title, values }) {
  return (
    <View style={t.block}>
      <Text style={t.blockTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[t.row, t.headRow]}>
            <Text style={[t.cell, t.startCell, t.headCell]}>Setores</Text>
            {PSV_UNKNOWN_SECTORS.map(h => <Text key={h} style={[t.cell, t.headCell]}>{h}</Text>)}
          </View>
          <View style={t.row}>
            <Text style={[t.cell, t.startCell]}>PSV máx.</Text>
            {values.map((v, vi) => <Text key={vi} style={t.cell}>{v}</Text>)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function FtlDetailScreen({ route, navigation }) {
  const code = route.params?.code;
  const a = FTL_ARTICLES.find(x => x.code === code);
  if (!a) return null;

  return (
    <SafeAreaView style={d.safe}>
      <View style={d.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={d.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={d.scroll}>
        <Text style={d.eyebrow}>Secção {ftlSectionN(a.section)} · {ftlSectionTitle(a.section)}</Text>
        <Text style={d.code}>{a.code}</Text>
        <Text style={d.title}>{a.title}</Text>

        {a.body.map((p, i) => (
          <View key={i} style={d.para}>
            <View style={d.bullet} />
            <Text style={d.paraTxt}>{p}</Text>
          </View>
        ))}

        {a.psv && (
          <>
            <PsvTable />
            <PsvUnknownTable title="QUADRO 3 · ACLIMATAÇÃO DESCONHECIDA" values={PSV_UNKNOWN} />
            <PsvUnknownTable title="QUADRO 4 · DESCONHECIDA + SGRF" values={PSV_UNKNOWN_FRM} />
          </>
        )}

        {a.limits && (
          <View style={d.box}>
            <Text style={d.boxTitle}>SERVIÇO · TEMPO DE VOO</Text>
            {[...FTL_LIMITS.duty.map(l => ({ ...l, tag: 'Serviço' })), ...FTL_LIMITS.flight.map(l => ({ ...l, tag: 'Voo' }))].map((l, i) => (
              <View key={i} style={[d.boxRow, i > 0 && d.boxDiv]}>
                <View style={{ flex: 1 }}>
                  <Text style={d.boxTag}>{l.tag}</Text>
                  <Text style={d.boxLbl}>{l.period}</Text>
                </View>
                <Text style={d.boxVal}>{l.value}</Text>
              </View>
            ))}
          </View>
        )}

        {a.rest && (
          <View style={d.box}>
            <Text style={d.boxTitle}>REPOUSO</Text>
            {FTL_LIMITS.rest.map((l, i) => (
              <View key={i} style={[d.boxRowCol, i > 0 && d.boxDiv]}>
                <Text style={d.boxLbl}>{l.label}</Text>
                <Text style={d.boxValSm}>{l.value}</Text>
              </View>
            ))}
          </View>
        )}

        {a.defs && (
          <View style={{ marginTop: 8 }}>
            {FTL_DEFINITIONS.map((def, i) => (
              <View key={i} style={d.defRow}>
                <Text style={d.defTerm}>{def.term}</Text>
                <Text style={d.defTxt}>{def.def}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const t = StyleSheet.create({
  block: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  blockTitle: { fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.8)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  row: { flexDirection: 'row' },
  headRow: { backgroundColor: C.soft },
  zebra: { backgroundColor: C.soft },
  cell: { width: 52, fontSize: 11, fontFamily: 'monospace', color: C.text, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  startCell: { width: 92, textAlign: 'left', paddingLeft: 10, color: C.sub },
  headCell: { color: C.sub, fontWeight: '700' },
  note: { fontSize: 10, color: C.sub, padding: 10, borderTopWidth: 1, borderTopColor: C.line },
});

const d = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingBottom: 60 },
  eyebrow: { fontSize: 10, color: C.sub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  code: { fontSize: 26, fontWeight: '300', letterSpacing: -0.5, color: C.text, fontFamily: 'monospace' },
  title: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3, color: C.text, marginTop: 4, marginBottom: 18 },
  para: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bullet: { width: 6, height: 6, borderRadius: 99, backgroundColor: C.red, marginTop: 8 },
  paraTxt: { flex: 1, fontSize: 14, lineHeight: 22, color: C.text },
  box: { marginTop: 18, borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  boxTitle: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.8)', fontWeight: '600', backgroundColor: C.ink, padding: 10 },
  boxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  boxRowCol: { paddingHorizontal: 12, paddingVertical: 11 },
  boxDiv: { borderTopWidth: 1, borderTopColor: C.line },
  boxTag: { fontSize: 8, letterSpacing: 1.5, color: C.red, fontWeight: '700' },
  boxLbl: { fontSize: 13, color: C.text, marginTop: 1 },
  boxVal: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  boxValSm: { fontSize: 12, fontFamily: 'monospace', color: C.sub, marginTop: 3 },
  defRow: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 12 },
  defTerm: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 3 },
  defTxt: { fontSize: 13, lineHeight: 19, color: C.sub },
});
