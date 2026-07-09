import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Share, RefreshControl, Linking, ActivityIndicator, Platform, PanResponder, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
import Tip from '../components/Tip';
import AsyncStorage from '../data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import { RADIUS, GUTTER, TYPE, SPACE, SHADOW, PELE, PELE_FONT } from '../data/constants';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import PeleSheet from '../components/PeleSheet';
import PeleHeader, { peleWord } from '../components/PeleHeader';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, isoDay } from '../data/appContext';
import { buildRecordModel, recordHtml } from '../data/ftlRecord';
import { printToPdfAndShare } from '../data/pdf';
import { requestCalendarAccess } from '../data/calendar';
import { routeDistancesNM, monthlyPerDiem } from '../data/perdiem';
import { shortNoticeCandidates } from '../data/rosterDiff';
import { yearCount } from '../data/aeEvents';
import { nightStopStation, hotelMapsUrl } from '../data/hotels';
import HotelSheet from '../components/HotelSheet';
import { legZulu } from '../data/zulu';
import DutyFormSheet from '../components/DutyFormSheet';
import RosterImportSheet from '../components/RosterImportSheet';
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
  const { lang, duties, dayLog, user, company, ae, crewCategory, crewFleet, crewAt, base, postFlightMin, rosterChanges, checkRosterChanges, liveSync, notify, removeDutyService,
    calendarId, setCalendarId, calendarName, setCalendarName, addAeEvents, aeEvents, removeAeEvent, hotels, vacationDaysYear } = useContext(AppContext);
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Mês visível (1.º dia). Default = mês de hoje.
  const [monthDate, setMonthDate] = useState(() => { const t0 = new Date(); return new Date(t0.getFullYear(), t0.getMonth(), 1); });
  const [dutyDate, setDutyDate] = useState(null); // dia a inserir/editar → popup
  const [dutyAppend, setDutyAppend] = useState(false); // form em modo "+ serviço" (2.º+ período do dia)
  const [dutyEditExtra, setDutyEditExtra] = useState(null); // índice do serviço extra a editar (null = não)
  const [dayIso, setDayIso] = useState(null);     // dia tocado na grelha → sheet de detalhe (setores)
  const [hotelOpen, setHotelOpen] = useState(false);      // folha do hotel da pernoita (a partir do dia)
  const [hotelStation, setHotelStation] = useState(null); // estação da pernoita do dia aberto
  const [secExpand, setSecExpand] = useState(false); // sheet: expandir lista de setores se for cheia
  const [gridW, setGridW] = useState(0);          // largura medida da grelha → célula = (W − gaps)/7
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);   // seletor de mês (pele "Julho ▾")
  const [pickYear, setPickYear] = useState(null);
  // (avatar saiu do cabeçalho 2026-07-09 — o Perfil vive só no Início; identidade mora na base)
  const lastNewDuty = useRef(null);

  // Registo 245 (PDF): identidade do tripulante, persistida localmente para reutilizar.
  const [recOpen, setRecOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);   // menu "···" (Registo 245 · CSV) com rótulos
  const [importOpen, setImportOpen] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);       // hub de importar (calendário | PDF)
  const [importSource, setImportSource] = useState('calendar'); // fonte com que abre o RosterImportSheet
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh: reverifica a escala
  const [syncing, setSyncing] = useState(false);        // botão Sincronizar (relê o calendário ligado)
  const [flashIso, setFlashIso] = useState(null);       // realce breve do card após guardar
  const scrollRef = useRef(null);        // ScrollView da lista (scroll até hoje ao entrar)
  useScrollToTop(scrollRef);             // re-tocar na aba Escala → volta ao topo (convenção iOS)
  const didScrollToday = useRef(false);  // já posicionámos no dia de hoje neste mês?
  const prevYmRef = useRef(null);        // mês renderizado antes (p/ reativar o scroll ao mudar de mês)
  const [recForm, setRecForm] = useState({ name: '', crewId: '' });
  useEffect(() => {
    if (!user?.id) return;
    AsyncStorage.getItem(`cp_record_${user.id}`).then(v => { if (v) { try { setRecForm(JSON.parse(v)); } catch { /* corrompido */ } } }).catch(() => {});
  }, [user?.id]);

  // ── DICA da grelha (mockup design/boas-vindas.html, 2026-07-10): 1.ª abertura da
  // aba, SÓ pós-folha de boas-vindas (contas nascidas do funil). Morre a qualquer
  // toque; ao sair da aba com a dica visível, marca-se vista (viu-a passar).
  const [gridTip, setGridTip] = useState(false);
  useFocusEffect(useCallback(() => {
    let on = true;
    if (user?.id) {
      Promise.all([AsyncStorage.getItem(`cp_welcome_${user.id}`), AsyncStorage.getItem(`cp_tip_escala_${user.id}`)])
        .then(([w, t2]) => { if (on && w === 'seen' && !t2) setGridTip(true); })
        .catch(() => {});
    }
    return () => { on = false; setGridTip((p) => { if (p && user?.id) AsyncStorage.setItem(`cp_tip_escala_${user.id}`, '1').catch(() => {}); return false; }); };
  }, [user?.id]));
  const dismissGridTip = () => {
    if (!gridTip) return;
    setGridTip(false);
    if (user?.id) AsyncStorage.setItem(`cp_tip_escala_${user.id}`, '1').catch(() => {});
  };

  // FAB "Serviço" (tab bar) → salta para o mês de hoje e abre o popup do novo serviço (hoje).
  useEffect(() => {
    const n = route.params?.newDuty;
    if (n && n !== lastNewDuty.current) {
      lastNewDuty.current = n;
      const t0 = new Date(); setMonthDate(new Date(t0.getFullYear(), t0.getMonth(), 1));
      const today = isoDay();
      // O FAB CRIA sempre um serviço novo → mostra o índice de tipos. Dia com serviço → ACRESCENTA (append); vazio → primário.
      setDutyAppend(!!(duties[today] && !duties[today].deleted));
      setDutyDate(today);
    }
  }, [route.params?.newDuty]);

  // Vindo do sino/banner "Alterações na escala" → abre a folha de revisão (import).
  useEffect(() => {
    if (route.params?.review) { setImportSource('calendar'); setImportOpen(true); }
  }, [route.params?.review]);

  // FAB "Importar" (speed-dial) → abre o HUB (escolher fonte: calendário/PDF), o topo ficou limpo.
  useEffect(() => {
    if (route.params?.hub) setHubOpen(true);
  }, [route.params?.hub]);

  // Botão "Importar PDF" do Início-setup (2026-07-09) → abre a importação por PDF DIRETA.
  useEffect(() => {
    if (route.params?.pdf) { setImportSource('paste'); setImportOpen(true); }
  }, [route.params?.pdf]);

  // Vindo do "Dar acesso ao calendário" do Início → dispara já o fluxo de ligar
  // (prompt + escolher calendário), em vez de deixar o utilizador à procura do botão.
  // Consome-e-LIMPA o param: ele persiste no estado de navegação e um ref não sobrevive
  // ao remount da aba (lazy tabs) → sem limpar, voltar à Escala redisparava o prompt.
  useEffect(() => {
    const c = route.params?.connect;
    if (c) { navigation.setParams({ connect: undefined }); connectCalendar(); }
  }, [route.params?.connect]); // eslint-disable-line react-hooks/exhaustive-deps

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
    notify(n ? l(`${n} alteração(ões) na escala — por rever (botão do topo)`, `${n} roster change(s) — to review (top button)`)
             : l('Escala em dia', 'Roster up to date'), null, n ? 'changes' : 'ok');   // âmbar: "por rever" não é "está tudo bem"
  };
  // Hub de importar (mini-fab / cartão "IR" / arranque) → escolher fonte; depois abre o "Confirmar import".
  const openHub = () => { select(); setHubOpen(true); };
  const openImport = (src) => { setImportSource(src || 'calendar'); setHubOpen(false); setImportOpen(true); };
  const addManual = () => { select(); setHubOpen(false); const today = isoDay(); setTimeout(() => { setDutyAppend(!!(duties[today] && !duties[today].deleted)); setDutyDate(today); }, 340); };   // criar serviço novo (índice); dia ocupado → append. Sequenciado p/ não travar (Modal→Modal)

  // ── € (cêntimos, NUNCA arredonda — money-no-rounding) ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, d] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

  const today = isoDay();
  const anyDuty = Object.values(duties).some((d) => d && !d.deleted);   // mesmo critério da grelha/contagem

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
  const shiftMonth = (delta) => { select(); setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1)); };
  // Mudar de mês com SÓ A LINHA DOS MESES a deslizar (o ecrã fica quieto — opção B). dir: +1 próximo · -1 anterior.
  const rowX = useRef(new Animated.Value(0)).current;
  const changeMonth = (dir) => {
    select();
    Animated.timing(rowX, { toValue: -dir * 70, duration: 110, useNativeDriver: true }).start(() => {
      setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
      rowX.setValue(dir * 70);
      Animated.spring(rowX, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 4 }).start();
    });
  };
  // Arrastar ← / → muda de mês; tocar no mês do meio abre o seletor. Limiar baixo + velocidade → responsivo.
  const monthPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 30 || Math.abs(g.vx) > 0.25) changeMonth(g.dx < 0 ? 1 : -1); },
  })).current;

  // Extras do mês PROJETADOS na grelha (SÓ-LEITURA, derivados dos aeEvents — NÃO são duties, o
  // modelo de pagamento não muda). AUSÊNCIA = férias/doença → ocupa o dia (tipo-de-dia); o resto
  // (snc/rdp) fica só na gestão de extras. Ver [[ae-extras-events]].
  const extraKinds = (ae && Array.isArray(ae.EXTRA_KINDS)) ? ae.EXTRA_KINDS : [];
  const extraKindOf = (tp) => extraKinds.find((k) => k.id === tp) || null;
  const isAbsence = (tp) => tp === 'vacDays' || tp === 'sickDays';   // extras que OCUPAM o dia
  const extraLabel = (tp) => { const k = extraKindOf(tp); return (k && k.label && (k.label[lang] || k.label.pt)) || tp; };
  const extraEur = (tp, cat, iso) => (ae && ae.monthExtras && cat) ? ae.monthExtras(cat, { [tp]: 1 }, { ym: iso ? String(iso).slice(0, 7) : undefined }).total : null;   // cat E tabela do AE efetivas-datadas (crewAt + linha do tempo)
  const absCode = (tp) => (tp === 'vacDays' ? l('FÉR', 'LVE') : l('DOE', 'SCK'));
  const dayAbs = {};   // iso → 1.º evento de AUSÊNCIA desse dia (férias/doença)
  const dayOv = {};    // iso → eventos de PAGAMENTO sobre um dia TRABALHADO (snc/rdp) — não são ausências
  (aeEvents || []).forEach((e) => {
    if (!e || !e.date || String(e.date).length !== 10) return;
    if (isAbsence(e.type)) { if (!dayAbs[e.date]) dayAbs[e.date] = e; }
    else { (dayOv[e.date] || (dayOv[e.date] = [])).push(e); }
  });

  // Resumo do mês: serviços (duties), folgas, per-diem (rota → ae.perDiem).
  // Serviço = qualquer duty NÃO apagado (a MESMA regra do stats.js — sem exigir report_time,
  // senão o resumo diverge das Estatísticas e da grelha).
  const serviceCount = Object.entries(duties).filter(([iso, d]) => iso.startsWith(ym) && d && !d.deleted).length;
  // Folgas: mês corrente = dias DECORRIDOS − serviços (regra do stats.js); mês passado ou
  // FUTURO = dias do mês − serviços (no futuro é o PLANO — mostrar 0 contradizia a grelha cheia).
  const elapsedDays = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth;
  // Ausências (férias/doença) do mês, dentro do decorrido e sem serviço nesse dia — descontam-se
  // às folgas (um dia de férias não é descanso) e mostram-se à parte no resumo.
  const absCount = Object.keys(dayAbs).filter((iso) => iso.startsWith(ym) && Number(iso.slice(8, 10)) <= elapsedDays && !(duties[iso] && !duties[iso].deleted)).length;
  const folgaCount = Math.max(0, elapsedDays - serviceCount - absCount);
  // Saldo de FÉRIAS do ano mostrado (direito anual, Art. 238.º CT) — honesto: voo em dia de férias
  // não conta (volta ao "por marcar"). Só perfis com férias no AE.
  const hasVac = !!(ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays'));
  const vacQuota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
  const vacTaken = hasVac ? yearCount(aeEvents || [], String(y), 'vacDays', duties) : 0;
  const catYm = crewAt(ym).category;   // categoria em vigor no mês mostrado (effective-dated)
  const pd = (ae && catYm) ? monthlyPerDiem(duties, catYm, ae, { ym, fleet: crewFleet }) : null;
  const perDiemTotal = pd ? pd.total : null;
  const nightCount = Object.keys(duties).reduce((n, iso) => { const d = duties[iso]; return n + (d && !d.deleted && d.nightStop && iso.startsWith(ym) ? 1 : 0); }, 0);   // pernoitas do mês

  const weekdayShort = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return ''; const str = dt.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''); return str.charAt(0).toUpperCase() + str.slice(1); };
  const kindLabel = (kind) => (kind === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang));

  // ── Grelha de calendário ── 1.º dia da semana (Segunda=0), rótulos, código/cor por tipo.
  const firstWeekday = ((new Date(y, m0, 1).getDay()) + 6) % 7;   // Dom=0 → Seg=0
  const WD = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const prevDim = new Date(y, m0, 0).getDate();   // dias do mês anterior (p/ os dias "fora" no início)
  const trailCount = (7 - ((firstWeekday + daysInMonth) % 7)) % 7;   // dias do mês seguinte p/ completar a última semana
  const dutyClass = (d) => { const k = d.kind || 'flight'; return k === 'flight' ? 'flight' : (k === 'standby_airport' || k === 'standby_home') ? 'sby' : 'pos'; };
  // Cor da etiqueta POR TIPO de serviço — cada um o SEU tom distinto (pastéis suaves p/ diferenciar; voo escuro).
  const KIND_TINT = { flight: PELE.ink, standby_airport: '#E4E1D8', standby_home: '#E4E1D8', reserve: '#EAE4F2', positioning: '#E4ECFB', office: '#EDE6D6', training: '#FBEAD2' };
  const tagBg = (k) => KIND_TINT[k] || PELE.soft2;
  const tagFg = (k) => k === 'flight' ? PELE.paper : PELE.ink;
  // Código curto da célula: voo → estação "fora da base" (ex. LGW); senão sigla do tipo.
  const dutyCode = (d) => {
    const k = d.kind || 'flight';
    if (k === 'flight') {
      const aps = String(d.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
      const b = String(base || '').toUpperCase();
      return aps.find((a) => a !== b) || aps[aps.length - 1] || aps[0] || '✈';
    }
    return (k === 'standby_airport' || k === 'standby_home') ? 'SBY' : k === 'positioning' ? 'POS' : k === 'office' ? 'OFC' : k === 'training' ? 'FRM' : k === 'reserve' ? 'RES' : '•';
  };
  const openDay = (iso) => { select(); setSecExpand(false); setDayIso(iso); };
  // Fecha a sheet do dia (Modal) e só DEPOIS abre o form (Modal) — 2 Modais ao mesmo tempo TRAVAM no iOS.
  const afterSheet = (fn) => { setDayIso(null); setTimeout(fn, 340); };
  // Dia aberto na sheet de detalhe: o duty NÃO apagado desse dia (null = folga real) — o MESMO
  // critério da grelha, senão um serviço sem report_time abria o ramo "Folga" (mentira).
  const dayDuty = (dayIso && duties[dayIso] && !duties[dayIso].deleted) ? duties[dayIso] : null;
  const dayDateLbl = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso; const sx = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }); return sx.charAt(0).toUpperCase() + sx.slice(1); };

  const GAP = 4;
  const cellW = gridW ? (gridW - GAP * 6) / 7 : 0;
  // Uma célula da grelha: nº + (serviço: código+barra) · fim-de-semana, hoje, pernoita.
  const renderCell = (iso) => {
    const d = duties[iso];
    const dd = Number(iso.slice(8, 10));
    const isToday = iso === today;
    const isDuty = d && !d.deleted;   // serviço SEM report_time (raro) é serviço na mesma — não "folga"
    const nSvc = isDuty && Array.isArray(d.extra) ? d.extra.length + 1 : 1;   // serviços no dia (210 conta por serviço)
    const col = (firstWeekday + dd - 1) % 7;
    const weekend = col >= 5;
    const cls = isDuty ? dutyClass(d) : null;
    const isVoo = isDuty && (d.kind || 'flight') === 'flight';   // célula preenchida a ink → texto branco
    const abs = !isDuty ? dayAbs[iso] : null;   // ausência (férias/doença) projetada — só-leitura
    // Leitor de ecrã: a célula DIZ o que é (dia, tipo/ausência, nº de serviços, pernoita, por sincronizar).
    const a11y = [
      `${dd} ${monthName}`,
      isToday ? l('hoje', 'today') : null,
      isDuty ? `${nSvc > 1 ? `${nSvc}× ` : ''}${kindLabel(d.kind || 'flight')}${d.kind === 'flight' && d.route ? ` ${d.route}` : ''}` : abs ? extraLabel(abs.type) : l('folga', 'day off'),
      isDuty && d.nightStop ? l('pernoita', 'night stop') : null,
      isDuty && d.dirty ? l('por sincronizar', 'pending sync') : null,
    ].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity key={iso} activeOpacity={0.7} style={[s.gc, { width: cellW }, weekend && s.gcWk, isDuty && { backgroundColor: tagBg(d.kind || 'flight') }, abs && (abs.type === 'sickDays' ? s.gcSick : s.gcAbs), isToday && s.gcNow, iso === flashIso && s.gcFlash]}
        accessibilityRole="button" accessibilityLabel={a11y}
        accessibilityHint={l('Toque abre o detalhe · toque longo edita', 'Tap opens detail · long press edits')}
        onPress={() => openDay(iso)}
        onLongPress={() => { select(); setDutyDate(iso); }}>
        <Text style={[s.gn, isVoo && s.gnOnDark]}>{dd}</Text>
        {isDuty ? (
          <Text style={[s.tagCode, isVoo && s.tagCodeOnDark]} numberOfLines={1}>{nSvc > 1 ? `${nSvc}× ` : ''}{dutyCode(d)}</Text>
        ) : abs ? (
          <Text style={[s.tagCode, { color: abs.type === 'sickDays' ? PELE.red : PELE.ok }]} numberOfLines={1}>{absCode(abs.type)}</Text>
        ) : (
          <Text style={s.tagFolga} numberOfLines={1}>{l('folga', 'off')}</Text>
        )}
        {isDuty && d.nightStop ? <View style={s.moon}><Icon name="moon" size={11} color={isVoo ? PELE.onInkFaint : PELE.grey} /></View> : null}
        {isDuty && d.dirty ? <View style={s.pendDotG} /> : null}
        {dayOv[iso] ? <Text style={s.xtraE} allowFontScaling={false}>€</Text> : null}
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
  // Voo ao vivo — nº de serviços cujo registo está atrasado face às horas reais (pontinho + banner).
  const lsCount = liveSync ? Object.keys(liveSync).length : 0;
  const rcSub = rcCounts ? [
    ((rcCounts.changed || 0) + (rcCounts.conflict || 0)) ? `${(rcCounts.changed || 0) + (rcCounts.conflict || 0)} ${l('alterada(s)', 'changed')}` : null,
    rcCounts.added ? `${rcCounts.added} ${l('nova(s)', 'new')}` : null,
    rcCounts.removed ? `${rcCounts.removed} ${l('cancelada(s)', 'cancelled')}` : null,
  ].filter(Boolean).join(' · ') : '';

  return (
    <SafeAreaView style={s.safe} edges={['top']} onTouchStart={gridTip ? dismissGridTip : undefined}>
      <PeleSide label="ESCALA" accent={monthName.toUpperCase()} />
      <View style={s.body}>
        {/* Topo pele (mockup) — avatar↖ · sino↗. Ferramentas realojadas: importar→FAB "+" ·
            sync→pull-to-refresh · export→link no fundo da grelha. */}
        {/* Topo da Escala: sincronizar/importar à ESQUERDA (preferência do user 2026-07-09). */}
        <PeleHeader
          left={
            /* Sincronizar/Importar — botão do header; PONTO âmbar se há alterações/dessincronia */
            <TouchableOpacity style={s.hdrBtn} onPress={openHub} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={calendarId ? l('Calendário e sincronizar', 'Calendar and sync') : l('Importar escala', 'Import roster')}>
              <Icon name={calendarId ? 'sync' : 'download'} size={19} color={PELE.ink} />
              {(rcCounts?.total || lsCount) ? <View style={s.hdrDot} /> : null}
            </TouchableOpacity>
          }
        />

        {!anyDuty ? (
          /* ── Arranque (Serviços) — sem escala: informativo + formas de importar ── */
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}>
            <Text style={s.h1Big}>{l('Serviços', 'Duties')}</Text>
            <Text style={s.lead}>{l('Ainda não tens escala. Liga o calendário do telemóvel (ou importa por PDF) e mostramos os teus serviços aqui.', "You have no roster yet. Connect your phone calendar (or import a PDF) and we'll show your duties here.")}</Text>

            <View style={s.connectBig}>
              <View style={s.connectBigIc}><Icon name="cal" size={22} color={PELE.ink} /></View>
              <Text style={s.connectBigT}>{calendarId ? l('Calendário ligado', 'Calendar connected') : l('Liga o teu calendário', 'Connect your calendar')}</Text>
              <Text style={s.connectBigS}>{calendarId
                ? l('Sem serviços lidos do calendário. Tenta importar de novo (podes mudar o intervalo) ou usa o PDF.', 'No duties read from the calendar. Try importing again (you can change the range) or use a PDF.')
                : l('Importamos os teus serviços do calendário do telemóvel, assim que mudam. Tu só confirmas.', 'We import your duties from the phone calendar whenever they change. You just confirm.')}</Text>
              <View style={s.privRow}><Icon name="lock" size={13} color={PELE.ok} /><Text style={s.privTxt}>{l('Só de leitura · nada é alterado no teu calendário', 'Read-only · nothing is changed in your calendar')}</Text></View>
              {!calendarId ? (
                <View style={s.connectTip}><Icon name="bulb" size={13} color={PELE.warn} /><Text style={s.connectTipTxt}>{l('Melhor com um calendário só para a escala (o feed do eCrew) — aniversários e eventos pessoais ficam de fora.', 'Best with a calendar just for your roster (the eCrew feed) — birthdays and personal events stay out.')}</Text></View>
              ) : null}
              <PrimaryButton onPress={calendarId ? () => openImport('calendar') : connectCalendar} icon={calendarId ? 'refresh' : 'arrow-forward'} radius="lg" style={{ marginTop: 14 }}
                label={calendarId ? l('Importar agora', 'Import now') : l('Ligar ao calendário', 'Connect calendar')} />
            </View>

            <View style={s.orline}><View style={s.orlineBar} /><Text style={s.orlineTxt}>{l('ou', 'or')}</Text><View style={s.orlineBar} /></View>
            <GhostButton onPress={() => openImport('paste')} icon="document-text-outline" radius="lg" style={{ marginTop: 10 }} label={l('Importar PDF da escala', 'Import roster PDF')} />
            <GhostButton onPress={addManual} icon="add" radius="lg" style={{ marginTop: 10 }} label={l('Adicionar serviço à mão', 'Add a duty by hand')} />
          </ScrollView>
        ) : (
          <View style={s.monthWrap} {...monthPan.panHandlers}>
            <PeleHeader
              eyebrow={`${l('A tua escala', 'Your roster')}${calendarId && calendarName ? ` · ${calendarName}` : ''}`}
              ghost={y}
              word={
                /* MÊS (só o mês — o ano é o fantasma) + ▾ · linha AMARELA por baixo quando é o mês atual · swipe muda mês */
                <Animated.View style={{ transform: [{ translateX: rowX }] }}>
                  <TouchableOpacity style={s.mBtn} onPress={() => { select(); setPickYear(y); setMonthPickerOpen(true); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={l(`Mudar de mês · ${monthLabel}`, `Change month · ${monthLabel}`)}>
                    <View style={s.wordWrap}>
                      <Text style={peleWord} numberOfLines={1} allowFontScaling={false}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</Text>
                      {isCurrentMonth ? <View style={s.nowBar} /> : null}
                    </View>
                    <Icon name="chevron" rot={90} size={16} color={PELE.grey} />
                  </TouchableOpacity>
                </Animated.View>
              }
            />

            {/* Resumo do mês — estilo mockup (Barlow, à esquerda, sem separadores); no TOPO (sempre visível, opção 2) */}
            <View style={s.summ}>
              <View style={s.si}><Text style={s.siVal}>{serviceCount}</Text><Text style={s.siLbl}>{l('Serviços', 'Duties')}</Text></View>
              <View style={s.si}><Text style={s.siVal}>{folgaCount}</Text><Text style={s.siLbl}>{l('Folgas', 'Days off')}</Text></View>
              <View style={s.si}><Text style={s.siVal}>{nightCount}</Text><Text style={s.siLbl}>{l('Pernoitas', 'Nights')}</Text></View>
              <View style={s.si}><Text style={[s.siVal, s.siEur]}>{fmtEur(perDiemTotal)}</Text><Text style={s.siLbl}>{l('Per-diem', 'Per diem')}</Text></View>
            </View>

            {/* Grelha do mês — cabeçalho dos dias + células. Toca num serviço → setores (sheet);
                toca/longo numa folga → inserir. */}
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} tintColor={PELE.grey} colors={[PELE.grey]}
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
                    {Array.from({ length: firstWeekday }).map((_, i) => (
                      <View key={`lead${i}`} style={[s.gc, s.gcOut, { width: cellW }]}><Text style={[s.gn, s.gnOut]}>{prevDim - firstWeekday + 1 + i}</Text></View>
                    ))}
                    {dayList.map(renderCell)}
                    {Array.from({ length: trailCount }).map((_, i) => (
                      <View key={`trail${i}`} style={[s.gc, s.gcOut, { width: cellW }]}><Text style={[s.gn, s.gnOut]}>{i + 1}</Text></View>
                    ))}
                  </>
                ) : null}
              </View>
              {/* Legenda — descodifica os códigos/pontos da grelha de relance (Nielsen #6) */}
              {/* Legenda completa — SERVIÇOS (cada tipo o seu tom, a condizer com a etiqueta da célula) */}
              <View style={s.legend}>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: PELE.ink }]} /><Text style={s.legTxt}>{l('Voo', 'Flight')}</Text></View>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: '#E4E1D8' }]} /><Text style={s.legTxt}>Standby</Text></View>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: '#EAE4F2' }]} /><Text style={s.legTxt}>{l('Reserva', 'Reserve')}</Text></View>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: '#E4ECFB' }]} /><Text style={s.legTxt}>{l('Posicion.', 'Positioning')}</Text></View>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: '#EDE6D6' }]} /><Text style={s.legTxt}>{l('Escritório', 'Office')}</Text></View>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: '#FBEAD2' }]} /><Text style={s.legTxt}>{l('Formação', 'Training')}</Text></View>
                <View style={s.legIt}><View style={[s.legSw, s.legSwBorder]} /><Text style={s.legTxt}>{l('Folga', 'Off')}</Text></View>
              </View>
              {/* Legenda completa — EVENTOS / marcadores */}
              <View style={s.legend2}>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: PELE.okSoft }]} /><Text style={s.legTxt2}>{l('Férias', 'Leave')}</Text></View>
                <View style={s.legIt}><View style={[s.legSw, { backgroundColor: PELE.redSoft }]} /><Text style={s.legTxt2}>{l('Doença', 'Sick')}</Text></View>
                <View style={s.legIt}><Text style={s.legEur}>€</Text><Text style={s.legTxt2}>{l('Extra pago', 'Paid extra')}</Text></View>
                <View style={s.legIt}><Icon name="moon" size={12} color={PELE.grey} /><Text style={s.legTxt2}>{l('Pernoita', 'Night stop')}</Text></View>
                <View style={s.legIt}><View style={[s.legDot, { backgroundColor: PELE.warn }]} /><Text style={s.legTxt2}>{l('Por sincronizar', 'Pending')}</Text></View>
              </View>
              {/* Selo/cartão/banners/férias movidos: importar+sincronizar+mudar → botão do header (hub) · alertas → ponto nesse botão · férias → Estatísticas. */}
              <Text style={s.foot}>{t('duties.syncHint', lang)}</Text>
              {/* Exportar movido para a folha do botão de sincronizar (hub). */}
            </ScrollView>
          </View>
        )}
      </View>

      {/* SEM FAB flutuante (2026-07-09): criar serviço = tocar num DIA da grelha (insere
          nesse dia) OU o ＋ central da tab bar → "Serviço" (chega cá via route.params.newDuty)
          · importar/PDF = hub do header · no arranque, os CTAs grandes. */}
      <DutyFormSheet visible={!!dutyDate} onClose={() => { setDutyDate(null); setDutyAppend(false); setDutyEditExtra(null); }} date={dutyDate} append={dutyAppend} editExtra={dutyEditExtra}
        onSaved={(iso) => { setFlashIso(iso); setTimeout(() => setFlashIso(null), 900); }} />
      <RosterImportSheet visible={importOpen} initialSource={importSource} onConnect={connectCalendar}
        onDone={({ saved, source }) => {
          if (!saved) return;
          notify(`${saved} ${l('serviços importados', 'duties imported')}${source === 'pdf' ? l(' do PDF', ' from PDF') : l(' do calendário', ' from calendar')}`, null, 'imported');
          // SNC (deteta→confirma): alterações de ÚLTIMA HORA aplicadas → PROPÕE somar aos
          // Extras do mês do serviço (o AE paga por alteração de curto prazo). Nunca soma
          // sozinho. DDO/IDO não são verificáveis (a app não regista folgas publicadas) →
          // vão como lembrete no mesmo diálogo.
          const hasSnc = !!(ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'snc'));
          if (!hasSnc || !addAeEvents) return;
          const cand = shortNoticeCandidates(rosterChanges, today);
          if (!cand.total) return;
          setTimeout(() => {
            Alert.alert(
              l('Alterações de última hora', 'Short-notice changes'),
              l(`${cand.total} alteração(ões) a ≤7 dias. Registar como SNC (com o dia de cada uma) nos Extras do mês? Se alguma caiu num dia de folga publicada, marca DDO/WFLY/IDO no próprio serviço.`,
                `${cand.total} change(s) within ≤7 days. Log as SNC (each with its day) in the month's extras? If any fell on a published day off, mark DDO/WFLY/IDO on the duty itself.`),
              [
                { text: l('Agora não', 'Not now'), style: 'cancel' },
                { text: l(`Registar +${cand.total} SNC`, `Log +${cand.total} SNC`), onPress: () => {
                  addAeEvents(cand.dates.map((dt) => ({ date: dt, type: 'snc' })));
                  success();
                } },
              ],
            );
          }, 600);
        }}
        onClose={() => { setImportOpen(false); checkRosterChanges && checkRosterChanges(); }} />

      {/* Detalhe do dia (toque na grelha) — serviço com TODOS os setores separados (expandível).
          FOLGA → vista leve (data + "+ adicionar serviço"): explorar a grelha não dispara o form pesado. */}
      <PeleSheet visible={!!dayIso} onClose={() => setDayIso(null)}>
        <ScrollView showsVerticalScrollIndicator={false} style={s.dsScroll} keyboardShouldPersistTaps="handled">
        {dayIso && !dayDuty ? (() => {
          const abs = dayAbs[dayIso];   // ausência (férias/doença) desse dia, se houver
          const absEur = abs ? extraEur(abs.type, crewAt(dayIso).category, dayIso) : null;   // € pela categoria/tabela em vigor nesse dia
          return (
            <View style={s.dsBody}>
              <Text style={s.dsDate}>{dayDateLbl(dayIso)}{dayIso === today ? ` · ${l('hoje', 'today')}` : ''}</Text>
              {abs ? (
                <>
                  <View style={s.dsOffRow}>
                    <Icon name={abs.type === 'sickDays' ? 'medical' : 'sun'} size={17} color={abs.type === 'sickDays' ? PELE.red : PELE.ok} />
                    <Text style={s.dsOffTxt}>{extraLabel(abs.type)}{absEur != null ? `  ·  ${fmtEur(absEur)}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Alert.alert(l('Apagar extra', 'Delete extra'), l('Apagar este dia dos extras do mês?', 'Remove this day from the month extras?'), [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => { removeAeEvent(abs.id); setDayIso(null); } }])}
                    activeOpacity={0.8} style={s.dsAbsDel} accessibilityRole="button" accessibilityLabel={l('Apagar dos extras', 'Remove from extras')}>
                    <Icon name="trash" size={15} color={PELE.red} />
                    <Text style={s.dsAbsDelTxt}>{l('Apagar dos extras', 'Remove from extras')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={s.dsOffRow}>
                  <Icon name="sun" size={17} color={PELE.grey} />
                  <Text style={s.dsOffTxt}>{l('Folga — sem serviço registado', 'Day off — no duty recorded')}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => { const iso = dayIso; afterSheet(() => { setDutyAppend(false); setDutyDate(iso); }); }} activeOpacity={0.8} style={s.dsAdd}>
                <Icon name="plus" size={16} color={PELE.ink} />
                <Text style={s.dsAddTxt}>{l('adicionar serviço', 'add service')}</Text>
              </TouchableOpacity>
            </View>
          );
        })() : null}
        {dayDuty ? (() => {
          const prim = dayDuty;
          const services = [prim, ...(Array.isArray(prim.extra) ? prim.extra : [])];
          const between = (dayLog[dayIso] && Array.isArray(dayLog[dayIso].between)) ? dayLog[dayIso].between : [];
          const multi = services.length > 1;
          const pf = postFlightMin || 0;
          const catD = crewAt(dayIso).category;
          const fmtM = (m) => minToHhmm(Math.max(0, Math.round(m || 0)));

          // Um cartão por SERVIÇO do dia (a EASA conta por serviço — 210). idx 0 = primária.
          const renderSvc = (d, idx) => {
            const kind = d.kind || 'flight';
            const isFlight = kind === 'flight';
            const legs = (isFlight && Array.isArray(d.legs)) ? d.legs : [];
            const canExpand = idx === 0;                          // expande só a primária (simplificação)
            const collapsed = legs.length > 3 && !(secExpand && canExpand);
            const shown = collapsed ? legs.slice(0, 3) : legs;
            let perDiem = null;
            if (ae && catD && isFlight) { const dists = routeDistancesNM(d.route); if (dists.length && !dists.some((x) => x == null)) perDiem = ae.perDiem(catD, dists, 1, crewFleet, dayIso); }
            const nsEur = (d.nightStop && ae && ae.nightStop && catD) ? ae.nightStop(catD, 1, dayIso) : null;
            const so = clkMin(d.signOff), onM = clkMin(d.block_on), rm = clkMin(d.report_time);
            const end = so != null ? so : (onM != null ? onM + (isFlight ? pf : 0) : null);   // débrief só em voo (235c)
            const endsNext = end != null && rm != null && (end % 1440) < rm;   // serviço acaba no dia seguinte
            const dutyMin = (rm != null && end != null) ? (((end % 1440) >= rm) ? (end % 1440) - rm : (end % 1440) + 1440 - rm) : null;
            return (
              <View key={`svc${idx}`} style={multi ? s.dsSvcCard : undefined}>
                <View style={s.dsHead}>
                  {multi ? <View style={s.dsNum}><Text style={s.dsNumTxt}>{idx + 1}</Text></View> : null}
                  <View style={[s.dsBadge, { backgroundColor: tagBg(kind) }]}><Text style={[s.dsBadgeTxt, { color: tagFg(kind) }]}>{kindLabel(kind)}</Text></View>
                  <Text style={s.dsRoute} numberOfLines={1}>{isFlight ? (d.route || l('Voo', 'Flight')) : (d.route ? `${kindLabel(kind)} · ${d.route}` : kindLabel(kind))}</Text>
                  {d.nightStop ? <Icon name="moon" size={14} color={PELE.grey} /> : null}
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
                        <Icon name="chevron" rot={collapsed ? 90 : 270} size={13} color={PELE.ink} />
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
                    <TouchableOpacity onPress={() => { const iso = dayIso; afterSheet(() => { setDutyAppend(false); setDutyEditExtra(idx - 1); setDutyDate(iso); }); }} hitSlop={6} style={s.dsSvcAct} activeOpacity={0.7}>
                      <Icon name="edit" size={14} color={PELE.ink} /><Text style={s.dsSvcActTxt}>{l('Editar', 'Edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { const iso = dayIso, ix = idx - 1; Alert.alert(l('Apagar serviço', 'Delete service'), l('Apagar este serviço do dia? Os outros mantêm-se.', 'Delete this service? The others stay.'), [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => removeDutyService(iso, ix) }]); }} hitSlop={6} style={s.dsSvcAct} activeOpacity={0.7}>
                      <Icon name="trash" size={14} color={PELE.red} /><Text style={[s.dsSvcActTxt, { color: PELE.red }]}>{l('Apagar', 'Delete')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          };

          // Faixa de REPOUSO ENTRE serviços (235 + split duty 220) — rest/split/continuous.
          const restChip = (rb, i) => {
            const tone = rb.kind === 'rest' ? PELE.ok : rb.kind === 'split' ? PELE.warn : PELE.red;
            const bg = rb.kind === 'rest' ? PELE.okSoft : rb.kind === 'split' ? PELE.warnSoft : PELE.redSoft;
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

          // Hotel da pernoita do DIA (catálogo por estação) — a linha 🏨 logo ao 1.º toque
          // na grelha, sem precisar do "Ver tudo". Só quando algum serviço tem pernoita.
          const nsSvc = services.find((sv) => sv && sv.nightStop);
          const nsSt = nsSvc ? nightStopStation(nsSvc, base) : null;
          const nsHotel = nsSt ? (hotels || {})[nsSt] : null;
          const hotelEl = nsSvc ? (
            nsHotel ? (
              <TouchableOpacity style={s.dsHotel} activeOpacity={0.85}
                onPress={() => { select(); Linking.openURL(hotelMapsUrl(nsHotel.name, nsSt, Platform.OS)).catch(() => {}); }}
                onLongPress={() => { select(); setHotelStation(nsSt); setHotelOpen(true); }}
                accessibilityRole="button" accessibilityLabel={`${l('Hotel', 'Hotel')} ${nsHotel.name}`}
                accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
                <Text style={{ fontSize: 15 }}>🏨</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.dsHotelName} numberOfLines={1}>{nsHotel.name}</Text>
                  {nsHotel.note ? <Text style={s.dsHotelNote} numberOfLines={1}>{nsHotel.note}</Text> : null}
                </View>
                <Text style={s.dsHotelGo}>🗺 {l('Mapas', 'Maps')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.dsHotelAdd} activeOpacity={0.8}
                onPress={() => { select(); setHotelStation(nsSt); setHotelOpen(true); }} accessibilityRole="button">
                <Text style={s.dsHotelAddTxt}>＋ {l('adicionar hotel desta pernoita', 'add this night stop’s hotel')}</Text>
              </TouchableOpacity>
            )
          ) : null;

          return (
            <View style={s.dsBody}>
              <Text style={s.dsDate}>{dayDateLbl(dayIso)}{dayIso === today ? ` · ${l('hoje', 'today')}` : ''}</Text>
              {multi ? <Text style={s.dsCount}>{services.length} {l('serviços', 'services')}</Text> : null}
              {/* Aviso: havia uma AUSÊNCIA marcada neste dia, mas afinal há serviço → como voaste,
                  não é "efetivamente gozada" (BTE) e não paga; remarca-a para não a perderes. */}
              {dayAbs[dayIso] ? (
                <View style={s.dsAbsWarn}>
                  <Icon name="alert" size={16} color={PELE.warn} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.dsAbsWarnT}>{dayAbs[dayIso].type === 'vacDays' ? l('Tinhas férias marcada neste dia', 'You had leave marked here') : l('Tinhas doença marcada neste dia', 'You had sick leave marked here')}</Text>
                    <Text style={s.dsAbsWarnS}>{dayAbs[dayIso].type === 'vacDays'
                      ? l('Como voaste, este dia não é férias gozada — o suplemento não paga aqui. Remarca a férias noutro dia para o receberes.', 'Since you flew, this isn’t taken leave — the supplement isn’t paid here. Re-mark the leave on another day to get it.')
                      : l('Como voaste, este dia não conta como doença.', 'Since you flew, this day doesn’t count as sick leave.')}</Text>
                    <TouchableOpacity onPress={() => removeAeEvent(dayAbs[dayIso].id)} activeOpacity={0.8} accessibilityRole="button">
                      <Text style={s.dsAbsWarnLink}>{l('Remover deste dia', 'Remove from this day')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
              {rows}
              {/* Extras PAGOS neste dia trabalhado (SNC/RDP) — compensações por cima do serviço. */}
              {dayOv[dayIso] ? dayOv[dayIso].map((e) => (
                <View key={e.id} style={s.dsOvRow}>
                  <Icon name="wallet" size={14} color={PELE.ok} />
                  <Text style={s.dsOvTxt}>{extraLabel(e.type)}{extraEur(e.type, catD, dayIso) != null ? `  ·  +${fmtEur(extraEur(e.type, catD, dayIso))}` : ''}</Text>
                </View>
              )) : null}
              {hotelEl}
              <View style={s.dsBtns}>
                <TouchableOpacity onPress={() => { const iso = dayIso; afterSheet(() => { setDutyAppend(false); setDutyDate(iso); }); }} activeOpacity={0.85} style={s.dsBtnGhost} accessibilityRole="button" accessibilityLabel={l('Editar', 'Edit')}>
                  <Icon name="edit" size={16} color={PELE.ink} /><Text style={s.dsBtnGhostTxt}>{l('Editar', 'Edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { const iso = dayIso; afterSheet(() => navigation.navigate('DutyDetail', { date: iso })); }} activeOpacity={0.85} style={s.dsBtnPrimary} accessibilityRole="button" accessibilityLabel={l('Ver tudo', 'See all')}>
                  <Text style={s.dsBtnPrimaryTxt}>{l('Ver tudo', 'See all')}</Text><Icon name="chevron" size={15} color={PELE.yellow} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { const iso = dayIso; afterSheet(() => { setDutyAppend(true); setDutyDate(iso); }); }} activeOpacity={0.8} style={s.dsAdd}>
                <Icon name="plus" size={16} color={PELE.ink} />
                <Text style={s.dsAddTxt}>{l('adicionar serviço', 'add service')}</Text>
              </TouchableOpacity>
            </View>
          );
        })() : null}
        </ScrollView>
      </PeleSheet>

      {/* Hub de importar — Ligar calendário · Importar PDF (aberto pelo mini-fab / cartão "IR" / arranque) */}
      <PeleSheet visible={hubOpen} onClose={() => setHubOpen(false)}>
        <Text style={s.hubTitle}>{calendarId ? l('Calendário', 'Calendar') : l('Importar escala', 'Import roster')}</Text>
        {calendarId ? (
          <>
            <Text style={s.hubSub}>{l('Ligado a', 'Connected to')}: <Text style={s.hubStrong}>{calendarName || l('calendário do telemóvel', 'phone calendar')}</Text></Text>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); onSync(); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="sync" size={20} color={PELE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.hubOptT}>{l('Sincronizar agora', 'Sync now')}</Text>
                <Text style={s.hubOptS}>{l('Relê o calendário e mostra as alterações.', 'Re-reads the calendar and shows any changes.')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
            {rcCounts?.total ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setImportSource('calendar'); setTimeout(() => setImportOpen(true), 320); }} style={s.hubOpt}>
                <View style={[s.hubOptIc, { backgroundColor: PELE.warnSoft }]}><Icon name="alert" size={19} color={PELE.warn} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.hubOptT}>{l(`Rever ${rcCounts.total} alteração(ões)`, `Review ${rcCounts.total} change(s)`)}</Text>
                  <Text style={s.hubOptS}>{l('A escala mudou no calendário — confirma antes de aplicar.', 'The roster changed in your calendar — confirm before applying.')}</Text>
                </View>
                <Icon name="chevron" size={16} color={PELE.grey} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setTimeout(() => setCalPickerOpen(true), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="transfer" size={19} color={PELE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.hubOptT}>{l('Mudar calendário', 'Change calendar')}</Text>
                <Text style={s.hubOptS}>{l('Escolher outro feed do telemóvel.', 'Pick another phone feed.')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setImportSource('paste'); setTimeout(() => setImportOpen(true), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="doc" size={19} color={PELE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.hubOptT}>{l('Importar PDF', 'Import PDF')}</Text>
                <Text style={s.hubOptS}>{l('Em alternativa, lê o PDF da escala (RGPD: a cópia é apagada).', 'Alternatively, read the roster PDF (GDPR: the copy is deleted).')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.hubSub}>{l('Trazemos os teus serviços para a Escala — escolhe a fonte.', 'We bring your duties into the roster — pick a source.')}</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setTimeout(() => connectCalendar(), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="cal" size={19} color={PELE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.hubOptT}>{l('Ligar ao calendário', 'Connect calendar')}</Text>
                <Text style={s.hubOptS}>{l('Escolhes o calendário do telemóvel; sincroniza sozinho. Só de leitura.', 'Pick your phone calendar; it syncs on its own. Read-only.')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setImportSource('paste'); setTimeout(() => setImportOpen(true), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="doc" size={19} color={PELE.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.hubOptT}>{l('Importar PDF', 'Import PDF')}</Text>
                <Text style={s.hubOptS}>{l('Lês o PDF da escala no telemóvel; a cópia é apagada (RGPD).', 'Read the roster PDF on-device; the copy is deleted (GDPR).')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
          </>
        )}
        {anyDuty ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setTimeout(() => setMoreOpen(true), 320); }} style={s.hubOpt}>
            <View style={s.hubOptIc}><Icon name="share" size={18} color={PELE.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.hubOptT}>{l('Exportar', 'Export')}</Text>
              <Text style={s.hubOptS}>{l('Registo FTL.245 (PDF) · CSV dos serviços.', 'FTL.245 record (PDF) · duties CSV.')}</Text>
            </View>
            <Icon name="chevron" size={16} color={PELE.grey} />
          </TouchableOpacity>
        ) : null}
        <View style={s.hubNote}><Icon name="lock" size={13} color={PELE.ok} /><Text style={s.hubNoteTxt}>{l('Nada sai do telemóvel · confirmas antes de gravar', 'Nothing leaves your phone · you confirm before saving')}</Text></View>
      </PeleSheet>
      {/* Hotel da pernoita — registar/editar a partir da folha do dia. */}
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={hotelStation} />

      <CalendarPickerSheet visible={calPickerOpen} onClose={() => setCalPickerOpen(false)} currentId={calendarId}
        onSelect={(id, name) => {
          setCalendarId(id); setCalendarName && setCalendarName(name || null);
          // Ligar = ler o calendário e abrir já o "Confirmar import" (calendário). Pequeno atraso
          // para o Modal do picker fechar antes de abrir o do import (evita modal-sobre-modal).
          setImportSource('calendar');
          setTimeout(() => setImportOpen(true), 350);
        }} />

      {/* Menu "···" — exportações com rótulo (o que cada uma é, sem adivinhar ícones) */}
      <BottomSheet visible={moreOpen} onClose={() => setMoreOpen(false)} title={l('Exportar', 'Export')} closeLabel={t('common.close', lang)}>
        <View style={s.hubBody}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { setMoreOpen(false); setTimeout(openPdf, 350); }} style={s.hubOpt}>
            <View style={s.hubOptIc}><Icon name="doc" size={22} color={PELE.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.hubOptT}>{l('Registo FTL.245 (PDF)', 'FTL.245 record (PDF)')}</Text>
              <Text style={s.hubOptS}>{l('Registo de tempos assinável — a lei exige que o guardes (ORO.FTL.245).', 'Signable times record — the law requires you to keep it (ORO.FTL.245).')}</Text>
            </View>
            <Icon name="chevron" size={18} color={PELE.grey} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { setMoreOpen(false); setTimeout(onExport, 350); }} style={s.hubOpt}>
            <View style={s.hubOptIc}><Icon name="share" size={22} color={PELE.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.hubOptT}>{l('Exportar CSV', 'Export CSV')}</Text>
              <Text style={s.hubOptS}>{l('Todos os serviços em tabela — para folhas de cálculo ou backup.', 'All duties as a table — for spreadsheets or backup.')}</Text>
            </View>
            <Icon name="chevron" size={18} color={PELE.grey} />
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Registo ORO.FTL.245 (PDF assinável) */}
      <BottomSheet visible={recOpen} onClose={() => setRecOpen(false)}
        title={t('duties.recTitle', lang)} closeLabel={t('common.close', lang)}>
        <View style={s.form}>
          <Text style={s.recSub}>{t('duties.recSub', lang)}</Text>
          <Text style={[s.fieldLbl, { marginTop: 14 }]}>{t('duties.recName', lang)}</Text>
          <TextInput value={recForm.name} onChangeText={(v) => setRecForm(f => ({ ...f, name: v }))}
            placeholder={t('duties.recNamePh', lang)} placeholderTextColor={PELE.grey} style={s.recInput} />
          <Text style={[s.fieldLbl, { marginTop: 14 }]}>{t('duties.recId', lang)}</Text>
          <TextInput value={recForm.crewId} onChangeText={(v) => setRecForm(f => ({ ...f, crewId: v }))}
            placeholder={t('duties.recIdPh', lang)} placeholderTextColor={PELE.grey} autoCapitalize="characters" style={s.recInput} />

          <PrimaryButton onPress={onGeneratePdf} icon="document-text-outline" style={{ marginTop: 20 }} label={t('duties.recGenerate', lang)} />
          <Text style={s.formHint}>{t('duties.recHint', lang)}</Text>
        </View>
      </BottomSheet>

      {/* Seletor de MÊS (pele "Julho ▾") — ano ‹ › + 12 meses */}
      <PeleSheet visible={monthPickerOpen} onClose={() => setMonthPickerOpen(false)}>
        <Text style={s.mpTitle} allowFontScaling={false}>{l('Escolher mês', 'Pick month')}</Text>
        <View style={s.mpYear}>
          <TouchableOpacity onPress={() => setPickYear((yy) => (yy ?? y) - 1)} hitSlop={8} style={s.marrow} accessibilityLabel={l('Ano anterior', 'Previous year')}><Icon name="chevron" rot={180} size={16} color={PELE.ink} /></TouchableOpacity>
          <Text style={s.mpYearTxt} allowFontScaling={false}>{pickYear ?? y}</Text>
          <TouchableOpacity onPress={() => setPickYear((yy) => (yy ?? y) + 1)} hitSlop={8} style={s.marrow} accessibilityLabel={l('Ano seguinte', 'Next year')}><Icon name="chevron" size={16} color={PELE.ink} /></TouchableOpacity>
        </View>
        <View style={s.mpGrid}>
          {Array.from({ length: 12 }, (_, i) => {
            const nm = new Date(2000, i, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '');
            const label = nm.charAt(0).toUpperCase() + nm.slice(1);
            const on = (pickYear ?? y) === y && i === m0;
            const isNow = (pickYear ?? y) === Number(today.slice(0, 4)) && i === Number(today.slice(5, 7)) - 1;   // mês real de hoje → moldura vermelha
            return (
              <TouchableOpacity key={i} onPress={() => { select(); setMonthDate(new Date(pickYear ?? y, i, 1)); setMonthPickerOpen(false); }} style={[s.mpChip, on && s.mpChipOn, isNow && s.mpChipToday]} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={isNow ? l(`${label} · mês atual`, `${label} · current month`) : label}>
                <Text style={[s.mpChipTxt, on && s.mpChipTxtOn]} allowFontScaling={false}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </PeleSheet>

      {/* Dica da grelha (1.ª abertura pós-folha) — flutua sobre a grelha, seta para cima. */}
      <Tip visible={gridTip} arrow="up" lang={lang} style={{ top: 264 }}
        bold={l('Toca num dia', 'Tap a day')}
        tail={l('para ver o detalhe — ou para criar um serviço nesse dia.', 'to see the detail — or to create a duty on that day.')}
        onDismiss={dismissGridTip} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  body: { flex: 1, paddingHorizontal: GUTTER, paddingTop: 16 },

  // Cabeçalho
  eyeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  eyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.ink },
  monthWrap: { flex: 1 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ib: { width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: PELE.line, alignItems: 'center', justifyContent: 'center' },
  syncDot: { position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 99, backgroundColor: PELE.info, borderWidth: 1.5, borderColor: PELE.paper },

  // Mês navegável
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  marrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  mBtn: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  wordWrap: { position: 'relative' },
  nowBar: { position: 'absolute', left: 0, bottom: -5, width: 26, height: 2.5, borderRadius: 2, backgroundColor: PELE.yellow },   // mês atual — acento curto fixo (marca)
  hdrBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  hdrDot: { position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: PELE.warn, borderWidth: 1.5, borderColor: PELE.paper },
  mpTitle: { fontFamily: PELE_FONT.display, fontSize: 24, color: PELE.ink, letterSpacing: -0.3, marginBottom: 14 },
  mpYear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 14 },
  mpYearTxt: { fontFamily: PELE_FONT.display, fontSize: 22, color: PELE.ink, minWidth: 76, textAlign: 'center' },
  mpGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  mpChip: { width: '31%', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: PELE.line, alignItems: 'center' },
  mpChipOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  mpChipToday: { borderColor: PELE.yellow, borderWidth: 2 },   // mês REAL de hoje (amarelo = marca)
  mpChipTxt: { fontFamily: PELE_FONT.bodyBold, fontSize: 13, color: PELE.ink },
  mpChipTxtOn: { color: PELE.onInk },
  exportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, paddingVertical: 10 },
  exportLinkTxt: { fontFamily: PELE_FONT.bodyBold, fontSize: 12.5, color: PELE.grey },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 32, fontFamily: PELE_FONT.display, letterSpacing: -0.5, color: PELE.ink },

  // Selo do calendário (ligado)
  selo: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: PELE.soft2, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 11 },
  seloT: { fontSize: 12, fontFamily: PELE_FONT.body, color: PELE.ink, maxWidth: '64%' },
  seloChg: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },

  // Cartão "Ligar ao calendário"
  connectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: PELE.soft2, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: 13, marginTop: 11 },
  connectIc: { width: 40, height: 40, borderRadius: 11, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, alignItems: 'center', justifyContent: 'center' },
  connectT: { fontSize: 14.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  connectS: { fontSize: 11.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 2, lineHeight: 15 },

  // Banner de alterações (azul, informativo)

  // Resumo do mês
  summ: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: PELE.line },
  si: { alignItems: 'center' },
  siLbl: { fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.8, textTransform: 'uppercase', color: PELE.grey, marginTop: 2 },
  siVal: { fontSize: 28, fontFamily: PELE_FONT.display, color: PELE.ink, lineHeight: 30 },
  siEur: { color: PELE.ok },
  sep: { width: 1, height: 26, backgroundColor: PELE.line },
  vacChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: PELE.okSoft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7, marginTop: -6, marginBottom: 12 },
  vacChipTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.ok },
  vacChipStrong: { fontFamily: PELE_FONT.bodyHeavy },

  // Cards de dia
  day: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, ...SHADOW.sm },
  dayFlash: { backgroundColor: PELE.okSoft, borderColor: PELE.ok },
  off: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: PELE.soft2, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.md, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 8 },
  dnum: { width: 42, alignItems: 'center' },
  dwd: { fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  dwdOff: { color: PELE.grey },
  dd: { fontSize: 20, fontFamily: PELE_FONT.display, color: PELE.ink, lineHeight: 22 },
  ddOff: { color: PELE.grey },
  ddToday: { color: PELE.red },
  todaydot: { width: 5, height: 5, borderRadius: 99, backgroundColor: PELE.red, marginTop: 3 },
  dmid: { flex: 1, minWidth: 0 },
  drow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff' },
  route: { flex: 1, fontSize: 15, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, letterSpacing: -0.2 },
  nschip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: PELE.info, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  nschipTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: PELE.info },
  pendDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: PELE.warn },
  meta: { fontSize: 12, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, marginTop: 3, fontVariant: ['tabular-nums'] },
  eur: { fontSize: 14, fontFamily: PELE_FONT.display, color: PELE.ok },
  offlbl: { flex: 1, fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },

  // ── Grelha de calendário ──
  wkhead: { flexDirection: 'row', marginTop: 6, marginBottom: 5 },
  wkh: { flex: 1, textAlign: 'center', fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.5, textTransform: 'uppercase', color: PELE.grey },
  wkhWe: { opacity: 0.7 },   // fim-de-semana esbatido
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gc: { height: 58, borderWidth: 1, borderColor: PELE.line, borderRadius: 10, padding: 5, backgroundColor: PELE.paper },
  gcEmpty: { borderColor: 'transparent', backgroundColor: 'transparent' },
  gcOut: { borderStyle: 'dashed', backgroundColor: 'transparent', opacity: 0.5 },   // dias fora do mês (spillover, mockup)
  gcAbs: { backgroundColor: PELE.okSoft },   // dia de férias — projeção só-leitura
  gcSick: { backgroundColor: PELE.redSoft },   // dia de doença
  gcWk: { backgroundColor: PELE.soft },
  gcNow: { borderColor: PELE.yellow, borderWidth: 2, padding: 4 },   // hoje = borda amarela (marca)
  gcFlash: { borderColor: PELE.ok, backgroundColor: PELE.okSoft },
  gn: { fontSize: 13, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, lineHeight: 14 },
  gnOut: { color: '#BEBCB4' },   // dias fora do mês
  tag: { marginTop: 'auto', alignSelf: 'stretch', borderRadius: 5, paddingVertical: 3, paddingHorizontal: 2, alignItems: 'center' },
  tagTxt: { fontSize: 8, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.2 },
  tagAbs: { backgroundColor: PELE.okSoft },
  tagAbsTxt: { color: PELE.ok },
  tagFolga: { marginTop: 'auto', alignSelf: 'stretch', textAlign: 'center', fontSize: 8, fontFamily: PELE_FONT.bodyBold, letterSpacing: 0.2, color: '#C4C2BA' },
  gnOnDark: { color: PELE.paper },   // nº do dia em célula preenchida a ink (voo)
  tagCode: { marginTop: 'auto', alignSelf: 'stretch', textAlign: 'center', fontSize: 8, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.2, color: PELE.ink },
  tagCodeOnDark: { color: PELE.paper },
  moon: { position: 'absolute', top: 5, right: 5 },
  pendDotG: { position: 'absolute', top: 4, left: 4, width: 5, height: 5, borderRadius: 99, backgroundColor: PELE.warn },
  xtraE: { position: 'absolute', top: 4, right: 20, fontSize: 9, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },   // "extra pago" (snc/rdp)

  // ── Sheet de detalhe do dia (toque na grelha) ──
  dsScroll: { maxHeight: Math.round(Dimensions.get('window').height * 0.72) },
  dsBody: { paddingBottom: 4 },
  dsDate: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.3, textTransform: 'uppercase', color: PELE.grey },
  dsHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8 },
  dsBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  dsBadgeTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase', color: PELE.ink },
  dsRoute: { flex: 1, fontSize: 22, fontFamily: PELE_FONT.display, letterSpacing: -0.4, color: PELE.ink },
  dsSecWrap: { marginTop: 16, backgroundColor: PELE.soft, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  dsSecHead: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.9, textTransform: 'uppercase', color: PELE.grey, paddingVertical: 7 },
  dsSecRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: PELE.line },
  dsSecNo: { width: 64, fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink, letterSpacing: 0.2 },
  dsSecRt: { flex: 1, fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  dsSecTm: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, fontVariant: ['tabular-nums'] },
  dsSecZ: { fontSize: 10.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, fontVariant: ['tabular-nums'], marginTop: 2, letterSpacing: 0.2 },
  dsMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderTopWidth: 1, borderTopColor: PELE.line },
  dsMoreTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  dsMeta: { flexDirection: 'row', gap: 9, marginTop: 14 },
  dsMi: { flex: 1, backgroundColor: PELE.soft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  dsMiLbl: { fontSize: 10, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, textTransform: 'uppercase', letterSpacing: 0.4 },
  dsMiVal: { fontSize: 17, fontFamily: PELE_FONT.display, color: PELE.ink, fontVariant: ['tabular-nums'], marginTop: 2 },
  dsPay: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: PELE.okSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  dsPayLbl: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase', color: PELE.ok },
  dsPayBreak: { fontSize: 11.5, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 2, fontVariant: ['tabular-nums'] },
  dsPayTotal: { fontSize: 20, fontFamily: PELE_FONT.display, color: PELE.ok, fontVariant: ['tabular-nums'] },
  dsBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  dsBtnGhost: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: PELE.line, borderRadius: 14, paddingVertical: 13 },
  dsBtnGhostTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  dsBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: PELE.ink, borderRadius: 14, paddingVertical: 13 },
  dsBtnPrimaryTxt: { fontSize: 14, fontFamily: PELE_FONT.bodyBold, color: PELE.paper },
  // Vários serviços no dia (210 conta por serviço): contador + cartão por serviço + repouso entre eles.
  dsCount: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.4, textTransform: 'uppercase', color: PELE.grey, marginTop: 4 },
  dsAbsWarn: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: PELE.warnSoft, borderRadius: 14, padding: 12, marginTop: 12 },
  dsAbsWarnT: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.warn },
  dsAbsWarnS: { fontSize: 11.5, fontFamily: PELE_FONT.body, color: PELE.grey, lineHeight: 16, marginTop: 3 },
  dsAbsWarnLink: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.red, marginTop: 8 },
  dsOvRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PELE.line },
  dsOvTxt: { flex: 1, fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.ink },
  dsSvcCard: { marginTop: 12, backgroundColor: PELE.soft, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, padding: 13 },
  dsNum: { width: 22, height: 22, borderRadius: 7, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },
  dsNumTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  dsRest: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  dsRestDot: { width: 8, height: 8, borderRadius: 99 },
  dsRestTxt: { flex: 1, fontSize: 11.5, fontFamily: PELE_FONT.bodyBold },
  // Hotel da pernoita na folha do dia (mesmo idiom do Início)
  dsHotel: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  dsHotelName: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  dsHotelNote: { fontSize: 10.5, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 1 },
  dsHotelGo: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ink },
  dsHotelAdd: { borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  dsHotelAddTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  dsOffRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 6, backgroundColor: PELE.soft, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  dsOffTxt: { flex: 1, fontSize: 13.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  dsAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 12 },
  dsAddTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  dsAbsDel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8 },
  dsAbsDelTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.red },
  dsSvcActs: { flexDirection: 'row', gap: 18, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: PELE.line },
  dsSvcAct: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dsSvcActTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },

  foot: { fontSize: 11, color: PELE.grey, lineHeight: 16, marginTop: SPACE.md, paddingHorizontal: 2 },

  // Legenda da grelha (uma linha, compacta)
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: 2 },
  legIt: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legSw: { width: 14, height: 14, borderRadius: 4 },
  legSwBorder: { borderWidth: 1.5, borderColor: PELE.line },
  legDot: { width: 6, height: 6, borderRadius: 99 },
  legTxt: { fontSize: 10.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  legEur: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, color: PELE.ok },
  legend2: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 7, paddingHorizontal: 2 },
  legTxt2: { fontSize: 10, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },

  // Arranque (Serviços, sem escala)
  h1Big: { fontSize: 28, fontFamily: PELE_FONT.display, letterSpacing: -0.6, color: PELE.ink, marginTop: 6 },
  lead: { fontSize: 13.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 20, marginTop: 8 },
  connectBig: { backgroundColor: PELE.soft2, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: 16, marginTop: 18 },
  connectBigIc: { width: 46, height: 46, borderRadius: 13, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  connectBigT: { fontSize: 16.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, letterSpacing: -0.2 },
  connectBigS: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 18, marginTop: 6 },
  privRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  privTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyBold, color: PELE.ok },
  connectTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12, padding: 11, borderRadius: RADIUS.md, backgroundColor: PELE.warnSoft, borderWidth: 1, borderColor: PELE.warn + '55' },
  connectTipTxt: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: PELE_FONT.bodyMed, color: PELE.ink },
  orline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  orlineBar: { flex: 1, height: 1, backgroundColor: PELE.line },
  orlineTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.grey },

  // Cartão "IR" (no mês, calendário por ligar) → hub
  goBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PELE.ink, borderRadius: RADIUS.pill, paddingHorizontal: 15, paddingVertical: 9 },
  goBtnTxt: { color: '#fff', fontSize: 13, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.3 },

  // Hub de importar
  hubTitle: { fontFamily: PELE_FONT.display, fontSize: 26, letterSpacing: -0.3, color: PELE.ink, marginBottom: 6 },
  hubSub: { fontSize: 12.5, fontFamily: PELE_FONT.body, color: PELE.grey, lineHeight: 18, marginBottom: 2 },
  hubStrong: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  hubOpt: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginTop: 10 },
  hubOptIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: PELE.soft2, alignItems: 'center', justifyContent: 'center' },
  hubOptT: { fontSize: 14.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, letterSpacing: -0.2 },
  hubOptS: { fontSize: 11.5, fontFamily: PELE_FONT.body, color: PELE.grey, marginTop: 2, lineHeight: 15 },
  hubNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 },
  hubNoteTxt: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },


  // Folha do registo FTL.245
  form: { padding: 20 },
  fieldLbl: { fontSize: TYPE.label, fontFamily: PELE_FONT.body, color: PELE.ink, marginBottom: 8 },
  recSub: { fontSize: TYPE.sub, color: PELE.grey, lineHeight: 18 },
  recInput: { backgroundColor: PELE.soft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: PELE.line, color: PELE.ink, fontSize: TYPE.body },
  formHint: { fontSize: 11, color: PELE.grey, textAlign: 'center', marginTop: 10 },
});
