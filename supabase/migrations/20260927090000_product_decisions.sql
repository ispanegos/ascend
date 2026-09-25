-- ASCEND — approved product decisions after the Milestone 2 review (ADR-023).
--
-- Replaces option vocabularies and maps any existing values. Resolved
-- results are immutable, so the mapping runs under the same transaction-local
-- bypass the development reset uses; it changes vocabulary only, never a
-- measured value. Only local development data exists at this point.

select set_config('ascend.dev_reset', 'on', true);

-- ---------------------------------------------------------------------------
-- Experience and inactivity (context only, never Stats)
-- ---------------------------------------------------------------------------

alter table public.profiles drop constraint profiles_training_experience_check;
alter table public.profiles drop constraint profiles_recent_inactivity_check;

update public.profiles set training_experience = case training_experience
  when 'none' then 'never_trained'
  when 'under_1_year' then 'beginner'
  when '1_3_years' then 'recreational'
  when 'over_3_years' then 'trained'
  else training_experience end
where training_experience is not null;

update public.profiles set recent_inactivity = case recent_inactivity
  when 'under_3_months' then '1_3_months'
  when '3_12_months' then '6_12_months'
  else recent_inactivity end
where recent_inactivity is not null;

alter table public.profiles
  add constraint profiles_training_experience_check check (training_experience is null or training_experience in
    ('never_trained', 'beginner', 'recreational', 'trained', 'competitive')),
  add constraint profiles_recent_inactivity_check check (recent_inactivity is null or recent_inactivity in
    ('active', 'under_1_month', '1_3_months', '3_6_months', '6_12_months', 'over_12_months'));

comment on column public.profiles.training_experience is
  'Context only (ADR-023). Never used to assign or adjust Stats.';
comment on column public.profiles.recent_inactivity is
  'Context only (ADR-023). Never used to assign or adjust Stats.';

-- ---------------------------------------------------------------------------
-- Skip / cannot-perform reasons
-- ---------------------------------------------------------------------------

alter table public.assessment_results drop constraint assessment_results_reason_code_check;

update public.assessment_results set reason_code = case reason_code
  when 'unable' then 'cannot_perform_safely'
  when 'unsafe' then 'cannot_perform_safely'
  when 'no_equipment' then 'missing_equipment'
  when 'no_space' then 'environment_unavailable'
  when 'fatigue' then 'other'
  when 'time' then 'other'
  else reason_code end
where reason_code is not null;

alter table public.assessment_results
  add constraint assessment_results_reason_code_check check (reason_code is null or reason_code in
    ('cannot_perform_safely', 'pain', 'missing_equipment', 'environment_unavailable',
     'does_not_know_technique', 'other'));

-- Strength "why did you stop adding load" uses the limiting-factor vocabulary.
update public.assessment_results
set data = jsonb_set(data, '{stop_reason}', to_jsonb(case data ->> 'stop_reason'
  when 'effort' then 'muscular_fatigue'
  when 'no_heavier_load' then 'nothing'
  when 'voluntary' then 'other'
  else data ->> 'stop_reason' end))
where data ? 'stop_reason';

-- ---------------------------------------------------------------------------
-- Technique and limiting factors
-- ---------------------------------------------------------------------------

alter table public.assessment_attempts drop constraint assessment_attempts_technique_check;
alter table public.assessment_attempts drop constraint assessment_attempts_limiting_factor_check;

update public.assessment_attempts set technique = 'major_compensation' where technique = 'breakdown';

update public.assessment_attempts set limiting_factor = case limiting_factor
  when 'fatigue' then 'muscular_fatigue'
  when 'legs' then 'muscular_fatigue'
  when 'posture_failure' then 'technique'
  when 'position_lost' then 'technique'
  when 'grip_failure' then 'grip'
  when 'time_cap' then 'nothing'
  when 'could_continue' then 'nothing'
  when 'voluntary' then 'other'
  when 'voluntary_stop' then 'other'
  else limiting_factor end
where limiting_factor is not null;

alter table public.assessment_attempts
  add constraint assessment_attempts_technique_check check (technique is null or technique in
    ('clean', 'minor_compensation', 'major_compensation', 'stopped_for_technique')),
  add constraint assessment_attempts_limiting_factor_check check (limiting_factor is null or limiting_factor in
    ('nothing', 'breath', 'muscular_fatigue', 'grip', 'technique', 'pain', 'pacing', 'other'));

-- ---------------------------------------------------------------------------
-- Evidence payload: one builder used by the trigger and by this migration
-- ---------------------------------------------------------------------------

create or replace function private.evidence_payload(p_result_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'protocol_version', r.protocol_version,
    'source', r.source,
    'source_ref', r.source_ref,
    'variant', r.variant,
    'data', r.data,
    'pain_reported', r.pain_reported or exists (
      select 1 from public.assessment_attempts a where a.result_id = r.id and a.limiting_factor = 'pain'
    ),
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
      where a.result_id = r.id
    ), '[]'::jsonb)
  )
  from public.assessment_results r
  where r.id = p_result_id;
$$;

revoke execute on function private.evidence_payload(uuid) from public, anon, authenticated;

create or replace function private.on_assessment_result_resolved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_pain_limit boolean;
  session_purpose text;
begin
  if new.status = 'in_progress' or (tg_op = 'UPDATE' and old.status <> 'in_progress') then
    return new;
  end if;

  select purpose into session_purpose from public.assessment_sessions where id = new.session_id;
  select exists (
    select 1 from public.assessment_attempts a
    where a.result_id = new.id and a.limiting_factor = 'pain'
  ) or coalesce(new.data ->> 'stop_reason', '') = 'pain'
  into has_pain_limit;

  if new.pain_reported or new.reason_code = 'pain' or has_pain_limit then
    insert into public.movement_flags (athlete_id, source, result_id, test_key, location, note)
    values (
      new.athlete_id,
      case when session_purpose = 'spawn' then 'spawn_test' else 'manual' end,
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
      case when session_purpose = 'spawn' then 'spawn_test' else 'reassessment' end,
      new.test_key,
      new.id,
      new.resolved_at,
      private.evidence_payload(new.id)
    );
  end if;

  return new;
end;
$$;

-- Rebuild payloads so evidence uses the approved vocabulary (vocabulary only).
update public.performance_evidence e
set raw_payload = private.evidence_payload(e.assessment_result_id)
where e.assessment_result_id is not null;

select set_config('ascend.dev_reset', '', true);
