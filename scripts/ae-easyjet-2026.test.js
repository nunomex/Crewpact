/*
 * Golden do NOVO acordo dos pilotos da easyJet (2026-11-13) — AE easyJet × SPAC, "Revisão global",
 * Boletim do Trabalho e Emprego n.º 29, de 8 de agosto de 2026, p. 124–156 (fontes/ae-easyjet/easyjet-spac-2026.txt).
 *
 *  1.ª parte — cada número do motor tem a sua CITAÇÃO, palavra por palavra, na página indicada do texto oficial.
 *  2.ª parte — o motor (ae/easyjetSpac.js) dá esses números nos meses certos, e os meses anteriores não mudam:
 *              até janeiro de 2026 o BTE 40/2023; de fevereiro a junho de 2026 o Anexo I.1, I.2 e I.8 novos com as regras
 *              de 2023; desde julho de 2026 as regras novas (assinatura a 26 de junho; as tabelas resolvem ao mês).
 * O que mudou, artigo a artigo: docs/ae-easyjet-pilotos-2026.md.
 * Executar:  node scripts/ae-easyjet-2026.test.js   (ou: npm run test:ae-2026)
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

let ok = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (got === want || (got == null && want == null && got === want)) ok++;
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${JSON.stringify(want)}\n      obtido:   ${JSON.stringify(got)}`); }
};

// ───────────────────────── 1.ª parte — as citações no texto oficial ─────────────────────────
const raw = fs.readFileSync(path.resolve('fontes/ae-easyjet/easyjet-spac-2026.txt'), 'utf8');
const norm = (s) => String(s).replace(/-\n\s*/g, '').replace(/\s+/g, ' ').trim();   // junta as palavras partidas no fim da linha
const PAGES = {};
raw.split(/^=====\[PDF p\.(\d+) \| BTE p\.(\d+)\]=====$/m).forEach((chunk, i, arr) => {
  if (i % 3 === 0 && i > 0) PAGES[arr[i - 1]] = norm(chunk);
});
eq('o texto tem as 33 páginas (BTE 124 a 156)', Object.keys(PAGES).join(','), Array.from({ length: 33 }, (_, i) => String(124 + i)).join(','));
const cite = (bte, quote, what) => eq(`citação BTE p. ${bte} — ${what}`, (PAGES[bte] || '').includes(norm(quote)), true);

// Identificação e vigência
cite(124, 'Boletim do Trabalho e Emprego 29 8 agosto 2026', 'o boletim');
cite(124, 'SPAC - Sindicato dos Pilotos da Aviação Civil - Revisão global', 'pilotos, revisão global');
cite(124, 'O presente AE entrará em vigor na data da sua assinatura pelas partes («data de entrada em vigor»)', 'entrada em vigor = assinatura');
cite(124, 'permanecendo válido até 31 de janeiro de 2029', 'válido até 31-01-2029');
cite(124, 'As cláusulas especificamente designadas como tal produzirão efeitos a partir de 1 de fevereiro de 2026', 'efeitos a 1-fev-2026');
cite(124, 'publicado no Boletim do Trabalho e Emprego, n.º 40, de 29 de outubro de 2023', 'revoga o BTE 40/2023');
cite(155, 'Lisboa, 26 de junho de 2026.', 'a data da assinatura');
cite(156, 'Depositado a 23 de julho de 2026', 'o depósito');

