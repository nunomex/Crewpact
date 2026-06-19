// Adiamento da apresentação ao serviço (CS FTL.1.205(d)).
import { baseMaxFdpMin } from '../rules/fdpRules';
import { DELAY_LIMITING_THRESHOLD_MIN, DELAY_AS_REST_MIN } from '../rules/delayedReportingRules';
import { durationMin, minToHhmm } from '../utils/time';

// input: { state, origMin, delayedMin, sectors }
// < 4 h → PSV máx pela hora original; ≥ 4 h → pela hora mais limitativa.
// O PSV conta sempre a partir da hora adiada. ≥ 10 h sem contacto → conta como repouso.
export const computeDelayedReporting = ({ state = 'acc', origMin = null, delayedMin = null, sectors = 1 } = {}) => {
  if (origMin == null || delayedMin == null) {
    return { delayMin: null, delayStr: null, under4: null, asRest: false, basis: null, maxFdpMin: null, maxFdpStr: null, latestEndStr: null, endNextDay: false };
  }
  const delayMin = durationMin(origMin, delayedMin);
  const asRest = delayMin >= DELAY_AS_REST_MIN;
  const maxOrig = baseMaxFdpMin(state, origMin, sectors);
  const maxDelayed = baseMaxFdpMin(state, delayedMin, sectors);
  const under4 = delayMin < DELAY_LIMITING_THRESHOLD_MIN;
  const maxFdpMin = under4 ? maxOrig : Math.min(maxOrig, maxDelayed);
  const basis = under4 ? 'original' : (maxOrig <= maxDelayed ? 'original' : 'delayed');
  const endMin = delayedMin + maxFdpMin; // conta a partir da hora adiada
  return {
    delayMin, delayStr: minToHhmm(delayMin), under4, asRest,
    maxOrigMin: maxOrig, maxDelayedMin: maxDelayed, basis,
    maxFdpMin, maxFdpStr: minToHhmm(maxFdpMin),
    latestEndStr: minToHhmm(endMin % 1440), endNextDay: endMin >= 1440,
  };
};
