import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { blankGrid, paintCrowd, paintFloor } from './arena';
import { mix } from './color';
import { glyph, toPaths } from './pixel';

// The play camera (round 19): playoff and title plays shown on the ball, not the player, and
// each kind of play from its own camera (round 19b). A three from the baseline, side on, the ball
// trailing on its long arc; a jumper from above the rim, the ball growing as it rises toward the
// camera and dropping into the ring; a layup at a three-quarter angle, a hand rolling it off the
// glass; a free throw from
// behind the shooter, the ball shrinking toward a far rim; a steal at floor level, a hand poking
// the dribble loose; a rim-out and a buzzer beater head on, the clock running out to 0.0 as the
// glass lights red. Dunks and blocks are close on the rim (round 19c): a huge hand surges up from
// below and hammers it through, or swats it away.

type PlayKind = 'three' | 'jumper' | 'layup' | 'dunk' | 'ft' | 'miss' | 'block' | 'steal' | 'buzzer' | 'buzzer3';

const W = 160;
const H = 90;
const DUR: Record<PlayKind, number> = { three: 1700, jumper: 1500, layup: 1400, dunk: 1300, ft: 1500, miss: 1600, block: 1400, steal: 1300, buzzer: 3400, buzzer3: 3600 };
const LABEL: Record<PlayKind, string> = { three: 'Splash', jumper: 'Bucket', layup: 'Off the glass', dunk: 'Slam!', ft: 'Free throw', miss: 'No good', block: 'Rejected!', steal: 'Stolen!', buzzer: 'At the buzzer!', buzzer3: 'At the buzzer!' };

/** What a line of play-by-play shows, from its tag and its words; null for plays with no shot. */
export function playKind(text: string, tag = '', pts = 0): PlayKind | null {
  const t = text.toLowerCase();
  if (tag === 'BUZZER' || /buzzer|at the horn/.test(t)) return /rims out|no good|misses/.test(t) ? 'miss' : pts === 3 || /three|deep/.test(t) ? 'buzzer3' : 'buzzer';
  if (tag === 'BLOCK' || /block|swat|reject/.test(t)) return 'block';
  if (tag === 'STEAL' || /steal|passing lane|strip/.test(t)) return 'steal';
  if (tag === 'MISS' || /rims out|no good|misses|off the rim/.test(t)) return 'miss';
  if (/dunk|slam|throws it down|jam|lob|alley/.test(t)) return 'dunk';
  if (pts === 3 || /three|from deep|3-pointer/.test(t)) return 'three';
  if (pts === 1 || /free throw|at the line/.test(t)) return 'ft';
  if (/layup|finish|rim|inside|post|drive|floater|putback|scores/.test(t)) return 'layup';
  if (pts === 2 || /jumper|pull-up|turnaround|good|hits/.test(t)) return 'jumper';
  return null;
}

// ---------- helpers ----------

const quad = (a: number, b: number, c: number, u: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const seg = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
const R = (n: number) => Math.round(n);

const SKIN = '#8A5534';
const SKIN_D = '#6E4127';
const SKIN_L = '#A86E45';
const OUT = '#1B1820';
const RIMC = '#E2551B';
const RIMD = '#A63D12';
const NET = '#F4F6FA';

const BALL = (() => {
  const rows = ['..OOOOO..', '.ObBBBBO.', 'ObBBLBBBO', 'OBBBLBBBO', 'OLLLLLLLO', 'OBBBLBBdO', 'OBBBLBBdO', '.OBBLBdO.', '..OOOOO..'];
  const pal: Record<string, string> = { O: OUT, B: '#E8782A', b: '#F5A15F', d: '#C2571B', L: '#6A3416' };
  return toPaths(rows.map((r) => [...r].map((c) => pal[c] ?? '')));
})();

const BALL_K = 1.5; // every camera's ball, half as big again (round 19c)

/** The ball at (x, y), s times its size (times BALL_K), with a fading trail behind it if given. */
function Ball({ x, y, s: s0 = 1, trail = [], o = 1 }: { x: number; y: number; s?: number; trail?: [number, number, number][]; o?: number }) {
  const s = s0 * BALL_K;
  return (
    <>
      {trail.map(([tx, ty, ts], i) => (
        <circle key={i} cx={R(tx)} cy={R(ty)} r={4 * ts * BALL_K} fill="#F5A15F" opacity={0.12 + i * 0.07} />
      ))}
      <g transform={`translate(${R(x - 4.5 * s)} ${R(y - 4.5 * s)}) scale(${s})`} opacity={o}>
        {BALL.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
      </g>
    </>
  );
}

/** An arm: a tapered limb from (x0, y0) to the wrist at (x1, y1), a band, and a hand. */
function Arm({ x0, y0, x1, y1, w0 = 16, w1 = 9, band = '#F4F4F4', hand = 'open' }: { x0: number; y0: number; x1: number; y1: number; w0?: number; w1?: number; band?: string; hand?: 'open' | 'palm' }) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const pt = (x: number, y: number, w: number, s: number) => `${R(x + nx * w * 0.5 * s)} ${R(y + ny * w * 0.5 * s)}`;
  const limb = `M${pt(x0, y0, w0, 1)}L${pt(x1, y1, w1, 1)}L${pt(x1, y1, w1, -1)}L${pt(x0, y0, w0, -1)}Z`;
  const shade = `M${pt(x0, y0, w0, -1)}L${pt(x1, y1, w1, -1)}L${pt(x1, y1, w1 * 0.4, -1)}L${pt(x0, y0, w0 * 0.4, -1)}Z`;
  const bx = x1 - (dx / l) * 5;
  const by = y1 - (dy / l) * 5;
  const ex = x1 - (dx / l) * 2;
  const ey = y1 - (dy / l) * 2;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <g>
      <path d={limb} fill={SKIN} stroke={OUT} strokeWidth="1" />
      <path d={shade} fill={SKIN_D} />
      <path d={`M${pt(bx, by, w1 + 1, 1)}L${pt(ex, ey, w1 + 1, 1)}L${pt(ex, ey, w1 + 1, -1)}L${pt(bx, by, w1 + 1, -1)}Z`} fill={band} stroke={OUT} strokeWidth="0.8" />
      <g transform={`translate(${R(x1)} ${R(y1)}) rotate(${R(ang + 90)})`}>
        {hand === 'open' ? (
          <path d="M-6 0h12v-6h-2v-6h-2v6h-1v-8h-2v8h-1v-7h-2v7h-1v-5h-1v6z" fill={SKIN_L} stroke={OUT} strokeWidth="0.8" />
        ) : (
          <path d="M-6 0h12v-5h-12z" fill={SKIN_L} stroke={OUT} strokeWidth="0.8" />
        )}
      </g>
    </g>
  );
}

