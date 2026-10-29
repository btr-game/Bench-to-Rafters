import { useMemo } from 'react';
import { toPaths } from './pixel';

// Country flags in pixels (round 17): 24x16, simplified the way flags look in old sports games
// (stripes and fields exact, emblems reduced to a few pixels). One for every country a career
// can start in (content/origins.ts).

const W = 24;
const H = 16;
type G = string[][];

const fill = (g: G, c: string, x0 = 0, y0 = 0, x1 = W, y1 = H) => {
  for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) g[y][x] = c;
};
const hs = (g: G, cs: string[]) => cs.forEach((c, i) => fill(g, c, 0, Math.round((i * H) / cs.length), W, Math.round(((i + 1) * H) / cs.length)));
const vs = (g: G, cs: string[]) => cs.forEach((c, i) => fill(g, c, Math.round((i * W) / cs.length), 0, Math.round(((i + 1) * W) / cs.length), H));
const dot = (g: G, c: string, pts: [number, number][]) => pts.forEach(([x, y]) => g[y] && g[y][x] !== undefined && (g[y][x] = c));
const disc = (g: G, c: string, cx: number, cy: number, r: number) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g[y][x] = c;
};
const star = (g: G, c: string, x: number, y: number) =>
  dot(g, c, [
    [x, y - 1],
    [x - 1, y],
    [x, y],
    [x + 1, y],
    [x - 1, y + 1],
    [x + 1, y + 1],
  ]);

