import { expect, type Page } from "@playwright/test";

/** Helpers for the Spawn E2E suite. Every flow uses a fresh athlete. */

export interface Credentials {
  email: string;
  password: string;
}

export async function signUpFresh(page: Page, name = "Spawn Athlete"): Promise<Credentials> {
  const email = `spawn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ascend.test`;
  const password = "correct-horse-battery";
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/spawn\/body\/welcome$/);
  return { email, password };
}

export async function signIn(page: Page, { email, password }: Credentials) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Selects a radio chip inside a named group (fieldset legend). */
export async function choose(page: Page, group: string, option: string) {
  await page.getByRole("group", { name: group, exact: true }).getByRole("radio", { name: option, exact: true }).check();
}

/** Selects checkbox chips inside a named group. */
export async function tick(page: Page, group: string, ...options: string[]) {
  const scope = page.getByRole("group", { name: group, exact: true });
  for (const option of options) await scope.getByRole("checkbox", { name: option, exact: true }).check();
}

export async function press(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name, exact: typeof name === "string" }).click();
}

export async function expectStep(page: Page, step: string) {
  await expect(page).toHaveURL(new RegExp(`/spawn/body/${step}(\\?.*)?$`));
}

/** Walks the whole Spawn 0 onboarding with realistic input. */
export async function completeOnboarding(page: Page) {
  await page.goto("/spawn/body/welcome");
  await press(page, "Create profile");
  await expectStep(page, "name");
  await press(page, "Continue");

  await expectStep(page, "birth");
  await page.getByLabel("Date of birth").fill("1990-05-14");
  await press(page, "Continue");

  await expectStep(page, "sex");
  await page.getByRole("radio", { name: "Prefer not to say" }).check();
  await press(page, "Continue");

  await expectStep(page, "height");
  await page.getByLabel("Height").fill("182.5");
  await press(page, "Continue");

  await expectStep(page, "weight");
  // Decimal comma, as an Italian iOS keyboard types it.
  await page.getByLabel("Weight").fill("96,4");
  await press(page, "Continue");

  await expectStep(page, "body-fat");
  await press(page, "Skip");
  await expectStep(page, "measurements");
  await page.getByLabel("Waist").fill("101");
  await press(page, "Continue");

  await expectStep(page, "experience");
  await page.getByRole("radio", { name: "Recreational" }).check();
  await press(page, "Continue");

  await expectStep(page, "activity");
  await page.getByRole("radio", { name: "More than a year off" }).check();
  await press(page, "Continue");

  await expectStep(page, "equipment");
  await tick(page, "Free weights", "Kettlebells");
  await tick(page, "Accessories", "Exercise mat");
  await press(page, "Continue");

  await expectStep(page, "loads");
  await tick(page, "Kettlebells", "12 kg", "16 kg", "20 kg");
  await page.getByLabel("Add a kettlebell weight").fill("18");
  await press(page, "Add");
  await press(page, "Continue");

  await expectStep(page, "environments");
  await tick(page, "Environments", "Road", "Flat paths");
  await press(page, "Continue");

  await expectStep(page, "availability");
  await page.getByRole("switch", { name: "Monday" }).click();
  await choose(page, "Monday: longest session", "60 min");
  await page.getByRole("switch", { name: "Wednesday" }).click();
  await choose(page, "Wednesday: longest session", "45 min");
  await press(page, "Continue");

  await expectStep(page, "schedule");
  await press(page, "Skip");
  await expectStep(page, "sources");
  await tick(page, "Devices and data sources", "Apple Watch");
  await press(page, "Continue");

  await expectStep(page, "limitations");
  await press(page, "Continue");

  await expectStep(page, "review");
  await expect(page.getByText("96.4 kg")).toBeVisible();
  await press(page, "Continue to Spawn Point");
  await expect(page).toHaveURL(/\/spawn$/);
}

/** Opens a session's pre-flight, confirms safety and begins it. */
export async function beginSession(page: Page, title: string) {
  await page.getByRole("checkbox", { name: /I've read this/ }).check();
  await press(page, `Begin ${title}`);
}

/** Intro → execute → record. */
export async function openRecording(page: Page, testName: string, record: "Record attempts" | "Record result") {
  await expect(page.getByRole("heading", { level: 1, name: testName })).toBeVisible();
  await press(page, `Begin ${testName}`);
  await expect(page).toHaveURL(/\?step=execute$/);
  await press(page, record);
  await expect(page).toHaveURL(/\?step=record$/);
}

/** Record → confirm with a pain answer. */
export async function confirm(page: Page, pain: "No" | "Yes" = "No", location?: string) {
  await press(page, "Review and confirm");
  await expect(page).toHaveURL(/\?step=confirm$/);
  if (pain === "Yes" || pain === "No") {
    const group = page.getByRole("group", { name: "Any pain during this test?" });
    if (await group.count()) await group.getByRole("radio", { name: pain, exact: true }).check();
  }
  if (location) await choose(page, "Where? (optional)", location);
  await press(page, "Confirm result");
}

/** Resolves every remaining test of the open session with "Missing equipment". */
export async function skipRemaining(page: Page, count: number) {
  for (let i = 0; i < count; i += 1) {
    const heading = await page.getByRole("heading", { level: 1 }).textContent();
    await press(page, "I can't do this test");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Missing equipment" }).check();
    await dialog.getByRole("button", { name: "Skip for now" }).click();
    // Wait until the next screen has actually rendered, not just the URL.
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(heading ?? "");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
}

/** Saves the current attempt and waits until the next one is on screen. */
export async function saveAttempt(page: Page, button: string, next?: string) {
  await press(page, button);
  if (next) await expect(page.getByRole("heading", { name: next, exact: true })).toBeVisible();
  else await expect(page.getByRole("button", { name: "Review and confirm" })).toBeVisible();
}

/** Begins a session and skips every test, then finishes it. */
export async function finishSessionBySkipping(page: Page, title: string, tests: number) {
  await beginSession(page, title);
  await skipRemaining(page, tests);
  await press(page, `Finish ${title}`);
  await expect(page.getByRole("heading", { level: 1, name: `${title} complete` })).toBeVisible();
}

/**
 * Fastest honest path to an initialized athlete: real onboarding, every test
 * skipped with a reason, then initialization. All Stats stay unranked.
 */
export async function completeSpawnBySkipping(page: Page) {
  await completeOnboarding(page);
  await page.getByRole("link", { name: "Begin assessment" }).click();
  await finishSessionBySkipping(page, "Movement", 7);
  await page.getByRole("link", { name: "Continue to The Frame" }).click();
  await finishSessionBySkipping(page, "The Frame", 6);
  await page.getByRole("link", { name: "Continue to The Engine" }).click();
  await finishSessionBySkipping(page, "The Engine", 4);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await press(page, "Initialize athlete profile");
  await expect(page.getByRole("heading", { level: 1, name: "Initialized." })).toBeVisible({ timeout: 20_000 });
}
