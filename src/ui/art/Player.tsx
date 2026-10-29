import { useMemo } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE, leagueKits, type Kit, type KitLeague } from '../../content/teamStyle';
import { hash } from './color';
import { toPaths } from './pixel';
import type { Pos } from '../../engine/types';
import { legendLook, type LegendLook } from '../../content/legendLooks';
import { DRIBBLE, DUNK, JUMPER, LOWDRIBBLE, TRIPLE, paint, type Look, type Pose } from './sprite';

// The player, as a pixel-art sprite in his team's kit (round 17). His look (skin, hair, a
// headband or an arm sleeve) comes from his name, so he looks the same all career; the kit
// changes with every team: home, road or city edition.

export const SKINS = ['#F3D2B8', '#E8BC98', '#D4A077', '#B67F55', '#8E5B3A', '#6B4029', '#4C2C1C'];
export const HAIRS: Record<LegendLook['color'], string> = { k: '#231B18', b: '#5A3A22', l: '#D9B26A', r: '#B4532A', g: '#9AA0A8', x: '#3FBF6A' };

export type KitName = 'home' | 'road' | 'city';

/** The league whose style a team's kit and crest follow, from the level being played. */
export const styleLeague = (level?: string): KitLeague | undefined =>
  level === 'HS' || level === 'HSV' || level === 'HSJV' ? 'HS' : level === 'NCAA' || level === 'GL' || level === 'EU' || level === 'INT' || level === 'NBA' ? level : undefined;

/** One pose per position: the point guard low on the dribble, the two guard driving, the wing
 * rising for a jumper, the four in triple threat, the five flying in for a dunk. */
const POSES = { PG: LOWDRIBBLE, SG: DRIBBLE, SF: JUMPER, PF: TRIPLE, C: DUNK };
export const poseFor = (pos?: Pos): Pose => POSES[pos ?? 'SG'];

/** How a player looks: a legend as he really did (content/legendLooks.ts), anyone else from his name. */
export function lookOf(name: string, shoe: string): Look {
  const l = legendLook(name);
  if (l) return { skin: SKINS[Math.max(0, Math.min(6, l.skin - 1))], hair: HAIRS[l.color], style: l.hair, face: l.face, gear: l.gear, shoe };
  const h = hash(name);
  const h2 = hash(`${name}~`);
  const skin = h % SKINS.length;
  const styles: Look['style'][] = ['short', 'buzz', 'short', 'flattop', 'afro', 'cornrows', 'twists', 'curly', 'bald', skin < 2 ? 'parted' : 'short'];
  const faces: Look['face'][] = ['none', 'none', 'none', 'goatee', 'beard', 'stubble', 'mustache'];
  const gear = [(h2 >>> 11) % 5 === 0 && 'headband', (h2 >>> 15) % 5 === 0 && 'sleeve', (h2 >>> 19) % 4 === 0 && 'wristband'].filter((x): x is string => !!x);
  return { skin: SKINS[skin], hair: HAIRS[skin < 2 && (h >>> 9) % 3 === 0 ? 'b' : 'k'], style: styles[(h2 >>> 3) % styles.length], face: faces[(h2 >>> 7) % faces.length], gear, shoe };
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
