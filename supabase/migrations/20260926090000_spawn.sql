-- ASCEND Milestone 2 — Profile + Spawn
--
-- Profile context (spec §9, §10), equipment and availability, the Spawn state
-- machine (§11) and raw assessment evidence (§5, §12–§14, §46, §47).
--
-- Principles enforced here, not only in the app:
--   * raw results are immutable once resolved (§0.3, §47, ADR-014);
--   * pain always creates a Movement Flag and never evidence of zero
--     (§0.12, §53, §72, ADR-016);
--   * evidence is append-only and holds raw data only (ADR-015);
--   * Spawn state moves exactly one step forward (ADR-012);
--   * every athlete-owned row is scoped by auth.uid() (§48).
--
-- Units are SI (or cm for body/short distances) and appear in column names.

-- ---------------------------------------------------------------------------
-- Private schema: environment flags (not exposed through the Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
-- Invoker-rights triggers call private helpers. The schema is not in the
-- Data API's exposed schemas, so this grants no API surface.
grant usage on schema private to authenticated;

create table private.environment_flags (
  key text primary key,
  value text not null
);

revoke all on private.environment_flags from public, anon, authenticated;

comment on table private.environment_flags is
  'Per-environment switches. Only supabase/seed.sql (local) sets dev_tools; the hosted project never has it (ADR-019).';

-- Transaction-local bypass used only by dev_reset_spawn().
create or replace function private.is_dev_reset()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('ascend.dev_reset', true), '') = 'on';
$$;

-- ---------------------------------------------------------------------------
-- profiles: §9 fields
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column date_of_birth date
    check (date_of_birth is null or date_of_birth >= date '1900-01-01'),
  add column biological_sex text
    check (biological_sex is null or biological_sex in ('female', 'male')),
  add column height_cm numeric(4, 1)
    check (height_cm is null or height_cm between 100 and 250),
  add column training_experience text
    check (training_experience is null or training_experience in
      ('none', 'under_1_year', '1_3_years', 'over_3_years')),
  add column recent_inactivity text
    check (recent_inactivity is null or recent_inactivity in
      ('active', 'under_3_months', '3_12_months', 'over_12_months')),
  add column wake_time time,
  add column sleep_time time,
  add column limitations_note text
    check (limitations_note is null or char_length(limitations_note) <= 1000);

comment on column public.profiles.biological_sex is
  'Optional. Only provided when the athlete chooses to (spec §9). Null means not provided.';
comment on column public.profiles.limitations_note is
  'Athlete-entered injuries/limitations. ASCEND never infers diagnoses (spec §9).';

