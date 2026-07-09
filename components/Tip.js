// DICA contextual (padrão iOS-Tips; mockup design/boas-vindas.html, aprovado
// 2026-07-10) — balão INK que APONTA, não tranca: a página por baixo continua viva
// (o ecrã hospedeiro chama onDismiss no onTouchStart da raiz → morre a QUALQUER
// toque). Regra global: UMA dica visível na app inteira; cada uma aparece 1× na
// vida (flag por utilizador, gravada pelo hospedeiro ao dispensar).
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { PELE, PELE_FONT } from '../data/constants';
import useReduceMotion from '../hooks/useReduceMotion';

export default function Tip({ visible, bold, tail, onDismiss, style, arrow = 'down', lang = 'pt' }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) { v.setValue(0); return; }
    if (reduce) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  return (
    <Animated.View pointerEvents="box-none" style={[s.wrap, style, { opacity: v, transform: [{ scale }] }]}>
      {arrow === 'up' ? <View style={[s.tri, s.triUp]} /> : null}
      <TouchableOpacity activeOpacity={0.9} onPress={onDismiss} accessibilityRole="button"
        accessibilityLabel={`${bold} ${tail}`}
        accessibilityHint={lang === 'en' ? 'Tap to dismiss' : 'Toca para dispensar'}>
        <View style={s.card}>
          <Text style={s.tx} maxFontSizeMultiplier={1.3}>
            <Text style={s.bold}>{bold}</Text> {tail}
          </Text>
          <Text style={s.ok}>{lang === 'en' ? 'TAP TO DISMISS' : 'TOCA PARA DISPENSAR'}</Text>
        </View>
      </TouchableOpacity>
      {arrow === 'down' ? <View style={[s.tri, s.triDown]} /> : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center', alignItems: 'center', zIndex: 30 },
  card: { backgroundColor: PELE.ink, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, maxWidth: 240,
    shadowColor: '#14161A', shadowOpacity: 0.25, shadowRadius: 13, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  tx: { fontSize: 11.5, fontFamily: PELE_FONT.body, color: PELE.paper, lineHeight: 17 },
  bold: { fontFamily: PELE_FONT.bodyHeavy, color: PELE.yellow },
  ok: { fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 7 },
  tri: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  triDown: { borderTopWidth: 7, borderTopColor: PELE.ink },
  triUp: { borderBottomWidth: 7, borderBottomColor: PELE.ink },
});
