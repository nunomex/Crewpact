import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, CALC } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { AppContext } from '../App';

export default function FavoritesScreen({ navigation }) {
  const { favorites, lang, profile } = useContext(AppContext);
  const items = CLAUSES.filter(c => favorites.has(c.number));

  if (items.length === 0) return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}><Text style={s.eyebrow}>GUARDADOS</Text><Text style={s.headTitle}>Favoritos</Text></View>
      <View style={s.empty}>
        <Ionicons name="star-outline" size={32} color={C.line} />
        <Text style={s.emptyTxt}>Sem favoritos</Text>
        <Text style={s.emptySub}>Toque na estrela numa cláusula para a guardar aqui.</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}><Text style={s.eyebrow}>GUARDADOS</Text><Text style={s.headTitle}>Favoritos</Text></View>
      <FlatList data={items} keyExtractor={c => String(c.number)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item: cl }) => (
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Detail', { clause: cl })}>
            <View style={s.numBox}><Text style={s.numTxt}>{cl.number}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.clauseTitle} numberOfLines={1}>{cl.title[lang]}</Text>
              <Text style={s.clauseTags} numberOfLines={1}>{cl.tags.join(' · ')}</Text>
            </View>
            {CALC[cl.number] && <Ionicons name="calculator-outline" size={14} color={C.sub} />}
            <Ionicons name="chevron-forward" size={16} color={C.line} />
          </TouchableOpacity>
        )} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { backgroundColor: C.ink, borderRadius: 22, margin: 16, marginBottom: 12, padding: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 6, backgroundColor: C.canvas },
  numBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  numTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  clauseTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  clauseTags: { fontSize: 10, color: C.sub, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: '500', color: C.text },
  emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', paddingHorizontal: 40 },
});
