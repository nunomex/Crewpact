import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl, Linking, Platform, PanResponder, Dimensions, LayoutAnimation, PixelRatio, Animated, Easing, Modal, AccessibilityInfo } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import GuideBubble from '../components/GuideBubble';
import AsyncStorage from '../data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import { RADIUS, GUTTER, SPACE, TXT, TXT3, TYPE, CARD, PELE, PELE_FONT, BRAND } from '../data/constants';
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
import { monthCells, orderServices, dayCards, yearMonths, cellMatches, prettyRoute, legendTour, legendGroups } from '../data/escalaDay';
import HotelSheet from '../components/HotelSheet';
import RosterImportSheet from '../components/RosterImportSheet';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useReduceMotion from '../hooks/useReduceMotion';

// O dia do mês (o círculo A de design/escala-circulos.html, escolhido pelo Nuno a 2026-11-13 — "os números em círculos; a linha
// do círculo pintada com os serviços; 2 serviços = duas cores, 3 = três"): o número num círculo de 38 pt; a cor dos serviços no
// ANEL, uma fatia por serviço, na cor do TIPO e pela hora (dois voos = duas fatias céu com um fio branco); o destino por baixo.
// Folga = só o número; férias e baixa = anel tracejado; feito = anel cinzento; hoje = o círculo a tinta; o escolhido = um anel de
// tinta por fora, afastado. A rotação já não se junta (os círculos não se ligam); a pernoita fica na lua ao lado do destino.
const RING = 38;                 // o círculo
const RING_W = 4;                // a grossura do anel
const RING_GAP_DEG = 5;          // o fio branco entre duas fatias
const ROW_H = RING + 22;         // o círculo, o anel do escolhido por fora e o destino por baixo
const ROW_GAP = SPACE.xs;
const TOUR_W = 260;              // o balão da guiada
const TOUR_H = 140;              // a altura que o balão costuma ter (para a folha deslizar até ele)
const GAP = SPACE.xs;
const C = CARD.day;   // a barra de abas só escurece no Início; a Escala fica de dia como o resto (design-system §14)
const valid = (d) => !!(d && !d.deleted);
const isoOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

