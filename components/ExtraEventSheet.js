import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import PrimaryButton from './PrimaryButton';
import { RADIUS, TYPE, FONT } from '../data/constants';
import { t } from '../data/i18n';
import { select, success, warning } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';

// "Extra do mês" — regista um EVENTO DATADO (DDO à parte: marca-se no próprio serviço).
// Tipo + dia → entra no salário do mês do evento, auditável. Aberto pelo mini-FAB do
// speed-dial e pelo "+ adicionar" dos Cálculos AE. DDO/WFLY ficam FORA da lista (são
// condições do serviço — marcam-se no form do serviço desse dia, evita o duplo caminho).
const DUTY_CONDITION_TYPES = new Set(['ddo', 'wfly']);

export default function ExtraEventSheet({ visible, onClose }) {
  const { lang, ae, crewCategory, addAeEvents } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const kinds = (ae && Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS : []).filter((k) => !DUTY_CONDITION_TYPES.has(k.id));
  const [type, setType] = useState(null);
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [attempted, setAttempted] = useState(false);

  // Abrir → recomeça com o dia de HOJE (regista-se no momento — é esse o objetivo).
  useEffect(() => {
    if (!visible) return;
    const today = isoDay();
    setType(kinds[0] ? kinds[0].id : null);
    setY(today.slice(0, 4)); setM(today.slice(5, 7)); setD(today.slice(8, 10));
    setAttempted(false);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildISO = () => {
    const dd = +d, mm = +m, yy = +y;
    if (!dd || !mm || !yy || yy < 2000 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return isNaN(new Date(`${iso}T00:00:00`).getTime()) ? null : iso;
  };
  const iso = buildISO();
  // € por unidade (valorização oficial do AE — monthExtras com contagem 1).
  const each = (type && ae && ae.monthExtras && crewCategory) ? ae.monthExtras(crewCategory, { [type]: 1 }).total : null;
  const fmtEur = (n) => { if (n == null) return '—'; const [i, dec] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${dec}` : `${g},${dec} €`; };

  const save = () => {
    if (!type || !iso) { setAttempted(true); warning(); return; }
    addAeEvents && addAeEvents([{ date: iso, type }]);
    success();
    onClose && onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={l('Extra do mês', 'Month extra')} closeLabel={t('common.close', lang)} scroll>
      <View style={s.body}>
        <Text style={s.sub}>{l('Regista a ocorrência no dia em que acontece — o € entra no mês certo, e sabes sempre QUE dias foram.', 'Log the occurrence on the day it happens — the € lands in the right month, and you always know WHICH days.')}</Text>

        <Text style={s.lbl}>{l('Tipo', 'Type')}</Text>
        <View style={s.chips}>
          {kinds.map((k) => {
            const on = type === k.id;
            return (
              <TouchableOpacity key={k.id} onPress={() => { select(); setType(k.id); }} style={[s.chip, on && s.chipOn]} activeOpacity={0.85}
                accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{(k.label && (k.label[lang] || k.label.pt)) || k.id}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.hint}>{l('Trabalhar em folga (DDO/WFLY) marca-se no próprio serviço desse dia.', 'Working a day off (DDO/WFLY) is marked on that day’s duty itself.')}</Text>

        <Text style={[s.lbl, { marginTop: 16 }]}>{l('Dia', 'Day')}</Text>
        <View style={s.dateRow}>
          <TextInput style={[s.dateIn, attempted && !iso && s.dateErr]} value={d} onChangeText={(v) => setD(v.replace(/\D/g, '').slice(0, 2))} placeholder="DD" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
          <Text style={s.dateSep}>/</Text>
          <TextInput style={[s.dateIn, attempted && !iso && s.dateErr]} value={m} onChangeText={(v) => setM(v.replace(/\D/g, '').slice(0, 2))} placeholder="MM" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={2} />
          <Text style={s.dateSep}>/</Text>
          <TextInput style={[s.dateIn, s.dateInY, attempted && !iso && s.dateErr]} value={y} onChangeText={(v) => setY(v.replace(/\D/g, '').slice(0, 4))} placeholder="AAAA" placeholderTextColor={C.sub} keyboardType="number-pad" maxLength={4} />
        </View>
        {attempted && !iso ? <Text style={s.err}>{l('Data inválida — confere dia, mês e ano.', 'Invalid date — check day, month and year.')}</Text> : null}

        {each != null ? <Text style={s.each}>{l('Vale', 'Worth')} {fmtEur(each)}{type === 'sickDays' ? l(' · dias 1-3 de cada episódio (Art. 48)', ' · days 1-3 of each episode (Art. 48)') : ''}</Text> : null}

        <PrimaryButton onPress={save} label={t('common.save', lang)} style={{ marginTop: 18 }} />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (C) => StyleSheet.create({
  body: { padding: 20 },
  sub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 19, marginBottom: 14 },
  lbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text },
  chipTxtOn: { color: '#fff' },
  hint: { fontSize: 11, fontFamily: FONT.medium, color: C.sub, marginTop: 8, lineHeight: 15 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateIn: { width: 60, backgroundColor: C.soft, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 12, color: C.text, fontSize: TYPE.body, fontFamily: FONT.semibold, textAlign: 'center' },
  dateInY: { width: 86 },
  dateSep: { fontSize: TYPE.lg, color: C.sub },
  dateErr: { borderColor: C.red },
  err: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.red, marginTop: 8 },
  each: { fontSize: 12.5, fontFamily: FONT.bold, color: C.greenText, marginTop: 14 },
});
