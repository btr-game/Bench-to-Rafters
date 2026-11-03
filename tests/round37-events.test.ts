// Round 37, end of the round (the checklist, item 6): turning points and shop things for the round's
// systems. A street named after him, his mural, his hometown gym taking his name, the arena's naming
// rights, another agent in the lobby, moving day, the neighbour at midnight, the reporter's question
// about the knee and a late summer of work; and four shop things: prints of every arena, a city
// bike, a knee brace and a longevity clinic. The street shows the sign, the mural and the hoop.

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { R37, ROUND37_EVENTS, streetFits, streetOf } from '../src/engine/events/round37';
import { offerEvent } from '../src/engine/events/resolver';
import { ACHIEVEMENTS_37 } from '../src/engine/achievements37';
import { HOUSE_BANK, cityMark } from '../src/engine/career/street';
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
import { townOf } from '../src/ui/town';
import { TownArt } from '../src/ui/art/TownArt';

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

const ev = (id: string) => ROUND37_EVENTS.find((e) => e.id === id)!;
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
/** One of the round's achievements, on a career. */
const earns = (id: string, g: GameState) => ACHIEVEMENTS_37.find((a) => a.id === id)!.test({ g, t: { finished: 0, byMode: {}, titles: 0, mvps: 0, fast: 0, master: 0, daily: 0 }, nba: g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0), retired: false, age: g.player.age, ovr: 60 });
/** A choice made, by its place. */
function pickIn(s: GameState, id: string, k: number): GameState {
  const t = structuredClone(s);
  expect(offerEvent(t, id), id).toBe(true);
  choose(t, t.pending[0].choices[k].id);
  return t;
}

