// Round 39, online: the Floor with a human on each team (owner: "can you make the game multiplayer
// as well?", head to head). Both computers run the same game from the same setup and the same inputs,
// so it must replay exactly, survive a copy through JSON (the resync), and treat team 1's human as
// team 0's is treated.

import { describe, expect, it } from 'vitest';
import { floorHash, floorResult, mirrorFloor, startFloor, stepFloor, type FloorInput, type FloorSetup, type FloorState } from '../src/engine/floor/sim';
import { leanRatings } from '../src/engine/floor/career';
import { makeRng, next } from '../src/engine/rng';
import { COURT } from '../src/engine/floor/court';

const POS = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C'] as const;
const team = (tag: string, user: boolean) =>
  POS.map((pos, i) => ({ id: tag + i, name: `${tag} Player${i}`, pos, number: 10 + i, r: leanRatings(i < 5 ? 76 : 70, pos, ((i * 7) % 5) - 2), user: user && i === 0 }));
const setup = (seed: number, two = true): FloorSetup => ({ seed, mode: 'standard', us: { name: 'Home', short: 'HOM', color: '#c0392b', players: team('H', true) }, them: { name: 'Away', short: 'AWY', color: '#2850a0', players: team('A', two) }, score: [80, 80] });

/** A player's keys, scripted from a seeded stream: moving, shooting when he has it, reaching on defence. */
function script(seed: number, team: 0 | 1) {
  const r = makeRng(seed);
  let held = 0;
  return (s: FloorState): FloorInput => {
    const me = team === 0 ? s.user : s.two!.user;
    const mine = s.ball.holder === me;
    const goal = team === 0 ? COURT.w - 10 : 10;
    const p = s.players[me];
    const inp: FloorInput = { dx: Math.sign(goal - p.x) * (next(r) < 0.8 ? 1 : 0), dy: Math.round(next(r) * 2 - 1), sprint: next(r) < 0.3 };
    if (mine || (s.phase === 'ft' && s.ft?.by === me)) {
      if (held > 0) {
        inp.shoot = true;
        held--;
      } else if (next(r) < 0.06) held = 8 + Math.floor(next(r) * 6);
      else if (next(r) < 0.03) inp.pass = 'auto';
      else if (next(r) < 0.05) inp.finish = true;
    } else if (s.poss !== team && next(r) < 0.05) inp.steal = true;
    else if (s.poss !== team && next(r) < 0.02) inp.block = true;
    return inp;
  };
}

function play(seed: number, a = 1, b = 2, ticks = 20000): FloorState {
  const s = startFloor(setup(seed));
  const i0 = script(a, 0);
  const i1 = script(b, 1);
  for (let k = 0; k < ticks && s.phase !== 'over'; k++) stepFloor(s, i0(s), i1(s));
  return s;
}

describe('round 39: the Floor, head to head', () => {
  it('knows the other team has a human, and only when it does', () => {
    const s = startFloor(setup(3));
    expect(s.two).not.toBeNull();
    expect(s.players[s.two!.user].team).toBe(1);
    expect(startFloor(setup(3, false)).two).toBeNull();
  });

  it('replays exactly from the same setup and the same keys', () => {
    const a = play(5);
    const b = play(5);
    expect(a.phase).toBe('over');
    expect(floorHash(a)).toBe(floorHash(b));
    expect(a.score).toEqual(b.score);
  });

  it('other keys give another game', () => {
    expect(floorHash(play(5, 1, 2))).not.toBe(floorHash(play(5, 1, 3)));
  });

  it('team 1 human plays: he shoots, and the AI never inbounds through him', () => {
    let fga = 0;
    let inbounds = 0;
    for (const seed of [7, 8, 9]) {
      const s = startFloor(setup(seed));
      const i0 = script(seed, 0);
      const i1 = script(seed + 50, 1);
      for (let k = 0; k < 20000 && s.phase !== 'over'; k++) {
        const wasDead = s.phase === 'dead';
        stepFloor(s, i0(s), i1(s));
        // the inbound pass leaves from someone who is not a human
        if (wasDead && s.phase === 'live' && s.ball.flight?.kind === 'pass') {
          inbounds++;
          expect([s.user, s.two!.user]).not.toContain(s.ball.flight.by);
        }
      }
      fga += s.players[s.two!.user].box.fga;
    }
    expect(inbounds).toBeGreaterThan(10);
    expect(fga).toBeGreaterThan(0);
  });

  it('an idle friend is played by the AI (null input), and the game still finishes', () => {
    const s = startFloor(setup(11));
    const i0 = script(1, 0);
    for (let k = 0; k < 20000 && s.phase !== 'over'; k++) stepFloor(s, i0(s), null);
    expect(s.phase).toBe('over');
    expect(s.two!.auto).toBe(true);
  });

  it('survives a copy through JSON: the resync gives the same game on', () => {
    const s = startFloor(setup(13));
    const i0 = script(4, 0);
    const i1 = script(6, 1);
    for (let k = 0; k < 1500; k++) stepFloor(s, i0(s), i1(s));
    const copy: FloorState = JSON.parse(JSON.stringify(s));
    expect(floorHash(copy)).toBe(floorHash(s));
    // the same keys from here on, into both
    const j0 = script(9, 0);
    const j1 = script(10, 1);
    const k0 = script(9, 0);
    const k1 = script(10, 1);
    for (let k = 0; k < 1500; k++) {
      stepFloor(s, j0(s), j1(s));
      stepFloor(copy, k0(copy), k1(copy));
    }
    expect(floorHash(copy)).toBe(floorHash(s));
  });

  it('the mirror shows the friend his own end: teams, score and court turned round', () => {
    const s = play(15, 1, 2, 2000);
    const m = mirrorFloor(s);
    expect(m.user).toBe(s.two!.user);
    expect(m.two!.user).toBe(s.user);
    expect(m.score).toEqual([s.score[1], s.score[0]]);
    expect(m.poss).toBe(s.poss === 0 ? 1 : 0);
    expect(m.players[m.user].team).toBe(0);
    m.players.forEach((p, i) => expect(p.x).toBeCloseTo(COURT.w - s.players[i].x, 9));
    // seen from his end, the result is his
    const r = floorResult(m);
    expect(r.us).toBe(s.score[1]);
    expect(r.line).toEqual(s.players[s.two!.user].box);
    // and the copy leaves the game as it was
    expect(floorHash(s)).toBe(floorHash(play(15, 1, 2, 2000)));
  });

  it('with no friend, the mirror is the game itself', () => {
    const s = startFloor(setup(17, false));
    expect(mirrorFloor(s)).toBe(s);
  });
});
