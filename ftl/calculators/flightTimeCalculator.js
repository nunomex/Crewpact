// Tempo de voo acumulado (ORO.FTL.210 b) — 100/900/1000 h. Em minutos inteiros (ver cumulativeCalculator).
import { FLIGHT_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDaysMin, sumCalendarYearMin, sumMonthsMin, windowResult, nextMin } from './cumulativeCalculator';
import { isoDay } from '../utils/time';

// O voo de HOJE pode passar a meia-noite (bloco 8b): a parte de amanhã está também nos períodos que acabam amanhã → o pior
// dos dois (revisão do 8b, E1). O ano civil fica o de hoje (o Início mostra o ano em curso).
const nextDay = (ref) => { const t = new Date(ref); t.setDate(t.getDate() + 1); return t; };
export const computeFlightTime = (dayLog = {}, ref = new Date()) => {
  const spill = nextMin(dayLog[isoDay(ref)], 'voo') > 0;
  const at = (w, r) => (w.kind === 'months12' ? sumMonthsMin(dayLog, 'voo', 12, r) : sumWindowDaysMin(dayLog, 'voo', w.days, r));
  return FLIGHT_WINDOWS.map((w) => {
    const doneMin = w.kind === 'calendarYear' ? sumCalendarYearMin(dayLog, 'voo', ref)
      : Math.max(at(w, ref), spill ? at(w, nextDay(ref)) : 0);
    return windowResult(w, 'voo', doneMin);
  });
};
