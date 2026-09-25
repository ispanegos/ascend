import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, expectTouchTargets } from "./helpers";
import {
  beginSession,
  choose,
  completeOnboarding,
  confirm,
  expectStep,
  openRecording,
  press,
  saveAttempt,
  signIn,
  signUpFresh,
  skipRemaining,
} from "./spawn-helpers";

/**
 * Milestone 2 — the complete first-user Spawn journey (spec §11–§14, §59).
 * The full journey runs at the 390 px design width; layout checks run at
 * every viewport.
 */

const SHOTS = process.env.SPAWN_SCREENSHOTS;

/** Viewport screenshot for the report, after entrance animations settle. */
async function shot(page: Page, name: string) {
  if (!SHOTS || page.viewportSize()?.width !== 390) return;
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe("Spawn journey", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("profile → Spawn Point → Movement → Frame → Engine → Spawn Complete, with resume", async ({ page, browser }, testInfo) => {
    // The design width, plus the narrowest supported width with real numbers on screen.
    test.skip(!["phone-390", "phone-320"].includes(testInfo.project.name), "full journey runs at 390 and 320 px");
    const credentials = await signUpFresh(page);
    await completeOnboarding(page);

    // ---- Spawn Point: everything unranked, no numbers.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every Stat starts unranked.");
    const ladder = page.getByRole("region", { name: "Attributes" });
    await expect(ladder.getByText("Unranked")).toHaveCount(8);
    for (const name of ["Overall", "Endurance", "Strength", "Power", "Core", "Mobility", "Agility", "Recovery"]) {
      await expect(ladder.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.locator("main")).not.toContainText(/\b\d{2}\s*(?:%|\/100)\b/);
    await shot(page, "01-spawn-point");
    await page.getByRole("link", { name: "Begin assessment" }).click();

    // ---- Movement pre-flight
    await expect(page).toHaveURL(/\/spawn\/movement$/);
    await expect(page.getByText("25–30 min")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Safety and stopping" })).toBeVisible();
    await beginSession(page, "Movement");

    // ---- M01: three attempts; resume after reload and after sign-out/in.
    await expect(page).toHaveURL(/\/spawn\/movement\/m01$/);
    await openRecording(page, "Deep Squat", "Record attempts");
    await choose(page, "Depth", "Parallel");
    await choose(page, "Heels", "Grounded");
    await choose(page, "Control", "Stable");
    await saveAttempt(page, "Save attempt 1 of 3", "Attempt 2 of 3");
    await expect(page.getByText("Parallel · Grounded · Stable")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Parallel · Grounded · Stable")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attempt 2 of 3" })).toBeVisible();

    // A new device/browser: sign in and land on the same test and step.
    const other = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const otherPage = await other.newPage();
    await signIn(otherPage, credentials);
    await expect(otherPage).toHaveURL(/\/spawn\/movement\/m01$/);
    await expect(otherPage.getByRole("heading", { name: "Attempt 2 of 3" })).toBeVisible();
    await other.close();

    await choose(page, "Depth", "Below parallel");
    await choose(page, "Heels", "Lifted");
    await choose(page, "Control", "Compensation");
    await saveAttempt(page, "Save attempt 2 of 3", "Attempt 3 of 3");
    await choose(page, "Depth", "Parallel");
    await choose(page, "Heels", "Grounded");
    await choose(page, "Control", "Stable");
    await shot(page, "02-movement-record");
    await saveAttempt(page, "Save attempt 3 of 3");
    await confirm(page, "No");

    // ---- M02: per side; pain → Movement Flag, result kept.
    await expect(page).toHaveURL(/\/spawn\/movement\/m02$/);
    await openRecording(page, "Ankle Wall Test", "Record result");
    await page.getByLabel("Toe-to-wall distance").fill("8.5");
    await saveAttempt(page, "Save left ankle", "Right ankle");
    await page.getByLabel("Toe-to-wall distance").fill("7,5");
    await saveAttempt(page, "Save right ankle");
    await confirm(page, "Yes", "Ankle / foot");

    // ---- M03: can't do it now → skipped with a reason.
    await expect(page).toHaveURL(/\/spawn\/movement\/m03$/);
    await skipRemaining(page, 1);

    // ---- M04: validation, then four timed attempts entered by hand.
    await expect(page).toHaveURL(/\/spawn\/movement\/m04$/);
    await openRecording(page, "Single-Leg Balance", "Record attempts");
    await page.getByLabel("Time balanced, seconds").fill("75");
    await press(page, "Save attempt 1 of 2");
    await expect(page.getByText("Enter a time from 0:00 to 1:00.")).toBeVisible();
    for (const [label, seconds, next] of [
      ["Save attempt 1 of 2", "41.2", "Attempt 1 of 2 · Right leg"],
      ["Save attempt 1 of 2", "33", "Attempt 2 of 2 · Left leg"],
      ["Save attempt 2 of 2", "52,5", "Attempt 2 of 2 · Right leg"],
      ["Save attempt 2 of 2", "60", undefined],
    ] as const) {
      await page.getByLabel("Time balanced, seconds").fill(seconds);
      await saveAttempt(page, label, next);
    }
    await expect(page.getByText("0:52.5")).toBeVisible();
    await confirm(page, "No");

    // ---- M05: signed value.
    await openRecording(page, "Sit & Reach", "Record result");
    await page.getByRole("radio", { name: "Short of toes" }).check();
    await page.getByLabel("Reach relative to your toes").fill("4.5");
    await press(page, "Save reach");
    await expect(page.getByText("-4.5 cm")).toBeVisible();
    await confirm(page, "No");

    // ---- M06
    await openRecording(page, "Dead Bug Control", "Record result");
    await choose(page, "How did the 10 reps per side go?", "Clean");
    await press(page, "Save set");
    await confirm(page, "No");

    // ---- M07
    await openRecording(page, "Controlled Agility Baseline", "Record attempts");
    for (const n of [1, 2, 3]) {
      await page.getByLabel("Time, seconds").fill(`${12 + n}.4`);
      await page.getByLabel("Errors").fill(String(n - 1));
      await choose(page, "Balance loss", "No");
      await saveAttempt(page, `Save attempt ${n} of 3`, n < 3 ? `Attempt ${n + 1} of 3` : undefined);
    }
    await confirm(page, "No");

    // ---- Overview: retry the skipped test, then finish.
    await expect(page).toHaveURL(/\/spawn\/movement$/);
    await page.getByRole("link", { name: /M03 Shoulder Mobility/ }).click();
    await press(page, "Try this test now");
    await openRecording(page, "Shoulder Mobility", "Record result");
    await choose(page, "Hands", "Fingertips touch");
    await saveAttempt(page, "Save left hand on top", "Right hand on top");
    await choose(page, "Hands", "Gap within a hand's length");
    await press(page, "Save right hand on top");
    await confirm(page, "No");
    await expect(page).toHaveURL(/\/spawn\/movement$/);
    await press(page, "Finish Movement");

    // ---- Movement complete: data coverage, not scores.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Movement complete");
    const collected = page.getByRole("region", { name: "Data collected" });
    await expect(collected.getByRole("listitem").filter({ hasText: "Mobility" })).toContainText("Calibration data collected");
    await expect(collected.getByRole("listitem").filter({ hasText: "Agility" })).toContainText("Calibration data collected");
    await expect(collected.getByRole("listitem").filter({ hasText: "Core" })).toContainText("Partially assessed");
    await expect(page.getByText("1 Movement Flag recorded.")).toBeVisible();
    await expect(page.getByText("The Frame", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Continue to The Frame" }).click();

    // ---- The Frame
    await expect(page).toHaveURL(/\/spawn\/frame$/);
    await expect(page.getByText("40–50 min")).toBeVisible();
    await beginSession(page, "The Frame");

    // F01 incline push-ups: the incline height is required.
    await openRecording(page, "Push", "Record result");
    await choose(page, "Push-up type", "Incline");
    await page.getByLabel("Clean reps").fill("14");
    await choose(page, "Effort (RPE)", "7");
    await choose(page, "Technique", "Clean");
    await choose(page, "What stopped the set?", "Technique changed");
    await press(page, "Save set");
    await expect(page.getByLabel("Hand height")).toBeVisible();
    await page.getByLabel("Hand height").fill("45");
    await press(page, "Save set");
    await confirm(page, "No");

    // F02 goblet squat: loads come from the equipment list.
    await openRecording(page, "Goblet Squat", "Record attempts");
    await choose(page, "Kettlebells", "12 kg");
    await page.getByLabel("Clean reps").fill("10");
    await choose(page, "Effort (RPE)", "5");
    await choose(page, "Technique", "Clean");
    await shot(page, "03-frame-record");
    await press(page, "Save set 1");
    await press(page, "Add another set");
    await choose(page, "Kettlebells", "16 kg");
    await page.getByLabel("Clean reps").fill("10");
    await choose(page, "Effort (RPE)", "8");
    await choose(page, "Technique", "Minor compensation");
    await press(page, "Save set 2");
    await press(page, "Review and confirm");
    await choose(page, "Why did you stop adding load?", "Effort got high");
    await choose(page, "Any pain during this test?", "No");
    await press(page, "Confirm result");

    // F03 hinge with two kettlebells: total load is shown.
    await openRecording(page, "Hinge", "Record attempts");
    await choose(page, "Weights held", "Two");
    await choose(page, "Kettlebells", "16 kg");
    await expect(page.getByText("2 × 16 = 32 kg")).toBeVisible();
    await page.getByLabel("Clean reps").fill("10");
    await choose(page, "Effort (RPE)", "6");
    await choose(page, "Technique", "Clean");
    await press(page, "Save set 1");
    await press(page, "Review and confirm");
    await choose(page, "Why did you stop adding load?", "Nothing — no heavier weight available");
    await choose(page, "Any pain during this test?", "No");
    await press(page, "Confirm result");

    // F04 cannot perform → reason stored.
    await expect(page).toHaveURL(/\/spawn\/frame\/f04$/);
    await press(page, "I can't do this test");
    await page.getByRole("dialog").getByRole("radio", { name: "Missing equipment" }).check();
    await page.getByRole("dialog").getByRole("button", { name: "Skip for now" }).click();

    // F05 farmer carry: pain named as the limit forces the flag on.
    await expect(page).toHaveURL(/\/spawn\/frame\/f05$/);
    await openRecording(page, "Farmer Carry", "Record result");
    await choose(page, "Kettlebells", "20 kg");
    await page.getByLabel("Duration, seconds").fill("48");
    await choose(page, "Effort (RPE)", "8");
    await choose(page, "What ended the carry?", "Pain");
    await press(page, "Save carry");
    await press(page, "Review and confirm");
    await expect(page.getByText("You named pain as a limit")).toBeVisible();
    await press(page, "Confirm result");

    // F06 plank: stopped mid-test for pain → no result, flag.
    await openRecording(page, "Plank", "Record result");
    await press(page, "Stop test");
    await page.getByRole("dialog").getByRole("radio", { name: "Pain" }).check();
    await page.getByRole("dialog").getByRole("radio", { name: "Lower back" }).check();
    await page.getByRole("dialog").getByRole("button", { name: "Stop test" }).click();
    await expect(page).toHaveURL(/\/spawn\/frame$/);
    await press(page, "Finish The Frame");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Frame complete");
    await expect(page.getByText("2 Movement Flags recorded.")).toBeVisible();
    await page.getByRole("link", { name: "Continue to The Engine" }).click();

    // ---- The Engine (manual entry, no wearable).
    await beginSession(page, "The Engine");
    await openRecording(page, "Resting Baseline", "Record result");
    await page.getByLabel("Average heart rate (optional)").fill("64");
    await press(page, "Save reading");
    await confirm(page, "No");

    await openRecording(page, "6-Minute Brisk Walk", "Record result");
    await page.getByLabel("Distance").fill("612");
    await expect(page.getByLabel("Walking time, minutes")).toHaveValue("6");
    await page.getByLabel("Average heart rate (optional)").fill("118");
    await page.getByLabel("Maximum heart rate (optional)").fill("104");
    await press(page, "Save walk");
    await expect(page.getByText("Maximum heart rate can't be lower than the average.")).toBeVisible();
    await page.getByLabel("Maximum heart rate (optional)").fill("131");
    await press(page, "Save walk");
    await confirm(page, "No");

    await openRecording(page, "Heart-Rate Recovery", "Record result");
    await page.getByLabel("At stop").fill("131");
    await page.getByLabel("After 1 minute").fill("112");
    await page.getByLabel("After 2 minutes").fill("98");
    await press(page, "Save readings");
    await confirm(page, "No");

    await openRecording(page, "20-Minute Run/Walk", "Record result");
    await page.getByLabel("Total distance").fill("2840");
    await page.getByLabel("Time running, minutes").fill("12");
    await page.getByLabel("Time walking, minutes").fill("8");
    await choose(page, "Effort (RPE)", "7");
    await choose(page, "What limited you?", "Breath");
    await shot(page, "04-engine-record");
    await press(page, "Save run/walk");
    await confirm(page, "No");

    await expect(page).toHaveURL(/\/spawn\/engine$/);
    await press(page, "Finish The Engine");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Engine complete");
    await page.getByRole("link", { name: "Continue" }).click();

    // ---- Spawn Complete: no invented Stats.
    await expect(page).toHaveURL(/\/spawn\/complete$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Athlete data collected.");
    const final = page.getByRole("region", { name: "Data collected" });
    await expect(final.getByRole("listitem").filter({ hasText: "Power" })).toContainText("Not assessed in Spawn");
    await expect(final.getByRole("listitem").filter({ hasText: "Endurance" })).toContainText("Data collected");
    await shot(page, "05-spawn-complete");
    // ---- Initialize: the real engine runs on the raw evidence.
    if (SHOTS) {
      // Hold the server action briefly so the initializing screen can be captured.
      await page.route("**/spawn/complete", async (route) => {
        if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });
    }
    await press(page, "Initialize athlete profile");
    await expect(page.getByText("Initializing.")).toBeVisible();
    await shot(page, "06-initializing");
    await expect(page.getByRole("heading", { level: 1, name: "Initialized." })).toBeVisible({ timeout: 20_000 });
    await page.unrouteAll();

    const statList = page.getByRole("region", { name: "Athlete Stats" });
    await expect(statList.getByRole("link", { name: /^Power\s*—\s*Unranked/ })).toBeVisible();
    for (const name of ["Endurance", "Strength", "Core", "Mobility", "Agility"]) {
      // Rounded integer + real (capped) Confidence; never a decimal, never verified by Spawn alone.
      const row = statList.getByRole("link", { name: new RegExp(`^${name}\\s*\\d{1,3}\\s*Confidence \\d{1,2}%$`) });
      await expect(row).toBeVisible();
      const percent = Number((await row.textContent())?.match(/Confidence (\d+)%/)?.[1]);
      expect(percent).toBeLessThanOrEqual(69);
    }
    await expect(statList.getByText("Provisional", { exact: true })).toBeVisible(); // Overall
    await expect(statList).not.toContainText(/\d\.\d/); // integers only; decimals stay internal
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);
    await expect(page.getByText(/provisional calibration/)).toBeVisible();
    await shot(page, "07-initialized");

    // Stat detail foundation: Current, Peak, Confidence, why, evidence.
    await statList.getByRole("link", { name: /^Endurance/ }).click();
    await expect(page).toHaveURL(/\/stats\/endurance$/);
    await expect(page.getByRole("heading", { level: 1, name: "Endurance" })).toBeVisible();
    await expect(page.getByText("Not verified yet", { exact: true })).toBeVisible();
    await expect(page.getByText(/can become verified after an independent result on a later day/)).toBeVisible();
    await expect(page.getByText("Pace distance")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Spawn · E04" })).toContainText("20-Minute Run/Walk");
    await expectNoHorizontalOverflow(page);
    await shot(page, "08-stat-detail");

    // The shell is unlocked; root resumes at Today.
    await page.goto("/");
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await page.goto("/spawn/movement/m01");
    await expect(page.getByText("Recorded", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try this test now" })).toHaveCount(0);
  });
});

test.describe("onboarding resume and validation", () => {
  test("the main shell is locked during Spawn; Profile stays reachable", async ({ page }) => {
    await signUpFresh(page, "Locked Athlete");
    for (const path of ["/today", "/stats", "/ascend", "/bosses", "/stats/strength"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/spawn\/body\/welcome$/);
    }
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to Spawn" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("an under-18 date of birth is refused (ADR-023)", async ({ page }) => {
    await signUpFresh(page, "Young Athlete");
    await press(page, "Create profile");
    await press(page, "Continue");
    const year = new Date().getFullYear() - 17;
    await page.getByLabel("Date of birth").fill(`${year}-01-01`);
    await press(page, "Continue");
    await expect(page.getByText("ASCEND v0.1 is for athletes aged 18 and over.")).toBeVisible();
  });

  test("an unusual weight needs confirmation and is never changed", async ({ page }) => {
    await signUpFresh(page, "Heavy Athlete");
    await press(page, "Create profile");
    await press(page, "Continue");
    await page.getByLabel("Date of birth").fill("1985-03-03");
    await press(page, "Continue");
    await page.getByRole("radio", { name: "Prefer not to say" }).check();
    await press(page, "Continue");
    await page.getByLabel("Height").fill("190");
    await press(page, "Continue");
    await page.getByLabel("Weight").fill("228");
    await press(page, "Continue");
    await expect(page.getByText("228 kg is unusual.", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Weight")).toHaveValue("228");
    await press(page, "Yes, that's correct");
    await expectStep(page, "body-fat");
  });

  test("resumes at the last onboarding step after reload and sign-in", async ({ page }) => {
    const credentials = await signUpFresh(page, "Resume Athlete");
    await press(page, "Create profile");
    await press(page, "Continue");
    await page.getByLabel("Date of birth").fill("1988-02-29");
    await press(page, "Continue");
    await page.getByRole("radio", { name: "Female" }).check();
    await press(page, "Continue");
    await expectStep(page, "height");

    // Implausible input is rejected, not clamped.
    await page.getByLabel("Height").fill("18");
    await press(page, "Continue");
    await expect(page.getByText("Enter a value from 100 cm to 250 cm.")).toBeVisible();
    await expect(page.getByLabel("Height")).toHaveValue("18");

    await page.goto("/");
    await expectStep(page, "height");

    await page.context().clearCookies();
    await signIn(page, credentials);
    await expectStep(page, "height");
  });
});

test.describe("Spawn screens fit every viewport", () => {
  test("welcome, onboarding and Spawn Point", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpFresh(page, "Layout Athlete");
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);
    const cta = page.getByRole("button", { name: "Create profile" });
    const box = await cta.boundingBox();
    // Spec §26: the primary CTA sits in the lower part of the viewport.
    expect(box!.y).toBeGreaterThan(page.viewportSize()!.height / 2);

    await completeOnboarding(page);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);

    await page.goto("/spawn/body/availability");
    await expect(page).toHaveURL(/\/spawn$/); // context done: onboarding screens redirect

    await page.goto("/profile/edit/availability");
    await page.getByRole("button", { name: "Set a time window" }).first().click();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);
    await expect(page.getByLabel("From").first()).toHaveCSS("font-size", "16px");

    await page.goto("/spawn/movement");
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);
    await beginSession(page, "Movement");
    await openRecording(page, "Deep Squat", "Record attempts");
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);
  });
});
