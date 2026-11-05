// Round 39, online: two Lockstep sessions joined by a wire in memory (with a delay and in batches,
// as a real line), each running its own copy of the game from its own keys and the other's. The two
// copies must stay the same; a copy knocked out of step must be put right by the host's.

import { describe, expect, it } from 'vitest';
import { floorHash, startFloor, stepFloor, type FloorInput, type FloorSetup, type FloorState } from '../src/engine/floor/sim';
import { leanRatings } from '../src/engine/floor/career';
import { DELAY, Lockstep, type FloorMsg, type Wire } from '../src/ui/floor/net';
import { makeRng, next } from '../src/engine/rng';

const POS = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C'] as const;
const team = (tag: string) => POS.map((pos, i) => ({ id: tag + i, name: `${tag}${i}`, pos, number: 10 + i, r: leanRatings(76, pos, 0), user: i === 1 }));
const setup = (seed: number): FloorSetup => ({ seed, mode: 'standard', us: { name: 'H', short: 'HOM', color: '#c00', players: team('H') }, them: { name: 'A', short: 'AWY', color: '#00c', players: team('A') }, score: [84, 84] });

/** Two ends of a line: what one sends reaches the other `lag` pumps later. Each end has its own id,
 * as two pages would (the Lockstep drops messages carrying its own page's id, so the test rewrites it). */
function line(lag: number) {
  const queues: { at: number; m: FloorMsg }[][] = [[], []];
  const fs: ((m: FloorMsg) => void)[][] = [[], []];
  let now = 0;
  const end = (me: 0 | 1): Wire => ({
    // a real line copies (the tabs' channel clones, the realtime service sends JSON)
    send: (m) => queues[1 - me].push({ at: now + lag, m: JSON.parse(JSON.stringify({ ...m, id: `peer${me}` })) as FloorMsg }),
    listen: (f) => {
      fs[me].push(f);
      return () => (fs[me] = fs[me].filter((g) => g !== f));
    },
    close: () => {},
  });
  const pump = () => {
    now++;
    for (const me of [0, 1] as const) {
      const due = queues[me].filter((x) => x.at <= now);
      queues[me] = queues[me].filter((x) => x.at > now);
      for (const x of due) fs[me].forEach((f) => f(x.m));
    }
  };
  return { a: end(0), b: end(1), pump };
}

function keys(seed: number): () => FloorInput {
  const r = makeRng(seed);
  return () => ({ dx: Math.round(next(r) * 2 - 1), dy: Math.round(next(r) * 2 - 1), shoot: next(r) < 0.2, pass: next(r) < 0.03 ? 'auto' : undefined, steal: next(r) < 0.03 });
}

/** One screen: steps its game whenever both inputs for the next tick are in. */
function screen(link: Lockstep, s: FloorState, make: () => FloorInput) {
  link.getState = () => s;
  link.setState = (ns) => Object.assign(s, ns);
  return () => {
    link.fill(s.tick, make);
    let n = 0;
    while (n < 3 && link.ready(s.tick + 1) && s.phase !== 'over') {
      const [a, b] = link.inputs(s.tick + 1);
      stepFloor(s, a, b);
      link.stepped(s);
      link.fill(s.tick, make);
      n++;
    }
  };
}

describe('round 39: lockstep between two screens', () => {
  it('two copies of the game stay the same tick for tick, through a slow line', () => {
    const { a, b, pump } = line(3);
    const host = new Lockstep(a, 0, 1);
    const friend = new Lockstep(b, 1, 1);
    const sa = startFloor(setup(21));
    const sb = startFloor(setup(21));
    const ta = screen(host, sa, keys(1));
    const tb = screen(friend, sb, keys(2));
    const seen: [number, string][] = [];
    for (let i = 0; i < 6000 && (sa.phase !== 'over' || sb.phase !== 'over'); i++) {
      ta();
      tb();
      pump();
      if (sa.tick === sb.tick && sa.tick % 100 === 0) seen.push([sa.tick, floorHash(sa)]);
      if (sa.tick === sb.tick) expect(floorHash(sa)).toBe(floorHash(sb));
    }
    expect(sa.tick).toBeGreaterThan(2000);
    expect(sa.score).toEqual(sb.score);
    expect(Math.abs(sa.tick - sb.tick)).toBeLessThanOrEqual(DELAY);
    expect(friend.resyncs).toBe(0);
    expect(seen.length).toBeGreaterThan(5);
  });

  it('a copy knocked out of step is put right from the host', () => {
    const { a, b, pump } = line(2);
    const host = new Lockstep(a, 0, 1);
    const friend = new Lockstep(b, 1, 1);
    const sa = startFloor(setup(23));
    const sb = startFloor(setup(23));
    const ta = screen(host, sa, keys(3));
    const tb = screen(friend, sb, keys(4));
    for (let i = 0; i < 400; i++) {
      ta();
      tb();
      pump();
    }
    sb.players[3].x += 2.5;
    for (let i = 0; i < 900; i++) {
      ta();
      tb();
      pump();
    }
    expect(friend.resyncs).toBeGreaterThanOrEqual(1);
    // caught up: from here on, at the same tick, the same game
    for (let i = 0; i < 300; i++) {
      ta();
      tb();
      pump();
      if (sa.tick === sb.tick) expect(floorHash(sb)).toBe(floorHash(sa));
    }
  });

  it('a game from another tip-off is not mixed in, and a quit is heard', () => {
    const { a, b, pump } = line(1);
    const host = new Lockstep(a, 0, 2);
    const friend = new Lockstep(b, 1, 3);
    host.fill(0, () => ({ dx: 1 }));
    pump();
    pump();
    expect(friend.ready(DELAY + 1)).toBe(false);
    const again = new Lockstep(b, 1, 2);
    again.quit();
    pump();
    pump();
    expect(host.gone).toBe(true);
    expect(friend.gone).toBe(false);
  });
});
