import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../data/appContext';
import { t } from '../data/i18n';
import { success } from '../data/haptics';
import { TYPE, RADIUS, FONT } from '../data/constants';

// Oferta pós-1.º login (padrão Apple/bancos): "Usar Face ID para entrar?" — opt-in explícito,
// só aparece se o device tiver biometria configurada. Ativar valida o sensor uma vez antes de ligar.
export default function BiometricOfferScreen({ onEnable, onSkip, lang }) {
  const C = useTheme();
  const s = makeS(C);
  const [sensor, setSensor] = useState({ name: null, icon: 'finger-print' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const facial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const name = Platform.OS === 'ios'
          ? (facial ? 'Face ID' : 'Touch ID')
          : (facial ? (lang === 'en' ? 'face unlock' : 'reconhecimento facial') : (lang === 'en' ? 'fingerprint' : 'impressão digital'));
        setSensor({ name, icon: facial ? 'scan-outline' : 'finger-print' });
      } catch { /* mantém genérico */ }
    })();
  }, [lang]);

  const name = sensor.name || (lang === 'en' ? 'biometrics' : 'biometria');
  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.enablePrompt', lang), cancelLabel: t('common.cancel', lang), disableDeviceFallback: false,
      });
      if (res.success) { success(); onEnable(); return; }
    } catch { /* falhou */ }
    setBusy(false);   // cancelou/falhou → fica no ecrã (pode tentar de novo ou "Agora não")
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <View style={s.icon}><Ionicons name={sensor.icon} size={32} color={C.text} /></View>
        <Text style={s.title}>{t('lock.offerTitle', lang)}</Text>
        <Text style={s.sub}>{t('lock.offerSub', lang).replace('{name}', name)}</Text>
        <PrimaryButton onPress={enable} loading={busy} label={t('lock.offerEnable', lang).replace('{name}', name)} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        <TouchableOpacity onPress={onSkip} disabled={busy} hitSlop={8} style={s.ghost}>
          <Text style={s.ghostTxt}>{t('lock.offerLater', lang)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeS = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { width: 68, height: 68, borderRadius: 99, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontSize: 22, fontFamily: FONT.semibold, color: C.text, textAlign: 'center', marginBottom: 10 },
  sub: { fontSize: TYPE.sub, color: C.sub, textAlign: 'center', lineHeight: 21, marginBottom: 26 },
  ghost: { paddingVertical: 12, marginTop: 6 },
  ghostTxt: { color: C.sub, fontSize: TYPE.sub, fontFamily: FONT.medium },
});
