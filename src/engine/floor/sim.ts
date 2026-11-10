// The Floor (round 39): the end of the biggest games, played. Ten players on a 94 by 50 foot court, a
// tick every 0.075 game seconds, twenty a real second: the last six minutes of the fourth in four real
// minutes (owner, first: "let's go with 4 minutes, so time is tripled"; after playing it: "the pace of
// 1.5x is suitable for four minute game"). He is steered on both
// ends (owner: "defence too"); the other nine follow the AI below. Everything random comes from the
// state's own stream, so the same setup and the same inputs give the same game (the tests replay it),
// and a state can be kept, paused and picked up. A play's outcome is decided the moment it happens
// (a shot's make at its release), so the screen can play a short animation of it (owner: "after a
// play is determined ... a short 2~3 second animation plays"). No words here: events carry kinds and
// numbers, and the screen writes them in the player's language.
// Round 42 (owner: "take it out of minigames and develop it into a larger one"): a game can be a whole
// one, four quarters with their breaks, or start at any of them; the Floor's own game runs its clock
// at twice a career's (a setup's `rate`: twelve minutes a quarter in the same four real ones); the
// AI's ball handler takes his man off the dribble; and the engine keeps to arithmetic every browser
// does alike (court.ts), so two computers play the same game to the last bit.

import { FLOOR, type Mode } from '../balance';
import { clamp, makeRng, next, type Rng } from '../rng';
import type { Pos } from '../types';
import { COURT, RIM_Y, SPACING, attackSpot, clampSpot, cos, dist, hyp, isThree, rimOf, sin, toLine, toRim, zoneOf, type Spot, type Zone } from './court';

export interface FloorRatings {
  SHT: number;
  FIN: number;
  PLY: number;
  PER: number;
  INT: number;
  REB: number;
  ATH: number;
  IQ: number;
  /** Free-throw touch. */
  FT: number;
}

/** How a player likes to play (round 42, a legend's from his real numbers; engine/floor/legends.ts).
 * Each is 1 for a player like any other. */
export interface FloorStyle {
  /** His share of the shots: a star's is above 1. */
  use: number;
  /** How readily he takes a three (0: only to beat the clock). */
  three: number;
  /** How readily he takes his man off the dribble. */
  drive: number;
  /** How readily he posts up (0: never). */
  post: number;
  /** How readily he passes it on. */
  pass: number;
}

/** A call (round 42): one key each, nothing to choose. */
export type FloorCall = 'iso' | 'give' | 'double';

export interface FloorPlayerIn {
  id: string;
  name: string;
  pos: Pos;
  number: number;
  r: FloorRatings;
  /** How he plays; a player like any other at his position without it. */
  style?: FloorStyle;
  /** Fouls from the first three quarters. */
  fouls?: number;
  user?: boolean;
}

interface FloorTeamIn {
  name: string;
  short: string;
  color: string;
  /** The first five start; the rest come on for a player who fouls out. */
  players: FloorPlayerIn[];
}

export interface FloorSetup {
  seed: number;
  mode: Mode;
  /** His team (it attacks the right basket) and the other team. */
  us: FloorTeamIn;
  them: FloorTeamIn;
  /** The score so far (after three quarters, for a game that starts in the fourth). */
  score: [number, number];
  /** Game seconds left in the quarter it starts in (a whole quarter unless given). */
  clock?: number;
  /** The quarter it starts in (the fourth unless given): 1 is a whole game, 3 from half time. */
  quarter?: 1 | 2 | 3 | 4;
  /** Game seconds the clock moves for each second of play (1 unless given: a career's; the Floor's
   * own game gives FLOOR.rate). */
  rate?: number;
  timeouts?: [number, number];
  /** Who has the ball first; a coin flip if not given. */
  ball?: 0 | 1;
}

export interface FloorBox {
  pts: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
}

interface FloorPlayer extends FloorPlayerIn {
  team: 0 | 1;
  x: number;
  y: number;
  stamina: number;
  fouls: number;
  /** Seconds left beaten or screened (slow), or in the air after a jump. */
  slow: number;
  air: number;
  /** Round 42. His style (always there), the spot he fills (his own position, or that of the man
   * he came on for), seconds a new defence still reacts late, how fast he moved this tick (feet a
   * second) and for how many ticks he has stood still, and the starter he is on for. */
  st: FloorStyle;
  slot: Pos;
  late: number;
  vel: number;
  still: number;
  /** Ticks he has spent up the floor, away from the basket his team is defending (leaking out). */
  leak: number;
  sat?: number;
  /** A quick slide he is in the middle of (the step-back), instead of a jump to the spot. */
  dash?: { to: Spot; t: number } | null;
  on: boolean;
  box: FloorBox;
}

export type FloorEventKind = 'make' | 'miss' | 'block' | 'steal' | 'turnover' | 'foul' | 'ft' | 'rebound' | 'timeout' | 'shotclock' | 'beat' | 'out' | 'overtime' | 'end' | 'screen' | 'reach' | 'switch' | 'help' | 'quarter' | 'break' | 'post' | 'charge' | 'sub' | 'call' | 'leak';

export interface FloorEvent {
  tick: number;
  kind: FloorEventKind;
  team: 0 | 1;
  /** The player who did it (index in `players`), and the one it was done to. */
  by?: number;
  on?: number;
  pts?: number;
  zone?: Zone;
  dunk?: boolean;
  /** The move that beat his man (kind 'beat'). */
  move?: 'cross' | 'spin' | 'step' | 'drop';
  /** A hook shot, a basket on the break (kinds 'make' and 'miss'), and the call made (kind 'call'). */
  hook?: boolean;
  fast?: boolean;
  call?: FloorCall;
  /** A made free throw (kind 'ft'), an and-one (kind 'make'). */
  good?: boolean;
  and?: boolean;
  /** The quarter that just ended (kind 'quarter'; `team` is who leads, 0 when level). */
  q?: number;
}

interface Flight {
  kind: 'pass' | 'shot' | 'loose';
  from: Spot;
  to: Spot;
  t: number;
  total: number;
  by: number;
  target?: number;
  made?: boolean;
  zone?: Zone;
  three?: boolean;
  dunk?: boolean;
  /** Free throws to shoot once it lands (a foul on the shot), and an and-one. */
  fts?: number;
  and?: boolean;
  hook?: boolean;
  fast?: boolean;
}

export interface FloorState {
  rng: Rng;
  mode: Mode;
  tick: number;
  /** Game seconds left in the quarter, and on the shot clock. */
  clock: number;
  shot: number;
  /** The quarter being played (1 to 4; overtimes count in `periods`), who had the ball first, and
   * how fast the game clock runs (a setup's `rate`). */
  quarter: number;
  first: 0 | 1;
  rate: number;
  score: [number, number];
  teams: [{ name: string; short: string; color: string }, { name: string; short: string; color: string }];
  players: FloorPlayer[];
  user: number;
  /** Round 39, online (owner: "can you make the game multiplayer as well?", head to head): the
   * other team's human, with his own shot load and call, or null when the AI plays all of them.
   * `user`, `load`, `call` and `auto` stay team 0's. */
  two: { user: number; load: number; call: number; auto: boolean } | null;
  ball: { holder: number | null; x: number; y: number; flight: Flight | null };
  poss: 0 | 1;
  phase: 'live' | 'dead' | 'ft' | 'over';
  /** Game seconds a dead ball still waits (an inbound, between free throws). */
  wait: number;
  /** After a dead ball: who takes it in, and from where. */
  inbound: { team: 0 | 1; at: Spot } | null;
  ft: { by: number; left: number; at?: Spot } | null;
  teamFouls: [number, number];
  timeouts: [number, number];
  /** -1 (theirs) to 1 (his team's). */
  momentum: number;
  /** guard[i]: the player i guards (a defender), or -1. */
  guard: number[];
  /** The AI's ball handler thinks again at this tick, and drives while `drive` is set. */
  think: number;
  drive: boolean;
  /** An AI shooter loading his shot (a short gather the user can jump at). */
  gather: { by: number; t: number } | null;
  /** His shot load in game seconds while the shoot key is held; -1 when it is not. */
  load: number;
  /** He called for the ball at this tick (offence, off the ball). */
  call: number;
  screen: { by: number; on: number; t: number } | null;
  help: { by: number; t: number; double?: boolean } | null;
  /** Round 42. A fast break on (for whom, until which tick, and whether it has been told); a man
   * backing his defender down (ticks left); a side cleared for one player; a give-and-go waiting
   * for the cut; the substitutions a person asked for, made at the next dead ball. */
  brk: { team: 0 | 1; until: number; told: boolean } | null;
  post: { by: number; t: number } | null;
  iso: { team: 0 | 1; by: number; t: number } | null;
  give: { by: number; to: number; t: number } | null;
  subQ: { out: number; in: number }[];
  /** Points by period for each team (index 0 is the first quarter, 4 the first overtime), the
   * quarter the game began in with the score it began at, and points scored on the break. */
  line: [number[], number[]];
  from: number;
  start: [number, number];
  fast: [number, number];
  /** The last pass caught: by whom and when (for the assist). */
  lastPass: { by: number; tick: number } | null;
  /** The run: points in a row for one team. */
  run: { team: 0 | 1; pts: number };
  feed: FloorEvent[];
  /** Where this step's events start in `feed`. */
  fresh: number;
  periods: number;
  /** The AI is playing him this tick (Skip, or he fouled out). */
  auto: boolean;
  /** For the career's book: his team's lowest point (the margin), a go-ahead basket of his in the
   * last five seconds, and a block of his in the last ten with the game level or his team ahead. */
  marks: { low: number; winner: boolean; stop: boolean };
}

/** What he does this tick. `shoot` is held (a press loads the meter, the release shoots); the rest
 * happen on the tick they are sent. */
export interface FloorInput {
  dx?: number;
  dy?: number;
  sprint?: boolean;
  shoot?: boolean;
  /** At the release, how long he held the shoot key (game seconds), timed by the screen to the
   * millisecond; without it the engine counts whole ticks. */
  load?: number;
  /** Pass to this player (index), or to the most open man; off the ball, call for it. */
  pass?: number | 'auto' | null;
  /** A move on his man; `hook` is the post's shot (no meter). */
  move?: 'cross' | 'spin' | 'step' | 'hook' | null;
  /** A call: isolation or a give-and-go with the ball, a double team on defence. */
  call?: FloorCall | null;
  /** A substitution he asks for (two players of his team, by index): made at the next dead ball. */
  sub?: { out: number; in: number } | null;
  /** At the rim: a layup or a dunk on one tap, no meter. */
  finish?: boolean;
  pick?: boolean;
  steal?: boolean;
  block?: boolean;
  swap?: boolean;
  help?: boolean;
  timeout?: boolean;
}

