// The Floor's own game (round 42, owner: "let's take it out of minigames and develop it into a
// larger one"): its setups. A quick game is the fourth quarter from a close score (12:00 on a clock
// that runs twice as fast, about four real minutes); a playoff game is all four quarters on a clock
// eight times as fast, the same four minutes (owner: "one full game could honestly be 4 minutes.
// can we change the pace that way only for 10?"). Each side is five legends at their real level or
// at an overall picked for that side alone (owner: "not average ovr of both teams, but divide into
// user's and opponent(ai)'s"). The playoffs are sixteen franchises, one game a round.

import { FLOOR } from '../balance';
import { int, makeRng, next } from '../rng';
import type { LegendSpot } from '../../content/franchiseFives';
import { NBA_TEAMS } from '../../content/teams';
import { fiveOvr, floorLevel, legendFive, legendTeam } from './legends';
import { skipFloor, startFloor, type FloorSetup } from './sim';

export type FloorLength = 'fourth' | 'full';

/** One side of a game: who they are, their five, and the overall they play at (their own when not given). */
export interface FloorSide {
  name: string;
  short: string;
  color: string;
  five: LegendSpot[];
  ovr?: number;
}

/** A franchise as a side. */
export function franchise(abbr: string, ovr?: number): FloorSide {
  const t = NBA_TEAMS.find((x) => x.abbr === abbr) ?? NBA_TEAMS[0];
  return { name: `${t.city} ${t.nick}`, short: t.abbr, color: t.color, five: legendFive(t.abbr), ovr };
}

export const sideOvr = (s: FloorSide): number => s.ovr ?? fiveOvr(s.five);

/** Points a team at this level scores in a quarter (measured: 19.02 at 76, about 0.75 a point of level). */
const perQuarter = (ovr: number): number => 19 + (floorLevel(ovr) - 76) * 0.75;

/** The score after three quarters: what each side would have by then, a few points either way, close. */
export function startScore(seed: number, us: FloorSide, them: FloorSide): [number, number] {
  const rng = makeRng(seed ^ 0x5f10);
  const base = Math.round(3 * (perQuarter(sideOvr(us)) + perQuarter(sideOvr(them))) * 0.5) + int(rng, -4, 4);
  return [base + int(rng, -3, 3), base];
}

/** A game between two sides: `user` is the starter he steers (none: the AI plays both, a simulation). */
export function legendSetup(o: { seed: number; us: FloorSide; them: FloorSide; user?: number; length: FloorLength }): FloorSetup {
  const full = o.length === 'full';
  return {
    seed: o.seed,
    mode: 'standard',
    us: { name: o.us.name, short: o.us.short, color: o.us.color, players: legendTeam('U', o.us.five, { ovr: o.us.ovr, user: o.user, seed: o.seed + 3 }) },
    them: { name: o.them.name, short: o.them.short, color: o.them.color, players: legendTeam('T', o.them.five, { ovr: o.them.ovr, seed: o.seed + 11 }) },
    score: full ? [0, 0] : startScore(o.seed, o.us, o.them),
    clock: FLOOR.quarter,
    quarter: full ? 1 : 4,
    rate: full ? FLOOR.rateFull : FLOOR.rate,
  };
}

// ---------------- the playoffs ----------------

export interface BracketGame {
  a: string;
  b: string;
  /** The final score once played. */
  score?: [number, number];
}

/** Sixteen franchises, one game a round: `rounds[0]` is the first round's eight games, and so on
 * to the final; `out` is the round he lost in, `champion` the winner once it is over. */
export interface Bracket {
  seed: number;
  me: string;
  rounds: BracketGame[][];
  out: number | null;
  champion: string | null;
}

export const BRACKET_ROUNDS = 4;

/** A new bracket: his franchise and fifteen others drawn from the seed, seeded by their fives (1 plays 16, 2 plays 15, ...). */
export function newBracket(me: string, seed: number): Bracket {
  const rng = makeRng(seed);
  const others = NBA_TEAMS.map((x) => x.abbr).filter((a) => a !== me);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(next(rng) * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const field = [me, ...others.slice(0, 15)].sort((x, y) => fiveOvr(legendFive(y)) - fiveOvr(legendFive(x)) || (x < y ? -1 : 1));
  // the usual order of a sixteen-team bracket, so 1 and 2 can only meet in the final
  const order = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
  const first: BracketGame[] = [];
  for (let k = 0; k < 16; k += 2) first.push({ a: field[order[k]], b: field[order[k + 1]] });
  return { seed, me, rounds: [first], out: null, champion: null };
}

export const winnerOf = (g: BracketGame): string | null => (g.score ? (g.score[0] > g.score[1] ? g.a : g.b) : null);

/** His game in the round being played, or null when he is out or it is over. */
export function myGame(b: Bracket): { round: number; game: BracketGame; home: boolean } | null {
  if (b.out !== null || b.champion) return null;
  const round = b.rounds.length - 1;
  const game = b.rounds[round].find((g) => !g.score && (g.a === b.me || g.b === b.me));
  return game ? { round, game, home: game.a === b.me } : null;
}

/** A game the engine plays by itself: the AI on both sides, the playoffs' four quarters. */
export function simGame(a: string, b: string, seed: number, oppOvr?: number): [number, number] {
  const s = startFloor(legendSetup({ seed, us: franchise(a, oppOvr), them: franchise(b, oppOvr), length: 'full' }));
  skipFloor(s);
  return [s.score[0], s.score[1]];
}

/**
 * The round moves on: his game's score goes in (his team's points first; none when he is out and
 * the rest is played out), every other game of the round is simulated, and the winners are paired
 * for the next. After the final the champion is named.
 */
export function playRound(b: Bracket, mine: [number, number] | null, oppOvr?: number): Bracket {
  const round = b.rounds.length - 1;
  const games = b.rounds[round].map((g, k) => {
    if (g.score) return g;
    if (mine && (g.a === b.me || g.b === b.me)) return { ...g, score: (g.a === b.me ? mine : [mine[1], mine[0]]) as [number, number] };
    return { ...g, score: simGame(g.a, g.b, b.seed + round * 97 + k * 13 + 1, oppOvr) };
  });
  const rounds = [...b.rounds.slice(0, round), games];
  const lost = games.some((g) => (g.a === b.me || g.b === b.me) && winnerOf(g) !== b.me);
  const out = b.out ?? (lost ? round : null);
  if (games.length === 1) return { ...b, rounds, out, champion: winnerOf(games[0]) };
  const nextRound: BracketGame[] = [];
  for (let k = 0; k < games.length; k += 2) nextRound.push({ a: winnerOf(games[k])!, b: winnerOf(games[k + 1])! });
  return { ...b, rounds: [...rounds, nextRound], out, champion: null };
}

/** The rest of a bracket he is out of, played to its champion. */
export function finishBracket(b: Bracket, oppOvr?: number): Bracket {
  let x = b;
  while (!x.champion) x = playRound(x, null, oppOvr);
  return x;
}
