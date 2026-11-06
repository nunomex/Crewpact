// Parser LOCAL da escala easyJet colada do PDF ("Schedule Details"). RGPD: corre
// 100% no dispositivo, sem servidor — o texto vive só no estado do ecrã e é limpo
// a seguir (não há ficheiro para guardar/apagar). Produz os MESMOS candidatos que
// o import por calendário → alimenta buildImportCandidates (data/rosterImport.js).
//
// Colunas do PDF: Date · Duties(EJU#### [320]) · Details(LIS - SID) · Report times
// · Actual times/Delays(A12:02 - A16:26/00:12) · Debrief · Block hours · Duty hours.
// Ao COPIAR uma tabela PDF perde-se o alinhamento de colunas, por isso o parser é
// TOLERANTE: agrupa por DATA e reconhece tokens por TIPO (rota XXX-YYY, nº de voo,
// horas, códigos FTGD/D-O) em vez de posição. Os códigos de tipo são por companhia
// (rosterCodes.js) — default easyJet.
//
// Bloco 4 da auditoria (2026-11-06): lê LINHA A LINHA quando a linha traz a rota e as horas (A-237: emparelhar pela ordem
// passava as horas de uma perna cancelada para a seguinte); uma perna "DH" é posicionamento (A-224/A-263); a apresentação é
// só a hora antes da 1.ª perna — nunca o Debrief, as horas de bloco ou o atraso (A-222); um não-voo lê o fim na própria linha
// e, sem ele, fica a corrigir (A-220); num dia com standby/formação/escritório e voos ficam os dois (A-221/A-223); as pernas de
// todos os dias agrupam-se com a regra do calendário (um noturno partido em duas datas é um serviço, A-222); férias e doença
// são devolvidas para a folha as sugerir (A-236).
import { codesFor } from './rosterCodes';
import { buildDuties } from './calendarParse';

const pad = (n) => String(n).padStart(2, '0');
const RE_DATE  = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;                 // 01/04/2025
const RE_ROUTE = /\b([A-Z]{3})\s*-\s*([A-Z]{3})\b/g;             // LIS - SID
// Perna em "Actual times": A12:02 - A16:26  (o 'A'=Actual é opcional; /00:12 = atraso, descartado)
const RE_LEG   = /A?(\d{1,2}):(\d{2})\s*-\s*A?(\d{1,2}):(\d{2})(?:\/\d{1,2}:\d{2})?/g;
const RE_CNX   = /\b(CNX|CNL|CANX|CANC|CANCEL(?:L?ED)?)\b/i;      // perna cancelada (não é setor)
const DAY = 24 * 3600 * 1000;

