import React, { useContext, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, SECTIONS, CALC } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { AppContext } from '../App';

const sectionTitle = (id) => SECTIONS.find(s => s.id === id)?.title ?? '';
const sectionN     = (id) => SECTIONS.find(s => s.id === id)?.n ?? 0;

const isApplicable = (cl, profile) => {
  if (!profile.rank || !profile.contract) return true;
  return (cl.ranks.includes('all') || cl.ranks.includes(profile.rank)) &&
         (cl.contracts.includes('all') || cl.contracts.includes(profile.contract));
};

export default function ListScreen({ navigation, route }) {
  const { profile, lang } = useContext(AppContext);
  const [query, setQuery]           = useState('');
  const [activeSection, setSection] = useState('all');
  const [openSec, setOpenSec]       = useState(null);
  const [onlyMine, setOnlyMine]     = useState(false);
  const [onlyCalc, setOnlyCalc]     = useState(route?.params?.onlyCalc ?? false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLAUSES.filter(cl => {
      if (activeSection !== 'all' && cl.section !== activeSection) return false;
      if (onlyMine && !isApplicable(cl, profile)) return false;
      if (onlyCalc && !CALC[cl.number]) return false;
      if (!q) return true;
      const hay = `${cl.number} ${cl.title.pt} ${cl.title.en} ${cl.body.pt} ${cl.tags.join(' ')} ${cl.code}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeSection, onlyMine, onlyCalc, profile]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(cl => { (map[cl.section] = map[cl.section] || []).push(cl); });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.number - b.number));
    return Object.entries(map).sort((a, b) => sectionN(a[0]) - sectionN(b[0]));
  }, [filtered]);

  const flat = useMemo(() => {
    const items = [];
    const searching = query.trim().length > 0;
    grouped.forEach(([secId, clauses]) => {
      const open = searching || openSec === secId;
      items.push({ type: 'header', secId, count: clauses.length, open, key: 'h_' + secId });
      if (open) clauses.forEach(cl => items.push({ type: 'clause', cl, key: 'c_' + cl.number }));
    });
    if (grouped.length === 0) items.push({ type: 'empty', key: 'empty' });
    return items;
  }, [grouped, openSec, query]);

  const renderItem = ({ item }) => {
    if (item.type === 'header') return (
      <TouchableOpacity style={[s.secHeader, item.open && s.secHeaderOpen]} activeOpacity={0.7}
        onPress={() => setOpenSec(openSec === item.secId ? null : item.secId)}>
        <View style={s.secBadge}><Text style={s.secBadgeTxt}>S{sectionN(item.secId)}</Text></View>
        <Text style={s.secTitle} numberOfLines={1}>{sectionTitle(item.secId)}</Text>
        <Text style={s.secCount}>{item.count}</Text>
        <Ionicons name={item.open ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
      </TouchableOpacity>
    );
    if (item.type === 'empty') return (
      <View style={s.empty}><Text style={s.emptyTxt}>Nenhuma cláusula encontrada</Text></View>
    );
    const cl = item.cl;
    const mine = isApplicable(cl, profile);
    return (
      <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Detail', { clause: cl })}>
        <View style={[s.numBox, { backgroundColor: C.ink }]}>
          <Text style={s.numTxt}>{cl.number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.clauseTitle} numberOfLines={1}>{cl.title[lang]}</Text>
          <Text style={s.clauseTags} numberOfLines={1}>{cl.tags.join(' · ')}</Text>
        </View>
        {CALC[cl.number] && <Ionicons name="calculator-outline" size={14} color={C.sub} />}
        {mine && <View style={s.mineDot} />}
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
        <View>
          <Text style={s.eyebrow}>ÍNDICE</Text>
          <Text style={s.headTitle}>Acordo de Empresa</Text>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search" size={17} color={C.sub} />
        <TextInput value={query} onChangeText={setQuery} placeholder="per diem, férias, 9/3…"
          placeholderTextColor={C.sub} style={s.searchInput} />
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close" size={16} color={C.sub} /></TouchableOpacity>}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {[{ id: 'mine', label: 'Aplicáveis a mim', active: onlyMine, onPress: () => setOnlyMine(!onlyMine), tone: 'red' },
          { id: 'calc', label: 'Calculadoras',     active: onlyCalc, onPress: () => setOnlyCalc(!onlyCalc) },
          { id: 'all',  label: 'Todas',            active: activeSection === 'all', onPress: () => { setSection('all'); setOpenSec(null); } },
          ...SECTIONS.map(sec => ({ id: sec.id, label: sec.title, active: activeSection === sec.id, onPress: () => { setSection(sec.id); setOpenSec(sec.id); } })),
        ].map(chip => (
          <TouchableOpacity key={chip.id} onPress={chip.onPress}
            style={[s.chip, { backgroundColor: chip.active ? (chip.tone === 'red' ? C.red : C.ink) : C.canvas, borderColor: chip.active ? (chip.tone === 'red' ? C.red : C.ink) : C.line }]}>
            <Text style={[s.chipTxt, { color: chip.active ? '#fff' : C.sub }]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  headerBlob: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.ink, borderRadius: 22, margin: 16, marginBottom: 12, padding: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: '600', marginBottom: 6 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.soft, borderRadius: 99, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  chips: { marginBottom: 8, maxHeight: 44 },
  chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 },
  chipTxt: { fontSize: 12, fontWeight: '500', whiteSpace: 'nowrap' },
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8, backgroundColor: C.canvas },
  secHeaderOpen: { borderColor: C.ink, marginBottom: 6 },
  secBadge: { backgroundColor: C.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  secBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'monospace' },
  secTitle: { flex: 1, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: C.sub, textTransform: 'uppercase' },
  secCount: { fontSize: 11, fontFamily: 'monospace', color: C.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 6, backgroundColor: C.canvas },
  numBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  clauseTitle: { fontSize: 13, fontWeight: '500', color: C.text },
  clauseTags: { fontSize: 10, color: C.sub, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  mineDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.red },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { color: C.sub, fontSize: 14 },
});
