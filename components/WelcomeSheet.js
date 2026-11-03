// BOAS-VINDAS — 1 ecrã, UMA vez na vida, no fim do funil de entrada. 2026-11-03: passou para a PORTA
// (placa de tinta + folha), como a entrada e a configuração — é o último ecrã antes da app (cobre o ecrã
// inteiro, sem barra de abas). Conteúdo do mockup aprovado (design/boas-vindas.html, 2026-07-10): vende
// o que a app FAZ, em 4 linhas, zero bonecos, SEM tour de passos (a Apple não faz; a maioria salta).
// Mudou: ícones da casa no lugar dos números 01–04 (não são passos de uma sequência, e o amarelo sobre
// papel lia-se mal, 1,7:1) · "Bem-vindo, <nome>" · botão principal da app · texto na escala.
// Só nasce do FUNIL (flag 'pending' gravada no fim da configuração); Começar (ou fechar) marca 'seen'.
import React, { useContext, useRef, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Porta, { portaTxt as P } from './Porta';
import PrimaryButton from './PrimaryButton';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { PELE, TXT, SPACE } from '../data/constants';
import useReduceMotion from '../hooks/useReduceMotion';

export default function WelcomeSheet({ visible, onDone, lang = 'pt' }) {
  const { user } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const reduce = useReduceMotion();
  const op = useRef(new Animated.Value(0)).current;
  const [closing, setClosing] = useState(false);

  // Driver JS de propósito (lição do device 2026-11-02): uma transparência nativa que começa em 0
  // pode ficar presa e deixar o ecrã em branco.
  useEffect(() => {
    if (!visible) { setClosing(false); return; }
    if (reduce) { op.setValue(1); return; }
    op.setValue(0);
    Animated.timing(op, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [visible, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (closing) return;
    setClosing(true);
    if (reduce) { onDone && onDone(); return; }
    Animated.timing(op, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => onDone && onDone());
  };

  if (!visible) return null;

  const first = String(user?.name || '').trim().split(/\s+/)[0] || '';
  const ROWS = [
    { icon: 'gauge', t: l('Os limites, calculados', 'Your limits, computed'),
      p: l('Os limites FTL da lei europeia, verificados ao minuto: sabes sempre se estás dentro deles e até que horas.', 'EU-law FTL limits, checked to the minute: you always know if you are within them, and until when.') },
    { icon: 'wallet', t: l('O salário, pelo teu acordo', 'Your pay, by your agreement'),
      p: l('Ajudas de custo, pernoitas e extras pelo AE da tua companhia, ao cêntimo.', 'Per diems, night stops and extras by your airline’s agreement, to the cent.') },
    { icon: 'home', t: l('Um Início que vive o teu dia', 'A Home that lives your day'),
      p: l('Folga, véspera, voo, pernoita: a primeira página muda sozinha com a escala.', 'Day off, eve, flight, night stop: the first page changes with your roster.') },
    { icon: 'plus', t: l('Cria com o +', 'Create with +'),
      p: l('Serviços, simulações e eventos nascem no botão do meio.', 'Duties, simulations and events start from the middle button.') },
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[s.full, { opacity: op }]}>
        {/* Faixa, não meia placa (device 2026-11-03): com 4 linhas, a placa a meio cortava a 4.ª atrás do botão. */}
        <Porta plate="band" footer={<PrimaryButton label={l('Começar', 'Get started')} onPress={close} />}>
          <Text style={P.title} accessibilityRole="header">
            {first ? l(`Bem-vindo, ${first}`, `Welcome, ${first}`) : l('Bem-vindo à CrewPact', 'Welcome to CrewPact')}
          </Text>
          <Text style={[P.body, s.lead]}>{l('A app que sabe o teu dia de trabalho.', 'The app that knows your working day.')}</Text>
          {ROWS.map((r, i) => (
            <View key={r.icon} style={[s.row, i === ROWS.length - 1 && s.rowLast]}>
              <View style={s.tile}><Icon name={r.icon} size={18} color={PELE.ink} /></View>
              <View style={s.rowTxt}>
                <Text style={s.rowT}>{r.t}</Text>
                <Text style={s.rowP}>{r.p}</Text>
              </View>
            </View>
          ))}
        </Porta>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  full:    { flex: 1, backgroundColor: PELE.ink },
  lead:    { marginBottom: SPACE.lg },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: PELE.line },
  rowLast: { borderBottomWidth: 0 },
  tile:    { width: 36, height: 36, borderRadius: 999, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  rowTxt:  { flex: 1 },
  rowT:    { ...TXT.callout, color: PELE.ink },
  rowP:    { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.xxs },
});
