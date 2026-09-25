# ASCEND

Personal athletic progression system. *There is always another summit.*

- Product & technical spec (source of truth): [`docs/ASCEND_SPEC.md`](docs/ASCEND_SPEC.md)
- Milestones and status: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- Decisions and deviations: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Repository

```text
apps/web          Next.js 16 app (App Router, strict TypeScript, CSS Modules)
packages/shared   Domain types shared across the app (spec vocabulary)
engine            Python ASCEND Engine (Milestone 3)
supabase          Config, migrations, pgTAP tests
docs              Spec, plan, decision log
```

## Requirements

Node 24 (see `.nvmrc`), npm 11, Docker, Supabase CLI.

## Local development

```bash
npm install
supabase start                       # local Postgres + Auth + Studio
cp apps/web/.env.example apps/web/.env.local
# fill NEXT_PUBLIC_SUPABASE_ANON_KEY from `supabase status`
npm run dev                          # http://localhost:3000
```

Regenerate database types after a migration:

```bash
supabase gen types typescript --local > apps/web/lib/supabase/database.types.ts
```

## Checks

```bash
npm run typecheck   # tsc --noEmit, all workspaces
npm run lint        # eslint, zero warnings
npm test            # vitest unit tests
npm run test:db     # pgTAP RLS tests (needs `supabase start`)
npm run test:e2e    # Playwright at 320/390/430/768/1280 px + iPhone WebKit
```

The E2E suite builds the app and runs against the local Supabase stack. Install
browsers once with `npx playwright install chromium webkit`.

## Design system

`apps/web/styles/tokens.css` holds the spec §28/§29 tokens. Components consume
semantic tokens only — a unit test rejects raw hex colours in component
stylesheets and enforces WCAG AA text contrast.
