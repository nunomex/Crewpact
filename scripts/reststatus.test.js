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
// 2026-11-12: o que o 205(d)(1) aumenta é o MÍNIMO ("os períodos mínimos de repouso … devem ser aumentados"), e nada proíbe que
// seja o do repouso reduzido (CS FTL.1.235(c)(1): 12 h na base): 12:00 + 4:00 = 16:00. Com 16:00 certas, abaixo das 17:30 mas
// não das 16:00 → só é legal como repouso reduzido: incerto ('warn', kind 'reducedRest'; antes "curto"). Com 15:30 → curto.
eq('205(d): sem saber o repouso antes → +4 h = 17:30 → com 16:00 só como repouso reduzido: incerto', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '12:30', block_on: '15:00' },
}, T2, at(T2, '21:00'))), { status: 'warn', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 960, requiredMin: 1050 });
eq('205(d): … com 15:30 (abaixo das 12:00 + 4:00) → curto', pick(restStatus({
  '2026-11-10': { report_time: '07:00', block_on: '20:30', sectors: 1 },
  '2026-11-11': { report_time: '12:00', block_on: '15:00' },
}, T2, at(T2, '21:00'))), { status: 'bad', prevIso: '2026-11-10', nextIso: '2026-11-11', actualMin: 930, requiredMin: 1050 });

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

// ── A RESPOSTA do "Tenho descanso?" (data/hojeItems.js · restItem), visto no iPhone a 2026-11-14: o repouso mínimo
// cumprido (25:10 contra 10:30) e a regra da noite local falhada davam "Sim · 25 h 10 antes do report · de tardio/noturno
// para matinal…" com o ✕ vermelho na folha. A 1.ª palavra é a do VEREDICTO: ✕ → "Não", incerto → "Incerto". O porquê
// leva a linha da regra que falhou e a dica cita essa regra (CS FTL.1.235(a)(1); noite local = ORO.FTL.105(16)). ──
{
  const { restItem } = require(path.resolve('data/hojeItems.js'));
  const T4 = '2026-11-14';
  // 13/11 report 18:00, LIS→FNC→LIS, calços 04:30 de 14/11 (10:30, noturno) · 15/11 LIS→FNC report 05:40 (matinal). Das
  // 22:00 às 05:40 são 7:40 — nenhuma noite local de 8 h no repouso.
  const dTr = {
    '2026-11-13': { report_time: '18:00', block_on: '04:30', sectors: 2, legs: [{ dep: 'LIS', arr: 'FNC', off: '19:00', on: '20:45' }, { dep: 'FNC', arr: 'LIS', off: '02:45', on: '04:30' }] },
    '2026-11-15': { report_time: '05:40', block_on: '08:15', sectors: 1, legs: [{ dep: 'LIS', arr: 'FNC', off: '06:40', on: '08:15' }] },
  };
  const rs = restStatus(dTr, T4, at(T4, '12:14'), { base: 'LIS' });
  const rc = recoveryStatus(dTr, T4, { base: 'LIS', disruptiveType: 'early' });
  eq('a foto: o mínimo cumprido (25:10 contra 12:00, na base)', [rs.status, rs.actualMin, rs.requiredMin], ['ok', 1510, 720]);
  eq('a foto: a noite local falha (CS 235(a)(1))', rc.issues.map((x) => [x.type, x.date, !!x.uncertain]), [['transitionNight', '2026-11-15', false]]);
  const it = restItem(rs, rc, 'pt');
  eq('a foto: ✕ → começa por "Não"', [it.status, it.answer], ['bad', 'Não · falta uma noite local antes do matinal de 15/11']);
  eq('a foto: o porquê leva a regra que falhou', it.rows, [{ k: 'Noite local antes do matinal', v: 'falta', tone: 'bad' }]);
  eq('a foto: a dica cita a regra e a definição', [/CS FTL\.1\.235\(a\)\(1\)/.test(it.suggestion), /ORO\.FTL\.105\(16\)/.test(it.suggestion), /22:00 e as 08:00/.test(it.suggestion)], [true, true, true]);
  eq('a foto (EN)', restItem(rs, rc, 'en').answer, 'No · 1 local night missing before the early start on 15/11');

  // As outras combinações, com o veredicto do repouso e o da recuperação escritos à mão.
  const rOk = { status: 'ok', actualMin: 1510, requiredMin: 720 };
  const tn = (unc) => ({ type: 'transitionNight', date: '2026-11-15', ...(unc ? { uncertain: true, why: 'type' } : {}) });
  const r168 = { type: 'recovery168', date: '2026-11-20' };
  // Incerto (o tipo de horário da companhia não se sabe): a 1.ª palavra é "Incerto", sem repetir "incerto:" a seguir.
  const iu = restItem(rOk, { status: 'warn', issues: [tn(true)] }, 'pt');
  eq('repouso ✓ + regra incerta → "Incerto"', [iu.status, iu.answer, iu.rows], ['warn', 'Incerto · falta uma noite local antes do matinal de 15/11', [{ k: 'Noite local antes do matinal', v: 'incerto', tone: 'warn' }]]);
  // Uma incerta mais cedo e uma certa depois: o ✕ é da certa, e é ela que se diz.
  const ib = restItem(rOk, { status: 'bad', issues: [tn(true), r168] }, 'pt');
  eq('a certa manda sobre a incerta', [ib.status, ib.answer], ['bad', 'Não · sem recuperação de 36 h (com 2 noites) até 20/11']);
  eq('… e a dica é a dela', /ORO\.FTL\.235\(d\)/.test(ib.suggestion) && !/235\(a\)\(1\)/.test(ib.suggestion), true);
  // O repouso já curto: fica como estava, com a regra a seguir.
  const bb = restItem({ status: 'bad', actualMin: 480, requiredMin: 720 }, { status: 'bad', issues: [tn(false)] }, 'pt');
  eq('repouso ✕ + regra ✕ → "Não" do repouso, a regra a seguir', bb.answer, 'Não · 8 h (mín 12 h) · falta uma noite local antes do matinal de 15/11');
  // O repouso incerto e a regra certa: "Não" pela regra, e a dúvida do repouso não se perde.
  const ub = restItem({ status: 'unc', kind: 'noReport', actualMin: 900, estIso: '2026-11-12' }, { status: 'bad', issues: [tn(false)] }, 'pt');
  eq('repouso incerto + regra ✕ → "Não", com o repouso incerto a seguir', [ub.status, ub.answer], ['bad', 'Não · falta uma noite local antes do matinal de 15/11 · repouso incerto: 15 h antes do report']);
  // Sem nada da recuperação: como antes.
  eq('só o repouso ✓ → "Sim"', restItem(rOk, { status: 'ok', issues: [] }, 'pt').answer, 'Sim · 25 h 10 antes do report');
}