// Anexo I.1 e I.2 (BTE 152) — conferidos na imagem da página
cite(152, 'A partir de 1 de fevereiro de 2026', 'a data das tabelas 1 e 2');
cite(152, 'Comandante (CPT) 160 999,74 € final gross', 'base CPT');
cite(152, 'Oficial-piloto sénior (SFO) 91 405,53 € final gross', 'base SFO');
cite(152, 'Oficial piloto (FO) 70 829,60 € final gross', 'base FO');
cite(152, 'Oficial-piloto junior (SO) 39 513,00 € final gross', 'base SO');
cite(152, 'Comandante (CPT) 85,84 € valor final de', 'setor nominal CPT');
cite(152, 'Oficial-piloto sénior (SFO) 56,13 € valor final de', 'setor nominal SFO');
cite(152, 'Oficial piloto (FO) 45,60 € valor final de', 'setor nominal FO');
cite(152, 'Oficial-piloto junior (SO) 43,77 € valor final de', 'setor nominal SO');
// (os cabeçalhos das três colunas saem lado a lado no texto extraído: "A partir de" ×3 e, na linha seguinte, as três datas)
cite(152, '1 de fevereiro de 2026 1 de fevereiro de 2027 1 de fevereiro de 2028', 'as três colunas: 2026, 2027 e 2028');
cite(152, 'acordo com a media de 12 meses até dezembro', 'o IPC: média de 12 meses até dezembro');
// Anexo I.3 a I.7 (BTE 153)
cite(153, '3. Pagamento de dias de férias', 'dias de férias');
cite(153, 'Oficial-piloto junior (SO) 2 setores nominais', 'férias: 2 setores (também o SO)');
cite(153, '4. Paragem noturna 2 setores nominais', 'paragem noturna');
cite(153, '120,00 € por dia', 'instrutor');
cite(153, '0,33 setores nominal por serviço de formação de treino em linha (LTC)', 'LTC');
cite(153, '7. Deveres ad-hoc 3 setores nominais', 'ad-hoc');
// Anexo I.8 a I.11 (BTE 154)
cite(154, '8. Prestação de benefícios', 'prestação de benefícios');
cite(154, '3 729,25 €', 'benefícios CPT');
cite(154, '2 131,00 €', 'benefícios SFO');
cite(154, '1 065,50 €', 'benefícios FO e SO');
cite(154, 'A partir do 3.º aniversário de serviço 5 %', 'permanência SFO');
cite(154, '10.º aniversário de serviço e seguintes 15 %', 'permanência CPT, 3.º escalão');
cite(154, 'Dia 1 a 3 de doença: 80 % da retribuição base diária por cada dia de', 'doença 80 %');
cite(154, 'SNC default: 60,00 €', 'SNC 60 €');
cite(154, 'Enhanced SNC: 240,00 € por alteração de escala qualificada', 'SNC 240 €');
// Anexo I.12 a I.16 (BTE 155)
cite(155, 'IDO: : 0,8 % do salário base anual do contrato full time FRV', 'IDO');
cite(155, 'DDO: : 0,4 % do salário base anual do contrato full time FRV', 'DDO');
cite(155, 'WFLY: : 1 % do salário base anual do contrato full time FRV', 'WFLY');
cite(155, 'OFC4 - 1,5 setores nominais', 'OFC4');
cite(155, 'OFC8 - 3 setores nominais', 'OFC8');
cite(155, 'No contrato 8/12, o subsídio base de retenção será de 13,33 % do', 'retenção 8/12');
cite(155, 'Serviços SOC e EXPD: 2 setores nominais por cada código SOC ou', 'SOC e EXPD');
// Articulado
cite(132, 'O subsídio de retenção de base corresponderá a 13,33 % da remuneração base anual a tempo completo, ou a 8528,00 €, consoante o valor que seja superior', 'retenção 8/12 (Art. 24.º, n.º 20, a))');
cite(132, 'O pagamento será efetuado no processamento salarial de maio, com início em maio de 2027', 'retenção: desde maio de 2027');
cite(132, 'O direito a férias anuais corresponderá a 19 dias de férias para um período de atividade de 8 meses', 'férias PPY 8/12');
cite(133, 'O subsídio de retenção de inverno aplicável no contrato 9/12 é de 10 % do salário base anual a tempo completo, ou a 6396,00 €, consoante o valor que seja superior', 'retenção 9/12 (Art. 25.º, n.º 6)');
cite(133, 'O direito a férias anuais no contrato 9/12 corresponderá a 21 dias de férias', 'férias PPY 9/12');
cite(133, 'O direito a férias anuais no contrato «legado» 8/4 corresponderá a 18 dias de férias', 'férias 8/4 legado');
cite(136, 'S ≤ 400 NM', 'banda curta');
cite(136, '401 ≤ S ≤ 1000 NM', 'banda média');
cite(136, '1001 ≤ S ≤ 1500 NM', 'banda longa');
cite(136, 'S ≥ 1501 NM', 'banda extra-longa');
cite(137, 'Todos os voos domésticos operados conferirão direito ao pagamento de um setor nominal adicional por aterragem planeada', 'voos domésticos (Art. 37.º, n.º 8)');
cite(137, 'Os serviços identificados pelos códigos SOC e EXPD serão remunerados à razão de dois setores nominais por cada ocorrência', 'SOC e EXPD (Art. 37.º, n.º 9)');
cite(137, 'a) 90 a 119 minutos: 0,5 setor nominal;', 'turnaround 90–119');
cite(137, 'b) 120 a 179 minutos: 1,0 setor nominal;', 'turnaround 120–179');
cite(137, 'c) 180 minutos ou mais: 1,5 setores nominais.', 'turnaround 180+');
cite(138, 'LTC - 12,5 %; TRI - 15 %; TRE - 17,5 %', 'acréscimos de formação');
cite(138, 'Cada dia de formação ministrada por piloto qualificado como LTC acumulará 0,33 de setor nominal', 'LTC (Art. 42.º, n.º 3)');
cite(139, 'O prémio de permanência será pago mensalmente, de forma proporcional', 'permanência mensal');
cite(139, 'ficará sujeita a um período mínimo de preparação de 12 meses a contar da data de assinatura do presente AE', 'permanência: 12 meses de preparação');
cite(139, 'a 80 % da respetiva remuneração base, mediante entrega de comprovativo da situação de incapacidade', 'doença 80 % (Art. 48.º)');
cite(141, 'A partir de novembro de 2026, a participação no padrão de escala 4-4 ficará limitada a 20 % FTE', '4-4 desde novembro de 2026');
cite(141, 'O padrão de escala 4-4 confere direito a 23 dias LVE', 'férias 4-4');
cite(141, 'A remuneração base aplicável ao padrão de escala 4-4 corresponderá a 83 % da remuneração base aplicável ao padrão FRV', '4-4 = 83 %');
// O quadro do Art. 61.º (BTE 142): o texto extraído desalinha as linhas; conferido na IMAGEM da página — FRV144 100 % 27 100 900 ·
// 5-4 92 % 25 92 828 · 4-4 83 % 23 83 747 · 7-7 71 % 19 71 639 · 14-14 53 % 14 53 477 · 21-7 77 % 21 77 693.
for (const q of ['FRV144 100 %', '5-4 92 %', '4-4 83 %', '7-7 71 %', '14-14 53 %', '21-7 77 %', '27 100 900', '25 92 828', '23 83 747', '19 71 639', '14 53 477', '21 77 693']) cite(142, q, `Art. 61.º, quadro: "${q}"`);
cite(144, 'no valor de 240,00 € por alteração de escala, aplicável a todas as categorias profissionais', 'enhanced SNC (Art. 65.º, n.º 11)');
cite(143, 'entre 1 de abril e 31 de outubro', 'enhanced SNC: de abril a outubro');
cite(144, 'uma alteração de escala qualificada comunicada dentro das 120 horas anteriores ao serviço', 'enhanced SNC: 120 horas');
cite(144, 'não exceda 76,7 %', 'enhanced SNC: a estabilidade de escala');
// O quadro do Art. 69.º (BTE 145): modelo · folgas por bloco · férias · GDO · %
cite(145, '14-14 5 14 12 53 %', 'Art. 69.º, quadro: 14-14');
cite(145, '21-7 8 21 18 77 %', 'Art. 69.º, quadro: 21-7');
cite(145, '7-7 1 19 0 71 %', 'Art. 69.º, quadro: 7-7');
cite(146, 'Os pilotos com contrato de trabalho a tempo completo 12/12 no padrão FRV144 têm direito a 27 dias de férias por ano de férias', 'férias 27 dias (Art. 71.º, n.º 1)');
cite(146, 'A confirmação do ano de férias a partir do qual este direito produzirá efeitos deverá ser validada pelas partes antes da assinatura final', 'férias: o ano de efeito fica por dizer');
cite(149, 'a 35 % da remuneração mensal base', 'gravidez 35 % (Art. 80.º, n.º 2)');

// ───────────────────────── 2.ª parte — o motor ─────────────────────────
const ae = require(path.resolve('ae/easyjetSpac.js'));
const { monthlyAe, monthlyPerDiem, serviceMoney, roleEurFor, domesticLandings, turnaroundsOf } = require(path.resolve('data/perdiem.js'));
const { evaluateDisruption } = require(path.resolve('data/disruption.js'));

// Vigência (Art. 2.º)
eq('vigência: até 31-01-2029', ae.AE_VALID_UNTIL, '2029-01-31');
eq('vigência: desde a assinatura', ae.AE_VALID_FROM, '2026-06-26');
eq('em vigor a 13-11-2026', ae.isAgreementExpired(new Date('2026-11-13T12:00:00')), false);
eq('em vigor a 31-01-2029', ae.isAgreementExpired(new Date('2029-01-31T12:00:00')), false);
eq('expirado a 01-02-2029', ae.isAgreementExpired(new Date('2029-02-01T12:00:00')), true);
eq('sem reconhecimento de expiração (há acordo novo)', ae.AE_EXPIRY_ACK, null);

