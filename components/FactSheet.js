// A folha de UM dado do serviço (esboço design/detalhe-servico.html v2, ecrã 3 — aprovado 2026-11-08).
// PeleSheet (ação curta, sem ✕: a pega e o toque fora fecham, design-system §11) com um título, a explicação na língua do
// tripulante e os campos desse dado: escolha (linhas com rádio), hora (HH:MM) ou horas (− / +). Um só botão largo no fundo
// (§10). Serve o "Completar" (data/dutyComplete.js) e as duas portas do "O calendário está errado?" (horas reais, dado em
// falta). Não grava nada sozinha: devolve os valores ao `onSave`.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import PrimaryButton from './PrimaryButton';
import Icon from './Icon';
import { PELE, TXT, SPACE, RADIUS } from '../data/constants';
import { select, warning } from '../data/haptics';

const maskClock = (v) => { const d = String(v || '').replace(/[^0-9]/g, '').slice(0, 4); return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`; };
const isClock = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || '');
const txt = (v, lang) => (v == null ? '' : typeof v === 'string' ? v : (v[lang === 'en' ? 'en' : 'pt'] || v.pt || ''));

export default function FactSheet({ visible, onClose, title, intro, cite, fields = [], note, lang = 'pt', saveLabel, valid, onSave }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const init = () => Object.fromEntries(fields.map((f) => [f.key, f.value]));
  const [vals, setVals] = useState(init);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (visible) { setVals(init()); setTried(false); } }, [visible]);   // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setVals((x) => ({ ...x, [k]: v }));
  const shown = fields.filter((f) => !f.showIf || f.showIf(vals));
  const badTime = (f) => f.type === 'time' && !!vals[f.key] && !isClock(vals[f.key]);
  const missTime = (f) => f.type === 'time' && !f.optional && !vals[f.key];
  const ok = !shown.some((f) => badTime(f) || missTime(f)) && (!valid || valid(vals));
  const save = () => {
    if (!ok) { setTried(true); warning(); return; }
    onSave && onSave(vals);
  };

  return (
    <PeleSheet visible={visible} onClose={onClose}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.title} accessibilityRole="header">{txt(title, lang)}</Text>
        {intro ? <Text style={s.intro}>{txt(intro, lang)}</Text> : null}
        {shown.map((f) => (
          <View key={f.key} style={s.field}>
            {f.label ? <Text style={s.lbl}>{txt(f.label, lang)}</Text> : null}
            {f.type === 'choice' ? f.options.map((o) => {
              const on = vals[f.key] === o.id;
              return (
                <TouchableOpacity key={String(o.id)} style={[s.opt, on && s.optOn]} activeOpacity={0.8}
                  onPress={() => { select(); set(f.key, o.id); }}
                  accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${txt(o.label, lang)}${o.sub ? `. ${txt(o.sub, lang)}` : ''}`}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.optT}>{txt(o.label, lang)}</Text>
                    {o.sub ? <Text style={s.optD}>{txt(o.sub, lang)}</Text> : null}
                  </View>
                  <View style={[s.radio, on && s.radioOn]} />
                </TouchableOpacity>
              );
            }) : f.type === 'time' ? (
              <>
                <TextInput style={[s.input, tried && (badTime(f) || missTime(f)) && s.inputErr]} value={vals[f.key] || ''}
                  onChangeText={(v) => set(f.key, maskClock(v))} placeholder="HH:MM" placeholderTextColor={PELE.placeholder}
                  keyboardType="number-pad" maxLength={5} accessibilityLabel={txt(f.label, lang) || txt(title, lang)} />
                {f.hint ? <Text style={s.hint}>{txt(f.hint, lang)}</Text> : null}
                {tried && badTime(f) ? <Text style={s.err}>{l('Hora inválida — usa HH:MM', 'Invalid time — use HH:MM')}</Text> : null}
                {tried && missTime(f) ? <Text style={s.err}>{l('Em falta', 'Missing')}</Text> : null}
              </>
            ) : f.type === 'hours' ? (
              <View style={s.stepper}>
                <TouchableOpacity style={s.stepBtn} onPress={() => { select(); set(f.key, Math.max(1, (Number(vals[f.key]) || 1) - 1)); }} accessibilityRole="button" accessibilityLabel={l('Menos uma hora', 'One hour less')}>
                  <Icon name="minus" size={16} color={PELE.ink} />
                </TouchableOpacity>
                <Text style={s.stepVal} accessibilityLiveRegion="polite">{`${Number(vals[f.key]) || 1} h`}</Text>
                <TouchableOpacity style={s.stepBtn} onPress={() => { select(); set(f.key, Math.min(16, (Number(vals[f.key]) || 1) + 1)); }} accessibilityRole="button" accessibilityLabel={l('Mais uma hora', 'One hour more')}>
                  <Icon name="plus" size={16} color={PELE.ink} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}
        {note ? <Text style={s.note}>{txt(note, lang)}</Text> : null}
        {cite ? <Text style={s.cite}>{cite}</Text> : null}
        <PrimaryButton label={saveLabel || l('Guardar', 'Save')} onPress={save} style={{ marginTop: SPACE.lg }} />
      </ScrollView>
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  scroll: { maxHeight: Math.round(Dimensions.get('window').height * 0.78) },
  title: { ...TXT.title, color: PELE.ink },
  intro: { ...TXT.body, color: PELE.grey, marginTop: SPACE.xs },
  field: { marginTop: SPACE.sm },
  lbl: { ...TXT.eyebrow, color: PELE.grey, marginTop: SPACE.sm, marginBottom: SPACE.xs },
  opt: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 56, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, marginTop: SPACE.sm },
  optOn: { borderWidth: 2, borderColor: PELE.ink, paddingHorizontal: SPACE.lg - 1, paddingVertical: SPACE.md - 1 },
  optT: { ...TXT.bodyStrong, color: PELE.ink },
  optD: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.xxs },
  radio: { width: 22, height: 22, borderRadius: RADIUS.pill, borderWidth: 2, borderColor: PELE.affordance },
  radioOn: { borderWidth: 7, borderColor: PELE.ink },
  input: { ...TXT.callout, color: PELE.ink, backgroundColor: PELE.soft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PELE.line, paddingHorizontal: SPACE.md, paddingVertical: SPACE.md, fontVariant: ['tabular-nums'] },
  inputErr: { borderColor: PELE.red },
  hint: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.xs },
  err: { ...TXT.footnote, color: PELE.red, marginTop: SPACE.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, marginTop: SPACE.xs },
  stepBtn: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  stepVal: { ...TXT.num, color: PELE.ink, minWidth: 64, textAlign: 'center' },
  note: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.md },
  cite: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.xs },
});