/** LED digits as rects, `k` units a dot. */
function led(text: string, x0: number, y0: number, k = 1): string {
  let d = '';
  [...text].forEach((ch, i) => {
    if (ch === ' ') return;
    const bits = ch === ':' ? '000010000010000' : ch === '.' ? '000000000000010' : glyph(ch);
    for (let b = 0; b < 15; b++) if (bits[b] === '1') d += `M${x0 + (i * 4 + (b % 3)) * k} ${y0 + Math.floor(b / 3) * k}h${k}v${k}h-${k}z`;
  });
  return d;
}

function Clock({ text, x, y, k = 1, red }: { text: string; x: number; y: number; k?: number; red?: boolean }) {
  const t = text.padStart(5, ' ').slice(-5);
  return (
    <g>
      <rect x={x} y={y} width={22 * k} height={9 * k} fill="#0A0B0E" stroke="#3A3F4A" />
      <path d={led(t, x + k, y + 2 * k, k)} fill={red ? '#FF3B3B' : '#FFB21E'} />
    </g>
  );
}

/** A net hanging from a rim: strands from the rim's width to a narrower bottom; `swish` whips it. */
function Net({ cx, top, rw, len, bw, swish = 0, strands = 6 }: { cx: number; top: number; rw: number; len: number; bw: number; swish?: number; strands?: number }) {
  let d = '';
  for (let i = 0; i < strands; i++) {
    const f = i / (strands - 1) - 0.5;
    d += `M${R(cx + f * rw)} ${R(top)}L${R(cx + f * bw * (1 + swish * 0.5))} ${R(top + len * (1 + swish * 0.25))}`;
  }
  d += `M${R(cx - rw * 0.42)} ${R(top + len * 0.45)}H${R(cx + rw * 0.42)}M${R(cx - bw * 0.5)} ${R(top + len * 0.85)}H${R(cx + bw * 0.5)}`;
  return <path d={d} stroke={NET} strokeWidth="1" fill="none" opacity="0.9" />;
}

// ---------- backgrounds, painted once per camera ----------

const WOODS = ['#D9A066', '#D29A5F', '#DBA46B', '#CF955B'];

function dimCrowd(rows: number, accent: string, spot: [number, number, number] | null): string[][] {
  const g = blankGrid(W, H);
  paintCrowd(g, rows, 21);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < W; x++) {
      g[y][x] = mix(g[y][x], '#0B0D12', 0.62);
      if (spot) {
        const d = Math.hypot((x - spot[0]) / 1.6, y - spot[1]);
        if (d < spot[2]) g[y][x] = mix(g[y][x], '#2A2F3A', 0.6 * (1 - d / spot[2]));
      }
    }
  for (let y = rows; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = mix(accent, '#0B0D12', 0.8);
  return g;
}

