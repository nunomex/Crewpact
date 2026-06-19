// Análise de sequência de escala (CS FTL.1.235(a)(1)(2) + (d)).
// Recebe o mapa de `duties` { 'YYYY-MM-DD': { report_time, block_on, deleted? } } e
// produz avisos sobre repouso de recuperação e horários disruptivos.
//
// HEURÍSTICA (confirmada): um "repouso de recuperação prolongado" é inferido de um
// gap ≥ 36 h entre o fim de uma duty e o início da seguinte (o recovery é normalmente
// escalado; aqui é derivado da sequência registada).
import { classifyDisruptive } from './disruptiveCalculator';

export const RECOVERY_MIN_H = 36;        // 235(d): repouso de recuperação ≥ 36 h
export const RECOVERY_MAX_APART_H = 168; // 235(d): ≤ 168 h entre recuperações
export const RECOVERY_EXT_H = 60;        // 235(a)(2): ≥ 4 disruptivos → recovery 60 h
export const DISRUPTIVE_THRESHOLD = 4;
const H = 3600000;

const hhmm = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
const toMs = (date, min) => {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d).getTime() + min * 60000;
};
// O repouso [startMs, endMs] inclui uma noite local (22:00–08:00, 10 h)?
const restSpansLocalNight = (startMs, endMs) => {
  const d = new Date(startMs);
  let nightStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0, 0).getTime();
  if (nightStart < startMs) nightStart += 86400000;
  return nightStart + 10 * H <= endMs;
};

export const computeRestSequence = (duties = {}) => {
  const rows = Object.entries(duties)
    .filter(([, d]) => d && !d.deleted && d.report_time && d.block_on)
    .map(([date, d]) => {
      const repMin = hhmm(d.report_time), endMin = hhmm(d.block_on);
      let end = toMs(date, endMin);
      if (endMin < repMin) end += 86400000; // cruza a meia-noite
      return { date, start: toMs(date, repMin), end, disruptive: classifyDisruptive({ reportMin: repMin, endMin }) };
    })
    .sort((a, b) => a.start - b.start);

  const issues = [];
  if (rows.length < 2) return { issues, blocks: [] };

  // Blocos separados por recuperação (gap ≥ 36 h).
  const blocks = [];
  let block = [rows[0]];
  for (let i = 1; i < rows.length; i++) {
    const gapH = (rows[i].start - rows[i - 1].end) / H;
    if (gapH >= RECOVERY_MIN_H) { blocks.push({ duties: block, recoveryAfterH: gapH }); block = [rows[i]]; }
    else block.push(rows[i]);
  }
  blocks.push({ duties: block, recoveryAfterH: null }); // último bloco — recovery ainda por escalar

  blocks.forEach((b) => {
    const disruptive = b.duties.filter(x => x.disruptive.disruptive).length;
    // 235(a)(2): ≥ 4 disruptivos → a recuperação seguinte deve ser ≥ 60 h.
    if (disruptive >= DISRUPTIVE_THRESHOLD && b.recoveryAfterH != null && b.recoveryAfterH < RECOVERY_EXT_H) {
      issues.push({ type: 'recovery60', disruptive, recoveryH: Math.round(b.recoveryAfterH) });
    }
    // 235(d): bloco que dura > 168 h sem recuperação interna.
    const spanH = (b.duties[b.duties.length - 1].end - b.duties[0].start) / H;
    if (spanH > RECOVERY_MAX_APART_H) issues.push({ type: 'recovery168', spanH: Math.round(spanH) });
  });

  // 235(a)(1): transição noturno/tardio → entrada matinal (sem recovery entre) deve
  // incluir 1 noite local.
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i];
    if ((cur.start - prev.end) / H >= RECOVERY_MIN_H) continue; // é recovery, não transição
    if ((prev.disruptive.night || prev.disruptive.lateFinish) && cur.disruptive.earlyStart
        && !restSpansLocalNight(prev.end, cur.start)) {
      issues.push({ type: 'transitionNight', date: cur.date });
    }
  }

  return { issues, blocks: blocks.map(b => ({ count: b.duties.length, disruptive: b.duties.filter(x => x.disruptive.disruptive).length, recoveryAfterH: b.recoveryAfterH })) };
};
