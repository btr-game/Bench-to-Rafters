// Pixel-art player sprites (round 17). A pose is a skeleton: a head, a torso and shorts outline,
// tapered limbs with a little muscle, shoes and a ball. Each part is rasterised onto the grid and
// lit like a solid (a sphere for the head and ball, cylinders for limbs and body) from the upper
// left, in four tones per material. Then come the details that sell it: the collar and armhole
// trim, side panels, a wordmark and an outlined number, the shorts stripe, socks, sneakers,
// hair, a headband or wristband, the ball's seams. A dark outline goes round the figure.

import type { Kit } from '../../content/teamStyle';
import { DIGITS, dark, inPoly, light, type Pt } from './pixel';

interface Limb {
  a: Pt;
  b: Pt;
  ra: number;
  rb: number;
  bulge?: number; // extra radius at the muscle
}

export interface Pose {
  w: number;
  h: number;
  head: { c: Pt; r: number; facing: -1 | 1 };
  neck: Pt;
  torso: Pt[];
  shorts: Pt[];
  armBack: Limb[];
  armFront: Limb[];
  handBack: { c: Pt; r: number };
  handFront: { c: Pt; r: number };
  legBack: Limb[];
  legFront: Limb[];
  shoeBack: Pt[];
  shoeFront: Pt[];
  ball?: { c: Pt; r: number; front: boolean };
  chest: Pt; // where the number sits (its top-left)
}

export interface Look {
  skin: string;
  hair: string;
  hairStyle: number; // 0 short, 1 fade, 2 high top, 3 buzz, 4 braids
  beard: boolean;
  headband: boolean;
  sleeve: boolean;
  shoe: string;
}

