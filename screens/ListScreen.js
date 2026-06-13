import React, { useContext, useState, useMemo } from 'react';
import { FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { C, SECTIONS, CALC } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import { Chip, ChipRow } from '../components/Chip';
import { SectionHeader, ListRow, EmptyState } from '../components/SectionAccordion';
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
      if (onlyCalc && (!CALC[cl.number] || !isApplicable(cl, profile))) return false;
      if (!q) return true;
      const hay = `${cl.number} ${cl.title.pt} ${cl.title.en || ''} ${cl.body.pt} ${cl.tags.join(' ')} ${cl.code}`.toLowerCase();
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
      <SectionHeader badge={`S${sectionN(item.secId)}`} title={sectionTitle(item.secId)}
        count={item.count} open={item.open}
        onPress={() => setOpenSec(openSec === item.secId ? null : item.secId)} />
    );
    if (item.type === 'empty') return <EmptyState text="Nenhuma cláusula encontrada" />;
    const cl = item.cl;
    return (
      <ListRow badge={cl.number} title={cl.title[lang]} sub={cl.tags.join(' · ')} subUpper
        calc={!!CALC[cl.number]} mine={isApplicable(cl, profile)}
        onPress={() => navigation.navigate('Detail', { clause: cl })} />
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader eyebrow="ÍNDICE" title="Acordo de Empresa" onBack={() => navigation.goBack()} />

      <SearchBar value={query} onChangeText={setQuery} placeholder="per diem, férias, 9/3…" />

      <ChipRow>
        <Chip label="Aplicáveis a mim" tone="red" active={onlyMine} onPress={() => setOnlyMine(!onlyMine)} />
        <Chip label="Calculáveis" active={onlyCalc} onPress={() => setOnlyCalc(!onlyCalc)} />
        <Chip label="Todas" active={!onlyMine && !onlyCalc} onPress={() => { setOnlyMine(false); setOnlyCalc(false); setSection('all'); setOpenSec(null); }} />
      </ChipRow>

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 104 }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
});