// A linha do tempo das tabelas
const T = (ym) => ae.tableAt(ym);
eq('jan-2026: ainda o Anexo I de 2023 (CPT 122 000)', T('2026-01').BASE_ANNUAL.CPT, 122000);
eq('fev-2026: base CPT', T('2026-02').BASE_ANNUAL.CPT, 160999.74);
eq('fev-2026: base SFO', T('2026-02').BASE_ANNUAL.SFO, 91405.53);
eq('fev-2026: base FO', T('2026-02').BASE_ANNUAL.FO, 70829.60);
eq('fev-2026: base SO', T('2026-02').BASE_ANNUAL.SO, 39513.00);
eq('fev-2026: setor nominal CPT', T('2026-02').NOMINAL_SECTOR.CPT, 85.84);
eq('fev-2026: setor nominal SFO', T('2026-02').NOMINAL_SECTOR.SFO, 56.13);
eq('fev-2026: setor nominal FO', T('2026-02').NOMINAL_SECTOR.FO, 45.60);
eq('fev-2026: setor nominal SO', T('2026-02').NOMINAL_SECTOR.SO, 43.77);
eq('fev-2026: benefícios', JSON.stringify(T('2026-02').BENEFITS_ANNUAL), JSON.stringify({ CPT: 3729.25, SFO: 2131, FO: 1065.5, SO: 1065.5 }));
eq('fev-2026: a doença ainda a 60 % (regra de 2023)', T('2026-02').SICK_PCT, 0.60);
eq('jun-2026: a doença ainda a 60 % (assinatura a 26; conta desde julho)', T('2026-06').SICK_PCT, 0.60);
eq('jul-2026: a doença a 80 %', T('2026-07').SICK_PCT, 0.80);
eq('26-06-2026 (dia dado): já as regras novas', T('2026-06-26').SICK_PCT, 0.80);
eq('25-06-2026 (dia dado): ainda as antigas', T('2026-06-25').SICK_PCT, 0.60);
eq('sem data: a tabela atual (base CPT de 2026)', T().BASE_ANNUAL.CPT, 160999.74);
eq('constante atual BASE_ANNUAL = 2026', ae.BASE_ANNUAL.FO, 70829.60);
eq('constante atual NOMINAL_SECTOR = 2026', ae.NOMINAL_SECTOR.FO, 45.60);
eq('há tabela para o SO em fev-2026', ae.hasTableFor('SO', '2026-02'), true);

// O índice: 2,3 % de fev-2025 a jan-2026; 1 desde fev-2026 (valores finais); 2027 e 2028 à espera do INE
eq('índice jan-2026 = 1,023', ae.indexFactor('2026-01'), 1.023);
eq('índice fev-2026 = 1', ae.indexFactor('2026-02'), 1);
eq('índice nov-2026 = 1', ae.indexFactor('2026-11'), 1);
eq('índice 2026 (ano) = 1', ae.indexFactor(2026), 1);
eq('índice jan-2027 = 1, certo', ae.isIndexEstimated('2027-01'), false);
eq('índice fev-2027 sem IPC = 1 (valores de 2026)', ae.indexFactor('2027-02'), 1);
eq('índice fev-2027 sem IPC: falta o IPC', ae.isIndexEstimated('2027-02'), true);
eq('índice fev-2027 com IPC 2,1 %', ae.indexFactor('2027-02', { ipc2027: 0.021 }), 1.021);
eq('índice fev-2027 com IPC: certo', ae.isIndexEstimated('2027-02', { ipc2027: 0.021 }), false);
eq('índice fev-2027: sem mínimo (0,4 % fica 0,4 %)', ae.indexFactor('2027-02', { ipc2027: 0.004 }), 1.004);
eq('índice fev-2027: sem máximo (6 % fica 6 %)', ae.indexFactor('2027-02', { ipc2027: 0.06 }), 1.06);
eq('índice fev-2028 = 2027 × 2028', ae.indexFactor('2028-02', { ipc2027: 0.021, ipc2028: 0.02 }), 1.04142);
eq('índice fev-2028 sem o IPC de 2028: falta', ae.isIndexEstimated('2028-02', { ipc2027: 0.021 }), true);

// Base mensal (Art. 36.º: 14 prestações)
const mb = (cat, ym, contract = '12/12') => ae.monthlyBase(cat, { contract, ym, index: ae.indexFactor(ym) });
eq('CPT jan-2026: 122 000 × 1,023 ÷ 14', mb('CPT', '2026-01'), 8914.71);
eq('CPT fev-2026: 160 999,74 ÷ 14', mb('CPT', '2026-02'), 11499.98);
eq('SFO fev-2026: 91 405,53 ÷ 14', mb('SFO', '2026-02'), 6528.97);
eq('FO fev-2026: 70 829,60 ÷ 14', mb('FO', '2026-02'), 5059.26);
eq('SO fev-2026: 39 513,00 ÷ 14', mb('SO', '2026-02'), 2822.36);
eq('CPT nov-2026', mb('CPT', '2026-11'), 11499.98);
eq('CPT fev-2027 sem IPC: os valores de 2026', mb('CPT', '2027-02'), 11499.98);

// Contratos (Art. 61.º e 69.º; 4-4 no Art. 60.º)
eq('contratos: o 4-4 existe', ae.CONTRACTS.includes('4-4'), true);
eq('rótulo 4-4', ae.contractLabel('4-4'), 'Escala fixa 4-4');
eq('14-14 em jun-2026: 51 %', ae.contractFactor('14-14', '2026-06'), 0.51);
eq('14-14 em jul-2026: 53 %', ae.contractFactor('14-14', '2026-07'), 0.53);
eq('21-7 em jun-2026: 74 %', ae.contractFactor('21-7', '2026-06'), 0.74);
eq('21-7 em jul-2026: 77 %', ae.contractFactor('21-7', '2026-07'), 0.77);
eq('7-7: 71 % antes e depois', ae.contractFactor('7-7', '2026-03') === 0.71 && ae.contractFactor('7-7', '2026-09') === 0.71, true);
eq('5/4: 92 %', ae.contractFactor('5/4', '2026-09'), 0.92);
eq('4-4 em nov-2026: 83 %', ae.contractFactor('4-4', '2026-11'), 0.83);
eq('sem mês: o acordo atual (14-14 a 53 %)', ae.contractFactor('14-14'), 0.53);
eq('4-4 num mês anterior ao acordo (não existia): 83 %, nunca 100 %', ae.contractFactor('4-4', '2026-03'), 0.83);
eq('CPT 14-14 jun-2026: 160 999,74 × 0,51 ÷ 14', mb('CPT', '2026-06', '14-14'), 5864.99);
eq('CPT 14-14 jul-2026: 160 999,74 × 0,53 ÷ 14', mb('CPT', '2026-07', '14-14'), 6094.99);
eq('CPT 4-4 nov-2026: 160 999,74 × 0,83 ÷ 14', mb('CPT', '2026-11', '4-4'), 9544.98);
eq('FO PPY 8/12 nov-2026: 70 829,60 × 8/12 ÷ 14', mb('FO', '2026-11', 'PPY 8/12'), 3372.84);

