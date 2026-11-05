// The Floor against a friend online (round 39, owner: "can you make the game multiplayer as well?";
// the owner's picks: "Online, by room code", "Head to head"). One player makes a room and reads out its
// code, the other types it in; the host's team is team 0, the friend's team 1, and the AI plays the
// other eight.
//
// Lockstep: both computers run the same game (engine/floor/sim.ts is seeded and replays exactly)
// and send each other only their own keys, one input a tick. A key pressed now counts DELAY ticks
// later on both screens, so it has time to arrive; a screen whose friend's input for the next tick
// is late waits for it. Every HASH_EVERY ticks the host sends a fingerprint of the game; a friend
// whose game came out different (two browsers can round a sine differently) asks for the host's
// and goes on from it.
//
// Where it goes: the website's realtime service (floorOnline.ts, the online build only: the website
// and itch.io); in the dev deck a channel between two tabs of this browser, which touches nothing
// online; the claude.ai page has neither and points to the website.

import { floorHash, type FloorInput, type FloorSetup, type FloorState } from '../../engine/floor/sim';
import { isDev } from '../../dev/mode';

/** Ticks a key waits before it counts (a fifth of a second at the Floor's pace). */
export const DELAY = 4;
/** Inputs sent together. */
const BATCH = 2;
/** How often the host sends the game's fingerprint (ticks: two seconds). */
const HASH_EVERY = 40;
/** Inputs kept for a resync (ticks). */
const KEEP = 400;

export type FloorMsg =
  | { k: 'hi'; id: string; host: boolean; name: string; team: string; pos: string }
  | { k: 'start'; id: string; to: string; game: number; setup: FloorSetup }
  | { k: 'in'; id: string; game: number; t: number; ins: FloorInput[] }
  | { k: 'hash'; id: string; game: number; t: number; h: string }
  | { k: 'sync'; id: string; game: number }
  | { k: 'state'; id: string; game: number; s: FloorState }
  | { k: 'quit'; id: string; game: number }
  | { k: 'bye'; id: string };

/** Something that carries messages to everyone else in the room. */
export interface Wire {
  send(m: FloorMsg): void;
  listen(f: (m: FloorMsg) => void): () => void;
  close(): void;
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

/** One game's keys both ways, for the screen that plays it (FloorScreen with `net`). */
export class Lockstep {
  /** Which team this computer plays: 0 for the host, 1 for the friend. */
  readonly side: 0 | 1;
  readonly game: number;
  private wire: Wire;
  private mine = new Map<number, FloorInput>();
  private theirs = new Map<number, FloorInput>();
  /** My inputs exist up to this tick (the first DELAY ticks are empty on both screens). */
  private made = DELAY;
  private out: FloorInput[] = [];
  private outFrom = DELAY + 1;
  private ownHash = new Map<number, string>();
  private hostHash = new Map<number, string>();
  private asked = 0;
  private stop: () => void;
  /** When the friend was last heard from (ms, performance.now). */
  heard = performance.now();
  /** The friend left the game. */
  gone = false;
  /** Set by the screen: the game it plays, for the host to send and the friend to take. */
  getState: () => FloorState | null = () => null;
  setState: (s: FloorState) => void = () => {};
  /** Resyncs taken (for the screen's small note, and tests). */
  resyncs = 0;

  constructor(wire: Wire, side: 0 | 1, game: number) {
    this.wire = wire;
    this.side = side;
    this.game = game;
    this.stop = wire.listen((m) => this.hear(m));
  }

  private hear(m: FloorMsg): void {
    if (m.id === ME) return;
    if (m.k === 'bye') {
      this.gone = true;
      return;
    }
    if (!('game' in m) || m.game !== this.game) return;
    this.heard = performance.now();
    if (m.k === 'quit') this.gone = true;
    if (m.k === 'in') m.ins.forEach((inp, i) => this.theirs.set(m.t + i, inp));
    else if (m.k === 'hash' && this.side === 1) {
      this.hostHash.set(m.t, m.h);
      this.check(m.t);
    } else if (m.k === 'sync' && this.side === 0) {
      const s = this.getState();
      // the feed is only for the screen's words: the last few events are enough
      if (s) this.wire.send({ k: 'state', id: ME, game: this.game, s: { ...s, feed: s.feed.slice(-12), fresh: Math.max(0, s.fresh - Math.max(0, s.feed.length - 12)) } });
    } else if (m.k === 'state' && this.side === 1) {
      this.resyncs++;
      this.ownHash.clear();
      this.hostHash.clear();
      this.setState(m.s);
    }
  }

  private check(t: number): void {
    const a = this.ownHash.get(t);
    const b = this.hostHash.get(t);
    if (a === undefined || b === undefined || a === b) return;
    const now = performance.now();
    if (now - this.asked < 2000) return;
    this.asked = now;
    this.wire.send({ k: 'sync', id: ME, game: this.game });
  }

  private flush(): void {
    if (!this.out.length) return;
    this.wire.send({ k: 'in', id: ME, game: this.game, t: this.outFrom, ins: this.out });
    this.outFrom += this.out.length;
    this.out = [];
  }

  /** Makes this computer's input for every tick up to `tick + DELAY` (one call to `make` each), and sends them. */
  fill(tick: number, make: () => FloorInput): void {
    while (this.made < tick + DELAY) {
      this.made++;
      const inp = make();
      this.mine.set(this.made, inp);
      this.out.push(inp);
      if (this.out.length >= BATCH) this.flush();
    }
  }

  /** Both inputs for a tick are here. A screen that has to wait sends what it holds first. */
  ready(tick: number): boolean {
    if (tick <= DELAY) return true;
    const ok = this.mine.has(tick) && this.theirs.has(tick);
    if (!ok) this.flush();
    return ok;
  }

  /** The two teams' inputs for a tick, host's first. */
  inputs(tick: number): [FloorInput, FloorInput] {
    if (tick <= DELAY) return [{}, {}];
    const a = this.mine.get(tick)!;
    const b = this.theirs.get(tick)!;
    return this.side === 0 ? [a, b] : [b, a];
  }

  /** After a tick: the host's fingerprint, the friend's check of it, and the old inputs let go. */
  stepped(s: FloorState): void {
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
