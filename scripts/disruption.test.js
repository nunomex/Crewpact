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

const { evaluateDisruption, pilotSncArt, disruptionCandidates, disruptionHtml, evaluateStability, stabilityCandidates, stabilityHtml } = require(path.resolve('data/disruption.js'));
const snpvac = require(path.resolve('ae/easyjetSnpvac.js'));
const spac = require(path.resolve('ae/easyjetSpac.js'));

let pass = 0, fail = 0; const fails = [];
const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; fails.push(`  ✗ ${name}\n      esperado: ${JSON.stringify(want)}\n      obtido:   ${JSON.stringify(got)}`); }
};
const check = (name, cond) => { if (cond) { pass++; } else { fail++; fails.push(`  ✗ ${name}`); } };
const eqj = (n, g, w) => eq(n, JSON.stringify(g), JSON.stringify(w));

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
// Cl. 67.ª, n.º 4: "não há lugar a reclamação ... se o tripulante receber um pagamento por entrada em dia de descanso planeado (IDO
// ou DDO) (exceto nos casos em que se verifique uma paragem noturna não planeada)"; n.º 5: o WFLY que entra na folga seguinte tem
// "DDO/IDO não cumulativo com o RDP" → com a escala (`duties`), o RDP de um serviço marcado DDO, WFLY+DDO ou WFLY+IDO não se sugere;
// com o IDO simples (a pernoita não planeada) continua.
{
  const { disruptionsByDuty } = require(path.resolve('data/disruption.js'));
  const withDow = (dow) => disruptionsByDuty([mk()], { isPilot: false, duties: { '2026-07-14': { kind: 'flight', route: 'LIS-FNC-LIS', dayOffWorked: dow } } }).filter((c) => c.type === 'rdp').length;
  eq('RDP com DDO / WFLY+DDO / WFLY+IDO: não se sugere; com IDO, sem folga ou sem a escala: sugere-se', JSON.stringify([withDow('ddo'), withDow('wfly+ddo'), withDow('wfly+ido'), withDow('ido'), withDow(null), disruptionsByDuty([mk()], { isPilot: false }).filter((c) => c.type === 'rdp').length]), '[0,0,0,1,1,1]');
}
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
// O artigo do SNC dos pilotos é o do acordo em vigor na data do serviço: Art. 65.º desde 26-06-2026 (BTE 29/2026); antes Art. 63.º (BTE 40/2023).
eq('pilotos: caso RDP vira SNC (Art. 65.º, BTE 29/2026)', evaluateDisruption(mk(), { isPilot: true }).clause, 'Art. 65.º');
eq('pilotos: SNC de um serviço de 2025 cita o Art. 63.º (BTE 40/2023)', pilotSncArt('2025-08-10'), 'Art. 63.º');
eq('pilotos: SNC a 25-06-2026 ainda o Art. 63.º; a 26-06-2026 já o 65.º', `${pilotSncArt('2026-06-25')} · ${pilotSncArt('2026-06-26')}`, 'Art. 63.º · Art. 65.º');
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

// ── RDP pelo VOO AO VIVO (Cl. 67.ª/1 — lida no BTE 8/2024 p. 304–305, fontes/ae-easyjet/, 2026-11-04) ──
// O término do tempo de serviço (calços + 30) a ≥ 119 min do programado, no dia da operação, conta — o atraso
// operacional também (o n.º 3 fala de "atraso"; as exclusões do n.º 2 são da assistência e de códigos do tripulante).
// O +30 é igual dos dois lados → mede-o o atraso à CHEGADA do último setor. "Antes ou depois" → também adiantado.
{
  const { liveRdp } = require(path.resolve('data/disruption.js'));
  eq('ao vivo: cabine, chegada +125 min → RDP', liveRdp({ isPilot: false, arrDelayMin: 125 }), { type: 'rdp', clause: 'Cl. 67.ª', reason: 'end', dEndMin: 125 });
  eq('ao vivo: +119 min conta (119 ou mais, n.º 1)', (liveRdp({ isPilot: false, arrDelayMin: 119 }) || {}).type, 'rdp');
  eq('ao vivo: +118 min não conta', liveRdp({ isPilot: false, arrDelayMin: 118 }), null);
  eq('ao vivo: chegada ADIANTADA 125 min também conta (antes ou depois)', (liveRdp({ isPilot: false, arrDelayMin: -125 }) || {}).dEndMin, -125);
  eq('ao vivo: pilotos NÃO têm RDP', liveRdp({ isPilot: true, arrDelayMin: 300 }), null);
  eq('ao vivo: chamado de assistência → não (n.º 2)', liveRdp({ isPilot: false, arrDelayMin: 200, fromStandby: true }), null);
  eq('ao vivo: serviço de assistência → não (n.º 2)', liveRdp({ isPilot: false, kind: 'standby_home', arrDelayMin: 200 }), null);
  eq('ao vivo: setores perdidos/ganhos (desvio) → RDP', liveRdp({ isPilot: false, sectorsChanged: true }), { type: 'rdp', clause: 'Cl. 67.ª', reason: 'sectors' });
  eq('ao vivo: sem atraso conhecido → nada (nunca se adivinha)', liveRdp({ isPilot: false }), null);
  // A citação existe, palavra por palavra, no texto oficial guardado.
  const txt = fs.readFileSync(path.resolve('fontes/ae-easyjet/easyjet-snpvac-2024.txt'), 'utf8').replace(/\s+/g, ' ');
  check('fonte: Cl. 67.ª n.º 1 literal no BTE', txt.includes('quando o seu tempo de serviço programado tiver sido alterado, no dia da operação, em 119 (cento e dezanove) minutos ou mais'));
  check('fonte: calços mais 30 minutos', txt.includes('término do tempo de serviço (calços mais 30 (trinta) minutos'));
  check('fonte: n.º 3 fala de atraso', txt.includes('efetuando serviço de voo com atraso de 2 (duas) horas após a hora confirmada de apresentação'));
}

