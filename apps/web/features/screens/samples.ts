import type { AttributeKey, StatStatus } from "@ascend/shared";
import type { BossRequirement } from "@/components/game/BossCard";
import type { QuestCardProps } from "@/components/game/QuestCard";

/*
 * SAMPLE CONTENT for the Design System V2 review pages only (/design/*).
 * Never imported by product routes. Values are illustrative, not real data,
 * and no logic derives from them.
 */

export const SAMPLE_ATHLETE = { name: "Riccardo" };

export const SAMPLE_STATS: Record<AttributeKey | "overall", { current: number | null; confidence: number; status: StatStatus }> = {
  overall: { current: 51, confidence: 0.64, status: "provisional" },
  endurance: { current: 52, confidence: 0.68, status: "provisional" },
  strength: { current: 44, confidence: 0.68, status: "provisional" },
  power: { current: null, confidence: 0, status: "unranked" },
  core: { current: 51, confidence: 0.67, status: "provisional" },
  mobility: { current: 50, confidence: 0.66, status: "provisional" },
  agility: { current: 56, confidence: 0.65, status: "provisional" },
  recovery: { current: 57, confidence: 0.48, status: "provisional" },
};

export const SAMPLE_QUESTS: readonly QuestCardProps[] = [
  {
    title: "Strength foundation",
    description: "Goblet squat, row and a loaded carry.",
    duration: "45 min",
    affects: ["strength", "core"],
    evidence: "Workout",
    status: "active",
    art: "quests.training-grounds",
    href: "/design/sample/workout",
  },
  {
    title: "Aerobic base",
    description: "Easy continuous run or brisk walk.",
    duration: "30 min",
    affects: ["endurance"],
    evidence: "Workout",
    status: "completed",
    art: "quests.road",
  },
  {
    title: "Mobility flow",
    description: "Ankle, hip and shoulder range.",
    duration: "15 min",
    affects: ["mobility"],
    evidence: "Workout",
    status: "available",
    art: "quests.shrine",
    href: "/design/sample/quests",
  },
  {
    title: "Recovery evening",
    description: "Low-intensity walk and wind-down.",
    duration: "20 min",
    affects: ["recovery"],
    evidence: "Workout",
    status: "available",
    art: "quests.campfire",
    href: "/design/sample/quests",
  },
  {
    title: "Frame reassessment",
    description: "Repeat the Frame tests on a fresh day.",
    duration: "40 min",
    affects: ["strength", "core"],
    evidence: "Assessment",
    status: "scheduled",
    art: "quests.arena",
  },
];

export const SAMPLE_BOSS = {
  name: "The Warden of Gates",
  meaning: "Hold your ground: a loaded carry, a plank and a steady run, back to back.",
  readiness: 62,
  requirements: [
    { attribute: "endurance", current: 52, required: 50 },
    { attribute: "core", current: 51, required: 55 },
    { attribute: "strength", current: 44, required: 45 },
  ] satisfies BossRequirement[],
};
