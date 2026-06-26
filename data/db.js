import { supabase } from './supabase';

// Acesso à tabela `profiles` (perfil do utilizador no servidor).
//  - Forma em memória da app:  { company, crewType }   (crewType: 'cabin' | 'pilot')
//  - Forma na base de dados:   { id, airline_id, crew_type, created_at }
//    `airline_id` guarda o id/slug da companhia.
// O mapeamento vive SÓ aqui (fronteira de persistência).
//
// FONTE ÚNICA de CATEGORIA e CONTRATO (decisão de arquitetura — Opção A):
// vivem nos METADADOS do Auth (updateUser) + cache AsyncStorage (cp_profile) — NÃO
// nesta tabela. As colunas profiles.current_category_id/contract_id e as tabelas
// airline_categories/contracts NÃO são usadas (catálogo + valores vivem em ae/*).
// → o cache é um ESPELHO derivado do metadata; o metadata é o canónico.
// (schema.sql §9 remove as colunas relacionais mortas.)

// A coluna `profiles.crew_type` é um enum em MAIÚSCULAS na BD
// (CHECK: 'CABIN_CREW' | 'PILOT'); a app usa 'cabin' | 'pilot'. Converter nos
// dois sentidos aqui — sem isto o upsert falha o CHECK (23514) e nada sincroniza.
const toDbCrew = (crewType) => (crewType === 'pilot' ? 'PILOT' : 'CABIN_CREW');
const fromDbCrew = (v) => (v === 'PILOT' ? 'pilot' : 'cabin');

const rowToProfile = (r) =>
  r ? { company: r.airline_id || null, crewType: fromDbCrew(r.crew_type) } : null;

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

// Catálogo de BASES de tripulação (tabela `bases`, por companhia). A base
// escolhida pelo utilizador fica nos metadados do Auth (como o CÓDIGO) — esta
// tabela é só o catálogo que o picker mostra e de onde se resolve cidade/país.
// Degrada com elegância ([]) se a tabela ainda não existir (igual a fetchAirlines).
export const fetchBases = async () => {
  try {
    const { data, error } = await supabase.from('bases').select('*').eq('active', true).order('country_code').order('city');
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

// Catálogo de PAÍSES (tabela `countries`) — rótulos dos grupos do picker de base.
export const fetchCountries = async () => {
  try {
    const { data, error } = await supabase.from('countries').select('*');
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
        crew_type: toDbCrew(crewType),
      }, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
};
