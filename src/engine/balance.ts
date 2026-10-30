// Every tunable number lives here. Section references point to SPEC.md.
// The balance targets in SPEC section 15 are the real requirement; change these
// constants (not the code) to hit them.

import type { AttrKey, Pos, LevelKey, HalfPlan, RoleKey, GrowthType, AgingProfile } from './types';

export const ATTRS: AttrKey[] = ['SHT', 'FIN', 'PLY', 'PER', 'INT', 'REB', 'ATH', 'IQ'];
export const POSITIONS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

// §6 OVR weights by position
// round 15: weight moved from the scoring ratings (shooting, finishing, athleticism) toward
// rebounding, playmaking and defense, so a scorer is not automatically the higher OVR.
export const OVR_WEIGHTS: Record<Pos, Record<AttrKey, number>> = {
  PG: { SHT: 0.16, FIN: 0.09, PLY: 0.24, PER: 0.15, INT: 0.03, REB: 0.06, ATH: 0.11, IQ: 0.16 },
  SG: { SHT: 0.22, FIN: 0.12, PLY: 0.15, PER: 0.17, INT: 0.03, REB: 0.06, ATH: 0.12, IQ: 0.13 },
  SF: { SHT: 0.15, FIN: 0.13, PLY: 0.12, PER: 0.17, INT: 0.08, REB: 0.1, ATH: 0.13, IQ: 0.12 },
  PF: { SHT: 0.09, FIN: 0.15, PLY: 0.08, PER: 0.1, INT: 0.17, REB: 0.18, ATH: 0.13, IQ: 0.1 },
  C: { SHT: 0.05, FIN: 0.16, PLY: 0.06, PER: 0.06, INT: 0.24, REB: 0.23, ATH: 0.11, IQ: 0.09 },
};

// round 15: the ratings that were hardest to raise (defense, rebounding, athleticism) grow a
// little faster and the easiest (shooting, IQ) a little slower. Round 7 measured how often a
// dedicated build reaches 99: shooting and IQ about 40%, defense and rebounding 28-30%,
// athleticism 22%.
export const ATTR_GROWTH: Record<AttrKey, number> = { SHT: 0.95, FIN: 1, PLY: 1, PER: 1.08, INT: 1.08, REB: 1.08, ATH: 1.1, IQ: 0.95 };

// §6 height ranges at full growth (inches)
export const HEIGHT_RANGE: Record<Pos, [number, number]> = {
  PG: [72, 77],
  SG: [75, 79],
  SF: [77, 81],
  PF: [79, 83],
  C: [81, 86],
};
// Full-grown height is normal around the middle of the range, so some players end up well
// outside it (a 6'1" shooting guard, a 7'3" center). Hard limits keep it plausible.
export const HEIGHT_DRAW = { sd: 2.3, below: 4, above: 4 };
// Round 7: heights run from 5'9" to 7'6". Nearly everyone lands between 6'0" and 7'3"; beyond
// that is a rare outlier, and more a burden than a gift: very small players struggle to finish
// and defend inside, very tall ones are slow on the perimeter and break down more often.
export const HEIGHT_LIMITS = {
  min: 69,
  max: 90,
  bandLo: 72,
  bandHi: 87,
  outlierChance: 0.02,
  // per inch outside the band, at creation
  short: { FIN: -2, INT: -2, REB: -1.5, ATH: 1 } as Partial<Record<AttrKey, number>>,
  tall: { ATH: -2.5, PER: -2.5, PLY: -1, SHT: -1 } as Partial<Record<AttrKey, number>>,
  tallInjury: 0.12, // extra injury risk per inch above the band
  tallWear: 0.1, // extra body wear per inch above the band
};
// The projection at 14 is only an estimate: the true adult height differs by this much
// (a little skewed toward late growth spurts), and the doctors' guess sharpens each year.
export const HEIGHT_SURPRISE = { mean: 0.3, sd: 1.7, min: -3, max: 4, growUntil: 19 };
export const HEIGHT_PROJ_SD: Record<number, number> = { 15: 1.4, 16: 1.1, 17: 0.8, 18: 0.5 };
// Height against the position's norm shifts the starting card a little (per inch).
export const HEIGHT_ATTR: Partial<Record<AttrKey, number>> = { REB: 0.8, INT: 0.6, PLY: -0.4, ATH: -0.3 };
// Playing weight (round 20, player/weight.ts). The best playing weight for his height is
// base + perInch per inch over 6'7", scaled down while he is still a teenager (maturity from
// 14 to 21). Every 10 lb over it (at adult size) costs athleticism and perimeter defense and
// adds rebounding, rim protection and finishing up to `strongUpTo`; every 10 lb under it does
// the opposite, with a little quickness for the first 15 lb and only weakness after that.
export const WEIGHT = {
  base: 220,
  perInch: 6.5,
  youth: { from: 14, at14: 0.78, perYear: 0.034 },
  build: { sd: 8, max: 22 }, // his natural frame, lb heavier or lighter than the ideal
  drift: { pull: 0.45, sd: 3, agePad: 1.6, padFrom: 28 }, // each summer toward his natural weight
  heavy: { ATH: -1.1, PER: -0.6, REB: 0.8, INT: 0.6, FIN: 0.4 } as Partial<Record<AttrKey, number>>,
  strongUpTo: 2.5, // units of 10 lb: the strength gains stop here, the slowdown does not
  light: { REB: -0.7, INT: -0.5, FIN: -0.3 } as Partial<Record<AttrKey, number>>,
  quickUpTo: 1.5, // the first 15 lb under the ideal: ATH +quick and PER +quick/2 per 10 lb
  quick: 0.7,
  skinny: 0.8, // ATH lost per 10 lb beyond quickUpTo
  maxUnits: 4,
  wearFrom: 1.5, // units over the ideal where the extra weight starts to wear the body
  wear: 0.08, // extra body wear per unit beyond wearFrom
  plan: { strength: 2.5, speed: -1.5, recovery: 1 } as Partial<Record<string, number>>, // lb per half
  injuredHalf: 3, // lb gained in a half spent mostly injured
};
// How far ahead of or behind his card a 14-year-old really is (in OVR points, roughly).
// Partly linked to potential, mostly not: there are early bloomers and late bloomers.
// Every card starts near the same level (the archetype sets the shape, not the head start).
// Starting OVR is Laplace (double exponential) around 40: dense in the middle, half of all
// players within about ±5, and about 1 in 30 at each extreme (20 or below, 60 or above).
// scale = 20 / ln(15) puts 1/30 of the mass beyond ±20 on each side.
export const START_SHIFT = { target: 40, scale: 20 / Math.log(15), potW: 1.0, lo: 16, hi: 64, jitter: 2 };

