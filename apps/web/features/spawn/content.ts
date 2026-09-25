import type { SessionKind, TestKey } from "@ascend/shared";

/**
 * Instructional copy for Spawn (spec §12–§14, §53). What each test records
 * lives in the shared catalog; this file only explains how to do it.
 * Copy style: short, confident, precise (spec §52).
 */

export interface TestContent {
  /** One line: what the test tells ASCEND. */
  measures: string;
  setup: readonly string[];
  steps: readonly string[];
  /** Short reminder shown while recording. */
  cue: string;
}

export interface SessionContent {
  intro: string;
  needs: readonly string[];
  safety: readonly string[];
  /** Instructional, not scored (spec §13). */
  warmUp?: string;
}

const SHARED_SAFETY = [
  "Stop straight away for chest pain, dizziness, unusual breathlessness or sharp pain.",
  "Any test can be skipped or stopped. Pain is recorded as a Movement Flag, never as a low result.",
  "Nothing goes to failure. Clean, controlled movement is what counts.",
  "If you have a medical condition or a recent injury, check with a professional before testing.",
] as const;

export const SESSION_CONTENT: Readonly<Record<SessionKind, SessionContent>> = {
  movement: {
    intro: "How you move before how much you lift. Seven short tests of range, balance and control.",
    needs: [
      "A clear wall",
      "Tape measure or ruler",
      "Exercise mat",
      "5 × 3 m of clear, non-slip floor",
      "4 markers — cones, shoes or bottles",
    ],
    safety: SHARED_SAFETY,
  },
  frame: {
    intro: "Controlled strength across push, squat, hinge, pull, carry and trunk. Sub-maximal by design.",
    needs: [
      "Kettlebells or dumbbells — the load picker uses your equipment list",
      "Exercise mat",
      "A bench or sturdy surface, if you need incline push-ups",
      "About 10 m of flat space to walk for the carry",
    ],
    safety: SHARED_SAFETY,
    warmUp: "Warm up for 5–8 minutes first: easy movement, then a few light reps of each pattern. The warm-up isn't recorded.",
  },
  engine: {
    intro: "Your aerobic baseline: resting heart rate, a brisk walk, heart-rate recovery and a 20-minute run/walk.",
    needs: [
      "A flat route you can measure — track, flat road or path",
      "A watch or phone app that tracks distance",
      "A heart-rate watch or strap, if you have one (needed for heart-rate recovery)",
      "Water",
    ],
    safety: [
      ...SHARED_SAFETY,
      "On a hot or humid day, slow down or move the session to another day.",
    ],
  },
};

