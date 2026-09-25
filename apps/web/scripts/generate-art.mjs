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

/** Ascend: a winding route up through forest and river to a gate. Nodes are drawn by the UI. */
async function ascendMap() {
  const c = canvas(120, 200);
  c.sky(0, 60, [P.night, P.dusk1, P.dusk2]);
  stars(c, 23, 40, 30, [P.cream, P.mist]);
  const far = noise1d(51, 16);
  c.ridge((x) => 34 + far(x) * 12, P.teal);
  keep(c, 44, 44, 1, P.deep, P.sun, 9);
  c.rect(0, 44, 120, 156, P.forest);
  // River.
  for (let y = 60; y < 200; y++) {
    const x = 18 + Math.sin(y / 17) * 8 + (y - 60) * 0.05;
    c.rect(Math.round(x), y, 5, 1, y % 7 === 0 ? P.cyan : P.cyanDeep);
  }
  pines(c, 31, 80, 26, P.forestLight, P.tealLight, 6, 12);
  pines(c, 32, 120, 26, P.forestLight, P.tealLight, 6, 12);
  pines(c, 33, 160, 26, P.forestLight, P.tealLight, 6, 12);
  pines(c, 34, 198, 26, P.forestLight, P.tealLight, 6, 12);
  // The route (dim dotted track; the UI draws lit nodes over it).
  for (let y = 196; y > 50; y -= 1) {
    const x = 64 + Math.sin(y / 22) * 26;
    if (y % 3 !== 0) c.rect(Math.round(x), y, 2, 1, P.stoneLight);
  }
  await save(c, "paths/ascend-map.png");
}

const GUARDIAN = [
  "..........h....h..........",
  ".........hh....hh.........",
  "........hhh....hhh........",
  "........hhaaaaaahh........",
  ".........aaaaaaaa.........",
  "........aaeEaaEeaa........",
  "........aaaaaaaaaa........",
  ".........aaaaaaaa.........",
  "......llllaaaaaallll......",
  "....llLLLLaaaaaaLLLLll....",
  "...lLLLLLLaaaaaaLLLLLLl...",
  "...lLLLLaaaaaaaaaaLLLLl...",
  "...laaaaaaaaaaaaaaaaaal...",
  "..laaaaaaaaaaaaaaaaaaaal..",
  "..laaaaaaaaggaaaaaaaaaal..",
  "..aaaaaaaaaggaaaaaaaaaaa..",
  ".aaa.aaaaaaaaaaaaaaaa.aaa.",
  ".aaa.aaaaaaaaaaaaaaaa.aaa.",
  ".aaa.aaaaaaaaaaaaaaaa.aaa.",
  ".aa..aaaaaaaaaaaaaaaa..aa.",
  ".aa..aaaaaaaaaaaaaaaa..aa.",
  "..s..aaaaaaaaaaaaaaaa.....",
  "..s..aaaaaaa..aaaaaaa.....",
  "..s..aaaaaa....aaaaaa.....",
  "..s..aaaaa......aaaaa.....",
  "..s..laaaa......aaaal.....",
  "..s..aaaa........aaaa.....",
  "..s.laaaa........aaaal....",
  "....aaaaa........aaaaa....",
];

/** Boss: a dormant guardian against a blood-red sky. */
async function guardian() {
  const c = canvas(96, 112);
  c.sky(0, 112, [P.bossSky1, P.bossSky2, P.bossSky3, P.bossSky2]);
  c.halo(48, 36, 10, 34, P.bossRed);
  c.disc(48, 36, 10, P.bossSky3);
  stars(c, 41, 25, 40, [P.bossOrange, P.dusk3]);
  const far = noise1d(61, 12);
  c.ridge((x) => 78 + far(x) * 8, P.bossSky1);
  // Spires either side.
  for (const [x, h] of [
    [8, 40],
    [18, 28],
    [78, 34],
    [88, 44],
  ]) {
    c.rect(x, 96 - h, 5, h, P.void);
    c.tri(x + 2, 96 - h - 8, 2, 8, P.void);
  }
  const map = { a: P.armor, l: P.armorLight, L: P.armorEdge, h: P.armorLight, e: P.bossRed, E: P.bossOrange, g: P.bossRed, s: P.armorEdge };
  // Draw the sprite at 2× so the guardian dominates the frame.
  const scaled = GUARDIAN.flatMap((row) => {
    const wide = [...row].map((ch) => ch + ch).join("");
    return [wide, wide];
  });
  c.sprite(22, 50, scaled, map);
  c.rect(0, 108, 96, 4, P.void);
  await save(c, "bosses/guardian-dormant.png");
}

/** Quest thumbnails. */
async function questThumb(name, draw) {
  const c = canvas(48, 48);
  draw(c);
  await save(c, `quests/${name}.png`);
}

async function quests() {
  await questThumb("training-grounds", (c) => {
    c.sky(0, 48, [P.night, P.deep, P.teal]);
    c.rect(0, 38, 48, 10, P.forest);
    // Weight rack posts and a barbell.
    c.rect(12, 20, 2, 18, P.stoneLight);
    c.rect(34, 20, 2, 18, P.stoneLight);
    c.rect(8, 22, 32, 2, P.armorEdge);
    c.rect(6, 18, 3, 10, P.gold);
    c.rect(39, 18, 3, 10, P.gold);
    c.halo(24, 12, 2, 12, P.sun);
  });
  await questThumb("campfire", (c) => {
    c.sky(0, 48, [P.void, P.night, P.deep]);
    c.rect(0, 38, 48, 10, P.forest);
    c.halo(24, 32, 4, 20, P.ember);
    c.tri(24, 22, 5, 14, P.ember);
    c.tri(24, 27, 3, 9, P.sun);
    c.rect(16, 36, 16, 2, P.stoneLight);
  });
  await questThumb("shrine", (c) => {
    c.sky(0, 48, [P.night, P.dusk1, P.teal]);
    c.rect(0, 40, 48, 8, P.forest);
    c.rect(16, 18, 16, 22, P.stone);
    c.tri(24, 10, 10, 8, P.stone);
    c.rect(21, 26, 6, 14, P.void);
    c.halo(24, 32, 2, 10, P.cyan);
    c.rect(23, 30, 2, 4, P.cyan);
  });
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

await duskRuins();
await spawnOrigin();
await ascendMap();
await guardian();
await quests();
await states();
