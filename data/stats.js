// Estatísticas anuais (YTD) a partir das duties (mapa { 'YYYY-MM-DD': duty }).
// Módulo PURO (sem React/expo) → testável por golden. Para companhias AE, recebe
// `ae`+category+contract para estimar ganhos YTD (base × meses decorridos + per diem
// das rotas). Fonte: o store cru `duties` (não o dayLog do motor FTL), para contar
// TUDO o que está na escala, importado ou manual.
import { monthlyPerDiem } from './perdiem';

export const STAT_KINDS = ['flight', 'standby_airport', 'standby_home', 'positioning', 'office', 'training'];
export const ANNUAL_FLIGHT_LIMIT_H = 1000; // CS-FTL.1: 1000 h de voo em 12 meses consecutivos

const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
// Duração de serviço aproximada (report → block_on), overnight-aware. null sem dados.
const dutyMinutes = (d) => {
  const r = toMin(d.report_time), e = toMin(d.block_on);
  if (r == null || e == null) return null;
  return e >= r ? e - r : (e + 1440 - r);
};

// Anos com duties (mais recente primeiro) — para o seletor de ano.
export const availableYears = (duties = {}) => {
  const ys = new Set();
  for (const date in duties) { const d = duties[date]; if (d && !d.deleted) ys.add(String(date).slice(0, 4)); }
  const out = [...ys].filter((y) => /^\d{4}$/.test(y)).sort((a, b) => b.localeCompare(a));
  return out;
};

// Agrega o ano `year`. now = referência (meses decorridos p/ a base AE; testável).
export const yearStats = (duties = {}, { year, ae = null, category = null, contract = '12/12', now = new Date() } = {}) => {
  const y = String(year || now.getFullYear());
  const months = Array.from({ length: 12 }, () => ({ flightMin: 0, dutyMin: 0, sectors: 0, count: 0 }));
  const byKind = {}; STAT_KINDS.forEach((k) => { byKind[k] = 0; });
  const dest = {};
  let flightMin = 0, dutyMin = 0, sectors = 0, count = 0, flights = 0, withRoute = 0, nightStops = 0;

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

  // AE YTD (estimativa) — só companhias AE com categoria. base mensal × meses
  // decorridos + per diem das rotas do ano (mesma lógica do cartão AE da Home).
  let aeYtd = null;
  if (ae && category && typeof ae.monthlyBase === 'function') {
    const cy = now.getFullYear();
    const monthsElapsed = (+y < cy) ? 12 : (+y > cy ? 0 : now.getMonth() + 1);
    const base = ae.monthlyBase(category, { contract }) || 0;
    const baseYtd = base * monthsElapsed;
    const pd = monthlyPerDiem(duties, category, ae, { ym: y }); // prefixo "YYYY" → ano inteiro
    const perDiemYtd = pd ? pd.total : 0;
    aeYtd = {
      base: +baseYtd.toFixed(2), perDiem: +perDiemYtd.toFixed(2),
      total: +(baseYtd + perDiemYtd).toFixed(2), monthsElapsed,
      withRoute: pd ? pd.withRoute : 0, missing: pd ? pd.missing : 0,
    };
  }

  return {
    year: y,
    flightMin, flightHours: +(flightMin / 60).toFixed(1),
    dutyMin, dutyHours: +(dutyMin / 60).toFixed(1),
    sectors, count, flights, withRoute, nightStops,
    byKind, months, topDest, aeYtd,
  };
};
