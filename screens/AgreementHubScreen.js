import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, TYPE, companyContent } from '../data/constants';
import ScreenHeader from '../components/ScreenHeader';
import Eyebrow from '../components/Eyebrow';
import { t } from '../data/i18n';
import { AppContext } from '../App';

const CARDS = [
  { id: 'ae',  route: 'List', code: { pt: 'AE', en: 'CLA' }, eyebrow: 'hub.aeEyebrow', title: 'hub.aeTitle', sub: 'hub.aeSub', icon: 'document-text-outline' },
  { id: 'ftl', route: 'Ftl',  code: { pt: 'FTL', en: 'FTL' }, eyebrow: 'hub.ftEyebrow', title: 'hub.ftTitle', sub: 'hub.ftSub', icon: 'time-outline' },
];

export default function AgreementHubScreen({ navigation }) {
  const { lang, profile } = useContext(AppContext);
  // Mostra só o conteúdo disponível para a companhia (AE ou FTL).
  const content = companyContent(profile.company);
  const cards = CARDS.filter(c => (content === 'ftl' ? c.id === 'ftl' : c.id === 'ae'));
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader eyebrow={t('hub.eyebrow', lang)} title={t('hub.title', lang)} />

      <View style={s.cards}>
        {cards.map(c => (
          <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.85} onPress={() => navigation.navigate(c.route)}>
            <View style={s.cardTop}>
              <View style={s.cardIcon}><Ionicons name={c.icon} size={24} color="#fff" /></View>
              <View style={s.codeBadge}><Text style={s.codeTxt}>{c.code[lang] ?? c.code.pt}</Text></View>
            </View>
            <Eyebrow style={{ marginBottom: 4 }}>{t(c.eyebrow, lang)}</Eyebrow>
            <Text style={s.cardTitle}>{t(c.title, lang)}</Text>
            <Text style={s.cardSub}>{t(c.sub, lang)}</Text>
            <View style={s.cardArrow}>
              <Text style={s.cardArrowTxt}>{t('common.open', lang)}</Text>
              <Ionicons name="arrow-forward" size={16} color={C.ink} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  cards: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18, backgroundColor: C.canvas },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  codeBadge: { backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeTxt: { color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 },
  cardTitle: { fontSize: TYPE.heading, fontWeight: '600', color: C.text, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 18 },
  cardArrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  cardArrowTxt: { fontSize: 13, fontWeight: '600', color: C.ink },
});
