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
  const { dutyFromActivity, prospectiveDuty } = require(path.resolve('data/rosterImport.js'));
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

// ── Resumo ──
console.log(`\nFTL golden — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Todas as tabelas e limiares batem com os PDFs (Reg. 83/2014 · CS-FTL.1).');
