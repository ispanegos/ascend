# ASCEND — Implementation Plan

Source of truth: [`ASCEND_SPEC.md`](./ASCEND_SPEC.md) (v0.1). This plan
sequences the spec's §69 milestones. It does not change product mechanics.
Deviations and interpretation calls are recorded in
[`DECISIONS.md`](./DECISIONS.md).

Status legend: `DONE` · `IN PROGRESS` · `NOT STARTED`

---

## Milestone 1 — Foundation · `DONE`

Spec §69 deliverables and how each is met.

| Deliverable | Implementation | Spec refs |
|---|---|---|
| Monorepo | npm workspaces: `apps/web`, `packages/shared`; `engine/` and `supabase/` directories per §44 | §44 |
| Next.js app | Next.js 16 App Router, React 19, strict TypeScript (no `any`) | §43, §0.14 |
| Supabase local/project setup | `supabase/config.toml`, migrations, local stack via Supabase CLI; remote project `ascend` linked, migration applied | §45, §46 |
| Auth | Supabase Auth, email + password, SSR cookie sessions via `@supabase/ssr`; route protection in `proxy.ts` | §48, §57 |
| RLS | `profiles` table, owner-only policies scoped by `auth.uid()`, pgTAP tests | §46, §48 |
| tokens.css | Spec §28 tokens verbatim, plus typography tokens (§29) | §28, §29 |
| Global mobile shell | `globals.css` baseline (§30), `utilities.css` type scale, safe areas, `100dvh` | §26, §30, §41 |
| Bottom nav | 5 destinations (Today, Stats, Ascend, Bosses, Profile), icon + label, `aria-current`, safe-area padding, backdrop-filter fallback | §25, §26, §34 |
| Base components | Button, Card, Chip/ChipGroup, TextField, StatusBadge, Sheet, MobileActionBar, PageHeader, EmptyState, ErrorState, LoadingState (skeleton), Icon set | §32, §33, §40, §50 |
| PWA manifest | `app/manifest.ts`, PNG + maskable icons, theme/background colors, standalone; minimal service worker with offline fallback page | §41 |
| Responsive test setup | Playwright projects at 320 / 390 / 430 / 768 / 1280 px; overflow, touch target and authenticated-navigation checks | §55, §71 |

### Acceptance (spec §69)

- [x] Works cleanly at 320 / 390 / 430 px
- [x] Installable shell (manifest + icons + service worker)
- [x] No horizontal overflow
- [x] Authenticated navigation (signed-out users are redirected to sign-in;
      signed-in users navigate across all 5 destinations)
- [x] `npm run typecheck`, `npm run lint`, `npm test` pass
- [x] RLS tests pass (`supabase test db`)
- [x] E2E responsive suite passes against the local Supabase stack

Verified on 2026-09-25: 123 unit tests, 19 pgTAP RLS tests, 139 E2E tests
(6 skipped by design: keyboard-only checks on touch projects, service-worker
checks on WebKit) across 320 / 390 / 430 / iPhone WebKit / 768 / 1280.

Deployed to production at https://ascend-seven-orcin.vercel.app (Vercel root
directory `apps/web`); remote Supabase migration applied.

### Explicitly out of scope for Milestone 1

Destination screens (`/today`, `/stats`, `/ascend`, `/bosses`, `/profile`)
render only an honest shell with an empty state. They contain no Stats, no
fake scores, no Quests and no Boss data. Spawn, scoring, Paths, Quests,
workout player, Bosses and body data belong to later milestones.

### Work order

1. Docs: this plan + `DECISIONS.md`.
2. Monorepo scaffold, TypeScript/ESLint/Vitest config.
3. Design system: `tokens.css`, `globals.css`, `utilities.css`.
4. Base components + unit tests.
5. Supabase: config, `profiles` migration with RLS, pgTAP tests.
6. Auth: Supabase clients, `proxy.ts` session refresh + route guard,
   sign-in / sign-up / sign-out.
7. App shell: authenticated layout + bottom nav + 5 destinations.
8. PWA: manifest, icons, service worker, offline page.
9. Playwright responsive suite.
10. Verification: typecheck, lint, unit, RLS, e2e.

---

## Milestone 2 — Profile + Spawn · `DONE`

Spec §69 deliverables: onboarding, equipment, availability, Spawn session
state machine, all Spawn test UIs, raw persistence, resume interrupted
assessment, flags. **No Stats, no scores, no scoring curves** (§69, §70.7).
Milestone 2 collects and persists raw evidence only; the Stats Engine is M3.

### Review of Milestone 1 against the spec

M1 architecture is kept as is: route groups, `proxy.ts` guard, per-request
`getClaims()` data access, CSS Modules + tokens, native `<dialog>` sheet,
Playwright viewport projects. Changes M2 makes to M1 code:

