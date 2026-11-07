// Per diem do AE a partir das rotas das duties. Liga as distâncias de aeroporto
// (data/airports.js) às bandas/setores nominais do módulo AE (ae/*). Módulo PURO.
import { sectorDistanceNM } from './airports';
import { eventCounts } from './aeEvents';
import { isMediumHaul } from '../ae/tapLimits';
import { ymShift } from '../ae/tables';
import { resolveCrew } from './crewHistory';

// Índice do MÊS de uma data (pilotos easyJet: IPC desde 1-fev-2025; TAP pilotos: o degrau do VB, que o per diem ignora). Os
// valores de cada serviço usam o MESMO índice do total do mês (auditoria L10: A-043/A-071/A-193/A-209/A-239).
export const aeIndex = (ae, date) => (ae && typeof ae.indexFactor === 'function' && date ? ae.indexFactor(String(date).slice(0, 7)) : 1);
const r2 = (n) => +(+n).toFixed(2);

// Distâncias (NM) por setor a partir de uma rota "LIS-OPO-LIS".
// [] se a rota for inválida; um elemento pode ser null (aeroporto desconhecido).
export const routeDistancesNM = (route) => {
  if (!route || typeof route !== 'string') return [];
  const codes = route.split('-').map((c) => c.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i + 1 < codes.length; i++) out.push(sectorDistanceNM(codes[i], codes[i + 1]));
  return out;
};

// Distâncias (NM) dos setores VOADOS de um serviço. O per-diem é "em serviço de voo (setor)" (SNPVAC Cl. 52.ª, n.º 1; SPAC
// Art. 37.º, n.º 3: "baseado no número e tipo de setores voados") — um posicionamento (perna `dh`) não é setor (ORO.FTL.215(a)).
// A `route` leva o DH (é a localização: onde se dorme); com pernas `dh`, as distâncias saem das pernas operadas, cada uma da sua
// partida à sua chegada (revisão do bloco 4, E2). Sem pernas `dh`: a rota, como sempre. O pagamento do posicionamento (Art. 44.º
// pilotos, Anexo I.18 cabine) é outra rubrica (bloco 6 da auditoria, L2).
export const sectorDistancesNM = (svc) => {
  const legs = svc && Array.isArray(svc.legs) ? svc.legs : [];
  if (legs.some((l) => l && l.dh)) {
    const op = legs.filter((l) => l && !l.dh);
    if (!op.length) return [];
    return op.map((l) => (l.dep && l.arr ? sectorDistanceNM(l.dep, l.arr) : null));
  }
  return routeDistancesNM(svc && svc.route);
};

// Per diem estimado de um conjunto de duties para uma categoria, opcionalmente
// filtrado por mês (ym = "YYYY-MM"). duties = mapa { date: { route, deleted? } }.
// `ae` = módulo do Acordo de Empresa (expõe perDiem). Uma duty sem rota completa
// (algum aeroporto desconhecido) conta para `missing` e não soma.
//
// NB (Art. 37 piloto / Cl. 52 cabine): o per-diem é POR setor voado — TODOS os setores
// da rota contam (incl. out-and-back no mesmo dia, ex.: LIS-OPO-LIS). O "fora da base"
// do AE é a NATUREZA do serviço de voo, NÃO um filtro pela base do tripulante; por isso
// o campo `base` do perfil NÃO entra aqui. A parte "noite fora" é a PERNOITA (toggle
// nightStop → computeAeMonth), não o per-diem. Exclusões do AE (standby/escritório/
// formação) são tratadas por tipo de duty em monthlyAe, não aqui.
// Devolve { total, withRoute, missing, count } ou null se faltar ae/categoria.
export const monthlyPerDiem = (duties = {}, category, ae, { ym = null, index = 1, fleet } = {}) => {
  if (!ae || !category) return null;
  let total = 0, withRoute = 0, missing = 0, count = 0;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (ym && !String(date).startsWith(ym)) continue;
    count++;
    // Per-diem é POR setor voado → soma a primária + cada `extra` do dia (multi-serviço; ORO.FTL.210/Cl.52 contam por serviço).
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s) continue;
      // SÓ VOO: um POSICIONAMENTO também pode ter rota (repouso 235 por local real),
      // mas não tem abono (Art. 37/Cl. 52 = setor VOADO; posicionamento paga só a pernoita).
      if ((s.kind || 'flight') !== 'flight') continue;
      const dists = sectorDistancesNM(s);
      if (!dists.length || dists.some((x) => x == null)) { missing++; continue; }
      // `fleet` (TAP: WB/NB → coluna A); `date` = tabela do AE em vigor NESSE dia (linha do tempo).
      total += ae.perDiem(category, dists, index, fleet, date) || 0;   // sem tabela nesse mês → 0
      withRoute++;
    }
  }
  return { total: +total.toFixed(2), withRoute, missing, count };
};

// Per diem repartido por banda de distância (curto/médio/longo/extra), para as
// barras "por setor" dos Cálculos AE. Usa as bandas do próprio módulo `ae`
// (SECTOR_BANDS + NOMINAL_SECTOR) — aditivo, não mexe no núcleo. Devolve
// { total, byBand: {<id>: €}, withRoute, missing, count } ou null.
export const monthlyPerDiemByBand = (duties = {}, category, ae, { ym = null, index = 1 } = {}) => {
  if (!ae || !category || !ae.SECTOR_BANDS) return null;
  const bands = ae.SECTOR_BANDS;
  // Setor nominal do MÊS pedido (linha do tempo das tabelas); sem tableAt = tabela plana.
  const tbl = ae.tableAt ? ae.tableAt(ym) : null;
  if (ae.tableAt && !tbl) return null;   // sem tabela nesse mês
  const noms = (tbl ? tbl.NOMINAL_SECTOR : ae.NOMINAL_SECTOR) || ae.NOMINAL_SECTOR;
  const nominal = ((noms && noms[category]) || 0) * index;
  const byBand = {};
  bands.forEach((b) => { byBand[b.id] = 0; });
  let total = 0, withRoute = 0, missing = 0, count = 0;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (ym && !String(date).startsWith(ym)) continue;
    count++;
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {   // primária + extra (multi-serviço)
      if (!s) continue;
      if ((s.kind || 'flight') !== 'flight') continue;   // só setor VOADO tem per-diem (ver monthlyPerDiem)
      const dists = sectorDistancesNM(s);
      if (!dists.length || dists.some((x) => x == null)) { missing++; continue; }
      for (const dist of dists) {
        const band = bands.find((b) => Number(dist) <= b.maxNM) || bands[bands.length - 1];
        const val = band.mult * nominal;
        byBand[band.id] += val;
        total += val;
      }
      withRoute++;
    }
  }
  Object.keys(byBand).forEach((k) => { byBand[k] = +byBand[k].toFixed(2); });
  return { total: +total.toFixed(2), byBand, withRoute, missing, count };
};

