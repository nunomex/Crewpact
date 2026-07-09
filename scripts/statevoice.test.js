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
eq('noite: frase noturna', vNight.bold, 'Noite tranquila.');

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
eq('véspera com report (+ destino amanhã)', vVes, { bold: 'Está tudo verificado — dorme.', tail: 'Report às 05:30.', to: 'amanha' });
eq('véspera SEM report → null (nunca se inventa)', stateVoice({ state: 'vespera', dateISO: '2026-07-09' }), null);
const vPer = stateVoice({ state: 'pernoita', dateISO: '2026-07-09', ctx: { station: 'FNC' } });
check('pernoita com estação', vPer && vPer.bold.includes('FNC'));
check('pernoita: destino amanhã', vPer && vPer.to === 'amanha');
const vPos = stateVoice({ state: 'posvoo', dateISO: '2026-07-09', ctx: { restUntil: '08:15' } });
check('pós-voo: destino hoje', vPos && vPos.to === 'hoje');

// ═══ METEO NA VOZ (mockup design/meteo-voz.html, aprovado 2026-07-10) ═══
// Frases de DECISÃO (amanhã tem serviço) > conforto de hoje; noite ganha a tudo;
// números sempre reais do digest; sem serviço amanhã as de decisão nunca disparam.
const COLD_TMW = { c: 8, min: 4, max: 14, icon: 'sun', tmwMin: 5, tmwRain: false };

// Frio no report de amanhã (folga de dia + serviço amanhã + mínima ≤6°)
const vCold = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: COLD_TMW, hour: 15, ctx: { tmwReport: '05:30' } });
eq('frio amanhã: casaco com números reais', vCold, { bold: 'Leva o casaco.', tail: '5° amanhã às 05:30.' });
eq('frio amanhã (EN)', stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: COLD_TMW, hour: 15, ctx: { tmwReport: '05:30' }, lang: 'en' }),
  { bold: 'Take the coat.', tail: '5° tomorrow at 05:30.' });

// Chuva amanhã cedo com serviço
const vRainTmw = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: { c: 27, min: 18, max: 28, icon: 'sun', tmwRain: true }, hour: 15, ctx: { tmwReport: '06:10' } });
eq('chuva amanhã: trânsito', vRainTmw.bold, 'Chove amanhã cedo.');

// Prioridade do rodapé do mockup: chuva-amanhã > frio-amanhã
const vBoth = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: { c: 8, min: 4, max: 12, icon: 'sun', tmwMin: 3, tmwRain: true }, hour: 15, ctx: { tmwReport: '06:10' } });
eq('prioridade: chuva-amanhã > frio', vBoth.bold, 'Chove amanhã cedo.');

// Sem serviço amanhã → frases de decisão NUNCA disparam (nem com frio no digest)
const vNoDuty = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: COLD_TMW, hour: 15 });
check('sem serviço amanhã: nada de casaco', vNoDuty && vNoDuty.bold !== 'Leva o casaco.');

// Vento ≥25 kt (hoje — o windKt é de agora, nunca promete amanhã)
const vWind = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: { c: 16, min: 14, max: 18, icon: 'cloud', wind: 30 }, hour: 15 });
eq('vento ≥25kt: chapéu', vWind, { bold: '30 nós lá fora.', tail: 'Segura o chapéu.' });

// Calor ≥26° com sol → pede rua (abaixo disso fica a pool de sol normal)
const vHot = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: { c: 27, min: 19, max: 27, icon: 'sun' }, hour: 11 });
eq('calor ≥26 e sol: pede rua', vHot, { bold: '27° e sol.', tail: 'A folga pede rua.' });

// Férias com sol ≥22°
const vFer = stateVoice({ state: 'ferias', dateISO: '2026-07-09', wx: { c: 24, min: 18, max: 24, icon: 'sun' } });
eq('férias com sol: zero responsabilidades', vFer, { bold: '24° e zero responsabilidades.', tail: 'Aproveita.' });

// Noite continua a ganhar a TUDO (às 22h com serviço amanhã o estado real já é véspera — sem bilhete)
const vNightCold = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: COLD_TMW, hour: 22, ctx: { tmwReport: '05:30' } });
eq('noite ganha às frases de decisão', vNightCold.bold, 'Noite tranquila.');

// ═══ AVISO NA VOZ (2026-07-10, "gostei disto") — o bilhete menciona a escala mexida ═══
// Registo humano, SEM números (a contagem vive na linha warn); ganha à meteo E à noite;
// só folga/férias — a DOENÇA fica calada (cuidar primeiro).
const vAviso = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN, hour: 15, ctx: { aviso: true } });
check('folga+aviso: fala da escala', vAviso && /escala/i.test(vAviso.bold + ' ' + vAviso.tail));
check('aviso: sem números', vAviso && !/\d/.test(vAviso.bold + vAviso.tail));
// Bilhete-LINK (2026-07-10): frases com destino levam-no; as normais ficam INERTES.
check('aviso: destino escala', vAviso && vAviso.to === 'escala');
check('folga normal: INERTE (sem destino)', vSun && vSun.to === undefined);
const vAvisoNight = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN, hour: 22, ctx: { aviso: true } });
check('aviso ganha à noite', vAvisoNight && /escala/i.test(vAvisoNight.bold + ' ' + vAvisoNight.tail));
const vAvisoFer = stateVoice({ state: 'ferias', dateISO: '2026-07-09', wx: { c: 24, min: 18, max: 24, icon: 'sun' }, ctx: { aviso: true } });
eq('férias+aviso ganha ao sol (+ destino)', vAvisoFer, { bold: 'A escala mexeu.', tail: 'Sem pressa — espreitas quando voltares.', to: 'escala' });
const vAvisoDoe = stateVoice({ state: 'doenca', dateISO: '2026-07-09', ctx: { aviso: true } });
eq('doença+aviso: a voz cuida, não avisa', vAvisoDoe, { bold: 'Cuida de ti.', tail: 'A escala pode esperar — as melhoras.' });
const vSemAviso = stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN, hour: 15 });
check('sem aviso: pool normal (nada de escala)', vSemAviso && !/mexeu|mexeram/i.test(vSemAviso.bold + vSemAviso.tail));
eq('determinismo do aviso', vAviso, stateVoice({ state: 'folga', dateISO: '2026-07-09', wx: SUN, hour: 15, ctx: { aviso: true } }));

console.log(`\nvoz do estado — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
