# ASCEND — Decision Log

ADR-style log of implementation decisions, interpretations and deviations
from [`ASCEND_SPEC.md`](./ASCEND_SPEC.md) (spec §70.9). No product mechanic is
changed without an entry here (§70.10).

Format: context → decision → consequences. Status is `Accepted`,
`Superseded by ADR-NNN` or `Proposed`.

---

## ADR-001 — npm workspaces for the monorepo

**Status:** Accepted · Milestone 1

**Context.** §44 prescribes an `apps/web`, `packages/shared`, `engine/`,
`supabase/` monorepo but no tool. pnpm is not installed on the development
machine; npm 11 is.

**Decision.** Use npm workspaces (`apps/*`, `packages/*`). No Turborepo/Nx.
The Python `engine/` is not an npm workspace; it gets its own tooling in M3.

**Consequences.** Zero extra tooling. Vercel builds with the project root
directory set to `apps/web`. Build orchestration can be added later if the
repo grows.

---

## ADR-002 — TypeScript 6.0 and ESLint 9 instead of latest majors

**Status:** Accepted · Milestone 1

**Context.** TypeScript 7.0 (latest) is outside `typescript-eslint`'s
supported range (`<6.1.0`). ESLint 10 is newer than several plugins bundled
by `eslint-config-next` officially support.

**Decision.** Pin `typescript@~6.0` and `eslint@^9`.

**Consequences.** Type-aware lint rules work. Revisit when `typescript-eslint`
supports TS 7.

---

## ADR-003 — CSS Modules + semantic CSS variables; no UI framework

**Status:** Accepted · Milestone 1

**Context.** §43 prefers CSS Modules + semantic CSS variables; §42 forbids a
giant UI framework for simple components; §0 asks for a lightweight
accessible primitive library only where it saves real accessibility work.

**Decision.** `styles/tokens.css` holds the §28 tokens verbatim plus §29 type
tokens. Components use CSS Modules and consume only semantic tokens. The
bottom sheet uses the native `<dialog>` element (focus trapping, `Esc`,
inert background, top layer) instead of a primitive library.

**Consequences.** No runtime styling dependency. If `<dialog>` proves
insufficient (e.g. drag-to-dismiss sheets in M5), a primitive library can be
introduced for that component only.

---

## ADR-004 — Email + password authentication

**Status:** Accepted · Milestone 1

**Context.** §57 requires authentication; the method is unspecified. Magic
links opened from an installed iOS PWA launch Safari instead of the PWA, so
the session lands in the wrong context.

**Decision.** Supabase Auth email + password, with SSR cookie sessions via
`@supabase/ssr`. The session is refreshed and routes are guarded in Next.js
`proxy.ts`; every server read re-verifies the JWT with `supabase.auth.getClaims()`
in a per-request cached data-access helper (`lib/auth.ts`).

**Consequences.** Works inside the installed PWA. OAuth or passkeys can be
added later without schema changes.

---

## ADR-005 — Root route redirects to `/today` until Spawn exists

**Status:** Superseded by ADR-010 · Milestone 1 · Temporary

**Context.** §49: the authenticated root redirects according to Spawn state.
Spawn state is Milestone 2.

**Decision.** In M1 the authenticated root redirects to `/today`;
unauthenticated users go to `/sign-in`.

**Consequences.** Superseded in M2 by the Spawn-state redirect. This is a
sequencing gap, not a product change.

---

## ADR-006 — Milestone 1 schema limited to `profiles`

**Status:** Accepted · Milestone 1

**Context.** §46 lists the full v0.1 schema. §70.7 says not to proceed into
scoring until the raw-evidence model is stable, and that model is designed
with Spawn in M2.

**Decision.** M1 creates only `public.profiles` (owner-only RLS, created by an
`auth.users` trigger) and shared helpers (`set_updated_at()` trigger). All
other tables arrive with the milestone that uses them.

**Consequences.** Avoids locking in untested schema. RLS patterns and pgTAP
test harness are established now for later tables to copy.

---

## ADR-007 — Hand-written service worker

**Status:** Accepted · Milestone 1

**Context.** §41 requires a service worker/offline strategy. Common Next.js
PWA plugins lag behind Next.js releases.

