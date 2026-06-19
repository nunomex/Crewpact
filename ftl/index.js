// API pública do motor FTL. Os ecrãs/componentes consomem SÓ daqui.
//
// Cobertura regulamentar (PDFs anexados):
//  ✓ ORO.FTL.205 b — PSV máx (Quadro 2/3/4)        ✓ ORO.FTL.220 — split duty
//  ✓ ORO.FTL.210   — limites cumulativos            ✓ ORO.FTL.235 a/b — repouso mínimo
//  ✓ CS FTL.1.205(a)(1) — 4 setores em noite        ✓ WOCL / serviço noturno (105)
//  ✓ 205 b/d — PSV + prolongamento   ✓ Quadro 1 — aclimatação   ✓ 205 c/e — repouso a bordo
//  ✓ 205 f — discrição do comandante  ✓ 210 — limites   ✓ 220 — split   ✓ 225 — standby
//  ✓ 235 a/b — repouso   ✓ 235 b(3) — fusos   ✓ 235 c — repouso reduzido   ✓ WOCL/noturno
//  ⚠ EM FALTA (não inventado): 205 g — delayed reporting; frequência 205(d)(1) (2×/7 dias);
//    cap de setores por WOCL no 205(d)(3); exclusão >6h/WOCL no split 220(e). Reserva (230): referência.
import { computeFdp, computeFdpByBand } from './calculators/fdpCalculator';
import { computeAcclimatisation } from './calculators/acclimatisationCalculator';
import { computeDiscretion } from './calculators/discretionCalculator';
import { computeInflightRest } from './calculators/inflightRestCalculator';
import { computeStandby } from './calculators/standbyCalculator';
import { computeReducedRest } from './calculators/reducedRestCalculator';
import { computeTimeZoneRest } from './calculators/timeZoneRestCalculator';
import { computeRest } from './calculators/restCalculator';
import { computeFlightTime } from './calculators/flightTimeCalculator';
import { isNightDuty, overlapsWOCL } from './calculators/woclCalculator';
import { validateDuty } from './validators/validateDuty';
import { validateRest } from './validators/validateRest';
import { validateLimits, computeDutyTime } from './validators/validateLimits';
import { withinBand, fmtBandRange, bandRangeMins } from './rules/fdpRules';
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from './rules/flightTimeRules';
import { QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED } from './constants/tables';
import { parseHhmm } from './utils/time';

// Uma atividade (manual ou da escala) → PSV + repouso + legalidade num só objeto.
// input: { state, report, end?, sectors, splitBreakH?, inBase? }
export const computeDuty = ({ state = 'acc', report, end = null, sectors = 1, splitBreakH = 0, inBase = true, extended = false, discretion = false, inFlightRest = false }) => {
  const reportMin = parseHhmm(report);
  const endMin = parseHhmm(end);
  const fdp = computeFdp({ state, reportMin, endMin, sectors, splitBreakH, extended });
  const rest = computeRest({ prevDutyMin: fdp.actualFdpMin || 0, inBase });
  const duty = validateDuty({ fdp, reportMin, endMin, sectors });
  const disc = discretion
    ? computeDiscretion({ maxFdpMin: fdp.maxFdpMin, actualFdpMin: fdp.actualFdpMin, restMin: rest.restMin, inFlightRest })
    : null;
  return { reportMin, endMin, sectors, state, inBase, fdp, rest, discretion: disc, ...duty };
};

export {
  computeFdp, computeFdpByBand, computeRest, computeFlightTime, computeDutyTime, validateLimits,
  validateDuty, validateRest, isNightDuty, overlapsWOCL,
  computeAcclimatisation, computeDiscretion,
  computeInflightRest, computeStandby, computeReducedRest, computeTimeZoneRest,
  withinBand, fmtBandRange, bandRangeMins,
  DUTY_WINDOWS, FLIGHT_WINDOWS, QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED,
};
export * from './utils/time';
