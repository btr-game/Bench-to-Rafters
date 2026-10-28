import {
  AGING_ODDS,
  ARCHETYPE_TOTAL,
  ATTRS,
  CAP_FROM_START,
  DURABILITY_RANGE,
  GROWTH_TYPE_ODDS,
  HEIGHT_ATTR,
  HEIGHT_DRAW,
  HEIGHT_RANGE,
  HEIGHT_SURPRISE,
  HEIGHT_LIMITS,
  START_SHIFT,
  GROWTH_RATE,
  CAP_MAX,
  MODES,
  type Mode,
  type SkewDist,
  REROLL_SPREAD,
  SCOUT_NOISE,
} from '../balance';
import { chance, clamp, int, next, normal, range, weightedIndex, type Rng } from '../rng';
import type { AttrKey, Attrs, Pos, UserPlayer } from '../types';
import { ARCHETYPES } from './archetypes';
import { ovrOf } from './ovr';
import { rollAnomaly } from './anomaly';

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
  mode?: Mode;
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
const weightedPick = (rng: Rng, odds: [number, number][]): number => weighted(rng, odds);

export function createPlayer(rng: Rng, input: CreateInput): UserPlayer {
  const p = buildPlayer(rng, input);
  rollAnomaly(rng, p);
  return p;
}

function buildPlayer(rng: Rng, input: CreateInput): UserPlayer {
  const arch = ARCHETYPES[input.pos][input.archetype];
  const card = { ...(input.attrs ?? arch.attrs) };
  const [hMin, hMax] = HEIGHT_RANGE[input.pos];
  const mid = (hMin + hMax) / 2 + (arch.height ?? 0);
  // nearly everyone ends up 6'0"-7'3" (redrawn rather than clamped, so the edges do not pile
  // up); a rare few fall outside it, as far as 5'9" or 7'6"
  const H = HEIGHT_LIMITS;
  let projected = 0;
  let surprise = 0;
  for (let tries = 0; tries < 12; tries++) {
    projected = input.height ?? Math.round(clamp(normal(rng, mid, HEIGHT_DRAW.sd), hMin - HEIGHT_DRAW.below, hMax + HEIGHT_DRAW.above));
    // what the doctors cannot see yet
    surprise = input.height ? 0 : Math.round(clamp(normal(rng, HEIGHT_SURPRISE.mean, HEIGHT_SURPRISE.sd), HEIGHT_SURPRISE.min, HEIGHT_SURPRISE.max));
    if (input.height || (projected + surprise >= H.bandLo && projected + surprise <= H.bandHi)) break;
  }
  let fullHeight = clamp(projected + surprise, H.bandLo, H.bandHi);
  if (!input.height && chance(rng, H.outlierChance)) {
    const tall = input.pos === 'C' || input.pos === 'PF' || (input.pos === 'SF' && chance(rng, 0.5));
    fullHeight = tall ? int(rng, H.bandHi + 1, H.max) : int(rng, H.min, H.bandLo - 1);
  } else if (input.height) fullHeight = clamp(input.height, H.min, H.max);
  // some 14-year-olds are nearly done growing, others have half a foot to go
  const height = fullHeight - weightedPick(rng, [[1, 2], [2, 3], [3, 3], [4, 2], [5, 1.2], [6, 0.8], [7, 0.4]]);
  const mode = MODES[input.mode ?? 'standard'];
  const potential = drawPotential(rng, mode.potential);
  const caps = {} as Attrs;
  // the ceiling comes from the card, so a head start does not raise it
  for (const k of ATTRS) caps[k] = clamp(potential + (card[k] - 40) * CAP_FROM_START, 30, CAP_MAX);
  const pd = mode.potential;
  const potZ = (Math.log(Math.max(1, potential - pd.base)) - pd.mu) / pd.sigma;
  // Laplace draw around the target (inverse CDF), nudged a little by potential
  const u = next(rng) - 0.5;
  const lap = -START_SHIFT.scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  const startOvr = clamp(START_SHIFT.target + lap + START_SHIFT.potW * potZ, START_SHIFT.lo, START_SHIFT.hi);
  const shift = startOvr - ovrOf(card, input.pos);
  const dh = fullHeight - (hMin + hMax) / 2;
  const attrs = {} as Attrs;
  for (const k of ATTRS) {
    const tall = (HEIGHT_ATTR[k] ?? 0) * dh;
    const extreme = heightExtreme(fullHeight);
    const odd = (extreme > 0 ? (H.tall[k] ?? 0) * extreme : extreme < 0 ? (H.short[k] ?? 0) * -extreme : 0);
    attrs[k] = Math.round(clamp(card[k] + shift + tall + odd + int(rng, -START_SHIFT.jitter, START_SHIFT.jitter), 5, 99));
  }
  return {
    name: input.name,
    number: input.number,
    pos: input.pos,
    archetype: arch.name,
    height,
    fullHeight,
    heightProj: projected,
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
    durability: Math.round(range(rng, DURABILITY_RANGE[0], DURABILITY_RANGE[1]) * mode.injury * 100) / 100,
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
    wear: 0,
    growthRate: Math.round(clamp(Math.exp(normal(rng, 0, GROWTH_RATE.sd) + GROWTH_RATE.startW * (ovrOf(attrs, input.pos) - START_SHIFT.target)), GROWTH_RATE.min, GROWTH_RATE.max) * 1000) / 1000,
  };
}

/** Inches outside the usual 6'0"-7'3" band: negative when shorter, positive when taller. */
export function heightExtreme(h: number): number {
  return h < HEIGHT_LIMITS.bandLo ? h - HEIGHT_LIMITS.bandLo : h > HEIGHT_LIMITS.bandHi ? h - HEIGHT_LIMITS.bandHi : 0;
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
