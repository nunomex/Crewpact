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


-- ── 4. (Opcional) criar o profile automaticamente no signup ──────────────────
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
