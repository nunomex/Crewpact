// CrewPact · A linha das janelas (C1, esboço design/janelas-c.html, 2026-11-13).
//
// O quadradinho de 44 (o tamanho dos botões redondos do topo e do círculo do dia na Escala; era 36 até o Nuno ver no iPhone a
// 2026-11-14: "parece muito pequeno") que diz o que é (mapa das cores B, design-system §14: laranja "!" = olhar · vermelho "✕" = parar · neutro com
// o ícone do sítio = informação · tinta = a ação) · o título · a linha de baixo · à direita a hora (notificações) ou a seta (ir).
// O ponto laranja à esquerda marca o que é novo. `children` = o que vem por baixo da linha (os dias que mudaram).
// `old` = o antes, riscado por cima do título (R1, a janela "Rever a escala") · `right` = um nó à direita no lugar da hora/seta
// (o per diem, "Corrigir ›", o círculo de marcar) · `mark.dot` = uma bolinha de cor no quadradinho (a cor de um calendário).
// `mark.day` (+ `mark.wd`) = A LINHA É UM DIA (H2 + V1, design/janela-sincronizar-3.html, 2026-11-14): o quadradinho passa a dizer o
// dia ("14 sáb"), fica SEMPRE na cor do tipo, e o problema é um selo no canto (`mark.badge`: 'alert' "!" laranja · 'stop' "✕"
// vermelho) — o sinal do número do "Notificações" e do ponto laranja da Escala; não depende só da cor. A regra: o dia quando a
// linha é um dia, o ícone quando não é.
// Usada nas notificações (NotificationsBell) e na janela do calendário da Escala — uma peça só.
//
//   <MarkRow mark={{ bg: CARD.day.alert, glyph: '!' }} title="A escala mudou" sub="2 dias · toca para rever" time="Calendário" isNew onPress={…} />
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const W = CARD.day;

export default function MarkRow({ mark = {}, title, sub, old, time, chevron = false, right = null, isNew = false, onPress, first = false,
  a11yLabel, a11yLanguage, hint, a11yRole, a11yState, subTone, children }) {
  const Row = onPress ? TouchableOpacity : View;
  const fg = mark.fg || (mark.bg === W.ink ? W.sheet : CARD.onCard);
  return (
    <View style={[s.item, first ? null : s.rule]}>
      <Row style={s.row} {...(onPress ? { onPress, activeOpacity: 0.7, accessibilityRole: a11yRole || 'button', accessibilityHint: hint, accessibilityState: a11yState } : { accessible: true })}
        accessibilityLanguage={a11yLanguage} accessibilityLabel={a11yLabel || [title, sub, time].filter(Boolean).join('. ')}>
        {isNew ? <View style={[s.newDot, { backgroundColor: W.alert }]} /> : null}
        {mark.day != null ? <DayTile day={mark.day} wd={mark.wd} bg={mark.bg} badge={mark.badge} /> : (
          <View style={[s.mark, { backgroundColor: mark.bg || W.neutral }]}>
            {mark.dot ? <View style={[s.dot, { backgroundColor: mark.dot }]} />
              : mark.glyph ? <Text style={[TXT3.slimVal, { color: fg }]} allowFontScaling={false}>{mark.glyph}</Text>
              : <Icon name={mark.icon || 'info'} size={20} color={fg} />}
          </View>
        )}
        <View style={s.flex}>
          {old ? <Text style={[TXT3.cardSub, s.old, { color: W.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{old}</Text> : null}
          <Text style={[TXT3.slimTitle, { color: W.ink }]} maxFontSizeMultiplier={1.3}>{title}</Text>
          {sub ? <Text style={[TXT3.slimSub, { color: subTone || W.tabSub }]} maxFontSizeMultiplier={1.3}>{sub}</Text> : null}
        </View>
        {right || (time ? <Text style={[TXT3.factLbl, s.time, { color: W.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{time}</Text>
          : chevron ? <Icon name="chevron" size={14} color={W.tabSub} /> : null)}
      </Row>
      {children}
    </View>
  );
}

// O recuo do que vem por baixo da linha: alinhado com o texto (44 do quadradinho ou do dia + 12 de intervalo).
export const MARK_INDENT = 56;
export const MARK_DAY_INDENT = 56;

// O DIA NO QUADRADINHO (H2 + V1): o número e o dia da semana a tinta sobre a cor do tipo (tinta sobre voo 9,12 · terra 8,04 ·
// atenção 7,16 · passa 6,64), e o selo no canto quando há um problema. `small` = o das notificações (por baixo de uma linha).
export function DayTile({ day, wd, bg = W.neutral, badge = null, small = false }) {
  return (
    <View style={[small ? s.tileSm : s.tile, { backgroundColor: bg }]}>
      <Text style={[small ? s.tileNumSm : s.tileNum, { color: CARD.onCard }]} allowFontScaling={false}>{day}</Text>
      {wd ? <Text style={[TXT3.tab, { color: CARD.onCardSub }]} allowFontScaling={false}>{wd}</Text> : null}
      {badge ? (
        <View style={[s.badge, { backgroundColor: badge === 'stop' ? W.stop : W.alert, borderColor: W.sheet }]}>
          <Text style={[TXT3.badge, { color: CARD.badgeFg }]} allowFontScaling={false}>{badge === 'stop' ? '✕' : '!'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  item: { paddingVertical: SPACE.md },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  newDot: { position: 'absolute', left: -SPACE.md, width: 7, height: 7, borderRadius: RADIUS.pill },
  mark: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  time: { alignSelf: 'flex-start', maxWidth: 96 },
  old: { textDecorationLine: 'line-through' },
  dot: { width: 16, height: 16, borderRadius: RADIUS.pill },
  // o dia: 44 × 48 com o número a 20 (o círculo da Escala: 44 pt, número 20); o pequeno 34 × 38 fica para listas densas; o número sem lineHeight, para os algarismos ficarem ao centro (as métricas da Hanken)
  tile: { width: 44, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  tileSm: { width: 34, height: 38, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  tileNum: { fontFamily: TXT3.fact.fontFamily, fontSize: TXT3.fact.fontSize, fontVariant: ['tabular-nums'], marginBottom: -SPACE.xxs },
  tileNumSm: { fontFamily: TXT3.fact.fontFamily, fontSize: TXT3.lineVal.fontSize, fontVariant: ['tabular-nums'], marginBottom: -SPACE.xxs },
  badge: { position: 'absolute', top: -SPACE.s, right: -SPACE.s, width: 20, height: 20, borderRadius: RADIUS.pill, borderWidth: SPACE.xxs, alignItems: 'center', justifyContent: 'center' },
});
