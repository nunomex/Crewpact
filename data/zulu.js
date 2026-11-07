// Hora Zulu (UTC) a partir da hora LOCAL DO AEROPORTO — para duties MANUAIS, que não trazem
// a Zulu autoritativa do calendário (instante absoluto) nem da API (*_time_utc). O fuso de
// cada aeroporto vem das COORDENADAS que já temos (tz-lookup), e o desvio UTC na data certa
// (com horário de verão) vem do Intl. Suposição honesta do manual: as horas são LOCAIS do
// aeroporto (off no fuso da origem, on no fuso do destino) — a convenção normal das escalas.
//
// Se o motor JS não suportar Intl com timeZone (Hermes antigo), `INTL_TZ_OK` fica false e os
// ecrãs caem no fallback do fuso do DISPOSITIVO (toZulu) — sem crashar.
import tzlookup from 'tz-lookup';
import { airportCoord } from './airports';
import { TZ_OVERRIDE } from './tzOverride';

// Auto-deteção do suporte a Intl/timeZone. 00:00Z de julho em Londres = 01:00 (UTC+1, DST).
export const INTL_TZ_OK = (() => {
  try {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' })
      .format(new Date('2021-07-01T00:00:00Z'));
    return /01/.test(s);
  } catch { return false; }
})();

// Desvio (min) de um fuso IANA num dado instante UTC. O formatador de cada fuso guarda-se (criá-lo é o
// mais caro no Hermes; os limites do longo curso pedem centenas de consultas).
const DTF = new Map();
const dtfFor = (tz) => {
  let f = DTF.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); DTF.set(tz, f); }
  return f;
};
// Guardado por fuso e por quarto de hora UTC: os desvios são múltiplos de 15 min e as mudanças de hora são a horas locais
// certas, logo caem sempre no início de um quarto de hora UTC — dentro de um quarto de hora o desvio não muda (exato). A
// recuperação e a noite no fuso de aclimatação (ORO.FTL.105(8)/(9)) pedem milhares de consultas por escala.
const TZOFF = new Map();
const tzOffsetMin = (tz, atUTC) => {
  const ms = atUTC.getTime();
  const key = `${tz}|${Math.floor(ms / 900000)}`;
  const hit = TZOFF.get(key);
  if (hit !== undefined) return hit;
  const dtf = dtfFor(tz);
  const p = {}; for (const x of dtf.formatToParts(atUTC)) p[x.type] = x.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const v = Math.round((asUTC - ms) / 60000);
  if (TZOFF.size > 50000) TZOFF.clear();
  TZOFF.set(key, v);
  return v;
};

// Fuso IANA de um aeroporto (IATA/ICAO) pelas coordenadas. null se desconhecido. Guardado por código.
const TZ_CACHE = new Map();
// O tz-lookup erra perto de fronteiras e no mar: os aeroportos com o fuso errado vêm de data/tzOverride.js (conferido contra a
// IANA pelo teste; 2026-11-08: o Bahrein caía no fuso de Teerão, Pago Pago no de Apia — um dia inteiro —, Holguín no das Baamas).
export const airportTz = (code) => {
  const ov = code ? TZ_OVERRIDE[String(code).toUpperCase()] : null;
  if (ov) return ov;
  if (code && TZ_CACHE.has(code)) return TZ_CACHE.get(code);
  const co = code ? airportCoord(code) : null;
  let tz = null;
  if (co) { try { tz = tzlookup(co.lat, co.lon) || null; } catch { tz = null; } }
  if (code) TZ_CACHE.set(code, tz);
  return tz;
};

// Desvio UTC (min) da hora LEGAL de um aeroporto num instante (ms UTC) — com horário de verão.
// Cache por aeroporto e por hora: os limites do longo curso pedem centenas de consultas. null sem Intl/fuso.
const OFF_CACHE = new Map();
export const airportOffsetMin = (code, utcMs) => {
  if (!INTL_TZ_OK || !code || !Number.isFinite(utcMs)) return null;
  // Por quarto de hora (por hora errava 30 min na mudança de hora da Terra Nova e de Adelaide, que não caem à hora certa UTC).
  const key = `${code}|${Math.floor(utcMs / 900000)}`;
  if (OFF_CACHE.has(key)) return OFF_CACHE.get(key);
  const tz = airportTz(code);
  let v = null;
  if (tz) { try { v = tzOffsetMin(tz, new Date(utcMs)); } catch { v = null; } }
  OFF_CACHE.set(key, v);
  return v;
};

