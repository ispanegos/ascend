import { ATTRIBUTE_LABELS, PATH_KEYS, pathChanges, type PathChange, type PathKey } from "@ascend/shared";
import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { getCurrentPaths, getPathHistory, getPathSuggestions } from "@/features/paths/data";
import { PathSelector, type PathStat } from "@/features/paths/PathSelector";
import styles from "@/features/paths/paths.module.css";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getLatestStats } from "@/features/stats/data";

export const metadata: Metadata = { title: "Choose your paths" };

function describe(change: PathChange): string {
  const label = ATTRIBUTE_LABELS[change.path];
  switch (change.kind) {
    case "activated":
      return `${label} activated as ${change.priority.toUpperCase()}`;
    case "priority_changed":
      return `${label}: ${change.from.toUpperCase()} → ${change.to.toUpperCase()}`;
    case "deactivated":
      return `${label} deactivated`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Path selection (spec §18, ADR-040, ADR-041): engine suggestions (advisory),
 * the athlete's choice, and the history of every change.
 */
export default async function ChoosePathsPage() {
  const user = await requireInitializedAthlete();
  const [stats, current, history] = await Promise.all([
    getLatestStats(user.id),
    getCurrentPaths(user.id),
    getPathHistory(user.id),
  ]);
  if (!stats) {
    return (
      <>
        <ScreenHeader title="Choose your paths" />
        <EmptyState title="Stats are not ready yet">
          <p>Paths are chosen once your athlete profile is initialized.</p>
        </EmptyState>
      </>
    );
  }
  const suggestions = await getPathSuggestions(stats);
  const statMap = Object.fromEntries(
    PATH_KEYS.map((key) => [key, { current: stats.stats[key].current, confidence: stats.stats[key].confidence, status: stats.stats[key].status }]),
  ) as Record<PathKey, PathStat>;
  const events = pathChanges(history).filter((event) => event.changes.length > 0).reverse();

  return (
    <>
      <ScreenHeader
        eyebrow="Ascend"
        title="Choose your paths"
        description="A Path is an attribute you want ASCEND to prioritise. Choosing one never changes your Stats."
      />
      <PathSelector
        initial={{ primary: current.primary, secondary: current.secondary }}
        stats={statMap}
        suggestions={suggestions?.suggestions ?? null}
        notes={suggestions ? suggestions.notes : ["Suggestions are unavailable right now. You can still choose freely."]}
      />
      {events.length ? (
        <section aria-labelledby="path-history-heading" style={{ marginTop: "var(--space-6)" }}>
          <SectionHeader id="path-history-heading" title="Path history" aside={`${history.length} ${history.length === 1 ? "change" : "changes"}`} />
          <ol className={styles.history}>
            {events.map((event) => (
              <li key={event.revision} className={styles.historyItem}>
                <span className={styles.historyDate}>{formatDate(event.at)}</span>
                <ul className={styles.historyChanges}>
                  {event.changes.map((change) => (
                    <li key={`${change.kind}-${change.path}`}>{describe(change)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
