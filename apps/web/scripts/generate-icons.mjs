// Generates PWA icons from the ASCEND glyph. Run: npm run icons -w @ascend/web
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BRAND = "#173e30";
const ON_BRAND = "#ffffff";
const root = new URL("..", import.meta.url);
const out = (path) => fileURLToPath(new URL(path, root));

// Rising line on brand green — spec §27, not a mountain.
// `inset` is the fraction of the canvas reserved as padding.
function glyph({ rounded, inset }) {
  const s = 512;
  const pad = s * inset;
  const inner = s - pad * 2;
  const p = (x, y) => `${pad + (x / 32) * inner},${pad + (y / 32) * inner}`;
  const stroke = (2.6 / 32) * inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${rounded ? s * 0.22 : 0}" fill="${BRAND}"/>
  <path d="M${p(7.5, 22.5)} L${p(13, 16)} L${p(17, 19.5)} L${p(24.5, 10.5)}"
    fill="none" stroke="${ON_BRAND}" stroke-width="${stroke}"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const standard = glyph({ rounded: true, inset: 0 });
// Maskable icons keep content inside the central 80% safe zone.
const maskable = glyph({ rounded: false, inset: 0.12 });
const fullBleed = glyph({ rounded: false, inset: 0 });

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
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out(path));
  console.log(`wrote ${path}`);
}
