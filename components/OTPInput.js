import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { RADIUS, TYPE, FONT, PALETTE_DARK } from '../data/constants';
import { useTheme } from '../data/appContext';

// Caixa de código OTP (6 dígitos numéricos) — partilhada entre reset de password (Login),
// confirmação de email (Onboarding) e mudar-email (Settings, dentro de um MODAL).
// O TextInput real é TRANSPARENTE e COBRE as caixas (não um 1×1 escondido): tocar nas caixas =
// tocar no campo → foca direto, fiável mesmo dentro de um Modal. `len` permite outro tamanho.
export default function OTPInput({ value, onChange, len = 6, autoFocus = true }) {
  const C = useTheme();
  const otp = makeOtp(C);
  const ref = useRef();
  // Foco com pequeno atraso: dentro de um Modal, focar no mount (autoFocus) muitas vezes não abre
  // o teclado (timing do Modal). O atraso garante que o campo já está montado e recebe o teclado.
  useEffect(() => {
    if (!autoFocus) return;
    const id = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(id);
  }, [autoFocus]);
  const digits = Array(len).fill('').map((_, i) => value[i] || '');
  return (
    <View style={otp.row}>
      {digits.map((d, i) => (
        <View key={i} style={[otp.box, value.length === i && otp.boxActive, d !== '' && otp.boxFilled]}>
          <Text style={otp.digit}>{d}</Text>
        </View>
      ))}
      {/* Campo transparente por cima de TODAS as caixas → apanha os toques e o teclado. */}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, len))}
        keyboardType="numeric"
        maxLength={len}
        style={otp.overlay}
        caretHidden
        // O teclado SUGERE o código recebido em vez de obrigar a decorar (iOS: QuickType
        // "From Mail/Messages"; Android: sms-otp).
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      />
    </View>
  );
}

const makeOtp = (C) => StyleSheet.create({
  row:      { flexDirection: 'row', gap: 5, justifyContent: 'center', marginVertical: 20, position: 'relative' },
  box:      { width: 36, height: 44, borderRadius: RADIUS.sm, backgroundColor: C.soft, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxActive:{ backgroundColor: C.redSoft, borderColor: C.red },
  boxFilled:{ backgroundColor: C === PALETTE_DARK ? C.inkSoft : C.card, borderColor: C.line },
  digit:    { fontSize: TYPE.title, fontFamily: FONT.bold, color: C.text },
  // Sobrepõe as caixas (transparente): os toques vão para o campo real, foca sem intermediário.
  overlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
});
