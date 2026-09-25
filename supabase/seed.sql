-- Seed data for local development only. `supabase db reset` runs this file;
-- the hosted project never does.

-- Enables public.dev_reset_spawn() locally (ADR-019).
insert into private.environment_flags (key, value)
values ('dev_tools', 'enabled')
on conflict (key) do update set value = excluded.value;

-- Reference data (equipment, Spawn test catalog) lives in migrations because
-- production needs it too. The spec §58 initial athlete configuration is not
-- seeded as product defaults: it is entered through onboarding.
