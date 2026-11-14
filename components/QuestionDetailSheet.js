import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import SheetHeader from './SheetHeader';
import { Field } from './Field';
import { WideButton } from './PillButton';
import MarkRow from './MarkRow';
import Icon from './Icon';
import { CARD, TXT, TXT3, SPACE, RADIUS } from '../data/constants';
import { validityLabel } from '../data/validities';
import { wdShort } from '../data/escalaDay';

// Folha "porquê" das perguntas do Início — a JUSTIFICAÇÃO detalhada (os números por trás da
// resposta), em mini-barras estilo Oura/Health + conselho. NÃO inventa nada: formata o `raw`
// que cada pergunta já traz (data/today.js). Aberta ao tocar numa pergunta.
// Pele nova sobre PeleSheet; tons de estado = ok/warn/red da pele (alteração de escala = âmbar,
// a MESMA língua do pontinho da aba Escala).
// A REGRA DAS FOLHAS (2026-11-14, design-system §11): folha branca, "Fechar" escrito; a resposta grande, a tinta, com o sinal do mapa
// B ao lado quando é preciso olhar ("!" laranja) ou parar ("✕" vermelho) — nunca a letra a cor; as barras na peça "limite com barra"
// das imagens do Nuno (3408 · 3415 · 3428 · 3431 · 3441 · 3462): o valor com o máximo pequeno, a barra a tinta (laranja aos 85 %,
// vermelho só quando passa) e "faltam" — nunca percentagem; as linhas em campos (`Field`, 3417); as alterações da escala com o dia no
// quadradinho (H2, 3409/3435); o caminho ("Rever na Escala", "Gerir validades") largo no fundo.

const pMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const fmtMin = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
const r0 = (n) => Math.round(Number(n) || 0);
const ratioTone = (ratio) => (ratio >= 1 ? 'red' : ratio >= 0.85 ? 'amber' : 'green');

