# ASCEND --- Product & Technical Specification v0.1

> **Status:** implementation specification\
> **Primary target:** mobile-first web app / installable PWA\
> **Initial athlete:** single-user personal build, architecture ready
> for multi-user\
> **Core principle:** performance determines Stats; training creates
> opportunities to improve performance.\
> **Product line:** *There is always another summit.*\
> **Important:** "ASCEND" is metaphorical progression. Do not make the
> UI look like a mountain/trail-running application.

------------------------------------------------------------------------

## 0. Instructions for Claude Code

This document is the source of truth for ASCEND v0.1.

### Implementation rules

1.  Do not invent product mechanics when this specification defines
    them.
2.  If a formula is explicitly marked `CALIBRATION_REQUIRED`, implement
    it as configurable data rather than hard-coding a guess.
3.  Preserve raw measurements permanently. Derived scores must always be
    recalculable.
4.  Every derived score must store the engine version that generated it.
5.  Mobile UX is the primary UX. Desktop is an enhancement, not the
    baseline.
6.  Build accessible semantic HTML before visual decoration.
7.  No horizontal scrolling in normal application screens.
8.  All primary actions must be comfortably usable one-handed on a
    phone.
9.  Do not use hover as the only way to reveal information.
10. Do not turn ASCEND into an XP game. Athletic Stats represent
    estimated physical capability, not points earned.
11. No fabricated precision. Low-confidence estimates must be visually
    identified as such.
12. Never equate pain with poor athletic performance. Pain is a separate
    safety/movement flag.
13. Preserve historical values when algorithms change.
14. Use strict TypeScript. Avoid `any`.
15. Prefer small composable modules and pure functions in the scoring
    engine.
16. Add tests for all scoring/progression functions before wiring them
    into UI.
17. Keep visual effects restrained. No generic neon gaming dashboard.

------------------------------------------------------------------------

# 1. Product vision

ASCEND is a personal athletic progression system.

The user is the character. Real physical capabilities are the Stats.

The fundamental loop is:

`SPAWN → ASSESS → STATS → SELECT PATHS → QUESTS → TRAIN → RESULTS → UPDATE → ADAPT → BOSS → ASCEND → ∞`

There is no final completion state.

A personal target date can exist, but the core product must not be
structured around a fixed-duration transformation program.

ASCEND must answer four questions exceptionally well:

1.  **Where am I now?**
2.  **What should I do next?**
3.  **Am I actually improving?**
4.  **What can I prove I am capable of?**

------------------------------------------------------------------------

# 2. Product vocabulary

Use these labels consistently.

-   **SPAWN** --- initial assessment/calibration process.
-   **STAT / ATTRIBUTE** --- estimated physical capacity.
-   **CURRENT** --- current estimated capability.
-   **PEAK** --- highest verified historical capability.
-   **CONFIDENCE** --- certainty of the estimate, not ability.
-   **OVERALL** --- broad athlete profile index.
-   **PATH** --- an attribute the athlete is actively prioritizing.
-   **QUEST** --- prescribed training or assessment task.
-   **BOSS** --- meaningful standardized challenge.
-   **READINESS** --- how closely current evidence matches a Boss's
    requirements.
-   **ATTEMPT** --- actual Boss attempt.
-   **RECOIL** --- recovery/rebuild period following an unsuccessful
    Boss attempt.
-   **REVENGE AVAILABLE** --- Boss can be attempted again.
-   **MOVEMENT FLAG** --- pain/symptom/safety observation, separate from
    score.
-   **VERIFIED** --- supported by sufficiently strong measured evidence.
-   **PROVISIONAL** --- estimate exists but evidence is incomplete.

Avoid excessive fantasy terminology elsewhere. The app should remain
credible as an athletic tool.

------------------------------------------------------------------------

# 3. v0.1 attributes

Use these seven physical attributes:

1.  **ENDURANCE**
2.  **STRENGTH**
3.  **POWER**
4.  **CORE**
5.  **MOBILITY**
6.  **AGILITY**
7.  **RECOVERY**

`DISCIPLINE` is tracked separately as behavior/consistency and is NOT a
physical Stat and is NOT included directly in Overall v0.1.

Speed is captured as evidence within Power/Agility/Endurance until there
is enough product need to make SPEED an independent Stat.

## Stat shape

``` ts
type AttributeKey =
  | "endurance"
  | "strength"
  | "power"
  | "core"
  | "mobility"
  | "agility"
  | "recovery";

interface AthleteStat {
  attribute: AttributeKey;
  current: number | null;       // internal decimal 0..100
  peak: number | null;          // internal decimal 0..100
  confidence: number;           // 0..1
  status: "unranked" | "provisional" | "verified";
  engineVersion: string;
  calculatedAt: string;
}
```

UI rounds Current/Peak to integers. Calculations retain decimals.

------------------------------------------------------------------------

# 4. Score semantics

A score is an estimate of capability on ASCEND's normalized scale. It is
not a percentile unless a future engine explicitly uses validated
normative distributions.

Conceptual bands:

     Score Internal interpretation
  -------- -------------------------------------------------------------
      0--9 very limited evidence/capability at bottom of modeled range
    10--19 absolute beginner
    20--29 beginner
    30--39 established base
    40--49 recreational
    50--59 trained
    60--69 advanced
    70--79 highly trained
    80--89 competitive
    90--94 elite reference range
    95--99 exceptional
       100 reference ceiling

These labels are **internal calibration language** in v0.1. Do not
prominently label users "elite", "beginner", etc. until calibration has
been validated.

### Nonlinearity

Scores must become progressively harder to gain.

Never implement a universal formula such as:

`10 push-ups = Strength 20`.

Each measurement is transformed by a **versioned scoring curve**.

``` ts
interface ScoringCurve {
  id: string;
  testKey: string;
  version: string;
  sexMode?: "neutral" | "sex_specific";
  ageBand?: string;
  bodyMassMode?: "absolute" | "relative" | "mixed";
  points: Array<{
    raw: number;
    score: number;
  }>;
}
```

Use monotonic piecewise-linear interpolation between configured points
in v0.1.

This lets calibration change without rewriting application code.

------------------------------------------------------------------------

# 5. Evidence model

Every measurement has an evidence strength.

Recommended v0.1 base weights:

  Evidence                         Base weight
  ------------------------------ -------------
  Standardized Boss result                1.00
  Standardized assessment/test            0.90
  Verified workout performance            0.55
  Ordinary structured workout             0.25
  Self-report                             0.10

These are update weights, not direct Stat points.

A workout being completed must never directly mean `+X Stat`.

### Measurement record

``` ts
interface PerformanceEvidence {
  id: string;
  athleteId: string;
  sourceType:
    | "spawn_test"
    | "reassessment"
    | "workout"
    | "boss"
    | "wearable"
    | "manual";
  testKey?: string;
  occurredAt: string;
  rawPayload: Record<string, unknown>;
  quality: number;             // 0..1
  evidenceWeight: number;      // 0..1
  engineVersion?: string;
}
```

Raw evidence is immutable except explicit correction/audit.

------------------------------------------------------------------------

