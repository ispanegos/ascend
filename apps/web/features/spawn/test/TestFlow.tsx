"use client";

import {
  PAIN_LOCATIONS,
  RESOLUTION_REASON_LABELS,
  attemptToRaw,
  attemptsReady,
  buildAttemptRecord,
  buildResultPatch,
  getTest,
  namesPainAsLimit,
  nextSlot,
  resultToRaw,
  visibleFields,
  type AttemptSlot,
  type FieldSpec,
  type SessionKind,
  type Side,
  type TestDefinition,
} from "@ascend/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FlowHeader } from "@/components/shell/FlowHeader";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Icon } from "@/components/ui/Icon";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { TextArea } from "@/components/ui/TextArea";
import { readLocal, removeLocal, writeLocal } from "@/lib/local-store";
import {
  confirmResult,
  deleteAttempt,
  rememberTestStep,
  retryTest,
  saveAttempt,
  startTest,
} from "../actions";
import { TEST_CONTENT } from "../content";
import type { AttemptRow, AvailableLoad, ResultRow } from "../data";
import { sessionPath, testPath } from "../routing";
import { FieldInput } from "./FieldInput";
import { ResolveSheet } from "./ResolveSheet";
import { Timer } from "./Timer";
import { formatFieldValue, sideLabel, slotTitle, summarizeAttempt } from "./format";
import { safely } from "@/lib/safe-action";
import styles from "./TestFlow.module.css";

export type TestStep = "intro" | "execute" | "record" | "confirm";

interface TestFlowProps {
  kind: SessionKind;
  sessionId: string;
  sessionOpen: boolean;
  testKey: string;
  step: TestStep;
  position: { index: number; total: number };
  result: ResultRow | null;
  attempts: AttemptRow[];
  loads: AvailableLoad[];
}

const STATUS_TEXT: Record<string, string> = {
  skipped: "Skipped",
  cannot_perform: "Couldn't perform",
  aborted: "Stopped",
};

type Raw = Record<string, string>;

function setupFields(test: TestDefinition): FieldSpec[] {
  return test.resultFields.filter((f) => (f.stage ?? "setup") === "setup");
}

function finishFields(test: TestDefinition): FieldSpec[] {
  return test.resultFields.filter((f) => f.stage === "finish");
}

function defaultsFor(test: TestDefinition): Raw {
  const raw: Raw = {};
  for (const field of test.attemptFields) {
    if (field.kind === "duration" && field.defaultSeconds !== undefined) raw[field.key] = String(field.defaultSeconds);
  }
  return raw;
}

/**
 * One Spawn test: intro → instructions/execute → record → confirm
 * (spec §12–§14, §53). The step lives in the URL (`?step=`), so reloads and
 * the browser back gesture behave natively; the server also keeps a resume
 * pointer. Typed-but-unsaved values are kept on the device.
 */
export function TestFlow(props: TestFlowProps) {
  const test = getTest(props.testKey);
  if (!test) return null;
  return <Flow {...props} test={test} />;
}

