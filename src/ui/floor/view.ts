// The Floor's view (round 39, owner: "I actually want a high three quarter view", "can we go pseudo
// 3d?", "just court, crowd, and vibes"). The court in feet (engine/floor/court.ts) is seen from high
// above the near sideline and drawn on a small canvas a pixel at a time, then scaled up by a whole
// number, so every pixel stays square (the pixel rule). The camera only slides along the court, so
// each screen row keeps one depth: the rows are worked out once, and the floor, the lines and the
// stands are a few sums a pixel.

import { COURT, RIM_X, RIM_Y, THREE } from '../../engine/floor/court';
import { mix } from '../art/color';

export const VIEW = { w: 400, h: 225 } as const;

/** The camera: how far behind the near sideline it stands (feet), how much of the near sideline it
 * shows, and the screen rows the two sidelines fall on. Heights are drawn at `hk` of the floor's
 * scale, so the game's big-headed players stand under a rim a little above their heads. */
const CAM = { back: 115, nearWidth: 58, nearRow: 206, farRow: 82, hk: 0.6 };
const F = (VIEW.w * CAM.back) / CAM.nearWidth;
const K = (CAM.nearRow - CAM.farRow) / (1 / CAM.back - 1 / (CAM.back + COURT.h));
const HORIZON = CAM.nearRow - K / CAM.back;

/** The floor beyond the lines: the apron round the court, and the courtside seats past the near one. */
const APRON = { x0: -9, x1: COURT.w + 9, y0: -5, y1: COURT.h + 4 };

const depth = (y: number) => CAM.back + (COURT.h - y);

/** A spot on the screen, and the scale there (1 at the near sideline). */
export interface ScreenPt {
  x: number;
  y: number;
  s: number;
}

/** Where a point of the court (feet; `h` feet above the floor) falls on the screen. */
export function project(camX: number, x: number, y: number, h = 0): ScreenPt {
  const z = depth(y);
  return { x: VIEW.w / 2 + ((x - camX) * F) / z, y: HORIZON + K / z - (h * CAM.hk * F) / z, s: CAM.back / z };
}

/** How far the camera slides: the near sideline's view stays on the court, a little past each baseline. */
export const CAM_RANGE: [number, number] = [CAM.nearWidth / 2 - 5, COURT.w - CAM.nearWidth / 2 + 5];

// ---------------- colours ----------------

