import { useMemo } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE, genericKits, type Kit } from '../../content/teamStyle';
import { hash } from './color';
import { toPaths } from './pixel';
import type { Pos } from '../../engine/types';
import { DRIBBLE, DUNK, JUMPER, paint, type Look, type Pose } from './sprite';

// The player, as a pixel-art sprite in his team's kit (round 17). His look (skin, hair, a
// headband or an arm sleeve) comes from his name, so he looks the same all career; the kit
// changes with every team: home, road or city edition.

const SKINS = ['#F1C9A5', '#E0A982', '#C68A5E', '#A86E45', '#8A5534', '#6B3F26', '#523020'];
const HAIRS = ['#1C1512', '#2B1E16', '#4A3221', '#7A5230', '#B88A4A'];

export type KitName = 'home' | 'road' | 'city';

/** Guards handle it, wings shoot it, bigs dunk it. */
export const poseFor = (pos?: Pos): Pose => (pos === 'SF' ? JUMPER : pos === 'PF' || pos === 'C' ? DUNK : DRIBBLE);

export function lookOf(name: string, shoe: string): Look {
  const h = hash(name);
  const h2 = hash(`${name}~`);
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 5) % 3 === 0 ? (h >>> 9) % HAIRS.length : 0],
    hairStyle: (h2 >>> 3) % 5,
    beard: (h2 >>> 7) % 3 === 0,
    headband: (h2 >>> 11) % 4 === 0,
    sleeve: (h2 >>> 15) % 4 === 0,
    shoe,
  };
}

/** The kit a team wears: its own for NBA clubs, one built from its colour for everyone else. */
export function kitFor(teamName: string, abbr: string, color: string, which: KitName): Kit {
  const nba = NBA_TEAMS.find((t) => t.abbr === abbr && teamName.includes(t.nick));
  const set = nba ? TEAM_STYLE[nba.abbr] : genericKits(color, (teamName.split(' ').pop() ?? '').toUpperCase());
  return set[which];
}

export function PlayerArt({ name, number, pos, color = '#2A2F36', team = '', abbr = '', kit = 'home', size = 96 }: { name: string; number: number; pos?: Pos; color?: string; team?: string; abbr?: string; kit?: KitName; size?: number }) {
  const pose = poseFor(pos);
  const paths = useMemo(() => {
    const k = kitFor(team, abbr, color, kit);
    const shoe = kit === 'home' ? '#F2F2F2' === k.base ? k.ink : k.trim : k.base === '#FFFFFF' ? k.ink : k.base;
    return toPaths(paint(pose, k, lookOf(name, shoe), number));
  }, [pose, name, number, color, team, abbr, kit]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-player" data-art="player-sprite" width={(size * pose.w) / pose.h} height={size} viewBox={`0 0 ${pose.w} ${pose.h}`} shapeRendering="crispEdges" role="img" aria-label={`${name}, number ${number}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
