// BLOQUEIO — PORT À PELE (2026-07-09, mockup `design/login-fluxo.html` § Face ID à letra):
// wordmark da pele + saudação + botão ink (raio 16) com o ícone do sensor a AMARELO +
// escape "entrar com palavra-passe" com o sublinhado amarelo. RE-SKIN, NÃO REESCRITA:
// a lógica auditada está intacta — fechadura LOCAL sobre a sessão (não faz login no
// servidor): 1) auto-pede biometria ao abrir; 2) retry com o NOME/ícone certos do sensor
// (Face ID/Touch ID); 3) fallback nativo p/ o código do telemóvel; 4) escape por
// palavra-passe (re-auth Supabase → desbloqueia a MESMA sessão, sem logout).
import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext } from '../data/appContext';
import { reauthenticate } from '../data/auth';
import { t } from '../data/i18n';
import { PELE, PELE_FONT } from '../data/constants';
import { success, warning } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';

export default function LockScreen() {
  const { setLocked, logout, lang, user } = useContext(AppContext);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(false);
  // Movimento (reduce-aware): fade de entrada · fade curto no DESBLOQUEIO (em vez de
  // corte seco para a app) · shake no falhanço (o mesmo gesto do Login/macOS).
  const reduce = useReduceMotion();
  const veil  = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { veil.setValue(1); return; }
    Animated.timing(veil, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const doShake = () => {
    warning();
    if (reduce) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 40, useNativeDriver: true }),
    ]).start();
  };
  const unlock = () => {
    success();
    if (reduce) { setLocked(false); return; }
    Animated.timing(veil, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setLocked(false));
  };
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
      if (res.success) { unlock(); return; }
      setErr(true); doShake();
    } catch { setErr(true); doShake(); } finally { setBusy(false); }
  }, [busy, lang, setLocked, reduce]);

  // Tenta autenticar logo ao abrir o ecrã (uma vez).
  useEffect(() => { authenticate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape: re-autentica com a palavra-passe da conta → desbloqueia a MESMA sessão (não faz logout).
  const submitPw = async () => {
    if (pwBusy || !pw) return;
    setPwBusy(true); setPwErr('');
    const res = await reauthenticate(user?.email, pw, lang);
    setPwBusy(false);
    if (!res.ok) { setPwErr(res.error); doShake(); return; }
    unlock();
  };

  const unlockLabel = sensor.name ? `${t('lock.unlockWith', lang)} ${sensor.name}` : t('lock.unlock', lang);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: veil, transform: [{ translateX: shake }] }}>
      <View style={s.center}>
        {/* Wordmark da pele (o mesmo do login) */}
        <Text style={s.wmEye}>FTL · AE · CREW</Text>
        <View style={s.wmRule} />
        <Text style={s.wmName} allowFontScaling={false}>
          <Text style={s.wmNameLight}>CREW</Text><Text style={s.wmNameBold}>PACT</Text>
        </Text>
        <Text style={s.sub}>{t('lock.sub', lang)}</Text>

        {!showPw ? (
          <>
            {err ? <Text style={s.err}>{t('lock.failed', lang)}</Text> : null}
            <TouchableOpacity style={[s.faceBtn, busy && { opacity: 0.55 }]} activeOpacity={0.85} onPress={authenticate} disabled={busy}
              accessibilityRole="button" accessibilityLabel={unlockLabel}>
              <Ionicons name={sensor.icon} size={24} color={PELE.yellow} />
              <Text style={s.faceBtnTxt}>{unlockLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowPw(true); setErr(false); }} hitSlop={8} style={s.altBtn}>
              <Text style={s.altLink}>{t('lock.usePassword', lang)}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.pwBox}>
            <View style={s.pwPill}>
              <Ionicons name="lock-closed-outline" size={17} color={PELE.grey} style={{ marginRight: 11 }} />
              <TextInput value={pw} onChangeText={(v) => { setPw(v); setPwErr(''); }} secureTextEntry
                placeholder={t('profile.pwCur', lang)} placeholderTextColor={PELE.placeholder} style={s.pwInput} autoFocus
                textContentType="password" autoComplete="current-password"
                autoCapitalize="none" autoCorrect={false} editable={!pwBusy} onSubmitEditing={submitPw} returnKeyType="go" />
            </View>
            {pwErr ? <Text style={s.err}>{pwErr}</Text> : null}
            <TouchableOpacity style={[s.faceBtn, { marginTop: 12, alignSelf: 'stretch' }, (!pw || pwBusy) && { opacity: 0.55 }]}
              activeOpacity={0.85} onPress={submitPw} disabled={!pw || pwBusy} accessibilityRole="button">
              {pwBusy ? <ActivityIndicator size="small" color={PELE.yellow} /> : null}
              <Text style={s.faceBtnTxt}>{t('lock.unlock', lang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowPw(false); setPw(''); setPwErr(''); }} hitSlop={8} style={s.altBtn}>
              <Text style={s.altLink}>{sensor.name ? `${t('lock.unlockWith', lang)} ${sensor.name}` : t('lock.unlock', lang)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={logout} style={s.logout} hitSlop={8}>
        <Text style={s.logoutTxt}>{t('profile.logout', lang)}</Text>
      </TouchableOpacity>
      </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  wmEye: { fontSize: 9, fontFamily: PELE_FONT.body, letterSpacing: 4, color: PELE.grey, textTransform: 'uppercase' },
  wmRule: { height: 3.5, width: 130, backgroundColor: PELE.yellow, marginTop: 9, marginBottom: 12 },
  wmName: { fontSize: 38, lineHeight: 40, letterSpacing: 3, color: PELE.ink },
  wmNameLight: { fontFamily: PELE_FONT.displayMed },
  wmNameBold: { fontFamily: PELE_FONT.displayHeavy },
  sub: { fontSize: 13, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 10, textAlign: 'center' },
  err: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.red, marginTop: 14, textAlign: 'center' },
  // Botão do sensor (mockup .facebtn): ink, raio 16, ícone AMARELO, texto claro.
  faceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, backgroundColor: PELE.ink, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 28, marginTop: 26, alignSelf: 'center' },
  faceBtnTxt: { fontSize: 15, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  altBtn: { marginTop: 18, paddingVertical: 6 },
  altLink: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, borderBottomWidth: 2, borderBottomColor: PELE.yellow, paddingBottom: 1, textAlign: 'center' },
  pwBox: { alignSelf: 'stretch', marginTop: 26, alignItems: 'center' },
  pwPill: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', backgroundColor: PELE.soft, borderWidth: 1.5, borderColor: PELE.line, borderRadius: 999, paddingHorizontal: 20, height: 54 },
  pwInput: { flex: 1, fontSize: 14.5, fontFamily: PELE_FONT.body, color: PELE.ink },
  logout: { alignItems: 'center', paddingVertical: 20 },
  logoutTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
});