grant update (
  date_of_birth, biological_sex, height_cm, training_experience,
  recent_inactivity, wake_time, sleep_time, limitations_note
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- athlete_settings: Spawn state + context lists
-- ---------------------------------------------------------------------------

create or replace function public.spawn_state_rank(state text)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case state
    when 'NOT_STARTED' then 0
    when 'BODY_PROFILE' then 1
    when 'MOVEMENT_PENDING' then 2
    when 'MOVEMENT_COMPLETE' then 3
    when 'FRAME_PENDING' then 4
    when 'FRAME_COMPLETE' then 5
    when 'ENGINE_PENDING' then 6
    when 'ENGINE_COMPLETE' then 7
    when 'CALIBRATING' then 8
    when 'COMPLETE' then 9
  end::smallint;
$$;

create table public.athlete_settings (
  athlete_id uuid primary key references public.profiles (id) on delete cascade,
  spawn_state text not null default 'NOT_STARTED'
    check (public.spawn_state_rank(spawn_state) is not null),
  onboarding_step text
    check (onboarding_step is null or onboarding_step ~ '^[a-z][a-z-]{1,31}$'),
  environments text[] not null default '{}'
    check (environments <@ array[
      'road', 'track', 'flat_terrain', 'hills', 'off_road', 'beach',
      'treadmill', 'gym', 'home', 'park'
    ]::text[]),
  data_sources text[] not null default '{}'
    check (data_sources <@ array[
      'apple_watch', 'garmin', 'polar', 'coros', 'suunto', 'fitbit',
      'whoop', 'oura', 'hr_strap', 'smart_scale', 'phone', 'none'
    ]::text[]),
  spawn_started_at timestamptz,
  context_completed_at timestamptz,
  calibration_requested_at timestamptz,
  spawn_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.athlete_settings is
  'Athlete configuration and Spawn progress (spec §11). One row per athlete, created on sign-up.';
comment on column public.athlete_settings.spawn_state is
  'Spawn state machine (ADR-012). Moves exactly one step forward.';
comment on column public.athlete_settings.onboarding_step is
  'Last onboarding screen reached, for resume (spec §26: persist partially completed forms).';

create trigger athlete_settings_set_updated_at
  before update on public.athlete_settings
  for each row execute function public.set_updated_at();

create or replace function private.guard_spawn_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.spawn_state is distinct from old.spawn_state and not private.is_dev_reset() then
    if public.spawn_state_rank(new.spawn_state) <> public.spawn_state_rank(old.spawn_state) + 1 then
      raise exception 'Spawn state cannot move from % to %', old.spawn_state, new.spawn_state
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger athlete_settings_guard_spawn_state
  before update on public.athlete_settings
  for each row execute function private.guard_spawn_state();

alter table public.athlete_settings enable row level security;

create policy "athlete_settings_select_own"
  on public.athlete_settings for select to authenticated
  using ((select auth.uid()) = athlete_id);

create policy "athlete_settings_update_own"
  on public.athlete_settings for update to authenticated
  using ((select auth.uid()) = athlete_id)
  with check ((select auth.uid()) = athlete_id);

revoke all on public.athlete_settings from anon, authenticated;
grant select on public.athlete_settings to authenticated;
grant update (
  spawn_state, onboarding_step, environments, data_sources, spawn_started_at,
  context_completed_at, calibration_requested_at
) on public.athlete_settings to authenticated;

-- Backfill athletes created before this migration.
insert into public.athlete_settings (athlete_id)
select id from public.profiles
on conflict (athlete_id) do nothing;

-- New users get both rows.
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
  insert into public.athlete_settings (athlete_id) values (new.id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- equipment (reference) + athlete_equipment
-- ---------------------------------------------------------------------------

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (char_length(name) between 1 and 60),
  category text not null
    check (category in ('free_weight', 'bodyweight', 'conditioning', 'cardio', 'accessory')),
  -- 'implement': loads_kg lists the weights of individual implements (e.g. kettlebells).
  -- 'bar': loads_kg lists bar weights. 'none': not loadable.
  load_mode text not null default 'none' check (load_mode in ('none', 'implement', 'bar')),
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.equipment is
  'Reference equipment catalog. Read-only to clients (spec §48).';

create trigger equipment_set_updated_at
  before update on public.equipment
  for each row execute function public.set_updated_at();

insert into public.equipment (key, name, category, load_mode, sort_order) values
  ('kettlebell',        'Kettlebells',            'free_weight',  'implement', 10),
  ('dumbbell',          'Dumbbells',              'free_weight',  'implement', 20),
  ('barbell',           'Barbell',                'free_weight',  'bar',       30),
  ('weight_plates',     'Weight plates',          'free_weight',  'implement', 40),
  ('sandbag',           'Sandbag',                'free_weight',  'implement', 50),
  ('medicine_ball',     'Medicine ball',          'free_weight',  'implement', 60),
  ('pull_up_bar',       'Pull-up bar',            'bodyweight',   'none',      70),
  ('dip_station',       'Dip station / rings',    'bodyweight',   'none',      80),
  ('bench',             'Bench',                  'accessory',    'none',      90),
  ('plyo_box',          'Box / sturdy step',      'accessory',    'none',     100),
  ('resistance_bands',  'Resistance bands',       'accessory',    'none',     110),
  ('exercise_mat',      'Exercise mat',           'accessory',    'none',     120),
  ('cones',             'Cones / markers',        'accessory',    'none',     130),
  ('tape_measure',      'Tape measure',           'accessory',    'none',     140),
  ('jump_rope',         'Jump rope',              'conditioning', 'none',     150),
  ('drag_rope',         'Dragging rope',          'conditioning', 'none',     160),
  ('sledgehammer',      'Hammer / sledgehammer',  'conditioning', 'implement',170),
  ('sled',              'Sled',                   'conditioning', 'none',     180),
  ('treadmill',         'Treadmill',              'cardio',       'none',     190),
  ('stationary_bike',   'Stationary bike',        'cardio',       'none',     200),
  ('rower',             'Rowing machine',         'cardio',       'none',     210);

alter table public.equipment enable row level security;

create policy "equipment_read"
  on public.equipment for select to authenticated
  using (true);

revoke all on public.equipment from anon, authenticated;
grant select on public.equipment to authenticated;

create table public.athlete_equipment (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id),
  loads_kg numeric(6, 2)[] not null default '{}'
    check (0 < all (loads_kg) and 500 >= all (loads_kg) and cardinality(loads_kg) <= 40),
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, equipment_id)
);

comment on column public.athlete_equipment.loads_kg is
  'Available implement or bar weights in kilograms, e.g. {8,12,16} kettlebells.';

create trigger athlete_equipment_set_updated_at
  before update on public.athlete_equipment
  for each row execute function public.set_updated_at();

alter table public.athlete_equipment enable row level security;

create policy "athlete_equipment_select_own" on public.athlete_equipment
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "athlete_equipment_insert_own" on public.athlete_equipment
  for insert to authenticated with check ((select auth.uid()) = athlete_id);
create policy "athlete_equipment_update_own" on public.athlete_equipment
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);
create policy "athlete_equipment_delete_own" on public.athlete_equipment
  for delete to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.athlete_equipment from anon, authenticated;
