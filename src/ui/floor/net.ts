// The Floor against a friend online (round 39, owner: "can you make the game multiplayer as well?";
// the owner's picks: "Online, by room code", "Head to head"). One player makes a room and reads out its
// code, the other types it in; the host's team is team 0, the friend's team 1, and the AI plays the
// other eight.
//
// Both computers run the same game (engine/floor/sim.ts is seeded and replays exactly) and send each
// other only their own keys, one input a tick. Round 39 waited for them: a key counted four ticks
// (a fifth of a second) later on both screens so it had time to arrive, and a screen whose friend's
// keys were late stood still until they came.
//
// Round 42 (owner: "multiplayer lags way too much. find a way to fix that"): the screen no longer
// waits. Each computer keeps two games. `conf` is the game as far as BOTH players' keys are known,
// and only ever moves on real keys, so the two computers' `conf` are the same game. `now` is what the
// screen shows: `conf` played on to this instant with his own keys, which count at once, and the
// friend's as he last held them (a direction, a sprint, a held shot; a tap is never guessed). When
// the friend's real keys arrive, `conf` moves on and `now` is played again from it: nothing changes
// on screen unless the guess was wrong, and then only by the few ticks the keys took to cross. What
// the game says (a basket, a steal, a foul) is told from `conf`, so nothing is ever announced and
// then taken back. A screen stops only when it is more than AHEAD ticks past the friend's keys (he
// has gone quiet), and the one that is ahead of the other runs a touch slower until they are level.
// Every HASH_EVERY ticks the host sends a fingerprint of its `conf`; a friend whose game came out
// different asks for the host's and goes on from it (the engine keeps to arithmetic every browser
// does alike, court.ts, so this is a net under the net).
//
// After round 42 (owner: "it's better now, but the lag is still significant"): in a room joined by code
// the keys go straight from one browser to the other when a direct line can be made (rtc.ts), a
// tick at a time, and the room's line carries only what must arrive; `beat` picks the line, and goes
// back to the room's if the direct one goes quiet.
//
// Where it goes: the website's realtime service (floorOnline.ts, the online build only: the website
// and itch.io); in the dev deck a channel between two tabs of this browser, which touches nothing
// online; the claude.ai page has neither and points to the website.

import { floorHash, startFloor, stepFloor, type FloorInput, type FloorSetup, type FloorState } from '../../engine/floor/sim';
import type { Spot } from '../../engine/floor/court';
import { isDev } from '../../dev/mode';
import type { RtcSignal } from './rtc';

/** Ticks the screen may run past the last tick both players' keys are known for (a second and a
 * half): beyond it the friend has gone quiet, and the screen waits. (0.6 seconds until the owner's
 * "the friend games still have insane lag": a short hitch on either line stopped both screens.) */
export const AHEAD = 30;
/** New inputs sent together (ten messages a second), and how many older ones ride along with them,
 * so a message that never arrives leaves no hole. */
const BATCH = 2;
const AGAIN = 6;
/** On the direct line: a ping this often (ms), and the line given up after this long without a word on it. */
const FAST_PING = 500;
const FAST_DEAD = 1200;
/** On the room's line: a ping this often (ms), only to show how long the trip takes. */
const SLOW_PING = 2000;
/** How often the host sends the game's fingerprint (ticks: two seconds). */
const HASH_EVERY = 40;
/** Inputs kept for a resync (ticks). */
const KEEP = 400;

