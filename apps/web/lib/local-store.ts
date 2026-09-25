/**
 * Small, failure-tolerant localStorage helpers. Storage can be unavailable
 * (private mode, quota), so every call degrades to a no-op. Holds only
 * in-progress input on the athlete's own device (spec §26, §50).
 */

const PREFIX = "ascend.";

export function readLocal(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the server copy is still authoritative.
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore.
  }
}