/** A colour as the canvas buffer keeps it (one 32-bit word: alpha, blue, green, red). */
function word(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  return ((0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
}

/** His arena's colours (the team's own, content/teamStyle.ts). */
export interface ArenaLook {
  c1: string;
  c2: string;
  c3: string;
}

const luma = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const SKINS = ['#F3D2B8', '#E8BC98', '#D4A077', '#B67F55', '#8E5B3A', '#6B4029', '#4C2C1C'];
const OTHER_SHIRTS = ['#2A2F36', '#F4F4F4', '#3B4252', '#E8C547', '#7A1F2B', '#1F3A7A'];

function palette(a: ArenaLook) {
  // the paint takes the team's main colour unless it is near black, then its second
  const paint = luma(a.c1) < 0.12 ? a.c2 : a.c1;
  const apron = mix(a.c1, '#000000', 0.45);
  return {
    wood: ['#D9A46A', '#CF995F', '#DDAD76'].map(word),
    seam: word('#B9834E'),
    paint: [word(mix(paint, '#000000', 0.06)), word(mix(paint, '#000000', 0.18))],
    paintSeam: word(mix(paint, '#000000', 0.32)),
    centre: [word(mix(a.c2, '#000000', 0.05)), word(mix(a.c2, '#000000', 0.16))],
    apron: word(apron),
    apronEdge: word(mix(apron, '#000000', 0.35)),
    line: word('#F6F2EA'),
    dark: word('#14161D'),
    side: word('#1C1F27'),
    stand: word('#191B23'),
    standHi: word('#20232D'),
    seat: word('#2B2E39'),
    seatHi: word('#1E2028'),
    skins: SKINS.map(word),
    skinsHi: SKINS.map((c) => word(mix(c, '#000000', 0.4))),
    shirts: [a.c1, a.c1, a.c1, a.c2, a.c2, a.c3, ...OTHER_SHIRTS].map(word),
    shirtsHi: [a.c1, a.c1, a.c1, a.c2, a.c2, a.c3, ...OTHER_SHIRTS].map((c) => word(mix(c, '#000000', 0.42))),
    led: [word(a.c1 === '#000000' ? '#3A3F4B' : a.c1), word(a.c2), word(mix(a.c2, '#FFFFFF', 0.45))],
    ledEdge: word('#0B0C10'),
    roof: word('#0C0D12'),
    lamp: [word('#FFF6D2'), word('#8C8468')],
    flash: word('#FFFFFF'),
  };
}
type Pal = ReturnType<typeof palette>;

/** A quick integer hash (seats, flashes). */
function hash3(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// ---------------- the court's lines ----------------

type Line = [number, number][];
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 28): Line {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
}

/** Every line on the court, as polylines in feet. */
function courtLines(): Line[] {
  const L: Line[] = [
    [[0, 0], [COURT.w, 0], [COURT.w, COURT.h], [0, COURT.h], [0, 0]],
    [[COURT.w / 2, 0], [COURT.w / 2, COURT.h]],
    arc(COURT.w / 2, RIM_Y, 6, 0, Math.PI * 2, 40),
    arc(COURT.w / 2, RIM_Y, 2, 0, Math.PI * 2, 16),
  ];
  for (const side of [0, 1] as const) {
    const rim = side === 0 ? RIM_X[1] : RIM_X[0];
    const base = side === 0 ? 0 : COURT.w;
    const dir = side === 0 ? 1 : -1;
    const ftX = base + dir * 19;
    // the key and the free-throw circle
    L.push([[base, RIM_Y - 8], [ftX, RIM_Y - 8], [ftX, RIM_Y + 8], [base, RIM_Y + 8]]);
    L.push(side === 0 ? arc(ftX, RIM_Y, 6, -Math.PI / 2, Math.PI / 2, 20) : arc(ftX, RIM_Y, 6, Math.PI / 2, (Math.PI * 3) / 2, 20));
    // the three-point line: the corners, then the arc round the rim
    const cornerEnd = base + dir * THREE.cornerLen;
    const a0 = Math.acos((THREE.cornerLen - Math.abs(rim - base)) / THREE.arc);
    // both arcs run from the far corner (y 3) to the near one (y 47), the way the polyline goes; the
    // right one the other way round drew a straight line up the court through the key
    const arcPts = side === 0 ? arc(rim, RIM_Y, THREE.arc, -a0, a0, 36) : arc(rim, RIM_Y, THREE.arc, Math.PI + a0, Math.PI - a0, 36);
    L.push([[base, RIM_Y - THREE.corner], [cornerEnd, RIM_Y - THREE.corner], ...arcPts.filter((_, i) => i > 0 && i < arcPts.length - 1), [cornerEnd, RIM_Y + THREE.corner], [base, RIM_Y + THREE.corner]]);
    // the restricted area under the rim
    L.push(side === 0 ? arc(rim, RIM_Y, 4, -Math.PI / 2, Math.PI / 2, 14) : arc(rim, RIM_Y, 4, Math.PI / 2, (Math.PI * 3) / 2, 14));
  }
  return L;
}
const LINES = courtLines();

// ---------------- the backdrop: stands, floor and lines, a pixel at a time ----------------

interface Row {
  /** Court feet from the far sideline (floor rows), the feet one pixel spans across, the band of planks. */
  y: number;
  px: number;
  band: number;
}

export class Backdrop {
  private img: ImageData;
  private buf: Uint32Array;
  private rows: (Row | null)[];
  private pal: Pal;
  /** The first floor row: everything above it is the stands. */
  readonly floorTop: number;

  constructor(ctx: CanvasRenderingContext2D, arena: ArenaLook) {
    this.img = ctx.createImageData(VIEW.w, VIEW.h);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.pal = palette(arena);
    this.floorTop = Math.ceil(HORIZON + K / depth(APRON.y0));
    this.rows = Array.from({ length: VIEW.h }, (_, r) => {
      if (r < this.floorTop) return null;
      const z = K / (r + 0.5 - HORIZON);
      const y = COURT.h - (z - CAM.back);
      return { y, px: z / F, band: Math.floor((y + 100) / 1.25) };
    });
  }

  /** Draws the stands, the floor and its lines for a camera at `camX`; `t` is real seconds (the
   * crowd's bounce, the ribbon boards), `hype` 0 to 1 how loud the building is. */
  draw(ctx: CanvasRenderingContext2D, camX: number, t: number, hype: number): void {
    this.stands(camX, t, hype);
    this.floor(camX);
    this.lines(camX);
    ctx.putImageData(this.img, 0, 0);
  }

  private floor(camX: number): void {
    const P = this.pal;
    const W = VIEW.w;
    for (let r = this.floorTop; r < VIEW.h; r++) {
      const row = this.rows[r]!;
      const Y = row.y;
      const o = r * W;
      const tone = P.wood[hash3(row.band, 3, 9) % 3];
      const par = row.band & 1;
      const off = (row.band * 37) % 8;
      const inside = Y >= 0 && Y <= COURT.h;
      const keyRow = Y >= RIM_Y - 8 && Y <= RIM_Y + 8;
      const dy = Y - RIM_Y;
      for (let c = 0; c < W; c++) {
        const X = camX + (c + 0.5 - W / 2) * row.px;
        let col: number;
        if (Y > APRON.y1) col = P.side;
        else if (X < APRON.x0 || X > APRON.x1) col = P.dark;
        else if (!inside || X < 0 || X > COURT.w) col = Y < APRON.y0 + 0.6 || X < APRON.x0 + 0.6 || X > APRON.x1 - 0.6 ? P.apronEdge : P.apron;
        else {
          const seam = ((X + off) % 8) < row.px;
          const dx = X - COURT.w / 2;
          if (keyRow && (X <= 19 || X >= COURT.w - 19)) col = seam ? P.paintSeam : P.paint[par];
          else if (dx * dx + dy * dy <= 36) col = seam ? P.paintSeam : P.centre[par];
          else col = seam ? P.seam : tone;
        }
        this.buf[o + c] = col;
      }
    }
  }

  private plot(x: number, y: number, col: number): void {
    if (x < 0 || x >= VIEW.w || y < this.floorTop || y >= VIEW.h) return;
    this.buf[y * VIEW.w + x] = col;
  }

  /** A one-pixel line between two screen points (Bresenham), so no line ever breaks or blurs. */
  private seg(x0: number, y0: number, x1: number, y1: number, col: number): void {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = -Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 2000; i++) {
      this.plot(x, y, col);
      if (x === xe && y === ye) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private lines(camX: number): void {
    for (const line of LINES) {
      let prev: ScreenPt | null = null;
      for (const [x, y] of line) {
        const p = project(camX, x, y);
        if (prev) this.seg(prev.x, prev.y, p.x, p.y, this.pal.line);
        prev = p;
      }
    }
  }

  /** The stands behind the far sideline: the lower bowl, a ribbon board in the team's colours, the
   * upper bowl, the roof and its lights. Each tier sits at its own depth, so it slides at its own
   * pace as the camera moves. */
  private stands(camX: number, t: number, hype: number): void {
    const P = this.pal;
    const W = VIEW.w;
    const top = this.floorTop;
    const beat = Math.floor(t * 6);
    const flashT = Math.floor(t * 12);
    const tiers = [
      { from: top - 31, to: top, z: depth(APRON.y0) + 8, seat: 1.3, rowH: 5, hi: false },
      { from: top - 63, to: top - 37, z: depth(APRON.y0) + 70, seat: 1.1, rowH: 4, hi: true },
    ];
    for (let r = 0; r < top; r++) {
      const o = r * W;
      const tier = tiers.find((q) => r >= q.from && r < q.to);
      if (tier) {
        const up = tier.to - 1 - r;
        const rowN = Math.floor(up / tier.rowH);
        const ly = up % tier.rowH;
        const cell = (tier.seat * F) / tier.z;
        for (let c = 0; c < W; c++) {
          const wx = camX + ((c + 0.5 - W / 2) * tier.z) / F + (rowN & 1 ? tier.seat / 2 : 0);
          const seatN = Math.floor(wx / tier.seat);
          const lx = (wx / tier.seat - seatN) * cell;
          const h = hash3(seatN, rowN, tier.hi ? 2 : 1);
          const bob = hype > 0.25 && (beat + h) % (hype > 0.7 ? 2 : 4) === 0 ? 1 : 0;
          const y = ly - bob;
          let col = tier.hi ? P.standHi : P.stand;
          if (ly === 0) col = tier.hi ? P.seatHi : P.seat;
          else if (tier.rowH === 5 ? y >= 1 && y <= 2 && lx >= 0.8 && lx < cell - 0.8 : y === 1 && lx >= 0.5 && lx < cell - 0.5) col = (tier.hi ? P.shirtsHi : P.shirts)[h % P.shirts.length];
          else if (tier.rowH === 5 ? y >= 3 && y <= 4 && lx >= cell / 2 - 1.1 && lx < cell / 2 + 1.1 : y >= 2 && y <= 3 && lx >= cell / 2 - 0.7 && lx < cell / 2 + 0.7)
            col = hash3(seatN, rowN, flashT) % 2400 === 0 ? P.flash : (tier.hi ? P.skinsHi : P.skins)[(h >>> 5) % P.skins.length];
          this.buf[o + c] = col;
        }
        continue;
      }
      if (r >= top - 37 && r < top - 31) {
        // the ribbon board: a dark frame round chevrons sliding by in the team's colours
        const edge = r === top - 37 || r === top - 32;
        const zr = depth(APRON.y0) + 30;
        for (let c = 0; c < W; c++) {
          if (edge) {
            this.buf[o + c] = P.ledEdge;
            continue;
          }
          const wx = camX * (F / zr) + c + t * 18;
          const k = Math.floor(wx + (r % 4)) % 14;
          this.buf[o + c] = k < 6 ? P.led[0] : k < 12 ? P.led[1] : P.led[2];
        }
        continue;
      }
      // the roof: dark, with a row of lights
      for (let c = 0; c < W; c++) {
        const lamp = (c + 20) % 64 < 6 && r >= 3 && r <= 4;
        const glow = (c + 20) % 64 >= 1 && (c + 20) % 64 < 5 && r === 5;
        this.buf[o + c] = lamp ? P.lamp[0] : glow ? P.lamp[1] : P.roof;
      }
    }
  }
}

// ---------------- the baskets ----------------

/** Fills one screen pixel (a canvas square, rounded to the grid). */
const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, w = 1, h = 1) => ctx.fillRect(Math.round(x), Math.round(y), w, h);

function line(ctx: CanvasRenderingContext2D, a: ScreenPt, b: ScreenPt, w = 1): void {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))));
  for (let i = 0; i <= n; i++) dot(ctx, a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, w, w);
}

