// Cálculo do repouso mínimo (ORO.FTL.235 a/b · CS FTL.1.235(b)(3)(ii) · CS FTL.1.205(c)(6) · ORO.FTL.205(d)(1)).
import { REST_FLOOR_BASE_MIN, REST_FLOOR_AWAY_MIN } from '../rules/restRules';
import { minToHhmm } from '../utils/time';

// CS FTL.1.235(b)(3)(ii): fora da base, se o PSV envolve ≥ 4 h de fuso, o repouso
// seguinte é ≥ período de serviço anterior ou 14 h (o maior).
export const AWAY_TZ_REST_FLOOR_MIN = 840; // 14 h
// CS FTL.1.205(c)(6): depois de um PSV com repouso a bordo, o repouso no destino é ≥ serviço anterior ou 14 h.
export const INFLIGHT_REST_FLOOR_MIN = 840; // 14 h
// ORO.FTL.205(d)(1): PSV prolongado → (i) +2 h ao repouso antes E depois, ou (ii) +4 h ao repouso depois.
export const EXT_REST_ADD_MIN = 120;
export const EXT_REST_ADD_POST_ONLY_MIN = 240;

// input: { prevDutyMin, inBase, tzDiffH, inflightRest, extended }
//   prevDutyMin  = período de serviço anterior (PSV + pós-voo).
//   tzDiffH      = diferença de fuso do PSV (h) — conta só fora da base.
//   inflightRest = o PSV anterior teve repouso a bordo (tripulação reforçada).
//   extended     = o PSV anterior foi prolongado ao abrigo do 205(d).
// Devolve restMin (opção (i) quando prolongado: +2 h, e o repouso ANTES também tinha de ter +2 h) e restPostOnlyMin
// (opção (ii): +4 h só depois). Sem prolongamento, os dois são iguais.
export const computeRest = ({ prevDutyMin = 0, inBase = true, tzDiffH = 0, inflightRest = false, extended = false } = {}) => {
  const awayTz = !inBase && Math.abs(tzDiffH || 0) >= 4;
  let floorMin = inBase ? REST_FLOOR_BASE_MIN : (awayTz ? AWAY_TZ_REST_FLOOR_MIN : REST_FLOOR_AWAY_MIN);
  if (inflightRest) floorMin = Math.max(floorMin, INFLIGHT_REST_FLOOR_MIN);
  const baseRestMin = Math.max(prevDutyMin || 0, floorMin);
  const restMin = baseRestMin + (extended ? EXT_REST_ADD_MIN : 0);
  const restPostOnlyMin = baseRestMin + (extended ? EXT_REST_ADD_POST_ONLY_MIN : 0);
  return {
    floorMin, baseRestMin, restMin, restStr: minToHhmm(restMin),
    restPostOnlyMin, restPostOnlyStr: minToHhmm(restPostOnlyMin),
    awayTz, inflightRest: !!inflightRest, extended: !!extended,
    reason: extended ? 'extended' : inflightRest && floorMin === INFLIGHT_REST_FLOOR_MIN ? 'inflight' : awayTz ? 'tz' : null,
  };
};
