import { useMemo } from 'react';
import { ACH_TIERS, type AchTier } from '../../engine/achievements';
import { dark, light, toPaths } from './pixel';

// An achievement medal (round 24): a round pixel medal on a ribbon in the tier's colour, with a
// star for the tiers below the Hall of Fame and a crown for it. A locked one is grey with a "?".
// Letters: O outline, R ribbon, r ribbon shade, M metal, L light, D dark, S mark.
const MEDAL = [
  '...OOO..OOO...',
  '...ORrOOrRO...',
  '...ORrOOrRO...',
  '....OROORO....',
  '....OOOOOO....',
  '..OOMMMMMMOO..',
  '.OMLLLLMMMMDO.',
  '.OMLSSSSSSMDO.',
  'OMLLSSSSSSMMDO',
  'OMLMSSSSSSMMDO',
  'OMMMSSSSSSMMDO',
  'OMMMSSSSSSMDDO',
  '.OMMSSSSSSMDO.',
  '.OMMMMMMMMDDO.',
  '..OODDDDDDOO..',
  '....OOOOOO....',
];
// the marks drawn into the 6x6 S area (rows 7-12): 1 = mark, 0 = metal
const MARKS: Record<'star' | 'crown' | 'lock', string[]> = {
  star: ['001100', '001100', '111111', '011110', '011110', '110011'],
  crown: ['101101', '111111', '111111', '011110', '011110', '111111'],
  lock: ['011110', '110011', '000110', '001100', '000000', '001100'],
};

export function Badge({ tier, locked = false, size = 40 }: { tier: AchTier; locked?: boolean; size?: number }) {
  const paths = useMemo(() => {
    const base = locked ? '#8A919C' : ACH_TIERS.find((t) => t.key === tier)!.color;
    const ribbon = locked ? '#6B7280' : tier === 'hof' ? '#E03131' : '#1C7ED6';
    const pal: Record<string, string> = { O: '#1B1820', R: ribbon, r: dark(ribbon, 0.25), M: base, L: light(base, 0.3), D: dark(base, 0.25) };
    const mark = MARKS[locked ? 'lock' : tier === 'hof' ? 'crown' : 'star'];
    let si = 0;
    const rows = MEDAL.map((r, y) =>
      [...r].map((c) => {
        if (c !== 'S') return pal[c] ?? '';
        const sy = y - 7;
        const sx = si++ % 6;
        return mark[sy]?.[sx] === '1' ? (locked ? '#E9ECEF' : light(base, 0.7)) : base;
      }),
    );
    return toPaths(rows);
  }, [tier, locked]);
  return (
    <svg className="art badge-art" width={size} height={(size * 16) / 14} viewBox="0 0 14 16" shapeRendering="crispEdges" aria-hidden="true">
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
