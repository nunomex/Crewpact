import { supabase } from './supabase';

// Tipo de atividade do dia (duty.kind). Base para o motor AE aplicar a regra certa
// (per-diem no voo, setores no standby/terra, …) e para a deteção de alterações de
// escala. Todos têm período de serviço (report) → não inclui férias/folga (ausências,
// modelo à parte). Default 'flight'. Persiste na coluna duties.kind (schema §9).
export const DUTY_KINDS = ['flight', 'standby_airport', 'standby_home', 'positioning', 'office', 'training'];

// Acesso à tabela `duties` (registo bruto da escala). Uma duty por dia
// (unique user_id + duty_date → upsert). Esta é a FONTE de dados crua; o motor
// FTL recalcula a partir daqui num passo posterior — aqui só guardamos/sincronizamos.
//   Forma na BD:  { user_id, duty_date, report_time, block_off, block_on, sectors, flight_minutes, notes, created_at }
//   Horas: texto "HH:MM" (hora local); flight_minutes: inteiro. (A BD não tem
//   `updated_at`; na leitura aliasamos `created_at`→`updated_at` para o token de
//   concorrência local do App.js continuar a funcionar sem alterações.)
//   `notes` (texto livre, não usado pela app) guarda a ROTA "LIS-OPO-LIS" → per diem AE.
// Best-effort: devolve []/false sem lançar — offline cai para a cache local.

// Lê as duties do utilizador (mais recentes primeiro). [] em erro/sem rede.
export const fetchDuties = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('duties')
      .select('duty_date, report_time, block_off, block_on, sectors, flight_minutes, notes, kind, night_stop, updated_at:created_at')
      .eq('user_id', userId)
      .order('duty_date', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

// Cria/atualiza a duty de um dia (upsert por user_id + duty_date).
// Devolve a MENSAGEM de erro (string) em falha, ou `null` em sucesso. [DIAGNÓSTICO]
export const upsertDuty = async (userId, d = {}) => {
  if (!userId || !d.duty_date) return 'sem userId/data';
  try {
    const payload = {
      user_id: userId,
      duty_date: d.duty_date,
      report_time: d.report_time || null,
      block_off: d.block_off || null,
      block_on: d.block_on || null,
      sectors: d.sectors || 0,
      flight_minutes: d.flight_minutes || 0,
      notes: d.route || d.notes || null,   // rota "LIS-OPO-LIS" para o per diem AE
      kind: d.kind || 'flight',            // tipo de atividade (voo/standby/terra…)
      night_stop: !!d.nightStop,           // paragem nocturna (abono AE, Art. 39)
    };
    let { error } = await supabase.from('duties').upsert(payload, { onConflict: 'user_id,duty_date' });
    if (error && /\b(kind|night_stop)\b/.test(error.message || '')) {
      // Colunas novas (`kind`/`night_stop`) ainda não existem (migração §9/§11 por
      // correr) → grava sem elas (degradação elegante: ficam só locais até existirem).
      const { kind, night_stop, ...legacy } = payload;
      ({ error } = await supabase.from('duties').upsert(legacy, { onConflict: 'user_id,duty_date' }));
    }
    return error ? (error.message || 'erro') : null;   // null = sucesso
  } catch (e) {
    return e?.message || 'exceção';
  }
};

// Apaga a duty de um dia. Devolve a mensagem de erro, ou `null` em sucesso.
export const deleteDuty = async (userId, dutyDate) => {
  if (!userId || !dutyDate) return 'sem dados';
  try {
    const { error } = await supabase.from('duties').delete().eq('user_id', userId).eq('duty_date', dutyDate);
    return error ? (error.message || 'erro') : null;
  } catch (e) {
    return e?.message || 'exceção';
  }
};
