import {
  ATTRS,
  BASE_RATE,
  DECLINE_ATTR_MULT,
  DECLINE_NOISE,
  DECLINE_START,
  DECLINE_TABLE,
  EARLY_BLOOMER,
  FOCUS_MULT,
  GROWTH_RANDOM,
  GROWTH_SCALE,
  HALF_PLANS,
  MORALE_GROWTH,
  HEADROOM_DIV,
  HEADROOM_MAX,
  HEALTH_MULT_OUT,
  IQ_LATE_GAIN,
  LATE_BLOOMER,
  LEVEL_FACTOR,
  MINUTES_FACTOR,
  NON_FOCUS_MULT,
  OVR_WEIGHTS,
  PERF_FACTOR,
  SUDDEN_DECLINE,
} from '../balance';
import { chance, clamp, range, type Rng } from '../rng';
import type { AttrKey, Attrs, HalfPlan, UserPlayer } from '../types';
import { ovrOf } from './ovr';

export function standardRate(age: number): number {
  let rate = 0;
  for (const [minAge, r] of BASE_RATE) if (age >= minAge) rate = r;
  return rate;
}

export function baseRate(p: UserPlayer, minutesFactor: number): number {
  const age = p.age;
  if (p.growthType === 'early') {
    if (age < EARLY_BLOOMER.youngBefore) return standardRate(age) * EARLY_BLOOMER.youngBoost;
    return standardRate(age + EARLY_BLOOMER.plateauEarlier);
  }
  if (p.growthType === 'late') {
    if (age < LATE_BLOOMER.youngBefore) return standardRate(age) * LATE_BLOOMER.youngMult;
    if (minutesFactor >= LATE_BLOOMER.minutesGate) {
      if (age <= 26) return standardRate(21);
      if (age <= 29) return standardRate(25);
    }
  }
  return standardRate(age);
}

/**
 * Expected OVR at a given age for a player of this potential with average focus,
 * full minutes and a balanced plan, from a 44.5 start. Used to generate prospects
 * on the same curve as the user.
 */
const expCache = new Map<number, number>();
export function expectedOvrAt(pot: number, age: number): number {
  const key = Math.round(pot) * 100 + age;
  const hit = expCache.get(key);
  if (hit !== undefined) return hit;
  const cap = Math.round(pot) + 3;
  let o = 44.5;
  for (let a = 14; a < age; a++) {
    for (let h = 0; h < 2; h++) o += standardRate(a) * GROWTH_SCALE * Math.min(HEADROOM_MAX, Math.max(0, (cap - o) / HEADROOM_DIV));
  }
  expCache.set(key, o);
  return o;
}

export function minutesFactor(share: number, played: boolean): number {
  if (!played) return MINUTES_FACTOR[0][1];
  let f = MINUTES_FACTOR[1][1];
  for (let i = 1; i < MINUTES_FACTOR.length; i++) if (share >= MINUTES_FACTOR[i][0]) f = MINUTES_FACTOR[i][1];
  return f;
}

export function headroom(cap: number, stat: number): number {
  return clamp((cap - stat) / HEADROOM_DIV, 0, HEADROOM_MAX);
}

export function perfFactor(actualGmSc: number, expectedGmSc: number): number {
  if (expectedGmSc <= 0.5) return 1;
  const ratio = actualGmSc / expectedGmSc;
  return clamp(1 + (ratio - 1) * PERF_FACTOR.slope, PERF_FACTOR.min, PERF_FACTOR.max);
}

export interface HalfGrowthCtx {
  minutesShare: number;
  played: boolean;
  ovr: number;
  levelAvg: number;
  perf: number;
  plan: HalfPlan;
  outMost: boolean;
  extraMult?: number;
  morale?: number;
}