describe('round 37\'s turning points: the street, the arena, the agent, home, the knee, the summer', () => {
  const { mid, off } = nbaYear(3701, 3702, 3703, 3704, 3705, 3706);
  /** His NBA team, some seasons with it, a name, a bank and an age. */
  const at = (base: GameState, o: { seasons?: number; rep?: number; age?: number; bank?: number } = {}) => {
    const t = structuredClone(base);
    t.teamSeasons[t.teamId!] = o.seasons ?? 5;
    t.player.rep = o.rep ?? 80;
    t.player.age = o.age ?? 27;
    if (o.bank !== undefined) t.player.bank = o.bank;
    t.player.injury = null;
    t.purchases = t.purchases.filter((id) => !['backyard-court', 'home-court', 'smart-court'].includes(id));
    delete t.flags.yardHoop;
    delete t.flags.powerAgent;
    delete t.flags.nextStep;
    return t;
  };
  const where: Record<string, GameState> = {
    streetName: at(off),
    mural: at(mid),
    gymRenamed: at(off),
    namingRights: at(off),
    agentPoach: at(off),
    movingHouse: at(off, { bank: 10 }),
    midnightCourt: (() => {
      const t = at(mid);
      t.purchases.push('home-court');
      return t;
    })(),
    kneeQuestion: (() => {
      const t = at(mid);
      t.flags.careerInjury = t.year - 1;
      return t;
    })(),
    nextSummer: at(off, { age: 31 }),
  };

  it('has nine, each with a pixel icon of its own and a theme in the deck', () => {
    expect(ROUND37_EVENTS.map((e) => e.id)).toEqual(Object.keys(where));
    for (const e of ROUND37_EVENTS) {
      ownIcon(`ev-${e.id}`);
      expect(themeOf(e.id), e.id).not.toBe('Other');
      expect(e.oncePerCareer, e.id).toBe(true);
    }
  });

  it('offers each one where it applies, and every choice resolves with a result card; the harness picks one', () => {
    for (const e of ROUND37_EVENTS) {
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
        expect(u.flags).toEqual(t.flags);
      }
    }
  });

  it('keeps each one to its window', () => {
    const no = (id: string, f: (t: GameState) => void) => {
      const t = structuredClone(where[id]);
      f(t);
      return applies(id, t);
    };
    // the street: a long stay and a big name, or a title won with the team
    expect(no('streetName', (t) => (t.teamSeasons[t.teamId!] = R37.street.seasons - 1)), 'a short stay').toBe(false);
    expect(no('streetName', (t) => (t.player.rep = R37.street.rep - 1)), 'not yet a big name').toBe(false);
    const champs = structuredClone(where.streetName);
    champs.player.rep = 40;
    champs.awards.push({ year: champs.year, level: 'NBA', key: 'TITLE', label: 'NBA Champion' });
    for (const h of champs.history) if (h.year === champs.year) h.teamId = champs.teamId!;
    expect(streetFits(champs), 'a title here instead').toBe(true);
    expect(ev('streetName').stages).toEqual(['NBA']);
    expect(no('mural', (t) => (t.player.rep = R37.mural.rep - 1))).toBe(false);
    expect(no('mural', (t) => (t.teamSeasons[t.teamId!] = 1))).toBe(false);
    expect(no('gymRenamed', (t) => (t.player.age = R37.gym.age - 1))).toBe(false);
    expect(ev('gymRenamed').stages).not.toContain('NCAA');
    expect(no('namingRights', (t) => (t.player.rep = R37.rights.rep - 1))).toBe(false);
    // the other agent stays away from a player with a power agent, and from one with no deal
    expect(no('agentPoach', (t) => (t.flags.powerAgent = 1))).toBe(false);
    expect(no('agentPoach', (t) => (t.contract = null))).toBe(false);
    expect(no('agentPoach', (t) => (t.player.age = R37.poach.ages[1] + 1))).toBe(false);
    // moving day: a house's worth in the bank, short of a mansion's, and no hoop at home yet
    expect(no('movingHouse', (t) => (t.player.bank = HOUSE_BANK.house - 0.1))).toBe(false);
    expect(no('movingHouse', (t) => (t.player.bank = HOUSE_BANK.mansion))).toBe(false);
    expect(no('movingHouse', (t) => t.purchases.push('backyard-court'))).toBe(false);
    expect(no('movingHouse', (t) => (t.player.age = R37.move.age + 1))).toBe(false);
    // the neighbour only comes over to a hoop at home
    expect(no('midnightCourt', (t) => (t.purchases = t.purchases.filter((x) => x !== 'home-court')))).toBe(false);
    // the knee: once he is back from the career-altering injury, in the first seasons back
    expect(no('kneeQuestion', (t) => delete t.flags.careerInjury)).toBe(false);
    expect(no('kneeQuestion', (t) => (t.flags.careerInjury = t.year)), 'still the summer it happened').toBe(false);
    expect(no('kneeQuestion', (t) => (t.flags.careerInjury = t.year - R37.knee.within - 1)), 'long since').toBe(false);
    expect(no('kneeQuestion', (t) => (t.player.injury = { key: 'season', name: 'Torn ACL', daysOut: 40 })), 'still out').toBe(false);
    // the summer of work: 29 to 33, for a player who has not taken the next step
    expect(no('nextSummer', (t) => (t.player.age = R37.summer.ages[0] - 1))).toBe(false);
    expect(no('nextSummer', (t) => (t.player.age = R37.summer.ages[1] + 1))).toBe(false);
    expect(no('nextSummer', (t) => (t.flags.nextStep = t.year - 2))).toBe(false);
  });

  it('puts the sign, the mural and the hoop on his street, in his city', () => {
    const s = where.streetName;
    expect(townOf(s).sign).toBe(false);
    for (const k of [0, 1]) {
      const t = pickIn(s, 'streetName', k);
      expect(t.flags.streetName).toBe(cityMark(s));
      expect(townOf(t).sign).toBe(true);
      expect(earns('tp-street', t)).toBe(true);
    }
    const usher = pickIn(s, 'streetName', 2);
    expect(usher.flags.streetName).toBeUndefined();
    expect(townOf(usher).sign).toBe(false);
    // the street takes his last name
    expect(streetOf(s)).toBe('Hale Way');
    const named = structuredClone(s);
    offerEvent(named, 'streetName');
    expect(named.pending[0].text).toContain('Hale Way');
    for (const k of [0, 1]) {
      const t = pickIn(where.mural, 'mural', k);
      expect(townOf(t).mural).toBe(23);
      expect(earns('tp-mural', t)).toBe(true);
    }
    expect(townOf(pickIn(where.mural, 'mural', 2)).mural).toBeNull();
    const moved = pickIn(where.movingHouse, 'movingHouse', 0);
    expect(moved.flags.yardHoop).toBe(moved.year);
    expect(townOf(moved).hoop).toBe(true);
    expect(earns('tp-move', moved)).toBe(true);
    // the hoop that came with the house brings the neighbour over
    const night = structuredClone(where.mural);
    night.flags.yardHoop = night.year;
    expect(applies('midnightCourt', night)).toBe(true);
    expect(townOf(pickIn(where.movingHouse, 'movingHouse', 1)).hoop).toBe(false);
  });

  it('draws the sign and the mural on the street', () => {
    const t = pickIn(pickIn(where.streetName, 'streetName', 0), 'mural', 0);
    const town = townOf(t);
    const svg = renderToStaticMarkup(createElement(TownArt, { town, here: 'gym' }));
    const plain = renderToStaticMarkup(createElement(TownArt, { town: { ...town, sign: false, mural: null }, here: 'gym' }));
    // the green of the street sign, the mural's two bands of paint
    expect(svg).toContain('#1F7A3A');
    expect(plain).not.toContain('#1F7A3A');
    expect(svg).toContain('#4FC3D9');
    expect(plain).not.toContain('#4FC3D9');
  });

  it('writes the logs the book reads, and pays for the photo under the sign', () => {
    const rights = pickIn(where.namingRights, 'namingRights', 0);
    expect(rights.player.bank).toBeGreaterThan(where.namingRights.player.bank);
    expect(earns('tp-rights', rights)).toBe(true);
    expect(earns('tp-rights', pickIn(where.namingRights, 'namingRights', 1))).toBe(false);
    expect(earns('tp-loyal', pickIn(where.agentPoach, 'agentPoach', 0))).toBe(true);
    expect(earns('tp-loyal', pickIn(where.agentPoach, 'agentPoach', 2))).toBe(false);
    // signing with the other agent changes no contract (the power agent's event does that)
    expect(pickIn(where.agentPoach, 'agentPoach', 2).contract).toEqual(where.agentPoach.contract);
    expect(earns('tp-midnight', pickIn(where.midnightCourt, 'midnightCourt', 0))).toBe(true);
    expect(earns('tp-knee', pickIn(where.kneeQuestion, 'kneeQuestion', 0))).toBe(true);
    expect(earns('tp-knee', pickIn(where.kneeQuestion, 'kneeQuestion', 1))).toBe(false);
    const gym = pickIn(where.gymRenamed, 'gymRenamed', 0);
    expect(gym.flags.gymNamed).toBe(gym.year);
    expect(earns('tp-gym', gym)).toBe(true);
    expect(earns('tp-gym', pickIn(where.gymRenamed, 'gymRenamed', 2))).toBe(false);
    const summer = pickIn(where.nextSummer, 'nextSummer', 0);
    expect(summer.flags.summerWork).toBe(summer.year);
    expect(summer.player.declineMultNext).toBeLessThan(where.nextSummer.player.declineMultNext);
    expect(earns('tp-summer', summer)).toBe(true);
  });
});