// part ids, back to front
const P = { legBack: 1, shoeBack: 2, armBack: 3, handBack: 4, ballBack: 5, shorts: 6, torso: 7, neck: 8, legFront: 9, shoeFront: 10, armFront: 11, handFront: 12, ballFront: 13, head: 14 } as const;
const OUT = '#18141C';
const L = (() => {
  const v = [-0.55, -0.62, 0.56];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

const lit = (nx: number, ny: number) => {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return nx * L[0] + ny * L[1] + nz * L[2];
};

/** Four tones of a material: highlight, base, shade, deep. Whites shade toward a cool grey. */
function tones(c: string): [string, string, string, string] {
  const u = c.toUpperCase();
  if (u === '#FFFFFF') return ['#FFFFFF', '#F1F3F7', '#C9CFDA', '#98A1B3'];
  if (u === '#EEE1C6') return ['#F8EFDC', '#EEE1C6', '#CFC0A0', '#A8977A'];
  return [light(c, 0.2), c, dark(c, 0.2), dark(c, 0.4)];
}
const band = (v: number) => (v > 0.78 ? 0 : v > 0.4 ? 1 : v > 0.08 ? 2 : 3);

type Hit = { hit: boolean; v: number };

function limbAt(x: number, y: number, l: Limb): Hit {
  const [ax, ay] = l.a;
  const [bx, by] = l.b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
  const r = l.ra + (l.rb - l.ra) * t + (l.bulge ?? 0) * Math.sin(Math.PI * Math.min(1, t / 0.8));
  const px = x - (ax + t * dx);
  const py = y - (ay + t * dy);
  if (Math.hypot(px, py) > r) return { hit: false, v: 0 };
  return { hit: true, v: lit(px / r, py / r) };
}

function sphereAt(x: number, y: number, c: Pt, r: number): Hit {
  const px = x - c[0];
  const py = y - c[1];
  if (px * px + py * py > r * r) return { hit: false, v: 0 };
  return { hit: true, v: lit(px / r, py / r) };
}

export function paint(pose: Pose, kit: Kit, look: Look, number: number): string[][] {
  const { w, h } = pose;
  const part: number[][] = Array.from({ length: h }, () => Array(w).fill(0));
  const val: number[][] = Array.from({ length: h }, () => Array(w).fill(0.5));
  const set = (id: number, f: (x: number, y: number) => Hit) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const r = f(x + 0.5, y + 0.5);
        if (r.hit) {
          part[y][x] = id;
          val[y][x] = r.v;
        }
      }
  };
  const limbs = (ls: Limb[]) => (x: number, y: number) => {
    let best: Hit = { hit: false, v: -2 };
    for (const l of ls) {
      const r = limbAt(x, y, l);
      if (r.hit && r.v > best.v) best = r;
    }
    return best;
  };
  // a solid body: lit across its width row by row
  const body = (poly: Pt[]) => {
    const rows: [number, number][] = [];
    for (let y = 0; y < h; y++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let x = 0; x < w; x++)
        if (inPoly(x + 0.5, y + 0.5, poly)) {
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
        }
      rows.push([lo, hi]);
    }
    return (x: number, y: number): Hit => {
      if (!inPoly(x, y, poly)) return { hit: false, v: 0 };
      const [lo, hi] = rows[Math.floor(y)];
      const half = Math.max(1, (hi - lo + 1) / 2);
      const u = (x - (lo + half)) / (half + 0.6);
      return { hit: true, v: lit(u * 0.95, -0.15) };
    };
  };
  const flat = (pts: Pt[], v: number) => (x: number, y: number) => ({ hit: inPoly(x, y, pts), v });

  set(P.legBack, limbs(pose.legBack));
  set(P.shoeBack, flat(pose.shoeBack, 0.3));
  set(P.armBack, limbs(pose.armBack));
  set(P.handBack, (x, y) => sphereAt(x, y, pose.handBack.c, pose.handBack.r));
  if (pose.ball && !pose.ball.front) set(P.ballBack, (x, y) => sphereAt(x, y, pose.ball!.c, pose.ball!.r));
  set(P.shorts, body(pose.shorts));
  set(P.torso, body(pose.torso));
  set(P.neck, limbs([{ a: pose.neck, b: [pose.head.c[0] - pose.head.facing * 0.6, pose.head.c[1] + 2], ra: 1.7, rb: 1.7 }]));
  set(P.legFront, limbs(pose.legFront));
  set(P.shoeFront, flat(pose.shoeFront, 0.6));
  set(P.armFront, limbs(pose.armFront));
  set(P.handFront, (x, y) => sphereAt(x, y, pose.handFront.c, pose.handFront.r));
  if (pose.ball?.front) set(P.ballFront, (x, y) => sphereAt(x, y, pose.ball!.c, pose.ball!.r));
  // a head is a little taller than wide
  set(P.head, (x, y) => sphereAt(pose.head.c[0] + (x - pose.head.c[0]) * 1.08, pose.head.c[1] + (y - pose.head.c[1]) * 0.92, pose.head.c, pose.head.r));

  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : part[y][x]);
  const skin = tones(look.skin);
  const jersey = tones(kit.base);
  const shoe = tones(look.shoe);
  const ball = tones('#E07028');
  const trim = tones(kit.trim);
  const inkT = tones(kit.ink);
  const mat = (id: number) => (id === P.torso || id === P.shorts ? jersey : id === P.shoeBack || id === P.shoeFront ? shoe : id === P.ballBack || id === P.ballFront ? ball : skin);
  const out: string[][] = Array.from({ length: h }, () => Array(w).fill(''));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const id = part[y][x];
      if (!id) continue;
      let b = band(val[y][x]);
      if (id === P.legBack || id === P.armBack || id === P.handBack || id === P.shoeBack) b = Math.min(3, b + 1); // the far side sits in shadow
      out[y][x] = mat(id)[b];
    }
  const put = (fx: number, fy: number, c: string, only?: number) => {
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    if (only !== undefined && part[y][x] !== only) return;
    out[y][x] = c;
  };

  // ---- jersey ----
  const [nx, ny] = pose.neck;
  let armpit = 0;
  for (let y = Math.ceil(ny) + 7; y < h && !armpit; y++) if (part[y].includes(P.torso)) armpit = y;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] !== P.torso) continue;
      const b = band(val[y][x]);
      // the collar: a scoop below the neck, skin inside, trim around it
      const reach = 3.6 - Math.abs(x + 0.5 - nx) * 0.75;
      if (y - ny < reach) out[y][x] = skin[Math.min(3, b + 1)];
      else if (y - ny < reach + 1.2) out[y][x] = trim[1];
      else if (y < armpit + 1) {
        const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1)];
        if (nb.some((n) => n === 0 || n === P.armBack || n === P.armFront || n === P.head)) out[y][x] = trim[Math.min(3, b + 1)];
      } else if (at(x - 1, y) !== P.torso || at(x + 1, y) !== P.torso) out[y][x] = trim[2];
      else if (kit.pattern === 'pinstripe' && x % 3 === 0) out[y][x] = dark(out[y][x], 0.12);
      else if (kit.pattern === 'sash' && Math.abs(x - nx - (y - ny) * 0.55 + 4) < 1.2) out[y][x] = trim[b];
      else if (kit.pattern === 'panel' && x > nx + 2) out[y][x] = dark(out[y][x], 0.1);
      else if (kit.pattern === 'sponsor' && y >= pose.chest[1] + 6 && y <= pose.chest[1] + 7) out[y][x] = trim[b];
      else if (kit.pattern === 'varsity' && (y === armpit + 2 || y === armpit + 4)) out[y][x] = trim[b];
      // the hem tucked into the shorts
      if (at(x, y + 1) === P.shorts && at(x, y + 2) === P.shorts && y > armpit) out[y][x] = jersey[3];
    }
  // wordmark: a row of letter-shaped ticks arching over the number
  const [cx0, cy0] = pose.chest;
  const letters = Math.min(6, kit.word.replace(/\s/g, '').length);
  const span = Math.min(11, Math.max(5, letters * 2 - 1));
  const wx = Math.round(cx0 + 3.5 - span / 2);
  for (let i = 0; i < span; i++) {
    if (i % 2 === 1 && i % 4 === 3) continue;
    const arch = Math.round(Math.abs(i - (span - 1) / 2) * 0.25);
    put(wx + i, cy0 - 3 + arch, inkT[1], P.torso);
    if (i % 3 !== 1) put(wx + i, cy0 - 4 + arch, inkT[1], P.torso);
  }
  // the number, outlined in the trim (a negative number: a plain jersey)
  const num = number < 0 ? '' : String(Math.min(99, number));
  const digits = num.length === 1 ? [num] : num.length === 2 ? [num[0], num[1]] : [];
  const nX = cx0 + (digits.length === 1 ? 2 : 0);
  const cells: Pt[] = [];
  digits.forEach((d, i) => {
    const bits = DIGITS[+d];
    for (let k = 0; k < 15; k++) if (bits[k] === '1') cells.push([nX + i * 4 + (k % 3), cy0 + Math.floor(k / 3)]);
  });
  for (const [x, y] of cells)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
    ] as Pt[])
      put(x + dx, y + dy, trim[1], P.torso);
  for (const [x, y] of cells) put(x, y, inkT[1], P.torso);

  // ---- shorts: waistband, side stripe, hem ----
  const notShorts = (n: number) => n !== P.shorts && n !== P.torso;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] !== P.shorts) continue;
      const b = band(val[y][x]);
      if (at(x, y - 1) !== P.shorts && at(x, y - 2) !== P.shorts) out[y][x] = trim[2];
      else if (notShorts(at(x - 1, y))) out[y][x] = trim[b];
      else if (notShorts(at(x - 2, y))) out[y][x] = trim[Math.min(3, b + 1)];
      else if (notShorts(at(x, y + 1))) out[y][x] = jersey[3];
      else if (kit.pattern === 'pinstripe' && x % 3 === 0) out[y][x] = dark(out[y][x], 0.12);
    }

  // ---- socks and shoes ----
  for (const [leg, sh] of [
    [P.legBack, P.shoeBack],
    [P.legFront, P.shoeFront],
  ] as const) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (part[y][x] !== leg) continue;
        const toShoe = [1, 2, 3, 4, 5].findIndex((k) => at(x, y + k) === sh);
        if (toShoe < 0) continue;
        out[y][x] = toShoe === 4 ? trim[1] : leg === P.legBack ? '#C9CFDA' : toShoe < 2 ? '#DCE0E8' : '#F4F6FA';
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (part[y][x] !== sh) continue;
        if (at(x, y + 1) !== sh) out[y][x] = '#F2F2F2';
        else if (at(x, y + 2) !== sh) out[y][x] = '#D6D8DE';
        else if (at(x, y - 1) !== sh && x % 2 === 0) out[y][x] = '#F2F2F2'; // laces
        else if ((x + y) % 5 === 0 && at(x, y + 3) === sh) out[y][x] = trim[1];
      }
  }

  // ---- ball ----
  if (pose.ball) {
    const id = pose.ball.front ? P.ballFront : P.ballBack;
    const [bx, by] = pose.ball.c;
    const r = pose.ball.r;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (part[y][x] !== id) continue;
        const dx = x + 0.5 - bx;
        const dy = y + 0.5 - by;
        if (Math.abs(dy - dx * 0.3) < 0.55 || Math.abs(dx + dy * 0.25) < 0.55 || Math.abs(Math.hypot(dx + r * 1.1, dy) - r * 1.25) < 0.55) out[y][x] = '#4A2210';
      }
    put(bx - r * 0.45, by - r * 0.5, '#FFC79A', id);
  }

  // ---- head: hair, face ----
  const { c, r, facing } = pose.head;
  const hair = tones(look.hair);
  const style = look.hairStyle;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] !== P.head) continue;
      const dx = (x + 0.5 - c[0]) * facing; // > 0 toward the face
      const dy = y + 0.5 - c[1];
      const line = style === 3 ? -r * 0.45 : style === 1 ? -r * 0.3 : -r * 0.2;
      const back = dx < -r * 0.25 && dy < r * (style === 1 || style === 3 ? -0.05 : 0.3);
      if (dy < line - Math.max(0, dx) * 0.15 || back) {
        let t = band(val[y][x]);
        if (style === 1 && dy > line - 1.2) t = Math.max(t, 2);
        out[y][x] = style === 4 && x % 2 === 0 ? hair[3] : hair[Math.min(3, t + 1)];
      }
    }
  if (style === 2)
    for (let y = Math.floor(c[1] - r - 2); y < c[1] - r + 1; y++)
      for (let x = Math.floor(c[0] - r * 0.75); x <= c[0] + r * 0.55; x++)
        if (y >= 0 && !part[y][x]) {
          part[y][x] = P.head;
          out[y][x] = hair[x < c[0] - r * 0.2 ? 1 : 2];
        }
  // a three-quarter face: both eyes, brows, a nose shadow, a mouth; the ear on the far side
  const ey = Math.floor(c[1] + 0.4);
  const eyeNear = Math.floor(c[0] + facing * r * 0.62);
  const eyeFar = Math.floor(c[0] + facing * r * 0.05);
  for (const ex of [eyeNear, eyeFar]) {
    put(ex, ey, OUT, P.head);
    put(ex, ey - 1, hair[2], P.head);
  }
  put(eyeNear - facing, ey - 1, hair[2], P.head);
  put(Math.floor(c[0] + facing * r * 0.4), ey + 1, skin[3], P.head); // nose
  put(Math.floor(c[0] + facing * r * 0.4), ey + 2, skin[2], P.head);
  put(Math.floor(c[0] + facing * r * 0.25), ey + 3, skin[3], P.head); // mouth
  put(Math.floor(c[0] + facing * r * 0.55), ey + 3, skin[3], P.head);
  put(Math.floor(c[0] - facing * r * 0.62), ey, skin[3], P.head); // ear
  put(Math.floor(c[0] - facing * r * 0.62), ey + 1, skin[2], P.head);
  if (look.beard)
    for (let k = -2; k < 3; k++) {
      put(c[0] + facing * k * 0.9, c[1] + r * 0.86, hair[2], P.head);
      put(c[0] + facing * (k * 0.9 + 0.5), c[1] + r * 0.66, hair[3], P.head);
    }
  if (look.headband)
    for (let x = 0; x < w; x++) {
      const y = Math.floor(c[1] - r * 0.45 + (x + 0.5 - c[0]) * facing * -0.12);
      if (y >= 0 && part[y][x] === P.head) out[y][x] = x % 3 === 0 ? trim[2] : trim[1];
    }
  // a wristband on the near arm, an arm sleeve on the far one
  const [wx0, wy0] = pose.armFront[pose.armFront.length - 1].b;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x] === P.armFront && Math.hypot(x + 0.5 - wx0, y + 0.5 - wy0) < 2.2) out[y][x] = trim[band(val[y][x])];
      if (look.sleeve && part[y][x] === P.armBack) out[y][x] = ['#3A3D46', '#2A2C33', '#1E2026', '#15161A'][band(val[y][x])];
    }

  // ---- outline round the figure, and lines where near limbs cross the body ----
  const final = out.map((row) => [...row]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (part[y][x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) final[y][x] = OUT;
    }
  const front = new Set<number>([P.armFront, P.handFront, P.legFront, P.ballFront, P.head]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const id = part[y][x];
      if (!front.has(id)) continue;
      const nbs = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      if (nbs.some((n) => n && n < id && !front.has(n) && n !== P.neck)) final[y][x] = dark(out[y][x], 0.5);
    }
  // ground shadow
  const floor = h - 1;
  for (let x = 4; x < w - 3; x++) if (!part[floor][x] && !final[floor][x]) final[floor][x] = 'rgba(0,0,0,0.14)';
  return final;
}

