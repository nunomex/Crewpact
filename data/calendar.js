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
const isFlight = (text) => RE_ROUTE.test(text) || RE_FLIGHT.test(text);

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

// Mapeia um evento de calendário para um voo (ou null se não for voo).
function mapFlight(ev) {
  const text = `${ev.title || ''} ${ev.location || ''} ${ev.notes || ''}`;
  if (!isFlight(text)) return null;

  const start = new Date(ev.startDate);
  const finish = new Date(ev.endDate);
  const route = text.match(RE_ROUTE);
  const times = text.match(RE_TIMES);
  const ac = text.match(RE_AC);
  const reg = text.match(RE_REG);

  // Horas: preferir as do título; caso contrário usar início/fim do evento.
  const depTime = times ? `${pad(+times[1])}:${times[2]}` : hhmm(start);
  const arrTime = times ? `${pad(+times[3])}:${times[4]}` : hhmm(finish);
  // Apresentação ≈ 1 h antes da partida (ajustável conforme a operação).
  const report = new Date(start.getTime() - 60 * 60 * 1000);

  return {
    dateISO: isoLocal(start),
    date: fmtDate(start),
    report: hhmm(report),
    depTime,
    arrTime,
    depAirport: route ? route[1] : '—',
    arrAirport: route ? route[2] : '—',
    aircraft: [ac && ac[1], reg && reg[1]].filter(Boolean).join(' · ') || '—',
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
