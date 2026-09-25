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

## Milestone 2 — Profile + Spawn · `NOT STARTED`

Onboarding, equipment, availability, Spawn state machine (§11), all Spawn test
UIs (§12–§14), raw persistence, resume, movement flags, Spawn safety UX (§53).
Schema: `athlete_settings`, `equipment`, `athlete_equipment`,
`availability_windows`, `body_measurements`, `assessment_*`, `movement_flags`,
`performance_evidence`. Root redirect by Spawn state (§49). No fake scores.

## Milestone 3 — Engine · `NOT STARTED`

Python package under `engine/ascend_engine` (§44). Versioned scoring curves
as configuration marked `CALIBRATION_REQUIRED` / engine 0.1 (§4, §15, §54),
feature extraction, aggregation, Confidence (§6), Overall (§8),
Current/Peak (§7), evidence update (§16), decay (§17). Unit + property tests
before any UI wiring (§0.16, §55). Blocked until the M2 raw-evidence model is
stable (§70.7).

## Milestone 4 — Athlete dashboard · `NOT STARTED`

Today (§61), Stats + Stat cards (§35), Stat detail (§63), Paths (§18),
history.

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
4. **Root route before Spawn exists.** Until M2 adds the Spawn state machine,
   the authenticated root redirects to `/today`. M2 replaces this with the
   Spawn-state redirect (§49).
5. **Profile row.** A `profiles` row is created automatically on sign-up,
   holding only `display_name` and `preferred_units`. The remaining §9 fields
   are added with M2 onboarding.
6. **Units.** Internal storage in SI units (§46); `preferred_units` defaults to
   `metric`.
7. **Offline.** M1 provides an offline fallback page and static asset caching
   only. Offline active-workout persistence is M5.
8. **No analytics or error monitoring in M1.** §56 requires monitoring before
   wider release, not for the personal foundation build.
9. **Browser support.** Current Safari iOS and Chrome Android as primary;
   `color-mix()` and `dvh` are used as the spec prescribes, with fallbacks where
   the spec asks for them (backdrop-filter).
