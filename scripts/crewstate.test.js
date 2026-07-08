/*
 * Golden do MOTOR da Living Interface (data/crewState.js) — PURO, sem rede/React.
 * Pina os gatilhos e a PRECEDÊNCIA dos 8 estados do Início: setup > disrupção > hoje >
 * pernoita > pós-voo > véspera > folga; o fecho multi-serviço; o serviço que vira a
 * noite; o standby sem block_on que nunca fecha o dia; a pernoita fora vs base.
 * Executar:  node scripts/crewstate.test.js   (ou: npm run test:crewstate)
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
let cjsPlugin;
try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); } catch { cjsPlugin = null; }
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

const { crewState, dutyEndMs, dayClosed, sickEpisodeDay } = require(path.resolve('data/crewState.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};

const D = '2026-07-09';
const ms = (hhmm, iso = D, plusDays = 0) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + plusDays); d.setHours(h, m, 0, 0); return d.getTime(); };
const st = (over) => crewState({ now: ms('15:00'), hour: 15, todayISO: D, calendarConnected: true, ...over }).state;

// ── dutyEndMs: a regra do fim de um serviço ──
eq('fim = block_on', dutyEndMs(D, { report_time: '06:00', block_on: '10:00' }), ms('10:00'));
eq('vira a noite (block_on < report → dia seguinte)', dutyEndMs(D, { report_time: '22:00', block_on: '02:00' }), ms('02:00', D, 1));
eq('sem block_on → fim do dia 23:59', dutyEndMs(D, { report_time: '06:00' }), ms('23:59'));
eq('sem report → null', dutyEndMs(D, { block_on: '10:00' }), null);
eq('apagado → null', dutyEndMs(D, { report_time: '06:00', block_on: '10:00', deleted: true }), null);

// ── dayClosed: multi-serviço só fecha quando TODOS acabam ──
const svc1 = { report_time: '06:00', block_on: '10:00' };
eq('1 serviço terminado → fechado', dayClosed(D, svc1, ms('15:00')), true);
eq('1 serviço a decorrer → aberto', dayClosed(D, svc1, ms('08:00')), false);
eq('multi: extra ainda por vir → ABERTO', dayClosed(D, { ...svc1, extra: [{ report_time: '18:00', block_on: '22:00' }] }, ms('15:00')), false);
eq('multi: todos terminados → fechado', dayClosed(D, { ...svc1, extra: [{ report_time: '12:00', block_on: '14:00' }] }, ms('15:00')), true);
eq('standby sem block_on nunca fecha o dia', dayClosed(D, { report_time: '06:00' }, ms('20:00')), false);

// ── Estados base ──
eq('sem calendário e sem voo → setup', crewState({ now: ms('15:00'), hour: 15, todayISO: D, calendarConnected: false }).state, 'setup');
eq('calendário ligado sem voo → folga', st({}), 'folga');
eq('voo HOJE → hoje', st({ flight: { dateISO: D }, cdMin: 120 }), 'hoje');
eq('voo futuro, tarde normal → folga', st({ flight: { dateISO: '2026-07-11' }, cdMin: 2000 }), 'folga');

// ── Disrupção ganha ao hoje ──
eq('desvio no voo → disrupção', st({ flight: { dateISO: D }, cdMin: 60, deviated: true }), 'disrupcao');
eq('inbound atrasado → disrupção', st({ flight: { dateISO: D }, cdMin: 60, inboundLate: true }), 'disrupcao');

// ── Véspera: report ≤14h + noite (≥18h) ──
const V = { flight: { dateISO: '2026-07-10' }, cdMin: 8 * 60 };
eq('véspera às 21h → vespera', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, ...V }).state, 'vespera');
eq('mesma distância às 15h → folga', crewState({ now: ms('15:00'), hour: 15, todayISO: D, calendarConnected: true, ...V }).state, 'folga');
eq('report a 20h de distância → folga (mesmo de noite)', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, flight: { dateISO: '2026-07-10' }, cdMin: 20 * 60 }).state, 'folga');
eq('véspera é noturna', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, ...V }).night, true);

// ── Pós-voo e pernoita (dia fechado) ──
const closedHome = { report_time: '06:00', block_on: '10:00', route: 'LIS-FNC-LIS' };
const closedAway = { report_time: '06:00', block_on: '10:00', night_stop: true, legs: [{ dep: 'LIS', arr: 'FNC' }] };
eq('dia fechado na BASE → posvoo', st({ todayDuty: closedHome, base: 'LIS' }), 'posvoo');
eq('dia fechado FORA (nightStop) → pernoita', st({ todayDuty: closedAway, base: 'LIS' }), 'pernoita');
eq('pernoita dá a estação', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, todayDuty: closedAway, base: 'LIS' }).nsStation, 'FNC');
eq('pernoita é noturna', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, todayDuty: closedAway, base: 'LIS' }).night, true);
eq('pós-voo NÃO é noturno', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, todayDuty: closedHome, base: 'LIS' }).state, 'posvoo');

// ── Precedências finas ──
eq('fechado + report amanhã às 21h → PÓS-VOO ganha à véspera (75>65)',
  crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, todayDuty: closedHome, base: 'LIS', ...V }).state, 'posvoo');
eq('voo HOJE a decorrer ganha ao dia-fechado (multi-dia raro)',
  st({ flight: { dateISO: D }, cdMin: -30, todayDuty: closedHome, base: 'LIS' }), 'hoje');
eq('fecho multi-serviço marca closeMulti',
  crewState({ now: ms('23:00'), hour: 23, todayISO: D, calendarConnected: true, todayDuty: { ...closedHome, extra: [{ report_time: '12:00', block_on: '14:00' }] }, base: 'LIS' }).closeMulti, true);

// ── Férias · Doença · Fecho do mês (estados de calendário) ──
const vac = (date) => ({ type: 'vacDays', date });
const sick = (date) => ({ type: 'sickDays', date });
eq('férias hoje → ferias', st({ events: [vac(D)] }), 'ferias');
eq('férias noutro dia → folga', st({ events: [vac('2026-07-20')] }), 'folga');
eq('doença hoje → doenca', st({ events: [sick(D)] }), 'doenca');
eq('episódio: dia 1', sickEpisodeDay([sick(D)], D), 1);
eq('episódio: dia 3 (consecutivos)', sickEpisodeDay([sick('2026-07-07'), sick('2026-07-08'), sick(D)], D), 3);
eq('episódio: quebra reinicia (ontem saudável)', sickEpisodeDay([sick('2026-07-06'), sick(D)], D), 1);
eq('sem baixa hoje → 0', sickEpisodeDay([sick('2026-07-08')], D), 0);
eq('doença CALA a véspera', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, ...V, events: [sick(D)] }).state, 'doenca');
eq('véspera GANHA às férias (último dia + report cedo)', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, ...V, events: [vac(D)] }).state, 'vespera');
eq('voo hoje ganha à doença (dado operacional manda)', st({ flight: { dateISO: D }, cdMin: 60, events: [sick(D)] }), 'hoje');
eq('fecho: dia 29 de julho com AE → fecho', crewState({ now: ms('15:00', '2026-07-29'), hour: 15, todayISO: '2026-07-29', calendarConnected: true, hasAe: true }).state, 'fecho');
eq('fecho: dia 28 (faltam 3) → folga', crewState({ now: ms('15:00', '2026-07-28'), hour: 15, todayISO: '2026-07-28', calendarConnected: true, hasAe: true }).state, 'folga');
eq('fecho: sem AE → folga', crewState({ now: ms('15:00', '2026-07-31'), hour: 15, todayISO: '2026-07-31', calendarConnected: true, hasAe: false }).state, 'folga');
eq('férias no fim do mês GANHAM ao fecho', crewState({ now: ms('15:00', '2026-07-31'), hour: 15, todayISO: '2026-07-31', calendarConnected: true, hasAe: true, events: [vac('2026-07-31')] }).state, 'ferias');
eq('estados de calendário não são noturnos', crewState({ now: ms('21:00'), hour: 21, todayISO: D, calendarConnected: true, events: [vac(D)] }).night, false);

console.log(`\ncrewState — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
