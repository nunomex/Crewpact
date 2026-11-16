-- ═══════════════════════════════════════════════════════════
-- Os códigos da escala por companhia + os avisos de "código novo"
-- ═══════════════════════════════════════════════════════════
-- (2026-11-16 — as recomendações para quando a app for vendida.)
--
-- roster_codes — a CrewPact acrescenta aqui um código que o eCrew criou ou mudou, e a app passa a conhecê-lo em minutos, sem esperar
--   pela revisão da loja (data/remoteCodes.js lê-a; data/rosterCodes.js junta-a aos códigos da app — nunca os tira). Cada linha é um
--   código COMO VEM NA ESCALA (não uma fórmula) e um tipo. A app só LÊ; escrever é só no painel (service role).
--
-- code_reports — o "Avisar a CrewPact" opcional no cartão "Código novo" da Escala: SÓ o código, a companhia, o mês e a versão da app,
--   SEM o id da conta (anónimo). Os utilizadores podem ENVIAR mas não LER; a base de dados recusa o que não tiver a forma de um código
--   (nada de texto livre). A CrewPact lê no painel (ver a consulta no fim).
--
-- CORRER no SQL Editor do dashboard (uma vez). Idempotente.

create table if not exists public.roster_codes (
  id          bigint generated always as identity primary key,
  airline     text not null check (airline ~ '^[a-z0-9-]{2,20}$'),                    -- o slug: 'easyjet', 'tap'…
  code        text not null check (code ~ '^[A-Z0-9][A-Z0-9/.]{1,9}$'),               -- como vem na escala: 'SBYX', 'WD/O'
  kind        text not null check (kind in ('standby_home', 'standby_airport', 'positioning', 'training', 'office', 'off')),
  note        text,                                                                  -- de onde veio (ex.: "avisado 3× em nov 2026")
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (airline, code)
);
alter table public.roster_codes enable row level security;
drop policy if exists "roster_codes_read" on public.roster_codes;
create policy "roster_codes_read" on public.roster_codes for select using (active);
-- Sem policy de insert/update/delete = só a service role (o painel) escreve.

create table if not exists public.code_reports (
  id           bigint generated always as identity primary key,
  airline      text not null check (airline ~ '^[a-z0-9-]{2,20}$'),
  code         text not null check (code ~ '^[A-Z0-9][A-Z0-9/]{1,5}$'),                -- a mesma forma que a app usa (RE_CODE_SHAPE)
  month        text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  app_version  text check (app_version is null or char_length(app_version) <= 20),
  created_at   timestamptz not null default now()
);
alter table public.code_reports enable row level security;
drop policy if exists "code_reports_insert" on public.code_reports;
create policy "code_reports_insert" on public.code_reports for insert to authenticated with check (true);
-- Sem policy de select/update/delete = os utilizadores não leem nem mudam; só a CrewPact, no painel.

-- Exemplo (no painel): acrescentar um código que o eCrew criou
--   insert into public.roster_codes (airline, code, kind, note) values ('easyjet', 'SBYX', 'standby_airport', 'avisado em nov 2026');
-- Os avisos, do mais pedido para o menos:
--   select airline, code, count(*) as avisos, min(created_at) as primeiro, max(created_at) as ultimo
--   from public.code_reports group by airline, code order by avisos desc;
