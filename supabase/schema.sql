-- ════════════════════════════════════════════════════════════════════════════
-- CrewPact · esquema Supabase (versionado)
-- ════════════════════════════════════════════════════════════════════════════
-- Descoberto por inspeção do projeto em 2026-06-20 (o repo não tinha SQL — o
-- esquema vivia só no dashboard). Este ficheiro é ADITIVO e IDEMPOTENTE: pode
-- correr no SQL Editor sem recriar nem apagar as tabelas existentes.
--
-- Estado real observado:
--   • airlines            — catálogo (5 linhas: easyJet=AE; Hi Fly/Jet2/Volotea/
--                           Wizz=FTL). Colunas: id, slug, name, code, rule_type,
--                           requires_category, requires_contract.  (NÃO tem
--                           `active` nem `country` — a app já não as usa.)
--   • profiles            — perfil por utilizador. Colunas: id, airline_id,
--                           crew_type, current_category_id, current_contract_id,
--                           created_at.
--   • airline_categories  — categorias por companhia (FK a partir de profiles).
--   • airline_contracts   — contratos por companhia (FK a partir de profiles).
--
-- NOTA de arquitetura: a app guarda crewCategory/crewContract nos METADADOS do
-- Auth (updateUser), não em profiles.current_category_id/current_contract_id —
-- por isso essas colunas estão (quase de certeza) sempre NULL. Decisão em aberto:
-- migrar a app para o modelo relacional, ou assumir o metadado como fonte.
--
-- ⚠️ RLS: TODAS as 19 tabelas têm RLS LIGADA e ZERO políticas → "deny-all". A app
-- (key anon/authenticated) não consegue ler/escrever NADA; só o service_role
-- (dashboard) acede. Efeito: profiles/duties nunca sincronizam (a app cai para
-- metadados+AsyncStorage) e o ONBOARDING DE UTILIZADOR NOVO BLOQUEIA (lista de
-- companhias vem vazia). A app só toca em 3 tabelas via client — `airlines`,
-- `profiles`, `duties` — e são as únicas que precisam de política (abaixo). As
-- outras 16 (backend relacional paralelo, não usado pela app) ficam deny-all.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. Ligação em falta: profiles.id → auth.users(id) ────────────────────────
-- Hoje o link user↔profile existe só por CONVENÇÃO (a app faz upsert({id:userId})).
-- Sem esta FK: risco de perfis órfãos e sem cascade ao apagar o utilizador.
-- Se o ALTER falhar por linhas órfãs, limpar primeiro:
--   delete from public.profiles p
--   where not exists (select 1 from auth.users u where u.id = p.id);
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype  = 'f'
      and confrelid = 'auth.users'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;


-- ── 2. RLS — cada utilizador só acede ao SEU profile ─────────────────────────
-- (A inspeção indica que a RLS já está LIGADA e a filtrar — o anon recebe []
--  mesmo havendo linhas. Estas políticas são idempotentes: substituem pelas
--  conhecidas-boas sem partir o que já funciona.)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);


-- ── 3. RLS — catálogo `airlines` legível por utilizadores autenticados ───────
-- O onboarding acontece já com sessão, por isso basta `authenticated` (o anon
-- não precisa de ler o catálogo). Confirmar com a query de pg_policies antes de
-- aplicar, para não duplicar uma política já existente com outro nome.
alter table public.airlines enable row level security;

drop policy if exists "airlines_read_authenticated" on public.airlines;
create policy "airlines_read_authenticated" on public.airlines
  for select to authenticated using (true);


-- ── 4. RLS — cada utilizador só acede às SUAS duties ─────────────────────────
-- A app lê/escreve/apaga por `user_id` (data/duties.js). Uma política `for all`
-- cobre select + insert + update + delete.
alter table public.duties enable row level security;

