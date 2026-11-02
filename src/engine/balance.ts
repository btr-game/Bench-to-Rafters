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
  plan: { strength: 2.5, speed: -5, recovery: 1 } as Partial<Record<string, number>>, // lb per half (Speed and agility is the weight-loss plan)
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
const POTENTIAL: SkewDist = { base: 37, mu: 3.44, sigma: 0.4, min: 40, max: 103 };
const ELITE_CLIMB = { from: 85, per: 0.07, min: 0.4 };

/**
 * Round 28 (owner: "regular guy is too difficult (analyze based on position, archetype)"). Positions
 * came out level (mean peaks within 1.3 OVR of each other), archetypes did not: 60 smart careers of
 * each on Regular guy peaked from 72.7 (3&D Guard, Athletic Wing) to 78.1 (Speedster). Every card's
 * OVR ceiling is the same within half a point, and faster growth for the low ones changed nothing
 * (tried, measured: their careers run into the ceiling, not out of time). So each archetype below
 * 76 starts with a higher potential: 0.9 of its shortfall, in OVR points. The rest are unchanged.
 */
export const ARCH_CEILING: Record<string, number> = {
  'Stretch Big': 1.8, 'Post Scorer': 2.2, 'Playmaking Big': 2.0,
  Bruiser: 2.6, 'Rim Runner': 2.9, 'Two-Way Forward': 1.9, 'Playmaking Four': 0.1,
  'Scoring Guard': 1.7, 'Two-Way Guard': 1.5, 'Jumbo Playmaker': 1.1,
  '3&D Wing': 2.6, 'Athletic Wing': 3.0, 'Scoring Wing': 2.1, 'Glue Guy': 0.5,
  Slasher: 2.6, '3&D Guard': 3.0, 'Combo Guard': 1.3,
};

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
// scout (round 25): the freshman scouting report, before the scouts have a range on him. The
// projected peak is mid + slope x (how far his OVR is above the usual 14-year-old's), give or take
// sd. Fitted to the round 25 distribution run (4,000 careers per difficulty, random and smart play):
// starting OVR barely predicts the peak (each point ahead adds about 0.3), so the old 1.2 a point
// sent a 65 OVR freshman in Shoot for the stars past 99. Fast break and the lab use Regular guy's.
interface FreshScout { mid: number; slope: number; sd: number }
export const MODES: Record<Mode, { name: string; blurb: string; potential: SkewDist; growth: number; injury: number; scout: FreshScout; floor?: { age: number; ovr: number; until: number }; elite?: { from: number; per: number; min: number }; mini?: number; teamFx?: number; ringChase?: number }> = {
  standard: { name: 'Regular guy', blurb: 'The full game. Most careers peak in the 60s and 70s; the NBA is common, stardom is earned.', potential: POTENTIAL, growth: 0.97, injury: 1, scout: { mid: 72.9, slope: 0.28, sd: 12.1 }, elite: ELITE_CLIMB, mini: 0.4, teamFx: 0.3, ringChase: 0.1 },
  // fast break: the regular game at a quick pace (engine/fast.ts). The quick pace means fewer
  // events, one training group a season and no shop, so the head start is set by simulation:
  // mean peak 76.4 against 73.6 for Regular guy (300 smart careers each, round 8).
  fast: { name: 'Fast break', blurb: 'The regular game at a quick pace, with a small head start. One training plan a season, no shop, no national team, playoffs simulated: you still make every real call.', potential: { ...POTENTIAL, base: 54, min: 56 }, growth: 1.12, injury: 1, scout: { mid: 73, slope: 0.28, sd: 12.1 } },
  // built in a lab (round 8): fast break, but growth is paid out as credits the player spends
  // on any rating (career/lab.ts). Spending where it counts is worth a lot, so its potential
  // sits a little below fast break's: an OVR-minded build peaks at 77.6 on average (round 8).
  lab: { name: 'Built in a lab', blurb: 'Fast break, but you build the player. Training and events earn credits, and you spend them on any rating you want. Pick your own height.', potential: { ...POTENTIAL, base: 51, min: 53 }, growth: 1.12, injury: 1, scout: { mid: 73, slope: 0.28, sd: 12.1 } },
  reality: { name: 'Reality hits hard', blurb: 'Like real life: most careers end short of the NBA, and those who make it fight for a spot. Every choice counts.', potential: { base: 51, mu: 2.25, sigma: 0.6, min: 52, max: 99 }, growth: 0.9, injury: 1.3, scout: { mid: 66.2, slope: 0.3, sd: 8.8 } },
  stars: { name: 'Shoot for the stars', blurb: 'Built for greatness: every career reaches stardom, and the very top is within reach.', potential: { base: 83, mu: 1.8, sigma: 0.6, min: 85, max: 99 }, growth: 1.2, injury: 0.6, scout: { mid: 92.1, slope: 0, sd: 3.8 }, floor: { age: 22, ovr: 80, until: 29 } },
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
  chem?: number; // round 20: team chemistry (team strength) added for the rest of the season
  swing?: { attrs: AttrKey[]; mean: number; sd: number }; // round 20: a gamble on these ratings each half
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

/**
 * Round 28 (owner: "young age should have advantage doing some plans like grind, spotlight, listen
 * to vets, while vets should also have advantage doing others, like recovery, team first"): up to
 * `young.upTo` the hard-work and learning plans grow more and hurt less; from `vet.from` recovery
 * and Team first do more (and Team first lifts the team more).
 */
export const AGE_PLANS = {
  young: { upTo: 23, plans: ['grind', 'spotlight', 'mentor'] as HalfPlan[], growth: 1.08, injury: 0.9, morale: 1 },
  vet: { from: 30, plans: ['recovery', 'teamfirst'] as HalfPlan[], growth: 1.08, injury: 0.88, teamBoost: 0.2, trust: 2 },
};

/** Whether his age gives a plan an edge (the plan cards show it). */
export function ageEdge(plan: HalfPlan, age: number): 'young' | 'vet' | null {
  if (age <= AGE_PLANS.young.upTo && AGE_PLANS.young.plans.includes(plan)) return 'young';
  if (age >= AGE_PLANS.vet.from && AGE_PLANS.vet.plans.includes(plan)) return 'vet';
  return null;
}

/** A plan as it works for a player of this age. */
function aged(plan: HalfPlan, age?: number): PlanDef {
  const d = HALF_PLANS[plan];
  const edge = age === undefined ? null : ageEdge(plan, age);
  if (edge === 'young') {
    const y = AGE_PLANS.young;
    return { ...d, growth: d.growth * y.growth, injury: d.injury * y.injury, morale: d.morale + y.morale };
  }
  if (edge === 'vet') {
    const v = AGE_PLANS.vet;
    return { ...d, growth: d.growth * v.growth, injury: d.injury * v.injury, teamBoost: d.teamBoost + (plan === 'teamfirst' ? v.teamBoost : 0), trust: d.trust + v.trust };
  }
  return d;
}

/** The plan that actually applies: one plan, a little amplified, or a main plan and a side plan blended
 * (for a player of `age`, when given: round 28's age edges). */
export function blendPlans(a: HalfPlan, b?: HalfPlan | null, age?: number): PlanDef {
  const A = aged(a, age);
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
      chem: A.chem ? A.chem * k : undefined,
      swing: A.swing ? { ...A.swing, mean: A.swing.mean * k, sd: A.swing.sd * k } : undefined,
    };
  }
  const B = aged(b, age);
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
    chem: add(A.chem ?? 0, B.chem ?? 0) || undefined,
    swing: A.swing ? { ...A.swing, mean: A.swing.mean * main, sd: A.swing.sd * main } : B.swing ? { ...B.swing, mean: B.swing.mean * side, sd: B.swing.sd * side } : undefined,
  };
}

