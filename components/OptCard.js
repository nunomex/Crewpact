// Cartão de opção (2026-11-03) — o MESMO na configuração (onboarding) e nas páginas do Perfil:
// "uma coisa a aprender". Código (Barlow) · nome · linha de apoio · círculo vazio OU visto amarelo
// (ou uma etiqueta, ex. "atual"). Borda 2 sempre (escolher não mexe no tamanho), raio 14.
// Referências: MyFitnessPal, Substack, Flighty (alertas). Saiu do OnboardingScreen.
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from './Icon';
import { PELE, BRAND, TXT, SPACE, RADIUS } from '../data/constants';

// Visto de seleção: disco amarelo (papel `marker`) + check a tinta, com um pop ao aparecer.
// Driver JS de propósito (lição do device 2026-11-02): um valor nativo preso deixava-o invisível.
export function SelTick({ reduce, style }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) { v.setValue(1); return; }
    Animated.spring(v, { toValue: 1, friction: 6, tension: 280, useNativeDriver: false }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[optStyles.tick, style, { transform: [{ scale: v }] }]}>
      <Icon name="check" size={12} color={PELE.ink} />
    </Animated.View>
  );
}

export default function OptCard({ code, label, sub, sel, tag, onPress, reduce, disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} style={[optStyles.opt, sel && optStyles.optSel]}
      accessibilityRole="button" accessibilityState={{ selected: !!sel, disabled: !!disabled }}
      accessibilityLabel={[code, label, sub, tag].filter(Boolean).join(', ')}>
      {code ? <Text style={[optStyles.code, sel && optStyles.codeSel]} allowFontScaling={false}>{code}</Text> : null}
      <View style={optStyles.optTxt}>
        <Text style={optStyles.lbl} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={optStyles.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {sel ? <SelTick reduce={reduce} /> : tag ? <Text style={optStyles.tag}>{tag}</Text> : <View style={optStyles.radio} />}
    </TouchableOpacity>
  );
}

// Códigos curtos ficam na coluna; os compridos ("PPY 9/12", "sazonal-50") já vão no nome.
export const shortCode = (code) => (code && String(code).length <= 5 ? String(code) : null);
// O código não se repete no nome: "Tempo inteiro (12/12)" → "Tempo inteiro".
export const cleanLabel = (label, code) => {
  if (!code || !label || !label.includes(code)) return label;
  return label.replace(`(${code})`, '').replace(code, '').replace(/\s{2,}/g, ' ').trim() || label;
};
// Lista de opções a partir dos ids de um AE (categorias, contratos, frotas).
export const itemsOf = (ids, labelFn, lang) => (ids || []).map((id) => ({ id, code: shortCode(id), label: cleanLabel(labelFn(id, lang), id) }));
// Pesquisa sem acentos nem maiúsculas.
export const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const optStyles = StyleSheet.create({
  opt:     { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderWidth: 2, borderColor: PELE.line, borderRadius: RADIUS.md, backgroundColor: PELE.paper, marginBottom: SPACE.sm },
  optSel:  { borderColor: PELE.ink },
  code:    { ...TXT.title, color: PELE.grey, minWidth: 46 },
  codeSel: { color: PELE.ink },
  optTxt:  { flex: 1, minWidth: 0 },
  lbl:     { ...TXT.callout, color: PELE.ink },
  sub:     { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.xxs },
  radio:   { width: 22, height: 22, borderRadius: 999, borderWidth: 1.5, borderColor: PELE.line },
  tick:    { width: 22, height: 22, borderRadius: 999, backgroundColor: BRAND.marker, alignItems: 'center', justifyContent: 'center' },
  tag:     { ...TXT.tag, color: PELE.grey, backgroundColor: PELE.soft, borderRadius: 999, paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, overflow: 'hidden' },
});