**Decision.** A small hand-written `public/sw.js`: precaches the offline page
and icons, network-first for navigations with offline fallback,
stale-while-revalidate for immutable static assets. Never caches
authenticated HTML or Supabase API responses. Registered in production only.

**Consequences.** No personal data in the cache. Offline active-workout
persistence (M5) will use IndexedDB and extend this worker.

---

## ADR-008 — Inter via `next/font` (self-hosted at build)

**Status:** Accepted · Milestone 1

**Context.** §29 recommends Inter through a web-safe/self-hostable strategy.

**Decision.** Load Inter with `next/font/google`, which downloads at build
time and serves the font from the app's own origin. It is exposed as a CSS
variable at the front of the §29 `--font-sans` stack.

**Consequences.** No runtime request to Google; no layout shift.

---

## ADR-009 — Two palette tokens darkened for WCAG AA

**Status:** Accepted · Milestone 1

**Context.** §40 targets WCAG 2.2 AA. Measured against the §28 surfaces,
`--color-ink-muted` #66736C reaches 4.39:1 on `--color-bg` and 3.95:1 on
`--color-brand-soft`, and `--color-warning` #9A6B25 reaches 4.13:1 on
`--color-bg`. Both are below 4.5:1 for normal-size text. §28 allows visual
tuning if the semantic structure and warm-cream/dark-green direction are
kept.

**Decision.** `--color-ink-muted` → #5C6862 and `--color-warning` → #855D20.
These are the same hues, darkened to ≥4.6:1 on every light surface.
`--color-ink-faint` stays as specified but is reserved for decorative and
disabled use, never for readable text. A unit test enforces these contrast
ratios.

**Consequences.** Token names and structure are unchanged. The difference is
barely visible.

---

## ADR-010 — Root route resolves by Spawn state; app shell stays reachable

**Status:** Partly superseded by ADR-023 (shell is blocked) · Milestone 2 · Supersedes ADR-005

**Context.** §49: the authenticated root redirects according to Spawn state.
§25: during Spawn the normal shell is replaced by a focused flow. Spawn cannot
reach `COMPLETE` until the M3 engine exists.

**Decision.** `/` reads `athlete_settings.spawn_state` and the open session
and redirects to the exact screen to resume (pure `resolveSpawnPath()`).
Sign-in and sign-up land on `/`. Spawn screens use a focused layout with no
bottom nav. The five app destinations are *not* hard-blocked during Spawn:
Today shows a "Continue Spawn" card instead of an empty dashboard, and Profile
stays reachable for sign-out and edits.

**Consequences.** The athlete is never locked out of their account settings
while M3 is pending. Hard-gating the shell can be added in M3 without schema
changes.

---

## ADR-011 — Onboarding order: Profile → Body/Context → Spawn Point

**Status:** Accepted · Milestone 2

**Context.** §59 lists `CREATE PROFILE → SPAWN POINT → BODY / CONTEXT`. §11
says Spawn 0 captures body/context and *then* shows every attribute
`UNRANKED`. The Milestone 2 brief uses the §11 order.

**Decision.** Account → profile/body/context screens → Spawn Point (all
`UNRANKED`, `BEGIN ASSESSMENT`) → Movement → Frame → Engine → Spawn Complete.

**Consequences.** The Spawn Point marks the start of *measurement*, after all
context has been collected. Changing the order later is a routing change only.

---

## ADR-012 — Spawn state semantics and enforcement

**Status:** Accepted · Milestone 2

**Context.** §11 lists ten states but not their transitions.

**Decision.**

| State | Meaning | Left by |
|---|---|---|
| `NOT_STARTED` | account exists, no profile input | `START_PROFILE` |
| `BODY_PROFILE` | onboarding screens in progress | `COMPLETE_CONTEXT` |
| `MOVEMENT_PENDING` | Spawn Point shown; Movement available or in progress | `COMPLETE_MOVEMENT` |
| `MOVEMENT_COMPLETE` | between sessions (rest days allowed, §59) | `BEGIN_FRAME` |
| `FRAME_PENDING` | Frame session in progress | `COMPLETE_FRAME` |
| `FRAME_COMPLETE` | between sessions | `BEGIN_ENGINE` |
| `ENGINE_PENDING` | Engine session in progress | `COMPLETE_ENGINE` |
| `ENGINE_COMPLETE` | Spawn Complete screen; all raw data collected | `REQUEST_CALIBRATION` |
| `CALIBRATING` | waiting for the Stats Engine (M3) | `CALIBRATION_COMPLETE` (M3) |
| `COMPLETE` | Stats initialised | — |

