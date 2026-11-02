// Round 35, end of the round (the checklist, item 6): turning points and shop items for the round's
// new systems. Four turning points come only in a career played with friends (a draft class, or a
// friend's challenge), and one comes to a veteran whose jump shot has started to age; five shop
// things for playing with friends and for the aging jumper.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { ROUND35B_EVENTS } from '../src/engine/events/round35b';
import { offerEvent } from '../src/engine/events/resolver';
import { SHOP_ITEMS } from '../src/content/shop';
import { VISITS } from '../src/content/visits';
import { applyItem, pushShop, visitItem } from '../src/engine/economy/shop';
import { ICONS, shopIcon } from '../src/ui/art/icons';
import { CULTURE_ICONS } from '../src/ui/art/cultureIcons';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';
import { themeOf } from '../src/dev/eventThemes';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A Regular guy career played to its first NBA midseason (with games behind him) and on to that season's offseason. */
function nbaYear(seed: number): { mid: GameState; off: GameState } {
  const g = newGame(seed, { ...input, mode: 'standard' });
  const r = makeRng(seed);
  let mid: GameState | null = null;
  for (let k = 0; k < 9000; k++) {
    if (!mid && g.stage === 'NBA' && g.step === 'midseason' && g.season?.games.some((x) => x.line && x.line.pts >= 15)) mid = structuredClone(g);
    if (mid && g.stage === 'NBA' && g.step === 'offseason' && !g.pending.length) return { mid, off: g };
    fastForward(g);
    const pr = prompt(g);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
    else advance(g);
  }
  throw new Error(`seed ${seed} never had an NBA season with a 15-point night`);
}

const ev = (id: string) => ROUND35B_EVENTS.find((e) => e.id === id)!;
const applies = (id: string, s: GameState) => ev(id).stages.includes(s.stage) && (ev(id).when?.(s) ?? true);
const withMp = (s: GameState, mp: GameState['mp']): GameState => {
  const t = structuredClone(s);
  t.mp = mp;
  return t;
};
const ALL_ICONS = { ...ICONS, ...CULTURE_ICONS, ...CAREER_ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C };
/** 16 by 16 in the palette's letters, and drawn for this one thing (no other icon is the same picture). */
function ownIcon(key: string): void {
  const pic = ALL_ICONS[key];
  expect(pic, key).toBeTruthy();
  expect(pic.length, key).toBeLessThanOrEqual(16);
  for (const row of pic) expect(row, key).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
  expect(Object.entries(ALL_ICONS).filter(([k, v]) => k !== key && v.join('|') === pic.join('|')).map(([k]) => k), key).toEqual([]);
}

