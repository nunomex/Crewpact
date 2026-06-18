// Ligação à app de calendário do dispositivo (expo-calendar).
// Lê os eventos de voo da escala importada para o calendário e mapeia os campos
// para o cartão "Próximo voo" e para a grelha mensal (ecrã Calendário). Só de
// leitura — nunca escreve nem apaga eventos do calendário real.
//
// Heurísticas pensadas para escalas easyJet e TAP (ajustar se o teu feed diferir):
//   easyJet: "EZY1234 LIS-FNC 06:40-08:15" / "U2 LIS/FNC 0640 0815"
//   TAP:     "TP1923 LIS-OPO 07:10-08:05"  / "TAP 234 LIS/MAD"
import * as Calendar from 'expo-calendar';

export async function ensureCalendarPermission() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

// ── Parsers ──────────────────────────────────────────────────────────────────
const RE_ROUTE  = /\b([A-Z]{3})\s*[-/→]\s*([A-Z]{3})\b/;                 // LIS-FNC, LIS/FNC, LIS→FNC
const RE_FLIGHT = /\b(?:EZY|EJU|U2|TP|TAP)\s?\d{2,4}[A-Z]?\b/i;          // nº de voo easyJet (EZY/EJU/U2) + TAP (TP/TAP)
const RE_TIMES  = /\b(\d{1,2})[:h.]?(\d{2})\s*[-–—/ ]\s*(\d{1,2})[:h.]?(\d{2})\b/; // 0640-0815 / 06:40 08:15
const RE_AC     = /\b(A3\d{2}|A2\d{2}|A\d{2}N|B7\d{2})\b/;               // A320, A321, A20N/A21N (neo), A330, B738
const RE_REG    = /\b(CS-[A-Z]{3})\b/;                                   // matrícula CS-EZW (easyJet) / CS-TVA (TAP)

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// Data local 'YYYY-MM-DD' (componentes locais, não UTC) — chave por dia.
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (d) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
// Padrões extra: standby, bloco em Zulu e base (das notas da AIMS eCrew).
const RE_STANDBY = /\b(L?SBY|STBY|STANDBY|RESERVE|RESERVA)\b/i;      // LSBY / SBY / STBY / reserva
const RE_BLOCKZ  = /\((\d{2})(\d{2})Z\s*[-–—]\s*(\d{2})(\d{2})Z\)/;  // (1350Z-1615Z)
const RE_BASE    = /Local Base\s*\(([A-Z]{3})\)/i;                  // "All times in Local Base (LIS)"

// Tipo do evento: 'flight' (perna) | 'standby' | 'other'. O standby tem
// prioridade — um "LSBY LIS-LIS" tem rota igual e não pode contar como voo.
function classify(text) {
  if (RE_STANDBY.test(text)) return 'standby';
  if (RE_FLIGHT.test(text)) return 'flight';
  const r = text.match(RE_ROUTE);
  if (r && r[1] !== r[2]) return 'flight'; // rota com aeroportos diferentes
  return 'other';
}

// Eventos do calendário no intervalo [start, end].
async function fetchEvents(start, end) {
  const ok = await ensureCalendarPermission();
  if (!ok) return { ok: false, events: [] };
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (!cals.length) return { ok: true, events: [] };
  const events = await Calendar.getEventsAsync(cals.map(c => c.id), start, end);
  events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return { ok: true, events };
}

// Mapeia um evento de calendário para uma perna de voo (ou null se não for voo).
function mapFlight(ev) {
  const text = `${ev.title || ''} ${ev.location || ''} ${ev.notes || ''}`;
  if (classify(text) !== 'flight') return null; // exclui standby/outros (corrige LSBY tratado como voo)

  const start = new Date(ev.startDate);
  const finish = new Date(ev.endDate);
  const route = text.match(RE_ROUTE);
  const times = text.match(RE_TIMES);
  const ac = text.match(RE_AC);
  const reg = text.match(RE_REG);
  const base = (text.match(RE_BASE) || [])[1] || null;

  // Horas: preferir as do título; caso contrário usar início/fim do evento.
  const depTime = times ? `${pad(+times[1])}:${times[2]}` : hhmm(start);
  const arrTime = times ? `${pad(+times[3])}:${times[4]}` : hhmm(finish);
  // Apresentação ≈ 1 h antes da partida (ajustável conforme a operação).
  const report = new Date(start.getTime() - 60 * 60 * 1000);

  return {
    kind: 'flight',
    dateISO: isoLocal(start),
    date: fmtDate(start),
    report: hhmm(report),
    depTime,
    arrTime,
    depAirport: route ? route[1] : '—',
    arrAirport: route ? route[2] : '—',
    aircraft: [ac && ac[1], reg && reg[1]].filter(Boolean).join(' · ') || '—',
    startDate: start,    // instante absoluto (para agrupar setores)
    endDate: finish,
    base,                // base das notas, p.ex. 'LIS' (ou null)
  };
}