/** Guards: driving to the basket, ball low on the near side, back foot pushing off. */
export const DRIBBLE: Pose = {
  w: 44,
  h: 60,
  head: { c: [20, 6.6], r: 4.1, facing: -1 },
  neck: [21.4, 11.6],
  torso: [
    [13.6, 14.2],
    [17, 12.4],
    [25.6, 12.2],
    [29.6, 13.8],
    [29.4, 19.6],
    [27.8, 28],
    [16.4, 28.2],
    [15, 21],
  ],
  shorts: [
    [15.8, 26.8],
    [28.4, 26.8],
    [31.8, 38.8],
    [24.4, 39.8],
    [22.6, 35.6],
    [14.6, 39.6],
    [13.8, 31.4],
  ],
  armFront: [
    { a: [15.4, 15.2], b: [11.2, 21.8], ra: 2.7, rb: 2, bulge: 0.6 },
    { a: [11.2, 21.8], b: [10.2, 27.6], ra: 2, rb: 1.5, bulge: 0.4 },
  ],
  handFront: { c: [10, 29.2], r: 1.9 },
  armBack: [
    { a: [27.8, 14.6], b: [32.2, 20], ra: 2.5, rb: 1.9, bulge: 0.5 },
    { a: [32.2, 20], b: [34.2, 25.6], ra: 1.9, rb: 1.4, bulge: 0.3 },
  ],
  handBack: { c: [34.6, 27.2], r: 1.8 },
  legFront: [
    { a: [19.8, 35], b: [14.4, 42.4], ra: 3.3, rb: 2.5, bulge: 0.4 },
    { a: [14.4, 42.4], b: [13, 51.4], ra: 2.4, rb: 1.5, bulge: 0.55 },
  ],
  legBack: [
    { a: [26.4, 35], b: [30.2, 43], ra: 3.1, rb: 2.3, bulge: 0.3 },
    { a: [30.2, 43], b: [35, 49.2], ra: 2.2, rb: 1.4, bulge: 0.4 },
  ],
  shoeFront: [
    [8.4, 51.6],
    [12, 50.4],
    [15, 50.6],
    [15.6, 55.6],
    [6.4, 55.6],
    [6.6, 53.2],
  ],
  shoeBack: [
    [33.2, 48.2],
    [36.6, 48.8],
    [40.2, 51.6],
    [39.2, 55.2],
    [32, 52.2],
  ],
  ball: { c: [8.8, 33.8], r: 4.3, front: true },
  chest: [19.2, 18.4],
};

