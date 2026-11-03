// The flight to the main land (round 37): a strip of square pixels 320 wide, the road map's island
// on the left (the school, the college, the arena and an airstrip), the sea with clouds, and the
// main land on the right (its airport, the gym, the cinema and the dome under its star). The sky
// behind it is the page's own gradient (app.css, the main land's block); after dark a shade falls
// over the land and its windows light up, as on the main land's map. The strip has sky of its own
// above (SKY rows), which a screen taller than it is wide shows; a wide one shows the strip alone.

import { useMemo } from 'react';
import { toPaths } from './pixel';
import { FLIGHT_H, FLIGHT_VIEW, FLIGHT_W, STRIP, camAt, flightAt } from '../mainland';
import { LC } from './LandArt';
import { PLANE, PLANE_COLORS, Sprite } from './Sprites';

type Grid = string[][];

/** Rows of sky above the strip, and the whole picture's height; the strip's rows are drawn SKY lower. */
const SKY = 70;
const TALL = FLIGHT_H + SKY;
/** How wide the window on the strip is on a tall screen. */
const TALL_VIEW = 100;

function drawFlight() {
  const blank = (): Grid => Array.from({ length: TALL }, () => Array<string>(FLIGHT_W).fill(''));
  const day = blank();
  const lit = blank();
  const sky = blank();
  const puff = blank();
  const paint = (g: Grid) => (x: number, y: number, w: number, h: number, c: string) => {
    for (let j = Math.max(0, y + SKY); j < Math.min(TALL, y + SKY + h); j++) for (let i = Math.max(0, x); i < Math.min(FLIGHT_W, x + w); i++) g[j][i] = c;
  };
  const R = paint(day);
  const L = paint(lit);
  const S = paint(sky);
  const P = paint(puff);
  const win = (x: number, y: number, w: number, h: number) => {
    R(x, y, w, h, LC.glass);
    L(x, y, w, h, LC.lit);
  };
  const tree = (x: number, y: number) => {
    R(x, y + 3, 1, 2, LC.trunk);
    R(x - 2, y, 5, 3, LC.leaf);
    R(x - 1, y - 1, 3, 1, LC.leaf);
  };
  const cloud = (x: number, y: number, w: number) => {
    P(x + 3, y, w - 6, 1, LC.white);
    P(x + 1, y + 1, w - 2, 1, LC.white);
    P(x, y + 2, w, 2, LC.white);
    P(x + 1, y + 4, w - 2, 1, LC.grey);
  };

  // the sea, from the horizon down
  R(0, 68, FLIGHT_W, 22, LC.sea);
  R(0, 68, FLIGHT_W, 1, LC.wave);
  for (let i = 0; i < 70; i++) R((i * 47 + 5) % FLIGHT_W, 70 + ((i * 13) % 19), 3, 1, i % 3 ? LC.wave : LC.deep);

  // stars, after dark only, scattered by a small random walk of their own
  let seed = 37;
  const rnd = (n: number) => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 8) % n;
  for (let i = 0; i < 110; i++) S(rnd(FLIGHT_W), rnd(SKY + 50) - SKY, 1, 1, i % 5 ? LC.white : LC.bulb);

  // the road map's island: hills, a beach, its three buildings and the airstrip
  const island = (x0: number, x1: number) => {
    for (let x = x0; x < x1; x++) {
      const top = 62 - Math.round(2 * Math.sin(x / 9) + 1.5 * Math.sin(x / 4));
      R(x, top, 1, 72 - top, LC.land);
      R(x, 70, 1, 2, LC.sand);
    }
    R(x0 - 3, 69, 3, 2, LC.sand);
    R(x1, 69, 3, 2, LC.sand);
  };
  island(2, 104);
  // high school
  R(8, 52, 14, 10, LC.brick);
  R(8, 51, 14, 1, LC.roof);
  for (let x = 10; x < 20; x += 3) win(x, 54, 2, 2);
  R(14, 58, 2, 4, LC.door);
  // college
  R(26, 50, 14, 12, LC.stone);
  R(30, 46, 6, 4, LC.ringL);
  R(32, 44, 2, 2, LC.ringL);
  for (let x = 27; x < 40; x += 3) R(x, 51, 1, 11, LC.white);
  // the arena
  R(84, 52, 18, 10, LC.arena);
  R(86, 50, 14, 2, LC.ring);
  for (let x = 85; x < 101; x += 2) {
    R(x, 53, 1, 1, LC.bulb);
    L(x, 53, 1, 1, LC.bulb);
  }
  R(90, 57, 6, 5, LC.orange);
  tree(46, 57);
  tree(78, 57);
  tree(4, 58);

  // the main land: its airport, the gym, the cinema and the dome
  island(236, FLIGHT_W);
  R(240, 50, 14, 12, LC.grey);
  for (let x = 241; x < 253; x += 3) win(x, 53, 2, 4);
  R(256, 44, 3, 18, LC.grey);
  R(254, 41, 7, 3, LC.slate);
  win(255, 42, 5, 1);
  R(266, 54, 10, 8, LC.purple);
  R(266, 54, 10, 1, LC.purpleD);
  R(267, 57, 8, 2, LC.gold);
  for (let x = 267; x < 275; x += 2) L(x, 57, 1, 1, LC.bulb);
  R(280, 52, 14, 10, LC.brick);
  R(282, 50, 10, 2, LC.roof);
  win(282, 54, 3, 3);
  win(289, 54, 3, 3);
  for (let y = 44; y < 54; y++) {
    const hw = Math.round(11 * Math.sqrt(Math.max(0, 1 - ((53.5 - y) / 10) ** 2)));
    R(307 - hw, y, hw * 2, 1, y % 4 === 1 ? LC.ringL : LC.ring);
  }
  R(296, 54, 22, 8, LC.arena);
  for (let x = 297; x < 317; x += 2) {
    R(x, 55, 1, 1, LC.bulb);
    L(x, 55, 1, 1, LC.bulb);
  }
  const star = ['..1..', '11111', '.111.', '1...1'];
  star.forEach((row, j) => [...row].forEach((b, i) => b === '1' && (R(305 + i, 39 + j, 1, 1, LC.gold), L(305 + i, 39 + j, 1, 1, LC.gold))));
  tree(262, 57);
  tree(300, 57);

  // the two runways, in front of everything
  for (const [a, b] of [STRIP.away, STRIP.home]) {
    R(a, STRIP.wheels + 1, b - a, 3, LC.tarmac);
    for (let x = a + 3; x < b - 3; x += 6) R(x, STRIP.wheels + 2, 3, 1, LC.white);
    L(a, STRIP.wheels + 1, 1, 1, LC.bulb);
    L(b - 1, STRIP.wheels + 1, 1, 1, LC.bulb);
  }

  // clouds, over the sea and the coasts
  for (const [x, y, w] of [[60, 14, 16], [118, 30, 22], [150, 10, 14], [186, 24, 18], [222, 12, 20], [262, 30, 14], [12, 26, 12], [292, 16, 16], [30, -30, 18], [96, -50, 14], [170, -22, 20], [240, -44, 16], [300, -16, 12]]) cloud(x, y, w);

  // after dark, a shade over the land and the sea only (the sky keeps its own gradient)
  const shade = day.map((row) => row.map((c) => (c ? '#0B1636' : '')));
  return { day: toPaths(day), lit: toPaths(lit), sky: toPaths(sky), clouds: toPaths(puff), shade: toPaths(shade) };
}

