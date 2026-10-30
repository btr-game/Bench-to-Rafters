// Lockdown (round 24, owner: "a rhythm game with two buttons, block and steal (A, S); diverse
// patterns, at least 10, in random order; 30 seconds to a minute; at least one press every 3
// seconds; long notes are fine; it contributes to defense").
// The offense runs its sets to the beat; each set is a pattern of notes in two lanes: Block (A)
// and Steal (S). Tap a note as it reaches the line; a long note is held until it ends (stay in
// front, wall up the post). A run strings sets together at random, easier ones first, sometimes
// mirrored, with nothing silent for long. The grade pays perimeter and interior defense.

import { makeRng, next, pick, type Rng } from '../rng';

export type Lane = 0 | 1; // 0 block (A), 1 steal (S)
export interface Note {
  id: number;
  t: number; // seconds into the song
  lane: Lane;
  len: number; // seconds held; 0 for a tap
  set: string; // the offensive set it belongs to
}

/** One set: beat offsets in a four-beat bar, the lane, and how many beats to hold. */
interface Pattern {
  name: string;
  level: 1 | 2 | 3;
  mirror: boolean; // symmetrical sets look the same mirrored
  beats: [number, Lane, number?][];
}

export const RHYTHM = {
  perfect: 0.05, // seconds either side of the beat
  good: 0.12,
  early: 0.2, // a press this early on a note still counts it as missed (no free spamming)
  holdGrace: 0.15, // letting go this close to a long note's end still holds it
  countIn: 4, // beats before the first set
  seconds: [40, 52] as [number, number],
  bpm: [100, 124] as [number, number],
  maxGap: 2.8, // seconds without a note before one is added (the owner: one press every 3 s)
  grades: [
    ['S', 0.95],
    ['A', 0.85],
    ['B', 0.7],
    ['C', 0.5],
  ] as [Grade, number][],
};
type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export const PATTERNS: Pattern[] = [
  { name: 'Walk it up', level: 1, mirror: true, beats: [[0, 0], [2, 1]] },
  { name: 'Swing it', level: 1, mirror: true, beats: [[0, 0], [1, 1], [2, 0], [3, 1]] },
  { name: 'Double team', level: 1, mirror: true, beats: [[0, 0], [1, 0], [2, 1], [3, 1]] },
  { name: 'Isolation', level: 1, mirror: true, beats: [[0, 1, 2], [3, 0]] },
  { name: 'Post-up', level: 2, mirror: true, beats: [[0, 0, 2.5], [3, 1]] },
  { name: 'Pick and roll', level: 2, mirror: true, beats: [[0, 1], [0.5, 1], [1, 0], [2, 1], [2.5, 1], [3, 0]] },
  { name: 'Help side', level: 2, mirror: true, beats: [[0, 0], [1.5, 1], [2.5, 0], [3, 1]] },
  { name: 'Trap', level: 2, mirror: false, beats: [[0, 0], [0, 1], [2, 0], [2, 1]] },
  { name: 'Ladder', level: 2, mirror: true, beats: [[0, 0], [0.5, 0], [1, 0], [2, 1], [2.5, 1], [3, 1]] },
  { name: 'Zone', level: 2, mirror: false, beats: [[0, 0, 1.5], [0, 1, 1.5], [2.5, 0], [3, 1]] },
  { name: 'Fast break', level: 3, mirror: true, beats: [[0, 1], [0.5, 0], [1, 1], [1.5, 0], [2, 1], [2.5, 0], [3, 1]] },
  { name: 'Switch everything', level: 3, mirror: true, beats: [[0, 0, 1.5], [0.5, 1], [1, 1], [2.5, 1], [3, 0]] },
  { name: 'Shot fake', level: 3, mirror: true, beats: [[0, 1], [0.25, 1], [1, 0], [2, 1], [2.25, 1], [3, 0]] },
  { name: 'Lob threat', level: 3, mirror: true, beats: [[0, 0], [0.75, 0], [1.5, 1], [2, 0], [2.75, 1], [3.5, 0]] },
];

