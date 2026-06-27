// Hora Zulu (UTC) a partir da hora LOCAL DO AEROPORTO — para duties MANUAIS, que não trazem
// a Zulu autoritativa do calendário (instante absoluto) nem da API (*_time_utc). O fuso de
// cada aeroporto vem das COORDENADAS que já temos (tz-lookup), e o desvio UTC na data certa
// (com horário de verão) vem do Intl. Suposição honesta do manual: as horas são LOCAIS do
// aeroporto (off no fuso da origem, on no fuso do destino) — a convenção normal das escalas.
//
// Se o motor JS não suportar Intl com timeZone (Hermes antigo), `INTL_TZ_OK` fica false e os
// ecrãs caem no fallback do fuso do DISPOSITIVO (toZulu) — sem crashar.
import tzlookup from 'tz-lookup';
import { airportCoord } from './airports';

// Auto-deteção do suporte a Intl/timeZone. 00:00Z de julho em Londres = 01:00 (UTC+1, DST).
export const INTL_TZ_OK = (() => {
  try {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' })
      .format(new Date('2021-07-01T00:00:00Z'));
    return /01/.test(s);
  } catch { return false; }
})();

// Desvio (min) de um fuso IANA num dado instante UTC.
const tzOffsetMin = (tz, atUTC) => {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = {}; for (const x of dtf.formatToParts(atUTC)) p[x.type] = x.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUTC - atUTC.getTime()) / 60000);
};

// Fuso IANA de um aeroporto (IATA/ICAO) pelas coordenadas. null se desconhecido.
export const airportTz = (code) => {
  const co = code ? airportCoord(code) : null;
  if (!co) return null;
  try { return tzlookup(co.lat, co.lon) || null; } catch { return null; }
};

// Hora LOCAL "HH:MM" no aeroporto `code`, no dia `dateISO` → Zulu "HH:MM".
// null quando não dá (sem Intl, aeroporto desconhecido, ou hora inválida) → o chamador
// faz fallback (toZulu do dispositivo).
export const airportZulu = (dateISO, hhmm, code) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!INTL_TZ_OK || !dateISO || !m) return null;
  const tz = airportTz(code);
  if (!tz) return null;
  const [Y, Mo, D] = dateISO.split('-').map(Number);
  const wall = Date.UTC(Y, Mo - 1, D, +m[1], +m[2]);          // hora-de-parede tratada como UTC, ajusta-se
  let off = tzOffsetMin(tz, new Date(wall)), utc = wall - off * 60000;
  off = tzOffsetMin(tz, new Date(utc)); utc = wall - off * 60000;   // refina na fronteira do DST
  const d = new Date(utc);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// Fallback: hora local DO DISPOSITIVO → Zulu. Espelha appContext.toZulu, mas mantém este
// módulo PURO (sem React/RN) para os testes golden o poderem carregar.
const deviceZulu = (dateISO, hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!dateISO || !m) return null;
  const d = new Date(`${dateISO}T00:00:00`); d.setHours(+m[1], +m[2], 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// Zulu de um SETOR por PRIORIDADE (helper único, usado em todo o lado p/ não divergir):
//   1) AUTORITATIVA (offZ/onZ do calendário/API)  2) MANUAL → fuso do AEROPORTO (origem p/ off,
//   destino p/ on)  3) último recurso → fuso do DISPOSITIVO. `which` = 'off' | 'on'.
export const legZulu = (dateISO, leg, which) => {
  if (!leg) return null;
  if (leg[which + 'Z']) return leg[which + 'Z'];
  const ap = which === 'off' ? leg.dep : leg.arr;
  return airportZulu(dateISO, leg[which], ap) || deviceZulu(dateISO, leg[which]);
};