// Aba Escala · SÓ O MÊS (escolha 1 de design/escala-so-mes.html, aprovada pelo Nuno a 2026-11-13; a Lista saiu da aba).
// Em cima, na secretária, o topo do Início: "Novembro 2026 ▾" (abre o ano em meses) e ler a escala; "A tua escala de novembro";
// o número de serviços e os factos. Por baixo, numa folha branca, o MÊS no desenho A (design/escala-mes.html: o número limpo e
// uma etiqueta na cor do tipo com o destino; o que cada célula mostra decide-o data/escalaDay.js · monthCells, golden
// test:escala) e a legenda que filtra (L2: tocar numa cor acende esses dias). Deslizar para o lado EM CIMA DA GRELHA muda de mês.
// TOCAR NUM DIA (a V1 de design/escala-dia-por-baixo.html, escolhida pelo Nuno a 2026-11-13: "sem subir a folha; aparecer só os
// serviços, por baixo dos dias do mês; carregando num serviço é que abre uma folha"): o MÊS FICA INTEIRO, o topo grande recolhe
// para a fila das pílulas e, por baixo da grelha (no lugar da legenda), aparecem o dia (o título, "hoje" · quantos serviços, ✕)
// e uma linha por serviço (a pernoita vai na linha do voo). Tocar noutro dia troca; ✕, tocar outra vez no dia ou re-tocar na aba
// voltam à legenda. TOCAR NUM SERVIÇO abre a FOLHA dele (a janela nativa do iPhone) com TUDO o que é dele, como o antigo "Ver
// tudo" (design/detalhe-3.html, B): o cartão de cor com a perna, os Limites (o PSV numa barra), o horário (a régua das 24 h), o
// completar, a pernoita, o pagamento e os outros serviços — o corpo do Detalhe (screens/DutyDetailScreen.js · DutyDetailBody).
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
  // O DIA ESCOLHIDO: null = a legenda por baixo do mês (a aba abre sempre assim); com um dia, os serviços dele por baixo do mês.
  const [selIso, setSelIso] = useState(null);
  const [svcSheet, setSvcSheet] = useState(null);   // a folha do serviço: { iso, idx } (idx = 0 o registo principal, n o extra n)
  const [filterKey, setFilterKey] = useState(null); // L2 · a pílula da legenda que está a filtrar
  const [hotelOpen, setHotelOpen] = useState(false);
  const [hotelStation, setHotelStation] = useState(null);
  // Largura da grelha DETERMINÍSTICA à nascença (ecrã − gutters) → a grelha nasce inteira no 1.º frame
  // (user 2026-07-16). O onLayout só corrige casos raros (split-screen, rotação).
  const [gridW, setGridW] = useState(() => Dimensions.get('window').width - GUTTER * 2);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);   // A1 · o ano em meses (toque em "Novembro 2026 ▾")
  const reduceMotion = useReduceMotion();
  const dimRef = useRef({});                            // iso → Animated.Value (1 aceso · 0,22 esbatido): a legenda que filtra
  const scrollH = useRef(0);                            // a altura à vista da folha (para os serviços do dia ficarem à vista)
  const scrollY = useRef(0);                            // quanto a folha já está deslizada
  const dayBlockRef = useRef({ y: 0, h: 0 });           // onde ficam os serviços do dia, dentro da folha
  const wantScroll = useRef(false);                     // escolheu-se um dia: desliza o mínimo para os serviços aparecerem
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
  const closeDayRef = useRef(null), openDayRef = useRef(null);
  // Re-tocar na aba Escala: com um dia aberto, volta ao mês; com o mês, sobe ao topo.
  useEffect(() => navigation.addListener('tabPress', () => {
    if (!navigation.isFocused()) return;
    if (selRef.current) { closeDayRef.current?.(); return; }
    scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
  }), [navigation, reduceMotion]);

  // ── A GUIADA DA LEGENDA (J3, o piloto das guias da app — components/GuideBubble.js): na 1.ª vez que a Escala abre com escala
  // (depois da folha de boas-vindas), balões sobre os dias verdadeiros do mês, um por sinal; o último ensina a tocar num dia
  // (substitui a dica "Toca num dia"). Conta como vista ao acabar, ao saltar, ao tocar num dia ou ao sair da aba a meio.
  // Repete-se em "Rever a legenda no meu mês", por baixo da legenda. Os dias que aponta: data/escalaDay.js · legendTour. ──
  const [tourIdx, setTourIdx] = useState(null);       // o balão à vista (null = a guiada desligada)
  const tourLenRef = useRef(0);                       // quantos balões tem este mês (0 = nada a ensinar)
  const tourKey = user?.id ? `cp_tour_escala_${user.id}` : null;
  const escBusyRef = useRef(false);
  useEffect(() => {
    escBusyRef.current = !!(importOpen || hubOpen || hotelOpen || calPickerOpen || monthPickerOpen);
  }, [importOpen, hubOpen, hotelOpen, calPickerOpen, monthPickerOpen]);
  useFocusEffect(useCallback(() => {
    let on = true; let tId = null;
    if (tourKey) {
      tId = setTimeout(() => {
        if (!on || escBusyRef.current || selRef.current || !tourLenRef.current) return;
        Promise.all([AsyncStorage.getItem(`cp_welcome_${user.id}`), AsyncStorage.getItem(tourKey)])
          .then(([w, seen]) => { if (on && !escBusyRef.current && !selRef.current && w === 'seen' && !seen) setTourIdx(0); })
          .catch(() => {});
      }, 800);
    }
    return () => { on = false; if (tId) clearTimeout(tId); setTourIdx((p) => { if (p != null && tourKey) AsyncStorage.setItem(tourKey, '1').catch(() => {}); return null; }); };
  }, [tourKey]));
  const endTour = () => { setTourIdx(null); if (tourKey) AsyncStorage.setItem(tourKey, '1').catch(() => {}); };
  const tourRef = useRef(null); tourRef.current = tourIdx;
  const endTourRef = useRef(endTour); endTourRef.current = endTour;

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
  const changeMonth = (dir) => { select(); if (tourRef.current != null) endTourRef.current(); setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1)); };
  // "Hoje" (noutro mês): o mês de hoje, com hoje aberto.
  const goToday = () => { select(); const t0 = new Date(); setMonthDate(new Date(t0.getFullYear(), t0.getMonth(), 1)); openDayRef.current?.(today); };
  // Arrastar ← / → em cima da GRELHA muda de mês (o único gesto para o lado na Escala).
  const changeMonthRef = useRef(changeMonth); changeMonthRef.current = changeMonth;
  const swipeDir = (g) => ((Math.abs(g.dx) > 30 || Math.abs(g.vx) > 0.25) ? (g.dx < 0 ? 1 : -1) : 0);
  const monthPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onPanResponderRelease: (_, g) => { const dir = swipeDir(g); if (dir) changeMonthRef.current(dir); },
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

  // ── O DIA ESCOLHIDO (os serviços por baixo do mês) e a FOLHA DO SERVIÇO ──
  // Os serviços do dia pela posição no registo (0 = o principal, n = o extra n — a mesma conta do Detalhe).
  const svcsAt = (iso) => { const d = duties[iso]; return valid(d) ? [d, ...(Array.isArray(d.extra) ? d.extra : [])] : []; };
  // O serviço principal (o voo manda, como na célula e na Lista) — para o nome da célula.
  const mainIdxOf = (iso) => { const sv = svcsAt(iso); const i = sv.findIndex((x) => x && (x.kind || 'flight') === 'flight'); return i >= 0 ? i : (sv.length ? 0 : -1); };
  // O topo recolhe e os serviços aparecem: um movimento curto das posições (260 ms; reduzido = troca logo).
  const layoutAnim = () => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)); };
  const resetDim = () => Object.values(dimRef.current).forEach((v) => v.setValue(1));
  // Escolher um dia: o topo recolhe e os serviços dele aparecem por baixo do mês; a legenda que filtra volta a mostrar tudo
  // (sai de vista com o dia escolhido — um mês esbatido sem a pílula que o desfaz seria um beco).
  const openDayAt = (iso) => { layoutAnim(); setFilterKey(null); resetDim(); setSelIso(iso); wantScroll.current = true; };
  const isOpen = !!selIso;
  const closeDay = () => { if (!selRef.current) return; select(); layoutAnim(); setSelIso(null); };
  // Tocar num dia: escolhe-o; tocar no escolhido volta à legenda.
  const pickDay = (iso) => { if (tourRef.current != null) endTourRef.current(); if (iso === selRef.current) { closeDay(); return; } select(); openDayAt(iso); };
  // Tocar num serviço: abre a folha dele (a janela nativa do iPhone, com o corpo do Detalhe).
  const pickSvc = (idx) => { if (!selRef.current) return; select(); setSvcSheet({ iso: selRef.current, idx }); };
  const closeSvc = () => setSvcSheet(null);
  // Enquanto a janela desce, continua a mostrar o serviço que tinha (senão descia vazia).
  const lastSvcRef = useRef(null); if (svcSheet) lastSvcRef.current = svcSheet;
  const svcShown = svcSheet || lastSvcRef.current;
  const svcTitleOf = ({ iso, idx }) => { const sv = svcsAt(iso)[idx]; if (!sv) return ''; const k = sv.kind || 'flight'; return (k === 'flight' && prettyRoute(sv.route)) || kindLabel(k); };
  // Os serviços do dia à vista: depois de aparecerem, desliza-se o mínimo (o dia escolhido continua à vista no mês).
  const scrollToDay = () => {
    if (!wantScroll.current || !scrollRef.current) return;
    wantScroll.current = false;
    const { y: by, h: bh } = dayBlockRef.current;
    const target = Math.max(0, by + Math.min(bh, 200) - scrollH.current + SPACE.md);
    if (target > scrollY.current) scrollRef.current.scrollTo({ y: target, animated: !reduceMotion });   // só desce; nunca sobe por cima do que se está a ver
  };
  closeDayRef.current = closeDay; openDayRef.current = openDayAt;

  // ── A LEGENDA J3 (design/escala-legenda-3.html): a pequena, por baixo do mês — quatro grupos com TODOS os sinais; os que contam
  // acendem esses dias e esbatem os outros (180 ms; reduzido = salta); outra vez repõe (data/escalaDay.js · legendGroups) ──
  const legGroups = legendGroups(G.cells, lang);
  const dimOf = (iso) => (dimRef.current[iso] || (dimRef.current[iso] = new Animated.Value(1)));
  // ── A GUIADA: os balões deste mês (data/escalaDay.js · legendTour) ──
  const tourSteps = legendTour(G.cells, lang);
  tourLenRef.current = tourSteps.length;
  const tourStep = tourIdx != null ? tourSteps[tourIdx] || null : null;
  const calYRef = useRef(0);                            // onde começa a grelha, dentro da folha
  const startTour = () => { if (!tourSteps.length) return; select(); setFilterKey(null); resetDim(); setTourIdx(0); };
  const nextTour = () => { select(); if (tourIdx == null || tourIdx + 1 >= tourSteps.length) endTour(); else setTourIdx(tourIdx + 1); };
  // Cada balão: o VoiceOver lê-o; a folha desliza o mínimo para o dia e o balão ficarem à vista.
  useEffect(() => {
    if (!tourStep) return;
    AccessibilityInfo.announceForAccessibility(tourStep.text);
    const c = G.cells.find((x) => x.iso === tourStep.iso); if (!c || !scrollRef.current) return;
    const row = Math.floor((G.firstWeekday + c.day - 1) / 7), above = row >= G.nRows - 2;
    const top = calYRef.current + row * (ROW_H + ROW_GAP) - (above ? TOUR_H : 0);
    const bottom = calYRef.current + (row + 1) * (ROW_H + ROW_GAP) + (above ? 0 : TOUR_H);
    if (bottom > scrollY.current + scrollH.current) scrollRef.current.scrollTo({ y: bottom - scrollH.current, animated: !reduceMotion });
    else if (top < scrollY.current) scrollRef.current.scrollTo({ y: Math.max(0, top), animated: !reduceMotion });
  }, [tourIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  // Onde fica o balão: por baixo do dia (por cima nas duas últimas semanas), centrado nele sem sair da grelha.
  const tourBubble = () => {
    if (!tourStep || !cellW) return null;
    const c = G.cells.find((x) => x.iso === tourStep.iso); if (!c) return null;
    const i = G.firstWeekday + c.day - 1, col = i % 7, row = Math.floor(i / 7);
    const W = Math.min(TOUR_W, gridW), cx = col * (cellW + GAP) + cellW / 2, left = Math.max(0, Math.min(gridW - W, cx - W / 2));
    const above = row >= G.nRows - 2, calH = G.nRows * ROW_H + (G.nRows - 1) * ROW_GAP, rowTop = row * (ROW_H + ROW_GAP);
    return (
      <GuideBubble text={tourStep.text} step={tourIdx + 1} total={tourSteps.length} onNext={nextTour} onSkip={() => { select(); endTour(); }}
        width={W} arrowX={cx - left} above={above} l={l}
        style={[{ left }, above ? { bottom: calH - rowTop + SPACE.xs } : { top: rowTop + ROW_H + SPACE.xxs }]} />
    );
  };
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

  // Uma célula (o círculo A): o número num círculo; o anel com uma fatia por serviço, pela hora, na cor do tipo (voo céu ·
  // terra lilás; os dias feitos ficam iguais aos outros); o destino por baixo. Férias e baixa = anel tracejado; folga = só o número; hoje = o
  // círculo a tinta por dentro do anel; o escolhido = um anel de tinta por fora.
  const RR = (RING - RING_W) / 2, CIRC = 2 * Math.PI * RR, CX = RING / 2;
  const ringSegs = (c) => {
    const d = duties[c.iso];
    if (!valid(d)) return [];
    // Os dias que já passaram ficam iguais aos outros — o anel, o número e o destino com as cores normais (o Nuno, 2026-11-13).
    return orderServices(d).map((o) => ((o.svc.kind || 'flight') === 'flight' ? C.flight : C.ground));
  };
  const renderCell = (c) => {
    const svcs = svcsAt(c.iso).filter(Boolean);
    const mi = mainIdxOf(c.iso), main = mi >= 0 ? svcsAt(c.iso)[mi] : null;
    const abs = !svcs.length ? dayAbs[c.iso] : null;
    const isAbs = c.kind === 'fer' || c.kind === 'doe';
    const segs = isAbs ? [] : ringSegs(c);
    const gapLen = segs.length > 1 ? (CIRC * RING_GAP_DEG) / 360 : 0;
    const segLen = segs.length ? CIRC / segs.length - gapLen : 0;
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
        <TouchableOpacity activeOpacity={0.7} onPress={() => pickDay(c.iso)} style={s.cell}
          accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: c.sel }}
          accessibilityHint={c.sel ? l('Volta à legenda', 'Back to the legend') : l('Mostra os serviços deste dia', 'Shows this day’s duties')}>
          <View style={s.ring}>
            <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
              {isAbs ? <SvgCircle cx={CX} cy={CX} r={RR} stroke={C.caption} strokeWidth={1.5} strokeDasharray="3 3" fill="none" /> : null}
              {segs.length === 1 ? <SvgCircle cx={CX} cy={CX} r={RR} stroke={segs[0]} strokeWidth={RING_W} fill="none" /> : null}
              {segs.length > 1 ? segs.map((col, i) => (
                <SvgCircle key={i} cx={CX} cy={CX} r={RR} stroke={col} strokeWidth={RING_W} fill="none" strokeDasharray={`${segLen} ${CIRC - segLen}`}
                  rotation={-90 + (i * 360) / segs.length + RING_GAP_DEG / 2} origin={`${CX}, ${CX}`} />
              )) : null}
              {c.today ? <SvgCircle cx={CX} cy={CX} r={segs.length || isAbs ? RR - RING_W / 2 : CX} fill={C.ink} /> : null}
            </Svg>
            <Text style={[TXT3.lineVal, s.numTxt, { color: c.today ? C.sheet : C.ink }]} allowFontScaling={false}>{c.day}</Text>
            {c.dirty ? <View style={[s.pend, { backgroundColor: C.alert, borderColor: C.sheet }]} pointerEvents="none" /> : null}
            {c.sel ? <View style={[s.selRing, { borderColor: C.ink }]} pointerEvents="none" /> : null}
            {tourStep && tourStep.iso === c.iso ? <View style={[s.tourRing, { borderColor: C.ink }]} pointerEvents="none" /> : null}
          </View>
          {c.code ? (
            <View style={s.code}>
              <Text style={[TXT.tag, { color: C.soft }]} numberOfLines={1} allowFontScaling={false}>{c.code}</Text>
              {c.ns ? <Icon name="moon" size={9} color={C.soft} /> : null}
            </View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const rcCounts = rosterChanges?.counts;
  const lsCount = liveSync ? Object.keys(liveSync).length : 0;

  // ── O que as linhas abrem (ctx = o dia: { iso, nsSt, nsHotel }) ──
  const onCardOpen = (o, ctx = {}) => {
    if (!o) return;
    if (o.to !== 'detail') select();
    const iso = ctx.iso;
    if (o.to === 'detail') { pickSvc(o.idx || 0); return; }   // o serviço abre a folha dele (o "Ver tudo")
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

  // ── O DIA (por baixo do mês): uma linha por serviço (pela hora; a pernoita vai na linha do voo e no Hotel); tocar numa abre a
  // folha do serviço. Sem serviço: a folga ou a ausência. ──
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
          {lines.map(({ c, sv }) => (
            <View key={c.id} style={s.svcBlock}>
              {cardsOf([(sv && sv.nightStop && nsName) ? { ...c, sub: [c.sub, l(`pernoita em ${nsName}`, `night stop in ${nsName}`)].filter(Boolean).join(' · ') } : c], ctx)}
            </View>
          ))}
          {/* Extras PAGOS neste dia trabalhado (SNC/RDP) — compensações por cima do serviço. */}
          {dayOv[iso] ? cardsOf(dayOv[iso].map((e) => { const v = extraEur(e.type, catD, iso); return { t: 'slim', id: `ov${e.id}`, color: 'neutral', title: extraLabel(e.type), sub: l('compensação deste dia', 'this day’s compensation'), value: v != null ? `+${fmtEur(v)}` : null, gain: v != null }; }), ctx) : null}
        </>
      );
    }
    return (
      <View style={s.day} onLayout={(e) => { const { y: by, height: bh } = e.nativeEvent.layout; dayBlockRef.current = { y: by, h: bh }; setTimeout(scrollToDay, 300); }}>
        {renderDayHead(iso)}
        {body}
      </View>
    );
  };
  // O cabeçalho do dia: o dia (e "hoje" · quantos serviços) à esquerda; ✕ à direita (§10) volta à legenda. Outro dia = tocar
  // nele no mês, que está inteiro por cima.
  const renderDayHead = (iso) => {
    const nSvc = svcsAt(iso).filter(Boolean).length, abs = dayAbs[iso];
    const sub = [iso === today ? l('hoje', 'today') : null, nSvc ? `${nSvc} ${plural(nSvc, l('serviço', 'duty'), l('serviços', 'duties'))}` : abs ? extraLabel(abs.type) : l('sem serviços', 'no duties')].filter(Boolean).join(' · ');
    return (
      <View style={s.dsHead}>
        <View style={[s.flex, s.dsTitle]}>
          <Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} accessibilityRole="header">{dayTitleOf(iso)}</Text>
          <Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1}>{sub}</Text>
        </View>
        <IconButton icon="close" onPress={closeDay} label={l('Fechar o dia', 'Close the day')} style={{ backgroundColor: C.round }} />
      </View>
    );
  };
  // A amostra de cada sinal é o próprio sinal do mês, em pequeno (14 pt): o anel, as fatias, o tracejado, a lua, o ponto, o hoje,
  // o feito, o escolhido e a folga (só o número).
  const SW = 14, SWR = (SW - 2.5) / 2, SWC = SW / 2, SWCIRC = 2 * Math.PI * SWR;
  const legSwatch = (key, on) => {
    if (key === 'ns') return <View style={s.legSw}><Icon name="moon" size={11} color={on ? C.sheet : C.soft} /></View>;
    if (key === 'free') return <View style={s.legSw}><Text style={[TXT.tag, { color: on ? C.sheet : C.ink }]} allowFontScaling={false}>7</Text></View>;
    if (key === 'dirty') return <View style={s.legSw}><View style={[s.legDot, { backgroundColor: C.alert }]} /></View>;
    const half = SWCIRC / 2 - (SWCIRC * RING_GAP_DEG) / 360;
    return (
      <View style={s.legSw}>
        <Svg width={SW} height={SW}>
          {key === 'voo' || key === 'terra' ? <SvgCircle cx={SWC} cy={SWC} r={SWR} stroke={key === 'voo' ? C.flight : C.ground} strokeWidth={2.5} fill="none" /> : null}
          {key === 'two' ? [C.ground, C.flight].map((col, i) => <SvgCircle key={i} cx={SWC} cy={SWC} r={SWR} stroke={col} strokeWidth={2.5} fill="none" strokeDasharray={`${half} ${SWCIRC - half}`} rotation={-90 + i * 180 + RING_GAP_DEG / 2} origin={`${SWC}, ${SWC}`} />) : null}
          {key === 'fer' || key === 'doe' ? <SvgCircle cx={SWC} cy={SWC} r={SWR} stroke={C.caption} strokeWidth={1.2} strokeDasharray="2 2" fill="none" /> : null}
          {key === 'today' ? <SvgCircle cx={SWC} cy={SWC} r={SWC} fill={C.ink} /> : null}
          {key === 'sel' ? <SvgCircle cx={SWC} cy={SWC} r={SWC - 1} stroke={C.ink} strokeWidth={1.5} fill="none" /> : null}
        </Svg>
      </View>
    );
  };
  // A pequena (J3): uma linha por grupo, o nome à esquerda e sinal + nome + quantos dias à direita; tocar acende esses dias; os
  // que não há no mês ficam a 0, mais claros. "Os dias" só explicam. No fim, "Rever a legenda no meu mês" (a guiada).
  const renderLegend = () => (
    <View style={s.leg}>
      {legGroups.map((g) => (
        <View key={g.title} style={[s.legRow, { borderBottomColor: CARD.rule }]}>
          <Text style={[TXT.tag, s.legT, { color: C.tabSub }]} allowFontScaling={false}>{g.title}</Text>
          <View style={s.legItems}>
            {g.items.map((it) => {
              const on = filterKey === it.key, can = it.count != null && it.count > 0;
              const a11y = `${it.label}${it.count != null ? `, ${it.count} ${it.count === 1 ? l('dia', 'day') : l('dias', 'days')}` : ''}`;
              const inner = (
                <>
                  {legSwatch(it.key, on)}
                  <Text style={[TXT.label, { color: on ? C.sheet : it.count === 0 ? C.tabSub : C.ink }]} allowFontScaling={false}>{it.label}</Text>
                  {it.count != null ? <Text style={[TXT.label, { color: on ? C.sheet : C.tabSub }]} allowFontScaling={false}>{it.count}</Text> : null}
                </>
              );
              return can ? (
                <TouchableOpacity key={it.key} onPress={() => pickFilter(it.key)} activeOpacity={0.8} style={[s.legItem, on ? { backgroundColor: C.ink } : null]}
                  accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={a11y}
                  accessibilityHint={on ? l('Mostra todos os dias', 'Shows every day') : l('Acende estes dias no mês', 'Highlights these days in the month')}>
                  {inner}
                </TouchableOpacity>
              ) : <View key={it.key} style={s.legItem} accessible accessibilityLabel={a11y}>{inner}</View>;
            })}
          </View>
        </View>
      ))}
      {tourSteps.length ? (
        <TouchableOpacity onPress={startTour} hitSlop={{ top: SPACE.sm, bottom: SPACE.sm }} accessibilityRole="button" style={s.legReplay}>
          <Text style={[TXT.label, s.legReplayTxt, { color: C.ink }]}>{l('Rever a legenda no meu mês', 'Replay the legend on my month')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
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
      <View style={s.cal} onLayout={(e) => { const { width: w, y: cy } = e.nativeEvent.layout; calYRef.current = SPACE.md + cy; setGridW((p) => (Math.abs(w - p) > 0.5 ? w : p)); }}>
        {cellW ? (
          <>
            {Array.from({ length: G.firstWeekday }).map((_, i) => <View key={`lead${i}`} style={[s.cellBlank, { width: cellW }]} />)}
            {G.cells.map(renderCell)}
            {/* a guiada: o balão por cima das células (o último filho fica por cima) */}
            {tourBubble()}
          </>
        ) : null}
      </View>
      </View>
      {/* Com um dia escolhido, os serviços dele ficam no lugar da legenda. */}
      {selIso ? renderDay(selIso) : renderLegend()}
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']}>
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
            {/* A FOLHA: o mês inteiro (o círculo A); por baixo, a legenda — ou, com um dia escolhido, os serviços dele. */}
            <View style={[s.sheet, { backgroundColor: C.sheet }]}>
              <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={[s.list, { paddingBottom: tabSpace + SPACE.lg }]} showsVerticalScrollIndicator={false}
                  onLayout={(e) => { scrollH.current = e.nativeEvent.layout.height; }}
                  onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32}
                  refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.caption} colors={[C.caption]}
                    onRefresh={async () => {
                      setRefreshing(true); const t0 = Date.now();
                      try { await checkRosterChanges?.(); } catch { /* ignora */ }
                      const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                      setRefreshing(false);
                    }} />}>
                {renderMonth()}
                {(!selIso && !monthDutyDays.length && !monthHasAbs) ? renderEmpty() : null}
                {!selIso ? <Text style={[TXT.caption, s.foot, { color: C.tabSub }]}>{t('duties.syncHint', lang)}</Text> : null}
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {/* A FOLHA DO SERVIÇO: a janela nativa do iPhone (puxar para baixo fecha) com tudo o que é dele — o corpo do Detalhe. */}
      <Modal visible={!!svcSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeSvc}>
        {svcShown ? (
          <View style={[s.dsRoot, { backgroundColor: C.sheet }]}>
            <View style={s.dsGrab}><View style={[s.dsGrabBar, { backgroundColor: C.round }]} /></View>
            <View style={s.ssHead}>
              <View style={[s.flex, s.dsTitle]}>
                <Text style={[TXT3.slimTitle, { color: C.ink }]} numberOfLines={1} accessibilityRole="header">{svcTitleOf(svcShown)}</Text>
                <Text style={[TXT3.cardSub, { color: C.tabSub }]} numberOfLines={1}>{dayTitleOf(svcShown.iso)}</Text>
              </View>
              <IconButton icon="close" onPress={closeSvc} label={l('Fechar', 'Close')} style={{ backgroundColor: C.round }} />
            </View>
            <ScrollView style={s.flex} contentContainerStyle={s.dsBody} showsVerticalScrollIndicator={false}>
              <DutyDetailBody date={svcShown.iso} idx={svcShown.idx} navigation={navigation}
                onDeleted={() => { setSvcSheet(null); setSelIso(null); }}
                onOpenService={(i) => setSvcSheet((cur) => (cur ? { ...cur, idx: i } : cur))} />
            </ScrollView>
          </View>
        ) : null}
      </Modal>

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

  // O mês — o círculo A (design/escala-circulos.html): o número num círculo, o anel com os serviços, o destino por baixo
  wkhead: { flexDirection: 'row', gap: GAP, marginBottom: SPACE.xs },
  wkh: { textAlign: 'center' },
  cal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: ROW_GAP },
  cellBlank: { height: ROW_H },
  cell: { height: ROW_H, alignItems: 'center', paddingTop: SPACE.xs, gap: SPACE.xxs },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontVariant: ['tabular-nums'] },
  code: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs },
  selRing: { position: 'absolute', top: -SPACE.xs, left: -SPACE.xs, right: -SPACE.xs, bottom: -SPACE.xs, borderRadius: RADIUS.pill, borderWidth: 2 },   // o escolhido: por fora, afastado
  pend: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: RADIUS.pill, borderWidth: 1.5 },
  // A legenda J3 · a pequena (design/escala-legenda-3.html): uma linha por grupo, sem caixas
  leg: { marginTop: SPACE.md },
  legRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingVertical: SPACE.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  legT: { width: 76, lineHeight: 24 },
  legItems: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACE.xs, rowGap: SPACE.xxs },
  legItem: { height: 24, flexDirection: 'row', alignItems: 'center', gap: SPACE.s, paddingHorizontal: SPACE.s, borderRadius: RADIUS.pill },
  legSw: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  legDot: { width: 8, height: 8, borderRadius: RADIUS.pill },
  legReplay: { alignSelf: 'flex-start', marginTop: SPACE.md, paddingHorizontal: SPACE.xxs },
  legReplayTxt: { textDecorationLine: 'underline' },
  // a guiada: o dia de que o balão fala acende com um anel de tinta mais largo por fora
  tourRing: { position: 'absolute', top: -SPACE.s, left: -SPACE.s, right: -SPACE.s, bottom: -SPACE.s, borderRadius: RADIUS.pill, borderWidth: 3 },

  // O dia escolhido, por baixo do mês (design/escala-dia-por-baixo.html, V1)
  day: { gap: SPACE.sm, marginTop: SPACE.md },
  dsHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xs },
  dsTitle: { minWidth: 0 },
  svcBlock: { gap: SPACE.sm },
  // A folha do serviço (a janela nativa do iPhone)
  dsRoot: { flex: 1 },
  dsGrab: { alignItems: 'center', paddingTop: SPACE.sm, paddingBottom: SPACE.s },
  dsGrabBar: { width: 40, height: 5, borderRadius: RADIUS.pill },
  ssHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md },
  dsBody: { paddingHorizontal: SPACE.md, paddingBottom: SPACE.xxxl },

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
