// Round 34: the end-of-round batch for a round about simplification: the book's new achievements
// (simple math, the fundamentals, the round's new pages), five turning points and five shop items.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState, SeasonRecord } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { ACHIEVEMENTS_34, R34_TOTALS_ONLY } from '../src/engine/achievements34';
import { nbaCareerPoints } from '../src/engine/awards/legacy';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A full-game career played to an NBA offseason with nothing waiting (or to its end). */
function toNbaOffseason(seed: number, end = false): GameState {
  const g = newGame(seed, { ...input, mode: 'stars' });
  const r = makeRng(seed);
  for (let k = 0; k < 8000; k++) {
    if (!end && g.stage === 'NBA' && g.step === 'offseason' && !g.pending.length && g.history.some((h) => h.level === 'NBA')) break;
    fastForward(g);
    const pr = prompt(g);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
    else advance(g);
  }
  return g;
}

const test34 = (id: string, g: GameState, t = NO_TOTALS) => {
  const a = ACHIEVEMENTS_34.find((x) => x.id === id)!;
  const nba = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  return a.test({ g, t, nba, retired: g.step === 'retired' });
};
/** Sets an NBA season's line to these per-game numbers over 70 games. */
const setLine = (h: SeasonRecord, per: Partial<Record<'pts' | 'reb' | 'ast' | 'tov' | 'min' | 'fta', number>>) => {
  h.line.gp = 70;
  for (const [k, v] of Object.entries(per)) (h.line as unknown as Record<string, number>)[k] = Math.round(v * 70);
};

describe('the book: round 34', () => {
  it('keeps every id and every name unique across the whole book', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name.toLowerCase())).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS_34.length).toBe(30);
    for (const id of R34_TOTALS_ONLY) expect(ACHIEVEMENTS_34.some((a) => a.id === id), id).toBe(true);
  });

  it('earns the pages ones from the totals alone, with no career open', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of R34_TOTALS_ONLY) expect(none, id).not.toContain(id);
    const some = earnedNow(null, { ...NO_TOTALS, folded: 5, lookedBack: 1, resumed: 1, roadSeen: ['beginner', 'intermediate', 'advanced', 'tour', 'island'], visits: 10 });
    for (const id of ['fold1', 'fold5', 'look1', 'resume1', 'road-all', 'visit10']) expect(some, id).toContain(id);
    for (const id of ['fold12', 'look10', 'visit50', 'visit100']) expect(some, id).not.toContain(id);
    // four of the five places is not every stop
    expect(earnedNow(null, { ...NO_TOTALS, roadSeen: ['beginner', 'intermediate', 'advanced', 'tour'] })).not.toContain('road-all');
  });

  it('reads simple math off a real NBA career', () => {
    const g = toNbaOffseason(34);
    expect(g.stage).toBe('NBA');
    const h = g.history.filter((x) => x.level === 'NBA')[0];
    setLine(h, { pts: 20, reb: 6, ast: 6, tov: 1.5, min: 35, fta: 7 });
    expect(test34('n-even20', g)).toBe(true);
    expect(test34('n-split', g)).toBe(true);
    expect(test34('k-basics', g)).toBe(true);
    expect(test34('k-grip', g)).toBe(true);
    expect(test34('k-ft65', g)).toBe(true);
    expect(test34('n-age', g)).toBe(h.age === 20);
    g.player.number = 20;
    expect(test34('n-jersey', g)).toBe(true);
    setLine(h, { pts: 26, ast: 3 });
    expect(test34('k-pure', g)).toBe(true);
    expect(test34('n-even20', g)).toBe(false);
    // the career totals: no achievements for a career still going
    expect(test34('n-palin', g)).toBe(false);
    expect(test34('n-coffee', g)).toBe(false);
  });

  it('knows a palindrome and a round number when a career ends on one', () => {
    const g = toNbaOffseason(35, true);
    expect(g.step).toBe('retired');
    const nba = g.history.filter((x) => x.level === 'NBA' && x.line.gp > 0);
    expect(nba.length).toBeGreaterThan(0);
    const shift = (target: number) => {
      nba[0].line.pts += target - nbaCareerPoints(g);
      expect(nbaCareerPoints(g)).toBe(target);
    };
    shift(12321);
    expect(test34('n-palin', g)).toBe(true);
    expect(test34('n-round', g)).toBe(false);
    shift(12300);
    expect(test34('n-round', g)).toBe(true);
    expect(test34('n-palin', g)).toBe(false);
  });
});

describe('the round\'s events and shop items', () => {
  it('offers each turning point and resolves every choice; the shop has its five', async () => {
    const { ROUND34_EVENTS } = await import('../src/engine/events/round34');
    const { offerEvent } = await import('../src/engine/events/resolver');
    const { SHOP_ITEMS } = await import('../src/content/shop');
    const { shopIcon, ICONS } = await import('../src/ui/art/icons');
    const { EVENT_ICONS_C } = await import('../src/ui/art/eventIconsC');
    const g = toNbaOffseason(34);
    expect(g.stage).toBe('NBA');
    // a high school offseason with nothing waiting, for the one that comes before the pros
    const hs = newGame(36, { ...input, mode: 'stars' });
    const r = makeRng(36);
    for (let k = 0; k < 400 && !(hs.step === 'offseason' && !hs.pending.length); k++) {
      const pr = prompt(hs);
      if (pr.type === 'decision') choose(hs, smartChoice(hs, pr.decision, r));
      else advance(hs);
    }
    expect(hs.stage).toBe('HS');
    expect(ROUND34_EVENTS.length).toBe(5);
    for (const e of ROUND34_EVENTS) {
      expect(EVENT_ICONS_C[`ev-${e.id}`], e.id).toBeTruthy();
      const s = structuredClone(e.stages.includes('NBA') ? g : hs);
      s.purchases = ['a', 'b', 'c', 'd'];
      s.player.rep = 80;
      expect(offerEvent(s, e.id), e.id).toBe(true);
      const d = s.pending[0];
      expect(d.text.length).toBeGreaterThan(30);
      for (const c of d.choices) {
        const t = structuredClone(s);
        expect(() => choose(t, c.id)).not.toThrow();
        expect(t.result?.title).toBe(e.title);
      }
    }
    for (const id of ['career-scrapbook', 'one-move-coach', 'fundamentals-camp', 'announcer-dinner', 'minimal-locker']) {
      const it34 = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it34, id).toBeTruthy();
      expect(ICONS[shopIcon(it34.id, it34.name)], id).toBeTruthy();
    }
  });
});

describe('the project summary', () => {
  it('keeps every block in the shape the dev deck reads (a list item is a label and its text)', async () => {
    const { default: d } = (await import('../src/dev/summary.json')) as unknown as { default: { chapters: { title: string; blocks: { t: string; items?: unknown[]; head?: unknown[]; rows?: unknown[][]; text?: unknown }[] }[] } };
    for (const c of d.chapters)
      for (const b of c.blocks) {
        if (b.t === 'ul') for (const it of b.items ?? []) expect(Array.isArray(it) && it.every((x) => typeof x === 'string'), `${c.title}: ${JSON.stringify(it).slice(0, 80)}`).toBe(true);
        else if (b.t === 'table') for (const r of b.rows ?? []) expect(Array.isArray(r), c.title).toBe(true);
        else expect(typeof b.text, c.title).toBe('string');
      }
  });
});
