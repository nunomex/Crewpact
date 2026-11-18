// Tempo de voo acumulado (ORO.FTL.210 b) — 100/900/1000 h. Em minutos inteiros (ver cumulativeCalculator).
import { FLIGHT_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDaysMin, sumCalendarYearMin, sumMonthsMin, windowResult, nextMin, maxExtraIn, maxExtraRange, uncFields } from './cumulativeCalculator';
import { isoDay } from '../utils/time';

// O voo de HOJE pode passar a meia-noite (bloco 8b): a parte de amanhã está também nos períodos que acabam amanhã → o pior
// dos dois (revisão do 8b, E1). O ano civil fica o de hoje (o Início mostra o ano em curso).
const nextDay = (ref) => { const t = new Date(ref); t.setDate(t.getDate() + 1); return t; };
export const computeFlightTime = (dayLog = {}, ref = new Date()) => {
  const spill = nextMin(dayLog[isoDay(ref)], 'voo') > 0;
  const unkSpill = !!(dayLog[isoDay(ref)] && dayLog[isoDay(ref)].unkSpill);
  const at = (w, r) => (w.kind === 'months12' ? sumMonthsMin(dayLog, 'voo', 12, r) : sumWindowDaysMin(dayLog, 'voo', w.days, r));
  return FLIGHT_WINDOWS.map((w) => {
    const year = w.kind === 'calendarYear';
    const doneMin = year ? sumCalendarYearMin(dayLog, 'voo', ref)
      : Math.max(at(w, ref), spill ? at(w, nextDay(ref)) : 0);
    const out = windowResult(w, 'voo', doneMin);
    if (out.over) return out;
    // O tempo de voo que a escala não diz (um código que a app não conhece, um PSV sem horas — `vooMaxMin`): se só o máximo
    // possível passa o limite, incerto (1.ª revisão independente, achado 10: a app dizia "dentro"). Vê-se também o período que
    // acaba AMANHÃ quando o voo ou o código de hoje passam a meia-noite (2.ª revisão, achado 6 — como o serviço).
    const extra = (r) => {
      if (year) { const y = r.getFullYear(); return maxExtraRange(dayLog, `${y}-01-01`, `${y}-12-31`, 'voo'); }
      if (w.kind === 'months12') { const st = new Date(r); st.setMonth(st.getMonth() - 12); st.setDate(st.getDate() + 1); return maxExtraRange(dayLog, isoDay(st), isoDay(r), 'voo'); }
      return maxExtraIn(dayLog, w.days, r, 'voo');
    };
    const ends = year || !(spill || unkSpill) ? [ref] : [ref, nextDay(ref)];
    let worst = null;
    for (const r of ends) {
      const m = extra(r), mx = (year ? doneMin : at(w, r)) + m.x;
      if (m.est && mx > out.limitMin && (!worst || mx > worst.mx)) worst = { mx, m };
    }
    return worst ? { ...out, ...uncFields(worst.mx, worst.m) } : out;
  });
};
