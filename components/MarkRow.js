// CrewPact · A linha das janelas (C1, esboço design/janelas-c.html, 2026-11-13).
//
// O quadradinho de 36 que diz o que é (mapa das cores B, design-system §14: laranja "!" = olhar · vermelho "✕" = parar · neutro com
// o ícone do sítio = informação · tinta = a ação) · o título · a linha de baixo · à direita a hora (notificações) ou a seta (ir).
// O ponto laranja à esquerda marca o que é novo. `children` = o que vem por baixo da linha (os dias que mudaram).
// Usada nas notificações (NotificationsBell) e na janela do calendário da Escala — uma peça só.
//
//   <MarkRow mark={{ bg: CARD.day.alert, glyph: '!' }} title="A escala mudou" sub="2 dias · toca para rever" time="Calendário" isNew onPress={…} />
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const W = CARD.day;

export default function MarkRow({ mark = {}, title, sub, time, chevron = false, isNew = false, onPress, first = false,
  a11yLabel, a11yLanguage, hint, children }) {
  const Row = onPress ? TouchableOpacity : View;
  const fg = mark.fg || (mark.bg === W.ink ? W.sheet : CARD.onCard);
  return (
    <View style={[s.item, first ? null : s.rule]}>
      <Row style={s.row} {...(onPress ? { onPress, activeOpacity: 0.7, accessibilityRole: 'button', accessibilityHint: hint } : { accessible: true })}
        accessibilityLanguage={a11yLanguage} accessibilityLabel={a11yLabel || [title, sub, time].filter(Boolean).join('. ')}>
        {isNew ? <View style={[s.newDot, { backgroundColor: W.alert }]} /> : null}
        <View style={[s.mark, { backgroundColor: mark.bg || W.neutral }]}>
          {mark.glyph ? <Text style={[TXT3.slimTitle, { color: fg }]} allowFontScaling={false}>{mark.glyph}</Text>
            : <Icon name={mark.icon || 'info'} size={17} color={fg} />}
        </View>
        <View style={s.flex}>
          <Text style={[TXT3.lineVal, { color: W.ink }]} maxFontSizeMultiplier={1.3}>{title}</Text>
          {sub ? <Text style={[TXT3.cardSub, { color: W.tabSub }]} maxFontSizeMultiplier={1.3}>{sub}</Text> : null}
        </View>
        {time ? <Text style={[TXT3.factLbl, s.time, { color: W.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{time}</Text>
          : chevron ? <Icon name="chevron" size={14} color={W.tabSub} /> : null}
      </Row>
      {children}
    </View>
  );
}

// O recuo do que vem por baixo da linha: alinhado com o texto (36 do quadradinho + 12 de intervalo).
export const MARK_INDENT = 48;

const s = StyleSheet.create({
  flex: { flex: 1 },
  item: { paddingVertical: SPACE.md },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  newDot: { position: 'absolute', left: -SPACE.md, width: 7, height: 7, borderRadius: RADIUS.pill },
  mark: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  time: { alignSelf: 'flex-start', maxWidth: 96 },
});