# 6. Confidence model

Confidence answers:

> "How certain is ASCEND that this Stat currently represents the
> athlete?"

It must not answer:

> "How good is the athlete?"

Initial state: `0`.

Confidence increases with:

-   multiple relevant tests;
-   recent evidence;
-   diverse evidence;
-   repeated consistent measurements;
-   wearable data where appropriate.

Confidence decreases with:

-   stale evidence;
-   conflicting measurements;
-   missing important subdomains;
-   long inactivity.

### v0.1 confidence calculation

For each attribute define required evidence domains.

Example Strength:

-   push
-   squat/knee dominant
-   hinge
-   pull
-   carry/grip

Calculate:

``` text
coverage = covered_weight / total_domain_weight
recency = weighted recency factor
repeatability = consistency factor
quality = weighted evidence quality

confidence =
  0.45 * coverage +
  0.25 * recency +
  0.15 * repeatability +
  0.15 * quality
```

Clamp 0..1.

For v0.1, `repeatability` can default to 0.5 until at least two
comparable observations exist.

Status:

``` text
UNRANKED     score == null
PROVISIONAL  confidence < 0.70
VERIFIED     confidence >= 0.70
```

Do not hide the score merely because confidence is low.

------------------------------------------------------------------------

# 7. Current and Peak

`CURRENT` is the best current estimate.

`PEAK` is the highest sufficiently verified historical Current value.

Peak changes only when:

-   new Current exceeds previous Peak;
-   confidence is at least the configured verification threshold;
-   evidence is not flagged invalid.

Peak does not decay.

Current can regress when evidence supports regression or becomes stale.

Do not aggressively decrease Stats merely because the user misses one
workout.

------------------------------------------------------------------------

# 8. Overall

Overall must not be a simple arithmetic mean because one extreme Stat
should not fully mask severe weaknesses.

v0.1 formula:

``` text
weightedMean =
  Endurance * .18 +
  Strength  * .18 +
  Power     * .12 +
  Core      * .14 +
  Mobility  * .12 +
  Agility   * .12 +
  Recovery  * .14

lowestThree = mean(three lowest available Stats)

Overall = 0.80 * weightedMean + 0.20 * lowestThree
```

Only available Stats participate; renormalize weights when a Stat is
unranked.

Overall confidence = weighted mean of participating Stat confidences.

Display `OVERALL — UNRANKED` until at least Endurance, Strength, Core,
Mobility and Agility have provisional scores.

**Engine version this formula.**

------------------------------------------------------------------------

# 9. Profile data

Store separately from measured/derived data.

Initial profile fields:

-   display name
-   date of birth
-   biological sex if the athlete chooses to provide it and a test
    genuinely requires sex-specific normalization
-   height
-   current weight
-   preferred units
-   training experience
-   recent inactivity
-   equipment inventory
-   available environments
-   weekly availability
-   usual wake/sleep schedule (optional)
-   primary wearable/data sources
-   injuries/limitations as optional user-entered notes

Do not infer medical diagnoses.

------------------------------------------------------------------------

# 10. Body composition

Not a v0.1 core blocker.

Store:

-   weight
-   estimated body fat %
-   muscle-related scale metrics when available
-   waist
-   chest
-   hip
-   thigh
-   arm
-   optional photos
-   source

Create a Body Checkpoint every stable 5 kg threshold crossed.

Do not generate future body shape as fact.

Avatar is an estimated neutral anatomical visualization only.

Body-composition score is NOT an athletic Stat.

------------------------------------------------------------------------

# 11. SPAWN

First meaningful app experience must be Spawn, not an empty dashboard.

## Spawn states

``` text
NOT_STARTED
BODY_PROFILE
MOVEMENT_PENDING
MOVEMENT_COMPLETE
FRAME_PENDING
FRAME_COMPLETE
ENGINE_PENDING
ENGINE_COMPLETE
CALIBRATING
COMPLETE
```

Allow the user to leave and resume.

Never lose an assessment in progress.

## SPAWN 0 --- BODY / CONTEXT

Capture:

-   height
-   weight
-   optional body fat
-   optional circumferences
-   equipment
-   availability
-   environments
-   wearable sources

Then show:

``` text
OVERALL — UNRANKED
ENDURANCE — UNRANKED
STRENGTH — UNRANKED
POWER — UNRANKED
CORE — UNRANKED
MOBILITY — UNRANKED
AGILITY — UNRANKED
RECOVERY — UNRANKED
```

------------------------------------------------------------------------

# 12. SPAWN 01 --- MOVEMENT

Target duration: \~25--30 min.

Primary attributes: Mobility, Agility, Core.

### M01 Deep Squat

3 attempts.

Record:

-   depth: above_parallel / parallel / below_parallel
-   heels: grounded / lift
-   control: stable / compensation / balance_loss
-   pain flag + optional location/note

### M02 Ankle Wall Test

Record centimeters separately:

-   left
-   right

Derived:

-   mean
-   absolute asymmetry
-   percentage asymmetry

### M03 Shoulder Mobility

Both orientations.

Record gap category or preferably actual centimeters when measurable.

Also record pain separately.

### M04 Single-Leg Balance

2 attempts per side, maximum 60 seconds.

Store every attempt and best side result.

### M05 Sit & Reach

Store signed centimeters relative to toes.

### M06 Dead Bug Control

10 reps/side target.

Record:

-   clean
-   completed_with_compensation
-   unable

Future version should allow rep-level quality.

### M07 Controlled Agility Baseline

5m × 3m rectangle.

Movement sequence:

forward → lateral → backward → lateral.

One practice attempt; three recorded attempts; \~90 sec recovery.

Record:

-   time
-   errors
-   balance loss
-   pain flag

After Movement:

Mobility and Agility may become Provisional. Core remains partial until
Frame.

------------------------------------------------------------------------

# 13. SPAWN 02 --- FRAME

Target duration: \~40--50 min.

Primary attributes: Strength, Core. Power remains low-confidence
initially.

Warm-up is instructional and not scored.

### F01 Push

Use standard push-up if technically possible.

Record clean reps.

If unavailable, use incline push-up and record incline height so results
are not treated as equivalent.

### F02 Goblet Squat

Progress controlled loads.

Suggested available sequence can adapt to inventory.

Record:

-   load
-   clean reps
-   RPE
-   technique status

Maximum assessment set target: 10 clean reps.

Do not require failure.

### F03 Hinge

Use standardized KB deadlift for initial Spawn.

Record total load × clean reps, RPE and technique.

### F04 Pull

Bent-over row when no pull-up apparatus exists.

Record unilateral/bilateral setup explicitly.

### F05 Farmer Carry

Record:

-   total external load
-   duration
-   distance if available
-   limiting factor
-   posture failure / grip failure / voluntary stop

Maximum initial standardized duration: 60 sec.

### F06 Plank

Maximum technical hold 120 sec.

Stop when position is lost, not at physiological collapse.

### Power

Do not force a maximal explosive test in initial Spawn for a detrained
athlete.

Power receives provisional/low-confidence estimate only if usable
evidence exists. Otherwise keep it unranked until safe power
observations accumulate.

