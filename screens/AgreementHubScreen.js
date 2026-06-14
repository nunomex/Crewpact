import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import Eyebrow from '../components/Eyebrow';

const CARDS = [
  { id: 'ae',  route: 'List', code: 'AE', eyebrow: 'ACORDO DE EMPRESA',       title: 'Acordo de Empresa',       sub: 'Cláusulas do acordo coletivo de trabalho', icon: 'document-text-outline' },
  { id: 'ftl', route: 'Ftl',  code: 'FT', eyebrow: 'FLIGHT TIME LIMITATIONS', title: 'Limites de Tempo de Voo', sub: 'Tempos de serviço, voo e descanso',         icon: 'time-outline' },
];

export default function AgreementHubScreen({ navigation }) {
  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader eyebrow="BIBLIOTECA" title="O que queres consultar?" />

      <View style={s.cards}>
        {CARDS.map(c => (
          <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate(c.route)}>
            <View style={s.cardTop}>
              <View style={s.cardIcon}><Ionicons name={c.icon} size={24} color="#fff" /></View>
              <View style={s.codeBadge}><Text style={s.codeTxt}>{c.code}</Text></View>
            </View>
            <Eyebrow style={{ marginBottom: 4 }}>{c.eyebrow}</Eyebrow>
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
  cards: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18, backgroundColor: C.canvas },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  codeBadge: { backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeTxt: { color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 },
  cardTitle: { fontSize: 20, fontWeight: '600', color: C.text, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 18 },
  cardArrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  cardArrowTxt: { fontSize: 13, fontWeight: '600', color: C.ink },
});
