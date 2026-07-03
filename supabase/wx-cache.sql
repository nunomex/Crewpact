-- ════════════════════════════════════════════════════════════════════════════
-- Meteo por estação — CACHE das previsões (MET Norway, api.met.no)
-- ════════════════════════════════════════════════════════════════════════════
-- Uma linha por aeroporto (IATA): a série horária TRIMADA (48 h) vinda do
-- locationforecast/2.0 do MET Norway (licença CC-BY 4.0 — grátis incl. comercial;
-- a atribuição visível e o User-Agent identificado são tratados na Edge/app).
-- TTL 45 min na Edge (o modelo atualiza ~hora a hora; o TOS deles pede para não
-- pedir mais do que isso) → custo fixo por aeroporto, seja quanta gente olhar.
-- RLS nega tudo — acesso SÓ pela Edge (service role). Linhas reescrevem-se.
--
-- CORRER no SQL Editor do dashboard (uma vez).

create table if not exists public.wx_cache (
  iata         text primary key,
  computed_at  timestamptz not null default now(),
  wx           jsonb not null
);

alter table public.wx_cache enable row level security;
-- Sem policies = nega tudo a anon/authenticated; só a service role (Edge) entra.
