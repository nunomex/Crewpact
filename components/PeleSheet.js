// Folha inferior (bottom sheet) da PELE nova — reutilizável.
// ABRIR: desliza de baixo + scrim esbate.  FECHAR: desliza para baixo + scrim apaga
// (mantém-se montada durante a saída via estado `shown`).  ARRASTAR para baixo ou TOCAR
// no scrim fecha. Tudo JS-driven (useNativeDriver:false) — o arrasto usa setValue, e misturar
// com native-driver bloqueava o gesto/animação. Suave que chegue para uma folha.
import React, { useRef, useEffect, useState } from 'react';
import { Modal, View, Pressable, Animated, PanResponder, StyleSheet, Dimensions, Keyboard, Platform } from 'react-native';
import { PELE as P } from '../data/constants';
import useReduceMotion from '../hooks/useReduceMotion';

const OUT = Dimensions.get('window').height;

export default function PeleSheet({ visible, onClose, children }) {
  const reduce = useReduceMotion();                       // RM: fade sem deslocação (o arrasto mantém-se — é gesto)
  const ty = useRef(new Animated.Value(OUT)).current;   // translateY: OUT = fora do ecrã (baixo)
  const op = useRef(new Animated.Value(0)).current;      // opacidade do scrim (e da folha em reduce-motion)
  const kb = useRef(new Animated.Value(0)).current;      // levanta a folha acima do teclado (forms)
  const [shown, setShown] = useState(visible);
  const [kbOpen, setKbOpen] = useState(false);           // teclado aberto? (scrim fecha o teclado, não a folha)

  useEffect(() => {
    if (visible) {
      setShown(true);
      ty.setValue(reduce ? 0 : OUT); op.setValue(0);
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: false }),
        ...(reduce ? [] : [Animated.spring(ty, { toValue: 0, speed: 16, bounciness: 3, useNativeDriver: false })]),
      ]).start();
    } else if (shown) {
      Animated.parallel([
        Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: false }),
        ...(reduce ? [] : [Animated.timing(ty, { toValue: OUT, duration: 240, useNativeDriver: false })]),
      ]).start(() => setShown(false));
    }
  }, [visible]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Formulários com inputs (ex.: Extra do mês): levanta a folha para o teclado não a tapar.
  // Inócuo nas folhas sem inputs (o teclado nunca abre → kb fica 0).
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e) => { setKbOpen(true); Animated.timing(kb, { toValue: -((e.endCoordinates && e.endCoordinates.height) || 0), duration: 220, useNativeDriver: false }).start(); });
    const s2 = Keyboard.addListener(hideEvt, () => { setKbOpen(false); Animated.timing(kb, { toValue: 0, duration: 200, useNativeDriver: false }).start(); });
    return () => { s1.remove(); s2.remove(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
      onPanResponderMove: (_, g) => { if (g.dy > 0) { ty.setValue(g.dy); op.setValue(Math.max(0, 1 - g.dy / 420)); } },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90) { onClose && onClose(); }   // dispara a saída animada (efeito acima)
        else Animated.parallel([
          Animated.spring(ty, { toValue: 0, bounciness: 5, useNativeDriver: false }),
          Animated.timing(op, { toValue: 1, duration: 140, useNativeDriver: false }),
        ]).start();
      },
      onPanResponderTerminate: () => Animated.spring(ty, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;

  if (!shown) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
     <View style={s.root}>
      {/* SCRIM = filho NORMAL com flex:1, nunca absoluteFill (device 2026-09-03, RN 0.86/Fabric):
          com top:0+bottom:0 o Yoga resolvia a LARGURA mas a ALTURA ficava 0 → o scrim era
          invisível ao hit-test e tocar fora não fechava (o escuro que se via era a própria folha
          do Modal). A altura por flex resolve-se no mesmo passe que a do root. A folha continua
          absoluta ancorada ao FUNDO (bottom:0 sem top mede bem). O toque vive num Pressable
          DENTRO do Animated.View (padrão da speed-dial). Teclado aberto → fecha o teclado, não a folha. */}
      <Animated.View style={[s.scrim, { opacity: op }]}>
        <Pressable style={s.scrimHit} onPress={() => { if (kbOpen) { Keyboard.dismiss(); } else if (onClose) { onClose(); } }}
          accessibilityRole="button" accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View style={[s.sheet, { transform: [{ translateY: Animated.add(ty, kb) }] }, reduce && { opacity: op }]}>
        <View style={s.grabArea} {...pan.panHandlers}><View style={s.grab} /></View>
        {children}
      </Animated.View>
     </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(10,10,8,0.42)' },   // NÃO absoluteFill — ver comentário no render
  scrimHit: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: P.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 30 },
  // Zona de arrasto = 44 pt de alto (mínimo Apple), SEM mexer na geometria visível: os paddings
  // extra são anulados por margens negativas (2026-09-03, device: "só fecha na pega" — a pega
  // tinha 18 pt de área útil). O traço fica onde estava.
  grabArea: { alignItems: 'center', paddingTop: 14, marginTop: -14, paddingBottom: 26, marginBottom: -12 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: P.line },
});