export type FloorMsg =
  | { k: 'hi'; id: string; host: boolean; name: string; team: string; pos: string }
  | { k: 'start'; id: string; to: string; game: number; setup: FloorSetup }
  | { k: 'in'; id: string; game: number; t: number; ins: FloorInput[]; d: number }
  | { k: 'need'; id: string; game: number; t: number }
  | { k: 'hash'; id: string; game: number; t: number; h: string }
  | { k: 'sync'; id: string; game: number }
  | { k: 'state'; id: string; game: number; s: FloorState }
  | { k: 'quit'; id: string; game: number }
  | { k: 'bye'; id: string }
  // (after round 42) how long a message takes there and back, and the direct line's own setting up (rtc.ts)
  | { k: 'ping'; id: string; game: number; n: number }
  | { k: 'pong'; id: string; game: number; n: number }
  | { k: 'rtc'; id: string; to: string; d: RtcSignal }
  // round 42, quick match: someone waiting in the lobby, and the room one of two picks for both
  | { k: 'seek'; id: string }
  | { k: 'pair'; id: string; to: string; code: string };

/** The room everyone looking for a quick match waits in. */
export const LOBBY = 'MATCH2';

/** Something that carries messages to everyone else in the room. */
export interface Wire {
  send(m: FloorMsg): void;
  /** `fast` is true for a message that came down the direct line. */
  listen(f: (m: FloorMsg, fast?: boolean) => void): () => void;
  close(): void;
  /** The direct line between the two browsers (rtc.ts), where one can be made: quicker, but a message
   * on it may never arrive. `drop` gives it up for this room. */
  fast?: { ready(): boolean; send(m: FloorMsg): void; drop(): void };
}

/** This page's own id in a room (a fresh one each visit). */
export const ME = Math.random().toString(36).slice(2, 10);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const roomCode = (): string => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
export const cleanRoom = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const ROOM_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/** Two tabs of this browser (the dev deck): a broadcast channel, nothing leaves the computer. */
function tabWire(code: string): Wire {
  const ch = new BroadcastChannel(`btr-floor-${code}`);
  const fs = new Set<(m: FloorMsg) => void>();
  ch.onmessage = (e) => fs.forEach((f) => f(e.data as FloorMsg));
  return {
    send: (m) => ch.postMessage(m),
    listen: (f) => {
      fs.add(f);
      return () => fs.delete(f);
    },
    close: () => ch.close(),
  };
}

/** Whether this copy of the game can play a friend online: the website or itch.io, or the dev deck's two tabs. */
export const canPlayOnline = (): boolean => isDev() || (!!import.meta.env.VITE_SB_URL && !!import.meta.env.VITE_SB_KEY);

/** Opens a room's line: null when this copy cannot (the claude.ai page) or the service cannot be reached. */
export async function openWire(code: string): Promise<Wire | null> {
  if (isDev()) return typeof BroadcastChannel === 'undefined' ? null : tabWire(code);
  if (!import.meta.env.VITE_SB_URL || !import.meta.env.VITE_SB_KEY) return null;
  try {
    const { onlineWire } = await import('./floorOnline');
    return await onlineWire(import.meta.env.VITE_SB_URL, import.meta.env.VITE_SB_KEY, code);
  } catch {
    return null;
  }
}

/** A friend's keys as they are guessed until they arrive: what he holds stays held; what he taps
 * (a pass, a move, a steal, a jump, a timeout) and the instant of a release are never made up. */
const held = (i: FloorInput): FloorInput => ({ dx: i.dx, dy: i.dy, sprint: i.sprint, shoot: i.shoot });
const spots = (s: FloorState): Spot[] => s.players.map((p) => ({ x: p.x, y: p.y }));

/** One game against a friend, for the screen that plays it (FloorScreen with `net`): the game both
 * computers agree on, and the one this screen shows. */
