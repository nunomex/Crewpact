/*
 * Golden do DINHEIRO A MENOS — auditoria dos cálculos, bloco 6 (L1–L11, L13), 2026-11-06.
 * Cada valor esperado sai do texto oficial guardado em fontes/ (o teste confirma também que a frase está lá):
 *  · fontes/ae-easyjet/  AE easyJet × SNPVAC (cabine, BTE 8/2024) e × SPAC (pilotos, BTE 40/2023)
 *  · fontes/ae-tap/      AE TAP × SNPVAC (cabine, BTE 7/2024) e × SPAC (pilotos, BTE 29/2023)
 * Os números NÃO vêm do código nem dos outros goldens: são contas à mão sobre o texto (regra "golden-first").
 * Regra do Nuno (2026-11-06): "a lei é que manda". Onde falta um facto (a média das variáveis no subsídio, a duração da
 * viagem no posicionamento da cabine, o tipo de formação na TAP), o motor diz o que é certo, marca o resto como incerto e
 * nunca inventa o que falta.
 * Executar:  node scripts/dinheiro-menos.test.js   (ou: npm run test:dinheiro-menos)
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
const cab = R('ae/easyjetSnpvac.js');
const pil = R('ae/easyjetSpac.js');
const tapC = R('ae/tapSnpvac.js');
const tapP = R('ae/tapSpac.js');
const { eventCounts } = R('data/aeEvents.js');
const { monthlyAe, serviceMoney, awayNights } = R('data/perdiem.js');
const { yearStats, monthStats } = R('data/stats.js');
const { evaluateDisruption } = R('data/disruption.js');
const { dutyFromActivity } = R('data/rosterImport.js');

const flat = (s) => s.normalize('NFC').replace(/\r/g, '').replace(/\s+/g, ' ');   // NFC: há linhas do BTE com acentos decompostos
const src = (f) => flat(fs.readFileSync(path.resolve('fontes', f), 'utf8'));
const CAB = src('ae-easyjet/easyjet-snpvac-2024.txt');
const PIL = src('ae-easyjet/easyjet-spac-2023.txt');
const TAPC = src('ae-tap/tap-snpvac-2024.txt');
const TAPP = src('ae-tap/tap-spac-2023.txt');

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; fails.push(`  ✗ ${name}\n      lei:   ${w}\n      motor: ${g}`); }
};
const has = (name, txt, phrase) => { if (txt.includes(flat(phrase))) pass++; else { fail++; fails.push(`  ✗ ${name}: frase não encontrada na fonte → "${phrase}"`); } };
const item = (list, id) => (list || []).find((i) => i.id === id) || null;
const eur = (list, id) => { const i = item(list, id); return i ? i.eur : null; };
const days = (from, n, type) => {
  const out = []; const [y, m, d] = from.split('-').map(Number);
  for (let i = 0; i < n; i++) { const dt = new Date(Date.UTC(y, m - 1, d + i)); out.push({ id: `${type}${i}`, date: dt.toISOString().slice(0, 10), type }); }
  return out;
};

// ═══ L1 · Subsídios de férias e de Natal ═══════════════════════════════════════════════════════════════════════════════
// Cabine easyJet — Cl. 50.ª/1 e Cl. 51.ª
has('Cl. 51.ª/1 (junho e novembro)', CAB, 'Os subsídios de férias e Natal serão pagos em junho e novembro, respetivamente, e serão pagos propor- cionalmente nos anos de contratação e cessação');
has('Cl. 51.ª/2 (férias = 1/14 + média do variável)', CAB, 'O subsídio de férias corresponderá a um mês de salário base (1/14 da remuneração base anual) acrescido de uma média do pagamento variável do tripulante');
has('Cl. 51.ª/3 (Natal = 1/14)', CAB, 'O subsídio de natal corresponderá exclusivamente a um mês de retribuição base (1/14 da remuneração base anual) acrescido de 1/14 do subsídio de idioma quando aplicável');
has('Cl. 51.ª/4 (ano da contratação)', CAB, 'No ano da contratação em Portugal, o pagamento do subsídio de férias será proporcional e pago em junho. Os restantes meses serão pagos no mês de janeiro seguinte');
has('Cl. 48.ª/9 (9/3: média dos 12 meses)', CAB, 'Os subsídios de férias e de natal são calculados com base na média dos valores de retribuição base rece- bidos nos últimos 12 (doze) meses de contrato');
{
  // FA 12/12, 2026: base anual 18 852 € (Anexo I.1) → 1/14 = 1 346,57 €. Abono para falhas 5 % ÷ 12 = 78,55 €.
  const nov = cab.annualItems('FA', { ym: '2026-11' });
  eq('cabine FA nov-2026: subsídio de Natal 1/14', eur(nov, 'natal'), 1346.57);
  eq('cabine FA nov-2026: Natal incompleto (o 1/14 do subsídio de idioma a app não sabe)', !!item(nov, 'natal').incomplete, true);
  const m = monthlyAe({}, 'FA', '12/12', cab, { ym: '2026-11' });
  eq('cabine FA nov-2026: total do mês = base + abono + Natal', m.total, 2771.69);
  eq('cabine FA nov-2026: parcela dos subsídios', m.annual, 1346.57);
  const jun = cab.annualItems('FA', { ym: '2026-06' });
  eq('cabine FA jun-2026: subsídio de férias (parte certa)', eur(jun, 'ferias'), 1346.57);
  eq('cabine FA jun-2026: falta a média do variável (incerto)', !!item(jun, 'ferias').incomplete, true);
  eq('cabine FA out-2026: sem subsídios', cab.annualItems('FA', { ym: '2026-10' }).length, 0);
  // 9/3: média do ano (9 × 100 % + 3 × 25 %) / 12 = 81,25 % → 18 852 × 0,8125 / 14 = 1 094,09 € (nunca o mês de atividade).
  eq('cabine FA 9/3 nov-2026: Natal pela média', eur(cab.annualItems('FA', { ym: '2026-11', contract: '9/3', fullShare: 1 }), 'natal'), 1094.09);
  // FA1 2026 = salário mínimo 920 € × 14 / 14.
  eq('cabine FA1 nov-2026: Natal', eur(cab.annualItems('FA1', { ym: '2026-11' }), 'natal'), 920);
  // Ano da contratação (março de 2026): Natal 10/12 = 1 122,14 €; férias em junho pelos meses até junho (4/12 = 448,86 €)
  // e o resto (julho a dezembro, 6/12 = 673,29 €) em janeiro de 2027.
  const ss = '2026-03-01';
  eq('cabine admissão mar-2026: Natal 10/12', eur(cab.annualItems('FA', { ym: '2026-11', serviceStart: ss }), 'natal'), 1122.14);
  eq('cabine admissão mar-2026: férias em junho 4/12', eur(cab.annualItems('FA', { ym: '2026-06', serviceStart: ss }), 'ferias'), 448.86);
  eq('cabine admissão mar-2026: o resto em janeiro 6/12', eur(cab.annualItems('FA', { ym: '2027-01', serviceStart: ss }), 'ferias'), 673.29);
  // Admissão em setembro de 2026: junho nada; janeiro de 2027 = setembro a dezembro (4/12 = 448,86 €).
  eq('cabine admissão set-2026: junho sem férias', item(cab.annualItems('FA', { ym: '2026-06', serviceStart: '2026-09-01' }), 'ferias'), null);
  eq('cabine admissão set-2026: janeiro 4/12', eur(cab.annualItems('FA', { ym: '2027-01', serviceStart: '2026-09-01' }), 'ferias'), 448.86);
  eq('cabine antes da admissão: nada', cab.annualItems('FA', { ym: '2026-06', serviceStart: '2026-07-01' }).length, 0);
  eq('cabine admitido antes: janeiro sem resto', cab.annualItems('FA', { ym: '2027-01', serviceStart: '2020-01-01' }).length, 0);
}
// Pilotos easyJet — Art. 36.º/1 e 2
has('Art. 36.º/1 (junho e novembro)', PIL, 'duas das quais correspondem aos subsídios de férias e Natal e serão pagas em junho e novem-');
has('Art. 36.º/1 (proporcionais na contratação)', PIL, 'bro respetivamente. Os dois subsídios serão pagos proporcionalmente nos anos de contratação e cessação');
has('Art. 36.º/2 (1/14 + média das variáveis)', PIL, 'Os dois subsídios (férias e Natal) correspondem a um mês de remuneração base (i.e. 1/14 da remuneração base anual), acrescido da média das prestações variáveis');
has('Art. 36.º/2 (diferença em dezembro)', PIL, 'a diferença será calculada e paga com a retribuição do mês de dezembro');
{
  // CPT 12/12, 2026: 122 000 × 1,023 / 14 = 8 914,71 €.
  const idx = pil.indexFactor('2026-11');
  const nov = pil.annualItems('CPT', { ym: '2026-11', index: idx });
  eq('piloto CPT nov-2026: Natal', eur(nov, 'natal'), 8914.71);
  eq('piloto CPT nov-2026: falta a média das variáveis (incerto)', !!item(nov, 'natal').incomplete, true);
  eq('piloto CPT nov-2026: total do mês', monthlyAe({}, 'CPT', '12/12', pil, { ym: '2026-11', index: idx }).total, 17829.42);
  eq('piloto CPT jun-2026: férias', eur(pil.annualItems('CPT', { ym: '2026-06', index: pil.indexFactor('2026-06') }), 'ferias'), 8914.71);
  // FO 2024 (índice 1): 47 750 / 14 = 3 410,71 €. PPY 8/12: × 8/12 = 2 273,81 €.
  eq('piloto FO nov-2024: Natal', eur(pil.annualItems('FO', { ym: '2024-11' }), 'natal'), 3410.71);
  eq('piloto FO PPY 8/12 nov-2024: Natal', eur(pil.annualItems('FO', { ym: '2024-11', contract: 'PPY 8/12' }), 'natal'), 2273.81);
  // Ano da contratação (maio de 2024): 8/12 nos dois. Contratado em setembro: Natal 4/12 = 1 136,90 €; férias 4/12 em dezembro.
  eq('piloto admissão mai-2024: férias 8/12', eur(pil.annualItems('FO', { ym: '2024-06', serviceStart: '2024-05-01' }), 'ferias'), 2273.81);
  eq('piloto admissão mai-2024: Natal 8/12', eur(pil.annualItems('FO', { ym: '2024-11', serviceStart: '2024-05-01' }), 'natal'), 2273.81);
  eq('piloto admissão set-2024: junho nada', item(pil.annualItems('FO', { ym: '2024-06', serviceStart: '2024-09-01' }), 'ferias'), null);
  eq('piloto admissão set-2024: Natal 4/12', eur(pil.annualItems('FO', { ym: '2024-11', serviceStart: '2024-09-01' }), 'natal'), 1136.9);
  eq('piloto admissão set-2024: férias 4/12 em dezembro', eur(pil.annualItems('FO', { ym: '2024-12', serviceStart: '2024-09-01' }), 'ferias'), 1136.9);
  // O ano soma 14/14: FO 12/12 em 2024 (janeiro ainda é a tabela de setembro de 2023; fevereiro em diante, a de 2024).
  // jan: 46 000/14 = 3 285,71 · fev a dez: 11 × 3 410,71 = 37 517,81 · subsídios: 2 × 3 410,71 = 6 821,42 · e a prestação
  // complementar de abril (Art. 45.º; Anexo I.8 "A partir de 1 de abril de 2024": FO 1 000,00 €) → 48 624,94 €.
  const ys = yearStats({}, { year: 2024, ae: pil, category: 'FO', contract: '12/12', now: new Date('2025-02-01T12:00:00') });
  eq('piloto FO ano 2024: base + subsídios + prestação de abril', ys.aeYtd.total, 48624.94);
  eq('piloto FO ano 2024: parcela dos subsídios e prestações', ys.aeYtd.annual, 7821.42);
}
// TAP cabine — RRRGS Cl. 3.ª, 5.ª, 17.ª, 18.ª, 39.ª e RTTP Cl. 7.ª
has('TAP cabine Cl. 3.ª/1 (VB + VS)', TAPC, 'O vencimento fixo mensal é constituído pelo vencimento base (VB) e pelo vencimento de senioridade (VS)');
has('TAP cabine Cl. 5.ª/1 a) (anuidade no 1.º dia do mês)', TAPC, 'Cada anuidade vence no primeiro dia do mês em que é completado cada ano de antiguidade ao serviço');
has('TAP cabine Cl. 5.ª/1 b) (categoria no vencimento)', TAPC, 'O valor de cada anuidade é o correspondente à categoria e escalão possuídos na data do vencimento');
has('TAP cabine Cl. 5.ª/2 (1 %)', TAPC, 'Cada anuidade corresponderá a 1 % do vencimento base em vigor a cada momento');
has('TAP cabine Cl. 17.ª (Natal)', TAPC, 'subsídio de montante igual à soma do vencimento base e ven- cimento de senioridade, a pagar até 15 de dezembro');
has('TAP cabine Cl. 17.ª/2 (admissão)', TAPC, 'No ano de admissão e no de cessação do contrato de trabalho, este subsídio será pago na proporção do tempo de trabalho prestado');
has('TAP cabine Cl. 18.ª/3 (675 €)', TAPC, 'O subsídio de férias mencionado no número anterior será acrescido de 675,00 €');
has('TAP cabine Cl. 18.ª/4 (mês anterior ao gozo)', TAPC, 'O subsídio de férias será pago com o vencimento do mês anterior ao do respetivo gozo');
has('TAP cabine Cl. 39.ª/3 (675 € proporcional em 2024)', TAPC, 'cujo pagamento será feito de forma proporcional aos meses remanescentes do ano de 2024');
has('RTTP Cl. 7.ª (83,3 %)', TAPC, 'a) 10 meses por ano - 83,3 %');
{
  // CAB 3 desde março de 2016 → anuidades em março de 2017 … março de 2026 = 10 → VS = 10 × 1 % × 2 020,73 = 202,07 €.
  const H = [{ category: 'CAB3', contract: '12/12', from: '2016-03' }];
  const ctx = { serviceStart: '2016-03-01', history: H };
  eq('TAP CAB3 dez-2026: VS 10 anuidades', tapC.seniority('CAB3', { ym: '2026-12', ...ctx }).vs, 202.07);
  eq('TAP CAB3 fev-2026: VS 9 anuidades (a 10.ª vence em março)', tapC.seniority('CAB3', { ym: '2026-02', ...ctx }).vs, 181.87);
  eq('TAP CAB3 dez-2026: vencimento fixo VB + VS', tapC.monthlyBase('CAB3', { ym: '2026-12', ...ctx }), 2222.8);
  eq('TAP CAB3 dez-2026: Natal = VB + VS', eur(tapC.annualItems('CAB3', { ym: '2026-12', ...ctx }), 'natal'), 2222.8);
  eq('TAP CAB3 dez-2026: total do mês', monthlyAe({}, 'CAB3', '12/12', tapC, { ym: '2026-12', ...ctx }).total, 4445.6);
  // Anuidades à categoria de cada aniversário: CAB 2 (2017-2020: 4 × 16,2702) + CAB 3 (2021-2026: 6 × 20,2073) = 186,32 €.
  const H2 = [{ category: 'CAB2', contract: '12/12', from: '2016-03' }, { category: 'CAB3', contract: '12/12', from: '2021-03' }];
  eq('TAP VS pela categoria de cada aniversário', tapC.seniority('CAB3', { ym: '2026-12', serviceStart: '2016-03-01', history: H2 }).vs, 186.32);
  // Férias registadas a 10-ago-2026 → subsídio em julho: 2 222,80 + 675,00 = 2 897,80 €.
  const vac = days('2026-08-10', 3, 'vacDays');
  eq('TAP CAB3 férias: pago em julho', eur(tapC.annualItems('CAB3', { ym: '2026-07', ...ctx, events: vac }), 'ferias'), 2897.8);
  eq('TAP CAB3 férias: não em agosto', item(tapC.annualItems('CAB3', { ym: '2026-08', ...ctx, events: vac }), 'ferias'), null);
  eq('TAP CAB3 férias sem férias registadas: mês por saber', item(tapC.annualItems('CAB3', { ym: '2026-07', ...ctx, events: [] }), 'ferias'), null);
  // 2024 (Cl. 39.ª/2-3): um mês de vencimento fixo (VB 1 871,05 + VS 8 × 18,7105 = 149,68) + 675 × 10/12 = 562,50 → 2 583,23 €.
  eq('TAP CAB3 férias 2024 (transitória)', eur(tapC.annualItems('CAB3', { ym: '2024-07', ...ctx, events: days('2024-08-05', 2, 'vacDays') }), 'ferias'), 2583.23);
  // Ano da admissão (março de 2026): Natal × 10/12 de 2 020,73 (sem anuidades) = 1 683,94 €.
  eq('TAP CAB3 admissão mar-2026: Natal 10/12', eur(tapC.annualItems('CAB3', { ym: '2026-12', serviceStart: '2026-03-01', history: H }), 'natal'), 1683.94);
  // Tempo parcial (RTTP Cl. 7.ª): 10 meses = 83,3 % → 2 020,73 × 0,833 = 1 683,27 €.
  eq('TAP RTTP 10 meses: vencimento', tapC.monthlyBase('CAB3', { ym: '2026-02', contract: 'TP 10', serviceStart: '2026-01-01', history: H }), 1683.27);
  eq('TAP RTTP contratos', tapC.CONTRACTS, ['12/12', 'TP 10', 'TP 9', 'TP 8', 'TP 7', 'TP 6']);
  eq('TAP RTTP 6 meses: 21 dias de férias', tapC.vacationDays({ contract: 'TP 6' }), 21);
  // Com a data da LARGADA (Cl. 14.ª, n.º 3: a antiguidade de serviço "contada a partir da data do primeiro voo de largada"):
  // entrou em março de 2016, largada em julho de 2016 → em maio de 2026 a 10.ª anuidade ainda não venceu (vence em julho).
  has('TAP cabine Cl. 14.ª/3 (largada)', TAPC, 'A antiguidade de serviço é contada a partir da data do primeiro voo de largada para a profissão');
  const lg = { serviceStart: '2016-03-01', largada: '2016-07-01', history: H };
  eq('TAP CAB3 mai-2026 com largada: 9 anuidades', [tapC.seniority('CAB3', { ym: '2026-05', ...lg }).anuidades, tapC.seniority('CAB3', { ym: '2026-05', ...lg }).fromEntry], [9, false]);
  eq('TAP CAB3 mai-2026 com largada: chega aos Números', monthStats({}, { ym: '2026-05', ae: tapC, crewHistory: H, ...lg }).aeMonth.base, 2202.6);
  const { payStatus } = R('data/today.js');
  eq('TAP CAB3 mai-2026 com largada: chega ao "Quanto recebo?"', payStatus({ duties: {}, ae: tapC, crewCategory: 'CAB3', crewHistory: H, serviceStart: '2016-03-01', largada: '2016-07-01', now: new Date('2026-05-15T12:00:00') }).base, 2202.6);
  // Sem a data de entrada: VS desconhecido → o motor diz que falta (não inventa 0 em silêncio).
  eq('TAP sem data de entrada: VS desconhecido', tapC.seniority('CAB3', { ym: '2026-12' }).unknown, true);
}
// TAP pilotos — RRRGS Cl. 2.ª, 4.ª, 5.ª, 7.ª, 8.ª
has('TAP pilotos Cl. 2.ª/1 (RB = VB + VE + VS)', TAPP, 'A remuneração base mensal (RB) é constituída pelo vencimento de categoria (VB), pelo vencimento de exercício (VE) e pelo vencimento de senioridade (VS)');
has('TAP pilotos Cl. 4.ª/3 (máximo 32)', TAPP, 'não pode exceder 32');
has('TAP pilotos Cl. 4.ª/5 (1.ª anuidade)', TAPP, 'A primeira anuidade técnica vence-se após ser completado 1 ano de antiguidade de serviço, no dia 1 de janeiro imediatamente seguinte');
has('TAP pilotos Cl. 4.ª/7 (1 de janeiro)', TAPP, 'As anuidades técnicas vencem-se em 1 de janeiro de cada ano');
has('TAP pilotos Cl. 5.ª/1 (anos de companhia)', TAPP, 'O vencimento de senioridade é o resultante do produto do valor inscrito na tabela em vigor em cada mo- mento pelo número de anos de antiguidade de companhia');
has('TAP pilotos Cl. 5.ª/2 (dia 1 do mês)', TAPP, 'Cada senioridade vence-se no dia 1 do mês em que se completa cada ano de antiguidade de serviço');
has('TAP pilotos Cl. 7.ª/3 (férias no mês anterior)', TAPP, 'com o vencimento do mês anterior ao do respetivo gozo');
has('TAP pilotos Cl. 8.ª/1 (Natal = RB)', TAPP, 'O piloto tem direito, anualmente, a um subsídio de montante igual ao da remuneração base mensal');
{
  // OP3 desde junho de 2018, 2024 (VB 6 050, sem degraus): VS 6 anos × 1,5 % = 544,50 · VE 5 anuidades (jan-2020 … jan-2024)
  // × 2 % = 605,00 → RB 7 199,50 €. Em maio (antes do 6.º aniversário): VS 5 × 90,75 = 453,75 → RB 7 108,75 €.
  const ctx = { serviceStart: '2018-06-01' };
  const s = tapP.seniority('OP3', { ym: '2024-07', ...ctx });
  eq('TAP OP3 jul-2024: anuidades e anos', [s.anuidades, s.anos], [5, 6]);
  eq('TAP OP3 jul-2024: VE e VS', [s.ve, s.vs], [605, 544.5]);
  eq('TAP OP3 jul-2024: RB', tapP.monthlyBase('OP3', { ym: '2024-07', ...ctx }), 7199.5);
  eq('TAP OP3 mai-2024: RB (5.º ano)', tapP.monthlyBase('OP3', { ym: '2024-05', ...ctx }), 7108.75);
  eq('TAP OP3 dez-2024: Natal = RB', eur(tapP.annualItems('OP3', { ym: '2024-12', ...ctx }), 'natal'), 7199.5);
  eq('TAP OP3 dez-2024: total do mês', monthlyAe({}, 'OP3', '12/12', tapP, { ym: '2024-12', ...ctx }).total, 14399);
  eq('TAP OP3 férias a 2-set-2024 → agosto', eur(tapP.annualItems('OP3', { ym: '2024-08', ...ctx, events: days('2024-09-02', 3, 'vacDays') }), 'ferias'), 7199.5);
  // OP1 admitido em março de 2024: sem anuidades nem senioridade no ano; Natal 10/12 de 4 420 = 3 683,33 €.
  eq('TAP OP1 1.º ano: RB = VB', tapP.monthlyBase('OP1', { ym: '2024-12', serviceStart: '2024-03-01' }), 4420);
  eq('TAP OP1 1.º ano: Natal 10/12', eur(tapP.annualItems('OP1', { ym: '2024-12', serviceStart: '2024-03-01' }), 'natal'), 3683.33);
  // CTE desde janeiro de 1985: 38 anuidades → máximo 32 (VE 5 200,00); 39 anos de VS (4 753,13) → RB 18 078,13 €.
  eq('TAP CTE: VE no máximo de 32 anuidades', tapP.seniority('CTE', { ym: '2024-07', serviceStart: '1985-01-01' }).anuidades, 32);
  eq('TAP CTE jul-2024: RB', tapP.monthlyBase('CTE', { ym: '2024-07', serviceStart: '1985-01-01' }), 18078.13);
  // Anuidades "na função" (Cl. 4.ª, n.º 1, 2 e 10): entrada em março de 2010 como OP3, comandante desde maio de 2025 → em
  // novembro de 2026 (VB de 2023): 14 anuidades de OP (jan-2012 … jan-2025) × 121,00 + a 1.ª de CTE (1-jan-2026) × 162,50 = 1 856,50 €.
  has('TAP pilotos Cl. 4.ª/10 (nova função)', TAPP, 'Os pilotos que ascendam a comando, ao longo de cada ano, vencem a 1.ª anuidade técnica da nova fun- ção em 1 de janeiro do ano seguinte');
  const HP = [{ category: 'OP3', contract: '12/12', from: '2010-03' }, { category: 'CTE', contract: '12/12', from: '2025-05' }];
  const sp2 = tapP.seniority('CTE', { ym: '2026-11', serviceStart: '2010-03-01', history: HP });
  eq('TAP CTE promovido em 2025: VE por função', [sp2.anuidades, sp2.ve], [15, 1856.5]);
  // A antiguidade de serviço conta-se da largada (pilotos Cl. 6.ª, n.º 8 "Largada conjunta"; cabine Cl. 14.ª, n.º 3); a app só
  // sabe a data de entrada → o motor diz de onde contou.
  eq('TAP: anuidades contadas da data de entrada (não da largada)', sp2.fromEntry, true);
  eq('TAP: com a largada, conta da largada', tapP.seniority('OP3', { ym: '2024-07', serviceStart: '2018-01-01', largada: '2018-06-01' }).anos, 6);
}

// ═══ L1 · Natal numa baixa longa (Código do Trabalho, pedido do Nuno 2026-11-06) ═══════════════════════════════════════
// Art. 296.º, n.º 1: a doença suspende o contrato quando "se prolongue por mais de um mês" (n.º 3: ou antes, quando for
// previsível — a app não sabe quando); art. 263.º, n.º 2, c): o Natal "é proporcional ao tempo de serviço prestado no ano civil
// (...) Em caso de suspensão de contrato de trabalho por facto respeitante ao trabalhador". A TAP pilotos di-lo também (Cl. 8.ª,
// n.º 2). O certo conta a suspensão desde o 1.º dia; o máximo, só depois do 1.º mês.
const CT = src('pt/codigo-trabalho-2009.txt');
has('CT art. 263.º/2 c)', CT, 'c) Em caso de suspensão de contrato de trabalho por facto respeitante ao trabalhador');
has('CT art. 296.º/1', CT, 'que não lhe seja imputável e se prolongue por mais de um mês, nomeadamente doença');
has('TAP pilotos Cl. 8.ª/2 (suspensão)', TAPP, 'bem como no da suspensão do mesmo, este subsídio será pago na proporção do tempo de trabalho prestado');
{
  // FO 12/12, baixa de 1-mar a 30-abr-2026 (61 dias, mais de um mês): Natal 3 489,16 × 304/365 = 2 906,04 € certo; × 335/365 =
  // 3 202,38 € no máximo (suspenso só de 1 a 30 de abril).
  const sick = days('2026-03-01', 61, 'sickDays');
  const n = item(pil.annualItems('FO', { ym: '2026-11', index: pil.indexFactor('2026-11'), events: sick }), 'natal');
  eq('FO: Natal com suspensão (certo e máximo)', [n.eur, n.max], [2906.04, 3202.38]);
  eq('FO: baixa de 30 dias não suspende', eur(pil.annualItems('FO', { ym: '2026-11', index: pil.indexFactor('2026-11'), events: days('2026-03-01', 30, 'sickDays') }), 'natal'), 3489.16);
  const nc = item(cab.annualItems('FA', { ym: '2026-11', events: sick }), 'natal');
  eq('FA: Natal com suspensão (certo e máximo)', [nc.eur, nc.max], [1121.53, 1235.89]);
}

// ═══ TAP: rubricas que faltavam (pedido do Nuno 2026-11-06) ════════════════════════════════════════════════════════════
has('TAP cabine Cl. 13.ª/2 e) v) (e-learning 145 € por 8 h)', TAPC, 'o montante 145,00 € (cento e quarenta e cinco euros), referente a 8 horas de formação e-learning');
has('TAP cabine Cl. 13.ª/2 e) v) a) (18,125 €/h até 24 h/ano)', TAPC, 'até ao limite de 24 horas/ano, serão abonadas pelo valor de 18,125 €/hora');
has('TAP cabine Cl. 12.ª/4 (DHC fora de C/CL)', TAPC, 'e não viaje em C/CL, terá direito a um abono adicional correspondente a 20 % do valor da ajuda de custo complementar 1');
has('TAP pilotos Cl. 9.ª/1 b) iii) (inspeções médicas = B)', TAPP, 'Deslocações para realização de inspeções médicas obrigatórias ou outros atos médicos a mando da em- presa');
has('TAP cabine Cl. 8.ª/1 g) (medicina do trabalho)', TAPC, 'g) Realização da medicina do trabalho');
{
  // E-learning: 8 h em março → 145,00 € em abril; mais 20 h em abril → só 16 até às 24 h do ano → 16 × 18,125 = 290,00 € em maio.
  const el = { '2026-03-10': { kind: 'training', eLearning: true, report_time: '09:00', block_on: '17:00' },
    '2026-04-14': { kind: 'training', eLearning: true, report_time: '08:00', block_on: '18:00', extra: [{ kind: 'training', eLearning: true, report_time: '19:00', block_on: '23:00' }] },
    '2026-04-20': { kind: 'training', eLearning: true, report_time: '09:00', block_on: '15:00' } };
  const T = (ym, d = el) => monthlyAe(d, 'CAB3', '12/12', tapC, { ym });
  eq('TAP cabine: e-learning de março pago em abril', T('2026-04').extras, 145);
  eq('TAP cabine: e-learning de abril até às 24 h, em maio', T('2026-05').extras, 290);
  eq('TAP cabine: e-learning não paga no próprio mês', T('2026-03').extras, 0);
  // DHC fora de C/CL: 20 % da AC1 (150 € em 2026) no mês seguinte.
  const dhc = { '2026-03-12': { kind: 'positioning', route: 'LIS-FNC', dhcEconomy: true } };
  eq('TAP cabine: DHC em económica = 20 % da AC1 no mês seguinte', T('2026-04', dhc).extras, 30);
  eq('TAP cabine: DHC em C/CL = nada', T('2026-04', { '2026-03-12': { kind: 'positioning', route: 'LIS-FNC' } }).extras, 0);
  // Ato médico: pilotos = per diem B; cabine = o complemento (como a deslocação às instalações).
  eq('TAP piloto: inspeção médica = B', monthlyAe({ '2026-06-08': { kind: 'office', officeType: 'medical', report_time: '09:00', block_on: '11:00' } }, 'OP3', '12/12', tapP, { ym: '2026-06', fleet: 'NB' }).perDiem, 135);
  eq('TAP cabine: medicina do trabalho = complemento', T('2026-03', { '2026-03-09': { kind: 'office', officeType: 'medical', report_time: '09:00', block_on: '11:00' } }).extras, 40);
}

// ═══ L2 · Posicionamento ═══════════════════════════════════════════════════════════════════════════════════════════════
has('Cl. 57.ª/1 (duração da viagem)', CAB, 'Os pagamentos realizados por posicionamento variam em função da duração da viagem');
has('Cl. 57.ª/2 (qualquer meio de transporte)', CAB, 'O tripulante de cabine receberá o pagamento do posicionamento em exercício de funções, independente- mente do meio de transporte');
has('Anexo I.18 (Tripulante de cabine)', CAB, 'Tripulante de cabine 16,00 € 24,00 € 30,00 €');
has('Anexo I.18 (Chefe de cabine)', CAB, 'Chefe de cabine 26,00 € 39,00 € 48,75 €');
has('Anexo I.18 (1.º ano)', CAB, 'Tripulante de cabine 1.º ano 10,50 15,74 € 19,68 €');
has('Art. 44.º (setores por distância)', PIL, 'receberão um paga- mento de acordo com os flight duty periods, conforme os setores desse servico (sector com base na distância de grande círculo do setor)');
has('TAP cabine Cl. 7.ª/1 (DHC)', TAPC, 'em curso a realização de um serviço de voo em funções ou DHC/extracrew');
has('TAP pilotos Cl. 9.ª/1 a) i) (dead-head)', TAPP, 'quer seja em funções, quer seja na situação de dead-head, extra-crew ou manning');
{
  // Cabine: o acordo não diz onde acaba o curto e começa o médio → o certo é o mínimo (curto) e diz-se o intervalo.
  eq('Anexo I.18 tabela', cab.POSITIONING, { CM: { curto: 26, medio: 39, longo: 48.75 }, FA: { curto: 16, medio: 24, longo: 30 }, FA1: { curto: 10.5, medio: 15.74, longo: 19.68 } });
  const posD = { '2026-03-10': { kind: 'positioning', route: 'LIS-OPO', report_time: '08:00', block_on: '09:10' } };
  const m = monthlyAe(posD, 'FA', '12/12', cab, { ym: '2026-03' });
  eq('cabine FA: posicionamento no mês (mínimo)', m.positioning, 16);
  eq('cabine FA: total = base + abono + posicionamento', m.total, 1441.12);
  eq('cabine FA: intervalo do posicionamento', m.positioningMax, 30);
  eq('cabine CMP: linha de chefe de cabine', monthlyAe(posD, 'CMP', '12/12', cab, { ym: '2026-03' }).positioning, 26);
  eq('cabine FA1', monthlyAe(posD, 'FA1', '12/12', cab, { ym: '2026-03' }).positioning, 10.5);
  // Pilotos: FO, maio de 2024, LIS-CDG (setor médio, 1,2 NS) = 1,2 × 38,76 = 46,51 €. Em 2026: × 1,023 = 47,58 €.
  const pos = { '2024-05-20': { kind: 'positioning', route: 'LIS-CDG' } };
  const mp = monthlyAe(pos, 'FO', '12/12', pil, { ym: '2024-05' });
  eq('piloto FO: posicionamento LIS-CDG', mp.positioning, 46.51);
  eq('piloto FO: total = base + posicionamento', mp.total, 3457.22);
  eq('piloto FO 2026: posicionamento LIS-FNC', monthlyAe({ '2026-06-02': { kind: 'positioning', route: 'LIS-FNC' } }, 'FO', '12/12', pil, { ym: '2026-06', index: pil.indexFactor('2026-06') }).positioning, 47.58);
  // Voo com DH depois: LIS-FNC operado (per diem 46,51) + DH FNC-LIS (posicionamento 46,51).
  const dh = { '2024-05-21': { kind: 'flight', route: 'LIS-FNC-LIS', legs: [{ dep: 'LIS', arr: 'FNC' }, { dep: 'FNC', arr: 'LIS', dh: true }] } };
  const md = monthlyAe(dh, 'FO', '12/12', pil, { ym: '2024-05' });
  eq('piloto FO: voo + DH → per diem e posicionamento', [md.perDiem, md.positioning], [46.51, 46.51]);
  eq('cabine FA: voo + DH → per diem 25,20 + posicionamento mínimo 16,00', (() => { const x = monthlyAe({ '2026-03-21': dh['2024-05-21'] }, 'FA', '12/12', cab, { ym: '2026-03' }); return [x.perDiem, x.positioning]; })(), [25.2, 16]);
  // TAP: um dia de DHC é dia de AC1 / per diem A.
  eq('TAP cabine: dia de DHC = AC1', monthlyAe({ '2026-03-12': { kind: 'positioning', route: 'LIS-FNC' } }, 'CAB3', '12/12', tapC, { ym: '2026-03' }).perDiem, 150);
  eq('TAP piloto NB: dead-head = per diem A', monthlyAe({ '2026-06-11': { kind: 'positioning', route: 'LIS-FNC' } }, 'OP3', '12/12', tapP, { ym: '2026-06', fleet: 'NB' }).perDiem, 202.5);
}

// ═══ L5 · TAP: dias que pagam, área geográfica, chefia ═════════════════════════════════════════════════════════════════
has('TAP pilotos Cl. 9.ª/1 a) ii) (assistência no aeroporto)', TAPP, 'Deslocação para serviço de assistência no aeroporto');
has('TAP pilotos Cl. 9.ª/1 b) ii) (refrescamento = B)', TAPP, 'Apresentação para ação de refrescamento (formação presencial ou e-learning)');
has('TAP pilotos Cl. 9.ª/2 (A prevalece)', TAPP, 'prevalecerá e será aplicado o disposto na alínea a)');
has('TAP pilotos RUPT Cl. 32.ª/1 (médio curso)', TAPP, 'São de médio curso as operações que decorram entre pontos situados entre 23°N e 75°N e 35°W e 25°E');
has('TAP cabine Cl. 8.ª/1 b) (assistência em casa)', TAPC, 'Assistência realizada na sua residência');
has('TAP cabine Cl. 8.ª/1 h) (formação presencial)', TAPC, 'Sempre que se desloque às instalações da empresa para realização de formação presencial');
has('TAP cabine Cl. 8.ª/2 (2 × no aeroporto)', TAPC, 'As condições referidas nas alíneas a) e c) correspondem ao valor de duas vezes o complemento por dis- ponibilidade');
has('TAP cabine Cl. 11.ª (chefia 8 %)', TAPC, 'terá direito a um valor adicional correspondendo a 8 % do valor total das ajudas de custo complemen- tares 1 e 2');
has('TAP cabine Cl. 11.ª/2 (mês seguinte)', TAPC, 'O montante devido nos termos do número anterior será atribuído no mês seguinte');
{
  const P = (duties, cat = 'OP3', fleet = 'NB') => monthlyAe(duties, cat, '12/12', tapP, { ym: '2026-06', fleet });
  eq('TAP piloto: assistência no aeroporto = A', P({ '2026-06-10': { kind: 'standby_airport', report_time: '06:00', block_on: '12:00' } }).perDiem, 202.5);
  eq('TAP piloto: simulador como aluno = A', P({ '2026-06-12': { kind: 'training', trainingType: 'sim' } }).perDiem, 202.5);
  eq('TAP piloto: e-learning = B', P({ '2026-06-13': { kind: 'training', eLearning: true } }).perDiem, 135);
  // Há formação que não paga A nem B (Cl. 10.ª, n.º 2, d): "Formação profissional não abrangida pelo per diem B") → sem o tipo,
  // o certo é 0 e o possível é o A (revisão independente do bloco 6).
  has('TAP pilotos Cl. 10.ª/2 d) (formação sem per diem B)', TAPP, 'Formação profissional não abrangida pelo per diem B');
  const unk = P({ '2026-06-14': { kind: 'training' } });
  eq('TAP piloto: formação sem tipo = 0 certo, A possível', [unk.perDiem, unk.perDiemMax], [0, 202.5]);
  eq('TAP piloto: refrescamento marcado = B', P({ '2026-06-14': { kind: 'training', trainingType: 'ground' } }).perDiem, 135);
  eq('TAP piloto: assistência e voo no mesmo dia = um A', P({ '2026-06-15': { kind: 'standby_airport', report_time: '05:00', block_on: '07:00', extra: [{ kind: 'flight', route: 'LIS-MAD-LIS', report_time: '08:00', block_on: '13:00' }] } }).perDiem, 202.5);
  // Área geográfica (RUPT Cl. 32.ª e 37.ª): Dakar (14,7°N) e Istambul (28,8°E) ficam fora → longo curso (225,00 / CTE 300,00).
  eq('TAP piloto NB: LIS-DSS-LIS longo curso', P({ '2026-06-16': { route: 'LIS-DSS-LIS' } }).perDiem, 225);
  eq('TAP piloto NB: LIS-IST-LIS longo curso', P({ '2026-06-17': { route: 'LIS-IST-LIS' } }).perDiem, 225);
  eq('TAP CTE NB: LIS-DSS-LIS longo curso', P({ '2026-06-16': { route: 'LIS-DSS-LIS' } }, 'CTE').perDiem, 300);
  eq('TAP piloto NB: LIS-MAD-LIS médio curso', P({ '2026-06-18': { route: 'LIS-MAD-LIS' } }).perDiem, 202.5);
  // Repouso em Atenas: 23,9°E − (−9,1°) = 33° > 30° → longo curso (pilotos); ida e volta no dia → médio.
  eq('TAP piloto NB: LIS-ATH com repouso lá = longo', P({ '2026-06-19': { route: 'LIS-ATH', nightStop: true } }).perDiem, 225);
  eq('TAP piloto NB: LIS-ATH-LIS no dia = médio', P({ '2026-06-20': { route: 'LIS-ATH-LIS' } }).perDiem, 202.5);
  // Um dia de voo com um aeroporto que a app não conhece paga na mesma: a AC1 é fixa (Cl. 7.ª/1); nos pilotos, o médio curso.
  eq('TAP cabine: aeroporto desconhecido não tira a AC1', monthlyAe({ '2026-03-10': { route: 'LIS-ZZZ-LIS' } }, 'CAB3', '12/12', tapC, { ym: '2026-03' }).perDiem, 150);
  eq('TAP piloto: aeroporto desconhecido = A médio curso', P({ '2026-06-21': { route: 'LIS-ZZZ-LIS' } }).perDiem, 202.5);
  // O € de cada serviço é o do DIA (Cl. 7.ª/9.ª: "por cada dia de calendário"): dois voos no mesmo dia = uma AC1, no 1.º serviço.
  const two = [{ kind: 'flight', route: 'LIS-OPO-LIS', report_time: '06:00', block_on: '09:00' }, { kind: 'flight', route: 'LIS-FAO-LIS', report_time: '14:00', block_on: '18:00' }];
  eq('TAP cabine: 2 voos no dia = AC1 só no 1.º serviço', [serviceMoney(tapC, 'CAB3', two[0], { date: '2026-06-10', daySvcs: two }).perDiem, serviceMoney(tapC, 'CAB3', two[1], { date: '2026-06-10', daySvcs: two }).perDiem], [150, null]);
  // Um serviço das 22:00 à 01:30 está "em curso" em dois dias → dois per diem A.
  const night = { kind: 'flight', route: 'LIS-MAD-LIS', report_time: '22:00', block_on: '01:00' };
  eq('TAP piloto: serviço a cruzar a meia-noite = 2 dias de A', serviceMoney(tapP, 'OP3', night, { date: '2026-06-10', fleet: 'NB' }).perDiem, 405);
  // Cabine TAP, março de 2026, complemento 40,00 € (Cl. 8.ª/4, CAB 0 a S/C 7).
  const C = (duties, cat = 'CAB3', ym = '2026-03') => monthlyAe(duties, cat, '12/12', tapC, { ym });
  eq('TAP cabine: assistência no aeroporto sem voo = 2 × 40', C({ '2026-03-15': { kind: 'standby_airport', report_time: '06:00', block_on: '12:00' } }).extras, 80);
  eq('TAP cabine: assistência em casa = 40', C({ '2026-03-16': { kind: 'standby_home', report_time: '06:00', block_on: '12:00' } }).extras, 40);
  eq('TAP cabine: formação presencial = 40', C({ '2026-03-17': { kind: 'training', report_time: '09:00', block_on: '17:00' } }).extras, 40);
  eq('TAP cabine: deslocação às instalações (escritório) = 40', C({ '2026-03-18': { kind: 'office', report_time: '09:00', block_on: '17:00' } }).extras, 40);
  const sbFl = C({ '2026-03-19': { kind: 'standby_airport', report_time: '05:00', block_on: '07:00', extra: [{ kind: 'flight', route: 'LIS-OPO-LIS', report_time: '08:00', block_on: '12:00' }] } });
  eq('TAP cabine: assistência + voo no mesmo dia = só a AC1', [sbFl.perDiem, sbFl.extras], [150, 0]);
  // O complemento registado à mão num dia que já paga pela escala não conta outra vez.
  const sbDay = { '2026-03-16': { kind: 'standby_home', report_time: '06:00', block_on: '12:00' } };
  eq('TAP cabine: evento manual no dia da assistência não duplica', eventCounts([{ id: 'e', date: '2026-03-16', type: 'extraordDays' }], '2026-03', sbDay, true).extraordDays, undefined);
  // Chefia: S/C 1 com 10 dias de voo em abril de 2026 → 8 % × 1 500 = 120,00 € em maio.
  const apr = {};
  for (let d = 1; d <= 10; d++) apr[`2026-04-${String(d).padStart(2, '0')}`] = { route: 'LIS-OPO-LIS', report_time: '08:00', block_on: '12:00' };
  eq('TAP S/C 1: chefia de abril paga em maio', C(apr, 'SC1', '2026-05').chefia, 120);
  eq('TAP S/C 1: abril não leva a chefia de abril', C(apr, 'SC1', '2026-04').chefia || 0, 0);
  eq('TAP CAB 3: sem chefia', C(apr, 'CAB3', '2026-05').chefia || 0, 0);
  // O direito nasce no mês das ajudas (Cl. 11.ª/1): promovido a S/C em maio, não leva 8 % do abril em que era CAB 5.
  eq('TAP chefia: categoria do mês das ajudas', monthlyAe(apr, 'SC1', '12/12', tapC, { ym: '2026-05', history: [{ category: 'CAB5', from: '2020-01' }, { category: 'SC1', from: '2026-05' }] }).chefia || 0, 0);
  // O complemento registado à mão só não conta num dia que já o paga pela escala: num dia de e-learning (0 €) conta.
  eq('TAP cabine: complemento à mão num dia de e-learning conta', eventCounts([{ id: 'm', date: '2026-03-20', type: 'extraordDays' }], '2026-03', { '2026-03-20': { kind: 'training', eLearning: true } }, true).extraordDays, 1);
}

// ═══ L6 · CTI-Flexi = 4 setores nominais da categoria de CHEFE de cabine ═══════════════════════════════════════════════
has('Anexo I.16 (CTI-flexi)', CAB, 'Pagamento correspondente a 4 (quatro) setores nominais devidos para a categoria de chefe de cabine');
eq('CTI-Flexi FA nov-2025 = 4 × 32,50', cab.ctiFlexi('FA', '2026-03'), 130);
eq('CTI-Flexi FA1 = 4 × 32,50', cab.ctiFlexi('FA1', '2026-03'), 130);
eq('CTI-Flexi CMP = 4 × 32,50', cab.ctiFlexi('CMP', '2026-03'), 130);
eq('CTI-Flexi FA mar-2025 = 4 × 27,41', cab.ctiFlexi('FA', '2025-03'), 109.64);

// ═══ L7 · DDO/IDO dos pilotos: 90 minutos dentro da folga ══════════════════════════════════════════════════════════════
has('Anexo I.13 (IDO ≥ 90 min)', PIL, 'IDO = O tempo de folga do piloto é ≥ 90 minutos no dia de folga');
has('Anexo I.13 (DDO < 90 min)', PIL, 'DDO = O tempo de folga do piloto é ≥ 0 mins, mas < 90 mins no dia de folga');
eq('pilotos: 89 min na folga = DDO', pil.dayOffKind(89), 'ddo');
eq('pilotos: 90 min na folga = IDO', pil.dayOffKind(90), 'ido');
eq('pilotos: 1 min na folga = DDO', pil.dayOffKind(1), 'ddo');
eq('pilotos: sem minutos = nada', pil.dayOffKind(0), null);
// Minutos dentro do dia seguinte: apresentação 16:00, calços 01:00 + 30 min de pós-voo → 01:30 = 90 min.
eq('pilotos: minutos na folga pelo fim do serviço', pil.minutesIntoNextDay({ report_time: '16:00', block_on: '01:00' }, 30), 90);
eq('pilotos: com sign-off', pil.minutesIntoNextDay({ report_time: '16:00', block_on: '00:10', signOff: '00:40' }, 30), 40);
eq('pilotos: serviço que acaba no próprio dia', pil.minutesIntoNextDay({ report_time: '06:00', block_on: '14:00' }, 30), 0);

// ═══ L8 · Férias 14-14, 21-7 e 7-7 pelo quadro do Art. 66.º ════════════════════════════════════════════════════════════
// O quadro do Art. 66.º sai do PDF com as colunas desalinhadas no texto corrido; com `pdftotext -layout` (PDF p. 21) a coluna
// Férias lê-se direita: 14-14 → 14 · 21-7 → 21 · 7-7 → 18. No texto guardado a sequência é esta:
has('Art. 66.º quadro (cabeçalho)', PIL, 'Modelo Dias de folga Férias GDO % remuneração');
has('Art. 66.º quadro (Férias 14 · 21 · 18)', PIL, '14-14 14 21-7 trabalho» 21 12 51 % Acordo padrão até ao limite de dias livres 7-7 18');
eq('férias 14-14', pil.vacationDays({ contract: '14-14' }), 14);
eq('férias 21-7', pil.vacationDays({ contract: '21-7' }), 21);
eq('férias 7-7', pil.vacationDays({ contract: '7-7' }), 18);
eq('férias 12/12, PPY 9/12, PPY 8/12', ['12/12', 'PPY 9/12', 'PPY 8/12'].map((c) => pil.vacationDays({ contract: c })), [25, 19, 17]);

// ═══ L9 · SNC que não era detetado ═════════════════════════════════════════════════════════════════════════════════════
has('Art. 63.º/10 a) (assistência antecipada)', PIL, 'Quando uma assistência consta na escala e, nas 48 horas seguintes à sua hora de início, esta for antecipada por qualquer periodo de tempo, será considerada como uma alteração de escala com curta antecedência');
has('Art. 63.º/10 b) (90 minutos)', PIL, 'A marcação uma hora de apresentação mais cedo será considerada como uma alteração de escala com curta antecedência');
has('Art. 63.º/1 (fim atrasado 2 h)', PIL, 'ou a hora de término do serviço seja atrasada em 2 ou mais horas');
{
  const E = (before, after, detectedAt = '2026-03-09T00:00', dutyDate = '2026-03-10') => ({ id: 'x', dutyDate, detectedAt, before, after });
  const sbH = { report: '06:00', end: '14:00', kind: 'standby_home' };
  const v1 = evaluateDisruption(E(sbH, { report: '05:00', end: '13:00', kind: 'standby_home' }), { isPilot: true });
  eq('piloto: assistência antecipada 1 h = SNC', v1 && [v1.type, v1.clause], ['snc', 'Art. 63.º, n.º 10']);
  const v2 = evaluateDisruption(E(sbH, { report: '07:00', end: '15:00', kind: 'flight' }), { isPilot: true });
  eq('piloto: assistência em casa → voo antes de início + 90 min = SNC', v2 && v2.type, 'snc');
  eq('piloto: assistência em casa → voo depois de início + 90 min = nada', evaluateDisruption(E(sbH, { report: '08:00', end: '16:00', kind: 'flight' }), { isPilot: true }), null);
  const v3 = evaluateDisruption(E({ report: '06:00', end: '12:00', kind: 'standby_airport' }, { report: '05:30', end: '11:30', kind: 'standby_airport' }), { isPilot: true });
  eq('piloto: assistência no aeroporto antecipada 30 min = SNC', v3 && v3.type, 'snc');
  eq('cabine: assistência antecipada = nada (Cl. 66.ª não tem a regra)', evaluateDisruption(E(sbH, { report: '05:00', end: '13:00', kind: 'standby_home' }), { isPilot: false }), null);
  eq('piloto: chamado durante a assistência = nada', evaluateDisruption(E(sbH, { report: '05:00', end: '13:00', kind: 'flight' }, '2026-03-10T06:30'), { isPilot: true }), null);
  // Fim atrasado que passa a meia-noite: calços 22:00 → 00:30 (+2 h 30) = SNC (pilotos e cabine).
  const late = E({ report: '16:00', end: '22:00', kind: 'flight' }, { report: '16:00', end: '00:30', kind: 'flight' });
  eq('piloto: fim atrasado depois da meia-noite = SNC', (evaluateDisruption(late, { isPilot: true }) || {}).type, 'snc');
  eq('cabine: fim atrasado depois da meia-noite = SNC', (evaluateDisruption(late, { isPilot: false }) || {}).dEndMin, 150);
}

// ═══ L10 · O valor de cada serviço é a parcela que entra no mês (IPC dos pilotos) ══════════════════════════════════════
{
  // CPT, novembro de 2026, LIS-LGW-LIS: 2 × 1,2 × 78,75 × 1,023 = 193,35 € · pernoita 2 × 78,75 × 1,023 = 161,12 €.
  const d = { kind: 'flight', route: 'LIS-LGW-LIS' };
  const sm = serviceMoney(pil, 'CPT', d, { date: '2026-11-05' });
  eq('CPT nov-2026: per diem do serviço com IPC', sm.perDiem, 193.35);
  eq('CPT nov-2026: o serviço = a parcela do mês', sm.perDiem, monthlyAe({ '2026-11-05': d }, 'CPT', '12/12', pil, { ym: '2026-11', index: pil.indexFactor('2026-11') }).perDiem);
  eq('CPT nov-2026: pernoita com IPC', serviceMoney(pil, 'CPT', { ...d, route: 'LIS-LGW', nightStop: true }, { date: '2026-11-05' }).nightStop, 161.12);
  eq('CPT jan-2025: ainda sem IPC', serviceMoney(pil, 'CPT', d, { date: '2025-01-10' }).perDiem, 189);
  eq('FA: posicionamento no serviço (mínimo e máximo)', (() => { const x = serviceMoney(cab, 'FA', { kind: 'positioning', route: 'LIS-OPO' }, { date: '2026-03-10' }); return [x.positioning, x.positioningMax]; })(), [16, 30]);
}

// ═══ L11 · Pilotos easyJet: prestações anuais ═════════════════════════════════════════════════════════════════════════
has('Art. 45.º (abril)', PIL, 'A prestação complementar anual será paga em dinheiro e em uma só prestação no mês de abril de cada ano');
has('Art. 47.º/2 (mês do aniversário)', PIL, 'O pagamento do prémio de permanência será efetuado no mês em que o piloto elegível complete o seu aniversário de serviço');
has('Art. 47.º/4 (tempo parcial)', PIL, 'Os pilotos que se encontrem a trabalhar a tempo parcial receberão o prémio de forma proporcional');
has('Art. 24.º/20 b) (maio)', PIL, 'O pagamento será efetuado no processamento salarial de maio, iniciando-se em maio de 2024');
has('Art. 24.º/20 c) (31 de agosto)', PIL, 'os pilotos devem ter um contrato de trabalho vigente para o exercicio de funções em Portugal a 31 de agosto do ano anterior ao do pagamento');
has('Art. 66.º/1 (prestação proporcional)', PIL, 'base anual, férias, dias de folga, GDO e prestação complementar anual, serão determinados de forma propor');
{
  const A = (cat, ym, o = {}) => pil.annualItems(cat, { ym, index: pil.indexFactor(ym), serviceStart: '2016-03-01', ...o });
  eq('CPT abril de 2026: prestação complementar 3 500,00', eur(A('CPT', '2026-04'), 'benefits'), 3500);
  eq('FO PPY 8/12 abril: 1 000 × 8/12', eur(A('FO', '2026-04', { contract: 'PPY 8/12' }), 'benefits'), 666.67);
  eq('FO 14-14 abril: 1 000 × 51 %', eur(A('FO', '2026-04', { contract: '14-14' }), 'benefits'), 510);
  eq('FO 5/4 abril: inteira (o Art. 59.º reduz só a base)', eur(A('FO', '2026-04', { contract: '5/4' }), 'benefits'), 1000);
  eq('abril de 2023: sem tabela', item(A('CPT', '2023-04'), 'benefits'), null);
  // Permanência: CPT desde março de 2016 → 10.º aniversário em março de 2026: 15 % × 122 000 × 1,023 = 18 720,90 €.
  eq('CPT 10.º aniversário: 15 %', eur(A('CPT', '2026-03'), 'loyalty'), 18720.9);
  eq('CPT 9.º aniversário: 10 %', eur(A('CPT', '2025-03'), 'loyalty'), 12480.6);
  eq('CPT: fora do mês do aniversário nada', item(A('CPT', '2026-04'), 'loyalty'), null);
  eq('CPT PPY 8/12 10.º aniversário: proporcional', eur(A('CPT', '2026-03', { contract: 'PPY 8/12' }), 'loyalty'), 12480.6);
  eq('SFO 3.º aniversário: 5 %', eur(A('SFO', '2026-05', { serviceStart: '2023-05-01' }), 'loyalty'), 3529.35);
  eq('FO: sem prémio de permanência', item(A('FO', '2026-03'), 'loyalty'), null);
  // Retenção (só PPY, não estilo de vida): co-piloto 6 000,00 € em maio; comandante 12 000,00 €.
  eq('FO PPY 8/12 maio: retenção 6 000', eur(A('FO', '2026-05', { contract: 'PPY 8/12', serviceStart: '2020-01-01' }), 'retention'), 6000);
  eq('CPT PPY 9/12 maio: retenção 12 000', eur(A('CPT', '2026-05', { contract: 'PPY 9/12', serviceStart: '2020-01-01' }), 'retention'), 12000);
  eq('FO PPY estilo de vida: sem retenção', item(A('FO', '2026-05', { contract: 'PPY 8/12', lifestyle: true, serviceStart: '2020-01-01' }), 'retention'), null);
  eq('FO 12/12: sem retenção', item(A('FO', '2026-05', { serviceStart: '2020-01-01' }), 'retention'), null);
  eq('FO PPY maio de 2023: ainda não havia', item(A('FO', '2023-05', { contract: 'PPY 8/12', serviceStart: '2020-01-01' }), 'retention'), null);
  eq('FO PPY entrou em out-2025: sem retenção em 2026', item(A('FO', '2026-05', { contract: 'PPY 8/12', serviceStart: '2025-10-01' }), 'retention'), null);
  // O total do mês leva-as: CPT 12/12 em abril de 2026 = base 8 914,71 + 3 500,00.
  eq('CPT abril de 2026: total do mês', monthlyAe({}, 'CPT', '12/12', pil, { ym: '2026-04', index: pil.indexFactor('2026-04'), serviceStart: '2016-03-01' }).total, 12414.71);
}

// ═══ L13 · Pernoitas: cada noite fora da base ═════════════════════════════════════════════════════════════════════════
has('Cl. 56.ª/1 (cada noite fora da base)', CAB, 'por cada noite fora da base, em voo, formação e outras funções');
has('Art. 39.º (paragens noturnas)', PIL, 'Os pilotos recebem um pagamento por paragens noturnas fora da base, entre serviços de voo');
has('Art. 44.º (posicionamento com paragens noturnas)', PIL, 'O pagamento de posicionamentos com paragens noturnas enquadra-se no regime de pagamento dos per diem');
{
  // LIS-BER a 10, livre em Berlim a 11, BER-LIS a 12 → 2 noites. Cabine 2 × 46,00; CPT 2024: 2 × 157,50.
  const st = { '2026-03-10': { route: 'LIS-BER', nightStop: true }, '2026-03-12': { route: 'BER-LIS' } };
  eq('noites fora: 2', awayNights(st, '2026-03'), ['2026-03-10', '2026-03-11']);
  eq('cabine FA: 2 pernoitas', monthlyAe(st, 'FA', '12/12', cab, { ym: '2026-03' }).nightStops, 92);
  const stP = { '2024-05-10': { route: 'LIS-BER', nightStop: true }, '2024-05-12': { route: 'BER-LIS' } };
  eq('piloto CPT: 2 pernoitas', monthlyAe(stP, 'CPT', '12/12', pil, { ym: '2024-05' }).nightStops, 315);
  // A cruzar o mês: 31-mar fora, 1-abr livre, 2-abr regresso → uma noite em cada mês.
  const x = { '2026-03-31': { route: 'LIS-BER', nightStop: true }, '2026-04-02': { route: 'BER-LIS' } };
  eq('noites a cruzar o mês', [awayNights(x, '2026-03').length, awayNights(x, '2026-04').length], [1, 1]);
  // O serviço seguinte parte de outro sítio: não se presume a estadia (1 noite).
  eq('sem regresso do mesmo sítio: 1 noite', awayNights({ '2026-03-10': { route: 'LIS-BER', nightStop: true }, '2026-03-13': { route: 'MAD-LIS' } }, '2026-03').length, 1);
  // Posicionamento à tarde LIS→FNC, voo FNC-LIS no dia seguinte: 1 noite (cabine e pilotos).
  const dh = { '2026-03-20': { kind: 'positioning', route: 'LIS-FNC', nightStop: true }, '2026-03-21': { route: 'FNC-LIS' } };
  eq('posicionamento com noite fora conta', monthlyAe(dh, 'FA', '12/12', cab, { ym: '2026-03' }).nightStops, 46);
  // A importação marca a noite no posicionamento que acaba fora da base.
  const act = { dateISO: '2026-03-20', sectors: 0, legs: [{ flightNo: 'EZY7001', report: '15:00', depTime: '16:00', arrTime: '17:40', depAirport: 'LIS', arrAirport: 'FNC', dh: true }] };
  eq('importação: DH que acaba fora = pernoita', dutyFromActivity(act, 'LIS').nightStop, true);
  eq('importação: DH que volta à base = sem pernoita', dutyFromActivity({ ...act, legs: [{ ...act.legs[0], depAirport: 'FNC', arrAirport: 'LIS' }] }, 'LIS').nightStop, false);
  // As estatísticas contam as mesmas noites.
  eq('estatísticas: 2 pernoitas', monthStats(st, { ym: '2026-03' }).nightStops, 2);
}

console.log(`\nDinheiro a menos (bloco 6): ${pass} ✓ · ${fail} ✗`);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
