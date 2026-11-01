// Round 31: undo (off for the challenges), the Rough Road and Comet boards, the shop priced for
// his income with no limit, the career log's Compare, the Extras tab's dot for an achievement, a
// postseason's result said plainly, and the round's achievements and icons.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { Decision, GameState } from '../src/engine/types';
import type { CareerRecord } from '../src/engine/career/record';
import { BOARDS, boardName, homeBoard, onBoard } from '../src/ui/community';
import { houseScores } from '../src/ui/house';
import { priceFor, priceMult, pushShop, resolveShop } from '../src/engine/economy/shop';
import { SHOP_ITEMS } from '../src/content/shop';
import { compareRows, compareScore } from '../src/ui/compare';
import { tabKey } from '../src/ui/selectors';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { ICONS } from '../src/ui/art/icons';

const input = { name: 'Remy Okafor', number: 11, pos: 'PG' as const, archetype: 0, focus: ['PLY', 'SHT'] as ['PLY', 'SHT'], hometown: 'Dayton', highSchool: 'Fairview High' };

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

describe('undo', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, scrollTo() {}, setTimeout, clearTimeout, location: { hash: '' } });
    vi.resetModules();
  });

  it('is off for Rough Road, Comet, the daily challenge and a career that has ended', async () => {
    const { canUndo } = await import('../src/store');
    const g = newGame(310001, input);
    expect(canUndo(g)).toBe(true);
    expect(canUndo(null)).toBe(false);
    for (const f of ['oath', 'comet', 'daily']) expect(canUndo({ ...g, flags: { ...g.flags, [f]: 1 } })).toBe(false);
    expect(canUndo({ ...g, step: 'retired' })).toBe(false);
  });

  it('takes back the last move and names it, once', async () => {
    const { useStore } = await import('../src/store');
    const g = newGame(310002, input);
    useStore.setState({ game: g, undo: null });
    const before = JSON.stringify(useStore.getState().game);
    const p = prompt(g);
    if (p.type === 'decision') useStore.getState().choose(smartChoice(g, p.decision, makeRng(1)));
    else useStore.getState().advance();
    expect(useStore.getState().undo?.label).toBeTruthy();
    expect(JSON.stringify(useStore.getState().game)).not.toBe(before);
    useStore.getState().undoLast();
    expect(JSON.stringify({ ...useStore.getState().game, achN: undefined })).toBe(JSON.stringify({ ...JSON.parse(before), achN: undefined }));
    expect(useStore.getState().undo).toBeNull();
  });
});

describe('the challenge boards', () => {
  const rec = (patch: Partial<CareerRecord>) => ({ id: 'x', mode: 'standard', ...patch }) as CareerRecord;
  it('puts a Rough Road career on Reality and its own board, and a Comet only on its own', () => {
    const rough = rec({ mode: 'reality', oath: true });
    const comet = rec({ mode: 'stars', comet: true });
    const stars = rec({ mode: 'stars' });
    expect(BOARDS.filter((b) => onBoard(rough, b))).toEqual(['reality', 'rough']);
    expect(BOARDS.filter((b) => onBoard(comet, b))).toEqual(['comet']);
    expect(BOARDS.filter((b) => onBoard(stars, b))).toEqual(['stars']);
    expect([homeBoard(rough), homeBoard(comet), homeBoard(stars)]).toEqual(['rough', 'comet', 'stars']);
    expect(boardName('rough')).toBe('Rough Road');
    expect(boardName('comet')).toBe('Comet');
  });

  it('keeps house players on every board, marked with its challenge', () => {
    for (const b of BOARDS) {
      const rows = houseScores(b, 'all');
      expect(rows.length, b).toBeGreaterThanOrEqual(10);
      for (const r of rows) expect(onBoard(r.rec, b)).toBe(true);
    }
  });
});

