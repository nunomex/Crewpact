import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import Icon from './Icon';
import Eyebrow from './Eyebrow';
import { PELE as P, PELE_FONT as F, SHADOW } from '../data/constants';

// Diálogo centrado (popup) — visual de alerta.
// Props: visible, onClose, title, eyebrow?, closeLabel?, children.
// Envolto em KeyboardAvoidingView para que formulários (ex.: palavra-passe)
// não fiquem por baixo do teclado. PELE-FICADO por dentro (2026-07-10), API intacta.
// CORPO COM SCROLL (2026-09-03, device): o cartão encolhe (flexShrink) quando o teclado sobe e
// o conteúdo que não cabe passa a rolar — cabeçalho fixo, campo focado trazido à vista pelo
// próprio ScrollView (iOS). Antes, overflow:hidden CORTAVA o fundo (campo "APAGAR" + botão).
export default function CenterDialog({ visible, onClose, title, eyebrow, closeLabel = 'Fechar', children }) {
  const hasEye = !!eyebrow;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Tocar FORA fecha: o overlay É o Pressable (flex:1 mede bem) e o cartão ENGOLE o toque
            (onStartShouldSetResponder) — os botões/inputs lá dentro continuam a ganhar primeiro
            (o responder pergunta ao mais fundo). Antes: Touchable absoluteFill por trás do cartão,
            que sob RN 0.86/Fabric media ALTURA 0 → tocar fora não fazia nada (device 2026-09-03). */}
        <Pressable style={s.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel}>
        <View style={s.card} onStartShouldSetResponder={() => true}>
          <View style={[s.head, { alignItems: hasEye ? 'flex-start' : 'center' }]}>
            <View style={{ flex: 1 }}>
              {hasEye ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <Text style={[s.title, { fontSize: hasEye ? 22 : 24, marginTop: hasEye ? 2 : 0 }]} allowFontScaling={false}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel}>
              <Icon name="close" size={16} color={P.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.body} bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  kav: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,8,0.42)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, maxHeight: '80%', flexShrink: 1, backgroundColor: P.paper, borderRadius: 24, overflow: 'hidden', ...SHADOW.lg },
  body: { flexShrink: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: P.line },
  title: { fontFamily: F.display, color: P.ink, letterSpacing: -0.3 },
  close: { width: 36, height: 36, borderRadius: 999, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
});
