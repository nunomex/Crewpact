// Per diem do AE a partir das rotas das duties. Liga as distâncias de aeroporto
// (data/airports.js) às bandas/setores nominais do módulo AE (ae/*). Módulo PURO.
import { sectorDistanceNM } from './airports';
import { eventCounts } from './aeEvents';

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
      if (kind !== 'flight' && kind !== 'positioning') return;
      let dists = kind === 'flight' ? sectorDistancesNM(s) : routeDistancesNM(s.route);
      if (kind === 'flight') {
        if (!dists.length || dists.some((x) => x == null)) { if (String(date).startsWith(ym)) missing++; return; }
        if (String(date).startsWith(ym)) withRoute++;
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
      for (let k = 0; k <= span; k++) {
        const day = isoAdd(date, k);
        if (!flightDay.has(day)) flightDay.set(day, []);
        flightDay.get(day).push(...dists);
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
  return {
    flightDays: [...flightDay.entries()].filter(([d]) => inYm(d)).sort(([a], [b]) => a.localeCompare(b)).map(([date, dists]) => ({ date, dists })),
    stayDays: stayDays.filter(inYm),
    withRoute, missing,
  };
};

// Estimativa mensal AE (€) a partir das duties (kind + rota). É a PONTE entre o
// modelo da app (1 duty/dia: route + kind) e o `computeAeMonth` do motor. Mapeamento
// dos kind (em setores nominais, que o motor multiplica pelo NS da categoria):
//   • flight          → per-diem da rota (distâncias → ae.perDiem)
//   • office          → OFC4 1,5 NS · OFC8 3 NS (officeType)    (Anexo I.14 · cabine Art. 70 = 3 NS)
//   • training        → FORMANDO em terra/simulador = 3 NS (Art. 43 piloto; só e-learning=0);
//                       INSTRUTOR (role) = €120 (Art. 42). Cabine (Cl.70 não cobre formação) = 0.
//   • standby_airport → ADTY ≥4h não-chamado = 2 NS            (Anexo I.5)
//   • standby_home / positioning → 0  (posicionamento conta p/ FTL mas não paga AE;
//     standby em casa não tem abono no Anexo I)
// Paragens nocturnas: contadas das duties marcadas `nightStop` (toggle no formulário),
// valor fixo Art. 39 = 2 NS/paragem. Módulo PURO. duties = mapa { date: { route, kind,
// nightStop?, deleted? } }. Devolve o objeto do motor (base, perDiem, nightStops €,
// extras, total) + meta { withRoute, missing, count, officeDays, adtyDays, nightStopDays }
// — ou null se faltar ae/categoria/computeAeMonth.
export const monthlyAe = (duties = {}, category, contract = '12/12', ae, { ym = null, index = 1, fleet, fullShare } = {}) => {
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
    if (!byDay && svcs.some((s) => s && s.nightStop)) nightStops++;
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
      // standby_home / positioning / training → 0 (sem prestação de AE no Anexo I).
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
  if (byDay) {
    const td = tapCalendarDays(duties, ym || '');
    td.flightDays.forEach((f) => flights.push(f.dists));
    nightStops = td.stayDays.length;
    withRoute = td.withRoute; missing = td.missing;
  }
  const month = ae.computeAeMonth({ category, contract, duties: flights, nightStops, extraSectors, index, fleet, ym, fullShare });
  if (!month) return null;
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
export const aeMonthTotal = (duties = {}, category, contract = '12/12', ae, { ym = null, index = 1, extras = {}, fleet, fullShare } = {}) => {
  if (!ae || !category) return null;
  if (ym && ae.hasTableFor && !ae.hasTableFor(category, ym)) return null;   // sem tabela nesse mês → sem €
  const m = monthlyAe(duties, category, contract, ae, { ym, index, fleet, fullShare });
  const baseTotal = m ? m.total : (ae.monthlyBase ? (ae.monthlyBase(category, { contract, index, ym, fullShare }) || 0) : 0);
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
