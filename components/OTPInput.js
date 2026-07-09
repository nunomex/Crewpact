import React, { useRef, useEffect } from 'react';
import { Pressable, View, Text, TextInput, StyleSheet, Platform, Keyboard } from 'react-native';
import { RADIUS, PELE, PELE_FONT } from '../data/constants';

// Caixa de código OTP (6 dígitos numéricos) — partilhada entre reset de password (Login),
// confirmação de email (signup) e mudar-email (Settings, dentro de um MODAL).
// PELE-FICADA por dentro (2026-07-10): seleção = amarelo (vermelho é perigo, nunca foco),
// dígitos em Barlow. API intacta.
//
// FOCO À PROVA DE BALA (bug real no device, 2.ª ronda): a fila inteira é um Pressable
// que comanda o foco IMPERATIVAMENTE — não se depende do toque chegar ao campo invisível.
// O caso maluco do iOS (minimizar o teclado NÃO desfoca o campo → tocar não gera novo
// focus → o teclado nunca volta) resolve-se com blur→focus espaçado (100 ms: o iOS
// precisa de desmontar o teclado antes de o focus() voltar a contar).
export default function OTPInput({ value, onChange, len = 6, autoFocus = true }) {
  const ref = useRef();
  const kbUp = useRef(false);   // teclado visível?
  // Foco com pequeno atraso: dentro de um Modal, focar no mount (autoFocus) muitas vezes não abre
  // o teclado (timing do Modal). O atraso garante que o campo já está montado e recebe o teclado.
  useEffect(() => {
    if (!autoFocus) return;
    const id = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(id);
  }, [autoFocus]);
  useEffect(() => {
    // `will*` no iOS: o Did chega ~250ms depois — num toque rápido pós-minimizar,
    // o kbUp ainda dizia "visível" e o forceFocus desistia cedo demais.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, () => { kbUp.current = true; });
    const s2 = Keyboard.addListener(hideEvt, () => { kbUp.current = false; });
    return () => { s1.remove(); s2.remove(); };
  }, []);
  // Fechar o teclado TOCANDO FORA deixa o RN e o iOS dessincronizados (um lado acha
  // que o campo ainda está focado, o outro não) → focus() simples cai em "já estás
  // focado" e não faz nada. Cura universal: blur SEMPRE (limpa qualquer estado) e
  // focar de novo passado 100ms — exceto quando está comprovadamente tudo bem.
  const forceFocus = () => {
    const r = ref.current;
    if (!r) return;
    if (kbUp.current && r.isFocused()) return;   // teclado visível + focado = nada a fazer
    r.blur();
    setTimeout(() => { const rr = ref.current; if (rr) rr.focus(); }, 100);
  };
  const digits = Array(len).fill('').map((_, i) => value[i] || '');
  return (
    <Pressable style={otp.row} onPress={forceFocus} accessibilityRole="none">
      {digits.map((d, i) => (
        <View key={i} style={[otp.box, value.length === i && otp.boxActive, d !== '' && otp.boxFilled]}>
          <Text style={otp.digit}>{d}</Text>
        </View>
      ))}
      {/* Campo transparente por cima das caixas: fica com os toques DIRETOS (long-press
          = menu de colar) e o onPressIn cobre o caso focado-sem-teclado; o Pressable
          por baixo é a rede — qualquer toque que escape ao campo comanda o foco na mesma. */}
      <TextInput
        ref={ref}
        value={value}
        // SEM maxLength: no iOS, colar conteúdo maior que o limite é BLOQUEADO por inteiro
        // (e o código copiado do Mail traz espaços/quebras). A sanitização abaixo já corta a `len`.
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, len))}
        onPressIn={forceFocus}
        keyboardType="numeric"
        style={otp.overlay}
        caretHidden
        blurOnSubmit={false}
        // O teclado SUGERE o código recebido em vez de obrigar a decorar (iOS: QuickType
        // "From Mail/Messages"; Android: sms-otp).
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
      />
    </Pressable>
  );
}

const otp = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 5, justifyContent: 'center', marginVertical: 20, position: 'relative' },
  box:      { width: 36, height: 44, borderRadius: RADIUS.sm, backgroundColor: PELE.soft, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxActive:{ backgroundColor: PELE.paper, borderColor: PELE.yellow },
  boxFilled:{ backgroundColor: PELE.paper, borderColor: PELE.line },
  digit:    { fontSize: 22, fontFamily: PELE_FONT.display, color: PELE.ink },
  // Sobrepõe as caixas (transparente): os toques vão para o campo real, foca sem intermediário.
  overlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
});