------------------------------------------------------------------------

# 14. SPAWN 03 --- ENGINE

Primary attributes: Endurance, Recovery.

Prefer flat standardized terrain for initial baseline.

### E01 Resting baseline

5 minutes calm.

Capture wearable HR if available.

### E02 6-minute brisk walk

Fastest sustainable walk without running.

Record:

-   distance
-   average HR
-   max HR
-   average pace
-   optional cadence

### E03 Heart-rate recovery

Capture:

-   HR at stop
-   HR +1 minute
-   HR +2 minutes

Store absolute drops and raw readings.

Do not treat HR recovery alone as a medical diagnostic.

### E04 20-minute run/walk

Instruction:

> Move at an intensity you believe you can sustain for the entire test.
> Walking is allowed.

Record:

-   total distance
-   average pace
-   average HR
-   max HR
-   run time
-   walk time
-   RPE 1--10
-   limiting factor: breath / legs / pain / pacing / could_continue /
    other

Pain generates a separate flag.

------------------------------------------------------------------------

# 15. Spawn scoring architecture

Do not bake unvalidated thresholds into components.

Pipeline:

``` text
RAW TEST
  ↓
VALIDATION
  ↓
TEST-SPECIFIC FEATURE EXTRACTION
  ↓
VERSIONED NORMALIZATION CURVE
  ↓
SUBDOMAIN SCORE
  ↓
ATTRIBUTE AGGREGATION
  ↓
CONFIDENCE
  ↓
CURRENT
```

### Attribute subdomains

**Endurance** - sustained locomotion - cardiovascular response -
pace/distance performance - future longer-duration evidence

**Strength** - push - pull - knee dominant - hinge - carry/grip

**Core** - anti-extension/control - bracing - loaded stability - future
anti-rotation/lateral stability

**Mobility** - ankle - hip/squat pattern - shoulder - posterior chain

**Agility** - balance/control - change of direction - movement
accuracy - future reactive agility

**Power** - explosive lower body - explosive hinge - future throw/push -
rate-oriented performance

**Recovery** - acute HR recovery - sleep/recovery trend - workload
response - subjective recovery

Each subdomain has a configured weight.

`CALIBRATION_REQUIRED`: actual raw-to-score curves. Build seed
configuration files with conservative placeholder curves clearly marked
as v0.1 calibration, never present them as validated population norms.

------------------------------------------------------------------------

# 16. Updating Stats from new evidence

Use a conservative evidence-based update rather than awarding points.

If new evidence implies an observed attribute score `O`, Current `C`,
evidence weight `w`, evidence quality `q`:

``` text
effectiveWeight = w * q * confidenceAdjustment
candidate = C + effectiveWeight * (O - C)
```

Apply per-update movement caps:

``` text
ordinary workout: max ±1.0
verified workout performance: max ±2.0
standard assessment: max ±5.0
Boss: max ±8.0
```

Caps are configuration values.

When Current is null, initialize from assessment aggregation rather than
this incremental rule.

### Asymmetry

Positive evidence can move a score upward.

Poor evidence can move it downward.

A single anomalous session should have low quality or be dampened by
consistency checks.

------------------------------------------------------------------------

# 17. Regression / detraining

Do NOT decrease Stats daily just because time passes.

v0.1:

-   0--14 days without relevant evidence: no decay.

-   15--30: confidence recency decreases.

-   30: Current may gradually regress toward a conservative
    > retained-capacity floor.

-   Recovery and Endurance can react faster than maximal Strength.

-   Mobility may change based on direct evidence rather than aggressive
    time decay.

Implement decay parameters per attribute in configuration.

Never change Peak through decay.

------------------------------------------------------------------------

# 18. Paths

Paths are attribute priorities, not sports.

The athlete can activate multiple:

-   Endurance Path
-   Strength Path
-   Power Path
-   Core Path
-   Mobility Path
-   Agility Path
-   Recovery Path

Each active path has priority:

`PRIMARY | SECONDARY | MAINTAIN`

A Quest can contribute to multiple Paths.

Example:

``` text
Farmer Carry
Strength + Core
```

Sports/goals are not Paths.

------------------------------------------------------------------------

# 19. Quest Engine

The engine generates a weekly plan using:

1.  active Paths;
2.  Current Stats;
3.  Confidence gaps;
4.  recent workload;
5.  equipment;
6.  available days/time;
7.  recovery state;
8.  movement flags;
9.  Boss preparation if active;
10. missed/modified recent Quests.

### Quest categories

-   TRAIN
-   ASSESS
-   RECOVER
-   MOBILITY
-   BOSS_PREP
-   BOSS_ATTEMPT

### Quest generation priorities

1.  Do not create unsafe workload jumps.
2.  Satisfy Primary Paths.
3.  Maintain important non-primary capacities.
4.  Improve low-confidence areas with occasional assessment.
5.  Combine compatible goals efficiently.
6.  Respect available time.
7.  Avoid repeatedly loading the same tissues/patterns without recovery.
8.  Adapt, do not punish, after missed sessions.

### Quest data

``` ts
interface Quest {
  id: string;
  athleteId: string;
  title: string;
  category: QuestCategory;
  scheduledDate: string | null;
  estimatedMinutes: number;
  targetAttributes: Array<{
    attribute: AttributeKey;
    contribution: number;
  }>;
  blocks: WorkoutBlock[];
  status:
    | "planned"
    | "active"
    | "completed"
    | "modified"
    | "skipped";
  rationale: string;
  generatedByEngineVersion: string;
}
```

Every generated Quest must have a machine-readable rationale and a short
human-readable rationale.

Example:

> **WHY THIS QUEST**\
> Endurance is a Primary Path. Your last two sessions were completed
> within target effort, so today's duration increases slightly while
> intensity remains controlled.

Do not show opaque AI decisions.

------------------------------------------------------------------------

# 20. Progression rules

Training progression must be based on performance and tolerance.

For an exercise/session dimension, progress only if:

-   target was completed;
-   technique acceptable;
-   RPE within expected range;
-   no relevant pain flag;
-   recovery/workload rules permit progression.

Possible progression dimensions:

-   reps
-   load
-   duration
-   distance
-   pace
-   density
-   complexity
-   range of motion

Change one major dimension at a time where practical.

If performance is below target:

-   first distinguish pacing/fatigue/sleep/pain/technical cause;
-   repeat, reduce, or substitute;
-   do not automatically reduce the athlete's global Stat.

------------------------------------------------------------------------

# 21. Workout player

This is one of the most important mobile screens.

Design for sweaty hands and quick glances.

Requirements:

-   large current exercise title;
-   very large target;
-   large timer;
-   huge `COMPLETE SET` / `NEXT` button;
-   previous performance visible but secondary;
-   swipe should never accidentally finish a set;
-   screen stays useful at narrow widths;
-   optional wake-lock where browser support permits;
-   rest timer starts automatically after set completion;
-   haptic feedback where supported;
-   offline-safe local persistence for an active workout;
-   sync when connection returns.

During active workout, bottom navigation can collapse to prevent
accidental navigation.

### Logging

