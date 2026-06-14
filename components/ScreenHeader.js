import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';
import Eyebrow from './Eyebrow';

// Cabeçalho "blob" preto reutilizado em todos os ecrãs.
// Props: eyebrow, title, badge (elemento antes do título), onBack (seta),
//        right (slot à direita), style.
export default function ScreenHeader({ eyebrow, title, badge, onBack, right, style, backLabel = 'Voltar' }) {
  return (
    <View style={[h.blob, style]}>
      {onBack && (
        <TouchableOpacity style={h.back} onPress={onBack} hitSlop={8} accessibilityLabel={backLabel}>
          <Ionicons name="arrow-back" size={18} color={C.onDark} />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Eyebrow dark style={{ marginBottom: 6 }}>{eyebrow}</Eyebrow> : null}
        {badge ? (
          <View style={h.titleRow}>
            {badge}
            <Text style={h.title}>{title}</Text>
          </View>
        ) : (
          <Text style={h.title}>{title}</Text>
        )}
      </View>
      {right}
    </View>
  );
}

const h = StyleSheet.create({
  blob: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.ink, borderRadius: RADIUS.xl, margin: SPACE.lg, marginBottom: SPACE.md, padding: SPACE.lg },
  back: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.hairlineOnDark, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  title: { color: C.onDark, fontSize: TYPE.title, fontWeight: '500' },
});
