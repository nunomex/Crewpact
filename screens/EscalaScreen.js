import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, GUTTER, TYPE, SPACE, FONT, SHADOW } from '../data/constants';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, useTheme, isoDay } from '../data/appContext';
import { buildRecordModel, recordHtml } from '../data/ftlRecord';
import { printToPdfAndShare } from '../data/pdf';
import { requestCalendarAccess } from '../data/calendar';
import { routeDistancesNM, monthlyPerDiem } from '../data/perdiem';
import NotificationsBell from '../components/NotificationsBell';
import DutyFormSheet from '../components/DutyFormSheet';
import RosterImportSheet from '../components/RosterImportSheet';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import BottomSheet from '../components/BottomSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };

// CSV dos registos (apoio ao registo de tempos/serviço — ORO.FTL.245).
const buildDutiesCsv = (duties) => {
  const rows = Object.entries(duties).filter(([, d]) => !d.deleted).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const head = 'duty_date,report_time,block_off,block_on,sectors,flight_minutes';
  const body = rows.map(([date, d]) => [date, d.report_time || '', d.block_off || '', d.block_on || '', d.sectors || 0, d.flight_minutes || 0].join(','));
  return [head, ...body].join('\n');
};

// Aba Escala: o MÊS em cards de dia (um por dia). Mês navegável ‹ › + resumo no topo
// (serviços/folgas/per-diem). A lista começa no dia de hoje (mês atual) e mostra TODOS
// os dias — serviço (tipo+rota+horas+€, com pílula 🌙 da pernoita) ou folga (dia vazio).
// Tocar num serviço → DutyDetail; tocar numa folga → DutyFormSheet (inserir nesse dia).
// Apagar manuais vive no DutyDetail. Per-diem/pernoita derivados do motor AE (ae.perDiem/
// ae.nightStop); a duty NÃO guarda €. No topo, o selo do calendário ligado + banner de
// alterações (azul, informativo). Export CSV/PDF (ORO.FTL.245) nos ícones do cabeçalho.
export default function EscalaScreen({ navigation, route }) {
  const { lang, duties, dayLog, user, company, ae, crewCategory, rosterChanges, checkRosterChanges, notify,
    calendarId, setCalendarId, calendarName, setCalendarName } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Mês visível (1.º dia). Default = mês de hoje.
  const [monthDate, setMonthDate] = useState(() => { const t0 = new Date(); return new Date(t0.getFullYear(), t0.getMonth(), 1); });
  const [dutyDate, setDutyDate] = useState(null); // dia a inserir/editar → popup
  const lastNewDuty = useRef(null);

  // Registo 245 (PDF): identidade do tripulante, persistida localmente para reutilizar.
  const [recOpen, setRecOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh: reverifica a escala
  const [flashIso, setFlashIso] = useState(null);       // realce breve do card após guardar
  const [recForm, setRecForm] = useState({ name: '', crewId: '' });
  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then(v => { if (v) { try { setRecForm(JSON.parse(v)); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id]);

  // FAB "Serviço" (tab bar) → salta para o mês de hoje e abre o popup do novo serviço (hoje).
  useEffect(() => {
    const n = route.params?.newDuty;
    if (n && n !== lastNewDuty.current) {
      lastNewDuty.current = n;
      const t0 = new Date(); setMonthDate(new Date(t0.getFullYear(), t0.getMonth(), 1));
      setDutyDate(isoDay());
    }
  }, [route.params?.newDuty]);

  // Vindo do sino/banner "Alterações na escala" → abre a folha de revisão (import).
  useEffect(() => {
    if (route.params?.review) setImportOpen(true);
  }, [route.params?.review]);

  // Voltou do DutyDetailScreen após editar → salta para o mês do serviço e re-acende o realce.
  const lastFlash = useRef(null);
  useEffect(() => {
    const fd = route.params?.flashDuty, ts = route.params?.flashTs;
    if (fd && ts && ts !== lastFlash.current) {
      lastFlash.current = ts;
      const [yy, mm] = String(fd).split('-');
      if (yy && mm) setMonthDate(new Date(Number(yy), Number(mm) - 1, 1));
      setFlashIso(fd); setTimeout(() => setFlashIso(null), 900);
    }
  }, [route.params?.flashDuty, route.params?.flashTs]);

  // Ligar ao calendário do telemóvel: o prompt do sistema dispara SÓ aqui (não ao abrir a aba).
  // Concedido → abre o picker p/ escolher qual calendário tem a escala. Negado p/ sempre → Definições.
  const connectCalendar = async () => {
    select();
    const res = await requestCalendarAccess();
    if (res?.granted) setCalPickerOpen(true);
    else if (res && res.canAskAgain === false) Linking.openSettings();
  };

  // ── € (cêntimos, NUNCA arredonda — money-no-rounding) ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, d] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

  const today = isoDay();
  const anyDuty = Object.values(duties).some((d) => d && !d.deleted && d.report_time);

  // ── Mês visível: rótulo, dias, e a lista (começa em hoje no mês atual) ──
  const y = monthDate.getFullYear(), m0 = monthDate.getMonth();
  const ym = `${y}-${String(m0 + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(y, m0 + 1, 0).getDate();
  const isCurrentMonth = today.startsWith(ym);
  // Mês atual: o mês TODO, mas ordenado a começar em HOJE (hoje→fim, depois 1→ontem) — nada
  // fica escondido e hoje lidera. Outros meses: 1→fim (cronológico).
  const upcomingDays = [], pastDays = [];
  if (isCurrentMonth) {
    const td = Number(today.slice(8, 10));
    for (let dn = td; dn <= daysInMonth; dn++) upcomingDays.push(`${ym}-${String(dn).padStart(2, '0')}`);
    for (let dn = 1; dn < td; dn++) pastDays.push(`${ym}-${String(dn).padStart(2, '0')}`);
  } else {
    for (let dn = 1; dn <= daysInMonth; dn++) upcomingDays.push(`${ym}-${String(dn).padStart(2, '0')}`);
  }
  const monthName = monthDate.toLocaleDateString(locale, { month: 'long' });
  const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${y}`;
  const shiftMonth = (delta) => { select(); setMonthDate(new Date(y, m0 + delta, 1)); };

  // Resumo do mês: serviços (duties), folgas (dias vazios), per-diem (rota → ae.perDiem).
  const serviceCount = Object.entries(duties).filter(([iso, d]) => iso.startsWith(ym) && d && !d.deleted && d.report_time).length;
  const folgaCount = Math.max(0, daysInMonth - serviceCount);
  const pd = (ae && crewCategory) ? monthlyPerDiem(duties, crewCategory, ae, { ym }) : null;
  const perDiemTotal = pd ? pd.total : null;

  const weekdayShort = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return ''; const str = dt.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''); return str.charAt(0).toUpperCase() + str.slice(1); };
  const kindLabel = (kind) => (kind === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang));
  const kindColor = (kind) => (kind === 'flight' ? C.brand : (kind === 'standby_airport' || kind === 'standby_home') ? C.warnText : C.sub);

  // ── Export ──
  const onExport = async () => {
    if (!anyDuty) { Alert.alert(t('duties.title', lang), t('duties.exportEmpty', lang)); return; }
    try { await Share.share({ message: buildDutiesCsv(duties), title: 'CrewPact — duties (CSV)' }); } catch { /* cancelado */ }
  };
  const openPdf = () => {
    if (!anyDuty) { Alert.alert(t('duties.exportPdf', lang), t('duties.exportEmpty', lang)); return; }
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
      notify && notify(l('Registo gerado', 'Record generated'));
    } catch { Alert.alert(t('duties.exportPdf', lang), t('duties.recErr', lang)); }
  };

  // ── Card de um dia: serviço (tipo+rota+horas+€, pílula 🌙) ou folga (dia vazio) ──
  const renderDay = (iso) => {
    const d = duties[iso];
    const isToday = iso === today;
    const dd = Number(iso.slice(8, 10));
    const wd = weekdayShort(iso);
    const isDuty = d && !d.deleted && d.report_time;

    if (!isDuty) {
      return (
        <TouchableOpacity key={iso} style={s.off} activeOpacity={0.75} onPress={() => { select(); setDutyDate(iso); }}>
          <View style={s.dnum}>
            <Text style={[s.dwd, s.dwdOff]}>{wd}</Text>
            <Text style={[s.dd, isToday ? s.ddToday : s.ddOff]}>{dd}</Text>
            {isToday ? <View style={s.todaydot} /> : null}
          </View>
          <Text style={s.offlbl}>{l('Folga', 'Day off')}</Text>
          <Ionicons name="moon-outline" size={15} color={C.lineStrong} />
        </TouchableOpacity>
      );
    }

    const kind = d.kind || 'flight';
    const isFlight = kind === 'flight';
    let perDiem = null;
    if (ae && crewCategory && isFlight) {
      const dists = routeDistancesNM(d.route);
      if (dists.length && !dists.some((x) => x == null)) perDiem = ae.perDiem(crewCategory, dists, 1);
    }
    const nsEur = (d.nightStop && ae && ae.nightStop && crewCategory) ? ae.nightStop(crewCategory) : null;
    const meta = isFlight
      ? `${d.report_time || '--:--'} → ${d.block_on || '--:--'} · ${d.sectors || 0} ${t('duties.sectorsShort', lang)}${d.flight_minutes ? ` · ${minToHhmm(d.flight_minutes)} ${t('duties.flightShort', lang)}` : ''}`
      : (d.block_on && d.block_on !== d.report_time ? `${d.report_time} – ${d.block_on}` : (d.report_time || '—'));

    return (
      <TouchableOpacity key={iso} style={[s.day, iso === flashIso && s.dayFlash]} activeOpacity={0.7}
        onPress={() => navigation.navigate('DutyDetail', { date: iso })}
        onLongPress={() => { select(); setDutyDate(iso); }}>
        <View style={s.dnum}>
          <Text style={s.dwd}>{wd}</Text>
          <Text style={[s.dd, isToday && s.ddToday]}>{dd}</Text>
          {isToday ? <View style={s.todaydot} /> : null}
        </View>
        <View style={s.dmid}>
          <View style={s.drow}>
            <View style={[s.badge, { backgroundColor: kindColor(kind) }]}><Text style={s.badgeTxt} numberOfLines={1}>{kindLabel(kind)}</Text></View>
            {isFlight && d.route ? <Text style={s.route} numberOfLines={1}>{d.route}</Text> : null}
            {d.nightStop ? (
              <View style={s.nschip}>
                <Ionicons name="moon" size={10} color={C.info} />
                {nsEur != null ? <Text style={s.nschipTxt}>+{fmtEur(nsEur)}</Text> : null}
              </View>
            ) : null}
            {d.dirty ? <View style={s.pendDot} accessibilityLabel={t('duties.pending', lang)} /> : null}
          </View>
          <Text style={s.meta} numberOfLines={1}>{meta}</Text>
        </View>
        {perDiem != null ? <Text style={s.eur}>+{fmtEur(perDiem)}</Text> : null}
      </TouchableOpacity>
    );
  };

  // ── Banner "alterações na escala" (azul, informativo) ──
  const rcCounts = rosterChanges?.counts;
  const rcSub = rcCounts ? [
    ((rcCounts.changed || 0) + (rcCounts.conflict || 0)) ? `${(rcCounts.changed || 0) + (rcCounts.conflict || 0)} ${l('alterada(s)', 'changed')}` : null,
    rcCounts.added ? `${rcCounts.added} ${l('nova(s)', 'new')}` : null,
    rcCounts.removed ? `${rcCounts.removed} ${l('cancelada(s)', 'cancelled')}` : null,
  ].filter(Boolean).join(' · ') : '';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.body}>
        {/* Cabeçalho — eyebrow + ações (export/import/sino) */}
        <View style={s.eyeRow}>
          <View style={s.eyebrowWrap}><View style={s.eyebrowDot} /><Text style={s.eyebrow}>{l('A tua escala', 'Your roster')}</Text></View>
          <View style={s.tools}>
            {anyDuty ? (
              <>
                <TouchableOpacity onPress={openPdf} hitSlop={6} style={s.ib} accessibilityLabel={t('duties.exportPdf', lang)}><Ionicons name="document-text-outline" size={17} color={C.text} /></TouchableOpacity>
                <TouchableOpacity onPress={onExport} hitSlop={6} style={s.ib} accessibilityLabel={t('duties.export', lang)}><Ionicons name="share-outline" size={17} color={C.text} /></TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity onPress={() => { select(); setImportOpen(true); }} hitSlop={6} style={s.ib} accessibilityLabel={l('Importar escala', 'Import roster')}><Ionicons name="download-outline" size={17} color={C.text} /></TouchableOpacity>
            <NotificationsBell />
          </View>
        </View>

        {/* Mês navegável ‹ Junho 2026 › */}
        <View style={s.monthBar}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} style={s.marrow} accessibilityLabel={l('Mês anterior', 'Previous month')}><Ionicons name="chevron-back" size={18} color={C.text} /></TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8} style={s.marrow} accessibilityLabel={l('Mês seguinte', 'Next month')}><Ionicons name="chevron-forward" size={18} color={C.text} /></TouchableOpacity>
        </View>

        {/* Selo A — calendário ligado (nome + ✓ + Mudar) OU cartão para ligar */}
        {!calendarId ? (
          <View style={s.connectCard}>
            <View style={s.connectIc}><Ionicons name="calendar-outline" size={21} color={C.text} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.connectT}>{l('Liga o teu calendário', 'Connect your calendar')}</Text>
              <Text style={s.connectS}>{l('Importamos a tua escala do calendário do telemóvel. Só de leitura.', 'We import your roster from the phone calendar. Read-only.')}</Text>
            </View>
            <TouchableOpacity onPress={connectCalendar} activeOpacity={0.9} style={s.connectBtn}><Text style={s.connectBtnTxt}>{l('Ligar', 'Connect')}</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.8} onPress={() => { select(); setCalPickerOpen(true); }} style={s.selo}>
            <Ionicons name="calendar-outline" size={14} color={C.sub} />
            <Text style={s.seloT} numberOfLines={1}>{l('Calendário', 'Calendar')}{calendarName ? ` · ${calendarName}` : ''}</Text>
            <Ionicons name="checkmark-circle" size={14} color={C.greenText} />
            <View style={{ flex: 1 }} />
            <Text style={s.seloChg}>{l('Mudar', 'Change')}</Text>
          </TouchableOpacity>
        )}

        {/* Alterações de escala (Fase 4) — banner AZUL (informativo) que abre a revisão */}
        {rcCounts?.total ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => { select(); setImportOpen(true); }} style={s.rcBanner}>
            <Ionicons name="sync-circle" size={20} color={C.info} />
            <View style={{ flex: 1 }}>
              <Text style={s.rcTitle}>{l('A escala mudou no calendário', 'Roster changed in calendar')}</Text>
              <Text style={s.rcSub} numberOfLines={1}>{rcSub}{rcSub ? ' · ' : ''}{l('rever', 'review')}</Text>
            </View>
            <View style={s.rcGo}><Text style={s.rcGoTxt}>{l('Rever', 'Review')}</Text></View>
          </TouchableOpacity>
        ) : null}

        {/* Resumo do mês — tipografia com separadores, no topo */}
        <View style={s.summ}>
          <View style={s.si}><Text style={s.siLbl}>{l('Serviços', 'Duties')}</Text><Text style={s.siVal}>{serviceCount}</Text></View>
          <View style={s.sep} />
          <View style={s.si}><Text style={s.siLbl}>{l('Folgas', 'Days off')}</Text><Text style={s.siVal}>{folgaCount}</Text></View>
          <View style={s.sep} />
          <View style={s.si}><Text style={s.siLbl}>{l('Per-diem', 'Per diem')}</Text><Text style={[s.siVal, s.siEur]}>{fmtEur(perDiemTotal)}</Text></View>
        </View>

        {/* Lista de cards de dia (faz scroll) */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false} alwaysBounceVertical
            refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.sub} colors={[C.sub]}
              onRefresh={async () => {
                setRefreshing(true); const t0 = Date.now();
                try { await checkRosterChanges?.(); } catch { /* ignora */ }
                const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                setRefreshing(false);
              }} />}>
          {!anyDuty ? (
            <View style={s.emptyWrap}>
              <Text style={s.empty}>{t('duties.empty', lang)}</Text>
              <TouchableOpacity activeOpacity={0.9} style={s.emptyImportBtn} onPress={() => { select(); setImportOpen(true); }}>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={s.emptyImportTxt}>{l('Importar escala', 'Import roster')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {upcomingDays.map(renderDay)}
              {pastDays.length > 0 ? (
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerTxt}>{l('Anteriores este mês', 'Earlier this month')}</Text>
                  <View style={s.dividerLine} />
                </View>
              ) : null}
              {pastDays.map(renderDay)}
              <Text style={s.foot}>{t('duties.syncHint', lang)}</Text>
            </>
          )}
        </ScrollView>
      </View>

      <DutyFormSheet visible={!!dutyDate} onClose={() => setDutyDate(null)} date={dutyDate}
        onSaved={(iso) => { setFlashIso(iso); setTimeout(() => setFlashIso(null), 900); }} />
      <RosterImportSheet visible={importOpen} onConnect={connectCalendar} onClose={() => { setImportOpen(false); checkRosterChanges && checkRosterChanges(); }} />
      <CalendarPickerSheet visible={calPickerOpen} onClose={() => setCalPickerOpen(false)} currentId={calendarId}
        onSelect={(id, name) => { setCalendarId(id); setCalendarName && setCalendarName(name || null); notify && notify(l('Calendário ligado', 'Calendar connected')); }} />

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

  // Cabeçalho
  eyeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  eyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.red },
  eyebrow: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1.3, textTransform: 'uppercase', color: C.sub },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ib: { width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },

  // Mês navegável
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  marrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 24, fontFamily: FONT.display, letterSpacing: -0.5, color: C.text },

  // Selo do calendário (ligado)
  selo: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 11 },
  seloT: { fontSize: 12, fontFamily: FONT.semibold, color: C.text, maxWidth: '64%' },
  seloChg: { fontSize: 12, fontFamily: FONT.bold, color: C.ink },

  // Cartão "Ligar ao calendário"
  connectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 13, marginTop: 11 },
  connectIc: { width: 40, height: 40, borderRadius: 11, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  connectT: { fontSize: 14.5, fontFamily: FONT.bold, color: C.text },
  connectS: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 2, lineHeight: 15 },
  connectBtn: { backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 16, paddingVertical: 10 },
  connectBtnTxt: { color: '#fff', fontSize: 13, fontFamily: FONT.bold },

  // Banner de alterações (azul, informativo)
  rcBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.infoSoft, borderWidth: 1, borderColor: C.info, borderRadius: RADIUS.lg, padding: 12, marginTop: 10 },
  rcTitle: { fontSize: TYPE.label, fontFamily: FONT.heavy, color: C.info },
  rcSub: { fontSize: TYPE.micro, fontFamily: FONT.semibold, color: C.info, marginTop: 2, opacity: 0.85 },
  rcGo: { backgroundColor: C.info, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6 },
  rcGoTxt: { color: '#fff', fontSize: 12.5, fontFamily: FONT.bold },

  // Resumo do mês
  summ: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line, borderBottomWidth: 1, borderBottomColor: C.line },
  si: { flex: 1, alignItems: 'center' },
  siLbl: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.5, textTransform: 'uppercase', color: C.sub },
  siVal: { fontSize: 18, fontFamily: FONT.display, color: C.text, marginTop: 3 },
  siEur: { color: C.greenText },
  sep: { width: 1, height: 26, backgroundColor: C.line },

  // Cards de dia
  day: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, ...SHADOW.sm },
  dayFlash: { backgroundColor: C.greenSoft, borderColor: C.green },
  off: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.md, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 8 },
  dnum: { width: 42, alignItems: 'center' },
  dwd: { fontSize: 9.5, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub },
  dwdOff: { color: C.lineStrong },
  dd: { fontSize: 20, fontFamily: FONT.display, color: C.text, lineHeight: 22 },
  ddOff: { color: C.lineStrong },
  ddToday: { color: C.red },
  todaydot: { width: 5, height: 5, borderRadius: 99, backgroundColor: C.red, marginTop: 3 },
  dmid: { flex: 1, minWidth: 0 },
  drow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff' },
  route: { flex: 1, fontSize: 15, fontFamily: FONT.bold, color: C.text, letterSpacing: -0.2 },
  nschip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.infoSoft, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  nschipTxt: { fontSize: 11, fontFamily: FONT.heavy, color: C.info },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: C.warn || C.sub },
  meta: { fontSize: 12, fontFamily: FONT.medium, color: C.sub, marginTop: 3, fontVariant: ['tabular-nums'] },
  eur: { fontSize: 14, fontFamily: FONT.display, color: C.greenText },
  offlbl: { flex: 1, fontSize: 13, fontFamily: FONT.bold, color: C.sub },

  // Vazio (sem nenhum serviço)
  empty: { fontSize: TYPE.sub, color: C.sub, paddingVertical: SPACE.md },
  emptyWrap: { alignItems: 'flex-start' },
  emptyImportBtn: { flexDirection: 'row', gap: 8, backgroundColor: C.red, borderRadius: RADIUS.pill, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emptyImportTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.bold },
  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  dividerTxt: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.6, textTransform: 'uppercase', color: C.sub },

  // Folha do registo FTL.245
  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  recSub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  recInput: { backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.line, color: C.text, fontSize: TYPE.body },
  saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