grant select, insert, delete on public.athlete_equipment to authenticated;
grant update (loads_kg, note) on public.athlete_equipment to authenticated;

-- ---------------------------------------------------------------------------
-- availability_windows
-- ---------------------------------------------------------------------------

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- ISO: 1 = Monday
  available boolean not null,
  start_time time,
  end_time time,
  max_duration_min smallint check (max_duration_min is null or max_duration_min between 10 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, weekday),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or end_time > start_time),
  check (available or (start_time is null and max_duration_min is null)),
  check (not available or max_duration_min is not null)
);

comment on table public.availability_windows is
  'Weekly training availability (spec §9). A null time window means any time that day.';

create trigger availability_windows_set_updated_at
  before update on public.availability_windows
  for each row execute function public.set_updated_at();

alter table public.availability_windows enable row level security;

create policy "availability_select_own" on public.availability_windows
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "availability_insert_own" on public.availability_windows
  for insert to authenticated with check ((select auth.uid()) = athlete_id);
create policy "availability_update_own" on public.availability_windows
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);
create policy "availability_delete_own" on public.availability_windows
  for delete to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.availability_windows from anon, authenticated;
grant select, insert, delete on public.availability_windows to authenticated;
grant update (available, start_time, end_time, max_duration_min) on public.availability_windows to authenticated;

-- ---------------------------------------------------------------------------
-- body_measurements
-- ---------------------------------------------------------------------------

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('weight', 'body_fat', 'waist', 'chest', 'hip', 'thigh', 'arm')),
  value numeric(6, 2) not null,
  unit text not null,
  measured_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'smart_scale', 'wearable', 'import')),
  context text not null default 'general' check (context in ('spawn', 'general', 'checkpoint')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'weight' and unit = 'kg' and value between 30 and 350)
    or (kind = 'body_fat' and unit = 'percent' and value between 2 and 75)
    or (kind in ('waist', 'chest', 'hip', 'thigh', 'arm') and unit = 'cm' and value between 10 and 250)
  )
);

comment on table public.body_measurements is
  'Body measurements with explicit units (spec §10, §46). Not an athletic Stat.';

create unique index body_measurements_one_spawn_value
  on public.body_measurements (athlete_id, kind) where context = 'spawn';
create index body_measurements_timeline on public.body_measurements (athlete_id, kind, measured_at desc);

