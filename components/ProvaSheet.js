// A folha da PROVA — "a lei deste número" (mockup design/prova.html, aprovado 2026-07-16).
// Três andares: RESUMO assumido ("resumo da app — lê o artigo na fonte"; parágrafe, nunca
// aspas) → ARTIGO + vigência do acordo → botão para a FONTE OFICIAL (deep-links da
// Biblioteca via openLibraryLink). O rodapé consultivo fecha sempre. 1 componente genérico —
// crescer a Prova é acrescentar entradas ao registo (data/prova.js), nunca UI nova.
// PA (design/prova-campos.html, escolhida pelo Nuno a 2026-11-14 — depois da P1 em cartões): a REGRA DAS FOLHAS — nas folhas que
// sobem por cima, os dados são CAMPOS (rótulo pequeno, valor grande e fio; a imagem 3417), como o hotel (F2); os cartões ficam nos
// ecrãs. Um campo por linha, pela ordem das perguntas: quanto é ("Neste serviço", o número grande; o dinheiro com os cêntimos mais
// pequenos, a verde) · porquê (a regra, resumo da app) · onde está escrito (lei, artigo, texto, fonte ou "em vigor", vale para) · o
// esquema da companhia e a nota informativa · "Abrir a fonte oficial" largo no fundo. A lista desliza; o botão fica.
import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { Field } from './Field';
import { WideButton } from './PillButton';
import { CARD, TXT3, SPACE, RADIUS } from '../data/constants';
import { openLibraryLink } from '../data/library';
import { select } from '../data/haptics';

const W = CARD.day;

