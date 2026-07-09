-- ════════════════════════════════════════════════════════════════════════════
-- Voo ao vivo (AirLabs) — CACHE de curta duração p/ o link público da chegada
-- ════════════════════════════════════════════════════════════════════════════
-- O GET público de share-day (o link que a família abre) chama o AirLabs /flight
-- para saber a hora de chegada REAL. Sem cache, cada abertura/refresh — e cada
-- pessoa a ver o MESMO voo — dispara uma chamada AirLabs (gasta quota, e um link
-- reencaminhado/atacado podia martelar a API). Esta tabela absorve isso: uma linha
-- por VOO+DIA, TTL ADAPTATIVO na Edge (modelo Flighty, 2026-07-10): 90 s nas janelas
-- QUENTES (partida-10m→+15m · ETA-25m→aterrar) · 300 s no cruzeiro/resto → ~35
-- chamadas/voo em vez de ~120, seja quanta gente esteja a ver.
-- MEMÓRIA do "aterrou": o /flight larga o voo do feed pouco depois de aterrar; ao ver
-- `arr_actual` uma vez, a Edge fixa esse estado e devolve-o o resto do dia (sem re-chamar)
-- para o link não regredir a "sem estimativa". Guarda a resposta CRUA do AirLabs (jsonb)
-- OU null (voo que o AirLabs não conhece — cachear o "não há" também poupa chamadas).
-- RLS nega tudo — só a Edge (service role). Irmã de wx_cache / airport_stats.
--
-- CORRER no SQL Editor do dashboard (uma vez). O schema não mudou com a memória do
-- aterrou (só a Edge muda) — quem já criou a tabela não precisa de a re-correr.

create table if not exists public.flight_live (
  flight       text primary key,          -- CHAVE: "VOO|YYYY-MM-DD" (voo limpo + dia da chegada)
  computed_at  timestamptz not null default now(),
  data         jsonb                       -- resposta AirLabs /flight (crua) OU null = "sem voo"
);

alter table public.flight_live enable row level security;
-- Sem policies = nega tudo a anon/authenticated; só a service role (Edge) entra.

-- Higiene: apaga linhas de DIAS ANTERIORES — opcional, corre quando quiseres. NÃO usar
-- um intervalo curto: um voo aterrado de HOJE tem de sobreviver o dia todo (a memória do
-- aterrou fixa o computed_at na hora da aterragem).
-- delete from public.flight_live where computed_at < now() - interval '1 day';
