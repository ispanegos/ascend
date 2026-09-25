import { LoadingState } from "@/components/ui/States";

export default function Loading() {
  return (
    <div style={{ paddingTop: "var(--space-16)" }}>
      <LoadingState label="Loading" />
    </div>
  );
}
