// Tempo de voo acumulado (ORO.FTL.210 b) — 100/900/1000 h.
import { FLIGHT_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDays, sumCalendarYear, sumMonths } from './cumulativeCalculator';

export const computeFlightTime = (dayLog = {}, ref = new Date()) =>
  FLIGHT_WINDOWS.map((w) => {
    const done =
      w.kind === 'calendarYear' ? sumCalendarYear(dayLog, 'voo', ref) :
      w.kind === 'months12'     ? sumMonths(dayLog, 'voo', 12, ref) :
                                  sumWindowDays(dayLog, 'voo', w.days, ref);
    return { ...w, key: 'voo', done, ratio: w.limit ? done / w.limit : 0, over: done > w.limit };
  });