function paintBack(kind: PlayKind, accent: string): string[][] {
  switch (kind) {
    case 'three': {
      // the baseline: crowd behind, a strip of floor, the stanchion's padding in the team colour
      const g = dimCrowd(64, accent, [118, 40, 50]);
      const f = blankGrid(W, H - 64);
      paintFloor(f, 0);
      for (let y = 64; y < H; y++) g[y] = f[y - 64];
      for (let x = 0; x < W; x++) g[64][x] = '#F4F1EA';
      for (let y = 22; y < 66; y++) for (let x = 140; x < 150; x++) g[y][x] = y < 30 ? mix(accent, '#000000', 0.3) : accent;
      return g;
    }
    case 'jumper': {
      // straight down on the floor: planks, the painted lane, the baseline
      const g = blankGrid(W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const plank = Math.floor(x / 5);
          let c = WOODS[(plank + Math.floor((y + plank * 23) / 40)) % 4];
          if (x % 5 === 4 || (y + plank * 23) % 40 === 0) c = '#B98048';
          g[y][x] = c;
        }
      for (let y = 4; y < 70; y++) for (let x = 56; x < 104; x++) g[y][x] = mix(g[y][x], accent, 0.45);
      for (let x = 0; x < W; x++) g[4][x] = '#F4F1EA';
      for (let y = 4; y < 70; y++) g[y][56] = g[y][103] = '#F4F1EA';
      for (let x = 56; x < 104; x++) g[69][x] = '#F4F1EA';
      for (let a = 0; a < Math.PI; a += 0.01) {
        const x = R(80 + Math.cos(a) * 24);
        const y = R(70 + Math.sin(a) * 18);
        if (y < H) g[y][x] = '#F4F1EA';
      }
      return g;
    }
    case 'dunk':
    case 'block':
      return dimCrowd(H, accent, [80, 40, 60]);
    case 'ft': {
      // behind the shooter: the crowd beyond the basket, the floor and the lane in perspective
      const g = dimCrowd(44, accent, [80, 26, 40]);
      for (let y = 44; y < H; y++) {
        const t = (y - 44) / (H - 44);
        const half = lerp(70, 140, t);
        const lane = lerp(12, 36, t);
        for (let x = 0; x < W; x++) {
          const plank = Math.floor(((x - 80) / half) * 16 + 16);
          let c = WOODS[((plank % 4) + 4) % 4];
          if (Math.abs(x - 80) < lane) c = mix(c, accent, 0.45);
          if (Math.abs(Math.abs(x - 80) - lane) < 0.7) c = '#F4F1EA';
          g[y][x] = c;
        }
      }
      for (let x = 0; x < W; x++) g[44][x] = '#F4F1EA';
      for (let x = 44; x < 116; x++) g[80][x] = '#F4F1EA';
      return g;
    }
    case 'steal': {
      // close on the dribble: the floor fills the frame, a slice of crowd above it
      const g = dimCrowd(22, accent, null);
      const f = blankGrid(W, H - 22);
      paintFloor(f, 0);
      for (let y = 22; y < H; y++) g[y] = f[y - 22];
      for (let x = 0; x < W; x++) g[22][x] = '#F4F1EA';
      return g;
    }
    case 'buzzer':
    case 'buzzer3': {
      // the wide shot: the crowd, the floor, and for a deep three the logo at centre court
      const g = dimCrowd(62, accent, [80, 30, 70]);
      const f = blankGrid(W, H - 62);
      paintFloor(f, 0);
      for (let y = 62; y < H; y++) g[y] = f[y - 62];
      for (let x = 0; x < W; x++) g[62][x] = '#F4F1EA';
      if (kind === 'buzzer3')
        for (let y = 63; y < H; y++)
          for (let x = 0; x < 60; x++) {
            const d = ((x - 26) / 22) ** 2 + ((y - 76) / 8) ** 2;
            if (d < 1) g[y][x] = mix(g[y][x], accent, d > 0.75 ? 0.9 : 0.35);
          }
      return g;
    }
    case 'layup':
      return dimCrowd(H, accent, [96, 36, 50]);
    case 'miss': {
      const g = dimCrowd(H, accent, [80, 44, 46]);
      for (let y = 0; y < 28; y++) for (let x = 77; x < 83; x++) g[y][x] = mix(accent, '#000000', 0.35);
      return g;
    }
  }
}

// ---------- the cameras ----------

type Scene = (u: number, p: { clock: string }) => { node: ReactNode; shake?: number; flash?: number; flashColor?: string; red?: boolean };

/** The head-on shot of the glass and rim (rim-outs and buzzer beaters). */
function Front({ clock, red, shake, swish, bigClock, children }: { clock: string; red: boolean; shake: number; swish: number; bigClock?: boolean; children: ReactNode }) {
  return (
    <>
      {bigClock ? <Clock text={clock} x={47} y={0} k={3} red={red} /> : <Clock text={clock} x={58} y={12} red={red} />}
      <g transform={`translate(${R(shake)} 0)`}>
        <rect x="46" y="28" width="68" height="34" fill="#BFD9EA" fillOpacity="0.28" stroke={red ? '#FF3B3B' : '#E8ECF2'} strokeWidth="2" />
        {red && <rect x="44" y="26" width="72" height="38" fill="none" stroke="#FF3B3B" strokeWidth="1" />}
        <rect x="68" y="44" width="24" height="15" fill="none" stroke="#F4F6FA" strokeWidth="1.4" />
        <path d="M67 60h26v1h-26z" fill={RIMD} />
      </g>
      {children}
      <g transform={`translate(${R(shake)} 0)`}>
        <Net cx={80} top={62} rw={24} len={14} bw={14} swish={swish} />
        <path d="M66 61h28v2h-28z" fill={RIMC} />
      </g>
    </>
  );
}

/** The rim filling the screen: the glass behind, a wide net, the iron in two halves (the back
 * drawn before the ball, the front after) so the ball goes through it. */
function CloseRim({ shake, swish, bend, front }: { shake: number; swish: number; bend: number; front: boolean }) {
  const t = `translate(${R(shake)} ${R(bend)})`;
  if (!front)
    return (
      <g transform={`translate(${R(shake)} 0)`}>
        <rect x="6" y="-6" width="148" height="62" fill="#BFD9EA" fillOpacity="0.22" stroke="#E8ECF2" strokeWidth="3" />
        <rect x="50" y="16" width="60" height="36" fill="none" stroke="#F4F6FA" strokeWidth="2.4" />
        <g transform={t}>
          <path d="M34 60a46 9 0 0 1 92 0" fill="none" stroke={RIMD} strokeWidth="3" />
        </g>
      </g>
    );
  return (
    <g transform={t}>
      {[...Array(11)].map((_, i) => {
        const a = Math.PI * (i / 10);
        const tx = 80 - Math.cos(a) * 46;
        const ty = 60 + Math.sin(a) * 9;
        const bx = 80 - Math.cos(a) * (26 + swish * 12);
        return <path key={i} d={`M${R(tx)} ${R(ty)}L${R(bx)} ${R(96 + swish * 6)}`} stroke={NET} strokeWidth="1.6" opacity="0.9" />;
      })}
      <path d="M40 76H120M48 88H112" stroke={NET} strokeWidth="1.2" opacity="0.7" />
      <path d="M34 60a46 9 0 0 0 92 0" fill="none" stroke={RIMC} strokeWidth="4" />
    </g>
  );
}

