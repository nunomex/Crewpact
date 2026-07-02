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
const { aeStatus } = require(path.resolve('ae/index.js'));
const {
  BASE_ANNUAL, NOMINAL_SECTOR, CATEGORIES, SALARY_INSTALMENTS,
  sectorMult, monthlyBase, perDiem, computeAeMonth, categoryLabel,
  CONTRACTS, contractFactor, contractLabel,
} = ae;
const registry = require(path.resolve('ae/index.js'));
const { getAe, hasAe, getAeForProfile, getAeSet } = registry;
const cabin = require(path.resolve('ae/easyjetSnpvac.js'));
const tapPilot = require(path.resolve('ae/tapSpac.js'));
const tapCabin = require(path.resolve('ae/tapSnpvac.js'));
const { airportCoord, greatCircleNM, sectorDistanceNM } = require(path.resolve('data/airports.js'));
const { routeDistancesNM, monthlyPerDiem, monthlyAe, aeMonthTotal } = require(path.resolve('data/perdiem.js'));

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
eq('Piloto doença/dia CPT (60%)', ae.sickDay('CPT'), 174.29);            // 0.60×(122000/14)/30 — Anexo I.10 (dias 1-3)
// Anexo I — itens acrescentados (I.5 ADTY, I.8 benefícios, I.9 permanência, I.11 gravidez, I.14 escritório, I.15 retenção)
eq('Piloto benefícios CPT (€3500)', ae.benefits('CPT'), 3500);
eq('Piloto benefícios FO (€1000)', ae.benefits('FO'), 1000);
eq('Piloto OFC4 CPT (1,5 NS)', ae.office4('CPT'), 118.13);               // 1.5×78.75
eq('Piloto OFC8 CPT (3 NS)', ae.office8('CPT'), 236.25);                 // 3×78.75
eq('Piloto gravidez CPT (35% mensal)', ae.pregnancy('CPT'), 3050.00);    // 0.35×(122000/14)
eq('Piloto retenção CPT (€12000)', ae.retention('CPT'), 12000);
eq('Piloto retenção FO (€6000)', ae.retention('FO'), 6000);
eq('Piloto ADTY não-chamado <4h (1 NS)', ae.airportStandby('CPT', { called: false, over4h: false }), 78.75);
eq('Piloto ADTY não-chamado ≥4h (2 NS)', ae.airportStandby('CPT', { called: false, over4h: true }), 157.50);
eq('Piloto ADTY chamado <4h (0)', ae.airportStandby('CPT', { called: true, over4h: false }), 0);
eq('Piloto ADTY chamado ≥4h (2 NS)', ae.airportStandby('CPT', { called: true, over4h: true }), 157.50);
eq('Piloto permanência CPT 10+ (15%)', ae.loyalty('CPT', { years: 10 }), 18300);   // 0.15×122000
eq('Piloto permanência CPT 5 (10%)', ae.loyalty('CPT', { years: 5 }), 12200);
eq('Piloto permanência CPT 2 (5%)', ae.loyalty('CPT', { years: 2 }), 6100);
eq('Piloto permanência CPT 1 (0)', ae.loyalty('CPT', { years: 1 }), 0);
eq('Piloto permanência SFO 3 (5%)', ae.loyalty('SFO', { years: 3 }), 3450);        // 0.05×69000
eq('Piloto permanência FO (sempre 0)', ae.loyalty('FO', { years: 20 }), 0);
eq('Piloto permanência CPT 10 part-time 9/12', ae.loyalty('CPT', { years: 10, contract: 'PPY 9/12' }), 13725);  // 18300×0.75
eq('Piloto catalogValue loyalty CPT 5a', ae.catalogValue('loyalty', { category: 'CPT', years: 5 }), 12200);
eq('Piloto catálogo (19 cálculos)', ae.CALCS.length, 19);
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
eq('getAe sem AE → null', getAe('jet2'), null);
eq('hasAe easyjet', hasAe('easyjet'), true);
eq('hasAe fora do registry (jet2)', hasAe('jet2'), false);
// Registry manda (3 estados): pilotos↔SPAC, cabine↔SNPVAC. rule_type NÃO é consultado.
eq('AE: easyjet + piloto → SPAC', getAeForProfile({ company: { slug: 'easyjet', rule_type: 'AE' }, crewType: 'pilot' }) === ae, true);
eq('AE: easyjet + cabine → SNPVAC', getAeForProfile({ company: { slug: 'easyjet', rule_type: 'AE' }, crewType: 'cabin' }) === cabin, true);
eq('AE: fora do registry → null', getAeForProfile({ company: { slug: 'jet2', rule_type: 'FTL' }, crewType: 'pilot' }), null);
eq('AE: registry manda mesmo com rule_type FTL', getAeForProfile({ company: { slug: 'easyjet', rule_type: 'FTL' }, crewType: 'pilot' }) === ae, true);
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
eq('Cabine mensal FA1 = SMN', cabin.monthlyBase('FA1'), 920.00);   // SMN 2026 (DL 139/2025)
eq('Cabine mensal FA 8/12', cabin.monthlyBase('FA', { contract: '8/12' }), 897.71);   // 18852×8/12/14
eq('Cabine per diem FA (350,800)', cabin.perDiem('FA', [350, 800]), 42.00);             // 2.0 × 21
eq('Cabine bandas iguais aos pilotos', cabin.sectorMult(350), 0.8);
eq('Cabine pernoita = €46 fixos', cabin.NIGHT_STOP_EUR, 46);
eq('Cabine pernoita função = €46', cabin.nightStop('FA'), 46);
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
eq('Cabine catálogo (20 cálculos)', cabin.CALCS.length, 20);
eq('Cabine total inclui abono', cabin.computeAeMonth({ category: 'CM', contract: '12/12' }).total, 1753.66);  // 1657+96.66

