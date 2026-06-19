// Cálculo do repouso mínimo (ORO.FTL.235 a/b + CS FTL.1.235(b)(3)(ii)).
import { REST_FLOOR_BASE_MIN, REST_FLOOR_AWAY_MIN } from '../rules/restRules';
import { minToHhmm } from '../utils/time';

// CS FTL.1.235(b)(3)(ii): fora da base, se o PSV envolve ≥ 4 h de fuso, o repouso
// seguinte é ≥ período de serviço anterior ou 14 h (o maior).
export const AWAY_TZ_REST_FLOOR_MIN = 840; // 14 h

// input: { prevDutyMin, inBase, tzDiffH } → repouso mínimo = máx(serviço anterior, piso).
export const computeRest = ({ prevDutyMin = 0, inBase = true, tzDiffH = 0 } = {}) => {
  const awayTz = !inBase && Math.abs(tzDiffH) >= 4;
  const floorMin = inBase ? REST_FLOOR_BASE_MIN : (awayTz ? AWAY_TZ_REST_FLOOR_MIN : REST_FLOOR_AWAY_MIN);
  const restMin = Math.max(prevDutyMin || 0, floorMin);
  return { floorMin, restMin, restStr: minToHhmm(restMin), awayTz };
};
