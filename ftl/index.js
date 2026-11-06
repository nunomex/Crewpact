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
import { computeInflightRest, computeFlightCrewFdp, computeCabinAugmentedFdp } from './calculators/inflightRestCalculator';
import { INFLIGHT_LONG_SECTOR_MIN, INFLIGHT_MIN_REST_MIN } from './rules/inflightRestRules';
import { computeStandby } from './calculators/standbyCalculator';
import { computeReducedRest } from './calculators/reducedRestCalculator';
import { computeTimeZoneRest } from './calculators/timeZoneRestCalculator';
import { computeDelayedReporting } from './calculators/delayedReportingCalculator';
import { computeExtensionUsage } from './calculators/extensionUsageCalculator';
import { computeRest } from './calculators/restCalculator';
import { classifyDisruptive } from './calculators/disruptiveCalculator';
import { computeRestSequence } from './calculators/sequenceCalculator';
import { computeRecovery, localNightsIn, nthLocalNightEnd } from './calculators/recoveryCalculator';
import { computeFatigue } from './calculators/fatigueCalculator';
import { computeFlightTime } from './calculators/flightTimeCalculator';
import { isNightDuty, overlapsWOCL } from './calculators/woclCalculator';
import { validateDuty } from './validators/validateDuty';
import { validateRest } from './validators/validateRest';
import { validateLimits, computeDutyTime, limitsAround } from './validators/validateLimits';
import { entryMin } from './calculators/cumulativeCalculator';
import { withinBand, fmtBandRange, bandRangeMins, splitCountedBreakMin, splitAccLevel, SPLIT_ADMIN_MIN, SPLIT_MIN_BREAK_H, isFdpDuty } from './rules/fdpRules';
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from './rules/flightTimeRules';
import { QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED } from './constants/tables';
import { parseHhmm, minToHhmm, durationMin } from './utils/time';
import { acclimLetter } from './rules/acclimatisationRules';
import { airportOffsetMin, legZulu } from '../data/zulu';

