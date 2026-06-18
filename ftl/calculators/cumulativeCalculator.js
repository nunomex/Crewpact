// Acumulação de horas a partir do store FTL (dayLog), por janelas (ORO.FTL.210).
// dayLog: { 'YYYY-MM-DD': { voo?: number, servico?: number, ... } } — horas decimais.
import { isoDay } from '../utils/time';

// Soma a `key` nos últimos `days` dias (inclui hoje), terminando em `ref`.
export const sumWindowDays = (dayLog, key, days, ref = new Date()) => {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(ref); d.setDate(d.getDate() - i);
    const e = dayLog[isoDay(d)];
    if (e && typeof e[key] === 'number') sum += e[key];
  }
  return sum;
};

// Soma a `key` no ano civil de `ref`.
export const sumCalendarYear = (dayLog, key, ref = new Date()) => {
  const y = String(ref.getFullYear());
  let sum = 0;
  for (const [date, e] of Object.entries(dayLog)) {
    if (e && typeof e[key] === 'number' && date.slice(0, 4) === y) sum += e[key];
  }
  return sum;
};

// Soma a `key` nos últimos `months` meses (da mesma data há N meses até `ref`).
export const sumMonths = (dayLog, key, months, ref = new Date()) => {
  const start = new Date(ref); start.setMonth(start.getMonth() - months);
  let sum = 0;
  for (const [date, e] of Object.entries(dayLog)) {
    if (!e || typeof e[key] !== 'number') continue;
    const d = new Date(date + 'T00:00:00');
    if (d > start && d <= ref) sum += e[key];
  }
  return sum;
};
