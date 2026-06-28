// Importação de escala: atividade do calendário (getDutiesInRange) → linha de `duty`
// (tabela `duties`), e validação prospetiva (legalidade do PSV + impacto nos
// acumulados 210). Módulo PURO (sem expo-calendar) — testável por golden.
import { dayFtlFromDuties, computeDutyTime, computeFlightTime, computeDuty, fatigueFromDuty } from '../ftl';
import { classify } from './rosterDiff';

// Pernoita = NOITE FORA DA BASE (Art. 39 pilotos / Art. 56 cabine): uma duty de VOO acaba
// num aeroporto ≠ base do tripulante → dormes fora → pernoita. Sem base OU sem rota conhecida
// → RECURSO pela PARIDADE dos setores (ímpar = acabas fora). `route`="LIS-OPO-LIS"; `base`=IATA.
// (Substitui a antiga regra-do-utilizador por paridade, que contava a dobrar os dias de regresso.)
export const isNightStop = (route, base, sectors) => {
  const aps = String(route || '').split(/[^A-Za-z]+/).map((s) => s.toUpperCase()).filter(Boolean);
  const b = String(base || '').trim().toUpperCase();
  if (b && aps.length >= 2) return aps[aps.length - 1] !== b;   // último aeroporto ≠ base → pernoita
  return Number(sectors) % 2 === 1;                              // recurso: paridade
};

// Atividade { dateISO, sectors, legs:[{ flightNo, report, depTime, arrTime, startDate, endDate, depAirport, arrAirport }] }
// → { duty_date, report_time, block_off, block_on, sectors, flight_minutes, route }.
// `route` = cadeia de aeroportos "LIS-OPO-LIS" (null se algum for desconhecido) —
// alimenta o per diem do AE (distância de grande círculo por setor).
export const dutyFromActivity = (act, base = null) => {
  if (!act || !Array.isArray(act.legs) || !act.legs.length) return null;
  const first = act.legs[0], last = act.legs[act.legs.length - 1];
  const flightMin = act.legs.reduce((s, l) => {
    const d = (l.endDate && l.startDate) ? Math.round((new Date(l.endDate) - new Date(l.startDate)) / 60000) : 0;
    return s + Math.max(0, d);
  }, 0);
  // Cadeia de aeroportos: dep da 1.ª perna + arr de cada perna (setores contíguos).
  const codes = [first.depAirport, ...act.legs.map((l) => l.arrAirport)];
  const route = codes.length >= 2 && codes.every((c) => c && c !== '—') ? codes.join('-') : null;
  const sectors = act.sectors || act.legs.length;
  return {
    duty_date: act.dateISO,
    report_time: first.report || null,   // apresentação REAL do evento (null → o user preenche; nunca dep − 1 h)
    block_off: first.depTime || null,     // 1.º off-block
    block_on: last.arrTime || null,       // último on-block
    sectors,
    flight_minutes: flightMin,
    route,
    // Pernoita = NOITE FORA DA BASE (Art. 39/56): a duty acaba num aeroporto ≠ base. Sem
    // base/rota → recurso pela paridade dos setores (ver isNightStop, topo do módulo).
    nightStop: isNightStop(route, base, sectors),
    // Legs com nº de voo (p/ o reconcile "ao vivo"). Forma leve e serializável (JSON):
    // só o essencial por leg — flightNo + aeroportos + horas planeadas.
    legs: act.legs.map((l) => ({ flightNo: l.flightNo || null, dep: l.depAirport, arr: l.arrAirport, off: l.depTime || null, on: l.arrTime || null, offZ: l.depTimeZ || null, onZ: l.arrTimeZ || null })),
  };
};