// ─────────── Papéis adicionais de cabine (additional roles) ───────────
eq('Cabine upranker (€/setor)', cabin.upranker(), 16.27);
eq('Cabine CCLT (€/dia)', cabin.cclt(), 25);
eq('Cabine papéis FA (upranker+CTI)', cabin.additionalRolesFor('FA').map((r) => r.id).join(','), 'upranker,cti');
eq('Cabine papéis FA1 (upranker+CTI)', cabin.additionalRolesFor('FA1').map((r) => r.id).join(','), 'upranker,cti');
eq('Cabine papéis CM (CCLT+CTI, sem upranker)', cabin.additionalRolesFor('CM').map((r) => r.id).join(','), 'cclt,cti');
eq('Cabine papéis CMP (upranker+CCLT+CTI)', cabin.additionalRolesFor('CMP').map((r) => r.id).join(','), 'upranker,cclt,cti');

// ── Estado do AE — 3 estados honestos (modeled / pending / none) ──
eq('aeStatus easyJet piloto = modeled', aeStatus({ company: { slug: 'easyjet', rule_type: 'AE' }, crewType: 'pilot' }), 'modeled');
eq('aeStatus easyJet cabine = modeled', aeStatus({ company: { slug: 'easyjet', rule_type: 'AE' }, crewType: 'cabin' }), 'modeled');
eq('aeStatus TAP piloto = modeled', aeStatus({ company: { slug: 'tap', rule_type: 'AE' }, crewType: 'pilot' }), 'modeled');
eq('aeStatus TAP cabine = modeled', aeStatus({ company: { slug: 'tap', rule_type: 'AE' }, crewType: 'cabin' }), 'modeled');
eq('aeStatus pending por flag (cabine)', aeStatus({ company: { slug: 'jet2', rule_type: 'FTL', ae_pending_cabin: true }, crewType: 'cabin' }), 'pending');
eq('aeStatus none quando flag do piloto off', aeStatus({ company: { slug: 'jet2', rule_type: 'FTL', ae_pending_cabin: true }, crewType: 'pilot' }), 'none');
eq('aeStatus none sem AE (FTL puro)', aeStatus({ company: { slug: 'ryanair', rule_type: 'FTL' }, crewType: 'pilot' }), 'none');
eq('Cabine catalogValue base CM', cabin.catalogValue('base', { category: 'CM' }), 1657.00);
eq('Cabine catalogValue cash CM', cabin.catalogValue('cash', { category: 'CM' }), 96.66);
eq('Cabine catalogValue night', cabin.catalogValue('night', { category: 'CM' }), 46);
eq('Cabine catalogValue perdiem = null', cabin.catalogValue('perdiem', { category: 'CM' }), null);
eq('Cabine catalogValue cti CM', cabin.catalogValue('cti', { category: 'CM' }), 130.00);

