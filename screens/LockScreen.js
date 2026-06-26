import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppContext, useTheme } from '../data/appContext';
import { t } from '../data/i18n';
import { TYPE, RADIUS, FONT } from '../data/constants';
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
          <Ionicons name="lock-closed" size={30} color={C.onDark} />
          <View style={s.iconDot} />
        </View>
        <Text style={s.title}>CrewPact</Text>
        <Text style={s.sub}>{t('lock.sub', lang)}</Text>
        {err ? <Text style={s.err}>{t('lock.failed', lang)}</Text> : null}
        <PrimaryButton onPress={authenticate} disabled={busy} icon="finger-print" label={t('lock.unlock', lang)} style={{ marginTop: 28, paddingHorizontal: 28, alignSelf: 'center' }} />
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
  iconWrap: { width: 72, height: 72, borderRadius: RADIUS.pill, backgroundColor: C.ink, borderWidth: 2.5, borderColor: C.red, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  iconDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: C.red },
  title: { fontSize: TYPE.hero, fontFamily: FONT.bold, letterSpacing: -0.5, color: C.text },
  sub: { fontSize: 14, color: C.sub, marginTop: 6, textAlign: 'center' },
  err: { fontSize: 13, color: C.red, marginTop: 14, textAlign: 'center' },
  logout: { alignItems: 'center', paddingVertical: 20 },
  logoutTxt: { fontSize: TYPE.label, color: C.sub, fontFamily: FONT.semibold },
});
