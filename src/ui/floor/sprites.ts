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

/** The pose each frame is drawn from (the dev deck's Catalog shows them). */
export const FRAME_POSES: Record<Frame, Pose> = {
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
const POSES = Object.fromEntries(Object.entries(FRAME_POSES).map(([k, p]) => [k, { pose: bare(p), foot: footOf(p) }])) as Record<Frame, { pose: Pose; foot: number }>;

/** Where a sprite stands: the column under his middle. */
const MID_X = 16;

export interface Drawn {
  canvas: HTMLCanvasElement;
  /** The canvas row his feet touch, and the column under his middle. */
  foot: number;
  mid: number;
}

const OUTLINE = '#1B1820';

/** Big-head mode (NBA Jam's): the head painted again at twice the size, its chin where his chin was,
 * the body over it (an arm up still crosses in front), then a one-pixel outline round the new head. */
function bigHead(head: string[][], body: string[][], foot: number): { grid: string[][]; foot: number; mid: number } {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  head.forEach((row, y) =>
    row.forEach((c, x) => {
      if (!c || c === OUTLINE) return;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }),
  );
  const w = body[0].length;
  const h = body.length;
  const hw = x1 - x0 + 1;
  const hh = y1 - y0 + 1;
  // the doubled head grows out from its chin: up and to both sides
  const cx = x0 + hw / 2;
  const padX = Math.ceil(hw / 2) + 1;
  const padTop = Math.max(0, hh * 2 - (y1 + 1) + 1);
  const W = w + padX * 2;
  const H = h + padTop;
  const grid: string[][] = Array.from({ length: H }, () => Array(W).fill(''));
  const isHead: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const gx = Math.round(padX + cx - hw);
  const gy = padTop + y1 + 1 - hh * 2;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const c = head[y][x];
      if (!c || c === OUTLINE) continue;
      for (let k = 0; k < 4; k++) {
        const X = gx + (x - x0) * 2 + (k & 1);
        const Y = gy + (y - y0) * 2 + (k >> 1);
        if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
        grid[Y][X] = c;
        isHead[Y][X] = true;
      }
    }
  body.forEach((row, y) =>
    row.forEach((c, x) => {
      if (!c) return;
      grid[y + padTop][x + padX] = c;
      isHead[y + padTop][x + padX] = false;
    }),
  );
  const near = (x: number, y: number) => !!isHead[y]?.[x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!grid[y][x] && (near(x - 1, y) || near(x + 1, y) || near(x, y - 1) || near(x, y + 1))) grid[y][x] = OUTLINE;
  return { grid, foot: foot + padTop, mid: MID_X + padX };
}

/** Each player's frames, painted once and kept. */
export class SpriteBook {
  private cache = new Map<string, Drawn>();

  get(id: string, frame: Frame, mirror: boolean, kit: Kit, look: Look, number: number, big = false): Drawn {
    const key = `${id}|${frame}|${mirror ? 1 : 0}|${big ? 1 : 0}`;
    const had = this.cache.get(key);
    if (had) return had;
    const { pose, foot } = POSES[frame];
    const made = big ? bigHead(paint(pose, kit, look, number, mirror, 'head'), paint(pose, kit, look, number, mirror, 'body'), foot) : { grid: paint(pose, kit, look, number, mirror), foot, mid: MID_X };
    const grid = made.grid;
    const w = grid[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = grid.length;
    const ctx = c.getContext('2d')!;
    grid.forEach((row, y) =>
      row.forEach((col, x) => {
        if (!col) return;
        ctx.fillStyle = col;
        ctx.fillRect(mirror ? w - 1 - x : x, y, 1, 1);
      }),
    );
    const d = { canvas: c, foot: made.foot, mid: made.mid };
    this.cache.set(key, d);
    return d;
  }
}
