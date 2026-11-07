/*
 * VALIDADES (data/validities.js) — PURO. Regra do Nuno (2026-11-06): "não quero nada inventado. quero que seja
 * como diz a lei".
 *   Parte 1 — NADA INVENTADO: cada citação de cada prazo existe, letra a letra, no texto oficial guardado em
 *             fontes/eu/*.txt (extratos da EUR-Lex), na secção indicada, em português e em inglês.
 *   Parte 2 — GOLDEN: os prazos calculados à mão a partir desse texto (auditoria dos cálculos, bloco 3:
 *             A-217, A-253, A-278 a A-288).
 * Executar:  node scripts/validities.test.js   (ou: npm run test:validities)
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

const V = require(path.resolve('data/validities.js'));
const {
  VALIDITY_LAW, validityCatalog, validityLabel, validityStatus, sortValidities, isNoExpiryType, deriveExpiry, addYearsSameDay,
  fieldsForType, langRenewMonths, medCodes, renewMonthsForType, ruleForType, computeExpiry, lawfulValidities, buildISODate,
  isRealISODate, inLastThreeMonths, refOfDay, reminderDate, needsProgram,
} = V;

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};

// ── Parte 1 — cada citação no texto oficial (fontes/eu), na secção indicada ──────────────────────
const norm = (s) => String(s).normalize('NFC').replace(/[\s ]+/g, ' ').replace(/[‐‑–—]/g, '-').trim();
const sectionsOf = (file) => {
  const p = path.resolve('fontes', 'eu', `${file}.txt`);
  if (!fs.existsSync(p)) return null;
  const parts = fs.readFileSync(p, 'utf8').split(/=====\[([^\]]+)\]=====/);
  const m = new Map();
  for (let i = 1; i < parts.length; i += 2) m.set(parts[i], norm(parts[i + 1]));
  return m;
};
const CACHE = {};
const sec = (f, lang) => (CACHE[`${f}-${lang}`] ||= sectionsOf(`${f}-${lang}`));
for (const [k, q] of Object.entries(VALIDITY_LAW)) {
  const pt = sec(q.f, 'pt'), en = sec(q.f, 'en');
  if (!pt || !en) { fail++; console.log(`✗ falta fontes/eu/${q.f}-pt/en.txt`); continue; }
  eq(`${k}: citação (pt) em ${q.f} ${q.s}`, (pt.get(q.s) || '').includes(norm(q.q)), true);
  eq(`${k}: citação (en) em ${q.f} ${q.s}`, (en.get(q.s) || '').includes(norm(q.en)), true);
}
// Cada regra que calcula ('done') cita pelo menos uma fonte, e todas as citações são do conjunto conferido.
const allLaw = new Set(Object.values(VALIDITY_LAW));
for (const isPilot of [true, false]) {
  for (const d of validityCatalog(isPilot, { instructorRated: true })) {
    const rules = d.programs ? Object.values(d.programs) : [d.rule];
    rules.forEach((r, i) => {
      if (r.calc === 'done') eq(`${isPilot ? 'piloto' : 'cabine'} ${d.id} [${i}] calcula com fonte`, r.law.length > 0, true);
      eq(`${isPilot ? 'piloto' : 'cabine'} ${d.id} [${i}] só cita fontes conferidas`, r.law.every((x) => allLaw.has(x)), true);
    });
  }
}

// ── Parte 2 — golden ──────────────────────────────────────────────────────────────────────────
const P = validityCatalog(true).map((t) => t.id);
const CB = validityCatalog(false).map((t) => t.id);

// Âmbito (tripulação de linha) e crew-aware.
eq('piloto: OPC e line check à parte (ORO.FC.230 b) e c))', ['opc', 'lineCheck', 'typeRating'].every((x) => P.includes(x)), true);
eq('piloto: médico, IR, inglês, passaporte', ['medical', 'ir', 'lang', 'passport'].every((x) => P.includes(x)), true);
eq('cabine: módulos trienais (ORO.CC.140 e) 3))', CB.includes('triennial'), true);
eq('cabine: CCA; sem type rating, IR, inglês, OPC', CB.includes('cca') && !['typeRating', 'ir', 'lang', 'opc', 'lineCheck'].some((x) => CB.includes(x)), true);
eq('piloto: sem CCA', P.includes('cca'), false);
eq('sem GA (classe 2, LAPL, MEP)', [...P, ...CB].some((x) => ['medicalC2', 'class2', 'lapl', 'mep'].includes(x)), false);
eq('instrutor só com o papel, só pilotos', [validityCatalog(true, { instructorRated: true }).some((t) => t.id === 'instructor'), validityCatalog(true).some((t) => t.id === 'instructor'), validityCatalog(false, { instructorRated: true }).some((t) => t.id === 'instructor')], [true, false, false]);

// A-217 — o rótulo vem do catálogo DA FUNÇÃO.
eq('A-217 cabine: "Médico" (não "Médico Classe 1")', validityLabel('medical', false, 'pt'), 'Médico');
eq('A-217 piloto: "Médico Classe 1"', validityLabel('medical', true, 'pt'), 'Médico Classe 1');
eq('OPC com EBT chama-se "Módulo EBT"', validityLabel('opc', true, 'pt', 'ebt'), 'Módulo EBT');
eq('tipo desconhecido → o próprio id', validityLabel('xpto', true), 'xpto');

// Referências que não expiram (FCL.040; CC.CCA.105).
eq('licença e CCA = referência', [isNoExpiryType('licence'), isNoExpiryType('cca')], [true, true]);
eq('médico, OPC, passaporte expiram', [isNoExpiryType('medical'), isNoExpiryType('opc'), isNoExpiryType('passport')], [false, false, false]);

// A-278 — OPC: 6 meses pela regra geral; 12 com ATQP (prorrogação aprovada) ou EBT (módulo). Fim do mês (ORO.FC.145 g)).
const opc = (program, done) => (computeExpiry({ type: 'opc', isPilot: true, program, doneISO: done }) || {}).expiry || null;
eq('A-278 OPC feito a 15-03-2026, regra geral → 30-09-2026', opc('geral', '2026-03-15'), '2026-09-30');
eq('A-278 OPC 15-09-2026 → 31-03-2027 (não 30-09-2027)', opc('geral', '2026-09-15'), '2027-03-31');
eq('OPC com ATQP (ORO.FC.A.245 e) 1)) → 12 meses', opc('atqp', '2026-03-15'), '2027-03-31');
eq('módulo EBT (ORO.FC.231) → 12 meses', opc('ebt', '2026-03-15'), '2027-03-31');
eq('OPC sem programa → não há prazo (a app pergunta)', [opc(null, '2026-03-15'), ruleForType('opc', true).calc, fieldsForType('opc', true).program], [null, 'program', true]);
// Line check e SEP do piloto.
const line = (program, done) => (computeExpiry({ type: 'lineCheck', isPilot: true, program, doneISO: done }) || {}).expiry || null;
eq('A-285 line check 10-02-2025 → 28-02-2026 (ORO.FC.230 c))', line('geral', '2025-02-10'), '2026-02-28');
eq('line check com ATQP → 24 meses', line('atqp', '2025-02-10'), '2027-02-28');
eq('line check com EBT → data escrita (o regulamento não fixa)', [line('ebt', '2025-02-10'), fieldsForType('lineCheck', true, 'ebt').date], [null, true]);
eq('SEP do piloto 12 meses (ORO.FC.230 d)); ATQP 24', [renewMonthsForType('sep', true, 'geral'), renewMonthsForType('sep', true, 'atqp')], [12, 24]);

// A-279 / A-283 — cabine: CRM, primeiros socorros e segurança são elementos da formação ANUAL (12 meses).
const cab = (type, done, prev = null) => (computeExpiry({ type, isPilot: false, doneISO: done, prevExpiryISO: prev }) || {}).expiry || null;
eq('A-279 cabine CRM 15-03-2026 → 31-03-2027 (não 2029)', cab('crm', '2026-03-15'), '2027-03-31');
eq('A-279 cabine primeiros socorros → 31-03-2027', cab('faid', '2026-03-15'), '2027-03-31');
eq('A-283 cabine segurança → 31-03-2027', cab('asec', '2026-03-15'), '2027-03-31');
eq('cabine SEP 12/05/2026 → 31-05-2027', cab('sep', '2026-05-12'), '2027-05-31');
eq('A-279 renewMonthsForType vê o catálogo da cabine', [renewMonthsForType('crm', false), renewMonthsForType('crm', true)], [12, null]);
// A-282 — renovar nos 3 últimos meses: conta a partir da data de termo inicial (ORO.CC.140 e) 2)).
eq('A-282 SEP termo 31-03-2027, renovado 10-02-2027 → 31-03-2028', cab('sep', '2027-02-10', '2027-03-31'), '2028-03-31');
eq('A-282 renovado 10-01-2027 → 31-03-2028', cab('sep', '2027-01-10', '2027-03-31'), '2028-03-31');
eq('A-282 renovado a 01-01-2027 (1.º dia da janela) → 31-03-2028', cab('sep', '2027-01-01', '2027-03-31'), '2028-03-31');
eq('A-282 renovado a 31-12-2026 (antes da janela) → 31-12-2027', cab('sep', '2026-12-31', '2027-03-31'), '2027-12-31');
eq('A-282 renovado depois de expirar (05-04-2027) → 30-04-2028', cab('sep', '2027-04-05', '2027-03-31'), '2028-04-30');
eq('A-282 vale para o CRM anual também', cab('crm', '2027-02-10', '2027-03-31'), '2028-03-31');
eq('janela: 3 meses de calendário', [inLastThreeMonths('2027-01-01', '2027-03-31'), inLastThreeMonths('2026-12-31', '2027-03-31')], [true, false]);
// A-285 — módulos trienais da cabine: 36 meses, sem a regra dos 3 meses (essa é da alínea a)).
eq('A-285 trienais 15-03-2026 → 31-03-2029', cab('triennial', '2026-03-15'), '2029-03-31');
eq('trienais: a renovação antecipada não conta da data anterior', cab('triennial', '2029-02-10', '2029-03-31'), '2032-02-29');

// Piloto: segurança (Reg. 2015/1998, 11.4.3 a)) — 5 anos, até ao mesmo dia (Reg. 1182/71, art. 3.º, n.º 2 c)).
const pil = (type, done) => (computeExpiry({ type, isPilot: true, doneISO: done }) || {}).expiry || null;
// Revisão do 8b: se uma periodicidade de formação é um "prazo" do Reg. 1182/71 (art. 3.º, n.º 4: sábado/domingo → dia útil
// seguinte) é dúvida (pack do advogado, E8). Alargar até 2 dias pode deixar a formação caducada sem a app o dizer → a app NÃO
// alarga: acaba no próprio dia, mesmo ao fim de semana, e a nota explica.
eq('piloto AVSEC 15-03-2026 → 15-03-2031 (sábado) fica no sábado', pil('asec', '2026-03-15'), '2031-03-15');
eq('AVSEC feito a 14-03-2021 → 14-03-2026 (sábado) fica no sábado', pil('asec', '2021-03-14'), '2026-03-14');
eq('AVSEC num dia útil fica', pil('asec', '2026-03-16'), '2031-03-16');
eq('piloto AVSEC 29-02-2024 → 28-02-2029 (o dia não existe)', pil('asec', '2024-02-29'), '2029-02-28');
eq('addYearsSameDay', [addYearsSameDay('2026-01-31', 1), addYearsSameDay('2028-02-29', 4)], ['2027-01-31', '2032-02-29']);

// A-284 / A-287 — sem prazo na lei → data escrita (nunca um prazo inventado).
['crm', 'dg', 'faid', 'typeRating', 'ir', 'lang', 'medical', 'passport', 'instructor'].forEach((x) =>
  eq(`piloto ${x}: data escrita (sem prazo calculado)`, [ruleForType(x, true).calc, renewMonthsForType(x, true)], ['date', null]));
['medical', 'dg', 'passport'].forEach((x) => eq(`cabine ${x}: data escrita`, ruleForType(x, false).calc, 'date'));
eq('licença e CCA: referência', [ruleForType('licence', true).calc, ruleForType('cca', false).calc], ['reference', 'reference']);

// Revisão independente (bloco 3).
eq('E12 EBT: line check e SEP com a data do operador, citando os 12 meses do ORO.FC.231', [ruleForType('lineCheck', true, 'ebt').calc, ruleForType('sep', true, 'ebt').calc, ruleForType('lineCheck', true, 'ebt').law.some((q) => /12 meses/.test(q.q)), ruleForType('sep', true, 'ebt').law.some((q) => /A cada 12 meses/.test(q.q))], ['date', 'date', true, true]);
eq('R5 a partir do termo inicial, mesmo dia: 28-02-2027 → 28-02-2028', cab('sep', '2027-01-10', '2027-02-28'), '2028-02-28');
eq('R5 termo inicial a meio do mês: 15-06-2026 → 15-06-2027', cab('sep', '2026-05-01', '2026-06-15'), '2027-06-15');
eq('E13 validade antiga só com "válido até" (sem data feita) fica', lawfulValidities([{ id: 'x', type: 'sep', expiry: '2027-03-31' }], false)[0].expiry, '2027-03-31');
{
  const S = V.validitySummary([{ type: 'sep', expiry: '2027-03-31' }, { type: 'dg', expiry: null }, { type: 'lang', level: 6, expiry: null }, { type: 'licence' }], new Date(2026, 10, 6, 9, 0));
  eq('R7 resumo: pior válido mas 1 sem data (o inglês 6 e a licença não contam)', [S.worst.st.band, S.missing, S.withSt.length], ['valid', 1, 2]);
}

// Campos do formulário.
eq('cabine SEP: data feita + validade anterior', fieldsForType('sep', false), { done: true, prev: true });
eq('cabine trienais: só data feita', fieldsForType('triennial', false), { done: true });
eq('piloto OPC regra geral: data feita + programa', fieldsForType('opc', true, 'geral'), { done: true, program: true });
eq('piloto médico: data + limitações + nº', fieldsForType('medical', true), { date: true, limitations: true, number: true });
eq('passaporte: data + nº + nacionalidade', fieldsForType('passport', true), { date: true, number: true, nationality: true });
eq('licença: referência + nº', fieldsForType('licence', true), { reference: true, number: true });
eq('type rating: data + avião', fieldsForType('typeRating', true), { date: true, aircraft: true });
eq('inglês: data + nível', fieldsForType('lang', true), { date: true, level: true });
eq('instrutor: data + tipo', fieldsForType('instructor', true), { date: true, instrKind: true });
eq('piloto AVSEC: data feita', fieldsForType('asec', true), { done: true });
eq('só OPC, line check e SEP do piloto pedem programa', ['opc', 'lineCheck', 'sep', 'crm', 'asec'].map((x) => needsProgram(x, true)), [true, true, true, false, false]);
eq('a cabine nunca pede programa', needsProgram('sep', false), false);

// A-288 — datas impossíveis recusadas.
eq('A-288 31/04, 30/02, 29/02/2026 → null', [buildISODate(31, 4, 2026), buildISODate(30, 2, 2026), buildISODate(29, 2, 2026)], [null, null, null]);
eq('29/02/2028 e 31/12/2026 aceites', [buildISODate(29, 2, 2028), buildISODate(31, 12, 2026)], ['2028-02-29', '2026-12-31']);
eq('isRealISODate', [isRealISODate('2026-04-31'), isRealISODate('2026-04-30')], [false, true]);
eq('deriveExpiry não aceita data impossível', deriveExpiry('2026-02-30', 12), null);

// A-281 — o último dia vale por inteiro (dias de calendário, sem arredondar horas).
const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi);
eq('A-281 31-03 às 18:00: a expirar, 0 dias', validityStatus('2027-03-31', at(2027, 3, 31, 18, 0)), { band: 'expiring', days: 0 });
eq('A-281 31-03 às 23:59: ainda 0 dias', validityStatus('2027-03-31', at(2027, 3, 31, 23, 59)), { band: 'expiring', days: 0 });
eq('A-281 01-04 às 00:01: expirado, −1', validityStatus('2027-03-31', at(2027, 4, 1, 0, 1)), { band: 'expired', days: -1 });
eq('A-281 30-03 às 13:00: falta 1 dia', validityStatus('2027-03-31', at(2027, 3, 30, 13, 0)).days, 1);
eq('bandas: sem data / válido / a expirar (30 d) / expirado', [
  validityStatus(null).band, validityStatus('2026-12-01', at(2026, 7, 1, 9, 0)).band,
  validityStatus('2026-07-31', at(2026, 7, 1, 9, 0)).band, validityStatus('2026-06-30', at(2026, 7, 1, 9, 0)).band,
], ['none', 'valid', 'expiring', 'expired']);

// A-253 / A-280 — a Simulação avalia no DIA DO SERVIÇO.
eq('A-253 médico até 20-12-2026, serviço a 28-12-2026 → expirado nesse dia', validityStatus('2026-12-20', refOfDay('2026-12-28')).band, 'expired');
eq('A-280 SEP até 31-12-2026, serviço a 10-01-2027 → expirado, −10', validityStatus('2026-12-31', refOfDay('2027-01-10')), { band: 'expired', days: -10 });
eq('no próprio dia da validade ainda vale', validityStatus('2026-12-20', refOfDay('2026-12-20')).band, 'expiring');

// A-286 — lembretes por dias de calendário (a mudança para a hora de verão não muda o dia).
const r30 = reminderDate('2027-03-31', 30), r7 = reminderDate('2027-03-31', 7);
eq('A-286 lembrete de 30 d: 01-03 às 09:00', [r30.getFullYear(), r30.getMonth() + 1, r30.getDate(), r30.getHours()], [2027, 3, 1, 9]);
eq('A-286 lembrete de 7 d: 24-03 às 09:00', [r7.getFullYear(), r7.getMonth() + 1, r7.getDate(), r7.getHours()], [2027, 3, 24, 9]);

// As validades guardadas passam a ser as da lei.
const law = lawfulValidities([
  { id: 'a', type: 'crm', doneDate: '2026-03-15', expiry: '2029-03-31' },                  // cabine: 36 → 12
  { id: 'b', type: 'sep', doneDate: '2027-02-10', prevExpiry: '2027-03-31', expiry: '2028-02-29' },
  { id: 'c', type: 'dg', doneDate: '2026-05-12', expiry: '2028-05-31' },                   // prazo inventado → sem data
  { id: 'd', type: 'medical', expiry: '2027-01-15' },                                       // data escrita fica
], false);
eq('cabine CRM gravado a 36 meses → 31-03-2027', law[0].expiry, '2027-03-31');
eq('cabine SEP com validade anterior → 31-03-2028', law[1].expiry, '2028-03-31');
eq('DG com prazo calculado pela app → sem data (era inventado)', [law[2].expiry, law[2].legacyDerived], [null, true]);
eq('médico com data escrita fica igual', law[3].expiry, '2027-01-15');
const lawP = lawfulValidities([
  { id: 'e', type: 'typeRating', doneDate: '2026-03-15', expiry: '2027-03-31' },            // OPC/LPC juntos → data da licença
  { id: 'f', type: 'opc', doneDate: '2026-03-15', expiry: '2027-03-31' },                   // sem programa
  { id: 'g', type: 'opc', doneDate: '2026-03-15', program: 'geral', expiry: '2027-03-31' },
], true);
eq('type rating antigo (derivado) → sem data até escrever a da licença', lawP[0].expiry, null);
eq('OPC sem programa → sem data, pede o programa', [lawP[1].expiry, lawP[1].needsProgram], [null, true]);
eq('OPC regra geral gravado a 12 → 30-09-2026', lawP[2].expiry, '2026-09-30');

// Ordenação: o que pede atenção primeiro.
const REF = at(2026, 7, 1, 9, 0);
const items = [{ id: 'a', expiry: '2026-12-01' }, { id: 'b', expiry: '2026-06-01' }, { id: 'c', expiry: '2026-07-15' }];
eq('ordena: expirado → a expirar → válido', sortValidities(items, REF).map((x) => x.id), ['b', 'c', 'a']);

// Inglês (FCL.055 c)): a informação do nível; a validade é a escrita no averbamento.
eq('inglês nível 4 / 5 / 6 → 48 / 72 / sem prazo', [langRenewMonths(4), langRenewMonths(5), langRenewMonths(6)], [48, 72, null]);
eq('limitações médicas crew-aware', [medCodes(true).some((c) => c.code === 'OML'), medCodes(false).some((c) => c.code === 'OML')], [true, false]);

console.log(`\nvalidades — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