Transitions are a pure function in `@ascend/shared`. Postgres enforces the
same rule independently: `spawn_state` can only move exactly one step
forward. The only way back is the development reset (ADR-019).

**Consequences.** A stale tab or double tap cannot skip or rewind Spawn.
`COMPLETE` is unreachable until M3.

---

## ADR-013 — `assessment_attempts` table in addition to §46

**Status:** Accepted · Milestone 2

**Context.** §12–§14 require every attempt to be stored (e.g. M04: two
attempts per side, M07: three attempts). §67 asks for searchable fields as
relational columns. §46 lists `assessment_results` but no attempt table.

**Decision.** `assessment_results` holds one row per test outcome (status,
reason, variant, pain, source). `assessment_attempts` holds one row per
attempt, set or side. Common measurements are typed columns with the SI unit
in the name (`measure_cm`, `duration_s`, `distance_m`, `load_kg`, `reps`,
`rpe`, `avg_hr_bpm`, `max_hr_bpm`, `avg_pace_s_per_km`, `technique`,
`limiting_factor`). Test-specific categorical values (squat depth, heel
position, errors, HR recovery readings) go in a JSON `data` object validated
by the shared test catalog.

**Consequences.** One extra table. Best-of values are never stored; the M3
engine derives them from attempts.

---

## ADR-014 — Results are append-only once resolved

**Status:** Accepted · Milestone 2

**Context.** §0.3/§47: raw measurements are preserved permanently. The
athlete must still be able to fix a typo while entering a test, and retry a
test they skipped.

**Decision.** A result is editable only while `in_progress`. Once it becomes
`completed`, `skipped`, `cannot_perform` or `aborted`, a trigger blocks every
update and delete of the result and its attempts. Retrying a skipped or
aborted test creates a *new* result row; the earlier row stays as history and
the latest row per test counts. A completed test cannot be retried inside the
same Spawn session (later: `VERIFY [ATTRIBUTE]`, §65). Composite foreign keys
`(id, athlete_id)` stop a row from pointing at another athlete's parent row
(FK checks bypass RLS).

**Consequences.** No correction flow for confirmed results in M2; §5 allows
"explicit correction/audit", which is a later feature.

---

## ADR-015 — Performance evidence rows carry raw data only in M2

**Status:** Accepted · Milestone 2

**Context.** §5 defines `PerformanceEvidence` with `quality`,
`evidenceWeight` and `engineVersion`. Those are engine judgements (§54
engine configuration), and M2 has no engine.

**Decision.** A trigger writes one `performance_evidence` row (source
`spawn_test`) when a result is completed, with a snapshot of the result and
its attempts in `raw_payload`. `quality`, `evidence_weight` and
`engine_version` are nullable and left null. Skipped, cannot-perform and
aborted results create no evidence. Clients can read evidence but not write
it.

**Consequences.** Unknown stays unknown (§72.1). M3 records its weighting in
its own derived tables with an engine version and does not need to modify
raw evidence.

---

## ADR-016 — Pain is recorded per test and always becomes a Movement Flag

**Status:** Accepted · Milestone 2

**Context.** §0.12, §53, §72.4: pain is not poor performance. M01 records a
pain flag with an optional location and note; E04 lists `pain` as a limiting
factor.

**Decision.** Every test offers "Any pain during this test?" on its confirm
screen, and every test can be stopped with the reason `pain`. A trigger
creates a `movement_flags` row whenever a result is resolved with pain
reported or with reason `pain`. Choosing the limiting factor `pain` turns the
pain question on, visibly, so the athlete can review it before confirming.
Stopped tests keep the attempts recorded so far but produce no evidence.

**Consequences.** Pain never becomes a zero. Flags are resolved by the athlete
later (status `open` → `resolved`).