/** One basket, the left (0) or the right (1): the padded stanchion behind the baseline, its arm, the
 * glass seen almost edge-on (the broadcast look), the orange rim and the net. */
export function drawBasket(ctx: CanvasRenderingContext2D, camX: number, side: 0 | 1, pad: string): void {
  const dir = side === 0 ? -1 : 1;
  const base = side === 0 ? 0 : COURT.w;
  const rimX = side === 0 ? RIM_X[1] : RIM_X[0];
  const boardX = base - dir * 4;
  const poleX = base + dir * 3.5;
  const P = (x: number, y: number, h: number) => project(camX, x, y, h);
  // the pad at the stanchion's foot
  ctx.fillStyle = mix(pad, '#000000', 0.2);
  const a = P(poleX - 1.8, RIM_Y + 1.6, 3.2);
  const b = P(poleX + 1.8, RIM_Y + 1.6, 0);
  ctx.fillRect(Math.round(Math.min(a.x, b.x)), Math.round(a.y), Math.max(2, Math.round(Math.abs(b.x - a.x))), Math.max(2, Math.round(b.y - a.y)));
  ctx.fillStyle = pad;
  const c = P(poleX - 1.8, RIM_Y - 1.6, 3.2);
  ctx.fillRect(Math.round(Math.min(c.x, a.x)), Math.round(c.y), Math.max(2, Math.round(Math.abs(a.x - c.x)) + 1), Math.max(1, Math.round(a.y - c.y)));
  // the pole and the arm
  ctx.fillStyle = '#8E95A1';
  line(ctx, P(poleX, RIM_Y, 3.2), P(poleX, RIM_Y, 12.6), 2);
  line(ctx, P(poleX, RIM_Y, 12.6), P(boardX + dir * 0.4, RIM_Y, 11.6), 2);
  // the glass: a narrow slanted pane with a white frame
  const g0 = P(boardX, RIM_Y - 3, 13);
  const g1 = P(boardX, RIM_Y + 3, 13);
  const g2 = P(boardX, RIM_Y + 3, 9.5);
  const g3 = P(boardX, RIM_Y - 3, 9.5);
  ctx.fillStyle = '#C9D6E0';
  const x0 = Math.round(Math.min(g0.x, g1.x));
  const x1 = Math.round(Math.max(g0.x, g1.x));
  for (let x = x0; x <= x1; x++) {
    const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
    const near = g0.x < g1.x ? k : 1 - k;
    const yt = g0.y + (g1.y - g0.y) * near;
    const yb = g3.y + (g2.y - g3.y) * near;
    ctx.fillRect(x, Math.round(yt), 1, Math.max(1, Math.round(yb - yt)));
  }
  ctx.fillStyle = '#FFFFFF';
  line(ctx, g0, g1);
  line(ctx, g1, g2);
  line(ctx, g2, g3);
  line(ctx, g3, g0);
  // the rim (seen from above, a flat ring) and the net hanging under its front
  // after the first play: a slightly bigger rim (owner), its front half a pixel thicker
  const R = 1.05;
  const ring = Array.from({ length: 24 }, (_, i) => {
    const an = (i / 24) * Math.PI * 2;
    return P(rimX + Math.cos(an) * R, RIM_Y + Math.sin(an) * R, 10);
  });
  ctx.fillStyle = '#F2F2F2';
  for (let i = 0; i < 24; i += 2) {
    const an = (i / 24) * Math.PI * 2;
    if (Math.sin(an) < -0.2) continue;
    line(ctx, P(rimX + Math.cos(an) * R, RIM_Y + Math.sin(an) * R, 10), P(rimX + Math.cos(an) * 0.6, RIM_Y + Math.sin(an) * 0.6, 8.4));
  }
  ctx.fillStyle = '#E8562A';
  ring.forEach((p, i) => line(ctx, p, ring[(i + 1) % ring.length], Math.sin(((i + 0.5) / 24) * Math.PI * 2) > 0.1 ? 2 : 1));
}

