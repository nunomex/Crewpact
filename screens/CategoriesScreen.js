import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RANKS, SALARY, SECTOR_TABLE, POSITIONING } from '../data/constants';
import { CLAUSES } from '../data/clauses';

// RANKS, SALARY/SECTOR_TABLE/POSITIONING rows partilham a mesma ordem de categorias.
export default function CategoriesScreen({ navigation }) {
  const openClause = (number) => {
    const clause = CLAUSES.find(c => c.number === number);
    if (clause) navigation.navigate('AE/FTL', { screen: 'Detail', params: { clause } });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerBlob}>
          <Text style={s.eyebrow}>CATEGORIAS PROFISSIONAIS</Text>
          <Text style={s.headTitle}>Categorias</Text>
        </View>

        {RANKS.map((r, i) => (
          <View key={r.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.numBox}><Text style={s.numTxt}>{i + 1}</Text></View>
              <Text style={s.cardTitle}>{r.label}</Text>
            </View>
            <View style={s.rowsBox}>
              <View style={s.row}>
                <Text style={s.rowLbl}>Base anual (Nov 25)</Text>
                <Text style={s.rowVal}>{SALARY.rows[i].v[2]}</Text>
              </View>
              <View style={[s.row, s.rowDiv]}>
                <Text style={s.rowLbl}>Setor nominal (Nov 25)</Text>
                <Text style={s.rowVal}>{SECTOR_TABLE.rows[i].v[2]}</Text>
              </View>
              <View style={[s.row, s.rowDiv]}>
                <Text style={s.rowLbl}>Posicionamento (C/M/L/X)</Text>
                <Text style={s.rowValSm}>{POSITIONING.rows[i].v.join(' / ')} €</Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.link} activeOpacity={0.8} onPress={() => openClause(33)}>
          <Ionicons name="document-text-outline" size={16} color={C.red} />
          <Text style={s.linkTxt}>Cláusula 33 — Descrição e progressão</Text>
          <Ionicons name="chevron-forward" size={15} color={C.line} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={s.link} activeOpacity={0.8} onPress={() => openClause(34)}>
          <Ionicons name="document-text-outline" size={16} color={C.red} />
          <Text style={s.linkTxt}>Cláusula 34 — Chefe de Cabine “Upranker”</Text>
          <Ionicons name="chevron-forward" size={15} color={C.line} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <Text style={s.foot}>Valores ilíquidos do Anexo I (Nov 2025). Tabela salarial completa nas cláusulas 50 e 53.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: 16, paddingBottom: 40 },
  headerBlob: { backgroundColor: C.ink, borderRadius: 22, padding: 16, marginBottom: 12 },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, marginBottom: 10, backgroundColor: C.canvas },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  numBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  numTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  rowsBox: { borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  rowDiv: { borderTopWidth: 1, borderTopColor: C.line },
  rowLbl: { fontSize: 12, color: C.sub, flex: 1 },
  rowVal: { fontSize: 14, fontFamily: 'monospace', fontWeight: '700', color: C.text },
  rowValSm: { fontSize: 11, fontFamily: 'monospace', color: C.text },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginTop: 2, marginBottom: 8 },
  linkTxt: { fontSize: 13, fontWeight: '500', color: C.text },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 12, paddingHorizontal: 2 },
});