// € de um PAPEL desempenhado num serviço — cada um pago como a lei o define:
//   'instr'    → €/dia (AE piloto Art. 42)          'cclt' → €/dia de treino (Cl. 35)
//   'upranker' → €/SETOR do serviço (Cl. 34)         'cti'  → €/dia, 4 NS (Cl. 35)
// Devolve 0 quando o AE não tem o item (TAP) — não se inventa prestação.
// `ym` (opcional) data o cálculo — tabela do AE em vigor nesse mês (linha do tempo).
export const roleEurFor = (ae, category, role, sectors = 0, ym) => {
  if (!ae || !role) return 0;
  if (role === 'instr' && ae.instructor) return ae.instructor(ym);
  if (role === 'upranker' && ae.upranker) return +(ae.upranker(ym) * Math.max(0, Number(sectors) || 0)).toFixed(2);
  if (role === 'cclt' && ae.cclt) return ae.cclt(ym);
  if (role === 'cti' && ae.ctiFlexi) return ae.ctiFlexi(category, ym);
  return 0;
};

// ── TAP: as ajudas de custo contam-se por DIA DE CALENDÁRIO (auditoria A-088/A-089/A-109/A-110/A-186/A-187/A-204, bloco 5) ──
// Cabine, RRRGS Cl. 7.ª: AC1 "Por cada dia de calendário (das 0h00 às 23h59, horas locais da base), em que seja realizado um
// ou mais serviços de voo ou em que esteja em curso a realização de um serviço de voo em funções ou DHC/extracrew"; o serviço
// acaba "após trinta minutos decorridos da imobilização definitiva da aeronave" (n.º 1, a)); AC2 por dia de "Estadia" (n.º 2,
// b)); no mesmo dia "prevalecerá o pagamento de valor superior" (n.º 3). Pilotos, Cl. 9.ª: per diem A por dia de calendário
// com "Apresentação ou deslocação para um ou mais serviços de voo (...) ou em que esteja em curso a realização de um serviço
// de voo"; per diem B por "Permanência em estadia"; no mesmo dia prevalece o A (n.º 2).
// Logo: um dia com voo (ou DHC) começado ou em curso → 1 A/AC1, por muitos serviços que tenha; os dias SEM voo entre um
// serviço que acaba fora da base (pernoita) e o serviço seguinte, que parte desse mesmo aeroporto → B/AC2. Sem o serviço
// seguinte (ou sem rotas que encadeiem) não se contam dias de estadia: nunca a mais. As horas são as da escala (a app
// não tem a hora da base em cada perna); o fim é o sign-off, ou os calços + 30 min.
const isoAdd = (iso, n) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
};
const clockMin = (x) => { const mm = /^(\d{1,2}):([0-5]\d)$/.exec(String(x || '')); return mm ? (+mm[1]) * 60 + (+mm[2]) : null; };
const codesOf = (route) => String(route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
export const tapCalendarDays = (duties = {}, ym) => {
  const flightDay = new Map();   // date → distâncias (NM) dos serviços que tocam esse dia
  const haulDay = new Map();     // date → 'long' | 'medium' | 'unknown' (pilotos, RUPT Cl. 32.ª/37.ª; o pior caso do dia é o longo)
  const groundDay = new Map();   // date → serviços sem voo (assistência, formação, escritório) — a Cl. 8.ª (cabine) e a 9.ª (pilotos)
  const svcs = [];
  let missing = 0, withRoute = 0;
  const dates = Object.keys(duties || {}).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && duties[d] && !duties[d].deleted).sort();
  for (const date of dates) {
    const d = duties[date];
    const list = [d, ...(Array.isArray(d.extra) ? d.extra : [])].filter(Boolean)
      .sort((a, b) => (clockMin(a.report_time) ?? 0) - (clockMin(b.report_time) ?? 0));
    const dayNight = list.some((s) => s.nightStop);
    list.forEach((s, i) => {
      const kind = s.kind || 'flight';
      if (kind === 'standby_airport' || kind === 'standby_home' || kind === 'training' || kind === 'office') {
        if (!groundDay.has(date)) groundDay.set(date, []);
        groundDay.get(date).push(s);
        return;
      }
      if (kind !== 'flight' && kind !== 'positioning') return;
      let dists = kind === 'flight' ? sectorDistancesNM(s) : routeDistancesNM(s.route);
      if (kind === 'flight') {
        // Sem a distância de um setor o dia conta na mesma: a AC1 é fixa e o per diem A não depende dela (só a coluna, que fica
        // no médio curso, o certo) — revisão independente do bloco 6. Conta como "rota a corrigir".
        if (!dists.length || dists.some((x) => x == null)) { if (String(date).startsWith(ym)) missing++; dists = [0]; }
        else if (String(date).startsWith(ym)) withRoute++;
      } else {
        dists = dists.filter((x) => x != null);
        if (!dists.length) dists = [0];   // DHC sem distância: conta o dia (o valor sai da coluna de médio curso)
      }
      // Dias em que o serviço está "em curso": do dia da apresentação ao do fim (sign-off, ou calços + 30 min).
      const r = clockMin(s.report_time);
      const so = clockMin(s.signOff), bo = clockMin(s.block_on);
      let span = 0;
      if (r != null && (so != null || bo != null)) {
        const end = so != null ? so + (so < r ? 1440 : 0) : bo + (bo < r ? 1440 : 0) + 30;
        span = Math.floor(end / 1440);
      }
      // A operação (pilotos NB): médio curso se todos os pontos estão na área e o repouso fica a ≤ 30° de longitude da partida;
      // um DH não é voo efetivo → a coluna da frota (nota da Tabela A-3.2), isto é, médio no NB.
      const mh = kind === 'flight' ? isMediumHaul(codesOf(s.route), 'pilot') : true;
      const haul = mh === false ? 'long' : mh === true ? 'medium' : 'unknown';
      for (let k = 0; k <= span; k++) {
        const day = isoAdd(date, k);
        if (!flightDay.has(day)) flightDay.set(day, []);
        flightDay.get(day).push(...dists);
        const prev = haulDay.get(day);
        haulDay.set(day, prev === 'long' || haul === 'long' ? 'long' : (prev === 'unknown' || haul === 'unknown') ? 'unknown' : 'medium');
      }
      const codes = codesOf(s.route);
      svcs.push({ date, endDate: isoAdd(date, span), from: codes[0] || null, to: codes[codes.length - 1] || null, away: dayNight && i === list.length - 1 });
    });
  }
  const stayDays = [];
  svcs.forEach((sv, i) => {
    if (!sv.away || !sv.to) return;
    const next = svcs.slice(i + 1).find((n) => n.date > sv.date);
    if (!next || next.from !== sv.to) return;   // sem o serviço seguinte que parte dali → não se presume estadia
    for (let day = isoAdd(sv.endDate, 1); day < next.date; day = isoAdd(day, 1)) {
      if (!flightDay.has(day)) stayDays.push(day);
    }
  });
  const inYm = (d) => String(d).startsWith(ym);
  const lh = (d) => { const h = haulDay.get(d); return h === 'long' ? true : h === 'medium' ? false : null; };
  return {
    flightDays: [...flightDay.entries()].filter(([d]) => inYm(d)).sort(([a], [b]) => a.localeCompare(b)).map(([date, dists]) => ({ date, dists, longHaul: lh(date) })),
    stayDays: stayDays.filter(inYm),
    groundDays: [...groundDay.entries()].filter(([d]) => inYm(d) && !flightDay.has(d)).sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, list })),
    withRoute, missing,
  };
};

