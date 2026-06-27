import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import AeCalcs from '../components/AeCalcs';
import Banner from '../components/Banner';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { FTL_ARTICLES } from '../data/ftl';
import { openFtlPdf } from '../data/ftlPdf';
import { t, tx } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme } from '../data/appContext';

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
  const { lang, ae, caps, aeStatus, crewCategory, crewContract, crewFleet, instructorRated, duties, rosterChanges, aeExtras, setAeExtras } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const seg = useEnter(); // entrada escalonada das secções

  // Extras do mês (Passo 4) — no contexto, partilhado por Home/Perfil/Cálculos.
  const ym = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const extrasMonth = aeExtras[ym] || {};
  const setExtrasMonth = (next) => setAeExtras((prev) => ({ ...prev, [ym]: next }));
  // SNC sugerido pela deteção de alterações de escala (Fase 4): alteradas + conflitos.
  const sncSuggest = rosterChanges?.counts ? ((rosterChanges.counts.changed || 0) + (rosterChanges.counts.conflict || 0)) : 0;

  // A aba Cálculos mostra UMA suite: companhia com AE → a suite de pagamento
  // (AeCalcs); companhia só-FTL → as ferramentas regulamentares (limites).
  // NB: o FTL (EASA) aplica-se a TODAS as companhias — o motor FTL corre sempre
  // (estado/limites na Home, projeção no duty). O `rule_type='AE'` só decide o que
  // ESTA aba apresenta; NÃO desliga o FTL. A companhia AE é, de facto, AE + FTL.
  if (caps?.pay) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} keyboardShouldPersistTaps="handled">
          <PageHeader eyebrow={ae.AE_LABEL} title={l('Cálculos', 'Calculations')}
            right={<NotificationsBell />} />
          <Animated.View style={seg(0)}>
            <AeCalcs ae={ae} category={crewCategory} contract={crewContract || '12/12'} fleet={crewFleet} duties={duties || []}
              lifestyle={!!caps.lifestyle} instructorRated={instructorRated} extras={extrasMonth} onChangeExtras={setExtrasMonth} sncSuggest={sncSuggest} />
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
        {/* Estado 'pending': há acordo coletivo publicado, ainda não modelado → honestidade. */}
        {aeStatus === 'pending' ? (
          <Banner tone="info" icon="document-text-outline"
            title={l('Acordo coletivo por modelar', 'Collective agreement not yet modelled')}
            sub={l('Esta companhia tem AE publicado (BTE), ainda não no CrewPact — mostramos só os limites FTL (lei EASA). O estimador de salário/abonos chegará.', 'This airline has a published agreement (BTE), not yet in CrewPact — showing only FTL limits (EASA law). The salary/allowance estimator is coming.')}
            style={{ marginBottom: SPACE.md }} />
        ) : null}
        {/* Estado 'uncovered': a companhia tem AE modelado, mas TU não estás abrangido (vínculo/filiação,
            art. 496º CT) → o pagamento segue o teu contrato individual, não modelável. FTL fica igual. */}
        {aeStatus === 'uncovered' ? (
          <Banner tone="info" icon="shield-outline"
            title={l('Não abrangido pelo AE', 'Not covered by the agreement')}
            sub={l('Como agência/independente (ou sem filiação), o AE não te cobre — o pagamento segue o teu contrato, que não modelamos. Mostramos só os limites FTL (iguais para todos). Muda no Perfil.', 'As agency/independent (or not affiliated), the agreement doesn’t cover you — pay follows your own contract, which we don’t model. Showing only FTL limits (same for all). Change it in Profile.')}
            style={{ marginBottom: SPACE.md }} />
        ) : null}
        {/* Os cálculos de casos especiais (repouso a bordo 205c, standby 225, posicionamento 215,
            delayed reporting 205g) vivem na Simulação → "Avançado · casos especiais". Esta aba é
            só consulta da lei. */}

        {/* ── CONSULTAR ── */}
        <Animated.View style={seg(0)}>
        <View style={s.consultHead}>
          <Text style={[s.sec, { marginTop: 0, marginBottom: 0 }]}>{l('CONSULTAR', 'REFERENCE')}</Text>
          <TouchableOpacity style={s.pdfBtn} activeOpacity={0.8} onPress={openPdf} hitSlop={{ top: 9, bottom: 9, left: 6, right: 6 }}>
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
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.bold, marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  subGroup: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.sub, fontFamily: FONT.semibold, marginTop: SPACE.md, marginBottom: 8, marginLeft: 2 },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },
  sec: { fontFamily: FONT.heavy, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.sub, marginTop: 2, marginBottom: 11, marginLeft: 2 },
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
