// One NBA year for the world: season (when the user is not in it), draft and offseason.

import type { DraftPick, GameState } from '../types';
import { accumulateHalf, resetSeasonLines } from '../sim/genStats';
import { buildCandidates, nbaAwards } from '../awards/awards';
import { playoffMvps, recordNbaYear } from '../awards/playoffs';
import { nbaPlayoffs, playRounds } from '../sim/leagueSim';
import { boardScore, draftOrder, generateClass, mockRange, runDraft, type DraftPickResult, type Prospect } from '../world/draft';
import { nbaOffseason } from '../world/nbaWorld';
import { scoutEstimate } from '../player/create';
import { ovrOf } from '../player/ovr';
import { DRAFT } from '../balance';

/** Simulates a full NBA season by team strength (the user is not in the league). */
export function quickNbaSeason(s: GameState, year = s.year): void {
  const nba = s.nba!;
  resetSeasonLines(nba);
  nba.userTeamId = null;
  playRounds(s.rng, nba, 82, null);
  // season lines so the league has award winners and a record book
  accumulateHalf(s.rng, nba, 82, null, 2);
  nba.bracket = nbaPlayoffs(s.rng, nba, null).bracket;
  playoffMvps(s.rng, nba, nba.bracket, null);
  recordNbaYear(s, nba, nbaAwards(buildCandidates(nba, null)), year);
}

export function warmUpNba(s: GameState, years: number): void {
  for (let i = 0; i < years; i++) {
    quickNbaSeason(s, s.year - years + i);
    runWorldDraft(s, null);
  }
}

export function playoffTeamIds(s: GameState): Set<string> {
  const set = new Set<string>();
  const b = s.nba!.bracket;
  if (b) for (const sr of b.rounds[0]?.series ?? []) set.add(sr.a).add(sr.b);
  return set;
}

export interface UserProspect {
  board: number;
  prospect: Prospect;
}

/** The user's prospect card for this year's draft. */
export function userProspect(s: GameState): UserProspect {
  const p = s.player;
  const ovr = ovrOf(p.attrs, p.pos);
  const last = s.history[s.history.length - 1];
  const prodBoost = last && last.line.gp > 0 ? Math.max(-6, Math.min(6, ((last.line.pts + last.line.reb + last.line.ast) / last.line.gp - 18) * 0.35)) : 0;
  const prod = ovr + prodBoost;
  const board = boardScore(s.rng, ovr, scoutEstimate(p), prod, p.age) + DRAFT.userBoardBonus;
  return {
    board,
    prospect: {
      p: { id: -1, name: p.name, pos: p.pos, shape: 0, age: p.age, ovr, pot: p.potential, height: p.height, rep: p.rep, contractYears: 0, salary: 0 },
      scoutPot: scoutEstimate(p),
      prod,
      board,
      isUser: true,
      from: s.stage === 'NCAA' ? 'NCAA' : s.stage === 'GL' ? 'G League' : s.stage === 'EU' ? 'International' : 'Prep',
    },
  };
}

/** Class + mock range before the user declares. */
export function previewDraft(s: GameState): { cls: Prospect[]; mock: [number, number] | null; user: UserProspect } {
  const cls = generateClass(s);
  const user = userProspect(s);
  return { cls, mock: mockRange(s.rng, cls, user.board), user };
}

/**
 * Runs the year's draft and the NBA offseason. If `user` is given, the user is in the class.
 * Returns the user's pick (or null).
 */
export function runWorldDraft(s: GameState, user: { cls: Prospect[]; user: UserProspect; mock: [number, number] | null } | null): number | null {
  const nba = s.nba!;
  const year = s.year + 1;
  const cls = user ? [...user.cls] : generateClass(s);
  if (user) {
    cls.push(user.user.prospect);
    cls.sort((a, b) => b.board - a.board);
  }
  const order = draftOrder(s.rng, nba, playoffTeamIds(s));
  const picks: DraftPickResult[] = runDraft(s.rng, order, cls);
  const userPick = picks.find((p) => p.prospect.isUser);
  if (user) {
    s.draft = {
      year,
      picks: picks.map<DraftPick>((p) => ({
        pick: p.pick,
        teamId: p.team.id,
        name: p.prospect.p.name,
        ovr: Math.round(p.prospect.p.ovr),
        pot: p.prospect.p.pot,
        age: p.prospect.p.age,
        isUser: p.prospect.isUser,
        from: p.prospect.from,
      })),
      userPick: userPick ? userPick.pick : null,
      mockRange: user.mock,
    };
  }
  nbaOffseason(s, nba, picks, year);
  if (userPick) return userPick.pick;
  return null;
}

export function teamForPick(s: GameState, pick: number): string | null {
  return s.draft?.picks.find((p) => p.pick === pick)?.teamId ?? null;
}
