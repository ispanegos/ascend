// Generates ASCEND's TEMPORARY pixel-art placeholders (Design System V2 §9, §30).
// Run: npm run art -w @ascend/web
//
// Original, procedural scenes — no external or copyrighted artwork. Each
// scene is written at its native pixel resolution; the browser scales it
// with `image-rendering: pixelated`, so files stay a few KB. Final artwork
// replaces these files under the same semantic ids (see lib/art.ts).
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MAP_SIZE, ROUTE } from "../lib/ascend-route.ts";

const root = new URL("../public/art/", import.meta.url);

// ------------------------------------------------------------ palette

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const P = {
  void: hex("#050d12"),
  night: hex("#07141b"),
  deep: hex("#0b1d27"),
  teal: hex("#12303a"),
  tealMid: hex("#1b4450"),
  tealLight: hex("#2a5f69"),
  mist: hex("#3c6f73"),
  dusk1: hex("#2a2338"),
  dusk2: hex("#5a2f3a"),
  dusk3: hex("#9a4a36"),
  ember: hex("#d8733a"),
  sun: hex("#f3b24f"),
  sunBright: hex("#ffd47a"),
  cream: hex("#f2e3c2"),
  stone: hex("#1a2b33"),
  stoneLight: hex("#2c434c"),
  forest: hex("#0c2226"),
  forestLight: hex("#15343a"),
  cyan: hex("#25c7e8"),
  cyanDeep: hex("#146f86"),
  teal2: hex("#19c6b4"),
  bossSky1: hex("#1a0b10"),
  bossSky2: hex("#3a1216"),
  bossSky3: hex("#6e1f1c"),
  bossRed: hex("#c94136"),
  bossOrange: hex("#f07845"),
  armor: hex("#161a20"),
  armorLight: hex("#2a3038"),
  armorEdge: hex("#48525c"),
  gold: hex("#a96b20"),
};

// ------------------------------------------------------------ canvas

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

function canvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const c = {
    w,
    h,
    data,
    set(x, y, color) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h || !color) return;
      const i = (y * w + x) * 4;
      const a = (color[3] ?? 255) / 255;
      for (let k = 0; k < 3; k++) data[i + k] = data[i + k] * (1 - a) + color[k] * a;
      data[i + 3] = 255;
    },
    rect(x, y, rw, rh, color) {
      for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) c.set(xx, yy, color);
    },
    /** Vertical gradient through `stops` with ordered dithering between bands. */
    sky(y0, y1, stops) {
      for (let y = y0; y < y1; y++) {
        const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (stops.length - 1);
        const band = Math.min(stops.length - 2, Math.floor(t));
        const f = t - band;
        for (let x = 0; x < w; x++) c.set(x, y, f > BAYER[y % 4][x % 4] ? stops[band + 1] : stops[band]);
      }
    },
    disc(cx, cy, r, color) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) c.set(cx + x, cy + y, color);
    },
    /** Dithered halo that fades out from `r0` to `r1`. */
    halo(cx, cy, r0, r1, color) {
      for (let y = -r1; y <= r1; y++)
        for (let x = -r1; x <= r1; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d < r0 || d > r1) continue;
          const f = 1 - (d - r0) / (r1 - r0);
          if (f * f * 0.5 > BAYER[(cy + y + 64) % 4][(cx + x + 64) % 4]) c.set(cx + x, cy + y, color);
        }
    },
    /** Fills from a height profile down to the bottom (or to `until`). */
    ridge(profile, color, until = h) {
      for (let x = 0; x < w; x++) for (let y = Math.round(profile(x)); y < until; y++) c.set(x, y, color);
    },
    tri(cx, top, halfBase, height, color) {
      for (let y = 0; y < height; y++) {
        const half = Math.round((halfBase * (y + 1)) / height);
        for (let x = -half; x <= half; x++) c.set(cx + x, top + y, color);
      }
    },
    /** Pixel sprite from rows of characters mapped through `map`. */
    sprite(x0, y0, rows, map, flip = false) {
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (map[ch]) c.set(flip ? x0 + row.length - 1 - x : x0 + x, y0 + y, map[ch]);
        }),
      );
    },
  };
  return c;
}