export const ARCHETYPE_TOTAL = 320;
export const REROLL_SPREAD = 3;

// §6 focus stats
export const FOCUS_MULT = 1.8;
export const NON_FOCUS_MULT = 0.85;
export const MAX_FOCUS_CHANGES = 99;
/**
 * A breakthrough season unlocks a focus change (career/breakthrough.ts): OVR or any single
 * rating up at least this much in one season. Set at about the 77th percentile of seasons at
 * each age (60 simulated careers), so roughly one season in four qualifies.
 */
export const FOCUS_BREAKTHROUGH: { upTo: number; ovr: number; attr: number }[] = [
  { upTo: 17, ovr: 5.5, attr: 10.5 },
  { upTo: 21, ovr: 2.6, attr: 6.2 },
  { upTo: 25, ovr: 1.2, attr: 3.6 },
  { upTo: 99, ovr: 0.7, attr: 2.6 },
];

// §6 hidden traits
// Potential is right-skewed: base + exp(Normal(mu, sigma)). For the player this gives a
// median ceiling in the mid 60s, about 1 in 20 near 50 and about 1 in 20 at 95+.
export interface SkewDist {
  base: number;
  mu: number;
  sigma: number;
  min: number;
  max: number;
}
export const POTENTIAL: SkewDist = { base: 37, mu: 3.44, sigma: 0.4, min: 40, max: 103 };
export const ELITE_CLIMB = { from: 85, per: 0.07, min: 0.4 };

// Difficulty modes (playtest round 6). Each sets the potential distribution, a growth
// multiplier and an injury multiplier; the league around the player is the same.
export type Mode = 'standard' | 'reality' | 'stars' | 'fast' | 'lab';
/** The difficulties offered on the first page (round 11). Fast break is a switch in the game; the lab is a mini-game. */
export const DIFFICULTIES: Mode[] = ['standard', 'reality', 'stars'];
/**
 * Fast break skips the shop, the national team and most turning points, and runs one plan a
 * season, so it grows a player a little faster to make up for it (and a little more: about 3
 * OVR of head start, as the fast break mode had). Applies in any difficulty while it is on.
 * Regular guy, 200 smart careers, same seeds: 74.1 without; 75.9 at 1.2x, 77.9 at 1.35x.
 */
export const FAST_GROWTH = 1.3;
// floor: in stars mode he is never further behind than a straight line from his start to
// floor.ovr at floor.age, so every career that lasts that long reaches it
// elite (round 12): above `from` OVR every half's growth shrinks by `per` a point, down to `min`,
// so a high ceiling is no longer a sure thing: the last steps to the top take real work.
// round 14: per-mode dials for the systems that sit outside growth. mini scales what a mini-game
// claim pays into ratings; teamFx scales the team factors around him (chemistry, star gravity,
// team style, his team's storyline); ringChase scales the odds that a contender has a
// minimum-deal spot for him. Missing = 1.
export const MODES: Record<Mode, { name: string; blurb: string; potential: SkewDist; growth: number; injury: number; scoutMid: number; floor?: { age: number; ovr: number; until: number }; elite?: { from: number; per: number; min: number }; mini?: number; teamFx?: number; ringChase?: number }> = {
  standard: { name: 'Regular guy', blurb: 'The full game. Most careers peak in the 60s and 70s; the NBA is common, stardom is earned.', potential: POTENTIAL, growth: 0.94, injury: 1, scoutMid: 70, elite: ELITE_CLIMB, mini: 0.4, teamFx: 0.3, ringChase: 0.1 },
  // fast break: the regular game at a quick pace (engine/fast.ts). The quick pace means fewer
  // events, one training group a season and no shop, so the head start is set by simulation:
  // mean peak 76.4 against 73.6 for Regular guy (300 smart careers each, round 8).
  fast: { name: 'Fast break', blurb: 'The regular game at a quick pace, with a small head start. One training plan a season, no shop, no national team, playoffs simulated: you still make every real call.', potential: { ...POTENTIAL, base: 54, min: 56 }, growth: 1.12, injury: 1, scoutMid: 73 },
  // built in a lab (round 8): fast break, but growth is paid out as credits the player spends
  // on any rating (career/lab.ts). Spending where it counts is worth a lot, so its potential
  // sits a little below fast break's: an OVR-minded build peaks at 77.6 on average (round 8).
  lab: { name: 'Built in a lab', blurb: 'Fast break, but you build the player. Training and events earn credits, and you spend them on any rating you want. Pick your own height.', potential: { ...POTENTIAL, base: 51, min: 53 }, growth: 1.12, injury: 1, scoutMid: 73 },
  reality: { name: 'Reality hits hard', blurb: 'Like real life: most careers end short of the NBA, and those who make it fight for a spot. Every choice counts.', potential: { base: 51, mu: 2.25, sigma: 0.6, min: 52, max: 99 }, growth: 0.9, injury: 1.3, scoutMid: 50 },
  stars: { name: 'Shoot for the stars', blurb: 'Built for greatness: every career reaches stardom, and the very top is within reach.', potential: { base: 83, mu: 1.8, sigma: 0.6, min: 85, max: 99 }, growth: 1.2, injury: 0.6, scoutMid: 93, floor: { age: 22, ovr: 80, until: 29 } },
};
// stat caps may sit above 99 so elite players can actually reach the top of the scale
export const CAP_MAX = 99;
// attributes may pass 99 (up to their caps) so a 97-99 OVR is reachable; OVR itself tops out at 99
export const ATTR_MAX = CAP_MAX;
export const GROWTH_TYPE_ODDS: [GrowthType, number][] = [
  ['early', 0.2],
  ['standard', 0.6],
  ['late', 0.2],
];
export const AGING_ODDS: [AgingProfile, number][] = [
  ['durable', 0.2],
  ['normal', 0.6],
  ['fragile', 0.2],
];
export const DURABILITY_RANGE: [number, number] = [0.7, 1.3];
export const SCOUT_NOISE = { sdAt15: 6, sdAt22: 2, firstVisibleAge: 16 };

