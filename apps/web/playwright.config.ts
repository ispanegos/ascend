import { defineConfig, devices } from "@playwright/test";

/**
 * Responsive E2E suite (spec §55, §71). Runs against a production build and
 * the local Supabase stack (`supabase start`).
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

const chromiumTouch = {
  ...devices["Desktop Chrome"],
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...chromiumTouch, viewport: { width: 390, height: 844 } } },
    ...(
      [
        ["phone-320", { ...chromiumTouch, viewport: { width: 320, height: 640 } }],
        ["phone-390", { ...chromiumTouch, viewport: { width: 390, height: 844 } }],
        ["phone-430", { ...chromiumTouch, viewport: { width: 430, height: 932 } }],
        ["iphone-webkit", { ...devices["iPhone 15"] }],
        ["tablet-768", { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } }],
        ["desktop-1280", { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }],
      ] as const
    ).map(([name, use]) => ({
      name,
      use,
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    })),
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${baseURL}/offline`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
