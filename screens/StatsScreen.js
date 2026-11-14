import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, RADIUS, SPACE, CARD, TXT, TXT3 } from '../data/constants';
import Icon from '../components/Icon';
import PeleSheet from '../components/PeleSheet';
import SheetHeader from '../components/SheetHeader';
import IconButton from '../components/IconButton';
import LineCard, { LineRows } from '../components/LineCard';
import { Field } from '../components/Field';
import { WideButton } from '../components/PillButton';
import { HomeTop, HomeCards, pillWidth } from '../components/HomeCards';
import { topGiant } from '../data/homeCards';
import YearShareCard from '../components/YearShareCard';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { useScrollToTop, useIsFocused } from '@react-navigation/native';
import useEnter from '../hooks/useEnter';
import useReduceMotion from '../hooks/useReduceMotion';
import { yearStats, monthStats, availableYears, ANNUAL_FLIGHT_LIMIT_H, STAT_KINDS } from '../data/stats';
import { annualLabel } from '../data/perdiem';
import { yearRadiation, RADIATION_LIMITS_MSV } from '../data/radiation';
import { provaFor } from '../data/prova';
import ProvaSheet from '../components/ProvaSheet';
import { monthAudit } from '../data/audit';
import AuditSheet from '../components/AuditSheet';
import { yearCount, eventDateLabel } from '../data/aeEvents';
import { computeFlightTime, computeDutyTime, sumCalendarYearMin } from '../ftl';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, isoDay } from '../data/appContext';
import AeLimitsSection from '../components/AeLimitsSection';
import AeLimitSheet from '../components/AeLimitSheet';
import { evaluateTapLimits } from '../ae/tapLimits';
import AsyncStorage from '../data/secureStorage';

// Cor do estado da janela FTL — o mapa das cores (design-system §14): PASSA o limite (> 100 %) vermelho · PERTO (≥ 85 %, a
// mesma regra do Início e de data/today.js) laranja · DENTRO sem cor (tinta: cockpit escuro). Antes era vermelho aos 90 %,
// antes de passar, e verde em tudo o resto — o verde é só do dinheiro. barColor pinta barras e círculos; pctColor o texto.


// Barra que enche de 0 → valor ao montar (mesma sensação das barras da Home).
function GrowBar({ ratio, color, track, fill, delay = 200 }) {
  const reduce = useReduceMotion();
  const target = Math.max(0, Math.min(1, ratio || 0));
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { w.setValue(target); return; }
    Animated.timing(w, { toValue: target, duration: 800, delay, useNativeDriver: false }).start();
  }, [target, w, delay, reduce]);
  return (
    <View style={track}>
      <Animated.View style={[fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// Barra vertical (gráfico mensal) que cresce em altura ao montar.
function MonthBar({ ratio, color, delay }) {
  const reduce = useReduceMotion();
  const target = Math.max(0.02, Math.min(1, ratio || 0));
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { h.setValue(target); return; }
    Animated.timing(h, { toValue: target, duration: 700, delay, useNativeDriver: false }).start();
  }, [target, h, delay, reduce]);
  return <Animated.View style={{ width: '100%', maxWidth: 20, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: color, height: h.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] }) }} />;
}

