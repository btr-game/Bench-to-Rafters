import { useMemo } from 'react';
import type { Kit } from '../../content/teamStyle';
import { dark, glyph, inPoly, light, toPaths, DIGITS, type Pt } from './pixel';

// A jersey laid flat (round 17): the team's kit in pixels, front on, with the wordmark arched
// across the chest and the number big below it, outlined in the trim.

const W = 44;
const H = 50;
const BODY: Pt[] = [
  [10, 2],
  [16.6, 2],
  [19.5, 6.5],
  [24.5, 6.5],
  [27.4, 2],
  [34, 2],
  [34.8, 9],
  [39.6, 13.5],
  [39.6, 48],
  [4.4, 48],
  [4.4, 13.5],
  [9.2, 9],
];

function paintJersey(kit: Kit, number: number): string[][] {
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill(''));
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && inPoly(x + 0.5, y + 0.5, BODY);
  const white = kit.base.toUpperCase() === '#FFFFFF';
  const fold = white ? '#DCE0E8' : dark(kit.base, 0.14);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) g[y][x] = '#18141C';
        continue;
      }
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1);
      const edge2 = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2);
      // collar and armholes in the trim, two pixels deep
      const top = y < 14 && (edge || edge2);
      g[y][x] = top ? (edge ? dark(kit.trim, 0.15) : kit.trim) : edge && y >= 14 ? kit.trim : kit.base;
      if (!top && (x === 7 || x === 36) && y > 14) g[y][x] = fold; // side panel seams
      if (g[y][x] === kit.base && kit.pattern === 'pinstripe' && x % 3 === 0) g[y][x] = dark(kit.base, 0.12);
      if (g[y][x] === kit.base && kit.pattern === 'sash' && Math.abs(x - y * 0.8 - 2) < 1.6) g[y][x] = kit.trim;
      if (g[y][x] === kit.base && kit.pattern === 'panel' && x > 22) g[y][x] = dark(kit.base, 0.1);
      if (g[y][x] === kit.base && x < 12 && y > 14) g[y][x] = light(kit.base, white ? 0 : 0.08);
      if (y === H - 2 && inside(x, y + 1)) g[y][x] = fold; // hem
    }
  // the wordmark, arched; two words that don't fit go on two lines
  const fits = (t: string) => t.length * 4 - 1 <= 32;
  const lines = fits(kit.word) || !kit.word.includes(' ') ? [kit.word.slice(0, 8)] : kit.word.split(' ').slice(0, 2).map((t) => t.slice(0, 8));
  lines.forEach((word, li) => {
    const width = word.length * 4 - 1;
    const x0 = Math.floor((W - width) / 2);
    [...word].forEach((ch, i) => {
      const bits = glyph(ch);
      const lift = lines.length === 1 ? Math.round(Math.abs(i * 4 + 1 - width / 2) * 0.12) : 0;
      for (let k = 0; k < 15; k++) if (bits[k] === '1') g[(lines.length === 1 ? 16 : 13 + li * 6) + lift + Math.floor(k / 3)][x0 + i * 4 + (k % 3)] = kit.ink;
    });
  });
  // the number at double size, outlined in the trim
  const num = String(Math.max(0, Math.min(99, number)));
  const nw = num.length * 8 - 2;
  const nx = Math.floor((W - nw) / 2);
  const cells: Pt[] = [];
  [...num].forEach((d, i) => {
    const bits = DIGITS[+d];
    for (let k = 0; k < 15; k++) if (bits[k] === '1') for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as Pt[]) cells.push([nx + i * 8 + (k % 3) * 2 + dx, (lines.length === 1 ? 25 : 28) + Math.floor(k / 3) * 2 + dy]);
  });
  for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) if (inside(x + dx, y + dy)) g[y + dy][x + dx] = kit.trim;
  for (const [x, y] of cells) g[y][x] = kit.ink;
  return g;
}

export function JerseyArt({ kit, number, size = 80, label }: { kit: Kit; number: number; size?: number; label: string }) {
  const paths = useMemo(() => toPaths(paintJersey(kit, number)), [kit, number]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-jersey" data-art="jersey" width={(size * W) / H} height={size} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
