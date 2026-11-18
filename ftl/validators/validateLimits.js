// Validação dos limites cumulativos (ORO.FTL.210) — serviço + voo, em minutos inteiros.
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from '../rules/flightTimeRules';
import { sumWindowDaysMin, sumCalendarYearMin, entryMin, nextMin, dayMin, windowResult, maxExtraIn, maxExtraRange, uncFields, hasMax, maxOf } from '../calculators/cumulativeCalculator';
import { computeFlightTime } from '../calculators/flightTimeCalculator';
import { isoDay } from '../utils/time';

// O serviço de HOJE pode passar a meia-noite (bloco 8b): a parte de amanhã conta no período que acaba amanhã, que também o
// contém → vê-se o pior dos dois (revisão do 8b, E1: o Início dizia "dentro" num serviço que fazia passar os 7 dias).
export const spillsToNextDay = (dayLog, ref, key) => nextMin(dayLog[isoDay(ref)], key) > 0;
export const nextDayOf = (ref) => { const t = new Date(ref); t.setDate(t.getDate() + 1); return t; };
// `from`/`to` (ISO): as datas do período escolhido — o que acaba hoje ou, se o de amanhã pesar mais, o de amanhã (em empate, o de hoje).
// O Início diz-as no porquê das horas de 7 dias (Q3 de design/topo-porque-2.html, 2026-11-14). Os números não mudam.
// (Sessão Fable 5.2, 2026-11-17.) Cada período leva também o MÁXIMO possível: se só ele passa o limite → `uncertain`, com
// `doneMaxMin` e os dias que o fazem (`estDays`; `unkDays`/`unkCodes` = os dos códigos novos) — como o limitsAround. Antes o
// período que acaba hoje (o "Dentro dos limites?" do Início) só via o mínimo.
export const computeDutyTime = (dayLog = {}, ref = new Date()) => {
  const spill = spillsToNextDay(dayLog, ref, 'servico');
  const unkSpill = !spill && !!(dayLog[isoDay(ref)] && dayLog[isoDay(ref)].unkSpill);
  return DUTY_WINDOWS.map((w) => {
    const today = sumWindowDaysMin(dayLog, 'servico', w.days, ref);
    const nx = spill ? nextDayOf(ref) : null;
    const tomorrow = nx ? sumWindowDaysMin(dayLog, 'servico', w.days, nx) : 0;
    const end = nx && tomorrow > today ? nx : ref;
    const start = new Date(end); start.setDate(start.getDate() - (w.days - 1));
    const out = { ...windowResult(w, 'servico', Math.max(today, tomorrow)), from: isoDay(start), to: isoDay(end) };
    if (out.over) return out;
    const ends = [[ref, today]];
    if (nx) ends.push([nx, tomorrow]);
    if (unkSpill) { const nu = nextDayOf(ref); ends.push([nu, sumWindowDaysMin(dayLog, 'servico', w.days, nu)]); }   // o código que passa a meia-noite
    let worst = null;
    for (const [e, sum] of ends) {
      const m = maxExtraIn(dayLog, w.days, e, 'servico');
      if (m.est && sum + m.x > out.limitMin && (!worst || sum + m.x > worst.mx)) worst = { mx: sum + m.x, m };
    }
    return worst ? { ...out, ...uncFields(worst.mx, worst.m) } : out;
  });
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
    if (out.over) return out;
    // (Sessão Fable 5.2.) O mesmo para o tempo de voo que a escala não diz (`vooMaxMin`: um código que a app não conhece, um PSV
    // sem horas), e os dias dizem-se pelo que são: com um código novo (`unkDays`, `unkCodes`), ou com um serviço a que faltam
    // horas (`missDays`).
    const est = ents.map((e) => (hasMax(e, key) ? 1 : 0));
    // (o máximo também pode vir das DUAS LEITURAS de um dia — um PSV repartido ou dois, a assistência até à apresentação ou
    // não: `servicoMaxReadings`, ftl/index.js — e não de uma apresentação em falta: diz-se qual é o caso, `readDays`)
    const rdg = ents.map((e) => (key === 'servico' && hasMax(e, key) && e.servicoMaxReadings ? 1 : 0));
    if (!est.some(Boolean)) return out;
    const mxv = ents.map((e, k) => (est[k] ? vals[k] + maxOf(e, key) - entryMin(e, key) : vals[k]));
    let mx = mxv.slice(0, N).reduce((a, b) => a + b, 0), ne = est.slice(0, N).reduce((a, b) => a + b, 0);
    let worst = ne ? { mx, ne, k: 0 } : null;
    for (let k = 1; k < N + ext; k++) {
      mx += mxv[k + N - 1] - mxv[k - 1]; ne += est[k + N - 1] - est[k - 1];
      if (ne && (!worst || mx > worst.mx)) worst = { mx, ne, k };
    }
    if (worst && worst.mx > out.limitMin) {
      const inWin = ents.slice(worst.k, worst.k + N).filter((e) => hasMax(e, key));
      const unkIn = inWin.filter((e) => e.unkCodes && e.unkCodes.length);
      const unkCodes = [];
      for (const e of unkIn) for (const c of e.unkCodes) if (!unkCodes.includes(c)) unkCodes.push(c);
      return { ...out, uncertain: true, doneMaxMin: worst.mx, estDays: worst.ne, readDays: rdg.slice(worst.k, worst.k + N).reduce((a, b) => a + b, 0),
        unkDays: unkIn.length, unkCodes, missDays: inWin.filter((e) => !(e.unkCodes && e.unkCodes.length) && (e.missN || key === 'voo')).length, maxFrom: isos[worst.k], maxTo: isos[worst.k + N - 1] };
    }
    return out;
  };
  // O ano civil e os 12 meses: o que o período escolhido (o mais carregado) pode ter a mais.
  const withMax = (r) => {
    if (!r || r.over || !r.from || !r.to) return r;
    const m = maxExtraRange(dayLog, r.from, r.to, 'voo');
    return m.est && r.doneMin + m.x > r.limitMin ? { ...r, ...uncFields(r.doneMin + m.x, m), maxFrom: r.from, maxTo: r.to } : r;
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
        out.push(withMax(ny.doneMin > yr.doneMin ? ny : yr));
      } else out.push(withMax(yr));
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
      const span12 = (ref) => { const f = new Date(ref); f.setMonth(f.getMonth() - 12); f.setDate(f.getDate() + 1); return { from: isoDay(f), to: isoDay(ref) }; };
      let r12 = withMax(best(w, 'voo', refs, sum12, span12));
      // (2.ª revisão independente, achado 13.) O máximo vê-se em TODOS os períodos de 12 meses que contêm o dia, não só no mais
      // carregado pelo mínimo — só quando há tempo de voo por saber (raro).
      if (!r12.over && !r12.uncertain && Object.values(dayLog).some((e) => hasMax(e, 'voo'))) {
        let worst = null;
        for (const ref of refs) {
          const sp = span12(ref), m = maxExtraRange(dayLog, sp.from, sp.to, 'voo'), mx = sum12(ref) + m.x;
          if (m.est && mx > r12.limitMin && (!worst || mx > worst.mx)) worst = { mx, m, sp };
        }
        if (worst) r12 = { ...r12, ...uncFields(worst.mx, worst.m), maxFrom: worst.sp.from, maxTo: worst.sp.to };
      }
      out.push(r12);
    } else out.push(daysWin(w, 'voo'));
  }
  return out;
};
