// Índice de risco de fadiga (consultivo). Determinístico — testável por golden.
// Ver ftl/rules/fatigueRules.js para a justificação regulamentar e os pesos.
import { woclOverlapMin } from './woclCalculator';
import { classifyDisruptive } from './disruptiveCalculator';
import { FATIGUE_WEIGHTS as W, FATIGUE_THRESHOLDS as T, fatigueBand } from '../rules/fatigueRules';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// input: { reportMin, endMin, sectors, maxFdpMin, actualFdpMin, restMin?, consecutiveDisruptive? }
//   restMin = repouso (min) ANTES do próximo serviço; null = não considerado.
//   consecutiveDisruptive = dias disruptivos seguidos terminados nesta duty (inclui-a).
// Devolve { score 0–100, band: 'low'|'moderate'|'elevated'|'high', factors:{...} }.
export const computeFatigue = ({
  reportMin = null, endMin = null, sectors = 1,
  maxFdpMin = null, actualFdpMin = null,
  restMin = null, consecutiveDisruptive = 0,
} = {}) => {
  // WOCL: proporção da janela (4 h) sobreposta pelo serviço (com volta da meia-noite).
  const wocl = Math.round(clamp(woclOverlapMin(reportMin, endMin) / T.woclWindowMin, 0, 1) * W.wocl);
  // Utilização do PSV: 60 % → 0; 100 % → peso máximo.
  const r = maxFdpMin && actualFdpMin != null ? actualFdpMin / maxFdpMin : 0;
  const fdpLoad = Math.round(clamp((r - T.fdpLoadFloor) / (T.fdpLoadCeil - T.fdpLoadFloor), 0, 1) * W.fdpLoad);
  // Setores acima de 2 (sectorStep pontos cada, até ao peso máximo).
  const sectorsPts = Math.min(W.sectors, Math.max(0, sectors - T.sectorBase) * T.sectorStep);
  // Horário disruptivo (235a): matinal e/ou tardio (o noturno já entra via WOCL).
  const dis = classifyDisruptive({ reportMin, endMin });
  const disruptive = Math.min(W.disruptive, (dis.earlyStart ? T.disruptiveEach : 0) + (dis.lateFinish ? T.disruptiveEach : 0));
  // Repouso curto: linear de 12 h (0) até 9 h (peso máximo).
  const shortRest = restMin == null ? 0 : Math.round(clamp((T.restFloorMin - restMin) / T.restSpanMin, 0, 1) * W.shortRest);
  // Cadeia de dias disruptivos (235d): consecStep por dia, contado até consecCap.
  const consecutive = Math.min(T.consecCap, Math.max(0, consecutiveDisruptive)) * T.consecStep;

  const factors = { wocl, fdpLoad, sectors: sectorsPts, disruptive, shortRest, consecutive };
  const score = Math.min(100, wocl + fdpLoad + sectorsPts + disruptive + shortRest + consecutive);
  return { score, band: fatigueBand(score), factors };
};
