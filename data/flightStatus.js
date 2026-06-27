// Estado de voo ao vivo — via a Edge Function `flight-status` (proxy do AirLabs).
// A app NUNCA vê a API key: chama a função, que guarda a key como segredo no servidor.
// Devolve a forma SLIM da função ({ ok, found, status, dep:{...}, arr:{...}, delayed }),
// ou null se não houver dados / erro / sem ligação. Módulo PURO de acesso (sem UI).
import { supabase } from './supabase';

// `flight` = identificador do voo (do roster_meta.legs): IATA (ex. 'U25421') ou ICAO
// (ex. 'EJU5421'/'EZY1234'). Detetamos ICAO = 3 letras + dígitos; senão IATA.
export async function fetchFlightStatus(flight) {
  const id = String(flight || '').toUpperCase().replace(/\s+/g, '');
  if (!id) return null;
  const body = /^[A-Z]{3}\d/.test(id) ? { flight_icao: id } : { flight_iata: id };
  try {
    const { data, error } = await supabase.functions.invoke('flight-status', { body });
    if (error || !data || !data.ok || !data.found) return null;
    return data;
  } catch {
    return null;   // offline / função indisponível → degrada em silêncio (sem card)
  }
}

// Atraso de partida em minutos (preferindo o campo da API; senão deriva de agendada→estimada).
export function depDelayMin(s) {
  if (!s || !s.dep) return 0;
  if (s.dep.delayMin != null) return Math.max(0, Math.round(s.dep.delayMin));
  const sch = s.dep.scheduledTs, est = s.dep.estimatedTs || s.dep.actualTs;
  return (sch && est) ? Math.max(0, Math.round((est - sch) / 60)) : 0;
}

// Há desvio que justifique mostrar o card? atraso ≥ `minMinutes` OU status anómalo.
export function hasDeviation(s, minMinutes = 15) {
  if (!s) return false;
  const st = String(s.status || '').toLowerCase();
  if (['delayed', 'cancelled', 'canceled', 'diverted'].includes(st)) return true;
  return depDelayMin(s) >= minMinutes;
}
