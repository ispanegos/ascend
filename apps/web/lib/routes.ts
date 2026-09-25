/**
 * Route rules shared by proxy.ts and auth actions. Pure functions so they can
 * be unit tested.
 */

export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
/**
 * Signed-in landing. The root resolves the athlete's Spawn state and redirects
 * to the exact screen to resume (spec §49, ADR-010).
 */
export const HOME_PATH = "/";
export const TODAY_PATH = "/today";

const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/auth/", "/offline"] as const;
const AUTH_ONLY_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH] as const;

function matches(pathname: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Routes reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => matches(pathname, prefix));
}

/** Routes a signed-in user should be bounced away from. */
export function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some((prefix) => matches(pathname, prefix));
}

/**
 * Sanitises a post-sign-in redirect target. Only same-origin absolute paths
 * are allowed, which blocks open redirects such as `//evil.example` or
 * `https://evil.example`.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return HOME_PATH;
  }
  if (isAuthOnlyPath(next.split(/[?#]/)[0] ?? next)) return HOME_PATH;
  return next;
}
