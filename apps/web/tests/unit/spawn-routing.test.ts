import { describe, expect, it } from "vitest";
import { isEditableStep, nextStep, previousStep, stepPosition } from "@/features/spawn/onboarding/steps";
import { resolveSpawnPath, type SessionPointer } from "@/features/spawn/routing";

const open = (kind: SessionPointer["kind"], key: string | null): SessionPointer => ({
  kind,
  status: "in_progress",
  current_test_key: key,
});

describe("resume routing (spec §11, §49)", () => {
  it("sends a brand-new athlete to the welcome screen", () => {
    expect(resolveSpawnPath("NOT_STARTED", null, [])).toBe("/spawn/body/welcome");
  });

  it("resumes onboarding at the saved step", () => {
    expect(resolveSpawnPath("BODY_PROFILE", "availability", [])).toBe("/spawn/body/availability");
    expect(resolveSpawnPath("BODY_PROFILE", "bogus", [])).toBe("/spawn/body/name");
  });

  it("shows the Spawn Point before Movement starts", () => {
    expect(resolveSpawnPath("MOVEMENT_PENDING", null, [])).toBe("/spawn");
  });

  it("resumes an open session at its current test", () => {
    expect(resolveSpawnPath("MOVEMENT_PENDING", null, [open("movement", "M04")])).toBe("/spawn/movement/m04");
    expect(resolveSpawnPath("FRAME_PENDING", null, [open("frame", "F02")])).toBe("/spawn/frame/f02");
    expect(resolveSpawnPath("ENGINE_PENDING", null, [open("engine", null)])).toBe("/spawn/engine");
  });

  it("returns to the hub between sessions (rest days allowed)", () => {
    expect(resolveSpawnPath("MOVEMENT_COMPLETE", null, [])).toBe("/spawn");
    expect(resolveSpawnPath("FRAME_COMPLETE", null, [])).toBe("/spawn");
  });

  it("ends at Spawn Complete, then Today", () => {
    expect(resolveSpawnPath("ENGINE_COMPLETE", null, [])).toBe("/spawn/complete");
    expect(resolveSpawnPath("CALIBRATING", null, [])).toBe("/spawn/complete");
    expect(resolveSpawnPath("COMPLETE", null, [])).toBe("/today");
  });
});

describe("onboarding steps", () => {
  it("skips the loads screen without loadable equipment", () => {
    expect(nextStep("equipment", false)).toBe("environments");
    expect(nextStep("equipment", true)).toBe("loads");
    expect(previousStep("environments", false)).toBe("equipment");
    expect(previousStep("environments", true)).toBe("loads");
  });

  it("counts only the real steps in progress", () => {
    expect(stepPosition("welcome")).toBeNull();
    expect(stepPosition("name")).toEqual({ index: 1, total: 16 });
    expect(stepPosition("limitations")).toEqual({ index: 16, total: 16 });
  });

  it("only real profile steps are editable", () => {
    expect(isEditableStep("height")).toBe(true);
    expect(isEditableStep("review")).toBe(false);
    expect(isEditableStep("welcome")).toBe(false);
  });
});
