// The dunk contest (round 12). Four dunkers, two dunks each in the first round, the top two
// go to the final for two more. The player designs every dunk:
// - a takeoff (standing, running, from the free-throw line),
// - one or two moves (tomahawk, windmill, 360, between the legs...),
// - and maybe a prop (a lob, off the glass, over a teammate).
// Each part is one timing tap: stop the marker in the green. Harder parts have a narrower
// green, harder dunks sweep faster, and athleticism widens every green. Miss a tap and the
// attempt fails; three attempts a dunk, and a dunk made on a later try scores a little less.
// Five judges score 6-10 each (50 is perfect): difficulty, clean timing and creativity (parts
// you haven't used yet in the contest).
// Round 24 (owner: "too easy", and "let's try not to get overlaps in moves"): narrower greens, a
// faster sweep and stricter cards, and a move he has landed once is gone for the rest of the
// contest (takeoffs and props can repeat). Three more moves keep four dunks' worth of choice.
// The other three dunkers are simulated from their skill.

import { clamp, makeRng, next, normal, pick, shuffle, type Rng } from '../rng';

export interface DunkPart {
  id: string;
  name: string;
  diff: number;
}

export const TAKEOFFS: DunkPart[] = [
  { id: 'stand', name: 'Standing', diff: 0 },
  { id: 'run', name: 'Running start', diff: 1 },
  { id: 'ft', name: 'From the free-throw line', diff: 3 },
];
export const MOVES: DunkPart[] = [
  { id: 'two', name: 'Two-hand slam', diff: 1 },
  { id: 'tomahawk', name: 'Tomahawk', diff: 1 },
  { id: 'reverse', name: 'Reverse', diff: 2 },
  { id: 'windmill', name: 'Windmill', diff: 2 },
  { id: 'pump', name: 'Double pump', diff: 2 },
  { id: '360', name: '360', diff: 3 },
  { id: 'cradle', name: 'Rock the cradle', diff: 3 },
  { id: 'legs', name: 'Between the legs', diff: 4 },
  { id: 'back', name: 'Behind the back', diff: 4 },
  { id: 'scorpion', name: 'Scorpion', diff: 5 },
];
export const PROPS: DunkPart[] = [
  { id: 'none', name: 'No prop', diff: 0 },
  { id: 'glass', name: 'Off the backboard', diff: 1 },
  { id: 'lob', name: 'Lob from a teammate', diff: 1 },
  { id: 'over', name: 'Over a teammate', diff: 2 },
];

export const DUNK = {
  attempts: 3,
  maxMoves: 2,
  zoneBase: 0.31,
  zoneAth: 0.005, // per point of athleticism above 80
  zoneDiff: 0.032, // per point of the part's difficulty
  zoneMin: 0.11,
  sweepMs: 1150,
  sweepDiff: 34, // faster per point of the dunk's difficulty
  sweepMin: 520,
  base: 30,
  perDiff: 1.2,
  clean: 12, // for perfect timing on every tap
  fresh: 0.6, // for each takeoff or prop not used yet in the contest (moves are always new now)
  freshMax: 1.2,
  retry: 2.5, // off for each failed attempt before it
  bail: 28, // three misses: a safe dunk, booed
  // round 12b ("easier to land, but make the boundaries high for a 9 and 10"): each judge's card
  // comes from the dunk's raw score plus his own taste; round 24 raised every step by one:
  // 7 from 35, 8 from 41, 9 from 47, 10 from 53
  cards: [35, 41, 47, 53],
  taste: 1.6,
};

/** The moves still his to show: one he has landed in this contest is gone. */
export const movesLeft = (used: string[]): DunkPart[] => MOVES.filter((m) => !used.includes(m.id));

export interface DunkDesign {
  takeoff: string;
  moves: string[];
  prop: string;
}

const part = (list: DunkPart[], id: string): DunkPart => list.find((p) => p.id === id) ?? list[0];

export function dunkParts(d: DunkDesign): DunkPart[] {
  return [part(TAKEOFFS, d.takeoff), part(PROPS, d.prop), ...d.moves.map((m) => part(MOVES, m))];
}

export const dunkDifficulty = (d: DunkDesign): number => dunkParts(d).reduce((a, p) => a + p.diff, 0);

export function dunkName(d: DunkDesign): string {
  const moves = d.moves.map((m) => part(MOVES, m).name);
  const t = part(TAKEOFFS, d.takeoff);
  const p = part(PROPS, d.prop);
  return [moves.join(' into a ') || 'Two-hand slam', t.id !== 'stand' ? t.name.toLowerCase() : '', p.id !== 'none' ? p.name.toLowerCase() : ''].filter(Boolean).join(', ');
}

export const difficultyLabel = (d: number): string => (d <= 3 ? 'Easy' : d <= 6 ? 'Medium' : d <= 9 ? 'Hard' : 'Insane');

/** The timing taps for a dunk: one per part with any difficulty, plus the finish. */
export interface DunkTap {
  label: string;
  zone: number; // width of the green, 0-1
  centre: number;
}

