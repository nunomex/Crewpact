import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, SPACE, TYPE } from '../data/constants';
import Eyebrow from './Eyebrow';
import { useTheme } from '../App';

// Folha inferior partilhada (overlay + cabeçalho com título e fechar).
// Props: visible, onClose, title, eyebrow?, maxHeight?, children.
export default function BottomSheet({ visible, onClose, title, eyebrow, maxHeight, closeLabel = 'Fechar', children }) {
  const C = useTheme();
  const s = makeStyles(C);
  const hasEye = !!eyebrow;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, maxHeight ? { maxHeight } : null]}>
        <View style={[s.head, { alignItems: hasEye ? 'flex-start' : 'center' }]}>
          <View style={{ flex: 1 }}>
            {hasEye ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <Text style={[s.title, { fontSize: hasEye ? TYPE.title : TYPE.lg, marginTop: hasEye ? 2 : 0 }]}>{title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8} accessibilityLabel={closeLabel}>
            <Ionicons name="close" size={18} color={C.text} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.scrim },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACE.lg + 4, borderBottomWidth: 1, borderBottomColor: C.line },
  title: { fontWeight: '500', color: C.text },
  close: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
