// Generates PWA icons from the ASCEND gate rune (Design System V2 §10).
// Run: npm run icons -w @ascend/web
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PIXEL_ICONS } from "../components/ui/pixel-icons.ts";

const BG = "#07141b";
const GOLD = "#f3b24f";
const CREAM = "#f2e3c2";
const root = new URL("..", import.meta.url);
const out = (path) => fileURLToPath(new URL(path, root));

/** The gate rune as crisp pixels; `inset` is the fraction reserved as padding. */
function glyph({ rounded, inset }) {
  const s = 512;
  const pad = s * inset;
  const cell = (s - pad * 2) / 16;
  let rects = "";
  PIXEL_ICONS.ascend.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const [fill, opacity] = ch === "h" ? [CREAM, 0.92] : [GOLD, ch === "f" ? 0.42 : 1];
      rects += `<rect x="${pad + x * cell}" y="${pad + y * cell}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${fill}" fill-opacity="${opacity}"/>`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges">
  <rect width="${s}" height="${s}" rx="${rounded ? s * 0.22 : 0}" fill="${BG}"/>
  ${rects}
</svg>`;
}

const standard = glyph({ rounded: true, inset: 0.16 });
// Maskable icons keep content inside the central 80% safe zone.
const maskable = glyph({ rounded: false, inset: 0.24 });
const fullBleed = glyph({ rounded: false, inset: 0.16 });

await mkdir(out("public/icons"), { recursive: true });
await writeFile(out("app/icon.svg"), standard);

const jobs = [
  [standard, "public/icons/icon-192.png", 192],
  [standard, "public/icons/icon-512.png", 512],
  [maskable, "public/icons/maskable-512.png", 512],
  // iOS applies its own rounding.
  [fullBleed, "app/apple-icon.png", 180],
];

for (const [svg, path, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size, { kernel: "nearest" }).png().toFile(out(path));
  console.log(`wrote ${path}`);
}
