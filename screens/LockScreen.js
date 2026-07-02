import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext, useTheme } from '../data/appContext';
import { reauthenticate } from '../data/auth';
import { t } from '../data/i18n';
import { TYPE, RADIUS, FONT } from '../data/constants';
import { success, warning } from '../data/haptics';

// Ecrã de bloqueio (fechadura LOCAL sobre a sessão já guardada — não faz login no servidor):
//  1) auto-pede biometria ao abrir; 2) botão de retry com o NOME/ícone certos do sensor
//     (Face ID / Touch ID); 3) fallback nativo p/ o código do telemóvel (disableDeviceFallback:false);
//  4) ESCAPE "entrar com palavra-passe" (re-auth Supabase → desbloqueia a MESMA sessão, sem logout).
// Padrão Apple/bancos — nunca prender o utilizador atrás só da biometria.
export default function LockScreen() {
  const { setLocked, logout, lang, user } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(false);
  // Sensor real do device → nome/ícone certos (Face ID vs Touch ID; genérico no Android).
  const [sensor, setSensor] = useState({ name: null, icon: 'finger-print' });
  // Escape por palavra-passe (quando a biometria falha) — não força logout.
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw]         = useState('');
  const [pwErr, setPwErr]   = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const facial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const name = Platform.OS === 'ios'
          ? (facial ? 'Face ID' : 'Touch ID')
          : (facial ? (lang === 'en' ? 'face unlock' : 'reconhecimento facial') : (lang === 'en' ? 'fingerprint' : 'impressão digital'));
        setSensor({ name, icon: facial ? 'scan-outline' : 'finger-print' });
      } catch { /* mantém o genérico */ }
    })();
  }, [lang]);

  const authenticate = useCallback(async () => {
    if (busy) return;
    setBusy(true); setErr(false);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt', lang),
        cancelLabel: t('common.cancel', lang),
        disableDeviceFallback: false, // permite o código do telemóvel como alternativa (Secure Enclave)
      });
      if (res.success) { success(); setLocked(false); return; }
      setErr(true);
    } catch { setErr(true); } finally { setBusy(false); }
  }, [busy, lang, setLocked]);

  // Tenta autenticar logo ao abrir o ecrã (uma vez).
  useEffect(() => { authenticate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape: re-autentica com a palavra-passe da conta → desbloqueia a MESMA sessão (não faz logout).
  const submitPw = async () => {
    if (pwBusy || !pw) return;
    setPwBusy(true); setPwErr('');
    const res = await reauthenticate(user?.email, pw, lang);
    setPwBusy(false);
    if (!res.ok) { setPwErr(res.error); warning(); return; }
    success(); setLocked(false);
  };

  const unlockLabel = sensor.name ? `${t('lock.unlockWith', lang)} ${sensor.name}` : t('lock.unlock', lang);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={s.center}>
        <View style={s.iconWrap}>
          <Ionicons name="lock-closed" size={30} color={C.onDark} />
          <View style={s.iconDot} />
        </View>
        <Text style={s.title}>CrewPact</Text>
        <Text style={s.sub}>{t('lock.sub', lang)}</Text>

        {!showPw ? (
          <>
            {err ? <Text style={s.err}>{t('lock.failed', lang)}</Text> : null}
            <PrimaryButton onPress={authenticate} disabled={busy} icon={sensor.icon} label={unlockLabel}
              style={{ marginTop: 28, paddingHorizontal: 28, alignSelf: 'center' }} />
            <TouchableOpacity onPress={() => { setShowPw(true); setErr(false); }} hitSlop={8} style={s.altBtn}>
              <Text style={s.altLink}>{t('lock.usePassword', lang)}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.pwBox}>
            <TextInput value={pw} onChangeText={(v) => { setPw(v); setPwErr(''); }} secureTextEntry
              placeholder={t('profile.pwCur', lang)} placeholderTextColor={C.sub} style={s.pwInput} autoFocus
              textContentType="password" autoComplete="current-password"
              autoCapitalize="none" autoCorrect={false} editable={!pwBusy} onSubmitEditing={submitPw} returnKeyType="go" />
            {pwErr ? <Text style={s.err}>{pwErr}</Text> : null}
            <PrimaryButton onPress={submitPw} loading={pwBusy} disabled={!pw} label={t('lock.unlock', lang)} style={{ marginTop: 12, alignSelf: 'stretch' }} />
            <TouchableOpacity onPress={() => { setShowPw(false); setPw(''); setPwErr(''); }} hitSlop={8} style={s.altBtn}>
              <Text style={s.altLink}>{sensor.name ? `${t('lock.unlockWith', lang)} ${sensor.name}` : t('lock.unlock', lang)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={logout} style={s.logout} hitSlop={8}>
        <Text style={s.logoutTxt}>{t('profile.logout', lang)}</Text>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: RADIUS.pill, backgroundColor: C.ink, borderWidth: 2.5, borderColor: C.red, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  iconDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: C.red },
  title: { fontSize: TYPE.hero, fontFamily: FONT.bold, letterSpacing: -0.5, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6, textAlign: 'center' },
  err: { fontSize: 13, color: C.red, marginTop: 14, textAlign: 'center' },
  altBtn: { marginTop: 18, paddingVertical: 6 },
  altLink: { fontSize: TYPE.sub, color: C.sub, fontFamily: FONT.semibold, textAlign: 'center' },
  pwBox: { alignSelf: 'stretch', marginTop: 28 },
  pwInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: TYPE.body, color: C.text, backgroundColor: C.card },
  logout: { alignItems: 'center', paddingVertical: 20 },
  logoutTxt: { fontSize: TYPE.label, color: C.sub, fontFamily: FONT.semibold },
});
