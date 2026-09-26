# ASCEND Design System V2

> Status: **closed — direction approved, final polish applied** · branch `design-system-v2` ·
> supersedes the cream/minimal system of spec §27–§29 (ADR-037).
> Primary reference: [`docs/design/reference-v2.png`](design/reference-v2.png).
> Screens: [`docs/design/screens-v2/`](design/screens-v2/) (390 and 320 px, real routes) ·
> review: [`docs/design/review-v2/composite.png`](design/review-v2/composite.png) (six sample screens).

## 1. Philosophy

**An RPG where the character is your real body.** Not a fitness tracker with
fantasy stickers, not a mobile game that happens to contain workouts.

- Real measurements stay real: Endurance, Strength, Power, Core, Mobility,
  Agility, Recovery, Overall, Current, Peak, Confidence, Readiness, workout
  and assessment evidence.
- **Real athletic progress is the game.** No XP, no coins, no fictional
  levels. A Quest's "reward" is *evidence* for real Stats; completing one never
  guarantees a Stat increase.
- The fantasy world represents progression. It never replaces data.

### Fantasy intensity by context

| Screen | Fantasy | How it shows |
|---|---|---|
| Today | 30–40 % | World art in the hero (≤ 280 px), real data below |
| Quests | 50–60 % | Quest art thumbnails, sealed-gate locked state |
| Ascend / Path | 75–85 % | Full map, lit route nodes, Boss node |
| Boss | 90–100 % | Guardian art, Cinzel name, red atmosphere |
| Stats | 10–20 % | Pixel runes only; no scenery behind numbers |
| Active workout | 5–10 % | Ring, runes, gold control; no scenery |
| You / Profile | 10–20 % | Framed avatar slot, runes |
| Spawn | 15–25 % | Origin art in the hero; tests stay clinical |

## 2. Colour

Two layers in `apps/web/styles/tokens.css`: palette primitives
(`--ascend-*`, referenced only by the token file) and semantic tokens (what
components use). A unit test forbids raw hex and legacy V1 tokens in every
CSS module.

### Palette (final values)

| Token | Value | Note |
|---|---|---|
| `--ascend-bg-deep` | `#07141b` | |
| `--ascend-bg` | `#091922` | |
| `--ascend-surface-1` | `#0d202a` | |
| `--ascend-surface-2` | `#112934` | |
| `--ascend-surface-3` | `#16333e` | |
| `--ascend-border` | `#29424c` | |
| `--ascend-border-soft` | `rgba(140,175,185,.16)` | |
| `--ascend-text` | `#f3efe4` | |
| `--ascend-text-secondary` | `#a8b7bc` | |
| `--ascend-text-muted` | `#8a9da4` | **tuned** from `#71868e` (3.5–4.4:1 on surfaces) to pass AA everywhere |
| `--ascend-text-faint` | `#71868e` | the original muted value, decorative/disabled only |
| `--ascend-gold` | `#f3b24f` | |
| `--ascend-gold-bright` | `#ffd47a` | |
| `--ascend-gold-dark` | `#a96b20` | fills and gradients only (4.1:1) |
| `--ascend-amber-deep` / `-deeper` | `#3a2710` / `#221708` | **added**: primary button body |
| `--ascend-cyan` | `#25c7e8` | |
| `--ascend-teal` | `#19c6b4` | |
| `--ascend-green` | `#54d899` | |
| `--ascend-orange` | `#ef7b3b` | |
| `--ascend-red` | `#ef4b45` | fills/borders; below AA as text on raised surfaces |
| `--ascend-red-text` | `#ff6b63` | **added**: red as text |
| `--ascend-boss-bg` | `#211116` | |
| `--ascend-boss-surface` | `#2c161c` | **added** |
| `--ascend-boss-red` | `#c94136` | fills/borders only (3.7:1) |
| `--ascend-boss-orange` | `#f07845` | |
| `--ascend-cream` | `#f2e3c2` | |
| `--ascend-ink-on-gold` | `#1a1206` | **added**: text on gold fills |

