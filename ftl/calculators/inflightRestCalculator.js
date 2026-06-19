// Repouso a bordo mínimo (CS FTL.1.205(c)(3)) para tripulação de cabina.
import { minInflightRestMin, maxFdpByClassMin, INFLIGHT_SECTOR_LIMIT, INFLIGHT_MIN_REST_MIN } from '../rules/inflightRestRules';
import { minToHhmm } from '../utils/time';

// input: { maxFdpMin, restClass:'c1'|'c2'|'c3', sectors }
// Devolve o repouso a bordo mínimo exigido e se a combinação é permitida.
export const computeInflightRest = ({ maxFdpMin = null, restClass = 'c1', sectors = 1 } = {}) => {
  const classMaxMin = maxFdpByClassMin(restClass);
  const overSectors = sectors > INFLIGHT_SECTOR_LIMIT;             // 205(c)(1)(i)
  const reqMin = maxFdpMin != null ? minInflightRestMin(maxFdpMin, restClass) : null;
  const allowed = !overSectors && reqMin != null;
  return {
    restClass,
    minRestMin: reqMin, minRestStr: reqMin != null ? minToHhmm(reqMin) : null,
    classMaxMin, classMaxStr: classMaxMin != null ? minToHhmm(classMaxMin) : null,
    sectorLimit: INFLIGHT_SECTOR_LIMIT, overSectors,
    floorMin: INFLIGHT_MIN_REST_MIN,
    allowed,
  };
};
