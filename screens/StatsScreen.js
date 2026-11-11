import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PELE, PELE_FONT, GUTTER, RADIUS, BRAND, SPACE } from '../data/constants';
import Icon from '../components/Icon';
import PeleSide from '../components/PeleSide';
import PeleSheet from '../components/PeleSheet';
import PeleHeader from '../components/PeleHeader';
import CountUp from '../components/CountUp';
import YearShareCard from '../components/YearShareCard';
import useTabBarSpace from '../hooks/useTabBarSpace';
import { useScrollToTop } from '@react-navigation/native';
import useEnter from '../hooks/useEnter';
import useReduceMotion from '../hooks/useReduceMotion';
import { yearStats, monthStats, availableYears, ANNUAL_FLIGHT_LIMIT_H, STAT_KINDS } from '../data/stats';
import { annualLabel } from '../data/perdiem';
import { yearRadiation, RADIATION_LIMITS_MSV } from '../data/radiation';
import { provaFor } from '../data/prova';
import ProvaSheet from '../components/ProvaSheet';
import { monthAudit } from '../data/audit';
import AuditSheet from '../components/AuditSheet';
import { yearCount } from '../data/aeEvents';
import { computeFlightTime, computeDutyTime, sumCalendarYearMin } from '../ftl';
import { t } from '../data/i18n';
import { select } from '../data/haptics';
import { AppContext, isoDay } from '../data/appContext';
import AeLimitsSection from '../components/AeLimitsSection';
import AeLimitSheet from '../components/AeLimitSheet';
import { evaluateTapLimits } from '../ae/tapLimits';
import AsyncStorage from '../data/secureStorage';

// Cor do estado da janela FTL (≥90% vermelho · ≥70% laranja · resto verde) — pele.
const barColor = (r) => (r >= 0.9 ? PELE.red : r >= 0.7 ? PELE.warn : PELE.ok);