// ── Cabine — paridade com pilotos: bónus (Cl. 63), catalogFor, extras do mês ──
eq('Cabine bónus CM (2 semanas)', cabin.perfBonus('CM'), 892.23);      // 23198×2/52
eq('Cabine bónus FA (2 semanas)', cabin.perfBonus('FA'), 725.08);      // 18852×2/52
eq('Cabine bónus FA1 (SMN×14×2/52)', cabin.perfBonus('FA1'), 495.38);  // 12880×2/52 (SMN 920)
eq('Cabine bónus CM part-time 50%', cabin.perfBonus('CM', { contract: 'fixo-50' }), 446.12);  // ×0.5
eq('Cabine catalogValue bónus CM', cabin.catalogValue('bonus', { category: 'CM' }), 892.23);
// catalogFor esconde papéis (upranker/cclt/cti), mantém office/bonus
{
  const ids = cabin.catalogFor('CM', '12/12').map((c) => c.id);
  eq('Cabine catalogFor sem upranker', ids.includes('upranker'), false);
  eq('Cabine catalogFor sem cti', ids.includes('cti'), false);
  eq('Cabine catalogFor com office', ids.includes('office'), true);
  eq('Cabine catalogFor com bónus', ids.includes('bonus'), true);
}
// Extras do mês (cabine)
eq('Cabine extras vazio → 0', cabin.monthExtras('CM', {}).total, 0);
eq('Cabine extras CM férias×2 + ddo×1 + snc×3', cabin.monthExtras('CM', { vacDays: 2, ddo: 1, snc: 3 }).total, 305);  // 130 + 115 + 60
eq('Cabine extras CM doença paga×4', cabin.monthExtras('CM', { sickDays: 4 }).total, 99.44);  // 4×24.86
eq('Cabine extras CM rdp×1', cabin.monthExtras('CM', { rdp: 1 }).total, 32.50);
eq('Cabine EXTRA_KINDS (7)', cabin.EXTRA_KINDS.length, 7);
eq('Cabine EXTRA_KINDS snc é auto', cabin.EXTRA_KINDS.find((k) => k.id === 'snc').auto, true);

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
  // POSICIONAMENTO com rota NÃO tem per-diem (Art. 37 = setor VOADO; posicionamento paga só a
  // pernoita à parte). A rota no posicionamento serve o repouso 235 (local real), não o abono.
  const dPos = { ...duties, '2026-06-20': { route: 'LIS-MAD', kind: 'positioning' } };
  const rPos = monthlyPerDiem(dPos, 'FO', ae, { ym: '2026-06' });
  eq('Per diem mês: posicionamento c/ rota NÃO soma', rPos.total, 155.04);
  eq('Per diem mês: posicionamento não conta como voo-com-rota', rPos.withRoute, 2);
  // O mesmo vale na TAP (per-diem por DIA de voo — um dia de posicionamento não é dia de voo).
  const rTap = monthlyPerDiem({ '2026-06-20': { route: 'LIS-MAD', kind: 'positioning' } }, 'CAB3', tapCabin, { ym: '2026-06' });
  eq('TAP: dia de posicionamento c/ rota → per-diem 0', rTap.total, 0);
}

// ── ADTY FINO no mês automático (Anexo I.5 piloto / Art. 58 cabine) ──
{
  const sb = (rep, on) => ({ report_time: rep, block_on: on, kind: 'standby_airport' });
  // Não-chamado ≥4h (08:00→20:00) → 2 setores nominais (FO: 77.52).
  eq('ADTY mês: não-chamado ≥4h = 2 NS', monthlyAe({ '2026-06-10': sb('08:00', '20:00') }, 'FO', '12/12', ae, { ym: '2026-06' }).extras, 77.52);
  // Não-chamado <4h (08:00→11:00) → 1 setor nominal (38.76) — antes pagava 2 achatados.
  eq('ADTY mês: não-chamado <4h = 1 NS', monthlyAe({ '2026-06-10': sb('08:00', '11:00') }, 'FO', '12/12', ae, { ym: '2026-06' }).extras, 38.76);
  // CHAMADO <4h (standby 2h + VOO no mesmo dia) → 0 (fica só o per-diem do voo).
  const called = { '2026-06-10': { ...sb('06:00', '08:00'), extra: [{ report_time: '09:00', block_on: '13:00', kind: 'flight', route: 'LIS-OPO-LIS' }] } };
  eq('ADTY mês: chamado <4h = 0', monthlyAe(called, 'FO', '12/12', ae, { ym: '2026-06' }).extras, 0);
  eq('ADTY mês: chamado — per-diem do voo mantém-se', monthlyAe(called, 'FO', '12/12', ae, { ym: '2026-06' }).perDiem, 62.02);
  // Voo com standby de AEROPORTO prévio declarado (special 225, 5h) = chamado ≥4h → 2 NS.
  const viaSpecial = { '2026-06-11': { report_time: '12:00', block_on: '18:00', kind: 'flight', route: 'LIS-OPO-LIS', special: { preStandby: { type: 'airport', standbyH: 5 } } } };
  eq('ADTY mês: voo c/ preStandby 5h aeroporto = 2 NS', monthlyAe(viaSpecial, 'FO', '12/12', ae, { ym: '2026-06' }).extras, 77.52);
  // CABINE (Art. 58): matriz em setores MÉDIOS — CM não-chamado ≥4h = 2×1,2×32,50 = 78 € (não 2 NS=65).
  eq('ADTY mês cabine: 2 setores MÉDIOS (78 €)', monthlyAe({ '2026-06-10': sb('08:00', '20:00') }, 'CM', '12/12', cabin, { ym: '2026-06' }).extras, 78);
  // TAP: o AE não tem o item ADTY → não se inventa prestação (total = base).
  eq('TAP mês: standby aeroporto sem prestação (total = base)', monthlyAe({ '2026-06-10': sb('08:00', '20:00') }, 'CTE', '12/12', tapPilot, { ym: '2026-06' }).total, 8287.50);
}