// Por voo (Art. 37.º, 39.º, 38.º, 43.º; Anexo I.13)
eq('per diem FO mar-2026, curto + médio: 2,0 × 45,60', ae.perDiem('FO', [300, 800], 1, undefined, '2026-03'), 91.20);
eq('per diem CPT mar-2026, curto: 0,8 × 85,84', ae.perDiem('CPT', [300], 1, undefined, '2026-03'), 68.67);
eq('per diem SO mar-2026, extra-longo + curto: 3,3 × 43,77', ae.perDiem('SO', [1600, 300], 1, undefined, '2026-03'), 144.44);
eq('banda: 400 NM é curto', ae.sectorMult(400), 0.8);
eq('banda: 401 NM é médio', ae.sectorMult(401), 1.2);
eq('banda: 1000 NM é médio', ae.sectorMult(1000), 1.2);
eq('banda: 1500 NM é longo', ae.sectorMult(1500), 1.5);
eq('banda: 1501 NM é extra-longo', ae.sectorMult(1501), 2.5);
eq('paragem noturna CPT mar-2026: 2 × 85,84', ae.nightStop('CPT', 1, '2026-03'), 171.68);
eq('dia de férias FO mar-2026: 2 × 45,60', ae.vacDay('FO', 1, '2026-03'), 91.20);
eq('ad-hoc SO mar-2026: 3 × 43,77', ae.adhoc('SO', 1, '2026-03'), 131.31);
eq('OFC4 FO: 1,5 × 45,60', ae.office4('FO', 1, '2026-03'), 68.40);
eq('OFC8 FO: 3 × 45,60', ae.office8('FO', 1, '2026-03'), 136.80);
eq('ADTY SFO não chamado, 4 h ou mais: 2 × 56,13', ae.airportStandby('SFO', { called: false, over4h: true, ym: '2026-03' }), 112.26);
eq('instrutor: 120 €', ae.instructor('2026-09'), 120);

// Doença (Art. 48.º; Anexo I.10): 60 % até junho, 80 % desde julho de 2026
eq('doença FO jun-2026: 60 % × (70 829,60 ÷ 14) ÷ 30', ae.sickDay('FO', 1, '2026-06'), 101.19);
eq('doença FO jul-2026: 80 %', ae.sickDay('FO', 1, '2026-07'), 134.91);
eq('doença CPT jul-2026: 80 %', ae.sickDay('CPT', 1, '2026-07'), 306.67);
eq('doença FO PPY 8/12 jul-2026: a base do contrato ("respetiva remuneração base")', ae.sickDay('FO', 1, '2026-07', 'PPY 8/12'), 89.94);

// DDO / IDO / WFLY (Anexo I.12): "% do salário base anual do contrato full time FRV". Nos contratos a tempo parcial o acordo tem
// duas leituras — o Anexo (a base a tempo completo) e a "redução proporcional de todos os termos e condições" (Art. 24.º, n.º 14;
// Art. 69.º, n.º 1) → o certo é a base do contrato (como em 2023) e, desde julho de 2026, o máximo é a base a tempo completo.
eq('DDO CPT mar-2026: 0,4 % × 160 999,74', ae.ddo('CPT', 1, '2026-03'), 644.00);
eq('IDO CPT mar-2026: 0,8 %', ae.ido('CPT', 1, '2026-03'), 1288.00);
eq('WFLY CPT mar-2026: 1 %', ae.wfly('CPT', 1, '2026-03'), 1610.00);
eq('WFLY CPT 14-14 jun-2026: × 51 % (regra de 2023)', ae.wfly('CPT', 1, '2026-06', '14-14'), 821.10);
eq('WFLY CPT 14-14 jul-2026: o certo, × 53 %', ae.wfly('CPT', 1, '2026-07', '14-14'), 853.30);
eq('WFLY CPT 14-14 jul-2026: o máximo, a base a tempo completo', ae.widoMax('wfly', 'CPT', 1, '2026-07', '14-14'), 1610.00);
eq('WFLY CPT 14-14 jun-2026: sem máximo (o texto de 2023 não fala em tempo completo)', ae.widoMax('wfly', 'CPT', 1, '2026-06', '14-14'), null);
eq('WFLY CPT 12/12 jul-2026: sem máximo (é a mesma base)', ae.widoMax('wfly', 'CPT', 1, '2026-07', '12/12'), null);
eq('WFLY CPT 5/4 jul-2026: o certo, × 92 %', ae.wfly('CPT', 1, '2026-07', '5/4'), 1481.20);
eq('DDO FO PPY 8/12 jul-2026: o certo, × 8/12', ae.ddo('FO', 1, '2026-07', 'PPY 8/12'), 188.88);
eq('DDO FO PPY 8/12 jul-2026: o máximo', ae.widoMax('ddo', 'FO', 1, '2026-07', 'PPY 8/12'), 283.32);
{
  const x = ae.monthExtras('FO', { ddo: 1, ido: 1 }, { ym: '2026-09', contract: 'PPY 8/12' });
  eq('extras FO PPY 8/12 set-2026, DDO + IDO: o certo (188,88 + 377,76)', x.total, 566.64);
  eq('extras FO PPY 8/12 set-2026, DDO + IDO: o máximo (283,32 + 566,64)', x.max, 849.96);
  eq('extras FO 12/12 set-2026: sem máximo', ae.monthExtras('FO', { ddo: 1 }, { ym: '2026-09' }).max, undefined);
}
eq('IDO FO jul-2026', ae.ido('FO', 1, '2026-07'), 566.64);
eq('WFLY FO jul-2026', ae.wfly('FO', 1, '2026-07'), 708.30);

