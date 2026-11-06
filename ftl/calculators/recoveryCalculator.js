// Repouso de recuperação e horários irregulares (ORO.FTL.235(d) · CS FTL.1.235(a) · ORO.FTL.105(8)(9)(16)).
// Auditoria A-151 (2026-11-06): substitui o computeRestSequence, que nenhum ecrã usava e tinha três erros (qualquer
// intervalo de 36 h contava como recuperação sem as 2 noites; a noite local pedia 10 h; o tardio via-se nos calços).
//
//  • Recuperação: um repouso de pelo menos 36 h com 2 noites locais (235(d)).
//  • Noite local: 8 h entre as 22:00 e as 08:00, hora local (105(16)).
//  • Entre o FIM de uma recuperação e o INÍCIO da seguinte: no máximo 168 h (235(d)).
//  • 4 ou mais noturnos, matinais ou tardios entre duas recuperações → a segunda tem pelo menos 60 h (CS 235(a)(2)).
//  • Na base, a passagem de tardio/noturno para matinal: o repouso entre os dois inclui 1 noite local (CS 235(a)(1)).
//
// As horas são as da escala (o relógio da base: a aclimatação é a da base — a do longo curso fica por modelar). O fim de
// cada serviço é o sign-off, ou os calços + pós-voo nos voos. Os dias sem serviço dentro do período da escala contam
// como livres; fora dele não se sabe (não se avisa).
import { classifyDisruptive } from './disruptiveCalculator';
import { parseHhmm } from '../utils/time';

const H = 3600000;
export const RECOVERY_MIN_MS = 36 * H;
export const RECOVERY_MAX_APART_MS = 168 * H;
export const RECOVERY_60_MS = 60 * H;
export const LOCAL_NIGHT_MIN = 8 * 60;
export const DISRUPTIVE_FOR_60 = 4;

const at = (iso, min, addDays = 0) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d + addDays, Math.floor(min / 60), min % 60, 0, 0);
};
const isoOf = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

// Quantas noites locais (8 h dentro de 22:00–08:00, a mesma noite) cabem em [start, end].
export const localNightsIn = (start, end) => {
  if (!start || !end || +end <= +start) return 0;
  let n = 0;
  const d0 = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  for (let d = d0; +d <= +end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const ws = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0);
    const we = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 8, 0);
    const ov = Math.min(+we, +end) - Math.max(+ws, +start);
    if (ov >= LOCAL_NIGHT_MIN * 60000) n++;
  }
  return n;
};

// O instante em que se completa a n-ésima noite local depois de `start` (8 h dentro de 22:00–08:00). null se n ≤ 0.
export const nthLocalNightEnd = (start, n) => {
  if (!start || !(n > 0)) return null;
  let count = 0;
  for (let k = -1; k < 60; k++) {
    const ws = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k, 22, 0);
    const we = new Date(start.getFullYear(), start.getMonth(), start.getDate() + k + 1, 8, 0);
    const s = Math.max(+ws, +start);
    if (+we - s >= LOCAL_NIGHT_MIN * 60000) { count++; if (count === n) return new Date(s + LOCAL_NIGHT_MIN * 60000); }
  }
  return null;
};