// §7 growth
// Base rate per half-season, Standard growth type. [minAge, rate]
// Tuned flatter than the spec's starting table so high-potential players can reach
// their ceiling (see DECISIONS.md).
// Fast as a teenager, slowing through the twenties and fading out between 30 and 34 (the
// hidden growth rate moves this whole curve; see GROWTH_RATE_AGE).
export const BASE_RATE: [number, number][] = [
  [14, 2.6],
  [16, 2.5],
  [18, 2.3],
  [20, 2.0],
  [22, 1.6],
  [24, 1.15],
  [26, 0.75],
  [28, 0.45],
  [30, 0.25],
  [32, 0.1],
  [34, 0],
];
export const EARLY_BLOOMER = { ageShift: 2, until: 20, youngBoost: 1.15, youngBefore: 18, plateauEarlier: 2 };
export const LATE_BLOOMER = { youngMult: 0.8, youngBefore: 21, minutesGate: 0.85 };
export const HEADROOM_DIV = 25;
export const HEADROOM_MAX = 1.5;
// how much the starting card shapes each rating's ceiling (lower = every rating can get
// close to his potential, so a lucky player can nearly max them all)
export const CAP_FROM_START = 0.2;
// Overall multiplier on all growth (tuning knob for the whole curve).
export const GROWTH_SCALE = 1.0;

// minutes share (mpg / game length) → factor
export const MINUTES_FACTOR: [number, number][] = [
  // practice still develops a player who barely plays (raised in round 6: bench teenagers
  // were not growing at all)
  [0, 0.5], // did not play
  [0.0001, 0.6],
  [0.1, 0.75],
  [0.25, 0.9],
  [0.45, 1.0],
  [0.65, 1.05],
];
export const LEVEL_FACTOR = { overBy: 10, mult: 0.8 };
export const PERF_FACTOR = { min: 0.9, max: 1.1, slope: 0.25 };
export const GROWTH_RANDOM: [number, number] = [0.7, 1.3];
export const HEALTH_MULT_OUT = 0.3;

// §5 half plans. `attrs` multiplies growth of those stats; `other` multiplies the rest.
// `usage` scales his shot share in games, `teamBoost` adds to his team's strength.
export interface PlanDef {
  growth: number;
  injury: number;
  morale: number;
  trust: number;
  rep: [number, number];
  usage: number;
  teamBoost: number;
  attrs?: Partial<Record<AttrKey, number>>;
  other?: number;
  rangeGain?: number;
  offhandGain?: number;
}
// Two plans can run in the same half (playtest round 6); each counts at this share of its
// full effect, so two plans do more than one but less than both at full strength.
/** Two plans in a half: the first is the main plan, the second a side plan (round 7). */
export const TWO_PLAN_SHARE = { main: 0.8, side: 0.45 };

// Built in a lab (round 8): the growth a half would have given, and every rating an event or
// item would have raised, is paid out as credits instead. One credit buys one rating point;
// points cost more near the top, so a 99 still takes saving up for. `rate` scales the credits
// from training.
export const LAB = { rate: 0.85, cost: [[0, 1], [80, 1.5], [90, 2]] as [number, number][] };

/**
 * Round 13: a single plan (no side plan) is a little stronger than its listed effect: focused
 * work. Every effect moves `amp` times as far from neutral, and growth gets `growth` on top.
 */
export const SOLO_PLAN = { amp: 1.1, growth: 1.03 };