const DT = FLOOR.tick;
const secs = (n: number) => Math.max(1, Math.round(n / DT));
/** In range for a shot: his own half of the court (owner: "dont let the players shoot from behind half court"). */
export const inRange = (p: Spot & { team: 0 | 1 }): boolean => toRim(p.team, p) <= COURT.w / 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * clamp(k, 0, 1);
const other = (t: 0 | 1): 0 | 1 => (t === 0 ? 1 : 0);
/** How far a rating goes from 40 (0) to 99 (1): the Floor's feel spreads over the ratings players have. */
export const ratingK = (v: number): number => clamp((v - 40) / 59, 0, 1);
const zeroBox = (): FloorBox => ({ pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 });

// ---------------- the start ----------------

export function startFloor(set: FloorSetup): FloorState {
  const rng = makeRng(set.seed);
  const players: FloorPlayer[] = [];
  ([set.us, set.them] as const).forEach((tm, team) =>
    tm.players.forEach((p, i) =>
      players.push({ ...p, team: team as 0 | 1, x: 47, y: 25, stamina: 0.85, fouls: p.fouls ?? 0, slow: 0, air: 0, st: p.style ?? { use: 1, three: 1, drive: 1, post: POSTS[p.pos], pass: 1 }, slot: p.pos, late: 0, vel: 0, still: 0, leak: 0, on: i < 5 && (p.fouls ?? 0) < FLOOR.foul.out, box: zeroBox() }),
    ),
  );
  for (const team of [0, 1] as const) while (onCourt({ players } as FloorState, team).length < 5 && benchOf({ players } as FloorState, team).length) benchOf({ players } as FloorState, team)[0].on = true;
  const user = Math.max(0, players.findIndex((p) => p.user && p.team === 0));
  const two = players.findIndex((p) => p.user && p.team === 1);
  const poss: 0 | 1 = set.ball ?? (next(rng) < 0.5 ? 0 : 1);
  const s: FloorState = {
    rng,
    mode: set.mode,
    tick: 0,
    clock: set.clock ?? FLOOR.quarter,
    shot: FLOOR.shotClock,
    quarter: set.quarter ?? 4,
    first: poss,
    rate: set.rate ?? 1,
    score: [...set.score] as [number, number],
    teams: [
      { name: set.us.name, short: set.us.short, color: set.us.color },
      { name: set.them.name, short: set.them.short, color: set.them.color },
    ],
    players,
    user,
    two: two >= 0 ? { user: two, load: -1, call: -99, auto: false } : null,
    ball: { holder: null, x: 47, y: 25, flight: null },
    poss,
    phase: 'dead',
    wait: 1,
    inbound: { team: poss, at: backcourt(poss) },
    ft: null,
    teamFouls: [0, 0],
    timeouts: set.timeouts ?? [FLOOR.timeouts, FLOOR.timeouts],
    momentum: 0,
    guard: [],
    think: 0,
    drive: false,
    gather: null,
    load: -1,
    call: -99,
    screen: null,
    help: null,
    brk: null,
    post: null,
    iso: null,
    give: null,
    subQ: [],
    line: [[], []],
    from: set.quarter ?? 4,
    start: [...set.score] as [number, number],
    fast: [0, 0],
    lastPass: null,
    run: { team: 0, pts: 0 },
    feed: [],
    fresh: 0,
    periods: 0,
    auto: false,
    marks: { low: set.score[0] - set.score[1], winner: false, stop: false },
  };
  matchUp(s);
  spread(s);
  // the game tips with the inbounder already on the ball's spot (a placement, not a move)
  const spot = clampSpot(s.inbound!.at);
  Object.assign(inbounder(s, poss, spot), spot);
  return s;
}

/** Where a team takes the ball in after a basket: under the other team's rim, its own end. */
function backcourt(team: 0 | 1): Spot {
  return { x: team === 0 ? 6 : COURT.w - 6, y: 5 };
}

export const onCourt = (s: FloorState, team: 0 | 1): FloorPlayer[] => s.players.filter((p) => p.team === team && p.on);
const benchOf = (s: FloorState, team: 0 | 1): FloorPlayer[] => s.players.filter((p) => p.team === team && !p.on && p.fouls < FLOOR.foul.out);
const idx = (s: FloorState, p: FloorPlayer) => s.players.indexOf(p);
/** The human playing for a team, or -1 (team 1 has one only in a game against a friend). */
const humanOf = (s: FloorState, team: 0 | 1): number => (team === 0 ? s.user : (s.two?.user ?? -1));
const isHuman = (s: FloorState, i: number): boolean => i === s.user || i === s.two?.user;
/** A human steers this player this tick (not the AI standing in for him). */
const driven = (s: FloorState, i: number): boolean => (i === s.user && !s.auto) || (!!s.two && i === s.two.user && !s.two.auto);
const loadOf = (s: FloorState, team: 0 | 1): number => (team === 0 ? s.load : s.two!.load);
function setLoad(s: FloorState, team: 0 | 1, v: number): void {
  if (team === 0) s.load = v;
  else s.two!.load = v;
}
const callOf = (s: FloorState, team: 0 | 1): number => (team === 0 ? s.call : (s.two?.call ?? -99));
const SLOTS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
/** How readily a player like any other posts up, by position (a legend's comes from his numbers). */
const POSTS: Record<Pos, number> = { PG: 0, SG: 0, SF: 0.1, PF: 0.45, C: 0.8 };
/** Where the other four stand when a side is cleared for one man: feet out from the baseline, feet to the far side. */
const CLEAR: [number, number][] = [
  [7, 21],
  [17, 21],
  [27, 15],
  [31, 4],
];

/** Each defender takes the man in his own position (the user keeps the one he switched to). */
function matchUp(s: FloorState): void {
  s.guard = s.players.map(() => -1);
  const order = (team: 0 | 1) => [...onCourt(s, team)].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  const d = order(other(s.poss));
  const o = order(s.poss);
  d.forEach((p, i) => (s.guard[idx(s, p)] = o[i] ? idx(s, o[i]) : -1));
}

/** Everyone to his spot for the tip. */
function spread(s: FloorState): void {
  for (const p of onCourt(s, s.poss)) Object.assign(p, spotOf(s, p));
  for (const p of onCourt(s, other(s.poss))) {
    const man = s.players[s.guard[idx(s, p)]];
    if (man) Object.assign(p, guardSpot(s, p, man));
  }
}

function spotOf(s: FloorState, p: FloorPlayer): Spot {
  let [ahead, side] = SPACING[p.slot] ?? [20, 0];
  // a side cleared for one man (round 42): the other four stand on the far side from him
  if (s.iso && s.iso.team === p.team && s.iso.by !== idx(s, p)) {
    const far = s.players[s.iso.by].y >= RIM_Y ? -1 : 1;
    const k = onCourt(s, p.team).filter((q) => idx(s, q) !== s.iso!.by).indexOf(p);
    [ahead, side] = [CLEAR[k % 4][0], CLEAR[k % 4][1] * far];
  } else if (p.slot === 'PF' && p.st.post >= 0.6) {
    // a forward who lives in the post takes the block across from the centre's
    [ahead, side] = [9, -9];
  } else if (p.st.three < 0.3 && (p.slot === 'PG' || p.slot === 'SG')) {
    // a guard who does not shoot threes stands a step inside the line
    [ahead, side] = [ahead - 5, side * 0.8];
  }
  // a slow drift around the spot, so the offense never stands still (no randomness: it is the clock)
  const k = s.tick * DT * 0.2 + idx(s, p) * 1.7;
  return clampSpot(attackSpot(p.team, ahead + sin(k) * 2, side + cos(k * 0.8) * 2));
}

/** Between his man and the basket: close on the ball, sagging off it. */
function guardSpot(s: FloorState, _d: FloorPlayer, man: FloorPlayer): Spot {
  const rim = rimOf(man.team);
  const ball = s.ball.holder === idx(s, man);
  const gap = ball ? 3.5 : toRim(man.team, man) > 20 ? 7 : 5;
  const dd = dist(man, rim) || 1;
  return clampSpot({ x: man.x + ((rim.x - man.x) / dd) * Math.min(gap, dd - 1), y: man.y + ((rim.y - man.y) / dd) * Math.min(gap, dd - 1) });
}

// ---------------- events ----------------

function emit(s: FloorState, e: Omit<FloorEvent, 'tick'>): void {
  s.feed.push({ tick: s.tick, ...e });
  if (s.feed.length > 400) {
    s.feed.splice(0, 100);
    s.fresh = Math.max(0, s.fresh - 100);
  }
}

/** The events of the latest step. */
export const freshEvents = (s: FloorState): FloorEvent[] => s.feed.slice(s.fresh);

function score(s: FloorState, team: 0 | 1, pts: number, big: boolean): void {
  s.score[team] += pts;
  const row = s.line[team];
  const k = s.quarter - 1 + s.periods;
  while (row.length <= k) row.push(0);
  row[k] += pts;
  s.marks.low = Math.min(s.marks.low, s.score[0] - s.score[1]);
  s.run = s.run.team === team ? { team, pts: s.run.pts + pts } : { team, pts };
  const m = FLOOR.momentum;
  s.momentum = clamp(s.momentum + (team === 0 ? 1 : -1) * (m.basket + (big ? m.big : 0)), -1, 1);
}

// ---------------- shots ----------------

