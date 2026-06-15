import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { FTL_ARTICLES } from '../data/ftl';
import { openFtlPdf } from '../data/ftlPdf';
import { t, tx } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext } from '../App';

const hasCalc = (a) => !!(a.psv || a.limits || a.rest);

// Aba FTL — consulta dos artigos calculáveis (sem pesquisa) + link para o PDF.
// As calculadoras interativas vivem no separador Cálculos.
export default function FtlScreen({ navigation }) {
  const { lang } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const articles = FTL_ARTICLES.filter(hasCalc);

  const openPdf = async () => {
    select();
    const ok = await openFtlPdf();
    if (!ok) Alert.alert(t('ftl.pdfTitle', lang), t('ftl.pdfError', lang));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('ftl.eyebrow', lang)} title={t('ftl.title', lang)}
        onBack={() => navigation.goBack()} backLabel={t('common.back', lang)}
        right={<View style={s.regBadge}><Text style={s.regTxt}>UE 83/2014</Text></View>} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabSpace, paddingTop: 4 }}>
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

        <Text style={s.group}>{t('ftl.consultTitle', lang)}</Text>

        {articles.map(a => (
          <TouchableOpacity key={a.code} style={s.card} activeOpacity={0.8}
            onPress={() => navigation.navigate('FtlDetail', { code: a.code })}>
            <View style={s.badge}><Text style={s.badgeTxt}>{a.code.replace('ORO.FTL.', '')}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={2}>{tx(a.title, lang)}</Text>
              <Text style={s.cardSub} numberOfLines={2}>{tx(a.sub, lang)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.line} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  regBadge: { backgroundColor: C.hairlineOnDark, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  regTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace', fontWeight: '700' },
  pdfRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, backgroundColor: C.soft },
  pdfIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  pdfTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text },
  pdfSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingHorizontal: 2, marginTop: SPACE.md },
  noteTxt: { flex: 1, fontSize: TYPE.micro, color: C.sub, lineHeight: 17 },
  group: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginTop: SPACE.lg, marginBottom: 10, marginLeft: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.canvas },
  badge: { minWidth: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  cardTitle: { fontSize: TYPE.body, fontWeight: '600', color: C.text, lineHeight: 19 },
  cardSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, lineHeight: 16 },
});
