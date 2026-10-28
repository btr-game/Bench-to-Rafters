// Season-level stat lines for generated players, so awards can rank everyone.

import { LEVELS, RANK_MINUTES } from '../balance';
import { int, next, normal, type Rng } from '../rng';
import type { GenPlayer, League, LevelKey, Team } from '../types';
import { addLine, emptyLine, expected, genProfile, genUsageWeight, seasonLineFromExpected, valuePerGame } from './statModel';

export interface UserSlot {
  teamId: string;
  rank: number; // 1-based rank on the depth chart
  usageW: number;
  minutes: number;
}

export function rankMinutes(level: LevelKey, rank: number): number {
  const m = RANK_MINUTES[Math.min(rank - 1, RANK_MINUTES.length - 1)] ?? 0;
  return (m * LEVELS[level].gameLen) / 48;
}

/** Minute-weighted average usage weight on a team (the user included). */
export function teamUsageMean(level: LevelKey, roster: GenPlayer[], slot: UserSlot | null): number {
  let num = 0;
  let den = 0;
  let rank = 1;
  const sorted = isSortedDesc(roster) ? roster : [...roster].sort((a, b) => b.ovr - a.ovr);
  for (const p of sorted) {
    if (slot && rank === slot.rank) {
      num += slot.usageW * slot.minutes;
      den += slot.minutes;
      rank++;
    }
    const m = rankMinutes(level, rank);
    num += genUsageWeight(p) * m;
    den += m;
    rank++;
  }
  if (slot && slot.rank >= rank) {
    num += slot.usageW * slot.minutes;
    den += slot.minutes;
  }
  return den > 0 ? num / den : 1;
}

function isSortedDesc(r: GenPlayer[]): boolean {
  for (let i = 1; i < r.length; i++) if (r[i].ovr > r[i - 1].ovr) return false;
  return true;
}

function missedGames(rng: Rng, games: number): number {
  const r = next(rng);
  if (r < 0.6) return Math.min(games, int(rng, 0, 2));
  if (r < 0.9) return Math.min(games, int(rng, 2, 8));
  if (r < 0.98) return Math.min(games, int(rng, 8, 25));
  return games;
}

/**
 * Season lines for generated players, made once at the end of the regular season
 * (half 1 is a no-op). The first-half value used for All-Star voting is the season
 * value with some noise. Outside the NBA only the top of each roster (the players
 * who can matter for awards) gets a line, to keep the harness fast.
 */
export function accumulateHalf(rng: Rng, league: League, _games: number, slot: UserSlot | null, half: 1 | 2): void {
  if (half === 1) return;
  const depth = league.level === 'NBA' ? 99 : 7;
  for (const team of league.teams) {
    const s = slot && slot.teamId === team.id ? slot : null;
    accumulateTeam(rng, league.level, team, league.rounds, s, s ? 99 : depth);
  }
}

function accumulateTeam(rng: Rng, level: LevelKey, team: Team, games: number, slot: UserSlot | null, depth: number): void {
  team.roster.sort((a, b) => b.ovr - a.ovr);
  const mean = teamUsageMean(level, team.roster, slot);
  let rank = 1;
  for (const p of team.roster) {
    if (slot && rank === slot.rank) rank++;
    if (rank > depth) break;
    if (!p.s) p.s = emptyLine();
    const minutes = rankMinutes(level, rank);
    const prof = genProfile(p);
    const e = expected(prof, level, minutes, genUsageWeight(p) / mean);
    const gp = minutes < 0.6 ? Math.round(games * 0.15) : games - missedGames(rng, games);
    const gs = rank <= 5 ? gp : 0;
    const line = seasonLineFromExpected(e, gp, gs, Math.max(0.7, normal(rng, 1, 0.1)));
    addLine(p.s, line);
    p.starter = rank <= 5;
    if (!p.firstHalfValue) p.firstHalfValue = valuePerGame(p.s) * normal(rng, 1, 0.08);
    rank++;
  }
}

export function resetSeasonLines(league: League): void {
  for (const t of league.teams) {
    t.w = 0;
    t.l = 0;
    for (const p of t.roster) {
      p.prevValue = p.s && p.s.gp > 20 ? valuePerGame(p.s) : p.prevValue;
      p.s = emptyLine();
      p.value = 0;
      p.firstHalfValue = 0;
    }
  }
  league.round = 0;
  league.bracket = null;
}
