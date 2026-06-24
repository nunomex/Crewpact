import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useEnter from '../hooks/useEnter';
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

  // Estilo D2 ("faixa lateral"): cartão neutro (soft2) com uma risca de cor à
  // esquerda pelo estado. A risca substitui o ponto — verde/âmbar/vermelho saltam.
  const stripeColor = (st) => (st === 'ok' ? C.green : st === 'warn' ? C.warn : st === 'bad' ? C.red : st === 'info' ? C.info : C.lineStrong);
  // Reforço do estado crítico: fundo de alerta MUITO leve só em bad/warn; resto fica neutro
  // (soft2) para o vermelho saltar. Texto da resposta usa o tom acessível por estado.
  const cardBg = (st) => (st === 'bad' ? C.redSoft : st === 'warn' ? C.warnSoft : C.soft2);
  const ansColor = (st) => (st === 'bad' ? C.redText : st === 'warn' ? C.warnText : null);

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
            <View style={[s.card, { borderLeftColor: C.info }]}>
              <Text style={s.emptyEye}>{l('COMEÇAR', 'GET STARTED')}</Text>
              <Text style={s.emptyTitle}>{l('Vamos pôr a tua escala aqui', 'Let’s get your roster in')}</Text>
              <Text style={s.emptySub}>{l('Com a tua escala, isto ganha vida: estado FTL, salário e o teu próximo voo — num relance.', 'With your roster, this comes alive: FTL status, pay and your next flight — at a glance.')}</Text>
              <TouchableOpacity activeOpacity={0.9} style={s.emptyBtnPri} onPress={() => goEscala({ review: Date.now() })}>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={s.emptyBtnPriTxt}>{l('Importar escala', 'Import roster')}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={s.emptyBtnSec} onPress={() => goEscala({ newDuty: Date.now() })}>
                <Ionicons name="add" size={18} color={C.text} />
                <Text style={s.emptyBtnSecTxt}>{l('Adicionar serviço', 'Add a duty')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : items.map((it, i) => (
          <Animated.View key={it.id} style={seg(i + 1)}>
            <TouchableOpacity activeOpacity={0.9} style={[s.card, { backgroundColor: cardBg(it.status), borderLeftColor: stripeColor(it.status) }]} onPress={() => { select(); navigation.navigate('HojeDetail', { id: it.id }); }}>
              <View style={s.cardHead}>
                <Text style={s.q} numberOfLines={1}>{it.q}</Text>
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
    backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderRadius: 20, padding: 16, paddingLeft: 13, marginBottom: 11,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  q: { flex: 1, fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.9, textTransform: 'uppercase', color: C.sub },
  answer: { fontSize: 19, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, lineHeight: 25 },
  sug: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.soft, borderRadius: RADIUS.md, padding: 11, marginTop: 12 },
  sugTxt: { flex: 1, fontSize: TYPE.label, fontFamily: FONT.medium, color: C.sub, lineHeight: 18 },

  // Empty-state de 1º uso (sem escala): cartão acolhedor + ações.
  emptyEye: { fontSize: TYPE.eyebrow, fontFamily: FONT.heavy, letterSpacing: 1.3, textTransform: 'uppercase', color: C.info, marginBottom: 8 },
  emptyTitle: { fontSize: 21, fontFamily: FONT.semibold, letterSpacing: -0.3, color: C.text, lineHeight: 27 },
  emptySub: { fontSize: TYPE.sub, fontFamily: FONT.medium, color: C.sub, lineHeight: 20, marginTop: 8, marginBottom: 16 },
  emptyBtnPri: { flexDirection: 'row', gap: 8, backgroundColor: C.red, borderRadius: RADIUS.pill, height: 50, alignItems: 'center', justifyContent: 'center' },
  emptyBtnPriTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.bold, letterSpacing: 0.3 },
  emptyBtnSec: { flexDirection: 'row', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  emptyBtnSecTxt: { color: C.text, fontSize: TYPE.body, fontFamily: FONT.semibold },

  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
});
