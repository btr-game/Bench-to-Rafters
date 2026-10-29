import { useMemo } from 'react';
import type { Kit } from '../../content/teamStyle';
import { lookOf } from './Player';
import { toPaths } from './pixel';
import { BUST, paint } from './sprite';

// A portrait (round 17): the player's head and shoulders in the same pixel style as his sprite,
// so a legend looks like himself (his hair, beard, goggles or headband) in every list.

export function BustArt({ name, kit, number, size = 48 }: { name: string; kit: Kit; number: number; size?: number }) {
  const paths = useMemo(() => toPaths(paint(BUST, kit, lookOf(name, kit.trim), number)), [name, kit, number]);
  return (
    <svg className="art art-bust" width={(size * BUST.w) / BUST.h} height={size} viewBox={`0 0 ${BUST.w} ${BUST.h}`} shapeRendering="crispEdges" role="img" aria-label={name}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