// Versão do MOTOR de cálculo FTL. Carimba cada registo diário derivado (dutyToFtlDay/
// dayFtlFromDuties → dayLog), para que uma futura ERRATA (docs/ERRATA.md §E6) saiba com que
// versão um registo foi computado e possa re-avaliar SÓ os afetados. REGRA: incrementar
// SEMPRE que uma regra/tabela FTL ou um cálculo muda (mesmo correção de bug). Pré-requisito
// da errata fina — hoje só CARIMBA (a deteção de afetados e o recompute vêm depois).
// v2 (2026-11-06): auditoria dos cálculos, bloco 1 — as entradas v1 recalculam-se sozinhas (reconcileDayLog).
// v3 (2026-11-06, "a lei é que manda"): sem um facto de que a lei precisa → intervalo (garantido/possível) e incerto.
export const ENGINE_VERSION = 3;

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
//   augmented   = { restClass:'c1'|'c2'|'c3', additionalCrew?:1|2, fcRestClass?, cabinRestMin? }
//                 piloto: restClass = a dos pilotos. Cabine: restClass = a da cabine; fcRestClass = a dos pilotos;
//                 cabinRestMin = o repouso a bordo da cabine (sem eles → o mais restritivo, ver computeCabinAugmentedFdp).
//   longestSectorMin = o maior setor (min) → CS FTL.1.205(c)(4)
//   delayedFrom = hora original de apresentação 'HH:MM' (a `report` é a adiada)
//   preStandby  = { type:'airport'|'other', standbyH, startMin? }
export const computeDuty = ({
  state = 'acc', report, end = null, sectors = 1, splitBreakH = 0, splitBreakStart = null,
  accommodation = false, inBase = true, extended = false, discretion = false, inFlightRest = false,
  postFlightMin = 0, augmented = null, delayedFrom = null, preStandby = null, isPilot = false,
  longestSectorMin, tzDiffH = 0, restExtended = false, cabinReportGapMin, splitAdminMin,
  bandShiftMin = 0, elapsedAdjMin = 0, startEarlierMin = 0, delayedAtMin,
}) => {
  // startEarlierMin = o PSV começa X min ANTES da apresentação registada (CS FTL.1.205(d)(1)(ii): 2.ª notificação de um
  // adiamento). delayedAtMin = a hora adiada a usar no máximo (CS 205(d)(1)(iii)/(iv)) quando não é a apresentação.
  // bandShiftMin = minutos a somar à apresentação para ler a faixa do Quadro 2 na HORA DE REFERÊNCIA (ORO.FTL.105(2)),
  // quando a apresentação vem noutro relógio (ex.: o da base). elapsedAdjMin = correção do PSV para tempo DECORRIDO
  // (105(12)) quando os relógios não batem (hora de verão, fusos). Ambos vêm do ftlForDuty (Zulu das legs).
  const reportMin = parseHhmm(report);
  const endMin = parseHhmm(end);
  const splitStartMin = parseHhmm(splitBreakStart);
  // ── "A lei é que manda" (2026-11-06): quando falta um FACTO de que a lei precisa, o motor não inventa um valor.
  // Calcula o máximo GARANTIDO (o que a lei dá em qualquer caso) e o máximo POSSÍVEL; o veredicto só sai quando
  // não depende do facto em falta (senão: incerto). Os factos que podem faltar:
  //   • accommodation 'unknown' — o alojamento na pausa do repartido (CS FTL.1.220(d)(e));
  //   • augmented da cabine sem pilotos extra / classe dos pilotos / repouso a bordo (ORO.FTL.205(e), CS 205(c));
  //   • longestSectorMin null — o maior setor, para a hora a mais do CS 205(c)(4);
  //   • cabinReportGapMin null — a apresentação dos pilotos, para a cabine (ORO.FTL.205(c)).
  // `undefined` nos dois últimos = não se aplica (calculadoras e chamadas antigas: comportamento de sempre).
  const accUnknown = accommodation === 'unknown';
  const accLo = accUnknown ? 'none' : accommodation, accHi = accUnknown ? 'suitable' : accommodation;
  const aug = augmented && augmented.restClass ? augmented : null;
  const cabAugUnknown = !!aug && !isPilot && (aug.additionalCrew == null || aug.fcRestClass == null || aug.cabinRestMin == null);
  const sectorUnknown = !!aug && longestSectorMin === null && (sectors | 0) <= 2;
  const unknowns = [];
  if (accUnknown && splitBreakH > 0) unknowns.push('accommodation');
  // CS FTL.1.220(b): o desconto da pausa é o do Manual de Operações. Sem ele (null): garantido sem extensão (um desconto
  // que pode ser tão grande quanto o OM disser), possível com o mínimo de 30 min. undefined = 30 (calculadoras).
  const admUnknown = splitAdminMin === null;
  if (admUnknown && splitBreakH > 0) unknowns.push('splitAdmin');
  if (cabAugUnknown) unknowns.push('augmented');
  if (sectorUnknown) unknowns.push('longSector');
  if (!isPilot && cabinReportGapMin === null) unknowns.push('pilotReport');

  // Máximo (min) para uma hora de faixa `bandRep` e um lado ('lo' garantido | 'hi' possível) dos factos em falta.
  const maxOf = (bandRep0, side) => {
    const hi = side === 'hi';
    const bandRep = bandRep0 == null ? null : (((bandRep0 + (bandShiftMin || 0)) % 1440) + 1440) % 1440;
    const adm = admUnknown ? (hi ? SPLIT_ADMIN_MIN : Infinity) : splitAdminMin;
    const b = computeFdp({ state, reportMin: bandRep, endMin, sectors, splitBreakH, splitBreakStartMin: splitStartMin, accommodation: hi ? accHi : accLo, extended, splitAdminMin: adm });
    let m = b.maxFdpMin, na = b.notAllowed, nar = b.notAllowedReason, modifier = null, augInfo = null, sbRedMin = 0;
    // Adiamento (CS 205(d)): o máximo pela hora mais limitativa (original vs adiada).
    if (delayedFrom != null && bandRep != null) {
      const o0 = parseHhmm(delayedFrom);
      const dAt = delayedAtMin != null ? (((delayedAtMin + (bandShiftMin || 0)) % 1440) + 1440) % 1440 : bandRep;
      const dr = computeDelayedReporting({ state, origMin: o0 == null ? null : (((o0 + (bandShiftMin || 0)) % 1440) + 1440) % 1440, delayedMin: dAt, sectors });
      if (dr.maxFdpMin != null) { m = dr.maxFdpMin; modifier = 'delayed'; }
    }
    // Repouso a bordo: piloto CS 205(c)(2)+(4); cabine = o PSV dos pilotos limitado pela classe e pelo repouso a bordo da
    // própria cabine (tabela (c)(3)). SUBSTITUI o teto básico. Acima de 3 setores → não permitido.
    if (aug) {
      const ls = sectorUnknown ? (hi ? INFLIGHT_LONG_SECTOR_MIN + 1 : null) : (longestSectorMin == null ? null : longestSectorMin);
      const cabAug = cabAugUnknown
        ? { ...aug, additionalCrew: aug.additionalCrew != null ? aug.additionalCrew : (hi ? 2 : 1), fcRestClass: aug.fcRestClass != null ? aug.fcRestClass : (hi ? 'c1' : 'c3'), cabinRestMin: aug.cabinRestMin != null ? aug.cabinRestMin : (hi ? 24 * 60 : INFLIGHT_MIN_REST_MIN) }
        : aug;
      const a = isPilot
        ? computeFlightCrewFdp({ restClass: aug.restClass, additionalCrew: aug.additionalCrew, sectors, longestSectorMin: ls })
        : computeCabinAugmentedFdp({ ...cabAug, sectors, longestSectorMin: ls });
      augInfo = a;
      if (a.overSectors) { na = true; nar = 'inflightSectors'; }
      else if (!isPilot && a.restTooShort) { na = true; nar = 'inflightRest'; }
      else if (a.maxFdpMin != null) { m = a.maxFdpMin; modifier = 'augmented'; }
    }
    // Standby anterior (CS 225): reduz o teto (aeroporto > 4 h e o teto de 16 h; casa > 6 h).
    if (preStandby && preStandby.standbyH > 0 && m != null) {
      const sb = computeStandby({ type: preStandby.type, standbyH: preStandby.standbyH, maxFdpMin: m, startMin: preStandby.startMin != null ? preStandby.startMin : null });
      sbRedMin = sb.reductionMin;
      m = sb.reducedMaxFdpMin;
    }
    return { m: na ? null : m, na, nar, modifier, augInfo, sbRedMin, base: b };
  };

  // ORO.FTL.205(c), cabine: o máximo baseia-se na apresentação DOS PILOTOS e pode subir pela diferença (até 1 h); o PSV
  // conta desde a apresentação da cabine. Diferença conhecida → uma conta; desconhecida (null) → os pilotos podem ter-se
  // apresentado de 0 a 60 min depois: o garantido é o menor de todos, o possível o maior.
  const gaps = (isPilot || cabinReportGapMin === undefined || reportMin == null) ? [0]
    : cabinReportGapMin === null ? Array.from({ length: 61 }, (_, i) => i)
    : [Math.max(0, cabinReportGapMin)];
  let lo = null, hi = null, loR = null, hiR = null, anyAllowed = false, naR = null;
  for (const g of gaps) {
    const band = reportMin == null ? null : (reportMin + g) % 1440;
    const ext = Math.min(g, 60);
    const rl = maxOf(band, 'lo'), rh = maxOf(band, 'hi');
    if (rh.m != null) anyAllowed = true;
    if (!naR && rl.na) naR = rl;
    const l = rl.m == null ? null : rl.m + ext, h = rh.m == null ? null : rh.m + ext;
    if (l != null && (lo == null || l < lo)) { lo = l; loR = rl; }
    if (rl.m == null && rh.m != null) { lo = 0; loR = loR || rh; }   // garantido nenhum, possível algum
    if (h != null && (hi == null || h > hi)) { hi = h; hiR = rh; }
  }
  const base = computeFdp({ state, reportMin, endMin, sectors, splitBreakH, splitBreakStartMin: splitStartMin, accommodation: accLo, extended, splitAdminMin: admUnknown ? Infinity : splitAdminMin });
  const ref = loR || hiR || naR || { na: base.notAllowed, nar: base.notAllowedReason, modifier: null, augInfo: null, sbRedMin: 0 };
  const notAllowed = !anyAllowed && (reportMin != null) && (ref.na || hi == null);
  const notAllowedReason = notAllowed ? (ref.nar || base.notAllowedReason) : null;
  const maxMin = notAllowed ? null : lo;
  const maxHiMin = notAllowed ? null : hi;
  const exact = maxMin == null || maxHiMin == null || maxMin === maxHiMin;
  const actual = base.actualFdpMin != null ? base.actualFdpMin + (elapsedAdjMin || 0) + (startEarlierMin || 0) : null;   // tempo decorrido (105(12))
  const over = !notAllowed && actual != null && maxHiMin != null && actual > maxHiMin;
  const uncertain = !notAllowed && !over && actual != null && maxMin != null && actual > maxMin;
  const excessMin = over ? actual - maxHiMin : 0;
  // Avisos do standby (CS 225) com o PSV REAL do serviço e o teto possível.
  let stdbyOver = false, stdbyOverKind = null;
  if (preStandby && preStandby.standbyH > 0) {
    const sb = computeStandby({ type: preStandby.type, standbyH: preStandby.standbyH, maxFdpMin: maxHiMin, actualFdpMin: actual, startMin: preStandby.startMin != null ? preStandby.startMin : null });
    if (sb.combinedOver) { stdbyOver = true; stdbyOverKind = 'combined'; }
    else if (sb.awakeOver) { stdbyOver = true; stdbyOverKind = 'awake'; }
    else if (sb.overMaxStandby) { stdbyOver = true; stdbyOverKind = 'maxStandby'; }
  }
  const fdp = {
    ...base,
    actualFdpMin: actual, actualFdpStr: actual != null ? minToHhmm(actual) : null,
    maxFdpMin: maxMin, maxFdpStr: maxMin != null ? minToHhmm(maxMin) : null,
    maxHiMin, maxHiStr: maxHiMin != null ? minToHhmm(maxHiMin) : null,
    exact, uncertain, unknowns: exact ? [] : unknowns.filter((u) => u !== 'pilotReport' || gaps.length > 1),
    over, excessMin, excessStr: over ? minToHhmm(excessMin) : null,
    notAllowed, notAllowedReason,
    modifier: ref.modifier, stdbyReductionMin: ref.sbRedMin || 0, stdbyOver, stdbyOverKind, aug: ref.augInfo,
  };

  // Hora-limite de calços = apresentação + PSV máximo GARANTIDO (ORO.FTL.105(19)): até aí está dentro em qualquer caso.
  // A discrição do comandante NÃO entra: é para imprevistos, nunca para planear (205 f).
  // No relógio da apresentação: se ele mudar pelo caminho (hora de verão), a hora de relógio desloca-se o mesmo.
  const latestMin = (reportMin != null && fdp.maxFdpMin != null && !fdp.notAllowed) ? reportMin - (startEarlierMin || 0) + fdp.maxFdpMin - (elapsedAdjMin || 0) : null;

  // Período de serviço = PSV + serviço pós-voo (a base do repouso e do acumulado).
  const dutyPeriodMin = fdp.actualFdpMin != null ? fdp.actualFdpMin + (postFlightMin || 0) : null;
  // Repouso mínimo a seguir (ORO.FTL.235 a/b): o serviço ou 12 h (base) / 10 h (fora); 14 h fora com fuso ≥ 4 h
  // (CS 235(b)(3)(ii)) e depois de repouso a bordo (CS 205(c)(6)); +2 h (ou +4 h só depois) com prolongamento (205(d)(1)).
  // `restExtended` = o PSV planeado cabe no prolongamento (tirado da escala) → o repouso também sobe.
  const hadInflight = !!aug || !!inFlightRest;
  const rest = computeRest({ prevDutyMin: dutyPeriodMin || 0, inBase, tzDiffH, inflightRest: hadInflight, extended: !!extended || !!restExtended });
  const duty = validateDuty({ fdp, reportMin, endMin, sectors });
  // Discrição do comandante (ORO.FTL.205(f)(1)(i)): sobre o máximo de 205(b)/(e) ou 220 — NUNCA sobre o prolongamento
  // de 205(d) (auditoria A-157/A-292), e o prolongamento não combina com repouso a bordo (205(d)(4)) → +2 h.
  // Com um facto em falta: "acima da margem" só quando passa a margem do máximo POSSÍVEL.
  const discBase = (m) => (extended ? computeFdp({ state, reportMin, endMin, sectors, extended: false }).maxFdpMin : m);
  let disc = null;
  if (discretion) {
    const inF = !extended && hadInflight;
    disc = computeDiscretion({ maxFdpMin: discBase(fdp.maxFdpMin), actualFdpMin: actual, restMin: rest.restMin, inFlightRest: inF });
    if (!exact && !extended) {
      const dh = computeDiscretion({ maxFdpMin: fdp.maxHiMin, actualFdpMin: actual, restMin: rest.restMin, inFlightRest: inF });
      disc = { ...disc, over: dh.over, excessMin: dh.excessMin, excessStr: dh.excessStr, maxHiStr: dh.maxStr, uncertain: disc.over && !dh.over };
    }
  }
  return {
    reportMin, endMin, sectors, state, inBase,
    postFlightMin: postFlightMin || 0,
    dutyPeriodMin, dutyPeriodStr: dutyPeriodMin != null ? minToHhmm(dutyPeriodMin) : null,
    latestOnBlockMin: latestMin,
    latestOnBlockStr: latestMin != null ? minToHhmm(latestMin % 1440) : null,
    latestOnBlockNextDay: latestMin != null && latestMin >= 1440,
    fdp, rest, discretion: disc, ...duty,
  };
};

