-- RLS, integrity triggers and dev-reset guard for the Milestone 2 Spawn
-- schema (spec §11, §47, §48, §53; ADR-012 – ADR-019).
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;

select plan(57);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'spawn-a@example.test', '{}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'spawn-b@example.test', '{}');

-- Start with dev tools off regardless of the local seed; rolled back at the end.
delete from private.environment_flags where key = 'dev_tools';

-- Athlete B owns one session and result that A must never see or touch.
insert into public.assessment_sessions (id, athlete_id, kind)
values ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'movement');
insert into public.assessment_results (id, athlete_id, session_id, test_key, protocol_version)
values ('b0000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'b0000000-0000-0000-0000-000000000001', 'M01', '0.1.0');

-- ---------------------------------------------------------------------------
-- Structure
-- ---------------------------------------------------------------------------

select ok(
  (select bool_and(relrowsecurity) from pg_class where oid in (
    'public.athlete_settings'::regclass, 'public.equipment'::regclass,
    'public.athlete_equipment'::regclass, 'public.availability_windows'::regclass,
    'public.body_measurements'::regclass, 'public.assessment_tests'::regclass,
    'public.assessment_sessions'::regclass, 'public.assessment_results'::regclass,
    'public.assessment_attempts'::regclass, 'public.movement_flags'::regclass,
    'public.performance_evidence'::regclass
  )),
  'RLS is enabled on every Milestone 2 table'
);
select is((select count(*)::int from public.assessment_tests), 17, 'all 17 Spawn tests are catalogued');
select ok((select count(*) from public.equipment) >= 15, 'reference equipment is seeded');

-- Clients cannot write reference data, evidence or flags directly
select ok(not has_table_privilege('authenticated', 'public.equipment', 'INSERT'), 'equipment is read-only');
select ok(not has_table_privilege('authenticated', 'public.assessment_tests', 'UPDATE'), 'assessment_tests is read-only');
select ok(not has_table_privilege('authenticated', 'public.performance_evidence', 'INSERT'), 'clients cannot insert evidence');
select ok(not has_table_privilege('authenticated', 'public.performance_evidence', 'UPDATE'), 'clients cannot update evidence');
select ok(not has_table_privilege('authenticated', 'public.movement_flags', 'INSERT'), 'clients cannot insert flags directly');
select ok(not has_table_privilege('authenticated', 'public.assessment_results', 'DELETE'), 'clients cannot delete results');
select ok(not has_column_privilege('authenticated', 'public.assessment_results', 'athlete_id', 'UPDATE'), 'result owner cannot change');
-- Every column the app writes on insert is granted (a missing one broke saving once).
select ok(
  (select bool_and(has_column_privilege('authenticated', 'public.assessment_attempts', c, 'INSERT'))
   from unnest(array['id', 'athlete_id', 'result_id', 'attempt_number', 'side', 'measure_cm', 'duration_s',
     'distance_m', 'load_kg', 'reps', 'rpe', 'avg_hr_bpm', 'max_hr_bpm', 'avg_pace_s_per_km', 'technique',
     'limiting_factor', 'data', 'recorded_at']) as c),
  'authenticated can insert every attempt column the app sends'
);
select ok(
  not has_column_privilege('authenticated', 'public.assessment_attempts', 'result_id', 'UPDATE'),
  'an attempt cannot be moved to another result'
);

set local role anon;
select throws_ok('select * from public.assessment_results', '42501', null, 'anon cannot read results');
select throws_ok('select * from public.equipment', '42501', null, 'anon cannot read equipment');
reset role;

-- ---------------------------------------------------------------------------
-- Athlete A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

select is((select count(*)::int from public.athlete_settings), 1, 'an athlete sees only their own settings');
select is((select count(*)::int from public.assessment_sessions), 0, 'an athlete cannot see another athlete''s sessions');
select is((select count(*)::int from public.assessment_results), 0, 'an athlete cannot see another athlete''s results');
select ok((select count(*) from public.equipment) >= 15, 'authenticated athletes can read the equipment catalog');

-- Spawn state: exactly one step forward
select throws_ok(
  $$update public.athlete_settings set spawn_state = 'MOVEMENT_PENDING'$$,
  '23514', null, 'Spawn state cannot skip a step'
);
update public.athlete_settings set spawn_state = 'BODY_PROFILE';
update public.athlete_settings set spawn_state = 'MOVEMENT_PENDING';
select is((select spawn_state from public.athlete_settings), 'MOVEMENT_PENDING', 'Spawn state moves forward one step at a time');
select throws_ok(
  $$update public.athlete_settings set spawn_state = 'BODY_PROFILE'$$,
  '23514', null, 'Spawn state cannot move backwards'
);

-- Context rows
select lives_ok(
  $$insert into public.body_measurements (athlete_id, kind, value, unit, context)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'weight', 92.4, 'kg', 'spawn')$$,
  'an athlete can record their own weight'
);
select throws_ok(
  $$insert into public.body_measurements (athlete_id, kind, value, unit)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'weight', 92.4, 'lb')$$,
  '23514', null, 'units are constrained to the measurement kind'
);
select throws_ok(
  $$insert into public.body_measurements (athlete_id, kind, value, unit)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'weight', 80, 'kg')$$,
  '42501', null, 'an athlete cannot write another athlete''s body data'
);
select lives_ok(
  $$insert into public.availability_windows (athlete_id, weekday, available, start_time, end_time, max_duration_min)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, true, '06:30', '08:00', 60)$$,
  'availability with a time window is accepted'
);
select throws_ok(
  $$insert into public.availability_windows (athlete_id, weekday, available, start_time, end_time, max_duration_min)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2, true, '09:00', '08:00', 60)$$,
  '23514', null, 'a time window must end after it starts'
);
select lives_ok(
  $$insert into public.athlete_equipment (athlete_id, equipment_id, loads_kg)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, '{8,12,16}' from public.equipment where key = 'kettlebell'$$,
  'an athlete can add equipment with loads'
);
select throws_ok(
  $$update public.athlete_equipment set loads_kg = '{-4}'$$,
  '23514', null, 'loads must be positive'
);

