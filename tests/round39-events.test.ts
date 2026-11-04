// Rounds 38 to 40, end of the round (the checklist, item 6): turning points and shop things for the
// rounds' systems. The Floor's reel of the last six minutes, the closer, the summer after a season
// ended on the Floor; story mode's call from home, the hometown paper on the friend and the rival on
// a magazine cover; fan mail in five languages and the red-eye home. And three shop things: a
// late-game shooting coach, a season of late-game tape, a framed photo of his biggest shot.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { R39, ROUND39_EVENTS, floorDrama } from '../src/engine/events/round39';
import { offerEvent } from '../src/engine/events/resolver';
import { startStory } from '../src/engine/story/cast';
import { touchOf } from '../src/engine/player/touch';
import { SHOP_ITEMS } from '../src/content/shop';
import { VISITS } from '../src/content/visits';
import { pushShop, visitItem } from '../src/engine/economy/shop';
import { ICONS, shopIcon } from '../src/ui/art/icons';
import { CULTURE_ICONS } from '../src/ui/art/cultureIcons';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';
import { themeOf } from '../src/dev/eventThemes';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton, OH', highSchool: 'Fairview High' };

/** A Regular guy career played to its first NBA midseason and on to that season's offseason (the
 * first of these seeds whose player makes the NBA). */
function nbaYear(...seeds: number[]): { mid: GameState; off: GameState } {
  for (const seed of seeds) {
    const g = newGame(seed, { ...input, mode: 'standard' });
    const r = makeRng(seed);
    let mid: GameState | null = null;
    for (let k = 0; k < 9000; k++) {
      if (!mid && g.stage === 'NBA' && g.step === 'midseason' && g.season?.games.length) mid = structuredClone(g);
      if (mid && g.stage === 'NBA' && g.step === 'offseason' && !g.pending.length) return { mid, off: g };
      fastForward(g);
      const pr = prompt(g);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
      else advance(g);
    }
  }
  throw new Error(`none of seeds ${seeds.join(', ')} had an NBA season`);
}

const ev = (id: string) => ROUND39_EVENTS.find((e) => e.id === id)!;
const applies = (id: string, s: GameState) => ev(id).stages.includes(s.stage) && (ev(id).when?.(s) ?? true);
const ALL_ICONS = { ...ICONS, ...CULTURE_ICONS, ...CAREER_ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C };
/** 16 by 16 in the palette's letters, and drawn for this one thing (no other icon is the same picture). */
function ownIcon(key: string): void {
  const pic = ALL_ICONS[key];
  expect(pic, key).toBeTruthy();
  expect(pic.length, key).toBe(16);
  for (const row of pic) expect(row, key).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
  expect(Object.entries(ALL_ICONS).filter(([k, v]) => k !== key && v.join('|') === pic.join('|')).map(([k]) => k), key).toEqual([]);
}
/** A choice made, by its place. */
function pickIn(s: GameState, id: string, k: number): GameState {
  const t = structuredClone(s);
  expect(offerEvent(t, id), id).toBe(true);
  choose(t, t.pending[0].choices[k].id);
  return t;
}

