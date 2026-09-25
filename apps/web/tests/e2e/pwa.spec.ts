import { expect, test } from "@playwright/test";

test.describe("installable PWA shell (spec §41)", () => {
  test("links a valid manifest with installable icons", async ({ page, request }) => {
    await page.goto("/sign-in");
    const href = await page.locator("link[rel='manifest']").getAttribute("href");
    expect(href).toBeTruthy();

    const manifest = (await (await request.get(href!)).json()) as {
      display: string;
      start_url: string;
      icons: Array<{ src: string; sizes: string; purpose?: string }>;
    };
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    for (const icon of manifest.icons) {
      const response = await request.get(icon.src);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
  });

  test("sets viewport-fit=cover for safe areas and a theme colour", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("meta[name='viewport']")).toHaveAttribute(
      "content",
      /viewport-fit=cover/,
    );
    await expect(page.locator("meta[name='theme-color']")).toHaveCount(1);
  });

  test("registers a service worker that controls the page", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "service worker inspection uses Chromium");
    await page.goto("/sign-in");
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.scope;
    });
    expect(scope).toMatch(/\/$/);
  });

  test("serves the offline fallback when the network is gone", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "offline emulation with service workers uses Chromium");
    await page.goto("/sign-in");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Reload once so the worker controls the page.
    await page.reload();
    await context.setOffline(true);
    await page.goto("/stats").catch(() => undefined);
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await context.setOffline(false);
  });

  test("the service worker is never cached by the browser", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});
