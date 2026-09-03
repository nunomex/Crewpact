import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PELE as P, PELE_FONT as F, SHADOW } from '../data/constants';

// Diálogo de confirmação centrado (popup) — ícone num círculo suave + título +
// mensagem + dois botões (cancelar claro · confirmar). `danger` pinta o confirmar
// e o ícone a vermelho. Substitui o Alert nativo por um visual próprio da app.
// PELE-FICADO por dentro (2026-07-10), API intacta (`icon` continua nome Ionicons).
export default function ConfirmDialog({ visible, onCancel, onConfirm, icon = 'help-circle-outline', title, message, cancelLabel = 'Não', confirmLabel = 'Sim', danger = false }) {
  const accent = danger ? P.red : P.ink;
  const accentSoft = danger ? P.redSoft : P.soft;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel} statusBarTranslucent>
      {/* Tocar FORA cancela: o overlay É o Pressable e o cartão ENGOLE o toque (ver CenterDialog —
          o Touchable absoluteFill media altura 0 sob RN 0.86/Fabric; device 2026-09-03). */}
      <Pressable style={s.overlay} onPress={onCancel} accessibilityRole="button">
        <View style={s.card} onStartShouldSetResponder={() => true}>
          <View style={[s.iconWrap, { backgroundColor: accentSoft }]}>
            <Ionicons name={icon} size={28} color={accent} />
          </View>
          <Text style={s.title} allowFontScaling={false}>{title}</Text>
          {message ? <Text style={s.msg}>{message}</Text> : null}
          <View style={s.btns}>
            <TouchableOpacity style={[s.btn, s.btnCancel]} activeOpacity={0.85} onPress={onCancel}>
              <Text style={s.btnCancelTxt}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} activeOpacity={0.9} onPress={onConfirm}>
              <Text style={s.btnConfirmTxt}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,10,8,0.42)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, backgroundColor: P.paper, borderRadius: 24, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 18, alignItems: 'center',
    ...SHADOW.lg },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: F.display, fontSize: 22, color: P.ink, textAlign: 'center', letterSpacing: -0.3 },
  msg: { fontFamily: F.bodyMed, fontSize: 13.5, color: P.grey, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  btns: { flexDirection: 'row', gap: 11, marginTop: 22, alignSelf: 'stretch' },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: P.soft },
  btnCancelTxt: { fontFamily: F.bodyBold, fontSize: 15, color: P.ink },
  btnConfirmTxt: { fontFamily: F.bodyBold, fontSize: 15, color: P.onInk },
});