/** Smooth 1D value noise for ridgelines. */
function noise1d(seed, scale) {
  const r = rng(seed);
  const points = Array.from({ length: 64 }, () => r());
  return (x) => {
    const t = x / scale;
    const i = Math.floor(t);
    const f = t - i;
    const a = points[i % 64];
    const b = points[(i + 1) % 64];
    return a + (b - a) * (f * f * (3 - 2 * f));
  };
}

function stars(c, seed, count, maxY, colors) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * c.w);
    const y = Math.floor(r() * maxY);
    c.set(x, y, colors[Math.floor(r() * colors.length)]);
  }
}

function pines(c, seed, baseY, count, color, light, minH = 6, maxH = 12, x0 = 0, x1 = c.w) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.round(x0 + r() * (x1 - x0));
    const height = Math.round(minH + r() * (maxH - minH));
    c.tri(x, baseY - height, Math.max(2, Math.round(height / 3)), height, color);
    if (light) c.set(x, baseY - height, light);
  }
}

/** Ruined keep: towers, crenellations, spires and a few lit windows. */
function keep(c, x, baseY, s, color, lit, seed = 7) {
  const r = rng(seed);
  const towers = [
    [0, 14, 5],
    [5, 22, 6],
    [11, 30, 5],
    [16, 19, 7],
    [23, 25, 4],
    [27, 12, 6],
  ];
  for (const [dx, th, tw] of towers) {
    const tx = x + dx * s;
    const tH = th * s;
    const tW = tw * s;
    c.rect(tx, baseY - tH, tW, tH, color);
    for (let k = 0; k < tW; k += 2 * s) c.rect(tx + k, baseY - tH - s, s, s, color);
    if (th > 20) c.tri(tx + Math.floor(tW / 2), baseY - tH - 6 * s, Math.floor(tW / 2), 6 * s, color);
    for (let w = 0; w < 2; w++) {
      if (r() < 0.55) c.rect(tx + Math.floor(tW / 2), baseY - tH + (4 + w * 6) * s, s, s, lit);
    }
  }
  c.rect(x, baseY - 8 * s, 33 * s, 8 * s, color);
}

async function save(c, path) {
  const file = fileURLToPath(new URL(path, root));
  await mkdir(dirname(file), { recursive: true });
  await sharp(Buffer.from(c.data), { raw: { width: c.w, height: c.h, channels: 4 } })
    .png({ palette: true, colours: 64, compressionLevel: 9, effort: 10 })
    .toFile(file);
  console.log(`wrote public/art/${path} (${c.w}×${c.h})`);
}

// ------------------------------------------------------------ scenes

/** Today hero: dusk, a distant keep, forest, a lone figure on a ridge. */
async function duskRuins() {
  const c = canvas(192, 96);
  c.sky(0, 70, [P.night, P.dusk1, P.dusk2, P.dusk3, P.ember]);
  stars(c, 3, 60, 30, [P.cream, P.mist, P.tealLight]);
  c.halo(142, 44, 7, 20, P.sun);
  c.disc(142, 44, 7, P.sun);
  c.disc(141, 43, 4, P.sunBright);
  const far = noise1d(11, 18);
  c.ridge((x) => 52 + far(x) * 10, P.dusk2);
  keep(c, 108, 62, 1, P.teal, P.sun, 5);
  const mid = noise1d(21, 14);
  c.ridge((x) => 62 + mid(x) * 6, P.tealMid);
  pines(c, 4, 70, 70, P.forest, null, 5, 11);
  c.ridge((x) => 70 + mid(x + 40) * 4, P.forest);
  const near = noise1d(31, 30);
  c.ridge((x) => (x < 90 ? 66 + near(x) * 6 + Math.max(0, x - 50) * 0.35 : 96), P.void);
  pines(c, 9, 96, 12, P.void, null, 12, 22, 120, 192);
  // Lone figure on the ridge, cloak catching the light.
  c.sprite(38, 55, ["..c..", ".ccc.", ".ccc.", "ccccc", "cc.cc", ".c.c.", ".c.c."], { c: P.void });
  c.set(39, 58, P.ember);
  await save(c, "world/dusk-ruins.png");
}

