/*
 * Testes "golden" do módulo AE (Acordo de Empresa) — fixam as tabelas do ANEXO I
 * do AE Easyjet × SPAC (pilotos), BTE n.º 40, 29-10-2023, contra o PDF. Blindam
 * contra regressões: se algum valor mudar, o teste falha.
 *
 * Não usa framework (o projeto não tem jest). Transpila ESM→CJS com @babel/core.
 * Executar:  node scripts/ae-golden.test.js   (ou via npm script)
 *
 * Fontes (artigo / anexo do PDF):
 *  - Salário anual base ......... Anexo I.1 (a partir de 1 fev 2024)
 *  - Setor nominal .............. Anexo I.2 (a partir de 1 fev 2024)
 *  - Per diem por setor ......... Art. 37.º (bandas de distância)
 *  - Paragem nocturna ........... Art. 39.º / Anexo I.4 (2 setores nominais)
 *  - 14 prestações/ano .......... Art. 36.º
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

const ae = require(path.resolve('ae/easyjetSpac.js'));
const {
  BASE_ANNUAL, NOMINAL_SECTOR, CATEGORIES, SALARY_INSTALMENTS,
  sectorMult, monthlyBase, perDiem, computeAeMonth, categoryLabel,
  CONTRACTS, contractFactor, contractLabel,
} = ae;
const registry = require(path.resolve('ae/index.js'));
const { getAe, hasAe, getAeForProfile, getAeSet } = registry;
const cabin = require(path.resolve('ae/easyjetSnpvac.js'));
const { airportCoord, greatCircleNM, sectorDistanceNM } = require(path.resolve('data/airports.js'));
const { routeDistancesNM, monthlyPerDiem } = require(path.resolve('data/perdiem.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (got === want) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${want}\n      obtido:   ${got}`); }
};

// ─────────── Anexo I.1 — Salário anual base (€, a partir 1 fev 2024) ───────────
eq('Base CPT', BASE_ANNUAL.CPT, 122000);
eq('Base SFO', BASE_ANNUAL.SFO, 69000);
eq('Base FO',  BASE_ANNUAL.FO,  47750);
eq('Base SO',  BASE_ANNUAL.SO,  38625);
eq('14 prestações/ano', SALARY_INSTALMENTS, 14);
eq('Categorias', CATEGORIES.join(','), 'CPT,SFO,FO,SO');

// ─────────── Anexo I.2 — Setor nominal (€, a partir 1 fev 2024) ───────────
eq('Nominal CPT', NOMINAL_SECTOR.CPT, 78.75);
eq('Nominal SFO', NOMINAL_SECTOR.SFO, 51.50);
eq('Nominal FO',  NOMINAL_SECTOR.FO,  38.76);
eq('Nominal SO',  NOMINAL_SECTOR.SO,  29.36);

// ─────────── Pagamento base mensal = anual / 14 ───────────
eq('Mensal CPT', monthlyBase('CPT'), 8714.29);
eq('Mensal SFO', monthlyBase('SFO'), 4928.57);
eq('Mensal FO',  monthlyBase('FO'),  3410.71);
eq('Mensal SO',  monthlyBase('SO'),  2758.93);

// ─────────── Art. 37.º — multiplicador de setor por distância (NM) ───────────
eq('Curto  350NM  → 0.8', sectorMult(350), 0.8);
eq('Curto  400NM  → 0.8', sectorMult(400), 0.8);
eq('Médio  401NM  → 1.2', sectorMult(401), 1.2);
eq('Médio  1000NM → 1.2', sectorMult(1000), 1.2);
eq('Longo  1001NM → 1.5', sectorMult(1001), 1.5);
eq('Longo  1500NM → 1.5', sectorMult(1500), 1.5);
eq('Extra  1501NM → 2.5', sectorMult(1501), 2.5);
eq('Extra  2000NM → 2.5', sectorMult(2000), 2.5);

// ─────────── Per diem por serviço de voo (€) = Σ mult × setor nominal ───────────
eq('Per diem FO curto+médio (350,800)', perDiem('FO', [350, 800]), 77.52);   // 2.0 × 38.76
eq('Per diem SFO 1 setor curto (350)',  perDiem('SFO', [350]), 41.2);        // 0.8 × 51.50
eq('Per diem sem setores → 0',          perDiem('SO', []), 0);

// ─────────── Estimativa mensal (base + per diem + paragem nocturna) ───────────
{
  const r = computeAeMonth({ category: 'FO', duties: [[350, 800]], nightStops: 1 });
  eq('Mês FO: base', r.base, 3410.71);
  eq('Mês FO: per diem', r.perDiem, 77.52);
  eq('Mês FO: paragem nocturna (2×nom)', r.nightStops, 77.52);
  eq('Mês FO: variável', r.variable, 155.04);
  eq('Mês FO: total', r.total, 3565.75);
}

// ─────────── Modalidades de contrato (fração da base) ───────────
eq('Contrato 12/12 = 100%', contractFactor('12/12'), 1);
eq('Contrato 5/4 = 92%',    contractFactor('5/4'), 0.92);
eq('Contrato 14-14 = 51%',  contractFactor('14-14'), 0.51);
eq('Contrato 21-7 = 74%',   contractFactor('21-7'), 0.74);
eq('Contrato 7-7 = 71%',    contractFactor('7-7'), 0.71);
eq('Contrato desconhecido → 1', contractFactor('xx'), 1);
eq('Contratos (ordem)', CONTRACTS.join(','), '12/12,PPY 9/12,PPY 8/12,5/4,14-14,21-7,7-7');
eq('Contrato label pt', contractLabel('5/4', 'pt'), 'Escala fixa 5/4');
eq('Contrato label en', contractLabel('5/4', 'en'), 'Fixed roster 5/4');
// Base mensal proporcional ao contrato (€)
eq('Base FO 12/12 (cheia)', monthlyBase('FO', { contract: '12/12' }), 3410.71);  // 47750/14
eq('Base FO sem opções = 12/12', monthlyBase('FO'), 3410.71);                      // retro-compatível
eq('Base CPT 5/4 (92%)', monthlyBase('CPT', { contract: '5/4' }), 8017.14);        // 122000×0.92/14
eq('Base FO PPY 9/12 (75%)', monthlyBase('FO', { contract: 'PPY 9/12' }), 2558.04);// 47750×0.75/14
eq('Mês FO 5/4: contrato propaga', computeAeMonth({ category: 'FO', contract: '5/4', duties: [[350, 800]] }).contract, '5/4');

// ─────────── Calculadoras individuais do AE de piloto (Anexo I) ───────────
eq('Piloto paragem nocturna CPT (2 NS)', ae.nightStop('CPT'), 157.50);   // 2×78.75
eq('Piloto dia de férias CPT (2 NS)', ae.vacDay('CPT'), 157.50);
eq('Piloto ad-hoc CPT (3 NS)', ae.adhoc('CPT'), 236.25);                  // 3×78.75
eq('Piloto SNC (€60 fixo)', ae.snc(), 60);
eq('Piloto instrutor (€120/dia)', ae.instructor(), 120);
eq('Piloto DDO CPT (0,4% anual)', ae.ddo('CPT'), 488.00);                 // 0.004×122000
eq('Piloto IDO CPT (0,8% anual)', ae.ido('CPT'), 976.00);                 // 0.008×122000
eq('Piloto WFLY CPT (1% anual)', ae.wfly('CPT'), 1220.00);               // 0.01×122000
eq('Piloto DDO FO (0,4% anual)', ae.ddo('FO'), 191.00);                   // 0.004×47750
eq('Piloto doença/dia CPT (45%)', ae.sickDay('CPT'), 130.71);            // 0.45×(122000/14)/30
eq('Piloto catálogo (11 cálculos)', ae.CALCS.length, 11);
eq('Piloto papéis CPT (instrutor)', ae.additionalRolesFor('CPT').map((r) => r.id).join(','), 'instr');
eq('Piloto papéis SFO (instrutor)', ae.additionalRolesFor('SFO').map((r) => r.id).join(','), 'instr');
eq('Piloto papéis FO (nenhum)', ae.additionalRolesFor('FO').length, 0);
eq('Piloto papel instrutor → €120', ae.instructor(), 120);
eq('Piloto catalogValue base CPT', ae.catalogValue('base', { category: 'CPT' }), 8714.29);  // 122000/14
eq('Piloto catalogValue night CPT', ae.catalogValue('night', { category: 'CPT' }), 157.50);
eq('Piloto catalogValue ddo CPT', ae.catalogValue('ddo', { category: 'CPT' }), 488.00);
eq('Piloto catalogValue perdiem = null', ae.catalogValue('perdiem', { category: 'CPT' }), null);

// ─────────── Designação de categoria (bilingue) ───────────
eq('Categoria CPT pt', categoryLabel('CPT', 'pt'), 'Comandante');
eq('Categoria CPT en', categoryLabel('CPT', 'en'), 'Captain');
eq('Categoria SO en', categoryLabel('SO', 'en'), 'Second Officer');

// ─────────── Registo multi-AE (ae/index.js) ───────────
eq('getAe por slug', getAe('easyjet') === ae, true);
eq('getAe por engine_code', getAe('EZY_AE_2024') === ae, true);
eq('getAe por substring', getAe('EasyJet Europe') === ae, true);
eq('getAe objeto-companhia (BD)', getAe({ slug: 'easyjet', engine_code: 'EZY_AE_2024', name: 'easyJet' }) === ae, true);
eq('getAe sem AE → null', getAe('tap'), null);
eq('hasAe easyjet', hasAe('easyjet'), true);
eq('hasAe tap', hasAe('tap'), false);
// Orientado pela BD: rule_type comanda; pilotos↔SPAC, cabine↔SNPVAC.
eq('AE: rule_type AE + piloto → SPAC', getAeForProfile({ company: { slug: 'easyjet', rule_type: 'AE' }, crewType: 'pilot' }) === ae, true);
eq('AE: rule_type AE + cabine → SNPVAC', getAeForProfile({ company: { slug: 'easyjet', rule_type: 'AE' }, crewType: 'cabin' }) === cabin, true);
eq('AE: rule_type FTL → null', getAeForProfile({ company: { slug: 'easyjet', rule_type: 'FTL' }, crewType: 'pilot' }), null);
eq('AE: string legada + piloto', getAeForProfile({ company: 'easyjet', crewType: 'pilot' }) === ae, true);
eq('getAe cabine por engine_code', getAe('EZY_AE_2024', 'cabin') === cabin, true);
eq('getAeSet tem pilot+cabin', getAeSet('easyjet').pilot === ae && getAeSet('easyjet').cabin === cabin, true);

// ─────────── AE de CABINE (easyJet × SNPVAC, Anexo I Nov-2025) ───────────
eq('Cabine base CM', cabin.BASE_ANNUAL.CM, 23198);
eq('Cabine base FA', cabin.BASE_ANNUAL.FA, 18852);
eq('Cabine nominal CM', cabin.NOMINAL_SECTOR.CM, 32.50);
eq('Cabine nominal FA', cabin.NOMINAL_SECTOR.FA, 21.00);
eq('Cabine categorias', cabin.CATEGORIES.join(','), 'CM,CMP,FA,FA1');
eq('Cabine mensal CM (23198/14)', cabin.monthlyBase('CM'), 1657.00);
eq('Cabine mensal FA1 = SMN', cabin.monthlyBase('FA1'), 870.00);
eq('Cabine mensal FA 8/12', cabin.monthlyBase('FA', { contract: '8/12' }), 897.71);   // 18852×8/12/14
eq('Cabine per diem FA (350,800)', cabin.perDiem('FA', [350, 800]), 42.00);             // 2.0 × 21
eq('Cabine bandas iguais aos pilotos', cabin.sectorMult(350), 0.8);
eq('Cabine pernoita = €46 fixos', cabin.NIGHT_STOP_EUR, 46);
eq('Cabine mês: pernoita não é setor', cabin.computeAeMonth({ category: 'FA', nightStops: 2 }).nightStops, 92);
eq('Cabine contrato fixo-50', cabin.contractFactor('fixo-50'), 0.5);
eq('Cabine label CM en', cabin.categoryLabel('CM', 'en'), 'Cabin Manager');

// ─────────── Calculadoras individuais do AE de cabine (Anexo I) ───────────
eq('Cabine abono falhas CM (5%/12)', cabin.cashHandling('CM'), 96.66);    // 0.05×23198/12
eq('Cabine dia de férias CM (2 NS)', cabin.holidayDay('CM'), 65.00);      // 2×32.50
eq('Cabine terra CM (3 NS)', cabin.office('CM'), 97.50);                   // 3×32.50
eq('Cabine WFLY CM (1% anual)', cabin.wfly('CM'), 231.98);                // 0.01×23198
eq('Cabine RDP CM (máx nominal/piso)', cabin.rdp('CM'), 32.50);
eq('Cabine RDP FA (máx 21/18)', cabin.rdp('FA'), 21.00);
eq('Cabine idioma 3.ª', cabin.language(1), 350);
eq('Cabine idioma +1', cabin.language(2), 400);
eq('Cabine posicionamento CM médio', cabin.positioning('CM', 'medio'), 39.00);
eq('Cabine CTI-Flexi CM (4 NS)', cabin.ctiFlexi('CM'), 130.00);
eq('Cabine ADTY não-chamado ≤4h (1 médio)', cabin.airportStandby('CM', { called: false, over4h: false }), 39.00);
eq('Cabine ADTY não-chamado >4h (2 médios)', cabin.airportStandby('CM', { called: false, over4h: true }), 78.00);
eq('Cabine ADTY chamado ≤4h (0)', cabin.airportStandby('CM', { called: true, over4h: false }), 0);
eq('Cabine doença/dia CM (45%)', cabin.sickDay('CM'), 24.86);
eq('Cabine catálogo (19 cálculos)', cabin.CALCS.length, 19);
eq('Cabine total inclui abono', cabin.computeAeMonth({ category: 'CM', contract: '12/12' }).total, 1753.66);  // 1657+96.66

// ─────────── Papéis adicionais de cabine (additional roles) ───────────
eq('Cabine upranker (€/setor)', cabin.upranker(), 16.27);
eq('Cabine CCLT (€/dia)', cabin.cclt(), 25);
eq('Cabine papéis FA (upranker+CCLT)', cabin.additionalRolesFor('FA').map((r) => r.id).join(','), 'upranker,cclt');
eq('Cabine papéis FA1 (só upranker)', cabin.additionalRolesFor('FA1').map((r) => r.id).join(','), 'upranker');
eq('Cabine papéis CM (CCLT+CTI, sem upranker)', cabin.additionalRolesFor('CM').map((r) => r.id).join(','), 'cclt,cti');
eq('Cabine papéis CMP (upranker+CCLT+CTI)', cabin.additionalRolesFor('CMP').map((r) => r.id).join(','), 'upranker,cclt,cti');
eq('Cabine catalogValue base CM', cabin.catalogValue('base', { category: 'CM' }), 1657.00);
eq('Cabine catalogValue cash CM', cabin.catalogValue('cash', { category: 'CM' }), 96.66);
eq('Cabine catalogValue night', cabin.catalogValue('night', { category: 'CM' }), 46);
eq('Cabine catalogValue perdiem = null', cabin.catalogValue('perdiem', { category: 'CM' }), null);
eq('Cabine catalogValue cti CM', cabin.catalogValue('cti', { category: 'CM' }), 130.00);

// ─────────── Distâncias de aeroportos (OurAirports) → bandas de per diem ───────────
eq('LIS conhecido (IATA)', airportCoord('LIS') != null, true);
eq('LIS por ICAO (LPPT)', airportCoord('LPPT') != null, true);
eq('Código desconhecido → null', airportCoord('ZZZ'), null);
eq('greatCircle nulo se faltar ponto', greatCircleNM(null, { lat: 0, lon: 0 }), null);
// Bandas do Art. 37 a partir de distâncias reais (margens largas → robusto a coords).
eq('LIS–OPO banda curta (×0.8)', sectorMult(sectorDistanceNM('LIS', 'OPO')), 0.8);
eq('LIS–LGW banda média (×1.2)', sectorMult(sectorDistanceNM('LIS', 'LGW')), 1.2);
eq('LIS–JFK banda extra (×2.5)', sectorMult(sectorDistanceNM('LIS', 'JFK')), 2.5);
eq('Aeroporto desconhecido → distância null', sectorDistanceNM('LIS', 'ZZZ'), null);
// Per diem real de uma rotação FO LIS-OPO-LIS (2 setores curtos = 1.6 × 38.76).
eq('Per diem FO LIS-OPO-LIS', perDiem('FO', [sectorDistanceNM('LIS', 'OPO'), sectorDistanceNM('OPO', 'LIS')]), 62.02);

// ─────────── Rota → distâncias → per diem mensal (data/perdiem.js) ───────────
eq('routeDistances LIS-OPO-LIS → 2 setores', routeDistancesNM('LIS-OPO-LIS').length, 2);
eq('routeDistances banda do 1.º setor', sectorMult(routeDistancesNM('LIS-OPO-LIS')[0]), 0.8);
eq('routeDistances rota vazia', routeDistancesNM(null).length, 0);
{
  // 2 voos em junho + 1 em maio; FO. Junho: LIS-OPO-LIS (62.02) + LIS-LGW-LIS (93.02) = 155.04.
  const duties = {
    '2026-06-10': { route: 'LIS-OPO-LIS' },
    '2026-06-12': { route: 'LIS-LGW-LIS' },
    '2026-06-15': { route: null },              // voo sem rota → missing
    '2026-05-30': { route: 'LIS-OPO-LIS' },     // fora do mês
  };
  const r = monthlyPerDiem(duties, 'FO', ae, { ym: '2026-06' });
  eq('Per diem mês: voos com rota', r.withRoute, 2);
  eq('Per diem mês: sem rota', r.missing, 1);
  eq('Per diem mês: total (jun)', r.total, 155.04);
  eq('Per diem mês: sem categoria → null', monthlyPerDiem(duties, null, ae, { ym: '2026-06' }), null);
}

// ── Resumo ──
console.log(`\nAE golden — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Anexo I do AE Easyjet × SPAC (pilotos) bate com o PDF (BTE 40, 2023).');
