/**
 * Development-only tooling (ADR-019). True only under `next dev`; production
 * builds — including Vercel previews and the E2E server — return false.
 * The database refuses the reset independently unless seeded locally.
 */
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * The Design System V2 gallery (/design): component states for visual review.
 * On under `next dev`, or when ASCEND_DESIGN_GALLERY=1 is set explicitly (the
 * screenshot run). Off everywhere else.
 */
export function designGalleryEnabled(): boolean {
  return devToolsEnabled() || process.env.ASCEND_DESIGN_GALLERY === "1";
}
