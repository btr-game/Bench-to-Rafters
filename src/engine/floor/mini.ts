// A made-up team for the Floor (round 39): five starters by position at a level and three off the
// bench, with seeded names. The dev deck's Floor lab and the engine's own measurements
// (scripts/floorStats.ts) build their teams here; the Floor's own game plays the legends
// (legends.ts, game.ts), a career's games its real rosters (career.ts).

import { FLOOR_MINI } from '../balance';
import type { Pos } from '../types';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { leanRatings } from './career';
import type { FloorPlayerIn, FloorRatings } from './sim';

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
