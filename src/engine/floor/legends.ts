// The Floor's legends (round 42, owner: "be able to play as legends of each team (see the list of
// legend showdown and make their stats line up with their real stats)"): every franchise's all-time
// five (content/franchiseFives.ts) as Floor players. Each rating comes from his real career numbers
// (content/legendStats.ts): shooting from his threes and free throws, finishing from his field-goal
// percentage and scoring, playmaking from assists, rebounding from rebounds, perimeter defence from
// steals, interior defence from blocks, athleticism as the table judges it, free throws from his
// percentage at the line. The seven besides athleticism then move together so his overall is the
// one the franchise five gives him. How he plays (FloorStyle) comes from the same numbers: his
// share of the shots from his scoring, threes from his attempts, the post from his position and
// scoring, passing from his assists. A team can then be played at its real level or at any overall
// the player picks, each side on its own.

import { OVR_WEIGHTS } from '../balance';
import { clamp } from '../rng';
import { ovrOf } from '../player/ovr';
import type { Pos } from '../types';
import { FRANCHISE_FIVES, type LegendSpot } from '../../content/franchiseFives';
import { LEGEND_STATS, type LegendStatRow } from '../../content/legendStats';
import { LEGEND_NUMBERS } from '../../content/legendNumbers';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { leanRatings } from './career';
import type { FloorPlayerIn, FloorRatings, FloorStyle } from './sim';

const GUARD = (pos: Pos) => pos === 'PG' || pos === 'SG';
const BIG = (pos: Pos) => pos === 'PF' || pos === 'C';
/** Steals and blocks a game for a career before they were counted (1973-74), by position. */
const OLD_STL: Record<Pos, number> = { PG: 1.5, SG: 1.3, SF: 1.1, PF: 0.9, C: 0.8 };
const OLD_BLK: Record<Pos, number> = { PG: 0.2, SG: 0.3, SF: 0.5, PF: 1.1, C: 2 };
const PLY_POS: Record<Pos, number> = { PG: 6, SG: 3, SF: 1, PF: -1, C: -3 };
const INT_POS: Record<Pos, number> = { PG: -5, SG: -3, SF: 0, PF: 3, C: 6 };
const POST_POS: Record<Pos, number> = { PG: 0, SG: 0.12, SF: 0.2, PF: 0.7, C: 1 };

/** His real line, or null for a name the table does not have. */
export const legendLine = (name: string): LegendStatRow | null => LEGEND_STATS[name] ?? null;

/** The three he would shoot now, as a percentage: his own where he shot enough of them, his touch
 * at the line where he did not (or played before the line). */
function threeOf(row: LegendStatRow): number {
  const [, , , , , , tp, tpa, ft] = row;
  const touch = 33 + (ft - 75) * 0.35;
  const sure = tp === null ? 0 : clamp(tpa / 3, 0, 1);
  return sure * (tp ?? 0) + (1 - sure) * touch;
}

/** A legend's ratings before they are moved to his overall. */
function rawRatings(l: LegendSpot, row: LegendStatRow): FloorRatings {
  const [ppg, rpg, apg, spg, bpg, fg, , tpa, ft, ath] = row;
  const stl = spg ?? OLD_STL[l.pos] + (l.tag === 'defense' ? 0.5 : 0);
  const blk = bpg ?? OLD_BLK[l.pos] * (l.tag === 'defense' && BIG(l.pos) ? 2 : 1);
  const scorer = (ppg - 15) * (GUARD(l.pos) || l.pos === 'SF' ? 0.5 : l.pos === 'PF' ? 0.25 : 0.1);
  return {
    SHT: 70 + (threeOf(row) - 35) * 2.2 + Math.min(tpa, 8) * 0.9 + (ft - 75) * 0.15 + scorer + (l.tag === 'shooter' ? 4 : 0),
    FIN: 62 + (fg - 45) * 1.4 + (ppg - 12) * 0.7 + (ath - 75) * 0.12,
    PLY: 50 + apg * 4 + PLY_POS[l.pos] + (l.tag === 'creator' ? 3 : 0),
    PER: 55 + stl * 14 + (ath - 75) * 0.1 + (l.tag === 'defense' ? 6 : 0),
    INT: 45 + blk * 11 + rpg * 1.2 + INT_POS[l.pos] + (l.tag === 'defense' && BIG(l.pos) ? 4 : 0),
    REB: 38 + 62 * (1 - Math.exp(-rpg / 9)),
    ATH: ath,
    IQ: 62 + (l.ovr - 80) * 1.2 + apg * 0.8 + (l.tag === 'creator' ? 3 : 0),
    // the Floor's line makes 50% at 0 and 95% at 100
    FT: ((ft - 50) / 45) * 100,
  };
}

const MOVED: (keyof FloorRatings)[] = ['SHT', 'FIN', 'PLY', 'PER', 'INT', 'REB', 'IQ'];
const fit = (r: FloorRatings): FloorRatings => ({ ...r, SHT: clamp(r.SHT, 25, 99), FIN: clamp(r.FIN, 25, 99), PLY: clamp(r.PLY, 25, 99), PER: clamp(r.PER, 25, 99), INT: clamp(r.INT, 25, 99), REB: clamp(r.REB, 25, 99), ATH: clamp(r.ATH, 25, 99), IQ: clamp(r.IQ, 25, 99), FT: clamp(r.FT, 0, 99) });