describe('round 35\'s turning points: friends and the aging jumper', () => {
  const { mid, off } = nbaYear(3502);
  const klass = { klass: 'ABCDEF' };
  const challenge = { challenge: 'ABCDEF' };
  /** Where each one applies: a draft class or a challenge career, mid-season or in the summer, or a veteran. */
  const where: Record<string, GameState> = {
    classChat: withMp(mid, klass),
    classWorkout: withMp(off, klass),
    otherYou: withMp(off, challenge),
    friendWager: withMp(mid, challenge),
    jumperGoing: (() => {
      const t = structuredClone(off);
      t.player.age = 31;
      t.player.attrs.SHT = 70;
      return t;
    })(),
  };

  it('has five, each with a pixel icon of its own and a theme in the deck', () => {
    expect(ROUND35B_EVENTS.map((e) => e.id)).toEqual(Object.keys(where));
    for (const e of ROUND35B_EVENTS) {
      ownIcon(`ev-${e.id}`);
      expect(themeOf(e.id), e.id).not.toBe('Other');
    }
  });

  it('offers each one where it applies, and every choice resolves with a result card', () => {
    for (const e of ROUND35B_EVENTS) {
      const s = structuredClone(where[e.id]);
      expect(applies(e.id, s), e.id).toBe(true);
      expect(offerEvent(s, e.id), e.id).toBe(true);
      const d = s.pending[0];
      expect(d.kind).toBe('event');
      expect(d.title).toBe(e.title);
      expect(d.text.length, e.id).toBeGreaterThan(60);
      expect(d.choices.length).toBe(3);
      // the harness's smart player picks one of them
      expect(d.choices.map((c) => c.id)).toContain(smartChoice(s, d, makeRng(1)));
      for (const c of d.choices) {
        const t = structuredClone(s);
        expect(() => choose(t, c.id), `${e.id}: ${c.label}`).not.toThrow();
        expect(t.result?.title).toBe(e.title);
        expect(t.result?.choice).toBe(c.label);
        expect(t.result!.text.length, `${e.id}: ${c.label}`).toBeGreaterThan(20);
        // the same career makes the same call the same way: everything comes from its own random stream
        const u = structuredClone(s);
        choose(u, c.id);
        expect(u.result).toEqual(t.result);
        expect(u.player).toEqual(t.player);
      }
    }
  });

  it('keeps the friends ones to careers played with friends, on Regular guy', () => {
    // no friends: none of the four
    for (const [id, s] of [['classChat', mid], ['friendWager', mid], ['classWorkout', off], ['otherYou', off]] as const) {
      expect(applies(id, s), id).toBe(false);
      // another difficulty does not have them either
      const t = withMp(s, { klass: 'ABCDEF', challenge: 'GHIJKL' });
      t.mode = 'stars';
      expect(applies(id, t), id).toBe(false);
    }
    // the class ones need a class; the challenge one needs a challenge; the wager either
    expect(applies('classChat', withMp(mid, challenge))).toBe(false);
    expect(applies('classWorkout', withMp(off, challenge))).toBe(false);
    expect(applies('otherYou', withMp(off, klass))).toBe(false);
    expect(applies('friendWager', withMp(mid, klass))).toBe(true);
    // the group chat waits for a big night (15 points or more) and quotes it
    const quiet = withMp(mid, klass);
    for (const x of quiet.season!.games) if (x.line) x.line.pts = Math.min(x.line.pts, 14);
    expect(applies('classChat', quiet)).toBe(false);
    const best = Math.max(...mid.season!.games.map((x) => x.line?.pts ?? 0));
    const c = structuredClone(where.classChat);
    offerEvent(c, 'classChat');
    expect(c.pending[0].text).toContain(`Your ${best} points against`);
    // the challenge career's friend is the one who sent it
    const w = structuredClone(where.friendWager);
    offerEvent(w, 'friendWager');
    expect(w.pending[0].text).toContain('sent you this challenge');
    // the class workout is a pro's summer, never a high school one
    expect(ev('classWorkout').stages).not.toContain('HS');
  });

  it('brings the jumper to a veteran shooter once, and the rebuild pays back over three summers', () => {
    const vet = where.jumperGoing;
    const young = structuredClone(vet);
    young.player.age = 27;
    expect(applies('jumperGoing', young)).toBe(false);
    const brick = structuredClone(vet);
    brick.player.attrs.SHT = 40;
    expect(applies('jumperGoing', brick)).toBe(false);
    expect(ev('jumperGoing').stages).not.toContain('NCAA');
    expect(ev('jumperGoing').oncePerCareer).toBe(true);
    // the rebuild: a little worse now, a three-season program of +1 a summer after
    const s = structuredClone(vet);
    offerEvent(s, 'jumperGoing');
    choose(s, s.pending[0].choices[0].id);
    expect(s.player.attrs.SHT).toBeLessThan(70);
    const prog = s.player.programs.find((x) => x.id === 'release')!;
    expect(prog.steps).toEqual([{ attrs: { SHT: 1 } }, { attrs: { SHT: 1 } }, { attrs: { SHT: 1 } }]);
    // once rebuilding, it does not come again (and it is once a career anyway)
    expect(applies('jumperGoing', s)).toBe(false);
    // the legs: aging slows next season, and the result card says so
    const t = structuredClone(vet);
    offerEvent(t, 'jumperGoing');
    choose(t, t.pending[0].choices[1].id);
    expect(t.player.declineMultNext).toBeLessThan(vet.player.declineMultNext);
    expect(t.result?.changes.some((x) => x.label === 'Aging' && x.good)).toBe(true);
  });

  it('prices the free-throw bet from his shooting and his touch', () => {
    const lo = structuredClone(where.friendWager);
    lo.player.touch = 20;
    lo.player.attrs.SHT = 55;
    offerEvent(lo, 'friendWager');
    const hi = structuredClone(where.friendWager);
    hi.player.touch = 90;
    hi.player.attrs.SHT = 95;
    offerEvent(hi, 'friendWager');
    expect(lo.pending[0].choices[0].risk).toBe('High');
    expect(hi.pending[0].choices[0].risk).toBe('Low');
    // win or lose, he comes away steadier at the line (more reps after a loss)
    for (const s of [lo, hi]) {
      const before = s.player.touch!;
      choose(s, s.pending[0].choices[0].id);
      expect(s.player.touch!).toBeGreaterThan(before);
    }
  });

  it('never offers the friends ones in a career without friends', () => {
    const g = newGame(3501, { ...input, mode: 'standard' });
    const r = makeRng(3501);
    for (let k = 0; k < 9000; k++) {
      fastForward(g);
      const pr = prompt(g);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
      else advance(g);
    }
    expect(g.step).toBe('retired');
    for (const id of ['classChat', 'classWorkout', 'otherYou', 'friendWager']) expect(g.events.lastSeen[id], id).toBeUndefined();
  });
});

