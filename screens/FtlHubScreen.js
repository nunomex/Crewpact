import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import AeCalcs from '../components/AeCalcs';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { FTL_ARTICLES } from '../data/ftl';
import { openFtlPdf } from '../data/ftlPdf';
import { t, tx } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../App';

const hasCalc = (a) => !!(a.psv || a.limits || a.rest || a.inflight || a.standby || a.delayed);

// Agrupamento temático dos artigos de consulta (fundido da antiga aba FTL).
const THEMES = [
  { id: 'psv',  label: { pt: 'PSV e prolongamentos', en: 'FDP & extensions' }, codes: ['ORO.FTL.205', 'CS FTL.1.205(c)', 'CS FTL.1.205(g)'] },
  { id: 'lim',  label: { pt: 'Limites e serviço',     en: 'Limits & duty' },    codes: ['ORO.FTL.210', 'ORO.FTL.215'] },
  { id: 'rest', label: { pt: 'Repouso e standby',     en: 'Rest & standby' },   codes: ['ORO.FTL.235', 'ORO.FTL.225'] },
];

// Aba FTL — calcular (Atividade + ferramentas) e consultar (artigos + PDF) num só
// destino. Junta as antigas abas Cálculos e FTL. Toda a matemática vive no motor `ftl/`.
export default function FtlHubScreen({ navigation }) {
  const { lang, ae, crewCategory, crewContract, duties } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();

  // Empresa com Acordo de Empresa modelado → a aba Cálculos mostra a suite AE
  // (pagamento). Empresa de FTL → as ferramentas regulamentares (limites). Uma
  // companhia tem AE OU FTL, nunca ambos.
  if (ae) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader eyebrow={ae.AE_LABEL} title={l('Cálculos', 'Calculations')}
          right={<View style={s.regBadge}><Text style={s.regTxt}>AE</Text></View>} />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
          <AeCalcs ae={ae} category={crewCategory} contract={crewContract || '12/12'} duties={duties || []} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const articles = FTL_ARTICLES.filter(hasCalc);
  const groups = THEMES.map(th => ({ ...th, items: articles.filter(a => th.codes.includes(a.code)) })).filter(g => g.items.length);
  const used = new Set(THEMES.flatMap(th => th.codes));
  const ungrouped = articles.filter(a => !used.has(a.code));

  const openPdf = async () => {
    select();
    const ok = await openFtlPdf();
    if (!ok) Alert.alert(t('ftl.pdfTitle', lang), t('ftl.pdfError', lang));
  };

  const article = (a) => (
    <TouchableOpacity key={a.code} style={s.card} activeOpacity={0.8}
      onPress={() => navigation.navigate('FtlDetail', { code: a.code })}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle} numberOfLines={1}>{tx(a.title, lang)}</Text>
        <Text style={s.cardSub} numberOfLines={1}>{tx(a.sub, lang)}</Text>
      </View>
      <Text style={s.codeTag}>{a.code.replace('ORO.FTL.', '').replace('CS FTL.1.', '')}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.sub} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('ftl.eyebrow', lang)} title={t('ftl.title', lang)}
        right={<View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
        {/* ── CALCULAR ── */}
        <Text style={s.group}>{l('CALCULAR', 'CALCULATE')}</Text>
        <TouchableOpacity style={s.fcard} activeOpacity={0.8} onPress={() => navigation.navigate('FtlCalc', { duty: true })}>
          <View style={s.badge}><Text style={s.badgeTxt}>FTL</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.fcardTitle} numberOfLines={2}>{t('ftl.dutyCardTitle', lang)}</Text>
            <Text style={s.fcardSub} numberOfLines={2}>{t('ftl.dutyCardSub', lang)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.sub} />
        </TouchableOpacity>

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

        {/* ── CONSULTAR ── */}
        <View style={s.consultHead}>
          <Text style={[s.group, { marginTop: 0, marginBottom: 0 }]}>{l('CONSULTAR', 'REFERENCE')}</Text>
          <TouchableOpacity style={s.pdfBtn} activeOpacity={0.8} onPress={openPdf}>
            <Ionicons name="document-text-outline" size={14} color={C.text} />
            <Text style={s.pdfBtnTxt}>PDF</Text>
            <Ionicons name="open-outline" size={13} color={C.sub} />
          </TouchableOpacity>
        </View>

        {groups.map(g => (
          <View key={g.id}>
            <Text style={s.subGroup}>{tx(g.label, lang)}</Text>
            {g.items.map(article)}
          </View>
        ))}
        {ungrouped.length ? (
          <View>
            <Text style={s.subGroup}>{t('ftl.consultTitle', lang)}</Text>
            {ungrouped.map(article)}
          </View>
        ) : null}

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  subGroup: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.sub, fontWeight: '600', marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },
  regBadge: { backgroundColor: C.hairlineOnDark, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },

  // Calcular: cartão principal (Atividade) + grelha de ferramentas
  fcard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, backgroundColor: C.card },
  fcardTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  fcardSub: { fontSize: 11, color: C.sub, marginTop: 3, lineHeight: 16 },
  badge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tool: { width: '48%', borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, backgroundColor: C.card, gap: 10, minHeight: 92 },
  toolBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.sm - 2, backgroundColor: C.ink, paddingHorizontal: 8, paddingVertical: 3 },
  toolBadgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  toolTitle: { fontSize: TYPE.sub, fontWeight: '600', color: C.text, lineHeight: 18 },

  // Consultar: cabeçalho com botão PDF + cartões de artigo
  consultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  pdfBtnTxt: { fontSize: TYPE.micro, fontWeight: '700', color: C.text, letterSpacing: 0.3 },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  cardTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  cardSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, lineHeight: 16 },
  codeTag: { fontSize: TYPE.micro, fontFamily: 'monospace', fontWeight: '700', color: C.sub, backgroundColor: C.soft, borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
});
