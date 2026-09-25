/**
 * Spawn state machine (spec §11, ADR-012). Pure functions; Postgres enforces
 * the same one-step-forward rule independently.
 */

export const SPAWN_STATES = [
  "NOT_STARTED",
  "BODY_PROFILE",
  "MOVEMENT_PENDING",
  "MOVEMENT_COMPLETE",
  "FRAME_PENDING",
  "FRAME_COMPLETE",
  "ENGINE_PENDING",
  "ENGINE_COMPLETE",
  "CALIBRATING",
  "COMPLETE",
] as const;

export type SpawnState = (typeof SPAWN_STATES)[number];

export const SPAWN_EVENTS = [
  "START_PROFILE",
  "COMPLETE_CONTEXT",
  "COMPLETE_MOVEMENT",
  "BEGIN_FRAME",
  "COMPLETE_FRAME",
  "BEGIN_ENGINE",
  "COMPLETE_ENGINE",
  "REQUEST_CALIBRATION",
  "CALIBRATION_COMPLETE",
] as const;

export type SpawnEvent = (typeof SPAWN_EVENTS)[number];

const TRANSITIONS: Readonly<Record<SpawnEvent, { from: SpawnState; to: SpawnState }>> = {
  START_PROFILE: { from: "NOT_STARTED", to: "BODY_PROFILE" },
  COMPLETE_CONTEXT: { from: "BODY_PROFILE", to: "MOVEMENT_PENDING" },
  COMPLETE_MOVEMENT: { from: "MOVEMENT_PENDING", to: "MOVEMENT_COMPLETE" },
  BEGIN_FRAME: { from: "MOVEMENT_COMPLETE", to: "FRAME_PENDING" },
  COMPLETE_FRAME: { from: "FRAME_PENDING", to: "FRAME_COMPLETE" },
  BEGIN_ENGINE: { from: "FRAME_COMPLETE", to: "ENGINE_PENDING" },
  COMPLETE_ENGINE: { from: "ENGINE_PENDING", to: "ENGINE_COMPLETE" },
  REQUEST_CALIBRATION: { from: "ENGINE_COMPLETE", to: "CALIBRATING" },
  CALIBRATION_COMPLETE: { from: "CALIBRATING", to: "COMPLETE" },
};

export function isSpawnState(value: unknown): value is SpawnState {
  return typeof value === "string" && (SPAWN_STATES as readonly string[]).includes(value);
}

export function spawnStateRank(state: SpawnState): number {
  return SPAWN_STATES.indexOf(state);
}

/** The next state, or null when the event is not valid in this state. */
export function transition(state: SpawnState, event: SpawnEvent): SpawnState | null {
  const rule = TRANSITIONS[event];
  return rule.from === state ? rule.to : null;
}

/** The state an event starts from and leads to. */
export function eventRule(event: SpawnEvent): { from: SpawnState; to: SpawnState } {
  return TRANSITIONS[event];
}

/** True once `state` is at or beyond `target`. */
export function hasReached(state: SpawnState, target: SpawnState): boolean {
  return spawnStateRank(state) >= spawnStateRank(target);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const SESSION_KINDS = ["movement", "frame", "engine"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export function isSessionKind(value: unknown): value is SessionKind {
  return typeof value === "string" && (SESSION_KINDS as readonly string[]).includes(value);
}

interface SessionStates {
  /** State in which the session can be started. */
  available: SpawnState;
  /** Event fired when the athlete starts the session (none for Movement). */
  beginEvent: SpawnEvent | null;
  /** State while the session is open. */
  pending: SpawnState;
  completeEvent: SpawnEvent;
  complete: SpawnState;
}

export const SESSION_STATES: Readonly<Record<SessionKind, SessionStates>> = {
  movement: {
    available: "MOVEMENT_PENDING",
    beginEvent: null,
    pending: "MOVEMENT_PENDING",
    completeEvent: "COMPLETE_MOVEMENT",
    complete: "MOVEMENT_COMPLETE",
  },
  frame: {
    available: "MOVEMENT_COMPLETE",
    beginEvent: "BEGIN_FRAME",
    pending: "FRAME_PENDING",
    completeEvent: "COMPLETE_FRAME",
    complete: "FRAME_COMPLETE",
  },
  engine: {
    available: "FRAME_COMPLETE",
    beginEvent: "BEGIN_ENGINE",
    pending: "ENGINE_PENDING",
    completeEvent: "COMPLETE_ENGINE",
    complete: "ENGINE_COMPLETE",
  },
};

export type SessionAvailability = "locked" | "available" | "in_progress" | "complete";

/** Where a session stands for an athlete in `state`. */
export function sessionAvailability(state: SpawnState, kind: SessionKind): SessionAvailability {
  const rules = SESSION_STATES[kind];
  if (hasReached(state, rules.complete)) return "complete";
  // Movement has no separate "begin" state: MOVEMENT_PENDING covers both
  // "available" and "open"; whether a session row exists tells them apart.
  if (rules.beginEvent !== null && state === rules.pending) return "in_progress";
  if (state === rules.available) return "available";
  return "locked";
}

/** The session the athlete should work on next, if any. */
export function nextSession(state: SpawnState): SessionKind | null {
  for (const kind of SESSION_KINDS) {
    const availability = sessionAvailability(state, kind);
    if (availability === "available" || availability === "in_progress") return kind;
  }
  return null;
}

/** Every Spawn session is done; the raw data set is complete. */
export function isDataCollectionComplete(state: SpawnState): boolean {
  return hasReached(state, "ENGINE_COMPLETE");
}
