// Validação dos limites cumulativos (ORO.FTL.210) — serviço + voo, em minutos inteiros.
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDaysMin, sumCalendarYearMin, entryMin, nextMin, dayMin, windowResult } from '../calculators/cumulativeCalculator';
import { computeFlightTime } from '../calculators/flightTimeCalculator';
import { isoDay } from '../utils/time';

// O serviço de HOJE pode passar a meia-noite (bloco 8b): a parte de amanhã conta no período que acaba amanhã, que também o
// contém → vê-se o pior dos dois (revisão do 8b, E1: o Início dizia "dentro" num serviço que fazia passar os 7 dias).
export const spillsToNextDay = (dayLog, ref, key) => nextMin(dayLog[isoDay(ref)], key) > 0;
export const nextDayOf = (ref) => { const t = new Date(ref); t.setDate(t.getDate() + 1); return t; };
export const computeDutyTime = (dayLog = {}, ref = new Date()) => {
  const spill = spillsToNextDay(dayLog, ref, 'servico');
  return DUTY_WINDOWS.map((w) => windowResult(w, 'servico', Math.max(
    sumWindowDaysMin(dayLog, 'servico', w.days, ref),
    spill ? sumWindowDaysMin(dayLog, 'servico', w.days, nextDayOf(ref)) : 0)));
};

export const validateLimits = (dayLog = {}, ref = new Date()) => {
  const duty = computeDutyTime(dayLog, ref);
  const flight = computeFlightTime(dayLog, ref);
  const issues = [...duty, ...flight]
    .filter((w) => w.over)
    .map((w) => ({ rule: 'ORO.FTL.210', window: w.id, key: w.key, done: w.done, doneMin: w.doneMin, limit: w.limit, overMin: w.overMin }));
  return { duty, flight, legal: issues.length === 0, issues };
};