// ── Voo ao vivo: veredicto legal do PSV com o ATRASO REAL (ORO.FTL.105 / 205 b/f) ────────────
// A lei mede o PSV da apresentação até ao ÚLTIMO on-block REAL (105) → o atraso à CHEGADA
// estica o fim do PSV. O TETO fica FIXO pela hora de apresentação e nº de setores (205 b) — o
// atraso NÃO o move. Acima do teto entra na DISCRIÇÃO do comandante (205 f: +2h normal, +3h com
// repouso a bordo); acima da discrição é ILEGAL. `d` = resultado do computeDuty do serviço
// PLANEADO (já crew-aware — o teto vem de lá, que distingue piloto/cabine no 205 c). `arrDelayMin`
// = atraso à chegada, em minutos (multi-setor: assume-se propagação ao último setor — lado
// conservador). `projected:true` quando a chegada ainda é ESTIMADA (não ATA). Devolve null sem
// PSV/teto (sem veredicto). Determinístico: reusa o computeDiscretion golden, não inventa nada.
export const liveFdpVerdict = (d, arrDelayMin, { projected = false } = {}) => {
  if (!d || !d.fdp || d.fdp.actualFdpMin == null || d.fdp.maxFdpMin == null) return null;
  const add = Math.max(0, Math.round(arrDelayMin || 0));
  const realMin = d.fdp.actualFdpMin + add;   // PSV realizado = planeado + atraso à chegada
  const maxMin = d.fdp.maxFdpMin;             // teto FIXO pela apresentação (205 b), crew-aware
  const disc = computeDiscretion({
    maxFdpMin: maxMin, actualFdpMin: realMin,
    restMin: d.rest ? d.rest.restMin : 0,
    inFlightRest: d.fdp.modifier === 'augmented',   // 205 f: repouso a bordo → +3h em vez de +2h
  });
  // "A lei é que manda": com um facto em falta, o teto é um intervalo — entre o garantido e o possível, incerto.
  const hiMin = d.fdp.exact === false && d.fdp.maxHiMin != null ? d.fdp.maxHiMin : maxMin;
  const discHi = hiMin !== maxMin ? computeDiscretion({ maxFdpMin: hiMin, actualFdpMin: realMin, restMin: d.rest ? d.rest.restMin : 0, inFlightRest: d.fdp.modifier === 'augmented' }) : disc;
  const verdict = realMin <= maxMin ? 'legal' : realMin <= hiMin ? 'uncertain' : discHi.used ? 'discretion' : 'over';
  return {
    verdict, projected, delayMin: add,
    realStr: minToHhmm(realMin), maxStr: minToHhmm(maxMin), discMaxStr: disc.maxStr,
    overMaxStr: realMin > maxMin ? minToHhmm(realMin - maxMin) : null,  // acima do teto planeado (205 b)
    overDiscStr: discHi.over ? discHi.excessStr : null,                 // acima da discrição (205 f) = ilegal
  };
};

// Split duty a partir das LEGS (CS FTL.1.220): a MAIOR pausa em terra ≥3h entre setores
// (on-block da perna anterior → off-block da seguinte, com volta à meia-noite). "A single break"
// → só a maior conta. DERIVADO das legs (não persistido à parte) → sempre coerente com as horas
// reais e sobrevive a gravar/reler (as legs vão no roster_meta). {0,null} se não houver pausa ≥3h.
const splitFromLegs = (legs) => {
  if (!Array.isArray(legs) || legs.length < 2) return { splitBreakH: 0, splitBreakStart: null };
  let bestMin = 0, start = null;
  for (let i = 0; i < legs.length - 1; i++) {
    const on = parseHhmm(legs[i].on), off = parseHhmm(legs[i + 1].off);   // arrival(i) → departure(i+1) = terra
    if (on == null || off == null) continue;
    let gap = off - on; while (gap < 0) gap += 1440;
    if (gap >= 180 && gap > bestMin) { bestMin = gap; start = legs[i].on; }
  }
  return { splitBreakH: bestMin / 60, splitBreakStart: start };
};

// O MAIOR setor (min de voo, calços a calços) — para a hora a mais do CS FTL.1.205(c)(4). Prefere a Zulu das legs
// (instantes, sem misturar fusos); sem Zulu, o relógio (com volta à meia-noite); sem legs e com 1 setor, o tempo de
// voo do serviço. null = desconhecido (a hora a mais não se aplica: o lado seguro).
export const longestSectorOf = (duty = {}) => {
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  let best = null;
  for (const lg of legs) {
    const off = parseHhmm(lg.offZ || lg.off), on = parseHhmm(lg.onZ || lg.on);
    if (off == null || on == null) continue;
    const m = durationMin(off, on);
    if (best == null || m > best) best = m;
  }
  if (best == null && !legs.length && (duty.sectors || 0) <= 1 && duty.flight_minutes > 0) best = duty.flight_minutes;
  return best;
};

// Diferença de fuso (h) do serviço face à base (CS FTL.1.235(b)(3)(ii): "an FDP involves a 4-hour time difference
// or more"): a maior entre o fuso da base e o de cada aeroporto das legs, na data do serviço (hora de verão). 0 sem
// base, sem legs ou sem fusos conhecidos (o lado comum: 10/12 h).
// O mesmo, com SINAL: positivo = para leste da base, negativo = para oeste (CS FTL.1.235(b)(4): rotações alternadas).
const tzSignedOf = (duty = {}, base = null, date = null) => {
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  const b = String(base || '').trim().toUpperCase();
  if (!b || !legs.length) return 0;
  const t = date ? Date.parse(`${date}T12:00:00Z`) : Date.now();
  const ob = airportOffsetMin(b, t);
  if (ob == null) return 0;
  let best = 0;
  for (const lg of legs) for (const ap of [lg.dep, lg.arr]) {
    const o = ap ? airportOffsetMin(String(ap).toUpperCase(), t) : null;
    if (o != null && Math.abs(o - ob) > Math.abs(best)) best = o - ob;
  }
  return best / 60;
};
const tzDiffOf = (duty = {}, base = null, date = null) => {
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  const b = String(base || '').trim().toUpperCase();
  if (!b || !legs.length) return 0;
  const t = date ? Date.parse(`${date}T12:00:00Z`) : Date.now();
  const ob = airportOffsetMin(b, t);
  if (ob == null) return 0;
  let max = 0;
  for (const lg of legs) for (const ap of [lg.dep, lg.arr]) {
    const o = ap ? airportOffsetMin(String(ap).toUpperCase(), t) : null;
    if (o != null) max = Math.max(max, Math.abs(o - ob));
  }
  return max / 60;
};

// Relógios do serviço a partir da Zulu das legs (a autoritativa do calendário, ou a do fuso de cada aeroporto):
//  • a apresentação e a 1.ª saída de calços estão no MESMO relógio (o da escala) → a diferença é o pré-voo, e a
//    apresentação em Zulu é a saída em Zulu menos esse pré-voo;
//  • HORA DE REFERÊNCIA (ORO.FTL.105(2)): a hora local no ponto de apresentação, se o seu fuso está a ≤ 2 h do da
//    aclimatação (a base); mais longe, a hora da base (estado B do Quadro 1 — a aclimatação no longo curso fica por fazer);
//  • TEMPO DECORRIDO (105(12)): da apresentação aos últimos calços em Zulu — a hora de verão e os fusos não enganam.
// Sem legs com horas, ou sem fusos conhecidos → { 0, 0 } (o relógio, como antes).
const nrm = (x) => ((((x + 720) % 1440) + 1440) % 1440) - 720;
const zuluTimingOf = (duty = {}, base = null, date = null, refMode = 'auto') => {
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  const rep = parseHhmm(duty.report_time);
  if (!legs.length || rep == null) return { bandShiftMin: 0, elapsedAdjMin: 0, reportMs: null };
  const l0 = legs[0], lN = legs[legs.length - 1];
  const day = date || null;
  const off0 = parseHhmm(l0.off), offZ0 = parseHhmm(day ? legZulu(day, l0, 'off') : l0.offZ);
  if (off0 == null || offZ0 == null) return { bandShiftMin: 0, elapsedAdjMin: 0, reportMs: null };
  const digitsOff = nrm(off0 - offZ0);                          // o relógio das horas da escala (desvio UTC)
  const reportZ = ((offZ0 - durationMin(rep, off0)) % 1440 + 1440) % 1440;
  // Tempo decorrido: só quando o fim registado é a chegada do último setor (senão não se sabe o relógio do fim).
  let elapsedAdjMin = 0;
  const onN = parseHhmm(lN.on), onZN = parseHhmm(day ? legZulu(day, lN, 'on') : lN.onZ), end = parseHhmm(duty.block_on);
  if (onN != null && onZN != null && end != null && end === onN) {
    const adj = durationMin(reportZ, onZN) - durationMin(rep, end);
    if (Math.abs(adj) <= 180) elapsedAdjMin = adj;
  }
  // Hora de referência.
  let bandShiftMin = 0;
  const b = String(base || '').trim().toUpperCase();
  const t = day ? Date.parse(`${day}T12:00:00Z`) : Date.now();
  const depOff = l0.dep ? airportOffsetMin(String(l0.dep).toUpperCase(), t) : null;
  const baseOff = b ? airportOffsetMin(b, t) : null;
  if (depOff != null) {
    // 'auto': ≤ 2 h da base → hora local; mais longe → a da base (estado B). 'dep'/'base' vêm do Quadro 1 (D/B).
    const refOff = refMode === 'dep' ? depOff : refMode === 'base' && baseOff != null ? baseOff
      : (baseOff == null || Math.abs(depOff - baseOff) <= 120) ? depOff : baseOff;
    bandShiftMin = nrm(refOff - digitsOff);
  }
  // O instante da apresentação (ms UTC): as horas da escala, no dia `day`, menos o desvio do seu relógio.
  let reportMs = null;
  if (day) { const [y, m, d] = day.split('-').map(Number); reportMs = Date.UTC(y, m - 1, d, Math.floor(rep / 60), rep % 60) - digitsOff * 60000; }
  return { bandShiftMin, elapsedAdjMin, reportMs, depOff, baseOff };
};

