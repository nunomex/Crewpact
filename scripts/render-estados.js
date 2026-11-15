/*
 * Todos os estados da Living Interface, desenhados A PARTIR DO CÓDIGO (2026-11-14, pedido do Nuno: "mostra os esboços de todos os
 * estados, para ver como ficou tudo"). Cada estado passa pelo homeCards() (data/homeCards.js) com os dados de TESTE do golden
 * (scripts/homecards.test.js · S) — o que se vê é o que a app decide, desenhado em HTML com as cores do CARD.day e as medidas do
 * HomeTop/BigCard/Slim (components/HomeCards.js). Não é o iPhone: a letra e o desenho são aproximados; o golden é que manda.
 * Executar:  node scripts/render-estados.js   →  design/estados-todos.html
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');
const babel = require(path.resolve('node_modules/@babel/core'));
let cjsPlugin; try { cjsPlugin = require.resolve('@babel/plugin-transform-modules-commonjs'); } catch { cjsPlugin = null; }
const transform = (src, filename) => babel.transformSync(src, { filename, babelrc: false, configFile: false, presets: cjsPlugin ? [] : [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]], plugins: cjsPlugin ? [cjsPlugin] : [] }).code;
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) { if (filename.includes('node_modules')) return origJs(m, filename); m._compile(transform(fs.readFileSync(filename, 'utf8'), filename), filename); };

const { homeCards } = require(path.resolve('data/homeCards.js'));
const { CARD } = require(path.resolve('data/constants.js'));
// os dados de teste do golden (correr o ficheiro imprime os testes — cala-se durante o require)
const log = console.log; console.log = () => {};
const { S } = require(path.resolve('scripts/homecards.test.js'));
console.log = log;
const C = CARD.day;

// ── os estados, pela ordem do dia; o tempo como no iPhone (o golden só o tem na pernoita) ──
const WXL = { c: 4, label: 'nevoeiro', ic: 'fog', at: '05:15', st: 'LIS' };
const WXA = { c: 12, label: 'chuva', ic: 'rain', st: 'LGW' };
const OVER_W = { id: 'ftl', first: true, tone: 'stop', kind: 'O limite de hoje', title: 'Acima do limite · 45 min a mais', sub: 'PSV 12 h 30 de 11 h 45 · confirma com a companhia', open: { to: 'item', id: 'legal' } };
const STATES = [
  ['Bem-vindo', 'sem calendário ligado', S.setup, '09:00'],
  ['Folga, sem serviços', 'a escala está vazia', S.vazia, '12:40'],
  ['Folga', 'tudo em dia: a voz, os três sinais, o próximo serviço, as férias (F2)', { ...S.folga, voice: { bold: 'Folga a sério.', tail: 'Nada pendente, nada a vigiar.' }, watch: { roster: { seen: '11:52' }, docs: true, month: true } }, '12:00'],
  ['Folga, a escala mudou', 'as alterações com o quê e quando (E2)', { ...S.folga, warns: [{ id: 'roster', title: 'A escala mudou', sub: '3 alterações por rever', open: { to: 'review' } }, ...S.folga.warns], changes: { seen: '11:52', items: [
    { iso: '2026-11-13', type: 'changed', kind: 'flight', route: 'LIS-FNC-LIS', report: '06:45', end: '12:25', fields: [{ key: 'report_time', label: { pt: 'Report', en: 'Report' }, before: '05:30', after: '06:45' }, { key: 'block_on', label: { pt: 'On-block', en: 'On-block' }, before: '11:10', after: '12:25' }] },
    { iso: '2026-11-15', type: 'added', kind: 'flight', route: 'LIS-LGW-LIS', report: '07:00', end: null, fields: [] },
    { iso: '2026-11-17', type: 'removed', kind: 'standby_home', kindLabel: 'Standby em casa', route: null, report: '08:00', end: '14:00', fields: [] }] } }, '12:00'],
  ['Folga, com o voo amanhã', 'o tempo do report de amanhã', { ...S.folgaHoras, wx: { report: { ...WXL, at: '05:30' } } }, '11:00'],
  ['Atenção', 'um documento a caducar (≤ 7 dias)', S.documento, '10:00'],
  ['Voo amanhã', 'a véspera, depois das 18:00', { ...S.vespera, wx: { report: WXL, night: { ...WXA } } }, '21:40'],
  ['Dia de voo', 'antes do report', { ...S.antes, wx: { report: WXL } }, '03:35'],
  ['Dia de voo, tudo a horas', 'a verificação (W1): o voo, o avião, o aeroporto', { ...S.antes, wx: { report: WXL }, calm: { seen: '03:33', flight: true, plane: { here: true, st: 'LIS' }, airport: true } }, '03:35'],
  ['Dia de voo, limite incerto', 'falta um dado para a lei decidir', S.incerto, '03:35'],
  ['Dia de voo, acima do limite', 'o aviso vermelho do ecrã', { ...S.antes, hero: { ...S.antes.hero, legal: { status: 'bad' } }, warns: [OVER_W] }, '03:35'],
  ['Atraso', 'disrupção: o avião ainda vem a caminho', S.disrupcao, '05:40'],
  ['Em serviço', 'depois do report, ainda em terra', { ...S.emVoo, phase: 'duty', wx: { arrival: { ...WXA, st: 'FNC', c: 19, label: 'sol', ic: 'sun' } }, live: { ...S.emVoo.live, legIdx: 0, legDep: 'LIS', legArr: 'FNC', depHm: '06:15', minsToDep: 25 } }, '05:50'],
  ['Em voo', 'no ar', { ...S.emVoo, wx: { arrival: WXA } }, '12:45'],
  ['Aterrado', 'o dia continua', { ...S.emVoo, phase: 'landed', hero: { ...S.emVoo.hero, psv: { ...S.emVoo.hero.psv, running: '08:35' } } }, '13:55'],
  ['Standby', 'a janela de assistência', S.standby, '08:50'],
  ['Formação', 'um dia em terra', S.formacao, '08:10'],
  ['Pernoita', 'fora da base', S.pernoita, '21:40'],
  ['Dia fechado', 'o dia acabou na base', { ...S.posvoo, wx: { report: { ...WXL, at: '05:30' } } }, '19:20'],
  ['Fecho do mês', 'os últimos 3 dias', S.fecho, '10:00'],
  ['Folga, o mês incerto', 'falta um dado do perfil (o dia de entrada)', S.mesIncerto, '10:00'],
  ['Férias', 'com a voz (V2)', { ...S.ferias, voice: { bold: 'Férias a sério.', tail: 'A escala não manda — desfruta.' } }, '11:00'],
  ['Baixa', '', S.baixa, '10:00'],
];

// ── desenho ──
const esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SVG = {
  sun: '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-1-6h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM3.5 5l1.4-1.4 2.2 2.1-1.4 1.4zm13.4 13.4 1.4-1.4 2.1 2.2-1.4 1.4zM3.5 19l2.2-2.1 1.4 1.4L4.9 20.4zM16.9 5.6l2.1-2.1 1.4 1.4-2.1 2.2z"/>',
  'cloud-sun': '<path d="M7 4h2v2H7zM2 9h2v2H2zm1.6-4 1.4-1.4 1.4 1.4L5 6.4zM8 7a4 4 0 0 1 3.7 2.4A5 5 0 0 1 19 13a4 4 0 0 1-1 7.9H7a4.5 4.5 0 0 1-2.4-8.3A4 4 0 0 1 8 7z"/>',
  cloud: '<path d="M7 19a5 5 0 0 1-.6-10A6 6 0 0 1 18 11a4 4 0 0 1-.5 8z"/>',
  rain: '<path d="M7 15a5 5 0 0 1-.6-10A6 6 0 0 1 18 7a4 4 0 0 1-.5 8H7zm1 2 1.6 1-1.4 3-1.6-1zm4.5 0 1.6 1-1.4 3-1.6-1zm4.5 0 1.6 1-1.4 3-1.6-1z"/>',
  fog: '<path d="M3 8h14v1.8H3zm4 4h14v1.8H7zm-4 4h14v1.8H3z"/>',
  snow: '<path d="M11 2h2v20h-2zM3.3 6.5l1-1.7 16.4 9.5-1 1.7zm0 11 16.4-9.5 1 1.7-16.4 9.5z"/>',
  thunder: '<path d="M13 2 4 14h6l-2 8 10-13h-6z"/>',
  moon: '<path d="M14.5 2.5a9.5 9.5 0 1 0 7 15.9A8 8 0 0 1 14.5 2.5z"/>',
  plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.7 15.4 6.8l1 1.7-6.8 3.9zm0 2.6 1-1.7 6.8 3.9-1 1.7z"/>',
  bell: '<path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/>',
  edit: '<path d="M3 17.3V21h3.7L17.8 9.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/>' };
const ic = (n, s) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24">${SVG[n] || SVG.cloud}</svg>`;
const NEUTRAL = (color) => !color || color === 'neutral' || !CARD.day[color] || ['desk', 'sheet', 'ink', 'soft'].includes(color);
const bgOf = (P, color) => (color === 'dark' ? P.ink : (!NEUTRAL(color) ? P[color] : P.neutral));
const vars = (P) => `--desk:${P.desk};--ink:${P.ink};--soft:${P.soft};--sheet:${P.sheet};--neutral:${P.neutral};--grey:${P.grey};--sub:${P.neutralSub};--kind:${P.neutralKind};--caption:${P.caption};--gain:${P.gainOut};--flight:${P.flight}`;

// `why` (Q3): os números com porquê levam o sublinhado pontilhado, como na app
function topHTML(t, why = null) {
  if (!t) return '';
  const g = t.giant || {};
  const p2 = t.pill2 ? `<span class="pl sm">${esc(t.pill2.text)}${t.pill2.iso ? ' ›' : ''}</span>` : '';
  const facts = (t.facts || []).map((f, i) => `<div><span class="fv${f.tone === 'gain' ? ' gain' : ''}${f.tone === 'was' ? ' was' : ''}${why && why.facts && why.facts[i] ? ' und' : ''}">${f.ic ? ic(f.ic, 18) : ''}${esc(f.v)}</span><span class="fl">${esc(f.l)}</span></div>`).join('');
  return `<div class="topA">
    <div class="ttlRow"><span class="t">${esc(t.pill ? t.pill.text : '')}${t.pill && t.pill.live ? '<i class="dot"></i>' : ''}</span><span class="pl ml">Notificações</span></div>
    ${p2 ? `<div class="what inl"><span>${esc(t.what)}</span>${p2}</div>` : `<div class="what">${esc(t.what)}</div>`}
    <div class="hero"><div class="g"><div class="l1"><span class="big${why && why.giant ? ' und' : ''}">${esc(g.l1)}</span>${g.unit ? `<small>${esc(g.unit)}</small>` : ''}${g.unit && g.l1b ? `<span class="big b2${why && why.giant ? ' und' : ''}">${esc(g.l1b)}</span>` : ''}</div>
      ${g.l2 ? `<div class="l2${g.l2Grey ? ' grey' : ''}"><span class="big">${esc(g.l2)}</span>${g.zulu ? `<span class="z">${esc(g.zulu)}</span>` : ''}</div>` : ''}</div>
      ${facts ? `<div class="side">${facts}</div>` : ''}</div></div>`;
}
function lineHTML(line) {
  const pts = line.pts || []; const n = pts.length;
  const pos = n === 4 ? [0, 30, 70, 100] : n === 3 ? [0, 50, 100] : pts.map((_, i) => (n > 1 ? (100 * i) / (n - 1) : 0));
  const mids = pts.map((x, i) => (!x.end ? i : -1)).filter((i) => i >= 0);
  const a = mids.length ? pos[mids[0]] : (line.stops ? 30 : null), b = mids.length ? pos[mids[mids.length - 1]] : (line.stops ? 70 : null);
  const st = line.stops; const k = st ? st.length - 1 : 1; const at = (i) => a + ((b - a) * i) / k;
  const segs = a == null || b == null || b <= a ? [] : (st ? Array.from({ length: k }, (_, i) => [at(i), at(i + 1), i > 0, i < k - 1]) : [[a, b, false, false]]);
  return `<div class="dl">${st ? `<div class="dlc">${st.map((c, i) => `<span style="left:${at(i)}%">${esc(c)}</span>`).join('')}</div>` : ''}
    <div class="dlp"><span class="dlt"></span>${segs.map(([x0, x1, gl, gr]) => `<span class="dls" style="left:calc(${x0}% + ${gl ? 4 : 0}px);right:calc(${100 - x1}% + ${gr ? 4 : 0}px)"></span>`).join('')}
    ${pts.map((x, i) => { const place = i === 0 ? 'left:0;align-items:flex-start' : i === n - 1 ? 'right:0;align-items:flex-end;text-align:right' : `left:${pos[i]}%;transform:translateX(-50%);align-items:center;text-align:center`;
      return `<div class="dpt" style="${place}"><span class="dot2${x.end ? ' o' : ''}"></span><b>${esc(x.v)}</b><span>${esc(x.l)}</span></div>`; }).join('')}</div></div>`;
}
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const relLum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function legible(fg, bg, ink) {
  const F = hexRgb(fg), B = hexRgb(bg), I = hexRgb(ink);
  for (let t = 0; t <= 1.0001; t += 0.05) { const m = F.map((v, i) => Math.round(v + (I[i] - v) * t)); if (contrast(m, B) >= 4.5) return `rgb(${m.join(',')})`; }
  return ink;
}
function cardHTML(c, P = C, look = {}) {
  const TYPE = ['flight', 'ground', 'rest'];
  const typeCol = !NEUTRAL(c.color) && TYPE.includes(c.color);
  const toNeutral = (look.accent && typeCol) || c._neutralize;
  const B = toNeutral ? P.neutral : bgOf(P, c.color);
  // a linha ESCURA (a ação principal: ligar o calendário, ler a escala) — a letra da folha sobre a tinta, como `toneOf` 'dark' na app
  const dk = c.color === 'dark' ? ' dk' : '';
  const neu = !dk && (NEUTRAL(c.color) || toNeutral) ? ' neu' : '';
  const lt = !toNeutral && (look.light || []).includes(c.color) ? ' lt' : '';
  const accentStyle = toNeutral ? `;border-left:6px solid ${P[c.color]}` : '';
  // o quadradinho da cor (O2, como a app: `swatch` vem de data/homeCards.js); `_neutralize` fica para os esboços antigos
  const sq = c.swatch && P[c.swatch] ? `<span class="sqc" style="background:${P[c.swatch]}"></span>`
    : c._neutralize && !look.accent ? `<span class="sqc" style="background:${P[c.color]}"></span>` : '';
  // o rótulo na cor do tipo, sobre o neutro: a cor do cartão como letra não chega a 4,5:1 (o azul dá ~1,9) — mistura-se com a tinta até chegar
  const kdStyle = toNeutral ? ` style="color:${legible(P[c.color], P.neutral, P.ink)}"` : '';
  if (c.t === 'slim') {
    return `<div class="slim${c.dashed ? ' dashed' : ''}${neu}${dk}${lt}" style="background:${B}${accentStyle}">${sq}${c.mark ? `<span class="mark">${esc(c.mark)}</span>` : ''}<div class="st">${c.kind ? `<span class="k"${kdStyle}>${esc(c.kind)}</span>` : ''}<b>${esc(c.title)}</b>${c.sub ? `<span>${esc(c.sub)}</span>` : ''}</div>
      ${c.value ? (c.gain ? `<span class="chip">${esc(c.value)}</span>` : c.valueLbl ? `<span class="svl"><b>${esc(c.value)}</b><span>${esc(c.valueLbl)}</span></span>` : `<span class="sv">${esc(c.value)}</span>`) : c.open ? '<span class="goS">›</span>' : ''}</div>`;
  }
  if (c.t === 'lines') {
    return `<div class="cd${neu}" style="background:${B}"><span class="kd">${esc(c.kind)}</span>${(c.rows || []).map((r) => `<div class="lr"><span>${esc(r.k)}</span><b>${esc(r.v)}</b></div>`).join('')}
      ${c.foot ? `<div class="lfoot">${c.foot.map((r) => `<div class="lr"><span>${esc(r.k)}</span><b>${esc(r.v)}</b></div>`).join('')}</div>` : ''}
      ${c.note || c.link ? `<div class="cs">${esc(c.note || '')} ${c.link ? `<u>${esc(c.link.label)}</u>` : ''}</div>` : ''}</div>`;
  }
  // E2 · as alterações da escala: o cartão âmbar com as linhas (o dia, o antes riscado e o novo) e a barra "Rever e aceitar"
  if (c.t === 'changes') return `<div class="rc" style="background:${P.alert}"><div class="rcH"><span class="mark">${esc(c.mark || '!')}</span><div class="rcT"><span class="k">${esc(c.kind)}</span><b>${esc(c.title)}</b></div>${c.seen ? `<span class="rcS">${esc(c.seen)}</span>` : ''}</div>`
    + `<div class="rcL">${(c.rows || []).map((r) => `<div class="rr"><div class="rd"><b>${esc(r.day)}</b><span>${esc(r.wd)}</span></div><div class="rx"><b>${esc(r.k)}${r.old ? ` <s>${esc(r.old)}</s>` : ''}${r.v ? ` ${esc(r.v)}` : ''}</b>${r.sub ? `<span>${r.struck ? `<s>${esc(r.sub)}</s>` : esc(r.sub)}</span>` : ''}</div></div>`).join('')}${c.more ? `<div class="rmore">e mais ${c.more}</div>` : ''}</div>`
    + `${c.action ? `<div class="rcA"><b>${esc(c.action.label)}</b><span>${esc(c.action.note || '')}</span></div>` : ''}</div>`;
  // V2 · a voz: a frase na folha, sem caixa
  if (c.t === 'voice') return `<div class="v2"><b>${esc(c.bold)}</b><span>${esc(c.tail || '')}${c.open ? ' ›' : ''}</span></div>`;
  // W1 · a verificação: três sinais com o anel (o movimento só no esboço design/calma-uau.html; aqui o estado final)
  if (c.t === 'checks') return `<div class="ck${c.plain ? ' plain' : ''}" style="background:${c.plain ? 'transparent' : P.neutral}">${c.title || c.seen ? `<div class="ckH"><b>${esc(c.title || '')}</b>${c.seen ? `<span>${esc(c.seen)}</span>` : ''}</div>` : ''}<div class="ckR">${(c.items || []).map((x) => `<div class="ci"><svg class="rg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="${x.ok === true ? 'var(--ink)' : 'var(--kind)'}" stroke-width="2.2"${x.ok === true ? '' : ' stroke-dasharray="2.5 3.2"'}/>${x.ok === true ? '<path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="var(--ink)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>' : ''}</svg><b>${esc(x.k)}</b><span>${esc(x.v)}</span></div>`).join('')}</div></div>`;
  if (c.t === 'hdr') return `<div class="hdr${c.near ? ' near' : ''}">${esc(c.text)}</div>`;   // só nos esboços: um cabeçalho de secção entre cartões
  if (c.t === 'text') return `<div class="cd${neu}" style="background:${B}"><span class="kd">${esc(c.kind)}</span><div class="tx">${esc(c.text)}</div></div>`;
  // o cartão grande
  const corner = c.corner === 'share' ? `<span class="go">${ic('share', 16)}</span>` : (c.open ? '<span class="go">›</span>' : '');
  let body = '';
  if (c.line) {
    body += c.sub ? `<span class="cs">${esc(c.sub)}</span>` : '';
    body += (c.flightNo || c.gain) ? `<div class="badges">${c.flightNo ? `<span class="badge">${ic('plane', 12)}${esc(c.flightNo)}</span>` : '<span></span>'}${c.gain ? `<span class="pd">${esc(c.gainLbl || '')} <span class="chip">${esc(c.gain)}</span></span>` : ''}</div>` : '';
    body += lineHTML(c.line);
    body += c.quiet ? `<div class="quiet2"><div class="qr"><b>${look.statusGreen ? '<i class="gdot"></i>' : ''}${esc(c.quiet.l)}</b><span>${esc(c.quiet.r.k)} <b class="qv">${esc(c.quiet.r.v)}</b></span></div><span>${esc(c.quiet.sub)}</span></div>` : '';
  } else {
    body += (c.sub || c.gain) ? `<div class="subrow"><span class="cs">${look.statusGreen && /^a horas/.test(c.sub || '') ? `<span class="gbadge">A horas</span>${esc((c.sub || '').replace(/^a horas/, ''))}` : esc(c.sub || '')}</span>${c.gain ? `<span class="chip">${esc(c.gain)}</span>` : ''}</div>` : '';
    body += (c.a || c.dur || c.b) ? `<div class="ab"><div>${c.a ? `<b>${esc(c.a.v)}</b><span>${esc(c.a.l)}</span>` : ''}</div>${c.dur ? `<span class="dur">${esc(c.dur)}</span>` : ''}<div style="text-align:right">${c.b ? (c.b.gain ? `<span class="chip">${esc(c.b.v)}</span>` : `<b>${esc(c.b.v)}</b>`) + `<span>${esc(c.b.l)}</span>` : ''}</div></div>` : '';
    body += c.pct != null ? `<div class="prog"><i style="width:${c.pct}%"></i><s style="left:${c.pct}%"></s></div>` : '';
  }
  return `<div class="cd${neu}${lt}" style="background:${B}${accentStyle}">${corner}<span class="kd"${kdStyle}>${sq}${esc(c.kind)}</span><span class="ct">${esc(c.title)}</span>${c.cities ? `<span class="cities">${esc(c.cities)}</span>` : ''}${body}
    ${c.action ? `<div class="act">${ic(c.action.icon || 'bell', 16)}${esc(c.action.label)}</div>` : ''}</div>`;
}
// Um telemóvel a partir da SAÍDA do homeCards (os esboços podem mexer num cartão e desenhar o resto como a app).
// `night`: a paleta noturna (CARD.night). Sem dizer, como a app: noturna na véspera e na pernoita.
function phoneOut(name, note, out, clock, { night, look = {} } = {}) {
  const nt = night != null ? night : ['vespera', 'pernoita'].includes(out.state);
  const P = { ...(nt ? CARD.night : CARD.day), ...(look.palette || {}) };
  // budget 'principal': só o 1.º cartão grande de tipo fica cheio; os outros de tipo passam a neutros com o quadradinho da cor
  let firstDone = false;
  const list = (out.cards || []).map((c) => { const typed = ['flight', 'ground', 'rest'].includes(c.color);
    if (look.budget === 'principal' && typed) { if (!firstDone && c.t === 'card') { firstDone = true; return c; } return { ...c, _neutralize: true }; }
    return c; });
  const cards = list.map((c) => cardHTML(c, P, look)).join('');
  return `<div class="cell"><div class="cap"><b>${esc(name)}</b>${note ? ` · ${esc(note)}` : ''}${nt ? ' · <i>tema da noite</i>' : ''}</div>
    <div class="ph${nt ? ' night' : ''}${look.ring || P.liveRing ? ' ring' : ''}${look.moneyInk ? ' minky' : ''}" style="${vars(P)}"><div class="status"><span>${esc(clock)}</span><span style="font-size:12px;letter-spacing:1px">●●●● 5G ▮</span></div>${topHTML(out.top, out.why)}
      <div class="sheetN">${cards}${out.credit ? `<div class="credit">${esc(out.credit)}</div>` : ''}</div>
      <div class="fold"><span>fim do ecrã do iPhone (por cima da barra de abas) — o resto desliza</span></div></div></div>`;
}
const phone = (name, note, h, clock, opts) => phoneOut(name, note, homeCards(h), clock, opts);
const pickPalette = (night) => (night ? CARD.night : CARD.day);

const css = `
@font-face{font-family:'Hanken';font-weight:500;src:url('../node_modules/@expo-google-fonts/hanken-grotesk/500Medium/HankenGrotesk_500Medium.ttf')}
@font-face{font-family:'Hanken';font-weight:700;src:url('../node_modules/@expo-google-fonts/hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf')}
@font-face{font-family:'Hanken';font-weight:800;src:url('../node_modules/@expo-google-fonts/hanken-grotesk/800ExtraBold/HankenGrotesk_800ExtraBold.ttf')}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#E8E7E2;color:#141414;font-family:'Hanken','Helvetica Neue',Arial,sans-serif;padding:32px 16px 64px}
.page{max-width:1760px;margin:0 auto;display:flex;flex-direction:column;gap:24px}
.lead{max-width:960px;display:flex;flex-direction:column;gap:10px}
.lead h1{font-weight:800;font-size:30px;letter-spacing:-.6px} .lead p{font-size:14px;line-height:1.55;color:#55554F} .lead b{color:#141414}
.grid{display:flex;flex-wrap:wrap;gap:20px}
.cap{font-size:12px;font-weight:600;color:#55554F;margin:0 0 6px 6px;max-width:406px} .cap b{color:#141414;font-weight:800}
.ph{position:relative;display:flex;flex-direction:column;width:406px;min-height:852px;border:8px solid #04060A;border-radius:52px 52px 0 0;border-bottom:0;overflow:hidden;background:var(--desk);color:var(--ink)}
.status{height:47px;flex:none;display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 8px;font-weight:700;font-size:15px}
.topA{padding:0 20px 28px;flex:none}
.ttlRow{display:flex;align-items:center;gap:10px;min-height:68px;padding:8px 0 16px}
.ttlRow .t{font-weight:800;font-size:34px;line-height:38px;letter-spacing:-.8px;display:flex;align-items:center;gap:12px;white-space:nowrap;min-width:0}
.ttlRow .t i.dot{width:10px;height:10px;border-radius:5px;background:#F0C24A;display:block;flex:none}
.pl{height:38px;padding:0 16px;border-radius:19px;border:1.5px solid var(--ink);display:inline-flex;align-items:center;font-weight:700;font-size:13px;white-space:nowrap;flex:none}
.pl.sm{height:30px;padding:0 12px;border-radius:15px} .ml{margin-left:auto}
.what{font-weight:500;font-size:15px;line-height:20px;color:var(--soft)} .what.inl{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hero{display:flex;align-items:stretch;gap:16px;margin-top:12px}
.g{font-weight:700;white-space:nowrap;flex:none} .g .l1,.g .l2{display:flex;align-items:baseline}
.g .big{font-size:62px;line-height:62px;letter-spacing:-2.85px} .g small{font-size:34px;letter-spacing:-1px;margin-left:6px} .g .b2{margin-left:6px} .g .z{font-size:20px;margin-left:8px}
.grey{color:var(--grey)}
.side{border-left:1.5px solid var(--ink);padding-left:16px;display:flex;flex-direction:column;justify-content:center;gap:12px;min-width:0}
.fv{display:flex;align-items:center;gap:4px;font-weight:700;font-size:20px;line-height:22px;white-space:nowrap} .fv.gain{color:var(--gain)} .fv.was{text-decoration:line-through;opacity:.5}
.fl{display:block;font-weight:500;font-size:11px;line-height:15px;color:var(--soft);white-space:nowrap}
.ic{display:block;fill:currentColor;flex:none}
.sheetN{flex:1;background:var(--sheet);border-radius:32px 32px 0 0;padding:12px 12px 24px;display:flex;flex-direction:column;gap:8px}
.cd{border-radius:24px;padding:16px;display:flex;flex-direction:column;gap:10px;position:relative}
.cd,.slim{color:#141414}   /* os cartões de cor: a tinta escura (CARD.onCard), de dia e de noite */
.ck{border-radius:24px;padding:12px 16px;color:var(--ink);display:flex;flex-direction:column;gap:8px} .ck.plain{padding:0 16px 8px}
.v2{display:flex;flex-direction:column;gap:2px;padding:4px 16px 8px} .v2 b{font-weight:800;font-size:20px;line-height:25px;letter-spacing:-.2px;color:var(--ink)} .v2 span{font-weight:500;font-size:17px;line-height:23px;color:var(--soft)} .ckH{display:flex;justify-content:space-between;align-items:baseline;gap:8px} .ckH b{font-weight:800;font-size:16px;line-height:20px} .ckH span{font-weight:500;font-size:11px;color:var(--sub)}
.ckR{display:grid;grid-template-columns:repeat(3,1fr);gap:8px} .ci{display:grid;grid-template-columns:24px 1fr;column-gap:6px;min-width:0} .ci .rg{grid-row:1 / span 2;width:24px;height:24px;margin-top:2px} .ci b{font-weight:700;font-size:14px;line-height:18px} .ci span{font-weight:500;font-size:12px;line-height:16px;color:var(--sub)}
.rc{border-radius:24px;padding:12px 16px;color:#141414;display:flex;flex-direction:column;gap:8px} .rcH{display:flex;align-items:center;gap:10px} .rcH .mark{position:static;flex:none} .rcT{display:flex;flex-direction:column;flex:1;min-width:0} .rcT .k{font-weight:800;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:rgba(20,20,20,.8)} .rcT b{font-weight:800;font-size:16px;line-height:20px} .rcS{font-weight:500;font-size:11px;color:rgba(20,20,20,.82);align-self:flex-start;margin-top:2px}
.rcL{display:flex;flex-direction:column;background:rgba(255,255,255,.55);border-radius:16px;padding:4px 12px} .rr{display:flex;gap:12px;align-items:center;padding:6px 0} .rr + .rr{border-top:1px solid rgba(20,20,20,.18)} .rd{width:32px;flex:none;display:flex;flex-direction:column;align-items:center} .rd b{font-weight:700;font-size:20px;line-height:22px} .rd span{font-weight:800;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:rgba(20,20,20,.8)}
.rx{display:flex;flex-direction:column;min-width:0} .rx b{font-weight:700;font-size:15px;line-height:20px} .rx span{font-weight:500;font-size:12px;line-height:16px;color:rgba(20,20,20,.82)} .rx s{font-weight:500;opacity:.75} .rmore{font-weight:500;font-size:12px;padding:6px 0;color:rgba(20,20,20,.82)}
.rcA{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.62);border-radius:99px;padding:12px 16px;gap:8px} .rcA b{font-weight:700;font-size:14px} .rcA span{font-weight:500;font-size:11px;color:rgba(20,20,20,.82)}
.und{text-decoration:underline dotted;text-decoration-thickness:1.5px;text-underline-offset:2px;text-decoration-color:var(--soft)} .fv.und{display:inline-block;padding-bottom:2px}
.dk,.dk b{color:var(--sheet)} .ph .dk .st > span:not(.k){color:var(--sheet);opacity:.82} .dk .goS{background:rgba(127,127,127,.35);color:var(--sheet)}
.lt,.lt .ct,.lt b,.lt .dpt b{color:#F4F2ED} .lt .kd,.lt .k,.lt .cs,.lt .cities,.lt .st > span:not(.k),.lt .ab span,.lt .dpt span:not(.dot2),.lt .quiet2,.lt .pd,.lt .dlc span{color:rgba(244,242,237,.8)}
.lt .go,.lt .goS,.lt .badge,.lt .mark{background:rgba(255,255,255,.16);color:#F4F2ED} .lt .dot2{background:#F4F2ED} .lt .dot2.o{border-color:#F4F2ED;background:transparent} .lt .dls{background:#F4F2ED} .lt .dlt{background:rgba(244,242,237,.25)}
.sqc{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:0}
.neu .quiet2 .qr > b,.neu .quiet2 .qv,.neu .dpt b,.neu .ab b{color:var(--ink)} .neu .dpt span:not(.dot2),.neu .dlc span{color:var(--sub)} .neu .dot2{background:var(--ink)} .neu .dot2.o{border-color:var(--ink);background:transparent} .neu .dls{background:var(--ink)}
.lt .quiet2 .qr > b,.lt .quiet2 .qv,.lt .ab b{color:#F4F2ED}
.ph .lt .st > span:not(.k),.ph .lt .cs,.ph .lt .ab span{color:rgba(244,242,237,.8)} .ph .lt .dur,.ph .neu .dur{background:rgba(255,255,255,.16);color:var(--ink)} .ph .lt .dur{color:#F4F2ED}
.ph .lt .prog{background:rgba(244,242,237,.25)} .ph .lt .prog i,.ph .lt .prog s{background:#F4F2ED} .ph .neu .prog{background:rgba(127,127,127,.3)} .ph .neu .prog i,.ph .neu .prog s{background:var(--ink)} .ph .neu .st > span:not(.k){color:var(--sub)}
.slim .sqc{width:12px;height:12px;flex:none;margin:0}
.ring .ttlRow .t i.dot{box-shadow:0 0 0 2px #141414} .night.ring .ttlRow .t i.dot{box-shadow:none}
.minky .chip{color:#141414} .minky .fv.gain{color:var(--ink)}
.gbadge{display:inline-block;background:#0B6E43;color:#fff;border-radius:6px;padding:1px 6px;font-weight:800;font-size:11px;margin-right:6px}
.gdot{display:inline-block;width:8px;height:8px;border-radius:4px;background:#0B6E43;margin-right:6px;vertical-align:1px}
.kd{font-weight:800;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:rgba(20,20,20,.8);padding-right:44px}
.ct{font-weight:800;font-size:22px;line-height:26px;letter-spacing:-.4px;margin-top:-6px;padding-right:44px}
.cities{font-weight:500;font-size:12px;color:rgba(20,20,20,.82);margin-top:-8px}
.cs{font-weight:500;font-size:12px;line-height:16px;color:rgba(20,20,20,.82)} .cs u{color:#141414}
.subrow{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:-6px}
.go{position:absolute;right:14px;top:14px;width:36px;height:36px;border-radius:18px;background:rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px}
.chip{background:#fff;color:#0B6E43;border-radius:14px;padding:5px 10px;font-weight:800;font-size:14px;white-space:nowrap}
.badges{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:-4px}
.badge{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.55);border-radius:10px;padding:2px 8px;font-weight:800;font-size:11px}
.pd{display:flex;align-items:center;gap:6px;font-weight:500;font-size:11px;color:rgba(20,20,20,.82)}
.dl{margin-top:2px} .dlc{position:relative;height:16px;margin-bottom:2px} .dlc span{position:absolute;transform:translateX(-50%);font-weight:800;font-size:11px;letter-spacing:.8px;color:rgba(20,20,20,.8)}
.dlp{position:relative;height:54px} .dlt{position:absolute;left:7px;right:7px;top:6px;height:2px;background:rgba(20,20,20,.18)}
.dls{position:absolute;top:5px;height:4px;background:#141414;border-radius:2px}
.dpt{position:absolute;top:0;display:flex;flex-direction:column;gap:2px}
.dot2{width:14px;height:14px;border-radius:7px;background:#141414;box-shadow:0 0 0 3px var(--flight) inset} .dot2.o{background:var(--flight);border:3px solid #141414;box-shadow:none}
.dpt b{font-weight:700;font-size:20px;line-height:22px;white-space:nowrap} .dpt span:not(.dot2){font-weight:500;font-size:11px;line-height:15px;color:rgba(20,20,20,.82);white-space:nowrap}
.quiet{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;border-top:1px solid rgba(20,20,20,.14);padding-top:8px;font-weight:500;font-size:12px;color:rgba(20,20,20,.82)}
.quiet b{font-weight:700;color:#141414} .quiet .qv{font-size:15px} .quiet > span:first-child{flex:1;min-width:0} .quiet > span:last-child{white-space:nowrap}
.quiet2{border-top:1px solid rgba(20,20,20,.14);padding-top:8px;display:flex;flex-direction:column;gap:2px;font-weight:500;font-size:12px;color:rgba(20,20,20,.82)} .quiet2 .qr{display:flex;justify-content:space-between;align-items:baseline;gap:8px;white-space:nowrap} .quiet2 .qr > b{font-weight:700;color:#141414;overflow:hidden;text-overflow:ellipsis} .quiet2 .qv{font-weight:700;color:#141414;font-size:15px}
.ab{display:flex;align-items:flex-end;justify-content:space-between;gap:8px} .ab b{display:block;font-weight:700;font-size:22px;line-height:24px} .ab span{display:block;font-weight:500;font-size:11px;color:rgba(20,20,20,.82)}
.dur{background:rgba(255,255,255,.75);border-radius:14px;padding:5px 10px;font-weight:700;font-size:12px;white-space:nowrap}
.prog{position:relative;height:6px;border-radius:3px;background:rgba(20,20,20,.18)} .prog i{position:absolute;left:0;top:0;bottom:0;background:#141414;border-radius:3px} .prog s{position:absolute;top:-4px;width:14px;height:14px;margin-left:-7px;border-radius:7px;background:#141414}
.act{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.55);border-radius:14px;padding:10px 12px;font-weight:700;font-size:14px}
.lr{display:flex;justify-content:space-between;gap:12px;font-size:15px;line-height:20px} .lr span{font-weight:500} .lr b{font-weight:700}
.lfoot{border-top:1px solid rgba(20,20,20,.14);padding-top:8px;display:flex;flex-direction:column;gap:8px}
.tx{font-weight:500;font-size:14px;line-height:20px}
.slim{border-radius:20px;padding:12px 16px;display:flex;align-items:center;gap:12px;min-height:56px} .slim.dashed{border:1.5px dashed rgba(20,20,20,.55)}
.slim .st{flex:1;min-width:0;display:flex;flex-direction:column} .slim .k{font-weight:800;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:rgba(20,20,20,.8)}
.slim b{font-weight:800;font-size:16px;line-height:20px} .slim .st > span:not(.k){font-weight:500;font-size:12px;line-height:16px;color:rgba(20,20,20,.82)}
.slim .sv{font-weight:800;font-size:20px;white-space:nowrap}
.mark{width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:none}
.goS{width:34px;height:34px;border-radius:17px;background:rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex:none}
.credit{font-weight:500;font-size:12px;color:var(--caption);padding:2px 6px}
.neu,.neu .ct,.neu b,.neu .lr b{color:var(--ink)} .neu .kd,.neu .k{color:var(--kind)} .neu .cs,.neu .cities,.neu .st > span:not(.k),.neu .lr span,.neu .ab span,.neu .tx,.neu .quiet2{color:var(--sub)} .neu .goS,.neu .go{background:rgba(127,127,127,.2)} .neu.dashed{border-color:var(--kind)}
.hdr{font-weight:800;font-size:13px;color:var(--soft);padding:8px 6px 0} .hdr.near{padding:14px 16px 0;margin-bottom:-4px}
.svl{display:flex;flex-direction:column;align-items:flex-end;flex:none} .svl b{font-weight:700;font-size:20px;line-height:22px} .svl span{font-weight:500;font-size:11px;line-height:15px;color:rgba(20,20,20,.82)}
.fold{position:absolute;left:0;right:0;top:750px;border-top:2px dashed rgba(236,122,108,.9);pointer-events:none} .fold span{position:absolute;right:10px;top:2px;font-size:10px;font-weight:800;color:#C0503F;background:rgba(255,255,255,.85);padding:1px 6px;border-radius:6px}
`;
const fit = `document.fonts.ready.then(function(){ document.querySelectorAll('.ttlRow').forEach(function(r){ var t = r.querySelector('.t'), p = r.querySelector('.pl'); var room = r.clientWidth - p.offsetWidth - 10; var fs = 34; while (t.scrollWidth > room && fs > 24) { fs -= 1; t.style.fontSize = fs + 'px'; } }); });`;
const html = `<!doctype html>
<html lang="pt">
<meta charset="utf-8">
<title>CrewPact · Todos os estados</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
/* GERADO por scripts/render-estados.js a partir de data/homeCards.js e dos dados de teste do golden — não editar à mão. */
${css}</style>
<body><div class="page">
  <div class="lead"><h1>Todos os estados do Início</h1>
    <p><b>Desenhado a partir do código</b> (${new Date().toISOString().slice(0, 10)}): cada estado passa pelo motor do Início (<b>data/homeCards.js</b>) com os dados de teste do golden, e o resultado é desenhado aqui com as cores e as medidas da app. O que cada cartão diz e por que ordem é exatamente o que a app decide; a letra e o desenho são aproximados (não é o iPhone). A linha vermelha tracejada marca onde acaba o ecrã do iPhone, por cima da barra de abas: o que fica por baixo pede deslizar.</p>
    <p>Dados de teste (easyJet, a semana de 11 de novembro de 2026; o tempo como no iPhone). Para regenerar: <b>node scripts/render-estados.js</b>.</p></div>
  <div class="grid">${STATES.map(([n, note, h, clock]) => phone(n, note, h, clock)).join('')}</div>
</div><script>${fit}</script></body></html>`;
module.exports = { phoneOut, css, fit, esc, homeCards, S, CARD };
if (require.main === module) {
  fs.writeFileSync(path.resolve('design/estados-todos.html'), html);
  console.log(`design/estados-todos.html — ${STATES.length} estados`);
}
