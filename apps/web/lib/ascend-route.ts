/**
 * The route through the ASCEND map (V2 §17), in the map artwork's native
 * pixels. Shared by scripts/generate-art.mjs (which paints the trail) and the
 * Ascend screen (which draws nodes and the lit route over it), so nodes always
 * sit on the path.
 */
export const MAP_SIZE = { width: 195, height: 440 } as const;

export interface RoutePoint {
  x: number;
  y: number;
}

/** From the start (bottom) to the Boss gate (top). */
export const ROUTE: readonly RoutePoint[] = [
  { x: 104, y: 428 },
  { x: 132, y: 392 },
  { x: 92, y: 352 },
  { x: 52, y: 318 },
  { x: 76, y: 276 },
  { x: 136, y: 246 },
  { x: 150, y: 206 },
  { x: 104, y: 172 },
  { x: 60, y: 146 },
  { x: 82, y: 118 },
  { x: 98, y: 92 },
];

/** Which route points carry a node, bottom to top. */
export const NODE_POINTS = [1, 3, 5, 6, 8, 10] as const;

/** Route point as % of the map, for absolutely positioned UI. */
export function routePercent(index: number): { x: number; y: number } {
  const point = ROUTE[index]!;
  return { x: (point.x / MAP_SIZE.width) * 100, y: (point.y / MAP_SIZE.height) * 100 };
}
