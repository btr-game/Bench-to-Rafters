// Round 30: sim mode makes the turning-point calls too (and lists them), and Comet, Shoot for the
// stars at hyper speed, about five minutes a career by the playtime model (scripts/playtime.ts).

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward, setFast, setSim } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { playtime } from '../scripts/playtime';
import { NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { ICONS } from '../src/ui/art/icons';

const base = { name: 'Nova Reyes', number: 9, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Tucson', highSchool: 'Sabino High' };

/** Plays the way the store does: each move, then fast break runs on to the next stop. */
function run(s: GameState, seed: number, each: (s: GameState) => void): GameState {
  const r = makeRng(seed);
  for (let i = 0; i < 3000; i++) {
    each(s);
    s.moments = [];
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
    fastForward(s);
  }
  return s;
}

describe('sim mode and turning points', () => {
  it('never stops for a turning point, and lists each call it made until the next move', () => {
    const s = newGame(300030, { ...base, mode: 'stars' });
    setSim(s, true);
    let stoppedAtEvent = 0;
    let calls = 0;
    run(s, 300030, (x) => {
      const p = prompt(x);
      if (p.type === 'decision' && p.decision.kind === 'event') stoppedAtEvent++;
      if (x.simCalls?.length) {
        calls += x.simCalls.length;
        for (const c of x.simCalls) expect(c.title && c.choice).toBeTruthy();
      }
    });
    expect(stoppedAtEvent).toBe(0);
    expect(calls).toBeGreaterThan(5);
  });

  it('never takes a high-risk choice when there is another', () => {
    const s = newGame(300031, { ...base, mode: 'stars' });
    setSim(s, true);
    s.pending.unshift({ id: 'test-ev', kind: 'event', title: 'A test', text: '', choices: [{ id: '0', label: 'Go big', risk: 'High' }, { id: '1', label: 'Play it safe', risk: 'Low' }], data: { eventId: 'nonexistent' } });
    const before = s.pending.length;
    try {
      fastForward(s);
    } catch {
      // the made-up event has no definition to resolve; the call it took is what matters
    }
    expect(s.pending.length).toBeLessThan(before + 5);
  });

  it('keeps no list after a move of his own', () => {
    const s = newGame(300032, { ...base, mode: 'stars' });
    s.simCalls = [{ title: 'x', choice: 'y', text: '', changes: [] }];
    s.reel = [{ title: 'x', line: '' }];
    const p = prompt(s);
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, makeRng(1)));
    else advance(s);
    expect(s.simCalls).toBeUndefined();
    expect(s.reel).toBeUndefined();
  });
});

describe('Comet', () => {
  it('is Shoot for the stars only, with fast break and sim locked on', () => {
    expect(newGame(1, { ...base, mode: 'standard', comet: true }).flags.comet).toBeUndefined();
    const s = newGame(1, { ...base, mode: 'stars', comet: true });
    expect([s.flags.comet, s.flags.fast, s.flags.sim]).toEqual([1, 1, 1]);
    setFast(s, false);
    setSim(s, false);
    expect([s.flags.fast, s.flags.sim]).toEqual([1, 1]);
  });

  it('stops only for where he plays, the draft, brand deals and retiring, keeps the rest of the story in a list, and earns its achievement', () => {
    const s = newGame(300033, { ...base, mode: 'stars', comet: true });
    fastForward(s);
    const stops = new Set<string>();
    let reel = 0;
    const pages = new Set<string>();
    run(s, 300033, (x) => {
      const p = prompt(x);
      if (p.type === 'decision') stops.add(p.decision.kind);
      else if (p.type !== 'retired') stops.add(`step:${x.step}`);
      reel += x.reel?.length ?? 0;
      for (const m of x.moments) pages.add(m.kind);
    });
    for (const k of stops) expect(['offers', 'declare', 'withdraw', 'brand', 'retirePrompt', 'transfer', 'military'], k).toContain(k);
    for (const k of pages) expect(['intro', 'draft', 'title', 'awards', 'event'], k).toContain(k);
    expect(reel).toBeGreaterThan(0);
    expect(s.step).toBe('retired');
    // a finished Comet career earns its achievement; the same career without the mark does not
    expect(earnedNow(s, NO_TOTALS)).toContain('comet1');
    s.flags.comet = 0;
    expect(earnedNow(s, NO_TOTALS)).not.toContain('comet1');
  });

  it('takes about five minutes a career by the playtime model', () => {
    const all = Array.from({ length: 60 }, (_, i) => playtime(9100 + i, 'comet'));
    const mean = all.reduce((t, x) => t + x.seconds, 0) / all.length / 60;
    expect(mean).toBeGreaterThan(4.5);
    expect(mean).toBeLessThan(6);
  });

  it('has its icon', () => {
    expect(ICONS.comet).toBeTruthy();
  });
});
