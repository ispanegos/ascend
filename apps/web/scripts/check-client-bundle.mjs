// Build-time guard (Milestone 3.1 §12): the Supabase service-role key must
// never reach the browser bundle. Fails the build if the key's value — or
// any JWT whose payload says role "service_role" — appears in .next/static.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const staticDir = join(root, ".next", "static");

function envValue(name) {
  if (process.env[name]) return process.env[name];
  const file = join(root, ".env.local");
  if (!existsSync(file)) return null;
  const line = readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() || null : null;
}

function files(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function hasServiceRoleJwt(text) {
  for (const match of text.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") return true;
    } catch {
      // Not a JWT.
    }
  }
  return false;
}

if (!existsSync(staticDir)) {
  console.error("check-client-bundle: .next/static not found; run next build first");
  process.exit(1);
}

const key = envValue("SUPABASE_SERVICE_ROLE_KEY");
const offenders = files(staticDir).filter((file) => {
  const text = readFileSync(file, "utf8");
  return (key && text.includes(key)) || text.includes("SUPABASE_SERVICE_ROLE_KEY") || hasServiceRoleJwt(text);
});

if (offenders.length) {
  console.error("check-client-bundle: service-role material found in the client bundle:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log(`check-client-bundle: ok (${files(staticDir).length} client files, no service-role material)`);
