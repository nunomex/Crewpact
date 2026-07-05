// Folha inferior (bottom sheet) da PELE nova — reutilizável.
// ABRIR: desliza de baixo + scrim esbate.  FECHAR: desliza para baixo + scrim apaga
// (mantém-se montada durante a saída via estado `shown`).  ARRASTAR para baixo ou TOCAR
// no scrim fecha. Tudo JS-driven (useNativeDriver:false) — o arrasto usa setValue, e misturar
// com native-driver bloqueava o gesto/animação. Suave que chegue para uma folha.
import React, { useRef, useEffect, useState } from 'react';
import { Modal, View, TouchableWithoutFeedback, Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { PELE as P } from '../data/constants';

const OUT = Dimensions.get('window').height;

export default function PeleSheet({ visible, onClose, children }) {
  const ty = useRef(new Animated.Value(OUT)).current;   // translateY: OUT = fora do ecrã (baixo)
  const op = useRef(new Animated.Value(0)).current;      // opacidade do scrim
  const [shown, setShown] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShown(true);
      ty.setValue(OUT); op.setValue(0);
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.spring(ty, { toValue: 0, speed: 16, bounciness: 3, useNativeDriver: false }),
      ]).start();
    } else if (shown) {
      Animated.parallel([
        Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(ty, { toValue: OUT, duration: 240, useNativeDriver: false }),
      ]).start(() => setShown(false));
    }
  }, [visible]);   // eslint-disable-line react-hooks/exhaustive-deps

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
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.scrim, { opacity: op }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[s.sheet, { transform: [{ translateY: ty }] }]}>
        <View style={s.grabArea} {...pan.panHandlers}><View style={s.grab} /></View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,8,0.42)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: P.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 30 },
  grabArea: { alignItems: 'center', paddingBottom: 14 },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: P.line },
});
