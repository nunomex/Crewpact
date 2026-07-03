// Partilha com a família — cria o LINK TEMPORÁRIO do dia via a Edge Function
// `share-day` (a chegada de hoje, no browser, sem app). Módulo de ACESSO fino
// (sem UI); a lógica de escolher as legs é do chamador. Devolve { url, expiresAt }
// ou null (offline / função não deployed / sem sessão) — degrada em silêncio.
// (supabase é require PREGUIÇOSO dentro de createDayShare → `legsForShare` fica
// PURA e testável por golden em Node, sem arrastar RN/AsyncStorage.)

// duty → legs mínimas p/ o link: [{flight, dep, arr}] por ordem. Usa roster_meta.legs
// (têm nº de voo); sem legs, cai para flightNo+rota (1 perna). PURA (testável).
export const legsForShare = (duty) => {
  const out = [];
  const legs = Array.isArray(duty?.legs) ? duty.legs : [];
  for (const lg of legs) {
    const flight = String(lg?.flightNo || lg?.flight || '').toUpperCase().replace(/\s+/g, '');
    if (!flight) continue;
    out.push({ flight, dep: String(lg?.dep || '').toUpperCase(), arr: String(lg?.arr || '').toUpperCase() });
  }
  if (out.length) return out;
  // Fallback: nº único + primeira/última estação da rota.
  const flight = String(duty?.flightNo || '').toUpperCase().replace(/\s+/g, '');
  const codes = String(duty?.route || '').split('-').map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (flight && codes.length >= 2) return [{ flight, dep: codes[0], arr: codes[codes.length - 1] }];
  return [];
};

export async function createDayShare({ date, legs }) {
  if (!date || !Array.isArray(legs) || !legs.length) return null;
  try {
    const { supabase } = require('./supabase');
    const { data, error } = await supabase.functions.invoke('share-day', { body: { date, legs } });
    if (error || !data || !data.ok || !data.url) return null;
    return { url: data.url, expiresAt: data.expiresAt || null };
  } catch {
    return null;
  }
}

// ── FAMÍLIA — links PERMANENTES ("Flighty Friends" camada 1): um por pessoa,
// mostra sempre a chegada de HOJE (a Edge resolve o dia na tabela duties).
// Todos degradam para null/false em offline — a UI diz "precisa de internet".
const invokeFamily = async (body) => {
  const { supabase } = require('./supabase');
  const { data, error } = await supabase.functions.invoke('share-day', { body });
  return (error || !data || !data.ok) ? null : data;
};

export async function familyLinks() {
  try { const d = await invokeFamily({ familyAction: 'list' }); return d ? (d.links || []) : null; }
  catch { return null; }
}

export async function createFamilyLink(label) {
  const lbl = String(label || '').trim();
  if (!lbl) return null;
  try { const d = await invokeFamily({ familyAction: 'create', label: lbl }); return d && d.url ? { id: d.id, label: d.label, url: d.url } : null; }
  catch { return null; }
}

export async function revokeFamilyLink(id) {
  if (!id) return false;
  try { return !!(await invokeFamily({ familyAction: 'revoke', id })); }
  catch { return false; }
}
