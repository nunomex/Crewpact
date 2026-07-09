import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, PELE, PELE_FONT } from '../data/constants';

// Botão primário canónico — PELE-FICADO 2026-07-09 (era o último resíduo do tema antigo):
// ink + texto papel + spinner AMARELO (a marca), Hanken pesado. A API não mudou (label,
// onPress, icon Ionicons, disabled, loading, tone 'ink'|'danger', radius 'pill'|'lg',
// style, ...rest) → os 9 consumidores rendem pele sem tocar em nenhum call-site.
export default function PrimaryButton({ label, onPress, icon, disabled = false, loading = false, tone = 'ink', radius = 'pill', elevated = false, style, ...rest }) {
  const bg = disabled ? PELE.soft : tone === 'danger' ? PELE.red : PELE.ink;
  const fg = disabled ? PELE.grey : PELE.paper;
  return (
    // role/state p/ leitor de ecrã; em loading o NOME mantém-se (o spinner apagava-o) e "ocupado".
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
      accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} accessibilityLabel={label}
      style={[s.base, { backgroundColor: bg, borderRadius: radius === 'lg' ? RADIUS.lg : RADIUS.pill }, style]} {...rest}>
      {loading ? <ActivityIndicator color={tone === 'ink' && !disabled ? PELE.yellow : fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
          <Text style={[s.txt, { color: fg }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  txt: { fontSize: 14, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.3 },
});
