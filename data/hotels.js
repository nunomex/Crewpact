// Hotéis de pernoita — catálogo pessoal POR ESTAÇÃO (a companhia usa o mesmo hotel em
// cada destino; regista-se uma vez, reutiliza-se sempre). Módulo PURO.
// Forma: { [IATA]: { name, phone?, note? } } — LOCAL no dispositivo (cp_hotels_<uid>);
// "onde durmo" não precisa de viajar para servidor nenhum (RGPD-leve).
//
// SEM GPS nem APIs de lugares: a ESCALA já diz onde vais dormir (a estação deriva da
// rota/setores, como o endsAwayReliable do motor); os mapas abrem por DEEP LINK do sistema.

// Estação da pernoita de um serviço: o ÚLTIMO aeroporto real (legs > rota) quando é
// diferente da base. null = não derivável (ex. pernoita manual sem rota → a folha pergunta).
export const nightStopStation = (duty, base) => {
  if (!duty) return null;
  const b = String(base || '').trim().toUpperCase();
  let last = (Array.isArray(duty.legs) && duty.legs.length) ? duty.legs[duty.legs.length - 1].arr : null;
  if (!last && duty.route) { const aps = String(duty.route).split(/[^A-Za-z]+/).filter(Boolean); last = aps[aps.length - 1]; }
  if (!last) return null;
  last = String(last).trim().toUpperCase();
  return (b && last === b) ? null : last;
};

// Deep link dos mapas (nome + estação na pesquisa). iOS → Apple Maps; resto → Google Maps.
export const hotelMapsUrl = (name, station, os = 'ios') => {
  const q = encodeURIComponent([name, station].filter(Boolean).join(' '));
  return os === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
};

// Deep link de DIREÇÕES hotel → aeroporto. O "quanto tempo até ao aeroporto?" é do
// Maps (ETA vivo, com trânsito) — nós não calculamos nem mostramos minutos nossos
// (Constituição §6: nenhum número sem fonte; um "15 min" estático mentia à hora de ponta).
// Origem = nome do hotel + cidade (ou estação); destino = "IATA airport" (os dois Maps resolvem).
export const hotelDirectionsUrl = (name, station, os = 'ios', city = '') => {
  const from = encodeURIComponent([name, city || station].filter(Boolean).join(' '));
  const to = encodeURIComponent(`${String(station || '').trim().toUpperCase()} airport`);
  return os === 'ios'
    ? `http://maps.apple.com/?saddr=${from}&daddr=${to}`
    : `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}`;
};

// Estadias por estação, derivadas da ESCALA (a fonte): dias não apagados com pernoita
// (serviço principal ou extra do split-duty) cuja estação deriva da rota/legs.
// → { [IATA]: [{ date:'YYYY-MM-DD', flightNo }] } ordenado por data ascendente.
export const staysByStation = (duties, base) => {
  const out = {};
  for (const date in (duties || {})) {
    const d = duties[date];
    if (!d || d.deleted) continue;
    const svcs = [d, ...(Array.isArray(d.extra) ? d.extra : [])];
    const ns = svcs.find((sv) => sv && sv.nightStop);
    if (!ns) continue;
    const st = nightStopStation(ns, base);
    if (!st) continue;
    const legs = Array.isArray(ns.legs) ? ns.legs : [];
    const flightNo = legs.length ? (legs[legs.length - 1].flightNo || null) : null;
    (out[st] = out[st] || []).push({ date, flightNo });
  }
  for (const st in out) out[st].sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
};

// ── VÁRIOS HOTÉIS POR ESTAÇÃO (2026-07-09, arquitetura de 3 níveis do founder) ──
// O ATUAL vive no TOPO do registo (compat total: Início/Escala/DutyDetail leem
// hotels[st].name como sempre); os outros em `others[]`. Dados antigos (sem others)
// migram sozinhos. idx: 0 = o atual · n≥1 = others[n-1].
export const hotelCount = (h) => (h ? 1 + ((h.others && h.others.length) || 0) : 0);
const bare = (h) => ({ name: h.name, phone: h.phone || null, note: h.note || null });
export const hotelAt = (h, idx) => {
  if (!h) return null;
  if (!idx) return bare(h);
  return (h.others && h.others[idx - 1]) || null;
};
// Editar o ATUAL preserva os outros (era o buraco do saveHotel antigo, que substituía tudo).
export const hotelSetCurrent = (h, data) => {
  const others = (h && h.others && h.others.length) ? h.others : undefined;
  return others ? { ...data, others } : { ...data };
};
// Hotel NOVO entra logo como o ATUAL ("o comandante avisou que mudou"); o antigo desce.
export const hotelAddAsCurrent = (h, data) => (h
  ? { ...data, others: [bare(h), ...(h.others || [])] }
  : { ...data });
export const hotelUpdateAt = (h, idx, data) => {
  if (!idx) return hotelSetCurrent(h, data);
  const others = [...((h && h.others) || [])];
  if (!others[idx - 1]) return h;
  others[idx - 1] = { ...data };
  return { ...bare(h), others };
};
// Promover others[idx-1] a atual — o antigo atual fica no lugar dele (troca, nada se perde).
export const hotelMakeCurrent = (h, idx) => {
  if (!h || !idx || !h.others || !h.others[idx - 1]) return h;
  const others = [...h.others];
  const pick = others[idx - 1];
  others[idx - 1] = bare(h);
  return { ...pick, others };
};
// Apagar: o atual promove o seguinte; o último limpa a estação (devolve null).
export const hotelRemoveAt = (h, idx) => {
  if (!h) return null;
  const others = [...(h.others || [])];
  if (!idx) {
    if (!others.length) return null;
    const next = others.shift();
    return others.length ? { ...next, others } : { ...next };
  }
  others.splice(idx - 1, 1);
  return others.length ? { ...bare(h), others } : bare(h);
};

const nextDayISO = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Noites CONSECUTIVAS na mesma estação fundem-se numa estadia HUMANA ("12–13 · 2 noites"):
// [{date, flightNo}] ordenado asc → [{ start, end, nights, flightNo }] asc.
// `end` = data da ÚLTIMA noite; flightNo = o voo que lá te pôs (1.ª noite).
export const stayRuns = (list) => {
  const runs = [];
  for (const x of (list || [])) {
    const last = runs[runs.length - 1];
    if (last && nextDayISO(last.end) === x.date) { last.end = x.date; last.nights += 1; }
    else runs.push({ start: x.date, end: x.date, nights: 1, flightNo: x.flightNo });
  }
  return runs;
};

// Deep link do telefone (só dígitos e +).
export const hotelTelUrl = (phone) => `tel:${String(phone || '').replace(/[^+\d]/g, '')}`;