// ORO.FTL.105(1) + Quadro 1: o estado de aclimatação de um serviço que começa a MAIS de 2 h da base. A referência é a
// última apresentação dentro da faixa de 2 h da base (nos 6 dias antes: o Quadro 1 acaba nas 120 h); o tempo decorrido
// conta-se daí. Sem nenhuma na escala mas com serviços anteriores → mais de 120 h → a coluna "≥ 120". Sem nenhum registo
// anterior → não se sabe (unknown). Devolve { letter: 'in'|'B'|'D'|'X'|null, diffH, elapsedH, unknown }; null sem dados.
// Limite assumido: a aclimatação de partida é a da base (rotações que saem da base e voltam a ela).
const acclimOf = (duty, { base, date, duties }) => {
  if (!duties || !date || !base) return null;
  const me = zuluTimingOf(duty, base, date);
  if (me.reportMs == null || me.depOff == null || me.baseOff == null) return null;
  const diffH = Math.abs(me.depOff - me.baseOff) / 60;
  if (diffH <= 2) return { letter: 'in', diffH };
  let refMs = null;
  const [y, m, d] = String(date).split('-').map(Number);
  for (let k = 0; k <= 6; k++) {
    const t = new Date(y, m - 1, d - k, 12);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const x = duties[iso];
    if (!x || x.deleted) continue;
    for (const s of [x, ...(Array.isArray(x.extra) ? x.extra : [])]) {
      if (!s || !s.report_time) continue;
      const z = zuluTimingOf(s, base, iso);
      if (z.reportMs == null || z.reportMs >= me.reportMs || z.depOff == null || z.baseOff == null) continue;
      if (Math.abs(z.depOff - z.baseOff) <= 120 && (refMs == null || z.reportMs > refMs)) refMs = z.reportMs;
    }
  }
  if (refMs != null) { const elapsedH = (me.reportMs - refMs) / 3600000; return { letter: acclimLetter(diffH, elapsedH), diffH, elapsedH }; }
  const anyEarlier = Object.keys(duties).some((iso) => iso < date && duties[iso] && !duties[iso].deleted);
  if (anyEarlier) return { letter: acclimLetter(diffH, 1e6), diffH, elapsedH: null };
  return { letter: null, diffH, unknown: true };
};

// O serviço é um PSV? ORO.FTL.105(12): o PSV "inclui um setor ou série de setores". Standby em casa, formação,
// escritório e posicionamento isolado NÃO são PSV (auditoria A-166/A-247): contam para o 210 e para o repouso, mas
// a tabela do Quadro 2 não os julga. O standby de aeroporto SEM alojamento é "serviço no aeroporto" e o PSV conta
// desde a apresentação (ORO.FTL.225(d)) — continua julgado (o lado seguro).
// (a definição vive em ftl/rules/fdpRules.js — o motor de recuperação também a usa)

// Base vs FORA da base (ORO.FTL.235): decide o repouso mínimo (12h base / 10h fora) e a fronteira
// rest/split. Deriva do ÚLTIMO aeroporto REAL (legs > rota) vs a base do tripulante — NUNCA por
// paridade (que é palpite → arriscaria subestimar o repouso). Devolve true (fora, fiável) /
// false (base, fiável) / null (sem dados → o caller usa o default conservador = na base).
const endsAwayReliable = (duty, base) => {
  const b = String(base || '').trim().toUpperCase();
  if (!b || !duty) return null;
  let lastAp = (Array.isArray(duty.legs) && duty.legs.length) ? duty.legs[duty.legs.length - 1].arr : null;
  if (!lastAp && duty.route) { const aps = String(duty.route).split(/[^A-Za-z]+/).filter(Boolean); lastAp = aps[aps.length - 1]; }
  if (!lastAp) return null;
  return String(lastAp).trim().toUpperCase() !== b;
};

