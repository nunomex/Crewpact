// Repouso a bordo (ORO.FTL.205(e) · CS FTL.1.205(c)) — cabina e tripulação técnica.
import {
  minInflightRestMin, maxFdpByClassMin, maxFdpByCabinRestMin, maxFlightCrewFdpMin, longSectorApplies,
  INFLIGHT_SECTOR_LIMIT, INFLIGHT_MIN_REST_MIN, INFLIGHT_DEST_REST_FLOOR_MIN, LANDING_PILOT_MIN_REST_MIN,
  INFLIGHT_LONG_SECTOR_ADD_MIN,
} from '../rules/inflightRestRules';
import { minToHhmm } from '../utils/time';

// input: { maxFdpMin, restClass:'c1'|'c2'|'c3', sectors }
// Devolve o repouso a bordo mínimo exigido à CABINE (tabela (c)(3)) e se a combinação é permitida.
export const computeInflightRest = ({ maxFdpMin = null, restClass = 'c1', sectors = 1 } = {}) => {
  const classMaxMin = maxFdpByClassMin(restClass);
  const overSectors = sectors > INFLIGHT_SECTOR_LIMIT;             // (c)(1)(i)
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

// PSV máximo da tripulação TÉCNICA (pilotos) com repouso a bordo — CS FTL.1.205(c)(2) e (4).
// input: { restClass:'c1'|'c2'|'c3', additionalCrew:1|2, sectors, longestSectorMin? }
//   additionalCrew = pilotos além dos 2 mínimos (1 → 3 no total; 2 → 4 no total).
//   longestSectorMin = o maior setor (voo contínuo, min) → +1 h se > 9 h e ≤ 2 setores ((c)(4)).
// Devolve o PSV máximo permitido e as condições mínimas (setores, repouso a bordo).
export const computeFlightCrewFdp = ({ restClass = 'c1', additionalCrew = 1, sectors = 1, longestSectorMin = null } = {}) => {
  const add = Number(additionalCrew) >= 2 ? 2 : 1;
  const tableMin = maxFlightCrewFdpMin(restClass, add);
  const longSector = longSectorApplies(sectors, longestSectorMin);
  const maxFdpMin = tableMin != null ? tableMin + (longSector ? INFLIGHT_LONG_SECTOR_ADD_MIN : 0) : null;
  const overSectors = sectors > INFLIGHT_SECTOR_LIMIT;            // (c)(1)(i)
  const allowed = !overSectors && maxFdpMin != null;
  return {
    restClass, additionalCrew: add, longSector,
    maxFdpMin, maxFdpStr: maxFdpMin != null ? minToHhmm(maxFdpMin) : null,
    sectorLimit: INFLIGHT_SECTOR_LIMIT, overSectors,
    minRestMin: INFLIGHT_MIN_REST_MIN, minRestStr: minToHhmm(INFLIGHT_MIN_REST_MIN),              // ≥ 90 min/tripulante
    landingPilotMinRestMin: LANDING_PILOT_MIN_REST_MIN,                                            // ≥ 2h consecutivas
    landingPilotMinRestStr: minToHhmm(LANDING_PILOT_MIN_REST_MIN),
    destRestFloorMin: INFLIGHT_DEST_REST_FLOOR_MIN,                                                // ≥ 14h no destino
    allowed,
  };
};

// Teto do PSV da CABINE com repouso a bordo (auditoria A-146/A-176/A-214). O PSV só é prolongado pelo
// repouso a bordo dos PILOTOS (CS 205(c)(2) "for flight crew"); a cabine segue esse PSV, e a tabela (c)(3)
// diz o repouso a bordo mínimo que a cabine precisa para ele. Teto = o menor de três:
//   (a) o PSV da técnica: (c)(2) pelos pilotos extra e a classe DOS PILOTOS, mais (c)(4) se se aplicar;
//   (b) a última linha da tabela (c)(3) permitida na classe DA CABINE;
//   (c) a linha que o repouso a bordo da cabine permite (abaixo de 90 min → não permitido).
// Sem saber os pilotos ou o repouso (registos antigos), escolhe o mais restritivo: +1 piloto, classe 3 e 1:30.
export const computeCabinAugmentedFdp = ({ restClass = 'c1', additionalCrew = null, fcRestClass = null, cabinRestMin = null, sectors = 1, longestSectorMin = null } = {}) => {
  const assumed = additionalCrew == null || fcRestClass == null || cabinRestMin == null;
  const fc = computeFlightCrewFdp({ restClass: fcRestClass || 'c3', additionalCrew: additionalCrew || 1, sectors, longestSectorMin });
  const classMaxMin = maxFdpByClassMin(restClass);
  const restCapMin = maxFdpByCabinRestMin(restClass, cabinRestMin != null ? cabinRestMin : INFLIGHT_MIN_REST_MIN);
  const overSectors = fc.overSectors;
  const restTooShort = restCapMin == null;
  const parts = [fc.maxFdpMin, classMaxMin, restCapMin].filter((v) => v != null);
  const maxFdpMin = (overSectors || restTooShort || !parts.length) ? null : Math.min(...parts);
  const limitedBy = maxFdpMin == null ? null
    : maxFdpMin === fc.maxFdpMin ? 'flightCrew' : maxFdpMin === restCapMin ? 'cabinRest' : 'cabinClass';
  return {
    restClass, maxFdpMin, maxFdpStr: maxFdpMin != null ? minToHhmm(maxFdpMin) : null,
    flightCrewMaxMin: fc.maxFdpMin, classMaxMin, restCapMin, longSector: fc.longSector,
    overSectors, restTooShort, assumed, limitedBy,
    minRestForMaxMin: maxFdpMin != null ? minInflightRestMin(maxFdpMin, restClass) : null,
  };
};