export class NetGame {
  /** Which team this computer plays: 0 for the host, 1 for the friend. */
  readonly side: 0 | 1;
  readonly game: number;
  /** The game as far as both players' keys are known (the same on both computers). */
  conf: FloorState;
  /** The game this screen shows: `conf` played on with his own keys and the friend's last. */
  now: FloorState;
  /** Where everyone stood a tick before `now` (the screen draws between the two). */
  prev: Spot[];
  private wire: Wire;
  private clock: () => number;
  private mine = new Map<number, FloorInput>();
  private theirs = new Map<number, FloorInput>();
  /** His own keys exist up to this tick: the tick the screen is at. */
  private made = 0;
  private sent: FloorInput[] = [];
  private fresh = 0;
  /** The friend's keys the last time they were known, for the guess. */
  private last: FloorInput = {};
  private dirty = false;
  /** How far the friend's screen runs past his `conf` (he says so with his keys). */
  private theirDepth = 0;
  private ownHash = new Map<number, string>();
  private hostHash = new Map<number, string>();
  private asked = -Infinity;
  private needed = -Infinity;
  private stop: () => void;
  /** When the friend was last heard from (ms, the clock given). */
  heard: number;
  /** A message's trip to the friend and back (ms, smoothed), once measured. */
  ping: number | null = null;
  /** Since when the keys have gone down the direct line, when they last came up it, the last ping sent. */
  private fastSince: number | null = null;
  private fastHeard = 0;
  private pinged = -Infinity;
  /** The friend left the game. */
  gone = false;
  /** Times the host's game was taken whole (for the screen's small note, and tests). */
  resyncs = 0;
  /** For the tests: ticks played again because a guess was wrong, and ticks the screen had to wait. */
  replayed = 0;
  waited = 0;

  constructor(wire: Wire, side: 0 | 1, game: number, setup: FloorSetup, clock: () => number = () => performance.now()) {
    this.wire = wire;
    this.side = side;
    this.game = game;
    this.clock = clock;
    this.heard = clock();
    this.conf = startFloor(setup);
    this.now = structuredClone(this.conf);
    this.prev = spots(this.now);
    this.stop = wire.listen((m, fast) => this.hear(m, !!fast));
  }

  /** The keys are going down the direct line between the two browsers. */
  get direct(): boolean {
    return this.fastSince !== null;
  }

  /** Down the direct line when it is in use, else the room's. */
  private out(m: FloorMsg): void {
    if (this.fastSince !== null) this.wire.fast!.send(m);
    else this.wire.send(m);
  }

  /** Which line the keys take, kept up to date: the direct one as soon as it opens, the room's again
   * if it closes or goes quiet; and a ping now and then. */
  private beat(): void {
    const at = this.clock();
    const f = this.wire.fast;
    if (f?.ready()) {
      if (this.fastSince === null) {
        this.fastSince = at;
        this.fastHeard = at;
        this.pinged = -Infinity;
        this.ping = null;
      } else if (at - this.fastHeard > FAST_DEAD) {
        f.drop();
        this.backToRoom();
      }
    } else if (this.fastSince !== null) this.backToRoom();
    if (at - this.pinged >= (this.fastSince !== null ? FAST_PING : SLOW_PING)) {
      this.pinged = at;
      this.out({ k: 'ping', id: ME, game: this.game, n: at });
    }
  }

  /** The direct line is lost: the keys go through the room again. Whatever was on its way down the
   * direct line may be gone, so his last two seconds of keys go again at once, and the friend's are
   * asked for, rather than each screen finding the hole when it has to stop. */
  private backToRoom(): void {
    this.fastSince = null;
    this.ping = null;
    this.pinged = -Infinity;
    const from = Math.max(this.conf.tick + 1, this.made - 39);
    const ins: FloorInput[] = [];
    for (let t = from; t <= this.made && this.mine.has(t); t++) ins.push(this.mine.get(t)!);
    if (ins.length) this.wire.send({ k: 'in', id: ME, game: this.game, t: from, ins, d: this.depth() });
    this.wire.send({ k: 'need', id: ME, game: this.game, t: this.conf.tick + 1 });
    this.fresh = 0;
  }

