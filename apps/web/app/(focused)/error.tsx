"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function FocusedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" style={{ paddingTop: "var(--space-16)" }}>
      <ErrorState
        title="This screen didn't load"
        action={
          <div className="stack">
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
            <ButtonLink variant="ghost" href="/">
              Back to where I was
            </ButtonLink>
          </div>
        }
      >
        <p>Everything you confirmed is saved. Check your connection and try again.</p>
      </ErrorState>
    </main>
  );
}
