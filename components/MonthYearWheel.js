// CrewPact · Roda de MÊS e ANO (2026-11-03, esboço design/onboarding-v2.html; ref. DeepSeek/MacroFactor).
// A roda nativa do iOS não tem o modo "só mês e ano" → duas colunas que encaixam linha a linha.
// · Nunca no futuro: no ano atual, o mês fica preso ao mês atual.
// · `value` 'AAAA-MM'. O valor só nasce quando a pessoa MEXE (roda ou toca numa linha): uma
//   antiguidade por defeito, gravada sem querer, estragava o salário calculado.
// · VoiceOver: cada coluna é "ajustável" (deslizar para cima/baixo muda o valor).
// · `withDay` (2026-11-08, ref. Open e Lifesum em referencias/perfil-dia-entrada): uma coluna do DIA à esquerda (dia · mês ·
//   ano), a começar em "—" = não sei o dia. `value`/`onChange` 'AAAA-MM' (sem o dia) ou 'AAAA-MM-DD'. O dia nunca passa do
//   último do mês, nem de hoje no mês atual.
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
const NO_DAY = '—';
const parse = (v) => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v || ''); return m ? { y: +m[1], m: +m[2], d: m[3] ? +m[3] : null } : null; };
const dimOf = (y, m) => new Date(y, m, 0).getDate();

