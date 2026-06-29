/*
 * Portão de VIGÊNCIA (Constituição §9) — fica VERMELHO quando uma fonte (AE) passa o seu
 * `válido_até` sem estar RECONHECIDA. Usa a data REAL de hoje (não um fixture): é uma
 * verificação de FRESCURA, não um golden. Teria apanhado o AE easyJet caducado há meses.
 * Inventa ZERO valores — só governa se as fontes que a app usa ainda estão em vigor.
 * Cobre AE (expiram → podem BLOQUEAR) e fontes FTL (lei: não expiram → reverificação, só AVISO).
 *
 * Estados:
 *   ✓ em vigor             — válido_até no futuro
 *   ⚠ a expirar (< 60 d)   — avisa, mas passa (preparar atualização)
 *   ✓ expirado-reconhecido — expirou MAS tem AE_EXPIRY_ACK.acknowledged (mostra referência)
 *   ✗ EXPIRADO             — expirou e NÃO reconhecido  → FALHA (build vermelho)
 *   ✗ sem vigência         — módulo AE sem AE_VALID_UNTIL → FALHA (proveniência em falta, §5)
 *
 * Executar:  node scripts/vigencia.test.js   (ou: npm run test:vigencia)
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));

let cjsPlugin;
try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); }
catch { cjsPlugin = null; }
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

// Módulos AE modelados (o REGISTRY em ae/index.js é a fonte de verdade do "modelado").
const MODULES = [
  { id: 'easyJet · SPAC (pilotos)',  mod: require(path.resolve('ae/easyjetSpac.js')) },
  { id: 'easyJet · SNPVAC (cabine)', mod: require(path.resolve('ae/easyjetSnpvac.js')) },
  { id: 'TAP · SPAC (pilotos)',      mod: require(path.resolve('ae/tapSpac.js')) },
  { id: 'TAP · SNPVAC (cabine)',     mod: require(path.resolve('ae/tapSnpvac.js')) },
];

const now = new Date();
const DAY = 86400000;
const WARN_DAYS = 60;
const STALE_MONTHS = 6;   // reconhecimento de expiração não re-verificado há > isto → avisa
let failures = 0;
const lines = [];

for (const { id, mod } of MODULES) {
  const until = mod.AE_VALID_UNTIL;
  if (!until) {
    failures++;
    lines.push(`  ✗ ${id} — SEM vigência declarada (falta AE_VALID_UNTIL) — proveniência em falta (§5).`);
    continue;
  }
  const end = +new Date(`${until}T23:59:59`);
  const expired = mod.isAgreementExpired ? mod.isAgreementExpired(now) : (+now > end);
  const ack = !!(mod.AE_EXPIRY_ACK && mod.AE_EXPIRY_ACK.acknowledged);
  const days = Math.round((end - +now) / DAY);
  if (expired && !ack) {
    failures++;
    lines.push(`  ✗ ${id} — EXPIRADO em ${until} (há ${Math.abs(days)} d) e NÃO reconhecido → atualizar tabelas/datas OU declarar AE_EXPIRY_ACK.`);
  } else if (expired && ack) {
    const checked = mod.AE_EXPIRY_ACK.checked;
    const staleM = checked ? Math.round((+now - +new Date(`${checked}T00:00:00`)) / DAY / 30) : null;
    if (staleM == null) {
      lines.push(`  ⚠ ${id} — expirado-reconhecido (${until}) mas SEM data de verificação (checked) → re-verificar se há novo BTE.`);
    } else if (staleM >= STALE_MONTHS) {
      lines.push(`  ⚠ ${id} — expirado-reconhecido (${until}) — última verificação há ${staleM} m (> ${STALE_MONTHS}) → re-verificar se já saiu novo BTE.`);
    } else {
      lines.push(`  ✓ ${id} — expirado-reconhecido (${until} · ${mod.AE_EXPIRY_ACK.status}; verificado há ${staleM} m) → valores de referência.`);
    }
  } else if (days <= WARN_DAYS) {
    lines.push(`  ⚠ ${id} — expira em ${days} d (${until}) — preparar atualização.`);
  } else {
    lines.push(`  ✓ ${id} — em vigor até ${until} (${days} d).`);
  }
}

// ── Fontes FTL (lei) — NÃO expiram; governa-se a REVERIFICAÇÃO (lastVerified) e as questões
//    abertas (needsReview). Avisos NÃO bloqueiam (só os AE caducados sem reconhecimento bloqueiam). ──
const { FTL_SOURCES } = require(path.resolve('ftl/sources.js'));
const ftlLines = [];
let ftlWarns = 0;
for (const s of FTL_SOURCES) {
  const lv = s.lastVerified ? Math.round((+now - +new Date(`${s.lastVerified}T00:00:00`)) / DAY / 30) : null;
  if (s.needsReview) {
    ftlWarns++;
    ftlLines.push(`  ⚠ ${s.name} (${s.currentVersion}) — POR CONFIRMAR: ${s.reviewNote || 'rever contra o motor'}`);
  } else if (lv == null) {
    ftlWarns++;
    ftlLines.push(`  ⚠ ${s.name} — sem data de reverificação → verificar contra ${s.ref}.`);
  } else if (lv >= STALE_MONTHS) {
    ftlWarns++;
    ftlLines.push(`  ⚠ ${s.name} — reverificado há ${lv} m (> ${STALE_MONTHS}) → reverificar contra ${s.ref}.`);
  } else {
    ftlLines.push(`  ✓ ${s.name} (${s.currentVersion}) — reverificado há ${lv} m.`);
  }
}

console.log(`\nVigência das fontes AE — hoje ${now.toISOString().slice(0, 10)}:`);
console.log(lines.join('\n'));
console.log(`\nFontes FTL (lei — não expiram; governa-se a reverificação):`);
console.log(ftlLines.join('\n'));
if (failures) {
  console.log(`\n✗ test:vigencia — ${failures} fonte(s) AE caducada(s) sem reconhecimento. BUILD VERMELHO.\n`);
  process.exit(1);
}
console.log(`\n✓ test:vigencia — fontes AE em vigor/reconhecidas${ftlWarns ? ` · ${ftlWarns} aviso(s) FTL por rever (não bloqueiam)` : ''}.\n`);
