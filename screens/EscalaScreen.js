import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share, RefreshControl, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
  const [hubOpen, setHubOpen] = useState(false);       // hub de importar (calendário | PDF)
  const [importSource, setImportSource] = useState('calendar'); // fonte com que abre o RosterImportSheet
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh: reverifica a escala
  const [flashIso, setFlashIso] = useState(null);       // realce breve do card após guardar
  const [toast, setToast] = useState(null);             // toast flutuante de sucesso { n, src }
  const toastTimer = useRef(null);
  const scrollRef = useRef(null);        // ScrollView da lista (scroll até hoje ao entrar)
  const didScrollToday = useRef(false);  // já posicionámos no dia de hoje neste mês?
  const prevYmRef = useRef(null);        // mês renderizado antes (p/ reativar o scroll ao mudar de mês)
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
    if (route.params?.review) { setImportSource('calendar'); setImportOpen(true); }
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

  // Hub de importar (mini-fab / cartão "IR" / arranque) → escolher fonte; depois abre o "Confirmar import".
  const openHub = () => { select(); setHubOpen(true); };
  const openImport = (src) => { setImportSource(src || 'calendar'); setHubOpen(false); setImportOpen(true); };
  const addManual = () => { select(); setHubOpen(false); setDutyDate(isoDay()); };

  // Toast flutuante (em cima) após confirmar um import — aparece e some sozinho (~3 s).
  const showToast = (n, src) => {
    if (!n) return;   // o import já fez success() (haptic); aqui só mostramos o toast
    setToast({ n, src });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── € (cêntimos, NUNCA arredonda — money-no-rounding) ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, d] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

  const today = isoDay();
  const anyDuty = Object.values(duties).some((d) => d && !d.deleted && d.report_time);

  // ── Mês visível: rótulo, dias, e a lista (começa em hoje no mês atual) ──
  const y = monthDate.getFullYear(), m0 = monthDate.getMonth();
  const ym = `${y}-${String(m0 + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(y, m0 + 1, 0).getDate();
  const isCurrentMonth = today.startsWith(ym);
  // Mudar de mês → reativa o scroll-até-hoje (reset síncrono, antes de os cards renderizarem).
  if (prevYmRef.current !== ym) { prevYmRef.current = ym; didScrollToday.current = false; }
  // Lista cronológica do mês inteiro (1→fim). No mês atual, ao entrar fazemos scroll até HOJE
  // (fica em 1.º); nos outros meses começa no topo (dia 1).
  const dayList = [];
  for (let dn = 1; dn <= daysInMonth; dn++) dayList.push(`${ym}-${String(dn).padStart(2, '0')}`);
  useEffect(() => { if (!isCurrentMonth) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [ym]); // eslint-disable-line react-hooks/exhaustive-deps
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
    // No mês atual, quando o card de HOJE se desenha, posiciona a lista nele (1.ª vez no mês).
    const onLayoutToday = isToday ? (e) => {
      if (isCurrentMonth && !didScrollToday.current && scrollRef.current) {
        didScrollToday.current = true;
        scrollRef.current.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 8), animated: false });
      }
    } : undefined;

    if (!isDuty) {
      return (
        <TouchableOpacity key={iso} onLayout={onLayoutToday} style={s.off} activeOpacity={0.75} onPress={() => { select(); setDutyDate(iso); }}>
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
      <TouchableOpacity key={iso} onLayout={onLayoutToday} style={[s.day, iso === flashIso && s.dayFlash]} activeOpacity={0.7}
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
            <TouchableOpacity onPress={openHub} hitSlop={6} style={s.ib} accessibilityLabel={l('Importar escala', 'Import roster')}><Ionicons name="download-outline" size={17} color={C.text} /></TouchableOpacity>
            <NotificationsBell />
          </View>
        </View>

        {!anyDuty ? (
          /* ── Arranque (Serviços) — sem escala: informativo + formas de importar ── */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}>
            <Text style={s.h1Big}>{l('Serviços', 'Duties')}</Text>
            <Text style={s.lead}>{l('Ainda não tens escala. Liga o calendário do telemóvel (ou importa por PDF) e mostramos os teus serviços aqui.', "You have no roster yet. Connect your phone calendar (or import a PDF) and we'll show your duties here.")}</Text>

            <View style={s.connectBig}>
              <View style={s.connectBigIc}><Ionicons name="calendar-outline" size={22} color={C.text} /></View>
              <Text style={s.connectBigT}>{calendarId ? l('Calendário ligado', 'Calendar connected') : l('Liga o teu calendário', 'Connect your calendar')}</Text>
              <Text style={s.connectBigS}>{calendarId
                ? l('Sem serviços lidos do calendário. Tenta importar de novo (podes mudar o intervalo) ou usa o PDF.', 'No duties read from the calendar. Try importing again (you can change the range) or use a PDF.')
                : l('Importamos os teus serviços do calendário do telemóvel, assim que mudam. Tu só confirmas.', 'We import your duties from the phone calendar whenever they change. You just confirm.')}</Text>
              <View style={s.privRow}><Ionicons name="lock-closed-outline" size={13} color={C.greenText} /><Text style={s.privTxt}>{l('Só de leitura · nada é alterado no teu calendário', 'Read-only · nothing is changed in your calendar')}</Text></View>
              <TouchableOpacity onPress={calendarId ? () => openImport('calendar') : connectCalendar} activeOpacity={0.9} style={s.btnDark}>
                <Ionicons name={calendarId ? 'refresh' : 'arrow-forward'} size={17} color="#fff" /><Text style={s.btnDarkTxt}>{calendarId ? l('Importar agora', 'Import now') : l('Ligar ao calendário', 'Connect calendar')}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.orline}><View style={s.orlineBar} /><Text style={s.orlineTxt}>{l('ou', 'or')}</Text><View style={s.orlineBar} /></View>
            <TouchableOpacity onPress={() => openImport('paste')} activeOpacity={0.9} style={s.btnGhost}><Ionicons name="document-text-outline" size={16} color={C.text} /><Text style={s.btnGhostTxt}>{l('Importar PDF da escala', 'Import roster PDF')}</Text></TouchableOpacity>
            <TouchableOpacity onPress={addManual} activeOpacity={0.9} style={s.btnGhost}><Ionicons name="add" size={18} color={C.text} /><Text style={s.btnGhostTxt}>{l('Adicionar serviço à mão', 'Add a duty by hand')}</Text></TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            {/* Mês navegável ‹ Junho 2026 › */}
            <View style={s.monthBar}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={8} style={s.marrow} accessibilityLabel={l('Mês anterior', 'Previous month')}><Ionicons name="chevron-back" size={18} color={C.text} /></TouchableOpacity>
              <Text style={s.monthLabel}>{monthLabel}</Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={8} style={s.marrow} accessibilityLabel={l('Mês seguinte', 'Next month')}><Ionicons name="chevron-forward" size={18} color={C.text} /></TouchableOpacity>
            </View>

            {/* Selo (ligado) OU cartão "IR" (há serviços, calendário por ligar) → hub de importar */}
            {calendarId ? (
              <TouchableOpacity activeOpacity={0.8} onPress={() => { select(); setCalPickerOpen(true); }} style={s.selo}>
                <Ionicons name="calendar-outline" size={14} color={C.sub} />
                <Text style={s.seloT} numberOfLines={1}>{l('Calendário', 'Calendar')}{calendarName ? ` · ${calendarName}` : ''}</Text>
                <Ionicons name="checkmark-circle" size={14} color={C.greenText} />
                <View style={{ flex: 1 }} />
                <Text style={s.seloChg}>{l('Mudar', 'Change')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.85} onPress={openHub} style={s.connectCard}>
                <View style={s.connectIc}><Ionicons name="calendar-outline" size={21} color={C.text} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.connectT}>{l('Liga o teu calendário', 'Connect your calendar')}</Text>
                  <Text style={s.connectS}>{l('Importa do calendário do telemóvel ou por PDF. Só de leitura.', 'Import from the phone calendar or a PDF. Read-only.')}</Text>
                </View>
                <View style={s.goBtn}><Text style={s.goBtnTxt}>{l('IR', 'GO')}</Text><Ionicons name="chevron-forward" size={14} color="#fff" /></View>
              </TouchableOpacity>
            )}

            {/* Alterações de escala (Fase 4) — banner AZUL → revisão (Confirmar import, calendário) */}
            {rcCounts?.total ? (
              <TouchableOpacity activeOpacity={0.9} onPress={() => { select(); setImportSource('calendar'); setImportOpen(true); }} style={s.rcBanner}>
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
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false} alwaysBounceVertical
                refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.sub} colors={[C.sub]}
                  onRefresh={async () => {
                    setRefreshing(true); const t0 = Date.now();
                    try { await checkRosterChanges?.(); } catch { /* ignora */ }
                    const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                    setRefreshing(false);
                  }} />}>
              {dayList.map(renderDay)}
              <Text style={s.foot}>{t('duties.syncHint', lang)}</Text>
            </ScrollView>
          </>
        )}
      </View>

      {/* Toast flutuante (em cima) — "X serviços importados do {calendário/PDF}", some sozinho */}
      {toast ? (
        <View style={[s.toast, { top: insets.top + 6 }]} pointerEvents="none">
          <View style={s.toastCk}><Ionicons name="checkmark" size={14} color="#fff" /></View>
          <Text style={s.toastTxt} numberOfLines={2}>{l(`${toast.n} serviços importados`, `${toast.n} duties imported`)}{toast.src === 'pdf' ? l(' do PDF', ' from PDF') : l(' do calendário', ' from calendar')}</Text>
        </View>
      ) : null}

      <DutyFormSheet visible={!!dutyDate} onClose={() => setDutyDate(null)} date={dutyDate}
        onSaved={(iso) => { setFlashIso(iso); setTimeout(() => setFlashIso(null), 900); }} />
      <RosterImportSheet visible={importOpen} initialSource={importSource} onConnect={connectCalendar}
        onDone={({ saved, source }) => showToast(saved, source)}
        onClose={() => { setImportOpen(false); checkRosterChanges && checkRosterChanges(); }} />

      {/* Hub de importar — Ligar calendário · Importar PDF (aberto pelo mini-fab / cartão "IR" / arranque) */}
      <BottomSheet visible={hubOpen} onClose={() => setHubOpen(false)} title={l('Importar escala', 'Import roster')} closeLabel={t('common.close', lang)}>
        <View style={s.hubBody}>
          <Text style={s.hubSub}>{l('Trazemos os teus serviços para a Escala — escolhe a fonte.', 'We bring your duties into the roster — pick a source.')}</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { setHubOpen(false); connectCalendar(); }} style={s.hubOpt}>
            <View style={[s.hubOptIc, { backgroundColor: C.infoSoft }]}><Ionicons name="calendar-outline" size={22} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.hubOptT}>{l('Ligar ao calendário', 'Connect calendar')}</Text>
              <Text style={s.hubOptS}>{l('Escolhes o calendário do telemóvel; sincroniza sozinho. Só de leitura.', 'Pick your phone calendar; it syncs on its own. Read-only.')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.lineStrong} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => openImport('paste')} style={s.hubOpt}>
            <View style={[s.hubOptIc, { backgroundColor: C.infoSoft }]}><Ionicons name="document-text-outline" size={22} color={C.info} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.hubOptT}>{l('Importar PDF', 'Import PDF')}</Text>
              <Text style={s.hubOptS}>{l('Lês o PDF da escala no telemóvel; a cópia é apagada (RGPD).', 'Read the roster PDF on-device; the copy is deleted (GDPR).')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.lineStrong} />
          </TouchableOpacity>
          <View style={s.hubNote}><Ionicons name="lock-closed-outline" size={13} color={C.greenText} /><Text style={s.hubNoteTxt}>{l('Nada sai do telemóvel · confirmas antes de gravar', 'Nothing leaves your phone · you confirm before saving')}</Text></View>
        </View>
      </BottomSheet>
      <CalendarPickerSheet visible={calPickerOpen} onClose={() => setCalPickerOpen(false)} currentId={calendarId}
        onSelect={(id, name) => {
          setCalendarId(id); setCalendarName && setCalendarName(name || null);
          // Ligar = ler o calendário e abrir já o "Confirmar import" (calendário). Pequeno atraso
          // para o Modal do picker fechar antes de abrir o do import (evita modal-sobre-modal).
          setImportSource('calendar');
          setTimeout(() => setImportOpen(true), 350);
        }} />

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

  foot: { fontSize: 11, color: C.sub, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },

  // Arranque (Serviços, sem escala)
  h1Big: { fontSize: 28, fontFamily: FONT.display, letterSpacing: -0.6, color: C.text, marginTop: 6 },
  lead: { fontSize: 13.5, fontFamily: FONT.medium, color: C.sub, lineHeight: 20, marginTop: 8 },
  connectBig: { backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 16, marginTop: 18 },
  connectBigIc: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  connectBigT: { fontSize: 16.5, fontFamily: FONT.bold, color: C.text, letterSpacing: -0.2 },
  connectBigS: { fontSize: 12.5, fontFamily: FONT.medium, color: C.sub, lineHeight: 18, marginTop: 6 },
  privRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  privTxt: { fontSize: 11, fontFamily: FONT.bold, color: C.greenText },
  btnDark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.ink, borderRadius: 14, paddingVertical: 14, marginTop: 14 },
  btnDarkTxt: { color: '#fff', fontSize: 15, fontFamily: FONT.bold },
  orline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  orlineBar: { flex: 1, height: 1, backgroundColor: C.line },
  orlineTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1, textTransform: 'uppercase', color: C.lineStrong },
  btnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: 14, paddingVertical: 13, marginTop: 10 },
  btnGhostTxt: { fontSize: 13.5, fontFamily: FONT.bold, color: C.text },

  // Cartão "IR" (no mês, calendário por ligar) → hub
  goBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingHorizontal: 15, paddingVertical: 9 },
  goBtnTxt: { color: '#fff', fontSize: 13, fontFamily: FONT.heavy, letterSpacing: 0.3 },

  // Hub de importar
  hubBody: { padding: 20 },
  hubSub: { fontSize: 12.5, fontFamily: FONT.medium, color: C.sub, lineHeight: 18, marginBottom: 4 },
  hubOpt: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 14, marginTop: 12 },
  hubOptIc: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  hubOptT: { fontSize: 15.5, fontFamily: FONT.bold, color: C.text, letterSpacing: -0.2 },
  hubOptS: { fontSize: 12, fontFamily: FONT.medium, color: C.sub, marginTop: 3, lineHeight: 16 },
  hubNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 },
  hubNoteTxt: { fontSize: 11, fontFamily: FONT.bold, color: C.greenText },

  // Toast flutuante de sucesso (em cima)
  toast: { position: 'absolute', left: GUTTER, right: GUTTER, zIndex: 100, elevation: 12, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.ink, borderRadius: 15, paddingVertical: 13, paddingHorizontal: 15, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  toastCk: { width: 24, height: 24, borderRadius: 99, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  toastTxt: { flex: 1, color: '#fff', fontSize: 13.5, fontFamily: FONT.bold },

  // Folha do registo FTL.245
  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  recSub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  recInput: { backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.line, color: C.text, fontSize: TYPE.body },
  saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: C.ink, borderRadius: RADIUS.pill, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnTxt: { color: '#fff', fontSize: TYPE.body, fontFamily: FONT.semibold },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
