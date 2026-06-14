import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { C, TYPE } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import { Chip, ChipRow } from '../components/Chip';
import { SectionHeader, ListRow, EmptyState } from '../components/SectionAccordion';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { FTL_SECTIONS, FTL_ARTICLES } from '../data/ftl';

const sectionBadge = (id) => FTL_SECTIONS.find(s => s.id === id)?.badge ?? '';
const sectionTitle = (id) => FTL_SECTIONS.find(s => s.id === id)?.title ?? '';
const sectionIdx   = (id) => FTL_SECTIONS.findIndex(s => s.id === id);
const hasCalc = (a) => !!(a.psv || a.limits || a.rest);

export default function FtlScreen({ navigation }) {
  const tabSpace = useTabBarSpace();
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
      <SectionHeader badge={sectionBadge(item.secId)} title={sectionTitle(item.secId)}
        count={item.count} open={item.open}
        onPress={() => setOpenSec(openSec === item.secId ? null : item.secId)} />
    );
    if (item.type === 'empty') return <EmptyState text="Nenhum artigo encontrado" />;
    const a = item.a;
    return (
      <ListRow badge={a.code.replace('ORO.FTL.', '')} badgeWide title={a.title} sub={a.sub}
        calc={hasCalc(a)} onPress={() => navigation.navigate('FtlDetail', { code: a.code })} />
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader eyebrow="FLIGHT TIME LIMITATIONS" title="Limites de Tempo de Voo"
        onBack={() => navigation.goBack()}
        right={<View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>} />

      <SearchBar value={query} onChangeText={setQuery} placeholder="PSV, repouso, setores, reserva…" />

      <ChipRow>
        <Chip label="Calculáveis" active={onlyCalc} onPress={() => setOnlyCalc(!onlyCalc)} />
        <Chip label="Todos" active={!onlyCalc} onPress={() => { setOnlyCalc(false); setOpenSec('gen'); }} />
      </ChipRow>

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabSpace }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  regBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
});
