/** Failure shape shared by every server action result. */
export interface ActionFailure {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}

export const OFFLINE_FAILURE: ActionFailure = {
  ok: false,
  error: "Couldn't reach ASCEND. Your entries are still here — check your connection and try again.",
};

/**
 * Calls a server action and turns a network failure (thrown fetch error)
 * into a normal failed result, so the screen keeps what the athlete typed
 * and offers a retry (spec §50).
 */
export async function safely<T extends { ok: boolean }>(call: () => Promise<T>): Promise<T | ActionFailure> {
  try {
    return await call();
  } catch {
    return OFFLINE_FAILURE;
  }
}
