// A made-up team for the Floor (round 39): five starters by position at a level and three off the
// bench, with seeded names. The dev deck's Floor lab and the engine's own measurements
// (scripts/floorStats.ts) build their teams here; the Floor's own game plays the legends
// (legends.ts, game.ts), a career's games its real rosters (career.ts).

import { FLOOR, FLOOR_MINI } from '../balance';
import { clamp, int, makeRng } from '../rng';
import { ovrOf } from '../player/ovr';
import { teamById } from '../career/common';
import type { GameState, Pos } from '../types';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { floorSetup, hisRatings, leanRatings } from './career';
import type { FloorPlayerIn, FloorRatings, FloorSetup } from './sim';

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

// ---------------- his own player, from a career's mini-games ----------------
// (owner, after round 42: "i mean the user should be able to play the floor with their own character")

/** A career whose player is on an NBA team with a roster: he plays on it, against a team he picks. */
export const onNbaTeam = (s: GameState): boolean => s.stage === 'NBA' && !!teamById(s.nba, s.teamId)?.roster.length;

interface TeamLook {
  name: string;
  short: string;
  color: string;
}

/**
 * A quick game (the fourth quarter, from a close score) as the career's own player, with his own
 * ratings. On an NBA team (`oppId`): his team's real roster against the other's, split by the two
 * teams' strengths as a playoff game on the Floor is. Anywhere else (`us` and `them`, the colours
 * picked): he takes his spot on a team made up at his own level, against another like it.
 */
export function ownSetup(s: GameState, o: { seed: number; oppId: string } | { seed: number; us: TeamLook; them: TeamLook }): FloorSetup {
  const rng = makeRng(o.seed ^ 0x5f10);
  const base = FLOOR_MINI.start + int(rng, -6, 6);
  const quarter = { mode: 'standard' as const, score: [base + int(rng, -3, 3), base] as [number, number], clock: FLOOR.quarter, quarter: 4 as const, rate: FLOOR.rate };
  if ('oppId' in o) {
    const mine = teamById(s.nba, s.teamId)!;
    const theirs = teamById(s.nba, o.oppId)!;
    return { ...floorSetup(s, { seed: o.seed, score: quarter.score, oppId: o.oppId, home: true, edge: (mine.strength - theirs.strength) * FLOOR.perStrength }), ...quarter };
  }
  const p = s.player;
  const level = clamp(Math.round(ovrOf(p.attrs, p.pos)), 40, 95);
  const me = { slot: SLOTS.indexOf(p.pos), name: p.name, number: p.number, r: hisRatings(s) };
  return { seed: o.seed, us: { ...o.us, players: floorRoster('U', level, o.seed + 3, me) }, them: { ...o.them, players: floorRoster('T', level, o.seed + 11) }, ...quarter };
}
