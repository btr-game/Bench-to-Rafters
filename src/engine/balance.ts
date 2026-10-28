// Every tunable number lives here. Section references point to SPEC.md.
// The balance targets in SPEC section 15 are the real requirement; change these
// constants (not the code) to hit them.

import type { AttrKey, Pos, LevelKey, HalfPlan, RoleKey, GrowthType, AgingProfile } from './types';

export const ATTRS: AttrKey[] = ['SHT', 'FIN', 'PLY', 'PER', 'INT', 'REB', 'ATH', 'IQ'];
export const POSITIONS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

// §6 OVR weights by position
export const OVR_WEIGHTS: Record<Pos, Record<AttrKey, number>> = {
  PG: { SHT: 0.18, FIN: 0.1, PLY: 0.26, PER: 0.12, INT: 0.02, REB: 0.04, ATH: 0.12, IQ: 0.16 },
  SG: { SHT: 0.26, FIN: 0.14, PLY: 0.14, PER: 0.14, INT: 0.02, REB: 0.04, ATH: 0.13, IQ: 0.13 },
  SF: { SHT: 0.17, FIN: 0.15, PLY: 0.12, PER: 0.16, INT: 0.07, REB: 0.08, ATH: 0.14, IQ: 0.11 },
  PF: { SHT: 0.1, FIN: 0.17, PLY: 0.07, PER: 0.09, INT: 0.16, REB: 0.17, ATH: 0.14, IQ: 0.1 },
  C: { SHT: 0.05, FIN: 0.18, PLY: 0.05, PER: 0.05, INT: 0.24, REB: 0.22, ATH: 0.12, IQ: 0.09 },
};

// §6 height ranges at full growth (inches)
export const HEIGHT_RANGE: Record<Pos, [number, number]> = {
  PG: [72, 77],
  SG: [75, 79],
  SF: [77, 81],
  PF: [79, 83],
  C: [81, 86],
};

export const ARCHETYPE_TOTAL = 320;
export const REROLL_SPREAD = 3;

// §6 focus stats
export const FOCUS_MULT = 1.8;
export const NON_FOCUS_MULT = 0.85;
export const MAX_FOCUS_CHANGES = 3;

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
export const POTENTIAL: SkewDist = { base: 45, mu: 2.97, sigma: 0.6, min: 47, max: 103 };
// stat caps may sit above 99 so elite players can actually reach the top of the scale
export const CAP_MAX = 110;
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
export const BASE_RATE: [number, number][] = [
  [14, 2.4],
  [17, 2.4],
  [19, 2.4],
  [21, 2.0],
  [23, 1.5],
  [25, 0.9],
  [27, 0.3],
  [29, 0],
];
export const EARLY_BLOOMER = { ageShift: 2, until: 20, youngBoost: 1.15, youngBefore: 18, plateauEarlier: 2 };
export const LATE_BLOOMER = { youngMult: 0.8, youngBefore: 21, minutesGate: 0.85 };
export const HEADROOM_DIV = 25;
export const HEADROOM_MAX = 1.5;
export const CAP_FROM_START = 0.45;
// Overall multiplier on all growth (tuning knob for the whole curve).
export const GROWTH_SCALE = 1.0;

// minutes share (mpg / game length) → factor
export const MINUTES_FACTOR: [number, number][] = [
  [0, 0.25], // did not play
  [0.0001, 0.4],
  [0.1, 0.65],
  [0.25, 0.85],
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
export const HALF_PLANS: Record<HalfPlan, PlanDef> = {
  balanced: { growth: 1.0, injury: 1.0, morale: 0, trust: 0, rep: [0, 0], usage: 1, teamBoost: 0 },
  grind: { growth: 1.3, injury: 1.7, morale: -4, trust: 1, rep: [0, 0], usage: 1, teamBoost: 0 },
  recovery: { growth: 0.75, injury: 0.5, morale: 4, trust: 0, rep: [0, 0], usage: 0.95, teamBoost: 0 },
  spotlight: { growth: 0.85, injury: 1.05, morale: 2, trust: -3, rep: [3, 8], usage: 1.15, teamBoost: -0.3 },
  teamfirst: { growth: 0.95, injury: 1.0, morale: 2, trust: 6, rep: [0, 1], usage: 0.88, teamBoost: 0.6 },
  shooting: { growth: 1.0, injury: 0.95, morale: 0, trust: 0, rep: [0, 0], usage: 1.03, teamBoost: 0, attrs: { SHT: 2.4 }, other: 0.6, rangeGain: 2 },
  strength: { growth: 1.0, injury: 1.2, morale: -1, trust: 0, rep: [0, 0], usage: 1, teamBoost: 0, attrs: { FIN: 1.9, REB: 1.9, ATH: 1.9, INT: 1.6 }, other: 0.55 },
  playmaking: { growth: 1.0, injury: 1.0, morale: 0, trust: 2, rep: [0, 0], usage: 0.97, teamBoost: 0.2, attrs: { PLY: 2.2, IQ: 2.0 }, other: 0.6 },
  defense: { growth: 1.0, injury: 1.05, morale: 0, trust: 3, rep: [0, 0], usage: 0.95, teamBoost: 0.3, attrs: { PER: 2.2, INT: 2.0 }, other: 0.6 },
  offhand: { growth: 1.0, injury: 1.0, morale: -1, trust: 0, rep: [0, 0], usage: 0.97, teamBoost: 0, attrs: { FIN: 1.3, PLY: 1.2 }, other: 0.5, offhandGain: 7 },
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
export const PLAN_OUTCOMES: PlanOutcome[] = [
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
export const DECLINE_START = { durable: 32, normal: 30, fragile: 28 } as const;
export const DECLINE_TABLE = [-0.8, -1.2, -1.6, -2.2, -2.8, -3.5];
export const DECLINE_ATTR_MULT: Partial<Record<AttrKey, number>> = { ATH: 1.8, SHT: 0.5, IQ: 0.3 };
export const IQ_LATE_GAIN = { perSeason: 0.3, untilAge: 33 };
export const SUDDEN_DECLINE = { fromAge: 31, chance: 0.08, min: 4, max: 8 };
export const DECLINE_NOISE = 0.3;

// §7 injuries
export const BASE_INJURY = 0.0135; // per game played
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
  ast36: { base: 3.2, rating: 0.2, min: 0.4, max: 12 },
  stl36: { base: 1.0, per: 0.03, ath: 0.008, min: 0.2, max: 3 },
  blk36: { base: 0.55, int: 0.035, height: 0.12, wing: 0.06, min: 0, max: 4.2 },
  tov36: { base: 1.0, fga: 0.055, ast: 0.16, iq: 0.02, min: 0.4, max: 5 },
  moraleSwing: 0.12,
};

// §10 value score
export const VALUE = { reb: 0.9, ast: 1.4, stl: 2, blk: 2, tov: 1, effAvgTs: 0.565, effMult: 0.9 };
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
  sixth: 1,
  pointsPer: 1500,
  ncaaTitle: 2,
  euro: 2,
  hof: 45,
  firstBallot: 80,
};

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
export const FA_INTEREST = {
  maxRank: 11,
  perPoint: 0.3, // expected offers per OVR point above the league's average 11th man
  shareW: 1.0,
  repW: 0.02,
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
  ovrMean: 51.5,
  ovrSd: 4.6,
  potMean: 62.5,
  potSd: 7.5,
  wOvr: 0.55,
  wPot: 0.35,
  wRep: 0.1,
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

export const EVENTS = { midseasonMax: 2, offseasonMax: 2, midseasonChance: 0.9, secondChance: 0.4, offseasonChance: 0.85 };
