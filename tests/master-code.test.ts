// After round 41: the master code opens everything (src/ui/road.ts). The code itself is never written
// out, here included: give it as MASTER_CODE to check it too.

import { describe, expect, it } from 'vitest';
import { exitCode, inTutorial, levelOpen, masterCode, pastBeginner, revealCode, tourOpen, unlockAll, unlocked, type Road } from '../src/ui/road';

const fresh = (): Road => ({ passed: {}, minis: {}, v: 35 });

describe('the master code', () => {
  it('is not the exit code, nor the deck password', () => {
    expect(masterCode(revealCode())).toBe(false);
    expect(masterCode('btrdev')).toBe(false);
    expect(masterCode('')).toBe(false);
    const code = process.env.MASTER_CODE;
    if (code) {
      expect(masterCode(` ${code.toUpperCase()} `)).toBe(true);
      expect(exitCode(code)).toBe(false);
    }
  });

  it('opens everything on a fresh road: the tutorial, every level, mode and stop', () => {
    const r = fresh();
    expect(inTutorial(r)).toBe(true);
    expect(levelOpen(r, 'advanced')).toBe(false);
    expect(unlocked(r, 'minis')).toBe(false);
    const all = unlockAll(r);
    expect(inTutorial(all)).toBe(false);
    for (const l of ['beginner', 'intermediate', 'advanced'] as const) expect(levelOpen(all, l)).toBe(true);
    for (const u of ['reality', 'stars', 'minis'] as const) expect(unlocked(all, u)).toBe(true);
    expect(pastBeginner(all)).toBe(true);
    expect(tourOpen(all)).toBe(true);
    // what was played stays as it was
    expect(all.passed).toEqual({});
  });
});
