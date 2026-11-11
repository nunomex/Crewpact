/*
 * Testes do motor de Alterações de Escala (data/rosterDiff.js) — modelo de snapshot
 * (3 vias) + cancelamentos. Sem framework. Executar: node scripts/roster-diff.test.js
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
let cjsPlugin; try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); } catch { cjsPlugin = null; }
const transform = (src, filename) => babel.transformSync(src, { filename, babelrc: false, configFile: false, presets: cjsPlugin ? [] : [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]], plugins: cjsPlugin ? [cjsPlugin] : [] }).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) { if (filename.includes('node_modules')) return origJs(m, filename); m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename); };

const { diffDuty, classify, diffRoster, shortNoticeCandidates } = require(path.resolve('data/rosterDiff.js'));

let pass = 0, fail = 0;
const eq = (label, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; else { fail++; console.error(`✗ ${label}\n    esperado: ${JSON.stringify(want)}\n    obtido:   ${JSON.stringify(got)}`); } };
const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${label}`); } };

// diffDuty
eq('iguais (case/—)', diffDuty({ report_time: '10:50', route: 'LIS-OPO', sectors: 2 }, { report_time: '10:50', route: 'lis-opo', sectors: 2 }), []);
eq('report mudou', diffDuty({ report_time: '10:50' }, { report_time: '11:30' }).map(f => f.key), ['report_time']);

// classify — calendário mudou, sem edição → changed
eq('classify changed', classify(
  { report_time: '10:50', kind: 'flight', snap: { report_time: '10:50', kind: 'flight' } },
  { report_time: '11:30', kind: 'flight' },
).status, 'changed');
// classify — só edição do utilizador (calendário igual à base) → same (sem nag)
eq('classify só-edição = same', classify(
  { report_time: '06:30', kind: 'flight', snap: { report_time: '06:00', kind: 'flight' } },
  { report_time: '06:00', kind: 'flight' },
).status, 'same');
// classify — mudaram os dois → conflict
eq('classify conflict', classify(
  { report_time: '14:30', kind: 'flight', snap: { report_time: '14:00', kind: 'flight' } },
  { report_time: '15:00', kind: 'flight' },
).status, 'conflict');

// diffRoster — cenário completo
const duties = {
  '2026-06-23': { duty_date: '2026-06-23', source: 'calendar', report_time: '10:50', block_on: '21:11', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight', snap: { report_time: '10:50', block_on: '21:11', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight' } },
  '2026-06-24': { duty_date: '2026-06-24', source: 'calendar', report_time: '06:30', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', snap: { report_time: '06:00', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight' } }, // tu editaste
  '2026-06-25': { duty_date: '2026-06-25', source: 'calendar', report_time: '14:30', route: 'LIS-MAD-LIS', sectors: 2, kind: 'flight', snap: { report_time: '14:00', route: 'LIS-MAD-LIS', sectors: 2, kind: 'flight' } }, // editaste
  '2026-06-26': { duty_date: '2026-06-26', source: 'calendar', report_time: '09:00', route: 'LIS-AGP-LIS', sectors: 2, kind: 'flight', snap: { report_time: '09:00', route: 'LIS-AGP-LIS', sectors: 2, kind: 'flight' } }, // sumiu → cancelado
  '2026-06-27': { duty_date: '2026-06-27', source: 'manual', report_time: '08:00', kind: 'flight' }, // manual → NUNCA cancelado
  '2026-06-28': { duty_date: '2026-06-28', source: 'calendar', report_time: '07:00', kind: 'flight', snap: { report_time: '07:00', kind: 'flight' } }, // fora da janela
};
const incoming = [
  { duty_date: '2026-06-23', report_time: '11:30', block_on: '21:11', route: 'LIS-OPO-LIS', sectors: 2, kind: 'flight' }, // changed
  { duty_date: '2026-06-24', report_time: '06:00', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight' },                    // = snap → same (não chateia)
  { duty_date: '2026-06-25', report_time: '15:00', route: 'LIS-MAD-LIS', sectors: 2, kind: 'flight' },                    // conflict
  { duty_date: '2026-06-30', report_time: '05:40', route: 'LIS-LGW-LIS', sectors: 2, kind: 'flight' },                    // added
];
const r = diffRoster({ incoming, duties, window: { start: '2026-06-20', end: '2026-06-27' } });
eq('changed=1', r.counts.changed, 1);
eq('conflict=1', r.counts.conflict, 1);
eq('added=1', r.counts.added, 1);
eq('removed=1', r.counts.removed, 1);
eq('total=4', r.counts.total, 4);
eq('changed date', r.changed[0].date, '2026-06-23');
eq('changed antes(snap)', r.changed[0].before.report_time, '10:50');
eq('changed depois', r.changed[0].after.report_time, '11:30');
eq('conflict date', r.conflict[0].date, '2026-06-25');
eq('added date', r.added[0].date, '2026-06-30');
eq('removed date (cal, na janela)', r.removed[0].date, '2026-06-26');
ok('24 não aparece (só edição)', ![...r.changed, ...r.conflict].some(x => x.date === '2026-06-24'));
ok('27 manual NÃO cancelado', !r.removed.some(x => x.date === '2026-06-27'));
ok('28 fora da janela NÃO cancelado', !r.removed.some(x => x.date === '2026-06-28'));

// sem janela → sem cancelamentos
eq('sem window → removed 0', diffRoster({ incoming, duties }).counts.removed, 0);

// ── Multi-serviço (a lei conta por SERVIÇO, não por dia) ──────────────────────
const S = (rep, off, on, route, sec) => ({ report_time: rep, block_off: off, block_on: on, route, sectors: sec, kind: 'flight' });
const AM = S('06:00', '06:40', '10:00', 'LGW-CDG', 1);   // serviço da manhã
const PM = S('19:00', '19:40', '21:00', 'CDG-LGW', 1);   // serviço da tarde
// 2 serviços iguais, ORDEM TROCADA → [] (o diff ordena por report; é independente da ordem)
eq('multi: 2 serviços iguais (ordem trocada) = []',
  diffDuty({ ...AM, extra: [PM] }, { ...PM, extra: [AM] }), []);
// report do 1.º serviço mudou → deteta, com o nº do serviço
const chg = diffDuty({ ...AM, extra: [PM] }, { ...S('06:30', '06:40', '10:00', 'LGW-CDG', 1), extra: [PM] });
eq('multi: report do 1.º serviço mudou', chg.map((f) => f.key), ['report_time']);
ok('multi: diff traz o nº do serviço', chg[0].service === 1);
// serviço a mais (1 → 2) e a menos (2 → 1)
eq('multi: serviço a mais', diffDuty(AM, { ...AM, extra: [PM] }).map((f) => f.key), ['service_added']);
eq('multi: serviço a menos', diffDuty({ ...AM, extra: [PM] }, AM).map((f) => f.key), ['service_removed']);
// classify: calendário ACRESCENTOU um serviço (snap 1, incoming 2) → changed
eq('classify multi: calendário acrescentou serviço → changed', classify(
  { ...AM, kind: 'flight', snap: { ...AM } },
  { ...AM, extra: [PM] },
).status, 'changed');
// classify: dia de 2 serviços inalterado (snap capta os 2) → same
eq('classify multi: 2 serviços inalterados → same', classify(
  { ...AM, extra: [PM], snap: { ...AM, extra: [PM] } },
  { ...AM, extra: [PM] },
).status, 'same');
// diffRoster: um dia que ganhou um serviço no calendário → changed=1
eq('diffRoster multi: dia ganhou serviço → changed=1', diffRoster({
  incoming: [{ duty_date: '2026-07-10', ...AM, extra: [PM] }],
  duties: { '2026-07-10': { duty_date: '2026-07-10', source: 'calendar', ...AM, snap: { ...AM } } },
}).counts.changed, 1);

// ── As PERNAS (achado no iPhone, 2026-11-11) ──────────────────────────────────
// Mudar a chegada da 1.ª perna de um serviço de 2 setores dava "igual": só se comparavam a apresentação, a 1.ª saída, a última
// chegada, a rota e os setores. As horas de cada perna decidem o tempo de voo (ORO.FTL.105(13): "o tempo decorrido entre o
// primeiro movimento de saída de uma aeronave do lugar de estacionamento […] e a sua imobilização", somado nos limites do
// ORO.FTL.210) e a pausa do serviço repartido (CS FTL.1.220(a): "The break on the ground within the FDP has a minimum
// duration of 3 consecutive hours"). O teste falha se as citações deixarem de estar no texto oficial.
{
  const norm = (s) => s.replace(/\s+/g, ' ');
  const reg = norm(fs.readFileSync(path.resolve('fontes/ftl/reg-ue-83-2014-pt.txt'), 'utf8'));
  const cs = norm(fs.readFileSync(path.resolve('fontes/ftl/cs-ftl1-2014-002-R.txt'), 'utf8'));
  ok('fonte: ORO.FTL.105(13) tempo de voo', reg.includes('o tempo decorrido entre o primeiro movimento de saída de uma aeronave do lugar de estacionamento'));
  ok('fonte: CS FTL.1.220(a) pausa em terra de 3 h', cs.includes('The break on the ground within the FDP has a minimum duration of 3 consecutive hours.'));

  const { importSaveFields, buildImportCandidates } = require(path.resolve('data/rosterImport.js'));
  const L = (dep, arr, off, on, x = {}) => ({ flightNo: 'EZY1', dep, arr, off, on, ...x });
  // Serviço de 2 setores: LIS 06:40 → FNC 08:15, FNC 15:00 → LIS 16:40 (pausa de 6 h 45 em terra: repartido).
  const svc = (legs, x = {}) => ({ report_time: '05:40', block_off: legs[0].off, block_on: legs[legs.length - 1].on, route: 'LIS-FNC-LIS', sectors: 2, flight_minutes: 195, kind: 'flight', legs, ...x });
  const pub = svc([L('LIS', 'FNC', '06:40', '08:15'), L('FNC', 'LIS', '15:00', '16:40')]);
  // A 1.ª perna chega 3 h mais tarde (11:15): a apresentação, a 1.ª saída, a última chegada, a rota e os setores ficam iguais;
  // o tempo de voo passa de 3:15 para 6:15 e a pausa em terra de 6:45 para 3:45.
  const mid = svc([L('LIS', 'FNC', '06:40', '11:15'), L('FNC', 'LIS', '15:00', '16:40')], { flight_minutes: 375 });

  // diffDuty: a perna que mudou, com o número e as horas antes → depois.
  const dm = diffDuty(pub, mid);
  eq('pernas: a chegada da 1.ª perna mudou → deteta', dm.map((f) => [f.key, f.leg, f.before, f.after]), [['leg', 1, '06:40-08:15', '06:40-11:15']]);
  eq('pernas: o rótulo diz qual', dm[0].label, { pt: 'Perna 1', en: 'Leg 1' });
  eq('pernas: iguais → nada', diffDuty(pub, svc(pub.legs.map((l) => ({ ...l })))), []);
  // O que não é hora de perna não conta: a hora Zulu, o número de voo, a aeronave.
  eq('pernas: Zulu, n.º de voo e aeronave diferentes → nada', diffDuty(pub, svc([{ ...pub.legs[0], offZ: '06:40', onZ: '08:15', aircraft: '320', flightNo: 'EJU9' }, pub.legs[1]])), []);
  // Uma perna que passa de operada a posicionamento (ORO.FTL.215: não é setor nem tempo de voo) com as mesmas horas.
  const dh3 = (i) => ({ report_time: '05:00', block_off: '06:00', block_on: '13:00', route: 'LIS-OPO-LIS-FNC', sectors: 2, kind: 'flight',
    legs: [L('LIS', 'OPO', '06:00', '07:00'), L('OPO', 'LIS', '08:00', '09:00'), L('LIS', 'FNC', '11:00', '13:00')].map((l, k) => (k === i ? { ...l, dh: true } : l)) });
  eq('pernas: o posicionamento mudou de perna → deteta as duas', diffDuty(dh3(0), dh3(1)).map((f) => [f.key, f.leg, f.before, f.after]), [['leg', 1, 'DH 06:00-07:00', '06:00-07:00'], ['leg', 2, '08:00-09:00', 'DH 08:00-09:00']]);
  // Número de pernas diferente: uma linha só (a rota e os setores já dizem o resto).
  eq('pernas: número diferente → uma linha', diffDuty(pub, { ...pub, legs: [pub.legs[0]] }).map((f) => [f.key, f.before, f.after]), [['legs', 2, 1]]);
  // Serviço extra do dia: a perna leva também o número do serviço.
  const other = { report_time: '20:00', block_off: '21:00', block_on: '22:00', route: 'LIS-OPO', sectors: 1, flight_minutes: 60, kind: 'flight', legs: [L('LIS', 'OPO', '21:00', '22:00')] };
  eq('pernas: no 1.º de dois serviços', diffDuty({ ...pub, extra: [other] }, { ...mid, extra: [other] }).map((f) => [f.key, f.leg, f.service]), [['leg', 1, 1]]);

  // Sem as horas das pernas de um dos lados não se comparam pernas: compara-se o tempo de voo (o que entra no ORO.FTL.210).
  const bare = { report_time: '05:40', block_off: '06:40', block_on: '16:40', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', flight_minutes: 195 };
  eq('sem pernas de um lado, o mesmo tempo de voo → nada', diffDuty(bare, pub), []);
  eq('sem pernas de um lado, tempo de voo diferente → deteta', diffDuty(bare, mid).map((f) => [f.key, f.before, f.after]), [['flight_minutes', '3:15', '6:15']]);
  eq('sem tempo de voo de um dos lados → nada (não se sabe)', diffDuty({ ...bare, flight_minutes: undefined }, mid), []);

  // O snap novo leva as pernas e o tempo de voo publicados (a base das 3 vias).
  const cand = (d) => ({ kind: 'flight', duty: { duty_date: '2026-11-20', ...d } });
  const stored = { duty_date: '2026-11-20', ...importSaveFields(cand(pub), 'calendar', null) };
  eq('snap: leva as pernas e o tempo de voo', [stored.snap.legs.map((l) => `${l.off}-${l.on}`), stored.snap.flight_minutes, stored.snap.v], [['06:40-08:15', '15:00-16:40'], 195, 2]);
  eq('3 vias: a perna do meio mudou no calendário → alterado', classify(stored, mid).status, 'changed');
  eq('3 vias: … com a perna que mudou', classify(stored, mid).fields.map((f) => f.key), ['leg']);
  eq('3 vias: nada mudou → igual', classify(stored, pub).status, 'same');
  eq('deteção automática: conta a alteração', diffRoster({ incoming: [{ duty_date: '2026-11-20', ...mid }], duties: { '2026-11-20': stored } }).counts.changed, 1);
  // De ponta a ponta, pela leitura do calendário: importar, e voltar a ler com a 1.ª perna a chegar mais tarde.
  {
    const aleg = (dep, arr, off, on, rep = null) => ({ dateISO: '2026-11-21', flightNo: 'EZY1', depAirport: dep, arrAirport: arr, depTime: off, arrTime: on, report: rep, startDate: new Date(`2026-11-21T${off}:00`), endDate: new Date(`2026-11-21T${on}:00`) });
    const act = (on1) => [{ dateISO: '2026-11-21', sectors: 2, legs: [aleg('LIS', 'FNC', '06:40', on1, '05:40'), aleg('FNC', 'LIS', '15:00', '16:40')] }];
    const CTX = { postFlightMin: 30, isPilot: true, base: 'LIS' };
    const first = buildImportCandidates({ activities: act('08:15'), ...CTX })[0];
    const kept = { '2026-11-21': { duty_date: '2026-11-21', ...importSaveFields(first, 'calendar', null) } };
    eq('importação: reler igual → igual', buildImportCandidates({ activities: act('08:15'), duties: kept, ...CTX })[0].status, 'same');
    const again = buildImportCandidates({ activities: act('11:15'), duties: kept, ...CTX })[0];
    eq('importação: reler com a perna do meio mudada → alterado, com a perna', [again.status, again.diff.map((f) => [f.key, f.leg, f.before, f.after])], ['changed', [['leg', 1, '06:40-08:15', '06:40-11:15']]]);
  }
  // O tripulante registou as horas reais (a última chegada às 17:05; as pernas acompanham): só ele mexeu → igual, sem aviso.
  const real = { ...stored, block_on: '17:05', flight_minutes: 220, legs: [stored.legs[0], { ...stored.legs[1], on: '17:05' }] };
  eq('3 vias: só as horas reais do tripulante → igual', classify(real, pub).status, 'same');
  eq('3 vias: horas reais + a perna do meio mudou no calendário → conflito', classify(real, mid).status, 'conflict');

  // Um snap gravado ANTES desta correção não tem as pernas. As publicadas são as do serviço guardado, se o tripulante não lhe
  // registou horas reais (os calços fora e dentro guardados são os do snap).
  // As pernas do calendário trazem sempre a hora Zulu de cada hora (data/calendarParse.js mapFlight).
  const oldSnap = { report_time: '05:40', block_off: '06:40', block_on: '16:40', route: 'LIS-FNC-LIS', sectors: 2, kind: 'flight', officeType: null, eLearning: false, signOff: null, v: 2 };
  const calLegs = pub.legs.map((l) => ({ ...l, offZ: l.off, onZ: l.on }));
  const legacy = { ...pub, legs: calLegs, source: 'calendar', snap: oldSnap };
  eq('snap antigo: a perna do meio mudou → alterado', [classify(legacy, mid).status, classify(legacy, mid).fields.map((f) => f.key)], ['changed', ['leg']]);
  eq('snap antigo: nada mudou → igual', classify(legacy, pub).status, 'same');
  // … com horas reais registadas não se sabe quais eram as pernas publicadas: não se comparam (nunca um conflito inventado).
  const legacyReal = { ...legacy, block_on: '17:05', flight_minutes: 220, legs: [calLegs[0], { ...calLegs[1], on: '17:05', onZ: undefined }] };
  eq('snap antigo com horas reais: o calendário igual → igual (sem conflito inventado)', classify(legacyReal, pub).status, 'same');
  // Revisão independente: o tripulante corrigiu no formulário a chegada da 1.ª perna (08:15 → 08:20; a Zulu dessa hora sai) e o
  // calendário não mudou. As pernas corrigidas não são "as publicadas": não é uma alteração, e aplicá-la desfazia a correção.
  const legacyMidFix = { ...legacy, legs: [{ ...calLegs[0], on: '08:20', onZ: null }, calLegs[1]] };
  eq('snap antigo + perna do meio corrigida à mão, calendário igual → igual', classify(legacyMidFix, pub).status, 'same');
  // Pernas sem Zulu (vieram do PDF) num snap antigo: não se sabe se foram mexidas → não se comparam (fica como antes da correção).
  eq('snap antigo sem Zulu nas pernas: não se comparam', classify({ ...pub, source: 'pdf', snap: oldSnap }, mid).status, 'same');

  // O "refresh" não se parte: um snap da leitura antiga (sem versão) com os MESMOS voos agrupados de outra maneira (um
  // repartido que estava em 2 serviços) não é uma alteração da escala — SNPVAC Cl. 66.ª: o SNC é "uma alteração de escala".
  const s1 = { report_time: '05:40', block_off: '06:40', block_on: '08:15', route: 'LIS-FNC', sectors: 1, flight_minutes: 95, kind: 'flight', legs: [calLegs[0]] };
  const s2 = { report_time: null, block_off: '15:00', block_on: '16:40', route: 'FNC-LIS', sectors: 1, flight_minutes: 100, kind: 'flight', legs: [calLegs[1]] };
  const oldDay = { ...s1, source: 'calendar', snap: { report_time: '05:40', block_off: '06:40', block_on: '08:15', route: 'LIS-FNC', sectors: 1, kind: 'flight', extra: [{ ...s2 }] }, extra: [{ ...s2, source: 'calendar' }] };
  eq('refresh: os mesmos voos agrupados de outra maneira → relido, não alterado', classify(oldDay, pub).status, 'refresh');
  eq('refresh: … mas com uma perna do meio diferente é uma alteração', classify(oldDay, mid).status, 'changed');
}

// shortNoticeCandidates — candidatas a SNC: alteradas/conflito/novas a ≤7 dias, por MÊS do serviço
{
  const diff = {
    changed:  [{ date: '2026-07-04' }, { date: '2026-07-20' }],   // a 2.ª fora do horizonte
    conflict: [{ date: '2026-07-05' }],
    added:    [{ date: '2026-07-31' }, { date: '2026-08-02' }],   // ambas fora (>7 d de 03/07)
    removed:  [{ date: '2026-07-04' }],                            // cancelamentos NÃO contam
  };
  const c = shortNoticeCandidates(diff, '2026-07-03');
  eq('SNC: total (2 dentro de 7 dias)', c.total, 2);
  eq('SNC: por mês do serviço', c.byYm, { '2026-07': 2 });
  eq('SNC: datas p/ eventos', c.dates, ['2026-07-04', '2026-07-05']);
  // Horizonte a cavalo de 2 meses: hoje 30/07 → 31/07 e 02/08 entram, cada uma no seu mês.
  const c2 = shortNoticeCandidates(diff, '2026-07-30');
  eq('SNC: horizonte cruza o mês', c2.byYm, { '2026-07': 1, '2026-08': 1 });
  eq('SNC: sem diff → 0', shortNoticeCandidates(null, '2026-07-03').total, 0);
}

console.log(`\n${fail === 0 ? '✅' : '❌'}  rosterDiff: ${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
