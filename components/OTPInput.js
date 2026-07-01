import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { RADIUS, TYPE, FONT, PALETTE_DARK } from '../data/constants';
import { useTheme } from '../data/appContext';

// Caixa de código OTP (6 dígitos numéricos) — partilhada entre reset de password (Login) e
// confirmação de email do registo (Onboarding). Um TextInput oculto captura os dígitos; as
// caixas são só visuais. `len` permite outro tamanho se algum dia o Supabase mudar.
export default function OTPInput({ value, onChange, len = 6, autoFocus = true }) {
  const C = useTheme();
  const otp = makeOtp(C);
  const ref = useRef();
  const digits = Array(len).fill('').map((_, i) => value[i] || '');
  return (
    <TouchableOpacity onPress={() => ref.current?.focus()} activeOpacity={1} style={otp.row}>
      {digits.map((d, i) => (
        <View key={i} style={[otp.box, value.length === i && otp.boxActive, d !== '' && otp.boxFilled]}>
          <Text style={otp.digit}>{d}</Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, len))}
        keyboardType="numeric"
        maxLength={len}
        style={otp.hidden}
        autoFocus={autoFocus}
        caretHidden
      />
    </TouchableOpacity>
  );
}

const makeOtp = (C) => StyleSheet.create({
  row:      { flexDirection: 'row', gap: 5, justifyContent: 'center', marginVertical: 20 },
  box:      { width: 36, height: 44, borderRadius: RADIUS.sm, backgroundColor: C.soft, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxActive:{ backgroundColor: C.redSoft, borderColor: C.red },
  boxFilled:{ backgroundColor: C === PALETTE_DARK ? C.inkSoft : C.card, borderColor: C.line },
  digit:    { fontSize: TYPE.title, fontFamily: FONT.bold, color: C.text },
  hidden:   { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
