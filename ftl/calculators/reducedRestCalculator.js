// Repouso reduzido (CS FTL.1.235(c)) — pisos e efeitos no repouso/PSV seguinte.
import { REDUCED_REST_BASE_MIN, REDUCED_REST_AWAY_MIN, MAX_REDUCED_PER_CYCLE } from '../rules/reducedRestRules';
import { minToHhmm } from '../utils/time';

// input: { inBase, reducedMin, normalRestMin }
//   normalRestMin = repouso mínimo normal (235 a/b) que seria devido.
// (c)(3): repouso SEGUINTE estende-se pela diferença; (c)(4): PSV seguinte reduz-se pela diferença.
export const computeReducedRest = ({ inBase = true, reducedMin = null, normalRestMin = null } = {}) => {
  const floorMin = inBase ? REDUCED_REST_BASE_MIN : REDUCED_REST_AWAY_MIN;
  const belowFloor = reducedMin != null && reducedMin < floorMin;
  const diffMin = (normalRestMin != null && reducedMin != null) ? Math.max(0, normalRestMin - reducedMin) : 0;
  return {
    inBase, floorMin, floorStr: minToHhmm(floorMin),
    reducedMin, reducedStr: reducedMin != null ? minToHhmm(reducedMin) : null,
    belowFloor,
    nextRestExtMin: diffMin, nextRestExtStr: minToHhmm(diffMin),         // (c)(3)
    nextFdpReductionMin: diffMin, nextFdpReductionStr: minToHhmm(diffMin), // (c)(4)
    maxPerCycle: MAX_REDUCED_PER_CYCLE,
    requiresFrm: true,
  };
};
