import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl, Linking, Platform, PanResponder, Animated, Easing, Dimensions, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
import Tip from '../components/Tip';
import AsyncStorage from '../data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import { RADIUS, GUTTER, SPACE, TXT, TYPE, PELE, PELE_FONT, BRAND } from '../data/constants';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import PeleSheet from '../components/PeleSheet';
import PeleHeader from '../components/PeleHeader';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, isoDay } from '../data/appContext';
import { requestCalendarAccess } from '../data/calendar';
import { monthlyAe, serviceMoney, aeIndex, awayNights } from '../data/perdiem';
import { sncToRegister } from '../data/disruption';
import { nightStopStation, hotelMapsUrl } from '../data/hotels';
import HotelSheet from '../components/HotelSheet';
import { legZulu, legsZulu } from '../data/zulu';
import RosterImportSheet from '../components/RosterImportSheet';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import PrimaryButton from '../components/PrimaryButton';
import GhostButton from '../components/GhostButton';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useReduceMotion from '../hooks/useReduceMotion';

const minToHhmm = (min) => { if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}`; };
const clkMin = (str) => { const m = /^(\d{1,2}):([0-5]\d)$/.exec(str || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const clk = (min) => { if (min == null) return null; const x = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

// Grelha (esboço design/escala-v2.html, aprovado 2026-11-03): linha de 46 pt = número (24) + etiqueta (16)
// + folga para a 2.ª camada dos dois serviços. A célula inteira é a área de toque (47,7 × 46 a 390 pt).
const ROW_H = 46;
const ROW_GAP = SPACE.xxs;
const GAP = SPACE.xs;
const REVEAL = 200;   // ao tocar num dia: quanto da folha do dia tem de ficar à vista (cabeçalho + rota + horas)

// Aba Escala (Design System 2.0 · esboço design/escala-v2.html, aprovado pelo Nuno a 2026-11-03).
// Topo: "A tua escala" + sincronizar (a mesma linha das outras abas) · "Novembro 2026 ▾" com ‹ › e "Hoje"
// (só fora do mês corrente) · o resumo numa linha. Grelha: número (hoje = círculo de tinta, escolhido = anel)
// + etiqueta a 11 pt (preta no voo com o destino, clara no resto; lua = pernoita; 2.ª camada = 2 serviços);
// dia vazio = só o número. Por baixo, o DIA ESCOLHIDO numa folha encaixada (sem Modal): a pega encolhe o mês
// para a semana. A escala vem do calendário (criar à mão morreu 2026-07-10). Editar também saiu (2026-11-08): o Detalhe do
// serviço só lê a escala e completa os factos que a lei precisa (design/detalhe-servico.html v2).
export default function EscalaScreen({ navigation, route }) {
  const { lang, duties, dayLog, user, company, ae: aeNow, aeAt, homeBaseAt, crewAt, postFlightMin, rosterChanges, checkRosterChanges, liveSync, notify, removeDutyService,
    calendarId, setCalendarId, calendarName, setCalendarName, addAeEvents, aeEvents, removeAeEvent, hotels, rosterLog, isPilot } = useContext(AppContext);
  // O aviso de SNC corre DEPOIS de a importação gravar o arquivo: lê-se sempre a versão mais recente (não a do render).
  const sncSrc = useRef({ log: [], events: [] });
  sncSrc.current = { log: rosterLog || [], events: aeEvents || [] };
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Mês visível (1.º dia). Default = mês de hoje.
  const [monthDate, setMonthDate] = useState(() => { const t0 = new Date(); return new Date(t0.getFullYear(), t0.getMonth(), 1); });
  const [selIso, setSelIso] = useState(() => isoDay());   // dia escolhido (a folha por baixo mostra-o)
  const [hotelOpen, setHotelOpen] = useState(false);
  const [hotelStation, setHotelStation] = useState(null);
  const [secExpand, setSecExpand] = useState(false); // expandir a lista de setores se for cheia
  // Largura da grelha DETERMINÍSTICA à nascença (ecrã − gutters) → a grelha nasce inteira no 1.º frame
  // (user 2026-07-16). O onLayout só corrige casos raros (split-screen, rotação).
  const [gridW, setGridW] = useState(() => Dimensions.get('window').width - GUTTER * 2);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [legOpen, setLegOpen] = useState(false);
  const reduceMotion = useReduceMotion();
  const toggleLegend = () => {
    select();
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(360, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setLegOpen((v) => !v);
  };
  const [pickYear, setPickYear] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);       // hub de importar (calendário | PDF)
  const [importSource, setImportSource] = useState('calendar');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [flashIso, setFlashIso] = useState(null);       // realce breve do dia após guardar
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);             // re-tocar na aba Escala → volta ao topo (convenção iOS)
  const scrollYRef = useRef(0);          // posição atual do scroll (para revelar a folha do dia)
  const viewHRef = useRef(0);            // altura visível do scroll
  const bandYRef = useRef(0);            // onde começa a folha do dia (no conteúdo)
  const gridYRef = useRef(0);            // onde começa a grelha (no conteúdo)

  // ── DICA da grelha (1.ª abertura pós-folha de boas-vindas). Morre a qualquer toque. ──
  const [gridTip, setGridTip] = useState(false);
  const escBusyRef = useRef(false);
  useEffect(() => {
    escBusyRef.current = !!(importOpen || hubOpen || hotelOpen || calPickerOpen || monthPickerOpen);
  }, [importOpen, hubOpen, hotelOpen, calPickerOpen, monthPickerOpen]);
  useFocusEffect(useCallback(() => {
    let on = true; let tId = null;
    if (user?.id) {
      tId = setTimeout(() => {
        if (!on || escBusyRef.current) return;
        Promise.all([AsyncStorage.getItem(`cp_welcome_${user.id}`), AsyncStorage.getItem(`cp_tip_escala_${user.id}`)])
          .then(([w, t2]) => { if (on && !escBusyRef.current && w === 'seen' && !t2) setGridTip(true); })
          .catch(() => {});
      }, 800);
    }
    return () => { on = false; if (tId) clearTimeout(tId); setGridTip((p) => { if (p && user?.id) AsyncStorage.setItem(`cp_tip_escala_${user.id}`, '1').catch(() => {}); return false; }); };
  }, [user?.id]));
  const dismissGridTip = () => {
    if (!gridTip) return;
    setGridTip(false);
    if (user?.id) AsyncStorage.setItem(`cp_tip_escala_${user.id}`, '1').catch(() => {});
  };

  // Vindo do sino/bilhete "Alterações na escala" → abre a revisão. Consome-e-LIMPA o param.
  useEffect(() => {
    if (route.params?.review) { navigation.setParams({ review: undefined }); setImportSource('calendar'); setImportOpen(true); }
  }, [route.params?.review]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (route.params?.hub) setHubOpen(true);
  }, [route.params?.hub]);

  // Botão "Importar PDF" do Início-setup → abre a importação por PDF DIRETA.
  useEffect(() => {
    if (route.params?.pdf) { setImportSource('paste'); setImportOpen(true); }
  }, [route.params?.pdf]);

  // Vindo do "Dar acesso ao calendário" do Início → dispara já o fluxo de ligar. Consome-e-LIMPA.
  useEffect(() => {
    const c = route.params?.connect;
    if (c) { navigation.setParams({ connect: undefined }); connectCalendar(); }
  }, [route.params?.connect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voltou do DutyDetailScreen após editar → salta para o mês do serviço, escolhe-o e re-acende o realce.
  const lastFlash = useRef(null);
  useEffect(() => {
    const fd = route.params?.flashDuty, ts = route.params?.flashTs;
    if (fd && ts && ts !== lastFlash.current) {
      lastFlash.current = ts;
      const [yy, mm] = String(fd).split('-');
      if (yy && mm) setMonthDate(new Date(Number(yy), Number(mm) - 1, 1));
      setSelIso(String(fd));
      setFlashIso(fd); setTimeout(() => setFlashIso(null), 900);
    }
  }, [route.params?.flashDuty, route.params?.flashTs]);

  // Ligar ao calendário: o prompt do sistema dispara SÓ aqui. Concedido → picker. Negado p/ sempre → Definições.
  const connectCalendar = async () => {
    select();
    const res = await requestCalendarAccess();
    if (res?.granted) setCalPickerOpen(true);
    else if (res && res.canAskAgain === false) Linking.openSettings();
  };

  // Sincronizar: relê AGORA o calendário ligado. NÃO grava nada — mudanças vão para revisão.
  const onSync = async () => {
    if (!calendarId || syncing) return;
    select(); setSyncing(true);
    const t0 = Date.now();
    let res; try { res = await checkRosterChanges?.(); } catch { res = null; }
    const dt = Date.now() - t0; if (dt < 500) await new Promise((r) => setTimeout(r, 500 - dt));
    setSyncing(false);
    if (res == null) { notify(l('Não consegui ler o calendário', 'Couldn’t read the calendar'), null, 'warn'); return; }
    const n = res.counts?.total || 0;
    notify(n ? l(`${n} alteração(ões) na escala — por rever (botão do topo)`, `${n} roster change(s) — to review (top button)`)
             : l('Escala em dia', 'Roster up to date'), null, n ? 'changes' : 'ok');
  };
  const openHub = () => { select(); setHubOpen(true); };
  const openImport = (src) => { setImportSource(src || 'calendar'); setHubOpen(false); setImportOpen(true); };

  // ── € (cêntimos, NUNCA arredonda — money-no-rounding) ──
  const fmtEur = (n) => { if (n == null) return '—'; const [i, d] = Number(n).toFixed(2).split('.'); const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`; };

  const today = isoDay();
  const anyDuty = Object.values(duties).some((d) => d && !d.deleted);

  // ── Mês visível ──
  const y = monthDate.getFullYear(), m0 = monthDate.getMonth();
  const ym = `${y}-${String(m0 + 1).padStart(2, '0')}`;
  const ae = aeAt(ym);   // o AE do mês MOSTRADO (linha do tempo do contrato)
  const daysInMonth = new Date(y, m0 + 1, 0).getDate();
  const isCurrentMonth = today.startsWith(ym);
  const dayList = [];
  for (let dn = 1; dn <= daysInMonth; dn++) dayList.push(`${ym}-${String(dn).padStart(2, '0')}`);
  useEffect(() => { if (!isCurrentMonth) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [ym]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthName = monthDate.toLocaleDateString(locale, { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const monthLabel = `${monthCap} ${y}`;

  // Dia escolhido: o do estado se for deste mês; senão hoje (mês corrente) ou o 1.º dia com serviço.
  const monthDutyDays = Object.keys(duties).filter((iso) => iso.startsWith(ym) && duties[iso] && !duties[iso].deleted).sort();
  const defaultSel = isCurrentMonth ? today : (monthDutyDays[0] || `${ym}-01`);
  const sel = (selIso && selIso.startsWith(ym)) ? selIso : defaultSel;

  // Mudar de mês com SÓ o título a deslizar (o ecrã fica quieto). dir: +1 próximo · -1 anterior.
  const rowX = useRef(new Animated.Value(0)).current;
  const changeMonth = (dir) => {
    select();
    if (reduceMotion) { setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1)); return; }
    Animated.timing(rowX, { toValue: -dir * 70, duration: 110, useNativeDriver: true }).start(() => {
      setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
      rowX.setValue(dir * 70);
      Animated.spring(rowX, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 4 }).start();
    });
  };
  const goToday = () => { select(); const t0 = new Date(); setSelIso(today); setMonthDate(new Date(t0.getFullYear(), t0.getMonth(), 1)); };
  // Arrastar ← / → muda de mês.
  const changeMonthRef = useRef(changeMonth); changeMonthRef.current = changeMonth;
  const monthPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 30 || Math.abs(g.vx) > 0.25) changeMonthRef.current(g.dx < 0 ? 1 : -1); },
  })).current;

  // Extras do mês PROJETADOS na grelha (SÓ-LEITURA, derivados dos aeEvents). AUSÊNCIA = férias/doença.
  const extraKinds = (ae && Array.isArray(ae.EXTRA_KINDS)) ? ae.EXTRA_KINDS : [];
  const extraKindOf = (tp) => extraKinds.find((k) => k.id === tp) || null;
  const isAbsence = (tp) => tp === 'vacDays' || tp === 'sickDays';
  const extraLabel = (tp) => { const k = extraKindOf(tp); return (k && k.label && (k.label[lang] || k.label.pt)) || tp; };
  // A doença não tem valor por dia: depende do dia do episódio (Art. 48.º / Cl. 61.ª) e a base do dia sai (CT art. 255.º) —
  // o que entra está no total do mês (revisão do bloco 5). Os outros: o acordo, o contrato e o índice DESSE mês.
  const extraEur = (tp, cat, iso) => {
    if (tp === 'sickDays') return null;
    const ymX = iso ? String(iso).slice(0, 7) : undefined;
    const aX = ymX ? aeAt(ymX) : ae;
    if (!(aX && aX.monthExtras && cat)) return null;
    const it = aX.monthExtras(cat, { [tp]: 1 }, { ym: ymX, index: aX.indexFactor && ymX ? aX.indexFactor(ymX) : 1, contract: (ymX && crewAt(ymX).contract) || '12/12' }).items[0];
    return it && it.each != null ? it.total : null;
  };
  const absCode = (tp) => (tp === 'vacDays' ? l('FÉR', 'LVE') : l('DOE', 'SCK'));
  const dayAbs = {};   // iso → 1.º evento de AUSÊNCIA desse dia
  const dayOv = {};    // iso → eventos de PAGAMENTO sobre um dia TRABALHADO (snc/rdp)
  (aeEvents || []).forEach((e) => {
    if (!e || !e.date || String(e.date).length !== 10) return;
    if (isAbsence(e.type)) { if (!dayAbs[e.date]) dayAbs[e.date] = e; }
    else { (dayOv[e.date] || (dayOv[e.date] = [])).push(e); }
  });

  // Resumo do mês numa linha: serviços (a MESMA regra do stats.js) · pernoitas · per-diem.
  const serviceCount = monthDutyDays.length;
  const catYm = crewAt(ym).category;
  // O per-diem do mês pelo MESMO caminho dos Números (monthlyAe, com o índice do mês — auditoria A-193, bloco 6) e as noites
  // fora pela mesma conta (a estadia inteira, L13).
  const pdM = (ae && catYm) ? monthlyAe(duties, catYm, crewAt(ym).contract || '12/12', ae, { ym, index: aeIndex(ae, ym), fleet: crewAt(ym).fleet }) : null;
  const perDiemTotal = pdM ? pdM.perDiem : null;
  const nightCount = awayNights(duties, ym).length;

  const kindLabel = (kind) => (kind === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang));

  // ── Grelha ── Segunda = coluna 0.
  const firstWeekday = ((new Date(y, m0, 1).getDay()) + 6) % 7;
  const WD = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  // Código curto da etiqueta: voo → estação "fora da base" (ex. LGW); senão sigla do tipo.
  const dutyCode = (d) => {
    const k = d.kind || 'flight';
    if (k === 'flight') {
      const aps = String(d.route || '').split(/[^A-Za-z]+/).map((x) => x.toUpperCase()).filter(Boolean);
      const b = String(homeBaseAt(ym) || '').toUpperCase();
      return aps.find((a) => a !== b) || aps[aps.length - 1] || aps[0] || '✈';
    }
    return (k === 'standby_airport' || k === 'standby_home') ? 'SBY' : k === 'positioning' ? 'POS' : k === 'office' ? 'OFC' : k === 'training' ? 'FRM' : k === 'reserve' ? 'RES' : '•';
  };
  const dayDateLbl = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso; const sx = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }); return sx.charAt(0).toUpperCase() + sx.slice(1); };

  const cellW = gridW ? (gridW - GAP * 6) / 7 : 0;
  const nRows = Math.ceil((firstWeekday + daysInMonth) / 7);
  const fullH = nRows * ROW_H + (nRows - 1) * ROW_GAP;
  const rowOf = (iso) => Math.floor((firstWeekday + Number(iso.slice(8, 10)) - 1) / 7);
  const selRow = rowOf(sel);

  // ── Encolher o mês para a semana (a pega da folha do dia; Outlook/Todoist) ──
  // 0 = mês inteiro · 1 = só a semana do dia escolhido. Altura não anda no driver nativo → JS (o valor
  // nunca se mistura com animações nativas nos mesmos nós).
  const collapse = useRef(new Animated.Value(0)).current;
  const [weekMode, setWeekMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const weekRef = useRef(false); weekRef.current = weekMode;
  const rangeRef = useRef(1); rangeRef.current = Math.max(1, fullH - ROW_H);
  const reduceRef = useRef(reduceMotion); reduceRef.current = reduceMotion;
  const dragStart = useRef(0); const dragLast = useRef(0);
  const setWeek = (target) => {
    if ((target === 1) !== weekRef.current) select();
    setWeekMode(target === 1);
    if (reduceRef.current) { collapse.setValue(target); return; }
    Animated.timing(collapse, { toValue: target, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };
  const setWeekRef = useRef(setWeek); setWeekRef.current = setWeek;
  const grabPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      setDragging(true);
      collapse.stopAnimation((v) => { dragStart.current = v; dragLast.current = v; });
    },
    onPanResponderMove: (_, g) => {
      const v = Math.min(1, Math.max(0, dragStart.current - g.dy / rangeRef.current));
      dragLast.current = v; collapse.setValue(v);
    },
    onPanResponderRelease: (_, g) => {
      setDragging(false);
      if (Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6) { setWeekRef.current(weekRef.current ? 0 : 1); return; }   // toque na pega
      const target = g.vy < -0.3 ? 1 : g.vy > 0.3 ? 0 : (dragLast.current > 0.5 ? 1 : 0);
      setWeekRef.current(target);
    },
    onPanResponderTerminate: () => { setDragging(false); setWeekRef.current(dragLast.current > 0.5 ? 1 : 0); },
  })).current;
  const gridHeight = collapse.interpolate({ inputRange: [0, 1], outputRange: [fullH, ROW_H] });
  const gridShift = collapse.interpolate({ inputRange: [0, 1], outputRange: [0, -selRow * (ROW_H + ROW_GAP)] });

  // Tocar num dia → escolhe-o. No mês inteiro, se a folha do dia ficar abaixo da barra, desliza SÓ o
  // necessário para a mostrar, sem esconder a linha tocada.
  const openDay = (iso) => {
    select(); setSecExpand(false); setSelIso(iso);
    if (weekRef.current) return;
    const want = bandYRef.current + REVEAL, bottom = scrollYRef.current + viewHRef.current;
    if (want <= bottom || !viewHRef.current) return;
    const rowTop = gridYRef.current + rowOf(iso) * (ROW_H + ROW_GAP);
    const yTo = Math.max(0, Math.min(want - viewHRef.current, rowTop));
    scrollRef.current?.scrollTo({ y: yTo, animated: !reduceMotion });
  };

  // Uma célula: número (hoje = círculo de tinta · escolhido = anel) + etiqueta (código; lua; 2.ª camada).
  const renderCell = (iso) => {
    const d = duties[iso];
    const dd = Number(iso.slice(8, 10));
    const isToday = iso === today;
    const isSel = iso === sel;
    const isDuty = d && !d.deleted;
    const nSvc = isDuty && Array.isArray(d.extra) ? d.extra.length + 1 : 1;
    const isVoo = isDuty && (d.kind || 'flight') === 'flight';
    const abs = !isDuty ? dayAbs[iso] : null;
    const a11y = [
      `${dd} ${monthName}`,
      isToday ? l('hoje', 'today') : null,
      isDuty ? `${nSvc > 1 ? `${nSvc} ${l('serviços', 'duties')}: ` : ''}${kindLabel(d.kind || 'flight')}${(d.kind || 'flight') === 'flight' && d.route ? ` ${d.route}` : ''}` : abs ? extraLabel(abs.type) : l('sem serviço', 'no duty'),
      isDuty && d.nightStop ? l('pernoita', 'night stop') : null,
      isDuty && d.dirty ? l('por sincronizar', 'pending sync') : null,
    ].filter(Boolean).join(' · ');
    const chipStyle = isVoo ? s.chipVoo : isDuty ? s.chipSrv : abs ? (abs.type === 'sickDays' ? s.chipDoe : s.chipFer) : null;
    return (
      <TouchableOpacity key={iso} activeOpacity={0.7} style={[s.cell, { width: cellW }, iso === flashIso && s.cellFlash]}
        accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: isSel }}
        accessibilityHint={l('Toque mostra o dia', 'Tap shows the day')}
        onPress={() => openDay(iso)}>
        <View style={[s.num, isToday ? s.numToday : isSel ? s.numSel : null]}>
          <Text style={[s.numTxt, isToday && s.numTxtToday]} allowFontScaling={false}>{dd}</Text>
        </View>
        {chipStyle ? (
          <View style={[s.chip, chipStyle]}>
            <Text style={[s.chipTxt, isVoo && s.chipTxtVoo]} numberOfLines={1} allowFontScaling={false}>{isDuty ? dutyCode(d) : absCode(abs.type)}</Text>
            {isDuty && d.nightStop ? <Icon name="moon" size={10} color={isVoo ? PELE.paper : PELE.ink} /> : null}
            {isDuty && nSvc > 1 ? <View style={s.chipStack} pointerEvents="none" /> : null}
          </View>
        ) : null}
        {isDuty && d.dirty ? <View style={s.pendDot} pointerEvents="none" /> : null}
      </TouchableOpacity>
    );
  };

  const rcCounts = rosterChanges?.counts;
  const lsCount = liveSync ? Object.keys(liveSync).length : 0;

  // ── A FOLHA DO DIA (por baixo da grelha) ──
  const dayDuty = (duties[sel] && !duties[sel].deleted) ? duties[sel] : null;
  const renderDay = () => {
    const head = (extra) => (
      <View style={s.dayH}>
        <Text style={s.dayHTxt}>{dayDateLbl(sel)}</Text>
        {sel === today ? <Text style={s.dayHTag}>· {l('hoje', 'today')}</Text> : null}
        {extra ? <Text style={s.dayHTag}>· {extra}</Text> : null}
      </View>
    );
    if (!dayDuty) {
      const abs = dayAbs[sel];
      const absEur = abs ? extraEur(abs.type, crewAt(sel).category, sel) : null;
      return (
        <>
          {head()}
          <View style={s.card}>
            <View style={s.offRow}>
              <Icon name={abs ? (abs.type === 'sickDays' ? 'medical' : 'sun') : 'sun'} size={18} color={PELE.grey} />
              <View style={s.offTxtWrap}>
                <Text style={s.offT}>{abs ? `${extraLabel(abs.type)}${absEur != null ? `  ·  ${fmtEur(absEur)}` : ''}` : l('Folga', 'Day off')}</Text>
                <Text style={s.offS}>{abs
                  ? l('Marcado nos extras do mês.', 'Marked in the month’s extras.')
                  : l('Sem serviço neste dia. A escala vem do calendário: sincroniza para atualizar.', 'No duty on this day. The roster comes from the calendar: sync to update.')}</Text>
              </View>
            </View>
            {abs ? (
              <TouchableOpacity style={s.row} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={l('Apagar dos extras', 'Remove from extras')}
                onPress={() => Alert.alert(l('Apagar extra', 'Delete extra'), l('Apagar este dia dos extras do mês?', 'Remove this day from the month extras?'), [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => removeAeEvent(abs.id) }])}>
                <Icon name="trash" size={15} color={PELE.red} />
                <Text style={s.rowDanger}>{l('Apagar dos extras', 'Remove from extras')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      );
    }

    const prim = dayDuty;
    const aeD = aeAt(sel);   // o acordo DESTE dia (linha do tempo do contrato)
    const services = [prim, ...(Array.isArray(prim.extra) ? prim.extra : [])];
    const between = (dayLog[sel] && Array.isArray(dayLog[sel].between)) ? dayLog[sel].between : [];
    const multi = services.length > 1;
    const pf = postFlightMin || 0;
    const catD = crewAt(sel).category;
    const fmtM = (m) => minToHhmm(Math.max(0, Math.round(m || 0)));
    const nsIdx = services.findIndex((sv) => sv && sv.nightStop);
    const nsSt = nsIdx >= 0 ? nightStopStation(services[nsIdx], homeBaseAt(sel)) : null;
    const nsHotel = nsSt ? (hotels || {})[nsSt] : null;

    const hotelRow = nsSt ? (
      nsHotel ? (
        <TouchableOpacity style={s.row} activeOpacity={0.7}
          onPress={() => { select(); Linking.openURL(hotelMapsUrl(nsHotel.name, nsSt, Platform.OS)).catch(() => {}); }}
          onLongPress={() => { select(); setHotelStation(nsSt); setHotelOpen(true); }}
          accessibilityRole="button" accessibilityLabel={`${l('Hotel', 'Hotel')} ${nsHotel.name}`}
          accessibilityHint={l('Toque abre os mapas · toque longo edita', 'Tap opens maps · long press edits')}>
          <Icon name="bed" size={16} color={PELE.ink} />
          <View style={s.rowMain}>
            <Text style={s.rowStrong} numberOfLines={1}>{nsHotel.name}</Text>
            {nsHotel.note ? <Text style={s.rowCaption} numberOfLines={1}>{nsHotel.note}</Text> : null}
          </View>
          <Icon name="pin" size={14} color={PELE.ink} />
          <Text style={s.rowLink}>{l('Mapas', 'Maps')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => { select(); setHotelStation(nsSt); setHotelOpen(true); }} accessibilityRole="button">
          <Icon name="plus" size={14} color={PELE.ink} />
          <Text style={s.rowLink}>{l('Adicionar o hotel desta pernoita', 'Add this night stop’s hotel')}</Text>
        </TouchableOpacity>
      )
    ) : null;

    const renderSvc = (d, idx) => {
      const kind = d.kind || 'flight';
      const isFlight = kind === 'flight';
      const last = idx === services.length - 1;
      const legs = (isFlight && Array.isArray(d.legs)) ? d.legs : [];
      const canExpand = idx === 0;
      const collapsed = legs.length > 3 && !(secExpand && canExpand);
      const shown = collapsed ? legs.slice(0, 3) : legs;
      // € do serviço: a MESMA função e o MESMO índice do total do mês (serviceMoney; auditoria L2, L5 e L10, bloco 6).
      const money = (aeD && catD) ? serviceMoney(aeD, catD, d, { date: sel, fleet: crewAt(sel).fleet, daySvcs: services }) : null;
      const perDiem = money ? money.perDiem : null;
      const nsEur = money ? money.nightStop : null;   // TAP: estadia só nos dias sem voo (bloco 5)
      const svcEur = money && money.other && money.other.eur != null ? { lbl: money.other.lbl[lang === 'en' ? 'en' : 'pt'], eur: money.other.eur } : null;
      const posEur = money && money.positioning != null ? money.positioning : null;
      const so = clkMin(d.signOff), onM = clkMin(d.block_on), rm = clkMin(d.report_time);
      const end = so != null ? so : (onM != null ? onM + (isFlight ? pf : 0) : null);   // débrief só em voo (235c)
      const endsNext = end != null && rm != null && (end % 1440) < rm;
      const dutyMin = (rm != null && end != null) ? (((end % 1440) >= rm) ? (end % 1440) - rm : (end % 1440) + 1440 - rm) : null;
      const meta = isFlight
        ? [d.report_time ? ['Report', d.report_time] : null, d.flight_minutes ? ['Block', minToHhmm(d.flight_minutes)] : null, dutyMin != null ? ['Duty', `${minToHhmm(dutyMin)}${endsNext ? ' ⁺¹' : ''}`] : null]
        : [d.report_time ? [l('Início', 'Start'), d.report_time] : null, end != null ? [l('Fim', 'End'), clk(end)] : null, dutyMin != null ? [l('Duração', 'Length'), minToHhmm(dutyMin)] : null];
      const metaOn = meta.filter(Boolean);
      const title = d.route || null;   // a rota (voo ou posicionamento); sem rota, a etiqueta do tipo chega
      const payParts = [
        perDiem != null ? `${l('per-diem', 'per diem')} ${fmtEur(perDiem)}` : null,
        svcEur != null ? `${svcEur.lbl} ${fmtEur(svcEur.eur)}` : null,
        nsEur != null ? `${l('pernoita', 'night stop')} ${fmtEur(nsEur)}` : null,
        money && money.dayCounted ? l('ajuda já contada no dia', 'allowance already counted for the day') : null,
        posEur != null ? `${l('posicionamento', 'positioning')} ${fmtEur(posEur)}${money.positioningMax > posEur ? ` ${l('a', 'to')} ${fmtEur(money.positioningMax)}` : ''}` : null,
      ].filter(Boolean);
      return (
        <View key={`svc${idx}`} style={s.card}>
          <View style={s.chips}>
            {multi ? <View style={s.idx}><Text style={s.idxTxt} allowFontScaling={false}>{idx + 1}</Text></View> : null}
            <View style={[s.kchip, isFlight ? s.chipVoo : s.chipSrv]}><Text style={[s.chipTxt, isFlight && s.chipTxtVoo]}>{kindLabel(kind)}</Text></View>
            {d.nightStop ? (<><Icon name="moon" size={13} color={PELE.grey} /><Text style={s.chipsNote}>{l('Pernoita', 'Night stop')}</Text></>) : null}
          </View>
          {title ? <Text style={s.cardTitle} numberOfLines={1}>{title}</Text> : null}
          {metaOn.length ? (
            <View style={s.meta}>
              {metaOn.map(([k, v]) => (
                <View key={k} style={s.metaIt}><Text style={s.metaLbl} numberOfLines={1}>{k}</Text><Text style={s.metaVal}>{v}</Text></View>
              ))}
            </View>
          ) : null}

          {(shown.length || (nsIdx === idx && hotelRow)) ? (
            <View>
              {(() => { const shownZ = legsZulu(sel, shown, d.report_time || null); return shown.map((lg, i) => {   // a cadeia uma vez
                // As horas Zulu pela cadeia do serviço (data/zulu.js, legsZulu): o dia e o fuso certos de cada hora.
                const zs = shownZ[i] || {};
                const zo = zs.off || null, zn = zs.on || null;
                const zDiff = (zo && zo !== lg.off) || (zn && zn !== lg.on);   // Zulu só quando difere da hora local
                return (
                  <View key={i} style={s.row}>
                    <Text style={s.legNo} numberOfLines={1}>{lg.flightNo || `${i + 1}`}</Text>
                    <Text style={s.rowStrongFlex} numberOfLines={1}>{lg.dep || '?'} → {lg.arr || '?'}</Text>
                    <View style={s.legTm}>
                      <Text style={s.legTmTxt}>{lg.off || '—'} → {lg.on || '—'}</Text>
                      {zDiff ? <Text style={s.rowCaption}>{zo || '—'} → {zn || '—'}Z</Text> : null}
                    </View>
                  </View>
                );
              }); })()}
              {legs.length > 3 && canExpand ? (
                <TouchableOpacity style={s.row} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ expanded: !collapsed }}
                  onPress={() => {
                    select();
                    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(360, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
                    setSecExpand((v) => !v);
                  }}>
                  <Text style={s.rowLinkFlex}>{collapsed ? l(`+ ${legs.length - 3} setores`, `+ ${legs.length - 3} sectors`) : l('Mostrar menos', 'Show less')}</Text>
                  <Icon name="chevron" rot={collapsed ? 90 : 270} size={13} color={PELE.ink} />
                </TouchableOpacity>
              ) : null}
              {nsIdx === idx ? hotelRow : null}
            </View>
          ) : null}

          {payParts.length ? (
            <View style={s.money}>
              <View style={s.moneyL}>
                <Text style={s.moneyLbl}>{multi ? l('Ganhos do serviço', 'Service earnings') : l('Ganhos do dia', 'Day earnings')}</Text>
                <Text style={s.rowCaption}>{payParts.join(' · ')}</Text>
              </View>
              <Text style={s.moneyTotal}>+{fmtEur((perDiem || 0) + (nsEur || 0) + (svcEur ? svcEur.eur : 0) + (posEur || 0))}</Text>
            </View>
          ) : null}

          {/* Serviço EXTRA (idx>0): ver o seu Detalhe (o Completar vive lá); apagar SÓ manuais (o calendário é a fonte). */}
          {multi && idx > 0 ? (
            <View style={s.svcActs}>
              <TouchableOpacity onPress={() => navigation.navigate('DutyDetail', { date: sel, idx })} hitSlop={8} style={s.svcAct} activeOpacity={0.7} accessibilityRole="button">
                <Icon name="chevron" size={14} color={PELE.ink} /><Text style={s.rowLink}>{l('Ver', 'View')}</Text>
              </TouchableOpacity>
              {prim.source === 'manual' ? (
                <TouchableOpacity onPress={() => { const iso = sel, ix = idx - 1; Alert.alert(l('Apagar serviço', 'Delete service'), l('Apagar este serviço do dia? Os outros mantêm-se.', 'Delete this service? The others stay.'), [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => removeDutyService(iso, ix) }]); }} hitSlop={8} style={s.svcAct} activeOpacity={0.7} accessibilityRole="button">
                  <Icon name="trash" size={14} color={PELE.red} /><Text style={s.rowDanger}>{l('Apagar', 'Delete')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {last ? (
            <>
              {/* Extras PAGOS neste dia trabalhado (SNC/RDP) — compensações por cima do serviço. */}
              {dayOv[sel] ? dayOv[sel].map((e) => (
                <View key={e.id} style={s.row}>
                  <Icon name="wallet" size={14} color={PELE.ink} />
                  <Text style={s.rowBodyFlex}>{extraLabel(e.type)}{extraEur(e.type, catD, sel) != null ? `  ·  +${fmtEur(extraEur(e.type, catD, sel))}` : ''}</Text>
                </View>
              )) : null}
              <TouchableOpacity style={s.more} activeOpacity={0.7} onPress={() => navigation.navigate('DutyDetail', { date: sel })} accessibilityRole="button" accessibilityLabel={l('Ver tudo', 'See all')}>
                <Text style={s.moreTxt}>{l('Ver tudo', 'See all')}</Text>
                <Icon name="chevron" size={16} color={PELE.ink} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      );
    };

    // Faixa de REPOUSO ENTRE serviços (235 + split duty 220). Texto a tinta, a cor fica no ponto.
    const restChip = (rb, i) => {
      const tone = rb.kind === 'rest' ? PELE.ok : rb.kind === 'split' ? PELE.warn : PELE.red;
      const bg = rb.kind === 'rest' ? PELE.okSoft : rb.kind === 'split' ? PELE.warnSoft : PELE.redSoft;
      const place = rb.place === 'away' ? l('fora', 'away') : l('base', 'base');
      const txt = rb.kind === 'rest'
        ? l(`Repouso entre serviços · ${fmtM(rb.gapMin)} (mín ${fmtM(rb.requiredMin)} ${place}) ✓`, `Rest between · ${fmtM(rb.gapMin)} (min ${fmtM(rb.requiredMin)}) ✓`)
        : rb.kind === 'split'
          ? l(`Split duty · ${fmtM(rb.gapMin)} < mín ${fmtM(rb.requiredMin)} → conta como 1 serviço (220)`, `Split duty · ${fmtM(rb.gapMin)} < min → counts as one FDP (220)`)
          : l(`Muito perto · ${fmtM(rb.gapMin)} (< 3h) → é o mesmo serviço`, `Too close · ${fmtM(rb.gapMin)} (< 3h) → same duty`);
      return <View key={`rb${i}`} style={[s.rest, { backgroundColor: bg }]}><View style={[s.restDot, { backgroundColor: tone }]} /><Text style={s.restTxt}>{txt}</Text></View>;
    };

    const rows = [];
    services.forEach((svc, i) => { rows.push(renderSvc(svc, i)); if (i < services.length - 1) rows.push(restChip(between[i] || { kind: 'rest', gapMin: 0, requiredMin: 0, place: 'base' }, i)); });

    return (
      <>
        {head(multi ? `${services.length} ${l('serviços', 'duties')}` : null)}
        {/* Havia uma AUSÊNCIA marcada neste dia, mas afinal há serviço → não é "efetivamente gozada" (BTE). */}
        {dayAbs[sel] ? (
          <View style={s.absWarn}>
            <Icon name="alert" size={16} color={PELE.warn} />
            <View style={s.offTxtWrap}>
              <Text style={s.absWarnT}>{dayAbs[sel].type === 'vacDays' ? l('Tinhas férias marcadas neste dia', 'You had leave marked here') : l('Tinhas doença marcada neste dia', 'You had sick leave marked here')}</Text>
              <Text style={s.absWarnS}>{dayAbs[sel].type === 'vacDays'
                ? l('Como voaste, este dia não é férias gozadas e o suplemento não paga aqui. Marca as férias noutro dia para o receberes.', 'Since you flew, this isn’t taken leave — the supplement isn’t paid here. Re-mark the leave on another day to get it.')
                : l('Como voaste, este dia não conta como doença.', 'Since you flew, this day doesn’t count as sick leave.')}</Text>
              <TouchableOpacity onPress={() => removeAeEvent(dayAbs[sel].id)} activeOpacity={0.7} accessibilityRole="button" hitSlop={8}>
                <Text style={s.absWarnLink}>{l('Remover deste dia', 'Remove from this day')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        {rows}
      </>
    );
  };

  const plural = (n, one, many) => `${n === 1 ? one : many}`;

  return (
    <SafeAreaView style={s.safe} edges={['top']} onTouchStart={gridTip ? dismissGridTip : undefined}>
      <View style={s.body}>
        {/* Linha de cima — igual às outras abas: "A tua escala" à esquerda, sincronizar à direita (ponto âmbar
            quando há alterações por rever ou voos por sincronizar). */}
        <PeleHeader
          eyebrowTop
          eyebrow={`${l('A tua escala', 'Your roster')}${calendarId && calendarName ? ` · ${calendarName}` : ''}`}
          actions={
            <TouchableOpacity style={s.hdrBtn} onPress={openHub} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={calendarId ? l('Calendário e sincronizar', 'Calendar and sync') : l('Importar escala', 'Import roster')}>
              <Icon name={calendarId ? 'sync' : 'download'} size={19} color={PELE.ink} />
              {(rcCounts?.total || lsCount) ? <View style={s.hdrDot} /> : null}
            </TouchableOpacity>
          }
        />

        {!anyDuty ? (
          /* ── Arranque — sem escala: informativo + formas de importar ── */
          <ScrollView style={s.flex} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}>
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
              <PrimaryButton onPress={calendarId ? () => openImport('calendar') : connectCalendar} icon={calendarId ? 'refresh' : 'arrow-forward'} radius="lg" style={{ marginTop: SPACE.lg }}
                label={calendarId ? l('Importar agora', 'Import now') : l('Ligar ao calendário', 'Connect calendar')} />
            </View>

            <View style={s.orline}><View style={s.orlineBar} /><Text style={s.orlineTxt}>{l('ou', 'or')}</Text><View style={s.orlineBar} /></View>
            <GhostButton onPress={() => openImport('paste')} icon="document-text-outline" radius="lg" style={{ marginTop: SPACE.sm }} label={l('Importar PDF da escala', 'Import roster PDF')} />
          </ScrollView>
        ) : (
          <View style={s.flex} {...monthPan.panHandlers}>
            {/* O MÊS — título médio (toque abre o seletor), "Hoje" fora do mês corrente, ‹ ›. */}
            <View style={s.mRow}>
              <Animated.View style={[s.mTitleWrap, { transform: [{ translateX: rowX }] }]}>
                <TouchableOpacity style={s.mTitle} onPress={() => { select(); setPickYear(y); setMonthPickerOpen(true); }} activeOpacity={0.7}
                  accessibilityRole="button" accessibilityLabel={l(`Mudar de mês · ${monthLabel}`, `Change month · ${monthLabel}`)}>
                  <Text style={s.mName} numberOfLines={1} allowFontScaling={false}>{monthCap}</Text>
                  <Text style={s.mYear} numberOfLines={1} allowFontScaling={false}>{y}</Text>
                  <Icon name="chevron" rot={90} size={14} color={PELE.grey} />
                </TouchableOpacity>
              </Animated.View>
              {!isCurrentMonth ? (
                <TouchableOpacity style={s.hoje} onPress={goToday} activeOpacity={0.7} hitSlop={4} accessibilityRole="button" accessibilityLabel={l('Voltar a hoje', 'Back to today')}>
                  <Text style={s.hojeTxt} allowFontScaling={false}>{l('Hoje', 'Today')}</Text>
                </TouchableOpacity>
              ) : null}
              <IconButton icon="back" onPress={() => changeMonth(-1)} label={l('Mês anterior', 'Previous month')} />
              <IconButton icon="back" rot={180} onPress={() => changeMonth(1)} label={l('Mês seguinte', 'Next month')} />
            </View>
            <Text style={s.sumLine}>
              <Text style={s.sumB}>{serviceCount}</Text> {plural(serviceCount, l('serviço', 'duty'), l('serviços', 'duties'))}
              {' · '}<Text style={s.sumB}>{nightCount}</Text> {plural(nightCount, l('pernoita', 'night stop'), l('pernoitas', 'night stops'))}
              {perDiemTotal != null ? <>{' · '}<Text style={s.sumB}>{fmtEur(perDiemTotal)}</Text> {l('per-diem', 'per diem')}</> : null}
            </Text>

            <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={{ paddingBottom: tabSpace }} showsVerticalScrollIndicator={false}
                scrollEnabled={!dragging} scrollEventThrottle={32}
                onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
                onLayout={(e) => { viewHRef.current = e.nativeEvent.layout.height; }}
                refreshControl={<RefreshControl refreshing={refreshing} tintColor={PELE.grey} colors={[PELE.grey]}
                  onRefresh={async () => {
                    setRefreshing(true); const t0 = Date.now();
                    try { await checkRosterChanges?.(); } catch { /* ignora */ }
                    const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                    setRefreshing(false);
                  }} />}>
              <View style={s.wkhead}>{WD.map((w, i) => <Text key={i} style={[s.wkh, { width: cellW }]} allowFontScaling={false}>{w}</Text>)}</View>
              {/* A grelha corta-se a uma semana quando a folha do dia sobe (altura + deslocação animadas). */}
              <Animated.View style={[s.gridClip, { height: gridHeight }]} onLayout={(e) => { gridYRef.current = e.nativeEvent.layout.y; }}>
                <Animated.View style={[s.cal, { transform: [{ translateY: gridShift }] }]}
                  onLayout={(e) => { const w = e.nativeEvent.layout.width; setGridW((p) => (Math.abs(w - p) > 0.5 ? w : p)); }}>
                  {cellW ? (
                    <>
                      {Array.from({ length: firstWeekday }).map((_, i) => <View key={`lead${i}`} style={[s.cell, { width: cellW }]} />)}
                      {dayList.map(renderCell)}
                    </>
                  ) : null}
                </Animated.View>
              </Animated.View>

              {/* A FOLHA DO DIA — encaixada por baixo da grelha; a pega encolhe o mês para a semana. */}
              <View style={s.band} onLayout={(e) => { bandYRef.current = e.nativeEvent.layout.y; }}>
                <View style={s.grab} hitSlop={{ top: 8, bottom: 8 }} {...grabPan.panHandlers}
                  accessible accessibilityRole="button"
                  accessibilityLabel={weekMode ? l('Mostrar o mês', 'Show the month') : l('Mostrar só a semana', 'Show only the week')}
                  accessibilityActions={[{ name: 'activate' }]}
                  onAccessibilityAction={() => setWeek(weekMode ? 0 : 1)}>
                  <View style={s.grabBar} />
                </View>
                {renderDay()}
              </View>

              {/* Legenda — PÍLULA→CARTÃO (fechada por defeito; o cartão inteiro fecha ao toque). */}
              {!legOpen ? (
                <TouchableOpacity style={s.legPill} onPress={toggleLegend} activeOpacity={0.85}
                  accessibilityRole="button" accessibilityState={{ expanded: false }} accessibilityLabel={l('Legenda da grelha', 'Grid legend')}>
                  <View style={s.legStack}>
                    {[PELE.ink, PELE.soft2, PELE.okSoft, PELE.redSoft].map((c, i) => (
                      <View key={`sw${i}`} style={[s.legStackSw, { backgroundColor: c }, i === 0 && s.legStackFirst]} />
                    ))}
                  </View>
                  <Text style={s.legPillTxt} allowFontScaling={false}>{l('Legenda', 'Legend')}</Text>
                  <Icon name="chevron" rot={90} size={12} color={PELE.grey} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.legCard} onPress={toggleLegend} activeOpacity={0.9}
                  accessibilityRole="button" accessibilityState={{ expanded: true }} accessibilityLabel={l('Legenda — fechar', 'Legend — close')}>
                  <View style={s.legCardHead}>
                    <Text style={s.legPillTxt} allowFontScaling={false}>{l('Legenda', 'Legend')}</Text>
                    <Icon name="chevron" rot={-90} size={12} color={PELE.grey} />
                  </View>
                  <Text style={s.legGrp}>{l('Serviços', 'Duties')}</Text>
                  <View style={s.legend}>
                    {[[true, 'LGW', l('Voo · destino', 'Flight · destination')], [false, 'SBY', 'Standby'], [false, 'RES', l('Reserva', 'Reserve')], [false, 'POS', l('Posicionamento', 'Positioning')], [false, 'OFC', l('Escritório', 'Office')], [false, 'FRM', l('Formação', 'Training')]].map(([voo, code, lbl]) => (
                      <View key={code} style={s.legIt}>
                        <View style={[s.chip, s.legChip, voo ? s.chipVoo : s.chipSrv]}><Text style={[s.chipTxt, voo && s.chipTxtVoo]} allowFontScaling={false}>{code}</Text></View>
                        <Text style={s.legTxt}>{lbl}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.legGrp}>{l('Ausências', 'Absences')}</Text>
                  <View style={s.legend}>
                    <View style={s.legIt}><View style={[s.chip, s.legChip, s.chipFer]}><Text style={s.chipTxt} allowFontScaling={false}>{absCode('vacDays')}</Text></View><Text style={s.legTxt}>{l('Férias', 'Leave')}</Text></View>
                    <View style={s.legIt}><View style={[s.chip, s.legChip, s.chipDoe]}><Text style={s.chipTxt} allowFontScaling={false}>{absCode('sickDays')}</Text></View><Text style={s.legTxt}>{l('Doença', 'Sick')}</Text></View>
                  </View>
                  <Text style={s.legGrp}>{l('Marcas', 'Markers')}</Text>
                  <View style={s.legend}>
                    <View style={s.legIt}><View style={[s.chip, s.legChip, s.chipVoo]}><Text style={[s.chipTxt, s.chipTxtVoo]} allowFontScaling={false}>LGW</Text><Icon name="moon" size={10} color={PELE.paper} /></View><Text style={s.legTxt}>{l('Pernoita', 'Night stop')}</Text></View>
                    <View style={s.legIt}><View style={[s.chip, s.legChip, s.chipSrv]}><Text style={s.chipTxt} allowFontScaling={false}>FRM</Text><View style={s.chipStack} /></View><Text style={s.legTxt}>{l('2 serviços no dia', '2 duties that day')}</Text></View>
                    <View style={s.legIt}><View style={[s.pendDot, s.legDot]} /><Text style={s.legTxt}>{l('Por sincronizar', 'Pending sync')}</Text></View>
                    <View style={s.legIt}><View style={[s.num, s.numToday]}><Text style={[s.numTxt, s.numTxtToday]} allowFontScaling={false}>3</Text></View><Text style={s.legTxt}>{l('Hoje', 'Today')}</Text></View>
                    <View style={s.legIt}><View style={[s.num, s.numSel]}><Text style={s.numTxt} allowFontScaling={false}>5</Text></View><Text style={s.legTxt}>{l('Dia escolhido', 'Selected day')}</Text></View>
                  </View>
                </TouchableOpacity>
              )}
              <Text style={s.foot}>{t('duties.syncHint', lang)}</Text>
            </ScrollView>
          </View>
        )}
      </View>

      <RosterImportSheet visible={importOpen} initialSource={importSource} onConnect={connectCalendar}
        onDone={({ saved, source }) => {
          if (!saved) return;
          notify(`${saved} ${l('serviços importados', 'duties imported')}${source === 'pdf' ? l(' do PDF', ' from PDF') : l(' do calendário', ' from calendar')}`, null, 'imported');
          // SNC (deteta→confirma): PROPÕE somar aos Extras, nunca soma sozinho. Regra do AE (Art. 63.º SPAC · Cl. 66.ª
          // SNPVAC, lidos no BTE 2026-11-04): no máximo UM por serviço — o novo serviço vs o planeado 48 h antes, ≥ 2 h;
          // sem assistência; sem os dias que já têm SNC (data/disruption.js sncToRegister, golden test:disruption).
          // Antes: um SNC por CADA mudança nos 7 dias seguintes, sem 48 h nem 2 h (3 SNC num só serviço de teste).
          const hasSnc = !!(aeNow && Array.isArray(aeNow.EXTRA_KINDS) && aeNow.EXTRA_KINDS.some((k) => k.id === 'snc'));
          if (!hasSnc || !addAeEvents) return;
          setTimeout(() => {
            const list = sncToRegister(sncSrc.current.log, { isPilot: !!isPilot, events: sncSrc.current.events });
            const cand = { total: list.length, dates: list.map((x) => x.date) };
            if (!cand.total) return;
            Alert.alert(
              l('Alterações de última hora', 'Short-notice changes'),
              l(`${cand.total === 1 ? '1 serviço mudou' : `${cand.total} serviços mudaram`} 2 h ou mais nas 48 h antes (${isPilot ? 'Art. 63.º' : 'Cl. 66.ª'}). Não é devido se foste chamado de assistência, nem se a alteração veio, nas 12 h seguintes, de um aeroporto inoperacional ou de uma greve de uma agência externa ou de um subcontratante (${isPilot ? 'n.os 4 e 5' : 'n.os 3 e 4'}). Registar ${cand.total === 1 ? 'o SNC' : 'os SNC'} nos Extras do mês (um por serviço)? Se caiu num dia de folga publicada, marca DDO/WFLY/IDO no próprio serviço.`,
                `${cand.total} dut${cand.total === 1 ? 'y' : 'ies'} moved 2 h or more within 48 h (${isPilot ? 'Art. 63' : 'Cl. 66'}). Not due if you were called from standby, or if the change came, within 12 h, from an inoperative airport or a strike by an external agency or subcontractor (${isPilot ? 'nos. 4 and 5' : 'nos. 3 and 4'}). Log the SNC in the month's extras (one per duty)? If it fell on a published day off, mark DDO/WFLY/IDO on the duty itself.`),
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

      {/* Hub de importar — Ligar calendário · Importar PDF */}
      <PeleSheet visible={hubOpen} onClose={() => setHubOpen(false)}>
        <Text style={s.sheetTitle}>{calendarId ? l('Calendário', 'Calendar') : l('Importar escala', 'Import roster')}</Text>
        {calendarId ? (
          <>
            <Text style={s.hubSub}>{l('Ligado a', 'Connected to')}: <Text style={s.hubStrong}>{calendarName || l('calendário do telemóvel', 'phone calendar')}</Text></Text>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); onSync(); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="sync" size={20} color={PELE.ink} /></View>
              <View style={s.flex}>
                <Text style={s.hubOptT}>{l('Sincronizar agora', 'Sync now')}</Text>
                <Text style={s.hubOptS}>{l('Relê o calendário e mostra as alterações.', 'Re-reads the calendar and shows any changes.')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
            {rcCounts?.total ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setImportSource('calendar'); setTimeout(() => setImportOpen(true), 320); }} style={s.hubOpt}>
                <View style={[s.hubOptIc, { backgroundColor: PELE.warnSoft }]}><Icon name="alert" size={19} color={PELE.warn} /></View>
                <View style={s.flex}>
                  <Text style={s.hubOptT}>{l(`Rever ${rcCounts.total} alteração(ões)`, `Review ${rcCounts.total} change(s)`)}</Text>
                  <Text style={s.hubOptS}>{l('A escala mudou no calendário — confirma antes de aplicar.', 'The roster changed in your calendar — confirm before applying.')}</Text>
                </View>
                <Icon name="chevron" size={16} color={PELE.grey} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setTimeout(() => setCalPickerOpen(true), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="transfer" size={19} color={PELE.ink} /></View>
              <View style={s.flex}>
                <Text style={s.hubOptT}>{l('Mudar calendário', 'Change calendar')}</Text>
                <Text style={s.hubOptS}>{l('Escolher outro feed do telemóvel.', 'Pick another phone feed.')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setImportSource('paste'); setTimeout(() => setImportOpen(true), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="doc" size={19} color={PELE.ink} /></View>
              <View style={s.flex}>
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
              <View style={s.flex}>
                <Text style={s.hubOptT}>{l('Ligar ao calendário', 'Connect calendar')}</Text>
                <Text style={s.hubOptS}>{l('Escolhes o calendário do telemóvel; sincroniza sozinho. Só de leitura.', 'Pick your phone calendar; it syncs on its own. Read-only.')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHubOpen(false); setImportSource('paste'); setTimeout(() => setImportOpen(true), 320); }} style={s.hubOpt}>
              <View style={s.hubOptIc}><Icon name="doc" size={19} color={PELE.ink} /></View>
              <View style={s.flex}>
                <Text style={s.hubOptT}>{l('Importar PDF', 'Import PDF')}</Text>
                <Text style={s.hubOptS}>{l('Lês o PDF da escala no telemóvel; a cópia é apagada (RGPD).', 'Read the roster PDF on-device; the copy is deleted (GDPR).')}</Text>
              </View>
              <Icon name="chevron" size={16} color={PELE.grey} />
            </TouchableOpacity>
          </>
        )}
        <View style={s.hubNote}><Icon name="lock" size={13} color={PELE.ok} /><Text style={s.hubNoteTxt}>{l('Lido no telemóvel · confirmas antes de gravar', 'Read on your phone · you confirm before saving')}</Text></View>
      </PeleSheet>
      <HotelSheet visible={hotelOpen} onClose={() => setHotelOpen(false)} station={hotelStation} />

      <CalendarPickerSheet visible={calPickerOpen} onClose={() => setCalPickerOpen(false)} currentId={calendarId}
        onSelect={(id, name) => {
          setCalendarId(id); setCalendarName && setCalendarName(name || null);
          notify(l('Calendário ligado ✓', 'Calendar connected ✓'),
            /easyjet|ezy/i.test([company && company.slug, company && company.name].filter(Boolean).join(' '))
              ? l('Dica: no eCrew, ativa o sync para este calendário — a escala chega sempre atualizada.', 'Tip: in eCrew, enable sync to this calendar — your roster always arrives fresh.')
              : l('Dica: no portal da companhia, ativa a exportação da escala para este calendário.', 'Tip: in your crew portal, enable roster export to this calendar.'));
          setImportSource('calendar');
          setTimeout(() => setImportOpen(true), 350);
        }} />

      {/* Seletor de MÊS — ano ‹ › + 12 meses */}
      <PeleSheet visible={monthPickerOpen} onClose={() => setMonthPickerOpen(false)}>
        <Text style={s.sheetTitle} allowFontScaling={false}>{l('Escolher mês', 'Pick month')}</Text>
        <View style={s.mpYear}>
          <IconButton icon="back" onPress={() => setPickYear((yy) => (yy ?? y) - 1)} label={l('Ano anterior', 'Previous year')} />
          <Text style={s.mpYearTxt} allowFontScaling={false}>{pickYear ?? y}</Text>
          <IconButton icon="back" rot={180} onPress={() => setPickYear((yy) => (yy ?? y) + 1)} label={l('Ano seguinte', 'Next year')} />
        </View>
        <View style={s.mpGrid}>
          {Array.from({ length: 12 }, (_, i) => {
            const nm = new Date(2000, i, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '');
            const label = nm.charAt(0).toUpperCase() + nm.slice(1);
            const on = (pickYear ?? y) === y && i === m0;
            const isNow = (pickYear ?? y) === Number(today.slice(0, 4)) && i === Number(today.slice(5, 7)) - 1;
            return (
              <TouchableOpacity key={i} onPress={() => { select(); setMonthDate(new Date(pickYear ?? y, i, 1)); setMonthPickerOpen(false); }} style={[s.mpChip, on && s.mpChipOn, isNow && s.mpChipToday]} activeOpacity={0.85} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={isNow ? l(`${label} · mês atual`, `${label} · current month`) : label}>
                <Text style={[s.mpChipTxt, on && s.mpChipTxtOn]} allowFontScaling={false}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </PeleSheet>

      {/* Dica da grelha (1.ª abertura pós-folha) — flutua sobre a grelha, seta para cima. */}
      <Tip visible={gridTip} arrow="up" lang={lang} style={{ top: 252 }}
        bold={l('Toca num dia', 'Tap a day')}
        tail={l('para o ver por baixo da grelha — setores, horas e ganhos.', 'to see it below the grid — sectors, times and earnings.')}
        onDismiss={dismissGridTip} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  body: { flex: 1, paddingHorizontal: GUTTER },
  flex: { flex: 1 },

  // Linha de cima: 36×36 = o disco do sino do Perfil (as abas alinham pela linha mais alta).
  hdrBtn: { width: 36, height: 36, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  hdrDot: { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: RADIUS.pill, backgroundColor: PELE.warn, borderWidth: 1.5, borderColor: PELE.paper },

  // O mês (título médio + Hoje + ‹ ›) e o resumo numa linha
  mRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 44, marginTop: SPACE.xs },
  mTitleWrap: { flex: 1, minWidth: 0 },
  mTitle: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s, alignSelf: 'flex-start', minHeight: 44 },
  mName: { ...TXT.titleLg, color: PELE.ink, flexShrink: 1 },
  mYear: { ...TXT.titleLg, color: PELE.grey },
  hoje: { height: 36, paddingHorizontal: SPACE.md, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  hojeTxt: { ...TXT.label, color: PELE.ink },
  sumLine: { ...TXT.body, color: PELE.grey, marginTop: SPACE.xxs },
  sumB: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink },

  // Grelha
  wkhead: { flexDirection: 'row', gap: GAP, marginTop: SPACE.lg, marginBottom: SPACE.s },
  wkh: { ...TXT.tag, textAlign: 'center', color: PELE.grey },
  gridClip: { overflow: 'hidden' },
  cal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: ROW_GAP },
  cell: { height: ROW_H, alignItems: 'center', gap: SPACE.xxs },
  cellFlash: { backgroundColor: PELE.okSoft, borderRadius: RADIUS.xs },
  num: { width: 24, height: 24, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  numToday: { backgroundColor: PELE.ink },
  numSel: { borderWidth: 1.5, borderColor: PELE.ink },
  numTxt: { ...TXT.bodyStrong, color: PELE.ink, fontVariant: ['tabular-nums'] },
  numTxtToday: { color: PELE.paper },
  chip: { alignSelf: 'stretch', height: 16, borderRadius: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xxs },
  chipVoo: { backgroundColor: PELE.ink },
  chipSrv: { backgroundColor: PELE.soft2 },
  chipFer: { backgroundColor: PELE.okSoft },
  chipDoe: { backgroundColor: PELE.redSoft },
  chipTxt: { ...TXT.tag, color: PELE.ink },
  chipTxtVoo: { color: PELE.paper },
  // Dois serviços no dia: uma 2.ª camada por baixo da etiqueta (o "baralho" da família cheia).
  chipStack: { position: 'absolute', left: 6, right: 6, bottom: -4, height: 2, borderRadius: 2, backgroundColor: PELE.grey },
  pendDot: { position: 'absolute', top: 2, left: 2, width: 6, height: 6, borderRadius: RADIUS.pill, backgroundColor: PELE.warn },

  // A folha do dia (encaixada por baixo da grelha)
  band: { marginTop: SPACE.sm, marginHorizontal: -GUTTER, paddingHorizontal: GUTTER, paddingBottom: SPACE.lgPlus, backgroundColor: PELE.soft,
    borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, gap: SPACE.sm },
  grab: { height: 28, alignItems: 'center', justifyContent: 'center' },
  grabBar: { width: 36, height: 4, borderRadius: RADIUS.pill, backgroundColor: PELE.ghost },
  dayH: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACE.s },
  dayHTxt: { ...TXT.bodyStrong, color: PELE.ink },
  dayHTag: { ...TXT.tag, color: PELE.ink },
  card: { backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: SPACE.lg, gap: SPACE.md },
  chips: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  chipsNote: { ...TXT.label, color: PELE.grey, marginLeft: -SPACE.xs },
  kchip: { height: 20, borderRadius: 4, paddingHorizontal: SPACE.s, justifyContent: 'center' },
  idx: { width: 20, height: 20, borderRadius: 6, backgroundColor: PELE.ink, alignItems: 'center', justifyContent: 'center' },
  idxTxt: { ...TXT.tag, color: PELE.paper },
  cardTitle: { ...TXT.title, color: PELE.ink },
  meta: { flexDirection: 'row', gap: SPACE.sm },
  metaIt: { flex: 1, gap: SPACE.xxs },
  metaLbl: { ...TXT.tag, color: PELE.grey },
  metaVal: { ...TXT.num, color: PELE.ink, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 44, borderTopWidth: 1, borderTopColor: PELE.line },
  rowMain: { flex: 1, minWidth: 0 },
  rowStrong: { ...TXT.bodyStrong, color: PELE.ink },
  rowStrongFlex: { ...TXT.bodyStrong, color: PELE.ink, flex: 1 },
  rowBodyFlex: { ...TXT.body, color: PELE.ink, flex: 1 },
  rowCaption: { ...TXT.caption, color: PELE.grey, fontVariant: ['tabular-nums'] },
  rowLink: { ...TXT.label, color: PELE.ink },
  rowLinkFlex: { ...TXT.label, color: PELE.ink, flex: 1 },
  rowDanger: { ...TXT.label, color: PELE.red },
  legNo: { ...TXT.label, color: PELE.grey, width: 64 },
  legTm: { alignItems: 'flex-end' },
  legTmTxt: { ...TXT.body, color: PELE.ink, fontVariant: ['tabular-nums'] },
  money: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: PELE.line },
  moneyL: { flex: 1, minWidth: 0, gap: SPACE.xxs },
  moneyLbl: { ...TXT.label, color: PELE.ink },
  moneyTotal: { ...TXT.num, color: PELE.ink, fontVariant: ['tabular-nums'] },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderTopWidth: 1, borderTopColor: PELE.line, marginBottom: -SPACE.lg },
  moreTxt: { ...TXT.callout, color: PELE.ink },
  svcActs: { flexDirection: 'row', gap: SPACE.lgPlus, paddingTop: SPACE.sm, borderTopWidth: 1, borderTopColor: PELE.line },
  svcAct: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, minHeight: 32 },
  rest: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm },
  restDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  restTxt: { ...TXT.label, color: PELE.ink, flex: 1 },
  offRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  offTxtWrap: { flex: 1, gap: SPACE.xxs },
  offT: { ...TXT.bodyStrong, color: PELE.ink },
  offS: { ...TXT.caption, color: PELE.grey },
  absWarn: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, backgroundColor: PELE.warnSoft, borderRadius: RADIUS.md, padding: SPACE.md },
  absWarnT: { ...TXT.bodyStrong, color: PELE.ink },
  absWarnS: { ...TXT.footnote, color: PELE.ink },
  absWarnLink: { ...TXT.label, color: PELE.ink, textDecorationLine: 'underline', marginTop: SPACE.s },

  // Legenda pílula→cartão (dois tons: tinta = voo, claro = o resto)
  legPill: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, alignSelf: 'flex-start', borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, marginTop: SPACE.lg, backgroundColor: PELE.paper },
  legStack: { flexDirection: 'row' },
  legStackSw: { width: 14, height: 14, borderRadius: 4, borderWidth: 2, borderColor: PELE.paper, marginLeft: -SPACE.s },
  legStackFirst: { marginLeft: 0 },
  legPillTxt: { ...TXT.tag, color: PELE.ink },
  legCard: { borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: SPACE.lg, marginTop: SPACE.lg, backgroundColor: PELE.paper, gap: SPACE.sm },
  legCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legGrp: { ...TXT.tag, color: PELE.grey, marginTop: SPACE.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: SPACE.md, rowGap: SPACE.sm },
  legIt: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  legChip: { alignSelf: 'auto', width: 44, paddingHorizontal: SPACE.xxs },
  legDot: { position: 'relative', top: 0, left: 0 },
  legTxt: { ...TXT.label, color: PELE.grey },
  foot: { ...TXT.caption, color: PELE.grey, marginTop: SPACE.md },

  // Arranque (sem escala)
  h1Big: { fontFamily: PELE_FONT.display, fontSize: 28, letterSpacing: -0.6, color: PELE.ink, marginTop: SPACE.s },
  lead: { ...TXT.body, color: PELE.grey, marginTop: SPACE.sm },
  connectBig: { backgroundColor: PELE.soft2, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: SPACE.lg, marginTop: SPACE.lgPlus },
  connectBigIc: { width: 46, height: 46, borderRadius: RADIUS.md, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  connectBigT: { fontFamily: PELE_FONT.bodyBold, fontSize: TYPE.value, letterSpacing: -0.2, color: PELE.ink },
  connectBigS: { ...TXT.body, color: PELE.grey, marginTop: SPACE.s },
  privRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s, marginTop: SPACE.sm },
  privTxt: { ...TXT.caption, fontFamily: PELE_FONT.bodyBold, color: PELE.ok },
  connectTip: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s, marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: PELE.warnSoft, borderWidth: 1, borderColor: PELE.warnSoftLine },
  connectTipTxt: { ...TXT.footnote, flex: 1, color: PELE.ink },
  orline: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.lg },
  orlineBar: { flex: 1, height: 1, backgroundColor: PELE.line },
  orlineTxt: { ...TXT.tag, color: PELE.grey },

  // Folhas (hub de importar · seletor de mês)
  sheetTitle: { ...TXT.titleLg, color: PELE.ink, marginBottom: SPACE.s },
  hubSub: { ...TXT.body, color: PELE.grey },
  hubStrong: { fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  hubOpt: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.md, paddingVertical: SPACE.md, paddingHorizontal: SPACE.md, marginTop: SPACE.sm },
  hubOptIc: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: PELE.soft2, alignItems: 'center', justifyContent: 'center' },
  hubOptT: { fontFamily: PELE_FONT.bodyBold, fontSize: TYPE.sub, letterSpacing: -0.2, color: PELE.ink },
  hubOptS: { ...TXT.footnote, color: PELE.grey, marginTop: SPACE.xxs },
  hubNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.s, marginTop: SPACE.lg },
  hubNoteTxt: { ...TXT.caption, color: PELE.grey },
  mpYear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.lgPlus, marginBottom: SPACE.md },
  mpYearTxt: { ...TXT.title, color: PELE.ink, minWidth: 76, textAlign: 'center' },
  mpGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACE.sm },
  mpChip: { width: '31%', paddingVertical: SPACE.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PELE.line, alignItems: 'center' },
  mpChipOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  mpChipToday: { borderColor: BRAND.signal, borderWidth: 2 },   // mês REAL de hoje (amarelo = marca, borda = sinal)
  mpChipTxt: { ...TXT.bodyStrong, color: PELE.ink },
  mpChipTxtOn: { color: PELE.onInk },
});