Depending on exercise:

-   load
-   reps
-   duration
-   distance
-   RPE
-   technique
-   completion
-   pain flag
-   note

Minimize typing.

Use steppers, chips and large touch controls.

------------------------------------------------------------------------

# 22. Boss Engine

Bosses are standardized meaningful challenges.

Types:

-   `SINGLE_ATTRIBUTE`
-   `COMPOSITE`

Examples of composite concepts: marathon, hybrid event, custom
challenge.

Do not hard-code sport paths.

### Boss model

``` ts
interface Boss {
  id: string;
  slug: string;
  title: string;
  type: "single_attribute" | "composite";
  description: string;
  requirements: BossRequirement[];
  protocol: BossProtocol;
  recoilPolicy: RecoilPolicy;
  active: boolean;
}
```

### Readiness

Readiness is NOT probability of success.

Calculate a requirement-satisfaction index.

For requirement `r`:

``` text
ratio = currentStat / requiredStat
requirementReadiness = clamp(ratio, 0, 1)
```

Composite readiness uses weighted geometric mean so a severe weakness
matters:

``` text
R = exp(sum(weight_i * ln(max(r_i, epsilon))) / sum(weights))
```

Multiply by a confidence modifier:

``` text
confidenceModifier = 0.85 + 0.15 * weightedConfidence
displayReadiness = R * confidenceModifier
```

Display as percentage but label **READINESS**, never "chance to win."

### Attempt anytime

The user can attempt any Boss regardless of Readiness.

Show warnings/information where appropriate, but do not artificially
lock the challenge unless a genuine safety requirement demands it.

### Boss defeated

If protocol is successfully completed:

``` text
BOSS DEFEATED
```

Record performance as very strong evidence.

If result greatly exceeds predicted capability, trigger recalibration:

``` text
YOU EXCEEDED EXPECTATIONS
ASCEND IS RECALIBRATING YOUR PROFILE
```

### Boss not defeated

Show:

``` text
BOSS NOT DEFEATED
```

Then:

-   what happened;
-   limiting factors based on measured evidence/user feedback;
-   relevant attribute gaps;
-   recovery/rebuild plan.

Apply configured Recoil.

After Recoil:

``` text
REVENGE AVAILABLE
```

Never use humiliating failure language.

------------------------------------------------------------------------

# 23. Discipline

Track behavior separately:

-   planned sessions
-   completed
-   modified
-   skipped
-   streaks (secondary)
-   adherence over rolling 7/28 days

Do not make streak preservation more important than recovery.

A rest day prescribed by ASCEND counts as following the plan.

Never reduce Strength/Endurance merely because Discipline is low.

------------------------------------------------------------------------

# 24. Recovery

v0.1 can operate without sleep data.

Inputs may include:

-   resting HR
-   HR recovery
-   sleep duration
-   sleep consistency
-   wearable-derived data
-   recent training load
-   subjective energy
-   soreness
-   perceived sleep quality

Recovery is an athletic readiness/capacity estimate, not a diagnosis.

Use source metadata for every wearable measurement.

Do not assume Apple Health is directly readable by a normal browser.

### Integration strategy

**v0.1 web/PWA** - manual input; - imported/synced data only through
supported server/API flows; - preserve provider abstraction.

**future** - iOS/native companion or React Native bridge for
HealthKit; - background sync where platform rules allow.

Provider interface:

``` ts
interface HealthDataProvider {
  getRestingHeartRate(range: DateRange): Promise<Measurement[]>;
  getWorkouts(range: DateRange): Promise<WorkoutImport[]>;
  getSleep(range: DateRange): Promise<SleepRecord[]>;
  getBodyMass(range: DateRange): Promise<Measurement[]>;
}
```

Do not couple core engine to Apple.

------------------------------------------------------------------------

# 25. Information architecture

Primary mobile navigation: **5 destinations maximum**.

Recommended:

1.  **TODAY**
2.  **STATS**
3.  **ASCEND** (central primary action / Paths & progression)
4.  **BOSSES**
5.  **PROFILE**

During Spawn, replace normal app shell with a focused assessment flow.

### Today

Default home after Spawn.

Contains:

-   greeting/date (subtle);
-   Recovery/Readiness summary;
-   today's primary Quest;
-   next Quest;
-   relevant alert/flag;
-   compact weekly progress.

Do not dump seven charts on Home.

### Stats

-   Overall
-   7 attribute cards
-   Current / Peak
-   Confidence
-   trend
-   verified evidence
-   tap for detail

### Ascend

-   active Paths
-   progression
-   weekly Quest plan
-   upcoming reassessment
-   goal/Boss preparation

### Bosses

-   active/preparing
-   available Boss library
-   Readiness
-   attempts/history
-   recoil/revenge

### Profile

-   body
-   equipment
-   availability
-   data sources
-   history
-   settings

------------------------------------------------------------------------

# 26. Mobile-first UX specification

Primary design widths:

``` text
320 px   minimum supported
360 px   common small Android
375 px   compact iPhone
390/393  primary design reference
430 px   large phone
768+     tablet enhancement
1024+    desktop enhancement
```

**Design and QA at 390px first.**

Never design desktop and shrink it.

### Safe areas

Support iOS safe areas:

``` css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

Bottom navigation must include safe-area padding.

### Touch targets

Minimum interactive target:

`44 × 44px`

Preferred primary controls:

`48–56px` high.

Spacing between adjacent destructive/important controls must prevent
mis-taps.

### Forms

-   inputs at least `48px` high;
-   input font-size \>= `16px` to avoid iOS zoom;
-   labels always visible;
-   use numeric keyboards with `inputmode`;
-   avoid long select menus when chips/segmented controls work;
-   persist partially completed forms.

### One-handed operation

Primary CTA belongs near the lower portion of the viewport.

Do not place the only Continue button at the top.

Sticky bottom action area is preferred for linear flows.

### Bottom navigation

Approximate visible height: `64px + safe-area`.

Icons + short labels.

Active destination must be obvious without relying on color alone.

### Modals

On mobile, prefer bottom sheets for short contextual actions.

Use full-screen flows for complex forms/assessments.

Avoid tiny centered desktop modals.

------------------------------------------------------------------------

# 27. Visual direction

## Personality

ASCEND should feel:

-   premium;
-   calm;
-   athletic;
-   precise;
-   modern;
-   human-performance focused;
-   slightly game-like through mechanics, not decoration.

It must NOT feel:

-   cyberpunk;
-   esports;
-   generic SaaS;
-   military;
-   CrossFit cliché;
-   mountain/trail-specific;
-   childish RPG.

### Core visual metaphor

Progress through:

-   rising lines;
-   levels;
-   rings;
-   trajectories;
-   measurement;
-   evolving body;
-   increasingly capable movement.

Mountains can appear rarely as a metaphorical accent, never as the main
design language.

------------------------------------------------------------------------

# 28. CSS design tokens

Implement with CSS custom properties. Components must consume semantic
tokens rather than raw hex values.

Suggested v0.1 palette:

``` css
:root {
  /* Surfaces */
  --color-bg: #F4F1E8;
  --color-surface: #FAF8F2;
  --color-surface-raised: #FFFFFF;
  --color-surface-subtle: #ECE9DF;

  /* Ink */
  --color-ink: #10251D;
  --color-ink-strong: #081712;
  --color-ink-muted: #66736C;
  --color-ink-faint: #929B95;

  /* Brand */
  --color-brand: #173E30;
  --color-brand-strong: #0E2C22;
  --color-brand-soft: #DDE8E1;

  /* Functional */
  --color-success: #2F684D;
  --color-warning: #9A6B25;
  --color-danger: #A6463C;
  --color-info: #486B75;

  /* Boss surfaces */
  --color-boss-bg: #10231C;
  --color-boss-surface: #173128;
  --color-boss-ink: #F6F3EA;
  --color-boss-muted: #AAB9B1;

  /* Lines */
  --color-border: rgba(16, 37, 29, 0.12);
  --color-border-strong: rgba(16, 37, 29, 0.22);

  /* Radius */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-pill: 999px;

  /* Spacing — 4px base */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shadows — restrained */
  --shadow-sm: 0 1px 2px rgba(8, 23, 18, 0.06);
  --shadow-md: 0 8px 28px rgba(8, 23, 18, 0.08);
  --shadow-sheet: 0 -12px 40px rgba(8, 23, 18, 0.12);

  /* Motion */
  --duration-fast: 140ms;
  --duration-normal: 220ms;
  --duration-slow: 360ms;
  --ease-standard: cubic-bezier(.2,.8,.2,1);

  /* Layout */
  --page-max: 1180px;
  --mobile-gutter: 16px;
  --desktop-gutter: 32px;
  --bottom-nav-height: 64px;
}
```

Palette can be visually tuned, but preserve semantic structure and
warm-cream/dark-green direction.

------------------------------------------------------------------------

# 29. Typography

Use a clean modern sans-serif available through a web-safe/self-hostable
strategy. Avoid depending on a proprietary font.

Recommended stack:

``` css
--font-sans:
  Inter,
  ui-sans-serif,
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "Segoe UI",
  sans-serif;
```

Typography should use `clamp()` where useful.

``` css
.text-display {
  font-size: clamp(2.25rem, 9vw, 4.75rem);
  line-height: .92;
  letter-spacing: -0.055em;
  font-weight: 650;
}

.text-h1 {
  font-size: clamp(1.8rem, 7vw, 3rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  font-weight: 650;
}

.text-h2 {
  font-size: clamp(1.35rem, 5vw, 2rem);
  line-height: 1.1;
  letter-spacing: -0.025em;
  font-weight: 620;
}

.text-body {
  font-size: 1rem;
  line-height: 1.5;
}

.text-meta {
  font-size: .8125rem;
  line-height: 1.35;
  letter-spacing: .02em;
}
```

Use uppercase sparingly for game-system labels such as `BOSS`,
`UNRANKED`, `CURRENT`, not for paragraphs.

Numeric Stats can use tabular numerals:

``` css
.stat-number {
  font-variant-numeric: tabular-nums;
}
```

------------------------------------------------------------------------

# 30. Global CSS baseline

``` css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  background: var(--color-bg);
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea,
select {
  font: inherit;
}

button,
a,
[role="button"] {
  -webkit-tap-highlight-color: transparent;
}

button {
  touch-action: manipulation;
}

img,
svg,
canvas {
  display: block;
  max-width: 100%;
}

:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-brand), white 35%);
  outline-offset: 3px;
}

.app-page {
  width: min(100%, var(--page-max));
  margin-inline: auto;
  padding-inline: var(--mobile-gutter);
  padding-bottom:
    calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 24px);
}

@media (min-width: 768px) {
  .app-page {
    padding-inline: var(--desktop-gutter);
  }
}
```

------------------------------------------------------------------------

# 31. Layout system

Use CSS Grid/Flexbox, not absolute positioning for structural layout.

Mobile:

-   single column;
-   cards full width;
-   avoid nested cards where possible.

Tablet:

-   selective 2-column areas.

Desktop:

-   max-width content;
-   dashboard may use 12-column grid;
-   do not stretch text/cards across giant monitors.

Example:

``` css
.dashboard-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .dashboard-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
}
```

------------------------------------------------------------------------

# 32. Core component styles

### Card

``` css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.card--raised {
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-sm);
}
```

Do not put shadows on everything.

### Primary button

``` css
.btn-primary {
  min-height: 52px;
  width: 100%;
  border: 0;
  border-radius: var(--radius-pill);
  padding: 0 22px;
  background: var(--color-brand);
  color: white;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
}

.btn-primary:active {
  transform: scale(.985);
}

.btn-primary:disabled {
  opacity: .45;
  cursor: not-allowed;
}
```

Desktop may make CTA auto-width where appropriate; mobile primary flow
remains full-width.

### Chips

Minimum 44px touch height.

Selected state must have shape/border/weight change, not color alone.

------------------------------------------------------------------------

# 33. Sticky mobile action bar

Assessment/onboarding screens:

``` css
.mobile-action-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  margin-inline: calc(var(--mobile-gutter) * -1);
  padding:
    12px
    var(--mobile-gutter)
    calc(12px + env(safe-area-inset-bottom));
  background:
    linear-gradient(
      to top,
      var(--color-bg) 72%,
      rgba(244, 241, 232, 0)
    );
}
```

Ensure content cannot be obscured by it.

------------------------------------------------------------------------

# 34. Bottom navigation CSS

``` css
.bottom-nav {
  position: fixed;
  z-index: 50;
  left: 0;
  right: 0;
  bottom: 0;
  min-height:
    calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: color-mix(in srgb, var(--color-surface) 94%, transparent);
  border-top: 1px solid var(--color-border);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.bottom-nav__inner {
  height: var(--bottom-nav-height);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  max-width: 600px;
  margin-inline: auto;
}

.bottom-nav__item {
  min-width: 0;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--color-ink-muted);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
}

.bottom-nav__item[aria-current="page"] {
  color: var(--color-brand-strong);
}
```

Provide fallback if `backdrop-filter` unsupported.

------------------------------------------------------------------------

# 35. Stat cards

A Stat card must communicate:

1.  Attribute
2.  Current
3.  Peak
4.  Confidence
5.  Direction/trend
6.  status

Do not use seven different colors for seven Stats.

Use typography, bar/ring geometry and subtle emphasis.

Example hierarchy:

``` text
ENDURANCE                   VERIFIED

42
CURRENT

PEAK 47            ↑ 3 / 28 DAYS

