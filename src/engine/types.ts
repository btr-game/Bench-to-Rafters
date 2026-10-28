// GameState and every data type. Everything here must be plain JSON.

import type { Rng } from './rng';

export type Pos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type AttrKey = 'SHT' | 'FIN' | 'PLY' | 'PER' | 'INT' | 'REB' | 'ATH' | 'IQ';
export type Attrs = Record<AttrKey, number>;
export type LevelKey = 'HSJV' | 'HSV' | 'NCAA' | 'GL' | 'EU' | 'INT' | 'NBA';
export type Stage = 'HS' | 'NCAA' | 'GL' | 'EU' | 'INT' | 'NBA' | 'FA' | 'RETIRED';
export type HalfPlan = 'balanced' | 'grind' | 'recovery' | 'spotlight' | 'teamfirst' | 'shooting' | 'strength' | 'playmaking' | 'defense' | 'offhand';
export type RoleKey = 'key' | 'starter' | 'sixth' | 'rotation' | 'bench' | 'deep';
export type GrowthType = 'early' | 'standard' | 'late';
export type AgingProfile = 'durable' | 'normal' | 'fragile';
export type NcaaTier = 'blue' | 'power' | 'major' | 'mid';

export interface Injury {
  key: 'dtd' | 'minor' | 'major' | 'season';
  name: string;
  daysOut: number;
}

export interface StatLine {
  gp: number;
  gs: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
}

export interface GameLog {
  n: number; // game number
  opp: string;
  home: boolean;
  res: 'W' | 'L';
  us: number;
  them: number;
  line: StatLine | null; // null = did not play
  post?: string; // round name in postseason
}

export interface Program {
  id: string;
  name: string;
  seasonsLeft: number;
  // per remaining season: effects applied at the start of each offseason
  steps: { attrs?: Partial<Attrs>; range?: number; offhand?: number }[];
}

export interface Contract {
  teamId: string;
  kind: 'rookie' | 'standard' | 'min' | 'exhibit10' | 'gl' | 'eu' | 'int' | 'scholarship' | 'walkon';
  salary: number; // $M per season
  years: number; // seasons remaining including the current one
  teamOptionYears: number[]; // remaining-year counts at which the team holds an option
  signedYear: number;
}

export interface UserPlayer {
  name: string;
  number: number;
  pos: Pos;
  archetype: string;
  height: number;
  fullHeight: number;
  wingspan: number;
  hometown: string;
  highSchool: string;
  age: number;
  attrs: Attrs;
  startAttrs: Attrs;
  caps: Attrs;
  range: number;
  offhand: number; // skill with the weaker hand
  hand: 'R' | 'L'; // dominant hand
  focus: AttrKey[];
  focusChanges: number;
  // hidden
  potential: number;
  growthType: GrowthType;
  aging: AgingProfile;
  durability: number;
  // visible status
  morale: number;
  trust: number;
  rep: number;
  injury: Injury | null;
  bank: number; // $M
  earnings: number; // $M
  peakOvr: number;
  scoutGrade: string | null;
  scoutRange: [number, number] | null;
  programs: Program[];
  captain: boolean;
  // temp modifiers applied next season
  injuryMultNext: number;
  declineMultNext: number;
  growthMultNext: number;
}

export interface GenPlayer {
  id: number;
  name: string;
  pos: Pos;
  shape: number; // archetype index for this position
  age: number;
  ovr: number;
  pot: number;
  height: number;
  rep: number;
  rookie?: boolean;
  dev?: number; // hidden development factor of a generated player
  contractYears: number;
  salary: number;
  // season accumulators (season level)
  s?: StatLine;
  value?: number;
  prevValue?: number;
  firstHalfValue?: number;
  defScore?: number;
  starter?: boolean;
  draftYear?: number;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  short: string;
  abbr: string;
  color: string;
  conf: string;
  div?: string;
  strength: number;
  w: number;
  l: number;
  roster: GenPlayer[];
  tier?: NcaaTier;
  coach?: number; // NBA only: persistent team factor added to roster strength
}

export interface Bracket {
  rounds: { name: string; series: { a: string; b: string; wa: number; wb: number; winner: string }[] }[];
  champion: string;
}

export interface League {
  level: LevelKey;
  year: number;
  teams: Team[];
  userTeamId: string | null;
  round: number; // schedule rounds played
  rounds: number;
  bracket: Bracket | null;
  postNote?: string;
}

export interface AwardRace {
  award: string;
  userRank: number | null;
  top: { name: string; team: string; value: number }[];
}

export interface AwardWin {
  year: number;
  level: LevelKey;
  key: string; // e.g. 'MVP', 'ALLNBA1', 'TITLE'
  label: string;
}

export interface SeasonRecord {
  year: number;
  age: number;
  level: LevelKey;
  stage: Stage;
  teamId: string;
  teamName: string;
  teamColor: string;
  role: RoleKey;
  line: StatLine;
  post: StatLine;
  w: number;
  l: number;
  result: string; // "Lost in first round", "Champion", ...
  ovrStart: number;
  ovrEnd: number;
  awards: string[];
  races: AwardRace[];
  salary: number;
  bestGame: GameLog | null;
  holdout?: boolean;
}

