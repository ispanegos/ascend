-- ASCEND Milestone 3 — Stats Engine persistence (spec §46, §47, §48).
--
-- Derived data is written only by the server through
-- public.engine_record_calculation(), which is executable by service_role
-- alone. Athletes can read their own snapshots; nobody can change them.
-- Snapshots are append-only: a new engine version adds new rows, it never
-- rewrites history (spec §0.13, §47).

-- ---------------------------------------------------------------------------
-- Engine registry (reference, read-only to clients)
-- ---------------------------------------------------------------------------

create table public.engine_versions (
  version text primary key check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  config_hash text not null check (config_hash ~ '^[0-9a-f]{64}$'),
  calibration_status text not null check (calibration_status in ('provisional', 'validated')),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  registered_at timestamptz not null default now()
);

comment on table public.engine_versions is
  'Every engine version that produced a snapshot, with its full configuration. provisional = internal calibration, not norms.';

create table public.scoring_curves (
  id uuid primary key default gen_random_uuid(),
  engine_version text not null references public.engine_versions (version),
  curve_key text not null,
  test_key text not null references public.assessment_tests (key),
  feature text not null,
  kind text not null check (kind in ('numeric', 'categorical')),
  direction text check (direction is null or direction in ('increasing', 'decreasing')),
  body_mass_mode text check (body_mass_mode is null or body_mass_mode in ('none', 'absolute', 'relative', 'mixed')),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  calibration_status text not null check (calibration_status in ('provisional', 'validated')),
  created_at timestamptz not null default now(),
  unique (engine_version, curve_key)
);

comment on table public.scoring_curves is
  'Versioned raw→score curves (spec §4). Provisional v0.1 curves are internal calibration, not population norms.';

create table public.engine_config (
  engine_version text not null references public.engine_versions (version),
  section text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  primary key (engine_version, section)
);

comment on table public.engine_config is 'Configuration sections of each engine version (spec §54).';

-- ---------------------------------------------------------------------------
-- Calculations and snapshots (athlete-owned, append-only)
-- ---------------------------------------------------------------------------

create table public.stat_calculations (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  engine_version text not null references public.engine_versions (version),
  config_hash text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  reason text not null check (reason in ('spawn_initialization', 'recalculation', 'update')),
  as_of timestamptz not null,
  gaps jsonb not null default '[]' check (jsonb_typeof(gaps) = 'array'),
  created_at timestamptz not null default now(),
  unique (id, athlete_id),
  -- Idempotency: the same evidence under the same engine is one calculation.
  unique (athlete_id, engine_version, input_hash)
);

comment on table public.stat_calculations is
  'One engine run: which engine and configuration, which inputs (input_hash), why and as of when.';

create table public.calculation_evidence (
  calculation_id uuid not null references public.stat_calculations (id) on delete cascade,
  evidence_id uuid not null references public.performance_evidence (id) on delete cascade,
  primary key (calculation_id, evidence_id)
);

comment on table public.calculation_evidence is 'Evidence each calculation read (spec §47 auditability).';

create table public.stat_snapshots (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  calculation_id uuid not null,
  attribute text not null check (attribute in ('endurance', 'strength', 'power', 'core', 'mobility', 'agility', 'recovery')),
  current numeric(7, 4) check (current is null or current between 0 and 100),
  peak numeric(7, 4) check (peak is null or peak between 0 and 100),
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  coverage numeric(5, 4) not null check (coverage between 0 and 1),
  status text not null check (status in ('unranked', 'provisional', 'verified')),
  peak_updated boolean not null default false,
  engine_version text not null references public.engine_versions (version),
  evidence_ids uuid[] not null default '{}',
  trace jsonb not null check (jsonb_typeof(trace) = 'object'),
  calculated_at timestamptz not null default now(),
  foreign key (calculation_id, athlete_id) references public.stat_calculations (id, athlete_id) on delete cascade,
  unique (calculation_id, attribute),
  check ((status = 'unranked') = (current is null))
);

comment on table public.stat_snapshots is
  'Immutable derived Stat per calculation (spec §3, §47). trace answers "why is this number what it is".';
comment on column public.stat_snapshots.current is 'Internal decimal; the UI rounds (spec §3).';

create index stat_snapshots_history on public.stat_snapshots (athlete_id, attribute, calculated_at desc);