| M1 element | M2 change | Why |
|---|---|---|
| `HOME_PATH = "/today"`, proxy sends signed-in `/` to `/today` (ADR-005) | `/` resolves by Spawn state; proxy lets `/` through | §49 |
| `handle_new_user()` creates `profiles` only | also creates `athlete_settings` (Spawn state `NOT_STARTED`) | §11 |
| `profiles` has name + units | adds §9 fields | §9 |
| `profiles_rls.test.sql` counts all rows | counts fixture rows only | failed once E2E users existed |
| Today / Profile empty states | Today links back into Spawn; Profile shows body, equipment, availability, sources with edit screens | §25, §49 |

### Deliverables

| Deliverable | Implementation | Spec refs |
|---|---|---|
| Schema | Migration `20260926090000_spawn.sql`: `athlete_settings`, `equipment` (reference, seeded), `athlete_equipment`, `availability_windows`, `body_measurements`, `assessment_tests` (reference, seeded), `assessment_sessions`, `assessment_results`, `assessment_attempts`, `movement_flags`, `performance_evidence`; RLS on every table; SI units in column names | §46, §47, §48 |
| Raw-data integrity | Triggers: resolved results and their attempts are immutable; evidence is append-only; Spawn state only moves one step forward; pain ⇒ Movement Flag; completed result ⇒ evidence row; session completion requires every test resolved | §0.3, §5, §47, §53, §72 |
| Spawn state machine | Pure `transition(state, event)` in `@ascend/shared`; persisted in `athlete_settings.spawn_state`; enforced again in Postgres | §11 |
| Onboarding (Spawn 0) | `/spawn/body/[step]`: one concept per screen, sticky CTA, progress bar, resumable step pointer | §9, §11, §26 |
| Spawn Point | `/spawn`: Overall + 7 attributes `UNRANKED`, the three sessions, `BEGIN ASSESSMENT` | §11, §59 |
| Session pre-flight | Duration, what it measures, what is needed, safety/stop notes, acknowledgement | §53 |
| Test flow | `/spawn/[session]/[test]`: intro → instructions/execute → record attempts → confirm; integrated timers; skip / cannot perform / stop with reason; pain flag | §12–§14, §53 |
| Test catalog | 17 tests (M01–M07, F01–F06, E01–E04) as typed field definitions in `@ascend/shared`; one generic form renderer | §12–§14 |
| Resume | Session stores the current test and step; `/` sends the athlete straight back to it; unsaved field input is kept on the device | §11, §26, §41 |
| Session complete | Per-attribute data-collection status (collected / partial / not assessed) — no scores | §12, §15 |
| Spawn Complete | `ATHLETE DATA COLLECTED` + temporary `INITIALIZE ATHLETE PROFILE` → `CALIBRATING` | §60 |
| Profile editing | `/profile` summary + `/profile/edit/[step]` reusing the onboarding forms | §25, §49 |
| Dev reset | `dev_reset_spawn()` RPC gated by a DB flag that only `seed.sql` sets, and a server action that only exists when `NODE_ENV=development` | user request |
| Tests | Vitest: state machine, validation, completion, coverage, resume routing, field mapping, catalog integrity. pgTAP: RLS + triggers. Playwright: full Spawn at 390 px, resume after reload and re-login, skip, layout checks at 320/390/430/768/1280 | §55, §71 |

### Work order

1. Docs: this section + ADRs.
2. Migration, seed flag, pgTAP tests; regenerate `database.types.ts`.
3. `@ascend/shared`: Spawn states, test catalog, field validation, completion + coverage, profile options + validation.
4. Web data access (`features/spawn/data.ts`) and server actions.
5. UI primitives: progress bar, segmented/RPE, number + duration fields, switch, textarea, timer, focused top bar.
6. Onboarding, Spawn Point, pre-flight, test flow, session complete, Spawn Complete.
7. Root redirect, Today/Profile updates, profile edit screens.
8. Unit, pgTAP and E2E tests; typecheck, lint, build.

### Acceptance

- [x] Profile → Body/Context → Spawn Point → Movement → Frame → Engine → Spawn Complete works end to end at 390 px
- [x] Leaving at any step and returning (reload, sign out/in, new browser context) resumes at the same step
- [x] Completed results cannot be changed or deleted by the client
- [x] Pain creates a Movement Flag and never a result of zero
- [x] Skip / cannot perform stores the reason
- [x] No Stat number appears anywhere
- [x] No horizontal overflow and 44 px targets at 320 / 390 / 430 / 768 / 1280
- [x] typecheck, lint, unit, pgTAP, E2E and production build pass

Verified on 2026-09-25: 208 unit tests, 77 pgTAP assertions, 146 E2E tests
(11 skipped by design: M1's touch/WebKit skips and the full journey, which
runs only at 390 px), production build. Not yet deployed: the remote Supabase
migration and Vercel deploy are pending approval.

