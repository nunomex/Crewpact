import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RADIUS, SPACE, FONT } from '../data/constants';
import { useTheme } from '../data/appContext';

// Cabeçalho claro do mockup (substitui o ScreenHeader blob preto): eyebrow do
// operador/módulo com ponto vermelho + título display, e um slot opcional à
// direita (sino, badge). Pensado para viver DENTRO do ScrollView do ecrã.
export default function PageHeader({ eyebrow, title, right, titleLines }) {
  const C = useTheme();
  const s = makeStyles(C);
  return (
    <View>
      <View style={s.htop}>
        <View style={s.hlw}>
          <View style={s.hrd} />
          {eyebrow ? <Text style={s.hl} numberOfLines={1}>{eyebrow}</Text> : null}
        </View>
        {right || null}
      </View>
      {title ? <Text style={s.ht} numberOfLines={titleLines}>{title}</Text> : null}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  htop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  hlw: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  hrd: { width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.red },
  hl: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 1.3, color: C.sub, textTransform: 'uppercase', flexShrink: 1 },
  ht: { fontSize: 28, fontFamily: FONT.heavy, letterSpacing: -0.6, color: C.text, lineHeight: 30, marginBottom: SPACE.lg },
});
