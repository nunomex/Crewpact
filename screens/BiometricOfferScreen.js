// OFERTA DE BIOMETRIA — PORT À PELE (2026-07-09): disco ink com o ícone do sensor a
// AMARELO, título Hanken pesado, botão ink (raio 16, mockup .facebtn) e "Agora não"
// discreto. RE-SKIN, NÃO REESCRITA: opt-in explícito pós-1.º login (padrão Apple/bancos),
// só aparece com biometria configurada; ativar VALIDA o sensor uma vez antes de ligar.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { t } from '../data/i18n';
import { success } from '../data/haptics';
import { PELE, PELE_FONT } from '../data/constants';

export default function BiometricOfferScreen({ onEnable, onSkip, lang }) {
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
        <View style={s.icon}><Ionicons name={sensor.icon} size={30} color={PELE.yellow} /></View>
        <Text style={s.title}>{t('lock.offerTitle', lang)}</Text>
        <Text style={s.sub}>{t('lock.offerSub', lang).replace('{name}', name)}</Text>
        <TouchableOpacity style={[s.btn, busy && { opacity: 0.55 }]} activeOpacity={0.85} onPress={enable} disabled={busy}
          accessibilityRole="button" accessibilityLabel={t('lock.offerEnable', lang).replace('{name}', name)}>
          {busy ? <ActivityIndicator size="small" color={PELE.yellow} /> : <Ionicons name={sensor.icon} size={22} color={PELE.yellow} />}
          <Text style={s.btnTxt}>{t('lock.offerEnable', lang).replace('{name}', name)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} disabled={busy} hitSlop={8} style={s.ghost}>
          <Text style={s.ghostTxt}>{t('lock.offerLater', lang)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { width: 68, height: 68, borderRadius: 99, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontSize: 20, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  sub: { fontSize: 13, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, textAlign: 'center', lineHeight: 20, marginBottom: 26, maxWidth: 280 },
  btn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, backgroundColor: PELE.ink, borderRadius: 16, paddingVertical: 18, marginTop: 6 },
  btnTxt: { fontSize: 15, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  ghost: { paddingVertical: 12, marginTop: 8 },
  ghostTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
});
