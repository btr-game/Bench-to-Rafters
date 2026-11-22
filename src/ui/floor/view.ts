// The Floor's view (round 39, owner: "I actually want a high three quarter view", "can we go pseudo
// 3d?", "just court, crowd, and vibes"). The court in feet (engine/floor/court.ts) is seen from high
// above the near sideline and drawn on a small canvas a pixel at a time, then scaled up by a whole
// number, so every pixel stays square (the pixel rule). The camera only slides along the court, so
// each screen row keeps one depth: the rows are worked out once, and the floor, the lines and the
// stands are a few sums a pixel.

import { COURT, RIM_X, RIM_Y, THREE } from '../../engine/floor/court';
import { mix } from '../art/color';
import { tx } from '../../i18n';
import { glyph } from '../art/pixel';

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
interface ScreenPt {
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

/** The courts the Floor can be played on: his team's arena, or one of four places of their own. A
 * court changes only the look: the floor, what stands behind it, the baskets' pads, who sits courtside. */
export type CourtLook = 'arena' | 'street' | 'beach' | 'gym' | 'rooftop';
export const COURTS: { id: CourtLook; name: string }[] = [
  { id: 'arena', name: tx('Team arena') },
  { id: 'street', name: tx('Street court') },
  { id: 'beach', name: tx('Beach court') },
  { id: 'gym', name: tx('1970s gym') },
  { id: 'rooftop', name: tx('Rooftop at night') },
];

/** The floor's own colours on each court that is not his team's arena. */
interface Ground {
  tones: string[];
  seam: string;
  paint: string | null;
  centre: string | null;
  apron: string;
  apronEdge: string;
  line: string;
  dark: string;
  side: string;
  grain: 'planks' | 'speckle';
  crack?: string;
  pad: string;
}
export const GROUND: Record<Exclude<CourtLook, 'arena'>, Ground> = {
  street: { tones: ['#4B4E54', '#46494F', '#515459'], seam: '#3C3F44', paint: '#3F5E86', centre: null, apron: '#414449', apronEdge: '#33363B', line: '#E4E1D6', dark: '#8A867D', side: '#7B776F', grain: 'speckle', crack: '#2E3135', pad: '#5E636B' },
  beach: { tones: ['#E6CF97', '#DEC58A', '#ECD7A4'], seam: '#D2B87C', paint: null, centre: null, apron: '#E0C88F', apronEdge: '#D6BC82', line: '#2E6FB5', dark: '#E3CB92', side: '#DCC389', grain: 'speckle', pad: '#2E6FB5' },
  gym: { tones: ['#B5713C', '#AA6835', '#BC7943'], seam: '#8A4F26', paint: '#7A2630', centre: '#C9962E', apron: '#5B3A21', apronEdge: '#422A18', line: '#EFE4CB', dark: '#1D140D', side: '#24180F', grain: 'planks', pad: '#7A2630' },
  rooftop: { tones: ['#2D6A5A', '#2A6555', '#317060'], seam: '#245848', paint: '#A8452F', centre: '#A8452F', apron: '#23414A', apronEdge: '#182F36', line: '#F0F0EA', dark: '#3A3B42', side: '#34353C', grain: 'speckle', pad: '#A8452F' },
};

/** The pad on the baskets' stanchions: the team's colour in its arena, the court's own elsewhere. */
export const padOf = (court: CourtLook, a: ArenaLook): string => (court === 'arena' ? a.c1 : GROUND[court].pad);

function palette(a: ArenaLook, court: CourtLook) {
  const base = { ...arenaPalette(a), grain: 'planks' as Ground['grain'], keyFill: true, centreFill: true, crack: 0 };
  if (court === 'arena') return base;
  const g = GROUND[court];
  return {
    ...base,
    wood: g.tones.map(word),
    seam: word(g.seam),
    paint: g.paint ? [word(g.paint), word(mix(g.paint, '#000000', 0.1))] : base.paint,
    paintSeam: word(mix(g.paint ?? g.seam, '#000000', 0.25)),
    centre: g.centre ? [word(g.centre), word(mix(g.centre, '#000000', 0.1))] : base.centre,
    apron: word(g.apron),
    apronEdge: word(g.apronEdge),
    line: word(g.line),
    dark: word(g.dark),
    side: word(g.side),
    grain: g.grain,
    keyFill: !!g.paint,
    centreFill: !!g.centre,
    crack: g.crack ? word(g.crack) : 0,
  };
}

/** The planks of a team's arena. */
export const ARENA_WOOD = ['#D9A46A', '#CF995F', '#DDAD76'];

function arenaPalette(a: ArenaLook) {
  // the paint takes the team's main colour unless it is near black, then its second
  const paint = luma(a.c1) < 0.12 ? a.c2 : a.c1;
  const apron = mix(a.c1, '#000000', 0.45);
  return {
    wood: ARENA_WOOD.map(word),
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

  constructor(ctx: CanvasRenderingContext2D, arena: ArenaLook, private court: CourtLook = 'arena') {
    this.img = ctx.createImageData(VIEW.w, VIEW.h);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.pal = palette(arena, court);
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
    if (this.court === 'arena') this.stands(camX, t, hype);
    else drawScenery(this.court, this.buf, this.floorTop, camX, t, hype);
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
        else if (P.grain === 'speckle') {
          // asphalt, sand or a rubber top: a grain of three tones a few inches across, and cracks
          const h = hash3(Math.floor(X * 2.5), Math.floor(Y * 2.5), 5);
          const dx = X - COURT.w / 2;
          if (P.keyFill && keyRow && (X <= 19 || X >= COURT.w - 19)) col = P.paint[h % 7 === 0 ? 1 : 0];
          else if (P.centreFill && dx * dx + dy * dy <= 36) col = P.centre[h % 7 === 0 ? 1 : 0];
          else col = P.crack && h % 89 === 0 ? P.crack : P.wood[h % 3];
        } else {
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

// ---------------- the other courts' backdrops ----------------

const SC = {
  street: {
    sky: ['#6FA8DC', '#86B9E3', '#A3CBEA'].map(word),
    bricks: ['#8C4A3C', '#7A5A4E', '#9C6B4F', '#6B5D57', '#83664A'].map(word),
    brickEdge: word('#4E3A33'),
    window: word('#2B3440'),
    lit: word('#E8D27A'),
    curb: word('#6E6A62'),
    walk: word('#9A968C'),
    walkSeam: word('#85817A'),
    wire: word('#B3B8BE'),
    rail: word('#7D838B'),
    post: word('#5F656D'),
  },
  beach: {
    sky: ['#4F9FDC', '#6DB2E6', '#8FC6EE', '#B5DBF3'].map(word),
    sun: word('#FFE27A'),
    sunIn: word('#FFF4C2'),
    cloud: word('#F6FBFF'),
    cloudLo: word('#DCEAF4'),
    sea: ['#1D6AA3', '#247DB8', '#2C90C9'].map(word),
    wave: word('#DDF1FF'),
    foam: word('#F4FAFC'),
    wet: word('#C8AE78'),
    sand: [word('#E2CA91'), word('#D8BE84')],
    trunk: word('#8B5E34'),
    trunkLo: word('#6E4826'),
    leaf: word('#2F8F3A'),
    leafLo: word('#21702B'),
    nut: word('#5A3A1E'),
  },
  gym: {
    ceiling: word('#211B14'),
    shade: word('#3E362B'),
    bulb: word('#F7DE9A'),
    glow: word('#7A6A4A'),
    block: [word('#BDB08F'), word('#B5A886')],
    blockDim: [word('#8F8468'), word('#887D62')],
    mortar: word('#8F8468'),
    mortarDim: word('#6B6350'),
    banner: [word('#7A2630'), word('#C9962E')],
    bannerStripe: word('#EFE4CB'),
    board: word('#14110D'),
    boardIn: word('#1F1A14'),
    amber: word('#E8A33A'),
    red: word('#E8402E'),
    plank: word('#8C5C33'),
    riser: word('#5C3A1F'),
    riserLo: word('#4A2E18'),
    shirts: ['#C8651B', '#8A5A2B', '#C9A227', '#6B7F2A', '#A33B2B', '#E2D6B5', '#3F5E86'].map(word),
    skins: SKINS.map((c) => word(mix(c, '#000000', 0.18))),
  },
  rooftop: {
    sky: ['#060918', '#0A0E22', '#0E142E', '#141B3A'].map(word),
    star: word('#E8ECFF'),
    starDim: word('#5A6390'),
    moon: word('#EEE9D2'),
    crater: word('#D3CDB2'),
    far: word('#1A2142'),
    farLit: word('#9C8D4E'),
    near: word('#0E1328'),
    nearEdge: word('#1D2545'),
    lit: [word('#F4D35E'), word('#E8B84A')],
    dark: word('#161C33'),
    antenna: word('#3A4160'),
    beacon: word('#FF4A3D'),
    cap: word('#565E72'),
    wall: word('#2C3140'),
    wallSeam: word('#252A37'),
    rail: word('#7C8598'),
    post: word('#5F6779'),
  },
};

const PALM = ['.....LL......LL.....', '...LLlLL...LLlLLL...', '.LLl...LLlLL...lLL..', 'LL.....LnTnL.....LL.', 'L.....L..T..L.....L.', '.....L...T...L......', '....L....T....L.....'];

/** The backdrop above the floor on a court that is not his team's arena: everything from the top of
 * the canvas down to `top` (the far apron), a pixel at a time, each layer sliding at its own depth. */
function drawScenery(court: Exclude<CourtLook, 'arena'>, buf: Uint32Array, top: number, camX: number, t: number, hype: number): void {
  const W = VIEW.w;
  const z0 = depth(APRON.y0);
  /** The court's feet across at screen column `c`, for a layer `z` feet from the camera. */
  const wx = (c: number, z: number) => camX + ((c + 0.5 - W / 2) * z) / F;
  const sx = (x: number, z: number) => Math.round(W / 2 + ((x - camX) * F) / z);
  const put = (x: number, y: number, col: number) => {
    if (x >= 0 && x < W && y >= 0 && y < top) buf[y * W + x] = col;
  };
  const disc = (cx: number, cy: number, r: number, col: number) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, col);
  };
  if (court === 'street') {
    const C = SC.street;
    const zB = z0 + 300;
    const zF = z0 + 5;
    const zW = z0 + 9;
    const bw = (18 * F) / zB;
    for (let r = 0; r < top; r++) {
      const o = r * W;
      for (let c = 0; c < W; c++) {
        let col = C.sky[r < 14 ? 0 : r < 28 ? 1 : 2];
        if (r >= top - 12) {
          const s = wx(c, zW);
          col = r === top - 12 ? C.curb : ((s % 6) + 6) % 6 < 0.12 * (zW / 100) ? C.walkSeam : C.walk;
        } else {
          // the buildings across the street: brick, a darker edge, rows of windows (a few lit)
          const bx = wx(c, zB);
          const b = Math.floor(bx / 18);
          const roof = top - 12 - (16 + (hash3(b, 1, 1) % 28));
          if (r >= roof) {
            const lx = (bx - b * 18) * (bw / 18);
            const ly = r - roof;
            col = C.bricks[hash3(b, 2, 2) % C.bricks.length];
            if (lx < 1 || ly === 0) col = C.brickEdge;
            else if (ly >= 3 && (ly - 3) % 6 < 3 && lx >= 3 && lx < bw - 3 && Math.floor(lx - 3) % 6 < 3) col = hash3(b, Math.floor((lx - 3) / 6), Math.floor((ly - 3) / 6)) % 4 === 0 ? C.lit : C.window;
          }
        }
        // the chain-link fence in front: posts, a rail along the top and the foot, diamonds of wire
        if (r >= top - 46) {
          const f = wx(c, zF);
          const u = Math.floor((f * F) / zF);
          const fr = r - (top - 46);
          if (((f % 12) + 12) % 12 < (2 * zF) / F) col = C.post;
          else if (fr <= 1 || r === top - 3) col = C.rail;
          else if ((u + fr) % 7 === 0 || (((u - fr) % 7) + 7) % 7 === 0) col = C.wire;
        }
        buf[o + c] = col;
      }
    }
    return;
  }
  if (court === 'beach') {
    const C = SC.beach;
    const sea = top - 30;
    const zS = z0 + 400;
    for (let r = 0; r < top; r++) {
      const o = r * W;
      for (let c = 0; c < W; c++) {
        let col: number;
        if (r < sea) col = C.sky[r < 12 ? 0 : r < 24 ? 1 : r < 36 ? 2 : 3];
        else if (r < top - 12) {
          const d = r - sea;
          col = C.sea[d < 4 ? 0 : d < 9 ? 1 : 2];
          const u = Math.floor((wx(c, zS) * F) / zS);
          // the waves roll by in steps
          if (d % 3 === 1 && (((u + Math.floor(t * 4) * (d % 2 ? 1 : -1) + d * 13) % 29) + 29) % 29 < 3) col = C.wave;
        } else if (r === top - 12) col = hash3(Math.floor(wx(c, z0 + 20)), 3, 3) % 5 === 0 ? C.wet : C.foam;
        else if (r < top - 7) col = C.wet;
        else col = C.sand[hash3(Math.floor(wx(c, z0 + 4) * 2), r, 4) % 6 === 0 ? 1 : 0];
        buf[o + c] = col;
      }
    }
    disc(Math.round(318 - camX * 0.15), 15, 8, C.sun);
    disc(Math.round(318 - camX * 0.15), 15, 5, C.sunIn);
    // a few clouds, far off
    for (let k = 0; k < 5; k++) {
      const cx = Math.round(((((k * 97 + 40 - camX * 0.6) % 480) + 480) % 480) - 40);
      const cy = 8 + ((k * 7) % 16);
      const rows: [number, number, number][] = [[4, 8, C.cloud], [1, 16, C.cloud], [0, 19, C.cloud], [2, 15, C.cloudLo]];
      rows.forEach(([x0, w, col], y) => {
        for (let x = 0; x < w; x++) put(cx + x0 + x, cy + y, col);
      });
    }
    // palm trees between the sea and the court
    const zP = z0 + 50;
    for (let k = Math.floor((camX - 160) / 31); k <= Math.ceil((camX + 160) / 31); k++) {
      const h = hash3(k, 9, 9);
      if (h % 3 === 0) continue;
      const base = top - 4;
      const x0 = sx(k * 31 + (h % 9), zP);
      const dir = h & 1 ? 1 : -1;
      const tall = 28 + (h % 8);
      let tx0 = x0;
      for (let i = 0; i < tall; i++) {
        tx0 = x0 + dir * Math.floor((i * i) / 160);
        for (let w = 0; w < 3; w++) put(tx0 + w, base - i, i % 3 === 0 && w === 0 ? C.trunkLo : C.trunk);
      }
      const map: Record<string, number> = { L: C.leaf, l: C.leafLo, n: C.nut, T: C.trunk };
      PALM.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && put(tx0 + 1 - 9 + x, base - tall - 3 + y, map[ch])));
    }
    return;
  }
  if (court === 'gym') {
    const C = SC.gym;
    const zW = z0 + 45;
    const beat = Math.floor(t * 4);
    for (let r = 0; r < top; r++) {
      const o = r * W;
      for (let c = 0; c < W; c++) {
        let col: number;
        if (r < 7) {
          const m = (c + 20) % 80;
          col = r >= 2 && r <= 4 && m >= 2 - (r - 2) && m < 10 + (r - 2) ? C.shade : r === 5 && m >= 3 && m < 9 ? C.bulb : r === 6 && m >= 4 && m < 8 ? C.glow : C.ceiling;
        } else if (r < top - 31) {
          // the cinder-block wall, dimmer up under the roof
          const u = Math.floor((wx(c, zW) * F) / zW);
          const rr = r - 7;
          const off = Math.floor(rr / 6) & 1 ? 6 : 0;
          const dim = r < 15;
          const mortar = rr % 6 === 5 || (((u + off) % 12) + 12) % 12 === 11;
          col = mortar ? (dim ? C.mortarDim : C.mortar) : (dim ? C.blockDim : C.block)[hash3(Math.floor((u + off) / 12), Math.floor(rr / 6), 6) % 2];
        } else {
          // wooden bleachers, a few fans in the colours of the day
          const up = top - 1 - r;
          const rowN = Math.floor(up / 5);
          const ly = up % 5;
          const zt = z0 + 8 + rowN * 2;
          const cell = (1.4 * F) / zt;
          const w = wx(c, zt) + (rowN & 1 ? 0.7 : 0);
          const seatN = Math.floor(w / 1.4);
          const lx = (w / 1.4 - seatN) * cell;
          const h = hash3(seatN, rowN, 70);
          const fan = h % 100 < 38;
          const bob = fan && hype > 0.45 && (beat + h) % 3 === 0 ? 1 : 0;
          const y = ly - bob;
          col = ly === 0 ? C.plank : ly === 4 ? C.riserLo : C.riser;
          if (fan && y >= 1 && y <= 2 && lx >= 0.8 && lx < cell - 0.8) col = C.shirts[(h >>> 3) % C.shirts.length];
          else if (fan && y >= 3 && y <= 4 && lx >= cell / 2 - 1.1 && lx < cell / 2 + 1.1) col = C.skins[(h >>> 5) % C.skins.length];
        }
        buf[o + c] = col;
      }
    }
    // the banners of the years it won, and the old scoreboard in the middle
    for (let k = Math.floor((camX - 140) / 22); k <= Math.ceil((camX + 140) / 22); k++) {
      if (Math.abs(k * 22 + 3 - COURT.w / 2) < 16) continue;
      const x0 = sx(k * 22 + 3, zW);
      const col = C.banner[((k % 2) + 2) % 2];
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 10; x++) {
          if (y >= 12 && (x < y - 11 || x > 20 - y)) continue;
          put(x0 + x, 10 + y, y >= 5 && y <= 6 ? C.bannerStripe : col);
        }
    }
    const bx = sx(COURT.w / 2, zW) - 22;
    for (let y = 0; y < 18; y++) for (let x = 0; x < 44; x++) put(bx + x, 10 + y, y === 0 || y === 17 || x === 0 || x === 43 ? C.board : C.boardIn);
    const text = (s: string, x0: number, y0: number, col: number) =>
      [...s].forEach((ch, i) => {
        const g = glyph(ch);
        for (let k = 0; k < 15; k++) if (g[k] === '1') put(x0 + i * 4 + (k % 3), y0 + Math.floor(k / 3), col);
      });
    text('HOME', bx + 3, 12, C.amber);
    text('GUEST', bx + 21, 12, C.amber);
    text('88', bx + 6, 20, C.red);
    text('88', bx + 28, 20, C.red);
    return;
  }
  // the rooftop at night: stars and a moon, the city in two rows of towers, the roof's own wall and rail
  const C = SC.rooftop;
  const zFar = z0 + 1100;
  const zNear = z0 + 380;
  const zR = z0 + 4;
  const blink = Math.floor(t * 1.5) % 2 === 0;
  const tw = Math.floor(t * 2);
  for (let r = 0; r < top; r++) {
    const o = r * W;
    for (let c = 0; c < W; c++) {
      let col = C.sky[r < 14 ? 0 : r < 30 ? 1 : r < 46 ? 2 : 3];
      if (r < 52) {
        const h = hash3(Math.floor(wx(c, 6000)), r, 77);
        if (h % 173 === 0) col = (h >>> 8) % 5 === 0 && (tw + h) % 2 ? C.starDim : C.star;
      }
      const fx = wx(c, zFar);
      const fb = Math.floor(fx / 9);
      const froof = top - 10 - (8 + (hash3(fb, 4, 4) % 26));
      if (r >= froof) {
        const lx = Math.floor((fx - fb * 9) * (F / zFar));
        const ly = r - froof;
        col = lx % 4 === 1 && ly % 4 === 2 && hash3(fb, lx, ly) % 6 === 0 ? C.farLit : C.far;
      }
      const nx = wx(c, zNear);
      const nb = Math.floor(nx / 15);
      const nh = hash3(nb, 5, 5);
      const nroof = top - 10 - (12 + (nh % 34));
      const nlx = (nx - nb * 15) * (F / zNear);
      const nw = (15 * F) / zNear;
      if (r >= nroof && nlx < nw - 3) {
        const ly = r - nroof;
        const lx = Math.floor(nlx);
        col = lx < 1 || ly === 0 ? C.nearEdge : C.near;
        if (ly >= 2 && lx >= 2 && lx < nw - 5 && lx % 4 < 2 && ly % 4 < 2) col = hash3(nb, lx >> 2, ly >> 2) % 3 === 0 ? C.lit[(nh >>> 4) & 1] : C.dark;
      } else if (nh % 4 === 0 && r < nroof && r >= nroof - 7 && Math.floor(nlx) === Math.floor(nw / 2) - 2) col = r === nroof - 7 && blink ? C.beacon : C.antenna;
      // the rail along the roof's edge, then the low wall it stands on
      if (r >= top - 20 && r < top - 10) {
        const f = wx(c, zR);
        if (r === top - 20) col = C.rail;
        else if (r === top - 15 || ((f % 8) + 8) % 8 < (1.6 * zR) / F) col = C.post;
      } else if (r >= top - 10) {
        const u = Math.floor((wx(c, zR) * F) / zR);
        col = r === top - 10 ? C.cap : r === top - 5 || ((u % 12) + 12) % 12 === 0 ? C.wallSeam : C.wall;
      }
      buf[o + c] = col;
    }
  }
  const mx = Math.round(70 - camX * 0.1);
  disc(mx, 14, 6, C.moon);
  put(mx - 2, 12, C.crater);
  put(mx - 1, 12, C.crater);
  put(mx + 2, 16, C.crater);
  put(mx + 1, 15, C.crater);
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
export function drawFrontRow(ctx: CanvasRenderingContext2D, camX: number, t: number, hype: number, court: CourtLook = 'arena'): void {
  // nobody sits courtside outdoors: on the street, the sand or up on the roof
  if (court !== 'arena' && court !== 'gym') return;
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
