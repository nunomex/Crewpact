/*
 * Testes do export de dados pessoais (data/dataExport.js) — RGPD. Sem framework;
 * ESM→CJS via @babel/core (igual aos golden). Executar: node scripts/dataexport.test.js
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

const { buildDataExport, dataExportJson } = require(path.resolve('data/dataExport.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${JSON.stringify(want)}\n      obtido:   ${JSON.stringify(got)}`); }
};
const ok = (name, cond) => { if (cond) pass++; else { fail++; fails.push(`  ✗ ${name}`); } };

const INPUT = {
  account: { email: 'a@b.pt', name: 'Ana' },
  profile: { company: 'easyjet', crewType: 'pilot', crewCategory: 'CPT', crewContract: '12/12', base: 'LIS', serviceStart: '2016-03-01', lifestyle: false },
  duties: {
    '2026-06-10': { report_time: '06:00', block_off: '06:40', block_on: '12:00', sectors: 2, flight_minutes: 255, route: 'LIS-OPO-LIS', kind: 'flight', nightStop: true, source: 'calendar', snap: { x: 1 }, dirty: true, updated_at: 'Z' },
    '2026-06-11': { deleted: true, kind: 'flight' },   // apagada → fora
  },
  dayLog: { '2026-06-10': { src: 'duty', voo: 4.3 } },
  aeExtras: { '2026-06': { ddo: 1 } },
  generatedAt: '2026-06-22T00:00:00.000Z',
};
const r = buildDataExport(INPUT);

eq('app', r.app, 'CrewPact');
eq('schema', r.schema, 1);
eq('exportedAt (fixo)', r.exportedAt, '2026-06-22T00:00:00.000Z');
eq('conta email', r.account.email, 'a@b.pt');
eq('conta nome', r.account.name, 'Ana');
eq('perfil categoria', r.profile.category, 'CPT');
eq('perfil contrato', r.profile.contract, '12/12');
eq('perfil base', r.profile.base, 'LIS');
eq('perfil lifestyle', r.profile.lifestyle, false);
eq('duties: só 1 (apagada fora)', Object.keys(r.duties).length, 1);
eq('duties: rota', r.duties['2026-06-10'].route, 'LIS-OPO-LIS');
eq('duties: source preservado', r.duties['2026-06-10'].source, 'calendar');
ok('duties: sem flags internas (dirty/snap/updated_at)',
  !('dirty' in r.duties['2026-06-10']) && !('snap' in r.duties['2026-06-10']) && !('updated_at' in r.duties['2026-06-10']));
eq('FTL dayLog passthrough', r.ftlDayLog['2026-06-10'].voo, 4.3);
eq('AE extras passthrough', r.aeExtras['2026-06'].ddo, 1);
eq('counts.duties', r.counts.duties, 1);
eq('counts.ftlDays', r.counts.ftlDays, 1);
eq('counts.aeMonths', r.counts.aeMonths, 1);

// Robustez: input vazio não rebenta
const empty = buildDataExport({});
eq('vazio: duties {}', empty.counts.duties, 0);
eq('vazio: conta null', empty.account.email, null);
ok('vazio: exportedAt gerado', typeof empty.exportedAt === 'string' && empty.exportedAt.length > 0);

// JSON serializa e volta a parsear
const json = dataExportJson(INPUT);
ok('dataExportJson é string', typeof json === 'string');
const round = JSON.parse(json);
eq('JSON round-trip categoria', round.profile.category, 'CPT');
eq('JSON indentado (2 espaços)', json.includes('\n  "app"'), true);

console.log(`\nexport RGPD — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Export de dados pessoais (perfil + escala + FTL + AE) consistente.');
process.exit(0);
