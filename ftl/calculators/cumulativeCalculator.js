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

// Parte de `key` que cai DEPOIS da meia-noite (o dia local seguinte, ORO.FTL.105(15)) — `servicoNextMin`/`vooNextMin`,
// gravados pelo motor quando o serviço passa a meia-noite (bloco 8b, A-173). Nunca mais do que a entrada inteira.
export const nextMin = (e, key) => {
  if (!e) return 0;
  const n = e[key + 'NextMin'];
  return (typeof n === 'number' && Number.isFinite(n) && n > 0) ? Math.min(n, entryMin(e, key)) : 0;
};
const prevIso = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1); return isoDay(d); };
const nextIso = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + 1); return isoDay(d); };

// Minutos de `key` que pertencem ao DIA LOCAL `iso`: a entrada do dia sem a parte depois da meia-noite, mais a parte depois
// da meia-noite do serviço da véspera. É isto que os períodos de N dias somam (o total de todos os dias não muda).
export const dayMin = (dayLog, iso, key) => entryMin(dayLog[iso], key) - nextMin(dayLog[iso], key) + nextMin(dayLog[prevIso(iso)], key);

// Soma (min) da `key` entre as datas ISO `from` e `to` (inclusive), por dias locais — percorre só as entradas.
const sumRangeMin = (dayLog, key, from, to) => {
  let sum = 0;
  for (const [date, e] of Object.entries(dayLog)) {
    if (date >= from && date <= to) sum += entryMin(e, key) - (date === to ? nextMin(e, key) : 0);
    else if (nextIso(date) === from) sum += nextMin(e, key);
  }
  return sum;
};

// Soma (min) da `key` nos últimos `days` dias (inclui hoje), terminando em `ref`.
export const sumWindowDaysMin = (dayLog, key, days, ref = new Date()) => {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(ref); d.setDate(d.getDate() - i);
    sum += dayMin(dayLog, isoDay(d), key);
  }
  return sum;
};

// Soma (min) da `key` no ano civil de `ref`.
export const sumCalendarYearMin = (dayLog, key, ref = new Date()) => {
  const y = ref.getFullYear();
  return sumRangeMin(dayLog, key, `${y}-01-01`, `${y}-12-31`);
};

// Soma (min) da `key` nos últimos `months` meses (da mesma data há N meses até `ref`).
export const sumMonthsMin = (dayLog, key, months, ref = new Date()) => {
  const start = new Date(ref); start.setMonth(start.getMonth() - months); start.setDate(start.getDate() + 1);
  return sumRangeMin(dayLog, key, isoDay(start), isoDay(ref));
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