// Adapter: registo bruto de duty (tabela `duties`) → entrada do `dayLog` (store FTL),
// via o motor. A duty não guarda aclimatação/base → defaults 'acc' e na base (inBase).
// `src:'duty'` marca a entrada como DERIVADA (distingue de um registo manual do simulador).
// Devolve null sem dados suficientes (sem apresentação ou sem on-block).
// Um serviço da escala (forma da tabela `duties`) → o resultado do motor (computeDuty), DA MESMA FORMA em todo o lado:
// dayLog, Início, Detalhe, importação, Simulação e registo 245 (auditoria A-175: o Início, o Detalhe e o dayLog davam
// números diferentes para o mesmo serviço). Devolve null sem apresentação. Junta ao resultado:
//   isFdp (é PSV? ver isFdpDuty) · kind · pf (o pós-voo usado) · inBase (base/fora pela localização real).
// `ctx` = { postFlightMin, isPilot, base, inBase, state }.
export const ftlForDuty = (duty = {}, ctx = {}) => {
  const { state = 'acc', inBase = true, base = null, postFlightMin = null, isPilot = false, date = null } = ctx || {};
  if (!duty || !duty.report_time) return null;
  // Base vs fora pela localização REAL (ORO.FTL.235: 12h base / 10h fora). Local fiável manda;
  // desconhecido → o default `inBase` (conservador = na base).
  const away = endsAwayReliable(duty, base);
  const ib = away == null ? inBase : !away;
  // Serviço pós-voo (debrief, ORO.FTL.235c — o operador fixa-o no OM). O sign-off REAL da duty
  // (`signOff` − último on-block, com volta-a-meia-noite) tem PRIORIDADE; senão usa o default
  // passado (min do perfil/OM). Entra no PERÍODO DE SERVIÇO (210 + repouso), como a norma manda.
  // SÓ VOO: o débrief é o serviço entre o último on-block e o sign-off (235c) — num não-voo
  // (escritório/formação/posicionamento) o FIM registado É o fim; somar débrief inflava o 210/repouso.
  const kind = duty.kind || 'flight';
  const isFl = kind === 'flight';
  const onMin = parseHhmm(duty.block_on), soMin = parseHhmm(duty.signOff);
  const pf = !isFl ? 0 : ((soMin != null && onMin != null) ? durationMin(onMin, soMin) : (postFlightMin || 0));
  // Casos especiais — repouso a bordo (205e), adiamento (205g), redução por standby (225): mexem no TETO do PSV
  // deste serviço. Vêm em `duty.special` (persistido em roster_meta).
  const sp = duty.special || {};
  // Split duty (CS FTL.1.220): `splitBreakH` EXPLÍCITO (bloco combinado do dayFtlFromDuties, ou form)
  // ganha; senão DERIVA a maior pausa em terra ≥3h das próprias legs.
  const der = splitFromLegs(duty.legs);
  const isFdp = isFdpDuty(duty);
  const tzDiffH = tzDiffOf(duty, base, date);   // CS FTL.1.235(b)(3)(ii): fuso do PSV face à base
  // Aclimatação (Quadro 1) — só com a escala à volta (ctx.duties): B → hora da base, D → hora local, X → Quadro 3.
  const ac = acclimOf(duty, { base, date, duties: ctx.duties });
  const refMode = ac && ac.letter === 'D' ? 'dep' : ac && ac.letter === 'B' ? 'base' : 'auto';
  const stateEff = ac && ac.letter === 'X' ? 'unk' : state;
  const zt = zuluTimingOf(duty, base, date, refMode);   // ORO.FTL.105(2) hora de referência · 105(12) tempo decorrido
  // Alojamento na pausa (CS FTL.1.220): 'none' | 'basic' | true (adequado) dito pelo tripulante; vazio ou o `false` dos
  // registos antigos = POR RESPONDER → o motor dá o intervalo (a lei manda: sem o facto, não há veredicto inventado).
  const acc = (duty.accommodation === true || duty.accommodation === 'suitable' || duty.accommodation === 'basic' || duty.accommodation === 'none')
    ? duty.accommodation : 'unknown';
  // ORO.FTL.205(c), só cabine: a apresentação dos pilotos. `special.fcReport` (HH:MM) no serviço; senão o que o contexto
  // disser em `cabinGapMin`: um número (a diferença do Manual de Operações) ou null (DESCONHECIDA → intervalo). A App
  // passa-o para a cabine; sem ele (undefined: calculadoras, chamadas antigas) não se aplica. Pilotos: nunca.
  const fcRep = parseHhmm(sp.fcReport), repMin0 = parseHhmm(duty.report_time);
  const cabinGap = isPilot ? undefined
    : (fcRep != null && repMin0 != null) ? (((fcRep - repMin0) % 1440) + 1440) % 1440
    : ctx.cabinGapMin;
  const args = {
    state: stateEff, report: duty.report_time, end: duty.block_on || null, sectors: duty.sectors || 0, inBase: ib, postFlightMin: pf,
    splitBreakH: duty.splitBreakH || der.splitBreakH, splitBreakStart: duty.splitBreakStart || der.splitBreakStart, accommodation: acc,
    augmented: sp.augmented || null, delayedFrom: sp.delayedFrom || null, preStandby: sp.preStandby || null, isPilot,
    discretion: !!sp.discretion, longestSectorMin: longestSectorOf(duty), tzDiffH, cabinReportGapMin: cabinGap,
    splitAdminMin: ctx.splitAdminMin,   // CS 220(b): o tempo do OM — null = desconhecido (App), undefined = 30
    bandShiftMin: zt.bandShiftMin, elapsedAdjMin: zt.elapsedAdjMin,
  };
  // CS FTL.1.205(d)(1)(ii): adiamento com 2.ª notificação → o PSV conta 1 h depois do 2.º aviso ou à 1.ª hora adiada, a mais
  // cedo. O texto não diz que hora adiada entra no máximo ((iii)/(iv)): as duas leituras → intervalo se diferirem.
  const d1 = parseHhmm(sp.delayed1), n2 = parseHhmm(sp.notice2), rep2 = parseHhmm(duty.report_time);
  if (sp.delayedFrom != null && d1 != null && n2 != null && rep2 != null) {
    const before = (x) => { const b = durationMin(x, rep2); return b > 720 ? 0 : b; };   // quanto antes da apresentação final
    args.startEarlierMin = Math.max(before((n2 + 60) % 1440), before(d1));
  }
  let d = computeDuty(args);
  if (args.startEarlierMin != null && d1 != null) {
    const dB = computeDuty({ ...args, delayedAtMin: d1 });
    if (dB.fdp.maxFdpMin !== d.fdp.maxFdpMin) d = widenDuty([d, dB], 'delayRule');
  }
  // Aclimatação por saber (o 1.º registo da escala, fora da faixa de 2 h): a lei depende do estado → intervalo entre os três.
  if (ac && ac.unknown) {
    const zB = zuluTimingOf(duty, base, date, 'base'), zD = zuluTimingOf(duty, base, date, 'dep');
    d = widenDuty([
      computeDuty({ ...args, state: 'acc', bandShiftMin: zB.bandShiftMin }),
      computeDuty({ ...args, state: 'acc', bandShiftMin: zD.bandShiftMin }),
      computeDuty({ ...args, state: 'unk' }),
    ], 'acclimatisation');
  }
  // Prolongamento sem repouso a bordo (ORO.FTL.205(d), auditoria A-256): o PSV excede o Quadro 2 mas cabe na tabela da
  // CS FTL.1.205(b) (hora, setores e o teto de setores pelo WOCL de 205(d)(3)), sem repouso a bordo nem repartido
  // (205(d)(4)) e sem discrição declarada. É LEGAL quando foi PLANEADO com antecedência (205(d)(3) — a escala publicada,
  // o `snap`, ou a marca `special.plannedExt`) e não passa de 2 em 7 dias (205(d)(1)). Para o decidir é preciso a
  // escala à volta (`ctx.duties` + `ctx.date`); sem ela (chamadas antigas) fica como antes: acima do máximo.
  const ef = extFitOf(duty, d, { state: stateEff, isFdp, sp, der });
  let extUsed = false, extRefused = null;
  if (ef.fits) {
    if (ctx.duties && ctx.date) {
      if (!extPlannedOf(duty, state)) extRefused = 'notPlanned';
      else if (1 + extCountBefore(ctx.duties, ctx.date, state) > EXT_MAX_PER_7D) { extUsed = true; extRefused = '2in7'; }
      else { extUsed = true; d = computeDuty({ ...args, extended: true }); }   // legal: o máximo é o do prolongamento
    } else extUsed = true;   // sem a escala: marca-se (conta para os 2 em 7 dias) e o repouso sobe; o veredicto não muda
    // Planeado mas recusado, ou sem a escala para decidir: o máximo fica o do Quadro 2 e o repouso a seguir sobe na mesma.
    if (extUsed && (extRefused !== null || !(ctx.duties && ctx.date))) d = computeDuty({ ...args, restExtended: true });
  }
  return { ...d, isFdp, kind, pf, inBase: ib, extUsed, extRefused, tzDiffH, tzSignedH: tzSignedOf(duty, base, date), acclim: ac };
};

// Junta vários resultados do computeDuty (um por leitura possível de um facto que falta) num só: o máximo GARANTIDO é o
// menor, o POSSÍVEL é o maior; "excede" só acima do possível, "incerto" entre os dois.
const widenDuty = (variants, unknown) => {
  const ok = variants.filter((v) => v && v.fdp && v.fdp.maxFdpMin != null);
  if (!ok.length) return variants[0];
  const lo = Math.min(...ok.map((v) => v.fdp.maxFdpMin));
  const hi = Math.max(...ok.map((v) => (v.fdp.maxHiMin != null ? v.fdp.maxHiMin : v.fdp.maxFdpMin)));
  const b = ok.find((v) => v.fdp.maxFdpMin === lo);
  const actual = b.fdp.actualFdpMin;
  const over = actual != null && actual > hi, uncertain = !over && actual != null && actual > lo;
  const fdp = {
    ...b.fdp, maxFdpMin: lo, maxFdpStr: minToHhmm(lo), maxHiMin: hi, maxHiStr: minToHhmm(hi), exact: lo === hi,
    over, uncertain, excessMin: over ? actual - hi : 0, excessStr: over ? minToHhmm(actual - hi) : null,
    unknowns: lo === hi ? [] : Array.from(new Set([...(b.fdp.unknowns || []), unknown])),
  };
  return { ...b, fdp, ...validateDuty({ fdp, reportMin: b.reportMin, endMin: b.endMin, sectors: b.sectors }) };
};

// O PSV cabe no prolongamento (ORO.FTL.205(d) + CS FTL.1.205(b))? Só com o máximo exato, acima do Quadro 2.
const extFitOf = (duty, d, { state, isFdp, sp, der }) => {
  // 205(d) é "para tripulantes aclimatados": no estado X (Quadro 3) não há prolongamento.
  if (state !== 'acc' || !isFdp || sp.discretion || sp.augmented || !d.fdp.exact || !d.fdp.over) return { fits: false };
  if ((duty.splitBreakH || der.splitBreakH || 0) >= SPLIT_MIN_BREAK_H) return { fits: false };   // 205(d)(4)
  const rep = parseHhmm(duty.report_time), end = parseHhmm(duty.block_on);
  if (rep == null || end == null) return { fits: false };
  const e = computeFdp({ state, reportMin: rep, endMin: end, sectors: duty.sectors || 0, extended: true });
  return { fits: !e.notAllowed && e.maxFdpMin != null && d.fdp.actualFdpMin <= e.maxFdpMin, maxMin: e.maxFdpMin };
};
// Planeado com antecedência (205(d)(3)): a escala PUBLICADA (snap) já trazia um PSV acima do Quadro 2 dentro do
// prolongamento, ou o tripulante marcou-o (serviços postos à mão).
const extPlannedOf = (duty, state = 'acc') => {
  if (duty.special && duty.special.plannedExt) return true;
  const s = duty.snap;
  if (!s || !s.report_time || !s.block_on) return false;
  const rep = parseHhmm(s.report_time), end = parseHhmm(s.block_on);
  if (rep == null || end == null) return false;
  const b = computeFdp({ state, reportMin: rep, endMin: end, sectors: s.sectors || duty.sectors || 0 });
  const e = computeFdp({ state, reportMin: rep, endMin: end, sectors: s.sectors || duty.sectors || 0, extended: true });
  return !!b.over && !e.notAllowed && e.maxFdpMin != null && b.actualFdpMin <= e.maxFdpMin;
};
// Quantos prolongamentos planeados nos 6 dias ANTES de `date` (o próprio serviço conta-se à parte: pode ser o simulado).
// O 3.º numa janela de 7 dias é o que passa o limite ("não mais do que duas vezes em cada período de 7 dias
// consecutivos"): qualquer janela com 3 contém o mais recente e os outros dois nos 6 dias antes dele.
const EXT_MAX_PER_7D = 2;
const extCountBefore = (duties, date, state = 'acc') => {
  const [y, m, dd] = String(date).split('-').map(Number);
  let n = 0;
  for (let k = 1; k <= 6; k++) {
    const t = new Date(y, m - 1, dd - k, 12);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const x = duties[iso];
    if (!x || x.deleted || !x.report_time || !x.block_on) continue;
    const dx = computeDuty({ state, report: x.report_time, end: x.block_on, sectors: x.sectors || 0 });
    const derx = splitFromLegs(x.legs);
    if (extFitOf(x, dx, { state, isFdp: isFdpDuty(x), sp: x.special || {}, der: derx }).fits && extPlannedOf(x, state)) n++;
  }
  return n;
};