/** A huge hand, palm to the camera, fingers spread, its forearm running down out of the frame;
 * (x, y) is the middle of the palm. */
function BigHand({ x, y, s = 2.4, band = '#F4F4F4', tilt = 0 }: { x: number; y: number; s?: number; band?: string; tilt?: number }) {
  return (
    <g transform={`translate(${R(x)} ${R(y)}) rotate(${R(tilt)}) scale(${s})`}>
      <path d="M-7 13h14v60h-14z" fill={SKIN} stroke={OUT} strokeWidth="0.6" />
      <path d="M3 13h4v60h-4z" fill={SKIN_D} />
      <path d="M-8 11h16v6h-16z" fill={band} stroke={OUT} strokeWidth="0.5" />
      <path d="M-10 -4h20v12q0 5 -5 5h-10q-5 0 -5 -5z" fill={SKIN} stroke={OUT} strokeWidth="0.6" />
      <path d="M-17 -5l3 -3l7 7l-3 9z" fill={SKIN} stroke={OUT} strokeWidth="0.6" />
      {[
        [-10, -19],
        [-5, -23],
        [0, -21],
        [5, -16],
      ].map(([fx, top]) => (
        <g key={fx}>
          <path d={`M${fx} -3V${top + 1}q0 -1 1 -1h2q1 0 1 1V-3z`} fill={SKIN} stroke={OUT} strokeWidth="0.5" />
          <path d={`M${fx + 3} -3V${top + 1}h1V-3z`} fill={SKIN_D} />
          <path d={`M${fx + 1} ${top + 1}h2v2h-2z`} fill={SKIN_L} />
          <path d={`M${fx} ${R((top - 3) / 2)}h4v0.6h-4z`} fill={SKIN_D} />
        </g>
      ))}
      <path d="M-8 4h12v1h-12zM-6 8h9v0.8h-9z" fill={SKIN_D} />
      <path d="M-9 -3h3v8h-3z" fill={SKIN_L} opacity="0.6" />
    </g>
  );
}

type SilPose = 'rise' | 'release' | 'lunge' | 'contest' | 'pump' | 'pump2' | 'wave' | 'down';
type Pt2 = [number, number];
// side-on silhouettes, facing right, feet at (0, 0): limbs as polylines [width, ...points]
const POSES: Record<SilPose, { head: Pt2; limbs: [number, ...Pt2[]][] }> = {
  rise: { head: [1, -41], limbs: [[9, [0, -35], [1, -20]], [4, [2, -34], [6, -42], [4, -48]], [4, [-1, -34], [3, -43], [2, -48]], [5, [0, -21], [5, -12], [1, -3]], [5, [1, -21], [-3, -12], [-7, -5]]] },
  release: { head: [1, -41], limbs: [[9, [0, -35], [1, -20]], [4, [2, -34], [7, -44], [8, -53]], [4, [-1, -34], [3, -44], [5, -50]], [5, [0, -21], [5, -12], [1, -3]], [5, [1, -21], [-3, -12], [-7, -5]]] },
  lunge: { head: [16, -24], limbs: [[9, [12, -22], [-4, -14]], [4, [13, -24], [24, -38]], [4, [10, -20], [18, -12]], [5, [-4, -14], [-14, -8], [-20, -2]], [5, [-4, -14], [-10, -4], [-16, 0]]] },
  contest: { head: [0, -41], limbs: [[9, [0, -35], [0, -20]], [4, [-1, -34], [-5, -46], [-7, -55]], [4, [1, -33], [4, -26], [6, -20]], [5, [0, -21], [-2, -10], [-2, 0]], [5, [0, -21], [3, -10], [4, 0]]] },
  pump: { head: [0, -42], limbs: [[9, [0, -36], [0, -21]], [4, [2, -34], [9, -38], [9, -48]], [4, [-1, -34], [-6, -28], [-9, -22]], [5, [0, -22], [5, -13], [2, -3]], [5, [0, -22], [-4, -13], [-3, -4]]] },
  pump2: { head: [0, -42], limbs: [[9, [0, -36], [0, -21]], [4, [2, -34], [9, -30], [14, -26]], [4, [-1, -34], [-6, -28], [-9, -22]], [5, [0, -22], [5, -13], [2, -3]], [5, [0, -22], [-4, -13], [-3, -4]]] },
  wave: { head: [0, -41], limbs: [[9, [0, -35], [0, -20]], [4, [2, -34], [7, -42], [8, -51]], [4, [-1, -34], [-3, -26], [-3, -19]], [5, [0, -21], [-2, -10], [-3, 0]], [5, [0, -21], [3, -10], [4, 0]]] },
  down: { head: [8, -10], limbs: [[9, [6, -9], [-6, -5]], [4, [4, -8], [12, -2]], [5, [-6, -5], [-14, -2], [-20, 0]], [5, [-6, -5], [-10, 0], [-16, 0]]] },
};

