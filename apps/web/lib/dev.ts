/**
 * Development-only tooling (ADR-019). True only under `next dev`; production
 * builds — including Vercel previews and the E2E server — return false.
 * The database refuses the reset independently unless seeded locally.
 */
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
