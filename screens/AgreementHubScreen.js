import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, TYPE } from '../data/constants';

const CARDS = [
  { id: 'ae',  route: 'List', code: 'AE', eyebrow: 'ACORDO DE EMPRESA',       title: 'Acordo de Empresa',       sub: 'Cláusulas do acordo coletivo de trabalho', icon: 'document-text-outline' },
  { id: 'ftl', route: 'Ftl',  code: 'FT', eyebrow: 'FLIGHT TIME LIMITATIONS', title: 'Limites de Tempo de Voo', sub: 'Tempos de serviço, voo e descanso',         icon: 'time-outline' },
];

export default function AgreementHubScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}>
        <Text style={s.eyebrow}>BIBLIOTECA</Text>
        <Text style={s.headTitle}>O que queres consultar?</Text>
      </View>

      <View style={s.cards}>
        {CARDS.map(c => (
          <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate(c.route)}>
            <View style={s.cardTop}>
              <View style={s.cardIcon}><Ionicons name={c.icon} size={24} color="#fff" /></View>
              <View style={s.codeBadge}><Text style={s.codeTxt}>{c.code}</Text></View>
            </View>
            <Text style={s.cardEyebrow}>{c.eyebrow}</Text>
            <Text style={s.cardTitle}>{c.title}</Text>
            <Text style={s.cardSub}>{c.sub}</Text>
            <View style={s.cardArrow}>
              <Text style={s.cardArrowTxt}>Abrir</Text>
              <Ionicons name="arrow-forward" size={16} color={C.ink} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { backgroundColor: C.ink, borderRadius: RADIUS.xl, margin: 16, marginBottom: 12, padding: 16 },
  eyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: TYPE.title, fontWeight: '500' },
  cards: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18, backgroundColor: C.canvas },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  codeBadge: { backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeTxt: { color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 },
  cardEyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '600', marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '600', color: C.text, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 18 },
  cardArrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  cardArrowTxt: { fontSize: 13, fontWeight: '600', color: C.ink },
});
