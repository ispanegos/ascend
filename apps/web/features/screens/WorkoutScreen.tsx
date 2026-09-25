import { MetricCard } from "@/components/ui/MetricCard";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import { WorkoutControl } from "@/components/game/WorkoutControl";
import styles from "./workout.module.css";

export interface WorkoutScreenProps {
  exercise: string;
  prescription: string;
  seconds: number;
  progress: number;
  caption: string;
  set: string;
  rest: string;
  heartRate: string | null;
  cue: string;
  overall: { done: number; total: number };
}

/**
 * Active workout (V2 §20): function over fantasy. Readable at arm's length in
 * two seconds, mid-movement, outdoors. No scenery.
 */
export function WorkoutScreen(props: WorkoutScreenProps) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.kicker}>Active workout</p>
        <h1 className={styles.exercise}>{props.exercise}</h1>
        <p className={styles.prescription}>{props.prescription}</p>
      </header>
      <TimerDisplay seconds={props.seconds} progress={props.progress} caption={props.caption} label="Set time" />
      <div className={styles.metrics}>
        <MetricCard label="Set" value={props.set} />
        <MetricCard label="Rest" value={props.rest} unit="s" />
        <MetricCard
          label="HR"
          value={props.heartRate ?? "—"}
          icon={<PixelIcon name="heart" size={16} style={{ color: "var(--accent-danger)" }} />}
          tone="neutral"
        />
      </div>
      <WorkoutControl paused={false} />
      <ProgressBar value={props.overall.done} max={props.overall.total} label="Workout progress" tone="data" size="md" />
      <p className={styles.cue}>{props.cue}</p>
    </div>
  );
}
