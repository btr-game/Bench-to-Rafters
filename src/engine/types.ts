// GameState and every data type. Everything here must be plain JSON.

import type { Rng } from './rng';

export type Pos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type AttrKey = 'SHT' | 'FIN' | 'PLY' | 'PER' | 'INT' | 'REB' | 'ATH' | 'IQ';
export type Attrs = Record<AttrKey, number>;
export type LevelKey = 'HSJV' | 'HSV' | 'NCAA' | 'GL' | 'EU' | 'INT' | 'NBA';
export type Stage = 'HS' | 'NCAA' | 'GL' | 'EU' | 'INT' | 'NBA' | 'FA' | 'RETIRED';
export type HalfPlan = 'balanced' | 'grind' | 'recovery' | 'spotlight' | 'teamfirst' | 'shooting' | 'strength' | 'playmaking' | 'defense' | 'offhand' | 'speed' | 'mentor';
export type RoleKey = 'key' | 'starter' | 'sixth' | 'rotation' | 'bench' | 'deep';
export type GrowthType = 'early' | 'standard' | 'late';
export type AgingProfile = 'durable' | 'normal' | 'fragile';
export type NcaaTier = 'blue' | 'power' | 'major' | 'mid';

export interface Injury {
  key: 'dtd' | 'minor' | 'major' | 'season';
  name: string;
  daysOut: number;
  ovrLoss?: number; // OVR the injury cost right away
}

