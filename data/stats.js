// Estatísticas anuais (YTD) a partir das duties (mapa { 'YYYY-MM-DD': duty }).
// Módulo PURO (sem React/expo) → testável por golden. Para companhias AE, estima os
// ganhos pelo MESMO caminho da vista Mês (monthlyAe mês a mês + eventos do mês via
// ae.monthExtras) — Ano = soma dos Meses. Fonte: o store cru `duties` (não o dayLog
// do motor FTL), para contar TUDO o que está na escala, importado ou manual.
import { monthlyPerDiem, monthlyAe } from './perdiem';
import { eventCounts } from './aeEvents';
import { resolveCrew } from './crewHistory';

export const STAT_KINDS = ['flight', 'standby_airport', 'standby_home', 'positioning', 'office', 'training'];
// ORO.FTL.210(b): 900 h de voo por ANO CIVIL — é este o limite da vista Ano (ano civil).
// Os outros dois da alínea (100 h/28 d e 1000 h/12 meses consecutivos) vivem no motor ftl/.
export const ANNUAL_FLIGHT_LIMIT_H = 900;

const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
// Duração de serviço (report → FIM), overnight-aware. Fim = sign-off REAL; senão block_on +
// débrief do perfil (ORO.FTL.235c). null sem dados. `pf` = serviço pós-voo (min) do perfil.
const dutyMinutes = (d, pf = 0) => {
  const r = toMin(d.report_time), e = toMin(d.block_on);
  if (r == null || e == null) return null;
  if ((d.kind || 'flight') !== 'flight') pf = 0;         // débrief é pós-VOO (235c) — não-voo acaba no fim registado
  const so = toMin(d.signOff);
  const end = so != null ? so : e;                       // fim = sign-off real, senão block_on
  let dur = end >= r ? end - r : (end + 1440 - r);
  if (so == null) dur += (pf || 0);                       // sem sign-off → soma o débrief do perfil
  return dur;
};
// Nº do dia (desde a época) p/ sequências/repouso; dias do ano p/ as folgas.
const dayNum = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null; };
const daysInYear = (y) => ((y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365);
const dayOfYear = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000) + 1;

// Anos com duties (mais recente primeiro) — para o seletor de ano.
export const availableYears = (duties = {}) => {
  const ys = new Set();
  for (const date in duties) { const d = duties[date]; if (d && !d.deleted) ys.add(String(date).slice(0, 4)); }
  const out = [...ys].filter((y) => /^\d{4}$/.test(y)).sort((a, b) => b.localeCompare(a));
  return out;
};

