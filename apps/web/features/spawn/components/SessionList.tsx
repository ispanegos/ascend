import { SESSION_CATALOG, SESSION_KINDS, type SessionAvailability, type SessionKind } from "@ascend/shared";
import { cx } from "@/lib/cx";
import styles from "./spawn.module.css";

const STATUS_TEXT: Record<SessionAvailability | "open", string> = {
  locked: "Later",
  available: "Next",
  in_progress: "In progress",
  open: "In progress",
  complete: "Complete",
};

/** The three Spawn sessions with their status (spec §12–§14, §59). */
export function SessionList({
  status,
}: {
  status: Readonly<Record<SessionKind, SessionAvailability | "open">>;
}) {
  return (
    <ol className={styles.sessions} aria-label="Spawn sessions">
      {SESSION_KINDS.map((kind) => {
        const session = SESSION_CATALOG[kind];
        const state = status[kind];
        return (
          <li key={kind} className={cx(styles.session, state === "complete" && styles.sessionDone)}>
            <span className={cx("stat-number", styles.sessionNumber)} aria-hidden="true">
              {session.number}
            </span>
            <span className={styles.sessionText}>
              <span className={styles.sessionTitle}>{session.title}</span>
              <span className={styles.sessionMeta}>{session.estimate}</span>
            </span>
            <span className={cx(styles.sessionStatus, styles[`status_${state}`])}>
              {state === "complete" ? <span aria-hidden="true">✓ </span> : null}
              {STATUS_TEXT[state]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
