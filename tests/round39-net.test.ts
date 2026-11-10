// The Floor online (round 39; round 42: prediction, after "multiplayer lags way too much"). Two
// NetGames joined by a line in memory with a real line's faults (latency, jitter, messages lost),
// each on its own clock, a millisecond at a time. Whatever the line does: the game both computers
// agree on (`conf`) must be the same game tick for tick, a screen must never wait on a decent line,
// and his own keys must count on the tick they are pressed.

import { describe, expect, it } from 'vitest';
import { FLOOR } from '../src/engine/balance';
import { floorHash, freshEvents, startFloor, stepFloor, type FloorInput, type FloorSetup, type FloorState } from '../src/engine/floor/sim';
import { leanRatings } from '../src/engine/floor/career';
import { AHEAD, NetGame, type FloorMsg, type Wire } from '../src/ui/floor/net';
import { makeRng, next } from '../src/engine/rng';

const POS = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C'] as const;
const team = (tag: string) => POS.map((pos, i) => ({ id: tag + i, name: `${tag}${i}`, pos, number: 10 + i, r: leanRatings(76, pos, 0), user: i === 1 }));
const setup = (seed: number, clock: number = FLOOR.from): FloorSetup => ({ seed, mode: 'standard', us: { name: 'H', short: 'HOM', color: '#c00', players: team('H') }, them: { name: 'A', short: 'AWY', color: '#00c', players: team('A') }, score: [84, 84], clock });

const TICK = 1000 / FLOOR.ticksPerSec;

/** A line between two pages: each message takes `lag` ms and up to `jitter` more, and `loss` of them
 * never arrive. Each end has its own id, as two pages would (a NetGame drops messages carrying its
 * own page's id, so the line rewrites it). */
type FastLine = { lag: number; jitter?: number; loss?: number; dies?: number };
function line(o: { lag: number; jitter?: number; loss?: number; seed?: number; fast?: FastLine }) {
  const r = makeRng(o.seed ?? 99);
  let q: { at: number; to: 0 | 1; m: FloorMsg; fast?: boolean }[] = [];
  const fs: ((m: FloorMsg, fast?: boolean) => void)[][] = [[], []];
  const t = { ms: 0, sent: 0, fastSent: 0 };
  // the direct line between the two browsers (rtc.ts): quick, but any message on it may be lost or
  // overtaken, and from `dies` on it carries nothing though it still looks open
  const F = o.fast;
  let dropped = false;
  const end = (me: 0 | 1): Wire => ({
    send: (m) => {
      t.sent++;
      if (m.k === 'in' && next(r) < (o.loss ?? 0)) return;
      // a real line copies (the tabs' channel clones, the realtime service sends JSON)
      q.push({ at: t.ms + o.lag + next(r) * (o.jitter ?? 0), to: (1 - me) as 0 | 1, m: JSON.parse(JSON.stringify({ ...m, id: `peer${me}` })) as FloorMsg });
    },
    listen: (f) => {
      fs[me].push(f);
      return () => (fs[me] = fs[me].filter((g) => g !== f));
    },
    close: () => {},
    fast: F && {
      ready: () => !dropped,
      send: (m) => {
        t.fastSent++;
        if (t.ms >= (F.dies ?? Infinity) || next(r) < (F.loss ?? 0)) return;
        q.push({ at: t.ms + F.lag + next(r) * (F.jitter ?? 0), to: (1 - me) as 0 | 1, m: JSON.parse(JSON.stringify({ ...m, id: `peer${me}` })) as FloorMsg, fast: true });
      },
      drop: () => {
        dropped = true;
      },
    },
  });
  const pump = () => {
    const due = q.filter((x) => x.at <= t.ms).sort((a, b) => a.at - b.at);
    q = q.filter((x) => x.at > t.ms);
    for (const x of due) fs[x.to].forEach((f) => f(x.m, x.fast));
  };
  return { a: end(0), b: end(1), pump, t };
}

