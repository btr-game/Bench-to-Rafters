import { useMemo } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE, leagueKits, type Kit, type KitLeague } from '../../content/teamStyle';
import { hash } from './color';
import { toPaths } from './pixel';
import type { Pos } from '../../engine/types';
import { DRIBBLE, DUNK, JUMPER, LOWDRIBBLE, TRIPLE, paint, type Look, type Pose } from './sprite';

// The player, as a pixel-art sprite in his team's kit (round 17). His look (skin, hair, a
// headband or an arm sleeve) comes from his name, so he looks the same all career; the kit
// changes with every team: home, road or city edition.

const SKINS = ['#F1C9A5', '#E0A982', '#C68A5E', '#A86E45', '#8A5534', '#6B3F26', '#523020'];
const HAIRS = ['#1C1512', '#2B1E16', '#4A3221', '#7A5230', '#B88A4A'];

export type KitName = 'home' | 'road' | 'city';

/** The league whose style a team's kit and crest follow, from the level being played. */
export const styleLeague = (level?: string): KitLeague | undefined =>
  level === 'HS' || level === 'HSV' || level === 'HSJV' ? 'HS' : level === 'NCAA' || level === 'GL' || level === 'EU' || level === 'INT' || level === 'NBA' ? level : undefined;

/** One pose per position: the point guard low on the dribble, the two guard driving, the wing
 * rising for a jumper, the four in triple threat, the five flying in for a dunk. */
export const poseFor = (pos?: Pos): Pose => (pos === 'PG' ? LOWDRIBBLE : pos === 'SF' ? JUMPER : pos === 'PF' ? TRIPLE : pos === 'C' ? DUNK : DRIBBLE);

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
export function kitFor(teamName: string, abbr: string, color: string, which: KitName, league?: KitLeague): Kit {
  const nba = NBA_TEAMS.find((t) => t.abbr === abbr && teamName.includes(t.nick));
  if (nba) return TEAM_STYLE[nba.abbr][which];
  const parent = league === 'GL' ? NBA_TEAMS.find((t) => t.gl === teamName) : undefined;
  return leagueKits(league, color, teamName, parent && TEAM_STYLE[parent.abbr])[which];
}

export function PlayerArt({ name, number, pos, color = '#2A2F36', team = '', abbr = '', kit = 'home', league, kitData, size = 96 }: { name: string; number: number; pos?: Pos; color?: string; team?: string; abbr?: string; kit?: KitName; league?: KitLeague; kitData?: Kit; size?: number }) {
  const pose = poseFor(pos);
  const paths = useMemo(() => {
    const k = kitData ?? kitFor(team, abbr, color, kit, league);
    const shoe = kit === 'home' ? '#F2F2F2' === k.base ? k.ink : k.trim : k.base === '#FFFFFF' ? k.ink : k.base;
    return toPaths(paint(pose, k, lookOf(name, shoe), number));
  }, [pose, name, number, color, team, abbr, kit, league, kitData]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-player" data-art="player-sprite" width={(size * pose.w) / pose.h} height={size} viewBox={`0 0 ${pose.w} ${pose.h}`} shapeRendering="crispEdges" role="img" aria-label={`${name}, number ${number}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
