// The Floor in a career (round 39, step 5): which game, the two teams on the court, and how its
// result comes back into the postseason. The postseason is replayed from a snapshot with the
// player's picks (career/live.ts), so the Floor's result travels as a pick: "floor@" and the final
// score, his line and the marks for the book; "auto" lets the engine play the last six minutes
// itself (Skip from the start, sim mode's "simulate it", a phone, the balance harness).

import { FLOOR } from '../balance';
import { clamp } from '../rng';
import { touchOf } from '../player/touch';
import { ovrOf } from '../player/ovr';
import { teamById } from '../career/common';
import { fiveOf } from '../career/roster';
import type { GameState, GenPlayer, Pos, Team } from '../types';
import { floorResult, skipFloor, startFloor, type FloorBox, type FloorPlayerIn, type FloorRatings, type FloorSetup, type FloorState } from './sim';

/** What the postseason hands the Floor: the score after 42 minutes, the other team, the seed, and
 * the gap between the two teams in Floor rating points (his team's side; FLOOR.perStrength). */
export interface FloorTake {
  seed: number;
  score: [number, number];
  oppId: string;
  home: boolean;
  edge: number;
}

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
/** How each position leans from a player's overall rating. */
const LEAN: Record<Pos, Partial<FloorRatings>> = {
  PG: { SHT: 3, PLY: 9, PER: 3, INT: -10, REB: -12, ATH: 2, IQ: 3, FIN: -2 },
  SG: { SHT: 6, PLY: 2, PER: 2, INT: -8, REB: -8, ATH: 2 },
  SF: { SHT: 1, PLY: -2, PER: 2, INT: -2, REB: -2, ATH: 3, FIN: 2 },
  PF: { SHT: -5, PLY: -6, PER: -4, INT: 6, REB: 8, FIN: 4 },
  C: { SHT: -12, PLY: -10, PER: -8, INT: 10, REB: 12, FIN: 6, ATH: -2 },
};
const KEYS: (keyof FloorRatings)[] = ['SHT', 'FIN', 'PLY', 'PER', 'INT', 'REB', 'ATH', 'IQ', 'FT'];

/** A player's Floor ratings from his overall and his position (free throws lean like his jumper). */
export function leanRatings(ovr: number, pos: Pos, wobble = 0): FloorRatings {
  const r = {} as FloorRatings;
  for (const k of KEYS) r[k] = clamp(Math.round(ovr + (LEAN[pos][k === 'FT' ? 'SHT' : k] ?? 0) + wobble), 25, 99);
  return r;
}

/** A player on his way to the court: his level (his overall), and his ratings at a given shift. */
interface Pick {
  ovr: number;
  make: (shift: number) => FloorPlayerIn;
}

const gen = (p: GenPlayer, tag: string, pos: Pos = p.pos): Pick => ({ ovr: p.ovr, make: (d) => ({ id: `${tag}${p.id}`, name: p.name, pos, number: (p.id % 54) + 1, r: leanRatings(p.ovr + d, pos) }) });

/** A team's five by position (the best at each, any player for a hole), then its next three. */
function lineup(t: Team, tag: string): Pick[] {
  const left = [...t.roster].sort((a, b) => b.ovr - a.ovr);
  const five = POS.map((slot) => {
    const i = left.findIndex((p) => p.pos === slot);
    const p = left.splice(i >= 0 ? i : 0, 1)[0];
    return p ? gen(p, tag, slot) : null;
  }).filter((x): x is Pick => !!x);
  return [...five, ...left.slice(0, 3).map((p) => gen(p, tag))];
}

