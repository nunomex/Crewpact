import React, { useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, SPACE, TYPE, CALC } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { CLAUSES } from '../data/clauses';
import { t, tx } from '../data/i18n';
import { AppContext, useTheme } from '../App';

// Índice do Acordo de Empresa — lista, como na aba FTL, só as cláusulas com
// cálculo (consulta). Tocar abre a cláusula (cópia 1:1, sem calculadora).
export default function ListScreen({ navigation }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const items = useMemo(() => CLAUSES.filter(cl => CALC[cl.number]).sort((a, b) => a.number - b.number), []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('list.eyebrow', lang)} title={t('list.title', lang)}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} backLabel={t('common.back', lang)} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabSpace, paddingTop: 4 }}>
        {items.map(cl => (
          <TouchableOpacity key={cl.number} style={s.card} activeOpacity={0.8}
            onPress={() => navigation.navigate('Detail', { clause: cl })}>
            <View style={s.badge}><Text style={s.badgeTxt}>{cl.number}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={2}>{tx(cl.title, lang)}</Text>
              {cl.tags?.length ? <Text style={s.cardSub} numberOfLines={1}>{cl.tags.join(' · ')}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.sub} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  badge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  cardTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  cardSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, lineHeight: 16 },
});