/** Applies one half-season of growth to the user. Returns the gain per attribute. */
export function applyHalfGrowth(rng: Rng, p: UserPlayer, ctx: HalfGrowthCtx): Partial<Attrs> {
  const mf = minutesFactor(ctx.minutesShare, ctx.played);
  const base = baseRate(p, mf);
  const levelF = ctx.ovr > ctx.levelAvg + LEVEL_FACTOR.overBy ? LEVEL_FACTOR.mult : 1;
  const plan = HALF_PLANS[ctx.plan];
  const planF = plan.growth * MORALE_GROWTH(ctx.morale ?? 60);
  const healthF = ctx.outMost ? HEALTH_MULT_OUT : 1;
  const gains: Partial<Attrs> = {};
  if (base <= 0) return gains;
  for (const k of ATTRS) {
    const focus = p.focus.includes(k) ? FOCUS_MULT : NON_FOCUS_MULT;
    const g =
      base *
      GROWTH_SCALE *
      headroom(p.caps[k], p.attrs[k]) *
      mf *
      levelF *
      ctx.perf *
      focus *
      planF *
      (plan.attrs ? (plan.attrs[k] ?? plan.other ?? 1) : 1) *
      healthF *
      (ctx.extraMult ?? 1) *
      range(rng, GROWTH_RANDOM[0], GROWTH_RANDOM[1]);
    if (g > 0) {
      p.attrs[k] = Math.min(99, p.attrs[k] + g);
      gains[k] = g;
    }
  }
  return gains;
}

/** Season-level decline after the decline start age. Returns the OVR change. */
export function applyAging(rng: Rng, p: UserPlayer): { change: number; sudden: boolean } {
  const before = ovrOf(p.attrs, p.pos);
  const start = DECLINE_START[p.aging];
  let sudden = false;
  if (p.age < IQ_LATE_GAIN.untilAge && p.age >= 27) p.attrs.IQ = Math.min(99, p.attrs.IQ + IQ_LATE_GAIN.perSeason);
  if (p.age >= start) {
    const yrs = Math.min(DECLINE_TABLE.length - 1, p.age - start);
    const target = DECLINE_TABLE[yrs] * (1 + range(rng, -DECLINE_NOISE, DECLINE_NOISE)) * p.declineMultNext;
    const w = OVR_WEIGHTS[p.pos];
    const mult = (k: AttrKey) => {
      if (k === 'IQ') return p.age < IQ_LATE_GAIN.untilAge ? 0 : (DECLINE_ATTR_MULT.IQ ?? 1);
      return DECLINE_ATTR_MULT[k] ?? 1;
    };
    let denom = 0;
    for (const k of ATTRS) denom += w[k] * mult(k);
    const unit = target / denom;
    for (const k of ATTRS) p.attrs[k] = Math.max(15, p.attrs[k] + unit * mult(k));
  }
  if (p.age >= SUDDEN_DECLINE.fromAge && chance(rng, SUDDEN_DECLINE.chance)) {
    sudden = true;
    const drop = range(rng, SUDDEN_DECLINE.min, SUDDEN_DECLINE.max);
    // ATH takes a triple hit; the rest is spread so the OVR loss equals `drop`
    const wA = OVR_WEIGHTS[p.pos].ATH;
    const athDrop = drop * 3;
    const rest = (drop - wA * athDrop) / (1 - wA);
    p.attrs.ATH = Math.max(15, p.attrs.ATH - athDrop);
    for (const k of ATTRS) if (k !== 'ATH') p.attrs[k] = Math.max(15, p.attrs[k] - rest);
  }
  p.declineMultNext = 1;
  return { change: ovrOf(p.attrs, p.pos) - before, sudden };
}

/** HS growth spurts: the player reaches full height by about 17. */
export function growHeight(p: UserPlayer): void {
  if (p.height < p.fullHeight && p.age <= 17) {
    const left = p.fullHeight - p.height;
    const yearsLeft = Math.max(1, 18 - p.age);
    p.height += Math.ceil(left / yearsLeft);
    p.wingspan += Math.ceil(left / yearsLeft);
  }
}
