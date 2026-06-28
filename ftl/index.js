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
import { computeInflightRest, computeFlightCrewFdp } from './calculators/inflightRestCalculator';
import { computeStandby } from './calculators/standbyCalculator';
import { computeReducedRest } from './calculators/reducedRestCalculator';
import { computeTimeZoneRest } from './calculators/timeZoneRestCalculator';
import { computeDelayedReporting } from './calculators/delayedReportingCalculator';
import { computeExtensionUsage } from './calculators/extensionUsageCalculator';
import { computeRest } from './calculators/restCalculator';
import { classifyDisruptive } from './calculators/disruptiveCalculator';
import { computeRestSequence } from './calculators/sequenceCalculator';
import { computeFatigue } from './calculators/fatigueCalculator';
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
// Casos especiais que mexem no TETO do PSV (205) de UM serviço — todos via os calculadores
// já golden (sem inventar valores): repouso a bordo / tripulação aumentada (205c), delayed
// reporting (205g) e redução por standby anterior (225). `augmented`/`delayedFrom`/`preStandby`/
// `isPilot` são opcionais → sem eles o comportamento é idêntico ao anterior (testes intactos).
//   augmented   = { restClass:'c1'|'c2'|'c3', additionalCrew?:1|2 } (additionalCrew só piloto)
//   delayedFrom = hora original de apresentação 'HH:MM' (a `report` é a adiada)
//   preStandby  = { type:'airport'|'other', standbyH, startMin? }
export const computeDuty = ({
  state = 'acc', report, end = null, sectors = 1, splitBreakH = 0, splitBreakStart = null,
  accommodation = false, inBase = true, extended = false, discretion = false, inFlightRest = false,
  postFlightMin = 0, augmented = null, delayedFrom = null, preStandby = null, isPilot = false,
}) => {
  const reportMin = parseHhmm(report);
  const endMin = parseHhmm(end);
  const base = computeFdp({ state, reportMin, endMin, sectors, splitBreakH, splitBreakStartMin: parseHhmm(splitBreakStart), accommodation, extended });

  // ── Teto do PSV efetivo a partir dos casos especiais (cada um via o seu calculador golden) ──
  let maxMin = base.maxFdpMin, notAllowed = base.notAllowed, notAllowedReason = base.notAllowedReason;
  let modifier = null; // 'augmented' | 'delayed' — para rótulo na UI
  // Delayed reporting (205g): recalcula o máx pela hora mais limitativa (original vs adiada).
  if (delayedFrom != null && reportMin != null) {
    const dr = computeDelayedReporting({ state, origMin: parseHhmm(delayedFrom), delayedMin: reportMin, sectors });
    if (dr.maxFdpMin != null) { maxMin = dr.maxFdpMin; modifier = 'delayed'; }
  }
  // Repouso a bordo / tripulação aumentada (205c): tabela aumentada (piloto por nº de tripulantes,
  // cabine por classe de instalação). SUBSTITUI o teto básico (é mais alto). Acima do teto de
  // setores (205c1) → não permitido.
  if (augmented && augmented.restClass) {
    const aug = isPilot
      ? computeFlightCrewFdp({ restClass: augmented.restClass, additionalCrew: augmented.additionalCrew, sectors })
      : computeInflightRest({ maxFdpMin: base.baseMin, restClass: augmented.restClass, sectors });
    const augMax = isPilot ? aug.maxFdpMin : aug.classMaxMin;
    if (aug.overSectors) { notAllowed = true; notAllowedReason = 'inflightSectors'; }
    else if (augMax != null) { maxMin = augMax; modifier = 'augmented'; }
  }
  // Standby anterior (225): reduz o teto (>4h aeroporto / >6h casa) e tem LIMITES COMBINADOS
  // (CS FTL.1.225): standby + PSV ≤ 16h (aeroporto) · ≤ 18h acordado (casa) · standby ≤ 16h.
  // A contribuição para os acumulados de 28 d (210) é tratada no `dutyToFtlDay` (Fase 2).
  let stdbyReductionMin = 0, stdbyOver = false, stdbyOverKind = null;
  if (preStandby && preStandby.standbyH > 0 && maxMin != null) {
    const sb = computeStandby({ type: preStandby.type, standbyH: preStandby.standbyH, maxFdpMin: maxMin, startMin: preStandby.startMin != null ? preStandby.startMin : null });
    stdbyReductionMin = sb.reductionMin;
    maxMin = sb.reducedMaxFdpMin;
    if (sb.combinedOver) { stdbyOver = true; stdbyOverKind = 'combined'; }       // standby + PSV > 16h (aeroporto)
    else if (sb.awakeOver) { stdbyOver = true; stdbyOverKind = 'awake'; }        // standby + PSV > 18h acordado (casa)
    else if (sb.overMaxStandby) { stdbyOver = true; stdbyOverKind = 'maxStandby'; } // standby > 16h
  }

  // PSV efetivo: a base com o teto sobreposto (recalcula over/excess). Sem modificadores → === base.
  const changed = maxMin !== base.maxFdpMin || notAllowed !== base.notAllowed;
  const over = !notAllowed && base.actualFdpMin != null && maxMin != null && base.actualFdpMin > maxMin;
  const excessMin = over ? base.actualFdpMin - maxMin : 0;
  const fdp = {
    ...base,
    ...(changed ? {
      maxFdpMin: notAllowed ? null : maxMin,
      maxFdpStr: (notAllowed || maxMin == null) ? null : minToHhmm(maxMin),
      over, excessMin, excessStr: over ? minToHhmm(excessMin) : null,
      notAllowed, notAllowedReason,
    } : {}),
    modifier, stdbyReductionMin, stdbyOver, stdbyOverKind,
  };

  // Período de serviço = PSV + serviço pós-voo (a base do repouso e do acumulado).
  const dutyPeriodMin = fdp.actualFdpMin != null ? fdp.actualFdpMin + (postFlightMin || 0) : null;
  const rest = computeRest({ prevDutyMin: dutyPeriodMin || 0, inBase });
  const duty = validateDuty({ fdp, reportMin, endMin, sectors });
  const disc = discretion
    ? computeDiscretion({ maxFdpMin: fdp.maxFdpMin, actualFdpMin: fdp.actualFdpMin, restMin: rest.restMin, inFlightRest: inFlightRest || !!augmented })
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
export const dutyToFtlDay = (duty = {}, { state = 'acc', inBase = true, postFlightMin = null, isPilot = false } = {}) => {
  // Reserva (ORO.FTL.230): é DISPONIBILIDADE, não serviço — 0 h FTL até ser convertida num
  // serviço (que é então registado à parte). Nunca contribui para os acumulados de 28 d.
  if (duty.kind === 'reserve') return null;
  if (!duty.report_time || !duty.block_on) return null;
  // Serviço pós-voo (debrief, ORO.FTL.235c — o operador fixa-o no OM). O sign-off REAL da duty
  // (`signOff` − último on-block, com volta-a-meia-noite) tem PRIORIDADE; senão usa o default
  // passado (min do perfil/OM). Entra no PERÍODO DE SERVIÇO (210 + repouso), como a norma manda.
  const onMin = parseHhmm(duty.block_on), soMin = parseHhmm(duty.signOff);
  const pf = soMin != null ? (soMin >= onMin ? soMin - onMin : soMin + 1440 - onMin) : (postFlightMin || 0);
  // Casos especiais (Fase 1) — repouso a bordo (205c), delayed (205g), redução por standby (225):
  // mexem no TETO do PSV deste serviço. Vêm em `duty.special` (persistido em roster_meta).
  const sp = duty.special || {};
  const d = computeDuty({
    state, report: duty.report_time, end: duty.block_on, sectors: duty.sectors || 0, inBase, postFlightMin: pf,
    augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null, isPilot,
  });
  if (d.fdp.actualFdpMin == null) return null;
  const toH = (m) => +(m / 60).toFixed(1);
  const fullServicoH = d.dutyPeriodMin != null ? toH(d.dutyPeriodMin) : 0;
  // Serviço para os acumulados de 28 d (ORO.FTL.210), em MINUTOS (soma-se uma vez → sem dupla-arredondamento):
  //  • DIA de standby próprio (kind standby_home): só 25% conta — CS FTL.1.225(b)(3) + GM1(c)
  //    (conta p/ 210, NÃO p/ repouso 235). Os outros tipos/voo contam 100%.
  //  • Standby ANTERIOR a este voo (`special.preStandby`, Fase 2 — "Buraco B"): a sua contribuição
  //    soma-se ao serviço — aeroporto 100%, casa 25% (CS FTL.1.225). A REDUÇÃO do PSV por esse mesmo
  //    standby já é aplicada no motor (Fase 1, `computeDuty`); aqui é só o lado dos cumulativos (210).
  const baseServicoMin = duty.kind === 'standby_home'
    ? computeStandby({ type: 'other', standbyH: (d.dutyPeriodMin || 0) / 60 }).dutyCountMin
    : (d.dutyPeriodMin || 0);
  const sp225 = duty.special && duty.special.preStandby;
  const sbExtraMin = (sp225 && sp225.standbyH > 0)
    ? computeStandby({ type: sp225.type, standbyH: sp225.standbyH }).dutyCountMin
    : 0;
  const servicoH = toH(baseServicoMin + sbExtraMin);
  const vooH = duty.flight_minutes ? toH(duty.flight_minutes) : 0;
  const place = inBase ? 'base' : 'away';
  const repMin = parseHhmm(duty.report_time), endMin = parseHhmm(duty.block_on);
  // Prolongamento PLANEADO (CS FTL.1.205(d)(1)): o PSV planeado excede o BÁSICO mas cabe
  // no ESTENDIDO, numa banda que permite extensão → conta p/ "máx 2 em 7 dias". Heurística:
  // da escala não se distingue planeado de discrição; marca-se quando CABE na extensão
  // (direção segura — antes avisar a mais). Acima do estendido = ilegal/discrição, não conta.
  const extFdp = computeFdp({ state, reportMin: repMin, sectors: duty.sectors || 0, extended: true });
  const usedExtension = !!d.fdp.over && repMin != null && !extFdp.notAllowed
    && d.fdp.actualFdpMin != null && d.fdp.actualFdpMin <= extFdp.maxFdpMin;
  return {
    src: 'duty',
    psv: {
      state: d.state, sectors: d.sectors, result: d.fdp.actualFdpStr, max: d.fdp.maxFdpStr,
      band: d.fdp.band, start: duty.report_time, end: duty.block_on,
      endNextDay: repMin != null && endMin != null && endMin < repMin,
      over: d.fdp.over, excess: d.fdp.excessStr, extended: usedExtension, ts: Date.now(),
    },
    servico: servicoH,
    voo: vooH,
    rest: { [place]: d.rest.restMin != null ? toH(d.rest.restMin) : 0, [`${place}Prev`]: fullServicoH, ts: Date.now() },
  };
};

// Repouso ENTRE dois períodos de serviço do mesmo dia (ORO.FTL.235 + CS FTL.1.220).
// Classifica o intervalo entre o FIM de `prev` (sign-off, ou block_on + débrief) e o REPORT
// de `next` — com volta à meia-noite. O mínimo de repouso é max(12h base / 10h fora, serviço
// anterior) — ORO.FTL.235(a)/(b). O intervalo é então:
//   • 'rest'       (≥ mínimo)      → 2 FDP SEPARADOS, com repouso a sério (são 2 serviços).
//   • 'split'      (≥3h e < mínimo)→ SPLIT DUTY: é 1 só FDP, o intervalo conta (CS FTL.1.220).
//   • 'continuous' (< 3h)          → demasiado perto: NÃO são 2 serviços (é o mesmo).
// Devolve { gapMin, requiredMin, kind, legal, place, prevDutyMin } — alimenta o diálogo de
// colisão (2 serviços vs split) e o aviso da folha do dia. Determinístico; null sem horas.
export const restBetweenDuties = (prev, next, { inBase = true, postFlightMin = 0 } = {}) => {
  if (!prev || !next) return null;
  const repPrev = parseHhmm(prev.report_time);
  const onPrev = parseHhmm(prev.block_on), soPrev = parseHhmm(prev.signOff);
  const repNext = parseHhmm(next.report_time);
  let endPrev = soPrev != null ? soPrev : (onPrev != null ? (onPrev + (postFlightMin || 0)) % 1440 : null);
  if (endPrev == null || repNext == null) return null;
  let gapMin = repNext - endPrev; while (gapMin < 0) gapMin += 1440;          // next reporta depois do fim de prev
  let prevDutyMin = repPrev != null ? endPrev - repPrev : 0; while (prevDutyMin < 0) prevDutyMin += 1440;
  const place = inBase ? 'base' : 'away';
  const minRest = Math.max(inBase ? 720 : 600, prevDutyMin);                  // 12h base / 10h fora, nunca < serviço anterior
  let kind, legal;
  if (gapMin >= minRest) { kind = 'rest'; legal = true; }
  else if (gapMin >= 180) { kind = 'split'; legal = true; }                   // ≥3h → split duty (1 FDP)
  else { kind = 'continuous'; legal = false; }                               // <3h → não são 2 serviços
  return { gapMin, requiredMin: minRest, kind, legal, place, prevDutyMin };
};

// Um DIA pode ter N PERÍODOS DE SERVIÇO — a EASA conta por SERVIÇO, não por dia civil
// (ORO.FTL.210/245; dois FDP no mesmo dia são legais, com repouso entre eles). Funde os
// registos FTL de TODOS os serviços do dia:
//   • SERVIÇO e VOO  → SOMAM (ORO.FTL.210, acumulados de 28 d).
//   • PSV do dia      → o PIOR (ORO.FTL.205): se ALGUM serviço excede, o dia é ilegal.
//   • REPOUSO         → o do ÚLTIMO serviço (o que vale para a frente).
//   • `parts`         → o PSV de cada serviço, para o detalhe e o registo 245.
// `list` = [serviço1, serviço2, …] (cada um na forma da tabela `duties`). 1 serviço (ou 0/1
// não-nulo) → idêntico ao `dutyToFtlDay` (o caso normal não muda nada).
export const dayFtlFromDuties = (list = [], opts = {}) => {
  const arr = Array.isArray(list) ? list : [list];
  // Mantém a duty CRUA ao lado do registo FTL (precisa-se das horas p/ o repouso entre serviços).
  const paired = arr.map((d) => ({ duty: d, entry: dutyToFtlDay(d, opts) })).filter((p) => p.entry);
  if (!paired.length) return null;
  // Ordena cronologicamente pelo report → os serviços do dia ficam por ordem (1.º, 2.º, …).
  paired.sort((a, b) => (parseHhmm(a.duty.report_time) ?? 0) - (parseHhmm(b.duty.report_time) ?? 0));
  const entries = paired.map((p) => p.entry);
  if (entries.length === 1) return entries[0];
  const r1 = (n) => +(Number(n) || 0).toFixed(1);
  const servico = r1(entries.reduce((s, e) => s + (e.servico || 0), 0));
  const voo = r1(entries.reduce((s, e) => s + (e.voo || 0), 0));
  // PSV do dia = o PIOR: prioriza o que EXCEDE; entre vários, o de maior excesso.
  const excMin = (p) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String((p && p.excess) || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
  const worst = entries.reduce((a, b) => {
    if (!!b.psv.over !== !!a.psv.over) return b.psv.over ? b : a;
    return excMin(b.psv) > excMin(a.psv) ? b : a;
  });
  const last = entries[entries.length - 1];
  // Repouso ENTRE serviços consecutivos (235 + 220): classifica cada par (rest/split/continuous).
  const between = [];
  for (let i = 0; i < paired.length - 1; i++) {
    const rb = restBetweenDuties(paired[i].duty, paired[i + 1].duty, { inBase: opts.inBase !== false, postFlightMin: opts.postFlightMin || 0 });
    if (rb) between.push(rb);
  }
  const split = between.some((b) => b.kind === 'split');         // algum par é split duty (1 FDP)
  const restShort = between.some((b) => b.kind === 'continuous'); // algum par perto demais (não são 2)
  return { src: 'duty', psv: worst.psv, servico, voo, rest: last.rest, parts: entries.map((e) => e.psv), between, split, restShort };
};

// Reconstrói as entradas FTL DERIVADAS (src:'duty') em FALTA no `dayLog`, a partir
// das duties (escala). FILL-ONLY: só preenche dias AUSENTES — nunca toca em entradas
// existentes (manuais OU derivadas), logo é idempotente e não destrói histórico. Serve
// a migração do histórico FTL para um dispositivo NOVO / após reinstalar (as duties
// sincronizam do servidor, mas o dayLog é local). Duties apagadas/sem horas são
// ignoradas. Devolve a MESMA referência se nada faltar (não dispara re-render).
export const reconcileDayLog = (duties = {}, dayLog = {}, { postFlightMin = 0, isPilot = false } = {}) => {
  let next = dayLog, changed = false;
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted || dayLog[date]) continue;   // só dias em falta (e não-apagados)
    // Um dia pode ter N períodos de serviço (210 conta por serviço): primária + `extra`.
    const primary = {
      report_time: d.report_time, block_off: d.block_off, block_on: d.block_on,
      sectors: d.sectors, flight_minutes: d.flight_minutes, kind: d.kind, signOff: d.signOff, special: d.special,
    };
    const entry = dayFtlFromDuties([primary, ...((d.extra && d.extra.length) ? d.extra : [])], { postFlightMin, isPilot });
    if (!entry) continue;                              // sem report/block_on → não deriva
    if (!changed) { next = { ...dayLog }; changed = true; }
    next[date] = entry;
  }
  return next;
};

