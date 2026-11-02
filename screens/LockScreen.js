// BLOQUEIO — PORTA (2026-11-02, esboço `design/login-v4.html`, opção A+B): o ecrã que mais se vê,
// por isso é onde a marca ganha espaço — placa de tinta ALTA com a marca, folha curta com uma frase
// e a ação larga no fundo ("Desbloquear com Face ID"). "Sair da conta" fica no canto da placa.
// A lógica auditada está intacta — fechadura LOCAL sobre a sessão (não faz login no servidor):
// 1) auto-pede biometria ao abrir; 2) retry com o NOME certo do sensor (Face ID/Touch ID);
// 3) fallback nativo para o código do telemóvel; 4) escape por PROVA DE POSSE → desbloqueia a
// MESMA sessão, sem logout. 2026-11-02: o escape aceita palavra-passe OU código por e-mail
// (ProofField) — antes só a palavra-passe, e quem entrou só com código ficava sem esta saída.
import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext } from '../data/appContext';
import { proveOwnership } from '../data/auth';
import { t } from '../data/i18n';
import { PELE, PELE_NIGHT, PELE_FONT, TXT, SPACE } from '../data/constants';
import { success, warning } from '../data/haptics';
import useReduceMotion from '../hooks/useReduceMotion';
import Porta, { portaTxt as P } from '../components/Porta';
import PrimaryButton from '../components/PrimaryButton';
import ProofField, { PROOF0, proofReady } from '../components/ProofField';

export default function LockScreen() {
  const { setLocked, logout, lang, user } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(false);
  // Véu pelo JS (não nativo) de propósito: dentro da Porta, um valor nativo preso deixaria o ecrã
  // invisível (o bug do login, device 2026-11-02).
  // Movimento (reduce-aware): fade de entrada · fade curto no DESBLOQUEIO (em vez de
  // corte seco para a app) · shake no falhanço (o mesmo gesto do Login/macOS).
  const reduce = useReduceMotion();
  const veil  = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { veil.setValue(1); return; }
    Animated.timing(veil, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
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
    Animated.timing(veil, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => setLocked(false));
  };
  // Sensor real do device → nome/ícone certos (Face ID vs Touch ID; genérico no Android).
  const [sensor, setSensor] = useState({ name: null, icon: 'lock' });
  // Escape por prova de posse (quando a biometria falha) — não força logout.
  const [showPw, setShowPw]   = useState(false);
  const [proof, setProof]     = useState(PROOF0);
  const [pwErr, setPwErr]     = useState('');
  const [pwBusy, setPwBusy]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const facial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const name = Platform.OS === 'ios'
          ? (facial ? 'Face ID' : 'Touch ID')
          : (facial ? (lang === 'en' ? 'face unlock' : 'reconhecimento facial') : (lang === 'en' ? 'fingerprint' : 'impressão digital'));
        setSensor({ name, icon: facial ? 'faceid' : 'lock' });
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

  // Escape: prova de posse (palavra-passe OU código ao e-mail) → desbloqueia a MESMA sessão.
  const submitProof = async () => {
    if (pwBusy || !proofReady(proof)) return;
    setPwBusy(true); setPwErr('');
    const res = await proveOwnership(user?.email, proof, lang);
    setPwBusy(false);
    if (!res.ok) { setPwErr(res.error); doShake(); return; }
    unlock();
  };
  const toFace = () => { setShowPw(false); setProof(PROOF0); setPwErr(''); };

  const unlockLabel = sensor.name ? `${t('lock.unlockWith', lang)} ${sensor.name}` : t('lock.unlock', lang);

  const corner = (
    <TouchableOpacity onPress={logout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button">
      <Text style={s.logout}>{l('Sair da conta', 'Sign out')}</Text>
    </TouchableOpacity>
  );

  const footer = !showPw ? (
    <>
      <PrimaryButton glyph={sensor.icon} label={unlockLabel} onPress={authenticate} loading={busy} />
      <TouchableOpacity onPress={() => { setShowPw(true); setErr(false); }} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }} style={s.alt} accessibilityRole="button">
        <Text style={[P.link, P.center]}>{l('Usar a palavra-passe ou um código', 'Use your password or a code')}</Text>
      </TouchableOpacity>
    </>
  ) : (
    <>
      <PrimaryButton label={t('lock.unlock', lang)} onPress={submitProof} loading={pwBusy} disabled={!proofReady(proof)} />
      <TouchableOpacity onPress={toFace} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }} style={s.alt} accessibilityRole="button">
        <Text style={[P.link, P.center]}>{unlockLabel}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Animated.View style={[s.flex, { opacity: veil }]}>
      <Porta plate={showPw ? 'half' : 'tall'} corner={corner} footer={footer}>
        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          {!showPw ? (
            <>
              <Text style={P.body}>{l('Bloqueada para proteger a tua escala e o teu salário.', 'Locked to protect your roster and your pay.')}</Text>
              {err ? <Text style={P.err}>{t('lock.failed', lang)}</Text> : null}
            </>
          ) : (
            <>
              <Text style={P.title} accessibilityRole="header">{l('Confirma que és tu', 'Confirm it is you')}</Text>
              <ProofField email={user?.email} value={proof} onChange={(v) => { setProof(v); setPwErr(''); }} lang={lang} disabled={pwBusy}
                styles={{ fieldLabel: P.label, pwInputRow: s.pwRow, pwInput: s.pwInput, pwEye: s.pwEye, emErr: P.err }} />
              {pwErr ? <Text style={P.err}>{pwErr}</Text> : null}
            </>
          )}
        </Animated.View>
      </Porta>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  flex:    { flex: 1 },
  logout:  { ...TXT.label, color: PELE_NIGHT.grey },
  alt:     { alignSelf: 'center', paddingVertical: SPACE.xs },
  // Campo da palavra-passe do ProofField = o mesmo campo-pílula do login.
  pwRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: PELE.soft, borderWidth: 1.5, borderColor: PELE.line, borderRadius: 999, paddingHorizontal: SPACE.lgPlus, height: 50 },
  pwInput: { flex: 1, fontSize: 15, fontFamily: PELE_FONT.body, color: PELE.ink },
  pwEye:   { padding: SPACE.xs },
});
