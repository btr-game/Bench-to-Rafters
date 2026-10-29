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