describe('the turning points of rounds 38 to 40: the Floor, story mode, the languages, the road', () => {
  const { mid, off } = nbaYear(3911, 3912, 3913, 3914, 3915, 3916);
  /** His NBA season, with a name and an age, nothing on the Floor yet. */
  const at = (base: GameState, o: { rep?: number; age?: number } = {}) => {
    const t = structuredClone(base);
    t.player.rep = o.rep ?? 70;
    t.player.age = o.age ?? 26;
    t.player.injury = null;
    for (const k of ['floor', 'floorPlayed', 'floorWon', 'floorBack', 'floorWinner', 'floorStop', 'floorLost']) delete t.flags[k];
    return t;
  };
  /** The same season in a story career: his friend and his rival in the league. */
  const told = (base: GameState, friendLv = 'NBA') => {
    const t = at(base);
    startStory(t, { ...input, story: { friend: 'Marcus Bell', parent: 'Denise', sibling: 'Jo', rival: 'Dante Vale' } } as never);
    t.story!.friend.lv = friendLv;
    t.story!.friend.team = 'Miami Heat';
    t.story!.rival = { name: 'Dante Vale', pos: 'SG', ovr: 80, lv: 'NBA', team: 'Chicago Bulls', drive: 0 };
    t.serviceYears = Math.max(t.serviceYears, 2);
    return t;
  };
  const where: Record<string, GameState> = {
    floorFilm: (() => {
      const t = at(off);
      t.flags.floor = 1;
      t.flags.floorPlayed = 1;
      return t;
    })(),
    floorCloser: (() => {
      const t = at(off);
      t.flags.floor = 1;
      t.flags.floorPlayed = 1;
      t.flags.floorWon = 1;
      t.flags.floorWinner = 1;
      return t;
    })(),
    floorSlump: (() => {
      const t = at(off);
      t.flags.floor = 1;
      t.flags.floorPlayed = 1;
      t.flags.floorLost = t.year;
      return t;
    })(),
    storyCall: told(mid),
    storyFriend: told(off),
    storyRival: told(off),
    fanMail: at(mid),
    redEye: at(mid),
  };

  it('has eight, each with a pixel icon of its own and a theme in the deck', () => {
    expect(ROUND39_EVENTS.map((e) => e.id)).toEqual(Object.keys(where));
    for (const e of ROUND39_EVENTS) {
      ownIcon(`ev-${e.id}`);
      expect(themeOf(e.id), e.id).not.toBe('Other');
      expect(e.oncePerCareer, e.id).toBe(true);
    }
  });

  it('offers each one where it applies, and every choice resolves with a result card; the harness picks one', () => {
    for (const e of ROUND39_EVENTS) {
      const s = structuredClone(where[e.id]);
      expect(applies(e.id, s), e.id).toBe(true);
      expect(offerEvent(s, e.id), e.id).toBe(true);
      const d = s.pending[0];
      expect(d.kind).toBe('event');
      expect(d.title).toBe(e.title);
      expect(d.text.length, e.id).toBeGreaterThan(60);
      expect(d.choices.length).toBe(3);
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
        expect(u.story).toEqual(t.story);
      }
    }
  });

  it('keeps the Floor’s to the careers that played it, and each to its window', () => {
    const no = (id: string, f: (t: GameState) => void) => {
      const t = structuredClone(where[id]);
      f(t);
      return applies(id, t);
    };
    // the harness lets the engine play the Floor: simulated games bring none of these
    for (const id of ['floorFilm', 'floorCloser', 'floorSlump']) expect(applies(id, at(off)), id).toBe(false);
    expect(no('floorFilm', (t) => (t.flags.floorPlayed = 0)), 'only simulated').toBe(false);
    expect(no('floorCloser', (t) => (t.flags.floorWinner = 0)), 'a win with no drama').toBe(false);
    for (const k of ['floorBack', 'floorWinner', 'floorStop']) {
      const t = at(off);
      t.flags[k] = 1;
      expect(floorDrama(t), k).toBe(true);
    }
    expect(no('floorSlump', (t) => (t.flags.floorLost = t.year - 1)), 'a loss a summer ago').toBe(false);
    for (const id of ['floorFilm', 'floorCloser', 'floorSlump']) expect(ev(id).stages).toEqual(['NBA']);
    // story mode's need a story, and stay where a story plays: in the States
    for (const id of ['storyCall', 'storyFriend', 'storyRival']) {
      expect(no(id, (t) => delete t.story), id).toBe(false);
      expect(ev(id).stages.some((x) => x === 'EU' || x === 'INT'), id).toBe(false);
    }
    expect(no('storyCall', (t) => (t.player.age = R39.call.age - 1))).toBe(false);
    expect(no('storyFriend', (t) => (t.story!.friend.lv = 'NCAA')), 'not yet on his road').toBe(false);
    for (const lv of ['COACH', 'OUT']) expect(applies('storyFriend', told(off, lv)), lv).toBe(true);
    expect(no('storyRival', (t) => (t.story!.rival = null))).toBe(false);
    expect(no('storyRival', (t) => (t.story!.rival!.lv = 'OUT'))).toBe(false);
    expect(no('storyRival', (t) => (t.serviceYears = 0)), 'a rookie').toBe(false);
    expect(no('fanMail', (t) => (t.player.rep = R39.mail.rep - 1))).toBe(false);
  });

  it('writes what the story reads: a bond moved by one at most, and kept between −3 and 3', () => {
    const call = where.storyCall;
    expect(pickIn(call, 'storyCall', 0).story!.bond.parent).toBe(call.story!.bond.parent! + 1);
    expect(pickIn(call, 'storyCall', 1).story!.bond.sibling).toBe(call.story!.bond.sibling! + 1);
    expect(pickIn(call, 'storyCall', 2).story!.bond.parent).toBe(call.story!.bond.parent! - 1);
    const warm = structuredClone(call);
    warm.story!.bond.parent = 3;
    expect(pickIn(warm, 'storyCall', 0).story!.bond.parent).toBe(3);
    expect(pickIn(where.storyFriend, 'storyFriend', 0).story!.bond.friend).toBe(where.storyFriend.story!.bond.friend! + 1);
    expect(pickIn(where.storyRival, 'storyRival', 1).story!.bond.rival).toBe((where.storyRival.story!.bond.rival ?? 0) + 1);
    for (const e of ROUND39_EVENTS)
      for (const k of [0, 1, 2]) {
        const t = pickIn(where[e.id], e.id, k);
        for (const who of ['friend', 'parent', 'sibling', 'rival'] as const) {
          const was = where[e.id].story?.bond[who] ?? 0;
          expect(Math.abs((t.story?.bond[who] ?? 0) - was), `${e.id} ${k} ${who}`).toBeLessThanOrEqual(1);
        }
      }
    // the people by their names, the friend's page by where his road has taken him
    const s = structuredClone(where.storyCall);
    offerEvent(s, 'storyCall');
    expect(s.pending[0].text).toContain('Denise');
    expect(s.pending[0].text).toContain('Jo');
    const paper = (lv: string) => {
      const t = told(off, lv);
      offerEvent(t, 'storyFriend');
      return t.pending[0].text;
    };
    expect(paper('NBA')).toContain('making the league');
    expect(paper('COACH')).toContain('Coach Bell');
    expect(paper('OUT')).toContain('opened a gym');
    const cover = structuredClone(where.storyRival);
    offerEvent(cover, 'storyRival');
    expect(cover.pending[0].text).toContain('Dante Vale');
  });

  it('keeps every effect small: a rating by half a point at most, his touch by three', () => {
    // each answer as written (the resolver's roll and its twists come on top, the same for every event)
    for (const e of ROUND39_EVENTS)
      for (const [k, c] of (e.choices as Exclude<typeof e.choices, (s: GameState) => unknown>).entries()) {
        const s = structuredClone(where[e.id]);
        const t = structuredClone(s);
        c.resolve(t, makeRng(k));
        for (const a of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) expect(Math.abs(t.player.attrs[a] - s.player.attrs[a]), `${e.id} ${k} ${a}`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(touchOf(t.player) - touchOf(s.player)), `${e.id} ${k}`).toBeLessThanOrEqual(3);
        expect(Math.abs(t.player.morale - s.player.morale), `${e.id} ${k}`).toBeLessThanOrEqual(3);
        expect(Math.abs(t.player.rep - s.player.rep), `${e.id} ${k}`).toBeLessThanOrEqual(2);
        // $20K at most
        expect(s.player.bank - t.player.bank, `${e.id} ${k}`).toBeLessThanOrEqual(0.02 + 1e-9);
      }
    // the reel lifts his touch at the line
    expect(touchOf(pickIn(where.floorFilm, 'floorFilm', 0).player)).toBeGreaterThan(touchOf(structuredClone(where.floorFilm).player));
  });
});