/** Who stands closest to a spot from the other team, and how far. */
function nearestFoe(s: FloorState, team: 0 | 1, at: Spot): { p: FloorPlayer | null; d: number } {
  let best: FloorPlayer | null = null;
  let bd = Infinity;
  for (const q of onCourt(s, other(team))) {
    const d = dist(q, at);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return { p: best, d: bd };
}

/** A team is a man short at its own basket: one of its players (one somebody steers; the AI always
 * gets back) has been up the floor, waiting for the ball, while the other team attacks. */
const leaking = (p: FloorPlayer): boolean => p.leak >= secs(FLOOR.leak.secs);
const shortHanded = (s: FloorState, team: 0 | 1): boolean => s.players.some((p) => p.on && p.team === team && leaking(p));

const ratingFor = (p: FloorPlayer, zone: Zone) => (zone === 'rim' ? p.r.FIN * 0.8 + p.r.ATH * 0.2 : zone === 'paint' ? (p.r.FIN + p.r.SHT) / 2 : p.r.SHT);

/** The chance a shot from here goes in, before his meter. */
function shotChance(s: FloorState, p: FloorPlayer, at: Spot): number {
  const zone = zoneOf(p.team, at);
  const S = FLOOR.shot;
  let c = S[zone] + S.perPoint[zone] * (ratingFor(p, zone) - 70);
  const d = toRim(p.team, at);
  if (zone === 'three' && d > S.deep) c -= S.deepPerFt * (d - S.deep);
  const foe = nearestFoe(s, p.team, at);
  // (inside, a big man is bothered less by a hand in his face)
  const inside = zone === 'rim' || zone === 'paint' ? 1 - S.strong * clamp(((p.r.REB + p.r.INT) / 2 - 70) / 25, 0, 1) : 1;
  c -= Math.max(0, (FLOOR.contest.within - foe.d) / FLOOR.contest.within) * FLOOR.contest.max * inside;
  c -= (1 - p.stamina) * FLOOR.contest.tired;
  // inside, a bigger man shoots over a smaller one (rebounding and interior defence stand for size)
  if ((zone === 'rim' || zone === 'paint') && foe.p && foe.d < FLOOR.contest.within) c += S.size * clamp((p.r.REB + p.r.INT - foe.p.r.REB - foe.p.r.INT) / 2 / S.sizeFull, 0, 1);
  // five against four: a defender who leaked out left his man alone
  if (s.poss === p.team && shortHanded(s, other(p.team))) c += FLOOR.leak.shot;
  const mode = FLOOR.mode[s.mode] ?? FLOOR.mode.standard;
  c += p.team === 0 ? mode.us : mode.them;
  if ((p.team === 0 && s.momentum >= FLOOR.momentum.full) || (p.team === 1 && s.momentum <= -FLOOR.momentum.full)) c += FLOOR.momentum.edge;
  return clamp(c, S.min, S.max);
}

/** His meter's window (half-width, as a share of a full load): wider for a good shooter, narrower
 * contested or tired. */
export function meterWindow(s: FloorState, p: FloorPlayer): number {
  const M = FLOOR.meter;
  // at the line, his free-throw touch sets it and nobody is near
  const line = s.phase === 'ft';
  const foe = nearestFoe(s, p.team, p);
  const contested = line ? 0 : Math.max(0, (FLOOR.contest.within - foe.d) / FLOOR.contest.within);
  return lerp(M.window[0], M.window[1], ratingK(line ? p.r.FT : p.r.SHT)) * (1 - contested * M.contested) * (1 - (1 - p.stamina) * M.tired);
}

/** How a release lands on the meter: 1 dead centre, 0 outside the window. */
export function releaseQuality(s: FloorState, p: FloorPlayer, load: number): number {
  const off = Math.abs(load / FLOOR.meter.load - 1);
  return clamp(1 - off / Math.max(0.02, meterWindow(s, p)), 0, 1);
}

/** A shot leaves his hands: made or not, blocked, fouled, all decided now. */
function release(s: FloorState, i: number, q: number | null, dodge = 1, hook = false): void {
  const p = s.players[i];
  const at = { x: p.x, y: p.y };
  const zone = zoneOf(p.team, at);
  const three = isThree(p.team, at);
  let chance = shotChance(s, p, at);
  if (q !== null) chance = clamp(chance * lerp(FLOOR.meter.worst, FLOOR.meter.best, q), FLOOR.shot.min, FLOOR.shot.max);
  const foe = nearestFoe(s, p.team, at);
  // the hook (round 42): his finishing alone, against the interior defence of the man on him
  if (hook) chance = clamp(chance + FLOOR.shot.perPoint.paint * (p.r.FIN - ratingFor(p, zone)) + FLOOR.post.hook + FLOOR.post.perPoint * (p.r.FIN - (foe.p?.r.INT ?? 60)), FLOOR.shot.min, FLOOR.shot.max);
  // a charge (round 42): on the move into a defender who had set himself between him and the rim
  const C = FLOOR.charge;
  const moving = driven(s, i) ? p.vel > 5 : s.drive;
  if (!hook && moving && (zone === 'rim' || zone === 'paint') && foe.p && foe.d <= C.within && foe.p.still >= secs(C.still) && toRim(p.team, foe.p) < toRim(p.team, p) + 1 && next(s.rng) < C.chance * (foe.p.r.IQ / 75)) return charge(s, p, foe.p);
  // a block: a defender right there at the rim or in the paint (a human defender only if he jumped)
  const hi = humanOf(s, other(p.team));
  const hum = hi >= 0 ? s.players[hi] : null;
  const jumper = foe.p && foe.d <= FLOOR.block.reach && (zone === 'rim' || zone === 'paint') && (foe.p !== hum || hum.air > 0) ? foe.p : null;
  const userJump = hum && hum.air > 0 && dist(hum, at) <= FLOOR.block.reach + 1.5 ? hum : null;
  const blocker = userJump ?? jumper;
  if (blocker) {
    const b = FLOOR.block.base + FLOOR.block.perPoint * ((blocker.r.INT + blocker.r.ATH) / 2 - p.r.FIN / 2 - 25);
    if (next(s.rng) < clamp(b * (userJump ? 1.6 : 1) * dodge, 0, 0.5)) {
      if (blocker === s.players[s.user] && lastPeriod(s) && s.clock <= 10 * s.rate && s.score[0] >= s.score[1]) s.marks.stop = true;
      p.box.fga++;
      if (three) p.box.tpa++;
      blocker.box.blk++;
      emit(s, { kind: 'block', team: blocker.team, by: idx(s, blocker), on: i, zone });
      s.momentum = clamp(s.momentum + (blocker.team === 0 ? 1 : -1) * FLOOR.momentum.big, -1, 1);
      loose(s, i, { x: at.x + (p.team === 0 ? -6 : 6), y: at.y + (next(s.rng) - 0.5) * 10 });
      return;
    }
  }
  const made = next(s.rng) < chance;
  // a foul on the shot: at the rim it is about his finishing against the man on him
  const fr = zone === 'rim' || zone === 'paint' ? FLOOR.foul.rim + FLOOR.foul.perPoint * (p.r.FIN - (foe.p?.r.INT ?? 50)) : FLOOR.foul.jumper;
  const fouled = foe.p && foe.d < 5 && next(s.rng) < clamp(fr, 0, 0.35) ? foe.p : null;
  const dunk = zone === 'rim' && p.r.ATH >= 70 && made;
  const d = toRim(p.team, at);
  s.ball.holder = null;
  s.ball.flight = { kind: 'shot', from: at, to: rimOf(p.team), t: secs(zone === 'rim' ? 0.45 : 0.6 + d / 60), total: secs(zone === 'rim' ? 0.45 : 0.6 + d / 60), by: i, made, zone, three, dunk: dunk && !hook, hook, fast: s.brk?.team === p.team };
  p.box.fga++;
  if (three) p.box.tpa++;
  if (fouled) {
    foul(s, fouled, false);
    s.ball.flight.fts = made ? 1 : three ? 3 : 2;
    s.ball.flight.and = made;
  }
  s.drive = false;
  s.post = null;
}

/** An offensive foul: the ball to the other team, no free throws. */
function charge(s: FloorState, by: FloorPlayer, on: FloorPlayer): void {
  by.fouls++;
  by.box.pf++;
  by.box.tov++;
  emit(s, { kind: 'charge', team: on.team, by: idx(s, on), on: idx(s, by) });
  s.momentum = clamp(s.momentum + (on.team === 0 ? 1 : -1) * FLOOR.momentum.big, -1, 1);
  if (by.fouls >= FLOOR.foul.out) fouledOut(s, by);
  dead(s, on.team, { x: by.x, y: by.y < 25 ? 0.5 : COURT.h - 0.5 }, 1);
}

/** A layup or a dunk on one tap (owner: "make chances of getting blocked or stealed when an
 * opponent is close, but just one tap ... athleticism reduces chance of getting blocked/stolen"):
 * no meter; a defender close by may strip him on the way up, or block it, less often the more
 * athletic he is. */
function finish(s: FloorState, i: number): void {
  const p = s.players[i];
  const F = FLOOR.finish;
  const foe = nearestFoe(s, p.team, p);
  const dodge = 1 - F.athletic * ratingK(p.r.ATH);
  const near = foe.p ? clamp((F.within - foe.d) / F.within, 0, 1) : 0;
  if (foe.p && near > 0 && next(s.rng) < F.strip * near * dodge) {
    const di = idx(s, foe.p);
    foe.p.box.stl++;
    p.box.tov++;
    emit(s, { kind: 'steal', team: foe.p.team, by: di, on: i });
    s.ball.holder = di;
    change(s, foe.p.team);
    return;
  }
  release(s, i, null, dodge);
}

/** A shot or a block that comes loose: a rebound to fight for. */
function loose(s: FloorState, by: number, to: Spot): void {
  s.ball.holder = null;
  s.ball.flight = { kind: 'loose', from: { x: s.ball.x, y: s.ball.y }, to: clampSpot(to), t: secs(FLOOR.rebound.wait), total: secs(FLOOR.rebound.wait), by };
}

function land(s: FloorState, f: Flight): void {
  const p = s.players[f.by];
  // a rebound's bounce reaches the man who won it
  if (f.kind === 'loose' && f.target !== undefined) return secure(s, f.target);
  if (f.kind === 'pass') {
    const r = s.players[f.target!];
    s.ball.holder = f.target!;
    s.ball.flight = null;
    if (r.team !== p.team) return; // picked off: the steal was told when it happened
    s.lastPass = { by: f.by, tick: s.tick };
    return;
  }
  if (f.kind === 'shot') {
    if (f.made) {
      const pts = f.three ? 3 : 2;
      p.box.fgm++;
      p.box.pts += pts;
      if (f.three) p.box.tpm++;
      if (s.lastPass && s.tick - s.lastPass.tick < secs(4) && s.players[s.lastPass.by].team === p.team && s.lastPass.by !== f.by) s.players[s.lastPass.by].box.ast++;
      if (f.by === s.user && lastPeriod(s) && s.clock <= 5 * s.rate && s.score[0] <= s.score[1] && s.score[0] + pts > s.score[1]) s.marks.winner = true;
      score(s, p.team, pts, !!f.dunk || !!f.three || !!f.and);
      if (f.fast) s.fast[p.team] += pts;
      emit(s, { kind: 'make', team: p.team, by: f.by, pts, zone: f.zone, dunk: f.dunk, and: f.and, hook: f.hook, fast: f.fast });
    } else emit(s, { kind: 'miss', team: p.team, by: f.by, zone: f.zone, hook: f.hook });
    s.lastPass = null;
    if (f.fts) return freeThrows(s, f.by, f.fts);
    if (f.made) return dead(s, other(p.team), backcourt(other(p.team)), 1.2);
    // a miss: long shots come off long
    const out = f.three ? 11 : f.zone === 'rim' ? 4 : 7;
    const a = next(s.rng) * Math.PI - Math.PI / 2;
    const rim = rimOf(p.team);
    return loose(s, f.by, { x: rim.x + (p.team === 0 ? -1 : 1) * Math.abs(cos(a)) * out, y: rim.y + sin(a) * out });
  }
  rebound(s, f);
}

/** Who comes down with a loose ball: the closest and the best on the boards, the offense a little
 * less. The ball bounces to him (nobody jumps to it). */
function rebound(s: FloorState, f: Flight): void {
  const shooterTeam = s.players[f.by].team;
  const all = s.players.filter((p) => p.on);
  // (a defence a man short gives up more of them)
  const short = shortHanded(s, other(shooterTeam)) ? FLOOR.leak.board : 1;
  const w = all.map((p) => {
    const d = dist(p, f.to);
    if (d > 18) return 0;
    const k = p.r.REB / 50;
    // (a real rebounder is worth a little more than his number alone: `big`, from 70 up)
    const big = 1 + FLOOR.rebound.big * clamp((p.r.REB - 70) / 25, 0, 1);
    return k * k * big * (1 / (1 + d / 3)) * (p.team === shooterTeam ? FLOOR.rebound.offense * short : 1);
  });
  const tot = w.reduce((a, b) => a + b, 0);
  let k = next(s.rng) * tot;
  let win = all.findIndex((_, i) => (k -= w[i]) <= 0);
  if (win < 0) win = all.findIndex((p) => p.team !== shooterTeam);
  const r = all[Math.max(0, win)];
  const ri = idx(s, r);
  const d = dist(r, f.to);
  if (d <= 2) return secure(s, ri);
  const t = secs(clamp(d / FLOOR.rebound.bounce, 0.15, 0.6));
  s.ball.flight = { kind: 'loose', from: { ...f.to }, to: { x: r.x, y: r.y }, t, total: t, by: f.by, target: ri };
}

/** He comes down with it. */
function secure(s: FloorState, ri: number): void {
  const r = s.players[ri];
  r.box.reb++;
  s.ball.flight = null;
  s.ball.holder = ri;
  emit(s, { kind: 'rebound', team: r.team, by: ri });
  if (r.team === s.poss) s.shot = Math.max(s.shot, FLOOR.offReboundClock);
  else change(s, r.team);
  s.think = s.tick + secs(0.4);
}

/** The ball changes hands: the new defense picks up its men. */
function change(s: FloorState, to: 0 | 1, live = true): void {
  s.poss = to;
  s.shot = FLOOR.shotClock;
  s.drive = false;
  s.gather = null;
  s.screen = null;
  s.help = null;
  s.post = null;
  s.iso = null;
  s.give = null;
  s.lastPass = null;
  // he keeps the man he switched to only for the possession
  matchUp(s);
  // off a steal or a rebound, the new offence runs (round 42): the new defence starts late
  s.brk = live ? { team: to, until: s.tick + secs(FLOOR.fastBreak.secs), told: false } : null;
  if (live) {
    for (const d of onCourt(s, other(to))) if (!driven(s, idx(s, d))) d.late = FLOOR.fastBreak.react * (1.5 - d.r.IQ / 100);
    s.think = Math.min(s.think, s.tick + secs(0.3));
  }
}

/** A dead ball: the clock stops, `team` takes it in from `at` after `wait` game seconds. */
function dead(s: FloorState, team: 0 | 1, at: Spot, wait: number): void {
  s.ball.flight = null;
  s.ball.holder = null;
  s.phase = 'dead';
  s.wait = wait;
  s.inbound = { team, at };
  s.gather = null;
  s.drive = false;
  s.load = -1;
  s.brk = null;
  s.post = null;
  s.give = null;
  const subbed = substitutions(s);
  if (team !== s.poss) change(s, team, false);
  else if (subbed) matchUp(s);
}

// ---------------- substitutions (round 42) ----------------

/** One man on for another at a dead ball: he comes on from the scorer's table, into the other's spot. */
function swapIn(s: FloorState, out: FloorPlayer, inn: FloorPlayer, his?: number): void {
  out.on = false;
  inn.on = true;
  Object.assign(inn, { x: 47 + (inn.team === 0 ? -3 : 3), y: 0.5, slow: 0, air: 0, late: 0, vel: 0, still: 0, leak: 0, dash: null, slot: out.slot, sat: his });
  out.sat = undefined;
  emit(s, { kind: 'sub', team: inn.team, by: idx(s, inn), on: idx(s, out) });
}

const GROUP: Record<Pos, number> = { PG: 0, SG: 0, SF: 1, PF: 2, C: 2 };

/** The dead ball's substitutions: what a person asked for, the starters whose legs are back (or
 * all of them, to close the game), then a rested man for each starter whose legs are gone. A
 * person's own player never sits unless he fouls out. True when anybody changed. */
function substitutions(s: FloorState): boolean {
  const S = FLOOR.subs;
  let any = false;
  // nobody goes off and comes straight back on at the same dead ball
  const off = new Set<FloorPlayer>();
  for (const q of s.subQ.splice(0)) {
    const out = s.players[q.out];
    const inn = s.players[q.in];
    if (!out || !inn || out.team !== inn.team || !out.on || inn.on || inn.fouls >= FLOOR.foul.out || isHuman(s, q.out)) continue;
    swapIn(s, out, inn);
    off.add(out);
    any = true;
  }
  for (const team of [0, 1] as const) {
    const close = lastPeriod(s) && s.clock <= S.close * s.rate;
    for (const b of onCourt(s, team)) {
      if (b.sat === undefined) continue;
      const st = s.players[b.sat];
      if (st.on || st.fouls >= FLOOR.foul.out) b.sat = undefined;
      else if (st.stamina >= S.back || close) {
        swapIn(s, b, st);
        off.add(b);
        any = true;
      }
    }
    if (close) continue;
    for (const p of onCourt(s, team)) {
      if (p.stamina >= S.tired || p.sat !== undefined || isHuman(s, idx(s, p))) continue;
      // a rested man nobody is waiting to come back for: his own position first, then his kind
      const waited = new Set(onCourt(s, team).map((q) => q.sat));
      const fit = (b: FloorPlayer) => (b.pos === p.slot ? 2 : GROUP[b.pos] === GROUP[p.slot] ? 1 : 0);
      const b = benchOf(s, team)
        .filter((q) => q.stamina >= S.fresh && !waited.has(idx(s, q)) && !off.has(q))
        .sort((x, y) => fit(y) - fit(x) || idx(s, x) - idx(s, y))[0];
      if (!b) continue;
      swapIn(s, p, b, idx(s, p));
      any = true;
    }
  }
  return any;
}

// ---------------- fouls and free throws ----------------

function foul(s: FloorState, by: FloorPlayer, emitIt = true): void {
  by.fouls++;
  by.box.pf++;
  s.teamFouls[by.team]++;
  if (emitIt) emit(s, { kind: 'foul', team: by.team, by: idx(s, by) });
  if (by.fouls >= FLOOR.foul.out) fouledOut(s, by);
}

/** His sixth foul: off he goes, the best defender left on the bench on for him. */
function fouledOut(s: FloorState, by: FloorPlayer): void {
  by.on = false;
  const sub = benchOf(s, by.team).sort((a, b) => b.r.PER + b.r.INT - (a.r.PER + a.r.INT))[0];
  if (sub) Object.assign(sub, { on: true, x: by.x, y: by.y, slot: by.slot, sat: undefined });
  // a human who fouls out: the quarter plays on without him at the controls (stepFloor's auto)
  emit(s, { kind: 'out', team: by.team, by: idx(s, by), on: sub ? idx(s, sub) : undefined });
  matchUp(s);
}

/** A foul away from a shot: two shots in the bonus, else the ball in from the side. */
function commonFoul(s: FloorState, by: FloorPlayer, on: number): void {
  foul(s, by);
  if (s.teamFouls[by.team] >= FLOOR.foul.bonus) return freeThrows(s, on, 2);
  const p = s.players[on];
  dead(s, p.team, { x: p.x, y: p.y < 25 ? 0.5 : COURT.h - 0.5 }, 1);
  s.shot = Math.max(s.shot, FLOOR.offReboundClock);
}

function freeThrows(s: FloorState, by: number, n: number): void {
  s.ball.flight = null;
  s.ball.holder = null;
  s.phase = 'ft';
  const p = s.players[by];
  const rim = rimOf(p.team);
  s.ft = { by, left: n, at: { x: rim.x + (p.team === 0 ? -15 : 15), y: rim.y } };
  s.wait = 0.8;
  s.load = -1;
}

/** Who takes the ball in: the nearest teammate to the spot, never a human (owner: "dont make the
 * user's player the inbounder. it kinda makes the game seem laggy"). */
function inbounder(s: FloorState, team: 0 | 1, at: Spot): FloorPlayer {
  const on = onCourt(s, team);
  const pool = on.filter((p) => !isHuman(s, idx(s, p)));
  return (pool.length ? pool : on).sort((a, b) => dist(a, at) - dist(b, at))[0];
}

/** Who the inbound goes to: him, on his team; else the best ball handler. */
function receiver(s: FloorState, taker: FloorPlayer): number | null {
  const mates = onCourt(s, taker.team).filter((p) => p !== taker);
  const me = mates.find((p) => idx(s, p) === humanOf(s, taker.team));
  if (me) return idx(s, me);
  const handle = (p: FloorPlayer) => p.r.PLY + 12 * (p.st.pass - 1);
  const best = mates.sort((a, b) => handle(b) - handle(a))[0];
  return best ? idx(s, best) : null;
}

/** Where the others stand for a free throw: four along the lane, the rest behind the arc. */
function laneSpot(s: FloorState, p: FloorPlayer, shooter: FloorPlayer): Spot {
  const rim = rimOf(shooter.team);
  const dir = shooter.team === 0 ? -1 : 1;
  const others = s.players.filter((q) => q.on && q !== shooter);
  const k = others.indexOf(p);
  if (k < 4) return { x: rim.x + dir * (6 + 4 * Math.floor(k / 2)), y: rim.y + (k % 2 ? 8 : -8) };
  return clampSpot({ x: rim.x + dir * 25, y: rim.y + (k - 5.5) * 8 });
}

/** A free throw: his are on the meter, the AI's on their touch. */
function shootFt(s: FloorState, q: number | null): void {
  const ft = s.ft!;
  const p = s.players[ft.by];
  const base = lerp(FLOOR.ft[0], FLOOR.ft[1], p.r.FT / 100);
  const c = q === null ? base : clamp(base * lerp(0.7, 1.05, q), 0.05, 0.99);
  const good = next(s.rng) < c;
  p.box.fta++;
  if (good) {
    p.box.ftm++;
    p.box.pts++;
    score(s, p.team, 1, false);
  }
  emit(s, { kind: 'ft', team: p.team, by: ft.by, good });
  ft.left--;
  if (ft.left > 0) {
    s.wait = 0.8;
    return;
  }
  s.ft = null;
  s.phase = 'live';
  if (good) return dead(s, other(p.team), backcourt(other(p.team)), 1);
  // a missed last free throw: the defense is lined up for it
  const rim = rimOf(p.team);
  loose(s, ft.by, { x: rim.x + (p.team === 0 ? -5 : 5), y: rim.y + (next(s.rng) - 0.5) * 8 });
  s.ball.x = rim.x;
  s.ball.y = rim.y;
}

// ---------------- moving ----------------

function topSpeed(s: FloorState, p: FloorPlayer, sprint: boolean): number {
  let v = lerp(FLOOR.speed[0], FLOOR.speed[1], ratingK(p.r.ATH)) * (0.75 + 0.25 * p.stamina);
  if (sprint) v *= FLOOR.sprint;
  if (p.slow > 0) v *= 0.35;
  if (p.late > 0) v *= 0.5;
  if (s.ball.holder === idx(s, p)) v *= 0.92;
  return v;
}

function stepToward(s: FloorState, p: FloorPlayer, to: Spot, sprint = false): number {
  if (p.air > 0) return 0;
  const d = dist(p, to);
  if (d < 0.05) return 0;
  const v = Math.min(topSpeed(s, p, sprint) * DT, d);
  p.x += ((to.x - p.x) / d) * v;
  p.y += ((to.y - p.y) / d) * v;
  Object.assign(p, clampSpot(p));
  return v / DT;
}

/** Where an AI player wants to be this tick. */
function aiTarget(s: FloorState, p: FloorPlayer): Spot {
  const i = idx(s, p);
  if (p.team === s.poss) {
    if (s.ball.holder === i) return s.drive ? rimOf(p.team) : spotOf(s, p);
    // a fast break (round 42): the first two up the floor fill the lanes to the rim, the rest trail
    if (s.brk && s.brk.team === p.team) {
      const up = onCourt(s, p.team)
        .filter((q) => idx(s, q) !== s.ball.holder && !driven(s, idx(s, q)))
        .sort((a, b) => toRim(p.team, a) - toRim(p.team, b) || idx(s, a) - idx(s, b));
      const k = up.indexOf(p);
      if (k === 0 || k === 1) return attackSpot(p.team, 5.5, (up[0].y >= RIM_Y ? 8 : -8) * (k === 0 ? 1 : -1));
    }
    if (s.screen && s.screen.by === i) {
      const d = s.players[s.screen.on];
      return { x: d.x + (p.team === 0 ? -1.5 : 1.5), y: d.y };
    }
    // a cut: a smart player whose man is ball-watching goes to the rim
    const man = s.players[s.guard.findIndex((g) => g === i)];
    if (man && dist(man, p) > 8 && p.r.IQ >= 60 && Math.floor(s.tick / secs(3)) % 4 === i % 4) return { x: rimOf(p.team).x + (p.team === 0 ? -3 : 3), y: 25 + (i % 2 ? 3 : -3) };
    return spotOf(s, p);
  }
  // defense: his man; the help when the ball has beaten its man near the rim
  if (s.help && s.help.by === i && s.ball.holder !== null) {
    const h = s.players[s.ball.holder];
    return { x: h.x + (h.team === 0 ? 2 : -2), y: h.y };
  }
  if (s.ball.holder !== null) {
    const h = s.players[s.ball.holder];
    const hd = s.players.find((_, k) => s.guard[k] === s.ball.holder);
    const beaten = hd && toRim(h.team, hd) > toRim(h.team, h) + 1 && toRim(h.team, h) < 14;
    if (beaten && p !== hd && p.r.INT >= 50 && isNearestHelp(s, p, h)) return { x: h.x + (h.team === 0 ? 2.5 : -2.5), y: h.y };
  }
  const man = s.players[s.guard[i]];
  return man ? guardSpot(s, p, man) : rimOf(other(p.team));
}

function isNearestHelp(s: FloorState, p: FloorPlayer, h: FloorPlayer): boolean {
  const rim = rimOf(h.team);
  let best: FloorPlayer | null = null;
  let bd = Infinity;
  for (const q of onCourt(s, p.team)) {
    if (s.guard[idx(s, q)] === idx(s, h)) continue;
    const d = dist(q, rim);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best === p;
}

// ---------------- the AI's ball handler ----------------

/** The pass the AI would make: the most open teammate, him first when he called for it. */
function bestPass(s: FloorState, from: FloorPlayer): { to: number; open: number } | null {
  let best: { to: number; open: number } | null = null;
  for (const q of onCourt(s, from.team)) {
    const j = idx(s, q);
    if (q === from) continue;
    const lane = Math.min(...onCourt(s, other(from.team)).map((d) => toLine(d, from, q)));
    if (lane < FLOOR.pass.lane) continue;
    // (round 42) a star draws the ball, and a big man with position in the post gets his feed
    let open = nearestFoe(s, q.team, q).d * (0.6 + shotChance(s, q, q)) * (0.55 + 0.45 * q.st.use);
    if (q.st.post >= 0.5 && toRim(q.team, q) <= FLOOR.post.far) open += 3 * q.st.post;
    const hum = humanOf(s, from.team);
    if (j === hum && s.tick - callOf(s, from.team) < secs(1.5)) open += 20;
    if (j === hum) open *= 1.25; // the star gets the ball
    if (!best || open > best.open) best = { to: j, open };
  }
  return best;
}

/** The teammate a pass of his would find, the most open (the screen marks him). */
export function openMan(s: FloorState): number | null {
  return bestPass(s, s.players[s.user])?.to ?? null;
}

/** Whether a player stands open: nobody from the other team within `FLOOR.open` feet. */
export const isOpen = (s: FloorState, i: number): boolean => nearestFoe(s, s.players[i].team, s.players[i]).d >= FLOOR.open;

function aiHandler(s: FloorState, i: number): void {
  if (s.tick < s.think || s.gather) return;
  const p = s.players[i];
  s.think = s.tick + secs(FLOOR.think);
  // his man reaches in (an AI defender; a human steals with his own key)
  const d = s.players.find((_, k) => s.guard[k] === i);
  if (d && d.on && !driven(s, idx(s, d)) && dist(d, p) < FLOOR.steal.reach && next(s.rng) < FLOOR.strip * (d.r.PER / 70) * (1.3 - p.r.PLY / 100)) {
    const di = idx(s, d);
    d.box.stl++;
    p.box.tov++;
    emit(s, { kind: 'steal', team: d.team, by: di, on: i });
    s.ball.holder = di;
    change(s, d.team);
    return;
  }
  // a double team (round 42): the second defender reaches in as well
  const K = FLOOR.calls;
  const dbl = s.help && s.help.double ? s.players[s.help.by] : null;
  const doubled = !!dbl && dbl.on && dist(dbl, p) < FLOOR.steal.reach + 1;
  if (doubled && next(s.rng) < FLOOR.strip * K.strip * (dbl!.r.PER / 70) * (1.3 - p.r.PLY / 100)) {
    const di = idx(s, dbl!);
    dbl!.box.stl++;
    p.box.tov++;
    emit(s, { kind: 'steal', team: dbl!.team, by: di, on: i });
    s.ball.holder = di;
    change(s, dbl!.team);
    return;
  }
  const st = p.st;
  const here = shotChance(s, p, p);
  const zone = zoneOf(p.team, p);
  const open = nearestFoe(s, p.team, p).d;
  // (round 42) a star takes the shot a role player passes up, a shooter the three; a man who never
  // shot threes takes one only to beat the clock
  const want = zone === 'three' ? clamp(0.36 - 0.07 * (st.three - 1), 0.28, 0.5) : zone === 'rim' ? 0.5 : clamp(0.42 - 0.03 * (st.use - 1), 0.36, 0.5);
  const never = zone === 'three' && st.three <= 0.05;
  // an open jumper only once the offense has run a little of the shot clock; a layup any time
  const settled = FLOOR.shotClock - s.shot >= FLOOR.patience / (zone === 'three' ? Math.max(1, st.three) : 1 + 0.3 * Math.max(0, st.use - 1));
  if (inRange(p) && (s.shot < 3 || (!never && here >= want && open >= FLOOR.open - (st.use - 1) && settled) || (zone === 'rim' && here >= 0.45))) {
    s.gather = { by: i, t: secs(zone === 'rim' ? 0.5 : 1.1) };
    return;
  }
  // a fast break (round 42): the pass ahead to a runner, the outlet to a guard, or he pushes it himself
  if (s.brk && s.brk.team === p.team) {
    const F = FLOOR.fastBreak;
    const foes = onCourt(s, other(p.team));
    const clear = (q: FloorPlayer) => Math.min(...foes.map((f) => toLine(f, p, q))) >= F.lane;
    let to: FloorPlayer | null = null;
    let near = toRim(p.team, p) - F.ahead;
    for (const q of onCourt(s, p.team)) {
      const dq = toRim(p.team, q);
      if (q === p || dq >= near || !clear(q)) continue;
      near = dq;
      to = q;
    }
    if (to && next(s.rng) < F.outlet) return throwPass(s, i, idx(s, to));
    if (p.r.PLY < F.handle) {
      const guard = onCourt(s, p.team)
        .filter((q) => q !== p && q.r.PLY >= p.r.PLY + 8 && dist(q, p) < 35 && clear(q))
        .sort((a, b) => b.r.PLY - a.r.PLY || idx(s, a) - idx(s, b))[0];
      if (guard) return throwPass(s, i, idx(s, guard));
    }
    s.drive = true;
    return;
  }
  const pass = bestPass(s, p);
  // doubled, he finds the man left open
  if (doubled && pass && next(s.rng) < K.out) return throwPass(s, i, pass.to);
  // a give-and-go (round 42): the ball back to the man who gave it, once his cut has him open
  if (s.give && s.give.to === i) {
    const g = s.players[s.give.by];
    s.think = s.tick + secs(0.25);
    if (g.on && Math.min(...onCourt(s, other(p.team)).map((f) => toLine(f, p, g))) >= FLOOR.pass.lane && (toRim(g.team, g) < 12 || nearestFoe(s, g.team, g).d >= 5)) {
      const to = s.give.by;
      s.give = null;
      return throwPass(s, i, to);
    }
    return;
  }
  // he called for it, off the ball: a pass to him when the lane is clear
  if (pass && pass.to === humanOf(s, p.team) && s.tick - callOf(s, p.team) < secs(1.5)) return throwPass(s, i, pass.to);
  // the post (round 42): his back to the basket, his man on him
  const PO = FLOOR.post;
  const far = toRim(p.team, p);
  if (!s.drive && st.post > 0 && d && d.on && dist(d, p) < PO.on && far >= PO.near && far <= PO.far && s.shot > 4 && next(s.rng) < clamp(PO.urge * st.post, 0, 0.9)) {
    s.post = { by: i, t: secs(lerp(PO.secs[0], PO.secs[1], next(s.rng))) };
    emit(s, { kind: 'post', team: p.team, by: i, on: idx(s, d) });
    return;
  }
  // a star has a side cleared for him now and then
  if (!s.iso && st.use >= 1.3 && settled && s.shot > 8 && far > 14 && next(s.rng) < 0.1) {
    s.iso = { team: p.team, by: i, t: K.iso };
    emit(s, { kind: 'call', team: p.team, by: i, call: 'iso' });
  }
  // a lane to the rim: drive it
  const rim = rimOf(p.team);
  const lane = Math.min(...onCourt(s, other(p.team)).filter((d) => d.slow <= 0).map((d) => toLine(d, p, rim)));
  if (lane > 3.5 && p.r.FIN >= 55 && toRim(p.team, p) > 6) {
    s.drive = true;
    return;
  }
  // no lane: he makes one, off the dribble (round 42), the more often the better he finishes
  const A = FLOOR.attack;
  if (!s.drive && d && d.on && d.slow <= 0 && dist(d, p) < A.near && toRim(p.team, p) > A.far && inRange(p) && s.shot > A.clock) {
    const urge = clamp(A.base + A.perPoint * ((p.r.FIN + p.r.ATH) / 2 - 70), A.min, A.max) * (settled ? A.settle : 1) * st.drive * (s.iso && s.iso.by === i ? 2.5 : 1);
    if (next(s.rng) < urge) {
      const M = FLOOR.move;
      const di = idx(s, d);
      if (next(s.rng) < clamp(M.beat + M.perPoint * ((p.r.PLY + p.r.ATH) / 2 - d.r.PER), 0.15, 0.85)) {
        d.slow = M.slow * (driven(s, di) ? A.human : 1);
        emit(s, { kind: 'beat', team: p.team, by: i, on: di, move: next(s.rng) < 0.5 ? 'cross' : 'spin' });
        s.drive = true;
      } else if (next(s.rng) < M.lose) {
        p.box.tov++;
        d.box.stl++;
        emit(s, { kind: 'steal', team: d.team, by: di, on: i });
        s.ball.holder = di;
        change(s, d.team);
      }
      return;
    }
  }
  // a pick from the big, now and then
  if (!s.screen && next(s.rng) < 0.18) {
    const big = onCourt(s, p.team).find((q) => q !== p && (q.pos === 'C' || q.pos === 'PF') && idx(s, q) !== humanOf(s, p.team));
    const d = s.players.findIndex((_, k) => s.guard[k] === i);
    if (big && d >= 0) s.screen = { by: idx(s, big), on: d, t: 3 };
  }
  if (pass && pass.open > open * 1.3 + 2 && next(s.rng) < clamp(0.7 * st.pass, 0.2, 0.95)) return throwPass(s, i, pass.to);
}

/** The end of a back-down (round 42): out to the open man when a second defender has come, a drop
 * step past his man, or the hook. */
function postMove(s: FloorState, i: number): void {
  const p = s.players[i];
  const PO = FLOOR.post;
  s.post = null;
  const d = s.players.find((_, k) => s.guard[k] === i);
  if (onCourt(s, other(p.team)).filter((q) => dist(q, p) < 6).length >= 2) {
    const pass = bestPass(s, p);
    if (pass && next(s.rng) < PO.kick) return throwPass(s, i, pass.to);
  }
  if (d && d.on && next(s.rng) < PO.drop * (0.5 + ratingK(p.r.ATH))) {
    const M = FLOOR.move;
    if (next(s.rng) < clamp(M.beat + M.perPoint * ((p.r.FIN + p.r.ATH) / 2 - d.r.INT), 0.15, 0.85)) {
      d.slow = M.slow;
      emit(s, { kind: 'beat', team: p.team, by: i, on: idx(s, d), move: 'drop' });
      s.drive = true;
      return;
    }
  }
  if (inRange(p)) release(s, i, null, PO.block, true);
}

/** Backing his man down: toward the rim, slowly. */
function backDown(s: FloorState, p: FloorPlayer): number {
  const rim = rimOf(p.team);
  const d = dist(p, rim);
  if (d <= FLOOR.post.near || p.air > 0) return 0;
  const v = Math.min(topSpeed(s, p, false) * FLOOR.post.pace * DT, d - FLOOR.post.near);
  p.x += ((rim.x - p.x) / d) * v;
  p.y += ((rim.y - p.y) / d) * v;
  return v / DT;
}

function throwPass(s: FloorState, from: number, to: number): void {
  const p = s.players[from];
  const r = s.players[to];
  s.drive = false;
  // a bad pass: out of bounds (far likelier the length of the floor to a man who leaked out and
  // never saw the rebound come down)
  const wild = leaking(r) && dist(p, r) > FLOOR.leak.long ? FLOOR.leak.wild : 0;
  if (next(s.rng) < wild + FLOOR.pass.bad * (1 - (p.r.PLY - 40) / 80)) {
    p.box.tov++;
    emit(s, { kind: 'turnover', team: p.team, by: from });
    return dead(s, other(p.team), { x: r.x, y: r.y < 25 ? 0.5 : COURT.h - 0.5 }, 1);
  }
  const d = dist(p, r);
  const t = secs(d / FLOOR.pass.speed);
  // a defender in the lane may pick it off
  for (const q of onCourt(s, other(p.team))) {
    if (toLine(q, p, r) < FLOOR.pass.lane && next(s.rng) < FLOOR.pass.pick * (q.r.PER / 70) * (1 - p.r.PLY / 200)) {
      const qi = idx(s, q);
      q.box.stl++;
      p.box.tov++;
      emit(s, { kind: 'steal', team: q.team, by: qi, on: from });
      s.momentum = clamp(s.momentum + (q.team === 0 ? 1 : -1) * FLOOR.momentum.big, -1, 1);
      s.ball.holder = null;
      s.ball.flight = { kind: 'pass', from: { x: p.x, y: p.y }, to: { x: q.x, y: q.y }, t: Math.max(1, Math.round(t / 2)), total: Math.max(1, Math.round(t / 2)), by: from, target: qi };
      change(s, q.team);
      return;
    }
  }
  s.ball.holder = null;
  s.ball.flight = { kind: 'pass', from: { x: p.x, y: p.y }, to: { x: r.x, y: r.y }, t, total: t, by: from, target: to };
}

// ---------------- him (and, against a friend, the other team's human) ----------------

function userActs(s: FloorState, inp: FloorInput, T: 0 | 1): void {
  const ui = humanOf(s, T);
  const u = s.players[ui];
  if (!u.on) return;
  const O = other(T);
  const mine = s.ball.holder === ui;
  if (inp.timeout && s.timeouts[T] > 0 && (s.phase === 'dead' || (s.poss === T && s.ball.holder !== null && !s.ball.flight))) return timeout(s, T);
  if (u.team === s.poss) {
    // the shot: held loads the meter, the release shoots; at the rim one tap finishes (owner: "just
    // one tap for the lay or dunk"); never from behind half court
    if (mine && inp.finish && zoneOf(u.team, u) === 'rim') {
      setLoad(s, T, -1);
      return finish(s, ui);
    }
    const load = loadOf(s, T);
    if (mine && inp.shoot && inRange(u)) setLoad(s, T, load < 0 ? 0 : load + DT);
    else if (mine && load >= 0) {
      const q = releaseQuality(s, u, inp.load ?? load);
      setLoad(s, T, -1);
      return release(s, ui, q);
    } else setLoad(s, T, -1);
    // (round 42) the calls with the ball: a side cleared for him, or the ball given for a cut and back
    if (mine && inp.call === 'iso') {
      s.iso = { team: T, by: ui, t: FLOOR.calls.iso };
      emit(s, { kind: 'call', team: T, by: ui, call: 'iso' });
    }
    if (mine && inp.call === 'give') {
      const to = typeof inp.pass === 'number' ? inp.pass : bestPass(s, u)?.to;
      if (to !== undefined && to !== ui && s.players[to]?.team === u.team && s.players[to].on) {
        emit(s, { kind: 'call', team: T, by: ui, call: 'give' });
        throwPass(s, ui, to);
        // (a pass thrown away or picked off has changed hands already)
        if (s.poss === T && s.phase === 'live') s.give = { by: ui, to, t: FLOOR.calls.giveGo };
        return;
      }
    }
    // the hook: inside the post's range, no meter
    if (mine && inp.move === 'hook' && toRim(u.team, u) <= FLOOR.post.far && !isThree(u.team, u)) {
      setLoad(s, T, -1);
      return release(s, ui, null, FLOOR.post.block, true);
    }
    if (mine && inp.pass !== undefined && inp.pass !== null) {
      const to = inp.pass === 'auto' ? bestPass(s, u)?.to : inp.pass;
      if (to !== undefined && to !== ui && s.players[to]?.team === u.team && s.players[to].on) return throwPass(s, ui, to);
    } else if (!mine && inp.pass !== undefined && inp.pass !== null) {
      if (T === 0) s.call = s.tick;
      else s.two!.call = s.tick;
    }
    if (mine && inp.move && inp.move !== 'hook') {
      const d = s.players.find((_, k) => s.guard[k] === ui);
      if (d && dist(d, u) < 7) {
        const M = FLOOR.move;
        if (next(s.rng) < clamp(M.beat + M.perPoint * (u.r.PLY - d.r.PER), 0.1, 0.9)) {
          d.slow = M.slow;
          emit(s, { kind: 'beat', team: T, by: ui, on: idx(s, d), move: inp.move });
          if (inp.move === 'step') {
            const rim = rimOf(T);
            const k = 4 / (dist(u, rim) || 1);
            u.dash = { to: clampSpot({ x: u.x - (rim.x - u.x) * k, y: u.y - (rim.y - u.y) * k }), t: secs(0.35) };
          }
        } else if (next(s.rng) < M.lose) {
          u.box.tov++;
          d.box.stl++;
          emit(s, { kind: 'steal', team: d.team, by: idx(s, d), on: ui });
          s.ball.holder = idx(s, d);
          change(s, d.team);
          return;
        }
      }
    }
    if (inp.pick && !s.screen) {
      const big = onCourt(s, T).filter((q) => q !== u).sort((a, b) => (b.pos === 'C' ? 2 : b.pos === 'PF' ? 1 : 0) - (a.pos === 'C' ? 2 : a.pos === 'PF' ? 1 : 0))[0];
      const d = s.players.findIndex((_, k) => s.guard[k] === ui);
      if (big && d >= 0) s.screen = { by: idx(s, big), on: d, t: 3 };
    }
    return;
  }
  // defence
  setLoad(s, T, -1);
  const h = s.ball.holder !== null ? s.players[s.ball.holder] : null;
  if (inp.steal && h && !s.ball.flight) {
    // the jab itself, whatever comes of it (the screen shows his reach)
    emit(s, { kind: 'reach', team: T, by: ui, on: s.ball.holder! });
    const S = FLOOR.steal;
    const d = dist(u, h);
    if (d <= S.reach) {
      if (next(s.rng) < clamp(S.base + S.perPoint * (u.r.PER - h.r.PLY), 0.04, 0.6)) {
        u.box.stl++;
        h.box.tov++;
        emit(s, { kind: 'steal', team: T, by: ui, on: s.ball.holder! });
        s.momentum = clamp(s.momentum + (T === 0 ? 1 : -1) * FLOOR.momentum.big, -1, 1);
        s.ball.holder = ui;
        change(s, T);
        return;
      }
      if (next(s.rng) < S.foul) return commonFoul(s, u, s.ball.holder!);
    }
  }
  if (inp.block && u.air <= 0) u.air = 0.6;
  if (inp.swap) {
    const now = s.guard[ui];
    const foes = onCourt(s, O).map((q) => idx(s, q)).filter((k) => k !== now);
    const near = foes.sort((a, b) => dist(s.players[a], u) - dist(s.players[b], u))[0];
    if (near !== undefined) {
      const mate = s.guard.findIndex((g, k) => g === near && k !== ui);
      if (mate >= 0) s.guard[mate] = now;
      s.guard[ui] = near;
      emit(s, { kind: 'switch', team: T, by: ui, on: near });
    }
  }
  if (inp.help && h) {
    const mate = onCourt(s, T).filter((q) => q !== u && s.guard[idx(s, q)] !== s.ball.holder).sort((a, b) => dist(a, h) - dist(b, h))[0];
    if (mate) {
      s.help = { by: idx(s, mate), t: 2 };
      emit(s, { kind: 'help', team: T, by: idx(s, mate), on: s.ball.holder! });
    }
  }
  // (round 42) a double team: the nearest teammate stays on the ball
  if (inp.call === 'double' && h && !s.ball.flight) {
    const mate = onCourt(s, T).filter((q) => q !== u && !isHuman(s, idx(s, q)) && s.guard[idx(s, q)] !== s.ball.holder).sort((a, b) => dist(a, h) - dist(b, h) || idx(s, a) - idx(s, b))[0];
    if (mate) {
      s.help = { by: idx(s, mate), t: FLOOR.calls.double, double: true };
      emit(s, { kind: 'call', team: T, by: idx(s, mate), on: s.ball.holder!, call: 'double' });
    }
  }
}

function timeout(s: FloorState, team: 0 | 1): void {
  s.timeouts[team]--;
  for (const p of onCourt(s, team)) p.stamina = Math.min(1, p.stamina + FLOOR.stamina.timeout);
  s.momentum *= 0.5;
  emit(s, { kind: 'timeout', team });
  const h = s.ball.holder !== null ? s.players[s.ball.holder] : null;
  // everyone walks back to his spot while the coaches talk
  dead(s, s.poss, h ? { x: h.x, y: h.y < 25 ? 0.5 : COURT.h - 0.5 } : (s.inbound?.at ?? backcourt(s.poss)), 2);
}

// ---------------- a tick ----------------

/** Moves the game on one tick (0.075 game seconds) with what he does (null: the AI plays him too),
 * and against a friend what the other team's human does (`inp2`, the same way). */
export function stepFloor(s: FloorState, inp: FloorInput | null, inp2: FloorInput | null = null): void {
  s.fresh = s.feed.length;
  if (s.phase === 'over') return;
  s.tick++;
  const u = s.players[s.user];
  const auto = inp === null || !u.on;
  s.auto = auto;
  if (s.two) s.two.auto = inp2 === null || !s.players[s.two.user].on;
  const inputOf = (team: 0 | 1): FloorInput => (team === 0 ? inp : inp2)!;
  for (const p of s.players) {
    p.slow = Math.max(0, p.slow - DT);
    p.air = Math.max(0, p.air - DT);
    p.late = Math.max(0, p.late - DT);
  }
  // a substitution a person asks for waits for the next dead ball (round 42)
  for (const T of [0, 1] as const) {
    const q = (T === 0 ? (auto ? null : inp) : s.two && !s.two.auto ? inp2 : null)?.sub;
    if (q && s.players[q.out]?.team === T && s.players[q.in]?.team === T && s.subQ.length < 6) s.subQ.push({ out: q.out, in: q.in });
  }
  if (s.phase === 'ft') {
    s.wait -= DT;
    const ft = s.ft!;
    // he walks to the line and the others to the lane (owner: "dont let any players teleport")
    const shooter = s.players[ft.by];
    const line = ft.at ?? { x: shooter.x, y: shooter.y };
    for (const p of s.players.filter((q) => q.on)) stepToward(s, p, p === shooter ? line : laneSpot(s, p, shooter));
    if (s.wait > 0 || (dist(shooter, line) > 0.6 && s.wait > -FLOOR.walk)) return;
    if (driven(s, ft.by) && (s.wait > -FLOOR.ftWait || loadOf(s, shooter.team) >= 0)) {
      // his free throw waits for his release (for a while: then the AI shoots it, below)
      const T = shooter.team;
      const ip = inputOf(T);
      const load = loadOf(s, T);
      if (ip.shoot) setLoad(s, T, load < 0 ? 0 : load + DT);
      else if (load >= 0) {
        const q = releaseQuality(s, shooter, ip.load ?? load);
        setLoad(s, T, -1);
        shootFt(s, q);
      }
      return;
    }
    shootFt(s, null);
    return;
  }
  if (s.phase === 'dead') {
    if (!auto && inp!.timeout && s.timeouts[0] > 0) timeout(s, 0);
    else if (s.two && !s.two.auto && inp2!.timeout && s.timeouts[1] > 0) timeout(s, 1);
    // the other bench stops a run against it (a friend calls his own)
    else if (!s.two && s.run.team === 0 && s.run.pts >= 8 && s.timeouts[1] > 0) {
      s.run = { team: 0, pts: 0 };
      timeout(s, 1);
    }
    s.wait -= DT;
    const ib = s.inbound ?? { team: s.poss, at: backcourt(s.poss) };
    const spot = clampSpot(ib.at);
    const taker = inbounder(s, ib.team, spot);
    // the inbounder walks to the ball's spot, the rest to theirs; he passes it in once he is there
    for (const p of s.players.filter((q) => q.on)) stepToward(s, p, p === taker ? spot : p.team === s.poss ? spotOf(s, p) : aiTarget(s, p), p === taker);
    if (s.wait > 0 || (dist(taker, spot) > FLOOR.inboundReach && s.wait > -FLOOR.walk)) return;
    const ti = idx(s, taker);
    s.ball.holder = ti;
    s.ball.x = taker.x;
    s.ball.y = taker.y;
    s.phase = 'live';
    s.inbound = null;
    // the pass in: no bad pass, no pick-off (the inbound only carries the ball onto the floor)
    const to = receiver(s, taker);
    if (to !== null) {
      const r = s.players[to];
      const t = secs(dist(taker, r) / FLOOR.pass.speed);
      s.ball.holder = null;
      s.ball.flight = { kind: 'pass', from: { x: taker.x, y: taker.y }, to: { x: r.x, y: r.y }, t, total: t, by: ti, target: to };
    }
    s.think = s.tick + secs(0.5);
    return;
  }

  // the clocks
  s.clock = Math.max(0, s.clock - DT * s.rate);
  const inShot = s.ball.flight?.kind === 'shot';
  if (!inShot) s.shot -= DT;
  if (s.screen) s.screen.t -= DT;
  if (s.help) s.help.t -= DT;
  if (s.screen && s.screen.t <= 0) s.screen = null;
  if (s.help && s.help.t <= 0) s.help = null;
  if (s.iso && (s.iso.t -= DT) <= 0) s.iso = null;
  if (s.give && (s.give.t -= DT) <= 0) s.give = null;
  s.momentum *= 1 - FLOOR.momentum.fade * DT;
  // the bench rests
  for (const p of s.players) if (!p.on) p.stamina = Math.min(1, p.stamina + DT * FLOOR.stamina.rest * FLOOR.subs.rest);

  // the AI defense, trailing late, fouls to stop the clock (a defense a human plays fouls only when he does)
  const trailing = s.score[other(s.poss)] < s.score[s.poss];
  const margin = s.score[s.poss] - s.score[other(s.poss)];
  const dh = humanOf(s, other(s.poss));
  if (trailing && lastPeriod(s) && s.clock <= FLOOR.hack.secs * s.rate && margin >= FLOOR.hack.margin[0] && margin <= FLOOR.hack.margin[1] && s.ball.holder !== null && !s.ball.flight && !(dh >= 0 && driven(s, dh))) {
    const h = s.players[s.ball.holder];
    const near = onCourt(s, other(s.poss)).sort((a, b) => dist(a, h) - dist(b, h))[0];
    if (near && dist(near, h) < 3) {
      foul(s, near);
      return freeThrows(s, s.ball.holder, 2);
    }
  }

  // him, and the friend: in turn, each going first every other tick
  const acts: (0 | 1)[] = [];
  if (!auto) acts.push(0);
  if (s.two && !s.two.auto) acts.push(1);
  if (s.tick % 2) acts.reverse();
  for (const T of acts) if (s.phase === 'live') userActs(s, inputOf(T), T);
  if (s.phase !== 'live') return;

  // everyone moves
  for (const p of s.players) {
    if (!p.on) continue;
    const i = idx(s, p);
    let moved = 0;
    if (p.dash) {
      // the step-back's slide: quick, but across the floor, never a jump
      const d = dist(p, p.dash.to);
      const v = Math.min(d, FLOOR.dash * DT);
      if (d > 0.01) Object.assign(p, clampSpot({ x: p.x + ((p.dash.to.x - p.x) / d) * v, y: p.y + ((p.dash.to.y - p.y) / d) * v }));
      if (--p.dash.t <= 0 || d <= v) p.dash = null;
      p.vel = FLOOR.dash;
      p.still = 0;
      continue;
    }
    if (driven(s, i)) {
      const ip = inputOf(p.team);
      const dx = ip.dx ?? 0;
      const dy = ip.dy ?? 0;
      const len = hyp(dx, dy);
      const slowShot = loadOf(s, p.team) >= 0 ? 0.3 : 1;
      if (len > 0.01 && p.air <= 0) {
        const v = topSpeed(s, p, !!ip.sprint) * slowShot * DT;
        Object.assign(p, clampSpot({ x: p.x + (dx / len) * v, y: p.y + (dy / len) * v }));
        moved = v / DT;
      }
      p.stamina = clamp(p.stamina + DT * (ip.sprint && moved > 0 ? FLOOR.stamina.sprint : moved > 3 ? FLOOR.stamina.move : FLOOR.stamina.rest), 0.2, 1);
      p.vel = moved;
      p.still = moved < 1 ? p.still + 1 : 0;
      // leaking out: the other team has the ball over half court and he is still up the floor, past
      // the middle of it (it wears off once he is back, or his own team has had the ball a while)
      const L = FLOOR.leak;
      const ballAt = s.ball.holder !== null ? s.players[s.ball.holder] : s.ball;
      const away = s.phase === 'live' && s.poss !== p.team && toRim(s.poss, ballAt) < L.past && toRim(s.poss, p) > L.past;
      const was = leaking(p);
      p.leak = away ? Math.min(p.leak + 1, secs(L.secs + L.lasts)) : Math.max(0, p.leak - 1);
      if (!was && leaking(p)) emit(s, { kind: 'leak', team: p.team, by: i });
      continue;
    }
    // (round 42) on a break everybody runs; a man in the post backs in
    const posting = !!s.post && s.post.by === i;
    const run = !!s.brk && !posting;
    moved = posting ? backDown(s, p) : stepToward(s, p, aiTarget(s, p), run);
    p.stamina = clamp(p.stamina + DT * (run && moved > 3 ? FLOOR.stamina.sprint * FLOOR.fastBreak.legs : moved > 3 ? FLOOR.stamina.move : FLOOR.stamina.rest), 0.2, 1);
    p.vel = moved;
    p.still = moved < 1 ? p.still + 1 : 0;
  }

  // the break (round 42): told once the ball is over half court with at most one man back; over
  // once the defence is set, the ball has changed hands, or its seconds are up
  if (s.brk) {
    const B = s.brk;
    const F = FLOOR.fastBreak;
    const h = s.ball.holder !== null ? s.players[s.ball.holder] : null;
    const back = h ? onCourt(s, other(B.team)).filter((d) => toRim(B.team, d) < toRim(B.team, h)).length : 5;
    if (h && h.team === B.team && !B.told && toRim(B.team, h) < 40 && back <= 1) {
      B.told = true;
      emit(s, { kind: 'break', team: B.team, by: s.ball.holder! });
    }
    if (s.tick >= B.until || s.poss !== B.team || (h && toRim(B.team, h) < F.set && back >= F.back)) {
      s.brk = null;
      if (h && !driven(s, s.ball.holder!) && toRim(h.team, h) > 6) s.drive = false;
    }
  }

  // a screen lands on the man it was set on
  if (s.screen) {
    const sc = s.players[s.screen.by];
    const d = s.players[s.screen.on];
    if (dist(sc, d) < 2.5) {
      d.slow = Math.max(d.slow, 1);
      emit(s, { kind: 'screen', team: sc.team, by: s.screen.by, on: s.screen.on });
      s.screen = null;
    }
  }

  // the ball
  const f = s.ball.flight;
  if (s.post && s.ball.holder !== s.post.by) s.post = null;
  if (f) {
    f.t--;
    // a pass follows the man it was thrown to (round 42: a runner on the break is led)
    if (f.kind === 'pass' && f.target !== undefined) f.to = { x: s.players[f.target].x, y: s.players[f.target].y };
    const k = 1 - f.t / f.total;
    s.ball.x = lerp(f.from.x, f.to.x, k);
    s.ball.y = lerp(f.from.y, f.to.y, k);
    if (f.t <= 0) land(s, f);
  } else if (s.ball.holder !== null) {
    const h = s.players[s.ball.holder];
    s.ball.x = h.x;
    s.ball.y = h.y;
    // an AI shooter's gather, then the release
    if (s.gather) {
      s.gather.t--;
      if (s.gather.t <= 0) {
        const by = s.gather.by;
        s.gather = null;
        if (s.ball.holder === by) release(s, by, null);
      }
    } else if (!driven(s, s.ball.holder)) {
      if (s.post) {
        if (--s.post.t <= 0) postMove(s, s.ball.holder);
      } else if (s.drive && toRim(h.team, h) < 4) s.gather = { by: s.ball.holder, t: secs(0.4) };
      else aiHandler(s, s.ball.holder);
    } else if (s.help && s.help.double && s.tick % secs(FLOOR.think) === 0) {
      // a person with the ball in a double team: the second defender reaches in (round 42)
      const dbl = s.players[s.help.by];
      if (dbl.on && !driven(s, s.help.by) && dist(dbl, h) < FLOOR.steal.reach && next(s.rng) < FLOOR.strip * FLOOR.calls.strip * (dbl.r.PER / 70) * (1.3 - h.r.PLY / 100)) {
        dbl.box.stl++;
        h.box.tov++;
        emit(s, { kind: 'steal', team: dbl.team, by: s.help.by, on: s.ball.holder });
        s.ball.holder = s.help.by;
        change(s, dbl.team);
      }
    }
  }

  // the shot clock
  if (s.shot <= 0 && s.ball.holder !== null && !s.ball.flight && s.phase === 'live') {
    const h = s.players[s.ball.holder];
    h.box.tov++;
    emit(s, { kind: 'shotclock', team: h.team, by: s.ball.holder });
    dead(s, other(h.team), { x: h.x, y: h.y < 25 ? 0.5 : COURT.h - 0.5 }, 1);
  }

  // the end of the quarter (a shot in the air when the horn goes still counts)
  if (s.clock <= 0 && !(s.ball.flight && s.ball.flight.kind === 'shot') && s.phase === 'live') {
    if (s.quarter < 4) return nextQuarter(s);
    if (s.score[0] === s.score[1]) {
      s.clock = FLOOR.overtime;
      s.periods++;
      emit(s, { kind: 'overtime', team: 0 });
      dead(s, next(s.rng) < 0.5 ? 0 : 1, { x: 47, y: 25 }, 1.5);
      return;
    }
    s.phase = 'over';
    emit(s, { kind: 'end', team: s.score[0] > s.score[1] ? 0 : 1 });
  }
}

/** The fourth quarter or an overtime: the part of a game its last seconds belong to. */
const lastPeriod = (s: FloorState): boolean => s.quarter >= 4;

/** The horn between quarters (round 42): a rest for the legs, the team fouls wiped, the ball to the
 * team whose turn it is (the one that started the game has it again in the fourth, the other one
 * in the second and third); the half brings the timeouts back. */
function nextQuarter(s: FloorState): void {
  const B = FLOOR.breaks;
  const half = s.quarter === 2;
  emit(s, { kind: 'quarter', team: s.score[1] > s.score[0] ? 1 : 0, q: s.quarter });
  s.quarter++;
  s.clock = FLOOR.quarter;
  s.teamFouls = [0, 0];
  if (half) s.timeouts = [Math.max(s.timeouts[0], FLOOR.timeouts), Math.max(s.timeouts[1], FLOOR.timeouts)];
  for (const p of s.players) p.stamina = Math.min(1, p.stamina + (half ? B.half : B.quarter));
  s.momentum *= B.momentum;
  s.run = { team: 0, pts: 0 };
  const to: 0 | 1 = s.quarter === 4 ? s.first : other(s.first);
  dead(s, to, { x: 47, y: 0.5 }, B.wait);
}

/** Skip (owner: "skip available mid-game"): the rest of the game played out from here, him on the AI. */
export function skipFloor(s: FloorState): void {
  for (let i = 0; i < 400000 && s.phase !== 'over'; i++) stepFloor(s, null);
}

/** The game as it ended: the score, the win, and his line. */
export interface FloorResult {
  us: number;
  them: number;
  win: boolean;
  /** His own line. */
  line: FloorBox;
  marks: FloorState['marks'];
  /** Every player's line (round 42: his position, whether he started, whether a person steered him). */
  box: { name: string; team: 0 | 1; pos: Pos; starter: boolean; user: boolean; box: FloorBox }[];
  /** Points by period for each team from the quarter the game began in (`from`), the score it
   * began at, overtimes played, and points on the break. */
  periods: [number[], number[]];
  from: number;
  start: [number, number];
  overtimes: number;
  fast: [number, number];
}

export function floorResult(s: FloorState): FloorResult {
  const upTo = 4 + s.periods;
  const row = (t: 0 | 1) => Array.from({ length: upTo - s.from + 1 }, (_, k) => s.line[t][s.from - 1 + k] ?? 0);
  const first = [0, 1].map((t) => s.players.findIndex((p) => p.team === t));
  return {
    us: s.score[0],
    them: s.score[1],
    win: s.score[0] > s.score[1],
    line: { ...s.players[s.user].box },
    marks: { ...s.marks },
    box: s.players.map((p, i) => ({ name: p.name, team: p.team, pos: p.pos, starter: i - first[p.team] < 5, user: isHuman(s, i), box: { ...p.box } })),
    periods: [row(0), row(1)],
    from: s.from,
    start: [...s.start] as [number, number],
    overtimes: s.periods,
    fast: [...s.fast] as [number, number],
  };
}

/** A line as one number, game-score style: who had the game of the night. */
export const gameScore = (b: FloorBox): number => b.pts + 0.4 * b.fgm - 0.7 * b.fga - 0.4 * (b.fta - b.ftm) + 0.7 * b.reb + 0.7 * b.ast + b.stl + 0.7 * b.blk - 0.4 * b.pf - b.tov;

// ---------------- against a friend (round 39, online) ----------------

/** The game seen from the other end: the teams swapped and the court turned round, so the friend
 * on team 1 sees himself as team 0 attacking the right basket, as he does against the AI. A copy
 * for the screen only: the game itself goes on in the state it came from (never step this one). */
export function mirrorFloor(s: FloorState): FloorState {
  if (!s.two) return s;
  const fx = (p: Spot): Spot => ({ x: COURT.w - p.x, y: p.y });
  const sw = <T,>(a: [T, T]): [T, T] => [a[1], a[0]];
  const t = (team: 0 | 1): 0 | 1 => other(team);
  const f = s.ball.flight;
  return {
    ...s,
    score: sw(s.score),
    teams: sw(s.teams),
    teamFouls: sw(s.teamFouls),
    timeouts: sw(s.timeouts),
    players: s.players.map((p) => ({ ...p, team: t(p.team), ...fx(p), dash: p.dash ? { ...p.dash, to: fx(p.dash.to) } : p.dash })),
    user: s.two.user,
    load: s.two.load,
    call: s.two.call,
    auto: s.two.auto,
    two: { user: s.user, load: s.load, call: s.call, auto: s.auto },
    ball: { ...s.ball, ...fx(s.ball), flight: f ? { ...f, from: fx(f.from), to: fx(f.to) } : null },
    poss: t(s.poss),
    first: t(s.first),
    inbound: s.inbound ? { team: t(s.inbound.team), at: fx(s.inbound.at) } : null,
    ft: s.ft ? { ...s.ft, at: s.ft.at ? fx(s.ft.at) : undefined } : null,
    momentum: -s.momentum,
    brk: s.brk ? { ...s.brk, team: t(s.brk.team) } : null,
    iso: s.iso ? { ...s.iso, team: t(s.iso.team) } : null,
    line: sw(s.line),
    start: sw(s.start),
    fast: sw(s.fast),
    run: { team: t(s.run.team), pts: s.run.pts },
    feed: s.feed.map((e) => ({ ...e, team: t(e.team) })),
  };
}

/** A short fingerprint of where the game stands (both computers compare theirs every so often). */
export function floorHash(s: FloorState): string {
  const key = JSON.stringify([s.tick, s.rng, s.score, s.quarter, s.clock, s.shot, s.poss, s.phase, s.ball.holder, s.ball.x, s.ball.y, s.players.map((p) => [p.x, p.y, p.on, p.fouls, p.stamina])]);
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
  return h.toString(36);
}
