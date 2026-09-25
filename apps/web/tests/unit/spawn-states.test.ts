import {
  SPAWN_EVENTS,
  SPAWN_STATES,
  eventRule,
  hasReached,
  isDataCollectionComplete,
  nextSession,
  sessionAvailability,
  transition,
} from "@ascend/shared";
import { describe, expect, it } from "vitest";

describe("Spawn state machine (spec §11, ADR-012)", () => {
  it("walks the full happy path one event at a time", () => {
    let state: (typeof SPAWN_STATES)[number] = "NOT_STARTED";
    for (const event of SPAWN_EVENTS) {
      const next = transition(state, event);
      expect(next, event).not.toBeNull();
      state = next!;
    }
    expect(state).toBe("COMPLETE");
  });

  it("every transition moves exactly one step forward", () => {
    for (const event of SPAWN_EVENTS) {
      const { from, to } = eventRule(event);
      expect(SPAWN_STATES.indexOf(to) - SPAWN_STATES.indexOf(from)).toBe(1);
    }
  });

  it.each([
    ["NOT_STARTED", "COMPLETE_CONTEXT"],
    ["BODY_PROFILE", "COMPLETE_MOVEMENT"],
    ["MOVEMENT_PENDING", "BEGIN_FRAME"],
    ["MOVEMENT_COMPLETE", "COMPLETE_FRAME"],
    ["ENGINE_PENDING", "REQUEST_CALIBRATION"],
    ["COMPLETE", "START_PROFILE"],
  ] as const)("rejects %s + %s", (state, event) => {
    expect(transition(state, event)).toBeNull();
  });

  it("cannot skip a session or go backwards", () => {
    expect(transition("MOVEMENT_PENDING", "COMPLETE_FRAME")).toBeNull();
    expect(transition("FRAME_COMPLETE", "COMPLETE_MOVEMENT")).toBeNull();
  });

  it("hasReached compares positions", () => {
    expect(hasReached("FRAME_PENDING", "MOVEMENT_COMPLETE")).toBe(true);
    expect(hasReached("MOVEMENT_PENDING", "MOVEMENT_COMPLETE")).toBe(false);
  });

  it("data collection is complete from ENGINE_COMPLETE on", () => {
    expect(isDataCollectionComplete("ENGINE_PENDING")).toBe(false);
    expect(isDataCollectionComplete("ENGINE_COMPLETE")).toBe(true);
    expect(isDataCollectionComplete("CALIBRATING")).toBe(true);
  });
});

describe("session availability", () => {
  it.each([
    ["BODY_PROFILE", "locked", "locked", "locked"],
    ["MOVEMENT_PENDING", "available", "locked", "locked"],
    ["MOVEMENT_COMPLETE", "complete", "available", "locked"],
    ["FRAME_PENDING", "complete", "in_progress", "locked"],
    ["FRAME_COMPLETE", "complete", "complete", "available"],
    ["ENGINE_PENDING", "complete", "complete", "in_progress"],
    ["ENGINE_COMPLETE", "complete", "complete", "complete"],
  ] as const)("%s → movement %s, frame %s, engine %s", (state, movement, frame, engine) => {
    expect(sessionAvailability(state, "movement")).toBe(movement);
    expect(sessionAvailability(state, "frame")).toBe(frame);
    expect(sessionAvailability(state, "engine")).toBe(engine);
  });

  it("names the next session", () => {
    expect(nextSession("NOT_STARTED")).toBeNull();
    expect(nextSession("MOVEMENT_PENDING")).toBe("movement");
    expect(nextSession("MOVEMENT_COMPLETE")).toBe("frame");
    expect(nextSession("ENGINE_PENDING")).toBe("engine");
    expect(nextSession("ENGINE_COMPLETE")).toBeNull();
  });
});
