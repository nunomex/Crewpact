import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext, useTheme } from '../App';
import { t } from '../data/i18n';
import { TYPE, RADIUS } from '../data/constants';
import { success } from '../data/haptics';

// Ecrã de bloqueio: pede biometria (Face ID / impressão digital) e cai para o
// código do telemóvel se a biometria falhar/não existir (disableDeviceFallback:
// false). Funciona offline — é tudo local, sem rede.
export default function LockScreen() {
  const { setLocked, logout, lang } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(false);

  const authenticate = useCallback(async () => {
    if (busy) return;
    setBusy(true); setErr(false);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt', lang),
        cancelLabel: t('common.cancel', lang),
        disableDeviceFallback: false, // permite o código do telemóvel como alternativa
      });
      if (res.success) { success(); setLocked(false); return; }
      setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }, [busy, lang, setLocked]);

  // Tenta autenticar logo ao abrir o ecrã (uma vez).
  useEffect(() => { authenticate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.center}>
        <View style={s.iconWrap}>
          <Ionicons name="lock-closed" size={30} color={C.text} />
        </View>
        <Text style={s.title}>CrewPact</Text>
        <Text style={s.sub}>{t('lock.sub', lang)}</Text>
        {err ? <Text style={s.err}>{t('lock.failed', lang)}</Text> : null}
        <TouchableOpacity onPress={authenticate} disabled={busy} style={[s.btn, busy && { opacity: 0.6 }]}>
          <Ionicons name="finger-print" size={18} color="#fff" />
          <Text style={s.btnTxt}>{t('lock.unlock', lang)}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={logout} style={s.logout} hitSlop={8}>
        <Text style={s.logoutTxt}>{t('profile.logout', lang)}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -0.5, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6, textAlign: 'center' },
  err: { fontSize: 13, color: C.red, marginTop: 14, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, paddingHorizontal: 28, marginTop: 28 },
  btnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },
  logout: { alignItems: 'center', paddingVertical: 20 },
  logoutTxt: { fontSize: TYPE.label, color: C.sub, fontWeight: '600' },
});
