// Cálculo do repouso mínimo (ORO.FTL.235 a/b).
import { REST_FLOOR_BASE_MIN, REST_FLOOR_AWAY_MIN } from '../rules/restRules';
import { minToHhmm } from '../utils/time';

// input: { prevDutyMin, inBase } → repouso mínimo = máx(serviço anterior, piso).
export const computeRest = ({ prevDutyMin = 0, inBase = true }) => {
  const floorMin = inBase ? REST_FLOOR_BASE_MIN : REST_FLOOR_AWAY_MIN;
  const restMin = Math.max(prevDutyMin || 0, floorMin);
  return { floorMin, restMin, restStr: minToHhmm(restMin) };
};
