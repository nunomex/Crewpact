// CrewPact · O botão escrito (Início 3.0, 2026-11-13 — esboços design/janelas-c.html C1 e design/botoes-escritos.html S1).
//
// Uma pílula de contorno com o nome escrito, no lugar dos botões redondos de ícone:
//   "Fechar" em todas as janelas (no lugar do ✕) · "Sincronizar" na Escala · "Notificações" no Início.
// Em português escreve-se a palavra inteira (as interfaces em pt-PT não abreviam "Sinc." nem "Notif."; "Sync" é inglês).
//   38 pt visível · contorno 1,5 na tinta · texto TXT3.pill (13) · área de toque 44 pt (hitSlop) · rótulo de acessibilidade.
//   `badge`: um número (a contagem por ler, num círculo laranja no canto; mais de 9 → "9+") ou `true` (só o ponto).
// A largura para as contas da fila do topo é `pillWidth(label)` (components/HomeCards.js), a mesma das outras pílulas.
//
//   <PillButton label={t('common.close', lang)} onPress={onClose} />
//   <PillButton label="Notificações" badge={3} ring={C.desk} onPress={open} a11yLabel="Notificações · 3 por ler" />
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const H = 38;
const SLOP = { top: (44 - H) / 2, bottom: (44 - H) / 2, left: SPACE.xxs, right: SPACE.xxs };

export default function PillButton({ label, onPress, ink = CARD.day.ink, ring = null, badge = null, badgeBg = CARD.day.alert,
  a11yLabel, hint, a11yLanguage, style, disabled = false, testID }) {
  const n = typeof badge === 'number' ? badge : 0;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} hitSlop={SLOP} testID={testID}
      accessibilityRole="button" accessibilityLabel={a11yLabel || label} accessibilityHint={hint} accessibilityLanguage={a11yLanguage}
      accessibilityState={{ disabled }} style={[s.pill, { borderColor: ink }, disabled ? s.off : null, style]}>
      <Text style={[TXT3.pill, { color: ink }]} numberOfLines={1} allowFontScaling={false}>{label}</Text>
      {n > 0 ? (
        <View style={[s.badge, { backgroundColor: badgeBg }, ring ? { borderColor: ring, borderWidth: SPACE.xxs } : null]}>
          <Text style={[TXT3.badge, { color: CARD.badgeFg }]} allowFontScaling={false}>{n > 9 ? '9+' : n}</Text>
        </View>
      ) : badge === true ? (
        <View style={[s.dot, { backgroundColor: badgeBg }, ring ? { borderColor: ring, borderWidth: SPACE.xxs } : null]} />
      ) : null}
    </TouchableOpacity>
  );
}

// O botão largo no fundo das janelas (C1, 2026-11-13): a única coisa que se faz na janela, onde o polegar chega — "Fechar"
// em cima, a ação larga em baixo. Tinta com a letra da folha; `glyph` = um ícone da casa à esquerda.
//   <WideButton label="Rever 2 alterações" onPress={openRoster} />
export function WideButton({ label, onPress, glyph, bg = CARD.day.ink, fg = CARD.day.sheet, a11yLabel, hint, a11yLanguage, disabled = false, style }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={a11yLabel || label}
      accessibilityHint={hint} accessibilityLanguage={a11yLanguage} accessibilityState={{ disabled }} style={[s.wide, { backgroundColor: bg }, disabled ? s.off : null, style]}>
      {glyph ? <Icon name={glyph} size={18} color={fg} /> : null}
      <Text style={[TXT3.slimTitle, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wide: { minHeight: 54, borderRadius: RADIUS.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg },
  pill: { height: H, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  off: { opacity: 0.4 },
  // o selo no canto (como no esboço S1): 20 pt com o anel da cor do fundo, meio por fora da pílula
  badge: { position: 'absolute', top: -SPACE.sm, right: -SPACE.s, minWidth: 20, height: 20, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.xs, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -SPACE.xxs, right: -SPACE.xxs, width: 12, height: 12, borderRadius: RADIUS.pill },
});
