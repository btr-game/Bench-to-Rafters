// Round 36: the finale in place of Thank you for playing (owner: "for the first time it's played,
// its unskippable but from the next time a skip button appears", "leaving a career that isn't
// finished doesn't deserve the ending card", "i dont want this to be any longer than 2 minutes").

import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/engine/flow';
import { raftersTeams } from '../src/engine/awards/legacy';
import { play } from '../src/dev/stage';
import { FINALE_MAX, MAKERS, actsOf, creditsOf, finaleKind, speechOf, timeline } from '../src/ui/finale';
import type { GameState } from '../src/engine/types';

class FakeStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
afterEach(() => vi.unstubAllGlobals());

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };
const hung = play((s) => s.step === 'retired' && raftersTeams(s).length > 0, { mode: 'stars', fast: true, tries: 16 });
const plain = play((s) => s.step === 'retired' && raftersTeams(s).length === 0, { mode: 'standard', fast: true, tries: 16 });
const total = (g: GameState) => timeline(g, finaleKind(g)!).reduce((t, x) => t + x.secs, 0);

describe('which ending a career gets', () => {
  it('none for a career still going, the daily or a lab run; the title and thanks for a level', () => {
    const g = newGame(5, { ...input, mode: 'standard' });
    expect(finaleKind(g), 'a career still going').toBeNull();
    const done = { ...g, step: 'retired' as const };
    expect(finaleKind({ ...done, flags: { ...done.flags, daily: 1 } })).toBeNull();
    expect(finaleKind({ ...done, mode: 'lab' })).toBeNull();
    expect(finaleKind({ ...done, flags: { ...done.flags, level: 1 } })).toBe('level');
    expect(actsOf('level')).toEqual(['title', 'thanks']);
    expect(finaleKind(done)).toBe('credits');
  });

  it('the whole ceremony when his jersey hangs; the credits alone when it does not', () => {
    expect(hung && plain, 'both kinds of career found').toBeTruthy();
    expect(finaleKind(hung!)).toBe('rafters');
    expect(actsOf('rafters')).toEqual(['arena', 'speech', 'jersey', 'roll', 'title', 'thanks']);
    expect(finaleKind(plain!)).toBe('credits');
  });
});

describe('the finale itself', () => {
  it('stays under two minutes, however big the career', () => {
    for (const g of [hung!, plain!]) expect(total(g)).toBeLessThanOrEqual(FINALE_MAX);
    // a career with every honour going
    const big = structuredClone(hung!);
    for (let i = 0; i < 60; i++) big.awards.push({ year: big.year, level: 'NBA', key: `X${i}`, label: `Honour ${i}` });
    expect(total(big)).toBeLessThanOrEqual(FINALE_MAX);
    expect(timeline(big, 'rafters').at(-1)).toEqual({ act: 'thanks', secs: 0 });
  });

  it('writes his speech from the career, four or five lines, ending on his number', () => {
    const lines = speechOf(hung!);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines.join(' ')).toContain(hung!.player.hometown);
    expect(lines.at(-1)).toContain(`number ${hung!.player.number}`);
  });

  it('rolls the career as credits: him, his teams, the rafters; the makers in two lines', () => {
    const blocks = creditsOf(hung!);
    const heads = blocks.map((b) => b.head);
    expect(heads[0]).toBe('Starring');
    expect(heads).toContain('Teams');
    expect(heads).toContain('Forever');
    expect(blocks.find((b) => b.head === 'Teams')!.rows.some((r) => r.includes('NBA'))).toBe(true);
    expect(MAKERS).toEqual([
      { role: 'Developer', name: 'MJ Kwon' },
      { role: 'Code, art and sound', name: 'Claude' },
    ]);
  });

  it('can’t be skipped the first time an ending plays on a device, and can after', async () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.resetModules();
    const f = await import('../src/ui/finale');
    expect(f.finaleSeen('rafters')).toBe(false);
    expect(f.finaleSeen('level'), 'a level’s short thank-you can always be skipped').toBe(true);
    f.markFinaleSeen('rafters');
    expect(f.finaleSeen('rafters')).toBe(true);
    expect(f.finaleSeen('credits'), 'each ending counts on its own').toBe(false);
  });
});
