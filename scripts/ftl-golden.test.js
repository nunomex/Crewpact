/*
 * Testes "golden" do motor FTL — fixam tabelas e limiares regulamentares contra
 * os PDFs (Reg. (UE) 83/2014 · CS-FTL.1). Blindam contra regressões: se algum
 * valor de tabela ou limiar mudar, o teste falha.
 *
 * Não usa framework (o projeto não tem jest). Corre em Node, transpilando o
 * motor ESM→CJS com o @babel/core já instalado. Executar:  npm run test:ftl
 *
 * Fontes (página do PDF):
 *  - Quadro 2/3/4 (PSV base) ......... ORO.FTL.205(b), p.8–9
 *  - Tabela de extensão .............. CS FTL.1.205(b), p.5
 *  - Repouso a bordo (cabina) ........ CS FTL.1.205(c)(3), p.7
 *  - Repouso por fusos ............... CS FTL.1.235(b)(3)(i), p.10
 *  - Repouso reduzido ................ CS FTL.1.235(c), p.10–11
 *  - Standby ......................... CS FTL.1.225, p.8–9
 *  - Discrição ....................... ORO.FTL.205(f), p.10
 *  - Delayed reporting ............... CS FTL.1.205(d), p.7–8
 *  - Split duty ...................... CS FTL.1.220, p.8
 *  - Limites cumulativos ............. ORO.FTL.210, p.11
 *  - WOCL / serviço noturno .......... ORO.FTL.105(28)(9), p.6
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));

// ── Require-hook: transpila os ficheiros do projeto (ESM) para CJS on-the-fly ──
let cjsPlugin;
try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); }
catch { cjsPlugin = null; }
const transform = (src, filename) => babel.transformSync(src, {
  filename, babelrc: false, configFile: false,
  presets: cjsPlugin ? [] : [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]],
  plugins: cjsPlugin ? [cjsPlugin] : [],
}).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename);
};

// ── Motor (API pública) ──
const ftl = require(path.resolve('ftl/index.js'));
const {
  computeFdp, computeInflightRest, computeFlightCrewFdp, computeStandby, computeReducedRest,
  computeTimeZoneRest, computeDelayedReporting, computeDiscretion,
  computeDutyTime, computeFlightTime, overlapsWOCL, isNightDuty, isoDay,
  computeRest, classifyDisruptive, computeRestSequence, computeFatigue, fatigueFromDuty, computeDuty,
} = ftl;

// ── Harness mínimo ──
const M = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }; // "HH:MM" → min
let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (got === want) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${want}\n      obtido:   ${got}`); }
};
const fdpMax = (o) => computeFdp(o).maxFdpMin;

// ─────────────────────────────── FDP — Quadro 2 (aclimatado) ───────────────────────────────
eq('Q2 06:00 / 1–2 setores', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1 }), M('13:00'));
eq('Q2 06:00 / 10 setores',  fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 10 }), M('09:00'));
eq('Q2 13:30 / 1–2 setores', fdpMax({ state: 'acc', reportMin: M('13:30'), sectors: 1 }), M('12:45'));
eq('Q2 17:00 / 1–2 (noite)', fdpMax({ state: 'acc', reportMin: M('17:00'), sectors: 1 }), M('11:00'));
eq('Q2 00:30 / 1–2 (1700–0459)', fdpMax({ state: 'acc', reportMin: M('00:30'), sectors: 1 }), M('11:00'));
eq('Q2 05:00 / 1–2 setores', fdpMax({ state: 'acc', reportMin: M('05:00'), sectors: 1 }), M('12:00'));
eq('Q2 05:45 / 9 setores',   fdpMax({ state: 'acc', reportMin: M('05:45'), sectors: 9 }), M('09:15'));

// ─────────────────────────────── FDP — Quadro 3 (desconhecido) ─────────────────────────────
eq('Q3 1–2 setores', fdpMax({ state: 'unk', reportMin: M('10:00'), sectors: 1 }), M('11:00'));
eq('Q3 5 setores',   fdpMax({ state: 'unk', reportMin: M('10:00'), sectors: 5 }), M('09:30'));
eq('Q3 8 setores',   fdpMax({ state: 'unk', reportMin: M('10:00'), sectors: 8 }), M('09:00'));

// ─────────────────────────────── FDP — Quadro 4 (desconhecido + SGRF) ──────────────────────
eq('Q4 1–2 setores', fdpMax({ state: 'frm', reportMin: M('10:00'), sectors: 1 }), M('12:00'));
eq('Q4 4 setores',   fdpMax({ state: 'frm', reportMin: M('10:00'), sectors: 4 }), M('11:00'));
eq('Q4 7 setores',   fdpMax({ state: 'frm', reportMin: M('10:00'), sectors: 7 }), M('09:30'));

// ─────────────────────────────── Extensão (CS FTL.1.205(b)) ────────────────────────────────
eq('Ext 07:00 / 1–2', fdpMax({ state: 'acc', reportMin: M('07:00'), sectors: 1, extended: true }), M('14:00'));
eq('Ext 07:00 / 5',   fdpMax({ state: 'acc', reportMin: M('07:00'), sectors: 5, extended: true }), M('12:30'));
eq('Ext 06:15 / 4',   fdpMax({ state: 'acc', reportMin: M('06:15'), sectors: 4, extended: true }), M('12:15'));
eq('Ext 15:00 / 3',   fdpMax({ state: 'acc', reportMin: M('15:00'), sectors: 3, extended: true }), M('12:30'));
eq('Ext 18:30 / 1–2', fdpMax({ state: 'acc', reportMin: M('18:30'), sectors: 1, extended: true }), M('11:15'));
eq('Ext 06:00 não permitido', computeFdp({ state: 'acc', reportMin: M('06:00'), sectors: 1, extended: true }).notAllowed, true);
eq('Ext 19:30 não permitido', computeFdp({ state: 'acc', reportMin: M('19:30'), sectors: 1, extended: true }).notAllowed, true);
eq('Ext 1330 / 5 não permitido', computeFdp({ state: 'acc', reportMin: M('13:30'), sectors: 5, extended: true }).notAllowed, true);

// ─────────────────────────────── Repouso a bordo (cabina, CS FTL.1.205(c)(3)) ──────────────
eq('Inflight ≤14:30 c1', computeInflightRest({ maxFdpMin: M('14:30'), restClass: 'c1', sectors: 1 }).minRestMin, M('1:30'));
eq('Inflight 15:30 c3',  computeInflightRest({ maxFdpMin: M('15:30'), restClass: 'c3', sectors: 2 }).minRestMin, M('2:40'));
eq('Inflight 18:00 c1',  computeInflightRest({ maxFdpMin: M('18:00'), restClass: 'c1', sectors: 1 }).minRestMin, M('3:50'));
eq('Inflight 16:30 c3 proibido', computeInflightRest({ maxFdpMin: M('16:30'), restClass: 'c3', sectors: 1 }).allowed, false);
eq('Inflight 4 setores proibido', computeInflightRest({ maxFdpMin: M('14:30'), restClass: 'c1', sectors: 4 }).allowed, false);
eq('Inflight classe-max c1 = 18:00', computeInflightRest({ maxFdpMin: M('14:30'), restClass: 'c1', sectors: 1 }).classMaxMin, M('18:00'));

// ─────────────────────────────── Repouso a bordo (tripulação TÉCNICA, ORO.FTL.205(c)) ──────
// PSV máximo por classe × nº de pilotos EXTRA (1 → 3 no total; 2 → 4 no total).
eq('FC c1 +1 → 16:00', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 1 }).maxFdpMin, M('16:00'));
eq('FC c1 +2 → 17:00', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 2, sectors: 1 }).maxFdpMin, M('17:00'));
eq('FC c2 +1 → 15:00', computeFlightCrewFdp({ restClass: 'c2', additionalCrew: 1, sectors: 1 }).maxFdpMin, M('15:00'));
eq('FC c2 +2 → 16:00', computeFlightCrewFdp({ restClass: 'c2', additionalCrew: 2, sectors: 1 }).maxFdpMin, M('16:00'));
// CS FTL.1.205(c)(2)(i)(A) e (ii)(A), p.6: classe 3 → 14 h (+1 piloto) e 15 h (+2). Auditoria A-142: a app tinha 14:15/15:15.
eq('FC c3 +1 → 14:00', computeFlightCrewFdp({ restClass: 'c3', additionalCrew: 1, sectors: 1 }).maxFdpMin, M('14:00'));
eq('FC c3 +2 → 15:00', computeFlightCrewFdp({ restClass: 'c3', additionalCrew: 2, sectors: 1 }).maxFdpMin, M('15:00'));
// CS FTL.1.205(c)(4), p.7: +1 h com 1 setor de MAIS de 9 h de voo contínuo e no máximo 2 setores (A-149).
eq('FC (c)(4) c1 +1, setor 9:40 → 17:00', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 1, longestSectorMin: M('9:40') }).maxFdpMin, M('17:00'));
eq('FC (c)(4) c3 +2, 2 setores, um de 10:00 → 16:00', computeFlightCrewFdp({ restClass: 'c3', additionalCrew: 2, sectors: 2, longestSectorMin: M('10:00') }).maxFdpMin, M('16:00'));
eq('FC (c)(4) setor de 9:00 exatas não chega ("more than 9 hours")', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 1, longestSectorMin: M('9:00') }).maxFdpMin, M('16:00'));
eq('FC (c)(4) 3 setores → sem a hora a mais', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 3, longestSectorMin: M('9:40') }).maxFdpMin, M('16:00'));
eq('FC maxFdpStr c1 +2', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 2, sectors: 1 }).maxFdpStr, '17:00');
eq('FC 4 setores proibido', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 2, sectors: 4 }).allowed, false);
eq('FC ≤3 setores permitido', computeFlightCrewFdp({ restClass: 'c3', additionalCrew: 1, sectors: 3 }).allowed, true);
eq('FC additionalCrew satura em 2', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 5, sectors: 1 }).maxFdpStr, '17:00');
eq('FC repouso mín 90 min/tripulante', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 1 }).minRestMin, 90);
eq('FC piloto que aterra ≥ 2h', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 1 }).landingPilotMinRestMin, M('2:00'));
eq('FC repouso destino ≥ 14h', computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 1, sectors: 1 }).destRestFloorMin, M('14:00'));

// ─────────────────────────────── Repouso por fusos (CS FTL.1.235(b)(3)) ────────────────────
eq('TZ ≤6 / <48 → 2 noites',  computeTimeZoneRest({ diffH: 5, elapsedH: 30 }).nights, 2);
eq('TZ ≤9 / 72–96 → 3 noites', computeTimeZoneRest({ diffH: 8, elapsedH: 80 }).nights, 3);
eq('TZ ≤12 / ≥96 → 5 noites',  computeTimeZoneRest({ diffH: 12, elapsedH: 100 }).nights, 5);
eq('TZ <4h não aplicável', computeTimeZoneRest({ diffH: 3, elapsedH: 30 }).applicable, false);

// ─────────────────────────────── Repouso reduzido (CS FTL.1.235(c)) ────────────────────────
{
  const r = computeReducedRest({ inBase: true, reducedMin: M('11:00'), normalRestMin: M('13:00') });
  eq('Reduzido base piso 12h', r.floorMin, M('12:00'));
  eq('Reduzido 11h < piso', r.belowFloor, true);
  eq('Reduzido: repouso seguinte +diferença', r.nextRestExtMin, M('02:00'));
  eq('Reduzido: PSV seguinte −diferença', r.nextFdpReductionMin, M('02:00'));
  eq('Reduzido máx 2/ciclo', r.maxPerCycle, 2);
  const a = computeReducedRest({ inBase: false, reducedMin: M('10:00'), normalRestMin: M('10:00') });
  eq('Reduzido fora piso 10h', a.floorMin, M('10:00'));
  eq('Reduzido 10h fora não < piso', a.belowFloor, false);
}

// ─────────────────────────────── Standby (CS FTL.1.225) ────────────────────────────────────
{
  const ap = computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: M('13:00'), actualFdpMin: M('10:00') });
  eq('SB aeroporto: reduz >4h', ap.reductionMin, M('02:00'));
  eq('SB aeroporto: 100% serviço', ap.dutyCountMin, M('06:00'));
  eq('SB aeroporto: combinado 16h', ap.combinedMaxMin, M('16:00'));
  // CS FTL.1.225(a)(2): o máximo é o MENOR entre (i) o Quadro 2 menos o standby acima de 4 h e (ii) 16 h − standby.
  // 6 h de standby, 13:00 → min(11:00, 10:00) = 10:00 (auditoria A-143/A-164; a app dava 11:00).
  eq('SB aeroporto: PSV reduzido = min(13:00 − 2:00, 16:00 − 6:00) = 10:00', ap.reducedMaxFdpMin, M('10:00'));
  eq('SB aeroporto 4h: min(13:00, 12:00) = 12:00', computeStandby({ type: 'airport', standbyH: 4, maxFdpMin: M('13:00') }).reducedMaxFdpMin, M('12:00'));
  eq('SB aeroporto 2h: min(13:00, 14:00) = 13:00', computeStandby({ type: 'airport', standbyH: 2, maxFdpMin: M('13:00') }).reducedMaxFdpMin, M('13:00'));
  eq('SB aeroporto ≤4h sem redução', computeStandby({ type: 'airport', standbyH: 3, maxFdpMin: M('13:00') }).reductionMin, 0);

  const ot = computeStandby({ type: 'other', standbyH: 8, maxFdpMin: M('13:00') });
  eq('SB outro: reduz >6h', ot.reductionMin, M('02:00'));
  eq('SB outro: 25% serviço', ot.dutyCountMin, M('02:00'));
  eq('SB outro estendido: livre 8h', computeStandby({ type: 'other', standbyH: 8, extended: true, maxFdpMin: M('13:00') }).reductionMin, 0);
  eq('SB outro: máx 16h', computeStandby({ type: 'other', standbyH: 17, maxFdpMin: M('13:00') }).overMaxStandby, true);
  // (b)(9): standby iniciado entre 23:00–07:00 → a parte na janela não conta p/ a redução.
  eq('SB outro 23:30 (noturno) → janela não conta', computeStandby({ type: 'other', standbyH: 10, startMin: M('23:30'), maxFdpMin: M('13:00') }).reductionMin, 0);
  eq('SB outro 10:00 (fora da janela) → conta tudo', computeStandby({ type: 'other', standbyH: 10, startMin: M('10:00'), maxFdpMin: M('13:00') }).reductionMin, M('04:00'));
  // Combinado standby+PSV (aeroporto ≤16h) e "acordado" (outro >18h): com o PSV REAL do serviço (A-164/A-246).
  eq('SB aeroporto 6h + PSV real 11h = 17h > 16h → combinedOver', computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: M('13:00'), actualFdpMin: M('11:00') }).combinedOver, true);
  eq('SB aeroporto 6h + PSV real 8h = 14h → não (a app dizia "acima de 16 h")', computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: M('13:00'), actualFdpMin: M('8:00') }).combinedOver, false);
  eq('SB aeroporto 4h + PSV real 11h = 15h ≤ 16h → não', computeStandby({ type: 'airport', standbyH: 4, maxFdpMin: M('13:00'), actualFdpMin: M('11:00') }).combinedOver, false);
  eq('SB outro 8h + PSV real 13h = 21h > 18h → awakeOver', computeStandby({ type: 'other', standbyH: 8, maxFdpMin: M('13:00'), actualFdpMin: M('13:00') }).awakeOver, true);
  // A-246: 6 h de standby em casa + PSV de 4 h = 10 h → dentro (a app somava o PSV MÁXIMO: 6 + 13 = 19 h → "excede").
  eq('SB outro 6h + PSV real 4h = 10h → não', computeStandby({ type: 'other', standbyH: 6, maxFdpMin: M('13:00'), actualFdpMin: M('4:00') }).awakeOver, false);
  eq('SB outro 4h + PSV 10h = 14h ≤ 18h → não', computeStandby({ type: 'other', standbyH: 4, maxFdpMin: M('10:00') }).awakeOver, false);
}

// ─────────────────────────────── Discrição do comandante (ORO.FTL.205(f)) ──────────────────
{
  const d = computeDiscretion({ maxFdpMin: M('13:00'), actualFdpMin: M('14:30'), inFlightRest: false });
  eq('Discrição +2h', d.extMin, M('02:00'));
  eq('Discrição máx = +2h', d.maxMin, M('15:00'));
  eq('Discrição usada (cabe em +2h)', d.used, true);
  eq('Discrição piso repouso 10h', d.restFloorMin, M('10:00'));
  const i = computeDiscretion({ maxFdpMin: M('13:00'), actualFdpMin: M('16:40'), inFlightRest: true });
  eq('Discrição +3h c/ repouso a bordo', i.extMin, M('03:00'));
  eq('Discrição ilegal acima de +3h', i.over, true);
}

// ─────────────────────────────── Delayed reporting (CS FTL.1.205(d)) ───────────────────────
{
  const lt4 = computeDelayedReporting({ state: 'acc', origMin: M('06:00'), delayedMin: M('09:00'), sectors: 1 });
  eq('Delay <4h: PSV pela original', lt4.maxFdpMin, M('13:00'));
  eq('Delay <4h: base original', lt4.basis, 'original');
  const ge4 = computeDelayedReporting({ state: 'acc', origMin: M('06:00'), delayedMin: M('14:00'), sectors: 1 });
  eq('Delay ≥4h: PSV mais limitativo', ge4.maxFdpMin, M('12:30'));
  eq('Delay ≥4h: base adiada', ge4.basis, 'delayed');
  eq('Delay ≥10h conta como repouso', computeDelayedReporting({ state: 'acc', origMin: M('06:00'), delayedMin: M('17:00'), sectors: 1 }).asRest, true);
}

// ─────────────────────────────── Split duty (CS FTL.1.220) ─────────────────────────────────
// CS FTL.1.220(b): a pausa exclui 30 min (pré/pós-voo+deslocação) antes do +50%.
eq('Split 4h alojamento → líquida 3:30 → +1:45', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1, splitBreakH: 4, splitBreakStartMin: M('10:00'), accommodation: true }), M('14:45'));
eq('Split 3h → líquida 2:30 (<3h) → sem extensão', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1, splitBreakH: 3, splitBreakStartMin: M('10:00'), accommodation: true }), M('13:00'));
// CS FTL.1.220(e): com alojamento que não é "adequado", a parte acima de 6 h e a do WOCL não contam.
eq('Split com alojamento (não adequado): teto 6h domina', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1, splitBreakH: 8, splitBreakStartMin: M('10:00'), accommodation: 'basic' }), M('16:00'));
// CS FTL.1.220(e)(1) "accommodation is provided": SEM alojamento nenhum não há extensão (auditoria A-257/A-175 —
// a app estendia qualquer pausa de 3 h ou mais). É o lado seguro até o tripulante marcar o alojamento.
eq('Split SEM alojamento → sem extensão', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1, splitBreakH: 8, splitBreakStartMin: M('10:00'), accommodation: false }), M('13:00'));
eq('Split sem indicação → sem extensão', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1, splitBreakH: 4, splitBreakStartMin: M('10:00') }), M('13:00'));
// A-147/A-163: pausa que atravessa a meia-noite — a parte no WOCL (02:00–05:59) não conta.
// 23:00 → 04:30 (5:30 brutas, 5:00 líquidas): sai 02:00–04:00 → contam 3:00 → +1:30; 18:00, 2 setores → 11:00 + 1:30.
eq('A-147: pausa 23:00–04:30 → teto 12:30 (a app dava 13:30)', fdpMax({ state: 'acc', reportMin: M('18:00'), sectors: 2, splitBreakH: 5.5, splitBreakStartMin: M('23:00'), accommodation: 'basic' }), M('12:30'));
eq('A-163: splitCountedBreakMin(330, 23:00) = 180', ftl.splitCountedBreakMin(330, M('23:00'), 'basic'), 180);
eq('A-163: splitCountedBreakMin(360, 22:30) = 210', ftl.splitCountedBreakMin(360, M('22:30'), 'basic'), 210);
eq('Pausa à 01:00: 5:00 líquidas, 4:00 no WOCL → conta 1:00', ftl.splitCountedBreakMin(330, M('01:00'), 'basic'), 60);
// A-153: sem hora de início da pausa, com alojamento não adequado, só até 6 h.
eq('A-153: sem hora, 8 h de pausa → 6 h contam', ftl.splitCountedBreakMin(480, null, 'basic'), 360);
// Alojamento adequado (true ou 'suitable') → a pausa toda conta, também a do WOCL.
eq('Adequado: 23:00–04:30 conta tudo (5:00)', ftl.splitCountedBreakMin(330, M('23:00'), 'suitable'), 300);

// ─────────────────────────────── Limites cumulativos (ORO.FTL.210) ─────────────────────────
{
  const ref = new Date(2026, 5, 19, 12, 0, 0); // 2026-06-19
  const today = isoDay(ref);
  const duty = computeDutyTime({ [today]: { servico: 60 } }, ref);
  const d7 = duty.find((w) => w.id === '7d');
  eq('Serviço 7d limite 60h', d7.limit, 60);
  eq('Serviço 7d = 60h não excede', d7.over, false);
  const flight = computeFlightTime({ [today]: { voo: 100 } }, ref);
  const f28 = flight.find((w) => w.id === '28d');
  eq('Voo 28d limite 100h', f28.limit, 100);
  eq('Voo 900h/ano', flight.find((w) => w.id === 'year').limit, 900);
  eq('Voo 1000h/12m', flight.find((w) => w.id === '12m').limit, 1000);
}

// ─────────────────────────────── WOCL / serviço noturno (ORO.FTL.105) ──────────────────────
eq('WOCL 01:00–06:00 sobrepõe', overlapsWOCL(M('01:00'), M('06:00')), true);
eq('WOCL 07:00–15:00 não', overlapsWOCL(M('07:00'), M('15:00')), false);
eq('Noturno 01:00–03:00 (02–04:59)', isNightDuty(M('01:00'), M('03:00')), true);
eq('Noturno 07:00–09:00 não', isNightDuty(M('07:00'), M('09:00')), false);

// ─────────── Issue 1 — Repouso pelo PERÍODO DE SERVIÇO (PSV + pós-voo, ORO.FTL.235) ───────────
{
  const { computeDuty } = ftl;
  // PSV 12:00 (06:00→18:00), sem pós-voo: período = PSV; repouso = máx(720, piso 720).
  const d0 = computeDuty({ state: 'acc', report: '06:00', end: '18:00', sectors: 1 });
  eq('Duty PSV 12h', d0.fdp.actualFdpMin, M('12:00'));
  eq('Duty período = PSV (pós-voo 0)', d0.dutyPeriodMin, M('12:00'));
  eq('Duty repouso base = 12:00', d0.rest.restMin, M('12:00'));
  // Com 30 min de serviço pós-voo: período 12:30 → repouso 12:30.
  const d30 = computeDuty({ state: 'acc', report: '06:00', end: '18:00', sectors: 1, postFlightMin: 30 });
  eq('Duty período = PSV + pós-voo', d30.dutyPeriodMin, M('12:30'));
  eq('Duty repouso conta pós-voo', d30.rest.restMin, M('12:30'));
  // Fora da base (piso 10h): PSV 11h + 30 = 690.
  const da = computeDuty({ state: 'acc', report: '06:00', end: '17:00', sectors: 1, inBase: false, postFlightMin: 30 });
  eq('Duty fora da base inclui pós-voo', da.rest.restMin, M('11:30'));
  // PSV curto: o piso de 12h domina mesmo com pós-voo.
  const ds = computeDuty({ state: 'acc', report: '06:00', end: '09:00', sectors: 1, postFlightMin: 30 });
  eq('Duty piso 12h domina PSV curto', ds.rest.restMin, M('12:00'));
}

// ─────────── Hora-limite de calços = apresentação + PSV máximo (ORO.FTL.105(19) · 205) ───────────
// 2026-11-03 (análise da concorrência): o número que as calculadoras mostram primeiro ("latest on-blocks").
// Quadro 2, aclimatado, 1–2 setores: 06:00–13:29 → 13:00 · 17:00–04:59 → 11:00.
{
  const { computeDuty } = ftl;
  const a = computeDuty({ state: 'acc', report: '06:00', end: '18:00', sectors: 1 });
  eq('Calços até: 06:00 + 13:00 = 19:00', a.latestOnBlockStr, '19:00');
  eq('Calços até: 06:00 fica no mesmo dia', a.latestOnBlockNextDay, false);
  const b = computeDuty({ state: 'acc', report: '18:00', sectors: 2 });
  eq('Calços até: 18:00 + 11:00 = 05:00', b.latestOnBlockStr, '05:00');
  eq('Calços até: 18:00 passa para o dia seguinte', b.latestOnBlockNextDay, true);
  eq('Calços até: sem apresentação não há hora', computeDuty({ state: 'acc', report: null, sectors: 1 }).latestOnBlockStr, null);
}

// ─────────── Adapter duties → dayLog (dutyToFtlDay) ───────────
{
  const { dutyToFtlDay } = ftl;
  // Duty legal: 06:00→18:00 (PSV 12:00), 1 setor, 10h de voo.
  const e = dutyToFtlDay({ report_time: '06:00', block_on: '18:00', sectors: 1, flight_minutes: 600 });
  eq('Adapter src=duty', e.src, 'duty');
  eq('Adapter carimba engineVer (errata §E6)', e.engineVer, ftl.ENGINE_VERSION);
  eq('Adapter PSV result', e.psv.result, '12:00');
  eq('Adapter PSV max (acc 06:00 1set)', e.psv.max, '13:00');
  eq('Adapter dentro do limite', e.psv.over, false);
  eq('Adapter serviço (h)', e.servico, 12);
  eq('Adapter voo (h)', e.voo, 10);
  eq('Adapter repouso base (h)', e.rest.base, 12);
  // Duty ilegal: 06:00→20:00 (PSV 14:00 > máx 13:00).
  const il = dutyToFtlDay({ report_time: '06:00', block_on: '20:00', sectors: 1 });
  eq('Adapter PSV ilegal', il.psv.over, true);
  eq('Adapter excesso', il.psv.excess, '01:00');
  eq('Adapter serviço ilegal (h)', il.servico, 14);
  // Sem on-block → null (sem dados FTL).
  eq('Adapter sem block_on → null', dutyToFtlDay({ report_time: '06:00' }), null);
}

// ─────────── Proveniência das fontes FTL (Constituição §5) ───────────
{
  const { FTL_SOURCES } = require(path.resolve('ftl/sources.js'));
  eq('Fontes FTL: há registo (≥2)', FTL_SOURCES.length >= 2, true);
  eq('Fontes FTL: só domínios oficiais (EUR-Lex/EASA)', FTL_SOURCES.every((s) => /^https:\/\/(eur-lex\.europa\.eu|www\.easa\.europa\.eu)\//.test(s.url)), true);
  eq('Fontes FTL: cada uma tem lastVerified', FTL_SOURCES.every((s) => typeof s.lastVerified === 'string'), true);
  eq('Reg 83/2014 aplica desde 18-02-2016 (art. 2.º)', FTL_SOURCES.find((s) => s.id === 'reg-83-2014').effectiveFrom, '2016-02-18');
}

// ─────────── Standby de casa: 25% conta p/ cumulativos (CS FTL.1.225(b)(3) + GM1(c)) ───────────
{
  const { dutyToFtlDay } = ftl;
  // 08:00→20:00 = 12h. Standby de CASA (other standby) → 25% = 3.0h p/ os 60/110/190h (ORO.FTL.210).
  const home = dutyToFtlDay({ report_time: '08:00', block_on: '20:00', sectors: 0, kind: 'standby_home' });
  eq('SB casa: 25% no serviço (12h → 3.0h)', home.servico, 3);
  eq('SB casa: voo = 0', home.voo, 0);
  // Standby de AEROPORTO → 100% (ORO.FTL.225(c), sem margem do operador).
  const apt = dutyToFtlDay({ report_time: '08:00', block_on: '20:00', sectors: 0, kind: 'standby_airport' });
  eq('SB aeroporto: 100% no serviço (12h)', apt.servico, 12);
  // O REPOUSO (ORO.FTL.235) NÃO é reduzido pelos 25% — usa a duração TOTAL (GM1 CS FTL.1.225(c)).
  // Trava a distinção: serviço=25% (limites) mas rest.basePrev=100% (repouso).
  eq('SB casa: rest.basePrev = 12.0 (duração total, não 25%)', home.rest.basePrev, 12);
  eq('SB aeroporto: rest.basePrev = 12.0', apt.rest.basePrev, 12);
  // Voo / sem kind → 100% (regressão: o scaling é SÓ no standby de casa).
  eq('Sem kind (voo): 100% no serviço (12h)', dutyToFtlDay({ report_time: '08:00', block_on: '20:00', sectors: 1 }).servico, 12);
}

// ─────────── Débrief (postFlightMin) é PÓS-VOO (ORO.FTL.235(c)) — não-voo acaba no fim registado ───────────
{
  const { dutyToFtlDay, restBetweenDuties } = ftl;
  // VOO 08:00→16:00 com débrief 30′ → período de serviço 8h30 (PSV + pós-voo; 105(11)/210(c)).
  const fl = dutyToFtlDay({ report_time: '08:00', block_on: '16:00', sectors: 1 }, { postFlightMin: 30 });
  eq('Débrief: voo 8h + 30′ → serviço 8.5', fl.servico, 8.5);
  // ESCRITÓRIO 09:00→17:00 com o MESMO perfil → 8.0: o débrief é o serviço entre o último
  // on-block e o sign-off (235c) — sem voo não existe; o "Fim" registado É o fim do serviço.
  const ofc = dutyToFtlDay({ report_time: '09:00', block_on: '17:00', sectors: 0, kind: 'office' }, { postFlightMin: 30 });
  eq('Débrief: escritório 8h → serviço 8.0 (sem débrief)', ofc.servico, 8);
  const trn = dutyToFtlDay({ report_time: '09:00', block_on: '17:00', sectors: 0, kind: 'training' }, { postFlightMin: 30 });
  eq('Débrief: formação 8h → serviço 8.0 (sem débrief)', trn.servico, 8);
  // Repouso entre serviços (235): o fim do anterior NÃO-VOO = block_on (sem débrief) → gap maior.
  const gapOfc = restBetweenDuties({ report_time: '06:00', block_on: '10:00', kind: 'office' }, { report_time: '14:00' }, { postFlightMin: 30 });
  eq('235: gap após escritório 10:00→14:00 = 240 min (sem débrief)', gapOfc.gapMin, 240);
  const gapFl = restBetweenDuties({ report_time: '06:00', block_on: '10:00', sectors: 1 }, { report_time: '14:00' }, { postFlightMin: 30 });
  eq('235: gap após voo 10:30→14:00 = 210 min (com débrief)', gapFl.gapMin, 210);
}

// ─────────── Discrição do comandante DECLARADA (ORO.FTL.205(f)) ───────────
{
  const { dutyToFtlDay } = ftl;
  // Report 06:00, 2 setores → teto básico 13:00 (Quadro 2). PSV real 06:00→20:00 = 14:00 (+1:00).
  const base = { report_time: '06:00', block_on: '20:00', sectors: 2, flight_minutes: 600 };
  // SEM a marca: excede o teto → over (comportamento anterior).
  eq('205f não declarada: +1h acima do teto → over', dutyToFtlDay(base).psv.over, true);
  // COM a marca: +1h cabe na margem de +2h → LEGAL (reportável), não over.
  const disc = dutyToFtlDay({ ...base, special: { discretion: true } });
  eq('205f declarada: +1h dentro da margem → NÃO over', disc.psv.over, false);
  eq('205f declarada: marca used', disc.psv.disc205f.used, true);
  // ALÉM da margem (+2h): 06:00→21:30 = 15:30 > 15:00 → over MESMO com a discrição.
  const beyond = dutyToFtlDay({ report_time: '06:00', block_on: '21:30', sectors: 2, special: { discretion: true } });
  eq('205f declarada: +2h30 além da margem → over na mesma', beyond.psv.over, true);
  // Com repouso a bordo (205c) a margem é +3h: 15:30 real vs teto aumentado — classe 1,
  // 1 piloto extra → teto próprio do 205(c); aqui valida-se só que a margem usa +3h via augmented.
  eq('205f declarada: prolongamento 205(d) NÃO conta (não é planeado)', disc.psv.extended, false);
}

// ─────────── Standby de AEROPORTO × alojamento (ORO.FTL.225(c)(d)(e)) ───────────
{
  const { dutyToFtlDay } = ftl;
  const sb = { report_time: '08:00', block_on: '20:00', sectors: 0, kind: 'standby_airport' };
  // COM alojamento (225(e) cumprido): é STANDBY — conta 100% p/ 210/235 mas NÃO é PSV
  // (a tabela 205 não o julga: sem teto, nunca over).
  const acc = dutyToFtlDay({ ...sb, accommodation: true });
  eq('225: standby aeroporto c/ alojamento — serviço 100% (12h)', acc.servico, 12);
  eq('225: c/ alojamento não é PSV → sem teto', acc.psv.max, null);
  eq('225: c/ alojamento nunca over', acc.psv.over, false);
  eq('225: c/ alojamento marca standby', acc.psv.standby, true);
  eq('225: repouso usa a duração total (12h)', acc.rest.basePrev, 12);
  // SEM alojamento: "duty at the airport" (225(d)) — o PSV conta desde o report → a tabela aplica-se.
  const noAcc = dutyToFtlDay({ ...sb, block_on: '22:30' });   // 08:00→22:30 = 14:30 > teto (13:00 @08:00, 0-2 set)
  eq('225: SEM alojamento 14h30 → over (é PSV desde o report)', noAcc.psv.over, true);
  eq('225: SEM alojamento conta 100% na mesma (14.5h)', noAcc.servico, 14.5);
}

// ─────────── Auditoria 2026-11-06 · bloco 1 · STANDBY (S3 e alarmes falsos A-166/A-167/A-234/A-246/A-247) ───────────
{
  const { dutyToFtlDay, dayFtlFromDuties } = ftl;
  // S3 (A-143): standby de aeroporto de 6 h, apresentação às 12:00, 2 setores (Quadro 2: 13:00).
  // CS FTL.1.225(a)(2): máximo = min(13:00 − 2:00, 16:00 − 6:00) = 10:00 → calços até às 22:00 (a app dava 11:00 e 23:00).
  const s3 = computeDuty({ state: 'acc', report: '12:00', end: '22:30', sectors: 2, preStandby: { type: 'airport', standbyH: 6 } });
  eq('S3: máximo 10:00', s3.fdp.maxFdpStr, '10:00');
  eq('S3: calços até às 22:00', s3.latestOnBlockStr, '22:00');
  eq('S3: PSV real de 10:30 → excede 0:30', s3.fdp.excessStr, '00:30');
  // A-164: apresentação às 11:00 → calços até às 21:00.
  eq('A-164: calços até às 21:00', computeDuty({ state: 'acc', report: '11:00', end: '15:00', sectors: 2, preStandby: { type: 'airport', standbyH: 6 } }).latestOnBlockStr, '21:00');
  // Com 6 h de standby e PSV real de 8:00 (14 h no total, dentro) não há aviso "acima de 16 h".
  eq('A-164: 6 h + PSV 8:00 → sem aviso combinado', computeDuty({ state: 'acc', report: '12:00', end: '20:00', sectors: 2, preStandby: { type: 'airport', standbyH: 6 } }).fdp.stdbyOver, false);
  // A-246: 6 h em casa + PSV 11:00→15:00 (4 h) = 10 h acordado → sem aviso "18 h acordado".
  eq('A-246: 6 h casa + PSV 4 h → sem aviso', computeDuty({ state: 'acc', report: '11:00', end: '15:00', sectors: 2, preStandby: { type: 'other', standbyH: 6 } }).fdp.stdbyOver, false);

  // A-166/A-247: standby em casa, formação, escritório e posicionamento isolado NÃO são PSV (ORO.FTL.105(12):
  // o PSV "inclui um setor ou série de setores"). Contam para o 210 (casa a 25 %) e para o repouso; sem teto do Quadro 2.
  const hsby = dutyToFtlDay({ report_time: '06:00', block_on: '20:00', sectors: 0, kind: 'standby_home' });
  eq('Não-PSV: standby em casa 14 h → não excede', hsby.psv.over, false);
  eq('Não-PSV: standby em casa sem PSV máximo', hsby.psv.max, null);
  eq('Não-PSV: standby em casa sem "PSV realizado"', hsby.psv.result, null);
  eq('Não-PSV: standby em casa conta 25 % (3,5 h)', hsby.servico, 3.5);
  eq('Não-PSV: formação 14 h → não excede', dutyToFtlDay({ report_time: '07:00', block_on: '21:00', sectors: 0, kind: 'training' }).psv.over, false);
  eq('Não-PSV: escritório 13:30 → não excede', dutyToFtlDay({ report_time: '07:00', block_on: '20:30', sectors: 0, kind: 'office' }).psv.over, false);
  eq('Não-PSV: posicionamento isolado 13:30 → não excede', dutyToFtlDay({ report_time: '05:00', block_on: '18:30', sectors: 1, kind: 'positioning' }).psv.over, false);
  eq('Não-PSV: sem hora-limite de calços', dutyToFtlDay({ report_time: '07:00', block_on: '21:00', sectors: 0, kind: 'training' }).psv.latest, null);
  // CS FTL.1.225(b)(1): o standby fora do aeroporto tem no máximo 16 h.
  eq('Standby em casa de 17 h → acima das 16 h', dutyToFtlDay({ report_time: '06:00', block_on: '23:00', sectors: 0, kind: 'standby_home' }).psv.sbOver, true);
  eq('Standby em casa de 16 h → dentro', !!dutyToFtlDay({ report_time: '06:00', block_on: '22:00', sectors: 0, kind: 'standby_home' }).psv.sbOver, false);

  // A-234: standby em casa 05:00–11:00 e voo com apresentação às 11:00 até às 20:30. O standby acaba na apresentação
  // (CS FTL.1.225(b)(5)) e não entra no PSV: PSV 9:30 (desde as 11:00), não 15:30 desde as 05:00. A janela 05:00–07:00
  // não conta para a redução ((b)(9)): 4 h contam, abaixo das 6 h → máximo 13:00 (11:00, 2 setores) → dentro.
  // Serviço 210: 25 % × 6 h + 9:30 = 11:00 (a app dava 15:30, "ilegal").
  const sbFl = dayFtlFromDuties([
    { report_time: '05:00', block_on: '11:00', sectors: 0, kind: 'standby_home' },
    { report_time: '11:00', block_on: '20:30', sectors: 2, kind: 'flight', flight_minutes: 420 },
  ]);
  eq('A-234: PSV desde a apresentação do voo (9:30)', sbFl.psv.result, '09:30');
  eq('A-234: máximo 13:00 (sem redução)', sbFl.psv.max, '13:00');
  eq('A-234: dentro', sbFl.psv.over, false);
  eq('A-234: serviço 210 = 25 % do standby + voo = 11,0 h', sbFl.servico, 11);
  // A-167: standby em casa 05:00–13:00, apresentação às 13:30, calços às 20:00 (2 setores, Quadro 2 às 13:30 = 12:45).
  // Conta 07:00–13:30 = 6:30 ((b)(9)); a redução é o que passa das 6 h = 0:30 → máximo 12:15. PSV 6:30 → dentro.
  const sbFl2 = dayFtlFromDuties([
    { report_time: '05:00', block_on: '13:00', sectors: 0, kind: 'standby_home' },
    { report_time: '13:30', block_on: '20:00', sectors: 2, kind: 'flight' },
  ]);
  eq('A-167: PSV 6:30', sbFl2.psv.result, '06:30');
  eq('A-167: máximo 12:15', sbFl2.psv.max, '12:15');
  eq('A-167: dentro', sbFl2.psv.over, false);
  // Standby de aeroporto 06:00–10:00 e voo às 10:00: o standby conta 100 % e o teto combinado aplica-se.
  const apFl = dayFtlFromDuties([
    { report_time: '06:00', block_on: '10:00', sectors: 0, kind: 'standby_airport', accommodation: true },
    { report_time: '10:00', block_on: '19:00', sectors: 2, kind: 'flight' },
  ]);
  eq('Aeroporto→voo: PSV desde as 10:00 (9:00)', apFl.psv.result, '09:00');
  eq('Aeroporto→voo: máximo min(13:00, 16:00 − 4:00) = 12:00', apFl.psv.max, '12:00');
  eq('Aeroporto→voo: serviço 210 = 4 h + 9 h = 13 h', apFl.servico, 13);
}

// ─────────── 205(d)(1) — prolongamento inferido + frequência (máx 2/7d) ───────────
{
  const { dutyToFtlDay, computeExtensionUsage } = ftl;
  // 07:00 / 1 setor: PSV básico 13:00, estendido 14:00 (banda permite extensão).
  const extDuty = dutyToFtlDay({ report_time: '07:00', block_on: '20:30', sectors: 1, flight_minutes: 600 }); // 13:30
  eq('Ext-infer: 13:30 (>básico, ≤estendido) → extended', extDuty.psv.extended, true);
  eq('Ext-infer: 12:30 (cabe no básico) → não', dutyToFtlDay({ report_time: '07:00', block_on: '19:30', sectors: 1 }).psv.extended, false);
  eq('Ext-infer: 14:30 (>estendido) → não (ilegal/discrição)', dutyToFtlDay({ report_time: '07:00', block_on: '21:30', sectors: 1 }).psv.extended, false);
  eq('Ext-infer: banda 06:00 não permite extensão → não', dutyToFtlDay({ report_time: '06:00', block_on: '20:00', sectors: 1 }).psv.extended, false);
  // Frequência na janela de 7 dias que termina na referência.
  const noExt = dutyToFtlDay({ report_time: '07:00', block_on: '19:30', sectors: 1 });
  // O próprio dia não conta: o serviço novo (simulado) substitui-o.
  eq('Ext-freq: o próprio dia não conta', computeExtensionUsage({ '2026-06-05': extDuty }, '2026-06-05').count, 0);
  eq('Ext-freq: 2 prolongamentos antes → novo excederia', computeExtensionUsage({ '2026-06-01': extDuty, '2026-06-03': extDuty }, '2026-06-05').wouldExceed, true);
  eq('Ext-freq: 1 antes + o próprio dia → não excede', computeExtensionUsage({ '2026-06-03': extDuty, '2026-06-05': extDuty }, '2026-06-05').wouldExceed, false);
  eq('Ext-freq: 0 prolongamentos → não excede', computeExtensionUsage({ '2026-06-05': noExt }, '2026-06-05').wouldExceed, false);
  // ORO.FTL.205(d)(1) "em cada período de 7 dias consecutivos": também as janelas PARA A FRENTE (auditoria A-155).
  // Prolongamentos já escalados a 12 e 13 nov; um novo a 10 nov → a janela de 10 a 16 teria 3.
  const fwd = computeExtensionUsage({ '2026-11-12': extDuty, '2026-11-13': extDuty }, '2026-11-10');
  eq('Ext-freq: janela para a frente (10–16 nov) → excederia', fwd.wouldExceed, true);
  eq('Ext-freq: a pior janela tem 2', fwd.count, 2);
  eq('Ext-freq: 7 dias depois já não conta (17 nov)', computeExtensionUsage({ '2026-11-17': extDuty, '2026-11-18': extDuty }, '2026-11-10').wouldExceed, false);
}

// ─────────── Auditoria 2026-11-06 · bloco 1 · REPOUSO (S8, S10; A-145, A-150, A-157, A-169, A-289, A-290, A-292, A-293) ───────────
{
  const { dutyToFtlDay } = ftl;
  // ORO.FTL.235(b): fora da base, o serviço anterior OU 10 h, o maior (A-289: serviço de 13 h fora → 13:00, nunca "10 h").
  eq('235(b): fora da base, serviço de 13 h → 13:00', computeRest({ prevDutyMin: M('13:00'), inBase: false }).restMin, M('13:00'));
  // CS FTL.1.205(c)(6): depois de um PSV com repouso a bordo, no destino, o serviço anterior OU 14 h (A-290).
  eq('205(c)(6): repouso a bordo, serviço de 12:30 → 14:00', computeRest({ prevDutyMin: M('12:30'), inBase: false, inflightRest: true }).restMin, M('14:00'));
  eq('205(c)(6): repouso a bordo, serviço de 16:30 → 16:30', computeRest({ prevDutyMin: M('16:30'), inBase: false, inflightRest: true }).restMin, M('16:30'));
  const dAug = computeDuty({ state: 'acc', report: '10:00', end: '22:30', sectors: 1, inBase: false, augmented: { restClass: 'c1', additionalCrew: 1 }, isPilot: true });
  eq('205(c)(6): computeDuty com repouso a bordo → mínimo 14:00', dAug.rest.restStr, '14:00');
  // ORO.FTL.205(d)(1): com prolongamento, (i) +2 h ao repouso antes E depois, ou (ii) +4 h ao repouso depois (A-145).
  // 08:00 → 22:00 (2 setores, prolongado a 14:00) + 30 min de pós-voo = 14:30 de serviço, na base.
  const dExt = computeDuty({ state: 'acc', report: '08:00', end: '22:00', sectors: 2, extended: true, postFlightMin: 30 });
  eq('205(d)(1)(i): repouso depois = 14:30 + 2:00 = 16:30', dExt.rest.restStr, '16:30');
  eq('205(d)(1)(ii): só depois = 14:30 + 4:00 = 18:30', dExt.rest.restPostOnlyStr, '18:30');
  eq('Sem prolongamento: 14:30', computeDuty({ state: 'acc', report: '08:00', end: '22:00', sectors: 2, postFlightMin: 30 }).rest.restStr, '14:30');
  // A-293: 07:00 → 20:30 na base, prolongado → 13:30 + 2:00 = 15:30 (ou 17:30 só depois).
  const d293 = computeDuty({ state: 'acc', report: '07:00', end: '20:30', sectors: 2, extended: true });
  eq('A-293: 15:30', d293.rest.restStr, '15:30');
  eq('A-293: 17:30 (opção ii)', d293.rest.restPostOnlyStr, '17:30');
  // ORO.FTL.205(f)(1)(i): a discrição aplica-se ao máximo de (b), (e) ou 220 — SEM o prolongamento de (d) (A-157/A-292).
  // 07:00, 2 setores: Quadro 2 = 13:00; com prolongamento 14:00; discrição = 13:00 + 2:00 = 15:00 (a app dava 16:00).
  const dDisc = computeDuty({ state: 'acc', report: '07:00', end: '22:30', sectors: 2, extended: true, discretion: true });
  eq('205(f) por cima de 205(d): máximo com discrição = 15:00', dDisc.discretion.maxStr, '15:00');
  eq('205(f) por cima de 205(d): 15:30 excede', dDisc.discretion.over, true);
  // O prolongamento planeado tirado da escala (psv.extended) também sobe o repouso registado (+2 h).
  const eExt = dutyToFtlDay({ report_time: '07:00', block_on: '20:30', sectors: 1, flight_minutes: 600 });
  eq('Escala: PSV prolongado (13:30) → repouso registado 15,5 h', eExt.rest.base, 15.5);
  // CS FTL.1.235(b)(3)(ii): fora da base, PSV com diferença de fuso de 4 h ou mais → o serviço OU 14 h (A-150/A-169).
  // LIS → EWR em julho (UTC+1 → UTC−4: 5 h), 9:30 de serviço → 14:00 (a app dava 10:00).
  const ewr = dutyToFtlDay({ report_time: '09:00', block_on: '18:30', sectors: 1, flight_minutes: 510,
    legs: [{ dep: 'LIS', arr: 'EWR', off: '10:00', on: '18:30', offZ: '09:00', onZ: '17:30' }] }, { base: 'LIS', date: '2026-07-10' });
  eq('Fuso ≥ 4 h fora da base → repouso 14 h', ewr.rest.away, 14);
  const fnc = dutyToFtlDay({ report_time: '09:00', block_on: '18:30', sectors: 1, flight_minutes: 90,
    legs: [{ dep: 'LIS', arr: 'FNC', off: '10:00', on: '11:30' }] }, { base: 'LIS', date: '2026-07-10' });
  eq('Mesmo fuso (FNC) → 10 h ou o serviço (9:30) → 10 h', fnc.rest.away, 10);
}

// ─────────── 235(b)(3)(ii) — repouso fora-base com fuso ≥ 4 h (piso 14 h) ───────────
{
  eq('TZ-away: fuso 5h fora-base → piso 14h', computeRest({ prevDutyMin: M('11:00'), inBase: false, tzDiffH: 5 }).restMin, M('14:00'));
  eq('TZ-away: serviço anterior domina (15h)', computeRest({ prevDutyMin: M('15:00'), inBase: false, tzDiffH: 5 }).restMin, M('15:00'));
  eq('TZ-away: fuso 3h (<4h) → piso 10h', computeRest({ prevDutyMin: M('08:00'), inBase: false, tzDiffH: 3 }).restMin, M('10:00'));
  eq('TZ-away: na base ignora fuso → piso 12h', computeRest({ prevDutyMin: M('08:00'), inBase: true, tzDiffH: 5 }).restMin, M('12:00'));
  eq('TZ-away: flag awayTz', computeRest({ prevDutyMin: M('08:00'), inBase: false, tzDiffH: 5 }).awayTz, true);
}

// ─────────── 235(a) — classificação de serviços disruptivos ───────────
{
  eq('Disrupt: entrada matinal 05:30', classifyDisruptive({ reportMin: M('05:30'), endMin: M('14:00') }).earlyStart, true);
  eq('Disrupt: largada tardia 23:30', classifyDisruptive({ reportMin: M('06:00'), endMin: M('23:30') }).lateFinish, true);
  eq('Disrupt: largada tardia 00:30', classifyDisruptive({ reportMin: M('20:00'), endMin: M('00:30') }).lateFinish, true);
  eq('Disrupt: noturno 01:00→09:00', classifyDisruptive({ reportMin: M('01:00'), endMin: M('09:00') }).night, true);
  eq('Disrupt: diurno 08:00→16:00 não é disruptivo', classifyDisruptive({ reportMin: M('08:00'), endMin: M('16:00') }).disruptive, false);
  // Tipo TARDIO (late) por companhia — ARO.OPS.230. easyJet Europe = matinal (default acima).
  eq('Disrupt tardio: entrada 06:30 É matinal', classifyDisruptive({ reportMin: M('06:30'), endMin: M('14:00'), type: 'late' }).earlyStart, true);
  eq('Disrupt matinal: entrada 06:30 NÃO é matinal', classifyDisruptive({ reportMin: M('06:30'), endMin: M('14:00') }).earlyStart, false);
  eq('Disrupt tardio: largada 23:30 NÃO é tardia', classifyDisruptive({ reportMin: M('15:00'), endMin: M('23:30'), type: 'late' }).lateFinish, false);
  eq('Disrupt tardio: largada 00:30 É tardia', classifyDisruptive({ reportMin: M('15:00'), endMin: M('00:30'), type: 'late' }).lateFinish, true);
}

// ─────────── 235(a)(2)/(d) — sequência de escala (computeRestSequence) ───────────
{
  const nd = () => ({ report_time: '01:00', block_on: '09:00' }); // noturno 8h
  const dd = () => ({ report_time: '08:00', block_on: '16:00' }); // diurno 8h
  // A) 4 noturnos seguidos + recovery 40h (<60h) → aviso recovery60
  const a = computeRestSequence({
    '2026-06-01': nd(), '2026-06-02': nd(), '2026-06-03': nd(), '2026-06-04': nd(), '2026-06-06': nd(),
  });
  eq('Seq: 4 disruptivos → recovery 60h em falta', a.issues.some(i => i.type === 'recovery60'), true);
  // B) diurnos com recovery 40h → sem aviso recovery60
  const b = computeRestSequence({ '2026-06-01': dd(), '2026-06-02': dd(), '2026-06-04': dd() });
  eq('Seq: diurnos com recovery → sem recovery60', b.issues.some(i => i.type === 'recovery60'), false);
  // C) 8 dias seguidos sem gap ≥36h → bloco >168h → aviso recovery168
  const days = {}; for (let i = 1; i <= 8; i++) days[`2026-06-0${i}`] = dd();
  const c = computeRestSequence(days);
  eq('Seq: >168h sem recovery → aviso', c.issues.some(i => i.type === 'recovery168'), true);
}

// ─────────── Índice de risco de fadiga (consultivo) ───────────
// A — serviço diurno curto, dentro de tudo → 0.
{
  const f = computeFatigue({ reportMin: M('08:00'), endMin: M('16:00'), sectors: 2, maxFdpMin: M('14:00'), actualFdpMin: M('08:00'), restMin: M('13:00') });
  eq('Fadiga A: score 0', f.score, 0);
  eq('Fadiga A: banda low', f.band, 'low');
}
// B — noturno longo (WOCL cheio + PSV quase no máximo) → 35 + 27 = 62, elevado.
{
  const f = computeFatigue({ reportMin: M('22:00'), endMin: M('06:30'), sectors: 2, maxFdpMin: M('11:00'), actualFdpMin: M('10:30'), restMin: M('12:00') });
  eq('Fadiga B: WOCL cheio = 35', f.factors.wocl, 35);
  eq('Fadiga B: utilização PSV = 27', f.factors.fdpLoad, 27);
  eq('Fadiga B: score 62', f.score, 62);
  eq('Fadiga B: banda elevated', f.band, 'elevated');
}
// C — noturno + 5 setores + repouso reduzido (10h) + 4 disruptivos seguidos → 96, alto.
{
  const f = computeFatigue({ reportMin: M('22:00'), endMin: M('06:30'), sectors: 5, maxFdpMin: M('11:00'), actualFdpMin: M('11:00'), restMin: M('10:00'), consecutiveDisruptive: 4 });
  eq('Fadiga C: setores = 9', f.factors.sectors, 9);
  eq('Fadiga C: repouso curto = 10', f.factors.shortRest, 10);
  eq('Fadiga C: cadeia disruptiva = 12', f.factors.consecutive, 12);
  eq('Fadiga C: score 96', f.score, 96);
  eq('Fadiga C: banda high', f.band, 'high');
}
// D — entrada matinal (05:20), 4 setores, WOCL parcial → 6+1+6+8 = 21, low.
{
  const f = computeFatigue({ reportMin: M('05:20'), endMin: M('13:20'), sectors: 4, maxFdpMin: M('13:00'), actualFdpMin: M('08:00') });
  eq('Fadiga D: WOCL parcial = 6', f.factors.wocl, 6);
  eq('Fadiga D: disruptivo matinal = 8', f.factors.disruptive, 8);
  eq('Fadiga D: score 21', f.score, 21);
}
// Helper a partir de computeDuty: o fator WOCL não depende do PSV.
{
  const d = computeDuty({ state: 'acc', report: '22:00', end: '06:30', sectors: 2 });
  eq('fatigueFromDuty: WOCL = 35', fatigueFromDuty(d).factors.wocl, 35);
}

// ─────────── Estado de um candidato do import (à prova de falha) — 2026-11-03 ───────────
// Partilhado pela folha "Confirmar import" e pelo 7.º passo da configuração: um voo sem rota ou com
// um aeroporto desconhecido fica "a corrigir" (FORA do import até ser corrigido).
{
  const { candidateKind } = require(path.resolve('data/rosterImport.js'));
  eq('Candidato: voo com rota conhecida = pronto', candidateKind({ kind: 'flight', duty: { route: 'LIS-OPO-LIS' } }).kind, 'ready');
  eq('Candidato: voo sem rota = a corrigir', candidateKind({ kind: 'flight', duty: { route: null } }).kind, 'fix');
  eq('Candidato: aeroporto desconhecido = a corrigir', candidateKind({ kind: 'flight', duty: { route: 'LIS-ZZZ' } }).kind, 'fix');
  eq('Candidato: aeroporto desconhecido identificado', candidateKind({ kind: 'flight', duty: { route: 'LIS-ZZZ' } }).badAp, 'ZZZ');
  eq('Candidato: não-voo = informativo (entra, sem per-diem)', candidateKind({ kind: 'standby_airport', duty: {} }).kind, 'info');
  eq('Candidato: cancelado = removido', candidateKind({ action: 'delete', kind: 'flight', duty: { route: 'LIS-OPO' } }).kind, 'removed');
}

// ─────────── Importação de escala (rosterImport) ───────────
{
  const { dutyFromActivity, prospectiveDuty, isNightStop } = require(path.resolve('data/rosterImport.js'));
  const D = (h, m) => new Date(2026, 5, 1, h, m, 0);
  const act = {
    dateISO: '2026-06-01', sectors: 2,
    legs: [
      { report: '05:00', depTime: '06:00', arrTime: '08:00', startDate: D(6, 0), endDate: D(8, 0), depAirport: 'LIS', arrAirport: 'OPO' },  // 2h
      { report: '08:30', depTime: '09:00', arrTime: '12:00', startDate: D(9, 0), endDate: D(12, 0), depAirport: 'OPO', arrAirport: 'LIS' }, // 3h
    ],
  };
  const duty = dutyFromActivity(act);
  eq('Import: report = apresentação', duty.report_time, '05:00');
  eq('Import: rota da cadeia de aeroportos', duty.route, 'LIS-OPO-LIS');
  // Aeroporto em falta ('—') → rota null (não força per diem errado).
  eq('Import: rota incompleta → null', dutyFromActivity({ dateISO: '2026-06-02', sectors: 1, legs: [{ depTime: '06:00', arrTime: '08:00', depAirport: 'LIS', arrAirport: '—' }] }).route, null);
  eq('Import: block_off = 1.º dep', duty.block_off, '06:00');
  eq('Import: block_on = último arr', duty.block_on, '12:00');
  eq('Import: setores', duty.sectors, 2);
  eq('Import: flight_minutes (2h+3h)', duty.flight_minutes, 300);
  // Prospetivo: duty legal e isolada → ok.
  eq('Prospetivo: legal isolada → ok', prospectiveDuty(duty, {}).ok, true);
  // Prospetivo: 28d já a 188h de serviço → incluir a duty (7h) passa 190h → aviso.
  const p = prospectiveDuty(duty, { '2026-05-20': { servico: 188 } });
  eq('Prospetivo: excede 190h/28d', p.issues.some(i => i.type === 'duty28'), true);
  // Pernoita = NOITE FORA DA BASE (Art. 39/56), com base conhecida; sem base/rota → paridade.
  eq('NS: acaba fora (LIS-OPO, base LIS)', isNightStop('LIS-OPO', 'LIS', 1), true);
  eq('NS: volta à base (LIS-OPO-LIS, base LIS)', isNightStop('LIS-OPO-LIS', 'LIS', 2), false);
  eq('NS: regresso a casa (OPO-LIS, base LIS) — paridade erraria (true)', isNightStop('OPO-LIS', 'LIS', 1), false);
  eq('NS: par mas acaba fora (LIS-OPO-FAO, base LIS) — paridade erraria (false)', isNightStop('LIS-OPO-FAO', 'LIS', 2), true);
  eq('NS: sem base → paridade (ímpar→true)', isNightStop('OPO-LIS', null, 1), true);
  eq('NS: sem rota → paridade (par→false)', isNightStop(null, 'LIS', 2), false);
  eq('NS: base/rota case-insensitive', isNightStop('lis-opo', 'lis', 1), true);
  eq('Import: nightStop por base (LIS-OPO-LIS, base LIS) = false', dutyFromActivity(act, 'LIS').nightStop, false);
}

// ─────────── Registo ORO.FTL.245 (PDF) ───────────
{
  const { buildRecordModel, recordHtml, esc } = require(path.resolve('data/ftlRecord.js'));
  const duties = {
    '2026-06-01': { report_time: '06:00', block_off: '07:00', block_on: '11:00', sectors: 2, flight_minutes: 240 },
    '2026-06-03': { report_time: '08:00', block_off: '09:00', block_on: '13:00', sectors: 1, flight_minutes: 240, deleted: true }, // apagada → ignorada
    '2026-06-02': { report_time: '05:00', block_off: '06:00', block_on: '09:00', sectors: 1, flight_minutes: 180 },
  };
  const m = buildRecordModel({ duties, dayLog: {}, name: 'Ana <Cruz>', crewId: 'CC-1', operator: 'TAP', email: 'a@b.pt', generatedAt: '2026-06-19' });
  eq('Registo: linhas (apagada excluída)', m.rows.length, 2);
  eq('Registo: ordenado asc', m.rows[0].date, '2026-06-01');
  eq('Registo: voo total (240+180)', m.totals.flightMin, 420);
  eq('Registo: setores totais', m.totals.sectors, 3);
  eq('Registo: período início', m.header.periodStart, '2026-06-01');
  eq('Registo: período fim', m.header.periodEnd, '2026-06-02');
  eq('Registo: janelas serviço 210a', m.cumulative.duty.length, 3);
  // Escape de HTML — sem injeção.
  eq('Registo HTML: esc < e >', esc('a<b>&"\''), 'a&lt;b&gt;&amp;&quot;&#39;');
  const html = recordHtml(m, 'pt');
  eq('Registo HTML: nome escapado', html.includes('Ana &lt;Cruz&gt;'), true);
  eq('Registo HTML: sem tag crua', html.includes('<Cruz>'), false);
  eq('Registo HTML: declaração 245', html.includes('ORO.FTL.245'), true);
  eq('Registo HTML: voo total 07:00', html.includes('07:00'), true);
}

// ── reconcileDayLog (#1) — preenche dias FTL em falta a partir das duties (fill-only) ──
{
  const { reconcileDayLog } = ftl;
  const duties = {
    '2026-06-10': { report_time: '06:00', block_on: '12:00', sectors: 2, flight_minutes: 240, kind: 'flight' },
    '2026-06-11': { report_time: '08:00', block_on: '16:00', sectors: 2, flight_minutes: 300, kind: 'flight' },
    '2026-06-12': { deleted: true, report_time: '06:00', block_on: '10:00' },  // apagada → ignorada
    '2026-06-13': { kind: 'office' },                                           // sem report/block_on → não deriva
  };
  const r1 = reconcileDayLog(duties, {});
  eq('reconcile: 10 derivada (src duty)', (r1['2026-06-10'] || {}).src, 'duty');
  eq('reconcile: 11 derivada (src duty)', (r1['2026-06-11'] || {}).src, 'duty');
  eq('reconcile: voo 10 (240→4h)', r1['2026-06-10'].voo, 4);
  eq('reconcile: ignora apagada 12', r1['2026-06-12'], undefined);
  eq('reconcile: ignora sem horas 13', r1['2026-06-13'], undefined);
  // fill-only: não toca em registos existentes + devolve a MESMA ref quando nada falta
  const manual = { '2026-06-10': { src: 'manual', psv: { result: '10:00' } } };
  const oneDuty = { '2026-06-10': duties['2026-06-10'] };
  eq('reconcile: não clobbera manual', reconcileDayLog(oneDuty, manual)['2026-06-10'].src, 'manual');
  eq('reconcile: ref IGUAL quando nada falta', reconcileDayLog(oneDuty, manual) === manual, true);
  eq('reconcile: sem duties → ref igual', reconcileDayLog({}, manual) === manual, true);
  // BASE COM DATAS (linha do tempo, 2026-11-03): transferência LIS→OPO em março. Um serviço que acaba
  // no Porto em FEVEREIRO acaba FORA da base (10 h, ORO.FTL.235 b); em MARÇO acaba NA base (12 h, 235 a).
  const viaOpo = (date) => ({ duty_date: date, report_time: '06:00', block_on: '08:00', sectors: 1, flight_minutes: 60, kind: 'flight', route: 'LIS-OPO' });
  const tr = { '2026-02-10': viaOpo('2026-02-10'), '2026-03-10': viaOpo('2026-03-10') };
  const baseAt = (d) => (String(d).slice(0, 7) >= '2026-03' ? 'OPO' : 'LIS');
  const rb = reconcileDayLog(tr, {}, { baseAt });
  eq('base datada: fevereiro no Porto = fora da base', Object.keys(rb['2026-02-10'].rest).includes('away'), true);
  eq('base datada: março no Porto = na base', Object.keys(rb['2026-03-10'].rest).includes('base'), true);
  const rOld = reconcileDayLog(tr, {}, { base: 'OPO' });
  eq('sem datas (base de hoje = OPO): fevereiro dava "na base" (o erro)', Object.keys(rOld['2026-02-10'].rest).includes('base'), true);
}

// ─────────── Auditoria 2026-11-06 · bloco 1 · ACUMULADOS 210 em minutos (S5, S6; A-148, A-161, A-172, A-174) ───────────
{
  const { reconcileDayLog, dayFtlFromDuties } = ftl;
  const ref = new Date(2026, 10, 28, 12);   // 28 nov 2026
  const iso = (d) => `2026-11-${String(d).padStart(2, '0')}`;
  // A-148: 20 serviços de 9:32 (06:00 → sign-off 15:32) em 28 dias = 190:40 → EXCEDE as 190 h (a app somava 190,0 h).
  const d20 = {}; for (let i = 1; i <= 20; i++) d20[iso(i)] = { report_time: '06:00', block_on: '15:00', signOff: '15:32', sectors: 2, flight_minutes: 300 };
  const log20 = reconcileDayLog(d20, {});
  const w28 = computeDutyTime(log20, ref).find((w) => w.id === '28d');
  eq('A-148: 20 × 9:32 = 11 440 min', w28.doneMin, 11440);
  eq('A-148: 190:40 > 190 h → excede', w28.over, true);
  // A-172: 5 × 12:02 em 7 dias = 60:10 > 60 h → excede.
  const d5 = {}; for (let i = 22; i <= 26; i++) d5[iso(i)] = { report_time: '06:00', block_on: '18:02', sectors: 2 };
  const w7 = computeDutyTime(reconcileDayLog(d5, {}), ref).find((w) => w.id === '7d');
  eq('A-172: 5 × 12:02 = 60:10 → excede', w7.over, true);
  eq('A-172: margem nunca negativa nem arredondada para cima', w7.headroomMin, 0);
  // Com 59:30 feitos, a margem é 0:30 (a app dizia "faltam 1 h").
  const w7b = computeDutyTime({ [iso(28)]: { servicoMin: 3570, servico: 59.5 } }, ref).find((w) => w.id === '7d');
  eq('A-172: 59:30 → faltam 30 min', w7b.headroomMin, 30);
  // Entradas antigas (só horas) continuam a contar.
  eq('dayLog antigo (horas) ainda soma', computeDutyTime({ [iso(28)]: { servico: 10 } }, ref).find((w) => w.id === '7d').doneMin, 600);
  // A-161: um voo sem hora de report não desaparece dos 210. 20 × LIS-FNC-LIS de 5:30 sem "RP" = 110 h de voo > 100 h.
  const dNo = {}; for (let i = 1; i <= 20; i++) dNo[iso(i)] = { report_time: null, block_off: '07:00', block_on: '13:00', sectors: 2, flight_minutes: 330, kind: 'flight' };
  const logNo = reconcileDayLog(dNo, {});
  const f28 = computeFlightTime(logNo, ref).find((w) => w.id === '28d');
  eq('A-161: voo sem report conta o tempo de voo (110 h)', f28.doneMin, 6600);
  eq('A-161: 110 h > 100 h → excede', f28.over, true);
  eq('A-161: serviço estimado = calços a calços (6 h)', logNo[iso(1)].servicoMin, 360);
  eq('A-161: marcado como estimado', logNo[iso(1)].servicoEst, true);
  eq('A-161: sem PSV calculado', logNo[iso(1)].psv.result, null);
  // Num dia com um serviço com report e outro sem: o PSV vem do que tem report; os minutos somam.
  const mix = dayFtlFromDuties([
    { report_time: '06:00', block_on: '10:00', sectors: 2, flight_minutes: 180, kind: 'flight' },
    { report_time: null, block_off: '15:00', block_on: '17:00', sectors: 1, flight_minutes: 120, kind: 'flight' },
  ]);
  eq('Misto: PSV do serviço com report', mix.psv.result, '04:00');
  eq('Misto: voo soma os dois (5 h)', mix.vooMin, 300);
  // A-174: as entradas derivadas recalculam-se quando o motor, o pós-voo ou o serviço mudam; as manuais nunca.
  const dOne = { [iso(10)]: { report_time: '06:00', block_on: '14:00', sectors: 2, flight_minutes: 300 } };
  const stale = { [iso(10)]: { src: 'duty', engineVer: 1, servico: 7.9, voo: 5 } };
  const re = reconcileDayLog(dOne, stale, { postFlightMin: 30 });
  eq('A-174: entrada antiga recalculada (8:30 com o pós-voo)', re[iso(10)].servicoMin, 510);
  eq('A-174: idempotente (ref igual à 2.ª passagem)', reconcileDayLog(dOne, re, { postFlightMin: 30 }) === re, true);
  const re45 = reconcileDayLog(dOne, re, { postFlightMin: 45 });
  eq('A-174: muda o pós-voo (45 min) → recalcula', re45[iso(10)].servicoMin, 525);
  eq('A-174: manual nunca é tocada', reconcileDayLog(dOne, { [iso(10)]: { src: 'manual', servico: 3 } })[iso(10)].servico, 3);
}

// ─────────── Casos especiais → teto do PSV (computeDuty, Fase 1) ───────────
// O motor deve usar EXATAMENTE o valor do calculador golden (sem inventar) — cross-check.
// Cobre os DOIS tipos de tripulação: piloto (tabela por nº de pilotos) e cabine (por classe).
{
  // (1) Repouso a bordo / tripulação aumentada — PILOTO (205c). 06:00→20:00 = 14h estoura o
  //     básico; a tabela aumentada (golden) deve cobrir → over=false.
  const fcMax = computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 2, sectors: 2 }).maxFdpMin;
  const dP = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c1', additionalCrew: 2 }, isPilot: true });
  eq('Aumentado piloto: teto = calculador golden', dP.fdp.maxFdpMin, fcMax);
  eq('Aumentado piloto: modifier', dP.fdp.modifier, 'augmented');
  eq('Aumentado piloto: over derivado do teto golden', dP.fdp.over, fcMax != null && M('14:00') > fcMax);
  eq('Sem aumento: o mesmo serviço estoura o básico', computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2 }).fdp.over, true);

  // (2) Repouso a bordo — CABINE. O PSV só é prolongado pelo repouso a bordo dos PILOTOS (CS FTL.1.205(c)(2)
  //     "extended due to in-flight rest for flight crew"); a tabela (c)(3) dá o repouso a bordo MÍNIMO da cabine
  //     para esse PSV. Teto da cabine = o menor de: PSV da técnica (c)(2)+(c)(4) · a última linha permitida da
  //     classe da cabine · a linha que o repouso a bordo da cabine permite (auditoria A-146/A-176/A-214).
  //     Sem saber os pilotos nem o repouso → o mais restritivo: +1 piloto, classe 3 (14:00) e 1:30 (14:30).
  const dC = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c2' }, isPilot: false });
  eq('Aumentado cabine sem dados dos pilotos: 14:00 (o mais restritivo)', dC.fdp.maxFdpStr, '14:00');
  eq('Aumentado cabine: modifier', dC.fdp.modifier, 'augmented');
  // Exemplo A-146: cabine TAP num A330, 1 setor de 9:40, 3 pilotos em classe 2, cabine em beliche (c1) com 4:00 de
  // repouso → técnica 15:00 + 1:00 ((c)(4)) = 16:00; a classe 1 e as 4:00 chegariam a 18:00 → 16:00 (a app dava 18:00).
  const cabA330 = { restClass: 'c1', additionalCrew: 1, fcRestClass: 'c2', cabinRestMin: 240 };
  eq('Cabine A330: teto = PSV da técnica 16:00', computeDuty({ state: 'acc', report: '10:00', end: '02:00', sectors: 1, augmented: cabA330, longestSectorMin: M('9:40') }).fdp.maxFdpStr, '16:00');
  eq('Cabine A330: 16:00 de PSV real → dentro', computeDuty({ state: 'acc', report: '10:00', end: '02:00', sectors: 1, augmented: cabA330, longestSectorMin: M('9:40') }).fdp.over, false);
  eq('Cabine A330: 18:00 de PSV real → excede 2:00', computeDuty({ state: 'acc', report: '10:00', end: '04:00', sectors: 1, augmented: cabA330, longestSectorMin: M('9:40') }).fdp.excessStr, '02:00');
  // O repouso a bordo da cabine manda quando é curto: classe 2 com 2:00 → a tabela (c)(3) permite até 15:00.
  eq('Cabine c2 com 2:00 de repouso → 15:00', computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c2', additionalCrew: 2, fcRestClass: 'c1', cabinRestMin: 120 } }).fdp.maxFdpStr, '15:00');
  // A classe da cabine manda quando a técnica vai mais longe: técnica c1 +2 = 17:00, cabine em classe 3 (máx 16:00).
  eq('Cabine c3 com técnica a 17:00 → 16:00', computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c3', additionalCrew: 2, fcRestClass: 'c1', cabinRestMin: 180 } }).fdp.maxFdpStr, '16:00');
  // Repouso a bordo abaixo de 90 min consecutivos (CS FTL.1.205(c)(1)(ii)) → não permitido.
  eq('Cabine com 1:15 de repouso a bordo → não permitido', computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c1', additionalCrew: 2, fcRestClass: 'c1', cabinRestMin: 75 } }).fdp.notAllowed, true);
  // Piloto da auditoria A-142: 3 pilotos, classe 3, 10:00 → 00:10 = PSV 14:10 > 14:00 → excede 0:10, calços até às 00:00.
  const dP3 = computeDuty({ state: 'acc', report: '10:00', end: '00:10', sectors: 1, augmented: { restClass: 'c3', additionalCrew: 1 }, isPilot: true });
  eq('Piloto c3 +1: PSV 14:10 excede 0:10', dP3.fdp.excessStr, '00:10');
  eq('Piloto c3 +1: calços até às 00:00', dP3.latestOnBlockStr, '00:00');

  // (3) Acima do teto de setores (205c1: ≤3) → não permitido (ambos os tipos).
  eq('Aumentado >3 setores: não permitido', computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 4, augmented: { restClass: 'c1' } }).fdp.notAllowed, true);

  // (4) Delayed reporting (205g): teto pela hora mais limitativa (orig vs adiada) — universal.
  const drMax = computeDelayedReporting({ state: 'acc', origMin: M('06:00'), delayedMin: M('11:00'), sectors: 2 }).maxFdpMin;
  const dD = computeDuty({ state: 'acc', report: '11:00', end: '20:00', sectors: 2, delayedFrom: '06:00' });
  eq('Delayed: teto = calculador golden', dD.fdp.maxFdpMin, drMax);
  eq('Delayed: modifier', dD.fdp.modifier, 'delayed');

  // (5) Standby anterior (225): reduz o teto (>4h aeroporto) — universal.
  const sbBase = computeFdp({ state: 'acc', reportMin: M('06:00'), endMin: M('18:00'), sectors: 2 });
  const sb = computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: sbBase.maxFdpMin });
  const dS = computeDuty({ state: 'acc', report: '06:00', end: '18:00', sectors: 2, preStandby: { type: 'airport', standbyH: 6 } });
  eq('Standby: redução = calculador golden', dS.fdp.stdbyReductionMin, sb.reductionMin);
  eq('Standby: teto reduzido = golden', dS.fdp.maxFdpMin, sb.reducedMaxFdpMin);

  // (6) Sem modificadores → idêntico à base (regressão).
  const bn = computeFdp({ state: 'acc', reportMin: M('06:00'), endMin: M('18:00'), sectors: 2 });
  const dn = computeDuty({ state: 'acc', report: '06:00', end: '18:00', sectors: 2 });
  eq('Sem modificadores: teto == base', dn.fdp.maxFdpMin, bn.maxFdpMin);
  eq('Sem modificadores: modifier null', dn.fdp.modifier, null);
  eq('Sem modificadores: redução standby 0', dn.fdp.stdbyReductionMin, 0);

  // (7) Adapter dutyToFtlDay aplica o `special` ao serviço GRAVADO — PILOTO aumentado.
  //     06:00→20:00 (14h) seria ilegal; com tripulação aumentada fica legal (teto golden).
  const eP = ftl.dutyToFtlDay({ report_time: '06:00', block_on: '20:00', sectors: 2, flight_minutes: 720, special: { augmented: { restClass: 'c1', additionalCrew: 2 } } }, { isPilot: true });
  eq('Adapter aumentado piloto: max = golden', eP.psv.max, computeFlightCrewFdp({ restClass: 'c1', additionalCrew: 2, sectors: 2 }).maxFdpStr);
  eq('Adapter aumentado piloto: legal (over derivado)', eP.psv.over, fcMax != null && M('14:00') > fcMax);
  eq('Adapter SEM special: o mesmo serviço é ilegal', ftl.dutyToFtlDay({ report_time: '06:00', block_on: '20:00', sectors: 2 }).psv.over, true);

  // (8) Adapter — CABINE aumentada: o setor longo (CS FTL.1.205(c)(4)) sai do tempo de voo (1 setor) ou das legs.
  const eC = ftl.dutyToFtlDay({ report_time: '10:00', block_on: '22:00', sectors: 1, flight_minutes: 580, special: { augmented: { restClass: 'c1', additionalCrew: 1, fcRestClass: 'c2', cabinRestMin: 240 } } }, { isPilot: false });
  eq('Adapter aumentado cabine: max = técnica c2 +1 + setor longo = 16:00', eC.psv.max, '16:00');
  const eCl = ftl.dutyToFtlDay({ report_time: '10:00', block_on: '22:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'GRU', off: '11:00', on: '20:40', offZ: '11:00', onZ: '20:40' }], special: { augmented: { restClass: 'c1', additionalCrew: 1 } } }, { isPilot: true });
  eq('Adapter piloto c1 +1, setor de 9:40 nas legs → 17:00', eCl.psv.max, '17:00');

  // (9) Adapter — delayed reporting (205g) no serviço gravado.
  const eD = ftl.dutyToFtlDay({ report_time: '11:00', block_on: '20:00', sectors: 2, special: { delayedFrom: '06:00' } });
  eq('Adapter delayed: max = golden', eD.psv.max, computeDelayedReporting({ state: 'acc', origMin: M('06:00'), delayedMin: M('11:00'), sectors: 2 }).maxFdpStr);

  // (10) FASE 2 — standby ANTERIOR ao voo soma ao serviço dos 28 d (210). Delta = dutyCount golden.
  //      Voo 10:00→18:00 (8h). AEROPORTO 4h → 100% = 4h ao serviço (e 0 de redução do PSV).
  const eNoSb = ftl.dutyToFtlDay({ report_time: '10:00', block_on: '18:00', sectors: 2 });
  const eApt = ftl.dutyToFtlDay({ report_time: '10:00', block_on: '18:00', sectors: 2, special: { preStandby: { type: 'airport', standbyH: 4 } } });
  eq('Fase 2: standby aeroporto soma 100% ao serviço', +(eApt.servico - eNoSb.servico).toFixed(1), +(computeStandby({ type: 'airport', standbyH: 4 }).dutyCountMin / 60).toFixed(1));
  // CASA 8h → 25% = 2h ao serviço.
  const eHome = ftl.dutyToFtlDay({ report_time: '10:00', block_on: '18:00', sectors: 2, special: { preStandby: { type: 'other', standbyH: 8 } } });
  eq('Fase 2: standby casa soma 25% ao serviço', +(eHome.servico - eNoSb.servico).toFixed(1), +(computeStandby({ type: 'other', standbyH: 8 }).dutyCountMin / 60).toFixed(1));
  // Sem preStandby → serviço == só o voo (regressão).
  eq('Fase 2: sem standby anterior → serviço = voo', eNoSb.servico, 8);

  // (11) Limite COMBINADO do standby (CS FTL.1.225): standby + PSV > 16h (aeroporto) → stdbyOver.
  const baseC = computeFdp({ state: 'acc', reportMin: M('06:00'), endMin: M('18:00'), sectors: 1 });
  const sbC = computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: baseC.maxFdpMin, actualFdpMin: baseC.actualFdpMin });
  const dCombined = computeDuty({ state: 'acc', report: '06:00', end: '18:00', sectors: 1, preStandby: { type: 'airport', standbyH: 6 } });
  eq('Standby combinado: = calculador golden', dCombined.fdp.stdbyOver, sbC.combinedOver);
  eq('Standby combinado: aeroporto 6h + PSV > 16h → true', dCombined.fdp.stdbyOver, true);
  eq('Standby combinado: kind', dCombined.fdp.stdbyOverKind, 'combined');
  // Standby curto (2h) → dentro do combinado → sem flag.
  eq('Standby combinado: 2h dentro do limite → false', computeDuty({ state: 'acc', report: '06:00', end: '14:00', sectors: 1, preStandby: { type: 'airport', standbyH: 2 } }).fdp.stdbyOver, false);
}

// ─────────── Dia com N PERÍODOS DE SERVIÇO (ORO.FTL.210/245) — dayFtlFromDuties ───────────
{
  const { dayFtlFromDuties, dutyToFtlDay } = ftl;
  // Serviço 1: 06:00→10:00 (PSV 4h · 3h voo). Serviço 2: 22:00→01:00 (PSV 3h · 2h voo). Intervalo
  // 12h na base ≥ mínimo de repouso (235) → 2 FDP SEPARADOS a sério; somam nos acumulados (210).
  const d1 = { report_time: '06:00', block_on: '10:00', sectors: 1, flight_minutes: 180 };
  const d2 = { report_time: '22:00', block_on: '01:00', sectors: 1, flight_minutes: 120 };
  const e1 = dutyToFtlDay(d1), e2 = dutyToFtlDay(d2);
  const day = dayFtlFromDuties([d1, d2]);
  eq('Dia 2 serviços: SERVIÇO soma (210)', day.servico, +((e1.servico + e2.servico)).toFixed(1));
  eq('Dia 2 serviços: VOO soma (210)', day.voo, +((e1.voo + e2.voo)).toFixed(1));
  eq('Dia 2 serviços: VOO = 3+2 = 5h', day.voo, 5);
  eq('Dia 2 serviços: SERVIÇO = 4+3 = 7h', day.servico, 7);
  eq('Dia 2 serviços: parts = PSV por serviço', day.parts.length, 2);
  eq('Dia 2 serviços: nenhum excede → legal', day.psv.over, false);
  // 1 serviço → IDÊNTICO ao dutyToFtlDay (o caso normal não muda).
  const solo = dayFtlFromDuties([d1]);
  eq('Dia 1 serviço: servico igual', solo.servico, e1.servico);
  eq('Dia 1 serviço: voo igual', solo.voo, e1.voo);
  // Um serviço ILEGAL no dia → o DIA fica ilegal (pior PSV manda).
  const ilegal = { report_time: '06:00', block_on: '20:00', sectors: 1 }; // PSV 14h > máx 13h
  const dayBad = dayFtlFromDuties([d1, ilegal]);
  eq('Dia: 1 serviço ilegal → dia ilegal', dayBad.psv.over, true);
  eq('Dia: PSV do dia = o que excede (+01:00)', dayBad.psv.excess, '01:00');
}

// ─────────── Repouso ENTRE serviços do dia (ORO.FTL.235 + CS FTL.1.220) — restBetweenDuties ───────────
{
  const { restBetweenDuties, dayFtlFromDuties } = ftl;
  const A = { report_time: '06:00', block_on: '08:00' };           // serviço de 2h
  // 14h de intervalo na base ≥ 12h → 2 FDP separados (repouso a sério).
  eq('Repouso entre: 14h base → rest', restBetweenDuties(A, { report_time: '22:00' }).kind, 'rest');
  // 4h de intervalo → split duty (≥3h mas < mínimo) = 1 FDP (CS FTL.1.220).
  const B = { report_time: '06:00', block_on: '10:00' };
  eq('Repouso entre: 4h → split duty', restBetweenDuties(B, { report_time: '14:00' }).kind, 'split');
  // 2h de intervalo (< 3h) → demasiado perto: não são 2 serviços.
  eq('Repouso entre: 2h → continuous', restBetweenDuties(B, { report_time: '12:00' }).kind, 'continuous');
  // 11h: na base é split (< 12h), FORA da base é rest (≥ 10h).
  eq('Repouso entre: 11h base → split', restBetweenDuties(B, { report_time: '21:00' }, { inBase: true }).kind, 'split');
  eq('Repouso entre: 11h fora → rest', restBetweenDuties(B, { report_time: '21:00' }, { inBase: false }).kind, 'rest');
  // Mínimo nunca < serviço anterior (235): serviço de 13h → exige 13h, 12h45 de intervalo não chega.
  const long = { report_time: '06:00', block_on: '19:00' };        // serviço de 13h
  eq('Repouso entre: mín = serviço anterior (13h) → 12h45 não chega', restBetweenDuties(long, { report_time: '07:40' }).kind, 'split');
  // Fim DEPOIS da meia-noite (sign-off 01:15): o intervalo calcula-se com volta à meia-noite.
  const nite = { report_time: '22:30', block_on: '00:45', signOff: '01:15' };
  eq('Repouso entre: fim 01:15 → next 14:00 = 12h45 base → rest', restBetweenDuties(nite, { report_time: '14:00' }).kind, 'rest');
  // dayFtlFromDuties EXPÕE o `between` e o flag split.
  const day2 = dayFtlFromDuties([{ report_time: '06:00', block_on: '10:00', flight_minutes: 180 }, { report_time: '20:00', block_on: '23:00', flight_minutes: 120 }]);
  eq('Dia 2 serviços: expõe between[1]', day2.between.length, 1);
  eq('Dia 2 serviços: 10h base entre eles → split', day2.split, true);
}

// ─────────── Split duty (CS FTL.1.220) — repouso insuficiente mas ≥3h = 1 FDP COMBINADO ───────────
{
  const { dayFtlFromDuties } = ftl;
  // 2 serviços na base, 10h de intervalo (< 12h mín 235, ≥ 3h) → SPLIT DUTY: NÃO são 2 FDP — é 1 FDP
  // 06:00→23:00 = 17h ("the break itself is fully considered as FDP", ORO.FTL.220). Máx = base(06:00·2
  // setores)=13:00 + extensão 50% (pausa 10h, alojamento não adequado → conta 6h → +3:00) = 16:00 → ILEGAL +01:00.
  // Sem alojamento marcado não há extensão (CS 220(e)(1), auditoria A-257) → máx 13:00 → excede 4:00.
  const splitPair = (acc) => [
    { report_time: '06:00', block_on: '10:00', sectors: 1, flight_minutes: 180, accommodation: acc },
    { report_time: '20:00', block_on: '23:00', sectors: 1, flight_minutes: 120 },
  ];
  const splitBad = dayFtlFromDuties(splitPair('basic'));
  eq('Split ilegal: 1 FDP combinado = 17:00', splitBad.psv.result, '17:00');
  eq('Split ilegal: máx 16:00 (base 13:00 + ext 3:00)', splitBad.psv.max, '16:00');
  eq('Split ilegal: excede → over', splitBad.psv.over, true);
  eq('Split ilegal: excesso +01:00', splitBad.psv.excess, '01:00');
  eq('Split ilegal: serviço (210) conta a pausa → 17h', splitBad.servico, 17);
  eq('Split sem alojamento: máx 13:00, excede 4:00', dayFtlFromDuties(splitPair(false)).psv.excess, '04:00');
  eq('Split ilegal: voo = 5h (a pausa não é voo)', splitBad.voo, 5);
  eq('Split ilegal: flag split exposto', splitBad.split, true);
  // Split que CABE: 2 serviços curtos com pausa de 3h30 → FDP combinado 09:00→14:30 = 5h30 << máx → legal.
  const splitOk = dayFtlFromDuties([
    { report_time: '09:00', block_on: '10:00', sectors: 1, flight_minutes: 60 },
    { report_time: '13:30', block_on: '14:30', sectors: 1, flight_minutes: 60 },
  ]);
  eq('Split legal: 1 FDP combinado = 05:30', splitOk.psv.result, '05:30');
  eq('Split legal: dentro do máx → não over', splitOk.psv.over, false);
  eq('Split legal: continua a ser split', splitOk.split, true);
  // UNIVERSAL: o split-duty (220) NÃO diverge por tripulação (a única divergência do FTL é o repouso
  // a bordo / 205c, testado à parte). Piloto e cabine → veredicto IDÊNTICO no mesmo dia split.
  const day = [{ report_time: '06:00', block_on: '10:00', sectors: 1, flight_minutes: 180 }, { report_time: '20:00', block_on: '23:00', sectors: 1, flight_minutes: 120 }];
  const asPilot = dayFtlFromDuties(day, { isPilot: true }), asCabin = dayFtlFromDuties(day, { isPilot: false });
  eq('Split universal: piloto = cabine (over)', asPilot.psv.over, asCabin.psv.over);
  eq('Split universal: piloto = cabine (máx)', asPilot.psv.max, asCabin.psv.max);
  eq('Split universal: piloto = cabine (excesso)', asPilot.psv.excess, asCabin.psv.excess);
}

// ─────────── Split DERIVADO das legs (atividade agrupada num só serviço, CS FTL.1.220) ───────────
{
  const { dayFtlFromDuties } = ftl;
  // 1 atividade = 1 duty com 2 setores e pausa em terra de 4h (on-block 08:00 → off-block 12:00). O
  // motor DERIVA o split das próprias legs (não precisa de campo persistido à parte). Span 06:00→20:00
  // = 14h; base(06:00·2)=13:00 + extensão (pausa 4h, com alojamento → líquida 3h30 → +1:45) = 14:45.
  // Sem alojamento marcado → sem extensão (A-175: o Início dizia "dentro" e o Detalhe "excede" no mesmo serviço).
  const legDuty = { report_time: '06:00', block_on: '20:00', sectors: 2, accommodation: 'basic', legs: [{ off: '06:00', on: '08:00' }, { off: '12:00', on: '20:00' }] };
  const legDay = dayFtlFromDuties([legDuty]);
  eq('Split das legs: máx estende para 14:45', legDay.psv.max, '14:45');
  eq('Split das legs: 14:00 ≤ 14:45 → LEGAL', legDay.psv.over, false);
  eq('Split das legs sem alojamento: 13:00 → excede', dayFtlFromDuties([{ ...legDuty, accommodation: false }]).psv.over, true);
  // A MESMA duty SEM legs (sem info da pausa) → falso-ilegal 14:00 > 13:00 → prova que a derivação é o que salva.
  eq('Sem legs → falso-ilegal (14:00 > 13:00)', dayFtlFromDuties([{ report_time: '06:00', block_on: '20:00', sectors: 2 }]).psv.over, true);
  // Turnaround CURTO (<3h): pausa 2h (08:00→10:00) → NÃO é split, sem extensão (máx = base).
  const shortTA = dayFtlFromDuties([{ report_time: '06:00', block_on: '12:00', sectors: 2, legs: [{ off: '06:00', on: '08:00' }, { off: '10:00', on: '12:00' }] }]);
  eq('Turnaround <3h: sem extensão (máx = base 13:00)', shortTA.psv.max, '13:00');
}

// ─────────── Base vs FORA (ORO.FTL.235) por localização real + Alojamento (CS FTL.1.220 d/e) ───────────
{
  const { dutyToFtlDay, dayFtlFromDuties } = ftl;
  // REPOUSO MÍNIMO pela LOCALIZAÇÃO real (último aeroporto das legs vs base). Fora = 10h, base = 12h.
  const away = dutyToFtlDay({ report_time: '06:00', block_on: '10:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'OPO' }] }, { base: 'LIS' });
  eq('Fora da base (acaba OPO): repouso mín 10h', away.rest.away, 10);
  const atBase = dutyToFtlDay({ report_time: '06:00', block_on: '10:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'OPO' }, { dep: 'OPO', arr: 'LIS' }] }, { base: 'LIS' });
  eq('Na base (acaba LIS): repouso mín 12h', atBase.rest.base, 12);
  eq('Local desconhecido → conservador 12h', dutyToFtlDay({ report_time: '06:00', block_on: '10:00', sectors: 1 }, {}).rest.base, 12);
  // FRONTEIRA rest/split usa o local: pausa 10h30 FORA da base ≥ 10h → REST (2 FDP), não split.
  const svc1 = { report_time: '06:00', block_on: '10:00', sectors: 1, flight_minutes: 180, legs: [{ dep: 'LIS', arr: 'OPO' }] };
  const svc2 = { report_time: '20:30', block_on: '23:00', sectors: 1, flight_minutes: 120, legs: [{ dep: 'OPO', arr: 'LIS' }] };
  eq('Fora: pausa 10h30 ≥ 10h → REST, não split', dayFtlFromDuties([svc1, svc2], { base: 'LIS' }).split, false);
  eq('Sem base: 10h30 < 12h → split (conservador)', dayFtlFromDuties([{ ...svc1, legs: null }, { ...svc2, legs: null }], {}).split, true);
  // ALOJAMENTO (opt-in): split de 8h. Com alojamento NÃO adequado a pausa contável limita-se a 6h; com alojamento
  // ADEQUADO conta toda (220 d/e). FDP combinado 06:00→22:30 = 16h30. Não adequado: máx 16:00 (over). Adequado: máx
  // 16:45 (legal). Sem alojamento nenhum: sem extensão (13:00).
  const mk = (acc) => [
    { report_time: '06:00', block_on: '08:00', sectors: 1, flight_minutes: 120, accommodation: acc },
    { report_time: '16:00', block_on: '22:30', sectors: 1, flight_minutes: 300 },
  ];
  eq('Split 8h alojamento não adequado: máx 16:00', dayFtlFromDuties(mk('basic'), {}).psv.max, '16:00');
  eq('Split 8h alojamento não adequado: 16:30 > 16:00 → over', dayFtlFromDuties(mk('basic'), {}).psv.over, true);
  eq('Split 8h SEM alojamento: sem extensão (13:00)', dayFtlFromDuties(mk(false), {}).psv.max, '13:00');
  eq('Split 8h COM alojamento: máx 16:45 (pausa toda conta)', dayFtlFromDuties(mk(true), {}).psv.max, '16:45');
  eq('Split 8h COM alojamento: 16:30 ≤ 16:45 → legal', dayFtlFromDuties(mk(true), {}).psv.over, false);
}

// ─────────── Voo ao vivo (#2): veredicto do PSV com o ATRASO REAL (ORO.FTL.105 / 205 b/f) ───────────
// A lei mede o PSV até ao ÚLTIMO on-block REAL (105) → o atraso à CHEGADA estica o PSV; o teto fica
// FIXO pela apresentação (205 b); acima do teto = discrição do comandante (205 f: +2h / +3h com
// repouso a bordo); acima da discrição = ilegal. O motor reusa o computeDiscretion golden.
{
  // Serviço PLANEADO fictício: PSV planeado 12:00 (720), teto 13:00 (780). Discrição normal +2h → 15:00 (900).
  const mk = (act, max, mod) => ({ fdp: { actualFdpMin: act, maxFdpMin: max, modifier: mod || null }, rest: { restMin: 720 } });
  eq('Live: atraso pequeno (30m) → legal', ftl.liveFdpVerdict(mk(720, 780), 30).verdict, 'legal');            // 750 ≤ 780
  eq('Live: no teto exato (60m) → legal', ftl.liveFdpVerdict(mk(720, 780), 60).verdict, 'legal');             // 780 = 780
  eq('Live: acima do teto (90m) → discrição 205f', ftl.liveFdpVerdict(mk(720, 780), 90).verdict, 'discretion'); // 810 ≤ 900
  eq('Live: limite da discrição (180m) → discrição', ftl.liveFdpVerdict(mk(720, 780), 180).verdict, 'discretion'); // 900 = 900
  eq('Live: além da discrição (200m) → ilegal', ftl.liveFdpVerdict(mk(720, 780), 200).verdict, 'over');       // 920 > 900
  eq('Live: PSV realizado (90m) = 13:30', ftl.liveFdpVerdict(mk(720, 780), 90).realStr, '13:30');
  eq('Live: excesso acima do teto (90m) = +00:30', ftl.liveFdpVerdict(mk(720, 780), 90).overMaxStr, '00:30');
  eq('Live: excesso além da discrição (200m) = +00:20', ftl.liveFdpVerdict(mk(720, 780), 200).overDiscStr, '00:20');
  // Repouso a bordo (205 f): discrição vai a +3h (teto disc = 780+180 = 960) → 920 ainda dentro.
  eq('Live: repouso a bordo → discrição +3h (200m dentro)', ftl.liveFdpVerdict(mk(720, 780, 'augmented'), 200).verdict, 'discretion');
  eq('Live: atraso 0 → legal (não estica)', ftl.liveFdpVerdict(mk(720, 780), 0).verdict, 'legal');
  eq('Live: atraso negativo tratado como 0', ftl.liveFdpVerdict(mk(720, 780), -50).realStr, '12:00');
  eq('Live: sem PSV → null (sem veredicto)', ftl.liveFdpVerdict(mk(null, 780), 30), null);
  eq('Live: sem teto → null (sem veredicto)', ftl.liveFdpVerdict(mk(720, null), 30), null);
  eq('Live: d nulo → null', ftl.liveFdpVerdict(null, 30), null);
  eq('Live: projected propaga', ftl.liveFdpVerdict(mk(720, 780), 30, { projected: true }).projected, true);

  // CREW-AWARE (o utilizador pediu explicitamente: piloto E cabine). O teto vem do computeDuty, que
  // distingue os dois no repouso a bordo (205 c): piloto por nº de tripulantes, cabine por classe de
  // instalação. MESMA classe de instalação (c1), MESMO serviço → tetos diferentes por tripulação:
  // piloto (c1, +1 tripulante) = 16:00 ; cabine (c1, sem saber os pilotos nem o repouso) = 14:00, o mais restritivo
  // (auditoria A-146). O veredicto ao vivo herda esse teto.
  const dP = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c1', additionalCrew: 1 }, isPilot: true });
  const dC = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c1' }, isPilot: false });
  eq('Live crew: veredicto usa o teto do PILOTO (16:00)', ftl.liveFdpVerdict(dP, 0).maxStr, dP.fdp.maxFdpStr);
  eq('Live crew: teto do piloto = 16:00', dP.fdp.maxFdpStr, '16:00');
  eq('Live crew: veredicto usa o teto da CABINE', ftl.liveFdpVerdict(dC, 0).maxStr, dC.fdp.maxFdpStr);
  eq('Live crew: teto da cabine sem dados = 14:00', dC.fdp.maxFdpStr, '14:00');
  eq('Live crew: mesma classe c1, teto piloto ≠ cabine (205 c distingue)', dP.fdp.maxFdpStr !== dC.fdp.maxFdpStr, true);
}

// ── Resumo ──
console.log(`\nFTL golden — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Todas as tabelas e limiares batem com os PDFs (Reg. 83/2014 · CS-FTL.1).');
