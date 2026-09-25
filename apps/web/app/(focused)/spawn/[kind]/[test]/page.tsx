import { getTest, isSessionKind, testsForSession } from "@ascend/shared";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTestView } from "@/features/spawn/data";
import { sessionPath } from "@/features/spawn/routing";
import { TestFlow, type TestStep } from "@/features/spawn/test/TestFlow";
import { requireUser } from "@/lib/auth";

const STEPS: readonly TestStep[] = ["intro", "execute", "record", "confirm"];

function isStep(value: unknown): value is TestStep {
  return typeof value === "string" && (STEPS as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: { params: Promise<{ test: string }> }): Promise<Metadata> {
  const { test } = await params;
  return { title: getTest(test.toUpperCase())?.name ?? "Test" };
}

/** One Spawn test (spec §12–§14). */
export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; test: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ kind, test: testParam }, { step: stepParam }] = await Promise.all([params, searchParams]);
  const test = getTest(testParam.toUpperCase());
  if (!isSessionKind(kind) || !test || test.session !== kind) notFound();

  const user = await requireUser();
  const view = await getTestView(user.id, kind, test);
  if (!view.session) redirect(sessionPath(kind));

  // Explicit ?step= wins; otherwise resume where the session pointer says.
  const pointerStep = view.session.current_test_key === test.key ? view.session.current_step : null;
  const step: TestStep = isStep(stepParam) ? stepParam : isStep(pointerStep) ? pointerStep : "intro";

  const tests = testsForSession(kind);
  const index = tests.findIndex((t) => t.key === test.key);

  return (
    <TestFlow
      key={`${test.key}-${view.result?.id ?? "new"}`}
      kind={kind}
      sessionId={view.session.id}
      sessionOpen={view.session.status === "in_progress"}
      testKey={test.key}
      step={step}
      position={{ index: index + 1, total: tests.length }}
      result={view.result}
      attempts={view.attempts}
      loads={view.loads}
    />
  );
}