/** The plan that actually applies: one plan, a little amplified, or a main plan and a side plan blended. */
export function blendPlans(a: HalfPlan, b?: HalfPlan | null): PlanDef {
  const A = HALF_PLANS[a];
  if (!b || b === a) {
    const k = SOLO_PLAN.amp;
    const m = (x: number) => 1 + (x - 1) * k;
    const attrs = A.attrs ? (Object.fromEntries(Object.entries(A.attrs).map(([key, v]) => [key, m(v as number)])) as Partial<Record<AttrKey, number>>) : undefined;
    return {
      ...A,
      growth: m(A.growth) * SOLO_PLAN.growth,
      injury: m(A.injury),
      morale: A.morale * k,
      trust: A.trust * k,
      rep: [A.rep[0] * k, A.rep[1] * k],
      usage: m(A.usage),
      teamBoost: A.teamBoost * k,
      attrs,
      other: A.other !== undefined ? m(A.other) : undefined,
      rangeGain: A.rangeGain ? A.rangeGain * k : undefined,
      offhandGain: A.offhandGain ? A.offhandGain * k : undefined,
    };
  }
  const B = HALF_PLANS[b];
  const { main, side } = TWO_PLAN_SHARE;
  const mult = (x: number, y: number) => 1 + (x - 1) * main + (y - 1) * side;
  const add = (x: number, y: number) => x * main + y * side;
  const attrs: Partial<Record<AttrKey, number>> = {};
  const keys = new Set([...Object.keys(A.attrs ?? {}), ...Object.keys(B.attrs ?? {})]) as Set<AttrKey>;
  const am = (p: PlanDef, key: AttrKey) => (p.attrs ? (p.attrs[key] ?? p.other ?? 1) : 1);
  for (const key of keys) attrs[key] = mult(am(A, key), am(B, key));
  const otherA = A.attrs ? (A.other ?? 1) : 1;
  const otherB = B.attrs ? (B.other ?? 1) : 1;
  return {
    growth: mult(A.growth, B.growth),
    injury: mult(A.injury, B.injury),
    morale: add(A.morale, B.morale),
    trust: add(A.trust, B.trust),
    rep: [add(A.rep[0], B.rep[0]), add(A.rep[1], B.rep[1])],
    usage: mult(A.usage, B.usage),
    teamBoost: add(A.teamBoost, B.teamBoost),
    attrs: keys.size ? attrs : undefined,
    other: keys.size ? mult(otherA, otherB) : undefined,
    rangeGain: add(A.rangeGain ?? 0, B.rangeGain ?? 0) || undefined,
    offhandGain: add(A.offhandGain ?? 0, B.offhandGain ?? 0) || undefined,
  };
}

export const HALF_PLANS: Record<HalfPlan, PlanDef> = {
  balanced: { growth: 1.0, injury: 1.0, morale: 0, trust: 0, rep: [0, 0], usage: 1, teamBoost: 0 },
  grind: { growth: 1.3, injury: 1.7, morale: -4, trust: 1, rep: [0, 0], usage: 1, teamBoost: 0 },
  recovery: { growth: 0.75, injury: 0.5, morale: 4, trust: 0, rep: [0, 0], usage: 0.95, teamBoost: 0 },
  spotlight: { growth: 0.85, injury: 1.05, morale: 2, trust: -3, rep: [3, 8], usage: 1.15, teamBoost: -0.3 },
  teamfirst: { growth: 0.95, injury: 1.0, morale: 2, trust: 6, rep: [0, 1], usage: 0.88, teamBoost: 0.7 }, // round 15: a bigger lift to the team (was 0.6)
  shooting: { growth: 1.0, injury: 0.95, morale: 0, trust: 0, rep: [0, 0], usage: 1.03, teamBoost: 0, attrs: { SHT: 2.05 }, other: 0.6, rangeGain: 2 },
  strength: { growth: 1.0, injury: 1.2, morale: -1, trust: 0, rep: [0, 0], usage: 1, teamBoost: 0, attrs: { FIN: 2.1, REB: 2.15, ATH: 1.9, INT: 1.6 }, other: 0.55 },
  playmaking: { growth: 1.0, injury: 1.0, morale: 0, trust: 2, rep: [0, 0], usage: 0.97, teamBoost: 0.2, attrs: { PLY: 2.3, IQ: 1.5 }, other: 0.6 },
  defense: { growth: 1.0, injury: 1.05, morale: 0, trust: 3, rep: [0, 0], usage: 0.95, teamBoost: 0.3, attrs: { PER: 2.6, INT: 2.0 }, other: 0.6 },
  offhand: { growth: 1.0, injury: 1.0, morale: -1, trust: 0, rep: [0, 0], usage: 0.97, teamBoost: 0, attrs: { FIN: 1.5, PLY: 1.3 }, other: 0.5, offhandGain: 7 },
  // round 13: two more, so the grid of twelve fills
  speed: { growth: 1.0, injury: 1.1, morale: 0, trust: 0, rep: [0, 0], usage: 1, teamBoost: 0, attrs: { ATH: 2.3, PER: 1.5, FIN: 1.2 }, other: 0.6 },
  mentor: { growth: 0.98, injury: 0.9, morale: 2, trust: 2, rep: [0, 0], usage: 0.98, teamBoost: 0.1, attrs: { IQ: 2.2, PER: 1.2, SHT: 1.1 }, other: 0.7 },
};

