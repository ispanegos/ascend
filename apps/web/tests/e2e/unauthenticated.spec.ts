import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CREDENTIALS, expectNoHorizontalOverflow, expectTouchTargets } from "./helpers";

test.describe("signed out", () => {
  test("root redirects to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("protected routes redirect to sign-in and remember the destination", async ({ page }) => {
    await page.goto("/stats");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fstats$/);
  });

  test("sign-in screen fits the viewport with the CTA in the thumb zone", async ({ page }) => {
    await page.goto("/sign-in");
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);

    const cta = page.getByRole("button", { name: "Sign in" });
    const box = await cta.boundingBox();
    const viewport = page.viewportSize();
    expect(box && viewport).toBeTruthy();
    // Spec §26: the primary CTA sits in the lower portion of the viewport.
    expect(box!.y).toBeGreaterThan(viewport!.height / 2);
    await expect(page.getByLabel("Email")).toHaveCSS("font-size", "16px");
  });

  test("sign-up screen fits the viewport", async ({ page }) => {
    await page.goto("/sign-up");
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page);
  });

  test("wrong password shows a single generic error and keeps the email", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("nobody@ascend.test");
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Next.js renders its own empty role=alert route announcer; target ours.
    const alert = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(alert).toHaveText("Email or password is incorrect.");
    await expect(page.getByLabel("Email")).toHaveValue("nobody@ascend.test");
  });

  test("signing in returns to the requested destination", async ({ page }) => {
    const { email, password } = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as {
      email: string;
      password: string;
    };
    await page.goto("/bosses");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/bosses$/);
    await expect(page.getByRole("heading", { level: 1, name: "Bosses" })).toBeVisible();
  });
});