describe('round 37\'s shop things: the town, its arenas, the knee and the long career', () => {
  const ids = ['arena-prints', 'city-bike', 'knee-brace', 'longevity-clinic'];

  it('sells four, each with a pixel icon of its own', () => {
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

  it('does what the shop says it does', () => {
    const g = newGame(3707, input);
    g.player.bank = 1;
    pushShop(g, ids);
    const d = g.pending.find((x) => x.kind === 'shop')!;
    const detail = (id: string) => d.choices.find((c) => c.id === id)!.detail!;
    expect(detail('arena-prints')).toContain('Lifts your mood');
    expect(detail('city-bike')).toContain('your athleticism');
    expect(detail('knee-brace')).toContain('Keeps your body healthier');
    expect(detail('longevity-clinic')).toContain('Slows down aging');
    expect(detail('longevity-clinic')).toContain('Keeps your body healthier');
  });

  it('lets him go back to the prints and the bike he owns', () => {
    for (const id of ['arena-prints', 'city-bike']) {
      expect(VISITS[id], id).toBeTruthy();
      const s = newGame(3708, input);
      expect(visitItem(s, id), id).toBeNull();
      s.purchases.push(id);
      expect(visitItem(s, id), id).toBeTruthy();
    }
    // the brace and the clinic are worn or attended, not visited
    for (const id of ['knee-brace', 'longevity-clinic']) expect(VISITS[id], id).toBeUndefined();
  });
});