describe('the shop', () => {
  const withIncome = (salary: number, seed = 310010) => {
    const s = newGame(seed, input);
    s.contract = { teamId: 'x', kind: 'standard', salary, years: 2, teamOptionYears: [], signedYear: s.year };
    return s;
  };

  it('charges more as he earns more: x1 to $1M a year, x3 from $50M, on a log scale between', () => {
    expect(priceMult(withIncome(0))).toBe(1);
    expect(priceMult(withIncome(1))).toBe(1);
    expect(priceMult(withIncome(10))).toBeCloseTo(1 + (2 * Math.log(10)) / Math.log(50), 6); // 2.177184
    expect(priceMult(withIncome(50))).toBe(3);
    expect(priceMult(withIncome(200))).toBe(3);
  });

  it('shows six things, about two or three of them affordable together, and no limit on buying', () => {
    let fits = 0;
    let visits = 0;
    for (let i = 0; i < 40; i++) {
      const s = withIncome(4, 310100 + i);
      s.player.bank = 6;
      s.pending = [];
      pushShop(s);
      const d = s.pending[s.pending.length - 1] as Decision;
      const prices = (d.data!.prices as number[]).filter((_, k) => d.choices[k].tags?.[0] !== 'Accessories');
      expect(d.choices.filter((c) => c.id !== 'leave')).toHaveLength(6);
      let left = s.player.bank;
      for (const p of [...prices].sort((a, b) => a - b)) if (p <= left) (left -= p), fits++;
      visits++;
    }
    const mean = fits / visits;
    expect(mean).toBeGreaterThanOrEqual(2.2);
    expect(mean).toBeLessThanOrEqual(3.4);
  });

  it('keeps the shop open after a third purchase, charges the tag price and counts the spree', () => {
    const s = withIncome(60);
    s.player.bank = 5000;
    s.pending = [];
    pushShop(s);
    let bought = 0;
    for (let k = 0; k < 6; k++) {
      const d = s.pending.find((x) => x.kind === 'shop');
      if (!d) break;
      const c = d.choices.find((x) => x.id !== 'leave' && !x.disabled)!;
      const before = s.player.bank;
      s.pending = s.pending.filter((x) => x !== d);
      resolveShop(s, d, c.id);
      expect(before - s.player.bank).toBeCloseTo(Number(c.meta?.price), 9);
      bought++;
    }
    expect(bought).toBe(6);
    expect(s.flags.spree).toBe(6);
    // the book reads the most bought in one visit (a career earns it from its first season on)
    const test = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!.test({ g: s, t: NO_TOTALS } as never);
    expect([test('spree'), test('cleanout')]).toEqual([true, true]);
    s.flags.spree = 3;
    expect([test('spree'), test('cleanout')]).toEqual([false, false]);
  });

  it('prices a thing at two significant figures', () => {
    const s = withIncome(10);
    const it = SHOP_ITEMS.find((x) => x.price > 0.001)!;
    const p = priceFor(s, it);
    const e = 10 ** (Math.floor(Math.log10(p)) - 1);
    expect(Math.abs(p / e - Math.round(p / e))).toBeLessThan(1e-6);
  });
});

describe('compare two careers', () => {
  const base = { id: 'a', mode: 'standard', name: 'A', tier: 'NBA star', peak: 88, legacy: 120, rank: 40, hof: null, titles: 1, mvps: 0, allStars: 5, nbaSeasons: 12, nbaPoints: 20000, retiredAt: 35, index: { total: 80, best: 90, score: 85 } } as unknown as CareerRecord;
  it('marks the better side of each row, lower rank better, retiring age neither', () => {
    const b = { ...base, id: 'b', name: 'B', peak: 91, rank: 101, hof: 'first', retiredAt: 38 } as CareerRecord;
    const rows = compareRows(base, b);
    const by = (l: string) => rows.find((r) => r.label === l)!;
    expect(by('Peak OVR').better).toBe('b');
    expect(by('All-time rank').better).toBe('a');
    expect(by('All-time rank').b).toBe('outside the top 100');
    expect(by('Hall of Fame').better).toBe('b');
    expect(by('Titles').better).toBeNull();
    expect(by('Retired at').better).toBeNull();
    expect(compareScore(rows)).toEqual({ a: 1, b: 2 });
  });
});

describe('the Extras tab dot for an achievement', () => {
  it('moves the tab key when the career earns one', () => {
    const g = newGame(310020, input);
    const before = tabKey(g, 'extras');
    expect(tabKey({ ...g, achN: 2 }, 'extras')).not.toBe(before);
  });
});

describe('a postseason said plainly', () => {
  it('carries his team, its finish and the champion on the page', () => {
    const s = newGame(310030, input);
    const r = makeRng(31);
    const seen: GameState['moments'] = [];
    for (let i = 0; i < 1500 && !seen.some((m) => m.outcome); i++) {
      seen.push(...s.moments);
      s.moments = [];
      const p = prompt(s);
      if (p.type === 'retired') break;
      if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
      else advance(s);
    }
    const m = seen.find((x) => x.outcome)!;
    expect(m).toBeTruthy();
    expect(m.outcome!.team && m.outcome!.result && m.outcome!.champion).toBeTruthy();
  });
});

describe('the round in the book and the art', () => {
  it('has Tale of the Tape for a comparison', () => {
    expect(earnedNow(null, { ...NO_TOTALS, compared: 1 })).toContain('cmp1');
    expect(earnedNow(null, NO_TOTALS)).not.toContain('cmp1');
  });

  it('draws the new icons', () => {
    for (const k of ['undo', 'compare', 'textsize']) {
      expect(ICONS[k], k).toHaveLength(16);
      for (const row of ICONS[k]) expect(row).toHaveLength(16);
    }
  });
});
