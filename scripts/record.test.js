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

// ── Auditoria 2026-11-06 (A-168): o PDF que o tripulante ASSINA (ORO.FTL.245(a)(1)) — "o início, a duração e o fim
// de cada período de serviço e de cada PSV" e "os períodos de repouso". O serviço inclui o pós-voo (ORO.FTL.105(11));
// o repouso é o que HOUVE até ao report seguinte, não o mínimo exigido; um serviço sem setores não tem PSV. ──
{
  const ds = {
    '2026-06-20': { report_time: '06:00', block_off: '06:30', block_on: '15:00', signOff: '15:45', sectors: 2, flight_minutes: 420 },
    '2026-06-21': { report_time: '06:30', block_off: '07:00', block_on: '12:00', sectors: 2, flight_minutes: 240 },
    '2026-06-22': { report_time: '17:00', block_on: '05:00', sectors: 0, kind: 'standby_home' },
  };
  const m = buildRecordModel({ duties: ds, dayLog: {}, postFlightMin: 30 });
  eq('A-168: PSV = apresentação → calços (09:00)', m.rows[0].fdp, '09:00');
  eq('A-168: Serviço = até ao sign-off (09:45)', m.rows[0].duty, '09:45');
  eq('A-168: Repouso = o que houve até ao report seguinte (14:45)', m.rows[0].rest, '14:45');
  eq('A-168: sem sign-off, serviço com o pós-voo do perfil (06:00)', m.rows[1].duty, '06:00');
  eq('A-168: standby em casa não tem PSV', m.rows[2].fdp, '—');
  eq('A-168: standby em casa nunca a vermelho', m.rows[2].over, false);
  eq('A-168: standby em casa — duração 12:00', m.rows[2].duty, '12:00');
  eq('A-168: o último serviço sem seguinte → repouso por saber', m.rows[2].rest, '—');
  // Voo sem hora de report: a linha existe (o voo conta), sem PSV nem serviço inventados.
  const mn = buildRecordModel({ duties: { '2026-06-23': { report_time: null, block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120 } }, dayLog: {} });
  eq('Sem report: a linha existe e conta o voo', [mn.rows.length, mn.totals.flightMin, mn.rows[0].fdp], [1, 120, '—']);
}

console.log(`\nregisto 245 — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Uma linha por período de serviço (ORO.FTL.245) — dias com 2 serviços contam os dois.');
