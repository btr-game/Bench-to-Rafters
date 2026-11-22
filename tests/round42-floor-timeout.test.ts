// The Floor's timeouts (owner: "i dont think the call time out works"). A timeout is granted at a
// dead ball or with the ball in his team's hands; anywhere else (on defence, with the ball in the
// air, at the line) the screen holds the request and sends it every tick until it is granted.

import { describe, expect, it } from 'vitest';
import { franchise, legendSetup } from '../src/engine/floor/game';
import { canTimeout, freshEvents, startFloor, stepFloor, type FloorState } from '../src/engine/floor/sim';

const game = () => startFloor(legendSetup({ seed: 11, us: franchise('BOS'), them: franchise('LAL'), length: 'fourth' }));

/** The game played on (his keys idle) until `when` holds; a copy of that moment. */
function find(when: (s: FloorState) => boolean): FloorState {
  const s = game();
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (when(s)) return structuredClone(s);
    stepFloor(s, {});
  }
  throw new Error('never reached');
}

const called = (s: FloorState) => freshEvents(s).some((e) => e.kind === 'timeout' && e.team === 0);

describe('the Floor: calling a timeout', () => {
  it('with the ball in his team’s hands: granted at once, and the clock stops', () => {
    const s = find((x) => x.phase === 'live' && x.poss === 0 && x.ball.holder !== null && !x.ball.flight && x.tick > 50);
    expect(canTimeout(s, 0)).toBe(true);
    stepFloor(s, { timeout: true });
    expect(called(s)).toBe(true);
    expect(s.timeouts[0]).toBe(2);
    expect(s.phase).toBe('dead');
    const clock = s.clock;
    for (let i = 0; i < 10; i++) stepFloor(s, {});
    expect(s.clock).toBe(clock);
  });

  it('at a dead ball (either team’s ball): granted', () => {
    for (const poss of [0, 1] as const) {
      const s = find((x) => x.phase === 'dead' && x.poss === poss && x.tick > 10);
      expect(canTimeout(s, 0)).toBe(true);
      stepFloor(s, { timeout: true });
      expect(called(s)).toBe(true);
      expect(s.timeouts[0]).toBe(2);
    }
  });

  it('on defence, or at the line, it is not granted then; held, it comes at the next chance, once', () => {
    for (const when of [(x: FloorState) => x.phase === 'live' && x.poss === 1 && x.ball.holder !== null, (x: FloorState) => x.phase === 'ft']) {
      const s = find(when);
      expect(canTimeout(s, 0)).toBe(false);
      stepFloor(s, { timeout: true });
      expect(called(s)).toBe(false);
      expect(s.timeouts[0]).toBe(3);
      // what the screen does: the request rides with his keys until his timeouts change
      let n = 0;
      for (let i = 0; i < 4000 && s.timeouts[0] === 3; i++) {
        stepFloor(s, { timeout: true });
        n += freshEvents(s).filter((e) => e.kind === 'timeout' && e.team === 0).length;
      }
      expect(s.timeouts[0]).toBe(2);
      expect(n).toBe(1);
      expect(canTimeout(s, 0) || s.phase !== 'live').toBe(true);
    }
  });

  it('none left: nothing happens', () => {
    const s = find((x) => x.phase === 'dead' && x.tick > 10);
    s.timeouts[0] = 0;
    expect(canTimeout(s, 0)).toBe(false);
    stepFloor(s, { timeout: true });
    expect(called(s)).toBe(false);
    expect(s.timeouts[0]).toBe(0);
  });
});