create trigger body_measurements_set_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

alter table public.body_measurements enable row level security;

create policy "body_measurements_select_own" on public.body_measurements
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "body_measurements_insert_own" on public.body_measurements
  for insert to authenticated with check ((select auth.uid()) = athlete_id);
create policy "body_measurements_update_own" on public.body_measurements
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);
create policy "body_measurements_delete_own" on public.body_measurements
  for delete to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.body_measurements from anon, authenticated;
grant select, insert, delete on public.body_measurements to authenticated;
grant update (value, measured_at) on public.body_measurements to authenticated;

-- ---------------------------------------------------------------------------
-- assessment_tests (reference)
-- ---------------------------------------------------------------------------

create table public.assessment_tests (
  key text primary key check (key ~ '^[MFE][0-9]{2}$'),
  session_kind text not null check (session_kind in ('movement', 'frame', 'engine')),
  sort_order smallint not null,
  name text not null,
  protocol_version text not null,
  primary_attributes text[] not null
    check (primary_attributes <@ array['endurance', 'strength', 'power', 'core', 'mobility', 'agility', 'recovery']::text[]),
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_kind, sort_order)
);

comment on table public.assessment_tests is
  'Spawn test catalog (spec §12–§14). Field definitions live in @ascend/shared; protocol_version ties raw results to the protocol used.';

create trigger assessment_tests_set_updated_at
  before update on public.assessment_tests
  for each row execute function public.set_updated_at();

insert into public.assessment_tests (key, session_kind, sort_order, name, protocol_version, primary_attributes) values
  ('M01', 'movement', 1, 'Deep Squat',                  '0.1.0', array['mobility']),
  ('M02', 'movement', 2, 'Ankle Wall Test',             '0.1.0', array['mobility']),
  ('M03', 'movement', 3, 'Shoulder Mobility',           '0.1.0', array['mobility']),
  ('M04', 'movement', 4, 'Single-Leg Balance',          '0.1.0', array['agility']),
  ('M05', 'movement', 5, 'Sit & Reach',                 '0.1.0', array['mobility']),
  ('M06', 'movement', 6, 'Dead Bug Control',            '0.1.0', array['core']),
  ('M07', 'movement', 7, 'Controlled Agility Baseline', '0.1.0', array['agility']),
  ('F01', 'frame',    1, 'Push',                        '0.1.0', array['strength']),
  ('F02', 'frame',    2, 'Goblet Squat',                '0.1.0', array['strength']),
  ('F03', 'frame',    3, 'Hinge',                       '0.1.0', array['strength']),
  ('F04', 'frame',    4, 'Pull',                        '0.1.0', array['strength']),
  ('F05', 'frame',    5, 'Farmer Carry',                '0.1.0', array['strength', 'core']),
  ('F06', 'frame',    6, 'Plank',                       '0.1.0', array['core']),
  ('E01', 'engine',   1, 'Resting Baseline',            '0.1.0', array['recovery']),
  ('E02', 'engine',   2, '6-Minute Brisk Walk',         '0.1.0', array['endurance']),
  ('E03', 'engine',   3, 'Heart-Rate Recovery',         '0.1.0', array['recovery']),
  ('E04', 'engine',   4, '20-Minute Run/Walk',          '0.1.0', array['endurance']);

alter table public.assessment_tests enable row level security;

create policy "assessment_tests_read"
  on public.assessment_tests for select to authenticated
  using (true);

revoke all on public.assessment_tests from anon, authenticated;
grant select on public.assessment_tests to authenticated;

-- ---------------------------------------------------------------------------
-- assessment_sessions
-- ---------------------------------------------------------------------------

create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('movement', 'frame', 'engine')),
  purpose text not null default 'spawn' check (purpose in ('spawn', 'reassessment')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_test_key text references public.assessment_tests (key),
  current_step text check (current_step is null or current_step in ('intro', 'execute', 'record', 'confirm')),
  safety_acknowledged_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id),
  check ((status = 'completed') = (completed_at is not null))
);

