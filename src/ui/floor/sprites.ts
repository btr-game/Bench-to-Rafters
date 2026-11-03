// The Floor's players (round 39): the game's own pixel sprites (art/sprite.ts), painted in each
// team's kit and each player's look, kept as small canvases and drawn at the size their depth on the
// court gives. Their shadows come off (the court draws one under each player, so a jump leaves it on
// the floor), and so does the ball (the court draws the one ball itself).

import { CHEER, DRIBBLE, DUNK, JUMPER, LOWDRIBBLE, RUN_A, RUN_B, TRIPLE, noBall, paint, type Look, type Pose } from '../art/sprite';
import type { Kit } from '../../content/teamStyle';

export type Frame = 'stand' | 'guard' | 'runA' | 'runB' | 'dribble' | 'shoot' | 'dunk' | 'jump';

const bare = (p: Pose): Pose => ({ ...noBall(p), rows: noBall(p).rows.map((r) => r.replace(/o/g, '.')) });
const POSES: Record<Frame, Pose> = {
  stand: bare(TRIPLE),
  guard: bare(LOWDRIBBLE),
  runA: bare(RUN_A),
  runB: bare(RUN_B),
  dribble: bare(DRIBBLE),
  shoot: bare(JUMPER),
  dunk: bare(DUNK),
  jump: bare(CHEER),
};

/** Where a sprite stands: the column under his middle, and the row his feet touch. */
export const FOOT = { x: 16, y: 34 };

/** Each player's frames, painted once and kept. */
export class SpriteBook {
  private cache = new Map<string, HTMLCanvasElement>();

  get(id: string, frame: Frame, mirror: boolean, kit: Kit, look: Look, number: number): HTMLCanvasElement {
    const key = `${id}|${frame}|${mirror ? 1 : 0}`;
    let c = this.cache.get(key);
    if (c) return c;
    const pose = POSES[frame];
    const grid = paint(pose, kit, look, number, mirror);
    c = document.createElement('canvas');
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
    this.cache.set(key, c);
    return c;
  }
}