// Each half rolls an outcome for the plan. Morale shifts the odds toward breakthroughs.
export interface PlanOutcome {
  key: string;
  label: string;
  weight: number;
  growth: number;
  morale: number;
  trust: number;
  injury?: number; // multiplies injury risk for the next half
}
// Hidden growth rate (playtest round 6): how fast he turns work into improvement. Lognormal
// around 1, a little slower for players who start ahead (there are late surgers and early
// plateaus). It multiplies growth, makes breakthroughs likelier and can trigger a surge
// (a half with about 2.6x growth) for fast learners. Some choices raise it.
// primeYears: years the growth curve and the decline both move per +1.0 of rate (a 1.5 rate
// grows like someone 2 years younger and starts declining 2 years later). After decayFrom the
// rate itself fades a little every year.
export const GROWTH_RATE_AGE = { primeYears: 4, minShift: -2.5, maxShift: 4, decayFrom: 27, decay: 0.975 };
export const GROWTH_RATE = { sd: 0.3, startW: -0.012, min: 0.5, max: 2.2, breakthroughPow: 1.5, surgeFrom: 1.1, surgeW: 0.25, surgeAgeMax: 25 };
export const PLAN_OUTCOMES: PlanOutcome[] = [
  { key: 'surge', label: 'Surge', weight: 0, growth: 2.6, morale: 9, trust: 4 },
  { key: 'breakthrough', label: 'Breakthrough', weight: 0.16, growth: 1.6, morale: 6, trust: 2 },
  { key: 'steady', label: 'Steady progress', weight: 0.56, growth: 1.0, morale: 0, trust: 0 },
  { key: 'plateau', label: 'Plateau', weight: 0.2, growth: 0.55, morale: -4, trust: 0 },
  { key: 'setback', label: 'Setback', weight: 0.08, growth: 0.3, morale: -8, trust: -3, injury: 1.25 },
];
// plan-specific twists on a setback
export const PLAN_SETBACK_TEXT: Partial<Record<HalfPlan, string>> = {
  grind: 'Burnout: you pushed too hard and your legs went dead.',
  spotlight: 'The attention became a distraction and the coaches noticed.',
  strength: 'You tweaked your back in the weight room.',
  shooting: 'You overthought your mechanics and lost your stroke.',
};
export const MORALE_GROWTH = (morale: number): number => (morale >= 75 ? 1.1 : morale <= 30 ? 0.8 : 1);
// in-game effect of morale, centred on 60: ±8% shooting at the extremes
export const MORALE_PERF = (morale: number): number => 1 + Math.max(-1, Math.min(1, (morale - 75) / 40)) * 0.06;
// All-Star fan vote: share of the score and the scale of reputation
export const FAN_VOTE = { share: 0.15, scale: 25 };
// per-game form (hot and cold nights) and a streaky rhythm across a half
export const FORM = { gameSd: 0.17, halfSd: 0.08, min: 0.5, max: 1.7, shootingShare: 0.3 };

// §7 aging
// Aging hits hard in every mode (playtest round 7): most players are clearly worse by 35.
export const DECLINE_START = { durable: 31, normal: 29, fragile: 27 } as const;
export const DECLINE_TABLE = [-1.2, -2.0, -2.8, -3.6, -4.5, -5.5];
// Body wear (0-100): heavy minutes, hard plans and injuries add to it; recovery, rest and
// health spending take it off. It scales how hard aging hits (decline x (base + wear/div),
// 0.6x for a well-kept body up to about 2.6x for a worn-out one) and the odds of a
// career-altering injury.
// Career-changing swings, rolled once per offseason (see career/swings.ts). The leap's chance
// scales with the hidden growth rate squared; the tragedy's with durability and body wear.
/** Rare players who break the mold (player/anomaly.ts). */
export const ANOMALY = { chance: 0.05, capShare: 0.6 };

export const SWINGS = {
  leap: { chance: 0.005, minAge: 19, maxAge: 28, ceiling: [8, 16] as [number, number], now: [5, 9] as [number, number], rateMult: 1.3 },
  tragedy: { chance: 0.003, minAge: 21, wearDiv: 40, ath: [10, 15] as [number, number], other: [3, 6] as [number, number], caps: [6, 10] as [number, number], durability: 0.25, rateMult: 0.8, wear: 15, daysOut: 330 },
};
export const WEAR = {
  minutes: 3, // per half at a full share of minutes
  plan: 3, // per half, times (plan injury multiplier - 1): grind adds, recovery removes
  injury: { dtd: 0, minor: 1, major: 4, season: 9 } as Record<string, number>,
  summerRest: 2.5, // removed every offseason
  restProgram: 3, // extra for a rest summer program
  agePerYear: 0.5, // added each year past 25
  shopItem: 2, // removed by health and longevity purchases
  declineBase: 0.6,
  declineDiv: 50,
  // the most a prime can be pushed back by the hidden growth rate when it comes to aging
  maxPrimeShift: 2,
};
export const DECLINE_ATTR_MULT: Partial<Record<AttrKey, number>> = { ATH: 1.8, SHT: 0.5, IQ: 0.3 };
export const IQ_LATE_GAIN = { perSeason: 0.3, untilAge: 33 };
export const SUDDEN_DECLINE = { fromAge: 31, chance: 0.08, min: 4, max: 8 };
export const DECLINE_NOISE = 0.3;

// §7 injuries
export const BASE_INJURY = 0.0092; // per game played
// What each injury costs (attribute points); rarer than before, but they leave a mark.
export const INJURY_TOLL = {
  minor: { ath: [0, 1] as [number, number] },
  major: { ath: [2, 4] as [number, number], other: [1, 3] as [number, number], capChance: 0.35, cap: [1, 3] as [number, number] },
  season: { ath: [5, 9] as [number, number], others: 2, other: [2, 4] as [number, number], capChance: 0.7, cap: [2, 4] as [number, number] },
};
export const INJURY_AGE_MULT = (age: number): number => (age < 24 ? 0.85 : age < 30 ? 1 : age < 34 ? 1.2 : 1.4);
export const INJURY_SEVERITY: { key: 'dtd' | 'minor' | 'major' | 'season'; share: number; days: [number, number] }[] = [
  { key: 'dtd', share: 0.5, days: [2, 6] },
  { key: 'minor', share: 0.3, days: [7, 24] },
  { key: 'major', share: 0.165, days: [30, 100] },
  { key: 'season', share: 0.035, days: [270, 365] },
];
export const OFFSEASON_DAYS = 160;

