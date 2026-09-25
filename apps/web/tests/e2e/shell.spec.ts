import { expect, test } from "@playwright/test";
import {
  DESTINATIONS,
  STORAGE_STATE,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./helpers";

test.use({ storageState: STORAGE_STATE });

test.describe("authenticated shell", () => {
  for (const destination of DESTINATIONS) {
    test(`${destination.label} renders cleanly`, async ({ page }) => {
      await page.goto(destination.path);
      await expect(
        page.getByRole("heading", { level: 1, name: destination.label }),
      ).toBeVisible();

      const nav = page.getByRole("navigation", { name: "Primary" });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link", { name: destination.label })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(nav.locator("[aria-current='page']")).toHaveCount(1);

      await expectNoHorizontalOverflow(page);
      await expectTouchTargets(page);
    });
  }

  test("Stat detail and paths fit the viewport", async ({ page }) => {
    for (const path of ["/stats/strength", "/stats/power", "/ascend/paths", "/spawn/complete", "/bosses"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectTouchTargets(page);
    }
  });

  test("bottom navigation moves between all destinations", async ({ page }) => {
    await page.goto("/today");
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const destination of [...DESTINATIONS.slice(1), DESTINATIONS[0]]) {
      await nav.getByRole("link", { name: destination.label }).click();
      await expect(page).toHaveURL(new RegExp(`${destination.path}$`));
      await expect(
        page.getByRole("heading", { level: 1, name: destination.label }),
      ).toBeVisible();
    }
  });

  test("bottom navigation never covers the end of the page", async ({ page }) => {
    await page.goto("/profile");
    const signOut = page.getByRole("button", { name: "Sign out" });
    // Wait for the streamed page before measuring the end of it.
    await expect(signOut).toBeAttached();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => window.scrollY + window.innerHeight >= document.body.scrollHeight - 2);
    const nav = page.getByRole("navigation", { name: "Primary" });
    const [buttonBox, navBox] = await Promise.all([signOut.boundingBox(), nav.boundingBox()]);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
  });

  test("signed-in, initialized athletes are sent from sign-in to Today", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/today$/);
  });

  test("profile reads the athlete's own row through RLS", async ({ page }) => {
    await page.goto("/profile");
    const account = page.getByRole("region", { name: "Account" });
    await expect(account).toContainText("E2E Athlete");
    await expect(account).toContainText("@ascend.test");
    await expect(account).toContainText("Metric");
  });

  test("keyboard users can skip to content and see focus", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop requirement (spec §40)");
    await page.goto("/today");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
  });
});

test.describe("sign out", () => {
  // Uses its own session so other tests keep theirs.
  test("ends the session and protects routes again", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE });
    const page = await context.newPage();
    await page.goto("/profile");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Ftoday$/);
    await context.close();
  });
});