## Milestone 3 — Engine · `DONE (local)`

Stats Engine v0.1: raw Spawn evidence → Endurance, Strength, Power, Core,
Mobility, Agility, Recovery and Overall with Current, Peak, Confidence,
status, engine version and a calculation trace. Not deployed (ADR-023 §10).

| Area | Implementation | Spec refs |
|---|---|---|
| Product decisions | ADR-023; migration `20260927090000_product_decisions.sql` maps vocabularies; 18+; unusual values need confirmation | brief |
| Engine package | `engine/ascend_engine`: `evidence` (parsing), `assessment` (features), `scoring` (curves, normalization), `aggregation` (subdomains, attributes, Overall), `confidence`, `progression` (Current/Peak, update, decay), `config`, `engine.py` (pipeline + trace), CLI + HTTP | §15, §44, §45 |
| Calibration | `config/v0_1_0.toml`, validated, `provisional`, hashed | §4, §54, §73 |
| Persistence | Migration `20260928090000_stats_engine.sql`: `engine_versions`, `scoring_curves`, `engine_config`, `stat_calculations`, `calculation_evidence`, `stat_snapshots`, `overall_snapshots`; append-only; `engine_record_calculation()` service-role only, idempotent | §46, §47, §48 |
| Initialization | `initializeAthleteProfile` action: CALIBRATING → engine → snapshots → COMPLETE | brief §11 |
| UI | Initializing screen, Athlete Profile Initialized, `/stats`, `/stats/[attribute]` (why, confidence components, evidence), `/ascend/paths` placeholder; shell locked until COMPLETE | §35, §60, §63 |
| Tests | pytest (engine), Vitest, pgTAP, Playwright (journey at 390 and 320) | §55 |

### Acceptance

- [x] Deterministic, recalculable, versioned; every snapshot carries engine version and trace
- [x] Unknown ≠ zero (Power UNRANKED; missing tests lower Confidence only)
- [x] Pain ≠ poor performance (quality, not score)
- [x] Overall per §8 with renormalization; UNRANKED until the five required Stats exist
- [x] Update caps and decay implemented in configuration, tested
- [x] Initialization idempotent; snapshots append-only; clients cannot write Stats
- [x] All M1/M2 regression suites pass

## Milestone 3.1 — Stats engine review and correction · `DONE (local)`

Corrects scoring semantics before Quest/Path logic (ADR-031 to ADR-036).
Engine `0.1.1`. Not deployed.

| Area | Implementation | Refs |
|---|---|---|
| Spawn never verifies | Confidence scaled into `initial_calibration_cap = 0.69` until a qualifying post-Spawn event | ADR-031 |
| Temporal repeatability | Observations < 24 h apart are one; qualifying event types `reassessment`, `boss`, `verified_workout`; Recovery also needs workload/sleep | ADR-033, ADR-036 |
| Event type vs entry source | `verified_workout` event type (migration `20260929100000_verified_workout_evidence.sql`); wearable entry ≠ verification | ADR-036 |
| Missing evidence | Conservative estimate toward a non-zero prior (20, provisional for v0.1); never raises a Stat; property tests | ADR-034, ADR-036 |
| Peak | `provisional_peak` + `verified_peak`; migration `20260929090000_peak_semantics.sql` | ADR-032 |
| Calibration audit | `python -m ascend_engine audit` → `docs/CALIBRATION_AUDIT_v0.1.md`; staleness test | ADR-035 |
| Service role | Post-build client-bundle scan + unit guard | ADR-035 |
| UI | Initialized screen: provisional, real capped Confidence; Stat detail: Peak "Not verified yet", why-this-score incl. missing-evidence note, evidence source | brief §13, §14 |
| Fixtures | Synthetic athletes A–L (`npm run engine:report`) | brief §10 |

### Acceptance

- [x] Spawn alone never produces VERIFIED; Confidence ≤ 0.69 without later evidence
- [x] Same-day repeats stay PROVISIONAL; one qualifying later event can verify
- [x] Removing evidence never raises Current (H, I, property tests); unknown ≠ zero
- [x] Peak split, never decreases; UI shows "Not verified yet"
- [x] Recovery PROVISIONAL without workload/sleep; Power UNRANKED
- [x] Update caps, decay and determinism unchanged and tested
- [x] Full regression: pytest, Vitest, pgTAP, Playwright, typecheck, lint, build

## Design System V2 — visual redesign · `DONE (local) · approved and closed`

Dark-fantasy pixel-art visual language applied to every existing screen
before Milestone 4 (ADR-037, `docs/DESIGN_SYSTEM_V2.md`). No engine,
scoring, Spawn or database behaviour changes.

