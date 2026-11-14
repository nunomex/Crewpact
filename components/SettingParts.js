// CrewPact · As peças das PÁGINAS DO PERFIL no aspeto novo (G1 de design/perfil-paginas.html, escolhida pelo Nuno a 2026-11-14).
// Imagens do Nuno: 3454 (a opção escolhida a tinta) · 3442 (os campos num cartão neutro com fios) · 3412/3434 (o seletor com a
// pílula) · 3419 (o número com a unidade pequena) · 3431 (os movimentos datados → o histórico) · 3461 (os seletores do sistema
// dentro das folhas → a roda do mês) · 3424 (o chip "ATUAL"). Mobbin: Future Pro, Claude, Waymo, Substack (as opções num só cartão,
// título + explicação + ✓ à direita). Só o desenho: as gravações continuam em hooks/usePerfilActions.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { WideButton } from './PillButton';
import MonthYearWheel from './MonthYearWheel';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';

const C = CARD.day;
const MAX = 1.3;

// ── As opções num só cartão: título (o código, quando há), a explicação, o chip "ATUAL" e o ✓ a tinta ──
// items: [{ id, code, label, sub }] · isSel(id) · isCur(id) · onPick(id)
export function ChoiceCard({ items = [], isSel, isCur, onPick, l, title }) {
  return (
    <View style={s.card} accessibilityRole="radiogroup">
      {title ? <Text style={[TXT3.kind, s.cardKind, { color: C.neutralKind }]}>{title}</Text> : null}
      {items.map((it, i) => {
        const sel = !!(isSel && isSel(it.id));
        const cur = !!(isCur && isCur(it.id));
        const head = it.code || it.label;
        const sub = [it.code && it.label && it.label !== it.code ? it.label : null, it.sub].filter(Boolean).join(' · ');
        return (
          <TouchableOpacity key={String(it.id)} style={[s.row, i === 0 && !title ? s.rowFirst : null]} onPress={() => onPick && onPick(it.id)} activeOpacity={0.7}
            accessibilityRole="radio" accessibilityState={{ checked: sel }} accessibilityLabel={[head, sub, cur ? l('atual', 'current') : null].filter(Boolean).join(', ')}>
            <View style={s.flex}>
              <View style={s.headRow}>
                <Text style={[TXT3.slimTitle, s.flexShrink, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{head}</Text>
                {cur ? <View style={s.chip}><Text style={[TXT3.badge, { color: C.ink }]} allowFontScaling={false}>{l('ATUAL', 'CURRENT')}</Text></View> : null}
              </View>
              {sub ? <Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={2} maxFontSizeMultiplier={MAX}>{sub}</Text> : null}
            </View>
            {sel ? <View style={s.tick}><Icon name="check" size={14} color={C.sheet} /></View> : <View style={s.ring} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── "A partir de": um campo (rótulo pequeno, valor grande) que abre a roda do mês numa folha ──
export function MonthField({ label, value, onChange, lang = 'pt', monthsAhead = 0, l }) {
  const [open, setOpen] = useState(false);
  const [tmp, setTmp] = useState(value);
  const shown = (() => {
    const m = /^(\d{4})-(\d{2})/.exec(String(value || ''));
    return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long', year: 'numeric' }) : l('Escolher', 'Choose');
  })();
  return (
    <>
      <TouchableOpacity style={s.field} onPress={() => { setTmp(value); setOpen(true); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${label}: ${shown}`} accessibilityHint={l('Abre a roda do mês', 'Opens the month wheel')}>
        <View style={s.flex}>
          <Text style={[TXT3.kind, { color: C.neutralKind }]} maxFontSizeMultiplier={MAX}>{label}</Text>
          <Text style={[TXT3.fact, s.fieldVal, { color: C.ink }]} numberOfLines={1} maxFontSizeMultiplier={MAX}>{shown}</Text>
        </View>
        <Icon name="chevron" size={14} color={C.caption} />
      </TouchableOpacity>
      <PeleSheet visible={open} onClose={() => setOpen(false)} bg={C.sheet}>
        <SheetHeader card title={label} onClose={() => setOpen(false)} closeLabel={l('Fechar', 'Close')} style={s.sheetHead} />
        <MonthYearWheel value={tmp} onChange={setTmp} lang={lang} monthsAhead={monthsAhead} />
        <WideButton label={l('Escolher', 'Choose')} onPress={() => { onChange && onChange(tmp); setOpen(false); }} style={s.sheetBtn} />
      </PeleSheet>
    </>
  );
}

// ── O histórico como uma pequena linha do tempo (3431): um ponto por período, o de hoje cheio ──
export function HistoryLine({ items = [], l }) {
  if (!items.length) return null;
  return (
    <View style={s.hist} accessible accessibilityLabel={`${l('Histórico', 'History')}: ${items.join(', ')}`}>
      <Text style={[TXT3.kind, { color: C.neutralKind }]} maxFontSizeMultiplier={MAX}>{l('Histórico', 'History')}</Text>
      <View style={s.histRow}>
        {items.map((t, i) => (
          <View key={`${t}${i}`} style={s.histItem}>
            {i > 0 ? <View style={s.histDash} /> : null}
            <View style={[s.histDot, i === items.length - 1 ? s.histNow : null]} />
            <Text style={[TXT3.cardSub, { color: C.soft }]} maxFontSizeMultiplier={MAX}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── O seletor com a pílula (3412 · 3434) — o pós-voo ──
export function PillSelect({ options = [], value, onPick, l, unit }) {
  return (
    <View style={s.seg} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o === value;
        return (
          <TouchableOpacity key={String(o)} style={[s.segItem, on ? { backgroundColor: C.ink } : null]} onPress={() => onPick && onPick(o)} activeOpacity={0.8}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={unit ? `${o} ${unit}` : String(o)}>
            <Text style={[TXT3.slimTitle, { color: on ? C.sheet : C.soft }]} allowFontScaling={false}>{String(o)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── O número grande com a unidade pequena (3419) ──
export function BigValue({ value, unit, a11y }) {
  return (
    <View style={s.bigRow} accessible accessibilityLabel={a11y || `${value} ${unit || ''}`} accessibilityLiveRegion="polite">
      <Text style={[TXT3.unit, { color: C.ink }]} allowFontScaling={false}>{value}</Text>
      {unit ? <Text style={[TXT3.slimTitle, { color: C.ink }]} allowFontScaling={false}>{` ${unit}`}</Text> : null}
    </View>
  );
}

// ── A fonte do valor (assumido · do acordo · do manual · teu): o ponto laranja quando é assumido ──
export function SourceNote({ strong, text, alert, icon }) {
  return (
    <View style={s.src}>
      {alert ? <View style={s.srcDot} /> : icon ? <Icon name={icon} size={16} color={C.ink} /> : null}
      <Text style={[TXT3.cardSub, s.flex, { color: C.soft }]} maxFontSizeMultiplier={MAX}>
        {strong ? <Text style={{ color: C.ink }}>{strong} </Text> : null}{text}
      </Text>
    </View>
  );
}

// ── O contador (as férias): − o número grande + ──
export function Stepper({ value, unit, onStep, min = 1, max = 99, l }) {
  const btn = (d, glyph, label, dis) => (
    <TouchableOpacity style={[s.stepBtn, dis ? s.off : null]} onPress={() => onStep && onStep(d)} disabled={dis} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={glyph} size={18} color={C.ink} />
    </TouchableOpacity>
  );
  return (
    <View style={s.stepper}>
      {btn(-1, 'minus', l('Menos um dia', 'One day less'), value <= min)}
      <BigValue value={value} unit={unit} />
      {btn(1, 'plus', l('Mais um dia', 'One day more'), value >= max)}
    </View>
  );
}

// ── Um cartão neutro simples (a roda inline, a pesquisa) ──
export function SettingCard({ children, style }) {
  return <View style={[s.card, s.cardPad, style]}>{children}</View>;
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  card: { backgroundColor: C.neutral, borderRadius: RADIUS.xxl, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.xs },
  cardPad: { paddingVertical: SPACE.md, gap: SPACE.sm },
  cardKind: { paddingTop: SPACE.md, paddingBottom: SPACE.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56, paddingVertical: SPACE.sm, borderTopWidth: 1, borderTopColor: C.round },
  rowFirst: { borderTopWidth: 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  chip: { height: 20, paddingHorizontal: SPACE.sm, borderRadius: RADIUS.pill, backgroundColor: C.sheet, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 26, height: 26, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 26, height: 26, borderRadius: RADIUS.pill, borderWidth: 1.5, borderColor: C.caption },
  field: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: C.neutral, borderRadius: RADIUS.xxl, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  fieldVal: { marginTop: 2 },
  sheetHead: { paddingHorizontal: 0, paddingTop: 0 },
  sheetBtn: { marginTop: SPACE.lg },
  hist: { gap: SPACE.s, paddingHorizontal: SPACE.xs },
  histRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: SPACE.s },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  histDash: { width: 20, borderTopWidth: 2, borderStyle: 'dashed', borderColor: C.caption, marginHorizontal: SPACE.xs },
  histDot: { width: 10, height: 10, borderRadius: RADIUS.pill, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.sheet },
  histNow: { backgroundColor: C.ink },
  seg: { flexDirection: 'row', height: 52, borderRadius: RADIUS.pill, backgroundColor: C.round, padding: SPACE.xs },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: SPACE.xs },
  src: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, backgroundColor: C.neutral, borderRadius: RADIUS.xl, padding: SPACE.md },
  srcDot: { width: 8, height: 8, borderRadius: RADIUS.pill, backgroundColor: C.alert, marginTop: SPACE.xs + 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.neutral, borderRadius: RADIUS.xxl, padding: SPACE.md },
  stepBtn: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: C.sheet, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.35 },
});