/** A player in silhouette with a rim of light: the famous shots are their shapes, not faces. */
function Sil({ x, y, pose, wave = 0 }: { x: number; y: number; pose: SilPose; wave?: number }) {
  const p = POSES[pose];
  const limbs = p.limbs.map(([w, ...pts], i) => {
    const pts2 = pose === 'wave' && i === 1 ? pts.map(([px, py], k) => [px + (k === 2 ? wave * 4 : 0), py] as Pt2) : pts;
    return { w, d: 'M' + pts2.map(([px, py]) => `${R(px)} ${R(py)}`).join('L') };
  });
  const body = (dx: number, dy: number, fill: string) => (
    <g transform={`translate(${R(x + dx)} ${R(y + dy)})`}>
      {limbs.map((l, i) => (
        <path key={i} d={l.d} stroke={fill} strokeWidth={l.w} strokeLinecap="square" strokeLinejoin="round" fill="none" />
      ))}
      <circle cx={p.head[0]} cy={p.head[1]} r="4.5" fill={fill} />
    </g>
  );
  return (
    <>
      {body(-1, -1, '#8A93A6')}
      {body(0, 0, '#07080B')}
    </>
  );
}

/** The basket side on, small, at the far end of a wide shot. */
function SideRim({ x = 146 }: { x?: number }) {
  return (
    <>
      <rect x={x} y="16" width="3" height="28" fill="#E8ECF2" />
      <path d={`M${x + 3} 26h8v2h-8z`} fill="#9AA2B0" />
      <path d={`M${x - 14} 40h14v2h-14z`} fill={RIMC} />
      <path d={`M${x - 13} 42l2 8M${x - 8} 42l1 9M${x - 3} 42l-1 8`} stroke={NET} strokeWidth="1" />
    </>
  );
}

/** Camera flashes popping all over the crowd. */
function Bulbs({ u }: { u: number }) {
  const k = Math.floor(u * 30);
  return (
    <>
      {[...Array(14)].map((_, i) => {
        const h = (i * 7919 + k * 104729) % 9973;
        return <path key={i} d={`M${h % W} ${(h >> 3) % 58}h2v2h-2z`} fill="#FFFFFF" opacity={0.9} />;
      })}
    </>
  );
}