// SNC (Art. 65.º; Anexo I.11): 60 € certos; até 240 € de abril a outubro, se o regime reforçado estiver ativo
eq('SNC ago-2026: 60 €', ae.snc('2026-08'), 60);
eq('SNC ago-2026: até 240 €', ae.sncMax('2026-08'), 240);
eq('SNC dez-2026: sem regime reforçado', ae.sncMax('2026-12'), null);
eq('SNC abr-2026: antes da assinatura', ae.sncMax('2026-04'), null);
eq('SNC abr-2027: até 240 €', ae.sncMax('2027-04'), 240);
eq('SNC out-2027: até 240 €', ae.sncMax('2027-10'), 240);
eq('SNC nov-2027: não', ae.sncMax('2027-11'), null);
{
  const x = ae.monthExtras('FO', { snc: 2 }, { ym: '2026-08' });
  eq('2 SNC em ago-2026: 120 € certos', x.total, 120);
  eq('2 SNC em ago-2026: até 480 €', x.max, 480);
  eq('2 SNC em dez-2026: sem máximo', ae.monthExtras('FO', { snc: 2 }, { ym: '2026-12' }).max, undefined);
}

// Prestações do ano
const A = (cat, ym, o = {}) => ae.annualItems(cat, { ym, index: ae.indexFactor(ym), serviceStart: '2016-03-01', ...o });
const item = (list, id) => list.find((x) => x.id === id) || null;
eq('benefícios CPT abr-2025: 3 500 €', ae.benefits('CPT', '2025-04'), 3500);
eq('benefícios CPT abr-2026: 3 729,25 €', ae.benefits('CPT', '2026-04'), 3729.25);
eq('abril de 2026, CPT: prestação complementar', item(A('CPT', '2026-04'), 'benefits').eur, 3729.25);
eq('abril de 2026, SFO', item(A('SFO', '2026-04'), 'benefits').eur, 2131.00);
eq('abril de 2026, FO', item(A('FO', '2026-04'), 'benefits').eur, 1065.50);
eq('abril de 2026, CPT 14-14: × 51 % (regra de 2023)', item(A('CPT', '2026-04', { contract: '14-14' }), 'benefits').eur, 1901.92);
eq('abril de 2027, CPT 14-14: × 53 %', item(A('CPT', '2027-04', { contract: '14-14' }), 'benefits').eur, 1976.50);
eq('abril de 2027, CPT 4-4: inteira (só a base é a 83 %)', item(A('CPT', '2027-04', { contract: '4-4' }), 'benefits').eur, 3729.25);
eq('abril de 2027 com IPC de 4 %: a prestação também sobe', item(ae.annualItems('CPT', { ym: '2027-04', index: 1.04, serviceStart: '2016-03-01' }), 'benefits').eur, 3878.42);
eq('abril de 2025 com o IPC de 2025: a prestação NÃO sobe (BTE 40/2023)', item(A('CPT', '2025-04'), 'benefits').eur, 3500);
eq('junho de 2026, CPT: subsídio de férias (1/14)', item(A('CPT', '2026-06'), 'ferias').eur, 11499.98);
eq('novembro de 2026, FO: subsídio de Natal (1/14)', item(A('FO', '2026-11'), 'natal').eur, 5059.26);
eq('março de 2026, CPT com 10 anos: permanência 15 %', item(A('CPT', '2026-03'), 'loyalty').eur, 24149.96);
eq('março de 2026, SFO com 10 anos: permanência 5 %', item(A('SFO', '2026-03'), 'loyalty').eur, 4570.28);
// Retenção: maio de 2026 ainda pela regra de 2023; desde maio de 2027 pela nova (Art. 24.º, n.º 20, b))
{
  const old = item(A('CPT', '2026-05', { contract: 'PPY 8/12' }), 'retention');
  eq('maio de 2026, CPT PPY 8/12: regra de 2023 (12 000 × 8/12, até 12 000)', `${old.eur}|${old.max}`, '8000|12000');
  const r = (cat, contract) => item(A(cat, '2027-05', { contract }), 'retention');
  eq('maio de 2027, CPT PPY 8/12: 13,33 % × 160 999,74', r('CPT', 'PPY 8/12').eur, 21461.27);
  eq('maio de 2027, CPT PPY 8/12: um só valor', r('CPT', 'PPY 8/12').max, undefined);
  eq('maio de 2027, SFO PPY 8/12', r('SFO', 'PPY 8/12').eur, 12184.36);
  eq('maio de 2027, FO PPY 8/12', r('FO', 'PPY 8/12').eur, 9441.59);
  eq('maio de 2027, SO PPY 8/12: o mínimo de 8 528 €', r('SO', 'PPY 8/12').eur, 8528.00);
  eq('maio de 2027, CPT PPY 9/12: 10 %', r('CPT', 'PPY 9/12').eur, 16099.97);
  eq('maio de 2027, SO PPY 9/12: o mínimo de 6 396 €', r('SO', 'PPY 9/12').eur, 6396.00);
  eq('maio de 2027, PPY por estilo de vida: sem retenção (Art. 69.º, n.º 8)', item(A('CPT', '2027-05', { contract: 'PPY 8/12', lifestyle: true }), 'retention'), null);
  eq('maio de 2027, 12/12: sem retenção', item(A('CPT', '2027-05'), 'retention'), null);
  eq('maio de 2027, entrou depois de 31 de agosto de 2026: sem retenção', item(A('CPT', '2027-05', { contract: 'PPY 8/12', serviceStart: '2026-09-01' }), 'retention'), null);
  // alínea d): "manter-se empregados em Portugal em 30 de abril do ano de pagamento" — `serviceEnd` é o 1.º mês já fora
  eq('maio de 2027, saiu em março (fora desde abril): sem retenção', item(A('CPT', '2027-05', { contract: 'PPY 8/12', serviceEnd: '2027-04' }), 'retention'), null);
  eq('maio de 2027, fora desde maio (empregado a 30 de abril): tem retenção', (item(A('CPT', '2027-05', { contract: 'PPY 8/12', serviceEnd: '2027-05' }), 'retention') || {}).eur, 21461.27);
  eq('maio de 2025 (regra de 2023), fora desde abril: sem retenção', item(A('CPT', '2025-05', { contract: 'PPY 8/12', serviceEnd: '2025-04' }), 'retention'), null);
  eq('maio de 2025 (regra de 2023), PPY 9/12: cita o Art. 25.º, n.º 21', item(A('CPT', '2025-05', { contract: 'PPY 9/12' }), 'retention').cite, 'Art. 25.º, n.º 21');
  eq('maio de 2027, PPY 9/12: cita o Art. 25.º, n.º 6', r('CPT', 'PPY 9/12').cite, 'Art. 25.º, n.º 6');
}

