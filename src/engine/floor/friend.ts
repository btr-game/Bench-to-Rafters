// The Floor between two friends (after round 42, owner: "superteam draft against a friend: nice.
// let's expand friend play in general"): the superteam draft and the series, as rules both screens
// apply alike.
//
// The draft: one pool of every legend (ALL_LEGENDS, any position, no limits), twelve picks in a snake,
// host first: H F F H H F F H H F F H (six each: five starters and a sixth man off the bench; owner, "a
// sixth man for superteam drafts": yes). Whoever picks first gets the best man; the friend then has two in a
// row, and so on, so neither seat is the better one over the five rounds. A pick has PICK_SECONDS on its
// clock; when it runs out the best man left is taken for him. The two fives then play at their own
// level (not one level for both, as the franchise game does): both drafted from the same pool in turn,
// so any gap between them is what the drafting earned, and a level for both would make the draft count
// for little.
//
// A series: best of 1, 3 or 5; the first to win more than half takes it.

import type { LegendSpot } from '../../content/franchiseFives';
import type { Pos } from '../types';
import { ALL_LEGENDS } from './legends';

/** Who picks at each turn of the draft: 0 the host, 1 his friend. */
export const SNAKE: readonly (0 | 1)[] = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0];
export const PICK_SECONDS = 20;

/** A draft in a room: `n` tells one draft from the next, `picks` are places in ALL_LEGENDS, in order. */
export interface Draft {
  n: number;
  picks: number[];
}

export const newDraft = (n: number): Draft => ({ n, picks: [] });

/** Each side's picks: the first five start, the last comes off the bench. */
export const DRAFT_SIZE = 6;

/** Whose pick it is, or null once both have five. */
export const turnOf = (d: Draft): 0 | 1 | null => (d.picks.length < SNAKE.length ? SNAKE[d.picks.length] : null);

/** A side's legends, in the order he picked them. */
export const picksOf = (d: Draft, side: 0 | 1): LegendSpot[] => d.picks.filter((_, i) => SNAKE[i] === side).map((k) => ALL_LEGENDS[k].spot);

/** The draft with a pick made, or null when it is not his turn or that legend is gone. */
export function pickIn(d: Draft, side: 0 | 1, k: number): Draft | null {
  if (turnOf(d) !== side || !Number.isInteger(k) || k < 0 || k >= ALL_LEGENDS.length || d.picks.includes(k)) return null;
  return { ...d, picks: [...d.picks, k] };
}

const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

/** The pick made for him when his clock runs out: the best overall left; between equals, one at a
 * position he has nobody at yet; then the pool's own order. */
export function bestLeft(d: Draft, side: 0 | 1): number {
  const have = new Set(picksOf(d, side).map((l) => l.pos));
  let best = -1;
  let score = -Infinity;
  ALL_LEGENDS.forEach((x, k) => {
    if (d.picks.includes(k)) return;
    const s = x.spot.ovr * 2 + (have.has(x.spot.pos) ? 0 : 1);
    if (s > score) {
      score = s;
      best = k;
    }
  });
  return best;
}

function perms(n: number): number[][] {
  if (n <= 1) return [[0]].slice(0, n);
  return perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}
const ORDERS = perms(5).sort((a, b) => a.join('').localeCompare(b.join('')));

/** Five drafted legends put at PG, SG, SF, PF, C: each as near his own position as the five allows
 * (the fewest steps between position and slot, all told; between equals, the order he picked them). */
export function lineUp(five: LegendSpot[]): LegendSpot[] {
  if (five.length !== 5) return five;
  let best = ORDERS[0];
  let cost = Infinity;
  for (const o of ORDERS) {
    const c = o.reduce((a, who, slot) => a + Math.abs(POS.indexOf(five[who].pos) - slot), 0);
    if (c < cost) {
      cost = c;
      best = o;
    }
  }
  return best.map((who) => five[who]);
}

// ---------------- a series ----------------

export type Best = 1 | 3 | 5;
export const BESTS: Best[] = [1, 3, 5];

/** Games a side must win to take a best-of. */
export const toWin = (best: Best): number => Math.ceil(best / 2);

/** Who has taken the series, or null while it goes on. */
export const seriesWinner = (best: Best, wins: [number, number]): 0 | 1 | null => (wins[0] >= toWin(best) ? 0 : wins[1] >= toWin(best) ? 1 : null);
