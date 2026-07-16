// A folha da AUDITORIA DO MÊS (design/auditoria-mes.html v2) — os itens do radar, cada um
// com € em INK (candidato ≠ confirmado — verde é desfecho, nunca isco), ação direta e o
// § da Prova (o radar explica-se a si próprio). Tom: "confirma" — nunca acusação.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PeleSheet from './PeleSheet';
import ProvaSheet from './ProvaSheet';
import Icon from './Icon';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { provaFor } from '../data/prova';
import { select } from '../data/haptics';

const KIND_META = {
  nightstop: { icon: 'bed', act: { pt: 'MARCAR', en: 'MARK' } },
  route: { icon: 'plane', act: { pt: 'COMPLETAR', en: 'COMPLETE' } },
  snc: { icon: 'alert', act: { pt: 'REGISTAR', en: 'LOG' } },
  rdp: { icon: 'alert', act: { pt: 'REGISTAR', en: 'LOG' } },
};

const fmtEur = (n, lang) => {
  if (n == null) return null;
  const [i, d] = Number(n).toFixed(2).split('.');
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
  return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
};
const dayLbl = (iso, lang) => {
  const d = new Date(`${iso}T12:00:00`);
  const wd = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { weekday: 'short' }).replace('.', '').toUpperCase();
  return `${wd} ${d.getDate()}`;
};

export default function AuditSheet({ visible, onClose, audit, monthName = '', lang = 'pt', provaCtx = {}, onOpenDay, onRegister }) {
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const [prova, setProva] = useState(null);
  const items = (audit && audit.items) || [];

  const label = (it) => {
    if (it.kind === 'nightstop') return { b: `${l('Pernoita por marcar', 'Night stop to mark')}${it.station ? ` · ${it.station}` : ''}`, s: `${dayLbl(it.date, lang)} — ${l('o dia acabou fora da base', 'the day ended away from base')}` };
    if (it.kind === 'route') return { b: `${it.dates.length} ${it.dates.length === 1 ? l('voo sem rota completa', 'flight without a full route') : l('voos sem rota completa', 'flights without a full route')}`, s: `${it.dates.map((d) => dayLbl(d, lang)).join(' · ')} — ${l('o per diem não conta sem rota', 'per diem doesn’t count without a route')}` };
    return { b: `${it.kind.toUpperCase()} ${l('candidato', 'candidate')}`, s: `${dayLbl(it.date, lang)} — ${l('mudança detetada no arquivo da escala', 'change detected in the roster archive')}${it.clause ? ` · ${it.clause}` : ''}` };
  };
  const act = (it) => {
    select();
    if ((it.kind === 'snc' || it.kind === 'rdp') && onRegister) { onClose && onClose(); onRegister(it); return; }
    const d = it.date || (it.dates && it.dates[0]);
    if (d && onOpenDay) { onClose && onClose(); onOpenDay(d); }
  };

  return (
    <PeleSheet visible={visible} onClose={onClose}>
      <View style={s.eyeb}><View style={s.edot} /><Text style={s.etxt}>{l('Auditoria', 'Audit')}{monthName ? ` · ${monthName}` : ''}</Text></View>
      <Text style={s.h1} allowFontScaling={false}>{items.length} {items.length === 1 ? l('item por confirmar', 'item to confirm') : l('itens por confirmar', 'items to confirm')}</Text>
      <Text style={s.sub}>{l('deteção automática da escala — confirma antes de reclamar', 'auto-detected from your roster — confirm before claiming')}</Text>

      {items.map((it) => {
        const meta = KIND_META[it.kind] || KIND_META.route;
        const lb = label(it);
        const pv = it.provaId ? provaFor(it.provaId, provaCtx) : null;
        const eur = it.eur != null ? `+${fmtEur(it.eur, lang)}` : it.eurMin != null ? `≥ ${fmtEur(it.eurMin, lang)}` : null;
        return (
          <TouchableOpacity key={it.id} style={s.item} activeOpacity={0.8} onPress={() => act(it)}
            accessibilityRole="button" accessibilityLabel={`${lb.b}. ${lb.s}`}>
            <View style={s.iIc}><Icon name={meta.icon} size={15} color={P.ink} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.iB} numberOfLines={1}>{lb.b}</Text>
              <Text style={s.iS} numberOfLines={2}>{lb.s}{pv ? <Text onPress={() => { select(); setProva({ ...pv }); }}>  <Text style={s.iLawS}>§</Text> <Text style={s.iLaw}>{pv.art}</Text></Text> : null}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {eur ? <Text style={s.iV} allowFontScaling={false}>{eur}</Text> : null}
              <Text style={s.iAct}>{(meta.act[lang === 'en' ? 'en' : 'pt'])} ›</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {items.length > 1 && audit.totalEur > 0 ? (
        <View style={s.total}>
          <Text style={s.totalK}>{l('Em causa (estimado)', 'At stake (estimated)')}</Text>
          <Text style={s.totalV} allowFontScaling={false}>≈ {fmtEur(audit.totalEur, lang)}</Text>
        </View>
      ) : null}

      <Text style={s.tone}>{l('Deteções automáticas — podem ter explicação (ex.: pernoita paga por outra via). Confirma antes de registar; a app estima, o recibo e a companhia mandam.',
        'Automatic detections — there may be an explanation (e.g. a night stop paid another way). Confirm before logging; the app estimates, the payslip and the company decide.')}</Text>

      <ProvaSheet visible={!!prova} onClose={() => setProva(null)} prova={prova} lang={lang} />
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  eyeb: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  edot: { width: 7, height: 7, borderRadius: 99, backgroundColor: P.yellow },
  etxt: { fontSize: 10, fontFamily: F.bodyHeavy, letterSpacing: 1.8, color: P.grey, textTransform: 'uppercase' },
  h1: { fontFamily: F.display, fontSize: 24, color: P.ink, marginTop: 6 },
  sub: { fontSize: 11, fontFamily: F.bodyMed, color: P.grey, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 12, marginTop: 9, backgroundColor: P.paper },
  iIc: { width: 30, height: 30, borderRadius: 9, backgroundColor: P.soft, alignItems: 'center', justifyContent: 'center' },
  iB: { fontSize: 12.5, fontFamily: F.bodyBold, color: P.ink },
  iS: { fontSize: 10, fontFamily: F.bodyMed, color: P.grey, marginTop: 1, lineHeight: 14 },
  iLawS: { color: P.yellow, fontFamily: F.bodyHeavy, fontSize: 10 },
  iLaw: { color: P.grey, fontFamily: F.bodyBold, fontSize: 9.5 },
  iV: { fontFamily: F.display, fontSize: 16, color: P.ink, fontVariant: ['tabular-nums'] },   // INK: candidato ≠ confirmado
  iAct: { fontSize: 8, fontFamily: F.bodyHeavy, letterSpacing: 0.8, color: P.grey, marginTop: 2 },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.line },
  totalK: { flex: 1, fontSize: 10, fontFamily: F.bodyHeavy, letterSpacing: 1.4, color: P.grey, textTransform: 'uppercase' },
  totalV: { fontFamily: F.display, fontSize: 24, color: P.ink },
  tone: { fontSize: 9.5, fontFamily: F.bodyMed, color: P.grey, lineHeight: 14, marginTop: 10 },
});