export const TEST_CONTENT: Readonly<Record<TestKey, TestContent>> = {
  M01: {
    measures: "Hip, knee and ankle mobility in a full squat.",
    setup: ["Flat floor", "Bare feet or flat shoes"],
    steps: [
      "Feet shoulder-width apart, toes slightly out, arms straight out in front.",
      "Squat as deep as you comfortably can, heels down if possible.",
      "Hold for 2 seconds, then stand.",
      "Record depth, heels and control after each of the 3 attempts.",
    ],
    cue: "Same stance and arm position every attempt.",
  },
  M02: {
    measures: "Ankle range of motion, each side.",
    setup: ["A wall", "Tape measure or ruler"],
    steps: [
      "Face the wall in a split stance, front foot pointing at the wall.",
      "Keep the heel down and drive the knee forward to touch the wall.",
      "Slide the foot back until the knee only just touches with the heel still down.",
      "Measure from the big toe to the wall. Repeat on the other side.",
    ],
    cue: "Heel stays down. Knee tracks over the middle toes.",
  },
  M03: {
    measures: "Combined shoulder rotation, each side.",
    setup: ["Tape measure (optional)"],
    steps: [
      "Reach one hand over the shoulder and down your back, palm facing you.",
      "Reach the other hand up your back from below, palm facing out.",
      "Try to touch or overlap your middle fingers. Don't walk the hands closer.",
      "“Right hand on top” means the right hand reaches over the shoulder. Do both sides.",
    ],
    cue: "One smooth reach. Note the gap before relaxing.",
  },
  M04: {
    measures: "Balance and control on each leg.",
    setup: ["Clear space next to a wall or chair, for safety"],
    steps: [
      "Stand on one leg, hands on hips, other foot just off the floor.",
      "Start the timer as the foot lifts.",
      "Stop when the foot touches down, a hand leaves the hip or the standing foot moves — or at 60 s.",
      "Alternate: left, right, left, right.",
    ],
    cue: "Eyes forward. Stop the timer the moment balance is lost.",
  },
  M05: {
    measures: "Hamstring and lower-back flexibility.",
    setup: ["Floor space", "Ruler or tape measure", "A box or wall for your feet"],
    steps: [
      "Sit with legs straight, feet together and flat against the box or wall.",
      "Do two easy reaches to warm up.",
      "Reach forward slowly with one hand on the other and hold 2 seconds.",
      "Measure fingertips against your toes: minus if short, plus if past.",
    ],
    cue: "Knees straight. No bouncing.",
  },
  M06: {
    measures: "Trunk control while your arms and legs move.",
    setup: ["Exercise mat"],
    steps: [
      "Lie on your back, arms up, hips and knees bent to 90°.",
      "Press your lower back gently into the floor.",
      "Slowly extend the opposite arm and leg, return, then switch. That's one rep per side.",
      "Aim for 10 reps per side. Clean means the lower back stays down throughout.",
    ],
    cue: "Slow is correct. Breathe out as the limbs extend.",
  },
  M07: {
    measures: "Controlled change of direction and movement accuracy.",
    setup: ["5 × 3 m of clear, non-slip floor", "4 markers at the corners"],
    steps: [
      "Start at a corner, facing the long side.",
      "Forward 5 m, shuffle sideways 3 m, backpedal 5 m, shuffle 3 m back to the start.",
      "Keep facing the same way throughout.",
      "One practice run at easy pace (not recorded), then 3 recorded attempts with about 90 s rest.",
    ],
    cue: "Quick but controlled. Errors count, so accuracy matters.",
  },
  F01: {
    measures: "Upper-body pushing strength.",
    setup: ["Floor", "A bench, box or sturdy table if you use an incline"],
    steps: [
      "Use a standard push-up if you can do clean reps; otherwise use an incline and note the hand height.",
      "Hands under shoulders, body in one straight line.",
      "Lower until your chest is a fist's height from the surface, then press up.",
      "Count clean reps only. Stop when form changes — not at failure.",
    ],
    cue: "Body stays straight. Full, controlled range.",
  },
  F02: {
    measures: "Knee-dominant lower-body strength.",
    setup: ["A kettlebell or dumbbell"],
    steps: [
      "Hold the weight at your chest, elbows down.",
      "Squat to your comfortable depth, then stand.",
      "Start light for up to 10 clean reps. If that was easy, rest 2 minutes and go heavier.",
      "Stop adding load when 10 clean reps feel hard, technique changes or there's no heavier weight.",
    ],
    cue: "Never to failure. Log every set.",
  },
  F03: {
    measures: "Hip-hinge strength.",
    setup: ["Kettlebells or dumbbells"],
    steps: [
      "Weight between your feet, feet hip-width apart.",
      "Push the hips back with a flat back and grip the handle.",
      "Stand tall by pushing through the floor, then lower under control.",
      "Sets of up to 10 clean reps, adding load while form stays clean.",
    ],
    cue: "Flat back. Hips drive the movement, not the arms.",
  },
  F04: {
    measures: "Upper-body pulling strength.",
    setup: ["A kettlebell or dumbbells", "A pull-up bar, if you have one"],
    steps: [
      "No pull-up bar? Use a bent-over row.",
      "Hinge forward with a flat back, arms hanging.",
      "Pull the weight to your lower ribs, pause, lower slowly.",
      "Choose both arms together or one arm at a time — for one arm, log each side as its own set.",
    ],
    cue: "Up to 10 clean reps per set. Torso stays still.",
  },
  F05: {
    measures: "Grip, carrying strength and posture under load.",
    setup: ["Two kettlebells or dumbbells", "A flat space to walk back and forth"],
    steps: [
      "Pick the weights up with a flat back.",
      "Stand tall, shoulders down, and walk at a normal pace.",
      "Stop at 60 s, or earlier if posture or grip fails.",
      "Put the weights down under control.",
    ],
    cue: "Tall posture. Stop when it goes, not after.",
  },
  F06: {
    measures: "Trunk bracing.",
    setup: ["Exercise mat"],
    steps: [
      "Forearms under shoulders, body in one line from head to heels.",
      "Start the timer once you're in position.",
      "Stop when the position is lost — hips sag or pike — or at 120 s.",
      "This is a technical hold, not a test of how long you can suffer.",
    ],
    cue: "Squeeze glutes, ribs down, breathe.",
  },
  E01: {
    measures: "Resting heart rate under calm conditions.",
    setup: ["A quiet place to sit or lie down", "A heart-rate watch or strap, if you have one"],
    steps: [
      "Sit or lie comfortably.",
      "Breathe normally and stay still for 5 minutes.",
      "At the end, note your average heart rate if your watch shows it.",
    ],
    cue: "Still and quiet. No phone scrolling.",
  },
  E02: {
    measures: "Walking endurance and heart-rate response.",
    setup: ["A flat route you can measure", "Distance tracking on a watch, phone or known track laps"],
    steps: [
      "Walk as fast as you can sustain for 6 minutes. No jogging.",
      "Start the timer and your distance tracking together.",
      "At 6:00 stop where you are — heart-rate recovery starts right away.",
    ],
    cue: "Fastest sustainable walk. One foot always on the ground.",
  },
  E03: {
    measures: "How quickly your heart rate falls after effort.",
    setup: ["A heart-rate watch or strap"],
    steps: [
      "Start the timer the moment you stop walking.",
      "Read your heart rate at the stop, at 1:00 and at 2:00.",
      "Stand or walk slowly the whole time — keep it the same next time.",
      "This is a fitness observation, not a medical test.",
    ],
    cue: "Three readings: at stop, 1:00 and 2:00.",
  },
  E04: {
    measures: "Sustained aerobic capacity.",
    setup: ["A flat route you can measure", "Distance tracking", "At least 10 minutes' rest after the walk"],
    steps: [
      "Move at an intensity you believe you can sustain for the entire test. Walking is allowed.",
      "Start the timer and your tracking together.",
      "Keep moving for 20 minutes.",
      "Afterwards, log distance, times and how it felt.",
    ],
    cue: "Even effort. Walking breaks are fine.",
  },
};
