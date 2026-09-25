-- Uses a test-only engine version (9.9.9) so it never collides with a real one.
-- Milestone 3: derived Stats are server-written, append-only, idempotent and
-- athlete-scoped (spec §47, §48).
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('c1111111-1111-1111-1111-111111111111', 'eng-a@example.test', '{}'),
  ('c2222222-2222-2222-2222-222222222222', 'eng-b@example.test', '{}');

-- Athlete A has one completed test (and therefore one evidence row).
insert into public.assessment_sessions (id, athlete_id, kind)
values ('c1000000-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 'movement');
insert into public.assessment_results (id, athlete_id, session_id, test_key, protocol_version)
values ('c1000000-0000-0000-0000-000000000002', 'c1111111-1111-1111-1111-111111111111',
        'c1000000-0000-0000-0000-000000000001', 'M05', '0.1.0');
insert into public.assessment_attempts (athlete_id, result_id, attempt_number, measure_cm)
values ('c1111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000002', 1, 2.0);
update public.assessment_results set status = 'completed' where id = 'c1000000-0000-0000-0000-000000000002';

-- Athlete B's evidence, which A must never be able to link.
insert into public.assessment_sessions (id, athlete_id, kind)
values ('c2000000-0000-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222', 'movement');
insert into public.assessment_results (id, athlete_id, session_id, test_key, protocol_version, status)
values ('c2000000-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222222',
        'c2000000-0000-0000-0000-000000000001', 'M05', '0.1.0', 'completed');

-- Fixture shortcut past the one-step state guard.
select set_config('ascend.dev_reset', 'on', true);
update public.athlete_settings set spawn_state = 'CALIBRATING' where athlete_id = 'c1111111-1111-1111-1111-111111111111';
select set_config('ascend.dev_reset', '', true);

create temporary table fx as
select
  (select id::text from public.performance_evidence where assessment_result_id = 'c1000000-0000-0000-0000-000000000002') as a_evidence,
  (select id::text from public.performance_evidence where assessment_result_id = 'c2000000-0000-0000-0000-000000000002') as b_evidence;
grant select on fx to authenticated, service_role;

create or replace function pg_temp.result(evidence text, athlete text default 'c1111111-1111-1111-1111-111111111111', input_hash text default repeat('a', 64))
returns jsonb language sql as $$
  select jsonb_build_object(
    'engine_version', '9.9.9',
    'config_hash', repeat('b', 64),
    'input_hash', input_hash,
    'athlete_id', athlete,
    'as_of', '2026-09-25T10:00:00Z',
    'gaps', '[]'::jsonb,
    'evidence_ids', jsonb_build_array(evidence),
    'attributes', jsonb_build_object(
      'mobility', jsonb_build_object('current', 48.1234, 'verified_peak', null, 'provisional_peak', 48.1234,
        'confidence', 0.62, 'coverage', 0.25, 'status', 'provisional', 'verified_peak_updated', false, 'evidence_ids', jsonb_build_array(evidence), 'trace', '{"attribute":"mobility"}'::jsonb),
      'power', jsonb_build_object('current', null, 'verified_peak', null, 'provisional_peak', null, 'confidence', 0, 'coverage', 0,
        'status', 'unranked', 'evidence_ids', '[]'::jsonb, 'trace', '{"attribute":"power"}'::jsonb)
    ),
    'overall', jsonb_build_object('current', null, 'confidence', 0, 'status', 'unranked', 'participating', '[]'::jsonb, 'trace', '{}'::jsonb)
  )
$$;

create or replace function pg_temp.engine(hash text default repeat('b', 64))
returns jsonb language sql as $$
  select jsonb_build_object('engine_version', '9.9.9', 'config_hash', hash, 'calibration_status', 'provisional',
    'config', jsonb_build_object(
      'engine_version', '9.9.9',
      'confidence', jsonb_build_object('verified_threshold', 0.7),
      'curves', jsonb_build_object('M05_sit_reach_cm', jsonb_build_object('test', 'M05', 'feature', 'sit_reach_cm',
        'direction', 'increasing', 'body_mass_mode', 'none', 'points', '[[-30,10],[20,80]]'::jsonb))))
$$;
grant execute on function pg_temp.result(text, text, text) to authenticated, service_role;
grant execute on function pg_temp.engine(text) to authenticated, service_role;

-- Privileges
select ok(not has_table_privilege('authenticated', 'public.stat_snapshots', 'INSERT'), 'clients cannot insert snapshots');
select ok(not has_table_privilege('authenticated', 'public.overall_snapshots', 'UPDATE'), 'clients cannot update Overall');
select ok(not has_table_privilege('authenticated', 'public.engine_versions', 'INSERT'), 'clients cannot register engines');
select ok(not has_function_privilege('authenticated', 'public.engine_record_calculation(uuid, text, jsonb, jsonb)', 'EXECUTE'),
  'clients cannot call the persistence function');
select ok(has_function_privilege('service_role', 'public.engine_record_calculation(uuid, text, jsonb, jsonb)', 'EXECUTE'),
  'service_role can persist engine results');

-- A client trying anyway
set local role authenticated;
set local request.jwt.claims = '{"sub": "c1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok(
  $$select public.engine_record_calculation('c1111111-1111-1111-1111-111111111111', 'spawn_initialization', pg_temp.result((select a_evidence from fx)), pg_temp.engine())$$,
  '42501', null, 'an athlete cannot write their own Stats'
);
reset role;

