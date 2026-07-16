/*
 * Testes do PROCESSO DE CARREIRA (data/careerRecord.js) — o logbook de tripulante.
 * As regras-chave: números por ano = yearStats (a mesma fonte das Estatísticas);
 * HONESTIDADE DE COBERTURA (etiqueta, ponto no Percurso, marcas nos anos parciais);
 * o € NUNCA entra no documento. Sem framework; ESM→CJS via @babel/core.
 * Executar: node scripts/career.test.js
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

const { buildCareerModel, careerHtml } = require(path.resolve('data/careerRecord.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${JSON.stringify(want)}\n      obtido:   ${JSON.stringify(got)}`); }
};
const ok = (name, cond) => eq(name, !!cond, true);

// ── Carreira sintética: registos de MAR 2025 a JAN 2026; início de serviço 2018;
// promoção FA→CM em FEV 2025 (antes da cobertura da app). ──
const NOW = new Date('2026-07-16T12:00:00');
const duties = {
  '2025-03-10': { report_time: '06:00', block_off: '06:40', block_on: '12:10', sectors: 2, flight_minutes: 300, route: 'LIS-LGW-LIS', kind: 'flight' },
  '2025-03-11': { report_time: '07:00', block_off: '07:40', block_on: '09:30', sectors: 1, flight_minutes: 100, route: 'LIS-FNC', kind: 'flight', nightStop: true },
  '2025-12-31': { report_time: '05:00', block_off: '05:40', block_on: '11:00', sectors: 2, flight_minutes: 290, route: 'LIS-LGW-LIS', kind: 'flight' },
  // Dia com 2 serviços — a EASA conta os dois (setores e voo somam primária + extra).
  '2026-01-05': {
    report_time: '06:00', block_off: '06:30', block_on: '08:00', sectors: 1, flight_minutes: 80, route: 'LIS-OPO', kind: 'flight',
    extra: [{ report_time: '18:00', block_off: '18:30', block_on: '20:00', sectors: 1, flight_minutes: 80, route: 'OPO-LIS', kind: 'flight' }],
  },
  // Apagado → invisível em TUDO (anos, cobertura, destinos).
  '2026-02-01': { deleted: true, report_time: '06:00', block_on: '10:00', sectors: 1, flight_minutes: 200, route: 'LIS-JFK', kind: 'flight' },
};
const crewHistory = [
  { category: 'FA', contract: '12/12', from: '2018-05' },
  { category: 'CM', contract: '12/12', from: '2025-02' },
];
const model = buildCareerModel({
  duties, crewHistory, serviceStart: '2018-05-14',
  name: 'Nuno <Silva>', crewId: 'EZY31245', operator: 'easyJet', base: 'LIS', categoryNow: 'CM',
  generatedAt: '16/07/2026', now: NOW,
});

// Anos — ascendentes (um documento de carreira lê-se do princípio para o fim).
eq('anos ascendentes', model.years.map((r) => r.year), ['2025', '2026']);
eq('2025: dias de serviço', model.years[0].days, 3);
eq('2025: setores', model.years[0].sectors, 5);
eq('2025: minutos de voo', model.years[0].flightMin, 690);
eq('2025: pernoitas', model.years[0].nightStops, 1);
eq('2026: dia duplo conta os 2 serviços (setores)', model.years[1].sectors, 2);
eq('2026: dia duplo soma o voo (80+80)', model.years[1].flightMin, 160);
eq('2026: dias de serviço (o dia duplo é 1 DIA)', model.years[1].days, 1);
ok('serviço (dutyMin) calculado quando há horas', model.years[0].dutyMin > 0);

// Honestidade de cobertura — as 3 camadas nascem daqui.
eq('cobertura: primeiro registo', model.coverage.first, '2025-03-10');
eq('cobertura: último registo', model.coverage.last, '2026-01-05');
eq('ano parcial no INÍCIO: 2025 marca "desde MAR"', model.years[0].fromMon, 3);
eq('ano corrente marca "até JUL"', model.years[1].toMon, 7);
eq('2025 não é o ano corrente → sem toMon', model.years[0].toMon, null);

// Totais = soma dos anos (e o apagado fica fora).
eq('totais: setores', model.totals.sectors, 7);
eq('totais: voo (min)', model.totals.flightMin, 850);
eq('totais: dias', model.totals.days, 4);
eq('apagado fora dos destinos (sem JFK)', model.destinations.top.some((d) => d.code === 'JFK'), false);

// Destinos — chegadas (o 1.º código é a origem); todos os serviços contam.
eq('destinos distintos (LGW·LIS·FNC·OPO)', model.destinations.count, 4);
eq('top 1 = LIS (3 chegadas: 2×LGW-LIS + OPO-LIS)', model.destinations.top[0], { code: 'LIS', n: 3 });
ok('LGW com 2 chegadas', model.destinations.top.some((d) => d.code === 'LGW' && d.n === 2));

// Percurso — início + promoção + ponto de cobertura, por ordem cronológica.
eq('percurso ordenado: início → promoção → cobertura',
  model.timeline.map((e) => e.kind), ['start', 'change', 'coverage']);
eq('início de serviço com a categoria de PARTIDA (FA)', [model.timeline[0].ym, model.timeline[0].category], ['2018-05', 'FA']);
eq('promoção CM em FEV 2025', [model.timeline[1].ym, model.timeline[1].category], ['2025-02', 'CM']);
eq('ponto de cobertura em MAR 2025', model.timeline[2].ym, '2025-03');

// Cabeçalho — fantasma do intervalo + antiguidade.
eq('fantasma "’18–’26"', model.header.ghost, '’18–’26');
eq('antiguidade: 8 anos completos', model.header.serviceYears, 8);

// Mudança SÓ de contrato → evento próprio (não é promoção).
const mC = buildCareerModel({
  duties, serviceStart: '2018-05-14', now: NOW,
  crewHistory: [{ category: 'FA', contract: '12/12', from: '2018-05' }, { category: 'FA', contract: '6/12', from: '2024-01' }],
});
ok('mudança só de contrato → kind "contract"', mC.timeline.some((e) => e.kind === 'contract' && e.ym === '2024-01'));

// ── Promoção PROVADA pela tabela do AE (baseAt) — nunca pela ordem dos arrays
// CATEGORIES (a TAP cabine ordena júnior→sénior; as outras ao contrário). ──
const HIST_UP = [{ category: 'FA', contract: '12/12', from: '2018-05' }, { category: 'CM', contract: '12/12', from: '2025-02' }];
const chg = (m) => m.timeline.find((e) => e.kind === 'change');
// Sem baseAt (perfis FTL-only) → up null → rótulo neutro.
eq('sem baseAt → up null (neutro)', chg(model).up, null);
// Com o AE REAL da cabine easyJet: FA→CM sobe a base → promoção provada.
const { monthlyBase } = require(path.resolve('ae/easyjetSnpvac.js'));
const baseAt = (cat, ym) => monthlyBase(cat, { ym });
const mUp = buildCareerModel({ duties, crewHistory: HIST_UP, serviceStart: '2018-05-14', now: NOW, baseAt });
eq('AE real: FA→CM = promoção (base sobe)', chg(mUp).up, true);
ok('documento escreve "promoção"', careerHtml(mUp, 'pt').includes('promoção'));
// Descida (CM→FA) → up false → o documento fica NEUTRO (nunca "despromoção").
const mDown = buildCareerModel({
  duties, serviceStart: '2018-05-14', now: NOW, baseAt,
  crewHistory: [{ category: 'CM', contract: '12/12', from: '2018-05' }, { category: 'FA', contract: '12/12', from: '2025-02' }],
});
eq('AE real: CM→FA → up false', chg(mDown).up, false);
const htmlDown = careerHtml(mDown, 'pt');
ok('descida fica neutra ("mudança de categoria", nunca "despromoção")',
  htmlDown.includes('mudança de categoria') && !htmlDown.includes('despromoção') && !htmlDown.includes('promoção'));
// baseAt que rebenta → up null (qualquer dúvida = neutro).
const mErr = buildCareerModel({ duties, crewHistory: HIST_UP, serviceStart: '2018-05-14', now: NOW, baseAt: () => { throw new Error('x'); } });
eq('baseAt com erro → up null (neutro)', chg(mErr).up, null);

// ── O documento ──
const html = careerHtml(model, 'pt', '', (id) => ({ CM: 'Cabin Manager', FA: 'Flight Attendant' }[id]));
ok('título no documento', html.includes('Processo de carreira'));
ok('nome ESCAPADO (sem <Silva> cru)', !html.includes('<Silva>') && html.includes('&lt;Silva&gt;'));
ok('nota de cobertura ("desde 10 MAR 2025")', html.includes('10 MAR 2025'));
ok('fronteira dos pilotos dita (FCL.050)', html.includes('FCL.050'));
ok('rótulo da categoria aplicado (Cabin Manager)', html.includes('Cabin Manager'));
ok('ano parcial marcado na tabela ("desde MAR")', html.includes('desde MAR'));
ok('o € NÃO entra no documento', !html.includes('€'));
ok('voo total no formato h:mm (14:10)', html.includes('14:10'));

// Vazio — o documento continua a nascer (sem anos, sem cobertura, sem NaN).
const mE = buildCareerModel({ duties: {}, now: NOW });
eq('vazio: sem anos nem cobertura', [mE.years.length, mE.coverage], [0, null]);
const htmlE = careerHtml(mE, 'pt');
ok('vazio: documento rende com "Sem registos"', htmlE.includes('Sem registos'));
ok('vazio: sem NaN no documento', !htmlE.includes('NaN'));

console.log(`\nprocesso de carreira — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Logbook honesto: cobertura em 3 camadas, yearStats como fonte, € fora do documento.');
