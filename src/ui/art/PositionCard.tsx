import { useMemo } from 'react';
import type { Pos } from '../../engine/types';
import { paintFloor } from './arena';
import { mix } from './color';
import { toPaths } from './pixel';
import { PlayerArt } from './Player';

// The position cards on the start page (round 17): one colour per position, the code big, what
// the position does in a line, the player drawn to its height, and a little half-court showing
// where that position lives on the floor.

export const POS_STYLE: Record<Pos, { color: string; role: string; spot: [number, number] }> = {
  PG: { color: '#1C7ED6', role: 'Runs the offence: handles it, passes, calls the plays', spot: [24, 25] },
  SG: { color: '#2F9E44', role: 'The scorer: shoots off screens, attacks closeouts', spot: [41, 19] },
  SF: { color: '#E8590C', role: 'The wing who does a bit of everything', spot: [7, 15] },
  PF: { color: '#7048E8', role: 'Muscle inside: rebounds, screens, steps out to shoot', spot: [33, 9] },
  C: { color: '#C2255C', role: 'Protects the rim and owns the glass', spot: [24, 6] },
};

const CW = 48;
const CH = 32;

function paintCourt(pos: Pos): string[][] {
  const g = Array.from({ length: CH }, () => Array(CW).fill(''));
  paintFloor(g, 0);
  const line = '#F4F1EA';
  const { color, spot } = POS_STYLE[pos];
  // the lane, the arc, the baseline and the hoop
  for (let y = 1; y < 15; y++) for (let x = 17; x < 31; x++) g[y][x] = mix(g[y][x], '#1D428A', 0.3);
  for (let x = 0; x < CW; x++) g[1][x] = line;
  for (let y = 1; y < 15; y++) g[y][17] = g[y][30] = line;
  for (let x = 17; x < 31; x++) g[14][x] = line;
  for (let a = 0; a <= Math.PI; a += 0.01) {
    const x = Math.round(24 + Math.cos(a) * 21);
    const y = Math.round(2 + Math.sin(a) * 22);
    if (y < CH) g[y][x] = line;
  }
  for (const [x, y] of [[23, 3], [24, 3], [22, 4], [25, 4], [23, 5], [24, 5]] as [number, number][]) g[y][x] = '#E2551B';
  // where this position lives: a glowing spot
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const d = Math.hypot(x + 0.5 - spot[0], y + 0.5 - spot[1]);
      if (d < 2.2) g[y][x] = color;
      else if (d < 5.5) g[y][x] = mix(g[y][x], color, 0.45);
    }
  return g;
}

export function PositionCard({ pos, name, full, height, number, playerName, on, onPick, scale }: { pos: Pos; name: string; full: string; height: string; number: number; playerName: string; on: boolean; onPick: () => void; scale: number }) {
  const court = useMemo(() => toPaths(paintCourt(pos)), [pos]);
  const st = POS_STYLE[pos];
  return (
    <button className="pos-card" aria-pressed={on} onClick={onPick} style={{ ['--pos' as string]: st.color }}>
      <span className="pos-head">
        <b>{name}</b>
        <span>{full}</span>
      </span>
      <span className="pos-stage">
        <svg className="pos-court" viewBox={`0 0 ${CW} ${CH}`} shapeRendering="crispEdges" aria-hidden="true">
          {court.map((p) => (
            <path key={p.fill} d={p.d} fill={p.fill} />
          ))}
        </svg>
        <PlayerArt name={playerName} number={number} pos={pos} kitData={{ base: st.color, ink: '#FFFFFF', trim: mix(st.color, '#000000', 0.45), word: name }} size={Math.round(92 * scale)} />
      </span>
      <span className="pos-role">{st.role}</span>
      <span className="pos-height">{height}</span>
      {on && <span className="pos-check">Selected</span>}
    </button>
  );
}