// Mapeia um evento de standby/reserva (ou null se não for standby).
function mapStandby(ev) {
  const text = `${ev.title || ''} ${ev.location || ''} ${ev.notes || ''}`;
  if (classify(text) !== 'standby') return null;
  const start = new Date(ev.startDate);
  const finish = new Date(ev.endDate);
  return {
    kind: 'standby',
    dateISO: isoLocal(start),
    date: fmtDate(start),
    start: hhmm(start),
    end: hhmm(finish),
    startDate: start,
    endDate: finish,
  };
}

// Devolve o próximo voo (ou null) mapeado para os campos do cartão "Próximo voo".
export async function getUpcomingFlight() {
  const now = new Date();
  const { ok, events } = await fetchEvents(now, new Date(now.getTime() + 21 * 24 * 3600 * 1000));
  if (!ok) return null;
  for (const ev of events) {
    const f = mapFlight(ev);
    if (f) return f;
  }
  return null;
}

// Devolve todos os voos no intervalo [start, end] (para a grelha mensal e a lista
// do dia). { ok:false } quando não há permissão de calendário.
export async function getFlightsInRange(start, end) {
  const { ok, events } = await fetchEvents(start, end);
  if (!ok) return { ok: false, flights: [] };
  const flights = [];
  for (const ev of events) {
    const f = mapFlight(ev);
    if (f) flights.push(f);
  }
  return { ok: true, flights };
}

// ── Atividades (agrupamento de setores) ──────────────────────────────────────
// Pernas seguidas com pouco intervalo entre si pertencem à mesma atividade; um
// repouso (≥ 10–12 h) separa atividades, por isso um limiar de 6 h distingue com
// folga turnarounds e split-duty de um repouso real. Ajustável.
const DUTY_GAP_MS = 6 * 3600 * 1000;
const DEBRIEF_MIN = 30; // debrief após os últimos calços → fim de serviço (release)

// Fecha uma atividade: report (início da 1ª perna), release (fim da última +
// debrief), nº de setores, aeroportos e fim em base.
function finishDuty(d) {
  const legs = d.legs;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const release = new Date(last.endDate.getTime() + DEBRIEF_MIN * 60 * 1000);
  const base = legs.map(l => l.base).find(Boolean) || null;
  return {
    dateISO: first.dateISO,
    report: hhmm(first.startDate),   // = início do 1º evento (validar: report vs STD)
    reportDate: first.startDate,
    release: hhmm(release),
    releaseDate: release,
    sectors: legs.length,
    startAirport: first.depAirport,
    endAirport: last.arrAirport,
    base,
    endInBase: base ? last.arrAirport === base : null,
    legs,
  };
}

// Agrupa pernas (objetos de mapFlight, com startDate/endDate) em atividades.
export function buildDuties(legs) {
  const sorted = legs.filter(Boolean).sort((a, b) => a.startDate - b.startDate);
  const duties = [];
  let cur = null;
  for (const leg of sorted) {
    if (cur && leg.startDate - cur._lastEnd <= DUTY_GAP_MS) {
      cur.legs.push(leg);
      cur._lastEnd = leg.endDate;
    } else {
      if (cur) duties.push(finishDuty(cur));
      cur = { legs: [leg], _lastEnd: leg.endDate };
    }
  }
  if (cur) duties.push(finishDuty(cur));
  return duties;
}

// Atividades no intervalo [start, end] (pernas de voo agrupadas por setores).
export async function getDutiesInRange(start, end) {
  const { ok, events } = await fetchEvents(start, end);
  if (!ok) return { ok: false, duties: [] };
  const legs = events.map(mapFlight).filter(Boolean);
  return { ok: true, duties: buildDuties(legs) };
}

// Standby/reserva no intervalo [start, end].
export async function getStandbyInRange(start, end) {
  const { ok, events } = await fetchEvents(start, end);
  if (!ok) return { ok: false, standby: [] };
  const standby = events.map(mapStandby).filter(Boolean);
  return { ok: true, standby };
}