const mkISO  = (dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`;
const norm   = (h, m) => `${pad(+h)}:${m}`;
const mkDate = (iso, hhmm) => { const [h, m] = hhmm.split(':'); const d = new Date(`${iso}T00:00:00`); d.setHours(+h, +m, 0, 0); return d; };

// matchAll seguro (Hermes não tem String.matchAll fiável p/ todos os casos) — clona
// o regex com flag 'g' e itera, evitando ciclos infinitos em matches vazios.
const matchAll = (str, re) => {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const out = []; let m;
  while ((m = g.exec(str))) { out.push(m); if (m.index === g.lastIndex) g.lastIndex++; }
  return out;
};
const firstBareTime = (str) => { const m = str.match(/\b(\d{1,2}):(\d{2})\b/); return m ? norm(m[1], m[2]) : null; };

// O tipo de não-voo de uma linha (o posicionamento é uma perna, não entra aqui).
const nonFlightKind = (line, codes) => {
  if (codes.standbyHome && codes.standbyHome.test(line)) return 'standby_home';
  if (codes.standbyAirport && codes.standbyAirport.test(line)) return 'standby_airport';
  if (codes.training && codes.training.test(line)) return 'training';
  if (codes.office && codes.office.test(line)) return 'office';
  return null;
};
const STANDBY = new Set(['standby_home', 'standby_airport']);

// Texto colado → { activities, nonflights, diag, vacDates, sickDates }. `activities`/`nonflights` têm o
// mesmo formato que o import por calendário (getDutiesInRange / getNonFlightInRange),
// logo passam direto por buildImportCandidates. `diag` = resumo por dia (para o 🔧).
// `opts.baseOf(dia)` = a base em vigor (para a regra do repouso que separa serviços — a mesma do calendário).
export function parseEasyjetRoster(text, company, opts = {}) {
  const codes = codesFor(company);
  const fltG = new RegExp(codes.flightNo.source, 'gi');

  // 1) Agrupar linhas em blocos por DATA (linhas antes da 1.ª data = cabeçalho → fora).
  const lines = String(text || '').split(/\r?\n/).map((s) => s.trim());
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const dm = line.match(RE_DATE);
    if (dm) { cur = { iso: mkISO(dm[1], dm[2], dm[3]), lines: [line] }; blocks.push(cur); }
    else if (cur && line) cur.lines.push(line);
  }

  const legsAll = [], fixActs = [], nonflights = [], diag = [], vacDates = [], sickDates = [];
  for (const b of blocks) {
    const blob = b.lines.join(' ');
    const L = b.lines.map((line) => {
      const routes = matchAll(line, RE_ROUTE).map((m) => [m[1], m[2]]).filter(([a, c]) => a !== c);
      const ranges = matchAll(line, RE_LEG).map((m) => ({ off: norm(m[1], m[2]), on: norm(m[3], m[4]), idx: m.index }));
      const fl = matchAll(line, fltG).map((m) => m[0].toUpperCase().replace(/\s+/g, ''));
      return { line, routes, ranges, fl, dh: !!(codes.positioning && codes.positioning.test(line)), cnx: RE_CNX.test(line), nf: routes.length ? null : nonFlightKind(line, codes) };
    });
    // A apresentação: a 1.ª hora "solta" ANTES da 1.ª perna (coluna Report, à esquerda das Actual). Sem ela → por saber.
    let report = null, reportLine = -1;
    for (let i = 0; i < L.length; i++) {
      const seg = L[i].ranges.length ? L[i].line.slice(0, L[i].ranges[0].idx) : L[i].line;
      const t = firstBareTime(seg.replace(RE_DATE, ' '));
      if (t) { report = t; reportLine = i; break; }
      if (L[i].ranges.length) break;
    }
    // Férias e doença (A-236): o dia é sugerido na folha, como no calendário.
    const hasRoute = L.some((x) => x.routes.length);
    if (!hasRoute && codes.dayOff && codes.dayOff.test(blob)) {
      if (/\b(LVE|ANL|VAC)\b/i.test(blob)) vacDates.push(b.iso);
      if (/\bSICK\b/i.test(blob)) sickDates.push(b.iso);
      diag.push({ iso: b.iso, kind: 'off', label: blob.match(codes.dayOff)?.[0] || 'off', route: null, report: null, sectors: 0 });
      continue;
    }

    // 2) Não-voos do dia (linhas com um código de não-voo e sem rota). As horas "A..-A.." da própria linha são o início e o fim.
    const nfLines = L.map((x, i) => ({ ...x, i })).filter((x) => x.nf);
    const routeLines = L.map((x, i) => ({ ...x, i })).filter((x) => x.routes.length);
    const nfs = nfLines.map((x) => {
      const r = x.ranges[0] || null;
      const ownsReport = reportLine === x.i || (!routeLines.length && nfLines.length === 1);
      const start = r ? r.off : (ownsReport ? report : null);
      const eLearning = x.nf === 'training' && /\bCBTB?\b/i.test(x.line);
      const ofc8 = x.nf === 'office' && /\bOFC\s?8\b/i.test(x.line);
      return { kind: x.nf, start, end: r ? r.on : null, ownsReport, ...(eLearning ? { eLearning: true } : {}), ...(ofc8 ? { officeType: 'ofc8' } : {}) };
    });

    // 3) Pernas: linha a linha quando a linha traz a rota E as horas; senão (cada célula numa linha) pela ordem, só se as
    // contagens baterem. Uma rota sem horas e sem marca de cancelada, ou contagens que não batem → a corrigir.
    let legs = [], needsFix = null;
    const live = routeLines.filter((x) => !x.cnx);
    const perLine = live.some((x) => x.ranges.length);
    if (perLine) {
      for (const x of live) {
        if (x.routes.length !== 1 || x.ranges.length !== 1) { needsFix = 'times'; break; }
        legs.push({ dep: x.routes[0][0], arr: x.routes[0][1], off: x.ranges[0].off, on: x.ranges[0].on, flightNo: x.fl.length === 1 ? x.fl[0] : null, dh: x.dh });
      }
    } else if (live.length) {
      const routes = live.flatMap((x) => x.routes.map((r) => ({ r, dh: x.dh })));
      const times = L.filter((x) => !x.nf).flatMap((x) => x.ranges);
      const flLines = L.filter((x) => x.fl.length && !x.routes.length);
      const flights = flLines.flatMap((x) => x.fl.map((f) => ({ f, dh: x.dh })));
      const numbered = flights.length === routes.length;
      const dhKnown = numbered || !L.some((x) => x.dh && !x.routes.length);
      if (times.length !== routes.length || !dhKnown || routeLines.some((x) => x.cnx)) needsFix = 'times';
      routes.forEach(({ r, dh }, k) => legs.push({ dep: r[0], arr: r[1], off: needsFix ? null : times[k].off, on: needsFix ? null : times[k].on, flightNo: numbered ? flights[k].f : null, dh: dh || (numbered && flights[k].dh) }));
    }

    // 4) A apresentação do voo. Do standby: o standby acaba quando o tripulante se apresenta (CS FTL.1.225(b)(5)) — com o fim do
    // standby na linha, é essa a apresentação do voo; o ADTY sem horas é serviço no aeroporto e o PSV conta desde a sua
    // apresentação (ORO.FTL.225(d)), sem standby à parte. Formação/escritório antes de um voo não dizem a apresentação do voo.
    let flightReport = report;
    const owner = nfs.find((n) => n.ownsReport);
    if (legs.length && owner) {
      if (STANDBY.has(owner.kind) && owner.end) flightReport = owner.end;
      else if (owner.kind === 'standby_airport' && !owner.end) { flightReport = report; nfs.splice(nfs.indexOf(owner), 1); }
      else flightReport = null;
    }
    // Um fim de standby DEPOIS da 1.ª saída não pode ser a apresentação (revisão do bloco 4, R1: as pernas passavam para o dia
    // seguinte e o PSV "excedia"): é o fim planeado, não a hora da chamada → a apresentação fica por saber.
    if (owner && STANDBY.has(owner.kind) && owner.end && legs[0] && legs[0].off && owner.end > legs[0].off) flightReport = null;
    // Uma perna cancelada que parte o encadeamento do dia (R2: LIS-LGW, LGW-LIS cancelada, LIS-OPO-LIS) → a corrigir: senão o dia
    // partia-se em dois serviços, com uma pernoita e um repouso inventados.
    if (!needsFix && routeLines.some((x) => x.cnx) && legs.some((l, i) => i > 0 && l.dep !== legs[i - 1].arr)) needsFix = 'times';
    for (const n of nfs) {
      const { ownsReport: _o, ...it } = n;
      nonflights.push({ dateISO: b.iso, ...it });
      diag.push({ iso: b.iso, kind: n.kind, label: n.kind, route: null, report: n.start, sectors: 0, ...(n.end ? {} : { warn: 'sem fim' }) });
    }

    if (!legs.length) {
      if (!nfs.length) diag.push({ iso: b.iso, kind: 'other', label: blob.slice(0, 24), route: null, report, sectors: 0, warn: routeLines.length ? 'cancelado' : 'não reconhecido' });
      continue;
    }
    // Instantes: as horas do dia, cada perna depois da anterior (passar a meia-noite → dia seguinte).
    let prevEnd = flightReport ? mkDate(b.iso, flightReport) : null;
    const out = legs.map((l, i) => {
      let startDate = l.off ? mkDate(b.iso, l.off) : null;
      let endDate = l.on ? mkDate(b.iso, l.on) : null;
      if (startDate && prevEnd && startDate < prevEnd) { startDate = new Date(+startDate + DAY); endDate = endDate && new Date(+endDate + DAY); }
      if (startDate && endDate && endDate < startDate) endDate = new Date(+endDate + DAY);
      if (endDate) prevEnd = endDate;
      const rep = i === 0 && flightReport ? { report: flightReport, reportDate: mkDate(b.iso, flightReport) } : { report: null };
      return { flightNo: l.flightNo, depAirport: l.dep, arrAirport: l.arr, depTime: l.off, arrTime: l.on, startDate, endDate, dateISO: b.iso, ...rep, ...(l.dh ? { dh: true } : {}) };
    });
    const route = [out[0].depAirport, ...out.map((l) => l.arrAirport)].join('-');
    const sectors = out.filter((l) => !l.dh).length;
    if (needsFix) fixActs.push({ dateISO: b.iso, sectors, legs: out, needsFix });
    else legsAll.push(...out);
    diag.push({ iso: b.iso, kind: sectors ? 'flight' : 'positioning', label: out.map((l) => l.flightNo).filter(Boolean).join(' ') || route, route, report: flightReport, sectors, ...(needsFix ? { warn: 'horas por confirmar' } : {}) });
  }
  // As pernas de todos os dias, agrupadas como no calendário (o repouso mínimo separa serviços).
  const activities = [...buildDuties(legsAll, opts), ...fixActs].sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));
  return { activities, nonflights, diag, vacDates, sickDates };
}

// Guarda SUAVE de "companhia errada": a escala parece de OUTRA companhia (ou é o PDF/
// calendário errado)? SÓ sinaliza quando a esmagadora maioria dos dias NÃO foi reconhecida
// (kind 'other'). Amostra pequena → não arrisca o aviso. NUNCA bloqueia — o chamador mostra
// um aviso e deixa o utilizador decidir (um bloqueio duro rejeitaria uma escala válida com
// códigos invulgares = falso-negativo, pior). Pura → testável por golden.
export function rosterLooksForeign(diag, { minItems = 3, threshold = 0.7 } = {}) {
  const items = Array.isArray(diag) ? diag : [];
  if (items.length < minItems) return false;
  const other = items.filter((d) => d && d.kind === 'other').length;
  return other / items.length >= threshold;
}