/** His own Floor ratings: his attributes, and his free-throw touch (50 is an average shooter at the line). */
export function hisRatings(s: GameState, shift = 0): FloorRatings {
  const a = s.player.attrs;
  const r = (v: number) => clamp(Math.round(v + shift), 25, 99);
  return { SHT: r(a.SHT), FIN: r(a.FIN), PLY: r(a.PLY), PER: r(a.PER), INT: r(a.INT), REB: r(a.REB), ATH: r(a.ATH), IQ: r(a.IQ), FT: clamp(Math.round(30 + touchOf(s.player) * 0.65), 25, 99) };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/**
 * The two teams for the Floor: his starting five (him in his spot) and three off the bench, theirs
 * the same. Each side keeps its own shape (a star stands out from his teammates), but both are
 * centred on the two starting fives' midpoint and split by the career's gap between the teams
 * (take.edge), so the Floor plays the game the season's model expects: coaching, chemistry and form
 * live in the team strengths, not in the rosters.
 */
export function floorSetup(s: GameState, take: FloorTake): FloorSetup {
  const mine = teamById(s.nba, s.teamId)!;
  const theirs = teamById(s.nba, take.oppId)!;
  const p = s.player;
  const five = fiveOf(mine.roster, p.pos);
  const me: Pick = { ovr: ovrOf(p.attrs, p.pos), make: (d) => ({ id: 'me', name: p.name, pos: p.pos, number: p.number, user: true, r: hisRatings(s, d) }) };
  const starters = POS.map((slot) => {
    if (slot === p.pos) return me;
    const x = five.find((f) => f.slot === slot);
    return x ? gen(x.p, 'u', slot) : null;
  }).filter((x): x is Pick => !!x);
  const used = new Set(five.map((x) => x.p.id));
  const bench = [...mine.roster].filter((q) => !used.has(q.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 3).map((q) => gen(q, 'u'));
  const ours = [...starters, ...bench];
  const them = lineup(theirs, 't');
  const lv = [mean(starters.map((x) => x.ovr)), mean(them.slice(0, 5).map((x) => x.ovr))];
  const mid = (lv[0] + lv[1]) / 2;
  const edge = take.edge ?? 0;
  const shift = [mid + edge / 2 - lv[0], mid - edge / 2 - lv[1]];
  return {
    seed: take.seed,
    mode: s.mode,
    us: { name: mine.name, short: mine.short, color: mine.color, players: ours.map((x) => x.make(shift[0])) },
    them: { name: theirs.name, short: theirs.short, color: theirs.color, players: them.map((x) => x.make(shift[1])) },
    score: take.score,
    clock: FLOOR.from,
  };
}

/** What comes back from the Floor: the final score, his line and the marks. */
interface FloorDone {
  us: number;
  them: number;
  line: FloorBox;
  marks: FloorState['marks'];
}

const LINE_KEYS: (keyof FloorBox)[] = ['pts', 'reb', 'ast', 'stl', 'blk', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'tov', 'pf'];

/** The pick that carries a played Floor back into the postseason. */
export function floorPick(r: { us: number; them: number; line: FloorBox; marks: FloorState['marks'] }): string {
  const m = r.marks;
  return `floor@${r.us}|${r.them}|${LINE_KEYS.map((k) => r.line[k]).join(',')}|${m.low},${m.winner ? 1 : 0},${m.stop ? 1 : 0}`;
}

/** The result a pick carries; "auto" (or anything else) has the engine play the six minutes itself. */
export function floorDone(s: GameState, take: FloorTake, pick: string): FloorDone {
  const m = /^floor@(\d+)\|(\d+)\|([\d,]+)\|(-?\d+),([01]),([01])$/.exec(pick);
  if (m) {
    const nums = m[3].split(',').map(Number);
    const line = Object.fromEntries(LINE_KEYS.map((k, i) => [k, nums[i] ?? 0])) as unknown as FloorBox;
    return { us: Number(m[1]), them: Number(m[2]), line, marks: { low: Number(m[4]), winner: m[5] === '1', stop: m[6] === '1' } };
  }
  // the engine plays both sides evenly: the difficulty's shooting edge is for a game he plays
  const st = startFloor({ ...floorSetup(s, take), mode: 'standard' });
  skipFloor(st);
  const r = floorResult(st);
  return { us: r.us, them: r.them, line: r.line, marks: r.marks };
}
