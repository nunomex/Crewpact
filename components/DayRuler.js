// B3 · A RÉGUA DAS 24 H (design-system §14, 2026-11-13; esboço design/escala-cartoes.html). Só desenha o que
// data/escalaDay.js · dayRuler decidiu: os blocos (serviço na cor do tipo · repouso fora da base a salva), a faixa da WOCL
// (só quando o motor a dá para esse dia) com a sua linha de baixo, a hora a que acaba um serviço que passa a meia-noite e o
// "agora" (só hoje). Referências: Fi (a faixa clara de 00 a 24 com as marcas) e The Weather Channel (o ponto do agora).
// Acessibilidade: a régua é uma imagem com uma descrição (as horas dizem-se nos cartões por baixo).
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TXT, SPACE, RADIUS } from '../data/constants';

const HATCH = 7;   // traços da WOCL: um a cada 7 pt

export default function DayRuler({ ruler, C, label }) {
  const [w, setW] = useState(0);
  if (!ruler || (!ruler.blocks.length && !ruler.wocl)) return null;
  const x = (min) => (min / 1440) * w;
  const tone = (c) => (c === 'flight' ? C.flight : c === 'ground' ? C.ground : c === 'rest' ? C.rest : C.neutral);
  const wl = ruler.wocl ? x(ruler.wocl.a) : 0, ww = ruler.wocl ? x(ruler.wocl.b) - wl : 0;
  return (
    <View style={s.wrap} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={[s.track, { backgroundColor: C.neutral }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w ? (
          <>
            {ruler.wocl ? (
              <View style={[s.wocl, { left: wl, width: ww }]}>
                {Array.from({ length: Math.ceil((ww + 24) / HATCH) }).map((_, i) => (
                  <View key={`h${i}`} style={[s.hatch, { left: i * HATCH - 12, backgroundColor: C.round }]} />
                ))}
              </View>
            ) : null}
            {ruler.blocks.map((b, i) => (
              <View key={`b${i}`} style={[s.block, { left: x(b.a), width: Math.max(2, x(b.b) - x(b.a)), backgroundColor: tone(b.color) },
                b.color === 'rest' ? s.rest : null, b.toEnd ? s.toEnd : null, b.fromStart ? s.fromStart : null]} />
            ))}
            {ruler.now != null ? <View style={[s.now, { left: x(ruler.now) - 1, backgroundColor: C.ink }]} /> : null}
          </>
        ) : null}
      </View>
      <View style={s.ticks}>
        {['00', '06', '12', '18', '24'].map((t) => <Text key={t} style={[TXT.caption, s.tick, { color: C.caption }]} allowFontScaling={false}>{t}</Text>)}
      </View>
      {ruler.wocl ? <Text style={[TXT.caption, { color: C.caption }]} numberOfLines={2}>{ruler.wocl.note}</Text> : null}
      {ruler.endNote ? <Text style={[TXT.caption, { color: C.caption }]} numberOfLines={1}>{ruler.endNote}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: SPACE.xs, paddingHorizontal: SPACE.xs },
  track: { height: 20, borderRadius: RADIUS.xs, overflow: 'hidden' },
  block: { position: 'absolute', top: 0, bottom: 0, borderRadius: RADIUS.xs },
  rest: { opacity: 0.75 },
  toEnd: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  fromStart: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  wocl: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  hatch: { position: 'absolute', top: -10, width: 2, height: 40, transform: [{ rotate: '45deg' }] },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { fontVariant: ['tabular-nums'] },
});
