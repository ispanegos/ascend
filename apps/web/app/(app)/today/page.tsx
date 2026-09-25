import { ATTRIBUTE_KEYS } from "@ascend/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { Artwork } from "@/components/art/Artwork";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { Icon } from "@/components/ui/Icon";
import { LocalDayHeading } from "@/components/ui/LocalDate";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getLatestStats } from "@/features/stats/data";
import { displayPercent, displayStat } from "@/features/stats/trace";
import { createClient } from "@/lib/supabase/server";
import styles from "./today.module.css";

export const metadata: Metadata = { title: "Today" };

/**
 * Today (spec §61, V2 §15) — foundation only. 30–40 % fantasy: world art in
 * the hero, real athlete data below. No XP, no levels, no coins.
 */
export default async function TodayPage() {
  const user = await requireInitializedAthlete();
  const supabase = await createClient();
  const [stats, profile] = await Promise.all([
    getLatestStats(user.id),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  const name = profile.data?.display_name ?? null;
  const ranked = stats ? ATTRIBUTE_KEYS.filter((key) => stats.stats[key].current !== null).length : 0;
  const verified = stats ? ATTRIBUTE_KEYS.filter((key) => stats.stats[key].status === "verified").length : 0;

  return (
    <>
      <Artwork id="world.dusk-ruins" ratio="16 / 9" priority scrim="bottom" className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            <LocalDayHeading />
          </p>
          <h1 className={styles.title}>Today</h1>
          {name ? <p className={styles.greeting}>Welcome back, {name}.</p> : null}
        </div>
      </Artwork>

      <div className="stack stack--lg">
        {stats ? (
          <Link href="/stats" className={styles.status} aria-label={`Overall ${displayStat(stats.overall.current)}, ${stats.overall.status}. View Stats`}>
            <span className={styles.statusMain}>
              <span className={styles.statusLabel}>Overall</span>
              <span className={`stat-number ${styles.statusValue}`}>{displayStat(stats.overall.current)}</span>
            </span>
            <span className={styles.statusSide}>
              <StatusBadge status={stats.overall.status} size="sm" />
              <span className={styles.statusMeta}>
                <ConfidenceBar value={stats.overall.confidence} status={stats.overall.status} />
                {displayPercent(stats.overall.confidence)}
              </span>
              <span className={styles.statusMeta}>
                {ranked} ranked · {verified} verified
              </span>
            </span>
            <Icon name="chevron-right" size={18} className={styles.chevron} />
          </Link>
        ) : null}

        <section aria-labelledby="objective-heading">
          <SectionHeader id="objective-heading" title="Current objective" />
          <Card variant="highlight" className={styles.objective}>
            <span className={styles.objectiveIcon}>
              <PixelIcon name="ascend" size={32} />
            </span>
            <div className={styles.objectiveText}>
              <p className={styles.objectiveTitle}>Choose your Paths</p>
              <p className="text-muted text-small">
                Pick the attributes to prioritise. Your Quests are built from them.
              </p>
            </div>
            <ButtonLink href="/ascend/paths" className={styles.objectiveAction}>
              Choose your paths
            </ButtonLink>
          </Card>
        </section>

        <section aria-labelledby="quest-heading">
          <SectionHeader id="quest-heading" title="Today's Quest" />
          <EmptyState title="No Quest yet" art="states.quiet-camp">
            <p>Quests are generated once you choose your Paths. Completing one produces evidence — never free points.</p>
          </EmptyState>
        </section>

        <section aria-labelledby="next-heading">
          <SectionHeader id="next-heading" title="Next milestone" />
          <Card className={styles.next}>
            <PixelIcon name="verified" size={32} className={styles.nextIcon} />
            <div>
              <p className={styles.objectiveTitle}>Verify your Stats</p>
              <p className="text-muted text-small">
                After Spawn every Stat is provisional. A reassessment, a verified workout or a Boss on a later day can
                verify it.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
