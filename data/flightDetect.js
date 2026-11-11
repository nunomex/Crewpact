// Deteção de voo para AUTO-FILL do formulário (DutyFormSheet). Reproduz o padrão das
// apps de tripulação (CrewLounge/AvionLog): primeiro tenta o HISTÓRICO do utilizador
// (instantâneo, sem rede, funciona para datas futuras), e só vai à API (Edge Function
// `flight-status`) se nunca voou esse número. Depois AGREGA os legs numa duty.
//
// "Leg" normalizado: { flightNo, dep, arr, off, on, flightMin, aircraft, source }.
import { supabase } from './supabase';
import { airportZulu } from './zulu';

export const normFlightNo = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
// Nº de voo COMPLETO = designador (sigla) + número. Ex. EJU7625, U27625, TP1923, FR1234.
// Só dígitos ("7625"), só letras ("EJU") ou vazio → incompleto (falta o número do voo) → vermelho.
export const isCompleteFlightNo = (s) => /^[A-Z][A-Z0-9]{1,2}\d{1,5}$/.test(normFlightNo(s));
const hm = (dt) => { const m = /\b(\d{2}):(\d{2})\b/.exec(String(dt || '')); return m ? `${m[1]}:${m[2]}` : null; };
const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
// Tempo de bloco de um leg (on − off), com volta-a-meia-noite. null se faltar.
const legBlockMin = (lg) => {
  const o = toMin(lg.off), n = toMin(lg.on);
  if (o == null || n == null) return null;
  return n >= o ? n - o : n + 1440 - o;
};

// ── HISTÓRICO (puro, sem rede): o leg MAIS RECENTE com este nº de voo nas duties guardadas. ──
export function legFromHistory(flightNo, duties = {}) {
  const fno = normFlightNo(flightNo);
  if (!fno) return null;
  let best = null;   // { iso, leg }
  for (const iso in duties) {
    const d = duties[iso];
    if (!d || d.deleted || !Array.isArray(d.legs)) continue;
    const leg = d.legs.find((lg) => normFlightNo(lg.flightNo) === fno);
    if (leg && (!best || iso > best.iso)) best = { iso, leg };
  }
  if (!best) return null;
  const lg = best.leg;
  return { flightNo: fno, dep: lg.dep || null, arr: lg.arr || null, off: lg.off || null, on: lg.on || null,
    offZ: lg.offZ || null, onZ: lg.onZ || null,   // preserva a Zulu autoritativa já guardada
    flightMin: legBlockMin(lg), aircraft: lg.aircraft || null, source: 'history' };
}

// Converte a resposta da Edge Function (forma slim) num leg.
function apiToLeg(fno, data) {
  if (!data || !data.found && !data.dep) return null;
  const dep = data.dep || {}, arr = data.arr || {};
  // Mantém o número COMO O ESCREVESTE (ex. EJU7625, o ICAO da escala) — não troca pelo IATA da
  // API (easyJet Europe: ICAO EJU = IATA EC → "EJU7625" apareceria "EC7625"; é o MESMO voo).
  return { flightNo: fno || data.flightIcao || data.flightIata, dep: dep.iata || null, arr: arr.iata || null,
    off: hm(dep.scheduled), on: hm(arr.scheduled),
    offZ: hm(dep.scheduledUtc) || null, onZ: hm(arr.scheduledUtc) || null,   // Zulu AUTORITATIVA da API (dep/arr_time_utc)
    flightMin: data.duration != null ? data.duration : null,
    aircraft: (data.aircraft && data.aircraft.type) || null, source: 'api' };
}

// ── API (rede): consulta a Edge Function (proxy AirLabs) por um nº de voo. ──
export async function legFromApi(flightNo) {
  const fno = normFlightNo(flightNo);
  if (!fno) return null;
  const body = /^[A-Z]{3}\d/.test(fno) ? { flight_icao: fno } : { flight_iata: fno };
  try {
    const { data, error } = await supabase.functions.invoke('flight-status', { body });
    if (error || !data || !data.ok || !data.found) return null;
    return apiToLeg(fno, data);
  } catch { return null; }
}

// Deteção combinada: histórico primeiro, API a seguir. Devolve o leg ou null.
export async function detectLeg(flightNo, duties = {}) {
  return legFromHistory(flightNo, duties) || await legFromApi(flightNo);
}