Attribute identity (pass 2): two families from the palette, no rainbow.
Warm gold for force — Strength (gold), Power (gold-bright), Core (gold).
Cool cyan for motion and capacity — Endurance, Mobility, Agility, Recovery.
Overall is cream. Identity comes from the icon and label; hue never shows
status. (The pass-1 Recovery violet `#b7a4f2` and the extra hues are gone.)

### Semantics

| Colour | Means |
|---|---|
| Gold / amber | Active navigation, progression, the key CTA, current objective, milestones, **provisional** |
| Cyan | Measured values, live metrics, neutral performance data |
| Teal / green | Completed, successful, **verified** |
| Red / orange | Boss, danger, Recoil, failed attempt, warning, safety notes |
| Cream | Fantasy typography: wordmark, Boss names, milestone titles |

Glow (`--glow-primary`, `--glow-boss`, `--glow-data`) is reserved for
selected, active, newly unlocked, Boss and the key CTA. Cards do not glow.

### Depth, not outlines (pass 2)

- Borders are quiet by default: `--border-subtle` (6 %), `--border-default`
  (10 %), `--border-strong` (20 %). Strong edges are reserved for meaning:
  `--border-highlight` (gold: active, current, key CTA), `--border-success`,
  `--border-boss`, `--border-data`.
- Cards separate by tone and light: `--bg-card` / `--bg-card-raised`
  gradients plus `--card-shadow` (inner top light, soft drop shadow).
- Page atmosphere: `--bg-atmosphere` (faint cool light from above, a warm
  floor, a vignette) and `--bg-grain` (static SVG noise at 6 %, never
  animated), fixed behind every screen. Ascend and Boss add their own art.
- Primary button, "illuminated gold": `#c48a3a → #8a5a1c → #6a4212 → #4a2d0c`
  with a firelit top edge, gold border and `#fff3d6` text (≥ 6.6:1 where the
  label sits). Glow only on hover/focus.

## 3. Typography

| Role | Face | Used for |
|---|---|---|
| Product | **Barlow** (400–700) | Body, forms, descriptions |
| Product condensed | **Barlow Semi Condensed** (500–700) | Headings, labels, navigation, buttons, **every metric** |
| Fantasy display | **Cinzel** (600–700) | ASCEND identity, Boss names, the Ascend title and objective, Boss nodes, the Today greeting, "Initialized." / "Initializing." |

Chosen because both Barlow cuts ship **tabular figures** (`tnum`); Chakra
Petch, Rajdhani and Oxanium were checked and do not. Cinzel is never used for
numbers, forms, timers or navigation. All faces are self-hosted by `next/font`.

Scale (tokens `--text-*`): Display XL 40–48, Display 32–36, H1 28–32,
H2 22–24, H3 18, Body 16, Small 14, Meta 13, Label 12 (uppercase, 0.12em),
Micro 11, Metric 40–52, Timer 64–96. Inputs are ≥ 16 px (no iOS zoom).
`.stat-number` = condensed + `tabular-nums`.

## 4. Spacing, radius, layout

- 4 px scale: 4 8 12 16 20 24 32 40 48 64 (`--space-1…16`).
- Radius: xs 4, sm 8, **md 12 (cards, buttons)**, lg 16. Never bubbly; a unit
  test keeps every radius ≤ 16 px.
- Gutter 16 px (12 px dense). One phone-width column: `--content-max` 560 px,
  centred on tablet/desktop. Stats may widen later (`--content-max-wide`).
- Safe areas on every edge; `100dvh`; sticky action bar in the thumb zone.

## 5. Components

