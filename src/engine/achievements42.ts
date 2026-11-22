// After round 42 (the checklist, item 5; owner, round 32: "we might run out of them quickly. add
// more"): the Floor's latest batch in the book. The Floor became a game of its own with the
// franchises' faces and sixth men, Jokic's Sombor Shuffle, game plans (shapes and styles), three eras,
// five courts, a player on fire, the home crowd erupting, famous duos, big-head mode, the
// buzzer-beater replay, the playoffs split East and West, and the superteam draft and best-of series
// against a friend. Each of these is earned on this device, with or without a career open, from what
// a game played to its end records:
//  - the Floor's own page (ui/floor/FloorHub.tsx): floorGameRec turns the game's result (engine/floor/
//    sim.ts floorResult, its `gm` marks, the screen's replay and big heads) and the page's picks (the
//    franchises, the court, the game plan, the drafted five, a conference won) into one record, and
//    addFloorMore folds it into the totals' `mini.floor.more`;
//  - a friend online (ui/floor/FloorFriend.tsx): the totals' `floorFriend` (a win with drafted fives,
//    a friend beaten, by name) and a series decided (recordFloorSeries).
// Same rules as the rest of the book: cosmetic, pun names, conditions hidden. Only a player at the
// keys can earn them, so they are tiered by judgement, not by the harness.

import type { AchTier, CareerTotals } from './achievements';
import type { FloorPlan, FloorResult } from './floor/sim';
import { isFace, type LegendSpot } from '../content/franchiseFives';
import { NBA_TEAMS } from '../content/teams';
import { SHAPES } from './floor/court';
import { ERAS } from './floor/gimmicks';
import { FLOOR } from './balance';

/** The marks the book reads (counts of distinct things, games, points). */
export const R42_MARKS = {
  teams: [5, 15, NBA_TEAMS.length],
  faces: [10, NBA_TEAMS.length],
  /** The Floor's courts (ui/floor/view.ts COURTS; a test keeps the two in step). */
  courts: 5,
  row: [5, 8],
  lit: 3,
  roars: 3,
  duo: 10,
  sixth: 3,
  buzzer: 3,
  big: 10,
  /** Points on the break in a win; points let in over a whole game played with grit and grind. */
  fast: 8,
  lock: 10,
  /** A legend's level for a superteam, and below which a five is blue-collar. */
  star: 95,
  blue: 90,
  /** Wins over one friend. */
  rival: 10,
};

/** What the Floor's own page keeps for this batch (the totals' mini.floor.more). */
export interface FloorMore {
  /** Franchises won with, franchise faces steered to a win, eras, courts, team styles and shapes won with, conferences won. */
  teams: string[];
  faces: string[];
  eras: string[];
  courts: string[];
  styles: string[];
  shapes: string[];
  confs: string[];
  /** The most in one game: times his men caught fire, times his crowd erupted, his own makes in a row. */
  lit: number;
  roars: number;
  row: number;
  /** Wins: with a famous duo on his team, with a man off the bench his top scorer, on a replayed
   * buzzer-beater, in big-head mode, over Denver, with five drafted legends all 95 or more, with five
   * drafted under 90, in overtime, with grit and grind letting in R42_MARKS.lock or fewer. */
  duo: number;
  sixth: number;
  buzzer: number;
  big: number;
  nuggets: number;
  stars: number;
  blue: number;
  ot: number;
  lock: number;
  /** The most points on the break in a win, and games with a double-double of his own. */
  fast: number;
  dd: number;
}
const NO_MORE: FloorMore = { teams: [], faces: [], eras: [], courts: [], styles: [], shapes: [], confs: [], lit: 0, roars: 0, row: 0, duo: 0, sixth: 0, buzzer: 0, big: 0, nuggets: 0, stars: 0, blue: 0, ot: 0, lock: 0, fast: 0, dd: 0 };

