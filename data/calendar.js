// Ligação à app de calendário do dispositivo (expo-calendar). I/O NATIVO + leitura por
// intervalo. O PARSING (classificação, mapeamento de eventos → serviços) vive em
// ./calendarParse (PURO, testável por golden). Só de leitura — nunca escreve/apaga eventos.
//
// Heurísticas pensadas para escalas easyJet e TAP — ver ./calendarParse.
import * as Calendar from 'expo-calendar/legacy'; // SDK 57: API antiga (getEventsAsync etc.) vive em /legacy; a nova é orientada a objetos
import { codesFor } from './rosterCodes';
import { classify, mapFlight, mapNonFlight, buildDuties, isAllDayNoTime, eventText, isoLocal, RE_ROUTE, RE_TIMES, vacationDatesFromEvent, sickDatesFromEvent } from './calendarParse';

// Verifica a permissão SEM pedir (não dispara o prompt do sistema). As leituras de fundo
// usam isto → nunca interrompem o utilizador. O prompt só acontece no botão "Ligar".
export async function ensureCalendarPermission() {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}

// Pede acesso ao calendário (DISPARA o prompt) e devolve o resultado completo ({ granted,
// canAskAgain }), para a UI decidir entre voltar a pedir ou encaminhar para as Definições.
export async function requestCalendarAccess() {
  return Calendar.requestCalendarPermissionsAsync();
}

// Lista os calendários do telemóvel (id/nome/conta/cor) para o utilizador ESCOLHER qual tem
// a escala. Requer permissão já concedida — não pede (o pedido foi no "Ligar").
export async function listCalendars() {
  if (!(await ensureCalendarPermission())) return [];
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals.map((c) => ({
    id: c.id, title: c.title || '(sem nome)',
    source: (c.source && (c.source.name || c.source.type)) || '', color: c.color || null,
    allowsModifications: !!c.allowsModifications,
  }));
}

// Eventos do calendário ESCOLHIDO no intervalo [start, end]. SÓ lê o calendário cujo id é
// `calendarId` (o que o utilizador ligou) — nunca todos. Sem calendário escolhido OU sem
// permissão → { ok:false } (a app trata como "não ligado" e mostra o "Ligar").
async function fetchEvents(start, end, calendarId = null) {
  if (!calendarId) return { ok: false, events: [] };
  if (!(await ensureCalendarPermission())) return { ok: false, events: [] };
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (!cals.some((c) => c.id === calendarId)) return { ok: false, events: [] }; // calendário já não existe
  const events = await Calendar.getEventsAsync([calendarId], start, end);
  events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  return { ok: true, events };
}

// Próximo voo + estado da permissão: { ok, flight }. `ok:false` = sem acesso ao calendário.
export async function getUpcomingFlight(company, calendarId = null) {
  const now = new Date();
  const { ok, events } = await fetchEvents(now, new Date(now.getTime() + 21 * 24 * 3600 * 1000), calendarId);
  if (!ok) return { ok: false, flight: null };
  const codes = codesFor(company);
  for (const ev of events) {
    const f = mapFlight(ev, codes);
    if (f) return { ok: true, flight: f };
  }
  return { ok: true, flight: null };
}

// Todos os voos no intervalo [start, end] (grelha mensal / lista do dia). { ok:false } sem permissão.
export async function getFlightsInRange(start, end, company, calendarId = null) {
  const { ok, events } = await fetchEvents(start, end, calendarId);
  if (!ok) return { ok: false, flights: [] };
  const codes = codesFor(company);
  const flights = [];
  for (const ev of events) {
    const f = mapFlight(ev, codes);
    if (f) flights.push(f);
  }
  return { ok: true, flights };
}

// Atividades no intervalo [start, end] (pernas de voo agrupadas por setores).
export async function getDutiesInRange(start, end, company, calendarId = null) {
  const { ok, events } = await fetchEvents(start, end, calendarId);
  if (!ok) return { ok: false, duties: [] };
  const codes = codesFor(company);
  const legs = events.map((ev) => mapFlight(ev, codes)).filter(Boolean);
  return { ok: true, duties: buildDuties(legs) };
}

// Duties SEM-VOO (standby/posicionamento/terra/formação) no intervalo [start, end].
// `vacations` = dias LVE/ANL/VAC no calendário (únicos, ordenados) — o Confirmar-import
// SUGERE-os como eventos de férias (o € do AE e o saldo 22 nascem de REGISTO deliberado;
// aqui só se deteta, gravar é decisão do utilizador na folha).
export async function getNonFlightInRange(start, end, company, calendarId = null) {
  const { ok, events } = await fetchEvents(start, end, calendarId);
  if (!ok) return { ok: false, items: [], vacations: [], sicks: [] };
  const codes = codesFor(company);
  const vacations = [...new Set(events.flatMap((ev) => vacationDatesFromEvent(ev, codes)))].sort();
  // Dias SICK → sugeridos como episódio de doença (Art. 48), a par das férias.
  const sicks = [...new Set(events.flatMap((ev) => sickDatesFromEvent(ev, codes)))].sort();
  return { ok: true, items: events.map((ev) => mapNonFlight(ev, codes)).filter(Boolean), vacations, sicks };
}

// Diagnóstico: TODOS os eventos no intervalo + como o parser os classifica. Para o utilizador
// ver o que o calendário tem e perceber porque um evento é (ou não) reconhecido. Um evento de
// dia-inteiro sem horas aparece como 'other' (IGNORADO) — mesmo que o título case um código.
export async function diagnoseEvents(start, end, company, calendarId = null) {
  const { ok, events } = await fetchEvents(start, end, calendarId);
  if (!ok) return { ok: false, total: 0, items: [] };
  const codes = codesFor(company);
  const items = events.map((ev) => {
    const text = eventText(ev);
    const allDayIgnored = isAllDayNoTime(ev, text);
    const r = text.match(RE_ROUTE);
    return {
      title: (ev.title || '').trim() || '(sem título)',
      dateISO: isoLocal(new Date(ev.startDate)),
      kind: allDayIgnored ? 'other' : classify(text, codes),   // all-day sem horas → ignorado
      allDay: !!ev.allDay,
      route: (r && r[1] !== r[2]) ? `${r[1]}-${r[2]}` : null,
      flightNo: codes.flightNo.test(text),
      times: RE_TIMES.test(text),
    };
  });
  return { ok: true, total: events.length, items };
}