---

## ADR-017 — Option sets and bounds the spec leaves open

**Status:** Superseded by ADR-023 · Milestone 2

**Context.** The spec defines what to record but not every option list or
input bound.

**Decision.** These live in one place, `packages/shared/src/spawn/catalog.ts`
and `packages/shared/src/profile/options.ts`, and are listed in the Milestone
2 report for review:

- Frame technique: `clean` / `minor_compensation` / `breakdown`.
- Frame limiting factors per test (e.g. farmer carry: posture failure, grip
  failure, voluntary stop, time cap reached, pain — from §13).
- M03 gap categories: overlap / fingertips touch / gap within a hand's
  length / gap beyond a hand's length, plus optional signed centimetres.
- Skip reasons and whether each maps to `skipped` or `cannot_perform`.
- Training experience and recent-inactivity choices.
- Environment and data-source lists; equipment reference list (§58 items
  included).
- Plausibility bounds (e.g. HR 25–250 bpm, height 100–250 cm, weight
  30–350 kg, 6-minute walk ≤ 1,500 m, 20-minute run/walk ≤ 8,000 m). They
  reject typos; they are not medical validation.
- Estimated Engine session duration (~45 min; §14 gives none).

**Consequences.** Changing any of them is a data change in one file plus the
matching DB check where one exists.

---

## ADR-018 — Session completion shows data coverage, not scores

**Status:** Accepted · Milestone 2

**Context.** The brief asks for "Mobility — CALIBRATION DATA COLLECTED /
Core — PARTIALLY ASSESSED" after a session, with no Stats.

**Decision.** Coverage is derived from the §15 subdomains that Spawn can
measure, mapped to tests (e.g. Core: anti-extension M06, bracing F06, loaded
stability F05). An attribute is *collected* when every Spawn-measurable
subdomain has a completed test, *partial* when some do, *not assessed* when
none do. Power has no Spawn test (§13) and is shown as not assessed in Spawn.
The mapping is display data in `@ascend/shared`; M3 engine configuration
becomes its source of truth.

**Consequences.** Honest progress feedback without numbers.

---

## ADR-019 — Development-only Spawn reset

**Status:** Accepted · Milestone 2

**Context.** The onboarding must be repeatable during development. Raw
results are immutable by design, so a reset needs a privileged path that must
never exist in production.

**Decision.** `public.dev_reset_spawn(keep_context boolean)` is a
`security definer` function that deletes the caller's own Spawn data. It
raises unless `private.environment_flags` contains `dev_tools = enabled`, a
row that only `supabase/seed.sql` inserts (seed runs on local `db reset`,
never on the hosted project). The server action and the UI that call it
only exist when `NODE_ENV === "development"`.

**Consequences.** Two independent guards. In production the RPC exists but
always refuses.

---

## ADR-020 — Manual entry first, wearable-ready shape

**Status:** Accepted · Milestone 2

**Context.** §24: v0.1 works without HealthKit; the browser cannot read
Apple Health.

**Decision.** Engine tests are entered manually. Results carry `source`
(`manual` | `wearable`) and `source_ref` (an import id), so a future
`HealthDataProvider` import can create the same result rows with different
provenance. HR fields are optional wherever the spec says "if available";
E03 heart-rate recovery needs HR readings and can be marked "cannot perform"
with reason `no_equipment` when no HR device is available.

**Consequences.** No provider code in M2.

---

## ADR-021 — Body measurements: one row per measurement, explicit unit

**Status:** Accepted · Milestone 2

**Context.** §10 lists weight, body fat and circumferences; §46 asks for
explicit units; M7 adds a timeline.

**Decision.** `body_measurements` stores one row per `kind` with a `unit`
column constrained to the kind (kg, percent, cm). Height is a profile field
(it rarely changes). Values entered during Spawn onboarding use
`context = 'spawn'` and are edited in place until onboarding completes —
they are form input, not assessment results. Later entries append.

**Consequences.** M7 can add a timeline without migration.

---

## ADR-022 — Tight column grants; no PostgREST upserts

**Status:** Accepted · Milestone 2

