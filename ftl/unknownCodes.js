// O QUE A ESCALA NÃO DIZ, NO MOTOR — módulo PURO (sessão Fable 5.2, 2026-11-17/18). Dois casos, a mesma regra:
//   · OS CÓDIGOS QUE A APP NÃO CONHECE (camada 2, ponto 9; golden scripts/unknown-codes.test.js). A camada 1 guarda-os por dia:
//     `unknown` = { 'AAAA-MM-DD': [{ code, title, start: 'HH:MM', end: 'HH:MM', endISO? }] } — um evento com horas e com a forma
//     de um código da escala que a app não sabe ler (data/calendarParse.js `unknownOf`). Pode ser um serviço (um PSV, uma
//     assistência, uma formação, um posicionamento) ou não ser nada.
//   · OS SERVIÇOS A QUE FALTAM HORAS (ponto 3; golden scripts/incomplete.test.js): um serviço da escala sem hora de fim, sem
//     hora de início, ou sem horas nenhumas. Sabe-se o que é; não se sabe quanto tempo ocupou.
// A lei conta cada leitura de maneira diferente e a app não escolhe ("a lei é que manda"): em cada conta dão-se as duas pontas —
//   · ORO.FTL.210 (serviço em 7, 14 e 28 dias; voo em 28 dias, no ano civil e em 12 meses): no mínimo nada (o que se sabe); no
//     máximo o tempo que o evento pode ter ocupado, menos o que já conta como serviço (um código DENTRO de um voo não acrescenta
//     nada). Se puder ser um voo, esse tempo é também o máximo de tempo de voo (revisão independente, achado 10).
//   · ORO.FTL.235 (repouso): data/today.js — curto só se o for em todas as leituras, certo só se o for em todas.
//   · Recuperação e noites seguidas (só os códigos): as três leituras (nada · um serviço em terra · um PSV).
// CONVENÇÕES (a lei não dá um teto ao período de serviço — dizem-se no ecrã): um serviço sem fim conta, no máximo, até ao
// serviço seguinte da escala ou 24 h depois de começar; um serviço sem início, desde as 00:00 do seu dia (e, se o fim é até ao
// meio-dia, pode ser o da madrugada seguinte: conta até lá); sem horas, o dia todo.
import { isFdpDuty } from './rules/fdpRules';

const hm = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t == null ? '' : t)); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const at = (iso, min, addDays = 0) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d + addDays, 0, min, 0, 0); };
const isoOf = (t) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const pad = (n) => String(n).padStart(2, '0');
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

export const hasUnknown = (unknown) => !!unknown && Object.keys(unknown).some((k) => Array.isArray(unknown[k]) && unknown[k].length);

// Os códigos com início e fim em INSTANTES (o relógio do dispositivo, como o repouso), por ordem. Um fim anterior ao início é
// do dia seguinte; um evento de vários dias acaba no dia `endISO`. Sem as duas horas, ou com o início igual ao fim (não se sabe
// quanto durou — não se inventam 24 h; revisão independente, achado 11), não se situa no tempo: fica só o aviso do dia (camada 1).
export const unknownSpans = (unknown) => {
  const out = [];
  if (!unknown) return out;
  for (const iso of Object.keys(unknown)) {
    if (!ISO_RE.test(iso) || !Array.isArray(unknown[iso])) continue;
    for (const u of unknown[iso]) {
      const s = hm(u && u.start), e = hm(u && u.end);
      if (s == null || e == null) continue;
      const start = at(iso, s);
      const far = u && ISO_RE.test(String(u.endISO || '')) && u.endISO > iso;
      let end = far ? at(u.endISO, e) : at(iso, e);
      if (!far && e < s) end = at(iso, e, 1);
      if (+end <= +start) continue;
      out.push({ iso, code: (u && u.code) || '?', start, end, fdp: true });
    }
  }
  return out.sort((a, b) => +a.start - +b.start);
};

