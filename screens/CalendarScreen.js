import React, { useContext, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as _C, RADIUS, SPACE, TYPE, GUTTER } from '../data/constants';
import DetailTopBar from '../components/DetailTopBar';
import BottomSheet from '../components/BottomSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { catLabel, fmtVal, fmtEur } from '../data/extras';
import { getFlightsInRange } from '../data/calendar';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../App';

const WEEKDAYS = {
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const FTL_CATS = new Set(['voo', 'servico']);
// Códigos dos artigos das 3 calculadoras (para abrir a calculadora certa por dia).
const CALC_CODES = { psv: 'ORO.FTL.205', limits: 'ORO.FTL.210', rest: 'ORO.FTL.235' };

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

// Linha de registo FTL: toca para editar (reabre a calculadora desse dia),
// caixote para apagar. Só mexe nos dados da app — nunca no calendário real.
function RecRow({ s, C, label, value, onPress, onDelete }) {
  return (
    <TouchableOpacity style={s.recRow} activeOpacity={0.7} onPress={onPress}>
      <Text style={s.recLbl}>{label}</Text>
      <Text style={s.recVal} numberOfLines={1}>{value}</Text>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={s.delBtn} accessibilityLabel="delete">
        <Ionicons name="trash-outline" size={16} color={C.sub} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function CalendarScreen({ navigation }) {
  const { lang, dayLog, extras, updateDayLog, removeDayLog, removeExtra } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';

  const today = isoDay();
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selISO, setSelISO] = useState(today);
  const [flightsByDay, setFlightsByDay] = useState({});
  const [calOk, setCalOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const monthKeyNum = viewMonth.getFullYear() * 12 + viewMonth.getMonth();
  const grid = useMemo(() => buildGrid(viewMonth), [monthKeyNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voos do mês visível (intervalo da grelha). Só de leitura.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { ok, flights } = await getFlightsInRange(grid.gridStart, grid.gridEnd);
        if (cancelled) return;
        const map = {};
        for (const f of flights) (map[f.dateISO] = map[f.dateISO] || []).push(f);
        setFlightsByDay(map); setCalOk(ok);
      } catch { if (!cancelled) { setFlightsByDay({}); setCalOk(false); } }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [grid]);

  const shiftMonth = (delta) => { select(); setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1)); };
  const pickDay = (cell) => {
    select();
    setSelISO(cell.iso);
    if (!cell.inMonth) setViewMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
  };

  const selDate = new Date(`${selISO}T00:00:00`);
  const selFlights = flightsByDay[selISO] || [];
  const selDay = dayLog[selISO] || {};
  const selExtras = extras.filter(e => e.date === selISO);
  const hasRecords = !!(selDay.psv || selDay.rest?.base != null || selDay.rest?.away != null) || selExtras.length > 0;

  // Abrir a calculadora (PSV/limites/repouso) ligada ao dia selecionado.
  const openCalc = (code) => { setAddOpen(false); navigation.navigate('FtlCalc', { code, date: selISO }); };
  // Apagar registos FTL do dia (só os nossos dados — nunca o calendário real).
  const delPsv = () => { select(); removeDayLog(selISO, 'psv'); };
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
            <Text style={s.noteTxt}>{t('cal.permission', lang)}</Text>
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

        {/* Registos FTL do dia */}
        <View style={s.recHead}>
          <Text style={[s.secHd, { marginTop: 0, marginBottom: 0 }]}>{t('cal.records', lang)}</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => { select(); setAddOpen(true); }} hitSlop={8} accessibilityLabel={t('cal.addRecord', lang)}>
            <Ionicons name="add" size={20} color={C.onDark} />
          </TouchableOpacity>
        </View>
        {!hasRecords ? (
          <Text style={s.empty}>{t('cal.noRecords', lang)}</Text>
        ) : (
          <>
            {selDay.psv ? (
              <RecRow s={s} C={C} label={t('home.psvMaxLbl', lang)} value={selDay.psv.result}
                onPress={() => openCalc(CALC_CODES.psv)} onDelete={delPsv} />
            ) : null}
            {selDay.rest?.base != null ? (
              <RecRow s={s} C={C} label={t('home.restBase', lang)} value={fmtVal(selDay.rest.base, 'h')}
                onPress={() => openCalc(CALC_CODES.rest)} onDelete={() => delRest('base')} />
            ) : null}
            {selDay.rest?.away != null ? (
              <RecRow s={s} C={C} label={t('home.restAway', lang)} value={fmtVal(selDay.rest.away, 'h')}
                onPress={() => openCalc(CALC_CODES.rest)} onDelete={() => delRest('away')} />
            ) : null}
            {selExtras.map(e => (
              <RecRow key={e.id} s={s} C={C} label={catLabel(e.category, lang)}
                value={FTL_CATS.has(e.category) ? fmtVal(e.amount, 'h') : fmtEur(e.amount)}
                onPress={() => openCalc(CALC_CODES.limits)} onDelete={() => delExtra(e.id)} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Escolher que calculadora registar nesse dia */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title={t('cal.addRecord', lang)} closeLabel={t('common.close', lang)}>
        <View style={s.chooseWrap}>
          {[
            { code: CALC_CODES.psv, label: t('cal.optPsv', lang), icon: 'time-outline' },
            { code: CALC_CODES.limits, label: t('cal.optLimits', lang), icon: 'layers-outline' },
            { code: CALC_CODES.rest, label: t('cal.optRest', lang), icon: 'bed-outline' },
          ].map(o => (
            <TouchableOpacity key={o.code} style={s.chooseRow} activeOpacity={0.8} onPress={() => openCalc(o.code)}>
              <View style={s.chooseIcon}><Ionicons name={o.icon} size={18} color={C.text} /></View>
              <Text style={s.chooseTxt}>{o.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.sub} />
            </TouchableOpacity>
          ))}
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
  noteTxt: { flex: 1, fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },

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
  chooseWrap: { padding: 20, gap: 10 },
  chooseRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: SPACE.md, backgroundColor: C.card },
  chooseIcon: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  chooseTxt: { flex: 1, fontSize: TYPE.body, fontWeight: '600', color: C.text },
});