// ── SNC A REGISTAR — no máximo UM por serviço (Art. 63.º SPAC · Cl. 66.ª SNPVAC, lidos no BTE 2026-11-04) ──
// "O pagamento será devido comparando o novo serviço com o planeado em escala nas 48 horas antecedentes" → o 1.º
// "antes" dentro das 48 h vs o último "depois"; ≥ 2 h (início antecipado ou fim atrasado). Achado: o aviso da Escala
// propunha um SNC por CADA mudança nos 7 dias seguintes, sem 48 h nem 2 h (3 SNC num só serviço de teste).
{
  const { sncToRegister } = require(path.resolve('data/disruption.js'));
  const D = '2026-11-10';
  const ch = (det, b, a, kind = 'flight') => ({ dutyDate: D, detectedAt: det, before: { report: b[0], end: b[1], sectors: 2, kind }, after: { report: a[0], end: a[1], sectors: 2, kind } });
  const tres = [
    ch('2026-11-09T10:00', ['08:00', '12:00'], ['08:00', '13:00']),
    ch('2026-11-09T14:00', ['08:00', '13:00'], ['08:00', '14:30']),
    ch('2026-11-09T18:00', ['08:00', '14:30'], ['08:00', '15:00']),
  ];
  const r1 = sncToRegister(tres, { isPilot: true });
  eq('3 mudanças no MESMO serviço → UM SNC', r1.length, 1);
  eq('… comparado com o planeado a 48 h (fim +3 h)', r1[0] && r1[0].dEndMin, 180);
  eq('… pilotos: Art. 65.º (serviço depois de 26-06-2026)', r1[0] && r1[0].clause, 'Art. 65.º');
  eq('cabine: Cl. 66.ª', (sncToRegister(tres, { isPilot: false })[0] || {}).clause, 'Cl. 66.ª');
  eq('vai e volta (líquido +0:30) → nenhum', sncToRegister([
    ch('2026-11-09T10:00', ['08:00', '12:00'], ['08:00', '13:00']),
    ch('2026-11-09T14:00', ['08:00', '13:00'], ['08:00', '12:30']),
  ], { isPilot: true }).length, 0);
  eq('já há SNC registado nesse dia → nenhum', sncToRegister(tres, { isPilot: true, events: [{ type: 'snc', date: D }] }).length, 0);
  eq('mudança a 3 dias (fora das 48 h) → nenhum', sncToRegister([ch('2026-11-07T10:00', ['08:00', '12:00'], ['08:00', '15:00'])], { isPilot: true }).length, 0);
  eq('assistência → nenhum', sncToRegister([ch('2026-11-09T10:00', ['08:00', '12:00'], ['08:00', '15:00'], 'standby_home')], { isPilot: true }).length, 0);
  eq('início antecipado 2 h 30 → SNC', (sncToRegister([ch('2026-11-09T10:00', ['08:00', '12:00'], ['05:30', '12:00'])], { isPilot: true })[0] || {}).dStartMin, -150);
  eq('mudança de 1 h 30 → nenhum', sncToRegister([ch('2026-11-09T10:00', ['08:00', '12:00'], ['08:00', '13:30'])], { isPilot: true }).length, 0);
  eq('dois serviços com SNC → dois, por data', sncToRegister([...tres, { ...ch('2026-11-10T09:00', ['08:00', '12:00'], ['08:00', '15:00']), dutyDate: '2026-11-11', before: { report: '08:00', end: '12:00', sectors: 2, kind: 'flight' } }], { isPilot: true }).map((x) => x.date), ['2026-11-10', '2026-11-11']);
  // Bloco 8b: a Escala e o ecrã Disrupção dão a MESMA resposta (antes, na cabine, a Escala juntava as mudanças do próprio
  // dia ao SNC). Cabine: D-1 +3 h (SNC) e no próprio dia +2 h (RDP) → a Escala propõe o SNC de +3 h, como a Disrupção.
  const { disruptionsByDuty } = require(path.resolve('data/disruption.js'));
  const cab2 = [ch('2026-11-09T10:00', ['08:00', '12:00'], ['08:00', '15:00']), ch('2026-11-10T06:00', ['08:00', '15:00'], ['08:00', '17:00'])];
  const sncDis = disruptionsByDuty(cab2, { isPilot: false }).filter((c) => c.type === 'snc').map((c) => [c.dutyDate, c.dEndMin]);
  eqj('cabine: Escala = Disrupção (SNC de +3 h)', sncToRegister(cab2, { isPilot: false }).map((x) => [x.date, x.dEndMin]), sncDis);
  eqj('cabine: … e é o de +3 h (só as mudanças antes do dia)', sncDis, [[D, 180]]);
  const sp = fs.readFileSync(path.resolve('fontes/ae-easyjet/easyjet-spac-2023.txt'), 'utf8').replace(/\s+/g, ' ');
  check('fonte: Art. 63.º n.º 4 literal no BTE', sp.includes('O pagamento será devido comparando o novo serviço com o planeado em escala nas 48 horas antecedentes'));
}

console.log(`\ndisrupção — ${pass} passou, ${fail} falhou (${pass + fail} asserções)`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
console.log('✓ RDP ≥119 min no dia (só cabine) · SNC ≥2h nas 48h · assistência excluída · valores do Anexo I.');