Confidence ━━━━━━━━━━━ 82%
```

Confidence should not visually compete with Current.

Unranked:

``` text
POWER
—
UNRANKED
Complete an assessment to establish your baseline.
```

------------------------------------------------------------------------

# 36. Charts

Charts must be legible on \~350px content width.

Rules:

-   no chart legends requiring horizontal scrolling;
-   maximum 2--3 series on phone;
-   touch targets for data points;
-   tooltips accessible via tap;
-   axes labels abbreviated;
-   use 7d / 28d / 3m / 1y filters;
-   default to useful range, not all history;
-   don't use radar chart as the only way to read Stats.

Radar can be secondary athlete-profile visualization.

------------------------------------------------------------------------

# 37. Boss visual language

Boss screens can invert into dark green.

This is the primary dramatic contrast in the product.

``` css
.boss-hero {
  background: var(--color-boss-bg);
  color: var(--color-boss-ink);
  border-radius: var(--radius-xl);
  padding: clamp(20px, 6vw, 36px);
}
```

Use large typography and restrained motion.

No flames, skulls, fantasy monsters or neon unless a future explicit art
direction changes this.

A Boss is dramatic because the challenge matters, not because the UI
screams.

------------------------------------------------------------------------

# 38. Avatar/body visualization

Style:

-   neutral gray 3D anatomical mannequin;
-   faceless;
-   monochrome;
-   no photorealistic skin;
-   no body-shaming visual language;
-   front / side / back;
-   derived from measured data where possible.

Label explicitly:

`ESTIMATED BODY MODEL`

Do not claim exact body reconstruction.

Keep this feature modular; v0.1 can initially use a placeholder/model
shell.

------------------------------------------------------------------------

# 39. Motion

Motion should communicate state/progression.

Allowed:

-   card entrance;
-   progress interpolation;
-   number transitions;
-   Boss state transition;
-   successful set confirmation;
-   bottom sheet.

Avoid constant ambient animation.

Respect:

``` css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

------------------------------------------------------------------------

# 40. Accessibility

Target WCAG 2.2 AA where practical.

Requirements:

-   semantic headings;
-   labels connected to controls;
-   sufficient contrast;
-   keyboard usable desktop;
-   visible focus;
-   44px targets;
-   status not encoded only by color;
-   `aria-live` for timer/state changes only where useful;
-   charts have textual summaries;
-   avoid motion dependence;
-   buttons have explicit accessible names;
-   loading skeletons do not create inaccessible content churn.

------------------------------------------------------------------------

# 41. PWA / mobile platform behavior

v0.1 should be installable as a PWA.

Include:

-   web manifest;
-   icons;
-   theme/background colors;
-   standalone display;
-   service worker/offline strategy;
-   offline active-workout persistence;
-   installable mobile shell.

Use `100dvh`, not blindly `100vh`.

Handle:

-   safe areas;
-   keyboard opening;
-   portrait orientation as primary;
-   landscape gracefully;
-   interrupted app sessions;
-   page visibility changes.

Do not make essential functionality depend on PWA installation.

------------------------------------------------------------------------

# 42. Performance targets

Mobile performance is product functionality.

Targets:

-   avoid shipping heavy chart/3D code on initial Today screen;
-   route-level code splitting;
-   lazy-load body/avatar module;
-   lazy-load complex charts;
-   optimize icons as SVG;
-   avoid large background images;
-   minimize client JS;
-   server-render where appropriate;
-   cache static reference data.

Aim for good Core Web Vitals on mid-range mobile hardware.

Do not add a giant UI framework solely for simple components.

------------------------------------------------------------------------

# 43. Technology

Recommended:

``` text
Next.js (App Router)
React
TypeScript strict
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Python ASCEND Engine
Vercel
PWA
```

Styling recommendation:

-   CSS Modules + global token file, OR
-   Tailwind only if all semantic design tokens are centralized and
    components do not become unreadable utility dumps.

For this product, prefer **CSS Modules + semantic CSS variables** for
precise visual control.

Use a lightweight accessible primitive library only where it saves real
accessibility work (dialog/sheet etc.).

------------------------------------------------------------------------

# 44. Repository

``` text
ascend/
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── lib/
│       ├── styles/
│       │   ├── tokens.css
│       │   ├── globals.css
│       │   └── utilities.css
│       ├── public/
│       └── tests/
├── engine/
│   ├── ascend_engine/
│   │   ├── assessment/
│   │   ├── scoring/
│   │   ├── confidence/
│   │   ├── progression/
│   │   ├── quests/
│   │   ├── bosses/
│   │   ├── recovery/
│   │   └── config/
│   └── tests/
├── packages/
│   └── shared/
├── supabase/
│   ├── migrations/
│   └── seed/
├── docs/
│   └── ASCEND_SPEC.md
└── README.md
```

------------------------------------------------------------------------

# 45. Backend architecture

Supabase is source of truth for persisted user data.

Python engine owns domain calculations.

Do not duplicate scoring logic independently in frontend.

Frontend may compute display-only transformations.

Suggested flow:

``` text
React UI
  ↓
Next.js server/API layer
  ↓
Supabase + ASCEND Python Engine
  ↓
Derived result persisted with engine_version
```

For early personal deployment, Python may be exposed through a small
service or executed in an appropriate backend environment. Keep a clean
interface so hosting can change later.

------------------------------------------------------------------------

# 46. Database schema

Minimum tables:

``` text
profiles
athlete_settings
equipment
athlete_equipment
availability_windows

body_measurements

assessment_sessions
assessment_tests
assessment_results
movement_flags

performance_evidence

stat_snapshots
overall_snapshots

paths
athlete_paths

quest_weeks
quests
quest_blocks
exercise_sets
workout_sessions
workout_results

bosses
boss_requirements
boss_attempts
recoil_periods

health_sources
health_measurements

engine_versions
scoring_curves
engine_config
```

All athlete-owned tables require RLS.

Use UUID primary keys.

Use `created_at`, `updated_at` consistently.

Store units explicitly or normalize to SI internally with display
conversion.

------------------------------------------------------------------------

# 47. Important database principles

### Raw vs derived

Never overwrite raw result because a formula changed.

Example:

``` text
assessment_result
distance_m = 1510
duration_s = 1200
avg_hr = 151
```

Derived:

``` text
stat_snapshot
endurance = 27.4
engine_version = "0.1.0"
```

When engine 0.2 ships, recalculate from raw evidence.

### Auditability

For every Stat update, be able to answer:

> Why did this number change?

Store calculation metadata / evidence IDs.

------------------------------------------------------------------------

# 48. RLS / security

Even though v0.1 begins with one athlete, build user isolation now.

Policies:

-   authenticated user can read/write their own profile;
-   athlete-owned records scoped by `auth.uid()`;
-   reference Boss/scoring configuration read-only to client;
-   privileged engine writes happen server-side where appropriate;
-   never expose service role key to browser.

Storage buckets for personal body images must be private.

Use signed URLs when needed.

------------------------------------------------------------------------

# 49. Routes

Suggested routes:

``` text
/
 /spawn
 /spawn/body
 /spawn/movement
 /spawn/frame
 /spawn/engine
 /today
 /stats
 /stats/[attribute]
 /ascend
 /quests/[id]
 /workout/[id]
 /bosses
 /bosses/[slug]
 /profile
 /profile/body
 /profile/equipment
 /profile/availability
 /profile/data-sources
 /settings
```

Authenticated root redirects according to Spawn state.

------------------------------------------------------------------------

# 50. Loading / error / offline states

Every data screen must define:

-   loading;
-   empty;
-   error;
-   offline;
-   stale cached data.

