import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl, Linking, Platform, PanResponder, Dimensions, LayoutAnimation, PixelRatio } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Tip from '../components/Tip';
import AsyncStorage from '../data/secureStorage';   // wrapper de cifra-em-repouso (flag OFF por agora = passthrough)
import { RADIUS, GUTTER, SPACE, TXT, TXT3, TYPE, CARD, PELE, PELE_FONT, BRAND } from '../data/constants';
import Icon from '../components/Icon';
import IconButton from '../components/IconButton';
import PeleSheet from '../components/PeleSheet';
import { HomeCards, HomeTop, pillWidth } from '../components/HomeCards';
import { DayBar, OffBar, DayCol } from '../components/DayBar';
import Segmented from '../components/Segmented';
import { fitGiant } from '../data/homeCards';
import { t } from '../data/i18n';
import { select, success } from '../data/haptics';
import { AppContext, isoDay } from '../data/appContext';
import { requestCalendarAccess } from '../data/calendar';
import { monthlyAe, serviceMoney, aeIndex, awayNights } from '../data/perdiem';
import { sncToRegister } from '../data/disruption';
import { nightStopStation, hotelMapsUrl } from '../data/hotels';
import { baseCityName } from '../data/countries';
import { monthCells, orderServices, dayCards, agendaRows, yearMonths } from '../data/escalaDay';
import HotelSheet from '../components/HotelSheet';
import RosterImportSheet from '../components/RosterImportSheet';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import useTabBarSpace from '../hooks/useTabBarSpace';
import useReduceMotion from '../hooks/useReduceMotion';

// A grelha do mês (na folha do botão do calendário): a célula de 46 pt é um quadrado de cantos redondos com a cor do tipo —
// número em cima, etiqueta a 11 em baixo, dois pontos quando há dois serviços no dia (escolha C do Nuno, 2026-11-13).
const ROW_H = 46;
const ROW_GAP = SPACE.xs;
const GAP = SPACE.xs;
const C = CARD.day;   // a barra de abas só escurece no Início; a Escala fica de dia como o resto (design-system §14)
const valid = (d) => !!(d && !d.deleted);