/** Spawn: a monolith at the centre of a rune circle — the origin. */
async function spawnOrigin() {
  const c = canvas(192, 96);
  c.sky(0, 96, [P.void, P.night, P.deep, P.teal]);
  stars(c, 17, 90, 50, [P.cream, P.tealLight, P.cyanDeep]);
  const far = noise1d(41, 22);
  c.ridge((x) => 58 + far(x) * 8, P.deep);
  pines(c, 12, 66, 50, P.forest, null, 4, 9);
  c.ridge((x) => 66 + far(x + 90) * 3, P.forest);
  // Rune circle on the ground (ellipse), dithered cyan glow.
  for (let a = 0; a < 360; a += 3) {
    const x = 96 + Math.cos((a * Math.PI) / 180) * 44;
    const y = 80 + Math.sin((a * Math.PI) / 180) * 9;
    c.set(x, y, a % 30 === 0 ? P.cyan : P.cyanDeep);
  }
  c.halo(96, 60, 6, 26, P.cyanDeep);
  // Monolith.
  c.rect(90, 40, 12, 40, P.stone);
  c.rect(90, 40, 2, 40, P.stoneLight);
  c.tri(96, 34, 6, 6, P.stone);
  for (let y = 46; y < 76; y += 5) c.rect(95, y, 2, 2, P.cyan);
  c.rect(0, 84, 192, 12, P.void);
  await save(c, "world/spawn-origin.png");
}

/** Empty and locked states. */
async function states() {
  const locked = canvas(96, 48);
  locked.sky(0, 48, [P.void, P.night, P.deep]);
  locked.rect(0, 40, 96, 8, P.forest);
  locked.rect(34, 10, 28, 30, P.stone);
  locked.rect(36, 12, 24, 28, P.void);
  locked.rect(46, 20, 4, 6, P.armorEdge);
  locked.rect(45, 26, 6, 6, P.armorEdge);
  locked.rect(34, 8, 28, 2, P.stoneLight);
  await save(locked, "states/sealed-gate.png");

  const empty = canvas(96, 48);
  empty.sky(0, 48, [P.void, P.night, P.teal]);
  stars(empty, 71, 20, 24, [P.cream, P.mist]);
  empty.rect(0, 38, 96, 10, P.forest);
  pines(empty, 72, 40, 10, P.void, null, 6, 12);
  empty.rect(46, 34, 4, 4, P.ember);
  empty.halo(48, 35, 2, 10, P.ember);
  await save(empty, "states/quiet-camp.png");
}


// ------------------------------------------------------------ SVG scenes
// Richer scenes are authored as vector shapes and rasterised at their native
// pixel size with crisp edges, then quantised with dithering: pixel art
// texture without hand-placing every pixel. Still placeholders (lib/art.ts).