create table public.overall_snapshots (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles (id) on delete cascade,
  calculation_id uuid not null unique,
  current numeric(7, 4) check (current is null or current between 0 and 100),
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  status text not null check (status in ('unranked', 'provisional', 'verified')),
  participating text[] not null default '{}',
  engine_version text not null references public.engine_versions (version),
  trace jsonb not null check (jsonb_typeof(trace) = 'object'),
  calculated_at timestamptz not null default now(),
  foreign key (calculation_id, athlete_id) references public.stat_calculations (id, athlete_id) on delete cascade,
  check ((status = 'unranked') = (current is null))
);

comment on table public.overall_snapshots is 'Immutable derived Overall per calculation (spec §8).';

-- Append-only: nothing edits derived history (dev reset excepted).
create or replace function private.guard_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_dev_reset() then
    return coalesce(new, old);
  end if;
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;

create trigger engine_versions_append_only before update or delete on public.engine_versions
  for each row execute function private.guard_append_only();
create trigger scoring_curves_append_only before update or delete on public.scoring_curves
  for each row execute function private.guard_append_only();
create trigger engine_config_append_only before update or delete on public.engine_config
  for each row execute function private.guard_append_only();
create trigger stat_calculations_append_only before update or delete on public.stat_calculations
  for each row execute function private.guard_append_only();
create trigger calculation_evidence_append_only before update or delete on public.calculation_evidence
  for each row execute function private.guard_append_only();
create trigger stat_snapshots_append_only before update or delete on public.stat_snapshots
  for each row execute function private.guard_append_only();
create trigger overall_snapshots_append_only before update or delete on public.overall_snapshots
  for each row execute function private.guard_append_only();

-- ---------------------------------------------------------------------------
-- RLS: reference tables readable; athlete tables read-own; no client writes
-- ---------------------------------------------------------------------------

alter table public.engine_versions enable row level security;
alter table public.scoring_curves enable row level security;
alter table public.engine_config enable row level security;
alter table public.stat_calculations enable row level security;
alter table public.calculation_evidence enable row level security;
alter table public.stat_snapshots enable row level security;
alter table public.overall_snapshots enable row level security;

create policy "engine_versions_read" on public.engine_versions for select to authenticated using (true);
create policy "scoring_curves_read" on public.scoring_curves for select to authenticated using (true);
create policy "engine_config_read" on public.engine_config for select to authenticated using (true);

create policy "stat_calculations_select_own" on public.stat_calculations
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "calculation_evidence_select_own" on public.calculation_evidence
  for select to authenticated using (
    exists (select 1 from public.stat_calculations c where c.id = calculation_id and c.athlete_id = (select auth.uid()))
  );
create policy "stat_snapshots_select_own" on public.stat_snapshots
  for select to authenticated using ((select auth.uid()) = athlete_id);
create policy "overall_snapshots_select_own" on public.overall_snapshots
  for select to authenticated using ((select auth.uid()) = athlete_id);

revoke all on public.engine_versions, public.scoring_curves, public.engine_config, public.stat_calculations,
  public.calculation_evidence, public.stat_snapshots, public.overall_snapshots from anon, authenticated;
grant select on public.engine_versions, public.scoring_curves, public.engine_config, public.stat_calculations,
  public.calculation_evidence, public.stat_snapshots, public.overall_snapshots to authenticated;

-- ---------------------------------------------------------------------------
-- The only write path for derived data
-- ---------------------------------------------------------------------------