describe('the shop things of rounds 38 to 40: the Floor’s last six minutes', () => {
  const ids = ['closer-coach', 'late-game-tape', 'winner-photo'];

  it('sells three, each with a pixel icon of its own', () => {
    const keys = new Set<string>();
    for (const id of ids) {
      const it = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it, id).toBeTruthy();
      expect(it.klass, id).toBeUndefined();
      const icon = shopIcon(it.id, it.name);
      expect(icon, id).not.toBe('bag');
      ownIcon(icon);
      keys.add(icon);
    }
    expect(keys.size).toBe(ids.length);
    for (const it of SHOP_ITEMS.filter((x) => !ids.includes(x.id))) expect(keys.has(shopIcon(it.id, it.name)), it.id).toBe(false);
  });

  it('does what the shop says it does, and lets him go back to the photo', () => {
    const g = newGame(3917, input);
    g.player.bank = 1;
    pushShop(g, ids);
    const d = g.pending.find((x) => x.kind === 'shop')!;
    const detail = (id: string) => d.choices.find((c) => c.id === id)!.detail!;
    expect(detail('closer-coach')).toContain('Steadies you at the free-throw line');
    expect(detail('closer-coach')).toContain('your shooting');
    expect(detail('late-game-tape')).toContain('your feel for the game');
    expect(detail('winner-photo')).toContain('Lifts your mood');
    expect(VISITS['winner-photo']).toBeTruthy();
    const s = newGame(3918, input);
    expect(visitItem(s, 'winner-photo')).toBeNull();
    s.purchases.push('winner-photo');
    expect(visitItem(s, 'winner-photo')).toBeTruthy();
    for (const id of ['closer-coach', 'late-game-tape']) expect(VISITS[id], id).toBeUndefined();
  });
});