// Entrada do dayLog de um serviço SEM hora de report (ver dutyToFtlDay). null se não houver nada para contar.
const noReportEntry = (duty = {}, { postFlightMin = 0 } = {}) => {
  const isFl = (duty.kind || 'flight') === 'flight';
  const vooMin = Math.round(duty.flight_minutes || 0);
  const off = parseHhmm(duty.block_off != null ? duty.block_off : (Array.isArray(duty.legs) && duty.legs.length ? duty.legs[0].off : null));
  const on = parseHhmm(duty.block_on);
  const so = parseHhmm(duty.signOff);
  const end = so != null ? so : on;
  const pf = (isFl && so == null) ? (postFlightMin || 0) : 0;
  const span = (off != null && end != null) ? durationMin(off, end) : (vooMin || 0);
  const servicoMin = Math.max(span, vooMin) + pf;
  if (!vooMin && !servicoMin) return null;
  return {
    src: 'duty', engineVer: ENGINE_VERSION, servicoEst: true,
    psv: { result: null, max: null, over: false, excess: null, latest: null, latestNextDay: false, extended: false, noReport: true, fdp: isFl, kind: duty.kind || null, ts: Date.now() },
    servicoMin, servico: servicoMin / 60, vooMin, voo: vooMin / 60, rest: {},
  };
};

