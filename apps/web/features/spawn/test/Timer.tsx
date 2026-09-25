"use client";

import { formatDuration } from "@ascend/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { readLocal, removeLocal, writeLocal } from "@/lib/local-store";
import styles from "./Timer.module.css";

interface TimerProps {
  mode: "countdown" | "stopwatch";
  /** Countdown length or stopwatch cap, in seconds. */
  seconds: number;
  /** localStorage key: a running timer survives reloads and backgrounding. */
  storageKey: string;
  /** Seconds at which to prompt a reading (E03). */
  checkpoints?: readonly number[] | undefined;
  /** Called with the elapsed seconds when the timer stops or runs out. */
  onStop?: ((elapsedSeconds: number) => void) | undefined;
  label: string;
}

interface TimerState {
  startedAt: number | null;
  accumulatedMs: number;
}

const IDLE: TimerState = { startedAt: null, accumulatedMs: 0 };

function isTimerState(value: unknown): value is TimerState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (v.startedAt === null || typeof v.startedAt === "number") && typeof v.accumulatedMs === "number";
}

function elapsedMs(state: TimerState, now: number): number {
  return state.accumulatedMs + (state.startedAt === null ? 0 : now - state.startedAt);
}

type WakeLockHandle = { release: () => Promise<void> };

/**
 * Integrated assessment timer. Time is computed from wall-clock timestamps,
 * not from counting ticks, so it stays correct when the phone locks or the
 * PWA is closed and reopened. Keeps the screen awake while running where the
 * browser supports it.
 */
export function Timer({ mode, seconds, storageKey, checkpoints, onStop, label }: TimerProps) {
  const [state, setState] = useState<TimerState>(IDLE);
  const [now, setNow] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const capMs = seconds * 1000;
  const stopped = useRef(false);
  const announced = useRef(new Set<number>());
  const wakeLock = useRef<WakeLockHandle | null>(null);

  // Restore after hydration (localStorage is client-only).
  useEffect(() => {
    const saved = readLocal(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from device storage
    if (isTimerState(saved)) setState(saved);
    setNow(Date.now());
  }, [storageKey]);

  const running = state.startedAt !== null;
  const elapsed = Math.min(elapsedMs(state, now), capMs);
  const done = elapsed >= capMs;

  const persist = useCallback(
    (next: TimerState) => {
      setState(next);
      if (next.startedAt === null && next.accumulatedMs === 0) removeLocal(storageKey);
      else writeLocal(storageKey, next);
    },
    [storageKey],
  );

  const finish = useCallback(
    (finalMs: number) => {
      if (stopped.current) return;
      stopped.current = true;
      persist({ startedAt: null, accumulatedMs: finalMs });
      if ("vibrate" in navigator) navigator.vibrate?.(200);
      onStop?.(Math.round(finalMs / 100) / 10);
    },
    [onStop, persist],
  );

  // Tick while running; the cap and checkpoints are checked against the clock.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      const ms = elapsedMs(state, current);
      for (const checkpoint of checkpoints ?? []) {
        if (checkpoint > 0 && ms >= checkpoint * 1000 && !announced.current.has(checkpoint)) {
          announced.current.add(checkpoint);
          setAnnouncement(`Take your reading: ${formatDuration(checkpoint)}.`);
          if ("vibrate" in navigator) navigator.vibrate?.([120, 80, 120]);
        }
      }
      if (ms >= capMs) {
        setAnnouncement(
          mode === "countdown" ? `Time. ${formatDuration(seconds)} complete.` : `Stopped at ${formatDuration(seconds)}.`,
        );
        finish(capMs);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running, state, checkpoints, capMs, finish, mode, seconds]);

  // Keep the screen on while timing.
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> } };
    nav.wakeLock
      ?.request("screen")
      .then((lock) => {
        if (cancelled) void lock.release();
        else wakeLock.current = lock;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
    };
  }, [running]);

  function start() {
    stopped.current = false;
    announced.current = new Set();
    setNow(Date.now());
    setAnnouncement(`${label} started.`);
    persist({ startedAt: Date.now(), accumulatedMs: done ? 0 : state.accumulatedMs });
  }

  function pause() {
    const total = elapsedMs(state, Date.now());
    if (mode === "stopwatch") {
      setAnnouncement(`Stopped at ${formatDuration(Math.round(total / 100) / 10)}.`);
      finish(Math.min(total, capMs));
      return;
    }
    setAnnouncement("Paused.");
    persist({ startedAt: null, accumulatedMs: Math.min(total, capMs) });
  }

  function reset() {
    stopped.current = false;
    announced.current = new Set();
    setAnnouncement("Reset.");
    persist(IDLE);
  }

  const shownSeconds = mode === "countdown" ? Math.ceil((capMs - elapsed) / 1000) : elapsed / 1000;
  const display = mode === "countdown" ? formatDuration(shownSeconds) : formatDuration(Math.floor(shownSeconds * 10) / 10);
  const started = state.startedAt !== null || state.accumulatedMs > 0;
  const nextCheckpoint = checkpoints?.find((c) => elapsed < c * 1000);

  return (
    <section className={styles.timer} aria-label={label}>
      <p className={cx("stat-number", styles.display, done && styles.done)} aria-hidden="true">
        {display}
      </p>
      <p className={styles.caption}>
        {mode === "countdown"
          ? done
            ? "Complete"
            : running
              ? "remaining"
              : started
                ? "paused"
                : `${formatDuration(seconds)} countdown`
          : running
            ? `stops automatically at ${formatDuration(seconds)}`
            : started
              ? "stopped"
              : `stopwatch · max ${formatDuration(seconds)}`}
      </p>

      {checkpoints ? (
        <ol className={styles.checkpoints} aria-label="Readings">
          {checkpoints.map((checkpoint) => {
            const reached = started && elapsed >= checkpoint * 1000;
            const current = running && checkpoint === nextCheckpoint;
            return (
              <li key={checkpoint} className={cx(styles.checkpoint, reached && styles.reached, current && styles.current)}>
                <span className="stat-number">{checkpoint === 0 ? "Stop" : formatDuration(checkpoint)}</span>
                <span className="visually-hidden">{reached ? "reading due" : "upcoming"}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className={styles.controls}>
        {running ? (
          <Button variant={mode === "stopwatch" ? "primary" : "secondary"} onClick={pause}>
            <Icon name="pause" size={20} />
            {mode === "stopwatch" ? "Stop" : "Pause"}
          </Button>
        ) : (
          <Button variant="primary" onClick={start} disabled={done && mode === "countdown" && started}>
            <Icon name="play" size={20} />
            {started && !done && mode === "countdown" ? "Resume" : started ? "Start again" : "Start"}
          </Button>
        )}
        {started && !running ? (
          <Button variant="ghost" onClick={reset}>
            <Icon name="reset" size={20} />
            Reset
          </Button>
        ) : null}
      </div>

      <p className="visually-hidden" role="status" aria-live="assertive">
        {announcement}
      </p>
    </section>
  );
}
