import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import PeleSheet from './PeleSheet';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { validityLabel } from '../data/validities';

// Folha "porquê" das perguntas do Início — a JUSTIFICAÇÃO detalhada (os números por trás da
// resposta), em mini-barras estilo Oura/Health + conselho. NÃO inventa nada: formata o `raw`
// que cada pergunta já traz (data/today.js). Aberta ao tocar numa pergunta.
// Pele nova sobre PeleSheet; tons de estado = ok/warn/red da pele (alteração de escala = âmbar,
// a MESMA língua do pontinho da aba Escala).

const pMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const fmtMin = (min) => { const x = Math.max(0, Math.round(min || 0)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; };
const r0 = (n) => Math.round(Number(n) || 0);
const ratioTone = (ratio) => (ratio >= 1 ? 'red' : ratio >= 0.85 ? 'amber' : 'green');

// Decomposição por pergunta → { verdict, bars[], rows[], changes[], advise, navTo }.
function detailFor(it, lang) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const raw = it.raw || {};
  const out = { verdict: it.answer, bars: [], rows: [], changes: null, advise: it.suggestion || null, navTo: null };
  const winBar = (w) => {
    const ratio = w.limit ? w.done / w.limit : 0;
    return {
      k: `${w.key === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · ${w.days} d`,
      label: `${r0(w.done)} / ${r0(w.limit)} h`, tone: ratioTone(ratio), fill: Math.min(100, ratio * 100),
      tag: ratio > 1 ? `+${r0(w.done - w.limit)} h` : null,
    };
  };
  if (it.id === 'legal' || it.id === 'headroom') {
    if (it.id === 'legal' && raw.psv && raw.psv.result && raw.psv.max) {
      const act = pMin(raw.psv.result), max = pMin(raw.psv.max), ratio = max ? act / max : 0;
      out.bars.push({ k: l('PSV (FDP)', 'FDP'), label: `${raw.psv.result} / ${raw.psv.max}`,
        tone: raw.psv.over ? 'red' : ratioTone(ratio), fill: Math.min(100, ratio * 100),
        tag: raw.psv.over ? (raw.psv.excess ? `+${raw.psv.excess}` : l('ilegal', 'illegal')) : null });
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
        tag: under ? `−${fmtMin(raw.requiredMin - raw.actualMin)}` : null });
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
      out.rows.push({ k: validityLabel(v.type, raw.isPilot, lang),
        v: band === 'expired' ? l('Expirado', 'Expired') : band === 'expiring' ? `${v.st.days} d` : l('Válido', 'Valid'),
        tone: band === 'expired' ? 'bad' : band === 'expiring' ? 'warn' : 'ok' });
    });
    // "Renova com urgência" SEM caminho era um beco — leva a quem gere as validades.
    out.navTo = { root: 'Perfil', screen: 'Validades', label: l('Gerir validades', 'Manage items') };
  }
  return out;
}