  private hear(m: FloorMsg, fast: boolean): void {
    if (m.id === ME) return;
    if (m.k === 'bye') {
      this.gone = true;
      return;
    }
    if (!('game' in m) || m.game !== this.game) return;
    this.heard = this.clock();
    if (fast) this.fastHeard = this.heard;
    const back = (r: FloorMsg) => (fast && this.wire.fast ? this.wire.fast.send(r) : this.wire.send(r));
    if (m.k === 'ping') back({ k: 'pong', id: ME, game: this.game, n: m.n });
    else if (m.k === 'pong') {
      // (a pong for the other line's ping is let go: the two trips are not alike)
      const ms = this.heard - m.n;
      if (fast === (this.fastSince !== null) && ms >= 0) this.ping = this.ping === null ? ms : this.ping * 0.7 + ms * 0.3;
    }
    if (m.k === 'quit') this.gone = true;
    if (m.k === 'in') {
      this.theirDepth = m.d;
      m.ins.forEach((inp, i) => {
        const t = m.t + i;
        if (t > this.conf.tick && !this.theirs.has(t)) this.theirs.set(t, inp);
      });
    } else if (m.k === 'need') {
      // the friend is missing keys of mine (a message that never arrived): they go again, from his tick on
      const ins: FloorInput[] = [];
      for (let t = m.t; t <= this.made && ins.length < 80 && this.mine.has(t); t++) ins.push(this.mine.get(t)!);
      // (down both lines when there are two: he is stuck, and one of them may be why)
      if (ins.length) {
        const r: FloorMsg = { k: 'in', id: ME, game: this.game, t: m.t, ins, d: this.depth() };
        this.wire.send(r);
        if (this.fastSince !== null) this.wire.fast!.send(r);
      }
    } else if (m.k === 'hash' && this.side === 1) {
      this.hostHash.set(m.t, m.h);
      this.check(m.t);
    } else if (m.k === 'sync' && this.side === 0) {
      // the feed is only for the screen's words: the last few events are enough
      const s = this.conf;
      this.wire.send({ k: 'state', id: ME, game: this.game, s: { ...s, feed: s.feed.slice(-12), fresh: Math.max(0, s.fresh - Math.max(0, s.feed.length - 12)) } });
    } else if (m.k === 'state' && this.side === 1) {
      this.resyncs++;
      this.ownHash.clear();
      this.hostHash.clear();
      this.conf = m.s;
      // his screen never goes back: his own keys from before the host's game are let go
      this.made = Math.max(this.made, this.conf.tick);
      this.dirty = true;
    }
  }

  private check(t: number): void {
    const a = this.ownHash.get(t);
    const b = this.hostHash.get(t);
    if (a === undefined || b === undefined || a === b) return;
    const at = this.clock();
    if (at - this.asked < 2000) return;
    this.asked = at;
    this.wire.send({ k: 'sync', id: ME, game: this.game });
  }

  /** Sends his newest keys, with the few before them again. */
  private flush(): void {
    if (!this.fresh) return;
    const n = Math.min(this.sent.length, this.fresh + AGAIN);
    this.out({ k: 'in', id: ME, game: this.game, t: this.made - n + 1, ins: this.sent.slice(-n), d: this.depth() });
    this.fresh = 0;
    if (this.sent.length > AGAIN + BATCH) this.sent.splice(0, this.sent.length - AGAIN - BATCH);
  }

  /** Ticks the screen runs past what both players' keys are known for. */
  depth(): number {
    return this.made - this.conf.tick;
  }

  /** How many ticks this screen is ahead of the friend's (behind, when negative): half the gap
   * between how far each has to guess. The one ahead runs a little slower, the one behind a little
   * faster, so neither waits for long. */
  lead(): number {
    return (this.depth() - this.theirDepth) / 2;
  }

  /** The length of this screen's next tick, as a share of the usual one. */
  stretch(): number {
    const l = this.lead();
    return l > 0.5 ? 1 + Math.min(3, l - 0.5) * 0.06 : l < -0.5 ? 1 - Math.min(3, -l - 0.5) * 0.03 : 1;
  }

