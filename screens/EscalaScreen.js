import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share, RefreshControl, Linking, ActivityIndicator } from 'react-native';
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
import { legZulu } from '../data/zulu';
import NotificationsBell from '../components/NotificationsBell';
import DutyFormSheet from '../components/DutyFormSheet';
import RosterImportSheet from '../components/RosterImportSheet';
import Eyebrow from '../components/Eyebrow';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import BottomSheet from '../components/BottomSheet';
import PrimaryButton from '../components/PrimaryButton';
import GhostButton from '../components/GhostButton';
import Banner from '../components/Banner';
import useTabBarSpace from '../hooks/useTabBarSpace';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };

// CSV dos registos (apoio ao registo de tempos/serviço — ORO.FTL.245).
const buildDutiesCsv = (duties) => {
  const rows = Object.entries(duties).filter(([, d]) => !d.deleted).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const head = 'duty_date,service,report_time,block_off,block_on,sectors,flight_minutes';
  // Uma linha por SERVIÇO (a lei conta períodos — 210/245): primária + extra do mesmo dia.
  const body = rows.flatMap(([date, d]) => {
    const extras = (Array.isArray(d.extra) ? d.extra : []).filter((sv) => sv && (sv.report_time || sv.block_on));
    const services = [d, ...extras];
    const n = services.length;
    return services.map((sv, i) => [date, n > 1 ? `${i + 1}/${n}` : '', sv.report_time || '', sv.block_off || '', sv.block_on || '', sv.sectors || 0, sv.flight_minutes || 0].join(','));
  });
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
  const { lang, duties, dayLog, user, company, ae, crewCategory, crewFleet, crewAt, base, postFlightMin, rosterChanges, checkRosterChanges, notify, removeDutyService,
    calendarId, setCalendarId, calendarName, setCalendarName } = useContext(AppContext);
  const C = useTheme();
  const s = makeStyles(C);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Mês visível (1.º dia). Default = mês de hoje.
  const [monthDate, setMonthDate] = useState(() => { const t0 = new Date(); return new Date(t0.getFullYear(), t0.getMonth(), 1); });
  const [dutyDate, setDutyDate] = useState(null); // dia a inserir/editar → popup
  const [dutyAppend, setDutyAppend] = useState(false); // form em modo "+ serviço" (2.º+ período do dia)
  const [dutyEditExtra, setDutyEditExtra] = useState(null); // índice do serviço extra a editar (null = não)
  const [dayIso, setDayIso] = useState(null);     // dia tocado na grelha → sheet de detalhe (setores)
  const [secExpand, setSecExpand] = useState(false); // sheet: expandir lista de setores se for cheia
  const [gridW, setGridW] = useState(0);          // largura medida da grelha → célula = (W − gaps)/7
  const lastNewDuty = useRef(null);

  // Registo 245 (PDF): identidade do tripulante, persistida localmente para reutilizar.
  const [recOpen, setRecOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);       // hub de importar (calendário | PDF)
  const [importSource, setImportSource] = useState('calendar'); // fonte com que abre o RosterImportSheet
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh: reverifica a escala
  const [syncing, setSyncing] = useState(false);        // botão Sincronizar (relê o calendário ligado)
  const [flashIso, setFlashIso] = useState(null);       // realce breve do card após guardar
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

  // Sincronizar: relê AGORA o calendário ligado e dá feedback. NÃO grava nada — se houver mudanças,
  // aparece o banner azul "Rever" (revisão antes de aplicar, com a confirmação de apagar). Sem
  // calendário ligado o botão nem aparece (aí é o "Importar/Ligar" que trata).
  const onSync = async () => {
    if (!calendarId || syncing) return;
    select(); setSyncing(true);
    const t0 = Date.now();
    let res; try { res = await checkRosterChanges?.(); } catch { res = null; }
    const dt = Date.now() - t0; if (dt < 500) await new Promise((r) => setTimeout(r, 500 - dt)); // mínimo visível
    setSyncing(false);
    if (res == null) { notify(l('Não consegui ler o calendário', 'Couldn’t read the calendar'), null, 'warn'); return; }
    const n = res.counts?.total || 0;
    notify(n ? l(`${n} alteração(ões) na escala — revê em baixo`, `${n} roster change(s) — review below`)
             : l('Escala em dia', 'Roster up to date'), null, n ? 'sync' : 'ok');
  };
  // Hub de importar (mini-fab / cartão "IR" / arranque) → escolher fonte; depois abre o "Confirmar import".
  const openHub = () => { select(); setHubOpen(true); };
  const openImport = (src) => { setImportSource(src || 'calendar'); setHubOpen(false); setImportOpen(true); };
  const addManual = () => { select(); setHubOpen(false); setDutyDate(isoDay()); };

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
  const catYm = crewAt(ym).category;   // categoria em vigor no mês mostrado (effective-dated)
  const pd = (ae && catYm) ? monthlyPerDiem(duties, catYm, ae, { ym, fleet: crewFleet }) : null;
  const perDiemTotal = pd ? pd.total : null;

  const weekdayShort = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return ''; const str = dt.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''); return str.charAt(0).toUpperCase() + str.slice(1); };
  const kindLabel = (kind) => (kind === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang));
  const kindColor = (kind) => (kind === 'flight' ? C.brand : (kind === 'standby_airport' || kind === 'standby_home') ? C.warnText : C.sub);

  // ── Grelha de calendário ── 1.º dia da semana (Segunda=0), rótulos, código/cor por tipo.
  const firstWeekday = ((new Date(y, m0, 1).getDay()) + 6) % 7;   // Dom=0 → Seg=0
  const WD = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dutyClass = (d) => { const k = d.kind || 'flight'; return k === 'flight' ? 'flight' : (k === 'standby_airport' || k === 'standby_home') ? 'sby' : 'pos'; };
  const codeColor = (cls) => cls === 'flight' ? C.brand : cls === 'sby' ? C.warnText : C.sub;
  const barColor = (cls) => cls === 'flight' ? C.brand : cls === 'sby' ? C.warn : C.sub;
  // Código curto da célula: voo → estação "fora da base" (ex. LGW); senão sigla do tipo.
  const dutyCode = (d) => {
    const k = d.kind || 'flight';
    if (k === 'flight') {
      const aps = String(d.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
      const b = String(base || '').toUpperCase();
      return aps.find((a) => a !== b) || aps[aps.length - 1] || aps[0] || '✈';
    }
    return (k === 'standby_airport' || k === 'standby_home') ? 'SBY' : k === 'positioning' ? 'POS' : k === 'office' ? 'OFC' : k === 'training' ? 'FRM' : '•';
  };
  const openDay = (iso) => { select(); setSecExpand(false); setDayIso(iso); };

  const GAP = 4;
  const cellW = gridW ? (gridW - GAP * 6) / 7 : 0;
  // Uma célula da grelha: nº + (serviço: código+barra) · fim-de-semana, hoje, pernoita.
  const renderCell = (iso) => {
    const d = duties[iso];
    const dd = Number(iso.slice(8, 10));
    const isToday = iso === today;
    const isDuty = d && !d.deleted && d.report_time;
    const nSvc = isDuty && Array.isArray(d.extra) ? d.extra.length + 1 : 1;   // serviços no dia (210 conta por serviço)
    const col = (firstWeekday + dd - 1) % 7;
    const weekend = col >= 5;
    const cls = isDuty ? dutyClass(d) : null;
    return (
      <TouchableOpacity key={iso} activeOpacity={0.7} style={[s.gc, { width: cellW }, !isDuty && s.gcOff, weekend && s.gcWk, isToday && s.gcNow, iso === flashIso && s.gcFlash]}
        onPress={() => (isDuty ? openDay(iso) : (select(), setDutyDate(iso)))}
        onLongPress={() => { select(); setDutyDate(iso); }}>
        <Text style={[s.gn, !isDuty && s.gnOff, isToday && s.gnNow]}>{dd}</Text>
        {isDuty ? (
          <View style={s.svc}>
            <Text style={[s.code, { color: codeColor(cls) }]} numberOfLines={1}>{nSvc > 1 ? `${nSvc}× ` : ''}{dutyCode(d)}</Text>
            <View style={[s.bar, { backgroundColor: barColor(cls) }]} />
          </View>
        ) : null}
        {isDuty && d.nightStop ? <View style={s.nsdot} /> : null}
        {isDuty && d.dirty ? <View style={s.pendDotG} /> : null}
      </TouchableOpacity>
    );
  };

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
          <View style={s.eyebrowWrap}><View style={s.eyebrowDot} /><Eyebrow>{l('A tua escala', 'Your roster')}</Eyebrow></View>
          <View style={s.tools}>
            {/* Sincronizar com o calendário ligado (relê agora) — só aparece quando há calendário. */}
            {calendarId ? (
              <TouchableOpacity onPress={onSync} disabled={syncing} hitSlop={6} style={s.ib} accessibilityLabel={l('Sincronizar com o calendário', 'Sync with calendar')}>
                {syncing ? <ActivityIndicator size="small" color={C.sub} /> : <Ionicons name="sync" size={17} color={C.text} />}
                {/* Pontinho azul quando há mudanças por rever (espelha o banner "A escala mudou"). */}
                {!syncing && rcCounts?.total ? <View style={s.syncDot} /> : null}
              </TouchableOpacity>
            ) : null}
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
              <PrimaryButton onPress={calendarId ? () => openImport('calendar') : connectCalendar} icon={calendarId ? 'refresh' : 'arrow-forward'} radius="lg" style={{ marginTop: 14 }}
                label={calendarId ? l('Importar agora', 'Import now') : l('Ligar ao calendário', 'Connect calendar')} />
            </View>

            <View style={s.orline}><View style={s.orlineBar} /><Text style={s.orlineTxt}>{l('ou', 'or')}</Text><View style={s.orlineBar} /></View>
            <GhostButton onPress={() => openImport('paste')} icon="document-text-outline" radius="lg" style={{ marginTop: 10 }} label={l('Importar PDF da escala', 'Import roster PDF')} />
            <GhostButton onPress={addManual} icon="add" radius="lg" style={{ marginTop: 10 }} label={l('Adicionar serviço à mão', 'Add a duty by hand')} />
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
              <Banner tone="info" icon="sync-circle" actionLabel={l('Rever', 'Review')} style={{ marginTop: 10 }}
                title={l('A escala mudou no calendário', 'Roster changed in calendar')}
                sub={`${rcSub}${rcSub ? ' · ' : ''}${l('rever', 'review')}`}
                onPress={() => { select(); setImportSource('calendar'); setImportOpen(true); }} />
            ) : null}

            {/* Resumo do mês — tipografia com separadores, no topo */}
            <View style={s.summ}>
              <View style={s.si}><Text style={s.siLbl}>{l('Serviços', 'Duties')}</Text><Text style={s.siVal}>{serviceCount}</Text></View>
              <View style={s.sep} />
              <View style={s.si}><Text style={s.siLbl}>{l('Folgas', 'Days off')}</Text><Text style={s.siVal}>{folgaCount}</Text></View>
              <View style={s.sep} />
              <View style={s.si}><Text style={s.siLbl}>{l('Per-diem', 'Per diem')}</Text><Text style={[s.siVal, s.siEur]}>{fmtEur(perDiemTotal)}</Text></View>
            </View>

            {/* Grelha do mês — cabeçalho dos dias + células. Toca num serviço → setores (sheet);
                toca/longo numa folga → inserir. */}
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.sub} colors={[C.sub]}
                  onRefresh={async () => {
                    setRefreshing(true); const t0 = Date.now();
                    try { await checkRosterChanges?.(); } catch { /* ignora */ }
                    const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                    setRefreshing(false);
                  }} />}>
              <View style={s.wkhead}>{WD.map((w, i) => <Text key={i} style={[s.wkh, i >= 5 && s.wkhWe]}>{w}</Text>)}</View>
              <View style={s.cal} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
                {cellW ? (
                  <>
                    {Array.from({ length: firstWeekday }).map((_, i) => <View key={`lead${i}`} style={[s.gc, s.gcEmpty, { width: cellW }]} />)}
                    {dayList.map(renderCell)}
                  </>
                ) : null}
              </View>
              <Text style={s.foot}>{t('duties.syncHint', lang)}</Text>
            </ScrollView>
          </>
        )}
      </View>

      <DutyFormSheet visible={!!dutyDate} onClose={() => { setDutyDate(null); setDutyAppend(false); setDutyEditExtra(null); }} date={dutyDate} append={dutyAppend} editExtra={dutyEditExtra}
        onSaved={(iso) => { setFlashIso(iso); setTimeout(() => setFlashIso(null), 900); }} />
      <RosterImportSheet visible={importOpen} initialSource={importSource} onConnect={connectCalendar}
        onDone={({ saved, source }) => { if (saved) notify(`${saved} ${l('serviços importados', 'duties imported')}${source === 'pdf' ? l(' do PDF', ' from PDF') : l(' do calendário', ' from calendar')}`, null, 'imported'); }}
        onClose={() => { setImportOpen(false); checkRosterChanges && checkRosterChanges(); }} />

      {/* Detalhe do dia (toque na grelha) — serviço com TODOS os setores separados (expandível). */}
      <BottomSheet visible={!!dayIso} onClose={() => setDayIso(null)} title={l('Detalhe do dia', 'Day detail')} closeLabel={t('common.close', lang)}>
        {dayIso && duties[dayIso] ? (() => {
          const prim = duties[dayIso];
          const services = [prim, ...(Array.isArray(prim.extra) ? prim.extra : [])];
          const between = (dayLog[dayIso] && Array.isArray(dayLog[dayIso].between)) ? dayLog[dayIso].between : [];
          const multi = services.length > 1;
          const pf = postFlightMin || 0;
          const catD = crewAt(dayIso).category;
          const fmtM = (m) => minToHhmm(Math.max(0, Math.round(m || 0)));
          const dt = new Date(`${dayIso}T00:00:00`);
          const dateLbl = isNaN(dt) ? dayIso : (() => { const sx = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }); return sx.charAt(0).toUpperCase() + sx.slice(1); })();

          // Um cartão por SERVIÇO do dia (a EASA conta por serviço — 210). idx 0 = primária.
          const renderSvc = (d, idx) => {
            const kind = d.kind || 'flight';
            const isFlight = kind === 'flight';
            const legs = (isFlight && Array.isArray(d.legs)) ? d.legs : [];
            const canExpand = idx === 0;                          // expande só a primária (simplificação)
            const collapsed = legs.length > 3 && !(secExpand && canExpand);
            const shown = collapsed ? legs.slice(0, 3) : legs;
            let perDiem = null;
            if (ae && catD && isFlight) { const dists = routeDistancesNM(d.route); if (dists.length && !dists.some((x) => x == null)) perDiem = ae.perDiem(catD, dists, 1, crewFleet); }
            const nsEur = (d.nightStop && ae && ae.nightStop && catD) ? ae.nightStop(catD) : null;
            const so = clkMin(d.signOff), onM = clkMin(d.block_on), rm = clkMin(d.report_time);
            const end = so != null ? so : (onM != null ? onM + pf : null);
            const endsNext = end != null && rm != null && (end % 1440) < rm;   // serviço acaba no dia seguinte
            const dutyMin = (rm != null && end != null) ? (((end % 1440) >= rm) ? (end % 1440) - rm : (end % 1440) + 1440 - rm) : null;
            return (
              <View key={`svc${idx}`} style={multi ? s.dsSvcCard : undefined}>
                <View style={s.dsHead}>
                  {multi ? <View style={s.dsNum}><Text style={s.dsNumTxt}>{idx + 1}</Text></View> : null}
                  <View style={[s.dsBadge, { backgroundColor: kindColor(kind) }]}><Text style={s.dsBadgeTxt}>{kindLabel(kind)}</Text></View>
                  <Text style={s.dsRoute} numberOfLines={1}>{isFlight ? (d.route || l('Voo', 'Flight')) : kindLabel(kind)}</Text>
                  {d.nightStop ? <Ionicons name="moon" size={15} color={C.info} /> : null}
                </View>

                {isFlight && legs.length ? (
                  <View style={s.dsSecWrap}>
                    <Text style={s.dsSecHead}>{l('Setores', 'Sectors')}</Text>
                    {shown.map((lg, i) => (
                      <View key={i} style={s.dsSecRow}>
                        <Text style={s.dsSecNo} numberOfLines={1}>{lg.flightNo || `${i + 1}`}</Text>
                        <Text style={s.dsSecRt} numberOfLines={1}>{lg.dep || '?'}→{lg.arr || '?'}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.dsSecTm}>{lg.off || '—'} → {lg.on || '—'}</Text>
                          {(() => { const zo = legZulu(dayIso, lg, 'off'), zn = legZulu(dayIso, lg, 'on'); return (zo || zn) ? <Text style={s.dsSecZ}>{zo || '—'} → {zn || '—'}Z</Text> : null; })()}
                        </View>
                      </View>
                    ))}
                    {legs.length > 3 && canExpand ? (
                      <TouchableOpacity onPress={() => { select(); setSecExpand((v) => !v); }} hitSlop={6} style={s.dsMore} activeOpacity={0.7}>
                        <Text style={s.dsMoreTxt}>{collapsed ? l(`+ ${legs.length - 3} setores`, `+ ${legs.length - 3} sectors`) : l('mostrar menos', 'show less')}</Text>
                        <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={14} color={C.brand} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <View style={s.dsMeta}>
                  {d.report_time ? <View style={s.dsMi}><Text style={s.dsMiLbl}>{l('Apresentação', 'Report')}</Text><Text style={s.dsMiVal}>{d.report_time}</Text></View> : null}
                  {d.flight_minutes ? <View style={s.dsMi}><Text style={s.dsMiLbl}>Block hours</Text><Text style={s.dsMiVal}>{minToHhmm(d.flight_minutes)}</Text></View> : null}
                  {dutyMin != null ? <View style={s.dsMi}><Text style={s.dsMiLbl}>Duty hours</Text><Text style={s.dsMiVal}>{minToHhmm(dutyMin)}{endsNext ? ' ⁺¹' : ''}</Text></View> : null}
                </View>
                {(perDiem != null || nsEur != null) ? (
                  <View style={s.dsPay}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dsPayLbl}>{multi ? l('Ganhos do serviço', 'Service earnings') : l('Ganhos do dia', 'Day earnings')}</Text>
                      <Text style={s.dsPayBreak}>{[
                        perDiem != null ? `${l('per-diem', 'per diem')} +${fmtEur(perDiem)}` : null,
                        nsEur != null ? `🌙 +${fmtEur(nsEur)}` : null,
                      ].filter(Boolean).join('  ·  ')}</Text>
                    </View>
                    <Text style={s.dsPayTotal}>+{fmtEur((perDiem || 0) + (nsEur || 0))}</Text>
                  </View>
                ) : null}
                {/* Serviço EXTRA (idx>0): editar/apagar individual (a primária trata-se nos botões de baixo). */}
                {multi && idx > 0 ? (
                  <View style={s.dsSvcActs}>
                    <TouchableOpacity onPress={() => { const iso = dayIso; setDayIso(null); setDutyAppend(false); setDutyEditExtra(idx - 1); setDutyDate(iso); }} hitSlop={6} style={s.dsSvcAct} activeOpacity={0.7}>
                      <Ionicons name="create-outline" size={15} color={C.brand} /><Text style={s.dsSvcActTxt}>{l('Editar', 'Edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { const iso = dayIso, ix = idx - 1; Alert.alert(l('Apagar serviço', 'Delete service'), l('Apagar este serviço do dia? Os outros mantêm-se.', 'Delete this service? The others stay.'), [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => removeDutyService(iso, ix) }]); }} hitSlop={6} style={s.dsSvcAct} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={15} color={C.red} /><Text style={[s.dsSvcActTxt, { color: C.red }]}>{l('Apagar', 'Delete')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          };

          // Faixa de REPOUSO ENTRE serviços (235 + split duty 220) — rest/split/continuous.
          const restChip = (rb, i) => {
            const tone = rb.kind === 'rest' ? C.green : rb.kind === 'split' ? C.warn : C.red;
            const bg = rb.kind === 'rest' ? C.greenSoft : rb.kind === 'split' ? C.warnSoft : C.redSoft;
            const place = rb.place === 'away' ? l('fora', 'away') : l('base', 'base');
            const txt = rb.kind === 'rest'
              ? l(`Repouso entre serviços · ${fmtM(rb.gapMin)} (mín ${fmtM(rb.requiredMin)} ${place}) ✓`, `Rest between · ${fmtM(rb.gapMin)} (min ${fmtM(rb.requiredMin)}) ✓`)
              : rb.kind === 'split'
                ? l(`Split duty · ${fmtM(rb.gapMin)} < mín ${fmtM(rb.requiredMin)} → conta como 1 serviço (220)`, `Split duty · ${fmtM(rb.gapMin)} < min → counts as one FDP (220)`)
                : l(`Muito perto · ${fmtM(rb.gapMin)} (< 3h) → é o mesmo serviço`, `Too close · ${fmtM(rb.gapMin)} (< 3h) → same duty`);
            return <View key={`rb${i}`} style={[s.dsRest, { backgroundColor: bg }]}><View style={[s.dsRestDot, { backgroundColor: tone }]} /><Text style={[s.dsRestTxt, { color: tone }]}>{txt}</Text></View>;
          };

          const rows = [];
          services.forEach((svc, i) => { rows.push(renderSvc(svc, i)); if (i < services.length - 1) rows.push(restChip(between[i] || { kind: 'rest', gapMin: 0, requiredMin: 0, place: 'base' }, i)); });

          return (
            <View style={s.dsBody}>
              <Text style={s.dsDate}>{dateLbl}{dayIso === today ? ` · ${l('hoje', 'today')}` : ''}</Text>
              {multi ? <Text style={s.dsCount}>{services.length} {l('serviços', 'services')}</Text> : null}
              {rows}
              <View style={s.dsBtns}>
                <GhostButton onPress={() => { const iso = dayIso; setDayIso(null); setDutyAppend(false); setDutyDate(iso); }} icon="create-outline" radius="lg" style={{ flex: 1 }} label={l('Editar', 'Edit')} />
                <PrimaryButton onPress={() => { const iso = dayIso; setDayIso(null); navigation.navigate('DutyDetail', { date: iso }); }} icon="open-outline" radius="lg" style={{ flex: 1 }} label={l('Ver tudo', 'See all')} />
              </View>
              <TouchableOpacity onPress={() => { const iso = dayIso; setDayIso(null); setDutyAppend(true); setDutyDate(iso); }} activeOpacity={0.8} style={s.dsAdd}>
                <Ionicons name="add" size={18} color={C.brand} />
                <Text style={s.dsAddTxt}>{l('adicionar serviço', 'add service')}</Text>
              </TouchableOpacity>
            </View>
          );
        })() : null}
      </BottomSheet>

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

          <PrimaryButton onPress={onGeneratePdf} icon="document-text-outline" style={{ marginTop: 20 }} label={t('duties.recGenerate', lang)} />
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
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ib: { width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  syncDot: { position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 99, backgroundColor: C.brand, borderWidth: 1.5, borderColor: C.canvas },

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

  // ── Grelha de calendário ──
  wkhead: { flexDirection: 'row', marginTop: 6, marginBottom: 4 },
  wkh: { flex: 1, textAlign: 'center', fontSize: 9, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: C.sub },
  wkhWe: { color: C.lineStrong },
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gc: { height: 58, borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingTop: 5, paddingHorizontal: 4, paddingBottom: 5, backgroundColor: C.card, alignItems: 'flex-start' },
  gcEmpty: { borderColor: 'transparent', backgroundColor: 'transparent' },
  gcOff: { backgroundColor: 'transparent' },
  gcWk: { backgroundColor: C.soft2 },
  gcNow: { borderColor: C.red, borderWidth: 2, paddingTop: 4, paddingHorizontal: 3, paddingBottom: 4 },
  gcFlash: { borderColor: C.green, backgroundColor: C.greenSoft },
  gn: { fontSize: 15, fontFamily: FONT.display, letterSpacing: -0.3, lineHeight: 16, color: C.text },
  gnOff: { color: C.lineStrong },
  gnNow: { color: C.red },
  svc: { marginTop: 'auto', alignSelf: 'stretch', alignItems: 'center' },
  code: { fontSize: 8.5, fontFamily: FONT.heavy, letterSpacing: 0.2, textAlign: 'center', maxWidth: '100%' },
  bar: { width: '100%', height: 2.5, borderRadius: 99, marginTop: 3 },
  nsdot: { position: 'absolute', top: 4, right: 4, width: 4, height: 4, borderRadius: 99, backgroundColor: C.info },
  pendDotG: { position: 'absolute', top: 4, left: 4, width: 5, height: 5, borderRadius: 99, backgroundColor: C.warn || C.sub },

  // ── Sheet de detalhe do dia (toque na grelha) ──
  dsBody: { padding: 20 },
  dsDate: { fontSize: 12, fontFamily: FONT.heavy, letterSpacing: 0.3, textTransform: 'uppercase', color: C.sub },
  dsHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8 },
  dsBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  dsBadgeTxt: { fontSize: 10, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff' },
  dsRoute: { flex: 1, fontSize: 20, fontFamily: FONT.display, letterSpacing: -0.4, color: C.text },
  dsSecWrap: { marginTop: 16, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 6 },
  dsSecHead: { fontSize: 10.5, fontFamily: FONT.heavy, letterSpacing: 0.9, textTransform: 'uppercase', color: C.sub, paddingVertical: 7 },
  dsSecRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  dsSecNo: { width: 64, fontSize: 12.5, fontFamily: FONT.heavy, color: C.text, letterSpacing: 0.2 },
  dsSecRt: { flex: 1, fontSize: 13, fontFamily: FONT.bold, color: C.text },
  dsSecTm: { fontSize: 12.5, fontFamily: FONT.semibold, color: C.sub, fontVariant: ['tabular-nums'] },
  dsSecZ: { fontSize: 10.5, fontFamily: FONT.bold, color: C.brand, fontVariant: ['tabular-nums'], marginTop: 2, letterSpacing: 0.2 },
  dsMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.line },
  dsMoreTxt: { fontSize: 12, fontFamily: FONT.bold, color: C.brand },
  dsMeta: { flexDirection: 'row', gap: 9, marginTop: 14 },
  dsMi: { flex: 1, backgroundColor: C.soft2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  dsMiLbl: { fontSize: 10, fontFamily: FONT.bold, color: C.sub, textTransform: 'uppercase', letterSpacing: 0.4 },
  dsMiVal: { fontSize: 17, fontFamily: FONT.display, color: C.text, fontVariant: ['tabular-nums'], marginTop: 2 },
  dsPay: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: C.greenSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  dsPayLbl: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: C.greenText },
  dsPayBreak: { fontSize: 11.5, fontFamily: FONT.medium, color: C.sub, marginTop: 2, fontVariant: ['tabular-nums'] },
  dsPayTotal: { fontSize: 20, fontFamily: FONT.display, color: C.greenText, fontVariant: ['tabular-nums'] },
  dsBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  // Vários serviços no dia (210 conta por serviço): contador + cartão por serviço + repouso entre eles.
  dsCount: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 0.4, textTransform: 'uppercase', color: C.brand, marginTop: 4 },
  dsSvcCard: { marginTop: 12, backgroundColor: C.soft2, borderWidth: 1, borderColor: C.line, borderRadius: RADIUS.lg, padding: 13 },
  dsNum: { width: 22, height: 22, borderRadius: 7, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  dsNumTxt: { fontSize: 12, fontFamily: FONT.heavy, color: '#fff' },
  dsRest: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  dsRestDot: { width: 8, height: 8, borderRadius: 99 },
  dsRestTxt: { flex: 1, fontSize: 11.5, fontFamily: FONT.bold },
  dsAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, borderWidth: 1.5, borderColor: C.brand, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: 12 },
  dsAddTxt: { fontSize: 13, fontFamily: FONT.bold, color: C.brand },
  dsSvcActs: { flexDirection: 'row', gap: 18, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: C.line },
  dsSvcAct: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dsSvcActTxt: { fontSize: 12, fontFamily: FONT.bold, color: C.brand },

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
  orline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  orlineBar: { flex: 1, height: 1, backgroundColor: C.line },
  orlineTxt: { fontSize: 11, fontFamily: FONT.heavy, letterSpacing: 1, textTransform: 'uppercase', color: C.lineStrong },

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


  // Folha do registo FTL.245
  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: FONT.semibold, color: C.text, marginBottom: 8 },
  recSub: { fontSize: TYPE.sub, color: C.sub, lineHeight: 18 },
  recInput: { backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: C.line, color: C.text, fontSize: TYPE.body },
  formHint: { fontSize: 11, color: C.sub, textAlign: 'center', marginTop: 10 },
});
