import { supabase } from './supabase';

// Acesso à tabela `duties` (registo bruto da escala). Uma duty por dia
// (unique user_id + duty_date → upsert). Esta é a FONTE de dados crua; o motor
// FTL recalcula a partir daqui num passo posterior — aqui só guardamos/sincronizamos.
//   Forma na BD:  { user_id, duty_date, report_time, block_off, block_on, sectors, flight_minutes, updated_at }
//   Horas: texto "HH:MM" (hora local); flight_minutes: inteiro.
// Best-effort: devolve []/false sem lançar — offline cai para a cache local.

// Lê as duties do utilizador (mais recentes primeiro). [] em erro/sem rede.
export const fetchDuties = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('duties')
      .select('duty_date, report_time, block_off, block_on, sectors, flight_minutes, updated_at')
      .eq('user_id', userId)
      .order('duty_date', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

// Cria/atualiza a duty de um dia (upsert por user_id + duty_date).
export const upsertDuty = async (userId, d = {}) => {
  if (!userId || !d.duty_date) return false;
  try {
    const { error } = await supabase
      .from('duties')
      .upsert({
        user_id: userId,
        duty_date: d.duty_date,
        report_time: d.report_time || null,
        block_off: d.block_off || null,
        block_on: d.block_on || null,
        sectors: d.sectors || 0,
        flight_minutes: d.flight_minutes || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,duty_date' });
    return !error;
  } catch {
    return false;
  }
};

// Apaga a duty de um dia.
export const deleteDuty = async (userId, dutyDate) => {
  if (!userId || !dutyDate) return false;
  try {
    const { error } = await supabase.from('duties').delete().eq('user_id', userId).eq('duty_date', dutyDate);
    return !error;
  } catch {
    return false;
  }
};
