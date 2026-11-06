// Acumulação de horas a partir do store FTL (dayLog), por janelas (ORO.FTL.210).
// dayLog: { 'YYYY-MM-DD': { servicoMin?, vooMin?, servico?, voo?, ... } }. Soma-se em MINUTOS INTEIROS (auditoria
// A-148/A-172: arredondar cada dia a 0,1 h antes de somar escondia até ±3 min por serviço — 20 × 9:32 davam 190,0 h
// em vez de 190:40). As entradas antigas, só com horas decimais, convertem-se ao minuto.
import { isoDay } from '../utils/time';

// Minutos de `key` ('servico' | 'voo') numa entrada do dayLog.
export const entryMin = (e, key) => {
  if (!e) return 0;
  const m = e[key + 'Min'];
  if (typeof m === 'number' && Number.isFinite(m)) return m;
  const h = e[key];
  return (typeof h === 'number' && Number.isFinite(h)) ? Math.round(h * 60) : 0;
};

// Soma (min) da `key` nos últimos `days` dias (inclui hoje), terminando em `ref`.
export const sumWindowDaysMin = (dayLog, key, days, ref = new Date()) => {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(ref); d.setDate(d.getDate() - i);
    sum += entryMin(dayLog[isoDay(d)], key);
  }
  return sum;
};

// Soma (min) da `key` no ano civil de `ref`.
export const sumCalendarYearMin = (dayLog, key, ref = new Date()) => {
  const y = String(ref.getFullYear());
  let sum = 0;
  for (const [date, e] of Object.entries(dayLog)) if (date.slice(0, 4) === y) sum += entryMin(e, key);
  return sum;
};

// Soma (min) da `key` nos últimos `months` meses (da mesma data há N meses até `ref`).
export const sumMonthsMin = (dayLog, key, months, ref = new Date()) => {
  const start = new Date(ref); start.setMonth(start.getMonth() - months);
  let sum = 0;
  for (const [date, e] of Object.entries(dayLog)) {
    const d = new Date(date + 'T00:00:00');
    if (d > start && d <= ref) sum += entryMin(e, key);
  }
  return sum;
};

// Compat (horas decimais exatas, sem arredondar): quem só precisa do número.
export const sumWindowDays = (dayLog, key, days, ref = new Date()) => sumWindowDaysMin(dayLog, key, days, ref) / 60;
export const sumCalendarYear = (dayLog, key, ref = new Date()) => sumCalendarYearMin(dayLog, key, ref) / 60;
export const sumMonths = (dayLog, key, months, ref = new Date()) => sumMonthsMin(dayLog, key, months, ref) / 60;

// Uma janela pronta para a UI: feito/limite em minutos inteiros. `over` = passa o limite (> limite, não ≥);
// `headroomMin` = o que falta, nunca negativo e nunca arredondado para cima; `overMin` = o excesso.
export const windowResult = (w, key, doneMin) => {
  const limitMin = Math.round(w.limit * 60);
  return {
    ...w, key, doneMin, done: doneMin / 60, limitMin,
    ratio: limitMin ? doneMin / limitMin : 0,
    over: doneMin > limitMin,
    headroomMin: Math.max(0, limitMin - doneMin),
    overMin: Math.max(0, doneMin - limitMin),
  };
};