/** The courtside fans past the near sideline, in front of everything: dark heads and shoulders. */
export function drawFrontRow(ctx: CanvasRenderingContext2D, camX: number, t: number, hype: number): void {
  const y = COURT.h + 7;
  const beat = Math.floor(t * 5);
  ctx.fillStyle = '#0E1015';
  for (let n = Math.floor((camX - 60) / 2.6); n < (camX + 60) / 2.6; n++) {
    const x = n * 2.6;
    if (x < -8 || x > COURT.w + 8 || Math.abs(x - COURT.w / 2) < 9) continue; // the scorer's table leaves a gap
    const h = hash3(n, 5, 5);
    const up = hype > 0.5 && (beat + h) % 3 === 0 ? 1 : 0;
    const p = project(camX, x + ((h % 7) - 3) * 0.12, y, 3.6);
    const s = p.s;
    const hw = Math.round(1.6 * s * 2) / 2;
    ctx.fillRect(Math.round(p.x - hw), Math.round(p.y - up), Math.round(hw * 2), 4);
    ctx.fillRect(Math.round(p.x - hw * 2.2), Math.round(p.y + 4 - up), Math.round(hw * 4.4), VIEW.h);
  }
}

/** A soft dark oval under someone on the floor (a player, the ball): a few rows of pixels. */
export function drawShadow(ctx: CanvasRenderingContext2D, p: ScreenPt, w: number): void {
  ctx.fillStyle = 'rgba(10, 8, 14, 0.28)';
  const hw = Math.max(1, Math.round((w * p.s) / 2));
  ctx.fillRect(Math.round(p.x - hw), Math.round(p.y - 1), hw * 2, 2);
  ctx.fillRect(Math.round(p.x - hw + 1), Math.round(p.y - 2), Math.max(1, hw * 2 - 2), 1);
  ctx.fillRect(Math.round(p.x - hw + 1), Math.round(p.y + 1), Math.max(1, hw * 2 - 2), 1);
}

export { dot as pixel, line as pixelLine };
