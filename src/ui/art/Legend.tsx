import { CONTEST_NUMBERS, LEGEND_NUMBERS } from '../../content/legendNumbers';
import { TEAM_STYLE } from '../../content/teamStyle';
import { BustArt } from './Bust';
import type { KitName } from './Player';

/** A legend's portrait: head and shoulders in his franchise's jersey. */
export function LegendBust({ name, team, kit = 'home', size = 48 }: { name: string; team: string; kit?: KitName; size?: number }) {
  const st = TEAM_STYLE[team];
  const n = CONTEST_NUMBERS[`${team}:${name}`] ?? LEGEND_NUMBERS[name] ?? -1;
  const k = st?.[kit] ?? { base: '#3A3D46', ink: '#FFFFFF', trim: '#C9CFDA', word: '' };
  return <BustArt name={name} kit={k} number={n} size={size} />;
}