/** Ratings moved so the overall at `pos` is `ovr`: everything but his legs and his free throws
 * moves together (a rating at its limit leaves the rest to move further). */
function toOvr(r: FloorRatings, pos: Pos, ovr: number): FloorRatings {
  let out = fit(r);
  for (let k = 0; k < 12; k++) {
    const gap = Math.min(99, ovr) - ovrOf(out, pos);
    if (Math.abs(gap) < 0.02) break;
    const free = MOVED.filter((a) => (gap > 0 ? out[a] < 99 : out[a] > 25));
    const w = free.reduce((x, a) => x + OVR_WEIGHTS[pos][a as keyof (typeof OVR_WEIGHTS)[Pos]], 0);
    if (w <= 0) break;
    const next = { ...out };
    for (const a of free) next[a] = out[a] + gap / w;
    out = fit(next);
  }
  return out;
}

/** The Floor's level for an overall on the legends' list. A 99 there, taken as it is, would need a
 * 99 in everything (Curry's interior defence too) and no legend would play like himself, so the
 * list's 80 to 99 is played as 75 to 89.25: three quarters of the way from 60. The page still
 * shows the list's number. */
export const floorLevel = (ovr: number): number => 60 + (ovr - 60) * 0.75;

/** A legend's ratings at his own overall, or shifted by `shift` points of overall. */
export function legendRatings(l: LegendSpot, shift = 0): FloorRatings {
  const row = legendLine(l.name);
  if (!row) return leanRatings(floorLevel(l.ovr + shift), l.pos);
  const r = toOvr(rawRatings(l, row), l.pos, floorLevel(clamp(l.ovr + shift, 40, 99)));
  // a team played well under its level loses a step too
  return shift < 0 ? { ...r, ATH: clamp(r.ATH + shift * 0.5, 25, 99) } : r;
}

/** How a legend plays, from the same numbers. */
export function legendStyle(l: LegendSpot): FloorStyle {
  const row = legendLine(l.name);
  if (!row) return { use: 1, three: 1, drive: 1, post: POST_POS[l.pos] * 0.6, pass: 1 };
  const [ppg, , apg, , , , tp, tpa, , ath] = row;
  const three = tp === null || tpa < 0.3 ? (BIG(l.pos) ? 0 : 0.3) : clamp(tpa / 3, 0.15, 1.9);
  return {
    use: clamp(ppg / 18, 0.45, 1.8),
    three,
    drive: clamp((0.5 + (ath - 70) / 40 + (l.tag === 'scorer' || l.tag === 'creator' ? 0.2 : 0) - (three > 1.2 ? 0.2 : 0)) * (l.pos === 'C' ? 0.6 : 1), 0.3, 1.8),
    post: clamp(POST_POS[l.pos] * clamp(ppg / 16, 0.4, 1.6) * (1 - 0.4 * Math.min(1, three)) + (l.tag === 'inside' ? 0.15 : 0), 0, 1.6),
    pass: clamp(0.5 + apg / 6 - ppg / 60, 0.4, 2),
  };
}

/** A franchise's five, and how good they are together (the mean of their overalls). */
export const legendFive = (abbr: string): LegendSpot[] => FRANCHISE_FIVES[abbr] ?? [];
export const fiveOvr = (five: LegendSpot[]): number => five.reduce((a, l) => a + l.ovr, 0) / Math.max(1, five.length);

/** Every legend, with his franchise (the draft's pool). */
export const ALL_LEGENDS: { team: string; spot: LegendSpot }[] = Object.entries(FRANCHISE_FIVES).flatMap(([team, five]) => five.map((spot) => ({ team, spot })));

const BENCH: Pos[] = ['PG', 'SF', 'C'];
const BENCH_NUMBERS = [1, 21, 44];
const SLOTS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

/**
 * A team for the Floor from five legends (one for each position, in order): the five at `ovr` as a
 * team (their own level when not given: each keeps his distance from the team's mean), then three
 * made-up men off the bench, `gap` points under the team. `user` is the starter a person steers.
 */
export function legendTeam(tag: string, five: LegendSpot[], opts: { ovr?: number; user?: number; seed?: number; gap?: number } = {}): FloorPlayerIn[] {
  const real = fiveOvr(five);
  const level = opts.ovr ?? real;
  const shift = level - real;
  let h = (opts.seed ?? 1) >>> 0;
  const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const used = new Set<number>();
  const starters: FloorPlayerIn[] = five.map((l, i) => {
    let number = LEGEND_NUMBERS[l.name] ?? 4 + i * 7;
    while (used.has(number)) number = (number + 1) % 100;
    used.add(number);
    return { id: `${tag}${i}`, name: l.name, pos: SLOTS[i] ?? l.pos, number, r: legendRatings({ ...l, pos: SLOTS[i] ?? l.pos }, shift), style: legendStyle(l), user: opts.user === i };
  });
  const bench: FloorPlayerIn[] = BENCH.map((pos, k) => {
    let number = BENCH_NUMBERS[k];
    while (used.has(number)) number = (number + 1) % 100;
    used.add(number);
    return { id: `${tag}${5 + k}`, name: `${FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)]}`, pos, number, r: leanRatings(floorLevel(level - (opts.gap ?? 9)), pos, Math.round((rnd() - 0.5) * 4)) };
  });
  return [...starters, ...bench];
}