export function dunkTaps(r: Rng, d: DunkDesign, ath: number): DunkTap[] {
  const zone = (diff: number) => clamp(DUNK.zoneBase + (ath - 80) * DUNK.zoneAth - diff * DUNK.zoneDiff, DUNK.zoneMin, 0.5);
  const taps: DunkTap[] = [];
  const t = part(TAKEOFFS, d.takeoff);
  const p = part(PROPS, d.prop);
  if (t.diff > 0) taps.push({ label: t.id === 'ft' ? 'Plant at the line' : 'Gather', zone: zone(t.diff), centre: 0.5 });
  if (p.diff > 0) taps.push({ label: p.id === 'over' ? 'Clear the teammate' : p.id === 'lob' ? 'Catch the lob' : 'Catch it off the glass', zone: zone(p.diff), centre: 0.3 + next(r) * 0.4 });
  for (const m of d.moves) {
    const mv = part(MOVES, m);
    taps.push({ label: mv.name, zone: zone(mv.diff), centre: 0.3 + next(r) * 0.4 });
  }
  taps.push({ label: 'Finish', zone: zone(0), centre: 0.3 + next(r) * 0.4 });
  return taps;
}

export const sweepFor = (d: DunkDesign): number => Math.max(DUNK.sweepMin, DUNK.sweepMs - dunkDifficulty(d) * DUNK.sweepDiff);

/** How clean a tap was: 1 dead centre, 0 at the edge of the green, null outside it. */
export function tapQuality(pos: number, tap: DunkTap): number | null {
  const off = Math.abs(pos - tap.centre);
  return off > tap.zone / 2 ? null : 1 - off / (tap.zone / 2);
}

export interface DunkScore {
  judges: number[];
  total: number;
  name: string;
  made: boolean;
}

/** A takeoff or prop used in an earlier dunk doesn't wow the judges twice (moves never repeat). */
export function freshParts(d: DunkDesign, used: string[]): number {
  return [part(TAKEOFFS, d.takeoff), part(PROPS, d.prop)].filter((p) => p.diff > 0 && !used.includes(p.id)).length;
}

export function judge(r: Rng, d: DunkDesign, quality: number[], attempt: number, used: string[]): DunkScore {
  const avg = quality.reduce((a, b) => a + b, 0) / Math.max(1, quality.length);
  const raw = DUNK.base + dunkDifficulty(d) * DUNK.perDiff + avg * DUNK.clean + Math.min(DUNK.freshMax, freshParts(d, used) * DUNK.fresh) - (attempt - 1) * DUNK.retry;
  return panel(r, raw, dunkName(d), true);
}

export function bailOut(r: Rng): DunkScore {
  return panel(r, DUNK.bail, 'Two-hand slam after three misses', false);
}

function panel(r: Rng, raw: number, name: string, made: boolean): DunkScore {
  const judges = Array.from({ length: 5 }, () => {
    const x = raw + normal(r, 0, DUNK.taste);
    return 6 + DUNK.cards.filter((c) => x >= c).length;
  });
  return { judges, total: judges.reduce((a, b) => a + b, 0), name, made };
}

export interface Dunker {
  name: string;
  skill: number; // a typical dunk's raw score (the judges' cards come from it); round 24: two points up
  me?: boolean;
}

export const DUNKERS: Dunker[] = [
  { name: 'Vince Carter', skill: 51.5 },
  { name: 'Zach LaVine', skill: 51 },
  { name: 'Aaron Gordon', skill: 50.5 },
  { name: 'Michael Jordan', skill: 50.5 },
  { name: 'Dominique Wilkins', skill: 50 },
  { name: 'Mac McClung', skill: 49.5 },
  { name: 'Jason Richardson', skill: 49 },
  { name: 'Julius Erving', skill: 48.5 },
  { name: 'Spud Webb', skill: 48 },
  { name: 'Nate Robinson', skill: 48 },
  { name: 'Blake Griffin', skill: 47.5 },
  { name: 'Dwight Howard', skill: 47 },
];

/** A round of simulated dunks for one of the others: designs that fit his skill, never the same move twice. */
export function simDunks(r: Rng, d: Dunker, n: number, used: string[] = []): DunkScore[] {
  return Array.from({ length: n }, () => {
    const pool = movesLeft(used).filter((m) => m.diff >= (d.skill >= 46 ? 2 : 1));
    const moves = shuffle(r, pool.length ? pool : movesLeft(used)).slice(0, next(r) < 0.5 ? 2 : 1).map((m) => m.id);
    used.push(...moves);
    const design: DunkDesign = { takeoff: pick(r, TAKEOFFS).id, moves, prop: pick(r, PROPS).id };
    if (next(r) < 0.06) return bailOut(r);
    return panel(r, normal(r, d.skill, 2.6), dunkName(design), true);
  });
}

export const contestRng = (seed: number): Rng => makeRng(seed);
