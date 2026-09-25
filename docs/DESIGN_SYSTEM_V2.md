# ASCEND Design System V2

> Status: **implemented, awaiting visual approval** · branch `design-system-v2` ·
> supersedes the cream/minimal system of spec §27–§29 (ADR-037).
> Primary reference: [`docs/design/reference-v2.png`](design/reference-v2.png).
> Screens: [`docs/design/screens-v2/`](design/screens-v2/) (390 and 320 px).

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

Attribute identity hues (recognition only, never status):
`--attr-endurance #5fd4ee`, `--attr-strength` gold, `--attr-power` gold-bright,
`--attr-core #ea9a5b`, `--attr-mobility #8ad0dc`, `--attr-agility #b8e07a`,
`--attr-recovery #b7a4f2` (moon violet — the one hue outside the brief's
palette), `--attr-overall` cream.

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

## 3. Typography

| Role | Face | Used for |
|---|---|---|
| Product | **Barlow** (400–700) | Body, forms, descriptions |
| Product condensed | **Barlow Semi Condensed** (500–700) | Headings, labels, navigation, buttons, **every metric** |
| Fantasy display | **Cinzel** (600–700) | Wordmark, Boss names, "Initialized.", "Initializing." — nothing else |

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

`/design`, `/design/boss`, `/design/workout` show every state. They are
**visual review only**, enabled under `next dev` or with
`ASCEND_DESIGN_GALLERY=1`, and 404 otherwise.

## 6. Statuses

| Status | Rune | Tone | Border |
|---|---|---|---|
| Unranked | dormant diamond | muted blue-gray | dashed, no fill — **never 0** |
| Provisional | hourglass | gold | solid, soft fill |
| Verified | shield-check | teal | solid |
| Peak | crown | gold-bright | solid |
| New Peak | crown | gold-bright | brief gold pulse (2 × 480 ms) |
| Recoil | broken shield | orange | solid |
| Revenge available | flame | red → gold gradient | solid |
| Locked / scheduled | lock / hourglass | muted | dashed |
| Completed / ready / defeated | check / shield | teal | solid |

## 7. Iconography

`components/ui/pixel-icons.ts`: 23 hand-drawn 16×16 pixel icons in three
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
  world/    dusk-ruins.png, spawn-origin.png
  paths/    ascend-map.png
  bosses/   guardian-dormant.png
  quests/   training-grounds.png, campfire.png, shrine.png
  states/   sealed-gate.png, quiet-camp.png
```

- `lib/art.ts` maps **semantic ids** (`world.dusk-ruins`, `bosses.guardian-dormant`, …)
  to file, native size, fallback mood, focal point and `status`.
- Components ask for art by id (`<Artwork id="…">`). Final art replaces a file
  under the same id and aspect — no component changes.
- **All current art is placeholder** (`status: "placeholder"`), generated by
  `npm run art -w @ascend/web` (`scripts/generate-art.mjs`): original,
  procedural, seeded and deterministic. No stock or copyrighted art.
- Files are stored at native pixel size (48–200 px, 0.3–1.5 KB each) and
  scaled by the browser with `image-rendering: pixelated`.
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

- All placeholder art together is < 8 KB; heroes load eagerly, everything else
  lazily; Boss art is only requested on Boss surfaces.
- Pixel icons are inline SVG (3 paths each), no icon font or sprite request.
- Three font families, subset to Latin, self-hosted.
- No animated backgrounds; the only infinite animations are small and
  disabled under reduced motion.
