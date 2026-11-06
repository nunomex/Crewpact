// Tempo de voo acumulado (ORO.FTL.210 b) — 100/900/1000 h. Em minutos inteiros (ver cumulativeCalculator).
import { FLIGHT_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDaysMin, sumCalendarYearMin, sumMonthsMin, windowResult } from './cumulativeCalculator';

export const computeFlightTime = (dayLog = {}, ref = new Date()) =>
  FLIGHT_WINDOWS.map((w) => {
    const doneMin =
      w.kind === 'calendarYear' ? sumCalendarYearMin(dayLog, 'voo', ref) :
      w.kind === 'months12'     ? sumMonthsMin(dayLog, 'voo', 12, ref) :
                                  sumWindowDaysMin(dayLog, 'voo', w.days, ref);
    return windowResult(w, 'voo', doneMin);
  });
