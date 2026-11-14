/*
 * Golden das NOTIFICAÇÕES (data/notifications.js) — PURO, sem rede nem React.
 * A janela C1 (design/janelas-c.html, 2026-11-13) pinta o quadradinho de cada notificação pelo mapa das cores B (design-system §14):
 *   level 'alert' (laranja "!", olhar) · 'stop' (vermelho "✕", parar) · null (neutro, informação).
 * Regras trancadas: a escala mudou = olhar · um documento caducado = parar, a caducar = informação (a data está no texto; não
 * impede ninguém de voar hoje) · um limite FTL ultrapassado = parar, a aproximar-se = olhar · o mês fechado e o acordo = informação.
 * O nível vem dos DADOS (nunca de procurar palavras no texto, que muda com a língua).
 * Executar:  node scripts/notifications.test.js   (ou: npm run test:notifications)
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
const cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs');
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (filename.includes('node_modules')) return origJs(m, filename);
  m._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: [cjsPlugin] }).code, filename);
};
const { buildNotifications } = require(path.resolve('data/notifications.js'));

let ok = 0, fail = 0;
const eq = (label, got, exp) => {
  const g = JSON.stringify(got), e = JSON.stringify(exp);
  if (g === e) ok++; else { fail++; console.log(`✗ ${label}\n    tem:    ${g}\n    devia:  ${e}`); }
};
const isoIn = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const levelOf = (list, prefix) => { const n = list.find((x) => x.id.startsWith(prefix)); return n ? n.level : 'em falta'; };

// ── a escala mudou → olhar ──
const rc = { counts: { total: 2, changed: 1, added: 1 }, changed: [{ date: '2026-11-14', before: { route: 'LIS-OPO' }, after: { route: 'LIS-LGW' } }], added: [{ date: '2026-11-18', after: { route: 'LIS-OPO-LIS', sectors: 2 } }] };
for (const lang of ['pt', 'en']) {
  const L = buildNotifications({}, lang, { rosterChanges: rc });
  eq(`${lang}: a escala mudou = olhar`, levelOf(L, 'roster:'), 'alert');
  eq(`${lang}: os dias da escala vêm por ordem`, L[0].days.map((d) => [d.date, d.status]), [['2026-11-14', 'changed'], ['2026-11-18', 'added']]);
}

// ── validades: caducado → parar; a caducar → informação; tudo válido → nada ──
for (const lang of ['pt', 'en']) {
  eq(`${lang}: documento caducado = parar`, levelOf(buildNotifications({}, lang, { validities: [{ type: 'medical', expiry: isoIn(-3) }] }), 'docs:'), 'stop');
  eq(`${lang}: documento a caducar = informação`, levelOf(buildNotifications({}, lang, { validities: [{ type: 'medical', expiry: isoIn(6) }] }), 'docs:'), null);
  eq(`${lang}: um caducado e um a caducar = parar (o pior)`, levelOf(buildNotifications({}, lang, { validities: [{ type: 'medical', expiry: isoIn(6) }, { type: 'sep', expiry: isoIn(-1) }] }), 'docs:'), 'stop');
  eq(`${lang}: tudo válido = sem notificação`, buildNotifications({}, lang, { validities: [{ type: 'medical', expiry: isoIn(200) }] }).length, 0);
}

// ── o mês fechado e o acordo atualizado → informação ──
eq('mês fechado = informação', levelOf(buildNotifications({}, 'pt', { monthSummary: { ym: '2026-10', label: 'Outubro 2026', flightHm: '62:10', totalEur: '1234,56 €' } }), 'month:'), null);
eq('acordo atualizado = informação', levelOf(buildNotifications({}, 'pt', { aeInfo: { aeId: 'ezy-spac', lastFrom: isoIn(-10) } }), 'ae:'), null);

// ── sem nada → lista vazia (a janela diz "Não há notificações.") ──
eq('sem dados = lista vazia', buildNotifications({}, 'pt', {}).length, 0);

console.log(`${fail ? '✗' : '✓'} notificações: ${ok} certos${fail ? `, ${fail} errados` : ''}`);
process.exit(fail ? 1 : 0);
