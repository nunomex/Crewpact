// Cálculo do PSV/FDP (ORO.FTL.205 + 220).
import { baseMaxFdpMin, baseMaxFdpByBand, bandLabel, splitExtensionMin, splitCountedBreakMin, splitExtensionFromCountedMin, EXT_SECTOR_CAP, maxFdpWithExtensionMin } from '../rules/fdpRules';
import { woclOverlapMin } from './woclCalculator';
import { durationMin, minToHhmm } from '../utils/time';

// Máximo de PSV a partir do índice da faixa selecionada (sem hora de report).
// Usado pelo seletor de faixas do PsvCalc.
export const computeFdpByBand = ({ state = 'acc', bandIdx = 0, sectors = 1, splitBreakH = 0 }) => {
  const baseMin = baseMaxFdpByBand(state, bandIdx, sectors);
  const extMin = state === 'acc' ? splitExtensionMin(splitBreakH) : 0;
  const maxFdpMin = baseMin + extMin;
  return { baseMin, baseStr: minToHhmm(baseMin), extMin, maxFdpMin, maxFdpStr: minToHhmm(maxFdpMin) };
};

// input: { state, reportMin, endMin?, sectors, splitBreakH?, splitBreakStartMin?, accommodation?, extended? }
// `extended` (205d) usa a tabela de prolongamento sem repouso a bordo (só 'acc'); não combina
// com split (205d4). `notAllowed` = prolongamento não permitido (hora/setores). `notAllowedReason`
// = 'time' (hora fora da tabela) | 'sectors' (acima do teto por sobreposição ao WOCL, 205d3).
export const computeFdp = ({ state = 'acc', reportMin = null, endMin = null, sectors = 1, splitBreakH = 0, splitBreakStartMin = null, accommodation = false, extended = false }) => {
  if (reportMin == null) {
    return { baseMin: null, extMin: 0, maxFdpMin: null, maxFdpStr: null, actualFdpMin: null, actualFdpStr: null, over: false, excessMin: 0, excessStr: null, band: bandLabel(state, reportMin), extended, notAllowed: false, notAllowedReason: null, extSectorCap: null };
  }
  let baseMin, extMin = 0, maxFdpMin, notAllowed = false, notAllowedReason = null, extSectorCap = null;
  if (extended && state === 'acc') {
    const m = maxFdpWithExtensionMin(reportMin, sectors); // tabela já inclui o prolongamento; split não combina
    if (endMin != null) extSectorCap = EXT_SECTOR_CAP(woclOverlapMin(reportMin, endMin)); // teto 205(d)(3)
    if (m == null) { notAllowed = true; notAllowedReason = 'time'; baseMin = null; maxFdpMin = null; }
    else if (extSectorCap != null && sectors > extSectorCap) { notAllowed = true; notAllowedReason = 'sectors'; baseMin = null; maxFdpMin = null; }
    else { baseMin = m; maxFdpMin = m; }
  } else {
    baseMin = baseMaxFdpMin(state, reportMin, sectors);
    extMin = state === 'acc' ? splitExtensionFromCountedMin(splitCountedBreakMin(splitBreakH * 60, splitBreakStartMin, accommodation)) : 0;
    maxFdpMin = baseMin + extMin;
  }
  const actualFdpMin = endMin != null ? durationMin(reportMin, endMin) : null;
  const over = !notAllowed && actualFdpMin != null && maxFdpMin != null && actualFdpMin > maxFdpMin;
  const excessMin = over ? actualFdpMin - maxFdpMin : 0;
  return {
    baseMin, extMin, maxFdpMin, maxFdpStr: maxFdpMin != null ? minToHhmm(maxFdpMin) : null,
    actualFdpMin, actualFdpStr: actualFdpMin != null ? minToHhmm(actualFdpMin) : null,
    over, excessMin, excessStr: over ? minToHhmm(excessMin) : null,
    band: bandLabel(state, reportMin), extended, notAllowed, notAllowedReason, extSectorCap,
  };
};