Do not show generic blank spinners indefinitely.

For active workout:

-   local state is authoritative until sync succeeds;
-   display subtle `Saved on device` / `Synced` state;
-   never discard completed sets due to network failure.

------------------------------------------------------------------------

# 51. Notifications

Not essential for first build, but schema should support:

-   Quest reminder;
-   recovery/reassessment;
-   Boss recoil complete;
-   Revenge available;
-   Body checkpoint.

Do not use guilt-based copy.

------------------------------------------------------------------------

# 52. Copy style

Short, confident, precise.

Good:

``` text
TODAY
45 MIN

ENDURANCE — BASE
Controlled run/walk.

WHY THIS QUEST
Your last two endurance sessions were completed within target effort.
Today we add 4 minutes, not intensity.
```

Bad:

``` text
🔥 LET'S CRUSH YOUR GOALS!!! 🔥
```

ASCEND should feel serious enough to trust.

------------------------------------------------------------------------

# 53. Spawn safety UX

Before demanding physical tests:

-   show preparation;
-   allow `I can't perform this`;
-   allow pain flag;
-   allow test abort;
-   never interpret an aborted painful test as zero capability;
-   preserve reason.

If pain is reported, surface appropriate caution and substitute/skip
logic rather than diagnosing.

------------------------------------------------------------------------

# 54. Engine configuration

Create versioned configuration rather than magic numbers.

Example:

``` yaml
engine_version: "0.1.0"

confidence:
  verified_threshold: 0.70

update_caps:
  ordinary_workout: 1.0
  verified_workout: 2.0
  assessment: 5.0
  boss: 8.0

decay:
  endurance:
    grace_days: 14
  strength:
    grace_days: 21
  mobility:
    grace_days: 30
```

Exact calibration can evolve.

------------------------------------------------------------------------

# 55. Testing strategy

## Engine unit tests

Mandatory for:

-   interpolation;
-   score clamping;
-   aggregation;
-   missing Stats;
-   Confidence;
-   Overall;
-   Current/Peak;
-   evidence update;
-   decay;
-   Boss Readiness;
-   recoil;
-   Quest constraints.

### Property expectations

-   score always 0..100;
-   confidence always 0..1;
-   Peak never decreases;
-   lower evidence weight cannot cause a larger same-direction update
    than higher weight, all else equal;
-   successful high-quality Boss evidence can recalibrate more than
    ordinary workout;
-   missing data does not become zero.

## Frontend

Test:

-   320px viewport;
-   390px primary viewport;
-   430px;
-   tablet;
-   desktop.

Critical flows:

-   sign in;
-   resume Spawn;
-   complete assessment;
-   start/finish workout;
-   offline workout;
-   edit result;
-   activate Path;
-   Boss attempt;
-   Recoil;
-   data-source failure.

------------------------------------------------------------------------

# 56. Analytics / observability

Track product events without logging sensitive raw health content
unnecessarily.

Useful events:

``` text
spawn_started
spawn_test_completed
spawn_completed
path_activated
quest_started
quest_completed
quest_modified
quest_skipped
boss_viewed
boss_attempt_started
boss_defeated
boss_not_defeated
recoil_completed
stat_recalculated
```

Add application error monitoring before wider release.

------------------------------------------------------------------------

# 57. v0.1 scope

### MUST HAVE

-   authentication;
-   profile;
-   equipment;
-   availability;
-   Spawn 0--3;
-   raw result storage;
-   provisional Stats;
-   Confidence;
-   Overall;
-   Current/Peak;
-   Today;
-   Stats;
-   Paths;
-   manual weekly Quest generation or engine-generated basic plan;
-   workout player;
-   results;
-   one or more Boss definitions;
-   Readiness;
-   attempt;
-   recoil/revenge;
-   responsive/PWA shell;
-   offline workout persistence.

### SHOULD HAVE

-   charts;
-   body measurement timeline;
-   5 kg Body Checkpoints;
-   health-source abstraction;
-   reassessment prompts;
-   Discipline/adherence.

### LATER

-   direct HealthKit/native integration;
-   advanced 3D body reconstruction;
-   social;
-   coach mode;
-   broad athlete normative calibration;
-   automatic exercise recognition;
-   advanced reactive agility testing;
-   public Boss ecosystem.

------------------------------------------------------------------------

# 58. Initial athlete configuration for personal v0.1

Do not hard-code this into product defaults. Seed it as the initial
user's profile/configuration.

Current intended schedule pattern:

-   Monday: Endurance
-   Tuesday: Strength
-   Wednesday: Endurance
-   Thursday: Strength
-   Friday: Endurance
-   weekend: one Strength/Core day + one complete rest day

Final Quest contents must be generated after Spawn evidence exists.

Available equipment can include kettlebells, barbell/plates, jump rope,
dragging rope and hammers as entered into inventory.

Available environments may include road, flat terrain, hills, off-road
and beach.

------------------------------------------------------------------------

# 59. First-use experience

Sequence:

``` text
ASCEND
↓
CREATE PROFILE
↓
SPAWN POINT
↓
BODY / CONTEXT
↓
MOVEMENT
↓
FRAME
↓
ENGINE
↓
SPAWN COMPLETE
↓
ATHLETE PROFILE INITIALIZED
↓
CHOOSE YOUR PATHS
↓
WEEK 1 GENERATED
↓
TODAY
```

Do not require all Spawn sessions on one day.

Allow recommended rest spacing.

------------------------------------------------------------------------

# 60. Key screen: Spawn Complete

Mobile hierarchy:

``` text
SPAWN COMPLETE

ATHLETE PROFILE
INITIALIZED

OVERALL
34
PROVISIONAL

ENDURANCE       27
STRENGTH        36
POWER            —
CORE            31
MOBILITY        42
AGILITY         29
RECOVERY        33

Confidence is still building.
ASCEND will refine your profile as you train.

[ CHOOSE YOUR PATHS ]
```

Numbers above are UI example data only. Never seed them as the real
athlete's results.

------------------------------------------------------------------------

# 61. Key screen: Today

``` text
FRIDAY, 25 SEP

TODAY

ENDURANCE — BASE
38 MIN

Run / walk
Controlled aerobic work

TARGET
RPE 4–5

[ START QUEST ]

WHY THIS QUEST
Your endurance path is active and recent
work supports a small duration increase.

THIS WEEK
3 / 5 QUESTS

NEXT
Strength — Frame
Tomorrow
```

Prioritize today's action over dashboard decoration.

------------------------------------------------------------------------

# 62. Key screen: active workout

``` text
QUEST 03
ENDURANCE — BASE

12:48
elapsed

RUN / WALK

TARGET
20:00
RPE 4–5

Heart rate
146 bpm

[ PAUSE ]

----------------

After completion:

How hard was that?

1 2 3 4 [5] 6 7 8 9 10

What limited you?
[ NOTHING ]
[ BREATH ]
[ LEGS ]
[ PAIN ]
[ PACING ]

[ COMPLETE QUEST ]
```

The UI must remain usable without live wearable HR.

------------------------------------------------------------------------

# 63. Key screen: Stat detail

