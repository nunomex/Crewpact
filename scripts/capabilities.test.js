/*
 * Testes da matriz de capacidades (data/capabilities.js) — fixa o que cada perfil
 * (companhia AE/FTL × crewType piloto/cabine) mostra/pede. Sem framework; ESM→CJS
 * via @babel/core (igual aos golden). Executar:  node scripts/capabilities.test.js
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

const { capabilitiesFor, isLongHaulCompany } = require(path.resolve('data/capabilities.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (got === want) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${want}\n      obtido:   ${got}`); }
};

const AE = { slug: 'easyjet', rule_type: 'AE' };
const FTL = { slug: 'someftl', rule_type: 'FTL' };

// ── AE · piloto ──
{
  const c = capabilitiesFor({ company: AE, crewType: 'pilot' });
  eq('AE piloto: hasAe', c.hasAe, true);
  eq('AE piloto: pay', c.pay, true);
  eq('AE piloto: route', c.route, true);
  eq('AE piloto: perDiem', c.perDiem, true);
  eq('AE piloto: askCategory', c.askCategory, true);
  eq('AE piloto: askContract', c.askContract, true);
  eq('AE piloto: askServiceStart', c.askServiceStart, true);
  eq('AE piloto: extras (monthExtras)', c.extras, true);
  eq('AE piloto: isPilot', c.isPilot, true);
  eq('report offset = 0', c.reportOffsetMin, 0);
}

// ── AE · cabine ──
{
  const c = capabilitiesFor({ company: AE, crewType: 'cabin' });
  eq('AE cabine: hasAe', c.hasAe, true);
  eq('AE cabine: pay', c.pay, true);
  eq('AE cabine: route', c.route, true);
  eq('AE cabine: askCategory (cabine tem rank)', c.askCategory, true);
  eq('AE cabine: askContract (cabine tem contrato)', c.askContract, true);
  eq('AE cabine: extras (cabine tem monthExtras)', c.extras, true);
  eq('AE cabine: retention (só piloto) false', c.retention, false);
  eq('AE cabine: isPilot', c.isPilot, false);
}

// ── AE · piloto NÃO ABRANGIDO (agência/independente/não-filiado): FTL-only p/ pay, mas rota fica ──
{
  const c = capabilitiesFor({ company: AE, crewType: 'pilot', aeCovered: false });
  eq('não-coberto: companyHasAe (companhia tem AE)', c.companyHasAe, true);
  eq('não-coberto: hasAe false (pagamento)', c.hasAe, false);
  eq('não-coberto: pay false', c.pay, false);
  eq('não-coberto: perDiem false', c.perDiem, false);
  eq('não-coberto: askCategory false', c.askCategory, false);
  eq('não-coberto: extras false', c.extras, false);
  eq('não-coberto: retention false', c.retention, false);
  eq('não-coberto: ROTA fica (aeroportos, registo)', c.route, true);
}

// ── FTL-only (qualquer crewType) ──
{
  const c = capabilitiesFor({ company: FTL, crewType: 'cabin' });
  eq('FTL: hasAe', c.hasAe, false);
  eq('FTL: pay', c.pay, false);
  eq('FTL: route (sem rota — setores diretos)', c.route, false);
  eq('FTL: perDiem', c.perDiem, false);
  eq('FTL: askCategory', c.askCategory, false);
  eq('FTL: askContract', c.askContract, false);
  eq('FTL: askServiceStart', c.askServiceStart, false);
  eq('FTL: extras', c.extras, false);
  eq('FTL: retention', c.retention, false);
  const cp = capabilitiesFor({ company: FTL, crewType: 'pilot' });
  eq('FTL piloto: pay continua false', cp.pay, false);
}

// ── Retenção sazonal vs estilo de vida (#3 / Art. 66.9) ──
{
  eq('retenção: PPY 8/12 sazonal → true', capabilitiesFor({ company: AE, crewType: 'pilot', contract: 'PPY 8/12' }).retention, true);
  eq('retenção: PPY 9/12 sazonal → true', capabilitiesFor({ company: AE, crewType: 'pilot', contract: 'PPY 9/12' }).retention, true);
  eq('retenção: PPY 8/12 estilo de vida → false', capabilitiesFor({ company: AE, crewType: 'pilot', contract: 'PPY 8/12', lifestyle: true }).retention, false);
  eq('retenção: 12/12 (não sazonal) → false', capabilitiesFor({ company: AE, crewType: 'pilot', contract: '12/12' }).retention, false);
  eq('retenção: cabine sazonal → false (não piloto)', capabilitiesFor({ company: AE, crewType: 'cabin', contract: 'PPY 8/12' }).retention, false);
}

// ── Sem companhia (estado inicial) → tudo FTL-like ──
{
  const c = capabilitiesFor({});
  eq('sem companhia: hasAe', c.hasAe, false);
  eq('sem companhia: pay', c.pay, false);
}

// ── Longo-curso (isLongHaulCompany): data-driven (flag BD) com fallback por nome ──
eq('longHaul: Hi Fly por flag da BD', isLongHaulCompany({ slug: 'hifly', long_haul: true }), true);
eq('longHaul: Hi Fly por nome (fallback)', isLongHaulCompany({ slug: 'x', name: 'Hi Fly' }), true);
eq('longHaul: Hi Fly por slug (fallback)', isLongHaulCompany({ slug: 'hifly', name: 'Hi Fly Airline' }), true);
eq('longHaul: easyJet não', isLongHaulCompany({ slug: 'easyjet', name: 'easyJet' }), false);
eq('longHaul: jet2 não', isLongHaulCompany({ slug: 'jet2', name: 'Jet2' }), false);
eq('longHaul: flag sobrepõe (nova companhia)', isLongHaulCompany({ slug: 'newco', name: 'New Co', long_haul: true }), true);
eq('longHaul: sem companhia → false', isLongHaulCompany(null), false);
eq('longHaul: na matriz (Hi Fly)', capabilitiesFor({ company: { slug: 'hifly', name: 'Hi Fly', rule_type: 'FTL' } }).longHaul, true);
eq('longHaul: na matriz (easyJet) → false', capabilitiesFor({ company: { slug: 'easyjet', rule_type: 'AE' } }).longHaul, false);

console.log(`\nCapabilities — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Matriz AE/FTL × piloto/cabine consistente.');