// Aba Escala · a AGENDA (direção 3.0; esboços design/escala-agenda.html — A2 em acordeão com o ano em meses da A1 — e
// design/escala-passado.html — os dias passados em D —, escolhidos pelo Nuno a 2026-11-13). O que vai para onde decide-o
// data/escalaDay.js (golden `npm run test:escala`).
// Em cima, na secretária, o topo do Início: "Novembro 2026 ▾" (abre o ano em meses); a grelha do mês e ler a escala nos
// botões redondos; "A tua escala de novembro"; o número de serviços em duas linhas e os factos (pernoitas · per diem).
// Por baixo, numa folha branca, a escala em lista: "Já feito" (os dias passados a cinzento, com o ponto da cor do tipo e o que
// renderam) · "Hoje" aberto (uma linha fina por serviço, pela ordem da hora, e a pernoita) · "A seguir" (uma barra por dia na
// cor do tipo); os dias vazios numa linha tracejada. Tocar numa barra abre o dia no sítio. O mês corrente abre em "Hoje".
// A escala vem do calendário (criar à mão morreu 2026-07-10); editar saiu (2026-11-08): o Detalhe do serviço só lê a escala e
// completa os factos que a lei precisa.
export default function EscalaScreen({ navigation, route }) {
  const { lang, duties, dayLog, user, company, ae: aeNow, aeAt, homeBaseAt, crewAt, postFlightMin, rosterChanges, checkRosterChanges, liveSync, notify,
    calendarId, setCalendarId, calendarName, setCalendarName, addAeEvents, aeEvents, removeAeEvent, hotels, rosterLog, isPilot } = useContext(AppContext);
  // O aviso de SNC corre DEPOIS de a importação gravar o arquivo: lê-se sempre a versão mais recente (não a do render).
  const sncSrc = useRef({ log: [], events: [] });
  sncSrc.current = { log: rosterLog || [], events: aeEvents || [] };
  const tabSpace = useTabBarSpace();
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const l = (pt, en) => (lang === 'en' ? en : pt);

  // Mês visível (1.º dia). Default = mês de hoje.
  const [monthDate, setMonthDate] = useState(() => { const t0 = new Date(); return new Date(t0.getFullYear(), t0.getMonth(), 1); });
  const [openIso, setOpenIso] = useState(() => isoDay());   // o dia aberto na agenda ('none' = todos fechados)
  const [hotelOpen, setHotelOpen] = useState(false);
  const [hotelStation, setHotelStation] = useState(null);
  // Largura da grelha DETERMINÍSTICA à nascença (ecrã − gutters) → a grelha nasce inteira no 1.º frame
  // (user 2026-07-16). O onLayout só corrige casos raros (split-screen, rotação).
  const [gridW, setGridW] = useState(() => Dimensions.get('window').width - GUTTER * 2);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);   // A1 · o ano em meses (toque em "Novembro 2026 ▾")
  const [view, setView] = useState('list');                         // 2B · "Lista | Mês" no topo da folha
  const reduceMotion = useReduceMotion();
  const [pickYear, setPickYear] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [calPickerOpen, setCalPickerOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);       // hub de importar (calendário | PDF)
  const [importSource, setImportSource] = useState('calendar');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [flashIso, setFlashIso] = useState(null);       // realce breve do dia após guardar
  const scrollRef = useRef(null);
  const todayYRef = useRef(null);        // onde começa "Hoje" na agenda (ao abrir o mês corrente, a agenda começa aí)
  const rowYRef = useRef({});            // onde começa cada linha (para ir a um dia escolhido na grelha)
  const needTodayRef = useRef(true);     // ainda falta pôr a agenda em "Hoje" neste mês
  const pendingRef = useRef(null);       // o dia escolhido no Mês: a lista vai até ele quando a sua linha aparecer
  // Re-tocar na aba Escala → volta a "Hoje" (a lista começa no dia 1; o topo seria o que já passou).
  const viewRef = useRef('list');
  const changeViewRef = useRef(null);    // a troca de vista mais recente (o ouvinte da aba não vê o estado novo)
  useEffect(() => navigation.addListener('tabPress', () => {
    if (!navigation.isFocused()) return;
    if (viewRef.current !== 'list') { changeViewRef.current?.('list', true); return; }   // no Mês: volta à lista, em "Hoje"
    const yTo = todayYRef.current != null ? Math.max(0, todayYRef.current - SPACE.sm) : 0;
    scrollRef.current?.scrollTo({ y: yTo, animated: !reduceMotion });
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
      setOpenIso(String(fd));
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
  // Ao mudar de mês: o mês corrente abre em "Hoje" (o que já passou fica por cima); os outros abrem no dia 1.
  useEffect(() => { rowYRef.current = {}; todayYRef.current = null; needTodayRef.current = isCurrentMonth; if (!isCurrentMonth) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [ym]); // eslint-disable-line react-hooks/exhaustive-deps
  const scrollToTodayOnce = () => {
    if (!needTodayRef.current || todayYRef.current == null) return;
    needTodayRef.current = false;
    const yTo = Math.max(0, todayYRef.current - SPACE.sm);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: yTo, animated: false }));
  };
  const monthName = monthDate.toLocaleDateString(locale, { month: 'long' });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const monthLabel = `${monthCap} ${y}`;

  // O dia aberto (acordeão): o escolhido, se for deste mês; senão hoje, no mês corrente; noutro mês, nenhum.
  const monthDutyDays = Object.keys(duties).filter((iso) => iso.startsWith(ym) && duties[iso] && !duties[iso].deleted).sort();
  const openDay = openIso === 'none' ? null : (openIso && openIso.startsWith(ym)) ? openIso : (isCurrentMonth ? today : null);

  // Mudar de mês (o deslizar para o lado e o ano em meses). dir: +1 próximo · -1 anterior.
  const changeMonth = (dir) => { select(); setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1)); };
  const goToday = () => { select(); const t0 = new Date(); setOpenIso(today); needTodayRef.current = true; setMonthDate(new Date(t0.getFullYear(), t0.getMonth(), 1)); if (isCurrentMonth && todayYRef.current != null) scrollRef.current?.scrollTo({ y: Math.max(0, todayYRef.current - SPACE.sm), animated: !reduceMotion }); };
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
  const pdM = (ae && catYm) ? monthlyAe(duties, catYm, crewAt(ym).contract || '12/12', ae, { ym, index: aeIndex(ae, ym), fleet: crewAt(ym).fleet, baseAt: homeBaseAt }) : null;
  const perDiemTotal = pdM ? pdM.perDiem : null;
  const nightCount = awayNights(duties, ym, { throughGround: !!(ae && ae.NIGHTS_ANY_DUTY) }).length;
  const monthHasAbs = Object.keys(dayAbs).some((iso) => iso.startsWith(ym));

  const kindLabel = (kind) => (kind === 'flight' ? l('Voo', 'Flight') : t('duties.kind.' + kind, lang));
  const cityOf = (code) => { const c = baseCityName(code, null, lang); return c && c !== code ? c : null; };
  const WD = lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayDateLbl = (iso) => { const dt = new Date(`${iso}T00:00:00`); if (isNaN(dt)) return iso; const sx = dt.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }); return sx.charAt(0).toUpperCase() + sx.slice(1); };

  // ── O Mês (2B: "Lista | Mês"; o que cada célula mostra decide-o data/escalaDay.js · monthCells) ──
  const absTypes = {}; Object.keys(dayAbs).forEach((iso) => { absTypes[iso] = dayAbs[iso].type; });
  const G = monthCells({ ym, duties, absences: absTypes, base: homeBaseAt, today, sel: openDay, lang });
  // A largura do dia arredonda PARA BAIXO ao píxel do ecrã: (largura − 6 espaços) / 7 sem arredondar dá, em vírgula flutuante,
  // uma linha uma ponta mais larga do que a grelha em vários iPhones (375, 402, 430 pt) e o domingo saltava para a linha de
  // baixo — a coluna "D" ficava vazia (visto no iPhone pelo Nuno, 2026-11-13). Sobra no máximo um píxel por dia.
  const PR = PixelRatio.get();
  const cellW = gridW ? Math.floor(((gridW - GAP * 6) / 7) * PR) / PR : 0;
  // Trocar de vista ("Lista | Mês"): o Mês começa no topo; a lista volta a "Hoje" (no mês corrente).
  const changeView = (v, quiet) => {
    if (!quiet) select();
    viewRef.current = v;
    scrollRef.current?.scrollTo({ y: 0, animated: false });   // a outra vista começa no topo; "Hoje" ou o dia escolhido vêm depois
    if (v === 'list') { rowYRef.current = {}; todayYRef.current = null; needTodayRef.current = isCurrentMonth && !pendingRef.current; }
    setView(v);
  };
  changeViewRef.current = changeView;
  // Tocar num dia do Mês: volta à lista com esse dia aberto, e a lista vai até ele quando a sua linha aparecer.
  const pickFromGrid = (iso) => { pendingRef.current = iso; setOpenIso(iso); changeView('list'); };
  const toneOf = (kind) => (kind === 'voo' ? C.flight : kind === 'terra' ? C.ground : (kind === 'fer' || kind === 'doe') ? C.neutral : null);
  // Uma célula: cor do tipo · número (hoje = círculo de tinta) · etiqueta (código; lua) · o bloco · os dois pontos · o ponto laranja.
  const renderCell = (c) => {
    const d = duties[c.iso];
    const isDuty = valid(d);
    const nSvc = isDuty && Array.isArray(d.extra) ? d.extra.length + 1 : 1;
    const abs = !isDuty ? dayAbs[c.iso] : null;
    const bg = toneOf(c.kind);
    const a11y = [
      `${c.day} ${monthName}`,
      c.today ? l('hoje', 'today') : null,
      isDuty ? `${nSvc > 1 ? `${nSvc} ${l('serviços', 'duties')}: ` : ''}${kindLabel(d.kind || 'flight')}${(d.kind || 'flight') === 'flight' && d.route ? ` ${d.route}` : ''}` : abs ? extraLabel(abs.type) : l('sem serviço', 'no duty'),
      c.ns ? l('pernoita', 'night stop') : null,
      c.joinR ? l('continua no dia seguinte', 'continues the next day') : null,
      c.dirty ? l('por sincronizar', 'pending sync') : null,
    ].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity key={c.iso} activeOpacity={0.7} style={[s.cell, { width: cellW }, c.two ? s.cellTwo : null, bg ? { backgroundColor: bg } : null, c.joinR ? s.joinR : null, c.joinL ? s.joinL : null]}
        accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ selected: c.sel }}
        accessibilityHint={l('Abre o dia na agenda', 'Opens the day in the list')}
        onPress={() => pickFromGrid(c.iso)}>
        {c.joinR && bg ? <View style={[s.bridge, { backgroundColor: bg }]} pointerEvents="none" /> : null}
        <View style={[s.num, c.today ? { backgroundColor: C.ink } : null]}>
          <Text style={[TXT.bodyStrong, s.numTxt, { color: c.today ? C.sheet : (bg ? CARD.onCard : C.ink) }]} allowFontScaling={false}>{c.day}</Text>
        </View>
        {c.code ? (
          <View style={s.tagRow}>
            <Text style={[TXT.tag, { color: c.kind === 'fer' || c.kind === 'doe' ? C.ink : CARD.onCard }]} numberOfLines={1} allowFontScaling={false}>{c.code}</Text>
            {c.ns ? <Icon name="moon" size={10} color={CARD.onCard} /> : null}
          </View>
        ) : <View style={s.tagRow} />}
        {c.two ? (
          <View style={s.dots} pointerEvents="none">
            <View style={[s.dot, { backgroundColor: CARD.onCardSub }]} /><View style={[s.dot, { backgroundColor: CARD.onCardSub }]} />
          </View>
        ) : null}
        {c.sel ? <View style={[s.selRing, { borderColor: C.ink }, c.joinR ? s.joinR : null, c.joinL ? s.joinL : null]} pointerEvents="none" /> : null}
        {c.dirty ? <View style={[s.pend, { backgroundColor: C.alert, borderColor: C.sheet }]} pointerEvents="none" /> : null}
      </TouchableOpacity>
    );
  };

  // O € de cada dia (os dias feitos mostram o que renderam): a MESMA função e o MESMO índice do total do mês (serviceMoney;
  // auditoria L2, L5 e L10, bloco 6) — os serviços do dia e a pernoita.
  const dayMoney = (iso) => {
    const d = duties[iso];
    if (!valid(d)) return null;
    const aeD = aeAt(iso), cat = crewAt(iso).category;
    if (!aeD || !cat) return null;
    const svcs = [d, ...(Array.isArray(d.extra) ? d.extra : [])].filter(Boolean);
    let tot = 0;
    svcs.forEach((sv) => {
      const mo = serviceMoney(aeD, cat, sv, { date: iso, fleet: crewAt(iso).fleet, daySvcs: svcs, baseAt: homeBaseAt, duties });
      if (mo) tot += (mo.perDiem || 0) + (mo.other && mo.other.eur != null ? mo.other.eur : 0) + (mo.positioning || 0) + (mo.nightStop || 0);
    });
    return tot || null;
  };

  const rcCounts = rosterChanges?.counts;
  const lsCount = liveSync ? Object.keys(liveSync).length : 0;

  // ── O que as linhas abrem (ctx = o dia: { iso, nsSt, nsHotel }) ──
  const onCardOpen = (o, ctx = {}) => {
    if (!o) return;
    select();
    const iso = ctx.iso;
    if (o.to === 'detail') navigation.navigate('DutyDetail', o.idx ? { date: iso, idx: o.idx } : { date: iso });
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

  // ── A AGENDA (o que vai para onde decide-o data/escalaDay.js · agendaRows) ──
  const rows = agendaRows({ ym, duties, absences: absTypes, today, money: dayMoney, kindLabel, fmtEur, lang });
  const toggleDay = (iso) => {
    select();
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpenIso((cur) => (openDay === iso ? 'none' : iso));
  };
  // O dia aberto: a coluna da data e as linhas finas de cada serviço (a pernoita, as compensações, o aviso das férias).
  const renderOpen = (iso) => {
    const duty = valid(duties[iso]) ? duties[iso] : null;
    const abs = dayAbs[iso];
    const d = Number(iso.slice(8, 10)), wd = (lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'])[new Date(`${iso}T00:00:00`).getDay()];
    const col = (
      <TouchableOpacity onPress={() => toggleDay(iso)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={l(`Fechar o dia ${d}`, `Close day ${d}`)}>
        <DayCol day={d} wd={wd} today={iso === today} C={C} />
      </TouchableOpacity>
    );
    let body;
    if (!duty) {
      const absEur = abs ? extraEur(abs.type, crewAt(iso).category, iso) : null;
      body = abs
        ? cardsOf([{ t: 'lines', id: 'abs', color: 'neutral', kind: extraLabel(abs.type), rows: absEur != null ? [{ k: l('Paga neste dia', 'Pays on this day'), v: fmtEur(absEur) }] : [],
            note: l('Marcado nos extras do mês.', 'Marked in the month’s extras.'), link: { label: l('Apagar dos extras', 'Remove from extras'), open: { to: 'rmAbsAsk', id: abs.id } } }], { iso })
        : cardsOf([{ t: 'slim', id: 'off', color: 'neutral', title: l('Folga', 'Day off'), sub: l('Sem serviço neste dia.', 'No duty on this day.') }], { iso });
    } else {
      const ordered = orderServices(duty);
      const aeD = aeAt(iso), catD = crewAt(iso).category;
      const services = [duty, ...(Array.isArray(duty.extra) ? duty.extra : [])];
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
      const cards = dayCards({ iso, ordered, open: false, money, kindLabel, cityOf, nightStop: nsSt ? { station: nsSt, hotel: nsHotel ? nsHotel.name : null } : null, postFlightMin: postFlightMin || 0, lang, locale, fmtEur });
      body = (
        <>
          {/* Havia uma AUSÊNCIA marcada neste dia, mas afinal há serviço → não é "efetivamente gozada" (BTE). */}
          {abs ? cardsOf([{ t: 'lines', id: 'absWarn', color: 'warn', kind: abs.type === 'vacDays' ? l('Tinhas férias marcadas', 'You had leave marked') : l('Tinhas doença marcada', 'You had sick leave marked'), rows: [],
            note: abs.type === 'vacDays'
              ? l('Como voaste, este dia não é férias gozadas e o suplemento não paga aqui. Marca as férias noutro dia para o receberes.', 'Since you flew, this isn’t taken leave — the supplement isn’t paid here. Re-mark the leave on another day to get it.')
              : l('Como voaste, este dia não conta como doença.', 'Since you flew, this day doesn’t count as sick leave.'),
            link: { label: l('Remover deste dia', 'Remove from this day'), open: { to: 'rmAbs', id: abs.id } } }], ctx) : null}
          {cardsOf(cards, ctx)}
          {/* Extras PAGOS neste dia trabalhado (SNC/RDP) — compensações por cima do serviço. */}
          {dayOv[iso] ? cardsOf(dayOv[iso].map((e) => { const v = extraEur(e.type, catD, iso); return { t: 'slim', id: `ov${e.id}`, color: 'neutral', title: extraLabel(e.type), sub: l('compensação deste dia', 'this day’s compensation'), value: v != null ? `+${fmtEur(v)}` : null, gain: v != null }; }), ctx) : null}
        </>
      );
    }
    return <View style={s.openRow}>{col}<View style={s.openCol}>{body}</View></View>;
  };
  // 2B · O MÊS (dentro da folha): a grelha (B1, com os dois pontos) e, por baixo, a legenda das cores e dos símbolos.
  const legCell = (bg, code, o = {}) => (
    <View style={[s.legCell, { backgroundColor: bg }, o.border ? { borderWidth: 1, borderColor: C.round } : null, o.two ? s.legCellTwo : null, o.style || null]}>
      <Text style={[TXT.tag, { color: CARD.onCard }]} allowFontScaling={false}>{code}</Text>
      {o.moon ? <Icon name="moon" size={10} color={CARD.onCard} /> : null}
      {o.two ? <View style={s.legDots}><View style={[s.dot, { backgroundColor: CARD.onCardSub }]} /><View style={[s.dot, { backgroundColor: CARD.onCardSub }]} /></View> : null}
      {o.pend ? <View style={[s.legPend, { backgroundColor: C.alert }]} /> : null}
    </View>
  );
  const legItem = (sw, txt, key) => (
    <View key={key} style={s.legIt}>{sw}<Text style={[TXT.label, s.legTxt, { color: C.soft }]} numberOfLines={2}>{txt}</Text></View>
  );
  const renderMonth = () => (
    <View>
      <View style={s.wkhead}>{WD.map((w, i) => <Text key={i} style={[TXT.tag, s.wkh, { width: cellW, color: C.tabSub }]} allowFontScaling={false}>{w}</Text>)}</View>
      <View style={s.cal} onLayout={(e) => { const w = e.nativeEvent.layout.width; setGridW((p) => (Math.abs(w - p) > 0.5 ? w : p)); }}>
        {cellW ? (
          <>
            {Array.from({ length: G.firstWeekday }).map((_, i) => <View key={`lead${i}`} style={[s.cellBlank, { width: cellW }]} />)}
            {G.cells.map(renderCell)}
          </>
        ) : null}
      </View>
      <View style={[s.legend, { backgroundColor: C.neutral }]} accessible accessibilityLabel={l('Legenda: areia, voo; lilás, serviço em terra; neutro, férias ou baixa; lua, pernoita fora; dois pontos, dois serviços no dia; dias juntos, rotação seguida; círculo, hoje; ponto laranja, por sincronizar.', 'Legend: sand, flight; lilac, ground duty; neutral, leave or sick; moon, night stop away; two dots, two duties that day; joined days, a trip; circle, today; orange dot, pending sync.')}>
        {legItem(legCell(C.flight, 'LGW'), l('Voo · destino', 'Flight · destination'), 'voo')}
        {legItem(legCell(C.ground, 'SBY'), l('Serviço em terra', 'Ground duty'), 'terra')}
        {legItem(legCell(C.neutral, absCode('vacDays'), { border: true }), l('Férias · baixa', 'Leave · sick'), 'fer')}
        {legItem(legCell(C.flight, 'OPO', { moon: true }), l('Pernoita fora', 'Night stop away'), 'ns')}
        {legItem(legCell(C.flight, 'OPO', { two: true }), l('2 serviços no dia', '2 duties that day'), 'two')}
        {legItem(<View style={s.tagRow}>{legCell(C.flight, 'FNC', { style: s.legJoinL })}{legCell(C.flight, 'FNC', { style: s.legJoinR })}</View>, l('Rotação seguida', 'Trip'), 'join')}
        {legItem(<View style={[s.legToday, { backgroundColor: C.ink }]}><Text style={[TXT.tag, { color: C.sheet }]} allowFontScaling={false}>{Number(today.slice(8, 10))}</Text></View>, l('Hoje', 'Today'), 'hoje')}
        {legItem(legCell(C.flight, 'FNC', { pend: true }), l('Por sincronizar', 'Pending sync'), 'pend')}
      </View>
    </View>
  );
  const renderAgenda = () => {
    // B4 · um mês sem escala nenhuma: o estado vazio, com a ação principal.
    if (!monthDutyDays.length && !monthHasAbs) {
      return (
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
    }
    return rows.map((r) => {
      if (r.t === 'head') {
        return (
          <View key={`h-${r.id}`} onLayout={r.id === 'today' ? (e) => { todayYRef.current = e.nativeEvent.layout.y; scrollToTodayOnce(); } : undefined}>
            <Text style={[TXT3.kind, s.head, { color: C.tabSub }]} accessibilityRole="header">{r.text}</Text>
          </View>
        );
      }
      const key = r.t === 'off' ? `o-${r.from}` : `b-${r.iso}`;
      const keepY = (e) => {
        const yy = e.nativeEvent.layout.y, pend = pendingRef.current;
        rowYRef.current[r.t === 'off' ? r.from : r.iso] = yy;
        if (pend && (r.t === 'off' ? (pend >= r.from && pend <= r.to) : pend === r.iso)) {
          pendingRef.current = null;
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, yy - SPACE.sm), animated: !reduceMotion }));
        }
      };
      if (r.t === 'off') return <View key={key} onLayout={keepY}><OffBar row={r} C={C} l={l} /></View>;
      return (
        <View key={key} onLayout={keepY}>
          {openDay === r.iso ? renderOpen(r.iso) : <DayBar row={r} C={C} onPress={() => toggleDay(r.iso)} l={l} />}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']} onTouchStart={gridTip ? dismissGridTip : undefined}>
      <View style={s.body} {...monthPan.panHandlers}>
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
            {/* O topo do Início: "Novembro 2026 ▾" abre o ano em meses; à direita, ler a escala. */}
            <HomeTop top={top} C={C} size={giant.size} onPill2={() => { select(); setPickYear(y); setMonthPickerOpen(true); }} right={topRight} rightW={topRightW} l={l} />
            {/* A FOLHA: a escala em agenda (o mês corrente abre em "Hoje"; o que já passou fica por cima). */}
            <View style={[s.sheet, { backgroundColor: C.sheet }]}>
              {/* 2B · "Lista | Mês" (B11, a pílula desliza): as duas vistas da mesma escala, no mesmo sítio. */}
              <View style={s.segWrap}>
                <Segmented C={C} reduce={reduceMotion} value={view} onChange={changeView}
                  options={[{ value: 'list', label: l('Lista', 'List') }, { value: 'month', label: l('Mês', 'Month') }]} />
              </View>
              <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={[s.list, { paddingBottom: tabSpace + SPACE.lg }]} showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.caption} colors={[C.caption]}
                    onRefresh={async () => {
                      setRefreshing(true); const t0 = Date.now();
                      try { await checkRosterChanges?.(); } catch { /* ignora */ }
                      const dt = Date.now() - t0; if (dt < 600) await new Promise((r) => setTimeout(r, 600 - dt));
                      setRefreshing(false);
                    }} />}>
                {view === 'month' ? renderMonth() : renderAgenda()}
                <Text style={[TXT.caption, s.foot, { color: C.caption }]}>{t('duties.syncHint', lang)}</Text>
              </ScrollView>
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

  // A folha da agenda (branca, por cima do fundo, como no Início)
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  list: { paddingHorizontal: SPACE.md, paddingTop: SPACE.md, gap: SPACE.sm },
  head: { paddingHorizontal: SPACE.xs, paddingTop: SPACE.sm },
  openRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md, paddingLeft: SPACE.md },
  openCol: { flex: 1, minWidth: 0, gap: SPACE.s },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: RADIUS.xxl, paddingVertical: SPACE.lgPlus, paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  privRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  privTxt: { fontFamily: PELE_FONT.bodyBold },
  foot: { marginTop: SPACE.md, paddingHorizontal: SPACE.xs },

  // A grelha do mês (na folha do botão do calendário) — B1
  wkhead: { flexDirection: 'row', gap: GAP, marginBottom: SPACE.xs },
  wkh: { textAlign: 'center' },
  cal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: ROW_GAP },
  cellBlank: { height: ROW_H },
  cell: { height: ROW_H, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACE.xxs, paddingBottom: SPACE.xs },
  // Dois serviços no dia: dois pontos no fundo da célula (escolha C do Nuno, 2026-11-13, design/escala-dois-servicos.html).
  cellTwo: { paddingTop: 0, paddingBottom: SPACE.sm },
  dots: { position: 'absolute', left: 0, right: 0, bottom: 2, flexDirection: 'row', justifyContent: 'center', gap: SPACE.xs },
  dot: { width: 4, height: 4, borderRadius: RADIUS.pill },
  joinR: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  joinL: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  bridge: { position: 'absolute', top: 0, bottom: 0, right: -(GAP + 1), width: GAP + 2 },
  num: { width: 24, height: 24, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  numTxt: { fontVariant: ['tabular-nums'] },
  tagRow: { minHeight: 14, flexDirection: 'row', alignItems: 'center', gap: SPACE.xxs },
  selRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.sm, borderWidth: 2 },
  pend: { position: 'absolute', top: 3, left: 3, width: 7, height: 7, borderRadius: RADIUS.pill, borderWidth: 1.5 },
  segWrap: { paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.xs },
  // a legenda (debaixo da grelha): as cores e os símbolos, numa caixa neutra em duas colunas
  legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: SPACE.sm, borderRadius: RADIUS.xl, padding: SPACE.md, marginTop: SPACE.md },
  legIt: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingRight: SPACE.xs },
  legTxt: { flex: 1 },
  legCell: { minWidth: 40, height: 24, paddingHorizontal: SPACE.xs, borderRadius: RADIUS.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.xxs },
  legCellTwo: { paddingBottom: SPACE.s },
  legDots: { position: 'absolute', left: 0, right: 0, bottom: 2, flexDirection: 'row', justifyContent: 'center', gap: SPACE.xs },
  legJoinL: { minWidth: 30, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  legJoinR: { minWidth: 30, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: -1 },
  legToday: { width: 24, height: 24, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  legPend: { position: 'absolute', top: 3, left: 3, width: 7, height: 7, borderRadius: RADIUS.pill },

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
