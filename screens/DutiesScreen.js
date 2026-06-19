import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, GUTTER, SPACE } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import BottomSheet from '../components/BottomSheet';
import { Stepper } from '../components/Stepper';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../App';

// "HH:MM" helpers — máscara à medida que se escreve + validação + minutos.
const maskClock = (v) => {
  const d = (v || '').replace(/[^0-9]/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
};
const isClock = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || '');
const okOrEmpty = (s) => !s || isClock(s);
const hhmmToMin = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const addDays = (iso, delta) => isoDay(new Date(new Date(`${iso}T00:00:00`).getTime() + delta * 86400000));

// Nota: não chamar isoDay() aqui (tempo de avaliação do módulo) — App.js importa
// este ecrã antes de exportar isoDay (import circular). A data é preenchida ao
// abrir o formulário (openNew/openEdit).
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '' };

// Campo "HH:MM" — nível de módulo (definir dentro do ecrã faria o input perder o
// foco a cada tecla, por remontar o componente a cada render).
function ClockField({ label, value, onChange, C, s }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLbl}>{label}</Text>
      <TextInput value={value} onChangeText={(v) => onChange(maskClock(v))} placeholder="HH:MM" placeholderTextColor={C.sub}
        keyboardType="numbers-and-punctuation" maxLength={5} style={s.clockInput} />
    </View>
  );
}

export default function DutiesScreen({ navigation }) {
  const { lang, duties, saveDuty, removeDuty } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  // Histórico: dias não apagados, mais recentes primeiro.
  const list = Object.entries(duties)
    .filter(([, d]) => !d.deleted)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const openNew = () => { select(); setForm({ ...EMPTY, date: isoDay() }); setFormOpen(true); };
  const openEdit = (date, d) => {
    select();
    setForm({ date, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes) });
    setFormOpen(true);
  };
  const confirmDelete = (date) => {
    Alert.alert(t('duties.delTitle', lang), t('duties.delMsg', lang), [
      { text: t('common.cancel', lang), style: 'cancel' },
      { text: t('duties.delConfirm', lang), style: 'destructive', onPress: () => { select(); removeDuty(date); } },
    ]);
  };

  const canSave = isClock(form.report) && okOrEmpty(form.off) && okOrEmpty(form.on) && okOrEmpty(form.flight);
  const onSave = () => {
    if (!canSave) return;
    saveDuty(form.date, {
      report_time: form.report,
      block_off: form.off || null,
      block_on: form.on || null,
      sectors: form.sectors,
      flight_minutes: hhmmToMin(form.flight),
    });
    success();
    setFormOpen(false);
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d)) return '';
    const str = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <Text style={s.eyebrow}>{t('duties.eyebrow', lang)}</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>{t('duties.title', lang)}</Text>
          <TouchableOpacity style={s.addBtn} onPress={openNew} hitSlop={8} accessibilityLabel={t('duties.add', lang)}>
            <Ionicons name="add" size={22} color={C.onDark} />
          </TouchableOpacity>
        </View>
        <Text style={s.sub}>{t('duties.sub', lang)}</Text>

        {list.length === 0 ? (
          <Text style={s.empty}>{t('duties.empty', lang)}</Text>
        ) : (
          list.map(([date, d]) => (
            <TouchableOpacity key={date} style={s.row} activeOpacity={0.7} onPress={() => openEdit(date, d)}>
              <View style={{ flex: 1 }}>
                <View style={s.rowTop}>
                  <Text style={s.rowDate}>{fmtDate(date)}</Text>
                  {d.dirty ? <View style={s.pendDot} accessibilityLabel={t('duties.pending', lang)} /> : null}
                </View>
                <Text style={s.rowMeta}>
                  {(d.report_time || '--:--')} → {(d.block_on || '--:--')} · {d.sectors} {t('duties.sectorsShort', lang)}{d.flight_minutes ? ` · ${minToHhmm(d.flight_minutes)} ${t('duties.flightShort', lang)}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(date)} hitSlop={8} style={s.delBtn} accessibilityLabel={t('duties.delConfirm', lang)}>
                <Ionicons name="trash-outline" size={17} color={C.sub} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
        {list.length > 0 ? <Text style={s.foot}>{t('duties.syncHint', lang)}</Text> : null}
      </ScrollView>

      <BottomSheet visible={formOpen} onClose={() => setFormOpen(false)}
        title={duties[form.date] && !duties[form.date].deleted ? t('duties.edit', lang) : t('duties.add', lang)}
        closeLabel={t('common.close', lang)}>
        <View style={s.form}>
          {/* Data */}
          <Text style={s.fieldLbl}>{t('duties.date', lang)}</Text>
          <View style={s.dateRow}>
            <TouchableOpacity onPress={() => { select(); setForm(f => ({ ...f, date: addDays(f.date, -1) })); }} hitSlop={8} style={s.dateNav}>
              <Ionicons name="chevron-back" size={18} color={C.text} />
            </TouchableOpacity>
            <Text style={s.dateTxt}>{fmtDate(form.date)}{form.date === isoDay() ? ` · ${t('cal.today', lang)}` : ''}</Text>
            <TouchableOpacity onPress={() => { select(); setForm(f => ({ ...f, date: addDays(f.date, 1) })); }} hitSlop={8} style={s.dateNav}>
              <Ionicons name="chevron-forward" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          <ClockField C={C} s={s} label={t('duties.report', lang)} value={form.report} onChange={(v) => setForm(f => ({ ...f, report: v }))} />
          <ClockField C={C} s={s} label={t('duties.blockOff', lang)} value={form.off} onChange={(v) => setForm(f => ({ ...f, off: v }))} />
          <ClockField C={C} s={s} label={t('duties.blockOn', lang)} value={form.on} onChange={(v) => setForm(f => ({ ...f, on: v }))} />
          <Stepper label={t('ftl.sectors', lang)} value={form.sectors} setValue={(n) => setForm(f => ({ ...f, sectors: n }))} min={0} max={12} />
          <ClockField C={C} s={s} label={t('ftl.flightTime', lang)} value={form.flight} onChange={(v) => setForm(f => ({ ...f, flight: v }))} />

          <TouchableOpacity onPress={onSave} disabled={!canSave} style={[s.saveBtn, { opacity: canSave ? 1 : 0.4 }]}>
            <Text style={s.saveBtnTxt}>{t('common.save', lang)}</Text>
          </TouchableOpacity>
          <Text style={s.formHint}>{t('duties.reportReq', lang)}</Text>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 2 },
  eyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: TYPE.hero, fontWeight: '300', letterSpacing: -0.5, color: C.text },
  addBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: TYPE.sub, color: C.sub, marginTop: 6, marginBottom: SPACE.lg },
  empty: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.md },

  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDate: { fontSize: TYPE.value, fontWeight: '700', color: C.text },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.warn || C.sub },
  rowMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, fontFamily: 'monospace' },
  delBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },

  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  clockInput: { width: 92, textAlign: 'center', fontFamily: 'monospace', fontSize: TYPE.body, backgroundColor: C.soft, borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: C.line, color: C.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 4 },
  dateNav: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  dateTxt: { fontSize: TYPE.body, fontWeight: '600', color: C.text },
  saveBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
