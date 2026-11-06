// "Hoje" — respostas DETERMINÍSTICAS às perguntas que um tripulante quer ao entrar.
// Compõe os motores (ftl/ae) e devolve dados ESTRUTURADOS (status + números + a
// DECOMPOSIÇÃO do cálculo), SEM texto de UI nem idioma — a HojeScreen/HojeDetail é que
// formata. Sem LLM: tudo sai dos motores golden-tested, por isso as sugestões e o
// "como cheguei aqui" são factuais (a regra que deteta a condição é a que faz a conta).
import { computeDutyTime, computeFlightTime, restAfterDuty } from '../ftl';
import { monthlyAe, aeMonthTotal } from './perdiem';
import { eventCounts } from './aeEvents';

const hasFtlData = (dayLog) =>
  Object.values(dayLog || {}).some((d) => (d?.voo > 0) || (d?.servico > 0) || (d?.vooMin > 0) || (d?.servicoMin > 0));

const worstByRatio = (windows) =>
  windows.reduce((a, b) => (b.ratio > a.ratio ? b : a), { ratio: -1 });

// "Dentro dos limites?" — excede se o PSV de hoje passa o máximo OU se alguma janela cumulativa
// está acima do limite. Devolve também psv (com a hora-limite de calços) + as janelas (p/ o detalhe).
// A app estima, nunca declara legalidade (termos §3): o id 'legal' é interno, as palavras não.
export function legalStatus(ftlSnap = {}, dayLog = {}, ref = new Date()) {
  const windows = [...computeDutyTime(dayLog, ref), ...computeFlightTime(dayLog, ref)];
  const psv = ftlSnap?.psv || null;
  const psvData = psv ? { result: psv.result, max: psv.max, maxHi: psv.maxHi || null, over: !!psv.over, excess: psv.excess ?? null, latest: psv.latest || null, latestNextDay: !!psv.latestNextDay } : null;
  if (psv && psv.over) return { id: 'legal', status: 'bad', kind: 'psvOver', excess: psv.excess ?? null, psv: psvData, windows };
  // "A lei é que manda": falta um facto de que a lei precisa e o PSV fica entre o garantido e o possível → incerto.
  if (psv && psv.uncertain) return { id: 'legal', status: 'warn', kind: 'psvUncertain', unknowns: psv.unknowns || [], psv: psvData, windows };
  // Standby fora do aeroporto acima de 16 h (CS FTL.1.225(b)(1)) — não é PSV, mas tem limite próprio.
  if (psv && psv.sbOver) return { id: 'legal', status: 'bad', kind: 'standbyOver', psv: psvData, windows };
  const overWin = windows.find((w) => w.over);
  if (overWin) return { id: 'legal', status: 'bad', kind: 'limitOver', cat: overWin.key, windowId: overWin.id, days: overWin.days, psv: psvData, windows };
  if (!hasFtlData(dayLog) && !psv) return { id: 'legal', status: 'neutral', kind: 'noData', psv: psvData, windows };
  return { id: 'legal', status: 'ok', kind: 'legal', psv: psvData, windows };
}

// "Quanto me falta para o limite?" — pior janela por rácio + todas as janelas com a
// folga (limite − feito) calculada, para o detalhe mostrar a tabela completa.
export function headroomStatus(dayLog = {}, ref = new Date()) {
  // Em minutos inteiros (auditoria A-172): a folga nunca se arredonda para cima; "ultrapassado" = acima do limite.
  const windows = [...computeDutyTime(dayLog, ref), ...computeFlightTime(dayLog, ref)]
    .map((w) => ({ ...w, headroom: w.headroomMin / 60 }));
  if (!hasFtlData(dayLog)) return { id: 'headroom', status: 'neutral', kind: 'noData', windows };
  const w = worstByRatio(windows);
  const status = w.over ? 'bad' : w.ratio >= 0.85 ? 'warn' : 'ok';
  return {
    id: 'headroom', status, cat: w.key, windowId: w.id, days: w.days,
    done: w.done, doneMin: w.doneMin, limit: w.limit, headroom: w.headroomMin / 60, headroomMin: w.headroomMin, overMin: w.overMin, ratio: w.ratio, windows,
  };
}

// "Quando trabalho?" — próximo serviço do store `duties` (>= hoje, não apagado).
export function nextDutyStatus(duties = {}, todayISO, _now = Date.now()) {
  let best = null;
  for (const iso in duties) {
    const d = duties[iso];
    if (!d || d.deleted || iso < todayISO) continue;
    if (!best || iso < best.iso) best = { iso, d };
  }
  if (!best) return { id: 'next', status: 'neutral', none: true };
  const { iso, d } = best;
  return {
    id: 'next', status: 'neutral', iso, report: d.report_time || null, blockOff: d.block_off || null, blockOn: d.block_on || null,
    route: d.route || null, kind: d.kind || 'flight', sectors: d.sectors || null, nightStop: !!d.nightStop,
  };
}