// input: duties { 'YYYY-MM-DD': duty (+ extra) }; ctx { postFlightMin, base, baseAt(iso), type: 'early'|'late' }.
// Devolve { duties: [{date, start, end, night, earlyStart, lateFinish, disruptive}], recoveries: [{start, end, h}],
//           issues: [{ type: 'recovery168'|'recovery60'|'transitionNight', date, ... }] }.
export const computeRecovery = (duties = {}, { postFlightMin = 0, base = null, baseAt = null, type = 'early' } = {}) => {
  const baseOf = (iso) => String((typeof baseAt === 'function' ? baseAt(iso) : base) || '').trim().toUpperCase();
  const rows = [];
  for (const date of Object.keys(duties).sort()) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    for (const s of [d, ...(Array.isArray(d.extra) ? d.extra : [])]) {
      if (!s || !s.report_time) continue;
      const rep = parseHhmm(s.report_time);
      const so = parseHhmm(s.signOff), on = parseHhmm(s.block_on);
      const isFl = (s.kind || 'flight') === 'flight';
      const endClk = so != null ? so : (on != null ? on + (isFl ? (postFlightMin || 0) : 0) : null);
      if (rep == null || endClk == null) continue;
      const start = at(date, rep);
      let end = at(date, endClk % 1440, Math.floor(endClk / 1440));
      if (+end <= +start) end = new Date(+end + 24 * H);
      const endMin = endClk % 1440;
      const dis = classifyDisruptive({ reportMin: rep, endMin, type });
      const dep = Array.isArray(s.legs) && s.legs.length ? s.legs[0].dep : String(s.route || '').split(/[^A-Za-z]+/).filter(Boolean)[0];
      rows.push({ date, start, end, ...dis, kind: s.kind || 'flight', depAtBase: !dep || !baseOf(date) ? null : String(dep).toUpperCase() === baseOf(date) });
    }
  }
  rows.sort((a, b) => +a.start - +b.start);
  // Intervalos ocupados fundidos (dois serviços que se tocam não deixam repouso entre eles).
  const gaps = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (+b.start > +a.end) gaps.push({ i, start: a.end, end: b.start, ms: +b.start - +a.end, nights: localNightsIn(a.end, b.start) });
  }
  const recoveries = gaps.filter((g) => g.ms >= RECOVERY_MIN_MS && g.nights >= 2);
  const issues = [];
  // 168 h entre o fim de uma recuperação e o início da seguinte.
  for (let k = 0; k < recoveries.length; k++) {
    const r = recoveries[k], nx = recoveries[k + 1];
    const limit = +r.end + RECOVERY_MAX_APART_MS;
    if (nx && +nx.start <= limit) continue;
    const late = rows.find((x) => +x.start >= +r.end && +x.end > limit && (!nx || +x.start < +nx.start));
    if (late) issues.push({ type: 'recovery168', date: late.date, since: isoOf(r.end), limit: new Date(limit) });
  }
  // 60 h depois de 4 ou mais disruptivos entre duas recuperações.
  for (let k = 0; k + 1 < recoveries.length; k++) {
    const a = recoveries[k], b = recoveries[k + 1];
    const between = rows.filter((x) => +x.start >= +a.end && +x.end <= +b.start);
    const n = between.filter((x) => x.disruptive).length;
    if (n >= DISRUPTIVE_FOR_60 && b.ms < RECOVERY_60_MS) {
      issues.push({ type: 'recovery60', date: rows[b.i].date, disruptive: n, hours: Math.floor(b.ms / H) });
    }
  }
  // Tardio/noturno → matinal na base: 1 noite local no repouso entre os dois.
  for (const g of gaps) {
    const prev = rows[g.i - 1], next = rows[g.i];
    if (!(prev.night || prev.lateFinish) || !next.earlyStart) continue;
    if (next.depAtBase === false) continue;   // fora da base, a regra não se aplica
    if (g.nights < 1) issues.push({ type: 'transitionNight', date: next.date });
  }
  // 235(d): "deve aumentar para dois dias locais duas vezes por mês" (dia local = 24 h a partir das 00:00, 105(15)). Conta-se
  // por mês civil as recuperações com 2 dias locais inteiros (pelo mês do 1.º dia); só nos meses que a escala cobre por
  // inteiro (há serviços antes e depois do mês). Menos de 2 → aviso no último dia do mês.
  const fullDays = (s, e) => {
    let d = (s.getHours() === 0 && s.getMinutes() === 0) ? new Date(s.getFullYear(), s.getMonth(), s.getDate()) : new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
    let n = 0, first = null;
    while (+new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) <= +e) { if (!first) first = d; n++; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
    return { n, first };
  };
  const byMonth = {};
  for (const g of recoveries) { const f = fullDays(g.start, g.end); if (f.n >= 2) { const ym = isoOf(f.first).slice(0, 7); byMonth[ym] = (byMonth[ym] || 0) + 1; } }
  if (rows.length) {
    const a = rows[0].start, z = rows[rows.length - 1].start;
    for (let t = new Date(a.getFullYear(), a.getMonth() + 1, 1); +new Date(t.getFullYear(), t.getMonth() + 1, 1) <= +new Date(z.getFullYear(), z.getMonth(), 1); t = new Date(t.getFullYear(), t.getMonth() + 1, 1)) {
      const ym = isoOf(t).slice(0, 7), count = byMonth[ym] || 0;
      if (count < 2) issues.push({ type: 'recoveryDays', month: ym, count, date: isoOf(new Date(t.getFullYear(), t.getMonth() + 1, 0)) });
    }
  }
  // CS FTL.1.200(b): na mudança de base, a recuperação antes do 1.º serviço na base nova tem 72 h com 3 noites locais.
  if (typeof baseAt === 'function') {
    for (let i = 1; i < rows.length; i++) {
      const bPrev = baseOf(rows[i - 1].date), bCur = baseOf(rows[i].date);
      if (!bPrev || !bCur || bPrev === bCur) continue;
      const g = gaps.find((x) => x.i === i);
      if (!(g && g.ms >= 72 * H && g.nights >= 3)) issues.push({ type: 'baseChange', date: rows[i].date, from: bPrev, to: bCur });
    }
  }
  return {
    duties: rows.map((r) => ({ date: r.date, start: r.start, end: r.end, night: r.night, earlyStart: r.earlyStart, lateFinish: r.lateFinish, disruptive: r.disruptive })),
    recoveries: recoveries.map((g) => ({ start: g.start, end: g.end, h: Math.floor(g.ms / H) })),
    issues,
  };
};
