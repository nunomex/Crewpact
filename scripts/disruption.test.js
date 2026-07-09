/*
 * Golden da DISRUPÇÃO DE ESCALA (data/disruption.js) — SNC/RDP easyJet, lidos no BTE:
 *   · RDP (SÓ cabine, Cl. 67.ª SNPVAC): |Δ fim do tempo de serviço (calços+30)| ≥ 119 min
 *     com deteção NO DIA da operação; perda/ganho de setores também conta.
 *   · SNC (Cl. 66.ª cabine · Art. 63.º pilotos): deteção nas 48h ANTES do início planeado
 *     E (início antecipado ≥2h OU fim atrasado ≥2h).
 *   · Assistência (standby) no serviço original → nunca qualifica.
 * Valores do Anexo I provados nos módulos AE (fonte: BTE 8/2024 · BTE 40/2023).
 * Executar: node scripts/disruption.test.js
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

const { evaluateDisruption, disruptionCandidates, disruptionHtml, evaluateStability, stabilityCandidates, stabilityHtml } = require(path.resolve('data/disruption.js'));
const snpvac = require(path.resolve('ae/easyjetSnpvac.js'));
const spac = require(path.resolve('ae/easyjetSpac.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${JSON.stringify(want)}\n      obtido:   ${JSON.stringify(got)}`); }
};
const check = (name, cond) => { if (cond) { pass++; } else { fail++; fails.push(`  ✗ ${name}`); } };

const mk = (over = {}) => ({
  id: 'x', dutyDate: '2026-07-14', detectedAt: '2026-07-14T09:12', source: 'calendar', route: 'LIS-FNC-LIS',
  before: { report: '09:30', end: '17:30', sectors: 2, kind: 'flight' },
  after: { report: '09:30', end: '19:35', sectors: 2, kind: 'flight' },
  ...over,
});
const type = (e, o) => { const v = evaluateDisruption(e, o); return v ? v.type : null; };

// ── RDP (cabine, no dia) ──
// fim: 17:30+30=18:00 → 19:35+30=20:05 = +125 min ≥119 → RDP
eq('RDP: +125 min no fim, detetado no dia (cabine)', type(mk(), { isPilot: false }), 'rdp');
eq('RDP: cláusula certa', evaluateDisruption(mk(), { isPilot: false }).clause, 'Cl. 67.ª');
eq('RDP: Δfim calculado (calços+30)', evaluateDisruption(mk(), { isPilot: false }).dEndMin, 125);
// +100 min < 119 e <120 → nada (nem RDP nem SNC)
eq('nem RDP nem SNC: +100 min', type(mk({ after: { report: '09:30', end: '19:10', sectors: 2, kind: 'flight' } }), { isPilot: false }), null);
// exatamente 119 → RDP (a cláusula diz "119 ou mais")
eq('RDP: exatamente 119 min qualifica', type(mk({ after: { report: '09:30', end: '19:29', sectors: 2, kind: 'flight' } }), { isPilot: false }), 'rdp');
// perda/ganho de setores no dia → RDP mesmo sem Δfim
eq('RDP: ganho de setores no dia', type(mk({ after: { report: '09:30', end: '17:30', sectors: 4, kind: 'flight' } }), { isPilot: false }), 'rdp');
// ANTECIPAR o fim ≥119 no dia também qualifica ("antes ou depois")
eq('RDP: fim antecipado 125 min', type(mk({ after: { report: '09:30', end: '15:25', sectors: 2, kind: 'flight' } }), { isPilot: false }), 'rdp');
// pilotos NÃO têm RDP: mesmo caso no dia → SNC (125 ≥120 no fim, dentro das 48h)
eq('pilotos: caso RDP vira SNC (Art. 63.º)', evaluateDisruption(mk(), { isPilot: true }).clause, 'Art. 63.º');
eq('pilotos: tipo snc', type(mk(), { isPilot: true }), 'snc');
// pilotos: só setores mudam (sem Δhoras ≥2h) → nada
eq('pilotos: setores sem horas → nada', type(mk({ after: { report: '09:30', end: '17:30', sectors: 4, kind: 'flight' } }), { isPilot: true }), null);

// ── SNC (48h antes) ──
// detetado na véspera (dentro de 48h), fim +125 (≥2h) → SNC na cabine
eq('SNC cabine: véspera, fim +2h05', type(mk({ detectedAt: '2026-07-13T22:40' }), { isPilot: false }), 'snc');
eq('SNC cabine: cláusula', evaluateDisruption(mk({ detectedAt: '2026-07-13T22:40' }), { isPilot: false }).clause, 'Cl. 66.ª');
// início ANTECIPADO ≥2h nas 48h → SNC (report 10:15→06:05 = −250)
const early = mk({ detectedAt: '2026-07-21T22:40', dutyDate: '2026-07-23',
  before: { report: '10:15', end: '18:00', sectors: 2, kind: 'flight' },
  after: { report: '06:05', end: '14:00', sectors: 2, kind: 'flight' } });
eq('SNC: início antecipado 4h10', type(early, { isPilot: false }), 'snc');
eq('SNC: Δinício', evaluateDisruption(early, { isPilot: false }).dStartMin, -250);
// início ATRASADO (não antecipado) não dispara SNC pelo início; fim recuou → nada
eq('SNC: início atrasado não conta', type(mk({ detectedAt: '2026-07-13T22:40',
  after: { report: '12:00', end: '17:30', sectors: 2, kind: 'flight' } }), { isPilot: false }), null);
// fora da janela (>48h antes) → nada
eq('SNC: 3 dias antes → fora da janela', type(mk({ detectedAt: '2026-07-11T08:00' }), { isPilot: false }), null);
// deteção DEPOIS do início planeado (não é "antes do serviço") e não é no-dia p/ pilotos… cabine: no dia + ≥119 → RDP já coberto; aqui piloto detetado após início → nada
eq('pilotos: detetado após o início → nada', type(mk({ detectedAt: '2026-07-14T11:00' }), { isPilot: true }), null);

// ── Exclusões e robustez ──
eq('assistência original → nunca qualifica', type(mk({ before: { report: '09:30', end: '17:30', sectors: 0, kind: 'standby_home' } }), { isPilot: false }), null);
eq('sem detectedAt → null', evaluateDisruption(mk({ detectedAt: null }), {}), null);
eq('sem before → null', evaluateDisruption({ dutyDate: '2026-07-14', detectedAt: '2026-07-14T09:00', after: {} }, {}), null);
check('disruptionCandidates filtra e espalha', disruptionCandidates([mk(), mk({ detectedAt: '2026-07-11T08:00' })], { isPilot: false }).length === 1);

// ── Valores do Anexo I JÁ MODELADOS nos módulos AE (fonte: BTE; effective-dated) ──
eq('SNC pilotos = 60 € (Anexo I/12, BTE 40/2023)', spac.snc('2026-07'), 60);
eq('SNC cabine = 20 € (Anexo I/10, BTE 8/2024)', snpvac.SNC_EUR, 20);
eq('RDP pisos por categoria (Anexo I/11)', snpvac.RDP_FLOOR, { CM: 23, CMP: 23, FA: 18, FA1: 18 });
// RDP = MAX(setor nominal, piso): FA1 13,45 < 18 → 18 · CM 32,50 > 23 → 32,50 · FA 21 > 18 → 21
eq('rdp FA1 = piso 18', snpvac.rdp('FA1', '2026-07'), 18);
eq('rdp CM = setor nominal 32,50', snpvac.rdp('CM', '2026-07'), 32.5);
eq('rdp FA = setor nominal 21', snpvac.rdp('FA', '2026-07'), 21);

// ═══ GUARDIÃO DA ESTABILIDADE (TAP — RUPT): conformidade, não € ═══
const sType = (e, o) => { const v = evaluateStability(e, o); return v ? v.type : null; };
// Pilotos (Cl. 15.ª/3): QUALQUER alteração de horas (sem assistência) → carece de acordo.
eq('TAP pilotos: alteração de horas → acordo', sType(mk({ detectedAt: '2026-07-10T10:00' }), { isPilot: true }), 'acordo');
eq('TAP pilotos: cláusula', evaluateStability(mk({ detectedAt: '2026-07-10T10:00' }), { isPilot: true }).clause, 'Cl. 15.ª/3 (RUPT)');
eq('TAP pilotos: assistência → nada', sType(mk({ detectedAt: '2026-07-10T10:00', before: { report: '09:30', end: '17:30', sectors: 0, kind: 'standby_home' } }), { isPilot: true }), null);
eq('TAP pilotos: sem mudança de horas → nada', sType(mk({ detectedAt: '2026-07-10T10:00', after: { report: '09:30', end: '17:30', sectors: 2, kind: 'flight' } }), { isPilot: true }), null);
// Cabine (Cl. 13.ª), com ≥48h: os LIMITES (estritamente além de 2h/3h).
// A "chegada" TAP é o calços CRU (sem +30). before end 17:30.
const far = { detectedAt: '2026-07-10T10:00', dutyDate: '2026-07-14' };   // 4 dias antes
eq('TAP cabine ≥48h: antecipar 2h01 → sinal 13.ª/2a', sType(mk({ ...far, after: { report: '07:29', end: '17:30', sectors: 2, kind: 'flight' } }), { isPilot: false }), 'antecipacao2h');
eq('TAP cabine ≥48h: antecipar 2h00 exatas → permitido', sType(mk({ ...far, after: { report: '07:30', end: '17:30', sectors: 2, kind: 'flight' } }), { isPilot: false }), null);
eq('TAP cabine ≥48h: chegada +3h01 → sinal 13.ª/2b', sType(mk({ ...far, after: { report: '09:30', end: '20:31', sectors: 2, kind: 'flight' } }), { isPilot: false }), 'chegada3h');
eq('TAP cabine ≥48h: chegada +3h00 exatas → permitido', sType(mk({ ...far, after: { report: '09:30', end: '20:30', sectors: 2, kind: 'flight' } }), { isPilot: false }), null);
// Cabine, <48h: qualquer alteração → fora do prazo (carece de acordo, salvo 14.ª–16.ª).
eq('TAP cabine <48h: alteração → prazo48h', sType(mk({ detectedAt: '2026-07-13T22:40' }), { isPilot: false }), 'prazo48h');
eq('TAP cabine <48h: cláusula', evaluateStability(mk({ detectedAt: '2026-07-13T22:40' }), { isPilot: false }).clause, 'Cl. 13.ª/1 e /5 (RUPT)');
check('stabilityCandidates filtra', stabilityCandidates([mk({ detectedAt: '2026-07-13T22:40' }), mk({ ...far, after: { report: '09:30', end: '17:35', sectors: 2, kind: 'flight' } })], { isPilot: false }).length === 1);
// PDF do guardião: título de conformidade, sem linha de valor
const sHtml = stabilityHtml({ header: { name: 'Ana', operator: 'TAP', generatedAt: 'x', ghost: 'JUL ’26' },
  events: [{ dutyDate: '2026-07-14', type: 'prazo48h', clause: 'Cl. 13.ª/1 e /5 (RUPT)', tag: 'ESTABILIDADE', beforeLine: 'b', afterLine: 'a', detectedAt: 'd', lawLine: 'l', note: 'Reclamação de CONFORMIDADE', declared: true }] }, 'pt', '');
check('guardião: título + nota de conformidade, sem €', sHtml.includes('Relatório de Estabilidade do Planeamento') && sHtml.includes('Reclamação de CONFORMIDADE') && !sHtml.includes('Anexo I'));

// ── PDF-prova: estrutura + escapes ──
const html = disruptionHtml({
  header: { name: 'Nuno <Silva>', crewId: '123', operator: 'easyJet', generatedAt: '31/07/2026', ghost: 'JUL ’26' },
  events: [{ dutyDate: '2026-07-14', route: 'LIS-FNC-LIS', type: 'rdp', clause: 'Cl. 67.ª',
    beforeLine: 'report 09:30 · fim 17:30+30', afterLine: 'fim 18:00→20:05 · +2h05', detectedAt: '2026-07-14, 09:12',
    lawLine: 'AE …', valueLabel: '23,00 €', declared: true }],
}, 'pt', '');
check('prova: wordmark + cláusula + valor marcado', html.includes('CREW<i>PACT</i>') && html.includes('Cl. 67.ª') && html.includes('class="eur">23,00 €'));
check('prova: escape do nome', html.includes('Nuno &lt;Silva&gt;'));
check('prova: método e limitações presentes', html.includes('DETETADA pela aplicação'));

console.log(`\ndisrupção — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ RDP ≥119 min no dia (só cabine) · SNC ≥2h nas 48h · assistência excluída · valores do Anexo I.');
