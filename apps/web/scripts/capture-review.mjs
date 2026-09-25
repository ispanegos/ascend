// Captures the Design System V2 review screens (sample content) at 390×844
// and builds one composite: TODAY | QUESTS | ASCEND | STATS | BOSS | WORKOUT.
// Needs a running server with the gallery enabled (next dev, or
// ASCEND_DESIGN_GALLERY=1) and a local athlete to sign in with:
//   REVIEW_EMAIL=… REVIEW_PASSWORD=… node scripts/capture-review.mjs [baseURL]
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = fileURLToPath(new URL("../../../docs/design/review-v2/", import.meta.url));
const screens = [
  ["today", "TODAY"],
  ["quests", "QUESTS"],
  ["ascend", "ASCEND"],
  ["stats", "STATS"],
  ["boss", "BOSS"],
  ["workout", "WORKOUT"],
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(`${base}/sign-in`);
await page.getByLabel("Email").fill(process.env.REVIEW_EMAIL ?? "");
await page.getByLabel("Password").fill(process.env.REVIEW_PASSWORD ?? "");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));

const shots = [];
for (const [screen] of screens) {
  await page.goto(`${base}/design/sample/${screen}`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const path = `${outDir}${screen}.png`;
  await page.screenshot({ path });
  await page.screenshot({ path: `${outDir}${screen}-full.png`, fullPage: true });
  shots.push(path);
}
await browser.close();

// Composite at 1× (390 px per screen) with labels.
const gap = 32;
const top = 64;
const width = screens.length * 390 + (screens.length + 1) * gap;
const height = top + 844 + gap;
const tiles = await Promise.all(shots.map((p) => sharp(p).resize(390, 844).png().toBuffer()));
const labels = screens
  .map(([, label], i) => `<text x="${gap + i * (390 + gap) + 195}" y="42" text-anchor="middle" font-family="Helvetica" font-weight="700" font-size="20" letter-spacing="4" fill="#F3B24F">${label}</text>`)
  .join("");
await sharp({ create: { width, height, channels: 3, background: "#050d12" } })
  .composite([
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${top}">${labels}</svg>`), left: 0, top: 0 },
    ...tiles.map((input, i) => ({ input, left: gap + i * (390 + gap), top })),
  ])
  .png({ compressionLevel: 9 })
  .toFile(`${outDir}composite.png`);
console.log(`wrote ${shots.length} screens and composite.png to docs/design/review-v2/`);