function Flow({ kind, sessionId, sessionOpen, test, step, position, result, attempts, loads }: TestFlowProps & { test: TestDefinition }) {
  const router = useRouter();
  const path = testPath(kind, test.key);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  const resultOpen = result?.status === "in_progress";
  const effectiveStep: TestStep = resultOpen ? step : "intro";

  // Resume pointer (spec §11: leave and resume anywhere).
  useEffect(() => {
    if (sessionOpen && (!result || resultOpen)) void rememberTestStep(sessionId, test.key, effectiveStep);
  }, [sessionOpen, sessionId, test.key, effectiveStep, result, resultOpen]);

  function go(next: TestStep) {
    router.push(next === "intro" ? path : `${path}?step=${next}`);
  }

  function begin() {
    setError(null);
    startTransition(async () => {
      const started = await safely(() => startTest(sessionId, test.key));
      if (!started.ok) {
        setError(started.error);
        if (started.redirectTo) router.push(started.redirectTo);
        return;
      }
      router.push(`${path}?step=execute`);
      router.refresh();
    });
  }

  const header = (
    <FlowHeader
      backHref={
        effectiveStep === "confirm"
          ? `${path}?step=record`
          : effectiveStep === "record"
            ? `${path}?step=execute`
            : effectiveStep === "execute"
              ? path
              : sessionPath(kind)
      }
      context={`${test.key} · ${test.name}`}
      progress={{
        value: position.index - 1,
        max: position.total,
        label: "Session progress",
        text: `${position.index} of ${position.total}`,
      }}
    />
  );

  // A resolved result: read-only view.
  if (result && !resultOpen) {
    return (
      <>
        {header}
        <ResolvedView
          kind={kind}
          sessionId={sessionId}
          sessionOpen={sessionOpen}
          test={test}
          result={result}
          attempts={attempts}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <main id="main" className={styles.main}>
        {effectiveStep === "intro" ? (
          <Intro test={test} kind={kind} />
        ) : effectiveStep === "execute" ? (
          <Execute test={test} resultId={result?.id ?? ""} />
        ) : effectiveStep === "record" && result ? (
          <Record
            test={test}
            result={result}
            attempts={attempts}
            loads={loads}
            onReview={() => go("confirm")}
          />
        ) : effectiveStep === "confirm" && result ? (
          <Confirm test={test} result={result} attempts={attempts} />
        ) : null}

        {effectiveStep === "intro" ? (
          <MobileActionBar>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <Button onClick={begin} loading={pending}>
              Begin {test.name}
            </Button>
            <Button variant="ghost" onClick={() => setResolveOpen(true)}>
              I can&apos;t do this test
            </Button>
          </MobileActionBar>
        ) : effectiveStep === "execute" ? (
          <MobileActionBar>
            <Button onClick={() => go("record")}>
              {test.attempts.kind === "sets" || test.attempts.count > 1 ? "Record attempts" : "Record result"}
            </Button>
            <Button variant="ghost" onClick={() => setResolveOpen(true)}>
              Stop test
            </Button>
          </MobileActionBar>
        ) : null}

        {effectiveStep === "record" || effectiveStep === "confirm" ? (
          <div className={styles.stopRow}>
            <Button variant="ghost" fit="auto" onClick={() => setResolveOpen(true)}>
              Stop test
            </Button>
          </div>
        ) : null}
      </main>

      <ResolveSheet
        open={resolveOpen}
        onClose={() => setResolveOpen(false)}
        sessionId={sessionId}
        testKey={test.key}
        started={resultOpen}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Intro
// ---------------------------------------------------------------------------

function Intro({ test, kind }: { test: TestDefinition; kind: SessionKind }) {
  const content = TEST_CONTENT[test.key];
  return (
    <div className={styles.stack}>
      <header className={styles.titleBlock}>
        <p className="text-label text-muted">
          Spawn {kind === "movement" ? "01" : kind === "frame" ? "02" : "03"} · {test.key}
        </p>
        <h1 className="text-h1">{test.name}</h1>
        <p className={styles.lede}>{content.measures}</p>
      </header>

      <section aria-labelledby="setup-heading" className={styles.section}>
        <h2 id="setup-heading" className="text-label text-muted">
          You need
        </h2>
        <ul className={styles.list}>
          {content.setup.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="format-heading" className={styles.section}>
        <h2 id="format-heading" className="text-label text-muted">
          Format
        </h2>
        <p>{describePlan(test)}</p>
        {test.timer ? <p className="text-muted">Built-in timer included.</p> : null}
      </section>
    </div>
  );
}

function describePlan(test: TestDefinition): string {
  if (test.attempts.kind === "sets") return `Up to ${test.attempts.max} sets, adding load while form stays clean.`;
  const { count, sides } = test.attempts;
  const perSide = sides.length > 1;
  if (count === 1) return perSide ? "One measurement per side." : "One recorded effort.";
  return perSide ? `${count} attempts per side, every attempt recorded.` : `${count} attempts, every attempt recorded.`;
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

function Execute({ test, resultId }: { test: TestDefinition; resultId: string }) {
  const content = TEST_CONTENT[test.key];
  const timer = test.timer?.placement === "execute" ? test.timer : null;

  function onStop(seconds: number) {
    // Offer the measured time to the record step; the athlete can change it.
    if (timer?.fillsField) writeLocal(`timerfill.${resultId}`, { [timer.fillsField]: String(seconds) });
  }

  return (
    <div className={styles.stack}>
      <header className={styles.titleBlock}>
        <p className="text-label text-muted">How to do it</p>
        <h1 className="text-h2">{test.name}</h1>
      </header>
      <ol className={styles.steps}>
        {content.steps.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>
      {timer ? (
        <Timer
          mode={timer.mode}
          seconds={timer.seconds}
          storageKey={`timer.${resultId}.execute`}
          onStop={onStop}
          label={`${test.name} timer`}
        />
      ) : null}
      <p className={styles.cue}>
        <Icon name="flag" size={18} /> {content.cue}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Record
// ---------------------------------------------------------------------------

function Record({
  test,
  result,
  attempts,
  loads,
  onReview,
}: {
  test: TestDefinition;
  result: ResultRow;
  attempts: AttemptRow[];
  loads: AvailableLoad[];
  onReview: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const setup = setupFields(test);
  const [resultRaw, setResultRaw] = useState<Raw>(() =>
    resultToRaw(test, { variant: result.variant, data: (result.data ?? {}) as Record<string, unknown> }),
  );
  const [setupErrors, setSetupErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AttemptRow | null>(null);
  const [addingSet, setAddingSet] = useState(false);
  const [recoverAfter, setRecoverAfter] = useState<number | null>(null);

  const keys = attempts.map((a) => ({ side: a.side as Side, attempt_number: a.attempt_number }));
  const slot = nextSlot(test, keys);
  const ready = attemptsReady(test, keys).ok;
  const showForm = editing !== null || (slot !== null && (!ready || test.attempts.kind === "fixed" || addingSet));
  const formSlot: AttemptSlot | null = editing
    ? { side: editing.side as Side, attemptNumber: editing.attempt_number }
    : slot;

  function onSaved() {
    const wasEditing = editing !== null;
    setEditing(null);
    setAddingSet(false);
    if (!wasEditing && test.recoverySeconds) setRecoverAfter(Date.now());
    router.refresh();
  }

  function remove(attempt: AttemptRow) {
    startTransition(async () => {
      await safely(() => deleteAttempt(attempt.id));
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <header className={styles.titleBlock}>
        <p className="text-label text-muted">Record</p>
        <h1 className="text-h2">{test.name}</h1>
        <p className="text-muted">{TEST_CONTENT[test.key].cue}</p>
      </header>

      {setup.length > 0 ? (
        <section className={styles.card} aria-label="Test setup">
          {visibleFields(setup, resultRaw).map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={resultRaw[field.key] ?? ""}
              error={setupErrors[field.key]}
              onChange={(value) => {
                setResultRaw((current) => ({ ...current, [field.key]: value }));
                setSetupErrors((current) => ({ ...current, [field.key]: "" }));
              }}
            />
          ))}
        </section>
      ) : null}

      {attempts.length > 0 ? (
        <section aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="text-label text-muted">
            Recorded
          </h2>
          <ul className={styles.attempts}>
            {attempts.map((attempt) => (
              <li key={attempt.id} className={styles.attempt}>
                <div className={styles.attemptText}>
                  <p className={styles.attemptTitle}>
                    {slotTitle(test, attempt.side as Side, attempt.attempt_number)}
                    {test.attempts.kind === "sets" && attempt.side !== "none"
                      ? ` · ${sideLabel(test, attempt.side as Side) ?? ""}`
                      : ""}
                  </p>
                  <p className={styles.attemptSummary}>{summarizeAttempt(test, attempt)}</p>
                </div>
                <div className={styles.attemptActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setEditing(attempt)}
                    aria-label={`Edit ${slotTitle(test, attempt.side as Side, attempt.attempt_number)}`}
                  >
                    <Icon name="edit" size={20} />
                  </button>
                  {test.attempts.kind === "sets" ? (
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => remove(attempt)}
                      disabled={pending}
                      aria-label={`Remove ${slotTitle(test, attempt.side as Side, attempt.attempt_number)}`}
                    >
                      <Icon name="close" size={20} />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recoverAfter !== null && slot && !editing && test.recoverySeconds ? (
        <section aria-label="Recovery">
          <p className="text-label text-muted">Recover before the next attempt</p>
          <Timer
            mode="countdown"
            seconds={test.recoverySeconds}
            storageKey={`timer.${result.id}.recover.${attempts.length}`}
            label="Recovery timer"
          />
        </section>
      ) : null}

      {showForm && formSlot ? (
        <AttemptForm
          key={`${formSlot.side}-${formSlot.attemptNumber}-${editing?.id ?? "new"}`}
          test={test}
          resultId={result.id}
          slot={formSlot}
          editing={editing}
          resultRaw={resultRaw}
          loads={loads}
          previous={attempts.at(-1) ?? null}
          onSaved={onSaved}
          onCancel={editing ? () => setEditing(null) : null}
          onSetupErrors={setSetupErrors}
        />
      ) : null}

      {!showForm && test.attempts.kind === "sets" && slot ? (
        <Button variant="secondary" onClick={() => setAddingSet(true)}>
          <Icon name="plus" size={20} /> Add another set
        </Button>
      ) : null}

      {ready && !showForm ? (
        <MobileActionBar>
          <Button onClick={onReview}>Review and confirm</Button>
        </MobileActionBar>
      ) : null}
    </div>
  );
}

function AttemptForm({
  test,
  resultId,
  slot,
  editing,
  resultRaw,
  loads,
  previous,
  onSaved,
  onCancel,
  onSetupErrors,
}: {
  test: TestDefinition;
  resultId: string;
  slot: AttemptSlot;
  editing: AttemptRow | null;
  resultRaw: Raw;
  loads: AvailableLoad[];
  previous: AttemptRow | null;
  onSaved: () => void;
  onCancel: (() => void) | null;
  onSetupErrors: (errors: Record<string, string>) => void;
}) {
  const draftKey = `draft.${resultId}.${slot.side}.${slot.attemptNumber}`;
  const [raw, setRaw] = useState<Raw>(() => {
    if (editing) return attemptToRaw(test, { ...editing, side: editing.side as Side, data: (editing.data ?? {}) as Record<string, unknown> });
    // Sets start from the previous set's load so progressing is one tap.
    const base = defaultsFor(test);
    if (test.attempts.kind === "sets" && previous) {
      const prior = attemptToRaw(test, { ...previous, side: previous.side as Side, data: (previous.data ?? {}) as Record<string, unknown> });
      if (prior.load_kg) base.load_kg = prior.load_kg;
      if (prior.side) base.side = prior.side;
    }
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Stays busy after a successful save until the next attempt's form replaces this one.
  const [saved, setSaved] = useState(false);

  // Restore unsaved input and any time handed over by the execute timer.
  useEffect(() => {
    if (editing) return;
    const draft = readLocal(draftKey);
    const fill = readLocal(`timerfill.${resultId}`);
    const restored: Raw = {};
    for (const source of [fill, draft]) {
      if (source && typeof source === "object") {
        for (const [key, value] of Object.entries(source)) if (typeof value === "string") restored[key] = value;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from device storage
    if (Object.keys(restored).length > 0) setRaw((current) => ({ ...current, ...restored }));
  }, [draftKey, editing, resultId]);

  function update(key: string, value: string) {
    setRaw((current) => {
      const next = { ...current, [key]: value };
      if (!editing) writeLocal(draftKey, next);
      return next;
    });
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  const fields = visibleFields(test.attemptFields, { ...resultRaw, ...raw });
  const attemptTimer = test.timer?.placement === "attempt" ? test.timer : null;

  function save() {
    setFormError(null);
    const setup = buildResultPatch({ ...test, resultFields: setupFields(test) }, resultRaw);
    if (!setup.ok) {
      onSetupErrors(setup.errors);
      setFormError("Complete the test setup above first.");
      return;
    }
    const built = buildAttemptRecord(test, raw, resultRaw, slot.side);
    if (!built.ok) {
      setErrors(built.errors);
      setFormError("Check the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const saved = await safely(() => saveAttempt({
        resultId,
        attemptId: editing?.id,
        side: slot.side,
        attemptNumber: slot.attemptNumber,
        raw,
        resultRaw,
      }));
      if (!saved.ok) {
        setErrors(saved.fieldErrors ?? {});
        setFormError(saved.error);
        return;
      }
      removeLocal(draftKey);
      removeLocal(`timerfill.${resultId}`);
      setSaved(true);
      onSaved();
    });
  }

  const title = slotTitle(test, slot.side, slot.attemptNumber);

  return (
    <section className={styles.formCard} aria-labelledby="attempt-heading">
      <h2 id="attempt-heading" className={styles.formTitle}>
        {editing ? `Edit ${title.toLowerCase()}` : title}
      </h2>

      {attemptTimer && !editing ? (
        <Timer
          mode={attemptTimer.mode}
          seconds={attemptTimer.seconds}
          checkpoints={attemptTimer.checkpoints}
          storageKey={`timer.${resultId}.${slot.side}.${slot.attemptNumber}`}
          onStop={(seconds) => {
            if (attemptTimer.fillsField) update(attemptTimer.fillsField, String(seconds));
          }}
          label={`${title} timer`}
        />
      ) : null}

      {fields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={raw[field.key] ?? ""}
          error={errors[field.key] || undefined}
          onChange={(value) => update(field.key, value)}
          loads={loads}
        />
      ))}

      <MobileActionBar>
        {formError ? (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        ) : null}
        <Button onClick={save} loading={pending || saved}>
          {editing ? "Save changes" : `Save ${title.split(" · ")[0]?.toLowerCase() ?? "attempt"}`}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </MobileActionBar>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

function Confirm({ test, result, attempts }: { test: TestDefinition; result: ResultRow; attempts: AttemptRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialRaw = useMemo(
    () => resultToRaw(test, { variant: result.variant, data: (result.data ?? {}) as Record<string, unknown> }),
    [test, result.variant, result.data],
  );
  const [resultRaw, setResultRaw] = useState<Raw>(initialRaw);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [painAnswer, setPainAnswer] = useState<"" | "no" | "yes">(result.pain_reported ? "yes" : "");
  const [painLocation, setPainLocation] = useState(result.pain_location ?? "");
  const [painNote, setPainNote] = useState(result.pain_note ?? "");

  const namedPain = namesPainAsLimit([resultRaw, ...attempts.map((a) => ({ limiting_factor: a.limiting_factor }))]);
  const painOn = namedPain || painAnswer === "yes";
  const finish = finishFields(test);
  const setupSummary = setupFields(test)
    .map((field) => formatFieldValue(field, initialRaw[field.key]))
    .filter(Boolean)
    .join(" · ");

  function confirm() {
    setFormError(null);
    if (!namedPain && painAnswer === "") {
      setErrors({ pain: "Answer the pain question." });
      return;
    }
    const patch = buildResultPatch(test, resultRaw);
    if (!patch.ok) {
      setErrors(patch.errors);
      setFormError("Check the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const done = await safely(() => confirmResult(result.id, resultRaw, {
        reported: painOn,
        location: painOn ? painLocation : "",
        note: painOn ? painNote : "",
      }));
      if (!done.ok) {
        setErrors(done.fieldErrors ?? {});
        setFormError(done.error);
        return;
      }
      router.push(done.redirectTo ?? "/");
      router.refresh();
    });
  }

  return (
    <div className={styles.stack}>
      <header className={styles.titleBlock}>
        <p className="text-label text-muted">Confirm</p>
        <h1 className="text-h2">{test.name}</h1>
        <p className="text-muted">Once confirmed, this raw result is kept exactly as recorded.</p>
      </header>

      <section className={styles.card} aria-label="Recorded values">
        {setupSummary ? <p className={styles.attemptSummary}>{setupSummary}</p> : null}
        <ul className={styles.summaryList}>
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <span className={styles.attemptTitle}>{slotTitle(test, attempt.side as Side, attempt.attempt_number)}</span>
              <span className={styles.attemptSummary}>{summarizeAttempt(test, attempt)}</span>
            </li>
          ))}
        </ul>
      </section>

      {finish.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={resultRaw[field.key] ?? ""}
          error={errors[field.key]}
          onChange={(value) => {
            setResultRaw((current) => ({ ...current, [field.key]: value }));
            setErrors((current) => ({ ...current, [field.key]: "" }));
          }}
        />
      ))}

      <section className={styles.painCard} aria-labelledby="pain-heading">
        <h2 id="pain-heading" className={styles.formTitle}>
          <Icon name="flag" size={20} /> Pain
        </h2>
        {namedPain ? (
          <p>You named pain as a limit, so this test will carry a Movement Flag. It never lowers a result.</p>
        ) : (
          <ChipGroup
            legend="Any pain during this test?"
            layout="grid"
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
            value={painAnswer ? [painAnswer] : []}
            onChange={(next) => {
              setPainAnswer(next[0] === "yes" ? "yes" : next[0] === "no" ? "no" : "");
              setErrors((current) => ({ ...current, pain: "" }));
            }}
            error={errors.pain || undefined}
          />
        )}
        {painOn ? (
          <>
            <ChipGroup
              legend="Where? (optional)"
              options={PAIN_LOCATIONS}
              value={painLocation ? [painLocation] : []}
              onChange={(next) => setPainLocation(next[0] ?? "")}
            />
            <TextArea
              label="Note (optional)"
              hint="What you felt and when. ASCEND doesn't diagnose."
              value={painNote}
              maxLength={500}
              onChange={(event) => setPainNote(event.target.value)}
            />
          </>
        ) : null}
      </section>

      <MobileActionBar>
        {formError ? (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        ) : null}
        <Button onClick={confirm} loading={pending}>
          Confirm result
        </Button>
      </MobileActionBar>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolved (read-only)
// ---------------------------------------------------------------------------

function ResolvedView({
  kind,
  sessionId,
  sessionOpen,
  test,
  result,
  attempts,
}: {
  kind: SessionKind;
  sessionId: string;
  sessionOpen: boolean;
  test: TestDefinition;
  result: ResultRow;
  attempts: AttemptRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const completed = result.status === "completed";

  function retry() {
    startTransition(async () => {
      const retried = await safely(() => retryTest(sessionId, test.key));
      if (!retried.ok) {
        setError(retried.error);
        return;
      }
      router.push(retried.redirectTo ?? testPath(kind, test.key));
      router.refresh();
    });
  }

  return (
    <main id="main" className={styles.main}>
      <div className={styles.stack}>
        <header className={styles.titleBlock}>
          <p className="text-label text-muted">{completed ? "Recorded" : STATUS_TEXT[result.status] ?? result.status}</p>
          <h1 className="text-h1">{test.name}</h1>
        </header>
        {completed ? (
          <section className={styles.card} aria-label="Recorded values">
            <ul className={styles.summaryList}>
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  <span className={styles.attemptTitle}>{slotTitle(test, attempt.side as Side, attempt.attempt_number)}</span>
                  <span className={styles.attemptSummary}>{summarizeAttempt(test, attempt)}</span>
                </li>
              ))}
            </ul>
            {result.pain_reported ? (
              <p className={styles.flagNote}>
                <Icon name="flag" size={18} /> Movement Flag recorded
              </p>
            ) : null}
          </section>
        ) : (
          <section className={styles.card}>
            <p>
              Reason: <strong>{result.reason_code ? reasonText(result.reason_code) : "—"}</strong>
            </p>
            {result.reason_note ? <p className="text-muted">{result.reason_note}</p> : null}
            <p className="text-muted">No result was recorded, so nothing is assumed about this test.</p>
          </section>
        )}
        {attempts.length > 0 && !completed ? (
          <p className="text-muted">
            {attempts.length} {attempts.length === 1 ? "attempt was" : "attempts were"} saved before stopping and are kept.
          </p>
        ) : null}
        {result.resolved_at ? (
          <p className="text-meta text-muted">
            {completed ? "Confirmed" : "Recorded"}{" "}
            {new Date(result.resolved_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : null}
      </div>
      <MobileActionBar>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {!completed && sessionOpen ? (
          <Button onClick={retry} loading={pending}>
            Try this test now
          </Button>
        ) : null}
        <Button variant={!completed && sessionOpen ? "ghost" : "primary"} onClick={() => router.push(sessionPath(kind))}>
          Back to {kind === "movement" ? "Movement" : kind === "frame" ? "The Frame" : "The Engine"}
        </Button>
      </MobileActionBar>
    </main>
  );
}

function reasonText(code: string): string {
  return code in RESOLUTION_REASON_LABELS
    ? RESOLUTION_REASON_LABELS[code as keyof typeof RESOLUTION_REASON_LABELS]
    : code;
}
