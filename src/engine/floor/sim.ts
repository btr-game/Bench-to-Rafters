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
import { COURT, SPACING, attackSpot, clampSpot, cos, dist, hyp, isThree, rimOf, sin, toLine, toRim, zoneOf, type Spot, type Zone } from './court';

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

export interface FloorPlayerIn {
  id: string;
  name: string;
  pos: Pos;
  number: number;
  r: FloorRatings;
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
  /** A quick slide he is in the middle of (the step-back), instead of a jump to the spot. */
  dash?: { to: Spot; t: number } | null;
  on: boolean;
  box: FloorBox;
}

export type FloorEventKind = 'make' | 'miss' | 'block' | 'steal' | 'turnover' | 'foul' | 'ft' | 'rebound' | 'timeout' | 'shotclock' | 'beat' | 'out' | 'overtime' | 'end' | 'screen' | 'reach' | 'switch' | 'help' | 'quarter';

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
  move?: 'cross' | 'spin' | 'step';
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
  /** Seconds the rebound waits before someone comes down with it (a loose ball). */
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
  help: { by: number; t: number } | null;
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
  move?: 'cross' | 'spin' | 'step' | null;
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
    tm.players.forEach((p, i) => players.push({ ...p, team: team as 0 | 1, x: 47, y: 25, stamina: 0.85, fouls: p.fouls ?? 0, slow: 0, air: 0, on: i < 5 && (p.fouls ?? 0) < FLOOR.foul.out, box: zeroBox() })),
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

