import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { ART, type ArtId } from "@/lib/art";
import { cx } from "@/lib/cx";
import styles from "./Artwork.module.css";

interface ArtworkProps {
  id: ArtId;
  /** CSS aspect-ratio of the slot, e.g. "16 / 9". The image covers it. */
  ratio?: string;
  /** Above-the-fold hero art: loads eagerly. Everything else is lazy. */
  priority?: boolean;
  /** Darkens the art toward the page so text laid over it stays readable. */
  scrim?: "none" | "bottom" | "full";
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * A slot for pixel art (Design System V2 §8, §9). Decorative: the image has
 * an empty alt, and meaning always lives in the text around it. The mood
 * gradient shows while loading and if the file is missing, and the slot's
 * size is reserved, so there is no layout shift.
 */
export function Artwork({ id, ratio, priority = false, scrim = "none", className, children }: ArtworkProps) {
  const art = ART[id];
  const style = { aspectRatio: ratio ?? `${art.width} / ${art.height}` } as CSSProperties;
  return (
    <div className={cx(styles.slot, styles[art.mood], className)} style={style} data-art={id}>
      <Image
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        unoptimized
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className={styles.image}
        style={{ objectPosition: art.focus }}
      />
      {scrim !== "none" ? <span className={cx(styles.scrim, styles[`scrim_${scrim}`])} aria-hidden="true" /> : null}
      {children ? <div className={styles.content}>{children}</div> : null}
    </div>
  );
}
