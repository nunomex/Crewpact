// Rótulo lateral rodado da PELE — um dos dois elementos obrigatórios em toda a página
// (o outro é o FANTASMA). Texto vertical FIXO na margem direita (não faz scroll), ink com
// um segmento a amarelo. Renderiza-se DENTRO do SafeAreaView do ecrã (fora do ScrollView),
// como irmão absoluto. Usa `transformOrigin` (RN ≥0.76) p/ rodar como o CSS do mockup.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PELE as P, PELE_FONT as F } from '../data/constants';

export default function PeleSide({ label, accent, color, top = 344 }) {
  // `color` opcional: tema NOTURNO da Living Interface passa o ink claro (o amarelo fica).
  // GEOMETRIA (bug 2026-07-09): com transformOrigin right-top + rotate 90°, o texto estende-se
  // PARA CIMA da âncora → o `top` fixava o FIM do rótulo e o INÍCIO variava com o comprimento
  // (rótulos curtos começavam mais abaixo — nunca alinhava entre ecrãs). CURA: wrap de LARGURA
  // FIXA (320) + texto alinhado ao início → o início fica SEMPRE em (top − 320) = 24, igual em
  // todos os ecrãs; o comprimento cresce para baixo. REGRA: fixo e alinhado, sem top por ecrã.
  return (
    <View style={[s.wrap, { top }]} pointerEvents="none">
      <Text style={[s.txt, color ? { color } : null]} numberOfLines={1} allowFontScaling={false}>
        {label}{accent ? <Text style={s.y}>{' · ' + accent}</Text> : null}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', right: 9, width: 320, zIndex: 5,   // largura FIXA = início invariante
    transform: [{ rotate: '90deg' }], transformOrigin: 'right top',
  },
  txt: { fontFamily: F.bodyHeavy, fontSize: 10, letterSpacing: 3, color: P.ink, textAlign: 'left' },
  y: { color: P.yellow },
});
