// API pública do motor FTL. Os ecrãs/componentes consomem SÓ daqui.
//
// Cobertura regulamentar (PDFs anexados):
//  ✓ ORO.FTL.205 b — PSV máx (Quadro 2/3/4)        ✓ ORO.FTL.220 — split duty
//  ✓ ORO.FTL.210   — limites cumulativos            ✓ ORO.FTL.235 a/b — repouso mínimo
//  ✓ CS FTL.1.205(a)(1) — 4 setores em noite        ✓ WOCL / serviço noturno (105)
//  ⚠ EM FALTA (não inventado): 205 d (prolongamento s/ repouso a bordo · tabela CS p.5),
//    205 e (repouso a bordo), Quadro 1 (decisão acc/unk automática), 225/230 (standby/reserva),
//    repouso reduzido, fuso horário (235 b3), prerrogativas do comandante, delayed reporting.
import { computeFdp, computeFdpByBand } from './calculators/fdpCalculator';
import { computeRest } from './calculators/restCalculator';
import { computeFlightTime } from './calculators/flightTimeCalculator';
import { isNightDuty, overlapsWOCL } from './calculators/woclCalculator';
import { validateDuty } from './validators/validateDuty';
import { validateRest } from './validators/validateRest';
import { validateLimits, computeDutyTime } from './validators/validateLimits';
import { withinBand, fmtBandRange, bandRangeMins } from './rules/fdpRules';
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from './rules/flightTimeRules';
import { parseHhmm } from './utils/time';

// Uma atividade (manual ou da escala) → PSV + repouso + legalidade num só objeto.
// input: { state, report, end?, sectors, splitBreakH?, inBase? }
export const computeDuty = ({ state = 'acc', report, end = null, sectors = 1, splitBreakH = 0, inBase = true }) => {
  const reportMin = parseHhmm(report);
  const endMin = parseHhmm(end);
  const fdp = computeFdp({ state, reportMin, endMin, sectors, splitBreakH });
  const rest = computeRest({ prevDutyMin: fdp.actualFdpMin || 0, inBase });
  const duty = validateDuty({ fdp, reportMin, endMin, sectors });
  return { reportMin, endMin, sectors, state, inBase, fdp, rest, ...duty };
};

export {
  computeFdp, computeFdpByBand, computeRest, computeFlightTime, computeDutyTime, validateLimits,
  validateDuty, validateRest, isNightDuty, overlapsWOCL,
  withinBand, fmtBandRange, bandRangeMins,
  DUTY_WINDOWS, FLIGHT_WINDOWS,
};
export * from './utils/time';
