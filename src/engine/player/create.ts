import {
  AGING_ODDS,
  ARCHETYPE_TOTAL,
  ATTRS,
  CAP_FROM_START,
  DURABILITY_RANGE,
  GROWTH_TYPE_ODDS,
  HEIGHT_RANGE,
  CAP_MAX,
  POTENTIAL,
  type SkewDist,
  REROLL_SPREAD,
  SCOUT_NOISE,
} from '../balance';
import { clamp, int, normal, range, weightedIndex, type Rng } from '../rng';
import type { AttrKey, Attrs, Pos, UserPlayer } from '../types';
import { ARCHETYPES } from './archetypes';

export function drawPotential(rng: Rng, d: SkewDist): number {
  return Math.round(clamp(d.base + Math.exp(normal(rng, d.mu, d.sigma)), d.min, d.max));
}

export interface CreateInput {
  name: string;
  number: number;
  pos: Pos;
  archetype: number;
  attrs?: Attrs; // a re-rolled candidate; defaults to the archetype card
  focus: AttrKey[];
  hand?: 'R' | 'L';
  height?: number; // full-grown height; random if omitted
  hometown?: string; // assigned by the game when omitted
  country?: string; // assigned by the game when omitted
  highSchool?: string;
}

/** "See other candidates": each stat ±3, then re-normalized to exactly 320. */
export function rerollAttrs(rng: Rng, base: Attrs): Attrs {
  const out = {} as Attrs;
  for (const k of ATTRS) out[k] = base[k] + int(rng, -REROLL_SPREAD, REROLL_SPREAD);
  // walk the stats that moved furthest back toward the card until the total is exact
  let sum = ATTRS.reduce((s, k) => s + out[k], 0);
  while (sum !== ARCHETYPE_TOTAL) {
    const dir = sum > ARCHETYPE_TOTAL ? -1 : 1;
    const k = [...ATTRS].sort((x, y) => dir * (out[x] - base[x]) - dir * (out[y] - base[y]))[0];
    out[k] += dir;
    sum += dir;
  }
  return out;
}

const weighted = <T>(rng: Rng, odds: [T, number][]): T => odds[weightedIndex(rng, odds.map((o) => o[1]))][0];

export function createPlayer(rng: Rng, input: CreateInput): UserPlayer {
  const arch = ARCHETYPES[input.pos][input.archetype];
  const attrs = { ...(input.attrs ?? arch.attrs) };
  const [hMin, hMax] = HEIGHT_RANGE[input.pos];
  const fullHeight = input.height ?? int(rng, hMin, hMax);
  const height = fullHeight - int(rng, 1, 3);
  const potential = drawPotential(rng, POTENTIAL);
  const caps = {} as Attrs;
  for (const k of ATTRS) caps[k] = clamp(potential + (attrs[k] - 40) * CAP_FROM_START, 30, CAP_MAX);
  return {
    name: input.name,
    number: input.number,
    pos: input.pos,
    archetype: arch.name,
    height,
    fullHeight,
    wingspan: fullHeight + int(rng, 0, 5),
    hometown: input.hometown ?? '',
    country: input.country ?? '',
    highSchool: input.highSchool ?? '',
    age: 14,
    attrs,
    startAttrs: { ...attrs },
    caps,
    range: arch.range,
    offhand: int(rng, 25, 40),
    hand: input.hand ?? 'R',
    focus: input.focus.slice(0, 2),
    focusChanges: 0,
    potential,
    growthType: weighted(rng, GROWTH_TYPE_ODDS),
    aging: weighted(rng, AGING_ODDS),
    durability: Math.round(range(rng, DURABILITY_RANGE[0], DURABILITY_RANGE[1]) * 100) / 100,
    morale: 60,
    trust: 50,
    rep: 3,
    injury: null,
    bank: 0,
    earnings: 0,
    peakOvr: 0,
    scoutGrade: null,
    scoutRange: null,
    programs: [],
    captain: false,
    injuryMultNext: 1,
    declineMultNext: 1,
    growthMultNext: 1,
  };
}

export function gradeFor(p: number): string {
  if (p >= 88) return 'A+';
  if (p >= 84) return 'A';
  if (p >= 80) return 'A−';
  if (p >= 77) return 'B+';
  if (p >= 73) return 'B';
  if (p >= 70) return 'B−';
  if (p >= 67) return 'C+';
  if (p >= 63) return 'C';
  if (p >= 59) return 'C−';
  return 'D';
}

export function scoutSd(age: number): number {
  const t = clamp((age - 15) / 7, 0, 1);
  return SCOUT_NOISE.sdAt15 + (SCOUT_NOISE.sdAt22 - SCOUT_NOISE.sdAt15) * t;
}

/** Re-scout at the end of a season. The estimate is noisy and tightens with age. */
export function updateScouting(rng: Rng, p: UserPlayer): void {
  if (p.age < SCOUT_NOISE.firstVisibleAge) return;
  const sd = scoutSd(p.age);
  const est = clamp(p.potential + normal(rng, 0, sd), 45, 99);
  p.scoutGrade = gradeFor(est);
  const half = Math.max(2, Math.round(sd * 1.3));
  p.scoutRange = [Math.round(est - half), Math.min(99, Math.round(est + half))];
}

export function scoutEstimate(p: UserPlayer): number {
  return p.scoutRange ? (p.scoutRange[0] + p.scoutRange[1]) / 2 : 68;
}
