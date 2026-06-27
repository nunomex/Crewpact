// Deteção de voo para AUTO-FILL do formulário (DutyFormSheet). Reproduz o padrão das
// apps de tripulação (CrewLounge/AvionLog): primeiro tenta o HISTÓRICO do utilizador
// (instantâneo, sem rede, funciona para datas futuras), e só vai à API (Edge Function
// `flight-status`) se nunca voou esse número. Depois AGREGA os legs numa duty.
//
// "Leg" normalizado: { flightNo, dep, arr, off, on, flightMin, aircraft, source }.
import { supabase } from './supabase';

export const normFlightNo = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
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
    flightMin: legBlockMin(lg), aircraft: lg.aircraft || null, source: 'history' };
}

// Converte a resposta da Edge Function (forma slim) num leg.
function apiToLeg(fno, data) {
  if (!data || !data.found && !data.dep) return null;
  const dep = data.dep || {}, arr = data.arr || {};
  return { flightNo: data.flightIata || fno, dep: dep.iata || null, arr: arr.iata || null,
    off: hm(dep.scheduled), on: hm(arr.scheduled),
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
export function aggregateLegs(legs = []) {
  const valid = (legs || []).filter((l) => l && (l.dep || l.arr));
  if (!valid.length) return null;
  const sorted = valid.slice().sort((a, b) => (toMin(a.off) ?? 9999) - (toMin(b.off) ?? 9999));
  const route = [sorted[0].dep, ...sorted.map((l) => l.arr)].filter(Boolean).join('-');
  const off = sorted[0].off || null;
  const on = sorted[sorted.length - 1].on || null;
  const flightMin = sorted.reduce((s, l) => s + (l.flightMin != null ? l.flightMin : (legBlockMin(l) || 0)), 0);
  const aircraft = (sorted.find((l) => l.aircraft) || {}).aircraft || null;
  return { route, off, on, flightMin: flightMin || null, sectors: sorted.length, aircraft, legs: sorted };
}

// Sugestão de VOLTA (CrewLounge "triangular"): rota invertida do último leg, para o user
// confirmar/escrever o nº. Só uma DICA de rota — o nº do voo de volta não é derivável.
export function suggestReturn(legs = []) {
  const last = legs && legs.length ? legs[legs.length - 1] : null;
  if (!last || !last.dep || !last.arr || last.arr === last.dep) return null;
  return { dep: last.arr, arr: last.dep };   // ex. último CDG→… ? não; invertemos o último
}
