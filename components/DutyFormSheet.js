import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import { Stepper } from './Stepper';
import { RADIUS, TYPE, SPACE, FONT } from '../data/constants';
import { prospectiveDuty } from '../data/rosterImport';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../App';

// ── helpers HH:MM ──
const maskClock = (v) => { const d = (v || '').replace(/[^0-9]/g, '').slice(0, 4); return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`; };
const isClock = (s) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(s || '');
const okOrEmpty = (s) => !s || isClock(s);
const hhmmToMin = (s) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const addDays = (iso, delta) => isoDay(new Date(new Date(`${iso}T00:00:00`).getTime() + delta * 86400000));
const EMPTY = { date: '', report: '', off: '', on: '', sectors: 0, flight: '' };

// Campo "HH:MM" (nível de módulo — definir dentro do componente fá-lo perder o foco a cada tecla).
function ClockField({ label, value, onChange, C, s }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLbl}>{label}</Text>
      <TextInput value={value} onChangeText={(v) => onChange(maskClock(v))} placeholder="HH:MM" placeholderTextColor={C.sub}
        keyboardType="numbers-and-punctuation" maxLength={5} style={s.clockInput} />
    </View>
  );
}

// Formulário de duty em popup (BottomSheet), partilhado pela Escala (roda) e pela
// Lista. Pré-preenche a partir do dia `date` (se já houver registo) e grava via
// `saveDuty`. Inclui a projeção prospetiva de PSV + acumulados (210).
export default function DutyFormSheet({ visible, onClose, date }) {
  const { lang, duties, dayLog, saveDuty } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const [form, setForm] = useState(EMPTY);

  // Ao abrir: inicializa do dia (edição) ou vazio (novo).
  useEffect(() => {
    if (!visible) return;
    const iso = date || isoDay();
    const d = duties[iso];
    if (d && !d.deleted) setForm({ date: iso, report: d.report_time || '', off: d.block_off || '', on: d.block_on || '', sectors: d.sectors || 0, flight: minToHhmm(d.flight_minutes) });
    else setForm({ ...EMPTY, date: iso });
  }, [visible, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSave = isClock(form.report) && okOrEmpty(form.off) && okOrEmpty(form.on) && okOrEmpty(form.flight);

  const prospect = useMemo(() => {
    if (!canSave) return null;
    return prospectiveDuty({
      duty_date: form.date, report_time: form.report,
      block_off: form.off || null, block_on: form.on || null,
      sectors: form.sectors, flight_minutes: hhmmToMin(form.flight),
    }, dayLog);
  }, [canSave, form, dayLog]);

  const h1 = (v) => (Number(v) || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const fatigueLbl = (b) => t(`duties.fatigue${b.charAt(0).toUpperCase()}${b.slice(1)}`, lang);
  const fatigueColor = (b) => b === 'high' ? (C.bad || C.warn || C.text) : b === 'elevated' ? (C.warn || C.text) : b === 'low' ? (C.ok || C.sub) : C.text;
  const issueLbl = (it) => it.type === 'fdp' ? t('duties.issueFdp', lang) : it.type === 'duty28' ? t('duties.issueDuty28', lang) : it.type === 'flight28' ? t('duties.issueFlight28', lang) : '';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d)) return '';
    const str = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const onSave = () => {
    if (!canSave) return;
    saveDuty(form.date, {
      report_time: form.report, block_off: form.off || null, block_on: form.on || null,
      sectors: form.sectors, flight_minutes: hhmmToMin(form.flight),
    });
    success();
    onClose && onClose();
  };

  const isEdit = duties[form.date] && !duties[form.date].deleted;

  return (
    <BottomSheet visible={visible} onClose={onClose}
      title={isEdit ? t('duties.edit', lang) : t('duties.add', lang)} closeLabel={t('common.close', lang)}>
      <View style={s.form}>
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

        {prospect ? (
          <View style={[s.proj, prospect.ok ? s.projOk : s.projWarn]}>
            <View style={s.projHead}>
              <Ionicons name={prospect.ok ? 'checkmark-circle' : 'alert-circle'} size={15} color={prospect.ok ? (C.ok || C.text) : (C.warn || C.text)} />
              <Text style={s.projTitle}>{prospect.ok ? t('duties.projOk', lang) : t('duties.projWarn', lang)}</Text>
            </View>
            <Text style={s.projMeta}>{t('duties.projDuty', lang)} {h1(prospect.servico28)}/190 h · {t('duties.projFlight', lang)} {h1(prospect.voo28)}/100 h</Text>
            {prospect.fatigue ? (
              <View style={s.fatRow}>
                <View style={[s.fatDot, { backgroundColor: fatigueColor(prospect.fatigue.band) }]} />
                <Text style={s.fatLbl}>{t('duties.fatigueLbl', lang)}: </Text>
                <Text style={[s.fatVal, { color: fatigueColor(prospect.fatigue.band) }]}>{fatigueLbl(prospect.fatigue.band)} ({prospect.fatigue.score})</Text>
              </View>
            ) : null}
            {prospect.issues.map((it, i) => <Text key={i} style={s.projIssue}>• {issueLbl(it)}</Text>)}
            <Text style={s.fatHint}>{t('duties.fatigueHint', lang)}</Text>
          </View>
        ) : null}

        <TouchableOpacity onPress={onSave} disabled={!canSave} style={[s.saveBtn, { opacity: canSave ? 1 : 0.4 }]}>
          <Text style={s.saveBtnTxt}>{t('common.save', lang)}</Text>
        </TouchableOpacity>
        <Text style={s.formHint}>{t('duties.reportReq', lang)}</Text>
      </View>
    </BottomSheet>
  );
}

const makeStyles = (C) => StyleSheet.create({
  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  clockInput: { width: 92, textAlign: 'center', fontFamily: FONT.medium, fontSize: TYPE.body, backgroundColor: C.soft, borderRadius: 10, paddingVertical: 11, borderWidth: 1, borderColor: C.line, color: C.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.soft, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 4 },
  dateNav: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  dateTxt: { fontSize: TYPE.body, fontFamily: FONT.semibold, color: C.text },
  proj: { marginTop: 18, borderRadius: RADIUS.md, borderWidth: 1, padding: SPACE.md },
  projOk: { borderColor: C.line, backgroundColor: C.soft },
  projWarn: { borderColor: (C.warn || C.sub), backgroundColor: C.card },
  projHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  projTitle: { fontSize: TYPE.label, fontFamily: FONT.bold, color: C.text },
  projMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 6, fontFamily: FONT.medium },
  projIssue: { fontSize: TYPE.micro, color: (C.warn || C.text), marginTop: 4, fontFamily: FONT.semibold },
  fatRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  fatDot: { width: 8, height: 8, borderRadius: 99, marginRight: 7 },
  fatLbl: { fontSize: TYPE.micro, color: C.sub, fontFamily: FONT.semibold },
  fatVal: { fontSize: TYPE.micro, fontFamily: FONT.heavy },
  fatHint: { fontSize: 10, color: C.sub, marginTop: 6, fontStyle: 'italic' },
  saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