async function saveSvg(svg, width, height, path, colours = 64) {
  const file = fileURLToPath(new URL(path, root));
  await mkdir(dirname(file), { recursive: true });
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${svg}</svg>`;
  await sharp(Buffer.from(doc))
    .flatten({ background: "#07141b" })
    .png({ palette: true, colours, dither: 0.9, compressionLevel: 9, effort: 10 })
    .toFile(file);
  console.log(`wrote public/art/${path} (${width}×${height})`);
}

function pine(x, y, h, dark, light) {
  const w = h * 0.42;
  return `<polygon points="${x},${y - h} ${x - w},${y} ${x + w},${y}" fill="${dark}"/>
    <polygon points="${x},${y - h} ${x - w},${y} ${x - w * 0.15},${y}" fill="${light}"/>
    <rect x="${x - 0.5}" y="${y}" width="1" height="2" fill="#081512"/>`;
}

/** Distance from a point to the route polyline, for keeping trees off the trail. */
function routeDistance(x, y) {
  let best = Infinity;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const a = ROUTE[i];
    const b = ROUTE[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
  }
  return best;
}

/** Ascend: a continuous world from a campfire start to a Boss keep. */
async function ascendMapHd() {
  const { width: W, height: H } = MAP_SIZE;
  const r = rng(101);
  const trail = ROUTE.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  let trees = "";
  for (let i = 0; i < 520; i++) {
    const x = r() * W;
    const y = 120 + r() * (H - 110);
    if (routeDistance(x, y) < 13) continue;
    if (Math.abs(x - (26 + Math.sin(y / 38) * 14)) < 12) continue; // river
    const h = 7 + r() * 9;
    const deep = y < 200 ? ["#0f2a30", "#1d4148"] : ["#0c2426", "#1a3d40"];
    trees += pine(Math.round(x), Math.round(y), h, deep[0], deep[1]);
  }
  let river = "M26 108";
  for (let y = 118; y <= H + 10; y += 10) river += ` L${(26 + Math.sin(y / 38) * 14).toFixed(1)} ${y}`;
  let stars = "";
  for (let i = 0; i < 40; i++) stars += `<rect x="${Math.round(r() * W)}" y="${Math.round(r() * 70)}" width="1" height="1" fill="${r() > 0.6 ? "#f2e3c2" : "#5f8a90"}"/>`;
  const ruin = (x, y) => `<rect x="${x}" y="${y - 12}" width="4" height="12" fill="#2c434c"/><rect x="${x}" y="${y - 12}" width="1" height="12" fill="#48636b"/>
    <rect x="${x + 7}" y="${y - 7}" width="4" height="7" fill="#2c434c"/><rect x="${x - 2}" y="${y}" width="16" height="2" fill="#1a2b33"/>`;
  const svg = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#07111a"/><stop offset=".45" stop-color="#2a2338"/><stop offset=".75" stop-color="#5a2f3a"/><stop offset="1" stop-color="#7a3a30"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#132e36"/><stop offset=".5" stop-color="#0e2529"/><stop offset="1" stop-color="#0a1c20"/>
    </linearGradient>
    <radialGradient id="bossGlow"><stop offset="0" stop-color="#c94136" stop-opacity=".7"/><stop offset="1" stop-color="#c94136" stop-opacity="0"/></radialGradient>
    <radialGradient id="fire"><stop offset="0" stop-color="#f3b24f" stop-opacity=".8"/><stop offset="1" stop-color="#ef7b3b" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  </defs>
  <rect width="${W}" height="120" fill="url(#sky)"/>${stars}
  <circle cx="158" cy="30" r="9" fill="#f2e3c2" opacity=".85"/><circle cx="161" cy="28" r="8" fill="#2a2338"/>
  <circle cx="98" cy="70" r="46" fill="url(#bossGlow)"/>
  <path d="M0 104 L22 92 L40 98 L58 84 L70 92 L126 92 L140 80 L160 94 L180 86 L195 96 L195 125 L0 125 Z" fill="#1b2c3a"/>
  <path d="M62 112 L72 96 L80 92 L116 92 L124 96 L134 112 Z" fill="#101a22"/>
  <rect x="80" y="62" width="10" height="32" fill="#0c141b"/><rect x="106" y="58" width="10" height="36" fill="#0c141b"/>
  <rect x="89" y="48" width="18" height="46" fill="#0e161d"/><polygon points="98,30 88,50 108,50" fill="#0e161d"/>
  <polygon points="85,50 79,64 91,64" fill="#0c141b"/><polygon points="111,46 105,60 117,60" fill="#0c141b"/>
  <rect x="96" y="60" width="4" height="6" fill="#c94136"/><rect x="83" y="72" width="2" height="3" fill="#c94136"/><rect x="110" y="68" width="2" height="3" fill="#c94136"/>
  <path d="M92 94 L92 84 C92 80 104 80 104 84 L104 94 Z" fill="#200a0c"/>
  <rect x="0" y="118" width="${W}" height="${H - 118}" fill="url(#ground)"/>
  <ellipse cx="150" cy="330" rx="40" ry="18" fill="#15343a" opacity=".6"/><ellipse cx="60" cy="210" rx="36" ry="14" fill="#15343a" opacity=".6"/>
  <path d="${river}" fill="none" stroke="#0f4d5e" stroke-width="15"/>
  <path d="${river}" fill="none" stroke="#146f86" stroke-width="9"/>
  <path d="${river}" fill="none" stroke="#25c7e8" stroke-width="2" stroke-dasharray="3 9" opacity=".7"/>
  <path d="${trail}" fill="none" stroke="#0a1a1d" stroke-width="10" stroke-linejoin="round"/>
  <path d="${trail}" fill="none" stroke="#3a4f55" stroke-width="6" stroke-linejoin="round"/>
  <path d="${trail}" fill="none" stroke="#56707a" stroke-width="2" stroke-dasharray="2 4" stroke-linejoin="round"/>
  ${trees}
  ${ruin(20, 300)}${ruin(160, 290)}${ruin(28, 180)}
  <g transform="translate(150 206)">
    <rect x="-16" y="-24" width="6" height="26" fill="#2c434c"/><rect x="10" y="-24" width="6" height="26" fill="#2c434c"/>
    <path d="M-16 -22 C-16 -36 16 -36 16 -22 L10 -22 C10 -30 -10 -30 -10 -22 Z" fill="#2c434c"/>
    <rect x="-16" y="-24" width="2" height="26" fill="#48636b"/><rect x="-2" y="-34" width="4" height="4" fill="#48636b"/>
  </g>
  <circle cx="132" cy="392" r="20" fill="url(#fire)"/>
  <polygon points="128,392 132,382 136,392" fill="#f3b24f"/><polygon points="130,392 132,386 134,392" fill="#ffd47a"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  await saveSvg(svg, W, H, "paths/ascend-map.png", 96);
}