/** Each defender takes the man in his own position (the user keeps the one he switched to). */
function matchUp(s: FloorState): void {
  s.guard = s.players.map(() => -1);
  const order = (team: 0 | 1) => [...onCourt(s, team)].sort((a, b) => SLOTS.indexOf(a.pos) - SLOTS.indexOf(b.pos));
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
  const [ahead, side] = SPACING[p.pos] ?? [20, 0];
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

const ratingFor = (p: FloorPlayer, zone: Zone) => (zone === 'rim' ? p.r.FIN * 0.8 + p.r.ATH * 0.2 : zone === 'paint' ? (p.r.FIN + p.r.SHT) / 2 : p.r.SHT);

/** The chance a shot from here goes in, before his meter. */
function shotChance(s: FloorState, p: FloorPlayer, at: Spot): number {
  const zone = zoneOf(p.team, at);
  const S = FLOOR.shot;
  let c = S[zone] + S.perPoint[zone] * (ratingFor(p, zone) - 70);
  const d = toRim(p.team, at);
  if (zone === 'three' && d > S.deep) c -= S.deepPerFt * (d - S.deep);
  const foe = nearestFoe(s, p.team, at);
  c -= Math.max(0, (FLOOR.contest.within - foe.d) / FLOOR.contest.within) * FLOOR.contest.max;
  c -= (1 - p.stamina) * FLOOR.contest.tired;
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
function release(s: FloorState, i: number, q: number | null, dodge = 1): void {
  const p = s.players[i];
  const at = { x: p.x, y: p.y };
  const zone = zoneOf(p.team, at);
  const three = isThree(p.team, at);
  let chance = shotChance(s, p, at);
  if (q !== null) chance = clamp(chance * lerp(FLOOR.meter.worst, FLOOR.meter.best, q), FLOOR.shot.min, FLOOR.shot.max);
  const foe = nearestFoe(s, p.team, at);
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
  s.ball.flight = { kind: 'shot', from: at, to: rimOf(p.team), t: secs(zone === 'rim' ? 0.45 : 0.6 + d / 60), total: secs(zone === 'rim' ? 0.45 : 0.6 + d / 60), by: i, made, zone, three, dunk };
  p.box.fga++;
  if (three) p.box.tpa++;
  if (fouled) {
    foul(s, fouled, false);
    s.ball.flight.fts = made ? 1 : three ? 3 : 2;
    s.ball.flight.and = made;
  }
  s.drive = false;
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
      emit(s, { kind: 'make', team: p.team, by: f.by, pts, zone: f.zone, dunk: f.dunk, and: f.and });
    } else emit(s, { kind: 'miss', team: p.team, by: f.by, zone: f.zone });
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
  const w = all.map((p) => {
    const d = dist(p, f.to);
    if (d > 18) return 0;
    const k = p.r.REB / 50;
    return k * k * (1 / (1 + d / 3)) * (p.team === shooterTeam ? FLOOR.rebound.offense : 1);
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
function change(s: FloorState, to: 0 | 1): void {
  s.poss = to;
  s.shot = FLOOR.shotClock;
  s.drive = false;
  s.gather = null;
  s.screen = null;
  s.help = null;
  s.lastPass = null;
  // he keeps the man he switched to only for the possession
  matchUp(s);
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
  if (team !== s.poss) change(s, team);
}

// ---------------- fouls and free throws ----------------

function foul(s: FloorState, by: FloorPlayer, emitIt = true): void {
  by.fouls++;
  by.box.pf++;
  s.teamFouls[by.team]++;
  if (emitIt) emit(s, { kind: 'foul', team: by.team, by: idx(s, by) });
  if (by.fouls >= FLOOR.foul.out) {
    by.on = false;
    const sub = benchOf(s, by.team).sort((a, b) => b.r.PER + b.r.INT - (a.r.PER + a.r.INT))[0];
    if (sub) {
      sub.on = true;
      sub.x = by.x;
      sub.y = by.y;
    }
    // a human who fouls out: the quarter plays on without him at the controls (stepFloor's auto)
    emit(s, { kind: 'out', team: by.team, by: idx(s, by), on: sub ? idx(s, sub) : undefined });
    matchUp(s);
  }
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
  const best = mates.sort((a, b) => b.r.PLY - a.r.PLY)[0];
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
    let open = nearestFoe(s, q.team, q).d * (0.6 + shotChance(s, q, q));
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
  const here = shotChance(s, p, p);
  const zone = zoneOf(p.team, p);
  const open = nearestFoe(s, p.team, p).d;
  const want = zone === 'three' ? 0.36 : zone === 'rim' ? 0.5 : 0.42;
  // an open jumper only once the offense has run a little of the shot clock; a layup any time
  const settled = FLOOR.shotClock - s.shot >= FLOOR.patience;
  if (inRange(p) && (s.shot < 3 || (here >= want && open >= FLOOR.open && settled) || (zone === 'rim' && here >= 0.45))) {
    s.gather = { by: i, t: secs(zone === 'rim' ? 0.5 : 1.1) };
    return;
  }
  // he called for it, off the ball: a pass to him when the lane is clear
  const pass = bestPass(s, p);
  if (pass && pass.to === humanOf(s, p.team) && s.tick - callOf(s, p.team) < secs(1.5)) return throwPass(s, i, pass.to);
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
    const urge = clamp(A.base + A.perPoint * ((p.r.FIN + p.r.ATH) / 2 - 70), A.min, A.max) * (settled ? A.settle : 1);
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
  if (pass && pass.open > open * 1.3 + 2 && next(s.rng) < 0.7) return throwPass(s, i, pass.to);
}

function throwPass(s: FloorState, from: number, to: number): void {
  const p = s.players[from];
  const r = s.players[to];
  s.drive = false;
  // a bad pass: out of bounds
  if (next(s.rng) < FLOOR.pass.bad * (1 - (p.r.PLY - 40) / 80)) {
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
    if (mine && inp.pass !== undefined && inp.pass !== null) {
      const to = inp.pass === 'auto' ? bestPass(s, u)?.to : inp.pass;
      if (to !== undefined && to !== ui && s.players[to]?.team === u.team && s.players[to].on) return throwPass(s, ui, to);
    } else if (!mine && inp.pass !== undefined && inp.pass !== null) {
      if (T === 0) s.call = s.tick;
      else s.two!.call = s.tick;
    }
    if (mine && inp.move) {
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
  s.momentum *= 1 - FLOOR.momentum.fade * DT;

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
      continue;
    }
    moved = stepToward(s, p, aiTarget(s, p));
    p.stamina = clamp(p.stamina + DT * (moved > 3 ? FLOOR.stamina.move : FLOOR.stamina.rest), 0.2, 1);
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
  if (f) {
    f.t--;
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
      if (s.drive && toRim(h.team, h) < 4) s.gather = { by: s.ball.holder, t: secs(0.4) };
      else aiHandler(s, s.ball.holder);
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
export function floorResult(s: FloorState): { us: number; them: number; win: boolean; line: FloorBox; marks: FloorState['marks']; box: { name: string; team: 0 | 1; box: FloorBox }[] } {
  return {
    us: s.score[0],
    them: s.score[1],
    win: s.score[0] > s.score[1],
    line: { ...s.players[s.user].box },
    marks: { ...s.marks },
    box: s.players.map((p) => ({ name: p.name, team: p.team, box: { ...p.box } })),
  };
}

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
