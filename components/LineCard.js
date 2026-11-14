// CrewPact · O cartão neutro com linhas (direção 3.0, design-system §14 — o "lines" do Início e os cartões do Detalhe).
//
// Uma peça para as folhas e janelas (a Prova primeiro, 2026-11-14 — esboço design/prova-cartoes.html, P1), com as MESMAS medidas
// dos cartões do Detalhe (`Card`/`Panel` em screens/DutyDetailScreen.js): cantos 24 (`RADIUS.xxl`), margem 16, intervalo 12, o
// rótulo em cima (`TXT3.kind` a 80 % da tinta), as linhas com o rótulo à esquerda (`TXT3.line`) e o valor à direita
// (`TXT3.lineVal`), separadas por um fio, 44 pt de altura mínima.
//
//   <LineCard kind="A lei"><LineRows rows={[{ k: 'Artigo', v: 'ORO.FTL.205(b)' }, …]} /></LineCard>
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const W = CARD.day;

export default function LineCard({ kind, src, children, style }) {
  return (
    <View style={[s.card, style]}>
      {kind ? (
        <View style={s.head}>
          <Text style={[TXT3.kind, s.flex, { color: W.neutralKind }]}>{kind}</Text>
          {src ? <Text style={[TXT3.kind, { color: W.neutralKind }]}>{src}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// As linhas: { k (rótulo), v (valor), color? } — o valor pode partir em duas linhas (alinhado à direita).
export function LineRows({ rows = [] }) {
  const items = rows.filter((r) => r && r.v != null && r.v !== '');
  if (!items.length) return null;
  return (
    <View>
      {items.map((r, i) => (
        <View key={r.k} style={[s.row, i === 0 ? s.rowFirst : null]} accessible accessibilityLabel={`${r.k}: ${r.v}`}>
          <Text style={[TXT3.line, { color: W.ink }]}>{r.k}</Text>
          <Text style={[TXT3.lineVal, s.val, { color: r.color || W.ink }]}>{r.v}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: W.neutral, borderRadius: RADIUS.xxl, padding: SPACE.lg, gap: SPACE.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, minHeight: 44, paddingVertical: SPACE.sm, borderTopWidth: 1, borderTopColor: CARD.rule },
  rowFirst: { borderTopWidth: 0 },
  val: { flexShrink: 1, textAlign: 'right' },
});
