// Pixel-art player sprites (round 17). A pose is a skeleton: joints, limb thicknesses, a ball.
// It is rasterised onto a small grid, shaded (light from the upper left), outlined, and given
// the details that sell it: hair, an eye, the jersey trim and number, socks, shoe soles, ball
// seams. The result is a list of coloured pixels; the component draws them as SVG rects.

import { DIGITS, dark, inCircle, inPoly, light, type Pt } from './pixel';

interface Limb {
  a: Pt;
  b: Pt;
  r: number;
}

export interface Pose {
  w: number;
  h: number;
  head: { c: Pt; r: number; facing: -1 | 1 };
  torso: Pt[];
  shorts: Pt[];
  armBack: Limb[];
  armFront: Limb[];
  legBack: Limb[];
  legFront: Limb[];
  shoeBack: Pt[];
  shoeFront: Pt[];
  ball?: { c: Pt; r: number; front: boolean };
  number: Pt; // top-left of the two digits on the chest
}

export interface Kit {
  skin: string;
  hair: string;
  jersey: string;
  trim: string;
  shoe: string;
  sole: string;
  number: number;
}

// part ids, back to front
const P = { legBack: 1, shoeBack: 2, armBack: 3, shorts: 4, torso: 5, legFront: 6, shoeFront: 7, ballBack: 8, armFront: 9, ballFront: 10, head: 11 } as const;

function inLimb(x: number, y: number, l: Limb): boolean {
  const [ax, ay] = l.a;
  const [bx, by] = l.b;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  const px = ax + t * dx - x;
  const py = ay + t * dy - y;
  return px * px + py * py <= l.r * l.r;
}

const OUTLINE = '#17131A';

/** Rasterise a pose in a kit: a grid of colours ('' = empty). */
export function paint(pose: Pose, kit: Kit): string[][] {
  const { w, h } = pose;
  const part: number[][] = Array.from({ length: h }, () => Array(w).fill(0));
  const set = (id: number, hit: (x: number, y: number) => boolean) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hit(x + 0.5, y + 0.5)) part[y][x] = id;
  };
  set(P.legBack, (x, y) => pose.legBack.some((l) => inLimb(x, y, l)));
  set(P.shoeBack, (x, y) => inPoly(x, y, pose.shoeBack));
  set(P.armBack, (x, y) => pose.armBack.some((l) => inLimb(x, y, l)));
  if (pose.ball && !pose.ball.front) set(P.ballBack, (x, y) => inCircle(x, y, pose.ball!.c, pose.ball!.r));
  set(P.shorts, (x, y) => inPoly(x, y, pose.shorts));
  set(P.torso, (x, y) => inPoly(x, y, pose.torso));
  set(P.legFront, (x, y) => pose.legFront.some((l) => inLimb(x, y, l)));
  set(P.shoeFront, (x, y) => inPoly(x, y, pose.shoeFront));
  set(P.armFront, (x, y) => pose.armFront.some((l) => inLimb(x, y, l)));
  if (pose.ball?.front) set(P.ballFront, (x, y) => inCircle(x, y, pose.ball!.c, pose.ball!.r));
  set(P.head, (x, y) => inCircle(x, y, pose.head.c, pose.head.r));

  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : part[y][x]);
  const base: Record<number, string> = {
    [P.legBack]: kit.skin,
    [P.legFront]: kit.skin,
    [P.armBack]: kit.skin,
    [P.armFront]: kit.skin,
    [P.head]: kit.skin,
    [P.torso]: kit.jersey,
    [P.shorts]: kit.jersey,
    [P.shoeBack]: kit.shoe,
    [P.shoeFront]: kit.shoe,
    [P.ballBack]: '#E2762B',
    [P.ballFront]: '#E2762B',
  };
  const out: string[][] = Array.from({ length: h }, () => Array(w).fill(''));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const id = part[y][x];
      if (!id) continue;
      let c = base[id];
      // back limbs sit in shadow
      if (id === P.legBack || id === P.armBack) c = dark(c, 0.16);
      // light from the upper left: rim shade on the lower right, a highlight on the upper left
      const edgeR = at(x + 1, y) !== id || at(x, y + 1) !== id;
      const edgeL = at(x - 1, y) !== id || at(x, y - 1) !== id;
      if (edgeR && !edgeL) c = dark(c, 0.22);
      else if (edgeL && !edgeR && id !== P.torso && id !== P.shorts) c = light(c, 0.14);
      out[y][x] = c;
    }

  // ---- details ----
  const put = (fx: number, fy: number, c: string, only?: number) => {
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    if (x >= 0 && y >= 0 && x < w && y < h && (only === undefined || part[y][x] === only)) out[y][x] = c;
  };
  // jersey: neckline, armholes, hem
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] !== P.torso) continue;
      const nbrs = [at(x - 1, y), at(x + 1, y), at(x, y - 1)];
      if (nbrs.some((n) => n === P.head || n === P.armFront || n === P.armBack || n === 0) && y < pose.torso[0][1] + 6) out[y][x] = kit.trim;
      if (at(x, y + 1) === P.shorts && at(x, y + 2) === P.shorts) out[y][x] = kit.trim;
    }
  // shorts: side stripe and hem
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] !== P.shorts) continue;
      if (at(x, y + 1) !== P.shorts && at(x, y + 1) !== P.torso) out[y][x] = kit.trim;
      else if (at(x - 1, y) !== P.shorts && at(x - 1, y) !== P.torso && at(x - 1, y) !== 0) out[y][x] = dark(kit.jersey, 0.3);
    }
  // chest number
  const num = String(Math.max(0, Math.min(99, kit.number)));
  const digits = num.length === 1 ? [num] : [num[0], num[1]];
  const startX = pose.number[0] + (digits.length === 1 ? 2 : 0);
  digits.forEach((d, i) => {
    const bits = DIGITS[+d];
    for (let k = 0; k < 15; k++) if (bits[k] === '1') put(startX + i * 4 + (k % 3), pose.number[1] + Math.floor(k / 3), kit.trim, P.torso);
  });
  // socks: the lowest skin rows of each shin, just above the shoe
  for (const [leg, shoe] of [
    [P.legBack, P.shoeBack],
    [P.legFront, P.shoeFront],
  ] as const)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (part[y][x] === leg && (at(x, y + 1) === shoe || at(x, y + 2) === shoe || at(x, y + 3) === shoe)) out[y][x] = leg === P.legBack ? '#D9DCE2' : '#F4F5F7';
  // shoe soles and a swoosh-free stripe
  for (const shoe of [P.shoeBack, P.shoeFront])
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (part[y][x] !== shoe) continue;
        if (at(x, y + 1) !== shoe) out[y][x] = kit.sole;
        else if (at(x, y + 2) !== shoe) out[y][x] = light(kit.shoe, 0.4);
      }
  // ball seams
  if (pose.ball) {
    const id = pose.ball.front ? P.ballFront : P.ballBack;
    const [cx, cy] = pose.ball.c;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (part[y][x] !== id) continue;
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (Math.abs(dy - dx * 0.35) < 0.5 || Math.abs(dx + dy * 0.2) < 0.5) out[y][x] = '#5A2A10';
      }
  }
  // head: hair on top and at the back, an ear, an eye, a jaw shadow
  const { c, r, facing } = pose.head;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] !== P.head) continue;
      const dx = (x + 0.5 - c[0]) * facing; // > 0 toward the face
      const dy = y + 0.5 - c[1];
      if (dy < -r * 0.25 || (dx < -r * 0.35 && dy < r * 0.35)) out[y][x] = at(x, y - 1) === 0 || at(x - facing, y) === 0 ? light(kit.hair, 0.12) : kit.hair;
    }
  const eyeX = Math.floor(c[0] + facing * r * 0.45);
  const eyeY = Math.floor(c[1]);
  put(eyeX, eyeY, OUTLINE, P.head);
  put(eyeX - facing, eyeY - 1, dark(kit.hair, 0.2), P.head);
  put(Math.floor(c[0] - facing * r * 0.15), eyeY + 1, dark(kit.skin, 0.25), P.head);

  // ---- outline: every empty pixel touching the figure ----
  const final = out.map((row) => [...row]);
  const floor = h - 1;
  for (let x = 6; x < w - 4; x++) if (!part[floor][x] && !at(x - 1, floor) && !at(x + 1, floor) && !at(x, floor - 1)) final[floor][x] = 'rgba(0,0,0,0.13)';
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) final[y][x] = OUTLINE;
    }
  // a thin line where the front arm crosses the body, so the limbs read
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const id = part[y][x];
      if (id !== P.armFront && id !== P.legFront) continue;
      const behind = [at(x - 1, y), at(x + 1, y), at(x, y + 1)].find((n) => n && n !== id && n < id && n !== P.ballBack);
      if (behind === P.torso || behind === P.shorts || behind === P.legBack || behind === P.armBack) final[y][x] = dark(base[id], 0.45);
    }
  return final;
}