// ── Caminho único do total AE (aeMonthTotal) — abono UMA vez + extras ──
{
  // Cabine sem duties: total = base + abono (1657 + 96.66) — NÃO 1850.32 (abono uma vez).
  eq('aeMonthTotal cabine s/ extras (abono 1×)', aeMonthTotal({}, 'CM', '12/12', cabin, { ym: '2099-01' }), 1753.66);
  eq('aeMonthTotal cabine + DDO×1', aeMonthTotal({}, 'CM', '12/12', cabin, { ym: '2099-01', extras: { ddo: 1 } }), 1868.66);  // +115
  // Piloto (sem abono): base + extras.
  eq('aeMonthTotal piloto s/ extras', aeMonthTotal({}, 'CPT', '12/12', ae, { ym: '2099-01' }), 8714.29);
  eq('aeMonthTotal piloto + instrutor×1', aeMonthTotal({}, 'CPT', '12/12', ae, { ym: '2099-01', extras: { instructorDays: 1 } }), 8834.29);  // +120
  eq('aeMonthTotal sem categoria → null', aeMonthTotal({}, null, '12/12', ae, { ym: '2099-01' }), null);
}

// ── Catálogo aplicável por categoria/contrato (filtro Passo 2) ──
{
  const ids = (cat, ctr) => ae.catalogFor(cat, ctr).map((c) => c.id);
  const cpt = ids('CPT', '12/12'), fo = ids('FO', '12/12');
  eq('catálogo: instrutor fora do catálogo (papel adicional)', cpt.includes('instr') || fo.includes('instr'), false);
  eq('catálogo: permanência — CPT sim', cpt.includes('loyalty'), true);
  eq('catálogo: permanência — FO não', fo.includes('loyalty'), false);
  eq('catálogo: retenção escondida em 12/12', cpt.includes('retention'), false);
  eq('catálogo: retenção aparece em sazonal (PPY 8/12)', ids('CPT', 'PPY 8/12').includes('retention'), true);
  eq('catálogo: retenção ESCONDIDA em PPY estilo de vida (Art. 66.9)', ae.catalogFor('CPT', 'PPY 8/12', { lifestyle: true }).map((c) => c.id).includes('retention'), false);
  eq('catálogo: per-diem a todos (FO)', fo.includes('perdiem'), true);
  eq('catálogo: benefícios a todos (SO)', ids('SO', '12/12').includes('benefits'), true);
  eq('catálogo: bónus de performance a todos (FO)', fo.includes('bonus'), true);
}