| Component | File | Notes |
|---|---|---|
| AppShell | `app/(app)/layout.tsx` | Shell + BottomNav once initialized; locked shell during Spawn |
| BottomNav | `components/shell/BottomNav.tsx` | Today · Quests · **Ascend** · Stats · You. Active: gold + lit bar + weight. ASCEND on a raised gate plate |
| FlowHeader (top bar) | `components/shell/FlowHeader.tsx` | Opaque, gold context label, progress |
| ScreenHeader | `components/ui/ScreenHeader.tsx` | Condensed uppercase title; the page's `h1` |
| SectionHeader | `components/ui/SectionHeader.tsx` | "TODAY'S QUEST · 3/5" row |
| Card | `components/ui/Card.tsx` | default · raised · subtle · **highlight** (gold) · **boss** · **data** |
| MetricCard | `components/ui/MetricCard.tsx` | Label + big tabular value (cyan/gold/neutral) |
| StatList / StatCard rows | `features/stats/StatList.tsx` | Overall card with 0–100 scale; attribute rows |
| QuestCard | `components/game/QuestCard.tsx` | available · active · completed · locked · failed · scheduled; "Evidence: Strength · Core" |
| BossCard | `components/game/BossCard.tsx` | 8 states; Readiness labelled "not a chance of winning" |
| StatusBadge | `components/ui/StatusBadge.tsx` | Rune + word + tone + border style |
| AttributeIcon | `components/ui/AttributeIcon.tsx` | Pixel rune in the attribute hue |
| ProgressBar | `components/ui/ProgressBar.tsx` | gold · data · success · boss |
| ConfidenceBar | `components/ui/ConfidenceBar.tsx` | 10 segments, tone by status |
| Button (Primary/Secondary/Boss/…) | `components/ui/Button.tsx` | primary · secondary · ghost · danger · **boss** · **success**; 52 px |
| EmptyState / LockedState / ErrorState | `components/ui/States.tsx` | Optional art strip |
| TimerDisplay | `components/game/TimerDisplay.tsx` | Huge tabular time in a thin ring |
| WorkoutControl | `components/game/WorkoutControl.tsx` | 56 / 72 / 56 px controls |
| PixelArtFrame | `components/art/PixelArtFrame.tsx` | Notched sprite frame |
| Artwork (ArtworkCard slot) | `components/art/Artwork.tsx` | Semantic art slot, fallback mood, reserved size |

Screen compositions live in `features/screens/` (TodayScreen, QuestsScreen,
AscendScreen, BossScreen, WorkoutScreen) and are shared by the product routes
(real data) and the review samples (sample data from
`features/screens/samples.ts`, imported by nothing else).

Review tooling — **visual review only**, enabled under `next dev` or with
`ASCEND_DESIGN_GALLERY=1`, 404 otherwise, and behind sign-in:
- `/design` — every component state
- `/design/sample/{today,quests,ascend,stats,boss,workout}` — full sample screens
- `/design/review` — the six screens in 390 × 844 phone frames side by side
  (same-origin iframes; only `/design/sample/*` may be framed, `SAMEORIGIN`)
- `scripts/capture-review.mjs` — screenshots + `docs/design/review-v2/composite.png`

## 6. Statuses

Ordinary statuses are compact and quiet (22 px, 11 px text, 35 % edge, no
fill). Events are loud on purpose: New Peak (filled gold, glow), Recoil
(filled orange), Revenge (red→gold fill, glow).

| Status | Rune | Tone | Border |
|---|---|---|---|
| Unranked | dormant diamond | muted blue-gray | dashed, no fill — **never 0** |
| Provisional | hourglass | gold | faint edge, no fill |
| Verified | shield-check | teal | solid |
| Peak | crown | gold-bright | solid |
| New Peak | crown | gold-bright | brief gold pulse (2 × 480 ms) |
| Recoil | broken shield | orange | solid |
| Revenge available | flame | red → gold gradient | solid |
| Locked / scheduled | lock / hourglass | muted | dashed |
| Completed / ready / defeated | check / shield | teal | solid |

## 7. Iconography

**Detailed icons (pass 2):** `scripts/generate-pixel-icons.mjs` draws 20 icons
as vector layers (base, dark detail, light) and rasterises them onto a
**24×24** grid (**32×32** for the brand mark), then shades them like
hand-made pixel art: 1 px outline, top-left soft light, bottom-right shade,
explicit glints. Output: `components/ui/pixel-icons-hd.ts` (generated).
Tones derive from the icon colour at the use site (`--pixel-outline`,
`--pixel-shade`, `--pixel-light`, `--pixel-glint`). `PixelIcon` uses the
24-grid sprite at ≥ 20 px (1:1 at 24 px) and falls back to the 16-grid set
below that, where detail would turn to mush (status badges).

