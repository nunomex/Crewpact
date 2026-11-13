// B11 · O SELETOR COM PÍLULA DESLIZANTE (design-system §14, 2026-11-13; escolha 2B do Nuno em design/escala-acertos.html,
// das imagens 3412, 3434 e 3456): uma cápsula com as opções escritas e a escolhida numa pílula a tinta, que desliza (M4:
// 220 ms, out(cubic); com movimentos reduzidos, salta). Primeiro uso: "Lista | Mês" no topo da folha da Escala.
// Acessibilidade: uma lista de separadores (tablist), cada opção um separador com o estado "escolhido".
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { TXT3, SPACE, RADIUS } from '../data/constants';

export default function Segmented({ options, value, onChange, C, reduce }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const each = w ? w / options.length : 0;
  useEffect(() => {
    const to = idx * each;
    if (reduce || !each) { x.setValue(to); return; }
    Animated.timing(x, { toValue: to, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [idx, each, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[s.wrap, { backgroundColor: C.neutral }]} onLayout={(e) => setW(e.nativeEvent.layout.width - SPACE.xs * 2)} accessibilityRole="tablist">
      {each ? <Animated.View style={[s.pill, { width: each, backgroundColor: C.ink, transform: [{ translateX: x }] }]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity key={o.value} style={s.opt} onPress={() => { if (!on) onChange(o.value); }} activeOpacity={0.8}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={o.label}>
            <Text style={[TXT3.pill, { color: on ? C.sheet : C.tabSub }]} allowFontScaling={false}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', height: 44, borderRadius: RADIUS.pill, padding: SPACE.xs },
  pill: { position: 'absolute', top: SPACE.xs, bottom: SPACE.xs, left: SPACE.xs, borderRadius: RADIUS.pill },
  opt: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill },
});
