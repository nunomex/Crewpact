/*
 * Golden da PROVA (data/prova.js) — "todo o número abre a sua lei". As regras-chave:
 * toda a entrada resolvida tem artigo+resumo+URL de domínio OFICIAL (os da Biblioteca);
 * crew-aware = cabine ≠ pilotos (Art. 53.º ≠ 37.º na easyJet); universais iguais para os
 * dois tipos; SEM âncora verificada → null (nunca se inventa — ex.: per-diem TAP pilotos v1).
 * Executar: node scripts/prova.test.js  (ou: npm run test:prova)
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

const { provaFor } = require(path.resolve('data/prova.js'));

let ok = 0, fail = 0; const fails = [];
const check = (name, cond) => { if (cond) ok++; else { fail++; fails.push('  ✗ ' + name); } };

const OFFICIAL = /^https:\/\/(eur-lex\.europa\.eu|www\.easa\.europa\.eu|files\.diariodarepublica\.pt|bte\.gep\.m(s|t)ess\.gov\.pt|www\.faa\.gov)\//;
const full = (p) => p && p.title && p.art && p.resumo && p.resumo.length > 40 && p.lawTag && p.ref && OFFICIAL.test(p.url);

const EZ_CAB = { companySlug: 'easyjet', companyName: 'easyJet', isPilot: false };
const EZ_PIL = { companySlug: 'easyjet', companyName: 'easyJet', isPilot: true };
const TAP_CAB = { companySlug: 'tap', companyName: 'TAP', isPilot: false };
const TAP_PIL = { companySlug: 'tap', companyName: 'TAP', isPilot: true };

// ── Universais: iguais para piloto e cabine, URL EUR-Lex ──
for (const id of ['psvMax', 'repouso', 'limites', 'standby', 'radiacao']) {
  const c = provaFor(id, EZ_CAB), p = provaFor(id, EZ_PIL);
  check(`universal ${id}: completa e oficial`, full(c));
  check(`universal ${id}: igual p/ cabine e pilotos`, JSON.stringify(c) === JSON.stringify(p));
  check(`universal ${id}: marcada universal`, c.universal === true && /Universal/i.test(c.lawTag));
}
check('limites cita ORO.FTL.210', provaFor('limites', EZ_CAB).art === 'ORO.FTL.210');
check('radiação cita 35.º/3 e vai ao EUR-Lex', /35/.test(provaFor('radiacao', EZ_CAB).art) && /eur-lex/.test(provaFor('radiacao', EZ_CAB).url));

// ── easyJet: cabine ≠ pilotos (acordos separados, artigos separados) ──
const ezCabPd = provaFor('perDiem', EZ_CAB), ezPilPd = provaFor('perDiem', EZ_PIL);
check('easyJet cabine per diem = Art. 53.º (SNPVAC)', full(ezCabPd) && /53/.test(ezCabPd.art) && /SNPVAC/.test(ezCabPd.lawTag));
check('easyJet pilotos per diem = Art. 37.º (SPAC)', full(ezPilPd) && /37/.test(ezPilPd.art) && /SPAC/.test(ezPilPd.lawTag));
check('easyJet: URLs de acordos DIFERENTES (deep-links da Biblioteca)', ezCabPd.url !== ezPilPd.url);
check('easyJet cabine pernoita = Art. 56.º', /56/.test(provaFor('pernoita', EZ_CAB).art));
check('easyJet pilotos pernoita = Art. 39.º (2 setores nominais)', /39/.test(provaFor('pernoita', EZ_PIL).art));
check('easyJet doença: 61.º cabine ≠ 48.º pilotos', /61/.test(provaFor('doenca', EZ_CAB).art) && /48/.test(provaFor('doenca', EZ_PIL).art));
check('easyJet cabine: WFLY (69.º) e abono (54.º) existem', /69/.test(provaFor('wfly', EZ_CAB).art) && /54/.test(provaFor('cash', EZ_CAB).art));

// ── TAP: cláusulas (não artigos) + ausências honestas ──
const tapCabPd = provaFor('perDiem', TAP_CAB);
check('TAP cabine per diem = Cl. 7.ª (AC1, por DIA)', full(tapCabPd) && /7\.ª/.test(tapCabPd.art) && /dia/i.test(tapCabPd.resumo));
check('TAP cabine: base (Cl. 3.ª) e férias (Cl. 23.ª)', /3\.ª/.test(provaFor('base', TAP_CAB).art) && /23\.ª/.test(provaFor('ferias', TAP_CAB).art));
check('TAP pilotos per diem = NULL (sem âncora verificada — nunca se inventa)', provaFor('perDiem', TAP_PIL) === null);
check('TAP pilotos: férias (Cl. 45.ª) e comando (Cl. 11.ª) existem', /45\.ª/.test(provaFor('ferias', TAP_PIL).art) && /11\.ª/.test(provaFor('comando', TAP_PIL).art));

// ── Companhia sem AE modelado → entradas AE ausentes; universais continuam ──
const RYR = { companySlug: 'ryanair', companyName: 'Ryanair', isPilot: false };
check('Ryanair: per diem → null (AE não modelado)', provaFor('perDiem', RYR) === null);
check('Ryanair: PSV máx continua (universal)', full(provaFor('psvMax', RYR)));

// ── EN + id desconhecido + determinismo ──
check('EN: resumo em inglês', /hours|sector|rest/i.test(provaFor('repouso', { ...EZ_CAB, lang: 'en' }).resumo));
check('id desconhecido → null', provaFor('xpto', EZ_CAB) === null);
check('determinismo', JSON.stringify(provaFor('perDiem', EZ_CAB)) === JSON.stringify(provaFor('perDiem', EZ_CAB)));

console.log(`\nProva — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Artigos verificados · crew-aware · fontes oficiais · ausências honestas.');
