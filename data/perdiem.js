// Per diem do AE a partir das rotas das duties. Liga as distâncias de aeroporto
// (data/airports.js) às bandas/setores nominais do módulo AE (ae/*). Módulo PURO.
import { sectorDistanceNM } from './airports';

// Distâncias (NM) por setor a partir de uma rota "LIS-OPO-LIS".
// [] se a rota for inválida; um elemento pode ser null (aeroporto desconhecido).
export const routeDistancesNM = (route) => {
  if (!route || typeof route !== 'string') return [];
  const codes = route.split('-').map((c) => c.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i + 1 < codes.length; i++) out.push(sectorDistanceNM(codes[i], codes[i + 1]));
  return out;
};

// Per diem estimado de um conjunto de duties para uma categoria, opcionalmente
// filtrado por mês (ym = "YYYY-MM"). duties = mapa { date: { route, deleted? } }.
// `ae` = módulo do Acordo de Empresa (expõe perDiem). Uma duty sem rota completa
// (algum aeroporto desconhecido) conta para `missing` e não soma.
// Devolve { total, withRoute, missing, count } ou null se faltar ae/categoria.
export const monthlyPerDiem = (duties = {}, category, ae, { ym = null } = {}) => {
  if (!ae || !category) return null;
  let total = 0, withRoute = 0, missing = 0, count = 0;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (ym && !String(date).startsWith(ym)) continue;
    count++;
    const dists = routeDistancesNM(d.route);
    if (!dists.length || dists.some((x) => x == null)) { missing++; continue; }
    total += ae.perDiem(category, dists);
    withRoute++;
  }
  return { total: +total.toFixed(2), withRoute, missing, count };
};

// Per diem repartido por banda de distância (curto/médio/longo/extra), para as
// barras "por setor" dos Cálculos AE. Usa as bandas do próprio módulo `ae`
// (SECTOR_BANDS + NOMINAL_SECTOR) — aditivo, não mexe no núcleo. Devolve
// { total, byBand: {<id>: €}, withRoute, missing, count } ou null.
export const monthlyPerDiemByBand = (duties = {}, category, ae, { ym = null } = {}) => {
  if (!ae || !category || !ae.SECTOR_BANDS) return null;
  const bands = ae.SECTOR_BANDS;
  const nominal = (ae.NOMINAL_SECTOR && ae.NOMINAL_SECTOR[category]) || 0;
  const byBand = {};
  bands.forEach((b) => { byBand[b.id] = 0; });
  let total = 0, withRoute = 0, missing = 0, count = 0;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (ym && !String(date).startsWith(ym)) continue;
    count++;
    const dists = routeDistancesNM(d.route);
    if (!dists.length || dists.some((x) => x == null)) { missing++; continue; }
    for (const dist of dists) {
      const band = bands.find((b) => Number(dist) <= b.maxNM) || bands[bands.length - 1];
      const val = band.mult * nominal;
      byBand[band.id] += val;
      total += val;
    }
    withRoute++;
  }
  Object.keys(byBand).forEach((k) => { byBand[k] = +byBand[k].toFixed(2); });
  return { total: +total.toFixed(2), byBand, withRoute, missing, count };
};
