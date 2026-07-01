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

// Serviço-irmão (forma de `extra`): normaliza uma duty-row para os campos de um serviço do dia.
// Partilhado por buildImportCandidates (merge do sheet) e buildIncoming (merge da auto-deteção).
const svcFields = (d) => ({ report_time: d.report_time || null, block_off: d.block_off || null, block_on: d.block_on || null, sectors: d.sectors || 0, flight_minutes: d.flight_minutes || 0, route: d.route || null, kind: d.kind || 'flight', nightStop: !!d.nightStop, signOff: d.signOff || null, legs: d.legs || null, special: d.special || null });

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
export const prospectiveDuty = (duty, dayLog = {}, ref = null, postFlightMin = 0, isPilot = false, base = null) => {
  // Um dia pode ter N períodos de serviço (210 conta por serviço): inclui os `extra` do candidato.
  // `base` → repouso 12h/10h por localização real (ORO.FTL.235) e a fronteira rest/split.
  const ftl = dayFtlFromDuties([duty, ...((duty.extra && duty.extra.length) ? duty.extra : [])], { postFlightMin, isPilot, base }); // { psv, servico, voo, rest, parts } ou null
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
  const byDate = new Map();   // dia → candidato primário (p/ empilhar 2.º+ FDP do mesmo dia)
  const make = (duty, kind) => {
    if (!duty) return null;
    duty.kind = kind;
    const date = duty.duty_date;
    inDates.add(date);
    // 2.º+ atividade do MESMO dia nesta leitura → a EASA conta por serviço (210): EMPILHA como
    // `extra` no candidato primário (não sobrepõe). O prospect reprojeta-se com o dia completo.
    const prev = byDate.get(date);
    if (prev) {
      prev.duty.extra = [...(prev.duty.extra || []), svcFields(duty)];
      prev.prospect = prospectiveDuty(prev.duty, dayLog, null, 0, isPilot, base);
      prev.multi = (prev.duty.extra.length + 1);
      // Re-classifica o DIA COMPLETO (primária + extra) face ao guardado: um serviço a mais/menos
      // face ao guardado é uma mudança (o classify agora é multi-serviço). Novo dia → só legalidade.
      if (prev.exists) { const cls = classify(duties[date], prev.duty); prev.status = cls.status; prev.diff = cls.fields; }
      else if (prev.prospect && prev.prospect.ok === false && prev.status === 'ok') prev.status = 'warn';
      return null;   // já está em `out`; não cria novo candidato
    }
    const ex = duties[date];
    const exists = !!(ex && !ex.deleted);
    const prospect = prospectiveDuty(duty, dayLog, null, 0, isPilot, base);
    // EXISTE → classify a 3 vias (changed/conflict/same); NOVO → ok/warn (legalidade).
    let status = 'ok', diff = [];
    if (exists) { const cls = classify(ex, duty); status = cls.status; diff = cls.fields; }
    else status = (prospect && prospect.ok === false) ? 'warn' : 'ok';
    // Default SEGURO: só os NOVOS vêm marcados; alterado/conflito por marcar.
    const cand = { duty, kind, status, exists, diff, prospect, selected: !exists, action: 'save' };
    byDate.set(date, cand);
    return cand;
  };
  for (const act of activities) { const c = make(dutyFromActivity(act, base), 'flight'); if (c) out.push(c); }
  for (const nf of nonflights) { const c = make(dutyFromNonFlight(nf), nf.kind); if (c) out.push(c); }
  // CANCELADOS (Fase 4): duties source=calendar, dentro da janela, que sumiram do calendário.
  // AUSÊNCIA é sinal FRACO (pode ser atraso/glitch do feed) e apagar é IRREVERSÍVEL (sem tombstone)
  // → vêm POR MARCAR (selected: false). O utilizador opta-in serviço-a-serviço (toca para apagar).
  // Manuais/PDF nunca entram aqui (só o feed vivo se cancela por ausência).
  if (window && window.start && window.end) {
    for (const date in duties) {
      const d = duties[date];
      if (!d || d.deleted || d.source !== 'calendar') continue;
      if (date < window.start || date > window.end) continue;
      if (inDates.has(date)) continue;
      const kind = d.kind || 'flight';
      out.push({ duty: { ...d, duty_date: date, kind }, kind, status: 'removed', exists: true, diff: [], selected: false, action: 'delete' });
    }
  }
  const PRIO = { removed: 0, conflict: 1, changed: 2, warn: 3, ok: 4, same: 5 };
  out.sort((a, b) => ((PRIO[a.status] ?? 9) - (PRIO[b.status] ?? 9)) || (a.duty.duty_date < b.duty.duty_date ? -1 : a.duty.duty_date > b.duty.duty_date ? 1 : 0));
  return out;
};