// ── O PISO DO REPOUSO COM UM BURACO DE SÍTIO (sessão Fable 5.2, ponto 8; visto no iPhone a 2026-11-14) ──
// "The minimum rest period provided before undertaking an FDP starting at home base … 12 hours" / "… starting away from home
// base … 10 hours" (ORO.FTL.235(a)(1)/(b)): o piso é do sítio onde COMEÇA o PSV seguinte. Numa escala sem buracos é o sítio onde
// o anterior acabou. Com um buraco (acaba em OPO, o seguinte parte de LIS, nada pelo meio) falta um facto: a viagem. "All time
// spent on positioning shall count as duty period" (ORO.FTL.215(b)) — um posicionamento à parte muda o serviço precedente e
// encurta o repouso; dentro do PSV seguinte ("positioning after reporting but prior to operating shall be counted as FDP",
// 215(a)) o PSV começa mais cedo e noutro sítio. A app não escolhe: incerto, com o que falta; curto só abaixo das 10 h (o
// mínimo de todas as leituras; o intervalo que se vê é o MÁXIMO do repouso que houve).
{
  const { restItem } = require(path.resolve('data/hojeItems.js'));
  const { restVerdicts, restAround } = require(path.resolve('data/today.js'));
  const C = { base: 'LIS', postFlightMin: 30 };
  const gapD = {
    '2026-11-13': { report_time: '21:00', block_on: '04:00', route: 'LIS-OPO', sectors: 1 },   // acaba às 04:30 de 14/11, no Porto
    '2026-11-15': { report_time: '05:40', block_on: '09:00', route: 'LIS-FNC', sectors: 1 },   // parte de Lisboa
  };
  const pk = (r) => ({ status: r.status, kind: r.kind || null, actualMin: r.actualMin, requiredMin: r.requiredMin, hi: r.requiredHiMin == null ? null : r.requiredHiMin, from: r.gapFrom || null, dep: r.gapDep || null, prev: r.gapPrevIso || null });
  const rs = restStatus(gapD, '2026-11-14', at('2026-11-14', '12:00'), C);
  eq('buraco de sítio: acaba em OPO, parte de LIS → incerto, sem teto (25 h 10 é o máximo que houve)', pk(rs),
    { status: 'warn', kind: 'placeGap', actualMin: 1510, requiredMin: 600, hi: null, from: 'OPO', dep: 'LIS', prev: '2026-11-13' });
  // Com o posicionamento na escala não há buraco: o repouso conta do fim dele, e o piso é o da base (o PSV começa em LIS).
  const withPos = { ...gapD, '2026-11-14': { kind: 'positioning', report_time: '10:00', block_on: '11:00', route: 'OPO-LIS', sectors: 0, flight_minutes: 0 } };
  eq('com o posicionamento na escala → certo, 12 h (na base), do fim dele', pk(restStatus(withPos, '2026-11-14', at('2026-11-14', '12:00'), C)),
    { status: 'ok', kind: null, actualMin: 1120, requiredMin: 720, hi: null, from: null, dep: null, prev: null });
  // Sem buraco (o seguinte parte de onde este acabou): como sempre — fora da base, 10 h.
  const noGap = { ...gapD, '2026-11-15': { report_time: '05:40', block_on: '09:00', route: 'OPO-LIS', sectors: 1 } };
  eq('sem buraco (parte de OPO) → certo, 10 h (fora)', pk(restStatus(noGap, '2026-11-14', at('2026-11-14', '12:00'), C)),
    { status: 'ok', kind: null, actualMin: 1510, requiredMin: 600, hi: null, from: null, dep: null, prev: null });
  // Abaixo das 10 h é curto em qualquer leitura (o mínimo do 235(b) e do repouso reduzido, CS FTL.1.235(c)(1)).
  const short = {
    '2026-11-13': { report_time: '08:00', block_on: '19:30', route: 'LIS-OPO', sectors: 1 },   // 12 h de serviço, acaba às 20:00
    '2026-11-14': { report_time: '05:00', block_on: '09:00', route: 'LIS-FNC', sectors: 1 },   // 9 h depois
  };
  eq('buraco de sítio com menos de 10 h → curto (o mínimo de todas as leituras: 10 h)', pk(restStatus(short, '2026-11-13', at('2026-11-13', '21:00'), C)),
    { status: 'bad', kind: null, actualMin: 540, requiredMin: 600, hi: null, from: null, dep: null, prev: null });
  // Entre as 10 h e o mínimo do motor (12 h: o serviço anterior): já não é "curto" de certeza — incerto.
  const mid = { ...short, '2026-11-14': { report_time: '07:00', block_on: '11:00', route: 'LIS-FNC', sectors: 1 } };
  eq('buraco de sítio com 11 h (o motor pedia 12 h) → incerto', pk(restStatus(mid, '2026-11-13', at('2026-11-13', '21:00'), C)),
    { status: 'warn', kind: 'placeGap', actualMin: 660, requiredMin: 600, hi: null, from: 'OPO', dep: 'LIS', prev: '2026-11-13' });
  // Mais de 7 dias depois (férias, folgas): já não se avisa — a regra do sítio da importação e da Simulação.
  const far = { '2026-11-05': gapD['2026-11-13'], '2026-11-15': gapD['2026-11-15'] };
  eq('buraco com mais de 7 dias → como antes', pk(restStatus(far, '2026-11-14', at('2026-11-14', '12:00'), C)).status, 'ok');
  // Um posicionamento SEM rota pelo meio: a viagem está na escala, não se avisa.
  const posNoRoute = { ...gapD, '2026-11-14': { kind: 'positioning', report_time: '10:00', block_on: '11:00', route: null, sectors: 0, flight_minutes: 0 } };
  eq('posicionamento sem rota pelo meio → sem o aviso do sítio', pk(restStatus(posNoRoute, '2026-11-14', at('2026-11-14', '12:00'), C)).kind, null);
  // As Estatísticas e a Simulação dizem o mesmo (a mesma linha).
  eq('Estatísticas: o mesmo veredicto', restVerdicts(gapD, C).map((v) => [v.status, v.kind]), [['unc', 'placeGap']]);
  const ra = restAround(gapD, (s2, iso) => iso === '2026-11-15', C);
  eq('à volta do serviço (Simulação): antes incerto pelo sítio', [ra.before.status, ra.before.kind, ra.before.gapFrom], ['unc', 'placeGap', 'OPO']);
  const ra13 = restAround(gapD, (s2, iso) => iso === '2026-11-13', C);
  eq('à volta do serviço (Simulação): depois incerto pelo sítio', [ra13.after.status, ra13.after.kind, ra13.after.gapDep], ['unc', 'placeGap', 'LIS']);
  // "Repouso até" depois do serviço que acaba em OPO: o mínimo de quem começa o PSV seguinte AQUI (10 h 00, fora), sem teto.
  const ru = restUntilAfter(gapD, '2026-11-13', C);
  eq('"Repouso até" com o buraco à frente → incerto, só a ponta de baixo', [ru.uncertain, ru.why, ru.requiredLoMin, ru.requiredHiMin, ru.untilHiMs, ru.gapFrom, ru.gapDep, ru.untilLoMs === +at('2026-11-14', '14:30')],
    [true, 'placeGap', 600, null, null, 'OPO', 'LIS', true]);
  const ruNo = restUntilAfter(noGap, '2026-11-13', C);
  eq('"Repouso até" sem buraco → certo, como antes', [!!ruNo.uncertain, ruNo.requiredMin], [false, 600]);
  // A resposta do "Tenho descanso?".
  const it = restItem(rs, { status: 'ok', issues: [] }, 'pt');
  eq('"Tenho descanso?" · a resposta', [it.status, it.answer], ['warn', 'Incerto · no máximo 25 h 10 antes do report']);
  eq('"Tenho descanso?" · a dica diz o que falta e a lei', it.suggestion, 'O serviço de 13/11 acabou em OPO e este parte de LIS: falta na escala como foste de um sítio ao outro. Um posicionamento é serviço (ORO.FTL.215) e muda o repouso que tiveste e o mínimo: 12 h antes de um PSV que começa na base, 10 h fora (ORO.FTL.235(a)/(b)). Tem de vir do calendário.');
  eq('"Tenho descanso?" · EN', restItem(rs, { status: 'ok', issues: [] }, 'en').answer, 'Uncertain · at most 25 h 10 before report');

  // A NOITE LOCAL DO TARDIO/NOTURNO PARA O MATINAL — "is planned at home base" (CS FTL.1.235(a)(1)): com o buraco não se sabe
  // se a passagem é na base → incerto ('place'); sem buraco, como antes.
  const N = (route) => ({ report_time: '20:00', block_on: '02:30', route, sectors: 1 });   // noturno (02:00–04:59), acaba às 03:00
  const E = (route) => ({ report_time: '05:30', block_on: '09:00', route, sectors: 1 });   // matinal nos dois tipos de horário
  const tn = (a, b) => recoveryStatus({ '2026-11-10': N(a), '2026-11-12': E(b) }, '2026-11-11', { base: 'LIS', postFlightMin: 30, disruptiveType: 'early' });
  const one = (r) => r.issues.filter((x) => x.type === 'transitionNight').map((x) => [x.date, !!x.uncertain, x.why || null]);
  eq('noite local: na base, sem buraco → falta (certo)', [tn('FNC-LIS', 'LIS-FNC').status, one(tn('FNC-LIS', 'LIS-FNC'))], ['bad', [['2026-11-12', false, null]]]);
  eq('noite local: fora da base, sem buraco → a regra não se aplica', one(tn('LIS-OPO', 'OPO-LIS')), []);
  eq('noite local: acaba fora e o matinal parte da base (buraco) → incerto', [tn('LIS-OPO', 'LIS-FNC').status, one(tn('LIS-OPO', 'LIS-FNC'))], ['warn', [['2026-11-12', true, 'place']]]);
  eq('noite local: acaba na base e o matinal parte de fora (buraco) → incerto', one(tn('FNC-LIS', 'OPO-LIS')), [['2026-11-12', true, 'place']]);
  eq('noite local: buraco entre dois sítios fora da base → a regra não se aplica', one(tn('LIS-OPO', 'FNC-LIS')), []);
}

