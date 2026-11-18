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
  eq('A-168: PSV = apresentação → calços (9 h)', m.rows[0].fdp, '9 h');
  eq('A-168: Serviço = até ao sign-off (9 h 45)', m.rows[0].duty, '9 h 45');
  eq('A-168: Repouso = o que houve até ao report seguinte (14 h 45)', m.rows[0].rest, '14 h 45');
  eq('A-168: sem sign-off, serviço com o pós-voo do perfil (6 h)', m.rows[1].duty, '6 h');
  eq('A-168: standby em casa não tem PSV', m.rows[2].fdp, '—');
  eq('A-168: standby em casa nunca a vermelho', m.rows[2].over, false);
  eq('A-168: standby em casa — duração 12 h', m.rows[2].duty, '12 h');
  eq('A-168: o último serviço sem seguinte → repouso por saber', m.rows[2].rest, '—');
  // Voo sem hora de report: a linha existe (o voo conta), sem PSV nem serviço inventados.
  const mn = buildRecordModel({ duties: { '2026-06-23': { report_time: null, block_off: '07:00', block_on: '09:00', sectors: 1, flight_minutes: 120 } }, dayLog: {} });
  eq('Sem report: a linha existe e conta o voo', [mn.rows.length, mn.totals.flightMin, mn.rows[0].fdp], [1, 120, '—']);
}

// ── O ARQUIVO COMO PROVA (sessão Fable 5.2, ponto 7, 2026-11-17) ──
// A companhia corrige as horas no calendário depois do voo, e a app guarda a mudança no arquivo (antes → depois + quando a viu).
// O Registo 245 mostra as horas REAIS (as que ficaram na escala); a correção vai com a linha, como prova: prevista → real ·
// vista a … Só conta como correção o que a app viu DEPOIS de o serviço começar (a hora de apresentação prevista): antes disso é
// uma mudança de escala, não as horas reais.
{
  const { hourCorrections } = require(path.resolve('data/ftlRecord.js'));
  const svc = { duty_date: '2026-07-14', report_time: '09:30', block_off: '10:00', block_on: '19:35', sectors: 2, flight_minutes: 300 };
  const E = (o) => ({ id: 'x', dutyDate: '2026-07-14', source: 'calendar', before: { report: '09:30', end: '17:30', sectors: 2, kind: 'flight' }, after: { report: '09:30', end: '19:35', sectors: 2, kind: 'flight' }, ...o });
  const run = (log) => buildRecordModel({ duties: { '2026-07-14': svc }, dayLog: {}, rosterLog: log });
  const c1 = run([E({ detectedAt: '2026-07-14T21:40' })]).rows[0].corrected;
  eq('correção vista depois do voo: prevista → real, com a hora em que a app a viu', c1, { plannedReport: '09:30', plannedEnd: '17:30', realReport: '09:30', realEnd: '19:35', seenAt: '2026-07-14T21:40' });
  eq('mudança vista ANTES de o serviço começar: é escala, não correção', run([E({ detectedAt: '2026-07-14T08:00' })]).rows[0].corrected, undefined);
  eq('sem arquivo: a linha não muda', run([]).rows[0].corrected, undefined);
  // Duas correções depois do voo: a prevista é a da 1.ª, a real a da última, e a hora a da última.
  const two = run([E({ detectedAt: '2026-07-14T20:00', after: { report: '09:30', end: '19:00', sectors: 2, kind: 'flight' } }),
    E({ detectedAt: '2026-07-15T07:10', before: { report: '09:30', end: '19:00', sectors: 2, kind: 'flight' } })]).rows[0].corrected;
  eq('duas correções: a prevista da 1.ª, a real da última', two, { plannedReport: '09:30', plannedEnd: '17:30', realReport: '09:30', realEnd: '19:35', seenAt: '2026-07-15T07:10' });
  // Uma mudança de escala antes e a correção depois: a "prevista" é a que estava na escala quando o serviço começou.
  const mix = run([E({ detectedAt: '2026-07-13T10:00', before: { report: '08:00', end: '16:00', sectors: 2, kind: 'flight' }, after: { report: '09:30', end: '17:30', sectors: 2, kind: 'flight' } }),
    E({ detectedAt: '2026-07-14T21:40' })]).rows[0].corrected;
  eq('mudança de escala antes + correção depois: a prevista é a do início do serviço', [mix.plannedReport, mix.plannedEnd, mix.realEnd], ['09:30', '17:30', '19:35']);
  // Só os setores mudaram (as horas iguais): não é uma correção de horas.
  eq('horas iguais: sem correção', run([E({ detectedAt: '2026-07-14T21:40', after: { report: '09:30', end: '17:30', sectors: 4, kind: 'flight' } })]).rows[0].corrected, undefined);
  // A lista pura (para os outros relatórios): por dia.
  eq('hourCorrections: por dia', Object.keys(hourCorrections([E({ detectedAt: '2026-07-14T21:40' }), E({ dutyDate: '2026-07-20', detectedAt: '2026-07-19T10:00' })])), ['2026-07-14']);
  // O modelo diz quantas linhas levam correção (o PDF decide como as mostra).
  eq('modelo: a conta das linhas corrigidas', run([E({ detectedAt: '2026-07-14T21:40' })]).header.corrected, 1);
}

// ── 2.ª REVISÃO INDEPENDENTE (2026-11-18) ──
{
  // Achado 9: a apresentação adiada das 11:00 para as 15:00, vista às 12:00 — o serviço ainda não tinha começado (a apresentação
  // nova é às 15:00): é uma mudança de escala, não uma correção das horas.
  const svc = { duty_date: '2026-07-14', report_time: '15:00', block_off: '15:30', block_on: '21:30', sectors: 2, flight_minutes: 300 };
  const log = [{ id: 'x', dutyDate: '2026-07-14', detectedAt: '2026-07-14T12:00', source: 'calendar', before: { report: '11:00', end: '17:30', sectors: 2, kind: 'flight' }, after: { report: '15:00', end: '21:30', sectors: 2, kind: 'flight' } }];
  eq('revisão 2/9: adiada antes de começar (a nova apresentação ainda não passou) → não é correção', buildRecordModel({ duties: { '2026-07-14': svc }, dayLog: {}, rosterLog: log }).rows[0].corrected, undefined);
  // Achado 7: um serviço sem horas tem a sua linha (com "—"), e o repouso de antes dele não se afirma por cima dele.
  const A = { duty_date: '2026-07-01', report_time: '06:00', block_off: '06:30', block_on: '10:00', sectors: 1, flight_minutes: 180 };
  const B = { duty_date: '2026-07-02', kind: 'flight', report_time: null, block_off: null, block_on: null, route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 0 };
  const C4 = { duty_date: '2026-07-04', report_time: '06:00', block_off: '06:30', block_on: '10:00', sectors: 1, flight_minutes: 180 };
  const m = buildRecordModel({ duties: { '2026-07-01': A, '2026-07-02': B, '2026-07-04': C4 }, dayLog: {} });
  eq('revisão 2/7: o serviço sem horas tem linha; o repouso antes dele fica em aberto', [m.rows.length, m.rows[0].rest, m.rows[1].report, m.rows[1].duty, m.rows[1].rest], [3, '—', '—', '—', '—']);
  eq('revisão 2/7: sem ele, o repouso é o que houve', buildRecordModel({ duties: { '2026-07-01': A, '2026-07-04': C4 }, dayLog: {} }).rows[0].rest, '68 h');
}

console.log(`\nregisto 245 —${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Uma linha por período de serviço (ORO.FTL.245) — dias com 2 serviços contam os dois.');
