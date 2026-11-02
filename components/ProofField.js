// CrewPact · Prova de posse (2026-11-02) — "confirma que és tu" antes de uma ação sensível
// (apagar conta · mudar e-mail · mudar palavra-passe).
//
// Com a ENTRADA POR CÓDIGO (design/login-v3.html) há contas SEM palavra-passe. Antes, estes três
// diálogos só aceitavam a palavra-passe atual → quem entrava por código não conseguia apagar a
// conta (a Apple exige que se consiga, dentro da app). Agora: palavra-passe OU código por e-mail,
// com a MESMA regra nos três sítios. O código vai para o e-mail da conta (prova de posse).
//
//   const [proof, setProof] = useState(PROOF0);
//   <ProofField email={user.email} value={proof} onChange={setProof} lang={lang} styles={{ ...s }} />
//   if (!proofReady(proof)) …            → botão desligado
//   const re = await proveOwnership(user.email, proof, lang)   (data/auth.js)
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import OTPInput from './OTPInput';
import PrimaryButton from './PrimaryButton';
import { PELE, TXT, SPACE } from '../data/constants';
import { requestEmailCode } from '../data/auth';
import { success } from '../data/haptics';

export const PROOF0 = { mode: 'pw', pw: '', code: '', sent: false };
export const proofReady = (v) => (v && v.mode === 'code' ? !!v.sent && String(v.code || '').length === 6 : String((v && v.pw) || '').length > 0);

export default function ProofField({ email, value, onChange, lang = 'pt', disabled = false, styles = {} }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const v = value || PROOF0;
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);       // o Supabase só aceita 1 código / 60 s por e-mail
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const send = async () => {
    if (busy || left > 0 || disabled) return;
    setBusy(true); setMsg('');
    const r = await requestEmailCode(email || '', lang);
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    success();
    setLeft(60);
    onChange({ ...v, sent: true, code: '' });
  };
  const toMode = (mode) => { setMsg(''); onChange({ ...PROOF0, mode }); };

  const linkStyle = { ...TXT.label, color: PELE.ink, textDecorationLine: 'underline', textDecorationColor: PELE.grey };
  const errStyle = styles.emErr || { color: PELE.red, ...TXT.footnote, marginTop: SPACE.sm };

  if (v.mode === 'code') {
    return (
      <View style={{ marginBottom: SPACE.md }}>
        <Text style={styles.fieldLabel}>
          {v.sent ? l('Código enviado para ', 'Code sent to ') : l('Enviamos um código para ', 'We will send a code to ')}
          <Text style={{ color: PELE.ink }}>{email}</Text>
        </Text>
        {v.sent ? (
          <>
            <OTPInput value={v.code} onChange={(c) => { setMsg(''); onChange({ ...v, code: c }); }} />
            <TouchableOpacity onPress={send} disabled={left > 0 || busy} hitSlop={10} style={{ alignSelf: 'center', marginTop: -SPACE.sm }}
              accessibilityRole="button">
              <Text style={[linkStyle, left > 0 && { color: PELE.grey, textDecorationLine: 'none' }]}>
                {left > 0 ? l(`Reenviar em ${left}s`, `Resend in ${left}s`) : l('Reenviar código', 'Resend code')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <PrimaryButton onPress={send} loading={busy} disabled={disabled} label={l('Enviar código', 'Send code')} style={{ marginTop: SPACE.xs }} />
        )}
        {msg ? <Text style={errStyle}>{msg}</Text> : null}
        <TouchableOpacity onPress={() => toMode('pw')} hitSlop={10} style={{ marginTop: SPACE.md }} accessibilityRole="button" disabled={disabled}>
          <Text style={linkStyle}>{l('Usar a palavra-passe', 'Use your password')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: SPACE.md }}>
      <Text style={styles.fieldLabel}>{l('Palavra-passe atual', 'Current password')}</Text>
      <View style={styles.pwInputRow}>
        <TextInput value={v.pw} onChangeText={(pw) => { setMsg(''); onChange({ ...v, pw }); }} secureTextEntry={!show}
          style={styles.pwInput} placeholder={l('a tua palavra-passe atual', 'your current password')} placeholderTextColor={PELE.placeholder}
          autoCapitalize="none" autoCorrect={false} textContentType="password" autoComplete="current-password" editable={!disabled} />
        <TouchableOpacity onPress={() => setShow((x) => !x)} hitSlop={8} style={styles.pwEye}
          accessibilityRole="button" accessibilityLabel={show ? l('Esconder', 'Hide') : l('Mostrar', 'Show')}>
          <Icon name="eye" size={19} color={PELE.grey} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => toMode('code')} hitSlop={10} style={{ marginTop: SPACE.sm }} accessibilityRole="button" disabled={disabled}>
        <Text style={linkStyle}>{l('Não tens palavra-passe? Confirmar com um código', 'No password? Confirm with a code')}</Text>
      </TouchableOpacity>
    </View>
  );
}
