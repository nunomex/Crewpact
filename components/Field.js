// CrewPact · O campo das folhas (2026-11-14 — esboços design/hotel-form.html F2 e design/prova-campos.html PA, escolhidos pelo Nuno).
//
// A REGRA: nas FOLHAS que sobem por cima (Prova, Hotel, Evento, Validades…) os dados são CAMPOS — rótulo pequeno, valor grande e um
// fio por baixo, como uma ficha dos Contactos do iPhone (a imagem 3417 do Nuno); os CARTÕES ficam nos ECRÃS (Início, Escala,
// Detalhe, Números). Uma peça para ler (`Field`) e para escrever (`FieldInput`), com as mesmas medidas:
//   rótulo `TXT3.kind` (11, maiúsculas) a cinzento · valor 20 (`TXT3.fact`, sem lineHeight no campo de escrever) · fio 1,5 na cor
//   dos fios, a tinta no campo onde se escreve, vermelho no que falta (com a frase do erro por baixo).
//
//   <Field label="Artigo" value="ORO.FTL.205(b)" />
//   <Field label="Neste serviço" value="02:00 (+1)" big />
//   <Field label="A regra · resumo da app" text="Aclimatado, …" />
//   <FieldInput label="Nome do hotel" value={name} onChangeText={setName} error={attempted && !name ? 'Falta o nome.' : null} />
import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { CARD, TXT3, SPACE } from '../data/constants';

const W = CARD.day;

// Ler. `big` = o número da folha (34, `TXT3.unit`); `text` = um parágrafo (a regra) no lugar do valor; `children` = um valor feito
// à mão (o dinheiro com os cêntimos mais pequenos).
export function Field({ label, value, big = false, text, color, children, last = false }) {
  if (value == null && !text && !children) return null;
  return (
    <View style={[s.field, last ? s.last : null]} accessible accessibilityLabel={`${label}: ${text || value || ''}`}>
      <Text style={[TXT3.kind, s.label]}>{label}</Text>
      {children || (text
        ? <Text style={[TXT3.line, s.text]}>{text}</Text>
        : <Text style={[big ? TXT3.unit : s.value, { color: color || W.ink }]} allowFontScaling={!big}>{value}</Text>)}
    </View>
  );
}

// Escrever. O fio fica a tinta enquanto se escreve; com `error`, vermelho e a frase por baixo.
export const FieldInput = forwardRef(function FieldInput({ label, error, style, ...input }, ref) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.field, focus ? s.focus : null, error ? s.err : null, style]}>
      <Text style={[TXT3.kind, s.label]}>{label}</Text>
      <TextInput ref={ref} {...input} style={s.input} placeholderTextColor={W.caption} accessibilityLabel={label}
        onFocus={(e) => { setFocus(true); input.onFocus && input.onFocus(e); }}
        onBlur={(e) => { setFocus(false); input.onBlur && input.onBlur(e); }} />
      {error ? <Text style={[TXT3.cardSub, s.errTxt]}>{error}</Text> : null}
    </View>
  );
});

// Uma data em três campos (DD / MM / AAAA), na mesma gramática: rótulo pequeno, os valores grandes, um fio por baixo de cada.
// Serve o Extra do mês e as Validades. `error` = a frase por baixo (o fio fica vermelho).
export function DateField({ label, d, m, y, onD, onM, onY, error, a11y }) {
  const box = (v, on, ph, w, max) => (
    <TextInput value={v} onChangeText={(t) => on(t.replace(/\D/g, '').slice(0, max))} placeholder={ph} placeholderTextColor={W.caption}
      keyboardType="number-pad" maxLength={max} accessibilityLabel={`${a11y || label} · ${ph}`}
      style={[s.input, s.dateIn, { width: w }, error ? s.dateErr : null]} />
  );
  return (
    <View style={s.dateWrap}>
      <Text style={[TXT3.kind, s.label]}>{label}</Text>
      <View style={s.dateRow}>
        {box(d, onD, 'DD', 52, 2)}
        <Text style={[TXT3.fact, { color: W.tabSub }]}>/</Text>
        {box(m, onM, 'MM', 52, 2)}
        <Text style={[TXT3.fact, { color: W.tabSub }]}>/</Text>
        {box(y, onY, 'AAAA', 84, 4)}
      </View>
      {error ? <Text style={[TXT3.cardSub, s.errTxt]}>{error}</Text> : null}
    </View>
  );
}

export default Field;

const s = StyleSheet.create({
  field: { paddingTop: SPACE.sm, paddingBottom: SPACE.md, borderBottomWidth: 1.5, borderBottomColor: CARD.rule, gap: SPACE.xxs },
  last: { borderBottomWidth: 0 },
  focus: { borderBottomColor: W.ink },
  err: { borderBottomColor: W.stop },
  label: { color: W.tabSub },
  value: { fontFamily: TXT3.fact.fontFamily, fontSize: TXT3.fact.fontSize, lineHeight: 26 },
  text: { color: W.soft, marginTop: SPACE.xxs },
  input: { fontFamily: TXT3.fact.fontFamily, fontSize: TXT3.fact.fontSize, color: W.ink, paddingVertical: SPACE.xxs, paddingHorizontal: 0 },
  errTxt: { color: W.ink },
  dateWrap: { paddingTop: SPACE.sm, paddingBottom: SPACE.sm, gap: SPACE.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  dateIn: { textAlign: 'center', borderBottomWidth: 1.5, borderBottomColor: CARD.rule, fontVariant: ['tabular-nums'] },
  dateErr: { borderBottomColor: W.stop },
});
