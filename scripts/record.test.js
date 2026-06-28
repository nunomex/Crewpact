/*
 * Testes do registo individual ORO.FTL.245 (data/ftlRecord.js). A regra-chave: UMA linha
 * por PERÍODO DE SERVIÇO (não por dia) — um dia com 2 serviços rende 2 linhas e os totais
 * somam ambos. Sem framework; ESM→CJS via @babel/core (igual aos golden).
 * Executar: node scripts/record.test.js
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

const { buildRecordModel } = require(path.resolve('data/ftlRecord.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${JSON.stringify(want)}\n      obtido:   ${JSON.stringify(got)}`); }
};

// Dia com 1 serviço.
const d1 = { duty_date: '2026-06-15', report_time: '06:00', block_off: '06:30', block_on: '10:00', sectors: 1, flight_minutes: 180 };
// Dia com 2 serviços (primária + 1 extra) — a EASA conta os dois.
const d2 = {
  duty_date: '2026-06-16', report_time: '05:45', block_off: '06:15', block_on: '07:45', sectors: 1, flight_minutes: 90,
  extra: [{ report_time: '18:45', block_off: '19:15', block_on: '20:45', sectors: 1, flight_minutes: 90 }],
};
const model = buildRecordModel({ duties: { '2026-06-15': d1, '2026-06-16': d2 }, dayLog: {} });

eq('245: 1 dia simples + 1 dia de 2 serviços → 3 linhas', model.rows.length, 3);
eq('245: o dia simples mantém a data limpa', model.rows[0].date, '2026-06-15');
eq('245: 1.º serviço do dia duplo marcado (1/2)', model.rows[1].date, '2026-06-16 (1/2)');
eq('245: 2.º serviço do dia duplo marcado (2/2)', model.rows[2].date, '2026-06-16 (2/2)');
eq('245: serviços dentro do dia ordenados pelo report', [model.rows[1].report, model.rows[2].report], ['05:45', '18:45']);
eq('245: totais contam PERÍODOS de serviço (3)', model.totals.duties, 3);
eq('245: voo total soma os 3 serviços (180+90+90)', model.totals.flightMin, 360);
eq('245: setores totais somam os 3', model.totals.sectors, 3);

// Serviço extra sem horas → ignorado (não cria linha inválida).
const d3 = { duty_date: '2026-06-17', report_time: '08:00', block_on: '12:00', sectors: 1, flight_minutes: 120, extra: [{ kind: 'flight' }] };
const m3 = buildRecordModel({ duties: { '2026-06-17': d3 }, dayLog: {} });
eq('245: extra sem horas é ignorado → 1 linha, data limpa', [m3.rows.length, m3.rows[0].date], [1, '2026-06-17']);

console.log(`\nregisto 245 — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Uma linha por período de serviço (ORO.FTL.245) — dias com 2 serviços contam os dois.');
