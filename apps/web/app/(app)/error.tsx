"use client";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="This screen didn't load"
      action={
        <Button variant="secondary" fit="auto" onClick={reset}>
          Try again
        </Button>
      }
    >
      <p>Nothing you entered has been lost. Check your connection and try again.</p>
    </ErrorState>
  );
}