// O que já conta como período de serviço à volta de um dia (da apresentação — sem ela, dos calços — ao fim; nos voos, o
// pós-voo). A assistência em casa fica de fora: só conta 25 % (CS FTL.1.225(b)(3)) e o código pode ser um serviço inteiro.
const knownIntervals = (duties, iso, postFlightMin) => {
  const out = [];
  for (const k of [-1, 0, 1]) {
    const day = isoOf(at(iso, 0, k)), x = duties && duties[day];
    if (!x || x.deleted) continue;
    for (const s of [x, ...(Array.isArray(x.extra) ? x.extra : [])]) {
      if (!s || s.kind === 'reserve' || s.kind === 'standby_home') continue;
      const st = hm(s.report_time) != null ? hm(s.report_time) : hm(s.block_off != null ? s.block_off : (Array.isArray(s.legs) && s.legs.length ? s.legs[0].off : null));
      const so = hm(s.signOff), on = hm(s.block_on);
      const en = so != null ? so : (on != null ? on + ((s.kind || 'flight') === 'flight' ? (postFlightMin || 0) : 0) : null);
      if (st == null || en == null) continue;
      const a = at(day, st); let b = at(day, en % 1440, Math.floor(en / 1440)); if (+b <= +a) b = new Date(+b + DAY_MS);
      out.push([+a, +b]);
    }
  }
  return out;
};
// Os troços de [a, b] que não estão em nenhum dos intervalos.
const minus = (a, b, cuts) => {
  let parts = [[a, b]];
  for (const [c, d] of cuts) {
    const next = [];
    for (const [x, y] of parts) {
      if (d <= x || c >= y) { next.push([x, y]); continue; }
      if (c > x) next.push([x, c]);
      if (d < y) next.push([d, y]);
    }
    parts = next;
  }
  return parts;
};

// OS SERVIÇOS A QUE FALTAM HORAS: o tempo que cada um pode ter ocupado (ver as convenções no topo).
//   `why`: 'noEnd' (tem início — a apresentação ou, sem ela, os calços — e não tem fim) · 'noStart' (tem fim e não tem início)
//          · 'noTimes' (não tem horas).
//   `c210`: conta para o serviço do ORO.FTL.210 por aqui (um voo sem apresentação já é contado pelo registo do voo — ftl/index.js
//           noReportEntry: o pós-voo e o tempo de voo, mais 24 h no máximo — e não se conta duas vezes).
//   `voo`:  pode ser tempo de voo que a escala não diz (um PSV sem `flight_minutes`).
//   `rest`: entra na linha do repouso como "tempo que pode ser serviço" (data/today.js `svcs.unk`). Um serviço com apresentação e
//           sem fim já está na linha (o repouso a seguir a ele fica incerto, 'noEnd'): não entra duas vezes.
//   `fdp`:  pode ser um PSV (ORO.FTL.235: o mínimo é "antes de um PSV").
export const incompleteSpans = (duties = {}, { postFlightMin = 0 } = {}) => {
  const out = [];
  for (const iso of Object.keys(duties || {}).sort()) {
    const x = duties[iso];
    if (!ISO_RE.test(iso) || !x || x.deleted) continue;
    for (const s of [x, ...(Array.isArray(x.extra) ? x.extra : [])]) {
      if (!s || s.kind === 'reserve') continue;
      const kind = s.kind || 'flight', isFl = kind === 'flight';
      const R = hm(s.report_time), off = hm(s.block_off != null ? s.block_off : (Array.isArray(s.legs) && s.legs.length ? s.legs[0].off : null));
      const on = hm(s.block_on), so = hm(s.signOff);
      const endC = so != null ? so : (on != null ? on + (isFl ? (postFlightMin || 0) : 0) : null);
      const vooMin = Math.round(s.flight_minutes || 0);
      const fdp = isFdpDuty(s);
      const base = { iso, code: null, kind, fdp, voo: fdp && !vooMin };
      const st = R != null ? R : off;
      if (st != null && endC == null) {
        const start = at(iso, st), cap = +start + DAY_MS;
        const nexts = knownIntervals(duties, iso, postFlightMin).map((p) => p[0]).filter((t) => t > +start);
        const end = new Date(Math.min(cap, ...nexts));
        out.push({ ...base, why: 'noEnd', start, end, c210: true, rest: R == null });
      } else if (st == null) {
        // O registo do voo (noReportEntry) já conta um voo sem apresentação quando há tempo de voo ou pós-voo.
        const counted = vooMin > 0 || (isFl && so == null && (postFlightMin || 0) > 0);
        if (endC != null) {
          // (2.ª revisão independente, achado 4.) Sem o início não se sabe se o fim é do próprio dia ou da madrugada seguinte (um
          // serviço que se apresenta à noite): um fim até ao meio-dia conta até ao dia seguinte (`amb`; `endLo` = o fim no próprio dia).
          const start = at(iso, 0), endLo = at(iso, endC % 1440, Math.floor(endC / 1440));
          const amb = endC <= 720;
          const end = amb ? new Date(+endLo + DAY_MS) : endLo;
          if (+end > +start) out.push({ ...base, why: 'noStart', start, end, endLo, amb, c210: !counted, rest: true });
        } else out.push({ ...base, why: 'noTimes', start: at(iso, 0), end: at(iso, 0, 1), c210: !counted, rest: true });
      }
    }
  }
  return out.sort((a, b) => +a.start - +b.start);
};

