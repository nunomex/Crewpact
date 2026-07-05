// Rótulo lateral rodado da PELE — um dos dois elementos obrigatórios em toda a página
// (o outro é o FANTASMA). Texto vertical FIXO na margem direita (não faz scroll), ink com
// um segmento a amarelo. Renderiza-se DENTRO do SafeAreaView do ecrã (fora do ScrollView),
// como irmão absoluto. Usa `transformOrigin` (RN ≥0.76) p/ rodar como o CSS do mockup.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PELE as P, PELE_FONT as F } from '../data/constants';

export default function PeleSide({ label, accent }) {
  return (
    <View style={s.wrap} pointerEvents="none">
      <Text style={s.txt} numberOfLines={1} allowFontScaling={false}>
        {label}{accent ? <Text style={s.y}>{' · ' + accent}</Text> : null}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute', right: 9, top: 195, zIndex: 5,
    transform: [{ rotate: '90deg' }], transformOrigin: 'right top',
  },
  txt: { fontFamily: F.bodyHeavy, fontSize: 10, letterSpacing: 3, color: P.ink },
  y: { color: P.yellow },
});