export default function ProvaSheet({ visible, onClose, prova, lang = 'pt' }) {
  const { height: winH } = useWindowDimensions();
  const l = (pt, en) => (lang === 'en' ? en : pt);
  if (!prova) return <PeleSheet visible={false} onClose={onClose} />;
  // A lei em campos, a partir do que o registo já tem (data/prova.js): a etiqueta "FTL · Universal (piloto e cabine)" dá a lei e a
  // quem vale; a referência "Reg. (UE) 83/2014 · EUR-Lex" / "BTE 29/2026 · até 31/01/2029" dá o texto e a fonte ou a vigência.
  const [law, whoRaw] = String(prova.lawTag || '').split(' · ');
  const uni = /^(Universal|universal)\s*\((.+)\)$/.exec(whoRaw || '');
  const who = uni ? uni[2] : whoRaw ? whoRaw.charAt(0).toLowerCase() + whoRaw.slice(1) : null;
  const [refA, refB] = String(prova.ref || '').split(' · ');
  const vig = refB && /^(até|until)\s/i.test(refB);
  // O número: o dinheiro com os euros grandes e os cêntimos mais pequenos (como o "Este serviço" do Detalhe), a verde (só o
  // dinheiro é verde, mapa B); as horas a tinta.
  const val = prova.value ? String(prova.value) : null;
  const money = val && /€/.test(val) ? /^(.*?)([.,]\d{2}\s?€)$/.exec(val) : null;
  const gain = !!(val && /^\+/.test(val) && /€/.test(val));
  const numColor = gain ? W.gainOut : W.ink;
  return (
    <PeleSheet visible={visible} onClose={onClose} bg={W.sheet}>
      <SheetHeader card title={prova.sheetTitle || prova.title} onClose={onClose} closeLabel={l('Fechar', 'Close')} style={s.head} />
      <ScrollView style={{ maxHeight: Math.round(winH * 0.62) }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Q3 (design/topo-porque-2.html, 2026-11-14): aberta por um número do topo, a folha começa pela CONTA DESENHADA — a soma de cima
            a baixo (as parcelas e o total, com o fio), ou a barra do limite (o valor, o máximo pequeno, a barra, o que fica; a imagem 3462).
            Os textos vêm prontos de data/homeCards.js (why.calc); com a conta, o campo "Neste serviço" não se repete. */}
        {prova.calc && prova.calc.sum ? (
          <View style={[s.calc, { backgroundColor: W.neutral }]} accessible accessibilityLabel={[...prova.calc.sum, prova.calc.total].filter(Boolean).map((r) => `${r.k} ${r.v}`).join(', ')}>
            {prova.calc.sum.map((r, i) => (
              <View key={`${r.k}-${i}`} style={s.calcRow}>
                <Text style={[TXT3.what, s.calcK, { color: W.ink }]} numberOfLines={2}>{r.k}</Text>
                <Text style={[TXT3.fact, { color: W.ink }]} numberOfLines={1}>{r.v}</Text>
              </View>
            ))}
            {prova.calc.total ? (
              <View style={[s.calcRow, s.calcTot, { borderTopColor: W.ink }]}>
                <Text style={[TXT3.lineVal, s.calcK, { color: W.ink }]} numberOfLines={1}>{prova.calc.total.k}</Text>
                <Text style={[TXT3.cardNum, { color: W.ink }]} numberOfLines={1}>{prova.calc.total.v}</Text>
              </View>
            ) : null}
          </View>
        ) : prova.calc && prova.calc.bar ? (
          <View style={[s.calc, s.calcBar, { backgroundColor: W.neutral }]} accessible accessibilityLabel={`${prova.calc.bar.v} ${prova.calc.bar.of}, ${prova.calc.bar.left}`}>
            <View style={s.barV}>
              <Text style={[TXT3.cardNum, { color: W.ink }]} numberOfLines={1}>{prova.calc.bar.v}</Text>
              <Text style={[TXT3.what, { color: W.tabSub }]} numberOfLines={1}>{prova.calc.bar.of}</Text>
            </View>
            <View style={[s.barTrack, { backgroundColor: W.round }]}>
              <View style={[s.barFill, { width: `${prova.calc.bar.pct}%`, backgroundColor: prova.calc.bar.over ? W.stop : W.ink }]} />
            </View>
            <Text style={[TXT3.dur, { color: W.ink }]} numberOfLines={1}>{`${prova.calc.bar.over ? '✕ ' : ''}${prova.calc.bar.left}${prova.calc.bar.when ? ` · ${prova.calc.bar.when}` : ''}`}</Text>
          </View>
        ) : null}
        {val && !prova.calc ? (
          <Field label={l('Neste serviço', 'In this duty')} value={val}>
            <Text style={[TXT3.unit, { color: numColor }]} allowFontScaling={false} accessibilityLabel={val}>
              {money ? money[1] : val}
              {money ? <Text style={[TXT3.cardNum, { color: gain ? W.gainOut : W.tabSub }]}>{money[2]}</Text> : null}
            </Text>
          </Field>
        ) : null}
        <Field label={l('A regra · resumo da app', 'The rule · app summary')} text={prova.resumo} />
        <Field label={l('Lei', 'Law')} value={law || null} />
        <Field label={l('Artigo', 'Article')} value={prova.art} />
        <Field label={l('Texto', 'Text')} value={refA || null} />
        {refB ? <Field label={vig ? l('Em vigor', 'In force') : l('Fonte', 'Source')} value={refB} /> : null}
        <Field label={l('Vale para', 'Applies to')} value={who} />
        {/* Esquema da companhia (2026-11-03, análise da concorrência): as melhores calculadoras dizem-no.
            A app calcula a especificação de referência (CS FTL.1); o esquema aprovado do operador pode diferir. */}
        {prova.scheme ? (
          <Text style={[TXT3.cardSub, s.note]}>
            <Text style={[TXT3.dur, { color: W.ink }]}>{l('O esquema da tua companhia prevalece. ', 'Your airline’s scheme prevails. ')}</Text>
            {l('A app calcula a especificação de referência da EASA (CS FTL.1); se o Manual de Operações da tua companhia (parte A, cap. 7) for diferente, é ele que vale.',
              'The app computes EASA’s reference specification (CS FTL.1); where your airline’s Operations Manual (part A, ch. 7) differs, that is what applies.')}
          </Text>
        ) : null}
        <Text style={[TXT3.cardSub, s.note]}>{l('Resumo informativo — o texto que vale é o do artigo. Valores de referência; confirma sempre com a companhia.',
          'Informative summary — the article’s text is what counts. Reference values; always confirm with the company.')}</Text>
      </ScrollView>
      {prova.url ? (
        <WideButton glyph="arrow-diag" label={l('Abrir a fonte oficial', 'Open the official source')} onPress={() => { select(); openLibraryLink(prova.url); }} style={s.btn} />
      ) : null}
    </PeleSheet>
  );
}

// PA (2026-11-14): a folha branca da 3.0; os campos são o `Field` (a mesma peça do hotel); texto em TXT3, espaço em SPACE.
const s = StyleSheet.create({
  head: { paddingHorizontal: 0, paddingTop: 0 },
  body: { gap: SPACE.xs, paddingBottom: SPACE.sm },
  note: { color: W.tabSub, marginTop: SPACE.sm },
  btn: { marginTop: SPACE.sm },
  // Q3 · a conta desenhada: uma caixa neutra; a soma em filas (o nome à esquerda, o número à direita) e o total por baixo de um fio
  calc: { borderRadius: RADIUS.lg, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, marginBottom: SPACE.xs },
  calcRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.md, paddingVertical: SPACE.sm },
  calcK: { flex: 1, minWidth: 0 },
  calcTot: { borderTopWidth: 1.5 },
  calcBar: { paddingVertical: SPACE.md, gap: SPACE.sm },
  barV: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.s },
  barTrack: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.pill },
});
