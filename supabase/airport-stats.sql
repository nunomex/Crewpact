-- ════════════════════════════════════════════════════════════════════════════
-- Airport Intelligence (à crew) — CACHE das fotografias de aeroporto
-- ════════════════════════════════════════════════════════════════════════════
-- Uma linha por aeroporto: a agregação de HOJE (% atrasados ≥15 min, atraso médio
-- dos atrasados, % cancelados — partidas e chegadas) calculada pela Edge a partir
-- do /schedules do AirLabs. A cache é O QUE TORNA ISTO GRÁTIS: TTL de 12 min na
-- Edge → no pior caso ~5 pares de chamadas/hora POR AEROPORTO, independentemente
-- de quantas pessoas (app + páginas da família) estão a olhar.
-- RLS nega tudo — o acesso é SÓ pelas Edges (service role). Tabela minúscula
-- (só aeroportos observados hoje); as linhas reescrevem-se — sem purga necessária.
--
-- CORRER no SQL Editor do dashboard (uma vez).

create table if not exists public.airport_stats (
  iata         text primary key,
  computed_at  timestamptz not null default now(),
  stats        jsonb not null
);

alter table public.airport_stats enable row level security;
-- Sem policies = nega tudo a anon/authenticated; só a service role (Edge) entra.