**Context.** Clients may not update identity columns (`athlete_id`,
`result_id`, `weekday`, `side`, `attempt_number`). A PostgREST upsert
rewrites every column in its payload, which needs UPDATE on those columns.

**Decision.** Keep the narrow grants. Server actions look the row up and
issue an explicit `update` or `insert` instead of `upsert`. A pgTAP test
asserts that every column the app inserts is granted, so a missing grant
fails in CI instead of in the athlete's hands.

**Consequences.** One extra round trip on a few writes. Ownership and
identity columns stay immutable from the client.

---

## ADR-023 — Approved product decisions after Milestone 2 review

**Status:** Accepted · product owner approval, 2026-09-25 · Supersedes ADR-017

1. **Frame technique:** `clean`, `minor_compensation`, `major_compensation`,
   `stopped_for_technique`.
2. **Limiting-factor vocabulary** (shared by every test): `nothing`,
   `breath`, `muscular_fatigue`, `grip`, `technique`, `pain`, `pacing`,
   `other`. Each test exposes only the relevant subset; labels can be
   test-specific (e.g. farmer carry "Posture failed" = `technique`).
3. **Skip / cannot-perform reasons:** `cannot_perform_safely`, `pain`,
   `missing_equipment`, `environment_unavailable`,
   `does_not_know_technique`, `other`. A missing test is UNKNOWN, never zero.
4. **Experience:** `never_trained`, `beginner`, `recreational`, `trained`,
   `competitive`.
5. **Inactivity:** `active`, `under_1_month`, `1_3_months`, `3_6_months`,
   `6_12_months`, `over_12_months`.
   Experience and inactivity are context only and never assign Stats.
6. **ASCEND v0.1 is 18+.**
7. **Plausibility limits are typo protection, not physiological claims.**
   Input is never clamped. Values outside a *typical* range but inside the
   hard limit need an explicit "Yes, that's correct" before saving.
8. **Engine session estimate:** about 45 minutes.
9. **Main app shell is blocked during Spawn and Calibration.** Profile,
   profile edits and sign-out stay available.
10. **No deployment yet.** Milestone 3 stays local; the hosted Supabase
    migration and Vercel deploy follow the Stats Engine review.

**Migration of existing values** (`20260927090000_product_decisions.sql`):
technique `breakdown` → `major_compensation`; limiting factors `fatigue`,
`legs` → `muscular_fatigue`, `posture_failure`, `position_lost` → `technique`,
`grip_failure` → `grip`, `time_cap`, `could_continue` → `nothing`,
`voluntary`, `voluntary_stop` → `other`; strength stop reasons `effort` →
`muscular_fatigue`, `no_heavier_load` → `nothing`; skip reasons `unable`,
`unsafe` → `cannot_perform_safely`, `no_equipment` → `missing_equipment`,
`no_space` → `environment_unavailable`, `fatigue`, `time` → `other`;
experience `none` → `never_trained`, `under_1_year` → `beginner`, `1_3_years`
→ `recreational`, `over_3_years` → `trained`; inactivity `under_3_months` →
`1_3_months`, `3_12_months` → `6_12_months`. Only local development data
exists, so these mappings affect no real athlete.

---

## ADR-024 — Engine runtime and the single write path for Stats

**Status:** Accepted · Milestone 3

**Context.** §45: the Python engine owns domain calculations; the frontend
must not duplicate scoring. §48: privileged engine writes happen server-side;
the service-role key never reaches the browser. Hosting for Python is open.

**Decision.** The engine is a pure function (JSON evidence in → JSON result
out) with no database access and no third-party runtime dependencies. The
Next.js server reads the athlete's raw evidence with *their* session (RLS),
runs the engine — as a local subprocess (`python3 -m ascend_engine
calculate`), or over HTTP when `ASCEND_ENGINE_URL` is set — and persists the
result through `public.engine_record_calculation()`. That function is
executable by `service_role` only; `SUPABASE_SERVICE_ROLE_KEY` is a
server-only variable read solely by `lib/supabase/admin.ts`. Clients cannot
insert, update or delete any derived row.

**Consequences.** Hosting the engine is a deployment choice (Vercel Python
function, a small container running `ascend_engine serve`, or a subprocess on
a Node host). It must be decided before deploying (see "needs approval").

