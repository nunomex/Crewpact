// Impacto do standby no PSV máximo e nos limites (CS FTL.1.225).
import {
  AIRPORT_STANDBY_FREE_H, AIRPORT_COMBINED_MAX_H,
  OTHER_STANDBY_MAX_H, OTHER_STANDBY_FREE_H, OTHER_STANDBY_FREE_EXT_H,
  OTHER_STANDBY_DUTY_PCT, MAX_AWAKE_H, STANDBY_NIGHT_START_MIN, STANDBY_NIGHT_END_MIN,
} from '../rules/standbyRules';
import { minToHhmm } from '../utils/time';

// input: { type:'airport'|'other', standbyH, maxFdpMin?, actualFdpMin?, extended?, startMin? }
//   maxFdpMin    = PSV máximo antes do standby (Quadro 2, ou já com casos especiais).
//   actualFdpMin = o PSV REAL do serviço (apresentação → calços). Os avisos "standby + PSV" usam-no a ele, nunca o
//                  máximo (auditoria A-164/A-246: somar o máximo dava "excede" a serviços dentro dos limites).
//   extended = PSV prolongado por repouso a bordo ou serviço repartido (6 h → 8 h).
//   startMin = hora de início do standby (min do dia) — ativa o carve-out noturno (b)(9).
export const computeStandby = ({ type = 'airport', standbyH = 0, maxFdpMin = null, actualFdpMin = null, extended = false, startMin = null } = {}) => {
  const sbMin = Math.round(standbyH * 60);
  let reductionMin = 0, dutyCountMin = 0, combinedMaxMin = null, overMaxStandby = false, awakeOver = false, combinedOver = false;
  let reducedMaxFdpMin = null;
  if (type === 'airport') {
    reductionMin = Math.max(0, sbMin - AIRPORT_STANDBY_FREE_H * 60); // (a)(2)(i): > 4 h reduz o PSV máx
    dutyCountMin = sbMin;                                            // ORO.FTL.225(c): conta 100 % como serviço
    combinedMaxMin = AIRPORT_COMBINED_MAX_H * 60;                    // (a)(2)(ii): standby + PSV ≤ 16 h
    // O teto é o MENOR dos dois (A-143/A-164): (i) o máximo menos o standby acima de 4 h; (ii) 16 h menos o standby.
    if (maxFdpMin != null) reducedMaxFdpMin = Math.max(0, Math.min(maxFdpMin - reductionMin, combinedMaxMin - sbMin));
    combinedOver = actualFdpMin != null && (sbMin + actualFdpMin) > combinedMaxMin;
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
    if (maxFdpMin != null) reducedMaxFdpMin = Math.max(0, maxFdpMin - reductionMin);
    // (b)(2): standby + PSV não deve passar 18 h acordado — com o PSV real; sem fim conhecido, o teto já reduzido.
    const fdpForAwake = actualFdpMin != null ? actualFdpMin : reducedMaxFdpMin;
    awakeOver = fdpForAwake != null && fdpForAwake > 0 && (sbMin + fdpForAwake) > MAX_AWAKE_H * 60;
  }
  return {
    type, sbMin,
    reductionMin, reductionStr: minToHhmm(reductionMin),
    dutyCountMin, dutyCountStr: minToHhmm(dutyCountMin),
    reducedMaxFdpMin, reducedMaxFdpStr: reducedMaxFdpMin != null ? minToHhmm(reducedMaxFdpMin) : null,
    combinedMaxMin, combinedMaxStr: combinedMaxMin != null ? minToHhmm(combinedMaxMin) : null,
    overMaxStandby, awakeOver, combinedOver,
  };
};