// §7 level scale (average OVR of a rotation player) and game settings (§8, §9)
export interface LevelInfo {
  name: string;
  short: string;
  avg: number; // used by the stat model for relative efficiency
  gameLen: number;
  games: number;
  seasonDays: number;
  teamFga: number; // team field-goal attempts per game
  pace: number; // points scale
}
export const LEVELS: Record<LevelKey, LevelInfo> = {
  HSJV: { name: 'High school JV', short: 'HS JV', avg: 39, gameLen: 32, games: 20, seasonDays: 100, teamFga: 50, pace: 1 },
  HSV: { name: 'High school varsity', short: 'HS Varsity', avg: 45, gameLen: 32, games: 25, seasonDays: 100, teamFga: 52, pace: 1 },
  NCAA: { name: 'NCAA Division I', short: 'NCAA', avg: 55, gameLen: 40, games: 31, seasonDays: 120, teamFga: 59, pace: 1 },
  GL: { name: 'NBA G League', short: 'G League', avg: 62, gameLen: 48, games: 34, seasonDays: 140, teamFga: 90, pace: 1 },
  INT: { name: 'Overseas league', short: 'Overseas', avg: 57, gameLen: 40, games: 30, seasonDays: 180, teamFga: 64, pace: 1 },
  EU: { name: 'EuroLeague', short: 'EuroLeague', avg: 63, gameLen: 40, games: 34, seasonDays: 200, teamFga: 64, pace: 1 },
  NBA: { name: 'NBA', short: 'NBA', avg: 72, gameLen: 48, games: 82, seasonDays: 165, teamFga: 88, pace: 1 },
};
export const NCAA_TIER_STRENGTH = { blue: 63, power: 60.5, major: 58, mid: 55 } as const;
export const TEAM_STRENGTH_NOISE: Record<LevelKey, number> = { HSJV: 3, HSV: 3.5, NCAA: 1.8, GL: 1.8, EU: 1.2, INT: 1.5, NBA: 0 };
// Mean team strength (weighted top-9 OVR) where the spec does not list one per team.
// `LEVELS[x].avg` (the stat model's "average rotation player") sits ~4 below this.
export const LEAGUE_STRENGTH = { HSJV: 41, HSV: 48.5, GL: 66, NBA: 77.3 };
export const HS_STATE_TEAMS = 24;
export const HS_JV_TEAMS = 16;
export const HS_PLAYOFF_TEAMS = 16;

// Roster OVR offsets by depth-chart rank, relative to a team's "quality" anchor.
// The anchor is chosen so that the weighted top-9 average equals the team strength.
export const ROSTER_OFFSETS = [7, 3.5, 1.8, 0.6, -0.4, -1.6, -2.6, -3.4, -4.2, -5.6, -6.6, -7.6, -8.6, -9.6, -10.6];
export const ROSTER_NOISE_SD = 1.8;
export const STRENGTH_WEIGHTS = [1, 1, 1, 1, 1, 0.6, 0.5, 0.4, 0.3];

// §8 roles from rank on team
export const ROLE_BY_RANK: { maxRank: number; role: RoleKey }[] = [
  { maxRank: 2, role: 'key' },
  { maxRank: 5, role: 'starter' },
  { maxRank: 6, role: 'sixth' },
  { maxRank: 9, role: 'rotation' },
  { maxRank: 12, role: 'bench' },
  { maxRank: 99, role: 'deep' },
];
export const ROLE_ORDER: RoleKey[] = ['deep', 'bench', 'rotation', 'sixth', 'starter', 'key'];
// minutes of a 48-minute game
export const ROLE_MINUTES: Record<RoleKey, [number, number]> = {
  key: [33, 37],
  starter: [28, 33],
  sixth: [24, 28],
  rotation: [14, 22],
  bench: [3, 8],
  deep: [0, 0],
};
// Deep-bench players still log garbage time in some games.
export const DEEP_BENCH = { appearChance: 0.22, minutes: [1, 5] as [number, number] };
// Minutes by rank for generated rosters (of 48)
export const RANK_MINUTES = [35, 33, 31, 29.5, 28.5, 25, 19, 16, 14, 6, 4, 2.5, 1, 0.5, 0.3];
export const TRUST_ROLE = { up: 70, down: 30 };

// §9 game sim
export const WIN_SCALE = 4.5;
export const HOME_COURT = 1.2;
// average points per team per game, by level
export const GAME_POINTS: Record<LevelKey, number> = { HSJV: 48, HSV: 56, NCAA: 72, GL: 115, EU: 82, INT: 85, NBA: 113 };
export const IMPACT_MULT = 0.25;
export const USAGE_TEMP = 24; // lower = stars take more shots
export const USAGE_KNEE = { at: 78, slope: 0.35 };
export const EFF_KNEE = { at: 85, slope: 0.4 };
export const USAGE_SCORING_W = { SHT: 0.36, FIN: 0.36, PLY: 0.12, ATH: 0.08, IQ: 0.08 };

