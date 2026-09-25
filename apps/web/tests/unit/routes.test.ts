import { describe, expect, it } from "vitest";
import { HOME_PATH, isAuthOnlyPath, isPublicPath, safeNextPath } from "@/lib/routes";

describe("isPublicPath", () => {
  it.each(["/sign-in", "/sign-up", "/auth/confirm", "/offline"])("%s is public", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each(["/", "/today", "/profile", "/sign-in-evil", "/offline-data", "/auth"])(
    "%s requires a session",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});

describe("isAuthOnlyPath", () => {
  it("matches sign-in and sign-up only", () => {
    expect(isAuthOnlyPath("/sign-in")).toBe(true);
    expect(isAuthOnlyPath("/sign-up")).toBe(true);
    expect(isAuthOnlyPath("/auth/confirm")).toBe(false);
    expect(isAuthOnlyPath("/today")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths with query strings", () => {
    expect(safeNextPath("/stats?range=28d")).toBe("/stats?range=28d");
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "today",
    "/sign-in",
    "/sign-up?x=1",
  ])("falls back to home for %s", (next) => {
    expect(safeNextPath(next)).toBe(HOME_PATH);
  });
});
