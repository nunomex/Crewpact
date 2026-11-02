/*
 * Guardião do Design System 2.0 (2026-11-02) — `npm run test:design`, corre no `npm test` e no pre-push.
 *
 * Duas espécies de regra:
 *  • DURAS (zero tolerância, já cumpridas): nenhum `fontWeight` · toda a LayoutAnimation respeita os
 *    movimentos reduzidos · todo o ficheiro com Animated.timing/spring/loop lê o reduce-motion.
 *  • ROQUETE (dívida antiga a pagar ecrã a ecrã): por ficheiro, conta os desvios à escala. A contagem
 *    só pode DESCER. Subir num ficheiro, ou um ficheiro novo com desvios, falha o teste.
 *    Ao migrar um ecrã, baixa-se a linha de base com:  node scripts/design.test.js --atualizar
 *    (recusa gravar se algum número tiver subido).
 *
 * As escalas vêm de data/constants.js (SCALE, TYPE_DECORATIVE_MIN) — fonte única, sem números aqui.
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));

const cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs');
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: [cjsPlugin] }).code;
  m._compile(code, filename);
};
const { SCALE, TYPE_DECORATIVE_MIN } = require(path.resolve('data/constants.js'));

const BASE_FILE = path.resolve('scripts/design-baseline.json');
const FILES = ['App.js', ...['screens', 'components'].flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`))];
const SPACE_PROPS = 'padding|paddingHorizontal|paddingVertical|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|marginHorizontal|marginVertical|marginTop|marginBottom|marginLeft|marginRight|gap|rowGap|columnGap';
// O ✕/‹ de navegação só existe dentro do IconButton. Fora dele, um ícone close solto é um "remover"
// inline (chip, limpar pesquisa) — contado na roquete para não voltar a nascer como botão de fecho.
const NAV_ICON = /<Icon\s+name="(close|back)"/g;

function measure(src) {
  const m = { tipoFora: 0, tipoMenor11: 0, espacoFora: 0, raioFora: 0, corSolta: 0, ionicons: 0, iconeNavSolto: 0 };
  for (const x of src.matchAll(/fontSize:\s*([\d.]+)\b/g)) {
    const n = +x[1];
    if (n >= TYPE_DECORATIVE_MIN) continue;
    if (!SCALE.type.includes(n)) m.tipoFora++;
    if (n < 11) m.tipoMenor11++;
  }
  for (const x of src.matchAll(new RegExp(`\\b(?:${SPACE_PROPS}):\\s*(-?[\\d.]+)\\b`, 'g'))) if (!SCALE.space.includes(Math.abs(+x[1]))) m.espacoFora++;
  for (const x of src.matchAll(/borderRadius:\s*([\d.]+)\b/g)) if (!SCALE.radius.includes(+x[1])) m.raioFora++;
  m.corSolta = (src.match(/['"]#[0-9a-fA-F]{3,8}['"]/g) || []).length;
  m.ionicons = (src.match(/@expo\/vector-icons/g) || []).length;
  m.iconeNavSolto = (src.match(NAV_ICON) || []).length;
  return m;
}

const atual = {};
const duras = [];
for (const f of FILES) {
  const src = fs.readFileSync(f, 'utf8');
  if (f !== 'components/IconButton.js') atual[f] = measure(src);
  else atual[f] = { ...measure(src), iconeNavSolto: 0 };
  // ── regras DURAS ──
  if (/fontWeight\s*:/.test(src)) duras.push(`${f}: usa fontWeight (proibido — a FAMÍLIA carrega o peso)`);
  src.split(/\r?\n/).forEach((line, i) => {
    if (/LayoutAnimation\.configureNext/.test(line) && !/reduce/i.test(line)) duras.push(`${f}:${i + 1}: LayoutAnimation sem ramo de movimentos reduzidos`);
  });
  if (/Animated\.(timing|spring|loop|decay)\(/.test(src) && !/reduce/i.test(src)) duras.push(`${f}: anima com Animated mas não lê o reduce-motion (motion §5)`);
  // Componente usado em JSX sem import nem definição: o pacote gera, mas a app rebenta ao abrir o ecrã.
  // (Apanhou 2 casos reais na migração de 2026-11-02 — SheetHeader nos cartões de partilha.)
  const importBlocks = [...src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]/g)].map((x) => x[1]).join(' ');
  for (const tag of new Set([...src.matchAll(/<([A-Z]\w*)[\s/>.]/g)].map((x) => x[1]))) {
    const ok = new RegExp('\\b' + tag + '\\b').test(importBlocks) || new RegExp('(function|const|let|class)\\s+' + tag + '\\b').test(src);
    if (!ok) duras.push(`${f}: usa <${tag}> sem import nem definição`);
  }
}
for (const k of Object.keys(atual)) if (Object.values(atual[k]).every((v) => v === 0)) delete atual[k];

const base = fs.existsSync(BASE_FILE) ? JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')) : null;
const subidas = [], descidas = [];
if (base) {
  for (const [f, m] of Object.entries(atual)) for (const [k, v] of Object.entries(m)) {
    const b = (base.ficheiros[f] || {})[k] || 0;
    if (v > b) subidas.push(`${f}: ${k} ${b} → ${v}`);
    else if (v < b) descidas.push(`${f}: ${k} ${b} → ${v}`);
  }
  for (const [f, m] of Object.entries(base.ficheiros)) for (const [k, b] of Object.entries(m)) {
    if (!atual[f] && b > 0) descidas.push(`${f}: ${k} ${b} → 0`);
  }
}

const total = (o) => Object.values(o).reduce((a, m) => { for (const [k, v] of Object.entries(m)) a[k] = (a[k] || 0) + v; return a; }, {});
const T = total(atual);

if (process.argv.includes('--atualizar')) {
  if (duras.length || subidas.length) { console.log('✗ Recusado: há regras duras partidas ou números que subiram.'); [...duras, ...subidas].forEach((x) => console.log('  ' + x)); process.exit(1); }
  fs.writeFileSync(BASE_FILE, JSON.stringify({ gerado: new Date().toISOString().slice(0, 10), total: T, ficheiros: atual }, null, 1) + '\n');
  console.log(`✓ Linha de base gravada (${Object.keys(atual).length} ficheiros com dívida).`);
  process.exit(0);
}

console.log('Design System — dívida atual (só pode descer):');
for (const [k, v] of Object.entries(T)) console.log(`  ${k.padEnd(14)} ${String(v).padStart(4)}${base ? `  (base ${base.total[k] || 0})` : ''}`);
if (descidas.length) console.log(`  ↓ ${descidas.length} descida(s) — corre 'node scripts/design.test.js --atualizar' para fixar o novo chão.`);
if (!base) { console.log('✗ Sem linha de base. Corre: node scripts/design.test.js --atualizar'); process.exit(1); }
if (duras.length || subidas.length) {
  console.log(`✗ design: ${duras.length} regra(s) dura(s) partida(s), ${subidas.length} subida(s) na roquete`);
  [...duras, ...subidas].forEach((x) => console.log('  ' + x));
  process.exit(1);
}
console.log('✓ design: regras duras cumpridas · nenhuma dívida nova (escala em data/constants.js · SCALE)');
