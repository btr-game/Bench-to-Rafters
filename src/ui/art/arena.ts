import { mix } from './color';
import { glyph } from './pixel';

// Shared arena pieces for the contest scenes (round 17): a crowd that dims toward the back, an
// LED ribbon along the baseline, and a hardwood floor of staggered planks. All paint into a
// grid of colours that the scenes then add their own hoop, lines and racks to.

export const blankGrid = (w: number, h: number): string[][] => Array.from({ length: h }, () => Array(w).fill(''));

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Rows of fans from the top of the grid down to `bottom`: a head and a shirt each. */
export function paintCrowd(g: string[][], bottom: number, seed = 7): void {
  const w = g[0].length;
  const r = rng(seed);
  const shirts = ['#C8102E', '#1D428A', '#FDB927', '#007A33', '#552583', '#F2F2F2', '#3A3D46', '#E56020', '#00788C'];
  const skins = ['#F1C9A5', '#C68A5E', '#8A5534', '#E0A982', '#6B3F26'];
  for (let y = 0; y < bottom; y++) for (let x = 0; x < w; x++) g[y][x] = y < 8 ? '#0E1014' : (x + y) % 2 ? '#191C22' : '#16181D';
  const rows = Math.floor((bottom - 12) / 6);
  for (let row = 0; row < rows; row++) {
    const y = 10 + row * 6;
    for (let x = (row % 2) * 3; x < w; x += 6) {
      if (r() < 0.1) continue;
      const fx = x + Math.floor(r() * 2);
      const shirt = mix(shirts[Math.floor(r() * shirts.length)], '#000000', 0.55 - row * 0.05);
      const skin = mix(skins[Math.floor(r() * skins.length)], '#000000', 0.5 - row * 0.045);
      const px: [number, number, string][] = [
        [1, 0, skin],
        [2, 0, skin],
        [1, 1, skin],
        [2, 1, skin],
      ];
      for (let dx = 0; dx < 4; dx++) for (let dy = 2; dy < 4; dy++) px.push([dx, dy, shirt]);
      for (const [dx, dy, c] of px) if (g[y + dy]?.[fx + dx] !== undefined) g[y + dy][fx + dx] = c;
    }
  }
}

/** The LED ribbon: rows y..y+6, the words scrolling across in amber. */
export function paintRibbon(g: string[][], y: number, words: string): void {
  const w = g[0].length;
  for (let yy = y; yy < y + 7; yy++) for (let x = 0; x < w; x++) g[yy][x] = yy === y || yy === y + 6 ? '#0A0B0E' : '#121419';
  for (let k = 0, x = 4; x < w - 4; k++, x += 4) {
    const ch = words[k % words.length];
    const bits = ch === ' ' ? '' : glyph(ch);
    for (let i = 0; i < 15; i++) if (bits[i] === '1') g[y + 1 + Math.floor(i / 3)][x + (i % 3)] = '#FFB21E';
  }
}

/** Hardwood from row `top` down: planks four pixels deep with staggered joints. */
export function paintFloor(g: string[][], top: number): void {
  const woods = ['#D9A066', '#D29A5F', '#DBA46B', '#CF955B'];
  for (let y = top; y < g.length; y++) {
    const plank = Math.floor((y - top) / 4);
    for (let x = 0; x < g[0].length; x++) {
      let c = woods[(plank + Math.floor((x + plank * 37) / 48)) % woods.length];
      if ((y - top) % 4 === 3 || (x + plank * 37) % 48 === 0) c = '#B98048';
      g[y][x] = c;
    }
  }
}