// ORO.FTL.210: "por período de N dias consecutivos" é QUALQUER período, não só o que acaba hoje. Um serviço no dia `date`
// entra em todos os períodos que o contêm (auditoria A-165: só se via o de 28 dias que acabava nesse dia):
//   • N dias (7/14/28 de serviço, 28 de voo): os que acabam entre `date` e `date` + N − 1 — com os serviços já escalados;
//   • ano civil (900 h de voo): o ano de `date`, inteiro;
//   • 12 meses consecutivos (1 000 h): os que acabam entre `date` e `date` + 12 meses (o máximo está num dia com registo).
// Devolve, por janela, o período mais carregado que contém o dia (o 1.º, se houver empate), com `from`/`to` (ISO).
const ROWS12 = new WeakMap();
export const limitsAround = (dayLog = {}, date) => {
  const D = new Date(String(date) + 'T12:00:00');
  if (isNaN(D)) return [];
  const shift = (n) => { const x = new Date(D); x.setDate(x.getDate() + n); return x; };
  const best = (w, key, refs, sum, span) => {
    let out = null;
    for (const ref of refs) {
      const doneMin = sum(ref);
      if (!out || doneMin > out.doneMin) out = { ...windowResult(w, key, doneMin), ...span(ref) };
    }
    return out;
  };
  // Os períodos de N dias que contêm o dia: acabam entre `date` e `date` + N − 1. Somas por deslizamento sobre os 2N − 1 dias à
  // volta (um ciclo por período; a importação pergunta por centenas de dias). Se o serviço do dia passa a meia-noite, a parte de
  // amanhã também está no período que acaba em `date` + N (revisão do 8b, E2) → mais um período.
  const daysWin = (w, key) => {
    const N = w.days;
    const ext = nextMin(dayLog[isoDay(D)], key) > 0 ? 1 : 0;
    const isos = Array.from({ length: 2 * N - 1 + ext }, (_, k) => isoDay(shift(k - (N - 1))));
    const ents = isos.map((iso) => dayLog[iso]);
    // Por DIA LOCAL (bloco 8b, A-173): a parte depois da meia-noite de um serviço conta no dia seguinte.
    const vals = isos.map((iso) => dayMin(dayLog, iso, key));
    let sum = vals.slice(0, N).reduce((a, b) => a + b, 0), bestK = 0, bestSum = sum;
    for (let k = 1; k < N + ext; k++) { sum += vals[k + N - 1] - vals[k - 1]; if (sum > bestSum) { bestSum = sum; bestK = k; } }
    const out = { ...windowResult(w, key, bestSum), from: isos[bestK], to: isos[bestK + N - 1] };
    // Serviços sem apresentação (bloco 4): o serviço deles é um MÍNIMO; com o MÁXIMO possível (servicoMaxMin) um período que
    // não passa pode passar → "incerto" (nem "dentro" nem "excede" inventados). Só o serviço — o tempo de voo é exato.
    if (key !== 'servico' || out.over) return out;
    const est = ents.map((e) => (e && typeof e.servicoMaxMin === 'number' ? 1 : 0));
    // (o máximo também pode vir das DUAS LEITURAS de um dia — um PSV repartido ou dois, a assistência até à apresentação ou
    // não: `servicoMaxReadings`, ftl/index.js — e não de uma apresentação em falta: diz-se qual é o caso, `readDays`)
    const rdg = ents.map((e) => (e && typeof e.servicoMaxMin === 'number' && e.servicoMaxReadings ? 1 : 0));
    if (!est.some(Boolean)) return out;
    const mxv = ents.map((e, k) => (est[k] ? vals[k] + e.servicoMaxMin - entryMin(e, key) : vals[k]));
    let mx = mxv.slice(0, N).reduce((a, b) => a + b, 0), ne = est.slice(0, N).reduce((a, b) => a + b, 0);
    let worst = ne ? { mx, ne, k: 0 } : null;
    for (let k = 1; k < N + ext; k++) {
      mx += mxv[k + N - 1] - mxv[k - 1]; ne += est[k + N - 1] - est[k - 1];
      if (ne && (!worst || mx > worst.mx)) worst = { mx, ne, k };
    }
    if (worst && worst.mx > out.limitMin) return { ...out, uncertain: true, doneMaxMin: worst.mx, estDays: worst.ne, readDays: rdg.slice(worst.k, worst.k + N).reduce((a, b) => a + b, 0), maxFrom: isos[worst.k], maxTo: isos[worst.k + N - 1] };
    return out;
  };
  const out = DUTY_WINDOWS.map((w) => daysWin(w, 'servico'));
  for (const w of FLIGHT_WINDOWS) {
    if (w.kind === 'calendarYear') {
      const y = D.getFullYear();
      const yr = { ...windowResult(w, 'voo', sumCalendarYearMin(dayLog, 'voo', D)), from: `${y}-01-01`, to: `${y}-12-31` };
      // Voo de 31/12 que passa a meia-noite: a parte de 1/1 conta no ano seguinte (revisão do 8b, E2) → o pior dos dois.
      const nx = shift(1);
      if (nx.getFullYear() !== y && nextMin(dayLog[isoDay(D)], 'voo') > 0) {
        const ny = { ...windowResult(w, 'voo', sumCalendarYearMin(dayLog, 'voo', nx)), from: `${y + 1}-01-01`, to: `${y + 1}-12-31` };
        out.push(ny.doneMin > yr.doneMin ? ny : yr);
      } else out.push(yr);
    } else if (w.kind === 'months12') {
      // A mesma soma do sumMonthsMin ((ref − 12 meses, ref]), com somas acumuladas: o registo de um ano inteiro somava-se
      // uma vez por cada dia com registo à frente.
      // As linhas e as somas acumuladas guardam-se por dayLog (a importação pergunta por centenas de dias da mesma escala).
      let cached = ROWS12.get(dayLog);
      if (!cached) {
        // Por dia local: a parte de voo depois da meia-noite passa para o dia seguinte (bloco 8b).
        const byDay = {};
        for (const k of Object.keys(dayLog)) {
          const n = nextMin(dayLog[k], 'voo');
          byDay[k] = (byDay[k] || 0) + entryMin(dayLog[k], 'voo') - n;
          if (n) { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + 1); const k2 = isoDay(d); byDay[k2] = (byDay[k2] || 0) + n; }
        }
        const rows0 = Object.keys(byDay).sort().map((k) => ({ t: +new Date(k + 'T00:00:00'), m: byDay[k] }));
        const P0 = [0]; rows0.forEach((r) => P0.push(P0[P0.length - 1] + r.m));
        cached = { rows: rows0, P: P0 };
        ROWS12.set(dayLog, cached);
      }
      const { rows, P } = cached;
      const firstAbove = (x) => { let lo = 0, hi = rows.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (rows[mid].t > x) hi = mid; else lo = mid + 1; } return lo; };
      const sum12 = (ref) => { const st = new Date(ref); st.setMonth(st.getMonth() - 12); return P[firstAbove(+ref)] - P[firstAbove(+st)]; };
      const end = new Date(D); end.setMonth(end.getMonth() + 12);
      const refs = [D, ...rows.map((r) => new Date(r.t + 12 * 3600000)).filter((t) => +t > +D && +t < +end)];
      out.push(best(w, 'voo', refs, sum12,
        (ref) => { const f = new Date(ref); f.setMonth(f.getMonth() - 12); f.setDate(f.getDate() + 1); return { from: isoDay(f), to: isoDay(ref) }; }));
    } else out.push(daysWin(w, 'voo'));
  }
  return out;
};
