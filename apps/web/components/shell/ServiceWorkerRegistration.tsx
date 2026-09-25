"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds (ADR-007). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline support is an enhancement; the app works without it (spec §41).
    });
  }, []);
  return null;
}
