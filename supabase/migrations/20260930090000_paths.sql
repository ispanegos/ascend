-- ASCEND Milestone 4 — Paths (spec §18, ADR-040).
--
-- A Path is an attribute the athlete wants prioritised, not a sport. The
-- athlete's choices are an append-only history of full configurations:
-- every change appends a new revision; nothing is edited or deleted. The
-- current configuration is the highest revision. Path choices never touch
-- Stats, Peaks, snapshots or evidence.

-- ---------------------------------------------------------------------------
-- Catalogue: the seven Paths, one per Stat attribute (read-only)
-- ---------------------------------------------------------------------------

create table public.paths (
  key text primary key check (key in ('endurance', 'strength', 'power', 'core', 'mobility', 'agility', 'recovery')),
  label text not null,
  sort_order smallint not null unique
);

comment on table public.paths is 'The seven Paths (spec §18): athletic attributes to prioritise. Never sports.';

insert into public.paths (key, label, sort_order) values
  ('endurance', 'Endurance', 1),
  ('strength', 'Strength', 2),
  ('power', 'Power', 3),
  ('core', 'Core', 4),
  ('mobility', 'Mobility', 5),
  ('agility', 'Agility', 6),
  ('recovery', 'Recovery', 7);

-- ---------------------------------------------------------------------------
-- Configuration history (athlete-owned, append-only)
-- ---------------------------------------------------------------------------

create table public.athlete_path_configurations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  revision integer not null check (revision > 0),
  created_at timestamptz not null default now(),
  unique (id, athlete_id),
  -- Concurrency: two writers can never produce the same revision.
  unique (athlete_id, revision)
);

comment on table public.athlete_path_configurations is
  'One immutable row per Path change (ADR-040). A configuration is a full snapshot, valid from created_at until the next revision. Zero items = no active Paths.';

create index athlete_path_configurations_latest on public.athlete_path_configurations (athlete_id, revision desc);

create table public.athlete_path_configuration_items (
  configuration_id uuid not null,
  athlete_id uuid not null,
  path_key text not null references public.paths (key),
  priority text not null check (priority in ('primary', 'secondary')),
  primary key (configuration_id, path_key),
  foreign key (configuration_id, athlete_id) references public.athlete_path_configurations (id, athlete_id) on delete cascade
);

comment on table public.athlete_path_configuration_items is
  'The Paths of one configuration: at most 3, exactly one primary when any, at most 2 secondary (ADR-040).';

-- At most one PRIMARY per configuration.
create unique index athlete_path_one_primary on public.athlete_path_configuration_items (configuration_id)
  where priority = 'primary';

-- ≤ 3 Paths, ≤ 2 SECONDARY, and exactly one PRIMARY whenever there is any
-- Path. Deferred to commit time, so a configuration and its items can be
-- written in one transaction in any order.
create or replace function private.check_path_configuration()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_configuration uuid;
  v_total integer;
  v_primary integer;
  v_secondary integer;
begin
  if tg_table_name = 'athlete_path_configurations' then
    v_configuration := new.id;
  else
    v_configuration := new.configuration_id;
  end if;

  select count(*), count(*) filter (where priority = 'primary'), count(*) filter (where priority = 'secondary')
  into v_total, v_primary, v_secondary
  from public.athlete_path_configuration_items
  where configuration_id = v_configuration;

  if v_total > 3 then
    raise exception 'At most three Paths can be active' using errcode = 'check_violation';
  end if;
  if v_secondary > 2 then
    raise exception 'At most two SECONDARY Paths' using errcode = 'check_violation';
  end if;
  if v_total > 0 and v_primary <> 1 then
    raise exception 'Exactly one PRIMARY Path is required when any Path is active' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger athlete_path_items_valid
  after insert on public.athlete_path_configuration_items
  deferrable initially deferred
  for each row execute function private.check_path_configuration();

create constraint trigger athlete_path_configuration_valid
  after insert on public.athlete_path_configurations
  deferrable initially deferred
  for each row execute function private.check_path_configuration();

-- Append-only (dev reset excepted).
create trigger athlete_path_configurations_append_only before update or delete on public.athlete_path_configurations
  for each row execute function private.guard_append_only();
create trigger athlete_path_configuration_items_append_only before update or delete on public.athlete_path_configuration_items
  for each row execute function private.guard_append_only();

-- ---------------------------------------------------------------------------
-- Views: current configuration and history (RLS of the caller applies)
-- ---------------------------------------------------------------------------

create view public.current_athlete_paths
with (security_invoker = true) as
select c.athlete_id, c.id as configuration_id, c.revision, c.created_at as active_since, i.path_key, i.priority
from public.athlete_path_configurations c
join public.athlete_path_configuration_items i on i.configuration_id = c.id
where c.revision = (
  select max(latest.revision) from public.athlete_path_configurations latest where latest.athlete_id = c.athlete_id
);

comment on view public.current_athlete_paths is 'The athlete''s active Paths: the items of their highest revision (ADR-040).';

create view public.athlete_path_history
with (security_invoker = true) as
select
  c.athlete_id,
  c.id as configuration_id,
  c.revision,
  c.created_at as valid_from,
  lead(c.created_at) over (partition by c.athlete_id order by c.revision) as valid_until,
  coalesce(
    (select jsonb_agg(jsonb_build_object('path', i.path_key, 'priority', i.priority)
                      order by (i.priority = 'secondary'), p.sort_order)
     from public.athlete_path_configuration_items i
     join public.paths p on p.key = i.path_key
     where i.configuration_id = c.id),
    '[]'::jsonb
  ) as paths
from public.athlete_path_configurations c;

comment on view public.athlete_path_history is
  'Every Path configuration with its validity period. Activations, priority changes and deactivations are the differences between consecutive rows.';

