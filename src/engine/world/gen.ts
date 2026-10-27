// Generated (fictional) players and rosters.

import { HEIGHT_RANGE, POSITIONS, ROSTER_NOISE_SD, ROSTER_OFFSETS, STRENGTH_WEIGHTS } from '../balance';
import { FIRST_NAMES, LAST_NAMES } from '../../content/names';
import { clamp, int, normal, pick, shuffle, type Rng } from '../rng';
import type { GameState, GenPlayer, Pos } from '../types';

export function newId(s: GameState): number {
  return s.nextId++;
}

export function genName(rng: Rng): string {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}

export function genHeight(rng: Rng, pos: Pos): number {
  const [a, b] = HEIGHT_RANGE[pos];
  return int(rng, a, b);
}

/** Potential for a generated player: young players have room to grow. */
export function genPotential(rng: Rng, ovr: number, age: number): number {
  const room = Math.max(0, (24 - age) * 2.6 + normal(rng, 0, 3.5));
  return clamp(Math.round(ovr + room), Math.round(ovr), 97);
}

export function genPlayer(s: GameState, ovr: number, age: number, pos?: Pos): GenPlayer {
  const rng = s.rng;
  const p: Pos = pos ?? pick(rng, POSITIONS);
  return {
    id: newId(s),
    name: genName(rng),
    pos: p,
    shape: int(rng, 0, 2),
    age,
    ovr: clamp(ovr, 20, 97),
    pot: genPotential(rng, ovr, age),
    height: genHeight(rng, p),
    rep: 0,
    contractYears: 0,
    salary: 0,
  };
}

const OFFSET_MEAN = (() => {
  let num = 0;
  let den = 0;
  STRENGTH_WEIGHTS.forEach((w, i) => {
    num += w * ROSTER_OFFSETS[i];
    den += w;
  });
  return num / den;
})();

/** The OVR anchor that gives a roster the requested weighted top-9 strength. */
export const anchorFor = (strength: number): number => strength - OFFSET_MEAN;

export function makeRoster(s: GameState, strength: number, size: number, ages: [number, number], noise = ROSTER_NOISE_SD): GenPlayer[] {
  const anchor = anchorFor(strength);
  const positions: Pos[] = shuffle(s.rng, [...POSITIONS, ...POSITIONS, ...POSITIONS].slice(0, Math.max(size, 5)));
  const out: GenPlayer[] = [];
  for (let i = 0; i < size; i++) {
    const off = ROSTER_OFFSETS[Math.min(i, ROSTER_OFFSETS.length - 1)];
    const age = int(s.rng, ages[0], ages[1]);
    out.push(genPlayer(s, anchor + off + normal(s.rng, 0, noise), age, positions[i % positions.length]));
  }
  out.sort((a, b) => b.ovr - a.ovr);
  return out;
}

/** Weighted average of the top 9 OVRs (§8). */
export function strengthOf(ovrs: number[]): number {
  const sorted = [...ovrs].sort((a, b) => b - a);
  let num = 0;
  let den = 0;
  for (let i = 0; i < STRENGTH_WEIGHTS.length && i < sorted.length; i++) {
    num += STRENGTH_WEIGHTS[i] * sorted[i];
    den += STRENGTH_WEIGHTS[i];
  }
  return den > 0 ? num / den : 0;
}

export const rosterStrength = (roster: GenPlayer[]): number => strengthOf(roster.map((p) => p.ovr));
