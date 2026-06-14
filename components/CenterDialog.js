import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';
import Eyebrow from './Eyebrow';

// Diálogo centrado (popup) — visual de alerta. API igual ao BottomSheet:
// Props: visible, onClose, title, eyebrow?, children.
export default function CenterDialog({ visible, onClose, title, eyebrow, children }) {
  const hasEye = !!eyebrow;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.card}>
          <View style={[s.head, { alignItems: hasEye ? 'flex-start' : 'center' }]}>
            <View style={{ flex: 1 }}>
              {hasEye ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <Text style={[s.title, { fontSize: hasEye ? TYPE.title : TYPE.lg, marginTop: hasEye ? 2 : 0 }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8} accessibilityLabel="Fechar">
              <Ionicons name="close" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg + 4 },
  card: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: C.canvas, borderRadius: RADIUS.xxl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 28, elevation: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACE.lg + 4, borderBottomWidth: 1, borderBottomColor: C.line },
  title: { fontWeight: '500', color: C.text },
  close: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
