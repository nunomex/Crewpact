import React, { useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, AppState, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACE, TYPE, GUTTER, TRACK_DISPLAY, FONT } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { fmtVal } from '../data/extras';
import { sectorDistanceNM } from '../data/airports';
import { getFlightsInRange, getDutiesInRange, requestCalendarAccess } from '../data/calendar';
import { dutyFromActivity } from '../data/rosterImport';
import { useFocusEffect } from '@react-navigation/native';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';

const WEEKDAYS = {
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
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

export default function CalendarScreen({ navigation, embedded }) {
  const { lang, dayLog, updateDayLog, removeDayLog, saveDuty, ae, crewCategory } = useContext(AppContext);
  const fmtEur = (n) => {
    if (n == null) return '—';
    const [int, dec] = Number(n).toFixed(2).split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${grouped}.${dec}` : `${grouped},${dec} €`;
  };
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  // FTL/cabine: cada dia mostra os cálculos da "Atividade" registados (PSV/limites/repouso).

  const today = isoDay();
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selISO, setSelISO] = useState(today);
  const [flightsByDay, setFlightsByDay] = useState({});
  const [calOk, setCalOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

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

  // Importa as atividades do mês visível (agrupadas em duties) para a tabela `duties`,
  // uma por dia (upsert). Não toca no calendário real — só lê. Cada duty alimenta o
  // motor FTL via saveDuty (deriva PSV/limites/repouso). Substitui o que já existir no dia.
  const onImport = async () => {
    if (importing) return;
    select();
    setImporting(true);
    try {
      const { ok, duties } = await getDutiesInRange(grid.gridStart, grid.gridEnd);
      if (!ok) { setCalOk(false); Alert.alert(t('cal.import', lang), t('cal.permission', lang)); return; }
      let n = 0;
      for (const act of duties) {
        const row = dutyFromActivity(act);
        if (row && row.duty_date) { saveDuty(row.duty_date, row); n++; }
      }
      if (n > 0) { success(); loadFlights(); }
      Alert.alert(t('cal.import', lang), n > 0 ? t('cal.importOk', lang).replace('{n}', n) : t('cal.importNone', lang));
    } catch {
      Alert.alert(t('cal.import', lang), t('cal.importErr', lang));
    } finally {
      setImporting(false);
    }
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
  const hasRecords = !!(selDay.psv || selDay.rest?.base != null || selDay.rest?.away != null || selDay.voo > 0 || selDay.servico > 0);

  // O "+" e os registos abrem a calculadora unificada "Atividade" ligada a este dia.
  const openDuty = () => { navigation.navigate('FtlCalc', { duty: true, date: selISO }); };
  // Apagar registos do dia (só os nossos dados — nunca o calendário real).
  const delPsv = () => { select(); removeDayLog(selISO, 'psv'); };
  const delHours = (key) => { select(); removeDayLog(selISO, key); }; // 'voo' | 'servico'
  const delRest = (place) => {
    select();
    const r = { ...(selDay.rest || {}) };
    ['', 'Prev', 'At', 'AtDir', 'AtDay'].forEach(suf => delete r[`${place}${suf}`]);
    if (r.base != null || r.away != null) updateDayLog(selISO, 'rest', r);
    else removeDayLog(selISO, 'rest');
  };

  return (
    <SafeAreaView style={s.safe} edges={embedded ? [] : ['top']}>
      {embedded ? null : <DetailTopBar onBack={() => navigation.goBack()} backLabel={t('common.back', lang)} />}

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
                    {hasFlight ? <View style={s.flightDot} /> : null}
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
        <View style={s.flightsHead}>
          <Text style={[s.secHd, { marginTop: 0, marginBottom: 0 }]}>{t('cal.flights', lang)}</Text>
          <TouchableOpacity style={s.importBtn} onPress={onImport} disabled={importing} activeOpacity={0.85} accessibilityLabel={t('cal.import', lang)} hitSlop={{ top: 7, bottom: 7, left: 6, right: 6 }}>
            {importing ? <ActivityIndicator size="small" color={C.sub} />
              : <><Ionicons name="download-outline" size={14} color={C.text} /><Text style={s.importBtnTxt}>{t('cal.import', lang)}</Text></>}
          </TouchableOpacity>
        </View>
        {!calOk ? (
          <View style={s.note}>
            <Ionicons name="information-circle-outline" size={16} color={C.sub} />
            <View style={{ flex: 1 }}>
              <Text style={s.noteTxt}>{t('cal.permission', lang)}</Text>
              <TouchableOpacity onPress={requestAccess} activeOpacity={0.85} style={s.grantBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="calendar-outline" size={15} color="#fff" />
                <Text style={s.grantBtnTxt}>{t('cal.grant', lang)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : selFlights.length === 0 ? (
          <Text style={s.empty}>{loading ? t('cal.loading', lang) : t('cal.noFlights', lang)}</Text>
        ) : (
          selFlights.map((f, i) => {
            let pd = null;
            if (ae && crewCategory && f.depAirport && f.arrAirport) {
              const dist = sectorDistanceNM(f.depAirport, f.arrAirport);
              if (dist != null) pd = ae.perDiem(crewCategory, [dist]);
            }
            return (
              <View key={i} style={s.flightRow}>
                <View style={s.flightIcon}><Ionicons name="airplane" size={16} color={C.text} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.flightRoute}>{f.depAirport} → {f.arrAirport}</Text>
                  <Text style={s.flightMeta}>
                    {f.depTime}–{f.arrTime} · {t('home.flightBoarding', lang)} {f.report}
                    {pd != null ? <Text> · per diem <Text style={s.pdEm}>{fmtEur(pd)}</Text></Text> : null}
                  </Text>
                </View>
                {f.aircraft !== '—' ? <Text style={s.flightAc}>{f.aircraft}</Text> : null}
              </View>
            );
          })
        )}

        {/* Registos do dia — cálculos da Atividade (PSV · limites · repouso) */}
        <View style={s.recHead}>
          <Text style={[s.secHd, { marginTop: 0, marginBottom: 0 }]}>{t('cal.records', lang)}</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => { select(); openDuty(); }} hitSlop={8} accessibilityLabel={t('cal.addRecord', lang)}>
            <Ionicons name="add" size={20} color={C.onDark} />
          </TouchableOpacity>
        </View>
        {!hasRecords ? (
          <Text style={s.empty}>{t('cal.noRecords', lang)}</Text>
        ) : (
          <>
            {selDay.psv ? (
              <RecRow s={s} C={C} label={t('home.psvMaxLbl', lang)} value={selDay.psv.result}
                onPress={openDuty} onDelete={delPsv} />
            ) : null}
            {selDay.rest?.base != null ? (
              <RecRow s={s} C={C} label={t('home.restBase', lang)} value={fmtVal(selDay.rest.base, 'h')}
                onPress={openDuty} onDelete={() => delRest('base')} />
            ) : null}
            {selDay.rest?.away != null ? (
              <RecRow s={s} C={C} label={t('home.restAway', lang)} value={fmtVal(selDay.rest.away, 'h')}
                onPress={openDuty} onDelete={() => delRest('away')} />
            ) : null}
            {selDay.servico > 0 ? (
              <RecRow s={s} C={C} label={t('ftl.duty', lang)} value={fmtVal(selDay.servico, 'h')}
                onPress={openDuty} onDelete={() => delHours('servico')} />
            ) : null}
            {selDay.voo > 0 ? (
              <RecRow s={s} C={C} label={t('ftl.flight', lang)} value={fmtVal(selDay.voo, 'h')}
                onPress={openDuty} onDelete={() => delHours('voo')} />
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 2 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  navBtn: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  monthLbl: { fontSize: TYPE.title, fontFamily: FONT.semibold, letterSpacing: TRACK_DISPLAY, color: C.text },

  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dow: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.sub, paddingVertical: 6 },
  dayCircle: { width: 38, height: 38, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  dayToday: { backgroundColor: C.ink },
  daySel: { borderColor: C.text },
  dayTxt: { fontSize: TYPE.sub, color: C.text, fontFamily: FONT.medium },
  dayMuted: { color: C.subLight },
  dayTodayTxt: { color: C.onDark, fontFamily: FONT.bold },
  markerSlot: { height: 14, alignItems: 'center', justifyContent: 'center' },
  flightDot: { width: 5, height: 5, borderRadius: RADIUS.pill, backgroundColor: C.red },

  dayHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.lg, marginBottom: SPACE.sm, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: C.line },
  dayHeadNum: { fontSize: TYPE.display, fontFamily: FONT.semibold, letterSpacing: TRACK_DISPLAY, color: C.text },
  dayHeadTop: { fontSize: TYPE.eyebrow, letterSpacing: 1.5, color: C.sub, fontFamily: FONT.bold, textTransform: 'uppercase' },
  dayHeadSub: { fontSize: TYPE.body, color: C.text, fontFamily: FONT.semibold, marginTop: 1 },

  secHd: { fontSize: TYPE.eyebrow, letterSpacing: 2, color: C.sub, fontFamily: FONT.bold, marginTop: SPACE.md, marginBottom: SPACE.sm },
  flightsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.md, marginBottom: SPACE.sm },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 30, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  importBtnTxt: { fontSize: TYPE.micro, fontFamily: FONT.bold, color: C.text, letterSpacing: 0.3 },
  empty: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.sm },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingVertical: SPACE.sm },
  noteTxt: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: SPACE.sm, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9 },
  grantBtnTxt: { color: '#fff', fontSize: TYPE.sub, fontFamily: FONT.semibold },

  flightRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card },
  flightIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  flightRoute: { fontSize: TYPE.value, fontFamily: FONT.bold, color: C.text, letterSpacing: -0.2 },
  flightMeta: { fontSize: TYPE.micro, color: C.sub, marginTop: 2 },
  pdEm: { color: C.red, fontFamily: FONT.bold },
  flightAc: { fontSize: TYPE.micro, fontFamily: FONT.medium, color: C.sub },

  recHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE.lg, marginBottom: SPACE.sm },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  recLbl: { fontSize: TYPE.sub, color: C.text, flex: 1 },
  recVal: { fontSize: TYPE.sub, fontFamily: FONT.semibold, color: C.text },
  delBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  // Formulário de registo AE (categoria + €) — espelha o cartão do mês no Início.
  aeForm: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.pill, paddingHorizontal: 12, minHeight: 38 },
  catChipTxt: { fontSize: TYPE.label, fontFamily: FONT.semibold },
  amountInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: TYPE.heading, fontFamily: FONT.medium, color: C.text },
  saveBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
});
