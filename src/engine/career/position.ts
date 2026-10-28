// Changing positions. Every offseason the player may move one spot along PG-SG-SF-PF-C, or
// two spots when his height fits the new position. His OVR is re-weighted for the new spot
// straight away, so a move can make him better or worse on paper. A coach may also ask for
// a move mid-season (see events/risks.ts).

import { HEIGHT_RANGE, POSITIONS } from '../balance';
import type { GameState, Pos } from '../types';
import { ovrOf } from '../player/ovr';
import { adjust, logDecision } from './common';
import { NAMES } from '../../content/strings';

const ht = (inches: number): string => `${Math.floor(inches / 12)}′${Math.round(inches % 12)}″`;

export interface PosOption {
  pos: Pos;
  ovr: number;
  fit: string;
  allowed: boolean;
}

function fitFor(height: number, pos: Pos): { label: string; inches: number } {
  const [lo, hi] = HEIGHT_RANGE[pos];
  if (height < lo - 1) return { label: `undersized (most are ${ht(lo)}+)`, inches: height - lo };
  if (height > hi + 1) return { label: `oversized (most are under ${ht(hi + 1)})`, inches: height - hi };
  return { label: 'natural size', inches: 0 };
}

export function positionOptions(s: GameState): PosOption[] {
  const p = s.player;
  const i = POSITIONS.indexOf(p.pos);
  return POSITIONS.filter((x) => x !== p.pos).map((pos) => {
    const d = Math.abs(POSITIONS.indexOf(pos) - i);
    // while he is still growing the fit is judged on the doctors' projection
    const fit = fitFor(p.height >= p.heightProj ? p.height : p.heightProj, pos);
    const allowed = d === 1 || (d === 2 && Math.abs(fit.inches) <= 1);
    return { pos, ovr: ovrOf(p.attrs, pos), fit: allowed ? fit.label : 'too big a jump for your size', allowed };
  });
}

/** Once per offseason, while he is still playing. */
export function canChangePosition(s: GameState): boolean {
  return s.step === 'offseason' && s.stage !== 'RETIRED' && s.flags.posYear !== s.year;
}

/** Moves him to `pos`. `byCoach` is a mid-season move the coach asked for. */
export function setPosition(s: GameState, pos: Pos, byCoach = false): string {
  const p = s.player;
  const from = p.pos;
  if (from === pos) return '';
  const before = ovrOf(p.attrs, from);
  p.pos = pos;
  const after = ovrOf(p.attrs, pos);
  if (!byCoach) {
    s.flags.posYear = s.year;
    // a new role takes some convincing
    p.trust = adjust(p.trust, -4);
  }
  logDecision(s, 'position', `Moved from ${NAMES.pos[from].toLowerCase()} to ${NAMES.pos[pos].toLowerCase()}${byCoach ? ' at the coach\'s request' : ''}.`);
  const diff = Math.round(after) - Math.round(before);
  return `You are a ${NAMES.pos[pos].toLowerCase()} now. OVR ${Math.round(before)} → ${Math.round(after)}${diff > 0 ? ': the new spot suits your game' : diff < 0 ? ': it will take work to grow into it' : ''}.`;
}

export function changePosition(s: GameState, pos: Pos): void {
  if (!canChangePosition(s)) return;
  const opt = positionOptions(s).find((o) => o.pos === pos);
  if (!opt?.allowed) return;
  s.toast = setPosition(s, pos);
}
