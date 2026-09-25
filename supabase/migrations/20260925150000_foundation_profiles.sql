-- ASCEND Milestone 1 — Foundation
--
-- Shared helpers and the athlete profile (spec §9, §46, §48).
-- Only `profiles` is created in M1 (ADR-006). Further §9 profile fields are
-- added with Milestone 2 onboarding.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Keeps updated_at current on every row update (spec §46).';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text
    check (display_name is null or char_length(display_name) between 1 and 80),
  preferred_units text not null default 'metric'
    check (preferred_units in ('metric', 'imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Athlete profile, separate from measured and derived data (spec §9). One row per auth user.';
comment on column public.profiles.preferred_units is
  'Display preference only. Measurements are stored in SI units (spec §46).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS: athlete-owned, scoped by auth.uid() (spec §48).
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert/delete policies: rows are created by the trigger below and
-- removed by the auth.users cascade. Clients cannot create or delete them.

-- Supabase grants ALL on new public tables by default; narrow it explicitly.
revoke all on public.profiles from anon, authenticated;
grant select, update (display_name, preferred_units) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Create a profile for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 80)
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the athlete profile row when a user signs up.';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
