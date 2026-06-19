import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { AppContext, useTheme } from '../App';

// Aba Cálculos (FTL · cabine): calculadora unificada de Atividade (herói) + grelha
// de ferramentas (repouso a bordo, standby, posicionamento, apresentação adiada).
// Tocar abre o ecrã FtlCalc. Toda a matemática vive no motor `ftl/`.
export default function CategoriesScreen({ navigation }) {
  const { lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
        <ScreenHeader eyebrow={t('calc.eyebrow', lang)} title={t('calc.title', lang)} style={{ margin: 0, marginBottom: 12 }} />

        <Text style={s.group}>{l('CALCULADORAS', 'CALCULATORS')}</Text>
        <TouchableOpacity style={s.fcard} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { duty: true })}>
          <View style={s.badge}><Text style={s.badgeTxt}>FTL</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.fcardTitle} numberOfLines={2}>{t('ftl.dutyCardTitle', lang)}</Text>
            <Text style={s.fcardSub} numberOfLines={2}>{t('ftl.dutyCardSub', lang)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.sub} />
        </TouchableOpacity>

        <Text style={s.group}>{l('FERRAMENTAS', 'TOOLS')}</Text>
        <View style={s.toolGrid}>
          <TouchableOpacity style={s.tool} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { code: 'CS FTL.1.205(c)' })}>
            <View style={s.toolBadge}><Text style={s.toolBadgeTxt}>205c</Text></View>
            <Text style={s.toolTitle} numberOfLines={2}>{t('ftl.calcInflight', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tool} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { code: 'ORO.FTL.225' })}>
            <View style={s.toolBadge}><Text style={s.toolBadgeTxt}>225</Text></View>
            <Text style={s.toolTitle} numberOfLines={2}>{t('ftl.calcStandby', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tool} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { code: 'ORO.FTL.215' })}>
            <View style={s.toolBadge}><Text style={s.toolBadgeTxt}>215</Text></View>
            <Text style={s.toolTitle} numberOfLines={2}>{t('ftl.calcPositioning', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tool} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { code: 'CS FTL.1.205(g)' })}>
            <View style={s.toolBadge}><Text style={s.toolBadgeTxt}>205g</Text></View>
            <Text style={s.toolTitle} numberOfLines={2}>{t('ftl.calcDelayed', lang)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.foot}>{l('Estimativas de apoio (Regulamento UE 83/2014). Confirma sempre na escala e nos limites oficiais.', 'Guidance estimates (Regulation EU 83/2014). Always confirm against the official roster and limits.')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: 16 },
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginTop: 10, marginBottom: 8, marginLeft: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
  fcard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, backgroundColor: C.card },
  fcardTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  fcardSub: { fontSize: 11, color: C.sub, marginTop: 3, lineHeight: 16 },
  badge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  // Grelha de ferramentas (2 colunas)
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tool: { width: '48%', borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, backgroundColor: C.card, gap: 10, minHeight: 92 },
  toolBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.sm - 2, backgroundColor: C.ink, paddingHorizontal: 8, paddingVertical: 3 },
  toolBadgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  toolTitle: { fontSize: TYPE.sub, fontWeight: '600', color: C.text, lineHeight: 18 },
});