-- Sessions and cross-athlete references
insert into public.assessment_sessions (id, athlete_id, kind)
values ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'movement');

select throws_ok(
  $$insert into public.assessment_sessions (athlete_id, kind)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'movement')$$,
  '23505', null, 'Spawn runs each session kind once'
);
select throws_ok(
  $$insert into public.assessment_results (athlete_id, session_id, test_key, protocol_version)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b0000000-0000-0000-0000-000000000001', 'M01', '0.1.0')$$,
  null, null, 'a result cannot point at another athlete''s session'
);
select throws_ok(
  $$insert into public.assessment_results (athlete_id, session_id, test_key, protocol_version)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', 'F01', '0.1.0')$$,
  '23514', null, 'a Frame test cannot be recorded in the Movement session'
);

-- M01: completed with attempts -> evidence, immutable afterwards
insert into public.assessment_results (id, athlete_id, session_id, test_key, protocol_version)
values ('a0000000-0000-0000-0000-000000000011', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'a0000000-0000-0000-0000-000000000001', 'M01', '0.1.0');
insert into public.assessment_attempts (athlete_id, result_id, attempt_number, data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000011', 1, '{"depth":"parallel","heels":"grounded","control":"stable"}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000011', 2, '{"depth":"below_parallel","heels":"grounded","control":"stable"}');

select throws_ok(
  $$insert into public.assessment_attempts (athlete_id, result_id, attempt_number)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b0000000-0000-0000-0000-000000000002', 1)$$,
  null, null, 'an attempt cannot be attached to another athlete''s result'
);
select lives_ok(
  $$update public.assessment_attempts set data = '{"depth":"parallel","heels":"lift","control":"stable"}'
    where result_id = 'a0000000-0000-0000-0000-000000000011' and attempt_number = 1$$,
  'attempts are editable while the result is in progress'
);

update public.assessment_results set status = 'completed'
where id = 'a0000000-0000-0000-0000-000000000011';

select isnt(
  (select resolved_at from public.assessment_results where id = 'a0000000-0000-0000-0000-000000000011'),
  null, 'resolving a result stamps resolved_at'
);
select is(
  (select count(*)::int from public.performance_evidence where assessment_result_id = 'a0000000-0000-0000-0000-000000000011'),
  1, 'a completed result creates one evidence row'
);
select is(
  (select jsonb_array_length(raw_payload -> 'attempts') from public.performance_evidence
   where assessment_result_id = 'a0000000-0000-0000-0000-000000000011'),
  2, 'evidence keeps every attempt, not only the best'
);
select is(
  (select source_type || '/' || coalesce(evidence_weight::text, 'null') from public.performance_evidence
   where assessment_result_id = 'a0000000-0000-0000-0000-000000000011'),
  'spawn_test/null', 'evidence is sourced from Spawn and carries no engine weighting'
);
select throws_ok(
  $$update public.assessment_results set data = '{"x":1}' where id = 'a0000000-0000-0000-0000-000000000011'$$,
  '23514', null, 'a completed result is immutable'
);
select throws_ok(
  $$update public.assessment_attempts set reps = 5 where result_id = 'a0000000-0000-0000-0000-000000000011'$$,
  '23514', null, 'attempts of a completed result are immutable'
);
select throws_ok(
  $$delete from public.assessment_attempts where result_id = 'a0000000-0000-0000-0000-000000000011'$$,
  '23514', null, 'attempts of a completed result cannot be deleted'
);
select throws_ok(
  $$insert into public.assessment_results (athlete_id, session_id, test_key, protocol_version)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', 'M01', '0.1.0')$$,
  '23514', null, 'a completed test cannot be restarted in the same session'
);

-- M02: stopped for pain -> flag, no evidence (pain is not zero)
insert into public.assessment_results (id, athlete_id, session_id, test_key, protocol_version, status, reason_code, reason_note)
values ('a0000000-0000-0000-0000-000000000012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'a0000000-0000-0000-0000-000000000001', 'M02', '0.1.0', 'aborted', 'pain', 'Left ankle, sharp');

select is(
  (select count(*)::int from public.movement_flags where result_id = 'a0000000-0000-0000-0000-000000000012'),
  1, 'stopping a test for pain creates a Movement Flag'
);
select is(
  (select count(*)::int from public.performance_evidence where assessment_result_id = 'a0000000-0000-0000-0000-000000000012'),
  0, 'a test stopped for pain creates no evidence (never a zero)'
);

-- M03: skipped with a reason; retry adds a new row
insert into public.assessment_results (athlete_id, session_id, test_key, protocol_version, status, reason_code)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', 'M03', '0.1.0', 'skipped', 'other');
select throws_ok(
  $$insert into public.assessment_results (athlete_id, session_id, test_key, protocol_version, status)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', 'M04', '0.1.0', 'skipped')$$,
  '23514', null, 'skipping requires a reason'
);
select lives_ok(
  $$insert into public.assessment_results (athlete_id, session_id, test_key, protocol_version)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a0000000-0000-0000-0000-000000000001', 'M03', '0.1.0')$$,
  'a skipped test can be retried as a new result'
);
select is(
  (select count(*)::int from public.assessment_results where test_key = 'M03'),
  2, 'the skipped attempt is kept as history'
);

-- M04: completed with pain reported -> flag AND evidence
insert into public.assessment_results (id, athlete_id, session_id, test_key, protocol_version, pain_reported, pain_location)
values ('a0000000-0000-0000-0000-000000000014', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'a0000000-0000-0000-0000-000000000001', 'M04', '0.1.0', true, 'knee');
update public.assessment_results set status = 'completed' where id = 'a0000000-0000-0000-0000-000000000014';
select is(
  (select location from public.movement_flags where result_id = 'a0000000-0000-0000-0000-000000000014'),
  'knee', 'pain reported on a completed test creates a flag with its location'
);
select is(
  (select count(*)::int from public.performance_evidence where assessment_result_id = 'a0000000-0000-0000-0000-000000000014'),
  1, 'the completed painful test still keeps its performance evidence'
);

-- Session completion requires every test resolved
select throws_ok(
  $$update public.assessment_sessions set status = 'completed', completed_at = now()
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a session cannot complete while tests are unresolved'
);

-- Evidence is append-only for clients
select throws_ok(
  $$delete from public.performance_evidence$$,
  '42501', null, 'clients cannot delete evidence'
);

-- Flags can be resolved by their owner
update public.movement_flags set status = 'resolved', resolved_at = now()
where result_id = 'a0000000-0000-0000-0000-000000000014';
select is(
  (select status from public.movement_flags where result_id = 'a0000000-0000-0000-0000-000000000014'),
  'resolved', 'an athlete can resolve their own Movement Flag'
);

-- Dev reset is refused without the environment flag
select throws_ok(
  $$select public.dev_reset_spawn()$$,
  '42501', null, 'dev reset refuses when dev tools are not enabled'
);

reset role;

-- ---------------------------------------------------------------------------
-- Dev reset with the local flag (ADR-019)
-- ---------------------------------------------------------------------------

insert into private.environment_flags (key, value) values ('dev_tools', 'enabled');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

select lives_ok($$select public.dev_reset_spawn()$$, 'dev reset runs when dev tools are enabled');
select is((select count(*)::int from public.assessment_sessions), 0, 'dev reset removes the caller''s sessions');
select is((select spawn_state from public.athlete_settings), 'NOT_STARTED', 'dev reset returns Spawn to NOT_STARTED');
reset role;

select is(
  (select count(*)::int from public.assessment_results where athlete_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1, 'dev reset never touches another athlete''s data'
);
select is(
  (select count(*)::int from public.body_measurements where athlete_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0, 'a full dev reset clears onboarding context'
);

select * from finish();
rollback;
