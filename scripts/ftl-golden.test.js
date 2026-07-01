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
eq('FC c3 +1 → 14:15', computeFlightCrewFdp({ restClass: 'c3', additionalCrew: 1, sectors: 1 }).maxFdpMin, M('14:15'));
eq('FC c3 +2 → 15:15', computeFlightCrewFdp({ restClass: 'c3', additionalCrew: 2, sectors: 1 }).maxFdpMin, M('15:15'));
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
  const ap = computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: M('13:00'), fdpH: 10 });
  eq('SB aeroporto: reduz >4h', ap.reductionMin, M('02:00'));
  eq('SB aeroporto: 100% serviço', ap.dutyCountMin, M('06:00'));
  eq('SB aeroporto: combinado 16h', ap.combinedMaxMin, M('16:00'));
  eq('SB aeroporto: PSV reduzido', ap.reducedMaxFdpMin, M('11:00'));
  eq('SB aeroporto ≤4h sem redução', computeStandby({ type: 'airport', standbyH: 3, maxFdpMin: M('13:00') }).reductionMin, 0);

  const ot = computeStandby({ type: 'other', standbyH: 8, maxFdpMin: M('13:00') });
  eq('SB outro: reduz >6h', ot.reductionMin, M('02:00'));
  eq('SB outro: 25% serviço', ot.dutyCountMin, M('02:00'));
  eq('SB outro estendido: livre 8h', computeStandby({ type: 'other', standbyH: 8, extended: true, maxFdpMin: M('13:00') }).reductionMin, 0);
  eq('SB outro: máx 16h', computeStandby({ type: 'other', standbyH: 17, maxFdpMin: M('13:00') }).overMaxStandby, true);
  // (b)(9): standby iniciado entre 23:00–07:00 → a parte na janela não conta p/ a redução.
  eq('SB outro 23:30 (noturno) → janela não conta', computeStandby({ type: 'other', standbyH: 10, startMin: M('23:30'), maxFdpMin: M('13:00') }).reductionMin, 0);
  eq('SB outro 10:00 (fora da janela) → conta tudo', computeStandby({ type: 'other', standbyH: 10, startMin: M('10:00'), maxFdpMin: M('13:00') }).reductionMin, M('04:00'));
  // Combinado standby+PSV (aeroporto ≤16h) e "acordado" (outro >18h) — agora com flag.
  eq('SB aeroporto 6h + PSV 11h = 17h > 16h → combinedOver', computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: M('11:00') }).combinedOver, true);
  eq('SB aeroporto 4h + PSV 11h = 15h ≤ 16h → não', computeStandby({ type: 'airport', standbyH: 4, maxFdpMin: M('11:00') }).combinedOver, false);
  eq('SB outro 8h + PSV 13h = 21h > 18h → awakeOver', computeStandby({ type: 'other', standbyH: 8, maxFdpMin: M('13:00') }).awakeOver, true);
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
eq('Split sem alojamento: teto 6h domina', fdpMax({ state: 'acc', reportMin: M('06:00'), sectors: 1, splitBreakH: 8, splitBreakStartMin: M('10:00'), accommodation: false }), M('16:00'));

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
  eq('Ext-freq: 1 prolongamento → novo não excede', computeExtensionUsage({ '2026-06-05': extDuty }, '2026-06-05').count, 1);
  eq('Ext-freq: 2 prolongamentos → novo excederia', computeExtensionUsage({ '2026-06-03': extDuty, '2026-06-05': extDuty }, '2026-06-05').wouldExceed, true);
  eq('Ext-freq: 0 prolongamentos → não excede', computeExtensionUsage({ '2026-06-05': noExt }, '2026-06-05').wouldExceed, false);
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

  // (2) Repouso a bordo — CABINE (205c): teto por classe (c1→18:00, c2→17:00, c3→16:00).
  const cabMax = computeInflightRest({ restClass: 'c2', sectors: 2, maxFdpMin: 0 }).classMaxMin;
  const dC = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c2' }, isPilot: false });
  eq('Aumentado cabine: teto = classe (golden)', dC.fdp.maxFdpMin, cabMax);
  eq('Aumentado cabine: modifier', dC.fdp.modifier, 'augmented');

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

  // (8) Adapter — CABINE aumentada (classe c2 → teto 17:00, golden).
  const eC = ftl.dutyToFtlDay({ report_time: '06:00', block_on: '20:00', sectors: 2, special: { augmented: { restClass: 'c2' } } }, { isPilot: false });
  eq('Adapter aumentado cabine: max = classe (golden)', eC.psv.max, computeInflightRest({ restClass: 'c2', sectors: 2, maxFdpMin: 0 }).classMaxStr);

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
  const sbC = computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: baseC.maxFdpMin });
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
  // setores)=13:00 + extensão 50% (pausa 10h, sem alojamento → conta 6h → +3:00) = 16:00 → ILEGAL +01:00.
  const splitBad = dayFtlFromDuties([
    { report_time: '06:00', block_on: '10:00', sectors: 1, flight_minutes: 180 },
    { report_time: '20:00', block_on: '23:00', sectors: 1, flight_minutes: 120 },
  ]);
  eq('Split ilegal: 1 FDP combinado = 17:00', splitBad.psv.result, '17:00');
  eq('Split ilegal: máx 16:00 (base 13:00 + ext 3:00)', splitBad.psv.max, '16:00');
  eq('Split ilegal: excede → over', splitBad.psv.over, true);
  eq('Split ilegal: excesso +01:00', splitBad.psv.excess, '01:00');
  eq('Split ilegal: serviço (210) conta a pausa → 17h', splitBad.servico, 17);
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
  // = 14h; base(06:00·2)=13:00 + extensão (pausa 4h, sem alojamento → líquida 3h30 → +1:45) = 14:45.
  const legDuty = { report_time: '06:00', block_on: '20:00', sectors: 2, legs: [{ off: '06:00', on: '08:00' }, { off: '12:00', on: '20:00' }] };
  const legDay = dayFtlFromDuties([legDuty]);
  eq('Split das legs: máx estende para 14:45', legDay.psv.max, '14:45');
  eq('Split das legs: 14:00 ≤ 14:45 → LEGAL', legDay.psv.over, false);
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
  // ALOJAMENTO (opt-in): split de 8h. Sem alojamento a pausa contável limita-se a 6h; COM alojamento
  // conta toda (220 d/e). FDP combinado 06:00→22:30 = 16h30. Sem: máx 16:00 (over). Com: máx 16:45 (legal).
  const mk = (acc) => [
    { report_time: '06:00', block_on: '08:00', sectors: 1, flight_minutes: 120, accommodation: acc },
    { report_time: '16:00', block_on: '22:30', sectors: 1, flight_minutes: 300 },
  ];
  eq('Split 8h SEM alojamento: máx 16:00', dayFtlFromDuties(mk(false), {}).psv.max, '16:00');
  eq('Split 8h SEM alojamento: 16:30 > 16:00 → over', dayFtlFromDuties(mk(false), {}).psv.over, true);
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
  // piloto (c1, +1 tripulante) = 16:00 ; cabine (c1) = 18:00. O veredicto ao vivo herda esse teto.
  const dP = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c1', additionalCrew: 1 }, isPilot: true });
  const dC = computeDuty({ state: 'acc', report: '06:00', end: '20:00', sectors: 2, augmented: { restClass: 'c1' }, isPilot: false });
  eq('Live crew: veredicto usa o teto do PILOTO (16:00)', ftl.liveFdpVerdict(dP, 0).maxStr, dP.fdp.maxFdpStr);
  eq('Live crew: teto do piloto = 16:00', dP.fdp.maxFdpStr, '16:00');
  eq('Live crew: veredicto usa o teto da CABINE (18:00)', ftl.liveFdpVerdict(dC, 0).maxStr, dC.fdp.maxFdpStr);
  eq('Live crew: teto da cabine = 18:00', dC.fdp.maxFdpStr, '18:00');
  eq('Live crew: mesma classe c1, teto piloto ≠ cabine (205 c distingue)', dP.fdp.maxFdpStr !== dC.fdp.maxFdpStr, true);
}

// ── Resumo ──
console.log(`\nFTL golden — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Todas as tabelas e limiares batem com os PDFs (Reg. 83/2014 · CS-FTL.1).');
