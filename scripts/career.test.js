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

// ── LINHA DO TEMPO DO CONTRATO (2026-11-03): mudança de companhia, transferências de base e vínculo
// entram no Percurso como momentos próprios. easyJet FA (LIS, maio/2018) → base Faro em março/2022 →
// promoção a CM em fevereiro/2025 → entrada na TAP como CAB2, base Porto, em maio/2026. ──
const HIST_TL = [
  { category: 'FA', contract: '12/12', from: '2018-05' },
  { category: 'CM', contract: '12/12', from: '2025-02' },
  { category: 'CAB2', contract: '12/12', from: '2026-05' },
];
const COMP_TL = [{ company: 'ezy-id', crewType: 'cabin', from: '2018-05' }, { company: 'tap-id', crewType: 'cabin', from: '2026-05' }];
const BASE_TL = [{ base: 'LIS', from: '2018-05' }, { base: 'FAO', from: '2022-03' }, { base: 'OPO', from: '2026-05' }];
const coName = (id) => ({ 'ezy-id': 'easyJet', 'tap-id': 'TAP' }[id] || id);
const bName = (c) => ({ LIS: 'Lisboa', FAO: 'Faro', OPO: 'Porto' }[c] || c);
// baseAt pelo acordo DE CADA MÊS (como a app faz com o aeAt): easyJet até abril/2026, TAP depois.
const tapCab = require(path.resolve('ae/tapSnpvac.js'));
const baseAtTl = (cat, ym) => (ym < '2026-05' ? monthlyBase(cat, { ym }) : tapCab.monthlyBase(cat, { ym }));
const mTl = buildCareerModel({
  duties, crewHistory: HIST_TL, companyHistory: COMP_TL, baseHistory: BASE_TL, companyName: coName, baseName: bName,
  serviceStart: '2026-05-01', operator: 'TAP', base: 'Porto', categoryNow: 'CAB2', now: NOW, baseAt: baseAtTl,
});
eq('percurso com mudança: início → base → promoção → cobertura → entrada na TAP',
  mTl.timeline.map((e) => e.kind), ['start', 'base', 'change', 'coverage', 'company']);
eq('início com a companhia de ENTÃO (easyJet), não a de hoje', [mTl.timeline[0].ym, mTl.timeline[0].operator, mTl.timeline[0].category], ['2018-05', 'easyJet', 'FA']);
eq('transferência para Faro em março/2022', [mTl.timeline[1].ym, mTl.timeline[1].base], ['2022-03', 'Faro']);
eq('promoção a CM provada pelo acordo da easyJet', [mTl.timeline[2].category, mTl.timeline[2].up], ['CM', true]);
const evCo = mTl.timeline[4];
eq('entrada na TAP: mês, companhia, categoria e base nova', [evCo.ym, evCo.operator, evCo.category, evCo.base], ['2026-05', 'TAP', 'CAB2', 'Porto']);
ok('a mudança CM→CAB2 NÃO aparece como "mudança de categoria"', !mTl.timeline.some((e) => e.kind === 'change' && e.ym === '2026-05'));
eq('fantasma = a carreira toda (’18–’26), não só a TAP', mTl.header.ghost, '’18–’26');
const htmlTl = careerHtml(mTl, 'pt', '', (id, ym) => (ym && ym < '2026-05' ? { FA: 'Tripulante de Cabine', CM: 'Chefe de Cabine' } : { CAB2: 'CAB 2' })[id]);
ok('documento: "Entrada na TAP"', htmlTl.includes('Entrada na TAP'));
ok('documento: transferência de base', htmlTl.includes('Base Faro') && htmlTl.includes('transferência'));
ok('documento: "Início de serviço · easyJet"', htmlTl.includes('Início de serviço · easyJet'));
ok('documento: categorias com o nome do acordo de cada companhia', htmlTl.includes('Tripulante de Cabine') && htmlTl.includes('CAB 2'));
ok('documento: no cabeçalho, "Na companhia desde" (a data é da TAP)', htmlTl.includes('Na companhia desde'));
// Vínculo: agência → contrato com a companhia, na mesma companhia → momento próprio.
const mV = buildCareerModel({
  duties, crewHistory: [{ category: 'FA', contract: '12/12', from: '2018-05' }], serviceStart: '2018-05-14', now: NOW, companyName: coName,
  companyHistory: [{ company: 'ezy-id', crewType: 'cabin', employment: 'agency', from: '2018-05' }, { company: 'ezy-id', crewType: 'cabin', employment: 'employee', from: '2020-01' }],
});
const evV = mV.timeline.find((e) => e.kind === 'employment');
eq('vínculo: momento próprio em janeiro/2020', [evV && evV.ym, evV && evV.employment], ['2020-01', 'employee']);
ok('documento: "Vínculo · contrato com a companhia"', careerHtml(mV, 'pt').includes('Vínculo · contrato com a companhia'));
// Uma só companhia e base fixa: o percurso de sempre (sem momentos novos).
const mOne = buildCareerModel({ duties, crewHistory, serviceStart: '2018-05-14', now: NOW, companyHistory: [{ company: 'ezy-id', crewType: 'cabin', from: '2018-05' }], baseHistory: [{ base: 'LIS', from: '2018-05' }], companyName: coName });
eq('uma companhia: percurso igual ao de sempre', mOne.timeline.map((e) => e.kind), ['start', 'change', 'coverage']);

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
