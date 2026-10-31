// A medal on its ribbon, on a pixel grid (round 28, owner: "i noticed that the bronze medal for
// olympics is not pixelated. any graphic that isnt pixels, change them"): the silver and bronze
// at the end of a lost final, gold where a page wants one. The disc is a stepped circle with a
// light upper left and a shaded lower right, the place in the 5x7 pixel font.

import { useMemo } from 'react';

export type Metal = 'gold' | 'silver' | 'bronze';

const METAL: Record<Metal, { base: string; light: string; dark: string; ink: string }> = {
  gold: { base: '#FCC419', light: '#FFF3BF', dark: '#C99A06', ink: '#7A5A00' },
  silver: { base: '#CED4DA', light: '#FFFFFF', dark: '#8D949E', ink: '#495057' },
  bronze: { base: '#CD7F32', light: '#FFD8A8', dark: '#8A4B14', ink: '#5C2F0A' },
};

// O outline, R ribbon, W ribbon stripe, M metal, H light, D shade
const ROWS = [
  '....OOOOOOOO....',
  '....ORRWWRRO....',
  '....ORRWWRRO....',
  '....ORRWWRRO....',
  '....ORRWWRRO....',
  '....ORRWWRRO....',
  '....ORRWWRRO....',
  '.....ORWWRO.....',
  '......OOOO......',
  '.....OOOOOO.....',
  '...OOMMMMMMOO...',
  '..OMHHMMMMMMMO..',
  '.OMHHMMMMMMMMMO.',
  '.OMHMMMMMMMMMMO.',
  'OMHMMMMMMMMMMMDO',
  'OMMMMMMMMMMMMMDO',
  'OMMMMMMMMMMMMMDO',
  'OMMMMMMMMMMMMMDO',
  'OMMMMMMMMMMMMMDO',
  'OMMMMMMMMMMMMDDO',
  '.OMMMMMMMMMMMDO.',
  '.OMMMMMMMMMMDDO.',
  '..OMMMMMMMMDDO..',
  '...OODDDDDDOO...',
  '.....OOOOOO.....',
];

const DIGIT: Record<string, string[]> = {
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
};

/** `place` 1, 2 or 3 on the disc; `ribbon` the strap's colour (a team's, or a country's). */
export function MedalArt({ metal, place, ribbon = '#1C7ED6', size = 96 }: { metal: Metal; place?: 1 | 2 | 3; ribbon?: string; size?: number }) {
  const c = METAL[metal];
  const px = useMemo(() => {
    const out: { x: number; y: number; fill: string }[] = [];
    const color: Record<string, string> = { O: '#18141C', R: ribbon, W: '#FFFFFF', M: c.base, H: c.light, D: c.dark };
    ROWS.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && out.push({ x, y, fill: color[ch] })));
    const glyph = place ? DIGIT[String(place)] : null;
    // the place, centred on the disc (rows 12 to 18)
    if (glyph) glyph.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && out.push({ x: x + 6, y: y + 13, fill: c.ink })));
    return out;
  }, [c, place, ribbon]);
  return (
    <svg className="art art-medal" width={(size * 16) / 25} height={size} viewBox="0 0 16 25" shapeRendering="crispEdges" role="img" aria-label={`${metal} medal`}>
      {px.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={p.fill} />
      ))}
    </svg>
  );
}
