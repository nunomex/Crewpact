import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import Eyebrow from './Eyebrow';
import { useTheme } from '../data/appContext';

// Folha inferior partilhada (overlay + cabeçalho com título e fechar).
// Props: visible, onClose, title, eyebrow?, maxHeight? (default 88% — nunca sai do ecrã),
//   scroll? (true → conteúdo em ScrollView; deixa false se o filho já tem o seu), children.
// Padrões de plataforma (HIG/Material): indicador de arrasto + swipe-para-baixo fecha
// (no cabeçalho) + safe-area inferior (home indicator) + backdrop/back já fechavam.
export default function BottomSheet({ visible, onClose, title, eyebrow, maxHeight = '88%', scroll = false, closeLabel = 'Fechar', children }) {
  const C = useTheme();
  const insets = useSafeAreaInsets();   // dentro de Modal o SafeAreaView não funciona — insets à mão
  const s = makeStyles(C);
  const hasEye = !!eyebrow;
  // Swipe-para-baixo no cabeçalho/grabber fecha (threshold simples — sem seguir o dedo,
  // p/ não lutar com o ScrollView do conteúdo).
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 40) onClose && onClose(); },
  })).current;
  const body = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 0 }}>{children}</ScrollView>
    : children;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} accessibilityLabel={closeLabel} />
      <View style={[s.sheet, { maxHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View {...pan.panHandlers}>
          <View style={s.grabber} />
          <View style={[s.head, { alignItems: hasEye ? 'flex-start' : 'center' }]}>
            <View style={{ flex: 1 }}>
              {hasEye ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <Text style={[s.title, { fontSize: hasEye ? TYPE.title : TYPE.lg, marginTop: hasEye ? 2 : 0 }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.close} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel}>
              <Ionicons name="close" size={18} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>
        {body}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.scrim },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl },
  grabber: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 99, backgroundColor: C.lineStrong, marginTop: 8, marginBottom: -4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACE.lg + 4, borderBottomWidth: 1, borderBottomColor: C.line },
  title: { fontFamily: FONT.medium, color: C.text },
  close: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
