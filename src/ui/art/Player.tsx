import { useMemo } from 'react';
import { hash, ink, shade, tint } from './color';
import { toPaths } from './pixel';
import { DRIBBLE, paint } from './sprite';

// The player, as a pixel-art sprite in his team's kit (round 17). Skin tone and hair come from
// his name, so he looks the same all career; the jersey changes with every team.

const SKINS = ['#F1C9A5', '#E0A982', '#C68A5E', '#A86E45', '#8A5534', '#6B3F26', '#523020'];
const HAIRS = ['#1C1512', '#2B1E16', '#4A3221', '#7A5230', '#B88A4A'];

export function PlayerArt({ name, number, color = '#2A2F36', size = 96 }: { name: string; number: number; color?: string; size?: number }) {
  const h = hash(name);
  const paths = useMemo(() => {
    const trim = ink(color) === '#FFFFFF' ? tint(color, 0.85) : shade(color, 0.6);
    const kit = { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >>> 5) % 3 === 0 ? (h >>> 9) % HAIRS.length : 0], jersey: color, trim, shoe: shade(color, 0.45), sole: '#F2F2F2', number };
    return toPaths(paint(DRIBBLE, kit));
  }, [h, color, number]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-player" data-art="player-sprite" width={(size * DRIBBLE.w) / DRIBBLE.h} height={size} viewBox={`0 0 ${DRIBBLE.w} ${DRIBBLE.h}`} shapeRendering="crispEdges" role="img" aria-label={`${name}, number ${number}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
