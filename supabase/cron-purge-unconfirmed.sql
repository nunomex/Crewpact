-- ════════════════════════════════════════════════════════════════════════════
-- CrewPact · CRON — purga de contas NUNCA CONFIRMADAS (higiene RGPD)
-- ════════════════════════════════════════════════════════════════════════════
-- Cenário: no registo alguém escreve o email ERRADO → a conta nasce por confirmar
-- e a pessoa volta atrás ("Email errado? Corrigir") e cria a certa. A errada fica
-- órfã em auth.users — possivelmente com o email de um ESTRANHO. Não deve ficar:
-- este cron apaga diariamente as contas sem confirmação com mais de 7 dias.
-- (Sem risco para registos em curso — o código OTP expira muito antes de 7 dias;
--  contas confirmadas e contas em período de graça de eliminação não são tocadas.)
--
-- COMO APLICAR (uma vez, no SQL Editor — pg_cron já ativo do cron-purge-deletions):
--   correr este ficheiro inteiro. Idempotente.
-- VERIFICAR:  select jobname, schedule, active from cron.job where jobname = 'crewpact-purge-unconfirmed';

do $$
begin
  perform cron.unschedule('crewpact-purge-unconfirmed');
exception when others then null;   -- ainda não existia → ignora
end $$;

select cron.schedule(
  'crewpact-purge-unconfirmed',
  '20 3 * * *',   -- diário, 03:20 UTC (depois da purga de eliminações agendadas)
  $$ delete from auth.users
     where email_confirmed_at is null
       and created_at < now() - interval '7 days' $$
);