---

## ADR-025 — v0.1 calibration is provisional configuration

**Status:** Proposed · Milestone 3 · needs product review

**Decision.** Every curve, weight, cap and threshold lives in
`engine/ascend_engine/config/v0_1_0.toml`, validated at load (monotonic
curves, weights summing to 1, known references). It is marked
`calibration_status = "provisional"` and stored with its SHA-256 hash in
`engine_versions`. Changing the file without bumping the engine version is
rejected by the database. The curves are internal calibration: never
described as norms, percentiles, rankings or medical thresholds. The
assumptions behind them are listed in the Milestone 3 report.

---

## ADR-026 — Which observation is scored

**Status:** Accepted · Milestone 3

**Decision.** Per test, the newest evidence is scored (the current
estimate); older comparable observations feed *repeatability*. Within one
test: M01 best attempt; M02/M03 mean of both sides (asymmetry kept as a
feature); M04 mean of each leg's best; M07 best time and mean errors; F02–F04
the best set's ten-rep-equivalent load; F05/F06 the recorded attempt.
Attempts within one Spawn session are not "comparable observations" for
repeatability, so it stays at the spec default 0.5 after Spawn.

---

## ADR-027 — Pain and capped results change quality, never the score

**Status:** Accepted · Milestone 3

**Decision.** A completed test with pain keeps its measured score; its
evidence quality is multiplied by 0.70 (lower Confidence). A test stopped for
pain, skipped or not performed is a gap: its subdomain is unobserved
(coverage falls), never zero. A result that hit a test cap or the equipment
ceiling is a lower bound: quality × 0.85 and noted in the trace.

---

## ADR-028 — One complete Spawn can reach VERIFIED; Peak starts then

**Status:** Superseded by ADR-031 and ADR-032 (Milestone 3.1)

**Context.** With the §6 formula, full coverage after a fresh Spawn gives
0.45 + 0.25 + 0.15 × 0.5 + 0.15 × 0.85 ≈ 0.90 ≥ 0.70.

**Decision.** Implemented as specified: a fully covered attribute is
VERIFIED straight after Spawn, and Peak is set to that first Current.
Recovery (one of three subdomains measurable) stays PROVISIONAL at ≈ 0.63.
If a single session should not verify, the lever is configuration (e.g. a
lower default repeatability or a higher threshold), not code.

---

## ADR-029 — Deterministic, idempotent calculations

**Status:** Accepted · Milestone 3

**Decision.** The engine reads no clock: `as_of` is the newest evidence
time. The input hash covers the evidence, gaps, athlete context and previous
Peaks. The database keeps one calculation per (athlete, engine version,
input hash), so repeating initialization returns the existing calculation
and adds nothing. Snapshots are append-only. The server sends only body mass
(the weight recorded at or before the evidence): no v0.1 curve uses age, sex
or height, and a changing age would otherwise change the input.

---

## ADR-030 — Avoid the "JWT issued at future" race after sign-in

**Status:** Accepted · Milestone 3 · revised in Milestone 3.1

**Context.** Straight after sign-in or sign-up, the first data request
occasionally failed with PostgREST `PGRST303 JWT issued at future`. Logging
in Milestone 3.1 showed the token was validated within the second it was
issued, and that retrying with the *same* token a second later still failed.
So the Milestone 3 retry-the-request fix could not work and was removed.

**Decision.** Before redirecting, the sign-in and sign-up actions wait
until the token's issuing second has passed, then confirm the data API
accepts it with one cheap read. If it is still rejected as issued at future
(reproducible on the first sign-up after the local stack restarts), the
action refreshes the session for a new token and tries again, at most four
times. This runs only in the Server Action, which can write the refreshed
session cookies; Server Components never refresh tokens (they cannot write
cookies and would break refresh-token rotation). No request retries.

**Consequences.** Sign-in is usually about a second slower, a few seconds at
worst. A token refreshed later by the proxy could in theory meet the same
race; it has not been observed.

---

## ADR-031 — Spawn alone never verifies: initial calibration cap

**Status:** Accepted · Milestone 3.1 · supersedes ADR-028

