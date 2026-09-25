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

**Status:** Accepted · Milestone 1 · Temporary

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