/** Wings: rising into a jump shot, the ball set above the head, guide hand on its side. */
export const JUMPER: Pose = {
  w: 44,
  h: 62,
  head: { c: [22.4, 13.4], r: 4.1, facing: -1 },
  neck: [22.8, 18.2],
  torso: [
    [16.2, 20],
    [19.4, 18.6],
    [26.2, 18.4],
    [29.2, 20],
    [28.6, 25.4],
    [27.4, 33.4],
    [17.6, 33.6],
    [16.6, 26],
  ],
  shorts: [
    [17, 32.4],
    [28, 32.4],
    [29.8, 43.4],
    [23.8, 44.2],
    [22.4, 40.4],
    [16.8, 44],
    [15.8, 37],
  ],
  armFront: [
    { a: [17.6, 20.6], b: [14.2, 14.4], ra: 2.6, rb: 2, bulge: 0.5 },
    { a: [14.2, 14.4], b: [15.6, 7.8], ra: 2, rb: 1.5, bulge: 0.3 },
  ],
  handFront: { c: [16, 6.4], r: 1.9 },
  armBack: [
    { a: [27.8, 20.4], b: [29, 13.8], ra: 2.4, rb: 1.9, bulge: 0.4 },
    { a: [29, 13.8], b: [23, 7.6], ra: 1.9, rb: 1.4, bulge: 0.2 },
  ],
  handBack: { c: [21.8, 6.4], r: 1.8 },
  legFront: [
    { a: [20.6, 42], b: [19, 48.4], ra: 3.2, rb: 2.4, bulge: 0.4 },
    { a: [19, 48.4], b: [20.2, 54.2], ra: 2.3, rb: 1.5, bulge: 0.5 },
  ],
  legBack: [
    { a: [26, 42], b: [28.6, 48.2], ra: 3, rb: 2.3, bulge: 0.3 },
    { a: [28.6, 48.2], b: [26.8, 53.6], ra: 2.2, rb: 1.4, bulge: 0.4 },
  ],
  shoeFront: [
    [17.4, 53.2],
    [21.6, 52.8],
    [22.6, 56.6],
    [17, 57.2],
  ],
  shoeBack: [
    [25, 52.6],
    [29.4, 53],
    [29.4, 56.6],
    [24.6, 56.2],
  ],
  ball: { c: [18, 4.6], r: 4.2, front: true },
  chest: [20.4, 24.4],
};

