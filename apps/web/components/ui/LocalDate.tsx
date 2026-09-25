"use client";

import { useSyncExternalStore } from "react";
import { formatDayHeading } from "@/lib/format";

const noop = () => () => {};

/**
 * Today's date in the athlete's own time zone. The server runs in UTC, so the
 * server render can differ near midnight; the client value replaces it after
 * hydration.
 */
export function LocalDayHeading() {
  const label = useSyncExternalStore(
    noop,
    () => formatDayHeading(new Date()),
    () => formatDayHeading(new Date(), "UTC"),
  );
  return <>{label}</>;
}
