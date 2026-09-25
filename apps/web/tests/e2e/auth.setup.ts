import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { AUTH_DIR, CREDENTIALS, STORAGE_STATE } from "./helpers";
import { completeSpawnBySkipping } from "./spawn-helpers";

/**
 * Creates a fresh athlete through the real sign-up flow (local Supabase has
 * email confirmation disabled) and takes them through Spawn so the shell
 * tests can reach every destination.
 */
setup("sign up a test athlete", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ascend.test`;
  const password = "correct-horse-battery";

  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Athlete");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // A new athlete lands on Spawn, not an empty dashboard (spec §11, §49).
  await expect(page).toHaveURL(/\/spawn\/body\/welcome$/);
  await expect(page.getByRole("heading", { level: 1, name: "Create your athlete profile." })).toBeVisible();

  // The main shell is locked until Spawn and calibration are done (ADR-023 §9).
  setup.setTimeout(180_000);
  await completeSpawnBySkipping(page);

  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(CREDENTIALS, JSON.stringify({ email, password }));
  await page.context().storageState({ path: STORAGE_STATE });
});
