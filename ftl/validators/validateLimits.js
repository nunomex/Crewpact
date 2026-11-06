// Validação dos limites cumulativos (ORO.FTL.210) — serviço + voo, em minutos inteiros.
import { DUTY_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDaysMin, windowResult } from '../calculators/cumulativeCalculator';
import { computeFlightTime } from '../calculators/flightTimeCalculator';

export const computeDutyTime = (dayLog = {}, ref = new Date()) =>
  DUTY_WINDOWS.map((w) => windowResult(w, 'servico', sumWindowDaysMin(dayLog, 'servico', w.days, ref)));

export const validateLimits = (dayLog = {}, ref = new Date()) => {
  const duty = computeDutyTime(dayLog, ref);
  const flight = computeFlightTime(dayLog, ref);
  const issues = [...duty, ...flight]
    .filter((w) => w.over)
    .map((w) => ({ rule: 'ORO.FTL.210', window: w.id, key: w.key, done: w.done, doneMin: w.doneMin, limit: w.limit, overMin: w.overMin }));
  return { duty, flight, legal: issues.length === 0, issues };
};
