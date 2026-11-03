/*
 * Testes golden da lógica de DESVIO de voo (data/flightDelay.js) — PURA, sem rede.
 * Cobre o caso que o teste ao vivo revelou: o EJU7625 saiu +14 (não dava card antes,
 * limiar 15) mas CHEGOU +42 → agora dispara e o card mostra a CHEGADA.
 * Executar:  node scripts/flightstatus.test.js   (ou: npm run test:flightstatus)
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

const { depDelayMin, arrDelayMin, hasDeviation, worstDelay, settledArrZ, schedArrZ, recordBehindLive, storedMatchesReal, inboundGap, airportDisruption } = require(path.resolve('data/flightDelay.js'));
const { legsForShare } = require(path.resolve('data/shareDay.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};

// ── EJU7625 real (LIS→FNC): partida +14, chegada +42, status landed ──
const eju = { status: 'landed', dep: { delayMin: 14 }, arr: { delayMin: 42 } };
eq('dep delay 14', depDelayMin(eju), 14);
eq('arr delay 42', arrDelayMin(eju), 42);
eq('worst = chegada 42', worstDelay(eju), { min: 42, which: 'arr' });
eq('EJU7625 DISPARA (chegada ≥15)', hasDeviation(eju), true);   // antes: FALSE (só olhava a partida)

// ── Partida pior que chegada → card mostra a partida ──
const dep20 = { status: 'active', dep: { delayMin: 20 }, arr: { delayMin: 5 } };
eq('worst = partida 20', worstDelay(dep20), { min: 20, which: 'dep' });
eq('partida 20 dispara', hasDeviation(dep20), true);

// ── Ambos pequenos → sem card ──
eq('5/5 não dispara', hasDeviation({ dep: { delayMin: 5 }, arr: { delayMin: 5 } }), false);

// ── Status anómalo dispara mesmo sem atraso ──
eq('cancelado dispara', hasDeviation({ status: 'cancelled', dep: {}, arr: {} }), true);
eq('desviado dispara', hasDeviation({ status: 'diverted', dep: {}, arr: {} }), true);

// ── Derivar de timestamps (Unix s) quando não há delayMin: chegada agendada→estimada +25 min ──
const T0 = 1782816900;   // timestamp Unix REAL (segundos) — não 0 (0 é falsy, nunca é caso real)
const ts = { dep: { scheduledTs: T0, estimatedTs: T0 }, arr: { scheduledTs: T0, estimatedTs: T0 + 25 * 60 } };
eq('arr deriva de ts (25 min)', arrDelayMin(ts), 25);
eq('deriva dispara (≥15)', hasDeviation(ts), true);

// ── Empate → partida; clamp de negativos; null robusto ──
eq('empate 15/15 → partida', worstDelay({ dep: { delayMin: 15 }, arr: { delayMin: 15 } }), { min: 15, which: 'dep' });
eq('arr negativo → 0 (clamp)', arrDelayMin({ arr: { delayMin: -5 } }), 0);
eq('null → 0', depDelayMin(null), 0);
eq('null → sem desvio', hasDeviation(null), false);

// ── Registo ATRASADO face às horas reais (recordBehindLive) — aviso de SINCRONIZAR ──
// Extração das horas Zulu do feed (AirLabs dá "YYYY-MM-DD HH:MM" nos *_utc).
eq('settledArrZ: ATA confirmado', settledArrZ({ status: 'active', arr: { actualUtc: '2026-06-30 14:42' } }), '14:42');
eq('settledArrZ: só estimada EM VOO → null', settledArrZ({ status: 'active', arr: { estimatedUtc: '2026-06-30 14:42' } }), null);
eq('settledArrZ: estimada MAS aterrou → assente', settledArrZ({ status: 'landed', arr: { estimatedUtc: '2026-06-30 14:42' } }), '14:42');
eq('settledArrZ: nada → null', settledArrZ({ status: 'landed', arr: {} }), null);
eq('schedArrZ: agendada', schedArrZ({ arr: { scheduledUtc: '2026-06-30 14:00' } }), '14:00');

// Registo no PLANEADO (on-block guardado = agendada 14:00) + chegou REAL 14:42 → ATRASADO.
const stale = { status: 'landed', arr: { scheduledUtc: '2026-06-30 14:00', actualUtc: '2026-06-30 14:42' } };
eq('registo no planeado + real +42 → atrasado', recordBehindLive(stale, '14:00'), true);
// Registo JÁ sincronizado (on-block guardado = real 14:42) → NÃO chateia.
eq('registo já no real → sincronizado (false)', recordBehindLive(stale, '14:42'), false);
// Registo editado à mão para um 3.º valor (13:00, ≠ planeado e ≠ real) → conservador, false.
eq('registo noutro valor (editado) → conservador false', recordBehindLive(stale, '13:00'), false);
// Diferença pequena (real 14:08 vs guardado/planeado 14:00 = 8 min < 10) → não chateia.
const tiny = { status: 'landed', arr: { scheduledUtc: '2026-06-30 14:00', actualUtc: '2026-06-30 14:08' } };
eq('atraso pequeno (<thr) → false', recordBehindLive(tiny, '14:00'), false);
// Meia-noite: guardado/agendada 23:55, real 00:20 (= +25 min, à prova de wrap) → atrasado.
const wrap = { status: 'landed', arr: { scheduledUtc: '2026-07-01 23:55', actualUtc: '2026-07-02 00:20' } };
eq('cruza meia-noite → atrasado (wrap ok)', recordBehindLive(wrap, '23:55'), true);
// Ainda em voo (só estimativa) → sem facto assente → não manda sincronizar.
const flying = { status: 'active', arr: { scheduledUtc: '2026-06-30 14:00', estimatedUtc: '2026-06-30 14:42' } };
eq('em voo (só estimativa) → não manda sincronizar', recordBehindLive(flying, '14:00'), false);
// Robustez: sem on-block guardado, sem feed → false.
eq('sem storedOnZ → false', recordBehindLive(stale, null), false);
eq('feed nulo → false', recordBehindLive(null, '14:00'), false);

// storedMatchesReal — LIMPAR o marcador quando o registo apanha o real (± limiar).
eq('apanhou o real (igual) → true', storedMatchesReal('14:42', '14:42'), true);
eq('apanhou o real (±8 min) → true', storedMatchesReal('14:50', '14:42'), true);
eq('ainda no planeado (42 min) → false', storedMatchesReal('14:00', '14:42'), false);
eq('apanhou o real cruzando meia-noite → true', storedMatchesReal('00:20', '00:18'), true);
eq('nulo → false', storedMatchesReal(null, '14:42'), false);

// ── inboundGap — o avião que nos vem buscar (rotação da matrícula) ──
// Nós: EJU7625, partimos de LIS às 18:00Z. Inbound EJU7624 chega a LIS.
const OUR = { ourFlight: 'EJU7625', ourDepZ: '2026-07-03 18:00', ourDepIata: 'LIS' };
const inb = (etaUtc, extra = {}) => ({ flightIata: 'U27624', flightIcao: 'EJU7624', dep: { iata: 'CDG' }, arr: { iata: 'LIS', estimatedUtc: etaUtc }, ...extra });
// Chega 17:00 + 35 rotação = pronto 17:35 → 25 min de folga, sem atraso projetado.
eq('inbound folgado → gap 25, proj 0', inboundGap(inb('2026-07-03 17:00'), OUR), { gapMin: 25, projDelayMin: 0, etaZ: '17:00' });
// Chega 17:50 → pronto 18:25 → partida derrapa ~25 min.
eq('inbound tarde → proj 25', inboundGap(inb('2026-07-03 17:50'), OUR).projDelayMin, 25);
// ATA (real) ganha à estimada.
eq('ATA ganha à estimada', inboundGap(inb('2026-07-03 17:50', { arr: { iata: 'LIS', estimatedUtc: '2026-07-03 17:50', actualUtc: '2026-07-03 17:10' } }), OUR).projDelayMin, 0);
// A matrícula JÁ está no NOSSO voo → não há inbound (null).
eq('já é o nosso voo → null', inboundGap({ flightIata: 'U27625', flightIcao: 'EJU7625', arr: { iata: 'FNC', estimatedUtc: '2026-07-03 19:00' } }, OUR), null);
// O avião vai para OUTRA estação → não é o nosso inbound.
eq('outra estação → null', inboundGap(inb('2026-07-03 17:00', { arr: { iata: 'OPO', estimatedUtc: '2026-07-03 17:00' } }), OUR), null);
// Meia-noite: partimos 00:30Z, inbound chega 23:40Z → pronto 00:15 → folga 15 (wrap ok).
eq('cruza meia-noite (wrap)', inboundGap(inb('2026-07-03 23:40'), { ...OUR, ourDepZ: '00:30' }).gapMin, 15);
// Sem ETA nenhuma → null (não se inventa projeção).
eq('sem ETA → null', inboundGap(inb(null), OUR), null);

// ── airportDisruption — Airport Intelligence: o aeroporto está "doente"? ──
// Limiares: amostra ≥8 · warn ≥30% atrasados ou ≥10% cancelados · bad ≥50% ou ≥20%.
const AP = (dep, arr) => ({ iata: 'LIS', dep, arr });
const S = (n, delayedPct, avgDelayMin = 20, cancelPct = 0) => ({ n, delayedPct, avgDelayMin, cancelPct });
eq('aeroporto saudável → null', airportDisruption(AP(S(60, 10), S(55, 8))), null);
eq('amostra pequena (n=5, 80%) → null (não afirma)', airportDisruption(AP(S(5, 80), S(3, 100))), null);
eq('warn: 35% partidas atrasadas', airportDisruption(AP(S(60, 35, 28), S(55, 10))), { side: 'dep', tone: 'warn', delayedPct: 35, avgDelayMin: 28, cancelPct: 0 });
eq('warn por cancelamentos (12%)', airportDisruption(AP(S(60, 15, 20, 12), S(55, 10))).tone, 'warn');
eq('bad: 25% cancelados nas chegadas', airportDisruption(AP(S(60, 10), S(55, 22, 40, 25))), { side: 'arr', tone: 'bad', delayedPct: 22, avgDelayMin: 40, cancelPct: 25 });
eq('pior lado ganha (dep warn vs arr bad → arr)', airportDisruption(AP(S(60, 34, 25), S(55, 55, 45))).side, 'arr');
eq('sem stats → null', airportDisruption(null), null);

// ── legsForShare — legs mínimas do link da família (PURA, data/shareDay.js) ──
const dutyLegs = { legs: [{ flightNo: 'EJU7625', dep: 'LIS', arr: 'FNC' }, { flightNo: 'EJU7626', dep: 'FNC', arr: 'LIS' }] };
eq('legs do dia (2 pernas)', legsForShare(dutyLegs), [{ flight: 'EJU7625', dep: 'LIS', arr: 'FNC' }, { flight: 'EJU7626', dep: 'FNC', arr: 'LIS' }]);
eq('fallback rota+nº (sem legs)', legsForShare({ flightNo: 'U2 8903', route: 'LIS-OPO-LIS' }), [{ flight: 'U28903', dep: 'LIS', arr: 'LIS' }]);
eq('sem nº de voo → []', legsForShare({ route: 'LIS-OPO' }), []);
eq('duty nula → []', legsForShare(null), []);

// ═══ SETOR SEGUIDO AO VIVO (2026-11-03, Nuno "corrigir isto") ═══
// Antes: o feed seguia o nº do 1.º setor o dia todo → um atraso do 1.º setor punha o Início em disrupção
// nos setores seguintes. Agora segue o SETOR ATIVO, e "terminou" mede-se pela chegada real/estimada do
// voo seguido (não pela hora planeada); nunca se volta atrás no mesmo dia (floor).
const { activeLegIndex, legNo } = require(path.resolve('data/flightDelay.js'));
const T = (hm) => { const [h, m] = hm.split(':').map(Number); return Date.UTC(2026, 10, 3, h, m); };
const LEGS = [{ flightNo: 'EZY 1', on: '09:50' }, { flightNo: 'EZY2', on: '13:20' }];
const onMs = (lg) => (lg.on ? T(lg.on) : null);
eq('legNo normaliza ("EZY 1" → "EZY1")', legNo(LEGS[0]), 'EZY1');
eq('legNo aceita "flight"', legNo({ flight: 'tp 1234' }), 'TP1234');
eq('legNo sem número → ""', legNo({}), '');
eq('sem setores → -1', activeLegIndex([], { now: T('09:00'), onMs }), -1);
eq('antes da chegada planeada do 1.º → 0', activeLegIndex(LEGS, { now: T('09:00'), onMs }), 0);
eq('sem ao vivo, passou a hora planeada → 1', activeLegIndex(LEGS, { now: T('10:00'), onMs }), 1);
eq('O CASO: 1.º atrasado ainda no ar (estimada 10:30) → continua no 1.º', activeLegIndex(LEGS, { now: T('10:00'), onMs, live: { no: 'EZY1', arrTs: T('10:30') / 1000 } }), 0);
eq('1.º aterrou às 10:20 → passa ao 2.º', activeLegIndex(LEGS, { now: T('10:25'), onMs, live: { no: 'EZY1', arrTs: T('10:20') / 1000 } }), 1);
eq('ao vivo de OUTRO voo não mexe no 1.º (hora planeada manda)', activeLegIndex(LEGS, { now: T('09:00'), onMs, live: { no: 'EZY9', arrTs: T('08:00') / 1000 } }), 0);
eq('1.º aterrou ANTES da hora (09:30) → passa ao 2.º', activeLegIndex(LEGS, { now: T('09:35'), onMs, live: { no: 'EZY1', arrTs: T('09:30') / 1000 } }), 1);
eq('…e o ao vivo já segue o 2.º: NÃO volta ao 1.º (floor)', activeLegIndex(LEGS, { now: T('09:40'), onMs, live: { no: 'EZY2', arrTs: T('13:20') / 1000 }, floor: 1 }), 1);
eq('sem floor voltaria (prova de que o floor é preciso)', activeLegIndex(LEGS, { now: T('09:40'), onMs, live: { no: 'EZY2', arrTs: T('13:20') / 1000 } }), 0);
eq('todos aterrados → fica no último', activeLegIndex(LEGS, { now: T('15:00'), onMs }), 1);
eq('setor sem hora de chegada → é o ativo', activeLegIndex([{ flightNo: 'A1', on: null }, { flightNo: 'A2', on: '13:00' }], { now: T('12:00'), onMs }), 0);
eq('floor maior que o nº de setores → o último', activeLegIndex(LEGS, { now: T('09:00'), onMs, floor: 5 }), 1);

console.log(`\nflightStatus (desvio) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
