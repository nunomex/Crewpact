// OFERTA DE BIOMETRIA — PORTA (2026-11-02, esboço `design/login-v4.html`, opção A+B): o símbolo do
// Face ID vive na placa de tinta, a amarelo (papel onDark); na folha, título à esquerda, uma frase e a
// ação larga no fundo, com "Agora não" por baixo, sem competir (Zing, Trust Wallet).
// A lógica não mudou: opt-in explícito pós-1.º login (padrão Apple/bancos), só aparece com
// biometria configurada; ativar VALIDA o sensor uma vez antes de ligar.
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { t } from '../data/i18n';
import { success } from '../data/haptics';
import { SPACE } from '../data/constants';
import Porta, { portaTxt as P } from '../components/Porta';
import PrimaryButton from '../components/PrimaryButton';

export default function BiometricOfferScreen({ onEnable, onSkip, lang }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [sensor, setSensor] = useState({ name: null, icon: 'lock', facial: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const facial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const name = Platform.OS === 'ios'
          ? (facial ? 'Face ID' : 'Touch ID')
          : (facial ? (lang === 'en' ? 'face unlock' : 'reconhecimento facial') : (lang === 'en' ? 'fingerprint' : 'impressão digital'));
        setSensor({ name, icon: facial ? 'faceid' : 'lock', facial });
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

  const footer = (
    <>
      <PrimaryButton glyph={sensor.icon} label={l(`Ligar o ${name}`, `Turn on ${name}`)} onPress={enable} loading={busy} />
      <TouchableOpacity onPress={onSkip} disabled={busy} hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }} style={s.later} accessibilityRole="button">
        <Text style={[P.link, P.center]}>{t('lock.offerLater', lang)}</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <Porta plate="half" brand={sensor.facial ? 'faceid' : 'wordmark'} footer={footer}>
      <Text style={P.title} accessibilityRole="header">{l(`Abrir com ${name}`, `Open with ${name}`)}</Text>
      <Text style={P.body}>
        {sensor.facial
          ? l('A CrewPact abre com a tua cara.', 'CrewPact opens with your face.')
          : l('A CrewPact abre com a tua impressão digital.', 'CrewPact opens with your fingerprint.')}
        {l(' Se alguém pegar no teu telemóvel, não vê a tua escala nem o teu salário.', ' If someone picks up your phone, they cannot see your roster or your pay.')}
      </Text>
    </Porta>
  );
}

const s = StyleSheet.create({
  later: { alignSelf: 'center', paddingVertical: SPACE.xs },
});
