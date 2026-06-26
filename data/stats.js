// Estatísticas anuais (YTD) a partir das duties (mapa { 'YYYY-MM-DD': duty }).
// Módulo PURO (sem React/expo) → testável por golden. Para companhias AE, recebe
// `ae`+category+contract para estimar ganhos YTD (base × meses decorridos + per diem
// das rotas). Fonte: o store cru `duties` (não o dayLog do motor FTL), para contar
// TUDO o que está na escala, importado ou manual.
import { monthlyPerDiem } from './perdiem';
import { resolveCrew } from './crewHistory';

export const STAT_KINDS = ['flight', 'standby_airport', 'standby_home', 'positioning', 'office', 'training'];
export const ANNUAL_FLIGHT_LIMIT_H = 1000; // CS-FTL.1: 1000 h de voo em 12 meses consecutivos

const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
// Duração de serviço aproximada (report → block_on), overnight-aware. null sem dados.
const dutyMinutes = (d) => {
  const r = toMin(d.report_time), e = toMin(d.block_on);
  if (r == null || e == null) return null;
  return e >= r ? e - r : (e + 1440 - r);
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
export const yearStats = (duties = {}, { year, ae = null, category = null, contract = '12/12', crewHistory = null, now = new Date() } = {}) => {
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
    count++; months[mi].count++;
    const kind = d.kind || 'flight';
    byKind[kind] = (byKind[kind] || 0) + 1;
    if (d.nightStop) nightStops++;
    const dn = dayNum(date);
    if (dn != null) dutyDayNums.push(dn);
    const rm = toMin(d.report_time), bo = toMin(d.block_on);
    if (dn != null && rm != null && bo != null) restEntries.push({ start: dn * 1440 + rm, end: dn * 1440 + bo + (bo < rm ? 1440 : 0) });
    const dm = dutyMinutes(d);
    if (dm != null) { dutyMin += dm; months[mi].dutyMin += dm; }
    if (kind === 'flight') {
      flights++;
      const fm = d.flight_minutes || 0; flightMin += fm; months[mi].flightMin += fm;
      const sc = d.sectors || 0; sectors += sc; months[mi].sectors += sc;
      const codes = String(d.route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
      for (let i = 1; i < codes.length; i++) { const a = codes[i]; if (a) dest[a] = (dest[a] || 0) + 1; }
      if (codes.length >= 2) withRoute++;
    }
  }
  const topDest = Object.entries(dest).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, n]) => ({ code, n }));

  // AE YTD (estimativa) — só companhias AE com categoria. A categoria escala o AE inteiro
  // (base + per-diem + pernoita) e é EFFECTIVE-DATED: somamos MÊS A MÊS com a categoria/
  // contrato que valia em cada mês → uma promoção a meio do ano NÃO reescreve os meses
  // anteriores. `crewHistory` é a linha do tempo; sem ela, cai para 1 período (category/
  // contract escalares) = comportamento antigo (retrocompatível).
  let aeYtd = null;
  const history = (Array.isArray(crewHistory) && crewHistory.length)
    ? crewHistory
    : (category ? [{ category, contract: contract || '12/12', from: '0000-01' }] : []);
  if (ae && history.length && typeof ae.monthlyBase === 'function') {
    const cy = now.getFullYear();
    const monthsElapsed = (+y < cy) ? 12 : (+y > cy ? 0 : now.getMonth() + 1);
    const index = ae.indexFactor ? ae.indexFactor(+y) : 1;   // indexação 2025+ por ano (Anexo I)
    let baseYtd = 0, perDiemYtd = 0, withRoute = 0, missing = 0;
    for (let mo = 0; mo < monthsElapsed; mo++) {
      const ym = `${y}-${String(mo + 1).padStart(2, '0')}`;
      const { category: catM, contract: ctrM } = resolveCrew(history, ym);
      if (!catM) continue;
      baseYtd += ae.monthlyBase(catM, { contract: ctrM, index }) || 0;
      const pd = monthlyPerDiem(duties, catM, ae, { ym, index });   // per-diem desse mês, à categoria desse mês
      if (pd) { perDiemYtd += pd.total; withRoute += pd.withRoute; missing += pd.missing; }
    }
    aeYtd = {
      base: +baseYtd.toFixed(2), perDiem: +perDiemYtd.toFixed(2),
      total: +(baseYtd + perDiemYtd).toFixed(2), monthsElapsed, index,
      estimated: !!(ae.isIndexEstimated && ae.isIndexEstimated(+y)) && index > 1,
      withRoute, missing,
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
    year: y,
    flightMin, flightHours: +(flightMin / 60).toFixed(1),
    dutyMin, dutyHours: +(dutyMin / 60).toFixed(1),
    sectors, count, flights, withRoute, nightStops,
    offDays, longestStreak, minRestH, reducedRests,
    byKind, months, topDest, aeYtd,
  };
};
