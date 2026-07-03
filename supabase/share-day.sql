-- ════════════════════════════════════════════════════════════════════════════
-- Partilha com a família — tabela dos LINKS TEMPORÁRIOS (share-day)
-- ════════════════════════════════════════════════════════════════════════════
-- Um link = UMA chegada de UM dia (nunca a escala): { token, legs do dia, expira }.
-- O acesso é SÓ pela Edge Function `share-day` (service role): a app cria via POST
-- autenticado; quem recebe o link abre um GET público por token. RLS nega tudo ao
-- cliente — não há caminho direto à tabela.
--
-- CORRER no SQL Editor do dashboard (uma vez).

create table if not exists public.shared_days (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  uid         uuid not null,
  share_date  date not null,
  legs        jsonb not null default '[]'::jsonb,   -- [{flight, dep, arr}] — só o dia partilhado
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

alter table public.shared_days enable row level security;
-- Sem policies = nega tudo a anon/authenticated; só a service role (Edge) entra.

-- Limpeza: apagar links expirados há mais de 7 dias (aproveita o pg_cron já ativo
-- do apagar-conta; se ainda não ativaste, ver cron-purge-deletions.sql).
select cron.schedule(
  'purge-shared-days',
  '30 4 * * *',   -- todos os dias às 04:30 UTC
  $$ delete from public.shared_days where expires_at < now() - interval '7 days' $$
);
