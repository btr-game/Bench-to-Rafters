// Playing weight (round 20). Every player has a best playing weight for his height and age;
// being over it makes him stronger inside and slower, being under it the opposite (WEIGHT in
// balance.ts). The effect is kept in his ratings: `frame` remembers what the current weight
// adds or takes away, and syncWeight() moves the ratings by the difference whenever his
// weight, height or age changes, so nothing is counted twice.

import { ATTR_MAX, ATTRS, SOLO_PLAN, TWO_PLAN_SHARE, WEIGHT } from '../balance';
import { clamp, normal, type Rng } from '../rng';
import type { AttrKey, Attrs, HalfPlan, UserPlayer } from '../types';

const W = WEIGHT;
const MIN_LB = 90;

/** Share of his adult ideal weight a player of this age carries (1 from 21 on). */
const maturity = (age: number): number => clamp(W.youth.at14 + (age - W.youth.from) * W.youth.perYear, W.youth.at14, 1);

/** The best playing weight (lb) for this height and age. */
export const idealWeight = (height: number, age: number): number => (W.base + (height - 79) * W.perInch) * maturity(age);

/** Weight in lb, filled in for careers saved before weights existed. */
export function weightOf(p: UserPlayer): number {
  if (p.weight === undefined) {
    p.build ??= 0;
    p.weight = Math.round(idealWeight(p.height, p.age));
    p.frame ??= {};
  }
  return p.weight;
}

/** How far from the ideal, in units of 10 lb at adult size: positive when heavy. */
export function weightUnits(p: UserPlayer): number {
  // a teenager's pounds count for more: 10 lb on a 150 lb freshman is a lot
  return clamp((weightOf(p) - idealWeight(p.height, p.age)) / (10 * maturity(p.age)), -W.maxUnits, W.maxUnits);
}

/** What a weight this far from the ideal does to each rating. */
function frameFor(units: number): Partial<Attrs> {
  const out: Partial<Attrs> = {};
  const add = (k: AttrKey, v: number) => {
    if (Math.abs(v) > 1e-9) out[k] = (out[k] ?? 0) + v;
  };
  if (units > 0) {
    const strong = Math.min(units, W.strongUpTo);
    for (const k of ATTRS) {
      const per = W.heavy[k];
      if (!per) continue;
      add(k, per * (per > 0 ? strong : units));
    }
  } else if (units < 0) {
    const v = -units;
    for (const k of ATTRS) if (W.light[k]) add(k, W.light[k]! * v);
    const quick = Math.min(v, W.quickUpTo);
    add('ATH', W.quick * quick - W.skinny * Math.max(0, v - W.quickUpTo));
    add('PER', (W.quick / 2) * quick);
  }
  return out;
}

/** Moves his ratings to match his current weight. Returns the change to each rating. */
export function syncWeight(p: UserPlayer): Partial<Attrs> {
  weightOf(p);
  const was = p.frame ?? {};
  const now = frameFor(weightUnits(p));
  const delta: Partial<Attrs> = {};
  for (const k of ATTRS) {
    const d = (now[k] ?? 0) - (was[k] ?? 0);
    if (Math.abs(d) < 1e-9) continue;
    p.attrs[k] = clamp(p.attrs[k] + d, 5, ATTR_MAX);
    delta[k] = d;
  }
  p.frame = now;
  return delta;
}

/** Puts weight on (or takes it off). `stick` is the share his natural frame keeps. Events use this; the ratings follow in syncWeight. */
export function addPounds(p: UserPlayer, lb: number, stick = 0): void {
  p.weight = Math.max(MIN_LB, Math.round(weightOf(p) + lb));
  if (stick) p.build = clamp((p.build ?? 0) + lb * stick, -W.build.max * 1.5, W.build.max * 1.5);
}

/** Puts weight on (or takes it off) and updates his ratings. */
export function changeWeight(p: UserPlayer, lb: number, stick = 0): void {
  addPounds(p, lb, stick);
  syncWeight(p);
}

/** Where his body settles on its own: the ideal, his natural frame, and the pounds of age. */
function naturalWeight(p: UserPlayer): number {
  return idealWeight(p.height, p.age) + (p.build ?? 0) * maturity(p.age) + Math.max(0, p.age - W.drift.padFrom) * W.drift.agePad;
}

/**
 * Each summer the body drifts back toward where it wants to be. A growing body fills out with
 * it: the pounds his new height and age call for come first (`lastIdeal` is last year's ideal).
 */
export function driftWeight(rng: Rng, p: UserPlayer, lastIdeal: number): number {
  const before = weightOf(p);
  const grown = before + idealWeight(p.height, p.age) - lastIdeal;
  const pull = (naturalWeight(p) - grown) * W.drift.pull;
  p.weight = Math.max(MIN_LB, Math.round(grown + pull + normal(rng, 0, W.drift.sd)));
  syncWeight(p);
  return p.weight - before;
}

/** Pounds a half of training adds or takes off (two plans share it like everything else). */
export function halfPlanWeight(a: HalfPlan, b?: HalfPlan | null): number {
  const lb = (x: HalfPlan) => W.plan[x] ?? 0;
  if (!b || b === a) return lb(a) * SOLO_PLAN.amp;
  return lb(a) * TWO_PLAN_SHARE.main + lb(b) * TWO_PLAN_SHARE.side;
}

/** A starting weight for a new player. */
export function startWeight(rng: Rng, p: UserPlayer): void {
  p.build = Math.round(clamp(normal(rng, 0, W.build.sd), -W.build.max, W.build.max));
  p.weight = Math.round(idealWeight(p.height, p.age) + p.build * maturity(p.age));
  p.frame = {};
  syncWeight(p);
}

/** Extra body wear from carrying too much weight (a multiplier, 1 when fine). */
export const weightWear = (p: UserPlayer): number => 1 + Math.max(0, weightUnits(p) - W.wearFrom) * W.wear;

/** A word for his build. */
export function buildWord(p: UserPlayer): string {
  const u = weightUnits(p);
  return u >= 2.5 ? 'heavy' : u >= 1 ? 'solid' : u > -1 ? 'ideal' : u > -2 ? 'lean' : 'skinny';
}
