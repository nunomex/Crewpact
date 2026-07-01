import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, FONT } from '../data/constants';
import { t } from '../data/i18n';
import { useTheme } from '../data/appContext';

// Medidor de força da palavra-passe (4 critérios) — partilhado entre Login e Onboarding.
// Mesmos critérios que o validatePassword de registo (8+, maiúscula, número) + carácter especial.
export default function StrengthBar({ password, lang }) {
  const C = useTheme();
  const s = makeStyles(C);
  const checks = [
    { label: t('st.8', lang),       ok: password.length >= 8 },
    { label: t('st.lower', lang),   ok: /[a-z]/.test(password) },
    { label: t('st.upper', lang),   ok: /[A-Z]/.test(password) },
    { label: t('st.num', lang),     ok: /[0-9]/.test(password) },
    { label: t('st.special', lang), ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = [C.line, C.red, C.red, C.warn, C.warn, C.green];   // 0…5 critérios
  if (!password) return null;
  return (
    <View style={s.wrap}>
      <View style={s.bars}>
        {checks.map((_, i) => (
          <View key={i} style={[s.bar, { backgroundColor: i < score ? colors[score] : C.line }]} />
        ))}
      </View>
      <View style={s.chips}>
        {checks.map((c, i) => (
          <View key={i} style={[s.chip, { backgroundColor: c.ok ? C.greenSoft : C.soft }]}>
            <Ionicons name={c.ok ? 'checkmark' : 'close'} size={9} color={c.ok ? C.green : C.sub} />
            <Text style={[s.chipTxt, { color: c.ok ? C.green : C.sub }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  wrap:    { marginBottom: SPACE.md, marginTop: -4 },
  bars:    { flexDirection: 'row', gap: SPACE.xs, marginBottom: 6 },
  bar:     { flex: 1, height: 3, borderRadius: RADIUS.pill },
  chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.pill, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt: { fontSize: TYPE.micro, fontFamily: FONT.medium },
});