// Férias por ano (Art. 71.º, 61.º, 60.º, 24.º, 25.º). O Art. 71.º, n.º 1 não diz o ano de férias em que os dias novos começam, e a
// assinatura caiu a meio do ano de férias 2026/27 (1 de abril a 31 de março, Art. 70.º) → até 31-03-2027 o certo é o número do
// acordo de 2023 e o máximo o do novo (`vacationRange`); desde 01-04-2027, o novo.
const vac = (contract, d) => ae.vacationDays({ contract, ref: new Date(`${d}T12:00:00`) });
const vr = (contract, d) => { const x = ae.vacationRange({ contract, ref: new Date(`${d}T12:00:00`) }); return `${x.min}-${x.max}`; };
eq('férias 12/12 a 01-06-2026: 25', vr('12/12', '2026-06-01'), '25-25');
// Os dias de férias não são dinheiro: o acordo não lhes pode dar efeito antes de entrar em vigor "após a publicação" (Código do
// Trabalho, art. 478.º, n.º 1, c) e art. 519.º, n.º 1 — fontes/pt/codigo-trabalho-2009.txt); o BTE é de 8 de agosto de 2026.
eq('férias 12/12 a 15-07-2026 (assinado, por publicar): 25', vr('12/12', '2026-07-15'), '25-25');
eq('férias 12/12 a 08-08-2026 (publicado): 25 certos, até 27', vr('12/12', '2026-08-08'), '25-27');
eq('férias 12/12 a 13-11-2026: 25 certos, até 27', vr('12/12', '2026-11-13'), '25-27');
{
  const ct = fs.readFileSync(path.resolve('fontes/pt/codigo-trabalho-2009.txt'), 'utf8');
  eq('CT art. 478.º, n.º 1, c): só o dinheiro pode ter efeito para trás', ct.includes('c) Conferir eficácia retroactiva a qualquer cláusula que não seja de natureza pecuniária.'), true);
  eq('CT art. 519.º, n.º 1: em vigor depois de publicado no BTE', ct.includes('é publicado no Boletim do Trabalho e Emprego e entra em vigor, após a publicação, nos termos da lei.'), true);
}
eq('férias 12/12 a 13-11-2026: a app conta o certo', vac('12/12', '2026-11-13'), 25);
eq('férias 12/12 a 31-03-2027: ainda o intervalo', vr('12/12', '2027-03-31'), '25-27');
eq('férias 12/12 a 01-04-2027: 27', vr('12/12', '2027-04-01'), '27-27');
eq('férias 12/12 a 01-04-2027: 27 (número)', vac('12/12', '2027-04-01'), 27);
eq('férias 5/4: 23 → 23-25 → 25', `${vr('5/4', '2026-06-01')} · ${vr('5/4', '2026-11-13')} · ${vr('5/4', '2027-04-01')}`, '23-23 · 23-25 · 25-25');
eq('férias 4-4 (só existe no acordo novo): 23', `${vr('4-4', '2026-11-13')} · ${vr('4-4', '2027-04-01')}`, '23-23 · 23-23');
eq('férias 7-7: 18-19 → 19', `${vr('7-7', '2026-11-13')} · ${vr('7-7', '2027-04-01')}`, '18-19 · 19-19');
eq('férias 14-14: 14', vr('14-14', '2026-11-13'), '14-14');
eq('férias 21-7: 21', vr('21-7', '2026-11-13'), '21-21');
eq('férias PPY 8/12: 17-19 → 19', `${vr('PPY 8/12', '2026-11-13')} · ${vr('PPY 8/12', '2027-04-01')}`, '17-19 · 19-19');
eq('férias PPY 9/12: 19-21 → 21', `${vr('PPY 9/12', '2026-11-13')} · ${vr('PPY 9/12', '2027-04-01')}`, '19-21 · 21-21');
eq('férias: o intervalo traz a nota', typeof ae.vacationRange({ contract: '12/12', ref: new Date('2026-11-13T12:00:00') }).note.pt, 'string');
eq('férias: a nota do ano de efeito existe', typeof ae.VAC_NOTE.pt === 'string' && ae.VAC_NOTE.pt.includes('Art. 71.º'), true);

// Rubricas novas: o valor de cada uma (a soma ao mês está mais abaixo)
eq('turnaround 89 min: nada', ae.turnaroundSectors(89), 0);
eq('turnaround 90 min: 0,5', ae.turnaroundSectors(90), 0.5);
eq('turnaround 119 min: 0,5', ae.turnaroundSectors(119), 0.5);
eq('turnaround 120 min: 1,0', ae.turnaroundSectors(120), 1);
eq('turnaround 179 min: 1,0', ae.turnaroundSectors(179), 1);
eq('turnaround 180 min: 1,5', ae.turnaroundSectors(180), 1.5);
eq('turnaround CPT 125 min, ago-2026: 1 setor', ae.turnaround('CPT', 125, 1, '2026-08'), 85.84);
eq('turnaround em maio de 2026: ainda não existe', ae.turnaround('CPT', 125, 1, '2026-05'), null);
eq('voo doméstico FO, ago-2026: 1 setor por aterragem', ae.domesticSector('FO', 1, '2026-08'), 45.60);
eq('voo doméstico em maio de 2026: ainda não existe', ae.domesticSector('FO', 1, '2026-05'), null);
eq('SOC / EXPD FO, ago-2026: 2 setores', ae.socExpd('FO', 1, '2026-08'), 91.20);
eq('LTC CPT, ago-2026: 0,33 × 85,84', ae.ltcDay('CPT', 1, '2026-08'), 28.33);
eq('LTC em maio de 2026: ainda não existe', ae.ltcDay('CPT', 1, '2026-05'), null);
eq('acréscimos de formação: LTC 12,5 % · TRI 15 % · TRE 17,5 %', JSON.stringify(ae.TRAINER_BASE_UPLIFT), JSON.stringify({ LTC: 0.125, TRI: 0.15, TRE: 0.175 }));

// O mês inteiro, pela ponte da app (data/perdiem.js): novembro de 2026, FO 12/12, um voo curto + médio e uma noite fora
{
  const duties = { '2026-11-05': { kind: 'flight', route: 'LIS-MAD-LIS' }, '2026-11-10': { kind: 'flight', route: 'LIS-CDG', nightStop: true }, '2026-11-11': { kind: 'flight', route: 'CDG-LIS' } };
  const m = monthlyAe(duties, 'FO', '12/12', ae, { ym: '2026-11', index: ae.indexFactor('2026-11'), serviceStart: '2020-03-01' });
  eq('nov-2026 FO: base', m.base, 5059.26);
  eq('nov-2026 FO: per diem (2 curtos + 2 médios = 4,0 × 45,60)', m.perDiem, 182.40);
  eq('nov-2026 FO: uma paragem noturna (2 × 45,60)', m.nightStops, 91.20);
  eq('nov-2026 FO: subsídio de Natal no mês', m.annual, 5059.26);
  eq('nov-2026 FO: total', m.total, 10392.12);
}

