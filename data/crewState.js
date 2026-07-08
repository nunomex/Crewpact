// ════════════════════════════════════════════════════════════════════════════
// crewState — o MOTOR da Living Interface (a promessa do doc §2)
// ════════════════════════════════════════════════════════════════════════════
// Função PURA e golden-testável (npm run test:crewstate): decide o ESTADO do Início
// a partir dos dados do dia — sem rede, sem React, sem relógio próprio (`now`/`hour`
// injetáveis). Os gatilhos deixam de viver inline no ecrã e passam a ser auditáveis
// como os motores FTL/AE: cada regra abaixo tem asserção no golden.
//
// Estados devolvidos (11 vivos; os restantes entram AQUI quando nascerem):
//   'setup'     — sem calendário ligado e nada para mostrar
//   'disrupcao' — desvio no NOSSO voo ao vivo OU inbound atrasado
//   'hoje'      — o próximo serviço é HOJE (pré-report / em serviço / em voo)
//   'pernoita'  — o dia de hoje FECHOU fora da base (nightStop) — noturno
//   'posvoo'    — o dia de hoje FECHOU na base (balanço) — até à meia-noite
//   'doenca'    — evento sickDays HOJE (a app baixa a voz; episódio dia N)
//   'vespera'   — report amanhã a ≤14 h, já pela noite (≥18h) — noturno
//   'ferias'    — evento vacDays HOJE (afastamento máximo)
//   'fecho'     — últimos 3 dias do mês civil, com AE (o mês fecha-se a saber o total)
//   'folga'     — o resto (com ou sem serviço futuro)
//
// PRECEDÊNCIA (prioridades do doc §2): setup > disrupção > hoje > pernoita > pós-voo
// (75) > DOENÇA > véspera (65) > FÉRIAS > FECHO (50) > folga. A pernoita decide antes
// do pós-voo por ser o MESMO gatilho mais específico (fechado + fora da base); a doença
// cala a véspera (não preparas um report doente), mas a véspera ganha às férias (o
// último dia de férias com report cedo amanhã ainda merece o "dorme").

import { nightStopStation } from './hotels';

// Fim de UM serviço (instante ms). Regra ESPELHO do dutyToFlight do Início:
// exige report_time; com block_on ANTERIOR ao report o serviço vira a noite (fim no
// dia seguinte); SEM block_on o serviço "dura" até ao fim do dia (23:59) — ou seja,
// nunca conta como terminado durante o próprio dia (standby aberto não fecha o dia).
export const dutyEndMs = (iso, d) => {
  if (!d || d.deleted || !d.report_time) return null;
  const at = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    if (!m) return null;
    const dt = new Date(iso + 'T00:00:00');
    dt.setHours(+m[1], +m[2], 0, 0);
    return dt;
  };
  const report = at(d.report_time);
  if (!report) return null;
  if (d.block_on) {
    const e = at(d.block_on);
    if (!e) return null;
    if (e.getTime() <= report.getTime()) e.setDate(e.getDate() + 1);   // vira a noite
    return e.getTime();
  }
  const eod = new Date(iso + 'T00:00:00'); eod.setHours(23, 59, 0, 0);
  return eod.getTime();
};

// O dia FECHOU? Multi-serviço (a lei conta períodos, não dias): só fecha quando TODOS
// os serviços (primário + extra) terminaram — senão "Fechado ✓" era mentira de segurança.
export const dayClosed = (iso, duty, now) => {
  if (!duty || duty.deleted || !duty.report_time) return false;
  const services = [duty, ...(Array.isArray(duty.extra) ? duty.extra : [])];
  const ends = services.map((sv) => dutyEndMs(iso, sv));
  return ends.length > 0 && ends.every((e) => e != null && e < now);
};

// Dia anterior de um ISO (UTC — sem fusos, como o aeEvents).
const prevISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
};

// Dia N do EPISÓDIO de doença (dias consecutivos de sickDays, Art. 48): 0 = hoje não
// está de baixa; 1 = primeiro dia do episódio; anda para trás enquanto houver dia anterior.
export const sickEpisodeDay = (events = [], todayISO = '') => {
  const sick = new Set((events || []).filter((e) => e && e.type === 'sickDays' && String(e.date).length === 10).map((e) => e.date));
  if (!sick.has(todayISO)) return 0;
  let n = 1, d = prevISO(todayISO);
  while (sick.has(d)) { n++; d = prevISO(d); }
  return n;
};

// crewState(inputs) → { state, night, ended, closeMulti, nsStation, sickDay }
//   now: ms · hour: hora local (0-23) · todayISO: 'YYYY-MM-DD'
//   flight: próximo serviço efetivo ({ dateISO } chega) ou null · cdMin: min até report/partida
//   deviated: desvio no live do NOSSO voo · inboundLate: rotação atrasada
//   calendarConnected: calendário ligado E legível · todayDuty: duties[todayISO] · base: IATA
//   events: aeEvents (vacDays/sickDays por-dia) · hasAe: perfil com AE (o fecho é sobre €)
export function crewState({
  now = 0, hour = 12, todayISO = '',
  flight = null, cdMin = null,
  deviated = false, inboundLate = false,
  calendarConnected = false,
  todayDuty = null, base = null,
  events = [], hasAe = false,
} = {}) {
  const isToday = !!(flight && flight.dateISO === todayISO);
  const setupNeeded = !flight && !calendarConnected;
  const disrupted = !!(flight && (deviated || inboundLate));
  const ended = dayClosed(todayISO, todayDuty, now);
  const closeMulti = !!(ended && Array.isArray(todayDuty.extra) && todayDuty.extra.length);
  const nsStation = ended ? (nightStopStation(todayDuty, base) || null) : null;
  const isVespera = !!(flight && !isToday && cdMin != null && cdMin > 0 && cdMin <= 14 * 60 && hour >= 18);
  const sickDay = sickEpisodeDay(events, todayISO);
  const vacToday = (events || []).some((e) => e && e.type === 'vacDays' && e.date === todayISO);
  // Fecho do mês: últimos 3 dias do mês civil (só faz sentido com AE — é sobre o total €).
  const monthClosing = hasAe && !!todayISO && (() => {
    const [y, m, d] = todayISO.split('-').map(Number);
    return new Date(y, m, 0).getDate() - d <= 2;
  })();

  const state = setupNeeded ? 'setup'
    : disrupted ? 'disrupcao'
    : (flight && isToday) ? 'hoje'
    : (ended && nsStation) ? 'pernoita'
    : ended ? 'posvoo'
    : sickDay > 0 ? 'doenca'
    : isVespera ? 'vespera'
    : vacToday ? 'ferias'
    : monthClosing ? 'fecho'
    : 'folga';

  return { state, night: state === 'vespera' || state === 'pernoita', ended, closeMulti, nsStation, sickDay };
}
