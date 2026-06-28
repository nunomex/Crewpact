/*
 * Testes da Biblioteca (data/library.js) — fontes oficiais + crew-aware. A regra-chave: SÓ
 * domínios oficiais (EUR-Lex / EASA / BTE / gov.pt); FTL é universal (sem split piloto/cabine);
 * AE é crew-aware (companhia + tipo). ESM→CJS via @babel/core (igual aos golden).
 * Executar: node scripts/library.test.js
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));

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

const { libraryFor, FTL_SOURCES, AE_SOURCES, AE_DEEPLINKS } = require(path.resolve('data/library.js'));

let pass = 0, fail = 0; const fails = [];
const ok = (name, cond) => { if (cond) pass++; else { fail++; fails.push('  ✗ ' + name); } };

// Domínios OFICIAIS permitidos (nada de blogs).
const OFFICIAL = ['eur-lex.europa.eu', 'easa.europa.eu', 'gep.msess.gov.pt', 'gep.mtsss.gov.pt', 'gov.pt'];
const hostOf = (url) => { const m = /^https:\/\/([^/]+)/.exec(String(url)); return m ? m[1] : ''; };
const allUrls = [...FTL_SOURCES, ...AE_SOURCES].map((x) => x.url);

ok('todos os links são HTTPS', allUrls.every((u) => /^https:\/\//.test(u)));
ok('todos os links são de domínios OFICIAIS', allUrls.every((u) => OFFICIAL.some((d) => hostOf(u).endsWith(d))));
ok('FTL aponta para EUR-Lex/EASA', FTL_SOURCES.every((x) => /eur-lex\.europa\.eu|easa\.europa\.eu/.test(x.url)));
ok('AE aponta para os portais do BTE/gov', AE_SOURCES.every((x) => /gep\.m(s|t)ess\.gov\.pt|gov\.pt/.test(x.url)));

// Estrutura crew-aware.
const piloto = libraryFor({ companyName: 'easyJet', isPilot: true, lang: 'pt' });
const cabine = libraryFor({ companyName: 'easyJet', isPilot: false, lang: 'pt' });
ok('2 secções: FTL + AE', piloto.length === 2 && piloto[0].key === 'ftl' && piloto[1].key === 'ae');
ok('FTL é UNIVERSAL (tag), igual p/ piloto e cabine', piloto[0].tag === cabine[0].tag && /Universal/i.test(piloto[0].tag));
ok('FTL: mesmos items p/ piloto e cabine (uma só lei)', JSON.stringify(piloto[0].items) === JSON.stringify(cabine[0].items));
ok('AE crew-aware: piloto inclui "Piloto" e a companhia', /Piloto/.test(piloto[1].tag) && /easyJet/.test(piloto[1].tag));
ok('AE crew-aware: cabine inclui "cabine"', /cabine/i.test(cabine[1].tag));
ok('AE difere entre piloto e cabine (tag)', piloto[1].tag !== cabine[1].tag);

// Deep-link do AE por COMPANHIA + TIPO: easyJet piloto = SPAC (BTE 40/2023); cabine = SNPVAC (BTE 8/2024).
const ezPiloto = libraryFor({ companySlug: 'easyjet', companyName: 'easyJet', isPilot: true, lang: 'pt' });
const ezCabine = libraryFor({ companySlug: 'easyjet', companyName: 'easyJet', isPilot: false, lang: 'pt' });
ok('AE easyJet piloto: 1.º link é o SPAC (DRE)', /SPAC/.test(ezPiloto[1].items[0].label) && /diariodarepublica\.pt/.test(ezPiloto[1].items[0].url));
ok('AE easyJet cabine: 1.º link é o SNPVAC (DRE)', /SNPVAC/.test(ezCabine[1].items[0].label) && /diariodarepublica\.pt/.test(ezCabine[1].items[0].url));
ok('AE deep-link piloto ≠ cabine (URL)', ezPiloto[1].items[0].url !== ezCabine[1].items[0].url);
const allDeepUrls = Object.values(AE_DEEPLINKS).flatMap((c) => [c.pilot.url, c.cabin.url]);
ok('AE deep-links (todas as companhias) são de domínio OFICIAL (DRE ou BTE)', allDeepUrls.every((u) => /^https:\/\/(files\.diariodarepublica\.pt|bte\.gep\.m(s|t)ess\.gov\.pt)\//.test(u)));
// Reconhece variações do nome da companhia (ex.: "easyJet Europe").
const ezEurope = libraryFor({ companySlug: 'easyjet-europe', companyName: 'easyJet Europe', isPilot: true, lang: 'pt' });
ok('AE: reconhece "easyJet Europe" → deep-link SPAC', /SPAC/.test(ezEurope[1].items[0].label));

// TAP: pilotos = SPAC (AE 30/06/2023); cabine = SNPVAC (em vigor 01/03/2024). Ambos DRE, até 31/12/2026.
const tapPiloto = libraryFor({ companySlug: 'tap', companyName: 'TAP', isPilot: true, lang: 'pt' });
const tapCabine = libraryFor({ companySlug: 'tap', companyName: 'TAP', isPilot: false, lang: 'pt' });
ok('AE TAP piloto: 1.º link é o SPAC (DRE)', /SPAC/.test(tapPiloto[1].items[0].label) && /diariodarepublica\.pt/.test(tapPiloto[1].items[0].url));
ok('AE TAP cabine: 1.º link é o SNPVAC (DRE)', /SNPVAC/.test(tapCabine[1].items[0].label) && /diariodarepublica\.pt/.test(tapCabine[1].items[0].url));
ok('AE TAP piloto ≠ cabine (URL)', tapPiloto[1].items[0].url !== tapCabine[1].items[0].url);
ok('AE TAP ≠ easyJet (deep-links distintos)', tapPiloto[1].items[0].url !== ezPiloto[1].items[0].url && tapCabine[1].items[0].url !== ezCabine[1].items[0].url);
ok('AE: reconhece slug "tap-air-portugal" → deep-link TAP', /TAP/.test(libraryFor({ companySlug: 'tap-air-portugal', companyName: 'TAP Air Portugal', isPilot: false, lang: 'pt' })[1].items[0].label));

// Companhia SEM deep-link (ex.: Ryanair) → só os portais genéricos, mas continua a funcionar.
const outra = libraryFor({ companySlug: 'ryanair', companyName: 'Ryanair', isPilot: true, lang: 'pt' });
ok('AE: companhia sem deep-link → 1.º link é o portal BTE', outra[1].items[0].key === 'bte');

console.log(`\nBiblioteca — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Só fontes oficiais (EUR-Lex/EASA/BTE) · FTL universal · AE crew-aware.');