/** A player at the keys: he holds a direction for a while, sprints, loads shots and lets go, taps now and then. */
function keys(seed: number): (s: FloorState) => FloorInput {
  const r = makeRng(seed);
  let dir = { dx: 1, dy: 0 };
  let until = 0;
  let shoot = 0;
  return (s) => {
    if (s.tick >= until) {
      dir = { dx: Math.round(next(r) * 2 - 1), dy: Math.round(next(r) * 2 - 1) };
      until = s.tick + 6 + Math.floor(next(r) * 30);
    }
    if (shoot > 0) shoot--;
    else if (next(r) < 0.03) shoot = 14 + Math.floor(next(r) * 10);
    return { ...dir, sprint: next(r) < 0.3, shoot: shoot > 0, pass: next(r) < 0.03 ? 'auto' : undefined, steal: next(r) < 0.03, block: next(r) < 0.02, move: next(r) < 0.02 ? 'cross' : undefined };
  };
}

/** One screen, as FloorScreen runs it: a tick whenever its own clock says one is due, then settle. */
function screen(net: NetGame, make: (s: FloorState) => FloorInput) {
  let acc = 0;
  const told: string[] = [];
  let jumps = 0;
  let worst = 0;
  const me = net.side === 0 ? 1 : 9;
  const friend = net.side === 0 ? 9 : 1;
  return {
    told,
    get jumps() {
      return jumps;
    },
    get worst() {
      return worst;
    },
    frame(ms: number) {
      acc += ms;
      const tl = TICK * net.stretch();
      while (acc >= tl) {
        if (!net.step(() => make(net.now))) {
          acc = Math.min(acc, tl * 2);
          break;
        }
        acc -= tl;
      }
      // the friend's man before and after the games are brought up to date: how far a wrong guess moved him
      const was = net.now.tick;
      const at = { x: net.now.players[friend].x, y: net.now.players[friend].y };
      const mine = { x: net.now.players[me].x, y: net.now.players[me].y };
      const changed = net.settle((c) => {
        for (const e of freshEvents(c)) told.push(`${e.tick}:${e.kind}:${e.by ?? ''}:${e.team}`);
      });
      if (changed && net.now.tick === was) {
        const p = net.now.players[friend];
        const d = Math.hypot(p.x - at.x, p.y - at.y);
        if (d > 0.01) jumps++;
        worst = Math.max(worst, d);
        // his own man never moves when the friend's keys come in late, unless the two touch (a steal, a screen)
        void mine;
      }
    },
  };
}

/** Plays a game between two screens over a line; returns what both saw. */
function match(o: { lag: number; jitter?: number; loss?: number; seed?: number; clock?: number; late?: number; fast?: FastLine }) {
  const L = line(o);
  const set = setup(o.seed ?? 21, o.clock ?? 90);
  const host = new NetGame(L.a, 0, 1, set, () => L.t.ms);
  const friend = new NetGame(L.b, 1, 1, set, () => L.t.ms);
  const A = screen(host, keys(1));
  const B = screen(friend, keys(2));
  const hashes: [Map<number, string>, Map<number, string>] = [new Map(), new Map()];
  const note = (n: NetGame, m: Map<number, string>) => {
    if (!m.has(n.conf.tick)) m.set(n.conf.tick, floorHash(n.conf));
  };
  let ms = 0;
  // how far the host's screen runs past the keys both know, on average (ticks), and at the end of the game
  let depth = 0;
  for (; ms < 600_000 && !(host.over && friend.over); ms++) {
    depth += host.depth();
    L.t.ms = ms;
    L.pump();
    A.frame(1);
    // the friend starts when the host's tip-off reaches him
    if (ms >= (o.late ?? o.lag)) B.frame(1);
    note(host, hashes[0]);
    note(friend, hashes[1]);
  }
  return { host, friend, A, B, hashes, ms, sent: L.t.sent, fastSent: L.t.fastSent, depth: depth / Math.max(1, ms) };
}

