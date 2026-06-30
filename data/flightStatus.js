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

// A lógica de desvio/atraso (PURA) vive em ./flightDelay — testável por golden (sem supabase).
// Re-exportada aqui para os consumidores continuarem a importar tudo de um só sítio.
export { depDelayMin, arrDelayMin, hasDeviation, worstDelay } from './flightDelay';
