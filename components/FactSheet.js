// A folha de UM dado do serviço (esboço design/detalhe-servico.html v2, ecrã 3 — aprovado 2026-11-08).
// PeleSheet (ação curta; desde 2026-11-14 com "Fechar" escrito, C1) com um título, a explicação na língua do
// tripulante e os campos desse dado: escolha (linhas com rádio), hora (HH:MM) ou horas (− / +). Um só botão largo no fundo
// (§10). Serve o "Completar" (data/dutyComplete.js) e as duas portas do "O calendário está errado?" (horas reais, dado em
// falta). Não grava nada sozinha: devolve os valores ao `onSave`.
// A REGRA DAS FOLHAS (2026-11-14, design-system §11): os campos com rótulo pequeno, valor grande e fio (`FieldInput`; a imagem 3417
// do Nuno); a escolha em linhas com o visto a tinta (o de "Escolher calendário"); as horas com o valor grande entre − e +; a folha
// branca, "Fechar" escrito e o botão largo no fundo (a lista desliza, o botão fica).
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { FieldInput } from './Field';
import { WideButton } from './PillButton';
import Icon from './Icon';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';
import { select, warning } from '../data/haptics';

const W = CARD.day;
const maskClock = (v) => { const d = String(v || '').replace(/[^0-9]/g, '').slice(0, 4); return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`; };
const isClock = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || '');
const txt = (v, lang) => (v == null ? '' : typeof v === 'string' ? v : (v[lang === 'en' ? 'en' : 'pt'] || v.pt || ''));

export default function FactSheet({ visible, onClose, title, intro, cite, fields = [], note, lang = 'pt', saveLabel, valid, onSave }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const { height: winH } = useWindowDimensions();
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
    <PeleSheet visible={visible} onClose={onClose} bg={W.sheet}>
      <SheetHeader card title={txt(title, lang)} onClose={onClose} closeLabel={l('Fechar', 'Close')} style={s.head} />
      <ScrollView style={{ maxHeight: Math.round(winH * 0.62) }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {intro ? <Text style={[TXT3.text, { color: W.soft }]}>{txt(intro, lang)}</Text> : null}
        {shown.map((f) => (
          f.type === 'time' ? (
            <View key={f.key}>
              <FieldInput label={txt(f.label, lang) || txt(title, lang)} value={vals[f.key] || ''} onChangeText={(v) => set(f.key, maskClock(v))}
                placeholder="HH:MM" keyboardType="number-pad" maxLength={5}
                error={tried && badTime(f) ? l('Hora inválida — usa HH:MM', 'Invalid time — use HH:MM') : tried && missTime(f) ? l('Em falta', 'Missing') : null} />
              {f.hint ? <Text style={[TXT3.cardSub, s.hint]}>{txt(f.hint, lang)}</Text> : null}
            </View>
          ) : f.type === 'choice' ? (
            <View key={f.key} style={s.field}>
              {f.label ? <Text style={[TXT3.kind, s.label]}>{txt(f.label, lang)}</Text> : null}
              {f.options.map((o, i) => {
                const on = vals[f.key] === o.id;
                return (
                  <TouchableOpacity key={String(o.id)} style={[s.opt, i > 0 ? s.optRule : null]} activeOpacity={0.7}
                    onPress={() => { select(); set(f.key, o.id); }}
                    accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${txt(o.label, lang)}${o.sub ? `. ${txt(o.sub, lang)}` : ''}`}>
                    <View style={s.flex}>
                      <Text style={[TXT3.slimTitle, { color: W.ink }]}>{txt(o.label, lang)}</Text>
                      {o.sub ? <Text style={[TXT3.slimSub, { color: W.tabSub }]}>{txt(o.sub, lang)}</Text> : null}
                    </View>
                    <View style={[s.tick, on ? { backgroundColor: W.ink, borderColor: W.ink } : { borderColor: CARD.rule }]}>
                      {on ? <Icon name="check" size={13} color={W.sheet} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : f.type === 'hours' ? (
            <View key={f.key} style={s.field}>
              {f.label ? <Text style={[TXT3.kind, s.label]}>{txt(f.label, lang)}</Text> : null}
              <View style={s.stepper}>
                <TouchableOpacity style={[s.stepBtn, { backgroundColor: W.round }]} onPress={() => { select(); set(f.key, Math.max(1, (Number(vals[f.key]) || 1) - 1)); }} accessibilityRole="button" accessibilityLabel={l('Menos uma hora', 'One hour less')}>
                  <Icon name="minus" size={18} color={W.ink} />
                </TouchableOpacity>
                <Text style={[TXT3.unit, s.stepVal, { color: W.ink }]} accessibilityLiveRegion="polite" allowFontScaling={false}>{`${Number(vals[f.key]) || 1} h`}</Text>
                <TouchableOpacity style={[s.stepBtn, { backgroundColor: W.round }]} onPress={() => { select(); set(f.key, Math.min(16, (Number(vals[f.key]) || 1) + 1)); }} accessibilityRole="button" accessibilityLabel={l('Mais uma hora', 'One hour more')}>
                  <Icon name="plus" size={18} color={W.ink} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        ))}
        {note ? <Text style={[TXT3.cardSub, s.note]}>{txt(note, lang)}</Text> : null}
        {cite ? <Text style={[TXT.caption, s.note]}>{cite}</Text> : null}
      </ScrollView>
      <WideButton label={saveLabel || l('Guardar', 'Save')} onPress={save} style={s.btn} />
    </PeleSheet>
  );
}

// A regra das folhas (2026-11-14): a folha branca da 3.0; texto em TXT3/TXT, espaço em SPACE.
const s = StyleSheet.create({
  head: { paddingHorizontal: 0, paddingTop: 0 },
  body: { gap: SPACE.sm, paddingBottom: SPACE.sm },
  flex: { flex: 1, minWidth: 0 },
  field: { paddingTop: SPACE.sm, paddingBottom: SPACE.sm, borderBottomWidth: 1.5, borderBottomColor: CARD.rule },
  label: { color: W.tabSub, marginBottom: SPACE.xs },
  hint: { color: W.tabSub, marginTop: SPACE.xs },
  opt: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 52, paddingVertical: SPACE.sm },
  optRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD.rule },
  tick: { width: 24, height: 24, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE.xs },
  stepBtn: { width: 44, height: 44, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 88, textAlign: 'center' },
  note: { color: W.tabSub },
  btn: { marginTop: SPACE.sm },
});
