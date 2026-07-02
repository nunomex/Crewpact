import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, FONT, SHADOW } from '../data/constants';
import { useTheme } from '../data/appContext';

// Botão primário canónico (Fase B do design system). Substitui btnDark/saveBtn/pwBtn/btn/
// btnMain/editBtn/pdfBtn/grantBtn/save/emptyBtnPri… — "ink, full-width, texto branco".
// Props: label, onPress, icon (Ionicons name), disabled, loading, tone ('ink'|'danger'),
//   radius ('pill' default | 'lg' p/ botões em contexto de cartão), elevated (SHADOW.sm),
//   style (override de margens/largura), + resto (hitSlop, accessibilityLabel, testID…).
export default function PrimaryButton({ label, onPress, icon, disabled = false, loading = false, tone = 'ink', radius = 'pill', elevated = false, style, ...rest }) {
  const C = useTheme();
  const bg = disabled ? C.soft : tone === 'danger' ? C.red : C.ink;
  const fg = disabled ? C.sub : '#fff';
  return (
    // role/state p/ leitor de ecrã; em loading o NOME mantém-se (o spinner apagava-o) e "ocupado".
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.9}
      accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} accessibilityLabel={label}
      style={[s.base, { backgroundColor: bg, borderRadius: radius === 'lg' ? RADIUS.lg : RADIUS.pill }, elevated && SHADOW.sm, style]} {...rest}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
          <Text style={[s.txt, { color: fg }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  txt: { fontSize: TYPE.body, fontFamily: FONT.semibold },
});