**Context.** Product review rejected ADR-028: one Spawn is a single
assessment period, not proof. Many tests in one period show coverage, not
that the result holds over time.

**Decision.** Until an attribute has a qualifying post-Spawn verification
event (ADR-033), its Confidence is capped at `initial_calibration_cap =
0.69`, below `verified_threshold = 0.70`; config validation rejects a cap at
or above the threshold. The cap scales rather than clamps: Confidence is
`uncapped × 0.69 / reference`, where the reference is the best Confidence
evidence can reach before verification (full coverage and recency, default
repeatability, best entry quality). Less evidence therefore still shows lower
Confidence below the cap. The §6 formula and weights are unchanged; the
trace records `uncapped_value`, the cap and `cap_applied`.

**Consequences.** After Spawn every ranked Stat and Overall is PROVISIONAL
(a fully covered attribute shows ≈ 68–69 %). The UI shows the calculated
value, never a hardcoded 69 %.

---

## ADR-032 — Current, provisional Peak and verified Peak

**Status:** Accepted · Milestone 3.1

**Context.** Spec §7 Peak is "best verified capability". A Spawn-only
maximum is not verified and must not be presented as a lifetime Peak.

**Decision.** `stat_snapshots.peak` becomes `verified_peak` (highest Current
while VERIFIED) and a new `provisional_peak` stores the highest Current ever
calculated (migration `20260929090000_peak_semantics.sql`, a rename plus an
added column; Milestone 3 was never deployed, so no production rows exist).
Both only rise; the provisional maximum always includes the verified one.
The UI shows `PEAK · NOT VERIFIED YET` until a verified Peak exists.

**Consequences.** Provisional history is preserved for later analysis
without claiming verified capability. Decay never touches either Peak.

---

## ADR-033 — Temporal repeatability and qualifying verification events

**Status:** Accepted · Milestone 3.1 · qualifying sources revised by ADR-036

**Decision.**
- Observations of the same test closer than
  `independent_observation_min_hours = 24` form one observation window (the
  newest in the window is scored). Repeatability uses one value per window,
  so same-day attempts can improve the result or its quality but never
  repeatability or verification.
- Verification needs evidence from a `qualifying_sources` event type
  (`reassessment`, `boss`, `verified_workout`; ADR-036) at least 24 h after
  the attribute's latest `baseline_sources` (`spawn_test`) evidence.
  Ordinary `workout` evidence does not qualify yet (ADR-036).
- Recovery additionally needs `workload_response` or `sleep_recovery`
  evidence (`required_any_subdomain`); heart-rate recovery alone keeps it
  PROVISIONAL. No sleep data is ever inferred.
- Confidence never rises because time passes (recency can only fall).

**Consequences.** One qualifying reassessment on a later day can verify only
the attributes it measures (fixture K: Strength 91 %, others unchanged).

---

## ADR-034 — Missing evidence cannot improve a Stat

**Status:** Accepted · Milestone 3.1

**Context.** Milestone 3 renormalized over measured subdomains, so athlete E
(no Pull) scored Strength 44.5 against comparable athlete B's 44.0: losing a
weak result raised the Stat.

**Decision.** For subdomains a configured test could measure,
`estimate = min(observed, observed × coverage + prior × (1 − coverage))`
with a configurable, non-zero `missing_prior` (20 for every attribute in
v0.1: the start of the internal beginner band). The same rule applies to
missing complementary sources inside a subdomain (alternative tests the athlete
chooses between, such as row or pull-up for Pull, are exempt). Subdomains no v0.1 test can measure (Recovery
sleep/workload, all of Power) lower Confidence only; they do not pull every
athlete's Current down for data ASCEND cannot yet collect.

**Guarantee (property-tested).** Removing a subdomain scored at or above the
prior never raises the estimate; removing the best one always lowers it.
Removing any single Spawn test never raises any attribute for the fixtures.
Unknown is never zero.

**Consequences.** E's Strength falls from 44.5 to 39.6 and Overall from
49.5 to 43.0. A removed subdomain scored *below* the prior could raise the
estimate by at most weight × (prior − score); curves bottom out at 5–15, so
this is bounded and documented rather than hidden.

---

## ADR-035 — Engine 0.1.1 and the service-role build guard

