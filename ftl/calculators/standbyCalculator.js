// Impacto do standby no PSV máximo e nos limites (CS FTL.1.225).
import {
  AIRPORT_STANDBY_FREE_H, AIRPORT_COMBINED_MAX_H,
  OTHER_STANDBY_MAX_H, OTHER_STANDBY_FREE_H, OTHER_STANDBY_FREE_EXT_H,
  OTHER_STANDBY_DUTY_PCT, MAX_AWAKE_H, STANDBY_NIGHT_START_MIN, STANDBY_NIGHT_END_MIN,
} from '../rules/standbyRules';
import { minToHhmm } from '../utils/time';

// input: { type:'airport'|'other', standbyH, maxFdpMin?, fdpH?, extended?, startMin? }
//   extended = PSV prolongado por repouso a bordo ou serviço repartido (6 h → 8 h).
//   startMin = hora de início do standby (min do dia) — ativa o carve-out noturno (b)(9).
export const computeStandby = ({ type = 'airport', standbyH = 0, maxFdpMin = null, fdpH = 0, extended = false, startMin = null } = {}) => {
  const sbMin = Math.round(standbyH * 60);
  let reductionMin = 0, dutyCountMin = 0, combinedMaxMin = null, overMaxStandby = false, awakeOver = false, combinedOver = false;
  const fdpEffMin = maxFdpMin != null ? maxFdpMin : Math.round((fdpH || 0) * 60); // PSV planeado p/ verificar combinado/acordado
  if (type === 'airport') {
    reductionMin = Math.max(0, sbMin - AIRPORT_STANDBY_FREE_H * 60); // > 4 h reduz o PSV máx
    dutyCountMin = sbMin;                                            // conta 100 % como serviço
    combinedMaxMin = AIRPORT_COMBINED_MAX_H * 60;                    // standby + PSV ≤ 16 h
    combinedOver = maxFdpMin != null && (sbMin + fdpEffMin) > combinedMaxMin; // standby + PSV planeado > 16 h
  } else {
    const freeH = extended ? OTHER_STANDBY_FREE_EXT_H : OTHER_STANDBY_FREE_H;
    // (b)(9): standby iniciado entre 23:00–07:00 → a parte nessa janela não conta para
    // a redução (até contacto — assume-se contacto na apresentação).
    let nightOv = 0;
    if (startMin != null && (startMin >= STANDBY_NIGHT_START_MIN || startMin < STANDBY_NIGHT_END_MIN)) {
      const nightEnd = startMin >= STANDBY_NIGHT_START_MIN ? STANDBY_NIGHT_END_MIN + 1440 : STANDBY_NIGHT_END_MIN;
      nightOv = Math.max(0, Math.min(startMin + sbMin, nightEnd) - startMin);
    }
    reductionMin = Math.max(0, (sbMin - nightOv) - freeH * 60);      // > 6 h (8 h) reduz o PSV máx
    dutyCountMin = Math.round(sbMin * OTHER_STANDBY_DUTY_PCT);       // 25 % conta como serviço
    overMaxStandby = standbyH > OTHER_STANDBY_MAX_H;                 // máximo 16 h
    awakeOver = fdpEffMin > 0 && (sbMin + fdpEffMin) > MAX_AWAKE_H * 60; // standby + PSV > 18 h acordado
  }
  const reducedMaxFdpMin = maxFdpMin != null ? Math.max(0, maxFdpMin - reductionMin) : null;
  return {
    type, sbMin,
    reductionMin, reductionStr: minToHhmm(reductionMin),
    dutyCountMin, dutyCountStr: minToHhmm(dutyCountMin),
    reducedMaxFdpMin, reducedMaxFdpStr: reducedMaxFdpMin != null ? minToHhmm(reducedMaxFdpMin) : null,
    combinedMaxMin, combinedMaxStr: combinedMaxMin != null ? minToHhmm(combinedMaxMin) : null,
    overMaxStandby, awakeOver, combinedOver,
  };
};