export const STAT = {
  three: { base: 0.355, sht: 0.0042, range: 0.0006, min: 0.18, max: 0.47 },
  threeShare: { base: 0.04, range: 0.0078, sht: 0.0025, min: 0.01, max: 0.66 },
  two: { base: 0.515, rating: 0.0048, height: 0.0035, offhand: 0.0009, min: 0.36, max: 0.7 },
  ftRate: { base: 0.2, fin: 0.004, ath: 0.002, min: 0.06, max: 0.55 },
  ft: { base: 0.76, sht: 0.0045, min: 0.42, max: 0.94 },
  reb36: { base: 6.4, rating: 0.17, height: 0.33, wing: 0.12, min: 1.2, max: 16 },
  // round 7: elite playmakers can average 10+ (PLY 80 about 6 a game, 92 with high IQ about 10)
  ast36: { base: 4.2, rating: 0.2, iq: 0.065, eliteFrom: 80, elite: 0.045, min: 0.4, max: 14 },
  stl36: { base: 1.0, per: 0.03, ath: 0.008, min: 0.2, max: 3 },
  blk36: { base: 0.55, int: 0.035, height: 0.12, wing: 0.06, min: 0, max: 4.2 },
  tov36: { base: 1.0, fga: 0.055, ast: 0.16, iq: 0.02, min: 0.4, max: 5 },
  moraleSwing: 0.12,
};

// §10 value score
// round 15: rebounds, assists and defensive plays count more next to points in award voting
export const VALUE = { reb: 1.05, ast: 1.55, stl: 2.3, blk: 2.3, tov: 1, effAvgTs: 0.565, effMult: 0.9 };
export const MIN_GAMES_AWARD_FRAC = 65 / 82;

export const LEGACY = {
  title: 3,
  titleKey: 4.5,
  mvp: 9,
  finalsMvp: 5,
  allNba: [5, 4, 3],
  allStar: 2,
  dpoy: 4,
  roy: 2,
  scoring: 2,
  statTitle: 1.5, // assists, rebounds, steals, blocks (round 12)
  sixth: 1,
  pointsPer: 1500,
  ncaaTitle: 2,
  euro: 2,
  hof: 100, // round 15: much harder (was 45): about the top 11-13% of Regular guy careers
  firstBallot: 160, // was 80
};

// round 15: a veteran can become a ring chaser (career/ringChase.ts) instead of retiring
export const RING_CHASE = { minOvr: 66, maxAge: 38, contenders: 6, offers: 2 };

// §12 contracts
export const CAP = { start: 165, inflation: 0.03 };
export const MAX_SHARE = (service: number): number => (service >= 10 ? 0.35 : service >= 7 ? 0.3 : 0.25);
export const MIN_SALARY = (service: number): number => Math.min(3.5, 1.3 + service * 0.23);
export const ROOKIE_SCALE_TOP = 13;
export const ROOKIE_SCALE_30 = 2.8;
export const AGENT_CUT = 0.2;
// market value (share of cap) by OVR: linear pieces
export const MARKET_CURVE: [number, number][] = [
  [68, 0],
  [72, 0.025],
  [76, 0.075],
  [80, 0.14],
  [84, 0.22],
  [88, 0.3],
  [92, 0.35],
];
export const MARKET_AGE_DROP = (age: number): number => (age <= 29 ? 1 : Math.max(0.35, 1 - (age - 29) * 0.12));
// Retirement is recommended at 11+ below peak with few minutes, or for veterans past
// `vetAge` who are `vetBelowPeak` below their peak.
export const RETIRE = { ovrBelowPeak: 11, forcedAge: 42, vetAge: 32, vetBelowPeak: 5 };
// NBA interest in a free agent. Teams only call when he would rank within `maxRank` on
// their roster; veterans and little-used players get fewer calls.
/** Team factors (career/team.ts). Strength points, added to the team in his games. */
export const TEAM_FACTORS = {
  chemistryPer: 0.25, // per season in a row with the team
  chemistryMax: 0.8,
  trustFrom: 55, // round 15: coach trust adds to chemistry above this, takes away below it
  trustPer: 0.015,
  trustMin: -0.4,
  trustMax: 0.4,
  starFrom: 84, // NBA star gravity from this OVR
  starPer: 0.12,
  starMax: 1.0,
  swingChance: 0.35, // a midseason swing in a season
  swingScale: 0.5, // midseason swing sizes are multiplied by this
  tradeBase: 0.25, // trade request success
  tradePerOvr: 0.02,
  tradeMin: 0.1,
  tradeMax: 0.6,
  ringChaseAge: 30, // contenders offer a minimum deal from this age, or to bench players
  ringChaseChance: 0.5, // a contender actually has a spot
  // winning players: team strength per rating point above his own OVR (career/team.ts winningEdge)
  edge: { perimeter: 0.12, interior: 0.1, glass: 0.05, general: 0.13, threeAndD: 0.14, iq: 0.05, max: 2.5, playoffMult: 1.6, traitFrom: 0.4 },
};

/** NBA free agents below star level hear from Europe and Asia too (round 7). */
export const OVERSEAS_FA = { belowOvr: 82, twoBelow: 76, asiaChance: 0.5 };

export const FA_INTEREST = {
  maxRank: 11,
  perPoint: 0.3, // expected offers per OVR point above the league's average 11th man
  shareW: 1.0,
  repW: 0.03, // round 15: reputation brings more suitors (was 0.02)
  maxOffers: 6,
  vetAge: 31,
  vetMult: 0.6,
  oldAge: 34,
  oldMult: 0.4,
  oldMaxRank: 9,
  reSign: { key: 0.97, starter: 0.88, sixth: 0.75, rotation: 0.45, bench: 0.15, deep: 0.04 } as Record<string, number>,
  // G League / EuroLeague players: NBA camp offers
  prospectMaxRank: 11,
  prospectPerPoint: 0.3,
  prospectProdW: 0.02,
  prospectRepW: 0.004,
  campCutScale: 2.5,
  campChance: 0.75, // undrafted: chance of an Exhibit 10 camp invite if within campOvrGap of the 13th man
  campOvrGap: 5,
  // overseas and G League teams lose interest with age
  minorAgeFade: (age: number): number => (age < 30 ? 1 : age < 33 ? 0.6 : age < 35 ? 0.3 : 0.1),
};

