"use client";

import { devResetSpawn } from "../actions";
import { ActionButton } from "./ActionButton";
import styles from "./spawn.module.css";

/**
 * Development-only Spawn reset (ADR-019). Only rendered when the server says
 * dev tools are enabled; the action and the database check again.
 */
export function DevTools() {
  return (
    <section className={styles.dev} aria-labelledby="dev-heading">
      <h2 id="dev-heading" className="text-label">
        Development only
      </h2>
      <p className="text-meta">Not shown in production. Deletes your own Spawn data on this local database.</p>
      <ActionButton
        variant="secondary"
        action={() => devResetSpawn(true)}
        confirmText="Delete all assessment sessions and results, keep profile context?"
      >
        Reset assessments
      </ActionButton>
      <ActionButton
        variant="danger"
        action={() => devResetSpawn(false)}
        confirmText="Delete all Spawn data including profile context?"
      >
        Reset all of Spawn
      </ActionButton>
    </section>
  );
}
