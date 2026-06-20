import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, FONT } from '../data/constants';
import { useTheme } from '../data/appContext';

// Cabeçalho claro do mockup (substitui o ScreenHeader blob preto): eyebrow do
// operador/módulo com ponto vermelho + título display, e um slot opcional à
// direita (sino, badge). Pensado para viver DENTRO do ScrollView do ecrã.
// `onTitlePress` torna o título tocável (ex.: Escala → abrir o calendário do mês).
export default function PageHeader({ eyebrow, title, right, titleLines, onTitlePress }) {
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
      {title ? (
        onTitlePress
          ? <TouchableOpacity onPress={onTitlePress} activeOpacity={0.7} style={s.htRow}>
              <Text style={[s.ht, s.htRowText]} numberOfLines={titleLines}>{title}</Text>
              <Ionicons name="chevron-down" size={18} color={C.sub} style={s.htCaret} />
            </TouchableOpacity>
          : <Text style={s.ht} numberOfLines={titleLines}>{title}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  htop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  hlw: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  hrd: { width: 7, height: 7, borderRadius: RADIUS.pill, backgroundColor: C.red },
  hl: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 1.3, color: C.sub, textTransform: 'uppercase', flexShrink: 1 },
  ht: { fontSize: 28, fontFamily: FONT.heavy, letterSpacing: -0.6, color: C.text, lineHeight: 30, marginBottom: SPACE.lg },
  htRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACE.lg },
  htRowText: { marginBottom: 0 },
  htCaret: { marginTop: 3 },
});
