// A BARRA DO DIA da Escala em agenda (design-system §14, 2026-11-13; esboços design/escala-agenda.html — A2 — e
// design/escala-passado.html — D). Só desenha o que data/escalaDay.js · agendaRows decidiu.
//   DayBar — um dia com serviço (ou férias/baixa): a data à esquerda, o título (o voo manda), a lua da pernoita, os dois pontos
//            de dois serviços e, à direita, a hora (dias que vêm) ou o que rendeu (dias feitos).
//            · hoje e o que vem: o fundo na cor do tipo (areia voo · lilás terra · neutro férias e baixa);
//            · JÁ FEITO (D): o fundo a cinzento claro (neutro) e a cor do tipo num ponto ao lado do título — o passado
//              distingue-se de relance e continua todo legível (o título a 16:1, o € na pílula branca a 6,3:1).
//   OffBar — os dias vazios seguidos numa linha tracejada ("Folga · 2 dias" / "Sem serviços na escala").
//   DayCol — a coluna da data do dia aberto (hoje = número num círculo a tinta).
// Toque: a barra inteira abre o dia no sítio (acordeão). Acessibilidade: um botão com tudo o que a barra diz.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';

const MAX_SCALE = 1.3;
const toneOf = (C, kind) => (kind === 'voo' ? C.sand : kind === 'terra' ? C.lilac : C.neutral);

export function DayCol({ day, wd, today, C }) {
  return (
    <View style={s.col}>
      {today ? (
        <View style={[s.todayDot, { backgroundColor: C.ink }]}><Text style={[TXT.headline, { color: C.sheet }]} allowFontScaling={false}>{day}</Text></View>
      ) : <Text style={[TXT3.cardNum, { color: C.ink }]} allowFontScaling={false}>{day}</Text>}
      <Text style={[TXT.tag, { color: C.tabSub }]} allowFontScaling={false}>{wd}</Text>
    </View>
  );
}

export function DayBar({ row, C, onPress, l }) {
  const past = row.past;
  const bg = past ? C.neutral : toneOf(C, row.kind);
  const fg = past || row.kind === 'fer' || row.kind === 'doe' ? C.ink : CARD.onCard;
  const a11y = [`${row.wd} ${row.day}`, row.today ? l('hoje', 'today') : null, row.title, row.ns ? l('pernoita', 'night stop') : null,
    row.two ? l('dois serviços', 'two duties') : null, row.right && row.right.gain ? `${l('rendeu', 'earned')} ${row.right.gain}` : row.right && row.right.time,
    past ? l('já feito', 'done') : null].filter(Boolean).join(', ');
  return (
    <TouchableOpacity style={[s.bar, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}
      accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint={l('Abre o dia', 'Opens the day')}>
      <View style={s.date}>
        {row.today ? (
          <View style={[s.todayDotSm, { backgroundColor: C.ink }]}><Text style={[TXT.bodyStrong, { color: C.sheet }]} allowFontScaling={false}>{row.day}</Text></View>
        ) : <Text style={[TXT.headline, { color: fg }]} allowFontScaling={false}>{row.day}</Text>}
        <Text style={[TXT.tag, { color: fg }]} allowFontScaling={false}>{row.wd}</Text>
      </View>
      {past ? <View style={[s.sq, { backgroundColor: toneOf(C, row.kind) }]} /> : null}
      <View style={s.titleRow}>
        <Text style={[TXT3.slimTitle, s.title, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{row.title}</Text>
        {row.ns ? <Icon name="moon" size={12} color={fg} /> : null}
      </View>
      {row.two ? (
        <View style={s.dots}><View style={[s.dot, { backgroundColor: CARD.onCardSub }]} /><View style={[s.dot, { backgroundColor: CARD.onCardSub }]} /></View>
      ) : null}
      {row.right && row.right.gain ? (
        <View style={s.chip}><Text style={[TXT3.chip, { color: CARD.gain }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{row.right.gain}</Text></View>
      ) : row.right && row.right.time ? (
        <Text style={[TXT.label, s.time, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{row.right.time}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export function OffBar({ row, C, l }) {
  const range = row.dFrom === row.dTo ? String(row.dFrom) : `${row.dFrom}–${row.dTo}`;
  const label = row.n > 1 && row.folga ? `${row.label} · ${row.n} ${l('dias', 'days')}` : row.label;
  return (
    <View style={s.offRow} accessible accessibilityLabel={`${range}: ${label}${row.today ? `, ${l('hoje', 'today')}` : ''}`}>
      <View style={s.offDate}>
        {row.today ? (
          <View style={[s.todayDotSm, { backgroundColor: C.ink }]}><Text style={[TXT.bodyStrong, { color: C.sheet }]} allowFontScaling={false}>{range}</Text></View>
        ) : <Text style={[TXT.bodyStrong, { color: C.caption }]} allowFontScaling={false}>{range}</Text>}
      </View>
      <View style={[s.offLine, { borderColor: C.round }]}>
        <Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { minHeight: 52, borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.s, flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  date: { width: 40, alignItems: 'center' },
  todayDotSm: { minWidth: 28, height: 28, paddingHorizontal: SPACE.xs, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  sq: { width: 12, height: 12, borderRadius: RADIUS.pill },   // o ponto de cor do tipo (D)
  titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  title: { flexShrink: 1 },
  dots: { flexDirection: 'row', gap: SPACE.xs },
  dot: { width: 4, height: 4, borderRadius: RADIUS.pill },
  chip: { height: 26, paddingHorizontal: SPACE.sm, borderRadius: RADIUS.pill, backgroundColor: CARD.chip, justifyContent: 'center', flexShrink: 0 },
  time: { flexShrink: 0, fontVariant: ['tabular-nums'] },
  offRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  offDate: { width: 40, marginLeft: SPACE.md, alignItems: 'center' },   // alinhada com a data das barras (12 + 20)
  offLine: { flex: 1, minHeight: 36, borderRadius: RADIUS.pill, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', paddingHorizontal: SPACE.md },
  col: { width: 40, alignItems: 'center', paddingTop: SPACE.sm, gap: SPACE.xxs },
  todayDot: { width: 34, height: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
});