/** Bigs: flying in for a one-handed dunk, knee driven up, the free arm out for balance. */
export const DUNK: Pose = {
  w: 44,
  h: 63,
  head: { c: [19, 15.6], r: 4.1, facing: -1 },
  neck: [20, 20.4],
  torso: [
    [13.8, 22.4],
    [17, 20.8],
    [24.4, 20.4],
    [27.4, 21.8],
    [27.6, 27.4],
    [26.4, 35.4],
    [16.2, 35.8],
    [14.6, 28.4],
  ],
  shorts: [
    [15.4, 34.4],
    [27, 34.4],
    [29.4, 45.6],
    [22.8, 46.2],
    [21.2, 42.6],
    [14.8, 45.8],
    [13.6, 39],
  ],
  armFront: [
    { a: [15.4, 23], b: [11.6, 16], ra: 2.6, rb: 2, bulge: 0.5 },
    { a: [11.6, 16], b: [10.2, 9.4], ra: 2, rb: 1.5, bulge: 0.3 },
  ],
  handFront: { c: [9.8, 8.2], r: 2 },
  armBack: [
    { a: [26.4, 22.6], b: [32, 26.4], ra: 2.4, rb: 1.9, bulge: 0.4 },
    { a: [32, 26.4], b: [35.2, 31.6], ra: 1.9, rb: 1.4, bulge: 0.2 },
  ],
  handBack: { c: [35.6, 33], r: 1.8 },
  legFront: [
    { a: [19, 44], b: [13.4, 48], ra: 3.3, rb: 2.5, bulge: 0.4 },
    { a: [13.4, 48], b: [14.6, 55.2], ra: 2.4, rb: 1.5, bulge: 0.5 },
  ],
  legBack: [
    { a: [25.6, 44], b: [28.4, 51.2], ra: 3.1, rb: 2.3, bulge: 0.3 },
    { a: [28.4, 51.2], b: [32.6, 56.2], ra: 2.2, rb: 1.4, bulge: 0.4 },
  ],
  shoeFront: [
    [10.6, 55],
    [15.6, 54.4],
    [16.6, 58.4],
    [10, 59],
  ],
  shoeBack: [
    [30.4, 55.2],
    [35.4, 55.6],
    [36.6, 59.4],
    [31, 59.6],
  ],
  ball: { c: [8.6, 5], r: 4.2, front: true },
  chest: [18.8, 26.8],
};

