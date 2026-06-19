// Decisão de aclimatação (CS FTL.1.205 · Quadro 1) → estado para o motor PSV.
import { acclimLetter, acclimLetterByIdx, letterToState, letterRef } from '../rules/acclimatisationRules';
import { q1DiffIdx, q1ElapsedIdx } from '../constants/tables';

// Aceita índices (UI escolhe a faixa) OU horas reais (escala). Devolve:
//  letter 'B'|'D'|'X', state 'acc'|'unk', ref 'local'|'reference', e os índices usados.
export const computeAcclimatisation = ({ diffIdx = null, elapsedIdx = null, diffH = null, elapsedH = null } = {}) => {
  const di = diffIdx != null ? diffIdx : q1DiffIdx(diffH || 0);
  const ei = elapsedIdx != null ? elapsedIdx : q1ElapsedIdx(elapsedH || 0);
  const letter = diffIdx != null || elapsedIdx != null
    ? acclimLetterByIdx(di, ei)
    : acclimLetter(diffH || 0, elapsedH || 0);
  return { letter, state: letterToState(letter), ref: letterRef(letter), diffIdx: di, elapsedIdx: ei };
};
