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
const H = 3600 * 1000;

// Texto pesquisável do evento (título + local + notas).
export const eventText = (ev) => `${(ev && ev.title) || ''} ${(ev && ev.location) || ''} ${(ev && ev.notes) || ''}`;
// As horas do serviço no texto, sem a da apresentação: "RP 05:40 06:40-08:15" dava saída às 05:40 (auditoria A-238).
const timesOf = (text) => String(text || '').replace(new RegExp(RE_REPORT.source, 'gi'), ' ').match(RE_TIMES);
// Rota com dois aeroportos diferentes (o "LIS-LIS" do standby não é rota).
const routeOf = (text) => { const r = String(text || '').match(RE_ROUTE); return r && r[1] !== r[2] ? r : null; };

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

// O tipo de um EVENTO: decide o TÍTULO; só um título que não diz nada (sem código nem rota) olha para o local e as notas.
// As notas falam de tudo — "DG on board", "GND time 00:45" — e transformavam um voo em formação ou escritório (A-238).
export function classifyEvent(ev, codes) {
  const byTitle = classify(String((ev && ev.title) || ''), codes);
  return byTitle !== 'other' ? byTitle : classify(eventText(ev), codes);
}

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

// Instantes de um evento de DIA INTEIRO mantido por ter horas no texto (auditoria A-228): as horas são as do texto — as do
// próprio evento são a meia-noite (davam 24 h de voo e 0 h de assistência). As horas Zulu "(0830Z-1015Z)" passam ao relógio do
// dispositivo pelo instante. Sem horas de início e fim → { start: null, end: null }.
const allDayTimes = (ev, text) => {
  const day0 = new Date(ev.startDate); day0.setHours(0, 0, 0, 0);
  const t = timesOf(text);
  if (t) {
    const start = atDayTime(day0, +t[1], +t[2]);
    let end = atDayTime(day0, +t[3], +t[4]);
    if (end <= start) end = new Date(+end + 24 * H);
    return { start, end };
  }
  const bz = text.match(RE_BLOCKZ);
  if (bz) {
    const start = new Date(Date.UTC(day0.getFullYear(), day0.getMonth(), day0.getDate(), +bz[1], +bz[2]));
    let end = new Date(Date.UTC(day0.getFullYear(), day0.getMonth(), day0.getDate(), +bz[3], +bz[4]));
    if (end <= start) end = new Date(+end + 24 * H);
    return { start, end };
  }
  return { start: null, end: null };
};

// A apresentação explícita (RE_REPORT) no dia de `start`. O serviço começa na apresentação, que vem sempre ANTES da saída
// (pilotos Cl. 6.ª, n.º 40; cabine Cl. 4.ª, n.º 25). Se a hora das notas calhar depois da saída, é da véspera (saída depois
// da meia-noite, "RP 23:00"). Se nem assim bater com o evento (mais de 6 h antes da saída), fica por preencher — nunca adivinhada.
const REPORT_MAX_LEAD_MS = 6 * H;
const reportOf = (text, start) => {
  const rep = String(text || '').match(RE_REPORT);
  if (!rep || !start) return null;
  let reportDate = atDayTime(start, +rep[1], +rep[2]);
  if (reportDate > start) {
    const prev = new Date(reportDate); prev.setDate(prev.getDate() - 1);
    reportDate = start - prev <= REPORT_MAX_LEAD_MS ? prev : null;
  }
  return reportDate;
};