// ───────────── As rubricas novas NA SOMA DO MÊS (2.ª parte da sessão de 2026-11-13) ─────────────
// Voo doméstico (Art. 37.º, n.º 8): "um setor nominal adicional por aterragem planeada" em "voos domésticos operados". O acordo
// não define "doméstico": partida e chegada em Portugal é doméstico em qualquer leitura (o acordo "aplica-se em território
// português", Art. 1.º, n.º 3) → certo; partida e chegada no MESMO país estrangeiro → só no máximo. Um posicionamento não é voo
// operado. Entra no per diem (é o artigo dos per diems).
{
  const fnc = { kind: 'flight', route: 'LIS-FNC-LIS' };
  eq('doméstico: LIS-FNC-LIS = 2 aterragens em Portugal', JSON.stringify(domesticLandings(fnc)), JSON.stringify({ pt: 2, other: 0 }));
  eq('doméstico: LIS-MAD-LIS = nenhuma', JSON.stringify(domesticLandings({ kind: 'flight', route: 'LIS-MAD-LIS' })), JSON.stringify({ pt: 0, other: 0 }));
  eq('doméstico: MAD-BCN (Espanha-Espanha) = só no máximo', JSON.stringify(domesticLandings({ kind: 'flight', route: 'MAD-BCN' })), JSON.stringify({ pt: 0, other: 1 }));
  eq('doméstico: a perna de posicionamento não conta', JSON.stringify(domesticLandings({ kind: 'flight', route: 'LIS-FNC-LIS', legs: [{ dep: 'LIS', arr: 'FNC' }, { dep: 'FNC', arr: 'LIS', dh: true }] })), JSON.stringify({ pt: 1, other: 0 }));
  const M = (duties, ym, cat = 'FO') => monthlyAe(duties, cat, '12/12', ae, { ym, index: ae.indexFactor(ym), serviceStart: '2020-03-01' });
  // LIS-FNC é médio (cerca de 520 NM): 2 × 1,2 × 45,60 = 109,44; + 2 aterragens × 45,60 = 91,20 → 200,64
  eq('ago-2026 FO, LIS-FNC-LIS: per diem com as 2 aterragens domésticas', M({ '2026-08-10': fnc }, '2026-08').perDiem, 200.64);
  eq('ago-2026 FO, LIS-FNC-LIS: a parte doméstica', M({ '2026-08-10': fnc }, '2026-08').domestic, 91.20);
  eq('mai-2026 FO, LIS-FNC-LIS: antes do acordo em vigor, só o per diem', M({ '2026-05-10': fnc }, '2026-05').perDiem, 109.44);
  eq('ago-2026 FO, LIS-MAD-LIS: sem nada a mais', M({ '2026-08-10': { kind: 'flight', route: 'LIS-MAD-LIS' } }, '2026-08').perDiem, 72.96);
  const es = M({ '2026-08-10': { kind: 'flight', route: 'MAD-BCN' } }, '2026-08');
  eq('ago-2026 FO, MAD-BCN: o certo é só o per diem (curto)', es.perDiem, 36.48);
  eq('ago-2026 FO, MAD-BCN: o máximo leva o setor doméstico', es.perDiemMax, 82.08);
  eq('o serviço = a parcela do mês (doméstico)', serviceMoney(ae, 'FO', fnc, { date: '2026-08-10' }).perDiem, 200.64);
  eq('o per diem do ano (monthlyPerDiem) também o leva', monthlyPerDiem({ '2026-08-10': fnc }, 'FO', ae, { ym: '2026-08', index: 1 }).total, 200.64);
  eq('posicionamento LIS-FNC: sem setor doméstico', M({ '2026-08-10': { kind: 'positioning', route: 'LIS-FNC' } }, '2026-08').perDiem, 0);
}
// Turnaround planeado (Art. 37.º-A): o tempo entre a chegada de um setor e a partida do seguinte, no mesmo aeroporto, pelas horas
// da escala; só entre dois setores operados.
{
  const svc = (on, off) => ({ kind: 'flight', route: 'LIS-MAD-LIS', legs: [{ dep: 'LIS', arr: 'MAD', off: '07:00', on }, { dep: 'MAD', arr: 'LIS', off, on: '14:00' }] });
  eq('turnaround: 10:00 → 11:45 = 105 min', JSON.stringify(turnaroundsOf(svc('10:00', '11:45'))), '[105]');
  eq('turnaround: sem horas não se sabe', JSON.stringify(turnaroundsOf({ kind: 'flight', route: 'LIS-MAD-LIS' })), '[]');
  eq('turnaround: antes de um posicionamento não conta', JSON.stringify(turnaroundsOf({ kind: 'flight', legs: [{ dep: 'LIS', arr: 'MAD', off: '07:00', on: '10:00' }, { dep: 'MAD', arr: 'LIS', off: '13:00', on: '14:00', dh: true }] })), '[]');
  const X = (on, off, date = '2026-08-10') => monthlyAe({ [date]: svc(on, off) }, 'FO', '12/12', ae, { ym: date.slice(0, 7), index: 1, serviceStart: '2020-03-01' });
  eq('turnaround 60 min: nada', X('10:00', '11:00').turnaround, 0);
  eq('turnaround 105 min FO: 0,5 × 45,60', X('10:00', '11:45').turnaround, 22.80);
  eq('turnaround 125 min FO: 1,0 × 45,60', X('10:00', '12:05').turnaround, 45.60);
  eq('turnaround 180 min FO: 1,5 × 45,60', X('10:00', '13:00').turnaround, 68.40);
  eq('turnaround 105 min: entra nos extras da escala', X('10:00', '11:45').extras, 22.80);
  eq('turnaround em maio de 2026: ainda não existe', X('10:00', '13:00', '2026-05-10').turnaround, 0);
  eq('turnaround que passa a meia-noite: 23:30 → 01:15 = 105 min', JSON.stringify(turnaroundsOf(svc('23:30', '01:15'))), '[105]');
  const sm = serviceMoney(ae, 'FO', svc('10:00', '12:05'), { date: '2026-08-10' });
  eq('o serviço mostra o turnaround', `${sm.other && sm.other.eur}|${sm.other && sm.other.lbl.pt}`, '45.6|Turnaround longo (Art. 37.º-A)');
}
// SOC / EXPD (Art. 37.º, n.º 9; Anexo I.16): 2 setores nominais por ocorrência — um evento que o piloto regista.
eq('SOC/EXPD é um tipo de evento', ae.EXTRA_KINDS.some((k) => k.id === 'socExpd'), true);
eq('SOC/EXPD FO ago-2026: 2 × 45,60', ae.monthExtras('FO', { socExpd: 1 }, { ym: '2026-08' }).total, 91.20);
eq('SOC/EXPD em maio de 2026: sem valor (ainda não existia)', JSON.stringify(ae.monthExtras('FO', { socExpd: 1 }, { ym: '2026-05' }).items.map((i) => [i.id, i.noValue, i.total])), JSON.stringify([['socExpd', true, 0]]));
// LTC (Art. 42.º, n.º 3): 0,33 setor nominal por dia de formação dada em linha — um papel no voo, uma vez por dia.
{
  eq('LTC: papel disponível com a qualificação de instrutor', ae.additionalRolesFor('CPT', { instructorRated: true }).map((r) => r.id).join(','), 'instr,ltc');
  eq('LTC: sem a qualificação não aparece', ae.additionalRolesFor('CPT').map((r) => r.id).join(','), 'instr');
  eq('LTC CPT ago-2026: 0,33 × 85,84', roleEurFor(ae, 'CPT', 'ltc', 2, '2026-08-10'), 28.33);
  eq('LTC em maio de 2026: nada', roleEurFor(ae, 'CPT', 'ltc', 2, '2026-05-10'), 0);
  const day = { '2026-08-10': { kind: 'flight', route: 'LIS-MAD-LIS', role: 'ltc', extra: [{ kind: 'flight', route: 'LIS-OPO', role: 'ltc' }] } };
  eq('LTC: dois voos no mesmo dia pagam um dia', monthlyAe(day, 'CPT', '12/12', ae, { ym: '2026-08', index: 1, serviceStart: '2016-03-01' }).extras, 28.33);
  eq('LTC numa formação em terra: não é treino em linha', monthlyAe({ '2026-08-10': { kind: 'training', role: 'ltc' } }, 'CPT', '12/12', ae, { ym: '2026-08', index: 1, serviceStart: '2016-03-01' }).extras, 0);
}
// SNC com o regime reforçado CONHECIDO (Art. 65.º, n.º 11 e 12): ativo → 240 € de abril a outubro; não ativo → 60 €; sem se
// saber → 60 € certos, até 240 €.
{
  const x = (o) => ae.monthExtras('FO', { snc: 2 }, { ym: '2026-08', ...o });
  eq('SNC ago-2026, regime ativo: 2 × 240', `${x({ sncEnhanced: true }).total}|${x({ sncEnhanced: true }).max}`, '480|undefined');
  eq('SNC ago-2026, regime não ativo: 2 × 60, sem máximo', `${x({ sncEnhanced: false }).total}|${x({ sncEnhanced: false }).max}`, '120|undefined');
  eq('SNC ago-2026, sem se saber: 120 a 480', `${x({}).total}|${x({}).max}`, '120|480');
  eq('SNC dez-2026, regime ativo: fora de abril a outubro, 60', ae.monthExtras('FO', { snc: 1 }, { ym: '2026-12', sncEnhanced: true }).total, 60);
  eq('sncFor: ativo em agosto', JSON.stringify(ae.sncFor('2026-08', true)), JSON.stringify({ eur: 240, max: null }));
  eq('sncFor: por saber em agosto', JSON.stringify(ae.sncFor('2026-08')), JSON.stringify({ eur: 60, max: 240 }));
  // O detetor: com o regime ativo, uma alteração de 2 h ou mais comunicada entre 48 e 120 horas antes também conta (n.º 11)
  const e = (det, dutyDate = '2026-08-10') => ({ id: 'x', dutyDate, detectedAt: det, before: { report: '10:00', end: '18:00', sectors: 2, kind: 'flight' }, after: { report: '07:00', end: '18:00', sectors: 2, kind: 'flight' } });
  eq('100 h antes, sem o regime: não é SNC', evaluateDisruption(e('2026-08-06T06:00'), { isPilot: true }), null);
  const en = evaluateDisruption(e('2026-08-06T06:00'), { isPilot: true, sncEnhanced: true });
  eq('100 h antes, regime ativo: SNC reforçado', en && `${en.type}|${en.clause}|${en.enhanced}`, 'snc|Art. 65.º, n.º 11|true');
  eq('130 h antes, regime ativo: fora das 120 horas', evaluateDisruption(e('2026-08-05T00:00'), { isPilot: true, sncEnhanced: true }), null);
  eq('100 h antes em novembro, regime ativo: fora de abril a outubro', evaluateDisruption(e('2026-11-06T06:00', '2026-11-10'), { isPilot: true, sncEnhanced: true }), null);
  const in48 = evaluateDisruption(e('2026-08-09T08:00'), { isPilot: true, sncEnhanced: true });
  eq('24 h antes: o SNC de sempre (Art. 65.º)', in48 && in48.clause, 'Art. 65.º');
  eq('cabine: o regime reforçado é só dos pilotos', evaluateDisruption(e('2026-08-06T06:00'), { isPilot: false, sncEnhanced: true }), null);
}

// O catálogo "valores atuais" (sem mês) é o do acordo em vigor
eq('catálogo: base FO', ae.catalogValue('base', { category: 'FO' }), 5059.26);
eq('catálogo: paragem noturna FO', ae.catalogValue('night', { category: 'FO' }), 91.20);
eq('catálogo: doença FO (80 %)', ae.catalogValue('sick', { category: 'FO' }), 134.91);
eq('catálogo: WFLY FO', ae.catalogValue('wfly', { category: 'FO' }), 708.30);
eq('catálogo: benefícios SFO', ae.catalogValue('benefits', { category: 'SFO' }), 2131);
eq('catálogo: retenção CPT PPY 8/12', ae.catalogValue('retention', { category: 'CPT', contract: 'PPY 8/12' }), 21461.27);
eq('catálogo: retenção SO PPY 9/12 (mínimo)', ae.catalogValue('retention', { category: 'SO', contract: 'PPY 9/12' }), 6396);

console.log(`\nAE easyJet × SPAC 2026 — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
console.log('✓ BTE 29/2026: cada valor tem a citação no texto oficial, e o motor dá-o no mês certo (o passado não mudou).');
