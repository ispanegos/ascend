import { QuestCard, type QuestCardProps } from "@/components/game/QuestCard";
import { ButtonLink } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LockedState } from "@/components/ui/States";
import styles from "./quests.module.css";

/**
 * Quests (V2 §16/§18, pass 2). Illustrated cards with real semantics:
 * what a Quest affects and what evidence it produces. `quests: null` is the
 * honest state before Quest generation exists.
 */
export function QuestsScreen({ quests }: { quests: readonly QuestCardProps[] | null }) {
  const done = quests?.filter((quest) => quest.status === "completed").length ?? 0;
  return (
    <>
      <ScreenHeader title="Quests" aside={quests ? <span className={styles.count}>{done} / {quests.length}</span> : undefined} />
      {quests ? (
        <section aria-labelledby="week-heading">
          <SectionHeader id="week-heading" title="This week" />
          <ul className={styles.list}>
            {quests.map((quest) => (
              <li key={quest.title}>
                <QuestCard {...quest} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <LockedState
          title="Quests open with your Paths"
          action={
            <ButtonLink href="/ascend/paths" fit="auto">
              Choose your paths
            </ButtonLink>
          }
        >
          <p>ASCEND builds your week of Quests from the Paths you choose and the Stats Spawn measured.</p>
        </LockedState>
      )}
      <p className={styles.principle}>
        <PixelIcon name="quest" size={16} />
        <span>A Quest produces evidence for your real Stats. Finishing one never adds points by itself.</span>
      </p>
    </>
  );
}
