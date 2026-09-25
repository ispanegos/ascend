import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EditableStep } from "./steps";

/** Missing context that blocks the Spawn Point. Unknown fields are listed, not assumed. */
export async function missingContext(userId: string): Promise<EditableStep[]> {
  const supabase = await createClient();
  const [profile, settings, weight, availability] = await Promise.all([
    supabase
      .from("profiles")
      .select("date_of_birth, height_cm, training_experience, recent_inactivity")
      .eq("id", userId)
      .single(),
    supabase.from("athlete_settings").select("environments").eq("athlete_id", userId).single(),
    supabase.from("body_measurements").select("id").eq("athlete_id", userId).eq("kind", "weight").limit(1),
    supabase.from("availability_windows").select("id").eq("athlete_id", userId).eq("available", true).limit(1),
  ]);
  const missing: EditableStep[] = [];
  if (!profile.data?.date_of_birth) missing.push("birth");
  if (!profile.data?.height_cm) missing.push("height");
  if (!weight.data?.length) missing.push("weight");
  if (!profile.data?.training_experience) missing.push("experience");
  if (!profile.data?.recent_inactivity) missing.push("activity");
  if (!settings.data?.environments.length) missing.push("environments");
  if (!availability.data?.length) missing.push("availability");
  return missing;
}

