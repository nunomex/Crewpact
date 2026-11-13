import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl, Linking, Platform, PanResponder, Dimensions, LayoutAnimation, PixelRatio, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Tip from '../components/Tip';
import AsyncStorage from '../data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import { RADIUS, GUTTER, SPACE, TXT, TXT3, TYPE, CARD, PELE, PELE_FONT, BRAND, SHADOW } from '../data/constants';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import PeleSheet from '../components/PeleSheet';
import { HomeCards, HomeTop, pillWidth } from '../components/HomeCards';
import { DutyDetailBody } from './DutyDetailScreen';
import { fitGiant } from '../data/homeCards';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, isoDay } from '../data/appContext';
import { requestCalendarAccess } from '../data/calendar';
import { monthlyAe, serviceMoney, aeIndex, awayNights } from '../data/perdiem';
import { sncToRegister } from '../data/disruption';
import { nightStopStation, hotelMapsUrl } from '../data/hotels';
import { baseCityName } from '../data/countries';
import { monthCells, orderServices, dayCards, yearMonths, monthLegend, cellMatches } from '../data/escalaDay';
import HotelSheet from '../components/HotelSheet';
import RosterImportSheet from '../components/RosterImportSheet';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useReduceMotion from '../hooks/useReduceMotion';

// O dia do mês (Q1 de design/escala-semana.html, escolhida pelo Nuno a 2026-11-13 — "sem círculos e com a cor mais calma"):
// um quadrado de 56 pt, neutro quando há serviço, com o número e o destino; a cor do tipo só numa FITA de 5 pt em baixo
// (dois serviços = as duas cores; a rotação junta as fitas; férias e baixa a tracejado; feito = fita cinzenta). Hoje é o
// quadrado a tinta; o escolhido leva um contorno.
const ROW_H = 56;
const STRIP_H = 5;
const DASHES = 8;   // a fita tracejada das férias e da baixa
const ROW_GAP = SPACE.xs;
const GAP = SPACE.xs;
const C = CARD.day;   // a barra de abas só escurece no Início; a Escala fica de dia como o resto (design-system §14)
const valid = (d) => !!(d && !d.deleted);
const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