// Hora LOCAL "HH:MM" no aeroporto `code`, no dia `dateISO` → Zulu "HH:MM".
// null quando não dá (sem Intl, aeroporto desconhecido, ou hora inválida) → o chamador
// faz fallback (toZulu do dispositivo).
// O INSTANTE (ms UTC) da hora local "HH:MM" no aeroporto `code`, no dia `dateISO`. null quando não dá.
// Os instantes possíveis de uma hora local num aeroporto (ordenados): um, normalmente; dois na hora repetida da noite em que a
// hora atrasa; nenhum na hora que não existe quando adianta (aí fica o do airportUtcMs). [] sem fuso ou hora inválida.
export const airportUtcCands = (dateISO, hhmm, code) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!INTL_TZ_OK || !dateISO || !m) return [];
  const tz = airportTz(code);
  if (!tz) return [];
  const [Y, Mo, D] = dateISO.split('-').map(Number);
  const wall = Date.UTC(Y, Mo - 1, D, +m[1], +m[2]);
  // O mesmo desvio um dia antes e um dia depois → não há mudança de hora pelo meio → um só instante (o caso de quase sempre).
  const oA = tzOffsetMin(tz, new Date(wall - 86400000)), oB = tzOffsetMin(tz, new Date(wall + 86400000));
  if (oA === oB) return [wall - oA * 60000];
  const out = [];
  for (const probe of [wall - 86400000, wall + 86400000]) {
    const u = wall - tzOffsetMin(tz, new Date(probe)) * 60000;
    if (wall - tzOffsetMin(tz, new Date(u)) * 60000 === u && !out.includes(u)) out.push(u);
  }
  if (!out.length) { const u = airportUtcMs(dateISO, hhmm, code); if (u != null) out.push(u); }
  return out.sort((a, b) => a - b);
};
export const airportUtcMs = (dateISO, hhmm, code) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!INTL_TZ_OK || !dateISO || !m) return null;
  const tz = airportTz(code);
  if (!tz) return null;
  const [Y, Mo, D] = dateISO.split('-').map(Number);
  const wall = Date.UTC(Y, Mo - 1, D, +m[1], +m[2]);          // hora-de-parede tratada como UTC, ajusta-se
  let off = tzOffsetMin(tz, new Date(wall)), utc = wall - off * 60000;
  off = tzOffsetMin(tz, new Date(utc)); utc = wall - off * 60000;   // refina na fronteira do DST
  return utc;
};
const fmtZ = (ms) => { const d = new Date(ms); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
export const airportZulu = (dateISO, hhmm, code) => { const ms = airportUtcMs(dateISO, hhmm, code); return ms == null ? null : fmtZ(ms); };

// Fallback: hora local DO DISPOSITIVO → Zulu. Espelha appContext.toZulu, mas mantém este
// módulo PURO (sem React/RN) para os testes golden o poderem carregar.
const deviceZulu = (dateISO, hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!dateISO || !m) return null;
  const d = new Date(`${dateISO}T00:00:00`); d.setHours(+m[1], +m[2], 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// Zulu de um SETOR por PRIORIDADE (helper único, usado em todo o lado p/ não divergir):
//   1) AUTORITATIVA (offZ/onZ do calendário/API)  2) MANUAL → fuso do AEROPORTO (origem p/ off,
//   destino p/ on)  3) último recurso → fuso do DISPOSITIVO. `which` = 'off' | 'on'.
// O DIA de cada hora (a conversão usa o fuso desse dia — na noite da mudança de hora o desvio muda às 01:00/02:00):
//   • a partida é do dia seguinte se, no relógio, vem antes da `ref` (a apresentação do serviço, ou a 1.ª partida);
//   • a chegada é do dia seguinte à partida se, no relógio, vem antes dela (o voo passa a meia-noite).
// Sem `ref` a partida fica no dia `dateISO` (como antes). Revisão do 8b: os ecrãs mostravam a chegada depois da meia-noite
// com o fuso do dia anterior.
const hmOf = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const nextIso = (iso) => { const t = new Date(`${iso}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
export const legDay = (dateISO, leg, which, ref = null) => {
  if (!dateISO || !leg) return dateISO;
  const off = hmOf(leg.off), r = hmOf(ref);
  const offDay = (off != null && r != null && off < r) ? nextIso(dateISO) : dateISO;
  if (which === 'off') return offDay;
  const on = hmOf(leg.on);
  if (on == null) return offDay;
  if (off != null) return on < off ? nextIso(offDay) : offDay;
  return (r != null && on < r) ? nextIso(dateISO) : dateISO;
};
// ── A cadeia do serviço (revisão do 8b) ──
// Cada hora vira um INSTANTE real: a partida é o 1.º instante (no fuso do aeroporto, de D−1 a D+2) que não vem antes do momento
// anterior (a apresentação, no fuso da 1.ª partida, ou a chegada da perna anterior); a chegada é o 1.º instante entre 0 e 22 h
// depois da partida. Não depende de voo + fuso caber em 24 h (leste longínquo, oeste com fuso grande, linha de mudança de data).
// A Zulu autoritativa (offZ/onZ) entra da mesma maneira, como hora UTC. Sem fuso conhecido numa perna → null nessa hora (o
// chamador usa legZulu, que cai no relógio do dispositivo).
const shiftIso = (iso, n) => { const t = new Date(`${iso}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const zMs = (iso, hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); if (!m) return null; const [Y, Mo, D] = iso.split('-').map(Number); return Date.UTC(Y, Mo - 1, D, +m[1], +m[2]); };
// Os instantes possíveis da hora de uma perna no dia D+n (dois só na hora repetida da noite em que a hora atrasa).
const candsMs = (iso, n, leg, which) => {
  const day = shiftIso(iso, n);
  if (leg[which + 'Z']) { const z = zMs(day, leg[which + 'Z']); return z != null ? [z] : []; }
  return airportUtcCands(day, leg[which], which === 'off' ? leg.dep : leg.arr);
};
// Que durações de voo são possíveis entre dois aeroportos: de distância/960 km/h + 10 min a distância/600 km/h + 60 min. Só
// decide a hora repetida (as duas leituras distam 1 h); num posicionamento (pode ser por terra) ou sem coordenadas, tudo serve.
const plausibleSector = (leg, min) => {
  if (!leg || leg.dh) return true;
  const a = airportCoord(leg.dep), b = airportCoord(leg.arr);
  if (!a || !b) return true;
  const R = Math.PI / 180, h = Math.sin((b.lat - a.lat) * R / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin((b.lon - a.lon) * R / 2) ** 2;
  const km = 12742 * Math.asin(Math.sqrt(h));
  return min >= km / 16 + 10 && min <= km / 10 + 60;
};
const MAX_SECTOR_MS = 22 * 3600000;
// Folga para trás: uma partida pode estar marcada uns minutos antes da chegada anterior (chegada atrasada, partida com a hora
// programada) ou antes da apresentação (dado). 3 h nunca deixa entrar o candidato de 24 h antes (4.ª revisão do 8b).
const BACK_SLACK_MS = 3 * 3600000;
// O instante da apresentação: no fuso do aeroporto da 1.ª partida; sem ele, mas com a Zulu do calendário, o desvio do relógio sai
// da própria perna (off local − offZ, entre −12 h e +14 h) — o relógio da escala é o da 1.ª partida. null se não dá.
export const chainReportMs = (dateISO, legs = [], reportHhmm = null) => {
  if (!dateISO || !reportHhmm || !Array.isArray(legs) || !legs[0]) return null;
  // Na hora repetida, a mais cedo (é só o ponto de partida da cadeia: a partida escolhe-se a seguir).
  let prev = airportUtcCands(dateISO, reportHhmm, legs[0].dep)[0] ?? null;
  if (prev == null && legs[0].off && legs[0].offZ) {
    const a = /^(\d{1,2}):(\d{2})$/.exec(legs[0].off), z = /^(\d{1,2}):(\d{2})$/.exec(legs[0].offZ), r = zMs(dateISO, reportHhmm);
    if (a && z && r != null) {
      let d = ((+a[1]) * 60 + (+a[2])) - ((+z[1]) * 60 + (+z[2]));
      while (d > 14 * 60) d -= 1440;
      while (d < -12 * 60) d += 1440;
      prev = r - d * 60000;
    }
  }
  return prev;
};
export const legsChainMs = (dateISO, legs = [], reportHhmm = null) => {
  if (!dateISO || !Array.isArray(legs) || !legs.length) return [];
  let prev = chainReportMs(dateISO, legs, reportHhmm);
  // As partidas possíveis: as do 1.º dia (D−1 a D+2) que tem alguma que não vem antes do momento anterior (com a folga); as
  // chegadas possíveis de cada partida: as do 1.º dia com alguma entre 0 e 22 h depois. Fora da hora repetida há uma de cada.
  const offsOf = (leg) => {
    if (!(leg.off || leg.offZ)) return [];
    if (prev == null) return candsMs(dateISO, 0, leg, 'off');
    for (let n = -1; n <= 2; n++) { const cs = candsMs(dateISO, n, leg, 'off').filter((c) => c >= prev - BACK_SLACK_MS); if (cs.length) return cs; }
    return [];
  };
  const onsOf = (leg, offMs) => {
    if (!(leg.on || leg.onZ)) return [];
    for (let n = -1; n <= 3; n++) { const cs = candsMs(dateISO, n, leg, 'on').filter((c) => c > offMs && c - offMs <= MAX_SECTOR_MS); if (cs.length) return cs; }
    return [];
  };
  return legs.map((leg) => {
    if (!leg) return { offMs: null, onMs: null };
    // Na hora repetida (duas leituras): a que dá uma duração de voo possível para a distância; depois a partida que não vem antes
    // do momento anterior; e, se ainda houver duas, a conservadora — partida mais cedo, chegada mais tarde (mais voo, mais serviço).
    // Chave por ordem: [voo impossível?, partida antes do momento anterior?, partida, −chegada] — a menor ganha.
    const better = (k, b) => { for (let i = 0; i < k.length; i++) if (k[i] !== b[i]) return k[i] < b[i]; return false; };
    let best = null;
    for (const off of offsOf(leg)) {
      const ons = onsOf(leg, off);
      for (const on of (ons.length ? ons : [null])) {
        const k = [on != null && plausibleSector(leg, (on - off) / 60000) ? 0 : 1, prev == null || off >= prev ? 0 : 1, off, on != null ? -on : 0];
        if (!best || better(k, best.k)) best = { k, off, on };
      }
    }
    const offMs = best ? best.off : null, onMs = best ? best.on : null;
    if (onMs != null) prev = onMs; else if (offMs != null) prev = offMs;
    return { offMs, onMs };
  });
};
// As horas Zulu "HH:MM" de cada perna pela cadeia; o que a cadeia não resolve cai no legZulu (relógio/dispositivo).
export const legsZulu = (dateISO, legs = [], reportHhmm = null) => {
  const ch = legsChainMs(dateISO, legs, reportHhmm);
  const ref = reportHhmm || (legs[0] && legs[0].off) || null;
  return (legs || []).map((leg, i) => ({
    off: ch[i] && ch[i].offMs != null ? fmtZ(ch[i].offMs) : legZulu(dateISO, leg, 'off', ref),
    on: ch[i] && ch[i].onMs != null ? fmtZ(ch[i].onMs) : legZulu(dateISO, leg, 'on', ref),
  }));
};

export const legZulu = (dateISO, leg, which, ref = null) => {
  if (!leg) return null;
  if (leg[which + 'Z']) return leg[which + 'Z'];
  const ap = which === 'off' ? leg.dep : leg.arr;
  const day = legDay(dateISO, leg, which, ref);
  if (which === 'on' && (leg.off || leg.offZ)) {
    // A chegada pelo instante da partida (0–22 h depois): não depende do relógio caber em 24 h.
    const ch = legsChainMs(legDay(dateISO, leg, 'off', ref), [leg]);
    if (ch[0] && ch[0].onMs != null) return fmtZ(ch[0].onMs);
  }
  return airportZulu(day, leg[which], ap) || deviceZulu(day, leg[which]);
};