// ── Agregação dos legs numa DUTY (regra de ouro: tempo de voo = SOMA por leg). ──
// Devolve { route, off, on, flightMin, sectors, aircraft, legs } ou null.
// A ORDEM (auditoria A-249/A-250): nunca pela hora do relógio sozinha — um serviço que passa a meia-noite ficava com a rota
// invertida (22:30 depois de 01:05) e acabava "fora", com pernoita a mais.
//   · Com a apresentação (`report`): pelos minutos DEPOIS dela (3 h de folga para trás: uma partida pode estar marcada uns
//     minutos antes da apresentação).
//   · Sem ela: a ordem do relógio (o serviço não passa a meia-noite) — a menos que o intervalo da NOITE (da última chegada à
//     1.ª partida do relógio) seja curto de mais para ser o fim do serviço (menos de 8 h: um serviço não dura mais de 16 h);
//     aí o serviço passa a meia-noite e começa depois do MAIOR intervalo sem voo. (Revisão independente, E1: só pelo maior
//     intervalo, um repartido com 10 h 30 de pausa ao meio do dia começava à tarde.)
//   · Uma perna sem horas (introduzida à mão) fica ONDE foi introduzida; as que têm horas ordenam-se entre si.
//   · Com a apresentação E a data (`date`): pelos INSTANTES — cada partida no fuso do seu aeroporto. O relógio sozinho troca
//     um longo curso para leste (LIS 09:00 → SIN, e de lá às 07:30: no relógio as 07:30 vêm "antes" da apresentação das 08:00).
//     A apresentação está no relógio da 1.ª partida, que ainda não se sabe qual é: experimenta-se cada perna como 1.ª e fica a
//     que sai mesmo em 1.º com a partida mais perto DEPOIS da apresentação. Sem fuso em alguma perna, o relógio (acima).
// Quem chama guarda `legs` (a mesma ordem da rota): as horas de cada perna não podem ficar pelo índice de outra.
const ORDER_SLACK_MIN = 180;
const NIGHT_GAP_MIN = 480;
export function aggregateLegs(legs = [], { report = null, date = null } = {}) {
  const valid = (legs || []).filter((l) => l && (l.dep || l.arr));
  if (!valid.length) return null;
  const timed = valid.filter((l) => toMin(l.off) != null);
  let start = toMin(report);
  if (start != null) start -= ORDER_SLACK_MIN;
  else if (timed.length > 1) {
    const byClock = timed.slice().sort((a, b) => toMin(a.off) - toMin(b.off));
    const gaps = byClock.map((l, i) => {
      const prev = byClock[(i - 1 + byClock.length) % byClock.length];
      let gap = toMin(l.off) - (toMin(prev.on) ?? toMin(prev.off)); while (gap < 0) gap += 1440;
      return gap;
    });
    start = 0;   // a ordem do relógio
    if (gaps[0] < NIGHT_GAP_MIN) { let best = -1; gaps.forEach((g, i) => { if (g > best) { best = g; start = toMin(byClock[i].off); } }); }
  }
  const key = (l) => (start == null ? 0 : (((toMin(l.off) - start) % 1440) + 1440) % 1440);
  let order = timed.map((l, i) => [l, i]).sort((a, b) => (key(a[0]) - key(b[0])) || (a[1] - b[1])).map((x) => x[0]);
  if (date && toMin(report) != null && timed.length > 1) {
    const z = timed.map((l) => toMin(l.offZ) ?? toMin(airportZulu(date, l.off, l.dep)));
    if (z.every((v) => v != null)) {
      let pick = null;
      timed.forEach((f, fi) => {
        const repZ = toMin(airportZulu(date, report, f.dep));
        if (repZ == null) return;
        const st = repZ - ORDER_SLACK_MIN;
        const kz = (i) => (((z[i] - st) % 1440) + 1440) % 1440;
        const idx = timed.map((_, i) => i).sort((a, b) => (kz(a) - kz(b)) || (a - b));
        if (idx[0] !== fi) return;
        const lead = kz(fi) - ORDER_SLACK_MIN;   // da apresentação à 1.ª partida (negativo: marcada uns minutos antes)
        if (!pick || (lead >= 0 ? (pick.lead < 0 || lead < pick.lead) : (pick.lead < 0 && lead > pick.lead))) pick = { lead, idx };
      });
      if (pick) order = pick.idx.map((i) => timed[i]);
    }
  }
  let k = 0;
  const sorted = valid.map((l) => (toMin(l.off) != null ? order[k++] : l));
  const route = [sorted[0].dep, ...sorted.map((l) => l.arr)].filter(Boolean).join('-');
  const off = sorted[0].off || null;
  const on = sorted[sorted.length - 1].on || null;
  const flightMin = sorted.reduce((s, l) => s + (l.flightMin != null ? l.flightMin : (legBlockMin(l) || 0)), 0);
  const aircraft = (sorted.find((l) => l.aircraft) || {}).aircraft || null;
  return { route, off, on, flightMin: flightMin || null, sectors: sorted.length, aircraft, legs: sorted };
}
