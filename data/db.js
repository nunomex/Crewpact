import { supabase } from './supabase';

// Acesso à tabela `profiles` (perfil do utilizador no servidor).
//  - Forma em memória da app:  { company, crewType }
//  - Forma na base de dados:   { id, airline_id, crew_type, created_at }
//    crew_type: 'cabin' | 'pilot'. `airline_id` guarda o id/slug da companhia.
// O mapeamento vive SÓ aqui (fronteira de persistência).

const rowToProfile = (r) =>
  r ? { company: r.airline_id || null, crewType: r.crew_type || 'cabin' } : null;

// Lê o perfil do utilizador. Devolve null se não existir, em erro, ou sem rede.
export const fetchProfile = async (userId) => {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('airline_id, crew_type')
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
export const upsertProfile = async (userId, { company, crewType = 'cabin' } = {}) => {
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        airline_id: company || null,
        crew_type: crewType,
      }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
};
