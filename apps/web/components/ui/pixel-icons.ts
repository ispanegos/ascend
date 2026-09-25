/*
 * ASCEND pixel icon set (Design System V2 §10). 16×16 grids, three tones:
 *
 *   o  outline / main tone   → currentColor
 *   f  fill                  → currentColor at 45 %
 *   h  highlight             → --pixel-highlight (cream by default)
 *   .  transparent
 *
 * Symmetric icons are drawn as their left 8 columns and mirrored.
 * Semantic identity only (attributes, statuses, destinations). Utility
 * controls (chevrons, play/pause, close) stay vector in Icon.tsx.
 */

export type PixelIconName =
  | "endurance"
  | "strength"
  | "power"
  | "core"
  | "mobility"
  | "agility"
  | "recovery"
  | "overall"
  | "quest"
  | "boss"
  | "verified"
  | "peak"
  | "unranked"
  | "provisional"
  | "recoil"
  | "revenge"
  | "lock"
  | "check"
  | "today"
  | "ascend"
  | "stats"
  | "you"
  | "heart";

const BLANK = "................";

/** Mirrors 8-column half rows into 16-column rows. */
function mirror(half: readonly string[]): string[] {
  return half.map((row) => row + [...row].reverse().join(""));
}

/** Pads a drawing to 16 rows (centred vertically, extra row at the bottom). */
function pad(rows: readonly string[]): string[] {
  const top = Math.floor((16 - rows.length) / 2);
  return [...Array(top).fill(BLANK), ...rows, ...Array(16 - rows.length - top).fill(BLANK)];
}

