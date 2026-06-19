import React, { useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, AppState, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, SPACE, TYPE, GUTTER } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import BottomSheet from '../components/BottomSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { catLabel, extraCategories, fmtVal, fmtEur } from '../data/extras';
import { getFlightsInRange, requestCalendarAccess } from '../data/calendar';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../App';

const WEEKDAYS = {
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const FTL_CATS = new Set(['voo', 'servico']); // filtra registos FTL legados dos extras AE

// Grelha mensal (semana a começar 2ª-feira). Inclui os dias de transbordo do mês
// anterior/seguinte (a cinzento), como num calendário normal.
function buildGrid(monthDate) {
  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startWd = (first.getDay() + 6) % 7;                 // índice 2ª-feira do dia 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWd + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, month, 1 - startWd + i);
    cells.push({ date: d, iso: isoDay(d), inMonth: d.getMonth() === month });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return {
    weeks,
    gridStart: new Date(year, month, 1 - startWd),
    gridEnd: new Date(year, month, 1 - startWd + totalCells), // exclusivo
  };
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Linha de registo: toca para editar (reabre a calculadora desse dia, quando
// aplicável), caixote para apagar. Só mexe nos dados da app — nunca no calendário
// real. Sem `onPress` (ex.: extras AE), a linha é estática.
function RecRow({ s, C, label, value, onPress, onDelete }) {
  const Body = onPress ? TouchableOpacity : View;
  return (
    <Body style={s.recRow} {...(onPress ? { activeOpacity: 0.7, onPress } : {})}>
      <Text style={s.recLbl}>{label}</Text>
      <Text style={s.recVal} numberOfLines={1}>{value}</Text>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={s.delBtn} accessibilityLabel="delete">
        <Ionicons name="trash-outline" size={16} color={C.sub} />
      </TouchableOpacity>
    </Body>
  );
}

export default function CalendarScreen({ navigation }) {
  const { lang, dayLog, extras, addExtra, updateDayLog, removeDayLog, removeExtra, isFtl } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  // FTL (TAP) regista cálculos da "Atividade" por dia; AE (easyJet) regista extras (€). `isFtl` vem do contexto.

  const today = isoDay();
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selISO, setSelISO] = useState(today);
  const [flightsByDay, setFlightsByDay] = useState({});
  const [calOk, setCalOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newCat, setNewCat] = useState(() => extraCategories('ae')[0].id); // categoria do extra AE
  const [newAmount, setNewAmount] = useState('');

  const monthKeyNum = viewMonth.getFullYear() * 12 + viewMonth.getMonth();
  const grid = useMemo(() => buildGrid(viewMonth), [monthKeyNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voos do mês visível (intervalo da grelha). Só de leitura. Um token por pedido
  // descarta resultados obsoletos (ex.: troca de mês a meio de uma leitura).
  const reqRef = useRef(0);
  const loadFlights = useCallback(async () => {
    const token = ++reqRef.current;
    setLoading(true);
    try {
      const { ok, flights } = await getFlightsInRange(grid.gridStart, grid.gridEnd);
      if (token !== reqRef.current) return;
      const map = {};
      for (const f of flights) (map[f.dateISO] = map[f.dateISO] || []).push(f);
      setFlightsByDay(map); setCalOk(ok);
    } catch { if (token === reqRef.current) { setFlightsByDay({}); setCalOk(false); } }
    if (token === reqRef.current) setLoading(false);
  }, [grid]);

  // Sincroniza ao mudar de mês, ao ganhar foco (ao entrar) e quando a app volta
  // de segundo plano (apanha voos que a eCrew tenha posto no calendário entretanto).
  useEffect(() => { loadFlights(); }, [loadFlights]);
  useFocusEffect(useCallback(() => { loadFlights(); }, [loadFlights]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') loadFlights(); });
    return () => sub.remove();
  }, [loadFlights]);

  // Pede acesso ao calendário; se já tiver sido recusado de vez, abre as Definições.
  const requestAccess = async () => {
    select();
    const res = await requestCalendarAccess();
    if (res?.granted) loadFlights();
    else if (res && res.canAskAgain === false) Linking.openSettings();
  };

  const shiftMonth = (delta) => { select(); setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1)); };
  const pickDay = (cell) => {
    select();
    setSelISO(cell.iso);
    if (!cell.inMonth) setViewMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
  };

  const selDate = new Date(`${selISO}T00:00:00`);
  const selFlights = flightsByDay[selISO] || [];
  const selDay = dayLog[selISO] || {};
  // Extras AE (€) do dia. (O filtro FTL_CATS ignora registos FTL legados nos extras.)
  const selExtras = extras.filter(e => e.date === selISO && !FTL_CATS.has(e.category));
  const hasFtlRecords = !!(selDay.psv || selDay.rest?.base != null || selDay.rest?.away != null || selDay.voo > 0 || selDay.servico > 0);
  const hasRecords = isFtl ? hasFtlRecords : selExtras.length > 0;

  // FTL: o "+" e os registos abrem a calculadora unificada "Atividade" ligada a este dia.
  const openDuty = () => { setAddOpen(false); navigation.navigate('FtlCalc', { duty: true, date: selISO }); };
  // Registar um extra AE (categoria + €) no dia selecionado.
  const saveAeExtra = () => {
    const amount = parseFloat(String(newAmount).replace(',', '.')) || 0;
    if (amount <= 0) return;
    addExtra({ month: selISO.slice(0, 7), date: selISO, category: newCat, amount });
    success();
    setNewAmount('');
    setAddOpen(false);
  };
  // Apagar registos do dia (só os nossos dados — nunca o calendário real).
  const delPsv = () => { select(); removeDayLog(selISO, 'psv'); };
  const delHours = (key) => { select(); removeDayLog(selISO, key); }; // 'voo' | 'servico'
  const delExtra = (id) => { select(); removeExtra(id); };
  const delRest = (place) => {
    select();
    const r = { ...(selDay.rest || {}) };
    ['', 'Prev', 'At', 'AtDir', 'AtDay'].forEach(suf => delete r[`${place}${suf}`]);
    if (r.base != null || r.away != null) updateDayLog(selISO, 'rest', r);
    else removeDayLog(selISO, 'rest');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]}>
        {/* Navegação de mês */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10} style={s.navBtn}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={s.monthLbl}>{cap(viewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' }))}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Cabeçalho dos dias da semana */}
        <View style={s.weekRow}>
          {WEEKDAYS[lang === 'en' ? 'en' : 'pt'].map((w, i) => (
            <View key={w} style={s.cell}><Text style={[s.dow, i >= 5 && { color: C.subLight }]}>{w}</Text></View>
          ))}
        </View>

        {/* Grelha */}
        {grid.weeks.map((week, wi) => (
          <View key={wi} style={s.weekRow}>
            {week.map(cell => {
              const isToday = cell.iso === today;
              const isSel = cell.iso === selISO;
              const hasFlight = !!flightsByDay[cell.iso];
              return (
                <TouchableOpacity key={cell.iso} style={s.cell} activeOpacity={0.7} onPress={() => pickDay(cell)}>
                  <View style={[s.dayCircle, isToday && s.dayToday, isSel && !isToday && s.daySel]}>
                    <Text style={[s.dayTxt, !cell.inMonth && s.dayMuted, isToday && s.dayTodayTxt]}>{cell.date.getDate()}</Text>
                  </View>
                  <View style={s.markerSlot}>
                    {hasFlight ? <Ionicons name="airplane" size={11} color={isToday ? C.text : C.sub} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Dia selecionado */}
        <View style={s.dayHead}>
          <Text style={s.dayHeadNum}>{selDate.getDate()}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.dayHeadTop}>{selISO === today ? t('cal.today', lang) : cap(selDate.toLocaleDateString(locale, { weekday: 'long' }))}</Text>
            <Text style={s.dayHeadSub}>{cap(selDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' }))}</Text>
          </View>
          {loading ? <ActivityIndicator size="small" color={C.sub} /> : null}
        </View>

        {/* Voos (leitura) */}
        <Text style={s.secHd}>{t('cal.flights', lang)}</Text>
        {!calOk ? (
          <View style={s.note}>
            <Ionicons name="information-circle-outline" size={16} color={C.sub} />
            <View style={{ flex: 1 }}>
              <Text style={s.noteTxt}>{t('cal.permission', lang)}</Text>
              <TouchableOpacity onPress={requestAccess} activeOpacity={0.85} style={s.grantBtn}>
                <Ionicons name="calendar-outline" size={15} color="#fff" />
                <Text style={s.grantBtnTxt}>{t('cal.grant', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : selFlights.length === 0 ? (
          <Text style={s.empty}>{loading ? t('cal.loading', lang) : t('cal.noFlights', lang)}</Text>
        ) : (
          selFlights.map((f, i) => (
            <View key={i} style={s.flightRow}>
              <View style={s.flightIcon}><Ionicons name="airplane" size={16} color={C.text} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.flightRoute}>{f.depAirport} → {f.arrAirport}</Text>
                <Text style={s.flightMeta}>{f.depTime}–{f.arrTime} · {t('home.flightBoarding', lang)} {f.report}</Text>
              </View>
              {f.aircraft !== '—' ? <Text style={s.flightAc}>{f.aircraft}</Text> : null}
            </View>
          ))
        )}

        {/* Registos do dia — FTL (cálculos da Atividade) ou AE (extras em €) */}
        <View style={s.recHead}>
          <Text style={[s.secHd, { marginTop: 0, marginBottom: 0 }]}>{isFtl ? t('cal.records', lang) : t('cal.recordsAe', lang)}</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => { select(); if (isFtl) openDuty(); else setAddOpen(true); }} hitSlop={8} accessibilityLabel={t('cal.addRecord', lang)}>
            <Ionicons name="add" size={20} color={C.onDark} />
          </TouchableOpacity>
        </View>
        {!hasRecords ? (
          <Text style={s.empty}>{t('cal.noRecords', lang)}</Text>
        ) : (
          <>
            {isFtl && selDay.psv ? (
              <RecRow s={s} C={C} label={t('home.psvMaxLbl', lang)} value={selDay.psv.result}
                onPress={openDuty} onDelete={delPsv} />
            ) : null}
            {isFtl && selDay.rest?.base != null ? (
              <RecRow s={s} C={C} label={t('home.restBase', lang)} value={fmtVal(selDay.rest.base, 'h')}
                onPress={openDuty} onDelete={() => delRest('base')} />
            ) : null}
            {isFtl && selDay.rest?.away != null ? (
              <RecRow s={s} C={C} label={t('home.restAway', lang)} value={fmtVal(selDay.rest.away, 'h')}
                onPress={openDuty} onDelete={() => delRest('away')} />
            ) : null}
            {isFtl && selDay.servico > 0 ? (
              <RecRow s={s} C={C} label={t('ftl.duty', lang)} value={fmtVal(selDay.servico, 'h')}
                onPress={openDuty} onDelete={() => delHours('servico')} />
            ) : null}
            {isFtl && selDay.voo > 0 ? (
              <RecRow s={s} C={C} label={t('ftl.flight', lang)} value={fmtVal(selDay.voo, 'h')}
                onPress={openDuty} onDelete={() => delHours('voo')} />
            ) : null}
            {selExtras.map(e => (
              <RecRow key={e.id} s={s} C={C} label={e.label || catLabel(e.category, lang)}
                value={fmtEur(e.amount)} onDelete={() => delExtra(e.id)} />
            ))}
          </>
        )}
      </ScrollView>

      {/* AE: registar extra (categoria + €) no dia */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title={t('cal.addRecord', lang)} closeLabel={t('common.close', lang)}>
        <View style={s.aeForm}>
          <Text style={s.fieldLbl}>{t('home.category', lang)}</Text>
          <View style={s.catWrap}>
            {extraCategories('ae').map(c => {
              const sel = newCat === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setNewCat(c.id)} style={[s.catChip, { backgroundColor: sel ? C.ink : C.soft }]}>
                  <Ionicons name={c.icon} size={14} color={sel ? '#fff' : C.sub} />
                  <Text style={[s.catChipTxt, { color: sel ? '#fff' : C.sub }]}>{catLabel(c.id, lang)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[s.fieldLbl, { marginTop: 16 }]}>{t('home.amount', lang)}</Text>
          <TextInput value={newAmount} onChangeText={setNewAmount} keyboardType="decimal-pad" placeholder="0,00"
            placeholderTextColor={C.sub} style={s.amountInput} />
          <TouchableOpacity onPress={saveAeExtra} style={[s.saveBtn, { opacity: (parseFloat(String(newAmount).replace(',', '.')) || 0) > 0 ? 1 : 0.4 }]}>
            <Text style={s.saveBtnTxt}>{t('common.save', lang)}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 2 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  navBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  monthLbl: { fontSize: TYPE.title, fontWeight: '600', color: C.text },

  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dow: { fontSize: TYPE.micro, fontWeight: '600', color: C.sub, paddingVertical: 6 },
  dayCircle: { width: 38, height: 38, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  dayToday: { backgroundColor: C.ink },
  daySel: { borderColor: C.text },
  dayTxt: { fontSize: TYPE.sub, color: C.text, fontWeight: '500' },
  dayMuted: { color: C.subLight },
  dayTodayTxt: { color: C.onDark, fontWeight: '700' },
  markerSlot: { height: 14, alignItems: 'center', justifyContent: 'center' },

  dayHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.lg, marginBottom: SPACE.sm, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.line },
  dayHeadNum: { fontSize: TYPE.display, fontWeight: '300', letterSpacing: -1, color: C.text },
  dayHeadTop: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.sub, fontWeight: '700', textTransform: 'uppercase' },
  dayHeadSub: { fontSize: TYPE.body, color: C.text, fontWeight: '600', marginTop: 1 },

  secHd: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontWeight: '700', marginTop: SPACE.md, marginBottom: SPACE.sm },
  empty: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingVertical: SPACE.sm },
  noteTxt: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: SPACE.sm, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  grantBtnTxt: { color: '#fff', fontSize: TYPE.sub, fontWeight: '600' },

  flightRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  flightIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  flightRoute: { fontSize: TYPE.value, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  flightMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 2 },
  flightAc: { fontSize: TYPE.micro, fontFamily: 'monospace', color: C.sub },

  recHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.lg, marginBottom: SPACE.sm },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  recLbl: { fontSize: TYPE.sub, color: C.text, flex: 1 },
  recVal: { fontSize: TYPE.sub, fontFamily: 'monospace', fontWeight: '600', color: C.text },
  delBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  // Formulário de registo AE (categoria + €) — espelha o cartão do mês no Início.
  aeForm: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontWeight: '600', color: C.text, marginBottom: 8 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.pill, paddingHorizontal: 12, minHeight: 38 },
  catChipTxt: { fontSize: TYPE.label, fontWeight: '600' },
  amountInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.heading, fontFamily: 'monospace', color: C.text },
  saveBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontWeight: '600' },
});