// ── POSICIONAMENTO (auditoria L2: A-004/A-022/A-039/A-063/A-091/A-188/A-208/A-225/A-259, bloco 6) ──
// Pilotos easyJet (Art. 44.º): os setores do posicionamento pelas bandas do per diem (POSITIONING_BY_SECTOR). Cabine easyJet
// (Cl. 57.ª + Anexo I.18): um valor por posicionamento, da tabela, entre o curto (certo) e o longo (POSITIONING_BY_TABLE). TAP: o
// dia de DHC é dia de AC1 / per diem A (tapCalendarDays). Um posicionamento é um serviço só de DH, ou cada sequência de pernas DH
// dentro de um serviço de voo. Devolve { min, max, missing } (missing = sem a distância de um setor, nos pilotos).
const dhRuns = (svc) => {
  const kind = (svc && svc.kind) || 'flight';
  const legs = svc && Array.isArray(svc.legs) ? svc.legs.filter(Boolean) : [];
  if (kind === 'positioning') {
    if (legs.length && legs.every((l) => l.dep && l.arr)) return [legs.map((l) => [l.dep, l.arr])];
    const c = codesOf(svc.route);
    return [c.length >= 2 ? c.slice(1).map((x, i) => [c[i], x]) : []];
  }
  if (kind !== 'flight') return [];
  const runs = []; let cur = null;
  for (const l of legs) {
    if (l.dh) { if (!cur) { cur = []; runs.push(cur); } cur.push([l.dep, l.arr]); } else cur = null;
  }
  return runs;
};
export const positioningOf = (ae, category, svc, { date, index = 1, fleet } = {}) => {
  const out = { min: 0, max: 0, missing: 0, count: 0 };
  if (!ae || !category || !svc) return out;
  for (const run of dhRuns(svc)) {
    if (ae.POSITIONING_BY_SECTOR) {
      const dists = run.map(([a, b]) => (a && b ? sectorDistanceNM(a, b) : null));
      if (!dists.length || dists.some((x) => x == null)) { out.missing++; continue; }
      const v = ae.perDiem(category, dists, index, fleet, date) || 0;
      out.min += v; out.max += v; out.count++;
    } else if (ae.POSITIONING_BY_TABLE && ae.positioningRange) {
      const r = ae.positioningRange(category, date);
      if (!r) continue;
      out.min += r.min; out.max += r.max; out.count++;
    }
  }
  out.min = r2(out.min); out.max = r2(out.max);
  return out;
};

// ── NOITES FORA DA BASE (auditoria L13: A-033/A-196/A-274, bloco 6) ──
// Cabine Cl. 56.ª, n.º 1: "por cada noite fora da base, em voo, formação e outras funções"; pilotos Art. 39.º: "paragens noturnas
// fora da base, entre serviços de voo", e o Art. 44.º fala de "posicionamentos com paragens noturnas". Um dia cujo último serviço
// acaba fora (a marca `nightStop`) dá a noite desse dia; se o serviço SEGUINTE parte desse mesmo aeroporto, as datas entre os dois
// também são noites fora (a estadia). Sem o serviço seguinte, ou se parte de outro sítio, não se presume a estadia (nunca a mais).
// Devolve as datas (a noite de cada data) no mês `ym` (ou todas).
const dayList = (d) => [d, ...(Array.isArray(d.extra) ? d.extra : [])].filter(Boolean)
  .sort((a, b) => (clockMin(a.report_time) ?? 0) - (clockMin(b.report_time) ?? 0));