const FLAGS: Record<string, (g: G) => void> = {
  Argentina: (g) => {
    hs(g, ['#74ACDF', '#FFFFFF', '#74ACDF']);
    disc(g, '#F6B40E', 12, 8, 2.2);
  },
  Australia: (g) => {
    fill(g, '#012169');
    fill(g, '#FFFFFF', 0, 3, 12, 5);
    fill(g, '#FFFFFF', 5, 0, 7, 8);
    for (let k = 0; k < 8; k++) dot(g, '#FFFFFF', [[Math.round(k * 1.5), k], [11 - Math.round(k * 1.5), k]]);
    fill(g, '#C8102E', 0, 4, 12, 5);
    fill(g, '#C8102E', 5, 0, 6, 8);
    star(g, '#FFFFFF', 6, 12);
    dot(g, '#FFFFFF', [[18, 3], [21, 6], [16, 8], [19, 12], [20, 9]]);
  },
  Brazil: (g) => {
    fill(g, '#009739');
    for (let y = 1; y < H - 1; y++) {
      const half = 10 - Math.abs(y + 0.5 - 8) * 1.4;
      for (let x = Math.floor(12 - half); x < 12 + half; x++) g[y][x] = '#FEDD00';
    }
    disc(g, '#012169', 12, 8, 3.6);
    dot(g, '#FFFFFF', [[9, 7], [10, 7], [11, 8], [12, 8], [13, 8], [14, 9], [15, 9]]);
  },
  Cameroon: (g) => {
    vs(g, ['#007A5E', '#CE1126', '#FCD116']);
    star(g, '#FCD116', 12, 8);
  },
  Canada: (g) => {
    fill(g, '#D80621');
    fill(g, '#FFFFFF', 6, 0, 18, H);
    const leaf = ['.....#.....', '...#.#.#...', '..#######..', '#.#######.#', '###########', '.#########.', '..#######..', '....###....', '.....#.....', '.....#.....'];
    leaf.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && (g[3 + y][7 + x] = '#D80621')));
  },
  China: (g) => {
    fill(g, '#DE2910');
    ['...#...', '..###..', '#######', '.#####.', '.##.##.', '##...##'].forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && (g[1 + y][1 + x] = '#FFDE00')));
    dot(g, '#FFDE00', [[10, 1], [11, 3], [11, 5], [10, 7]]);
  },
  'Dominican Republic': (g) => {
    fill(g, '#002D62', 0, 0, 10, 6);
    fill(g, '#CE1126', 14, 0, W, 6);
    fill(g, '#CE1126', 0, 10, 10, H);
    fill(g, '#002D62', 14, 10, W, H);
    fill(g, '#FFFFFF', 10, 0, 14, H);
    fill(g, '#FFFFFF', 0, 6, W, 10);
    fill(g, '#007A3D', 11, 7, 13, 9);
  },
  France: (g) => vs(g, ['#002654', '#FFFFFF', '#ED2939']),
  Germany: (g) => hs(g, ['#000000', '#DD0000', '#FFCE00']),
  Greece: (g) => {
    for (let y = 0; y < H; y++) fill(g, Math.floor((y * 9) / H) % 2 ? '#FFFFFF' : '#0D5EAF', 0, y, W, y + 1);
    fill(g, '#0D5EAF', 0, 0, 10, 9);
    fill(g, '#FFFFFF', 0, 4, 10, 5);
    fill(g, '#FFFFFF', 4, 0, 6, 9);
  },
  Japan: (g) => {
    fill(g, '#FFFFFF');
    disc(g, '#BC002D', 12, 8, 4.6);
  },
  Lithuania: (g) => hs(g, ['#FDB913', '#006A44', '#C1272D']),
  Mexico: (g) => {
    vs(g, ['#006847', '#FFFFFF', '#CE1126']);
    disc(g, '#8C5A2B', 12, 8, 2.4);
    dot(g, '#006847', [[11, 10], [12, 10], [13, 10]]);
  },
  Nigeria: (g) => vs(g, ['#008751', '#FFFFFF', '#008751']),
  Philippines: (g) => {
    hs(g, ['#0038A8', '#CE1126']);
    for (let y = 0; y < H; y++) fill(g, '#FFFFFF', 0, y, Math.round(13 - Math.abs(y + 0.5 - 8) * 1.62), y + 1);
    disc(g, '#FCD116', 4.5, 8, 1.8);
    dot(g, '#FCD116', [[1, 2], [1, 13], [9, 8]]);
  },
  Senegal: (g) => {
    vs(g, ['#00853F', '#FDEF42', '#E31B23']);
    star(g, '#00853F', 12, 8);
  },
  Serbia: (g) => {
    hs(g, ['#C6363C', '#0C4076', '#FFFFFF']);
    fill(g, '#C6363C', 5, 4, 10, 11);
    fill(g, '#FFFFFF', 7, 5, 8, 10);
    fill(g, '#FFFFFF', 6, 7, 9, 8);
    dot(g, '#EDB92E', [[5, 3], [7, 3], [9, 3]]);
  },
  Slovenia: (g) => {
    hs(g, ['#FFFFFF', '#005DA4', '#ED1C24']);
    fill(g, '#005DA4', 4, 2, 9, 9);
    dot(g, '#FFFFFF', [[6, 5], [5, 6], [6, 6], [7, 6], [4, 7], [8, 7]]);
    dot(g, '#ED1C24', [[4, 2], [8, 2]]);
  },
  'South Korea': (g) => {
    fill(g, '#FFFFFF');
    disc(g, '#003478', 12, 8, 4.2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - 12) ** 2 + (y + 0.5 - 8) ** 2 <= 4.2 * 4.2 && y < 8 + (x - 12) * 0.25) g[y][x] = '#CD2E3A';
    for (const [x, y] of [[2, 2], [19, 2], [2, 12], [19, 12]] as [number, number][]) for (let k = 0; k < 3; k++) fill(g, '#000000', x, y + k, x + 3, y + k + 1);
  },
  'South Sudan': (g) => {
    hs(g, ['#000000', '#DA121A', '#078930']);
    fill(g, '#FFFFFF', 0, 5, W, 6);
    fill(g, '#FFFFFF', 0, 10, W, 11);
    for (let y = 0; y < H; y++) fill(g, '#0F47AF', 0, y, Math.round(9 - Math.abs(y + 0.5 - 8) * 1.1), y + 1);
    star(g, '#FCDD09', 3, 8);
  },
  Spain: (g) => {
    hs(g, ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B']);
    fill(g, '#AA151B', 5, 6, 8, 10);
    dot(g, '#AD1519', [[6, 5]]);
  },
  Turkey: (g) => {
    fill(g, '#E30A17');
    disc(g, '#FFFFFF', 9, 8, 4.2);
    disc(g, '#E30A17', 10.2, 8, 3.4);
    star(g, '#FFFFFF', 15, 8);
  },
  USA: (g) => {
    for (let y = 0; y < H; y++) fill(g, Math.floor((y * 13) / H) % 2 ? '#FFFFFF' : '#B31942', 0, y, W, y + 1);
    fill(g, '#0A3161', 0, 0, 10, 9);
    for (let y = 1; y < 9; y += 2) for (let x = 1 + ((y >> 1) % 2); x < 10; x += 2) g[y][x] = '#FFFFFF';
  },
};

export function FlagArt({ country, size = 24 }: { country: string; size?: number }) {
  const paths = useMemo(() => {
    const g: G = Array.from({ length: H }, () => Array(W).fill(''));
    FLAGS[country]?.(g);
    return toPaths(g);
  }, [country]);
  if (!FLAGS[country]) return null;
  return (
    <svg className="art art-flag" width={size} height={(size * H) / W} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" role="img" aria-label={`Flag of ${country}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
