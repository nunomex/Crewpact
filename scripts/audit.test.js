/*
 * Golden da AUDITORIA DO MÊS (data/audit.js) — o radar do dinheiro esquecido.
 * Valida com o AE REAL da cabine easyJet (ae/easyjetSnpvac): pernoita por marcar (€ exato),
 * rotas em falta (≥ banda mínima), SNC/RDP do arquivo MENOS os registados, gates honestos.
 * Executar: node scripts/audit.test.js  (ou: npm run test:audit)
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

const { monthAudit } = require(path.resolve('data/audit.js'));
const ae = require(path.resolve('ae/easyjetSnpvac.js'));

let ok = 0, fail = 0; const fails = [];
const check = (name, cond) => { if (cond) ok++; else { fail++; fails.push('  ✗ ' + name); } };

const OPTS = { ym: '2026-07', ae, cat: 'FA', fleet: null, base: 'LIS', rosterLog: [], events: [], isPilot: false };

// ── Detetor NIGHTSTOP: acaba fora sem flag → € exato; com flag/na base → nada ──
const nsDuties = {
  '2026-07-09': { kind: 'flight', route: 'LIS-FNC', sectors: 1, flight_minutes: 105 },                      // acaba FORA, sem flag → item
  '2026-07-10': { kind: 'flight', route: 'FNC-LIS', sectors: 1, flight_minutes: 105 },                      // acaba na BASE → nada
  '2026-07-12': { kind: 'flight', route: 'LIS-LGW', sectors: 1, flight_minutes: 155, nightStop: true },     // fora mas MARCADA → nada
};
const nsA = monthAudit(nsDuties, OPTS);
check('nightstop: 1 item (o dia 9, FNC)', nsA.items.filter((i) => i.kind === 'nightstop').length === 1 && nsA.items[0].date === '2026-07-09' && nsA.items[0].station === 'FNC');
check('nightstop: € exato do AE (46)', nsA.items[0].eur === 46);
check('nightstop: provaId pernoita (o § explica)', nsA.items[0].provaId === 'pernoita');

// ── Detetor ROUTE: sem rota / irresolúvel → item agregado com ≥ banda mínima ──
const rtDuties = {
  '2026-07-06': { kind: 'flight', sectors: 2, flight_minutes: 200 },                          // SEM rota → conta
  '2026-07-14': { kind: 'flight', route: 'LIS-ZZZ', sectors: 2, flight_minutes: 200 },        // irresolúvel → conta
  '2026-07-20': { kind: 'flight', route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 210, nightStop: false },  // rota OK → não conta (mas FNC-LIS acaba na base: sem nightstop)
};
const rtA = monthAudit(rtDuties, OPTS);
const rt = rtA.items.find((i) => i.kind === 'route');
check('route: item agregado com os 2 dias', rt && rt.dates.length === 2 && rt.dates.includes('2026-07-06') && rt.dates.includes('2026-07-14'));
check('route: eurMin > 0 (banda mínima × setores, "≥")', rt && rt.eurMin > 0);
check('route: provaId perDiem', rt && rt.provaId === 'perDiem');
check('route: rota completa NÃO conta', rt.dates.indexOf('2026-07-20') === -1);

// ── Detetor SNC: candidato do arquivo; o REGISTADO não repete ──
const sncLog = [{
  dutyDate: '2026-07-17', detectedAt: '2026-07-16T10:00:00',
  before: { report: '10:00', end: '18:00', sectors: 4, kind: 'flight' },
  after:  { report: '07:30', end: '18:00', sectors: 4 },
}];
const sncA = monthAudit({}, { ...OPTS, rosterLog: sncLog });
const snc = sncA.items.find((i) => i.kind === 'snc');
check('snc: candidato detetado (antecipação ≥2h nas 48h)', !!snc && snc.date === '2026-07-17');
check('snc: € do crédito do AE (>0)', snc && snc.eur > 0);
const sncReg = monthAudit({}, { ...OPTS, rosterLog: sncLog, events: [{ date: '2026-07-17', type: 'snc' }] });
check('snc REGISTADO não repete', sncReg.items.filter((i) => i.kind === 'snc').length === 0);
const sncDup = monthAudit({}, { ...OPTS, rosterLog: [...sncLog, ...sncLog] });
check('snc duplicado no arquivo → 1 item', sncDup.items.filter((i) => i.kind === 'snc').length === 1);

// ── Fora do mês / apagadas / gates ──
check('fora do mês não conta', monthAudit({ '2026-06-09': { kind: 'flight', route: 'LIS-FNC', sectors: 1, flight_minutes: 100 } }, OPTS).count === 0);
check('apagada não conta', monthAudit({ '2026-07-09': { kind: 'flight', route: 'LIS-FNC', sectors: 1, flight_minutes: 100, deleted: true } }, OPTS).count === 0);
check('sem AE → radar vazio (gate)', monthAudit(nsDuties, { ...OPTS, ae: null }).count === 0);
check('sem categoria → radar vazio (gate)', monthAudit(nsDuties, { ...OPTS, cat: null }).count === 0);

// ── Totais + ordenação + determinismo ──
const all = monthAudit({ ...nsDuties, ...rtDuties }, { ...OPTS, rosterLog: sncLog });
check('total = soma (eur|eurMin)', Math.abs(all.totalEur - all.items.reduce((s, i) => s + (i.eur ?? i.eurMin ?? 0), 0)) < 0.01);
check('ordenado por € descendente', all.items.every((it, i, a) => i === 0 || ((a[i - 1].eur ?? a[i - 1].eurMin ?? 0) >= (it.eur ?? it.eurMin ?? 0))));
check('determinismo', JSON.stringify(all) === JSON.stringify(monthAudit({ ...nsDuties, ...rtDuties }, { ...OPTS, rosterLog: sncLog })));

console.log(`\nauditoria do mês — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Detetores honestos · € exato/mínimo · registados não repetem · gates.');