// §8 draft
export const DRAFT = {
  classSize: 100,
  boardOvr: 0.55,
  boardPot: 0.35,
  boardProd: 0.1,
  agePenalty: 1.2, // per year over 19
  noise: 1.4,
  teamNoise: 1.0,
  mockNoise: 6,
  lotteryOdds: [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5],
  // Prospects are drawn like the user: potential ~ Normal(potMean, potSd), and OVR is the
  // expected OVR for that potential at that age (same growth curve) plus noise.
  ages: [19, 20, 21, 22],
  poolPerAge: 32,
  // the player's own board score gets this bonus (scouts know his story); it eases NBA
  // entry without weakening the league's talent pipeline
  userBoardBonus: 2,
  pot: { base: 45, mu: 2.84, sigma: 0.46, min: 50, max: 99 } as SkewDist,
  ovrNoise: 2.2,
};

// §8 recruiting
export const RECRUIT = {
  classSize: 300,
  population: 4000,
  ovrMean: 51.5, // typical OVR of a senior with a college future (first offers)
  // Stars follow a senior-equivalent rating (OVR + small potential and reputation nudges).
  // effMean/effSd are set so that 60 is the top-30 line (5 stars), 55 the top 150 (4 stars)
  // and about 52.4 the top 300 (3 stars).
  effMean: 41.3,
  effSd: 7.7,
  potW: 0.12,
  repW: 0.03,
  twoStar: 46,
  stars: [30, 150, 300],
  // chance that a low-star recruit gets any Division I offer
  d1Chance: { 2: 0.92, 1: 0.6 } as Record<number, number>,
};
// Team options on rookie deals: kept if he ranks within `keepRank`, otherwise a coin flip
// that favours young players.
export const TEAM_OPTION = { keepRank: 9, youngAge: 22, youngKeep: 0.3, oldKeep: 0.1 };

// HS roster by grade (mean OVR)
export const HS_GRADE_OVR = [39.5, 43.5, 46.5, 49];
export const HS_GRADE_SD = 3.6;
export const HS_ROSTER_PER_GRADE = 6;
export const HS_VARSITY_SIZE = 12;

// NBA world
export const NBA_WORLD = {
  qualitySd: 1.8,
  rosterSize: 14,
  maxRoster: 15,
  retireAge: 35,
  hardRetireAge: 39,
  minOvrToStay: 65,
  faStrengthPull: 0.12,
  reSignChance: 0.55,
};

// Generated-player season progression
// Each season a young generated player closes this share of the gap to his potential.
export const GEN_GROWTH = {
  // each drafted prospect gets a hidden development factor ~ N(devMean, devSd): some reach
  // their potential, many bust
  devMean: 0.5,
  devSd: 0.4,
  gapRate: { 19: 0.35, 20: 0.32, 21: 0.28, 22: 0.24, 23: 0.18, 24: 0.12, 25: 0.08, 26: 0.05, 27: 0.03 } as Record<number, number>,
  noise: 1.0,
};
// A persistent, slowly drifting team factor (coaching, system, front office) added to roster
// strength so good and bad franchises persist. AR(1): c' = keep·c + N(0, sd).
export const COACHING = { initSd: 1.2, keep: 0.85, sd: 0.6 };

// Reputation
export const REP = {
  decay: 0.9,
  labels: [
    [85, 'Icon'],
    [70, 'Superstar'],
    [55, 'Star'],
    [40, 'Known'],
    [25, 'Noticed'],
    [10, 'Local name'],
    [0, 'Unknown'],
  ] as [number, string][],
};

export const EVENTS = { midseasonMax: 2, offseasonMax: 2, midseasonChance: 0.9, secondChance: 0.5, offseasonChance: 0.85 };

// Building the starting five (round 9): the first option on an NBA team can recruit up to two
// starters a summer from other teams. Salaries must fit: under the cap a team can absorb a
// salary outright; over it, what comes in may be at most `match` times what goes out (as in a
// real NBA trade). A pay cut (10% at a time, up to 30%) frees room and shows players he is
// serious about winning.
export const STARTERS_RECRUIT = { capShare: 1, match: 1.25, moves: 2, asks: 3, cutStep: 0.1, maxCut: 0.3, board: 6, cutInterest: 0.07 };

// Duos (round 20, career/duo.ts): a recruit's hidden spark is `real` for about a quarter of them,
// `plain` otherwise, plus `fit` when they play in different position groups. Each season
// together adds spark * grow, (win% - 0.5) * winW and (trust - 50) * trustW to the bond (sd of
// noise); at 100 they are a duo. A duo starts at `start` strength and adds `perSeason` a
// season up to 1: team strength + team, his efficiency x(1 + perf), assists x(1 + ast) and
// shots x(1 + usage), all times that strength.
export const DUO = { realChance: 0.25, real: [0.65, 1] as [number, number], plain: [0.05, 0.3] as [number, number], fit: 0.1, grow: 55, winW: 30, trustW: 0.2, sd: 8, start: 0.6, perSeason: 0.15, team: 1.2, perf: 0.035, ast: 0.12, usage: 0.04, stay: 3 };

/** A mode's dial (round 14): 1 unless the mode sets it. */
export const modeDial = (mode: Mode, k: 'mini' | 'teamFx' | 'ringChase'): number => MODES[mode]?.[k] ?? 1;
