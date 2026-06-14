import React, { useContext, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, TYPE, SECTIONS, CALC } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import { Chip, ChipRow } from '../components/Chip';
import { SectionHeader, ListRow, EmptyState } from '../components/SectionAccordion';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { CLAUSES } from '../data/clauses';
import { t, tx } from '../data/i18n';
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
  const tabSpace = useTabBarSpace();
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
      const body = tx(cl.body, lang);
      const title = tx(cl.title, lang);
      const hay = `${cl.number} ${cl.title.pt} ${cl.title.en || ''} ${title} ${body} ${cl.tags.join(' ')} ${cl.code}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, activeSection, onlyMine, onlyCalc, profile, lang]);

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
    if (item.type === 'empty') return <EmptyState text={t('list.empty', lang)} />;
    const cl = item.cl;
    return (
      <ListRow badge={cl.number} title={tx(cl.title, lang)} sub={cl.tags.join(' · ')} subUpper
        calc={!!CALC[cl.number]} mine={isApplicable(cl, profile)} mineLabel={t('list.legendMine', lang)}
        onPress={() => navigation.navigate('Detail', { clause: cl })} />
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('list.eyebrow', lang)} title={t('list.title', lang)} onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('list.search', lang)} />

      <ChipRow>
        <Chip label={t('list.filterMine', lang)} tone="red" active={onlyMine} onPress={() => setOnlyMine(!onlyMine)} />
        <Chip label={t('list.filterCalc', lang)} active={onlyCalc} onPress={() => setOnlyCalc(!onlyCalc)} />
        <Chip label={t('list.filterAll', lang)} active={!onlyMine && !onlyCalc} onPress={() => { setOnlyMine(false); setOnlyCalc(false); setSection('all'); setOpenSec(null); }} />
      </ChipRow>

      <View style={s.legend}>
        <Ionicons name="person-circle" size={13} color={C.info} />
        <Text style={s.legendTxt}>{t('list.legendMine', lang)}</Text>
        <Ionicons name="calculator-outline" size={13} color={C.sub} style={{ marginLeft: 12 }} />
        <Text style={s.legendTxt}>{t('list.legendCalc', lang)}</Text>
      </View>

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabSpace }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, marginBottom: 8 },
  legendTxt: { fontSize: TYPE.micro, color: C.sub },
});