export const awayNights = (duties = {}, ym = null) => {
  const dates = Object.keys(duties || {}).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && duties[d] && !duties[d].deleted).sort();
  const out = [];
  dates.forEach((date, i) => {
    const list = dayList(duties[date]);
    if (!list.some((s) => s.nightStop)) return;
    out.push(date);
    const withRoute = list.filter((s) => codesOf(s.route).length >= 2);
    const lastS = withRoute[withRoute.length - 1];
    const to = lastS ? codesOf(lastS.route).slice(-1)[0] : null;
    const nextDate = dates[i + 1];
    if (!to || !nextDate) return;
    const firstNext = dayList(duties[nextDate]).find((s) => codesOf(s.route).length >= 2);
    if (!firstNext || codesOf(firstNext.route)[0] !== to) return;
    for (let day = isoAdd(date, 1); day < nextDate; day = isoAdd(day, 1)) out.push(day);
  });
  return ym ? out.filter((d) => d.startsWith(ym)) : out;
};

// Estimativa mensal AE (€) a partir das duties (kind + rota). É a PONTE entre o
// modelo da app (1 duty/dia: route + kind) e o `computeAeMonth` do motor. Mapeamento
// dos kind (em setores nominais, que o motor multiplica pelo NS da categoria):
//   • flight          → per-diem da rota (distâncias → ae.perDiem)
//   • office          → OFC4 1,5 NS · OFC8 3 NS (officeType)    (Anexo I.14 · cabine Art. 70 = 3 NS)
//   • training        → FORMANDO em terra/simulador = 3 NS (Art. 43 piloto; só e-learning=0);
//                       INSTRUTOR (role) = €120 (Art. 42). Cabine (Cl.70 não cobre formação) = 0.
//   • standby_airport → ADTY ≥4h não-chamado = 2 NS            (Anexo I.5)
//   • positioning     → pilotos pelos setores (Art. 44.º); cabine pela tabela do Anexo I.18; TAP = dia de AC1/A (bloco 6, L2)
//   • standby_home    → 0 na easyJet (o Anexo I não o paga); TAP cabine = complemento (Cl. 8.ª); TAP pilotos = 0 (Cl. 10.ª)
// Noites fora: awayNights (a noite de cada dia que acaba fora + a estadia até ao serviço seguinte que parte dali; bloco 6, L13).
// Módulo PURO. duties = mapa { date: { route, kind, nightStop?, deleted? } }. Devolve o objeto do motor (base, perDiem,
// nightStops €, extras, total) + positioning, annual (subsídios e prestações do mês), chefia (TAP) + meta — ou null.
// `serviceStart` (data de entrada), `history` (linha do tempo da categoria), `events` (as férias, para o mês do subsídio da TAP)
// e `lifestyle` (PPY como estilo de vida) servem as prestações que dependem deles (bloco 6, L1/L3/L4/L11).
export const monthlyAe = (duties = {}, category, contract = '12/12', ae, { ym = null, index = 1, fleet, fullShare, serviceStart = null, largada = null, history = null, events = [], lifestyle = false } = {}) => {
  if (!ae || !category || !ae.computeAeMonth) return null;
  if (ym && ae.hasTableFor && !ae.hasTableFor(category, ym)) return null;   // sem tabela nesse mês → o mês não dá € (bloco 5)
  const byDay = !!ae.PER_DIEM_BY_DAY;   // TAP: ajudas de custo por dia de calendário (tapCalendarDays)
  const dailyRoles = new Set(ae.DAILY_ROLES || []);       // papéis pagos por DIA: uma vez por dia (Art. 42.º; Anexo I.16)
  const groundOnly = new Set(ae.GROUND_ONLY_ROLES || []); // instrutor dos pilotos easyJet: só em terra/simulador (Art. 42.º)
  // Dia de escritório: piloto OFC4 = 1,5 NS (Anexo I.14); cabine = 3 NS (Art. 70) — só tem
  // OFFICE_SECTORS, não OFC4/8 → sem o fallback pagava €0 ao dia de terra da cabine.
  const office4 = ae.OFFICE4_SECTORS || ae.OFFICE_SECTORS || 0;
  const flights = [];                 // arrays de distâncias (NM) por voo → computeAeMonth
  let extraSectors = 0, adtyEur = 0, instrEur = 0, withRoute = 0, missing = 0, count = 0, officeDays = 0, adtyDays = 0, instructorDaysAuto = 0, nightStops = 0, ddoDaysAuto = 0, wflyDaysAuto = 0, idoDaysAuto = 0, trainDaysAuto = 0;
  let posMin = 0, posMax = 0, posCount = 0;
  // Duração report→fim de um serviço (volta à meia-noite); null sem horas completas.
  const svcDurMin = (s) => {
    const m = (x) => { const mm = /^(\d{1,2}):([0-5]\d)$/.exec(x || ''); return mm ? (+mm[1]) * 60 + (+mm[2]) : null; };
    const r = m(s.report_time), e = m(s.block_on);
    if (r == null || e == null) return null;
    return e >= r ? e - r : e + 1440 - r;
  };
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    if (ym && !String(date).startsWith(ym)) continue;
    count++;
    // Primária + extra (ORO.FTL.210/Cl.52 contam por serviço). Pernoita day-level (Art. 39 = 2×NS, 1 noite/dia).
    const svcs = [d, ...(Array.isArray(d.extra) ? d.extra : [])];
    const rolesPaidToday = new Set();
    const dayHasFlight = svcs.some((s) => s && (s.kind || 'flight') === 'flight');
    const dayHasSb = svcs.some((s) => s && s.kind === 'standby_airport');
    // Dia de FOLGA PUBLICADA trabalhado (condição no serviço): DDO (escalado), WFLY
    // (voluntário) ou IDO (infringida, sem o aviso devido) — conta UMA vez por DIA (a
    // folga é do dia, não do período de serviço). Cl.68 junta DDO+IDO ("trabalhar/
    // infringir dia de descanso"; IDO paga o dobro do DDO); WFLY = Cl.69.
    const dow = svcs.find((s) => s && (s.dayOffWorked === 'ddo' || s.dayOffWorked === 'wfly' || s.dayOffWorked === 'ido'));
    if (dow) { if (dow.dayOffWorked === 'ddo') ddoDaysAuto++; else if (dow.dayOffWorked === 'wfly') wflyDaysAuto++; else idoDaysAuto++; }
    for (const s of svcs) {
      if (!s) continue;
      const kind = s.kind || 'flight';
      if (!byDay && (kind === 'positioning' || kind === 'flight')) {
        const po = positioningOf(ae, category, s, { date, index, fleet });
        posMin += po.min; posMax += po.max; posCount += po.count; missing += po.missing;
      }
      if (byDay && kind !== 'flight') continue;   // TAP: os dias sem voo contam-se por dia de calendário (abaixo)
      if (kind === 'office') {
        // Dia de escritório: OFC4 (1,5 NS) por defeito; OFC8 (3 NS = dia inteiro, que a lei
        // equipara ao dever ad-hoc Art. 43) quando marcado. Cabine = rate único (office4 já
        // resolve p/ OFFICE_SECTORS). Anexo I.14.
        extraSectors += (s.officeType === 'ofc8' && ae.OFFICE8_SECTORS) ? ae.OFFICE8_SECTORS : office4;
        officeDays++; continue;
      }
      if (kind === 'standby_airport') {
        // ADTY FINO (Anexo I.5 piloto / Art. 58 cabine) em € via o módulo do AE — as matrizes
        // diferem (piloto em setores NOMINAIS, cabine em setores MÉDIOS): chamado = há VOO no
        // mesmo dia; ≥4h pela duração real (sem horas → o garantido, < 4 h: auditoria A-220 — nunca presumir as 4 h). AEs sem o
        // item (ex. TAP) → 0: não se inventa prestação que o acordo não tem.
        if (ae.airportStandby) {
          const dm = svcDurMin(s);
          adtyEur += ae.airportStandby(category, { called: dayHasFlight, over4h: dm != null && dm >= 240, index, ym: date });   // sem horas → o garantido (< 4 h), A-220
          adtyDays++;
        }
        continue;
      }
      // PAPEL desempenhado no serviço (VOO ou FORMAÇÃO — como no form) — pago como a LEI
      // o define: instrutor €/dia (Art. 42) · uprank €/SETOR (Cl. 34) · CCLT €/dia ·
      // CTI-Flexi €/dia (Cl. 35). `s.instructor` legado = papel 'instr'. Só AEs com o item.
      if (kind === 'flight' || kind === 'training') {
        const role = s.role || (s.instructor ? 'instr' : null);
        if (role) {
          // Instrutor (pilotos easyJet, Art. 42.º): "por cada dia que os pilotos com a qualificação executem tais funções em
          // terra, incluindo em simulador" → 0 num voo, e uma vez por dia (auditoria A-045/A-064/A-079).
          const paid = !(groundOnly.has(role) && kind !== 'training') && !(dailyRoles.has(role) && rolesPaidToday.has(role));
          const eur = paid ? roleEurFor(ae, category, role, s.sectors, date) : 0;
          if (eur > 0) { instrEur += eur; instructorDaysAuto++; if (dailyRoles.has(role)) rolesPaidToday.add(role); }
        } else if (kind === 'training' && !s.eLearning && ae.ADHOC_SECTORS) {
          // FORMANDO em formação de terra/simulador = 3 NS (Art. 43 piloto; só e-learning=0).
          // Gated em ae.ADHOC_SECTORS: só o piloto tem o item — a cabine (Cl.70 NÃO cobre
          // formação) fica base-only; não se inventa prestação. Não conta como "papel".
          extraSectors += ae.ADHOC_SECTORS; trainDaysAuto++;
        }
      }
      // standby_home / training sem papel → 0 na easyJet; positioning → acima (positioningOf).
      if (kind !== 'flight') continue;
      // Voo com standby de AEROPORTO prévio declarado (special 225) = FOI CHAMADO do standby →
      // ADTY pelo tempo de standby (só quando não há duty de standby à parte no mesmo dia).
      const ps = s.special && s.special.preStandby;
      if (ae.airportStandby && !dayHasSb && ps && ps.type === 'airport' && Number(ps.standbyH) > 0) {
        adtyEur += ae.airportStandby(category, { called: true, over4h: Number(ps.standbyH) >= 4, index, ym: date });
        adtyDays++;
      }
      if (byDay) continue;   // TAP: os dias de calendário contam-se à parte (tapCalendarDays)
      const dists = sectorDistancesNM(s);
      if (!dists.length || dists.some((x) => x == null)) { missing++; continue; }  // rota incompleta
      flights.push(dists);
      withRoute++;
    }
  }
  // ── TAP: tudo por dia de calendário (Cl. 7.ª/8.ª cabine · Cl. 9.ª pilotos; bloco 6, L5) ──
  let groundEur = 0, groundMaxDelta = 0, complEur = 0, chefia = 0, extrasMaxDelta = 0;
  if (byDay) {
    const td = tapCalendarDays(duties, ym || '');
    td.flightDays.forEach((f) => flights.push(ae.GROUND_PER_DIEM ? { dists: f.dists, longHaul: f.longHaul } : f.dists));
    const stays = new Set(td.stayDays);
    withRoute = td.withRoute; missing = td.missing;
    for (const g of td.groundDays) {
      const ks = g.list;
      if (ae.GROUND_PER_DIEM) {
        // Pilotos (Cl. 9.ª): assistência no aeroporto e simulador como aluno → A (coluna da frota: não há voo efetivo); e-learning
        // ou refrescamento → B; formação sem o tipo → B certo, A possível. "Prevalecerá (...) a alínea a)" (n.º 2): o dia de A ou
        // de B deixa de ser dia de estadia (um per diem por dia).
        // Formação sem o tipo: há formação que não paga A nem B (Cl. 10.ª, n.º 2, d)) → certo 0 (ou o B da estadia, se o dia
        // já o era), possível o A (revisão independente do bloco 6).
        const isA = ks.some((x) => x.kind === 'standby_airport' || (x.kind === 'training' && x.trainingType === 'sim'));
        // B também: inspeções médicas e atos médicos a mando da empresa (Cl. 9.ª, n.º 1, b), iii)) — escritório marcado 'medical'.
        const isB = ks.some((x) => (x.kind === 'training' && (x.eLearning || x.trainingType === 'ground')) || (x.kind === 'office' && x.officeType === 'medical'));
        const maybeA = ks.some((x) => x.kind === 'training' && !x.eLearning && !x.trainingType);
        if (isA) { flights.push({ dists: [0], longHaul: false }); stays.delete(g.date); continue; }
        const b = ae.perDiemB ? ae.perDiemB(category, g.date) : null;
        if (isB) { if (b != null) groundEur += b; stays.delete(g.date); continue; }
        if (maybeA) {
          const a = ae.perDiem(category, [0], 1, fleet, g.date, { longHaul: false });
          if (a != null) groundMaxDelta += a - (stays.has(g.date) && b != null ? b : 0);
        }
      } else if (ae.EXTRAORD_FROM_ROSTER && ae.extraord) {
        // Cabine (Cl. 8.ª): assistência no aeroporto não acionada = 2 × o complemento (n.º 2); em casa, formação presencial,
        // deslocação às instalações (escritório) = 1 ×; e-learning não é deslocação (fica de fora). Prevalece o valor superior
        // (n.º 3): num dia de estadia (AC2) soma-se só o que passar da AC2.
        // (g) medicina do trabalho e f) testes = escritório marcado 'medical': também 1 ×.)
        const mult = Math.max(0, ...ks.map((x) => (x.kind === 'standby_airport' ? 2 : (x.kind === 'standby_home' || x.kind === 'office' || (x.kind === 'training' && !x.eLearning)) ? 1 : 0)));
        const each = ae.extraord(g.date, category);
        if (!mult || each == null) continue;
        const comp = mult * each;
        const ac2 = stays.has(g.date) ? (ae.nightStop(category, 1, g.date) || 0) : 0;
        complEur += Math.max(0, comp - ac2);
      }
    }
    nightStops = stays.size;
    // Cabine: e-learning (Cl. 13.ª) e DHC fora de C/CL (Cl. 12.ª, n.º 4) do mês ANTERIOR, pagos neste.
    if (ae.ELEARN_EUR_H && ym) {
      const prevYm = ymShift(ym, -1);
      const yr = prevYm.slice(0, 4);
      let h0 = 0, h1 = 0;
      for (const date of Object.keys(duties || {})) {
        const d = duties[date];
        if (!d || d.deleted || !date.startsWith(yr) || date.slice(0, 7) > prevYm) continue;
        for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
          if (!s || s.kind !== 'training' || !s.eLearning) continue;
          const r = clockMin(s.report_time), e = clockMin(s.block_on);
          if (r == null || e == null) continue;   // sem horas não se sabe quantas (fica de fora)
          const h = ((e >= r ? e - r : e + 1440 - r)) / 60;
          if (date.slice(0, 7) === prevYm) h1 += h; else h0 += h;
        }
      }
      const paidH = Math.min(ae.ELEARN_MAX_H, h0 + h1) - Math.min(ae.ELEARN_MAX_H, h0);
      if (paidH > 0) complEur += r2(paidH * ae.ELEARN_EUR_H);
      const upH = ae.ELEARN_MAX_H_UP ? Math.min(ae.ELEARN_MAX_H_UP, h0 + h1) - Math.min(ae.ELEARN_MAX_H_UP, h0) : paidH;
      if (upH > paidH) extrasMaxDelta += r2((upH - paidH) * ae.ELEARN_EUR_H);
      const ac1Prev = ae.perDiem(category, [1], 1, undefined, prevYm);
      let econ = 0;
      for (const date of Object.keys(duties || {})) {
        const d = duties[date];
        if (!d || d.deleted || date.slice(0, 7) !== prevYm) continue;
        for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
          if (!s || !s.dhcEconomy) continue;
          econ += s.kind === 'positioning' ? 1 : dhRuns(s).length;
        }
      }
      if (econ && ac1Prev != null) complEur += r2(econ * ac1Prev * ae.DHC_ECON_PCT);
    }
    // Adicional de chefia (Cl. 11.ª): 8 % das AC1 + AC2 do mês ANTERIOR, ao supervisor de cabine.
    const prev = ym ? ymShift(ym, -1) : null;
    const catPrev = prev && Array.isArray(history) && history.length ? (resolveCrew(history, prev).category || category) : category;   // o direito nasce no mês das ajudas
    if (ae.isChefia && ae.isChefia(catPrev) && ae.CHEFIA_PCT && ym) {
      const tp = tapCalendarDays(duties, prev);
      const ac1 = ae.perDiem(catPrev, [1], 1, undefined, prev), ac2 = ae.nightStop(catPrev, 1, prev);
      if (ac1 != null && ac2 != null) chefia = r2((tp.flightDays.length * ac1 + tp.stayDays.length * ac2) * ae.CHEFIA_PCT);
    }
  } else {
    nightStops = awayNights(duties, ym).length;
  }
  const month = ae.computeAeMonth({ category, contract, duties: flights, nightStops, extraSectors, index, fleet, ym, fullShare, serviceStart, largada, history });
  if (!month) return null;
  // Acertos depois do motor do acordo (as parcelas continuam a somar ao total):
  const bump = (field, v) => { if (!v) return; month[field] = r2((month[field] || 0) + v); month.total = r2(month.total + v); };
  if (groundEur) { bump('perDiem', groundEur); month.variable = r2((month.variable || 0) + groundEur); }
  if (complEur || chefia) { bump('extras', r2(complEur + chefia)); month.variable = r2((month.variable || 0) + complEur + chefia); }
  month.chefia = chefia;
  month.extrasMax = extrasMaxDelta > 0 ? r2((month.extras || 0) + extrasMaxDelta) : null;   // e-learning da TAP: o máximo
  month.perDiemMax = groundMaxDelta > 0 ? r2(month.perDiem + groundMaxDelta) : null;
  posMin = r2(posMin); posMax = r2(posMax);
  month.positioning = posMin; month.positioningMax = posMax; month.positioningCount = posCount;
  if (posMin) { month.total = r2(month.total + posMin); month.variable = r2((month.variable || 0) + posMin); }
  // Subsídios e prestações que caem neste mês (annualItems de cada acordo). Fora do `variable`: são fixos do ano.
  const annualItems = (ym && typeof ae.annualItems === 'function')
    ? ae.annualItems(category, { ym, contract, index, fullShare, serviceStart, largada, history, events: events || [], lifestyle })
    : [];
  month.annualItems = annualItems;
  month.annual = r2(annualItems.reduce((a, x) => a + (x.eur || 0), 0));
  if (month.annual) month.total = r2(month.total + month.annual);
  // DDO/WFLY/IDO derivados das condições — valorizados pelo monthExtras do próprio AE (a
  // lei). AE sem o item (ex. TAP) → monthExtras ignora a chave → 0 (não se inventa prestação).
  const condEur = (ddoDaysAuto || wflyDaysAuto || idoDaysAuto) && ae.monthExtras
    ? +(ae.monthExtras(category, { ddo: ddoDaysAuto, wfly: wflyDaysAuto, ido: idoDaysAuto }, { index, ym, contract, fullShare }).total).toFixed(2)
    : 0;
  const plusEur = +(adtyEur + instrEur + condEur).toFixed(2);
  if (plusEur) {
    month.extras = +(((month.extras || 0) + plusEur)).toFixed(2);
    month.variable = +(((month.variable || 0) + plusEur)).toFixed(2);
    month.total = +(((month.total || 0) + plusEur)).toFixed(2);
  }
  return { ...month, withRoute, missing, count, officeDays, adtyDays, instructorDaysAuto, trainDaysAuto, ddoDaysAuto, wflyDaysAuto, idoDaysAuto, nightStopDays: nightStops };
};

