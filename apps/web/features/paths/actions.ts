"use server";

import { PATH_RULE_MESSAGES, isPathKey, validatePathSelection, type PathKey } from "@ascend/shared";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SavePathsResult = { ok: true } | { ok: false; error: string };

/**
 * Appends a Path configuration (ADR-040) through set_athlete_paths(), which
 * re-validates every rule in the database. Never touches Stats.
 */
export async function savePaths(primary: string | null, secondary: readonly string[]): Promise<SavePathsResult> {
  await requireUser();
  const keys = [primary, ...secondary].filter((key): key is string => key !== null);
  if (!keys.every(isPathKey)) return { ok: false, error: PATH_RULE_MESSAGES.unknown_path };
  const selection = { primary: primary as PathKey | null, secondary: secondary as PathKey[] };
  const errors = validatePathSelection(selection);
  if (errors.length) return { ok: false, error: PATH_RULE_MESSAGES[errors[0]!] };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_athlete_paths", {
    // null clears every Path; the generated types cannot express a nullable argument.
    p_primary: selection.primary as string,
    p_secondary: [...selection.secondary],
  });
  if (error) {
    return { ok: false, error: error.code === "23514" ? error.message : "Your Paths didn't save. Check your connection and try again." };
  }
  for (const path of ["/ascend/paths", "/ascend", "/today", "/stats"]) revalidatePath(path);
  return { ok: true };
}
