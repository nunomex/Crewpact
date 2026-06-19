// API pública do motor FTL. Os ecrãs/componentes consomem SÓ daqui.
//
// Cobertura regulamentar (PDFs anexados):
//  ✓ ORO.FTL.205 b — PSV máx (Quadro 2/3/4)        ✓ ORO.FTL.220 — split duty
//  ✓ ORO.FTL.210   — limites cumulativos            ✓ ORO.FTL.235 a/b — repouso mínimo
//  ✓ CS FTL.1.205(a)(1) — 4 setores em noite        ✓ WOCL / serviço noturno (105)
//  ✓ 205 b/d — PSV + prolongamento (+ teto setores WOCL 205d3, frequência 205d1)
//  ✓ 205 c/e — repouso a bordo   ✓ 205 f — discrição   ✓ 205 g — delayed reporting
//  ✓ Quadro 1 — aclimatação   ✓ 210 — limites   ✓ 220 — split (+ exclusão >6h/WOCL)
//  ✓ 225 — standby   ✓ 235 a/b — repouso   ✓ 235 b(3) — fusos   ✓ 235 c — reduzido   ✓ WOCL/noturno
//  ℹ Reserva (230): referência (sem cálculo diário, durações do operador).
import { computeFdp, computeFdpByBand } from './calculators/fdpCalculator';
import { computeAcclimatisation } from './calculators/acclimatisationCalculator';
import { computeDiscretion } from './calculators/discretionCalculator';
import { computeInflightRest } from './calculators/inflightRestCalculator';
import { computeStandby } from './calculators/standbyCalculator';
import { computeReducedRest } from './calculators/reducedRestCalculator';
import { computeTimeZoneRest } from './calculators/timeZoneRestCalculator';
import { computeDelayedReporting } from './calculators/delayedReportingCalculator';
import { computeExtensionUsage } from './calculators/extensionUsageCalculator';
import { computeRest } from './calculators/restCalculator';
import { computeFlightTime } from './calculators/flightTimeCalculator';
import { isNightDuty, overlapsWOCL } from './calculators/woclCalculator';
import { validateDuty } from './validators/validateDuty';
import { validateRest } from './validators/validateRest';
import { validateLimits, computeDutyTime } from './validators/validateLimits';
import { withinBand, fmtBandRange, bandRangeMins } from './rules/fdpRules';
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from './rules/flightTimeRules';
import { QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED } from './constants/tables';
import { parseHhmm, minToHhmm } from './utils/time';

// Uma atividade (manual ou da escala) → PSV + repouso + legalidade num só objeto.
// input: { state, report, end?, sectors, splitBreakH?, inBase?, postFlightMin? }
//   `postFlightMin` = serviço pós-voo (min) após o fim do PSV (calços). O repouso
//   (ORO.FTL.235 a/b) e o acumulado (210) contam o PERÍODO DE SERVIÇO — PSV +
//   serviço pós-voo — não só o PSV (ORO.FTL.105(11), 210(c)). Default 0 mantém o
//   comportamento anterior quando o pós-voo não é fornecido.
export const computeDuty = ({ state = 'acc', report, end = null, sectors = 1, splitBreakH = 0, splitBreakStart = null, accommodation = false, inBase = true, extended = false, discretion = false, inFlightRest = false, postFlightMin = 0 }) => {
  const reportMin = parseHhmm(report);
  const endMin = parseHhmm(end);
  const fdp = computeFdp({ state, reportMin, endMin, sectors, splitBreakH, splitBreakStartMin: parseHhmm(splitBreakStart), accommodation, extended });
  // Período de serviço = PSV + serviço pós-voo (a base do repouso e do acumulado).
  const dutyPeriodMin = fdp.actualFdpMin != null ? fdp.actualFdpMin + (postFlightMin || 0) : null;
  const rest = computeRest({ prevDutyMin: dutyPeriodMin || 0, inBase });
  const duty = validateDuty({ fdp, reportMin, endMin, sectors });
  const disc = discretion
    ? computeDiscretion({ maxFdpMin: fdp.maxFdpMin, actualFdpMin: fdp.actualFdpMin, restMin: rest.restMin, inFlightRest })
    : null;
  return {
    reportMin, endMin, sectors, state, inBase,
    postFlightMin: postFlightMin || 0,
    dutyPeriodMin, dutyPeriodStr: dutyPeriodMin != null ? minToHhmm(dutyPeriodMin) : null,
    fdp, rest, discretion: disc, ...duty,
  };
};

// Adapter: registo bruto de duty (tabela `duties`) → entrada do `dayLog` (store FTL),
// via o motor. A duty não guarda aclimatação/base → defaults 'acc' e na base (inBase).
// `src:'duty'` marca a entrada como DERIVADA (distingue de um registo manual do simulador).
// Devolve null sem dados suficientes (sem apresentação ou sem on-block).
export const dutyToFtlDay = (duty = {}, { state = 'acc', inBase = true } = {}) => {
  if (!duty.report_time || !duty.block_on) return null;
  const d = computeDuty({ state, report: duty.report_time, end: duty.block_on, sectors: duty.sectors || 0, inBase, postFlightMin: 0 });
  if (d.fdp.actualFdpMin == null) return null;
  const toH = (m) => +(m / 60).toFixed(1);
  const servicoH = d.dutyPeriodMin != null ? toH(d.dutyPeriodMin) : 0;
  const vooH = duty.flight_minutes ? toH(duty.flight_minutes) : 0;
  const place = inBase ? 'base' : 'away';
  const repMin = parseHhmm(duty.report_time), endMin = parseHhmm(duty.block_on);
  return {
    src: 'duty',
    psv: {
      state: d.state, sectors: d.sectors, result: d.fdp.actualFdpStr, max: d.fdp.maxFdpStr,
      band: d.fdp.band, start: duty.report_time, end: duty.block_on,
      endNextDay: repMin != null && endMin != null && endMin < repMin,
      over: d.fdp.over, excess: d.fdp.excessStr, extended: false, ts: Date.now(),
    },
    servico: servicoH,
    voo: vooH,
    rest: { [place]: d.rest.restMin != null ? toH(d.rest.restMin) : 0, [`${place}Prev`]: servicoH, ts: Date.now() },
  };
};

export {
  computeFdp, computeFdpByBand, computeRest, computeFlightTime, computeDutyTime, validateLimits,
  validateDuty, validateRest, isNightDuty, overlapsWOCL,
  computeAcclimatisation, computeDiscretion,
  computeInflightRest, computeStandby, computeReducedRest, computeTimeZoneRest,
  computeDelayedReporting, computeExtensionUsage,
  withinBand, fmtBandRange, bandRangeMins,
  DUTY_WINDOWS, FLIGHT_WINDOWS, QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED,
};
export * from './utils/time';