-- ---------------------------------------------------------------------------
-- RLS and grants: read own; write only through set_athlete_paths()
-- ---------------------------------------------------------------------------

alter table public.paths enable row level security;
alter table public.athlete_path_configurations enable row level security;
alter table public.athlete_path_configuration_items enable row level security;

create policy "paths_read" on public.paths for select to authenticated using (true);
create policy "athlete_path_configurations_select_own" on public.athlete_path_configurations
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "athlete_path_configuration_items_select_own" on public.athlete_path_configuration_items
  for select to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.paths, public.athlete_path_configurations, public.athlete_path_configuration_items,
  public.current_athlete_paths, public.athlete_path_history from anon, authenticated;
grant select on public.paths, public.athlete_path_configurations, public.athlete_path_configuration_items,
  public.current_athlete_paths, public.athlete_path_history to authenticated;

-- ---------------------------------------------------------------------------
-- The only write path
-- ---------------------------------------------------------------------------

create or replace function public.set_athlete_paths(p_primary text, p_secondary text[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v_secondary text[] := coalesce(p_secondary, '{}');
  v_state text;
  v_current uuid;
  v_current_revision integer;
  v_same boolean;
  v_configuration uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Serialises this athlete's Path writes.
  select spawn_state into v_state from public.athlete_settings where athlete_id = uid for update;
  if v_state is distinct from 'COMPLETE' then
    raise exception 'Paths are chosen after Spawn is complete' using errcode = 'check_violation';
  end if;

  if p_primary is null and cardinality(v_secondary) > 0 then
    raise exception 'Exactly one PRIMARY Path is required when any Path is active' using errcode = 'check_violation';
  end if;
  if cardinality(v_secondary) > 2 then
    raise exception 'At most two SECONDARY Paths' using errcode = 'check_violation';
  end if;
  if p_primary = any (v_secondary) or cardinality(v_secondary) <> (select count(distinct s) from unnest(v_secondary) s) then
    raise exception 'A Path can be chosen only once' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from unnest(array_append(v_secondary, p_primary)) k
    where k is not null and not exists (select 1 from public.paths p where p.key = k)
  ) then
    raise exception 'Unknown Path' using errcode = 'check_violation';
  end if;

  select id, revision into v_current, v_current_revision
  from public.athlete_path_configurations where athlete_id = uid order by revision desc limit 1;

  -- A change identical to the current configuration appends nothing.
  if v_current is not null then
    v_same := (
      select coalesce(array_agg(i.path_key || ':' || i.priority order by i.path_key), '{}')
      from public.athlete_path_configuration_items i where i.configuration_id = v_current
    ) = (
      select coalesce(array_agg(w order by w), '{}')
      from unnest(
        array_cat(case when p_primary is null then '{}'::text[] else array[p_primary || ':primary'] end,
                  array(select s || ':secondary' from unnest(v_secondary) s))
      ) w
    );
    if v_same then
      return v_current;
    end if;
  elsif p_primary is null then
    -- No history and nothing chosen: nothing to record.
    return null;
  end if;

  insert into public.athlete_path_configurations (athlete_id, revision)
  values (uid, coalesce(v_current_revision, 0) + 1)
  returning id into v_configuration;

  if p_primary is not null then
    insert into public.athlete_path_configuration_items (configuration_id, athlete_id, path_key, priority)
    values (v_configuration, uid, p_primary, 'primary');
  end if;
  insert into public.athlete_path_configuration_items (configuration_id, athlete_id, path_key, priority)
  select v_configuration, uid, s, 'secondary' from unnest(v_secondary) s;

  return v_configuration;
end;
$$;

comment on function public.set_athlete_paths(text, text[]) is
  'Appends a Path configuration for the calling athlete (ADR-040). Validates the rules, requires a complete Spawn, skips no-op changes. Never touches Stats.';

revoke execute on function public.set_athlete_paths(text, text[]) from public, anon;
grant execute on function public.set_athlete_paths(text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Development reset also clears Path history (ADR-019)
-- ---------------------------------------------------------------------------

create or replace function public.dev_reset_spawn(keep_context boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if coalesce((select value from private.environment_flags where key = 'dev_tools'), '') <> 'enabled' then
    raise exception 'Development tools are disabled in this environment'
      using errcode = 'insufficient_privilege';
  end if;

  perform set_config('ascend.dev_reset', 'on', true);

  delete from public.athlete_path_configurations where athlete_id = uid;
  delete from public.stat_calculations where athlete_id = uid;
  delete from public.performance_evidence where athlete_id = uid;
  delete from public.movement_flags where athlete_id = uid;
  delete from public.assessment_sessions where athlete_id = uid;

  if keep_context then
    update public.athlete_settings
    set spawn_state = 'MOVEMENT_PENDING', calibration_requested_at = null, spawn_completed_at = null
    where athlete_id = uid and public.spawn_state_rank(spawn_state) >= 2;
  else
    delete from public.body_measurements where athlete_id = uid;
    delete from public.athlete_equipment where athlete_id = uid;
    delete from public.availability_windows where athlete_id = uid;
    update public.profiles
    set date_of_birth = null, biological_sex = null, height_cm = null,
        training_experience = null, recent_inactivity = null, wake_time = null,
        sleep_time = null, limitations_note = null
    where id = uid;
    update public.athlete_settings
    set spawn_state = 'NOT_STARTED', onboarding_step = null, environments = '{}',
        data_sources = '{}', spawn_started_at = null, context_completed_at = null,
        calibration_requested_at = null, spawn_completed_at = null
    where athlete_id = uid;
  end if;

  perform set_config('ascend.dev_reset', '', true);
end;
$$;
