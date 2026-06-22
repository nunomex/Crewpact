import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, SPACE, FONT, SHADOW } from '../data/constants';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';
import { buildRecordModel, recordHtml } from '../data/ftlRecord';
import { printToPdfAndShare } from '../data/pdf';
import PageHeader from '../components/PageHeader';
import NotificationsBell from '../components/NotificationsBell';
import EscalaWheel from '../components/EscalaWheel';
import DutyFormSheet from '../components/DutyFormSheet';
import RosterImportSheet from '../components/RosterImportSheet';
import BottomSheet from '../components/BottomSheet';
import CalendarScreen from './CalendarScreen';
import useTabBarSpace from '../hooks/useTabBarSpace';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };

// CSV dos registos (apoio ao registo de tempos/serviço — ORO.FTL.245).
const buildDutiesCsv = (duties) => {
  const rows = Object.entries(duties).filter(([, d]) => !d.deleted).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const head = 'duty_date,report_time,block_off,block_on,sectors,flight_minutes';
  const body = rows.map(([date, d]) => [date, d.report_time || '', d.block_off || '', d.block_on || '', d.sectors || 0, d.flight_minutes || 0].join(','));
  return [head, ...body].join('\n');
};

// Aba Escala: RODA (browse rápido, dia a dia) ⇄ LISTA (varrer/editar muitos dias)
// num toggle; o calendário do mês abre como overlay (toque no título). TODA a
// edição passa pelo DutyFormSheet partilhado (um só formulário, com rota+per-diem).
// Na Lista, o cabeçalho traz o export: CSV + PDF do registo ORO.FTL.245.
export default function EscalaScreen({ navigation, route }) {
  const { lang, duties, removeDuty, dayLog, user, company, rosterChanges, checkRosterChanges } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  const [view, setView] = useState(route.params?.view === 'month' ? 'month' : 'wheel');
  const [dutyDate, setDutyDate] = useState(null); // dia a inserir/editar → popup
  const [selIso, setSelIso] = useState(null);      // dia centrado na roda (para o FAB)
  const lastNewDuty = useRef(null);
  const viewBeforeMonth = useRef('wheel');

  // Registo 245 (PDF): identidade do tripulante, persistida localmente para reutilizar.
  const [recOpen, setRecOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [recForm, setRecForm] = useState({ name: '', crewId: '' });
  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then(v => { if (v) { try { setRecForm(JSON.parse(v)); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id]);

  // Atalho do Início (tira de dias) pode pedir já a vista de mês.
  useEffect(() => {
    if (route.params?.view) setView(route.params.view === 'month' ? 'month' : 'wheel');
  }, [route.params?.view]);

  // FAB "Serviço" (tab bar) → abre o popup. Se estiver no calendário, sai dele
  // para o formulário aparecer; na roda/lista mantém a vista.
  useEffect(() => {
    const n = route.params?.newDuty;
    if (n && n !== lastNewDuty.current) {
      lastNewDuty.current = n;
      setView((v) => (v === 'month' ? 'wheel' : v));
      setDutyDate(selIso || isoDay());
    }
  }, [route.params?.newDuty, selIso]);

  // Vindo do sino/banner "Alterações na escala" → abre a folha de revisão (import).
  useEffect(() => {
    if (route.params?.review) { setView((v) => (v === 'month' ? 'wheel' : v)); setImportOpen(true); }
  }, [route.params?.review]);

  // Título segue o mês do dia centrado na roda (selIso); fallback = hoje.
  const monthLabel = (() => {
    const base = selIso ? new Date(`${selIso}T00:00:00`) : new Date();
    const m = base.toLocaleDateString(locale, { month: 'long' });
    return `${m.charAt(0).toUpperCase() + m.slice(1)}, ${base.getFullYear()}`;
  })();

  const openMonth = () => { select(); viewBeforeMonth.current = view === 'month' ? 'wheel' : view; setView('month'); };

  const fmtDate = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d)) return iso;
    const str = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const confirmDelete = (date) => {
    Alert.alert(t('duties.delTitle', lang), t('duties.delMsg', lang), [
      { text: t('common.cancel', lang), style: 'cancel' },
      { text: t('duties.delConfirm', lang), style: 'destructive', onPress: () => { select(); removeDuty(date); } },
    ]);
  };

  // Lista: próximos primeiro (hoje/futuro ascendente), depois passado (descendente).
  const today = isoDay();
  const all = Object.entries(duties).filter(([, d]) => d && !d.deleted && d.report_time);
  const upcoming = all.filter(([iso]) => iso >= today).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const past = all.filter(([iso]) => iso < today).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const listRows = [...upcoming, ...past];

  // ── Export ──
  const onExport = async () => {
    if (!listRows.length) { Alert.alert(t('duties.title', lang), t('duties.exportEmpty', lang)); return; }
    try { await Share.share({ message: buildDutiesCsv(duties), title: 'CrewPact — duties (CSV)' }); } catch { /* cancelado */ }
  };
  const openPdf = () => {
    if (!listRows.length) { Alert.alert(t('duties.exportPdf', lang), t('duties.exportEmpty', lang)); return; }
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

  // ── Vista de mês (calendário) — overlay com ✕ para voltar à vista anterior ──
  if (view === 'month') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.monthBar}>
          <Text style={s.monthBarTitle}>{l('Calendário', 'Calendar')}</Text>
          <TouchableOpacity onPress={() => { select(); setView(viewBeforeMonth.current || 'wheel'); }} hitSlop={8} style={s.iconBtn} accessibilityLabel={t('common.close', lang)}>
            <Ionicons name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
        <CalendarScreen navigation={navigation} embedded />
      </SafeAreaView>
    );
  }

  // ── Vista principal: roda ⇄ lista ──
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.body}>
        <PageHeader
          eyebrow={l('Escala semanal', 'Weekly schedule')}
          title={monthLabel}
          onTitlePress={openMonth}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => { select(); setImportOpen(true); }} hitSlop={8} style={s.iconBtnSm} accessibilityLabel={l('Importar escala', 'Import roster')}>
                <Ionicons name="download-outline" size={18} color={C.text} />
              </TouchableOpacity>
              <NotificationsBell />
            </View>
          }
        />

        {/* Toolbar — toggle Roda|Lista (esq.) + export na Lista (dir.) */}
        <View style={s.toolbar}>
          <View style={s.segWrap}>
            {[['wheel', l('Roda', 'Wheel')], ['list', l('Lista', 'List')]].map(([id, label]) => {
              const on = view === id;
              return (
                <TouchableOpacity key={id} onPress={() => { select(); setView(id); }} style={[s.seg, on && s.segOn]} activeOpacity={0.85}>
                  <Text style={[s.segTxt, on && s.segTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {view === 'list' && listRows.length > 0 ? (
            <View style={s.exportRow}>
              <TouchableOpacity onPress={openPdf} hitSlop={8} style={s.iconBtnSm} accessibilityLabel={t('duties.exportPdf', lang)}>
                <Ionicons name="document-text-outline" size={18} color={C.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onExport} hitSlop={8} style={s.iconBtnSm} accessibilityLabel={t('duties.export', lang)}>
                <Ionicons name="share-outline" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Alterações de escala (Fase 4) — banner que abre a revisão (import) */}
        {rosterChanges?.counts?.total ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => { select(); setImportOpen(true); }} style={s.rcBanner}>
            <Ionicons name="sync-circle" size={20} color={C.warn || C.red} />
            <View style={{ flex: 1 }}>
              <Text style={s.rcTitle}>{l('Alterações na escala', 'Roster changes')}</Text>
              <Text style={s.rcSub} numberOfLines={1}>
                {[((rosterChanges.counts.changed || 0) + (rosterChanges.counts.conflict || 0)) ? `${(rosterChanges.counts.changed || 0) + (rosterChanges.counts.conflict || 0)} ${l('alterada(s)', 'changed')}` : null, rosterChanges.counts.added ? `${rosterChanges.counts.added} ${l('nova(s)', 'new')}` : null, rosterChanges.counts.removed ? `${rosterChanges.counts.removed} ${l('cancelada(s)', 'cancelled')}` : null].filter(Boolean).join(' · ')} · {l('rever', 'review')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.sub} />
          </TouchableOpacity>
        ) : null}

        {view === 'list' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}>
            {listRows.length === 0 ? (
              <Text style={s.empty}>{t('duties.empty', lang)}</Text>
            ) : listRows.map(([date, d]) => (
              <TouchableOpacity key={date} style={s.row} activeOpacity={0.7} onPress={() => setDutyDate(date)}>
                <View style={{ flex: 1 }}>
                  <View style={s.rowTop}>
                    <Text style={s.rowDate}>{fmtDate(date)}</Text>
                    {date === today ? <View style={s.todayDot} /> : null}
                    {d.dirty ? <View style={s.pendDot} accessibilityLabel={t('duties.pending', lang)} /> : null}
                    {d.route ? <Text style={s.rowRoute} numberOfLines={1}>{d.route}</Text> : null}
                  </View>
                  <Text style={s.rowMeta}>
                    {(d.report_time || '--:--')} → {(d.block_on || '--:--')} · {d.sectors || 0} {t('duties.sectorsShort', lang)}{d.flight_minutes ? ` · ${minToHhmm(d.flight_minutes)} ${t('duties.flightShort', lang)}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(date)} hitSlop={8} style={s.delBtn} accessibilityLabel={t('duties.delConfirm', lang)}>
                  <Ionicons name="trash-outline" size={17} color={C.sub} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {listRows.length > 0 ? <Text style={s.foot}>{t('duties.syncHint', lang)}</Text> : null}
          </ScrollView>
        ) : (
          <View style={[s.wheelWrap, { paddingBottom: tabSpace }]}>
            <EscalaWheel onAddDuty={(iso) => setDutyDate(iso)} onSelect={setSelIso} />
          </View>
        )}
      </View>

      <DutyFormSheet visible={!!dutyDate} onClose={() => setDutyDate(null)} date={dutyDate} />
      <RosterImportSheet visible={importOpen} onClose={() => { setImportOpen(false); checkRosterChanges && checkRosterChanges(); }} />

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
  body: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 16 },
  wheelWrap: { flex: 1, justifyContent: 'flex-start' },
  iconBtn: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 8 },
  monthBarTitle: { fontSize: TYPE.label, fontFamily: FONT.heavy, letterSpacing: 0.6, color: C.text, textTransform: 'uppercase' },

  // Toolbar: toggle (esq.) + export (dir.)
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  segWrap: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: RADIUS.pill, padding: 3 },
  seg: { paddingVertical: 7, paddingHorizontal: 18, borderRadius: RADIUS.pill },
  segOn: { backgroundColor: C.card, ...SHADOW.sm },
  segTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.sub },
  segTxtOn: { color: C.text },
  exportRow: { flexDirection: 'row', gap: 8 },
  iconBtnSm: { width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },

  // Alterações de escala (Fase 4) — banner
  rcBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.warnSoft || C.soft, borderWidth: 1, borderColor: C.warn || C.line, borderRadius: 14, padding: 12, marginBottom: 14 },
  rcTitle: { fontSize: TYPE.label, fontFamily: FONT.heavy, color: C.text },
  rcSub: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.sub, marginTop: 2 },

  // Lista de duties
  empty: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDate: { fontSize: TYPE.value, fontFamily: FONT.bold, color: C.text },
  todayDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: C.red },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.warn || C.sub },
  rowRoute: { fontSize: TYPE.micro, fontFamily: FONT.heavy, letterSpacing: 0.5, color: C.sub, marginLeft: 'auto' },
  rowMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 3, fontFamily: FONT.medium },
  delBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },

  // Folha do registo FTL.245
  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  recSub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  recInput: { backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.line, color: C.text, fontSize: TYPE.body },
  saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
