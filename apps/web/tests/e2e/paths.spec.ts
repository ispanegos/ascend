import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, expectTouchTargets } from "./helpers";
import { completeSpawnBySkipping, signUpFresh } from "./spawn-helpers";

/**
 * Milestone 4 — Paths (spec §18, ADR-040/041). Each test uses a fresh athlete
 * so Path history is never written concurrently by parallel projects.
 * The athlete skips every Spawn test, so every Stat is Unranked — which also
 * proves an Unranked attribute can be chosen without being ranked.
 */

async function freshInitializedAthlete(page: Page) {
  await signUpFresh(page, "Morgan Vale");
  await completeSpawnBySkipping(page);
}

async function choose(page: Page, attribute: string, priority: "Off" | "Primary" | "Secondary") {
  await page
    .getByRole("group", { name: `${attribute} priority`, exact: true })
    .getByRole("radio", { name: priority, exact: true })
    .check();
}

test.describe("Paths", () => {
  test.describe.configure({ mode: "serial" });
  // A fresh athlete walks the whole Spawn; under a full parallel run that can take minutes.
  test.setTimeout(360_000);

  test("select, change, clear — history is kept and Stats never change", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone-390", "the Path flow runs at the 390 px design width");
    await freshInitializedAthlete(page);

    // Before Paths: Today makes the next action obvious.
    await page.goto("/today");
    await expect(page.getByText("Current objective")).toBeVisible();
    await expect(page.getByRole("link", { name: "Choose your paths" })).toBeVisible();

    await page.goto("/ascend/paths");
    await expect(page.getByRole("heading", { level: 1, name: "Choose your paths" })).toBeVisible();
    // Too little evidence to compare: the engine says so instead of guessing.
    await expect(page.getByText(/needs at least 3 to suggest a PRIMARY Path/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);

    // 1 PRIMARY + 2 SECONDARY, one of them Unranked.
    await choose(page, "Endurance", "Primary");
    await choose(page, "Power", "Secondary");
    await expect(page.getByText(/ASCEND has no evidence for Power yet/)).toBeVisible();
    await choose(page, "Core", "Secondary");
    await expect(page.getByText("3 / 3")).toBeVisible();

    // A third SECONDARY is refused.
    await page.getByRole("group", { name: "Agility priority", exact: true }).getByRole("radio", { name: "Secondary", exact: true }).click();
    await expect(page.getByText("Up to two SECONDARY Paths.")).toBeVisible();
    await expect(page.getByRole("group", { name: "Agility priority" }).getByRole("radio", { name: "Off" })).toBeChecked();

    await page.getByRole("button", { name: "Save paths" }).click();
    await expect(page.getByText("Paths saved. Your Stats are unchanged.")).toBeVisible();

    // Today and Ascend reflect the real configuration; no Quests are invented.
    await page.goto("/today");
    const direction = page.getByRole("region", { name: "Your direction" });
    await expect(direction).toContainText("EndurancePrimary");
    await expect(direction).toContainText("Training generation is the next stage");
    await expect(page.getByText("Today's Quest")).toHaveCount(0);
    await page.goto("/ascend");
    await expect(page.getByText("Your Paths are set")).toBeVisible();
    await expect(page.getByText("Next stage · not open yet")).toBeVisible();

    // Change: Strength becomes PRIMARY, Endurance is released.
    await page.goto("/ascend/paths");
    await choose(page, "Strength", "Primary");
    await expect(page.getByText("Endurance is no longer PRIMARY.")).toBeVisible();
    await page.getByRole("button", { name: "Save paths" }).click();
    await expect(page.getByText("Paths saved. Your Stats are unchanged.")).toBeVisible();

    // History keeps both configurations.
    await page.reload();
    const history = page.getByRole("region", { name: "Path history" });
    await expect(history).toContainText("Strength activated as PRIMARY");
    await expect(history).toContainText("Endurance deactivated");
    await expect(history).toContainText("Endurance activated as PRIMARY");

    // Clear every Path: allowed, and recorded.
    await page.getByRole("button", { name: "Clear all paths" }).click();
    await expect(page.getByText("Paths saved. Your Stats are unchanged.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("0 / 3")).toBeVisible();
    await expect(page.getByRole("region", { name: "Path history" })).toContainText("Strength deactivated");

    // Stats are untouched: Power is still Unranked, never 0.
    await page.goto("/stats");
    await expect(page.getByRole("link", { name: /^Power\s*—\s*Unranked/ })).toBeVisible();
    await page.goto("/stats/power");
    await expect(page.getByText(/Nothing is plotted until evidence ranks it/)).toBeVisible();
  });
});
