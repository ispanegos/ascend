import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main" className="app-page app-page--focused">
      <div className="stack" style={{ marginBlock: "auto" }}>
        <p className="text-label text-muted">404</p>
        <h1 className="text-h1">This page doesn&apos;t exist</h1>
        <ButtonLink href="/" fit="auto">
          Go to ASCEND
        </ButtonLink>
      </div>
    </main>
  );
}
