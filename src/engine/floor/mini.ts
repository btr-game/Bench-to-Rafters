// The Floor as a mini-game (round 39, owner: "can we get rid of (archive) the front office minigame
// and replace it with this game?"): Front Office's place in every list, its unlock (basketball IQ 85)
// and its career bonus. From the start page: his team and the other one from the 30 NBA teams, how
// good both are, and which starter he steers. A career on an NBA team plays himself on his own team
// against the team he picks (its real rosters, split by the two teams' strengths as a playoff game
// is); any other career puts him in his spot on a team at the level picked. The last six minutes
// start close (a seeded draw) on the standard difficulty. The grade is the margin, with a little for
// his own line (balance.ts FLOOR_MINI). The dev deck's Floor lab builds its teams here too.

import { FLOOR, FLOOR_MINI } from '../balance';
import { clamp, int, makeRng } from '../rng';
import { ovrOf } from '../player/ovr';
import { teamById } from '../career/common';
import type { MiniResult } from '../career/miniBonus';
import type { GameState, Pos } from '../types';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { NBA_TEAMS } from '../../content/teams';
import { floorSetup, hisRatings, leanRatings } from './career';
import type { FloorBox, FloorPlayerIn, FloorRatings, FloorSetup, FloorState } from './sim';

/** How good both generated teams are (the start page's chips). */
export type FloorStrength = keyof typeof FLOOR_MINI.strength;
export const FLOOR_STRENGTHS = Object.keys(FLOOR_MINI.strength) as FloorStrength[];
export type FloorGrade = 'A' | 'B' | 'C' | 'D';

/** A generated team's spots: the five starters, then three off the bench. */
const SLOTS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C'];
const NUMBERS = [3, 11, 7, 32, 50, 1, 21, 44];

/** The starter's spot he takes: a generated player of the team, or his own (name, number, ratings). */
interface FloorMe {
  slot: number;
  name?: string;
  number?: number;
  r?: FloorRatings;
}

/**
 * A generated team for the Floor: five starters by position at `level` and three off the bench
 * below it, each a seeded few points either way, with made-up names. `me` marks the starter he
 * steers, or puts his own player in that spot.
 */
export function floorRoster(tag: string, level: number, seed: number, me?: FloorMe): FloorPlayerIn[] {
  let h = seed;
  const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const R = FLOOR_MINI.roster;
  return SLOTS.map((pos, i) => {
    const mine = me?.slot === i;
    const name = mine && me.name !== undefined ? me.name : `${FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)]}`;
    const r = mine && me.r ? me.r : leanRatings(level - (i >= 5 ? R.bench : 0), pos, Math.round((rnd() - 0.5) * R.wobble));
    return { id: `${tag}${i}`, name, pos, number: mine && me.number !== undefined ? me.number : NUMBERS[i], user: mine, r };
  });
}

/** The starter with the best overall rating at his position: who he steers unless he picks another. */
export function bestStarter(players: FloorPlayerIn[]): number {
  let best = 0;
  players.slice(0, 5).forEach((p, i) => {
    if (ovrOf(p.r, p.pos) > ovrOf(players[best].r, players[best].pos)) best = i;
  });
  return best;
}

/** The starter's spot for a position (his own, in a career off the NBA). */
const slotOf = (pos: Pos): number => SLOTS.indexOf(pos);

/** The score with six minutes left: close, from the game's seed. */
export function floorStart(seed: number): [number, number] {
  const rng = makeRng(seed ^ 0x5f10);
  const S = FLOOR_MINI.start;
  const base = S.base + int(rng, -S.spread, S.spread);
  return [base + int(rng, -S.gap, S.gap), base];
}

const teamName = (abbr: string) => {
  const t = NBA_TEAMS.find((x) => x.abbr === abbr)!;
  return { name: `${t.city} ${t.nick}`, short: t.abbr, color: t.color };
};

/** What the start page picks: the two teams (NBA abbreviations), how good they are, and his starter;
 * `seed` is the game's, `roster` the generated players' (so a rematch keeps them). */
interface FloorPick {
  seed: number;
  roster: number;
  us: string;
  them: string;
  strength: FloorStrength;
  slot: number;
}

/** A game on two generated teams; with a career off the NBA, `me` is his own player in his spot. */
export function floorMiniSetup(p: FloorPick, me?: { name: string; number: number; r: FloorRatings }): FloorSetup {
  const level = FLOOR_MINI.strength[p.strength];
  return {
    seed: p.seed,
    mode: 'standard',
    us: { ...teamName(p.us), players: floorRoster('U', level, p.roster + 3, { slot: p.slot, ...me }) },
    them: { ...teamName(p.them), players: floorRoster('T', level, p.roster + 11) },
    score: floorStart(p.seed),
    clock: FLOOR.from,
  };
}

/** His own career's ratings and spot, for a team at the level picked. */
export const careerMe = (s: GameState) => ({ name: s.player.name, number: s.player.number, r: hisRatings(s), slot: slotOf(s.player.pos) });

/** A career whose player is on an NBA team: he plays himself on it. */
export const onNbaTeam = (s: GameState | null): boolean => !!s && s.stage === 'NBA' && !!teamById(s.nba, s.teamId)?.roster.length;

/** A game on his own NBA team against `oppId`: the real rosters, split by the two teams' strengths. */
export function floorCareerSetup(s: GameState, oppId: string, seed: number): FloorSetup {
  const mine = teamById(s.nba, s.teamId)!;
  const theirs = teamById(s.nba, oppId)!;
  const edge = (mine.strength - theirs.strength) * FLOOR.perStrength;
  return { ...floorSetup(s, { seed, score: floorStart(seed), oppId, home: true, edge }), mode: 'standard' };
}

/** His line as one number, game-score style (FLOOR_MINI.line). */
export function floorLineScore(b: FloorBox): number {
  const L = FLOOR_MINI.line;
  return b.pts * L.pts + b.reb * L.reb + b.ast * L.ast + b.stl * L.stl + b.blk * L.blk + b.tov * L.tov;
}

/** The grade: the margin and his line's share; a win is a B at least, a loss a C at most. */
export function floorGrade(us: number, them: number, line: FloorBox): { grade: FloorGrade; share: number } {
  const G = FLOOR_MINI;
  const share = Math.round(clamp(floorLineScore(line) * G.perLine, -G.cap, G.cap) * 10) / 10;
  const v = us - them + share;
  const grade: FloorGrade = us > them ? (v >= G.grade.A ? 'A' : 'B') : v >= G.grade.C ? 'C' : 'D';
  return { grade, share };
}

/** A finished game as the mini-games keep it: the grade, the margin, his points, the lowest the
 * margin went, and the strength (or 'team': his own NBA team in a career). */
export function floorMiniResult(r: { us: number; them: number; line: FloorBox; marks: FloorState['marks'] }, strength: FloorStrength | 'team'): Extract<MiniResult, { game: 'floor' }> {
  return { game: 'floor', grade: floorGrade(r.us, r.them, r.line).grade, margin: r.us - r.them, pts: r.line.pts, low: Math.min(r.marks.low, r.us - r.them), strength };
}