// Mapeia um evento de calendário para uma perna (ou null se não for voo / for all-day junk). Um POSICIONAMENTO com rota ("DH
// EZY7002 FNC-LIS") é uma perna também, marcada `dh` (auditoria A-225): agrupa-se com os voos do mesmo serviço — antes de operar
// é PSV mas não setor; o tempo todo é serviço (ORO.FTL.215) — e conta na localização (onde se dorme, a pernoita).
export function mapFlight(ev, codes) {
  const text = eventText(ev);
  if (isAllDayNoTime(ev, text)) return null;            // dia-inteiro sem horas → não é serviço
  const kind = classifyEvent(ev, codes);
  const route = routeOf(text);
  const dh = kind === 'positioning' && !!route;
  if (kind !== 'flight' && !dh) return null;            // só pernas (voo, ou posicionamento com rota)

  let start = new Date(ev.startDate);
  let finish = new Date(ev.endDate);
  if (ev.allDay) {
    const at = allDayTimes(ev, text);
    if (!at.start) return null;                         // dia inteiro sem horas de voo no texto → não se inventam (A-228)
    start = at.start; finish = at.end;
  }
  const flt = codes.flightNo ? text.match(codes.flightNo) : null;   // nº de voo (p/ reconcile "ao vivo")
  const times = timesOf(text);
  const ac = text.match(RE_AC);
  const reg = text.match(RE_REG);
  const base = (text.match(RE_BASE) || [])[1] || null;
  // Zulu/UTC AUTORITATIVA: a eCrew escreve-a explícita nas notas "(0830Z-1015Z)". Sem ela,
  // deriva-se do INSTANTE ABSOLUTO do evento (hhmmZ). Nunca depende do fuso do dispositivo.
  const bz = text.match(RE_BLOCKZ);

  const depTime = times ? `${pad(+times[1])}:${times[2]}` : hhmm(start);
  const arrTime = times ? `${pad(+times[3])}:${times[4]}` : hhmm(finish);
  const reportDate = reportOf(text, start);

  return {
    kind: 'flight',
    ...(dh ? { dh: true } : {}),
    flightNo: flt ? flt[0].toUpperCase().replace(/\s+/g, '') : null,
    dateISO: isoLocal(reportDate || start),   // o dia do serviço = o dia da apresentação
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
// null se for voo/folga/outro/all-day junk. O posicionamento COM rota é uma perna (mapFlight), não um não-voo.
export function mapNonFlight(ev, codes) {
  const text = eventText(ev);
  const kind = classifyEvent(ev, codes);
  if (!NONFLIGHT_KINDS.includes(kind)) return null;
  if (isAllDayNoTime(ev, text)) return null;            // dia-inteiro sem horas → não é serviço
  if (kind === 'positioning' && routeOf(text)) return null;   // é uma perna (agrupa-se com os voos)
  let start = new Date(ev.startDate);
  let finish = new Date(ev.endDate);
  let startTxt = null;
  if (ev.allDay) {
    // Dia inteiro com horas no texto (A-228): as do texto; só com a apresentação → começa nela e o fim fica por saber.
    const at = allDayTimes(ev, text);
    if (at.start) { start = at.start; finish = at.end; } else {
      const day0 = new Date(ev.startDate); day0.setHours(0, 0, 0, 0);
      const rep = text.match(RE_REPORT);
      start = rep ? atDayTime(day0, +rep[1], +rep[2]) : day0; finish = null;
      startTxt = rep ? hhmm(start) : null;
    }
  } else {
    // Posicionamento sem rota com a apresentação nas notas (A-225): começa na apresentação.
    const rd = kind === 'positioning' ? reportOf(text, start) : null;
    if (rd) start = rd;
  }
  // Sinais que mudam o €€ do AE (2026-07-11, auditoria do dinheiro): CBT/CBTB = e-learning
  // → Art. 43 paga 0 (sem a flag, o piloto levava 3 NS a mais); OFC8 = dia inteiro de
  // escritório → 3 NS (sem a flag pagava OFC4 = 1,5). Vêm do TEXTO do evento.
  const eLearning = kind === 'training' && /\bCBTB?\b/i.test(text);
  const ofc8 = kind === 'office' && /\bOFC\s?8\b/i.test(text);
  return {
    kind,
    dateISO: isoLocal(start),
    date: fmtDate(start),
    start: finish === null && ev.allDay ? startTxt : hhmm(start),
    end: finish ? hhmm(finish) : null,
    startDate: start,
    endDate: finish,
    ...(eLearning ? { eLearning: true } : {}),
    ...(ofc8 ? { officeType: 'ofc8' } : {}),
  };
}

// Um não-voo que dura MAIS de 24 h e passa por vários dias (ex.: "SEP TRAINING" de 2.ª 09:00 a 4.ª 17:00 num só evento) é um
// serviço POR DIA (auditoria A-229: só o 1.º dia contava). As horas de cada dia não estão no evento — só o início do 1.º e o fim
// do último — por isso cada dia sai `multiDay`, a corrigir (nunca horas inventadas). Até 24 h (ex.: standby das 20:00 às
// 04:00) é um só serviço que passa a meia-noite.
export function mapNonFlightDays(ev, codes) {
  const it = mapNonFlight(ev, codes);
  if (!it) return [];
  const s = it.startDate, e = it.endDate;
  if (!s || !e || +e - +s <= 24 * H || isoLocal(s) === isoLocal(new Date(+e - 1))) return [it];
  const out = [];
  const last = isoLocal(new Date(+e - 1));
  for (let d = new Date(s.getFullYear(), s.getMonth(), s.getDate()); isoLocal(d) <= last; d.setDate(d.getDate() + 1)) {
    const iso = isoLocal(d);
    const first = iso === isoLocal(s), fin = iso === last;
    const { startDate: _s, endDate: _e, ...rest } = it;
    out.push({ ...rest, dateISO: iso, date: fmtDate(d), start: first ? it.start : null, end: fin ? it.end : null, startDate: first ? s : null, endDate: fin ? e : null, multiDay: true });
  }
  return out;
}

// Expansão dia-a-dia de um evento: [início, fim) — um evento de dia inteiro acaba à meia-noite do dia seguinte; um evento com
// horas que passa por vários dias conta todos (auditoria A-229: "SICK" de 3 a 7 com horas dava só o dia 3). Partilhada pelas
// sugestões de férias e doença.
const eventDays = (ev) => {
  const out = [];
  const start = new Date(ev.startDate);
  const end = new Date(ev.endDate);
  const last = +end > +start ? new Date(+end - 1) : start;
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= last; d.setDate(d.getDate() + 1)) {
    out.push(isoLocal(d));
  }
  return out;
};

// Dias de FÉRIAS de um evento (LVE/ANL/VAC) — para o Confirmar-import SUGERIR o bloco
// como eventos vacDays (o € do AE e o saldo 22 nascem de REGISTO; isto só sugere, não
// grava). Aceita all-day multi-dia (o bloco típico das férias).
export function vacationDatesFromEvent(ev, codes) {
  const text = eventText(ev);
  if (!/\b(LVE|ANL|VAC)\b/i.test(text)) return [];
  if (codes.dayOff && !codes.dayOff.test(text)) return [];   // guarda: tem de ser folga/ausência
  return eventDays(ev);
}

// Dias de DOENÇA (SICK) — sugeridos como eventos sickDays no Confirmar-import (2026-07-10,
// a par das férias): o Art. 48 pago funciona por EPISÓDIO de dias consecutivos, e o motor
// agrupa-os a partir dos dias registados. Só sugere — gravar é decisão do utilizador.
export function sickDatesFromEvent(ev, codes) {
  const text = eventText(ev);
  if (!/\bSICK\b/i.test(text)) return [];
  if (codes.dayOff && !codes.dayOff.test(text)) return [];   // guarda: tem de ser ausência
  return eventDays(ev);
}

// ── Atividades (agrupamento de setores) ──────────────────────────────────────
// Pernas seguidas pertencem ao MESMO serviço enquanto o intervalo entre elas não pode ser um repouso (auditoria A-227: o
// limiar fixo de 6 h partia um serviço repartido legal — "O intervalo em terra deve contar todo como PSV", ORO.FTL.220(b) — e
// o 2.º bloco, sem apresentação, saía dos 210). O repouso mínimo mais baixo que a lei admite é de 10 h: fora da base
// (ORO.FTL.235(b)) e também na base quando o operador dá alojamento adequado (235(a)(2)). Junta-se só quando o intervalo é
// CERTAMENTE mais curto — medido até à apresentação seguinte (ou, sem ela, à saída: o maior possível). Um intervalo de 10 h ou
// mais é um repouso, mesmo que mais curto do que o serviço anterior: aí é um repouso CURTO (uma infração do 235, que a
// verificação aponta), nunca um PSV de dois dias (revisão do bloco 4, E1). E nunca um serviço de 24 h ou mais: as horas
// HH:MM dariam a volta ao relógio. Na dúvida ficam separados, e o repouso entre eles é verificado depois.
// `opts` fica por compatibilidade (a base já não muda o limiar).
const DEBRIEF_MIN = 30; // fim de serviço aproximado (release) só para a vista do diagnóstico
const REST_FLOOR_MS = 10 * H, MAX_DUTY_MS = 24 * H;

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
    sectors: legs.filter((l) => !l.dh).length,
    startAirport: first.depAirport,
    endAirport: last.arrAirport,
    base,
    endInBase: base ? last.arrAirport === base : null,
    legs,
  };
}

// Agrupa pernas (objetos de mapFlight, com startDate/endDate) em atividades.
export function buildDuties(legs, opts = {}) {
  void opts;
  const sorted = legs.filter((l) => l && l.startDate && l.endDate).sort((a, b) => a.startDate - b.startDate);
  const duties = [];
  let cur = null;
  for (const leg of sorted) {
    if (cur) {
      const first = cur.legs[0];
      const gap = +(leg.reportDate || leg.startDate) - +cur._lastEnd;
      const span = +leg.endDate - +(first.reportDate || first.startDate);
      if (gap < REST_FLOOR_MS && span < MAX_DUTY_MS) {
        cur.legs.push(leg);
        cur._lastEnd = leg.endDate;
        continue;
      }
      duties.push(finishDuty(cur));
    }
    cur = { legs: [leg], _lastEnd: leg.endDate };
  }
  if (cur) duties.push(finishDuty(cur));
  return duties;
}
