-- ASCEND Milestone 3.1 — Peak semantics (spec §7, ADR-032).
--
-- `peak` becomes `verified_peak` (highest Current while VERIFIED) and a new
-- `provisional_peak` records the highest Current ever calculated. Existing
-- rows keep their values: a column rename, not a rewrite of history.

alter table public.stat_snapshots rename column peak to verified_peak;
alter table public.stat_snapshots rename column peak_updated to verified_peak_updated;
alter table public.stat_snapshots
  add column provisional_peak numeric(7, 4)
    check (provisional_peak is null or provisional_peak between 0 and 100);

comment on column public.stat_snapshots.verified_peak is
  'Highest Current recorded while the Stat was VERIFIED. Never decreases (spec §7).';
comment on column public.stat_snapshots.provisional_peak is
  'Highest Current ever recorded, verified or not. A historical maximum, not verified capability.';

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

  select id into v_calculation from public.stat_calculations
  where athlete_id = p_athlete_id and engine_version = v_version and input_hash = v_input_hash;

  if v_calculation is null then
    insert into public.stat_calculations (athlete_id, engine_version, config_hash, input_hash, reason, as_of, gaps)
    values (
      p_athlete_id, v_version, v_hash, v_input_hash, p_reason,
      (p_result ->> 'as_of')::timestamptz, coalesce(p_result -> 'gaps', '[]'::jsonb)
    )
    returning id into v_calculation;

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
        athlete_id, calculation_id, attribute, current, verified_peak, provisional_peak, confidence, coverage,
        status, verified_peak_updated, engine_version, evidence_ids, trace
      ) values (
        p_athlete_id, v_calculation, v_attribute,
        (v_stat ->> 'current')::numeric,
        (v_stat ->> 'verified_peak')::numeric,
        (v_stat ->> 'provisional_peak')::numeric,
        (v_stat ->> 'confidence')::numeric, (v_stat ->> 'coverage')::numeric,
        v_stat ->> 'status', coalesce((v_stat ->> 'verified_peak_updated')::boolean, false), v_version,
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

revoke execute on function public.engine_record_calculation(uuid, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.engine_record_calculation(uuid, text, jsonb, jsonb) to service_role;
