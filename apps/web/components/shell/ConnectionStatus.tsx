"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./ConnectionStatus.module.css";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Global offline notice (spec §50). Announced politely once when the
 * connection drops; renders nothing while online.
 */
export function ConnectionStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {online ? null : (
        <p className={styles.banner}>
          <Icon name="offline" size={18} />
          <span>You&apos;re offline. Changes can&apos;t be saved right now.</span>
        </p>
      )}
    </div>
  );
}
