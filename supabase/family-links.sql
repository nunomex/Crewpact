-- ════════════════════════════════════════════════════════════════════════════
-- Família — LINKS PERMANENTES (camada 1 do "Flighty Friends" adaptado)
-- ════════════════════════════════════════════════════════════════════════════
-- Um link por PESSOA ("Mãe", "Ana"): criado uma vez, a página mostra SEMPRE a
-- chegada de HOJE do tripulante (a Edge `share-day` resolve o dia na tabela
-- `duties`, que a app já sincroniza). Sem expiry — morre por REVOGAÇÃO (a app
-- apaga a linha) ou quando a conta é apagada (purga diária de órfãos, abaixo).
-- Privacidade: só a chegada do próprio dia, nunca a escala nem histórico; token
-- aleatório 26 chars; RLS nega tudo — o acesso é SÓ pela Edge (service role).
--
-- CORRER no SQL Editor do dashboard (uma vez).

create table if not exists public.family_links (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  uid         uuid not null,
  label       text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.family_links enable row level security;
-- Sem policies = nega tudo a anon/authenticated; só a service role (Edge) entra.

-- Purga de ÓRFÃOS: conta apagada → os links dessa conta morrem (RGPD; o link já
-- não mostrava nada — as duties vão com a conta — mas a linha não deve ficar).
select cron.schedule(
  'purge-family-links',
  '40 4 * * *',   -- todos os dias às 04:40 UTC
  $$ delete from public.family_links where uid not in (select id from auth.users) $$
);
