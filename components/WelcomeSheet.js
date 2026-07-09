// FOLHA DE BOAS-VINDAS — 1 ecrã, UMA vez na vida (mockup design/boas-vindas.html,
// aprovado 2026-07-10). Vende o que a app FAZ (não onde se clica): 4 linhas com
// numeração bento amarela, zero bonecos. Só nasce do FUNIL (a flag 'pending'
// grava-se no fim do onboarding — quem já tinha conta nunca a vê); COMEÇAR (ou o
// gesto de fechar) marca 'seen' para sempre. SEM tour de passos — decisão registada
// no mockup (a Apple não faz; a esmagadora maioria salta).
import React, { useRef, useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GUTTER, PELE, PELE_FONT } from '../data/constants';
import useReduceMotion from '../hooks/useReduceMotion';

export default function WelcomeSheet({ visible, onDone, lang = 'pt' }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const reduce = useReduceMotion();
  const op = useRef(new Animated.Value(0)).current;
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!visible) { setClosing(false); return; }
    if (reduce) { op.setValue(1); return; }
    op.setValue(0);
    Animated.timing(op, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (closing) return;
    setClosing(true);
    if (reduce) { onDone && onDone(); return; }
    Animated.timing(op, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onDone && onDone());
  };

  if (!visible) return null;

  const ROWS = [
    { t: l('A legalidade, calculada', 'Legality, computed'),
      p: l('Os limites FTL da lei europeia, verificados ao minuto — sabes sempre se estás legal.', 'EU-law FTL limits, checked to the minute — you always know you’re legal.') },
    { t: l('O salário, pelo teu acordo', 'Your pay, by your agreement'),
      p: l('Per-diems, pernoitas e extras pelo AE da tua companhia — cêntimo a cêntimo.', 'Per-diems, night stops and extras by your airline’s CLA — cent by cent.') },
    { t: l('Um Início que vive o teu dia', 'A Home that lives your day'),
      p: l('Folga, véspera, voo, pernoita — a primeira página muda sozinha com a escala.', 'Day off, eve, flight, night stop — the first page changes with your roster.') },
    { t: l('Cria com o ＋', 'Create with ＋'),
      p: l('Serviços, simulações e eventos nascem no botão do meio.', 'Duties, simulations and events are born in the middle button.') },
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[s.full, { opacity: op }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={s.eye}>FTL · AE · CREW</Text>
            <View style={s.rule} />
            <Text style={s.title} allowFontScaling={false}>
              <Text style={s.titleLt}>{l('BEM-VINDO AO', 'WELCOME TO')}{'\n'}</Text>
              <Text style={s.titleLt}>CREW</Text><Text style={s.titleHv}>PACT</Text>
            </Text>
            <Text style={s.sub}>{l('A app que sabe o teu dia de trabalho.', 'The app that knows your working day.')}</Text>
            <View style={s.rows}>
              {ROWS.map((r, i) => (
                <View key={i} style={[s.row, i === ROWS.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.num} allowFontScaling={false}>{`0${i + 1}`}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowT}>{r.t}</Text>
                    <Text style={s.rowP}>{r.p}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={close}
            accessibilityRole="button" accessibilityLabel={l('Começar', 'Get started')}>
            <Text style={s.btnTxt}>{l('COMEÇAR', 'GET STARTED')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, backgroundColor: PELE.paper },
  scroll: { paddingHorizontal: GUTTER + 8, paddingTop: 34, paddingBottom: 16 },
  eye: { fontSize: 9, fontFamily: PELE_FONT.body, letterSpacing: 4, color: PELE.grey, textTransform: 'uppercase', textAlign: 'center' },
  rule: { height: 3.5, width: 110, backgroundColor: PELE.yellow, alignSelf: 'center', marginTop: 9, marginBottom: 14 },
  title: { fontSize: 40, lineHeight: 40, letterSpacing: 0.5, color: PELE.ink, textAlign: 'center', textTransform: 'uppercase' },
  titleLt: { fontFamily: PELE_FONT.displayMed },
  titleHv: { fontFamily: PELE_FONT.displayHeavy },
  sub: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, textAlign: 'center', marginTop: 10 },
  rows: { marginTop: 26 },
  row: { flexDirection: 'row', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: PELE.line, alignItems: 'flex-start' },
  num: { fontFamily: PELE_FONT.display, fontSize: 20, color: PELE.yellow, minWidth: 30, lineHeight: 23 },
  rowT: { fontSize: 13.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, lineHeight: 17 },
  rowP: { fontSize: 11.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 17, marginTop: 2 },
  btn: { marginHorizontal: GUTTER + 8, marginBottom: 14, height: 56, borderRadius: 999, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },   // 56 = altura canónica do CTA (auditoria 2026-07-10)
  btnTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper, letterSpacing: 1 },
});
