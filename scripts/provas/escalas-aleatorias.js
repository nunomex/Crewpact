// Escalas aleatórias: (1) as vistas concordam; (2) "Repouso até" bate com o "Tenho descanso?"; (3) mais repouso nunca piora.
const { today, ftl, C, F, G, sbD, hm, fmt } = require('./h.js');
const MODE = process.argv[2] || 'views';
const SEEDS = (process.argv[3] || '1,2,3').split(',').map(Number);
const N = Number(process.argv[4] || 1500);
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const pad = (n) => String(n).padStart(2, '0');
const hmS = (m) => `${pad(Math.floor((((m % 1440) + 1440) % 1440) / 60))}:${pad((((m % 1440) + 1440) % 1440) % 60)}`;
const isoOf = (dayIdx) => { const d = new Date(2026, 0, 5 + dayIdx, 12); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
// Um evento = { t (min desde o dia 0, 00:00), dur, kind, … } → serviço na forma da tabela `duties`.
const mk = (r, opts = {}) => {
  const { longHaul = true, incomplete = true, reserve = true } = opts;
  const evs = []; let t = Math.floor(r() * 600) + 300; let where = 'LIS'; const days = 6 + Math.floor(r() * 8);
  while (t < days * 1440) {
    const x = r(); let e;
    const dur = (lo, hi) => lo + Math.floor(r() * ((hi - lo) / 15 + 1)) * 15;
    if (x < 0.45) {
      // voo
      const d = dur(120, 840);
      if (longHaul && where === 'LIS' && r() < 0.12) { e = { t, dur: 540, kind: 'flight', legs: ['LIS', 'EWR'] }; where = 'EWR'; }
      else if (where === 'EWR') { e = { t, dur: 480, kind: 'flight', legs: ['EWR', 'LIS'] }; where = 'LIS'; }
      else if (where === 'LIS' && r() < 0.3) { e = { t, dur: d, kind: 'flight', route: 'LIS-FNC' }; where = 'FNC'; }
      else if (where === 'FNC') { e = { t, dur: d, kind: 'flight', route: r() < 0.7 ? 'FNC-LIS' : 'FNC-PXO-FNC' }; if (e.route === 'FNC-LIS') where = 'LIS'; }
      else e = { t, dur: d, kind: 'flight', route: 'LIS-OPO-LIS' };
      if (incomplete) { const y = r(); if (y < 0.04) e.noRep = true; else if (y < 0.07) e.noEnd = true; else if (y < 0.10 && !e.legs) { e.route = null; } }
      if (r() < 0.08) e.aug = true;
    } else if (x < 0.65) e = { t, dur: dur(60, 900), kind: 'standby_home' };
    else if (x < 0.72) e = { t, dur: dur(60, 600), kind: 'standby_airport' };
    else if (x < 0.82) e = { t, dur: dur(60, 600), kind: 'office' };
    else if (x < 0.90) e = { t, dur: dur(60, 600), kind: 'training' };
    else if (reserve && x < 0.95) e = { t, dur: dur(240, 900), kind: 'reserve' };
    else { t += 1440; continue; }
    if (incomplete && e.kind !== 'flight' && e.kind !== 'reserve' && r() < 0.03) e.noEnd = true;
    evs.push(e);
    // intervalo até ao próximo: muitas vezes perto dos limiares
    const g = r();
    const gap = g < 0.15 ? 60 + Math.floor(r() * 9) * 60 : g < 0.75 ? 540 + Math.floor(r() * 41) * 15 : 1200 + Math.floor(r() * 60) * 60;
    t += e.dur + gap;
  }
  return evs;
};
const toDuties = (evs, shift = 0) => {
  const d = {};
  for (const e of evs) {
    const t = e.t + shift, dayIdx = Math.floor(t / 1440), iso = isoOf(dayIdx), rep = hmS(t), end = hmS(t + e.dur);
    let s;
    if (e.kind === 'flight') {
      s = { kind: 'flight', report_time: rep, block_off: hmS(t + 60), block_on: end, sectors: e.legs ? 1 : (e.route ? e.route.split('-').length - 1 : 1), flight_minutes: 60, route: e.route || null };
      if (e.legs) { s.legs = [{ dep: e.legs[0], arr: e.legs[1], off: hmS(t + 60), on: end }]; s.route = e.legs.join('-'); }
      if (e.aug) s.special = { augmented: { restClass: 1, additionalCrew: 1 } };
      if (e.noRep) s.report_time = null;
      if (e.noEnd) { s.block_on = null; }
    } else if (e.kind === 'reserve') s = { kind: 'reserve', report_time: rep, block_on: end };
    else { s = { kind: e.kind, report_time: rep, block_on: e.noEnd ? null : end, sectors: 0, flight_minutes: 0, route: null }; }
    s._t = e.t;
    if (!d[iso]) d[iso] = s; else d[iso] = { ...d[iso], extra: [...(d[iso].extra || []), s] };
  }
  return d;
};
const key = (r) => (r ? [r.status === 'warn' ? 'unc' : r.status, r.kind || null, r.actualMin == null ? null : r.actualMin, r.requiredMin == null ? null : r.requiredMin, r.requiredHiMin == null ? null : r.requiredHiMin, r.nightsRequired || null].join('|') : 'null');
const rank = (st) => ({ bad: 0, unc: 1, warn: 1, ok: 2, na: 2, neutral: 2 }[st]);
const all = (d) => { const out = []; for (const iso of Object.keys(d).sort()) for (const s of [d[iso], ...(d[iso].extra || [])]) out.push({ iso, s }); return out; };
const atD = (iso, hmStr) => { const [h, m] = hmStr.split(':').map(Number); const x = new Date(iso + 'T00:00:00'); x.setHours(h, m, 0, 0); return x; };

let cmp = 0, diffs = 0, exc = 0; const samples = []; const TAGS = {};
const note = (tag, d, extra) => { diffs++; TAGS[tag] = (TAGS[tag] || 0) + 1; if (samples.length < 400) samples.push({ tag, extra, d: JSON.stringify(d) }); };

for (const seed of SEEDS) {
  const r = rng(seed * 7919 + 13);
  for (let n = 0; n < N; n++) {
    const evs = mk(r, { longHaul: MODE !== 'mono-nolh', incomplete: MODE === 'views' || MODE === 'until' });
    const d = toDuties(evs);
    try {
      if (MODE === 'views') {
        const rv = today.restVerdicts(d, C);
        const byNext = new Map(); for (const v of rv) byNext.set(v.nextIso + '|' + v.actualMin, v);
        const svcs = all(d);
        for (const { iso, s } of svcs) {
          if (!s.report_time || s.kind === 'reserve') continue;
          const ra = today.restAround(d, (x) => x === s, C); if (!ra) continue;
          const b = ra.before;
          // o Início, 1 minuto antes da apresentação
          const ref = new Date(+atD(iso, s.report_time) - 60000);
          const rs = today.restStatus(d, iso, ref, C);
          const mine = rs && rs.nextIso === iso && b && rs.prevIso === b.prevIso && (rs.actualMin === b.actualMin || rs.kind === 'noPrevEnd' || b.kind === 'noPrevEnd');
          if (b && mine) {
            cmp++;
            const kb = key(b), ks = key(rs);
            // a Simulação diz 'na' e o Início 'ok' para "não é PSV": a mesma coisa
            const same = kb === ks || (b.kind === 'notFdp' && rs.kind === 'notFdp') || (b.kind === 'noPrevEnd' && rs.kind === 'noPrevEnd');
            if (!same) note('inicio≠simulacao', d, { iso, rep: s.report_time, sim: kb, ini: ks });
          }
          if (b && b.status !== 'na' && b.kind !== 'noPrevEnd') {
            const v = rv.find((x) => x.nextIso === iso && x.actualMin === b.actualMin && x.prevIso === b.prevIso);
            if (v) { cmp++; if (key({ ...v, nightsRequired: null }) !== key({ ...b, nightsRequired: null })) note('estatisticas≠simulacao', d, { iso, rep: s.report_time, sim: key(b), est: key(v) }); }
          }
        }
      } else if (MODE === 'until') {
        for (const iso of Object.keys(d).sort()) {
          const ru = today.restUntilAfter(d, iso, C); if (!ru) continue;
          const list = [d[iso], ...(d[iso].extra || [])].filter((s) => s.report_time && s.kind !== 'reserve');
          // o último a acabar do dia
          for (const s of list) {
            const ra = today.restAround(d, (x) => x === s, C); if (!ra || !ra.need) continue;
            const nd = ra.need;
            // só o serviço de onde o "Repouso até" conta (o mesmo bloco do último a acabar)
            if (nd.requiredMin === ru.requiredMin && (nd.requiredLoMin || null) === (ru.requiredLoMin || null)) { cmp++; continue; }
          }
          // o "Tenho descanso?" de um voo curto posto à hora do "Repouso até": tem de dar "Sim"; 1 minuto antes da ponta de baixo: não pode dar "Sim".
          const later = Object.keys(d).filter((k) => k > iso);
          const d2 = {}; for (const k of Object.keys(d)) if (k <= iso) d2[k] = d[k];
          const probe = (ms) => {
            const x = new Date(ms), piso = `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`, rep = `${pad(x.getHours())}:${pad(x.getMinutes())}`;
            const fl = { kind: 'flight', report_time: rep, block_off: hmS(x.getHours() * 60 + x.getMinutes() + 45), block_on: hmS(x.getHours() * 60 + x.getMinutes() + 120), sectors: 1, flight_minutes: 60, route: null, _probe: true };
            const dd = { ...d2 }; dd[piso] = dd[piso] ? { ...dd[piso], extra: [...(dd[piso].extra || []), fl] } : fl;
            const ra = today.restAround(dd, (s) => !!s._probe, C);
            return ra ? ra.before : null;
          };
          const hiMs = ru.uncertain ? ru.untilHiMs : ru.untilMs, loMs = ru.uncertain ? ru.untilLoMs : ru.untilMs;
          const exp = (ms) => Math.round((ms - ru.endMs) / 60000);
          if (hiMs != null) { const b = probe(hiMs); if (b && b.actualMin !== exp(hiMs)) { TAGS.juntoHi = (TAGS.juntoHi || 0) + 1; if (samples.length < 6) samples.push({ tag: 'juntoHi', extra: { iso, exp: exp(hiMs), ru: { lo: ru.requiredLoMin, hi: ru.requiredHiMin, min: ru.requiredMin, why: ru.why, n: ru.nightsRequired }, probe: key(b) }, d: JSON.stringify(d2) }); } else { cmp++; if (b && rank(b.status) < 2 && b.kind !== 'noReport' && b.kind !== 'noPrevEnd') note('até(hi) não dá Sim', d, { iso, ru: { lo: ru.requiredLoMin, hi: ru.requiredHiMin, min: ru.requiredMin, why: ru.why, n: ru.nightsRequired }, probe: key(b) }); } }
          if (loMs != null) { const b = probe(loMs - 60000); if (b && b.actualMin !== exp(loMs - 60000)) { TAGS.juntoLo = (TAGS.juntoLo || 0) + 1; } else { cmp++; if (b && b.status === 'ok') note('até(lo)−1 dá Sim', d, { iso, ru: { lo: ru.requiredLoMin, hi: ru.requiredHiMin, min: ru.requiredMin, why: ru.why, n: ru.nightsRequired }, probe: key(b) }); } }
        }
      } else if (MODE.startsWith('mono')) {
        // o último evento passa a ser um voo curto; varia-se a hora dele de 15 em 15 min depois do fim do penúltimo.
        if (evs.length < 3) continue;
        const base = evs.slice(0, -1), last = base[base.length - 1];
        if (last.kind === 'reserve') continue;
        let prevRank = -1, prevKey = null, prevT = null;
        for (let g = 15; g <= 40 * 60; g += 15) {
          const t = last.t + last.dur + g;
          const dd = toDuties([...base, { t, dur: 120, kind: 'flight', route: null, probe: true }]);
          const probeIso = isoOf(Math.floor(t / 1440));
          const ra = today.restAround(dd, (s, i) => i === probeIso && s._t === t && s.kind === 'flight', C);
          const b = ra && ra.before; if (!b) continue;
          const rk = rank(b.status); cmp++;
          if (rk < prevRank) note(/standbyCall/.test(prevKey) ? 'piora: chamada > 16 h' : (isoOf(Math.floor(prevT / 1440)) === isoOf(Math.floor(last.t / 1440)) ? (probeIso === isoOf(Math.floor(last.t / 1440)) ? 'piora: limiar de juntar no mesmo dia' : 'piora: mesmo dia → dia seguinte') : 'piora: OUTRO') + ' [' + last.kind + ']', dd, { g: hm(g), antes: prevKey, agora: key(b), lastKind: last.kind, sameDayPrev: isoOf(Math.floor(prevT / 1440)) === isoOf(Math.floor(last.t / 1440)), sameDayNow: probeIso === isoOf(Math.floor(last.t / 1440)) });
          prevRank = rk; prevKey = key(b); prevT = t;
        }
      }
    } catch (e) { exc++; if (samples.length < 12) samples.push({ tag: 'EXCEÇÃO', extra: String(e && e.stack).slice(0, 600), d: JSON.stringify(d) }); }
  }
}
console.log(`${MODE}: ${cmp} comparações, ${diffs} diferenças, ${exc} exceções`);
console.log(JSON.stringify(TAGS));
for (const s of samples.filter((x) => !process.argv[6] || x.tag.includes(process.argv[6])).slice(0, Number(process.argv[5] || 4))) { console.log('—', s.tag, JSON.stringify(s.extra)); console.log('  ', s.d.replace(/"_t":\d+,?/g, '').slice(0, 1800)); }
