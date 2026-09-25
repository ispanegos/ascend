"use client";

import { Button } from "@/components/ui/Button";

export function ReloadButton() {
  return (
    <Button variant="secondary" fit="auto" onClick={() => window.location.reload()}>
      Try again
    </Button>
  );
}