const same = (m: ReturnType<typeof match>) => {
  let n = 0;
  for (const [t, h] of m.hashes[0]) {
    const o = m.hashes[1].get(t);
    if (o === undefined) continue;
    expect(o, `tick ${t}`).toBe(h);
    n++;
  }
  return n;
};

describe('the Floor online: prediction between two screens', () => {
  it('on a good line the two computers agree on the same game, tick for tick, and nobody waits', () => {
    const m = match({ lag: 40, jitter: 15 });
    expect(m.host.over && m.friend.over).toBe(true);
    expect(same(m)).toBeGreaterThan(500);
    expect(m.host.conf.score).toEqual(m.friend.conf.score);
    expect(m.host.resyncs + m.friend.resyncs).toBe(0);
    expect(m.host.waited + m.friend.waited).toBe(0);
    // what was said (from the game both agree on) is the same on both screens, each event once
    expect(m.A.told).toEqual(m.B.told);
    expect(new Set(m.A.told).size).toBe(m.A.told.length);
  });

  it('a slow line (150 ms each way, jitter) still never stops the screen, and both end on the same score', () => {
    const m = match({ lag: 150, jitter: 60 });
    expect(same(m)).toBeGreaterThan(500);
    expect(m.host.conf.score).toEqual(m.friend.conf.score);
    expect(m.host.waited + m.friend.waited).toBe(0);
    // the game runs at its own pace: the real time is the ticks' time, give or take the levelling
    const ticks = m.host.conf.tick;
    expect(m.ms).toBeLessThan(ticks * TICK * 1.06 + 1000);
    // the screens stay level: neither has to guess much further than the line is long
    expect(Math.abs(m.host.lead())).toBeLessThan(3);
  });

  it('his own keys count on the tick they are pressed, whatever the line', () => {
    const L = line({ lag: 200 });
    const set = setup(31, 60);
    const host = new NetGame(L.a, 0, 1, set, () => L.t.ms);
    new NetGame(L.b, 1, 1, set, () => L.t.ms);
    const solo = startFloor(set);
    // the same keys in a game with nobody on the other end of the line yet
    for (let i = 0; i < 8; i++) {
      const inp: FloorInput = { dx: 1, dy: 0, sprint: true };
      expect(host.step(() => inp)).toBe(true);
      host.settle(() => {});
      stepFloor(solo, inp, {});
      expect(host.now.tick).toBe(i + 1);
      expect(host.now.players[1].x).toBe(solo.players[1].x);
    }
    // nothing has crossed yet: the game both agree on has not moved
    expect(host.conf.tick).toBe(0);
  });

  it('messages lost on the way leave no hole: the keys ride again, and a stuck screen asks for them', () => {
    const m = match({ lag: 60, jitter: 20, loss: 0.2 });
    expect(m.host.over && m.friend.over).toBe(true);
    // (fewer ticks to compare: a late batch moves the agreed game on several ticks at once)
    expect(same(m)).toBeGreaterThan(200);
    expect(m.host.conf.score).toEqual(m.friend.conf.score);
    expect(m.host.resyncs + m.friend.resyncs).toBe(0);
  });

  it('with a direct line beside a slow room, the keys take it: the screens guess far less, and agree all the same', () => {
    const slow = match({ lag: 150, jitter: 60 });
    // the direct line loses and reorders messages (it neither resends nor orders them)
    const m = match({ lag: 150, jitter: 60, fast: { lag: 12, jitter: 25, loss: 0.1 } });
    expect(m.host.over && m.friend.over).toBe(true);
    expect(same(m)).toBeGreaterThan(500);
    expect(m.host.conf.score).toEqual(m.friend.conf.score);
    expect(m.host.resyncs + m.friend.resyncs).toBe(0);
    expect(m.host.waited + m.friend.waited).toBe(0);
    expect(m.fastSent).toBeGreaterThan(m.sent);
    expect(m.A.told).toEqual(m.B.told);
    // far less to guess than through the room: the room's trip is 150 to 210 ms, the direct one 12 to 37
    expect(slow.depth).toBeGreaterThan(3);
    expect(m.depth).toBeLessThan(slow.depth / 2);
    // and the trip shown is the direct line's
    expect(m.host.ping).not.toBeNull();
    expect(m.host.ping!).toBeLessThan(100);
  });

  it('a direct line that goes quiet mid-game is given up, and the game goes on through the room', () => {
    const m = match({ lag: 80, jitter: 20, fast: { lag: 10, jitter: 10, dies: 6000 } });
    expect(m.host.over && m.friend.over).toBe(true);
    expect(m.host.direct || m.friend.direct).toBe(false);
    // (through the room the keys come two ticks at a time, so fewer ticks are there to compare)
    expect(same(m)).toBeGreaterThan(100);
    // the change of line costs a moment, not a stop: neither screen stands still for a quarter second
    expect(m.host.waited + m.friend.waited).toBeLessThan(250);
    expect(m.host.conf.score).toEqual(m.friend.conf.score);
    expect(m.host.resyncs + m.friend.resyncs).toBe(0);
    // the trip shown is the room's again
    expect(m.host.ping!).toBeGreaterThan(100);
  });

  it('a screen waits only when the friend goes quiet for longer than it may guess', () => {
    const L = line({ lag: 30 });
    const set = setup(33, 60);
    const host = new NetGame(L.a, 0, 1, set, () => L.t.ms);
    new NetGame(L.b, 1, 1, set, () => L.t.ms);
    let went = 0;
    for (let i = 0; i < AHEAD + 5; i++) {
      if (host.step(() => ({}))) went++;
      host.settle(() => {});
    }
    expect(went).toBe(AHEAD);
    expect(host.waited).toBe(5);
    expect(host.now.tick).toBe(AHEAD);
  });

  it('a copy knocked out of step is put right from the host', () => {
    const L = line({ lag: 40 });
    const set = setup(23, 120);
    const host = new NetGame(L.a, 0, 1, set, () => L.t.ms);
    const friend = new NetGame(L.b, 1, 1, set, () => L.t.ms);
    const A = screen(host, keys(3));
    const B = screen(friend, keys(4));
    const run = (ms: number, check = false) => {
      for (let i = 0; i < ms; i++) {
        L.t.ms++;
        L.pump();
        A.frame(1);
        B.frame(1);
        if (check && host.conf.tick === friend.conf.tick) expect(floorHash(friend.conf)).toBe(floorHash(host.conf));
      }
    };
    run(8000);
    friend.conf.players[3].x += 2.5;
    run(9000);
    expect(friend.resyncs).toBeGreaterThanOrEqual(1);
    // caught up: from here on, at the same tick, the same game
    run(6000, true);
  });

  it('a game from another tip-off is not mixed in, and a quit is heard', () => {
    const L = line({ lag: 5 });
    const host = new NetGame(L.a, 0, 2, setup(1), () => L.t.ms);
    const friend = new NetGame(L.b, 1, 3, setup(1), () => L.t.ms);
    for (let i = 0; i < 4; i++) host.step(() => ({ dx: 1 }));
    for (let i = 0; i < 40; i++) {
      L.t.ms++;
      L.pump();
    }
    for (let i = 0; i < 4; i++) friend.step(() => ({}));
    friend.settle(() => {});
    expect(friend.conf.tick).toBe(0);
    const again = new NetGame(L.b, 1, 2, setup(1), () => L.t.ms);
    again.quit();
    for (let i = 0; i < 40; i++) {
      L.t.ms++;
      L.pump();
    }
    expect(host.gone).toBe(true);
    expect(friend.gone).toBe(false);
  });
});