// Decomposição por pergunta → { verdict, bars[], rows[], changes[], advise, navTo }.
function detailFor(it, lang) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const raw = it.raw || {};
  const out = { verdict: it.answer, bars: [], rows: [], changes: null, advise: it.suggestion || null, navTo: null };
  // Genérico (2026-11-04, "o que está dentro dos Extras"): quem abre a folha pode trazer as suas linhas e o destino.
  if (Array.isArray(it.rows)) out.rows.push(...it.rows);
  if (it.navTo) out.navTo = it.navTo;
  // Minutos inteiros (auditoria A-172): o excesso mostra-se em h:mm — "+0 h" escondia 10 min acima do limite.
  const hmQ = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const winBar = (w) => {
    const ratio = w.limit ? w.done / w.limit : 0;
    const over = w.over != null ? w.over : ratio > 1;
    return {
      k: `${w.key === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · ${w.days} d`,
      label: `${over && w.doneMin != null ? hmQ(w.doneMin) : r0(w.done)} / ${r0(w.limit)} h`, tone: over ? 'red' : ratioTone(ratio), fill: Math.min(100, ratio * 100),
      tag: over ? (w.overMin != null ? `+${hmQ(w.overMin)}` : `+${r0(w.done - w.limit)} h`) : null,
      left: !over && w.limit ? l(`faltam ${r0(w.limit - w.done)} h`, `${r0(w.limit - w.done)} h left`) : null,
    };
  };
  if (it.id === 'legal' || it.id === 'headroom') {
    if (it.id === 'legal' && raw.psv && raw.psv.result && raw.psv.max) {
      const act = pMin(raw.psv.result), max = pMin(raw.psv.max), ratio = max ? act / max : 0;
      out.bars.push({ k: l('PSV (FDP)', 'FDP'), label: `${raw.psv.result} / ${raw.psv.max}`,
        tone: raw.psv.over ? 'red' : ratioTone(ratio), fill: Math.min(100, ratio * 100),
        tag: raw.psv.over ? (raw.psv.excess ? `+${raw.psv.excess}` : l('excede', 'over')) : null,
        left: !raw.psv.over && act != null && max != null ? l(`faltam ${fmtMin(max - act)}`, `${fmtMin(max - act)} left`) : null });
    }
    const wins = raw.windows || [];
    const sel = wins.filter((w) => w.id === '28d' || w.over);
    (sel.length ? sel : wins).slice(0, 4).forEach((w) => out.bars.push(winBar(w)));
  } else if (it.id === 'rest') {
    if (raw.actualMin != null && raw.requiredMin != null) {
      const ratio = raw.requiredMin ? raw.actualMin / raw.requiredMin : 0, under = raw.actualMin < raw.requiredMin;
      out.bars.push({ k: l('Repouso antes do report', 'Rest before report'),
        label: `${fmtMin(raw.actualMin)} / ${l('mín', 'min')} ${fmtMin(raw.requiredMin)}`,
        tone: under ? 'red' : 'green', fill: Math.min(100, ratio * 100),
        tag: under ? `−${fmtMin(raw.requiredMin - raw.actualMin)}` : null, left: under ? null : l('cumprido', 'met') });
      if (raw.prevDutyMin) out.rows.push({ k: l('Serviço anterior', 'Preceding duty'), v: fmtMin(raw.prevDutyMin) });
    }
  } else if (it.id === 'roster') {
    const KIND = { changed: l('alterada', 'changed'), conflict: l('conflito', 'conflict'), added: l('nova', 'new'), removed: l('cancelada', 'cancelled') };
    const mk = (arr, k) => (arr || []).map((x) => ({ date: x.date, label: KIND[k], k }));
    out.changes = [...mk(raw.changed, 'changed'), ...mk(raw.conflict, 'conflict'), ...mk(raw.added, 'added'), ...mk(raw.removed, 'removed')]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    out.navTo = { root: 'Escala', screen: 'EscalaMain', label: l('Rever na Escala', 'Review in roster') };
  } else if (it.id === 'validades') {
    (raw.items || []).forEach((v) => {
      const band = v.st ? v.st.band : 'none';
      out.rows.push({ k: validityLabel(v.type, raw.isPilot, lang, v.program || null),
        v: band === 'expired' ? l('Expirado', 'Expired') : band === 'expiring' ? `${v.st.days} d` : l('Válido', 'Valid'),
        tone: band === 'expired' ? 'bad' : band === 'expiring' ? 'warn' : 'ok' });
    });
    // "Renova com urgência" SEM caminho era um beco — leva a quem gere as validades.
    out.navTo = { root: 'Perfil', screen: 'Validades', label: l('Gerir validades', 'Manage items') };
  }
  return out;
}

const W = CARD.day;
// O sinal do mapa B: "!" laranja = olhar · "✕" vermelho = parar; dentro não tem sinal.
const Mark = ({ tone }) => (tone === 'bad' || tone === 'warn' ? (
  <View style={[st.mark, { backgroundColor: tone === 'bad' ? W.stop : W.alert }]}>
    <Text style={[TXT3.badge, { color: CARD.onCard }]} allowFontScaling={false}>{tone === 'bad' ? '✕' : '!'}</Text>
  </View>
) : null);
const barTone = (t) => (t === 'red' ? 'bad' : t === 'amber' ? 'warn' : null);