const SCENES: Record<PlayKind, Scene> = {
  // the baseline, side on: the glass edge-on at the right, the ball on a long arc from the left
  three: (u, { clock }) => {
    const at = (v: number): [number, number, number] => (v < 0.7 ? [quad(-8, 52, 113, v / 0.7), quad(70, -12, 38, v / 0.7), 1.4] : [113, lerp(38, 96, seg(v, 0.7, 1) ** 2), 1.4]);
    const [x, y, s] = at(u);
    const swish = u > 0.7 && u < 0.85 ? 1 - seg(u, 0.7, 0.85) : 0;
    const trail = u < 0.7 ? [0.09, 0.06, 0.03].map((d) => at(Math.max(0, u - d))) : [];
    return {
      node: (
        <>
          <rect x="128" y="10" width="4" height="36" fill="#E8ECF2" stroke={OUT} strokeWidth="0.6" />
          <path d="M132 20h10v3h-10z" fill="#9AA2B0" />
          <path d="M101 38h24v1h-24z" fill={RIMD} />
          <Ball x={x} y={y} s={s} trail={trail} />
          <Net cx={113} top={41} rw={24} len={16} bw={14} swish={swish} />
          <path d="M101 39h26v2h-26z" fill={RIMC} />
          <Clock text={clock} x={6} y={4} />
        </>
      ),
    };
  },
  // straight down on the rim: the ball rises toward the camera, then drops into the ring
  jumper: (u, { clock }) => {
    const v = seg(u, 0, 0.72);
    const drop = u >= 0.72;
    const x = lerp(64, 80, v);
    const y = lerp(96, 20, v);
    const s = drop ? lerp(0.9, 0.45, seg(u, 0.72, 0.9)) : 0.9 + 1.1 * Math.sin(Math.PI * v);
    const ring = drop ? 1 + seg(u, 0.72, 0.9) * 0.35 : 1;
    const sh = drop ? 0.6 : 1.4 - Math.sin(Math.PI * v) * 0.8;
    return {
      node: (
        <>
          <rect x="62" y="6" width="36" height="3" fill="#E8ECF2" stroke={OUT} strokeWidth="0.5" />
          <path d="M79 9h2v4h-2z" fill="#9AA2B0" />
          {u < 0.92 && <ellipse cx={R(x + 4)} cy={R(y + 6)} rx={R(6 * sh)} ry={R(3 * sh)} fill="#000" opacity="0.25" />}
          <circle cx="80" cy="20" r={R(6 * ring)} fill="none" stroke={NET} strokeWidth="1" strokeDasharray="1 1" />
          {drop && <Ball x={80} y={20} s={s} o={1 - seg(u, 0.82, 0.95)} />}
          <circle cx="80" cy="20" r="9" fill="none" stroke={RIMC} strokeWidth="2" />
          {!drop && <Ball x={x} y={y} s={s} />}
          <Clock text={clock} x={132} y={10} />
        </>
      ),
    };
  },
  // three-quarter angle: the glass in perspective, a hand rolls it off the glass and in
  layup: (u, { clock }) => {
    const [x, y] = u < 0.4 ? [quad(122, 116, 106, u / 0.4), quad(66, 40, 32, u / 0.4)] : u < 0.58 ? [lerp(106, 92, seg(u, 0.4, 0.58)), lerp(32, 50, seg(u, 0.4, 0.58))] : [92, lerp(50, 100, seg(u, 0.58, 1) ** 2)];
    const swish = u > 0.58 && u < 0.74 ? 1 - seg(u, 0.58, 0.74) : 0;
    const reach = u < 0.25 ? 1 : 1 - seg(u, 0.25, 0.5);
    return {
      node: (
        <>
          <path d="M64 8L128 16L128 50L64 44Z" fill="#BFD9EA" fillOpacity="0.28" stroke="#E8ECF2" strokeWidth="2" />
          <path d="M88 28L106 30L106 44L88 42Z" fill="none" stroke="#F4F6FA" strokeWidth="1.2" />
          <path d="M80 50h24v1h-24z" fill={RIMD} />
          {reach > 0 && <Arm x0={158} y0={110} x1={lerp(158, 124, reach)} y1={lerp(110, 70, reach)} w0={18} w1={10} hand="palm" />}
          <Ball x={x} y={y} s={1.3} />
          <Net cx={92} top={53} rw={24} len={15} bw={14} swish={swish} />
          <path d="M79 51h26v2h-26z" fill={RIMC} />
          <Clock text={clock} x={6} y={4} />
        </>
      ),
    };
  },
  // the rim, close: a huge arm rises from below with the ball and hammers it through
  dunk: (u, { clock }) => {
    const rise = seg(u, 0, 0.36);
    const slam = seg(u, 0.36, 0.5);
    const out = seg(u, 0.5, 0.8);
    // the ball rides the hand up above the rim, then goes through toward the camera
    const bx = u < 0.36 ? lerp(118, 82, rise) : 80;
    const by = u < 0.36 ? quad(118, 30, 10, rise) : lerp(10, 92, slam * slam + out * 0.4);
    const bs = u < 0.36 ? 2 : lerp(2, 3.2, slam);
    const hx = u < 0.5 ? bx + 2 : lerp(84, 96, out);
    const hy = u < 0.36 ? by + 14 : u < 0.5 ? lerp(24, 70, slam) : lerp(70, 150, out);
    const hit = seg(u, 0.44, 0.78);
    const shake = u > 0.44 ? Math.sin(u * 95) * 4 * (1 - hit) : 0;
    const swish = u > 0.44 ? 1 - hit : 0;
    const through = u >= 0.42;
    return {
      shake,
      flash: u > 0.44 ? 1 - hit : 0,
      node: (
        <>
          <CloseRim shake={shake} swish={swish} bend={u > 0.44 ? (1 - hit) * 4 : 0} front={false} />
          {through && <Ball x={bx} y={by} s={bs} />}
          {through && hy < 140 && <BigHand x={hx} y={hy} s={2.3} />}
          <CloseRim shake={shake} swish={swish} bend={u > 0.44 ? (1 - hit) * 4 : 0} front />
          {!through && <BigHand x={hx} y={hy} s={2.3} />}
          {!through && <Ball x={bx} y={by} s={bs} />}
          <Clock text={clock} x={4} y={4} />
        </>
      ),
    };
  },
  // behind the shooter: two hands let it go, the ball shrinks toward a far rim
  ft: (u, { clock }) => {
    const v = seg(u, 0.12, 0.8);
    const y = u < 0.8 ? quad(92, -18, 33, v) : lerp(33, 48, seg(u, 0.8, 1));
    const s = u < 0.12 ? 3.2 : u < 0.8 ? lerp(3.2, 0.8, v) : 0.8;
    const release = u < 0.3 ? 1 - seg(u, 0.12, 0.3) : 0;
    const swish = u > 0.8 && u < 0.95 ? 1 - seg(u, 0.8, 0.95) : 0;
    return {
      node: (
        <>
          <path d="M66 18h28v16H66z" fill="#BFD9EA" fillOpacity="0.28" stroke="#E8ECF2" strokeWidth="1.4" />
          <path d="M75 26h10v7H75z" fill="none" stroke="#F4F6FA" strokeWidth="0.8" />
          <path d="M74 33h12v1H74z" fill={RIMD} />
          {u >= 0.8 && <Ball x={80} y={y} s={s} o={1 - seg(u, 0.9, 1)} />}
          <Net cx={80} top={35} rw={12} len={7} bw={7} swish={swish} />
          <path d="M73 34h14v1H73z" fill={RIMC} />
          {u < 0.8 && <Ball x={80} y={y} s={s} />}
          {release > 0 && (
            <>
              <Arm x0={40} y0={110} x1={lerp(70, 66, release)} y1={lerp(70, 84, release)} w0={18} w1={10} hand="palm" />
              <Arm x0={120} y0={110} x1={lerp(90, 94, release)} y1={lerp(70, 84, release)} w0={18} w1={10} hand="palm" />
            </>
          )}
          <Clock text={clock} x={6} y={4} />
        </>
      ),
    };
  },
  // head on: off the front iron, up, and out
  miss: (u, { clock }) => {
    const [x, y] = u < 0.5 ? [quad(-8, 46, 73, u / 0.5), quad(86, -12, 57, u / 0.5)] : [lerp(73, 150, seg(u, 0.5, 1)), quad(57, 18, 102, seg(u, 0.5, 1))];
    const hit = u > 0.48 ? clamp01(1 - (u - 0.48) * 4) : 0;
    const shake = Math.sin(u * 80) * 2 * hit;
    return {
      shake,
      node: (
        <Front clock={clock} red={false} shake={shake} swish={0}>
          <Ball x={x} y={y} />
        </Front>
      ),
    };
  },
  // the rim, close: the shot floats in, a huge hand surges up from below and swats it away
  block: (u, { clock }) => {
    const path = (w: number): [number, number] => (w < 0.45 ? [quad(-14, 30, 74, seg(w, 0, 0.45)), quad(70, 0, 22, seg(w, 0, 0.45))] : [lerp(74, -30, seg(w, 0.45, 0.9)), quad(22, -6, 40, seg(w, 0.45, 0.9))]);
    const [x, y] = path(u);
    const up = seg(u, 0.28, 0.45);
    const down = seg(u, 0.62, 0.95);
    const hx = lerp(150, 86, up) + down * 10;
    const hy = lerp(150, 44, up) + down * 110;
    const hit = u > 0.45 ? 1 - seg(u, 0.45, 0.7) : 0;
    const trail = u > 0.45 ? [0.09, 0.06, 0.03].map((d): [number, number, number] => [...path(Math.max(0.45, u - d)), 2]) : [];
    return {
      shake: Math.sin(u * 90) * 3 * hit,
      flash: hit,
      flashColor: '#1C7ED6',
      node: (
        <>
          <CloseRim shake={0} swish={0} bend={0} front={false} />
          <CloseRim shake={0} swish={0} bend={0} front />
          <Ball x={x} y={y} s={2} trail={trail} />
          {u > 0.26 && hy < 150 && <BigHand x={hx} y={hy} s={2.5} band="#18141C" tilt={-14 + up * 14} />}
          <Clock text={clock} x={4} y={4} />
        </>
      ),
    };
  },
  // close on the dribble: the ball pounds the floor under his hand, a hand flies in and smacks it away
  steal: (u, { clock }) => {
    const v = seg(u, 0, 0.5);
    const bounce = Math.abs(Math.sin(v * Math.PI * 3));
    const free = seg(u, 0.5, 1);
    const [x, y] = u < 0.5 ? [lerp(70, 84, v), 80 - bounce * 34] : [lerp(84, -40, free), quad(62, 36, 84, free)];
    const swipe = seg(u, 0.36, 0.5);
    const gone = seg(u, 0.58, 0.9);
    return {
      shake: u > 0.5 ? Math.sin(u * 90) * 3 * (1 - seg(u, 0.5, 0.7)) : 0,
      flash: u > 0.5 ? 1 - seg(u, 0.5, 0.75) : 0,
      flashColor: '#1C7ED6',
      node: (
        <>
          <ellipse cx={R(x)} cy="86" rx={R(Math.max(5, 16 - (86 - y) * 0.2))} ry="3" fill="#000" opacity="0.3" />
          <Ball x={x} y={y} s={2.4} trail={u > 0.5 ? [0.08, 0.05, 0.02].map((d): [number, number, number] => [lerp(84, -40, seg(u - d, 0.5, 1)), quad(62, 36, 84, seg(u - d, 0.5, 1)), 2.4]) : []} />
          {u < 0.5 && <BigHand x={x - 26} y={Math.min(y, 70) - 22} s={1.7} tilt={90} />}
          {u > 0.3 && gone < 1 && <BigHand x={lerp(200, 104, swipe) + gone * 90} y={62} s={2.1} band="#18141C" tilt={-90} />}
          <Clock text={clock} x={4} y={4} />
        </>
      ),
    };
  },
  // the game-winning jumper, after the most famous one (Jordan, 1989): he hangs in the air as
  // the defender flies past underneath, the clock runs out with the ball in the air, the cut to
  // the rim for the swish at 0.0, then the leaping fist pumps
  buzzer: (u) => {
    const hang = Math.sin(Math.PI * seg(u, 0.02, 0.5));
    const left = Math.max(0, 1.2 * (1 - u / 0.5));
    const t = left.toFixed(1);
    const red = u >= 0.5;
    if (u < 0.42) {
      const fly = u >= 0.28;
      const v = seg(u, 0.28, 0.42);
      const [bx, by] = fly ? [lerp(66, 140, v), quad(20 - hang * 14, -10, 34, v)] : [66, 21 - hang * 14];
      return {
        node: (
          <>
            <SideRim />
            <Sil x={lerp(14, 104, seg(u, 0.04, 0.36))} y={74} pose="lunge" />
            <Sil x={62} y={74 - hang * 14} pose={fly ? 'release' : 'rise'} />
            <Ball x={bx} y={by} s={1} />
            <Clock text={t} x={4} y={2} k={2} red={false} />
          </>
        ),
      };
    }
    if (u < 0.7) {
      const v = seg(u, 0.42, 0.7);
      const swish = v > 0.4 && v < 0.8 ? 1 - seg(v, 0.4, 0.8) : 0;
      return {
        red,
        flash: red ? 0.5 : 0,
        flashColor: '#FF3B3B',
        node: (
          <>
            <rect x="0" y="0" width={W} height={H} fill="#10131A" />
            <Front clock={t} red={red} shake={0} swish={swish} bigClock>
              <Ball x={lerp(50, 80, seg(v, 0, 0.4))} y={v < 0.4 ? quad(20, 30, 58, v / 0.4) : lerp(58, 100, seg(v, 0.4, 1) ** 2)} />
            </Front>
          </>
        ),
      };
    }
    const k = Math.floor(u * 22) % 2;
    return {
      red: true,
      flash: 0.25,
      flashColor: '#FFFFFF',
      node: (
        <>
          <Bulbs u={u} />
          <Sil x={66} y={74 - Math.abs(Math.sin(u * 20)) * 8} pose={k ? 'pump' : 'pump2'} />
          <Sil x={104} y={74} pose="down" />
          <Clock text="0.0" x={4} y={2} k={2} red />
        </>
      ),
    };
  },
  // the game-winning three, after the deep ones (Lillard, 2019): a pull-up from the logo over a
  // long contest, the long arc, the cut to the rim for the swish, then the wave goodbye
  buzzer3: (u) => {
    const left = Math.max(0, 1.5 * (1 - u / 0.52));
    const t = left.toFixed(1);
    const red = u >= 0.52;
    const rise = Math.sin(Math.PI * seg(u, 0.05, 0.3));
    if (u < 0.46) {
      const fly = u >= 0.2;
      const v = seg(u, 0.2, 0.46);
      const [bx, by] = fly ? [lerp(30, 146, v), quad(26 - rise * 10, -40, 34, v)] : [30, 27 - rise * 10];
      return {
        node: (
          <>
            <SideRim x={146} />
            <Sil x={26} y={74 - rise * 10} pose={fly ? 'release' : 'rise'} />
            <Sil x={40} y={74 - rise * 6} pose="contest" />
            <Ball x={bx} y={by} s={0.9} trail={fly ? [0.06, 0.04, 0.02].map((d): [number, number, number] => [lerp(30, 146, seg(u - d, 0.2, 0.46)), quad(26, -40, 34, seg(u - d, 0.2, 0.46)), 0.9]) : []} />
            <Clock text={t} x={96} y={2} k={2} red={false} />
          </>
        ),
      };
    }
    if (u < 0.72) {
      const v = seg(u, 0.46, 0.72);
      const swish = v > 0.4 && v < 0.8 ? 1 - seg(v, 0.4, 0.8) : 0;
      return {
        red,
        flash: red ? 0.5 : 0,
        flashColor: '#FF3B3B',
        node: (
          <>
            <rect x="0" y="0" width={W} height={H} fill="#10131A" />
            <Front clock={t} red={red} shake={0} swish={swish} bigClock>
              <Ball x={lerp(40, 80, seg(v, 0, 0.4))} y={v < 0.4 ? quad(10, 20, 58, v / 0.4) : lerp(58, 100, seg(v, 0.4, 1) ** 2)} />
            </Front>
          </>
        ),
      };
    }
    return {
      red: true,
      flash: 0.2,
      flashColor: '#FFFFFF',
      node: (
        <>
          <Bulbs u={u} />
          <Sil x={70} y={74} pose="wave" wave={Math.sin(u * 40)} />
          <Clock text="0.0" x={4} y={2} k={2} red />
        </>
      ),
    };
  },
};