// ── REVISÃO INDEPENDENTE do ponto 8 (2026-11-18) ──
{
  const { restAround } = require(path.resolve('data/today.js'));
  const C = { base: 'LIS', postFlightMin: 30 };
  const sb = (rep, end, extra) => ({ kind: 'standby_home', report_time: rep, block_on: end, sectors: 0, flight_minutes: 0, route: null, ...(extra ? { extra } : {}) });
  // Achado 1: buraco de sítio + assistência em casa + voo 30 min depois dela. Na leitura da chamada (CS FTL.1.225(b)(5)) o
  // repouso que conta é o de ANTES da assistência (11 h) — e com o buraco pode ter sido fora da base (mínimo 10 h): não é curto
  // em todas as leituras → incerto. (Antes: "curto", pelos 30 min.)
  const fork = { '2026-07-01': { report_time: '12:00', block_on: '20:00', route: 'FNC-LIS', sectors: 1 }, '2026-07-02': sb('07:30', '15:30', [{ report_time: '16:00', block_on: '18:00', route: 'OPO-LIS', sectors: 1 }]) };
  const r1 = restStatus(fork, '2026-07-02', at('2026-07-02', '15:45'), C);
  eq('revisão 1: buraco de sítio com assistência e chamada possível → incerto', [r1.status, r1.kind], ['warn', 'placeGap']);
  // … mas com menos de 10 h também antes da assistência é curto em todas as leituras.
  const fork2 = { ...fork, '2026-07-01': { report_time: '15:00', block_on: '23:00', route: 'FNC-LIS', sectors: 1 } };   // acaba às 23:30: 8 h antes da assistência
  eq('revisão 1: … com 8 h antes da assistência → curto', restStatus(fork2, '2026-07-02', at('2026-07-02', '15:45'), C).status, 'bad');
  // Achado 6: o anterior acabou NA BASE (o motor pede 12 h) e o seguinte parte de fora: a ponta de baixo do "Repouso até" é o
  // que todas as leituras pedem — 10 h, como no "Tenho descanso?" (que só diz curto abaixo das 10 h).
  const hb = { '2026-07-01': { report_time: '08:00', block_on: '16:00', route: 'FNC-LIS', sectors: 1 }, '2026-07-02': { report_time: '03:30', block_on: '07:00', route: 'LGW-LIS', sectors: 1 } };
  const ru = restUntilAfter(hb, '2026-07-01', C);
  eq('revisão 6: "Repouso até" com o buraco, vindo da base → a ponta de baixo é 10 h', [ru.uncertain, ru.why, ru.requiredLoMin, ru.requiredHiMin], [true, 'placeGap', 600, null]);
  eq('revisão 6: … e o "Tenho descanso?" com 11 h diz incerto (a mesma ponta)', restStatus(hb, '2026-07-01', at('2026-07-01', '17:00'), C).status, 'warn');
  // Achado 4: o mínimo a seguir que a Simulação mostra (`need`) é o mesmo do "Repouso até".
  const nd = restAround(hb, (s2, iso) => iso === '2026-07-01', C).need;
  eq('revisão 4: o mínimo a seguir da Simulação com o buraco à frente', [nd.uncertain, nd.why, nd.requiredLoMin, nd.requiredHiMin, nd.gapFrom, nd.gapDep], [true, 'placeGap', 600, null, 'LIS', 'LGW']);
  // Achado 7: com o buraco, o repouso que se vê é só o MÁXIMO — uma noite local contada pode não ter existido (o tardio com um
  // posicionamento no fim acaba mais tarde). Se um dos lados é a base, a noite do tardio/noturno → matinal fica incerta também
  // com 1 noite à vista (CS FTL.1.235(a)(1)); com 2 ou mais já não.
  const N = (route) => ({ report_time: '20:00', block_on: '02:30', route, sectors: 1 });   // noturno, acaba às 03:00 do dia seguinte
  const E = (route) => ({ report_time: '06:30', block_on: '10:00', route, sectors: 1 });   // matinal no tipo "tardio" (05:00–06:59)
  const tn = (a, b, d3 = '2026-07-03') => recoveryStatus({ '2026-07-01': N(a), [d3]: E(b) }, '2026-07-02', { base: 'LIS', postFlightMin: 30, disruptiveType: 'late' }).issues.filter((x) => x.type === 'transitionNight').map((x) => [x.date, !!x.uncertain, x.why || null]);
  eq('revisão 7: 1 noite à vista, sem buraco → sem aviso', tn('FNC-LIS', 'LIS-FNC'), []);
  eq('revisão 7: 1 noite à vista, com buraco e a base num dos lados → incerto', tn('LIS-LGW', 'LIS-FNC'), [['2026-07-03', true, 'place']]);
  eq('revisão 7: 2 noites à vista, com buraco → sem aviso', tn('LIS-LGW', 'LIS-FNC', '2026-07-04'), []);
}

// ── 2.ª REVISÃO INDEPENDENTE (2026-11-18) ──
{
  // Achado 16: sem a base conhecida não se sabe se algum dos lados é a base — o buraco de sítio não tira o aviso que já havia.
  const N = { report_time: '20:00', block_on: '02:30', route: 'LIS-OPO', sectors: 1 }, E = { report_time: '05:30', block_on: '09:00', route: 'LIS-FNC', sectors: 1 };
  eq('revisão 2/16: noite local com buraco e sem base conhecida → como antes (falta)', recoveryStatus({ '2026-11-10': N, '2026-11-12': E }, '2026-11-11', { postFlightMin: 30, disruptiveType: 'early' }).issues.filter((x) => x.type === 'transitionNight').map((x) => [x.date, !!x.uncertain]), [['2026-11-12', false]]);
}

console.log(`\nrestStatus —${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