- Tokens, typography (Barlow + Cinzel), 23 pixel icons, art registry with
  procedural placeholders
- Components: BottomNav (Today · Quests · Ascend · Stats · You), ScreenHeader,
  SectionHeader, Card variants, MetricCard, StatusBadge, AttributeIcon,
  ProgressBar, ConfidenceBar, QuestCard, BossCard, TimerDisplay,
  WorkoutControl, PixelArtFrame, Artwork, Empty/Locked states
- Screens: auth, onboarding, Spawn Point, sessions, tests, Spawn Complete,
  Initializing, Initialized, Stats, Stat detail, Today, Quests, Ascend,
  Bosses, You; review gallery at `/design` (dev or `ASCEND_DESIGN_GALLERY=1`)
- Screenshots: `docs/design/screens-v2/390`, `/320`; review composite `docs/design/review-v2/composite.png`
- Pass 2 (ADR-038) and final polish (ADR-039): depth, detailed icons, screen compositions, `/design/review`, Athlete body on You. Artwork Pass deferred.

## Milestone 4 — Athlete dashboard · `IN PROGRESS`

Branch `m4-athlete-dashboard` from **`333da7f`** (M3 + M3.1 + Design System
V2 + freeze). Scope and decisions: ADR-040 to ADR-043.

| # | Step | Output |
|---|---|---|
| 1 | Database | Migration: `paths` (7 rows), `athlete_path_configurations`, `athlete_path_configuration_items`, invariants, append-only, RLS, `set_athlete_paths()`, `current_athlete_paths`, `athlete_path_history`; pgTAP |
| 2 | Engine | `ascend_engine/paths/` suggestion rules `paths-0.1`, CLI `suggest-paths`, `POST /v1/suggest-paths`; pytest |
| 3 | Domain | `packages/shared`: Path rules (validation mirror), trend rule `trend-0.1`, history windows; Vitest |
| 4 | Server | Runner `suggestPaths()`, Path data + server action, Stat/Overall history queries |
| 5 | UI | `/ascend/paths` (suggestions, selection, history), Today, Ascend, Stats (Peak + trend), Stat detail (Path priority, SVG history chart 7D/28D/3M/1Y) — frozen V2 components |
| 6 | Tests | E2E: select, change, clear, history, invalid combos rejected; existing suites green |

## Milestone 5 — Quest + Workout · `NOT STARTED`

Weekly plan generation (§19, §20), Quest detail, workout player (§21, §62),
rest timer, offline persistence and sync (§50), performance evidence creation.

## Milestone 6 — Bosses · `NOT STARTED`

Catalog, requirements, Readiness (§22), preparation, attempts,
Defeated / Not Defeated, Recoil, Revenge.

## Milestone 7 — Body + data sources · `NOT STARTED`

Body timeline, 5 kg checkpoints (§66), `HealthDataProvider` interfaces (§24),
manual data.

---

## Assumptions

Listed separately as required by §70.3. Any assumption that changes a spec
mechanic must become an entry in `DECISIONS.md`.

1. **Project location.** The repository is `ispanegos/ascend` (GitHub), the
   Vercel project is `panegos/ascend`, the Supabase project is `ascend`
   (ref `jykykwdrwlkakkcivwnh`, eu-west-1).
2. **Single athlete first, multi-user ready.** Sign-up stays enabled so the
   architecture exercises real per-user isolation; there is no admin or coach
   role.
3. **UI language.** English, matching the spec's product vocabulary (§2, §52).
   No i18n framework in M1.
4. **Root route.** M1 redirected the authenticated root to `/today`. From M2
   the root redirects by Spawn state (§49, ADR-010).
5. **Profile row.** A `profiles` row and an `athlete_settings` row are
   created automatically on sign-up. §9 fields are filled in by onboarding.
6. **Units.** Internal storage in SI units (§46); `preferred_units` defaults to
   `metric`.
7. **Offline.** M1 provides an offline fallback page and static asset caching
   only. Offline active-workout persistence is M5.
8. **No analytics or error monitoring in M1.** §56 requires monitoring before
   wider release, not for the personal foundation build.
9. **Browser support.** Current Safari iOS and Chrome Android as primary;
   `color-mix()` and `dvh` are used as the spec prescribes, with fallbacks where
   the spec asks for them (backdrop-filter).
10. **Metric input only in M2.** Inputs are kilograms and centimetres;
    `preferred_units` is stored but imperial input/display conversion is
    deferred. Decimal comma (`72,5`) is accepted as well as `72.5`.
11. **Spawn sessions run on different days.** Nothing times out. A session
    stays `in_progress` until the athlete finishes it.
12. **One device at a time.** Resume works across devices because state is in
    Supabase, but two devices editing the same test at the same moment is
    last-write-wins for in-progress attempts.
