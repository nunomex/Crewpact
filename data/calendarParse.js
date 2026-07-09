// Parsing PURO de eventos de calendário → classificação + pernas de voo / não-voos.
// SEPARADO de calendar.js (que faz o I/O nativo via expo-calendar) para ser TESTÁVEL por
// golden em node, SEM o módulo nativo. calendar.js importa daqui. Determinístico, sem UI.
//
// Heurísticas pensadas para escalas easyJet e TAP (ajustar se o teu feed diferir):
//   easyJet: "EZY1234 LIS-FNC 06:40-08:15" / "U2 LIS/FNC 0640 0815"
//   TAP:     "TP1923 LIS-OPO 07:10-08:05"  / "TAP 234 LIS/MAD"

// ── Regex de parsing ──────────────────────────────────────────────────────────
export const RE_ROUTE  = /\b([A-Z]{3})\s*[-/→]\s*([A-Z]{3})\b/;                 // LIS-FNC, LIS/FNC, LIS→FNC
export const RE_TIMES  = /\b(\d{1,2})[:h.]?(\d{2})\s*[-–—/ ]\s*(\d{1,2})[:h.]?(\d{2})\b/; // 0640-0815 / 06:40 08:15
const RE_AC     = /\b(A3\d{2}|A2\d{2}|A\d{2}N|B7\d{2})\b/;               // A320, A321, A20N/A21N (neo), A330, B738
const RE_REG    = /\b(CS-[A-Z]{3})\b/;                                   // matrícula CS-EZW (easyJet) / CS-TVA (TAP)
const RE_BLOCKZ = /\((\d{2})(\d{2})Z\s*[-–—]\s*(\d{2})(\d{2})Z\)/;       // (1350Z-1615Z)
const RE_BASE   = /Local Base\s*\(([A-Z]{3})\)/i;                        // "All times in Local Base (LIS)"
// Apresentação/sign-on EXPLÍCITA (ex. "RP 0540", "Report 05:40", "C/I 0540"). SÓ se o feed a
// trouxer — NUNCA derivada de dep − 1 h (a apresentação é input FTL, define o PSV máx).
const RE_REPORT = /\b(?:RP|REPORT|SIGN[\s-]?ON|C\/?I|CHECK[\s-]?IN|APRES(?:ENTA[ÇC][AÃ]O)?)\b\s*[:=]?\s*(\d{1,2})[:h.]?(\d{2})\b/i;

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;       // hora local do dispositivo
const hhmmZ = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; // hora UTC (Zulu)
export const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // 'YYYY-MM-DD' local
const atDayTime = (ref, h, m) => { const d = new Date(ref); d.setHours(h, m, 0, 0); return d; };
const fmtDate = (d) => d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

// Texto pesquisável do evento (título + local + notas).
export const eventText = (ev) => `${(ev && ev.title) || ''} ${(ev && ev.location) || ''} ${(ev && ev.notes) || ''}`;

// KIND universal do evento a partir dos CÓDIGOS da companhia (rosterCodes). Os tipos sem-voo
// têm prioridade sobre a rota — "DH LIS-LGW" é posicionamento (não voo); "SBY LIS-LIS" é standby.
export function classify(text, codes) {
  if (codes.standbyHome && codes.standbyHome.test(text)) return 'standby_home';
  if (codes.standbyAirport && codes.standbyAirport.test(text)) return 'standby_airport';
  if (codes.positioning && codes.positioning.test(text)) return 'positioning';
  if (codes.training && codes.training.test(text)) return 'training';
  if (codes.office && codes.office.test(text)) return 'office';
  if (codes.flightNo && codes.flightNo.test(text)) return 'flight';
  if (codes.dayOff && codes.dayOff.test(text)) return 'off'; // folga/fadiga (depois do voo, p/ não apanhar aeroportos)
  const r = text.match(RE_ROUTE);
  if (r && r[1] !== r[2]) return 'flight'; // rota com aeroportos diferentes
  return 'other';
}
export const NONFLIGHT_KINDS = ['standby_airport', 'standby_home', 'positioning', 'office', 'training'];