// ── Indexação 2025+ (Anexo I.1/I.2): piso 1% / teto 5%, IPC oficial 2,4% (BTE/INE) ──
eq('index 2024 = 1', ae.indexFactor(2024), 1);
eq('index 2025 = IPC 2,4% (BTE/INE)', ae.indexFactor(2025), 1.024);
eq('index 2026 = mantém 2025 (sem degrau)', ae.indexFactor(2026), 1.024);
eq('index 2025 com IPC oficial 3%', ae.indexFactor(2025, { ipc2025: 0.03 }), 1.03);
eq('index 2025 IPC 8% → teto 5%', ae.indexFactor(2025, { ipc2025: 0.08 }), 1.05);
eq('index 2025 IPC 0,5% → piso 1%', ae.indexFactor(2025, { ipc2025: 0.005 }), 1.01);
eq('index estimado 2024 = false', ae.isIndexEstimated(2024), false);
eq('index estimado 2025 = false (IPC oficial confirmado)', ae.isIndexEstimated(2025), false);
eq('index estimado 2025 c/ ipc:null = true (ramo estimativa)', ae.isIndexEstimated(2025, { ipc2025: null }), true);
eq('index estimado 2025 c/ IPC = false', ae.isIndexEstimated(2025, { ipc2025: 0.03 }), false);
eq('base CPT indexada 2025 (×1.024)', ae.monthlyBase('CPT', { index: ae.indexFactor(2025) }), 8923.43);  // 122000×1.024/14

// ── Vigência do AE (BTE 40/2023): expira 31 jan 2026 → valores de 2026 são referência ──
eq('AE vigência até jan-2026', ae.AE_VALID_UNTIL, '2026-01-31');
eq('AE não expirado em jan-2026', ae.isAgreementExpired(new Date('2026-01-15')), false);
eq('AE expirado em jun-2026', ae.isAgreementExpired(new Date('2026-06-23')), true);
eq('AE pilotos expirado-RECONHECIDO (§5/§9)', !!(ae.AE_EXPIRY_ACK && ae.AE_EXPIRY_ACK.acknowledged), true);
eq('AE ack tem data de verificação (checked)', typeof (ae.AE_EXPIRY_ACK || {}).checked, 'string');
// Cabine (SNPVAC): vigência até 31 jan 2027 → ainda NÃO expirada; mecanismo de vigência presente.
eq('Cabine vigência até jan-2027', cabin.AE_VALID_UNTIL, '2027-01-31');
eq('Cabine não expirada em jun-2026', cabin.isAgreementExpired(new Date('2026-06-23')), false);
eq('Cabine expirada em fev-2027', cabin.isAgreementExpired(new Date('2027-02-01')), true);

// ── Art. 46 — bónus de performance anual (alvo, por categoria) ──
eq('bónus CPT (10% base)', ae.perfBonus('CPT'), 12200);          // 0.10×122000
eq('bónus SFO (10% base)', ae.perfBonus('SFO'), 6900);           // 0.10×69000
eq('bónus FO (7,5% base)', ae.perfBonus('FO'), 3581.25);         // 0.075×47750
eq('bónus SO (5% base)', ae.perfBonus('SO'), 1931.25);           // 0.05×38625
eq('bónus CPT teto (20%)', ae.perfBonus('CPT', { max: true }), 24400);
eq('bónus CPT part-time 9/12', ae.perfBonus('CPT', { contract: 'PPY 9/12' }), 9150);  // 12200×0.75
eq('bónus CPT indexado 2025', ae.perfBonus('CPT', { index: 1.01 }), 12322);           // 12200×1.01
eq('catalogValue bónus FO', ae.catalogValue('bonus', { category: 'FO' }), 3581.25);

// ── DDO/IDO/WFLY/doença indexáveis (% da base → crescem com a indexação) ──
eq('DDO CPT indexado 2025', ae.ddo('CPT', 1.01), 492.88);     // 488×1.01
eq('IDO CPT indexado 2025', ae.ido('CPT', 1.01), 985.76);     // 976×1.01
eq('WFLY CPT indexado 2025', ae.wfly('CPT', 1.01), 1232.20);  // 1220×1.01
eq('DDO CPT base (index 1) inalterado', ae.ddo('CPT'), 488.00);

// ── Passo 4 — "Extras do mês" (contadores → €) ──
eq('extras vazio → 0', ae.monthExtras('CPT', {}).total, 0);
eq('extras vazio → sem itens', ae.monthExtras('CPT', {}).items.length, 0);
eq('extras CPT instrutor×2 + ddo×1 + snc×3',
  ae.monthExtras('CPT', { instructorDays: 2, ddo: 1, snc: 3 }).total, 908);   // 240 + 488 + 180
eq('extras doença cap 3 (de 5)', ae.monthExtras('CPT', { sickDays: 5 }).total, 522.87);  // 3×174.29
eq('extras saneia negativos/decimais', ae.monthExtras('CPT', { adhocDays: -2, ido: 1.9 }).total, 976.00); // ido×1
eq('extras indexados (ddo×1 @1.01)', ae.monthExtras('CPT', { ddo: 1 }, { index: 1.01 }).total, 492.88);
eq('extras instrutor universal (FO)', ae.monthExtras('FO', { instructorDays: 1 }).total, 120);  // não trancado por categoria
eq('EXTRA_KINDS (8)', ae.EXTRA_KINDS.length, 8);
eq('EXTRA_KINDS snc é auto', ae.EXTRA_KINDS.find((k) => k.id === 'snc').auto, true);

