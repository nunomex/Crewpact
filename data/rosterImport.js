// Importação de escala: atividade do calendário (getDutiesInRange) → linha de `duty`
// (tabela `duties`), e validação prospetiva (legalidade do PSV + impacto nos
// acumulados 210). Módulo PURO (sem expo-calendar) — testável por golden.
import { dutyToFtlDay, computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty } from '../ftl';

// Atividade { dateISO, sectors, legs:[{ report, depTime, arrTime, startDate, endDate }] }
// → { duty_date, report_time, block_off, block_on, sectors, flight_minutes }.
export const dutyFromActivity = (act) => {
  if (!act || !Array.isArray(act.legs) || !act.legs.length) return null;
  const first = act.legs[0], last = act.legs[act.legs.length - 1];
  const flightMin = act.legs.reduce((s, l) => {
    const d = (l.endDate && l.startDate) ? Math.round((new Date(l.endDate) - new Date(l.startDate)) / 60000) : 0;
    return s + Math.max(0, d);
  }, 0);
  return {
    duty_date: act.dateISO,
    report_time: first.report || null,   // apresentação (≈ dep − 1 h)
    block_off: first.depTime || null,     // 1.º off-block
    block_on: last.arrTime || null,       // último on-block
    sectors: act.sectors || act.legs.length,
    flight_minutes: flightMin,
  };
};

// Validação prospetiva: "posso aceitar esta duty?". Legalidade do PSV + se, ao incluí-la
// no dia, os acumulados de 28 dias (210) passam o limite. dayLog = store FTL atual.
export const prospectiveDuty = (duty, dayLog = {}, ref = null) => {
  const ftl = dutyToFtlDay(duty); // { psv, servico, voo, rest } ou null (sem dados)
  if (!ftl) return { ok: null, fdpOver: false, servico28: 0, voo28: 0, issues: [] };
  const refDate = ref || (duty.duty_date ? new Date(duty.duty_date + 'T12:00:00') : new Date());
  const hypo = { ...dayLog, [duty.duty_date]: ftl }; // dayLog hipotético com a duty incluída
  const duty28 = computeDutyTime(hypo, refDate).find(w => w.id === '28d');
  const flight28 = computeFlightTime(hypo, refDate).find(w => w.id === '28d');
  const issues = [];
  if (ftl.psv.over) issues.push({ type: 'fdp' });
  if (duty28 && duty28.over) issues.push({ type: 'duty28', done: duty28.done, limit: duty28.limit });
  if (flight28 && flight28.over) issues.push({ type: 'flight28', done: flight28.done, limit: flight28.limit });
  // Índice de risco de fadiga (consultivo) desta duty.
  const d = computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on, sectors: duty.sectors || 0, inBase: true });
  const fatigue = fatigueFromDuty(d);
  return {
    ok: issues.length === 0,
    fdpOver: ftl.psv.over,
    servico28: duty28 ? duty28.done : 0,
    voo28: flight28 ? flight28.done : 0,
    fatigue,
    issues,
  };
};
