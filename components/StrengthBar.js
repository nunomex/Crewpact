import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, PELE, PELE_FONT } from '../data/constants';
import { t } from '../data/i18n';

// Medidor de força da palavra-passe — informa sem bloquear (o padrão certo; os
// requisitos DUROS vivem no validatePassword + dashboard). PELE-FICADO por dentro
// (2026-07-10), API intacta. Política "à Apple" (2026-07-10): 8+ · minúscula ·
// maiúscula · número — o carácter especial DEIXOU de ser requisito (NIST desaconselha
// regras de composição; era herança do default do Supabase).
export default function StrengthBar({ password, lang }) {
  const checks = [
    { label: t('st.8', lang),     ok: password.length >= 8 },
    { label: t('st.lower', lang), ok: /[a-z]/.test(password) },
    { label: t('st.upper', lang), ok: /[A-Z]/.test(password) },
    { label: t('st.num', lang),   ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = [PELE.line, PELE.red, PELE.warn, PELE.warn, PELE.ok];   // 0…4 critérios
  if (!password) return null;
  return (
    <View style={s.wrap}>
      <View style={s.bars}>
        {checks.map((_, i) => (
          <View key={i} style={[s.bar, { backgroundColor: i < score ? colors[score] : PELE.line }]} />
        ))}
      </View>
      <View style={s.chips}>
        {checks.map((c, i) => (
          <View key={i} style={[s.chip, { backgroundColor: c.ok ? PELE.okSoft : PELE.soft }]}>
            <Ionicons name={c.ok ? 'checkmark' : 'close'} size={9} color={c.ok ? PELE.ok : PELE.grey} />
            <Text style={[s.chipTxt, { color: c.ok ? PELE.ok : PELE.grey }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { marginBottom: SPACE.md, marginTop: -4 },
  bars:    { flexDirection: 'row', gap: SPACE.xs, marginBottom: 6 },
  bar:     { flex: 1, height: 3, borderRadius: RADIUS.pill },
  chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt: { fontSize: 9.5, fontFamily: PELE_FONT.bodyMed },
});
