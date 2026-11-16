// OS EXTRAS DO MÊS — X2 de design/extras-mes.html (escolhida pelo Nuno a 2026-11-16), SÓ PARA VER: a linha "Extras" dos Números
// abre esta folha com o total (o mesmo da linha), de onde vem cada parte e o € de cada evento. Sem "Apagar" (o Nuno: "não faz
// sentido apagar os extras, vem tudo do calendário") — as férias e a doença vêm do calendário (a leitura da escala) e as SNC/RDP
// detetam-se nas mudanças dele e confirmam-se; uma férias ou doença a mais tira-se no próprio dia, na Escala ("Remover deste dia").
// Substitui a folha antiga (components/ExtrasManager.js, sem entrada desde 2026-11-14 — o achado 4 do mapa da app).
// Os valores vêm das mesmas contas do total (monthExtras do acordo de cada mês, por evento); nenhum número nasce aqui.
//   <ExtrasSheet visible title events total parts={{ events, extras, cash }} periodLbl onClose />
import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { AppContext } from '../data/appContext';
import { eventDateLabel } from '../data/aeEvents';
import { CARD, TXT3, SPACE } from '../data/constants';

const C = CARD.day;
const MAX_SCALE = 1.3;

export default function ExtrasSheet({ visible, onClose, title, periodLbl, events = [], total = 0, parts = {} }) {
  const { lang, ae, aeAt, crewAt } = useContext(AppContext);
  const { height: H } = useWindowDimensions();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const AL = lang === 'en' ? 'en-GB' : 'pt-PT';
  const kindLabel = (type, a) => {
    const kinds = (a || ae) && Array.isArray((a || ae).EXTRA_KINDS) ? (a || ae).EXTRA_KINDS : [];
    const k = kinds.find((x) => x.id === type);
    return (k && k.label && (k.label[lang] || k.label.pt)) || type;
  };
  // o € de UM evento: a categoria, o contrato, o acordo e a tabela desse mês — { each, max } (max quando o valor tem duas pontas: a SNC
  // de abril a outubro, 60 € certos e até 240 € com o regime reforçado; a DDO/IDO/WFLY a tempo parcial, até à base a tempo
  // completo). A doença não tem valor por linha (depende do dia do episódio e a base do dia sai — Código do Trabalho, art. 255.º):
  // o que entra está no total.
  const rate = (type, date) => {
    if (type === 'sickDays') return null;
    const ym = date ? String(date).slice(0, 7) : null;
    const at = ym && crewAt ? (crewAt(ym) || {}) : {};
    const a = ym && aeAt ? aeAt(ym) : ae;
    if (!(a && a.monthExtras && at.category)) return null;
    const it = a.monthExtras(at.category, { [type]: 1 }, { ym, index: a.indexFactor ? a.indexFactor(ym) : 1, contract: at.contract || '12/12' }).items[0];
    if (!it || it.each == null) return null;   // sem valor na tabela desse mês → sem €
    return { each: it.each, max: it.eachMax != null && it.eachMax > it.each ? it.eachMax : null };
  };
  const eurTxt = (n) => { const { a, b } = eurParts(n); return `${a}${b}`.replace(/^\+/, ''); };
  const eurParts = (n) => {
    const [i, d] = Math.abs(Number(n)).toFixed(2).split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    const sign = Number(n) < 0 ? '−' : '+';
    return lang === 'en' ? { a: `${sign}€${g}`, b: `.${d}` } : { a: `${sign}${g}`, b: `,${d} €` };
  };
  const Money = ({ n, big = false }) => {
    const { a, b } = eurParts(n);
    return (
      <Text style={[big ? TXT3.unit : TXT3.lineVal, { color: C.ink }]} maxFontSizeMultiplier={MAX_SCALE}>
        {a}<Text style={[big ? TXT3.fact : TXT3.cardSub, { color: Number(n) < 0 ? C.tabSub : C.gainOut }]}>{b}</Text>
      </Text>
    );
  };
  const list = events.slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));
  const rated = list.map((e) => ({ e, r: rate(e.type, e.date) }));
  const upTo = rated.reduce((a, { r }) => a + (r && r.max != null ? r.max - r.each : 0), 0);   // o que pode ainda acrescer
  const others = [
    parts.extras ? { k: 'roles', t: l('Da escala · papéis e escritório', 'From the roster · roles and office'), s: l('vêm dos serviços — corrige-se no serviço', 'they come from the duties — fix them on the duty'), v: parts.extras } : null,
    parts.cash ? { k: 'cash', t: l('Abono para falhas', 'Cash-handling allowance'), s: null, v: parts.cash } : null,
  ].filter(Boolean);
  const count = list.length;

  return (
    <PeleSheet visible={visible} onClose={onClose} bg={C.sheet}>
      <SheetHeader card title={title} onClose={onClose} closeLabel={l('Fechar', 'Close')} />
      <ScrollView style={{ maxHeight: H * 0.72 }} contentContainerStyle={s.in} showsVerticalScrollIndicator={false}>
        {/* o total — o mesmo da linha "Extras" dos Números */}
        <View style={[s.total, s.rule]} accessible accessibilityLanguage={AL}
          accessibilityLabel={`${l('No total', 'In total')} ${periodLbl}: ${eurParts(total).a}${eurParts(total).b}`}>
          <Money n={total} big />
          <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX_SCALE}>{l(`no total ${periodLbl}`, `in total ${periodLbl}`)}</Text>
          {upTo > 0 ? <Text style={[TXT3.cardSub, s.upTo]} maxFontSizeMultiplier={MAX_SCALE}>{l(`e até mais ${eurTxt(upTo)} — há valores com duas pontas (o € de cada um diz quais)`, `and up to ${eurTxt(upTo)} more — some values have two ends (each one's € says which)`)}</Text> : null}
        </View>

        {/* os eventos do calendário, um por campo (a regra das folhas: o dia pequeno, o nome grande, o € à direita) */}
        {rated.map(({ e, r }) => {
          const a = aeAt && e.date ? aeAt(String(e.date).slice(0, 7)) : ae;
          const nm = kindLabel(e.type, a);
          const day = eventDateLabel(e.date, lang);
          return (
            <View key={e.id || `${e.type}${e.date}`} style={[s.row, s.rule]} accessible accessibilityLanguage={AL}
              accessibilityLabel={`${day}. ${nm}. ${r == null ? l('no total do mês', 'in the month total') : r.max != null ? `${eurTxt(r.each)} ${l('a', 'to')} ${eurTxt(r.max)}` : `${eurParts(r.each).a}${eurParts(r.each).b}`}`}>
              <View style={s.grow}>
                <Text style={[TXT3.kind, { color: C.tabSub }]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{day}</Text>
                <Text style={[TXT3.fact, { color: C.ink }]} maxFontSizeMultiplier={MAX_SCALE}>{nm}</Text>
              </View>
              {r == null ? <Text style={[TXT3.cardSub, s.inTotal]} maxFontSizeMultiplier={MAX_SCALE}>{l('no total\ndo mês', 'in the\nmonth total')}</Text>
                : r.max != null ? <Text style={[TXT3.lineVal, s.range]} maxFontSizeMultiplier={MAX_SCALE}>{`${eurTxt(r.each)}\n${l('a', 'to')} ${eurTxt(r.max)}`}</Text>
                  : <Money n={r.each} />}
            </View>
          );
        })}
        {count === 0 && !others.length ? (
          <Text style={[TXT3.text, s.empty]}>{l('Sem extras neste período.', 'No extras in this period.')}</Text>
        ) : null}

        {/* o que não é evento: os papéis e o escritório (dos serviços) e o abono (cabine) */}
        {others.map((o) => (
          <View key={o.k} style={[s.row, s.rule]} accessible accessibilityLanguage={AL} accessibilityLabel={`${o.t}. ${eurParts(o.v).a}${eurParts(o.v).b}${o.s ? `. ${o.s}` : ''}`}>
            <View style={s.grow}>
              <Text style={[TXT3.line, { color: C.ink }]} maxFontSizeMultiplier={MAX_SCALE}>{o.t}</Text>
              {o.s ? <Text style={[TXT3.cardSub, { color: C.tabSub }]} maxFontSizeMultiplier={MAX_SCALE}>{o.s}</Text> : null}
            </View>
            <Money n={o.v} />
          </View>
        ))}

        <Text style={[TXT3.cardSub, s.note]} maxFontSizeMultiplier={MAX_SCALE}>
          {l('Tudo vem do calendário: as férias e a doença da escala, e as alterações (SNC) que confirmaste. Uma férias ou doença a mais tira-se no próprio dia, na Escala.',
            'It all comes from the calendar: leave and sick days on the roster, and the changes (SNC) you confirmed. A leave or sick day too many is removed on that day, in the Roster.')}
        </Text>
      </ScrollView>
    </PeleSheet>
  );
}

// A folha da 3.0 (PeleSheet branca, "Fechar" escrito) com os campos da regra das folhas: rótulo pequeno, valor grande, fio.
const s = StyleSheet.create({
  in: { paddingBottom: SPACE.lg },
  rule: { borderBottomWidth: 1.5, borderBottomColor: CARD.rule },
  total: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACE.sm, paddingTop: SPACE.xs, paddingBottom: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.sm, paddingBottom: SPACE.md },
  grow: { flex: 1, minWidth: 0, gap: SPACE.xxs },
  inTotal: { color: C.tabSub, textAlign: 'right' },
  range: { color: C.ink, textAlign: 'right' },   // duas pontas: sem o verde (não é certo) — o mais restritivo não é a lei
  upTo: { color: C.tabSub, flexBasis: '100%' },
  empty: { color: C.tabSub, paddingVertical: SPACE.lg },
  note: { color: C.tabSub, paddingTop: SPACE.md },
});
