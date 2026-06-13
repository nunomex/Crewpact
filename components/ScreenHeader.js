import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';

// Cabeçalho "blob" preto reutilizado em todos os ecrãs.
// Props: eyebrow, title, onBack (mostra seta), right (slot à direita), style.
export default function ScreenHeader({ eyebrow, title, onBack, right, style }) {
  return (
    <View style={[h.blob, style]}>
      {onBack && (
        <TouchableOpacity style={h.back} onPress={onBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={h.eyebrow}>{eyebrow}</Text> : null}
        <Text style={h.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const h = StyleSheet.create({
  blob: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.ink, borderRadius: RADIUS.xl, margin: SPACE.lg, marginBottom: SPACE.md, padding: SPACE.lg },
  back: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.onDarkSub, fontWeight: '600', marginBottom: 6 },
  title: { color: '#fff', fontSize: TYPE.title, fontWeight: '500' },
});