export const HALF_PLANS: Record<HalfPlan, PlanDef> = {
  balanced: { growth: 1.0, injury: 1.0, morale: 0, trust: 0, rep: [0, 0], usage: 1, teamBoost: 0 },
  grind: { growth: 1.3, injury: 1.7, morale: -4, trust: 1, rep: [0, 0], usage: 1, teamBoost: 0 },
  recovery: { growth: 0.75, injury: 0.5, morale: 4, trust: 0, rep: [0, 0], usage: 0.95, teamBoost: 0 },
  // round 20: Spotlight gambles on shooting and finishing (a roll each half that can also lose
  // points), costs basketball IQ growth and team chemistry, and raises injury risk; Team first is
  // the opposite: safer, a little IQ, a little chemistry for the rest of the season
  spotlight: { growth: 0.85, injury: 1.2, morale: 2, trust: -3, rep: [3, 8], usage: 1.15, teamBoost: -0.3, attrs: { IQ: 0.6 }, other: 1, chem: -0.15, swing: { attrs: ['SHT', 'FIN'], mean: 0.6, sd: 1.3 } },
  teamfirst: { growth: 0.95, injury: 0.85, morale: 2, trust: 6, rep: [0, 1], usage: 0.88, teamBoost: 0.7, attrs: { IQ: 1.4 }, other: 1, chem: 0.15 }, // round 15: a bigger lift to the team (was 0.6)
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
interface PlanOutcome {
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
// round 35 (owner: "the shooting barely gets affected by age, which makes the stat easy to max out
// ... make shooting drop as well. just level it to similar levels of other stats"): shooting ages
// like the rest (it was 0.5); basketball IQ still barely does
export const DECLINE_ATTR_MULT: Partial<Record<AttrKey, number>> = { ATH: 1.8, IQ: 0.3 };
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
interface LevelInfo {
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
  // round 24 (owner): the deep bench gets 0-3 minutes of garbage time every game, whatever the
  // game's length (it used to be 1-5 minutes in about one game in five)
  deep: [0, 3],
};
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

// round 25: the leaderboards' career index (awards/legacy.ts careerIndex), like the JAWS score: the
// career total and the best `stretch` seasons in a row, averaged; a season also counts a tenth of
// a point (1 / ovrPer) for every OVR above ovrFloor
export const CAREER_INDEX = { stretch: 5, ovrFloor: 60, ovrPer: 10 };

// round 25: nicknames and brands (career/nickname.ts). The media names him once his reputation
// reaches `rep` (Star); brands call from `brandRep` (Superstar) in a pro league, and again when a
// deal runs out while he is still above `renewRep`. A deal pays `deal.share` of the cap a season
// (times reputation / brandRep); a signature line pays `line.base` of the cap plus `line.royalty`
// of it times how far his reputation is above 60 (out of 40), and puts out a shoe every season
// once he reaches `shoeRep` (Icon).
export const NICKNAME = { rep: 55, noise: 0.2 };
// round 25: a visit to something he owns (content/visits.ts). Round 28: as often as he likes; the
// first of a season lifts morale and takes `rest` off his body wear
export const VISIT = { morale: 3, rest: 1 };

/**
 * The shop (round 31, owner: "prices of shopping items should be way more inflated as the player's
 * salary gets higher... get rid of the limit, extend the number of items in the shop to 6, and just
 * make them expensive enough for the user to barely purchase 2~3. but dont inflate prices too much.
 * if the player is getting like 50 or above million a year, price of items shouldnt be a problem").
 * Income is his salary and his brand deal, in $M a year.
 * - inflate: prices are x1 up to `from` a year and rise on a log scale to x`max` at `to` and above.
 * - share: the six are drawn around this share of his bank each, so two or three fit (three of
 *   them come to about his whole bank); from `rich.from` a year the share falls, on a log scale,
 *   to `rich.share` at `rich.to`, where all six fit with money to spare.
 * - spread: how far from that price the draw strays (the sd of the log of price over target).
 * - wear: the chance one of the six is an accessory (cheap at any price level, for the wardrobe).
 */
export const SHOP = { stock: 6, inflate: { from: 1, to: 50, max: 3 }, share: 0.42, rich: { from: 20, to: 50, share: 0.03 }, spread: 0.45, wear: 0.4 };
// round 25: personal staff (career/staff.ts). Pay and benefit by level (a raise moves him up one);
// benefits a season at level 1, times `effect[level - 1]`; a talk once a season lifts morale and
// (round 28) does `talkShare` of his season's benefit on the spot.
// round 25 (the owner: the playable finals change the result): the last possession of a close
// playable playoff game is a timing meter; the timing moves the chance the shot drops
export const CLUTCH_TIMING = { perfect: 0.35, good: 0.12, late: -0.15, max: 0.95, min: 0.05 };
/**
 * Round 28 (owner: "for finals runs ... on the last minutes of the final quarter (or overtime), the
 * user can choose moves and basically play the 3v3 game but in the finals"): crunch time in a
 * playable final (career/live.ts). When the game is within `within` points with two minutes left,
 * the last minutes are `possessions` trips (alternating, `secs` each); an overtime is `ot` more.
 * On offense he picks the move: its make chance is `base`, plus `per` for every point the rating
 * that drives it is above the league's average, plus `morale` per point of morale over 60; `tov`
 * of trips are turned over, a drive has `andOne`. On defense he picks the call: the other team
 * makes `them` of its shots (moved by `strength` per point of team strength between the sides),
 * less what his call and the rating behind it take away; `gamble` goes for the steal.
 */
export const CRUNCH = {
  within: 8,
  possessions: 8,
  secs: 15,
  ot: 6,
  maxOt: 3,
  base: { drive: 0.5, pull: 0.43, three: 0.35, post: 0.47, kick: 0.45 } as Record<string, number>,
  per: 0.007,
  morale: 0.001,
  min: 0.12,
  max: 0.8,
  tov: 0.06,
  andOne: 0.15,
  them: 0.47,
  themThree: 0.33,
  strength: 0.012,
  stop: { contest: 0.04, help: 0.04, switch: 0.03, gamble: -0.08 } as Record<string, number>,
  stopPer: 0.004,
  steal: { gamble: 0.17, other: 0.03 },
};
// round 25: contract talks (career/negotiate.ts). Up to `asks` asks an offer; the team's patience
// starts at `base`, plus reputation / `repPer`, plus how far his OVR is above the league average
// / `ovrPer`, less `perAsk` for each ask before; a yes gives the whole ask, a "let's meet halfway"
// half of it, and a team out of patience pulls the offer.
export const NEGOTIATE = { asks: 2, base: 0.35, repPer: 220, ovrPer: 45, perAsk: 0.2, halfway: 0.45, money: 0.15, maxYears: 5 };
// round 25: press conferences (career/press.ts), one every `gap` or `gap + 1` seasons after a big
// moment. What each tone does, per answer; a fiery answer may be fined (`fineChance`), and fires
// the team up or splits it next season (+/- `fire` team strength); the crowd's taste adds `fans`.
// round 25 (the owner: fewer clicks): two questions after the biggest stories (a title, a lost
// final, a major award), one after the rest; each answer weighs 3 / questions, so a press
// conference moves things as much as the first version's three answers did
export const PRESS = { gap: 2, questions: 1, bigQuestions: 2, big: ['title', 'lost-final', 'award'], humble: { trust: 2, rep: 0.5, chem: 0.1 }, confident: { rep: 1.5, morale: 2 }, fiery: { rep: 2.5, trust: -2, fire: 0.15 }, fineChance: 0.2, fans: 1 };
// round 25: a legacy project funded in an event (events/round25.ts) adds legacy points
export const LEGACY_PROJECT = { points: 3 };
/**
 * The farewell tour (round 32, career/farewell.ts): from `age`, in the NBA, he can say in the
 * offseason that the next season is his last. Saying it lifts his mood and his name; in that season
 * the team rallies in the playoffs (`post` team strength) and six road arenas give him a gift; it
 * adds `legacy` points, and he retires when it ends.
 */
export const FAREWELL = { age: 32, morale: 10, rep: 2, post: 0.5, legacy: 2, gifts: 6 };
/**
 * Record chases (round 32, owner: "this could work as a simple warning system. sure, embed it, but
 * dont make it influence the game too much"; career/records.ts). The all-time scoring list counts a
 * legend at about `games` games a season; a single-game career high from `near` of a league record
 * is worth a mention. Chasing the scoring record for a season takes a few more shots (`usage`), a
 * little more risk of getting hurt (`injury`, on his minutes) and a little chemistry (`chem`).
 */
export const RECORD_CHASE = { games: 72, near: 0.8, usage: 0.05, injury: 0.1, chem: 0.1 };
/**
 * The road map (round 33, engine/levels.ts): three short careers before the full game. Each starts
 * as a high school senior, plays one college season and `nbaSeasons` NBA seasons. Potential and
 * growth are set so at least 80% of careers make an NBA All-Star team (owner: "make the difficulty
 * for all levels slightly easier so that nba all star could be achieved above 80%").
 */
export const ROADMAP = {
  beginner: { nbaSeasons: 5, potential: { base: 80, mu: 1.6, sigma: 0.5, min: 82, max: 97 } as SkewDist, growth: 1.1, floor: { age: 21, ovr: 80, until: 30 } },
  intermediate: { nbaSeasons: 6, potential: { base: 79, mu: 1.6, sigma: 0.5, min: 81, max: 97 } as SkewDist, growth: 1.07, floor: { age: 21, ovr: 78, until: 30 } },
  advanced: { nbaSeasons: 7, potential: { base: 76, mu: 1.6, sigma: 0.5, min: 78, max: 97 } as SkewDist, growth: 1.02, floor: { age: 21, ovr: 76, until: 30 } },
};
/**
 * The island's grades (round 33, owner: "for the user to pass the tutorial, they must play each
 * minigame at least once, earning at least a C"; Front Office: "a C = make the playoffs once").
 * The marks follow each game's career-bonus tiers (career/miniBonus.ts): C is the first score that
 * earns a bonus. A three-point score, a dunk contest's best dunk, the lab's peak OVR, a Front Office
 * run's playoff trips; the others grade by how far the run went.
 */
export const ROAD_GRADES = {
  threes: { A: 23, B: 18, C: 13 },
  dunk: { A: 44, B: 40, C: 35 },
  lab: { A: 93, B: 87, C: 80 },
  office: { B: 2, C: 1 }, // playoff trips; a title is an A
};
/**
 * The next generation (round 32, owner: "similar height (... variance, and also like the low-chance
 * breakthroughs, they might be significantly taller/shorter than the father), similar potential
 * (same with height, variance and breakthrough), and similar looks ... make the chances that the
 * child is worse than the father more dominant ... their legacy points count towards the father's
 * legacy points, but not fully"). engine/nextGen.ts. Height: his, with an sd of `heightSd` inches,
 * and a `jump` chance of `jumpIn` inches either way. Potential: his plus `potShift`, an sd of
 * `potSd`, and a `potJump` chance of `potJumpSize` points (up only `potUp` of the time). The child's
 * legacy adds `share` of itself to his. `girl`: the chance the first child is a daughter (owner: "make
 * the first child half-half boy and girl"); only a son plays a career.
 */
export const NEXT_GEN = { heightSd: 1.2, jump: 0.06, jumpIn: [3, 6], potShift: -3, potSd: 3.5, potJump: 0.06, potJumpSize: [7, 12], potUp: 0.35, share: 0.25, girl: 0.5 };
export const STAFF_PAY = { pay: [1, 1.7, 2.6], effect: [1, 1.5, 2], talk: 1, talkShare: 0.35, afford: 4, max: 6 };
// round 25: fines, rolled like injuries, game by game in a pro league. `perGame` is the chance a
// game; low morale and a big name make it likelier; at most `maxSeason` a season. Amounts in $M
// for the NBA (times `abroad` in the other leagues).
export const FINES = { perGame: 0.0022, lowMorale: 1.8, star: 1.4, maxSeason: 2, abroad: 0.15 };
export const BRAND = { brandRep: 70, renewRep: 60, shoeRep: 85, deal: { years: 4, share: 0.04 }, line: { years: 6, base: 0.015, royalty: 0.06 }, rep: 1, morale: 2 };

// round 15: a veteran can become a ring chaser (career/ringChase.ts) instead of retiring
export const RING_CHASE = { minOvr: 66, starPeak: 85, starMinOvr: 56, maxAge: 38, from: 1, contenders: 7, offers: 2 };

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
// round 24 (owner): 50 is the hard limit (it was 42)
export const RETIRE = { ovrBelowPeak: 11, forcedAge: 50, vetAge: 32, vetBelowPeak: 5 };
/**
 * Longevity (round 24, owner: "if the user invests in health and aging enough, the player should
 * be able to play well until 40, not at a 99 level, maybe 85"). A hidden number built by looking
 * after the body: Recovery halves, health and longevity purchases, rest summers and offseasons
 * with little wear. From `from` on it slows aging (by `per` a point, at most `max` (a 70% slower decline)) and makes a
 * sudden decline rarer. Past `ceilingFrom` ratings also meet an age ceiling: 85 at 40, 50 at 50;
 * whatever sits above it fades by `over` of the gap each year.
 */
export const LONGEVITY = {
  recoveryHalf: 1, // main plan (half for a side plan)
  healthItem: 2,
  restSummer: 1.5,
  lowWear: 1, // an offseason that starts under `lowWearBelow`
  lowWearBelow: 20,
  from: 32,
  per: 0.015,
  max: 0.7,
  suddenPer: 0.015,
  suddenMax: 0.6,
  ceilingFrom: 37,
  ceilingAt40: 85,
  ceilingPerYear: 3.5,
  over: 0.5,
};
// NBA interest in a free agent. Teams only call when he would rank within `maxRank` on
// their roster; veterans and little-used players get fewer calls.
/** Team factors (career/team.ts). Strength points, added to the team in his games. */
// Round 24 (owner): the roster around him shapes the team's chemistry (career/roster.ts). The
// profile is the team's average ratings, the starting five (him included) counting three times
// the bench. Shape: a well-spread profile, or peaks where the team's system wants them, whichever
// is better. Depth: the bench against the league's usual bench. Calibrated so an average roster
// adds nothing (see DECISIONS.md, round 24).
export const ROSTER_FIT = {
  spread: 0.85, // how much a roster player's archetype leanings show in his ratings
  noise: 3, // and a little of his own
  fiveWeight: 0.75,
  bench: 4, // the rotation players after the five
  // measured over 1,100 seasons of smart careers: spread p10 2.46, p50 3.40, p90 4.46; lean
  // toward the system p10 -2.86, p90 2.22; bench against the usual one p10 -3.44, p90 3.78
  sdRef: 3.4, // the profile's spread (rating points) that counts as neither balanced nor lopsided
  sdK: 1, // how far from it a fully balanced (or lopsided) profile is
  leanK: 2.5, // the lean toward the system's ratings that counts as a full match
  shapeMid: 0.33, // the average of the better of the two, taken off so the average roster is neutral
  shape: 0.8, // team strength for a full shape score
  depthK: 3.5, // bench OVR above the league's usual bench for a full depth score
  depth: 0.5,
  dialMin: 0.5, // the mode's team-factor dial, but never below this
};

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
  playoffGrind: 1.0, // round 22: strength his team gives up in NBA playoff games (every opponent raises its game)
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

/**
 * The locker room and the head coach (round 32, career/locker.ts). One talk with each person each
 * half; the chemistry they build or burn (team strength for the rest of the season) is capped at
 * `cap` a season either way. A star of the league (reputation `fireRep`, NBA only, once a season)
 * can have the coach fired: the new one's strength factor is drawn around `newCoach`, the room
 * splits (`fireChem` off this season's chemistry), he gets his way (`fireMorale`), the new coach
 * starts at `fireTrust` and the papers call him a coach killer (`fireRepCost`).
 */
export const LOCKER = {
  cap: 0.6,
  rookie: { mentor: 0.15, tough: -0.05 },
  star: { close: 5, twoman: 0.2, twomanFar: 0.1, alpha: -0.15 },
  vet: { minutes: -0.1 },
  joker: { focus: 0.05 },
  quiet: { film: 0.3, filmChem: 0.05 },
  hothead: { calm: 0.6, calmWin: 0.15, calmLose: -0.05, square: 0.5, squareWin: 0.1, squareLose: -0.2 },
  feud: { breakup: 0.25, side: -0.1, out: -0.05 },
  fireRep: 90,
  newCoach: 0.2,
  fireChem: 0.4,
  fireMorale: 6,
  fireTrust: 60,
  fireRepCost: 2,
};

/**
 * The head coach's bigger role (round 32, owner: "can we give the coach a slightly bigger role?";
 * career/coach.ts). Temperament nudges a season a little; a role talk once a season; NBA teams
 * that lose badly may fire their coach; a losing team at midseason puts its coach on the hot seat;
 * a Coach of the Year.
 */
export const COACH = {
  temper: {
    players: { chem: 0.1, post: 0, morale: 1, trustMul: 0.8, grind: 1 },
    tactician: { chem: 0, post: 0.15, morale: 0, trustMul: 1, grind: 1 },
    hardliner: { chem: 0, post: 0, morale: -1, trustMul: 1.25, grind: 1.05 },
  },
  // the role talk: a base chance, + per point of trust over 50, by temperament, + near the top of the roster
  ask: { base: 0.3, trust: 0.012, temper: { players: 0.15, tactician: 0, hardliner: -0.1 }, top: 0.15, min: 0.05, max: 0.9, yesMorale: 3, noTrust: 3, noTrustHard: 6, noMorale: 3 },
  newTrust: 50, // a new coach starts here
  hire: 0, // a new NBA coach's factor, on average
  fireBelow: 0.35, // an NBA team under this win share may fire its coach in the offseason
  fireChance: 0.45,
  hotSeat: 0.4, // the hot seat: his team under this win share at midseason (12 games or more)
  backSave: { base: 0.25, rep: 0.005 }, // backing him in public: the chance he keeps his job
  backTrust: 8, // what backing him is worth if he stays
  letGoRep: 60, // reputation needed to tell the front office to let him go
  coyTrust: 3, // his coach named Coach of the Year
};

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
export const DUO = { realChance: 0.25, real: [0.65, 1] as [number, number], plain: [0.05, 0.3] as [number, number], fit: 0.1, grow: 55, winW: 30, trustW: 0.2, sd: 8, start: 0.6, perSeason: 0.15, team: 1.2, perf: 0.035, ast: 0.12, usage: 0.04, stay: 3, restart: 60, trio: { team: 1.0, perf: 0.02, ast: 0.06, usage: -0.03 } };

/** A mode's dial (round 14): 1 unless the mode sets it. */
export const modeDial = (mode: Mode, k: 'mini' | 'teamFx' | 'ringChase'): number => MODES[mode]?.[k] ?? 1;