/** Boss: a guardian that fills the frame, rim-lit by a blood moon. */
async function guardianHd() {
  const W = 195;
  const H = 220;
  const r = rng(202);
  let embers = "";
  for (let i = 0; i < 60; i++) embers += `<rect x="${Math.round(r() * W)}" y="${Math.round(r() * H)}" width="1" height="${r() > 0.7 ? 2 : 1}" fill="${r() > 0.5 ? "#f07845" : "#ffd47a"}" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  const svg = `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12070a"/><stop offset=".4" stop-color="#3a1216"/><stop offset=".75" stop-color="#6e1f1c"/><stop offset="1" stop-color="#2a0d10"/>
    </linearGradient>
    <radialGradient id="moon"><stop offset="0" stop-color="#e0573f"/><stop offset=".6" stop-color="#8e2a22"/><stop offset="1" stop-color="#8e2a22" stop-opacity="0"/></radialGradient>
    <linearGradient id="armor" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5a2a2a"/><stop offset=".18" stop-color="#1c1f26"/><stop offset=".8" stop-color="#15181e"/><stop offset="1" stop-color="#6e2a24"/>
    </linearGradient>
    <linearGradient id="cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0f14"/><stop offset="1" stop-color="#1a070a"/></linearGradient>
    <radialGradient id="eye"><stop offset="0" stop-color="#ffd47a"/><stop offset=".5" stop-color="#f07845"/><stop offset="1" stop-color="#f07845" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx=".5" cy=".45" r=".7"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="98" cy="64" r="58" fill="url(#moon)" opacity=".85"/>
  <rect x="6" y="70" width="12" height="130" fill="#140609"/><polygon points="12,50 4,72 20,72" fill="#140609"/>
  <rect x="26" y="102" width="9" height="100" fill="#1c080c"/><polygon points="30,86 24,104 36,104" fill="#1c080c"/>
  <rect x="172" y="64" width="13" height="140" fill="#140609"/><polygon points="178,42 170,66 186,66" fill="#140609"/>
  <rect x="158" y="110" width="8" height="90" fill="#1c080c"/>
  <path d="M0 190 L40 176 L80 184 L120 172 L160 182 L195 176 L195 ${H} L0 ${H} Z" fill="#12060a"/>
  <path d="M52 110 L30 220 L165 220 L143 110 Z" fill="url(#cape)"/>
  <path d="M60 104 C60 96 70 92 98 92 C126 92 136 96 136 104 L142 170 L126 206 L70 206 L54 170 Z" fill="url(#armor)"/>
  <path d="M40 96 C44 84 64 82 76 90 L72 116 C60 114 46 110 40 96 Z" fill="#23262e"/><path d="M40 96 C44 84 64 82 76 90" fill="none" stroke="#c94136" stroke-width="1.5"/>
  <path d="M155 96 C151 84 131 82 119 90 L123 116 C135 114 149 110 155 96 Z" fill="#23262e"/><path d="M155 96 C151 84 131 82 119 90" fill="none" stroke="#c94136" stroke-width="1.5"/>
  <polygon points="44,90 36,74 52,86" fill="#2c3038"/><polygon points="151,90 159,74 143,86" fill="#2c3038"/>
  <path d="M78 64 C78 44 88 36 98 36 C108 36 118 44 118 64 L118 82 L108 94 L88 94 L78 82 Z" fill="#1a1d24"/>
  <path d="M78 64 C78 44 88 36 98 36" fill="none" stroke="#8e3a2e" stroke-width="1.4"/>
  <path d="M80 50 L60 22 L70 26 L84 44 Z" fill="#2a2d35"/><path d="M116 50 L136 22 L126 26 L112 44 Z" fill="#2a2d35"/>
  <rect x="82" y="62" width="32" height="5" fill="#07080b"/><rect x="97" y="62" width="2" height="24" fill="#07080b"/>
  <circle cx="89" cy="64.5" r="6" fill="url(#eye)"/><circle cx="107" cy="64.5" r="6" fill="url(#eye)"/>
  <rect x="86" y="64" width="6" height="2" fill="#ffd47a"/><rect x="104" y="64" width="6" height="2" fill="#ffd47a"/>
  <polygon points="98,118 90,132 98,146 106,132" fill="#c94136"/><polygon points="98,124 94,132 98,140 102,132" fill="#ffb07a"/>
  <rect x="72" y="150" width="52" height="3" fill="#0b0c10"/><rect x="72" y="170" width="52" height="3" fill="#0b0c10"/>
  <rect x="94" y="138" width="8" height="82" fill="#3a3f48"/><rect x="94" y="138" width="2" height="82" fill="#8e98a2"/>
  <rect x="82" y="134" width="32" height="5" fill="#4a3014"/><rect x="95" y="124" width="6" height="11" fill="#2a1c0a"/><circle cx="98" cy="122" r="4" fill="#a96b20"/>
  ${embers}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  await saveSvg(svg, W, H, "bosses/guardian-dormant.png", 80);
}