// Curva do arco das bolas (translateX por índice) — recria o efeito do mockup para N opções.
const arcX = (i, n) => { const mid = (n - 1) / 2; const tt = mid ? (i - mid) / mid : 0; return -Math.round(40 * (1 - Math.cos((tt * Math.PI) / 2))); };

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
  const statsScrollRef = useRef(null);
  useScrollToTop(statsScrollRef);   // re-tocar na aba Números → volta ao topo (convenção iOS)
  const seg = useEnter();

  const [scope, setScope] = useState('year');   // 'year' | 'month'
  const isYear = scope === 'year';
  const [dialSel, setDialSel] = useState(null);        // bola selecionada no dial (chave)
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
      ? yearStats(duties, { year, ae, aeAt, category: crewCategory, contract: crewContract || '12/12', crewHistory, companyHistory, fleet: crewFleet, postFlightMin, events: aeEvents, baseAt: homeBaseAt, serviceStart, startExact: serviceStartExact, largada, lifestyle })
      : monthStats(duties, { ym, ae, category: crewCategory, contract: crewContract || '12/12', crewHistory, companyHistory, fleet: crewFleet, postFlightMin, events: aeEvents, baseAt: homeBaseAt, serviceStart, startExact: serviceStartExact, largada, lifestyle }),
    [isYear, duties, year, ym, ae, aeNow, companyHistory, crewCategory, crewContract, crewHistory, crewFleet, postFlightMin, aeEvents, serviceStart, serviceStartExact, homeBaseAt, largada, lifestyle], // eslint-disable-line react-hooks/exhaustive-deps
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
  const fmtPc1 = (frac) => `${(Math.max(0, frac || 0) * 100).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
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
  // 9/3 e sazonais sem as datas de atividade: a base do mês é incerta (Cl. 48.ª/80.ª; bloco 5) — diz-se o intervalo.
  // O motivo vem dos próprios meses (stats.js, `uncertainReasons`), não da companhia atual (um ano pode ter duas).
  const reasons = isYear ? (A.uncertainReasons || []) : (A.baseRange ? (A.baseRange.reasons || [A.baseRange.reason || 'activity']) : []);
  const whyTap = l('atualização do vencimento base por confirmar', 'base pay update not confirmed'), whyAct = l('faltam as datas de atividade', 'activity dates missing');
  const whyAdm = l('falta o dia em que entraste', 'the day you joined is missing');
  const whySick = l('nos dias de baixa a TAP paga o líquido ou completa o subsídio da Segurança Social', 'on sick days TAP pays the net amount or tops up the social-security benefit');
  const uncWhy = [reasons.some((r) => /^tap/.test(r) && r !== 'tapSick') ? whyTap : null, reasons.includes('tapSick') ? whySick : null, reasons.includes('admission') ? whyAdm : null,
    reasons.some((r) => !/^tap/.test(r) && r !== 'admission') ? whyAct : null].filter(Boolean).join('; ') || whyAct;
  const baseUnc = !isYear && A.baseRange ? ` · ${l('incerto', 'uncertain')}: ${fmtEur0(A.baseRange.min)} ${l('a', 'to')} ${fmtEur0(A.baseRange.max)} (${uncWhy})` : (isYear && A.uncertain ? ` · ${l('incerto', 'uncertain')} (${uncWhy})` : '');
  const baseSub = (isYear ? `${l('salário base acumulado', 'accrued base salary')} · ${st.aeYtd?.monthsElapsed || 0} ${l('meses', 'months')}` : `${l('salário base', 'base salary')} · ${monthName}`) + baseUnc;
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
    (A.nightStops > 0) && { k: 'pern', nm: l('Pernoitas', 'Night stops'), ic: 'bed', val: A.nightStops, sub: (ae && ae.PER_DIEM_BY_DAY) ? (isPilot ? l('estadia nos dias sem voo (per diem B, RRRGS Cl. 9.ª)', 'stay on days without flights (per diem B, RRRGS Cl. 9)') : l('estadia nos dias sem voo (AC2, RRRGS Cl. 7.ª)', 'stay on days without flights (AC2, RRRGS Cl. 7)')) : `${st.nightStops} ${l('paragens nocturnas', 'night stops')}` },
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
  // no device, NUNCA guardada. "≈" = a língua de estimativa da casa; cor só se a dose
  // cruzar 70/90% do limiar de categoria A (6 mSv) — informação rara, não decoração.
  const rad = useMemo(() => yearRadiation(duties || {}, isYear ? { year: +year } : { ym: st.ym }), [duties, isYear, year, st.ym]);
  const radYear = useMemo(() => (isYear ? null : yearRadiation(duties || {}, { year: Number(String(st.ym || '').slice(0, 4)) })), [duties, isYear, st.ym]);
  const fmtMsv = (v) => (v || 0).toLocaleString(locale, { minimumFractionDigits: v < 0.095 ? 2 : 1, maximumFractionDigits: v < 0.095 ? 2 : 1 });
  const radTone = isYear && rad.mSv >= 0.9 * RADIATION_LIMITS_MSV.categoryA ? PELE.red
    : isYear && rad.mSv >= 0.7 * RADIATION_LIMITS_MSV.categoryA ? PELE.warn : null;
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
    <Text style={s.note}>
      <Text style={s.noteInk}>{l('Primeira vez com cor? ', 'First time seeing colour? ')}</Text>
      <Text style={[s.noteInk, { color: PELE.warn }]}>{l('Amarelo', 'Yellow')}</Text>
      {l(' = janela acima de 70% — atenção cedo, não é decisão. ', ' = a window above 70% — early attention, not a decision. ')}
      <Text style={[s.noteInk, { color: PELE.red }]}>{l('Vermelho', 'Red')}</Text>
      {l(' = acima de 90% — confirma com o planeamento. A cor mede a tua margem; a app estima, nunca declara legalidade.', ' = above 90% — check with crewing. Colour measures your margin; the app estimates, it never declares legality.')}
    </Text>
  ) : null;

  // Opções e seleção corrente do dial (derivada — cai no default se a chave já não é visível)
  const curOpts = mode === 'money' ? moneyOpts : safetyVis;
  const defaultKey = mode === 'money' ? 'total' : (safetyVis.reduce((a, b) => (b.r > (a ? a.r : -1) ? b : a), null) || {}).k;
  const selKey = curOpts.find((o) => o.k === dialSel) ? dialSel : defaultKey;
  const selMoney = mode === 'money' ? (moneyOpts.find((o) => o.k === selKey) || moneyOpts[0]) : null;
  const selSafe = mode === 'safety' ? (safetyVis.find((o) => o.k === selKey) || safetyVis[0]) : null;
  // Mostrador à Stocks/Watch: o INTEIRO grande, os cêntimos+€ pequenos e cinza na mesma
  // linha de base — a lei dos cêntimos intacta e o dado-estrela finalmente a mandar na página.
  const selEur = selMoney ? (() => {
    if (selMoney.val == null) return { big: '—', dec: '' };
    const [i, d] = Number(selMoney.val).toFixed(2).split('.');
    const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return lang === 'en' ? { big: `€${g}`, dec: `.${d}` } : { big: g, dec: `,${d} €` };
  })() : null;

  const pickDial = (k) => { select(); setDialSel(k); };
  const openSheet = (id) => { select(); setSheet(id); };

  // Índices dos cards/folhas (Segurança só existe como card no modo Ganhos)
  const idx = mode === 'money' ? { seg: '01', voo: '02', corpo: '03' } : { voo: '01', corpo: '02' };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PeleSide label={l('ESTATÍSTICAS', 'STATISTICS')} accent={String(isYear ? year : ym.slice(0, 4))} />
      {/* Header FIXO fora do scroll (género do Perfil/Validades, 2026-07-10): eyebrow NA linha
          de topo à esquerda (padrão da saudação do Início) · fantasma = a ETIQUETA do âmbito
          (ANO/MÊS — decisão do user; a palavra por baixo carrega o dado) · kick = retrato
          físico do âmbito (voos·setores) · as ‹› do mês ficam sempre à mão, mesmo com scroll. */}
      <View style={s.headWrap}>
        <PeleHeader
          eyebrowTop
          eyebrow={`${l('Estatísticas', 'Statistics')} · ${[coView?.name, ae ? 'AE' : 'FTL'].filter(Boolean).join(' · ').toUpperCase()}`}
          ghost={isYear ? l('ANO', 'YEAR') : l('MÊS', 'MONTH')}
          word={isYear ? String(year) : monthName}
          wordTrailing={!isYear ? (
            <View style={s.mnav}>
              <TouchableOpacity onPress={() => { select(); shiftMonth(-1); }} hitSlop={8} style={s.mnavBtn} activeOpacity={0.7}>
                <Icon name="chevron" size={15} color={PELE.ink} rot={180} />
              </TouchableOpacity>
              <TouchableOpacity disabled={ym >= nowYm} onPress={() => { select(); shiftMonth(1); }} hitSlop={8} style={[s.mnavBtn, ym >= nowYm && s.mnavBtnOff]} activeOpacity={0.7}>
                <Icon name="chevron" size={15} color={ym >= nowYm ? PELE.grey : PELE.ink} />
              </TouchableOpacity>
            </View>
          ) : null}
          kick={`${nf(st.flights || 0)} ${l(st.flights === 1 ? 'voo' : 'voos', st.flights === 1 ? 'flight' : 'flights')} · ${nf(st.sectors || 0)} ${l(st.sectors === 1 ? 'setor' : 'setores', st.sectors === 1 ? 'sector' : 'sectors')}`}
        />
      </View>
      <ScrollView ref={statsScrollRef} style={{ flex: 1 }} contentContainerStyle={[s.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>

        {/* Segmento Mês ⇄ Ano */}
        <View style={s.scoperow}>
          <View style={s.segWrap}>
            {[['month', l('Mês', 'Month')], ['year', l('Ano', 'Year')]].map(([id, label]) => {
              const on = scope === id;
              return (
                <TouchableOpacity key={id} onPress={() => { select(); setScope(id); }} activeOpacity={0.85} style={[s.segb, on && s.segbOn]}>
                  <Text style={[s.segTxt, on && s.segTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ano com escala em vários anos → chips */}
        {isYear && years.length > 1 ? (
          <View style={s.years}>
            {years.map((y) => {
              const on = y === year;
              return (
                <TouchableOpacity key={y} onPress={() => { select(); setYear(y); }} activeOpacity={0.85} style={[s.yChip, on && s.yChipOn]} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <Text style={[s.yTxt, on && s.yTxtOn]}>{y}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {empty ? (
          <Animated.View style={[s.emptyWrap, seg(1)]}>
            <Text style={s.emptyTxt}>{isYear ? l('Sem escala registada em ' + year + '.', 'No roster recorded in ' + year + '.') : l('Sem escala neste mês.', 'No roster this month.')}</Text>
            <Text style={s.emptySub}>{l('Importa ou regista serviços para veres as tuas estatísticas.', 'Import or add duties to see your stats.')}</Text>
            <TouchableOpacity onPress={() => { select(); navigation.navigate('Escala'); }} activeOpacity={0.85} style={s.emptyBtn}>
              <Text style={s.emptyBtnTxt}>{l('Ir para a Escala', 'Go to roster')}</Text>
              <Icon name="chevron" size={14} color={PELE.paper} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            {/* Section eyebrow do dial */}
            <View style={s.seybRow}>
              {mode === 'safety' ? <View style={s.seybDot} /> : null}
              <Text style={s.seyb}>{mode === 'money'
                ? `${l('Os teus ganhos · estimados · brutos', 'Your earnings · estimated · gross')} ${isYear ? l('no ano', 'this year') : `${l('em', 'in')} ${monthName.toLowerCase()}`}`
                : l('A tua segurança · janelas FTL · agora', 'Your safety · FTL windows · now')}</Text>
            </View>
            {mode === 'money' && noTableTxt ? <Text style={s.dsub}>{noTableTxt}</Text> : null}
            {mode === 'money' && senTxt ? <Text style={s.dsub}>{senTxt}</Text> : null}
            {mode === 'money' && pendTxt ? <Text style={s.dsub}>{pendTxt}</Text> : null}

            {/* ── DIAL adaptativo ── */}
            <Animated.View style={[s.money, seg(2)]}>
              <View style={s.disp}>
                {mode === 'money' ? (
                  <>
                    <Text style={[s.dval, selMoney.k !== 'base' && s.dvalGreen]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false}>
                      {selEur.big}<Text style={s.dvalDec}>{selEur.dec}</Text>
                    </Text>
                    {selMoney.k === 'total' ? (
                      <View style={s.dsubBox}>
                        <Text style={s.dsub}>{l('Base', 'Base')} · {isYear ? `${st.aeYtd?.monthsElapsed || 0} ${l('meses', 'months')}` : monthName} · <Text style={s.dsubB}>{fmtEur0(A.base || 0)}</Text></Text>
                        <View style={s.gline}>
                          <View style={s.gpill}><Text style={s.gpillTxt}>+{fmtEur0(Math.max(0, total - (A.base || 0)))}</Text></View>
                          <Text style={s.dsub}>{l('ganho acima da base', 'earned above base')}</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={[s.dsub, s.dsubBox]}>{selMoney.sub}</Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={s.dlab}>{selSafe ? `${selSafe.w.grp === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · ${limLabel(selSafe.w)}` : ''}</Text>
                    <Text style={[s.dvalS, { color: barColor(selSafe ? selSafe.r : 0) }]} allowFontScaling={false}>{Math.round((selSafe ? selSafe.r : 0) * 100)}%</Text>
                    <Text style={s.dsub}>{selSafe ? `${doneTxt(selSafe.w)} / ${Math.round(selSafe.limit)} h · ` : ''}<Text style={s.dsubB}>{selSafe ? leftTxt(selSafe.w) : ''}</Text></Text>
                  </>
                )}
              </View>

              <View style={s.col}>
                {mode === 'money' ? moneyOpts.map((o, i) => {
                  const on = o.k === selKey;
                  return (
                    <TouchableOpacity key={o.k} onPress={() => pickDial(o.k)} activeOpacity={0.8} style={[s.opt, { transform: [{ translateX: arcX(i, moneyOpts.length) }] }]}>
                      <Text style={[s.onm, on && s.onmOn]}>{o.nm}</Text>
                      <View style={[s.cir, on && s.cirInk]}>
                        {on ? <Text style={s.cirPc}>{fmtPc1(total ? o.val / total : 0)}</Text> : <Icon name={o.ic} size={17} color="#9E9C93" />}
                      </View>
                    </TouchableOpacity>
                  );
                }) : safetyVis.map((o, i) => {
                  const on = o.k === selKey;
                  const col = barColor(o.r);
                  return (
                    <TouchableOpacity key={o.k} onPress={() => pickDial(o.k)} activeOpacity={0.8} style={[s.opt, { transform: [{ translateX: arcX(i, safetyVis.length) }] }]}>
                      <Text style={[s.onm, on && s.onmOn]}>{o.nm}</Text>
                      <View style={[s.cirS, on && { backgroundColor: col }]}>
                        <Text style={[s.cirPcS, { color: on ? PELE.paper : col }]}>{Math.round(o.r * 100)}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* Notas AE (estimativa · IPC · acordo) — só no modo Ganhos */}
            {mode === 'money' ? (
              <View style={s.aeNotes}>
                {A.missing ? <Text style={s.note}>{A.missing} {l('voo(s) sem rota completa não somam ao per diem.', 'flight(s) without full route not counted in per diem.')}</Text> : null}
                {A.estimated ? <Text style={s.note}>{ae.indexNote ? ae.indexNote(isYear ? +year : +String(st.ym).slice(0, 4), lang) : l('Valores indexados · estimativa — IPC oficial por confirmar.', 'Indexed values · estimate — official CPI to be confirmed.')}</Text> : null}
                {ae && ae.isAgreementExpired && ae.isAgreementExpired(nowD) ? <Text style={s.note}>{l('AE expirado · valores são referência até novo acordo.', 'Agreement expired · values are reference until a new agreement.')}</Text> : null}
                {/* Radar: a linha só existe com itens (zero = zero mobília). */}
                {audit && audit.count > 0 ? (
                  <Text style={[s.note, s.noteInk]} onPress={() => { select(); setAuditOpen(true); }}>
                    {l('Auditoria do mês', 'Month audit')} · {audit.count} {audit.count === 1 ? l('item por confirmar', 'item to confirm') : l('itens por confirmar', 'items to confirm')} ›
                  </Text>
                ) : null}
              </View>
            ) : null}
            {/* Batismo das cores no modo FTL: a nota nasce SOB O DIAL (o elemento que pintou). */}
            {mode !== 'money' && baptismNote ? <View style={s.aeNotes}>{baptismNote}</View> : null}

            {/* ── Bento (cards → folhas) ── */}
            <View style={s.div} />
            <Text style={s.mais}>{l('Mais', 'More')}</Text>
            <Animated.View style={[s.bento, seg(3)]}>
              {mode === 'money' ? (
                <TouchableOpacity style={[s.btile, s.btileWide]} activeOpacity={0.85} onPress={() => openSheet('seg')}>
                  <View style={[s.btIc, s.btIcAlarm]}><Icon name="gauge" size={20} color={PELE.red} /></View>
                  <View style={s.btWt}>
                    <View style={s.btNameWideRow}><Text style={s.btIdx}>{idx.seg}</Text><Text style={s.btNameWide}>{l('Segurança', 'Safety')}</Text></View>
                    <View style={s.btCapRow}><View style={s.btDot} /><Text style={s.btCap}>{fullest ? `${fullest.w.grp === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')} · ${limLabel(fullest.w)} · ${l('mais cheia', 'fullest')}` : l('sem janelas', 'no windows')}</Text></View>
                  </View>
                  <Text style={[s.btKeyWide, { color: barColor(fullest ? fullest.r : 0) }]}>{Math.round((fullest ? fullest.r : 0) * 100)}%</Text>
                </TouchableOpacity>
              ) : null}
              {/* Batismo das cores no modo AE: a nota nasce SOB O CARD Segurança (linha própria na grelha). */}
              {mode === 'money' && baptismNote ? <View style={{ flexBasis: '100%' }}>{baptismNote}</View> : null}

              <TouchableOpacity style={s.btile} activeOpacity={0.85} onPress={() => openSheet('voo')}>
                <View style={s.btTop}><View style={s.btIc}><Icon name="plane" size={19} color={PELE.ink} /></View><Text style={s.btIdx}>{idx.voo}</Text></View>
                <Text style={s.btName}>{l('Voo', 'Flight')}</Text>
                <Text style={s.btKey}>{fmtH(flightShownH)}</Text>
                <Text style={s.btCap}>{isYear ? `${flightPct}% ${l('do teto', 'of cap')}` : `${l('em', 'in')} ${monthName.toLowerCase()}`}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.btile} activeOpacity={0.85} onPress={() => openSheet('corpo')}>
                <View style={s.btTop}><View style={s.btIc}><Icon name="bed" size={19} color={PELE.ink} /></View><Text style={s.btIdx}>{idx.corpo}</Text></View>
                <Text style={s.btName}>{l('Corpo', 'Body')}</Text>
                <Text style={s.btKey}>{st.minRestH != null ? fmtH(st.minRestH) : '—'}</Text>
                <Text style={s.btCap}>{l('repouso mín', 'min rest')} · {st.reducedRests || 0} {l('curtos', 'short')}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Limites do acordo (TAP) — por baixo de Voo e Corpo (esboço design/limites-ae.html) */}
            {aeLim && aeLim.rules.length ? (
              <View style={s.aeLim}>
                <AeLimitsSection result={aeLim} crewType={isPilot ? 'pilot' : 'cabin'} lang={lang} todayIso={todayIso} onOpen={setAeRule} />
              </View>
            ) : null}

            {/* Cards extra — Férias (Ano) + Partilhar (o que o mockup não cobre) */}
            {isYear && hasVac ? (
              <View style={s.card}>
                <View style={s.aeHead}><View style={[s.aeDot, { backgroundColor: PELE.ok }]} /><Text style={s.cardTitle}>{l('Férias', 'Leave')} {year}</Text></View>
                <View style={s.body3}>
                  <View style={s.bcell}><Text style={s.bnum}>{vacTaken}</Text><Text style={s.blab}>{l('Gozados', 'Taken')}</Text></View>
                  <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{vacLeft}</Text><Text style={s.blab}>{l('Por marcar', 'To mark')}</Text></View>
                  <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{vacQuota}</Text><Text style={s.blab}>{l('Direito no ano', 'Annual right')}</Text></View>
                </View>
                {vacTaken > vacQuota ? <Text style={[s.note, { marginTop: 10 }]}>{l('Acima do plafond — podes ter dias reportados (Art. 240.º).', 'Over quota — you may have carried days over (Art. 240).')}</Text> : null}
              </View>
            ) : null}

            {isYear && st.flightMin > 0 ? (
              <TouchableOpacity onPress={() => { select(); setShareOpen(true); }} activeOpacity={0.85} style={s.shareBtn}
                accessibilityRole="button" accessibilityLabel={l('Partilhar o meu ano de voo', 'Share my year in the air')}>
                <Icon name="share" size={16} color={PELE.ink} />
                <Text style={s.shareTxt}>{l('Partilhar o meu ano de voo', 'Share my year in the air')}</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={s.foot}>{l('Estimativa a partir da tua escala. Fim de serviço = sign-off; sem ele, on-block + débrief do perfil (só voos). Toca num tema para o detalhe.', 'Estimated from your roster. Duty end = sign-off; without it, on-block + your profile debrief (flights only). Tap a theme for detail.')}</Text>
          </>
        )}
      </ScrollView>

      {/* ── Folha de uma regra do acordo ── */}
      <AeLimitSheet visible={!!aeRule} onClose={() => setAeRule(null)} ruleId={aeRule} result={aeLim}
        crewType={isPilot ? 'pilot' : 'cabin'} lang={lang} easa={easaFor(aeRule)} duties={duties} />

      {/* ── Folha 01 · Segurança (só no modo Ganhos) ── */}
      <PeleSheet visible={sheet === 'seg'} onClose={() => setSheet(null)}>
        <View style={s.shead}>
          <View style={[s.shIc, s.shIcAlarm]}><Icon name="gauge" size={19} color={PELE.red} /></View>
          <View style={s.shTt}>
            <Text style={s.shName}><Text style={s.shNameX}>{idx.seg} </Text>· {l('Segurança', 'Safety')}</Text>
            <Text style={s.shSub}>{safetyRows.length} {l('janelas FTL · a mais cheia', 'FTL windows · fullest')} <Text style={{ color: barColor(fullest ? fullest.r : 0) }}>{Math.round((fullest ? fullest.r : 0) * 100)}%</Text>
              <Text style={s.shLaw} onPress={() => { select(); setProva(provaFor('limites', provaCtx)); }}>  ·  <Text style={{ color: BRAND.signal }}>§</Text> ORO.FTL.210</Text>
            </Text>
          </View>
          <TouchableOpacity style={s.sClose} onPress={() => setSheet(null)} hitSlop={6}><Icon name="minus" size={16} color={PELE.grey} /></TouchableOpacity>
        </View>
        {['voo', 'serv'].map((g) => {
          const rows = safetyRows.filter((o) => o.w.grp === g);
          if (!rows.length) return null;
          return (
            <View key={g}>
              <View style={s.grp}><Icon name={g === 'voo' ? 'plane' : 'clock'} size={12} color={PELE.grey} /><Text style={s.grpTxt}>{g === 'voo' ? l('Voo', 'Flight') : l('Serviço', 'Duty')}</Text></View>
              {rows.map((o, i) => (
                <View key={o.k} style={s.win}>
                  <View style={s.winHead}>
                    <Text style={s.winName}>{limLabel(o.w)}</Text>
                    <Text style={s.winVal}><Text style={s.winValB}>{doneTxt(o.w)}</Text> / {Math.round(o.limit)} h</Text>
                  </View>
                  <GrowBar ratio={o.r} color={barColor(o.r)} track={s.track} fill={s.fill} delay={100 + i * 40} />
                  <View style={s.winFoot}>
                    <Text style={[s.pct, { color: barColor(o.r) }]}>{Math.round(o.r * 100)}%</Text>
                    <Text style={s.lft}>{leftTxt(o.w)}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        <Text style={s.bnote}>{l('As janelas contam para trás a partir de hoje — independentes do ano civil. ', 'Windows count back from today — independent of the calendar year. ')}<Text style={{ color: PELE.red, fontFamily: PELE_FONT.bodyBold }}>{l('≥ 90 %', '≥ 90%')}</Text>{l(' assinala atenção regulatória.', ' flags regulatory attention.')}</Text>
      </PeleSheet>

      {/* ── Folha · Voo ── */}
      <PeleSheet visible={sheet === 'voo'} onClose={() => setSheet(null)}>
        <View style={s.shead}>
          <View style={s.shIc}><Icon name="plane" size={19} color={PELE.ink} /></View>
          <View style={s.shTt}>
            <Text style={s.shName}><Text style={s.shNameX}>{idx.voo} </Text>· {l('Voo', 'Flight')}</Text>
            <Text style={s.shSub}>{l('horas de voo', 'flight hours')} · {isYear ? l('ano civil', 'calendar year') : monthName.toLowerCase()}</Text>
          </View>
          <TouchableOpacity style={s.sClose} onPress={() => setSheet(null)} hitSlop={6}><Icon name="minus" size={16} color={PELE.grey} /></TouchableOpacity>
        </View>
        <View style={s.vhero}>
          <Text style={s.vbig}><CountUp value={flightShownH} format={(n) => n.toLocaleString(locale, { maximumFractionDigits: 1 })} style={s.vbig} delay={120} /><Text style={s.vbigU}> h</Text></Text>
          {isYear ? <View style={s.vpct}><Text style={s.vpctN}>{flightPct}%</Text><Text style={s.vpctL}>{l('do teto', 'of cap')}</Text></View> : null}
        </View>
        {isYear ? <GrowBar ratio={flightRatio} color={PELE.ink} track={s.vbar} fill={s.vbarFill} /> : null}
        <View style={s.vmeta}>
          <Text style={s.lft}>{isYear ? leftTxt(yearFlightGap) : `${st.flights} ${l('voos', 'flights')} · ${st.sectors} ${l('setores', 'sectors')}`}</Text>
          {isYear ? <Text style={s.lft}>{l('teto', 'cap')} {nf(ANNUAL_FLIGHT_LIMIT_H)} h · ORO.FTL.210 b</Text> : null}
        </View>

        <View style={s.secH}><Icon name="stats" size={13} color={PELE.grey} /><Text style={s.secHTxt}>{isYear ? l('Voo por mês', 'Flight by month') : l('Voo por dia', 'Flight by day')}</Text></View>
        <View style={s.chart}>
          {chartData.map((m, i) => {
            const r = m.flightMin / maxBar;
            const isNow = isYear ? (+year === nowD.getFullYear() && i === nowD.getMonth()) : (st.ym === nowYm && (i + 1) === nowD.getDate());
            const lbl = isYear ? monthAbbr(i) : (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '');
            return (
              <View key={i} style={s.chartCol}>
                <View style={s.chartWrap}><MonthBar ratio={r} color={m.flightMin > 0 ? (isNow ? BRAND.signal : PELE.ink) : PELE.line} delay={120 + i * (isYear ? 30 : 12)} /></View>
                <Text style={[s.chartLbl, isNow && { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy }]} numberOfLines={1}>{lbl}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.two}>
          {kindsPresent.length ? (
            <View style={s.mini}>
              <Text style={s.miniH}>{l('Por tipo', 'By type')}</Text>
              {kindsPresent.slice(0, 4).map((k) => (
                <View key={k} style={s.mrow2}><Text style={s.mrow2K} numberOfLines={1}>{kindLabel(k)}</Text><Text style={s.mrow2V}>{st.byKind[k]}</Text></View>
              ))}
            </View>
          ) : null}
          {st.topDest.length ? (
            <View style={s.mini}>
              <Text style={s.miniH}>{l('Destinos', 'Destinations')}</Text>
              {st.topDest.slice(0, 4).map((d) => (
                <View key={d.code} style={s.mrow2}><View style={s.mrow2KRow}><Icon name="pin" size={12} color={PELE.grey} /><Text style={s.mrow2K}>{d.code}</Text></View><Text style={s.mrow2V}>×{d.n}</Text></View>
              ))}
            </View>
          ) : null}
        </View>
        <Text style={s.bnote}><Text style={s.bnoteB}>{st.flights}</Text> {l('voos', 'flights')} · <Text style={s.bnoteB}>{st.sectors}</Text> {l('setores', 'sectors')} {isYear ? l('no ano', 'this year') : l('no mês', 'this month')}.</Text>
      </PeleSheet>

      {/* ── Folha · Corpo ── */}
      <PeleSheet visible={sheet === 'corpo'} onClose={() => setSheet(null)}>
        <View style={s.shead}>
          <View style={s.shIc}><Icon name="bed" size={19} color={PELE.ink} /></View>
          <View style={s.shTt}>
            <Text style={s.shName}><Text style={s.shNameX}>{idx.corpo} </Text>· {l('Corpo', 'Body')}</Text>
            <Text style={s.shSub}>{l('repouso & fadiga', 'rest & fatigue')} · {isYear ? l('o teu ano', 'your year') : l('o teu mês', 'your month')}</Text>
          </View>
          <TouchableOpacity style={s.sClose} onPress={() => setSheet(null)} hitSlop={6}><Icon name="minus" size={16} color={PELE.grey} /></TouchableOpacity>
        </View>
        <View style={s.body3}>
          <View style={s.bcell}><Text style={s.bnum}>{st.minRestH != null ? st.minRestH.toLocaleString(locale, { maximumFractionDigits: 1 }) : '—'}<Text style={s.bnumU}>{st.minRestH != null ? 'h' : ''}</Text></Text><Text style={s.blab}>{l('Menor repouso entre serviços', 'Shortest rest between duties')}</Text></View>
          <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{st.reducedRests || 0}</Text><Text style={s.blab}>{l('Repousos abaixo do mínimo', 'Rests below the minimum')}</Text></View>
          <View style={[s.bcell, s.bcellB]}><Text style={s.bnum}>{st.longestStreak}<Text style={s.bnumU}>d</Text></Text><Text style={s.blab}>{l('Sequência máx. de serviço', 'Longest duty streak')}</Text></View>
        </View>
        {/* ── Radiação cósmica (v2 do mockup: linha achatada, SEM barra — número + âncora;
            zero voos com dose → a secção nem aparece; uma linha de contexto de cada vez). ── */}
        {radVisible ? (
          <View style={s.rad}>
            <TouchableOpacity style={s.radRow} activeOpacity={0.7}
              onPress={() => { select(); setProva({ ...provaFor('radiacao', provaCtx), value: `≈ ${fmtMsv(rad.mSv)} mSv` }); }}
              accessibilityRole="button" accessibilityLabel={l('Radiação cósmica — ver a lei', 'Cosmic radiation — see the law')}>
              <Text style={s.radLab}>{l('Radiação cósmica · estimativa', 'Cosmic radiation · estimate')} <Text style={{ color: BRAND.signal }}>§</Text></Text>
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
        <Text style={s.bnote}><Text style={s.bnoteB}>{st.offDays}</Text> {l('dias de folga e', 'days off and')} <Text style={s.bnoteB}>{st.nightStops}</Text> {l('paragens noturnas', 'night stops')} {isYear ? l('no ano', 'this year') : l('no mês', 'this month')}.{st.reducedRests ? l(' Abaixo do mínimo = menos do que o serviço anterior ou 12 h na base / 10 h fora (ORO.FTL.235). A app estima: confirma com a companhia.', ' Below the minimum = less than the preceding duty or 12 h at base / 10 h away (ORO.FTL.235). The app estimates: confirm with the company.') : ''}</Text>
      </PeleSheet>

      <YearShareCard visible={shareOpen} onClose={() => setShareOpen(false)} st={isYear ? st : null} year={year} companyName={company?.name} />
      <ProvaSheet visible={!!prova} onClose={() => setProva(null)} prova={prova} lang={lang} />
      <AuditSheet visible={!!auditOpen} onClose={() => setAuditOpen(null)} audit={audit} monthName={monthName}
        lang={lang} provaCtx={provaCtx}
        onOpenDay={(iso) => navigation.navigate('Escala', { screen: 'DutyDetail', initial: false, params: { date: iso } })} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PELE.paper },
  headWrap: { paddingHorizontal: GUTTER },   // herói fixo fora do scroll (género Perfil/Validades)
  scroll: { paddingHorizontal: GUTTER },

  // Nav de mês — vai no `wordTrailing` do PeleHeader (o resto do cabeçalho é do PeleHeader)
  mnav: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  mnavBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  mnavBtnOff: { opacity: 0.4 },

  // Segmento Mês/Ano
  scoperow: { marginBottom: 14 },
  segWrap: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: PELE.soft, borderRadius: RADIUS.pill, padding: 3, gap: 2 },
  segb: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: RADIUS.pill },
  segbOn: { backgroundColor: PELE.ink },
  segTxt: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy, color: PELE.grey },
  segTxtOn: { color: PELE.paper },

  years: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  yChip: { borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.pill, paddingHorizontal: 15, paddingVertical: 7, backgroundColor: PELE.paper },
  yChipOn: { backgroundColor: PELE.ink, borderColor: PELE.ink },
  yTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  yTxtOn: { color: PELE.paper },

  // Empty
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 64 },
  emptyTxt: { fontSize: 15, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, textAlign: 'center' },
  emptySub: { fontSize: 12.5, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PELE.ink, borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 11, marginTop: 8 },
  emptyBtnTxt: { fontSize: 13, fontFamily: PELE_FONT.bodyBold, color: PELE.paper },

  // Section eyebrow (dial)
  seybRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  seybDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PELE.red },
  seyb: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.grey },

  // Dial
  money: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 228 },
  disp: { flex: 1, minWidth: 0 },
  // Dado-estrela da página: maior que a palavra do topo (44) — a hierarquia manda (2026-07-10, user).
  dval: { fontFamily: PELE_FONT.display, fontSize: 58, lineHeight: 56, color: PELE.ink },
  dvalDec: { fontFamily: PELE_FONT.displaySemi, fontSize: 23, color: PELE.grey },
  dvalGreen: { color: PELE.ok },
  dvalS: { fontFamily: PELE_FONT.display, fontSize: 60, lineHeight: 56, marginTop: 4 },
  dlab: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.6, textTransform: 'uppercase', color: PELE.grey },
  dsubBox: { marginTop: 10 },
  dsub: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 18 },
  dsubB: { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy },
  gline: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, flexWrap: 'wrap' },
  gpill: { backgroundColor: PELE.okSoft, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  gpillTxt: { color: PELE.ok, fontSize: 11.5, fontFamily: PELE_FONT.bodyHeavy },

  col: { alignItems: 'flex-end', gap: 9 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  onm: { fontSize: 12, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },
  onmOn: { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy },
  cir: { minWidth: 40, height: 40, borderRadius: 20, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  cirInk: { backgroundColor: PELE.ink, paddingHorizontal: 11, shadowColor: '#141412', shadowOpacity: 0.26, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cirPc: { fontSize: 12.5, fontFamily: PELE_FONT.bodyHeavy, color: PELE.paper },
  cirS: { minWidth: 44, height: 33, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  cirPcS: { fontSize: 12, fontFamily: PELE_FONT.bodyHeavy },

  aeNotes: { marginTop: 12, gap: 4 },
  note: { fontSize: 11, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 15 },
  noteInk: { color: PELE.ink, fontFamily: PELE_FONT.bodyBold },
  shLaw: { fontFamily: PELE_FONT.bodyBold, color: PELE.grey },   // § da PROVA no sub da folha (tocável)

  // Radiação cósmica (folha Corpo, mockup radiacao-corpo v2): linha achatada na gramática
  // da folha — hairline + rótulo/valor + contexto; batismo no âmbar-doc (1×-na-vida).
  rad: { borderTopWidth: 1, borderTopColor: PELE.line, marginTop: 14, paddingTop: 12 },
  radRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  radLab: { flex: 1, fontSize: 9.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.3, color: PELE.grey, textTransform: 'uppercase' },
  radVal: { fontFamily: PELE_FONT.display, fontSize: 24, color: PELE.ink, fontVariant: ['tabular-nums'] },
  radValU: { fontSize: 13, color: PELE.grey, fontFamily: PELE_FONT.bodyMed },
  radCtx: { fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 15, marginTop: 5 },
  radCtxB: { color: PELE.ink, fontFamily: PELE_FONT.bodyBold },
  radBapt: { backgroundColor: '#FFF9E8', borderWidth: 1, borderColor: '#F2E2AC', borderRadius: 12, padding: 11, marginTop: 12, fontSize: 10.5, fontFamily: PELE_FONT.bodyMed, color: '#5C5232', lineHeight: 15, overflow: 'hidden' },
  radBaptB: { color: PELE.ink, fontFamily: PELE_FONT.bodyBold },

  div: { height: 1, backgroundColor: PELE.line, marginTop: 22, marginBottom: 16 },
  mais: { fontSize: 10.5, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.1, textTransform: 'uppercase', color: PELE.grey, marginBottom: 12 },

  // Bento
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  aeLim: { marginTop: SPACE.xxl },
  btile: { width: '47%', flexGrow: 1, minHeight: 118, padding: 14, backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: 16 },
  btileWide: { width: '100%', flexBasis: '100%', flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 0, padding: 15 },
  btWt: { flex: 1, minWidth: 0 },
  btTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  btIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  btIcAlarm: { backgroundColor: PELE.redSoft },
  btIdx: { fontFamily: PELE_FONT.displaySemi, fontSize: 15, letterSpacing: 1, color: BRAND.signal },
  btName: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, marginBottom: 5 },
  btNameWideRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  btNameWide: { fontSize: 15, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },
  btKey: { fontFamily: PELE_FONT.display, fontSize: 29, lineHeight: 29, color: PELE.ink },
  btKeyWide: { fontFamily: PELE_FONT.display, fontSize: 33, lineHeight: 33 },
  btCap: { marginTop: 6, fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  btCapRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  btDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PELE.red },

  // Cards extra
  card: { backgroundColor: PELE.paper, borderWidth: 1, borderColor: PELE.line, borderRadius: RADIUS.lg, padding: 16, marginTop: 12 },
  aeHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  aeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PELE.red },
  cardTitle: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.8, textTransform: 'uppercase', color: PELE.grey },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: PELE.line, borderStyle: 'dashed', borderRadius: RADIUS.lg, paddingVertical: 12, marginTop: 12 },
  shareTxt: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink },

  foot: { fontSize: 11, color: PELE.grey, fontFamily: PELE_FONT.bodyMed, lineHeight: 16, marginTop: 16, paddingHorizontal: 2, marginBottom: 6 },

  // ── Folhas de detalhe ──
  shead: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 15 },
  shIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },
  shIcAlarm: { backgroundColor: PELE.redSoft },
  shTt: { flex: 1, minWidth: 0 },
  shName: { fontSize: 11, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.8, textTransform: 'uppercase', color: PELE.grey },
  shNameX: { fontFamily: PELE_FONT.displaySemi, color: BRAND.signal, fontSize: 13 },
  shSub: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.ink, marginTop: 2 },
  sClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: PELE.soft, alignItems: 'center', justifyContent: 'center' },

  grp: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 9 },
  grpTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1.3, textTransform: 'uppercase', color: PELE.grey },
  win: { marginBottom: 13 },
  winHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  winName: { fontSize: 12.5, fontFamily: PELE_FONT.bodyMed, color: PELE.ink },
  winVal: { fontFamily: PELE_FONT.displayMed, fontSize: 14, color: PELE.grey },
  winValB: { color: PELE.ink, fontFamily: PELE_FONT.displaySemi },
  track: { height: 7, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.pill },
  winFoot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 5 },
  pct: { fontFamily: PELE_FONT.displaySemi, fontSize: 13 },
  lft: { fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey },
  bnote: { marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: PELE.line, fontSize: 11, fontFamily: PELE_FONT.bodyMed, color: PELE.grey, lineHeight: 17 },
  bnoteB: { color: PELE.ink, fontFamily: PELE_FONT.bodyHeavy },

  vhero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  vbig: { fontFamily: PELE_FONT.display, fontSize: 50, lineHeight: 44, color: PELE.ink },
  vbigU: { fontSize: 20, color: PELE.grey, fontFamily: PELE_FONT.displayMed },
  vpct: { alignItems: 'flex-end' },
  vpctN: { fontFamily: PELE_FONT.display, fontSize: 24, lineHeight: 24, color: PELE.ink },
  vpctL: { fontSize: 10.5, color: PELE.grey, fontFamily: PELE_FONT.bodyMed },
  vbar: { height: 9, borderRadius: RADIUS.pill, backgroundColor: PELE.soft, overflow: 'hidden' },
  vbarFill: { height: '100%', borderRadius: RADIUS.pill },
  vmeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 11 },
  secHTxt: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 1, textTransform: 'uppercase', color: PELE.grey },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 92, gap: 6 },
  chartCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  chartWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartLbl: { fontSize: 9, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, textTransform: 'uppercase' },

  two: { flexDirection: 'row', gap: 11, marginTop: 16 },
  mini: { flex: 1, borderWidth: 1, borderColor: PELE.line, borderRadius: 14, padding: 12 },
  miniH: { fontSize: 10, fontFamily: PELE_FONT.bodyHeavy, letterSpacing: 0.7, textTransform: 'uppercase', color: PELE.grey, marginBottom: 9 },
  mrow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  mrow2KRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mrow2K: { fontSize: 12.5, fontFamily: PELE_FONT.body, color: PELE.ink },
  mrow2V: { fontSize: 12.5, fontFamily: PELE_FONT.bodyBold, color: PELE.grey },

  body3: { flexDirection: 'row' },
  bcell: { flex: 1, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  bcellB: { borderLeftWidth: 1, borderLeftColor: PELE.line },
  bnum: { fontFamily: PELE_FONT.display, fontSize: 32, lineHeight: 34, color: PELE.ink, textAlign: 'center' },
  bnumU: { fontSize: 15, color: PELE.grey, fontFamily: PELE_FONT.displayMed },
  blab: { fontSize: 10, fontFamily: PELE_FONT.bodyBold, color: PELE.grey, lineHeight: 14, marginTop: 7, textAlign: 'center' },
});
