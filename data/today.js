// "Hoje" — respostas DETERMINÍSTICAS às perguntas que um tripulante quer ao entrar.
// Compõe os motores (ftl/ae) e devolve dados ESTRUTURADOS (status + números + a
// DECOMPOSIÇÃO do cálculo), SEM texto de UI nem idioma — a HojeScreen/HojeDetail é que
// formata. Sem LLM: tudo sai dos motores golden-tested, por isso as sugestões e o
// "como cheguei aqui" são factuais (a regra que deteta a condição é a que faz a conta).
import { computeDutyTime, computeFlightTime, computeRest } from '../ftl';
import { monthlyAe, aeMonthTotal } from './perdiem';
import { eventCounts } from './aeEvents';

const hasFtlData = (dayLog) =>
  Object.values(dayLog || {}).some((d) => (d?.voo > 0) || (d?.servico > 0));

const worstByRatio = (windows) =>
  windows.reduce((a, b) => (b.ratio > a.ratio ? b : a), { ratio: -1 });

// "Estou legal?" — ilegal se o PSV de hoje excede o máximo OU se alguma janela
// cumulativa está acima do limite. Devolve também psv + todas as janelas (p/ o detalhe).
export function legalStatus(ftlSnap = {}, dayLog = {}, ref = new Date()) {
  const windows = [...computeDutyTime(dayLog, ref), ...computeFlightTime(dayLog, ref)];
  const psv = ftlSnap?.psv || null;
  const psvData = psv ? { result: psv.result, max: psv.max, over: !!psv.over, excess: psv.excess ?? null } : null;
  if (psv && psv.over) return { id: 'legal', status: 'bad', kind: 'psvOver', excess: psv.excess ?? null, psv: psvData, windows };
  const overWin = windows.find((w) => w.over);
  if (overWin) return { id: 'legal', status: 'bad', kind: 'limitOver', cat: overWin.key, windowId: overWin.id, days: overWin.days, psv: psvData, windows };
  if (!hasFtlData(dayLog) && !psv) return { id: 'legal', status: 'neutral', kind: 'noData', psv: psvData, windows };
  return { id: 'legal', status: 'ok', kind: 'legal', psv: psvData, windows };
}

// "Quanto me falta para o limite?" — pior janela por rácio + todas as janelas com a
// folga (limite − feito) calculada, para o detalhe mostrar a tabela completa.
export function headroomStatus(dayLog = {}, ref = new Date()) {
  const windows = [...computeDutyTime(dayLog, ref), ...computeFlightTime(dayLog, ref)]
    .map((w) => ({ ...w, headroom: Math.max(0, w.limit - w.done) }));
  if (!hasFtlData(dayLog)) return { id: 'headroom', status: 'neutral', kind: 'noData', windows };
  const w = worstByRatio(windows);
  const status = w.ratio >= 1 ? 'bad' : w.ratio >= 0.85 ? 'warn' : 'ok';
  return {
    id: 'headroom', status, cat: w.key, windowId: w.id, days: w.days,
    done: w.done, limit: w.limit, headroom: Math.max(0, w.limit - w.done), ratio: w.ratio, windows,
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

// "Tenho descanso?" — repouso entre o FIM do serviço anterior e o REPORT do próximo, vs
// o mínimo (ORO.FTL.235, na base = máx(12 h, duração do serviço anterior)). Consultivo.
// status: 'ok' | 'bad' | 'neutral' (sem dados para calcular).
export function restStatus(duties = {}, todayISO, _ref = new Date()) {
  let next = null;
  for (const iso in duties) { const d = duties[iso]; if (!d || d.deleted || !d.report_time || iso < todayISO) continue; if (!next || iso < next.iso) next = { iso, d }; }
  if (!next) return { id: 'rest', status: 'neutral', kind: 'noNext' };
  let prev = null; // serviço IMEDIATAMENTE anterior (adjacência importa p/ o repouso)
  for (const iso in duties) { const d = duties[iso]; if (!d || d.deleted || !d.report_time || iso >= next.iso) continue; if (!prev || iso > prev.iso) prev = { iso, d }; }
  if (!prev) return { id: 'rest', status: 'neutral', kind: 'noPrev', nextIso: next.iso };
  if (!prev.d.block_on) return { id: 'rest', status: 'neutral', kind: 'noPrevEnd', prevIso: prev.iso, nextIso: next.iso };
  const dt = (iso, hm) => { const [h, m] = String(hm).split(':').map(Number); const x = new Date(iso + 'T00:00:00'); x.setHours(h || 0, m || 0, 0, 0); return x; };
  const prevReport = dt(prev.iso, prev.d.report_time);
  let prevEnd = dt(prev.iso, prev.d.block_on);
  if (prevEnd.getTime() <= prevReport.getTime()) prevEnd = new Date(prevEnd.getTime() + 86400000); // serviço virou a meia-noite
  const nextReport = dt(next.iso, next.d.report_time);
  const prevDutyMin = Math.round((prevEnd.getTime() - prevReport.getTime()) / 60000);
  const actualMin = Math.round((nextReport.getTime() - prevEnd.getTime()) / 60000);
  const { restMin: requiredMin, floorMin } = computeRest({ prevDutyMin, inBase: true });
  return { id: 'rest', status: actualMin < requiredMin ? 'bad' : 'ok', actualMin, requiredMin, floorMin, prevDutyMin, prevIso: prev.iso, nextIso: next.iso };
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
  const total = aeMonthTotal(duties, crewCategory, crewContract || '12/12', ae, { ym, index, extras: eventCounts(aeEvents || [], ym, duties), fleet: crewFleet }) || base;
  return {
    id: 'pay', status: 'neutral', base, total, variable: +(total - base).toFixed(2),
    perDiem: m ? m.perDiem : 0, nightStops: m ? m.nightStops : 0, extras: m ? m.extras : 0,
    manualExtras: +(total - (m ? m.total : base)).toFixed(2),
    meta: m ? { withRoute: m.withRoute, missing: m.missing, count: m.count, officeDays: m.officeDays, adtyDays: m.adtyDays, nightStopDays: m.nightStopDays } : null,
    expired: !!(ae.isAgreementExpired && ae.isAgreementExpired(now)), contract: crewContract || '12/12', ym,
  };
}