  /** A tick is due on this screen: his keys for it are read (`make`, from the game on screen) and
   * sent, and they count at once. False when the screen is too far past the friend's keys to go on. */
  step(make: () => FloorInput): boolean {
    // (a game that only looks over on this screen, on a guess, still sends his keys: the real one may go on)
    if (this.conf.phase === 'over') return false;
    this.beat();
    if (this.depth() >= AHEAD) {
      this.waited++;
      this.flush();
      // stuck: his keys are late, or a message was lost on the way; ask for them again now and then
      const at = this.clock();
      if (at - this.needed > 400) {
        this.needed = at;
        const ask: FloorMsg = { k: 'need', id: ME, game: this.game, t: this.conf.tick + 1 };
        this.wire.send(ask);
        if (this.fastSince !== null) this.wire.fast!.send(ask);
      }
      return false;
    }
    const inp = make();
    this.made++;
    this.mine.set(this.made, inp);
    this.sent.push(inp);
    this.fresh++;
    // (the direct line has no limit on messages: every tick's keys go at once)
    if (this.fresh >= (this.fastSince !== null ? 1 : BATCH)) this.flush();
    this.dirty = true;
    return true;
  }

  private pair(mine: FloorInput, theirs: FloorInput): [FloorInput, FloorInput] {
    return this.side === 0 ? [mine, theirs] : [theirs, mine];
  }

  /**
   * Brings both games up to date; true when the one on screen changed. `told` is called for every
   * tick both players' keys are now known for, with that game and the score before the tick: what
   * happened in it is said from there, once and for good.
   */
  settle(told: (conf: FloorState, before: [number, number]) => void): boolean {
    while (this.conf.tick < this.made && this.conf.phase !== 'over') {
      const t = this.conf.tick + 1;
      const theirs = this.theirs.get(t);
      if (!theirs) break;
      const before: [number, number] = [...this.conf.score];
      if (t === this.made) this.prev = spots(this.conf);
      const [a, b] = this.pair(this.mine.get(t) ?? {}, theirs);
      stepFloor(this.conf, a, b);
      this.last = theirs;
      this.dirty = true;
      this.stepped();
      told(this.conf, before);
    }
    if (!this.dirty) return false;
    this.dirty = false;
    // the game on screen: from there to now, the friend's keys as he last held them
    const s = structuredClone(this.conf);
    let guess = held(this.last);
    while (s.tick < this.made && s.phase !== 'over') {
      const t = s.tick + 1;
      const known = this.theirs.get(t);
      if (known) guess = held(known);
      if (t === this.made) this.prev = spots(s);
      const [a, b] = this.pair(this.mine.get(t) ?? {}, known ?? guess);
      stepFloor(s, a, b);
      this.replayed++;
    }
    this.now = s;
    return true;
  }

  /** After a tick both computers have played: the host's fingerprint, the friend's check of it,
   * and the old keys let go. */
  private stepped(): void {
    const s = this.conf;
    if (s.tick % HASH_EVERY === 0) {
      const h = floorHash(s);
      if (this.side === 0) this.wire.send({ k: 'hash', id: ME, game: this.game, t: s.tick, h });
      else {
        this.ownHash.set(s.tick, h);
        this.check(s.tick);
      }
    }
    const old = s.tick - KEEP;
    for (const m of [this.mine, this.theirs]) for (const k of m.keys()) if (k < old) m.delete(k);
    for (const m of [this.ownHash, this.hostHash]) for (const k of m.keys()) if (k < s.tick - 4 * HASH_EVERY) m.delete(k);
  }

  /** The game is over on this screen only once both computers agree it is. */
  get over(): boolean {
    return this.conf.phase === 'over';
  }

  close(): void {
    this.flush();
    this.stop();
  }

  /** He leaves a game before its end: the other screen is told at once. */
  quit(): void {
    this.wire.send({ k: 'quit', id: ME, game: this.game });
    this.stop();
  }
}
