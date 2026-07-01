-- ════════════════════════════════════════════════════════════════════════════
-- CrewPact · CRON — eliminação definitiva após o período de graça (RGPD Art. 17)
-- ════════════════════════════════════════════════════════════════════════════
-- Par do soft-delete: a Edge Function `delete-account` marca
-- `auth.users.raw_app_meta_data->>'deletion_scheduled_at'` (= agora + 7 d). Este cron
-- corre 1×/dia e apaga de vez quem já passou o prazo. As CASCADES fazem o resto:
--   • auth.users → public.profiles  (schema.sql §1, ON DELETE CASCADE)
--   • public.profiles → public.duties (schema.sql §5, ON DELETE CASCADE)
--   • auth.identities / sessions / refresh_tokens (FK do GoTrue, cascade) — automático.
--
-- COMO APLICAR (uma vez, no SQL Editor do Supabase):
--   1. Database → Extensions → ativar `pg_cron` (e `pg_net` NÃO é preciso — é delete SQL direto).
--   2. Correr este ficheiro inteiro no SQL Editor. Idempotente.
-- VERIFICAR:  select jobname, schedule, active from cron.job where jobname = 'crewpact-purge-deletions';
-- CORRER JÁ (teste): select public.purge_scheduled_deletions();
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;

-- Função: apaga as contas cuja marca de eliminação já expirou. SECURITY DEFINER para ter
-- privilégio de apagar em auth.users (corre como o dono = postgres no SQL Editor).
create or replace function public.purge_scheduled_deletions()
returns integer language plpgsql security definer as $$
declare n integer;
begin
  with gone as (
    delete from auth.users
    where (raw_app_meta_data ->> 'deletion_scheduled_at') is not null
      and (raw_app_meta_data ->> 'deletion_scheduled_at')::timestamptz < now()
    returning 1
  )
  select count(*) into n from gone;
  return n;   -- nº de contas apagadas nesta passagem
end $$;

-- Agenda diária às 03:00 UTC. Idempotente (remove a agenda antiga primeiro, se existir).
do $$
begin
  perform cron.unschedule('crewpact-purge-deletions');
exception when others then null;   -- ainda não existia → ignora
end $$;

select cron.schedule('crewpact-purge-deletions', '0 3 * * *', $$ select public.purge_scheduled_deletions(); $$);
