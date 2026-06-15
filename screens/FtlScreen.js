import React, { useState, useMemo, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import SearchBar from '../components/SearchBar';
import { SectionHeader, ListRow, EmptyState } from '../components/SectionAccordion';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { FTL_SECTIONS, FTL_ARTICLES, ftlSectionTitle } from '../data/ftl';
import { openFtlPdf } from '../data/ftlPdf';
import { t, tx } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext } from '../App';

const sectionBadge = (id) => FTL_SECTIONS.find(s => s.id === id)?.badge ?? '';
const sectionIdx   = (id) => FTL_SECTIONS.findIndex(s => s.id === id);

// Aba FTL — apenas consulta dos artigos do Regulamento + link para o PDF.
// As calculadoras vivem no separador Cálculos.
export default function FtlScreen({ navigation }) {
  const { lang } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const [query, setQuery] = useState('');
  const [openSec, setOpenSec] = useState(null);

  const openPdf = async () => {
    select();
    const ok = await openFtlPdf();
    if (!ok) Alert.alert(t('ftl.pdfTitle', lang), t('ftl.pdfError', lang));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FTL_ARTICLES.filter(a => {
      if (!q) return true;
      const hay = `${a.code} ${tx(a.title, lang)} ${tx(a.sub, lang)} ${tx(a.body, lang).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, lang]);

  const flat = useMemo(() => {
    const map = {};
    filtered.forEach(a => { (map[a.section] = map[a.section] || []).push(a); });
    const groups = Object.entries(map).sort((a, b) => sectionIdx(a[0]) - sectionIdx(b[0]));
    const items = [];
    const searching = query.trim().length > 0;
    groups.forEach(([secId, arts]) => {
      const open = searching || openSec === secId;
      items.push({ type: 'header', secId, count: arts.length, open, key: 'h_' + secId });
      if (open) arts.forEach(a => items.push({ type: 'art', a, key: 'a_' + a.code }));
    });
    if (groups.length === 0) items.push({ type: 'empty', key: 'empty' });
    return items;
  }, [filtered, openSec, query]);

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
        onPress={() => navigation.navigate('FtlDetail', { code: a.code })} />
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('ftl.eyebrow', lang)} title={t('ftl.title', lang)}
        onBack={() => navigation.goBack()} backLabel={t('common.back', lang)}
        right={<View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>} />

      <View style={s.headerArea}>
        <TouchableOpacity style={s.pdfRow} activeOpacity={0.8} onPress={openPdf}>
          <View style={s.pdfIcon}><Ionicons name="document-text-outline" size={22} color={C.ink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.pdfTitle}>{t('ftl.pdfTitle', lang)}</Text>
            <Text style={s.pdfSub}>{t('ftl.pdfSub', lang)}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={C.sub} />
        </TouchableOpacity>

        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={16} color={C.sub} />
          <Text style={s.noteTxt}>{t('ftl.support', lang)}</Text>
        </View>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('ftl.search', lang)} />

      <FlatList data={flat} keyExtractor={item => item.key} renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabSpace }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  regBadge: { backgroundColor: C.hairlineOnDark, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
  headerArea: { paddingHorizontal: 16, marginBottom: SPACE.sm },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, backgroundColor: C.soft },
  pdfIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  pdfTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text },
  pdfSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingHorizontal: 2, marginTop: SPACE.md },
  noteTxt: { flex: 1, fontSize: TYPE.micro, color: C.sub, lineHeight: 17 },
});
