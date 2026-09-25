import type { Metadata } from "next";
import { QuestsScreen } from "@/features/screens/QuestsScreen";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Quests" };

/** Quests — destination only. Quest generation is Milestone 4+; nothing is invented here. */
export default async function QuestsPage() {
  await requireInitializedAthlete();
  return <QuestsScreen quests={null} />;
}
