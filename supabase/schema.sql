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
