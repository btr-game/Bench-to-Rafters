// Shared pixel-art tools (round 17): rasterising shapes onto a grid, a 3x5 pixel font, and
// turning a grid of colours into compact SVG paths.

import { mix } from './color';

export type Pt = [number, number];

export function inPoly(x: number, y: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const inCircle = (x: number, y: number, c: Pt, r: number) => (x - c[0]) ** 2 + (y - c[1]) ** 2 <= r * r;


// 3x5 glyphs, row by row
export const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001010010', '111101111101111', '111101111001111'];
const LETTERS = '010101111101101 110101110101110 011100100100011 110101101101110 111100110100111 111100110100100 011100101101011 101101111101101 111010010010111 001001001101010 101101110101101 100100100100111 101111111101101 110101101101101 010101101101010 110101110100100 010101101110011 110101110101101 011100010001110 111010010010010 101101101101111 101101101101010 101101111111101 101101010101101 101101010010010 111001010100111'.split(' ');

/** The 3x5 bitmap for a character (blank for anything it can't draw). */
export function glyph(ch: string): string {
  const c = ch.toUpperCase();
  if (c >= '0' && c <= '9') return DIGITS[+c];
  if (c >= 'A' && c <= 'Z') return LETTERS[c.charCodeAt(0) - 65];
  if (c === '-') return '000000111000000';
  return '000000000000000';
}

export const dark = (c: string, t = 0.28) => mix(c, '#000000', t);
export const light = (c: string, t = 0.22) => mix(c, '#ffffff', t);

/** The grid as SVG path data, one path per colour (horizontal runs merged). */
export function toPaths(grid: string[][]): { fill: string; d: string }[] {
  const by = new Map<string, string>();
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let n = 1;
      while (x + n < row.length && row[x + n] === c) n++;
      if (c) by.set(c, `${by.get(c) ?? ''}M${x} ${y}h${n}v1h${-n}z`);
      x += n;
    }
  });
  return [...by].map(([fill, d]) => ({ fill, d }));
}


/**
 * A polygon on a grid of `cell`-sized squares (round 28: charts drawn in pixels too), as an SVG path
 * of square runs: `fill` covers every square whose centre is inside, `edge` only the inside squares
 * that touch the outside (a one-square outline).
 */
export function polyCells(poly: Pt[], cell: number, mode: 'fill' | 'edge'): string {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x0 = Math.floor(Math.min(...xs) / cell) - 1;
  const x1 = Math.ceil(Math.max(...xs) / cell) + 1;
  const y0 = Math.floor(Math.min(...ys) / cell) - 1;
  const y1 = Math.ceil(Math.max(...ys) / cell) + 1;
  const at = (cx: number, cy: number) => inPoly((cx + 0.5) * cell, (cy + 0.5) * cell, poly);
  let d = '';
  for (let cy = y0; cy <= y1; cy++) {
    let run = -1;
    for (let cx = x0; cx <= x1 + 1; cx++) {
      const on = cx <= x1 && at(cx, cy) && (mode === 'fill' || !at(cx - 1, cy) || !at(cx + 1, cy) || !at(cx, cy - 1) || !at(cx, cy + 1));
      if (on && run < 0) run = cx;
      else if (!on && run >= 0) {
        d += `M${run * cell} ${cy * cell}h${(cx - run) * cell}v${cell}h${-(cx - run) * cell}Z`;
        run = -1;
      }
    }
  }
  return d;
}

/**
 * A line through `pts` on a grid of `cell`-sized squares, as an SVG path of square runs (round 29:
 * the timeline's OVR line runs straight from season to season again, as it did before round 28's
 * steps, drawn in square pixels). Each segment walks the squares it crosses one step at a time,
 * across or down, so the line has no gaps at any slope.
 */
export function lineCells(pts: Pt[], cell: number, brush = 1): string {
  const rows = new Map<number, Set<number>>();
  // a square brush of `brush` cells, so the line is as thick across a steep stretch as a flat one
  const put = (cx: number, cy: number) => {
    for (let dy = 0; dy < brush; dy++) for (let dx = 0; dx < brush; dx++) (rows.get(cy + dy) ?? rows.set(cy + dy, new Set()).get(cy + dy)!).add(cx + dx);
  };
  for (let i = 1; i < pts.length; i++) {
    let x = Math.floor(pts[i - 1][0] / cell);
    let y = Math.floor(pts[i - 1][1] / cell);
    const nx = Math.abs(Math.floor(pts[i][0] / cell) - x);
    const ny = Math.abs(Math.floor(pts[i][1] / cell) - y);
    const sx = pts[i][0] >= pts[i - 1][0] ? 1 : -1;
    const sy = pts[i][1] >= pts[i - 1][1] ? 1 : -1;
    put(x, y);
    for (let ix = 0, iy = 0; ix < nx || iy < ny; ) {
      if ((0.5 + ix) / nx < (0.5 + iy) / ny) {
        x += sx;
        ix++;
      } else {
        y += sy;
        iy++;
      }
      put(x, y);
    }
  }
  let d = '';
  for (const [cy, xs] of rows) {
    const sorted = [...xs].sort((a, b) => a - b);
    for (let k = 0; k < sorted.length; ) {
      let n = 1;
      while (sorted[k + n] === sorted[k] + n) n++;
      d += `M${sorted[k] * cell} ${cy * cell}h${n * cell}v${cell}h${-n * cell}Z`;
      k += n;
    }
  }
  return d;
}
