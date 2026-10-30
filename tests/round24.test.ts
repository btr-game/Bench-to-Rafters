// Round 24: achievements, the career record and longevity.

import { describe, expect, it } from 'vitest';
import { runCareer } from '../scripts/harness';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { newGame, prompt, choose, advance } from '../src/engine/flow';
import { careerRecord } from '../src/engine/career/record';
import { ageCeiling } from '../src/engine/player/growth';
import { RETIRE } from '../src/engine/balance';

describe('achievements', () => {
  it('have unique ids and names, and a few hundred of them in five tiers', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    const names = new Set(ACHIEVEMENTS.map((a) => a.name));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    expect(names.size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(200);
    expect(new Set(ACHIEVEMENTS.map((a) => a.tier)).size).toBe(5);
  });

  it('check whole careers without throwing, and count careers from the totals alone', () => {
    for (const seed of [11, 12, 13]) {
      const s = newGame(seed, { name: 'Ach Test', number: 8, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'] });
      for (let i = 0; i < 4000; i++) {
        const pr = prompt(s);
        if (pr.type === 'retired') break;
        if (pr.type === 'decision') choose(s, pr.decision.choices.find((c) => !c.disabled)!.id);
        else advance(s);
        if (i % 50 === 0) expect(Array.isArray(earnedNow(s, NO_TOTALS))).toBe(true);
      }
      const got = earnedNow(s, { ...NO_TOTALS, finished: 3 });
      expect(got).toContain('c1');
      expect(got).toContain('c3');
      // the record for the career log keeps the card's numbers
      const rec = careerRecord(s);
      expect(rec.name).toBe('Ach Test');
      expect(rec.peak).toBeGreaterThan(0);
    }
    expect(earnedNow(null, { ...NO_TOTALS, finished: 10, daily: 7 })).toEqual(expect.arrayContaining(['c10', 'daily7']));
  });
});

describe('longevity', () => {
  it('has an age ceiling of 85 at 40 and 50 at 50, and nobody plays past 50', () => {
    expect(ageCeiling(36)).toBe(99);
    expect(ageCeiling(40)).toBe(85);
    expect(ageCeiling(50)).toBe(50);
    expect(RETIRE.forcedAge).toBe(50);
    for (const seed of [5, 6, 7]) expect(runCareer(seed, 'smart', 'standard').ages.every((a) => a.age <= 50)).toBe(true);
  });
});
