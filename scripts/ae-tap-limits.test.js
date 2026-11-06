/*
 * LIMITES DE ESCALA DOS AE DA TAP (v1, 2026-11-03) — ae/tapLimits.js. Sem framework (igual aos golden AE/FTL).
 *   Parte 1 — NADA INVENTADO: cada citação de cada regra existe, letra a letra, no texto oficial do BTE
 *             (fontes/ae-tap/*.txt), na página indicada; os valores das tabelas aparecem nas páginas do quadro.
 *   Parte 2 — GOLDEN: casos calculados à mão a partir do texto oficial.
 * Executar:  node scripts/ae-tap-limits.test.js   (ou: npm run test:taplimits)
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

const L = require(path.resolve('ae/tapLimits.js'));
const { TAP_RULES, P27_TABLE, C23_TABLE, servicesOf, fdpLimitFor, evaluateTapLimits, isMediumHaul } = L;

let pass = 0, fail = 0;
const fails = [];
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else { fail++; fails.push(`✗ ${label}\n    esperado: ${JSON.stringify(want)}\n    obtido:   ${JSON.stringify(got)}`); }
};
const ok = (label, cond) => { if (cond) pass++; else { fail++; fails.push(`✗ ${label}`); } };

// ── Parte 1 — as citações e as tabelas contra o texto oficial ──────────────────────────────────
const norm = (t) => String(t).normalize('NFC').replace(/­/g, '').replace(/[\s\-‐‑–—]+/g, '');
const pagesOf = (file) => {
  const p = path.resolve('fontes', 'ae-tap', `${file}.txt`);
  if (!fs.existsSync(p)) return null;
  const txt = fs.readFileSync(p, 'utf8');
  const parts = txt.split(/=====\[PDF p\.\d+ \| BTE p\.(\d+)\]=====/);
  const map = new Map();
  for (let i = 1; i < parts.length; i += 2) map.set(+parts[i], norm(parts[i + 1]));
  return map;
};
const PAGES = { pilot: pagesOf('tap-spac-2023'), cabin: pagesOf('tap-snpvac-2024') };
if (!PAGES.pilot || !PAGES.cabin) {
  fail++; fails.push('✗ falta o texto oficial em fontes/ae-tap/*.txt (ver fontes/README.md)');
} else {
  for (const r of TAP_RULES) {
    const pages = PAGES[r.crew];
    r.quotes.forEach(([q, page], i) => {
      const nq = norm(q);
      if (page == null) { ok(`${r.id} citação ${i + 1} existe no texto oficial`, [...pages.values()].some((t) => t.includes(nq))); return; }
      ok(`${r.id} citação ${i + 1} na p. ${page} do BTE`, (pages.get(page) || '').includes(nq));
    });
    ok(`${r.id} tem convenções escritas (pt e en)`, Array.isArray(r.conventions) && r.conventions.every((c) => c.pt && c.en));
    // Fontes oficiais fora do BTE (ex.: ICAO para o Atlântico Norte): o texto guardado em fontes/, na página indicada.
    (r.ext || []).forEach((e, i) => {
      const p = path.resolve('fontes', `${e.file}.txt`);
      const txt = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      const parts = txt.split(/=====\[PDF p\.(\d+)\]=====/);
      const page = new Map(); for (let k = 1; k < parts.length; k += 2) page.set(+parts[k], norm(parts[k + 1]));
      ok(`${r.id} fonte externa ${i + 1} (${e.src}) existe no texto guardado`, (page.get(e.page) || '').includes(norm(e.quote)));
    });
  }
  // As tabelas: cada valor aparece nas páginas do quadro (os valores foram conferidos na imagem da página).
  const hm = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  const pilotTablePages = (PAGES.pilot.get(304) || '') + (PAGES.pilot.get(305) || '');
  P27_TABLE.forEach(([a, b, c1, c5]) => {
    ok(`P27 linha ${hm(a)}–${hm(b)} existe no quadro`, pilotTablePages.includes(norm(`${hm(a)} - ${hm(b)}`)));
    ok(`P27 ${hm(a)}: ${hm(c1)} e ${hm(c5)} existem no quadro`, pilotTablePages.includes(norm(hm(c1))) && pilotTablePages.includes(norm(hm(c5))));
  });
  const cabTablePage = PAGES.cabin.get(341) || '';
  C23_TABLE.forEach(([a, b, c]) => {
    ok(`C23 linha ${hm(a)}–${hm(b)} existe no quadro`, cabTablePage.includes(norm(`${hm(a)} - ${hm(b)}`)));
    ok(`C23 ${hm(a)}: ${hm(c)} existe no quadro`, cabTablePage.includes(norm(hm(c))));
  });
  // Longo curso (v2): as linhas e os valores dos quadros existem nas páginas (conferidos na imagem da página).
  const LC_ROWS = ['7h00-13h59', '14h00-15h59', '16h00-18h59', '19h00- 6h59'];
  const p307 = PAGES.pilot.get(307) || '';
  LC_ROWS.forEach((x) => ok(`P32 linha ${x} existe no quadro (p. 307)`, p307.includes(norm(x))));
  L.P32_TABLE.forEach(([a, , ac, na]) => [...ac, ...na].filter((v) => v != null)
    .forEach((v) => ok(`P32 ${hm(a)}: ${hm(v)} existe no quadro`, p307.includes(norm(hm(v))))));
  ok('P32 "N/A" existe no quadro', p307.includes('N/A'));
  LC_ROWS.forEach((x) => ok(`C26 linha ${x} existe no quadro (p. 341)`, cabTablePage.includes(norm(x.replace('-', ' - ')))));
  L.C26_TABLE.forEach(([a, , ac]) => ac.filter((v) => v != null).forEach((v) => ok(`C26 ${hm(a)}: ${hm(v)} existe no quadro`, cabTablePage.includes(norm(hm(v))))));
  const p342 = PAGES.cabin.get(342) || '';
  L.C26_NOT_ACCL.forEach((v) => ok(`C26 não aclimatizado: ${hm(v)} existe no quadro do n.º 5`, p342.includes(norm(hm(v)))));
  ['47 horas e 59 minutos', 'Após 48 horas', '48 a 71h59 horas', 'Após 72 horas', '48 a 95h59 horas', 'Após 96 horas', '48 a 119h59 horas', 'Após 120 horas', 'Até 4', '4, 5 e 6', '7, 8 e 9', '10, 11 e 12']
    .forEach((x) => ok(`C26 quadro do n.º 4: "${x}" existe (p. 342)`, p342.includes(norm(x))));
}

// ── Parte 2 — golden ───────────────────────────────────────────────────────────────────────────
const F = (rep, off, on, sectors, route, extra = {}) => ({ kind: 'flight', report_time: rep, block_off: off, block_on: on, sectors, route, flight_minutes: 60, ...extra });
const S = (kind, start, end) => ({ kind, report_time: start, block_on: end, sectors: 0 });
const svc1 = (duty, crewType, date = '2026-03-02') => servicesOf({ [date]: duty }, { baseAt: 'LIS', crewType })[0];
const rule = (res, id) => res.rules.find((r) => r.id === id) || { status: null, findings: [] };
const has = (res, id, reason) => rule(res, id).findings.some((f) => f.status === 'excede' && (!reason || f.reason === reason));
const run = (crewType, duties, extra = {}) => evaluateTapLimits({ crewType, duties, baseAt: 'LIS', today: '2026-12-31', ...extra });
const days = (from, n) => Array.from({ length: n }, (_, i) => L.isoOf(L.dayNum(from) + i));

// Médio curso pela definição (pilotos Cl. 32.ª, n.º 1; cabine Cl. 4.ª, n.º 49).
eq('LIS-OPO-LIS é médio curso', isMediumHaul(['LIS', 'OPO', 'LIS'], 'pilot'), true);
eq('LIS-JFK não é médio curso (73°W)', isMediumHaul(['LIS', 'JFK'], 'pilot'), false);

// P27 — tempo de serviço de voo dos pilotos (Cl. 35.ª): da apresentação a 30 min depois dos calços.
{
  const a = fdpLimitFor(svc1(F('06:30', '07:15', '17:10', 2, 'LIS-OPO-LIS'), 'pilot'), 'pilot');
  eq('P27 06h30, 2 aterragens: limite 11h00 (660)', a.limit, 660);
  eq('P27 06h30: TSV 06h30→17h40 = 670 → excede', [a.value, a.status], [670, 'excede']);
  eq('P27 hora-limite de calços = 06h30 + 11h00 − 30 min = 17h00', a.latestOnBlock % 1440, 17 * 60);
  eq('P27 calços às 16h50 → dentro', fdpLimitFor(svc1(F('06:30', '07:15', '16:50', 2, 'LIS-OPO-LIS'), 'pilot'), 'pilot').status, 'dentro');
  eq('P27 09h00, 5 aterragens: 11h45', fdpLimitFor(svc1(F('09:00', '09:40', '18:00', 5, 'LIS-OPO-LIS-FAO-LIS-OPO'), 'pilot'), 'pilot').limit, 705);
  eq('P27 18h30, 3 aterragens: 10h15 (nota **)', fdpLimitFor(svc1(F('18:30', '19:10', '23:00', 3, 'LIS-OPO-LIS-FAO'), 'pilot'), 'pilot').limit, 615);
  eq('P27 18h30, 2 aterragens: 10h30', fdpLimitFor(svc1(F('18:30', '19:10', '23:00', 2, 'LIS-OPO-LIS'), 'pilot'), 'pilot').limit, 630);
  eq('P27 00h30, 4 aterragens: 10h00', fdpLimitFor(svc1(F('00:30', '01:10', '06:00', 4, 'LIS-OPO-LIS-OPO-LIS'), 'pilot'), 'pilot').limit, 600);
  eq('P27 apresentação fora da base às 05h00: 6 h (n.º 3)', fdpLimitFor(svc1(F('05:00', '05:40', '07:00', 1, 'OPO-LIS'), 'pilot'), 'pilot').limit, 360);
  eq('P27 longo curso fica de fora da v1', fdpLimitFor(svc1(F('10:00', '11:00', '19:00', 1, 'LIS-JFK'), 'pilot'), 'pilot'), { status: 'incerto', reason: 'longo-curso' });
}

// C23 — período de serviço de voo da cabine (Cl. 23.ª, n.º 1).
{
  eq('C23 18h30, 3 aterragens planeadas: 10h15', fdpLimitFor(svc1(F('18:30', '19:10', '23:00', 3, 'LIS-OPO-LIS-FAO'), 'cabin'), 'cabin').limit, 615);
  eq('C23 18h30, 4 aterragens: 10h30', fdpLimitFor(svc1(F('18:30', '19:10', '23:00', 4, 'LIS-OPO-LIS-FAO-LIS'), 'cabin'), 'cabin').limit, 630);
  eq('C23 5 aterragens: sem coluna no AE', fdpLimitFor(svc1(F('09:00', '09:40', '18:00', 5, 'LIS-OPO-LIS-FAO-LIS-OPO'), 'cabin'), 'cabin'), { status: 'incerto', reason: 'sem-coluna' });
  eq('C23 06h30, 2 aterragens: 11h00', fdpLimitFor(svc1(F('06:30', '07:15', '16:50', 2, 'LIS-OPO-LIS'), 'cabin'), 'cabin').limit, 660);
  eq('C23 fora da base às 03h00, 2 setores: 6 h (n.º 1 b))', fdpLimitFor(svc1(F('03:00', '03:40', '07:00', 2, 'OPO-LIS-OPO'), 'cabin'), 'cabin').limit, 360);
  eq('C23 fora da base às 03h00, 1 setor direto à base: o quadro (10h00)', fdpLimitFor(svc1(F('03:00', '03:40', '05:00', 1, 'OPO-LIS'), 'cabin'), 'cabin').limit, 600);
  // n.º 1 c): rotação de 3 dias com PSV de 12h20, 12h10 e 12h00 → média 12h10 > 12h (cada um dentro do quadro).
  const rot = run('cabin', {
    '2026-04-06': F('09:00', '09:40', '20:50', 1, 'LIS-OPO'),
    '2026-04-07': F('09:00', '09:40', '20:40', 1, 'OPO-MAD'),
    '2026-04-08': F('09:00', '09:40', '20:30', 1, 'MAD-LIS'),
  });
  const avg = rule(rot, 'C23').findings.find((f) => f.reason === 'media-rotacao');
  eq('C23 c) média da rotação de 3 dias: 730 > 720 → excede', avg && [avg.value, avg.status], [730, 'excede']);
}

// P42 + P50 — repouso + transição (pilotos).
{
  const base = (off) => run('pilot', { '2026-03-02': F('12:00', '12:30', '22:00', 2, 'LIS-OPO-LIS'), '2026-03-03': F('13:00', off, '16:00', 2, 'LIS-FAO-LIS') });
  const r1 = rule(base('14:00'), 'P42').findings[0];
  eq('P42 na base: calços 22h00 → saída 14h00 = 16 h = max(12 h, 10h30) + 4 h → dentro', [r1.value, r1.limit, r1.status], [960, 960, 'dentro']);
  eq('P42 na base: saída 13h59 → excede', rule(base('13:59'), 'P42').findings[0].status, 'excede');
  const away = (off) => rule(run('pilot', { '2026-03-02': F('18:00', '18:30', '21:00', 1, 'LIS-OPO'), '2026-03-03': F('09:00', off, '11:00', 1, 'OPO-LIS') }), 'P42').findings[0];
  eq('P42 fora: 13 h < 11 h + 3 h → excede', [away('10:00').value, away('10:00').limit, away('10:00').status], [780, 840, 'excede']);
  eq('P42 fora: 15 h ≥ 14 h → incerto (falta o transporte do ROV)', [away('12:00').status, away('12:00').reason], ['incerto', 'sem-transporte']);
  const sb = (rep) => rule(run('pilot', { '2026-03-02': S('standby_home', '06:00', '16:00'), '2026-03-03': F(rep, '05:00', '09:00', 2, 'LIS-OPO-LIS') }), 'P42').findings[0].status;
  eq('P42 depois de assistência sem chamada: 11h30 < 12 h → excede (Cl. 25.ª, n.º 6)', sb('03:30'), 'excede');
  eq('P42 depois de assistência: 12 h → dentro', sb('04:00'), 'dentro');
  // Voo → solo na base: a Cl. 34.ª, n.º 1 b) pede 9 h (ou o trabalho planeado, 10h30) e a Cl. 25.ª, n.º 2, 12 h.
  const gr = (st) => rule(run('pilot', { '2026-03-02': F('10:00', '10:30', '20:00', 2, 'LIS-OPO-LIS'), '2026-03-03': S('office', st, '17:00') }), 'P42').findings[0];
  eq('P42 voo → solo na base: 14 h ≥ 12 h + 2 h → dentro (as duas leituras)', [gr('10:00').value, gr('10:00').limit, gr('10:00').limitStr, gr('10:00').status], [840, 750, 840, 'dentro']);
  eq('P42 voo → solo: 13 h cabe na Cl. 34.ª (10h30 + 2 h) mas não na Cl. 25.ª (12 h + 2 h) → incerto', [gr('09:00').status, gr('09:00').reason], ['incerto', 'leituras']);
  eq('P42 voo → solo: 12 h < 10h30 + 2 h → excede', gr('08:00').status, 'excede');
  // Cl. 34.ª, n.º 2: serviço de voo que toca as 2h00–5h59 de Lisboa → mais 2 h de repouso.
  const w = rule(run('pilot', { '2026-03-02': F('03:00', '03:30', '10:00', 2, 'LIS-OPO-LIS'), '2026-03-03': F('02:30', '03:00', '09:00', 2, 'LIS-FAO-LIS') }), 'P42').findings[0];
  eq('P42 Cl. 34.ª, n.º 2: TSV 03h00→10h30 → 12 h + 2 h + 4 h = 18 h; 17 h → excede (sem o n.º 2 dava dentro)', [w.limit, w.value, w.status], [1080, 1020, 'excede']);
  eq('próxima saída de calços com as 2 h de Lisboa (pilotos): 10h00 + 14 h + 4 h = 04:00', L.nextOffBlockAfter(svc1(F('03:00', '03:30', '10:00', 2, 'LIS-OPO-LIS'), 'pilot'), 'pilot').at % 1440, 4 * 60);
}

// C38 + C42 — repouso + transição (cabine).
{
  const b = (off) => rule(run('cabin', { '2026-04-06': F('12:30', '13:00', '21:00', 2, 'LIS-OPO-LIS'), '2026-04-07': F('13:00', off, '17:00', 2, 'LIS-FAO-LIS') }), 'C38').findings[0];
  eq('C38 na base: calços 21h00 → saída 14h00 = 13 h + 4 h → dentro', [b('14:00').value, b('14:00').limit, b('14:00').status], [1020, 1020, 'dentro']);
  eq('C38 na base: saída 13h59 → excede', b('13:59').status, 'excede');
  const n7 = (off) => rule(run('cabin', { '2026-04-06': F('03:00', '03:30', '10:00', 2, 'LIS-OPO-LIS'), '2026-04-07': F('04:00', off, '09:00', 2, 'LIS-FAO-LIS') }), 'C38').findings[0];
  eq('C38 PSV que toca 2h00–5h59 de Lisboa: repouso + 2 h (n.º 7) → limite 19 h', n7('05:00').limit, 1140);
  eq('C38 com o n.º 7: saída 04h30 → excede (sem o n.º 7 dava dentro)', n7('04:30').status, 'excede');
}

// P53 — trabalho noturno (pilotos).
{
  const N = () => F('20:00', '20:30', '23:10', 2, 'LIS-OPO-LIS');
  const D = () => F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS');
  ok('P53 três noturnos seguidos → excede (n.º 1)', has(run('pilot', { '2026-03-02': N(), '2026-03-03': N(), '2026-03-04': N() }), 'P53', 'tres-seguidos'));
  const C = () => F('01:00', '01:30', '05:00', 2, 'LIS-OPO-LIS');
  ok('P53 dois seguidos a tocar 2h00–6h00 → excede (n.º 2)', has(run('pilot', { '2026-03-02': C(), '2026-03-03': C() }), 'P53', 'dois-criticos'));
  ok('P53 três em 7 dias sem descanso semanal pelo meio → excede (n.º 4)',
    has(run('pilot', { '2026-03-02': N(), '2026-03-03': D(), '2026-03-04': N(), '2026-03-05': D(), '2026-03-06': N() }), 'P53', 'sem-descanso-semanal'));
  ok('P53 três em 7 dias com descanso semanal pelo meio → dentro',
    !has(run('pilot', { '2026-03-02': N(), '2026-03-05': D(), '2026-03-06': N(), '2026-03-07': N() }), 'P53'));
  ok('P53 seg e qua, os dois a tocar 2h00–6h00, 43h30 livres (sem descanso semanal): o AE não decide se são consecutivos → incerto',
    rule(run('pilot', { '2026-03-02': C(), '2026-03-04': C() }), 'P53').findings.some((f) => f.reason === 'dois-criticos' && f.status === 'incerto'));
  ok('P53 assistências na residência não contam (n.º 5)',
    !has(run('pilot', { '2026-03-02': S('standby_home', '22:00', '07:00'), '2026-03-03': S('standby_home', '22:00', '07:00'), '2026-03-04': S('standby_home', '22:00', '07:00') }), 'P53'));
}

// C36 — serviço noturno (cabine).
{
  const N = () => F('20:00', '20:30', '23:10', 2, 'LIS-OPO-LIS');
  const D = () => F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS');
  ok('C36 seg e ter seguidos + qui, sem folga semanal entre o par e o outro → excede',
    has(run('cabin', { '2026-04-06': N(), '2026-04-07': N(), '2026-04-08': D(), '2026-04-09': N() }), 'C36', 'sem-folga-semanal'));
  ok('C36 seg e ter seguidos + sex, com 48 h livres na base pelo meio → dentro',
    !has(run('cabin', { '2026-04-06': N(), '2026-04-07': N(), '2026-04-10': N() }), 'C36'));
  ok('C36 três sem nenhum par seguido → dentro (o texto só condiciona os seguidos)',
    !has(run('cabin', { '2026-04-06': N(), '2026-04-07': D(), '2026-04-08': N(), '2026-04-09': D(), '2026-04-10': N() }), 'C36'));
  ok('C36 quatro em 7 dias → excede', has(run('cabin', { '2026-04-06': N(), '2026-04-07': D(), '2026-04-08': N(), '2026-04-09': D(), '2026-04-10': N(), '2026-04-11': D(), '2026-04-12': N() }), 'C36', 'mais-de-tres'));
  const C = () => F('01:00', '01:30', '05:00', 2, 'LIS-OPO-LIS');
  ok('C36 dois seguidos a tocar 2h00–5h59 → excede (n.º 3)', has(run('cabin', { '2026-04-06': C(), '2026-04-07': C() }), 'C36', 'dois-criticos'));
  ok('C36 seg e qua a tocar 2h00–5h59 com 43h30 livres (menos que uma folga semanal) → incerto',
    rule(run('cabin', { '2026-04-06': C(), '2026-04-08': C() }), 'C36').findings.some((f) => f.reason === 'dois-criticos' && f.status === 'incerto'));
  ok('C36 seg e qui a tocar 2h00–5h59 com uma folga semanal pelo meio → não são consecutivos (n.º 2)',
    !rule(run('cabin', { '2026-04-06': C(), '2026-04-09': C() }), 'C36').findings.some((f) => f.reason === 'dois-criticos'));
}

// P54–P56 — assistência (pilotos, Cl. 19.ª).
{
  ok('P54 em casa 06h00–18h00 (12 h sem as 23h–7h) → excede (máx. 10 h)', has(run('pilot', { '2026-03-02': S('standby_home', '06:00', '18:00') }), 'P54', 'duracao'));
  ok('P54 em casa 22h00–10h00 (inclui 23h–7h) → dentro (12 h)', !has(run('pilot', { '2026-03-02': S('standby_home', '22:00', '10:00') }), 'P54'));
  ok('P54 no aeroporto 08h00–13h00 → excede (máx. 4 h)', has(run('pilot', { '2026-03-02': S('standby_airport', '08:00', '13:00') }), 'P54', 'duracao'));
  ok('P54 início às 05h00 → excede (n.º 12)', has(run('pilot', { '2026-03-02': S('standby_home', '05:00', '13:00') }), 'P54', 'inicio-0000-0559'));
  ok('P54 intervalo de 10 h entre assistências em casa → excede (mín. 12 h)', has(run('pilot', { '2026-03-02': S('standby_home', '10:00', '20:00'), '2026-03-03': S('standby_home', '06:00', '16:00') }), 'P54', 'intervalo'));
  ok('P54 duas no mesmo dia → excede (n.º 2)', has(run('pilot', { '2026-03-02': { ...S('standby_home', '06:00', '09:00'), extra: [S('standby_home', '14:00', '18:00')] } }), 'P54', 'duas-no-mesmo-dia'));
}

// C45 — assistência (cabine, Cl. 17.ª).
{
  ok('C45 04h00–12h00 → excede (início entre 0h01 e 4h59)', has(run('cabin', { '2026-04-06': S('standby_home', '04:00', '12:00') }), 'C45', 'inicio-fim-0001-0459'));
  ok('C45 05h00–13h00 → dentro', !has(run('cabin', { '2026-04-06': S('standby_home', '05:00', '13:00') }), 'C45'));
  ok('C45 05h30 → excede (horas certas)', has(run('cabin', { '2026-04-06': S('standby_home', '05:30', '12:00') }), 'C45', 'hora-certa'));
  ok('C45 em casa 06h00–15h00 (9 h) → excede (máx. 8 h)', has(run('cabin', { '2026-04-06': S('standby_home', '06:00', '15:00') }), 'C45', 'duracao'));
  ok('C45 em casa 13h00–15h00 (2 h) → excede (mín. 3 h)', has(run('cabin', { '2026-04-06': S('standby_home', '13:00', '15:00') }), 'C45', 'duracao-minima'));
  ok('C45 em casa 22h00–10h00 (inclui 23h–7h) → dentro', !has(run('cabin', { '2026-04-06': S('standby_home', '22:00', '10:00') }), 'C45'));
  ok('C45 no aeroporto 08h00–13h00 → excede (máx. 4 h)', has(run('cabin', { '2026-04-06': S('standby_airport', '08:00', '13:00') }), 'C45', 'duracao'));
}

// P25 — tempo de voo dos pilotos (90 h em 28 dias).
{
  const mk = (n, min) => Object.fromEntries(days('2026-03-02', n).map((d) => [d, F('08:00', '08:30', '16:00', 2, 'LIS-OPO-LIS', { flight_minutes: min })]));
  ok('P25 13 voos de 7 h em 28 dias = 91 h → excede', rule(run('pilot', mk(13, 420)), 'P25').findings.some((f) => f.window === '28d'));
  ok('P25 12 voos de 7h30 = 90 h → dentro', !rule(run('pilot', mk(12, 450)), 'P25').findings.some((f) => f.window === '28d'));
}

// P26 — tempo de trabalho dos pilotos (48 h em 7 dias; assistência em casa a 25 %).
{
  const T = () => F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS');   // 08h00 → 15h00 = 7 h
  const seven = Object.fromEntries(days('2026-03-02', 7).map((d) => [d, T()]));
  ok('P26 7 dias × 7 h = 49 h → excede', rule(run('pilot', seven), 'P26').findings.some((f) => f.window === '7d'));
  const six = Object.fromEntries(days('2026-03-02', 6).map((d) => [d, T()]));
  six['2026-03-08'] = S('standby_home', '06:00', '16:00');            // 10 h × 25 % = 2h30
  const w = rule(run('pilot', six), 'P26').worst.find((x) => x.window === '7d');
  eq('P26 6 × 7 h + assistência em casa 10 h a 25 % = 44h30 → dentro', [w.value, rule(run('pilot', six), 'P26').findings.length], [2670, 0]);
}

// P06 — descanso semanal dos pilotos (o 6.º dia às 12h00).
{
  const D = () => F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS');   // acaba às 16h00
  const mk = (satOn) => ({
    '2026-01-03': F('12:00', '12:30', '19:30', 2, 'LIS-OPO-LIS'),   // sáb: acaba às 20h00 → descanso até seg 08h00 (36 h, 2 noites)
    '2026-01-05': D(), '2026-01-06': D(), '2026-01-07': D(), '2026-01-08': D(), '2026-01-09': D(),
    '2026-01-10': F('06:00', '06:30', satOn, 2, 'LIS-OPO-LIS'),
    '2026-01-12': D(),
  });
  ok('P06 descanso começa no sáb (6.º dia) às 14h00 → excede (até às 12h00)', has(run('pilot', mk('13:30')), 'P06'));
  ok('P06 descanso começa no sáb às 11h00 → dentro', !has(run('pilot', mk('10:30')), 'P06'));
}

// C11 — folga semanal e 5 dias seguidos (cabine, Cl. 20.ª, n.º 4).
{
  const D = () => F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS');   // acaba às 16h00
  const pattern = (on, off, weeks) => {
    const out = {}; let d = L.dayNum('2026-04-06');
    for (let w = 0; w < weeks; w++) { for (let i = 0; i < on; i++) out[L.isoOf(d + i)] = D(); d += on + off; }
    out[L.isoOf(d)] = D();
    return out;
  };
  ok('C11 5 dias seguidos → dentro', !has(run('cabin', pattern(5, 2, 3)), 'C11', 'mais-de-cinco'));
  ok('C11 6 dias seguidos → excede', has(run('cabin', pattern(6, 2, 3)), 'C11', 'mais-de-cinco'));
  eq('C10 saiu: o prazo entre folgas que o AE não escreve não é avaliado', run('cabin', pattern(6, 2, 3)).rules.some((r) => r.id === 'C10'), false);
  const fifth = (on) => { const p = pattern(5, 2, 1); p['2026-04-10'] = F('08:00', '08:30', on, 2, 'LIS-OPO-LIS'); return p; };
  ok('C11 5.º dia com calços às 17h40 (término 18h10) → excede', has(run('cabin', fifth('17:40')), 'C11', 'quinto-dia-18h'));
  ok('C11 5.º dia com calços às 17h25 (término 17h55) → dentro', !has(run('cabin', fifth('17:25')), 'C11', 'quinto-dia-18h'));
}

// C14 — 13 folgas semanais por trimestre (1.º trimestre de 2026, 90 dias).
{
  const D = () => F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS');
  const quarter = (vacDays, freePairs) => {
    const duties = {}, events = [];
    const q = days('2026-01-01', 90);
    const free = new Set(), vac = new Set(vacDays);
    freePairs.forEach((d) => { free.add(q[d - 1]); free.add(q[d]); });
    q.forEach((iso, i) => { if (vac.has(i + 1)) events.push({ date: iso, type: 'vacDays' }); else if (!free.has(iso)) duties[iso] = D(); });
    return run('cabin', duties, { events, today: '2026-06-01' });
  };
  const pairs11 = [17, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84];                 // 11 blocos de 2 dias livres (64 h → 1 folga cada)
  const vac14 = Array.from({ length: 14 }, (_, i) => i + 2);                       // férias de 2 a 15 de janeiro (14 dias → 2 folgas)
  const q1 = rule(quarter(vac14, pairs11), 'C14').findings.find((f) => f.period === '2026-T1');
  eq('C14 11 folgas + 14 dias de férias = 13 → dentro', q1 && [q1.folgas, q1.absenceDays, q1.value, q1.status], [11, 14, 13, 'dentro']);
  const vac7 = Array.from({ length: 7 }, (_, i) => i + 2);
  const q1b = rule(quarter(vac7, pairs11), 'C14').findings.find((f) => f.period === '2026-T1');
  eq('C14 11 folgas + 7 dias de férias = 12 → excede', q1b && [q1b.value, q1b.status], [12, 'excede']);
}

// C34 — voo por mês de calendário e serviço por 7 dias (cabine).
{
  const march = Object.fromEntries(days('2026-03-01', 16).map((d) => [d, F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS', { flight_minutes: 360 })]));
  ok('C34 março com 16 × 6 h = 96 h de voo → excede (95 h)', rule(run('cabin', march), 'C34').findings.some((f) => f.window === 'mes-voo' && f.value === 5760));
  const week = Object.fromEntries(days('2026-04-06', 7).map((d) => [d, F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS')]));   // PSV 08h00→16h00 = 8 h
  ok('C34 7 dias × 8 h = 56 h de serviço → excede (55 h)', rule(run('cabin', week), 'C34').findings.some((f) => f.window === '7d-servico' && f.value === 3360));
}

// ── LONGO CURSO (v2) ─────────────────────────────────────────────────────────────────────────────
// Voos com a hora UTC de cada perna (como a escala importada). Inverno de 2026: Lisboa = UTC+0, logo a
// hora da escala (a do telemóvel, em Lisboa) é a UTC. GRU = UTC−3 (zona geográfica −3; Lisboa −1);
// EWR = UTC−5 (zona −5); SFO = UTC−8 (zona −8).
// FZ(apresentação, [[partida, chegada, off, on, offZ?, onZ?], …]) — sem Z, Z = a hora da escala (inverno).
const FZ = (rep, legs, extra = {}) => ({
  kind: 'flight', report_time: rep, block_off: legs[0][2], block_on: legs[legs.length - 1][3], sectors: legs.length,
  route: [legs[0][0], ...legs.map((l) => l[1])].join('-'), flight_minutes: 60,
  legs: legs.map(([dep, arr, off, on, offZ, onZ]) => ({ dep, arr, off, on, offZ: offZ || off, onZ: onZ || on })), ...extra,
});
const fdp = (res, id, date) => rule(res, id).findings.find((f) => f.date === date) || null;
const LISGRU = () => FZ('22:00', [['LIS', 'GRU', '23:15', '09:45']]);   // TSV 22h00 → 10h15 = 12h15; block 10h30
const GRULIS = () => FZ('19:45', [['GRU', 'LIS', '21:00', '06:30']]);   // 16h45 em GRU; TSV → 07h00 = 11h15; block 9h30
const LISEWR = () => FZ('10:00', [['LIS', 'EWR', '11:00', '19:00']]);   // chega às 14h00 de EWR; TSV 9h30; block 8 h
const EWRLIS = (rep, off, on) => FZ(rep, [['EWR', 'LIS', off, on]]);

// O modelo de horas: com a hora UTC, a escala pode vir na hora local de cada escala — o motor usa a UTC.
{
  const s = svc1(FZ('22:00', [['LIS', 'GRU', '23:15', '06:45', '23:15', '09:45']]), 'cabin', '2026-01-12');
  eq('UTC: chegada às 06h45 de GRU = 09h45 de Lisboa (a hora da base)', [s.end - L.dayNum('2026-01-12') * 1440, s.workEnd - s.start, s.legs[0].block], [33 * 60 + 45, 735, 630]);
  const v = svc1(FZ('09:00', [['LIS', 'GRU', '10:00', '20:00', '09:00', '19:00']]), 'cabin', '2026-07-06');
  eq('UTC no verão (Lisboa = UTC+1): as horas ficam as de Lisboa', [v.start % 1440, v.end % 1440, v.bo], [540, 1200, 60]);
  eq('hora local em GRU (UTC−3) na apresentação de verão = 05h00', L.localAt(v, 'GRU', v.start) % 1440, 300);
  eq('zona geográfica: Lisboa −1, GRU −3, EWR −5, SFO −8', ['LIS', 'GRU', 'EWR', 'SFO'].map(L.zoneOf), [-1, -3, -5, -8]);
}

// P32 — pilotos, Cl. 43.ª. Apresentação às 22h00 em Lisboa (na base: aclimatizado): 1 aterragem → 11h30.
{
  const at = (fleet) => fdp(run('pilot', { '2026-01-12': LISGRU() }, { fleetAt: () => fleet }), 'P32', '2026-01-12');
  eq('P32 22h00 na base, 1 aterragem: 11h30 (690); TSV 12h15 (735)', [at('NB').limit, at('NB').value], [690, 735]);
  eq('P32 num narrow-body não há reforço (Cl. 42.ª, n.º 2) → excede', at('NB').status, 'excede');
  eq('P32 wide-body: pode ter reforço (até +5 h) → incerto', [at('WB').status, at('WB').reason], ['incerto', 'pode-ter-reforco']);
  eq('P32 frota desconhecida: também incerto', at(null).status, 'incerto');
  // Regresso de GRU: 2 zonas da base (Lisboa −1, GRU −3) → aclimatizado pela alínea c); 16h45 local → 11h45.
  const r = run('pilot', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS() }, { fleetAt: () => 'NB' });
  const g = fdp(r, 'P32', '2026-01-14');
  eq('P32 GRU→LIS: aclimatizado (alínea c); zonas da Cl. 6.ª, n.º 53), 16h45 local → 11h45; TSV 11h15 → dentro', g && [g.readings.map((x) => x.accl), g.limit, g.value, g.status], [[true], 705, 675, 'dentro']);
  // EWR (4 zonas): estadia de 27h30 → não aclimatizado; 18h00 local → 10h00; TSV 10h50 → excede no narrow-body.
  const e = fdp(run('pilot', { '2026-01-12': LISEWR(), '2026-01-13': EWRLIS('23:00', '00:00', '09:20') }, { fleetAt: () => 'NB' }), 'P32', '2026-01-13');
  eq('P32 EWR→LIS ao fim de 27h30: não aclimatizado, 10h00; TSV 10h50 → excede', e && [e.readings.map((x) => x.accl), e.limit, e.value, e.status], [[false], 600, 650, 'excede']);
  // Estadia de 75h30 com 3 noites locais, mas as últimas 36 h só têm uma noite inteira: as duas leituras da alínea b).
  const b = fdp(run('pilot', { '2026-01-12': LISEWR(), '2026-01-15': EWRLIS('23:00', '00:00', '09:20') }, { fleetAt: () => 'NB' }), 'P32', '2026-01-15');
  eq('P32 alínea b) com duas leituras: 11h45 aclimatizado, 10h00 não → TSV 10h50 incerto', b && [b.readings.map((x) => x.accl), b.limit, b.limitMax, b.status, b.reason], [[true, false], 600, 705, 'incerto', 'aclimatizacao']);
}

// P49 — repouso no longo curso (Cl. 41.ª). Em EWR depois de LIS→EWR: chegada às 14h00 locais (a fronteira do c)).
{
  const r = (on) => rule(run('pilot', { '2026-01-12': LISEWR(), '2026-01-13': EWRLIS('23:00', on, '09:20') }), 'P49').findings[0];
  const f = r('00:00');
  // leve: 11 h + 2 zonas acima de 2 (geográficas: 4) = 13 h → mínimo do n.º 2 a) com 4 zonas: 14h30;
  // estrita: 11 h + 3 h (chegada às 14h00 conta) + 3 h (5 h legais) = 17 h. Mais 3 h de transição fora da base.
  eq('P49 EWR: repouso 14h30 (leitura leve) e 17h00 (estrita), mais 3 h', [f.rest, f.restStr, f.limit, f.limitStr], [870, 1020, 1050, 1200]);
  eq('P49 29 h entre calços e saída: chega nas duas leituras, falta o transporte → incerto', [f.value, f.status, f.reason], [1740, 'incerto', 'sem-transporte']);
  const short = rule(run('pilot', { '2026-01-12': LISEWR(), '2026-01-13': EWRLIS('08:00', '09:00', '17:00') }), 'P49').findings[0];
  eq('P49 14 h entre calços e saída < 17h30 → excede', [short.value, short.status], [840, 'excede']);
  const mid = rule(run('pilot', { '2026-01-12': LISEWR(), '2026-01-13': EWRLIS('12:30', '13:30', '21:00') }), 'P49').findings[0];
  eq('P49 18h30: cabe na leitura leve (17h30) e não na estrita (20h00) → incerto', [mid.value, mid.status, mid.reason], [1110, 'incerto', 'leituras']);
  // GRU depois de LIS→GRU: TSV 12h15 (+3), apresentação às 22h00 (+3), chegada às 06h45 locais (+3), block 10h30 (+12).
  const g = rule(run('pilot', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS() }), 'P49').findings[0];
  eq('P49 GRU: 11 h + 21 h = 32 h (leve); 12h15 + 21 h + 1 h (3 h legais) = 34h15 (estrita)', [g.rest, g.restStr], [1920, 2055]);
  eq('P49 GRU: 35h15 entre calços e saída → entre as duas leituras → incerto', [g.value, g.status, g.reason], [2115, 'incerto', 'leituras']);
}

// P36 — rotações; P39 — a noite antes do longo curso.
{
  const mh = (n) => rule(run('pilot', { '2026-03-02': F('08:00', '08:30', '10:00', 1, 'LIS-OPO'), [L.isoOf(L.dayNum('2026-03-02') + n - 1)]: F('08:00', '08:30', '10:00', 1, 'OPO-LIS') }), 'P36').findings[0];
  eq('P36 médio curso de 6 dias → dentro', mh(6).status, 'dentro');
  eq('P36 médio curso de 7 dias: só por irregularidade (Cl. 33.ª, n.º 2) → incerto', [mh(7).status, mh(7).reason], ['incerto', 'irregularidade']);
  eq('P36 médio curso de 8 dias → excede', mh(8).status, 'excede');
  const lc = rule(run('pilot', { '2026-01-12': LISGRU(), '2026-01-22': GRULIS() }), 'P36').findings[0];
  eq('P36 longo curso de 12 dias (12 → 23 jan) → excede (máx. 11)', [lc.value, lc.status], [12, 'excede']);
  // 11 rotações de 10 dias em 52 semanas → excede o limite anual de 10 (Cl. 39.ª, n.º 4).
  const many = {};
  for (let k = 0; k < 11; k++) { const d = L.dayNum('2026-01-05') + k * 14; many[L.isoOf(d)] = LISGRU(); many[L.isoOf(d + 8)] = GRULIS(); }
  const an = rule(run('pilot', many), 'P36').findings.find((f) => f.reason === 'dez-dias-ano');
  eq('P36 11 rotações de 10 dias em 52 semanas → excede (máx. 10)', an && [an.value, an.status], [11, 'excede']);
  // P39: o LIS→GRU às 22h00 toca o trabalho noturno → livre até às 10h00 desse dia.
  const p39 = (other) => rule(run('pilot', { '2026-01-12': { ...LISGRU(), extra: other ? [other] : [] } }), 'P39').findings[0];
  eq('P39 sem nada antes → dentro', p39(null).status, 'dentro');
  eq('P39 com um serviço no solo das 07h00 às 09h00 → excede', p39(S('office', '07:00', '09:00')).status, 'excede');
  const eve = rule(run('pilot', { '2026-01-11': F('20:00', '20:30', '22:00', 1, 'OPO-LIS'), '2026-01-12': LISGRU() }), 'P39').findings[0];
  eq('P39 com trabalho na véspera até às 22h30: o AE não diz quando começa a noite → incerto', [eve.status, eve.reason], ['incerto', 'trabalho-na-vespera']);
}

// C26 — cabine, Cl. 23.ª. Na base às 22h00: 1 aterragem → 11h30.
{
  const a = fdp(run('cabin', { '2026-01-12': LISGRU() }), 'C26', '2026-01-12');
  eq('C26 22h00, 1 aterragem: 11h30; PSV 12h15 → pode ter descanso a bordo (até 16h30) → incerto', [a.limit, a.value, a.status, a.reason], [690, 735, 'incerto', 'pode-ter-ldmcr']);
  const long = fdp(run('cabin', { '2026-01-12': FZ('08:00', [['LIS', 'SFO', '09:00', '00:00']]) }), 'C26', '2026-01-12');
  eq('C26 PSV de 16h30 (08h00 → 00h30) → ainda incerto', long.status, 'incerto');
  const vlong = fdp(run('cabin', { '2026-01-12': FZ('08:00', [['LIS', 'SFO', '09:00', '00:10']]) }), 'C26', '2026-01-12');
  eq('C26 PSV de 16h40 → excede (o quadro do n.º 11 acaba nas 16h30)', vlong.status, 'excede');
  const two = fdp(run('cabin', { '2026-01-12': FZ('10:00', [['LIS', 'FOR', '11:00', '18:00'], ['FOR', 'BEL', '19:00', '23:50']]) }), 'C26', '2026-01-12');
  eq('C26 2 setores acima do quadro (14h20 > 13h15) → excede (n.º 10)', [two.limit, two.value, two.status], [795, 860, 'excede']);
  // Regresso de EWR (5 h): até às 47h59 vale a hora de referência (Lisboa); depois, o quadro do n.º 4 ("4, 5 e 6").
  const ewr = (date, on) => fdp(run('cabin', { '2026-01-12': LISEWR(), [date]: EWRLIS('23:00', '00:00', on) }), 'C26', date);
  const d2 = ewr('2026-01-13', '09:20');
  eq('C26 EWR ao fim de 37 h: aclimatizado a Lisboa (23h00 → 11h30); PSV 10h50 → dentro', d2 && [d2.readings[0].accl, d2.limit, d2.status], [true, 690, 'dentro']);
  const d3 = ewr('2026-01-14', '09:20');
  eq('C26 EWR ao fim de 61 h (48–71h59): não aclimatizado → 11h00 (n.º 5); PSV 10h50 → dentro', d3 && [d3.readings[0].accl, d3.limit, d3.status], [false, 660, 'dentro']);
  const d3b = ewr('2026-01-14', '10:00');
  eq('C26 não aclimatizado, PSV 11h30 com 1 setor → incerto (pode ter descanso a bordo)', d3b && [d3b.status, d3b.reason], ['incerto', 'pode-ter-ldmcr']);
  const d4 = ewr('2026-01-15', '09:20');
  eq('C26 EWR ao fim de 85 h (depois das 72 h): aclimatizado à hora local (18h00 → 11h45)', d4 && [d4.readings[0].accl, d4.limit, d4.status], [true, 705, 'dentro']);
  // Verão: Lisboa UTC+1, GRU UTC−3 → 4 h de diferença: o "4" está em duas linhas do quadro → duas leituras.
  const sum = (on, onZ) => fdp(run('cabin', {
    '2026-07-06': FZ('22:00', [['LIS', 'GRU', '23:15', '09:45', '22:15', '08:45']]),
    '2026-07-09': FZ('21:00', [['GRU', 'LIS', '22:00', on, '21:00', onZ]]),   // 17h00 em GRU; ao fim de 71 h da apresentação
  }), 'C26', '2026-07-09');
  const s1 = sum('08:50', '07:50');
  eq('C26 4 h de diferença: duas leituras (aclimatizado a GRU 11h45 / não aclimatizado 11h00); PSV 12h20 → incerto', s1 && [s1.readings.map((x) => x.accl), s1.limit, s1.limitMax, s1.value, s1.status], [[true, false], 660, 705, 740, 'incerto']);
  const s2 = sum('07:00', '06:00');
  eq('C26 4 h, PSV 10h30 → dentro nas duas', s2 && s2.status, 'dentro');
}

// C41 — repouso no longo curso (cabine, Cl. 29.ª, n.os 8 a 10).
{
  const r = (rep, off, on) => rule(run('cabin', { '2026-01-12': LISEWR(), '2026-01-13': EWRLIS(rep, off, on) }), 'C41').findings[0];
  const f = r('23:00', '00:00', '09:20');
  // EWR, 5 h: max(9h30, 14 h + 2 × 30 min) = 15 h (leve) · 14 h + 3 × 30 min = 15h30 (estrita); + 3 h fora.
  eq('C41 EWR (5 h): repouso 15h00 / 15h30, mais 3 h', [f.rest, f.restStr, f.limit, f.limitStr], [900, 930, 1080, 1110]);
  eq('C41 29 h: falta o transporte → incerto', [f.status, f.reason], ['incerto', 'sem-transporte']);
  eq('C41 14h30 → excede', r('08:30', '09:30', '17:00').status, 'excede');
  eq('C41 18h10: entre 18h00 e 18h30 → incerto (a 3.ª hora conta ou não)', [r('12:10', '13:10', '20:00').status, r('12:10', '13:10', '20:00').reason], ['incerto', 'leituras']);
  // SFO (8 h): 24 h com uma noite local (n.º 9) e 36 h com duas noites locais de calços a calços (n.º 10).
  const sfo = (rep, off, on) => rule(run('cabin', { '2026-01-12': FZ('10:00', [['LIS', 'SFO', '11:00', '23:00']]), '2026-01-14': FZ(rep, [['SFO', 'LIS', off, on]]) }), 'C41').findings[0];
  const ok46 = sfo('20:00', '21:00', '08:00');                   // saída às 13h00 de SFO: 46 h depois dos calços, 2 noites
  eq('C41 SFO: saída 46 h depois, com duas noites locais → só falta o transporte', [ok46.status, ok46.reason], ['incerto', 'sem-transporte']);
  const n2 = sfo('12:00', '13:00', '00:00');                     // saída às 05h00 de SFO: 38 h, mas a 2.ª noite só tem 7 h
  eq('C41 SFO: 38 h mas a 2.ª noite local tem só 7 h → excede (n.º 10)', [n2.status, n2.reason], ['excede', '36h-duas-noites']);
}

// C15 — folga (e RAD) no regresso à base (Cl. 20.ª, n.os 3, 13 e 14; Cl. 30.ª).
{
  // LIS→GRU→LIS: block de 10h30 → RAD de 24 h (Cl. 30.ª, n.º 2 a)) → 48 h + 24 h = 72 h de folga.
  // Calços 06h30 de 15 jan; repouso 12 h (PSV com RAD) + 2 h (toca as 2h00–5h59) + 2 h de transição → 22h30 → a folga começa às 23h00.
  const c = (nextDate, rep) => rule(run('cabin', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS(), [nextDate]: F(rep, '08:00', '12:00', 2, 'LIS-OPO-LIS') }), 'C15').findings[0];
  const okc = c('2026-01-19', '06:00');
  eq('C15 GRU: folga 48 h + RAD 24 h, a contar das 23h00 → 79 h até à apresentação → dentro', okc && [okc.folga, okc.rad, okc.limit, okc.value, okc.status], [2880, 1440, 4320, 4740, 'dentro']);
  eq('C15 GRU: apresentação às 20h00 de 18 jan (69 h) → excede', c('2026-01-18', '20:00').status, 'excede');
  const mid = c('2026-01-18', '23:30');
  eq('C15 GRU: 72h30 pela leitura leve, 71h30 pela estrita (repouso 13 h, folga às 00h00) → incerto', mid && [mid.value, mid.status], [4350, 'incerto']);
  // LIS→SFO→LIS: 8 h de diferença → duas folgas seguidas (96 h), sem RAD (n.º 16).
  const sf = rule(run('cabin', { '2026-01-12': FZ('10:00', [['LIS', 'SFO', '11:00', '23:00']]), '2026-01-14': FZ('20:00', [['SFO', 'LIS', '21:00', '08:00']]), '2026-01-18': F('08:00', '08:30', '12:00', 2, 'LIS-OPO-LIS') }), 'C15').findings[0];
  eq('C15 SFO: 96 h e sem RAD; a apresentação ao fim de ~2 dias e meio → excede', sf && [sf.folga, sf.rad, sf.reason, sf.status], [5760, 0, '96h', 'excede']);
  // Médio curso com 4 aterragens (n.º 13 a)): folga de 48 h logo no regresso.
  const four = rule(run('cabin', { '2026-03-02': F('06:00', '06:30', '15:00', 4, 'LIS-OPO-LIS-FAO-LIS'), '2026-03-04': F('08:00', '08:30', '12:00', 2, 'LIS-OPO-LIS') }), 'C15').findings[0];
  eq('C15 4 aterragens: a folga começa às 06h00 de 3 mar → 26 h até à apresentação → excede', four && [four.reason, four.value, four.status], ['quatro-aterragens', 1560, 'excede']);
}

// P22 — pilotos, Cl. 38.ª: dias de folga seguidos depois do longo curso.
{
  // LIS→GRU→LIS: 4 dias de ocupação (12 a 15 jan) + 2 períodos críticos + 0 × 45° = 6 → 3 dias de folga.
  // Calços 06h30 de 15 jan + repouso da Cl. 41.ª (18 h leve / 19 h estrita) + 2 h → a folga começa às 03h00 (leve) ou 04h00 (estrita) de 16 jan.
  const g = (date, rep) => rule(run('pilot', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS(), [date]: F(rep, '03:00', '05:00', 2, 'LIS-OPO-LIS') }), 'P22').findings[0];
  const ok22 = g('2026-01-19', '08:00');
  eq('P22 GRU: fatores 4 + 2 + 0 → 3 dias; a contar das 03h00 de 16 jan → 77 h → dentro', ok22 && [ok22.factors, ok22.days, ok22.value, ok22.status], [{ a: 4, b: 2, c: 0 }, 3, 4620, 'dentro']);
  eq('P22 GRU: serviço às 02h00 de 19 jan (71 h < 72 h) → excede', g('2026-01-19', '02:00').status, 'excede');
  const mid = g('2026-01-19', '03:30');
  eq('P22 GRU: 03h30 de 19 jan: 72h30 na leitura leve, 71h30 na estrita → incerto', mid && [mid.value, mid.status], [4350, 'incerto']);
  // LIS→EWR→LIS: 5 dias + 1 período crítico (na hora local, passadas 48 h e 4 zonas) + 1 × 45° (65°) = 7 → 4 dias.
  const e = rule(run('pilot', { '2026-01-12': LISEWR(), '2026-01-15': EWRLIS('23:00', '00:00', '09:20'), '2026-01-25': F('08:00', '08:30', '10:00', 2, 'LIS-OPO-LIS') }), 'P22').findings[0];
  eq('P22 EWR: fatores 5 + 1 + 1 → 4 dias de folga', e && [e.factors, e.days], [{ a: 5, b: 1, c: 1 }, 4]);
}

// P38 — pilotos, Cl. 39.ª, n.º 2: de SFO (zona −8) a LAD (zona +1) são 9 h → 6 dias de folga entre as rotações.
{
  // Depois de SFO→LIS (calços 08h00 de 15 jan): repouso da Cl. 41.ª 35 h (leve) / 36h30 (estrita) + 2 h → folga às 21h00 / 23h00 de 16 jan.
  const sfo = { '2026-01-12': FZ('10:00', [['LIS', 'SFO', '11:00', '23:00']]), '2026-01-14': FZ('20:00', [['SFO', 'LIS', '21:00', '08:00']]) };
  const lad = (date, rep, off, on) => ({ [date]: FZ(rep, [['LIS', 'LAD', off, on]]), [L.isoOf(L.dayNum(date) + 3)]: FZ('20:00', [['LAD', 'LIS', '21:00', '04:30']]) });
  const r = (date, rep, off, on) => rule(run('pilot', { ...sfo, ...lad(date, rep, off, on) }), 'P38').findings[0];
  const a = r('2026-01-22', '10:00', '11:00', '18:00');
  eq('P38 SFO→LAD: 9 h de diferença; 5 dias de folga (133 h) → excede', a && [a.diff, a.value, a.status], [9, 5, 'excede']);
  eq('P38 com 6 dias (157 h / 155 h) → dentro', r('2026-01-23', '10:00', '11:00', '18:00').status, 'dentro');
  const m = r('2026-01-22', '22:00', '23:00', '06:00');
  eq('P38 6 dias na leitura leve (145 h), 5 na estrita (143 h) → incerto', m && [m.value, m.valueStr, m.status], [6, 5, 'incerto']);
}

// P33 — pilotos, Cl. 42.ª, n.º 4: 20 h de acréscimos com reforço em 4 semanas.
{
  // LIS→SFO às 08h00 num wide-body: quadro 13h15; TSV 17h45 → 4h30 acima, só com reforço (até +5 h).
  const long = () => FZ('08:00', [['LIS', 'SFO', '09:00', '01:15']]);
  const mk = (n) => Object.fromEntries(Array.from({ length: n }, (_, k) => [L.isoOf(L.dayNum('2026-02-02') + 4 * k), long()]));
  const five = rule(run('pilot', mk(5), { fleetAt: () => 'WB' }), 'P33');
  eq('P33 5 × 4h30 = 22h30 de acréscimos em 4 semanas → excede (máx. 20 h)', [five.status, (five.findings[0] || {}).value], ['excede', 1350]);
  eq('P33 4 × 4h30 = 18 h → dentro', rule(run('pilot', mk(4), { fleetAt: () => 'WB' }), 'P33').status, 'dentro');
  ok('P33 sem serviços acima do quadro, a regra não aparece', !run('pilot', { '2026-01-12': LISEWR() }).rules.some((x) => x.id === 'P33'));
}

// P37 — pilotos, Cl. 39.ª, n.º 1: no máximo 8 rotações no Atlântico Norte em 2 meses de calendário.
{
  const ewr = (n) => { const o = {}; for (let k = 0; k < n; k++) { const d = L.dayNum('2026-01-05') + 6 * k; o[L.isoOf(d)] = LISEWR(); o[L.isoOf(d + 1)] = EWRLIS('23:00', '00:00', '09:20'); } return o; };
  const w = (res) => rule(res, 'P37').findings.find((f) => f.period === '2026-01');
  const nine = w(run('pilot', ewr(9)));
  eq('P37 9 rotações a EWR em jan–fev → excede (máx. 8)', nine && [nine.value, nine.status], [9, 'excede']);
  eq('P37 8 rotações a EWR → dentro', w(run('pilot', ewr(8))).status, 'dentro');
  const puj = { ...ewr(8), '2026-02-25': FZ('10:00', [['LIS', 'PUJ', '11:00', '20:00']]), '2026-02-26': FZ('22:00', [['PUJ', 'LIS', '23:00', '07:00']]) };
  const p = w(run('pilot', puj));
  eq('P37 8 a EWR + 1 a Punta Cana (pode ou não passar pelo Atlântico Norte da ICAO) → incerto', p && [p.value, p.valueStr, p.status], [8, 9, 'incerto']);
  ok('P37 rotações ao Brasil não contam', !run('pilot', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS() }).rules.some((x) => x.id === 'P37'));
}

// Trabalho noturno na "hora local" de cada AE (v2).
{
  // Pilotos, Cl. 6.ª, n.º 14: SFO→LIS a 15 jan, mais de 48 h depois de sair de Lisboa → hora de origem (SFO).
  // 16h00→03h30 de Lisboa = 08h00→19h30 de SFO: não é noturno. Na hora da base seriam 3 noturnos seguidos (15, 16, 17).
  const N = () => F('20:00', '20:30', '23:10', 2, 'LIS-OPO-LIS');
  const res = run('pilot', { '2026-01-12': FZ('10:00', [['LIS', 'SFO', '11:00', '23:00']]), '2026-01-15': FZ('16:00', [['SFO', 'LIS', '17:00', '03:00']]), '2026-01-16': N(), '2026-01-17': N() });
  ok('P53 SFO→LIS depois de 48 h conta na hora de origem (não é noturno) → sem "3 seguidos"', !rule(res, 'P53').findings.some((f) => f.reason === 'tres-seguidos'));
  // Cabine, Cl. 4.ª, n.º 13: LIS→SFO 10h00→23h30 de Lisboa = 02h00→15h30 de SFO (toca as 2h00–5h59 só na hora de chegada);
  // SFO→LIS 12h00→00h30 = 04h00→16h30 de SFO. Os dois críticos só numa leitura da hora local → "incerto", nunca "excede".
  const cab = rule(run('cabin', { '2026-01-12': FZ('10:00', [['LIS', 'SFO', '11:00', '23:00']]), '2026-01-14': FZ('12:00', [['SFO', 'LIS', '13:00', '00:00']]) }), 'C36').findings;
  const loc = cab.find((f) => f.reason === 'dois-criticos');
  eq('C36 dois críticos só na hora de chegada → incerto pela hora local', loc && [loc.status, loc.hora], ['incerto', 'local']);
  const T = require(path.resolve('data/tapLimitsText.js'));
  eq('frase: "conforme a hora local"', loc && T.describe('C36', loc, 'pt').say, '2 noturnos a tocar as 2h00–5h59, conforme a hora local');
  // Ida e volta a GRU (16/18): os dois tocam o período crítico nas duas leituras; a dúvida é "consecutivos".
  const gru = rule(run('cabin', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS() }), 'C36').findings.find((f) => f.reason === 'dois-criticos');
  eq('C36 ida e volta a GRU: incerto porque o AE não define "consecutivos"', gru && [gru.status, gru.hora || null, T.describe('C36', gru, 'pt').say],
    ['incerto', null, '2 noturnos a tocar as 2h00–5h59, sem outro serviço pelo meio mas em noites diferentes: o AE não diz se contam como seguidos']);
}

// fdpForDuty (o detalhe do serviço e o Início): o mesmo resultado que a avaliação do mês.
{
  const duties = { '2026-01-12': LISEWR(), '2026-01-13': EWRLIS('23:00', '00:00', '09:20') };
  const x = L.fdpForDuty({ duties, date: '2026-01-13', crewType: 'pilot', baseAt: 'LIS', fleetAt: 'NB' });
  eq('fdpForDuty: o EWR→LIS dá o mesmo que o motor (10h00, excede)', x && [x.fdp.limit, x.fdp.status, x.next], [600, 'excede', null]);
}

// Vigência e companhia de cada mês: só os serviços da TAP, a partir da entrada em vigor do RUPT.
{
  const D = () => F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS');
  const old = run('pilot', { '2023-06-26': D(), '2023-06-27': D(), '2023-06-28': D(), '2023-06-29': D(), '2023-06-30': D() });
  eq('antes de 1 jul 2023 (Cl. 49.ª) o RUPT dos pilotos não se aplica', old.rules.length, 0);
  const notTap = run('cabin', { '2026-04-06': S('standby_home', '06:00', '15:00') }, { isTapAt: () => false });
  eq('meses noutra companhia (linha do tempo do contrato) ficam de fora', notTap.rules.length, 0);
}

// ── Parte 3 — as frases dos ecrãs (data/tapLimitsText.js): os números vêm do motor ──
{
  const T = require(path.resolve('data/tapLimitsText.js'));
  eq('frase: 84 h formata sem casas', T.fmtHours(5040, 'pt'), '84 h');
  eq('frase: 84,1 h em pt e 84.1 h em en', [T.fmtHours(5046, 'pt'), T.fmtHours(5046, 'en')], ['84,1 h', '84.1 h']);
  // Auditoria A-136: 90:01 de voo em 28 dias com o estado Excede não pode ler-se "90 h (máx. 90 h)".
  eq('frase: excesso de 1 min mostra h:mm', T.describe('P25', { status: 'excede', value: 5401, limit: 5400, window: '28d' }, 'pt').say.includes('90:01'), true);
  eq('frase: sem excesso fica em horas', T.describe('P25', { status: 'dentro', value: 5040, limit: 5400, window: '28d' }, 'pt').say.includes('84 h'), true);
  eq('frase: dia da semana', T.fmtDay('2026-11-02', 'pt'), 'seg 2 nov');
  eq('frase: trimestre', T.windowLabel({ window: 'trimestre', period: '2026-T4' }, 'pt'), 'Trimestre (out–dez)');
  const N = () => F('20:00', '20:30', '23:10', 2, 'LIS-OPO-LIS');
  const D = () => F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS');
  const res = run('pilot', { '2026-11-02': N(), '2026-11-03': D(), '2026-11-04': N(), '2026-11-05': D(), '2026-11-06': N() });
  const g = T.groupRules(res, '2026-11-01');
  const night = g.excede.find((x) => x.id === 'P53');
  ok('grupos: o trabalho noturno fica em Excede', !!night);
  eq('frase do noturno (o exemplo do esboço)', night && T.describe('P53', night.lead, 'pt'), { say: '3 serviços noturnos em 7 dias, sem descanso semanal pelo meio', det: 'seg 2 nov, qua 4 nov e sex 6 nov' });
  ok('grupos: o tempo de voo fica em Dentro, com o valor de hoje', g.dentro.some((x) => x.id === 'P25'));
  const p27 = fdpLimitFor(svc1(F('06:30', '07:15', '17:10', 2, 'LIS-OPO-LIS'), 'pilot'), 'pilot');
  eq('frase do PSV (calços até às 17:00)', T.describe('P27', { date: '2026-03-02', ...p27 }, 'pt').det, 'Contado até 30 min depois dos calços. Calços até às 17:00.');
  ok('o "incerto" da v1 (longo curso) não é um problema da escala', !T.isProblem({ status: 'incerto', reason: 'longo-curso' }) && T.isProblem({ status: 'incerto', reason: 'sem-transporte' }));
  ok('cada regra tem o seu resumo do que o AE pede', TAP_RULES.every((r) => T.plainFor(r.id, 'pt') && T.plainFor(r.id, 'en')));
  // A próxima saída de calços (detalhe do serviço): calços 16h20, TSV 06h30→16h50 = 10h20 → 12 h + 4 h → 08h20 do dia seguinte.
  const nx = L.nextOffBlockAfter(svc1(F('06:30', '07:15', '16:20', 2, 'LIS-OPO-LIS'), 'pilot'), 'pilot');
  eq('próxima saída de calços: 08:20 do dia seguinte', [T.fmtClock(nx.at), Math.floor(nx.at / 1440) - L.dayNum('2026-03-02')], ['08:20', 1]);

  // O que não se consegue avaliar fica à vista ("Ainda não avaliado"), nunca em silêncio nem como "Incerto":
  // longo curso SEM a hora UTC dos voos (não se sabe a hora local).
  const lc = run('pilot', { '2026-03-02': F('10:00', '11:00', '19:00', 1, 'LIS-JFK'), '2026-03-05': F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS') });
  const gl = T.groupRules(lc, '2026-03-01');
  eq('longo curso sem UTC: 1 serviço em "Ainda não avaliado"', gl.pendente.semFuso, 1);
  ok('longo curso sem UTC: não entra no grupo Incerto', !gl.incerto.some((x) => x.id === 'P32' || x.id === 'P27'));
  // Cabine com 5 aterragens: o AE não tem coluna → o resumo diz que fica só pela regra europeia.
  const c5 = run('cabin', { '2026-04-06': F('09:00', '09:40', '18:00', 5, 'LIS-OPO-LIS-FAO-LIS-OPO'), '2026-04-08': F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS') });
  const c23 = T.groupRules(c5, '2026-04-01').dentro.find((x) => x.id === 'C23');
  eq('5 aterragens (cabine): "1 serviço · 1 só pela regra europeia"', c23 && T.summaryFor(c23.rule, 'pt'), '1 serviço · 1 só pela regra europeia');

  // Longo curso COM a hora UTC: avalia-se (sai de "Ainda não avaliado") e as frases dizem o número e porquê.
  const lh = run('pilot', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS() }, { fleetAt: () => 'NB', today: '2026-01-01' });
  const glh = T.groupRules(lh, '2026-01-01');
  eq('longo curso com UTC: nada em "Ainda não avaliado"', glh.pendente.semFuso, 0);
  const p32 = glh.excede.find((x) => x.id === 'P32');
  eq('frase do P32 (narrow-body, 12h15 > 11h30)', p32 && T.describe('P32', p32.lead, 'pt'), { say: 'Serviço de voo de seg 12 jan: 12:15 (o AE permite 11:30)', det: 'Longo curso, aclimatizado. Calços até às 09:00.' });
  const wb = T.groupRules(run('pilot', { '2026-01-12': LISGRU() }, { fleetAt: () => 'WB', today: '2026-01-01' }), '2026-01-01').incerto.find((x) => x.id === 'P32');
  eq('frase do P32 com possível reforço', wb && T.describe('P32', wb.lead, 'pt').det, 'Só cabe com tripulação reforçada (Cl. 42.ª), que a escala não mostra.');
  const c15 = T.groupRules(run('cabin', { '2026-01-12': LISGRU(), '2026-01-14': GRULIS(), '2026-01-18': F('20:00', '21:00', '23:00', 2, 'LIS-OPO-LIS') }, { today: '2026-01-01' }), '2026-01-01').excede.find((x) => x.id === 'C15');
  eq('frase da folga depois do longo curso', c15 && T.describe('C15', c15.lead, 'pt'), { say: 'Folga curta depois do serviço de qua 14 jan: 69 h livres (o AE pede 72 h)', det: 'Folga de 48 h + RAD de 24 h, a contar das 23:00 de qui 15 jan.' });
  const p39 = T.groupRules(run('pilot', { '2026-01-11': F('20:00', '20:30', '22:00', 1, 'OPO-LIS'), '2026-01-12': LISGRU() }, { today: '2026-01-01' }), '2026-01-01').incerto.find((x) => x.id === 'P39');
  eq('frase da noite antes do longo curso', p39 && T.describe('P39', p39.lead, 'pt').say, 'Trabalho na véspera do longo curso noturno de seg 12 jan');
  ok('as regras do longo curso só aparecem quando há longo curso', !run('pilot', { '2026-03-02': F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS') }).rules.some((r) => ['P32', 'P39', 'P49'].includes(r.id)));
}

// C14 — o trimestre em curso avalia-se PELA ESCALA PUBLICADA quando ela cobre o trimestre todo.
{
  const D = () => F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS');
  const duties = {};
  const q = days('2026-04-01', 91);                                        // 2.º trimestre: 1 abr – 30 jun
  const free = new Set();
  [6, 13, 20, 27, 34, 41, 48, 55, 62, 69, 76].forEach((d) => { free.add(q[d - 1]); free.add(q[d]); });   // 11 blocos de 2 dias
  q.forEach((iso) => { if (!free.has(iso)) duties[iso] = D(); });
  const T = require(path.resolve('data/tapLimitsText.js'));
  const q2 = rule(run('cabin', duties, { today: '2026-05-01' }), 'C14').findings.find((f) => f.period === '2026-T2');
  eq('C14 trimestre em curso coberto pela escala: 11 → excede, pela escala publicada', q2 && [q2.value, q2.status, q2.planned], [11, 'excede', true]);
  eq('C14 frase "Pela escala publicada"', T.describe('C14', q2, 'pt').say, 'Pela escala publicada, 11 folgas semanais no 2.º trimestre de 2026 (mín. 13)');
  const part = {}; q.slice(0, 60).forEach((iso) => { if (!free.has(iso)) part[iso] = D(); });
  const q2b = rule(run('cabin', part, { today: '2026-05-01' }), 'C14').findings.find((f) => f.period === '2026-T2');
  eq('C14 escala que não chega ao fim do trimestre: "até agora" (não é veredicto)', q2b && [q2b.status, q2b.reason], ['incerto', 'trimestre-incompleto']);
}

// ── AUDITORIA DOS CÁLCULOS, BLOCO 3 (2026-11-06) — casos à mão a partir do texto do AE ─────────────
const POS = (rep, off, on, route) => ({ kind: 'positioning', report_time: rep, block_off: off, block_on: on, sectors: 1, route });
const fdpOn = (res, id, date) => rule(res, id).findings.find((f) => f.date === date && f.reason !== 'media-rotacao') || null;

// A-131 — C23 c): a média compara-se sem arredondar (soma > 12 h × n.º de PSV).
{
  const rot = run('cabin', {
    '2026-04-06': F('09:00', '09:40', '20:30', 1, 'LIS-OPO'),
    '2026-04-07': F('09:00', '09:40', '20:30', 1, 'OPO-MAD'),
    '2026-04-08': F('09:00', '09:40', '20:31', 1, 'MAD-LIS'),
  });
  const avg = rule(rot, 'C23').findings.find((f) => f.reason === 'media-rotacao');
  eq('A-131 PSV 12:00 + 12:00 + 12:01 = 36:01 em 3 → média acima de 12 h → excede', avg && [avg.sum, avg.n, avg.status], [2161, 3, 'excede']);
  const T = require(path.resolve('data/tapLimitsText.js'));
  eq('A-131 a frase não diz "12:00" num excesso', avg && T.describe('C23', avg, 'pt').say, 'Rotação com média acima de 12:00 por serviço de voo (36:01 em 3)');
}

// A-130 — C14: a folga de 48 h que atravessa a mudança de trimestre conta (o AE não diz em qual: as duas leituras).
{
  const O = () => S('office', '09:00', '17:00');
  const duties = {};
  const free = new Set(['2026-03-31', '2026-04-01']);                       // livre de 30 mar 17:00 a 2 abr 09:00 (64 h)
  for (let k = 0; k < 12; k++) { const d = L.dayNum('2026-04-06') + 7 * k; free.add(L.isoOf(d)); free.add(L.isoOf(d + 1)); }   // 12 folgas dentro do T2
  days('2026-03-25', 98).forEach((iso) => { if (!free.has(iso)) duties[iso] = O(); });
  const q2 = rule(run('cabin', duties, { today: '2026-03-25' }), 'C14').findings.find((f) => f.period === '2026-T2');
  eq('A-130 T2: 13 se a folga conta onde acaba, 12 onde começa → incerto (não excede)', q2 && [q2.value, q2.valueStr, q2.status], [13, 12, 'incerto']);
}

// A-129 — "consecutivos" pela NOITE que o serviço toca (23h00 do dia D às 6h29 do dia D+1), não pelo dia de início.
{
  const a = { '2026-03-02': F('22:00', '22:30', '02:30', 2, 'LIS-OPO-LIS'), '2026-03-04': F('04:00', '04:30', '09:30', 2, 'LIS-OPO-LIS') };
  ok('A-129 P53 seg 22h00–03h00 e qua 04h00–10h00: noites seg→ter e ter→qua, seguidas, as duas no crítico → excede', has(run('pilot', a), 'P53', 'dois-criticos'));
  ok('A-129 C36 o mesmo na cabine → excede', has(run('cabin', a), 'C36', 'dois-criticos'));
  const b = { '2026-03-02': F('04:00', '04:30', '08:30', 2, 'LIS-OPO-LIS'), '2026-03-03': F('23:00', '23:30', '03:30', 2, 'LIS-OPO-LIS') };
  const fb = rule(run('pilot', b), 'P53').findings.find((f) => f.reason === 'dois-criticos');
  eq('A-129 seg 04h00 (noite dom→seg) e ter 23h00 (noite ter→qua): a noite seg→ter fica livre → não é excede', fb && fb.status, 'incerto');
}

// A-122 — o limite de 6 h fora da base olha também para a hora de DESPERTAR: pilotos = apresentação − 30 min (Cl. 6.ª,
// n.º 25) − transporte; cabine = transporte − 1 h (Cl. 4.ª, n.º 15). O transporte não se vê (ROV), mas os dois sentidos
// somados não passam 3 h (pilotos Cl. 16.ª, n.º 2; cabine Cl. 6.ª, n.º 2 a)): cada um tem de 1 min a 2h59.
{
  const pil = (rep, on) => fdpOn(run('pilot', { '2026-03-02': F('14:00', '14:30', '16:00', 1, 'LIS-FNC'), '2026-03-03': F(rep, '07:30', on, 3, 'FNC-LIS-MAD-LIS') }), 'P27', '2026-03-03');
  const p1 = pil('06:15', '14:30');
  eq('A-122 piloto, apresentação fora às 06h15: despertar até às 05h44 → 6 h; TSV 8h45 → excede', p1 && [p1.limit, p1.value, p1.status], [360, 525, 'excede']);
  const p2 = pil('07:00', '14:30');
  eq('A-122 piloto às 07h00: o despertar pode cair nas 22h00–6h00 (ou não) → incerto', p2 && [p2.status, p2.reason, p2.limit, p2.limitMax], ['incerto', 'despertar', 360, 720]);
  const p3 = pil('10:00', '14:30');
  eq('A-122 piloto às 10h00: despertar depois das 06h00 → o quadro, dentro', p3 && [p3.limit, p3.status], [750, 'dentro']);
  const cab = (rep, on) => fdpOn(run('cabin', { '2026-04-06': F('14:00', '14:30', '16:00', 1, 'LIS-OPO'), '2026-04-07': F(rep, '07:30', on, 3, 'OPO-LIS-FNC-LIS') }), 'C23', '2026-04-07');
  const c1 = cab('06:30', '14:00');
  eq('A-122 cabine, apresentação fora às 06h30: despertar entre 02h31 e 05h29 → 6 h; PSV 8 h → excede', c1 && [c1.limit, c1.status], [360, 'excede']);
  const c2 = cab('07:30', '14:30');
  eq('A-122 cabine às 07h30: o despertar pode cair nas 2h00–5h59 → incerto', c2 && [c2.status, c2.reason], ['incerto', 'despertar']);
  const c3 = cab('10:00', '14:30');
  eq('A-122 cabine às 10h00: despertar depois das 06h00 → dentro', c3 && c3.status, 'dentro');
}

// A-123 — cabine, médio curso, com a hora UTC: a janela das 2h00–5h59 na hora LOCAL (Cl. 4.ª, n.º 13) e o quadro na
// hora de referência (Cl. 23.ª, n.º 3 a) i)) — com a hora da base como segunda leitura.
{
  const pdl = run('cabin', {
    '2026-01-12': FZ('13:00', [['LIS', 'PDL', '14:00', '16:20']]),
    '2026-01-13': FZ('07:30', [['PDL', 'LIS', '08:30', '10:30'], ['LIS', 'FNC', '11:30', '13:15'], ['FNC', 'LIS', '14:00', '15:45']]),
  });
  const f1 = fdpOn(pdl, 'C23', '2026-01-13');
  eq('A-123 PDL às 06h30 locais (07h30 em Lisboa): despertar nas 2h00–5h59 locais → 6 h → excede', f1 && [f1.limit, f1.status], [360, 'excede']);
  const zrh = run('cabin', {
    '2026-01-12': FZ('15:00', [['LIS', 'ZRH', '16:00', '18:30']]),
    '2026-01-13': FZ('13:30', [['ZRH', 'LIS', '14:30', '17:30'], ['LIS', 'OPO', '19:00', '20:00'], ['OPO', 'LIS', '23:00', '01:00']]),
  });
  const f2 = fdpOn(zrh, 'C23', '2026-01-13');
  eq('A-123 ZRH 14h30 locais (13h30 em Lisboa), PSV 12 h: a hora de referência é a de ZRH (Cl. 4.ª, n.º 14; Cl. 23.ª, n.º 3 a) i)) → 11h30 → excede', f2 && [f2.value, f2.limit, f2.status], [720, 690, 'excede']);
}

// A-124 — o posicionamento que antecede o voo, sem repouso, entra no período de serviço de voo (pilotos Cl. 16.ª,
// n.º 1 a); cabine Cl. 28.ª, n.º 2); o limite vem da apresentação para o posicionamento; as aterragens são só as do voo.
{
  const day = { '2026-03-02': { ...POS('05:30', '05:45', '07:00', 'LIS-OPO'), extra: [F('08:00', '08:30', '17:45', 3, 'OPO-FNC-OPO-LIS')] } };
  const p = fdpOn(run('pilot', day), 'P27', '2026-03-02');
  eq('A-124 piloto: DH 05h30 + voo até às 18h15 = 12h45 contra 10h30; mas o AE não diz se o quadro vai pela apresentação do voo (08h00: 12h30) nem se a espera conta (11h45) → incerto', p && [p.limit, p.limitMax, p.value, p.status, p.reason], [630, 750, 765, 'incerto', 'apresentacao-voo']);
  const c = fdpOn(run('cabin', day), 'C23', '2026-03-02');
  eq('A-124 cabine: o PSV todo desde o DH, 12h45 contra 10h30 → excede', c && [c.limit, c.value, c.status], [630, 765, 'excede']);
}

// A-125 — assistência antes do voo.
{
  const pa = fdpOn(run('pilot', { '2026-03-02': { ...S('standby_airport', '06:00', '10:00'), extra: [F('10:00', '10:30', '21:00', 2, 'LIS-OPO-LIS')] } }), 'P27', '2026-03-02');
  eq('A-125 piloto, assistência no aeroporto 4 h → +50 % (Cl. 19.ª, n.º 7 a)): 11h30 + 2 h = 13h30 > 12h30 → excede', pa && [pa.value, pa.limit, pa.status], [810, 750, 'excede']);
  const ph = fdpOn(run('pilot', { '2026-03-02': { ...S('standby_home', '06:00', '10:00'), extra: [F('10:00', '10:30', '21:00', 2, 'LIS-OPO-LIS')] } }), 'P27', '2026-03-02');
  eq('A-125 piloto, assistência em casa não conta para o TSV (n.º 7 b)) → dentro', ph && [ph.value, ph.status], [690, 'dentro']);
  const ca = fdpOn(run('cabin', { '2026-04-06': { ...S('standby_airport', '06:00', '10:00'), extra: [F('08:00', '08:30', '19:30', 2, 'LIS-OPO-LIS')] } }), 'C23', '2026-04-06');
  eq('A-125 cabine, nas instalações: o limite vem da hora de ativação (n.º 12 d)), entre 06h00 e 08h00 → 11h00 a 12h30; PSV 12 h → incerto', ca && [ca.status, ca.reason, ca.limit, ca.limitMax], ['incerto', 'assistencia-ativacao', 660, 750]);
  const ch = fdpOn(run('cabin', { '2026-04-06': { ...S('standby_home', '07:00', '15:00'), extra: [F('14:00', '14:30', '00:30', 2, 'LIS-OPO-LIS')] } }), 'C23', '2026-04-06');
  eq('A-125 cabine, em casa: apresentação 7 h depois → o máximo desce 1 h (n.º 11 f)), ou nada se houver descanso a bordo (ii)) → incerto', ch && [ch.status, ch.reason, ch.limit, ch.limitMax], ['incerto', 'assistencia-6h', 630, 690]);
}

// A-126 — dois serviços no mesmo dia: sem repouso pelo meio são UM período de serviço de voo; com repouso, o repouso do AE.
{
  const two = (a, b) => ({ '2026-03-02': { ...a, extra: [b] } });
  const c = fdpOn(run('cabin', two(F('06:00', '06:30', '10:00', 2, 'LIS-OPO-LIS'), F('16:00', '16:30', '20:00', 2, 'LIS-FAO-LIS'))), 'C23', '2026-03-02');
  eq('A-126 cabine na base: 06h00–20h30 é um só PSV (o intervalo não pode ser na base) → 14h30 > 11 h → excede', c && [c.value, c.limit, c.status], [870, 660, 'excede']);
  const p = fdpOn(run('pilot', two(F('06:00', '06:30', '09:00', 2, 'LIS-OPO-LIS'), F('13:00', '13:30', '16:30', 2, 'LIS-FAO-LIS'))), 'P27', '2026-03-02');
  eq('A-126 piloto: 4h30 entre setores = split duty (Cl. 15.ª, n.º 8): só com autorização do SPAC, que a escala não mostra → incerto', p && [p.value, p.status, p.reason], [660, 'incerto', 'split-duty']);
  const r = rule(run('pilot', two(F('00:30', '01:00', '04:30', 2, 'LIS-OPO-LIS'), F('17:00', '17:30', '21:00', 2, 'LIS-FAO-LIS'))), 'P42').findings.find((f) => f.date === '2026-03-02');
  eq('A-126 piloto: 13 h entre calços e saída no mesmo dia, na base → 12 h + 2 h (Lisboa 2h00–5h59) + 4 h = 18 h → excede', r && [r.value, r.limit, r.status], [780, 1080, 'excede']);
}

// A-127 — simulador de noite (pilotos Cl. 34.ª, n.º 2): +2 h de repouso. A escala não separa o simulador da formação
// em sala: com as 2 h falta, sem elas chega → incerto.
{
  const r = rule(run('pilot', { '2026-03-02': S('training', '22:00', '03:00'), '2026-03-03': F('17:00', '18:00', '22:00', 2, 'LIS-OPO-LIS') }), 'P42').findings.find((f) => f.date === '2026-03-03');
  eq('A-127 formação 22h00–03h00, saída às 18h00 (15 h): 12 + 2 h de transição chega; com +2 h do simulador não → incerto', r && [r.value, r.status, r.reason], [900, 'incerto', 'simulador']);
}

// A-132 — as horas repartem-se pelos dias de calendário ("Dia - Período de vinte e quatro horas que começa às zero horas
// locais da base", pilotos Cl. 6.ª, n.º 9; cabine Cl. 4.ª, n.º 9): a parte depois da meia-noite é do dia seguinte.
{
  const d = { '2026-03-01': F('22:00', '22:30', '07:30', 2, 'LIS-OPO-LIS') };   // TSV 22h00 → 08h00: 2 h no dia 1, 8 h no dia 2
  ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07'].forEach((x) => { d[x] = S('office', '09:00', '17:00'); });
  d['2026-03-08'] = S('office', '09:00', '17:01');
  const f7 = rule(run('pilot', d), 'P26').findings.find((f) => f.window === '7d');
  eq('A-132 P26 de 2 a 8 mar: 8 h do voo + 40h01 de escritório = 48h01 > 48 h → excede', f7 && [f7.from, f7.to, Math.round(f7.value), f7.status], ['2026-03-02', '2026-03-08', 2881, 'excede']);
}

// A-128 — depois de um posicionamento: repouso, transição e as +2 h como depois de um voo (pilotos Cl. 8.ª, n.º 1 a) e
// Cl. 25.ª, n.º 4; cabine Cl. 4.ª, n.º 28 e Cl. 28.ª, n.º 1 a)).
{
  const day = { '2026-03-02': POS('10:00', '11:00', '13:00', 'FNC-LIS'), '2026-03-03': F('03:00', '04:00', '08:00', 2, 'LIS-OPO-LIS') };
  const p = rule(run('pilot', day), 'P42').findings.find((f) => f.date === '2026-03-03');
  eq('A-128 piloto: DH com chegada às 13h00, saída às 04h00 (15 h) → 12 h + 4 h de transição = 16 h → excede', p && [p.value, p.limit, p.status], [900, 960, 'excede']);
  const c = rule(run('cabin', day), 'C38').findings.find((f) => f.date === '2026-03-03');
  eq('A-128 cabine: 13 h + 4 h = 17 h → excede', c && [c.value, c.limit, c.status], [900, 1020, 'excede']);
}

// ── Revisão independente do bloco 3 (2026-11-06) ──────────────────────────────────────────────────
{
  // E1 — entre dias, com 8 h ou mais, é um repouso (curto): a regra do repouso julga-o, não se junta.
  const e1 = run('cabin', { '2026-05-04': F('14:00', '14:30', '21:30', 2, 'LIS-OPO-LIS'), '2026-05-05': F('07:00', '07:30', '12:00', 3, 'LIS-FAO-LIS-OPO') });
  const r1 = rule(e1, 'C38').findings.find((f) => f.date === '2026-05-05');
  eq('E1 cabine: 9 h entre dias → repouso curto (C38 excede), não um período junto', r1 && r1.status, 'excede');
  // E2 — pilotos: 10h30 de night-stop → repouso curto (P42), sem inventar um período de serviço de voo com a noite lá dentro.
  const e2 = run('pilot', { '2026-05-04': F('19:00', '19:30', '22:00', 1, 'LIS-OPO'), '2026-05-05': F('09:00', '09:30', '10:30', 1, 'OPO-LIS') });
  const r2 = rule(e2, 'P42').findings.find((f) => f.date === '2026-05-05');
  eq('E2 piloto: 10h30 → P42 excede e o serviço de 5 mai é só o seu (2 h)', [r2 && r2.status, (fdpOn(e2, 'P27', '2026-05-05') || {}).value], ['excede', 120]);
  // E3 — o DH na manhã seguinte, depois de menos de 8 h: o repouso antes dele também se avalia.
  const day3 = { '2026-05-04': F('14:00', '14:30', '21:30', 2, 'LIS-FAO-OPO'), '2026-05-05': POS('05:30', '05:45', '06:45', 'OPO-LIS') };
  eq('E3 DH às 05h30 depois de calços às 21h30 → repouso curto (pilotos e cabine)', [(rule(run('pilot', day3), 'P42').findings.find((f) => f.date === '2026-05-05') || {}).status, (rule(run('cabin', day3), 'C38').findings.find((f) => f.date === '2026-05-05') || {}).status], ['excede', 'excede']);
  // E4 — o DH depois do último voo, no mesmo dia: cabine a 100 % desde os calços + 30 min (Cl. 28.ª, n.º 3); pilotos a 50 % (Cl. 16.ª, n.º 1 b)).
  const day4 = { '2026-05-04': { ...F('13:00', '13:30', '21:00', 2, 'LIS-OPO-LIS'), extra: [POS('21:45', '22:00', '23:45', 'LIS-FNC')] } };
  eq('E4 cabine: PSV até à chegada do DH, 13h00 → 23h45 = 10h45', (fdpOn(run('cabin', day4), 'C23', '2026-05-04') || {}).value, 645);
  eq('E4 piloto: 8h30 + 50 % do DH (ou da espera e do DH) = 9h37', (fdpOn(run('pilot', day4), 'P27', '2026-05-04') || {}).value, 577);
  // E8 — cabine, assistência em casa até às 15h00, apresentação às 16h00: o tempo de assistência até ao fim marcado é a outra leitura.
  const e8 = fdpOn(run('cabin', { '2026-05-04': { ...S('standby_home', '07:00', '15:00'), extra: [F('16:00', '16:30', '02:00', 2, 'LIS-OPO-LIS')] } }), 'C23', '2026-05-04');
  eq('E8 cabine: PSV 10h30 contra 8h00 a 11h00, conforme as leituras → incerto (não excede)', e8 && [e8.status, e8.reason, e8.limitMax], ['incerto', 'assistencia-6h', 660]);
  // E9 — a média da rotação divide pelos períodos de serviço de voo (Cl. 23.ª, n.º 1 c)).
  const e9 = run('cabin', {
    '2026-04-06': F('09:00', '09:40', '20:30', 1, 'LIS-OPO'),
    '2026-04-07': { ...F('07:00', '07:30', '09:00', 1, 'OPO-MAD'), extra: [F('13:00', '13:30', '18:30', 1, 'MAD-OPO')] },
    '2026-04-08': F('09:00', '09:40', '20:31', 1, 'OPO-LIS'),
  });
  const a9 = rule(e9, 'C23').findings.find((f) => f.reason === 'media-rotacao');
  eq('E9 três períodos (12:00, 12:00, 12:01), não quatro serviços → excede', a9 && [a9.n, a9.sum, a9.status], [3, 2161, 'excede']);
  // E5 — pilotos, longo curso, com DH antes: a espera e a hora do quadro ficam em aberto → não é "excede".
  const dh = FZ('05:00', [['OPO', 'LIS', '05:15', '06:30']], { kind: 'positioning' });
  const e5 = fdp(run('pilot', { '2026-01-12': { ...dh, extra: [FZ('12:00', [['LIS', 'EWR', '13:00', '21:30']])] } }, { fleetAt: () => 'NB' }), 'P32', '2026-01-12');
  eq('E5 P32 DH 05h00 + LIS-EWR até às 22h00: 17 h com a espera, 11h30 sem ela → incerto', e5 && e5.status, 'incerto');
  // E10 — sem as pernas UTC, um voo de uma perna que passa da meia-noite reparte-se pelos dias.
  const mar = Object.fromEntries(days('2026-03-01', 23).map((d) => [d, F('08:00', '08:30', '12:30', 2, 'LIS-OPO-LIS', { flight_minutes: 240 })]));
  mar['2026-03-31'] = F('22:00', '22:30', '03:00', 1, 'LIS-FNC', { flight_minutes: 270 });
  // Revisão dos pendentes: (1) o ecrã com as mesmas contas; (2) P28 sem os voos das assistências no planeamento; (3) férias
  // pelo meio partem os 5 dias; (4) a assistência ativada acaba na apresentação.
  {
    const p25m = Object.fromEntries(days('2026-03-10', 21).map((d) => [d, F('08:00', '08:30', '12:30', 2, 'LIS-OPO-LIS', { flight_minutes: 234 })]));
    p25m['2026-03-04'] = F('08:00', '08:30', '12:30', 2, 'LIS-OPO-LIS', { flight_minutes: 234 });
    p25m['2026-03-31'] = F('20:30', '21:00', '03:30', 2, 'LIS-FNC-LIS', { flight_minutes: 300 });
    const r25 = rule(run('pilot', p25m, { today: '2026-03-31' }), 'P25');
    const c = r25.current[0];
    eq('ecrã P25 28 dias a 31 mar: o voo da meia-noite dá um intervalo (não o voo todo no dia 31)', [c.value <= 5400, c.valueMax > c.value, r25.status !== 'excede'], [true, true, true]);
    const sbm = Object.fromEntries(days('2026-05-01', 18).map((d) => [d, F('08:00', '08:30', '13:30', 2, 'LIS-OPO-LIS', { flight_minutes: 246 })]));
    sbm['2026-05-25'] = { ...S('standby_airport', '06:00', '10:00'), extra: [F('07:00', '07:30', '12:30', 2, 'LIS-OPO-LIS', { flight_minutes: 246 })] };
    const p28s = rule(run('pilot', sbm, { fleetAt: () => 'NB' }), 'P28').findings.find((x) => x.period === '2026-05');
    eq('P28: 73h48 planeadas + 4h06 de um voo da assistência → incerto (não excede)', p28s && [p28s.status, p28s.reason], ['incerto', 'assistencia-planeamento']);
    const v = {};
    days('2026-04-06', 3).forEach((d) => { v[d] = F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS'); });
    days('2026-04-16', 5).forEach((d) => { v[d] = F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS'); });
    const ev = days('2026-04-09', 7).map((d) => ({ type: 'vacDays', date: d }));
    ok('C11: 3 dias, 7 de férias, 5 dias → sem "folga-24h"', !rule(run('cabin', v, { events: ev }), 'C11').findings.some((x) => x.reason === 'folga-24h'));
    const q = {};
    const wd = days('2026-04-01', 91).filter((d) => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return w >= 1 && w <= 5; }).slice(0, 59);
    wd.forEach((d) => { q[d] = S('office', '09:00', '17:00'); });
    const sat = days('2026-04-01', 91).find((d) => new Date(d + 'T12:00:00Z').getUTCDay() === 6);
    q[sat] = { ...S('standby_home', '06:00', '14:00'), extra: [F('08:00', '08:30', '12:00', 2, 'LIS-OPO-LIS')] };
    ok('C34 trimestre: a assistência ativada acaba na apresentação (não conta duas vezes) → sem incerto', !rule(run('cabin', q), 'C34').findings.some((x) => x.window === 'trimestre-servico'));
  }
  ok('E10 C34 março: 92 h + 1h30 do voo de 31 mar = 93h30 → dentro (não 96h30)', !rule(run('cabin', mar), 'C34').findings.some((x) => x.window === 'mes-voo' && x.period === '2026-03'));
}

// ── Pendentes do bloco 3 (2026-11-06): A-133 a A-141 e o tempo de voo sem pernas ──────────────────
{
  // Tempo de voo sem as horas de cada perna, a passar da meia-noite: a parte de cada dia não se sabe → "incerto" se mudar o resultado.
  const mar = Object.fromEntries(days('2026-03-01', 23).map((d) => [d, F('08:00', '08:30', '12:30', 2, 'LIS-OPO-LIS', { flight_minutes: 243 })]));
  mar['2026-03-31'] = F('20:30', '21:00', '03:30', 2, 'LIS-FNC-LIS', { flight_minutes: 300 });
  const m = rule(run('cabin', mar), 'C34').findings.find((x) => x.window === 'mes-voo' && x.period === '2026-03');
  eq('voo de 31 mar sem pernas: março entre 94h39 e 96h09 → incerto (o AE dá 95 h)', m && [m.status, m.reason], ['incerto', 'meia-noite']);

  // A-133 — zonas geográficas: a Cl. 6.ª, n.º 53 define-as como as faixas de 15° do fuso ("geralmente coincidente com o fuso
  // horário"): LIS na zona −1, GIG na −3 → 2 zonas → aclimatizado (Cl. 43.ª, n.º 2 c)). A variação de longitude não é a zona.
  const gig = run('pilot', {
    '2026-01-12': FZ('22:00', [['LIS', 'GIG', '23:15', '08:45']]),
    '2026-01-13': FZ('20:30', [['GIG', 'LIS', '21:30', '06:45']]),
  }, { fleetAt: () => 'NB' });
  const g = fdp(gig, 'P32', '2026-01-13');
  eq('A-133 GIG-LIS às 17h30 locais, TSV 10h45: aclimatizado → 11h45 → dentro', g && [g.limit, g.status], [705, 'dentro']);

  // A-134 — 5 dias, 1 dia livre (24 h), 5 dias: um dia livre não é folga semanal (48 h) → incerto.
  const c11 = {};
  [...days('2026-04-06', 5), ...days('2026-04-12', 5)].forEach((d) => { c11[d] = F('08:00', '08:30', '15:30', 2, 'LIS-OPO-LIS'); });
  const f11 = rule(run('cabin', c11), 'C11').findings.find((x) => x.reason === 'folga-24h');
  eq('A-134 10 dias de trabalho entre duas folgas de 48 h, com um dia livre pelo meio → incerto', f11 && [f11.status, f11.value], ['incerto', 10]);

  // A-135 — RAD de 12 h: a estadia exclui o transporte (até 3 h): 37 h livres podem ser menos de 36 h de estadia.
  const rad = run('cabin', {
    '2026-01-12': FZ('22:00', [['LIS', 'GIG', '23:00', '08:40']]),
    '2026-01-14': FZ('22:10', [['GIG', 'LIS', '23:10', '08:50']]),
    '2026-01-18': F('07:00', '07:30', '12:00', 2, 'LIS-OPO-LIS'),
  });
  const r15 = rule(rad, 'C15').findings.find((x) => x.date === '2026-01-14');
  eq('A-135 block 9h40, 37 h livres: com RAD de 12 h a folga pede 60 h; 53 h → incerto', r15 && [r15.status, r15.limit, r15.limitStr], ['incerto', 2880, 3600]);

  // A-137 — pilotos: no planeamento mensal, 75 h de block (A320) ou 80 h (A330) por mês (Cl. 15.ª, n.º 9).
  const blockMonth = (min) => Object.fromEntries(days('2026-05-01', 19).map((d) => [d, F('08:00', '08:30', '13:30', 2, 'LIS-OPO-LIS', { flight_minutes: min })]));
  const p28 = (min, fleet) => rule(run('pilot', blockMonth(min), { fleetAt: () => fleet }), 'P28').findings.find((x) => x.period === '2026-05');
  eq('A-137 A320 com 19 × 4h06 = 77h54 → excede (75 h)', (p28(246, 'NB') || {}).status, 'excede');
  eq('A-137 A330 com 77h54 → dentro (80 h)', (p28(246, 'WB') || {}).status, 'dentro');
  eq('A-137 frota desconhecida com 77h54 → incerto', (p28(246, null) || {}).status, 'incerto');

  // A-138 — PSV de 4 aterragens que acaba fora: a folga de 48 h é no regresso à base.
  const c15 = run('cabin', {
    '2026-04-06': F('06:00', '06:30', '15:00', 4, 'LIS-OPO-LIS-FAO-FNC'),
    '2026-04-07': F('09:00', '09:45', '11:30', 1, 'FNC-LIS'),
    '2026-04-08': F('08:00', '08:30', '14:00', 2, 'LIS-OPO-LIS'),
  });
  const f15 = rule(c15, 'C15').findings.find((x) => x.date === '2026-04-07');
  eq('A-138 4 aterragens no dia 6 (acaba no FNC), regresso no dia 7 (1 aterragem), voo no dia 8: o AE não diz se é só o PSV do regresso ou qualquer da rotação → incerto', f15 && [f15.status, f15.reason, f15.doubt], ['incerto', 'quatro-aterragens', 'rotacao']);
  const c15b = run('cabin', { '2026-04-06': F('06:00', '06:30', '15:00', 4, 'LIS-OPO-LIS-FAO-LIS'), '2026-04-07': F('08:00', '08:30', '14:00', 2, 'LIS-OPO-LIS') });
  eq('o próprio PSV com 4 aterragens acaba na base, voo no dia seguinte → excede', (rule(c15b, 'C15').findings.find((x) => x.date === '2026-04-06') || {}).status, 'excede');

  // A-139 — o período crítico dos pilotos no longo curso (Cl. 6.ª, n.º 21): na faixa de 3 zonas, hora da base; além dela,
  // a base nas primeiras 48 h e depois a hora local. Entre as duas contagens das zonas, as duas leituras.
  const lad = servicesOf({ '2026-01-12': FZ('10:00', [['LIS', 'LAD', '11:00', '19:30']]), '2026-01-16': FZ('05:15', [['LAD', 'LIS', '06:15', '14:45']]) }, { baseAt: 'LIS', crewType: 'pilot' });
  L.rotationsOf(lad);
  const back = lad.find((x) => x.date === '2026-01-16');
  eq('A-139 LIS-LAD (2 zonas), regresso depois de 48 h: crítico na hora da base e na local (duas leituras)', L.pilotCritShifts(back).length, 2);
  eq('A-139 médio curso: só a hora da base', L.pilotCritShifts(servicesOf({ '2026-01-12': F('08:00', '08:30', '14:00', 2, 'LIS-OPO-LIS') }, { baseAt: 'LIS', crewType: 'pilot' })[0]), [0]);

  // A-140 — cabine: a assistência em casa a 25 % só nos limites "semanais, mensais e anuais" (Cl. 17.ª, n.º 11 c)): no trimestre, também a 100 %.
  const q = {};
  const wd = days('2026-04-01', 91).filter((d) => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return w >= 1 && w <= 5; }).slice(0, 59);
  wd.forEach((d) => { q[d] = S('office', '09:00', '17:00'); });
  days('2026-04-01', 91).filter((d) => new Date(d + 'T12:00:00Z').getUTCDay() === 6).slice(0, 4).forEach((d) => { q[d] = S('standby_home', '06:00', '14:00'); });
  const f34 = rule(run('cabin', q), 'C34').findings.find((x) => x.window === 'trimestre-servico');
  eq('A-140 472 h de solo + 32 h de assistência em casa: 480 h a 25 %, 504 h a 100 % → incerto', f34 && [f34.status, f34.reason], ['incerto', 'assistencia-trimestre']);

  // A-141 — 5.º dia com assistência: a alínea b) deixa a chegada até às 20h00; a a) diz término até às 18h00 → incerto.
  const c5 = {};
  days('2026-04-06', 4).forEach((d) => { c5[d] = F('08:00', '08:30', '14:00', 2, 'LIS-OPO-LIS'); });
  c5['2026-04-10'] = { ...S('standby_airport', '08:00', '12:00'), extra: [F('12:00', '12:30', '19:00', 2, 'LIS-OPO-LIS')] };
  const f5 = rule(run('cabin', c5), 'C11').findings.filter((x) => x.date === '2026-04-10');
  eq('A-141 5.º dia, voo saído da assistência com calços às 19h00: só a alínea b) (chegada até às 20h00) → sem achado', f5.length, 0);
  const c5b = { ...c5, '2026-04-10': { ...S('standby_airport', '08:00', '12:00'), extra: [F('12:00', '12:30', '20:30', 2, 'LIS-OPO-LIS')] } };
  eq('A-141 voo da assistência com chegada às 20h30 → excede (alínea b))', rule(run('cabin', c5b), 'C11').findings.some((x) => x.reason === 'quinto-dia-assistencia-20h' && x.status === 'excede'), true);
  // P38 — a Cl. 39.ª é das "Rotações no longo-curso": com uma rotação de médio curso, "incerto".
  const p38 = run('pilot', {
    '2026-01-12': FZ('08:00', [['LIS', 'FCO', '09:00', '12:00']]), '2026-01-13': FZ('14:00', [['FCO', 'LIS', '15:00', '18:00']]),
    '2026-01-15': FZ('10:00', [['LIS', 'LAX', '11:00', '23:00']]), '2026-01-17': FZ('22:00', [['LAX', 'LIS', '23:00', '10:00']]),
  });
  const f38 = rule(p38, 'P38').findings[0];
  eq('P38 pernoita em FCO (médio curso) e depois LAX, 9 h de diferença, 1 dia de folga → incerto (não excede)', f38 && [f38.status, f38.reason], ['incerto', 'rotacao-medio-curso']);
}

console.log(`\nlimites de escala TAP — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Cada citação existe no texto oficial do BTE; os casos batem com o texto.');
