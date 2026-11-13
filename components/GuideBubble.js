// O BALÃO DAS GUIAS — uma peça só para a app toda (regras aprovadas pelo Nuno a 2026-11-13; o piloto é a legenda da Escala,
// design/escala-legenda-3.html, J3). Um cartão escuro com uma seta que aponta para o sítio de que fala, o texto, "1 de 6",
// "Saltar" e "Seguinte" (no último, "Já percebi"). Quem o usa decide onde fica (position absolute: left + top ou bottom) e para
// onde aponta a seta (arrowX, a partir da esquerda do balão; above = o balão está por cima do sítio, a seta em baixo).
// Regras das guias: só onde há um sinal ou gesto que não se adivinha · no máximo 6 balões, sobre os dados verdadeiros · na 1.ª vez
// que o ecrã é usado com dados, um ecrã de cada vez · sempre "Saltar", e repete-se no próprio ecrã · o VoiceOver lê o balão
// (quem o usa anuncia o texto) · sem animação (nada a respeitar nos movimentos reduzidos).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CARD, TXT, TXT3, SPACE, RADIUS, SHADOW } from '../data/constants';

const INK = CARD.day.ink, PAPER = CARD.day.sheet, SOFT = CARD.night.soft;   // o balão é sempre escuro, de dia e de noite
const ARROW = 14;

export default function GuideBubble({ text, step, total, onNext, onSkip, width, arrowX = SPACE.xl, above = false, style, l }) {
  const last = step >= total;
  return (
    <View style={[s.box, { width, backgroundColor: INK }, style]} accessibilityLiveRegion="polite">
      <View style={[s.arrow, { left: Math.max(SPACE.md, Math.min(width - ARROW - SPACE.md, arrowX - ARROW / 2)), backgroundColor: INK }, above ? s.arrowDown : s.arrowUp]} pointerEvents="none" />
      <Text style={[TXT3.text, { color: PAPER }]}>{text}</Text>
      <View style={s.bar}>
        <Text style={[TXT.caption, s.flex, { color: SOFT }]} allowFontScaling={false}>{`${step} ${l('de', 'of')} ${total}`}</Text>
        {!last ? (
          <TouchableOpacity onPress={onSkip} hitSlop={{ top: SPACE.sm, bottom: SPACE.sm, left: SPACE.sm, right: SPACE.sm }} accessibilityRole="button" accessibilityLabel={l('Saltar a guia', 'Skip the guide')}>
            <Text style={[TXT.label, { color: SOFT }]}>{l('Saltar', 'Skip')}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onNext} style={[s.next, { backgroundColor: PAPER }]} activeOpacity={0.8} accessibilityRole="button">
          <Text style={[TXT.label, { color: INK }]}>{last ? l('Já percebi', 'Got it') : l('Seguinte', 'Next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { position: 'absolute', borderRadius: RADIUS.lg, padding: SPACE.md, gap: SPACE.sm, zIndex: 10, ...SHADOW.md },
  arrow: { position: 'absolute', width: ARROW, height: ARROW, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  arrowUp: { top: -ARROW / 2 + 1 },
  arrowDown: { bottom: -ARROW / 2 + 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  flex: { flex: 1 },
  next: { height: 32, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
});