comment on table public.assessment_sessions is
  'One sitting-or-more of a Spawn session. Can span several days (spec §59). current_test_key/current_step are the resume pointer.';

-- Spawn runs each session once.
create unique index assessment_sessions_one_spawn_per_kind
  on public.assessment_sessions (athlete_id, kind) where purpose = 'spawn';

create trigger assessment_sessions_set_updated_at
  before update on public.assessment_sessions
  for each row execute function public.set_updated_at();

create or replace function private.guard_assessment_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_dev_reset() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Assessment sessions cannot be deleted' using errcode = 'insufficient_privilege';
  end if;

  if old.status = 'completed' then
    raise exception 'A completed assessment session cannot be changed' using errcode = 'check_violation';
  end if;

  if new.status = 'completed' then
    -- Every required test needs a resolved result and nothing may be open.
    if exists (
      select 1 from public.assessment_results r
      where r.session_id = new.id and r.status = 'in_progress'
    ) or exists (
      select 1 from public.assessment_tests t
      where t.session_kind = new.kind and t.required
        and not exists (
          select 1 from public.assessment_results r
          where r.session_id = new.id and r.test_key = t.key and r.status <> 'in_progress'
        )
    ) then
      raise exception 'Every test must be resolved before the session is completed'
        using errcode = 'check_violation';
    end if;
  end if;

  if new.current_test_key is not null and not exists (
    select 1 from public.assessment_tests t
    where t.key = new.current_test_key and t.session_kind = new.kind
  ) then
    raise exception 'Test % is not part of the % session', new.current_test_key, new.kind
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger assessment_sessions_guard
  before update or delete on public.assessment_sessions
  for each row execute function private.guard_assessment_session();

alter table public.assessment_sessions enable row level security;

create policy "assessment_sessions_select_own" on public.assessment_sessions
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "assessment_sessions_insert_own" on public.assessment_sessions
  for insert to authenticated with check ((select auth.uid()) = athlete_id);
create policy "assessment_sessions_update_own" on public.assessment_sessions
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);

revoke all on public.assessment_sessions from anon, authenticated;
grant select on public.assessment_sessions to authenticated;
grant insert (id, athlete_id, kind, purpose, current_test_key, current_step, safety_acknowledged_at)
  on public.assessment_sessions to authenticated;
grant update (status, completed_at, current_test_key, current_step, safety_acknowledged_at)
  on public.assessment_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- assessment_results
-- ---------------------------------------------------------------------------

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null,
  test_key text not null references public.assessment_tests (key),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'skipped', 'cannot_perform', 'aborted')),
  reason_code text check (reason_code is null or reason_code in
    ('pain', 'unable', 'unsafe', 'fatigue', 'no_equipment', 'no_space', 'time', 'other')),
  reason_note text check (reason_note is null or char_length(reason_note) <= 500),
  variant text check (variant is null or variant ~ '^[a-z][a-z0-9_]{0,39}$'),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  pain_reported boolean not null default false,
  pain_location text check (pain_location is null or char_length(pain_location) <= 40),
  pain_note text check (pain_note is null or char_length(pain_note) <= 500),
  source text not null default 'manual' check (source in ('manual', 'wearable')),
  source_ref text check (source_ref is null or char_length(source_ref) <= 200),
  protocol_version text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, athlete_id),
  foreign key (session_id, athlete_id)
    references public.assessment_sessions (id, athlete_id) on delete cascade,
  check ((status = 'in_progress') = (resolved_at is null)),
  check (status in ('in_progress', 'completed') or reason_code is not null),
  check (status <> 'completed' or reason_code is null)
);

comment on table public.assessment_results is
  'Raw Spawn test outcome (spec §47). Immutable once resolved; retries add a new row (ADR-014).';
comment on column public.assessment_results.data is
  'Test-level raw values validated by the @ascend/shared test catalog (e.g. incline height).';
comment on column public.assessment_results.source is
  'manual now; wearable when a HealthDataProvider import creates the row (spec §24, ADR-020).';

create unique index assessment_results_one_open
  on public.assessment_results (session_id, test_key) where status = 'in_progress';
