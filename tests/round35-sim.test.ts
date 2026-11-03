// Round 35 (owner: "sim mode should be unlocked once the user completes one full round (until
// retirement) of each difficulty", then "lets go with allstar as the requirement"): Sim opens once a
// career with an NBA All-Star team has been finished at every difficulty; a Comet never counts.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/engine/flow';
import { DIFFICULTIES, NO_TOTALS, grandTour, simReady } from '../src/engine/achievements';
import type { Mode } from '../src/engine/balance';
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
const fresh = async () => {
  vi.stubGlobal('localStorage', new FakeStorage());
  vi.stubGlobal('sessionStorage', new FakeStorage());
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout, location: { hash: '' } });
  vi.resetModules();
  return { ach: await import('../src/ui/achievements'), store: (await import('../src/store')).useStore };
};

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };
/** A career just retired at this difficulty, an NBA All-Star unless asked otherwise (a Comet when asked). */
const retired = (mode: Mode, o: { comet?: boolean; star?: boolean } = {}): GameState => {
  const g = newGame(7, { ...input, mode, ...(o.comet ? { comet: true } : {}) });
  if (o.star !== false) g.awards.push({ year: g.year, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' });
  g.step = 'retired';
  return g;
};

describe('Sim opens with an All-Star career at every difficulty', () => {
  it('needs a career at each of the three difficulties, an All-Star one for Sim', () => {
    expect(DIFFICULTIES).toEqual(['standard', 'reality', 'stars']);
    expect(grandTour(NO_TOTALS)).toBe(false);
    expect(grandTour({ ...NO_TOTALS, byMode: { standard: 3, reality: 1 } })).toBe(false);
    expect(grandTour({ ...NO_TOTALS, byMode: { standard: 1, reality: 1, stars: 1, lab: 2 } })).toBe(true);
    // the Grand Tour alone is not enough for Sim: each needs an All-Star team
    expect(simReady({ ...NO_TOTALS, byMode: { standard: 1, reality: 1, stars: 1 } })).toBe(false);
    expect(simReady({ ...NO_TOTALS, byMode: { standard: 1, reality: 1, stars: 1 }, starBy: { standard: 1, reality: 1 } })).toBe(false);
    expect(simReady({ ...NO_TOTALS, byMode: { standard: 1, reality: 1, stars: 1 }, starBy: { standard: 1, reality: 1, stars: 1 } })).toBe(true);
  });

  it('counts All-Star careers finished on this device; a Comet or a career with no All-Star team does not', async () => {
    const { ach } = await fresh();
    expect(ach.simOpen()).toBe(false);
    expect(ach.difficultiesLeft()).toEqual(['standard', 'reality', 'stars']);
    ach.countCareer(retired('standard'), false);
    ach.countCareer(retired('reality', { star: false }), false);
    expect(ach.difficultiesLeft(), 'Reality finished, but with no All-Star team').toEqual(['reality', 'stars']);
    ach.countCareer(retired('reality'), false);
    ach.countCareer(retired('stars', { comet: true }), false);
    expect(ach.difficultiesLeft(), 'the Comet left Shoot for the stars to go').toEqual(['stars']);
    expect(ach.simOpen()).toBe(false);
    ach.countCareer(retired('stars'), false);
    expect(ach.difficultiesLeft()).toEqual([]);
    expect(ach.simOpen()).toBe(true);
  });

  it('keeps the Sim switch off until it is open, and lets a career that has it on turn it off', async () => {
    const { ach, store } = await fresh();
    const g = newGame(11, { ...input, mode: 'standard' });
    store.setState({ game: g });
    store.getState().toggleSim();
    expect(store.getState().game!.flags.sim ?? 0, 'shut: nothing happens').toBeFalsy();
    // a career saved with Sim on (before this rule) can still switch it off
    const on = structuredClone(g);
    on.flags.sim = on.flags.fast = 1;
    store.setState({ game: on });
    store.getState().toggleSim();
    expect(store.getState().game!.flags.sim).toBe(0);
    // the Grand Tour done: it switches on
    for (const m of ['standard', 'reality', 'stars'] as const) ach.countCareer(retired(m), false);
    store.getState().toggleSim();
    expect(store.getState().game!.flags.sim).toBe(1);
  });
});
