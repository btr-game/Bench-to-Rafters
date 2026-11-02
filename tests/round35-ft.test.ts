// Round 35: free-throw touch (player/touch.ts). It is on every new career and filled in for old
// saves, it adds to free-throw percentage on top of shooting in the stat model, and the shooting
// plan, the shooting summer, the round's turning points and the shop build it.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { blendPlans, STAT, TOUCH } from '../src/engine/balance';
import { expected, genProfile } from '../src/engine/sim/statModel';
import { userProfile } from '../src/engine/career/season';
import { addTouch, seasonTouch, touchOf, touchStart } from '../src/engine/player/touch';
import { ROUND35_EVENTS } from '../src/engine/events/round35';
import { offerEvent } from '../src/engine/events/resolver';
import { SHOP_ITEMS } from '../src/content/shop';
import { applyItem, pushShop } from '../src/engine/economy/shop';
import { ICONS, meterIcon, shopIcon } from '../src/ui/art/icons';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A career played to an NBA offseason with nothing waiting. */
function toNbaOffseason(seed: number): GameState {
  const g = newGame(seed, { ...input, mode: 'stars' });
  const r = makeRng(seed);
  for (let k = 0; k < 8000; k++) {
    if (g.stage === 'NBA' && g.step === 'offseason' && !g.pending.length && g.history.some((h) => h.level === 'NBA')) break;
    fastForward(g);
    const pr = prompt(g);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
    else advance(g);
  }
  return g;
}

describe('free-throw touch', () => {
  it('starts on every new career, from his shooting, without touching the random stream', () => {
    const a = newGame(351, input);
    expect(a.player.touch).toBe(touchStart(a.player));
    expect(a.player.touch).toBeGreaterThanOrEqual(TOUCH.start.min);
    expect(a.player.touch).toBeLessThanOrEqual(TOUCH.start.max);
    // the same career twice is the same touch
    expect(newGame(351, input).player.touch).toBe(a.player.touch);
    // a better shooting card starts with more
    const shooter = touchStart({ ...a.player, startAttrs: { ...a.player.startAttrs, SHT: 60 } });
    const brick = touchStart({ ...a.player, startAttrs: { ...a.player.startAttrs, SHT: 20 } });
    expect(shooter).toBeGreaterThan(brick);
  });

  it('fills in a sensible touch for a career saved before round 35', () => {
    const g = newGame(352, input);
    const p = g.player;
    const start = p.touch!;
    p.age = 27;
    delete p.touch;
    let want = start;
    for (let age = 15; age <= 27; age++) want += seasonTouch(age);
    expect(touchOf(p)).toBe(Math.round(want));
    expect(p.touch).toBe(Math.round(want));
    // a 27-year-old has had more reps than a 14-year-old
    expect(p.touch!).toBeGreaterThan(start);
    // and the profile the stat model reads has it
    expect(userProfile(g).touch).toBe(p.touch);
    // it stays inside 0-99
    addTouch(p, 500);
    expect(p.touch).toBe(99);
    addTouch(p, -500);
    expect(p.touch).toBe(0);
  });

  it('raises free-throw percentage on top of shooting, and generated players sit at the neutral point', () => {
    const g = newGame(353, input);
    const base = { ...userProfile(g), attrs: { ...g.player.attrs, SHT: 70 } };
    const at = (touch: number) => expected({ ...base, touch }, 'NBA', 32, 1).ftp;
    expect(at(80)).toBeGreaterThan(at(50));
    expect(at(50)).toBeGreaterThan(at(20));
    expect(at(80) - at(50)).toBeCloseTo(30 * STAT.ft.touch, 9);
    // at the neutral point it is the old formula: shooting alone
    expect(at(TOUCH.mid)).toBeCloseTo(STAT.ft.base + (70 - 72) * STAT.ft.sht, 9);
    // a great shooter who builds his touch is a 90% shooter; the same shooter with an average touch is not
    const great = (touch: number) => expected({ ...base, attrs: { ...base.attrs, SHT: 99 }, touch }, 'NBA', 34, 1).ftp;
    expect(great(99)).toBeGreaterThan(0.9);
    expect(great(TOUCH.mid)).toBeLessThan(0.86);
    expect(great(99)).toBeLessThanOrEqual(STAT.ft.max);
    const gen = genProfile({ id: 1, name: 'X', pos: 'SG', shape: 0, age: 25, ovr: 75, pot: 75, height: 77, rep: 10, contractYears: 1, salary: 1 });
    expect(gen.touch).toBe(TOUCH.mid);
  });

  it('grows with the shooting plan, alone or as a side plan', () => {
    expect(blendPlans('shooting').touchGain).toBeGreaterThan(0);
    expect(blendPlans('grind', 'shooting').touchGain).toBeGreaterThan(0);
    expect(blendPlans('shooting', 'grind').touchGain!).toBeGreaterThan(blendPlans('grind', 'shooting').touchGain!);
    expect(blendPlans('balanced').touchGain).toBeUndefined();
  });
});