function DetailContent({ item, lang, onNav }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const d = detailFor(item, lang);
  // Sem acento-cor da pele em texto (o amarelo não lê sobre papel): info = ink neutro.
  const vTone = item.status === 'bad' ? P.red : item.status === 'warn' ? P.warn
    : item.status === 'ok' ? P.ok : P.ink;
  const fillC = (t) => (t === 'red' ? P.red : t === 'amber' ? P.warn : P.ok);
  const rowTone = (t) => (t === 'bad' ? P.red : t === 'warn' ? P.warn : t === 'ok' ? P.ok : P.ink);
  const dateLbl = (iso) => {
    const dt = new Date(iso + 'T00:00:00'); if (isNaN(dt)) return iso;
    const x = dt.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
    return x.charAt(0).toUpperCase() + x.slice(1);
  };
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <Text style={[s.verdict, { color: vTone }]}>{d.verdict}</Text>

      {d.bars.length ? (
        <View style={{ marginTop: 16 }}>
          <Text style={s.why}>{l('PORQUÊ', 'WHY')}</Text>
          {d.bars.map((b, i) => (
            <View key={i} style={s.bar}>
              <View style={s.barTop}>
                <Text style={s.barK} numberOfLines={1}>{b.k}</Text>
                <Text style={[s.barV, { color: fillC(b.tone) }]} numberOfLines={1}>{b.label}{b.tag ? <Text style={s.barTag}>  {b.tag}</Text> : null}</Text>
              </View>
              <View style={s.track}><View style={[s.fill, { width: `${b.fill}%`, backgroundColor: fillC(b.tone) }]} /></View>
            </View>
          ))}
        </View>
      ) : null}

      {d.rows.length ? (
        <View style={s.panel}>
          {d.rows.map((r, i) => (
            <View key={i} style={[s.prow, i > 0 && s.prowBorder]}>
              <Text style={s.prowK} numberOfLines={1}>{r.k}</Text>
              <Text style={[s.prowV, r.tone ? { color: rowTone(r.tone) } : null]} numberOfLines={1}>{r.v}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {d.changes && d.changes.length ? (
        <View style={s.panel}>
          {d.changes.slice(0, 8).map((c, i) => (
            <View key={i} style={[s.prow, i > 0 && s.prowBorder]}>
              <Text style={s.prowK}>{dateLbl(c.date)}</Text>
              <Text style={[s.prowV, { color: c.k === 'removed' ? P.red : c.k === 'added' ? P.ok : P.warn }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {d.advise ? (
        <View style={s.advise}>
          <Icon name="bulb" size={16} color={P.warn} />
          <Text style={s.adviseT}>{d.advise}</Text>
        </View>
      ) : null}

      {d.navTo ? (
        <TouchableOpacity style={s.nav} activeOpacity={0.85} onPress={() => onNav && onNav(d.navTo)} accessibilityRole="button">
          <Text style={s.navT}>{d.navTo.label}</Text>
          <Icon name="chevron" size={14} color={P.onInk} />
        </TouchableOpacity>
      ) : null}

      <Text style={s.foot}>{l('Estimativa FTL (Reg. UE 83/2014) · confirma sempre com a companhia.', 'FTL estimate (EU Reg. 83/2014) · always confirm with the company.')}</Text>
    </ScrollView>
  );
}

export default function QuestionDetailSheet({ item, lang, onClose, onNav }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  return (
    <PeleSheet visible={!!item} onClose={onClose}>
      {item ? (
        <>
          <Text style={s.kick} allowFontScaling={false}>{l('Porquê', 'Why')}</Text>
          <Text style={s.title} allowFontScaling={false}>{item.q}</Text>
          <DetailContent item={item} lang={lang} onNav={onNav} />
        </>
      ) : null}
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  kick: { fontSize: 10, fontFamily: F.bodyHeavy, letterSpacing: 1.6, textTransform: 'uppercase', color: P.grey },
  title: { fontFamily: F.display, fontSize: 24, letterSpacing: -0.3, lineHeight: 28, color: P.ink, marginTop: 2 },
  scroll: { maxHeight: Math.round(Dimensions.get('window').height * 0.62) },
  body: { paddingTop: 14, paddingBottom: 6 },
  verdict: { fontSize: 22, fontFamily: F.display, letterSpacing: -0.3, lineHeight: 26 },
  why: { fontSize: 10, fontFamily: F.bodyHeavy, letterSpacing: 1.4, color: P.grey, marginBottom: 11, marginLeft: 1 },
  // mini-barras (estilo Oura)
  bar: { marginBottom: 14 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  barK: { fontSize: 12.5, fontFamily: F.bodyBold, color: P.ink, flex: 1 },
  barV: { fontSize: 12.5, fontFamily: F.bodyHeavy, fontVariant: ['tabular-nums'], marginLeft: 8 },
  barTag: { fontSize: 11, fontFamily: F.bodyHeavy, color: P.red },
  track: { height: 8, borderRadius: 99, backgroundColor: P.soft2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  // painel k/v (validades, serviço anterior, alterações)
  panel: { backgroundColor: P.soft, borderRadius: 14, paddingHorizontal: 14, marginTop: 6 },
  prow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, gap: 12 },
  prowBorder: { borderTopWidth: 1, borderTopColor: P.line },
  prowK: { fontSize: 12.5, fontFamily: F.body, color: P.grey, flex: 1 },
  prowV: { fontSize: 12.5, fontFamily: F.bodyBold, color: P.ink, fontVariant: ['tabular-nums'] },
  // conselho
  advise: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: P.warnSoft, borderWidth: 1, borderColor: P.warnSoftLine, borderRadius: 14, padding: 13, marginTop: 16 },
  adviseT: { flex: 1, fontSize: 11.5, fontFamily: F.bodyMed, color: P.ink, lineHeight: 16 },
  // botão de navegação (escala/validades)
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.ink, borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  navT: { color: P.onInk, fontSize: 13.5, fontFamily: F.bodyHeavy, letterSpacing: 0.3 },
  foot: { fontSize: 10, fontFamily: F.bodyMed, color: P.grey, marginTop: 14, textAlign: 'center', lineHeight: 15 },
});
