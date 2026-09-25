-- ASCEND Milestone 3.1 — `verified_workout` evidence type (ADR-036).
--
-- performance_evidence.source_type is the EVENT type (what happened):
-- spawn_test, reassessment, workout, verified_workout, boss. How the values
-- were entered (manual or wearable) is raw_payload.source and only affects
-- quality. A wearable measurement is not verified workout evidence.
--
-- 'wearable' and 'manual' stay allowed as legacy event values so no existing
-- row becomes invalid; nothing writes them and the engine weighs them like an
-- ordinary workout. Milestone 5 retires them with the workout evidence model.

alter table public.performance_evidence drop constraint performance_evidence_source_type_check;
alter table public.performance_evidence add constraint performance_evidence_source_type_check
  check (source_type in ('spawn_test', 'reassessment', 'workout', 'verified_workout', 'boss', 'wearable', 'manual'));

comment on column public.performance_evidence.source_type is
  'Evidence event type: spawn_test | reassessment | workout | verified_workout | boss (legacy: wearable, manual). '
  'The entry source (manual | wearable) is raw_payload.source (ADR-036).';