/** Round 22: one injury of his career. */
export interface InjuryRecord {
  age: number;
  year?: number;
  name: string;
  key: Injury['key'];
  days: number;
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

export type HighKey = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tpm';
export interface CareerHigh {
  v: number;
  year: number;
  level: LevelKey;
  team: string;
  opp: string;
  post?: string; // round name when it came in the postseason
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
  anomaly?: string; // a rare gift, e.g. "Point center"
  ringChaser?: string; // round 15: the specialist role he took to chase a ring (keeps his archetype fixed)
  fit?: { name: string; conf: number }[]; // the scouts' last read on his game (player/classify.ts)
  height: number;
  fullHeight: number; // true adult height (hidden while he grows)
  heightProj: number; // the doctors' projection of fullHeight
  wingspan: number;
  weight?: number; // lb (player/weight.ts); missing in careers saved before round 20
  build?: number; // hidden: his natural frame, lb over (or under) the ideal at adult size
  frame?: Partial<Attrs>; // what his current weight adds to or takes from each rating
  muscles?: Partial<Record<import('./player/body').Muscle, number>>; // round 22: what training built, by muscle group
  injuries?: InjuryRecord[]; // round 22: every injury, for the body map and the timeline
  hometown: string;
  country: string; // see content/origins
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
  growthRate: number; // hidden: how fast he improves (see GROWTH_RATE)
  wear: number; // body wear 0-100 (see WEAR)
  longevity?: number; // round 24: hidden, built by looking after the body (see LONGEVITY)
  lab?: { credits: number; earned: number; spent: Partial<Record<AttrKey, number>> }; // built in a lab
  nickname?: Nickname; // round 25: what the media calls him (career/nickname.ts)
  brand?: BrandDeal; // round 25: his own logo on a brand's products
  visits?: Record<string, number>; // round 25: shop id -> the season he last went (content/visits.ts)
  staff?: StaffMember[]; // round 25: people he pays (career/staff.ts)
  legacyBonus?: number; // round 25: legacy points from the legacy projects he funded
  press?: { next: number; fx: number }; // round 25: the season of the next press conference, and its effect on next season's team
  wardrobe?: { owned: string[]; on: Partial<Record<import('../content/shop').WearSlot, string>> }; // round 25: accessories (shop ids); 'none' takes a slot off
}

export interface Nickname {
  id: string; // content/nicknames.ts
  name: string; // with his name, number or town filled in
  why: string;
  reasons: string[]; // what the picker saw in him
  year: number;
}

export interface StaffMember {
  id: number;
  role: import('../content/staff').StaffRole;
  name: string;
  level: number; // 1-3: a raise moves him up
  since: number;
  talked?: number; // the season he last stopped by
  paid: number; // $M so far
}

export interface BrandDeal {
  brand: string;
  color: string;
  kind: 'deal' | 'line'; // a fixed deal, or a signature line that pays with his fame
  years: number;
  left: number; // seasons to go
  perYear: number; // $M: the fixed pay, or the line's base
  since: number;
  earned: number; // $M so far
  shoe: number; // signature shoes released (the next is shoe + 1)
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

export interface SeriesResult {
  a: string;
  b: string;
  wa: number;
  wb: number;
  winner: string;
  games?: [number, number][]; // a's score, b's score
  label?: string;
}

export interface SeriesMvp {
  award: string;
  name: string;
  team: string;
  line: string;
  isUser: boolean;
}

export interface Bracket {
  rounds: { name: string; series: SeriesResult[] }[];
  champion: string;
  playIn?: SeriesResult[];
  mvps?: SeriesMvp[];
  seeds?: Record<string, number>; // NBA: conference seed by team id
}

/** One NBA season in the league's record book (fictional players). */
export interface NbaYearRecord {
  year: number;
  champion: string;
  runnerUp: string;
  finals: string; // e.g. "4–2"
  finalsMvp: SeriesMvp | null;
  awards: { award: string; name: string; team: string; ovr: number; line: string; isUser: boolean }[];
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
  label?: string; // display name when it differs from the level's (international youth leagues)
}

export interface AwardRace {
  award: string;
  userRank: number | null;
  top: { name: string; team: string; value: number; line?: string; ovr?: number; isUser?: boolean }[];
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
  newHighs?: string[]; // NBA career highs set this season
  breakthrough?: string; // what made it a breakthrough season
  holdout?: boolean;
  height?: number; // round 22: his height and weight at the end of the season
  weight?: number;
}

export interface TourneyRecord {
  year: number;
  name: string;
  team: string;
  result: string;
  medal?: 'gold' | 'silver' | 'bronze';
  line: StatLine | null;
  games?: GameLog[];
  // how the rest of the event went: other results and the champion
  notes?: string[];
}

export interface DecisionLogEntry {
  year: number;
  age: number;
  kind: string;
  text: string;
  ref?: string; // team id, for later story links
  tier?: string; // round 22: how a turning point turned out (Breakthrough ... Backfired)
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
  asked?: number; // round 25: asks made in contract talks (career/negotiate.ts)
}

export interface SeasonState {
  year: number;
  fines?: number; // round 25: fines this season (career/fines.ts)
  level: LevelKey;
  half: 0 | 1 | 2; // halves completed
  plan: HalfPlan;
  plan2?: HalfPlan | null; // a second plan this half (each at reduced strength)
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
  teamBonus?: number; // team factors this season (career/team.ts)
  postBonus?: number; // added to the team bonus in postseason games (team style, team story)
  styleFx?: { perf: number; usage: number }; // his fit with the team's style (career/identity.ts)
  duoFx?: { perf: number; ast: number; usage: number }; // round 20: his duo (career/duo.ts)
  teamNotes?: string[];
  teamFx?: { label: string; value: number; playoff?: number }[]; // round 25: the same factors as numbers (career/breakdown.ts)
  outcomes?: { half: number; plan: HalfPlan; plan2?: HalfPlan | null; outcome: string; text: string; ovrGain: number }[];
}

export type Step =
  | 'preseason'
  | 'firstHalf' // ready to play first half
  | 'midseason'
  | 'secondHalf'
  | 'postseason' // playing the postseason game by game
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

export interface Rivalry {
  level: 'draft' | 'starter' | 'mvp'; // it only ever goes up
  pid: number; // the rival, a generated NBA player
  name: string;
  pos: Pos;
  since: number;
  team: string; // where he plays now
  w: number; // head to head, his team against yours
  l: number;
  seasons: { year: number; me: number; him: number }[]; // OVR, season by season
  notes: string[]; // what happened between them, newest last
  ended?: string; // why it ended (he retired)
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
export interface EventResult {
  title: string;
  choice: string;
  text: string;
  changes: { label: string; value: string; good: boolean }[];
  tier?: string; // how it turned out, e.g. "Backfired"
  tierKey?: 'breakthrough' | 'better' | 'expected' | 'mixed' | 'backfired';
}

export interface Moment {
  id: number;
  kind: 'intro' | 'commit' | 'draft' | 'title' | 'awards' | 'camp' | 'injury' | 'event' | 'tournament' | 'fine';
  title: string;
  text: string;
  color: string;
  teamName?: string;
  lines?: string[];
  game?: GameLog & { level: LevelKey; teamShort: string };
  pick?: number;
  // result tables shown under the story: finals, series scores, MVPs
  recap?: { heading: string; rows: string[] }[];
  arc?: boolean; // a chapter of a multi-season storyline (events/arcs.ts)
  drama?: import('./story/drama').Drama; // the last minutes of a final, play by play
  lostFinal?: boolean; // a final he lost (the reel ends without the banner)
  // round 15: how the page celebrates (or doesn't) once any game reel has finished
  mood?: 'champion' | 'gold' | 'silver' | 'bronze' | 'heartbreak' | 'out';
  duo?: boolean; // round 22: the page where a duo forms shows the two of them
  logo?: string; // round 25: a nickname's logo (content/nicknames.ts id)
}

export interface GameState {
  version: 1;
  mode: import('./balance').Mode;
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
  rivalry?: Rivalry; // round 25: the one rival (career/rivalry.ts)
  feed: Reaction[];
  milestones: string[];
  retiredAt: number | null;
  verdict: string | null;
  lastSummary: SeasonRecord | null;
  notes: string[]; // short messages for the hub
  nbaSnapshot: { leader: number; over25: number; best: number; worst: number } | null;
  toast: string | null; // outcome of the last event choice, shown once by the UI
  result?: EventResult | null; // the last event's outcome with what changed
  moments: Moment[]; // story pages waiting to be shown
  purchases: string[]; // shop item ids ever bought
  tournaments: TourneyRecord[];
  nbaHistory: NbaYearRecord[];
  // the playable postseason: a snapshot from the end of the regular season and his picks
  postSnap?: { snap: GameState; picks: string[] };
  // only inside a postseason replay
  live?: import('./career/live').LiveState;
  // the last breakthrough season (career/breakthrough.ts): it unlocks a focus change that offseason
  breakthrough?: { year: number; ovr: number; key: AttrKey; gain: number } | null;
  arcs?: import('./events/arcs').ArcState[]; // storylines still unfolding
  bonds?: import('./career/duo').Bond[]; // round 20: hidden chemistry with the teammates he recruited
  recruit?: import('./career/recruit').RecruitState; // NBA: building the starting five this summer
  stories?: import('./world/stories').LeagueStory[]; // this season's league storylines
  nemesis?: string; // team id that ended his last season (flags.nemesisYear says when)
  miniOpen?: import('./career/miniBonus').MiniId[]; // round 15: mini-games his ratings have unlocked
  /** The answer to this summer's trade request (round 15: shown in the trade card). */
  tradeResult?: { year: number; ok: boolean; team?: string; color?: string; rank?: number; text: string };
  teamStyle?: { key: import('./career/identity').TeamStyle; teamId: string }; // the style he set for his team
  highs?: { nba: Partial<Record<HighKey, CareerHigh>>; all: Partial<Record<HighKey, CareerHigh>> };
  flags: Record<string, number>; // small story switches (powerhouse school, power agent...)
  schoolColor: string;
}
