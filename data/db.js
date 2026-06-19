import { supabase } from './supabase';

// Acesso à tabela `profiles` (perfil do utilizador no servidor).
//  - Forma em memória da app:  { company, rank, contract }
//  - Forma na base de dados:   { id, airline_id, crew_type, crew_category, contract_type }
// O mapeamento vive SÓ aqui (fronteira de persistência) — os consumidores
// continuam a falar em company/rank/contract. `airline_id` guarda o slug atual
// (ex.: "tap-pt"); a ligação à tabela `airlines` é uma etapa posterior.

const rowToProfile = (r) =>
  r ? { company: r.airline_id || null, crewType: r.crew_type || null, rank: r.crew_category || null, contract: r.contract_type || null } : null;

// Lê o perfil do utilizador. Devolve null se não existir, em erro, ou sem rede.
export const fetchProfile = async (userId) => {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('airline_id, crew_type, crew_category, contract_type')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return rowToProfile(data);
  } catch {
    return null;
  }
};

// Catálogo de companhias (tabela `airlines`). Devolve [] em erro/sem rede.
// A app passa a usar o `id` real; `slug` fica só como ponte p/ dados legados.
export const fetchAirlines = async () => {
  try {
    const { data, error } = await supabase.from('airlines').select('*').order('name');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

// Cria ou atualiza o perfil. Best-effort: devolve true/false sem lançar.
export const upsertProfile = async (userId, { company, rank, contract, crewType = 'cabin' } = {}) => {
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        airline_id: company || null,
        crew_type: crewType,
        crew_category: rank || null,
        contract_type: contract || null,
      }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
};
