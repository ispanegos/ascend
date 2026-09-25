import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PixelArtFrame } from "@/components/art/PixelArtFrame";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { signOut } from "@/features/auth/actions";
import { DevTools } from "@/features/spawn/components/DevTools";
import { getSerializableContext } from "@/features/spawn/data";
import { profileSummary } from "@/features/spawn/onboarding/summary";
import { requireUser } from "@/lib/auth";
import { devToolsEnabled } from "@/lib/dev";
import { createClient } from "@/lib/supabase/server";
import styles from "./profile.module.css";

export const metadata: Metadata = { title: "You" };

const SECTIONS = [
  { title: "Body", steps: ["birth", "sex", "height", "weight", "body-fat", "measurements"] },
  { title: "Training", steps: ["experience", "activity", "limitations"] },
  { title: "Equipment", steps: ["equipment", "loads"] },
  { title: "Availability", steps: ["availability", "schedule", "environments"] },
  { title: "Data sources", steps: ["sources"] },
] as const;

export default async function ProfilePage() {
  const user = await requireUser();
  const context = await getSerializableContext(user.id);
  const rows = profileSummary(context);
  const supabase = await createClient();
  const { count: openFlags } = await supabase
    .from("movement_flags")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <>
      <ScreenHeader title="You" />

      <div className="stack stack--lg">
        {/* Reserved for the neutral morphology avatar (V2 §22); not built yet. */}
        <section className={styles.identity} aria-label="Athlete">
          <PixelArtFrame className={styles.avatarFrame}>
            <span className={styles.avatar} data-slot="avatar">
              <PixelIcon name="you" size={48} />
            </span>
          </PixelArtFrame>
          <div className={styles.identityText}>
            <p className={styles.identityName}>{context.profile.display_name ?? "Athlete"}</p>
            <p className="text-muted text-small">Body, training context, equipment and availability.</p>
          </div>
        </section>

        <Card as="section" aria-labelledby="account-heading">
          <SectionHeader id="account-heading" title="Account" />
          <dl className={styles.list}>
            <div className={styles.row}>
              <dt>Name</dt>
              <dd>
                <Link href="/profile/edit/name" className={styles.inlineEdit}>
                  {context.profile.display_name ?? <span className="text-muted">Not set</span>}
                </Link>
              </dd>
            </div>
            <div className={styles.row}>
              <dt>Email</dt>
              <dd>{user.email ?? <span className="text-muted">Not available</span>}</dd>
            </div>
            <div className={styles.row}>
              <dt>Units</dt>
              <dd>{context.profile.preferred_units === "imperial" ? "Imperial" : "Metric"}</dd>
            </div>
          </dl>
        </Card>

        {openFlags ? (
          <p className={styles.flags}>
            <Icon name="flag" size={20} />
            {openFlags} open Movement {openFlags === 1 ? "Flag" : "Flags"} from Spawn.
          </p>
        ) : null}

        {SECTIONS.map((section) => (
          <section key={section.title} aria-labelledby={`section-${section.title}`}>
            <SectionHeader id={`section-${section.title}`} title={section.title} />
            <ul className={styles.editList}>
              {section.steps.map((step) => {
                const row = rows.find((r) => r.step === step);
                if (!row) return null;
                return (
                  <li key={step}>
                    <Link href={`/profile/edit/${step}`} className={styles.editRow}>
                      <span className={styles.editText}>
                        <span className={styles.editLabel}>{row.label}</span>
                        <span className={styles.editValue}>{row.value ?? "Not provided"}</span>
                      </span>
                      <Icon name="chevron-right" className={styles.chevron} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {devToolsEnabled() ? <DevTools /> : null}

        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
