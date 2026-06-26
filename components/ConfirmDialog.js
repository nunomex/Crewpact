import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACE, SHADOW, RADIUS, TYPE } from '../data/constants';
import { useTheme } from '../data/appContext';

// Diálogo de confirmação centrado (popup) — ícone num círculo suave + título +
// mensagem + dois botões (cancelar claro · confirmar). `danger` pinta o confirmar
// e o ícone a vermelho. Substitui o Alert nativo por um visual próprio da app.
export default function ConfirmDialog({ visible, onCancel, onConfirm, icon = 'help-circle-outline', title, message, cancelLabel = 'Não', confirmLabel = 'Sim', danger = false }) {
  const C = useTheme();
  const s = makeStyles(C);
  const accent = danger ? C.red : C.ink;
  const accentSoft = danger ? (C.redSoft || C.soft) : C.soft;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel} statusBarTranslucent>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={s.card}>
          <View style={[s.iconWrap, { backgroundColor: accentSoft }]}>
            <Ionicons name={icon} size={28} color={accent} />
          </View>
          <Text style={s.title}>{title}</Text>
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
      </View>
    </Modal>
  );
}

const makeStyles = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg + 4 },
  card: { width: '100%', maxWidth: 380, backgroundColor: C.card, borderRadius: RADIUS.xxl, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 18, alignItems: 'center',
    ...SHADOW.lg },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: FONT.heavy, fontSize: TYPE.heading, color: C.text, textAlign: 'center', letterSpacing: -0.3 },
  msg: { fontFamily: FONT.medium, fontSize: 14.5, color: C.sub, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  btns: { flexDirection: 'row', gap: 11, marginTop: 22, alignSelf: 'stretch' },
  btn: { flex: 1, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: C.soft },
  btnCancelTxt: { fontFamily: FONT.bold, fontSize: 15.5, color: C.text },
  btnConfirmTxt: { fontFamily: FONT.bold, fontSize: 15.5, color: '#fff' },
});
