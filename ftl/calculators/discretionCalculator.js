// Sobreposição da discrição do comandante (ORO.FTL.205(f)) ao PSV máximo.
// Estende o máximo planeado pela margem de discrição e marca o limite reduzido
// de repouso. NÃO é um valor de planeamento — só se aplica a circunstâncias
// imprevistas a partir da apresentação e é sempre reportável ao operador.
import { DISCRETION_FDP_EXT_MIN, DISCRETION_FDP_EXT_INFLIGHT_MIN, DISCRETION_REST_FLOOR_MIN } from '../rules/discretionRules';
import { minToHhmm } from '../utils/time';

// input: { maxFdpMin, actualFdpMin?, restMin?, inFlightRest? }
export const computeDiscretion = ({ maxFdpMin = null, actualFdpMin = null, restMin = null, inFlightRest = false } = {}) => {
  const extMin = inFlightRest ? DISCRETION_FDP_EXT_INFLIGHT_MIN : DISCRETION_FDP_EXT_MIN;
  const maxMin = maxFdpMin != null ? maxFdpMin + extMin : null;
  // used  = o FDP real passa o máximo planeado mas cabe na margem de discrição.
  const used = actualFdpMin != null && maxFdpMin != null && actualFdpMin > maxFdpMin && (maxMin == null || actualFdpMin <= maxMin);
  // over  = ilegal mesmo com a discrição do comandante.
  const over = actualFdpMin != null && maxMin != null && actualFdpMin > maxMin;
  const excessMin = over ? actualFdpMin - maxMin : 0;
  const restFloorMin = DISCRETION_REST_FLOOR_MIN;
  return {
    extMin, extStr: minToHhmm(extMin),
    maxMin, maxStr: maxMin != null ? minToHhmm(maxMin) : null,
    used, over, excessMin, excessStr: over ? minToHhmm(excessMin) : null,
    restFloorMin, restFloorStr: minToHhmm(restFloorMin),
    inFlightRest, reportable: true,
  };
};
