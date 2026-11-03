// CrewPact · Roda de MÊS e ANO (2026-11-03, esboço design/onboarding-v2.html; ref. DeepSeek/MacroFactor).
// A roda nativa do iOS não tem o modo "só mês e ano" → duas colunas que encaixam linha a linha.
// · Nunca no futuro: no ano atual, o mês fica preso ao mês atual.
// · `value` 'AAAA-MM'. O valor só nasce quando a pessoa MEXE (roda ou toca numa linha): uma
//   antiguidade por defeito, gravada sem querer, estragava o salário calculado.
// · VoiceOver: cada coluna é "ajustável" (deslizar para cima/baixo muda o valor).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { PELE, PELE_FONT, SPACE, RADIUS } from '../data/constants';
import { select } from '../data/haptics';

const ITEM = 40;      // altura de cada linha
const SIDE = 2;       // linhas visíveis acima e abaixo da escolhida
const MONTHS = {
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const parse = (v) => { const m = /^(\d{4})-(\d{2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2] } : null; };

export default function MonthYearWheel({ value, onChange, lang = 'pt', yearsBack = 50 }) {
  const names = MONTHS[lang] || MONTHS.pt;
  const now = new Date();
  const maxY = now.getFullYear();
  const maxM = now.getMonth() + 1;
  const years = Array.from({ length: yearsBack + 1 }, (_, i) => maxY - yearsBack + i);
  const [sel, setSel] = useState(() => parse(value) || { y: maxY - 5, m: 1 });
  const selRef = useRef(sel);
  const mRef = useRef(null);
  const yRef = useRef(null);

  // Posição inicial (sem animar) — depois do 1.º desenho, quando as listas já existem.
  useEffect(() => {
    const id = setTimeout(() => {
      mRef.current?.scrollTo({ y: (sel.m - 1) * ITEM, animated: false });
      yRef.current?.scrollTo({ y: Math.max(0, years.indexOf(sel.y)) * ITEM, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next, scroll = false) => {
    let { y, m } = next;
    y = Math.min(maxY, Math.max(years[0], y));
    m = Math.min(12, Math.max(1, m));
    if (y === maxY && m > maxM) m = maxM;                    // nunca no futuro
    const prev = selRef.current;
    if (y !== prev.y || m !== prev.m) select();
    selRef.current = { y, m };
    setSel({ y, m });
    if (scroll || m !== next.m) mRef.current?.scrollTo({ y: (m - 1) * ITEM, animated: true });
    if (scroll) yRef.current?.scrollTo({ y: years.indexOf(y) * ITEM, animated: true });
    onChange && onChange(`${y}-${String(m).padStart(2, '0')}`);
  };
  const endMonth = (e) => commit({ y: selRef.current.y, m: Math.round(e.nativeEvent.contentOffset.y / ITEM) + 1 });
  const endYear = (e) => commit({ y: years[Math.min(years.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM)))], m: selRef.current.m });

  const row = (label, i, selIdx, onPress, right = false) => {
    const d = Math.abs(i - selIdx);
    return (
      <TouchableOpacity key={label} onPress={onPress} activeOpacity={0.6} style={[s.item, right && s.right]} accessible={false}>
        <Text style={[d === 0 ? s.on : s.off, d === 1 && s.f1, d >= 2 && s.f2]} allowFontScaling={false}>{label}</Text>
      </TouchableOpacity>
    );
  };
  const a11y = (kind) => ({
    accessible: true,
    accessibilityRole: 'adjustable',
    accessibilityLabel: kind === 'm' ? (lang === 'en' ? 'Month' : 'Mês') : (lang === 'en' ? 'Year' : 'Ano'),
    accessibilityValue: { text: kind === 'm' ? names[sel.m - 1] : String(sel.y) },
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    onAccessibilityAction: (e) => {
      const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
      commit(kind === 'm' ? { y: sel.y, m: sel.m + step } : { y: sel.y + step, m: sel.m }, true);
    },
  });
  const list = { snapToInterval: ITEM, decelerationRate: 'fast', showsVerticalScrollIndicator: false, contentContainerStyle: s.pad, nestedScrollEnabled: true };

  return (
    <View style={s.wrap}>
      <View style={s.band} pointerEvents="none" />
      <View style={s.colM} {...a11y('m')}>
        <ScrollView ref={mRef} {...list} onMomentumScrollEnd={endMonth} onScrollEndDrag={endMonth}>
          {names.map((n, i) => row(n, i, sel.m - 1, () => commit({ y: sel.y, m: i + 1 }, true)))}
        </ScrollView>
      </View>
      <View style={s.colY} {...a11y('y')}>
        <ScrollView ref={yRef} {...list} onMomentumScrollEnd={endYear} onScrollEndDrag={endYear}>
          {years.map((y, i) => row(String(y), i, years.indexOf(sel.y), () => commit({ y, m: sel.m }, true), true))}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flexDirection: 'row', height: ITEM * (SIDE * 2 + 1), marginTop: SPACE.sm },
  // a faixa da linha escolhida, por trás das colunas
  band:  { position: 'absolute', left: 0, right: 0, top: ITEM * SIDE, height: ITEM, borderRadius: RADIUS.sm, backgroundColor: PELE.soft },
  colM:  { flex: 3, paddingLeft: SPACE.lgPlus },
  colY:  { flex: 2, paddingRight: SPACE.lgPlus },
  pad:   { paddingVertical: ITEM * SIDE },
  item:  { height: ITEM, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  on:    { fontFamily: PELE_FONT.bodyBold, fontSize: 20, color: PELE.ink, fontVariant: ['tabular-nums'] },
  off:   { fontFamily: PELE_FONT.bodyMed, fontSize: 17, color: PELE.grey, fontVariant: ['tabular-nums'] },
  f1:    { opacity: 0.6 },
  f2:    { opacity: 0.3 },
});
