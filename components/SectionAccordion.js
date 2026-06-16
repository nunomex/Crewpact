import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE } from '../data/constants';
import { useTheme } from '../App';

// Cabeçalho de secção (acordeão) — AE e FTL.
export function SectionHeader({ badge, title, count, open, onPress }) {
  const C = useTheme();
  const s = makeStyles(C);
  return (
    <TouchableOpacity style={[s.secHeader, open && s.secHeaderOpen]} activeOpacity={0.7} onPress={onPress}>
      <View style={s.secBadge}><Text style={s.secBadgeTxt}>{badge}</Text></View>
      <Text style={s.secTitle} numberOfLines={1}>{title}</Text>
      <Text style={s.secCount}>{count}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
    </TouchableOpacity>
  );
}

// Linha de item — badge à esquerda, título + subtítulo, ícones opcionais (calc / aplicável).
export function ListRow({ badge, badgeWide, title, sub, subUpper, calc, mine, mineLabel = 'Aplicável à tua categoria', onPress }) {
  const C = useTheme();
  const s = makeStyles(C);
  return (
    <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={onPress}>
      <View style={[s.badgeBox, badgeWide && s.badgeBoxWide]}><Text style={s.badgeTxt}>{badge}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={[s.rowSub, subUpper && s.rowSubUpper]} numberOfLines={1}>{sub}</Text>
      </View>
      {calc && <Ionicons name="calculator-outline" size={14} color={C.sub} />}
      {mine && <Ionicons name="person-circle" size={16} color={C.info} accessibilityLabel={mineLabel} />}
      <Ionicons name="chevron-forward" size={16} color={C.sub} />
    </TouchableOpacity>
  );
}

export function EmptyState({ text }) {
  const C = useTheme();
  const s = makeStyles(C);
  return <View style={s.empty}><Text style={s.emptyTxt}>{text}</Text></View>;
}

const makeStyles = (C) => StyleSheet.create({
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8, backgroundColor: C.card },
  secHeaderOpen: { borderColor: C.text, marginBottom: 6 },
  secBadge: { backgroundColor: C.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  secBadgeTxt: { color: '#fff', fontSize: TYPE.eyebrow, fontFamily: 'monospace' },
  secTitle: { flex: 1, fontSize: TYPE.sub, fontWeight: '600', letterSpacing: 0.5, color: C.text },
  secCount: { fontSize: 11, fontFamily: 'monospace', color: C.sub },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, padding: 12, marginBottom: 6, backgroundColor: C.card },
  badgeBox: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  badgeBoxWide: { width: 44 },
  badgeTxt: { color: '#fff', fontFamily: 'monospace', fontSize: 13 },
  rowTitle: { fontSize: TYPE.sub, fontWeight: '500', color: C.text },
  rowSub: { fontSize: TYPE.micro, color: C.sub, marginTop: 2 },
  rowSubUpper: { textTransform: 'uppercase', letterSpacing: 0.3 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { color: C.sub, fontSize: TYPE.body },
});
