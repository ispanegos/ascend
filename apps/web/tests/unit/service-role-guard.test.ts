import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The service-role key is server-only (spec §48, Milestone 3.1 §12). A
 * post-build script also scans the client bundle (scripts/check-client-bundle.mjs).
 */
const webRoot = join(__dirname, "..", "..");
const SOURCE_DIRS = ["app", "components", "features", "lib"];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|mjs|js)$/.test(entry) ? [path] : [];
  });
}

const files = SOURCE_DIRS.flatMap((dir) => sources(join(webRoot, dir))).map((path) => ({
  path: relative(webRoot, path),
  text: readFileSync(path, "utf8"),
}));

describe("service-role key stays on the server", () => {
  it("is read in exactly one module", () => {
    const readers = files.filter((f) => f.text.includes("SUPABASE_SERVICE_ROLE_KEY")).map((f) => f.path);
    expect(readers).toEqual(["lib/supabase/admin.ts"]);
  });

  it("is never a NEXT_PUBLIC variable", () => {
    for (const file of files) expect(file.text, file.path).not.toMatch(/NEXT_PUBLIC_\w*SERVICE/);
    expect(readFileSync(join(webRoot, ".env.example"), "utf8")).not.toMatch(/NEXT_PUBLIC_\w*SERVICE/);
  });

  it("the admin module is server-only", () => {
    const admin = files.find((f) => f.path === "lib/supabase/admin.ts");
    expect(admin?.text).toMatch(/^import "server-only";/);
  });

  it("no client component imports the admin client or the engine runner", () => {
    const clientFiles = files.filter((f) => /^["']use client["'];/.test(f.text));
    expect(clientFiles.length).toBeGreaterThan(5);
    for (const file of clientFiles) {
      expect(file.text, file.path).not.toMatch(/supabase\/admin|engine\/runner|engine\/input/);
    }
  });

  it("server-only modules that touch the engine or the key are marked server-only", () => {
    for (const path of ["features/engine/runner.ts", "features/engine/input.ts", "lib/supabase/admin.ts"]) {
      expect(files.find((f) => f.path === path)?.text, path).toMatch(/^import "server-only";/);
    }
  });
});