describe('the round\'s turning points and shop items', () => {
  it('offers each turning point and resolves every choice', () => {
    const g = toNbaOffseason(35);
    expect(g.stage).toBe('NBA');
    expect(ROUND35_EVENTS.length).toBe(3);
    const all = { ...ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C };
    for (const e of ROUND35_EVENTS) {
      // a pixel icon of its own, 16 by 16, drawn in the palette's letters
      const pic = EVENT_ICONS_C[`ev-${e.id}`];
      expect(pic, e.id).toBeTruthy();
      expect(pic.length).toBe(16);
      for (const row of pic) expect(row, e.id).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
      expect(Object.entries(all).filter(([k, v]) => k !== `ev-${e.id}` && v.join('|') === pic.join('|'))).toEqual([]);
      const s = structuredClone(g);
      s.player.touch = 50;
      expect(offerEvent(s, e.id), e.id).toBe(true);
      const d = s.pending[0];
      expect(d.text.length).toBeGreaterThan(30);
      expect(d.choices.length).toBe(3);
      for (const c of d.choices) {
        const t = structuredClone(s);
        expect(() => choose(t, c.id)).not.toThrow();
        expect(t.result?.title).toBe(e.title);
        expect(t.player.touch).toBeGreaterThanOrEqual(0);
        expect(t.player.touch).toBeLessThanOrEqual(99);
      }
    }
    // the first choice of each builds touch, and the result card says so
    for (const id of ['ftAfterHours', 'ftClinic']) {
      const s = structuredClone(g);
      s.player.touch = 50;
      offerEvent(s, id);
      choose(s, s.pending[0].choices[0].id);
      expect(s.player.touch!, id).toBeGreaterThan(50);
      expect(s.result?.changes.some((x) => x.label === 'Free-throw touch' && x.good), id).toBe(true);
    }
    // the iced free throws show their odds, from his shooting and his touch
    const s = structuredClone(g);
    s.player.touch = 20;
    offerEvent(s, 'ftIced');
    const low = s.pending[0].choices[0].risk;
    const t = structuredClone(g);
    t.player.touch = 99;
    t.player.attrs.SHT = 95;
    offerEvent(t, 'ftIced');
    expect(t.pending[0].choices[0].risk).toBe('Low');
    expect(low).not.toBe('Low');
  });

  it('sells two new things for the line, and the routine specialist builds touch too', () => {
    const g = newGame(354, input);
    for (const id of ['ft-line-tape', 'ft-shot-machine', 'ft-routine-coach']) {
      const it35 = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it35, id).toBeTruthy();
      expect(it35.touch, id).toBeGreaterThan(0);
      expect(ICONS[shopIcon(it35.id, it35.name)], id).toBeTruthy();
      const s = structuredClone(g);
      s.player.bank = 1;
      const before = s.player.touch!;
      applyItem(s, it35, 0);
      expect(s.player.touch, id).toBeCloseTo(before + it35.touch!, 9);
    }
    // the new things have icons of their own, and the shop says what they do
    expect(shopIcon('ft-line-tape', '')).toBe('touch');
    expect(shopIcon('ft-shot-machine', '')).toBe('rebounder');
    const s = structuredClone(g);
    s.player.bank = 1;
    pushShop(s, ['ft-line-tape', 'ft-shot-machine']);
    const d = s.pending.find((x) => x.kind === 'shop')!;
    for (const c of d.choices.filter((x) => x.id !== 'leave')) expect(c.detail, c.id).toContain('free-throw line');
  });

  it('shows the touch on the Player tab with its own meter icon', () => {
    expect(meterIcon('Free-throw touch')).toBe('touch');
    expect(ICONS.touch.length).toBe(16);
    expect(ICONS.rebounder.length).toBe(16);
    for (const row of [...ICONS.touch, ...ICONS.rebounder]) expect(row.length).toBe(16);
  });
});
