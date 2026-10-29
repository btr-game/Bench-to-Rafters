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
  { id: '360', name: '360', diff: 3 },
  { id: 'legs', name: 'Between the legs', diff: 4 },
  { id: 'back', name: 'Behind the back', diff: 4 },
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
  zoneBase: 0.3,
  zoneAth: 0.006, // per point of athleticism above 80
  zoneDiff: 0.035, // per point of the part's difficulty
  zoneMin: 0.08,
  sweepMs: 1150,
  sweepDiff: 35, // faster per point of the dunk's difficulty
  base: 30,
  perDiff: 1.6,
  clean: 7, // for perfect timing on every tap
  fresh: 0.6, // for each part not used yet in the contest
  freshMax: 2,
  retry: 2.5, // off for each failed attempt before it
  bail: 28, // three misses: a safe dunk, booed
};

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
  const zone = (diff: number) => clamp(DUNK.zoneBase + (ath - 80) * DUNK.zoneAth - diff * DUNK.zoneDiff, DUNK.zoneMin, 0.45);
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

export const sweepFor = (d: DunkDesign): number => Math.max(550, DUNK.sweepMs - dunkDifficulty(d) * DUNK.sweepDiff);

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

/** Parts used in earlier dunks don't wow the judges twice. */
export function freshParts(d: DunkDesign, used: string[]): number {
  return dunkParts(d).filter((p) => p.diff > 0 && !used.includes(p.id)).length;
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
  const judges = Array.from({ length: 5 }, () => Math.round(clamp(raw / 5 + normal(r, 0, 0.45), 6, 10)));
  return { judges, total: judges.reduce((a, b) => a + b, 0), name, made };
}

export interface Dunker {
  name: string;
  skill: number; // a typical dunk's score
  me?: boolean;
}

export const DUNKERS: Dunker[] = [
  { name: 'Vince Carter', skill: 48 },
  { name: 'Zach LaVine', skill: 47.5 },
  { name: 'Aaron Gordon', skill: 47 },
  { name: 'Michael Jordan', skill: 47 },
  { name: 'Dominique Wilkins', skill: 46.5 },
  { name: 'Mac McClung', skill: 46 },
  { name: 'Jason Richardson', skill: 45.5 },
  { name: 'Julius Erving', skill: 45 },
  { name: 'Spud Webb', skill: 44.5 },
  { name: 'Nate Robinson', skill: 44.5 },
  { name: 'Blake Griffin', skill: 44 },
  { name: 'Dwight Howard', skill: 43.5 },
];

/** A simulated dunk for one of the others: a design that fits his skill, and the judges' cards. */
export function simDunk(r: Rng, d: Dunker): DunkScore {
  const moves = shuffle(r, MOVES.filter((m) => m.diff >= (d.skill >= 46 ? 2 : 1))).slice(0, next(r) < 0.5 ? 2 : 1).map((m) => m.id);
  const design: DunkDesign = { takeoff: pick(r, TAKEOFFS).id, moves, prop: pick(r, PROPS).id };
  if (next(r) < 0.06) return bailOut(r);
  return panel(r, normal(r, d.skill, 2.6), dunkName(design), true);
}

export const contestRng = (seed: number): Rng => makeRng(seed);
