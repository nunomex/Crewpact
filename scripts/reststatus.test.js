/*
 * Golden do "Tenho descanso?" (data/today.js restStatus) — ORO.FTL.235: repouso entre o FIM do serviço anterior e o
 * REPORT do próximo, vs. o mínimo (na base: máx(12 h, duração do serviço anterior)). É a pílula REPOUSO ✓/CURTO do
 * Início (véspera e pernoita) e a frase que só diz "verificado" com ela (auditoria do tripulante, 2026-11-04).
 * Achado: o "próximo" era o 1.º serviço com data ≥ hoje — na pernoita/pós-voo era o de HOJE (já acabado), e media-se o
 * repouso ANTES dele. Agora o próximo é o 1.º cujo REPORT ainda não passou.
 * Executar:  node scripts/reststatus.test.js   (ou: npm run test:reststatus)
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

const { restStatus, legalStatus, restUntilAfter, recoveryStatus } = require(path.resolve('data/today.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};
const T = '2026-11-03';
const at = (iso, hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };
const pick = (r) => ({ status: r.status, prevIso: r.prevIso, nextIso: r.nextIso, actualMin: r.actualMin, requiredMin: r.requiredMin });

// Véspera: hoje sem serviço; ontem 08:00–20:00; amanhã report 06:20 → 34:20 de repouso, mínimo 12 h.
eq('véspera: ontem → amanhã', pick(restStatus({
  '2026-11-02': { report_time: '08:00', block_on: '20:00' },
  '2026-11-04': { report_time: '06:20', block_on: '09:50' },
}, T, at(T, '21:00'))), { status: 'ok', prevIso: '2026-11-02', nextIso: '2026-11-04', actualMin: 2060, requiredMin: 720 });

// PERNOITA / PÓS-VOO: o serviço de hoje (17:15–22:15) JÁ ACABOU → o próximo é o de amanhã e o anterior é o de hoje.
eq('pernoita: hoje (acabado) → amanhã', pick(restStatus({
  '2026-11-01': { report_time: '06:00', block_on: '10:00' },
  '2026-11-03': { report_time: '17:15', block_on: '22:15' },
  '2026-11-04': { report_time: '12:20', block_on: '15:50' },
}, T, at(T, '23:00'))), { status: 'ok', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 845, requiredMin: 720 });

// Repouso CURTO depois do serviço de hoje: 13:00–23:30, amanhã report 08:00 → 8:30 < 12 h.
eq('repouso curto depois de hoje', pick(restStatus({
  '2026-11-03': { report_time: '13:00', block_on: '23:30' },
  '2026-11-04': { report_time: '08:00', block_on: '11:00' },
}, T, at(T, '23:45'))), { status: 'bad', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 510, requiredMin: 720 });

// Pré-report de hoje (o report ainda não passou): o próximo é o de HOJE.
eq('pré-report: ontem → hoje', pick(restStatus({
  '2026-11-02': { report_time: '08:00', block_on: '18:00' },
  '2026-11-03': { report_time: '06:00', block_on: '14:00' },
}, T, at(T, '05:00'))), { status: 'ok', prevIso: '2026-11-02', nextIso: '2026-11-03', actualMin: 720, requiredMin: 720 });

// Em serviço (o report de hoje já passou): o próximo é o de amanhã; o anterior é o de hoje (fim planeado).
eq('em serviço: hoje → amanhã', pick(restStatus({
  '2026-11-03': { report_time: '06:00', block_on: '14:00' },
  '2026-11-04': { report_time: '07:00', block_on: '12:00' },
}, T, at(T, '10:00'))), { status: 'ok', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 1020, requiredMin: 720 });

// O de hoje vira a meia-noite (22:00 → 01:20) e já começou: repouso conta das 01:20 de amanhã.
eq('hoje vira a noite → amanhã 12:20', pick(restStatus({
  '2026-11-03': { report_time: '22:00', block_on: '01:20' },
  '2026-11-04': { report_time: '12:20', block_on: '15:50' },
}, T, at(T, '23:00'))), { status: 'bad', prevIso: '2026-11-03', nextIso: '2026-11-04', actualMin: 660, requiredMin: 720 });

// ── Auditoria 2026-11-06 (A-144/A-160): o repouso conta-se a partir do FIM do período de serviço (ORO.FTL.105(11):
// "incluindo o serviço pós-voo"), do ÚLTIMO serviço do dia, e o mínimo depende de onde se repousa (235(a)/(b)). ──
const T2 = '2026-11-10';
// (a) Calços 17:30, sign-off 18:00 (07:00 → 18:00 = 11:00 de serviço); report seguinte 05:45 → 11:45 < 12:00 → CURTO.
eq('A-144: conta desde o sign-off → curto', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '17:30', signOff: '18:00' },
  '2026-11-11': { report_time: '05:45', block_on: '09:00' },
}, T2, at(T2, '20:00'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 705, requiredMin: 720 });
// O mesmo sem sign-off, com o pós-voo de 30 min do perfil.
eq('A-144: sem sign-off, pós-voo de 30 min → curto', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '17:30' },
  '2026-11-11': { report_time: '05:45', block_on: '09:00' },
}, T2, at(T2, '20:00'), { postFlightMin: 30 })), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 705, requiredMin: 720 });
// A-160 (a): 06:00 → calços 19:30 + 30 min = 14:00 de serviço; report às 09:45 → 13:45 < 14:00 (a app dizia ✓).
// 2026-11-11 (noite 10): 13:45 está abaixo do mínimo normal (14:00) mas acima das 12 h do repouso REDUZIDO (ORO.FTL.235(c),
// CS FTL.1.235(c)(1)): só é legal se a companhia tiver repouso reduzido — a app não o sabe → incerto ('warn', kind 'reducedRest'), não
// "curto". Com 11:45 (abaixo das 12 h) é curto em qualquer leitura.
eq('A-160 (a): mínimo = o serviço (14:00) → 13:45 só como repouso reduzido: incerto', pick(restStatus({
  '2026-11-10': { report_time: '06:00', block_on: '19:30' },
  '2026-11-11': { report_time: '09:45', block_on: '13:00' },
}, T2, at(T2, '21:00'), { postFlightMin: 30 })), { status: 'warn', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 825, requiredMin: 840 });
eq('A-160 (a): … diz porquê e a diferença', (({ kind, reducedFloorMin, diffMin }) => ({ kind, reducedFloorMin, diffMin }))(restStatus({
  '2026-11-10': { report_time: '06:00', block_on: '19:30' },
  '2026-11-11': { report_time: '09:45', block_on: '13:00' },
}, T2, at(T2, '21:00'), { postFlightMin: 30 })), { kind: 'reducedRest', reducedFloorMin: 720, diffMin: 15 });
eq('A-160 (a): com 11:45 → curto em qualquer leitura', pick(restStatus({
  '2026-11-10': { report_time: '06:00', block_on: '19:30' },
  '2026-11-11': { report_time: '07:45', block_on: '11:00' },
}, T2, at(T2, '21:00'), { postFlightMin: 30 })), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 705, requiredMin: 840 });
// A-160 (b): dois serviços no dia (06:00–10:00 e 18:00–23:30); report às 08:00 → conta desde as 23:30 → 8:30 → CURTO.
// Revisão do bloco 2 (2026-11-06): as 8:00 entre os dois não chegam ao mínimo (12 h), por isso não são um período de repouso
// — é um só PSV repartido (CS FTL.1.220: "the break on the ground within the FDP") e o período de serviço precedente vai das
// 06:00 às 23:30 = 17:30 → o mínimo a seguir é 17:30 (ORO.FTL.235(a)(1): "pelo menos igual ao período de serviço precedente").
eq('A-160 (b): o último serviço do dia', pick(restStatus({
  '2026-11-10': { report_time: '06:00', block_on: '10:00', extra: [{ report_time: '18:00', block_on: '23:30', kind: 'flight' }] },
  '2026-11-11': { report_time: '08:00', block_on: '12:00' },
}, T2, at(T2, '23:45'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 510, requiredMin: 1050 });
// Repartido 06:00–09:00 + 14:00–19:00 (+30 = 19:30): período de serviço 13:30; report a 11 às 08:00 → 12:30 < 13:30. Com 12:30
// (≥ as 12 h do repouso reduzido, CS FTL.1.235(c)(1)) só é legal como repouso reduzido → incerto (noite 10; antes "curto").
// Entre as duas metades (11:00), o próximo é o de dia 11 — a 2.ª metade é o mesmo serviço, não um repouso antes dela.
{
  const sp = { '2026-11-10': { report_time: '06:00', block_on: '09:00', extra: [{ report_time: '14:00', block_on: '19:00', kind: 'flight' }] }, '2026-11-11': { report_time: '08:00', block_on: '12:00' } };
  eq('repartido: o mínimo é o período de serviço do bloco', pick(restStatus(sp, T2, at(T2, '20:00'), { postFlightMin: 30 })), { status: 'warn', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 750, requiredMin: 810 });
  eq('repartido: entre as metades, o próximo é o de amanhã', pick(restStatus(sp, T2, at(T2, '11:00'), { postFlightMin: 30 })), { status: 'warn', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 750, requiredMin: 810 });
}
// ORO.FTL.235(a)/(b): o mínimo é "antes de um PSV". Antes de um escritório a lei não fixa mínimo → sem "curto".
{
  const r = restStatus({ '2026-11-10': { report_time: '14:00', block_on: '23:30' }, '2026-11-11': { report_time: '06:00', block_on: '10:00', kind: 'office' } }, T2, at(T2, '23:45'), { postFlightMin: 30 });
  eq('antes de um escritório: sem mínimo', [r.status, r.kind, r.actualMin, r.requiredMin], ['ok', 'notFdp', 360, null]);
}
// A-160 (c): pernoita no Funchal (base LIS), serviço de 9:30, 10:30 de repouso → fora da base o mínimo é 10 h → ✓.
eq('A-160 (c): fora da base, mínimo 10 h', pick(restStatus({
  '2026-11-10': { report_time: '10:00', block_on: '19:30', route: 'LIS-FNC', legs: [{ dep: 'LIS', arr: 'FNC', off: '17:30', on: '19:30' }] },
  '2026-11-11': { report_time: '06:00', block_on: '08:00' },
}, T2, at(T2, '21:00'), { base: 'LIS' })), { status: 'ok', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 630, requiredMin: 600 });
// ORO.FTL.205(d)(1): depois de um PSV prolongado (07:00 → 20:30, 1 setor: 13:30 > 13:00, cabe nas 14:00), o repouso
// sobe 2 h se o repouso ANTES também teve +2 h (opção i); senão 4 h (opção ii, o lado seguro). Report seguinte às 12:30.
eq('205(d): repouso antes longo → +2 h = 15:30 → ✓ com 16:00', pick(restStatus({
  '2026-11-09': { report_time: '06:00', block_on: '10:00' },
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '12:30', block_on: '15:00' },
}, T2, at(T2, '21:00'))), { status: 'ok', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 960, requiredMin: 930 });
eq('205(d): sem saber o repouso antes → +4 h = 17:30 → curto com 16:00', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '12:30', block_on: '15:00' },
}, T2, at(T2, '21:00'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 960, requiredMin: 1050 });

// ORO.FTL.205(d)(2): entre dois PSV prolongados seguidos, os repousos adicionais pré e pós-voo são consecutivos →
// +2 h (depois do 1.º) + 2 h (antes do 2.º) = +4 h. 07:00 → 20:30 (13:30 de serviço) duas vezes: 13:30 + 4:00 = 17:30.
eq('205(d)(2): dois prolongamentos seguidos → +4 h', pick(restStatus({
  '2026-11-09': { report_time: '06:00', block_on: '10:00' },
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '14:00', block_on: '03:30', sectors: 1 },
}, T2, at(T2, '21:00'))).requiredMin, 1050);

// "Repouso até" (Início): a MESMA regra da pílula — depois de um prolongamento, +2 h ou +4 h pelo repouso anterior.
eq('Repouso até: prolongamento com repouso antes longo → +2 h (15:30)', restUntilAfter({
  '2026-11-09': { report_time: '06:00', block_on: '10:00' },
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
}, '2026-11-10').requiredMin, 930);
eq('Repouso até: sem saber o repouso antes → +4 h (17:30)', restUntilAfter({
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
}, '2026-11-10').requiredMin, 1050);

// Recuperação no "Tenho descanso?": 4 entradas às 06:30 entre duas recuperações e a seguinte com 41 h. No tipo TARDIO a
// entrada matinal é 05:00–06:59 → 4 irregulares → a recuperação tinha de ter 60 h (CS FTL.1.235(a)(2)); no MATINAL
// é 05:00–05:59 → nenhum → sem aviso. Sem fonte oficial do tipo da companhia → incerto.
{
  const dd = { '2026-11-01': { report_time: '06:00', block_on: '12:00', sectors: 2 }, '2026-11-09': { report_time: '06:00', block_on: '12:00', sectors: 2 } };
  for (let i = 4; i <= 7; i++) dd[`2026-11-0${i}`] = { report_time: '06:30', block_on: '13:00', sectors: 2 };
  // Com o tipo fixado por fonte oficial (ARO.OPS.230): matinal → nenhum irregular → sem aviso.
  eq('recuperação: tipo matinal (fonte oficial) → sem aviso', recoveryStatus(dd, '2026-11-05', { disruptiveType: 'early' }).status, 'ok');
  eq('recuperação: tipo tardio (fonte oficial) → aviso', recoveryStatus(dd, '2026-11-05', { disruptiveType: 'late' }).status, 'bad');
  // Sem fonte oficial (hoje, todas as companhias, também a easyJet) → os dois tipos → incerto.
  const unk = recoveryStatus(dd, '2026-11-05', { companySlug: 'easyjet' });
  eq('recuperação: tipo desconhecido → incerto', [unk.status, (unk.issues[0] || {}).type, (unk.issues[0] || {}).uncertain], ['warn', 'recovery60', true]);
}

// CS FTL.1.235(b)(3)(i): na base, depois de uma rotação com 4 h de fuso ou mais, o repouso mínimo é em NOITES LOCAIS (tabela
// pela diferença máxima e pelo tempo desde a apresentação para o 1.º PSV da rotação). LIS→EWR (−5 h, inverno): sai a 10 jan
// às 10:00, volta a 13 jan às 07:00 → 69 h → linha ≤ 6, coluna 48–71:59 → 2 noites. E (b)(4): entre uma rotação para oeste e
// outra para leste (DXB, +4 h), 3 noites locais na base.
{
  const out = { report_time: '10:00', block_on: '19:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'EWR', off: '11:00', on: '19:00', offZ: '11:00', onZ: '19:00' }] };
  const back = { report_time: '23:00', block_on: '07:00', sectors: 1, legs: [{ dep: 'EWR', arr: 'LIS', off: '00:00', on: '07:00', offZ: '00:00', onZ: '07:00' }] };
  const local = (rep, end) => ({ report_time: rep, block_on: end, sectors: 2, legs: [{ dep: 'LIS', arr: 'OPO', off: rep, on: end }] });
  const T3 = '2026-01-13';
  const r1 = restStatus({ '2026-01-10': out, '2026-01-12': back, '2026-01-14': local('06:00', '10:00') }, T3, at(T3, '12:00'), { base: 'LIS' });
  eq('235(b)(3)(i): 1 noite depois de 69 h a −5 h → curto (pede 2)', [r1.status, r1.nightsRequired, r1.nightsActual], ['bad', 2, 1]);
  const r2 = restStatus({ '2026-01-10': out, '2026-01-12': back, '2026-01-15': local('06:00', '10:00') }, T3, at(T3, '12:00'), { base: 'LIS' });
  eq('235(b)(3)(i): 2 noites → ✓', [r2.status, r2.nightsRequired, r2.nightsActual], ['ok', 2, 2]);
  const dxb = (rep) => ({ report_time: rep, block_on: '16:00', sectors: 1, legs: [{ dep: 'LIS', arr: 'DXB', off: '09:00', on: '16:00', offZ: '09:00', onZ: '16:00' }] });
  const dxbBack = { report_time: '02:00', block_on: '10:00', sectors: 1, legs: [{ dep: 'DXB', arr: 'LIS', off: '03:00', on: '10:00', offZ: '03:00', onZ: '10:00' }] };
  const r3 = restStatus({ '2026-01-10': out, '2026-01-12': back, '2026-01-15': dxb('08:00'), '2026-01-17': dxbBack }, T3, at(T3, '12:00'), { base: 'LIS' });
  eq('235(b)(4): oeste → leste com 2 noites → curto (pede 3)', [r3.status, r3.nightsRequired], ['bad', 3]);
  const r4 = restStatus({ '2026-01-10': out, '2026-01-12': back, '2026-01-16': dxb('08:00'), '2026-01-18': dxbBack }, T3, at(T3, '12:00'), { base: 'LIS' });
  eq('235(b)(4): 3 noites → ✓', [r4.status, r4.nightsActual], ['ok', 3]);
}

// "A lei é que manda": falta um facto → o "Dentro dos limites?" diz incerto (nem "sim" nem "não"), com o que falta.
{
  const lg = legalStatus({ psv: { result: '14:00', max: '13:00', maxHi: '14:45', uncertain: true, unknowns: ['accommodation'] } }, {});
  eq('incerto: estado e o que falta', [lg.status, lg.kind, lg.unknowns], ['warn', 'psvUncertain', ['accommodation']]);
  eq('excede continua a mandar sobre o incerto', legalStatus({ psv: { over: true, excess: '00:10', uncertain: true } }, {}).kind, 'psvOver');
}

// Sem próximo serviço futuro → neutro.
eq('sem próximo → neutro', restStatus({ '2026-11-03': { report_time: '06:00', block_on: '14:00' } }, T, at(T, '20:00')).kind, 'noNext');

console.log(`\nrestStatus — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