// Campos para o saveDuty a partir de um candidato de import (commit do RosterImportSheet).
// MERGE por-SERVIÇO de `extra` (proveniência por-serviço):
//   • os serviços-irmãos DESTA leitura são do calendário/PDF (tag `source`);
//   • os teus extras MANUAIS (source:'manual') do dia SOBREVIVEM (não morrem por o calendário não
//     os trazer — são teus, deliberados);
//   • um extra do CALENDÁRIO guardado que a leitura já não traz é DESCARTADO (o dia foi relido em
//     positivo → a leitura é autoritativa para os serviços-do-calendário desse dia).
// `existingExtra` = o `extra` guardado do dia (duties[date].extra). Se nada resultar → extra:null.
export const importSaveFields = (c, source = 'calendar', existingExtra = null) => {
  const d = c.duty;
  const readExtra = (d.extra || []).map((e) => ({ ...e, source }));                  // do calendário/PDF (esta leitura)
  const keptManual = (existingExtra || []).filter((e) => e && e.source === 'manual'); // os teus à mão sobrevivem
  const extra = [...readExtra, ...keptManual];
  // snap = base do 3-vias. Capta o DIA como veio do calendário (primária + serviços-irmãos DESTA
  // leitura, sem `source`) → o classify multi-serviço distingue "calendário mudou" de "tu editaste"
  // também nos extras. Single-serviço → sem snap.extra (idêntico ao legado).
  const snap = { report_time: d.report_time, block_off: d.block_off, block_on: d.block_on, route: d.route, sectors: d.sectors, kind: c.kind };
  if (readExtra.length) snap.extra = readExtra.map(({ source: _s, ...f }) => f);
  return {
    report_time: d.report_time, block_off: d.block_off, block_on: d.block_on,
    sectors: d.sectors, flight_minutes: d.flight_minutes, route: d.route,
    kind: c.kind, nightStop: !!d.nightStop, source, snap, legs: d.legs || null,
    extra: extra.length ? extra : null,
  };
};

// Duty-rows da nova leitura (calendário/PDF) — sem o cálculo prospetivo, para a
// deteção automática de alterações (diffRoster). Reaproveita os mesmos mapeadores.
export const buildIncoming = ({ activities = [], nonflights = [] } = {}) => {
  const out = [];
  const byDate = new Map();   // dia → duty primária (2.º+ serviço do dia empilha em `extra`)
  const add = (d, kind) => {
    if (!d) return;
    d.kind = kind;
    const prev = byDate.get(d.duty_date);
    // A lei conta por SERVIÇO (210), não por dia: o 2.º+ FDP do mesmo dia funde como `extra`
    // na primária (em vez de virar uma 2.ª entrada com a mesma data, que o diff comparava mal).
    if (prev) { prev.extra = [...(prev.extra || []), svcFields(d)]; return; }
    byDate.set(d.duty_date, d);
    out.push(d);
  };
  for (const act of activities) add(dutyFromActivity(act), 'flight');
  for (const nf of nonflights) add(dutyFromNonFlight(nf), nf.kind);
  return out;
};
