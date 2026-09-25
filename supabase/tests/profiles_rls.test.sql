-- RLS and trigger tests for public.profiles (spec §48).
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures: two athletes. The trigger creates their profiles.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test', '{"display_name": "  Athlete A  "}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test', '{}');

-- Structure
select has_table('public', 'profiles', 'profiles table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'RLS is enabled on profiles'
);

-- Trigger
-- Counts are scoped to the fixtures: other local users (e.g. from E2E runs)
-- may exist in the database.
select is(
  (select count(*)::int from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2,
  'a profile is created for every new auth user'
);
select is(
  (select count(*)::int from public.athlete_settings
   where athlete_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
     and spawn_state = 'NOT_STARTED'),
  2,
  'athlete settings start at Spawn state NOT_STARTED'
);
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Athlete A',
  'display_name is taken from sign-up metadata and trimmed'
);
select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'missing display_name stays null (unknown is not a value)'
);

-- Privileges: only the editable columns can be updated by clients
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated cannot INSERT into profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated cannot DELETE from profiles'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'),
  'authenticated cannot UPDATE profiles.id'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE'),
  'authenticated can UPDATE profiles.display_name'
);

-- Anonymous users see nothing
set local role anon;
select throws_ok(
  'select * from public.profiles',
  '42501',
  null,
  'anon has no access to profiles'
);
reset role;

-- Athlete A
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.profiles),
  1,
  'an athlete sees only their own profile'
);
select is(
  (select id from public.profiles),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'the visible profile is their own'
);

update public.profiles set display_name = 'Renamed' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Renamed',
  'an athlete can update their own profile'
);

update public.profiles set display_name = 'Hijacked' where id = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$insert into public.profiles (id) values ('33333333-3333-3333-3333-333333333333')$$,
  '42501',
  null,
  'athletes cannot insert profiles directly'
);
select throws_ok(
  $$update public.profiles set id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  null,
  'athletes cannot change the profile id'
);
select throws_ok(
  $$update public.profiles set preferred_units = 'furlongs'$$,
  '23514',
  null,
  'preferred_units is constrained'
);

select throws_ok(
  'delete from public.profiles',
  '42501',
  null,
  'athletes cannot delete profiles, not even their own'
);
reset role;

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'an athlete cannot update another athlete''s profile'
);
select is(
  (select count(*)::int from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2,
  'no profile was deleted'
);

select * from finish();
rollback;