/** Driving to the basket: leaning in, ball low on the near side, back foot pushing off. */
export const DRIBBLE: Pose = {
  w: 36,
  h: 48,
  head: { c: [16.4, 6.8], r: 4.5, facing: -1 },
  torso: [
    [11.8, 12.6],
    [22.6, 12.2],
    [24, 18],
    [24.4, 25.4],
    [14.6, 25.8],
    [12.4, 18.4],
  ],
  shorts: [
    [14.2, 25],
    [24.6, 25],
    [26.4, 32],
    [20.6, 33.2],
    [19.6, 30.6],
    [13, 32.6],
  ],
  armBack: [
    { a: [22.4, 13.6], b: [27.2, 17.8], r: 1.9 },
    { a: [27.2, 17.8], b: [29.8, 22.8], r: 1.6 },
  ],
  armFront: [
    { a: [12.6, 14], b: [9.2, 19.6], r: 2 },
    { a: [9.2, 19.6], b: [8.2, 24.8], r: 1.7 },
  ],
  legBack: [
    { a: [23, 31], b: [26.2, 37.4], r: 2.5 },
    { a: [26.2, 37.4], b: [30.4, 41.8], r: 1.9 },
  ],
  legFront: [
    { a: [17, 31], b: [11.8, 35.8], r: 2.7 },
    { a: [11.8, 35.8], b: [10.6, 42.2], r: 2 },
  ],
  shoeBack: [
    [27.8, 39.6],
    [34.6, 42.4],
    [34, 46.2],
    [26.8, 44.2],
  ],
  shoeFront: [
    [5.4, 41.6],
    [12.2, 41],
    [12.8, 44.8],
    [5, 44.8],
  ],
  ball: { c: [7, 29], r: 3.7, front: true },
  number: [15.4, 16.6],
};
