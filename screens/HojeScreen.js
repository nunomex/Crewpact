import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import { buildTodayItems } from './hojeItems';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';

// "Hoje" — as respostas que um tripulante quer AO ENTRAR, em blocos pergunta→resposta.
// Tocar num cartão abre o DETALHE (HojeDetail) dentro da própria aba, a explicar o
// cálculo + a resposta. NÃO encaminha para outras abas. Tudo determinístico (sem LLM).
export default function HojeScreen({ navigation }) {
  const ctxAll = useContext(AppContext);
  const { lang, company, ae, isPilot } = ctxAll;
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const tabSpace = useTabBarSpace();
  const seg = useEnter();

  const dotColor = (st) => (st === 'ok' ? C.green : st === 'warn' ? C.warn : st === 'bad' ? C.red : st === 'info' ? C.info : C.sub);

  const ctx = {
    ftlSnap: ctxAll.ftlSnap, dayLog: ctxAll.dayLog, duties: ctxAll.duties, rosterChanges: ctxAll.rosterChanges,
    ae: ctxAll.ae, crewCategory: ctxAll.crewCategory, crewContract: ctxAll.crewContract, aeExtras: ctxAll.aeExtras,
    validities: ctxAll.validities, isPilot: ctxAll.isPilot, todayISO: isoDay(),
  };
  const items = buildTodayItems(ctx, lang);

  const crewWord = isPilot ? l('Piloto', 'Pilot') : l('Cabine', 'Cabin');
  const opEyebrow = [company?.name, ae ? 'AE' : 'FTL', crewWord].filter(Boolean).join(' · ').toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <PageHeader eyebrow={opEyebrow} title={l('Hoje', 'Today')} right={<NotificationsBell />} />
        <Text style={s.intro}>{l('As respostas que precisas, num relance. Toca para ver o porquê.', 'The answers you need, at a glance. Tap to see why.')}</Text>

        {items.map((it, i) => (
          <Animated.View key={it.id} style={seg(i + 1)}>
            <TouchableOpacity activeOpacity={0.9} style={s.card} onPress={() => { select(); navigation.navigate('HojeDetail', { id: it.id }); }}>
              <View style={s.cardHead}>
                <View style={[s.dot, { backgroundColor: dotColor(it.status) }]} />
                <Text style={s.q} numberOfLines={1}>{it.q}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.sub} />
              </View>
              <Text style={[s.answer, it.status === 'bad' ? { color: C.red } : null]}>{it.answer}</Text>
              {it.suggestion ? (
                <View style={s.sug}>
                  <Ionicons name="bulb-outline" size={14} color={C.sub} style={{ marginTop: 1 }} />
                  <Text style={s.sugTxt}>{it.suggestion}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </Animated.View>
        ))}

        <Text style={s.foot}>{t('common.ftlEstimate', lang)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { padding: SPACE.lg },
  intro: { fontSize: TYPE.sub, color: C.sub, lineHeight: 20, marginTop: -4, marginBottom: SPACE.md },

  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, marginBottom: 11,
    shadowColor: '#14161A', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 3,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  dot: { width: 9, height: 9, borderRadius: RADIUS.pill, flexShrink: 0 },
  q: { flex: 1, fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.9, textTransform: 'uppercase', color: C.sub },
  answer: { fontSize: 19, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, lineHeight: 25 },
  sug: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 11, marginTop: 12 },
  sugTxt: { flex: 1, fontSize: TYPE.label, fontFamily: FONT.medium, color: C.sub, lineHeight: 18 },

  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
});