// CAMINHO ÚNICO do total mensal AE (€) — usado por Home, Perfil e Cálculos para
// mostrarem o MESMO número. `monthlyAe.total` já inclui base + abono (cabine, UMA vez)
// + per-diem + pernoita + escritório/ADTY; somamos só os EXTRAS manuais do mês.
// extras = mapa de contadores { <id>: n }. Devolve número (€), ou null sem ae/categoria.
export const aeMonthTotal = (duties = {}, category, contract = '12/12', ae, { ym = null, index = 1, extras = {}, fleet, fullShare, serviceStart = null, largada = null, history = null, events = [], lifestyle = false } = {}) => {
  if (!ae || !category) return null;
  if (ym && ae.hasTableFor && !ae.hasTableFor(category, ym)) return null;   // sem tabela nesse mês → sem €
  const m = monthlyAe(duties, category, contract, ae, { ym, index, fleet, fullShare, serviceStart, largada, history, events, lifestyle });
  const baseTotal = m ? m.total : (ae.monthlyBase ? (ae.monthlyBase(category, { contract, index, ym, fullShare, serviceStart, largada, history }) || 0) : 0);
  const xt = ae.monthExtras ? ae.monthExtras(category, extras, { index, ym, contract, fullShare }) : null;
  return +(baseTotal + (xt ? xt.total : 0)).toFixed(2);
};

