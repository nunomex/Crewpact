import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT, SHADOW } from '../data/constants';
import Eyebrow from './Eyebrow';
import { useTheme } from '../data/appContext';

// Diálogo centrado (popup) — visual de alerta. API igual ao BottomSheet:
// Props: visible, onClose, title, eyebrow?, closeLabel?, children.
// Envolto em KeyboardAvoidingView para que formulários (ex.: palavra-passe)
// não fiquem por baixo do teclado.
export default function CenterDialog({ visible, onClose, title, eyebrow, closeLabel = 'Fechar', children }) {
  const C = useTheme();
  const s = makeStyles(C);
  const hasEye = !!eyebrow;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.card}>
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
  overlay: { flex: 1, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg + 4 },
  card: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: C.card, borderRadius: RADIUS.xxl, overflow: 'hidden', ...SHADOW.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACE.lg + 4, borderBottomWidth: 1, borderBottomColor: C.line },
  title: { fontFamily: FONT.medium, color: C.text },
  close: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
