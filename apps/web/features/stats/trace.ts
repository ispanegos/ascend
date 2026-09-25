/**
 * Reads the engine's calculation trace for the UI (spec §63 "WHY 42?").
 * The trace is stored as JSON; these readers narrow it defensively so an
 * older or partial trace never breaks a screen.
 */

export interface SubdomainView {
  name: string;
  label: string;
  observed: boolean;
  score: number | null;
  /** Share of the attribute score, 0..1 (renormalized over observed subdomains). */
  share: number | null;
  tests: string[];
  missingReason: string | null;
}

export interface ConfidenceView {
  coverage: number;
  recency: number;
  repeatability: number;
  quality: number;
  value: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function humanize(name: string): string {
  const text = name.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Measured subdomains by their share of the score, then the unmeasured ones. */
export function readSubdomains(trace: unknown): SubdomainView[] {
  if (!isRecord(trace) || !isRecord(trace.subdomain_scores)) return [];
  const views = Object.entries(trace.subdomain_scores).map(([name, raw]) => {
    const sd = isRecord(raw) ? raw : {};
    const sources = Array.isArray(sd.sources) ? sd.sources.filter(isRecord) : [];
    const missing = Array.isArray(sd.missing) ? sd.missing.filter(isRecord) : [];
    const firstMissing = missing[0];
    return {
      name,
      label: humanize(name),
      observed: sd.observed === true,
      score: num(sd.score),
      share: num(sd.renormalized_weight),
      tests: [...new Set(sources.map((s) => (typeof s.test_key === "string" ? s.test_key : "")).filter(Boolean))],
      missingReason: sd.observed === true ? null : typeof firstMissing?.reason === "string" ? firstMissing.reason : "no evidence yet",
    };
  });
  return views.sort(
    (a, b) => Number(b.observed) - Number(a.observed) || (b.share ?? 0) - (a.share ?? 0) || a.name.localeCompare(b.name),
  );
}

export function readConfidence(trace: unknown): ConfidenceView | null {
  if (!isRecord(trace) || !isRecord(trace.confidence)) return null;
  const c = trace.confidence;
  const values = [num(c.coverage), num(c.recency), num(c.repeatability), num(c.quality), num(c.value)];
  if (values.some((v) => v === null)) return null;
  const [coverage, recency, repeatability, quality, value] = values as number[];
  return { coverage: coverage!, recency: recency!, repeatability: repeatability!, quality: quality!, value: value! };
}

export function readGaps(trace: unknown): Array<{ testKey: string; status: string; reason: string | null }> {
  if (!isRecord(trace) || !Array.isArray(trace.gaps)) return [];
  return trace.gaps.filter(isRecord).map((g) => ({
    testKey: typeof g.test_key === "string" ? g.test_key : "",
    status: typeof g.status === "string" ? g.status : "",
    reason: typeof g.reason_code === "string" ? g.reason_code : null,
  }));
}

/** UI Stat: rounded integer; the stored value keeps its decimals (spec §3). */
export function displayStat(value: number | null): string {
  return value === null ? "—" : String(Math.round(value));
}

export function displayPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
