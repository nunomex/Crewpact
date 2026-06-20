// Repouso a bordo (ORO.FTL.205(c) · CS FTL.1.205(c)) — cabina e tripulação técnica.
import {
  minInflightRestMin, maxFdpByClassMin, maxFlightCrewFdpMin,
  INFLIGHT_SECTOR_LIMIT, INFLIGHT_MIN_REST_MIN, INFLIGHT_DEST_REST_FLOOR_MIN, LANDING_PILOT_MIN_REST_MIN,
} from '../rules/inflightRestRules';
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

// PSV máximo da tripulação TÉCNICA (pilotos) com repouso a bordo — ORO.FTL.205(c).
// input: { restClass:'c1'|'c2'|'c3', additionalCrew:1|2, sectors }
//   additionalCrew = pilotos além dos 2 mínimos (1 → 3 no total; 2 → 4 no total).
// Devolve o PSV máximo permitido e as condições mínimas (setores, repouso a bordo).
export const computeFlightCrewFdp = ({ restClass = 'c1', additionalCrew = 1, sectors = 1 } = {}) => {
  const add = Number(additionalCrew) >= 2 ? 2 : 1;
  const maxFdpMin = maxFlightCrewFdpMin(restClass, add);
  const overSectors = sectors > INFLIGHT_SECTOR_LIMIT;            // 205(c)(1)(i)
  const allowed = !overSectors && maxFdpMin != null;
  return {
    restClass, additionalCrew: add,
    maxFdpMin, maxFdpStr: maxFdpMin != null ? minToHhmm(maxFdpMin) : null,
    sectorLimit: INFLIGHT_SECTOR_LIMIT, overSectors,
    minRestMin: INFLIGHT_MIN_REST_MIN, minRestStr: minToHhmm(INFLIGHT_MIN_REST_MIN),              // ≥ 90 min/tripulante
    landingPilotMinRestMin: LANDING_PILOT_MIN_REST_MIN,                                            // ≥ 2h consecutivas
    landingPilotMinRestStr: minToHhmm(LANDING_PILOT_MIN_REST_MIN),
    destRestFloorMin: INFLIGHT_DEST_REST_FLOOR_MIN,                                                // ≥ 14h no destino
    allowed,
  };
};