drop policy if exists "duties_own" on public.duties;
create policy "duties_own" on public.duties
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── 5. FK duties.user_id → profiles com ON DELETE CASCADE ────────────────────
-- Sem cascade, apagar um utilizador com escala registada falha ("Database error
-- deleting user"): a cascade auth.users→profiles é bloqueada pelas duties. Com
-- cascade: apagar o user → limpa profiles → limpa duties. (Encontra o FK seja
-- qual for o nome e recria-o.)
do $$
declare fk_name text;
begin
  select conname into fk_name from pg_constraint
  where conrelid = 'public.duties'::regclass and contype = 'f'
    and confrelid = 'public.profiles'::regclass;
  if fk_name is not null then
    execute format('alter table public.duties drop constraint %I', fk_name);
  end if;
  alter table public.duties
    add constraint duties_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade;
end $$;


-- ── 6. (Opcional) criar o profile automaticamente no signup ──────────────────
-- Em vez de depender do upsertProfile da app. Comentado por omissão.
-- create or replace function public.handle_new_user()
-- returns trigger language plpgsql security definer as $$
-- begin
--   insert into public.profiles (id) values (new.id) on conflict do nothing;
--   return new;
-- end; $$;
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();


-- ── 7. duties: horas são "HH:MM" (TEXT), não timestamp ───────────────────────
-- A app guarda report_time/block_off/block_on como texto local "HH:MM" (modelo do
-- motor FTL — ver data/duties.js). As colunas vieram como `timestamp` → o upsert
-- falhava sempre ("invalid input syntax for type timestamp: 06:00") e as duties
-- NUNCA sincronizavam (falha em silêncio: upsertDuty devolve false). Converte para
-- text. Idempotente (só altera se ainda for timestamp); seguro (tabela vazia).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'duties'
      and column_name = 'report_time' and data_type like 'timestamp%'
  ) then
    alter table public.duties
      alter column report_time type text using report_time::text,
      alter column block_off  type text using block_off::text,
      alter column block_on   type text using block_on::text;
  end if;
end $$;


-- ── 8. duties: constraint UNIQUE (user_id, duty_date) para o upsert ──────────
-- O upsertDuty (data/duties.js) faz `onConflict: 'user_id,duty_date'` (uma duty
-- por dia por utilizador). Sem uma constraint/índice UNIQUE nessas colunas o upsert
-- falha: "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" → as duties NÃO sincronizam. Idempotente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.duties'::regclass and contype = 'u'
      and conname = 'duties_user_date_unique'
  ) then
    alter table public.duties
      add constraint duties_user_date_unique unique (user_id, duty_date);
  end if;
end $$;


-- ── 9. Categoria/Contrato = metadata (FONTE ÚNICA) + duties.kind ──────────────
-- Decisão de arquitetura (Opção A): a CATEGORIA e o CONTRATO do tripulante vivem
-- nos METADADOS do Auth (updateUser) + cache AsyncStorage. As colunas relacionais
-- profiles.current_category_id / current_contract_id NUNCA foram usadas (sempre
-- NULL) → removem-se para acabar com o "dois modelos a competir". Idempotente.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='current_category_id') then
    alter table public.profiles drop column current_category_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='current_contract_id') then
    alter table public.profiles drop column current_contract_id;
  end if;
end $$;

-- duties.kind: TIPO de atividade do dia (voo/standby/posicionamento/terra/formação).
-- Base para o motor AE aplicar a regra certa e para a deteção de alterações de
-- escala. Default 'flight' → as duties existentes ficam todas 'flight'. Idempotente.
-- (O upsertDuty da app já degrada com elegância se esta coluna ainda não existir.)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='duties' and column_name='kind') then
    alter table public.duties add column kind text not null default 'flight';
  end if;
end $$;

