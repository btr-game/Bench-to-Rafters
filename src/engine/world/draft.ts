// Draft classes (§8): ~100 generated prospects per year, a lottery and 60 picks.

import { DRAFT, POTENTIAL } from '../balance';
import { expectedOvrAt } from '../player/growth';
import { scoutSd } from '../player/create';
import { clamp, int, normal, weightedIndex, type Rng } from '../rng';
import type { GameState, GenPlayer, League, Team } from '../types';
import { genPlayer } from './gen';
import { standings, winPct } from '../sim/leagueSim';

export interface Prospect {
  p: GenPlayer;
  scoutPot: number;
  prod: number;
  board: number;
  isUser: boolean;
  from: string;
}

const FROM = ['NCAA', 'NCAA', 'NCAA', 'NCAA', 'NCAA', 'International', 'G League'];

export function boardScore(rng: Rng | null, ovr: number, scoutPot: number, prod: number, age: number): number {
  return (
    DRAFT.boardOvr * ovr +
    DRAFT.boardPot * scoutPot +
    DRAFT.boardProd * prod -
    DRAFT.agePenalty * Math.max(0, age - 19) +
    (rng ? normal(rng, 0, DRAFT.noise) : 0)
  );
}

export function generateClass(s: GameState): Prospect[] {
  const rng = s.rng;
  const cands: { ovr: number; pot: number; age: number; scoutPot: number; prod: number; board: number }[] = [];
  for (const age of DRAFT.ages) {
    for (let i = 0; i < DRAFT.poolPerAge; i++) {
      const pot = Math.round(clamp(normal(rng, DRAFT.potMean, DRAFT.potSd), POTENTIAL.min, POTENTIAL.max));
      const ovr = expectedOvrAt(pot, age) + normal(rng, 0, DRAFT.ovrNoise);
      const scoutPot = pot + normal(rng, 0, scoutSd(age));
      const prod = ovr + normal(rng, 0, 3);
      cands.push({ ovr, pot: Math.max(pot, Math.round(ovr)), age, scoutPot, prod, board: boardScore(rng, ovr, scoutPot, prod, age) });
    }
  }
  cands.sort((a, b) => b.board - a.board);
  return cands.slice(0, DRAFT.classSize).map((c) => {
    const g = genPlayer(s, c.ovr, c.age);
    g.pot = c.pot;
    return { p: g, scoutPot: c.scoutPot, prod: c.prod, board: c.board, isUser: false, from: FROM[int(rng, 0, FROM.length - 1)] };
  });
}

/** Draft order: lottery for the top 4 among non-playoff teams, then reverse standings. */
export function draftOrder(rng: Rng, league: League, playoffTeams: Set<string>): Team[] {
  const st = standings(league.teams).reverse(); // worst first
  const lottery = st.filter((t) => !playoffTeams.has(t.id));
  const playoff = st.filter((t) => playoffTeams.has(t.id));
  const pool = [...lottery];
  const odds = DRAFT.lotteryOdds.slice(0, pool.length);
  const winners: Team[] = [];
  for (let k = 0; k < 4 && pool.length > 0; k++) {
    const i = weightedIndex(rng, odds);
    winners.push(pool[i]);
    pool.splice(i, 1);
    odds.splice(i, 1);
  }
  const round1 = [...winners, ...pool, ...playoff];
  return [...round1, ...round1];
}

export interface DraftPickResult {
  team: Team;
  prospect: Prospect;
  pick: number;
}

export function runDraft(rng: Rng, order: Team[], cls: Prospect[]): DraftPickResult[] {
  const avail = [...cls];
  const out: DraftPickResult[] = [];
  order.forEach((team, i) => {
    if (avail.length === 0) return;
    let best = 0;
    let bestScore = -Infinity;
    for (let j = 0; j < Math.min(avail.length, 12); j++) {
      const sc = avail[j].board + normal(rng, 0, DRAFT.teamNoise);
      if (sc > bestScore) {
        bestScore = sc;
        best = j;
      }
    }
    out.push({ team, prospect: avail[best], pick: i + 1 });
    avail.splice(best, 1);
  });
  return out;
}

/** Mock draft range for the user before declaring (noise ≈ ±6 picks). */
export function mockRange(rng: Rng, cls: Prospect[], userBoard: number): [number, number] | null {
  const ahead = cls.filter((c) => c.board > userBoard).length + 1;
  const centre = ahead + Math.round(normal(rng, 0, DRAFT.mockNoise / 2));
  if (centre > 66) return null;
  const lo = clamp(centre - int(rng, 4, 8), 1, 60);
  const hi = clamp(centre + int(rng, 4, 8), 1, 60);
  return [lo, hi];
}

export const recordOf = (t: Team): string => `${t.w}–${t.l}`;
export { winPct };
