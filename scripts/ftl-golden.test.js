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
var eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));   // comparação por JSON (blocos sem o seu eqj)
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
  // (b)(9): a noite só não conta "until the crew member is contacted" — a app não sabe a hora do contacto (revisão do 8b, E4):
  // garantido = contacto logo às 05:00 (conta 05:00–13:30 = 8:30, reduz 2:30 → 10:15); possível = contacto na apresentação
  // (conta 07:00–13:30 = 6:30, reduz 0:30 → 12:15). PSV 6:30 → dentro nos dois.
  const sbFl2 = dayFtlFromDuties([
    { report_time: '05:00', block_on: '13:00', sectors: 0, kind: 'standby_home' },
    { report_time: '13:30', block_on: '20:00', sectors: 2, kind: 'flight' },
  ]);
  eq('A-167: PSV 6:30', sbFl2.psv.result, '06:30');
  // (2026-11-12.) A apresentação é 30 min DEPOIS do fim da assistência: a escala não diz se o voo foi atribuído durante ela →
  // o possível passa a ser o máximo inteiro do Quadro 2 (12:45, sem chamada); antes 12:15 (chamada, contacto na apresentação).
  eqj('A-167: máximo 10:15 a 12:45 (falta a hora do contacto e se foi chamada)', [sbFl2.psv.max, sbFl2.psv.maxHi, sbFl2.psv.unknowns], ['10:15', '12:45', ['standbyContact', 'standbyCall']]);
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
  // Bloco 4 (A-220/A-237): o serviço tem as horas de que a lei precisa — um voo sem as horas das pernas, ou um não-voo sem
  // início ou fim, também fica a corrigir (antes entrava "pronto" e saía dos 210).
  const T = { report_time: '06:00', block_off: '07:00', block_on: '10:00' };
  eq('Candidato: voo com rota conhecida = pronto', candidateKind({ kind: 'flight', duty: { ...T, route: 'LIS-OPO-LIS' } }).kind, 'ready');
  eq('Candidato: voo sem rota = a corrigir', candidateKind({ kind: 'flight', duty: { ...T, route: null } }).kind, 'fix');
  eq('Candidato: aeroporto desconhecido = a corrigir', candidateKind({ kind: 'flight', duty: { ...T, route: 'LIS-ZZZ' } }).kind, 'fix');
  eq('Candidato: aeroporto desconhecido identificado', candidateKind({ kind: 'flight', duty: { ...T, route: 'LIS-ZZZ' } }).badAp, 'ZZZ');
  eq('Candidato: voo sem as horas das pernas = a corrigir', candidateKind({ kind: 'flight', duty: { report_time: '06:00', block_on: null, route: 'LIS-OPO-LIS' } }).reason, 'times');
  eq('Candidato: não-voo = informativo (entra, sem per-diem)', candidateKind({ kind: 'standby_airport', duty: { report_time: '06:00', block_on: '10:00' } }).kind, 'info');
  eq('Candidato: não-voo sem fim = a corrigir', candidateKind({ kind: 'standby_airport', duty: { report_time: '06:00', block_on: null } }).reason, 'end');
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
  eq('Prospetivo: excede 190h/28d', p.issues.some(i => i.type === 'limit' && i.key === 'servico' && i.id === '28d'), true);
  // Auditoria A-165: TODOS os períodos que contêm o dia — também os de 7 dias que acabam DEPOIS dele (ORO.FTL.210(a)(1)).
  const fwd7 = {}; for (let k = 2; k <= 6; k++) fwd7[`2026-06-0${k}`] = { servicoMin: 11 * 60 };   // 55:00 nos 5 dias seguintes
  const p7 = prospectiveDuty(duty, fwd7);   // + o serviço de 1 de junho (05:00–12:00 = 7:00) → 1 a 7 de junho = 62:00
  eq('Prospetivo: 60 h em 7 dias para a frente', p7.issues.some(i => i.type === 'limit' && i.key === 'servico' && i.id === '7d'), true);
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
  // Bloco 8b (A-173): o serviço que passa a meia-noite reparte-se pelos dias locais (ORO.FTL.105(15) "dia local" começa às
  // 00h00) — as horas depois da meia-noite são do dia seguinte. A app somava tudo no dia do report e o período de 7 dias que
  // começa no dia seguinte perdia-as. Serviço 22:00 de 01/11 → 08:00 de 02/11 (10 h: 2 h + 8 h) + 52 h de 02 a 08/11.
  const dNt = { [iso(1)]: { report_time: '22:00', block_on: '08:00', sectors: 1, flight_minutes: 540, legs: [{ off: '22:30', on: '07:30' }] } };
  for (let i = 2; i <= 5; i++) dNt[iso(i)] = { report_time: '10:00', block_on: '20:00', sectors: 2 };   // 4 × 10 h
  dNt[iso(8)] = { report_time: '06:00', block_on: '18:00', sectors: 2 };                               // 12 h
  const logNt = reconcileDayLog(dNt, {});
  eq('A-173: a entrada guarda as 8 h depois da meia-noite', logNt[iso(1)].servicoNextMin, 480);
  eq('A-173: e as 7:30 de voo depois da meia-noite (pelas pernas)', logNt[iso(1)].vooNextMin, 450);
  const w7nt = computeDutyTime(logNt, new Date(2026, 10, 8, 12)).find((w) => w.id === '7d');
  eq('A-173: 7 dias de 02 a 08/11 = 52 h + 8 h = 60:00', w7nt.doneMin, 3600);
  const a7 = ftl.limitsAround(logNt, iso(8)).find((w) => w.id === '7d');
  eq('A-173: limitsAround vê o mesmo período (60:00)', a7.doneMin, 3600);
  // Com mais 1 h no dia 8 (13 h) o período passa: 61 h → excede (a app dava 53 h "dentro").
  const logNt2 = reconcileDayLog({ ...dNt, [iso(8)]: { report_time: '06:00', block_on: '19:00', sectors: 2 } }, {});
  eq('A-173: 61 h → excede', computeDutyTime(logNt2, new Date(2026, 10, 8, 12)).find((w) => w.id === '7d').over, true);
  // O total não muda: o período de 01 a 07/11 tem as 2 h do dia 1 + 8 h + 40 h = 50 h, e o de 28 dias soma tudo uma vez.
  eq('A-173: 01 a 07/11 = 50:00', computeDutyTime(logNt, new Date(2026, 10, 7, 12)).find((w) => w.id === '7d').doneMin, 3000);
  eq('A-173: 28 dias contam o serviço inteiro uma vez (62 h)', computeDutyTime(logNt, new Date(2026, 10, 28, 12)).find((w) => w.id === '28d').doneMin, 3720);
  eq('A-173: voo de 28 dias também uma vez (9 h)', computeFlightTime(logNt, new Date(2026, 10, 28, 12)).find((w) => w.id === '28d').doneMin, 540);
  // Revisão do 8b, E1: o Início olha para o período que acaba HOJE; a parte de amanhã do serviço de hoje está no que acaba
  // amanhã → o pior dos dois. 05–09/11: 5 × 10:30; 10/11: 20:00 → 04:30 (4:00 + 4:30). Às 18:00 de 10/11: 61:00 → excede.
  const dE1 = {}; for (let i = 5; i <= 9; i++) dE1[iso(i)] = { report_time: '06:00', block_on: '16:30', sectors: 2 };
  dE1[iso(10)] = { report_time: '20:00', block_on: '04:30', sectors: 1 };
  const wE1 = computeDutyTime(reconcileDayLog(dE1, {}), new Date(2026, 10, 10, 18)).find((w) => w.id === '7d');
  eqj('E1: o Início vê 61:00 e excede (dizia 56:30 "dentro")', [wE1.doneMin, wE1.over], [3660, true]);
  // Revisão do 8b, E2: a Simulação/importação do serviço noturno vê o período que começa no dia seguinte. 10/11: 22:00 → 06:00;
  // 11–15/11: 5 × 9 h; 17/11: 10 h → 11 a 17/11 = 6 + 45 + 10 = 61:00.
  const dE2 = { [iso(10)]: { report_time: '22:00', block_on: '06:00', sectors: 1 } };
  for (let i = 11; i <= 15; i++) dE2[iso(i)] = { report_time: '08:00', block_on: '17:00', sectors: 2 };
  dE2[iso(17)] = { report_time: '08:00', block_on: '18:00', sectors: 2 };
  const aE2 = ftl.limitsAround(reconcileDayLog(dE2, {}), iso(10)).find((w) => w.id === '7d');
  eqj('E2: limitsAround do dia 10 vê 11 a 17/11 = 61:00', [aE2.doneMin, aE2.over, aE2.from, aE2.to], [3660, true, iso(11), iso(17)]);
  // Revisão do 8b, reparo 1: com a 2.ª notificação o PSV começa antes da apresentação (CS 205(d)(1)(ii)) → a parte depois da
  // meia-noite conta desde aí. Apresentação 23:00, PSV desde as 22:00, calços 05:30 → 5:30 depois da meia-noite (não 6:30).
  const dR1 = ftl.dutyToFtlDay({ report_time: '23:00', block_on: '05:30', sectors: 1, special: { delayedFrom: '20:00', delayed1: '22:00', notice2: '21:00' } });
  eqj('Reparo 1: serviço 7:30 desde as 22:00 → 5:30 no dia seguinte', [dR1.servicoMin, dR1.servicoNextMin], [450, 330]);
  // Revisão do 8b, E5 (hora de verão): na noite de 24 para 25/10/2026 os relógios de Lisboa recuam 1 h às 02:00. Serviço das
  // 22:00 às 04:00 → 7 h reais (ORO.FTL.105(12)); a chegada depois da meia-noite convertia-se com o fuso do dia 24 → 6 h.
  const dDst = ftl.ftlForDuty({ report_time: '22:00', block_on: '04:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'OPO', off: '22:45', on: '04:00' }] }, { date: '2026-10-24', base: 'LIS' });
  eq('E5: PSV na noite da hora de inverno = 7:00 reais', dDst.fdp.actualFdpStr, '07:00');
  // E em março (29/03/2026, adianta 1 h às 01:00): 22:00 → 04:00 são 5 h reais.
  const dDst2 = ftl.ftlForDuty({ report_time: '22:00', block_on: '04:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'OPO', off: '22:45', on: '04:00' }] }, { date: '2026-03-28', base: 'LIS' });
  eq('E5: PSV na noite da hora de verão = 5:00 reais', dDst2.fdp.actualFdpStr, '05:00');
  // E nas VÉSPERAS (23/10 e 27/03) nada muda: 6:00. A 2.ª revisão apanhou a chegada passada para o dia seguinte DUAS vezes
  // (o fuso de D+2) — nos dias 24/10 e 28/03 dava certo por acaso.
  const psvOn = (date) => ftl.ftlForDuty({ report_time: '22:00', block_on: '04:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'OPO', off: '22:45', on: '04:00' }] }, { date, base: 'LIS' }).fdp.actualFdpStr;
  eqj('E5: véspera das mudanças de hora = 6:00', [psvOn('2026-10-23'), psvOn('2026-03-27'), psvOn('2026-10-22')], ['06:00', '06:00', '06:00']);
  // Revisão do 8b, reparo 2: com as horas Zulu, o voo reparte-se no relógio da escala. LIS 22:30 (21:30Z) → GRU 05:30 locais
  // (08:30Z): 11 h de voo; no relógio de Lisboa a chegada é às 09:30 → 9:30 depois da meia-noite (as horas locais davam 5:30).
  const eGru = ftl.dutyToFtlDay({ report_time: '21:15', block_on: '05:30', sectors: 1, flight_minutes: 660, legs: [{ dep: 'LIS', arr: 'GRU', off: '22:30', on: '05:30', offZ: '21:30', onZ: '08:30' }] });
  eq('Reparo 2: LIS→GRU, 9:30 de voo depois da meia-noite (relógio da escala)', eGru.vooNextMin, 570);
  // Revisão do 8b, E2: o relógio da escala é o da 1.ª perna do SERVIÇO, também quando é um posicionamento. Inverno: OPO 20:00,
  // DH OPO→BCN, voo BCN 23:30 (22:30Z) → TFN 00:30Z, 2 h de voo, pós-voo 30 → no relógio de OPO o voo é 22:30–00:30: 30 min depois.
  const eDh = ftl.dutyToFtlDay({ report_time: '20:00', block_on: '00:30', sectors: 1, flight_minutes: 120, legs: [
    { dep: 'OPO', arr: 'BCN', off: '20:45', on: '23:00', offZ: '20:45', onZ: '22:00', dh: true },
    { dep: 'BCN', arr: 'TFN', off: '23:30', on: '00:30', offZ: '22:30', onZ: '00:30' }] }, { postFlightMin: 30 });
  eqj('E2: com posicionamento antes, voo 0:30 e serviço 1:00 depois da meia-noite', [eDh.vooNextMin, eDh.servicoNextMin], [30, 60]);
  // Revisão do 8b, E3: LIS→GRU (verão, 4 h de fuso). Apresentação 21:15 LIS, calços 05:30 GRU (08:30Z) = 12:15 reais de PSV; o
  // limite antigo de 3 h ao tempo decorrido deitava-o fora e dava 8:15 (relógios misturados).
  const dGru = ftl.ftlForDuty({ report_time: '21:15', block_on: '05:30', sectors: 1, flight_minutes: 660, legs: [{ dep: 'LIS', arr: 'GRU', off: '22:30', on: '05:30', offZ: '21:30', onZ: '08:30' }] }, { date: '2026-07-10', base: 'LIS', isPilot: true });
  eq('E3: LIS→GRU, PSV real 12:15', dGru.fdp.actualFdpStr, '12:15');
  // A cadeia: o mesmo voo SEM as horas Zulu (só as locais e os aeroportos) dá as mesmas 12:15 — e LIS→NRT (voo + fuso > 24 h no
  // relógio: 08:00 → 09:00 do dia seguinte, 16 h de voo) dá o PSV real, não 1 h.
  const dGru2 = ftl.ftlForDuty({ report_time: '21:15', block_on: '05:30', sectors: 1, flight_minutes: 660, legs: [{ dep: 'LIS', arr: 'GRU', off: '22:30', on: '05:30' }] }, { date: '2026-07-10', base: 'LIS', isPilot: true });
  eq('Cadeia: LIS→GRU só com horas locais → 12:15', dGru2.fdp.actualFdpStr, '12:15');
  const dNrt = ftl.ftlForDuty({ report_time: '06:45', block_on: '09:00', sectors: 1, flight_minutes: 960, legs: [{ dep: 'LIS', arr: 'NRT', off: '08:00', on: '09:00' }] }, { date: '2026-11-10', base: 'LIS', isPilot: true });
  eq('Cadeia: LIS→NRT 16 h → PSV real 17:15', dNrt.fdp.actualFdpStr, '17:15');
  // 4.ª revisão: a partida seguinte uns minutos ANTES da chegada anterior (chegada atrasada, partida com a hora programada)
  // saltava 24 h → PSV 9:00 em vez de 13:00. Agora há folga de 3 h. Apresentação 20:00, LIS→FNC 21:00–22:45, FNC→GRU 22:40–05:00.
  const dTol = ftl.ftlForDuty({ report_time: '20:00', block_on: '05:00', sectors: 2, flight_minutes: 555, legs: [{ dep: 'LIS', arr: 'FNC', off: '21:00', on: '22:45' }, { dep: 'FNC', arr: 'GRU', off: '22:40', on: '05:00' }] }, { date: '2026-07-10', base: 'LIS', isPilot: true });
  eq('Cadeia: partida 5 min antes da chegada anterior → PSV 13:00', dTol.fdp.actualFdpStr, '13:00');
  const eTol = ftl.dutyToFtlDay({ report_time: '06:00', block_on: '09:00', sectors: 2, flight_minutes: 125, legs: [{ dep: 'LIS', arr: 'OPO', off: '07:00', on: '08:05' }, { dep: 'OPO', arr: 'LIS', off: '08:00', on: '09:00' }] }, { date: '2026-07-10', base: 'LIS' });
  eq('Cadeia: serviço de manhã sem voo depois da meia-noite', eTol.vooNextMin || 0, 0);
  const eTolZ = ftl.dutyToFtlDay({ report_time: '06:00', block_on: '06:30', sectors: 1, flight_minutes: 60, legs: [{ dep: 'LIS', arr: 'OPO', off: '05:30', on: '06:30', offZ: '04:30', onZ: '05:30' }] }, { date: '2026-07-10', base: 'LIS' });
  eq('Cadeia: offZ um pouco antes da apresentação fica no mesmo dia', eTolZ.vooNextMin || 0, 0);
  // Aeroporto sem fuso conhecido, com a Zulu do calendário: a meia-noite é a do relógio da escala, pela própria perna.
  // Apresentação 22:00 (UTC−3 → 01:00Z), voo 22:30–02:30 local (01:30Z–05:30Z): 2:30 depois da meia-noite local.
  const eNoTz = ftl.dutyToFtlDay({ report_time: '22:00', block_on: '02:30', sectors: 1, flight_minutes: 240, legs: [{ dep: 'ZZZ', arr: 'ZZY', off: '22:30', on: '02:30', offZ: '01:30', onZ: '05:30' }] }, { date: '2026-11-10' });
  eq('Cadeia: sem fuso conhecido, pela offZ → 2:30 de voo depois da meia-noite', eNoTz.vooNextMin, 150);
  // E o voo depois da meia-noite pela cadeia: LIS→GRU só com as horas locais, com a data → 9:30 depois da meia-noite de Lisboa.
  const eGru2 = ftl.dutyToFtlDay({ report_time: '21:15', block_on: '05:30', sectors: 1, flight_minutes: 660, legs: [{ dep: 'LIS', arr: 'GRU', off: '22:30', on: '05:30' }] }, { date: '2026-07-10', base: 'LIS', isPilot: true });
  eqj('Cadeia: LIS→GRU, 9:30 de voo e de serviço depois da meia-noite (sem pós-voo)', [eGru2.vooNextMin, eGru2.servicoNextMin], [570, 570]);
  // Serviço que não passa a meia-noite: nada a repartir.
  eq('A-173: serviço diurno sem parte seguinte', logNt[iso(2)].servicoNextMin || 0, 0);
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

// ─────────── "A lei é que manda" (2026-11-06): sem um facto de que a lei precisa → INTERVALO, nunca um valor inventado ───────────
// O motor devolve o máximo GARANTIDO (maxFdpMin, o que a lei dá em qualquer caso) e o máximo POSSÍVEL (maxHiMin).
// Dentro do garantido → dentro; acima do possível → excede; no meio → INCERTO (falta o facto).
{
  const { dayFtlFromDuties } = ftl;
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  // ORO.FTL.205(e)/CS 205(c): a cabine com repouso a bordo sem os pilotos extra, a classe deles e o seu repouso.
  // Garantido: +1 piloto, classe 3, 1:30 → 14:00. Possível: +2 pilotos, classe 1, repouso que chega → 17:00 (classe 2 da cabine: até 17:00).
  const cabNo = (end) => computeDuty({ state: 'acc', report: '06:00', end, sectors: 2, augmented: { restClass: 'c2' }, isPilot: false });
  eq('Cabine sem dados: garantido 14:00', cabNo('20:00').fdp.maxFdpStr, '14:00');
  eq('Cabine sem dados: possível 17:00', cabNo('20:00').fdp.maxHiStr, '17:00');
  eq('Cabine sem dados: não é exato', cabNo('20:00').fdp.exact, false);
  eqj('Cabine sem dados: 14:00 → dentro', [cabNo('20:00').fdp.over, cabNo('20:00').fdp.uncertain], [false, false]);
  eqj('Cabine sem dados: 15:00 → incerto', [cabNo('21:00').fdp.over, cabNo('21:00').fdp.uncertain], [false, true]);
  eqj('Cabine sem dados: 17:30 → excede 0:30 (acima do possível)', [cabNo('23:30').fdp.over, cabNo('23:30').fdp.excessStr], [true, '00:30']);
  eqj('Cabine sem dados: o que falta', cabNo('21:00').fdp.unknowns, ['augmented']);
  // Com os dados todos → exato (o caso A-146).
  eq('Cabine com dados: exato', computeDuty({ state: 'acc', report: '10:00', end: '02:00', sectors: 1, augmented: { restClass: 'c1', additionalCrew: 1, fcRestClass: 'c2', cabinRestMin: 240 }, longestSectorMin: M('9:40') }).fdp.exact, true);
  // CS 205(c)(4) com o setor desconhecido (null): garantido sem a hora a mais, possível com ela.
  const pUnk = computeDuty({ state: 'acc', report: '06:00', end: '22:30', sectors: 1, augmented: { restClass: 'c1', additionalCrew: 1 }, isPilot: true, longestSectorMin: null });
  eqj('Piloto, setor desconhecido: 16:00 a 17:00', [pUnk.fdp.maxFdpStr, pUnk.fdp.maxHiStr], ['16:00', '17:00']);
  eq('Piloto, setor desconhecido: 16:30 → incerto', pUnk.fdp.uncertain, true);

  // ORO.FTL.205(c): o PSV máximo da cabine baseia-se na hora de apresentação DOS PILOTOS, e pode subir pela diferença
  // (até 1 h); o PSV conta desde a apresentação da cabine (auditoria A-156/A-178).
  const cab = (report, end, gap) => computeDuty({ state: 'acc', report, end, sectors: 2, isPilot: false, cabinReportGapMin: gap });
  eq('205(c): cabine 06:45, pilotos 07:00 → 13:00 + 0:15 = 13:15', cab('06:45', '19:00', 15).fdp.maxFdpStr, '13:15');
  eq('205(c): cabine 13:25, pilotos 13:35 → 12:45 + 0:10 = 12:55', cab('13:25', '01:00', 10).fdp.maxFdpStr, '12:55');
  eq('205(c): calços até às 02:20', cab('13:25', '01:00', 10).latestOnBlockStr, '02:20');
  eq('205(c): pilotos 1:30 depois → faixa das 09:30 (13:00) + 1 h no máximo = 14:00', cab('08:00', '20:00', 90).fdp.maxFdpStr, '14:00');
  eq('205(c): mesma hora → Quadro 2', cab('08:00', '20:00', 0).fdp.maxFdpStr, '13:00');
  // Sem a hora dos pilotos (null): os pilotos podem ter-se apresentado até 1 h depois → intervalo.
  // 08:00: garantido 13:00 (mesma hora), possível 14:00 (1 h depois). 13:30 de PSV → incerto (a app dizia "excede").
  eqj('205(c) sem hora dos pilotos, 08:00: 13:00 a 14:00', [cab('08:00', '21:30', null).fdp.maxFdpStr, cab('08:00', '21:30', null).fdp.maxHiStr], ['13:00', '14:00']);
  eq('205(c) sem hora dos pilotos, 08:00: 13:30 → incerto', cab('08:00', '21:30', null).fdp.uncertain, true);
  eqj('205(c) sem hora dos pilotos, 08:00: 12:30 → dentro', [cab('08:00', '20:30', null).fdp.over, cab('08:00', '20:30', null).fdp.uncertain], [false, false]);
  // 13:25: com os pilotos às 13:30 a lei dá 12:45 + 0:05 = 12:50 → o garantido é 12:50, não as 13:00 da hora da cabine.
  eq('205(c) sem hora dos pilotos, 13:25: garantido 12:50', cab('13:25', '01:00', null).fdp.maxFdpStr, '12:50');
  eq('205(c) sem hora dos pilotos, 13:25: possível 13:30', cab('13:25', '01:00', null).fdp.maxHiStr, '13:30');
  // Os pilotos (isPilot) e as calculadoras (sem o parâmetro) não mudam.
  eq('Piloto: a sua própria hora', computeDuty({ state: 'acc', report: '13:25', end: '01:00', sectors: 2, isPilot: true }).fdp.exact, true);

  // CS FTL.1.220(e)(1): o alojamento na pausa decide a extensão. Sem resposta ('unknown') → intervalo.
  // 06:00, 2 setores, pausa 08:00 → 12:00 (4 h, 3:30 líquidas): sem alojamento 13:00; com quarto 13:00 + 1:45 = 14:45.
  const legs = [{ off: '06:00', on: '08:00' }, { off: '12:00', on: '20:00' }];
  const sp = (acc) => dayFtlFromDuties([{ report_time: '06:00', block_on: '20:00', sectors: 2, legs, accommodation: acc }]);
  eqj('220: alojamento por responder → 13:00 a 14:45', [sp(undefined).psv.max, sp(undefined).psv.maxHi], ['13:00', '14:45']);
  eqj('220: por responder, 14:00 → incerto (não "excede")', [sp(undefined).psv.over, sp(undefined).psv.uncertain], [false, true]);
  eqj('220: sem alojamento dito ("none") → excede 1:00', [sp('none').psv.over, sp('none').psv.excess], [true, '01:00']);
  eqj('220: com alojamento → exato 14:45, dentro', [sp('basic').psv.max, sp('basic').psv.over, !!sp('basic').psv.uncertain], ['14:45', false, false]);
  eq('220: registo antigo (false) = por responder', sp(false).psv.uncertain, true);
  // CS FTL.1.220(b) + GM1: a pausa desconta o pré-voo, o pós-voo e a deslocação que o OPERADOR fixa no Manual de
  // Operações (mínimo 30 min). Sem esse valor (splitAdminMin null): garantido sem extensão, possível com os 30 min.
  const spOm = (adm) => dayFtlFromDuties([{ report_time: '06:00', block_on: '20:00', sectors: 2, legs, accommodation: 'basic' }], { splitAdminMin: adm });
  eqj('220(b): sem o tempo do OM → 13:00 a 14:45', [spOm(null).psv.max, spOm(null).psv.maxHi], ['13:00', '14:45']);
  eqj('220(b): sem o tempo do OM, o que falta', spOm(null).psv.unknowns, ['splitAdmin']);
  // OM com 45 min de pré e 30 de pós-voo (75 min): 4:00 − 1:15 = 2:45 < 3 h → já não é repartido → 13:00, excede 1:00.
  eqj('220(b): OM 75 min → pausa líquida 2:45 → sem extensão, excede 1:00', [spOm(75).psv.max, spOm(75).psv.over, spOm(75).psv.excess], ['13:00', true, '01:00']);
  // OM com 30 min → 14:45 exato.
  eqj('220(b): OM 30 min → 14:45', [spOm(30).psv.max, spOm(30).psv.exact], ['14:45', true]);
}

// ─────────── ORO.FTL.205(d): o prolongamento PLANEADO é legal quando cumpre as condições (auditoria A-256) ───────────
// "Os prolongamentos devem ser planeados com antecedência" (205(d)(3)): a escala publicada (o `snap`) é esse plano.
// Um PSV escalado acima do Quadro 2 que cabe na tabela da CS FTL.1.205(b), sem repouso a bordo nem repartido
// (205(d)(4)), e no máximo 2 vezes em 7 dias (205(d)(1)) → DENTRO, com o prolongamento.
{
  const { dutyToFtlDay, reconcileDayLog, ftlForDuty } = ftl;
  const ext = (o = {}) => ({ report_time: '07:00', block_on: '20:30', sectors: 1, flight_minutes: 600, ...o });
  const snapOf = (x) => ({ report_time: x.report_time, block_on: x.block_on, sectors: x.sectors, kind: 'flight' });
  const D = '2026-11-20';
  const planned = ext(); planned.snap = snapOf(planned);
  const ok = ftlForDuty(planned, { duties: { [D]: planned }, date: D });
  eq('205(d): planeado na escala → dentro', ok.fdp.over, false);
  eq('205(d): o máximo é o do prolongamento (14:00)', ok.fdp.maxFdpStr, '14:00');
  eq('205(d): calços até às 21:00', ok.latestOnBlockStr, '21:00');
  eq('205(d): é um prolongamento', ok.extUsed, true);
  eq('205(d): repouso a seguir +2 h (15:30)', ok.rest.restStr, '15:30');
  // Sem plano (posto à mão, sem snap nem a marca): acima do Quadro 2 → excede (não é prolongamento planeado).
  eq('205(d): sem plano → excede', ftlForDuty(ext(), { duties: { [D]: ext() }, date: D }).fdp.over, true);
  // A marca "prolongamento planeado" num serviço posto à mão.
  const mk = ext({ special: { plannedExt: true } });
  eq('205(d): marcado como planeado → dentro', ftlForDuty(mk, { duties: { [D]: mk }, date: D }).fdp.over, false);
  // 3 prolongamentos em 7 dias: o 3.º excede (205(d)(1) "não mais do que duas vezes").
  const tri = { '2026-11-16': planned, '2026-11-18': planned, [D]: planned };
  eq('205(d)(1): o 3.º em 7 dias → excede', ftlForDuty(planned, { duties: tri, date: D }).fdp.over, true);
  eq('205(d)(1): o 3.º em 7 dias → a razão', ftlForDuty(planned, { duties: tri, date: D }).extRefused, '2in7');
  eq('205(d)(1): o 2.º em 7 dias → dentro', ftlForDuty(planned, { duties: tri, date: '2026-11-18' }).fdp.over, false);
  eq('205(d)(1): 7 dias depois já não conta', ftlForDuty(planned, { duties: { '2026-11-13': planned, '2026-11-12': planned, [D]: planned }, date: D }).fdp.over, false);
  // 205(d)(4): não se junta a repouso a bordo nem a repartido.
  const withSplit = ext({ accommodation: 'basic', legs: [{ off: '07:30', on: '09:00' }, { off: '13:00', on: '20:30' }] }); withSplit.snap = snapOf(withSplit);
  eq('205(d)(4): com repartido não é prolongamento', ftlForDuty(withSplit, { duties: { [D]: withSplit }, date: D, splitAdminMin: 30 }).extUsed, false);
  // Acima da tabela do prolongamento (14:30 > 14:00) → excede.
  const over = ext({ block_on: '21:30' }); over.snap = snapOf(over);
  eq('205(d): acima do prolongamento → excede', ftlForDuty(over, { duties: { [D]: over }, date: D }).fdp.over, true);
  // O dayLog resolve-o também (reconcileDayLog passa a escala).
  eq('205(d): no dayLog → dentro', reconcileDayLog({ [D]: planned }, {})[D].psv.over, false);
  eq('205(d): no dayLog → prolongado', reconcileDayLog({ [D]: planned }, {})[D].psv.extended, true);
  // Sem a escala à volta (chamadas antigas) → não se resolve: continua acima do Quadro 2.
  eq('205(d): sem a escala → excede (como antes)', dutyToFtlDay(planned).psv.over, true);
}

// ─────────── ORO.FTL.105(2) hora de referência e 105(12) tempo decorrido (auditoria A-152/A-170/A-171) ───────────
{
  const { ftlForDuty } = ftl;
  // A-170: base LIS, verão (LIS UTC+1, BCN UTC+2). Apresentação em BCN às 15:15 da base (16:15 em BCN), 1 setor BCN→LIS.
  // "Hora de referência = hora local no ponto de apresentação" (fuso a ≤ 2 h do da aclimatação) → faixa 1600–1629 = 11:30.
  const bcn = { report_time: '15:15', block_on: '17:15', sectors: 1, legs: [{ dep: 'BCN', arr: 'LIS', off: '16:00', on: '17:15', offZ: '15:00', onZ: '16:15' }] };
  const rb = ftlForDuty(bcn, { base: 'LIS', date: '2026-07-10' });
  eq('105(2): apresentação em BCN lê-se na hora de BCN (11:30)', rb.fdp.maxFdpStr, '11:30');
  eq('105(2): calços até às 02:45 (relógio da base)', rb.latestOnBlockStr, '02:45');
  // O mesmo em LIS → a hora da base (15:15 → 12:00).
  const lis = { report_time: '15:15', block_on: '17:15', sectors: 1, legs: [{ dep: 'LIS', arr: 'BCN', off: '16:00', on: '17:15', offZ: '15:00', onZ: '16:15' }] };
  eq('105(2): apresentação na base → 12:00', ftlForDuty(lis, { base: 'LIS', date: '2026-07-10' }).fdp.maxFdpStr, '12:00');
  // Posto à mão em BCN, horas locais do aeroporto (sem Zulu): a apresentação já é a de BCN → 16:15 → 11:30.
  const man = { report_time: '16:15', block_on: '18:15', sectors: 1, legs: [{ dep: 'BCN', arr: 'LIS', off: '17:00', on: '18:15' }] };
  eq('105(2): posto à mão em hora de BCN → 11:30', ftlForDuty(man, { base: 'LIS', date: '2026-07-10' }).fdp.maxFdpStr, '11:30');
  // A-171: a noite de 24 para 25 out 2026 (LIS: as 02:00 passam a 01:00). Apresentação 21:00, calços 07:30 do dia 25.
  // O PSV é tempo DECORRIDO (105(12)): 11:30, não 10:30 → máximo 11:00 (1700–0459) → excede 0:30; calços até às 07:00.
  const dst = { report_time: '21:00', block_on: '07:30', sectors: 1, legs: [{ dep: 'LIS', arr: 'FNC', off: '22:00', on: '07:30', offZ: '21:00', onZ: '07:30' }] };
  const rd = ftlForDuty(dst, { base: 'LIS', date: '2026-10-24' });
  eq('105(12): hora de verão — PSV decorrido 11:30', rd.fdp.actualFdpStr, '11:30');
  eq('105(12): hora de verão — excede 0:30', rd.fdp.excessStr, '00:30');
  eq('105(12): hora de verão — calços até às 07:00', rd.latestOnBlockStr, '07:00');
  // Sem legs nem Zulu: fica o relógio (não há como saber mais).
  eq('Sem legs: o relógio', ftlForDuty({ report_time: '21:00', block_on: '07:30', sectors: 1 }, { base: 'LIS', date: '2026-10-24' }).fdp.actualFdpStr, '10:30');
}

// ─────────── ORO.FTL.235(d) + CS FTL.1.235(a): repouso de recuperação (auditoria A-151) ───────────
// 36 h com 2 noites locais (noite local = 8 h entre as 22:00 e as 08:00, ORO.FTL.105(16)); no máximo 168 h entre o fim de
// uma recuperação e o início da seguinte; 60 h depois de 4 ou mais noturnos/matinais/tardios; e, na base, a passagem de
// tardio/noturno para matinal com 1 noite local no repouso.
{
  const { computeRecovery } = ftl;
  const day = (d) => `2026-11-${String(d).padStart(2, '0')}`;
  const svc = (report, end) => ({ report_time: report, block_on: end, sectors: 2, kind: 'flight' });
  // (1) Fim às 08:00 de seg (2) e início às 20:00 de ter (3): 36 h com UMA noite local → não é recuperação.
  const r1 = computeRecovery({ [day(1)]: svc('22:00', '08:00'), [day(3)]: svc('20:00', '23:00') });
  eq('235(d): 36 h com 1 noite não é recuperação', r1.recoveries.length, 0);
  // Fim às 08:00 de seg e início às 20:00 de qua: 60 h, 2 noites → é.
  eq('235(d): 60 h com 2 noites é recuperação', computeRecovery({ [day(1)]: svc('22:00', '08:00'), [day(4)]: svc('20:00', '23:00') }).recoveries.length, 1);
  // (2) Noite local = 8 h entre 22:00 e 08:00: o repouso das 23:30 às 07:30 conta como noite.
  eq('105(16): 23:30 → 07:30 é uma noite local', ftl.localNightsIn(new Date(2026, 10, 5, 23, 30), new Date(2026, 10, 6, 7, 30)), 1);
  eq('105(16): 00:30 → 07:30 (7 h) não é', ftl.localNightsIn(new Date(2026, 10, 6, 0, 30), new Date(2026, 10, 6, 7, 30)), 0);
  // (3) 168 h: recuperação a acabar a 2 nov às 06:00; depois serviços todos os dias sem 36 h livres → o 1.º serviço que
  // acaba depois de 9 nov 06:00 (168 h) está fora — a recuperação seguinte devia ter começado antes.
  const d168 = { [day(1)]: svc('06:00', '12:00') }; for (let i = 4; i <= 12; i++) d168[day(i)] = svc('06:00', '14:00');
  // 1 nov 12:00 → 4 nov 06:00 = 66 h com 2 noites: recuperação. Acaba a 4 nov 06:00 → 168 h = 11 nov 06:00.
  const r168 = computeRecovery(d168);
  eq('235(d): mais de 168 h sem recuperação → aviso', r168.issues.some((x) => x.type === 'recovery168' && x.date === day(11)), true);
  // (4) 60 h: 4 entradas matinais (05:30) entre duas recuperações e a seguinte com só 41 h (2 noites) → aviso.
  const d60 = { [day(1)]: svc('06:00', '12:00') };
  for (let i = 4; i <= 7; i++) d60[day(i)] = svc('05:30', '13:00');
  d60[day(9)] = svc('06:00', '12:00');   // 7 nov 13:00 → 9 nov 06:00 = 41 h, noites de 7 e 8 (22:00–06:00 = 8 h) → recuperação de 41 h
  const r60 = computeRecovery(d60);
  eq('CS 235(a)(2): 4 matinais → a recuperação seguinte (41 h) devia ter 60 h', r60.issues.some((x) => x.type === 'recovery60' && x.date === day(9)), true);
  // (5) Tardio → matinal na base sem noite local: acaba à 01:30 de 6 nov, entra às 05:30 de 7 nov (28 h, nenhuma noite de 8 h).
  const dTr = { [day(5)]: svc('16:00', '01:30'), [day(7)]: svc('05:30', '12:00') };
  eq('CS 235(a)(1): tardio → matinal sem noite local → aviso', computeRecovery(dTr, { base: 'LIS' }).issues.some((x) => x.type === 'transitionNight' && x.date === day(7)), true);
  eq('CS 235(a)(1): tardio → entrada às 06:00 (não é matinal) → sem aviso', computeRecovery({ [day(5)]: svc('16:00', '01:30'), [day(7)]: svc('06:00', '12:00') }, { base: 'LIS' }).issues.some((x) => x.type === 'transitionNight'), false);
  // ORO.FTL.235(d): "o período de repouso de recuperação prolongado recorrente deve aumentar para dois dias locais duas
  // vezes por mês" (dia local = 24 h a partir das 00:00). Novembro todo a trabalhar com um só dia livre por semana: as
  // recuperações (40 h, 2 noites) existem, mas nenhuma tem 2 dias locais → aviso no fim do mês.
  const monthDuties = (free) => {
    const m = {};
    for (const iso of ['2026-10-30', '2026-10-31', '2026-12-01', '2026-12-02']) m[iso] = svc('06:00', '14:00');
    for (let i = 1; i <= 30; i++) { const iso = `2026-11-${String(i).padStart(2, '0')}`; if (!free.includes(i)) m[iso] = svc('06:00', '14:00'); }
    return m;
  };
  const rDays = computeRecovery(monthDuties([6, 13, 20, 27]));
  eq('235(d): novembro sem recuperações de 2 dias locais → aviso', rDays.issues.some((x) => x.type === 'recoveryDays' && x.month === '2026-11' && x.count === 0), true);
  eq('235(d): com 2 recuperações de 2 dias locais → sem aviso', computeRecovery(monthDuties([6, 7, 20, 21])).issues.some((x) => x.type === 'recoveryDays'), false);
  // CS FTL.1.200(b): na mudança de base, a recuperação antes do 1.º serviço na base nova tem 72 h com 3 noites locais.
  const baseAt = (iso) => (iso >= '2026-11-08' ? 'OPO' : 'LIS');
  eq('CS FTL.1.200(b): 64 h antes do 1.º serviço no Porto → aviso', computeRecovery({ [day(5)]: svc('06:00', '14:00'), [day(8)]: svc('06:00', '12:00') }, { baseAt }).issues.some((x) => x.type === 'baseChange' && x.date === day(8)), true);
  eq('CS FTL.1.200(b): 88 h com 4 noites → sem aviso', computeRecovery({ [day(5)]: svc('06:00', '14:00'), [day(9)]: svc('06:00', '12:00') }, { baseAt }).issues.some((x) => x.type === 'baseChange'), false);
  // O fim do serviço é o sign-off (A-151 (3)): calços 22:45, sign-off 23:15 → tardio.
  eq('105(8): tardio pelo sign-off', computeRecovery({ [day(5)]: { report_time: '14:00', block_on: '22:45', signOff: '23:15', sectors: 2 }, [day(7)]: svc('05:30', '12:00') }, { base: 'LIS' }).duties[0].lateFinish, true);
}

// ─────────── ORO.FTL.105(8): irregulares no fuso de aclimatação (2026-11-08) ───────────
// "Horário irregular: ... um PSV ... que se sobreponha, comece ou termine em qualquer parte do dia ou da noite em que um membro
// da tripulação está aclimatado" — no longo curso as horas da escala estão no fuso de cada aeroporto (apresentação no da partida,
// calços no da chegada). O recoveryIssues mede noturno/matinal/tardio no fuso de aclimatação (nightClockOf do motor, o critério do
// PSV); com a aclimatação X ou por saber, as duas leituras (hora da base e hora local) → o aviso que só uma dá fica INCERTO.
{
  const { recoveryIssues, recoveryStatus } = require(path.resolve('data/today.js'));
  const { computeRecovery } = ftl;
  const svc = (report, end) => ({ report_time: report, block_on: end, sectors: 2, kind: 'flight' });
  const fl = (report, on, route, off) => { const [dep, arr] = route.split('-'); return { report_time: report, block_on: on, sectors: 1, kind: 'flight', route, legs: [{ dep, arr, off, on }] }; };
  const C = { postFlightMin: 30, base: 'LIS' };
  const r60 = (list) => JSON.stringify(list.filter((x) => x.type === 'recovery60').map((x) => [x.date, x.disruptive, !!x.uncertain, x.why || null]));
  const J = (x) => JSON.stringify(x);
  // (1) Julho (LIS UTC+1, GRU UTC−3). Recuperação até 4/7; 3 matinais (05:30) a 4, 5 e 6; a 7 LIS→GRU: apresentação 13:00,
  // calços 20:00 em GRU (23:00Z) → com o pós-voo acaba às 00:30 de Lisboa = TARDIO (fim entre 23:00 e 01:59 no matinal e entre
  // 00:00 e 01:59 no tardio, ORO.FTL.105(8)). Pelas horas da escala (13:00–20:30) não seria. Depois 38 h em GRU com 2 noites
  // (recuperação) → 4 irregulares → a recuperação devia ter 60 h (CS FTL.1.235(a)(2)).
  const esc1 = {
    '2026-07-01': svc('06:00', '12:00'),
    '2026-07-04': svc('05:30', '13:00'), '2026-07-05': svc('05:30', '13:00'), '2026-07-06': svc('05:30', '13:00'),
    '2026-07-07': fl('13:00', '20:00', 'LIS-GRU', '14:00'),
    '2026-07-09': fl('10:30', '01:00', 'GRU-LIS', '11:30'),
  };
  eq('105(8): LIS→GRU acaba às 00:30 de Lisboa → 4.º irregular → recuperação de 60 h em falta', r60(recoveryIssues(esc1, C)), J([['2026-07-09', 4, false, null]]));
  eq('105(8): sem o fuso (computeRecovery sozinho, como antes) → 3 irregulares, sem aviso', computeRecovery(esc1, C).issues.some((x) => x.type === 'recovery60'), false);
  // (2) Janeiro (LIS UTC+0, EWR UTC−5: 5 h, linha "≤ 6"). Matinais a 4, 5 e 6 (o de 6 é a ida LIS→EWR); a 8, regresso de
  // Newark às 04:30 locais (09:30 de Lisboa), 52 h depois da ida → Quadro 1: X (estado desconhecido). Pela hora local é
  // noturno (sobrepõe 02:00–04:59, ORO.FTL.105(9)), pela da base não → o 4.º irregular é incerto → o aviso das 60 h é INCERTO,
  // com o motivo "aclimatação" (não depende do tipo de horário: os matinais das 05:30 são-no nos dois tipos).
  const esc2 = {
    '2026-01-01': svc('06:00', '12:00'),
    '2026-01-04': svc('05:30', '13:00'), '2026-01-05': svc('05:30', '13:00'),
    '2026-01-06': fl('05:30', '09:30', 'LIS-EWR', '06:30'),
    '2026-01-08': fl('04:30', '17:00', 'EWR-LIS', '05:30'),
    '2026-01-10': svc('06:00', '12:00'),
  };
  eq('105(8): aclimatação X, noturno só pela hora local → 60 h incerto (motivo: aclimatação)', r60(recoveryIssues(esc2, C)), J([['2026-01-10', 4, true, 'acclim']]));
  // Com o tipo de horário conhecido, a dúvida da aclimatação continua (o recoveryStatus já não a apaga).
  const st = recoveryStatus(esc2, '2026-01-09', { ...C, disruptiveType: 'early' });
  eq('105(8): tipo conhecido, aclimatação X → continua incerto (warn)', J([st.status, st.issues.filter((x) => x.type === 'recovery60').map((x) => [!!x.uncertain, x.why])]), J(['warn', [[true, 'acclim']]]));
  // Os avisos que só dependem do tipo de horário continuam incertos com o motivo "tipo": 3 matinais às 05:30 e um 4.º às 06:30
  // (matinal só no tipo tardio, 05:00–06:59, ORO.FTL.105(8)) → as 60 h só faltam no tipo tardio.
  const esc3 = {
    '2026-11-01': svc('08:00', '14:00'),
    '2026-11-04': svc('05:30', '13:00'), '2026-11-05': svc('05:30', '13:00'), '2026-11-06': svc('05:30', '13:00'),
    '2026-11-07': svc('06:30', '13:00'), '2026-11-09': svc('08:00', '14:00'),
  };
  eq('CS 235(a)(2): o 4.º irregular só no tipo tardio → 60 h incerto, motivo tipo', r60(recoveryIssues(esc3, C)), J([['2026-11-09', 4, true, 'type']]));
  // Em faixa, a faixa de 2 h lê-se pelo conservador (partida, base ou chegada) e NÃO dá "incerto" de aclimatação: LIS 20:00 →
  // BCN 23:20 locais + pós-voo = 23:50 de Barcelona (22:50 de Lisboa) → tardio no tipo matinal (23:00–01:59) pela hora de
  // Barcelona; no tipo tardio (00:00–01:59) não → o aviso das 60 h só depende do tipo.
  const esc4 = {
    '2026-07-01': svc('06:00', '12:00'),
    '2026-07-04': svc('05:30', '13:00'), '2026-07-05': svc('05:30', '13:00'), '2026-07-06': svc('05:30', '13:00'),
    '2026-07-07': fl('20:00', '23:20', 'LIS-BCN', '21:00'), '2026-07-10': svc('06:00', '12:00'),
  };
  eq('105(8): em faixa, a chegada a Barcelona conta (conservador) e só o tipo fica em dúvida', r60(recoveryIssues(esc4, C)), J([['2026-07-10', 4, true, 'type']]));
  // Um serviço em terra SEM pernas fora da base lê-se pelo Quadro 1 como os voos: situa-se no aeroporto da última chegada (GRU) e
  // as horas da escala são as de lá. Assistência em GRU a 7/7, 20:30–22:45 locais, 35 h depois da apresentação em Lisboa → B →
  // 00:30–02:45 de Lisboa → NOTURNO (pela hora local não era). 2 matinais + o LIS→GRU tardio + esta = 4 → faltam as 60 h.
  const sbG = { kind: 'standby_airport', report_time: '20:30', block_on: '22:45', sectors: 0 };
  const esc5 = {
    '2026-07-01': svc('06:00', '12:00'),
    '2026-07-04': svc('05:30', '13:00'), '2026-07-05': svc('05:30', '13:00'),
    '2026-07-06': fl('13:00', '20:00', 'LIS-GRU', '14:00'), '2026-07-07': sbG,
    '2026-07-09': fl('14:00', '05:00', 'GRU-LIS', '15:00'),
  };
  eq('105(8): assistência em GRU sem pernas → hora de Lisboa (B), +4 h', J(ftl.nightClockOf(sbG, { base: 'LIS', date: '2026-07-07', duties: esc5 }).shifts), J([240]));
  eq('105(8): a assistência noturna pela hora de Lisboa é o 4.º irregular → 60 h em falta', r60(recoveryIssues(esc5, C)), J([['2026-07-09', 4, false, null]]));
}

// ─────────── ORO.FTL.105(1) + Quadro 1: aclimatação no longo curso (auditoria A-152/A-169) ───────────
// Fora da faixa de 2 h, o estado sai do Quadro 1 pela diferença de fuso e pelo tempo decorrido desde a apresentação na
// hora de referência: B → Quadro 2 na hora da base; D → Quadro 2 na hora local; X → Quadro 3 (estado desconhecido).
// Rotação LIS → EWR no inverno (LIS UTC+0, EWR UTC−5: 5 h → linha "≤ 6"), apresentação em Lisboa a 10 jan às 10:00.
{
  const { ftlForDuty } = ftl;
  const out = { report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  // Regresso de Newark às 14:00 da base (09:00 locais), 1 setor.
  const back = { report_time: '14:00', block_on: '23:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '15:00', on: '23:00', offZ: '15:00', onZ: '23:00' }] };
  const at = (date) => ftlForDuty(back, { base: 'LIS', date, duties: { '2026-01-10': out, [date]: back } });
  // 11 jan: 28 h depois → coluna < 48 → B → faixa na hora da base (14:00 → 12:30).
  eq('Quadro 1: < 48 h → B', at('2026-01-11').acclim.letter, 'B');
  eq('Quadro 1: B → Quadro 2 na hora da base (12:30)', at('2026-01-11').fdp.maxFdpStr, '12:30');
  // 12 jan: 52 h → coluna 48–71:59, linha ≤ 6 → X → Quadro 3 (1–2 setores: 11:00).
  eq('Quadro 1: 52 h → X', at('2026-01-12').acclim.letter, 'X');
  eq('Quadro 1: X → Quadro 3 (11:00)', at('2026-01-12').fdp.maxFdpStr, '11:00');
  // 14 jan: 100 h → coluna 96–119:59 → D → faixa na hora LOCAL de Newark (09:00 → 13:00).
  eq('Quadro 1: 100 h → D', at('2026-01-14').acclim.letter, 'D');
  eq('Quadro 1: D → Quadro 2 na hora local (13:00)', at('2026-01-14').fdp.maxFdpStr, '13:00');
  // Sem a escala à volta (chamadas antigas): fica como antes (hora da base).
  eq('Sem a escala: como antes (12:30)', ftlForDuty(back, { base: 'LIS', date: '2026-01-12' }).fdp.maxFdpStr, '12:30');
  // Sem a ida na escala (o 1.º registo): não se sabe o estado → intervalo de Quadro 3 a Quadro 2 local.
  const unk = ftlForDuty(back, { base: 'LIS', date: '2026-01-12', duties: { '2026-01-12': back } });
  eq('Sem a ida: aclimatação por saber → intervalo 11:00 a 13:00', JSON.stringify([unk.fdp.maxFdpStr, unk.fdp.maxHiStr, unk.fdp.exact]), JSON.stringify(['11:00', '13:00', false]));
  // 2.ª revisão (2026-11-08): um serviço em terra sem rota (o calendário não lha dá) situa-se no aeroporto da ÚLTIMA CHEGADA antes
  // dele — aqui Newark —, não na base: a assistência em Newark a 11 não é referência → continua X a 12 (dava B: Quadro 2, 2 h a mais).
  const sbE = { kind: 'standby_airport', report_time: '09:00', block_on: '13:00', sectors: 0 };
  eq('2.ª revisão: assistência em Newark (sem rota) não é referência → X', ftlForDuty(back, { base: 'LIS', date: '2026-01-12', duties: { '2026-01-10': out, '2026-01-11': sbE, '2026-01-12': back } }).acclim.letter, 'X');
  // nightClockOf sem base: só a hora local (a chegada só entra dentro da faixa da base, que aqui não se sabe).
  const { nightClockOf } = ftl;
  eq('2.ª revisão: nightClockOf sem base → só a hora local', JSON.stringify(nightClockOf({ report_time: '10:00', block_on: '13:30', sectors: 1, legs: [{ dep: 'LIS', arr: 'JFK', off: '11:00', on: '13:30' }] }, { date: '2026-01-10' }).shifts), '[0]');
  // Dia da mudança de hora (25/10): os desvios leem-se no instante da apresentação (00:30, ainda hora de verão) → só a hora local.
  eq('2.ª revisão: LIS→FAO às 00:30 no dia da mudança de hora → só a hora local', JSON.stringify(nightClockOf({ report_time: '00:30', block_on: '01:20', sectors: 1, legs: [{ dep: 'LIS', arr: 'FAO', off: '00:50', on: '01:20' }] }, { base: 'LIS', date: '2026-10-25' }).shifts), '[0]');
  eq('Sem a ida: o que falta', JSON.stringify(unk.fdp.unknowns), JSON.stringify(['acclimatisation']));
  // Dentro da faixa de 2 h (Barcelona, +1 h) não há Quadro 1.
  const bcn = { report_time: '15:15', block_on: '17:15', sectors: 1, legs: [{ dep: 'BCN', arr: 'LIS', off: '16:00', on: '17:15', offZ: '15:00', onZ: '16:15' }] };
  // ORO.FTL.205(d) "para tripulantes aclimatados": no estado X não há prolongamento, mesmo planeado.
  const backLong = { ...back, block_on: '01:30', legs: [{ dep: 'EWR', arr: 'LIS', off: '15:00', on: '01:30', offZ: '15:00', onZ: '01:30' }] };
  backLong.snap = { report_time: '14:00', block_on: '01:30', sectors: 1, kind: 'flight' };
  eq('205(d): no estado X não há prolongamento', ftlForDuty(backLong, { base: 'LIS', date: '2026-01-12', duties: { '2026-01-10': out, '2026-01-12': backLong } }).extUsed, false);
  eq('≤ 2 h: aclimatado, sem Quadro 1', ftlForDuty(bcn, { base: 'LIS', date: '2026-07-10', duties: { '2026-07-10': bcn } }).acclim.letter, 'in');
}

// ─────────── CS FTL.1.205(d)(1)(ii): adiamento com 2.ª notificação (auditoria A-154) ───────────
// "If the reporting time is further amended, the FDP starts counting 1 hour after the second notification or at the original
// delayed reporting time if this is earlier." Original 06:00; 1.º aviso adia para as 09:00; 2.º aviso às 07:30 adia para as
// 11:00 → o PSV conta desde as 08:30 (07:30 + 1 h, antes das 09:00). 2 setores, máximo 13:00 → calços até às 21:30.
{
  const { ftlForDuty } = ftl;
  const two = { report_time: '11:00', block_on: '22:00', sectors: 2, special: { delayedFrom: '06:00', delayed1: '09:00', notice2: '07:30' } };
  const r = ftlForDuty(two, {});
  eq('205(d)(1)(ii): o PSV conta desde as 08:30 → 13:30', r.fdp.actualFdpStr, '13:30');
  eq('205(d)(1)(ii): máximo 13:00 → excede 0:30', r.fdp.excessStr, '00:30');
  eq('205(d)(1)(ii): calços até às 21:30', r.latestOnBlockStr, '21:30');
  // O texto não diz se o máximo se calcula com a 1.ª ou a 2.ª hora adiada: com 06:00 → 14:00 → 16:00 as leituras dão 12:30
  // (06:00 vs 14:00) e 11:30 (06:00 vs 16:00) → intervalo, "incerto" no meio. 2.º aviso às 12:00 → conta desde as 13:00.
  const amb = ftlForDuty({ report_time: '16:00', block_on: '01:00', sectors: 2, special: { delayedFrom: '06:00', delayed1: '14:00', notice2: '12:00' } }, {});
  eq('205(d)(1)(ii): duas leituras → 11:30 a 12:30', JSON.stringify([amb.fdp.maxFdpStr, amb.fdp.maxHiStr]), JSON.stringify(['11:30', '12:30']));
  eq('205(d)(1)(ii): o que falta', JSON.stringify(amb.fdp.unknowns), JSON.stringify(['delayRule']));
  // Sem a 2.ª notificação: como antes (conta desde a hora adiada).
  eq('Uma só notificação: conta desde a hora adiada', ftlForDuty({ report_time: '11:00', block_on: '22:00', sectors: 2, special: { delayedFrom: '06:00' } }, {}).fdp.actualFdpStr, '11:00');
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
  // A diferença de apresentação (ORO.FTL.205(c)) prolonga o PSV DA CABINE, e a tabela (c)(3) lê-se pelo PSV da cabine:
  // a classe e o repouso a bordo da cabine limitam o total JÁ com a diferença (bloco 8b: a app somava a diferença depois e
  // dava classe 3 a 16:45 "dentro", quando a tabela diz "Not allowed" acima de 16:00).
  const cabGap = (end, cls, rest, gap) => computeDuty({ state: 'acc', report: '06:00', end, sectors: 2, isPilot: false, cabinReportGapMin: gap, augmented: { restClass: cls, additionalCrew: 2, fcRestClass: 'c1', cabinRestMin: rest } });
  eq('Cabine c3 + 45 min de diferença: teto continua 16:00', cabGap('22:40', 'c3', 180, 45).fdp.maxFdpStr, '16:00');
  eq('Cabine c3 + 45 min: PSV 16:40 → excede 0:40', cabGap('22:40', 'c3', 180, 45).fdp.excessStr, '00:40');
  eq('Cabine c2 + 45 min: teto continua 17:00', cabGap('23:30', 'c2', 240, 45).fdp.maxFdpStr, '17:00');
  eq('Cabine c2 + 45 min: PSV 17:30 → excede 0:30', cabGap('23:30', 'c2', 240, 45).fdp.over, true);
  // Repouso curto também limita com a diferença: c2 com 2:00 → 15:00, mesmo com os pilotos 30 min depois.
  eq('Cabine c2, 2:00 de repouso + 30 min: teto 15:00', cabGap('20:00', 'c2', 120, 30).fdp.maxFdpStr, '15:00');
  // Onde a técnica limita (c1, 4:00 de repouso → a classe vai a 18:00), a diferença ainda soma: 17:00 + 0:45 = 17:45.
  eq('Cabine c1 + 45 min: técnica 17:00 + 0:45 = 17:45', cabGap('23:30', 'c1', 240, 45).fdp.maxFdpStr, '17:45');
  // Revisão do 8b, E3: as 6 h da CS 220(d) são da pausa LÍQUIDA. Pausa bruta 6:15 às 10:00 (líquida 5:45, sem WOCL): as duas
  // leituras contam 5:45 → exato, sem a dúvida da sala.
  const dE3 = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 4, splitBreakH: 6.25, splitBreakStart: '10:00', accommodation: 'basic' });
  eqj('E3: pausa líquida 5:45 com sala → exato, sem dúvida', [dE3.fdp.exact, dE3.fdp.uncertain, dE3.fdp.unknowns], [true, false, []]);
  // Revisão do 8b, reparo 10 — CS FTL.1.225(b)(8): standby em casa antes de um PSV com repouso a bordo → as 6 h passam a 8 h.
  // Piloto, 3 pilotos em classe 1 (16:00), standby em casa das 08:00 às 15:00 (7 h): com 6 h reduzia 1 h (15:00); com 8 h não reduz.
  const dR10 = computeDuty({ state: 'acc', report: '15:00', end: '05:00', sectors: 1, isPilot: true, augmented: { restClass: 'c1', additionalCrew: 1 }, preStandby: { type: 'other', standbyH: 7, startMin: M('08:00') } });
  eq('Reparo 10: standby 7 h + repouso a bordo → sem redução (16:00)', dR10.fdp.maxFdpStr, '16:00');
  const dR10b = computeDuty({ state: 'acc', report: '15:00', end: '23:00', sectors: 1, isPilot: true, preStandby: { type: 'other', standbyH: 7, startMin: M('08:00') } });
  eq('Reparo 10: sem repouso a bordo, as 6 h continuam (reduz 1 h)', dR10b.fdp.stdbyReductionMin, 60);
  // Revisão do 8b: o aviso das 18 h acordado (CS FTL.1.225(b)(2)) com um teto JÁ reduzido não reduz outra vez. Standby em casa
  // de 10 h com teto já reduzido a 9:00, sem o fim do serviço: 10 h + 9 h = 19 h > 18 h → aviso (reduzido 2 vezes dava 15 h).
  eq('Standby: aviso das 18 h com o teto já reduzido', ftl.computeStandby({ type: 'other', standbyH: 10, maxFdpMin: 540, reduced: true }).awakeOver, true);
  eq('Standby: reduced não muda o teto', ftl.computeStandby({ type: 'other', standbyH: 10, maxFdpMin: 540, reduced: true }).reducedMaxFdpMin, 540);
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
  // 11h: FORA da base é rest (≥ 10h, ORO.FTL.235(b)). NA base (mínimo 12 h, 235(a)(1)) a lei admite duas leituras
  // (2026-11-11, noite 8): "intervalo" é inferior a um período de repouso (ORO.FTL.105(6)) e 10 h já são um repouso possível
  // (235(b); na base com alojamento adequado, 235(a)(2); CS FTL.1.235(c)(1)) — ou é um intervalo de um PSV só, ou um repouso
  // entre dois PSV. A app não escolhe: 'either'. (Antes: 'split'.)
  eq('Repouso entre: 11h base → intervalo ou repouso (either)', restBetweenDuties(B, { report_time: '21:00' }, { inBase: true }).kind, 'either');
  eq('Repouso entre: 11h fora → rest', restBetweenDuties(B, { report_time: '21:00' }, { inBase: false }).kind, 'rest');
  eq('Repouso entre: 9h59 base → split (inferior a qualquer repouso)', restBetweenDuties(B, { report_time: '19:59' }, { inBase: true }).kind, 'split');
  eq('Repouso entre: 10h00 base → either', restBetweenDuties(B, { report_time: '20:00' }, { inBase: true }).kind, 'either');
  eq('Repouso entre: 12h00 base → rest', restBetweenDuties(B, { report_time: '22:00' }, { inBase: true }).kind, 'rest');
  // Mínimo nunca < serviço anterior (235): serviço de 13h → exige 13h; 12h45 não chegam para um repouso CERTO, mas já passam
  // das 10 h: as duas leituras ('either'; antes 'split').
  const long = { report_time: '06:00', block_on: '19:00' };        // serviço de 13h
  eq('Repouso entre: mín = serviço anterior (13h) → 12h45: intervalo ou repouso curto (either)', restBetweenDuties(long, { report_time: '07:40' }).kind, 'either');
  // Fim DEPOIS da meia-noite (sign-off 01:15): o intervalo calcula-se com volta à meia-noite.
  const nite = { report_time: '22:30', block_on: '00:45', signOff: '01:15' };
  eq('Repouso entre: fim 01:15 → next 14:00 = 12h45 base → rest', restBetweenDuties(nite, { report_time: '14:00' }).kind, 'rest');
  // A NOITE DA MUDANÇA DE HORA (2026-11-11, noite 10): o tempo entre dois serviços é tempo DECORRIDO (ORO.FTL.105: o repouso
  // é um "período de tempo contínuo"), não a diferença dos relógios. A 29/03/2026 a hora adianta (01:00 → 02:00 em Lisboa):
  // do fim às 00:50 à apresentação das 13:00 são 11:10 reais (no relógio 12:10). A 25/10/2026 atrasa: 00:50 → 12:30 são 12:40
  // reais (no relógio 11:40). Com o dia do serviço mede-se pelo real — como o repouso já se media (data/today.js); sem o dia,
  // pelo relógio, como antes. (Só se confere num dispositivo com a hora de Portugal: é o relógio do dispositivo que conta.)
  {
    const pt = new Date('2026-03-29T12:00:00').getTimezoneOffset() === -60 && new Date('2026-03-28T12:00:00').getTimezoneOffset() === 0;
    const E = { report_time: '00:05', block_on: '00:20' };   // acaba às 00:50 com 30 min de pós-voo
    const k = (rep, date) => restBetweenDuties(E, { report_time: rep }, { inBase: true, postFlightMin: 30, ...(date ? { date } : {}) });
    eqj('mudança de hora: sem o dia, pelo relógio (12:10 → repouso)', [k('13:00').gapMin, k('13:00').kind], [730, 'rest']);
    if (pt) {
      eqj('29/03: a hora adianta → 11:10 reais → intervalo ou repouso (não um repouso certo)', [k('13:00', '2026-03-29').gapMin, k('13:00', '2026-03-29').kind], [670, 'either']);
      eqj('25/10: a hora atrasa → 12:40 reais → repouso (não as 11:40 do relógio)', [k('12:30', '2026-10-25').gapMin, k('12:30', '2026-10-25').kind], [760, 'rest']);
      eqj('num dia normal, com o dia: igual ao relógio', [k('13:00', '2026-06-10').gapMin, k('13:00', '2026-06-10').kind], [730, 'rest']);
      // … e o "serviço precedente" também é tempo real: a 25/10, das 00:00 às 11:30 são 12:30 reais (no relógio 11:30). Um
      // repouso de 12:15 a seguir é inferior ao serviço precedente → já não é um repouso certo.
      const kd = restBetweenDuties({ report_time: '00:00', block_on: '11:30' }, { report_time: '23:45' }, { inBase: true, postFlightMin: 0, date: '2026-10-25' });
      eqj('25/10: serviço de 12:30 reais → 12:15 de repouso não chegam de certeza', [kd.prevDutyMin, kd.requiredMin, kd.gapMin, kd.kind], [750, 750, 735, 'either']);
      const dst = dayFtlFromDuties([{ kind: 'flight', report_time: '00:05', block_off: '00:10', block_on: '00:20', sectors: 1, flight_minutes: 10, route: 'LIS-OPO-LIS' }, { kind: 'flight', report_time: '13:00', block_off: '14:00', block_on: '15:00', sectors: 1, flight_minutes: 60, route: 'LIS-OPO' }], { postFlightMin: 30, isPilot: true, base: 'LIS', date: '2026-03-29' });
      eqj('29/03: o dia de dois serviços vê as 11:10 reais', [dst.between[0].gapMin, dst.between[0].kind], [670, 'either']);
    }
  }
  // dayFtlFromDuties EXPÕE o `between` e o flag split.
  const day2 = dayFtlFromDuties([{ report_time: '06:00', block_on: '10:00', flight_minutes: 180 }, { report_time: '20:00', block_on: '23:00', flight_minutes: 120 }]);
  eq('Dia 2 serviços: expõe between[1]', day2.between.length, 1);
  eqj('Dia 2 serviços: 10h base entre eles → as duas leituras (either): junto para as contas, incerto no veredicto', [day2.between[0].kind, day2.split, day2.either], ['either', true, true]);

  // DOIS SERVIÇOS NO MESMO DIA, NA BASE, COM 10 A 12 HORAS ENTRE ELES (achado a 2026-11-11, noite 8). A leitura do calendário lê
  // dois serviços; o motor juntava-os num PSV só, como repartido, e dava "excede". 05:00 → 08:40 (+30 min de pós-voo = 09:10) e
  // 19:10 → 21:55 em Lisboa: 10 h em terra.
  //  · leitura A (um PSV repartido): 05:00 → 21:55 = 16:55; Quadro 2 às 05:00 com 3 setores = 11:30; com o intervalo, até 16:30;
  //  · leitura B (dois PSV com um repouso de 10 h): 3:40 e 2:45, os dois dentro; o repouso de 10 h na base só chega com
  //    alojamento adequado (ORO.FTL.235(a)(2)).
  // O texto admite as duas (ORO.FTL.105(6)): nem "excede" nem "dentro" — incerto, com o que falta (`breakOrRest`).
  {
    const s1 = { kind: 'flight', report_time: '05:00', block_off: '06:00', block_on: '08:40', sectors: 2, flight_minutes: 120, route: 'LIS-OPO-LIS', legs: [{ dep: 'LIS', arr: 'OPO', off: '06:00', on: '07:00' }, { dep: 'OPO', arr: 'LIS', off: '07:40', on: '08:40' }] };
    const s2 = { kind: 'flight', report_time: '19:10', block_off: '20:10', block_on: '21:55', sectors: 1, flight_minutes: 105, route: 'LIS-FNC', legs: [{ dep: 'LIS', arr: 'FNC', off: '20:10', on: '21:55' }] };
    const O2 = { postFlightMin: 30, isPilot: true, base: 'LIS', date: '2026-11-20' };
    const dd = dayFtlFromDuties([s1, s2], O2);
    eqj('2 serviços, 10 h na base: intervalo ou repouso', [dd.between[0].kind, dd.between[0].gapMin, dd.between[0].requiredMin, dd.split, dd.either], ['either', 600, 720, true, true]);
    eqj('2 serviços, 10 h na base: PSV incerto, não "excede" (antes: excede)', [!!dd.psv.over, dd.psv.uncertain, (dd.psv.unknowns || []).includes('breakOrRest')], [false, true, true]);
    // O serviço do dia para os limites do ORO.FTL.210 também depende da leitura: como dois PSV, 4:10 + 3:15 = 7:25; como um
    // repartido, o intervalo conta todo (ORO.FTL.220(b)): 17:25. Fica o certo (7:25) e o possível (17:25): um limite só
    // "excede" com o certo; com o possível fica incerto. O voo é o mesmo nas duas.
    eqj('… serviço do dia: 7:25 certas, 17:25 possíveis; voo 3:45', [dd.servicoMin, dd.servicoMaxMin, dd.vooMin], [445, 1045, 225]);
    // Com alojamento adequado dito pelo tripulante: como um PSV só, o máximo é 11:30 + metade de (10:30 − 0:30) = 16:30, e 16:55
    // excede; como dois PSV, o repouso de 10 h na base chega (235(a)(2)) → legal numa leitura, não na outra: incerto.
    const ddS = dayFtlFromDuties([{ ...s1, accommodation: true }, s2], O2);
    eqj('… com alojamento adequado: incerto (excede numa leitura, legal na outra)', [!!ddS.psv.over, ddS.psv.uncertain], [false, true]);
    // Sem alojamento (dito): como um PSV só excede (sem prolongamento do repartido, CS FTL.1.220(e)(1)); como dois, o repouso de
    // 10 h na base é curto (12 h, 235(a)(1)) → ilegal nas duas leituras: "excede".
    const ddN = dayFtlFromDuties([{ ...s1, accommodation: 'none' }, s2], O2);
    eqj('… sem alojamento: ilegal nas duas leituras → excede', [ddN.psv.over, ddN.psv.max, ddN.psv.excess], [true, '11:30', '05:25']);
    // Com 9 h 30 (apresentação 18:40) é um intervalo em qualquer leitura: um PSV repartido, como sempre.
    const d930 = dayFtlFromDuties([s1, { ...s2, report_time: '18:40', block_off: '19:40', block_on: '21:25', legs: [{ dep: 'LIS', arr: 'FNC', off: '19:40', on: '21:25' }] }], O2);
    eqj('2 serviços, 9 h 30 na base: repartido certo', [d930.between[0].kind, d930.split, !!d930.either, (d930.psv.unknowns || []).includes('breakOrRest')], ['split', true, false, false]);
    // Com 12 h (apresentação 21:10) é um repouso: dois PSV, como sempre.
    const d12 = dayFtlFromDuties([s1, { ...s2, report_time: '21:10', block_off: '22:10', block_on: '23:55', legs: [{ dep: 'LIS', arr: 'FNC', off: '22:10', on: '23:55' }] }], O2);
    eqj('2 serviços, 12 h na base: dois PSV, certo', [d12.between[0].kind, !!d12.either, !!d12.psv.over, !!d12.psv.uncertain], ['rest', false, false, false]);
    // Revisão independente (noite 9). (1) TRÊS serviços: um bloco incerto não se esconde atrás de outro que está dentro.
    // 00:05 → 00:20 (LIS-OPO); repouso fora; 10:50 → 11:20 (OPO-LIS, 3 setores); 10 h na base; 21:50 → 03:00 (3 setores). O
    // 1.º bloco está dentro; o 2.º (10:50 → 03:00, ou dois PSV) é incerto → o dia é incerto. (Antes da correção: excede 0:10.)
    const t3 = dayFtlFromDuties([
      { kind: 'flight', report_time: '00:05', block_off: '00:10', block_on: '00:20', sectors: 1, flight_minutes: 10, route: 'LIS-OPO' },
      { kind: 'flight', report_time: '10:50', block_off: '10:55', block_on: '11:20', sectors: 3, flight_minutes: 20, route: 'OPO-LIS' },
      { kind: 'flight', report_time: '21:50', block_off: '22:50', block_on: '03:00', sectors: 3, flight_minutes: 200, route: 'LIS-OPO-LIS' },
    ], O2);
    eqj('3 serviços: o bloco incerto sobe ao dia (não fica "dentro")', [t3.between.map((b) => b.kind), !!t3.psv.over, t3.psv.uncertain, (t3.psv.unknowns || []).includes('breakOrRest')], [['rest', 'either'], false, true, true]);
    // (2) Na leitura dos dois PSV, o "serviço precedente" do repouso é o PSV inteiro que vem antes — que pode já ser um
    // repartido (ORO.FTL.235(a)(1)). 00:10 → 05:00, 3 h em terra, 08:30 → 11:00 (alojamento adequado); 10 h; 21:30 → 23:00.
    // Leitura B: o 1.º PSV dura das 00:10 às 11:30 = 11:20; 10 h de repouso são menos do que isso → ilegal. Leitura A: um PSV de
    // 22:50 → excede. Ilegal nas duas: "excede".
    const tB = dayFtlFromDuties([
      { kind: 'flight', report_time: '00:10', block_off: '01:10', block_on: '05:00', sectors: 1, flight_minutes: 230, route: 'LIS-OPO-LIS' },
      { kind: 'flight', report_time: '08:30', block_off: '09:30', block_on: '11:00', sectors: 1, flight_minutes: 90, route: 'LIS-OPO-LIS', accommodation: true },
      { kind: 'flight', report_time: '21:30', block_off: '22:00', block_on: '23:00', sectors: 1, flight_minutes: 60, route: 'LIS-FNC' },
    ], O2);
    eqj('3 serviços: repouso de 10 h depois de um PSV repartido de 11:20 → ilegal nas duas leituras', [tB.between.map((b) => b.kind), tB.psv.result, tB.psv.over], [['split', 'either'], '22:50', true]);
    // ASSISTÊNCIA SEGUIDA DE VOO com 10 h ou mais entre o fim dela e a apresentação (2026-11-11, noite 10). Assistência em
    // casa 08:00–10:00 e voo com apresentação às 20:30 (10 h 30 depois), calços às 02:00: PSV 5:30.
    //  · leitura A: a assistência só acaba na apresentação (CS FTL.1.225(b)(5)) — 12 h 30 de assistência; o máximo reduz-se
    //    no que passa das 6 h (225(b)(7)): Quadro 2 às 20:30 = 11:00, menos 6:30 = 4:30 → excede 1:00;
    //  · leitura B: "If a minimum rest period as specified in ORO.FTL.235 is provided before reporting for the duty assigned
    //    during the standby, this time period should not count as standby duty" (GM1 CS FTL.1.225(b)) — com um repouso mínimo
    //    no meio (na base: 12 h, ou 10 h com alojamento adequado da companhia, 235(a)(2)) a assistência foram 2 h e o máximo
    //    são as 11:00 → dentro.
    // A app não sabe se houve esse repouso: incerto, com o que falta (`standbyRest`). (Antes: excede.)
    {
      const csT = fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8').replace(/\s+/g, ' ');
      eq('fonte: GM1 CS FTL.1.225(b) repouso mínimo antes da apresentação', csT.includes('If a minimum rest period as specified in ORO.FTL.235 is provided before reporting for the duty assigned during the standby, this time period should not count as standby duty.'), true);
      eq('fonte: CS FTL.1.225(b)(7) redução acima das 6 h', csT.includes('the maximum FDP is reduced by the amount of standby time exceeding 6 hours'), true);
      const sb = { kind: 'standby_home', report_time: '08:00', block_on: '10:00', sectors: 0, flight_minutes: 0, route: null };
      const fl = (rep, on) => ({ kind: 'flight', report_time: rep, block_off: '21:30', block_on: on, sectors: 2, flight_minutes: 200, route: 'LIS-OPO-LIS' });
      const e = dayFtlFromDuties([sb, fl('20:30', '02:00')], O2);
      eqj('assistência + voo a 10 h 30: incerto (excede numa leitura, dentro na outra)', [e.psv.result, e.psv.max, !!e.psv.over, e.psv.uncertain, (e.psv.unknowns || []).includes('standbyRest')], ['05:30', '04:30', false, true, true]);
      // O serviço do dia: a assistência em casa conta 25 % (CS FTL.1.225(b)(3)) — de 2 h (0:30) ou de 12 h 30 (3:08) — mais as
      // 6:00 do voo com o pós-voo: 6:30 certas, 9:08 possíveis.
      eqj('… serviço do dia: 6:30 certas, 9:08 possíveis', [e.servicoMin, e.servicoMaxMin], [390, 548]);
      // Um voo ANTES da assistência no mesmo dia não se junta a ela (a assistência em casa não é PSV): 00:30 → 07:30, depois
      // assistência 11:00–12:00, depois voo 22:15 → 23:50. Nas duas leituras está tudo dentro → sem dúvida.
      const e3 = dayFtlFromDuties([{ kind: 'flight', report_time: '00:30', block_off: '01:30', block_on: '07:30', sectors: 2, flight_minutes: 300, route: 'LIS-FNC-LIS' },
        { kind: 'standby_home', report_time: '11:00', block_on: '12:00', sectors: 0, flight_minutes: 0, route: null },
        { kind: 'flight', report_time: '22:15', block_off: '22:45', block_on: '23:50', sectors: 1, flight_minutes: 65, route: 'LIS-OPO' }], O2);
      eqj('voo + assistência + voo: dentro nas duas leituras, sem dúvida', [!!e3.psv.over, !!e3.psv.uncertain], [false, false]);
      // Com 9 h 30 (apresentação 19:30): não cabe nenhum repouso mínimo → a assistência conta até à apresentação, como sempre.
      const e9 = dayFtlFromDuties([sb, fl('19:30', '01:00')], O2);
      eqj('assistência + voo a 9 h 30: como antes (máximo 5:30, certo)', [e9.psv.result, e9.psv.max, !!e9.psv.over, !!e9.psv.uncertain], ['05:30', '05:30', false, false]);
      // Com 12 h 30 (apresentação 22:30): é um repouso mínimo na base → a assistência não se junta ao voo, como sempre.
      const e12 = dayFtlFromDuties([sb, fl('22:30', '04:00')], O2);
      eqj('assistência + voo a 12 h 30: repouso, como antes', [e12.between[0].kind, !!e12.psv.over, !!e12.psv.uncertain], ['rest', false, false]);
      // Com 10 h 30 e um voo curto, as duas leituras dão "dentro": não há dúvida a levantar.
      const eOk = dayFtlFromDuties([sb, fl('20:30', '23:30')], O2);
      eqj('assistência + voo curto a 10 h 30: dentro nas duas leituras', [eOk.psv.result, !!eOk.psv.over, !!eOk.psv.uncertain], ['03:00', false, false]);
    }
    // O repouso a seguir ao dia: como um PSV só, o serviço precedente são 17:25; como dois, o último (3:15) → o piso de 10 h
    // (o dia acaba no Funchal, fora da base). Com 13 h de repouso: incerto.
    const { restAround } = require(path.resolve('data/today.js'));
    const nx = { kind: 'flight', report_time: '11:25', block_off: '12:25', block_on: '14:10', sectors: 1, flight_minutes: 105, route: 'FNC-LIS' };
    const ra2 = restAround({ '2026-11-20': { ...s1, extra: [s2] }, '2026-11-21': nx }, (s, iso) => iso === '2026-11-20' && s.report_time === '05:00', { postFlightMin: 30, isPilot: true, base: 'LIS' }).after;
    eqj('repouso a seguir aos 2 serviços: 13 h → incerto (10:00 a 17:25)', [ra2.status, ra2.kind, ra2.actualMin, ra2.requiredMin, ra2.requiredHiMin], ['unc', 'breakOrRest', 780, 600, 1045]);
  }
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
  // Bloco 8b: com só uma sala numa pausa de 10 h, a FAQ EASA 47628 não dá extensão (garantido 13:00); a AESA dá +3:00
  // (possível 16:00). 17:00 passa os dois → excede pelo possível.
  eqj('Split ilegal: 13:00 (EASA) a 16:00 (AESA)', [splitBad.psv.max, splitBad.psv.maxHi], ['13:00', '16:00']);
  eqj('Split ilegal: falta a leitura da sala', splitBad.psv.unknowns, ['splitAccRule']);
  eq('Split ilegal: excede → over', splitBad.psv.over, true);
  eq('Split ilegal: excesso +01:00', splitBad.psv.excess, '01:00');
  // 2026-11-11 (noite 10): com 10 h entre os dois serviços a lei admite duas leituras (um PSV repartido, ou dois PSV com um
  // repouso — ORO.FTL.105(6)). O serviço para o ORO.FTL.210: como repartido o intervalo conta todo (220(b)) → 17 h; como dois
  // PSV → 4 h + 3 h = 7 h. Fica o certo (7 h) e o possível (17 h): um limite só "excede" com o certo. (Antes: 17 h, certas.)
  eqj('Split ilegal: serviço (210) → 7 h certas, 17 h possíveis', [splitBad.servico, splitBad.servicoMaxMin], [7, 1020]);
  eq('Split sem alojamento (dito): máx 13:00, excede 4:00', dayFtlFromDuties(splitPair('none')).psv.excess, '04:00');
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
  eq('Split das legs sem alojamento (dito): 13:00 → excede', dayFtlFromDuties([{ ...legDuty, accommodation: 'none' }]).psv.over, true);
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
  eqj('Split 8h só com sala: 13:00 (EASA) a 16:00 (AESA)', [dayFtlFromDuties(mk('basic'), {}).psv.max, dayFtlFromDuties(mk('basic'), {}).psv.maxHi], ['13:00', '16:00']);
  // 15:00 de PSV com sala: passa o garantido e não o possível → incerto (a app dava "dentro").
  const mk15 = [{ ...mk('basic')[0] }, { ...mk('basic')[1], block_on: '21:00' }];
  eqj('Split 8h só com sala, 15:00 → incerto', [dayFtlFromDuties(mk15, {}).psv.over, !!dayFtlFromDuties(mk15, {}).psv.uncertain], [false, true]);
  eq('Split 8h alojamento não adequado: 16:30 > 16:00 → over', dayFtlFromDuties(mk('basic'), {}).psv.over, true);
  eq('Split 8h SEM alojamento (dito): sem extensão (13:00)', dayFtlFromDuties(mk('none'), {}).psv.max, '13:00');
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

// ── A cauda do posicionamento noutro fuso (revisão de 2026-11-11): o período de serviço é tempo decorrido ──
// ORO.FTL.215(b): "O tempo gasto no posicionamento conta todo como período de serviço." LIS-OPO 07:00–08:00 (apresentação
// 06:00) e depois posicionamento OPO→PDL 08:30–10:00 de Ponta Delgada (11:00 de Lisboa): PSV 2 h + 3 h até à chegada = 5 h.
// Pelo relógio (08:00 → 10:00) davam 4 h.
{
  const tailD = { report_time: '06:00', block_off: '07:00', block_on: '08:00', signOff: '10:00', sectors: 1, flight_minutes: 60, route: 'LIS-OPO-PDL', kind: 'flight',
    legs: [{ dep: 'LIS', arr: 'OPO', off: '07:00', on: '08:00' }, { dep: 'OPO', arr: 'PDL', off: '08:30', on: '10:00', dh: true }] };
  const rT = ftl.ftlForDuty(tailD, { date: '2026-01-15', base: 'LIS', postFlightMin: 30 });
  eq('Cauda do DH noutro fuso: PSV 2:00 (só o setor operado)', rT.fdp.actualFdpMin, 120);
  eq('Cauda do DH noutro fuso: serviço 5:00 (tempo decorrido)', rT.dutyPeriodMin, 300);
  // No mesmo fuso não muda nada; e um sign-off escrito à mão (que não é a chegada do DH) fica pelo relógio.
  const same = ftl.ftlForDuty({ ...tailD, route: 'LIS-OPO-FAO', legs: [tailD.legs[0], { dep: 'OPO', arr: 'FAO', off: '08:30', on: '10:00', dh: true }] }, { date: '2026-01-15', base: 'LIS', postFlightMin: 30 });
  eq('Cauda do DH no mesmo fuso: 4:00', same.dutyPeriodMin, 240);
  eq('Sign-off à mão (não é a chegada do DH): o relógio', ftl.ftlForDuty({ ...tailD, signOff: '10:30' }, { date: '2026-01-15', base: 'LIS', postFlightMin: 30 }).dutyPeriodMin, 270);
}

// ── Resumo ──
// ─────────── As pernas de um serviço têm de formar UM PSV (achado no iPhone a 2026-11-11, "testar o calendário") ───────────
// Com a volta a sair ANTES de a ida chegar (17:30–20:35 e 19:50–21:30) o motor somava 24 h à pausa negativa (−45 min → 23 h 15)
// e dava "repartido", com o PSV máximo entre 11:15 e 22:37. A regra sai toda da lei (2026-11-11, o Nuno: "tem de ser como
// está na lei"), sem convenções da app:
//  · ORO.FTL.105(13) e (24): o setor vai do "primeiro movimento de uma aeronave" à "sua imobilização" — o mesmo tripulante não
//    começa um setor antes de o anterior acabar. Uma partida antes da chegada anterior são horas erradas.
//  · ORO.FTL.105(6): "Intervalo" é um período "durante um período de serviço de voo INFERIOR A UM PERÍODO DE REPOUSO". O
//    repouso mais curto que a lei admite é de 10 HORAS: longe da base (ORO.FTL.235(b)), na base com alojamento adequado
//    (235(a)(2)) e no repouso reduzido fora da base (CS FTL.1.235(c)(1)). Entre duas pernas, 10 h ou mais em terra já podem ser
//    um repouso: não são, de certeza, um intervalo do PSV — ou é um repouso (são dois serviços), ou as horas estão erradas. É
//    a regra com que a leitura do calendário já separa serviços (data/calendarParse.js, bloco 4 da auditoria). Entre as 10 h e
//    o repouso que se aplicaria ao caso (o serviço precedente, ou 12 h na base — 235(a)(1)) o texto admite duas leituras: a
//    app não escolhe — o PSV fica incerto. Uma "pausa" de 23 h 15 não é um intervalo em leitura nenhuma.
//  · CS FTL.1.220(a) e (c): só o intervalo em terra de 3 horas seguidas ou mais prolonga o máximo. Sem intervalo conhecido fica
//    o Quadro 2 (ORO.FTL.205(b)(1): apresentação 16:30–16:59, 1–2 setores → 11:15; 17:00–04:59 → 11:00).
//  · ORO.FTL.210: o serviço e o voo atribuídos contam TODOS para os limites — o dia não sai da conta por ter horas duvidosas:
//    entra, sem repartido, e o PSV fica "incerto" com o que falta (as horas certas das pernas).
// A pausa real pela meia-noite (chega 23:50, sai 00:30 = 40 min) é um intervalo e continua a contar-se.
{
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-pt.txt'), 'utf8'));
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  eq('fonte: ORO.FTL.105(13) tempo de voo', reg.includes('o tempo decorrido entre o primeiro movimento de saída de uma aeronave do lugar de estacionamento'), true);
  eq('fonte: ORO.FTL.105(24) setor', reg.includes('“Setor”: o segmento de um período de serviço de voo compreendido entre o primeiro movimento de uma aeronave para efeitos de descolagem e a sua imobilização'), true);
  eq('fonte: ORO.FTL.105(6) intervalo inferior a um repouso', reg.includes('“Intervalo”: período de tempo durante um período de serviço de voo inferior a um período de repouso'), true);
  eq('fonte: ORO.FTL.235(a)(1) 12 horas na base', reg.includes('deve ser pelo menos igual ao período de serviço precedente, ou de 12 horas'), true);
  eq('fonte: ORO.FTL.235(b) 10 horas longe da base', reg.includes('deve ser pelo menos igual ao período de serviço precedente, ou de 10 horas'), true);
  eq('fonte: ORO.FTL.235(a)(2) alojamento adequado na base → o mínimo de (b)', reg.includes('o repouso mínimo previsto na alínea b) aplica-se se o operador previr alojamento adequado para o tripulante na sua base de afetação'), true);
  eq('fonte: CS FTL.1.235(c)(1) repouso reduzido: 12 h na base, 10 h fora', cs.includes('The minimum reduced rest periods under reduced rest arrangements are 12 hours at home base and 10 hours out of base.'), true);
  eq('fonte: ORO.FTL.105(21) período de repouso', reg.includes('“Período de repouso”: período de tempo contínuo, ininterrupto e definido, antes ou depois de um serviço'), true);
  eq('fonte: CS FTL.1.220(c) até 50 % do intervalo', cs.includes('may be increased by up to 50 % of the break'), true);
  eq('fonte: Quadro 2, 05:00–05:14, 1–2 setores = 12:00', reg.includes('0500–0514 12:00'), true);
  eq('fonte: CS FTL.1.220(a) intervalo em terra de 3 h', cs.includes('The break on the ground within the FDP has a minimum duration of 3 consecutive hours.'), true);
  eq('fonte: Quadro 2, 16:30–16:59, 1–2 setores = 11:15', reg.includes('1630–1659 11:15'), true);
  eq('fonte: Quadro 2, 17:00–04:59, 1–2 setores = 11:00', reg.includes('1700–0459 11:00'), true);
  eq('fonte: ORO.FTL.210(a) as escalas atribuídas', reg.includes('As escalas de serviço que podem ser atribuídas aos tripulantes não podem ultrapassar'), true);
  eq('fonte: ORO.FTL.210(b) o tempo total de voo nos setores atribuídos', reg.includes('O tempo total de voo nos setores atribuídos aos tripulantes não pode ultrapassar'), true);
  const { splitFromLegs, legsBroken, ftlForDuty, dutyToFtlDay } = ftl;
  const L = (dep, arr, off, on, x = {}) => ({ dep, arr, off, on, ...x });
  const C = (date, report, x = {}) => ({ date, report, base: 'LIS', postFlightMin: 30, ...x });
  const split = (legs, c) => { const s = splitFromLegs(legs, c); return [s.splitBreakH, s.splitBreakStart, !!s.broken]; };
  const P = { base: 'LIS', isPilot: true, postFlightMin: 30 };

  // 1 · O caso do iPhone: LIS 17:30 → FNC 20:35, FNC 19:50 → LIS 21:30 (a volta sai 45 min antes de a ida chegar).
  const ov = [L('LIS', 'FNC', '17:30', '20:35'), L('FNC', 'LIS', '19:50', '21:30')];
  const dutyOv = { kind: 'flight', report_time: '16:30', block_off: '17:30', block_on: '21:30', sectors: 2, flight_minutes: 285, route: 'LIS-FNC-LIS', legs: ov };
  eq('sobrepostas: as pernas não formam um PSV', legsBroken(ov, C('2026-11-11', '16:30')), true);
  eqj('sobrepostas: sem repartido (antes: pausa de 23 h 15 desde as 20:35)', split(ov, C('2026-11-11', '16:30')), [0, null, true]);
  const dOv = ftlForDuty(dutyOv, { ...P, date: '2026-11-11' });
  // O máximo GARANTIDO é o do Quadro 2, 11:15. O máximo POSSÍVEL sai da lei e vale em todas as leituras: se as horas certas
  // tivessem um intervalo, ele cabia no PSV (5:00) e era inferior a 10 h; o máximo sobe até 50 % do intervalo menos os 30 min
  // de pré e pós-voo (CS FTL.1.220(b) e (c)): 11:15 + (5:00 − 0:30) / 2 = 13:30. (Antes: entre 11:15 e 22:37.)
  eqj('sobrepostas: PSV máximo garantido 11:15 (Quadro 2), possível 13:30', [dOv.fdp.maxFdpStr, dOv.fdp.maxHiStr], ['11:15', '13:30']);
  eqj('sobrepostas: o PSV fica incerto — faltam as horas certas das pernas', [dOv.fdp.over, dOv.fdp.uncertain, dOv.fdp.unknowns], [false, true, ['legTimes']]);
  // O dia CONTA (ORO.FTL.210): serviço das 16:30 às 21:30 + 30 min de pós-voo = 5:30; o voo é a soma das pernas (3:05 + 1:40 =
  // 4:45 — com a sobreposição conta a mais, nunca a menos: o lado conservador dos limites).
  const eOv = dutyToFtlDay(dutyOv, { ...P, date: '2026-11-11' });
  eqj('sobrepostas: o dia conta — serviço 5:30, voo 4:45, PSV incerto', [eOv.servicoMin, eOv.vooMin, eOv.psv.result, eOv.psv.max, eOv.psv.maxHi, eOv.psv.uncertain, eOv.psv.unknowns], [330, 285, '05:00', '11:15', '13:30', true, ['legTimes']]);
  // O mesmo com as horas Zulu do calendário (como a importação as grava), e só com o relógio (sem o dia nem os aeroportos).
  const ovZ = ov.map((l) => ({ ...l, offZ: l.off, onZ: l.on }));
  eqj('sobrepostas (com Zulu): igual', split(ovZ, C('2026-11-11', '16:30')), [0, null, true]);
  eqj('sobrepostas (só o relógio): igual', split(ov.map(({ off, on }) => ({ off, on })), { report: '16:30' }), [0, null, true]);

  // 2 · A pausa REAL que passa a meia-noite: chega 23:50, sai 00:30 = 40 min. É um intervalo; não chega a repartido (< 3 h).
  const mn = [L('LIS', 'OPO', '22:50', '23:50'), L('OPO', 'LIS', '00:30', '01:30')];
  eqj('meia-noite: 40 min de intervalo, sem repartido', split(mn, C('2026-11-11', '21:50')), [0, null, false]);
  const dMn = ftlForDuty({ kind: 'flight', report_time: '21:50', block_off: '22:50', block_on: '01:30', sectors: 2, flight_minutes: 120, route: 'LIS-OPO-LIS', legs: mn }, { ...P, date: '2026-11-11' });
  eqj('meia-noite: PSV 3:40 (21:50 → 01:30), máximo 11:00, certo', [dMn.fdp.actualFdpStr, dMn.fdp.maxFdpStr, !!dMn.fdp.uncertain, dMn.fdp.unknowns], ['03:40', '11:00', false, []]);
  // … e o repartido que passa a meia-noite: chega 19:00, sai 23:30 (4 h 30), volta a chegar às 00:30.
  eqj('repartido pela meia-noite: intervalo de 4 h 30 desde as 19:00', split([L('LIS', 'OPO', '18:00', '19:00'), L('OPO', 'LIS', '23:30', '00:30')], C('2026-11-11', '17:00')), [4.5, '19:00', false]);
  // … e o intervalo que ele próprio passa a meia-noite: chega 22:00, sai 02:00 = 4 h.
  eqj('intervalo pela meia-noite (22:00 → 02:00): repartido de 4 h', split([L('LIS', 'OPO', '21:00', '22:00'), L('OPO', 'LIS', '02:00', '03:00')], C('2026-11-11', '20:00')), [4, '22:00', false]);
  // … e o repartido de dia, como sempre: 06:40–08:15 e 15:00–16:40 → 6 h 45.
  eqj('repartido de dia: 6 h 45 desde as 08:15', split([L('LIS', 'FNC', '06:40', '08:15'), L('FNC', 'LIS', '15:00', '16:40')], C('2026-11-11', '05:40')), [6.75, '08:15', false]);

  // 3 · O INTERVALO É INFERIOR A UM REPOUSO (ORO.FTL.105(6) + 235). Apresentação 06:00, 07:00–08:00 e depois 11 h 30 em terra.
  // 11 h 30 ≥ 10 h, o repouso mais curto que a lei admite: já pode ser um repouso — fora da base (235(b)) e também na base
  // (235(a)(2), com alojamento adequado). Não é, de certeza, um intervalo: não se tira daqui um repartido e o PSV fica incerto.
  const away = [L('LIS', 'OPO', '07:00', '08:00'), L('OPO', 'LIS', '19:30', '20:30')];
  const home = [L('OPO', 'LIS', '07:00', '08:00'), L('LIS', 'OPO', '19:30', '20:30')];
  eqj('11 h 30 em terra fora da base: não é, de certeza, um intervalo', split(away, C('2026-10-20', '06:00')), [0, null, true]);
  eqj('11 h 30 em terra na base: também não (235(a)(2))', split(home, C('2026-10-20', '06:00')), [0, null, true]);
  eqj('… sem a base conhecida: igual', split(away, { date: '2026-10-20', report: '06:00' }), [0, null, true]);
  // A fronteira: 9 h 59 é um intervalo (inferior a qualquer repouso); 10 h 00 já não ("inferior a").
  eqj('9 h 59 em terra → intervalo', split([away[0], L('OPO', 'LIS', '17:59', '18:59')], C('2026-10-20', '06:00')), [599 / 60, '08:00', false]);
  eqj('10 h 00 em terra → não é, de certeza, um intervalo', split([away[0], L('OPO', 'LIS', '18:00', '19:00')], C('2026-10-20', '06:00')), [0, null, true]);
  // 10 h ou mais em terra podem ser dois serviços com um repouso no meio: o PSV nunca é "excede" (não há um PSV único em
  // todas as leituras). Apresentação 05:00, 06:00–08:00, 12 h em Faro, 20:00–23:30: 18:30 da apresentação aos últimos calços.
  const twoSvc = ftlForDuty({ kind: 'flight', report_time: '05:00', block_off: '06:00', block_on: '23:30', sectors: 2, flight_minutes: 330, route: 'LIS-FAO-LIS', legs: [L('LIS', 'FAO', '06:00', '08:00'), L('FAO', 'LIS', '20:00', '23:30')] }, { ...P, date: '2026-10-20' });
  eqj('12 h em terra: incerto, nunca excede', [twoSvc.fdp.actualFdpStr, twoSvc.fdp.over, twoSvc.fdp.uncertain, twoSvc.fdp.unknowns, twoSvc.legsBroken], ['18:30', false, true, ['legTimes'], 'rest']);

  // 4 · Outras horas que não batem certo. A partida uns minutos ANTES da chegada anterior (o PSV continua 13:00, acima):
  const tol = [L('LIS', 'FNC', '21:00', '22:45'), L('FNC', 'GRU', '22:40', '05:00')];
  eqj('5 min sobrepostos: sem pausa inventada (antes: 23 h 55)', split(tol, C('2026-07-10', '20:00')), [0, null, true]);
  // … a sobreposição grande (10:00–15:00 e 11:00–13:00): "20 h em terra" não é um intervalo.
  eqj('4 h sobrepostas: sem pausa inventada (antes: 20 h)', split([L('LIS', 'FNC', '10:00', '15:00'), L('FNC', 'LIS', '11:00', '13:00')], C('2026-11-11', '09:00')), [0, null, true]);
  // … o posicionamento do fim que sai antes de o último setor chegar (ORO.FTL.215: é serviço; as horas têm de bater).
  eq('posicionamento sobreposto no fim: não formam um PSV', legsBroken([L('LIS', 'FNC', '10:00', '12:00'), L('FNC', 'LIS', '11:30', '13:00', { dh: true })], C('2026-11-11', '09:00')), true);
  // … e uma pausa certa não se aproveita ao lado de horas erradas: sem repartido.
  eqj('pausa certa + sobreposição no mesmo serviço: sem repartido', split([L('LIS', 'OPO', '06:00', '07:00'), L('OPO', 'LIS', '11:00', '12:00'), L('LIS', 'FAO', '11:50', '12:40')], C('2026-11-11', '05:00')), [0, null, true]);

  // 5 · O que NÃO mexe. Longo curso para leste só com as horas locais (JFK 20:00 → LIS 07:45, LIS 09:45 → DXB 20:15): 2 h em
  // terra, um intervalo. Um posicionamento longo no fim (DH de 11 h 45): 30 min em terra antes dele. Uma perna só. Sem horas.
  eqj('longo curso para leste: 2 h em terra, tudo certo', split([L('JFK', 'LIS', '20:00', '07:45'), L('LIS', 'DXB', '09:45', '20:15')], C('2026-07-10', '19:00')), [0, null, false]);
  eqj('posicionamento longo no fim: tudo certo', split([L('LIS', 'TFS', '08:00', '12:30'), L('TFS', 'LIS', '13:30', '20:30'), L('LIS', 'GRU', '21:00', '04:45', { offZ: '20:00', onZ: '07:45', dh: true })], C('2026-10-20', '07:00')), [0, null, false]);
  eq('uma perna só: nunca', legsBroken([L('LIS', 'NRT', '08:00', '09:00')], C('2026-11-10', '06:45')), false);
  eq('sem pernas: nunca', legsBroken(null), false);
  eq('pernas sem horas: nunca (não se sabe)', legsBroken([L('LIS', 'OPO', null, null), L('OPO', 'LIS', null, null)], C('2026-11-10', '06:00')), false);

  // 6 · Acima do Quadro 2 (ORO.FTL.205(d)). Apresentação 07:00, 08:00–14:00 e 13:50–20:30 (sobrepostas), 2 setores: PSV 13:30
  // contra 13:00 do Quadro 2. Com as horas das pernas erradas não se sabe se o serviço cabia no prolongamento planeado (205(d))
  // ou num repartido (CS FTL.1.220): não viola a lei em TODAS as leituras, logo não é "excede" — é incerto, com o máximo
  // garantido (13:00) e o que falta. (Regra do Nuno, 2026-11-06: o mais restritivo não é a lei.)
  const ovExt = [L('LIS', 'TFS', '08:00', '14:00'), L('TFS', 'LIS', '13:50', '20:30')];
  const dayExt = { kind: 'flight', report_time: '07:00', block_off: '08:00', block_on: '20:30', sectors: 2, flight_minutes: 760, route: 'LIS-TFS-LIS', legs: ovExt,
    snap: { report_time: '07:00', block_off: '08:00', block_on: '20:30', sectors: 2, route: 'LIS-TFS-LIS', kind: 'flight', v: 2 } };
  const dExt2 = ftlForDuty(dayExt, { ...P, date: '2026-10-20', duties: { '2026-10-20': dayExt } });
  // O máximo possível: o do prolongamento planeado (14:00) ou o de um repartido — 13:00 + metade de (9:59 − 0:30) = 17:44.
  eqj('sobrepostas acima do Quadro 2: nem prolongamento nem "excede" — incerto, entre 13:00 e 17:44', [dExt2.extUsed, dExt2.fdp.maxFdpStr, dExt2.fdp.maxHiStr, dExt2.fdp.over, dExt2.fdp.uncertain, dExt2.fdp.unknowns, dExt2.legal, dExt2.legsBroken], [false, '13:00', '17:44', false, true, ['legTimes'], true, 'before']);
  // … mas acima do máximo possível é "excede" em qualquer leitura. Apresentação 05:00, 06:00–23:00 e 22:00–01:00 (a partida
  // antes da chegada: um PSV só, de 20:00). Quadro 2 às 05:00, 2 setores: 12:00; com o maior intervalo possível: 12:00 + 4:44.
  const dAbs = ftlForDuty({ kind: 'flight', report_time: '05:00', block_off: '06:00', block_on: '01:00', sectors: 2, flight_minutes: 1200, route: 'LIS-FNC-LIS', legs: [L('LIS', 'FNC', '06:00', '23:00'), L('FNC', 'LIS', '22:00', '01:00')] }, { ...P, date: '2026-10-20' });
  eqj('sobrepostas com PSV de 20:00: excede o máximo possível (16:44) em qualquer leitura', [dAbs.fdp.actualFdpStr, dAbs.fdp.maxFdpStr, dAbs.fdp.maxHiStr, dAbs.fdp.over, dAbs.fdp.excessStr, dAbs.fdp.unknowns], ['20:00', '12:00', '16:44', true, '03:16', ['legTimes']]);
  const eExt2 = dutyToFtlDay(dayExt, { ...P, date: '2026-10-20', duties: { '2026-10-20': dayExt } });
  eqj('… e no registo do dia: PSV 13:30 de 13:00, incerto, a contar 14:00 de serviço', [eExt2.psv.result, eExt2.psv.max, !!eExt2.psv.over, eExt2.psv.uncertain, eExt2.servicoMin], ['13:30', '13:00', false, true, 840]);
  // "Não mais do que duas vezes em cada período de 7 dias consecutivos" (ORO.FTL.205(d)(1)): se um dos dias anteriores tem as
  // horas das pernas erradas, não se sabe se foi um prolongamento. O 3.º não fica legal por causa disso, nem "excede": incerto,
  // entre o Quadro 2 (13:00) e o prolongamento (14:00), com o que falta (`extCount`).
  eq('fonte: 205(d)(1) duas vezes em 7 dias', reg.includes('duas vezes em cada período de 7 dias consecutivos'), true);
  const okExt = [L('LIS', 'TFS', '08:00', '12:30'), L('TFS', 'LIS', '13:30', '20:30')];
  const mkExt = (legs) => ({ ...dayExt, legs });
  const week = { '2026-10-18': mkExt(okExt), '2026-10-19': mkExt(ovExt), '2026-10-20': mkExt(okExt) };
  const d20 = ftlForDuty(week['2026-10-20'], { ...P, date: '2026-10-20', duties: week });
  eqj('2 em 7: com o dia 19 por saber, o do dia 20 pode ser o 3.º → incerto (13:00–14:00)', [d20.extRefused, d20.fdp.maxFdpStr, d20.fdp.maxHiStr, d20.fdp.over, d20.fdp.uncertain, d20.fdp.unknowns], [null, '13:00', '14:00', false, true, ['extCount']]);
  // … com dois prolongamentos CERTOS antes (17 e 18), o do dia 20 é o 3.º de certeza: recusado, com ou sem o dia 19.
  const d20c = ftlForDuty(week['2026-10-20'], { ...P, date: '2026-10-20', duties: { ...week, '2026-10-17': mkExt(okExt) } });
  eqj('2 em 7: dois certos antes → o 3.º é recusado', [d20c.extRefused, d20c.fdp.maxFdpStr, d20c.fdp.over], ['2in7', '13:00', true]);
  const d20b = ftlForDuty(week['2026-10-20'], { ...P, date: '2026-10-20', duties: { '2026-10-18': week['2026-10-18'], '2026-10-20': week['2026-10-20'] } });
  eqj('2 em 7: sem o dia 19, o do dia 20 é o 2.º → dentro (14:00)', [d20b.extRefused, d20b.fdp.maxFdpStr, d20b.fdp.over], [null, '14:00', false]);

  // 7 · A noite em que a hora atrasa (25/10/2026: em Genebra as 03:00 voltam a ser 02:00). Sem a Zulu, uma hora local dessa hora
  // repetida tem duas leituras: chegar a GVA às 02:48 e sair às 02:26 pode ser um intervalo de 38 min (chegada na 1.ª vez,
  // partida na 2.ª). Só se afirma a partida-antes-da-chegada que existe em TODAS as leituras.
  const rep2x = [L('MAD', 'OPO', '20:38', '21:18', { offZ: '18:38', onZ: '20:18' }), L('OPO', 'GVA', '22:34', '02:48'), L('GVA', 'FNC', '02:26', '05:04'), L('FNC', 'LIS', '05:38', '06:57', { offZ: '05:38', onZ: '06:57' })];
  eq('hora repetida: chega 02:48, sai 02:26 → não se afirma', legsBroken(rep2x, C('2026-10-24', '19:33')), false);
  // … mas chegar ao Porto à 01:13 (hora repetida) e sair às 00:37 (antes dela) é antes da chegada nas duas leituras.
  eq('hora repetida: antes da chegada em todas as leituras → não formam um PSV', legsBroken([L('MAD', 'LIS', '18:42', '22:30'), L('LIS', 'OPO', '00:28', '01:13'), L('OPO', 'FAO', '00:37', '03:41')], C('2026-10-24', '17:40')), true);
  // … e com a Zulu do calendário não há dúvida: 02:48 (01:48Z) e 02:26 (00:26Z).
  eq('hora repetida com Zulu: decide a Zulu', legsBroken([L('OPO', 'GVA', '22:34', '02:48', { offZ: '21:34', onZ: '01:48' }), L('GVA', 'FNC', '02:26', '05:04', { offZ: '00:26', onZ: '05:04' })], C('2026-10-24', '21:30')), true);
  // 7b · Verificação independente dos acertos (3.ª passagem): o máximo POSSÍVEL tem de contar com as outras dúvidas do serviço.
  // (a) Aclimatação por saber (1.º serviço da escala, fora da base): o máximo possível é o da leitura mais favorável do Quadro 1
  // também na variante do repartido. Base LIS, JFK-BOS-JFK, apresentação 13:00 local, alojamento adequado, PSV 16:30, sobrepostas.
  const dAc = { kind: 'flight', report_time: '13:00', block_off: '14:00', block_on: '05:30', sectors: 2, flight_minutes: 940, route: 'JFK-BOS-JFK', accommodation: true, legs: [L('JFK', 'BOS', '14:00', '15:30'), L('BOS', 'JFK', '15:20', '05:30')] };
  const rAc = ftlForDuty(dAc, { ...P, date: '2026-10-20', duties: { '2026-10-20': dAc } });
  const rAcSplit = ftlForDuty({ ...dAc, legs: [L('JFK', 'BOS', '14:00', '15:30'), L('BOS', 'JFK', '01:29', '05:30')] }, { ...P, date: '2026-10-20', duties: { '2026-10-20': dAc } });
  eqj('aclimatação por saber + sobrepostas: o possível é o do repartido de 9 h 59 na leitura mais favorável → incerto', [rAc.fdp.actualFdpStr, rAc.fdp.over, rAc.fdp.uncertain, rAc.fdp.maxHiStr === rAcSplit.fdp.maxHiStr, rAc.fdp.unknowns.includes('legTimes')], ['16:30', false, true, true, true]);
  // (b) A discrição do comandante declarada (ORO.FTL.205(f)) conta-se sobre o máximo possível, não sobre o garantido: declarar a
  // discrição não pode transformar um incerto em "excede". Apresentação 06:00, PSV 16:00, sobrepostas (possível 17:44).
  const dDi = { kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '22:00', sectors: 2, flight_minutes: 900, route: 'LIS-TFS-LIS', legs: [L('LIS', 'TFS', '07:00', '15:00'), L('TFS', 'LIS', '14:50', '22:00')] };
  const eDi = (sp) => dutyToFtlDay({ ...dDi, special: sp }, { ...P, date: '2026-10-20' }).psv;
  eqj('sobrepostas com e sem discrição declarada: incerto nos dois casos', [!!eDi(null).over, eDi(null).uncertain, !!eDi({ discretion: true }).over, eDi({ discretion: true }).uncertain], [false, true, false, true]);
  // (c) O prolongamento só é uma leitura possível se ainda couber nos "2 em 7 dias": com dois prolongamentos certos antes (17 e
  // 18) e sem alojamento (CS FTL.1.220(e)(1): o repartido não dá nada), nenhuma leitura torna legal um PSV de 13:30 → excede.
  const dNo = { ...dayExt, accommodation: 'none' };
  const rNo = ftlForDuty(dNo, { ...P, date: '2026-10-20', duties: { '2026-10-17': mkExt(okExt), '2026-10-18': mkExt(okExt), '2026-10-20': dNo } });
  eqj('sobrepostas, sem alojamento, 3.º prolongamento: excede 0:30 em qualquer leitura', [rNo.fdp.maxFdpStr, rNo.fdp.maxHiStr, rNo.fdp.over, rNo.fdp.excessStr], ['13:00', '13:00', true, '00:30']);
  const rNo2 = ftlForDuty(dNo, { ...P, date: '2026-10-20', duties: { '2026-10-20': dNo } });
  eqj('… sem prolongamentos antes: podia ser o prolongamento planeado → incerto até 14:00', [rNo2.fdp.maxHiStr, rNo2.fdp.over, rNo2.fdp.uncertain], ['14:00', false, true]);

  // 8 · O REPOUSO A SEGUIR (ORO.FTL.235 + 205(d)(1)) a um serviço cujas pernas não batem certo depende da leitura — e a app não
  // escolhe: "curto" só abaixo do mínimo de todas as leituras, "certo" só acima de todas, no meio incerto.
  {
    const { restAround, legalStatus } = require(path.resolve('data/today.js'));
    const next = (rep) => ({ kind: 'flight', report_time: rep, block_off: '12:00', block_on: '14:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO' });
    const after = (prev, rep) => restAround({ '2026-10-20': prev, '2026-10-21': next(rep) }, (s, iso) => iso === '2026-10-20', { postFlightMin: 30, isPilot: true, base: 'LIS' }).after;
    // (a) Sobrepostas acima do Quadro 2 que cabiam no prolongamento planeado: serviço 07:00 → 21:00 = 14:00. Sem prolongamento
    // o mínimo é 14:00; se foi um prolongamento, +4 h (205(d)(1)(ii)) = 18:00. Com 15 h de repouso: incerto.
    const r15 = after(dayExt, '12:00');
    eqj('repouso depois de sobrepostas que cabiam no prolongamento: 15 h → incerto (14:00 a 18:00)', [r15.status, r15.kind, r15.actualMin, r15.requiredMin, r15.requiredHiMin], ['unc', 'legTimes', 900, 840, 1080]);
    // 13 h (menos do que as 14:00 do serviço, mas pelo menos as 12 h do repouso reduzido, CS FTL.1.235(c)(1)): só é legal como
    // repouso reduzido → incerto (noite 10; antes "curto"). Com 11 h 30 é curto em qualquer leitura.
    eqj('… 13 h → só como repouso reduzido: incerto', [after(dayExt, '10:00').status, after(dayExt, '10:00').kind], ['unc', 'reducedRest']);
    eqj('… 11 h 30 → curto em qualquer leitura', after(dayExt, '08:30').status, 'bad');
    eqj('… 18 h → certo em qualquer leitura', after(dayExt, '15:00').status, 'ok');
    // (b) 12 h em terra a meio (podem ser dois serviços): como um serviço só são 05:00 → 00:00 = 19:00 de serviço; como dois, o
    // 2.º (apresentado antes das 20:00) é mais curto e vale o piso de 12 h. Com 13 h 30 de repouso: incerto.
    const two = { kind: 'flight', report_time: '05:00', block_off: '06:00', block_on: '23:30', sectors: 2, flight_minutes: 330, route: 'LIS-FAO-LIS', legs: [L('LIS', 'FAO', '06:00', '08:00'), L('FAO', 'LIS', '20:00', '23:30')] };
    const r2 = after(two, '13:30');
    eqj('repouso depois de 12 h em terra a meio: 13 h 30 → incerto (12:00 a 19:00)', [r2.status, r2.kind, r2.actualMin, r2.requiredMin, r2.requiredHiMin], ['unc', 'legTimes', 810, 720, 1140]);
    // (b2) O serviço seguinte SEM apresentação: "curto" só se nem o mínimo de todas as leituras cabe. O anterior acaba às 21:30
    // (06:00 → 21:00 + 30 min = 15:30 de serviço, com 11 h em terra a meio); o seguinte sai às 10:30 (13 h depois). Como um
    // serviço só o mínimo era 15:30; como dois, 12:00 → não é "curto" de certeza.
    const prevR = { kind: 'flight', report_time: '06:00', block_off: '07:00', block_on: '21:00', sectors: 2, flight_minutes: 180, route: 'LIS-FAO-LIS', legs: [L('LIS', 'FAO', '07:00', '08:00'), L('FAO', 'LIS', '19:00', '21:00')] };
    const noRep = { kind: 'flight', report_time: null, block_off: '10:30', block_on: '12:00', sectors: 1, flight_minutes: 90, route: 'LIS-OPO', legs: [L('LIS', 'OPO', '10:30', '12:00')] };
    const rNr = restAround({ '2026-10-20': prevR, '2026-10-21': noRep }, (s, iso) => iso === '2026-10-20', { postFlightMin: 30, isPilot: true, base: 'LIS' }).after;
    eqj('seguinte sem apresentação, depois de 11 h em terra a meio: 13 h não é "curto" de certeza', [rNr.status, rNr.actualMin], ['unc', 780]);
    // (c) As mesmas horas com as pernas certas (sem sobreposição): como sempre.
    const okDay = { ...dayExt, legs: okExt };
    eqj('repouso depois do mesmo serviço com as pernas certas (prolongamento): 15 h → curto, 18:00 exigidas', [after(okDay, '12:00').status, after(okDay, '12:00').requiredMin], ['bad', 1080]);
    // 9 · Um PSV incerto não esconde um limite do ORO.FTL.210 excedido de certeza: 70 h de serviço em 7 dias (máximo 60).
    const log = {}; for (let k = 14; k <= 20; k++) log['2026-10-' + k] = { servicoMin: 600, servico: 10, vooMin: 300, voo: 5 };
    const ls = legalStatus({ psv: { result: '05:00', max: '11:15', maxHi: '13:30', uncertain: true, unknowns: ['legTimes'] } }, log, new Date('2026-10-20T12:00:00'));
    eqj('PSV incerto + 70 h em 7 dias → excede o limite (não "incerto")', [ls.status, ls.kind], ['bad', 'limitOver']);
    const ls2 = legalStatus({ psv: { result: '05:00', max: '11:15', maxHi: '13:30', uncertain: true, unknowns: ['legTimes'] } }, { '2026-10-20': { servicoMin: 330, servico: 5.5, vooMin: 285, voo: 4.75 } }, new Date('2026-10-20T12:00:00'));
    eqj('PSV incerto sem limites excedidos → incerto', [ls2.status, ls2.kind], ['warn', 'psvUncertain']);
  }
  eq('versão do motor: 20', ftl.ENGINE_VERSION, 20);
}


// ─────────── O REPOUSO REDUZIDO (ORO.FTL.235(c) · CS FTL.1.235(c)) — 2026-11-11, noite 10 ───────────
// Um repouso abaixo do mínimo do ORO.FTL.235(a)/(b) (o serviço precedente, ou 12 h na base / 10 h fora) dava sempre "curto". A
// lei tem uma derrogação: "os planos que especificam os tempos de voo podem prever reduções dos períodos de repouso mínimos"
// (235(c)), com as condições da CS FTL.1.235(c): (1) mínimo de 12 h na base e 10 h fora; (2) "Reduced rest is used under
// fatigue risk management"; (3) o repouso seguinte aumenta pela diferença; (4) o PSV seguinte reduz-se pela diferença; (5) no
// máximo 2 entre recuperações. A app não sabe se a companhia tem repouso reduzido: entre o mínimo reduzido e o mínimo normal
// o repouso não é "curto" em todas as leituras — é incerto, com o que falta. Abaixo do mínimo reduzido, ou quando o PSV
// seguinte nem reduzido cabe, é "curto" em qualquer leitura.
{
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-pt.txt'), 'utf8'));
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  eq('fonte: ORO.FTL.235(c) repouso reduzido', reg.includes('os planos que especificam os tempos de voo podem prever reduções dos períodos de repouso mínimos'), true);
  eq('fonte: CS FTL.1.235(c)(1) 12 h na base e 10 h fora', cs.includes('The minimum reduced rest periods under reduced rest arrangements are 12 hours at home base and 10 hours out of base.'), true);
  eq('fonte: CS FTL.1.235(c)(2) com gestão do risco de fadiga', cs.includes('Reduced rest is used under fatigue risk management.'), true);
  eq('fonte: CS FTL.1.235(c)(3) o repouso seguinte aumenta pela diferença', cs.includes('The rest period following the reduced rest is extended by the difference between the minimum rest period specified in ORO.FTL.235(a) or (b) and the reduced rest.'), true);
  eq('fonte: CS FTL.1.235(c)(4) o PSV seguinte reduz-se pela diferença', cs.includes('The FDP following the reduced rest is reduced by the difference between the minimum rest period specified in ORO.FTL.235(a) or (b) as applicable and the reduced rest.'), true);
  const { restAround } = require(path.resolve('data/today.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: 1, flight_minutes: 60, route, ...x });
  const after = (duties) => restAround(duties, (s, iso) => iso === '2026-10-20', C).after;
  // NA BASE. Serviço de 13:00 (06:00 → 18:30 + 30 min): o mínimo normal são 13:00; o reduzido, 12:00.
  const long = F('06:00', '07:00', '18:30', 'LIS-OPO-LIS');
  const r1 = after({ '2026-10-20': long, '2026-10-21': F('07:30', '08:30', '10:00', 'LIS-OPO') });
  eqj('na base, 12 h 30 depois de 13:00 de serviço: só como repouso reduzido → incerto (diferença 0:30)', [r1.status, r1.kind, r1.actualMin, r1.requiredMin, r1.reducedFloorMin, r1.diffMin], ['unc', 'reducedRest', 750, 780, 720, 30]);
  const r2 = after({ '2026-10-20': long, '2026-10-21': F('06:45', '07:45', '09:00', 'LIS-OPO') });
  eqj('na base, 11 h 45: abaixo do mínimo reduzido (12 h) → curto', [r2.status, r2.actualMin, r2.requiredMin], ['bad', 705, 780]);
  // O PSV seguinte tem de caber reduzido pela diferença (CS 235(c)(4)): apresentação 07:30 → Quadro 2 = 13:00; menos 0:30 =
  // 12:30. Nenhum texto proíbe o prolongamento planeado depois de um repouso reduzido (só o repartido, ORO.FTL.220(c)): com ele
  // o máximo é 14:00 − 0:30 = 13:30 (2.ª revisão independente). Um PSV de 12:45 cabe nessa leitura → incerto; um de 13:45 não
  // cabe em nenhuma → curto.
  const r3 = after({ '2026-10-20': long, '2026-10-21': F('07:30', '08:30', '20:15', 'LIS-OPO') });
  eqj('… com o PSV seguinte de 12:45: cabe se foi um prolongamento planeado (13:30) → incerto', [r3.status, r3.kind], ['unc', 'reducedRest']);
  const r3b = after({ '2026-10-20': long, '2026-10-21': F('07:30', '08:30', '21:15', 'LIS-OPO') });
  eqj('… com o PSV seguinte de 13:45: nem reduzido nem com prolongamento → curto em qualquer leitura', [r3b.status, r3b.actualMin, r3b.requiredMin], ['bad', 750, 780]);
  const r4 = after({ '2026-10-20': long, '2026-10-21': F('07:30', '08:30', '20:00', 'LIS-OPO') });
  eqj('… com o PSV seguinte de 12:30: cabe → incerto', [r4.status, r4.kind], ['unc', 'reducedRest']);
  // "Após um repouso reduzido não pode ser prestado serviço de voo repartido" (ORO.FTL.220(c)): se o dia seguinte é um
  // repartido certo (4 h em terra entre dois serviços), nem como repouso reduzido é legal → curto.
  eq('fonte: ORO.FTL.220(c) sem repartido depois do repouso reduzido', reg.includes('Após um repouso reduzido não pode ser prestado serviço de voo repartido.'), true);
  const r4s = after({ '2026-10-20': long, '2026-10-21': { ...F('07:30', '08:30', '10:00', 'LIS-OPO-LIS'), extra: [F('14:30', '15:00', '16:00', 'LIS-OPO')] } });
  eqj('… com um repartido no dia seguinte: curto em qualquer leitura', [r4s.status, r4s.actualMin], ['bad', 750]);
  // Dois repousos reduzidos seguidos: o repouso a seguir a um reduzido AUMENTA pela diferença (CS 235(c)(3)) — não pode ser
  // outra vez reduzido. Dia 20: 13:00 de serviço depois de 12:30 de repouso (talvez reduzido); dia 21 às 09:00 = 12:30 outra
  // vez, abaixo das 13:00 normais e das 13:30 da leitura reduzida → curto nas duas.
  const dd2 = { '2026-10-19': long, '2026-10-20': F('07:30', '08:30', '20:00', 'LIS-OPO-LIS'), '2026-10-21': F('09:00', '10:00', '11:30', 'LIS-OPO') };
  const r8 = restAround(dd2, (s, iso) => iso === '2026-10-20', C);
  eqj('dois repousos abaixo do mínimo seguidos: o 2.º é curto em qualquer leitura', [r8.before.status, r8.before.kind, r8.after.status, r8.after.actualMin], ['unc', 'reducedRest', 'bad', 750]);
  // O serviço anterior SEM apresentação (só se sabe a saída e o fim: 07:00 → 19:00 + 30 min): com menos informação a app não
  // pode ser mais severa. 12:15 de repouso (≥ 10 h, o mínimo reduzido mais baixo) → incerto; 8 h 30 → curto.
  const noRepPrev = { kind: 'flight', report_time: null, block_off: '07:00', block_on: '19:00', sectors: 2, flight_minutes: 300, route: 'LIS-FNC-LIS' };
  const bef = (rep) => restAround({ '2026-10-20': noRepPrev, '2026-10-21': F(rep, '09:00', '10:30', 'LIS-OPO') }, (s, iso) => iso === '2026-10-21', C).before;
  eqj('anterior sem apresentação, 12:15 de repouso: incerto', [bef('07:45').status, bef('07:45').actualMin], ['unc', 735]);
  eqj('anterior sem apresentação, 8:30 de repouso: curto', [bef('04:00').status, bef('04:00').actualMin], ['bad', 510]);
  // FORA DA BASE. Serviço de 11:00 que acaba no Porto (06:00 → 16:30 + 30 min): mínimo normal 11:00, reduzido 10:00.
  const awayD = F('06:00', '07:00', '16:30', 'LIS-OPO');
  const r5 = after({ '2026-10-20': awayD, '2026-10-21': F('03:30', '04:30', '06:00', 'OPO-LIS') });
  eqj('fora, 10 h 30 depois de 11:00 de serviço: só como repouso reduzido → incerto', [r5.status, r5.kind, r5.actualMin, r5.requiredMin, r5.reducedFloorMin, r5.diffMin], ['unc', 'reducedRest', 630, 660, 600, 30]);
  const r6 = after({ '2026-10-20': awayD, '2026-10-21': F('02:45', '03:45', '05:00', 'OPO-LIS') });
  eqj('fora, 9 h 45: abaixo do mínimo reduzido (10 h) → curto', [r6.status, r6.actualMin], ['bad', 585]);
  // O REPOUSO SEGUINTE aumenta pela diferença (CS 235(c)(3)): depois do serviço que se seguiu a um repouso possivelmente
  // reduzido em 0:30, o mínimo normal (12:00) pode ser 12:30. Com 12 h 15: incerto.
  // (o serviço do dia 20 acaba às 10:30; o seguinte apresenta-se às 22:45 do mesmo dia)
  const d3 = { '2026-10-19': long, '2026-10-20': { ...F('07:30', '08:30', '10:00', 'LIS-OPO-LIS'), extra: [F('22:45', '23:45', '01:00', 'LIS-OPO')] } };
  const r7 = restAround(d3, (s, iso) => iso === '2026-10-20' && s.report_time === '07:30', C);
  eqj('o repouso antes foi (talvez) reduzido em 0:30 …', [r7.before.status, r7.before.kind, r7.before.diffMin], ['unc', 'reducedRest', 30]);
  eqj('… logo o seguinte: 12 h 15 → incerto, entre 12:00 e 12:30', [r7.after.status, r7.after.kind, r7.after.actualMin, r7.after.requiredMin, r7.after.requiredHiMin], ['unc', 'reducedRestAfter', 735, 720, 750]);
  eqj('13 h depois de 13:00 de serviço: certo', after({ '2026-10-20': long, '2026-10-21': F('08:00', '09:00', '10:30', 'LIS-OPO') }).status, 'ok');

  // DEPOIS DE UM PSV PROLONGADO (2026-11-12). "os períodos mínimos de repouso pré-voo e pós-voo devem ser aumentados de duas
  // horas, ou o período de repouso pós-voo deve ser aumentado de quatro horas" (ORO.FTL.205(d)(1)): o que aumenta é o
  // mínimo — e nada proíbe que esse mínimo seja o do repouso reduzido (só o repartido é proibido depois dele, 220(c)).
  // Prolongamento planeado: 07:00 → 20:30 (PSV 13:30, 2 setores) + 30 min = 14:00 de serviço; sem as +2 h antes, o repouso
  // a seguir leva +4 h: 18:00. Com repouso reduzido: 12:00 + 4:00 = 16:00. Entre 16:00 e 18:00 → incerto; abaixo → curto.
  eq('fonte: ORO.FTL.205(d)(1) os repousos mínimos aumentam', reg.includes('os períodos mínimos de repouso pré-voo e pós-voo devem ser aumentados de duas horas') && reg.includes('o período de repouso pós-voo deve ser aumentado de quatro horas'), true);
  const extDay = { kind: 'flight', report_time: '07:00', block_off: '08:00', block_on: '20:30', sectors: 2, flight_minutes: 690, route: 'LIS-TFS-LIS',
    legs: [{ dep: 'LIS', arr: 'TFS', off: '08:00', on: '12:30' }, { dep: 'TFS', arr: 'LIS', off: '13:30', on: '20:30' }],
    snap: { report_time: '07:00', block_off: '08:00', block_on: '20:30', sectors: 2, route: 'LIS-TFS-LIS', kind: 'flight', v: 2 } };
  const aE = (rep) => after({ '2026-10-20': extDay, '2026-10-21': F(rep, '14:30', '16:00', 'LIS-OPO') });
  eqj('depois do prolongamento, 17 h de repouso (exigido 18:00; reduzido 16:00): incerto', [aE('14:00').status, aE('14:00').kind, aE('14:00').actualMin, aE('14:00').requiredMin, aE('14:00').reducedFloorMin, aE('14:00').diffMin], ['unc', 'reducedRest', 1020, 1080, 960, 60]);
  eqj('… 15 h 30: abaixo do reduzido mais as 4 h → curto', [aE('12:30').status, aE('12:30').requiredMin], ['bad', 1080]);
  eqj('… 18 h: certo', aE('15:00').status, 'ok');

  // Revisão independente (noite 11). (1) O prolongamento não se perde com uma assistência em casa no fim do dia: PSV
  // prolongado 07:00 → 20:30 (14:00 de serviço), assistência em casa 21:30–23:00, e 15 h de repouso a seguir. O serviço
  // precedente é o voo (14:00) e o repouso leva as 4 h do prolongamento: 18:00 exigidas, 16:00 como reduzido → 15 h é curto.
  const extSb = { ...extDay, extra: [{ kind: 'standby_home', report_time: '21:30', block_on: '23:00', sectors: 0, flight_minutes: 0, route: null }] };
  const rSb = after({ '2026-10-20': extSb, '2026-10-21': F('14:00', '14:30', '16:00', 'LIS-OPO') });
  // (4.ª revisão: o mínimo de TODAS as leituras é o piso mais as 4 h — 16:00; as 18:00 são o da leitura mais exigente.)
  // (2026-11-12, a regra sem exceção: na leitura do piso o repouso depois da assistência são só as 12 h — as horas do
  // prolongamento eram do repouso logo a seguir ao voo. Entre as 12:00 e as 18:00 → incerto; antes "curto" abaixo das 16:00.)
  eqj('prolongamento + assistência em casa no mesmo dia: 15 h de repouso → incerto, entre 12:00 e 18:00', [rSb.status, rSb.kind, rSb.actualMin, rSb.requiredMin, rSb.requiredHiMin], ['unc', 'standbyHome', 900, 720, 1080]);
  // (2) Um repouso (talvez) reduzido depois de um prolongado também aumenta o repouso seguinte (CS 235(c)(3)) e não pode ser
  // seguido de outro reduzido. Prolongado (14:00 de serviço), 17 h de repouso (diferença 1:00), serviço curto, 12 h de repouso:
  // o mínimo fica entre 12:00 e 13:00 → incerto. Com um serviço de 13:00 e 12 h 30 a seguir: curto.
  const e2a = { '2026-10-19': extDay, '2026-10-20': { ...F('14:00', '14:30', '16:00', 'LIS-OPO-LIS') }, '2026-10-21': F('04:30', '05:30', '07:00', 'LIS-OPO') };
  const r2a = restAround(e2a, (s, iso) => iso === '2026-10-20', C);
  eqj('depois do prolongado: 17 h (talvez reduzido) e a seguir 12 h → incerto, entre 12:00 e 13:00', [r2a.before.status, r2a.before.diffMin, r2a.after.status, r2a.after.kind, r2a.after.requiredMin, r2a.after.requiredHiMin], ['unc', 60, 'unc', 'reducedRestAfter', 720, 780]);
  const e2b = { '2026-10-19': extDay, '2026-10-20': F('14:00', '15:00', '02:30', 'LIS-OPO-LIS'), '2026-10-21': F('15:30', '16:30', '18:00', 'LIS-OPO') };
  const r2b = restAround(e2b, (s, iso) => iso === '2026-10-20', C);
  eqj('… com 13:00 de serviço e 12 h 30 a seguir: o 2.º abaixo do mínimo seguido → curto', [r2b.before.status, r2b.after.status, r2b.after.actualMin], ['unc', 'bad', 750]);

  // NO MÁXIMO 2 REPOUSOS REDUZIDOS ENTRE RECUPERAÇÕES (CS FTL.1.235(c)(5)). Três repousos de 12 h 30 depois de serviços de
  // 13:00 (dias 19→20, 21→22 e 23→24), sem um repouso de recuperação (36 h com 2 noites locais, ORO.FTL.235(d)) pelo meio:
  // os dois primeiros só são legais como repouso reduzido (incerto); o 3.º não é legal em nenhuma leitura → curto.
  eq('fonte: CS FTL.1.235(c)(5) no máximo 2 entre recuperações', cs.includes('There is a maximum of 2 reduced rest periods between 2 recurrent extended recovery rest periods'), true);
  eq('fonte: ORO.FTL.235(d) recuperação de 36 h com 2 noites locais', reg.includes('é de 36 horas, incluindo 2 noites locais'), true);
  const short = (rep) => F(rep, '08:30', '09:00', 'LIS-OPO-LIS');   // acaba às 09:30
  const six = { '2026-10-19': long, '2026-10-20': short('07:30'), '2026-10-21': long, '2026-10-22': short('07:30'), '2026-10-23': long, '2026-10-24': short('07:30') };
  const bOf = (d, iso) => restAround(d, (s, i) => i === iso, C).before;
  eqj('1.º e 2.º repousos abaixo do mínimo: incertos (repouso reduzido)', [bOf(six, '2026-10-20').status, bOf(six, '2026-10-22').status, bOf(six, '2026-10-22').kind], ['unc', 'unc', 'reducedRest']);
  eqj('o 3.º sem recuperação pelo meio: curto em qualquer leitura', [bOf(six, '2026-10-24').status, bOf(six, '2026-10-24').actualMin, bOf(six, '2026-10-24').requiredMin], ['bad', 750, 780]);
  // Com um repouso de recuperação pelo meio (o dia 22 acaba às 09:30; o seguinte só a 25 às 06:00 = 68 h 30, com 2 noites), a
  // conta recomeça: o repouso de 25 → 26 volta a ser só o 1.º.
  const rec = { '2026-10-19': long, '2026-10-20': short('07:30'), '2026-10-21': long, '2026-10-22': short('07:30'), '2026-10-25': long, '2026-10-26': short('07:30') };
  eqj('… com uma recuperação pelo meio a conta recomeça: incerto', [bOf(rec, '2026-10-26').status, bOf(rec, '2026-10-26').kind], ['unc', 'reducedRest']);
  // RESERVA nesse intervalo (2.ª revisão independente, noite 11). O período de repouso é livre "de todas as tarefas, incluindo
  // os serviços de assistência e reserva" (ORO.FTL.105(21)): a reserva não é repouso, mas a recuperação só pede UM período de
  // 36 h com 2 noites locais (ORO.FTL.235(d)) — basta um troço contínuo antes ou depois dela.
  eq('fonte: ORO.FTL.105(21) o repouso exclui a reserva', reg.includes('libertado de todas as tarefas, incluindo os serviços de assistência e reserva'), true);
  const rsv = { kind: 'reserve', report_time: '08:00', block_on: '16:00' };
  // Reserva a 23 (08:00–16:00): depois dela ficam 38 h (até dia 25 às 06:00) com 2 noites → há recuperação → incerto.
  eqj('… com uma reserva a 23: depois dela ainda há 36 h com 2 noites → recuperação, incerto', bOf({ ...rec, '2026-10-23': rsv }, '2026-10-26').status, 'unc');
  // Reservas a 23 e a 24: os troços livres são de 22 h 30, 16 h e 14 h → nenhuma recuperação → o 3.º é curto.
  eqj('… com reserva a 23 e a 24: nenhum troço de 36 h → não há recuperação, curto', bOf({ ...rec, '2026-10-23': rsv, '2026-10-24': rsv }, '2026-10-26').status, 'bad');
  // Reserva sem horas a 24: não se sabe quando foi; se foi ao fim do dia há recuperação antes dela → não é curto de certeza.
  eqj('… com uma reserva sem horas a 24: pode haver recuperação antes dela → incerto', bOf({ ...rec, '2026-10-24': { kind: 'reserve' } }, '2026-10-26').status, 'unc');

  // (3.ª revisão independente.) Uma reserva que COMEÇA dentro do intervalo e só acaba depois de o serviço seguinte começar
  // (chamado a meio dela) corta o intervalo no início dela. Dias 9 a 15 de novembro: dois repousos de 12 h 30 (9→10, 11→12),
  // livre de 12 às 09:30 até 14 às 06:00 (44 h 30, 2 noites) e mais um de 12 h 30 (14→15). Com uma reserva a 14 das 04:00 às
  // 12:00 o troço livre acaba às 04:00: 42 h 30 com UMA noite local (a de 13 para 14 só tem 6 h) → não é recuperação → curto.
  const nov = { '2026-11-09': long, '2026-11-10': short('07:30'), '2026-11-11': long, '2026-11-12': short('07:30'), '2026-11-14': long, '2026-11-15': short('07:30') };
  eqj('novembro, com recuperação de 12 a 14: o 3.º repouso é incerto', bOf(nov, '2026-11-15').status, 'unc');
  eqj('… com uma reserva a 14 das 04:00 às 12:00: só 1 noite local livre → não é recuperação, curto', bOf({ ...nov, '2026-11-14': { ...long, extra: [{ kind: 'reserve', report_time: '04:00', block_on: '12:00' }] } }, '2026-11-15').status, 'bad');
  eqj('… com uma reserva a começar no minuto em que o serviço de 12 acaba (09:30–23:59): também corta → curto', bOf({ ...nov, '2026-11-12': { ...short('07:30'), extra: [{ kind: 'reserve', report_time: '09:30', block_on: '23:59' }] } }, '2026-11-15').status, 'bad');
  // Um SERVIÇO SEM APRESENTAÇÃO nesse intervalo também não é repouso: voo 10:00–12:00 a 13 → troços livres de 24 h 30 e 17 h 30.
  eqj('… com um voo sem apresentação a 13 (10:00–12:00): não há 36 h livres → curto', bOf({ ...nov, '2026-11-13': { kind: 'flight', report_time: null, block_off: '10:00', block_on: '12:00', sectors: 1, flight_minutes: 120, route: 'LIS-OPO' } }, '2026-11-15').status, 'bad');

  // O REPOUSO ANTES DE UM SERVIÇO QUE NÃO É PSV não é um repouso do ORO.FTL.235 ("antes de um PSV", 235(a)/(b)): não conta
  // como repouso reduzido — nem para os 2 entre recuperações, nem para aumentar o repouso seguinte.
  const off = (rep, end) => ({ kind: 'office', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const offs = { '2026-10-19': long, '2026-10-20': off('07:30', '09:30'), '2026-10-21': long, '2026-10-22': off('07:30', '09:30'), '2026-10-23': long, '2026-10-24': short('07:30') };
  eqj('12 h 30 antes de dois escritórios não são repousos reduzidos: o de 23 → 24 é o 1.º → incerto', [bOf(offs, '2026-10-24').status, bOf(offs, '2026-10-24').kind], ['unc', 'reducedRest']);
  const offB = { '2026-10-20': long, '2026-10-21': off('07:30', '20:30'), '2026-10-22': F('09:00', '10:00', '11:00', 'LIS-OPO') };
  eqj('voo, 12 h 30, escritório de 13 h, 12 h 30, voo: o repouso antes do voo é o 1.º abaixo do mínimo → incerto', [bOf(offB, '2026-10-22').status, bOf(offB, '2026-10-22').kind, bOf(offB, '2026-10-22').requiredMin], ['unc', 'reducedRest', 780]);
  const offC = { '2026-10-20': long, '2026-10-21': off('07:30', '17:00'), '2026-10-22': F('05:15', '06:15', '07:15', 'LIS-OPO') };
  eqj('… escritório de 9 h 30 e 12 h 15 a seguir: certo (12:00), sem aumento', [bOf(offC, '2026-10-22').status, bOf(offC, '2026-10-22').requiredMin], ['ok', 720]);

  // O REPOUSO ANTERIOR SÓ FOI REDUZIDO NUMA DAS LEITURAS (pernas com 13 h 50 em terra: um serviço de 19 h ou dois). Se foram
  // dois, as 13 h de repouso a seguir foram normais, e as 12 h 30 depois do serviço seguinte (13:00) podem ser o 1.º repouso
  // reduzido → incerto, não curto.
  const brk = { kind: 'flight', report_time: '05:00', block_off: '06:00', block_on: '23:30', sectors: 3, flight_minutes: 180, route: 'LIS-FAO-LIS-OPO',
    legs: [{ dep: 'LIS', arr: 'FAO', off: '06:00', on: '07:00' }, { dep: 'FAO', arr: 'LIS', off: '07:40', on: '08:40' }, { dep: 'LIS', arr: 'OPO', off: '22:30', on: '23:30' }] };
  const e3 = { '2026-10-19': brk, '2026-10-20': F('13:00', '14:00', '01:30', 'OPO-LIS'), '2026-10-21': F('14:30', '15:30', '17:00', 'LIS-OPO') };
  eqj('repouso anterior incerto (pernas) e este 12 h 30 depois de 13:00: incerto, não curto', [bOf(e3, '2026-10-20').status, bOf(e3, '2026-10-21').status, bOf(e3, '2026-10-21').kind, bOf(e3, '2026-10-21').actualMin], ['unc', 'unc', 'reducedRest', 750]);

  // DOIS PROLONGAMENTOS SEGUIDOS COM UMA ASSISTÊNCIA EM CASA À CABEÇA DO 2.º DIA: "os períodos de repouso adicionais pré e
  // pós-voo entre dois PSV com prolongamento … devem ser consecutivos" (ORO.FTL.205(d)(2)) — a assistência não esconde o 2.º.
  eq('fonte: ORO.FTL.205(d)(2) repousos adicionais consecutivos', /devem ser\s+consecutivos/.test(reg), true);
  const ext2 = { kind: 'flight', report_time: '14:00', block_off: '15:00', block_on: '02:45', sectors: 2, flight_minutes: 645, route: 'LIS-TFS-LIS',
    legs: [{ dep: 'LIS', arr: 'TFS', off: '15:00', on: '19:30' }, { dep: 'TFS', arr: 'LIS', off: '20:30', on: '02:45' }],
    snap: { report_time: '14:00', block_off: '15:00', block_on: '02:45', sectors: 2, route: 'LIS-TFS-LIS', kind: 'flight', v: 2 } };
  const e7 = { '2026-10-19': extDay, '2026-10-20': { kind: 'standby_home', report_time: '13:00', block_on: '13:30', sectors: 0, flight_minutes: 0, route: null, extra: [ext2] } };
  // (2026-11-12, verificação.) A assistência e o voo 30 min depois já não se juntam às cegas: sem chamada o repouso é curto
  // (0:30); com chamada o repouso é o de antes da assistência (16 h, com os repousos adicionais consecutivos: 18:00 → só como
  // repouso reduzido) → incerto, nunca "certo". (Antes lia-se sempre como chamada: `extOption` 'consecutive', 16:00.)
  const rE7 = restAround(e7, (s, i) => i === '2026-10-20' && s.report_time === '14:00', { postFlightMin: 30, isPilot: true, base: 'LIS' }).before;
  eqj('prolongado, 16 h, assistência em casa + prolongado 30 min depois: chamada ou repouso curto → incerto, não certo', [rE7.status, rE7.kind, rE7.actualMin], ['unc', 'standbyCall', 30]);

  // ASSISTÊNCIA EM CASA (sem chamada) ENTRE UM SERVIÇO E O PSV (4.ª revisão independente, noite 11). Os textos NÃO decidem:
  //   · o repouso antes do PSV só começa quando a assistência acaba (livre "de todas as tarefas, incluindo os serviços de
  //     assistência e reserva", ORO.FTL.105(21)) e é "a rest period in accordance with ORO.FTL.235" (CS FTL.1.225(b)(4));
  //   · o 235 mede-o pelo "período de serviço precedente" — e a assistência em casa não é período de serviço para o 235
  //     (só a do aeroporto, ORO.FTL.225(c); "does not count as duty for the purpose of rest", EASA FAQ 47630).
  // Leitura A: o serviço precedente é o último serviço verdadeiro (D) → max(D, piso), mais as horas do prolongamento.
  // Leitura B: a seguir à assistência não há serviço para medir → o piso (12 h na base, 10 h fora). Nenhum texto escolhe:
  // quem fixa "o período mínimo de repouso após um serviço de assistência que não conduz à atribuição de um PSV" é o esquema
  // da companhia (ORO.FTL.225(f)(3)). Regra da app: se DEPOIS de D já houve um repouso com o mínimo de D (antes da
  // assistência, ou entre duas), as duas leituras estão cumpridas e chega o piso; senão, entre o piso e o mínimo de D →
  // incerto; abaixo do piso → curto. Vale igual com a assistência no mesmo dia do serviço ou no dia seguinte.
  {
    const fq = (n) => fs.readFileSync(path.resolve(`fontes/easa/faq-${n}.txt`), 'utf8');
    eq('fonte: CS FTL.1.225(b)(4) a assistência é seguida de um repouso do 235', cs.includes('standby is followed by a rest period in accordance with ORO.FTL.235'), true);
    eq('fonte: ORO.FTL.225(f)(3) é o esquema da companhia que fixa o repouso depois da assistência sem PSV', reg.includes('O período mínimo de repouso após um serviço de assistência que não conduz à atribuição de um PSV'), true);
    eq('fonte: EASA FAQ 47630 a assistência em casa não conta como serviço para o repouso', fq(47630).includes('Other standby does not count as duty for the purpose of rest (it counts partly as duty for the purpose of ORO.FTL.210 only).'), true);
    eq('fonte: EASA FAQ 47610 sem requisitos para o tempo livre antes de um serviço sem PSV', fq(47610).includes('The Regulation does not contain requirements for off-duty periods prior to a duty without FDP.'), true);
    eq('fonte: EASA FAQ 47642 sem chamada, a assistência é seguida de um repouso do 235', fq(47642).includes('If no duty has been assigned during the rostered standby availability period, other-standby is followed by a rest period in accordance with ORO.FTL.235.'), true);
  }
  const sbD = (rep, end) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const d1 = (sb, rep, day0 = long) => bOf({ '2026-10-19': day0, '2026-10-20': sb, '2026-10-21': F(rep, '09:00', '10:00', 'LIS-OPO') }, '2026-10-21');
  const d1a = d1(sbD('07:00', '19:00'), '07:30');
  eqj('voo de 13:00, 12 h, assistência em casa, 12 h 30, voo: incerto, entre 12:00 e 13:00', [d1a.status, d1a.kind, d1a.actualMin, d1a.requiredMin, d1a.requiredHiMin], ['unc', 'standbyHome', 750, 720, 780]);
  eqj('… com 13 h depois da assistência: certo', d1(sbD('07:00', '19:00'), '08:00').status, 'ok');
  eqj('… com 11 h 30 depois da assistência: curto (abaixo do piso)', [d1(sbD('07:00', '19:00'), '06:30').status, d1(sbD('07:00', '19:00'), '06:30').requiredMin], ['bad', 720]);
  eqj('… com as 13 h do voo cumpridas ANTES da assistência: chega o piso (12:00)', [d1(sbD('08:00', '19:00'), '07:00').status, d1(sbD('08:00', '19:00'), '07:00').requiredMin], ['ok', 720]);
  // Duas assistências seguidas (dias 20 e 21), sem 13 h livres em lado nenhum desde o voo: o mesmo incerto.
  const two = bOf({ '2026-11-09': long, '2026-11-10': sbD('06:00', '18:00'), '2026-11-11': sbD('06:00', '18:00'), '2026-11-12': F('06:30', '07:30', '08:30', 'LIS-OPO') }, '2026-11-12');
  eqj('voo de 13:00, duas assistências em casa seguidas, 12 h 30: incerto, entre 12:00 e 13:00', [two.status, two.kind, two.requiredMin, two.requiredHiMin], ['unc', 'standbyHome', 720, 780]);
  // A assistência no MESMO dia do voo (20:00–23:30) ou depois da meia-noite (00:30–04:00): a lei não olha para a data.
  const sameD = bOf({ '2026-11-02': { ...long, extra: [sbD('20:00', '23:30')] }, '2026-11-03': F('12:00', '13:00', '14:00', 'LIS-OPO') }, '2026-11-03');
  const nextD = restAround({ '2026-11-02': long, '2026-11-03': { ...sbD('00:30', '04:00'), extra: [F('16:30', '17:30', '18:30', 'LIS-OPO')] } }, (s, i) => i === '2026-11-03' && s.kind === 'flight', C).before;
  eqj('assistência em casa no mesmo dia do voo, 12 h 30 a seguir: incerto, entre 12:00 e 13:00', [sameD.status, sameD.kind, sameD.actualMin, sameD.requiredMin, sameD.requiredHiMin], ['unc', 'standbyHome', 750, 720, 780]);
  eqj('… e com a assistência depois da meia-noite: o mesmo', [nextD.status, nextD.kind, nextD.actualMin, nextD.requiredMin, nextD.requiredHiMin], ['unc', 'standbyHome', 750, 720, 780]);
  // Depois de um PSV PROLONGADO o repouso pós-voo aumenta (ORO.FTL.205(d)(1), vinculativo) e uma assistência pelo meio não o
  // apaga: sem nenhum repouso de 16:00 (o piso mais as 4 h) desde o prolongado, 12 h depois da assistência são curtas em
  // qualquer leitura; com 17 h ficam entre as 16:00 (leitura B) e as 18:00 (leitura A) → incerto.
  const dx = (rep) => bOf({ '2026-11-02': extDay, '2026-11-03': sbD('08:00', '20:00'), '2026-11-04': F(rep, '14:00', '15:00', 'LIS-OPO') }, '2026-11-04');
  // (2026-11-12, a regra sem exceção: incerto entre o piso — 12:00 — e as 18:00 do voo; curto só abaixo das 12:00.)
  eqj('prolongado, 11 h, 12 h de assistência em casa, 12 h: incerto, entre 12:00 e 18:00 (antes: curto)', [dx('08:00').status, dx('08:00').kind, dx('08:00').requiredMin, dx('08:00').requiredHiMin], ['unc', 'standbyHome', 720, 1080]);
  eqj('… com 17 h depois da assistência: o mesmo incerto', [dx('13:00').status, dx('13:00').kind, dx('13:00').requiredMin, dx('13:00').requiredHiMin], ['unc', 'standbyHome', 720, 1080]);
  eqj('… com 11 h: curto (abaixo do piso)', [dx('07:00').status, dx('07:00').requiredMin], ['bad', 720]);
  // O SÍTIO do repouso de um bloco só de assistência é onde o último serviço deixou o tripulante: voo LIS-FNC, assistência no
  // hotel no dia seguinte, voo FNC-LIS 11 h depois → fora da base, 10:00 (ORO.FTL.235(b)) → certo.
  const hot = bOf({ '2026-11-02': F('06:00', '07:00', '08:30', 'LIS-FNC'), '2026-11-03': sbD('08:00', '14:00'), '2026-11-04': F('01:00', '02:00', '03:30', 'FNC-LIS') }, '2026-11-04');
  eqj('voo LIS-FNC, assistência no hotel no dia seguinte, 11 h, voo: certo, fora da base (10:00)', [hot.status, hot.place, hot.actualMin, hot.requiredMin], ['ok', 'away', 660, 600]);

  // O sítio do repouso é o do último serviço que não é assistência em casa (voo LIS-OPO + assistência no hotel = fora da base).
  const awaySb = restAround({ '2026-10-20': { ...F('06:00', '07:00', '08:00', 'LIS-OPO'), extra: [sbD('10:00', '12:00')] }, '2026-10-21': F('06:00', '07:00', '08:00', 'OPO-LIS') }, (s, iso) => iso === '2026-10-20', C).after;
  eqj('voo LIS-OPO + assistência no hotel: repouso fora da base (10:00)', [awaySb.place, awaySb.requiredMin], ['away', 600]);

  // UM SERVIÇO SEM APRESENTAÇÃO entre os dois (a 2.ª metade de um serviço partido em dois sem a hora dela): o Início e as
  // Estatísticas não podem saltá-lo. O fim dele sabe-se (calços 23:30 + 30 min = 00:00): 8 h até às 08:00 são curtas em
  // qualquer leitura (menos de 10 h); 11 h ficam incertas (não se sabe quanto durou o serviço).
  {
    const { restStatus } = require(path.resolve('data/today.js'));
    const half2 = { kind: 'flight', report_time: null, block_off: '22:30', block_on: '23:30', sectors: 1, flight_minutes: 60, route: 'LIS-OPO', legs: [{ dep: 'LIS', arr: 'OPO', off: '22:30', on: '23:30' }] };
    const d19 = { ...F('05:00', '06:00', '08:40', 'LIS-FAO-LIS'), extra: [half2] };
    const e6 = (rep) => ({ '2026-10-19': d19, '2026-10-20': F(rep, '12:00', '13:00', 'OPO-LIS') });
    const now = new Date(2026, 9, 20, 0, 30);
    const s8 = restStatus(e6('08:00'), '2026-10-20', now, C), s11 = restStatus(e6('11:00'), '2026-10-20', now, C);
    eqj('Início: serviço sem apresentação antes, 8 h de repouso → curto (mín. 10:00)', [s8.status, s8.actualMin, s8.requiredMin], ['bad', 480, 600]);
    eqj('Início: … 11 h → incerto (falta a apresentação)', [s11.status, s11.kind, s11.actualMin], ['warn', 'noReport', 660]);
    // (3.ª revisão independente.) O serviço sem apresentação é do MESMO DIA e acaba menos de 10 h antes: pode ser o mesmo
    // PSV (um intervalo, ORO.FTL.105(6); ou um posicionamento antes do voo, ORO.FTL.215(a)) — não há um repouso ali para
    // ser curto. Com menos informação a app não pode ser mais severa: incerto.
    const sameDay = { '2026-10-18': F('06:00', '07:00', '13:00', 'LIS-OPO-LIS'), '2026-10-19': { kind: 'flight', report_time: null, block_off: '07:00', block_on: '08:00', sectors: 1, flight_minutes: 60, route: 'LIS-OPO', extra: [F('11:30', '12:30', '13:30', 'OPO-LIS')] } };
    const sd = restStatus(sameDay, '2026-10-19', new Date(2026, 9, 19, 9, 0), C);
    eqj('Início: 1.ª metade do dia sem apresentação, 3 h antes da 2.ª → incerto, não curto', [sd.status, sd.kind], ['warn', 'noReport']);
    // (4.ª revisão.) … mas o repouso antes dele tem um teto: do fim do serviço da véspera (01:30) aos calços dele (07:00)
    // são 5 h 30 — abaixo das 10 h em qualquer leitura (um serviço à parte, ou a 1.ª metade do PSV seguinte) → curto.
    const tight = { '2026-11-18': F('20:00', '21:00', '01:00', 'LIS-OPO-LIS'), '2026-11-19': { kind: 'flight', report_time: null, block_off: '07:00', block_on: '08:00', sectors: 1, flight_minutes: 60, route: 'LIS-OPO', extra: [F('11:30', '12:30', '13:30', 'OPO-LIS')] } };
    const tg = restStatus(tight, '2026-11-19', new Date(2026, 10, 19, 9, 0), C);
    eqj('Início: … com só 5 h 30 entre o serviço da véspera e os calços dele → curto (10:00)', [tg.status, tg.actualMin, tg.requiredMin], ['bad', 330, 600]);
    const { yearStats } = require(path.resolve('data/stats.js'));
    const y8 = yearStats(e6('08:00'), { year: 2026, postFlightMin: 30, baseAt: 'LIS', isPilot: true, now: new Date('2026-12-31T12:00:00') });
    const y11 = yearStats(e6('11:00'), { year: 2026, postFlightMin: 30, baseAt: 'LIS', isPilot: true, now: new Date('2026-12-31T12:00:00') });
    eqj('Estatísticas: o mesmo — 1 curto; e 1 incerto com 11 h', [y8.reducedRests, y8.uncertainRests, y11.reducedRests, y11.uncertainRests], [1, 0, 0, 1]);
    // As Estatísticas usam o tipo de tripulante (o máximo do PSV seguinte depende dele): o mesmo veredicto do Início.
    const aug = { '2026-10-20': long, '2026-10-21': { ...F('07:30', '08:30', '22:00', 'LIS-GRU'), special: { augmented: { restClass: 1, additionalCrew: 1 } } } };
    const ia = bOf(aug, '2026-10-21').status;
    const ya = yearStats(aug, { year: 2026, postFlightMin: 30, baseAt: 'LIS', isPilot: true, now: new Date('2026-12-31T12:00:00') });
    eqj('Estatísticas com o tipo de tripulante: o veredicto do Início (PSV seguinte que não cabe reduzido → curto)', [ia, ya.reducedRests, ya.uncertainRests], ['bad', 1, 0]);
  }
  // As Estatísticas contam com o MESMO veredicto (2 incertos e 1 curto no cenário dos três repousos).
  {
    const { yearStats } = require(path.resolve('data/stats.js'));
    const ys = yearStats(six, { year: 2026, postFlightMin: 30, baseAt: 'LIS', now: new Date('2026-12-31T12:00:00') });
    eqj('Estatísticas: os três repousos → 1 curto e 2 incertos, como no Início', [ys.reducedRests, ys.uncertainRests], [1, 2]);
  }

  // A ASSISTÊNCIA EM CASA NÃO É "SERVIÇO PRECEDENTE" DO REPOUSO (2026-11-12). "Standby other than airport standby counts
  // (partly) as duty for the purpose of ORO.FTL.210 only" (GM1 CS FTL.1.225 (c)); e "standby is followed by a rest period in
  // accordance with ORO.FTL.235" (CS FTL.1.225(b)(4)). Depois de 14 h de assistência em casa (06:00–20:00) o repouso mínimo é
  // o piso — 12 h na base —, não as 14 h da assistência. A do aeroporto conta toda (ORO.FTL.225(c)).
  eq('fonte: GM1 CS FTL.1.225 (c) a assistência fora do aeroporto só conta para o 210', cs.includes('Standby other than airport standby counts (partly) as duty for the purpose of ORO.FTL.210 only.'), true);
  eq('fonte: ORO.FTL.225(c) a do aeroporto conta toda para o 210 e o 235', reg.includes('O serviço de assistência no aeroporto conta por inteiro como período de serviço para efeito das secções ORO.FTL.210 e ORO.FTL.235.'), true);
  const sbH = { kind: 'standby_home', report_time: '06:00', block_on: '20:00', sectors: 0, flight_minutes: 0, route: null };
  const aS = (sb, rep) => after({ '2026-10-20': sb, '2026-10-21': F(rep, '10:00', '11:30', 'LIS-OPO') });
  eqj('depois de 14 h de assistência em casa, 13 h de repouso: certo (mínimo 12 h; antes: curto, 14 h)', [aS(sbH, '09:00').status, aS(sbH, '09:00').actualMin, aS(sbH, '09:00').requiredMin], ['ok', 780, 720]);
  eqj('… 11 h de repouso: curto (12 h)', [aS(sbH, '07:00').status, aS(sbH, '07:00').requiredMin], ['bad', 720]);
  eqj('depois de 14 h de assistência no AEROPORTO, 13 h: só como repouso reduzido (o mínimo são as 14 h)', [aS({ ...sbH, kind: 'standby_airport' }, '09:00').status, aS({ ...sbH, kind: 'standby_airport' }, '09:00').requiredMin], ['unc', 840]);
  eqj('ftl: o mínimo depois da assistência em casa é o piso', [ftl.restAfterDuty(sbH, { inBase: true }).requiredMin, ftl.restAfterDuty({ ...sbH, kind: 'standby_airport' }, { inBase: true }).requiredMin], [720, 840]);
}

// ───────────────────────────── 5.ª REVISÃO INDEPENDENTE DO REPOUSO (2026-11-11, noite 12) ─────────────────────────────
// Os nove achados (E1 a E5, M1 a M4) e um décimo que apareceu ao corrigir (M5). Cada caso é um cenário corrido na revisão.
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-en.txt'), 'utf8'));
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  const { restAround, restStatus, restUntilAfter } = require(path.resolve('data/today.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const N = (off, on, route) => F(null, off, on, route);   // sem hora de apresentação
  const sbD = (rep, end) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin];
  const at = (iso, hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };

  // As fontes: o que liga cada mínimo ao SEU voo ou à SUA rotação (uma assistência pelo meio não o apaga) e o repouso ser um só.
  eq('fonte: ORO.FTL.105(21) o repouso é contínuo e livre de assistência e reserva', reg.includes('“rest period” means a continuous, uninterrupted and defined period of time, following duty or prior to duty, during which a crew member is free of all duties, standby and reserve'), true);
  eq('fonte: CS FTL.1.235(b)(3)(ii) 14 h a seguir a ESSE PSV com 4 h de fuso', cs.includes('the minimum rest following that FDP is at least as long as the preceding duty period, or 14 hours, whichever is greater'), true);
  eq('fonte: CS FTL.1.205(c)(6) 14 h no destino depois do repouso a bordo', cs.includes('The minimum rest at destination is at least as long as the preceding duty period, or 14 hours, whichever is greater.'), true);
  eq('fonte: CS FTL.1.235(b)(3)(i) noites locais NA BASE depois de uma rotação com 4 h de fuso', cs.includes('At home base, if a rotation involves a 4 hour time difference or more, the minimum rest is as specified in the following table.'), true);
  eq('fonte: ORO.FTL.205(d)(2) prolongamentos em PSV consecutivos', reg.includes('When extensions are used for consecutive FDPs, the additional pre- and post-flight rest between the two extended FDPs required under subparagraph 1 shall be provided consecutively.'), true);

  // ── E1 · A assistência no hotel está onde o último serviço deixou o tripulante — em TODO o lado, não só no piso. ──
  const out = { kind: 'flight', report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  const backSame = (rep, off, on) => ({ kind: 'flight', report_time: rep, block_on: on, sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off, on }] });
  // (a) Noites locais "na base" não se pedem num hotel. LIS→EWR (fim 19:30, −5 h: piso de 14 h), assistência no hotel 00:30–02:00.
  const hotelN = (rep) => befOf({ '2026-01-10': out, '2026-01-11': { ...sbD('00:30', '02:00'), extra: [backSame(rep, '17:00', '23:00')] } }, '2026-01-11', rep);
  eqj('E1: fuso + assistência no hotel + 14 h: certo, fora da base, sem noites locais', [hotelN('16:00').status, hotelN('16:00').place, hotelN('16:00').nightsRequired, hotelN('16:00').requiredMin], ['ok', 'away', null, 840]);
  const ruH = restUntilAfter({ '2026-01-10': out, '2026-01-11': sbD('12:00', '14:00') }, '2026-01-11', C);
  eqj('E1: "Repouso até" depois da assistência no hotel (16 h 30 livres antes dela): 10 h, sem noites', [ruH.requiredMin, ruH.nightsRequired, new Date(ruH.untilMs).getHours(), new Date(ruH.untilMs).getDate()], [600, null, 0, 12]);
  // (b) Juntar serviços do mesmo dia: fora da base o repouso mínimo são 10 h — com 10 h 30 entre a assistência e o voo não há
  // "chamada"; é o mesmo caso da assistência na véspera às 23:00.
  const awayLong = F('08:30', '09:30', '21:00', 'LIS-FNC');   // 13:00 de serviço, fica no Funchal
  const j1 = befOf({ '2026-11-02': awayLong, '2026-11-03': { ...sbD('00:30', '01:00'), extra: [F('11:30', '12:30', '14:00', 'FNC-LIS')] } }, '2026-11-03', '11:30');
  const j0 = befOf({ '2026-11-02': { ...awayLong, extra: [sbD('23:00', '23:30')] }, '2026-11-03': F('10:00', '11:00', '12:30', 'FNC-LIS') }, '2026-11-03', '10:00');
  eqj('E1: fora da base, assistência no hotel de madrugada e voo 10 h 30 depois: incerto 10:00–13:00', [...v(j1), j1.place], ['unc', 'standbyHome', 630, 600, 780, 'away']);
  eqj('E1: … igual com a assistência antes da meia-noite', v(j0), v(j1));

  // (c) O mesmo para qualquer serviço EM TERRA sem rota (formação, escritório, assistência no aeroporto): não move o tripulante.
  // LIS→EWR, formação no dia seguinte (sem rota), voo de volta 12 h 30 depois: fora da base, sem noites locais "na base".
  const trn = { kind: 'training', report_time: '14:00', block_on: '18:00', sectors: 0 };
  const g1 = befOf({ '2026-01-10': out, '2026-01-11': trn, '2026-01-12': backSame('06:30', '07:30', '14:00') }, '2026-01-12');
  eqj('E1: fuso + formação sem rota no destino + 12 h 30: certo, fora da base (10:00), sem noites locais', [g1.status, g1.place, g1.nightsRequired, g1.requiredMin], ['ok', 'away', null, 600]);
  // Um VOO sem rota não se sabe onde acaba: a formação a seguir fica com o valor por omissão (na base), como antes.
  const g2 = befOf({ '2026-01-10': F('08:00', '09:00', '10:30', 'LIS-FNC'), '2026-01-11': { kind: 'flight', report_time: '10:00', block_on: '12:00', sectors: 1 }, '2026-01-12': { ...trn, report_time: '08:00', block_on: '10:00' }, '2026-01-13': F('08:00', '09:00', '10:00', 'LIS-OPO') }, '2026-01-13');
  eqj('E1: … depois de um voo sem rota o sítio não se sabe: fica na base (12:00)', [g2.status, g2.place, g2.requiredMin], ['ok', 'base', 720]);

  // ── E2 · Os pisos de 14 h são desse PSV: uma assistência depois da meia-noite não os apaga. ──
  const augX = { special: { augmented: { restClass: 1, additionalCrew: 1 } } };
  const aug = F('07:30', '08:30', '20:00', 'LIS-FNC', augX);   // 13:00 de serviço, repouso a bordo → 14:00
  const a2same = befOf({ '2026-01-10': { ...aug, extra: [sbD('21:00', '22:00')] }, '2026-01-11': F('10:00', '11:00', '12:30', 'FNC-LIS') }, '2026-01-11');
  const a2next = (rep) => befOf({ '2026-01-10': aug, '2026-01-11': { ...sbD('00:30', '01:30'), extra: [F(rep, '16:30', '18:00', 'FNC-LIS')] } }, '2026-01-11', rep);
  // (2026-11-12, a regra sem exceção: antes "curto (14:00)"; na leitura do piso são as 10 h de fora da base → incerto.)
  eqj('E2: repouso a bordo + assistência no hotel no mesmo dia, 12 h: incerto entre 10:00 e 14:00', v(a2same), ['unc', 'standbyHome', 720, 600, 840]);
  eqj('E2: … com a assistência depois da meia-noite, 12 h: o mesmo', v(a2next('13:30')), ['unc', 'standbyHome', 720, 600, 840]);
  eqj('E2: … com 9 h 30 (menos do que as 10 h de fora da base; e só 4 h antes da assistência): curto nas duas leituras', a2next('11:00').status, 'bad');
  eqj('E2: … com 14 h: certo', a2next('15:30').status, 'ok');
  // Serviço de 15 h com repouso a bordo + assistência no mesmo dia: leitura A, as 15 h; leitura B, o piso de 14 h → incerto.
  const aug15 = F('05:30', '06:30', '20:00', 'LIS-FNC', augX);
  const a15 = befOf({ '2026-01-10': { ...aug15, extra: [sbD('21:00', '22:00')] }, '2026-01-11': F('12:30', '13:30', '15:00', 'FNC-LIS') }, '2026-01-11');
  eqj('E2: 15 h de serviço com repouso a bordo + assistência, 14 h 30: incerto 10:00–15:00', v(a15), ['unc', 'standbyHome', 870, 600, 900]);
  // O fuso (CS FTL.1.235(b)(3)(ii)) pelo mesmo caminho: LIS→EWR, assistência no hotel 5 h depois, voo 12 h depois dela.
  eqj('E2: fuso de 5 h + assistência no hotel depois da meia-noite, 12 h: incerto 10:00–14:00, sem noites locais', [hotelN('14:00').status, hotelN('14:00').requiredMin, hotelN('14:00').requiredHiMin, hotelN('14:00').nightsRequired], ['unc', 600, 840, null]);

  // ── E3 · Um serviço SEM apresentação antes da assistência não se esquece. ──
  const noRep = N('06:00', '20:00', 'LIS-FNC-LIS');   // 14 h 30 à vista (calços + pós-voo); acaba na base
  const e3 = (rep) => befOf({ '2026-10-18': noRep, '2026-10-19': sbD('10:00', '14:00'), '2026-10-20': F(rep, '07:00', '08:00', 'LIS-OPO') }, '2026-10-20');
  eqj('E3: sem apresentação | assistência | 12 h: incerto (falta a apresentação), não certo', [e3('02:00').status, e3('02:00').kind, e3('02:00').actualMin, e3('02:00').estIso], ['unc', 'noReport', 720, '2026-10-18']);
  // (2026-11-12, revisão independente.) São 15 h do início da assistência à apresentação: pode ter sido uma chamada, e então
  // o repouso é o de antes da assistência (depois de um serviço sem apresentação: não se sabe) → incerto. Antes: "curto".
  eqj('E3: … 11 h depois da assistência, na base: incerto — chamada ou repouso curto', [e3('01:00').status, e3('01:00').kind, e3('01:00').requiredMin], ['unc', 'standbyCall', 720]);
  {
    const rs = restStatus({ '2026-10-18': noRep, '2026-10-19': sbD('10:00', '14:00'), '2026-10-20': F('02:00', '07:00', '08:00', 'LIS-OPO') }, '2026-10-20', at('2026-10-20', '01:00'), C);
    eqj('E3: o Início diz o mesmo', [rs.status, rs.kind, rs.actualMin], ['warn', 'noReport', 720]);
  }
  // O sítio: LIS→FNC sem apresentação, assistência no hotel, voo 11 h depois → fora da base (10 h): não é curto.
  const e3b = (sbEnd) => befOf({ '2026-11-02': N('07:00', '08:30', 'LIS-FNC'), '2026-11-03': sbD('08:00', sbEnd), '2026-11-04': F('01:00', '02:00', '03:30', 'FNC-LIS') }, '2026-11-04');
  eqj('E3: LIS→FNC sem apresentação | assistência no hotel | 11 h: incerto (antes: "curto, 12:00 base")', [e3b('14:00').status, e3b('14:00').kind, e3b('14:00').actualMin], ['unc', 'noReport', 660]);
  eqj('E3: … 9 h 30: curto (10:00, fora da base)', [e3b('15:30').status, e3b('15:30').requiredMin], ['bad', 600]);

  // … e com o serviço sem apresentação ENTRE duas assistências (voo | assistência | sem apresentação | assistência | voo).
  const e3c = befOf({ '2026-10-16': F('08:00', '09:00', '12:00', 'LIS-OPO-LIS'), '2026-10-17': sbD('10:00', '12:00'), '2026-10-18': noRep, '2026-10-19': sbD('10:00', '14:00'), '2026-10-20': F('02:00', '07:00', '08:00', 'LIS-OPO') }, '2026-10-20');
  eqj('E3: … entre duas assistências: o mesmo incerto', [e3c.status, e3c.kind, e3c.estIso], ['unc', 'noReport', '2026-10-18']);

  // ── E4 · O "Repouso até" num dia só de assistência não pode acabar antes de o "Tenho descanso?" deixar de dizer "Não". ──
  const ext = { kind: 'flight', report_time: '07:00', block_on: '20:30', sectors: 1 };   // prolongado; 14:00 de serviço; sem serviço antes → +4 h = 18:00
  const u1 = restUntilAfter({ '2026-11-02': ext, '2026-11-03': sbD('08:00', '20:00') }, '2026-11-03', C);
  eqj('E4: prolongado, 11 h, assistência: "Repouso até" pelas 18:00 da leitura que pede mais (certo: 16:00), incerto', [u1.requiredMin, u1.requiredLoMin, !!u1.uncertain, new Date(u1.untilMs).getHours()], [1080, 720, true, 14]);
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');   // 05:00 → 18:00 = 13:00 de serviço
  const u2 = restUntilAfter({ '2026-11-02': long5, '2026-11-03': sbD('06:00', '18:00') }, '2026-11-03', C);
  const u3 = restUntilAfter({ '2026-11-02': { ...long5, extra: [sbD('19:00', '22:00')] } }, '2026-11-02', C);
  eqj('E4: 13 h de serviço, 12 h, assistência no dia seguinte: 13:00 (certo: 12:00), como com a assistência no mesmo dia', [u2.requiredMin, u2.requiredLoMin, !!u2.uncertain, u3.requiredMin, u3.requiredLoMin, !!u3.uncertain], [780, 720, true, 780, 720, true]);
  const u4 = restUntilAfter({ '2026-11-02': long5, '2026-11-03': sbD('08:00', '18:00') }, '2026-11-03', C);
  eqj('E4: com as 13 h cumpridas antes da assistência: 12:00, sem dúvida', [u4.requiredMin, !!u4.uncertain], [720, false]);
  const n1 = restAround({ '2026-11-02': ext, '2026-11-03': sbD('08:00', '20:00') }, (s, i) => i === '2026-11-03', C).need;
  eqj('E4: a Simulação mostra o mesmo mínimo', [n1.requiredMin, n1.requiredLoMin, !!n1.uncertain], [1080, 720, true]);

  // ── E5 · As noites locais na base depois de uma rotação com fuso não se perdem com uma assistência em casa pelo meio. ──
  const back = { kind: 'flight', report_time: '23:00', block_on: '07:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '00:00', on: '07:00', offZ: '00:00', onZ: '07:00' }] };
  const local = (rep, end) => ({ kind: 'flight', report_time: rep, block_on: end, sectors: 2, legs: [{ dep: 'LIS', arr: 'OPO', off: rep, on: end }] });
  const n5 = (sbIso, flIso) => befOf({ '2026-01-10': out, '2026-01-12': back, [sbIso]: sbD('12:00', '20:00'), [flIso]: local('08:00', '12:00') }, flIso);
  // (2026-11-12, a regra sem exceção: a lei não diz se as noites ainda se pedem ao repouso DEPOIS da assistência → incerto.)
  eqj('E5: regresso a 13/1 07:30, assistência em casa a 13/1, voo a 14/1: 1 de 2 noites → incerto (antes do ramo: "Sim")', [n5('2026-01-13', '2026-01-14').status, n5('2026-01-13', '2026-01-14').kind, n5('2026-01-13', '2026-01-14').nightsRequired, n5('2026-01-13', '2026-01-14').nightsActual], ['unc', 'rotationNights', 2, 1]);
  eqj('E5: … assistência a 14/1, voo a 15/1 (1 noite antes, 1 depois — nunca 2 no mesmo repouso): incerto', [n5('2026-01-14', '2026-01-15').status, n5('2026-01-14', '2026-01-15').nightsRequired], ['unc', 2]);
  eqj('E5: … assistência a 15/1, voo a 16/1 (2 noites antes da assistência): certo', [n5('2026-01-15', '2026-01-16').status, n5('2026-01-15', '2026-01-16').nightsRequired], ['ok', null]);
  const ru5 = restUntilAfter({ '2026-01-10': out, '2026-01-12': back, '2026-01-13': sbD('12:00', '20:00') }, '2026-01-13', C);
  eqj('E5: "Repouso até" depois dessa assistência: entre as 12 h (14/1 às 08:00) e as 2 noites (15/1 às 06:00)', [ru5.nightsRequired, !!ru5.uncertain, new Date(ru5.untilLoMs).getDate(), new Date(ru5.untilLoMs).getHours(), new Date(ru5.untilHiMs).getDate(), new Date(ru5.untilHiMs).getHours()], [2, true, 14, 8, 15, 6]);

  // A rotação ACABA num regresso à base sem apresentação (fora da linha do repouso, mas o sítio dele sabe-se): os voos
  // seguintes já não são dessa rotação e não herdam as noites dela. LIS→EWR a 10/1, regresso sem apresentação a 13/1 (07:00),
  // voo local a 15/1 e outro a 16/1 → sem noites locais a pedir (antes: contadas desde o voo local).
  const backNoRep = { kind: 'flight', report_time: null, block_off: '00:00', block_on: '07:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '00:00', on: '07:00' }] };
  const n6 = befOf({ '2026-01-10': out, '2026-01-13': backNoRep, '2026-01-15': F('08:00', '09:00', '12:00', 'LIS-FAO-LIS'), '2026-01-16': local('08:00', '12:00') }, '2026-01-16');
  eqj('E5: rotação fechada por um regresso sem apresentação: os voos seguintes não herdam as noites', [n6.status, n6.nightsRequired], ['ok', null]);

  // ── M1 · Prolongado a seguir a um dia só de assistência: as +2 h só são certas se o repouso antes as teve nas duas leituras. ──
  const m1 = (rep) => befOf({ '2026-01-10': long5, '2026-01-11': sbD('06:00', '16:30'), '2026-01-12': ext, '2026-01-13': F(rep, '18:00', '19:00', 'LIS-OPO') }, '2026-01-13');
  eqj('M1: 13 h | 12 h | assistência | 14 h 30 | prolongado | 16 h: incerto 16:00–18:00', v(m1('13:00')), ['unc', 'extAfterStandby', 960, 960, 1080]);
  eqj('M1: … 18 h: certo', m1('15:00').status, 'ok');
  eqj('M1: … 15 h: só como repouso reduzido (12:00 + 2:00 na leitura das +2 h)', [m1('12:00').status, m1('12:00').kind], ['unc', 'reducedRest']);
  eqj('M1: … 13 h 30: curto', m1('10:30').status, 'bad');
  // Com as 13 h cumpridas antes da assistência não há dúvida: 14 h 30 ≥ 12:00 + 2:00 → opção (i): 16:00.
  const m1ok = befOf({ '2026-01-10': long5, '2026-01-11': sbD('08:00', '16:30'), '2026-01-12': ext, '2026-01-13': F('13:00', '18:00', '19:00', 'LIS-OPO') }, '2026-01-13');
  eqj('M1: … dívida paga antes da assistência: 16:00 certo', [m1ok.status, m1ok.requiredMin], ['ok', 960]);

  // ── M2 · Dois prolongados com um dia só de assistência pelo meio continuam "consecutivos" (ORO.FTL.205(d)(2)). ──
  const ext2 = { kind: 'flight', report_time: '06:30', block_on: '20:00', sectors: 1 };   // 13:30 de PSV: prolongado
  const m2 = (sbEnd) => befOf({ '2026-10-28': F('08:00', '09:00', '12:00', 'LIS-OPO-LIS'), '2026-11-02': ext, '2026-11-03': sbD('08:00', sbEnd), '2026-11-04': ext2 }, '2026-11-04');
  eqj('M2: prolongado | 11 h | assistência | 17 h | prolongado: incerto 16:00–18:00 (antes: certo com 16:00)', v(m2('13:30')), ['unc', 'standbyHome', 1020, 720, 1080]);
  eqj('M2: … 18 h: certo', m2('12:30').status, 'ok');

  // ── M3 · Depois de um repouso "incerto" por assistência em casa, o repouso seguinte pode levar a diferença (CS 235(c)(3)). ──
  const m3 = (rep) => befOf({ '2026-01-10': long5, '2026-01-11': sbD('06:00', '16:30'), '2026-01-12': { ...F('05:00', '06:00', '08:30', 'LIS-OPO-LIS'), extra: [F(rep, '22:30', '23:20', 'LIS-OPO')] } }, '2026-01-12', rep);
  eqj('M3: 13 h | assistência | 12 h 30 (incerto) | voo | 12 h 15: incerto 12:00–12:30', v(m3('21:15')), ['unc', 'reducedRestAfter', 735, 720, 750]);
  eqj('M3: … 12 h 30: certo', m3('21:30').status, 'ok');
  // M5 (apareceu ao corrigir): … e esse repouso anterior NÃO foi de certeza um repouso reduzido (na leitura do piso cumpriu):
  // um 2.º repouso de 12 h 30 depois de 13 h de serviço é incerto (só como repouso reduzido), não curto.
  const long8 = F('08:00', '09:00', '20:30', 'LIS-FAO-LIS');
  const m5 = befOf({ '2026-11-10': { ...long5, extra: [sbD('18:30', '19:30')] }, '2026-11-11': long8, '2026-11-12': F('09:30', '10:30', '11:30', 'LIS-OPO') }, '2026-11-12');
  eqj('M5: 13 h + assistência | 12 h 30 (incerto) | 13 h | 12 h 30: incerto, não curto', [m5.status, m5.kind], ['unc', 'reducedRest']);

  // ── M4 · Uma reserva que começa durante o fim do serviço (o pós-voo) não é repouso: corta a recuperação. ──
  const S = (rep, on) => F(rep, null, on, 'LIS-OPO-LIS');
  const L6 = F('06:00', '07:00', '18:30', 'LIS-FAO-LIS');
  const three = (d4) => restStatus({ '2026-03-01': long5, '2026-03-02': S('06:30', '09:30'), '2026-03-03': long5, '2026-03-04': d4, '2026-03-06': L6, '2026-03-07': S('07:30', '10:30') }, '2026-03-07', at('2026-03-07', '07:29'), C).status;
  eqj('M4: 3.º repouso reduzido, com 44 h livres e 2 noites antes: incerto (houve recuperação)', three(S('06:30', '09:30')), 'warn');
  eqj('M4: … reserva das 10:00 às 23:00 (começa quando o serviço acaba): sem recuperação → curto', three({ ...S('06:30', '09:30'), extra: [{ kind: 'reserve', report_time: '10:00', block_on: '23:00' }] }), 'bad');
  eqj('M4: … reserva das 09:59 às 23:00 (1 minuto antes): o mesmo', three({ ...S('06:30', '09:30'), extra: [{ kind: 'reserve', report_time: '09:59', block_on: '23:00' }] }), 'bad');
  eqj('M4: … reserva das 05:00 às 23:00 que ENVOLVE o serviço (chamado a meio dela): acaba com ele → incerto', three({ ...S('06:30', '09:30'), extra: [{ kind: 'reserve', report_time: '05:00', block_on: '23:00' }] }), 'warn');
}

// ───────────────────────────── 6.ª PASSAGEM (revisão independente das correções da 5.ª, 2026-11-12) ─────────────────────────────
// Os achados 1 a 5 e a suspeita 7 (confirmada). Cada caso é o cenário que a revisão correu.
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const { restAround, restStatus, restUntilAfter } = require(path.resolve('data/today.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const sbD = (rep, end) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const befOf = (d, iso, rep, ctx = C) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), ctx).before;
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin];
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');   // 13:00 de serviço, fim 18:00
  const ext = { kind: 'flight', report_time: '07:00', block_on: '20:30', sectors: 1 };   // prolongado, 14:00 de serviço, fim 21:00

  // ── 1 · Depois de um prolongado com "+2 h ou +4 h" incerto, o repouso seguinte também pode aumentar (CS FTL.1.235(c)(3)). ──
  // 13 h | assistência | prolongado | 16 h 30 (incerto 16:00–18:00) | voo | 12 h 30 | voo. Na leitura das +4 h as 16 h 30 só são
  // legais como repouso reduzido (12:00 + 4:00; diferença 1:30) → o repouso seguinte fica entre 12:00 e 13:30.
  const p1 = { '2026-01-10': long5, '2026-01-11': sbD('06:00', '16:30'), '2026-01-12': ext, '2026-01-13': F('13:30', '14:00', '21:30', 'LIS-OPO-LIS'), '2026-01-14': F('10:30', '11:30', '13:00', 'LIS-OPO-LIS') };
  eqj('6.ª/1: o repouso a seguir ao prolongado incerto: 16:00–18:00', v(befOf(p1, '2026-01-13')), ['unc', 'extAfterStandby', 990, 960, 1080]);
  eqj('6.ª/1: … e o repouso seguinte: incerto 12:00–13:30 (antes: certo)', v(befOf(p1, '2026-01-14')), ['unc', 'reducedRestAfter', 750, 720, 810]);

  // ── 2 · A opção (i)/(ii) do prolongamento quando o repouso ANTES dele tem o mínimo incerto por outro motivo. ──
  // 13 h | 12 h 30 (talvez reduzido) | voo | 14 h | prolongado. O mínimo do repouso antes do prolongado é 12:00 ou 12:30
  // (CS 235(c)(3)); com as +2 h, 14:00 ou 14:30 — houve 14 h: (i) numa leitura, (ii) na outra → a seguir, 16:00 a 18:00.
  const p2 = (rep) => ({ '2026-01-10': long5, '2026-01-11': F('06:30', '07:30', '16:30', 'LIS-OPO-LIS'), '2026-01-12': ext, ...(rep ? { '2026-01-13': F(rep, '15:30', '16:30', 'LIS-OPO') } : {}) });
  eqj('6.ª/2: 16 h depois do prolongado: incerto 16:00–18:00 (antes: certo com 16:00)', v(befOf(p2('13:00'), '2026-01-13')), ['unc', 'extPreRest', 960, 960, 1080]);
  eqj('6.ª/2: … 18 h: certo', befOf(p2('15:00'), '2026-01-13').status, 'ok');
  { const ru = restUntilAfter(p2(null), '2026-01-12', C); eqj('6.ª/2: o "Repouso até" com as duas pontas', [ru.requiredLoMin, ru.requiredHiMin, ru.why], [960, 1080, 'extPreRest']); }

  // ── 3 · Noites locais depois de uma rotação com fuso, com um serviço EM TERRA pelo meio. ──
  // Com assistência em casa (não é período de serviço): as noites continuam pedidas → curto (5.ª revisão, E5). Com formação,
  // escritório ou assistência no aeroporto (são períodos de serviço): a FAQ 47610 da EASA mede o repouso antes do PSV pelo
  // serviço que vem logo antes, e a CS FTL.1.235(b)(3)(i) não diz se as noites ainda se pedem → incerto (antes: "certo").
  const out = { kind: 'flight', report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  const back = { kind: 'flight', report_time: '23:00', block_on: '07:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '00:00', on: '07:00', offZ: '00:00', onZ: '07:00' }] };
  const local = (rep, end) => ({ kind: 'flight', report_time: rep, block_on: end, sectors: 2, legs: [{ dep: 'LIS', arr: 'OPO', off: rep, on: end }] });
  const n3 = (x) => befOf({ '2026-01-10': out, '2026-01-12': back, '2026-01-13': x, '2026-01-14': local('08:00', '12:00') }, '2026-01-14');
  const g = (kind) => ({ kind, report_time: '12:00', block_on: '16:00', sectors: 0 });
  for (const k of ['training', 'office', 'standby_airport']) eqj(`6.ª/3: rotação com fuso, ${k} no dia do regresso, voo com 1 noite: incerto (1 de 2 noites)`, [n3(g(k)).status, n3(g(k)).kind, n3(g(k)).nightsRequired, n3(g(k)).nightsActual], ['unc', 'rotationNights', 2, 1]);
  eqj('6.ª/3: … com assistência em casa: o mesmo incerto (2026-11-12, a regra sem exceção; antes: curto)', [n3(sbD('12:00', '16:00')).status, n3(sbD('12:00', '16:00')).kind, n3(sbD('12:00', '16:00')).nightsRequired], ['unc', 'rotationNights', 2]);
  { const rs = restStatus({ '2026-01-10': out, '2026-01-12': back, '2026-01-13': g('training'), '2026-01-14': local('08:00', '12:00') }, '2026-01-14', new Date(2026, 0, 14, 7, 0), C);
    eqj('6.ª/3: o Início diz o mesmo', [rs.status, rs.kind, rs.nightsRequired, rs.nightsActual], ['warn', 'rotationNights', 2, 1]); }
  { const ru = restUntilAfter({ '2026-01-10': out, '2026-01-12': back, '2026-01-13': g('training') }, '2026-01-13', C);
    eqj('6.ª/3: "Repouso até" depois da formação: entre as 12 h e as 2 noites', [!!ru.uncertain, ru.why, new Date(ru.untilLoMs).getDate(), new Date(ru.untilLoMs).getHours(), new Date(ru.untilHiMs).getDate(), new Date(ru.untilHiMs).getHours()], [true, 'rotationNights', 14, 4, 15, 6]); }
  // O regresso e a formação no MESMO dia são um só período de serviço: as noites pedem-se de certeza (antes: perdiam-se).
  const backDay = { kind: 'flight', report_time: '01:00', block_on: '09:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '02:00', on: '09:00', offZ: '02:00', onZ: '09:00' }] };
  const n3b = befOf({ '2026-01-10': out, '2026-01-13': { ...backDay, extra: [{ kind: 'training', report_time: '10:00', block_on: '12:00', sectors: 0 }] }, '2026-01-14': local('08:00', '12:00') }, '2026-01-14');
  eqj('6.ª/3: regresso + formação no mesmo dia, voo com 1 noite: curto (2 noites)', [n3b.status, n3b.nightsRequired, n3b.nightsActual], ['bad', 2, 1]);

  // ── 4 · A assistência antes ou depois da meia-noite, quando o serviço antes dela veio depois de um repouso talvez reduzido. ──
  const D4 = F('06:30', '07:30', '13:30', 'LIS-OPO-LIS');   // depois de 12 h 30 (13 h de serviço antes): talvez reduzido, diferença 0:30
  const s4 = befOf({ '2026-01-10': long5, '2026-01-11': { ...D4, extra: [sbD('22:00', '23:30')] }, '2026-01-12': F('11:30', '12:30', '13:30', 'LIS-OPO') }, '2026-01-12');
  const x4 = befOf({ '2026-01-10': long5, '2026-01-11': D4, '2026-01-12': { ...sbD('00:30', '02:00'), extra: [F('14:00', '15:00', '16:00', 'LIS-OPO')] } }, '2026-01-12', '14:00');
  eqj('6.ª/4: assistência antes da meia-noite, 12 h: incerto 12:00–12:30', [s4.status, s4.actualMin, s4.requiredMin, s4.requiredHiMin], ['unc', 720, 720, 750]);
  eqj('6.ª/4: … depois da meia-noite: o mesmo (antes: certo)', [x4.status, x4.actualMin, x4.requiredMin, x4.requiredHiMin], ['unc', 720, 720, 750]);

  // ── 5 · O sítio de um serviço em terra mede-se contra a base DO DIA DELE (a base pode ter mudado). ──
  const C5 = { postFlightMin: 30, isPilot: true, baseAt: (iso) => (iso >= '2026-01-11' ? 'OPO' : 'LIS') };
  const m5 = (x, f) => befOf({ '2026-01-10': f, '2026-01-11': x, '2026-01-12': F('01:00', '02:00', '03:00', f.route === 'LIS-OPO' ? 'OPO-FAO' : 'LIS-OPO') }, '2026-01-12', null, C5);
  const toNew = F('17:00', '18:00', '19:00', 'LIS-OPO'), toOld = F('17:00', '18:00', '19:00', 'OPO-LIS');
  eqj('6.ª/5: voo para a NOVA base, assistência em casa, 11 h: na base, curto (12:00)', [m5(sbD('08:00', '14:00'), toNew).status, m5(sbD('08:00', '14:00'), toNew).place, m5(sbD('08:00', '14:00'), toNew).requiredMin], ['bad', 'base', 720]);
  eqj('6.ª/5: … com formação: o mesmo', [m5({ kind: 'training', report_time: '08:00', block_on: '14:00', sectors: 0 }, toNew).status, m5({ kind: 'training', report_time: '08:00', block_on: '14:00', sectors: 0 }, toNew).requiredMin], ['bad', 720]);
  eqj('6.ª/5: voo para a base ANTIGA, assistência lá (já não é a base), 11 h: fora, certo (10:00)', [m5(sbD('08:00', '14:00'), toOld).status, m5(sbD('08:00', '14:00'), toOld).place, m5(sbD('08:00', '14:00'), toOld).requiredMin], ['ok', 'away', 600]);

  // ── 7 · O motor do PSV do dia lê o mesmo sítio: assistência no hotel e voo 10 h 30 depois é um repouso (fora: 10 h). ──
  // Antes: lida "na base" (12 h) → "repouso ou chamada?" → PSV incerto entre 8:00 e 13:00. Na base continua incerto.
  const hotelDay = { ...sbD('00:30', '01:00'), extra: [F('11:30', '12:30', '21:00', 'FNC-LIS')] };
  const dayOf = (base) => ftl.dayFtlFromDuties([hotelDay, ...hotelDay.extra], { base, postFlightMin: 30, isPilot: true, date: '2026-11-03', duties: { '2026-11-02': F('08:30', '09:30', '21:00', 'LIS-FNC'), '2026-11-03': hotelDay } });
  const away7 = dayOf('LIS'), base7 = dayOf('FNC');
  eqj('6.ª/7: assistência no hotel + voo 10 h 30 depois: um repouso fora da base (10:00); PSV do voo certo, máximo 13:00', [away7.between[0].kind, away7.between[0].place, away7.between[0].requiredMin, away7.parts[1].max, away7.parts.some((p) => p.uncertain)], ['rest', 'away', 600, '13:00', false]);
  eqj('6.ª/7: … a mesma assistência NA BASE (12 h): continua incerto', [!!base7.psv.uncertain, (base7.psv.unknowns || []).includes('standbyRest')], [true, true]);
}

// ───────────────────────────── A REGRA SEM EXCEÇÃO (2026-11-12, o Nuno: "tem é que seguir a lei… avança") ─────────────────────────────
// "Curto" só quando é curto em TODAS as leituras. Três sítios onde a app ainda dizia "curto" ou "certo" por uma leitura sua:
//   A · assistência num dia e voo no seguinte, abaixo do mínimo — pode ter sido uma chamada durante a assistência;
//   B · depois de uma assistência em casa, o que vinha do último voo (14 h, horas do prolongamento, noites locais) — já mudado
//       nos casos de cima; aqui só as noites locais;
//   C · escritório ou formação entre um voo com horas a mais (prolongado, 14 h) e o PSV seguinte.
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const norm = (s) => s.replace(/\s+/g, ' ');
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  const { restAround, restStatus } = require(path.resolve('data/today.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const sbD = (rep, end) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin];
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');   // 13:00 de serviço, fim 18:00
  const ext = { kind: 'flight', report_time: '07:00', block_on: '20:30', sectors: 1 };   // prolongado, 14:00 de serviço, fim 21:00

  // ── A · Assistência num dia, voo no dia seguinte abaixo do mínimo. ──
  eq('fonte: CS FTL.1.225(b)(5) a assistência acaba quando o tripulante se apresenta', cs.includes('standby ceases when the crew member reports at the designated reporting'), true);
  eq('fonte: CS FTL.1.225(b)(1) a assistência fora do aeroporto dura no máximo 16 h', cs.includes('the maximum duration of standby other than airport standby is 16 hours'), true);
  eq('fonte: GM1 CS FTL.1.225 (b) com um repouso mínimo antes da apresentação, esse tempo não conta como assistência', cs.includes('If a minimum rest period as specified in ORO.FTL.235 is provided before reporting for the duty assigned during the standby, this time period should not count as standby duty.'), true);
  const short1 = F('06:00', '07:00', '10:00', 'LIS-OPO-LIS');   // fim 10:30
  const a1 = (rep) => befOf({ '2026-03-02': short1, '2026-03-03': sbD('14:00', '22:00'), '2026-03-04': F(rep, '08:00', '09:00', 'LIS-OPO') }, '2026-03-04');
  eqj('A: assistência 14:00–22:00, voo às 04:00 do dia seguinte (6 h depois): incerto — chamada ou repouso curto (antes: curto)', v(a1('04:00')), ['unc', 'standbyCall', 360, 720, null]);
  eqj('A: … voo às 07:00 (9 h depois; 17 h desde o início da assistência, mais do que as 16 h): curto nas duas leituras', [a1('07:00').status, a1('07:00').requiredMin], ['bad', 720]);
  eqj('A: … voo às 10:00 (12 h depois): certo', a1('10:00').status, 'ok');
  // Na leitura da chamada o repouso antes do PSV é o que veio ANTES da assistência: se esse também é curto, é curto.
  const a2 = befOf({ '2026-03-02': F('12:00', '13:00', '23:00', 'LIS-FAO-LIS'), '2026-03-03': sbD('10:00', '23:00'), '2026-03-04': F('01:00', '08:00', '09:00', 'LIS-OPO') }, '2026-03-04');
  eqj('A: voo até às 23:30, assistência 10 h 30 depois (mínimo 12:00) e voo 2 h depois dela: curto', a2.status, 'bad');
  const a3 = befOf({ '2026-03-03': { ...long5, extra: [sbD('19:00', '23:00')] }, '2026-03-04': F('04:00', '08:00', '09:00', 'LIS-OPO') }, '2026-03-04');
  eqj('A: voo de 13 h + assistência no mesmo dia (1 h depois) e voo 5 h depois dela: curto', a3.status, 'bad');
  { const d = { '2026-03-02': short1, '2026-03-03': sbD('14:00', '22:00'), '2026-03-04': F('04:00', '08:00', '09:00', 'LIS-OPO') };
    const rs = restStatus(d, '2026-03-04', new Date(2026, 2, 4, 3, 0), C); eqj('A: o Início diz o mesmo', [rs.status, rs.kind], ['warn', 'standbyCall']); }

  // ── B · Noites locais depois de uma rotação com fuso, só com assistência em casa pelo meio: incerto (antes: curto). ──
  const out = { kind: 'flight', report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  const back = { kind: 'flight', report_time: '23:00', block_on: '07:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '00:00', on: '07:00', offZ: '00:00', onZ: '07:00' }] };
  const local = (rep, end) => ({ kind: 'flight', report_time: rep, block_on: end, sectors: 2, legs: [{ dep: 'LIS', arr: 'OPO', off: rep, on: end }] });
  const b1 = befOf({ '2026-01-10': out, '2026-01-12': back, '2026-01-14': local('08:00', '12:00') }, '2026-01-14');
  eqj('B: sem nada pelo meio, 1 de 2 noites: curto (a lei é clara)', [b1.status, b1.nightsRequired, b1.nightsActual], ['bad', 2, 1]);

  // ── C · Escritório ou formação entre um voo com horas a mais e o PSV seguinte. ──
  // A FAQ 47610 da EASA mede o repouso antes do PSV pelo serviço que vem logo antes ("FDP1 – off duty – DP1 – off duty – DP2 –
  // rest – FDP2"), mas não diz se as horas do prolongamento (ORO.FTL.205(d)(1)) ou as 14 h (CS FTL.1.205(c)(6), 235(b)(3)(ii))
  // desse voo ainda se pedem: sem um repouso com elas desde esse voo → incerto (antes: "certo").
  const office = (rep, end) => ({ kind: 'office', report_time: rep, block_on: end, sectors: 0 });
  const c1 = (rep) => befOf({ '2026-11-02': ext, '2026-11-03': office('10:00', '18:00'), '2026-11-04': F(rep, '14:00', '15:00', 'LIS-OPO') }, '2026-11-04');
  eqj('C: prolongado, 13 h, escritório, 14 h: incerto entre 12:00 e 18:00 (antes: certo)', v(c1('08:00')), ['unc', 'groundBetween', 840, 720, 1080]);
  eqj('C: … 18 h depois do escritório: certo', c1('12:00').status, 'ok');
  eqj('C: … 11 h: curto (12:00 em qualquer leitura)', [c1('05:00').status, c1('05:00').requiredMin], ['bad', 720]);
  const c2 = befOf({ '2026-11-02': ext, '2026-11-03': office('15:00', '17:00'), '2026-11-04': F('05:00', '14:00', '15:00', 'LIS-OPO') }, '2026-11-04');
  eqj('C: com as 18 h cumpridas ANTES do escritório, 12 h depois dele: certo', [c2.status, c2.requiredMin], ['ok', 720]);
  // Sem horas a mais no voo, vale a resposta da EASA: o repouso mede-se pelo escritório.
  const c3 = befOf({ '2026-11-02': long5, '2026-11-03': office('06:00', '10:00'), '2026-11-04': F('00:30', '14:00', '15:00', 'LIS-OPO') }, '2026-11-04');
  eqj('C: voo de 13 h (sem horas a mais), 12 h, escritório, 14 h 30: certo (12:00)', [c3.status, c3.requiredMin], ['ok', 720]);
  // As 14 h do repouso a bordo, com uma formação no hotel pelo meio.
  const aug = F('07:30', '08:30', '20:00', 'LIS-FNC', { special: { augmented: { restClass: 1, additionalCrew: 1 } } });
  const c4 = befOf({ '2026-01-10': aug, '2026-01-11': { kind: 'training', report_time: '06:00', block_on: '10:00', sectors: 0, extra: [F('22:00', '23:00', '23:50', 'FNC-LIS')] } }, '2026-01-11', '22:00');
  eqj('C: repouso a bordo, 9 h 30, formação no hotel, 12 h: incerto entre 10:00 e 14:00', v(c4), ['unc', 'groundBetween', 720, 600, 840]);
}

// ───────────────────────────── 7.ª PASSAGEM (2026-11-12, revisão independente das correções da 6.ª) ─────────────────────────────
// Três erros confirmados com cenário corrido:
//   1 · a opção (i)/(ii) do prolongamento mudava com a meia-noite: com a assistência em casa num dia próprio, o mínimo do
//       repouso antes do prolongado não via o aumento de um repouso talvez reduzido antes de D (CS FTL.1.235(c)(3));
//   2 · o motor do PSV situava um serviço em terra sem rota com outra regra (saltava um voo sem rota, não via um serviço sem
//       apresentação, não aceitava uma rota de um só aeroporto) e dizia "fora da base" com certeza;
//   3 · um serviço SEM FIM entre o regresso da rotação e o PSV fazia as noites locais deixarem de se pedir, e o "Repouso até"
//       discordava das outras vistas.
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const norm = (s) => s.replace(/\s+/g, ' ');
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  const { restAround, restStatus, restVerdicts, restUntilAfter } = require(path.resolve('data/today.js'));
  const ftl = require(path.resolve('ftl/index.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route ? route.split('-').length - 1 : 1, flight_minutes: 60, route, ...x });
  const G = (kind, rep, end, route = null) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route });
  const sbD = (rep, end) => G('standby_home', rep, end);
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin];
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');   // 13:00 de serviço, fim 18:00
  const D4 = F('06:30', '07:30', '13:30', 'LIS-OPO-LIS');      // 12 h 30 depois (mínimo 13:00): talvez repouso reduzido, diferença 0:30; fim 14:00
  const ext = { kind: 'flight', report_time: '07:00', block_on: '20:30', sectors: 1 };   // prolongado, 14:00 de serviço, fim 21:00

  // ── 1 · O "+2 h ou +4 h" com a assistência em casa num dia próprio antes do prolongado. ──
  eq('fonte: CS FTL.1.235(c)(3) o repouso a seguir ao repouso reduzido aumenta pela diferença', cs.includes('The rest period following the reduced rest is extended by the difference'), true);
  // 13 h de serviço → 12 h 30 → D → 11 h → assistência em casa (dia próprio) → 14 h 15 → prolongado. O mínimo antes do prolongado é
  // 12:00 ou 12:30 (D veio de um repouso talvez reduzido); a opção (i) pede +2 h antes: 14:00 ou 14:30. Com 14:15 → (i) ou (ii).
  const e1 = { '2026-01-10': long5, '2026-01-11': D4, '2026-01-12': sbD('01:00', '16:45'), '2026-01-13': ext };
  const e1after = (rep) => befOf({ ...e1, '2026-01-14': F(rep, '15:00', '16:00', 'LIS-OPO') }, '2026-01-14');
  eqj('7.ª/1: assistência num dia próprio antes do prolongado, 17 h depois dele: incerto entre 16:00 e 18:00 (antes: certo)', v(e1after('14:00')), ['unc', 'extAfterStandby', 1020, 960, 1080]);
  eqj('7.ª/1: … 18 h 30 depois: certo', e1after('15:30').status, 'ok');
  eqj('7.ª/1: … 15 h 30 depois: abaixo das 16:00 de todas as leituras (não é certo)', e1after('12:30').status !== 'ok', true);
  { const ru = restUntilAfter(e1, '2026-01-13', C); eqj('7.ª/1: o "Repouso até" diz o mesmo', [ru.requiredLoMin, ru.requiredHiMin, !!ru.uncertain, ru.why], [960, 1080, true, 'extAfterStandby']); }
  // Controlo: a assistência no MESMO dia de D já dava isto (a resposta não pode mudar com a meia-noite).
  const e1same = { '2026-01-10': long5, '2026-01-11': { ...D4, extra: [sbD('22:00', '23:59')] }, '2026-01-12': { kind: 'flight', report_time: '14:14', block_on: '03:44', sectors: 1 } };
  eqj('7.ª/1: controlo, a assistência no mesmo dia de D: o mesmo incerto', v(befOf({ ...e1same, '2026-01-13': F('21:14', '22:00', '23:00', 'LIS-OPO') }, '2026-01-13')).slice(0, 2).concat([960, 1080]), ['unc', 'extPreRest', 960, 1080]);
  // O mesmo com um ESCRITÓRIO num dia próprio no lugar da assistência (a regra C de cima: as horas a mais de D, aqui o aumento
  // do repouso reduzido, não se sabe se ainda se pedem ao repouso depois do escritório).
  const office = (rep, end) => G('office', rep, end);
  const g1 = (rep) => befOf({ '2026-01-10': long5, '2026-01-11': D4, '2026-01-12': { ...office('01:00', '03:00'), extra: [F(rep, '17:00', '18:00', 'LIS-OPO')] } }, '2026-01-12', rep);
  eqj('7.ª/1: repouso talvez reduzido, D, 11 h, escritório, 12 h 15: incerto entre 12:00 e 12:30 (antes: certo)', v(g1('15:15')), ['unc', 'groundBetween', 735, 720, 750]);
  eqj('7.ª/1: … 12 h 30 depois do escritório: certo', g1('15:30').status, 'ok');
  // D, 10 h 30, escritório (00:30–02:30), 14 h 15, prolongado às 16:45 (12 h de PSV, 12 h 30 de serviço, fim 05:15): o mínimo antes
  // do prolongado é 12:00 ou 12:30, logo a seguir a ele 14:30 (opção i) ou 16:30 (ii).
  const ext2 = { kind: 'flight', report_time: '16:45', block_on: '04:45', sectors: 1 };
  const e1off = { '2026-01-10': long5, '2026-01-11': D4, '2026-01-12': { ...office('00:30', '02:30'), extra: [ext2] } };
  eqj('7.ª/1: escritório antes do prolongado, 15 h 30 depois dele: incerto entre 14:30 e 16:30 (antes: certo)', v(befOf({ ...e1off, '2026-01-13': F('20:45', '21:30', '22:30', 'LIS-OPO') }, '2026-01-13')), ['unc', 'extPreRest', 930, 870, 990]);

  // ── 2 · O motor do PSV e o repouso situam o serviço em terra com a MESMA regra. ──
  const dayOf = (d, iso) => ftl.dayFtlFromDuties([d[iso], ...(d[iso].extra || [])], { base: 'LIS', postFlightMin: 30, isPilot: true, date: iso, duties: d });
  const gapOf = (d, iso) => { const df = dayOf(d, iso); const b = df.between[df.between.length - 1]; return [b.kind, b.place, !!df.psv.uncertain]; };
  const apt = { ...G('standby_airport', '08:00', '10:00'), extra: [F('20:30', '21:30', '23:00', 'LIS-OPO')] };   // voo 10 h 30 depois da assistência
  const out1 = F('08:00', '09:00', '11:00', 'LIS-FNC');
  // (a) um voo SEM rota no dia antes: não se sabe onde acabou → o valor por omissão (na base), 10 h 30 = intervalo ou repouso.
  eqj('7.ª/2a: voo sem rota antes da assistência no aeroporto: não se sabe o sítio → "intervalo ou repouso", PSV incerto (antes: fora, certo)',
    gapOf({ '2026-01-10': out1, '2026-01-11': F('07:00', '08:00', '09:30', null), '2026-01-12': apt }, '2026-01-12'), ['either', 'base', true]);
  // (b) um voo SEM apresentação, FNC-LIS, na manhã do próprio dia: o tripulante está em Lisboa.
  eqj('7.ª/2b: voo sem apresentação de volta à base na manhã do dia: na base (antes: fora, certo)',
    gapOf({ '2026-01-10': out1, '2026-01-11': { kind: 'flight', report_time: null, block_off: '05:00', block_on: '06:30', sectors: 1, route: 'FNC-LIS', extra: [apt, ...apt.extra] } }, '2026-01-11'), ['either', 'base', true]);
  // (c) uma formação com a rota de um só aeroporto (LIS) no dia antes: está em Lisboa.
  eqj('7.ª/2c: formação com rota "LIS" antes: na base (antes: fora, certo)',
    gapOf({ '2026-01-10': out1, '2026-01-11': G('training', '09:00', '17:00', 'LIS'), '2026-01-12': apt }, '2026-01-12'), ['either', 'base', true]);
  // Controlo: depois de um voo que acabou mesmo fora (FNC), 10 h 30 são um repouso — como já era.
  eqj('7.ª/2: controlo, a assistência no aeroporto do Funchal: fora da base, 10 h 30 são um repouso',
    gapOf({ '2026-01-10': out1, '2026-01-12': { ...G('standby_airport', '08:00', '10:00'), extra: [F('20:30', '21:30', '23:00', 'FNC-LIS')] } }, '2026-01-12'), ['rest', 'away', false]);
  // … e sem limite de dias: a última chegada foi há 20 dias.
  eqj('7.ª/2: a última chegada foi há 20 dias (antes o motor só via 14): fora da base',
    gapOf({ '2026-01-10': out1, '2026-01-30': { ...G('standby_airport', '08:00', '10:00'), extra: [F('20:30', '21:30', '23:00', 'FNC-LIS')] } }, '2026-01-30'), ['rest', 'away', false]);

  // ── 3 · Um serviço em terra SEM FIM na cadeia: não se sabe quanto repouso houve depois dele → não conta, e a cadeia continua. ──
  const out = { kind: 'flight', report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  const back = { kind: 'flight', report_time: '23:00', block_on: '07:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '00:00', on: '07:00', offZ: '00:00', onZ: '07:00' }] };
  const local = (rep, end) => ({ kind: 'flight', report_time: rep, block_on: end, sectors: 2, legs: [{ dep: 'LIS', arr: 'OPO', off: rep, on: end }] });
  const noEnd = (kind, rep) => ({ kind, report_time: rep, sectors: 0 });
  const n3 = { '2026-01-10': out, '2026-01-12': back, '2026-01-13': { ...noEnd('training', '09:00'), extra: [G('office', '18:00', '20:00')] }, '2026-01-14': local('09:00', '12:00') };
  const b3 = befOf(n3, '2026-01-14');
  eqj('7.ª/3: rotação com fuso, formação SEM fim, escritório, voo com 1 de 2 noites: incerto (antes: certo, sem noites)', [b3.status, b3.kind, b3.nightsRequired, b3.nightsActual], ['unc', 'rotationNights', 2, 1]);
  { const rs = restStatus(n3, '2026-01-14', new Date(2026, 0, 14, 8, 0), C); eqj('7.ª/3: o Início diz o mesmo', [rs.status, rs.kind, rs.nightsRequired], ['warn', 'rotationNights', 2]); }
  { const rv = restVerdicts(n3, C).filter((x) => x.nextIso === '2026-01-14')[0]; eqj('7.ª/3: as Estatísticas dizem o mesmo', [rv.status, rv.kind], ['unc', 'rotationNights']); }
  { const nd = restAround(n3, (s, i) => i === '2026-01-13' && s.kind === 'office', C).need; eqj('7.ª/3: a Simulação pede as 2 noites, incertas', [nd.nightsRequired, !!nd.nightsUncertain], [2, true]); }
  { const ru = restUntilAfter(n3, '2026-01-13', C); eqj('7.ª/3: o "Repouso até" continua igual (entre 14/1 às 08:00 e 15/1 às 06:00)', [ru.nightsRequired, !!ru.uncertain, new Date(ru.untilLoMs).getDate(), new Date(ru.untilLoMs).getHours(), new Date(ru.untilHiMs).getDate(), new Date(ru.untilHiMs).getHours()], [2, true, 14, 8, 15, 6]); }
  // O mesmo nas outras duas cadeias (prolongado → serviço em terra sem fim → escritório ou assistência → voo).
  const c3 = befOf({ '2026-11-02': ext, '2026-11-03': { ...noEnd('training', '09:00'), extra: [G('office', '15:00', '18:00')] }, '2026-11-04': F('08:00', '14:00', '15:00', 'LIS-OPO') }, '2026-11-04');
  eqj('7.ª/3: prolongado, formação sem fim, escritório, 14 h: incerto entre 12:00 e 18:00 (antes: certo)', v(c3), ['unc', 'groundBetween', 840, 720, 1080]);
  const s3 = befOf({ '2026-11-02': ext, '2026-11-03': { ...noEnd('standby_home', '09:00'), extra: [sbD('15:00', '18:00')] }, '2026-11-04': F('08:00', '14:00', '15:00', 'LIS-OPO') }, '2026-11-04');
  eqj('7.ª/3: prolongado, assistência em casa sem fim, outra assistência, 14 h: incerto entre 12:00 e 18:00 (antes: certo)', v(s3), ['unc', 'standbyHome', 840, 720, 1080]);
  { const d = { '2026-11-02': ext, '2026-11-03': { ...noEnd('training', '09:00'), extra: [G('office', '15:00', '18:00')] } };
    const ru = restUntilAfter(d, '2026-11-03', C), nd = restAround(d, (s, i) => i === '2026-11-03' && s.kind === 'office', C).need;
    eqj('7.ª/3: "Repouso até" e Simulação dão o mesmo mínimo depois do escritório', [ru.requiredLoMin, ru.requiredHiMin, ru.why, nd.requiredLoMin, nd.requiredHiMin, nd.why], [720, 1080, 'groundBetween', 720, 1080, 'groundBetween']); }
}

// ───────────────────────────── VERIFICAÇÃO DO REPOUSO (2026-11-12, sessão própria) ─────────────────────────────
// Um "curto" falso: depois de um repouso talvez reduzido, o bloco seguinte só é um serviço repartido DE CERTEZA (ORO.FTL.220(c):
// "split duty shall not follow a reduced rest") quando são dois serviços de VOO com um intervalo pelo meio. Uma assistência em
// casa ou um escritório seguidos de um voo não são um PSV repartido de certeza — o intervalo é "within a flight duty period"
// (ORO.FTL.105(6)) — e a app dava "curto" onde só podia dizer "incerto".
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-en.txt'), 'utf8'));
  const { restAround } = require(path.resolve('data/today.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const G = (kind, rep, end) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');   // 13:00 de serviço, fim 18:00

  eq('fonte: ORO.FTL.220(c) o repartido não se segue a um repouso reduzido', reg.includes('split duty shall not follow a reduced rest'), true);
  eq('fonte: ORO.FTL.105(6) o intervalo é dentro de um PSV', reg.includes('“break” means a period of time within a flight duty period, shorter than a rest period'), true);
  // 13 h de serviço | 12 h (mínimo 13:00: só como repouso reduzido) | assistência em casa 06:00–10:00 | voo 9 h 30 depois.
  const v1 = befOf({ '2026-03-02': long5, '2026-03-03': { ...G('standby_home', '06:00', '10:00'), extra: [F('19:30', '20:30', '21:30', 'LIS-OPO')] } }, '2026-03-03', '19:30');
  // (Com as duas leituras da chamada, mais abaixo: sem chamada são 9 h 30, curto; com chamada o repouso é o de antes da
  // assistência — 12 h, só como repouso reduzido. Antes desta correção essa leitura dava "curto" e o veredicto também.)
  eqj('verificação: repouso talvez reduzido | assistência em casa + voo no mesmo dia: incerto, não curto (não é um repartido)', [v1.status, v1.kind, v1.actualMin, v1.requiredMin], ['unc', 'standbyCall', 570, 720]);
  const v2 = befOf({ '2026-03-02': long5, '2026-03-03': { ...G('office', '06:00', '08:00'), extra: [F('13:00', '14:00', '15:00', 'LIS-OPO')] } }, '2026-03-03', '13:00');
  eqj('verificação: … escritório + voo 5 h depois: incerto, não curto', [v2.status, v2.kind], ['unc', 'reducedRest']);
  // Controlo: dois VOOS com 4 h 30 pelo meio são um repartido certo — depois de um repouso reduzido não pode ser: curto.
  const v3 = befOf({ '2026-03-02': long5, '2026-03-03': { ...F('06:00', '07:00', '08:00', 'LIS-OPO-LIS'), extra: [F('13:00', '14:00', '15:00', 'LIS-OPO-LIS')] } }, '2026-03-03', '06:00');
  eqj('verificação: controlo, dois voos com 4 h 30 pelo meio (repartido certo): curto', [v3.status, v3.requiredMin], ['bad', 780]);

  // ── O voo apresenta-se DURANTE a assistência do mesmo dia (a chamada típica: a assistência da escala ainda não tinha acabado). ──
  // "standby ceases when the crew member reports at the designated reporting point" (CS FTL.1.225(b)(5)); "if standby ceases after
  // the first 6 hours, the maximum FDP is reduced by the amount of standby time exceeding 6 hours" ((b)(7)). O motor lia
  // "23 h de repouso" entre os dois (a conta dava a volta à meia-noite), não reduzia o máximo e dizia "dentro".
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  eq('fonte: CS FTL.1.225(b)(7) a assistência acima das 6 h reduz o PSV máximo', cs.includes('if standby ceases after the first 6 hours, the maximum FDP is reduced by the'), true);
  const ftlV = require(path.resolve('ftl/index.js'));
  const dayOf = (list, date = '2026-03-03') => ftlV.dayFtlFromDuties(list, { base: 'LIS', postFlightMin: 30, isPilot: true, date });
  const fl18 = F('18:00', '19:00', '04:30', 'LIS-FNC-LIS');   // PSV 10:30; às 18:00 o Quadro 2 dá 11:00
  const during = dayOf([G('standby_home', '07:00', '19:00'), fl18]), atEnd = dayOf([G('standby_home', '07:00', '18:00'), fl18]);
  // (2026-11-12, "tem que ser como diz a lei".) Com a assistência a acabar na escala à hora da apresentação — ou antes — a app
  // não sabe se o voo foi atribuído durante ela: com chamada o máximo é 6:00 (excede); sem chamada é 11:00 (e curto é o
  // repouso). Incerto entre os dois. Só a apresentação DURANTE a assistência é uma chamada de certeza.
  eqj('verificação: assistência 07:00–18:00 e apresentação às 18:00: máximo entre 6:00 e 11:00, incerto (antes: excede)', [atEnd.psv.result, atEnd.psv.max, atEnd.psv.maxHi, atEnd.psv.over, !!atEnd.psv.uncertain, (atEnd.psv.unknowns || []).includes('standbyCall'), atEnd.servicoMin], ['10:30', '06:00', '11:00', false, true, true, 825]);
  eqj('verificação: assistência 07:00–19:00 e apresentação às 18:00 (durante ela): o mesmo (antes: máximo 11:00, "dentro")', [during.psv.result, during.psv.max, during.psv.over, during.servicoMin], ['10:30', '06:00', true, 825]);
  // A assistência que passa a meia-noite, com o voo a apresentar-se durante ela no mesmo dia: 2 h de assistência, sem redução.
  const night = dayOf([G('standby_home', '20:00', '04:00'), F('22:00', '23:00', '03:00', 'LIS-FNC-LIS')]);
  eqj('verificação: assistência 20:00–04:00 e apresentação às 22:00: um PSV só, contado da apresentação, máximo sem redução', [night.psv.result, night.psv.max, night.psv.over, (night.between || []).length], ['05:00', '11:00', false, 0]);
  // Controlo: assistência de madrugada e voo 14 h depois continua a ser um repouso.
  const far = ftlV.restBetweenDuties(G('standby_home', '02:00', '04:00'), F('18:00', '19:00', '21:00', 'LIS-OPO-LIS'), { inBase: true, postFlightMin: 30, date: '2026-03-03' });
  eqj('verificação: controlo, 14 h entre a assistência e o voo: repouso', [far.kind, far.gapMin], ['rest', 840]);
}

// ───────────────────────────── A ASSISTÊNCIA EM CASA LOGO ANTES DE UM VOO: A LEI NÃO OLHA PARA A DATA (2026-11-12) ─────────────────────────────
// Dois pontos da verificação do repouso (o Nuno: "sim, avança"):
//   1 · o PSV — a assistência da VÉSPERA reduz o máximo do voo do dia seguinte como a do mesmo dia (CS FTL.1.225(b)(5) a (7));
//   2 · o repouso — com menos do que o mínimo entre o fim da assistência e o voo, a app não sabe se o voo foi atribuído durante
//       a assistência (não há repouso entre os dois) ou se já estava na escala (repouso curto): incerto no mesmo dia e no dia
//       seguinte (antes: "certo" no mesmo dia). Com o voo a apresentar-se DURANTE a assistência é uma chamada de certeza, em
//       qualquer dia: mede-se o repouso antes da assistência (antes, de um dia para o outro: "Incerto · −1:00").
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const norm = (s) => s.replace(/\s+/g, ' ');
  const faq = norm(fs.readFileSync(path.resolve('fontes/easa/faq-47642.txt'), 'utf8'));
  const { restAround, restStatus, restVerdicts, restUntilAfter } = require(path.resolve('data/today.js'));
  const ftlV = require(path.resolve('ftl/index.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const sbD = (rep, end) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin];
  const short1 = F('06:00', '07:00', '10:00', 'LIS-OPO-LIS');   // fim 10:30
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');    // 13:00 de serviço, fim 18:00

  eq('fonte: FAQ 47642 a apresentação pode ser depois do fim da assistência da escala', faq.includes('It is possible during other-standby to assign a duty that will start after the rostered end of the standby period.'), true);
  eq('fonte: FAQ 47642 esse tempo é continuação da assistência', faq.includes('The response time between the call and reporting is considered a continuation of the standby, notwithstanding the rostered end of the standby'), true);
  eq('fonte: FAQ 47642 sem atribuição, segue-se um repouso', faq.includes('If no duty has been assigned during the rostered standby availability period, other-standby is followed by a rest period in accordance with ORO.FTL.235.'), true);

  // ── 1 · O PSV com a assistência da véspera. ──
  const dayOf = (d, iso, withDuties = true) => ftlV.dayFtlFromDuties([d[iso], ...(d[iso].extra || [])], { base: 'LIS', postFlightMin: 30, isPilot: true, date: iso, ...(withDuties ? { duties: d } : {}) });
  const psv = (e) => [e.psv.result, e.psv.max, !!e.psv.over, !!e.psv.uncertain];
  // Assistência 14:00–02:00, chamado: apresentação à 01:00 do dia seguinte (durante ela), PSV de 10:30. 11 h de assistência → 6:00.
  const n1 = { '2026-03-03': sbD('14:00', '02:00'), '2026-03-04': F('01:00', '02:00', '11:30', 'LIS-FNC-LIS') };
  eqj('véspera: apresentação durante a assistência que passou a meia-noite: máximo 6:00, excede (antes: 11:00, dentro)', psv(dayOf(n1, '2026-03-04')), ['10:30', '06:00', true, false]);
  eqj('véspera: … o serviço do dia não conta a assistência outra vez (ficou toda na véspera)', dayOf(n1, '2026-03-04').servicoMin, 660);
  // Assistência 14:00–22:00, apresentação à 01:00 (3 h depois do fim): como no mesmo dia, a assistência vai até à apresentação.
  const n2 = { '2026-03-03': sbD('14:00', '22:00'), '2026-03-04': F('01:00', '02:00', '11:00', 'LIS-FNC-LIS') };
  // … com a apresentação DEPOIS do fim da assistência: chamada (máximo 6:00) ou voo que já estava na escala (11:00) → incerto.
  { const e = dayOf(n2, '2026-03-04');
    eqj('véspera: apresentação 3 h depois do fim da assistência: máximo entre 6:00 e 11:00, incerto — falta saber se foi chamada', [e.psv.result, e.psv.max, e.psv.maxHi, !!e.psv.over, !!e.psv.uncertain, (e.psv.unknowns || []).includes('standbyCall')], ['10:00', '06:00', '11:00', false, true, true]);
    eqj('véspera: … o serviço do dia: 10:30 de certeza, mais 25 % das 3 h se foi chamada (CS FTL.1.225(b)(3))', [e.servicoMin, e.servicoMaxMin], [630, 675]); }
  { const same = { '2026-03-03': { ...sbD('06:00', '14:00'), extra: [F('17:00', '18:00', '03:00', 'LIS-FNC-LIS')] } }, e = dayOf(same, '2026-03-03');
    eqj('véspera: controlo, o mesmo desenho dentro do mesmo dia dá o mesmo (antes: excede)', [e.psv.result, e.psv.max, e.psv.maxHi, !!e.psv.over, !!e.psv.uncertain], ['10:00', '06:00', '11:00', false, true]); }
  // 10 h ou mais, mas menos do que as 12 h da base: as duas leituras (houve um repouso mínimo, ou a assistência foi até à apresentação).
  const n3 = { '2026-03-03': sbD('12:00', '15:00'), '2026-03-04': F('02:00', '03:00', '08:00', 'LIS-FNC-LIS') };
  { const e = dayOf(n3, '2026-03-04'); eqj('véspera: 11 h entre a assistência e o voo: PSV incerto, falta saber se houve repouso', [!!e.psv.over, !!e.psv.uncertain, (e.psv.unknowns || []).includes('standbyRest')], [false, true, true]); }
  // Controlos: com as 12 h cumpridas; com um voo depois da assistência na véspera; sem a escala à mão; mais de 16 h de assistência.
  eqj('véspera: controlo, 14 h entre a assistência e o voo: sem redução', psv(dayOf({ '2026-03-03': sbD('08:00', '12:00'), '2026-03-04': F('02:00', '03:00', '08:00', 'LIS-FNC-LIS') }, '2026-03-04')), ['06:00', '11:00', false, false]);
  eqj('véspera: controlo, a assistência da véspera já levou a um voo nesse dia: não conta outra vez', psv(dayOf({ '2026-03-03': { ...sbD('06:00', '10:00'), extra: [F('12:00', '13:00', '14:00', 'LIS-OPO-LIS')] }, '2026-03-04': F('01:00', '02:00', '11:30', 'LIS-FNC-LIS') }, '2026-03-04')), ['10:30', '11:00', false, false]);
  eqj('véspera: controlo, sem a escala (só o dia): como antes', psv(dayOf(n1, '2026-03-04', false)), ['10:30', '11:00', false, false]);
  // (Revisão independente.) O PSV não tira a leitura da chamada acima das 16 h: com chamada o máximo reduz-se (aqui a zero),
  // sem chamada são as 11:00 → incerto, como no mesmo dia (o repouso desse voo é que diz "curto").
  { const e = dayOf({ '2026-03-03': sbD('08:00', '20:00'), '2026-03-04': F('01:00', '02:00', '07:00', 'LIS-FNC-LIS') }, '2026-03-04').psv;
    eqj('véspera: 17 h do início da assistência à apresentação: máximo entre 0:00 e 11:00 → incerto, como no mesmo dia (antes: dentro)', [e.result, e.max, e.maxHi, !!e.over, !!e.uncertain], ['06:00', '00:00', '11:00', false, true]); }
  // O registo dos dias recalcula o dia do voo quando a assistência da véspera aparece depois.
  { const ctx = { postFlightMin: 30, isPilot: true, base: 'LIS' };
    const log1 = ftlV.reconcileDayLog({ '2026-03-04': n1['2026-03-04'] }, {}, ctx), log2 = ftlV.reconcileDayLog(n1, log1, ctx);
    eqj('véspera: o registo do dia do voo recalcula-se quando a assistência da véspera entra na escala', [log1['2026-03-04'].psv.max, log2['2026-03-04'].psv.max], ['11:00', '06:00']); }

  // ── 1b · Quem calcula o voo SOZINHO (Detalhe do serviço, pós-voo do Início, registo 245) vê a mesma assistência. ──
  // Antes só o registo do dia a via: "Dentro dos limites?" dizia excede (6:00) e o Detalhe do voo mostrava 11:00, dentro.
  const one = (d, iso, fl, x = {}) => { const r = ftlV.ftlForDuty(fl, { base: 'LIS', postFlightMin: 30, isPilot: true, date: iso, duties: d, ...x }); return [r.fdp.actualFdpStr, r.fdp.maxFdpStr, r.fdp.maxHiStr, !!r.fdp.over, !!r.fdp.uncertain]; };
  const day5 = (d, iso) => { const e = dayOf(d, iso).psv; return [e.result, e.max, e.maxHi || e.max, !!e.over, !!e.uncertain]; };
  { const fl = F('18:00', '19:00', '04:30', 'LIS-FNC-LIS');
    const dur = { '2026-03-03': { ...sbD('07:00', '19:00'), extra: [fl] } }, end = { '2026-03-03': { ...sbD('07:00', '18:00'), extra: [fl] } };
    eqj('Detalhe: voo a apresentar-se durante a assistência do mesmo dia: máximo 6:00, excede (antes: 11:00, dentro)', one(dur, '2026-03-03', fl), ['10:30', '06:00', '06:00', true, false]);
    eqj('Detalhe: … igual ao registo do dia', one(dur, '2026-03-03', fl), day5(dur, '2026-03-03'));
    eqj('Detalhe: assistência a acabar à hora da apresentação: entre 6:00 e 11:00, incerto', one(end, '2026-03-03', fl), ['10:30', '06:00', '11:00', false, true]);
    eqj('Detalhe: … igual ao registo do dia', one(end, '2026-03-03', fl), day5(end, '2026-03-03'));
    eqj('Detalhe: a assistência da véspera (apresentação durante ela): máximo 6:00, excede', one(n1, '2026-03-04', n1['2026-03-04']), ['10:30', '06:00', '06:00', true, false]);
    eqj('Detalhe: … e 3 h depois do fim dela: entre 6:00 e 11:00, incerto, como o registo do dia', [one(n2, '2026-03-04', n2['2026-03-04']), day5(n2, '2026-03-04')], [['10:00', '06:00', '11:00', false, true], ['10:00', '06:00', '11:00', false, true]]);
    eqj('Detalhe: controlo, sem a escala à mão: o voo sozinho, como antes', one(dur, '2026-03-03', fl, { duties: null }), ['10:30', '11:00', '11:00', false, false]);
    // A assistência declarada à mão no voo (Completar → "Assistência antes do voo") manda: não se soma a da escala.
    const decl = { ...fl, special: { preStandby: { type: 'other', standbyH: 7 } } };
    // (2026-11-12, 3.ª revisão independente, P3.) 7 h declaradas contra as 11 h da escala: a app não sabe qual está certa →
    // o máximo fica entre as duas leituras (6:00 pela escala, 10:00 pela declarada). Excede nas duas. Antes: só a declarada.
    eqj('Detalhe: 7 h declaradas à mão contra 11 h na escala: máximo entre 6:00 e 10:00, excede nas duas (antes: só 10:00)', one({ '2026-03-03': { ...sbD('07:00', '19:00'), extra: [decl] } }, '2026-03-03', decl), ['10:30', '06:00', '10:00', true, false]);
    const decl11 = { ...fl, special: { preStandby: { type: 'other', standbyH: 11 } } };
    eqj('Detalhe: 11 h declaradas à mão e 11 h na escala (batem): vale a declarada, sem dúvida: máximo 6:00', one({ '2026-03-03': { ...sbD('07:00', '19:00'), extra: [decl11] } }, '2026-03-03', decl11), ['10:30', '06:00', '06:00', true, false]);
    // Um 2.º voo do dia, depois de outro voo, não herda a assistência da manhã.
    const am = F('12:00', '13:00', '14:00', 'LIS-OPO-LIS'), pm = F('22:00', '23:00', '01:00', 'LIS-OPO-LIS');
    eqj('Detalhe: controlo, o 2.º voo do dia não leva a assistência que foi do 1.º', one({ '2026-03-03': { ...sbD('04:00', '12:00'), extra: [am, pm] } }, '2026-03-03', pm).slice(1, 3), ['11:00', '11:00']); }

  // ── 2 · O repouso: chamada ou repouso curto, no mesmo dia como no dia seguinte. ──
  const sameDay = (sbRep, sbEnd, rep, prev = short1) => ({ '2026-03-02': prev, '2026-03-03': { ...sbD(sbRep, sbEnd), extra: [F(rep, '21:00', '22:00', 'LIS-OPO')] } });
  eqj('mesmo dia: assistência 06:00–12:00 e voo às 16:00 (4 h depois): incerto — chamada ou repouso curto (antes: certo)', v(befOf(sameDay('06:00', '12:00', '16:00'), '2026-03-03', '16:00')), ['unc', 'standbyCall', 240, 720, null]);
  eqj('mesmo dia: … 11 h depois (menos do que as 12 h da base): o mesmo incerto', v(befOf(sameDay('02:00', '06:00', '17:00'), '2026-03-03', '17:00')).slice(0, 4), ['unc', 'standbyCall', 660, 720]);
  eqj('mesmo dia: … 12 h depois: certo', befOf(sameDay('02:00', '06:00', '18:00'), '2026-03-03', '18:00').status, 'ok');
  // (2026-11-12, "o que diz a lei nesses casos?") Fora dos limites nas duas leituras, mas por regras diferentes: sem chamada o
  // repouso é curto (CS FTL.1.225(b)(4)); com chamada a assistência foi até à apresentação e passou das 16 h ((b)(1) e (5)).
  // O veredicto fica "Não" e leva o motivo certo (`standbyOver16`, com as horas de assistência que teriam sido).
  { const b = befOf(sameDay('00:30', '08:00', '17:30'), '2026-03-03', '17:30');
    eqj('mesmo dia: 17 h do início da assistência à apresentação: fora nas duas leituras — repouso curto, ou assistência acima das 16 h', [b.status, b.kind, b.actualMin, b.requiredMin, b.standbyMin], ['bad', 'standbyOver16', 570, 720, 1020]);
    const rs = restStatus(sameDay('00:30', '08:00', '17:30'), '2026-03-03', new Date(2026, 2, 3, 9, 0), C);
    eqj('mesmo dia: … o Início diz o mesmo, com o motivo', [rs.status, rs.kind, rs.standbyMin], ['bad', 'standbyOver16', 1020]);
    const nd = befOf({ '2026-03-02': short1, '2026-03-03': sbD('14:00', '22:00'), '2026-03-04': F('07:00', '08:00', '09:00', 'LIS-OPO') }, '2026-03-04');
    eqj('dia seguinte: assistência 14:00–22:00 e voo às 07:00 (17 h): o mesmo', [nd.status, nd.kind, nd.standbyMin], ['bad', 'standbyOver16', 1020]);
    // Controlo: um "curto" que não vem das 16 h (o repouso antes da assistência também é curto) não leva esse motivo.
    eqj('controlo: curto por o repouso de antes da assistência também ser curto: sem o motivo das 16 h', befOf(sameDay('02:00', '06:00', '08:00', long5), '2026-03-03', '08:00').kind || null, null); }
  eqj('mesmo dia: na leitura da chamada o repouso é o de ANTES da assistência — se esse é curto (8 h depois de 13 h de serviço), é curto', befOf(sameDay('02:00', '06:00', '08:00', long5), '2026-03-03', '08:00').status, 'bad');
  eqj('mesmo dia: voo a apresentar-se DURANTE a assistência: chamada de certeza, o repouso de antes da assistência', v(befOf(sameDay('06:00', '14:00', '10:00'), '2026-03-03', '10:00')), ['ok', null, 1170, 720, null]);
  // A assistência que na escala acaba no minuto da apresentação NÃO é uma chamada de certeza: a lei só dispensa o repouso se
  // o voo foi atribuído durante a assistência, e a escala não o diz ("tem que ser como diz a lei", o Nuno, 2026-11-12).
  eqj('mesmo dia: assistência 06:00–12:00 e apresentação às 12:00: incerto — chamada ou repouso curto', v(befOf(sameDay('06:00', '12:00', '12:00'), '2026-03-03', '12:00')), ['unc', 'standbyCall', 0, 720, null]);
  { const d = sameDay('06:00', '12:00', '16:00');
    const rs = restStatus(d, '2026-03-03', new Date(2026, 2, 3, 13, 0), C); eqj('mesmo dia: o Início diz o mesmo', [rs.status, rs.kind, rs.actualMin], ['warn', 'standbyCall', 240]);
    const rv = restVerdicts(d, C).filter((x) => x.nextIso === '2026-03-03'); eqj('mesmo dia: e as Estatísticas', rv.map((x) => [x.status, x.kind]), [['unc', 'standbyCall']]); }
  // De um dia para o outro: como já era abaixo do mínimo; novo é o voo a apresentar-se durante a assistência.
  const nextDay = (sbRep, sbEnd, rep) => ({ '2026-03-02': short1, '2026-03-03': sbD(sbRep, sbEnd), '2026-03-04': F(rep, '08:00', '09:00', 'LIS-OPO') });
  eqj('dia seguinte: 6 h depois do fim da assistência: incerto (como já era)', v(befOf(nextDay('14:00', '22:00', '04:00'), '2026-03-04')), ['unc', 'standbyCall', 360, 720, null]);
  eqj('dia seguinte: apresentação à 01:00, durante a assistência 18:00–02:00: certo, o repouso de antes dela (antes: "Incerto · −1:00")', v(befOf(nextDay('18:00', '02:00', '01:00'), '2026-03-04')), ['ok', null, 1890, 720, null]);
  // Uma assistência colada a um serviço (1 h depois dele) não deixa repouso antes do voo, com ou sem chamada: curto.
  { const glued = { '2026-03-03': { ...long5, extra: [sbD('19:00', '03:00')] }, '2026-03-04': F('02:00', '02:30', '03:30', 'LIS-OPO') };
    const b = restAround(glued, (s, i) => i === '2026-03-04', C).before;
    eqj('assistência 1 h depois de um serviço de 13 h e voo durante ela, no dia seguinte: curto, com a 1 h que houve (não um número negativo)', [b.status, b.actualMin], ['bad', 60]); }

  // A leitura da chamada também chega ao repouso SEGUINTE: se o repouso de antes da assistência foi, talvez, um repouso
  // reduzido, o que vem depois do voo aumenta pela diferença (CS FTL.1.235(c)(3)) — no mesmo dia e no dia seguinte.
  const D13 = F('12:00', '13:00', '00:30', 'LIS-FAO-LIS');   // 13:00 de serviço, fim 01:00 do dia 3
  const after = (rep2) => ({ '2026-03-02': D13, '2026-03-03': sbD('13:30', '21:00'), '2026-03-04': { ...F('01:00', '02:00', '03:00', 'LIS-OPO-LIS'), extra: [F(rep2, '18:00', '19:00', 'LIS-OPO')] } });
  eqj('2.ª ordem: 13 h | 12 h 30 | assistência | 4 h | voo: incerto (chamada ou curto)', v(befOf(after('15:45'), '2026-03-04', '01:00')).slice(0, 4), ['unc', 'standbyCall', 240, 720]);
  eqj('2.ª ordem: … e o repouso a seguir a esse voo, 12 h 15: incerto entre 12:00 e 12:30 (antes: certo)', v(befOf(after('15:45'), '2026-03-04', '15:45')), ['unc', 'reducedRestAfter', 735, 720, 750]);
  eqj('2.ª ordem: … com 12 h 30: certo', befOf(after('16:00'), '2026-03-04', '16:00').status, 'ok');
  { const d = { '2026-03-02': D13, '2026-03-03': sbD('13:30', '21:00'), '2026-03-04': F('01:00', '02:00', '03:00', 'LIS-OPO-LIS') };
    const ru = restUntilAfter(d, '2026-03-04', C); eqj('2.ª ordem: o "Repouso até" depois desse voo dá as duas pontas', [ru.requiredLoMin, ru.requiredHiMin, !!ru.uncertain], [720, 750, true]); }
}

// ───────────────────────────── REVISÃO INDEPENDENTE DAS CORREÇÕES DE 2026-11-12 (dois revisores, repouso e PSV) ─────────────────────────────
// Os erros confirmados com o cenário de cada revisor.
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const { restAround, restUntilAfter } = require(path.resolve('data/today.js'));
  const ftlV = require(path.resolve('ftl/index.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const G = (kind, rep, end, x = {}) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null, ...x });
  const sbD = (rep, end) => G('standby_home', rep, end);
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin];
  const dayOf = (d, iso) => ftlV.dayFtlFromDuties([d[iso], ...(d[iso].extra || [])], { base: 'LIS', postFlightMin: 30, isPilot: true, date: iso, duties: d });
  const short1 = F('06:00', '07:00', '10:00', 'LIS-OPO-LIS');   // fim 10:30

  // ── PSV 1 · A regra dos serviços sobrepostos é só para a assistência seguida de voo. ──
  { const e = dayOf({ '2026-03-03': { ...sbD('06:00', '18:00'), extra: [G('training', '07:00', '20:30')] } }, '2026-03-03');
    eqj('PSV: assistência e formação sobrepostas (dia sem voo): não há PSV, nada excede (erro de hoje: "excede")', [!!e.psv.over, e.psv.result], [false, null]); }
  { const e = dayOf({ '2026-03-03': { ...G('office', '08:00', '17:00'), extra: [G('training', '09:00', '21:30')] } }, '2026-03-03');
    eqj('PSV: escritório e formação sobrepostos: o mesmo', [!!e.psv.over, e.psv.result], [false, null]); }
  { const e = dayOf({ '2026-03-03': { ...F('06:00', '07:00', '20:30', 'LIS-OPO-LIS'), extra: [F('07:00', '07:30', '09:00', 'LIS-OPO-LIS')] } }, '2026-03-03');
    eqj('PSV: um voo encaixado noutro: não é "dentro" de certeza (erro de hoje: dentro)', !!(e.psv.over || e.psv.uncertain), true); }
  { const e = dayOf({ '2026-02-01': { ...F('09:15', '10:00', '13:24', 'LIS-OPO-LIS'), extra: [F('08:45', '09:30', '12:00', 'LIS-OPO-LIS'), F('19:45', '20:30', '08:52', 'LIS-OPO-LIS')] } }, '2026-02-01');
    eqj('PSV: três voos com dois sobrepostos: excede, como antes (erro de hoje: PSV de 0:07, dentro)', !!e.psv.over, true); }
  // Controlo: a assistência no aeroporto SEM alojamento com o voo durante ela é um PSV só, desde a apresentação dela (ORO.FTL.225(d)).
  { const e = dayOf({ '2026-03-03': { ...G('standby_airport', '06:00', '12:00'), extra: [F('10:00', '11:00', '16:00', 'LIS-OPO-LIS')] } }, '2026-03-03');
    eqj('PSV: controlo, serviço no aeroporto 06:00–12:00 e voo às 10:00: PSV de 10:00, desde as 06:00', e.psv.result, '10:00'); }

  // ── PSV 2 · Voo, assistência e outro voo no mesmo dia, com 8 h 30 entre os dois voos: menos do que qualquer repouso. ──
  { const e = dayOf({ '2026-03-03': { ...F('05:00', '06:00', '09:00', 'LIS-OPO-LIS'), extra: [sbD('10:00', '17:00'), F('18:00', '19:00', '23:00', 'LIS-FAO-LIS')] } }, '2026-03-03');
    eqj('PSV: voo | assistência | voo com 8 h 30 entre os voos: um PSV só de 18:00, excede em qualquer leitura (erro de hoje: incerto)', [e.psv.result, !!e.psv.over], ['18:00', true]); }

  // ── PSV 3 · A assistência no aeroporto acaba no fim do período notificado (ORO.FTL.225(b)). ──
  { const e = dayOf({ '2026-03-03': { ...G('standby_airport', '06:00', '12:00', { accommodation: true }), extra: [F('15:00', '16:00', '22:30', 'LIS-OPO-LIS')] } }, '2026-03-03').psv;
    eqj('PSV: assistência no aeroporto 06:00–12:00 e voo às 15:00: 6 h de assistência (não 9) → máximo 10:00 a 12:00, dentro', [e.result, e.max, e.maxHi, !!e.over, !!e.uncertain], ['07:30', '10:00', '12:00', false, false]); }

  // ── PSV 4 · "18 h acordado" (CS FTL.1.225(b)(2)) é dos procedimentos da companhia: com a assistência da ESCALA a app não sabe
  // a que horas o tripulante acordou — não é um erro certo. Com a assistência declarada à mão fica como estava. ──
  { const d = { '2026-03-02': sbD('18:00', '06:00'), '2026-03-03': F('05:00', '05:30', '13:00', 'LIS-OPO-LIS') };
    const r = ftlV.ftlForDuty(d['2026-03-03'], { base: 'LIS', postFlightMin: 30, isPilot: true, date: '2026-03-03', duties: d });
    eqj('PSV: assistência da véspera 18:00–06:00 e voo às 05:00: o máximo reduz-se (7:00, excede), sem o aviso das 18 h acordado', [r.fdp.maxFdpStr, !!r.fdp.over, !!r.fdp.stdbyOver], ['07:00', true, false]);
    const m = ftlV.ftlForDuty({ ...d['2026-03-03'], special: { preStandby: { type: 'other', standbyH: 11 } } }, { base: 'LIS', postFlightMin: 30, isPilot: true, date: '2026-03-03' });
    eqj('PSV: controlo, a mesma assistência declarada à mão: o aviso fica', m.fdp.stdbyOverKind, 'awake'); }

  // ── PSV 5 · Na noite da mudança de hora a assistência do mesmo dia conta-se pelo tempo real, como a da véspera. ──
  { const e = dayOf({ '2026-10-25': { ...sbD('00:00', '10:00'), extra: [F('09:00', '10:00', '18:30', 'LIS-OPO-LIS')] } }, '2026-10-25').psv;
    eqj('PSV: 25/10, assistência 00:00 e apresentação às 09:00 são 10 h reais: máximo garantido 9:00 (antes 10:00)', e.max, '09:00'); }

  // ── Repouso 1 · Duas assistências seguidas (ou uma partida em duas entradas, como o calendário faz à meia-noite) são uma só. ──
  const two = (sb2rep, sb2end, rep) => ({ '2026-03-02': short1, '2026-03-03': { ...sbD('04:00', '08:00'), extra: [sbD(sb2rep, sb2end), F(rep, '15:00', '16:00', 'LIS-OPO')] } });
  eqj('repouso: assistência 04–08 + 08–12 e voo às 11:00 (durante a 2.ª): certo, o repouso de antes da 1.ª (erro de hoje: curto)', v(befOf(two('08:00', '12:00', '11:00'), '2026-03-03', '11:00')), ['ok', null, 1050, 720]);
  // (2026-11-12, 4.ª revisão independente.) Com 1 h LIVRE entre as duas já não são a mesma assistência (só as contíguas o são):
  // chamado na 2.ª, a 1.ª não foi seguida de um repouso; chamado na 1.ª são 7 h de assistência e o repouso de antes chega →
  // incerto, como de um dia para o outro. Este golden exigia "certo" (a regra antiga do mesmo dia juntava as duas).
  eqj('repouso: … 04–08 + 09–12 (1 h livre) e voo às 11:00: incerto — chamada na 1.ª, ou a 1.ª sem repouso (antes: certo)', v(befOf(two('09:00', '12:00', '11:00'), '2026-03-03', '11:00')), ['unc', 'standbyCall', 60, 720]);
  eqj('repouso: … e voo às 14:00 (2 h depois da 2.ª): incerto — chamada ou repouso curto (erro de hoje: curto)', v(befOf(two('09:00', '12:00', '14:00'), '2026-03-03', '14:00')), ['unc', 'standbyCall', 120, 720]);
  { const d = { '2026-03-01': short1, '2026-03-02': sbD('20:00', '00:00'), '2026-03-03': { ...sbD('00:00', '04:00'), extra: [F('03:00', '04:00', '05:00', 'LIS-OPO')] } };
    eqj('repouso: assistência 20:00–00:00 e 00:00–04:00 (partida à meia-noite) e voo às 03:00: certo, 33 h 30 antes dela (erro de hoje: curto)', v(befOf(d, '2026-03-03', '03:00')), ['ok', null, 2010, 720]); }

  // ── Repouso 2 · Um serviço sem apresentação antes da assistência não tira a leitura da chamada. ──
  { const d = { '2026-03-02': { kind: 'flight', block_off: '07:00', block_on: '10:00', sectors: 2, route: 'LIS-OPO-LIS' }, '2026-03-03': { ...sbD('06:00', '12:00'), extra: [F('16:00', '17:00', '18:00', 'LIS-OPO')] } };
    eqj('repouso: voo sem apresentação | assistência + voo 4 h depois: incerto, não curto (erro de hoje no mesmo dia)', befOf(d, '2026-03-03', '16:00').status, 'unc'); }

  // ── Repouso 3 · Uma assistência entre dois serviços do mesmo dia: com chamada é como se não estivesse lá. ──
  { const d = { '2026-03-02': short1, '2026-03-03': { ...G('office', '06:00', '08:00'), extra: [sbD('09:00', '13:00'), F('15:00', '16:00', '17:00', 'LIS-OPO')] } };
    eqj('repouso: escritório, assistência e voo 2 h depois dela, no mesmo dia: incerto (erro de hoje: curto)', v(befOf(d, '2026-03-03', '15:00')), ['unc', 'standbyCall', 120, 720]); }

  // ── Repouso 4 · O mínimo a seguir a uma assistência é o dela; não se mistura com o do voo que vem depois. ──
  { const d = { '2026-03-02': short1, '2026-03-03': { ...sbD('01:00', '05:00'), extra: [F('10:00', '10:30', '23:30', 'LIS-FAO-LIS')] }, '2026-03-04': F('17:00', '18:00', '19:00', 'LIS-OPO') };
    const nd = restAround(d, (s, i) => i === '2026-03-03' && s.kind === 'standby_home', C).need;
    eqj('mínimo a seguir, escolhida a assistência: 12:00, sem misturar com o do voo (erro de hoje: "12:00 a 16:00")', [nd.requiredMin, !!nd.uncertain], [720, false]); }
  { const d = { '2026-03-02': short1, '2026-03-03': sbD('14:00', '22:00'), '2026-03-04': F('04:00', '05:00', '06:00', 'LIS-OPO') };
    const ru = restUntilAfter(d, '2026-03-03', C);
    eqj('"Repouso até" do dia da assistência, com um voo 6 h depois dela: 12:00 depois da assistência, sem dúvida (erro de hoje: "10:00–12:00")', [ru.requiredMin, !!ru.uncertain], [720, false]); }
  { const d = { '2026-03-02': short1, '2026-03-03': sbD('18:00', '02:00'), '2026-03-04': F('01:00', '02:00', '03:00', 'LIS-OPO') };
    const ru = restUntilAfter(d, '2026-03-03', C), u = new Date(ru.untilMs);
    eqj('"Repouso até" do dia da assistência, com o voo chamado durante ela a acabar às 03:30: conta do fim do voo (13:30), não do da assistência', [u.getDate(), u.getHours(), u.getMinutes()], [4, 13, 30]); }

  // ── Repouso 5 · Duas bifurcações seguidas: a leitura "sem chamada na 1.ª, chamada na 2.ª" também conta. ──
  { const d = { '2026-03-01': F('05:00', '06:00', '17:30', 'LIS-FAO-LIS'), '2026-03-02': { ...sbD('06:00', '10:00'), extra: [F('11:00', '12:00', '23:30', 'LIS-FAO-LIS')] }, '2026-03-03': { ...sbD('12:30', '14:00'), extra: [F('15:00', '16:00', '17:00', 'LIS-OPO')] } };
    eqj('repouso: duas bifurcações seguidas, 12 h 30 antes da 2.ª assistência (só como repouso reduzido): incerto (já era curto antes de hoje)', befOf(d, '2026-03-03', '15:00').status, 'unc'); }
}

// ───────────────────────────── UM SERVIÇO SEM HORA DE FIM ANTES DE UMA ASSISTÊNCIA OU DE UM SERVIÇO EM TERRA (2026-11-13) ─────────────────────────────
// Um serviço sem hora de fim, depois uma assistência em casa ou um escritório, depois um voo: a app dava "certo" pelo piso
// (12 h). Mas o mínimo pode medir-se por esse serviço (a leitura do último serviço verdadeiro; as horas a mais de um voo), e
// dele não se sabe quanto durou → incerto, com o que falta ("a lei é que manda": sem um facto, não há veredicto inventado).
// Abaixo do piso continua curto.
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const { restAround, restStatus, restVerdicts, restUntilAfter } = require(path.resolve('data/today.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const G = (kind, rep, end) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const befOf = (d, iso) => restAround(d, (s, i) => i === iso, C).before;
  const noEnd = { kind: 'flight', report_time: '07:00', sectors: 2, route: 'LIS-FAO-LIS' };   // sem block_on nem sign-off
  const mk = (mid, rep, first = noEnd) => ({ '2026-03-02': first, '2026-03-03': mid, '2026-03-04': F(rep, '08:00', '09:00', 'LIS-OPO') });
  const sb = G('standby_home', '10:00', '14:00'), of = G('office', '10:00', '14:00');
  const v = (r) => [r.status, r.kind || null, r.actualMin, r.requiredMin, r.estIso || null];

  eqj('voo sem hora de fim | assistência em casa | 12 h | voo: incerto, falta o fim desse serviço (antes: certo)', v(befOf(mk(sb, '02:00'), '2026-03-04')), ['unc', 'noEnd', 720, 720, '2026-03-02']);
  eqj('voo sem hora de fim | escritório | 12 h | voo: o mesmo (antes: certo)', v(befOf(mk(of, '02:00'), '2026-03-04')), ['unc', 'noEnd', 720, 720, '2026-03-02']);
  // (2026-11-12, R8 da 3.ª revisão; o Nuno: "a lei é que está certa".) HÁ um teto, e vem da lei: o período de serviço começa
  // na apresentação e acaba quando o tripulante fica livre de todos os serviços (ORO.FTL.105(11)) — o do serviço sem fim não
  // pode ser mais longo do que o tempo da apresentação dele (07:00 do dia 2) ao fim do último serviço antes do repouso (14:00
  // do dia 3): 31 h. O mínimo a seguir é esse período ou o piso (ORO.FTL.235(a)(1); 14 h no máximo, CS FTL.1.235(b)(3)(ii) e
  // CS FTL.1.205(c)(6)), mais as horas de um prolongamento (4 h no máximo, ORO.FTL.205(d)(1)) → 35 h em qualquer leitura.
  // Com 60 h de repouso está certo em todas; este golden dizia "incerto, sem teto".
  { const fonte = fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-en.txt'), 'utf8').replace(/\s+/g, ' ');
    eq('fonte: ORO.FTL.105(11) o período de serviço acaba quando o tripulante fica livre de todos os serviços', fonte.includes('“duty period” means a period which starts when a crew member is required by an operator to report for or to commence a duty and ends when that person is free of all duties, including post-flight duty'), true);
    const far = (rep, day) => befOf({ ...mk(sb, '02:00'), '2026-03-04': undefined, [day]: F(rep, '08:00', '09:00', 'LIS-OPO') }, day);
    eqj('… com 60 h livres depois da assistência: certo — chega em qualquer leitura (teto de 35:00; antes: incerto, "sem teto")', [far('02:00', '2026-03-06').status, far('02:00', '2026-03-06').requiredMin], ['ok', 2100]);
    const near = far('20:00', '2026-03-04');   // 30 h depois da assistência: abaixo do teto
    eqj('… com 30 h livres: incerto, entre as 12:00 e o teto de 35:00', [near.status, near.kind, near.actualMin, near.requiredMin, near.requiredHiMin], ['unc', 'noEnd', 1800, 720, 2100]); }
  eqj('… 11 h depois da assistência (abaixo do piso, e 15 h desde o início dela: pode ser chamada): não é certo', befOf(mk(sb, '01:00'), '2026-03-04').status !== 'ok', true);
  eqj('… 11 h depois do escritório: curto (12:00 em qualquer leitura)', v(befOf(mk(of, '01:00'), '2026-03-04')).slice(0, 4), ['bad', null, 660, 720]);
  eqj('escritório sem hora de fim | assistência em casa | 12 h | voo: incerto, falta o fim', v(befOf(mk(sb, '02:00', { kind: 'office', report_time: '09:00', sectors: 0 }), '2026-03-04')).slice(0, 2), ['unc', 'noEnd']);
  eqj('controlo: o mesmo voo COM hora de fim: certo', befOf(mk(sb, '02:00', F('07:00', '08:00', '11:00', 'LIS-FAO-LIS')), '2026-03-04').status, 'ok');
  { const d = mk(sb, '02:00');
    const rs = restStatus(d, '2026-03-04', new Date(2026, 2, 4, 1, 0), C); eqj('… o Início diz o mesmo', [rs.status, rs.kind, rs.estIso], ['warn', 'noEnd', '2026-03-02']);
    const rv = restVerdicts(d, C).filter((x) => x.nextIso === '2026-03-04')[0]; eqj('… e as Estatísticas', [rv.status, rv.kind], ['unc', 'noEnd']);
    const d2 = { '2026-03-02': noEnd, '2026-03-03': sb };
    const ru = restUntilAfter(d2, '2026-03-03', C), nd = restAround(d2, (s, i) => i === '2026-03-03', C).need;
    eqj('… o "Repouso até" e a Simulação: entre as 12:00 e o teto de 35:00, com o motivo (antes: sem teto)', [ru.requiredLoMin, ru.requiredHiMin, !!ru.uncertain, ru.why, ru.estIso, nd.requiredLoMin, nd.requiredHiMin, nd.why], [720, 2100, true, 'noEnd', '2026-03-02', 720, 2100, 'noEnd']);
    // Um repouso CONHECIDO, depois do serviço sem fim e acima do teto (44 h entre duas assistências), já cobre o mínimo dele.
    const d3 = { '2026-03-02': noEnd, '2026-03-03': G('standby_home', '00:00', '04:00'), '2026-03-05': { ...G('standby_home', '00:00', '04:00'), extra: [F('16:00', '17:00', '18:00', 'LIS-OPO')] } };
    eqj('voo sem hora de fim | assistência | 44 h livres | assistência | 12 h | voo: certo (R8; antes: incerto)', restAround(d3, (s, i) => i === '2026-03-05' && s.kind === 'flight', C).before.status, 'ok'); }
}

// ───────────────────────────── 2.ª REVISÃO INDEPENDENTE (2026-11-12/13): o PSV com a assistência em várias entradas ─────────────────────────────
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const ftlV = require(path.resolve('ftl/index.js'));
  const O = { base: 'LIS', postFlightMin: 30, isPilot: true };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const sbD = (rep, end) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const dayOf = (d, iso) => ftlV.dayFtlFromDuties([d[iso], ...(d[iso].extra || [])], { ...O, date: iso, duties: d });
  const psv = (e) => [e.psv.result, e.psv.max, !!e.psv.over, !!e.psv.uncertain];
  const one = (d, iso, fl) => { const r = ftlV.ftlForDuty(fl, { ...O, date: iso, duties: d }); return [r.fdp.actualFdpStr, r.fdp.maxFdpStr, !!r.fdp.over, !!r.fdp.uncertain]; };

  // ── 1 · Uma assistência partida à meia-noite (como o calendário a guarda): 18:00–00:00 na véspera e 00:00–06:00 hoje. ──
  // São 11 h de assistência até à apresentação das 05:00 → máximo 7:00 (CS FTL.1.225(b)(5) e (7)). Antes: só as 5 h de hoje,
  // dentro da janela da noite → máximo 12:00, "dentro".
  { const fl = F('05:00', '05:30', '16:00', 'LIS-OPO-LIS');
    const d = { '2026-03-02': sbD('18:00', '00:00'), '2026-03-03': { ...sbD('00:00', '06:00'), extra: [fl] } };
    const c = { '2026-03-02': sbD('18:00', '06:00'), '2026-03-03': fl };
    eqj('assistência partida à meia-noite (18–00 + 00–06) e voo às 05:00: máximo 7:00, excede (antes: 12:00, dentro)', psv(dayOf(d, '2026-03-03')), ['11:00', '07:00', true, false]);
    eqj('… igual à mesma assistência numa só entrada', psv(dayOf(d, '2026-03-03')), psv(dayOf(c, '2026-03-03')));
    eqj('… e o voo sozinho (Detalhe) diz o mesmo', one(d, '2026-03-03', fl), ['11:00', '07:00', true, false]);
    eqj('… o 210 de hoje: o serviço do voo (11:30) mais 25 % das 5 h de assistência de hoje (as 6 h da véspera ficaram lá)', dayOf(d, '2026-03-03').servicoMin, 765); }

  // ── 2 · Duas assistências seguidas no mesmo dia antes do voo são uma só. ──
  { const fl = F('16:00', '16:30', '02:00', 'LIS-OPO-LIS');
    const d = { '2026-03-03': { ...sbD('07:00', '11:00'), extra: [sbD('11:00', '17:00'), fl] } };
    const c = { '2026-03-03': { ...sbD('07:00', '17:00'), extra: [fl] } };
    eqj('assistência 07–11 + 11–17 e voo às 16:00: PSV 10:00 contra 8:30, excede (erro: um PSV de 19:00 contado das 07:00)', psv(dayOf(d, '2026-03-03')), ['10:00', '08:30', true, false]);
    eqj('… igual à mesma assistência numa só entrada, também no 210', [psv(dayOf(d, '2026-03-03')), dayOf(d, '2026-03-03').servicoMin], [psv(dayOf(c, '2026-03-03')), dayOf(c, '2026-03-03').servicoMin]);
    eqj('… e o voo sozinho diz o mesmo (antes: 11:30, dentro)', one(d, '2026-03-03', fl), ['10:00', '08:30', true, false]);
    const e = dayOf({ '2026-03-03': { ...sbD('04:00', '08:00'), extra: [sbD('08:00', '12:00'), F('11:00', '11:30', '20:00', 'LIS-OPO-LIS')] } }, '2026-03-03');
    eqj('assistência 04–08 + 08–12 e voo às 11:00 (9:00 de PSV): dentro (erro: 16:00, excede)', [e.psv.result, !!e.psv.over], ['09:00', false]); }

  // ── 3 · A assistência da escala e a mesma declarada à mão no voo: vale a declarada, uma vez. ──
  { const fl = { ...F('18:00', '19:00', '04:30', 'LIS-FNC-LIS'), special: { preStandby: { type: 'other', standbyH: 7 } } };
    const e = dayOf({ '2026-03-03': { ...sbD('07:00', '19:00'), extra: [fl] } }, '2026-03-03');
    // (2026-11-12, P3.) As 7 h declaradas não batem com as 11 h da escala: máximo 6:00 a 10:00 (excede nas duas); o 210 conta
    // a assistência uma vez em cada leitura — 765 se a certa é a declarada, 825 se é a da escala.
    eqj('assistência na escala (11 h) + declarada à mão (7 h): PSV 10:30 contra 6:00 a 10:00, e o 210 conta-a uma vez (765 a 825)', [e.psv.result, e.psv.max, e.psv.maxHi, !!e.psv.over, e.servicoMin, e.servicoMaxMin], ['10:30', '06:00', '10:00', true, 765, 825]); }

  // ── 4 · O registo recalcula o dia do voo também quando a assistência da véspera entra como 2.º serviço desse dia. ──
  { const d1 = { '2026-03-02': F('06:00', '07:00', '09:00', 'LIS-OPO-LIS'), '2026-03-03': F('01:00', '02:00', '11:30', 'LIS-FNC-LIS') };
    const log1 = ftlV.reconcileDayLog(d1, {}, O);
    const d2 = { ...d1, '2026-03-02': { ...d1['2026-03-02'], extra: [sbD('14:00', '02:00')] } };
    const log2 = ftlV.reconcileDayLog(d2, log1, O);
    eqj('registo: a assistência entra no 2.º serviço da véspera → o dia do voo recalcula-se (erro: ficava 11:00)', [log1['2026-03-03'].psv.max, log2['2026-03-03'].psv.max], ['11:00', '06:00']);
    eq('registo: … e a chamada seguinte não mexe em nada', ftlV.reconcileDayLog(d2, log2, O) === log2, true); }
}

// ───────────────────────────── 2.ª REVISÃO INDEPENDENTE (2026-11-12/13): o repouso com a assistência em várias entradas ─────────────────────────────
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const { restAround, restUntilAfter } = require(path.resolve('data/today.js'));
  const ftlV = require(path.resolve('ftl/index.js'));
  const C = { postFlightMin: 30, isPilot: true, base: 'LIS' };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const G = (kind, rep, end) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null });
  const sbD = (rep, end) => G('standby_home', rep, end);
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : true), C).before;
  const short1 = F('06:00', '07:00', '10:00', 'LIS-OPO-LIS');   // fim 10:30

  // ── 1 · Duas assistências com TEMPO LIVRE entre elas não são uma só (só as contíguas o são). ──
  // 06:00–14:00, 11 h livres, 01:00–08:00 e voo às 07:00 (durante a 2.ª). Chamado na 2.ª, a 1.ª tinha de ser seguida de um
  // repouso e 11 h não chegam. Chamado na 1.ª: entre o fim dela (14:00) e a apresentação (07:00) há 17 h — um repouso mínimo, e
  // "this time period should not count as standby duty" (GM1 CS FTL.1.225 (b)): a assistência foi de 8 h, não de 25 → essa
  // leitura não falha → INCERTO. (3.ª revisão independente, R3: este golden exigia "curto" — contava as 25 h contra o teto
  // das 16 h sem ver o repouso mínimo.)
  { const b = befOf({ '2026-03-02': short1, '2026-03-03': sbD('06:00', '14:00'), '2026-03-04': { ...sbD('01:00', '08:00'), extra: [F('07:00', '07:30', '08:30', 'LIS-OPO')] } }, '2026-03-04', '07:00');
    eqj('assistência, 11 h livres, assistência e voo durante ela, com 17 h desde o fim da 1.ª: incerto (R3; antes: curto)', [b.status, b.kind, b.actualMin, b.requiredMin], ['unc', 'standbyCall', 660, 720]);
    // Controlo: sem repouso mínimo desde o fim da 1.ª (11 h) e mais de 16 h desde o início dela → curto nas duas leituras.
    const c = befOf({ '2026-03-02': short1, '2026-03-03': sbD('06:00', '15:00'), '2026-03-04': { ...sbD('01:30', '08:00'), extra: [F('02:00', '02:30', '03:30', 'LIS-OPO')] } }, '2026-03-04', '02:00');
    eqj('controlo: 11 h desde o fim da 1.ª e 20 h desde o início: curto nas duas leituras', [c.status, c.actualMin, c.requiredMin], ['bad', 630, 720]); }
  // 20:00–23:00, 10 h livres, 09:00–13:00 e voo às 12:00: chamado na 1.ª são 16 h (cabe); chamado na 2.ª o repouso foi de 10 h → incerto.
  { const b = befOf({ '2026-03-02': short1, '2026-03-03': sbD('20:00', '23:00'), '2026-03-04': { ...sbD('09:00', '13:00'), extra: [F('12:00', '13:00', '14:00', 'LIS-OPO')] } }, '2026-03-04', '12:00');
    eqj('assistência, 10 h livres, assistência e voo durante ela (16 h desde a 1.ª): incerto (erro: certo)', [b.status, b.kind], ['unc', 'standbyCall']); }
  // Um voo sem apresentação entre as duas assistências: 2 h 30 antes do voo chamado → não é "certo".
  { const b = befOf({ '2026-03-01': short1, '2026-03-02': sbD('18:00', '22:00'), '2026-03-03': { kind: 'flight', block_off: '00:00', block_on: '02:00', sectors: 2, route: 'LIS-OPO-LIS', extra: [sbD('05:00', '12:00'), F('10:00', '10:30', '11:30', 'LIS-OPO')] } }, '2026-03-03', '10:00');
    eqj('um voo sem apresentação entre duas assistências: o voo chamado na 2.ª não fica "certo" (erro: certo, 31:30)', b.status !== 'ok', true); }

  // ── 2 · A assistência colada a um serviço (10 h depois dele) e o voo chamado durante ela no dia seguinte. ──
  // Se as 10 h são um repouso, é curto (12 h na base); se são um intervalo, é um PSV só das 06:00 às 03:00. Curto (erro: certo).
  { const b = befOf({ '2026-03-02': short1, '2026-03-03': { ...F('06:00', '07:00', '10:00', 'LIS-OPO-LIS'), extra: [sbD('20:30', '03:00')] }, '2026-03-04': F('01:00', '01:30', '02:30', 'LIS-OPO') }, '2026-03-04');
    eqj('assistência 10 h depois de um voo e chamada durante ela no dia seguinte: curto, com as 10 h (erro: certo, 19:30)', [b.status, b.actualMin, b.requiredMin], ['bad', 600, 720]); }

  // ── 3 · Uma assistência de mais de 16 h com a chamada durante ela: o repouso está certo; quem falha é a assistência (PSV). ──
  { const d = { '2026-03-02': short1, '2026-03-03': { ...sbD('04:00', '23:00'), extra: [F('22:00', '22:30', '23:30', 'LIS-OPO')] } };
    const e = ftlV.dayFtlFromDuties([d['2026-03-03'], ...d['2026-03-03'].extra], { base: 'LIS', postFlightMin: 30, isPilot: true, date: '2026-03-03', duties: d });
    eqj('assistência 04:00–23:00 e apresentação às 22:00 (18 h): o dia marca a assistência acima das 16 h (CS FTL.1.225(b)(1); antes: nada)', !!e.psv.sbOver, true); }

  // ── 4 · "Só podia ser um repouso reduzido" exige que o bloco seguinte NÃO possa ser um repartido. ──
  // Escritório + voo 9 h 30 depois pode ser um repartido: então o repouso de antes foi só curto (ORO.FTL.220(c)) e o seguinte
  // ainda pode ser o 1.º repouso reduzido → incerto (erro da correção de ontem: "curto").
  { const d = { '2026-03-01': G('standby_airport', '18:31', '01:41'), '2026-03-02': { ...F('06:47', '07:47', '09:13', 'LIS-FNC'), extra: [G('office', '10:18', '19:27')] },
      '2026-03-03': { ...G('office', '06:29', '10:11'), extra: [F('19:47', '20:47', '00:36', 'FNC-LIS')] }, '2026-03-04': F('17:26', '17:56', '22:46', 'LIS-OPO-LIS') };
    eqj('repouso depois de "escritório + voo" que veio de um repouso abaixo do mínimo: incerto, não curto', befOf(d, '2026-03-04').status, 'unc'); }

  // ── 5 · O "Repouso até" depois de uma chamada conta do fim do VOO, não do fim da assistência que estava na escala. ──
  { const ru = restUntilAfter({ '2026-03-02': short1, '2026-03-03': { ...sbD('18:00', '06:00'), extra: [F('19:00', '19:30', '22:30', 'LIS-OPO-LIS')] } }, '2026-03-03', C), u = new Date(ru.untilMs);
    eqj('assistência 18:00–06:00 com o voo chamado a acabar às 23:00: "Repouso até" às 11:00 do dia seguinte (erro: 18:00)', [u.getDate(), u.getHours(), u.getMinutes()], [4, 11, 0]); }
}

// ───────────────────────────── A SÉRIE DE ASSISTÊNCIAS NUM SÓ SÍTIO (2026-11-12, depois da 3.ª revisão independente) ─────────────────────────────
// "A assistência antes de um voo" calculava-se em três sítios com regras diferentes; cada remendo desalinhava os outros. Agora
// lê-se de ftl/standbySeries.js: as entradas do mesmo tipo contíguas ou sobrepostas — em qualquer dia, por qualquer ordem,
// duplicadas ou uma dentro da outra — são UMA assistência, do início ao maior fim. O teste que manda: várias entradas dão o
// mesmo que a entrada única (PSV, ORO.FTL.210 por dia local, repouso). Depois, os 13 casos da 3.ª revisão (P1–P5, R1–R7; o R8
// ficou por decidir — ver docs/decisoes.md).
{
  const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));
  const norm = (s) => s.replace(/\s+/g, ' ');
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-en.txt'), 'utf8'));
  const sbS = require(path.resolve('ftl/standbySeries.js'));
  const ftlV = require(path.resolve('ftl/index.js'));
  const { restAround, restUntilAfter, restVerdicts } = require(path.resolve('data/today.js'));
  const { dayMin } = require(path.resolve('ftl/calculators/cumulativeCalculator.js'));
  const O = { base: 'LIS', postFlightMin: 30, isPilot: true };
  const F = (rep, off, on, route, x = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors: route.split('-').length - 1, flight_minutes: 60, route, ...x });
  const G = (kind, rep, end, x = {}) => ({ kind, report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null, ...x });
  const sbD = (rep, end) => G('standby_home', rep, end);
  const sbA = (rep, end) => G('standby_airport', rep, end, { accommodation: true });
  const dayOf = (d, iso) => ftlV.dayFtlFromDuties([d[iso], ...(d[iso].extra || [])], { ...O, date: iso, duties: d });
  const psv = (e) => (e ? [e.psv.result, e.psv.max, e.psv.maxHi || null, !!e.psv.over, !!e.psv.uncertain] : null);
  const one = (d, iso, fl) => { const r = ftlV.ftlForDuty(fl, { ...O, date: iso, duties: d }); return [r.fdp.actualFdpStr, r.fdp.maxFdpStr, r.fdp.exact ? null : r.fdp.maxHiStr, !!r.fdp.over, !!r.fdp.uncertain]; };
  const befOf = (d, iso, rep) => restAround(d, (s, i) => i === iso && (rep ? s.report_time === rep : (s.kind || 'flight') === 'flight'), O).before;
  const v = (r) => (r ? [r.status, r.kind || null, r.actualMin, r.requiredMin] : null);
  const short1 = F('06:00', '07:00', '10:00', 'LIS-OPO-LIS');   // fim 10:30
  const long5 = F('05:00', '06:00', '17:30', 'LIS-FAO-LIS');    // 13:00 de serviço, fim 18:00
  // O ORO.FTL.210 por DIA LOCAL de uma escala (o que os períodos de 7, 14 e 28 dias somam).
  const d210 = (d) => { const log = ftlV.reconcileDayLog(d, {}, O); const out = {}; for (let k = 1; k <= 7; k++) { const iso = `2026-03-0${k}`, m = dayMin(log, iso, 'servico'); if (m) out[iso] = m; } return out; };

  eq('fonte: CS FTL.1.225(b)(5) a assistência acaba na apresentação', cs.includes('standby ceases when the crew member reports at the designated reporting'), true);
  eq('fonte: CS FTL.1.225(b)(1) a assistência fora do aeroporto dura no máximo 16 h', cs.includes('the maximum duration of standby other than airport standby is 16 hours'), true);
  eq('fonte: GM1 CS FTL.1.225 (b) com um repouso mínimo antes da apresentação, esse tempo não é assistência', cs.includes('If a minimum rest period as specified in ORO.FTL.235 is provided before reporting for the duty assigned during the standby, this time period should not count as standby duty'), true);
  eq('fonte: ORO.FTL.225(a) o início e o fim da assistência são definidos e notificados', reg.includes('the start and end time of standby shall be defined and'), true);
  eq('o repouso mais curto do módulo das séries é o do motor', sbS.SB_SHORTEST_REST_MIN, ftlV.SHORTEST_REST_MIN);

  // ── A função: as séries de uma escala. ──
  { const days = [{ iso: '2026-03-02', list: [sbD('18:00', '00:00')] }, { iso: '2026-03-03', list: [sbD('00:00', '06:00'), sbD('09:00', '10:00'), sbA('09:00', '12:00'), sbD('03:00', '04:00')] }];
    const ss = sbS.standbySeries(days).map((S) => [S.type, S.startIso, sbS.sbHhmm(S.startMs), sbS.sbHhmm(S.endMs), S.members.length]);
    eqj('séries: 18–00 + 00–06 + (03–04 lá dentro) = uma, de 18:00 a 06:00; a das 09:00 em casa é outra; a do aeroporto é de outro tipo', ss, [['other', '2026-03-02', '18:00', '06:00', 3], ['airport', '2026-03-03', '09:00', '12:00', 1], ['other', '2026-03-03', '09:00', '10:00', 1]]);
    const S = sbS.standbySeries(days)[0];
    eqj('séries: o pedaço de cada entrada (o que as anteriores não cobriam): 18–00, 00–06, e nada da que está dentro', S.members.map((m) => [sbS.sbHhmm(m.segStartMs), sbS.sbHhmm(m.segEndMs)]), [['18:00', '00:00'], ['00:00', '06:00'], ['06:00', '06:00']]);
    eqj('séries: o 210 é cumulativo — 18:00→05:10 (670 min, 25 %) = 168, em pedaços 90 + 78', [sbS.standbyCountMin(S, S.startMs, S.endMs, S.startMs + 670 * 60000), sbS.standbyCountMin(S, S.members[0].segStartMs, S.members[0].segEndMs, S.startMs + 670 * 60000), sbS.standbyCountMin(S, S.members[1].segStartMs, S.members[1].segEndMs, S.startMs + 670 * 60000)], [168, 90, 78]);
    eqj('leitura: durante → certa; do fim até 10 h → chamada?; 10 h até ao repouso → repouso?; depois → nada', [sbS.standbyReading({ during: true, gapMin: -60 }, 720), sbS.standbyReading({ during: false, gapMin: 0 }, 720), sbS.standbyReading({ during: false, gapMin: 600 }, 720), sbS.standbyReading({ during: false, gapMin: 720 }, 720)], ['certain', 'call', 'rest', 'none']); }

  // ── A GRELHA: várias entradas contra a entrada única (o teste escrito primeiro). ──
  // A mesma assistência (início, fim) guardada de 7 maneiras, com o voo a apresentar-se antes do fim, à hora do fim e depois,
  // no mesmo dia e de um dia para o outro: o PSV do dia do voo, o voo sozinho, o 210 de cada dia local e o repouso têm de ser
  // os da entrada única.
  { const pad = (n) => String(n).padStart(2, '0');
    const hmS = (m) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad((((m % 1440) + 1440) % 1440) % 60)}`;
    const isoOf = (k) => `2026-03-0${3 + k}`;
    // As maneiras de partir [a, b] (minutos desde as 00:00 do dia 0) em entradas { t0, t1 }.
    const shapes = (a, b) => {
      const mid = a + Math.round((b - a) / 2 / 15) * 15, out = [[[a, mid], [mid, b]], [[mid, b], [a, mid]], [[a, b], [a, mid]], [[a, mid], [a, b]], [[a, b], [a + 30, b - 30]], [[a, mid + 60], [mid, b]], [[a, a + 60], [a + 60, mid], [mid, b]]];
      if (a < 1440 && b > 1440) out.push([[a, 1440], [1440, b]], [[a, Math.min(b, 1500)], [1440, b]]);
      return out.filter((sh) => sh.every(([x, y]) => y > x));
    };
    const build = (pieces, kind, flight, repT) => {
      const d = { '2026-03-01': short1 };
      const put = (t, s) => { const iso = isoOf(Math.floor(t / 1440)); d[iso] = d[iso] ? { ...d[iso], extra: [...(d[iso].extra || []), s] } : s; };
      for (const [x, y] of pieces) put(x, kind === 'airport' ? sbA(hmS(x), hmS(y)) : sbD(hmS(x), hmS(y)));
      if (flight) put(repT, flight);
      return d;
    };
    let n = 0; const bad = [];
    for (const kind of ['other', 'airport']) for (const a of [14 * 60, 18 * 60, 20 * 60 + 30]) for (const dur of [240, 480, 630, 780]) for (const gap of [-120, -15, 0, 180, 615, 735]) for (const fdp of [360, 600]) {
      const b = a + dur, repT = b + gap;
      if (repT <= a + 30) continue;
      const fl = F(hmS(repT), hmS(repT + 45), hmS(repT + fdp), 'LIS-FNC-LIS');
      const fIso = isoOf(Math.floor(repT / 1440));
      const base = build([[a, b]], kind, fl, repT);
      const key = (d) => JSON.stringify([psv(dayOf(d, fIso)), one(d, fIso, fl), d210(d), v(restAround(d, (x) => x === fl, O).before), (restUntilAfter(d, isoOf(Math.floor(a / 1440)), O) || {}).untilMs || null]);
      const kb = key(base);
      for (const sh of shapes(a, b)) { n++; const ks = key(build(sh, kind, fl, repT)); if (ks !== kb && bad.length < 3) bad.push(`${kind} ${hmS(a)}–${hmS(b)} voo ${hmS(repT)} ${JSON.stringify(sh)}\n        única:  ${kb}\n        várias: ${ks}`); else if (ks !== kb) bad.push(''); }
    }
    eq(`grelha: ${n} escalas com a assistência em várias entradas dão o mesmo que a entrada única (PSV, voo sozinho, 210 por dia, repouso, "Repouso até")${bad.length ? '\n        ' + bad.filter(Boolean).join('\n        ') : ''}`, bad.length, 0);
    eq('grelha: tem casos que cheguem', n > 2000, true); }

  // ── P1 · Duas entradas na VÉSPERA (14–21 + 21–04) e voo às 03:00: 13 h de assistência → máximo 4:00, excede (era 11:00, dentro). ──
  { const fl = F('03:00', '03:30', '09:00', 'LIS-OPO-LIS');
    const d = { '2026-03-03': { ...sbD('14:00', '21:00'), extra: [sbD('21:00', '04:00')] }, '2026-03-04': fl };
    eqj('P1: duas entradas na véspera e voo às 03:00: máximo 4:00, excede', psv(dayOf(d, '2026-03-04')), ['06:00', '04:00', null, true, false]);
    eqj('P1: … e o voo sozinho', one(d, '2026-03-04', fl), ['06:00', '04:00', null, true, false]);
    // A véspera: uma assistência só, de 14:00 até à apresentação das 03:00 (13 h, 25 %) — e não um "PSV" de 14 h a exceder.
    const y = dayOf(d, '2026-03-03');
    eqj('P1: a véspera é um dia de assistência (sem PSV): 25 % das 13 h até à apresentação, 45 min já depois da meia-noite (era: PSV de 14:00, "excede")', [y.psv.result, !!y.psv.over, y.servicoMin, y.servicoNextMin], [null, false, 195, 45]); }

  // ── P2 · Uma entrada dentro de outra, ou com o mesmo início: conta o MAIOR fim, por qualquer ordem. ──
  { const fl = F('13:00', '13:30', '22:30', 'LIS-OPO-LIS');
    const a = dayOf({ '2026-03-03': { ...sbA('06:00', '14:00'), extra: [sbA('07:00', '08:00'), fl] } }, '2026-03-03');
    const b = dayOf({ '2026-03-03': { ...sbA('07:00', '08:00'), extra: [sbA('06:00', '14:00'), fl] } }, '2026-03-03');
    eqj('P2: aeroporto 06–14 + 07–08 (dentro) e voo às 13:00: 7 h de assistência → máximo 9:00, excede (era 13:00, dentro)', [psv(a), a.servicoMin], [['09:30', '09:00', null, true, false], 1020]);
    eqj('P2: … pela outra ordem, o mesmo', [psv(b), b.servicoMin], [psv(a), a.servicoMin]); }

  // ── P3 · A declarada à mão que NÃO bate com a da escala; e a da escala que é OUTRA assistência. ──
  { const fl = { ...F('18:00', '19:00', '04:30', 'LIS-FNC-LIS'), special: { preStandby: { type: 'other', standbyH: 2 } } };
    const e = dayOf({ '2026-03-03': { ...sbD('06:00', '18:00'), extra: [fl] } }, '2026-03-03');
    // 12 h na escala (até à apresentação) → 11:00 − 6:00 = 5:00; 2 h declaradas → 11:00. PSV 10:30: excede numa, dentro na outra.
    eqj('P3: 12 h na escala e 2 h declaradas à mão: máximo entre 5:00 e 11:00 → incerto, falta saber qual está certa (era 11:00, dentro)', [psv(e), (e.psv.unknowns || []).includes('standbyDeclared')], [['10:30', '05:00', '11:00', false, true], true]);
    eqj('P3: … o 210: 660 do voo + 30 (declarada) a 180 (escala)', [e.servicoMin, e.servicoMaxMin], [690, 840]);
    const { unknownLabel } = require(path.resolve('data/ftlUnknowns.js'));
    eq('P3: o motivo tem texto', unknownLabel('standbyDeclared') !== 'standbyDeclared' && unknownLabel('standbyDeclared', 'en') !== 'standbyDeclared', true);
    // Assistência em casa 06–08 na escala e voo às 14:00 com 3 h de assistência NO AEROPORTO declaradas: são duas assistências.
    const fl2 = { ...F('14:00', '15:00', '20:00', 'LIS-FNC-LIS'), special: { preStandby: { type: 'airport', standbyH: 3 } } };
    const e2 = dayOf({ '2026-03-03': { ...sbD('06:00', '08:00'), extra: [fl2] } }, '2026-03-03');
    eqj('P3: a da escala é OUTRA (em casa 06–08) e a declarada é no aeroporto: contam as duas — 390 + 180 + 30 (era 570: a de casa saía do 210)', [e2.psv.result, e2.psv.max, !!e2.psv.over, !!e2.psv.uncertain, e2.servicoMin], ['06:00', '12:30', false, false, 600]);
    // Com a assistência na véspera também se confere (antes: a declarada nem olhava para a véspera).
    const fl3 = { ...F('03:00', '03:30', '09:00', 'LIS-OPO-LIS'), special: { preStandby: { type: 'other', standbyH: 3 } } };
    eqj('P3: 13 h na véspera e 3 h declaradas: máximo entre 4:00 e 11:00 → incerto', psv(dayOf({ '2026-03-03': sbD('14:00', '04:00'), '2026-03-04': fl3 }, '2026-03-04')), ['06:00', '04:00', '11:00', false, true]); }

  // ── P4 · Entradas sobrepostas (véspera 18–01 + hoje 00–06) não contam a dobrar no 210. ──
  { const fl = F('05:00', '05:30', '10:00', 'LIS-OPO-LIS');
    const d = { '2026-03-02': sbD('18:00', '01:00'), '2026-03-03': { ...sbD('00:00', '06:00'), extra: [fl] } };
    const c = { '2026-03-02': sbD('18:00', '06:00'), '2026-03-03': fl };
    // 18:00 → 05:00 (a apresentação) = 11 h de assistência = 165 min de serviço: 90 no dia 2 e 75 no dia 3, mais os 330 do voo.
    eqj('P4: sobrepostas — o 210 por dia local: 90 e 405, como a entrada única (era 90 e 420: a hora 00–01 a dobrar)', [d210(d), d210(c)], [{ '2026-03-02': 90, '2026-03-03': 405 }, { '2026-03-02': 90, '2026-03-03': 405 }]);
    eqj('P4: … e o PSV', psv(dayOf(d, '2026-03-03')), psv(dayOf(c, '2026-03-03'))); }

  // ── P5 · Um voo SEM HORA DE FIM depois de uma assistência: o dia continua a ter registo (a assistência conta). ──
  { const fl = { kind: 'flight', report_time: '16:00', block_off: '16:30', sectors: 2, flight_minutes: 0, route: 'LIS-OPO-LIS' };
    const e = dayOf({ '2026-03-03': { ...sbD('07:00', '11:00'), extra: [sbD('11:00', '17:00'), fl] } }, '2026-03-03');
    const c = dayOf({ '2026-03-03': { ...sbD('07:00', '17:00'), extra: [fl] } }, '2026-03-03');
    eqj('P5: série + voo sem hora de fim: o dia conta os 25 % das 9 h até à apresentação (era: dia sem registo)', [e && e.servicoMin, e && e.psv.result], [135, null]);
    eqj('P5: … igual à entrada única', [e && e.servicoMin], [c && c.servicoMin]); }

  // ── Uma assistência em casa de mais de 16 h na escala marca o dia, mesmo com um voo a seguir (CS FTL.1.225(b)(1)). ──
  { const e = dayOf({ '2026-03-03': { ...sbD('00:00', '17:00'), extra: [F('19:00', '19:30', '21:00', 'LIS-OPO-LIS')] } }, '2026-03-03');
    eqj('assistência 00:00–17:00 (17 h) e voo às 19:00: o dia marca a assistência acima das 16 h (antes: nada)', !!e.psv.sbOver, true);
    const k = dayOf({ '2026-03-03': { ...sbD('04:00', '23:00'), extra: [F('12:00', '12:30', '14:00', 'LIS-OPO-LIS')] } }, '2026-03-03');
    eqj('controlo: 04:00–23:00 na escala mas chamado às 12:00 (8 h de assistência): sem o aviso', !!k.psv.sbOver, false); }

  // ── O registo dos dias: o dia da assistência recalcula quando o voo do dia SEGUINTE entra (a assistência acaba na apresentação). ──
  { const d1 = { '2026-03-02': sbD('18:00', '06:00') };
    const log1 = ftlV.reconcileDayLog(d1, {}, O);
    const d2 = { ...d1, '2026-03-03': F('05:00', '05:30', '10:00', 'LIS-OPO-LIS') };
    const log2 = ftlV.reconcileDayLog(d2, log1, O);
    eqj('registo: assistência 18–06 sozinha conta 180; com o voo das 05:00 do dia seguinte, 165 (acabou na apresentação)', [log1['2026-03-02'].servicoMin, log2['2026-03-02'].servicoMin], [180, 165]);
    eq('registo: … e a chamada seguinte não mexe em nada', ftlV.reconcileDayLog(d2, log2, O) === log2, true); }

  // ── O que a prova "uma entrada contra a mesma partida" e a comparação com o commit anterior puseram à vista. ──
  // Uma assistência NÃO faz parte de um PSV: a que não está ligada a um voo conta sozinha (antes juntava-se ao serviço do lado).
  { const d = { '2026-03-03': { ...F('05:15', '06:00', '17:30', 'LIS-OPO-LIS'), extra: [F('18:00', '18:30', '22:45', 'LIS-OPO-LIS'), sbA('23:45', '09:00')] } };
    eqj('dois voos seguidos (PSV de 17:30) e assistência no aeroporto depois: excede (era "dentro": o bloco passava as 24 h e lia-se 3:45)', psv(dayOf(d, '2026-03-03')).slice(0, 4), ['17:30', '11:15', null, true]);
    const e = dayOf({ '2026-03-03': { ...F('06:00', '07:00', '10:00', 'LIS-OPO-LIS'), extra: [sbD('11:00', '21:00')] } }, '2026-03-03');
    eqj('voo 06–10 e assistência em casa 11–21 no mesmo dia: PSV de 4:00, dentro; 270 do voo + 150 da assistência (era um "PSV" de 15:00, excede)', [e.psv.result, !!e.psv.over, e.servicoMin], ['04:00', false, 420]);
    const g = dayOf({ '2026-03-03': { ...G('office', '06:00', '12:00'), extra: [G('training', '13:00', '21:00')] } }, '2026-03-03');
    eqj('escritório e formação seguidos (dia sem voo): não há PSV, 14 h de serviço (era um "PSV" de 15:00, excede)', [g.psv.result, !!g.psv.over, g.servicoMin], [null, false, 840]); }
  // A assistência de antes do voo conta mesmo com um escritório antes dela no mesmo dia (o PSV começa no escritório).
  { const e = dayOf({ '2026-03-03': { ...G('office', '10:00', '11:15'), extra: [sbD('13:15', '18:15'), F('19:45', '20:15', '22:45', 'LIS-OPO-LIS')] } }, '2026-03-03');
    eqj('escritório | assistência 13:15–18:15 | voo às 19:45: PSV 12:45 contra 12:30 (com chamada) a 17:00 → incerto', [psv(e), (e.psv.unknowns || []).includes('standbyCall')], [['12:45', '12:30', '17:00', false, true], true]); }
  // A assistência que está DOIS dias atrás na escala (começa às 23:30 e dura 16 h 45) e o voo 11 h 15 depois do fim dela.
  { const d = { '2026-03-02': sbD('23:30', '16:15'), '2026-03-04': F('03:30', '04:00', '07:00', 'LIS-OPO-LIS') };
    const e = dayOf(d, '2026-03-04');
    eqj('assistência de dois dias atrás (acaba 11 h 15 antes do voo): incerto, falta saber se houve repouso (antes: nem se via)', [!!e.psv.uncertain, (e.psv.unknowns || []).includes('standbyRest')], [true, true]); }

  // ── Da 4.ª revisão independente (PSV), sobre este mesmo trabalho. ──
  { const day = (list) => dayOf({ '2026-03-03': { ...list[0], extra: list.slice(1) } }, '2026-03-03');
    const S = (a, b) => G('standby_airport', a, b);
    // Uma entrada duplicada SEM hora de fim não apaga a assistência conhecida.
    const a = day([sbD('07:00', '23:00'), sbD('07:00', null), F('15:00', '15:30', '01:30', 'LIS-OPO-LIS-OPO')]);
    eqj('assistência 07–23 + a mesma sem hora de fim + voo às 15:00: máximo 9:30, excede (o duplicado sem fim tirava a redução: "dentro")', psv(a), ['10:30', '09:30', null, true, false]);
    // A assistência dentro da janela de um PSV de vários serviços não conta duas vezes para o 210.
    const b = day([F('05:00', '05:30', '09:00', 'LIS-OPO-LIS'), sbA('10:00', '16:00'), F('15:00', '15:30', '19:00', 'LIS-OPO-LIS')]);
    const c = day([F('05:00', '05:30', '09:00', 'LIS-OPO-LIS'), sbD('10:00', '18:00'), F('15:00', '15:30', '19:00', 'LIS-OPO-LIS')]);
    eqj('voo | assistência (aeroporto, ou casa) | voo sem repouso pelo meio: o 210 é o da janela 05:00–19:30, uma vez (870)', [b.servicoMin, c.servicoMin, !!b.psv.over, !!c.psv.over], [870, 870, true, true]);
    // O voo que se apresenta à hora exata a que a assistência começava: 0 h de assistência.
    const z = day([sbD('06:00', '14:00'), F('06:00', '06:30', '10:00', 'LIS-OPO-LIS')]);
    eqj('assistência 06–14 e voo às 06:00: a assistência acabou ao começar — só o voo conta (270)', [z.psv.result, !!z.psv.over, z.servicoMin], ['04:00', false, 270]);
    // O PSV acaba no último setor: um serviço em terra depois do último voo não o prolonga (ORO.FTL.105(12)).
    eq('fonte: ORO.FTL.105(12) o PSV acaba no fim do último setor', reg.includes('finishes when the aircraft finally comes to rest and the engines are shut down, at the end of the last sector on which the crew member acts as an operating crew member'), true);
    eqj('voo 06–14 e escritório 20–23: PSV de 8:00, dentro (era 17:00, excede)', psv(day([F('06:00', '06:30', '14:00', 'LIS-OPO-LIS'), G('office', '20:00', '23:00')])).slice(0, 4), ['08:00', '13:00', null, false]);
    eqj('voo | assistência no aeroporto | serviço no aeroporto: PSV de 9:30, dentro', psv(day([F('08:45', '09:15', '18:15', 'LIS-OPO-LIS'), sbA('18:15', '19:45'), S('20:15', '02:30')])).slice(0, 4), ['09:30', '13:00', null, false]);
    eqj('controlo: escritório ANTES do voo continua no PSV (13:30 contra 13:00 a 14:45: incerto)', psv(day([G('office', '06:00', '07:00'), F('11:00', '11:30', '19:30', 'LIS-OPO-LIS')])), ['13:30', '13:00', '14:45', false, true]);
    const n = day([G('office', '04:30', '09:00'), G('positioning', '20:00', '21:15')]);
    eqj('escritório e posicionamento com 11 h pelo meio (dia sem voo): sem PSV e sem "incerto"', [n.psv.result, !!n.psv.uncertain], [null, false]); }

  // ── Da 4.ª revisão independente (repouso), sobre este mesmo trabalho. ──
  { const fl = (a, b) => F(a, a, b, 'LIS-OPO-LIS');
    const bf = (d, iso) => v(restAround(d, (s, i) => i === iso && (s.kind || 'flight') === 'flight', O).before);
    // A assistência no aeroporto COLADA a um voo da véspera e a chamada durante ela no dia seguinte: não houve repouso nenhum.
    eqj('voo até às 19:30 + assistência no aeroporto 20:00–04:00 | voo às 02:00: curto, 0:30 de 18:00 (a junção nova dava "certo", 25:30)',
      bf({ '2026-03-01': fl('06:00', '08:00'), '2026-03-02': { ...fl('10:00', '19:00'), extra: [sbA('20:00', '04:00')] }, '2026-03-03': fl('02:00', '05:00') }, '2026-03-03'), ['bad', null, 30, 1080]);
    // Duas assistências em casa no MESMO dia com tempo livre e o voo durante a 2.ª: são leituras, como de um dia para o outro.
    eqj('assistência 05–09, 3 h livres, 12–23 e voo às 22:00 no mesmo dia: incerto, 3:00 de 12:00 (era "certo", 14:30)',
      bf({ '2026-03-01': fl('08:00', '14:00'), '2026-03-02': { ...sbD('05:00', '09:00'), extra: [sbD('12:00', '23:00'), fl('22:00', '01:00')] } }, '2026-03-02'), ['unc', 'standbyCall', 180, 720]);
    eqj('… 05–15, 1 h livre, 16–23 e voo às 22:00 (17 h desde a 1.ª e só 7 h desde o fim dela): curto nas duas leituras',
      bf({ '2026-03-01': fl('08:00', '14:00'), '2026-03-02': { ...sbD('05:00', '15:00'), extra: [sbD('16:00', '23:00'), fl('22:00', '01:00')] } }, '2026-03-02').slice(0, 3), ['bad', null, 60]);
    // O "repouso mínimo antes da apresentação" da leitura da 1.ª assistência não pode ter outra assistência inteira lá dentro.
    eqj('assistência 05–08, assistência 18–06 e voo 11 h depois dela: curto (o repouso de 33 h "desde a 1.ª" tinha a 2.ª lá dentro)',
      bf({ '2026-03-01': fl('07:00', '15:00'), '2026-03-02': { ...sbD('05:00', '08:00'), extra: [sbD('18:00', '06:00')] }, '2026-03-03': fl('17:00', '20:00') }, '2026-03-03'), ['bad', null, 660, 720]);
    // Um serviço sem apresentação antes das assistências e o voo durante a 2.ª: nunca um repouso negativo.
    { const b = restAround({ '2026-03-01': fl('12:30', '16:00'), '2026-03-03': { kind: 'flight', block_off: '11:00', block_on: '16:00', sectors: 2, route: 'LIS-OPO-LIS' }, '2026-03-04': { ...sbD('16:30', '19:00'), extra: [sbD('21:45', '14:30')] }, '2026-03-05': fl('04:00', '07:15') }, (s, i) => i === '2026-03-05', O).before;
      eqj('voo sem apresentação | assistência, 2 h 45, assistência e voo durante ela: o repouso mostrado é 2:45 (era −10:30)', b.actualMin, 165); } }

  // ── Da 5.ª passagem independente (só sobre as correções que ninguém tinha revisto). ──
  { const day = (list) => dayOf({ '2026-03-10': { ...list[0], extra: list.slice(1) } }, '2026-03-10');
    const bf = (d, iso) => restAround(d, (s, i) => i === iso && (s.kind || 'flight') === 'flight', O).before;
    // Num bloco com as duas leituras, o 210 CERTO é o dos dois PSV separados mais a assistência inteira (ORO.FTL.225(c): 100 %;
    // CS FTL.1.225(b)(3): 25 %); a assistência só se tira da leitura do PSV único.
    const a = day([F('05:00', '05:45', '08:00', 'LIS-FAO-LIS'), sbA('09:00', '19:30'), F('19:00', '19:30', '20:30', 'LIS-OPO')]);
    const c = day([F('05:00', '05:45', '08:00', 'LIS-FAO-LIS'), sbD('09:00', '19:30'), F('19:00', '19:30', '20:30', 'LIS-OPO')]);
    eqj('voo | assistência de 10 h | voo, com 10 h 30 entre os voos: o 210 certo é 15:30 (aeroporto) e 8:00 (casa), o possível 16:00 (o desconto tirava-o do certo: 5:30)', [a.servicoMin, a.servicoMaxMin, c.servicoMin, c.servicoMaxMin], [930, 960, 480, 960]);
    // Um serviço com apresentação e SEM hora de fim antes de um voo do mesmo dia: o PSV não fica "dentro" calado.
    const s = day([G('standby_airport', '10:00', null), F('13:00', '13:45', '23:30', 'LIS-FNC-LIS')]);
    eqj('serviço no aeroporto às 10:00 sem hora de fim e voo às 13:00: incerto, falta essa hora (era "dentro": o PSV pode contar das 10:00, ORO.FTL.225(d))', [!!s.psv.over, !!s.psv.uncertain, (s.psv.unknowns || []).includes('noEndBefore')], [false, true, true]);
    const h = day([sbD('05:00', null), F('15:00', '15:30', '01:30', 'LIS-OPO-LIS-OPO')]);
    eqj('assistência em casa sem hora de fim e voo: incerto, falta essa hora (era "dentro")', [!!h.psv.uncertain, (h.psv.unknowns || []).includes('noEndBefore')], [true, true]);
    eq('o motivo novo tem texto', require(path.resolve('data/ftlUnknowns.js')).unknownLabel('noEndBefore') !== 'noEndBefore', true);
    // As horas do prolongamento são do período de serviço: um escritório colado depois do voo prolongado não as apaga.
    const ext = F('07:00', '07:45', '21:00', 'LIS-FNC-LIS', { special: { plannedExt: true } });
    const wOff = (rep) => v(bf({ '2026-03-10': { ...ext, extra: [G('office', '21:30', '22:00')] }, '2026-03-11': F(rep, rep, '20:00', 'LIS-OPO-LIS') }, '2026-03-11'));
    eqj('PSV prolongado + escritório até às 22:00 | 15:00 de repouso: curto — 15 h de serviço mais 4 h (era "certo")', wOff('13:00'), ['bad', null, 900, 1140]);
    eqj('… com 19:00: certo', wOff('17:00').slice(0, 1), ['ok']);
    // O repouso DEPOIS de um PSV que veio a seguir a um serviço sem hora de fim: o de antes pode ter sido reduzido.
    const noEnd = { kind: 'flight', report_time: '07:00', sectors: 2, route: 'LIS-FNC-LIS' };
    const after = (rep) => { const r = bf({ '2026-03-10': noEnd, '2026-03-11': F('10:00', '10:45', '18:00', 'LIS-OPO-LIS'), '2026-03-12': F(rep, rep, '21:00', 'LIS-OPO-LIS') }, '2026-03-12'); return [r.status, r.kind || null, r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin]; };
    eqj('voo sem hora de fim | PSV | 12:30 de repouso: incerto entre 12:00 e 23:00 — o repouso de antes pode ter sido reduzido (era "certo")', after('07:00'), ['unc', 'noEnd', 720, 1380]);
    eqj('… com 23:30: certo em qualquer leitura', after('18:00').slice(0, 1), ['ok']);
    // Um voo sem apresentação antes de duas assistências não dá pior do que o mesmo voo conhecido.
    const d6 = { '2026-03-07': F('06:00', '06:30', '10:00', 'LIS-OPO-LIS'), '2026-03-10': { kind: 'flight', report_time: null, block_off: '06:00', block_on: '10:00', sectors: 2 }, '2026-03-11': { ...sbD('06:00', '10:00'), extra: [sbD('14:00', '22:00'), F('20:00', '20:45', '23:30', 'LIS-OPO-LIS')] } };
    eqj('voo sem apresentação | assistência, 4 h livres, assistência e voo durante ela: incerto, como com o voo conhecido (as correções davam "curto")', [bf(d6, '2026-03-11').status, bf(d6, '2026-03-11').kind], ['unc', 'standbyCall']); }

  // ── R1 · A assistência da noite partida à meia-noite (17–00 | 00–02), OUTRA de manhã (09–13) e voo às 10:00. ──
  { const fl = F('10:00', '10:30', '11:30', 'LIS-OPO');
    const d = { '2026-03-01': short1, '2026-03-02': sbD('17:00', '00:00'), '2026-03-03': { ...sbD('00:00', '02:00'), extra: [sbD('09:00', '13:00'), fl] } };
    const c = { '2026-03-01': short1, '2026-03-02': sbD('17:00', '02:00'), '2026-03-03': { ...sbD('09:00', '13:00'), extra: [fl] } };
    eqj('R1: 17–00 | 00–02, 7 h livres, 09–13 e voo às 10:00: curto, com as 7 h (era certo, 30:30: o pedaço de depois da meia-noite juntava-se à da manhã)', v(befOf(d, '2026-03-03', '10:00')), ['bad', null, 420, 720]);
    eqj('R1: … igual à entrada única', v(befOf(d, '2026-03-03', '10:00')), v(befOf(c, '2026-03-03', '10:00'))); }

  // ── R2 · Duas assistências no mesmo dia com tempo livre (20–21 e 22–06) e voo às 02:00 do dia seguinte. ──
  // Chamado na 2.ª, a 1.ª não foi seguida de um repouso (1 h); chamado na 1.ª são 6 h de assistência e 33 h 30 de repouso antes → incerto.
  { const d = { '2026-03-01': short1, '2026-03-03': { ...sbD('20:00', '21:00'), extra: [sbD('22:00', '06:00')] }, '2026-03-04': F('02:00', '02:30', '03:30', 'LIS-OPO') };
    eqj('R2: 20–21, 1 h livre, 22–06 e voo às 02:00: incerto — chamada na 1.ª ou repouso curto (era curto: a 1.ª contava como um serviço verdadeiro)', v(befOf(d, '2026-03-04')), ['unc', 'standbyCall', 60, 720]);
    // Controlo: colada a um VOO (1 h depois dele) não houve repouso nenhum, em leitura nenhuma → curto.
    const g = { '2026-03-01': short1, '2026-03-03': { ...F('15:00', '15:30', '18:30', 'LIS-OPO-LIS'), extra: [sbD('20:00', '06:00')] }, '2026-03-04': F('02:00', '02:30', '03:30', 'LIS-OPO') };
    eqj('R2: controlo, a assistência 1 h depois de um voo e a chamada durante ela no dia seguinte: curto', v(befOf(g, '2026-03-04')).slice(0, 3), ['bad', null, 60]); }

  // ── R4 · O 3.º repouso abaixo do mínimo só é curto de certeza se os dois anteriores foram repousos reduzidos DE CERTEZA. ──
  // O 2.º (12:30 de 13:00) veio antes de "escritório + voo 4 h 30 depois" — pode ser um repartido, e então foi só curto
  // (ORO.FTL.220(c)), não um repouso reduzido: não gasta um dos dois (CS FTL.1.235(c)(5)).
  { const d = { '2026-03-01': long5, '2026-03-02': F('06:30', '07:00', '08:30', 'LIS-OPO-LIS'), '2026-03-03': long5,
      '2026-03-04': { ...G('office', '06:30', '07:30'), extra: [F('12:00', '12:30', '14:00', 'LIS-OPO-LIS')] }, '2026-03-05': long5, '2026-03-06': F('06:30', '07:00', '08:30', 'LIS-OPO-LIS') };
    eqj('R4: o 3.º repouso de 12:30 depois de um que antecedeu "escritório + voo": incerto (era curto)', v(befOf(d, '2026-03-06')), ['unc', 'reducedRest', 750, 780]);
    // Controlo: com três VOOS simples (os dois primeiros repousos só podiam ser reduzidos), o 3.º é curto.
    const k = { ...d, '2026-03-04': F('06:30', '07:00', '08:30', 'LIS-OPO-LIS') };
    eqj('R4: controlo, dois repousos reduzidos certos antes: o 3.º é curto', v(befOf(k, '2026-03-06')).slice(0, 1), ['bad']); }

  // ── R7 · Voo e, 3 h depois, escritório: não é um repartido possível (o PSV acabou no último setor, ORO.FTL.105(12)). ──
  // Logo o repouso de 12:30 antes desse dia só podia ser um repouso reduzido, e o seguinte não pode voltar a ser (CS 235(c)(3)).
  { const d = { '2026-03-01': long5, '2026-03-02': { ...F('06:30', '07:00', '10:30', 'LIS-OPO-LIS'), extra: [G('office', '14:00', '20:00')] }, '2026-03-03': F('08:45', '09:15', '10:15', 'LIS-OPO') };
    eqj('R7: repouso reduzido | voo + escritório 3 h depois | 12:45 de 13:30: curto (era incerto)', v(befOf(d, '2026-03-03')), ['bad', null, 765, 810]);
    // Controlo: o escritório ANTES do voo pode ser um repartido → continua incerto.
    const k = { '2026-03-01': long5, '2026-03-02': { ...G('office', '06:30', '07:30'), extra: [F('11:00', '11:30', '19:30', 'LIS-OPO-LIS')] }, '2026-03-03': F('08:45', '09:15', '10:15', 'LIS-OPO') };
    eqj('R7: controlo, escritório + voo 3 h 30 depois (repartido possível): incerto', v(befOf(k, '2026-03-03')).slice(0, 2), ['unc', 'reducedRest']); }

  // ── R5 · O repouso conta do fim do que ACABOU por último. ──
  { const f1 = F('23:00', '23:30', '04:30', 'LIS-OPO-LIS'), f2 = F('15:00', '15:30', '16:30', 'LIS-OPO');
    const d = { '2026-03-01': short1, '2026-03-02': { ...sbD('20:00', '00:00'), extra: [f1] }, '2026-03-03': { ...sbD('00:00', '02:00'), extra: [f2] } };
    eqj('R5: 20–00 + voo às 23:00 (até às 05:00) | 00–02 + voo às 15:00: curto, 10 h desde o fim do voo (era certo, 13:00 desde o pedaço 00–02)', v(befOf(d, '2026-03-03', '15:00')), ['bad', null, 600, 720]);
    const fl = F('07:00', '07:30', '08:30', 'LIS-OPO');
    const n = { '2026-03-01': short1, '2026-03-02': { ...sbD('08:00', '20:00'), extra: [sbD('09:00', '10:00')] }, '2026-03-03': fl };
    eqj('R5: 08–20 com 09–10 lá dentro e voo às 07:00: 11 h desde as 20:00 (era certo, 21:00 desde as 10:00)', v(befOf(n, '2026-03-03')).slice(0, 3), ['bad', 'standbyOver16', 660]);
    const a = { '2026-03-01': short1, '2026-03-02': { ...G('standby_airport', '08:00', '20:00'), extra: [G('standby_airport', '09:00', '10:00')] }, '2026-03-03': fl };
    eqj('R5: o mesmo com serviço no aeroporto: curto, 11 h de 12', v(befOf(a, '2026-03-03')), ['bad', null, 660, 720]);
    // Quem procura pelo dia ou pela entrada encontra a série.
    const rv = restVerdicts(d, O).filter((x) => x.nextIso === '2026-03-03');
    eqj('R5: as Estatísticas contam um repouso só antes do voo das 15:00', rv.map((x) => [x.status, x.actualMin]), [['bad', 600]]); }

  // ── A assistência NO AEROPORTO que passa a meia-noite, com o voo a apresentar-se durante ela: um período de serviço só. ──
  { const d = { '2026-03-01': short1, '2026-03-03': sbA('18:00', '02:00'), '2026-03-04': F('00:00', '00:30', '06:00', 'LIS-OPO-LIS') };
    eqj('aeroporto 18:00–02:00 e voo às 00:00 do dia seguinte: o repouso é o de antes da assistência (era curto, "−2:00")', v(befOf(d, '2026-03-04')), ['ok', null, 3330, 720]);
    const ru = restUntilAfter(d, '2026-03-04', O);
    eqj('… e o repouso a seguir mede-se pelo período inteiro, desde as 18:00 (ORO.FTL.225(c)): 12:30', ru.requiredMin, 750); }

  // ── R6 · A leitura "chamado na assistência anterior" não vale se essa vem COLADA a um voo. ──
  { const d = { '2026-03-02': { ...short1, extra: [sbD('12:00', '16:00')] }, '2026-03-03': { ...sbD('00:00', '08:00'), extra: [F('02:00', '02:30', '03:30', 'LIS-OPO')] } };
    eqj('R6: voo até 10:30 + assistência 12–16 | assistência 00–08 + voo às 02:00: curto — não houve repouso em leitura nenhuma (era incerto)', v(befOf(d, '2026-03-03', '02:00')), ['bad', null, 480, 720]); }
}

console.log(`\nFTL golden — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Todas as tabelas e limiares batem com os PDFs (Reg. 83/2014 · CS-FTL.1).');