// ═══════════ AE TAP × SPAC (pilotos) — BTE 29/2023, Anexo 3 ═══════════
// VB-base 2023 = golden (Tabela A-3.1); VB atualizado nunca publicado → índice +3%/ano (estimado).
eq('TAP registado (pilot)', getAe('tap') === tapPilot, true);
eq('TAP registado (cabin)', getAe('tap', 'cabin') === tapCabin, true);
eq('TAP hasAe', hasAe('tap'), true);
eq('TAP getAeSet pilot+cabin', getAeSet('tap').pilot === tapPilot && getAeSet('tap').cabin === tapCabin, true);
eq('TAP getAeForProfile piloto', getAeForProfile({ company: { slug: 'tap', rule_type: 'AE' }, crewType: 'pilot' }) === tapPilot, true);
eq('TAP getAeForProfile cabine', getAeForProfile({ company: { slug: 'tap', rule_type: 'AE' }, crewType: 'cabin' }) === tapCabin, true);
// Tabela A-3.1 — VB base 2023 (golden, verbatim do BTE)
eq('TAP VB CTE 2023', tapPilot.VB_2023.CTE, 8125);
eq('TAP VB OP3C 2023', tapPilot.VB_2023.OP3C, 6500);
eq('TAP VB OP3 2023', tapPilot.VB_2023.OP3, 6050);
eq('TAP VB OP2 2023', tapPilot.VB_2023.OP2, 5200);
eq('TAP VB OP1 2023', tapPilot.VB_2023.OP1, 4420);
eq('TAP categorias', tapPilot.CATEGORIES.join(','), 'CTE,OP3C,OP3,OP2,OP1');
eq('TAP categoria CTE pt', tapPilot.categoryLabel('CTE', 'pt'), 'Comandante');
eq('TAP categoria OP1 en', tapPilot.categoryLabel('OP1', 'en'), 'First Officer 1');
// Base mensal = VB × (1 + VE 2%) (índice 1 = 2023)
eq('TAP base CTE (VB+VE, 2023)', tapPilot.monthlyBase('CTE'), 8287.50);   // 8125×1.02
eq('TAP base OP1 (VB+VE, 2023)', tapPilot.monthlyBase('OP1'), 4508.40);   // 4420×1.02
eq('TAP base OP3 (VB+VE, 2023)', tapPilot.monthlyBase('OP3'), 6171.00);   // 6050×1.02
// Per diem (Tabela A-3.2) — por dia, coluna por operação (MC-NB < 2000NM ≤ WB/LC-NB). Não indexado.
eq('TAP per diem CTE médio-courier (500NM)', tapPilot.perDiem('CTE', [500]), 270);
eq('TAP per diem CTE long-courier (3000NM)', tapPilot.perDiem('CTE', [3000]), 300);
eq('TAP per diem OP médio-courier (500NM)', tapPilot.perDiem('OP1', [500]), 202.50);
eq('TAP per diem OP long-courier (3000NM)', tapPilot.perDiem('OP1', [3000]), 225);
eq('TAP per diem sem voo → 0', tapPilot.perDiem('CTE', []), 0);
// Frota (WB cobra SEMPRE WB/LC-NB; NB/ausente = por operação/distância)
eq('TAP FLEETS', tapPilot.FLEETS.join(','), 'NB,WB');
eq('TAP fleetLabel WB en', tapPilot.fleetLabel('WB', 'en'), 'Wide-body (A330/A350)');
eq('TAP per diem CTE WB curto = A_lc (300)', tapPilot.perDiem('CTE', [500], 1, 'WB'), 300);
eq('TAP per diem CTE NB curto = MC (270)', tapPilot.perDiem('CTE', [500], 1, 'NB'), 270);
eq('TAP per diem OP WB curto = A_lc (225)', tapPilot.perDiem('OP1', [500], 1, 'WB'), 225);
eq('TAP per diem WB sem voo → 0', tapPilot.perDiem('CTE', [], 1, 'WB'), 0);
eq('TAP mês CTE WB: per diem curto = 300', tapPilot.computeAeMonth({ category: 'CTE', duties: [[500]], fleet: 'WB' }).perDiem, 300);
eq('TAP mês CTE NB: per diem curto = 270', tapPilot.computeAeMonth({ category: 'CTE', duties: [[500]], fleet: 'NB' }).perDiem, 270);
// Pernoita = Per diem B (estadia)
eq('TAP pernoita CTE (per diem B)', tapPilot.nightStop('CTE'), 180);
eq('TAP pernoita OP (per diem B)', tapPilot.nightStop('OP1'), 135);
// Comando em cruzeiro, vencimento horário (A-3.3), senioridade
eq('TAP comando em cruzeiro', tapPilot.comando(), 200);
eq('TAP hora L1 CTE (3% VB)', tapPilot.hourly('CTE', 1), 243.75);   // 0.03×8125
eq('TAP hora L2 CTE (6% VB)', tapPilot.hourly('CTE', 2), 487.50);   // 0.06×8125
eq('TAP hora L1 OP1 (3% VB)', tapPilot.hourly('OP1', 1), 132.60);   // 0.03×4420
eq('TAP senioridade CTE (1,5% VB)', tapPilot.vs('CTE'), 121.88);    // 0.015×8125
// Estimativa mensal (base + per diem + pernoita)
{
  const r = tapPilot.computeAeMonth({ category: 'CTE', duties: [[500]], nightStops: 1 });
  eq('TAP mês CTE: base', r.base, 8287.50);
  eq('TAP mês CTE: per diem', r.perDiem, 270);
  eq('TAP mês CTE: pernoita', r.nightStops, 180);
  eq('TAP mês CTE: variável', r.variable, 450);
  eq('TAP mês CTE: total', r.total, 8737.50);
}
// Índice de atualização (+3%/ano, sempre estimado) e vigência
eq('TAP index 2023 = 1', tapPilot.indexFactor(2023), 1);
eq('TAP index 2024 = +3%', tapPilot.indexFactor(2024), 1.03);
eq('TAP index 2026 = (1.03)^3', tapPilot.indexFactor(2026), 1.092727);
eq('TAP index 2027 congela (fim vigência)', tapPilot.indexFactor(2027), 1.092727);   // sem teto sobrestimaria
eq('TAP index 2030 ainda congelado', tapPilot.indexFactor(2030), 1.092727);
eq('TAP index sempre estimado (2024)', tapPilot.isIndexEstimated(2024), true);
eq('TAP index 2023 não estimado', tapPilot.isIndexEstimated(2023), false);
eq('TAP base CTE indexada 2026', tapPilot.monthlyBase('CTE', { index: tapPilot.indexFactor(2026) }), 9055.98);  // 8125×1.092727×1.02
eq('TAP vigência até dez-2026', tapPilot.AE_VALID_UNTIL, '2026-12-31');
eq('TAP não expirado em jun-2026', tapPilot.isAgreementExpired(new Date('2026-06-23')), false);
eq('TAP expirado em jan-2027', tapPilot.isAgreementExpired(new Date('2027-01-02')), true);
// Catálogo + papéis + extras
eq('TAP catalogValue base CTE', tapPilot.catalogValue('base', { category: 'CTE' }), 8287.50);
eq('TAP catalogValue night CTE', tapPilot.catalogValue('night', { category: 'CTE' }), 180);
eq('TAP catalogValue perdiem = null', tapPilot.catalogValue('perdiem', { category: 'CTE' }), null);
eq('TAP catalogValue vs CTE', tapPilot.catalogValue('vs', { category: 'CTE' }), 121.88);
eq('TAP catálogo: VS só CTE', tapPilot.catalogFor('CTE').map((c) => c.id).includes('vs'), true);
eq('TAP catálogo: VS escondido p/ OP1', tapPilot.catalogFor('OP1').map((c) => c.id).includes('vs'), false);
eq('TAP sem papéis adicionais', tapPilot.additionalRolesFor('CTE').length, 0);
eq('TAP extras comando×2', tapPilot.monthExtras('CTE', { comandoSectors: 2 }).total, 400);
eq('TAP extras horas L1×1 CTE', tapPilot.monthExtras('CTE', { hoursL1: 1 }).total, 243.75);
eq('TAP contratos', tapPilot.CONTRACTS.join(','), '12/12');

