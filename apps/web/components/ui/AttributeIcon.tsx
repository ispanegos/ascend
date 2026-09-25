import type { AttributeKey } from "@ascend/shared";
import { PixelIcon } from "./PixelIcon";

/**
 * Attribute identity (V2 §10): a pixel rune in the attribute's own hue.
 * Identity only — status is always shown separately, in words.
 */
export function AttributeIcon({
  attribute,
  size = 24,
  muted = false,
}: {
  attribute: AttributeKey | "overall";
  size?: number;
  /** Dormant look for unranked attributes. */
  muted?: boolean;
}) {
  return (
    <PixelIcon
      name={attribute}
      size={size}
      style={{ color: muted ? "var(--text-faint)" : `var(--attr-${attribute})` }}
    />
  );
}