function DetailContent({ item, lang, winH }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const d = detailFor(item, lang);
  const tone = item.status === 'bad' ? 'bad' : item.status === 'warn' ? 'warn' : null;
  return (
    <ScrollView style={{ maxHeight: Math.round(winH * 0.58) }} contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
      {/* A resposta: grande, a tinta, com o sinal ao lado quando é preciso olhar ou parar. */}
      <View style={st.verdictRow}>
        <Mark tone={tone} />
        <Text style={[TXT3.cardTitle, st.flex, { color: W.ink }]}>{d.verdict}</Text>
      </View>

      {d.bars.length ? (
        <View style={st.group}>
          <Text style={[TXT3.kind, st.lab]}>{l('Porquê', 'Why')}</Text>
          {d.bars.map((b, i) => {
            const t = barTone(b.tone);
            const [val, max] = String(b.label).split(' / ');
            return (
              <View key={i} style={st.bar} accessible accessibilityLabel={`${b.k}: ${b.label}${b.tag ? `, ${b.tag}` : ''}${b.left ? `, ${b.left}` : ''}`}>
                <Text style={[TXT3.kind, st.lab]}>{b.k}</Text>
                <View style={st.barTop}>
                  <Text style={[TXT3.fact, { color: W.ink }]} allowFontScaling={false}>{val}{max ? <Text style={[TXT3.cardSub, { color: W.tabSub }]}>{`  / ${max}`}</Text> : null}</Text>
                  <View style={st.barRight}>
                    <Mark tone={t} />
                    <Text style={[TXT3.dur, { color: W.ink }]}>{b.tag || b.left || ''}</Text>
                  </View>
                </View>
                <View style={[st.track, { backgroundColor: W.neutral }]}>
                  <View style={[st.fill, { width: `${b.fill}%`, backgroundColor: t === 'bad' ? W.stop : t === 'warn' ? W.alert : W.ink }]} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {d.rows.length ? (
        <View style={st.group}>
          {d.rows.map((r, i) => (
            <Field key={i} label={r.k} value={r.v}>
              <View style={st.rowVal}>
                <Mark tone={r.tone === 'bad' ? 'bad' : r.tone === 'warn' ? 'warn' : null} />
                <Text style={[TXT3.fact, { color: W.ink }]}>{r.v}</Text>
              </View>
            </Field>
          ))}
        </View>
      ) : null}

      {d.changes && d.changes.length ? (
        <View style={st.group}>
          {d.changes.slice(0, 8).map((c, i) => (
            <MarkRow key={i} first={i === 0}
              mark={{ day: String(+String(c.date).slice(8, 10)), wd: wdShort(c.date, lang === 'en' ? 'en' : 'pt'), bg: W.neutral, badge: c.k === 'removed' ? 'stop' : null }}
              title={c.label.charAt(0).toUpperCase() + c.label.slice(1)} />
          ))}
        </View>
      ) : null}

      {d.advise ? (
        <View style={st.advise}>
          <Icon name="bulb" size={16} color={W.ink} />
          <Text style={[TXT3.text, st.flex, { color: W.soft }]}>{d.advise}</Text>
        </View>
      ) : null}

      <Text style={[TXT.caption, st.foot]}>{l('Estimativa FTL (Reg. UE 83/2014) · confirma sempre com a companhia.', 'FTL estimate (EU Reg. 83/2014) · always confirm with the company.')}</Text>
    </ScrollView>
  );
}

export default function QuestionDetailSheet({ item, lang, onClose, onNav }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const { height: winH } = useWindowDimensions();
  const nav = item ? detailFor(item, lang).navTo : null;
  return (
    <PeleSheet visible={!!item} onClose={onClose} bg={W.sheet}>
      {item ? (
        <>
          <SheetHeader card title={item.q} onClose={onClose} closeLabel={l('Fechar', 'Close')} style={st.head} />
          <DetailContent item={item} lang={lang} winH={winH} />
          {nav ? <WideButton label={nav.label} onPress={() => onNav && onNav(nav)} style={st.btn} /> : null}
        </>
      ) : null}
    </PeleSheet>
  );
}

// A regra das folhas (2026-11-14): a folha branca da 3.0; texto em TXT3/TXT, espaço em SPACE.
const st = StyleSheet.create({
  head: { paddingHorizontal: 0, paddingTop: 0 },
  body: { paddingBottom: SPACE.sm, gap: SPACE.md },
  flex: { flex: 1, minWidth: 0 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  mark: { width: 24, height: 24, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  group: { gap: SPACE.xs },
  lab: { color: W.tabSub },
  bar: { paddingVertical: SPACE.xs, gap: SPACE.xs },
  barTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.md },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  track: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.pill },
  rowVal: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  advise: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
  foot: { color: W.tabSub, textAlign: 'center' },
  btn: { marginTop: SPACE.sm },
});