// Validação prospetiva: "posso aceitar esta duty?". Legalidade do PSV + se, ao incluí-la
// no dia, os acumulados de 28 dias (210) passam o limite. dayLog = store FTL atual.
export const prospectiveDuty = (duty, dayLog = {}, ref = null, postFlightMin = 0, isPilot = false) => {
  // Um dia pode ter N períodos de serviço (210 conta por serviço): inclui os `extra` do candidato.
  const ftl = dayFtlFromDuties([duty, ...((duty.extra && duty.extra.length) ? duty.extra : [])], { postFlightMin, isPilot }); // { psv, servico, voo, rest, parts } ou null
  if (!ftl) return { ok: null, fdpOver: false, servico28: 0, voo28: 0, issues: [] };
  const refDate = ref || (duty.duty_date ? new Date(duty.duty_date + 'T12:00:00') : new Date());
  const hypo = { ...dayLog, [duty.duty_date]: ftl }; // dayLog hipotético com a duty incluída
  const duty28 = computeDutyTime(hypo, refDate).find(w => w.id === '28d');
  const flight28 = computeFlightTime(hypo, refDate).find(w => w.id === '28d');
  const issues = [];
  if (ftl.psv.over) issues.push({ type: 'fdp' });
  if (duty28 && duty28.over) issues.push({ type: 'duty28', done: duty28.done, limit: duty28.limit });
  if (flight28 && flight28.over) issues.push({ type: 'flight28', done: flight28.done, limit: flight28.limit });
  // Índice de risco de fadiga (consultivo) desta duty — com o teto do PSV corrigido (casos especiais).
  const sp = duty.special || {};
  const d = computeDuty({ state: 'acc', report: duty.report_time, end: duty.block_on, sectors: duty.sectors || 0, inBase: true, augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null, isPilot });
  // Limite COMBINADO do standby (CS FTL.1.225): standby + PSV > 16h (aeroporto) / > 18h acordado
  // (casa) / standby > 16h → ilegal, separado do PSV-over.
  if (d.fdp && d.fdp.stdbyOver) issues.push({ type: 'standby', kind: d.fdp.stdbyOverKind });
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
export const buildImportCandidates = ({ activities = [], nonflights = [], duties = {}, dayLog = {}, window = null, base = null, isPilot = false } = {}) => {
  const out = [];
  const inDates = new Set();
  const make = (duty, kind) => {
    if (!duty) return null;
    duty.kind = kind;
    inDates.add(duty.duty_date);
    const ex = duties[duty.duty_date];
    const exists = !!(ex && !ex.deleted);
    const prospect = prospectiveDuty(duty, dayLog, null, 0, isPilot);
    // EXISTE → classify a 3 vias (changed/conflict/same); NOVO → ok/warn (legalidade).
    let status = 'ok', diff = [];
    if (exists) { const cls = classify(ex, duty); status = cls.status; diff = cls.fields; }
    else status = (prospect && prospect.ok === false) ? 'warn' : 'ok';
    // Default SEGURO: só os NOVOS vêm marcados; alterado/conflito por marcar.
    return { duty, kind, status, exists, diff, prospect, selected: !exists, action: 'save' };
  };
  for (const act of activities) { const c = make(dutyFromActivity(act, base), 'flight'); if (c) out.push(c); }
  for (const nf of nonflights) { const c = make(dutyFromNonFlight(nf), nf.kind); if (c) out.push(c); }
  // CANCELADOS (Fase 4): duties source=calendar, dentro da janela, que sumiram do calendário
  // ("fonte manda"). Vêm PRÉ-MARCADOS (selected: true) → o "Confirmar import" habitual limpa os
  // dias cancelados, que ficam livres. A confirmação é a rede de segurança contra leituras
  // parciais (sem tombstone, apagar é irreversível). Manuais/PDF nunca entram aqui.
  if (window && window.start && window.end) {
    for (const date in duties) {
      const d = duties[date];
      if (!d || d.deleted || d.source !== 'calendar') continue;
      if (date < window.start || date > window.end) continue;
      if (inDates.has(date)) continue;
      const kind = d.kind || 'flight';
      out.push({ duty: { ...d, duty_date: date, kind }, kind, status: 'removed', exists: true, diff: [], selected: true, action: 'delete' });
    }
  }
  const PRIO = { removed: 0, conflict: 1, changed: 2, warn: 3, ok: 4, same: 5 };
  out.sort((a, b) => ((PRIO[a.status] ?? 9) - (PRIO[b.status] ?? 9)) || (a.duty.duty_date < b.duty.duty_date ? -1 : a.duty.duty_date > b.duty.duty_date ? 1 : 0));
  return out;
};

// Duty-rows da nova leitura (calendário/PDF) — sem o cálculo prospetivo, para a
// deteção automática de alterações (diffRoster). Reaproveita os mesmos mapeadores.
export const buildIncoming = ({ activities = [], nonflights = [] } = {}) => {
  const out = [];
  for (const act of activities) { const d = dutyFromActivity(act); if (d) { d.kind = 'flight'; out.push(d); } }
  for (const nf of nonflights) { const d = dutyFromNonFlight(nf); if (d) { d.kind = nf.kind; out.push(d); } }
  return out;
};
