// A folha da AUDITORIA DO MÊS (design/auditoria-mes.html v2) — os itens do radar, cada um
// com € em INK (candidato ≠ confirmado — verde é desfecho, nunca isco), ação direta e o
// § da Prova (o radar explica-se a si próprio). Tom: "confirma" — nunca acusação.
// A REGRA DAS FOLHAS (2026-11-14): folha branca, "Fechar" escrito; cada item é uma linha das janelas (`MarkRow`) — quando é um dia,
// o dia no quadradinho (H2: a cor do tipo — a pernoita na cor do repouso) com o selo "!" de "por confirmar" (V1); vários dias, o
// ícone; à direita o € a tinta e a ação ("Marcar ›"); o § da lei por baixo, a abrir a Prova. O total num campo (`Field`, rótulo
// pequeno, valor grande). Imagens do Nuno: 3409 e 3435 (listas de alterações e eventos), 3417 (o campo).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import ProvaSheet from './ProvaSheet';
import SheetHeader from './SheetHeader';
import MarkRow, { MARK_INDENT } from './MarkRow';
import { Field } from './Field';
import { CARD, TXT, TXT3, SPACE } from '../data/constants';
import { provaFor } from '../data/prova';
import { wdShort } from '../data/escalaDay';
import { select } from '../data/haptics';

const W = CARD.day;
const KIND_META = {
  nightstop: { icon: 'bed', bg: W.rest, act: { pt: 'Marcar', en: 'Mark' } },
  route: { icon: 'plane', bg: W.flight, act: { pt: 'Completar', en: 'Complete' } },
  // SNC/RDP: "Ver o dia" (era "Registar", que abria o registo à mão — saiu com a regra do Nuno, 2026-11-14: os extras vêm do
  // calendário; a contagem automática destes candidatos fica para a sessão Fable das contas).
  snc: { icon: 'alert', bg: W.neutral, act: { pt: 'Ver o dia', en: 'See the day' } },
  rdp: { icon: 'alert', bg: W.neutral, act: { pt: 'Ver o dia', en: 'See the day' } },
};

const fmtEur = (n, lang) => {
  if (n == null) return null;
  const [i, d] = Number(n).toFixed(2).split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
  return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
};
const dayLbl = (iso, lang) => `${wdShort(iso, lang === 'en' ? 'en' : 'pt')} ${+String(iso).slice(8, 10)}`;

