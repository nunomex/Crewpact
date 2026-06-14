import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, RADIUS, SPACE, TYPE } from '../data/constants';
import Eyebrow from './Eyebrow';

// Folha inferior partilhada (overlay + cabeçalho com título e fechar).
// Props: visible, onClose, title, eyebrow?, maxHeight?, children.
export default function BottomSheet({ visible, onClose, title, eyebrow, maxHeight, closeLabel = 'Fechar', children }) {
  const hasEye = !!eyebrow;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, maxHeight ? { maxHeight } : null]}>
        <View style={[s.head, { alignItems: hasEye ? 'flex-start' : 'center' }]}>
          <View style={{ flex: 1 }}>
            {hasEye ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <Text style={[s.title, { fontSize: hasEye ? TYPE.title : TYPE.lg, marginTop: hasEye ? 2 : 0 }]}>{title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8} accessibilityLabel={closeLabel}>
            <Ionicons name="close" size={18} color={C.ink} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.scrim },
  sheet: { backgroundColor: C.canvas, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACE.lg + 4, borderBottomWidth: 1, borderBottomColor: C.line },
  title: { fontWeight: '500', color: C.text },
  close: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