**Brand mark:** `ascend-mark`, a 32×32 ancient gate — pointed arch, keystone,
dressed stone, and light rising through the doorway as stacked chevrons.
Upward, not a mountain. Used on sign-in/sign-up, the Ascend nav plate, and
nowhere else. There is no official tagline; "There is always another
summit." appears only in page metadata.

`components/ui/pixel-icons.ts`: the original 23 16×16 pixel icons in three
tones (`o` outline = currentColor, `f` fill = 42 %, `h` highlight =
`--pixel-highlight`, cream). Symmetric icons are drawn as halves and mirrored.
Rendered by `PixelIcon` as one path per tone with `crispEdges`.

Attributes: lungs, barbell, lightning, torso, joint + arc, runner, moon,
crest. System: scroll (Quest), helmet (Boss), shield-check, crown, dormant
rune, hourglass, broken shield, flame, lock, check, keep (Today), gate
(Ascend — not a mountain), bars, bust (You), heart.

Utility controls (chevrons, play/pause, close, edit, alert) stay vector in
`Icon.tsx` for legibility. No emoji anywhere in the UI.

## 8. Pixel art and asset architecture

```
apps/web/public/art/
  world/    dusk-ruins.png (192×96), spawn-origin.png (192×96)
  paths/    ascend-map.png (195×440 — exactly 2× at 390 px)
  bosses/   guardian-dormant.png (195×220 — 2× at 390 px)
  quests/   training-grounds, campfire, shrine, road, arena (72×48)
  states/   sealed-gate.png, quiet-camp.png
```

- `lib/art.ts` maps **semantic ids** (`world.dusk-ruins`, `bosses.guardian-dormant`, …)
  to file, native size, fallback mood, focal point and `status`.
- Components ask for art by id (`<Artwork id="…">`). Final art replaces a file
  under the same id and aspect — no component changes.
- **All current art is placeholder** (`status: "placeholder"`), generated by
  `npm run art -w @ascend/web` (`scripts/generate-art.mjs`): original,
  procedural, seeded and deterministic. No stock or copyrighted art.
- Files are stored at native pixel size and scaled by the browser with
  `image-rendering: pixelated`. Pass 2 authors the Ascend map, the guardian
  and the Quest scenes as SVG (shapes, gradients, light) rasterised at native
  size with crisp edges and palette dithering — richer placeholders for the
  same engineering time. The route is shared with the UI (`lib/ascend-route.ts`),
  so nodes always sit on the trail and the lit route is drawn over the art.
- Every slot reserves its aspect ratio (no layout shift), shows a mood
  gradient while loading or if the file is missing, and is decorative
  (`alt=""`; meaning lives in the text).
- Mountains may appear; they never lead. Identity is gates, ruins, keeps,
  monoliths, routes, guardians.

## 9. Responsive rules

- Designed at **390 px**; verified at 320 / 390 / 430 / 768 / 1280 and iPhone
  WebKit by the E2E suite (no horizontal overflow, 44 px targets).
- Phone: one column. Tablet/desktop: the same column, centred; art bands
  become rounded cards instead of full-bleed.
- ≤ 359 px: Stat rows drop the chevron and segment bar; text stays.
- Ascend map labels are sized against the map (container units), so they
  never leave it.

## 10. Motion

120–220 ms for UI (`--duration-fast/normal`), 300–500 ms for progression
moments (`--duration-slow/moment`). Used: progress fills, Overall scale
fill-in, ladder row entrance, calibration steps, current node beacon, Boss
breathing, New Peak pulse. `prefers-reduced-motion` stops them all.

## 11. Accessibility

- AA text contrast on every dark surface is unit-tested (palette × surfaces).
- Status is never colour alone: rune + word + border style.
- Visible gold focus ring; skip link; one `h1` per screen; semantic lists.
- `prefers-contrast: more` raises secondary text and borders.
- `forced-colors`: the gradient wordmark falls back to system text.
- Touch targets ≥ 44 px (key actions 52 px, workout centre 72 px).

