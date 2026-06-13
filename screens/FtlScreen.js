import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../data/constants';
import { FTL_SECTIONS, FTL_ARTICLES } from '../data/ftl';

const sectionBadge = (id) => FTL_SECTIONS.find(s => s.id === id)?.badge ?? '';
const sectionTitle = (id) => FTL_SECTIONS.find(s => s.id === id)?.title ?? '';
const sectionIdx   = (id) => FTL_SECTIONS.findIndex(s => s.id === id);
const hasCalc = (a) => !!(a.psv || a.limits || a.rest);

export default function FtlScreen({ navigation }) {
  const [query, setQuery]     = useState('');
  const [onlyCalc, setOnlyCalc] = useState(false);
  const [openSec, setOpenSec] = useState('gen');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FTL_ARTICLES.filter(a => {
      if (onlyCalc && !hasCalc(a)) return false;
      if (!q) return true;
      const hay = `${a.code} ${a.title} ${a.sub} ${a.body.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, onlyCalc]);

  const flat = useMemo(() => {
    const map = {};
    filtered.forEach(a => { (map[a.section] = map[a.section] || []).push(a); });
    const groups = Object.entries(map).sort((a, b) => sectionIdx(a[0]) - sectionIdx(b[0]));
    const items = [];
    const searching = query.trim().length > 0;
    groups.forEach(([secId, arts]) => {
      const open = searching || onlyCalc || openSec === secId;
      items.push({ type: 'header', secId, count: arts.length, open, key: 'h_' + secId });
      if (open) arts.forEach(a => items.push({ type: 'art', a, key: 'a_' + a.code }));
    });
    if (groups.length === 0) items.push({ type: 'empty', key: 'empty' });
    return items;
  }, [filtered, openSec, query, onlyCalc]);

  const renderItem = ({ item }) => {
    if (item.type === 'header') return (
      <TouchableOpacity style={[s.secHeader, item.open && s.secHeaderOpen]} activeOpacity={0.7}
        onPress={() => setOpenSec(openSec === item.secId ? null : item.secId)}>
        <View style={s.secBadge}><Text style={s.secBadgeTxt}>{sectionBadge(item.secId)}</Text></View>
        <Text style={s.secTitle} numberOfLines={1}>{sectionTitle(item.secId)}</Text>
        <Text style={s.secCount}>{item.count}</Text>
        <Ionicons name={item.open ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
      </TouchableOpacity>
    );
    if (item.type === 'empty') return (
      <View style={s.empty}><Text style={s.emptyTxt}>Nenhum artigo encontrado</Text></View>
    );
    const a = item.a;
    return (
      <TouchableOpacity style={s.row} activeOpacity={0.7}
        onPress={() => navigation.navigate('FtlDetail', { code: a.code })}>
        <View style={s.codeBox}><Text style={s.codeBoxTxt}>{a.code.replace('ORO.FTL.', '')}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowTitle} numberOfLines={1}>{a.title}</Text>
          <Text style={s.rowSub} numberOfLines={1}>{a.sub}</Text>
        </View>
        {hasCalc(a) && <Ionicons name="calculator-outline" size={14} color={C.sub} />}
        <Ionicons name="chevron-forward" size={16} color={C.line} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBlob}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>FLIGHT TIME LIMITATIONS</Text>
          <Text style={s.headTitle}>Limites de Tempo de Voo</Text>
        </View>
        <View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={17} color={C.sub} />
        <TextInput value={query} onChangeText={setQuery} placeholder="PSV, repouso, setores, reserva…"
          placeholderTextColor={C.sub} style={s.searchInput} />
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close" size={16} color={C.sub} /></TouchableOpacity>}
      </View>

      <View style={s.chips}>
        {[{ id: 'calc', label: 'Calculáveis', active: onlyCalc, onPress: () => setOnlyCalc(!onlyCalc) },
          { id: 'all', label: 'Todos', active: !onlyCalc, onPress: () => { setOnlyCalc(false); setOpenSec('gen'); } },
        ].map(chip => (
          <TouchableOpacity key={chip.id} onPress={chip.onPress}
            style={[s.chip, { backgroundColor: chip.active ? C.ink : C.canvas, borderColor: chip.active ? C.ink : C.line }]}>
            <Text style={[s.chipTxt, { color: chip.active ? '#fff' : C.sub }]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 104 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.ink, borderRadius: 22, margin: 16, marginBottom: 12, padding: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  regBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: 9, fontFamily: 'monospace', fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.soft, borderRadius: 99, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt: { fontSize: 12, fontWeight: '500' },
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8, backgroundColor: C.canvas },
  secHeaderOpen: { borderColor: C.ink, marginBottom: 6 },
  secBadge: { backgroundColor: C.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  secBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'monospace' },
  secTitle: { flex: 1, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: C.sub, textTransform: 'uppercase' },
  secCount: { fontSize: 11, fontFamily: 'monospace', color: C.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 6, backgroundColor: C.canvas },
  codeBox: { width: 44, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  codeBoxTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  rowTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  rowSub: { fontSize: 10, color: C.sub, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { color: C.sub, fontSize: 14 },
});