-- (OPCIONAL · DESTRUTIVO) remover o catálogo relacional não usado — o catálogo
-- vive no código (ae/*). Descomenta só se quiseres limpar de vez:
-- drop table if exists public.airline_contracts;
-- drop table if exists public.airline_categories;


-- ── 10. RLS — catálogo `airlines` legível por ANON (wizard de criação de conta) ──
-- O novo fluxo de signup mostra as companhias ANTES de a conta existir (a conta é
-- criada só no FIM do wizard). Por isso o catálogo tem de ser legível SEM sessão.
-- Não é sensível (nomes de companhias). Mantém também a política `authenticated`.
-- ⚠️ SEM esta política, o passo "Companhia" do registo fica vazio. Idempotente.
alter table public.airlines enable row level security;
drop policy if exists "airlines_read_anon" on public.airlines;
create policy "airlines_read_anon" on public.airlines
  for select to anon using (true);


-- ── 11. duties.night_stop — paragem nocturna (abono AE, Art. 39 = 2×NS) ──────
-- Marcação por duty (toggle no formulário). Alimenta o total mensal do AE
-- (data/perdiem.js → monthlyAe conta as paragens e o motor aplica 2× setor
-- nominal). Default false → as duties existentes ficam sem paragem. Idempotente.
-- (O upsertDuty da app já degrada com elegância se esta coluna ainda não existir.)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='duties' and column_name='night_stop') then
    alter table public.duties add column night_stop boolean not null default false;
  end if;
end $$;

-- ── 12. duties.roster_meta — origem + snapshot da escala (Fase 4) ────────────
-- JSON de texto: { "source": "manual|calendar|pdf", "snap": { report_time,
-- block_off, block_on, route, sectors, kind } | null }. Serve a deteção de
-- ALTERAÇÕES DE ESCALA (calendário vs guardado), incl. CANCELAMENTOS: só duties
-- com source='calendar' que sumiram do calendário são propostas para apagar
-- (manuais/PDF nunca). O `snap` (3 vias, tipo git) distingue "o calendário mudou"
-- de "tu editaste". Default null → as duties existentes ficam 'manual' (nunca
-- canceladas). Idempotente. (O upsertDuty degrada com elegância se faltar.)
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='duties' and column_name='roster_meta') then
    alter table public.duties add column roster_meta text;
  end if;
end $$;


-- ── 13. airlines.long_haul — operação de longo-curso/multi-fuso ──────────────
-- O cálculo FTL automático assume aclimatizado + na-base (válido p/ curto-curso).
-- Para companhias de longo-curso (multi-fuso, fora-base) esse pressuposto pode estar
-- errado → a app avisa e remete p/ a calculadora manual (data/capabilities.js →
-- isLongHaulCompany lê esta flag, com fallback por nome enquanto a coluna não existir).
-- Hoje só a Hi Fly (ACMI/wet-lease). Default false. Idempotente.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='airlines' and column_name='long_haul') then
    alter table public.airlines add column long_haul boolean not null default false;
  end if;
end $$;
update public.airlines set long_haul = true
  where lower(slug) = 'hifly' or name ilike '%hi fly%' or name ilike '%hifly%';


-- ── 14. countries — país de uma base (ISO-3166 alpha-2) ──────────────────────
-- Catálogo pequeno só para a relação base→país (o picker do onboarding agrupa as
-- bases por país). Legível por TODOS (anon+auth), como `airlines §10`. O `name` é
-- um rótulo neutro (inglês); a app localiza os nomes de país (mapa ISO→pt/en).
create table if not exists public.countries (
  code text primary key,            -- 'PT', 'GB', 'FR', 'CH', …
  name text not null
);
alter table public.countries enable row level security;
drop policy if exists "countries_read" on public.countries;
create policy "countries_read" on public.countries for select using (true);


-- ── 15. bases — base operacional = companhia + aeroporto (num país) ──────────
-- CATÁLOGO das bases de tripulação por companhia. A base ESCOLHIDA pelo utilizador
-- continua nos metadados do Auth (como o CÓDIGO, ex. 'LIS', tal como hoje) — NÃO há
-- coluna em profiles nem migração (decisão: igual a categoria/contrato, §9/Opção A).
-- Esta tabela é o catálogo que o picker mostra e de onde a app resolve cidade/país.
-- `code` = IATA do aeroporto (coords em data/airports.json). `seasonal` = base só de
-- parte do ano. RLS: legível por todos (onboarding pode correr antes da conta existir).
--
-- `airline_id` HERDA automaticamente o tipo de `airlines.id` (o DO block introspeta o
-- pg_attribute e cria a coluna a condizer) → NÃO há risco de incompatibilidade de tipo,
-- seja `airlines.id` uuid, bigint/int8, text ou outro. Idempotente (só cria se faltar).
do $$
declare aid_type text;
begin
  if to_regclass('public.bases') is null then
    select format_type(a.atttypid, a.atttypmod) into aid_type
    from pg_attribute a
    where a.attrelid = 'public.airlines'::regclass and a.attname = 'id' and not a.attisdropped;
    execute format($f$
      create table public.bases (
        id           bigint generated always as identity primary key,
        airline_id   %s not null references public.airlines(id) on delete cascade,  -- = tipo de airlines.id
        code         text not null,                  -- IATA: 'LIS', 'LGW'
        city         text,
        country_code text not null references public.countries(code),
        seasonal     boolean not null default false,
        active       boolean not null default true,
        unique (airline_id, code)
      )$f$, aid_type);
  end if;
end $$;
create index if not exists bases_airline_idx on public.bases(airline_id);
alter table public.bases enable row level security;
drop policy if exists "bases_read" on public.bases;
create policy "bases_read" on public.bases for select using (true);

-- Seed: 9 países + 33 bases easyJet (operacionais, jun-2026). Idempotente.
insert into public.countries (code, name) values
  ('GB','United Kingdom'), ('FR','France'), ('IT','Italy'), ('ES','Spain'),
  ('PT','Portugal'), ('CH','Switzerland'), ('DE','Germany'), ('NL','Netherlands'), ('MA','Morocco')
on conflict (code) do nothing;

insert into public.bases (airline_id, code, city, country_code, seasonal)
select a.id, v.code, v.city, v.cc, v.seasonal
from public.airlines a
cross join (values
  -- Reino Unido (11)
  ('BFS','Belfast','GB',false), ('BHX','Birmingham','GB',false), ('BRS','Bristol','GB',false),
  ('EDI','Edinburgh','GB',false), ('GLA','Glasgow','GB',false), ('LPL','Liverpool','GB',false),
  ('LGW','London Gatwick','GB',false), ('LTN','London Luton','GB',false), ('SEN','London Southend','GB',false),
  ('MAN','Manchester','GB',false), ('NCL','Newcastle','GB',false),
  -- França (6)
  ('BOD','Bordeaux','FR',false), ('LYS','Lyon','FR',false), ('NTE','Nantes','FR',false),
  ('NCE','Nice','FR',false), ('CDG','Paris CDG','FR',false), ('ORY','Paris Orly','FR',false),
  -- Itália (4)
  ('MXP','Milan Malpensa','IT',false), ('LIN','Milan Linate','IT',false), ('NAP','Naples','IT',false), ('FCO','Rome Fiumicino','IT',false),
  -- Espanha (4 · sazonais exceto Barcelona)
  ('ALC','Alicante','ES',true), ('BCN','Barcelona','ES',false), ('AGP','Malaga','ES',true), ('PMI','Palma','ES',true),
  -- Portugal (3 · Faro sazonal)
  ('FAO','Faro','PT',true), ('LIS','Lisbon','PT',false), ('OPO','Porto','PT',false),
  -- Suíça (2 · Basel = EuroAirport, operado por easyJet Switzerland → CH)
  ('BSL','Basel','CH',false), ('GVA','Geneva','CH',false),
  -- Alemanha / Países Baixos / Marrocos (1 cada)
  ('BER','Berlin','DE',false), ('AMS','Amsterdam','NL',false), ('RAK','Marrakesh','MA',false)
) as v(code, city, cc, seasonal)
where lower(a.slug) = 'easyjet' or a.name ilike '%easyjet%' or a.name ilike '%easy jet%'
on conflict (airline_id, code) do nothing;


-- ── 16. airlines: AE POR MODELAR, por tipo de tripulação (3 estados honestos) ──
-- FTL-only NÃO é incompleto — é a resposta certa para quem não tem acordo coletivo (o FTL é
-- lei EASA, universal). MAS o binário AE/FTL juntava "não há AE" com "há AE, ainda não modelado".
-- 3 estados: 'modeled' (registry ae/* tem módulo — DERIVADO, não se guarda aqui), 'pending'
-- (tem AE publicado, ex. no BTE — Código do Trabalho obriga a publicar — mas ainda não no
-- CrewPact → mostra-se FTL + aviso), 'none' (não há AE). Por TIPO de tripulação porque uma
-- companhia pode ter o AE de cabine modelado e o de piloto por modelar (ex. easyJet = 2 acordos).
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='airlines' and column_name='ae_pending_pilot') then
    alter table public.airlines add column ae_pending_pilot boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='airlines' and column_name='ae_pending_cabin') then
    alter table public.airlines add column ae_pending_cabin boolean not null default false;
  end if;
end $$;
-- Classificação (a confirmar no BTE/DGERT): easyJet fica 'modeled' (registry); as outras ficam
-- 'none' por default. Quando confirmares que uma companhia TEM AE publicado mas por modelar,
-- liga a flag do tipo certo. Ex. (a confirmar) TAP tem AE de cabine no BTE:
--   update public.airlines set ae_pending_cabin = true where lower(slug) = 'tap' or name ilike '%tap%';
