import { useMemo } from 'react';
import { ink as inkOn, rgb } from './color';
import { dark, glyph, light, toPaths, DIGITS } from './pixel';
import { ICONS as PIX_ICONS, PAL } from './icons';

// Trophies, rings, medals and banners in pixels (round 17). Icons are 16x16 bitmaps:
// O outline, Y metal, y metal shade, W shine, G gem or cloth in the team colour, R ribbon,
// b ball, k ball seam, S silver plate, s its shade. The metal is gold, silver or bronze.

type Metal = 'gold' | 'silver' | 'bronze';
const METAL: Record<Metal, [string, string, string]> = {
  gold: ['#F5C542', '#C9921E', '#FFF1B3'],
  silver: ['#C9CED8', '#8E95A3', '#F4F6FA'],
  bronze: ['#D08A4E', '#9A5A2A', '#F2C9A0'],
};

const ICONS = {
  ring: [
    '.....OOOOOO.....',
    '....OGGWGGGO....',
    '...OGWGGGGGGO...',
    '...OGGGGGGGGO...',
    '....OGGGGGGO....',
    '...OYYOOOOYYO...',
    '..OYWO....OyyO..',
    '..OYO......OyO..',
    '.OYO........OyO.',
    '.OYO........OyO.',
    '.OYO........OyO.',
    '..OYO......OyO..',
    '..OYWO....OyyO..',
    '...OYYOOOOYyO...',
    '....OOYYYYOO....',
    '......OOOO......',
  ],
};

type IconKind = keyof typeof ICONS;

/** The icon for an award, by its key (engine/awards/tiers.ts) or, failing that, its name. */
export function TrophyIcon({ icon, metal = 'gold', color = '#C8102E', size = 32 }: { icon: IconKind; metal?: Metal; color?: string; size?: number }) {
  const paths = useMemo(() => {
    const [m, ms, mw] = METAL[metal];
    const pal: Record<string, string> = { O: '#18141C', Y: m, y: ms, W: mw, G: color, R: color, b: '#E07028', k: '#4A2210', S: '#C9CED8', s: '#8E95A3' };
    const rows = ICONS[icon];
    const w = 16;
    const top = Math.floor((16 - rows.length) / 2);
    const grid = Array.from({ length: 16 }, (_, y) => Array.from({ length: w }, (_, x) => pal[rows[y - top]?.[x] ?? '.'] ?? ''));
    return toPaths(grid);
  }, [icon, metal, color]);
  return (
    <svg className="art art-icon" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}

// ---- hanging banners: a title won, or a number retired ----
const BW = 36;
const BH = 54;

function text(grid: string[][], word: string, y: number, c: string) {
  const width = word.length * 4 - 1;
  const x0 = Math.floor((BW - width) / 2);
  [...word].forEach((ch, i) => {
    const bits = glyph(ch);
    for (let k = 0; k < 15; k++) if (bits[k] === '1' && grid[y + Math.floor(k / 3)]?.[x0 + i * 4 + (k % 3)] !== undefined) grid[y + Math.floor(k / 3)][x0 + i * 4 + (k % 3)] = c;
  });
}

function paintBanner(kind: 'title' | 'retired' | 'oath', color: string, trim: string, lines: string[], number?: number): string[][] {
  const g: string[][] = Array.from({ length: BH }, () => Array(BW).fill(''));
  const inside = (x: number, y: number) => x >= 1 && x < BW - 1 && y >= 3 && y < BH - 1 - Math.max(0, 6 - Math.abs(x - BW / 2) * 0.45) * (y > BH - 9 ? 1 : 0);
  for (let y = 0; y < BH; y++)
    for (let x = 0; x < BW; x++) {
      if (y < 3 && (x === 6 || x === BW - 7)) g[y][x] = '#5A5F6A'; // the wires
      if (!inside(x, y)) {
        if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) g[y][x] = '#18141C';
        continue;
      }
      const edge = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y + 2);
      g[y][x] = y < 6 ? dark(color, 0.35) : edge ? trim : x < 6 ? light(color, 0.08) : x > BW - 7 ? dark(color, 0.1) : color;
    }
  // the lettering in the trim colour when it stands out on the cloth, else black or white
  const lum = (c: string) => rgb(c).reduce((a, v, i) => a + v * [0.299, 0.587, 0.114][i], 0);
  const ink = Math.abs(lum(trim) - lum(color)) > 70 ? trim : inkOn(color);
  if (kind === 'title') {
    lines.forEach((l, i) => text(g, l, 9 + i * 7, ink));
  } else if (kind === 'oath') {
    // round 27: No Shortcuts, the iron shield sewn on, the words under it
    PIX_ICONS.oath.forEach((row, y) => [...row].forEach((ch, x) => PAL[ch] && (g[8 + y][10 + x] = PAL[ch])));
    lines.forEach((l, i) => text(g, l, 26 + i * 7, ink));
  } else {
    // the number, three times size
    const num = String(number ?? 0);
    const nw = num.length * 12 - 3;
    const nx = Math.floor((BW - nw) / 2);
    [...num].forEach((d, i) => {
      const bits = DIGITS[+d];
      for (let k = 0; k < 15; k++)
        if (bits[k] === '1') for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) g[9 + Math.floor(k / 3) * 3 + dy][nx + i * 12 + (k % 3) * 3 + dx] = ink;
    });
    lines.forEach((l, i) => text(g, l, 28 + i * 7, ink));
  }
  return g;
}

export function BannerArt({ kind, color, trim = '#FFFFFF', lines, number, size = 120 }: { kind: 'title' | 'retired' | 'oath'; color: string; trim?: string; lines: string[]; number?: number; size?: number }) {
  const paths = useMemo(() => toPaths(paintBanner(kind, color, trim, lines.map((l) => l.toUpperCase().slice(0, 8)), number)), [kind, color, trim, lines, number]);
  return (
    <svg className="art art-banner" width={(size * BW) / BH} height={size} viewBox={`0 0 ${BW} ${BH}`} shapeRendering="crispEdges" role="img" aria-label={lines.join(' ')}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
