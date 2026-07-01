/*
 * Testes golden do catálogo de Validades (data/validities.js) — PURO.
 * Tranca o ÂMBITO (tripulação de linha: cabine + piloto de companhia, SEM ruído de aviação
 * geral) e o conceito "referência que não expira" (licença/CCA). Crew-aware.
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
const { validityCatalog, validityStatus, sortValidities, isNoExpiryType, deriveExpiry, fieldsForType, langRenewMonths, medCodes, renewMonthsForType } = V;

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) { ok++; } else { fail++; console.log(`✗ ${label}: ${g} ≠ ${e}`); }
};

const P = validityCatalog(true).map((t) => t.id);
const CB = validityCatalog(false).map((t) => t.id);

// ── Âmbito: piloto de LINHA tem o que interessa ──
eq('piloto: médico', P.includes('medical'), true);
eq('piloto: type rating', P.includes('typeRating'), true);
eq('piloto: IR (novo)', P.includes('ir'), true);
eq('piloto: Inglês ICAO', P.includes('lang'), true);
eq('piloto: passaporte', P.includes('passport'), true);
eq('piloto: recorrentes SEP/CRM/DG/ASEC/FAID', ['sep', 'crm', 'dg', 'asec', 'faid'].every((x) => P.includes(x)), true);

// ── Crew-aware: cabine não vê itens de piloto; piloto não vê CCA ──
eq('cabine: CCA', CB.includes('cca'), true);
eq('cabine: SEM type rating', CB.includes('typeRating'), false);
eq('cabine: SEM IR', CB.includes('ir'), false);
eq('cabine: SEM Inglês ICAO', CB.includes('lang'), false);
eq('piloto: SEM CCA', P.includes('cca'), false);

// ── Sem ruído de aviação geral/privada ──
const ALL = [...P, ...CB];
eq('sem Médico Classe 2 (GA)', ALL.includes('medicalC2') || ALL.includes('class2'), false);
eq('sem LAPL (GA)', ALL.includes('lapl'), false);
eq('sem class rating MEP/SEP-avião (GA)', ALL.includes('mep'), false);
eq('sem certificado de instrutor', ALL.includes('fi') || ALL.includes('instructor'), false);

// ── "Referência que não expira": licença + CCA (sem alarme); o resto expira ──
eq('licença = referência', isNoExpiryType('licence'), true);
eq('CCA = referência', isNoExpiryType('cca'), true);
eq('médico EXPIRA (não é referência)', isNoExpiryType('medical'), false);
eq('type rating EXPIRA', isNoExpiryType('typeRating'), false);
eq('IR EXPIRA', isNoExpiryType('ir'), false);
eq('passaporte EXPIRA', isNoExpiryType('passport'), false);
eq('tipo desconhecido → não é referência', isNoExpiryType('xpto'), false);

// ── Papel adicional: instrutor (TRI/TRE) só entra com instructorRated (só piloto) ──
eq('piloto instrutor → catálogo ganha "instructor"', validityCatalog(true, { instructorRated: true }).map((t) => t.id).includes('instructor'), true);
eq('piloto SEM instrutor → sem "instructor"', validityCatalog(true).map((t) => t.id).includes('instructor'), false);
eq('cabine com flag instrutor → NÃO ganha instrutor de piloto', validityCatalog(false, { instructorRated: true }).map((t) => t.id).includes('instructor'), false);
eq('instrutor EXPIRA (não é referência)', isNoExpiryType('instructor'), false);
eq('label do instrutor resolve', require(path.resolve('data/validities.js')).validityLabel('instructor', true, 'pt'), 'Instrutor · TRI/TRE');

// ── validityStatus (bandas) — regressão, com ref FIXA (determinista) ──
const REF = new Date('2026-07-01T00:00:00Z');
eq('sem data → none', validityStatus(null, REF).band, 'none');
eq('futuro → valid', validityStatus('2026-12-01', REF).band, 'valid');
eq('dentro de 30 d → expiring', validityStatus('2026-07-20', REF).band, 'expiring');
eq('no limiar (30 d) → expiring', validityStatus('2026-07-31', REF).band, 'expiring');
eq('passado → expired', validityStatus('2026-06-01', REF).band, 'expired');

// ── sortValidities: o que pede atenção primeiro (expirado → a expirar → válido) ──
const items = [
  { id: 'a', type: 'medical', expiry: '2026-12-01' },   // valid
  { id: 'b', type: 'sep', expiry: '2026-06-01' },        // expired
  { id: 'c', type: 'dg', expiry: '2026-07-15' },         // expiring
];
eq('ordena: expirado primeiro', sortValidities(items, REF)[0].id, 'b');
eq('ordena: a expirar em 2.º', sortValidities(items, REF)[1].id, 'c');

// ── Formulário RICO: derivar validade da DATA FEITA (fim do mês) ──
eq('SEP feito 12/05/2026 (+12m) → fim de maio/2027', deriveExpiry('2026-05-12', 12), '2027-05-31');
eq('DG feito 12/05/2026 (+24m) → fim de maio/2028', deriveExpiry('2026-05-12', 24), '2028-05-31');
eq('feito em fim de ano (+12m) → dezembro', deriveExpiry('2026-01-15', 12), '2027-01-31');
eq('sem data → null', deriveExpiry(null, 12), null);
eq('sem meses → null', deriveExpiry('2026-05-12', null), null);
eq('renewMonths do SEP = 12', renewMonthsForType('sep'), 12);
eq('renewMonths do DG = 24', renewMonthsForType('dg'), 24);
eq('renewMonths do instrutor = 36', renewMonthsForType('instructor'), 36);

// ── Proficiência linguística: nível → meses (6 = sem prazo) ──
eq('Inglês nível 4 → 48 m', langRenewMonths(4), 48);
eq('Inglês nível 5 → 72 m', langRenewMonths(5), 72);
eq('Inglês nível 6 → sem prazo (null)', langRenewMonths(6), null);

// ── Campos por tipo (o que o formulário rico mostra) ──
eq('médico: data + limitações + nº', fieldsForType('medical'), { date: true, limitations: true, number: true });
eq('passaporte: data + nº + nacionalidade', fieldsForType('passport'), { date: true, number: true, nationality: true });
eq('type rating: data feita + avião', fieldsForType('typeRating'), { doneDate: true, aircraft: true });
eq('SEP: data feita', fieldsForType('sep'), { doneDate: true });
eq('licença: referência + nº', fieldsForType('licence'), { reference: true, number: true });
eq('Inglês: nível', fieldsForType('lang'), { level: true });
eq('instrutor: data feita + tipo', fieldsForType('instructor'), { doneDate: true, instrKind: true });

// ── Códigos de limitação médica crew-aware ──
eq('piloto tem OML nas limitações', medCodes(true).some((c) => c.code === 'OML'), true);
eq('cabine tem MCL, não OML', medCodes(false).some((c) => c.code === 'MCL') && !medCodes(false).some((c) => c.code === 'OML'), true);

console.log(`\nvalidades (catálogo) — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) process.exit(1);