/** Quest scenes: wide vignettes that sit inside Quest cards. */
async function questScenes() {
  const W = 72;
  const H = 48;
  const frame = (inner, sky = ["#07141b", "#12303a"]) => `
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <radialGradient id="g"><stop offset="0" stop-color="#f3b24f" stop-opacity=".75"/><stop offset="1" stop-color="#ef7b3b" stop-opacity="0"/></radialGradient>
    <radialGradient id="c"><stop offset="0" stop-color="#25c7e8" stop-opacity=".7"/><stop offset="1" stop-color="#25c7e8" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#s)"/>${inner}`;
  await saveSvg(
    frame(`<rect y="36" width="72" height="12" fill="#10262a"/>
      <circle cx="58" cy="22" r="14" fill="url(#g)"/><rect x="57" y="18" width="2" height="18" fill="#2c434c"/><polygon points="56,18 58,12 60,18" fill="#f3b24f"/>
      <rect x="14" y="16" width="2" height="21" fill="#48636b"/><rect x="38" y="16" width="2" height="21" fill="#48636b"/><rect x="10" y="20" width="34" height="2" fill="#8e98a2"/>
      <rect x="8" y="14" width="4" height="14" fill="#a96b20"/><rect x="42" y="14" width="4" height="14" fill="#a96b20"/>
      <circle cx="26" cy="33" r="4" fill="#2c3038"/><rect x="24" y="27" width="4" height="3" fill="#3a3f48"/>`),
    W, H, "quests/training-grounds.png");
  await saveSvg(
    frame(`<rect y="36" width="72" height="12" fill="#0c1f22"/><circle cx="36" cy="32" r="18" fill="url(#g)"/>
      <polygon points="30,38 36,20 42,38" fill="#ef7b3b"/><polygon points="33,38 36,27 39,38" fill="#ffd47a"/>
      <rect x="26" y="37" width="20" height="2" fill="#4a3014"/><rect x="10" y="30" width="6" height="8" fill="#1a2b33"/><polygon points="58,38 64,20 70,38" fill="#0c2426"/>`, ["#050d12", "#0b1d27"]),
    W, H, "quests/campfire.png");
  await saveSvg(
    frame(`<rect y="38" width="72" height="10" fill="#10262a"/><circle cx="36" cy="30" r="16" fill="url(#c)"/>
      <rect x="24" y="16" width="24" height="23" fill="#1a2b33"/><polygon points="22,16 36,6 50,16" fill="#2c434c"/>
      <path d="M31 39 L31 28 C31 24 41 24 41 28 L41 39 Z" fill="#07141b"/><rect x="35" y="29" width="2" height="7" fill="#25c7e8"/>
      <rect x="24" y="16" width="2" height="23" fill="#48636b"/>`, ["#07141b", "#2a2338"]),
    W, H, "quests/shrine.png");
  await saveSvg(
    frame(`<path d="M0 48 L28 30 L44 30 L72 48 Z" fill="#2c434c"/><path d="M34 48 L35 30 L37 30 L38 48 Z" fill="#56707a"/>
      <rect y="30" width="72" height="2" fill="#10262a"/><polygon points="6,34 12,16 18,34" fill="#0c2426"/><polygon points="54,34 60,18 66,34" fill="#0c2426"/>
      <circle cx="36" cy="18" r="6" fill="#f2e3c2" opacity=".85"/><rect x="47" y="24" width="4" height="8" fill="#48636b"/>`, ["#1b1a2c", "#5a2f3a"]),
    W, H, "quests/road.png");
  await saveSvg(
    frame(`<ellipse cx="36" cy="42" rx="30" ry="6" fill="#1a2b33"/><ellipse cx="36" cy="42" rx="24" ry="4" fill="#2c434c"/>
      <rect x="10" y="18" width="5" height="24" fill="#2c434c"/><rect x="57" y="18" width="5" height="24" fill="#2c434c"/><rect x="10" y="16" width="52" height="3" fill="#48636b"/>
      <circle cx="36" cy="30" r="12" fill="url(#g)"/><polygon points="33,40 37,30 35,30 39,22 34,31 36,31" fill="#ffd47a"/>`, ["#07141b", "#3a1216"]),
    W, H, "quests/arena.png");
}

await duskRuins();
await spawnOrigin();
await ascendMapHd();
await guardianHd();
await questScenes();
await states();