-- The server records a calculation
set local role service_role;
select lives_ok(
  $$select public.engine_record_calculation('c1111111-1111-1111-1111-111111111111', 'spawn_initialization', pg_temp.result((select a_evidence from fx)), pg_temp.engine())$$,
  'the server persists a calculation'
);
reset role;

select is((select count(*)::int from public.stat_calculations where athlete_id = 'c1111111-1111-1111-1111-111111111111'), 1, 'one calculation');
select is((select count(*)::int from public.stat_snapshots where athlete_id = 'c1111111-1111-1111-1111-111111111111'), 2, 'a snapshot per attribute');
select is((select current from public.stat_snapshots where attribute = 'mobility' and athlete_id = 'c1111111-1111-1111-1111-111111111111'),
  48.1234::numeric, 'Current keeps its decimals');
select is(
  (select provisional_peak::text || '/' || coalesce(verified_peak::text, 'null') from public.stat_snapshots
   where attribute = 'mobility' and athlete_id = 'c1111111-1111-1111-1111-111111111111'),
  '48.1234/null', 'after Spawn only a provisional Peak exists'
);
select is((select status from public.stat_snapshots where attribute = 'power' and athlete_id = 'c1111111-1111-1111-1111-111111111111'),
  'unranked', 'unknown Power is stored as unranked, not zero');
select is(
  (select count(*)::int from public.calculation_evidence ce
   join public.stat_calculations c on c.id = ce.calculation_id
   where c.athlete_id = 'c1111111-1111-1111-1111-111111111111'),
  1, 'the calculation links its evidence'
);
select is((select spawn_state from public.athlete_settings where athlete_id = 'c1111111-1111-1111-1111-111111111111'),
  'COMPLETE', 'Spawn initialization completes Spawn');
select is((select count(*)::int from public.scoring_curves where engine_version = '9.9.9'), 1, 'curves are registered with the engine version');

-- Idempotent
set local role service_role;
select is(
  public.engine_record_calculation('c1111111-1111-1111-1111-111111111111', 'spawn_initialization', pg_temp.result((select a_evidence from fx)), pg_temp.engine()),
  (select id from public.stat_calculations where athlete_id = 'c1111111-1111-1111-1111-111111111111'),
  'recording the same inputs again returns the same calculation'
);
reset role;
select is((select count(*)::int from public.stat_snapshots where athlete_id = 'c1111111-1111-1111-1111-111111111111'), 2, 'and adds no snapshots');

-- Guards
set local role service_role;
select throws_ok(
  $$select public.engine_record_calculation('c1111111-1111-1111-1111-111111111111', 'recalculation', pg_temp.result((select b_evidence from fx), input_hash => repeat('c', 64)), pg_temp.engine())$$,
  '42501', null, 'another athlete''s evidence cannot be linked'
);
select throws_ok(
  $$select public.engine_record_calculation('c1111111-1111-1111-1111-111111111111', 'recalculation', pg_temp.result((select a_evidence from fx), 'c2222222-2222-2222-2222-222222222222'), pg_temp.engine())$$,
  '42501', null, 'a result for another athlete is refused'
);
select throws_ok(
  $$select public.engine_record_calculation('c1111111-1111-1111-1111-111111111111', 'recalculation',
    jsonb_set(pg_temp.result((select a_evidence from fx), input_hash => repeat('d', 64)), '{config_hash}', to_jsonb(repeat('e', 64))),
    pg_temp.engine(repeat('e', 64)))$$,
  '23514', null, 'a changed configuration needs a new engine version'
);
reset role;

-- Append-only and read-own
select throws_ok($$update public.stat_snapshots set current = 99$$, '42501', null, 'snapshots are append-only');
set local role authenticated;
set local request.jwt.claims = '{"sub": "c2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.stat_snapshots), 0, 'an athlete cannot read another athlete''s Stats');
set local request.jwt.claims = '{"sub": "c1111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is((select count(*)::int from public.stat_snapshots), 2, 'an athlete reads their own Stats');
reset role;

select ok(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'performance_evidence_source_type_check')
    like '%''verified_workout''%',
  'verified_workout is its own evidence event type (ADR-036)'
);

select * from finish();
rollback;
