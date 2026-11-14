// Gestão de EXTRAS DO MÊS na pele nova — a vista que faltava quando a Cálculos (AeCalcs) saiu
// da aba (agora INFO). Lista os eventos datados (aeEvents) com APAGAR + botão ADICIONAR (abre
// o formulário existente ExtraEventSheet). Decisão: os extras vivem no mini-FAB. Ver [[ae-extras-events]].
// 2026-11-14 (regra do Nuno: a app só lê o calendário e calcula — à mão só na Simulação): saiu o "adicionar extra" e o
// formulário (ExtraEventSheet). A lista fica sem entrada até ganhar o seu lugar nos Números (com esboços); o € já está lá.
import React, { useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import PeleSheet from './PeleSheet';
import Icon from './Icon';
import { AppContext } from '../data/appContext';
import { eventDateLabel } from '../data/aeEvents';
import { extrasMonthEur } from '../data/perdiem';
import { PELE as P, PELE_FONT as F } from '../data/constants';
import { success, warning } from '../data/haptics';

export default function ExtrasManager({ visible, onClose }) {
  const { lang, ae, aeAt, crewAt, aeEvents, duties, removeAeEvent, addAeEvents, notify } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const kindLabel = (type) => {
    const k = ae && Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS.find((x) => x.id === type) : null;
    return (k && k.label && (k.label[lang] || k.label.pt)) || type;
  };
  // € de UM evento (categoria, contrato, AE e tabela desse mês). A doença não tem valor por linha: depende do dia do episódio
  // e a base do dia sai (Código do Trabalho, art. 255.º) — o que entra está no total do mês.
  const rate = (type, date) => {
    if (type === 'sickDays') return null;
    const ym = date ? String(date).slice(0, 7) : null; const at = ym ? crewAt(ym) : {}; const a = ym ? aeAt(ym) : ae;
    if (!(a && a.monthExtras && at.category)) return null;
    const it = a.monthExtras(at.category, { [type]: 1 }, { ym, index: a.indexFactor ? a.indexFactor(ym) : 1, contract: at.contract || '12/12' }).items[0];
    return it && it.each != null ? it.total : null;   // sem valor na tabela desse mês → sem €
  };
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
  // "Soma ao mês" = os extras que entram NESTE mês, pelo mesmo caminho do total (perdiem.extrasMonthEur; auditoria A-194).
  const nowYm = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const monthLbl = new Date(`${nowYm}-15T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { month: 'long' });
  const total = useMemo(() => {
    const a = aeAt ? aeAt(nowYm) : ae; const at = crewAt ? crewAt(nowYm) : {};
    return extrasMonthEur(a, at.category, aeEvents || [], nowYm, { duties, index: a && a.indexFactor ? a.indexFactor(nowYm) : 1, contract: at.contract || '12/12' });
  }, [aeEvents, duties, ae]);   // eslint-disable-line

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
          <Text style={s.empty}>{l('Sem extras neste período. Vêm do calendário (férias, doença, SNC…).', 'No extras in this period. They come from the calendar (leave, sick, SNC…).')}</Text>
        ) : (
          events.map((e, i) => (
            <View key={e.id} style={[s.row, i > 0 && s.rowB]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rn}>{kindLabel(e.type)}</Text>
                <Text style={s.rd}>{eventDateLabel(e.date, lang)}{rate(e.type, e.date) != null ? ` · ${fmtEur(rate(e.type, e.date))}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => del(e.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={l('Apagar extra', 'Delete extra')}>
                <Icon name="trash" size={17} color={P.red} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {events.length > 0 && total != null ? (
        <View style={s.totalRow}>
          <Text style={s.totalK}>{l(`Entra em ${monthLbl}`, `Adds to ${monthLbl}`)}</Text>
          <Text style={s.totalV} allowFontScaling={false}>{fmtEur(total)}</Text>
        </View>
      ) : null}

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
});