## 12. Performance

- All placeholder art together is ≈ 37 KB; heroes load eagerly, everything else
  lazily; Boss art is only requested on Boss surfaces.
- Pixel icons are inline SVG (3 paths each), no icon font or sprite request.
- Three font families, subset to Latin, self-hosted.
- No animated backgrounds; the only infinite animations are small and
  disabled under reduced motion.

## 13. Athlete body — `AthleteBodyAvatar` (UI architecture only)

`components/body/AthleteBodyAvatar.tsx`, shown near the top of **You**.

- A neutral, faceless, monochrome anatomical mannequin (vector, not pixel
  art) standing for the athlete's **estimated** real morphology. Not a
  photo, not a cartoon, not a fantasy hero, not a customisable RPG avatar.
- Inputs (`BodyMeasurements`, all optional): `height_cm`, `weight_kg`,
  `body_fat_percentage`, `waist_cm`, `chest_cm`, `hips_cm`, `arm_cm`,
  `thigh_cm`. You passes the athlete's real profile values.
- Data states, derived only from which inputs exist: **no-data** (dimmed
  figure, "Add measurements"), **partial** ("Estimated · partial data"),
  **estimated** (height, weight and body fat present).
- Views: `current` (the only one used in product), `start`, `target`
  (dashed outline — "Target preview"; sample/gallery only).
- Measured circumferences and height are marked on the figure (a mark says
  "this input exists"); values are listed beside it.
- **No morphology is calculated.** The figure is a static placeholder that
  does not change shape with the inputs, and the UI says so: "An estimate of
  your shape, not a body scan. The figure will follow your measurements in a
  later release." Shaping it from the inputs is a future milestone.

## 14. Identity rules

- Names come from the authenticated profile. Today greets by first name
  ("Welcome back, Alex"); with no name, "Welcome back, Athlete".
- Spawn is a progression state, never an identity. Test fixtures use
  realistic names; "Riccardo" appears only in `features/screens/samples.ts`.
- Compact abbreviations (END STR POW COR MOB AGI REC) only on the Today strip;
  full attribute names wherever space allows (links keep the full name as
  their accessible name).
- Unranked is always "—" + "Unranked", never 0. Current is the main number;
  Confidence is smaller, muted and explains certainty.

## 15. Artwork Pass — deferred

Artwork quality is **intentionally not a release blocker** for the current
development phase. Polishing procedural placeholders stops here.

A dedicated **Artwork Pass** will replace every file under
`apps/web/public/art/` (and optionally the pixel icon set) with final art:

| Slot (id) | Current | Needed |
|---|---|---|
| `world.dusk-ruins` | procedural placeholder | Today hero, 2:1, room for a greeting at the bottom |
| `world.spawn-origin` | procedural placeholder | Spawn / calibration origin scene |
| `paths.ascend-map` | SVG-authored placeholder | Full path world, 195:440, trail must follow `lib/ascend-route.ts` |
| `bosses.guardian-dormant` | SVG-authored placeholder | Boss portrait, 195:220, subject in the upper half |
| `quests.*` (5) | SVG-authored placeholders | Quest scenes, 3:2, subject on the right |
| `states.*` (2) | procedural placeholders | Locked / empty vignettes, 3:1 |
| Athlete body | static vector mannequin | Morphology-driven figure (separate milestone) |

Rules for the pass: same ids, same aspect ratios, native pixel size (or
higher-resolution art with the `image-rendering` choice revisited), no
changes to components, no copyrighted or stock art, mountains never the
identity.

## 16. Freeze

Design System V2 is **frozen** as of `800bc79`. Functional milestones use it
as-is. Its visual language changes only when:

- a functional requirement cannot be represented with the existing system;
- there is an accessibility problem;
- there is a genuine responsive or layout bug.

Artwork quality alone is **not** a reason to change the system. Deferred
visual work (see §13 and §15): Today hero, Spawn origin, Ascend map, Boss
guardian, Quest scenes and empty/locked illustrations (the Artwork Pass), and
adaptive `AthleteBodyAvatar` morphology.