export const dutyToFtlDay = (duty = {}, { state = 'acc', inBase = true, base = null, postFlightMin = null, isPilot = false, date = null, cabinGapMin, splitAdminMin, duties = null } = {}) => {
  // Reserva (ORO.FTL.230): é DISPONIBILIDADE, não serviço — 0 h FTL até ser convertida num
  // serviço (que é então registado à parte). Nunca contribui para os acumulados de 28 d.
  if (duty.kind === 'reserve') return null;
  // Sem hora de report (o calendário nem sempre traz "RP"): o TEMPO DE VOO conta sempre (ORO.FTL.105(13) não depende
  // da apresentação) e o serviço conta, pelo menos, de calços a calços + pós-voo, marcado como ESTIMADO. Só o PSV
  // fica por calcular (auditoria A-161: o dia inteiro, voo incluído, saía dos 210).
  if (!duty.report_time) return noReportEntry(duty, { postFlightMin });
  if (!duty.block_on) return null;
  const d = ftlForDuty(duty, { state, inBase, base, postFlightMin, isPilot, date, cabinGapMin, splitAdminMin, duties });
  inBase = d.inBase;
  const sp = duty.special || {};
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
  // Em MINUTOS inteiros (auditoria A-148): a soma das janelas faz-se ao minuto; as horas ficam só para a vista.
  const servicoMin = Math.round(baseServicoMin + sbExtraMin);
  const vooMin = Math.round(duty.flight_minutes || 0);
  const place = inBase ? 'base' : 'away';
  const repMin = parseHhmm(duty.report_time), endMin = parseHhmm(duty.block_on);
  // Prolongamento PLANEADO (CS FTL.1.205(d)(1)): o PSV planeado excede o BÁSICO mas cabe
  // no ESTENDIDO, numa banda que permite extensão → conta p/ "máx 2 em 7 dias". Heurística:
  // da escala não se distingue planeado de discrição; marca-se quando CABE na extensão
  // (direção segura — antes avisar a mais). Acima do estendido = ilegal/discrição, não conta.
  // Discrição do comandante (ORO.FTL.205(f)) USADA neste serviço — declarada em `special`.
  // O excesso DENTRO da margem (+2h; +3h com repouso a bordo) é LEGAL (e reportável ao
  // operador); só ALÉM da margem é ilegal. Sem a marca, o teto planeado manda (como antes).
  const disc205 = sp.discretion
    ? computeDiscretion({ maxFdpMin: d.fdp.maxFdpMin, actualFdpMin: d.fdp.actualFdpMin, restMin: d.rest.restMin, inFlightRest: !!sp.augmented })
    : null;
  // Standby de AEROPORTO com alojamento (ORO.FTL.225(e) cumprido): é STANDBY — conta 100%
  // como serviço p/ 210/235 (225(c)) mas NÃO é PSV, logo a tabela 205 não o julga. SEM
  // alojamento a lei trata-o como "duty at the airport" (225(d)): o PSV conta desde o
  // report → a tabela aplica-se (comportamento anterior, conservador e fiel).
  const sbAcc = duty.kind === 'standby_airport' && !!duty.accommodation;
  const fdpDuty = isFdpDuty(duty);
  const usedExtension = !!d.extUsed;   // prolongamento planeado (205(d)) — decidido no ftlForDuty
  // Não é PSV → sem teto, sem "PSV realizado", sem hora-limite de calços. O standby fora do aeroporto tem no máximo
  // 16 h (CS FTL.1.225(b)(1)) → `sbOver`.
  const notFdpPsv = {
    state: d.state, sectors: d.sectors, result: null, max: null, band: null, start: duty.report_time, end: duty.block_on,
    endNextDay: repMin != null && endMin != null && endMin < repMin, latest: null, latestNextDay: false,
    over: false, excess: null, extended: false, ts: Date.now(), fdp: false, kind: duty.kind || null,
    standby: sbAcc || undefined,
    sbOver: (duty.kind === 'standby_home' && (d.dutyPeriodMin || 0) > 960) || undefined,
  };
  return {
    src: 'duty', engineVer: ENGINE_VERSION,
    psv: !fdpDuty ? notFdpPsv : {
      state: d.state, sectors: d.sectors, result: d.fdp.actualFdpStr, max: sbAcc ? null : d.fdp.maxFdpStr,
      // "A lei é que manda": com um facto em falta, `max` é o GARANTIDO e `maxHi` o POSSÍVEL; entre os dois → incerto.
      maxHi: (sbAcc || d.fdp.exact) ? undefined : d.fdp.maxHiStr, exact: d.fdp.exact,
      uncertain: (sbAcc || d.fdp.exact) ? undefined : ((disc205 ? !!disc205.uncertain : !!d.fdp.uncertain) || undefined),
      unknowns: (d.fdp.unknowns && d.fdp.unknowns.length) ? d.fdp.unknowns : undefined,
      band: d.fdp.band, start: duty.report_time, end: duty.block_on,
      endNextDay: repMin != null && endMin != null && endMin < repMin,
      // Hora-limite de calços (2026-11-03) — o Início mostra-a no dia do voo. Standby com alojamento não é PSV.
      latest: sbAcc ? null : d.latestOnBlockStr, latestNextDay: sbAcc ? false : d.latestOnBlockNextDay,
      over: sbAcc ? false : (disc205 ? disc205.over : d.fdp.over),
      excess: sbAcc ? null : ((disc205 && disc205.used && !disc205.over) ? null : d.fdp.excessStr),
      extended: usedExtension, extRefused: d.extRefused || undefined, ts: Date.now(),
      acclim: (d.acclim && d.acclim.letter !== 'in') ? (d.acclim.letter || 'unknown') : undefined,   // Quadro 1
      disc205f: disc205 ? { used: disc205.used, over: disc205.over, maxStr: disc205.maxStr, extStr: disc205.extStr } : undefined,
      standby: sbAcc || undefined,
    },
    servicoMin, servico: servicoMin / 60,
    vooMin, voo: vooMin / 60,
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
// Repouso mínimo DEPOIS de um serviço (ORO.FTL.235 + CS 235(b)(3)(ii) + CS 205(c)(6) + ORO.FTL.205(d)(1)) — a regra
// ÚNICA do "Tenho descanso?", do "Repouso até" do Início e do intervalo entre serviços do mesmo dia (auditoria
// A-144/A-160: mediam desde os calços, sem o pós-voo, e com 12 h fixas). O fim do serviço é o sign-off; sem ele,
// calços + pós-voo (só voo — um não-voo acaba no fim registado). Devolve null sem fim.
//   { endMin (relógio), dutyMin, inBase, floorMin, requiredMin (com prolongamento: +2 h, opção (i)),
//     requiredPostOnlyMin (+4 h, opção (ii)), extended, reason }
export const restAfterDuty = (prev, { inBase = true, base = null, postFlightMin = 0, isPilot = false, date = null } = {}) => {
  if (!prev) return null;
  const repPrev = parseHhmm(prev.report_time);
  const onPrev = parseHhmm(prev.block_on), soPrev = parseHhmm(prev.signOff);
  const pfPrev = ((prev.kind || 'flight') === 'flight') ? (postFlightMin || 0) : 0;
  const endMin = soPrev != null ? soPrev : (onPrev != null ? (onPrev + pfPrev) % 1440 : null);
  if (endMin == null) return null;
  let dutyMin = repPrev != null ? endMin - repPrev : 0; while (dutyMin < 0) dutyMin += 1440;
  const pr = repPrev != null ? ftlForDuty(prev, { inBase, base, postFlightMin, isPilot, date }) : null;
  const ib = pr ? pr.inBase : inBase;
  const aug = prev.special && prev.special.augmented;
  const r = computeRest({ prevDutyMin: dutyMin, inBase: ib, tzDiffH: pr ? pr.tzDiffH : 0, inflightRest: !!(aug && aug.restClass), extended: !!(pr && pr.extUsed) });
  return { endMin, dutyMin, inBase: ib, floorMin: r.floorMin, requiredMin: r.restMin, requiredPostOnlyMin: r.restPostOnlyMin, extended: r.extended, reason: r.reason, tzSignedH: pr ? pr.tzSignedH : 0 };
};

export const restBetweenDuties = (prev, next, { inBase = true, postFlightMin = 0 } = {}) => {
  if (!prev || !next) return null;
  const repNext = parseHhmm(next.report_time);
  const ra = restAfterDuty(prev, { inBase, postFlightMin });
  if (!ra || repNext == null) return null;
  const endPrev = ra.endMin, prevDutyMin = ra.dutyMin;
  let gapMin = repNext - endPrev; while (gapMin < 0) gapMin += 1440;          // next reporta depois do fim de prev
  const place = ra.inBase ? 'base' : 'away';
  const minRest = ra.requiredMin;                                             // a regra única (restAfterDuty)
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
// Standby colado a um voo (auditoria A-167/A-234): o standby acaba na apresentação (CS FTL.1.225(b)(5)) e o PSV conta
// desde a apresentação do voo (225(a)(2)(i) e (b)(6)). O standby não entra no PSV: passa a `special.preStandby` do
// voo — reduz o máximo (casa > 6 h, com a janela 23:00–07:00 de fora; aeroporto > 4 h e o teto de 16 h) e soma ao 210
// (casa 25 %, aeroporto 100 %). Vale para o standby em casa e para o de aeroporto COM alojamento; o de aeroporto sem
// alojamento é "serviço no aeroporto" e o PSV conta desde a sua apresentação (ORO.FTL.225(d)) — fica no mesmo PSV.
const foldStandbyIntoFlight = (list, inBaseOf, postFlightMin) => {
  const sorted = list.filter(Boolean).slice().sort((a, b) => (parseHhmm(a.report_time) ?? 0) - (parseHhmm(b.report_time) ?? 0));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const sb = sorted[i], nx = sorted[i + 1];
    const foldable = sb && (sb.kind === 'standby_home' || (sb.kind === 'standby_airport' && sb.accommodation))
      && nx && (nx.kind || 'flight') === 'flight' && !(nx.special && nx.special.preStandby);
    if (foldable) {
      const gap = restBetweenDuties(sb, nx, { inBase: inBaseOf(sb), postFlightMin });
      const st = parseHhmm(sb.report_time), rp = parseHhmm(nx.report_time);
      if (gap && gap.kind !== 'rest' && st != null && rp != null) {
        const preStandby = { type: sb.kind === 'standby_airport' ? 'airport' : 'other', standbyH: durationMin(st, rp) / 60, startMin: st, folded: true };
        out.push({ ...nx, special: { ...(nx.special || {}), preStandby } });
        i++;
        continue;
      }
    }
    out.push(sb);
  }
  return out;
};

export const dayFtlFromDuties = (list = [], opts = {}) => {
  const gapInBase0 = (prev) => { const away = endsAwayReliable(prev, opts.base); return away == null ? (opts.inBase !== false) : !away; };
  const arr = foldStandbyIntoFlight(Array.isArray(list) ? list : [list], gapInBase0, opts.postFlightMin || 0);
  // Mantém a duty CRUA ao lado do registo FTL (precisa-se das horas p/ o repouso entre serviços).
  const all = arr.map((d) => ({ duty: d, entry: dutyToFtlDay(d, opts) })).filter((p) => p.entry);
  if (!all.length) return null;
  // `opts.withBlocks` (Simulação, auditoria A-248): junta os blocos de PSV do dia, cada um com os seus serviços, para o herói
  // mostrar o PSV do bloco do serviço simulado — o mesmo cálculo do veredicto. Não vai para o dayLog (fica fora por omissão).
  const withB = (entry, blks) => (opts.withBlocks ? { ...entry, blocks: blks } : entry);
  const blk1 = (p) => [{ psv: p.entry.psv, members: [p.duty] }];
  // Serviços SEM report (A-161): somam ao 210 (voo sempre; serviço estimado), mas não entram nos blocos de PSV nem no
  // repouso — não se sabe quando começaram.
  const noRep = all.filter((p) => !p.duty.report_time);
  const paired = all.filter((p) => p.duty.report_time);
  const extraMin = (key) => noRep.reduce((s, p) => s + entryMin(p.entry, key), 0);
  if (!paired.length) {
    if (noRep.length === 1) return withB(noRep[0].entry, []);
    const sMin = extraMin('servico'), vMin = extraMin('voo');
    return withB({ ...noRep[0].entry, servicoMin: sMin, servico: sMin / 60, vooMin: vMin, voo: vMin / 60, parts: noRep.map((p) => p.entry.psv) }, []);
  }
  // Ordena cronologicamente pelo report → os serviços do dia ficam por ordem (1.º, 2.º, …).
  paired.sort((a, b) => (parseHhmm(a.duty.report_time) ?? 0) - (parseHhmm(b.duty.report_time) ?? 0));
  const entries = paired.map((p) => p.entry);
  if (entries.length === 1 && !noRep.length) return withB(entries[0], blk1(paired[0]));
  if (entries.length === 1) {
    const sMin = entryMin(entries[0], 'servico') + extraMin('servico'), vMin = entryMin(entries[0], 'voo') + extraMin('voo');
    return withB({ ...entries[0], servicoMin: sMin, servico: sMin / 60, vooMin: vMin, voo: vMin / 60, servicoEst: true, parts: [...entries, ...noRep.map((p) => p.entry)].map((e) => e.psv) }, blk1(paired[0]));
  }
  const r1 = (n) => +(Number(n) || 0).toFixed(1);
  // Base vs fora do INTERVALO = onde o serviço ANTERIOR acabou (é aí que repousas). Local fiável
  // (ORO.FTL.235: 12h base / 10h fora); desconhecido → default conservador (na base).
  const gapInBase = (prev) => { const away = endsAwayReliable(prev, opts.base); return away == null ? (opts.inBase !== false) : !away; };
  // Intervalo ENTRE serviços consecutivos (235 + 220): classifica cada par. `gaps` é indexado
  // (gaps[i] = intervalo entre paired[i] e paired[i+1]) para o agrupamento em blocos; `between`
  // (sem nulos) é o que a UI consome.
  const gaps = [];
  for (let i = 0; i < paired.length - 1; i++) {
    gaps.push(restBetweenDuties(paired[i].duty, paired[i + 1].duty, { inBase: gapInBase(paired[i].duty), postFlightMin: opts.postFlightMin || 0 }));
  }
  const between = gaps.filter(Boolean);
  const split = between.some((b) => b.kind === 'split');         // algum par é split duty (1 FDP)
  const restShort = between.some((b) => b.kind === 'continuous'); // algum par perto demais (não são 2)
  // BLOCOS de FDP (CS FTL.1.220): um intervalo 'rest' (≥ mínimo de repouso 235) SEPARA em 2 FDP;
  // 'split'/'continuous' MANTÊM no mesmo FDP — a pausa conta como FDP ("the break itself is fully
  // considered as FDP"), é 1 só serviço com o teto ESTENDIDO por 50% da pausa contável (220c).
  const blocks = [[paired[0]]];
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] && gaps[i].kind === 'rest') blocks.push([paired[i + 1]]);
    else blocks[blocks.length - 1].push(paired[i + 1]);
  }
  // Entrada FTL de cada bloco: 1 serviço → a sua entrada; N serviços → 1 FDP COMBINADO
  // (report do 1.º → on-block do último; setores/voo somados; a pausa que estende é a MAIOR
  // 'split' do bloco — "a single break", 220). Sem alojamento conhecido → conservador (accommodation
  // false: a parte >6h e a do WOCL não contam para a extensão, CS FTL.1.220 d/e).
  const blockEntry = (blk) => {
    if (blk.length === 1) return blk[0].entry;
    const first = blk[0].duty, last = blk[blk.length - 1].duty;
    let splitBreakH = 0, splitBreakStart = null;
    for (let i = 0; i < blk.length - 1; i++) {
      const rb = restBetweenDuties(blk[i].duty, blk[i + 1].duty, { inBase: gapInBase(blk[i].duty), postFlightMin: opts.postFlightMin || 0 });
      if (!rb || rb.kind !== 'split') continue;   // só uma pausa 'split' (≥3h) estende; 'continuous' (<3h) não
      const on = parseHhmm(blk[i].duty.block_on), rep = parseHhmm(blk[i + 1].duty.report_time);
      if (on == null || rep == null) continue;
      let gross = rep - on; while (gross < 0) gross += 1440;   // on-block(prev) → report(next) = terra bruta (220b tira 30m dentro do motor)
      if (gross > splitBreakH * 60) { splitBreakH = gross / 60; splitBreakStart = blk[i].duty.block_on; }   // "a single break": a MAIOR
    }
    const combined = {
      report_time: first.report_time, block_on: last.block_on, signOff: last.signOff || null,
      sectors: blk.reduce((s, p) => s + (Number(p.duty.sectors) || 0), 0),
      flight_minutes: blk.reduce((s, p) => s + (Number(p.duty.flight_minutes) || 0), 0),
      kind: 'flight', special: first.special || null, splitBreakH, splitBreakStart,
      route: last.route || null,                    // fim do FDP combinado = onde o ÚLTIMO serviço aterra (base/fora)
      accommodation: first.accommodation || false,   // alojamento na pausa (opt-in): 'basic' | true (adequado) — 220 d/e
    };
    return dutyToFtlDay(combined, opts) || blk[0].entry;
  };
  const blockEntries = blocks.map(blockEntry);
  // Minutos inteiros (A-148): somam-se os blocos e os serviços sem report.
  const servicoMin = blockEntries.reduce((s, e) => s + entryMin(e, 'servico'), 0) + extraMin('servico');
  const vooMin = blockEntries.reduce((s, e) => s + entryMin(e, 'voo'), 0) + extraMin('voo');
  // PSV do dia = o PIOR bloco (legalidade sobre os FDP combinados): prioriza o que EXCEDE.
  const excMin = (p) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String((p && p.excess) || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
  const worst = blockEntries.reduce((a, b) => {
    if (!!b.psv.over !== !!a.psv.over) return b.psv.over ? b : a;
    return excMin(b.psv) > excMin(a.psv) ? b : a;
  });
  const last = blockEntries[blockEntries.length - 1];
  // `parts` = PSV por SERVIÇO (para o registo 245, uma linha por serviço); a legalidade do dia
  // vem do FDP combinado (worst). São coisas diferentes de propósito num split-duty.
  return withB({
    src: 'duty', engineVer: ENGINE_VERSION, psv: worst.psv,
    servicoMin, servico: servicoMin / 60, vooMin, voo: vooMin / 60, servicoEst: noRep.length ? true : undefined,
    rest: last.rest, parts: [...entries, ...noRep.map((p) => p.entry)].map((e) => e.psv), between, split, restShort,
  }, blocks.map((blk, i) => ({ psv: blockEntries[i].psv, members: blk.map((p) => p.duty) })));
};