// Aba Escala · SÓ O MÊS (escolha 1 de design/escala-so-mes.html, aprovada pelo Nuno a 2026-11-13; a Lista saiu da aba).
// Em cima, na secretária, o topo do Início: "Novembro 2026 ▾" (abre o ano em meses) e ler a escala; "A tua escala de novembro";
// o número de serviços e os factos. Por baixo, numa folha branca, o MÊS no desenho A (design/escala-mes.html: o número limpo e
// uma etiqueta na cor do tipo com o destino; o que cada célula mostra decide-o data/escalaDay.js · monthCells, golden
// test:escala) e a legenda que filtra (L2: tocar numa cor acende esses dias). Deslizar para o lado EM CIMA DA GRELHA muda de mês.
// TOCAR NUM DIA (design/escala-semana.html, aprovado pelo Nuno a 2026-11-13: "subia um modal… e ficava a semana em cima"):
// o topo grande recolhe para a fila das pílulas, o mês fica SÓ NA SEMANA desse dia, em cima, e SOBE UMA FOLHA com pega logo
// por baixo (320 ms; reduzido = aparece). Tocar noutro dia da semana troca o dia; deslizar na semana muda de semana; a pega,
// puxar a folha para baixo ou ✕ descem-na (300 ms) e o mês volta inteiro. Na folha: o cabeçalho (o dia, ‹ › e ✕), uma linha
// por serviço (a pernoita vai na linha do voo) e, no serviço aberto — o único do dia, ou o que se tocar —
// TUDO o que é dele, como o antigo "Ver tudo" (pedido do Nuno, 2026-11-13), no 3.0 (design/detalhe-3.html, B): a linha cresce
// para o cartão de cor com a perna e vêm os cartões dos Limites (o PSV numa barra), do horário (a régua das 24 h), do completar,
// da pernoita, do pagamento e dos outros serviços — o corpo do Detalhe (screens/DutyDetailScreen.js · DutyDetailBody). Na
// folha, deslizar para o lado muda de dia.
// A escala vem do calendário (criar à mão morreu 2026-07-10); o Detalhe só lê a escala e completa os factos que a lei precisa.
export default function EscalaScreen({ navigation, route }) {
  const { lang, duties, dayLog, user, company, ae: aeNow, aeAt, homeBaseAt, crewAt, postFlightMin, rosterChanges, checkRosterChanges, liveSync, notify,
    calendarId, setCalendarId, calendarName, setCalendarName, addAeEvents, aeEvents, removeAeEvent, hotels, rosterLog, isPilot,
    companyAt, cabinGapMin, splitAdminMin } = useContext(AppContext);
  // O aviso de SNC corre DEPOIS de a importação gravar o arquivo: lê-se sempre a versão mais recente (não a do render).
  const sncSrc = useRef({ log: [], events: [] });
  sncSrc.current = { log: rosterLog || [], events: aeEvents || [] };
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Mês visível (1.º dia). Default = mês de hoje.
  const [monthDate, setMonthDate] = useState(() => { const t0 = new Date(); return new Date(t0.getFullYear(), t0.getMonth(), 1); });
  // O DIA ABERTO: null = o mês inteiro (a aba abre sempre assim); com um dia, o mês encolhe para a semana dele.
  const [selIso, setSelIso] = useState(null);
  const [svcIdx, setSvcIdx] = useState(0);          // o serviço do dia a que o "Ver tudo" se refere (0 = o registo principal)
  const [filterKey, setFilterKey] = useState(null); // L2 · a pílula da legenda que está a filtrar
  const [hotelOpen, setHotelOpen] = useState(false);
  const [hotelStation, setHotelStation] = useState(null);
  // Largura da grelha DETERMINÍSTICA à nascença (ecrã − gutters) → a grelha nasce inteira no 1.º frame
  // (user 2026-07-16). O onLayout só corrige casos raros (split-screen, rotação).
  const [gridW, setGridW] = useState(() => Dimensions.get('window').width - GUTTER * 2);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);   // A1 · o ano em meses (toque em "Novembro 2026 ▾")
  const reduceMotion = useReduceMotion();
  const dayX = useRef(new Animated.Value(0)).current;   // o dia a deslizar para o lado (o seguinte entra do outro)
  const dimRef = useRef({});                            // iso → Animated.Value (1 aceso · 0,22 esbatido): a legenda que filtra
  // A FOLHA DO DIA: o deslize vertical (0 = em cima, logo por baixo da semana; a altura dela = fora de vista, em baixo).
  const winH = Dimensions.get('window').height;
  const sheetHRef = useRef(0);                          // a altura da folha (medida); antes da 1.ª medida, 70 % do ecrã
  const sheetOff = () => sheetHRef.current || Math.round(winH * 0.7);
  const sheetY = useRef(new Animated.Value(winH)).current;
  const closingRef = useRef(false);
  const reduceRef = useRef(reduceMotion); reduceRef.current = reduceMotion;
  const [pickYear, setPickYear] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);       // hub de importar (calendário | PDF)
  const [importSource, setImportSource] = useState('calendar');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [flashIso, setFlashIso] = useState(null);       // realce breve do dia após guardar
  const scrollRef = useRef(null);
  const selRef = useRef(null); selRef.current = selIso;
  // O ouvinte da aba e o gesto não veem o estado novo: chamam a versão mais recente por estas refs.
  const closeDayRef = useRef(null), openDayRef = useRef(null), stepDayRef = useRef(null);
  // Re-tocar na aba Escala: com um dia aberto, volta ao mês; com o mês, sobe ao topo.
  useEffect(() => navigation.addListener('tabPress', () => {
    if (!navigation.isFocused()) return;
    if (selRef.current) { closeDayRef.current?.(); return; }
    scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
  }), [navigation, reduceMotion]);

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
      openDayRef.current?.(String(fd));
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
  // Ao mudar de mês: o dia aberto só fica se for desse mês (o deslizar entre dias passa de mês); a legenda volta a mostrar tudo.
  useEffect(() => {
    if (selRef.current && !selRef.current.startsWith(ym)) setSelIso(null);
    setFilterKey(null); Object.values(dimRef.current).forEach((v) => v.setValue(1));
    if (!selRef.current) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [ym]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthName = monthDate.toLocaleDateString(locale, { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const monthLabel = `${monthCap} ${y}`;

  const monthDutyDays = Object.keys(duties).filter((iso) => iso.startsWith(ym) && duties[iso] && !duties[iso].deleted).sort();

  // Mudar de mês (o deslizar para o lado e o ano em meses). dir: +1 próximo · -1 anterior.
  const changeMonth = (dir) => { select(); setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1)); };
  // "Hoje" (noutro mês): o mês de hoje, com hoje aberto.
  const goToday = () => { select(); const t0 = new Date(); setMonthDate(new Date(t0.getFullYear(), t0.getMonth(), 1)); openDayRef.current?.(today); };
  // Arrastar ← / → em cima da GRELHA muda de mês; dentro da janela do dia muda de dia (cada gesto faz uma só coisa).
  const changeMonthRef = useRef(changeMonth); changeMonthRef.current = changeMonth;
  const swipeDir = (g) => ((Math.abs(g.dx) > 30 || Math.abs(g.vx) > 0.25) ? (g.dx < 0 ? 1 : -1) : 0);
  const monthPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderRelease: (_, g) => { const dir = swipeDir(g); if (dir) changeMonthRef.current(dir); },
  })).current;
  const dayPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => { const dir = swipeDir(g); if (dir) stepDayRef.current?.(dir); },
  })).current;
  // Na SEMANA (com um dia aberto), deslizar para o lado muda de semana: o mesmo dia da semana, 7 dias depois ou antes.
  const weekPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderRelease: (_, g) => { const dir = swipeDir(g); if (dir) stepDayRef.current?.(dir, 7); },
  })).current;
  // Puxar a folha para baixo (pela pega ou pelo cabeçalho): segue o dedo; largada abaixo de 90 pt, ou depressa, desce e fecha;
  // senão volta ao sítio.
  const backUp = () => { if (reduceRef.current) { sheetY.setValue(0); return; } Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start(); };
  const sheetPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
    onPanResponderMove: (_, g) => sheetY.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => { if (g.dy > 90 || g.vy > 0.8) closeDayRef.current?.(); else backUp(); },
    onPanResponderTerminate: () => backUp(),
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
  const pdM = (ae && catYm) ? monthlyAe(duties, catYm, crewAt(ym).contract || '12/12', ae, { ym, index: aeIndex(ae, ym), fleet: crewAt(ym).fleet, baseAt: homeBaseAt }) : null;
  const perDiemTotal = pdM ? pdM.perDiem : null;
  const nightCount = awayNights(duties, ym, { throughGround: !!(ae && ae.NIGHTS_ANY_DUTY) }).length;
  const monthHasAbs = Object.keys(dayAbs).some((iso) => iso.startsWith(ym));

  const kindLabel = (kind) => (kind === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang));
  const cityOf = (code) => { const c = baseCityName(code, null, lang); return c && c !== code ? c : null; };
  const WD = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayDateLbl = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso; const sx = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }); return sx.charAt(0).toUpperCase() + sx.slice(1); };

  // ── O MÊS (desenho A de design/escala-mes.html: o número limpo e a etiqueta; o que cada célula mostra decide-o
  // data/escalaDay.js · monthCells, golden test:escala) ──
  const absTypes = {}; Object.keys(dayAbs).forEach((iso) => { absTypes[iso] = dayAbs[iso].type; });
  const G = monthCells({ ym, duties, absences: absTypes, base: homeBaseAt, today, sel: selIso, lang });
  // A largura do dia arredonda PARA BAIXO ao píxel do ecrã: (largura − 6 espaços) / 7 sem arredondar dá, em vírgula flutuante,
  // uma linha uma ponta mais larga do que a grelha em vários iPhones (375, 402, 430 pt) e o domingo saltava para a linha de
  // baixo — a coluna "D" ficava vazia (visto no iPhone pelo Nuno, 2026-11-13). Sobra no máximo um píxel por dia.
  const PR = PixelRatio.get();
  const cellW = gridW ? Math.floor(((gridW - GAP * 6) / 7) * PR) / PR : 0;

  // ── O DIA ABERTO (na janela) ──
  // Os serviços do dia pela posição no registo (0 = o principal, n = o extra n — a mesma conta do Detalhe).
  const svcsAt = (iso) => { const d = duties[iso]; return valid(d) ? [d, ...(Array.isArray(d.extra) ? d.extra : [])] : []; };
  // O serviço principal (o voo manda, como na célula e na Lista) — para o nome da célula.
  const mainIdxOf = (iso) => { const sv = svcsAt(iso); const i = sv.findIndex((x) => x && (x.kind || 'flight') === 'flight'); return i >= 0 ? i : (sv.length ? 0 : -1); };
  // O serviço que abre na janela: o único do dia; com vários, nenhum — toca-se no que se quer (pedido do Nuno).
  const openIdxOf = (iso) => { const sv = svcsAt(iso); const idx = sv.map((x, i) => (x ? i : -1)).filter((i) => i >= 0); return idx.length === 1 ? idx[0] : -1; };
  const layoutAnim = () => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)); };
  const resetDim = () => Object.values(dimRef.current).forEach((v) => v.setValue(1));
  // Abrir um dia: a folha, com o único serviço já aberto (com vários, nenhum — toca-se no que se quer). Vinda do mês inteiro,
  // a folha parte de baixo (fora de vista) e sobe no efeito de baixo; com um dia já aberto, só troca o dia.
  const openDayAt = (iso) => {
    if (!selRef.current) { closingRef.current = false; sheetY.stopAnimation(); sheetY.setValue(reduceMotion ? 0 : sheetOff()); }
    else if (closingRef.current) { closingRef.current = false; sheetY.stopAnimation(); backUp(); }   // tocada a meio da descida
    setSelIso(iso); setSvcIdx(openIdxOf(iso));
  };
  const isOpen = !!selIso;
  useEffect(() => {
    if (!isOpen) return;
    if (reduceMotion) { sheetY.setValue(0); return; }
    Animated.timing(sheetY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  // Fechar: a folha desce (300 ms) e o mês volta inteiro; reduzido = fecha logo.
  const closeDay = () => {
    if (!selRef.current || closingRef.current) return;
    select();
    if (reduceMotion) { setSelIso(null); return; }
    closingRef.current = true;
    Animated.timing(sheetY, { toValue: sheetOff(), duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      if (!closingRef.current) return;   // reaberta a meio
      closingRef.current = false; setSelIso(null);
    });
  };
  // Tocar num dia: abre-o; tocar no dia aberto (na semana) fecha a folha.
  const pickDay = (iso) => { if (iso === selRef.current) { closeDay(); return; } select(); openDayAt(iso); };
  // Tocar num serviço: abre por baixo dele tudo o que é dele; tocar no aberto fecha-o.
  const pickSvc = (idx) => { select(); layoutAnim(); setSvcIdx((cur) => (cur === idx ? -1 : idx)); };
  // Deslizar no dia: o seguinte ou o anterior (as folgas também; passa de mês na ponta). Sai para um lado e entra do outro.
  // n = 7: a semana seguinte ou anterior (deslizar na semana).
  const stepDay = (dir, n = 1) => {
    const cur = selRef.current; if (!cur) return;
    const dt = new Date(`${cur}T12:00:00`); dt.setDate(dt.getDate() + dir * n);
    const nx = isoOf(dt);
    select();
    const go = () => { if (!nx.startsWith(ym)) setMonthDate(new Date(dt.getFullYear(), dt.getMonth(), 1)); openDayAt(nx); };
    if (reduceMotion) { go(); return; }
    Animated.timing(dayX, { toValue: -dir * 40, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      go(); dayX.setValue(dir * 40);
      Animated.timing(dayX, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };
  closeDayRef.current = closeDay; openDayRef.current = openDayAt; stepDayRef.current = stepDay;

  // ── L2 · a legenda que filtra (design/escala-mes.html): só as pílulas do que há neste mês; tocar numa acende esses dias e
  // esbate os outros (180 ms; reduzido = salta); outra vez repõe ──
  const legend = monthLegend(G.cells, lang);
  const dimOf = (iso) => (dimRef.current[iso] || (dimRef.current[iso] = new Animated.Value(1)));
  const pickFilter = (key) => {
    select();
    const next = filterKey === key ? null : key;
    setFilterKey(next);
    const anims = G.cells.map((c) => {
      const to = !next || cellMatches(c, next) ? 1 : 0.22;
      const v = dimOf(c.iso);
      if (reduceMotion) { v.setValue(to); return null; }
      return Animated.timing(v, { toValue: to, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    }).filter(Boolean);
    if (anims.length) Animated.parallel(anims).start();
  };

  // Uma célula (Q1): o quadrado neutro com o número e o destino; a cor do tipo só na fita de baixo. Dois serviços = a fita
  // em duas (o outro serviço à esquerda, um terço; o principal à direita); a rotação junta as fitas por cima do espaço entre
  // os dias; férias e baixa a tracejado; feito = fita cinzenta e número cinzento. Hoje = o quadrado a tinta.
  const typeBg = (k) => (k === 'voo' ? C.flight : k === 'terra' ? C.ground : null);
  const renderCell = (c) => {
    const svcs = svcsAt(c.iso).filter(Boolean);
    const mi = mainIdxOf(c.iso), main = mi >= 0 ? svcsAt(c.iso)[mi] : null;
    const abs = !svcs.length ? dayAbs[c.iso] : null;
    const isAbs = c.kind === 'fer' || c.kind === 'doe';
    const has = !!c.kind;
    const stripColor = !has || isAbs ? null : c.past ? C.round : typeBg(c.kind);
    const twoColor = has && !isAbs && c.two && !c.past ? typeBg(c.twoKind) : null;
    const fg = c.today ? C.sheet : C.ink;
    const a11y = [
      `${c.day} ${monthName}`,
      c.today ? l('hoje', 'today') : null,
      c.past ? l('feito', 'done') : null,
      main ? `${svcs.length > 1 ? `${svcs.length} ${l('serviços', 'duties')}: ` : ''}${kindLabel(main.kind || 'flight')}${(main.kind || 'flight') === 'flight' && main.route ? ` ${main.route}` : ''}` : abs ? extraLabel(abs.type) : l('sem serviço', 'no duty'),
      c.ns ? l('pernoita', 'night stop') : null,
      c.joinR ? l('continua no dia seguinte', 'continues the next day') : null,
      c.dirty ? l('por sincronizar', 'pending sync') : null,
    ].filter(Boolean).join(' · ');
    return (
      <Animated.View key={c.iso} style={{ width: cellW, opacity: dimOf(c.iso) }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => pickDay(c.iso)}
          style={[s.cell, has ? { backgroundColor: C.neutral } : null, c.today ? { backgroundColor: C.ink } : null, c.joinR ? s.cellJR : null, c.joinL ? s.cellJL : null]}
          accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: c.sel }}
          accessibilityHint={c.sel ? l('Volta ao mês', 'Back to the month') : l('Abre o dia', 'Opens the day')}>
          <Text style={[TXT3.lineVal, s.numTxt, { color: c.today ? C.sheet : c.past ? C.tabSub : C.ink }]} allowFontScaling={false}>{c.day}</Text>
          {c.code ? (
            <View style={s.code}>
              <Text style={[TXT.tag, { color: c.today ? C.sheet : C.soft }]} numberOfLines={1} allowFontScaling={false}>{c.code}</Text>
              {c.ns ? <Icon name="moon" size={9} color={c.today ? C.sheet : C.soft} /> : null}
            </View>
          ) : <View />}
          <View style={s.strip}>
            {isAbs ? Array.from({ length: DASHES }).map((_, i) => <View key={i} style={[s.dash, { backgroundColor: CARD.rule }]} />) : null}
            {twoColor ? <View style={[s.stripTwo, { backgroundColor: twoColor }]} /> : null}
            {stripColor ? <View style={[s.flex, { backgroundColor: stripColor }]} /> : null}
          </View>
          {c.dirty ? <View style={[s.pend, { backgroundColor: C.alert, borderColor: C.sheet }]} pointerEvents="none" /> : null}
          {c.sel && !c.today ? <View style={[s.selRing, { borderColor: C.ink }, c.joinR ? s.cellJR : null, c.joinL ? s.cellJL : null]} pointerEvents="none" /> : null}
        </TouchableOpacity>
        {/* a rotação: a fita continua por cima do espaço até ao dia seguinte */}
        {c.joinR && stripColor ? <View style={[s.stripJoin, { backgroundColor: stripColor }]} pointerEvents="none" /> : null}
      </Animated.View>
    );
  };
  // A SEMANA do dia aberto (em cima, com a folha por baixo): os sete dias da linha dele, com as mesmas células.
  const renderWeek = () => {
    const sel = G.cells.find((c) => c.sel);
    if (!sel) return null;
    const row = G.cells.filter((c) => c.row === sel.row);
    return (
      <View {...weekPan.panHandlers}>
        <View style={s.wkhead}>{WD.map((w, i) => <Text key={i} style={[TXT.tag, s.wkh, { width: cellW, color: C.tabSub }]} allowFontScaling={false}>{w}</Text>)}</View>
        <View style={s.cal} onLayout={(e) => { const w = e.nativeEvent.layout.width; setGridW((p) => (Math.abs(w - p) > 0.5 ? w : p)); }}>
          {sel.row === 0 ? Array.from({ length: G.firstWeekday }).map((_, i) => <View key={`lead${i}`} style={[s.cellBlank, { width: cellW }]} />) : null}
          {cellW ? row.map(renderCell) : null}
        </View>
      </View>
    );
  };

  const rcCounts = rosterChanges?.counts;
  const lsCount = liveSync ? Object.keys(liveSync).length : 0;

  // ── O que as linhas abrem (ctx = o dia: { iso, nsSt, nsHotel }) ──
  const onCardOpen = (o, ctx = {}) => {
    if (!o) return;
    if (o.to !== 'detail') select();
    const iso = ctx.iso;
    if (o.to === 'detail') { pickSvc(o.idx || 0); return; }   // o serviço abre por baixo dele (a fila de ícones e o painel)
    else if (o.to === 'hotel') { if (ctx.nsHotel) Linking.openURL(hotelMapsUrl(ctx.nsHotel.name, ctx.nsSt, Platform.OS)).catch(() => {}); else { setHotelStation(ctx.nsSt); setHotelOpen(true); } }
    else if (o.to === 'hotelEdit') { setHotelStation(ctx.nsSt); setHotelOpen(true); }
    else if (o.to === 'sync') { if (calendarId) onSync(); else connectCalendar(); }
    else if (o.to === 'importCal') openImport('calendar');
    else if (o.to === 'pdf') openImport('paste');
    else if (o.to === 'rmAbs') removeAeEvent(o.id);
    else if (o.to === 'rmAbsAsk') Alert.alert(l('Apagar extra', 'Delete extra'), l('Apagar este dia dos extras do mês?', 'Remove this day from the month extras?'), [{ text: l('Cancelar', 'Cancel'), style: 'cancel' }, { text: l('Apagar', 'Delete'), style: 'destructive', onPress: () => removeAeEvent(o.id) }]);
  };
  const cardsOf = (list, ctx) => <HomeCards cards={list} C={C} onOpen={(o) => onCardOpen(o, ctx)} l={l} />;

  // ── O TOPO: o do Início ("11 serviços" em duas linhas e os factos ao lado do fio) ──
  const { width: winW } = Dimensions.get('window');
  const plural = (n, one, many) => `${n === 1 ? one : many}`;
  const top = {
    pill: null,
    pill2: { text: monthLabel, iso: 'month', chevron: true, hint: l('Escolher o mês', 'Choose the month') },
    what: l(`A tua escala de ${monthName}`, `Your ${monthCap} roster`),
    giant: { l1: String(serviceCount), l2: plural(serviceCount, l('serviço', 'duty'), l('serviços', 'duties')), l2Grey: true },
    facts: [
      { v: String(nightCount), l: plural(nightCount, l('pernoita', 'night stop'), l('pernoitas', 'night stops')) },
      perDiemTotal != null ? { v: fmtEur(perDiemTotal), l: l('per diem · estimado', 'per diem · estimated') } : null,
    ].filter(Boolean),
  };
  const giant = fitGiant(top, winW - SPACE.lgPlus * 2);
  // A pílula do mês nunca pode sair (é a maneira de mudar de mês): se a fila não couber, sai o "Hoje" (o mês atual fica no ano em meses).
  const baseRowW = pillWidth(monthLabel) + 12 + SPACE.sm + SPACE.sm + 44;
  const showHoje = !isCurrentMonth && baseRowW + pillWidth(l('Hoje', 'Today')) + SPACE.sm <= winW - SPACE.lgPlus * 2;
  const hojeW = showHoje ? pillWidth(l('Hoje', 'Today')) + SPACE.sm : 0;
  const topRight = (
    <View style={s.topRight}>
      {showHoje ? (
        <TouchableOpacity style={[s.hoje, { borderColor: C.ink }]} onPress={goToday} activeOpacity={0.7} hitSlop={4} accessibilityRole="button" accessibilityLabel={l('Voltar a hoje', 'Back to today')}>
          <Text style={[TXT3.pill, { color: C.ink }]} allowFontScaling={false}>{l('Hoje', 'Today')}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={[s.round, { backgroundColor: C.round }]} onPress={openHub} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={calendarId ? l('Calendário e sincronizar', 'Calendar and sync') : l('Importar escala', 'Import roster')}>
        <Icon name={calendarId ? 'sync' : 'download'} size={20} color={C.ink} />
        {(rcCounts?.total || lsCount) ? <View style={[s.hdrDot, { backgroundColor: C.alert, borderColor: C.desk }]} /> : null}
      </TouchableOpacity>
    </View>
  );
  const topRightW = 44 + hojeW;

  // ── O SERVIÇO ABERTO: a linha tocada cresce para o cartão de cor com a perna e, por baixo, TUDO o que é dele — o corpo do
  // Detalhe no 3.0 (design/detalhe-3.html, B; screens/DutyDetailScreen.js · DutyDetailBody). Tocar no cartão de cor fecha-o. ──
  const renderSvcOpen = (iso, idx) => (
    <DutyDetailBody date={iso} idx={idx} navigation={navigation} onCollapse={() => pickSvc(idx)} onDeleted={() => setSelIso(null)} onOpenService={(i) => { layoutAnim(); setSvcIdx(i); }} />
  );
  // ── O DIA (na janela): uma linha por serviço (pela hora; a pernoita vai na linha do voo e no Hotel); o serviço aberto leva por
  // baixo tudo o que é dele. Sem serviço: a folga ou a ausência. ──
  const dayTitleOf = (iso) => {
    const dt = new Date(`${iso}T00:00:00`);
    const tx = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    return tx.charAt(0).toUpperCase() + tx.slice(1);
  };
  const renderDay = (iso) => {
    const services = svcsAt(iso);
    const abs = dayAbs[iso];
    const nSvc = services.filter(Boolean).length;
    let body;
    if (!nSvc) {
      const absEur = abs ? extraEur(abs.type, crewAt(iso).category, iso) : null;
      body = (
        <>
          {abs
            ? cardsOf([{ t: 'lines', id: 'abs', color: 'neutral', kind: extraLabel(abs.type), rows: absEur != null ? [{ k: l('Paga neste dia', 'Pays on this day'), v: fmtEur(absEur) }] : [],
                note: l('Marcado nos extras do mês.', 'Marked in the month’s extras.'), link: { label: l('Apagar dos extras', 'Remove from extras'), open: { to: 'rmAbsAsk', id: abs.id } } }], { iso })
            : cardsOf([{ t: 'slim', id: 'off', color: 'neutral', title: l('Folga', 'Day off'), sub: l('Sem serviço neste dia.', 'No duty on this day.') }], { iso })}
          <Text style={[TXT.caption, s.swHint, { color: C.tabSub }]}>{l('Desliza para o lado para ver o dia seguinte.', 'Swipe sideways to see the next day.')}</Text>
        </>
      );
    } else {
      const duty = duties[iso];
      const ordered = orderServices(duty);
      const aeD = aeAt(iso), catD = crewAt(iso).category;
      // € de cada serviço: a MESMA função e o MESMO índice do total do mês (serviceMoney; auditoria L2, L5 e L10, bloco 6).
      const money = services.map((sv) => {
        const mo = (aeD && catD && sv) ? serviceMoney(aeD, catD, sv, { date: iso, fleet: crewAt(iso).fleet, daySvcs: services, baseAt: homeBaseAt, duties }) : null;
        if (!mo) return null;
        return { total: (mo.perDiem || 0) + (mo.other && mo.other.eur != null ? mo.other.eur : 0) + (mo.positioning || 0), nightStop: mo.nightStop || 0 };
      });
      const nsSvc = services.find((sv) => sv && sv.nightStop);
      const nsSt = nsSvc ? nightStopStation(nsSvc, homeBaseAt(iso)) : null;
      const nsHotel = nsSt ? (hotels || {})[nsSt] : null;
      const ctx = { iso, nsSt, nsHotel };
      const nsName = nsSt ? (cityOf(nsSt) || nsSt) : null;
      // As linhas do dia (o desenho fechado de dayCards), sem a linha da pernoita: ela vai na linha do voo que pernoita.
      const lines = dayCards({ iso, ordered, open: false, money, kindLabel, cityOf, nightStop: null, postFlightMin: postFlightMin || 0, lang, locale, fmtEur })
        .map((c) => { const i = Number(String(c.id).replace('svc', '')); const sv = services[i]; return { c, i, sv }; });
      body = (
        <>
          {/* Havia uma AUSÊNCIA marcada neste dia, mas afinal há serviço → não é "efetivamente gozada" (BTE). */}
          {abs ? cardsOf([{ t: 'lines', id: 'absWarn', color: 'alert', kind: abs.type === 'vacDays' ? l('Tinhas férias marcadas', 'You had leave marked') : l('Tinhas doença marcada', 'You had sick leave marked'), rows: [],
            note: abs.type === 'vacDays'
              ? l('Como voaste, este dia não é férias gozadas e o suplemento não paga aqui. Marca as férias noutro dia para o receberes.', 'Since you flew, this isn’t taken leave — the supplement isn’t paid here. Re-mark the leave on another day to get it.')
              : l('Como voaste, este dia não conta como doença.', 'Since you flew, this day doesn’t count as sick leave.'),
            link: { label: l('Remover deste dia', 'Remove from this day'), open: { to: 'rmAbs', id: abs.id } } }], ctx) : null}
          {lines.map(({ c, i, sv }) => (
            <View key={c.id} style={s.svcBlock}>
              {i === svcIdx ? renderSvcOpen(iso, i)
                : cardsOf([(sv && sv.nightStop && nsName) ? { ...c, sub: [c.sub, l(`pernoita em ${nsName}`, `night stop in ${nsName}`)].filter(Boolean).join(' · ') } : c], ctx)}
            </View>
          ))}
          {/* Extras PAGOS neste dia trabalhado (SNC/RDP) — compensações por cima do serviço. */}
          {dayOv[iso] ? cardsOf(dayOv[iso].map((e) => { const v = extraEur(e.type, catD, iso); return { t: 'slim', id: `ov${e.id}`, color: 'neutral', title: extraLabel(e.type), sub: l('compensação deste dia', 'this day’s compensation'), value: v != null ? `+${fmtEur(v)}` : null, gain: v != null }; }), ctx) : null}
        </>
      );
    }
    return (
      <Animated.View {...dayPan.panHandlers} style={[s.day, { transform: [{ translateX: dayX }], opacity: dayX.interpolate({ inputRange: [-40, 0, 40], outputRange: [0, 1, 0] }) }]}>
        {body}
      </Animated.View>
    );
  };
  // O cabeçalho da janela: o dia (e "hoje" · quantos serviços) à esquerda; à direita ‹ › (para quem não descobre o deslizar, e
  // para o VoiceOver) e ✕ (§10: o fecho à direita).
  const renderDayHead = (iso) => {
    const nSvc = svcsAt(iso).filter(Boolean).length, abs = dayAbs[iso];
    const sub = [iso === today ? l('hoje', 'today') : null, nSvc ? `${nSvc} ${plural(nSvc, l('serviço', 'duty'), l('serviços', 'duties'))}` : abs ? extraLabel(abs.type) : l('sem serviços', 'no duties')].filter(Boolean).join(' · ');
    return (
      <View style={s.dsHead}>
        <View style={[s.flex, s.dsTitle]}>
          <Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} accessibilityRole="header">{dayTitleOf(iso)}</Text>
          <Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1}>{sub}</Text>
        </View>
        <IconButton icon="back" onPress={() => stepDay(-1)} label={l('Dia anterior', 'Previous day')} style={{ backgroundColor: C.round }} />
        <IconButton icon="back" rot={180} onPress={() => stepDay(1)} label={l('Dia seguinte', 'Next day')} style={{ backgroundColor: C.round }} />
        <IconButton icon="close" onPress={closeDay} label={l('Voltar ao mês', 'Back to the month')} style={{ backgroundColor: C.round }} />
      </View>
    );
  };
  // As pílulas da legenda (L2): a amostra de cada uma é a etiqueta da célula em pequeno.
  const legSwatch = (key) => {
    const abs = key === 'fer' || key === 'doe';
    return (
      <View style={[s.legSw, { backgroundColor: key === 'terra' ? C.ground : abs ? C.sheet : C.flight }, abs ? [s.legSwAbs, { borderColor: CARD.rule }] : null]}>
        {key === 'ns' ? <Icon name="moon" size={9} color={CARD.onCard} /> : null}
        {key === 'two' ? <View style={[s.legSwEdge, { backgroundColor: C.ground }]} /> : null}
        {key === 'dirty' ? <View style={[s.legSwDot, { backgroundColor: C.alert }]} /> : null}
      </View>
    );
  };
  const renderLegend = () => (legend.length ? (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsWrap} contentContainerStyle={s.chips}>
        {legend.map((it) => {
          const on = filterKey === it.key;
          return (
            <TouchableOpacity key={it.key} onPress={() => pickFilter(it.key)} activeOpacity={0.8} style={[s.chip, { backgroundColor: on ? C.sheet : C.neutral, borderColor: on ? C.ink : C.neutral }]}
              accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.label}
              accessibilityHint={on ? l('Mostra todos os dias', 'Shows every day') : l('Destaca estes dias no mês', 'Highlights these days in the month')}>
              {legSwatch(it.key)}
              <Text style={[TXT.label, { color: C.ink }]} allowFontScaling={false}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={[TXT.caption, s.chipsHint, { color: C.tabSub }]}>{filterKey ? l('Toca outra vez para ver todos os dias.', 'Tap again to see every day.') : l('Toca numa cor para ver esses dias.', 'Tap a colour to see those days.')}</Text>
    </>
  ) : null);
  // B4 · um mês sem escala nenhuma: o estado vazio, com a ação principal (debaixo da grelha).
  const renderEmpty = () => (
    <>
      <View style={[s.empty, { borderColor: C.round }]}>
        <Text style={[TXT3.slimTitle, { color: C.ink }]}>{l(`Sem serviços em ${monthName}`, `No duties in ${monthCap}`)}</Text>
        <Text style={[TXT3.text, { color: C.soft }]}>{l('Quando a companhia publicar a escala no calendário, os serviços aparecem aqui.', 'When your airline publishes the roster to the calendar, your duties appear here.')}</Text>
      </View>
      {cardsOf([
        { t: 'slim', id: 'sync', dark: true, title: calendarId ? l('Ler a escala agora', 'Read the roster now') : l('Ligar o calendário', 'Connect the calendar'), sub: calendarId ? l('ou puxa o ecrã para baixo', 'or pull the screen down') : l('só leitura · nada é alterado', 'read-only · nothing is changed'), open: { to: 'sync' } },
        { t: 'slim', id: 'pdf', color: 'neutral', title: l('Importar o PDF', 'Import the PDF'), sub: l('se a escala chegou por e-mail', 'if the roster came by e-mail'), open: { to: 'pdf' } },
      ])}
    </>
  );
  // O mês, sempre inteiro (deslizar para o lado EM CIMA DA GRELHA muda de mês), e a legenda que filtra.
  const renderMonth = () => (
    <View>
      <View {...monthPan.panHandlers}>
      <View style={s.wkhead}>{WD.map((w, i) => <Text key={i} style={[TXT.tag, s.wkh, { width: cellW, color: C.tabSub }]} allowFontScaling={false}>{w}</Text>)}</View>
      <View style={s.cal} onLayout={(e) => { const w = e.nativeEvent.layout.width; setGridW((p) => (Math.abs(w - p) > 0.5 ? w : p)); }}>
        {cellW ? (
          <>
            {Array.from({ length: G.firstWeekday }).map((_, i) => <View key={`lead${i}`} style={[s.cellBlank, { width: cellW }]} />)}
            {G.cells.map(renderCell)}
          </>
        ) : null}
      </View>
      </View>
      {renderLegend()}
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']} onTouchStart={gridTip ? dismissGridTip : undefined}>
      <View style={s.body}>
        {!anyDuty ? (
          /* ── Arranque — sem escala nenhuma: o estado vazio e as formas de importar ── */
          <>
            <View style={s.hdr}>
              <Text style={[TXT3.kind, s.hdrTxt, { color: C.tabSub }]} numberOfLines={1}>{`${l('A tua escala', 'Your roster')}${calendarId && calendarName ? ` · ${calendarName}` : ''}`}</Text>
              <TouchableOpacity style={[s.round, { backgroundColor: C.round }]} onPress={openHub} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={calendarId ? l('Calendário e sincronizar', 'Calendar and sync') : l('Importar escala', 'Import roster')}>
                <Icon name={calendarId ? 'sync' : 'download'} size={20} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.flex} contentContainerStyle={[s.startPad, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
              <Text style={[TXT3.month, { color: C.ink }]}>{l('Serviços', 'Duties')}</Text>
              <Text style={[TXT3.what, { color: C.soft }]}>{l('Ainda não tens escala. Liga o calendário do telemóvel (ou importa por PDF) e mostramos os teus serviços aqui.', "You have no roster yet. Connect your phone calendar (or import a PDF) and we'll show your duties here.")}</Text>
              <View style={[s.empty, { borderColor: C.round }]}>
                <Text style={[TXT3.slimTitle, { color: C.ink }]}>{calendarId ? l('Calendário ligado', 'Calendar connected') : l('Liga o teu calendário', 'Connect your calendar')}</Text>
                <Text style={[TXT3.text, { color: C.soft }]}>{calendarId
                  ? l('Sem serviços lidos do calendário. Tenta importar de novo (podes mudar o intervalo) ou usa o PDF.', 'No duties read from the calendar. Try importing again (you can change the range) or use a PDF.')
                  : l('Importamos os teus serviços do calendário do telemóvel, assim que mudam. Tu só confirmas.', 'We import your duties from the phone calendar whenever they change. You just confirm.')}</Text>
                <View style={s.privRow}><Icon name="lock" size={13} color={CARD.gain} /><Text style={[TXT.caption, s.privTxt, { color: CARD.gain }]}>{l('Só de leitura · nada é alterado no teu calendário', 'Read-only · nothing is changed in your calendar')}</Text></View>
                {!calendarId ? <Text style={[TXT3.cardSub, { color: C.soft }]}>{l('Melhor com um calendário só para a escala (o feed do eCrew) — aniversários e eventos pessoais ficam de fora.', 'Best with a calendar just for your roster (the eCrew feed) — birthdays and personal events stay out.')}</Text> : null}
              </View>
              {cardsOf([
                { t: 'slim', id: 'go', dark: true, title: calendarId ? l('Importar agora', 'Import now') : l('Ligar ao calendário', 'Connect calendar'), sub: calendarId ? l('lê o calendário ligado', 'reads the connected calendar') : l('o iPhone pergunta uma vez', 'your iPhone asks once'), open: { to: calendarId ? 'importCal' : 'sync' } },
                { t: 'slim', id: 'pdf', color: 'neutral', title: l('Importar o PDF', 'Import the PDF'), sub: l('se a escala chegou por e-mail', 'if the roster came by e-mail'), open: { to: 'pdf' } },
              ])}
            </ScrollView>
          </>
        ) : (
          <>
            {/* O topo do Início: "Novembro 2026 ▾" abre o ano em meses; à direita, ler a escala. Com um dia aberto, só a fila. */}
            <HomeTop top={top} C={C} size={giant.size} compact={isOpen} onPill2={() => { select(); setPickYear(y); setMonthPickerOpen(true); }} right={topRight} rightW={topRightW} l={l} />
            {/* A FOLHA: o mês (Q1); tocar num dia deixa só a semana dele, em cima, e a folha do dia sobe por baixo. */}
            <View style={[s.sheet, { backgroundColor: C.sheet }]}>
              {isOpen ? (
                <>
                  <View style={s.weekWrap}>{renderWeek()}</View>
                  <Animated.View style={[s.daySheet, { backgroundColor: C.sheet, transform: [{ translateY: sheetY }] }]}
                    onLayout={(e) => { sheetHRef.current = Math.round(e.nativeEvent.layout.height); }}>
                    <View {...sheetPan.panHandlers}>
                      <TouchableOpacity style={s.dsGrab} onPress={closeDay} activeOpacity={0.6} hitSlop={{ top: SPACE.sm, bottom: SPACE.xs }}
                        accessibilityRole="button" accessibilityLabel={l('Voltar ao mês', 'Back to the month')}>
                        <View style={[s.dsGrabBar, { backgroundColor: C.round }]} />
                      </TouchableOpacity>
                      {renderDayHead(selIso)}
                    </View>
                    <ScrollView style={s.flex} contentContainerStyle={[s.dsBody, { paddingBottom: tabSpace + SPACE.xxxl }]} showsVerticalScrollIndicator={false}>
                      {renderDay(selIso)}
                    </ScrollView>
                  </Animated.View>
                </>
              ) : (
              <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={[s.list, { paddingBottom: tabSpace + SPACE.lg }]} showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.caption} colors={[C.caption]}
                    onRefresh={async () => {
                      setRefreshing(true); const t0 = Date.now();
                      try { await checkRosterChanges?.(); } catch { /* ignora */ }
                      const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                      setRefreshing(false);
                    }} />}>
                {renderMonth()}
                {(!monthDutyDays.length && !monthHasAbs) ? renderEmpty() : null}
                <Text style={[TXT.caption, s.foot, { color: C.tabSub }]}>{t('duties.syncHint', lang)}</Text>
              </ScrollView>
              )}
            </View>
          </>
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
              l(`${cand.total === 1 ? '1 serviço mudou' : `${cand.total} serviços mudaram`} 2 h ou mais nas 48 h antes (${isPilot ? 'Art. 65.º' : 'Cl. 66.ª'}). Não é devido se foste chamado de assistência, nem se a alteração veio, nas 12 h seguintes, de um aeroporto inoperacional ou de uma greve de uma agência externa ou de um subcontratante (${isPilot ? 'n.os 4 e 5' : 'n.os 3 e 4'}). Registar ${cand.total === 1 ? 'o SNC' : 'os SNC'} nos Extras do mês (um por serviço)? Se caiu num dia de folga publicada, marca DDO/WFLY/IDO no próprio serviço.`,
                `${cand.total} dut${cand.total === 1 ? 'y' : 'ies'} moved 2 h or more within 48 h (${isPilot ? 'Art. 65' : 'Cl. 66'}). Not due if you were called from standby, or if the change came, within 12 h, from an inoperative airport or a strike by an external agency or subcontractor (${isPilot ? 'nos. 4 and 5' : 'nos. 3 and 4'}). Log the SNC in the month's extras (one per duty)? If it fell on a published day off, mark DDO/WFLY/IDO on the duty itself.`),
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

      {/* Hub de importar — Ligar calendário · Importar PDF (janela por migrar: segue a 2.0) */}
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
        <View style={s.hubNote}><Icon name="lock" size={13} color={C.ink} /><Text style={s.hubNoteTxt}>{l('Lido no telemóvel · confirmas antes de gravar', 'Read on your phone · you confirm before saving')}</Text></View>
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

      {/* A1 · o ano em meses (3439): cada mês com o n.º de dias com serviço; o atual com contorno; sem escala a tracejado. */}
      <PeleSheet visible={monthPickerOpen} onClose={() => setMonthPickerOpen(false)}>
        <View style={s.yHead}>
          <Text style={[TXT3.cardTitle, { color: C.ink }]} allowFontScaling={false}>{pickYear ?? y}</Text>
          <View style={s.yArrows}>
            <IconButton icon="back" onPress={() => setPickYear((yy) => (yy ?? y) - 1)} label={l('Ano anterior', 'Previous year')} style={{ backgroundColor: C.round }} />
            <IconButton icon="back" rot={180} onPress={() => setPickYear((yy) => (yy ?? y) + 1)} label={l('Ano seguinte', 'Next year')} style={{ backgroundColor: C.round }} />
          </View>
        </View>
        <View style={s.yGrid}>
          {yearMonths({ year: pickYear ?? y, duties, today, lang }).map((mo) => {
            const shown = (pickYear ?? y) === y && mo.m === m0 + 1;
            const what = mo.empty ? l('sem escala', 'no roster') : `${mo.count} ${plural(mo.count, l('serviço', 'duty'), l('serviços', 'duties'))}`;
            return (
              <TouchableOpacity key={mo.ym} onPress={() => { select(); setMonthDate(new Date(pickYear ?? y, mo.m - 1, 1)); setMonthPickerOpen(false); }}
                style={[s.yTile, mo.empty ? [s.yTileEmpty, { borderColor: C.round }] : { backgroundColor: C.neutral }, mo.current ? [s.yTileCur, { borderColor: C.ink }] : null]}
                activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: shown }}
                accessibilityLabel={`${mo.label}: ${what}${mo.current ? `, ${l('mês atual', 'current month')}` : ''}`}>
                <Text style={[TXT.bodyStrong, { color: C.ink }]} allowFontScaling={false}>{mo.label}</Text>
                <Text style={[TXT.caption, { color: mo.empty ? C.caption : C.tabSub }]} numberOfLines={1} allowFontScaling={false}>{what}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[TXT.caption, { color: C.caption }]}>{l('O contorno é o mês em que estás. A tracejado, os meses sem escala no calendário.', 'The outlined month is the current one. Dashed: months with no roster in the calendar.')}</Text>
      </PeleSheet>


      {/* Dica da agenda (1.ª abertura pós-folha) — flutua sobre a folha, seta para cima. */}
      <Tip visible={gridTip} arrow="up" lang={lang} style={{ top: 300 }}
        bold={l('Toca num dia', 'Tap a day')}
        tail={l('para o abrir — os serviços, as horas e o que rende.', 'to open it — the duties, the times and what it pays.')}
        onDismiss={dismissGridTip} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
  flex: { flex: 1 },
  startPad: { gap: SPACE.md, paddingTop: SPACE.sm, paddingHorizontal: GUTTER },

  // O topo: a linha do arranque e os botões redondos (44, como o sino do Início) à direita do "Novembro 2026 ▾"
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md, minHeight: 44, paddingTop: SPACE.xs, paddingHorizontal: GUTTER },
  hdrTxt: { flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  round: { width: 44, height: 44, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  hdrDot: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: RADIUS.pill, borderWidth: 1.5 },
  hoje: { height: 38, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // A folha (branca, por cima do fundo, como no Início)
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  list: { paddingHorizontal: SPACE.md, paddingTop: SPACE.md, gap: SPACE.sm },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: RADIUS.xxl, paddingVertical: SPACE.lgPlus, paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  privRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  privTxt: { fontFamily: PELE_FONT.bodyBold },
  foot: { marginTop: SPACE.md, paddingHorizontal: SPACE.xs },

  // O mês — o dia Q1 (design/escala-semana.html): o quadrado calmo com o número e o destino; a cor só na fita de baixo
  wkhead: { flexDirection: 'row', gap: GAP, marginBottom: SPACE.xs },
  wkh: { textAlign: 'center' },
  cal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: ROW_GAP },
  cellBlank: { height: ROW_H },
  cell: { height: ROW_H, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACE.s, overflow: 'hidden' },
  cellJR: { borderBottomRightRadius: 0 },
  cellJL: { borderBottomLeftRadius: 0 },
  numTxt: { fontVariant: ['tabular-nums'] },
  code: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs },
  strip: { alignSelf: 'stretch', height: STRIP_H, flexDirection: 'row', justifyContent: 'space-between' },
  stripTwo: { flex: 0.45, marginRight: SPACE.xxs },   // o outro serviço: um terço da fita (0,45 : 1), com um fio entre os dois
  stripJoin: { position: 'absolute', right: -GAP, width: GAP, bottom: 0, height: STRIP_H },
  dash: { width: SPACE.xs, height: STRIP_H },
  selRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.sm, borderWidth: 2 },
  pend: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: RADIUS.pill, borderWidth: 1.5 },
  // L2 · a legenda que filtra
  chipsWrap: { marginTop: SPACE.md, marginHorizontal: -SPACE.md },
  chips: { paddingHorizontal: SPACE.md, gap: SPACE.s },
  chip: { height: 32, borderRadius: RADIUS.pill, borderWidth: 1.5, paddingLeft: SPACE.sm, paddingRight: SPACE.md, flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  legSw: { width: 22, height: 16, borderRadius: RADIUS.xs, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  legSwAbs: { borderWidth: 1.5, borderStyle: 'dashed' },   // férias e baixa: a tracejado, como a fita do dia
  legSwEdge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SPACE.s },
  legSwDot: { position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: RADIUS.pill },
  chipsHint: { marginTop: SPACE.s, paddingHorizontal: SPACE.xxs },

  // A semana em cima e a folha do dia que sobe por baixo dela (design/escala-semana.html)
  weekWrap: { paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.sm },
  daySheet: { flex: 1, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, ...SHADOW.sm, shadowOffset: { width: 0, height: -SPACE.sm } },
  dsGrab: { alignItems: 'center', paddingTop: SPACE.sm, paddingBottom: SPACE.s },
  dsGrabBar: { width: 40, height: 5, borderRadius: RADIUS.pill },
  dsHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md },
  dsTitle: { minWidth: 0 },
  dsBody: { paddingHorizontal: SPACE.md, paddingBottom: SPACE.xxxl },
  day: { gap: SPACE.sm },

  swHint: { textAlign: 'center', marginTop: SPACE.xs },
  svcBlock: { gap: SPACE.sm },

  // A1 · o ano em meses
  yHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md },
  yArrows: { flexDirection: 'row', gap: SPACE.sm },
  yGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACE.sm, marginBottom: SPACE.md },
  yTile: { width: '23%', height: 64, borderRadius: RADIUS.lg, padding: SPACE.sm, justifyContent: 'space-between' },
  yTileEmpty: { borderWidth: 1.5, borderStyle: 'dashed' },
  yTileCur: { borderWidth: 2 },

  // Folhas (hub de importar · seletor de mês) — por migrar, seguem a 2.0
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