// O MÁXIMO que os códigos novos e os serviços a que faltam horas podem acrescentar a cada DIA LOCAL (ORO.FTL.105(15): das 00:00
// às 24:00): { 'AAAA-MM-DD': { min (serviço), codes, voo? (tempo de voo), miss? (serviços a que faltam horas), spill? } } — só os
// dias com alguma coisa. Um evento que passa a meia-noite reparte-se pelos dois dias (`spill` no 1.º: o resto está no seguinte).
export const unknownDayMax = (unknown, duties = {}, { postFlightMin = 0 } = {}) => {
  const acc = {};
  const add = (u, serv, voo, miss) => {
    const seen = new Set();
    for (const [a, b] of minus(+u.start, +u.end, knownIntervals(duties, u.iso, postFlightMin))) {
      let t = a;
      while (t < b) {
        const d = new Date(t), mid = +new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        const stop = Math.min(b, mid), min = Math.round((stop - t) / 60000);
        if (min > 0) {
          const k = isoOf(d), o = acc[k] || (acc[k] = { min: 0, codes: [], voo: 0, miss: 0, spill: false });
          if (serv) o.min += min;
          if (voo) o.voo += min;
          if (u.code && !o.codes.includes(u.code)) o.codes.push(u.code);
          if (miss && serv && !seen.has(k)) { o.miss += 1; seen.add(k); }
          if (stop < b && (serv || voo)) o.spill = true;
        }
        t = stop;
      }
    }
  };
  for (const u of unknownSpans(unknown)) add(u, true, true, false);
  for (const u of incompleteSpans(duties, { postFlightMin })) if (u.c210 || u.voo) add(u, u.c210, u.voo, true);
  const out = {};
  for (const k of Object.keys(acc).sort()) {
    const o = acc[k];
    if (!o.min && !o.voo) continue;
    out[k] = { min: o.min, codes: o.codes, ...(o.voo ? { voo: o.voo } : {}), ...(o.miss ? { miss: o.miss } : {}), ...(o.spill ? { spill: true } : {}) };
  }
  return out;
};

// A escala com os códigos novos LIDOS COMO SERVIÇOS de um tipo (`kind`: 'office' — um serviço em terra; 'flight' — um PSV), para
// as contas que se fazem com as três leituras (recuperação, noites seguidas). Não se guarda: é só para comparar.
export const withUnknownAs = (duties = {}, unknown, kind = 'office') => {
  const spans = unknownSpans(unknown);
  if (!spans.length) return duties;
  const out = { ...duties };
  for (const u of spans) {
    const clk = (t) => `${pad(t.getHours())}:${pad(t.getMinutes())}`;
    const s = { kind, report_time: clk(u.start), block_on: clk(u.end), signOff: clk(u.end), sectors: 0, flight_minutes: 0, unknownCode: u.code };
    const cur = out[u.iso];
    out[u.iso] = cur && !cur.deleted ? { ...cur, extra: [...(Array.isArray(cur.extra) ? cur.extra : []), s] } : { ...s };
  }
  return out;
};
