// Classificação de serviços disruptivos (CS FTL.1.235(a) · ORO.FTL.105(8)(9)).
// Base para os horários disruptivos (235(a)) e para a contagem de recovery (235(d)).
import { isNightDuty } from './woclCalculator';

// Bandas dos dois tipos de horário disruptivo (ORO.FTL.105(8)). A autoridade competente
// (o Estado do AOC, não a base) atribui MATINAL ou TARDIO a cada operador que supervisiona
// (ARO.OPS.230) — por isso o tipo é um atributo POR COMPANHIA.
//  · Serviço noturno: sobrepõe 02:00–04:59 (105(9)) — igual nos dois tipos.
//  · MATINAL (early): entrada 05:00–05:59 · largada 23:00–01:59.
//  · TARDIO  (late):  entrada 05:00–06:59 · largada 00:00–01:59.
// easyJet Europe = AOC austríaco (Austro Control) → MATINAL. (Áustria/Alemanha/Itália = matinal;
// França/Espanha/Bélgica/Reino Unido = tardio.) Default = matinal (conservador: nunca subclassifica).
export const DISRUPTIVE_BANDS = {
  early: {
    earlyStart: { start: 300, end: 360 },                  // 05:00–05:59
    lateFinish: { lo1: 1380, hi1: 1440, lo2: 0, hi2: 120 }, // 23:00–01:59
  },
  late: {
    earlyStart: { start: 300, end: 420 },                  // 05:00–06:59
    lateFinish: { lo1: 1440, hi1: 1440, lo2: 0, hi2: 120 }, // 00:00–01:59 (1.ª banda vazia)
  },
};

// Compat: o default matinal continua exportado como antes.
export const EARLY_START = DISRUPTIVE_BANDS.early.earlyStart;   // 05:00–05:59
export const LATE_FINISH = DISRUPTIVE_BANDS.early.lateFinish;   // 23:00–01:59

// Resolve as bandas a partir de um tipo ('early'|'late') ou de um objeto de bandas já pronto.
const bandsOf = (type) => {
  if (type && type.earlyStart && type.lateFinish) return type;         // já são bandas
  return DISRUPTIVE_BANDS[type] || DISRUPTIVE_BANDS.early;             // 'early'/'late'/undefined
};

// input: { reportMin, endMin, type } → { night, earlyStart, lateFinish, disruptive }.
// `type`: 'early' (matinal, default) | 'late' (tardio) | objeto de bandas. Por companhia (ARO.OPS.230).
export const classifyDisruptive = ({ reportMin = null, endMin = null, type } = {}) => {
  const { earlyStart: ES, lateFinish: LF } = bandsOf(type);
  const night = reportMin != null && endMin != null && isNightDuty(reportMin, endMin);
  const earlyStart = reportMin != null && reportMin >= ES.start && reportMin < ES.end;
  const lateFinish = endMin != null && (
    (endMin >= LF.lo1 && endMin < LF.hi1) ||
    (endMin >= LF.lo2 && endMin < LF.hi2)
  );
  return { night, earlyStart, lateFinish, disruptive: night || earlyStart || lateFinish };
};
