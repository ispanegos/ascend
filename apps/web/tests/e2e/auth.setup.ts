import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { AUTH_DIR, CREDENTIALS, STORAGE_STATE } from "./helpers";

/**
 * Creates a fresh athlete through the real sign-up flow. Local Supabase has
 * email confirmation disabled, so sign-up returns a session immediately.
 */
setup("sign up a test athlete", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ascend.test`;
  const password = "correct-horse-battery";

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Athlete");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(CREDENTIALS, JSON.stringify({ email, password }));
  await page.context().storageState({ path: STORAGE_STATE });
});