// Estatísticas (PELE) — dial adaptativo no topo (Ganhos com AE · Segurança sem AE) + cards que
// abrem folhas de detalhe. Re-skin: TODOS os cálculos (data/stats.js · ftl · AE) ficam intactos.
export default function StatsScreen({ navigation }) {
  const { lang, duties, dayLog, ae: aeNow, aeAt, crewAt, companyHistory, companyAt, airlines, homeBaseAt, crewCategory, crewContract, crewFleet, postFlightMin, crewHistory, company, aeEvents, vacationDaysYear, user, isPilot, base, rosterLog, serviceStart, serviceStartExact, largada, lifestyle } = useContext(AppContext);
  const l = (pt, en) => (lang === 'en' ? en : pt);
  const locale = lang === 'en' ? 'en-GB' : 'pt-PT';
  const tabSpace = useTabBarSpace();
  const isFocused = useIsFocused();
  const statsScrollRef = useRef(null);
  useScrollToTop(statsScrollRef);   // re-tocar na aba Números → volta ao topo (convenção iOS)
  const seg = useEnter();

  const [scope, setScope] = useState('month');   // 'year' | 'month' — abre no mês (N1, 2026-11-14; era o ano)
  const isYear = scope === 'year';
  const [sheet, setSheet] = useState(null);            // folha de detalhe aberta: 'seg' | 'voo' | 'corpo'
  const [prova, setProva] = useState(null);            // folha da PROVA ("a lei deste número")
  const provaCtx = { companySlug: company && company.slug, companyName: company && company.name, isPilot, lang };
  const [auditOpen, setAuditOpen] = useState(null);    // folha da AUDITORIA (radar) — guarda o ym auditado
  const [shareOpen, setShareOpen] = useState(false);   // cartão "Ano de voo" partilhável

  // (avatar saiu do cabeçalho 2026-07-09 — o Perfil vive só no Início; identidade mora na base)

  // Seletor de ANO (anos com escala + o corrente)
  const years = useMemo(() => {
    const ys = availableYears(duties);
    const cy = String(new Date().getFullYear());
    if (!ys.includes(cy)) ys.unshift(cy);
    return ys;
  }, [duties]);
  const [year, setYear] = useState(years[0]);

  // Navegador de MÊS — começa no corrente; não avança para lá do mês atual.
  const nowYm = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const [ym, setYm] = useState(nowYm);
  const shiftMonth = (delta) => {
    const [Y, M] = ym.split('-').map(Number);
    const d = new Date(Y, M - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const monthName = (() => {
    const [Y, M] = ym.split('-').map(Number);
    const x = new Date(Y, M - 1, 1).toLocaleDateString(locale, { month: 'long' });
    return x.charAt(0).toUpperCase() + x.slice(1);
  })();

  // O AE do período mostrado (linha do tempo do contrato, 2026-11-03): o mês → o acordo da companhia
  // DESSE mês; o ano → o do último mês com acordo (a soma do ano usa o de cada mês, via `aeAt`).
  // `companyHistory` nas dependências = o que faz o `aeAt` mudar.
  const ae = useMemo(() => {
    if (!isYear) return aeAt(ym);
    for (let mo = 12; mo >= 1; mo--) { const a = aeAt(`${year}-${String(mo).padStart(2, '0')}`); if (a) return a; }
    return null;
  }, [isYear, ym, year, aeNow, companyHistory]); // eslint-disable-line react-hooks/exhaustive-deps
  // A companhia do mês mostrado (o ano mostra a atual).
  const coView = (() => {
    if (isYear) return company;
    const c = companyAt(ym).company;
    return (airlines || []).find((a) => a.id === c || a.slug === c) || company;
  })();
  const st = useMemo(
    () => isYear
      ? yearStats(duties, { year, ae, aeAt, category: crewCategory, contract: crewContract || '12/12', crewHistory, companyHistory, fleet: crewFleet, postFlightMin, events: aeEvents, baseAt: homeBaseAt, serviceStart, startExact: serviceStartExact, largada, lifestyle, isPilot })
      : monthStats(duties, { ym, ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, companyHistory, fleet: crewFleet, postFlightMin, events: aeEvents, baseAt: homeBaseAt, serviceStart, startExact: serviceStartExact, largada, lifestyle, isPilot }),
    [isYear, duties, year, ym, ae, aeNow, companyHistory, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, serviceStart, serviceStartExact, homeBaseAt, largada, lifestyle, isPilot], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Saldo de férias do ANO (direito anual, Art. 238.º CT) — HONESTO: só dias efetivamente gozados
  // (um dia com voo por cima não conta → volta ao "por marcar"). Só p/ perfis com férias no AE.
  const hasVac = !!(ae && Array.isArray(ae.EXTRA_KINDS) && ae.EXTRA_KINDS.some((k) => k.id === 'vacDays'));
  const vacQuota = Math.max(1, Math.floor(+vacationDaysYear) || 22);
  const vacTaken = hasVac ? yearCount(aeEvents || [], year, 'vacDays', duties) : 0;
  const vacLeft = Math.max(0, vacQuota - vacTaken);

  // Limites FTL cumulativos ATUAIS (janelas rolantes a esta data) — vieram do Início.
  // Independentes do mês/ano selecionado (é o consumo agora). `dayLog` = store do motor FTL.
  const limits = useMemo(() => {
    const flight = computeFlightTime(dayLog);   // voo: 100 h/28 d · ano civil · 12 meses
    const duty = computeDutyTime(dayLog);       // serviço: 60/110/190 h em 7/14/28 dias
    const has = Object.values(dayLog || {}).some((d) => (d?.voo > 0) || (d?.servico > 0) || (d?.vooMin > 0) || (d?.servicoMin > 0));
    return { rows: [...flight.map((w) => ({ ...w, grp: 'voo' })), ...duty.map((w) => ({ ...w, grp: 'serv' }))], has };
  }, [dayLog]);
  // Limites do ORO.FTL.210 em minutos inteiros (auditoria A-172/A-262): a folga nunca se arredonda para cima, e um
  // excesso de minutos não pode aparecer como "60 / 60 h" — mostra-se em h:mm.
  const hmS = (m) => `${Math.floor(Math.max(0, m) / 60)}:${String(Math.max(0, m) % 60).padStart(2, '0')}`;
  const doneTxt = (w) => (w.over && Math.round(w.done) <= w.limit) ? hmS(w.doneMin) : String(Math.round(w.done));
  const leftTxt = (w) => (w.over
    ? `${l('excede', 'over by')} ${hmS(w.overMin)}`
    : `${l('faltam', 'left')} ${w.headroomMin >= 60 ? `${Math.floor(w.headroomMin / 60)} h` : hmS(w.headroomMin)}`);
  const limLabel = (w) => w.id === 'year' ? l('Ano civil', 'Calendar year') : w.id === '12m' ? l('12 meses', '12 months') : `${w.days} ${l('dias', 'days')}`;
  const shortLim = (w) => `${w.grp === 'voo' ? l('Voo', 'Flt') : l('Serv', 'Duty')} ${w.id === 'year' ? l('ano', 'yr') : w.id === '12m' ? '12m' : `${w.days}d`}`;

  // Formatação
  const nf = (n) => Number(n).toLocaleString(locale);
  const fmtH = (h) => `${Number(h).toLocaleString(locale, { maximumFractionDigits: 1 })} h`;
  const fmtEur0 = (n) => {
    if (n == null) return '—';
    const [i, d] = Number(n).toFixed(2).split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? `€${g}.${d}` : `${g},${d} €`;
  };
  const monthAbbr = (i) => new Date(2020, i, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '').slice(0, 3);
  const kindLabel = (k) => t('duties.kind.' + k, lang);

  // 900 h no ano civil (ORO.FTL.210(b)(2)) em minutos: a barra pára nos 100 %, o texto não (A-262). O limite conta por DIA LOCAL
  // (um voo de 31/12 que passa a meia-noite conta a parte de 1/1 no ano seguinte — bloco 8b) → a mesma soma do 210 do Início.
  // O número do mosaico e da folha "Voo" é esta soma; as barras por mês contam pelo dia do serviço (como um logbook).
  const legalYearMin = isYear ? sumCalendarYearMin(dayLog || {}, 'voo', new Date(+year, 6, 1)) : st.flightMin;
  const yearFlightGap = { over: legalYearMin > ANNUAL_FLIGHT_LIMIT_H * 60, overMin: Math.max(0, legalYearMin - ANNUAL_FLIGHT_LIMIT_H * 60), headroomMin: Math.max(0, ANNUAL_FLIGHT_LIMIT_H * 60 - legalYearMin) };
  const flightPct = Math.floor((legalYearMin / (ANNUAL_FLIGHT_LIMIT_H * 60)) * 100);
  const flightRatio = Math.min(1, legalYearMin / (ANNUAL_FLIGHT_LIMIT_H * 60));
  // O número ao lado da percentagem do teto é a MESMA soma (ano civil por dia local) — senão, num voo de 31/12, "900,4 h · 99 %".
  const flightShownH = isYear ? Math.floor(legalYearMin / 6) / 10 : st.flightHours;   // trunca, como a percentagem (899,95 h ≠ "900 h · 99 %")
  const chartData = isYear ? st.months : st.days;   // 12 meses · ou dias do mês
  const maxBar = Math.max(1, ...chartData.map((m) => m.flightMin));
  const kindsPresent = STAT_KINDS.filter((k) => st.byKind[k] > 0);
  const svcTotal = STAT_KINDS.reduce((a, k) => a + (st.byKind[k] || 0), 0);   // nº de SERVIÇOS (≥ dias, multi-serviço)
  const aeBlock = isYear ? st.aeYtd : st.aeMonth;   // bloco AE conforme o âmbito
  const nowD = new Date();
  const empty = st.count === 0;

  // ── Modo do dial: com AE = Ganhos · sem AE = Segurança ──
  const mode = ae ? 'money' : 'safety';
  const A = aeBlock || {};
  const total = A.total || 0;
  const extrasSum = (A.extras || 0) + (A.events || 0) + (A.cash || 0);
  // Mês (ou ano) SEM serviços mas com acordo: o vencimento base paga-se na mesma → o bloco do dinheiro fica e só as horas dão lugar
  // à nota "sem escala" (decisão do Nuno, 2026-11-11; refs Cash App e Chime: o número no topo, uma frase e um botão por baixo).
  const moneyOnly = empty && mode === 'money' && total > 0;
  // 9/3 e sazonais sem as datas de atividade: a base do mês é incerta (Cl. 48.ª/80.ª; bloco 5) — diz-se o intervalo.
  // O motivo vem dos próprios meses (stats.js, `uncertainReasons`), não da companhia atual (um ano pode ter duas).
  const reasons = isYear ? (A.uncertainReasons || []) : (A.baseRange ? (A.baseRange.reasons || [A.baseRange.reason || 'activity']) : []);
  const whyTap = l('atualização do vencimento base por confirmar', 'base pay update not confirmed'), whyAct = l('faltam as datas de atividade', 'activity dates missing');
  const whyAdm = l('falta o dia em que entraste', 'the day you joined is missing');
  const whySick = l('nos dias de baixa a TAP paga o líquido ou completa o subsídio da Segurança Social', 'on sick days TAP pays the net amount or tops up the social-security benefit');
  const uncWhy = [reasons.some((r) => /^tap/.test(r) && r !== 'tapSick') ? whyTap : null, reasons.includes('tapSick') ? whySick : null, reasons.includes('admission') ? whyAdm : null,
    reasons.some((r) => !/^tap/.test(r) && r !== 'admission') ? whyAct : null].filter(Boolean).join('; ') || whyAct;
  const baseUnc = !isYear && A.baseRange ? ` · ${l('incerto', 'uncertain')}: ${fmtEur0(A.baseRange.min)} ${l('a', 'to')} ${fmtEur0(A.baseRange.max)} (${uncWhy})` : (isYear && A.uncertain ? ` · ${l('incerto', 'uncertain')} (${uncWhy})` : '');
  const baseSub = (isYear ? `${l('salário base acumulado', 'accrued base salary')} · ${st.aeYtd?.monthsElapsed || 0} ${l('meses', 'months')}` : `${l('salário base', 'base salary')} · ${l(monthName.toLowerCase(), monthName)}`) + baseUnc;
  // Mês sem tabela do acordo (antes da 1.ª tabela publicada, ou antes da admissão): não há € — diz-se porquê (bloco 5).
  // TAP: o subsídio de férias paga-se no mês antes das férias; sem férias registadas o mês não se sabe (fica fora da soma).
  const pendTxt = (isYear && A.pendingAnnual && A.pendingAnnual.length)
    ? (() => { const pa = A.pendingAnnual[0]; const v = pa.max > pa.eur ? `${fmtEur0(pa.eur)} ${l('a', 'to')} ${fmtEur0(pa.max)}` : fmtEur0(pa.eur); return l(`Subsídio de férias de ${v}: entra no mês antes das tuas férias — regista-as para ele aparecer.`, `Holiday allowance of ${v}: paid the month before your leave — log your leave for it to show.`); })()
    : null;
  // TAP: sem a data de entrada não há anuidades nem senioridade (Cl. 4.ª/5.ª) — diz-se que falta.
  const senTxt = (A.seniority && A.seniority.unknown) || (isYear && A.seniorityUnknown)
    ? l('Sem a data de entrada na companhia: a base fica sem as anuidades e a senioridade. Junta-a no Perfil.', 'No company start date: the base leaves out service-year pay. Add it in Profile.')
    : (A.seniority && A.seniority.fromEntry && (A.seniority.anuidades || A.seniority.anos))
      ? l('Anuidades contadas desde a entrada na companhia; o acordo conta-as desde a largada. Junta a data da largada no Perfil.', 'Service years counted from your company start; the agreement counts them from your first line release. Add your release date in Profile.')
      : null;
  const noTableTxt = (ae && !aeBlock) ? l('Sem valores do acordo para este período: a tabela publicada só começa depois, ou ainda não estavas na companhia.', 'No agreement values for this period: the published table starts later, or you had not joined yet.') : (isYear && A.noTable ? l('Há meses deste ano sem tabela do acordo: não entram na soma.', 'Some months this year have no agreement table: they are left out.') : null);
  const moneyOpts = [
    { k: 'total', nm: l('Total', 'Total'), ic: 'stats', val: total },
    { k: 'base', nm: l('Base', 'Base'), ic: 'wallet', val: A.base || 0, sub: baseSub },
    (A.perDiem > 0) && { k: 'diem', nm: l('Per diem', 'Per diem'), ic: 'plane', val: A.perDiem, sub: `${st.flights} ${l('voos', 'flights')} · ${st.sectors} ${l('setores', 'sectors')}` },
    // TAP: a estadia paga-se nos dias SEM voo (Cl. 7.ª/9.ª) — as noites fora não são o número de AC2/B (revisão do bloco 6).
    (A.nightStops > 0) && { k: 'pern', nm: l('Pernoitas', 'Night stops'), ic: 'bed', val: A.nightStops, sub: (ae && ae.PER_DIEM_BY_DAY) ? (isPilot ? l('estadia nos dias sem voo (per diem B, RRRGS Cl. 9.ª)', 'stay on days without flights (per diem B, RRRGS Cl. 9)') : l('estadia nos dias sem voo (AC2, RRRGS Cl. 7.ª)', 'stay on days without flights (AC2, RRRGS Cl. 7)')) : `${st.nightStops} ${l('paragens noturnas', 'night stops')}` },
    // Posicionamento (bloco 6): pilotos pelos setores (Art. 44.º); cabine pela tabela do Anexo I.18 — o acordo não diz onde acaba
    // o curto, por isso conta o curto e diz-se até onde pode ir.
    (A.positioning > 0) && { k: 'pos', nm: l('Posicionamento', 'Positioning'), ic: 'plane', val: A.positioning, sub: (!isYear && A.positioningMax > A.positioning) ? l(`o curto; até ${fmtEur0(A.positioningMax)} conforme a duração da viagem (Anexo I.18)`, `short rate; up to ${fmtEur0(A.positioningMax)} by trip length (App. I.18)`) : l('posicionamentos do período', 'positioning in the period') },
    // Subsídios e prestações que caem no período (bloco 6): Natal, férias, prestação de abril, permanência, retenção.
    (A.annual > 0) && { k: 'subs', nm: l('Subsídios', 'Allowances'), ic: 'wallet', val: A.annual, sub: [
      ...new Set((A.annualItems || []).map((it) => annualLabel(it, lang))),
    ].join(' · ') + ((A.annualItems || []).some((it) => it.incomplete) ? l(' — sem a média das variáveis, que o acordo não define', ' — without the variable-pay average, which the agreement does not define') : '') + ((A.annualItems || []).some((it) => it.suspension) ? (() => {
      // A regra do acordo quando tem prazo próprio (cabine easyJet: Cl. 86.ª, n.º 2); senão a do Código do Trabalho.
      const sp = (A.annualItems || []).find((it) => it.suspension && it.suspShort);
      return sp ? l(` · Natal proporcional: ${sp.suspShort.pt}`, ` · Christmas pro rata: ${sp.suspShort.en}`)
        : l(' · Natal proporcional: baixa de mais de um mês (CT arts. 263.º e 296.º)', ' · Christmas pro rata: sick leave over a month (Labour Code arts. 263 and 296)');
    })() : '')
      + (() => { const up = (A.annualItems || []).reduce((a, it) => a + (it.max > it.eur ? it.max - it.eur : 0), 0); if (!(up > 0)) return ''; const its = (A.annualItems || []).filter((it) => it.max > it.eur);
        // O que pode subir: a leitura do acordo (suspensão…), a atualização do VB da TAP e o dia em que entraste (ano da admissão).
        const raise = its.some((it) => it.tapRaise), adm = its.some((it) => it.admission), other = its.some((it) => it.suspension || (!it.tapRaise && !it.admission));
        const why = [other ? l('a leitura do acordo', 'how the agreement is read') : null, raise ? l('a atualização do vencimento base, por confirmar', 'the base pay update, not yet confirmed') : null,
          adm ? l('o dia em que entraste', 'the day you joined') : null].filter(Boolean).join(l(' e ', ' and '))
          + (its.some((it) => it.leaving) ? l(' (ano da saída: o acordo diz "proporcionalmente"; o Código do Trabalho, art. 245.º, dá também as férias vencidas)', ' (year of leaving: the agreement says "pro rata"; the Labour Code, art. 245, also gives the accrued leave)') : '');
        return l(` · até mais ${fmtEur0(up)} conforme ${why}`, ` · up to ${fmtEur0(up)} more depending on ${why}`); })() },
    ((extrasSum !== 0) || (!isYear && A.prestCompl)) && { k: 'extras', nm: l('Extras', 'Extras'), ic: 'plus', val: extrasSum, sub: l('escala (papéis · OFC) + eventos (DDO · doença; nos dias de baixa a base sai, CT art. 255.º)', 'roster (roles · OFC) + events (DDO · sick; on sick days the base is not paid, Labour Code art. 255)')
      // Pilotos TAP: a prestação complementar (Cl. 10.ª) — certa, ou "até" quando a disponibilidade está em dúvida.
      + ((!isYear && A.prestCompl) ? (A.prestCompl.eur > 0
        ? l(` · prestação complementar (Cl. 10.ª): ${A.prestCompl.days} dia(s), ${fmtEur0(A.prestCompl.eur)}`, ` · complementary pay (Cl. 10): ${A.prestCompl.days} day(s), ${fmtEur0(A.prestCompl.eur)}`)
        : l(` · prestação complementar (Cl. 10.ª): até ${fmtEur0(A.prestCompl.max)} — com férias ou baixa no mês, depende da disponibilidade`, ` · complementary pay (Cl. 10): up to ${fmtEur0(A.prestCompl.max)} — with leave or sickness in the month, it depends on availability`)) : '')
      + (() => { const eDelta = (A.extrasMax || 0) - (A.extras || 0) - (A.prestCompl ? A.prestCompl.max - A.prestCompl.eur : 0); return (!isYear && eDelta > 0) ? l(` · e-learning: até mais ${fmtEur0(eDelta)} (o acordo não diz se as 24 h contam as 8 primeiras)`, ` · e-learning: up to ${fmtEur0(eDelta)} more (the agreement does not say if the 24 h include the first 8)`) : ''; })() },
  ].filter(Boolean);

  // Janelas FTL como opções do dial da Segurança (filtradas pelo âmbito Mês/Ano; a 28 d de serviço = sempre).
  const safetyRows = limits.rows.map((w) => {
    const r = w.limit ? w.done / w.limit : 0;
    const when = (w.id === 'year' || w.id === '12m') ? 'ano' : (w.grp === 'serv' && w.days === 28) ? 'always' : 'mes';
    return { k: w.grp + (w.id || w.days), nm: shortLim(w), r, done: w.done, limit: w.limit, w, when };
  });
  const safetyVis = safetyRows.filter((o) => o.when === 'always' || o.when === (isYear ? 'ano' : 'mes'));
  const fullest = safetyRows.reduce((a, b) => (b.r > (a ? a.r : -1) ? b : a), null);   // janela mais cheia (card Segurança)

  // ── O PRIMEIRO ALERTA EXPLICADO (mockup design/primeiro-alerta.html, aprovado 2026-07-11) ──
  // Progressive disclosure (o padrão da dica do eCrew): a 1.ª vez NA VIDA DA CONTA que uma
  // janela FTL pinta (≥70%), nasce UMA nota a ensinar o vocabulário das cores — e nunca mais.
  // Ao nascer grava JÁ a flag mas fica em estado local a sessão toda (não pisca ao re-render);
  // a montagem seguinte lê a flag e cala-se. Sem "entendi", sem X — dispensa-se sozinha.
  const painted = !!(fullest && fullest.r >= 0.7);
  const [alertBaptism, setAlertBaptism] = useState(false);
  useEffect(() => {
    if (!painted || !user?.id) return;
    const k = `cp_alert_explained_${user.id}`;
    AsyncStorage.getItem(k).then((v) => {
      if (v) return;
      setAlertBaptism(true);
      AsyncStorage.setItem(k, '1').catch(() => {});
    }).catch(() => {});
  }, [painted, user?.id]);
  // ── Radiação cósmica ESTIMADA (fase 2, mockup design/radiacao-corpo.html v2) ──
  // Motor puro data/radiation.js (golden 34+ vs CARI-7/ICRU-84): dose derivada da escala,
  // no device, NUNCA guardada. "≈" = a língua de estimativa da casa. Cor (o mapa, §14): laranja a partir de 85 % do limiar
  // da categoria A (6 mSv/ano — Diretiva 2013/59/Euratom, art. 40.º: é uma classificação, não um limite) · vermelho só acima do
  // LIMITE de dose (20 mSv/ano, art. 9.º). Antes era vermelho aos 90 % dos 6 mSv, que não é limite nenhum.
  const rad = useMemo(() => yearRadiation(duties || {}, isYear ? { year: +year } : { ym: st.ym }), [duties, isYear, year, st.ym]);
  const radYear = useMemo(() => (isYear ? null : yearRadiation(duties || {}, { year: Number(String(st.ym || '').slice(0, 4)) })), [duties, isYear, st.ym]);
  const fmtMsv = (v) => (v || 0).toLocaleString(locale, { minimumFractionDigits: v < 0.095 ? 2 : 1, maximumFractionDigits: v < 0.095 ? 2 : 1 });
  const radTone = isYear && rad.mSv > RADIATION_LIMITS_MSV.occupational ? PELE.red
    : isYear && rad.mSv >= 0.85 * RADIATION_LIMITS_MSV.categoryA ? PELE.warnText : null;
  // Batismo (1×-na-vida, o padrão do batismo das cores): explica o DIREITO (a companhia é
  // obrigada a informar — 2013/59 Art. 35.º/3) e a tolerância; grava ao nascer, fica a sessão.
  const [radBaptism, setRadBaptism] = useState(false);
  const radVisible = rad.flightsWithDose > 0;
  useEffect(() => {
    if (!radVisible || !user?.id) return;
    const k = `cp_radiation_explained_${user.id}`;
    AsyncStorage.getItem(k).then((v) => {
      if (v) return;
      setRadBaptism(true);
      AsyncStorage.setItem(k, '1').catch(() => {});
    }).catch(() => {});
  }, [radVisible, user?.id]);

  // ── Radar (Auditoria do mês) nos Números — 2.ª entrada do mockup: SÓ modo Ganhos + MÊS.
  // Categoria e base DESSE mês (linha do tempo do contrato) — uma promoção ou transferência não mexe
  // na Auditoria dos meses antigos.
  const auditCat = !isYear && st.ym ? crewAt(st.ym).category : null;
  const audit = useMemo(() => (ae && auditCat && !isYear && st.ym
    ? monthAudit(duties || {}, { ym: st.ym, ae, cat: auditCat, fleet: crewAt(st.ym).fleet, base: homeBaseAt(st.ym), rosterLog: rosterLog || [], events: aeEvents || [], isPilot })
    : null), [ae, auditCat, isYear, st.ym, duties, crewFleet, base, rosterLog, aeEvents, isPilot]); // eslint-disable-line react-hooks/exhaustive-deps

  // LIMITES DO ACORDO (esboço design/limites-ae.html, aprovado 2026-11-03): o motor dos RUPT da TAP
  // (ae/tapLimits.js) sobre a escala — só os meses na TAP e abrangidos pelo AE (a linha do tempo do
  // contrato diz qual é a companhia e o vínculo de cada dia). Não depende do Mês/Ano escolhido: é o agora.
  const todayIso = isoDay();
  const [aeRule, setAeRule] = useState(null);
  const aeLim = useMemo(() => {
    const isTapAt = (d) => { const a = aeAt(d); return !!a && /^tap/.test(String(a.AE_ID || '')); };
    // A frota de cada dia (WB/NB, linha do tempo do contrato): o reforço dos pilotos só existe nos wide-body (Cl. 42.ª).
    const fleetAt = (d) => (crewAt(d) || {}).fleet || null;
    return evaluateTapLimits({ crewType: isPilot ? 'pilot' : 'cabin', duties, events: aeEvents, baseAt: homeBaseAt, isTapAt, fleetAt, today: todayIso });
  }, [duties, aeEvents, aeNow, companyHistory, crewHistory, isPilot, base, todayIso]); // eslint-disable-line react-hooks/exhaustive-deps
  // A regra europeia ao lado (D1): as mesmas janelas do mostrador da Segurança, em minutos.
  const easaFor = (id) => {
    const w = (grp, days) => limits.rows.find((x) => x.grp === grp && x.days === days);
    const row = (x, label) => (x ? { label, done: Math.round(x.done * 60), limit: Math.round(x.limit * 60) } : null);
    const flt28 = row(w('voo', 28), l('Regra europeia · voo em 28 dias', 'EU rule · flight in 28 days'));
    const dut7 = row(w('serv', 7), l('Regra europeia · serviço em 7 dias', 'EU rule · duty in 7 days'));
    return (id === 'P25' ? [flt28] : id === 'P26' ? [dut7] : id === 'C34' ? [dut7, flt28] : []).filter(Boolean);
  };

  // A nota (partilhada pelos 2 modos): as palavras Amarelo/Vermelho pintadas nas próprias
  // cores; a última frase é a lei do consultivo (termos §3) a falar dentro da app.
  const baptismNote = alertBaptism ? (
    <Text style={[TXT3.cardSub, { color: CARD.day.tabSub }]}>
      <Text style={[TXT3.dur, { color: CARD.day.ink }]}>{l('Primeira vez com cor? ', 'First time seeing colour? ')}</Text>
      <Text style={{ color: CARD.day.alert }}>● </Text><Text style={[TXT3.dur, { color: CARD.day.ink }]}>{l('Laranja', 'Orange')}</Text>
      {l(' = a partir de 85 % de um limite — atenção cedo, não é decisão. ', ' = from 85% of a limit — early attention, not a decision. ')}
      <Text style={{ color: CARD.day.stop }}>● </Text><Text style={[TXT3.dur, { color: CARD.day.ink }]}>{l('Vermelho', 'Red')}</Text>
      {l(' = a estimativa passa o limite — confirma com o planeamento. Dentro do limite não há cor. A app estima, nunca declara legalidade.', ' = the estimate goes over the limit — check with crewing. Within the limit there is no colour. The app estimates, it never declares legality.')}
    </Text>
  ) : null;

  const openSheet = (id) => { select(); setSheet(id); };


  // ══ O DESENHO — N1 de design/numeros-3.html (escolhida pelo Nuno a 2026-11-14): o topo do Início (a pílula do período, o
  // seletor Mês | Ano, o total em duas linhas e dois factos) e, na folha, o cartão "De onde vem" (a barra empilhada das parcelas e as
  // linhas; os extras abrem com os dias, que vêm do calendário), o cartão "Limites · agora" (os dois mais cheios, em "faltam" — nunca
  // percentagem) e as linhas finas Voo, Repouso, Auditoria e Partilhar. Imagens do Nuno: 3421 · 3449 · 3433 · 3440 · 3441 (o €),
  // 3408 · 3415 · 3428 · 3431 · 3441 · 3462 (os limites), 3412 · 3434 (Mês | Ano), 3424 (o número em duas linhas). As contas não
  // mudaram (data/stats.js, o motor FTL, o AE). ══
  const C = CARD.day;
  const periodLabel = isYear ? String(year) : `${monthName} ${ym.slice(0, 4)}`;
  const eurParts = (n) => { const [i0, d0] = Number(Math.abs(n || 0)).toFixed(2).split('.'); const g = i0.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' '); return lang === 'en' ? [`€${g}`, `.${d0}`] : [g, `,${d0} €`]; };
  const baseRangeUnc = !isYear && A.baseRange;
  const gainAbove = Math.max(0, total - (A.base || 0));
  const [bigI, bigD] = eurParts(total);
  const top = mode === 'money' ? {
    pill: null,
    pill2: { text: periodLabel, iso: 'pick', chevron: true, hint: isYear ? l('Escolher o ano', 'Choose the year') : l('Escolher o mês', 'Choose the month') },
    what: isYear ? l(`Ganhos brutos de ${year}`, `Gross earnings in ${year}`) : l(`Ganhos brutos de ${monthName.toLowerCase()}`, `Gross earnings in ${monthName}`),
    giant: baseRangeUnc ? { l1: l('Incerto', 'Uncertain'), unit: null, l2: null, l2Grey: false }
      : { l1: bigI, unit: bigD, l2: (isYear && A.uncertain) ? l('incerto', 'uncertain') : l('estimado', 'estimated'), l2Grey: true },
    // SÓ o total (L1 de design/topo-lado.html): o € do ano não deixa factos ao lado no tamanho comum. O "acima da base" (ou, com a
    // base incerta, as duas pontas do total) está no cartão "De onde vem", logo por baixo; as horas de voo na linha "Voo".
    facts: null,
  } : {
    pill: null,
    pill2: { text: periodLabel, iso: 'pick', chevron: true, hint: isYear ? l('Escolher o ano', 'Choose the year') : l('Escolher o mês', 'Choose the month') },
    what: isYear ? l(`Horas de voo em ${year}`, `Flight hours in ${year}`) : l(`Horas de voo de ${monthName.toLowerCase()}`, `Flight hours in ${monthName}`),
    giant: { l1: Number(flightShownH).toLocaleString(locale, { maximumFractionDigits: 1 }), unit: 'h', l2: null, l2Grey: false },
    facts: null,   // os voos estão na linha "Voo" e o limite mais cheio no cartão "Limites · agora"
  };
  const { width: winW, height: winH } = Dimensions.get('window');
  // O topo é o das três abas, lado a lado (L1; golden: test:homecards, "o topo lado a lado e igual nas três abas"); aqui só o total.
  const giant = topGiant(top, winW - SPACE.lgPlus * 2);   // o tamanho comum das três abas, lado a lado (L1, design/topo-lado.html)
  // O seletor Mês | Ano (3412 · 3434): a pílula de tinta no escolhido, como o "Hoje" do Início.
  const segW = pillWidth(l('Mês', 'Month')) + pillWidth(l('Ano', 'Year')) - SPACE.lg;
  const segRight = (
    <View style={[s.seg, { backgroundColor: C.round }]} accessibilityRole="tablist">
      {[['month', l('Mês', 'Month')], ['year', l('Ano', 'Year')]].map(([id, label]) => {
        const on = scope === id;
        return (
          <TouchableOpacity key={id} onPress={() => { select(); setScope(id); }} activeOpacity={0.8} style={[s.segB, on ? { backgroundColor: C.ink } : null]}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
            <Text style={[TXT3.pill, { color: on ? C.desk : C.soft }]} allowFontScaling={false}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
  // A escolha do período: o mês (os 12 do ano, com ‹ ›) ou o ano (os anos com escala).
  const [pickOpen, setPickOpen] = useState(false);
  const [pickY, setPickY] = useState(Number(ym.slice(0, 4)));
  const openPicker = () => { select(); setPickY(Number(ym.slice(0, 4))); setPickOpen(true); };
  const nowY = new Date().getFullYear();

  // O € de uma linha: os euros grandes e os cêntimos mais pequenos (nunca arredondar, nunca abreviar); o que se ganha a verde.
  const Money = ({ val, gain }) => {
    const [a, b] = eurParts(val);
    const neg = val < 0;
    const col = gain && !neg ? C.gainOut : C.ink;
    return (
      <Text style={[TXT3.lineVal, { color: col }]} allowFontScaling={false}>
        {neg ? '−' : gain ? '+' : ''}{a}<Text style={[TXT3.cardSub, { color: gain && !neg ? C.gainOut : C.tabSub }]}>{b}</Text>
      </Text>
    );
  };
  // As cores das parcelas — o mapa B (frio = a escala): a base a tinta, o per diem a azul do voo, as pernoitas a salva do repouso, o
  // posicionamento a lilás de terra; os subsídios e os extras em cinzentos (não são da escala).
  const PART_C = { base: C.ink, diem: C.flight, pern: C.rest, pos: C.ground, subs: C.tabSub, extras: C.round };
  const PART_LAW = { diem: 'perDiem', pern: 'pernoita' };
  const parts = moneyOpts.filter((o) => o.k !== 'total');
  const posSum = parts.reduce((a, o) => a + Math.max(0, o.val || 0), 0);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const periodEvents = (aeEvents || []).filter((e) => e && String(e.date).startsWith(isYear ? String(year) : ym)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const extraName = (type) => { const k = ae && Array.isArray(ae.EXTRA_KINDS) ? ae.EXTRA_KINDS.find((x) => x.id === type) : null; return (k && k.label && (k.label[lang] || k.label.pt)) || type; };
  const fromCard = mode === 'money' && total > 0 ? (
    <LineCard kind={isYear ? l('De onde vem · bruto · no ano', 'Where it comes from · gross · this year') : l('De onde vem · bruto', 'Where it comes from · gross')}>
      {/* com a base incerta, o topo diz "Incerto" e as duas pontas do total ficam aqui, em primeiro (saíram do topo — L1) */}
      {baseRangeUnc ? (
        <View accessible accessibilityLabel={`${l('O total fica entre', 'The total is between')} ${fmtEur0(total - (A.base || 0) + A.baseRange.min)} ${l('e', 'and')} ${fmtEur0(total - (A.base || 0) + A.baseRange.max)}`}>
          <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{l('O total fica entre', 'The total is between')}</Text>
          <Text style={[TXT3.lineVal, { color: C.ink }]}>{`${fmtEur0(total - (A.base || 0) + A.baseRange.min)} ${l('e', 'and')} ${fmtEur0(total - (A.base || 0) + A.baseRange.max)}`}</Text>
        </View>
      ) : null}
      {posSum > 0 ? (
        <View style={s.stack} accessible accessibilityLabel={parts.filter((o) => o.val > 0).map((o) => `${o.nm} ${fmtEur0(o.val)}`).join(', ')}>
          {parts.filter((o) => o.val > 0).map((o) => <View key={o.k} style={{ flex: o.val / posSum, backgroundColor: PART_C[o.k] || C.round }} />)}
        </View>
      ) : null}
      <View>
        {parts.map((o, i) => {
          const pv = PART_LAW[o.k] ? provaFor(PART_LAW[o.k], provaCtx) : null;
          const isEx = o.k === 'extras';
          const Row = (pv || isEx) ? TouchableOpacity : View;
          const press = isEx ? () => { select(); setExtrasOpen((v) => !v); } : pv ? () => { select(); setProva({ ...pv, value: `${o.val < 0 ? '−' : '+'}${fmtEur0(Math.abs(o.val))}` }); } : undefined;
          return (
            <View key={o.k} style={[s.mRow, i === 0 ? s.mRowFirst : null]}>
              <Row style={s.mMain} {...(press ? { onPress: press, activeOpacity: 0.7, accessibilityRole: 'button', accessibilityState: isEx ? { expanded: extrasOpen } : undefined } : {})}
                accessibilityLabel={`${o.nm}: ${fmtEur0(o.val)}${o.sub ? `. ${o.sub}` : ''}`}>
                <View style={[s.mSw, { backgroundColor: PART_C[o.k] || C.round }]} />
                <View style={s.flex}>
                  <Text style={[TXT3.line, { color: C.ink }]}>{o.nm}{isEx && periodEvents.length ? ` · ${periodEvents.length}` : ''}{pv ? <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{`  § ${pv.art}`}</Text> : null}</Text>
                  {o.sub ? <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{o.sub}</Text> : null}
                </View>
                <Money val={o.val} gain={o.k !== 'base'} />
                {isEx ? <Icon name="chevron" size={13} color={C.tabSub} rot={extrasOpen ? 270 : 90} /> : null}
              </Row>
              {isEx && extrasOpen ? (
                <View style={s.exList}>
                  {periodEvents.length ? periodEvents.map((e) => (
                    <Text key={e.id || `${e.type}${e.date}`} style={[TXT3.cardSub, { color: C.soft }]}>{`${extraName(e.type)} · ${eventDateLabel(e.date, lang)}`}</Text>
                  )) : <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{l('Os extras deste período vêm da escala (papéis, escritório) e do calendário.', 'This period’s extras come from the roster (roles, office) and the calendar.')}</Text>}
                </View>
              ) : null}
            </View>
          );
        })}
        {/* o que se ganhou acima da base (era um facto do topo — L1) */}
        {!baseRangeUnc && gainAbove > 0 ? (
          <View style={[s.mRow, s.sumRow]} accessible accessibilityLabel={`${l('Acima da base', 'Above base')}: +${fmtEur0(gainAbove)}`}>
            <Text style={[TXT3.line, s.flex, { color: C.ink }]}>{l('Acima da base', 'Above base')}</Text>
            <Money val={gainAbove} gain />
          </View>
        ) : null}
      </View>
    </LineCard>
  ) : null;

  // O limite com barra (3408 · 3415 · 3428 · 3431 · 3441 · 3462): o rótulo, o valor com o máximo pequeno, "faltam" e a barra a tinta
  // (laranja aos 85 %, vermelho só quando passa) — nunca percentagem.
  const barColor3 = (r) => (r > 1 ? C.stop : r >= 0.85 ? C.alert : C.ink);
  const LimitRow = ({ o, label, delay = 120 }) => (
    <View style={s.lim} accessible accessibilityLabel={`${label}: ${doneTxt(o.w)} ${l('de', 'of')} ${Math.round(o.limit)} h, ${leftTxt(o.w)}`}>
      <Text style={[TXT3.kind, { color: C.tabSub }]}>{label}</Text>
      <View style={s.limTop}>
        <Text style={[TXT3.fact, { color: C.ink }]} allowFontScaling={false}>{`${doneTxt(o.w)} h`}<Text style={[TXT3.cardSub, { color: C.tabSub }]}>{`  / ${Math.round(o.limit)} h`}</Text></Text>
        <Text style={[TXT3.dur, { color: C.ink }]}>{leftTxt(o.w)}</Text>
      </View>
      <GrowBar ratio={o.r} color={barColor3(o.r)} track={[s.track, { backgroundColor: C.sheet }]} fill={s.fill} delay={delay} />
    </View>
  );
  const grpName = (g) => (g === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty'));
  const top2 = [...safetyRows].sort((a, b) => b.r - a.r).slice(0, 2);
  const limitsCard = (
    <LineCard kind={l('Limites · agora', 'Limits · now')}>
      {limits.has ? top2.map((o, i) => <LimitRow key={o.k} o={o} label={`${grpName(o.w.grp)} · ${limLabel(o.w)}`} delay={120 + i * 60} />)
        : <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{l('Ainda sem horas para os limites.', 'No hours for the limits yet.')}</Text>}
      <TouchableOpacity style={s.moreRow} onPress={() => openSheet('seg')} activeOpacity={0.7} accessibilityRole="button">
        <Text style={[TXT3.act, { color: C.ink }]}>{l('Os limites todos', 'All the limits')}</Text>
        <Icon name="chevron" size={14} color={C.ink} />
      </TouchableOpacity>
    </LineCard>
  );
  const slimCards = [
    { t: 'slim', id: 'voo', color: 'neutral', title: l('Voo', 'Flight'), sub: `${st.flights || 0} ${l(st.flights === 1 ? 'voo' : 'voos', st.flights === 1 ? 'flight' : 'flights')} · ${st.sectors || 0} ${l(st.sectors === 1 ? 'setor' : 'setores', st.sectors === 1 ? 'sector' : 'sectors')}${st.topDest && st.topDest.length ? ` · ${st.topDest.slice(0, 3).map((d) => d.code).join(', ')}` : ''}`, value: fmtH(flightShownH), gain: false, open: { to: 'voo' } },
    { t: 'slim', id: 'corpo', color: 'neutral', title: l('Repouso', 'Rest'), sub: `${l('o mais curto', 'the shortest')} · ${st.reducedRests || 0} ${l('abaixo do mínimo', 'below the minimum')}${st.uncertainRests ? ` · ${st.uncertainRests} ${l('incertos', 'uncertain')}` : ''}`, value: st.minRestH != null ? fmtH(st.minRestH) : '—', gain: false, open: { to: 'corpo' } },
    audit && audit.count > 0 ? { t: 'slim', id: 'audit', color: 'alert', title: l('Auditoria do mês', 'Month audit'), sub: `${audit.count} ${audit.count === 1 ? l('item por confirmar', 'item to confirm') : l('itens por confirmar', 'items to confirm')}${audit.totalEur > 0 ? ` · ≈ ${fmtEur0(audit.totalEur)}` : ''}`, value: null, gain: false, open: { to: 'audit' } } : null,
    isYear && st.flightMin > 0 ? { t: 'slim', id: 'share', color: 'neutral', title: l('Partilhar o meu ano de voo', 'Share my year in the air'), sub: l('um cartão com o teu ano, para enviar', 'a card with your year, to send'), value: null, gain: false, open: { to: 'share' } } : null,
  ].filter(Boolean);
  const onSlim = (o) => { select(); if (o.to === 'audit') setAuditOpen(true); else if (o.to === 'share') setShareOpen(true); else setSheet(o.to); };
  const notes = mode === 'money' ? [
    noTableTxt, senTxt, pendTxt,
    A.missing ? l(`${A.missing} voo(s) sem rota completa não somam ao per diem.`, `${A.missing} flight(s) without a full route are not counted in per diem.`) : null,
    A.estimated ? (ae.indexNote ? ae.indexNote(isYear ? +year : +String(st.ym).slice(0, 4), lang) : l('Valores indexados · estimativa — IPC oficial por confirmar.', 'Indexed values · estimate — official CPI not yet confirmed.')) : null,
    ae && ae.isAgreementExpired && ae.isAgreementExpired(nowD) ? l('AE expirado · valores são referência até novo acordo.', 'Agreement expired · values are reference until a new agreement.') : null,
  ].filter(Boolean) : [];
  const toScale = (
    <WideButton glyph="cal" label={l('Ir para a Escala', 'Go to roster')} onPress={() => { select(); navigation.navigate('Escala'); }} />
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.desk }]} edges={['top']}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <HomeTop top={top} C={C} size={giant.size} onPill2={openPicker} right={segRight} rightW={segW} l={l} />
      <View style={[s.sheet, { backgroundColor: C.sheet }]}>
        <ScrollView ref={statsScrollRef} style={s.flex} contentContainerStyle={[s.sheetIn, { paddingBottom: tabSpace + SPACE.lg }]} showsVerticalScrollIndicator={false}>
          {notes.length ? <View style={s.notes}>{notes.map((n, i) => <Text key={i} style={[TXT3.cardSub, { color: C.tabSub }]}>{n}</Text>)}</View> : null}
          {empty && !moneyOnly ? (
            <View style={s.empty}>
              <Text style={[TXT3.slimTitle, { color: C.ink }]}>{isYear ? l('Sem escala registada em ' + year + '.', 'No roster recorded in ' + year + '.') : l('Sem escala neste mês.', 'No roster this month.')}</Text>
              <Text style={[TXT3.text, { color: C.soft }]}>{l('A escala vem do calendário. Assim que houver serviços, aparecem aqui as horas, os limites e os ganhos.', 'The roster comes from the calendar. Once there are duties, the hours, limits and earnings show up here.')}</Text>
              {toScale}
            </View>
          ) : (
            <>
              {fromCard}
              {moneyOnly ? (
                <View style={s.empty}>
                  <Text style={[TXT3.slimTitle, { color: C.ink }]}>{isYear ? l('Sem escala registada em ' + year + '.', 'No roster recorded in ' + year + '.') : l('Sem escala neste mês.', 'No roster this month.')}</Text>
                  <Text style={[TXT3.text, { color: C.soft }]}>{l('O vencimento base paga-se na mesma. Com serviços na escala, aparecem aqui as horas, os limites e o resto dos ganhos.', 'Base pay is paid anyway. With duties on the roster, the hours, limits and the rest of the earnings show up here.')}</Text>
                  {toScale}
                </View>
              ) : (
                <>
                  {limitsCard}
                  {baptismNote ? <View style={s.notes}>{baptismNote}</View> : null}
                  <HomeCards cards={slimCards} C={C} onOpen={onSlim} l={l} />
                  {/* Limites do acordo (TAP) — fica como está até à vez da TAP. */}
                  {aeLim && aeLim.rules.length ? (
                    <View style={s.aeLim}>
                      <AeLimitsSection result={aeLim} crewType={isPilot ? 'pilot' : 'cabin'} lang={lang} todayIso={todayIso} onOpen={setAeRule} />
                    </View>
                  ) : null}
                  {isYear && hasVac ? (
                    <LineCard kind={`${l('Férias', 'Leave')} ${year}`}>
                      <LineRows rows={[{ k: l('Gozados', 'Taken'), v: String(vacTaken) }, { k: l('Por marcar', 'To mark'), v: String(vacLeft) }, { k: l('Direito no ano', 'Annual right'), v: String(vacQuota) }]} />
                      {vacTaken > vacQuota ? <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{l('Acima do plafond — podes ter dias reportados (Art. 240.º).', 'Over quota — you may have carried days over (Art. 240).')}</Text> : null}
                    </LineCard>
                  ) : null}
                  <Text style={[TXT.caption, s.foot]}>{l('Estimativa a partir da tua escala. Fim de serviço = sign-off; sem ele, on-block + débrief do perfil (só voos).', 'Estimated from your roster. Duty end = sign-off; without it, on-block + your profile debrief (flights only). Tap a theme for detail.')}</Text>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* A escolha do período */}
      <PeleSheet visible={pickOpen} onClose={() => setPickOpen(false)} bg={C.sheet}>
        <SheetHeader card title={isYear ? l('Escolher o ano', 'Choose the year') : l('Escolher o mês', 'Choose the month')} onClose={() => setPickOpen(false)} closeLabel={l('Fechar', 'Close')} style={s.shHead} />
        {isYear ? (
          <View style={s.pickGrid}>
            {years.map((y) => {
              const on = String(y) === String(year);
              return (
                <TouchableOpacity key={y} onPress={() => { select(); setYear(y); setPickOpen(false); }} activeOpacity={0.8} style={[s.pickCell, on ? { backgroundColor: C.ink } : { backgroundColor: C.neutral }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[TXT3.lineVal, { color: on ? C.sheet : C.ink }]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <>
            <View style={s.pickYear}>
              <IconButton icon="back" onPress={() => setPickY((v) => v - 1)} label={l('Ano anterior', 'Previous year')} style={{ backgroundColor: C.round }} />
              <Text style={[TXT3.cardTitle, { color: C.ink }]} allowFontScaling={false}>{pickY}</Text>
              <IconButton icon="back" rot={180} onPress={() => setPickY((v) => Math.min(nowY, v + 1))} disabled={pickY >= nowY} label={l('Ano seguinte', 'Next year')} style={{ backgroundColor: C.round }} />
            </View>
            <View style={s.pickGrid}>
              {Array.from({ length: 12 }, (_, i) => {
                const k = `${pickY}-${String(i + 1).padStart(2, '0')}`;
                const on = k === ym, off = k > nowYm;
                const nm = new Date(pickY, i, 1).toLocaleDateString(locale, { month: 'long' });
                return (
                  <TouchableOpacity key={k} disabled={off} onPress={() => { select(); setYm(k); setPickOpen(false); }} activeOpacity={0.8}
                    style={[s.pickCell, on ? { backgroundColor: C.ink } : { backgroundColor: C.neutral }, off ? s.off : null]} accessibilityRole="button" accessibilityState={{ selected: on, disabled: off }}>
                    <Text style={[TXT3.line, { color: on ? C.sheet : C.ink }]}>{nm.charAt(0).toUpperCase() + nm.slice(1)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </PeleSheet>

      {/* ── Folha de uma regra do acordo (TAP) ── */}
      <AeLimitSheet visible={!!aeRule} onClose={() => setAeRule(null)} ruleId={aeRule} result={aeLim}
        crewType={isPilot ? 'pilot' : 'cabin'} lang={lang} easa={easaFor(aeRule)} duties={duties} />

      {/* ── Os limites (a regra das folhas: cada janela num campo, sem percentagem) ── */}
      <PeleSheet visible={sheet === 'seg'} onClose={() => setSheet(null)} bg={C.sheet}>
        <SheetHeader card title={l('Os limites', 'The limits')} onClose={() => setSheet(null)} closeLabel={l('Fechar', 'Close')} style={s.shHead} />
        <ScrollView style={{ maxHeight: Math.round(winH * 0.62) }} contentContainerStyle={s.shBody} showsVerticalScrollIndicator={false}>
          {['serv', 'voo'].map((g) => {
            const rows = safetyRows.filter((o) => o.w.grp === g);
            if (!rows.length) return null;
            return (
              <View key={g} style={s.shGroup}>
                <Text style={[TXT3.kind, { color: C.tabSub }]}>{grpName(g)}</Text>
                {rows.map((o, i) => <View key={o.k} style={s.limField}><LimitRow o={o} label={limLabel(o.w)} delay={100 + i * 40} /></View>)}
              </View>
            );
          })}
        <Text style={[TXT3.cardSub, s.note]}>{l('Os períodos de dias contam para trás a partir de hoje — ou de amanhã, quando o serviço de hoje passa a meia-noite (vale o mais carregado). O ano civil conta o ano inteiro, com o que já está na escala. ', 'Day periods count back from today — or from tomorrow when today’s duty runs past midnight (the heavier one applies). The calendar year counts the whole year, including what is already rostered. ')}{l('A barra fica laranja a partir de 85 % de um limite e vermelha só quando o passa (o mapa das cores).', 'The bar turns orange from 85% of a limit and red only when it is exceeded (the colour map).')}</Text>
          <Text style={[TXT3.dur, s.law]} onPress={() => { select(); setProva(provaFor('limites', provaCtx)); }} accessibilityRole="button">{l('§ ORO.FTL.210 — ver a lei', '§ ORO.FTL.210 — see the law')}</Text>
        </ScrollView>
      </PeleSheet>

      {/* ── Voo ── */}
      <PeleSheet visible={sheet === 'voo'} onClose={() => setSheet(null)} bg={C.sheet}>
        <SheetHeader card title={l('Voo', 'Flight')} onClose={() => setSheet(null)} closeLabel={l('Fechar', 'Close')} style={s.shHead} />
        <ScrollView style={{ maxHeight: Math.round(winH * 0.62) }} contentContainerStyle={s.shBody} showsVerticalScrollIndicator={false}>
          <Field label={isYear ? l('Horas de voo · ano civil', 'Flight hours · calendar year') : l(`Horas de voo · ${monthName.toLowerCase()}`, `Flight hours · ${monthName}`)} value={fmtH(flightShownH)}>
            <Text style={[TXT3.unit, { color: C.ink }]} allowFontScaling={false}>{fmtH(flightShownH)}</Text>
            {isYear ? (
              <>
                <View style={s.limTop}>
                  <Text style={[TXT3.cardSub, { color: C.tabSub }]}>{`${l('teto', 'cap')} ${nf(ANNUAL_FLIGHT_LIMIT_H)} h · ORO.FTL.210(b)`}</Text>
                  <Text style={[TXT3.dur, { color: C.ink }]}>{leftTxt(yearFlightGap)}</Text>
                </View>
                <GrowBar ratio={flightRatio} color={barColor3(legalYearMin / (ANNUAL_FLIGHT_LIMIT_H * 60))} track={[s.track, { backgroundColor: C.neutral }]} fill={s.fill} />
              </>
            ) : null}
          </Field>
          <Field label={l('Voos e setores', 'Flights and sectors')} value={`${st.flights} ${l('voos', 'flights')} · ${st.sectors} ${l('setores', 'sectors')}`} />
          <View style={s.shGroup}>
            <Text style={[TXT3.kind, { color: C.tabSub }]}>{isYear ? l('Voo por mês', 'Flight by month') : l('Voo por dia', 'Flight by day')}</Text>
            <View style={s.chart}>
              {chartData.map((m, i) => {
                const r = m.flightMin / maxBar;
                const isNow = isYear ? (+year === nowD.getFullYear() && i === nowD.getMonth()) : (st.ym === nowYm && (i + 1) === nowD.getDate());
                const lbl = isYear ? monthAbbr(i) : (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '');
                return (
                  <View key={i} style={s.chartCol}>
                    <View style={s.chartWrap}><MonthBar ratio={r} color={m.flightMin > 0 ? (isNow ? C.flight : C.ink) : C.neutral} delay={120 + i * (isYear ? 30 : 12)} /></View>
                    <Text style={[TXT3.tab, { color: isNow ? C.ink : C.tabSub }]} numberOfLines={1}>{lbl}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          {kindsPresent.length ? (
            <View style={s.shGroup}>
              <Text style={[TXT3.kind, { color: C.tabSub }]}>{l('Por tipo', 'By type')}</Text>
              <LineRows rows={kindsPresent.map((k) => ({ k: kindLabel(k), v: String(st.byKind[k]) }))} />
            </View>
          ) : null}
          {st.topDest.length ? (
            <View style={s.shGroup}>
              <Text style={[TXT3.kind, { color: C.tabSub }]}>{l('Destinos', 'Destinations')}</Text>
              <LineRows rows={st.topDest.slice(0, 6).map((d) => ({ k: d.code, v: `×${d.n}` }))} />
            </View>
          ) : null}
        <Text style={[TXT3.cardSub, s.note]}><Text style={[TXT3.dur, { color: C.ink }]}>{st.flights}</Text> {l('voos', 'flights')} · <Text style={[TXT3.dur, { color: C.ink }]}>{st.sectors}</Text> {l('setores', 'sectors')} {isYear ? l('no ano', 'this year') : l('no mês', 'this month')}.</Text>
        </ScrollView>
      </PeleSheet>

      {/* ── Repouso ── */}
      <PeleSheet visible={sheet === 'corpo'} onClose={() => setSheet(null)} bg={C.sheet}>
        <SheetHeader card title={l('Repouso', 'Rest')} onClose={() => setSheet(null)} closeLabel={l('Fechar', 'Close')} style={s.shHead} />
        <ScrollView style={{ maxHeight: Math.round(winH * 0.62) }} contentContainerStyle={s.shBody} showsVerticalScrollIndicator={false}>
          <Field label={l('Repouso mais curto', 'Shortest rest')} value={st.minRestH != null ? fmtH(st.minRestH) : '—'} />
          <Field label={l('Repousos abaixo do mínimo', 'Rests below the minimum')} value={String(st.reducedRests || 0)} />
          <Field label={l('Sequência máxima de serviço', 'Longest duty streak')} value={`${st.longestStreak} ${l(st.longestStreak === 1 ? 'dia' : 'dias', st.longestStreak === 1 ? 'day' : 'days')}`} />
        {/* ── Radiação cósmica (v2 do mockup: linha achatada, SEM barra — número + âncora;
            zero voos com dose → a secção nem aparece; uma linha de contexto de cada vez). ── */}
        {radVisible ? (
          <View style={s.rad}>
            <TouchableOpacity style={s.radRow} activeOpacity={0.7}
              onPress={() => { select(); setProva({ ...provaFor('radiacao', provaCtx), value: `≈ ${fmtMsv(rad.mSv)} mSv` }); }}
              accessibilityRole="button" accessibilityLabel={l('Radiação cósmica — ver a lei', 'Cosmic radiation — see the law')}>
              <Text style={s.radLab}>{l('Radiação cósmica · estimativa', 'Cosmic radiation · estimate')} §</Text>
              <Text style={[s.radVal, radTone ? { color: radTone } : null]} allowFontScaling={false}>≈ {fmtMsv(rad.mSv)}<Text style={s.radValU}> mSv</Text></Text>
            </TouchableOpacity>
            <Text style={s.radCtx}>
              {rad.flightsWithout > 0 ? (
                <><Text style={s.radCtxB}>{rad.flightsWithout} {rad.flightsWithout === 1 ? l('voo sem rota não entra', 'flight without a route is not counted') : l('voos sem rota não entram', 'flights without a route are not counted')}</Text>{l(' na estimativa — completa as rotas na Escala.', ' in the estimate — complete the routes in the roster.')}</>
              ) : isYear ? (
                <>{l('Limite legal: ', 'Legal limit: ')}<Text style={s.radCtxB}>20 mSv/{l('ano', 'year')}</Text>{l(' · em Portugal, o nível de referência das tripulações é 10 mSv/ano (DL 108/2018, art. 92.º) · a companhia é obrigada a avaliar o teu valor oficial — pede-lho.', ' · in Portugal, the aircrew reference level is 10 mSv/year (DL 108/2018, art. 92) · your airline must assess your official dose — ask them for it.')}</>
              ) : (
                <>{l('No ano: ', 'This year: ')}<Text style={s.radCtxB}>≈ {fmtMsv(radYear ? radYear.mSv : 0)} mSv</Text> · {l('limite legal: 20 mSv/ano; nível de referência em Portugal: 10 mSv/ano.', 'legal limit: 20 mSv/year; reference level in Portugal: 10 mSv/year.')}</>
              )}
            </Text>
            {radBaptism ? (
              <Text style={s.radBapt}>
                <Text style={s.radBaptB}>{l('Primeira vez? ', 'First time? ')}</Text>
                {l('És, por lei, um trabalhador exposto a radiação cósmica (Diretiva 2013/59/Euratom). A tua companhia é obrigada a avaliar a tua dose anual e a informar-te — pede-lhe o valor oficial. Isto é uma estimativa da tua escala (±30%), calculada no telemóvel; nada é guardado nem enviado.',
                  'By law, you are a worker exposed to cosmic radiation (Directive 2013/59/Euratom). Your airline must assess your annual dose and inform you — ask for the official value. This is an estimate from your roster (±30%), computed on your phone; nothing is stored or sent.')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={[TXT3.cardSub, s.note]}><Text style={[TXT3.dur, { color: C.ink }]}>{st.offDays}</Text> {l('dias de folga e', 'days off and')} <Text style={[TXT3.dur, { color: C.ink }]}>{st.nightStops}</Text> {l('paragens noturnas', 'night stops')} {isYear ? l('no ano', 'this year') : l('no mês', 'this month')}.{st.reducedRests ? l(' Abaixo do mínimo = menos do que o serviço anterior ou 12 h na base / 10 h fora (ORO.FTL.235). A app estima: confirma com a companhia.', ' Below the minimum = less than the preceding duty or 12 h at base / 10 h away (ORO.FTL.235). The app estimates: confirm with the company.') : ''}{st.uncertainRests ? l(` ${st.uncertainRests} ${st.uncertainRests === 1 ? 'repouso incerto' : 'repousos incertos'}: a app não consegue dizer se cumprem — dependem de um facto que a escala não traz (se o voo foi atribuído durante uma assistência, se a companhia usa repouso reduzido, uma hora em falta no serviço anterior). O motivo de cada um está no serviço.`, ` ${st.uncertainRests} uncertain ${st.uncertainRests === 1 ? 'rest' : 'rests'}: the app cannot tell whether they comply — they depend on a fact the roster does not carry (whether the flight was assigned during a standby, whether the company uses reduced rest, a missing time in the previous duty). Each one's reason is in the duty.`) : ''}</Text>
        </ScrollView>
      </PeleSheet>

      <YearShareCard visible={shareOpen} onClose={() => setShareOpen(false)} st={isYear ? st : null} year={year} companyName={company?.name} />
      <ProvaSheet visible={!!prova} onClose={() => setProva(null)} prova={prova} lang={lang} />
      <AuditSheet visible={!!auditOpen} onClose={() => setAuditOpen(null)} audit={audit} monthName={monthName}
        lang={lang} provaCtx={provaCtx}
        onOpenDay={(iso) => navigation.navigate('Escala', { screen: 'DutyDetail', initial: false, params: { date: iso } })} />
    </SafeAreaView>
  );
}

// N1 (2026-11-14): o topo do Início e a folha branca da 3.0; os cartões são o LineCard; as folhas na regra das folhas.
const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  sheet: { flex: 1, marginTop: -SPACE.lg, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
  sheetIn: { padding: SPACE.md, gap: SPACE.sm },
  seg: { height: 38, borderRadius: RADIUS.pill, padding: 3, flexDirection: 'row', alignItems: 'center' },
  segB: { height: 32, borderRadius: RADIUS.pill, paddingHorizontal: SPACE.md, alignItems: 'center', justifyContent: 'center' },
  notes: { gap: SPACE.xs, paddingHorizontal: SPACE.xs },
  empty: { gap: SPACE.md, padding: SPACE.lg },
  stack: { flexDirection: 'row', height: 14, borderRadius: RADIUS.pill, overflow: 'hidden', gap: SPACE.xxs },
  mRow: { borderTopWidth: 1, borderTopColor: CARD.rule },
  mRowFirst: { borderTopWidth: 0 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingTop: SPACE.sm, minHeight: 44 },
  mMain: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, paddingVertical: SPACE.sm, minHeight: 44 },
  mSw: { width: 10, height: 10, borderRadius: 3, marginTop: SPACE.s },
  exList: { gap: SPACE.xs, paddingLeft: SPACE.lg + SPACE.xxs, paddingBottom: SPACE.sm },
  lim: { gap: SPACE.xs },
  limTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACE.md },
  track: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.pill },
  moreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: CARD.rule, paddingTop: SPACE.md, minHeight: 44 },
  aeLim: { marginTop: SPACE.xs },
  foot: { color: CARD.day.tabSub, textAlign: 'center', paddingHorizontal: SPACE.lg, marginTop: SPACE.sm },
  // as folhas
  shHead: { paddingHorizontal: 0, paddingTop: 0 },
  shBody: { gap: SPACE.sm, paddingBottom: SPACE.lg },
  shGroup: { gap: SPACE.xs, paddingTop: SPACE.sm },
  limField: { paddingVertical: SPACE.sm, borderBottomWidth: 1.5, borderBottomColor: CARD.rule },
  note: { color: CARD.day.tabSub, marginTop: SPACE.sm },
  law: { color: CARD.day.ink, marginTop: SPACE.xs },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: SPACE.xxs },
  chartCol: { flex: 1, alignItems: 'center', gap: SPACE.xs },
  chartWrap: { height: 96, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  pickYear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACE.sm },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, paddingBottom: SPACE.lg },
  pickCell: { width: '31%', height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.35 },
  // a radiação cósmica (na folha do Repouso)
  rad: { gap: SPACE.xs, paddingTop: SPACE.md, borderTopWidth: 1.5, borderTopColor: CARD.rule },
  radRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACE.md, minHeight: 44 },
  radLab: { ...TXT3.line, color: CARD.day.ink, flex: 1 },
  radVal: { ...TXT3.fact, color: CARD.day.ink },
  radValU: { ...TXT3.cardSub, color: CARD.day.tabSub },
  radCtx: { ...TXT3.cardSub, color: CARD.day.tabSub },
  radCtxB: { ...TXT3.dur, color: CARD.day.ink },
  radBapt: { ...TXT3.cardSub, color: CARD.day.soft, marginTop: SPACE.xs },
  radBaptB: { ...TXT3.dur, color: CARD.day.ink },
});