export const PIXEL_ICONS: Record<PixelIconName, readonly string[]> = {
  // Lungs.
  endurance: pad(
    mirror([
      ".......o",
      ".......o",
      "...ooo.o",
      "..ohhfoo",
      ".ohfffo.",
      ".ohfffo.",
      "ohffffo.",
      "ohffffo.",
      "ohffffo.",
      "offfffo.",
      "offffo..",
      ".oooo...",
    ]),
  ),
  // Barbell.
  strength: pad(
    mirror([
      ".oo.....",
      "ohfo....",
      "ohfoo...",
      "ohfoo...",
      "ohfooooo",
      "ohfooooo",
      "ohfoo...",
      "ohfoo...",
      "ohfo....",
      ".oo.....",
    ]),
  ),
  // Lightning.
  power: pad([
    "..........ooo...",
    ".........ohfo...",
    "........ohfo....",
    ".......ohfo.....",
    "......ohfo......",
    ".....ohfooooo...",
    "....ohhhhhhfo...",
    "...ooooohhfo....",
    ".......ohfo.....",
    "......ohfo......",
    ".....ohfo.......",
    "....ohfo........",
    "...ohfo.........",
    "..ooo...........",
  ]),
  // Torso: stability.
  core: pad(
    mirror([
      "...ooooo",
      ".ooohfff",
      "ohhhffff",
      "ohffffff",
      "ohfffooo",
      ".offffff",
      "..offfoo",
      "..offfff",
      "..offfoo",
      "..offfff",
      "...offoo",
      "...offff",
      "....oooo",
    ]),
  ),
  // Joint with its range-of-motion arc.
  mobility: pad([
    "......oooo......",
    "....oo....oo....",
    "...o........o...",
    "..o........ooooo",
    ".o..........ooo.",
    ".o...........o..",
    ".o..............",
    "......oo........",
    ".....ohho.......",
    ".....ohfo.......",
    "....ooooo.......",
    "...oo....oo.....",
    "..oo......oo....",
    ".oo........oo...",
  ]),
  // Runner.
  agility: pad([
    "..........oo....",
    "..........oo....",
    ".......oooo.....",
    "......o.ooo.oo..",
    ".....o..ooo...o.",
    "........oo......",
    ".......ooo......",
    "......oo..oo....",
    ".....oo....o....",
    "....oo.....o....",
    "..ooo.......oo..",
  ]),
  // Crescent moon and a star.
  recovery: pad([
    ".....oooo.......",
    "...oohfo........",
    "..ohfo..........",
    ".ohfo...........",
    ".ohfo......o....",
    "ohffo.....ooo...",
    "ohffo......o....",
    "ohffo...........",
    "ohffo...........",
    ".ohffo..........",
    ".ohfffo.........",
    "..ohfffoo.......",
    "...oofffooo.....",
    ".....ooooo......",
  ]),
  // Crest: a gem within a gem.
  overall: pad(
    mirror([
      ".......o",
      "......oo",
      ".....ohf",
      "....ohff",
      "...ohffo",
      "..ohffoh",
      ".ohffohh",
      ".offfohh",
      "..offfoh",
      "...offfo",
      "....offf",
      ".....off",
      "......oo",
      ".......o",
    ]),
  ),
  // Scroll.
  quest: pad(
    mirror([
      "..oooooo",
      ".ohhffff",
      ".ohhffff",
      "..oooooo",
      "...offff",
      "...ofooo",
      "...offff",
      "...ofooo",
      "...offff",
      "...ofoof",
      "...offff",
      "..oooooo",
      ".ohhffff",
      "..oooooo",
    ]),
  ),
  // Guardian helmet.
  boss: pad(
    mirror([
      ".......o",
      "....oooo",
      "..oohhff",
      ".ohhffff",
      ".ohfffff",
      "ohffffff",
      "ohfooooo",
      "ohfohhoo",
      "ohfooooo",
      "ohfffffo",
      ".ohffffo",
      ".offf.fo",
      "..off.fo",
      "..oo..oo",
    ]),
  ),
  // Shield with a check.
  verified: pad([
    ".oooooooooooooo.",
    ".offffffffffffo.",
    ".offffffffffffo.",
    ".offffffffhhffo.",
    ".offfffffhhfffo.",
    ".offhhffhhffffo.",
    ".offfhhhhfffffo.",
    "..offfhhfffffo..",
    "...offffffffo...",
    "....offffffo....",
    ".....offffo.....",
    "......offo......",
    ".......oo.......",
  ]),
  // Crown.
  peak: pad(
    mirror([
      "o......o",
      "oo....oo",
      "ohf..ohf",
      "ohfo.ohh",
      "ohffohfh",
      "ohffffff",
      "ohfhffff",
      "ohffffff",
      "oooooooo",
      "ohhhhhhh",
      "oooooooo",
    ]),
  ),
  // Dormant rune: hollow diamond, unknown mark.
  unranked: pad(
    mirror([
      ".......o",
      "......o.",
      ".....o..",
      "....o...",
      "...o....",
      "..o.....",
      ".o.....o",
      ".o.....o",
      "..o.....",
      "...o....",
      "....o...",
      ".....o..",
      "......o.",
      ".......o",
    ]),
  ),
  // Hourglass: an estimate still forming.
  provisional: pad(
    mirror([
      ".ooooooo",
      "..offfff",
      "...offff",
      "....offf",
      ".....off",
      "......of",
      "......of",
      ".....off",
      "....ofhh",
      "...ofhhh",
      "..ofhhhh",
      "..ohhhhh",
      ".ooooooo",
    ]),
  ),
  // Broken shield.
  recoil: pad([
    ".ooooooo.oooooo.",
    ".offffff.fffffo.",
    ".offfff.ffffffo.",
    ".offfff.ffffffo.",
    ".offffff.fffffo.",
    ".offfffff.ffffo.",
    ".offffff.fffffo.",
    "..offff.fffffo..",
    "...offf.ffffo...",
    "....offf.ffo....",
    ".....offffo.....",
    "......offo......",
    ".......oo.......",
  ]),
  // Awakened flame.
  revenge: pad(
    mirror([
      ".......o",
      ".......o",
      "......of",
      "......of",
      ".....ofh",
      "..o..ofh",
      ".oo.ofhh",
      ".ofoofhh",
      "ofhffhhh",
      "ofhfhhhh",
      "ofhhhhhh",
      ".ofhhhhh",
      "..offhhh",
      "...ooooo",
    ]),
  ),
  lock: pad(
    mirror([
      ".....ooo",
      "....o...",
      "....o...",
      "....o...",
      "..oooooo",
      "..ohffff",
      "..ohffff",
      "..ohfffo",
      "..ohfffo",
      "..ohffff",
      "..ohffff",
      "..oooooo",
    ]),
  ),
  check: pad([
    ".............oo.",
    "............ooo.",
    "...........ooo..",
    "..........ooo...",
    ".oo......ooo....",
    ".ooo....ooo.....",
    "..ooo..ooo......",
    "...oooooo.......",
    "....oooo........",
    ".....oo.........",
  ]),
  // Keep: the athlete's base for the day.
  today: pad(
    mirror([
      "..oo.oo.",
      "..oooooo",
      "..ohffff",
      "..ohffff",
      "..ohfoof",
      "..ohfoof",
      "..ohffff",
      "..ohffff",
      "..ohffoo",
      "..ohfo..",
      "..ohfo..",
      ".ooooo..",
    ]),
  ),
  // Gate: the way onward. Not a mountain.
  ascend: pad(
    mirror([
      ".....ooo",
      "...oohhh",
      "..ohhooo",
      ".ohoofff",
      ".ohofffh",
      "ohoffffh",
      "ohoffffh",
      "ohofffhh",
      "ohofffhh",
      "ohoffffh",
      "ohoffffh",
      "ohoffffh",
      "oooooooo",
      "ohhhhhhh",
    ]),
  ),
  stats: pad([
    "...........ooo..",
    "...........ohf..",
    "...........ohf..",
    "...........ohf..",
    "......ooo..ohf..",
    "......ohf..ohf..",
    "......ohf..ohf..",
    ".ooo..ohf..ohf..",
    ".ohf..ohf..ohf..",
    ".ohf..ohf..ohf..",
    ".ohf..ohf..ohf..",
    ".ohf..ohf..ohf..",
    "oooooooooooooooo",
  ]),
  you: pad(
    mirror([
      ".....ooo",
      "....ohhf",
      "...ohfff",
      "...offff",
      "...offff",
      "....offf",
      ".....ooo",
      "...ooooo",
      ".oohffff",
      "ohhfffff",
      "ohffffff",
      "ohffffff",
      "oooooooo",
    ]),
  ),
  heart: pad(
    mirror([
      "..oooo..",
      ".ohhffo.",
      "ohhffffo",
      "ohffffff",
      "ohffffff",
      "offfffff",
      ".offffff",
      "..offfff",
      "...offff",
      "....offf",
      ".....off",
      "......of",
      ".......o",
    ]),
  ),
};
