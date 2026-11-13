/*
 * Golden das CITAÇÕES dos AE da easyJet (2026-11-04) — cada citação da Biblioteca (data/infoCatalog.js) e dos rótulos dos
 * acordos (ae/easyjetSpac.js · ae/easyjetSnpvac.js) é conferida no TEXTO OFICIAL guardado em fontes/ae-easyjet/:
 *   · o PREFIXO certo — pilotos (SPAC, BTE 29/2026; até 2026-11-13 o BTE 40/2023) numeram por "Artigo" → "Art."; cabine (SNPVAC, BTE 8/2024) por
 *     "Cláusula" → "Cl.";
 *   · o artigo/cláusula/ponto do Anexo I EXISTE;
 *   · o TÍTULO bate com o assunto (achado: DDO/IDO/WFLY dos pilotos citavam "Cl. 68/69" — números da cabine; no SPAC os
 *     Arts. 68/69 são férias; o certo é Art. 54.º e Art. 62.º).
 * Executar:  node scripts/citacoes-easyjet.test.js   (ou: npm run test:citacoes)
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

const { AE_PILOT, AE_CABIN } = require(path.resolve('data/infoCatalog.js'));
const TXT = {
  pilot: fs.readFileSync(path.resolve('fontes/ae-easyjet/easyjet-spac-2026.txt'), 'utf8').split(/\r?\n/),   // BTE 29/2026 (2026-11-13; antes o BTE 40/2023)
  cabin: fs.readFileSync(path.resolve('fontes/ae-easyjet/easyjet-snpvac-2024.txt'), 'utf8').split(/\r?\n/),
};

let ok = 0, fail = 0; const fails = [];
const check = (name, cond) => { if (cond) ok++; else { fail++; fails.push(`  ✗ ${name}`); } };

// O título de um artigo/cláusula: a 1.ª linha com texto depois do cabeçalho.
const titleOf = (lines, re) => {
  const i = lines.findIndex((l) => re.test(l));
  if (i < 0) return null;
  for (let j = i + 1; j < i + 5 && j < lines.length; j++) { const t = lines[j].trim(); if (t) return t; }
  return '';
};
// Um ponto do Anexo I ("13- WIDO (DDO/IDO) …"): procura na parte final (o anexo).
const annexOf = (lines, n) => {
  const start = lines.findIndex((l) => /^\s*ANEXO I\s*$/.test(l));   // o cabeçalho do anexo (não as referências "anexo I")
  const from = start >= 0 ? start : Math.floor(lines.length * 0.8);
  // "13- …" ou "15.º …" (SNPVAC 2024 e SPAC 2023) ou "13. …" (SPAC 2026, que traz cada ponto em português e em inglês: devolve
  // todas as linhas desse número juntas, para o assunto se procurar nas duas).
  const ls = lines.slice(from).filter((x) => new RegExp(`^\\s*${n}(-|\\.º|\\.)(\\s|$)`).test(x));
  return ls.length ? ls.map((x) => x.trim()).join(' | ') : null;
};

// O ASSUNTO esperado de cada rubrica (palavra que tem de estar no título oficial).
const SUBJ = {
  'Remuneração base': /Remuneração base/i, 'Per diem': /Per diem|setores/i, 'Paragem nocturna': /Paragens noturnas/i,
  'Pernoita': /Pernoitas/i, 'Dia de férias': /férias/i, 'Serviço aeroporto (ADTY)': /ADTY|aeroporto/i,
  'Assistência no aeroporto': /Assistência no aeroporto/i, 'Posicionamento': /Posicionamento/i,
  'Dever ad-hoc / formação': /ad-hoc/i, 'Trabalho em terra': /Trabalho em terra/i,
  'Dia de escritório (OFC4)': /escritório/i, 'Dia de escritório (OFC8)': /escritório/i,
  'Instrutor / verificador': /instrutor|examinador/i, 'Alteração de escala (SNC)': /SNC|curta antecedência|alterações/i,
  'Irregularidade (RDP)': /RDP|irregularidade/i, 'Trabalhar em folga (DDO)': /descanso|DDO/i, 'Folga infringida (IDO)': /descanso|IDO/i,
  'Voluntário em folga (WFLY)': /folga|WFLY|descanso/i, 'Complemento de doença': /doença/i,
  'Prestação de benefícios': /benefícios/i, 'Abono para benefícios': /benefícios/i, 'Complemento de gravidez': /gravidez/i,
  'Prémio de permanência': /permanência/i, 'Retenção (sazonal)': /Reten|sazonal|one-off|pagamento/i,
  'Bónus de performance': /Bónus/i, 'Setor nominal · FO': /Setor nominal|sector/i, 'Setor nominal · CM': /Setor nominal/i,
  'Upranker · por setor': /upranker/i, 'CCLT · por dia': /Responsabilidades adicionais/i, 'CTI-Flexi (instrutor)': /Responsabilidades adicionais/i,
  'Abono para falhas': /falhas/i, 'Domínio de língua': /língua/i,
  'Voo doméstico': /domésticos|setor extra/i, 'SOC / EXPD': /SOC/, 'Turnaround longo': /turnaround/i, 'Prestação complementar anual': /benefícios/i,
};

const run = (cat, crew) => {
  const lines = TXT[crew];
  for (const g of cat.groups) for (const it of g.items) {
    const art = String(it.art || '');
    const lbl = `${crew === 'pilot' ? 'piloto' : 'cabine'} · ${it.name} (${art})`;
    const subj = SUBJ[it.name];
    let m;
    if ((m = /^Anexo I\.(\d+)$/.exec(art))) {
      const line = annexOf(lines, m[1]);
      check(`${lbl}: o ponto ${m[1]} do Anexo I existe`, !!line);
      if (line && subj) { const first = line.split(' | ')[0]; const i0 = lines.findIndex((x) => x.trim() === first); check(`${lbl}: o ponto do Anexo é sobre "${it.name}" → "${line.slice(0, 60)}"`, subj.test(line) || (i0 >= 0 && subj.test(lines.slice(i0, i0 + 3).join(' ')))); }
    } else if ((m = /^(Art|Cl)\. (\d+(?:-A)?)$/.exec(art))) {
      check(`${lbl}: prefixo certo (${crew === 'pilot' ? 'Art.' : 'Cl.'})`, m[1] === (crew === 'pilot' ? 'Art' : 'Cl'));
      const re = crew === 'pilot' ? new RegExp(`^\\s*Artigo ${m[2].replace('-A', '\\.º-A').replace(/^(\d+)$/, '$1\\.º')}\\s*$`) : new RegExp(`^\\s*Cláusula ${m[2]}\\.ª\\s*$`);
      const t = titleOf(lines, re);
      check(`${lbl}: existe no texto oficial`, t != null);
      if (t != null && subj) check(`${lbl}: o título é sobre "${it.name}" → "${t}"`, subj.test(t));
    } else {
      check(`${lbl}: formato de citação reconhecido`, false);
    }
  }
};
run(AE_PILOT, 'pilot');
run(AE_CABIN, 'cabin');

// A Prova (data/prova.js): a folha que abre a lei de cada número — mesmo prefixo, e o artigo/cláusula existe.
const { provaFor } = require(path.resolve('data/prova.js'));
for (const [crew, isPilot] of [['pilot', true], ['cabin', false]]) {
  for (const id of ['perDiem', 'pernoita', 'doenca', 'wfly', 'cash']) {
    const p = provaFor(id, { companySlug: 'easyjet', isPilot });
    if (!p) continue;
    const lbl = `Prova ${crew === 'pilot' ? 'piloto' : 'cabine'} · ${id} (${p.art})`;
    const m = crew === 'pilot' ? /^Art\. (\d+)\.º$/.exec(p.art) : /^Cl\. (\d+)\.ª$/.exec(p.art);
    check(`${lbl}: formato ${crew === 'pilot' ? '"Art. N.º"' : '"Cl. N.ª"'}`, !!m);
    if (m) check(`${lbl}: existe no texto oficial`, TXT[crew].some((l) => new RegExp(crew === 'pilot' ? `^\\s*Artigo ${m[1]}\\.º\\s*$` : `^\\s*Cláusula ${m[1]}\\.ª\\s*$`).test(l)));
  }
}

// Os rótulos dos módulos: a cabine nunca "Art." (numera por Cláusula); os pilotos nunca "Cl.".
const cabSrc = fs.readFileSync(path.resolve('ae/easyjetSnpvac.js'), 'utf8');
const pilSrc = fs.readFileSync(path.resolve('ae/easyjetSpac.js'), 'utf8');
check('rótulos da cabine (ae/easyjetSnpvac.js) sem "(Art. N)"', !/\(Art\. \d+\)/.test(cabSrc));
check('rótulos dos pilotos (ae/easyjetSpac.js) sem "(Cl. N"', !/\(Cl\. \d+/.test(pilSrc));
// Cada rótulo com citação tem tradução (a chave pt do i18n muda COM o rótulo — senão o inglês mostra o português).
const i18nSrc = fs.readFileSync(path.resolve('data/i18n.js'), 'utf8');
for (const src of [cabSrc, pilSrc]) for (const [, s] of src.matchAll(/sub: '([^']*\((?:Cl|Art)\.[^']*)'/g)) check(`rótulo "${s}" tem tradução no i18n`, i18nSrc.includes(`'${s}':`));
for (const [, n] of cabSrc.matchAll(/\(Cl\. (\d+)\.ª\)/g)) check(`rótulo da cabine Cl. ${n}.ª existe`, TXT.cabin.some((l) => new RegExp(`^\\s*Cláusula ${n}\\.ª\\s*$`).test(l)));

console.log(`\ncitações easyJet — ${ok} passou, ${fail} falhou (${ok + fail} asserções)`);
if (fail) { console.log(fails.join('\n')); process.exit(1); }
console.log('✓ Cada citação da Biblioteca e dos rótulos existe no texto oficial (BTE 29/2026 · BTE 8/2024), com o prefixo e o assunto certos.');