/** Point guards: down low, the dribble at the knee, the free arm out to keep the defender off. */
export const LOWDRIBBLE: Pose = {
  w: 44,
  h: 57,
  head: { c: [18, 12.6], r: 4.1, facing: -1 },
  neck: [19.4, 17.4],
  torso: [
    [12.4, 20.2],
    [15.6, 18.4],
    [23, 18.2],
    [26.6, 19.6],
    [27.6, 25],
    [27, 32.4],
    [17.2, 33],
    [14.6, 26],
  ],
  shorts: [
    [16.4, 31.6],
    [27.8, 31.6],
    [31.2, 41],
    [24.8, 42.2],
    [22.6, 38.4],
    [15.4, 42],
    [13.4, 36],
  ],
  armFront: [
    { a: [14, 21], b: [10.4, 27.2], ra: 2.5, rb: 1.9, bulge: 0.5 },
    { a: [10.4, 27.2], b: [8.6, 33], ra: 1.9, rb: 1.5, bulge: 0.3 },
  ],
  handFront: { c: [8.2, 34.6], r: 1.9 },
  armBack: [
    { a: [25.6, 20], b: [31, 23.4], ra: 2.3, rb: 1.9, bulge: 0.4 },
    { a: [31, 23.4], b: [35.6, 26.6], ra: 1.9, rb: 1.4, bulge: 0.2 },
  ],
  handBack: { c: [37, 27.2], r: 1.8 },
  legFront: [
    { a: [18.8, 39], b: [11.6, 43.6], ra: 3.3, rb: 2.5, bulge: 0.4 },
    { a: [11.6, 43.6], b: [10.4, 51.4], ra: 2.4, rb: 1.5, bulge: 0.5 },
  ],
  legBack: [
    { a: [26.4, 39], b: [33.4, 44], ra: 3.1, rb: 2.3, bulge: 0.3 },
    { a: [33.4, 44], b: [34, 51.2], ra: 2.2, rb: 1.4, bulge: 0.4 },
  ],
  shoeFront: [
    [5.6, 51],
    [11.8, 50.2],
    [12.6, 54.8],
    [5, 54.8],
  ],
  shoeBack: [
    [31.6, 50.6],
    [37.6, 50.8],
    [38.4, 54.8],
    [31, 54.8],
  ],
  ball: { c: [7.6, 41.4], r: 4.2, front: true },
  chest: [18.2, 24],
};

