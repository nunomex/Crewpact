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
  const gr = rule(run('pilot', { '2026-03-02': F('10:00', '10:30', '20:00', 2, 'LIS-OPO-LIS'), '2026-03-03': S('office', '10:00', '17:00') }), 'P42').findings[0];
  eq('P42 voo → solo na base: 14 h = 12 h + 2 h → dentro', [gr.value, gr.limit, gr.status], [840, 840, 'dentro']);
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

  // O que a v1 NÃO avalia fica à vista ("Ainda não avaliado"), nunca em silêncio nem como "Incerto".
  const lc = run('pilot', { '2026-03-02': F('10:00', '11:00', '19:00', 1, 'LIS-JFK'), '2026-03-05': F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS') });
  const gl = T.groupRules(lc, '2026-03-01');
  eq('longo curso: 1 serviço em "Ainda não avaliado"', gl.pendente.lc, 1);
  ok('longo curso: não entra no grupo Incerto', !gl.incerto.some((x) => x.id === 'P27'));
  // Cabine com 5 aterragens: o AE não tem coluna → o resumo diz que fica só pela regra europeia.
  const c5 = run('cabin', { '2026-04-06': F('09:00', '09:40', '18:00', 5, 'LIS-OPO-LIS-FAO-LIS-OPO'), '2026-04-08': F('08:00', '08:30', '14:30', 2, 'LIS-OPO-LIS') });
  const c23 = T.groupRules(c5, '2026-04-01').dentro.find((x) => x.id === 'C23');
  eq('5 aterragens (cabine): "1 serviço · 1 só pela regra europeia"', c23 && T.summaryFor(c23.rule, 'pt'), '1 serviço · 1 só pela regra europeia');
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

console.log(`\nlimites de escala TAP — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Cada citação existe no texto oficial do BTE; os casos batem com o texto.');