create unique index assessment_results_one_completed
  on public.assessment_results (session_id, test_key) where status = 'completed';
create index assessment_results_by_athlete on public.assessment_results (athlete_id, test_key);

create trigger assessment_results_set_updated_at
  before update on public.assessment_results
  for each row execute function public.set_updated_at();

create or replace function private.guard_assessment_result()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  session_row public.assessment_sessions%rowtype;
begin
  if private.is_dev_reset() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Assessment results cannot be deleted' using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'UPDATE' then
    if old.status <> 'in_progress' then
      raise exception 'A resolved assessment result is immutable' using errcode = 'check_violation';
    end if;
    if new.test_key <> old.test_key or new.session_id <> old.session_id
       or new.protocol_version <> old.protocol_version then
      raise exception 'Result identity cannot change' using errcode = 'check_violation';
    end if;
  end if;

  select * into session_row from public.assessment_sessions where id = new.session_id;
  if session_row.status <> 'in_progress' then
    raise exception 'The assessment session is already completed' using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.assessment_tests t
    where t.key = new.test_key and t.session_kind = session_row.kind
  ) then
    raise exception 'Test % is not part of the % session', new.test_key, session_row.kind
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' and exists (
    select 1 from public.assessment_results r
    where r.session_id = new.session_id and r.test_key = new.test_key and r.status = 'completed'
  ) then
    raise exception 'Test % is already completed in this session', new.test_key
      using errcode = 'check_violation';
  end if;

  if new.status <> 'in_progress' then
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;

  return new;
end;
$$;

create trigger assessment_results_guard
  before insert or update or delete on public.assessment_results
  for each row execute function private.guard_assessment_result();

alter table public.assessment_results enable row level security;

create policy "assessment_results_select_own" on public.assessment_results
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "assessment_results_insert_own" on public.assessment_results
  for insert to authenticated with check ((select auth.uid()) = athlete_id);
create policy "assessment_results_update_own" on public.assessment_results
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);

revoke all on public.assessment_results from anon, authenticated;
grant select on public.assessment_results to authenticated;
grant insert (
  id, athlete_id, session_id, test_key, status, reason_code, reason_note, variant, data,
  pain_reported, pain_location, pain_note, source, source_ref, protocol_version
) on public.assessment_results to authenticated;
grant update (
  status, reason_code, reason_note, variant, data, pain_reported, pain_location,
  pain_note, source, source_ref
) on public.assessment_results to authenticated;

-- ---------------------------------------------------------------------------
-- assessment_attempts
-- ---------------------------------------------------------------------------

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  result_id uuid not null,
  attempt_number smallint not null check (attempt_number between 1 and 20),
  side text not null default 'none' check (side in ('none', 'left', 'right')),
  measure_cm numeric(5, 1) check (measure_cm is null or measure_cm between -100 and 300),
  duration_s numeric(7, 2) check (duration_s is null or duration_s between 0 and 86400),
  distance_m numeric(8, 1) check (distance_m is null or distance_m between 0 and 100000),
  load_kg numeric(6, 2) check (load_kg is null or load_kg between 0 and 500),
  reps smallint check (reps is null or reps between 0 and 500),
  rpe numeric(3, 1) check (rpe is null or rpe between 1 and 10),
  avg_hr_bpm smallint check (avg_hr_bpm is null or avg_hr_bpm between 25 and 250),
  max_hr_bpm smallint check (max_hr_bpm is null or max_hr_bpm between 25 and 250),
  avg_pace_s_per_km numeric(6, 1) check (avg_pace_s_per_km is null or avg_pace_s_per_km between 60 and 3600),
  technique text check (technique is null or technique in ('clean', 'minor_compensation', 'breakdown')),
  limiting_factor text check (limiting_factor is null or limiting_factor ~ '^[a-z][a-z_]{1,39}$'),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (result_id, side, attempt_number),
  foreign key (result_id, athlete_id)
    references public.assessment_results (id, athlete_id) on delete cascade,
  check (max_hr_bpm is null or avg_hr_bpm is null or max_hr_bpm >= avg_hr_bpm)
);

