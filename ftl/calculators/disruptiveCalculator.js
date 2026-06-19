// Classificação de serviços disruptivos (CS FTL.1.235(a) · ORO.FTL.105(8)(9)).
// Base para os horários disruptivos (235(a)) e para a contagem de recovery (235(d)).
import { isNightDuty } from './woclCalculator';

// Bandas do "tipo matinal" (ORO.FTL.105(8)). NOTA: a autoridade competente atribui
// matinal/tardio a cada operador (ARO.OPS.230) — estas bandas são o default matinal
// e devem ser configuráveis por operador.
//  · Serviço noturno: sobrepõe 02:00–04:59 (105(9)).
//  · Entrada matinal: começa entre 05:00 e 05:59.
//  · Largada tardia:  termina entre 23:00 e 01:59.
export const EARLY_START = { start: 300, end: 360 };      // 05:00–05:59
export const LATE_FINISH = { lo1: 1380, hi1: 1440, lo2: 0, hi2: 120 }; // 23:00–01:59

// input: { reportMin, endMin } → { night, earlyStart, lateFinish, disruptive }.
export const classifyDisruptive = ({ reportMin = null, endMin = null } = {}) => {
  const night = reportMin != null && endMin != null && isNightDuty(reportMin, endMin);
  const earlyStart = reportMin != null && reportMin >= EARLY_START.start && reportMin < EARLY_START.end;
  const lateFinish = endMin != null && (
    (endMin >= LATE_FINISH.lo1 && endMin < LATE_FINISH.hi1) ||
    (endMin >= LATE_FINISH.lo2 && endMin < LATE_FINISH.hi2)
  );
  return { night, earlyStart, lateFinish, disruptive: night || earlyStart || lateFinish };
};
