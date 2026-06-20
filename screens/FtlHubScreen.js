import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import AeCalcs from '../components/AeCalcs';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { FTL_ARTICLES } from '../data/ftl';
import { openFtlPdf } from '../data/ftlPdf';
import { t, tx } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

const hasCalc = (a) => !!(a.psv || a.limits || a.rest || a.inflight || a.standby || a.delayed);

// Glow radial vermelho do cartão de ação (mockup .actbig::after), via SVG.
function Glow() {
  return (
    <Svg width={130} height={130} style={{ position: 'absolute', right: -30, top: -34 }} pointerEvents="none">
      <Defs>
        <RadialGradient id="actGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F5402C" stopOpacity="0.5" />
          <Stop offset="0.7" stopColor="#F5402C" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="65" cy="65" r="65" fill="url(#actGlow)" />
    </Svg>
  );
}

// Pill de ferramenta (mockup .pills .p): código a vermelho + rótulo.
function Pill({ code, label, onPress, s }) {
  return (
    <TouchableOpacity style={s.pill} activeOpacity={0.8} onPress={onPress}>
      <Text style={s.pillCode}>{code}</Text>
      <Text style={s.pillTxt} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

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
  const seg = useEnter(); // entrada escalonada das secções

  // Empresa com Acordo de Empresa modelado → a aba Cálculos mostra a suite AE
  // (pagamento). Empresa de FTL → as ferramentas regulamentares (limites). Uma
  // companhia tem AE OU FTL, nunca ambos.
  if (ae) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
          <PageHeader eyebrow={ae.AE_LABEL} title={l('Cálculos', 'Calculations')}
            right={<NotificationsBell />} />
          <Animated.View style={seg(0)}>
            <AeCalcs ae={ae} category={crewCategory} contract={crewContract || '12/12'} duties={duties || []} />
          </Animated.View>
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
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow={t('ftl.eyebrow', lang)} title={l('Cálculos', 'Calculations')}
          right={<NotificationsBell />} />
        {/* Atividade — cartão de ação escuro com glow radial (mockup .actbig) */}
        <Animated.View style={seg(0)}>
          <TouchableOpacity style={s.actbig} activeOpacity={0.9} onPress={() => navigation.navigate('FtlCalc', { duty: true })}>
            <Glow />
            <View style={s.actIc}><Ionicons name="flag" size={22} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.actTitle} numberOfLines={1}>{t('ftl.dutyCardTitle', lang)}</Text>
              <Text style={s.actSub} numberOfLines={1}>{t('ftl.dutyCardSub', lang)}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── CALCULAR — pills das ferramentas (mockup .pills) ── */}
        <Animated.View style={seg(1)}>
        <Text style={s.sec}>{l('CALCULAR', 'CALCULATE')}</Text>
        <View style={s.pills}>
          <Pill code="205c" label={t('ftl.calcInflight', lang)} onPress={() => navigation.navigate('FtlCalc', { code: 'CS FTL.1.205(c)' })} s={s} />
          <Pill code="225" label={t('ftl.calcStandby', lang)} onPress={() => navigation.navigate('FtlCalc', { code: 'ORO.FTL.225' })} s={s} />
          <Pill code="215" label={t('ftl.calcPositioning', lang)} onPress={() => navigation.navigate('FtlCalc', { code: 'ORO.FTL.215' })} s={s} />
          <Pill code="205g" label={t('ftl.calcDelayed', lang)} onPress={() => navigation.navigate('FtlCalc', { code: 'CS FTL.1.205(g)' })} s={s} />
        </View>
        </Animated.View>

        {/* ── CONSULTAR ── */}
        <Animated.View style={seg(2)}>
        <View style={s.consultHead}>
          <Text style={[s.sec, { marginTop: 0, marginBottom: 0 }]}>{l('CONSULTAR', 'REFERENCE')}</Text>
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
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.bold, marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  subGroup: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.sub, fontFamily: FONT.semibold, marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },
  // Atividade (mockup .actbig) — cartão escuro + glow radial + ícone vermelho
  actbig: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: C.ink, borderRadius: 24, padding: 19, marginTop: SPACE.sm, marginBottom: 20, overflow: 'hidden' },
  actIc: { width: 50, height: 50, borderRadius: 16, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontFamily: FONT.semibold, fontSize: 19, color: '#fff' },
  actSub: { fontFamily: FONT.medium, fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  sec: { fontFamily: FONT.heavy, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.sub, marginTop: 2, marginBottom: 11, marginLeft: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 18 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 15, paddingVertical: 11 },
  pillCode: { fontFamily: FONT.semibold, fontSize: 12.5, color: C.red, marginRight: 5 },
  pillTxt: { fontFamily: FONT.heavy, fontSize: 12.5, color: C.text },
  regBadge: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  regTxt: { color: C.sub, fontSize: TYPE.eyebrow, fontFamily: FONT.bold },

  // Calcular: cartão principal (Atividade) + grelha de ferramentas
  fcard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, backgroundColor: C.card },
  fcardTitle: { fontSize: TYPE.body, fontFamily: FONT.semibold, color: C.text, lineHeight: 19 },
  fcardSub: { fontSize: 11, color: C.sub, marginTop: 3, lineHeight: 16 },
  badge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#fff', fontSize: 13, fontFamily: FONT.bold },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tool: { width: '48%', borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, backgroundColor: C.card, gap: 10, minHeight: 92 },
  toolBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.sm - 2, backgroundColor: C.ink, paddingHorizontal: 8, paddingVertical: 3 },
  toolBadgeTxt: { color: '#fff', fontSize: 12, fontFamily: FONT.bold },
  toolTitle: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text, lineHeight: 18 },

  // Consultar: cabeçalho com botão PDF + cartões de artigo
  consultHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  pdfBtnTxt: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.text, letterSpacing: 0.3 },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  cardTitle: { fontSize: TYPE.body, fontFamily: FONT.semibold, color: C.text, lineHeight: 19 },
  cardSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, lineHeight: 16 },
  codeTag: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.sub, backgroundColor: C.soft, borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
});
