// The house players (round 27, owner: "the community page is too blank now. can you fill the
// leaderboard and statue plaza with some dummies", then "the dummies should have very low stats so
// that the users can quickly dominate"): small careers the game played itself under made-up names
// (scripts/house.ts writes them to content/house.json). They sit at the foot of the boards and in
// the plaza beside real careers, always marked as house players, and are never posted anywhere.

import HOUSE from '../content/house.json';
import type { CareerRecord } from '../engine/career/record';
import type { Mode } from '../engine/balance';
import { scoreOf, type ScoreRow, type StatueRow } from './community';
import { todayKey } from '../engine/mini/daily';

const RECS = HOUSE as unknown as CareerRecord[];

/** A small stable number from a string (which house players are out today, their respects). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** House rows for a board: all of a difficulty's for all time; four of them, changing daily, for today. */
export function houseScores(mode: Mode, scope: 'day' | 'all'): ScoreRow[] {
  const day = todayKey();
  let recs = RECS.filter((r) => r.mode === mode);
  if (scope === 'day') recs = [...recs].sort((a, b) => hash(day + a.id) - hash(day + b.id)).slice(0, 4);
  return recs.map((rec) => ({ id: rec.id, mode, day, score: scoreOf(rec), rec, mine: false, house: true }));
}

/** House statues: a few small bronze ones, so the plaza is not bare. Their respects are made up and fixed. */
export function houseStatues(): StatueRow[] {
  return RECS.filter((r) => r.id.startsWith('house-statue')).map((rec) => ({ id: rec.id, rec, metal: 'bronze', respects: 1 + (hash(rec.id) % 6), paid: false, mine: false, house: true }));
}