// Índice de risco de fadiga (consultivo) a partir de um resultado de computeDuty.
// `restMin` default = repouso mínimo calculado após esta duty; `consecutiveDisruptive`
// = dias disruptivos seguidos (ex.: de computeRestSequence) — 0 se não fornecido.
export const fatigueFromDuty = (d, { restMin = null, consecutiveDisruptive = 0 } = {}) => {
  if (!d || !d.fdp) return null;
  return computeFatigue({
    reportMin: d.reportMin, endMin: d.endMin, sectors: d.sectors,
    maxFdpMin: d.fdp.maxFdpMin, actualFdpMin: d.fdp.actualFdpMin,
    restMin: restMin != null ? restMin : (d.rest ? d.rest.restMin : null),
    consecutiveDisruptive,
  });
};

export {
  computeFdp, computeFdpByBand, computeRest, computeFlightTime, computeDutyTime, validateLimits,
  validateDuty, validateRest, isNightDuty, overlapsWOCL,
  computeAcclimatisation, computeDiscretion,
  computeInflightRest, computeFlightCrewFdp, computeStandby, computeReducedRest, computeTimeZoneRest,
  computeDelayedReporting, computeExtensionUsage, classifyDisruptive, computeRestSequence,
  computeFatigue,
  withinBand, fmtBandRange, bandRangeMins,
  DUTY_WINDOWS, FLIGHT_WINDOWS, QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED,
};
export * from './utils/time';
