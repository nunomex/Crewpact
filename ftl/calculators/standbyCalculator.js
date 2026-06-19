// Impacto do standby no PSV máximo e nos limites (CS FTL.1.225).
import {
  AIRPORT_STANDBY_FREE_H, AIRPORT_COMBINED_MAX_H,
  OTHER_STANDBY_MAX_H, OTHER_STANDBY_FREE_H, OTHER_STANDBY_FREE_EXT_H,
  OTHER_STANDBY_DUTY_PCT, MAX_AWAKE_H,
} from '../rules/standbyRules';
import { minToHhmm } from '../utils/time';

// input: { type:'airport'|'other', standbyH, maxFdpMin?, fdpH?, extended? }
//   extended = PSV prolongado por repouso a bordo ou serviço repartido (6 h → 8 h).
export const computeStandby = ({ type = 'airport', standbyH = 0, maxFdpMin = null, fdpH = 0, extended = false } = {}) => {
  const sbMin = Math.round(standbyH * 60);
  let reductionMin = 0, dutyCountMin = 0, combinedMaxMin = null, overMaxStandby = false, awakeOver = false;
  if (type === 'airport') {
    reductionMin = Math.max(0, sbMin - AIRPORT_STANDBY_FREE_H * 60); // > 4 h reduz o PSV máx
    dutyCountMin = sbMin;                                            // conta 100 % como serviço
    combinedMaxMin = AIRPORT_COMBINED_MAX_H * 60;                    // standby + PSV ≤ 16 h
  } else {
    const freeH = extended ? OTHER_STANDBY_FREE_EXT_H : OTHER_STANDBY_FREE_H;
    reductionMin = Math.max(0, sbMin - freeH * 60);                  // > 6 h (8 h) reduz o PSV máx
    dutyCountMin = Math.round(sbMin * OTHER_STANDBY_DUTY_PCT);       // 25 % conta como serviço
    overMaxStandby = standbyH > OTHER_STANDBY_MAX_H;                 // máximo 16 h
    awakeOver = (standbyH + fdpH) > MAX_AWAKE_H;                     // > 18 h acordado
  }
  const reducedMaxFdpMin = maxFdpMin != null ? Math.max(0, maxFdpMin - reductionMin) : null;
  return {
    type, sbMin,
    reductionMin, reductionStr: minToHhmm(reductionMin),
    dutyCountMin, dutyCountStr: minToHhmm(dutyCountMin),
    reducedMaxFdpMin, reducedMaxFdpStr: reducedMaxFdpMin != null ? minToHhmm(reducedMaxFdpMin) : null,
    combinedMaxMin, combinedMaxStr: combinedMaxMin != null ? minToHhmm(combinedMaxMin) : null,
    overMaxStandby, awakeOver,
  };
};
