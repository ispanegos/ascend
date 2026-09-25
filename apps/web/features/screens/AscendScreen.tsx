import Link from "next/link";
import type { CSSProperties } from "react";
import { Artwork } from "@/components/art/Artwork";
import { ButtonLink } from "@/components/ui/Button";
import { PixelIcon, type PixelGlyph } from "@/components/ui/PixelIcon";
import { MAP_SIZE, NODE_POINTS, ROUTE, routePercent } from "@/lib/ascend-route";
import { cx } from "@/lib/cx";
import styles from "./ascend.module.css";

export type PathNodeState = "completed" | "current" | "future" | "boss";

export interface PathNode {
  label: string;
  detail: string;
  state: PathNodeState;
  icon: PixelGlyph;
  href?: string;
}

export interface AscendScreenProps {
  /** Exactly one node per NODE_POINTS entry, from the start to the Boss. */
  nodes: readonly PathNode[];
  objective: { title: string; text: string; href: string; cta: string };
}

/** Route points up to and including a node index. */
function routeUpTo(nodeIndex: number): string {
  const last = NODE_POINTS[Math.max(0, Math.min(nodeIndex, NODE_POINTS.length - 1))]!;
  return ROUTE.slice(0, last + 1)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

/**
 * ASCEND (V2 §17, pass 2): the strongest world surface. A continuous map with
 * the route drawn over it — lit where the athlete has been, gold at the
 * current node, dim ahead, red at the Boss. Not a mountain.
 */
export function AscendScreen({ nodes, objective }: AscendScreenProps) {
  const current = Math.max(0, nodes.findIndex((node) => node.state === "current"));
  const all = ROUTE.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <>
      <section className={styles.world} aria-labelledby="ascend-title">
        <Artwork id="paths.ascend-map" ratio={`${MAP_SIZE.width} / ${MAP_SIZE.height}`} priority className={styles.map}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Your journey</p>
            <h1 id="ascend-title" className={cx("text-fantasy", styles.title)}>
              Ascend
            </h1>
          </header>
          <svg className={styles.route} viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`} preserveAspectRatio="none" aria-hidden="true">
            <polyline points={all} className={styles.routeAhead} />
            <polyline points={routeUpTo(current)} className={styles.routeDone} />
          </svg>
          <ol className={styles.nodes}>
            {nodes.map((node, index) => {
              const at = routePercent(NODE_POINTS[index]!);
              const side = at.x > 50 ? styles.labelLeft : styles.labelRight;
              const content = (
                <>
                  <span className={styles.dot}>
                    <PixelIcon name={node.state === "future" ? "lock" : node.icon} size={node.state === "current" ? 24 : 16} />
                  </span>
                  <span className={cx(styles.label, side)}>
                    <span className={styles.labelTitle}>{node.label}</span>
                    <span className={styles.labelDetail}>{node.detail}</span>
                  </span>
                </>
              );
              return (
                <li
                  key={node.label}
                  className={cx(styles.node, styles[node.state])}
                  style={{ left: `${at.x}%`, top: `${at.y}%`, "--x": at.x } as CSSProperties}
                >
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

      <section className={styles.objective} aria-label="Current objective">
        <p className={styles.objectiveKicker}>
          <PixelIcon name="ascend" size={16} /> Current objective
        </p>
        <p className={cx("text-fantasy", styles.objectiveTitle)}>{objective.title}</p>
        <p className={styles.objectiveText}>{objective.text}</p>
        <ButtonLink href={objective.href}>{objective.cta}</ButtonLink>
      </section>
    </>
  );
}
