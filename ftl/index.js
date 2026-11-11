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
import { entryMin, nextMin, sumCalendarYearMin } from './calculators/cumulativeCalculator';
import { withinBand, fmtBandRange, bandRangeMins, splitCountedBreakMin, splitAccLevel, SPLIT_ADMIN_MIN, SPLIT_MIN_BREAK_H, isFdpDuty } from './rules/fdpRules';
import { DUTY_WINDOWS, FLIGHT_WINDOWS } from './rules/flightTimeRules';
import { QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED } from './constants/tables';
import { parseHhmm, minToHhmm, durationMin } from './utils/time';
import { acclimLetter } from './rules/acclimatisationRules';
import { airportOffsetMin, airportUtcMs, legZulu, legsChainMs, chainReportMs, serviceRealMin } from '../data/zulu';

// Versão do MOTOR de cálculo FTL. Carimba cada registo diário derivado (dutyToFtlDay/
// dayFtlFromDuties → dayLog), para que uma futura ERRATA (docs/ERRATA.md §E6) saiba com que
// versão um registo foi computado e possa re-avaliar SÓ os afetados. REGRA: incrementar
// SEMPRE que uma regra/tabela FTL ou um cálculo muda (mesmo correção de bug). Pré-requisito
// da errata fina — hoje só CARIMBA (a deteção de afetados e o recompute vêm depois).
// v2 (2026-11-06): auditoria dos cálculos, bloco 1 — as entradas v1 recalculam-se sozinhas (reconcileDayLog).
// v3 (2026-11-06, "a lei é que manda"): sem um facto de que a lei precisa → intervalo (garantido/possível) e incerto.
// v4 (2026-11-06, bloco 4): o serviço sem apresentação leva o máximo possível (servicoMaxMin); posicionamento (`dh`) nas pernas.
// v5 (2026-11-07, bloco 8b): parte depois da meia-noite (servicoNextMin/vooNextMin); teto da cabine com a diferença; sala no repartido.
// v6 (2026-11-07, revisão do 8b): voo depois da meia-noite pelas horas Zulu; standby (8) e (9); tempo decorrido no longo curso.
// v7 (2026-11-07): aviso das 18 h acordado sem dupla redução; standby com adiamento sem as 8 h do repartido.
// v8 (2026-11-07): os instantes das pernas pela cadeia do serviço (legsChainMs) — o tempo decorrido sem o limite das 24 h.
// v9 (2026-11-07): aeroporto da 1.ª partida sem fuso conhecido → a apresentação pela Zulu do calendário (chainReportMs).
// v10 (2026-11-08): aclimatação — um serviço dos 6 dias antes sem pernas com horas situa-se pela rota (ou pela última chegada,
// se for em terra); sem forma de o situar e se a letra do Quadro 1 mudasse com ele → por saber (antes saltava-se e dava D);
// fusos dos aeroportos conferidos contra a IANA (data/tzOverride.js); a hora repetida da noite em que a hora atrasa pela
// duração de voo possível (data/zulu.js).
// v11 (2026-11-11): a cauda de um posicionamento noutro fuso conta pelo tempo decorrido.
// v12 (2026-11-11, noites 8 a 10): pernas que não formam um PSV → sem repartido, PSV incerto; dois serviços no dia com 10 h ou
// mais entre eles → as duas leituras ('either'); assistência + voo com 10 h ou mais → as duas leituras; o tempo entre serviços
// pelo real na noite da mudança de hora; o pior bloco do dia: excede > incerto > dentro.
export const ENGINE_VERSION = 12;

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
  // Alojamento só "não adequado" (Sala): o garantido é a leitura da EASA, o possível a da AESA (CS 220(d)/(e); bloco 8b).
  const accBasic = !accUnknown && splitAccLevel(accommodation) === 'basic';
  const accLo = accUnknown ? 'none' : accBasic ? 'basic-easa' : accommodation, accHi = accUnknown ? 'suitable' : accommodation;
  const aug = augmented && augmented.restClass ? augmented : null;
  const cabAugUnknown = !!aug && !isPilot && (aug.additionalCrew == null || aug.fcRestClass == null || aug.cabinRestMin == null);
  const sectorUnknown = !!aug && longestSectorMin === null && (sectors | 0) <= 2;
  const unknowns = [];
  if (accUnknown && splitBreakH > 0) unknowns.push('accommodation');
  // Só é um facto em falta quando as duas leituras dão pausas contáveis diferentes (pausa ≥ 6 h ou no WOCL).
  if (preStandby && preStandby.type !== 'airport' && preStandby.standbyH > 0 && preStandby.startMin != null
    && (preStandby.startMin >= 23 * 60 || preStandby.startMin < 7 * 60)) unknowns.push('standbyContact');
  if (accBasic && splitBreakH > 0) {
    const brk = Math.round(splitBreakH * 60);
    if (splitCountedBreakMin(brk, splitStartMin, 'basic') !== splitCountedBreakMin(brk, splitStartMin, 'basic-easa')) unknowns.push('splitAccRule');
  }
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
      // CS FTL.1.225(b)(8): com o PSV prolongado por repouso a bordo ou por repartido, as 6 h de (6)/(7) passam a 8 h
      // (revisão do 8b, reparo 10: a app usava sempre 6 h).
      // Com um adiamento (CS 205(d)) o máximo já não leva a extensão do repartido → só as 6 h.
      const sbExt = (modifier === 'augmented') || (modifier !== 'delayed' && (b.extMin || 0) > 0 && splitBreakH > 0);
      // CS FTL.1.225(b)(9): a noite (23:00–07:00) não conta para a redução "until the crew member is contacted by the
      // operator". A app não sabe a hora do contacto → o garantido conta a noite toda (contacto logo no início), o possível
      // nada dela (contacto na apresentação) — revisão do 8b, E4.
      const sb = computeStandby({ type: preStandby.type, standbyH: preStandby.standbyH, maxFdpMin: m, startMin: (hi && preStandby.startMin != null) ? preStandby.startMin : null, extended: sbExt });
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
  // Cabine com repouso a bordo: a diferença prolonga o PSV DA CABINE, e a tabela CS FTL.1.205(c)(3) ("Maximum extended
  // FDP" → repouso mínimo da cabine) lê-se por esse PSV. A classe e o repouso a bordo da cabine limitam o total JÁ com a
  // diferença; só o PSV da técnica ((c)(2)/(4)) recebe a diferença por cima (bloco 8b).
  const cabCap = (r) => {
    if (isPilot || r.modifier !== 'augmented' || !r.augInfo) return Infinity;
    const caps = [r.augInfo.classMaxMin, r.augInfo.restCapMin].filter((v) => v != null);
    return caps.length ? Math.min(...caps) : Infinity;
  };
  let lo = null, hi = null, loR = null, hiR = null, anyAllowed = false, naR = null;
  for (const g of gaps) {
    const band = reportMin == null ? null : (reportMin + g) % 1440;
    const ext = Math.min(g, 60);
    const rl = maxOf(band, 'lo'), rh = maxOf(band, 'hi');
    if (rh.m != null) anyAllowed = true;
    if (!naR && rl.na) naR = rl;
    const l = rl.m == null ? null : Math.min(rl.m + ext, cabCap(rl)), h = rh.m == null ? null : Math.min(rh.m + ext, cabCap(rh));
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
    const sb = computeStandby({ type: preStandby.type, standbyH: preStandby.standbyH, maxFdpMin: maxHiMin, actualFdpMin: actual, startMin: preStandby.startMin != null ? preStandby.startMin : null, reduced: true });
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
    startEarlierMin: startEarlierMin || 0,   // o PSV começa este tanto antes da apresentação (CS 205(d)(1)(ii))
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
// As pernas do PSV: até ao último setor OPERADO. Um posicionamento (`dh`) depois dele já não é PSV (ORO.FTL.105(12): o PSV
// acaba no fim do último setor em que o tripulante desempenha funções) — conta só como serviço (ORO.FTL.215(b)).
export const fdpLegsOf = (legs) => {
  if (!Array.isArray(legs)) return [];
  let last = -1;
  legs.forEach((l, i) => { if (l && !l.dh) last = i; });
  return last < 0 ? legs : legs.slice(0, last + 1);
};
// AS PERNAS DE UM SERVIÇO TÊM DE FORMAR UM PSV (achado no iPhone a 2026-11-11; a regra sai toda da lei — o Nuno: "tem de ser
// como está na lei"). Com a volta a sair antes de a ida chegar (17:30–20:35 e 19:50–21:30) somavam-se 24 h à pausa negativa
// (−45 min → 23 h 15) e dava "repartido". As pernas só têm HH:MM; o que a lei diz do tempo em terra entre duas pernas:
//   · ORO.FTL.105(13) e (24): o setor vai do primeiro movimento da aeronave à sua imobilização. O mesmo tripulante não está
//     em dois setores ao mesmo tempo (é uma impossibilidade de facto): uma partida antes da chegada anterior são horas erradas.
//   · ORO.FTL.105(6): "Intervalo" é um período "durante um período de serviço de voo INFERIOR A UM PERÍODO DE REPOUSO". O
//     repouso mais curto que a lei admite é de 10 horas: longe da base (ORO.FTL.235(b)), na base com alojamento adequado
//     (235(a)(2)) e no repouso reduzido fora da base (CS FTL.1.235(c)(1)). Logo, 10 h ou mais em terra entre duas pernas já
//     podem ser um repouso: NÃO são, de certeza, um intervalo deste PSV — ou é um repouso (são dois serviços), ou as horas
//     estão erradas. É a regra com que a leitura do calendário já separa os serviços (data/calendarParse.js REST_FLOOR_MS,
//     bloco 4 da auditoria). Entre as 10 h e o repouso que se aplicaria ao caso (o serviço precedente, ou 12 h na base —
//     235(a)(1)) o texto admite duas leituras; a app não escolhe: o PSV fica incerto. Uma "pausa" de 23 h 15 não é um
//     intervalo em leitura nenhuma.
// `legsBrokenKind` = porque é que as pernas, como estão, NÃO formam um PSV: 'before' (uma partida antes da chegada anterior:
// é um PSV só, com horas erradas) · 'rest' (10 h ou mais em terra: podem ser dois serviços) · null (formam). `legsBroken` = o
// mesmo, sim ou não. O motor então não tira daqui um repartido e o PSV fica "incerto" (ftlForDuty: faltam as horas certas das
// pernas) — mas o serviço CONTA (ORO.FTL.210).
//   · Com o dia do serviço e os fusos: pelos INSTANTES da cadeia do serviço (data/zulu.js legsChainMs — a mesma que dá o PSV
//     real): a Zulu do calendário, ou a hora local no fuso do aeroporto. A cadeia deixa no mesmo dia uma partida até 3 h antes
//     da chegada anterior (vê-se a partida antes da chegada) e passa para o dia seguinte a que vem mais atrás (vê-se um
//     tempo em terra de 21 h ou mais).
//   · Sem o dia, ou com uma hora que a cadeia não resolve (aeroporto sem fuso e sem Zulu): pelo relógio, para a frente — a
//     partida antes da chegada aparece como um tempo em terra de quase 24 h.
//   · O que falta (uma perna sem horas) não conta: nunca se afirma o que não se vê.
// O que NÃO se apanha: pernas guardadas fora de ordem com a 2.ª toda antes da 1.ª e menos de 10 h para a frente (12:00–13:00
// e 20:00–21:00 trocadas) — no relógio é um intervalo possível. Só à mão: o calendário ordena pelo instante.
const HOUR_MS = 3600000;
// O repouso mais curto que a lei admite (ORO.FTL.235(b)): o número vem do computeRest, a fonte única do repouso.
export const SHORTEST_REST_MIN = computeRest({ prevDutyMin: 0, inBase: false }).restMin;
export { REDUCED_REST_BASE_MIN, REDUCED_REST_AWAY_MIN } from './rules/reducedRestRules';
// A HORA REPETIDA (a noite em que a hora atrasa: a mesma hora local acontece duas vezes, com 1 h de intervalo). Uma hora local
// SEM Zulu que caia nela tem duas leituras, e a cadeia escolhe uma. Para afirmar "a partida vem antes da chegada" usa-se a
// leitura que mais o evita: a chegada na 1.ª vez (a mais cedo) e a partida na 2.ª (a mais tarde) — chegar às 02:48 e sair às
// 02:26 pode ser um intervalo de 38 min. Só se afirma o que existe em todas as leituras.
const apOff = (ap, ms) => (ap ? airportOffsetMin(String(ap).toUpperCase(), ms) : null);
const earliestOn = (leg, ms) => { const o = apOff(leg.arr, ms), a = apOff(leg.arr, ms - HOUR_MS); return !leg.onZ && o != null && a != null && a > o ? ms - HOUR_MS : ms; };
const latestOff = (leg, ms) => { const o = apOff(leg.dep, ms), b = apOff(leg.dep, ms + HOUR_MS); return !leg.offZ && o != null && b != null && o > b ? ms + HOUR_MS : ms; };
// O tempo em terra (min) entre cada perna e a seguinte: { groundMin, before } — `before` = a partida vem antes da chegada
// anterior (só com os instantes). null onde falta uma das duas horas.
const legGaps = (legs, { date = null, report = null } = {}) => {
  const out = new Array(Math.max(0, legs.length - 1)).fill(null);
  const ch = date ? legsChainMs(date, legs, report) : null;
  const solved = !!ch && legs.every((l, i) => (!(l.off || l.offZ) || (ch[i] && ch[i].offMs != null)) && (!(l.on || l.onZ) || (ch[i] && ch[i].onMs != null)));
  for (let i = 0; i < legs.length - 1; i++) {
    const a = legs[i], b = legs[i + 1];
    if (solved) {
      const on = ch[i].onMs, off = ch[i + 1].offMs;
      if (on == null || off == null) continue;
      out[i] = { groundMin: Math.max(0, Math.round((off - on) / 60000)), before: latestOff(b, off) < earliestOn(a, on) };
    } else {
      const on = parseHhmm(a.on), off = parseHhmm(b.off);
      if (on == null || off == null) continue;
      out[i] = { groundMin: durationMin(on, off), before: false };
    }
  }
  return out;
};
// `opts` = { date, report } — o dia e a apresentação do serviço (situam as pernas no tempo; sem eles decide o relógio).
export const legsBrokenKind = (legs0, opts = {}) => {
  const legs = Array.isArray(legs0) ? legs0.filter(Boolean) : [];
  if (legs.length < 2) return null;
  let kind = null;
  for (const g of legGaps(legs, opts || {})) {
    if (!g) continue;
    if (g.before) return 'before';
    if (g.groundMin >= SHORTEST_REST_MIN) kind = 'rest';
  }
  return kind;
};
export const legsBroken = (legs0, opts = {}) => !!legsBrokenKind(legs0, opts);
// Split duty a partir das LEGS (CS FTL.1.220): o MAIOR intervalo em terra ≥3h entre setores (on-block da perna anterior →
// off-block da seguinte, com volta à meia-noite). "A single break" → só o maior conta. DERIVADO das legs (não persistido à
// parte) → sempre coerente com as horas reais e sobrevive a gravar/reler (as legs vão no roster_meta). {0,null} se não houver.
// Se as pernas não formam um PSV (`legsBrokenKind`), não há intervalo que se conheça: `{ 0, null, broken: 'before'|'rest' }`.
export const splitFromLegs = (legs0, opts = {}) => {
  const broken = legsBrokenKind(legs0, opts);   // todas as pernas, com o posicionamento do fim
  if (broken) return { splitBreakH: 0, splitBreakStart: null, broken };
  const legs = fdpLegsOf(legs0);
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
  const legs = Array.isArray(duty.legs) ? duty.legs.filter((l) => l && !l.dh) : [];   // o posicionamento não é setor (215(a))
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
  const fl = fdpLegsOf(legs);
  const l0 = legs[0], lN = fl[fl.length - 1];   // o fim do PSV: o último setor operado (105(12))
  const day = date || null;
  // Uma hora "antes" da apresentação no relógio é do dia seguinte (o serviço passa a meia-noite): converte-se com o fuso
  // DESSE dia — na noite da mudança de hora o desvio muda às 01:00/02:00 (revisão do 8b, E5: o PSV saía com 1 h a menos
  // em outubro e 1 h a mais em março).
  // Os instantes vêm da CADEIA do serviço (data/zulu.js, legsChainMs): apresentação → partida → chegada → partida seguinte, cada
  // hora no fuso do seu dia; não depende de voo + fuso caber em 24 h. Sem fuso conhecido, o legZulu (relógio).
  const chain = day ? legsChainMs(day, legs, duty.report_time) : [];
  const fmtMs = (ms) => { const d = new Date(ms); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
  const off0 = parseHhmm(l0.off);
  const offZ0 = chain[0] && chain[0].offMs != null ? fmtMs(chain[0].offMs) : parseHhmm(day ? legZulu(day, l0, 'off', duty.report_time) : l0.offZ);
  if (off0 == null || offZ0 == null) return { bandShiftMin: 0, elapsedAdjMin: 0, reportMs: null };
  const digitsOff = nrm(off0 - offZ0);                          // o relógio das horas da escala (desvio UTC)
  const reportZ = ((offZ0 - durationMin(rep, off0)) % 1440 + 1440) % 1440;
  // Tempo decorrido: só quando o fim registado é a chegada do último setor (senão não se sabe o relógio do fim).
  let elapsedAdjMin = 0;
  const iN = fl.length - 1, cN = chain[iN];
  const onN = parseHhmm(lN.on), onZN = cN && cN.onMs != null ? fmtMs(cN.onMs) : parseHhmm(day ? legZulu(day, lN, 'on', duty.report_time) : lN.onZ), end = parseHhmm(duty.block_on);
  if (onN != null && onZN != null && end != null && end === onN) {
    // Com os dois instantes, o tempo decorrido é a diferença real (apresentação = 1.ª partida − o que o relógio diz antes dela).
    const inst0 = !!(chain[0] && chain[0].offMs != null && cN && cN.onMs != null);
    const realInst = inst0 ? Math.round((cN.onMs - chain[0].offMs) / 60000) + durationMin(rep, off0) : null;
    // Instantes sem sentido (fora de 0–24 h) → volta ao relógio, em vez de deitar o tempo decorrido fora (4.ª revisão do 8b).
    const inst = realInst != null && realInst > 0 && realInst <= 1440;
    const realMin = inst ? realInst : durationMin(reportZ, onZN);
    const adj = realMin - durationMin(rep, end);
    // Com os instantes da cadeia, o PSV real (0 a 24 h) manda. Só com o relógio, até 12 h de ajuste: um longo curso tem fusos de
    // 3 h ou mais (LIS→GRU 4 h); o limite antigo de 3 h deitava-o fora (21:15 LIS → 05:30 GRU dava 8:15 em vez de 12:15 —
    // revisão do 8b, E3).
    if (inst ? (realMin > 0 && realMin <= 1440) : Math.abs(adj) <= 720) elapsedAdjMin = adj;
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
  return { bandShiftMin, elapsedAdjMin, reportMs, depOff, baseOff, digitsOff };
};

// ORO.FTL.105(1) + Quadro 1: o estado de aclimatação de um serviço que começa a MAIS de 2 h da base. A referência é a
// última apresentação dentro da faixa de 2 h da base (nos 6 dias antes: o Quadro 1 acaba nas 120 h); o tempo decorrido
// conta-se daí. Sem nenhuma na escala mas com serviços anteriores → mais de 120 h → a coluna "≥ 120". Sem nenhum registo
// anterior → não se sabe (unknown). Devolve { letter: 'in'|'B'|'D'|'X'|null, diffH, elapsedH, unknown }; null sem dados.
// Limite assumido: a aclimatação de partida é a da base (rotações que saem da base e voltam a ela).
// Onde e quando começou um serviço dos dias antes (para a referência do Quadro 1): pelas pernas com horas; sem elas, pela rota
// (o 1.º aeroporto) ou, num serviço em terra sem rota (o calendário não lha dá), no aeroporto da ÚLTIMA CHEGADA antes dele — não
// na base: uma assistência em Newark não é uma apresentação em Lisboa (2.ª revisão de 2026-11-08). Sem forma de o situar →
// { unplaced } com a hora aproximada (na base): só serve para saber se pode estar entre a referência e o serviço (1.ª revisão:
// saltá-lo dava D por engano).
const GROUND_KINDS = new Set(['office', 'training', 'standby_home', 'reserve', 'standby_airport']);
const isoBack = (iso, k) => { const [y, m, d] = String(iso).split('-').map(Number); const t = new Date(y, m - 1, d - k, 12); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
const arrOf = (x) => {
  const lg = Array.isArray(x.legs) && x.legs.length ? x.legs[x.legs.length - 1].arr : null;
  if (lg) return lg;
  const r = String(x.route || '').split(/[^A-Za-z]+/).filter(Boolean);
  return r.length > 1 ? r[r.length - 1] : null;
};
// O aeroporto da última chegada antes de `s`: no próprio dia, os serviços que se apresentam antes; depois os dias anteriores (até 14).
const lastArrivalBefore = (duties, iso, s) => {
  const rep = parseHhmm(s.report_time);
  for (let k = 0; k <= 14; k++) {
    const x = duties && duties[isoBack(iso, k)];
    if (!x || x.deleted) continue;
    const list = [x, ...(Array.isArray(x.extra) ? x.extra : [])]
      .filter((v) => v && v !== s && (k > 0 || (rep != null && parseHhmm(v.report_time) != null && parseHhmm(v.report_time) < rep)))
      .sort((a, b) => (parseHhmm(b.report_time) ?? -1) - (parseHhmm(a.report_time) ?? -1));   // o mais tarde primeiro
    for (const v of list) { const a = arrOf(v); if (a) return a; }
  }
  return null;
};
// Um serviço sem pernas com horas, situado: pela 1.ª perna ou pela rota, ou (em terra) pelo aeroporto da última chegada; as
// horas da escala são as de lá (o calendário dá os serviços em terra na hora do telemóvel, que é a do sítio). Devolve a mesma
// forma do zuluTimingOf, ou null se não se situa.
const placeLegless = (s, base, iso, duties) => {
  const b = String(base || '').trim().toUpperCase();
  const ap0 = (Array.isArray(s.legs) && s.legs[0] && s.legs[0].dep) || String(s.route || '').split(/[^A-Za-z]+/).filter(Boolean)[0]
    || (GROUND_KINDS.has(s.kind || 'flight') ? lastArrivalBefore(duties, iso, s) : null);
  const ap = ap0 ? String(ap0).trim().toUpperCase() : null;
  const ms = ap && iso ? airportUtcMs(iso, s.report_time, ap) : null;
  const dOff = ms != null ? airportOffsetMin(ap, ms) : null;
  if (ms == null || dOff == null) return null;
  const bOff = b ? airportOffsetMin(b, ms) : null;
  return { bandShiftMin: 0, elapsedAdjMin: 0, reportMs: ms, depOff: dOff, baseOff: bOff, digitsOff: dOff, placed: ap };
};
const placeOf = (s, base, iso, duties) => {
  const z = zuluTimingOf(s, base, iso);
  if (z.reportMs != null && z.depOff != null && z.baseOff != null) return { ms: z.reportMs, inBand: Math.abs(z.depOff - z.baseOff) <= 120 };
  const b = String(base || '').trim().toUpperCase();
  const pl = placeLegless(s, base, iso, duties);
  if (pl && pl.baseOff != null) return { ms: pl.reportMs, inBand: Math.abs(pl.depOff - pl.baseOff) <= 120 };
  const rep = parseHhmm(s.report_time);
  const [y, m, d] = String(iso).split('-').map(Number);
  const approx = airportUtcMs(iso, s.report_time, b);
  return { ms: approx != null ? approx : (rep != null ? Date.UTC(y, m - 1, d, Math.floor(rep / 60), rep % 60) : null), unplaced: true };
};
const acclimOf = (duty, { base, date, duties }, me0 = null) => {
  if (!duties || !date || !base) return null;
  const me = me0 || zuluTimingOf(duty, base, date);
  if (me.reportMs == null || me.depOff == null || me.baseOff == null) return null;
  const diffH = Math.abs(me.depOff - me.baseOff) / 60;
  if (diffH <= 2) return { letter: 'in', diffH };
  let refMs = null, unplacedMs = null;
  const [y, m, d] = String(date).split('-').map(Number);
  for (let k = 0; k <= 6; k++) {
    const t = new Date(y, m - 1, d - k, 12);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const x = duties[iso];
    if (!x || x.deleted) continue;
    for (const s of [x, ...(Array.isArray(x.extra) ? x.extra : [])]) {
      if (!s || !s.report_time) continue;
      const p = placeOf(s, base, iso, duties);
      if (p.ms == null || p.ms >= me.reportMs) continue;
      if (p.unplaced) { if (unplacedMs == null || p.ms > unplacedMs) unplacedMs = p.ms; continue; }
      if (p.inBand && (refMs == null || p.ms > refMs)) refMs = p.ms;
    }
  }
  const anyEarlier = Object.keys(duties).some((iso) => iso < date && duties[iso] && !duties[iso].deleted);
  const letter = refMs != null ? acclimLetter(diffH, (me.reportMs - refMs) / 3600000) : anyEarlier ? acclimLetter(diffH, 1e6) : null;
  // Um serviço por situar depois da referência: se tivesse começado na faixa da base, a referência seria ele. Se a letra mudasse
  // → não se sabe (o motor dá o intervalo entre os três estados).
  if (unplacedMs != null && (refMs == null || unplacedMs > refMs) && acclimLetter(diffH, (me.reportMs - unplacedMs) / 3600000) !== letter) {
    return { letter: null, diffH, unknown: true };
  }
  if (refMs != null) return { letter, diffH, elapsedH: (me.reportMs - refMs) / 3600000 };
  if (anyEarlier) return { letter, diffH, elapsedH: null };
  return { letter: null, diffH, unknown: true };
};

// ORO.FTL.105(9) (e 105(8)): a noite (02:00–04:59) mede-se "no fuso horário a que o tripulante está aclimatado" — não nas
// horas da escala, que estão no fuso de cada aeroporto. Pelo Quadro 1, como no PSV: B → a hora da base; D → a hora local;
// X ou por saber → as duas, e quem chama dá "incerto" quando discordam (`either: false`). Em faixa (≤ 2 h da base) o tripulante
// está aclimatado a uma FAIXA de 2 h (ORO.FTL.105(1)) — qual hora dentro dela é convenção → o conservador: noturno se a hora da
// partida, a da base ou a da chegada (se ainda na faixa) o derem (`either: true`, revisão de 2026-11-08).
// Devolve os desvios (min) a somar às horas da escala para as ter em cada leitura, o ajuste do tempo decorrido (no longo curso
// o fim em horas da escala está no fuso da chegada; o real vem da Zulu, até aos calços da ÚLTIMA perna — o período de serviço
// inclui o posicionamento) e o instante da apresentação. Sem legs nem fusos → { shifts: [0] } (o relógio, como antes).
// Um só zuluTimingOf por serviço: a recuperação chama-o para a escala toda.
export const nightClockOf = (duty, { base = null, date = null, duties = null } = {}) => {
  if (!duty || !duty.report_time) return { shifts: [0], either: true, elapsedAdjMin: 0, reportMs: null, acclim: null };
  let z = zuluTimingOf(duty, base, date);
  // Sem pernas com horas (um serviço em terra, um voo só com rota): situa-se e lê-se pelo Quadro 1 como os voos — uma assistência
  // em GRU no estado B é na hora de Lisboa, não na de lá.
  if (z.reportMs == null && date) { const pl = placeLegless(duty, base, date, duties); if (pl) z = pl; }
  const ac = acclimOf(duty, { base, date, duties }, z);
  const letter = ac ? (ac.unknown ? 'unknown' : ac.letter) : null;
  const legs = Array.isArray(duty.legs) ? duty.legs : [];
  let shifts = [z.bandShiftMin || 0], either = true;
  if (z.depOff != null && z.digitsOff != null) {
    // Os desvios no INSTANTE da apresentação (o zuluTimingOf lê-os ao meio-dia, que no dia da mudança de hora não é o da
    // madrugada — 2.ª revisão de 2026-11-08); o do relógio da escala (digitsOff) é o da 1.ª partida.
    const bU = String(base || '').trim().toUpperCase(), dep0 = legs.length ? String(legs[0].dep || '').trim().toUpperCase() : '';
    const atRep = (code, fb) => (code && z.reportMs != null ? (airportOffsetMin(code, z.reportMs) ?? fb) : fb);
    const depOff = atRep(dep0, z.depOff), baseOff = z.baseOff != null ? atRep(bU, z.baseOff) : null;
    const sh = (off) => nrm(off - z.digitsOff);
    if (letter === 'B' && baseOff != null) shifts = [sh(baseOff)];
    else if (letter === 'D') shifts = [sh(depOff)];
    else if ((letter === 'X' || letter === 'unknown') && baseOff != null) { shifts = [...new Set([sh(baseOff), sh(depOff)])]; either = false; }
    else if (baseOff != null && Math.abs(depOff - baseOff) <= 120) {
      // Em faixa: partida, base e chegada (esta só se ainda na faixa da base). Sem base conhecida fica só a hora local.
      const out = [sh(depOff), sh(baseOff)];
      const arr = legs.length ? legs[legs.length - 1].arr : null;
      const arrOff = arr && z.reportMs != null ? airportOffsetMin(String(arr).toUpperCase(), z.reportMs) : null;
      if (arrOff != null && Math.abs(arrOff - baseOff) <= 120) out.push(sh(arrOff));
      shifts = [...new Set(out)];
    } else if (baseOff == null) shifts = [sh(depOff)];
  }
  // Tempo decorrido até aos calços da última perna (posicionamento incluído), quando o fim registado é essa chegada.
  let adj = z.elapsedAdjMin || 0;
  const rep = parseHhmm(duty.report_time), end = parseHhmm(duty.block_on);
  const lL = legs[legs.length - 1], off0 = legs.length ? parseHhmm(legs[0].off) : null;
  if (date && lL && end != null && rep != null && off0 != null && parseHhmm(lL.on) === end) {
    const ch = legsChainMs(date, legs, duty.report_time);
    const c0 = ch[0], cL = ch[legs.length - 1];
    if (c0 && c0.offMs != null && cL && cL.onMs != null) {
      const real = Math.round((cL.onMs - c0.offMs) / 60000) + durationMin(rep, off0);
      if (real > 0 && real <= 1440) adj = real - durationMin(rep, end);
    }
  }
  return { shifts, either, elapsedAdjMin: adj, reportMs: z.reportMs, acclim: letter };
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
  // A CAUDA de um posicionamento (o sign-off é a chegada do DH depois do último setor operado, ORO.FTL.215(b)): pelo tempo
  // decorrido — o DH pode acabar noutro fuso (LIS-OPO e depois DH para PDL: o relógio dava 1 h a menos de serviço).
  const lgsAll = Array.isArray(duty.legs) ? duty.legs : [];
  const lastLg = lgsAll.length ? lgsAll[lgsAll.length - 1] : null;
  const tailReal = (isFl && date && soMin != null && lastLg && lastLg.dh && parseHhmm(lastLg.on) === soMin) ? serviceRealMin(date, lgsAll, duty.report_time).tailMin : null;
  const pf = !isFl ? 0 : tailReal != null ? tailReal : ((soMin != null && onMin != null) ? durationMin(onMin, soMin) : (postFlightMin || 0));
  // Casos especiais — repouso a bordo (205e), adiamento (205g), redução por standby (225): mexem no TETO do PSV
  // deste serviço. Vêm em `duty.special` (persistido em roster_meta).
  const sp = duty.special || {};
  // Split duty (CS FTL.1.220): `splitBreakH` EXPLÍCITO (bloco combinado do dayFtlFromDuties, ou form)
  // ganha; senão DERIVA a maior pausa em terra ≥3h das próprias legs.
  const der = splitFromLegs(duty.legs, { date, report: duty.report_time || null });
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
    let maybe3rd = false;
    if (ctx.duties && ctx.date) {
      const cnt = extCountBefore(ctx.duties, ctx.date, state);
      if (!extPlannedOf(duty, state)) extRefused = 'notPlanned';
      else if (1 + cnt.n > EXT_MAX_PER_7D) { extUsed = true; extRefused = '2in7'; }
      // Com um dia anterior de pernas erradas (não se sabe se foi um prolongamento) este pode ser o 2.º ou o 3.º: incerto, abaixo.
      else if (1 + cnt.n + cnt.maybe > EXT_MAX_PER_7D) { extUsed = true; maybe3rd = true; }
      else { extUsed = true; d = computeDuty({ ...args, extended: true }); }   // legal: o máximo é o do prolongamento
    } else extUsed = true;   // sem a escala: marca-se (conta para os 2 em 7 dias) e o repouso sobe; o veredicto não muda
    // Planeado mas recusado, ou sem a escala para decidir: o máximo fica o do Quadro 2 e o repouso a seguir sobe na mesma.
    if (extUsed && (extRefused !== null || !(ctx.duties && ctx.date))) d = computeDuty({ ...args, restExtended: true });
    // "A lei é que manda": entre o Quadro 2 (se este for o 3.º) e o prolongamento (se for o 2.º) → incerto, com o que falta.
    if (maybe3rd) d = widenDuty([computeDuty({ ...args, restExtended: true }), computeDuty({ ...args, extended: true })], 'extCount');
  }
  // As pernas não formam um PSV (legsBrokenKind): o serviço CONTA (ORO.FTL.210) — a apresentação e os últimos calços dão o PSV
  // e o período de serviço —, mas falta um facto de que a lei precisa: as horas certas das pernas. "A lei é que manda": o PSV
  // fica INCERTO, com o que falta (`legTimes`), entre o máximo GARANTIDO (o do Quadro 2) e o POSSÍVEL em todas as leituras:
  //   · um repartido que as horas erradas não deixam ver — o intervalo cabe no PSV e é inferior a 10 h (105(6)); o máximo sobe
  //     até 50 % dele, tirado o pré e pós-voo (CS FTL.1.220(b) e (c)), com o alojamento que o tripulante indicou (por
  //     indicar: até ao caso mais favorável, o alojamento adequado);
  //   · ou o prolongamento planeado (ORO.FTL.205(d)), se o serviço cabia nele.
  // Nunca "dentro" (uma das horas está errada, e pode ser a do fim). "Excede" só acima do máximo possível, e só quando é de
  // certeza um PSV único ('before'); com 10 h ou mais em terra ('rest') podem ser dois serviços: fica incerto.
  let extMaybe = false;
  if (der.broken && isFdp && d.fdp) {
    const act = d.fdp.actualFdpMin;
    // O prolongamento só é uma leitura possível se o serviço cabia nele, era planeado e ainda cabe nos "2 em 7 dias" (com dois
    // prolongamentos CERTOS antes já não cabe — 3.ª passagem independente).
    extMaybe = extFitOf(duty, d, { state: stateEff, isFdp, sp, der: { ...der, broken: null } }).fits && extPlannedOf(duty, state)
      && !(ctx.duties && ctx.date && 1 + extCountBefore(ctx.duties, ctx.date, state).n > EXT_MAX_PER_7D);
    // Cada variante em todas as leituras da aclimatação, quando ela está por saber (como acima): senão o máximo possível
    // ficava só pela hora "auto" e um serviço fora da base dava "excede" sem o ser em todas as leituras.
    const reads = (a) => {
      if (!(ac && ac.unknown)) return [computeDuty(a)];
      const zB = zuluTimingOf(duty, base, date, 'base'), zD = zuluTimingOf(duty, base, date, 'dep');
      return [computeDuty({ ...a, state: 'acc', bandShiftMin: zB.bandShiftMin }), computeDuty({ ...a, state: 'acc', bandShiftMin: zD.bandShiftMin }), computeDuty({ ...a, state: 'unk' })];
    };
    const variants = [d];
    // (o alojamento é o que o tripulante disse do serviço; por indicar, o motor já dá o intervalo até ao mais favorável)
    if (act != null) variants.push(...reads({ ...args, splitBreakH: Math.min(SHORTEST_REST_MIN - 1, act) / 60, splitBreakStart: null }));
    if (extMaybe) variants.push(...reads({ ...args, extended: true }));
    const w = widenDuty(variants, 'legTimes');
    let fdp = { ...w.fdp, unknowns: Array.from(new Set([...(w.fdp.unknowns || []), 'legTimes'])) };
    if (der.broken === 'rest' || !fdp.over) fdp = { ...fdp, over: false, excessMin: 0, excessStr: null, uncertain: true };
    const disc = (d.discretion && !fdp.over) ? { ...d.discretion, over: false, uncertain: true } : d.discretion;
    d = { ...w, fdp, discretion: disc, ...validateDuty({ fdp, reportMin: d.reportMin, endMin: d.endMin, sectors: d.sectors }) };
  }
  return { ...d, isFdp, kind, pf, inBase: ib, extUsed, extRefused, tzDiffH, tzSignedH: tzSignedOf(duty, base, date), acclim: ac, legsBroken: der.broken || undefined, extMaybe: extMaybe || undefined };
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
  // As pernas não formam um PSV (legsBroken): não se sabe se houve intervalo. ESCOLHA da app, não é a letra do 205(d)(4) (que
  // só proíbe juntar o prolongamento ao do repartido): a um serviço com as horas das pernas erradas não se dá o prolongamento —
  // fica o máximo do Quadro 2, como antes desta correção. (O repouso a seguir também não leva as 2 h do 205(d)(1)(i).)
  if (der.broken) return { fits: false };   // 'before' ou 'rest'
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
// Devolve { n, maybe }: `n` = os prolongamentos certos; `maybe` = os dias cujas pernas não formam um PSV (legsBroken) e que, pela
// apresentação e pelo fim, cabiam no prolongamento planeado — não se sabe se o foram (podiam ser um repartido).
const extCountBefore = (duties, date, state = 'acc') => {
  const [y, m, dd] = String(date).split('-').map(Number);
  let n = 0, maybe = 0;
  for (let k = 1; k <= 6; k++) {
    const t = new Date(y, m - 1, dd - k, 12);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    const x = duties[iso];
    if (!x || x.deleted || !x.report_time || !x.block_on) continue;
    const dx = computeDuty({ state, report: x.report_time, end: x.block_on, sectors: x.sectors || 0 });
    const derx = splitFromLegs(x.legs, { date: iso, report: x.report_time || null });
    if (extFitOf(x, dx, { state, isFdp: isFdpDuty(x), sp: x.special || {}, der: { ...derx, broken: null } }).fits && extPlannedOf(x, state)) { if (derx.broken) maybe++; else n++; }
  }
  return { n, maybe };
};

// Dia local (ORO.FTL.105(15)): as horas depois da meia-noite são do dia seguinte (bloco 8b, A-173). Minutos de um período que
// começa em `startMin` (relógio) e dura `durMin` que caem depois da meia-noite.
const afterMidnightMin = (startMin, durMin) => (startMin == null || !(durMin > 0)) ? 0 : Math.max(0, Math.min(durMin, startMin + durMin - 1440));
// Tempo de voo depois da meia-noite, pelas pernas (sem posicionamentos) ou, sem pernas, pelos calços do serviço. Sem horas de
// todas as pernas → 0 (fica no dia da apresentação, como antes). Reparte o `flight_minutes` na proporção das pernas.
const vooAfterMidnightMin = (duty = {}, startMin, date = null) => {
  const fm = Math.round(duty.flight_minutes || 0);
  if (!fm || startMin == null) return 0;
  const all = (Array.isArray(duty.legs) && duty.legs.length) ? duty.legs.filter(Boolean) : [];
  const legs = all.length ? all.filter((l) => !l.dh)
    : (duty.block_off ? [{ off: duty.block_off, on: duty.block_on }] : []);
  if (!legs.length) return 0;
  const midRel = 1440 - startMin;   // a meia-noite, em minutos desde o início
  // Com a data e os fusos: os instantes da cadeia do serviço (data/zulu.js) — a meia-noite é a do relógio da escala (o da 1.ª
  // partida), contada desde o instante da apresentação; cada perna conta o que dela cai depois. Sem fusos, o relógio (abaixo).
  if (date && all.length) {
    const rep = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`;
    const repMs = chainReportMs(date, all, rep), ch = legsChainMs(date, all, rep);
    const op = all.map((l, i) => [l, ch[i]]).filter(([l]) => !l.dh);
    if (repMs != null && op.length && op.every(([, c]) => c && c.offMs != null && c.onMs != null)) {
      const midMs = repMs + midRel * 60000;
      let totC = 0, afterC = 0;
      for (const [, c] of op) { totC += c.onMs - c.offMs; afterC += Math.max(0, c.onMs - Math.max(c.offMs, midMs)); }
      return totC ? Math.min(fm, Math.round(fm * afterC / totC)) : 0;
    }
  }
  // Com as horas Zulu de todas as pernas, cada uma passa para o relógio da escala (o desvio da 1.ª partida): as horas locais de
  // cada aeroporto misturam fusos e, no longo curso, repartiam mal à volta da meia-noite (revisão do 8b, reparo 2).
  // O relógio da escala é o da 1.ª perna do SERVIÇO (com os posicionamentos), o mesmo do zuluTimingOf (revisão do 8b, E2).
  const l0 = all.length ? all[0] : legs[0];
  const allZ = legs.every((l) => l.offZ && l.onZ) && parseHhmm(l0.off) != null && parseHhmm(l0.offZ) != null;
  const shift = allZ ? parseHhmm(l0.off) - parseHhmm(l0.offZ) : 0;
  const clk = (z) => (((parseHhmm(z) + shift) % 1440) + 1440) % 1440;
  let tot = 0, after = 0;
  for (const l of legs) {
    const off = allZ ? clk(l.offZ) : parseHhmm(l.off), on = allZ ? clk(l.onZ) : parseHhmm(l.on);
    if (off == null || on == null) return 0;
    let a = off - startMin; while (a < 0) a += 1440;
    const dur = durationMin(off, on);
    tot += dur; after += Math.max(0, Math.min(dur, a + dur - midRel));
  }
  return tot ? Math.min(fm, Math.round(fm * after / tot)) : 0;
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
  // O serviço estimado é o MÍNIMO (a apresentação vem antes dos calços). O MÁXIMO possível: a apresentação no próprio dia, desde a
  // meia-noite (o serviço é do dia da apresentação; sem a hora dos calços, o dia todo) — os períodos do 210 dizem "incerto"
  // quando só o máximo passa o limite (bloco 4, "a lei é que manda").
  const servicoMaxMin = servicoMin + (off != null ? off : 1440);
  return {
    src: 'duty', engineVer: ENGINE_VERSION, servicoEst: true, servicoMaxMin,
    psv: { result: null, max: null, over: false, excess: null, latest: null, latestNextDay: false, extended: false, noReport: true, fdp: isFl, kind: duty.kind || null, ts: Date.now() },
    servicoMin, servico: servicoMin / 60, vooMin, voo: vooMin / 60, rest: {},
    servicoNextMin: afterMidnightMin(off, servicoMin) || undefined, vooNextMin: vooAfterMidnightMin(duty, off) || undefined,
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
  // Com as pernas que não batem certo (`legTimes`, ftlForDuty) a margem conta-se sobre o máximo POSSÍVEL: declarar a discrição
  // não transforma um incerto em "excede" (3.ª passagem independente). `ltOver` = excede em todas as leituras.
  const lt = (d.fdp.unknowns || []).includes('legTimes');
  const disc205 = sp.discretion
    ? computeDiscretion({ maxFdpMin: (lt && d.fdp.maxHiMin != null) ? d.fdp.maxHiMin : d.fdp.maxFdpMin, actualFdpMin: d.fdp.actualFdpMin, restMin: d.rest.restMin, inFlightRest: !!sp.augmented })
    : null;
  const ltOver = lt ? (!!d.fdp.over && (!disc205 || !!disc205.over)) : null;
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
      // (com o máximo exato só há "incerto" quando as horas das pernas não batem certo — `legTimes`, ftlForDuty)
      uncertain: sbAcc ? undefined : lt ? (!ltOver || undefined) : d.fdp.exact ? undefined : ((disc205 ? !!disc205.uncertain : !!d.fdp.uncertain) || undefined),
      unknowns: (d.fdp.unknowns && d.fdp.unknowns.length) ? d.fdp.unknowns : undefined,
      band: d.fdp.band, start: duty.report_time, end: duty.block_on,
      endNextDay: repMin != null && endMin != null && endMin < repMin,
      // Hora-limite de calços (2026-11-03) — o Início mostra-a no dia do voo. Standby com alojamento não é PSV.
      latest: sbAcc ? null : d.latestOnBlockStr, latestNextDay: sbAcc ? false : d.latestOnBlockNextDay,
      over: sbAcc ? false : lt ? ltOver : (disc205 ? disc205.over : d.fdp.over),
      excess: sbAcc ? null : ((disc205 && disc205.used && !disc205.over) ? null : d.fdp.excessStr),
      extended: usedExtension, extRefused: d.extRefused || undefined, ts: Date.now(),
      acclim: (d.acclim && d.acclim.letter !== 'in') ? (d.acclim.letter || 'unknown') : undefined,   // Quadro 1
      disc205f: disc205 ? { used: disc205.used, over: disc205.over, maxStr: disc205.maxStr, extStr: disc205.extStr } : undefined,
      standby: sbAcc || undefined,
    },
    servicoMin, servico: servicoMin / 60,
    vooMin, voo: vooMin / 60,
    // A parte depois da meia-noite (dia local seguinte, bloco 8b): o período de serviço desde a apresentação; no standby em
    // casa, a mesma proporção dos 25 %. O standby anterior fica no dia da apresentação.
    servicoNextMin: (d.dutyPeriodMin && repMin != null ? Math.round(afterMidnightMin(((repMin - (d.startEarlierMin || 0)) % 1440 + 1440) % 1440, d.dutyPeriodMin) * baseServicoMin / d.dutyPeriodMin) : 0) || undefined,
    vooNextMin: vooAfterMidnightMin(duty, repMin, date) || undefined,
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
  // Com o dia, o período de serviço é tempo DECORRIDO (os instantes do relógio do dispositivo, como em data/today.js): só muda
  // nas duas noites da mudança de hora (a 25/10, 00:00 → 11:30 são 12:30 reais).
  if (repPrev != null && date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    const at = (min, add = 0) => { const x = new Date(`${date}T00:00:00`); x.setDate(x.getDate() + add); x.setHours(Math.floor(min / 60), min % 60, 0, 0); return +x; };
    const s0 = at(repPrev); let e0 = at(endMin); if (e0 <= s0) e0 = at(endMin, 1);
    const real = Math.round((e0 - s0) / 60000);
    if (Number.isFinite(real) && real > 0) dutyMin = real;
  }
  const pr = repPrev != null ? ftlForDuty(prev, { inBase, base, postFlightMin, isPilot, date }) : null;
  const ib = pr ? pr.inBase : inBase;
  const aug = prev.special && prev.special.augmented;
  const r = computeRest({ prevDutyMin: dutyMin, inBase: ib, tzDiffH: pr ? pr.tzDiffH : 0, inflightRest: !!(aug && aug.restClass), extended: !!(pr && pr.extUsed) });
  // `legsDoubt`: as pernas deste serviço não formam um PSV (ftlForDuty) — o repouso a seguir depende da leitura (data/today.js).
  const legsDoubt = pr && pr.legsBroken ? { kind: pr.legsBroken, extMaybe: !!pr.extMaybe } : null;
  // O PSV deste serviço (realizado e máximo possível): para saber se cabia REDUZIDO depois de um repouso reduzido (CS 235(c)(4)).
  const psvMin = pr && pr.isFdp && pr.fdp ? pr.fdp.actualFdpMin : null;
  const psvMaxHiMin = pr && pr.isFdp && pr.fdp ? (pr.fdp.maxHiMin != null ? pr.fdp.maxHiMin : pr.fdp.maxFdpMin) : null;
  // … e o máximo com o prolongamento da CS FTL.1.205(b), se a hora e os setores o admitem (planeado ou não: não se sabe).
  let psvExtMaxMin = null;
  if (pr && pr.isFdp && repPrev != null && onPrev != null) {
    const e = computeFdp({ state: 'acc', reportMin: repPrev, endMin: onPrev, sectors: prev.sectors || 0, extended: true });
    if (e && !e.notAllowed && e.maxFdpMin != null) psvExtMaxMin = e.maxFdpMin;
  }
  return { endMin, dutyMin, inBase: ib, floorMin: r.floorMin, requiredMin: r.restMin, requiredPostOnlyMin: r.restPostOnlyMin, extended: r.extended, reason: r.reason, tzSignedH: pr ? pr.tzSignedH : 0, legsDoubt, psvMin, psvMaxHiMin, psvExtMaxMin };
};

// `date` (o dia dos dois serviços): o tempo entre eles é tempo DECORRIDO — mede-se pelos instantes do relógio do dispositivo,
// como o repouso em data/today.js (restServices). Só muda nas duas noites da mudança de hora (2026-11-11, noite 10: no relógio,
// 00:50 → 13:00 são 12:10; a 29/03 são 11:10 reais). Sem o dia, o relógio, como antes.
export const restBetweenDuties = (prev, next, { inBase = true, postFlightMin = 0, date = null } = {}) => {
  if (!prev || !next) return null;
  const repNext = parseHhmm(next.report_time);
  const ra = restAfterDuty(prev, { inBase, postFlightMin, date });
  if (!ra || repNext == null) return null;
  const endPrev = ra.endMin, prevDutyMin = ra.dutyMin;
  let gapMin = repNext - endPrev; while (gapMin < 0) gapMin += 1440;          // next reporta depois do fim de prev
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    const at = (min, add = 0) => { const x = new Date(`${date}T00:00:00`); x.setDate(x.getDate() + add); x.setHours(Math.floor(min / 60), min % 60, 0, 0); return +x; };
    const repPrev = parseHhmm(prev.report_time);
    let endMs = at(endPrev); if (repPrev != null && endMs <= at(repPrev)) endMs = at(endPrev, 1);   // o fim passou a meia-noite
    let nextMs = at(repNext); if (nextMs < endMs) nextMs = at(repNext, 1);
    const real = Math.round((nextMs - endMs) / 60000);
    if (Number.isFinite(real) && real >= 0) gapMin = real;
  }
  const place = ra.inBase ? 'base' : 'away';
  const minRest = ra.requiredMin;                                             // a regra única (restAfterDuty)
  // 'either' (2026-11-11, noite 8): 10 h ou mais, mas menos do que o repouso que se aplica ao caso (12 h na base, ou o serviço
  // anterior). "Intervalo" é INFERIOR a um período de repouso (ORO.FTL.105(6)) e 10 h já são um repouso possível (235(b); na
  // base com alojamento adequado, 235(a)(2); CS FTL.1.235(c)(1)): o texto admite as duas leituras — um intervalo de um PSV só
  // (repartido), ou um repouso entre dois PSV (curto, sem alojamento adequado). A app não escolhe. Antes: 'split'.
  let kind, legal;
  if (gapMin >= minRest) { kind = 'rest'; legal = true; }
  else if (gapMin >= SHORTEST_REST_MIN) { kind = 'either'; legal = null; }
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
// `foldEither` (2026-11-11, noite 10): quando entre o fim da assistência e a apresentação há 10 h ou mais, mas menos do que o
// repouso do caso ('either'), há duas leituras — a assistência só acaba na apresentação (CS FTL.1.225(b)(5): dobra-se no voo),
// ou houve um repouso mínimo no meio e esse tempo não conta como assistência (GM1 CS FTL.1.225(b)). `true` = a 1.ª leitura
// (a de sempre; o voo leva `preStandby.either`); `false` = a 2.ª (a assistência fica à parte, com `restAfter`).
const foldStandbyIntoFlight = (list, inBaseOf, postFlightMin, date = null, foldEither = true) => {
  const sorted = list.filter(Boolean).slice().sort((a, b) => (parseHhmm(a.report_time) ?? 0) - (parseHhmm(b.report_time) ?? 0));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const sb = sorted[i], nx = sorted[i + 1];
    const foldable = sb && (sb.kind === 'standby_home' || (sb.kind === 'standby_airport' && sb.accommodation))
      && nx && (nx.kind || 'flight') === 'flight' && !(nx.special && nx.special.preStandby);
    if (foldable) {
      const gap = restBetweenDuties(sb, nx, { inBase: inBaseOf(sb), postFlightMin, date });
      const st = parseHhmm(sb.report_time), rp = parseHhmm(nx.report_time);
      if (gap && gap.kind === 'either' && !foldEither) { out.push({ ...sb, restAfter: true }); continue; }
      if (gap && gap.kind !== 'rest' && st != null && rp != null) {
        const preStandby = { type: sb.kind === 'standby_airport' ? 'airport' : 'other', standbyH: durationMin(st, rp) / 60, startMin: st, folded: true, ...(gap.kind === 'either' ? { either: true } : {}) };
        out.push({ ...nx, special: { ...(nx.special || {}), preStandby } });
        i++;
        continue;
      }
    }
    out.push(sb);
  }
  return out;
};

// AS DUAS LEITURAS de uma assistência seguida de um voo com 10 h ou mais entre os dois (ver foldStandbyIntoFlight). As contas do
// dia (serviço, voo, repouso) são as da leitura de sempre — a assistência até à apresentação, o máximo, nunca a menos. O
// VEREDICTO do PSV: "excede" só se excede nas duas leituras; "dentro" só se está dentro nas duas; senão incerto, com o que
// falta (`standbyRest`: se houve um repouso mínimo antes da apresentação).
export const dayFtlFromDuties = (list = [], opts = {}) => {
  const a = dayFtlCore(list, opts, true);
  if (!a || !a.sbEither) return a;
  const { sbEither: _s, ...resA } = a;
  const b0 = dayFtlCore(list, opts, false);
  if (!b0) return resA;
  const st = (r) => (r.psv.over ? 2 : r.psv.uncertain ? 1 : 0);
  // O SERVIÇO do dia (ORO.FTL.210) nas duas leituras: a assistência conta até à apresentação, ou só o que durou (CS
  // FTL.1.225(b)(3): 25 % em casa; no aeroporto, tudo). O certo é o menor; o possível, o maior.
  const maxOf = (r) => (typeof r.servicoMaxMin === 'number' ? r.servicoMaxMin : entryMin(r, 'servico'));
  const sLo = Math.min(entryMin(resA, 'servico'), entryMin(b0, 'servico')), sHi = Math.max(maxOf(resA), maxOf(b0));
  const lower = entryMin(b0, 'servico') <= entryMin(resA, 'servico') ? b0 : resA;
  const range = sHi > sLo ? { servicoMin: sLo, servico: sLo / 60, servicoNextMin: lower.servicoNextMin, servicoMaxMin: sHi, servicoMaxReadings: true } : {};
  if (st(resA) === st(b0) && st(resA) !== 1) return { ...resA, ...range };
  const psv = { ...resA.psv, over: false, excess: null, uncertain: true, unknowns: Array.from(new Set([...(resA.psv.unknowns || []), 'standbyRest'])) };
  const folded = (m) => !!(m && m.special && m.special.preStandby && m.special.preStandby.either);
  return { ...resA, ...range, psv, ...(resA.blocks ? { blocks: resA.blocks.map((bl) => (bl.members.some(folded) ? { ...bl, psv } : bl)) } : {}) };
};
const dayFtlCore = (list = [], opts = {}, foldEither = true) => {
  const sbTag = (entry, arr0) => (foldEither && entry && arr0.some((d) => d && d.special && d.special.preStandby && d.special.preStandby.either) ? { ...entry, sbEither: true } : entry);
  const gapInBase0 = (prev) => { const away = endsAwayReliable(prev, opts.base); return away == null ? (opts.inBase !== false) : !away; };
  const arr = foldStandbyIntoFlight(Array.isArray(list) ? list : [list], gapInBase0, opts.postFlightMin || 0, opts.date || null, foldEither);
  // Mantém a duty CRUA ao lado do registo FTL (precisa-se das horas p/ o repouso entre serviços).
  const all = arr.map((d) => ({ duty: d, entry: dutyToFtlDay(d, opts) })).filter((p) => p.entry);
  if (!all.length) return null;
  // `opts.withBlocks` (Simulação, auditoria A-248): junta os blocos de PSV do dia, cada um com os seus serviços, para o herói
  // mostrar o PSV do bloco do serviço simulado — o mesmo cálculo do veredicto. Não vai para o dayLog (fica fora por omissão).
  const withB = (entry, blks) => sbTag(opts.withBlocks ? { ...entry, blocks: blks } : entry, arr);
  const blk1 = (p) => [{ psv: p.entry.psv, members: [p.duty] }];
  // Serviços SEM report (A-161): somam ao 210 (voo sempre; serviço estimado), mas não entram nos blocos de PSV nem no
  // repouso — não se sabe quando começaram.
  const noRep = all.filter((p) => !p.duty.report_time);
  const paired = all.filter((p) => p.duty.report_time);
  const extraMin = (key) => noRep.reduce((s, p) => s + entryMin(p.entry, key), 0);
  // O que os serviços sem report podem acrescentar no máximo (ver noReportEntry): soma-se ao mínimo do dia.
  const estMax = noRep.reduce((s, p) => s + ((typeof p.entry.servicoMaxMin === 'number' ? p.entry.servicoMaxMin : entryMin(p.entry, 'servico')) - entryMin(p.entry, 'servico')), 0);
  // `readMax` (definido mais abaixo, quando há blocos): o que as DUAS LEITURAS de um 'either' podem acrescentar ao serviço do dia.
  let readMax = 0;
  const withMax = (entry) => ((noRep.length || readMax) ? { ...entry, servicoMaxMin: entryMin(entry, 'servico') + estMax + readMax, ...(readMax ? { servicoMaxReadings: true } : {}) } : entry);
  // A parte depois da meia-noite de vários serviços somados (bloco 8b).
  const nextOf = (list) => { const sv = list.reduce((s, e) => s + nextMin(e, 'servico'), 0), vo = list.reduce((s, e) => s + nextMin(e, 'voo'), 0); return { servicoNextMin: sv || undefined, vooNextMin: vo || undefined }; };
  if (!paired.length) {
    if (noRep.length === 1) return withB(noRep[0].entry, []);
    const sMin = extraMin('servico'), vMin = extraMin('voo');
    return withB(withMax({ ...noRep[0].entry, servicoMin: sMin, servico: sMin / 60, vooMin: vMin, voo: vMin / 60, ...nextOf(noRep.map((p) => p.entry)), parts: noRep.map((p) => p.entry.psv) }), []);
  }
  // Ordena cronologicamente pelo report → os serviços do dia ficam por ordem (1.º, 2.º, …).
  paired.sort((a, b) => (parseHhmm(a.duty.report_time) ?? 0) - (parseHhmm(b.duty.report_time) ?? 0));
  const entries = paired.map((p) => p.entry);
  if (entries.length === 1 && !noRep.length) return withB(entries[0], blk1(paired[0]));
  if (entries.length === 1) {
    const sMin = entryMin(entries[0], 'servico') + extraMin('servico'), vMin = entryMin(entries[0], 'voo') + extraMin('voo');
    return withB(withMax({ ...entries[0], servicoMin: sMin, servico: sMin / 60, vooMin: vMin, voo: vMin / 60, servicoEst: true, ...nextOf([entries[0], ...noRep.map((p) => p.entry)]), parts: [...entries, ...noRep.map((p) => p.entry)].map((e) => e.psv) }), blk1(paired[0]));
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
    const g = restBetweenDuties(paired[i].duty, paired[i + 1].duty, { inBase: gapInBase(paired[i].duty), postFlightMin: opts.postFlightMin || 0, date: opts.date || null });
    // A leitura "houve um repouso mínimo depois da assistência" (foldStandbyIntoFlight, `restAfter`): é um repouso.
    // … e a assistência (que não é PSV) também não se junta ao serviço de ANTES dela.
    const sbRest = g && ((g.kind === 'either' && paired[i].duty.restAfter) || (g.kind !== 'rest' && paired[i + 1].duty.restAfter));
    gaps.push(sbRest ? { ...g, kind: 'rest', legal: true } : g);
  }
  const between = gaps.filter(Boolean);
  // `split` = algum par ficou junto num PSV só para as contas do dia (repartido certo, ou a leitura A de um 'either');
  // `either` = algum par pode ser intervalo OU repouso (as duas leituras) — o veredicto olha para as duas, abaixo.
  const split = between.some((b) => b.kind === 'split' || b.kind === 'either');
  const either = between.some((b) => b.kind === 'either');
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
      const rb = restBetweenDuties(blk[i].duty, blk[i + 1].duty, { inBase: gapInBase(blk[i].duty), postFlightMin: opts.postFlightMin || 0, date: opts.date || null });
      if (!rb || (rb.kind !== 'split' && rb.kind !== 'either')) continue;   // só uma pausa ≥3h estende; 'continuous' (<3h) não
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
    const ce0 = dutyToFtlDay(combined, opts);
    if (!ce0) return blk[0].entry;
    // O FDP combinado não leva as pernas: se as de algum dos serviços não formam um PSV (`legTimes`), a dúvida passa para ele.
    const lt = blk.some((p) => p.entry && p.entry.psv && (p.entry.psv.unknowns || []).includes('legTimes'));
    const ce = !lt ? ce0 : { ...ce0, psv: { ...ce0.psv, uncertain: ce0.psv.over ? ce0.psv.uncertain : true, unknowns: Array.from(new Set([...(ce0.psv.unknowns || []), 'legTimes'])) } };
    // O FDP combinado não leva as pernas: o voo depois da meia-noite é a soma do de cada serviço (todos do mesmo dia).
    const vn = blk.reduce((s, p) => s + nextMin(p.entry, 'voo'), 0);
    return { ...ce, vooNextMin: vn || undefined };
  };
  // AS DUAS LEITURAS de um 'either' (ver restBetweenDuties). Os blocos de cima são a leitura A (um PSV repartido): é ela que dá o
  // serviço e o voo do dia (o intervalo conta todo como PSV, ORO.FTL.220(b) — o máximo, nunca a menos). O VEREDICTO do PSV de um
  // bloco com um 'either' lá dentro olha também para a leitura B (dois PSV com um repouso no meio):
  //   · a leitura B é LEGAL se os PSV separados estão dentro e o repouso chega: na base, com alojamento adequado (235(a)(2):
  //     10 h) e não inferior ao serviço anterior; é ILEGAL de certeza se um PSV excede ou o repouso é curto de certeza — fora
  //     da base, ou inferior ao serviço anterior, ou sem alojamento adequado (dito pelo tripulante: nenhum, ou só uma sala);
  //   · o dia é ilegal ("excede") só se o é nas duas leituras; "dentro" só se o é nas duas; senão incerto, com o que falta
  //     (`breakOrRest`). (Ilegal nas duas: mostra-se o PSV da leitura A — na B o que falha é o repouso entre os dois.)
  const suitable = (x) => x === true || x === 'suitable';
  const notSuitable = (x) => x === 'none' || x === 'basic';
  const blockEntryBoth = (blk) => {
    const a = blockEntry(blk);
    const idx = blk.map((p) => paired.indexOf(p));
    const cuts = idx.slice(0, -1).filter((k) => gaps[k] && gaps[k].kind === 'either');
    if (!cuts.length) return a;
    const subs = [[blk[0]]];
    for (let j = 1; j < blk.length; j++) { if (cuts.includes(idx[j - 1])) subs.push([blk[j]]); else subs[subs.length - 1].push(blk[j]); }
    const bs = subs.map(blockEntry);
    const overB = bs.some((e) => e.psv.over), uncB = bs.some((e) => e.psv.uncertain);
    // O "serviço precedente" do repouso da leitura B (ORO.FTL.235(a)(1)/(b)) é o PSV inteiro que vem antes — que pode já ser
    // um repartido de vários serviços: da apresentação do 1.º desse sub-bloco ao fim do serviço k (revisão independente).
    const prevDutyB = (k) => {
      let j = k; while (j > idx[0] && !cuts.includes(j - 1)) j--;
      const r0 = parseHhmm(paired[j].duty.report_time), r1 = parseHhmm(paired[k + 1].duty.report_time);
      return (r0 == null || r1 == null) ? gaps[k].prevDutyMin : Math.max(gaps[k].prevDutyMin, durationMin(r0, r1) - gaps[k].gapMin);
    };
    // Acréscimos ao mínimo que o restAfterDuty já calcula (as horas do prolongamento, 205(d)(1); o piso de 14 h depois de
    // repouso a bordo): com eles o repouso de 10 h não é legal DE CERTEZA — fica incerto.
    const extras = (k) => gaps[k].requiredMin > Math.max(gaps[k].prevDutyMin, 720);
    const restOkB = cuts.every((k) => gaps[k].place === 'base' && suitable(paired[k].duty.accommodation) && gaps[k].gapMin >= prevDutyB(k) && !extras(k));
    // O repouso da leitura B só é curto DE CERTEZA abaixo do mínimo do repouso reduzido (CS FTL.1.235(c)(1): 12 h na base, 10 h
    // fora — e um 'either' tem sempre 10 h ou mais): na base, com menos de 12 h e sem alojamento adequado (dito), ou inferior
    // ao serviço anterior. Entre o mínimo reduzido e o normal depende de a companhia ter repouso reduzido → não é "de certeza".
    const restBadB = cuts.some((k) => gaps[k].place === 'base' && gaps[k].gapMin < 720 && (notSuitable(paired[k].duty.accommodation) || gaps[k].gapMin < prevDutyB(k)));
    // O SERVIÇO do bloco para os limites do ORO.FTL.210 também depende da leitura: como um PSV repartido o intervalo conta todo
    // (ORO.FTL.220(b)); como dois PSV, não. Fica o CERTO (o menor) e o POSSÍVEL (`servicoMaxMin`, o maior) — um limite só
    // "excede" com o certo; com o possível fica incerto (ftl/validators/validateLimits.js). O voo é o mesmo.
    const sA = entryMin(a, 'servico'), sB = bs.reduce((s, e) => s + entryMin(e, 'servico'), 0);
    const range = sB < sA ? { servicoMin: sB, servico: sB / 60, servicoNextMin: (bs.reduce((s, e) => s + nextMin(e, 'servico'), 0)) || undefined, servicoMaxMin: sA, servicoMaxReadings: true } : {};
    if (a.psv.over && (overB || restBadB)) return { ...a, ...range };
    if (!a.psv.over && !a.psv.uncertain && !overB && !uncB && restOkB) return { ...a, ...range };
    return { ...a, ...range, psv: { ...a.psv, over: false, excess: null, uncertain: true, unknowns: Array.from(new Set([...(a.psv.unknowns || []), 'breakOrRest'])) } };
  };
  const blockEntries = blocks.map(blockEntryBoth);
  readMax = blockEntries.reduce((s, e) => s + (e.servicoMaxReadings ? e.servicoMaxMin - entryMin(e, 'servico') : 0), 0);
  const nextSum = (key) => [...blockEntries, ...noRep.map((p) => p.entry)].reduce((s, e) => s + nextMin(e, key), 0);
  // Minutos inteiros (A-148): somam-se os blocos e os serviços sem report.
  const servicoMin = blockEntries.reduce((s, e) => s + entryMin(e, 'servico'), 0) + extraMin('servico');
  const vooMin = blockEntries.reduce((s, e) => s + entryMin(e, 'voo'), 0) + extraMin('voo');
  // PSV do dia = o PIOR bloco (legalidade sobre os FDP combinados): prioriza o que EXCEDE.
  const excMin = (p) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String((p && p.excess) || '')); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
  // Um bloco INCERTO vem antes de um que está dentro (revisão independente, noite 9): senão o dia ficava "dentro" com um PSV
  // incerto lá dentro.
  const rank = (e) => (e.psv.over ? 2 : e.psv.uncertain ? 1 : 0);
  const worst = blockEntries.reduce((a, b) => {
    if (rank(b) !== rank(a)) return rank(b) > rank(a) ? b : a;
    return excMin(b.psv) > excMin(a.psv) ? b : a;
  });
  const last = blockEntries[blockEntries.length - 1];
  // `parts` = PSV por SERVIÇO (para o registo 245, uma linha por serviço); a legalidade do dia
  // vem do FDP combinado (worst). São coisas diferentes de propósito num split-duty.
  return withB(withMax({
    src: 'duty', engineVer: ENGINE_VERSION, psv: worst.psv,
    servicoMin, servico: servicoMin / 60, vooMin, voo: vooMin / 60, servicoEst: noRep.length ? true : undefined,
    servicoNextMin: nextSum('servico') || undefined, vooNextMin: nextSum('voo') || undefined,
    rest: last.rest, parts: [...entries, ...noRep.map((p) => p.entry)].map((e) => e.psv), between, split, restShort, either: either || undefined,
  }), blocks.map((blk, i) => ({ psv: blockEntries[i].psv, members: blk.map((p) => p.duty) })));
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
  computeFdp, computeFdpByBand, computeRest, computeFlightTime, computeDutyTime, validateLimits, limitsAround, sumCalendarYearMin,
  validateDuty, validateRest, isNightDuty, overlapsWOCL,
  computeAcclimatisation, computeDiscretion,
  computeInflightRest, computeFlightCrewFdp, computeStandby, computeReducedRest, computeTimeZoneRest,
  computeDelayedReporting, computeExtensionUsage, classifyDisruptive, computeRestSequence, computeRecovery, localNightsIn, nthLocalNightEnd,
  computeFatigue,
  withinBand, fmtBandRange, bandRangeMins, splitCountedBreakMin, splitAccLevel, isFdpDuty,
  DUTY_WINDOWS, FLIGHT_WINDOWS, QUADRO1_DIFF, QUADRO1_ELAPSED, TZ_REST_DIFF, TZ_REST_ELAPSED,
};
export * from './utils/time';
