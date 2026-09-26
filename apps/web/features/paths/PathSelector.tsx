"use client";

import {
  ATTRIBUTE_LABELS,
  MAX_SECONDARY_PATHS,
  PATH_KEYS,
  PATH_RULE_MESSAGES,
  sameSelection,
  validatePathSelection,
  type PathKey,
  type PathSelection,
  type StatStatus,
} from "@ascend/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { PathSuggestion } from "@/features/engine/types";
import { safely } from "@/lib/safe-action";
import { savePaths } from "./actions";
import styles from "./paths.module.css";

type Choice = "none" | "primary" | "secondary";

export interface PathStat {
  current: number | null;
  confidence: number;
  status: StatStatus;
}

const OPTIONS = [
  { value: "none", label: "Off" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
] as const;

function choiceOf(selection: PathSelection, key: PathKey): Choice {
  if (selection.primary === key) return "primary";
  return selection.secondary.includes(key) ? "secondary" : "none";
}

/**
 * Path selection (spec §18, ADR-040/041). The athlete decides; suggestions
 * only fill the form. Rules are checked here for immediate feedback and again
 * by the database on save.
 */
export function PathSelector({
  initial,
  stats,
  suggestions,
  notes,
}: {
  initial: PathSelection;
  stats: Record<PathKey, PathStat>;
  suggestions: readonly PathSuggestion[] | null;
  notes: readonly string[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<PathSelection>(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const errors = validatePathSelection(selection);
  const dirty = !sameSelection(selection, initial);

  function choose(key: PathKey, choice: Choice) {
    setError(null);
    setSaved(false);
    setNotice(null);
    let primary = selection.primary === key ? null : selection.primary;
    let secondary = selection.secondary.filter((k) => k !== key);
    if (choice === "primary") {
      if (primary) setNotice(`${ATTRIBUTE_LABELS[primary]} is no longer PRIMARY.`);
      primary = key;
    } else if (choice === "secondary") {
      if (secondary.length >= MAX_SECONDARY_PATHS) {
        setNotice(PATH_RULE_MESSAGES.too_many_secondary);
        return;
      }
      secondary = [...secondary, key];
    }
    setSelection({ primary, secondary });
  }

  function applySuggestions() {
    if (!suggestions?.length) return;
    setSaved(false);
    setError(null);
    setNotice("Suggestions applied. Nothing is saved until you save.");
    setSelection({
      primary: (suggestions.find((s) => s.priority === "primary")?.attribute as PathKey | undefined) ?? null,
      secondary: suggestions.filter((s) => s.priority === "secondary").map((s) => s.attribute as PathKey),
    });
  }

  function save(next: PathSelection) {
    startTransition(async () => {
      const result = await safely(() => savePaths(next.primary, next.secondary));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelection(next);
      setSaved(true);
      setNotice(null);
      router.refresh();
    });
  }

  const count = (selection.primary ? 1 : 0) + selection.secondary.length;

  return (
    <div className="stack stack--lg">
      {suggestions && suggestions.length ? (
        <section className={styles.suggestions} aria-labelledby="suggest-heading">
          <SectionHeader id="suggest-heading" title="ASCEND suggests" aside="Advice only" />
          <ul className={styles.suggestionList}>
            {suggestions.map((s) => (
              <li key={s.attribute} className={styles.suggestion}>
                <AttributeIcon attribute={s.attribute as PathKey} size={24} muted={s.basis.current === null} />
                <span>
                  <span className={styles.suggestionTitle}>
                    {ATTRIBUTE_LABELS[s.attribute as PathKey]}
                    <span className={styles.priority}>{s.priority}</span>
                  </span>
                  <span className={styles.reason}>{s.reason}</span>
                </span>
              </li>
            ))}
          </ul>
          {notes.length ? (
            <ul className={styles.notes}>
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
          <Button variant="secondary" onClick={applySuggestions}>
            Use these suggestions
          </Button>
        </section>
      ) : notes.length ? (
        <p className={styles.reason}>{notes.join(" ")}</p>
      ) : null}

      <section aria-labelledby="choose-heading">
        <SectionHeader id="choose-heading" title="Your Paths" aside={`${count} / 3`} />
        <p className={styles.rules}>One PRIMARY and up to two SECONDARY. Paths are attributes to prioritise, not sports.</p>
        <ul className={styles.rows}>
          {PATH_KEYS.map((key) => {
            const stat = stats[key];
            const choice = choiceOf(selection, key);
            const unranked = stat.current === null;
            return (
              <li key={key} className={styles.row} data-choice={choice}>
                <div className={styles.rowHead}>
                  <AttributeIcon attribute={key} size={24} muted={unranked} />
                  <span className={styles.rowName}>{ATTRIBUTE_LABELS[key]}</span>
                  <span className={`stat-number ${styles.rowValue}`}>{unranked ? "—" : Math.round(stat.current!)}</span>
                  <span className={styles.rowStatus}>{unranked ? "Unranked" : stat.status}</span>
                </div>
                <ChipGroup
                  legend={`${ATTRIBUTE_LABELS[key]} priority`}
                  hideLegend
                  layout="grid"
                  options={OPTIONS}
                  value={[choice]}
                  onChange={(next) => choose(key, (next[0] as Choice | undefined) ?? "none")}
                />
                {unranked && choice !== "none" ? (
                  <p className={styles.unranked}>
                    <PixelIcon name="unranked" size={12} /> ASCEND has no evidence for {ATTRIBUTE_LABELS[key]} yet.
                    Choosing it does not rank it — future training evidence will establish its baseline.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <MobileActionBar aboveNav>
        <div aria-live="polite" className={styles.status}>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : errors.length ? (
            <p className={styles.error}>{PATH_RULE_MESSAGES[errors[0]!]}</p>
          ) : notice ? (
            <p className={styles.notice}>{notice}</p>
          ) : saved ? (
            <p className={styles.notice}>Paths saved. Your Stats are unchanged.</p>
          ) : null}
        </div>
        <Button onClick={() => save(selection)} loading={pending} disabled={!dirty || errors.length > 0}>
          Save paths
        </Button>
        {initial.primary ? (
          <Button variant="ghost" onClick={() => save({ primary: null, secondary: [] })} disabled={pending}>
            Clear all paths
          </Button>
        ) : null}
      </MobileActionBar>
    </div>
  );
}
