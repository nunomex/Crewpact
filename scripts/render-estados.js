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
  ['Folga', 'o próximo serviço daqui a 2 dias', S.folga, '12:00'],
  ['Folga, com o voo amanhã', 'o tempo do report de amanhã', { ...S.folgaHoras, wx: { report: { ...WXL, at: '05:30' } } }, '11:00'],
  ['Atenção', 'um documento a caducar (≤ 7 dias)', S.documento, '10:00'],
  ['Voo amanhã', 'a véspera, depois das 18:00', { ...S.vespera, wx: { report: WXL, night: { ...WXA } } }, '21:40'],
  ['Dia de voo', 'antes do report', { ...S.antes, wx: { report: WXL } }, '03:35'],
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
  ['Férias', '', S.ferias, '11:00'],
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
const bg = (color) => (color === 'dark' ? C.ink : C[color] || C.neutral);

function topHTML(t) {
  if (!t) return '';
  const g = t.giant || {};
  const p2 = t.pill2 ? `<span class="pl sm">${esc(t.pill2.text)}${t.pill2.iso ? ' ›' : ''}</span>` : '';
  const facts = (t.facts || []).map((f) => `<div><span class="fv${f.tone === 'gain' ? ' gain' : ''}${f.tone === 'was' ? ' was' : ''}">${f.ic ? ic(f.ic, 18) : ''}${esc(f.v)}</span><span class="fl">${esc(f.l)}</span></div>`).join('');
  return `<div class="topA">
    <div class="ttlRow"><span class="t">${esc(t.pill ? t.pill.text : '')}${t.pill && t.pill.live ? '<i class="dot"></i>' : ''}</span><span class="pl ml">Notificações</span></div>
    ${p2 ? `<div class="what inl"><span>${esc(t.what)}</span>${p2}</div>` : `<div class="what">${esc(t.what)}</div>`}
    <div class="hero"><div class="g"><div class="l1"><span class="big">${esc(g.l1)}</span>${g.unit ? `<small>${esc(g.unit)}</small>` : ''}</div>
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
function cardHTML(c) {
  const B = bg(c.color);
  if (c.t === 'slim') {
    return `<div class="slim${c.dashed ? ' dashed' : ''}" style="background:${B}">${c.mark ? `<span class="mark">${esc(c.mark)}</span>` : ''}<div class="st">${c.kind ? `<span class="k">${esc(c.kind)}</span>` : ''}<b>${esc(c.title)}</b>${c.sub ? `<span>${esc(c.sub)}</span>` : ''}</div>
      ${c.value ? (c.gain ? `<span class="chip">${esc(c.value)}</span>` : `<span class="sv">${esc(c.value)}</span>`) : c.open ? '<span class="goS">›</span>' : ''}</div>`;
  }
  if (c.t === 'lines') {
    return `<div class="cd" style="background:${B}"><span class="kd">${esc(c.kind)}</span>${(c.rows || []).map((r) => `<div class="lr"><span>${esc(r.k)}</span><b>${esc(r.v)}</b></div>`).join('')}
      ${c.foot ? `<div class="lfoot">${c.foot.map((r) => `<div class="lr"><span>${esc(r.k)}</span><b>${esc(r.v)}</b></div>`).join('')}</div>` : ''}
      ${c.note || c.link ? `<div class="cs">${esc(c.note || '')} ${c.link ? `<u>${esc(c.link.label)}</u>` : ''}</div>` : ''}</div>`;
  }
  if (c.t === 'text') return `<div class="cd" style="background:${B}"><span class="kd">${esc(c.kind)}</span><div class="tx">${esc(c.text)}</div></div>`;
  // o cartão grande
  const corner = c.corner === 'share' ? `<span class="go">${ic('share', 16)}</span>` : (c.open ? '<span class="go">›</span>' : '');
  let body = '';
  if (c.line) {
    body += c.sub ? `<span class="cs">${esc(c.sub)}</span>` : '';
    body += (c.flightNo || c.gain) ? `<div class="badges">${c.flightNo ? `<span class="badge">${ic('plane', 12)}${esc(c.flightNo)}</span>` : '<span></span>'}${c.gain ? `<span class="pd">${esc(c.gainLbl || '')} <span class="chip">${esc(c.gain)}</span></span>` : ''}</div>` : '';
    body += lineHTML(c.line);
    body += c.quiet ? `<div class="quiet2"><div class="qr"><b>${esc(c.quiet.rest ? c.quiet.l + ' · ' + c.quiet.rest : c.quiet.l)}</b><span>${esc(c.quiet.r.k)} <b class="qv">${esc(c.quiet.r.v)}</b></span></div><span>${esc(c.quiet.sub)}</span></div>` : '';
  } else {
    body += (c.sub || c.gain) ? `<div class="subrow"><span class="cs">${esc(c.sub || '')}</span>${c.gain ? `<span class="chip">${esc(c.gain)}</span>` : ''}</div>` : '';
    body += (c.a || c.dur || c.b) ? `<div class="ab"><div>${c.a ? `<b>${esc(c.a.v)}</b><span>${esc(c.a.l)}</span>` : ''}</div>${c.dur ? `<span class="dur">${esc(c.dur)}</span>` : ''}<div style="text-align:right">${c.b ? (c.b.gain ? `<span class="chip">${esc(c.b.v)}</span>` : `<b>${esc(c.b.v)}</b>`) + `<span>${esc(c.b.l)}</span>` : ''}</div></div>` : '';
    body += c.pct != null ? `<div class="prog"><i style="width:${c.pct}%"></i><s style="left:${c.pct}%"></s></div>` : '';
  }
  return `<div class="cd" style="background:${B}">${corner}<span class="kd">${esc(c.kind)}</span><span class="ct">${esc(c.title)}</span>${c.cities ? `<span class="cities">${esc(c.cities)}</span>` : ''}${body}
    ${c.action ? `<div class="act">${ic(c.action.icon || 'bell', 16)}${esc(c.action.label)}</div>` : ''}</div>`;
}
function phone(name, note, h, clock) {
  const out = homeCards(h);
  const cards = (out.cards || []).map(cardHTML).join('');
  return `<div class="cell"><div class="cap"><b>${esc(name)}</b>${note ? ` · ${esc(note)}` : ''}</div>
    <div class="ph"><div class="status"><span>${esc(clock)}</span><span style="font-size:12px;letter-spacing:1px">●●●● 5G ▮</span></div>${topHTML(out.top)}
      <div class="sheetN">${cards}${out.credit ? `<div class="credit">${esc(out.credit)}</div>` : ''}</div>
      <div class="fold"><span>fim do ecrã do iPhone (por cima da barra de abas) — o resto desliza</span></div></div></div>`;
}

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
.ph{position:relative;display:flex;flex-direction:column;width:406px;min-height:852px;border:8px solid #04060A;border-radius:52px 52px 0 0;border-bottom:0;overflow:hidden;background:${C.desk};color:${C.ink}}
.status{height:47px;flex:none;display:flex;align-items:flex-end;justify-content:space-between;padding:0 28px 8px;font-weight:700;font-size:15px}
.topA{padding:0 20px 28px;flex:none}
.ttlRow{display:flex;align-items:center;gap:10px;min-height:68px;padding:8px 0 16px}
.ttlRow .t{font-weight:800;font-size:34px;line-height:38px;letter-spacing:-.8px;display:flex;align-items:center;gap:12px;white-space:nowrap;min-width:0}
.ttlRow .t i.dot{width:10px;height:10px;border-radius:5px;background:#F0C24A;display:block;flex:none}
.pl{height:38px;padding:0 16px;border-radius:19px;border:1.5px solid ${C.ink};display:inline-flex;align-items:center;font-weight:700;font-size:13px;white-space:nowrap;flex:none}
.pl.sm{height:30px;padding:0 12px;border-radius:15px} .ml{margin-left:auto}
.what{font-weight:500;font-size:15px;line-height:20px;color:${C.soft}} .what.inl{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hero{display:flex;align-items:stretch;gap:16px;margin-top:12px}
.g{font-weight:700;white-space:nowrap;flex:none} .g .l1,.g .l2{display:flex;align-items:baseline}
.g .big{font-size:62px;line-height:62px;letter-spacing:-2.85px} .g small{font-size:34px;letter-spacing:-1px;margin-left:6px} .g .z{font-size:20px;margin-left:8px}
.grey{color:${C.grey}}
.side{border-left:1.5px solid ${C.ink};padding-left:16px;display:flex;flex-direction:column;justify-content:center;gap:12px;min-width:0}
.fv{display:flex;align-items:center;gap:4px;font-weight:700;font-size:20px;line-height:22px;white-space:nowrap} .fv.gain{color:#0B6E43} .fv.was{text-decoration:line-through;opacity:.5}
.fl{display:block;font-weight:500;font-size:11px;line-height:15px;color:${C.soft};white-space:nowrap}
.ic{display:block;fill:currentColor;flex:none}
.sheetN{flex:1;background:#fff;border-radius:32px 32px 0 0;padding:12px 12px 24px;display:flex;flex-direction:column;gap:8px}
.cd{border-radius:24px;padding:16px;display:flex;flex-direction:column;gap:10px;position:relative}
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
.dot2{width:14px;height:14px;border-radius:7px;background:#141414;border:3px solid rgba(255,255,255,.0);box-shadow:0 0 0 3px ${C.flight} inset} .dot2.o{background:${C.flight};border:3px solid #141414;box-shadow:none}
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
.credit{font-weight:500;font-size:12px;color:#5E5E57;padding:2px 6px}
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
fs.writeFileSync(path.resolve('design/estados-todos.html'), html);
console.log(`design/estados-todos.html — ${STATES.length} estados`);