// Agrega o ano `year`. now = referência (meses decorridos p/ a base AE; testável).
export const yearStats = (duties = {}, { year, ae = null, category = null, contract = '12/12', crewHistory = null, fleet = null, postFlightMin = 0, events = [], now = new Date() } = {}) => {
  const y = String(year || now.getFullYear());
  const months = Array.from({ length: 12 }, () => ({ flightMin: 0, dutyMin: 0, sectors: 0, count: 0 }));
  const byKind = {}; STAT_KINDS.forEach((k) => { byKind[k] = 0; });
  const dest = {};
  let flightMin = 0, dutyMin = 0, sectors = 0, count = 0, flights = 0, withRoute = 0, nightStops = 0;
  const dutyDayNums = [], restEntries = [];   // p/ sequências e repouso entre serviços

  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (!String(date).startsWith(y + '-')) continue;
    const mi = +String(date).slice(5, 7) - 1;
    if (mi < 0 || mi > 11) continue;
    count++; months[mi].count++;                 // DIA com serviço (folgas contam-se por dia)
    const dn = dayNum(date);
    if (dn != null) dutyDayNums.push(dn);          // sequência de dias seguidos (day-level)
    // A EASA conta por PERÍODO DE SERVIÇO (ORO.FTL.210): horas/voo/setores/tipo somam a
    // primária + TODOS os `extra` do dia (multi-serviço). Pernoita fica day-level (1 noite/dia).
    const svcs = [d, ...(Array.isArray(d.extra) ? d.extra : [])];
    if (svcs.some((s) => s && s.nightStop)) nightStops++;
    for (const s of svcs) {
      if (!s) continue;
      const kind = s.kind || 'flight';
      byKind[kind] = (byKind[kind] || 0) + 1;
      const rm = toMin(s.report_time), bo = toMin(s.block_on);
      if (dn != null && rm != null && bo != null) {
        // Fim p/ REPOUSO = mesma convenção do dutyMinutes (sign-off real; senão block_on
        // + débrief nos voos, 235c) — o repouso só começa depois do pós-voo.
        const so = toMin(s.signOff);
        const clk = so != null ? so : bo;
        const end = dn * 1440 + clk + (clk < rm ? 1440 : 0) + (so == null && (s.kind || 'flight') === 'flight' ? (postFlightMin || 0) : 0);
        restEntries.push({ start: dn * 1440 + rm, end });
      }
      const dm = dutyMinutes(s, postFlightMin);
      if (dm != null) { dutyMin += dm; months[mi].dutyMin += dm; }
      if (kind === 'flight') {
        flights++;
        const fm = s.flight_minutes || 0; flightMin += fm; months[mi].flightMin += fm;
        const sc = s.sectors || 0; sectors += sc; months[mi].sectors += sc;
        const codes = String(s.route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
        for (let i = 1; i < codes.length; i++) { const a = codes[i]; if (a) dest[a] = (dest[a] || 0) + 1; }
        if (codes.length >= 2) withRoute++;
      }
    }
  }
  const topDest = Object.entries(dest).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, n]) => ({ code, n }));

  // AE YTD (estimativa) — só companhias AE com categoria. A categoria escala o AE inteiro
  // e é EFFECTIVE-DATED: somamos MÊS A MÊS com a categoria/contrato que valia em cada mês
  // → uma promoção NÃO reescreve os meses anteriores. Cada mês soma pelo MESMO caminho da
  // vista Mês (monthlyAe: base + abono p/ falhas + per-diem + pernoita + OFC4/ADTY/papéis/
  // DDO-WFLY) + eventos do mês (ae.monthExtras) — o Ano bate com a soma dos Meses. AEs
  // mínimos sem computeAeMonth caem no cálculo antigo (base + per-diem) — retrocompatível.
  let aeYtd = null;
  const history = (Array.isArray(crewHistory) && crewHistory.length)
    ? crewHistory
    : (category ? [{ category, contract: contract || '12/12', from: '0000-01' }] : []);
  if (ae && history.length && typeof ae.monthlyBase === 'function') {
    const cy = now.getFullYear();
    const monthsElapsed = (+y < cy) ? 12 : (+y > cy ? 0 : now.getMonth() + 1);
    const index = ae.indexFactor ? ae.indexFactor(+y) : 1;   // indexação 2025+ por ano (Anexo I)
    let baseY = 0, cashY = 0, perDiemY = 0, nightY = 0, extrasY = 0, eventsY = 0, totalY = 0, wrY = 0, missY = 0;
    for (let mo = 0; mo < monthsElapsed; mo++) {
      const ym = `${y}-${String(mo + 1).padStart(2, '0')}`;
      const { category: catM, contract: ctrM } = resolveCrew(history, ym);
      if (!catM) continue;
      const m = monthlyAe(duties, catM, ctrM || '12/12', ae, { ym, index, fleet });   // à categoria desse mês (frota → coluna A no TAP)
      if (m) {
        baseY += m.base || 0; cashY += m.cashHandling || 0; perDiemY += m.perDiem || 0;
        nightY += m.nightStops || 0; extrasY += m.extras || 0; totalY += m.total || 0;
        wrY += m.withRoute; missY += m.missing;
      } else {
        const b = ae.monthlyBase(catM, { contract: ctrM, index }) || 0;
        baseY += b; totalY += b;
        const pd = monthlyPerDiem(duties, catM, ae, { ym, index, fleet });
        if (pd) { perDiemY += pd.total; totalY += pd.total; wrY += pd.withRoute; missY += pd.missing; }
      }
      if (ae.monthExtras) {
        const xt = ae.monthExtras(catM, eventCounts(events, ym), { index });
        if (xt && xt.total) { eventsY += xt.total; totalY += xt.total; }
      }
    }
    aeYtd = {
      base: +baseY.toFixed(2), cash: +cashY.toFixed(2), perDiem: +perDiemY.toFixed(2),
      nightStops: +nightY.toFixed(2), extras: +extrasY.toFixed(2), events: +eventsY.toFixed(2),
      total: +totalY.toFixed(2), monthsElapsed, index,
      estimated: !!(ae.isIndexEstimated && ae.isIndexEstimated(+y)) && index > 1,
      withRoute: wrY, missing: missY,
    };
  }

  // ── Repouso & folgas ──
  // Dias de folga = dias decorridos no ano − dias com serviço (estimativa, 1 duty/dia).
  const cy = now.getFullYear();
  const elapsed = (+y < cy) ? daysInYear(+y) : (+y > cy ? 0 : dayOfYear(now));
  const offDays = Math.max(0, elapsed - count);
  // Sequência máxima de dias SEGUIDOS de serviço (indicador de fadiga).
  dutyDayNums.sort((a, b) => a - b);
  let longestStreak = 0, run = 0, prev = null;
  for (const n of dutyDayNums) { run = (prev != null && n === prev + 1) ? run + 1 : 1; longestStreak = Math.max(longestStreak, run); prev = n; }
  // Menor repouso entre serviços consecutivos (h) + nº de repousos reduzidos (<11 h).
  restEntries.sort((a, b) => a.start - b.start);
  let minRestMin = null, reducedRests = 0;
  for (let i = 1; i < restEntries.length; i++) {
    const rest = restEntries[i].start - restEntries[i - 1].end;
    if (rest <= 0) continue;
    if (minRestMin == null || rest < minRestMin) minRestMin = rest;
    if (rest < 11 * 60) reducedRests++;
  }
  const minRestH = minRestMin != null ? +(minRestMin / 60).toFixed(1) : null;

  return {
    scope: 'year', year: y,
    flightMin, flightHours: +(flightMin / 60).toFixed(1),
    dutyMin, dutyHours: +(dutyMin / 60).toFixed(1),
    sectors, count, flights, withRoute, nightStops,
    offDays, longestStreak, minRestH, reducedRests,
    byKind, months, topDest, aeYtd,
  };
};

const daysInMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();

// Agrega UM mês (`ym`='YYYY-MM') — a MESMA família de números do `yearStats`, para a
// vista de Mês das Estatísticas. `days` = horas de voo por dia (gráfico diário); `aeMonth`
// = ganhos estimados do mês (base + per-diem + pernoita, via monthlyAe, à categoria/contrato
// EFFECTIVE-DATED desse mês). Módulo PURO (testável por golden).
export const monthStats = (duties = {}, { ym, ae = null, category = null, contract = '12/12', crewHistory = null, fleet = null, postFlightMin = 0, events = [], now = new Date() } = {}) => {
  const [Y, M] = String(ym || '').split('-').map(Number);
  const y = Y || now.getFullYear();
  const m0 = M ? M - 1 : now.getMonth();
  const ymStr = `${y}-${String(m0 + 1).padStart(2, '0')}`;
  const dim = daysInMonth(y, m0);
  const days = Array.from({ length: dim }, (_, i) => ({ day: i + 1, flightMin: 0, count: 0 }));
  const byKind = {}; STAT_KINDS.forEach((k) => { byKind[k] = 0; });
  const dest = {};
  let flightMin = 0, dutyMin = 0, sectors = 0, count = 0, flights = 0, withRoute = 0, nightStops = 0;
  const dutyDayNums = [], restEntries = [];

  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (!String(date).startsWith(ymStr + '-')) continue;
    const di = +String(date).slice(8, 10) - 1;
    count++;                                      // DIA com serviço (day-level)
    const dn = dayNum(date);
    if (dn != null) dutyDayNums.push(dn);
    // Primária + extra (ORO.FTL.210 conta por serviço); pernoita day-level (1 noite/dia).
    const svcs = [d, ...(Array.isArray(d.extra) ? d.extra : [])];
    if (svcs.some((s) => s && s.nightStop)) nightStops++;
    for (const s of svcs) {
      if (!s) continue;
      const kind = s.kind || 'flight';
      byKind[kind] = (byKind[kind] || 0) + 1;
      const rm = toMin(s.report_time), bo = toMin(s.block_on);
      if (dn != null && rm != null && bo != null) {
        // Fim p/ REPOUSO = mesma convenção do dutyMinutes (sign-off real; senão block_on
        // + débrief nos voos, 235c) — o repouso só começa depois do pós-voo.
        const so = toMin(s.signOff);
        const clk = so != null ? so : bo;
        const end = dn * 1440 + clk + (clk < rm ? 1440 : 0) + (so == null && (s.kind || 'flight') === 'flight' ? (postFlightMin || 0) : 0);
        restEntries.push({ start: dn * 1440 + rm, end });
      }
      const dm = dutyMinutes(s, postFlightMin);
      if (dm != null) dutyMin += dm;
      if (kind === 'flight') {
        flights++;
        const fm = s.flight_minutes || 0; flightMin += fm;
        if (di >= 0 && di < dim) { days[di].flightMin += fm; days[di].count++; }
        const sc = s.sectors || 0; sectors += sc;
        const codes = String(s.route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
        for (let i = 1; i < codes.length; i++) { const a = codes[i]; if (a) dest[a] = (dest[a] || 0) + 1; }
        if (codes.length >= 2) withRoute++;
      }
    }
  }
  const topDest = Object.entries(dest).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, n]) => ({ code, n }));

  // Folgas no mês = dias DECORRIDOS do mês − dias com serviço (mês corrente: até hoje).
  const cy = now.getFullYear(), cm = now.getMonth();
  const elapsed = (y < cy || (y === cy && m0 < cm)) ? dim : ((y > cy || (y === cy && m0 > cm)) ? 0 : now.getDate());
  const offDays = Math.max(0, elapsed - count);

  dutyDayNums.sort((a, b) => a - b);
  let longestStreak = 0, run = 0, prev = null;
  for (const n of dutyDayNums) { run = (prev != null && n === prev + 1) ? run + 1 : 1; longestStreak = Math.max(longestStreak, run); prev = n; }
  restEntries.sort((a, b) => a.start - b.start);
  let minRestMin = null, reducedRests = 0;
  for (let i = 1; i < restEntries.length; i++) {
    const rest = restEntries[i].start - restEntries[i - 1].end;
    if (rest <= 0) continue;
    if (minRestMin == null || rest < minRestMin) minRestMin = rest;
    if (rest < 11 * 60) reducedRests++;
  }
  const minRestH = minRestMin != null ? +(minRestMin / 60).toFixed(1) : null;

  // AE do mês — categoria/contrato EFFECTIVE-DATED desse mês (uma promoção não reescreve o
  // passado). `events` = extras do mês (eventos datados) valorizados pelo ae.monthExtras →
  // o total daqui é o MESMO do Início/Cálculos (aeMonthTotal + eventCounts). As parcelas
  // devolvidas SOMAM ao total (auditável): base+cash+perDiem+nightStops+extras+events.
  let aeMonth = null;
  const history = (Array.isArray(crewHistory) && crewHistory.length)
    ? crewHistory
    : (category ? [{ category, contract: contract || '12/12', from: '0000-01' }] : []);
  const resolved = history.length ? resolveCrew(history, ymStr) : { category: null, contract: '12/12' };
  if (ae && resolved.category && typeof ae.monthlyBase === 'function') {
    const index = ae.indexFactor ? ae.indexFactor(y) : 1;
    const m = monthlyAe(duties, resolved.category, resolved.contract || '12/12', ae, { ym: ymStr, index, fleet });
    const xt = ae.monthExtras ? ae.monthExtras(resolved.category, eventCounts(events, ymStr), { index }) : null;
    const eventsEur = xt ? +(+xt.total).toFixed(2) : 0;
    if (m) aeMonth = {
      base: m.base, cash: m.cashHandling || 0, perDiem: m.perDiem, nightStops: m.nightStops,
      extras: m.extras || 0, events: eventsEur, total: +((m.total || 0) + eventsEur).toFixed(2),
      withRoute: m.withRoute, missing: m.missing,
      estimated: !!(ae.isIndexEstimated && ae.isIndexEstimated(y)) && index > 1,
    };
  }

  return {
    scope: 'month', ym: ymStr, year: y, month: m0,
    flightMin, flightHours: +(flightMin / 60).toFixed(1),
    dutyMin, dutyHours: +(dutyMin / 60).toFixed(1),
    sectors, count, flights, withRoute, nightStops,
    offDays, longestStreak, minRestH, reducedRests,
    byKind, days, topDest, aeMonth,
  };
};
