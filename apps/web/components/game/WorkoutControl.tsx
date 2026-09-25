"use client";

import { Icon } from "@/components/ui/Icon";
import styles from "./WorkoutControl.module.css";

/**
 * Previous · pause/resume · next (V2 §20). Big targets for sweaty hands:
 * 56px side controls, 72px centre.
 */
export function WorkoutControl({
  paused,
  onPrevious,
  onToggle,
  onNext,
}: {
  paused: boolean;
  onPrevious?: () => void;
  onToggle?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className={styles.row} role="group" aria-label="Workout controls">
      <button type="button" className={styles.side} onClick={onPrevious} aria-label="Previous exercise">
        <Icon name="chevron-left" size={28} />
      </button>
      <button type="button" className={styles.main} onClick={onToggle} aria-label={paused ? "Resume" : "Pause"}>
        <Icon name={paused ? "play" : "pause"} size={32} />
      </button>
      <button type="button" className={styles.side} onClick={onNext} aria-label="Next exercise">
        <Icon name="chevron-right" size={28} />
      </button>
    </div>
  );
}
