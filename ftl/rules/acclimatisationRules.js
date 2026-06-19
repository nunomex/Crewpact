// Estado de aclimatação (CS FTL.1.205 · Quadro 1).
import { QUADRO1, q1DiffIdx, q1ElapsedIdx } from '../constants/tables';

// Letra do Quadro 1 ('B' | 'D' | 'X') por índice de linha (diferença) × coluna (decorrido).
export const acclimLetterByIdx = (diffIdx, elapsedIdx) =>
  (QUADRO1[diffIdx] || QUADRO1[3])[elapsedIdx] ?? 'X';

// Letra a partir das horas reais (diferença de fuso, tempo decorrido).
export const acclimLetter = (diffH, elapsedH) =>
  acclimLetterByIdx(q1DiffIdx(diffH), q1ElapsedIdx(elapsedH));

// Letra → estado do motor PSV: B/D usam Quadro 2 ('acc'); X usa Quadro 3 ('unk').
export const letterToState = (letter) => (letter === 'X' ? 'unk' : 'acc');

// Qual o relógio para a faixa do PSV: 'B' → hora local do fuso de PARTIDA;
// 'D' → hora local do lugar onde inicia o turno SEGUINTE (destino). Ambos → Quadro 2.
export const letterRef = (letter) => (letter === 'D' ? 'arrival' : 'departure');
