import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Artwork } from "@/components/art/Artwork";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { cx } from "@/lib/cx";
import styles from "./ascend.module.css";

export const metadata: Metadata = { title: "Ascend" };

type NodeState = "completed" | "current" | "future" | "boss";

interface PathNode {
  label: string;
  detail: string;
  state: NodeState;
  icon: PixelIconName;
  href?: string;
  /** Position on the map, in % of its width/height. */
  x: number;
  y: number;
}

/*
 * The route follows the placeholder map's track (x = 64 + 26·sin(y/22) on a
 * 120×200 map). Only the first three nodes reflect real state today: Spawn
 * and initialization are done, Path choice is next. The rest are the
 * product's known stages, shown dormant — no invented progress.
 */
function onTrack(mapY: number): { x: number; y: number } {
  const x = 64 + Math.sin(mapY / 22) * 26;
  return { x: (x / 120) * 100, y: (mapY / 200) * 100 };
}

const NODES: readonly PathNode[] = [
  { label: "Spawn", detail: "Completed", state: "completed", icon: "check", ...onTrack(186) },
  { label: "Athlete profile", detail: "Initialized", state: "completed", icon: "check", ...onTrack(158) },
  { label: "Choose your Paths", detail: "Current objective", state: "current", icon: "ascend", href: "/ascend/paths", ...onTrack(128) },
  { label: "First Quests", detail: "Opens with your Paths", state: "future", icon: "quest", ...onTrack(100) },
  { label: "Verification", detail: "A later, independent result", state: "future", icon: "verified", ...onTrack(74) },
  { label: "Boss", detail: "Undiscovered", state: "boss", icon: "boss", ...onTrack(52) },
];

/** ASCEND (V2 §17): the strongest fantasy surface — a route, not a mountain. */
export default async function AscendPage() {
  await requireInitializedAthlete();
  return (
    <>
      <ScreenHeader eyebrow="Your journey" title="Ascend" />
      <section className={styles.mapWrap} aria-label="Your path">
        <Artwork id="paths.ascend-map" ratio="120 / 200" priority className={styles.map}>
          <ol className={styles.nodes}>
            {NODES.map((node) => {
              const side = node.x > 50 ? styles.labelLeft : styles.labelRight;
              const content = (
                <>
                  <span className={styles.dot}>
                    <PixelIcon name={node.state === "future" ? "lock" : node.icon} size={16} />
                  </span>
                  <span className={cx(styles.label, side)}>
                    <span className={styles.labelTitle}>{node.label}</span>
                    <span className={styles.labelDetail}>{node.detail}</span>
                  </span>
                </>
              );
              return (
                <li key={node.label} className={cx(styles.node, styles[node.state])} style={{ left: `${node.x}%`, top: `${node.y}%`, "--x": node.x } as CSSProperties}>
                  {node.href ? (
                    <Link href={node.href} className={styles.nodeLink}>
                      {content}
                    </Link>
                  ) : (
                    <span className={styles.nodeLink}>{content}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </Artwork>
      </section>
    </>
  );
}
