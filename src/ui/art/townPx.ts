// The town's pixel helpers (round 37), shared by the street (TownArt.tsx) and its arenas
// (arenaArt.ts): rectangles on the street's grid, with a colour or a theme class.

import { STREET } from '../town';

/** x, y, width, height, and a colour, or a class (starting with a dot) for the theme's lights. */
export type Px = [number, number, number, number, string];

export const G = STREET.ground;
export const H = STREET.h;

export const C = {
  brick: '#B5523B', brickD: '#8E3C2A', brickL: '#C96A50',
  stone: '#D9D2C1', stoneD: '#B3AA95', stoneL: '#ECE6D8',
  cream: '#F3E6C8', creamD: '#D8C7A1', roof: '#6A3B2C', roofD: '#4E2A1F',
  slate: '#4A5260', slateD: '#363C47', glass: '#4E6E94', glassD: '#36536F', steel: '#9AA3AF', steelD: '#6D7682',
  white: '#F1F3F5', door: '#3A2A20', gold: '#F2C14E', goldD: '#C9962B',
  leaf: '#4E9A42', leafD: '#3B7A33', leafL: '#6DB85C', trunk: '#7A4E2A',
  purple: '#3B2A5C', purpleD: '#2A1D44', red: '#D63B3B', redD: '#A82A2A', chrome: '#C9D1DA', ball: '#E8792B', ink: '#20242B',
};

/** A tiny seeded sequence, so a city's skyline is the same every visit. */
export function seq(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
}
export const hash = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A pixel dome or arched roof: rows narrowing to the top, on a w-wide base whose bottom row is at y. */
export function dome(x: number, y: number, w: number, h: number, fill: string): Px[] {
  const out: Px[] = [];
  for (let r = 0; r < h; r++) {
    const t = (r + 1) / h; // 1 at the base
    const half = Math.round((w / 2) * Math.sqrt(1 - (1 - t) * (1 - t)));
    out.push([x + Math.round(w / 2) - half, y - h + 1 + r, half * 2, 1, fill]);
  }
  return out;
}

/** A gable: a stepped triangle on a w-wide base whose bottom row is at y. */
export function gable(x: number, y: number, w: number, fill: string, edge: string): Px[] {
  const out: Px[] = [];
  const rows = Math.ceil(w / 2);
  for (let r = 0; r < rows; r++) {
    const ww = w - r * 2;
    if (ww <= 0) break;
    out.push([x + r, y - r, ww, 1, r === 0 ? edge : fill]);
  }
  return out;
}

/** A grid of windows. */
export function windows(x: number, y: number, cols: number, rows: number, w: number, h: number, gx: number, gy = 2, fill = '.tw-win'): Px[] {
  const out: Px[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([x + c * (w + gx), y + r * (h + gy), w, h, fill]);
  return out;
}

/** Brick courses: a darker line every third row. */
export function courses(x: number, y: number, w: number, h: number): Px[] {
  const out: Px[] = [];
  for (let r = 2; r < h; r += 3) out.push([x, y + r, w, 1, C.brickD]);
  return out;
}

/** A tree: a trunk and a stepped crown. */
export function tree(x: number, size = 1): Px[] {
  const s = size;
  return [
    [x + 3 * s, G - 5 * s, 1 * s + 1, 5 * s, C.trunk],
    [x + 1 * s, G - 11 * s, 6 * s, 5 * s, C.leaf],
    [x, G - 9 * s, 8 * s, 3 * s, C.leaf],
    [x + 2 * s, G - 12 * s, 4 * s, 1 * s, C.leafL],
    [x + 1 * s, G - 7 * s, 6 * s, 1 * s, C.leafD],
  ];
}

/** The door he walks into: open (lit) where he is. */
export const doorFill = (open: boolean) => (open ? '.tw-open' : C.door);
