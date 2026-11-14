/*
 * Golden das DURAÇÕES (data/duration.js) — uma escrita em toda a app (D1 de design/duracoes.html, 2026-11-14): sempre com "h"
 * ("8 h 35", "12 h", "45 min"); os dois pontos só nas horas do relógio. Pura.
 * Executar:  node scripts/duration.test.js   (ou: npm run test:duration)
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
const { durHM, durText, parseDur, maskDur } = require(path.resolve('data/duration.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};

// ── a escrita ──
eq('8 h 35', durHM(515), '8 h 35');
eq('horas certas, sem os minutos', durHM(720), '12 h');
eq('menos de 1 h, em minutos', durHM(45), '45 min');
eq('zero', durHM(0), '0 min');
eq('os minutos com dois algarismos', durHM(65), '1 h 05');
eq('sem sinal (o sinal diz-se à volta)', durHM(-20), '20 min');
eq('mais de 24 h (um repouso longo)', durHM(36 * 60 + 10), '36 h 10');
eq('arredonda ao minuto', durHM(89.6), '1 h 30');
eq('sem valor', [durHM(null), durHM(undefined), durHM(NaN), durHM('')], [null, null, null, null]);
eq('os milhares separados (a caderneta)', durHM(2140 * 60 + 5, { group: (h) => String(h).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }), '2 140 h 05');

// ── o que os motores devolvem ("h:mm") ──
eq('"08:35" → 8 h 35', durText('08:35'), '8 h 35');
eq('"11:45" → 11 h 45', durText('11:45'), '11 h 45');
eq('"0:20" → 20 min', durText('0:20'), '20 min');
eq('"13:00" → 13 h', durText('13:00'), '13 h');
eq('"-0:30" → 30 min (o sinal diz-se à volta)', durText('-0:30'), '30 min');
eq('o que não é h:mm fica', [durText('—'), durText(''), durText(null), durText('Incerto')], ['—', '', null, 'Incerto']);

// ── o que se escreve num campo ──
eq('"1 h 35"', parseDur('1 h 35'), 95);
eq('"1h35"', parseDur('1h35'), 95);
eq('"2 h"', parseDur('2 h'), 120);
eq('"45 min"', parseDur('45 min'), 45);
eq('"1:35" (o teclado de relógio)', parseDur('1:35'), 95);
eq('só o número = horas', parseDur('8'), 480);
eq('o que não se percebe', [parseDur(''), parseDur('abc'), parseDur('1 h 75'), parseDur(null)], [null, null, null, null]);

// ── a máscara do campo (só algarismos) ──
eq('1–2 algarismos: só o número', [maskDur('8'), maskDur('12')], ['8', '12']);
eq('3 algarismos: "1 h 35"', maskDur('135'), '1 h 35');
eq('4 algarismos: "13 h 50"', maskDur('1350'), '13 h 50');
eq('a máscara relê o que já escreveu', maskDur('1 h 355'), '13 h 55');
eq('apagar não prende: "1 h 3" → "13"', maskDur('1 h 3'), '13');
eq('zeros à frente', maskDur('0135'), '1 h 35');
eq('vazio', maskDur(''), '');
eq('a máscara e a leitura batem certo', [parseDur(maskDur('135')), parseDur(maskDur('8')), parseDur(maskDur('1350'))], [95, 480, 830]);

console.log(`durações — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
