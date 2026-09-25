// Generates ASCEND's detailed pixel icons (Design System V2 §10, pass 2).
// Run: npm run pixel-icons -w @ascend/web
//
// Each icon is drawn as vector layers, rasterised onto a 24×24 (or 32×32)
// grid, then shaded like hand-made pixel art:
//   o  outline — 1px rim around the whole silhouette, and `detail` lines
//   f  base    — the icon colour
//   s  shade   — bottom/right inner edge
//   l  light   — top/left inner edge (soft bevel)
//   h  highlight — explicit `light` layer (glints, glows, lit windows)
// Output: components/ui/pixel-icons-hd.ts (generated, do not edit by hand).
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const out = fileURLToPath(new URL("../components/ui/pixel-icons-hd.ts", import.meta.url));

const shield = "M12 2 L20.5 5 L20.5 11 C20.5 16.5 16.8 20.2 12 22 C7.2 20.2 3.5 16.5 3.5 11 L3.5 5 Z";

/** name → { size, base, detail, light } as SVG fragments in a size×size viewBox. */
const ICONS = {
  endurance: {
    base: `<rect x="11" y="1.5" width="2" height="8"/>
      <path d="M10.6 7.2 C7.5 5.2 3.6 7.4 3.3 12.4 C3 17.4 4.2 20.8 7.2 20.8 C9.6 20.8 10.6 19.2 10.6 16 Z"/>
      <path d="M13.4 7.2 C16.5 5.2 20.4 7.4 20.7 12.4 C21 17.4 19.8 20.8 16.8 20.8 C14.4 20.8 13.4 19.2 13.4 16 Z"/>`,
    detail: `<path d="M12 9.5 L8.6 12.2 L7.4 15.6 M12 9.5 L15.4 12.2 L16.6 15.6" fill="none" stroke="#000" stroke-width="1.1"/>`,
    light: `<ellipse cx="5.8" cy="11.4" rx="1" ry="2"/><ellipse cx="15.6" cy="10.4" rx=".9" ry="1.4"/>`,
  },
  strength: {
    base: `<rect x="2" y="11" width="20" height="2"/>
      <rect x="3.5" y="5.5" width="3.5" height="13" rx=".6"/><rect x="7" y="7.5" width="2.2" height="9"/>
      <rect x="17" y="5.5" width="3.5" height="13" rx=".6"/><rect x="14.8" y="7.5" width="2.2" height="9"/>
      <rect x="1" y="10" width="1.5" height="4"/><rect x="21.5" y="10" width="1.5" height="4"/>`,
    detail: `<rect x="5.2" y="7" width=".9" height="10"/><rect x="17.9" y="7" width=".9" height="10"/>
      <rect x="10.5" y="11" width=".8" height="2"/><rect x="12.7" y="11" width=".8" height="2"/>`,
    light: `<rect x="4" y="6.5" width="1" height="4"/><rect x="17.4" y="6.5" width="1" height="4"/>`,
  },
  power: {
    base: `<polygon points="14.2,1.5 4.8,13.2 11,13.2 9,22.6 19.6,10 13.2,10 15.8,1.5"/>`,
    detail: ``,
    light: `<path d="M13.8 3.6 L7.6 11.8" fill="none" stroke="#000" stroke-width="1.3"/><rect x="11.6" y="12.4" width="1.6" height="1.2"/>`,
  },
  core: {
    base: `<path d="${shield}"/>`,
    detail: `<rect x="8" y="7" width="8" height="1"/><rect x="11.5" y="7" width="1" height="11"/>
      <rect x="8.8" y="10.4" width="6.4" height="1"/><rect x="9.4" y="13.6" width="5.2" height="1"/>`,
    light: `<path d="M5 5.8 L5 11 C5 13.8 6 16 7.6 17.6" fill="none" stroke="#000" stroke-width="1"/>`,
  },
  mobility: {
    base: `<path d="M4.6 13.6 A7.6 7.6 0 1 1 18.4 8.6" fill="none" stroke="#000" stroke-width="2.6"/>
      <polygon points="15.6,8 21.4,8 18.4,12.2"/>
      <path d="M11 15 L6 21.2 M11 15 L17 20.6" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="11" cy="15" r="2.6"/>`,
    detail: `<circle cx="11" cy="15" r=".9"/>`,
    light: `<rect x="9.8" y="13.2" width="1.2" height="1.2"/><rect x="7" y="4.6" width="2" height="1"/>`,
  },
  agility: {
    base: `<circle cx="15.6" cy="3.8" r="2.3"/>
      <path d="M14 7.2 L11.4 13.2 M13.6 8 L9.4 9.6 L8 12.4 M13.6 8 L17.2 10.6 L19.8 9.2 M11.4 13.2 L15 16 L14 21.6 M11.4 13.2 L8.4 17 L4.2 17.6"
        fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    detail: ``,
    light: `<rect x="1" y="7" width="4" height="1"/><rect x="2" y="10.5" width="3" height="1"/><rect x="0.5" y="14" width="3" height="1"/>
      <rect x="14.6" y="2.6" width="1.2" height="1.2"/>`,
  },
  recovery: {
    base: `<defs><mask id="c"><rect width="24" height="24" fill="#fff"/><circle cx="15.2" cy="9" r="7.2" fill="#000"/></mask></defs>
      <circle cx="11" cy="12.6" r="8.6" mask="url(#c)"/>`,
    detail: `<circle cx="6.4" cy="15.4" r=".9"/><circle cx="9.4" cy="19" r=".8"/>`,
    light: `<path d="M19 13.2 h2 M20 12.2 v2" stroke="#000" stroke-width="1"/><path d="M19.5 3 h3 M21 1.5 v3" stroke="#000" stroke-width="1"/>
      <path d="M4.2 9 C4 11 4.2 13 5 14.6" fill="none" stroke="#000" stroke-width="1"/>`,
  },
  overall: {
    base: `<polygon points="12,1.5 21.5,12 12,22.5 2.5,12"/>`,
    detail: `<polygon points="12,6.2 16.8,12 12,17.8 7.2,12" fill="none" stroke="#000" stroke-width="1"/>`,
    light: `<polygon points="12,3.2 4.6,12 7,12 12,6.4"/><rect x="11.4" y="11.4" width="1.2" height="1.2"/>`,
  },
  quest: {
    base: `<rect x="5" y="5" width="14" height="14"/><rect x="3" y="3" width="18" height="3.6" rx="1.6"/><rect x="3" y="17.4" width="18" height="3.6" rx="1.6"/>`,
    detail: `<rect x="7.4" y="8.6" width="9.2" height="1"/><rect x="7.4" y="11" width="7" height="1"/><rect x="7.4" y="13.4" width="8" height="1"/>
      <circle cx="16.2" cy="15.2" r="1.4"/>`,
    light: `<rect x="4.2" y="3.8" width="14" height="1"/><rect x="4.2" y="18.2" width="14" height="1"/>`,
  },
  boss: {
    base: `<path d="M5 10 C5 5.5 8 3 12 3 C16 3 19 5.5 19 10 L19 17 L16 21 L8 21 L5 17 Z"/>
      <path d="M5.8 8.2 L1.4 2.2 L3.2 10 Z"/><path d="M18.2 8.2 L22.6 2.2 L20.8 10 Z"/>`,
    detail: `<rect x="6.4" y="11" width="11.2" height="2.2"/><rect x="11.5" y="11" width="1" height="7.5"/>
      <rect x="8.6" y="15.6" width="1" height="3"/><rect x="14.4" y="15.6" width="1" height="3"/>`,
    light: `<rect x="7.6" y="11.6" width="2.4" height="1"/><rect x="14" y="11.6" width="2.4" height="1"/>
      <path d="M8 5.8 C9 4.8 10.4 4.2 12 4.2" fill="none" stroke="#000" stroke-width="1"/>`,
  },
  verified: {
    base: `<path d="${shield}"/>`,
    detail: ``,
    light: `<path d="M7.4 12 L10.6 15.2 L16.8 8.6" fill="none" stroke="#000" stroke-width="2.3"/>`,
  },
  peak: {
    base: `<path d="M3 8 L7.6 12.4 L12 4.2 L16.4 12.4 L21 8 L19.6 18 L4.4 18 Z"/>
      <circle cx="3" cy="7.4" r="1.4"/><circle cx="12" cy="3.6" r="1.4"/><circle cx="21" cy="7.4" r="1.4"/>
      <rect x="4.4" y="18" width="15.2" height="3.2"/>`,
    detail: `<rect x="4.4" y="18" width="15.2" height=".9"/>`,
    light: `<circle cx="12" cy="13.4" r="1.2"/><circle cx="7.8" cy="15.2" r=".9"/><circle cx="16.2" cy="15.2" r=".9"/>`,
  },
  today: {
    base: `<rect x="5" y="8" width="14" height="14"/><rect x="4" y="5" width="3.2" height="4"/><rect x="10.4" y="4" width="3.2" height="5"/>
      <rect x="16.8" y="5" width="3.2" height="4"/><rect x="11.5" y="0.8" width="1" height="4"/>`,
    detail: `<path d="M10 22 L10 17.4 C10 15.4 14 15.4 14 17.4 L14 22 Z"/>`,
    light: `<rect x="7.4" y="11" width="1.6" height="2.2"/><rect x="15" y="11" width="1.6" height="2.2"/><polygon points="12.5,0.8 16.4,2 12.5,3.2"/>`,
  },
  ascend: {
    base: `<path d="M3 21.6 L3 11 C3 5.6 7 2 12 2 C17 2 21 5.6 21 11 L21 21.6 Z"/><rect x="1" y="21" width="22" height="2"/>`,
    detail: `<path d="M7 21.6 L7 12 C7 8.6 9.2 6.6 12 6.6 C14.8 6.6 17 8.6 17 12 L17 21.6 Z"/>`,
    light: `<path d="M12 8.6 L14.8 12.4 L13 12.4 L13 21 L11 21 L11 12.4 L9.2 12.4 Z"/><rect x="11" y="2.6" width="2" height="2"/>`,
  },
  stats: {
    base: `<rect x="3" y="14" width="4" height="8"/><rect x="10" y="9" width="4" height="13"/><rect x="17" y="4" width="4" height="18"/><rect x="1" y="21.4" width="22" height="1.6"/>`,
    detail: ``,
    light: `<rect x="3" y="14" width="4" height="1"/><rect x="10" y="9" width="4" height="1"/><rect x="17" y="4" width="4" height="1"/>`,
  },
  you: {
    base: `<circle cx="12" cy="8" r="4.6"/><path d="M3.4 22 C3.4 16.6 7.4 14 12 14 C16.6 14 20.6 16.6 20.6 22 Z"/>`,
    detail: ``,
    light: `<circle cx="10.4" cy="6.4" r="1.3"/><path d="M6 18 C7 16.4 8.6 15.6 10 15.4" fill="none" stroke="#000" stroke-width="1"/>`,
  },
  heart: {
    base: `<path d="M12 21 C12 21 3 15 3 9 C3 5.8 5.5 3.5 8 3.5 C9.8 3.5 11.2 4.6 12 6 C12.8 4.6 14.2 3.5 16 3.5 C18.5 3.5 21 5.8 21 9 C21 15 12 21 12 21 Z"/>`,
    detail: ``,
    light: `<ellipse cx="7.4" cy="8" rx="1.4" ry="2"/>`,
  },
  lock: {
    base: `<path d="M8 11 L8 7.5 C8 5 9.8 3.5 12 3.5 C14.2 3.5 16 5 16 7.5 L16 11" fill="none" stroke="#000" stroke-width="2.2"/>
      <rect x="5" y="10.5" width="14" height="11" rx="1.4"/>`,
    detail: `<circle cx="12" cy="15" r="1.4"/><rect x="11.4" y="15" width="1.2" height="3.6"/>`,
    light: `<rect x="6.2" y="11.6" width="11.6" height="1"/>`,
  },
  check: {
    base: `<path d="M4 12.6 L9.6 18.2 L20.2 6.6" fill="none" stroke="#000" stroke-width="3.2"/>`,
    detail: ``,
    light: ``,
  },
  "ascend-mark": {
    size: 32,
    base: `<path d="M4 29.5 L4 14 C4 7 9 2.4 16 2.4 C23 2.4 28 7 28 14 L28 29.5 Z"/><rect x="1.5" y="28" width="29" height="3"/>
      <rect x="2.5" y="12" width="3" height="3"/><rect x="26.5" y="12" width="3" height="3"/>`,
    detail: `<path d="M9 29.5 L9 15.4 C9 10.8 12 8 16 8 C20 8 23 10.8 23 15.4 L23 29.5 Z"/>
      <rect x="4" y="19" width="5" height=".9"/><rect x="23" y="19" width="5" height=".9"/><rect x="4" y="24.2" width="5" height=".9"/><rect x="23" y="24.2" width="5" height=".9"/>
      <path d="M8.2 8.6 L10.4 10.6 M23.8 8.6 L21.6 10.6 M16 2.4 L16 4" stroke="#000" stroke-width=".9"/>`,
    light: `<path d="M12.4 17.4 L16 13.8 L19.6 17.4 M12.4 22.4 L16 18.8 L19.6 22.4" fill="none" stroke="#000" stroke-width="1.7"/>
      <rect x="15.1" y="23.4" width="1.8" height="5.4"/><rect x="14.6" y="3.4" width="2.8" height="3.2"/>`,
  },
};

async function mask(fragment, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><g fill="#000">${fragment}</g></svg>`;
  const { data } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return Array.from({ length: size * size }, (_, i) => data[i * 4 + 3] > 110);
}

async function build(name, icon) {
  const size = icon.size ?? 24;
  const [B, D, H] = await Promise.all([mask(icon.base, size), mask(icon.detail || "", size), mask(icon.light || "", size)]);
  const at = (m, x, y) => x >= 0 && y >= 0 && x < size && y < size && m[y * size + x];
  const solid = B.map((b, i) => b || H[i]);
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = "";
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (H[i]) row += "h";
      else if (D[i] && B[i]) row += "o";
      else if (B[i]) {
        const edgeBR = !at(solid, x + 1, y) || !at(solid, x, y + 1);
        const edgeTL = !at(solid, x - 1, y) || !at(solid, x, y - 1);
        row += edgeBR ? "s" : edgeTL ? "l" : "f";
      } else {
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(solid, x + dx, y + dy));
        row += near ? "o" : ".";
      }
    }
    rows.push(row);
  }
  return [name, rows];
}

const entries = await Promise.all(Object.entries(ICONS).map(([name, icon]) => build(name, icon)));
const body = entries
  .map(([name, rows]) => `  ${JSON.stringify(name)}: [\n${rows.map((r) => `    "${r}",`).join("\n")}\n  ],`)
  .join("\n");
await writeFile(
  out,
  `// Generated by scripts/generate-pixel-icons.mjs — do not edit by hand.
// Tones: o outline · f base · s shade · l soft light · h highlight · . empty

export const PIXEL_ICONS_HD = {
${body}
} as const satisfies Record<string, readonly string[]>;

export type PixelIconHdName = keyof typeof PIXEL_ICONS_HD;
`,
);
console.log(`wrote components/ui/pixel-icons-hd.ts (${entries.length} icons)`);