/**
 * Plays one shot each time `play` changes (a new key). Plays that arrive while one is running
 * wait their turn; only the latest waiting one is shown, so a fast reel never stacks up.
 */
export function PlayCam({ play, clock, accent = '#E8590C', label = true }: { play: { key: string; kind: PlayKind } | null; clock?: string; accent?: string; label?: boolean }) {
  const [cur, setCur] = useState<{ key: string; kind: PlayKind } | null>(null);
  const [u, setU] = useState(1);
  const waiting = useRef<{ key: string; kind: PlayKind } | null>(null);
  const busy = useRef(false);
  const raf = useRef(0);
  const kind = cur?.kind ?? 'miss';
  const back = useMemo(() => toPaths(paintBack(kind, accent)), [kind, accent]);

  const start = (p: { key: string; kind: PlayKind }) => {
    busy.current = true;
    setCur(p);
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setU(1);
      busy.current = false;
      return;
    }
    setU(0);
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = Math.min(1, (now - t0) / DUR[p.kind]);
      setU(v);
      if (v < 1) raf.current = requestAnimationFrame(tick);
      else {
        busy.current = false;
        const w = waiting.current;
        waiting.current = null;
        if (w) start(w);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!play || play.key === cur?.key) return;
    if (busy.current) waiting.current = play;
    else start(play);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play?.key]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const scene = cur ? SCENES[cur.kind](u, { clock: clock ?? '' }) : null;
  const red = !!scene?.red;
  return (
    <div className={`play-cam${red ? ' buzz' : ''}`} data-play={cur?.kind ?? 'idle'}>
      <svg viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={cur ? LABEL[cur.kind] : 'The rim'}>
        <g transform={`translate(${R((scene?.shake ?? 0) * 0.4)} 0)`}>
          {back.map((p) => (
            <path key={p.fill} d={p.d} fill={p.fill} />
          ))}
        </g>
        {scene ? (
          scene.node
        ) : (
          <Front clock={clock ?? ''} red={false} shake={0} swish={0}>
            {null}
          </Front>
        )}
        {scene && (scene.flash ?? 0) > 0 && <rect x="0" y="0" width={W} height={H} fill={scene.flashColor ?? '#FFFFFF'} opacity={(scene.flash ?? 0) * 0.18} />}
      </svg>
      {label && cur && u > 0.55 && (
        <div key={cur.key} className={`cam-label cam-${cur.kind}`}>
          {LABEL[cur.kind]}
        </div>
      )}
    </div>
  );
}
