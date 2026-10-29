import { useMemo } from 'react';
import { ICONS, PAL } from './icons';
import { toPaths } from './pixel';

/** A 16x16 pixel icon from the set in icons.ts, drawn crisp at any size. */
export function Icon({ name, size = 20, title }: { name: string; size?: number; title?: string }) {
  const paths = useMemo(() => {
    const rows = ICONS[name] ?? [];
    const top = Math.floor((16 - rows.length) / 2);
    const grid = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => PAL[rows[y - top]?.[x] ?? '.'] ?? ''));
    return toPaths(grid);
  }, [name]);
  if (!ICONS[name]) return null;
  return (
    <svg className="art art-icon pix-icon" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