comment on table public.assessment_attempts is
  'Every attempt, set or side of a Spawn test (ADR-013). Best-of values are derived, never stored.';

create trigger assessment_attempts_set_updated_at
  before update on public.assessment_attempts
  for each row execute function public.set_updated_at();

create or replace function private.guard_assessment_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status text;
begin
  if private.is_dev_reset() then
    return coalesce(new, old);
  end if;

  select status into parent_status
  from public.assessment_results
  where id = coalesce(new.result_id, old.result_id);

  if parent_status is distinct from 'in_progress' then
    raise exception 'Attempts of a resolved result are immutable' using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and new.result_id <> old.result_id then
    raise exception 'An attempt cannot move to another result' using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger assessment_attempts_guard
  before insert or update or delete on public.assessment_attempts
  for each row execute function private.guard_assessment_attempt();

alter table public.assessment_attempts enable row level security;

create policy "assessment_attempts_select_own" on public.assessment_attempts
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "assessment_attempts_insert_own" on public.assessment_attempts
  for insert to authenticated with check ((select auth.uid()) = athlete_id);
create policy "assessment_attempts_update_own" on public.assessment_attempts
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);
create policy "assessment_attempts_delete_own" on public.assessment_attempts
  for delete to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.assessment_attempts from anon, authenticated;
grant select, delete on public.assessment_attempts to authenticated;
grant insert (
  id, athlete_id, result_id, attempt_number, side, measure_cm, duration_s, distance_m,
  load_kg, reps, rpe, avg_hr_bpm, max_hr_bpm, avg_pace_s_per_km, technique,
  limiting_factor, data, recorded_at
) on public.assessment_attempts to authenticated;
grant update (
  measure_cm, duration_s, distance_m, load_kg, reps, rpe, avg_hr_bpm, max_hr_bpm,
  avg_pace_s_per_km, technique, limiting_factor, data, recorded_at
) on public.assessment_attempts to authenticated;

-- ---------------------------------------------------------------------------
-- movement_flags
-- ---------------------------------------------------------------------------

create table public.movement_flags (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  source text not null default 'spawn_test' check (source in ('spawn_test', 'workout', 'manual')),
  result_id uuid,
  test_key text references public.assessment_tests (key),
  location text check (location is null or char_length(location) <= 40),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (result_id, athlete_id)
    references public.assessment_results (id, athlete_id) on delete cascade,
  check ((status = 'resolved') = (resolved_at is not null))
);

comment on table public.movement_flags is
  'Pain/symptom/safety observations, separate from any score (spec §2, §53, §72.4).';

create unique index movement_flags_one_per_result on public.movement_flags (result_id) where result_id is not null;

create trigger movement_flags_set_updated_at
  before update on public.movement_flags
  for each row execute function public.set_updated_at();

alter table public.movement_flags enable row level security;

create policy "movement_flags_select_own" on public.movement_flags
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "movement_flags_update_own" on public.movement_flags
  for update to authenticated
  using ((select auth.uid()) = athlete_id) with check ((select auth.uid()) = athlete_id);

revoke all on public.movement_flags from anon, authenticated;
grant select on public.movement_flags to authenticated;
grant update (status, resolved_at) on public.movement_flags to authenticated;

-- ---------------------------------------------------------------------------
-- performance_evidence
-- ---------------------------------------------------------------------------

create table public.performance_evidence (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null
    check (source_type in ('spawn_test', 'reassessment', 'workout', 'boss', 'wearable', 'manual')),
  test_key text references public.assessment_tests (key),
  assessment_result_id uuid unique,
  occurred_at timestamptz not null,
  raw_payload jsonb not null check (jsonb_typeof(raw_payload) = 'object'),
  quality numeric(4, 3) check (quality is null or quality between 0 and 1),
  evidence_weight numeric(4, 3) check (evidence_weight is null or evidence_weight between 0 and 1),
  engine_version text,
  created_at timestamptz not null default now(),
  foreign key (assessment_result_id, athlete_id)
    references public.assessment_results (id, athlete_id) on delete cascade
);