/** Power forwards: standing in triple threat, the ball held at the hip in both hands. */
export const TRIPLE: Pose = {
  w: 44,
  h: 57,
  head: { c: [21, 6.6], r: 4.1, facing: -1 },
  neck: [21.6, 11.6],
  torso: [
    [15.6, 13.6],
    [18.6, 12.2],
    [25.4, 12],
    [28.6, 13.4],
    [28.8, 19],
    [28, 27.8],
    [17.2, 28],
    [16.2, 20],
  ],
  shorts: [
    [16.6, 26.8],
    [28.4, 26.8],
    [30, 37],
    [24, 37.6],
    [22.4, 34],
    [16.8, 37.6],
    [15.4, 31],
  ],
  armFront: [
    { a: [16.6, 15], b: [14.2, 21.6], ra: 2.6, rb: 2, bulge: 0.5 },
    { a: [14.2, 21.6], b: [12.4, 26.2], ra: 2, rb: 1.6, bulge: 0.3 },
  ],
  handFront: { c: [11.8, 27.2], r: 1.9 },
  armBack: [
    { a: [27, 14.6], b: [26, 21.8], ra: 2.4, rb: 1.9, bulge: 0.4 },
    { a: [26, 21.8], b: [16.4, 22.6], ra: 1.9, rb: 1.5, bulge: 0.2 },
  ],
  handBack: { c: [15, 22.2], r: 1.8 },
  legFront: [
    { a: [19.6, 35], b: [16.6, 43.4], ra: 3.4, rb: 2.6, bulge: 0.4 },
    { a: [16.6, 43.4], b: [16, 51.6], ra: 2.5, rb: 1.6, bulge: 0.5 },
  ],
  legBack: [
    { a: [25.8, 35], b: [28.4, 43.6], ra: 3.2, rb: 2.4, bulge: 0.3 },
    { a: [28.4, 43.6], b: [29.4, 51.6], ra: 2.3, rb: 1.5, bulge: 0.4 },
  ],
  shoeFront: [
    [11, 51.4],
    [17, 50.8],
    [17.6, 55.4],
    [10.4, 55.4],
  ],
  shoeBack: [
    [25.4, 51.4],
    [31.4, 51],
    [32, 55.4],
    [25, 55.4],
  ],
  ball: { c: [12.8, 24.2], r: 4.2, front: true },
  chest: [20.2, 18.4],
};
