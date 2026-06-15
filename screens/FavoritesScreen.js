import React, { useContext, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE, CALC_SHORTCUTS, SECTIONS } from '../data/constants';
import { CLAUSES } from '../data/clauses';
import { FTL_ARTICLES, ftlSectionTitle } from '../data/ftl';
import SearchBar from '../components/SearchBar';
import { Chip, ChipRow } from '../components/Chip';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t, tx } from '../data/i18n';
import { warning } from '../data/haptics';
import { AppContext } from '../App';

const sectionTitle = (id) => SECTIONS.find(s => s.id === id)?.title ?? '';

export default function FavoritesScreen({ navigation }) {
  const { favorites, toggleFav, lang } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const [query, setQuery]   = useState('');
  const [filter, setFilter] = useState('all'); // all | calc | art | ae | ftl
  const [sort, setSort]     = useState('recent'); // recent | name
  const [editing, setEditing] = useState(false);

  // Ordem de inserção do Set = ordem em que foram adicionados (o último é o mais recente).
  const favRank = useMemo(() => {
    const m = new Map();
    [...favorites].forEach((k, i) => m.set(k, i));
    return m;
  }, [favorites]);

  const items = useMemo(() => {
    const clausePrefix = lang === 'en' ? 'Clause' : 'Cláusula';
    const calc = CALC_SHORTCUTS.map(c => ({
      kind: 'calc', key: 'calc:' + c.id, icon: c.icon,
      title: c.label[lang] ?? c.label.pt, sub: t('fav.calculator', lang),
      removable: false, onPress: () => navigation.navigate('Cálculos'),
    }));
    const ae = CLAUSES.filter(c => favorites.has(c.number)).map(c => ({
      kind: 'ae', key: 'ae:' + c.number, favKey: c.number, icon: 'document-text-outline',
      title: `${clausePrefix} ${c.number} — ${tx(c.title, lang)}`,
      sub: `AE · ${tx(sectionTitle(c.section), lang)}`,
      removable: true, onPress: () => navigation.navigate('Detail', { clause: c }),
    }));
    const ftl = FTL_ARTICLES.filter(a => favorites.has(a.code)).map(a => ({
      kind: 'ftl', key: 'ftl:' + a.code, favKey: a.code, icon: 'time-outline',
      title: `${a.code.replace('ORO.FTL.', '')} — ${tx(a.title, lang)}`,
      sub: `FTL · ${ftlSectionTitle(a.section, lang)}`,
      removable: true, onPress: () => navigation.navigate('FtlDetail', { code: a.code }),
    }));
    return { calc, ae, ftl };
  }, [favorites, lang, navigation]);

  const list = useMemo(() => {
    const showCalc = filter === 'all' || filter === 'calc';
    const showAe   = filter === 'all' || filter === 'art' || filter === 'ae';
    const showFtl  = filter === 'all' || filter === 'art' || filter === 'ftl';

    let calc = showCalc ? [...items.calc] : [];
    let law = [];
    if (showAe) law.push(...items.ae);
    if (showFtl) law.push(...items.ftl);

    if (sort === 'name') {
      const byName = (a, b) => a.title.localeCompare(b.title);
      calc.sort(byName); law.sort(byName);
    } else {
      // Recentes: cláusulas/artigos por ordem de adição (mais recente primeiro);
      // atalhos de calculadora ficam à frente, na sua ordem fixa.
      law.sort((a, b) => (favRank.get(b.favKey) ?? -1) - (favRank.get(a.favKey) ?? -1));
    }

    let arr = [...calc, ...law];
    const q = query.trim().toLowerCase();
    if (q) arr = arr.filter(i => `${i.title} ${i.sub}`.toLowerCase().includes(q));
    return arr;
  }, [items, filter, query, sort, favRank]);

  const remove = (item) => { warning(); toggleFav(item.favKey); };

  const FILTERS = [
    { id: 'all',  label: t('fav.fAll', lang) },
    { id: 'calc', label: t('fav.fCalc', lang) },
    { id: 'art',  label: t('fav.fArticles', lang) },
    { id: 'ae',   label: 'AE' },
    { id: 'ftl',  label: 'FTL' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Cabeçalho */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel={t('common.back', lang)}>
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.title}>{t('fav.title', lang)}</Text>
          <Text style={s.subtitle} numberOfLines={1}>{t('fav.subtitle', lang)}</Text>
        </View>
        <TouchableOpacity style={s.editBtn} onPress={() => setEditing(e => !e)} hitSlop={8}>
          <Text style={s.editTxt}>{editing ? t('fav.done', lang) : t('fav.edit', lang)}</Text>
        </TouchableOpacity>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('fav.search', lang)} />

      <ChipRow>
        {FILTERS.map(f => (
          <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ChipRow>

      <View style={s.countRow}>
        <Text style={s.count}>{list.length} {t('fav.count', lang)}</Text>
        <TouchableOpacity style={s.sortBtn} onPress={() => setSort(p => (p === 'recent' ? 'name' : 'recent'))} hitSlop={8}>
          <Text style={s.sortLbl}>{t('fav.sort', lang)}: </Text>
          <Text style={s.sortVal}>{sort === 'recent' ? t('fav.sortRecent', lang) : t('fav.sortName', lang)}</Text>
          <Ionicons name="chevron-down" size={13} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.lg, paddingBottom: tabSpace }}>
        {list.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="star-outline" size={22} color={C.line} />
            <Text style={s.emptyTxt}>{t('fav.empty', lang)}</Text>
          </View>
        ) : list.map(item => (
          <TouchableOpacity key={item.key} style={s.row} activeOpacity={0.8}
            onPress={() => (editing ? null : item.onPress())} disabled={editing && !item.removable}>
            <View style={s.rowIcon}><Ionicons name={item.icon} size={22} color={C.red} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.rowSub} numberOfLines={1}>{item.sub}</Text>
            </View>
            {editing && item.removable ? (
              <TouchableOpacity onPress={() => remove(item)} style={s.removeBtn} hitSlop={8} accessibilityLabel={t('detail.favRemove', lang)}>
                <Ionicons name="remove" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <>
                <Ionicons name="star" size={18} color={C.red} />
                <Ionicons name="chevron-forward" size={16} color={C.line} />
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingTop: 4, paddingBottom: SPACE.md },
  iconBtn: { width: 38, height: 38, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: TYPE.title, fontWeight: '700', color: C.text },
  subtitle: { fontSize: TYPE.micro, color: C.sub, marginTop: 1 },
  editBtn: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 14, height: 38, justifyContent: 'center' },
  editTxt: { fontSize: TYPE.sub, fontWeight: '600', color: C.ink },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm },
  count: { fontSize: TYPE.label, color: C.sub },
  sortBtn: { flexDirection: 'row', alignItems: 'center' },
  sortLbl: { fontSize: TYPE.label, color: C.sub },
  sortVal: { fontSize: TYPE.label, fontWeight: '700', color: C.ink, marginRight: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.canvas },
  rowIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: C.redSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  rowSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3 },
  removeBtn: { width: 30, height: 30, borderRadius: RADIUS.pill, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: SPACE.md, paddingVertical: 60, paddingHorizontal: SPACE.xl },
  emptyTxt: { fontSize: TYPE.sub, color: C.sub, textAlign: 'center', lineHeight: 20 },
});
