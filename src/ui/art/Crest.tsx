import { useMemo } from 'react';
import { hash, ink, shade, tint } from './color';
import { glyph, inCircle, inPoly, toPaths, type Pt } from './pixel';

// Team crests (round 17), in pixels to match the player sprites. Generic on purpose: no real
// logos. Each team gets a shape, a pattern and an emblem picked from its name, painted in its
// own colour, so the same team always wears the same crest and neighbours rarely match.

const N = 24;
const SHAPES: ((x: number, y: number) => boolean)[] = [
  (x, y) => inPoly(x, y, [[12, 1], [22.5, 4.5], [22.5, 13], [12, 23.5], [1.5, 13], [1.5, 4.5]] as Pt[]), // shield
  (x, y) => inCircle(x, y, [12, 12], 11.2), // roundel
  (x, y) => inPoly(x, y, [[12, 0.8], [22, 6.4], [22, 17.6], [12, 23.2], [2, 17.6], [2, 6.4]] as Pt[]), // hexagon
  (x, y) => inPoly(x, y, [[2, 1.5], [22, 1.5], [22, 17], [12, 23.5], [2, 17]] as Pt[]), // pennant
  (x, y) => inPoly(x, y, [[4, 1.5], [20, 1.5], [22.5, 4], [22.5, 20], [20, 22.5], [4, 22.5], [1.5, 20], [1.5, 4]] as Pt[]), // badge
];
const PATTERNS: ((x: number, y: number) => boolean)[] = [
  (x, y) => y + x * 0.5 > 15 && y + x * 0.5 < 19.5, // sash
  (x, y) => Math.abs(y - 15 - Math.abs(x - 12) * -0.45) < 1.6, // chevron
  (x) => x > 12, // halves
  (_, y) => y < 4 || y > 19.5, // bands
];
// 7-wide emblems, row by row
const EMBLEMS = [
  ['..###..', '.#.#.#.', '#######', '.#.#.#.', '..###..'], // ball
  ['...#...', '..###..', '#######', '.#####.', '.##.##.'], // star
  ['#..#..#', '##.#.##', '#######', '#######'], // crown
  ['..#....', '.###.#.', '#######', '#######'], // peaks
  ['....##.', '...##..', '..####.', '...##..', '..##...'], // bolt
  ['...#...', '..##...', '..###..', '.#####.', '.##.##.'], // flame
  ['##...##', '.##.##.', '..###..'], // wings
];

function paintCrest(name: string, abbr: string, color: string): string[][] {
  const h = hash(name);
  const inShape = SHAPES[h % SHAPES.length];
  const pattern = PATTERNS[(h >>> 4) % PATTERNS.length];
  const emblem = EMBLEMS[(h >>> 8) % EMBLEMS.length];
  const fg = ink(color);
  const lightTeam = fg !== '#FFFFFF';
  const second = (h >>> 12) % 3 === 0 && !lightTeam ? '#F2C14E' : lightTeam ? shade(color, 0.45) : tint(color, 0.32);
  const grid: string[][] = Array.from({ length: N }, () => Array(N).fill(''));
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N && inShape(x + 0.5, y + 0.5);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) grid[y][x] = '#17131A';
        continue;
      }
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      grid[y][x] = rim ? second : pattern(x + 0.5, y + 0.5) ? shade(second, lightTeam ? 0 : 0.1) : (x + y) % 7 === 0 && y < 8 ? tint(color, 0.12) : color;
    }
  const stamp = (rows: string[], x0: number, y0: number, c: string, under: string) => {
    rows.forEach((row, dy) =>
      [...row].forEach((b, dx) => {
        if (b !== '#' && b !== '1') return;
        if (inside(x0 + dx + 1, y0 + dy + 1) && grid[y0 + dy + 1][x0 + dx + 1] !== c) grid[y0 + dy + 1][x0 + dx + 1] = under;
      }),
    );
    rows.forEach((row, dy) => [...row].forEach((b, dx) => (b === '#' || b === '1') && inside(x0 + dx, y0 + dy) && (grid[y0 + dy][x0 + dx] = c)));
  };
  const under = lightTeam ? tint(color, 0.45) : shade(color, 0.5);
  stamp(emblem, 9 - (emblem[0].length > 7 ? 1 : 0), 10 - emblem.length - 1 + 1, fg, under);
  const label = abbr.slice(0, 4).toUpperCase();
  const width = label.length * 4 - 1;
  const rows = Array.from({ length: 5 }, (_, r) => [...label].map((ch) => glyph(ch).slice(r * 3, r * 3 + 3)).join('0'));
  stamp(rows, Math.floor((N - width) / 2), 12, fg, under);
  return grid;
}

export function TeamArt({ name, abbr, color = '#2A2F36', size = 44 }: { name: string; abbr: string; color?: string; size?: number }) {
  const paths = useMemo(() => toPaths(paintCrest(name, abbr, color)), [name, abbr, color]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-team" data-art="team-logo" width={size} height={size} viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges" role="img" aria-label={`${name} crest`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
