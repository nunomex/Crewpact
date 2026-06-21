// Importação de escala: atividade do calendário (getDutiesInRange) → linha de `duty`
// (tabela `duties`), e validação prospetiva (legalidade do PSV + impacto nos
// acumulados 210). Módulo PURO (sem expo-calendar) — testável por golden.
import { dutyToFtlDay, computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty } from '../ftl';

// Atividade { dateISO, sectors, legs:[{ report, depTime, arrTime, startDate, endDate, depAirport, arrAirport }] }
// → { duty_date, report_time, block_off, block_on, sectors, flight_minutes, route }.
// `route` = cadeia de aeroportos "LIS-OPO-LIS" (null se algum for desconhecido) —
// alimenta o per diem do AE (distância de grande círculo por setor).
export const dutyFromActivity = (act) => {
  if (!act || !Array.isArray(act.legs) || !act.legs.length) return null;
  const first = act.legs[0], last = act.legs[act.legs.length - 1];
  const flightMin = act.legs.reduce((s, l) => {
    const d = (l.endDate && l.startDate) ? Math.round((new Date(l.endDate) - new Date(l.startDate)) / 60000) : 0;
    return s + Math.max(0, d);
  }, 0);
  // Cadeia de aeroportos: dep da 1.ª perna + arr de cada perna (setores contíguos).
  const codes = [first.depAirport, ...act.legs.map((l) => l.arrAirport)];
  const route = codes.length >= 2 && codes.every((c) => c && c !== '—') ? codes.join('-') : null;
  return {
    duty_date: act.dateISO,
    report_time: first.report || null,   // apresentação (≈ dep − 1 h)
    block_off: first.depTime || null,     // 1.º off-block
    block_on: last.arrTime || null,       // último on-block
    sectors: act.sectors || act.legs.length,
    flight_minutes: flightMin,
    route,
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

// ── Importação de escala (Fase 2) ─────────────────────────────────────────────
// Duty SEM-VOO do calendário { dateISO, start, end, kind } → linha de duty. O kind
// já vem do item (rosterCodes, por companhia). Sem rota/setores/voo.
export const dutyFromNonFlight = (it) => {
  if (!it || !it.dateISO) return null;
  return {
    duty_date: it.dateISO,
    report_time: it.start || null,
    block_off: null,
    block_on: it.end || null,
    sectors: 0,
    flight_minutes: 0,
    route: null,
  };
};

// Intervalo de importação a partir da opção do seletor (janela para a frente, de hoje).
export const rangeFromOption = (option, from = new Date()) => {
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (option === '14') end.setDate(end.getDate() + 14);
  else if (option === 'month') end.setMonth(end.getMonth() + 1);   // ~1 mês
  else end.setDate(end.getDate() + 28);                            // '28' (padrão)
  return { start, end };
};

// Candidatos de importação: atividades (voos) + duties SEM-VOO do calendário.
// Cada candidato: { duty (com kind), kind, status: 'ok'|'warn'|'exists', exists,
// prospect, selected }. Default SEGURO: um dia que já tenha duty → status 'exists'
// e selected=false (MANTÉM o manual). O utilizador marca para o calendário substituir
// (com confirmação na UI). Ordenado por data. Módulo PURO.
export const buildImportCandidates = ({ activities = [], nonflights = [], duties = {}, dayLog = {} } = {}) => {
  const make = (duty, kind) => {
    if (!duty) return null;
    duty.kind = kind;
    const ex = duties[duty.duty_date];
    const exists = !!(ex && !ex.deleted);
    const prospect = prospectiveDuty(duty, dayLog);
    const status = exists ? 'exists' : (prospect && prospect.ok === false ? 'warn' : 'ok');
    return { duty, kind, status, exists, prospect, selected: !exists };
  };
  const out = [];
  for (const act of activities) { const c = make(dutyFromActivity(act), 'flight'); if (c) out.push(c); }
  for (const nf of nonflights) { const c = make(dutyFromNonFlight(nf), nf.kind); if (c) out.push(c); }
  out.sort((a, b) => (a.duty.duty_date < b.duty.duty_date ? -1 : a.duty.duty_date > b.duty.duty_date ? 1 : 0));
  return out;
};