/** One game on the Floor's own page, as this batch reads it. */
export interface FloorGameRec {
  win: boolean;
  /** His franchise (not for a drafted five or his own player) and the other one. */
  team?: string;
  opp?: string;
  /** The franchise face he steered, if he steered one. */
  face?: string;
  era: string;
  court?: string;
  style?: string;
  shape?: string;
  /** The conference he won (the bracket's conference finals). */
  conf?: 'East' | 'West';
  /** A drafted five's legends rated R42_MARKS.star or more, and whether none reached R42_MARKS.blue. */
  stars?: number;
  blue?: boolean;
  lit: number;
  roars: number;
  row: number;
  duo: boolean;
  sixth: boolean;
  replay: boolean;
  big: boolean;
  ot: boolean;
  fast: number;
  allowed: number;
  dd: boolean;
}

/** The record of a game from its result and the page's picks. */
export function floorGameRec(r: FloorResult, o: { team?: string; opp?: string; court?: string; plan?: FloorPlan | null; conf?: 'East' | 'West'; drafted?: LegendSpot[] }): FloorGameRec {
  const mine = r.box.filter((b) => b.team === 0);
  const steered = mine.find((b) => b.user);
  const top = Math.max(0, ...mine.map((b) => b.box.pts));
  // a man off the bench his team's top scorer, alone at the top
  const leaders = mine.filter((b) => b.box.pts === top);
  const ten = (n: number) => n >= 10;
  return {
    win: r.win,
    team: o.team,
    opp: o.opp,
    face: steered && isFace(steered.name) ? steered.name : undefined,
    era: r.gm.era,
    court: o.court ?? 'arena',
    style: o.plan?.style,
    shape: o.plan?.shape,
    conf: o.conf,
    stars: o.drafted ? o.drafted.filter((l) => l.ovr >= R42_MARKS.star).length : undefined,
    blue: o.drafted ? o.drafted.length === 5 && o.drafted.every((l) => l.ovr < R42_MARKS.blue) : undefined,
    lit: r.gm.lit,
    roars: r.gm.roars,
    row: r.gm.row,
    duo: r.gm.duo,
    sixth: top > 0 && leaders.length === 1 && !leaders[0].starter,
    replay: !!r.replay,
    big: !!r.big,
    ot: r.overtimes > 0,
    fast: r.fast[0],
    allowed: r.them - r.start[1],
    dd: ten(r.line.pts) && (ten(r.line.reb) || ten(r.line.ast)),
  };
}

const add = (xs: string[], x: string | undefined, yes: boolean) => (yes && x && !xs.includes(x) ? [...xs, x] : xs);

/** This batch's totals after one more game (a new object). */
export function addFloorMore(m: FloorMore | undefined, r: FloorGameRec): FloorMore {
  const f = { ...NO_MORE, ...m };
  const w = r.win;
  const n = (yes: boolean) => (w && yes ? 1 : 0);
  return {
    teams: add(f.teams, r.team, w),
    faces: add(f.faces, r.face, w),
    eras: add(f.eras, r.era, w),
    courts: add(f.courts, r.court, w),
    styles: add(f.styles, r.style, w),
    shapes: add(f.shapes, r.shape, w),
    confs: add(f.confs, r.conf, w),
    lit: Math.max(f.lit, r.lit),
    roars: Math.max(f.roars, r.roars),
    row: Math.max(f.row, r.row),
    duo: f.duo + n(r.duo),
    sixth: f.sixth + n(r.sixth),
    buzzer: f.buzzer + n(r.replay),
    big: f.big + n(r.big),
    nuggets: f.nuggets + n(r.opp === 'DEN'),
    stars: f.stars + n((r.stars ?? 0) >= 5),
    blue: f.blue + n(!!r.blue),
    ot: f.ot + n(r.ot),
    lock: f.lock + n(r.style === 'grind' && r.allowed <= R42_MARKS.lock),
    fast: w ? Math.max(f.fast, r.fast) : f.fast,
    dd: f.dd + (r.dd ? 1 : 0),
  };
}

interface Ach42 {
  id: string;
  name: string;
  tier: AchTier;
  how: string;
  test: (f: { t: CareerTotals }) => boolean;
}
const A = (id: string, name: string, tier: AchTier, how: string, test: (f: { t: CareerTotals }) => boolean): Ach42 => ({ id, name, tier, how, test });
const mo = (f: { t: CareerTotals }): FloorMore => ({ ...NO_MORE, ...f.t.mini?.floor?.more });
const fr = (f: { t: CareerTotals }) => f.t.floorFriend;
const M = R42_MARKS;
const STYLES = Object.keys(FLOOR.play).length;
const SHAPE_COUNT = Object.keys(SHAPES).length;

