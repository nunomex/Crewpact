/*
 * Golden das CITAÇÕES — TAP, FTL e radiação (auditoria dos cálculos, bloco 7, 2026-11-06). Completa o
 * scripts/citacoes-easyjet.test.js: cada citação que o tripulante lê é procurada no TEXTO OFICIAL de fontes/.
 *   · TAP (BTE 29/2023 pilotos · BTE 7/2024 cabine): cada regulamento RECOMEÇA a numeração (o clausulado geral, o RUPT,
 *     o RRRGS, o RTTP…). Por isso uma "Cl. 7.ª" sem o regulamento aponta para outra cláusula (A-104: a "Cl. 7.ª" da AC1
 *     abria a "Direito à atividade sindical"). Regra: toda a citação TAP diz o regulamento — "RRRGS Cl. 9.ª", "RUPT
 *     Cl. 45.ª", "AE Cl. 37.ª" (o clausulado geral, como o próprio BTE escreve "cláusula 49.ª do AE").
 *   · easyJet: os pilotos (SPAC) numeram por Artigo e a cabine (SNPVAC) por Cláusula — nunca um no texto do outro.
 *   · FTL: cada "ORO.FTL.NNN(x)(n)(i)" e "CS FTL.1.NNN(x)(n)(i)" do código existe no Reg. (UE) 83/2014 / CS-FTL.1, e os
 *     números da Biblioteca estão na alínea que citam (A-213: as 1000 h citavam a 210(a), que é a das horas de serviço).
 *   · Radiação: o limite de 20 mSv é do art. 9.º/2 da Diretiva e o nível de referência português é 10 mSv/ano (A-277).
 * Executar:  node scripts/citacoes-tap-ftl.test.js   (corre no npm run test:citacoes)
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
const src = (p) => fs.readFileSync(path.resolve(p), 'utf8');
const fonte = (p) => fs.readFileSync(path.resolve('fontes', p), 'utf8').normalize('NFC').replace(/\r/g, '');
const flat = (s) => String(s).normalize('NFC').replace(/[‐-―]/g, '-').replace(/\s+/g, ' ');

let ok = 0, fail = 0; const fails = [];
const check = (name, cond) => { if (cond) ok++; else { fail++; fails.push(`  ✗ ${name}`); } };
const has = (name, txt, phrase) => check(`${name} — "${String(phrase).slice(0, 90)}"`, flat(txt).includes(flat(phrase)));
const lPt = (pt) => pt;   // o l(pt, en) dos ecrãs, só a versão portuguesa
const lEn = (_pt, en) => en;
const fmt = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;

// ════════════════════════════════════════════════════════════════════════════
// TAP — índice das cláusulas por regulamento
// ════════════════════════════════════════════════════════════════════════════
const tapIndex = (file) => {
  const L = fonte(file).split('\n');
  const idx = { AE: {} }; let reg = 'AE';
  for (let i = 0; i < L.length; i++) {
    const m = /^\s{5,}Regulamento .*\(([A-Z]+)\)\s*$/.exec(L[i]);
    if (m) { reg = m[1]; idx[reg] = idx[reg] || {}; continue; }
    const k = /^\s*Cláusula (\d+)\.ª\s*$/.exec(L[i]);
    if (!k) continue;
    let title = ''; for (let j = i + 1; j < i + 6 && j < L.length; j++) if (L[j].trim()) { title = L[j].trim(); break; }
    let body = []; for (let j = i + 1; j < L.length && !/^\s*Cláusula \d+\.ª\s*$/.test(L[j]) && !/^\s{5,}Regulamento .*\([A-Z]+\)\s*$/.test(L[j]); j++) body.push(L[j]);
    if (!idx[reg][k[1]]) idx[reg][k[1]] = { title, body: body.join('\n') };
  }
  idx.TABELAS = fonte(file);
  return idx;
};
const TAP = { pilot: tapIndex('ae-tap/tap-spac-2023.txt'), cabin: tapIndex('ae-tap/tap-snpvac-2024.txt') };
const REGS = 'AE|RRRGS|RUPT|RTTP|RAAA|RBO|RRCE|RCT|RCPTC|RBOP|RPP';

// Todas as cláusulas citadas num texto TAP → [{ reg, n }] e os erros (sem regulamento, ou cláusula que não existe).
const tapCites = (side, txt) => {
  const out = [], errs = [];
  const re = new RegExp(`\\b(${REGS})\\b|\\bCl\\. ?(\\d+)(?:\\.ª)?((?:\\s?\\/\\s?\\d+(?:\\.ª)?)*)|Tabela (A-3\\.\\d)`, 'g');
  let reg = null, m;
  while ((m = re.exec(txt))) {
    if (m[1]) { reg = m[1]; continue; }
    if (m[4]) { if (!TAP[side].TABELAS.toLowerCase().includes(`tabela ${m[4]}`.toLowerCase())) errs.push(`Tabela ${m[4]} não existe`); continue; }
    const ns = [m[2], ...(m[3] ? m[3].split('/').map((x) => x.replace(/\D/g, '')).filter(Boolean) : [])];
    for (const n of ns) {
      if (!reg) { errs.push(`Cl. ${n} sem regulamento`); continue; }
      const c = TAP[side][reg] && TAP[side][reg][n];
      if (!c) errs.push(`${reg} Cl. ${n} não existe`); else out.push({ reg, n, title: c.title, body: c.body });
    }
  }
  return { out, errs };
};
const tapOk = (name, side, txt, subj) => {
  const { out, errs } = tapCites(side, txt);
  check(`${name}: cita a cláusula com o regulamento e ela existe → ${errs.join('; ') || 'ok'} [${txt}]`, errs.length === 0);
  if (subj) check(`${name}: a cláusula é sobre ${subj} → ${out.map((c) => `${c.reg} ${c.n} "${c.title}"`).join(', ')}`, out.some((c) => subj.test(c.title)));
};

const { AE_TAP_PILOT, AE_TAP_CABIN, AE_PILOT, AE_CABIN, FTL, domainsFor } = R('data/infoCatalog.js');
// Revisão do 8b: o valor horário em € da tua categoria aparece na explicação (antes as contas existiam sem ecrã).
{
  const P = { red: '#f00', onInkFaint: '#999' };
  const itemOf = (cards, name) => cards.find((c) => c.k === 'ae').data.groups.flatMap((g) => g.items).find((it) => it.name === name);
  const pil = domainsFor(P, { ae: R('ae/tapSpac.js'), crewCategory: 'CTE', ym: '2026-03' });
  check('TAP pilotos: hora L1 do CTE em 2026 = de 258,67 a 266,35 €', /Para ti \(CTE, 2026\): de 258,67 a 266,35 € por hora\./.test(itemOf(pil, 'Hora de voo · Limite 1').f));
  check('TAP pilotos: hora L2 do CTE em 2026 = de 517,34 a 532,70 €', /de 517,34 a 532,70 €/.test(itemOf(pil, 'Hora de voo · Limite 2').f));
  const cab = domainsFor(P, { ae: R('ae/tapSnpvac.js'), crewCategory: 'CAB3', ym: '2026-03' });
  check('TAP cabine: vencimento horário do CAB 3 em 2026 = de 50,52 a 51,53 €', /Para ti \(CAB3, 2026\): de 50,52 a 51,53 € por hora\./.test(itemOf(cab, 'Vencimento horário').f));
  const cab25 = domainsFor(P, { ae: R('ae/tapSnpvac.js'), crewCategory: 'CAB3', ym: '2025-03' });
  check('TAP cabine 2025: um valor só (46,78 €)', /Para ti \(CAB3, 2025\): 46,78 € por hora\./.test(itemOf(cab25, 'Vencimento horário').f));
  check('categoria desconhecida → sem "para ti"', !/Para ti/.test(itemOf(domainsFor(P, { ae: R('ae/tapSpac.js'), crewCategory: null, ym: '2026-03' }), 'Hora de voo · Limite 1').f));
  check('o catálogo fixo não muda', !/Para ti/.test(AE_TAP_PILOT.groups.flatMap((g) => g.items).map((it) => it.f).join(' ')));
}
const { provaFor } = R('data/prova.js');
const tapSpac = R('ae/tapSpac.js'), tapSnpvac = R('ae/tapSnpvac.js');
const ezySpac = R('ae/easyjetSpac.js'), ezySnpvac = R('ae/easyjetSnpvac.js');
const { kindInfoOf, nightStopLaw } = R('data/aeTexts.js');

// ── T1 · Biblioteca TAP: cada rubrica cita a cláusula certa, com o regulamento ──
const SUBJ_TAP = {
  'Vencimento de exercício': /exercício/i, 'Vencimento de senioridade': /senioridade/i, 'Senioridade': /senioridade/i,
  'Comando em cruzeiro': /comando/i, 'Subsídios de férias e Natal': /férias|Natal/i, 'Subsídios férias/Natal': /férias|Natal/i,
  'Férias': /Férias/i, 'Ajuda de custo · dia de voo (AC1)': /Ajuda de custo/i, 'Estadia / pernoita (AC2)': /Ajuda de custo/i,
  'Complemento extraordinário': /extraordinário/i, 'Vencimento horário': /Block-pay|duty-pay/i, 'Adicional de chefia': /chefia/i,
  'Tempo parcial': /./, 'Vencimento base · CAB 3': /Vencimento fixo/i,
};
for (const [side, cat] of [['pilot', AE_TAP_PILOT], ['cabin', AE_TAP_CABIN]]) {
  for (const g of cat.groups) for (const it of g.items) {
    tapOk(`Biblioteca TAP ${side} · ${it.name}`, side, it.art, SUBJ_TAP[it.name]);
    if (/Cl\./.test(it.f || '')) tapOk(`Biblioteca TAP ${side} · ${it.name} (texto)`, side, it.f);
  }
}
// As férias dos pilotos: 42 dias; as reduções por absentismo param nos 30 (RUPT Cl. 45.ª, n.º 6); os 38 são o piso da troca
// de faltas injustificadas por férias (AE Cl. 33.ª, n.º 2) — A-113.
{
  const fer = AE_TAP_PILOT.groups.flatMap((g) => g.items).find((x) => x.name === 'Férias');
  has('Biblioteca TAP pilotos · férias: o piso das reduções por absentismo', fer.f, '30 dias');
  has('Biblioteca TAP pilotos · férias: o piso das faltas injustificadas', fer.f, 'AE Cl. 33.ª');
  has('RUPT Cl. 45.ª, n.º 6 diz o piso de 30', TAP.pilot.RUPT['45'].body, 'resultar um período de férias inferior a 30 dias');
  has('AE Cl. 33.ª, n.º 2 diz o piso de 38', TAP.pilot.AE['33'].body, 'reduzido em nenhuma circunstância a menos de 38 dias de férias');
}

// ── T2 · Prova TAP ──
for (const [side, isPilot] of [['pilot', true], ['cabin', false]]) {
  for (const id of ['perDiem', 'pernoita', 'base', 'ferias', 'comando', 'doenca']) {
    const p = provaFor(id, { companySlug: 'tap', isPilot });
    if (!p) continue;
    tapOk(`Prova TAP ${side} · ${id}`, side, p.art);
    if (/Cl\./.test(p.resumo)) tapOk(`Prova TAP ${side} · ${id} (resumo)`, side, p.resumo);
  }
}
{
  const fer = provaFor('ferias', { companySlug: 'tap', isPilot: true });
  check('Prova TAP pilotos · férias: cita o RUPT (as férias dos pilotos estão no RUPT Cl. 45.ª)', /RUPT Cl\. 45\.ª/.test(fer.art));
  has('Prova TAP pilotos · férias: o piso de 30 por absentismo', fer.resumo, '30 dias');
  const ac1 = provaFor('perDiem', { companySlug: 'tap', isPilot: false });
  tapOk('Prova TAP cabine · AC1', 'cabin', ac1.art, /Ajuda de custo complementar/i);
  const cmd = provaFor('comando', { companySlug: 'tap', isPilot: true });
  tapOk('Prova TAP pilotos · comando', 'pilot', cmd.art, /comando/i);
}

// ── T3 · Rótulos dos módulos TAP (Cálculos) e as prestações do mês (cite) ──
for (const [side, mod, file] of [['pilot', tapSpac, 'ae/tapSpac.js'], ['cabin', tapSnpvac, 'ae/tapSnpvac.js']]) {
  for (const c of mod.CALCS || []) if (/[Cc]l\./.test(c.sub)) tapOk(`Cálculos TAP ${side} · ${c.label}`, side, c.sub.replace(/\bcl\./g, 'Cl.'));
  for (const c of mod.CALCS || []) check(`Cálculos TAP ${side} · ${c.label}: "Cl." com maiúscula e o regulamento`, !/\bcl\. \d/.test(c.sub));
  const cites = [...src(file).matchAll(/cite: (?:[^'\n]*\? )?'([^']+)'(?: : '([^']+)')?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
  check(`${file}: há citações nas prestações do mês`, cites.length > 0);
  for (const c of cites) tapOk(`${file} · cite`, side, c);
}

// ── T4 · Notas do formulário do serviço, por acordo ──
const KINDS = ['flight', 'positioning', 'standby_airport', 'standby_home', 'training', 'office'];
for (const [side, mod] of [['pilot', tapSpac], ['cabin', tapSnpvac]]) {
  const info = kindInfoOf(mod, side === 'pilot', side === 'pilot' ? 'OP' : 'CAB3', '2026-03-10', lPt, fmt);
  for (const k of KINDS) if (info[k]) tapOk(`Formulário TAP ${side} · ${k}`, side, info[k]);
  const infoEn = kindInfoOf(mod, side === 'pilot', side === 'pilot' ? 'OP' : 'CAB3', '2026-03-10', lEn, fmt);
  for (const k of KINDS) if (infoEn[k]) tapOk(`Formulário TAP ${side} (en) · ${k}`, side, infoEn[k]);
}
{
  const p = kindInfoOf(tapSpac, true, 'OP', '2026-03-10', lPt, fmt);
  tapOk('Formulário TAP pilotos · voo = per diem (RRRGS Cl. 9.ª)', 'pilot', p.flight, /per diem/i);
  const c = kindInfoOf(tapSnpvac, false, 'CAB3', '2026-03-10', lPt, fmt);
  tapOk('Formulário TAP cabine · voo = AC1 (RRRGS Cl. 7.ª)', 'cabin', c.flight, /Ajuda de custo/i);
  tapOk('Formulário TAP cabine · e-learning (RRRGS Cl. 13.ª)', 'cabin', c.training);
  has('RRRGS Cl. 13.ª da cabine tem os 18,125 €/h do e-learning', TAP.cabin.RRRGS['13'].body, '18,125 €/hora');
}

// ── T5 · Baixa no Início: o texto vem do acordo do perfil (A-103, A-205) ──
{
  const st = (mod, day) => mod.SICK_STATE && (day <= 3 ? mod.SICK_STATE.first : mod.SICK_STATE.rest);
  for (const day of [1, 5]) {
    const tp = st(tapSpac, day), tc = st(tapSnpvac, day);
    check(`Baixa TAP pilotos, dia ${day}: há texto`, !!(tp && tp.pt && tp.en));
    check(`Baixa TAP cabine, dia ${day}: há texto`, !!(tc && tc.pt && tc.en));
    if (tp) { tapOk(`Baixa TAP pilotos, dia ${day}`, 'pilot', tp.pt, /doença/i); check(`Baixa TAP pilotos, dia ${day}: não cita o Art. 48 (easyJet)`, !/Art\. 48/.test(tp.pt + tp.en)); }
    if (tc) { tapOk(`Baixa TAP cabine, dia ${day}`, 'cabin', tc.pt, /doença/i); check(`Baixa TAP cabine, dia ${day}: não cita o Art. 48 (easyJet)`, !/Art\. 48/.test(tc.pt + tc.en)); }
  }
  // do 4.º dia em diante a TAP completa o subsídio (não é "só a Segurança Social")
  check('Baixa TAP pilotos, dia 5: a TAP completa o subsídio da Segurança Social', /completa|diferença/i.test(st(tapSpac, 5).pt) && !/só a Segurança Social/.test(st(tapSpac, 5).pt));
  check('Baixa TAP cabine, dia 5: a TAP completa o subsídio da Segurança Social', /completa|diferença/i.test(st(tapSnpvac, 5).pt) && !/só a Segurança Social/.test(st(tapSnpvac, 5).pt));
  check('Baixa TAP: os dias 1 a 3 só em 3 ocorrências por ano', /3 (vezes|ocorrências)/.test(st(tapSpac, 1).pt) && /3 (vezes|ocorrências)/.test(st(tapSnpvac, 1).pt));
  has('AE Cl. 37.ª dos pilotos: 3 ocorrências por ano', TAP.pilot.AE['37'].body, 'mitado a 3 ocorrências por ano');   // "li-\nmitado" no BTE
  has('RRRGS Cl. 20.ª da cabine: 3 ocorrências por ano', TAP.cabin.RRRGS['20'].body, 'limitado a 3 ocorrências por ano');
  // easyJet: cada um com o seu artigo
  check('Baixa easyJet pilotos: Art. 48.º', /Art\. 48\.º/.test(st(ezySpac, 2).pt) && /Art\. 48\.º/.test(st(ezySpac, 5).pt));
  check('Baixa easyJet cabine: Cl. 61.ª', /Cl\. 61\.ª/.test(st(ezySnpvac, 2).pt) && /Cl\. 61\.ª/.test(st(ezySnpvac, 5).pt));
  check('Baixa: a unidade "de 3 pagos" só nos pilotos easyJet', ezySpac.SICK_STATE.paidFirst3 === true && !ezySnpvac.SICK_STATE.paidFirst3 && !tapSpac.SICK_STATE.paidFirst3 && !tapSnpvac.SICK_STATE.paidFirst3);
  // sem acordo modelado o Início não diz nada sobre o pagamento
  const home = src('screens/HomeScreen.js');
  check('Início: a regra da baixa vem do acordo do perfil (SICK_STATE), não de um texto fixo', /SICK_STATE/.test(home) && !/Art\. 48/.test(home.replace(/\/\/.*$/gm, '')));
}

// ── T6 · Pernoita: cada acordo com a sua cláusula; sem acordo, nada (A-211) ──
check('Pernoita sem acordo: sem "abono AE"', nightStopLaw(null, true, lPt) === null && nightStopLaw(null, false, lPt) === null);
check('Pernoita easyJet pilotos: Art. 39.º', /Art\. 39\.º/.test(nightStopLaw(ezySpac, true, lPt)));
check('Pernoita easyJet cabine: Cl. 56.ª', /Cl\. 56\.ª/.test(nightStopLaw(ezySnpvac, false, lPt)));
tapOk('Pernoita TAP pilotos', 'pilot', nightStopLaw(tapSpac, true, lPt), /per diem/i);
tapOk('Pernoita TAP cabine', 'cabin', nightStopLaw(tapSnpvac, false, lPt), /Ajuda de custo/i);

// ── T7 · Ecrãs com citações só da TAP: todas dizem o regulamento ──
const quoted = (code) => [...code.replace(/^\s*\/\/.*$/gm, '').matchAll(/'([^'\n]*)'|`([^`\n]*)`/g)].map((m) => m[1] != null ? m[1] : m[2]);
for (const s of quoted(src('screens/DutyDetailScreen.js')).filter((x) => /\bCl\. ?\d/.test(x))) {
  const side = /Cl\. 4\.ª|Cl\. 23|Cl\. 24|Cl\. 29|Cl\. 32|cabine|cabin/.test(s) && !/Cl\. 6\.ª|Cl\. 35|Cl\. 43|Cl\. 25|Cl\. 34/.test(s) ? 'cabin' : 'pilot';
  const { errs } = tapCites(side, s.replace(/\$\{[^}]*\}/g, ''));
  check(`Detalhe do serviço (TAP): "${s.slice(0, 70)}" diz o regulamento → ${errs.join('; ') || 'ok'}`, !errs.some((e) => /sem regulamento/.test(e)));
}
for (const s of quoted(src('data/perdiem.js')).filter((x) => /\bCl\. ?\d/.test(x) && !/Cl\. 70/.test(x))) {
  check(`Valor do serviço (TAP): "${s}" diz o regulamento`, new RegExp(`\\b(${REGS})\\b`).test(s));
}
{
  const stats = quoted(src('screens/StatsScreen.js')).filter((x) => /estadia nos dias sem voo|stay on days without flights/.test(x));
  check('Números · pernoita TAP: há o texto', stats.length > 0);
  for (const s of stats) check(`Números · pernoita TAP: "${s}" diz o regulamento`, /RRRGS/.test(s));
}

// ════════════════════════════════════════════════════════════════════════════
// easyJet — o texto certo de cada acordo
// ════════════════════════════════════════════════════════════════════════════
const EZY = {
  pilot: fonte('ae-easyjet/easyjet-spac-2023.txt'),
  cabin: fonte('ae-easyjet/easyjet-snpvac-2024.txt'),
};
const ezyOk = (name, side, txt) => {
  if (side === 'pilot') check(`${name}: os pilotos easyJet citam Artigos, não Cláusulas [${txt}]`, !/\bCl\. ?\d/.test(txt));
  else check(`${name}: a cabine easyJet cita Cláusulas, não Artigos [${txt}]`, !/\bArt\. ?\d/.test(txt));
  for (const m of txt.matchAll(/\b(Art|Cl)\. ?(\d+)/g)) {
    const re = side === 'pilot' ? new RegExp(`^\\s*Artigo ${m[2]}\\.º\\s*$`, 'm') : new RegExp(`^\\s*Cláusula ${m[2]}\\.ª\\s*$`, 'm');
    check(`${name}: ${m[0]} existe no AE`, re.test(EZY[side]));
  }
};
for (const [side, mod] of [['pilot', ezySpac], ['cabin', ezySnpvac]]) {
  const info = kindInfoOf(mod, side === 'pilot', side === 'pilot' ? 'FO' : 'FA', '2026-03-10', lPt, fmt);
  for (const k of KINDS) if (info[k]) ezyOk(`Formulário easyJet ${side} · ${k}`, side, info[k]);
}
{
  // ADTY dos pilotos (Anexo I.5): não chamado 1 NS até 3h59, 2 NS a partir de 4h00; chamado: os setores, + 2 NS a partir de 4h00 (A-048/A-073/A-210)
  has('Anexo I.5 dos pilotos — não chamado, até 3h59', EZY.pilot, '00’00-03’59 horas   1 sector nominal');
  has('Anexo I.5 dos pilotos — chamado, a partir de 4h', EZY.pilot, '2 sectores nominais e sectores');
  const adtyF = kindInfoOf(ezySpac, true, 'FO', '2026-03-10', lPt, fmt).standby_airport;
  check(`Formulário easyJet pilotos · ADTY descreve as 4 h e a chamada → "${adtyF}"`, /4 ?h/.test(adtyF) && /chamad/i.test(adtyF));
  const adtyB = AE_PILOT.groups.flatMap((g) => g.items).find((x) => /ADTY/.test(x.name));
  check(`Biblioteca easyJet pilotos · ADTY: não chamado 1 NS até 3h59, 2 NS a partir de 4h00 → "${adtyB.f}"`, /3h59/.test(adtyB.f) && /4h00/.test(adtyB.f) && /chamad/i.test(adtyB.f));
  check('Biblioteca easyJet pilotos · ADTY: cita o Anexo I.5', /Anexo I\.5/.test(adtyB.art));
  const adtyC = (ezySpac.CALCS || []).find((c) => c.id === 'adty');
  check(`Cálculos easyJet pilotos · ADTY → "${adtyC.sub}"`, !/^1-2 setores/.test(adtyC.sub) && /4 ?h/.test(adtyC.sub));
  // Bónus dos pilotos (Art. 46.º, n.º 3): alvo 10 % (CPT, SFO), 7,5 % (FO), 5 % (SO) da retribuição base anual
  has('Art. 46.º dos pilotos', EZY.pilot, 'corresponde a 10 % da retribuição base anual');
  const bon = AE_PILOT.groups.flatMap((g) => g.items).find((x) => /Bónus/.test(x.name));
  check(`Biblioteca easyJet pilotos · bónus: 10 / 7,5 / 5 % da base anual, sem "semanas" → "${bon.v} · ${bon.f}"`, /10 %/.test(bon.f) && /7,5 %/.test(bon.f) && /5 %/.test(bon.f) && !/sem/.test(bon.v) && !/semanas/.test(bon.f));
  // ADTY da cabine (Cl. 58.ª): 0 a 2 setores MÉDIOS (A-012)
  const adtyCab = AE_CABIN.groups.flatMap((g) => g.items).find((x) => /aeroporto/.test(x.name));
  check(`Biblioteca easyJet cabine · assistência no aeroporto: 0 a 2 setores médios → "${adtyCab.v} ${adtyCab.u} · ${adtyCab.f}"`, /^0/.test(adtyCab.v) && /setores? médios?/.test(adtyCab.f + adtyCab.u));
  has('Cl. 58.ª da cabine', EZY.cabin, '1 (um) setor médio');
  // IDO da cabine (Cl. 68.ª, n.º 3): paragem noturna não programada num dia de folga — a folga é devolvida (A-012)
  const ido = AE_CABIN.groups.flatMap((g) => g.items).find((x) => /IDO/.test(x.name));
  check(`Biblioteca easyJet cabine · IDO: paragem noturna não programada num dia de folga, a folga devolvida → "${ido.f}"`, /[Pp]aragem noturna não programada/.test(ido.f) && /devolvid|devido/.test(ido.f));
  has('Cl. 68.ª, n.º 3 da cabine', EZY.cabin, 'paragem noturna não programada coincidir com um dia de folga');
}
// ── E · Declaração do SNC/RDP: a de cada acordo (A-081) ──
{
  const { declarationFor } = R('data/disruption.js');
  const sp = declarationFor('snc', 'Art. 63.º', 'pt'), sc = declarationFor('snc', 'Cl. 66.ª', 'pt'), rc = declarationFor('rdp', 'Cl. 67.ª', 'pt');
  check(`SNC pilotos: Art. 63.º, n.os 4 e 5, sem os códigos da cabine → "${sp}"`, /Art\. 63\.º/.test(sp) && /12 h/.test(sp) && !/LATE/.test(sp));
  check(`SNC cabine: Cl. 66.ª, n.os 3 e 4 → "${sc}"`, /Cl\. 66\.ª/.test(sc) && /12 h/.test(sc) && !/LATE/.test(sc));
  check(`RDP cabine: Cl. 67.ª, n.º 2, com os códigos → "${rc}"`, /Cl\. 67\.ª/.test(rc) && /LATE/.test(rc));
  has('Art. 63.º, n.º 5 dos pilotos', EZY.pilot, 'ocorre nas 12 ho- ras seguintes a, uma perturbação fora do controlo da empresa'.replace('ho- ras', 'ho-\nras'));
  has('Cl. 66.ª, n.º 4 da cabine', EZY.cabin, 'uma perturbação fora do controlo da empresa');
  has('Cl. 67.ª, n.º 2 da cabine', EZY.cabin, 'LATE, NSO, RCON, UNCT, DECL, RFSD');
  check('Disrupção: o visto já não é um texto fixo com os códigos da cabine', !/LATE\/NSO\/RCON\/UNCT\/DECL\/RFSD na escala', 'Not called/.test(src('screens/DisrupcaoScreen.js')));
}

// ════════════════════════════════════════════════════════════════════════════
// FTL — cada citação existe no texto oficial
// ════════════════════════════════════════════════════════════════════════════
const PT = fonte('ftl/reg-ue-83-2014-pt.txt').split('\n');
const EN = fonte('ftl/reg-ue-83-2014-en.txt');
const CS = fonte('ftl/cs-ftl1-2014-002-R.txt').split('\n');
// O bloco de um artigo: do cabeçalho até ao cabeçalho seguinte.
const block = (lines, headRe, nextRe) => {
  const i = lines.findIndex((l) => headRe.test(l) && !/\.{5}/.test(l));
  if (i < 0) return null;
  let j = i + 1; while (j < lines.length && !nextRe.test(lines[j])) j++;
  return lines.slice(i + 1, j);
};
// As marcas de um nível seguem uma SEQUÊNCIA (a, b, c… · 1, 2, 3… · i, ii, iii…): parte-se o bloco pelas marcas que
// continuam a sequência (a indentação do PDF muda de página para página, e um "i)" de outro nível não é o "i" das letras).
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const ROMANS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
const NUMS = Array.from({ length: 80 }, (_, k) => String(k + 1));
const sub = (lines, markRe, seq, key) => {
  const starts = []; let n = 0;
  lines.forEach((l, i) => { const m = markRe.exec(l); if (m && m[1] === seq[n]) { starts.push(i); n++; } });
  const k = seq.indexOf(key);
  if (k < 0 || k >= starts.length) return null;
  const at = starts[k], end = k + 1 < starts.length ? starts[k + 1] : lines.length;
  return [lines[at].replace(markRe, ''), ...lines.slice(at + 1, end)];
};
const ftlPara = (code) => {
  const m = /^(ORO\.FTL|ARO\.OPS|ORO\.OPS|CS FTL\.1)\.(\d{3})((?:\([a-z0-9]+\))*)$/.exec(code);
  if (!m) return null;
  const parts = [...m[3].matchAll(/\(([a-z0-9]+)\)/g)].map((x) => x[1]);
  const isCS = m[1] === 'CS FTL.1';
  let b = isCS
    ? block(CS, new RegExp(`^\\s*CS FTL\\.1\\.${m[2]} [A-Z]`), /^\s*(CS FTL\.1\.\d{3} [A-Z]|BOOK 2|GM1 )/)
    : block(PT, new RegExp(`^\\s*${m[1].replace('.', '\\.')}\\.${m[2]} \\S`), /^\s*(ORO\.FTL|ARO\.OPS|ORO\.OPS|ORO\.GEN|ARO\.GEN)\.\d{3} \S/);
  if (!b) return null;
  // ORO.FTL.105 — as definições numeram "12)" no texto português
  if (!isCS && m[2] === '105' && parts.length) { const d = sub(b, /^\s*(\d+)\) /, NUMS, parts[0]); return d ? d.join('\n') : null; }
  const marks = isCS ? [/^\s*\(([a-z])\) /, /^\s*\((\d+)\) /, /^\s*\(([ivx]+)\) /] : [/^\s*([a-z])\) /, /^\s*\((\d+)\) /, /^\s*([ivx]+)\) /];
  let prev = null;
  for (const p of parts) {
    const lvl = /^\d+$/.test(p) ? 1 : (prev === 1 && ROMANS.includes(p) ? 2 : 0);
    b = sub(b, marks[lvl], [LETTERS, NUMS, ROMANS][lvl], p);
    if (!b) return null;
    prev = lvl;
  }
  return b.join('\n');
};
// F1 · varrimento: todas as citações FTL com alíneas, em todo o código que o tripulante pode ler
const FILES = ['data', 'screens', 'components'].flatMap((d) => fs.readdirSync(path.resolve(d)).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`));
const seen = new Map();
for (const f of FILES) {
  const code = src(f).replace(/^\s*\/\/.*$/gm, '');
  for (const m of code.matchAll(/\b(ORO\.FTL|CS FTL\.1)\.(\d{3})((?:\([a-z0-9]+\))+)/g)) {
    const c = `${m[1]}.${m[2]}${m[3]}`;
    if (!seen.has(c)) seen.set(c, f);
  }
}
check('FTL: o varrimento encontrou citações', seen.size > 20);
for (const [c, f] of seen) check(`FTL: ${c} (${f}) existe no texto oficial`, ftlPara(c) != null);
check('FTL: o leitor não aceita uma alínea que não existe (CS FTL.1.205(g))', ftlPara('CS FTL.1.205(g)') == null);
check('FTL: o leitor encontra a CS FTL.1.205(d) (adiamento da apresentação)', /delayed reporting/i.test(ftlPara('CS FTL.1.205(d)') || ''));

// F2 · Biblioteca: o número está na alínea que cita (A-213)
const NUM = { '1000': '1 000' };
for (const g of FTL.groups) for (const it of g.items) {
  const p = ftlPara(it.art.split(' e ')[0]);   // "ORO.FTL.235(a)(1) e (b)" → o número está na 1.ª
  if (/ e \(/.test(it.art)) check(`Biblioteca FTL · ${it.name}: a 2.ª alínea também existe`, ftlPara(it.art.split(' e ')[0].replace(/(\([a-z]\))(\(\d+\))?$/, '') + it.art.split(' e ')[1]) != null);
  check(`Biblioteca FTL · ${it.name}: ${it.art} existe`, p != null);
  const v = NUM[it.v] || it.v;
  if (p) check(`Biblioteca FTL · ${it.name}: ${it.v} ${it.u} está na ${it.art}`, it.u === 'h' && it.name === 'FDP básico' ? flat(p).includes(`${it.v}:00`) : new RegExp(`(^|\\D)${v} horas`).test(flat(p)));
}
check('Biblioteca FTL · 1000 h: ORO.FTL.210(b)(3)', FTL.groups.flatMap((g) => g.items).some((x) => x.v === '1000' && x.art === 'ORO.FTL.210(b)(3)'));

// F3 · o texto integral da lei saiu da app (A-296, decisão do Nuno 2026-11-07): a lei abre-se na fonte oficial (Biblioteca,
// Prova). Uma cópia à mão desatualiza-se em silêncio — a auditoria encontrou lá a definição 8 em inglês trocada e uma alínea
// inexistente. Se voltar, volta com teste.
const T = R('data/ftl.js');
const { t } = R('data/i18n.js');
check('data/ftl.js: sem o texto integral (FTL_ARTICLES, FTL_DEFINITIONS, FTL_LIMITS)', !T.FTL_ARTICLES && !T.FTL_DEFINITIONS && !T.FTL_LIMITS);
check('data/ftl.js: as tabelas do motor continuam (Quadros 1–4, repouso a bordo, fusos)', !!(T.PSV_ACCLIMATISED && T.PSV_UNKNOWN && T.QUADRO1 && T.INFLIGHT_REST && T.TZ_REST_NIGHTS));
check('ecrã FtlDetail apagado', !fs.existsSync(path.resolve('screens/FtlDetailScreen.js')) && !/FtlDetail/.test(src('App.js')));
// o rodapé do calculador do repouso a bordo dos pilotos (Simulação → Avançado) — o único texto dessa família que se vê
check('ftl.fcFoot: ORO.FTL.205(e) · CS FTL.1.205(c), 90 min consecutivos e 2 h aos comandos na aterragem', /ORO\.FTL\.205\(e\)/.test(t('ftl.fcFoot', 'pt')) && /90 min consecutivos/.test(t('ftl.fcFoot', 'pt')) && /2 h consecutivas/.test(t('ftl.fcFoot', 'pt')));
has('CS FTL.1.205(c)(1)(ii) — 90 min e 2 h', CS.join('\n'), 'a consecutive 90-minute period for each crew member and 2 consecutive hours for the flight crew members');

// F4 · Prova FTL (A-294, A-299, A-300)
const pv = (id, lang = 'pt') => provaFor(id, { lang });
check('Prova psvMax: cita a ORO.FTL.205(b)', pv('psvMax').art === 'ORO.FTL.205(b)');
check('Prova psvMax: fala da hora de referência e do estado desconhecido (Quadro 3)', /hora de referência/.test(pv('psvMax').resumo) && /desconhecido/.test(pv('psvMax').resumo) && /Quadro 3/.test(pv('psvMax').resumo));
check('Prova standby: sem o 230 (a reserva não é standby) e com a CS FTL.1.225', !/230/.test(pv('standby').art) && /CS FTL\.1\.225/.test(pv('standby').art));
check('Prova standby: 25 % do outro standby, PSV máximo reduzido acima de 6 h / 4 h no aeroporto', /25 %/.test(pv('standby').resumo) && /6 h/.test(pv('standby').resumo) && /4 h/.test(pv('standby').resumo));
has('CS FTL.1.225(b)(3) — os 25 %', CS.join('\n'), '25 % of time spent on standby other than airport standby counts as duty time');
check('Prova limites (en): "12 consecutive calendar months"', /12 consecutive calendar months/.test(pv('limites', 'en').resumo));

// ════════════════════════════════════════════════════════════════════════════
// Radiação (A-277)
// ════════════════════════════════════════════════════════════════════════════
{
  const EUR = fonte('eu/euratom-2013-59-pt.txt'), DL = fonte('pt/dl-108-2018-republicado.txt');
  has('Diretiva 2013/59/Euratom, art. 9.º, n.º 2', EUR, 'O limite de dose efetiva para a exposição profissional é fixado em 20 mSv num mesmo ano');
  has('DL 108/2018 (republicado), art. 92.º', DL, 'O nível de referência a ser aplicado em exposição à radiação cósmica de tripulações de aero');
  has('DL 108/2018 (republicado), art. 92.º — o valor', DL, 'naves ou de veículos espaciais é de 10 mSv/ano');
  has('DL 108/2018 (republicado), art. 67.º, n.º 2', DL, 'O limite de dose efetiva para os trabalhadores expostos é de 20 mSv por ano');
  const r = provaFor('radiacao', { lang: 'pt' });
  check(`Prova radiação: os 20 mSv citam o art. 9.º/2 → "${r.art}"`, /9\.º\/2/.test(r.art));
  check('Prova radiação: diz o nível de referência português de 10 mSv/ano (DL 108/2018, art. 92.º)', /10 mSv/.test(r.resumo) && /92\.º/.test(r.resumo));
  check(`Prova radiação: não é "FTL" → "${r.lawTag}"`, !/FTL/.test(r.lawTag));
  const { RADIATION_SOURCES } = R('data/library.js');
  const dl = RADIATION_SOURCES.find((x) => x.key === 'dl108');
  check('Biblioteca · DL 108/2018: art. 92.º (10 mSv/ano)', /92\.º/.test(dl.sub.pt) && /10 mSv/.test(dl.sub.pt));
}

// ════════════════════════════════════════════════════════════════════════════
// Valores brutos (A-198)
// ════════════════════════════════════════════════════════════════════════════
{
  has('Anexo I dos pilotos easyJet: brutos', EZY.pilot, 'Todas as quantidades indicadas sao brutas');
  has('Anexo I da cabine easyJet: brutos', EZY.cabin, 'Todas as quantias indicadas são valores brutos');
  // N1 (2026-11-14): o topo dos Números diz "Ganhos brutos de <mês/ano>" e, por baixo do número, "estimado" — a regra fica: bruto e
  // estimado, sempre.
  check('Números: o título dos ganhos diz "bruto" e o número diz "estimado"', /Ganhos brutos de/.test(src('screens/StatsScreen.js')) && /l\('estimado', 'estimated'\)/.test(src('screens/StatsScreen.js')));
  check('Início: o € do mês diz "bruto"', /estimado · bruto/.test(src('data/homeCards.js')));   // o texto do Início 3.0 vive no homeCards (2026-11-11)
}

console.log(`\nCitações TAP · FTL · radiação: ${ok} ✓  ${fail} ✗`);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