**Status:** Accepted · Milestone 3.1

**Decision.** The corrected semantics ship as engine `0.1.1` with
`config/v0_1_1.toml` (0.1.0 was never deployed, so its file was renamed
rather than kept). Every curve must carry `rationale` and `weakness`;
`python -m ascend_engine audit` generates `docs/CALIBRATION_AUDIT_v0.1.md`
from the configuration and a test fails if the committed file is stale.
The web build runs `scripts/check-client-bundle.mjs` after `next build` and
fails if the service-role key, its variable name or any `service_role` JWT
appears in `.next/static`; a unit test keeps the key readable in exactly one
`server-only` module and never as `NEXT_PUBLIC_*`.

**Consequences.** Recalculating with 0.1.1 produces new snapshots next to
any 0.1.0 ones (append-only, ADR-029).

---

## ADR-036 — Product decisions after the Milestone 3.1 review

**Status:** Accepted · Milestone 3.1

**1. Ordinary workouts and verification.** Repeated ordinary workouts on
different days MAY contribute toward verification, but completion alone never
does: they must provide comparable performance evidence of sufficient quality
and consistency. The rules are deferred to Milestone 5 (Quest & Workout
evidence). Until then `workout` is not a qualifying event type.

**2. Event type ≠ entry source.** Two separate dimensions:
- *Event type* — `performance_evidence.source_type`: `spawn_test`,
  `reassessment`, `workout`, `verified_workout`, `boss`.
- *Entry source* — `raw_payload.source`: `manual`, `wearable` (later
  `imported`, …). It affects measurement quality only.

`verified_workout` is a dedicated event type (migration
`20260929100000_verified_workout_evidence.sql`) with the ±2.0 cap and
qualifies for verification. A wearable measurement is not automatically
verified workout evidence. The Milestone 2 event values `wearable` and
`manual` stay allowed for existing rows but nothing writes them; the engine
weighs them like an ordinary workout (weight 0.25, ±1.0 cap, not
qualifying). Milestone 5 retires them.

**3. Missing-evidence prior.** The neutral prior of 20 (ADR-034) is approved
for v0.1 only as a provisional calibration parameter. It stays configurable
(`[estimation.missing_prior]`), is marked provisional in the configuration
and the calibration audit, and will be reviewed against real athlete data.

---

## ADR-037 — Design System V2 supersedes the cream/minimal visual system

**Status:** Proposed · Design System V2 · awaiting visual approval

**Context.** The Milestone 1–3 look (spec §27–§29: warm cream surfaces, deep
green brand, Inter, "cinematic through type, not decoration") was
deprecated in favour of a dark-fantasy, pixel-art direction
(`docs/design/reference-v2.png`) before Milestone 4 builds Quests, Paths and
Bosses on top of it.

**Decision.** Design System V2 (`docs/DESIGN_SYSTEM_V2.md`) replaces it:
- Dark palette in two token layers (palette primitives + semantic tokens);
  gold = progression/provisional, cyan = measured data, teal/green =
  verified/success, red/orange = Boss/danger, cream = fantasy type.
- Type: Barlow + Barlow Semi Condensed (product, tabular figures) and Cinzel
  (fantasy display, sparingly). Inter is removed.
- 23 pixel-art identity icons; utility controls stay vector.
- Art by semantic id through `lib/art.ts`; all current art is procedural,
  original placeholder art replaceable file-for-file.
- Navigation: Today · Quests · **Ascend** (centre) · Stats · You. Bosses
  leaves the bar (reachable at `/bosses`); `/quests` is a destination only.
- Fantasy intensity varies by context (strongest on Ascend/Boss, weakest on
  Stats/workout). No XP, coins or fictional levels — real progress is the game.

**Unchanged.** Engine semantics, scoring, Spawn calculations, the database,
copy that carries meaning (Unranked, Provisional, Confidence, "not a
percentile"), and integer display of Stats (spec §3).

**Consequences.** Spec §27–§29 are historical for visuals. The start
palette's muted text (`#71868e`) and red (`#ef4b45`) fail AA as text on
raised surfaces, so V2 uses `#8a9da4` and `#ff6b63` for text and keeps the
originals for decoration and fills.

