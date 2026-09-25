import { describe, expect, it } from "vitest";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  hasErrors,
  parseSignIn,
  parseSignUp,
} from "@/features/auth/validation";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseSignIn", () => {
  it("normalises email and keeps password untouched", () => {
    const result = parseSignIn(form({ email: "  Athlete@Example.COM ", password: " pw " }));
    expect(result.email).toBe("athlete@example.com");
    expect(result.password).toBe(" pw ");
    expect(hasErrors(result.fieldErrors)).toBe(false);
  });

  it("reports missing and invalid fields", () => {
    const result = parseSignIn(form({ email: "not-an-email" }));
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toBeDefined();
  });
});

describe("parseSignUp", () => {
  it("enforces the configured minimum password length", () => {
    const short = parseSignUp(
      form({ email: "a@b.co", password: "x".repeat(MIN_PASSWORD_LENGTH - 1) }),
    );
    expect(short.fieldErrors.password).toMatch(String(MIN_PASSWORD_LENGTH));

    const ok = parseSignUp(form({ email: "a@b.co", password: "x".repeat(MIN_PASSWORD_LENGTH) }));
    expect(hasErrors(ok.fieldErrors)).toBe(false);
  });

  it("treats the display name as optional but bounded", () => {
    const base = { email: "a@b.co", password: "x".repeat(MIN_PASSWORD_LENGTH) };
    expect(parseSignUp(form(base)).displayName).toBe("");
    const long = parseSignUp(
      form({ ...base, displayName: "n".repeat(MAX_DISPLAY_NAME_LENGTH + 1) }),
    );
    expect(long.fieldErrors.displayName).toBeDefined();
  });
});