``` text
ENDURANCE

42
CURRENT

47
PEAK

82%
CONFIDENCE

[28D trend]

VERIFIED EVIDENCE
20 min run/walk      2.84 km
6 min walk           612 m
HR recovery 1 min    -24 bpm

ACTIVE PATH
PRIMARY

NEXT VERIFICATION
In 9 days
```

Explain changes:

``` text
WHY 42?
+ Improved sustained pace
+ Consistent recent endurance work
= High confidence
```

Avoid pretending the engine is more certain than it is.

------------------------------------------------------------------------

# 64. Key screen: Boss

``` text
BOSS

THE MARATHON

42.195 KM

READINESS
43%

ENDURANCE   51 / 82
CORE        48 / 60
STRENGTH    52 / 45  ✓
RECOVERY    46 / 70

BIGGEST GAP
Endurance

[ PREPARE FOR BOSS ]

You can attempt this Boss at any time.

[ ATTEMPT ANYWAY ]
```

Example requirements are placeholders until calibrated.

------------------------------------------------------------------------

# 65. Reassessment

ASCEND should not rerun all Spawn tests constantly.

Trigger targeted verification when:

-   Confidence is low;
-   Stat has moved materially through training evidence;
-   evidence is stale;
-   Boss preparation requires verification;
-   large unexpected performance occurs.

Call these:

`VERIFY [ATTRIBUTE]`

not another Spawn.

------------------------------------------------------------------------

# 66. Body checkpoints

When stable body weight crosses each 5 kg band from the previous
recorded checkpoint, offer:

``` text
BODY CHECKPOINT AVAILABLE
125 KG

Update measurements and your estimated body model.

[ START CHECKPOINT ]
[ LATER ]
```

Use smoothed/stable weight rather than a single dehydrated weigh-in.
Exact stability rule is configurable.

------------------------------------------------------------------------

# 67. Data portability

From early architecture, support future export of:

-   profile;
-   body measurements;
-   assessments;
-   workouts;
-   Stats history;
-   Boss attempts.

Avoid trapping core athletic history in opaque blobs.

JSON payloads are fine for test-specific extras, but important
searchable fields should be relational columns.

------------------------------------------------------------------------

# 68. Privacy

Treat body, fitness and health-related data as sensitive.

Principles:

-   collect only useful data;
-   private by default;
-   no public profile in v0.1;
-   explicit permission for future integrations;
-   clear deletion/export path;
-   private body photos;
-   no health data in analytics payloads unless strictly required and
    appropriately handled.

------------------------------------------------------------------------

# 69. Implementation milestones

## Milestone 1 --- Foundation

Deliver:

-   monorepo;
-   Next.js app;
-   Supabase local/project setup;
-   auth;
-   RLS;
-   tokens.css;
-   global mobile shell;
-   bottom nav;
-   base components;
-   PWA manifest;
-   responsive test setup.

Acceptance:

-   works cleanly at 320/390/430px;
-   installable shell;
-   no horizontal overflow;
-   authenticated navigation.

## Milestone 2 --- Profile + Spawn

Deliver:

-   onboarding;
-   equipment;
-   availability;
-   Spawn session state machine;
-   all Spawn test UIs;
-   raw persistence;
-   resume interrupted assessment;
-   flags.

Do not implement fake final scores in components.

## Milestone 3 --- Engine

Deliver:

-   Python package;
-   configurable curves;
-   feature extraction;
-   attribute aggregation;
-   Confidence;
-   Overall;
-   Current/Peak;
-   engine versioning;
-   unit tests.

## Milestone 4 --- Athlete dashboard

Deliver:

-   Today;
-   Stats;
-   Stat detail;
-   Paths;
-   history.

## Milestone 5 --- Quest + Workout

Deliver:

-   weekly plan generation;
-   Quest detail;
-   workout player;
-   rest timer;
-   offline persistence;
-   result sync;
-   performance evidence creation.

## Milestone 6 --- Bosses

Deliver:

-   Boss catalog;
-   requirements;
-   Readiness;
-   preparation mode;
-   attempts;
-   Defeated / Not Defeated;
-   Recoil;
-   Revenge.

## Milestone 7 --- Body + data sources

Deliver:

-   body timeline;
-   checkpoint logic;
-   provider interfaces;
-   manual data;
-   integration-ready health model.

------------------------------------------------------------------------

# 70. Claude Code execution plan

When beginning implementation:

1.  Read this entire specification.
2.  Create `docs/IMPLEMENTATION_PLAN.md`.
3.  List assumptions separately.
4.  Implement Milestone 1 only.
5.  Run lint/typecheck/tests.
6.  Test 320px and 390px layouts.
7.  Do not continue into scoring calibration until database/raw evidence
    model is stable.
8.  Commit logically separated changes.
9.  Keep a `docs/DECISIONS.md` ADR-style log for deviations.
10. Never silently alter a product mechanic from this spec.

------------------------------------------------------------------------

# 71. Definition of done for a mobile screen

A screen is not done until:

-   320px works;
-   390px looks intentional;
-   430px works;
-   safe areas work;
-   keyboard does not obscure required actions;
-   primary controls \>=44px;
-   no horizontal overflow;
-   loading/empty/error states exist;
-   focus state exists;
-   screen reader labels make sense;
-   reduced motion works;
-   slow/offline behavior considered;
-   real long text does not break layout;
-   large numbers do not overflow;
-   tap targets do not overlap.

------------------------------------------------------------------------

# 72. Non-negotiable product rules

1.  **Unknown is not zero.**
2.  **Confidence is not capability.**
3.  **Completion is not automatic improvement.**
4.  **Pain is not poor performance.**
5.  **Peak is history and never decays.**
6.  **Current can change.**
7.  **Raw data survives algorithm changes.**
8.  **Every derived value is versioned.**
9.  **Boss Readiness is not success probability.**
10. **Bosses can be attempted early.**
11. **Unexpected performance recalibrates ASCEND.**
12. **Failure creates information, not punishment.**
13. **Paths are attributes, not sports.**
14. **A Quest may advance several Paths.**
15. **Rest can be the correct Quest.**
16. **Mobile is the primary product.**
17. **ASCEND never ends at 100% completion.**

------------------------------------------------------------------------

# 73. v0.1 calibration warning

The software architecture can be production-quality before the scoring
curves are scientifically validated.

Therefore:

-   mark scoring configuration as `engine 0.1`;
-   preserve raw evidence;
-   display Confidence;
-   avoid population percentile claims;
-   avoid medical claims;
-   avoid claiming exact physiological measurements from indirect
    proxies;
-   make recalculation straightforward.

The goal of v0.1 is a coherent, conservative personal performance model
that becomes more accurate as evidence accumulates.

------------------------------------------------------------------------

# 74. Final product principle

ASCEND should never reward the user merely for interacting with ASCEND.

It should help the athlete:

**measure → train → prove → recalibrate → progress.**

The most important screen is not a dashboard.

It is the screen that tells the athlete **what to do today and why**.

The most important number is not a streak.

It is the best current estimate of what the athlete can actually do.

And the system must always leave room for the next ascent.
