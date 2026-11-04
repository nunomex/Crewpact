/*
 * Golden da LINHA DO DIA DE SERVIÇO (data/dutyLine.js) — PURA, sem rede/React.
 * A barra do "em voo" passou a ser o dia de serviço: do REPORT ao LIMITE do PSV (a hora-limite de calços,
 * ORO.FTL.205 — a mesma do "PSV até"), com cada setor como um troço e o "agora". Pina as frações, a margem
 * à aterragem (limite − calços do último setor) e o caso de exceder (o limite fica marcado dentro da linha).
 * Escolhida pelo Nuno a 2026-11-03 (testar os estados; refs Zomato/Stardust no Mobbin).
 * Executar:  node scripts/dutyline.test.js   (ou: npm run test:dutyline)
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

const { dutyLine, fmtMargin } = require(path.resolve('data/dutyLine.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const r4 = (x) => (x == null ? x : Math.round(x * 10000) / 10000);
const D = '2026-11-03';
const ms = (hhmm, plusDays = 0) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(D + 'T00:00:00'); d.setDate(d.getDate() + plusDays); d.setHours(h, m, 0, 0); return d.getTime(); };

// ── O caso do iPhone: report 22:00, limite 09:00 (+1), LIS-FNC 22:45–00:30, agora 23:10 ──
const a = dutyLine({ reportMs: ms('22:00'), limitMs: ms('09:00', 1), sectors: [{ startMs: ms('22:45'), endMs: ms('00:30', 1) }], now: ms('23:10') });
eq('agora = 70/660', r4(a.nowPct), r4(70 / 660));
eq('setor começa 45/660', r4(a.sectors[0].a), r4(45 / 660));
eq('setor acaba 150/660', r4(a.sectors[0].b), r4(150 / 660));
eq('setor voado 25/105', r4(a.sectors[0].done), r4(25 / 105));
eq('limite no fim da linha', a.limitPct, 1);
eq('margem à aterragem = 8:30 (510 min)', a.marginMin, 510);
eq('não excede', a.over, false);
eq('aterragem = calços do último setor', a.landMs, ms('00:30', 1));

// ── Vários setores: LIS-CDG-LIS; o 1.º voado, o 2.º por voar ──
const b = dutyLine({ reportMs: ms('06:00'), limitMs: ms('19:00'),
  sectors: [{ startMs: ms('07:00'), endMs: ms('09:30') }, { startMs: ms('10:30'), endMs: ms('13:00') }], now: ms('10:00') });
eq('2 troços', b.sectors.length, 2);
eq('1.º voado todo', b.sectors[0].done, 1);
eq('2.º por voar', b.sectors[1].done, 0);
eq('margem pelo ÚLTIMO setor (19:00 − 13:00)', b.marginMin, 360);

// ── Excede: o limite fica DENTRO da linha e a margem é negativa ──
const c = dutyLine({ reportMs: ms('22:00'), limitMs: ms('00:00', 1), sectors: [{ startMs: ms('22:45'), endMs: ms('00:30', 1) }], now: ms('23:10') });
eq('excede', c.over, true);
eq('margem −30', c.marginMin, -30);
eq('linha estende até à aterragem: limite a 120/150', r4(c.limitPct), r4(120 / 150));
eq('setor acaba no fim da linha estendida', c.sectors[0].b, 1);

// ── Bordas ──
eq('sem limite → null', dutyLine({ reportMs: ms('22:00'), limitMs: null, sectors: [], now: ms('23:00') }), null);
eq('limite antes do report → null', dutyLine({ reportMs: ms('22:00'), limitMs: ms('21:00'), sectors: [], now: ms('23:00') }), null);
eq('antes do report → agora no início', dutyLine({ reportMs: ms('22:00'), limitMs: ms('09:00', 1), sectors: [], now: ms('21:00') }).nowPct, 0);
eq('depois do limite → agora no fim', dutyLine({ reportMs: ms('22:00'), limitMs: ms('09:00', 1), sectors: [], now: ms('10:00', 1) }).nowPct, 1);
eq('sem setores → sem margem', dutyLine({ reportMs: ms('22:00'), limitMs: ms('09:00', 1), sectors: [], now: ms('23:00') }).marginMin, null);
eq('setor inválido ignorado', dutyLine({ reportMs: ms('22:00'), limitMs: ms('09:00', 1), sectors: [{ startMs: ms('23:00'), endMs: ms('22:50') }], now: ms('23:00') }).sectors.length, 0);

// ── fmtMargin: minutos → H:MM (sem sinal; o sinal diz-se por palavras) ──
eq('510 → 8:30', fmtMargin(510), '8:30');
eq('−30 → 0:30', fmtMargin(-30), '0:30');
eq('5 → 0:05', fmtMargin(5), '0:05');

console.log(`\ndutyLine — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
