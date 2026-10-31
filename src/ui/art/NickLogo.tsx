import { useMemo } from 'react';
import { LOGO_PALETTES, NICKNAMES, type LogoShape } from '../../content/nicknames';
import { ICONS } from './icons';
import { glyph, toPaths } from './pixel';

// A nickname's logo (round 25): a 32-pixel badge in two colours at most (the owner: black and
// white where possible), its motif as line art (the outline and the darker shading in ink, the
// rest left as paper) and the player's initials under it, the way a signature line would print
// it. A reversed logo swaps the two: an ink badge with the art in paper.

const S = 32;

function inShape(shape: LogoShape, x: number, y: number): boolean {
  const cx = x + 0.5 - S / 2;
  const cy = y + 0.5 - S / 2;
  switch (shape) {
    case 'roundel':
      return cx * cx + cy * cy <= 15.5 * 15.5;
    case 'octagon':
      return Math.abs(cx) <= 14.5 && Math.abs(cy) <= 14.5 && Math.abs(cx) + Math.abs(cy) <= 20;
    case 'hex':
      return Math.abs(cy) <= 14.5 && Math.abs(cx) <= 15.5 - Math.max(0, Math.abs(cy) - 6.5) * 0.9;
    case 'shield':
      return y >= 1 && Math.abs(cx) <= (y < 20 ? 14.5 : 14.5 - (y - 20) * 1.35);
    case 'banner':
      // a pennant with a notched tail
      return y >= 2 && y <= 29 && Math.abs(cx) <= 14.5 && !(y > 24 && Math.abs(cx) < (y - 24) * 2);
    default:
      return Math.abs(cx) <= 14.5 && Math.abs(cy) <= 14.5 && !(Math.abs(cx) > 12.5 && Math.abs(cy) > 12.5);
  }
}

const INK = /[OKtrbgynpsm]/; // the outline and the shades: what a one-colour print keeps

/** The logo's pixels: badge, rim, motif and initials, in two colours. */
function logoGrid(id: string, initials: string): string[][] {
  const nick = NICKNAMES.find((n) => n.id === id) ?? NICKNAMES[0];
  const [paper, ink] = LOGO_PALETTES[nick.logo.palette];
  const [ground, line] = nick.logo.reverse ? [ink, paper] : [paper, ink];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S && inShape(nick.logo.shape, x, y);
  const edge = (x: number, y: number, d: number) => [[-d, 0], [d, 0], [0, -d], [0, d]].some(([dx, dy]) => !inside(x + dx, y + dy));
  // the badge: an outer rim and a thin inner ring in the line colour
  const g = Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_, x) => (!inside(x, y) ? '' : edge(x, y, 1) || edge(x, y, 3) ? line : ground)));
  // the motif as line art, in the upper middle
  const rows = ICONS[nick.logo.motif] ?? [];
  const top = 3 + Math.floor((16 - rows.length) / 2);
  // where two fill colours meet, a line, so a globe keeps its continents and a ball its seams
  const fillAt = (x: number, y: number) => {
    const c = rows[y]?.[x] ?? '.';
    return c === '.' || INK.test(c) ? null : c;
  };
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.' || !g[top + y]?.[8 + x]) return;
    const f = fillAt(x, y);
    const seam = f !== null && [fillAt(x + 1, y), fillAt(x, y + 1)].some((n) => n !== null && n !== f);
    g[top + y][8 + x] = INK.test(ch) || seam ? line : ground;
  }));
  // his initials, 3x5 each, under the motif
  const text = initials.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const w = text.length * 4 - 1;
  const x0 = Math.floor((S - w) / 2);
  [...text].forEach((ch, i) => {
    const bits = glyph(ch);
    for (let k = 0; k < 15; k++) if (bits[k] === '1') {
      const x = x0 + i * 4 + (k % 3);
      const y = 20 + Math.floor(k / 3);
      if (g[y]?.[x]) g[y][x] = line;
    }
  });
  return g;
}

/** Initials from a name: first and last. */
const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`;
};

export function NickLogo({ id, name, size = 64 }: { id: string; name: string; size?: number }) {
  const paths = useMemo(() => toPaths(logoGrid(id, initialsOf(name))), [id, name]);
  return (
    <svg className="art nick-logo" width={size} height={size} viewBox={`0 0 ${S} ${S}`} shapeRendering="crispEdges" role="img" aria-label="Logo">
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
