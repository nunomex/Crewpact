// Ligação à app de calendário do dispositivo (expo-calendar).
// Lê o próximo evento de voo da escala importada para o calendário e mapeia
// os campos para o cartão "Próximo voo" do ecrã Início.
import * as Calendar from 'expo-calendar';

// Pede permissão de leitura do calendário. Devolve true se concedida.
export async function ensureCalendarPermission() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

// ── Parsers heurísticos (ajustar ao formato da escala importada) ─────────────
const RE_ROUTE = /\b([A-Z]{3})\s*[-/→]\s*([A-Z]{3})\b/;       // LIS-FNC, LIS/FNC, LIS→FNC
const RE_AC    = /\b(A3\d{2}|A2\d{2}|B7\d{2})\b/;             // A320, A321, B738
const RE_REG   = /\b(CS-[A-Z]{3})\b/;                        // matrícula CS-EZW

const fmtTime = (d) => d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

// Lê os eventos do calendário entre agora e +N dias.
async function getEvents(days = 14) {
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
    const text = `${ev.title || ''} ${ev.notes || ''} ${ev.location || ''}`;
    const route = text.match(RE_ROUTE);
    if (!route) continue; // ignora eventos que não pareçam um voo
    const start = new Date(ev.startDate);
    const finish = new Date(ev.endDate);
    const ac = text.match(RE_AC);
    const reg = text.match(RE_REG);
    return {
      date: fmtDate(start),
      report: fmtTime(new Date(start.getTime() - 60 * 60 * 1000)), // apresentação ≈ 1 h antes
      depTime: fmtTime(start),
      depAirport: route[1],
      arrAirport: route[2],
      arrTime: fmtTime(finish),
      aircraft: [ac && ac[1], reg && reg[1]].filter(Boolean).join(' · ') || '—',
    };
  }
  return null;
}