export interface TourneyRecord {
  year: number;
  name: string;
  team: string;
  result: string;
  medal?: 'gold' | 'silver' | 'bronze';
  line: StatLine | null;
}

export interface DecisionLogEntry {
  year: number;
  age: number;
  kind: string;
  text: string;
  ref?: string; // team id, for later story links
}

export interface Choice {
  id: string;
  label: string;
  detail?: string;
  disabled?: boolean;
  shownOdds?: number;
  risk?: 'Low' | 'Medium' | 'High';
  tags?: string[];
  meta?: Record<string, number | string | boolean | null>;
}

export interface Decision {
  id: string;
  kind: string;
  title: string;
  text: string;
  choices: Choice[];
  data?: Record<string, unknown>;
}

export interface Offer {
  id: string;
  level: LevelKey;
  teamId: string;
  teamName: string;
  teamColor: string;
  kind: Contract['kind'];
  salary: number;
  years: number;
  role: RoleKey;
  outlook: string;
  lastRecord: string;
  tier?: NcaaTier;
  teamOptionYears?: number[];
  note?: string;
}

export interface SeasonState {
  year: number;
  level: LevelKey;
  half: 0 | 1 | 2; // halves completed
  plan: HalfPlan;
  plans: HalfPlan[];
  role: RoleKey;
  roleRank: number;
  games: GameLog[];
  postGames: GameLog[];
  ovrStart: number;
  attrsStart: Attrs;
  halfLines: StatLine[];
  injuredGames: number;
  midReport: string[];
  assignedGL: boolean;
  summary: SeasonRecord | null;
  ineligibleHalf?: boolean;
  fuel?: boolean;
  rhythm?: number; // streak factor for this half
  preGames?: GameLog[];
  preReport?: string;
  cupGames?: GameLog[];
  cupResult?: string;
  allStar?: boolean;
  allStarRank?: number;
  outcomes?: { half: number; plan: HalfPlan; outcome: string; text: string; ovrGain: number }[];
}

export type Step =
  | 'preseason'
  | 'firstHalf' // ready to play first half
  | 'midseason'
  | 'secondHalf'
  | 'summary'
  | 'offseason'
  | 'retired';

export interface DraftPick {
  pick: number;
  teamId: string;
  name: string;
  ovr: number;
  pot: number;
  age: number;
  isUser: boolean;
  from: string;
}

export interface DraftResult {
  year: number;
  picks: DraftPick[];
  userPick: number | null;
  mockRange: [number, number] | null;
}

export interface Reaction {
  headline: string;
  source: string;
  comments: { user: string; text: string; tone: 'hyped' | 'disappointed' | 'heartwarming' | 'salty'; likes: number; ago: string }[];
}

/** A full-screen story page the UI shows once (commitment, draft, title, awards...). */
export interface Moment {
  id: number;
  kind: 'intro' | 'commit' | 'draft' | 'title' | 'awards' | 'camp' | 'injury' | 'event' | 'tournament';
  title: string;
  text: string;
  color: string;
  teamName?: string;
  lines?: string[];
  game?: GameLog & { level: LevelKey; teamShort: string };
  pick?: number;
}

export interface GameState {
  version: 1;
  seed: number;
  rng: Rng;
  nextId: number;
  year: number;
  step: Step;
  stage: Stage;
  hsYear: number; // 1..4
  ncaaYear: number; // 1..4 seasons used
  transferUsed: boolean;
  player: UserPlayer;
  contract: Contract | null;
  teamId: string | null; // current team id (in current league)
  affiliateNbaId: string | null; // for G League assignments / two-way
  league: League | null; // the league the player is in this season
  nba: League | null; // persistent NBA world (created lazily)
  serviceYears: number; // NBA seasons
  nbaGames: number;
  season: SeasonState | null;
  pending: Decision[];
  history: SeasonRecord[];
  awards: AwardWin[];
  log: DecisionLogEntry[];
  events: { lastSeen: Record<string, number>; once: string[] };
  draft: DraftResult | null;
  draftedBy: string | null;
  declared: boolean;
  undrafted: boolean; // went undrafted: no longer draft-eligible
  worldYearDone: number | null; // season year whose NBA draft + offseason already ran
  retireRecommended: boolean;
  stars: number;
  recruitRank: number | null;
  teamSeasons: Record<string, number>; // NBA team id -> seasons
  rivals: Record<string, number>; // generated player name -> times they beat you for an award
  feed: Reaction[];
  milestones: string[];
  retiredAt: number | null;
  verdict: string | null;
  lastSummary: SeasonRecord | null;
  notes: string[]; // short messages for the hub
  nbaSnapshot: { leader: number; over25: number; best: number; worst: number } | null;
  toast: string | null; // outcome of the last event choice, shown once by the UI
  moments: Moment[]; // story pages waiting to be shown
  purchases: string[]; // shop item ids ever bought
  tournaments: TourneyRecord[];
  flags: Record<string, number>; // small story switches (powerhouse school, power agent...)
  schoolColor: string;
}