// Evento de DIA-INTEIRO sem horas no texto = NÃO é serviço (aniversário, feriado, evento
// pessoal). Os serviços têm SEMPRE horas — no texto OU no próprio evento (start/end). Um evento
// all-day tem start/end à meia-noite (sem horas reais) → só conta como serviço se TROUXER horas
// explícitas no texto. Rede contra FALSOS POSITIVOS (ex. "Reserva" de mesa all-day que casa o
// código de standby, "Office party" que casa office). NÃO afeta serviços com horas (a maioria).
export const isAllDayNoTime = (ev, text) => {
  if (!ev || !ev.allDay) return false;
  const t = text != null ? text : eventText(ev);
  return !RE_TIMES.test(t) && !RE_BLOCKZ.test(t) && !RE_REPORT.test(t);
};

// Mapeia um evento de calendário para uma perna de voo (ou null se não for voo / for all-day junk).
export function mapFlight(ev, codes) {
  const text = eventText(ev);
  if (isAllDayNoTime(ev, text)) return null;            // dia-inteiro sem horas → não é serviço
  if (classify(text, codes) !== 'flight') return null;  // só pernas de voo

  const start = new Date(ev.startDate);
  const finish = new Date(ev.endDate);
  const route = text.match(RE_ROUTE);
  const flt = codes.flightNo ? text.match(codes.flightNo) : null;   // nº de voo (p/ reconcile "ao vivo")
  const times = text.match(RE_TIMES);
  const ac = text.match(RE_AC);
  const reg = text.match(RE_REG);
  const base = (text.match(RE_BASE) || [])[1] || null;
  // Zulu/UTC AUTORITATIVA: a eCrew escreve-a explícita nas notas "(0830Z-1015Z)". Sem ela,
  // deriva-se do INSTANTE ABSOLUTO do evento (hhmmZ). Nunca depende do fuso do dispositivo.
  const bz = text.match(RE_BLOCKZ);

  const depTime = times ? `${pad(+times[1])}:${times[2]}` : hhmm(start);
  const arrTime = times ? `${pad(+times[3])}:${times[4]}` : hhmm(finish);
  // Apresentação: SÓ se o evento a trouxer EXPLÍCITA (RE_REPORT). NUNCA dep − 1 h.
  const rep = text.match(RE_REPORT);
  const reportDate = rep ? atDayTime(start, +rep[1], +rep[2]) : null;

  return {
    kind: 'flight',
    flightNo: flt ? flt[0].toUpperCase().replace(/\s+/g, '') : null,
    dateISO: isoLocal(start),
    date: fmtDate(start),
    report: reportDate ? hhmm(reportDate) : null,
    reportDate,
    depTime,
    arrTime,
    depTimeZ: bz ? `${bz[1]}:${bz[2]}` : hhmmZ(start),
    arrTimeZ: bz ? `${bz[3]}:${bz[4]}` : hhmmZ(finish),
    reportZ: reportDate ? hhmmZ(reportDate) : null,
    depAirport: route ? route[1] : '—',
    arrAirport: route ? route[2] : '—',
    aircraft: [ac && ac[1], reg && reg[1]].filter(Boolean).join(' · ') || '—',
    startDate: start,    // instante absoluto (para agrupar setores)
    endDate: finish,
    base,                // base das notas, p.ex. 'LIS' (ou null)
  };
}