describe('round 35\'s shop things: friends and the aging jumper', () => {
  const ids = ['gym-key', 'rival-film', 'game-night', 'friends-cabin', 'release-coach'];

  it('sells five, each with a pixel icon of its own', () => {
    const keys = new Set<string>();
    for (const id of ids) {
      const it = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it, id).toBeTruthy();
      const icon = shopIcon(it.id, it.name);
      expect(icon, id).not.toBe('bag');
      ownIcon(icon);
      keys.add(icon);
    }
    expect(keys.size).toBe(ids.length);
    // and no older item has taken one of the new pictures
    for (const it of SHOP_ITEMS.filter((x) => !ids.includes(x.id))) expect(keys.has(shopIcon(it.id, it.name)), it.id).toBe(false);
  });

  it('does what the shop says it does', () => {
    const g = newGame(3503, input);
    g.player.bank = 1;
    pushShop(g, ids);
    const d = g.pending.find((x) => x.kind === 'shop')!;
    const detail = (id: string) => d.choices.find((c) => c.id === id)!.detail!;
    expect(detail('release-coach')).toContain('Slows down aging');
    expect(detail('release-coach')).toContain('your shooting');
    expect(detail('rival-film')).toContain('perimeter defense');
    expect(detail('game-night')).toContain('Lifts your mood');
    const s = structuredClone(g);
    const it = SHOP_ITEMS.find((x) => x.id === 'release-coach')!;
    const sht = s.player.attrs.SHT;
    applyItem(s, it, 0);
    expect(s.player.attrs.SHT).toBeCloseTo(sht + 0.5, 9);
    expect(s.player.declineMultNext).toBeCloseTo(0.97, 9);
  });

  it('lets him go back to the friends things he owns', () => {
    for (const id of ['gym-key', 'game-night', 'friends-cabin']) {
      expect(VISITS[id], id).toBeTruthy();
      const s = newGame(3504, input);
      expect(visitItem(s, id), id).toBeNull();
      s.purchases.push(id);
      expect(visitItem(s, id), id).toContain('small edge');
    }
  });
});