export const ACHIEVEMENTS_42: Ach42[] = [
  // ---- the franchises and their faces ----
  A('fh-team5', 'Road Trip', 'rotation', `Win games on the Floor with ${M.teams[0]} different franchises.`, (f) => mo(f).teams.length >= M.teams[0]),
  A('fh-team15', 'Half the League', 'allstar', `Win games on the Floor with ${M.teams[1]} different franchises.`, (f) => mo(f).teams.length >= M.teams[1]),
  A('fh-team30', 'League Pass', 'hof', 'Win a game on the Floor with every franchise.', (f) => mo(f).teams.length >= M.teams[2]),
  A('fh-face1', 'Face Value', 'bench', 'Win a game on the Floor steering a franchise’s face.', (f) => mo(f).faces.length >= 1),
  A('fh-face10', 'Saving Face', 'allstar', `Win games on the Floor steering ${M.faces[0]} different franchise faces.`, (f) => mo(f).faces.length >= M.faces[0]),
  A('fh-face30', 'Mount Rushmore', 'hof', 'Win a game on the Floor steering every franchise’s face.', (f) => mo(f).faces.length >= M.faces[1]),
  A('fh-joker', 'The Joker’s Wild', 'rotation', 'Win a game on the Floor steering Nikola Jokic.', (f) => mo(f).faces.includes('Nikola Jokic')),
  A('fh-nuggets', 'Shuffled Off', 'rotation', 'Beat the Denver Nuggets on the Floor.', (f) => mo(f).nuggets >= 1),
  A('fh-sixth', 'Bench Press', 'starter', 'Win a game on the Floor with a man off your bench as your top scorer.', (f) => mo(f).sixth >= 1),
  A('fh-sixth3', 'Second Unit', 'allstar', `Win ${M.sixth} games on the Floor with a man off your bench as your top scorer.`, (f) => mo(f).sixth >= M.sixth),
  // ---- the eras and the courts ----
  A('fh-era90', 'Hand Check, Please', 'rotation', 'Win a game on the Floor in the nineties.', (f) => mo(f).eras.includes('nineties')),
  A('fh-era60', 'Two Points of View', 'rotation', 'Win a game on the Floor in the sixties.', (f) => mo(f).eras.includes('sixties')),
  A('fh-eras', 'Back to the Future', 'starter', 'Win a game on the Floor in every era.', (f) => ERAS.every((e) => mo(f).eras.includes(e))),
  A('fh-roof', 'Top of the World', 'rotation', 'Win a game on the Floor on the rooftop.', (f) => mo(f).courts.includes('rooftop')),
  A('fh-beach', 'Beach Bum', 'rotation', 'Win a game on the Floor on the beach.', (f) => mo(f).courts.includes('beach')),
  A('fh-street', 'Asphalt Jungle', 'rotation', 'Win a game on the Floor on the street court.', (f) => mo(f).courts.includes('street')),
  A('fh-gym', 'Disco Inferno', 'rotation', 'Win a game on the Floor in the 1970s gym.', (f) => mo(f).courts.includes('gym')),
  A('fh-courts', 'Court Circuit', 'allstar', 'Win a game on the Floor on every court.', (f) => mo(f).courts.length >= M.courts),
  // ---- on fire, the crowd, the duos ----
  A('fh-fire', 'He’s Heating Up', 'bench', 'Catch fire on the Floor.', (f) => mo(f).row >= FLOOR.gimmick.fireMakes),
  A('fh-row5', 'On Autopilot', 'starter', `Make ${M.row[0]} shots in a row in a game on the Floor.`, (f) => mo(f).row >= M.row[0]),
  A('fh-row8', 'Unconscious', 'hof', `Make ${M.row[1]} shots in a row in a game on the Floor.`, (f) => mo(f).row >= M.row[1]),
  A('fh-lit3', 'Three-Alarm Fire', 'allstar', `Have your men catch fire ${M.lit} times in one game on the Floor.`, (f) => mo(f).lit >= M.lit),
  A('fh-crowd', 'Bring the House Down', 'bench', 'Get your crowd on its feet on the Floor.', (f) => mo(f).roars >= 1),
  A('fh-crowd3', 'Decibel Meter', 'starter', `Get your crowd on its feet ${M.roars} times in one game on the Floor.`, (f) => mo(f).roars >= M.roars),
  A('fh-duo', 'Peanut Butter and Jelly', 'bench', 'Win a game on the Floor with a famous duo on your team.', (f) => mo(f).duo >= 1),
  A('fh-duo10', 'Partners in Crime', 'starter', `Win ${M.duo} games on the Floor with a famous duo on your team.`, (f) => mo(f).duo >= M.duo),
  // ---- the buzzer and the big heads ----
  A('fh-buzzer', 'Beat the Buzzer', 'allstar', 'Win a game on the Floor with a buzzer-beater worth a replay.', (f) => mo(f).buzzer >= 1),
  A('fh-buzzer3', 'Instant Replay', 'hof', `Win ${M.buzzer} games on the Floor with buzzer-beaters worth a replay.`, (f) => mo(f).buzzer >= M.buzzer),
  A('fh-big', 'Swelled Head', 'bench', 'Win a game on the Floor in big-head mode.', (f) => mo(f).big >= 1),
  A('fh-big10', 'Bobblehead Night', 'rotation', `Win ${M.big} games on the Floor in big-head mode.`, (f) => mo(f).big >= M.big),
  // ---- the game plans ----
  A('fh-styles', 'Playbook', 'allstar', 'Win a game on the Floor with every team style.', (f) => mo(f).styles.length >= STYLES),
  A('fh-shapes', 'Shape Shifter', 'allstar', 'Win a game on the Floor with every shape.', (f) => mo(f).shapes.length >= SHAPE_COUNT),
  A('fh-fast', 'Seven Seconds or Less', 'allstar', `Win a game on the Floor with ${M.fast} points on the break.`, (f) => mo(f).fast >= M.fast),
  A('fh-lock', 'Mud Fight', 'starter', `Win with grit and grind on the Floor, letting in ${M.lock} points or fewer.`, (f) => mo(f).lock >= 1),
  A('fh-ot', 'Free Basketball', 'rotation', 'Win a game on the Floor in overtime.', (f) => mo(f).ot >= 1),
  A('fh-dd', 'Double Vision', 'hof', 'Have a double-double in one game on the Floor.', (f) => mo(f).dd >= 1),
  // ---- the playoffs' conferences and the draft ----
  A('fh-east', 'Eastern Promise', 'starter', 'Win the East in the Floor’s playoffs.', (f) => mo(f).confs.includes('East')),
  A('fh-west', 'Go West', 'starter', 'Win the West in the Floor’s playoffs.', (f) => mo(f).confs.includes('West')),
  A('fh-stars', 'Superteam', 'allstar', `Win a game on the Floor with five drafted legends all rated ${M.star} or more.`, (f) => mo(f).stars >= 1),
  A('fh-blue', 'Blue Collar', 'starter', `Win a game on the Floor with five drafted legends all rated under ${M.blue}.`, (f) => mo(f).blue >= 1),
  // ---- a friend online: the superteam draft and the series ----
  A('fo-draft', 'Fantasy League', 'rotation', 'Beat a friend on the Floor with a five you drafted against his.', (f) => (fr(f)?.draftWins ?? 0) >= 1),
  A('fo-series', 'Series Clincher', 'starter', 'Win a best-of-three or best-of-five series against a friend.', (f) => (fr(f)?.series ?? 0) >= 1),
  A('fo-sweep', 'Dust Pan', 'allstar', 'Sweep a friend in a best-of-five series.', (f) => (fr(f)?.sweeps ?? 0) >= 1),
  A('fo-draftseries', 'Commissioner', 'allstar', 'Win a series against a friend with drafted superteams.', (f) => (fr(f)?.draftSeries ?? 0) >= 1),
  A('fo-rival', 'Living in His Head', 'allstar', `Beat the same friend on the Floor ${M.rival} times.`, (f) => Math.max(0, ...Object.values(fr(f)?.vs ?? {})) >= M.rival),
];

/** Every one of them reads only the totals (checked with no career open). */
export const R42_TOTALS_ONLY = ACHIEVEMENTS_42.map((a) => a.id);
