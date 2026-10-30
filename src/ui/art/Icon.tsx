import { useMemo } from 'react';
import { ICONS, PAL } from './icons';
import { CULTURE_ICONS } from './cultureIcons';
import { toPaths } from './pixel';

// The colour families of the palette, base and shade: a `shift` moves every family along this
// ring (red to orange, orange to yellow...), so one icon comes in six colourways.
const RING = ['Rr', 'Nn', 'Yy', 'Gg', 'Bb', 'Pp'];
const recolour = (ch: string, shift: number) => {
  const i = RING.findIndex((f) => f.includes(ch));
  return i < 0 ? ch : RING[(i + shift) % RING.length][RING[i].indexOf(ch)];
};

const rowsOf = (name: string): string[] | undefined => ICONS[name] ?? CULTURE_ICONS[name];

/** A 16x16 pixel icon from the set in icons.ts (or the culture icons), drawn crisp at any size; `shift` recolours it. */
export function Icon({ name, size = 20, title, shift = 0 }: { name: string; size?: number; title?: string; shift?: number }) {
  const paths = useMemo(() => {
    const rows = rowsOf(name) ?? [];
    const top = Math.floor((16 - rows.length) / 2);
    const grid = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => PAL[recolour(rows[y - top]?.[x] ?? '.', shift)] ?? ''));
    return toPaths(grid);
  }, [name, shift]);
  if (!rowsOf(name)) return null;
  return (
    <svg className="art art-icon pix-icon" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
