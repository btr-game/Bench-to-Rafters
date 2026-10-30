import { useMemo } from 'react';
import type { TeamStyle } from '../../engine/career/identity';
import { toPaths, type Pt } from './pixel';

// The team styles as a coach draws them (round 24, owner: "add graphics for team style"): a half
// court in chalk on a green board, the hoop at the top, O for his team, X for the defense, the
// ball in orange and the play's movement in yellow chalk.
const W = 44;
const H = 32;
const C = { board: '#1F3B2F', grain: '#24443A', frame: '#7A5532', frameDk: '#5C3F24', chalk: '#DCE8DF', faint: '#93AC9C', o: '#F4F7F2', x: '#F2A08F', move: '#F6D365', ball: '#F08A2C', hoop: '#E8590C', star: '#8FD3FF' };

type Grid = string[][];
const put = (g: Grid, x: number, y: number, c: string) => {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi > 0 && xi < W - 1 && yi > 0 && yi < H - 1) g[yi][xi] = c;
};

/** A chalk line; dotted for movement. */
function line(g: Grid, a: Pt, b: Pt, c: string, dot = 0): void {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  for (let i = 0; i <= n; i++) if (!dot || i % dot !== dot - 1) put(g, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, c);
}

/** A movement arrow: a dotted chalk line and a two-pixel head. */
function arrow(g: Grid, a: Pt, b: Pt, c = C.move): void {
  line(g, a, b, c, 3);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  put(g, b[0] - ux * 2 - uy * 1.5, b[1] - uy * 2 + ux * 1.5, c);
  put(g, b[0] - ux * 2 + uy * 1.5, b[1] - uy * 2 - ux * 1.5, c);
  put(g, b[0], b[1], c);
}

/** A player of his team: a hollow chalk ring (drawn over the lines, so they stop at him). */
const O = (g: Grid, [x, y]: Pt, c = C.o) => {
  [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].forEach(([dx, dy]) => put(g, x + dx, y + dy, c));
  put(g, x, y, C.board);
};
/** Him, when the play runs through him: a bigger ring. */
const O5 = (g: Grid, [x, y]: Pt, c: string) => {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(g, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) === 2 && Math.abs(dx) + Math.abs(dy) < 4 ? c : C.board);
};
const X = (g: Grid, [x, y]: Pt, c = C.x) => [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]].forEach(([dx, dy]) => put(g, x + dx, y + dy, c));
const ball = (g: Grid, [x, y]: Pt) => [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => put(g, x + 2 + dx, y - 2 + dy, C.ball));

/** The empty half court: the frame, the board's grain, baseline, key, arc and hoop. */
function court(): Grid {
  const g: Grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? (y === H - 1 || x === W - 1 ? C.frameDk : C.frame) : (x * 7 + y * 13) % 17 === 0 ? C.grain : C.board)));
  line(g, [2, 2], [W - 3, 2], C.faint); // baseline
  line(g, [17, 2], [17, 13], C.faint); // the key
  line(g, [26, 2], [26, 13], C.faint);
  line(g, [17, 13], [26, 13], C.faint);
  for (let a = 0; a <= 180; a += 4) {
    const r = (a * Math.PI) / 180;
    put(g, 21.5 + Math.cos(r) * 16.5, 3 + Math.sin(r) * 15, C.faint); // three-point arc
    if (a % 12 === 0) put(g, 21.5 + Math.cos(r) * 3.5, 13 + Math.sin(r) * 3, C.faint); // free-throw circle
  }
  [[21, 4], [22, 4], [20, 5], [23, 5], [21, 6], [22, 6]].forEach(([x, y]) => put(g, x, y, C.hoop));
  return g;
}

const PLAYS: Record<TeamStyle, (g: Grid) => void> = {
  // three lanes racing up the floor, the ball out in front
  pace: (g) => {
    arrow(g, [8, 28], [12, 10]);
    arrow(g, [21, 29], [21, 9]);
    arrow(g, [35, 28], [31, 10]);
    O(g, [8, 28]);
    O(g, [21, 29]);
    O(g, [35, 28]);
    ball(g, [21, 29]);
    X(g, [21, 17]);
    X(g, [12, 22]);
  },
  // five defenders in a shell around the paint, rotating to the ball
  defense: (g) => {
    const shell: Pt[] = [[14, 8], [29, 8], [17, 16], [26, 16], [21.5, 20]];
    shell.forEach((p) => X(g, p, C.chalk));
    arrow(g, [26, 16], [31, 21]);
    arrow(g, [21.5, 20], [21.5, 25]);
    O(g, [34, 23], C.x);
    O(g, [21, 28], C.x);
    ball(g, [34, 23]);
  },
  // five passers round the arc, the ball swinging between them
  motion: (g) => {
    const ring: Pt[] = [[7, 9], [12, 22], [21.5, 27], [31, 22], [36, 9]];
    ring.forEach((p, i) => arrow(g, p, ring[(i + 1) % ring.length].map((v, k) => v + (p[k] - v) * 0.22) as Pt));
    ring.forEach((p) => O(g, p));
    ball(g, ring[2]);
  },
  // the ball goes into the post, then back out to the shooters
  inside: (g) => {
    arrow(g, [21.5, 26], [18, 11]);
    arrow(g, [18, 11], [6, 6]);
    arrow(g, [18, 11], [37, 6]);
    O(g, [18, 11]);
    O(g, [21.5, 26]);
    O(g, [5, 4]);
    O(g, [38, 4]);
    X(g, [20, 9]);
    ball(g, [18, 11]);
  },
  // everyone clears out; he takes it to the rim himself
  star: (g) => {
    [[5, 4], [38, 4], [6, 24], [37, 24]].forEach((p) => O(g, p as Pt, C.faint));
    arrow(g, [21.5, 26], [21.5, 9], C.star);
    O5(g, [21.5, 26], C.star);
    X(g, [21.5, 19]);
    ball(g, [22.5, 25]);
  },
};

export function PlaybookArt({ style, size = 132 }: { style: TeamStyle; size?: number }) {
  const paths = useMemo(() => {
    const g = court();
    PLAYS[style](g);
    return toPaths(g);
  }, [style]);
  return (
    <svg className="art playbook-art" width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden="true">
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