// Assinatura (hash curto) de tudo o que decide a entrada derivada de um dia: a versão do motor, o contexto (pós-voo,
// tripulação, base desse dia) e os campos dos serviços. Muda qualquer um → a entrada recalcula-se (auditoria A-174).
const djb2 = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return h.toString(36); };
const DUTY_SIG_FIELDS = ['report_time', 'block_off', 'block_on', 'sectors', 'flight_minutes', 'kind', 'signOff', 'special', 'legs', 'route', 'accommodation', 'splitBreakH', 'splitBreakStart', 'snap'];
const pickSig = (s) => (s ? DUTY_SIG_FIELDS.map((k) => (s[k] === undefined ? null : s[k])) : null);
export const dayLogSig = (d, { postFlightMin = 0, isPilot = false, base = null, cabinGapMin, splitAdminMin } = {}) =>
  djb2(JSON.stringify([ENGINE_VERSION, postFlightMin || 0, !!isPilot, base || null, cabinGapMin === undefined ? 'na' : cabinGapMin, splitAdminMin === undefined ? 'na' : splitAdminMin, pickSig(d), (d && Array.isArray(d.extra)) ? d.extra.map(pickSig) : null]));

// Assinatura dos 6 dias antes de `date` (para os prolongamentos: "não mais do que duas vezes em 7 dias").
const nbrSig = (duties, date) => {
  const [y, m, dd] = String(date).split('-').map(Number);
  const parts = [];
  for (let k = 1; k <= 6; k++) {
    const t = new Date(y, m - 1, dd - k, 12);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const x = duties[iso];
    parts.push(x && !x.deleted ? [pickSig(x), x.snap || null] : null);
  }
  return djb2(JSON.stringify(parts));
};

// Mantém as entradas FTL DERIVADAS (src:'duty') do `dayLog` em dia com as duties (escala):
//  • preenche os dias em FALTA (dispositivo novo / após reinstalar: as duties vêm do servidor, o dayLog é local);
//  • RECALCULA as derivadas cuja assinatura mudou — o motor foi corrigido, mudou o pós-voo, a base ou o tipo de
//    tripulante, ou a duty chegou do servidor diferente (auditoria A-174: só se preenchia, e os dias guardados
//    ficavam com o cálculo antigo para sempre);
//  • NUNCA toca nas entradas manuais (sem src 'duty').
// Idempotente: devolve a MESMA referência se nada mudar (não dispara re-render).
// `baseAt(date)` (linha do tempo do contrato, 2026-11-03) = a base EM VIGOR nesse dia — uma
// transferência não muda o "na base / fora" (12 h / 10 h, ORO.FTL.235) dos dias antigos.
export const reconcileDayLog = (duties = {}, dayLog = {}, { postFlightMin = 0, isPilot = false, base = null, baseAt = null, cabinGapMin, splitAdminMin } = {}) => {
  let next = dayLog, changed = false;
  const put = (date, entry) => { if (!changed) { next = { ...dayLog }; changed = true; } if (entry) next[date] = entry; else delete next[date]; };
  for (const date in duties) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    const cur = dayLog[date];
    if (cur && cur.src !== 'duty') continue;          // manual → nunca se toca
    const baseD = typeof baseAt === 'function' ? baseAt(date) : base;
    const sig = dayLogSig(d, { postFlightMin, isPilot, base: baseD, cabinGapMin, splitAdminMin });
    // Um prolongamento (205(d)) depende também dos 6 dias antes (os "2 em 7 dias"): recalcula se eles mudarem.
    if (cur && cur.sig === sig && (cur.nsig === undefined || cur.nsig === nbrSig(duties, date))) continue;   // já em dia
    // Um dia pode ter N períodos de serviço (210 conta por serviço): primária + `extra`.
    const primary = {
      report_time: d.report_time, block_off: d.block_off, block_on: d.block_on,
      sectors: d.sectors, flight_minutes: d.flight_minutes, kind: d.kind, signOff: d.signOff, special: d.special,
      legs: d.legs, route: d.route, accommodation: d.accommodation,   // legs/rota p/ split+base/fora; alojamento p/ 220 d/e
      snap: d.snap || null,                                           // a escala publicada: o plano do 205(d)
    };
    const entry = dayFtlFromDuties([primary, ...((d.extra && d.extra.length) ? d.extra : [])], { postFlightMin, isPilot, base: baseD, date, cabinGapMin, splitAdminMin, duties });
    if (!entry) { if (cur) put(date, null); continue; }   // já não há nada para contar → sai a derivada antiga
    // Depende dos dias antes (prolongamento: os 2 em 7; aclimatação: o Quadro 1) → guarda-se a assinatura deles.
    put(date, { ...entry, sig, ...(entry.psv && (entry.psv.extended || entry.psv.acclim) ? { nsig: nbrSig(duties, date) } : {}) });
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
  computeFdp, computeFdpByBand, computeRest, computeFlightTime, computeDutyTime, validateLimits, limitsAround,
  validateDuty, validateRest, isNightDuty, overlapsWOCL,
  computeAcclimatisation, computeDiscretion,
  computeInflightRest, computeFlightCrewFdp, computeStandby, computeReducedRest, computeTimeZoneRest,
  computeDelayedReporting, computeExtensionUsage, classifyDisruptive, computeRestSequence, computeRecovery, localNightsIn, nthLocalNightEnd,
  computeFatigue,
  withinBand, fmtBandRange, bandRangeMins, splitCountedBreakMin, splitAccLevel, isFdpDuty,
  DUTY_WINDOWS, FLIGHT_WINDOWS, QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED,
};
export * from './utils/time';
