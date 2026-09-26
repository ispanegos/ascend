-- Milestone 4: Paths are an append-only configuration history with database
-- invariants and athlete-scoped access (ADR-040).
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('d1111111-1111-1111-1111-111111111111', 'path-a@example.test', '{}'),
  ('d2222222-2222-2222-2222-222222222222', 'path-b@example.test', '{}'),
  ('d3333333-3333-3333-3333-333333333333', 'path-c@example.test', '{}');

-- A and B have completed Spawn; C has not.
select set_config('ascend.dev_reset', 'on', true);
update public.athlete_settings set spawn_state = 'COMPLETE'
where athlete_id in ('d1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222');
select set_config('ascend.dev_reset', '', true);

select is((select count(*)::int from public.paths), 7, 'the catalogue has the seven Paths');
select is(
  (select array_agg(key order by sort_order) from public.paths),
  array['endurance', 'strength', 'power', 'core', 'mobility', 'agility', 'recovery'],
  'one Path per Stat attribute, in attribute order'
);

-- ---- Athlete C: Spawn not complete
set local role authenticated;
set local request.jwt.claims = '{"sub": "d3333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok($$ select public.set_athlete_paths('endurance') $$, '23514', null, 'Paths need a complete Spawn');

-- ---- Athlete A
set local request.jwt.claims = '{"sub": "d1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok($$ select public.set_athlete_paths('endurance') $$, 'one PRIMARY is valid');
select is((select max(revision) from public.athlete_path_configurations), 1, 'first change is revision 1');

select lives_ok($$ select public.set_athlete_paths('endurance', array['strength', 'power']) $$,
  'one PRIMARY and two SECONDARY is valid (Power is Unranked and still selectable)');
select is((select count(*)::int from public.current_athlete_paths), 3, 'three active Paths');
select is(
  (select priority from public.current_athlete_paths where path_key = 'endurance'), 'primary', 'Endurance is PRIMARY'
);

select is(
  (select public.set_athlete_paths('endurance', array['power', 'strength'])),
  (select id from public.athlete_path_configurations where revision = 2),
  'an identical configuration (any order) appends nothing'
);
select is((select max(revision) from public.athlete_path_configurations), 2, 'still two revisions');

select throws_ok($$ select public.set_athlete_paths('endurance', array['strength', 'power', 'core']) $$, '23514', null,
  'three SECONDARY Paths are rejected');
select throws_ok($$ select public.set_athlete_paths(null, array['strength']) $$, '23514', null,
  'SECONDARY without a PRIMARY is rejected');
select throws_ok($$ select public.set_athlete_paths('endurance', array['endurance']) $$, '23514', null,
  'a Path cannot be both PRIMARY and SECONDARY');
select throws_ok($$ select public.set_athlete_paths('strength', array['core', 'core']) $$, '23514', null,
  'a Path cannot be chosen twice');
select throws_ok($$ select public.set_athlete_paths('running') $$, '23514', null, 'sports are not Paths');

select lives_ok($$ select public.set_athlete_paths('core', array['endurance']) $$, 'priorities can change');
select lives_ok($$ select public.set_athlete_paths(null) $$, 'the athlete may clear every Path');
select is((select count(*)::int from public.current_athlete_paths), 0, 'no active Paths after clearing');
select is((select max(revision) from public.athlete_path_configurations), 4, 'clearing is a revision too');

select is(
  (select paths from public.athlete_path_history where revision = 2),
  '[{"path": "endurance", "priority": "primary"}, {"path": "strength", "priority": "secondary"}, {"path": "power", "priority": "secondary"}]'::jsonb,
  'history keeps the earlier configuration'
);
select ok(
  (select valid_until is not null from public.athlete_path_history where revision = 3)
  and (select valid_until is null from public.athlete_path_history where revision = 4),
  'each configuration is valid until the next revision'
);

select throws_ok(
  $$ insert into public.athlete_path_configurations (athlete_id, revision) values ('d1111111-1111-1111-1111-111111111111', 9) $$,
  '42501', null, 'athletes cannot write configurations directly'
);

-- ---- Athlete B: isolation
set local request.jwt.claims = '{"sub": "d2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.athlete_path_history), 0, 'an athlete cannot see another athlete''s Paths');
select lives_ok($$ select public.set_athlete_paths('mobility') $$, 'B writes only their own history');

reset role;

-- ---- Invariants hold below the write function too
select throws_ok(
  $$ update public.athlete_path_configuration_items set priority = 'secondary'
     where athlete_id = 'd1111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'Path history is append-only'
);

select throws_ok(
  $$ with c as (
       insert into public.athlete_path_configurations (athlete_id, revision)
       values ('d2222222-2222-2222-2222-222222222222', 50) returning id
     )
     insert into public.athlete_path_configuration_items (configuration_id, athlete_id, path_key, priority)
     select c.id, 'd2222222-2222-2222-2222-222222222222', k, 'primary' from c, unnest(array['core', 'agility']) k $$,
  '23505', null, 'the database allows only one PRIMARY per configuration'
);

select throws_ok(
  $$ with c as (
       insert into public.athlete_path_configurations (athlete_id, revision)
       values ('d2222222-2222-2222-2222-222222222222', 51) returning id
     ),
     i as (
       insert into public.athlete_path_configuration_items (configuration_id, athlete_id, path_key, priority)
       select c.id, 'd2222222-2222-2222-2222-222222222222', k, case when k = 'core' then 'primary' else 'secondary' end
       from c, unnest(array['core', 'agility', 'endurance', 'strength']) k
       returning 1
     )
     select count(*) from i;
     set constraints athlete_path_items_valid immediate $$,
  '23514', null, 'the database rejects more than three Paths or two SECONDARY at commit'
);

select * from finish();
rollback;
