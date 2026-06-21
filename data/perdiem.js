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

// Estimativa mensal AE (€) a partir das duties (kind + rota). É a PONTE entre o
// modelo da app (1 duty/dia: route + kind) e o `computeAeMonth` do motor. Mapeamento
// dos kind (em setores nominais, que o motor multiplica pelo NS da categoria):
//   • flight          → per-diem da rota (distâncias → ae.perDiem)
//   • office          → OFC4 = 1,5 NS                          (Anexo I.14)
//   • standby_airport → ADTY ≥4h não-chamado = 2 NS            (Anexo I.5)
//   • standby_home / positioning / training → 0  (não há prestação de AE no Anexo I
//     para o piloto: posicionamento conta para FTL mas não paga AE; em formação o
//     pago é o instrutor, não o formando; standby em casa não tem abono no Anexo I)
// Paragens nocturnas: contadas das duties marcadas `nightStop` (toggle no formulário),
// valor fixo Art. 39 = 2 NS/paragem. Módulo PURO. duties = mapa { date: { route, kind,
// nightStop?, deleted? } }. Devolve o objeto do motor (base, perDiem, nightStops €,
// extras, total) + meta { withRoute, missing, count, officeDays, adtyDays, nightStopDays }
// — ou null se faltar ae/categoria/computeAeMonth.
export const monthlyAe = (duties = {}, category, contract = '12/12', ae, { ym = null, index = 1 } = {}) => {
  if (!ae || !category || !ae.computeAeMonth) return null;
  const office4 = ae.OFFICE4_SECTORS || 0;
  const ADTY_SECTORS = 2;             // Anexo I.5 — serviço em aeroporto ≥4h não-chamado = 2 setores nominais
  const flights = [];                 // arrays de distâncias (NM) por voo → computeAeMonth
  let extraSectors = 0, withRoute = 0, missing = 0, count = 0, officeDays = 0, adtyDays = 0, nightStops = 0;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (ym && !String(date).startsWith(ym)) continue;
    count++;
    if (d.nightStop) nightStops++;     // paragem nocturna marcada (Art. 39 = 2×NS) — independente do kind
    const kind = d.kind || 'flight';
    if (kind === 'office')          { extraSectors += office4;      officeDays++; continue; }
    if (kind === 'standby_airport') { extraSectors += ADTY_SECTORS; adtyDays++;   continue; }
    // standby_home / positioning / training → 0 (sem prestação de AE no Anexo I).
    if (kind !== 'flight') continue;
    const dists = routeDistancesNM(d.route);
    if (!dists.length || dists.some((x) => x == null)) { missing++; continue; }  // rota incompleta
    flights.push(dists);
    withRoute++;
  }
  const month = ae.computeAeMonth({ category, contract, duties: flights, nightStops, extraSectors, index });
  return { ...month, withRoute, missing, count, officeDays, adtyDays, nightStopDays: nightStops };
};
