// Cálculo do PSV/FDP (ORO.FTL.205 + 220).
import { baseMaxFdpMin, baseMaxFdpByBand, bandLabel, splitExtensionMin } from '../rules/fdpRules';
import { durationMin, minToHhmm } from '../utils/time';

// Máximo de PSV a partir do índice da faixa selecionada (sem hora de report).
// Usado pelo seletor de faixas do PsvCalc.
export const computeFdpByBand = ({ state = 'acc', bandIdx = 0, sectors = 1, splitBreakH = 0 }) => {
  const baseMin = baseMaxFdpByBand(state, bandIdx, sectors);
  const extMin = state === 'acc' ? splitExtensionMin(splitBreakH) : 0;
  const maxFdpMin = baseMin + extMin;
  return { baseMin, baseStr: minToHhmm(baseMin), extMin, maxFdpMin, maxFdpStr: minToHhmm(maxFdpMin) };
};

// input: { state:'acc'|'unk'|'frm', reportMin, endMin?, sectors, splitBreakH? }
// Devolve o máximo da tabela (+ extensão split), o FDP real e o excesso.
export const computeFdp = ({ state = 'acc', reportMin = null, endMin = null, sectors = 1, splitBreakH = 0 }) => {
  if (reportMin == null) {
    return { baseMin: null, extMin: 0, maxFdpMin: null, maxFdpStr: null, actualFdpMin: null, actualFdpStr: null, over: false, excessMin: 0, excessStr: null, band: null };
  }
  const baseMin = baseMaxFdpMin(state, reportMin, sectors);
  const extMin = state === 'acc' ? splitExtensionMin(splitBreakH) : 0;
  const maxFdpMin = baseMin + extMin;
  const actualFdpMin = endMin != null ? durationMin(reportMin, endMin) : null;
  const over = actualFdpMin != null && actualFdpMin > maxFdpMin;
  const excessMin = over ? actualFdpMin - maxFdpMin : 0;
  return {
    baseMin, extMin, maxFdpMin, maxFdpStr: minToHhmm(maxFdpMin),
    actualFdpMin, actualFdpStr: actualFdpMin != null ? minToHhmm(actualFdpMin) : null,
    over, excessMin, excessStr: over ? minToHhmm(excessMin) : null,
    band: bandLabel(state, reportMin),
  };
};
