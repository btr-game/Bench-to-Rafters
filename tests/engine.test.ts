import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { makeRng, next, normal } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { runCareer } from '../scripts/harness';

const input = { name: 'Test Player', number: 23, pos: 'SF' as const, archetype: 1, focus: ['SHT', 'PER'] as ('SHT' | 'PER')[], hometown: 'Akron, OH', highSchool: 'St. Vincent' };

function playOut(s: GameState, maxSteps = 5000): number {
  let steps = 0;
  while (steps++ < maxSteps) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(s, p.decision.choices.find((c) => !c.disabled)!.id);
    else advance(s);
  }
  return steps;
}

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 100; i++) expect(next(a)).toBe(next(b));
  });
  it('normal() has roughly the right mean and spread', () => {
    const r = makeRng(1);
    const xs = Array.from({ length: 20000 }, () => normal(r, 10, 2));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
    expect(m).toBeGreaterThan(9.9);
    expect(m).toBeLessThan(10.1);
    expect(sd).toBeGreaterThan(1.9);
    expect(sd).toBeLessThan(2.1);
  });
});

describe('flow', () => {
  it('plays a full career to retirement', () => {
    const s = newGame(11, input);
    const steps = playOut(s);
    expect(s.step).toBe('retired');
    expect(steps).toBeLessThan(5000);
    expect(s.history.length).toBeGreaterThanOrEqual(4);
    expect(s.verdict).toBeTruthy();
  });

  it('same seed and same choices give the same career', () => {
    const a = newGame(99, input);
    const b = newGame(99, input);
    playOut(a);
    playOut(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('game state is plain JSON at every step (saves can use JSON.stringify)', () => {
    const s = newGame(5, input);
    for (let i = 0; i < 60; i++) {
      const copy = JSON.parse(JSON.stringify(s));
      expect(copy).toEqual(s);
      const p = prompt(s);
      if (p.type === 'retired') break;
      if (p.type === 'decision') choose(s, p.decision.choices.find((c) => !c.disabled)!.id);
      else advance(s);
    }
  });

  it('a game resumed from JSON continues identically', () => {
    const a = newGame(21, input);
    for (let i = 0; i < 25; i++) {
      const p = prompt(a);
      if (p.type === 'decision') choose(a, p.decision.choices.find((c) => !c.disabled)!.id);
      else advance(a);
    }
    const b: GameState = JSON.parse(JSON.stringify(a));
    playOut(a);
    playOut(b);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('a season takes a handful of clicks (§1 design pillar)', () => {
    const r = runCareer(3, 'smart');
    const seasons = r.paths.length > 0 ? r.retireAge - 14 : 1;
    expect(r.steps / seasons).toBeLessThan(10);
  });
});

describe('engine purity', () => {
  it('never calls Math.random() or imports React', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
      });
    for (const f of walk(join(__dirname, '../src/engine'))) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/Math\.random\s*\(/);
      expect(src, f).not.toMatch(/from 'react'/);
    }
  });
});

describe('growth calibration (§7)', () => {
  // "Peaks near 70" is read as: with sensible choices (smart policy) the peak is 70 ± 3,
  // and random choices peak lower.
  it('a potential-70 player peaks near OVR 70', () => {
    const meanPeak = (policy: 'random' | 'smart') => {
      const peaks: number[] = [];
      for (let i = 0; i < 300; i++) {
        const r = runCareer(20000 + i, policy);
        if (r.potential >= 68 && r.potential <= 72) peaks.push(r.peakOvr);
      }
      expect(peaks.length).toBeGreaterThan(30);
      return peaks.reduce((s, x) => s + x, 0) / peaks.length;
    };
    const random = meanPeak('random');
    const smart = meanPeak('smart');
    console.log(`potential 68-72 mean peak: random ${random.toFixed(2)}, smart ${smart.toFixed(2)}`);
    expect(smart).toBeGreaterThan(random); // good decisions matter
    expect(smart).toBeGreaterThan(67);
    expect(smart).toBeLessThan(73);
  });
});
