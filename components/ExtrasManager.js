// Gestão de EXTRAS DO MÊS na pele nova — a vista que faltava quando a Cálculos (AeCalcs) saiu
// da aba (agora INFO). Lista os eventos datados (aeEvents) com APAGAR + botão ADICIONAR (abre
// o formulário existente ExtraEventSheet). Decisão: os extras vivem no mini-FAB. Ver [[ae-extras-events]].
import React, { useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import PeleSheet from './PeleSheet';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { eventDateLabel } from '../data/aeEvents';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { success, warning } from '../data/haptics';

export default function ExtrasManager({ visible, onClose, onAdd }) {
  const { lang, ae, crewAt, aeEvents, removeAeEvent, addAeEvents, notify } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const kindLabel = (type) => {
    const k = ae && Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS.find((x) => x.id === type) : null;
    return (k && k.label && (k.label[lang] || k.label.pt)) || type;
  };
  const rate = (type, date) => { const ym = date ? String(date).slice(0, 7) : null; const cat = ym ? crewAt(ym).category : null; return (ae && ae.monthExtras && cat) ? ae.monthExtras(cat, { [type]: 1 }, { ym }).total : null; };   // categoria E tabela do AE EFETIVA-DATADAS (crewAt + linha do tempo)
  const fmtEur = (n) => {
    if (n == null) return '—';
    const [i, d] = Number(n).toFixed(2).split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
  };

  const events = useMemo(
    () => (aeEvents || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [aeEvents],
  );
  const total = useMemo(() => events.reduce((sum, e) => sum + (rate(e.type, e.date) || 0), 0), [events]);   // eslint-disable-line

  // DESFAZER (mockup design/desfazer.html, 2026-07-15): o × apagava SEM rede nenhuma —
  // um dedo escorregado e o € do mês mudava em silêncio. Continua a 1 toque, mas o toast
  // dá 5 s de "Desfazer" (repor = addAeEvents com o MESMO id — a lista/€ voltam sozinhos).
  const del = (id) => {
    const captured = (aeEvents || []).find((e) => e.id === id);
    warning();
    removeAeEvent && removeAeEvent(id);
    if (captured) {
      notify && notify(
        l('Evento removido', 'Event removed'), `${kindLabel(captured.type)} · ${eventDateLabel(captured.date, lang)}`, 'del',
        { label: l('Desfazer', 'Undo'), onPress: () => { success(); addAeEvents && addAeEvents([{ ...captured }]); } },
      );
    }
  };

  return (
    <PeleSheet visible={visible} onClose={onClose}>
      <Text style={s.title} allowFontScaling={false}>{l('Extras do mês', 'Month extras')}</Text>
      <Text style={s.sub}>{l('Ocorrências que não se inferem da rota (férias, doença, SNC…). A folga trabalhada (DDO/WFLY/IDO) marca-se no serviço.', 'Occurrences not derived from the route (leave, sick, SNC…). Worked days off are marked on the duty.')}</Text>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <Text style={s.empty}>{l('Sem extras registados. Toca em “adicionar” para registar um.', 'No extras logged. Tap “add” to log one.')}</Text>
        ) : (
          events.map((e, i) => (
            <View key={e.id} style={[s.row, i > 0 && s.rowB]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rn}>{kindLabel(e.type)}</Text>
                <Text style={s.rd}>{eventDateLabel(e.date, lang)} · {fmtEur(rate(e.type, e.date))}</Text>
              </View>
              <TouchableOpacity onPress={() => del(e.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={l('Apagar extra', 'Delete extra')}>
                <Icon name="trash" size={17} color={P.red} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {events.length > 0 ? (
        <View style={s.totalRow}>
          <Text style={s.totalK}>{l('Soma ao mês', 'Adds to the month')}</Text>
          <Text style={s.totalV} allowFontScaling={false}>{fmtEur(total)}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={s.add} onPress={onAdd} activeOpacity={0.85} accessibilityRole="button">
        <Icon name="plus" size={16} color={P.ink} />
        <Text style={s.addT}>{l('adicionar extra', 'add extra')}</Text>
      </TouchableOpacity>
    </PeleSheet>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: F.display, fontSize: 26, color: P.ink, letterSpacing: -0.3 },
  sub: { fontFamily: F.bodyMed, fontSize: 11.5, color: P.grey, lineHeight: 16, marginTop: 4, marginBottom: 6 },
  list: { maxHeight: 320 },
  empty: { fontFamily: F.bodyMed, fontSize: 12, color: P.grey, lineHeight: 18, paddingVertical: 22, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowB: { borderTopWidth: 1, borderTopColor: P.line },
  rn: { fontFamily: F.bodyHeavy, fontSize: 13, color: P.ink },
  rd: { fontFamily: F.bodyMed, fontSize: 11, color: P.grey, marginTop: 3 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 12, borderTopWidth: 1.5, borderTopColor: P.ink, marginTop: 2 },
  totalK: { fontFamily: F.bodyHeavy, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: P.grey },
  totalV: { fontFamily: F.display, fontSize: 22, color: P.ink },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: P.soft, borderRadius: 14, paddingVertical: 14, marginTop: 14 },
  addT: { fontFamily: F.bodyHeavy, fontSize: 13, color: P.ink },
});
