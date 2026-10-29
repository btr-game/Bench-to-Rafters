import type { Pos } from '../../engine/types';
import { CONTEST_NUMBERS, LEGEND_NUMBERS } from '../../content/legendNumbers';
import { TEAM_STYLE } from '../../content/teamStyle';
import { PlayerArt, type KitName } from './Player';

/** A legend's pixel sprite (round 17): his franchise's kit, his number if we know it, his position's pose. */
export function LegendArt({ name, pos, team, kit = 'home', size = 44, number }: { name: string; pos?: Pos; team: string; kit?: KitName; size?: number; number?: number }) {
  const st = TEAM_STYLE[team];
  const n = number ?? CONTEST_NUMBERS[`${team}:${name}`] ?? LEGEND_NUMBERS[name] ?? -1;
  return <PlayerArt name={name} number={n} pos={pos} kitData={st?.[kit]} color="#2A2F36" size={size} />;
}
