"use client";

import { ATTRIBUTE_LABELS, SESSION_CATALOG, testsForSession, type SessionKind } from "@ascend/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { safely } from "@/lib/safe-action";
import { beginSession } from "../actions";
import { SESSION_CONTENT } from "../content";
import styles from "./spawn.module.css";

/**
 * Before every session (spec §53): duration, what it measures, what is
 * needed, and how to stop. The athlete confirms the safety notes to begin.
 */
export function Preflight({ kind }: { kind: SessionKind }) {
  const router = useRouter();
  const session = SESSION_CATALOG[kind];
  const content = SESSION_CONTENT[kind];
  const tests = testsForSession(kind);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    if (!acknowledged) {
      setError("Confirm you've read the safety notes.");
      return;
    }
    startTransition(async () => {
      const result = await safely(() => beginSession(kind, true));
      if (!result.ok) {
        setError(result.error);
        if (result.redirectTo) router.push(result.redirectTo);
        return;
      }
      router.push(result.redirectTo ?? "/spawn");
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className="text-label text-muted">Spawn {session.number}</p>
        <h1 className="text-display">{session.title}</h1>
        <p className={styles.lede}>{content.intro}</p>
      </header>

      <dl className={styles.facts}>
        <div>
          <dt className="text-label text-muted">Duration</dt>
          <dd>{session.estimate}</dd>
        </div>
        <div>
          <dt className="text-label text-muted">Measures</dt>
          <dd>{session.measures.map((a) => ATTRIBUTE_LABELS[a]).join(", ")}</dd>
        </div>
        <div>
          <dt className="text-label text-muted">Tests</dt>
          <dd>{tests.map((t) => t.name).join(" · ")}</dd>
        </div>
      </dl>

      <section className={styles.block} aria-labelledby="needs-heading">
        <h2 id="needs-heading" className="text-label text-muted">
          What you need
        </h2>
        <ul className={styles.bullets}>
          {content.needs.map((need) => (
            <li key={need}>{need}</li>
          ))}
        </ul>
      </section>

      {content.warmUp ? (
        <section className={styles.block} aria-labelledby="warmup-heading">
          <h2 id="warmup-heading" className="text-label text-muted">
            Warm-up
          </h2>
          <p>{content.warmUp}</p>
        </section>
      ) : null}

      <section className={styles.safety} aria-labelledby="safety-heading">
        <h2 id="safety-heading" className="text-label">
          Safety and stopping
        </h2>
        <ul className={styles.bullets}>
          {content.safety.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <label className={styles.ack}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => {
              setAcknowledged(event.target.checked);
              setError(null);
            }}
          />
          <span>I&apos;ve read this and I&apos;ll stop if something feels wrong.</span>
        </label>
      </section>

      <p className="text-muted">
        You don&apos;t have to finish in one go. Close ASCEND at any point and you&apos;ll return to the same test.
      </p>

      <MobileActionBar>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <Button onClick={begin} loading={pending}>
          Begin {session.title}
        </Button>
      </MobileActionBar>
    </div>
  );
}