/** How likely each level is, by how far into the run: easy sets early, the hard ones late. */
const MIX: [number, number, number][] = [
  [1, 0.6, 0],
  [1, 1, 0.7],
  [0.4, 1, 1.2],
];

function pickSet(r: Rng, progress: number, last: string): Pattern {
  const w = MIX[progress < 0.3 ? 0 : progress < 0.7 ? 1 : 2];
  const pool = PATTERNS.filter((p) => p.name !== last);
  const total = pool.reduce((a, p) => a + w[p.level - 1], 0);
  let x = next(r) * total;
  for (const p of pool) if ((x -= w[p.level - 1]) < 0) return p;
  return pool[pool.length - 1];
}

export interface Chart {
  bpm: number;
  beat: number; // seconds
  length: number; // seconds of play
  notes: Note[];
  sets: { name: string; t: number }[];
}

/** A run: sets in random order to the beat, mirrored at random, never quiet for 3 seconds. */
export function makeChart(seed: number): Chart {
  const r = makeRng(seed);
  const bpm = pick(r, [100, 104, 108, 112, 116, 120, 124].filter((b) => b >= RHYTHM.bpm[0] && b <= RHYTHM.bpm[1]));
  const beat = 60 / bpm;
  const length = RHYTHM.seconds[0] + next(r) * (RHYTHM.seconds[1] - RHYTHM.seconds[0]);
  const notes: Note[] = [];
  const sets: Chart['sets'] = [];
  let t0 = RHYTHM.countIn * beat;
  let last = '';
  let id = 0;
  while (t0 + 4 * beat <= RHYTHM.countIn * beat + length) {
    const p = pickSet(r, (t0 - RHYTHM.countIn * beat) / length, last);
    last = p.name;
    const flip = p.mirror && next(r) < 0.5;
    sets.push({ name: p.name, t: t0 });
    for (const [b, lane, hold] of p.beats) notes.push({ id: id++, t: t0 + b * beat, lane: (flip ? 1 - lane : lane) as Lane, len: hold ? hold * beat : 0, set: p.name });
    t0 += 4 * beat;
  }
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  // nothing quiet for long: a tap halfway through any gap of nearly 3 seconds
  for (let i = 1; i < notes.length; i++) {
    const end = Math.max(...notes.slice(0, i).map((n) => n.t + n.len));
    if (notes[i].t - end > RHYTHM.maxGap) notes.splice(i, 0, { id: id++, t: Math.round(((end + notes[i].t) / 2) / (beat / 2)) * (beat / 2), lane: (notes[i].lane ^ 1) as Lane, len: 0, set: notes[i].set });
  }
  return { bpm, beat, length: t0 - RHYTHM.countIn * beat, notes, sets };
}

export type Judge = 'perfect' | 'good' | 'miss';

/** How a press this far from the note (seconds, + late) is judged; null when it is too early to count. */
export function judgeAt(dt: number): Judge | null {
  const a = Math.abs(dt);
  if (a <= RHYTHM.perfect) return 'perfect';
  if (a <= RHYTHM.good) return 'good';
  if (dt < 0 && a <= RHYTHM.early) return 'miss';
  return null;
}

export interface Tally {
  perfect: number;
  good: number;
  miss: number;
  held: number;
  dropped: number;
  maxCombo: number;
}

/** Accuracy: perfect counts 1, good 0.6, a long note held to the end counts once more. */
export function accuracy(t: Tally): number {
  const total = t.perfect + t.good + t.miss + t.held + t.dropped;
  return total ? (t.perfect + t.good * 0.6 + t.held) / total : 0;
}

export const gradeOf = (acc: number): Grade => RHYTHM.grades.find(([, at]) => acc >= at)?.[0] ?? 'D';