comment on table public.performance_evidence is
  'Immutable raw evidence (spec §5). quality/evidence_weight/engine_version are engine-assigned and null in M2 (ADR-015).';

create index performance_evidence_by_athlete on public.performance_evidence (athlete_id, occurred_at desc);

create or replace function private.guard_performance_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_dev_reset() then
    return coalesce(new, old);
  end if;
  raise exception 'Performance evidence is append-only' using errcode = 'insufficient_privilege';
end;
$$;

create trigger performance_evidence_append_only
  before update or delete on public.performance_evidence
  for each row execute function private.guard_performance_evidence();

alter table public.performance_evidence enable row level security;

create policy "performance_evidence_select_own" on public.performance_evidence
  for select to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.performance_evidence from anon, authenticated;
grant select on public.performance_evidence to authenticated;

-- ---------------------------------------------------------------------------
-- Result resolution: evidence + movement flags
-- ---------------------------------------------------------------------------

-- security definer: clients cannot write evidence or flags directly. The row
-- being resolved has already passed RLS, so athlete_id is the caller's own.
create or replace function private.on_assessment_result_resolved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_pain_limit boolean;
begin
  if new.status = 'in_progress' or (tg_op = 'UPDATE' and old.status <> 'in_progress') then
    return new;
  end if;

  select exists (
    select 1 from public.assessment_attempts a
    where a.result_id = new.id and a.limiting_factor = 'pain'
  ) into has_pain_limit;

  if new.pain_reported or new.reason_code = 'pain' or has_pain_limit then
    insert into public.movement_flags (athlete_id, source, result_id, test_key, location, note)
    values (
      new.athlete_id,
      case when (select purpose from public.assessment_sessions where id = new.session_id) = 'spawn'
        then 'spawn_test' else 'manual' end,
      new.id,
      new.test_key,
      new.pain_location,
      coalesce(new.pain_note, case when new.reason_code = 'pain' then new.reason_note end)
    );
  end if;

  if new.status = 'completed' then
    insert into public.performance_evidence (
      athlete_id, source_type, test_key, assessment_result_id, occurred_at, raw_payload
    )
    values (
      new.athlete_id,
      case when (select purpose from public.assessment_sessions where id = new.session_id) = 'spawn'
        then 'spawn_test' else 'reassessment' end,
      new.test_key,
      new.id,
      new.resolved_at,
      jsonb_build_object(
        'protocol_version', new.protocol_version,
        'source', new.source,
        'source_ref', new.source_ref,
        'variant', new.variant,
        'data', new.data,
        'pain_reported', new.pain_reported or has_pain_limit,
        'attempts', coalesce((
          select jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'attempt_number', a.attempt_number,
              'side', a.side,
              'measure_cm', a.measure_cm,
              'duration_s', a.duration_s,
              'distance_m', a.distance_m,
              'load_kg', a.load_kg,
              'reps', a.reps,
              'rpe', a.rpe,
              'avg_hr_bpm', a.avg_hr_bpm,
              'max_hr_bpm', a.max_hr_bpm,
              'avg_pace_s_per_km', a.avg_pace_s_per_km,
              'technique', a.technique,
              'limiting_factor', a.limiting_factor,
              'data', a.data,
              'recorded_at', a.recorded_at
            ))
            order by a.side, a.attempt_number
          )
          from public.assessment_attempts a
          where a.result_id = new.id
        ), '[]'::jsonb)
      )
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.on_assessment_result_resolved() from public, anon, authenticated;

create trigger assessment_results_on_resolved
  after insert or update of status on public.assessment_results
  for each row execute function private.on_assessment_result_resolved();

-- ---------------------------------------------------------------------------
-- Development reset (ADR-019)
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

comment on function public.dev_reset_spawn(boolean) is
  'Development only: deletes the caller''s Spawn data. Refuses unless private.environment_flags.dev_tools = enabled (ADR-019).';

revoke execute on function public.dev_reset_spawn(boolean) from public, anon;
grant execute on function public.dev_reset_spawn(boolean) to authenticated;
