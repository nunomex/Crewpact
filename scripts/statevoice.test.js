/*
 * Golden da VOZ do estado (data/stateVoice.js) — PURA, curada, determinística.
 * Garante: mesma data+estado = mesma frase (o dia todo) · variante certa pelo tempo ·
 * placeholders preenchidos (nunca "{now}" cru) · fallback sem meteo · null onde não há voz.
 * Executar:  node scripts/statevoice.test.js   (ou: npm run test:voice)
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

const { stateVoice } = require(path.resolve('data/stateVoice.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const check = (label, cond) => { if (cond) { ok++; } else { fail++; console.log(`✗ ${label}`); } };

const SUN = { c: 27, min: 18, max: 28, icon: 'sun' };
const RAIN = { c: 14, min: 11, max: 14, icon: 'rain' };

// ── Determinismo: mesma data+estado → a MESMA frase; data diferente pode rodar ──
const a1 = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN });
const a2 = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN });
eq('mesma data = mesma frase', a1, a2);
check('estrutura {bold, tail}', a1 && typeof a1.bold === 'string' && typeof a1.tail === 'string');

// ── Placeholders preenchidos (nunca sai "{now}" cru) ──
const days = ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'];
check('sol: sem placeholders crus (5 dias)', days.every((d) => {
  const v = stateVoice({ state: 'folga', dateISO: d, wx: SUN });
  return v && !/\{\w+\}/.test(v.bold + v.tail);
}));

// ── Variante pelo tempo: chuva fala de chuva; sol fala de sol/céu ──
check('chuva: frase de chuva', days.some((d) => {
  const v = stateVoice({ state: 'folga', dateISO: d, wx: RAIN });
  return /chuva|chover|molhado|dentro/.test(v.bold + ' ' + v.tail);
}));
const vSun = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN });
check('sol: menciona sol/céu/°', /sol|céu|°/.test(vSun.bold + ' ' + vSun.tail));

// ── Noite (hora ≥21) ganha à variante do tempo ──
const vNight = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN, hour: 22 });
eq('noite: frase noturna', vNight.bold, 'noite tranquila.');

// ── Sem meteo → cai na pool base (sem temperatura na frase) ──
const vNo = stateVoice({ state: 'folga', dateISO: '2026-07-09' });
check('sem wx: frase base sem °', vNo && !/°/.test(vNo.bold + vNo.tail));

// ── EN ──
const vEn = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN, lang: 'en' });
check('EN: frase em inglês', /rest|day|sun|clock/.test(vEn.bold + ' ' + vEn.tail));

// ── Estados sem voz / futuros ──
eq('disrupção não tem voz', stateVoice({ state: 'disrupcao', dateISO: '2026-07-09' }), null);
eq('desconhecido → null', stateVoice({ state: 'xpto', dateISO: '2026-07-09' }), null);
const vVes = stateVoice({ state: 'vespera', dateISO: '2026-07-09', ctx: { report: '05:30' } });
eq('véspera com report', vVes, { bold: 'está tudo verificado — dorme.', tail: 'report às 05:30.' });
eq('véspera SEM report → null (nunca se inventa)', stateVoice({ state: 'vespera', dateISO: '2026-07-09' }), null);
const vPer = stateVoice({ state: 'pernoita', dateISO: '2026-07-09', ctx: { station: 'FNC' } });
check('pernoita com estação', vPer && vPer.bold.includes('FNC'));

console.log(`\nvoz do estado — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
