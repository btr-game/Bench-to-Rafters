// Round 37: the Regular guy peak curve (owner: "in regular guy ... i want the upper hand (above 70
// ovr) to go linearly down ... try to aim the more niche factors than the main factors (stats)").
// Two niche dials: a potential drawn past the top is drawn again instead of piling on the cap, and a
// star's ratings that turning points, the shop or mini-games pushed past their caps settle back.
import { describe, expect, it } from 'vitest';
import { MODES, type SkewDist } from '../src/engine/balance';
import { drawPotential } from '../src/engine/player/create';
import { settleBack } from '../src/engine/player/growth';
import { ovrOf } from '../src/engine/player/ovr';
import { makeRng } from '../src/engine/rng';
import { newGame } from '../src/engine/flow';
import type { GameState } from '../src/engine/types';

const input = { name: 'Test Player', number: 23, pos: 'SF' as const, archetype: 1, focus: ['SHT', 'PER'], hometown: 'Akron, OH', highSchool: 'St. Vincent' };

describe('round 37: the top of the Regular guy curve', () => {
  it('a potential drawn past the top is drawn again, so the cap no longer collects the long tail', () => {
    const d = MODES.standard.potential;
    expect(d.redrawOver).toBe(99);
    const plain: SkewDist = { ...d, redrawOver: undefined };
    const count = (dist: SkewDist) => {
      const rng = makeRng(37);
      let over = 0;
      for (let i = 0; i < 20000; i++) if (drawPotential(rng, dist) > 99) over++;
      return over;
    };
    // without the redraw a few in a hundred land past 99 (and peak on the cap); with it, almost none
    expect(count(plain)).toBeGreaterThan(200);
    expect(count(d)).toBeLessThan(5);
    // the other modes keep their draws as they were
    expect(MODES.fast.potential.redrawOver).toBeUndefined();
    expect(MODES.reality.potential.redrawOver).toBeUndefined();
    expect(MODES.stars.potential.redrawOver).toBeUndefined();
  });

  it('ratings past their caps settle back by a share that grows with OVR, and nothing below the line moves', () => {
    const s = MODES.standard.settle!;
    expect(s).toBeDefined();
    expect(s.to).toBeGreaterThan(s.from);
    const g = newGame(3, input as never) as GameState;
    // the same player twice: a star well past the line, and one under it, each a few points past his caps
    const star = structuredClone(g.player);
    const plain = structuredClone(g.player);
    for (const k of Object.keys(star.attrs) as (keyof typeof star.attrs)[]) {
      star.caps[k] = 90;
      star.attrs[k] = 98;
      plain.caps[k] = s.from - 12;
      plain.attrs[k] = s.from - 8;
    }
    expect(ovrOf(star.attrs, star.pos)).toBeGreaterThanOrEqual(s.to);
    expect(ovrOf(plain.attrs, plain.pos)).toBeLessThan(s.from);
    const before = { ...plain.attrs };
    settleBack(star, 'standard');
    settleBack(plain, 'standard');
    // at the top the full share of the excess goes; under the line nothing does
    for (const k of Object.keys(star.attrs) as (keyof typeof star.attrs)[]) {
      expect(star.attrs[k]).toBeCloseTo(98 - 8 * s.share, 6);
      expect(plain.attrs[k]).toBe(before[k]);
    }
    // a rating at or under its cap never moves, and the other modes have no settle
    const capped = structuredClone(g.player);
    for (const k of Object.keys(capped.attrs) as (keyof typeof capped.attrs)[]) capped.caps[k] = capped.attrs[k] = 97;
    const held = { ...capped.attrs };
    settleBack(capped, 'standard');
    expect(capped.attrs).toEqual(held);
    expect(MODES.stars.settle).toBeUndefined();
    expect(MODES.reality.settle).toBeUndefined();
  });

  it('halfway up the ramp, half the share', () => {
    const s = MODES.standard.settle!;
    const g = newGame(5, input as never) as GameState;
    const p = structuredClone(g.player);
    // tune every rating to land his OVR in the middle of the ramp, a point past each cap
    const mid = (s.from + s.to) / 2;
    for (const k of Object.keys(p.attrs) as (keyof typeof p.attrs)[]) {
      p.attrs[k] = mid;
      p.caps[k] = mid - 1;
    }
    const ovr = ovrOf(p.attrs, p.pos);
    const want = s.share * Math.min(1, Math.max(0, (ovr - s.from) / (s.to - s.from)));
    settleBack(p, 'standard');
    for (const k of Object.keys(p.attrs) as (keyof typeof p.attrs)[]) expect(p.attrs[k]).toBeCloseTo(mid - want, 6);
  });
});