// monthsAhead (2026-11-03): quantos meses À FRENTE se aceitam (0 = nunca no futuro, a antiguidade;
// 12 = uma promoção ou mudança de contrato já marcada).
export default function MonthYearWheel({ value, onChange, lang = 'pt', yearsBack = 50, monthsAhead = 0, withDay = false }) {
  const names = MONTHS[lang] || MONTHS.pt;
  const now = new Date();
  const lim = new Date(now.getFullYear(), now.getMonth() + Math.max(0, monthsAhead), 1);
  const maxY = lim.getFullYear();
  const maxM = lim.getMonth() + 1;
  const firstY = now.getFullYear() - yearsBack;
  const years = Array.from({ length: maxY - firstY + 1 }, (_, i) => firstY + i);
  // O último dia que se pode escolher: o do mês, ou hoje no mês atual (sem meses à frente).
  const maxDay = (y, m) => { const dim = dimOf(y, m); return (monthsAhead === 0 && y === now.getFullYear() && m === now.getMonth() + 1) ? Math.min(dim, now.getDate()) : dim; };
  const [sel, setSel] = useState(() => { const p = parse(value); return p ? { y: p.y, m: p.m, d: withDay ? p.d : null } : { y: now.getFullYear() - 5, m: 1, d: null }; });
  const selRef = useRef(sel);
  const dRef = useRef(null);
  const mRef = useRef(null);
  const yRef = useRef(null);
  // A coluna do dia só ouve o DEDO: quando o mês muda e a lista encolhe (31 → 30 linhas), o iOS reajusta a posição sozinho e esse
  // movimento chegava como se fosse uma escolha (no iPhone, 31 passava a 29 em vez de 30 — visto a 2026-11-11).
  const dayByUser = useRef(false);

  // Posição inicial (sem animar) — depois do 1.º desenho, quando as listas já existem.
  useEffect(() => {
    const id = setTimeout(() => {
      if (withDay) dRef.current?.scrollTo({ y: (sel.d || 0) * ITEM, animated: false });
      mRef.current?.scrollTo({ y: (sel.m - 1) * ITEM, animated: false });
      yRef.current?.scrollTo({ y: Math.max(0, years.indexOf(sel.y)) * ITEM, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next, scroll = false) => {
    let { y, m, d } = next;
    y = Math.min(maxY, Math.max(years[0], y));
    m = Math.min(12, Math.max(1, m));
    if (y === maxY && m > maxM) m = maxM;                    // nunca no futuro
    if (!withDay) d = null;
    else if (d != null) d = Math.min(maxDay(y, m), Math.max(1, d));   // um mês mais curto (ou o de hoje) corta o dia
    const prev = selRef.current;
    if (y !== prev.y || m !== prev.m || d !== prev.d) select();
    selRef.current = { y, m, d };
    setSel({ y, m, d });
    if (scroll || m !== next.m) mRef.current?.scrollTo({ y: (m - 1) * ITEM, animated: true });
    if (scroll) yRef.current?.scrollTo({ y: years.indexOf(y) * ITEM, animated: true });
    if (withDay && (scroll || d !== next.d || m !== prev.m || y !== prev.y)) { dayByUser.current = false; dRef.current?.scrollTo({ y: (d || 0) * ITEM, animated: true }); }
    onChange && onChange(`${y}-${String(m).padStart(2, '0')}${withDay && d ? `-${String(d).padStart(2, '0')}` : ''}`);
  };
  const endDay = (e) => { if (!dayByUser.current) return; const i = Math.round(e.nativeEvent.contentOffset.y / ITEM); commit({ ...selRef.current, d: i <= 0 ? null : i }); };
  const endMonth = (e) => commit({ ...selRef.current, m: Math.round(e.nativeEvent.contentOffset.y / ITEM) + 1 });
  const endYear = (e) => commit({ ...selRef.current, y: years[Math.min(years.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM)))] });

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
    accessibilityLabel: kind === 'd' ? (lang === 'en' ? 'Day' : 'Dia') : kind === 'm' ? (lang === 'en' ? 'Month' : 'Mês') : (lang === 'en' ? 'Year' : 'Ano'),
    accessibilityValue: { text: kind === 'd' ? (sel.d ? String(sel.d) : (lang === 'en' ? 'unknown' : 'não sei')) : kind === 'm' ? names[sel.m - 1] : String(sel.y) },
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    onAccessibilityAction: (e) => {
      const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
      if (kind === 'd') { const nd = (sel.d || 0) + step; commit({ ...sel, d: nd <= 0 ? null : nd }, true); return; }
      commit(kind === 'm' ? { ...sel, m: sel.m + step } : { ...sel, y: sel.y + step }, true);
    },
  });
  const list = { snapToInterval: ITEM, decelerationRate: 'fast', showsVerticalScrollIndicator: false, contentContainerStyle: s.pad, nestedScrollEnabled: true };
  const days = withDay ? [NO_DAY, ...Array.from({ length: maxDay(sel.y, sel.m) }, (_, i) => String(i + 1))] : [];

  return (
    <View style={s.wrap}>
      <View style={s.band} pointerEvents="none" />
      {withDay ? (
        <View style={s.colD} {...a11y('d')}>
          <ScrollView ref={dRef} {...list} onScrollBeginDrag={() => { dayByUser.current = true; }} onMomentumScrollEnd={endDay} onScrollEndDrag={endDay}>
            {days.map((n, i) => row(n, i, sel.d || 0, () => commit({ ...sel, d: i === 0 ? null : i }, true)))}
          </ScrollView>
        </View>
      ) : null}
      <View style={[s.colM, withDay && s.colMd]} {...a11y('m')}>
        <ScrollView ref={mRef} {...list} onMomentumScrollEnd={endMonth} onScrollEndDrag={endMonth}>
          {names.map((n, i) => row(n, i, sel.m - 1, () => commit({ ...sel, m: i + 1 }, true)))}
        </ScrollView>
      </View>
      <View style={s.colY} {...a11y('y')}>
        <ScrollView ref={yRef} {...list} onMomentumScrollEnd={endYear} onScrollEndDrag={endYear}>
          {years.map((y, i) => row(String(y), i, years.indexOf(sel.y), () => commit({ ...sel, y }, true), true))}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { flexDirection: 'row', height: ITEM * (SIDE * 2 + 1), marginTop: SPACE.sm },
  // a faixa da linha escolhida, por trás das colunas
  band:  { position: 'absolute', left: 0, right: 0, top: ITEM * SIDE, height: ITEM, borderRadius: RADIUS.sm, backgroundColor: PELE.soft },
  colD:  { flex: 1, paddingLeft: SPACE.lgPlus },
  colM:  { flex: 3, paddingLeft: SPACE.lgPlus },
  colMd: { paddingLeft: SPACE.sm },
  colY:  { flex: 2, paddingRight: SPACE.lgPlus },
  pad:   { paddingVertical: ITEM * SIDE },
  item:  { height: ITEM, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  on:    { fontFamily: PELE_FONT.bodyBold, fontSize: 20, color: PELE.ink, fontVariant: ['tabular-nums'] },
  off:   { fontFamily: PELE_FONT.bodyMed, fontSize: 17, color: PELE.grey, fontVariant: ['tabular-nums'] },
  f1:    { opacity: 0.6 },
  f2:    { opacity: 0.3 },
});