create or replace function public.engine_record_calculation(
  p_athlete_id uuid,
  p_reason text,
  p_result jsonb,
  p_engine jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text := p_result ->> 'engine_version';
  v_hash text := p_result ->> 'config_hash';
  v_input_hash text := p_result ->> 'input_hash';
  v_calculation uuid;
  v_existing_hash text;
  v_attribute text;
  v_stat jsonb;
  v_state text;
  v_curve_key text;
  v_curve jsonb;
  v_section text;
begin
  if p_reason not in ('spawn_initialization', 'recalculation', 'update') then
    raise exception 'unknown reason %', p_reason using errcode = 'check_violation';
  end if;
  if p_result ->> 'athlete_id' is distinct from p_athlete_id::text then
    raise exception 'result belongs to another athlete' using errcode = 'insufficient_privilege';
  end if;
  if p_engine ->> 'engine_version' is distinct from v_version or p_engine ->> 'config_hash' is distinct from v_hash then
    raise exception 'engine metadata does not match the result' using errcode = 'check_violation';
  end if;

  -- Register the engine version once. A changed configuration needs a new version.
  select config_hash into v_existing_hash from public.engine_versions where version = v_version;
  if v_existing_hash is null then
    insert into public.engine_versions (version, config_hash, calibration_status, config)
    values (v_version, v_hash, p_engine ->> 'calibration_status', p_engine -> 'config');

    for v_curve_key, v_curve in select key, value from jsonb_each(p_engine -> 'config' -> 'curves') loop
      insert into public.scoring_curves (
        engine_version, curve_key, test_key, feature, kind, direction, body_mass_mode, definition, calibration_status
      ) values (
        v_version, v_curve_key, v_curve ->> 'test', v_curve ->> 'feature',
        coalesce(v_curve ->> 'kind', 'numeric'), v_curve ->> 'direction', v_curve ->> 'body_mass_mode',
        v_curve, p_engine ->> 'calibration_status'
      );
    end loop;

    for v_section in select key from jsonb_each(p_engine -> 'config') where key <> 'curves' loop
      insert into public.engine_config (engine_version, section, value)
      values (v_version, v_section, p_engine -> 'config' -> v_section);
    end loop;
  elsif v_existing_hash <> v_hash then
    raise exception 'engine % is registered with a different configuration; bump the engine version', v_version
      using errcode = 'check_violation';
  end if;

  -- Idempotent: same athlete, engine and inputs → the existing calculation.
  select id into v_calculation from public.stat_calculations
  where athlete_id = p_athlete_id and engine_version = v_version and input_hash = v_input_hash;

  if v_calculation is null then
    insert into public.stat_calculations (athlete_id, engine_version, config_hash, input_hash, reason, as_of, gaps)
    values (
      p_athlete_id, v_version, v_hash, v_input_hash, p_reason,
      (p_result ->> 'as_of')::timestamptz, coalesce(p_result -> 'gaps', '[]'::jsonb)
    )
    returning id into v_calculation;

    -- Only the athlete's own evidence can be linked.
    insert into public.calculation_evidence (calculation_id, evidence_id)
    select v_calculation, e.id
    from public.performance_evidence e
    where e.athlete_id = p_athlete_id
      and e.id::text in (select jsonb_array_elements_text(p_result -> 'evidence_ids'));

    if (select count(*) from public.calculation_evidence where calculation_id = v_calculation)
       <> jsonb_array_length(coalesce(p_result -> 'evidence_ids', '[]'::jsonb)) then
      raise exception 'result references evidence that is not the athlete''s' using errcode = 'insufficient_privilege';
    end if;

    for v_attribute, v_stat in select key, value from jsonb_each(p_result -> 'attributes') loop
      insert into public.stat_snapshots (
        athlete_id, calculation_id, attribute, current, peak, confidence, coverage, status,
        peak_updated, engine_version, evidence_ids, trace
      ) values (
        p_athlete_id, v_calculation, v_attribute,
        (v_stat ->> 'current')::numeric, (v_stat ->> 'peak')::numeric,
        (v_stat ->> 'confidence')::numeric, (v_stat ->> 'coverage')::numeric,
        v_stat ->> 'status', coalesce((v_stat ->> 'peak_updated')::boolean, false), v_version,
        coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(v_stat -> 'evidence_ids') x), '{}'),
        v_stat -> 'trace'
      );
    end loop;

    insert into public.overall_snapshots (athlete_id, calculation_id, current, confidence, status, participating, engine_version, trace)
    values (
      p_athlete_id, v_calculation,
      (p_result -> 'overall' ->> 'current')::numeric,
      (p_result -> 'overall' ->> 'confidence')::numeric,
      p_result -> 'overall' ->> 'status',
      coalesce((select array_agg(x) from jsonb_array_elements_text(p_result -> 'overall' -> 'participating') x), '{}'),
      v_version,
      p_result -> 'overall' -> 'trace'
    );
  end if;

  -- Spawn initialization completes Spawn: CALIBRATING → COMPLETE (one step).
  if p_reason = 'spawn_initialization' then
    select spawn_state into v_state from public.athlete_settings where athlete_id = p_athlete_id;
    if v_state = 'CALIBRATING' then
      update public.athlete_settings
      set spawn_state = 'COMPLETE', spawn_completed_at = now()
      where athlete_id = p_athlete_id;
    elsif v_state <> 'COMPLETE' then
      raise exception 'Spawn is not waiting for calibration (state %)', v_state using errcode = 'check_violation';
    end if;
  end if;

  return v_calculation;
end;
$$;

comment on function public.engine_record_calculation(uuid, text, jsonb, jsonb) is
  'Persists one engine result atomically and idempotently. service_role only: clients can never write Stats.';

revoke execute on function public.engine_record_calculation(uuid, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.engine_record_calculation(uuid, text, jsonb, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Development reset also clears derived Stats (ADR-019)
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