export default function AuditSheet({ visible, onClose, audit, monthName = '', lang = 'pt', provaCtx = {}, onOpenDay }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const { height: winH } = useWindowDimensions();
  const [prova, setProva] = useState(null);
  const items = (audit && audit.items) || [];

  const label = (it) => {
    if (it.kind === 'nightstop') return { b: `${l('Pernoita por marcar', 'Night stop to mark')}${it.station ? ` · ${it.station}` : ''}`, s: l('o dia acabou fora da base', 'the day ended away from base') };
    if (it.kind === 'route') return { b: `${it.dates.length} ${it.dates.length === 1 ? l('voo sem rota completa', 'flight without a full route') : l('voos sem rota completa', 'flights without a full route')}`, s: `${it.dates.map((d) => dayLbl(d, lang)).join(' · ')} — ${l('o per diem não conta sem rota', 'per diem doesn’t count without a route')}` };
    return { b: `${it.kind.toUpperCase()} ${l('candidato', 'candidate')}`, s: `${l('mudança detetada no arquivo da escala', 'change detected in the roster archive')}${it.clause ? ` · ${it.clause}` : ''}` };
  };
  const act = (it) => {
    select();
    const d = it.date || (it.dates && it.dates[0]);
    if (d && onOpenDay) { onClose && onClose(); onOpenDay(d); }
  };
  const title = `${items.length} ${items.length === 1 ? l('item por confirmar', 'item to confirm') : l('itens por confirmar', 'items to confirm')}`;

  return (
    <PeleSheet visible={visible} onClose={onClose} bg={W.sheet}>
      <SheetHeader card title={title} onClose={onClose} closeLabel={l('Fechar', 'Close')} style={s.head} />
      <ScrollView style={{ maxHeight: Math.round(winH * 0.66) }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={[TXT3.cardSub, s.lead]}>{`${l('Auditoria', 'Audit')}${monthName ? l(` de ${String(monthName).toLowerCase()}`, ` · ${monthName}`) : ''} · ${l('deteção automática da escala — confirma antes de reclamar', 'auto-detected from your roster — confirm before claiming')}`}</Text>
        {items.map((it, i) => {
          const meta = KIND_META[it.kind] || KIND_META.route;
          const lb = label(it);
          const pv = it.provaId ? provaFor(it.provaId, provaCtx) : null;
          const eur = it.eur != null ? `+${fmtEur(it.eur, lang)}` : it.eurMin != null ? `≥ ${fmtEur(it.eurMin, lang)}` : null;
          // Um dia → o dia no quadradinho, com o selo "!" (por confirmar); vários dias → o ícone do tipo.
          const mark = it.date ? { day: String(+String(it.date).slice(8, 10)), wd: wdShort(it.date, lang === 'en' ? 'en' : 'pt'), bg: meta.bg, badge: 'alert' } : { icon: meta.icon, bg: meta.bg };
          return (
            <MarkRow key={it.id} first={i === 0} mark={mark} title={lb.b} sub={lb.s} onPress={() => act(it)}
              a11yLabel={[it.date ? dayLbl(it.date, lang) : null, lb.b, lb.s, eur].filter(Boolean).join('. ')}
              right={(
                <View style={s.right}>
                  {eur ? <Text style={[TXT3.lineVal, { color: W.ink }]} allowFontScaling={false}>{eur}</Text> : null}
                  <Text style={[TXT3.dur, { color: W.ink }]}>{`${meta.act[lang === 'en' ? 'en' : 'pt']} ›`}</Text>
                </View>
              )}>
              {pv ? (
                <TouchableOpacity style={s.law} onPress={() => { select(); setProva({ ...pv }); }} hitSlop={{ top: 6, bottom: 6 }}
                  accessibilityRole="button" accessibilityLabel={`${pv.art} — ${l('ver a lei', 'see the law')}`}>
                  <Text style={[TXT.caption, { color: W.tabSub }]}>{`§ ${pv.art}`}</Text>
                </TouchableOpacity>
              ) : null}
            </MarkRow>
          );
        })}

        {items.length > 1 && audit.totalEur > 0 ? (
          <Field label={l('Em causa · estimado', 'At stake · estimated')} value={`≈ ${fmtEur(audit.totalEur, lang)}`} last />
        ) : null}

        <Text style={[TXT3.cardSub, s.note]}>{l('Deteções automáticas — podem ter explicação (ex.: pernoita paga por outra via). Confirma antes de registar; a app estima, o recibo e a companhia mandam.',
          'Automatic detections — there may be an explanation (e.g. a night stop paid another way). Confirm before logging; the app estimates, the payslip and the company decide.')}</Text>
      </ScrollView>

      <ProvaSheet visible={!!prova} onClose={() => setProva(null)} prova={prova} lang={lang} />
    </PeleSheet>
  );
}

// A regra das folhas (2026-11-14): a folha branca da 3.0; as linhas são o MarkRow; texto em TXT3/TXT, espaço em SPACE.
const s = StyleSheet.create({
  head: { paddingHorizontal: 0, paddingTop: 0 },
  body: { gap: SPACE.xs, paddingBottom: SPACE.lg },
  lead: { color: W.tabSub, marginBottom: SPACE.xs },
  right: { alignItems: 'flex-end', gap: SPACE.xxs },
  law: { marginLeft: MARK_INDENT, marginTop: SPACE.xs, alignSelf: 'flex-start' },
  note: { color: W.tabSub, marginTop: SPACE.sm },
});
