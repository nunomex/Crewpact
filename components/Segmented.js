// B11 · O SELETOR COM PÍLULA DESLIZANTE (design-system §14, 2026-11-13; escolha 2B do Nuno em design/escala-acertos.html,
// das imagens 3412, 3434 e 3456): uma cápsula com as opções escritas e a escolhida numa pílula que desliza (M4: 220 ms,
// out(cubic); com movimentos reduzidos, salta). Usado em "Mostrar" na Escala (P3 de design/escala-legenda-5.html):
//   · tone 'ink' (a pílula a tinta, letra clara) · 'light' (a pílula branca com sombra, letra a tinta — o "Mostrar");
//   · columns: quantas opções por linha (com mais opções, parte em linhas e a pílula desliza também para baixo);
//   · option.lead: o que vai à frente do nome (o sinal do mês) · option.disabled: sem nada a mostrar (mais clara, não toca).
// Acessibilidade: uma lista de separadores (tablist), cada opção um separador com o estado "escolhido".
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { TXT3, SPACE, RADIUS, SHADOW } from '../data/constants';

const ROW = 36;   // a altura de cada linha (a cápsula de uma linha mede 44 com as margens)

export default function Segmented({ options, value, onChange, C, reduce, tone = 'ink', columns }) {
  const cols = Math.max(1, columns || options.length);
  const rows = Math.ceil(options.length / cols);
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const each = w ? w / cols : 0;
  const light = tone === 'light';
  useEffect(() => {
    const tx = (idx % cols) * each, ty = Math.floor(idx / cols) * ROW;
    if (reduce || !each) { x.setValue(tx); y.setValue(ty); return; }
    Animated.parallel([
      Animated.timing(x, { toValue: tx, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(y, { toValue: ty, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [idx, each, reduce, cols]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[s.wrap, { backgroundColor: C.neutral, height: rows * ROW + SPACE.xs * 2 }]} onLayout={(e) => setW(e.nativeEvent.layout.width - SPACE.xs * 2)} accessibilityRole="tablist">
      {each ? <Animated.View style={[s.pill, { width: each, backgroundColor: light ? C.sheet : C.ink, transform: [{ translateX: x }, { translateY: y }] }, light ? s.pillLight : null]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        const fg = on ? (light ? C.ink : C.sheet) : o.disabled ? C.caption : C.tabSub;
        return (
          <TouchableOpacity key={o.value} style={[s.opt, { width: each || `${100 / cols}%` }]} onPress={() => { if (!on && !o.disabled) onChange(o.value); }} activeOpacity={0.8}
            disabled={!!o.disabled} accessibilityRole="tab" accessibilityState={{ selected: on, disabled: !!o.disabled }} accessibilityLabel={o.a11y || o.label}>
            {o.lead ? <View style={o.disabled ? s.leadOff : null}>{o.lead}</View> : null}
            <Text style={[TXT3.pill, { color: fg }]} numberOfLines={1} allowFontScaling={false}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: RADIUS.xxl, padding: SPACE.xs },
  pill: { position: 'absolute', top: SPACE.xs, left: SPACE.xs, height: ROW, borderRadius: RADIUS.pill },
  pillLight: { ...SHADOW.sm, shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  opt: { height: ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, borderRadius: RADIUS.pill },
  leadOff: { opacity: 0.4 },
});
