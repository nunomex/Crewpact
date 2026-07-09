import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, PELE, PELE_FONT } from '../data/constants';

// Tom do banner → fundo suave + borda + acento do ÍCONE (tokens da PELE).
// A pílula de ação é INK (texto papel = contraste máximo, acessível).
const TONES = {
  warn: { soft: PELE.warnSoft, border: '#F2CBA5', accent: PELE.warn },
  info: { soft: PELE.info, border: '#CBDDE9', accent: '#3A6A8A' },
};

// Banner horizontal de aviso/info — PELE-FICADO 2026-07-09 (API intacta).
// Props: icon (Ionicons), title, sub, tone ('warn'|'info'), onPress, actionLabel, style.
export default function Banner({ icon, title, sub, tone = 'warn', onPress, actionLabel, style, ...rest }) {
  const tn = TONES[tone] || TONES.warn;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.wrap, { backgroundColor: tn.soft, borderColor: tn.border }, style]} {...rest}>
      {icon ? <Ionicons name={icon} size={20} color={tn.accent} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {actionLabel
        ? <View style={s.go}><Text style={s.goTxt}>{actionLabel}</Text></View>
        : <Ionicons name="chevron-forward" size={18} color={PELE.grey} />}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: RADIUS.lg, padding: 13 },
  title: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  sub: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 2 },
  go: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: PELE.ink },
  goTxt: { color: PELE.paper, fontSize: 12, fontFamily: PELE_FONT.bodyBold },
});
