// Ligação à app de calendário do dispositivo (expo-calendar).
// Lê o próximo evento de voo da escala importada para o calendário e mapeia
// os campos para o cartão "Próximo voo" do ecrã Início.
//
// Heurísticas pensadas para escalas easyJet (ajustar se o teu feed for diferente):
//   título/notas tipo "EZY1234 LIS-FNC 06:40-08:15" ou "U2 LIS/FNC 0640 0815".
import * as Calendar from 'expo-calendar';

export async function ensureCalendarPermission() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

// ── Parsers ──────────────────────────────────────────────────────────────────
const RE_ROUTE  = /\b([A-Z]{3})\s*[-/→]\s*([A-Z]{3})\b/;                 // LIS-FNC, LIS/FNC, LIS→FNC
const RE_FLIGHT = /\b(?:EZY|EJU|U2)\s?\d{2,4}[A-Z]?\b/i;                 // nº de voo easyJet
const RE_TIMES  = /\b(\d{1,2})[:h.]?(\d{2})\s*[-–—/ ]\s*(\d{1,2})[:h.]?(\d{2})\b/; // 0640-0815 / 06:40 08:15
const RE_AC     = /\b(A3\d{2}|A2\d{2}|B7\d{2})\b/;                       // A320, A321, B738
const RE_REG    = /\b(CS-[A-Z]{3})\b/;                                   // matrícula CS-EZW

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDate = (d) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
const isFlight = (text) => RE_ROUTE.test(text) || RE_FLIGHT.test(text);

async function getEvents(days = 21) {
  const ok = await ensureCalendarPermission();
  if (!ok) return { ok: false, events: [] };
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (!cals.length) return { ok: true, events: [] };
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 3600 * 1000);
  const events = await Calendar.getEventsAsync(cals.map(c => c.id), now, end);
  events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return { ok: true, events };
}

// Devolve o próximo voo (ou null) mapeado para os campos do cartão.
export async function getUpcomingFlight() {
  const { ok, events } = await getEvents();
  if (!ok) return null;

  for (const ev of events) {
    const text = `${ev.title || ''} ${ev.location || ''} ${ev.notes || ''}`;
    if (!isFlight(text)) continue;

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
      date: fmtDate(start),
      report: hhmm(report),
      depTime,
      arrTime,
      depAirport: route ? route[1] : '—',
      arrAirport: route ? route[2] : '—',
      aircraft: [ac && ac[1], reg && reg[1]].filter(Boolean).join(' · ') || '—',
    };
  }
  return null;
}
