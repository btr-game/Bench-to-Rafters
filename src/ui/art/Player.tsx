import { useMemo } from 'react';
import { NBA_TEAMS } from '../../content/teams';
import { TEAM_STYLE, leagueKits, type Kit, type KitLeague } from '../../content/teamStyle';
import { toPaths } from './pixel';
import type { Pos } from '../../engine/types';
import type { LegendLook } from '../../content/legendLooks';
import { lookTraits } from '../../content/looks';
import { SHOP_ITEMS, type WearSlot } from '../../content/shop';
import { DRIBBLE, DUNK, JUMPER, LOWDRIBBLE, TRIPLE, noBall as withoutBall, paint, type Look, type Pose } from './sprite';
export { withoutBall };

// The player, as a pixel-art sprite in his team's kit (round 17). His look (skin, hair, a
// headband or an arm sleeve) comes from his name, so he looks the same all career; the kit
// changes with every team: home, road or city edition.

const SKINS = ['#F3D2B8', '#E8BC98', '#D4A077', '#B67F55', '#8E5B3A', '#6B4029', '#4C2C1C'];
const HAIRS: Record<LegendLook['color'], string> = { k: '#231B18', b: '#5A3A22', l: '#D9B26A', r: '#B4532A', g: '#9AA0A8', x: '#3FBF6A' };
/** The palettes the look picker shows (round 27). */
export const SKIN_COLORS = SKINS;
export const HAIR_COLORS = HAIRS;

export type KitName = 'home' | 'road' | 'city';

/** The league whose style a team's kit and crest follow, from the level being played. */
export const styleLeague = (level?: string): KitLeague | undefined =>
  level === 'HS' || level === 'HSV' || level === 'HSJV' ? 'HS' : level === 'NCAA' || level === 'GL' || level === 'EU' || level === 'INT' || level === 'NBA' ? level : undefined;

/** One pose per position: the point guard low on the dribble, the two guard driving, the wing
 * rising for a jumper, the four in triple threat, the five flying in for a dunk. */
const POSES = { PG: LOWDRIBBLE, SG: DRIBBLE, SF: JUMPER, PF: TRIPLE, C: DUNK };
const poseFor = (pos?: Pos): Pose => POSES[pos ?? 'SG'];

/** How a player looks: a legend as he really did (content/legendLooks.ts), anyone else from his name. */
export function lookOf(name: string, shoe: string, wear?: Wear): Look {
  const t = lookTraits(name);
  return withWear({ skin: SKINS[t.skin], hair: HAIRS[t.hair], style: t.style, face: t.face, gear: t.gear, shoe }, wear);
}

/** What he has on from the wardrobe (round 25): slot -> shop id, or 'none' to take it off. */
export type Wear = Partial<Record<WearSlot, string>>;
const GEAR_OF: Record<WearSlot, string | null> = { head: 'headband', arm: 'sleeve', wrist: 'wristband', legs: null };

/** His own look with the wardrobe on top: bought accessories in their colours, or slots taken off. */
function withWear(look: Look, wear?: Wear): Look {
  if (!wear) return look;
  const gear = new Set(look.gear);
  const colors: Look['colors'] = {};
  for (const slot of Object.keys(wear) as WearSlot[]) {
    const g = GEAR_OF[slot];
    const it = SHOP_ITEMS.find((i) => i.id === wear[slot])?.wear;
    if (g) {
      if (it) gear.add(g);
      else gear.delete(g);
    }
    if (it) colors[slot] = it.color;
  }
  return { ...look, gear: [...gear], colors };
}

/** The kit a team wears: its own for NBA clubs, one built from its colour for everyone else. */
export function kitFor(teamName: string, abbr: string, color: string, which: KitName, league?: KitLeague): Kit {
  const nba = NBA_TEAMS.find((t) => t.abbr === abbr && teamName.includes(t.nick));
  if (nba) return TEAM_STYLE[nba.abbr][which];
  const parent = league === 'GL' ? NBA_TEAMS.find((t) => t.gl === teamName) : undefined;
  return leagueKits(league, color, teamName, parent && TEAM_STYLE[parent.abbr])[which];
}

/** His shoes: in the kit's ink or trim at home, in its colour on the road. */
export const shoeOf = (k: Kit, which: KitName): string => (which === 'home' ? ('#F2F2F2' === k.base ? k.ink : k.trim) : k.base === '#FFFFFF' ? k.ink : k.base);

export function PlayerArt({ name, number, pos, color = '#2A2F36', team = '', abbr = '', kit = 'home', league, kitData, size = 96, noBall = false, wear, frame, mirror = false }: { name: string; number: number; pos?: Pos; color?: string; team?: string; abbr?: string; kit?: KitName; league?: KitLeague; kitData?: Kit; size?: number; noBall?: boolean; wear?: Wear; frame?: Pose; mirror?: boolean }) {
  // round 24: streetball draws one ball of its own, so its players hold none; round 27: `frame`
  // draws any pose (the intro's running, shooting, blocking and reaching frames), and `mirror`
  // turns him to face left with his number still reading the right way
  const pose = useMemo(() => frame ?? (noBall ? withoutBall(poseFor(pos)) : poseFor(pos)), [pos, noBall, frame]);
  const paths = useMemo(() => {
    const k = kitData ?? kitFor(team, abbr, color, kit, league);
    return toPaths(paint(pose, k, lookOf(name, shoeOf(k, kit), wear), number, mirror));
  }, [pose, name, number, color, team, abbr, kit, league, kitData, wear, mirror]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-player" data-art="player-sprite" width={(size * pose.w) / pose.h} height={size} viewBox={`0 0 ${pose.w} ${pose.h}`} shapeRendering="crispEdges" role="img" aria-label={`${name}, number ${number}`}>
      <g transform={mirror ? `matrix(-1 0 0 1 ${pose.w} 0)` : undefined}>
        {paths.map((p) => (
          <path key={p.fill} d={p.d} fill={p.fill} />
        ))}
      </g>
    </svg>
  );
}

// round 27 (owner: "the statues should also be in the cute avatars not the detailed ones"): the
// cute sprite cast in metal. Every painted pixel takes the metal's tone for how light it was.
const METAL_TONES = { bronze: ['#3B2410', '#6E4520', '#94622F', '#B98142', '#E0AE6E'], gold: ['#4A3305', '#8A6410', '#B8891C', '#E2B33C', '#FFE38A'] };
function toneOf(hex: string, metal: 'bronze' | 'gold'): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return METAL_TONES[metal][lum < 45 ? 0 : lum < 95 ? 1 : lum < 145 ? 2 : lum < 200 ? 3 : 4];
}

/** The cute player sprite as a bronze or gold statue. */
export function PlayerStatue({ name, number, pos, metal, size = 120 }: { name: string; number: number; pos?: Pos; metal: 'bronze' | 'gold'; size?: number }) {
  const pose = poseFor(pos);
  const paths = useMemo(() => {
    const k = kitFor('', '', '#7a7f87', 'home');
    const grid = paint(pose, k, lookOf(name, '#2A2D34'), number);
    return toPaths(grid.map((row) => row.map((c) => (c && c.startsWith('#') ? toneOf(c, metal) : c))));
  }, [pose, name, number, metal]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="art art-player" width={(size * pose.w) / pose.h} height={size} viewBox={`0 0 ${pose.w} ${pose.h}`} shapeRendering="crispEdges" role="img" aria-label={`A ${metal} statue of ${name}`}>
      {paths.map((p) => (
        <path key={p.fill} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
