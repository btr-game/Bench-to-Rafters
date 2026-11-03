// The Floor's court (round 39): a 94 by 50 foot court, measured in feet from the left baseline (x)
// and the far sideline (y). His team attacks the right basket, the other team the left. The view
// (a high three-quarter look, later) draws from these same feet.

export const COURT = { w: 94, h: 50 } as const;
export const RIM_X = [88.75, 5.25] as const;
export const RIM_Y = 25;
/** The three-point line: the arc, and the straight corner lines 22 feet out, 14 feet from the baseline. */
export const THREE = { arc: 23.75, corner: 22, cornerLen: 14 } as const;

export interface Spot {
  x: number;
  y: number;
}

export const dist = (a: Spot, b: Spot): number => Math.hypot(a.x - b.x, a.y - b.y);
export const rimOf = (team: 0 | 1): Spot => ({ x: RIM_X[team], y: RIM_Y });
/** How far a spot is from the basket a team attacks. */
export const toRim = (team: 0 | 1, p: Spot): number => dist(p, rimOf(team));

/** Whether a shot from here is a three for the team attacking that way. */
export function isThree(team: 0 | 1, p: Spot): boolean {
  const fromBase = team === 0 ? COURT.w - p.x : p.x;
  if (fromBase <= THREE.cornerLen) return Math.abs(p.y - RIM_Y) >= THREE.corner;
  return toRim(team, p) >= THREE.arc;
}

export type Zone = 'rim' | 'paint' | 'mid' | 'three';

export function zoneOf(team: 0 | 1, p: Spot): Zone {
  if (isThree(team, p)) return 'three';
  const d = toRim(team, p);
  return d < 4.5 ? 'rim' : d < 11 ? 'paint' : 'mid';
}

/** A spot given from the attacking basket's point of view (`ahead` feet out from the baseline,
 * `side` feet from the middle, minus to the far side), turned into court feet for that team. */
export function attackSpot(team: 0 | 1, ahead: number, side: number): Spot {
  return { x: team === 0 ? COURT.w - ahead : ahead, y: RIM_Y + side };
}

/** The five spots an offense spreads to, by position: the top, the two wings, the corner, the dunker spot. */
export const SPACING: Record<string, [number, number]> = {
  PG: [29, 0],
  SG: [22, 17],
  SF: [5, -22],
  PF: [20, -16],
  C: [6, 8],
};

/** Keeps a spot on the court. */
export const clampSpot = (p: Spot): Spot => ({ x: Math.max(0.5, Math.min(COURT.w - 0.5, p.x)), y: Math.max(0.5, Math.min(COURT.h - 0.5, p.y)) });

/** The distance from a point to the segment a pass flies along. */
export function toLine(p: Spot, a: Spot, b: Spot): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const k = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy));
}
