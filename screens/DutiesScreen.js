import React, { useContext, useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, TYPE, GUTTER, SPACE, WEIGHT, TRACK_DISPLAY, FONT } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import BottomSheet from '../components/BottomSheet';
import { Stepper } from '../components/Stepper';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { prospectiveDuty } from '../data/rosterImport';
import { buildRecordModel, recordHtml } from '../data/ftlRecord';
import { printToPdfAndShare } from '../data/pdf';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';

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

// CSV dos registos para exportação (apoio ao registo de tempos/serviço — ORO.FTL.245).
const buildDutiesCsv = (duties) => {
  const rows = Object.entries(duties).filter(([, d]) => !d.deleted).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const head = 'duty_date,report_time,block_off,block_on,sectors,flight_minutes';
  const body = rows.map(([date, d]) => [date, d.report_time || '', d.block_off || '', d.block_on || '', d.sectors || 0, d.flight_minutes || 0].join(','));
  return [head, ...body].join('\n');
};

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

export default function DutiesScreen({ navigation, embedded }) {
  const { lang, duties, saveDuty, removeDuty, dayLog, user, company } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  // Registo 245 (PDF): identidade do tripulante, persistida localmente para reutilizar.
  const [recOpen, setRecOpen] = useState(false);
  const [recForm, setRecForm] = useState({ name: '', crewId: '' });
  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then(v => { if (v) { try { setRecForm(JSON.parse(v)); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id]);

  // Histórico: dias não apagados, mais recentes primeiro.
  const list = Object.entries(duties)
    .filter(([, d]) => !d.deleted)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const onExport = async () => {
    if (!list.length) { Alert.alert(t('duties.title', lang), t('duties.exportEmpty', lang)); return; }
    try { await Share.share({ message: buildDutiesCsv(duties), title: 'CrewPact — duties (CSV)' }); } catch { /* cancelado pelo utilizador */ }
  };

  // Registo ORO.FTL.245 em PDF assinável: abre o formulário de identidade e gera.
  const openPdf = () => {
    if (!list.length) { Alert.alert(t('duties.exportPdf', lang), t('duties.exportEmpty', lang)); return; }
    select(); setRecOpen(true);
  };
  const onGeneratePdf = async () => {
    if (user?.id) AsyncStorage.setItem(`cp_record_${user.id}`, JSON.stringify(recForm)).catch(() => {});
    setRecOpen(false);
    try {
      const model = buildRecordModel({
        duties, dayLog,
        name: recForm.name, crewId: recForm.crewId,
        operator: company?.name || '', email: user?.email || '',
        generatedAt: new Date().toLocaleString(locale),
      });
      await printToPdfAndShare(recordHtml(model, lang), 'CrewPact · FTL.245');
      success();
    } catch { Alert.alert(t('duties.exportPdf', lang), t('duties.recErr', lang)); }
  };

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

  // Validação prospetiva (estilo EASA FTL Calc): com os valores atuais do formulário,
  // projeta o PSV e os acumulados de 28 dias (210) — substituindo o que já existir neste
  // dia, sem duplicar. Só calcula quando a apresentação é válida.
  const prospect = useMemo(() => {
    if (!canSave) return null;
    return prospectiveDuty({
      duty_date: form.date,
      report_time: form.report,
      block_off: form.off || null,
      block_on: form.on || null,
      sectors: form.sectors,
      flight_minutes: hhmmToMin(form.flight),
    }, dayLog);
  }, [canSave, form, dayLog]);
  const h1 = (v) => (Number(v) || 0).toLocaleString(locale, { maximumFractionDigits: 1 }); // horas com 1 casa
  const fatigueLbl = (b) => t(`duties.fatigue${b.charAt(0).toUpperCase()}${b.slice(1)}`, lang);
  const fatigueColor = (b) => b === 'high' ? (C.bad || C.warn || C.text)
    : b === 'elevated' ? (C.warn || C.text)
    : b === 'low' ? (C.ok || C.sub) : C.text;
  const issueLbl = (it) => it.type === 'fdp' ? t('duties.issueFdp', lang)
    : it.type === 'duty28' ? t('duties.issueDuty28', lang)
    : it.type === 'flight28' ? t('duties.issueFlight28', lang) : '';
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
    <SafeAreaView style={s.safe} edges={embedded ? [] : ['top']}>
      {embedded ? null : <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />}
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        <Text style={s.eyebrow}>{t('duties.eyebrow', lang)}</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>{t('duties.title', lang)}</Text>
          <View style={s.titleActions}>
            <TouchableOpacity style={s.iconBtn} onPress={openPdf} hitSlop={8} accessibilityLabel={t('duties.exportPdf', lang)}>
              <Ionicons name="document-text-outline" size={18} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={onExport} hitSlop={8} accessibilityLabel={t('duties.export', lang)}>
              <Ionicons name="share-outline" size={18} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity style={s.addBtn} onPress={openNew} hitSlop={8} accessibilityLabel={t('duties.add', lang)}>
              <Ionicons name="add" size={22} color={C.onDark} />
            </TouchableOpacity>
          </View>
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

          {/* Projeção prospetiva (PSV + acumulados 28 d) */}
          {prospect ? (
            <View style={[s.proj, prospect.ok ? s.projOk : s.projWarn]}>
              <View style={s.projHead}>
                <Ionicons name={prospect.ok ? 'checkmark-circle' : 'alert-circle'} size={15} color={prospect.ok ? (C.ok || C.text) : (C.warn || C.text)} />
                <Text style={s.projTitle}>{prospect.ok ? t('duties.projOk', lang) : t('duties.projWarn', lang)}</Text>
              </View>
              <Text style={s.projMeta}>
                {t('duties.projDuty', lang)} {h1(prospect.servico28)}/190 h · {t('duties.projFlight', lang)} {h1(prospect.voo28)}/100 h
              </Text>
              {prospect.fatigue ? (
                <View style={s.fatRow}>
                  <View style={[s.fatDot, { backgroundColor: fatigueColor(prospect.fatigue.band) }]} />
                  <Text style={s.fatLbl}>{t('duties.fatigueLbl', lang)}: </Text>
                  <Text style={[s.fatVal, { color: fatigueColor(prospect.fatigue.band) }]}>
                    {fatigueLbl(prospect.fatigue.band)} ({prospect.fatigue.score})
                  </Text>
                </View>
              ) : null}
              {prospect.issues.map((it, i) => (
                <Text key={i} style={s.projIssue}>• {issueLbl(it)}</Text>
              ))}
              <Text style={s.fatHint}>{t('duties.fatigueHint', lang)}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={onSave} disabled={!canSave} style={[s.saveBtn, { opacity: canSave ? 1 : 0.4 }]}>
            <Text style={s.saveBtnTxt}>{t('common.save', lang)}</Text>
          </TouchableOpacity>
          <Text style={s.formHint}>{t('duties.reportReq', lang)}</Text>
        </View>
      </BottomSheet>

      {/* Registo ORO.FTL.245 (PDF assinável) */}
      <BottomSheet visible={recOpen} onClose={() => setRecOpen(false)}
        title={t('duties.recTitle', lang)} closeLabel={t('common.close', lang)}>
        <View style={s.form}>
          <Text style={s.recSub}>{t('duties.recSub', lang)}</Text>
          <Text style={[s.fieldLbl, { marginTop: 14 }]}>{t('duties.recName', lang)}</Text>
          <TextInput value={recForm.name} onChangeText={(v) => setRecForm(f => ({ ...f, name: v }))}
            placeholder={t('duties.recNamePh', lang)} placeholderTextColor={C.sub} style={s.recInput} />
          <Text style={[s.fieldLbl, { marginTop: 14 }]}>{t('duties.recId', lang)}</Text>
          <TextInput value={recForm.crewId} onChangeText={(v) => setRecForm(f => ({ ...f, crewId: v }))}
            placeholder={t('duties.recIdPh', lang)} placeholderTextColor={C.sub} autoCapitalize="characters" style={s.recInput} />

          <TouchableOpacity onPress={onGeneratePdf} style={s.saveBtn}>
            <Ionicons name="document-text-outline" size={17} color="#fff" />
            <Text style={s.saveBtnTxt}>{t('duties.recGenerate', lang)}</Text>
          </TouchableOpacity>
          <Text style={s.formHint}>{t('duties.recHint', lang)}</Text>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 2 },
  eyebrow: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.bold, textTransform: 'uppercase', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: TYPE.hero, fontFamily: FONT.semibold, letterSpacing: TRACK_DISPLAY, color: C.text },
  iconBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: TYPE.sub, color: C.sub, marginTop: 6, marginBottom: SPACE.lg },
  empty: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.md },

  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDate: { fontSize: TYPE.value, fontFamily: FONT.bold, color: C.text },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.warn || C.sub },
  rowMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, fontFamily: FONT.medium },
  delBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },

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
  recSub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  recInput: { backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.line, color: C.text, fontSize: TYPE.body },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