let FLIGHT: ReturnType<typeof drawFlight> | null = null;

/** The plane climbing (nose up) or coming down: its front half a row higher or lower than its
 * back, one step, so the pixels stay on the grid. */
function tilted(rows: string[], tilt: -1 | 1): string[] {
  const w = rows[0].length;
  const out = Array.from({ length: rows.length + 1 }, () => Array<string>(w).fill('.'));
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    const front = i >= w / 2;
    if (ch !== '.') out[j + (tilt < 0 ? (front ? 0 : 1) : front ? 1 : 0)][i] = ch;
  }));
  return out.map((r) => r.join(''));
}
const UP = tilted(PLANE, -1);
const DOWN = tilted(PLANE, 1);

/** The flight at `p` (0 to 1): the window on the strip follows the plane; `tall` (a screen taller
 * than it is wide) shows a narrower window with the sky above. */
export function FlightArt({ p, label, tall = false }: { p: number; label: string; tall?: boolean }) {
  const art = useMemo(() => (FLIGHT ??= drawFlight()), []);
  const at = flightAt(p);
  const rows = at.tilt < 0 ? UP : at.tilt > 0 ? DOWN : PLANE;
  const view = tall ? `${camAt(at.x, TALL_VIEW)} 0 ${TALL_VIEW} ${TALL}` : `${camAt(at.x, FLIGHT_VIEW)} ${SKY} ${FLIGHT_VIEW} ${FLIGHT_H}`;
  return (
    <svg className="pl-art" viewBox={view} preserveAspectRatio="xMidYMax meet" shapeRendering="crispEdges" role="img" aria-label={label}>
      <g className="ml-night">
        {art.sky.map((d) => (
          <path key={d.fill} d={d.d} fill={d.fill} />
        ))}
      </g>
      {[...art.clouds, ...art.day].map((d, i) => (
        <path key={i} d={d.d} fill={d.fill} />
      ))}
      <g className="ml-night">
        {art.shade.map((d) => (
          <path key={d.fill} d={d.d} fill={d.fill} opacity={0.45} />
        ))}
        {art.lit.map((d) => (
          <path key={d.fill} d={d.d} fill={d.fill} />
        ))}
      </g>
      <Sprite rows={rows} x={at.x} y={SKY + at.y - (at.tilt < 0 ? 1 : 0)} colors={PLANE_COLORS} />
    </svg>
  );
}
