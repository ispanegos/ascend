import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  SESSION_CATALOG,
  hasReached,
  nextSession,
  sessionAvailability,
  type SessionAvailability,
  type SessionKind,
} from "@ascend/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlowHeader } from "@/components/shell/FlowHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { AttributeLadder } from "@/features/spawn/components/AttributeLadder";
import { SessionList } from "@/features/spawn/components/SessionList";
import styles from "@/features/spawn/components/spawn.module.css";
import { getSpawnSnapshot, sessionPointers } from "@/features/spawn/data";
import { resolveSpawnPath, sessionPath } from "@/features/spawn/routing";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Spawn Point" };

/**
 * SPAWN POINT (spec §11, §59): every attribute UNRANKED and the three
 * sessions ahead. Also the hub between sessions, which may be days apart.
 */
export default async function SpawnPointPage() {
  const user = await requireUser();
  const { state, settings, sessions } = await getSpawnSnapshot(user.id);

  if (!hasReached(state, "MOVEMENT_PENDING")) redirect(resolveSpawnPath(state, settings.onboarding_step, []));
  if (hasReached(state, "ENGINE_COMPLETE")) redirect("/spawn/complete");

  const statusOf = (kind: SessionKind): SessionAvailability | "open" =>
    sessions.some((s) => s.kind === kind && s.status === "in_progress") ? "open" : sessionAvailability(state, kind);
  const status = { movement: statusOf("movement"), frame: statusOf("frame"), engine: statusOf("engine") };

  const next = nextSession(state);
  const nextOpen = next ? status[next] === "open" : false;
  const started = sessions.length > 0;
  const cta = next
    ? nextOpen
      ? { label: `Continue ${SESSION_CATALOG[next].title}`, href: resolveSpawnPath(state, null, sessionPointers(sessions)) }
      : { label: started ? `Begin ${SESSION_CATALOG[next].title}` : "Begin assessment", href: sessionPath(next) }
    : null;

  return (
    <>
      <FlowHeader context="Spawn" />
      <main id="main" className={styles.page}>
        <header className={styles.hero}>
          <p className="text-label text-muted">Spawn point</p>
          <h1 className="text-display">{started ? "Your baseline is forming." : "Every Stat starts unranked."}</h1>
          <p className={styles.lede}>
            Nothing is assumed. Each attribute stays unranked until ASCEND has measured it.
          </p>
        </header>

        <AttributeLadder
          label="Attributes"
          overall={{ key: "overall", label: "Overall", status: "Unranked", tone: "muted" }}
          rows={ATTRIBUTE_KEYS.map((key) => ({ key, label: ATTRIBUTE_LABELS[key], status: "Unranked", tone: "muted" }))}
        />

        <section aria-labelledby="sessions-heading" className={styles.block}>
          <h2 id="sessions-heading" className="text-label text-muted">
            Three sessions
          </h2>
          <SessionList status={status} />
          <p className="text-muted">Sessions can be on different days. Rest between them is part of the process.</p>
        </section>

        {cta ? (
          <MobileActionBar>
            <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
          </MobileActionBar>
        ) : null}
      </main>
    </>
  );
}
