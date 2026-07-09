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
import { codesFor } from './rosterCodes';

const pad = (n) => String(n).padStart(2, '0');
const RE_DATE  = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;                 // 01/04/2025
const RE_ROUTE = /\b([A-Z]{3})\s*-\s*([A-Z]{3})\b/g;             // LIS - SID
// Perna em "Actual times": A12:02 - A16:26  (o 'A'=Actual é opcional; /00:12 = atraso, descartado)
const RE_LEG   = /A?(\d{1,2}):(\d{2})\s*-\s*A?(\d{1,2}):(\d{2})(?:\/\d{1,2}:\d{2})?/g;

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

// KIND do dia a partir do texto do bloco. Voo (há rota/nº de voo) tem prioridade
// sobre standby/posicionamento de aeroporto; folga (FTGD/D-O) só se NÃO houver voo.
const classifyDay = (blob, routes, flights, codes) => {
  const hasFlight = flights.length > 0 || routes.length > 0;
  if (codes.standbyHome && codes.standbyHome.test(blob)) return 'standby_home';
  if (codes.standbyAirport && codes.standbyAirport.test(blob) && !hasFlight) return 'standby_airport';
  if (codes.positioning && codes.positioning.test(blob) && !hasFlight) return 'positioning';
  if (codes.training && codes.training.test(blob)) return 'training';
  if (codes.office && codes.office.test(blob)) return 'office';
  if (hasFlight) return 'flight';
  if (codes.dayOff && codes.dayOff.test(blob)) return 'off';
  return 'other';
};

// Texto colado → { activities, nonflights, diag }. `activities`/`nonflights` têm o
// mesmo formato que o import por calendário (getDutiesInRange / getNonFlightInRange),
// logo passam direto por buildImportCandidates. `diag` = resumo por dia (para o 🔧).
export function parseEasyjetRoster(text, company) {
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

  const activities = [], nonflights = [], diag = [];
  for (const b of blocks) {
    const blob = b.lines.join(' ');
    const routes = matchAll(blob, RE_ROUTE).map((m) => [m[1], m[2]]).filter(([a, c]) => a !== c);
    const flights = matchAll(blob, fltG).map((m) => m[0].toUpperCase().replace(/\s+/g, ''));
    const legTimes = matchAll(blob, RE_LEG).map((m) => ({ off: norm(m[1], m[2]), on: norm(m[3], m[4]), idx: m.index }));
    // Report = 1.ª hora "solta" ANTES da 1.ª perna (coluna Report, à esquerda das Actual).
    const cut = legTimes.length ? legTimes[0].idx : blob.length;
    const report = firstBareTime(blob.slice(0, cut)) || firstBareTime(blob);
    const kind = classifyDay(blob, routes, flights, codes);

    if (kind === 'flight') {
      // Nº de voo por leg: o RE_ROUTE já filtra same-airport (ex.: o "LIS-LIS" do
      // standby), por isso `flights` e `routes` ficam alinhados nos dias mistos.
      // GUARDA: só ato se as contagens baterem — um nº errado → API errada no "ao vivo".
      const numbered = flights.length === routes.length;
      const legs = routes.map((r, i) => {
        const lt = legTimes[i];
        const depTime = lt ? lt.off : null;
        const arrTime = lt ? lt.on : null;
        const startDate = depTime ? mkDate(b.iso, depTime) : null;
        let endDate = arrTime ? mkDate(b.iso, arrTime) : null;
        if (startDate && endDate && endDate < startDate) endDate = new Date(endDate.getTime() + 86400000); // overnight
        return { flightNo: numbered ? (flights[i] || null) : null, depAirport: r[0], arrAirport: r[1], depTime, arrTime, startDate, endDate, report: i === 0 ? report : null };
      });
      if (legs.length) {
        activities.push({ dateISO: b.iso, sectors: legs.length, legs });
        const route = [legs[0].depAirport, ...legs.map((l) => l.arrAirport)].join('-');
        diag.push({ iso: b.iso, kind: 'flight', label: flights.join(' ') || route, route, report, sectors: legs.length });
      } else {
        diag.push({ iso: b.iso, kind: 'flight', label: flights.join(' '), route: null, report, sectors: 0, warn: 'sem rota' });
      }
    } else if (kind === 'off') {
      diag.push({ iso: b.iso, kind: 'off', label: blob.match(codes.dayOff)?.[0] || 'off', route: null, report: null, sectors: 0 });
    } else if (kind !== 'other') {
      // Sinais de €€ do AE (2026-07-11): CBT/CBTB = e-learning (Art. 43 paga 0 — sem a
      // flag o piloto levava 3 NS a mais) · OFC8 = dia inteiro de escritório (3 NS).
      const eLearning = kind === 'training' && /\bCBTB?\b/i.test(blob);
      const ofc8 = kind === 'office' && /\bOFC\s?8\b/i.test(blob);
      nonflights.push({ dateISO: b.iso, kind, start: report, end: null, ...(eLearning ? { eLearning: true } : {}), ...(ofc8 ? { officeType: 'ofc8' } : {}) });
      diag.push({ iso: b.iso, kind, label: kind, route: null, report, sectors: 0 });
    } else {
      diag.push({ iso: b.iso, kind: 'other', label: blob.slice(0, 24), route: null, report, sectors: 0, warn: 'não reconhecido' });
    }
  }
  return { activities, nonflights, diag };
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
