// Round 32: the next generation (Love storyline to a son; his career built from his father's;
// a share of his legacy on his father's card), and the Day one page's class.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { canPlayChild, childGame, childLegacy, childSeed } from '../src/engine/nextGen';
import { careerRecord } from '../src/engine/career/record';
import { legacyIndex } from '../src/engine/awards/tiers';
import { NEXT_GEN } from '../src/engine/balance';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A career played by the harness's smart player (who says yes to love, a proposal and a family). */
function career(seed: number): GameState {
  const r = makeRng(seed);
  const s = newGame(seed, { ...input, mode: 'standard' });
  s.flags.fast = 1;
  s.flags.simPostseason = 1;
  for (let k = 0; k < 6000; k++) {
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(s, smartChoice(s, pr.decision, r));
    else advance(s);
  }
  return s;
}

/** A retired father with a son, without playing a whole career. */
function father(): GameState {
  const g = newGame(99, { ...input, mode: 'stars' });
  g.step = 'retired';
  g.stage = 'RETIRED';
  g.flags.child = g.year;
  return g;
}

describe('round 32: the next generation', () => {
  it('the Love storyline ends in a son for some careers, and only after a career ends can he play', () => {
    let kids = 0;
    for (let i = 0; i < 12; i++) {
      const g = career(32001 + i);
      expect(g.step).toBe('retired');
      if (g.flags.child) {
        kids++;
        expect(canPlayChild(g)).toBe(true);
      }
    }
    expect(kids).toBeGreaterThan(0);
    const g = father();
    g.step = 'offseason';
    expect(canPlayChild(g)).toBe(false);
  }, 240_000);

  it('the son: Comet speed, his father\'s difficulty, number and roots, no family of his own', () => {
    const f = father();
    const k = childGame(f, childSeed(f), 'rec-1', 120, 'slot-1');
    expect(k.flags.gen2).toBe(1);
    expect(k.flags.comet).toBe(1);
    expect(k.flags.fast).toBe(1);
    expect(k.flags.sim).toBe(1);
    expect(k.mode).toBe('stars');
    expect(k.player.number).toBe(23);
    expect(k.player.name.endsWith(' Hale')).toBe(true);
    expect(k.player.name).not.toBe('Marcus Hale');
    expect(k.player.country).toBe(f.player.country);
    expect(k.parent).toMatchObject({ name: 'Marcus Hale', recId: 'rec-1', legacy: 120, slot: 'slot-1', peak: Math.round(f.player.peakOvr), titles: 0, mvps: 0 });
    // the same son every time his father's save is looked at
    expect(childGame(f, childSeed(f), 'rec-1', 120).player.name).toBe(k.player.name);
    // and never a third generation
    k.step = 'retired';
    k.flags.child = k.year;
    expect(canPlayChild(k)).toBe(false);
  });

  it('a lab father\'s son plays the standard difficulty', () => {
    const f = father();
    f.mode = 'lab';
    expect(childGame(f, 5, 'r', 0).mode).toBe('standard');
  });

  it('like his father, a little worse more often than better, with rare big jumps', () => {
    const f = father();
    const dh: number[] = [];
    const dp: number[] = [];
    for (let i = 0; i < 300; i++) {
      const k = childGame(f, 1000 + i * 7919, 'r', 0).player;
      dh.push(k.fullHeight - f.player.fullHeight);
      dp.push(k.potential - f.player.potential);
    }
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(Math.abs(mean(dh))).toBeLessThan(0.6);
    expect(dh.filter((x) => Math.abs(x) <= 2).length).toBeGreaterThan(240);
    expect(dh.some((x) => Math.abs(x) >= 3)).toBe(true);
    expect(mean(dp)).toBeLessThan(-1);
    expect(mean(dp)).toBeGreaterThan(-5);
    expect(dp.filter((x) => x < 0).length).toBeGreaterThan(dp.filter((x) => x > 0).length * 1.5);
  });

  it('a share of his legacy goes to his father, on the father\'s card and in his legacy points', () => {
    const f = father();
    const rec = careerRecord(f);
    const kid = childLegacy({ ...rec, name: 'Tari Hale', legacy: 80 });
    expect(kid.adds).toBeCloseTo(80 * NEXT_GEN.share, 5);
    const before = legacyIndex(f);
    f.kid = kid;
    expect(legacyIndex(f)).toBeCloseTo(before + kid.adds, 5);
    expect(careerRecord(f).child?.name).toBe('Tari Hale');
  });
});

describe('round 32: Day one scrolls', () => {
  it('a moment\'s kind is a prefixed class, so it never picks up a page\'s own (the intro page\'s .intro)', () => {
    const src = readFileSync('src/ui/components/Overlays.tsx', 'utf8');
    expect(src).toContain('overlay moment mo-${m.kind}');
    expect(src).not.toMatch(/overlay moment \$\{m\.kind\}/);
  });
});