// "Tenho descanso?" — repouso entre o FIM do serviço anterior e o REPORT do próximo, vs o mínimo. Consultivo.
// A regra é a do motor (restAfterDuty, auditoria A-144/A-160): o fim é o sign-off (ou calços + pós-voo, só voo); o
// anterior é o ÚLTIMO serviço a acabar (primária + `extra`); o mínimo é o serviço ou 12 h (base) / 10 h (fora, pela
// localização real), 14 h depois de repouso a bordo ou de fuso ≥ 4 h, e +2 h / +4 h depois de um PSV prolongado.
// As durações contam-se em instantes (Date), não em relógios — a hora de verão não engana (A-171).
// `ctx` = { postFlightMin, isPilot, base, baseAt(iso) }. status: 'ok' | 'bad' | 'neutral' (sem dados para calcular).
export function restStatus(duties = {}, todayISO, ref = new Date(), ctx = {}) {
  const { postFlightMin = 0, isPilot = false, base = null, baseAt = null } = ctx || {};
  const baseOf = (iso) => (typeof baseAt === 'function' ? baseAt(iso) : base);
  const at = (iso, hm, addDays = 0) => { const [h, m] = String(hm).split(':').map(Number); const x = new Date(iso + 'T00:00:00'); x.setDate(x.getDate() + addDays); x.setHours(h || 0, m || 0, 0, 0); return x; };
  const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  // Todos os serviços (a reserva não é serviço para o 235 — CS FTL.1.230(b)), com início e fim em instantes.
  const svcs = [];
  for (const iso in duties) {
    const d = duties[iso]; if (!d || d.deleted) continue;
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s || !s.report_time || s.kind === 'reserve') continue;
      const start = at(iso, s.report_time);
      const ra = restAfterDuty(s, { postFlightMin, isPilot, base: baseOf(iso), date: iso });
      let end = null;
      if (ra) { end = at(iso, hm(ra.endMin)); if (+end <= +start) end = at(iso, hm(ra.endMin), 1); }
      svcs.push({ iso, s, start, end, ra });
    }
  }
  // O PRÓXIMO é o 1.º serviço cujo REPORT ainda não passou (2026-11-04, golden test:reststatus).
  const refMs = +ref;
  let next = null;
  for (const v of svcs) { if (v.iso < todayISO || +v.start <= refMs) continue; if (!next || +v.start < +next.start) next = v; }
  if (!next) return { id: 'rest', status: 'neutral', kind: 'noNext' };
  // O ANTERIOR: o último a começar antes do próximo (a adjacência importa p/ o repouso).
  const before = (t) => svcs.filter((v) => +v.start < +t).sort((a, b) => +b.start - +a.start);
  const prev = before(next.start)[0] || null;
  if (!prev) return { id: 'rest', status: 'neutral', kind: 'noPrev', nextIso: next.iso };
  if (!prev.end) return { id: 'rest', status: 'neutral', kind: 'noPrevEnd', prevIso: prev.iso, nextIso: next.iso };
  const prevDutyMin = Math.round((+prev.end - +prev.start) / 60000);
  const actualMin = Math.round((+next.start - +prev.end) / 60000);
  const { floorMin } = prev.ra;
  let requiredMin = Math.max(prevDutyMin, floorMin);
  // PSV anterior prolongado (205(d)(1)): +2 h se o repouso ANTES dele também teve as +2 h (opção i); senão +4 h (ii).
  let extOption = null;
  if (prev.ra.extended) {
    const pp = before(prev.start)[0] || null;
    const ppNeed = pp && pp.end ? Math.max(Math.round((+pp.end - +pp.start) / 60000), pp.ra.floorMin) : null;
    const preRest = pp && pp.end ? Math.round((+prev.start - +pp.end) / 60000) : null;
    extOption = (ppNeed != null && preRest != null && preRest >= ppNeed + 120) ? 'i' : 'ii';
    requiredMin += extOption === 'i' ? 120 : 240;
  }
  return {
    id: 'rest', status: actualMin < requiredMin ? 'bad' : 'ok', actualMin, requiredMin, floorMin, prevDutyMin,
    prevIso: prev.iso, nextIso: next.iso, place: prev.ra.inBase ? 'base' : 'away', reason: prev.ra.reason, extOption,
  };
}

// "Mudou a escala?" — alterações detetadas (Fase 4): contagens + as próprias listas.
export function rosterStatus(rosterChanges) {
  const counts = rosterChanges?.counts || {};
  const changed = rosterChanges?.changed || [];
  const conflict = rosterChanges?.conflict || [];
  const added = rosterChanges?.added || [];
  const removed = rosterChanges?.removed || [];
  const base = { id: 'roster', counts, changed, conflict, added, removed };
  if (!counts.total) return { ...base, status: 'ok', kind: 'none' };
  return { ...base, status: 'info' };
}

// "Quanto recebo?" — total estimado do mês + a decomposição (só companhias AE).
// `aeEvents` = extras como EVENTOS DATADOS → contados p/ o mês (doença por episódio).
export function payStatus({ duties = {}, ae, crewCategory, crewContract, crewFleet, aeEvents, now = new Date() } = {}) {
  if (!ae || !crewCategory) return null;
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const index = ae.indexFactor ? ae.indexFactor(now.getFullYear()) : 1;
  const m = monthlyAe(duties, crewCategory, crewContract || '12/12', ae, { ym, index, fleet: crewFleet });
  const base = m ? m.base : ae.monthlyBase(crewCategory, { contract: crewContract || '12/12', index });
  const total = aeMonthTotal(duties, crewCategory, crewContract || '12/12', ae, { ym, index, extras: eventCounts(aeEvents || [], ym, duties, ae ? ae.SICK_FIRST3 !== false : true), fleet: crewFleet }) || base;
  return {
    id: 'pay', status: 'neutral', base, total, variable: +(total - base).toFixed(2),
    perDiem: m ? m.perDiem : 0, nightStops: m ? m.nightStops : 0, extras: m ? m.extras : 0,
    manualExtras: +(total - (m ? m.total : base)).toFixed(2),
    meta: m ? { withRoute: m.withRoute, missing: m.missing, count: m.count, officeDays: m.officeDays, adtyDays: m.adtyDays, nightStopDays: m.nightStopDays } : null,
    expired: !!(ae.isAgreementExpired && ae.isAgreementExpired(now)), contract: crewContract || '12/12', ym,
  };
}
