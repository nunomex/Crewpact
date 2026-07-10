import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from './Icon';
import Eyebrow from './Eyebrow';
import { PELE as P, PELE_FONT as F, SHADOW } from '../data/constants';

// Diálogo centrado (popup) — visual de alerta.
// Props: visible, onClose, title, eyebrow?, closeLabel?, children.
// Envolto em KeyboardAvoidingView para que formulários (ex.: palavra-passe)
// não fiquem por baixo do teclado. PELE-FICADO por dentro (2026-07-10), API intacta.
export default function CenterDialog({ visible, onClose, title, eyebrow, closeLabel = 'Fechar', children }) {
  const hasEye = !!eyebrow;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.card}>
          <View style={[s.head, { alignItems: hasEye ? 'flex-start' : 'center' }]}>
            <View style={{ flex: 1 }}>
              {hasEye ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <Text style={[s.title, { fontSize: hasEye ? 22 : 24, marginTop: hasEye ? 2 : 0 }]} allowFontScaling={false}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel}>
              <Icon name="close" size={16} color={P.ink} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,8,0.42)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: P.paper, borderRadius: 24, overflow: 'hidden', ...SHADOW.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: P.line },
  title: { fontFamily: F.display, color: P.ink, letterSpacing: -0.3 },
  close: { width: 36, height: 36, borderRadius: 999, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
});
