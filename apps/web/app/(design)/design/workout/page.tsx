import type { Metadata } from "next";
import { MetricCard } from "@/components/ui/MetricCard";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import { WorkoutControl } from "@/components/game/WorkoutControl";

export const metadata: Metadata = { title: "Active workout · Design System V2" };

/**
 * Active workout visual component (V2 §20): 5–10 % fantasy. Function first —
 * no scenery behind metrics. Sample values only; no workout logic.
 */
export default function WorkoutGalleryPage() {
  return (
    <>
      <header style={{ textAlign: "center" }} className="stack stack--sm">
        <p className="text-label text-muted">Active workout · sample</p>
        <h1 className="text-h1 text-data" style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Kettlebell swing
        </h1>
        <p className="text-muted">3 sets · 20 reps</p>
      </header>
      <TimerDisplay seconds={32} progress={0.6} caption="Rep 12 / 20" label="Set time" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <MetricCard label="Set" value="2 / 3" />
        <MetricCard label="Rest" value="60" unit="s" />
        <MetricCard label="HR" value="128" icon={<PixelIcon name="heart" size={16} style={{ color: "var(--accent-danger)" }} />} tone="neutral" />
      </div>
      <WorkoutControl paused={false} />
      <ProgressBar value={11} max={20} label="Workout progress" tone="data" size="md" />
      <p className="text-muted" style={{ textAlign: "center" }}>
        Keep your back flat and your core braced.
      </p>
    </>
  );
}
