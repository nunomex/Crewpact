import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
import PrimaryButton from '../components/PrimaryButton';
import GhostButton from '../components/GhostButton';
import { buildTodayItems, hasAnyData } from './hojeItems';
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

  // Estilo D ("atual" — cartão todo pintado): CADA cartão ganha o tom suave do seu estado (verde
  // greenSoft / âmbar warnSoft / vermelho redSoft / neutro soft2) com o PONTO e o TÍTULO a cor.
  // Forte e legível — com tudo ok fica "muito colorido". A resposta a tinta, exceto perigo.
  const cardBg = (st) => (st === 'bad' ? C.redSoft : st === 'warn' ? C.warnSoft : st === 'ok' ? C.greenSoft : C.soft2);
  const dotColor = (st) => (st === 'ok' ? C.green : st === 'warn' ? C.warn : st === 'bad' ? C.red : st === 'info' ? C.ink : C.lineStrong);
  const titleColor = (st) => (st === 'ok' ? C.greenText : st === 'warn' ? C.warnText : st === 'bad' ? C.redText : C.sub);
  const ansColor = (st) => (st === 'bad' ? C.redText : null);

  const ctx = {
    ftlSnap: ctxAll.ftlSnap, dayLog: ctxAll.dayLog, duties: ctxAll.duties, rosterChanges: ctxAll.rosterChanges,
    ae: ctxAll.ae, crewCategory: ctxAll.crewCategory, crewContract: ctxAll.crewContract, aeExtras: ctxAll.aeExtras,
    validities: ctxAll.validities, isPilot: ctxAll.isPilot, todayISO: isoDay(),
  };
  const items = buildTodayItems(ctx, lang);
  const hasData = hasAnyData(ctx);
  const goEscala = (params) => { select(); navigation.navigate('Escala', { screen: 'EscalaMain', params }); };

  const crewWord = isPilot ? l('Piloto', 'Pilot') : l('Cabine', 'Cabin');
  const opEyebrow = [company?.name, ae ? 'AE' : 'FTL', crewWord].filter(Boolean).join(' · ').toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <PageHeader eyebrow={opEyebrow} title={l('Briefing', 'Briefing')} right={<NotificationsBell />} />
        <Text style={s.intro}>{l('As respostas que precisas, num relance. Toca para ver o porquê.', 'The answers you need, at a glance. Tap to see why.')}</Text>

        {!hasData ? (
          <Animated.View style={seg(1)}>
            <View style={s.card}>
              <Text style={s.emptyEye}>{l('COMEÇAR', 'GET STARTED')}</Text>
              <Text style={s.emptyTitle}>{l('Vamos pôr a tua escala aqui', 'Let’s get your roster in')}</Text>
              <Text style={s.emptySub}>{l('Com a tua escala, isto ganha vida: estado FTL, salário e o teu próximo voo — num relance.', 'With your roster, this comes alive: FTL status, pay and your next flight — at a glance.')}</Text>
              <PrimaryButton tone="danger" onPress={() => goEscala({ review: Date.now() })} icon="download-outline" label={l('Importar escala', 'Import roster')} />
              <GhostButton onPress={() => goEscala({ newDuty: Date.now() })} icon="add" label={l('Adicionar serviço', 'Add a duty')} style={{ marginTop: 10 }} />
            </View>
          </Animated.View>
        ) : items.map((it, i) => (
          <Animated.View key={it.id} style={seg(i + 1)}>
            <TouchableOpacity activeOpacity={0.9} style={[s.card, { backgroundColor: cardBg(it.status) }]} onPress={() => { select(); navigation.navigate('HojeDetail', { id: it.id }); }}>
              <View style={s.cardHead}>
                <View style={[s.dot, { backgroundColor: dotColor(it.status) }]} />
                <Text style={[s.q, { color: titleColor(it.status) }]} numberOfLines={1}>{it.q}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.sub} />
              </View>
              <Text style={[s.answer, ansColor(it.status) ? { color: ansColor(it.status) } : null]}>{it.answer}</Text>
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
    backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 16, marginBottom: 11,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  dot: { width: 8, height: 8, borderRadius: 99, flexShrink: 0 },
  q: { flex: 1, fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.9, textTransform: 'uppercase', color: C.sub },
  answer: { fontSize: 19, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, lineHeight: 25 },
  sug: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 11, marginTop: 12 },
  sugTxt: { flex: 1, fontSize: TYPE.label, fontFamily: FONT.medium, color: C.sub, lineHeight: 18 },

  // Empty-state de 1º uso (sem escala): cartão acolhedor + ações.
  emptyEye: { fontSize: TYPE.eyebrow, fontFamily: FONT.heavy, letterSpacing: 1.3, textTransform: 'uppercase', color: C.info, marginBottom: 8 },
  emptyTitle: { fontSize: 21, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, lineHeight: 27 },
  emptySub: { fontSize: TYPE.sub, fontFamily: FONT.medium, color: C.sub, lineHeight: 20, marginTop: 8, marginBottom: 16 },

  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
});
