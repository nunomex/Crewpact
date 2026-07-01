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

const { depDelayMin, arrDelayMin, hasDeviation, worstDelay, settledArrZ, schedArrZ, recordBehindLive, storedMatchesReal } = require(path.resolve('data/flightDelay.js'));

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

console.log(`\nflightStatus (desvio) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