// ═══════════ AE TAP × SNPVAC (cabine) — BTE 7/2024, coluna 2026 (golden) ═══════════
eq('TAP cabine VB CAB0 = RMMG', tapCabin.VB_2026.CAB0, 920);
eq('TAP cabine VB CAB1 2026', tapCabin.VB_2026.CAB1, 1214.68);
eq('TAP cabine VB CAB3 2026', tapCabin.VB_2026.CAB3, 2020.73);
eq('TAP cabine VB SC7 2026', tapCabin.VB_2026.SC7, 3287.57);
eq('TAP cabine RMMG 2026', tapCabin.NMW_MONTHLY, 920);
eq('TAP cabine 13 escalões', tapCabin.CATEGORIES.length, 13);
eq('TAP cabine categorias', tapCabin.CATEGORIES.join(','), 'CAB0,CAB1,CAB2,CAB3,CAB4,CAB5,SC1,SC2,SC3,SC4,SC5,SC6,SC7');
eq('TAP cabine base CAB0', tapCabin.monthlyBase('CAB0'), 920);
eq('TAP cabine base CAB3', tapCabin.monthlyBase('CAB3'), 2020.73);
eq('TAP cabine base SC7', tapCabin.monthlyBase('SC7'), 3287.57);
// Ajudas de custo (cl. 7.ª) — por dia, valor único 2026
eq('TAP cabine AC1 (dia de voo)', tapCabin.perDiem('CAB3', [500]), 150);
eq('TAP cabine AC1 long-haul = mesmo', tapCabin.perDiem('SC1', [3000]), 150);
eq('TAP cabine AC1 sem voo → 0', tapCabin.perDiem('CAB3', []), 0);
eq('TAP cabine pernoita AC2', tapCabin.nightStop('CAB3'), 80);
eq('TAP cabine pernoita SC = mesmo', tapCabin.nightStop('SC1'), 80);
// Vencimento horário (2,5% VB), senioridade (1%/ano), complemento extraordinário
eq('TAP cabine VH CAB3 (2,5% VB)', tapCabin.vh('CAB3'), 50.52);          // 0.025×2020.73
eq('TAP cabine VS CAB3 5 anos (5%)', tapCabin.vs('CAB3', 5), 101.04);    // 0.05×2020.73
eq('TAP cabine VS 0 anos = 0', tapCabin.vs('CAB3', 0), 0);
eq('TAP cabine compl. extraordinário', tapCabin.extraord(), 40);
// Estimativa mensal
{
  const r = tapCabin.computeAeMonth({ category: 'CAB3', duties: [[500], [600]], nightStops: 1 });
  eq('TAP cabine mês: base', r.base, 2020.73);
  eq('TAP cabine mês: per diem (2 dias)', r.perDiem, 300);
  eq('TAP cabine mês: pernoita', r.nightStops, 80);
  eq('TAP cabine mês: total', r.total, 2400.73);
}
// Catálogo + extras
eq('TAP cabine catalogValue base CAB3', tapCabin.catalogValue('base', { category: 'CAB3' }), 2020.73);
eq('TAP cabine catalogValue vh CAB3', tapCabin.catalogValue('vh', { category: 'CAB3' }), 50.52);
eq('TAP cabine catalogValue natal CAB3 (VB+VS0)', tapCabin.catalogValue('natal', { category: 'CAB3' }), 2020.73);
eq('TAP cabine catalogValue perdiem = null', tapCabin.catalogValue('perdiem', { category: 'CAB3' }), null);
eq('TAP cabine chefia só S/C', tapCabin.catalogFor('SC1').map((c) => c.id).includes('chefia'), true);
eq('TAP cabine chefia escondida p/ CAB3', tapCabin.catalogFor('CAB3').map((c) => c.id).includes('chefia'), false);
eq('TAP cabine extras assistência×2', tapCabin.monthExtras('CAB3', { extraordDays: 2 }).total, 80);
eq('TAP cabine extras horas×2', tapCabin.monthExtras('CAB3', { vhHours: 2 }).total, 101.04);  // 2×50.52
eq('TAP cabine categoria CAB0 pt', tapCabin.categoryLabel('CAB0', 'pt'), 'Tripulante (CAB 0)');
eq('TAP cabine categoria SC1 en', tapCabin.categoryLabel('SC1', 'en'), 'Supervisor (S/C 1)');
eq('TAP cabine vigência até dez-2026', tapCabin.AE_VALID_UNTIL, '2026-12-31');

// ── Resumo ──
console.log(`\nAE golden — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ Anexo I do AE Easyjet × SPAC (pilotos) bate com o PDF (BTE 40, 2023).');
