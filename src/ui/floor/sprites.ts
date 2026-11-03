// The Floor's players (round 39): the game's own pixel sprites (art/sprite.ts), painted in each
// team's kit and each player's look, kept as small canvases and drawn a sprite pixel to a canvas
// pixel. Their shadows come off (the court draws one under each player, so a jump leaves it on the
// floor), and so does the ball (the court draws the one ball itself). Step 3: a frame for each part
// of a play (owner: "run, dribble, cross, spin, pull up, release, land, dunk, block, steal").

import { CHEER, DRIBBLE, DUNK, JUMPER, LOWDRIBBLE, REACH, RUN_A, RUN_B, SLIDE, SPIN_BACK, TRIPLE, noBall, paint, type Look, type Pose } from '../art/sprite';
import type { Kit } from '../../content/teamStyle';

export type Frame = 'stand' | 'guard' | 'slide' | 'runA' | 'runB' | 'dribble' | 'low' | 'back' | 'gather' | 'shoot' | 'dunk' | 'jump' | 'reach';

const bare = (p: Pose): Pose => ({ ...noBall(p), rows: noBall(p).rows.map((r) => r.replace(/o/g, '.')) });
/** The row a pose's feet stand on: its shadow's row (one more for the outline). */
const footOf = (p: Pose): number => p.rows.findIndex((r) => r.includes('o')) + 1;

const SOURCES: Record<Frame, Pose> = {
  stand: TRIPLE,
  guard: LOWDRIBBLE,
  slide: SLIDE,
  runA: RUN_A,
  runB: RUN_B,
  dribble: DRIBBLE,
  low: LOWDRIBBLE,
  back: SPIN_BACK,
  gather: TRIPLE,
  shoot: JUMPER,
  dunk: DUNK,
  jump: CHEER,
  reach: REACH,
};
const POSES = Object.fromEntries(Object.entries(SOURCES).map(([k, p]) => [k, { pose: bare(p), foot: footOf(p) }])) as Record<Frame, { pose: Pose; foot: number }>;

/** Where a sprite stands: the column under his middle. */
export const MID_X = 16;

export interface Drawn {
  canvas: HTMLCanvasElement;
  /** The canvas row his feet touch. */
  foot: number;
}

/** Each player's frames, painted once and kept. */
export class SpriteBook {
  private cache = new Map<string, Drawn>();

  get(id: string, frame: Frame, mirror: boolean, kit: Kit, look: Look, number: number): Drawn {
    const key = `${id}|${frame}|${mirror ? 1 : 0}`;
    const had = this.cache.get(key);
    if (had) return had;
    const { pose, foot } = POSES[frame];
    const grid = paint(pose, kit, look, number, mirror);
    const c = document.createElement('canvas');
    c.width = pose.w;
    c.height = pose.h;
    const ctx = c.getContext('2d')!;
    grid.forEach((row, y) =>
      row.forEach((col, x) => {
        if (!col) return;
        ctx.fillStyle = col;
        ctx.fillRect(mirror ? pose.w - 1 - x : x, y, 1, 1);
      }),
    );
    const d = { canvas: c, foot };
    this.cache.set(key, d);
    return d;
  }
}
