/*
 * Golden do DINHEIRO A MAIS — auditoria dos cálculos, bloco 5 (M1–M11), 2026-11-06.
 * Cada valor esperado sai do texto oficial guardado em fontes/ (o teste confirma também que a frase está lá):
 *  · fontes/ae-easyjet/  AE easyJet × SNPVAC (cabine, BTE 8/2024) e × SPAC (pilotos, BTE 40/2023)
 *  · fontes/ae-tap/      AE TAP × SNPVAC (cabine, BTE 7/2024) e × SPAC (pilotos, BTE 29/2023)
 *  · fontes/pt/          Código do Trabalho (art. 255.º), salário mínimo (DL 107/2023, 112/2024, 139/2025), IPC nov-2024
 * Os números NÃO vêm do código nem dos outros goldens. Decisões do Nuno (2026-11-06): "faz como diz a lei" (a base sai nos
 * dias de baixa, Código do Trabalho art. 255.º, n.º 2, a)); 9/3 e sazonais: o motor aceita as datas de atividade e, sem
 * elas, o mês é "incerto" (a média do ano, com o intervalo).
 * Executar:  node scripts/dinheiro.test.js   (ou: npm run test:dinheiro)
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
const { eventCounts, paidSickDays } = R('data/aeEvents.js');
const { monthlyAe, aeMonthTotal, extrasMonthEur, serviceMoney } = R('data/perdiem.js');
const { yearStats } = R('data/stats.js');
const { disruptionsByDuty, sncToRegister } = R('data/disruption.js');
const { startsAfter } = R('data/crewHistory.js');

const flat = (s) => s.replace(/\r/g, '').replace(/\s+/g, ' ');
const src = (f) => flat(fs.readFileSync(path.resolve('fontes', f), 'utf8'));
const CAB = src('ae-easyjet/easyjet-snpvac-2024.txt');
const PIL = src('ae-easyjet/easyjet-spac-2023.txt');
const TAPC = src('ae-tap/tap-snpvac-2024.txt');
const TAPP = src('ae-tap/tap-spac-2023.txt');
const CT = src('pt/codigo-trabalho-2009.txt');
const RMMG = src('pt/rmmg.txt');
const IPC = src('pt/ipc-2024-11.txt');

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; fails.push(`  ✗ ${name}\n      lei:   ${w}\n      motor: ${g}`); }
};
const has = (name, txt, phrase) => { if (txt.includes(flat(phrase))) pass++; else { fail++; fails.push(`  ✗ ${name}: frase não encontrada na fonte → "${phrase}"`); } };
const days = (from, n, type = 'sickDays') => {
  const out = []; const [y, m, d] = from.split('-').map(Number);
  for (let i = 0; i < n; i++) { const dt = new Date(Date.UTC(y, m - 1, d + i)); out.push({ id: `${type}${i}`, date: dt.toISOString().slice(0, 10), type }); }
  return out;
};

// ═══ M1 · Doença da CABINE easyJet — Cl. 61.ª: só "após os 3 (três) dias de ausência iniciais", até 90 dias em 12 meses ═══
has('Cl. 61.ª (após 3 dias)', CAB, '45 % da remuneração base diária por cada dia de ausência por doença (exceto quando motivado por acidente');
has('Cl. 61.ª (teto 90 dias)', CAB, 'até um máximo de 90 (noventa) dias num período de 12 (doze) meses');
has('CT art. 255.º/2 a)', CT, 'determinam a perda de retribuição as seguintes faltas justificadas: a) Por motivo de doença, desde que o trabalhador beneficie de um regime de segurança social de protecção na doença');
{
  // FA 12/12, baixa de 3 a 7 de novembro de 2026 (5 dias), registada INTEIRA (o import e o registo à mão fazem o mesmo).
  const ev = days('2026-11-03', 5);
  const c = eventCounts(ev, '2026-11', null, false);
  eq('cabine 5 dias: pagam-se 2 (4.º e 5.º)', c.sickDays, 2);
  eq('cabine 5 dias: 5 dias de baixa (a base sai)', c.sickAbsentDays, 5);
  // 45 % × (18 852 / 14) / 30 = 20,20 €/dia · base 1 346,57 €; a base do dia = base / 30 (convenção, ver o AE dos pilotos
  // "dividindo a remuneração mensal por 30"); 5 dias = 224,43 €.
  const x = cab.monthExtras('FA', c, { ym: '2026-11', contract: '12/12' });
  eq('cabine: complemento 2 × 20,20', (x.items.find((i) => i.id === 'sickDays') || {}).total, 40.4);
  eq('cabine: base perdida 5 dias', (x.items.find((i) => i.id === 'sickAbsence') || {}).total, -224.43);
  eq('cabine: extras do mês', x.total, -184.03);
  // Mês inteiro de baixa (30 dias de novembro) → sem base nenhuma.
  const all = eventCounts(days('2026-11-01', 30), '2026-11', null, false);
  eq('cabine: mês inteiro de baixa tira a base toda', (cab.monthExtras('FA', all, { ym: '2026-11' }).items.find((i) => i.id === 'sickAbsence') || {}).total, -1346.57);
  // Episódio que cruza o mês: 30-out a 3-nov → outubro 0 pagos (2 de baixa), novembro 2 pagos (3 de baixa).
  const xm = days('2026-10-30', 5);
  eq('cabine: episódio cruza o mês (out)', [eventCounts(xm, '2026-10', null, false).sickDays || 0, eventCounts(xm, '2026-10', null, false).sickAbsentDays], [0, 2]);
  eq('cabine: episódio cruza o mês (nov)', [eventCounts(xm, '2026-11', null, false).sickDays, eventCounts(xm, '2026-11', null, false).sickAbsentDays], [2, 3]);
  // Teto: 100 dias seguidos desde 1-jan → pagos os dias 4 a 93 (90). Jan 28 · fev 28 · mar 31 · abr 3.
  const long = days('2026-01-01', 100);
  eq('cabine: teto de 90 dias', ['01', '02', '03', '04'].map((m) => eventCounts(long, `2026-${m}`, null, false).sickDays || 0), [28, 28, 31, 3]);
  // Um dia em que voou não é de baixa (não conta para nada).
  const dutyDay = { '2026-11-05': { kind: 'flight', route: 'LIS-OPO-LIS' } };
  eq('cabine: dia com serviço não conta', eventCounts(ev, '2026-11', dutyDay, false).sickAbsentDays, 4);
  // O registo guarda TODOS os dias (o motor é que paga do 4.º): a importação deixou de tirar os 3 primeiros.
  eq('cabine: importação regista o episódio inteiro', paidSickDays(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'], { sickFirst3: false }).length, 4);
}

// ═══ M2 · Doença dos PILOTOS easyJet — Art. 48.º: dias 1-3 a 60 %; do 4.º em diante só a Segurança Social ═══
has('Art. 48.º/2', PIL, 'A partir do 4.º dia de doença, o piloto ficará unicamente abrangido pelo sistema público de Segurança Social');
has('Anexo I.10', PIL, 'Dia 1 a 3 de doença: 60 % da retribuição base diária por cada dia de ausência');
has('IPC nov-2024 = 2,3 %', IPC, 'No País, o IPC registou uma taxa de variação média de 2,3%');
has('Anexo I.1 (IPC desde 1-fev-2025)', PIL, 'A partir de 1 fevereiro de 2025');
{
  // FO 12/12, 10 dias de baixa de 10 a 19 de outubro de 2025. Índice 1,023 (2,3 %, entre 1 % e 5 %).
  eq('IPC: 2,3 %', pil.IPC_2025, 0.023);
  const c = eventCounts(days('2025-10-10', 10), '2025-10', null, true);
  eq('piloto 10 dias: 3 pagos a 60 %', c.sickDays, 3);
  eq('piloto 10 dias: 10 de baixa', c.sickAbsentDays, 10);
  const idx = pil.indexFactor('2025-10');
  // base = 47 750 × 1,023 / 14 = 3 489,16 · dia a 60 % = 69,78 · 10 dias de base = 1 163,05
  eq('FO base out-2025', pil.monthlyBase('FO', { index: idx, ym: '2025-10' }), 3489.16);
  const x = pil.monthExtras('FO', c, { index: idx, ym: '2025-10', contract: '12/12' });
  eq('piloto: 3 × 69,78', (x.items.find((i) => i.id === 'sickDays') || {}).total, 209.34);
  eq('piloto: base perdida 10 dias', (x.items.find((i) => i.id === 'sickAbsence') || {}).total, -1163.05);
  eq('piloto: mês sem serviços', aeMonthTotal({}, 'FO', '12/12', pil, { ym: '2025-10', index: idx, extras: c }), 2535.45);
}

// ═══ M3 · Contratos parciais — "redução proporcional de todos os termos e condições" ═══
has('Cl. 48.ª/11 (9/3)', CAB, 'implicará uma redução proporcional de todos os termos e condições face a um trabalhador a tempo completo na modalidade de 12/12');
has('Cl. 80.ª/2', CAB, 'é calculado proporcionalmente com base na percentagem aplicável');
has('Anexo I.4 (intermitentes)', CAB, 'o abono para falhas incidirá sobre a retribuição mensal durante 9 meses e sobre os subsídios férias e Natal (média dos 12 meses da retribuição e compensação), subtraída a compensação de 25 % durante os 3 meses');
has('Anexo I.14 (WFLY a tempo integral)', CAB, 'correspondente a 1 % da remuneração base anual devida por tempo integral para cada categoria profissional');
has('Art. 24.º/14 pilotos', PIL, 'redução proporcional de todos os termos e condições');
{
  eq('abono FA 12/12', cab.cashHandling('FA', '2026-11', '12/12'), 78.55);
  eq('abono FA 10/12 (5 % × 15 710 / 12)', cab.cashHandling('FA', '2026-11', '10/12'), 65.46);
  eq('abono FA 8/12', cab.cashHandling('FA', '2026-11', '8/12'), 52.37);
  // 9/3: 5 % × (9 meses × M + 2 subsídios × média 0,8125 M) / 12, M = 18 852 / 14
  eq('abono FA 9/3 (Anexo I.4)', cab.cashHandling('FA', '2026-11', '9/3'), 59.61);
  eq('doença FA 10/12 (45 % da base diária do contrato)', cab.sickDay('FA', '2026-11', '10/12'), 16.83);
  eq('WFLY cabine fica a tempo integral', cab.monthExtras('FA', { wfly: 1 }, { ym: '2026-11', contract: '10/12' }).total, 188.52);
  const i26 = pil.indexFactor('2026-03');
  eq('DDO FO 12/12 2026', pil.ddo('FO', i26, '2026-03', '12/12'), 195.39);
  eq('DDO FO 14-14 (51 %)', pil.ddo('FO', i26, '2026-03', '14-14'), 99.65);
  eq('doença FO 14-14 (51 %)', pil.sickDay('FO', i26, '2026-03', '14-14'), 35.59);
  eq('monthExtras passa o contrato', pil.monthExtras('FO', { ddo: 1 }, { index: i26, ym: '2026-03', contract: '14-14' }).total, 99.65);
}

// ═══ M11 · 9/3 e sazonais — o mês não é a média ═══
has('Cl. 48.ª/8 i)', CAB, 'Nos períodos de atividade, 100 % da remuneração mensal prevista para um trabalhador com a mesma categoria a tempo completo');
has('Cl. 48.ª/8 ii)', CAB, 'Nos períodos de inatividade, 25 % da remuneração mensal prevista');
has('Cl. 48.ª/4 (datas fixadas pela easyJet)', CAB, 'O período de atividade poderá iniciar-se entre 1 de fevereiro e 15 de abril');
{
  eq('9/3 sem datas → média do ano', cab.monthlyBase('FA', { contract: '9/3', ym: '2026-11' }), 1094.09);
  eq('9/3 sem datas → intervalo', cab.baseRange('FA', { contract: '9/3', ym: '2026-11' }), { min: 336.64, max: 1346.57 });
  eq('9/3 mês de atividade', cab.monthlyBase('FA', { contract: '9/3', ym: '2026-07', fullShare: 1 }), 1346.57);
  eq('9/3 mês de inatividade', cab.monthlyBase('FA', { contract: '9/3', ym: '2026-01', fullShare: 0 }), 336.64);
  eq('sazonal 50 % mês parcial', cab.monthlyBase('FA', { contract: 'sazonal-50', ym: '2026-01', fullShare: 0 }), 673.29);
  eq('12/12 não tem intervalo', cab.baseRange('FA', { contract: '12/12', ym: '2026-11' }), null);
  const m = monthlyAe({}, 'FA', '9/3', cab, { ym: '2026-11' });
  eq('mês 9/3: base incerta', m.baseRange, { min: 336.64, max: 1346.57 });
}

// ═══ M4 · Tabelas dos meses passados ═══
has('cabine NS fev-2025 CM', CAB, 'Fevereiro - 2025: – Tripulante de cabine 1.º ano - 13,45 €; – Tripulante de cabine - 19,96 €; – Chefe de cabine em período experimental - 22,43 €; – Chefe de cabine - 27,41 €.');
has('cabine base fev-2025', CAB, '– Tripulante de cabine - 18 214,00 €; – Chefe de cabine em período experimental - 18 274,00 €; – Chefe de cabine - 22 414,00 €.');
has('cabine base fev-2024', CAB, 'Tripulante de cabine - 16 870,00 €; – Chefe de cabine em período experimental - 16 930,00 €; – Chefe de cabine - 20,924,00 €.');
has('cabine NS fev-2024 (o FA1 vem impresso 1345,00 €: gralha de 13,45 €)', CAB, 'Fevereiro - 2024: – Tripulante de cabine 1.º ano - 1345,00 €; – Tripulante de cabine - 19.37 €; – Chefe de cabine em período experimental - 21,77 €; – Chefe de cabine - 26,62 €.');
has('upranker', CAB, 'Fevereiro de 2024 - 14,56 €; Fevereiro de 2025 - 15,65 €; Novembro de 2025 - 16,27 €.');
has('benefícios', CAB, 'Abono para benefícios no valor anual fixo de 336,00 € por ano; – A partir de abril de 2025, o abono para benefícios será no valor anual fixo de 425,00 € por ano.');
has('SNC cabine desde abril de 2024', CAB, 'Alterações de escala com curta antecedência (SNC) (a partir de abril de 2024)');
has('RMMG 2024', RMMG, 'na sua redação atual, é de € 820.');
has('RMMG 2025', RMMG, 'na sua redação atual, é de € 870,00.');
has('RMMG 2026', RMMG, 'na sua redação atual, é de € 920,00.');
{
  eq('CM jun-2025 base (22 414 / 14)', cab.monthlyBase('CM', { ym: '2025-06' }), 1601);
  eq('CM jun-2025 LIS-OPO-LIS (2 × 0,8 × 27,41)', cab.perDiem('CM', [148, 148], 1, undefined, '2025-06'), 43.86);
  eq('FA mai-2024 base (16 870 / 14)', cab.monthlyBase('FA', { ym: '2024-05' }), 1205);
  eq('FA1 mar-2024 = SMN de 2024', cab.monthlyBase('FA1', { ym: '2024-03' }), 820);
  eq('FA1 mar-2025 = SMN de 2025', cab.monthlyBase('FA1', { ym: '2025-03' }), 870);
  eq('FA1 jan-2026 = SMN de 2026', cab.monthlyBase('FA1', { ym: '2026-01' }), 920);
  eq('FA1 NS fev-2024', cab.perDiem('FA1', [148], 1, undefined, '2024-03'), 10.76);
  eq('upranker mar-2025', cab.upranker('2025-03'), 15.65);
  eq('upranker mar-2024', cab.upranker('2024-03'), 14.56);
  eq('SNC cabine mar-2024 (ainda não existia)', cab.monthExtras('FA', { snc: 1 }, { ym: '2024-03' }).total, 0);
  eq('SNC cabine mai-2024', cab.monthExtras('FA', { snc: 1 }, { ym: '2024-05' }).total, 20);
  eq('benefícios mar-2025 / mai-2025', [cab.tableAt('2025-03').BENEFITS_ANNUAL, cab.tableAt('2025-05').BENEFITS_ANNUAL], [336, 425]);
  eq('cabine antes de fev-2024: sem tabela', [cab.tableAt('2024-01'), cab.monthlyBase('FA', { ym: '2024-01' })], [null, null]);
  eq('cabine antes de fev-2024: o mês não dá €', monthlyAe({}, 'FA', '12/12', cab, { ym: '2024-01' }), null);
  eq('cabine antes de fev-2024: aeMonthTotal null', aeMonthTotal({}, 'FA', '12/12', cab, { ym: '2024-01' }), null);
}
has('pilotos base set-2023', PIL, 'Comandante (CPT) 115 000,00 € 122 000,00 €');
has('pilotos férias até 31-mar-2024', PIL, 'Comandante (CPT) 130,00 € 2 sectores nominais');
{
  eq('índice jan-2025 = 1 (o IPC só conta a 1-fev)', pil.indexFactor('2025-01'), 1);
  eq('índice fev-2025 = 1,023', pil.indexFactor('2025-02'), 1.023);
  eq('CPT jan-2025 base (122 000 / 14)', pil.monthlyBase('CPT', { ym: '2025-01', index: pil.indexFactor('2025-01') }), 8714.29);
  eq('CPT fev-2025 base (122 000 × 1,023 / 14)', pil.monthlyBase('CPT', { ym: '2025-02', index: pil.indexFactor('2025-02') }), 8914.71);
  eq('FO jan-2024 base (46 000 / 14, tabela de set-2023)', pil.monthlyBase('FO', { ym: '2024-01' }), 3285.71);
  eq('FO jan-2024 setor nominal 37,63', pil.perDiem('FO', [148], 1, undefined, '2024-01'), 30.1);
  eq('dia de férias FO mar-2024 = 68 €', pil.vacDay('FO', 1, '2024-03'), 68);
  eq('dia de férias FO abr-2024 = 2 NS', pil.vacDay('FO', 1, '2024-04'), 77.52);
  eq('dia de férias SO mar-2024: a tabela não tem valor', pil.vacDay('SO', 1, '2024-03'), null);
  eq('pilotos antes de set-2023: sem tabela', pil.tableAt('2023-08'), null);
}
has('TAP VB 2024/2025 retroativo', TAPC, '* Retroativo a 1 de novembro de 2023.');
has('TAP compl. extraord. 2024/2025/2026', TAPC, 'CAB 0 2024 2025 2026 * CAB 1 a S/C 3 20,00 € 20,00 € 40,00 € 40,00 € 40,00 € 40,00 €');
{
  eq('TAP CAB3 jun-2025 VB', tapC.monthlyBase('CAB3', { ym: '2025-06' }), 1871.05);
  eq('TAP CAB0 2025 VB', tapC.monthlyBase('CAB0', { ym: '2025-06' }), 885.5);
  eq('TAP AC1 CAB3 2025 / 2024', [tapC.perDiem('CAB3', [148], 1, undefined, '2025-06'), tapC.perDiem('CAB3', [148], 1, undefined, '2024-06')], [145, 135]);
  eq('TAP AC1 CAB0 2024', tapC.perDiem('CAB0', [148], 1, undefined, '2024-06'), 67.5);
  eq('TAP compl. extraord. CAB0 2024', tapC.extraord('2024-06', 'CAB0'), 20);
  eq('TAP S/C de 2026 em 2025: escalão antigo diferente → sem tabela', tapC.monthlyBase('SC1', { ym: '2025-06' }), null);
  eq('TAP antes de nov-2023: sem tabela', tapC.tableAt('2023-10'), null);
}

// ═══ M5 · Meses antes da admissão — "a remuneração é paga até ao último dia útil do mês a que se reporta" ═══
has('Cl. 50.ª/2 cabine', CAB, 'A remuneração é paga até ao último dia útil do mês a que se reporta.');
{
  const line = [{ company: 'ezy', crewType: 'cabin', from: '2026-05' }];
  eq('antes da 1.ª linha da companhia', [startsAfter(line, '2026-04'), startsAfter(line, '2026-05')], [true, false]);
  const ys = yearStats({}, { year: '2026', aeAt: (ym) => (ym >= '2026-05' ? cab : null), crewHistory: [{ category: 'FA', contract: '12/12', from: '2026-05' }], now: new Date('2026-11-15T12:00:00') });
  eq('FA admitida em maio: 7 meses de base', ys.aeYtd.base, 9425.99);
}

// ═══ M6 · TAP: ajudas de custo por DIA DE CALENDÁRIO, e a de maior valor ═══
has('TAP cabine Cl. 7.ª/1', TAPC, 'Por cada dia de calendário (das 0h00 às 23h59, horas locais da base), em que seja realizado um ou mais serviços de voo ou em que esteja em curso a realização de um serviço de voo');
has('TAP cabine Cl. 7.ª/3', TAPC, 'prevalecerá o pagamento de valor superior');
has('TAP cabine Cl. 7.ª/1 a) (+30 min)', TAPC, 'o seu término após trinta minutos decorridos da imobilização definitiva da aeronave');
{
  const rot = {
    '2026-11-02': { kind: 'flight', route: 'LIS-MAD', report_time: '08:00', block_on: '10:30', nightStop: true },
    '2026-11-03': { kind: 'flight', route: 'MAD-LIS', report_time: '09:00', block_on: '10:15' },
  };
  const m = monthlyAe(rot, 'CAB3', '12/12', tapC, { ym: '2026-11' });
  eq('TAP cabine: rotação de 1 noite = 2 × AC1, sem AC2', [m.perDiem, m.nightStops], [300, 0]);
  const two = { '2026-11-10': { kind: 'flight', route: 'LIS-OPO-LIS', report_time: '06:00', block_on: '09:00', extra: [{ kind: 'flight', route: 'LIS-FAO-LIS', report_time: '13:00', block_on: '16:00' }] } };
  eq('TAP cabine: 2 serviços no mesmo dia = 1 AC1', monthlyAe(two, 'CAB3', '12/12', tapC, { ym: '2026-11' }).perDiem, 150);
  eq('TAP piloto: 2 serviços no mesmo dia = 1 per diem A', monthlyAe(two, 'OP3', '12/12', tapP, { ym: '2026-11', fleet: 'NB' }).perDiem, 202.5);
  // CTE WB: LIS-GRU 1-abr 22:00 → 2-abr 07:30 · estadia a 3 · GRU-LIS 4-abr 21:00 → 5-abr 06:30 = 4 A + 1 B
  const lc = {
    '2026-04-01': { kind: 'flight', route: 'LIS-GRU', report_time: '22:00', block_on: '07:30', nightStop: true },
    '2026-04-04': { kind: 'flight', route: 'GRU-LIS', report_time: '21:00', block_on: '06:30' },
  };
  const ml = monthlyAe(lc, 'CTE', '12/12', tapP, { ym: '2026-04', fleet: 'WB' });
  eq('TAP CTE longo curso: 4 dias A + 1 dia B', [ml.perDiem, ml.nightStops], [1200, 180]);
  const fra = {
    '2026-03-05': { kind: 'flight', route: 'LIS-FRA', report_time: '07:00', block_on: '11:00', nightStop: true },
    '2026-03-06': { kind: 'flight', route: 'FRA-LIS', report_time: '09:00', block_on: '12:00' },
  };
  const mf = monthlyAe(fra, 'OP3', '12/12', tapP, { ym: '2026-03', fleet: 'NB' });
  eq('TAP OP3 LIS-FRA-LIS: 2 × 202,50, sem B', [mf.perDiem, mf.nightStops], [405, 0]);
  // Voo que passa a meia-noite de 31-out: o dia 1-nov é de novembro.
  const cross = { '2026-10-31': { kind: 'flight', route: 'GRU-LIS', report_time: '21:00', block_on: '11:30' } };
  eq('TAP: 1-nov em curso conta em novembro', monthlyAe(cross, 'CTE', '12/12', tapP, { ym: '2026-11', fleet: 'WB' }).perDiem, 300);
  eq('TAP: 31-out conta em outubro', monthlyAe(cross, 'CTE', '12/12', tapP, { ym: '2026-10', fleet: 'WB' }).perDiem, 300);
  // A estadia conta do último VOO (ou posicionamento) do dia, não do último serviço: LIS-MAD a 2 com pernoita e uma assistência no
  // aeroporto de Madrid à tarde; MAD-LIS a 4 → 2 × AC1 e o dia 3 de AC2 (Cl. 7.ª, n.º 2, b)). Antes a assistência apagava a estadia.
  const rotSb = {
    '2026-11-02': { kind: 'flight', route: 'LIS-MAD', report_time: '08:00', block_on: '10:30', nightStop: true, extra: [{ kind: 'standby_airport', report_time: '14:00', block_on: '16:00' }] },
    '2026-11-04': { kind: 'flight', route: 'MAD-LIS', report_time: '09:00', block_on: '10:15' },
  };
  eq('TAP cabine: assistência depois do voo não apaga a estadia (2 × AC1 + 1 AC2)', (({ perDiem, nightStops }) => [perDiem, nightStops])(monthlyAe(rotSb, 'CAB3', '12/12', tapC, { ym: '2026-11' })), [300, 80]);
  // Os dias de calendário na hora da BASE ("das 0h00 às 23h59, horas locais da base", cabine Cl. 7.ª; pilotos RUPT Cl. 6.ª, n.º 9),
  // pelas horas UTC das pernas: o regresso GRU-LIS apresenta-se às 21:00 de São Paulo a 4 de abril = 01:00 de Lisboa do dia 5 →
  // o dia 4 é de estadia (B), não de voo (A). LIS-GRU 1-abr 22:00 → GRU 05:30 (08:30Z); GRU 22:00 (01:00Z de 5) → LIS 11:30.
  // A: 1, 2 e 5 (3 × 300 = 900) · B: 3 e 4 (2 × 180 = 360). Pelas horas da escala dava 4 A + 1 B.
  const lcZ = {
    '2026-04-01': { kind: 'flight', route: 'LIS-GRU', report_time: '22:00', block_on: '05:30', nightStop: true, legs: [{ dep: 'LIS', arr: 'GRU', off: '23:00', on: '05:30' }] },
    '2026-04-04': { kind: 'flight', route: 'GRU-LIS', report_time: '21:00', block_on: '11:30', legs: [{ dep: 'GRU', arr: 'LIS', off: '22:00', on: '11:30' }] },
  };
  const mz = monthlyAe(lcZ, 'CTE', '12/12', tapP, { ym: '2026-04', fleet: 'WB', baseAt: 'LIS' });
  eq('TAP CTE: dias na hora da base → 3 A + 2 B', [mz.perDiem, mz.nightStops], [900, 360]);
  eq('TAP CTE: sem a base, as horas da escala (como antes) → 4 A + 1 B', (({ perDiem, nightStops }) => [perDiem, nightStops])(monthlyAe(lcZ, 'CTE', '12/12', tapP, { ym: '2026-04', fleet: 'WB' })), [1200, 180]);
  eq('TAP CTE: o valor do serviço de regresso na hora da base (1 dia A)', serviceMoney(tapP, 'CTE', lcZ['2026-04-04'], { date: '2026-04-04', fleet: 'WB', baseAt: 'LIS' }).perDiem, 300);
  // AC2 por cancelamento tardio (cabine Cl. 7.ª, n.º 2, a)): "em caso de cancelamento de um serviço de voo em que, na base, o
  // tripulante seja avisado ... com menos de 1 hora e 30 minutos sobre a hora de ETD" — um registo por dia, à AC2 (80 € em 2026);
  // num dia com voo "prevalecerá o pagamento de valor superior" (n.º 3) — a AC1 → não conta.
  eq('TAP cabine: cancelamento tardio é um extra que se regista', tapC.EXTRA_KINDS.some((k) => k.id === 'lateCancelDays'), true);
  eq('TAP cabine: 2 cancelamentos tardios = 2 × AC2', tapC.monthExtras('CAB3', { lateCancelDays: 2 }, { ym: '2026-05' }).total, 160);
  const flD = { '2026-05-10': { kind: 'flight', route: 'LIS-OPO-LIS', report_time: '06:00', block_on: '09:00' } };
  eq('TAP cabine: cancelamento tardio num dia com voo → prevalece a AC1 (não conta)', eventCounts([{ type: 'lateCancelDays', date: '2026-05-10' }], '2026-05', flD).lateCancelDays || 0, 0);
  eq('TAP cabine: cancelamento tardio num dia sem voo → conta', eventCounts([{ type: 'lateCancelDays', date: '2026-05-11' }], '2026-05', flD).lateCancelDays, 1);
  eq('TAP pilotos: sem cancelamento tardio (o per diem A paga a apresentação, Cl. 9.ª)', tapP.EXTRA_KINDS.some((k) => k.id === 'lateCancelDays'), false);
  // Doença na TAP (cabine RRRGS Cl. 20.ª; pilotos AE Cl. 37.ª): regista-se; a TAP paga o LÍQUIDO (dias 1–3) ou completa o subsídio
  // da Segurança Social até ao líquido — a app não calcula líquidos → a base dos dias de baixa fica incerta (de base − dias × base
  // ÷ 30 à base), sem prestação em € à parte.
  for (const [nm, ae, cat] of [['cabine', tapC, 'CAB3'], ['pilotos', tapP, 'OP3']]) {
    eq(`TAP ${nm}: a doença é um extra que se regista`, ae.EXTRA_KINDS.some((k) => k.id === 'sickDays'), true);
    eq(`TAP ${nm}: a doença não dá uma prestação em € à parte`, ae.monthExtras(cat, { sickDays: 3, sickAbsentDays: 3 }, { ym: '2026-05' }).items.length, 0);
    const sick5 = ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08'].map((date) => ({ type: 'sickDays', date }));
    // (na cabine de 2026 a base já tem um intervalo — os 2 % do KPI: o máximo fica o desse intervalo)
    const m0 = monthlyAe({}, cat, '12/12', ae, { ym: '2026-05', fleet: 'NB' }), b0 = m0.base, top = m0.baseRange ? m0.baseRange.max : b0;
    const ms = monthlyAe({}, cat, '12/12', ae, { ym: '2026-05', fleet: 'NB', events: sick5 });
    const lo5 = Math.round((b0 - b0 * 5 / 30) * 100) / 100;
    eq(`TAP ${nm}: 5 dias de baixa → base incerta de base − 5/30 ao máximo`, [ms.base, ms.baseRange], [lo5, { min: lo5, max: top, reason: 'tapSick' }]);
  }
  // Prestação retributiva complementar dos pilotos (regulamento de retribuições, Cl. 10.ª): o piloto disponível que não seja
  // escalado para serviços de per diem A ou B em pelo menos 5 dias de calendário no mês recebe o per diem A por cada dia em falta,
  // até 5 (Anexo: "de igual valor ao da coluna per diem A na tabela A-3.2"). OP3 NB, maio de 2026, 2 dias de voo → 3 × 202,50.
  const two2 = {
    '2026-05-12': { kind: 'flight', route: 'LIS-OPO-LIS', report_time: '06:00', block_on: '09:00' },
    '2026-05-20': { kind: 'flight', route: 'LIS-FAO-LIS', report_time: '06:00', block_on: '09:00' },
  };
  const pc = monthlyAe(two2, 'OP3', '12/12', tapP, { ym: '2026-05', fleet: 'NB' });
  eq('TAP pilotos: 2 dias com per diem → prestação complementar de 3 dias (607,50 €)', pc.prestCompl, { days: 3, eur: 607.5, max: 607.5 });
  const six = {}; ['04', '06', '08', '12', '14', '18'].forEach((d) => { six[`2026-05-${d}`] = two2['2026-05-12']; });
  eq('TAP pilotos: 6 dias com per diem → sem prestação complementar', monthlyAe(six, 'OP3', '12/12', tapP, { ym: '2026-05', fleet: 'NB' }).prestCompl || null, null);
  // Com férias no mês a "disponibilidade" (n.º 1) fica em dúvida → certo 0, possível os 3 dias.
  const pcV = monthlyAe(two2, 'OP3', '12/12', tapP, { ym: '2026-05', fleet: 'NB', events: [{ type: 'vacDays', date: '2026-05-25' }] });
  eq('TAP pilotos: com férias no mês → prestação complementar incerta (0 a 607,50 €)', pcV.prestCompl, { days: 3, eur: 0, max: 607.5 });
  eq('TAP cabine: sem prestação complementar (é dos pilotos)', monthlyAe(two2, 'CAB3', '12/12', tapC, { ym: '2026-05' }).prestCompl || null, null);
}

// ═══ M7 · Instrutor (pilotos easyJet) — Art. 42.º: "por cada dia ... em terra, incluindo em simulador" ═══
has('Art. 42.º', PIL, 'por cada dia que os pilotos com a qualificação executem tais funções em terra, incluindo em simulador');
{
  const fl = { '2026-03-10': { kind: 'flight', route: 'LIS-OPO-LIS', role: 'instr' } };
  eq('instrutor em voo de linha = 0 €', monthlyAe(fl, 'CPT', '12/12', pil, { ym: '2026-03', index: pil.indexFactor('2026-03') }).instructorDaysAuto, 0);
  const sim = { '2026-03-11': { kind: 'training', role: 'instr', extra: [{ kind: 'training', role: 'instr' }] } };
  const ms = monthlyAe(sim, 'CPT', '12/12', pil, { ym: '2026-03', index: pil.indexFactor('2026-03') });
  eq('instrutor: 2 sessões no mesmo dia = 120 € uma vez', [ms.instructorDaysAuto, ms.extras], [1, 120]);
  const ev = [{ id: 'i1', date: '2026-03-11', type: 'instructorDays' }];
  eq('instrutor: o evento do mesmo dia não paga outra vez', eventCounts(ev, '2026-03', sim, true).instructorDays || 0, 0);
}

// ═══ M8 · Upranker — Cl. 34.ª/3: é o assistente que voa como chefe; o CMP já é chefe ═══
has('Cl. 34.ª/3', CAB, 'continuarão a receber o salário base e variáveis habitualmente aplicáveis aos assistentes/comissários de bordo');
eq('upranker só FA1 e FA', cab.additionalRolesFor('CMP').some((r) => r.id === 'upranker'), false);
eq('upranker no FA', cab.additionalRolesFor('FA').some((r) => r.id === 'upranker'), true);

// ═══ M9 · "Soma ao mês" = só o mês, pelo mesmo caminho do total ═══
{
  const ev = [...days('2026-10-05', 5), { id: 's1', date: '2026-11-03', type: 'snc' }];
  const i26 = pil.indexFactor('2026-11');
  eq('soma de novembro = só o SNC de novembro', extrasMonthEur(pil, 'CPT', ev, '2026-11', { index: i26 }), 60);
}

// ═══ M10 · SNC/RDP: um por serviço, o plano contra o final ═══
has('Cl. 66.ª/3', CAB, 'O pagamento será devido comparando o novo serviço com o planeado em escala nas 48 (quarenta e oito) horas antecedentes');
{
  const D = '2026-11-10';
  const ch = (det, b, a, kind = 'flight') => ({ id: det, dutyDate: D, detectedAt: det, route: 'LIS-OPO-LIS', before: { report: b[0], end: b[1], sectors: 2, kind }, after: { report: a[0], end: a[1], sectors: 2, kind } });
  const two = [ch('2026-11-08T20:00', ['08:00', '12:00'], ['08:00', '14:00']), ch('2026-11-09T20:00', ['08:00', '14:00'], ['08:00', '16:30'])];
  eq('duas alterações ao mesmo serviço = 1 SNC', disruptionsByDuty(two, { isPilot: false }).filter((c) => c.type === 'snc').length, 1);
  const back = [ch('2026-11-09T02:00', ['08:00', '12:00'], ['08:00', '14:00']), ch('2026-11-09T12:00', ['08:00', '14:00'], ['08:00', '12:00'])];
  eq('ida e volta = nenhum', disruptionsByDuty(back, { isPilot: false }).length, 0);
  const sameDay = [ch('2026-11-10T05:00', ['08:00', '12:00'], ['08:00', '14:00']), ch('2026-11-10T06:00', ['08:00', '14:00'], ['08:00', '16:00'])];
  eq('duas no próprio dia = 1 RDP', disruptionsByDuty(sameDay, { isPilot: false }).filter((c) => c.type === 'rdp').length, 1);
  eq('a Escala continua a dar 1 SNC', sncToRegister(two, { isPilot: false }).length, 1);
  const plus1 = [ch('2026-11-09T08:00', ['08:00', '12:00'], ['08:00', '13:00']), ch('2026-11-09T09:00', ['08:00', '13:00'], ['08:00', '14:00'])];
  eq('duas de +1 h (líquido +2 h) = 1 SNC piloto', disruptionsByDuty(plus1, { isPilot: true }).filter((c) => c.type === 'snc').length, 1);
}

// ═══ Revisão independente do bloco 5 ═══
{
  const { payStatus } = R('data/today.js');
  // Mês inteiro de baixa (CT art. 255.º): "Quanto recebo?" dá 0 €, não a base.
  // (Outubro: em novembro entra o subsídio de Natal, bloco 6 — o seu corte numa baixa longa é dúvida do advogado.)
  const ps = payStatus({ duties: {}, ae: pil, crewCategory: 'FO', crewContract: '12/12', aeEvents: days('2026-09-20', 42), now: new Date('2026-10-20T12:00:00') });
  eq('mês inteiro de baixa: quanto recebo = 0 €', ps.total, 0);
  // Sem valor na tabela: o item fica "sem valor", fora da soma (nunca 0,00 € como se fosse o valor).
  const so = pil.monthExtras('SO', { vacDays: 3 }, { ym: '2024-03' });
  eq('SO mar-2024: dia de férias sem valor', [so.items[0].each, so.items[0].noValue, so.total], [null, true, 0]);
  // TAP cabine: no dia com voo prevalece a AC1 (Cl. 7.ª/3, Cl. 8.ª/3) — o complemento extraordinário não conta.
  has('TAP cabine Cl. 8.ª/3', TAPC, 'prevalecerá o pagamento do valor superior');
  const fl = { '2026-06-10': { kind: 'flight', route: 'LIS-OPO-LIS' } };
  const ex = [{ id: 'x1', date: '2026-06-10', type: 'extraordDays' }, { id: 'x2', date: '2026-06-12', type: 'extraordDays' }];
  eq('TAP: complemento no dia de voo não conta', eventCounts(ex, '2026-06', fl, true).extraordDays, 1);
  // 9/3 sem datas: o "quanto recebo" leva o intervalo.
  eq('9/3: quanto recebo diz o intervalo', payStatus({ duties: {}, ae: cab, crewCategory: 'FA', crewContract: '9/3', aeEvents: [], now: new Date('2026-11-20T12:00:00') }).baseRange, { min: 336.64, max: 1346.57 });
}

console.log(`\nDinheiro (bloco 5): ${pass} ✓ · ${fail} ✗`);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
