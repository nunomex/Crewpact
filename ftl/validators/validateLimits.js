// Validação dos limites cumulativos (ORO.FTL.210) — serviço + voo.
import { DUTY_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDays } from '../calculators/cumulativeCalculator';
import { computeFlightTime } from '../calculators/flightTimeCalculator';

export const computeDutyTime = (dayLog = {}, ref = new Date()) =>
  DUTY_WINDOWS.map((w) => {
    const done = sumWindowDays(dayLog, 'servico', w.days, ref);
    return { ...w, key: 'servico', done, ratio: w.limit ? done / w.limit : 0, over: done > w.limit };
  });

export const validateLimits = (dayLog = {}, ref = new Date()) => {
  const duty = computeDutyTime(dayLog, ref);
  const flight = computeFlightTime(dayLog, ref);
  const issues = [...duty, ...flight]
    .filter((w) => w.over)
    .map((w) => ({ rule: 'ORO.FTL.210', window: w.id, key: w.key, done: w.done, limit: w.limit }));
  return { duty, flight, legal: issues.length === 0, issues };
};
