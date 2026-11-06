/*
 * Golden "das FONTES" do motor FTL — cada número do motor procurado no TEXTO OFICIAL guardado em fontes/ftl/
 * (Reg. (UE) 83/2014 em inglês e português, CS-FTL.1 da EASA). Auditoria dos cálculos de 2026-11-06, bloco 1:
 * "os testes golden não bastam, foram escritos com o código" — a classe 3 dos pilotos (14:15 em vez de 14:00)
 * passava verde. Este teste NÃO usa os comentários do código nem o outro golden: lê os .txt e compara.
 *
 * Os .txt são extrações fixas dos PDFs (SHA-256 em fontes/README.md). Algumas tabelas saem baralhadas na extração
 * (o Quadro 4 em duas linhas, as colunas de 4 e 5 setores do prolongamento empilhadas); o leitor de cada tabela
 * explica como as lê. Se um .txt mudar, este teste falha — e é para falhar.
 * Executar:  node scripts/ftl-fontes.test.js   (ou: npm run test:ftl-fontes)
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

const R = (p) => require(path.resolve(p));
const T = R('data/ftl.js');
const ftl = R('ftl/index.js');
const standby = R('ftl/rules/standbyRules.js');
const fdpRules = R('ftl/rules/fdpRules.js');
const inflight = R('ftl/rules/inflightRestRules.js');
const disc = R('ftl/rules/discretionRules.js');
const delayed = R('ftl/rules/delayedReportingRules.js');
const reduced = R('ftl/rules/reducedRestRules.js');
const restRules = R('ftl/rules/restRules.js');
const restCalc = R('ftl/calculators/restCalculator.js');
const seq = R('ftl/calculators/sequenceCalculator.js');
const dis = R('ftl/calculators/disruptiveCalculator.js');
const ext = R('ftl/calculators/extensionUsageCalculator.js');
const tables = R('ftl/constants/tables.js');

const read = (f) => fs.readFileSync(path.resolve('fontes/ftl', f), 'utf8').replace(/\r/g, '');
const EN = read('reg-ue-83-2014-en.txt');
const PT = read('reg-ue-83-2014-pt.txt');
const CS = read('cs-ftl1-2014-002-R.txt');
const flat = (s) => s.replace(/\s+/g, ' ');
const ENf = flat(EN), PTf = flat(PT), CSf = flat(CS);

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; fails.push(`  ✗ ${name}\n      fonte: ${w}\n      motor: ${g}`); }
};
// A frase tem de estar no texto oficial (espaços normalizados) — senão o número do motor não tem onde se apoiar.
const has = (name, txt, phrase) => { if (txt.includes(flat(phrase))) pass++; else { fail++; fails.push(`  ✗ ${name}: frase não encontrada na fonte → "${phrase}"`); } };
const hm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
const hmN = (v) => (v == null ? null : hm(v));
const block = (txt, from, to) => { const a = txt.indexOf(from); const b = txt.indexOf(to, a + from.length); return a < 0 ? '' : txt.slice(a, b < 0 ? undefined : b); };
const times = (s) => (s.match(/\b\d{2}:\d{2}\b/g) || []);

// ─────────────── Quadro 2 (ORO.FTL.205(b)(1), EN p.8) — 13 faixas × 9 colunas = 117 valores ───────────────
// Na extração, cada linha de valores aparece UMA linha ANTES da sua faixa: emparelham-se pela ordem.
{
  const t2 = block(EN, 'Maximum daily FDP — Acclimatised crew members', 'Table 3');
  const valueRows = t2.split('\n').map((l) => times(l)).filter((v) => v.length === 9);
  const bands = (t2.match(/\b\d{4}–\d{4}\b/g) || []);
  eq('Quadro 2: 13 faixas', bands.length, 13);
  eq('Quadro 2: 13 linhas de 9 valores', valueRows.length, 13);
  bands.forEach((b, i) => {
    const row = T.PSV_ACCLIMATISED[i];
    eq(`Quadro 2: faixa ${i + 1}`, row && row.start, b);
    eq(`Quadro 2: ${b}`, row && row.v.map(hm), (valueRows[i] || []).map(hm));
  });
}

// ─────────────── Quadros 3 e 4 (ORO.FTL.205(b)(2)(3), EN p.9) ───────────────
// Os valores descem (ou ficam iguais) com os setores: a ordem certa é a decrescente. O Quadro 4 sai em duas linhas.
{
  const desc = (a) => a.map(hm).sort((x, y) => y - x);
  eq('Quadro 3 (desconhecido)', T.PSV_UNKNOWN.map(hm), desc(times(block(EN, 'Table 3', '(3) The maximum daily FDP'))));
  eq('Quadro 4 (desconhecido + SGRF)', T.PSV_UNKNOWN_FRM.map(hm), desc(times(block(EN, 'Table 4', '(c) FDP with different reporting time'))));
}

// ─────────────── Quadro 1 (ORO.FTL.105(1), EN p.4) — estado de aclimatação ───────────────
{
  const t1 = block(EN, 'Table 1', '“B” means');
  const rowOf = (label) => { const l = t1.split('\n').find((x) => x.trim().startsWith(label)); return l ? (l.match(/\b[BXD]\b/g) || []) : []; };
  // A linha "< 4" sai partida: o "B" (< 48 h) na própria linha e os quatro "D" (≥ 48 h) na linha do cabeçalho
  // "the crew member … D D D D" — as letras ficam alinhadas por cima das colunas na página.
  const lt4 = [...rowOf('<4'), ...(((t1.split('\n').find((x) => /the crew member/.test(x)) || '').match(/\b[D]\b/g)) || [])];
  eq('Quadro 1: < 4', T.QUADRO1[0], lt4);
  eq('Quadro 1: ≤ 6', T.QUADRO1[1], rowOf('≤6'));
  eq('Quadro 1: ≤ 9', T.QUADRO1[2], rowOf('≤9'));
  eq('Quadro 1: ≤ 12', T.QUADRO1[3], rowOf('≤ 12'));
}

// ─────────────── Prolongamento sem repouso a bordo (CS FTL.1.205(b), p.5) ───────────────
// Colunas 1–2 e 3 setores: as duas primeiras células de cada linha de faixa. Colunas 4 e 5 das 6 primeiras faixas
// (0600 a 1330): a extração empilha-as em pares, pela ordem, nas linhas e nos restos de linha antes de "1400–1429";
// a partir daí vêm na própria linha.
{
  const tx = block(CS, 'Maximum daily FDP with extension', '(c)');
  const lines = tx.split('\n');
  const cells = (s) => (s.match(/Not allowed|\b\d{2}:\d{2}\b/g) || []).map((c) => (c === 'Not allowed' ? null : c));
  const bandLines = lines.map((l) => ({ l, m: /^\s*(\d{4}–\d{4})\s+(.*)$/.exec(l) })).filter((x) => x.m);
  const i1400 = lines.findIndex((l) => /^\s*1400–1429/.test(l));
  const head = lines.slice(0, i1400);
  const stacked = [];
  for (const l of head) {
    const m = /^\s*(\d{4}–\d{4})\s+(.*)$/.exec(l);
    const c = cells(m ? m[2] : l);
    const tail = m ? c.slice(2) : c;
    if (tail.length === 2) stacked.push(tail);
  }
  const src = bandLines.map(({ m }, i) => {
    const c = cells(m[2]);
    const tail = i < 6 ? (stacked[i] || [undefined, undefined]) : c.slice(2, 4);
    return { start: m[1], v: [c[0], c[1], tail[0] ?? null, tail[1] ?? null] };
  });
  eq('Prolongamento: a fonte tem as 25 faixas', src.length, 25);
  src.forEach((r, i) => {
    const e = T.PSV_EXTENSION[i];
    if (e) {
      eq(`Prolongamento: faixa ${r.start}`, e.start, r.start);
      eq(`Prolongamento: ${r.start}`, e.v.map(hmN), r.v.map(hmN));
    } else {
      // Faixas que o motor não lista: a fonte tem de as dar "Not allowed" em todas as colunas, e o motor tem de as recusar.
      const startMin = hm(`${r.start.slice(0, 2)}:${r.start.slice(2, 4)}`);
      eq(`Prolongamento: ${r.start} não permitido na fonte`, r.v, [null, null, null, null]);
      eq(`Prolongamento: ${r.start} recusado pelo motor`, fdpRules.maxFdpWithExtensionMin(startMin, 1), null);
    }
  });
}

// ─────────────── Repouso a bordo — pilotos (CS FTL.1.205(c)(2), p.6) ───────────────
{
  const re = (n) => new RegExp(`with ${n} additional flight crew members?:\\s*\\(A\\) up to (\\d+) hours with class 3 rest facilities;\\s*\\(B\\) up to (\\d+) hours with class 2 rest facilities; or\\s*\\(C\\) up to (\\d+) hours with class 1`);
  const one = re('one').exec(CSf), two = re('two').exec(CSf);
  eq('205(c)(2): encontrada (+1 piloto)', !!one, true);
  eq('205(c)(2): encontrada (+2 pilotos)', !!two, true);
  if (one && two) {
    const h = (x) => `${String(x).padStart(2, '0')}:00`;
    for (const [k, cls, idx] of [['c3', 'classe 3', 1], ['c2', 'classe 2', 2], ['c1', 'classe 1', 3]]) {
      eq(`205(c)(2): ${cls} +1`, T.INFLIGHT_FDP_FC[k][1], h(one[idx]));
      eq(`205(c)(2): ${cls} +2`, T.INFLIGHT_FDP_FC[k][2], h(two[idx]));
    }
  }
  has('205(c)(1)(i): 3 setores', CSf, 'the FDP is limited to 3 sectors');
  eq('205(c)(1)(i): motor', inflight.INFLIGHT_SECTOR_LIMIT, 3);
  has('205(c)(1)(ii): 90 min e 2 h', CSf, 'the minimum in-flight rest period is a consecutive 90-minute period for each crew member and 2 consecutive hours for the flight crew members at control during landing');
  eq('205(c)(1)(ii): motor', [inflight.INFLIGHT_MIN_REST_MIN, inflight.LANDING_PILOT_MIN_REST_MIN], [90, 120]);
  has('205(c)(4): +1 h, setor de mais de 9 h, máx 2 setores', CSf, 'may be increased by 1 hour for FDPs that include 1 sector of more than 9 hours of continuous flight time and a maximum of 2 sectors');
  eq('205(c)(4): motor', [inflight.INFLIGHT_LONG_SECTOR_ADD_MIN, inflight.INFLIGHT_LONG_SECTOR_MIN, inflight.INFLIGHT_LONG_SECTOR_MAX_SECTORS], [60, 540, 2]);
  has('205(c)(6): repouso no destino ≥ serviço ou 14 h', CSf, 'The minimum rest at destination is at least as long as the preceding duty period, or 14 hours, whichever is greater');
  eq('205(c)(6): motor', [inflight.INFLIGHT_DEST_REST_FLOOR_MIN, restCalc.INFLIGHT_REST_FLOOR_MIN], [840, 840]);
}

// ─────────────── Repouso a bordo — cabine (CS FTL.1.205(c)(3), p.7) ───────────────
{
  const tc = block(CS, '(3) The minimum in-flight rest for each cabin crew member is:', '(4) The limits');
  const rows = tc.split('\n').filter((l) => /hrs/.test(l)).map((l) => {
    const upto = /(\d{2}:\d{2}) hrs/.exec(l)[1];
    const after = l.slice(l.indexOf('hrs') + 3);
    const c = (after.match(/Not allowed|\b\d{1,2}:\d{2}\b/g) || []).map((x) => (x === 'Not allowed' ? null : x));
    return { fdp: upto, c1: c[0], c2: c[1], c3: c[2] };
  });
  eq('205(c)(3): 8 linhas', rows.length, 8);
  rows.forEach((r, i) => eq(`205(c)(3): até ${r.fdp}`, T.INFLIGHT_REST[i], r));
}

// ─────────────── Noites locais na base por fusos (CS FTL.1.235(b)(3)(i), p.10) ───────────────
{
  const tz = block(CS, 'Minimum local nights of rest at home base', '(ii) Away from home base');
  const row = (lab) => { const l = tz.split('\n').find((x) => x.trim().startsWith(lab)); return l ? l.trim().slice(lab.length).trim().split(/\s+/).map(Number) : null; };
  eq('235(b)(3)(i): ≤ 6', T.TZ_REST_NIGHTS[0], row('≤6'));
  eq('235(b)(3)(i): ≤ 9', T.TZ_REST_NIGHTS[1], row('≤9'));
  eq('235(b)(3)(i): ≤ 12', T.TZ_REST_NIGHTS[2], row('≤12'));
  has('235(b)(3)(ii): fora da base, fuso ≥ 4 h → serviço ou 14 h', CSf, 'Away from home base, if an FDP involves a 4-hour time difference or more, the minimum rest following that FDP is at least as long as the preceding duty period, or 14 hours, whichever is greater');
  eq('235(b)(3)(ii): motor (4 h → 14 h; abaixo de 4 h → 10 h)', [restCalc.computeRest({ inBase: false, tzDiffH: 4 }).floorMin, restCalc.computeRest({ inBase: false, tzDiffH: 3.9 }).floorMin], [840, 600]);
}

// ─────────────── Limites acumulados (ORO.FTL.210, EN p.11) ───────────────
{
  has('210(a)(1)', ENf, '60 duty hours in any 7 consecutive days');
  has('210(a)(2)', ENf, '110 duty hours in any 14 consecutive days');
  has('210(a)(3)', ENf, '190 duty hours in any 28 consecutive days');
  eq('210(a): motor', ftl.DUTY_WINDOWS.map((w) => [w.days, w.limit]), [[7, 60], [14, 110], [28, 190]]);
  has('210(b)(1)', ENf, '100 hours of flight time in any 28 consecutive days');
  has('210(b)(2)', ENf, '900 hours of flight time in any calendar year');
  has('210(b)(3)', ENf, '1 000 hours of flight time in any 12 consecutive calendar months');
  eq('210(b): motor', ftl.FLIGHT_WINDOWS.map((w) => w.limit), [100, 900, 1000]);
}

// ─────────────── Definições (ORO.FTL.105, EN p.5–6) ───────────────
{
  has('105(28): WOCL 02:00–05:59', ENf, '“window of circadian low (‘WOCL’)” means the period between 02:00 and 05:59 hours');
  eq('105(28): motor [120, 360)', [tables.WOCL.start, tables.WOCL.end], [120, 360]);
  has('105(9): noturno 02:00–04:59', ENf, '“night duty” means a duty period encroaching any portion of the period between 02:00 and 04:59');
  eq('105(9): motor [120, 300)', [tables.NIGHT.start, tables.NIGHT.end], [120, 300]);
  has('105(8)(a)(i) matinal: entrada 05:00–05:59', ENf, 'for “early start” a duty period starting in the period between 05:00 and 05:59');
  has('105(8)(a)(ii) matinal: largada 23:00–01:59', ENf, 'for “late finish” a duty period finishing in the period between 23:00 and 01:59');
  has('105(8)(b)(i) tardio: entrada 05:00–06:59', ENf, 'for “early start” a duty period starting in the period between 05:00 and 06:59');
  has('105(8)(b)(ii) tardio: largada 00:00–01:59', ENf, 'for “late finish” a duty period finishing in the period between 00:00 and 01:59');
  eq('105(8): motor matinal', [dis.DISRUPTIVE_BANDS.early.earlyStart, dis.DISRUPTIVE_BANDS.early.lateFinish], [{ start: 300, end: 360 }, { lo1: 1380, hi1: 1440, lo2: 0, hi2: 120 }]);
  eq('105(8): motor tardio', [dis.DISRUPTIVE_BANDS.late.earlyStart, dis.DISRUPTIVE_BANDS.late.lateFinish], [{ start: 300, end: 420 }, { lo1: 1440, hi1: 1440, lo2: 0, hi2: 120 }]);
}

// ─────────────── PSV: noites, prolongamento, discrição, adiamento (ORO.FTL.205, CS FTL.1.205) ───────────────
{
  has('CS 205(a)(1): noites seguidas ≤ 4 setores', CSf, 'number of sectors is limited to 4 sectors per duty');
  eq('CS 205(a)(1): motor', fdpRules.NIGHT_SECTOR_LIMIT, 4);
  has('205(d)(1): 2 vezes em 7 dias', ENf, 'extended by up to 1 hour not more than twice in any 7 consecutive days');
  eq('205(d)(1): motor', ext.EXTENSION_MAX_PER_7D, 2);
  has('205(d)(1)(i): +2 h antes e depois', ENf, 'the minimum pre-flight and post-flight rest periods shall be increased by 2 hours');
  has('205(d)(1)(ii): +4 h depois', ENf, 'the post-flight rest period shall be increased by 4 hours');
  eq('205(d)(1): motor', [restCalc.EXT_REST_ADD_MIN, restCalc.EXT_REST_ADD_POST_ONLY_MIN], [120, 240]);
  has('205(d)(3)(i)', ENf, '5 sectors when the WOCL is not encroached');
  has('205(d)(3)(ii)', ENf, '4 sectors, when the WOCL is encroached by 2 hours or less');
  has('205(d)(3)(iii)', ENf, '2 sectors, when the WOCL is encroached by more than 2 hours');
  eq('205(d)(3): motor (0 · 120 · 121 min no WOCL)', [fdpRules.EXT_SECTOR_CAP(0), fdpRules.EXT_SECTOR_CAP(120), fdpRules.EXT_SECTOR_CAP(121)], [5, 4, 2]);
  has('205(f)(1)(i): +2 h, +3 h reforçada, sobre (b), (e) ou 220', ENf, 'the maximum daily FDP which results after applying points (b) and (e) of point ORO.FTL.205 or point ORO.FTL.220 may not be increased by more than 2 hours unless the flight crew has been augmented, in which case the maximum flight duty period may be increased by not more than 3 hours');
  eq('205(f)(1)(i): motor', [disc.DISCRETION_FDP_EXT_MIN, disc.DISCRETION_FDP_EXT_INFLIGHT_MIN], [120, 180]);
  has('205(f)(1)(iii): repouso nunca < 10 h', ENf, 'the rest period following the FDP may be reduced but can never be less than 10 hours');
  eq('205(f)(1)(iii): motor', disc.DISCRETION_REST_FLOOR_MIN, 600);
  has('CS 205(d)(1)(iii): adiamento < 4 h', CSf, 'when the delay is less than 4 hours, the maximum FDP is calculated based on the original reporting time');
  has('CS 205(d)(1)(v): 10 h ou mais = repouso', CSf, 'a delay of 10 hours or more in reporting time and the crew member is not further disturbed by the operator, such delay of 10 hours or more counts as a rest period');
  eq('CS 205(d): motor', [delayed.DELAY_LIMITING_THRESHOLD_MIN, delayed.DELAY_AS_REST_MIN], [240, 600]);
}

// ─────────────── Serviço repartido (CS FTL.1.220, p.8) ───────────────
{
  has('220(a): 3 h seguidas', CSf, 'has a minimum duration of 3 consecutive hours');
  has('220(b): 30 min de pré/pós-voo e deslocação', CSf, 'The minimum total time for post and pre-flight duties and travelling is 30 minutes');
  has('220(c): até 50 % da pausa', CSf, 'may be increased by up to 50 % of the break');
  has('220(e)(2): acima de 6 h ou no WOCL não conta', CSf, 'any time of the actual break exceeding 6 hours or any time of the break that encroaches the WOCL does not count for the extension of the FDP');
  eq('220: motor', [fdpRules.SPLIT_MIN_BREAK_H, fdpRules.SPLIT_ADMIN_MIN, fdpRules.SPLIT_EXT_FACTOR, fdpRules.SPLIT_BASIC_CAP_MIN], [3, 30, 0.5, 360]);
}

// ─────────────── Standby (CS FTL.1.225, p.8–9) ───────────────
{
  has('225(a)(2)(i): aeroporto, acima de 4 h', CSf, 'The maximum FDP is reduced by any time spent on standby in excess of 4 hours');
  has('225(a)(2)(ii): aeroporto + PSV ≤ 16 h', CSf, 'the maximum combined duration of airport standby and assigned FDP as specified in ORO.FTL.205(b) and (d) is 16 hours');
  has('225(b)(1): outro standby ≤ 16 h', CSf, 'the maximum duration of standby other than airport standby is 16 hours');
  has('225(b)(2): 18 h acordado', CSf, 'do not lead to more than 18 hours awake time');
  has('225(b)(3): 25 % conta para o 210', CSf, '25 % of time spent on standby other than airport standby counts as duty time for the purpose of ORO.FTL.210');
  has('225(b)(6): primeiras 6 h', CSf, 'if standby ceases within the first 6 hours, the maximum FDP counts from reporting');
  has('225(b)(8): 8 h com repouso a bordo ou repartido', CSf, 'the 6 hours of paragraph (6) and (7) are extended to 8 hours');
  has('225(b)(9): 23:00–07:00', CSf, 'if standby starts between 23:00 and 07:00, the time between 23:00 and 07:00 does not count towards the reduction of the FDP');
  eq('225: motor', [standby.AIRPORT_STANDBY_FREE_H, standby.AIRPORT_COMBINED_MAX_H, standby.OTHER_STANDBY_MAX_H, standby.MAX_AWAKE_H, standby.OTHER_STANDBY_DUTY_PCT, standby.OTHER_STANDBY_FREE_H, standby.OTHER_STANDBY_FREE_EXT_H, standby.STANDBY_NIGHT_START_MIN, standby.STANDBY_NIGHT_END_MIN],
    [4, 16, 16, 18, 0.25, 6, 8, 1380, 420]);
}

// ─────────────── Repouso (ORO.FTL.235, CS FTL.1.235) ───────────────
{
  has('235(a)(1): base, serviço ou 12 h', ENf, 'The minimum rest period provided before undertaking an FDP starting at home base shall be at least as long as the preceding duty period, or 12 hours, whichever is greater');
  has('235(b): fora, serviço ou 10 h', ENf, 'as the preceding duty period, or 10 hours, whichever is greater');
  eq('235(a)/(b): motor', [restRules.REST_FLOOR_BASE_MIN, restRules.REST_FLOOR_AWAY_MIN], [720, 600]);
  has('CS 235(c)(1): reduzido 12 h / 10 h', CSf, 'The minimum reduced rest periods under reduced rest arrangements are 12 hours at home base and 10 hours out of base');
  has('CS 235(c)(5): máx 2 reduzidos', CSf, 'There is a maximum of 2 reduced rest periods between 2 recurrent extended recovery rest periods');
  eq('CS 235(c): motor', [reduced.REDUCED_REST_BASE_MIN, reduced.REDUCED_REST_AWAY_MIN, reduced.MAX_REDUCED_PER_CYCLE], [720, 600, 2]);
  has('235(d): 36 h com 2 noites, ≤ 168 h', ENf, 'The minimum recurrent extended recovery rest period shall be 36 hours, including 2 local nights, and in any case the time between the end of one recurrent extended recovery rest period and the start of the next extended recovery rest period shall not be more than 168 hours');
  eq('235(d): motor', [restRules.RECOVERY.minHours, restRules.RECOVERY.localNights, restRules.RECOVERY.maxApartHours, seq.RECOVERY_MIN_H, seq.RECOVERY_MAX_APART_H], [36, 2, 168, 36, 168]);
  has('CS 235(a)(2): 4 ou mais disruptivos → 60 h', CSf, 'If a crew member performs 4 or more night duties, early starts or late finishes between 2 extended recovery rest periods as defined in ORO.FTL.235(d), the second extended recovery rest period is extended to 60 hours');
  eq('CS 235(a)(2): motor', [seq.DISRUPTIVE_THRESHOLD, seq.RECOVERY_EXT_H], [4, 60]);
}

// ─────────────── A versão portuguesa diz o mesmo nos números que a app cita ───────────────
{
  has('PT 205(d)(1)', PTf, 'O PSV máximo diário pode ser prolongado até uma hora não mais do que duas vezes em cada período de 7 dias consecutivos');
  has('PT 235(a)(1)', PTf, 'deve ser pelo menos igual ao período de serviço precedente, ou de 12 horas, conforme o período que for mais longo');
  has('PT 235(b)', PTf, 'deve ser pelo menos igual ao período de serviço precedente, ou de 10 horas, conforme o período que for mais longo');
  has('PT 225(c): aeroporto conta por inteiro', PTf, 'O serviço de assistência no aeroporto conta por inteiro como período de serviço');
}

console.log(`\nFTL × fontes — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Cada número do motor FTL está no texto oficial de fontes/ftl/ (Reg. 83/2014 EN/PT · CS-FTL.1).');