// Mapeia um evento SEM-VOO (standby/posicionamento/terra/formação) → item com o KIND universal.
// null se for voo/folga/outro/all-day junk.
export function mapNonFlight(ev, codes) {
  const text = eventText(ev);
  const kind = classify(text, codes);
  if (!NONFLIGHT_KINDS.includes(kind)) return null;
  if (isAllDayNoTime(ev, text)) return null;            // dia-inteiro sem horas → não é serviço
  const start = new Date(ev.startDate);
  const finish = new Date(ev.endDate);
  // Sinais que mudam o €€ do AE (2026-07-11, auditoria do dinheiro): CBT/CBTB = e-learning
  // → Art. 43 paga 0 (sem a flag, o piloto levava 3 NS a mais); OFC8 = dia inteiro de
  // escritório → 3 NS (sem a flag pagava OFC4 = 1,5). Vêm do TEXTO do evento.
  const eLearning = kind === 'training' && /\bCBTB?\b/i.test(text);
  const ofc8 = kind === 'office' && /\bOFC\s?8\b/i.test(text);
  return {
    kind,
    dateISO: isoLocal(start),
    date: fmtDate(start),
    start: hhmm(start),
    end: hhmm(finish),
    startDate: start,
    endDate: finish,
    ...(eLearning ? { eLearning: true } : {}),
    ...(ofc8 ? { officeType: 'ofc8' } : {}),
  };
}

// Dias de FÉRIAS de um evento (LVE/ANL/VAC) — para o Confirmar-import SUGERIR o bloco
// como eventos vacDays (o € do AE e o saldo 22 nascem de REGISTO; isto só sugere, não
// grava). Aceita all-day multi-dia (o bloco típico das férias) → expande dia a dia.
export function vacationDatesFromEvent(ev, codes) {
  const text = eventText(ev);
  if (!/\b(LVE|ANL|VAC)\b/i.test(text)) return [];
  if (codes.dayOff && !codes.dayOff.test(text)) return [];   // guarda: tem de ser folga/ausência
  const out = [];
  const start = new Date(ev.startDate);
  const end = new Date(ev.endDate);
  // All-day termina à meia-noite do dia seguinte → [start, end); com horas → só o dia de início.
  const last = ev.allDay ? new Date(end.getTime() - 1) : start;
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= last; d.setDate(d.getDate() + 1)) {
    out.push(isoLocal(d));
  }
  return out;
}

// ── Atividades (agrupamento de setores) ──────────────────────────────────────
// Pernas seguidas com pouco intervalo pertencem à mesma atividade; um repouso (≥ 10–12 h)
// separa atividades → um limiar de 6 h distingue turnarounds/split-duty de um repouso real.
const DUTY_GAP_MS = 6 * 3600 * 1000;
const DEBRIEF_MIN = 30; // debrief após os últimos calços → fim de serviço (release)

// Fecha uma atividade: report (início da 1ª perna), release (fim da última + debrief), setores…
function finishDuty(d) {
  const legs = d.legs;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const release = new Date(last.endDate.getTime() + DEBRIEF_MIN * 60 * 1000);
  const base = legs.map(l => l.base).find(Boolean) || null;
  return {
    dateISO: first.dateISO,
    report: first.report || null,        // apresentação REAL do 1.º evento (ou null se o feed não a traz)
    reportDate: first.reportDate || null,
    release: hhmm(release),
    releaseDate: release,
    sectors: legs.length,
    startAirport: first.depAirport,
    endAirport: last.arrAirport,
    base,
    endInBase: base ? last.arrAirport === base : null,
    legs,
  };
}

// Agrupa pernas (objetos de mapFlight, com startDate/endDate) em atividades.
export function buildDuties(legs) {
  const sorted = legs.filter(Boolean).sort((a, b) => a.startDate - b.startDate);
  const duties = [];
  let cur = null;
  for (const leg of sorted) {
    if (cur && leg.startDate - cur._lastEnd <= DUTY_GAP_MS) {
      cur.legs.push(leg);
      cur._lastEnd = leg.endDate;
    } else {
      if (cur) duties.push(finishDuty(cur));
      cur = { legs: [leg], _lastEnd: leg.endDate };
    }
  }
  if (cur) duties.push(finishDuty(cur));
  return duties;
}