// € dos EXTRAS (eventos) que entram num mês — o MESMO caminho do total do mês (eventCounts + ae.monthExtras): só os eventos
// desse mês, a doença pela regra do acordo, a base que sai nos dias de baixa, as ausências em dias com serviço fora
// (auditoria A-194, bloco 5: o "Soma ao mês" somava os eventos de todos os meses a valor cheio). null sem acordo/categoria.
export const extrasMonthEur = (ae, category, events = [], ym, { duties = null, index = 1, contract = '12/12', fullShare } = {}) => {
  if (!ae || !ae.monthExtras || !category || !ym) return null;
  if (ae.hasTableFor && !ae.hasTableFor(category, ym)) return null;
  const counts = eventCounts(events || [], ym, duties, ae.SICK_FIRST3 !== false);
  return ae.monthExtras(category, counts, { index, ym, contract, fullShare }).total;
};

// ── O VALOR DE UM SERVIÇO (auditoria L10, bloco 6) ──
// Uma só função para o € de um serviço nos ecrãs (Detalhe, Escala, formulário, importação, Simulação, Início): as MESMAS regras e o
// MESMO índice do total do mês — a soma dos serviços bate com o mês. Devolve { perDiem, positioning, positioningMax, nightStop,
// other: { lbl: {pt, en}, eur, max? } } (null onde não há). `daySvcs` = os serviços do dia (assistência chamada = há voo no dia).
// TAP: o € é do DIA (AC1 / per diem A, B, complemento) — num dia com voo, um serviço sem voo não paga à parte.
export const serviceMoney = (ae, category, svc, { date, fleet, daySvcs = null } = {}) => {
  const out = { perDiem: null, positioning: null, positioningMax: null, nightStop: null, other: null };
  if (!ae || !category || !svc) return out;
  const kind = svc.kind || 'flight';
  const idx = aeIndex(ae, date);
  const day = Array.isArray(daySvcs) && daySvcs.length ? daySvcs : [svc];
  const dayHasFlight = day.some((x) => x && ((x.kind || 'flight') === 'flight' || x.kind === 'positioning'));
  if (ae.PER_DIEM_BY_DAY) {
    if (kind === 'flight' || kind === 'positioning') {
      // "Por cada dia de calendário" (Cl. 7.ª/9.ª): o € é do DIA — fica no 1.º serviço de voo/DHC do dia (os outros: `dayCounted`)
      // e um serviço que cruza a meia-noite leva um por cada dia em curso (revisão independente do bloco 6). A mesma conta do mês.
      const flown = day.filter(Boolean).slice().sort((a, b) => (clockMin(a.report_time) ?? 0) - (clockMin(b.report_time) ?? 0))
        .filter((x) => (x.kind || 'flight') === 'flight' || x.kind === 'positioning');
      if (flown.indexOf(svc) > 0) { out.dayCounted = true; return out; }
      const td = tapCalendarDays({ [date]: { ...(flown[0] || svc), extra: flown.slice(1) } }, '');
      let sum = 0, ok = false;
      for (const f of td.flightDays) {
        const v = ae.perDiem(category, f.dists, idx, fleet, f.date, { longHaul: f.longHaul == null ? undefined : f.longHaul });
        if (v != null) { sum += v; ok = true; }
      }
      if (ok) out.perDiem = r2(sum);
      return out;
    }
    if (dayHasFlight) return out;
    if (ae.GROUND_PER_DIEM) {
      if (kind === 'office' && svc.officeType === 'medical') {
        out.other = { lbl: { pt: 'Per diem B — ato médico (RRRGS Cl. 9.ª)', en: 'Per diem B — medical (RRRGS Cl. 9)' }, eur: ae.perDiemB(category, date) };
      } else if (kind === 'standby_airport' || (kind === 'training' && svc.trainingType === 'sim')) {
        out.other = { lbl: { pt: 'Per diem A (RRRGS Cl. 9.ª)', en: 'Per diem A (RRRGS Cl. 9)' }, eur: ae.perDiem(category, [0], 1, fleet, date, { longHaul: false }) };
      } else if (kind === 'training') {
        const maybeA = !svc.eLearning && !svc.trainingType;   // sem o tipo: 0 certo, até ao A (Cl. 10.ª, n.º 2, d))
        out.other = maybeA
          ? { lbl: { pt: 'Formação sem tipo marcado (RRRGS Cl. 9.ª/10.ª)', en: 'Training, type not set (RRRGS Cl. 9/10)' }, eur: 0, max: ae.perDiem(category, [0], 1, fleet, date, { longHaul: false }) }
          : { lbl: { pt: 'Per diem B (RRRGS Cl. 9.ª)', en: 'Per diem B (RRRGS Cl. 9)' }, eur: ae.perDiemB(category, date) };
      }
      return out;
    }
    if (ae.EXTRAORD_FROM_ROSTER && ae.extraord) {
      const mult = kind === 'standby_airport' ? 2 : (kind === 'standby_home' || kind === 'office' || (kind === 'training' && !svc.eLearning)) ? 1 : 0;
      const each = ae.extraord(date, category);
      if (mult && each != null) out.other = { lbl: { pt: mult === 2 ? 'Complemento × 2 (RRRGS Cl. 8.ª)' : 'Complemento (RRRGS Cl. 8.ª)', en: mult === 2 ? 'Supplement × 2 (RRRGS Cl. 8)' : 'Supplement (RRRGS Cl. 8)' }, eur: r2(mult * each) };
    }
    return out;
  }
  if (kind === 'flight') {
    const dists = sectorDistancesNM(svc);
    if (dists.length && !dists.some((x) => x == null)) out.perDiem = ae.perDiem(category, dists, idx, fleet, date);
  }
  if (kind === 'flight' || kind === 'positioning') {
    const po = positioningOf(ae, category, svc, { date, index: idx, fleet });
    if (po.count) { out.positioning = po.min; out.positioningMax = po.max; }
  }
  if (svc.nightStop && ae.nightStop) out.nightStop = ae.nightStop(category, idx, date);
  if (kind === 'training') {
    const role = svc.role || (svc.instructor ? 'instr' : null);
    if (!role && !svc.eLearning && ae.adhoc) out.other = { lbl: { pt: 'Formação (Art. 43.º)', en: 'Training (Art. 43)' }, eur: ae.adhoc(category, idx, date) };
  } else if (kind === 'office') {
    if (svc.officeType === 'ofc8' && ae.office8) out.other = { lbl: { pt: 'Dia de escritório (OFC8)', en: 'Office day (OFC8)' }, eur: ae.office8(category, idx, date) };
    else if (ae.office4) out.other = { lbl: { pt: 'Dia de escritório (OFC4)', en: 'Office day (OFC4)' }, eur: ae.office4(category, idx, date) };
    else if (ae.office) out.other = { lbl: { pt: 'Trabalho em terra (Cl. 70.ª)', en: 'Ground duty (Cl. 70)' }, eur: ae.office(category, date) };
  } else if (kind === 'standby_airport' && ae.airportStandby) {
    const r = clockMin(svc.report_time), e = clockMin(svc.block_on);
    const dm = (r != null && e != null) ? (e >= r ? e - r : e + 1440 - r) : null;
    const called = day.some((x) => x && (x.kind || 'flight') === 'flight');
    const eur = ae.airportStandby(category, { called, over4h: dm != null && dm >= 240, index: idx, ym: date });   // sem horas → o garantido (< 4 h), A-220
    if (eur > 0) out.other = { lbl: { pt: 'Assistência no aeroporto (ADTY)', en: 'Airport standby (ADTY)' }, eur };
  }
  return out;
};

// Nomes das prestações que caem num mês (annualItems dos acordos) — partilhados pelo Início e pelos Números.
export const ANNUAL_LABEL = {
  natal: { pt: 'Subsídio de Natal', en: 'Christmas allowance' },
  ferias: { pt: 'Subsídio de férias', en: 'Holiday allowance' },
  benefits: { pt: 'Prestação complementar anual', en: 'Annual supplementary payment' },
  loyalty: { pt: 'Prémio de permanência', en: 'Long-service award' },
  retention: { pt: 'Pagamento de retenção', en: 'Retention payment' },
};
// "Subsídio de Natal" ou, quando falta uma parte que a app não sabe (a média das variáveis, o subsídio de idioma), "… · parte certa".
export const annualLabel = (it, lang = 'pt') => {
  const n = (ANNUAL_LABEL[it && it.id] || { pt: it && it.id, en: it && it.id })[lang === 'en' ? 'en' : 'pt'];
  return it && it.incomplete ? `${n} · ${lang === 'en' ? 'known part' : 'parte certa'}` : n;
};
