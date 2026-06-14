import React, { useState, useMemo, useContext } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, TYPE } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import { Chip, ChipRow } from '../components/Chip';
import { SectionHeader, ListRow, EmptyState } from '../components/SectionAccordion';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { FTL_SECTIONS, FTL_ARTICLES, ftlSectionTitle } from '../data/ftl';
import { t, tx } from '../data/i18n';
import { AppContext } from '../App';

const sectionBadge = (id) => FTL_SECTIONS.find(s => s.id === id)?.badge ?? '';
const sectionIdx   = (id) => FTL_SECTIONS.findIndex(s => s.id === id);
const hasCalc = (a) => !!(a.psv || a.limits || a.rest);

export default function FtlScreen({ navigation }) {
  const { lang } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const [query, setQuery]     = useState('');
  const [onlyCalc, setOnlyCalc] = useState(false);
  const [openSec, setOpenSec] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FTL_ARTICLES.filter(a => {
      if (onlyCalc && !hasCalc(a)) return false;
      if (!q) return true;
      const hay = `${a.code} ${tx(a.title, lang)} ${tx(a.sub, lang)} ${tx(a.body, lang).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, onlyCalc, lang]);

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
      <SectionHeader badge={sectionBadge(item.secId)} title={ftlSectionTitle(item.secId, lang)}
        count={item.count} open={item.open}
        onPress={() => setOpenSec(openSec === item.secId ? null : item.secId)} />
    );
    if (item.type === 'empty') return <EmptyState text={t('ftl.empty', lang)} />;
    const a = item.a;
    return (
      <ListRow badge={a.code.replace('ORO.FTL.', '')} badgeWide title={tx(a.title, lang)} sub={tx(a.sub, lang)}
        calc={hasCalc(a)} onPress={() => navigation.navigate('FtlDetail', { code: a.code })} />
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('ftl.eyebrow', lang)} title={t('ftl.title', lang)}
        onBack={() => navigation.goBack()} backLabel={t('common.back', lang)}
        right={<View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>} />

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('ftl.search', lang)} />

      <ChipRow>
        <Chip label={t('ftl.filterCalc', lang)} active={onlyCalc} onPress={() => setOnlyCalc(!onlyCalc)} />
        <Chip label={t('ftl.filterAll', lang)} active={!onlyCalc} onPress={() => { setOnlyCalc(false); setOpenSec(null); }} />
      </ChipRow>

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabSpace }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  regBadge: { backgroundColor: C.hairlineOnDark, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
});
