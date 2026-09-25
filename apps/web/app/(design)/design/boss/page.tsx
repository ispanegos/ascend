import type { Metadata } from "next";
import { BossCard } from "@/components/game/BossCard";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Boss · Design System V2" };

/** Boss visual component (V2 §19). Sample content only; no Boss logic. */
export default function BossGalleryPage() {
  return (
    <>
      <BossCard
        name="The Warden of Gates"
        meaning="Hold your ground: a carry, a plank and a steady run, back to back."
        state="available"
        readiness={62}
        requirements={[
          { attribute: "endurance", current: 52, required: 50 },
          { attribute: "core", current: 51, required: 55 },
          { attribute: "strength", current: 44, required: 45 },
        ]}
      />
      <Button variant="boss">Face the Boss</Button>
      <BossCard
        name="The Warden of Gates"
        meaning="Your last attempt fell short. The Warden remembers."
        state="revenge"
        readiness={78}
        requirements={[
          { attribute: "endurance", current: 56, required: 50 },
          { attribute: "core", current: 55, required: 55 },
          { attribute: "strength", current: 47, required: 45 },
        ]}
      />
      <BossCard name="Undiscovered" meaning="" state="undiscovered" readiness={null} requirements={[]} />
    </>
  );
}
