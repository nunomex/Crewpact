/*
 * Simulação end-to-end dos motores FTL + AE com dados de exemplo REALISTAS.
 * NÃO é um teste de pass/fail (isso são os scripts *.test.js) — é uma ferramenta de
 * SANIDADE/demonstração: corre cenários compostos (dia típico, prolongamento, duty
 * ilegal, standby, semana→cumulativos+fadiga, repouso reduzido; mês AE de piloto/cabine,
 * bónus) e imprime os resultados para inspeção visual, com a conta esperada ao lado.
 *
 * Sem framework; transpila ESM→CJS com o @babel/core (igual aos golden).
 * Executar:  node scripts/simulate.js   (a partir da raiz do projeto)
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

const ftl = require(path.resolve('ftl/index.js'));
const ae = require(path.resolve('ae/easyjetSpac.js'));
const cabin = require(path.resolve('ae/easyjetSnpvac.js'));
const { aeMonthTotal, monthlyAe, monthlyPerDiem } = require(path.resolve('data/perdiem.js'));
const {
  computeDuty, dutyToFtlDay, computeStandby, computeReducedRest,
  computeDutyTime, computeFlightTime, fatigueFromDuty, computeExtensionUsage, reconcileDayLog,
} = ftl;

const hhmm = (m) => (m == null ? '—' : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);
const eur = (n) => (n == null ? '—' : n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
const hr = (t) => console.log('\n' + '═'.repeat(70) + '\n  ' + t + '\n' + '═'.repeat(70));
const L = (k, v) => console.log('   ' + String(k).padEnd(32) + ' ' + v);

// ════════════════════════════════ FTL ════════════════════════════════
hr('FTL 1 — dia típico easyJet (curto-curso, aclimatizado, na base)');
{
  const d = computeDuty({ state: 'acc', report: '06:00', end: '16:00', sectors: 4, inBase: true });
  L('Apresentação → fim', '06:00 → 16:00 · 4 setores');
  L('PSV real / máx', `${d.fdp.actualFdpStr} / ${d.fdp.maxFdpStr}`);
  L('Excede o limite?', d.fdp.over ? '⚠ SIM' : '✓ não');
  L('Repouso devido', hhmm(d.rest.restMin));
  L('Esperado', '✓ PSV 10:00 ≤ máx 12:00; legal; repouso ≥ 12h (base)');
}

hr('FTL 2 — prolongamento PLANEADO (deteção)');
{
  const e = dutyToFtlDay({ report_time: '07:00', block_on: '20:30', sectors: 1, flight_minutes: 600 });
  L('07:00 → 20:30 · 1 setor', `PSV ${e.psv.result} (máx básico ${e.psv.max})`);
  L('Prolongamento detetado?', e.psv.extended ? '✓ SIM (extended:true)' : '✗ não');
  L('Esperado', '✓ 13:30 > básico 13:00 e ≤ estendido 14:00 → extended');
  const log = { '2026-06-03': e, '2026-06-05': e };
  const u = computeExtensionUsage(log, '2026-06-05');
  L('Frequência 7d (2 já usados)', `count=${u.count} · um novo excederia? ${u.wouldExceed ? '✓ SIM' : 'não'}`);
}

hr('FTL 3 — duty ILEGAL (excede o PSV máx, sem prolongamento possível)');
{
  const d = computeDuty({ state: 'acc', report: '06:00', end: '21:00', sectors: 1, inBase: true });
  L('06:00 → 21:00 · 1 setor', `PSV ${d.fdp.actualFdpStr} / máx ${d.fdp.maxFdpStr}`);
  L('Excede?', d.fdp.over ? `⚠ SIM · excesso ${d.fdp.excessStr}` : 'não');
  L('Esperado', '⚠ 15:00 > máx 13:00 → over, excesso 02:00 (06:00 não permite extensão)');
}

hr('FTL 4 — standby (limites: combinado aeroporto / acordado)');
{
  const ap = computeStandby({ type: 'airport', standbyH: 6, maxFdpMin: 11 * 60 });
  L('Aeroporto 6h + PSV 11h', `redução ${ap.reductionStr} · combinado>16h? ${ap.combinedOver ? '⚠ SIM' : 'não'}`);
  const ot = computeStandby({ type: 'other', standbyH: 8, maxFdpMin: 13 * 60 });
  L('Outro 8h + PSV 13h', `>18h acordado? ${ot.awakeOver ? '⚠ SIM' : 'não'}`);
  L('Esperado', '⚠ aeroporto 6+11=17h>16h; outro 8+13=21h>18h');
}

hr('FTL 5 — SEMANA realista → limites cumulativos (210) + fadiga');
{
  const week = {
    '2026-06-15': { report_time: '06:00', block_on: '16:00', sectors: 4, flight_minutes: 480 },
    '2026-06-16': { report_time: '06:30', block_on: '15:30', sectors: 4, flight_minutes: 450 },
    '2026-06-17': { report_time: '13:00', block_on: '22:00', sectors: 4, flight_minutes: 450 },
    '2026-06-18': { report_time: '22:00', block_on: '06:30', sectors: 2, flight_minutes: 360 }, // noturno
    '2026-06-19': { report_time: '07:00', block_on: '15:00', sectors: 3, flight_minutes: 360 },
  };
  const dayLog = reconcileDayLog(week, {});
  const ref = new Date(2026, 5, 19, 23, 0, 0);
  const d7 = computeDutyTime(dayLog, ref).find((w) => w.id === '7d');
  const f28 = computeFlightTime(dayLog, ref).find((w) => w.id === '28d');
  L('Serviço 7 dias', `${d7.done}h / ${d7.limit}h · excede? ${d7.over ? '⚠' : '✓ não'}`);
  L('Voo 28 dias', `${f28.done}h / ${f28.limit}h · excede? ${f28.over ? '⚠' : '✓ não'}`);
  const fat = fatigueFromDuty(computeDuty({ state: 'acc', report: '22:00', end: '06:30', sectors: 2 }));
  L('Fadiga (dia noturno 18 jun)', `score ${fat.score}/100 · banda "${fat.band}"`);
  L('Esperado', '✓ ~44,5h/60h e 35h/100h (dentro); fadiga puxada pelo WOCL noturno');
}

hr('FTL 6 — repouso reduzido (235(c)) fora da base');
{
  const r = computeReducedRest({ inBase: false, reducedMin: 9 * 60, normalRestMin: 11 * 60 });
  L('Reduzido 9h (fora base, piso 10h)', `abaixo do piso? ${r.belowFloor ? '⚠ SIM' : 'não'}`);
  L('Repouso seguinte estende', `+${r.nextRestExtStr} · PSV seguinte reduz ${r.nextFdpReductionStr}`);
  L('Esperado', '⚠ 9h < piso 10h → belowFloor; compensar +2h no seguinte');
}

// ════════════════════════════════ AE ════════════════════════════════
const index = ae.indexFactor(new Date().getFullYear());
hr(`AE — índice de indexação aplicado: ×${index} (IPC 2,4% confirmado p/ 2025+)`);

hr('AE 1 — Comandante (CPT) 12/12 (mês com rotas + pernoita + extras)');
{
  const ym = `${new Date().getFullYear()}-06`;
  const duties = {
    [`${ym}-02`]: { route: 'LIS-OPO-LIS', kind: 'flight' },
    [`${ym}-04`]: { route: 'LIS-LGW-LIS', kind: 'flight' },
    [`${ym}-06`]: { route: 'LIS-MAD-LIS', kind: 'flight' },
    [`${ym}-09`]: { route: 'LIS-FNC-LIS', kind: 'flight', nightStop: true },
    [`${ym}-11`]: { route: 'LIS-CDG-LIS', kind: 'flight' },
    [`${ym}-14`]: { kind: 'office' },
    [`${ym}-16`]: { kind: 'standby_airport' },
  };
  const m = monthlyAe(duties, 'CPT', '12/12', ae, { ym, index });
  const pd = monthlyPerDiem(duties, 'CPT', ae, { ym, index });
  const total = aeMonthTotal(duties, 'CPT', '12/12', ae, { ym, index, extras: { ddo: 1, snc: 2 } });
  L('Base mensal (indexada)', eur(m.base));
  L('Per-diem (5 voos)', `${eur(pd.total)} (${pd.withRoute} c/ rota, ${pd.missing} sem)`);
  L('Pernoita (1×, 2 NS)', eur(m.nightStops));
  L('Total do motor (s/ extras)', eur(m.total));
  L('Total + extras (ddo×1, snc×2)', eur(total));
  L('Verificação', `base = 122000×${index}/14 = ${eur(122000 * index / 14)}`);
}

hr('AE 2 — Oficial-piloto (FO) 12/12, mês simples');
{
  const ym = `${new Date().getFullYear()}-06`;
  const duties = { [`${ym}-03`]: { route: 'LIS-OPO-LIS', kind: 'flight' }, [`${ym}-05`]: { route: 'LIS-LGW-LIS', kind: 'flight' } };
  L('Base FO (indexada)', eur(ae.monthlyBase('FO', { index })));
  L('Total do mês', eur(aeMonthTotal(duties, 'FO', '12/12', ae, { ym, index })));
  L('Verificação base', `47750×${index}/14 = ${eur(47750 * index / 14)}`);
}

hr('AE 3 — Cabine (SNPVAC) CM 12/12 — NÃO indexa (tabela nov-2025)');
{
  L('Base CM', eur(cabin.monthlyBase('CM')));
  L('Total (base + abono falhas)', eur(aeMonthTotal({}, 'CM', '12/12', cabin, { ym: '2099-06' })));
  L('Verificação', `23198/14 = ${eur(23198 / 14)} + abono 5%÷12`);
}

hr('AE 4 — Bónus de performance (ALVO + teto)');
{
  L('CPT alvo (10%)', eur(ae.perfBonus('CPT')));
  L('CPT teto (20%)', eur(ae.perfBonus('CPT', { max: true })));
  L('FO alvo (7,5%)', eur(ae.perfBonus('FO')));
  L('Cabine CM alvo (2 sem.)', eur(cabin.perfBonus('CM')));
  L('Esperado', '✓ pilotos mostram alvo+teto; cabine só alvo');
}

console.log('\n' + '─'.repeat(70) + '\n  Simulação concluída (inspeção visual — não é pass/fail).\n');
