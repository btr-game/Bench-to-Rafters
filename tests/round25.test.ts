// Round 25: nicknames and brands, staff, fines, press conferences, contract talks, rivals, the
// news, the shop's one-per-shelf stock and the wardrobe, save codes, the strength breakdown, the
// career index, fast break and sim mode, and the achievement book past 500.

import { beforeAll, describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { Decision, GameState, SeasonState } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { ACHIEVEMENTS_25 } from '../src/engine/achievements25';
import { NICKNAMES } from '../src/content/nicknames';
import { awardNickname, payBrand, pushBrand, resolveBrand } from '../src/engine/career/nickname';
import { canHire, hireStaff, letGo, payStaff, raiseStaff, staffPay, talkStaff } from '../src/engine/career/staff';
import { rollFine } from '../src/engine/career/fines';
import { pushPress } from '../src/engine/career/press';
import { negotiable, negotiate } from '../src/engine/career/negotiate';
import { updateRivalry } from '../src/engine/career/rivalry';
import { newsFx, writeNews } from '../src/engine/career/news';
import { strengthBreakdown } from '../src/engine/career/breakdown';
import { applyItem, pushShop, wearItem } from '../src/engine/economy/shop';
import { SHOP_ITEMS } from '../src/content/shop';
import { careerIndex } from '../src/engine/awards/legacy';
import { fastForward } from '../src/engine/fast';
import { exportCode, importCode } from '../src/ui/saves';
import { BRAND, FINES, NICKNAME, PRESS, STAFF_PAY } from '../src/engine/balance';

/** A smart career played into its sixth NBA offseason. */
let pro: GameState;
const copy = (): GameState => structuredClone(pro);

beforeAll(() => {
  const r = makeRng(970011);
  const s = newGame(970011, { name: 'Marcus Vale', number: 23, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'], hometown: 'Dayton', highSchool: 'Lincoln High' });
  s.flags.simPostseason = 1;
  for (let i = 0; i < 6000; i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (s.stage === 'NBA' && s.serviceYears >= 6 && p.type !== 'decision' && s.step === 'offseason') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
  expect(s.stage).toBe('NBA');
  pro = s;
}, 60_000);

describe('achievements past 500', () => {
  it('has more than 500, with unique ids and names', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(500);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(ACHIEVEMENTS.length);
  });

  it('runs every round 25 check on a pro career without throwing', () => {
    const s = copy();
    const nba = s.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
    const awardsByYear = new Map<number, Set<string>>();
    for (const a of s.awards) awardsByYear.set(a.year, (awardsByYear.get(a.year) ?? new Set()).add(a.key));
    for (const a of ACHIEVEMENTS_25) expect(() => a.test({ g: s, nba, awardsByYear, peak: s.player.peakOvr, retired: s.step === 'retired', nbaTitlesYears: [] }), a.id).not.toThrow();
    expect(earnedNow(s, NO_TOTALS).length).toBeGreaterThan(0);
  });
});

describe('nicknames and brands', () => {
  it('names him at the reputation threshold, from the list', () => {
    const s = copy();
    s.player.nickname = undefined;
    s.player.rep = NICKNAME.rep - 1;
    awardNickname(s, '#123456', 'Team');
    expect(s.player.nickname).toBeUndefined();
    s.player.rep = NICKNAME.rep + 5;
    awardNickname(s, '#123456', 'Team');
    expect(NICKNAMES.some((n) => n.id === s.player.nickname?.id)).toBe(true);
  });

  it('brings two brand offers to a superstar, and the deal pays each season', () => {
    const s = copy();
    s.player.brand = undefined;
    s.player.rep = BRAND.brandRep + 10;
    s.pending = [];
    pushBrand(s);
    const d = s.pending.find((x) => x.kind === 'brand') as Decision;
    expect(d).toBeTruthy();
    expect(d.choices.length).toBeGreaterThanOrEqual(3);
    resolveBrand(s, d, d.choices[0].id);
    expect(s.player.brand).toBeTruthy();
    const pay = payBrand(s);
    expect(pay).toBeGreaterThan(0);
    expect(s.player.brand!.earned).toBeCloseTo(pay, 6);
  });
});

describe('staff', () => {
  it('hires, pays, talks, raises and lets go', () => {
    const s = copy();
    s.player.staff = [];
    s.player.bank = 100;
    const m = hireStaff(s, 'chef')!;
    expect(m).toBeTruthy();
    expect(canHire(s, 'chef')).toBe(false);
    const bank = s.player.bank;
    payStaff(s);
    expect(s.player.bank).toBeCloseTo(bank - staffPay(m), 6);
    expect(talkStaff(s, m.id)).toBeTruthy();
    expect(talkStaff(s, m.id)).toBeNull(); // once a season
    expect(raiseStaff(s, m.id)).toBe(true);
    expect(s.player.staff![0].level).toBe(2);
    letGo(s, m.id);
    expect(s.player.staff!.length).toBe(0);
  });

  it('never holds more than the maximum', () => {
    const s = copy();
    s.player.staff = [];
    s.player.bank = 1000;
    for (const role of ['chef', 'nutritionist', 'trainer', 'physio', 'shooting', 'skills', 'psychologist', 'analyst', 'sleep'] as const) hireStaff(s, role);
    expect(s.player.staff!.length).toBeLessThanOrEqual(STAFF_PAY.max);
  });
});

describe('fines', () => {
  it('come at most twice a season and come out of the bank', () => {
    const s = copy();
    const season = { fines: 0 } as unknown as SeasonState;
    const bank = s.player.bank;
    for (let i = 0; i < 20000; i++) rollFine(s, season, s.rng, 'BOS');
    expect(season.fines).toBe(FINES.maxSeason);
    expect(s.player.bank).toBeLessThan(bank);
    expect(s.moments.filter((m) => m.kind === 'fine').length).toBe(FINES.maxSeason);
  });
});

describe('press conferences', () => {
  const champion = (): GameState => {
    const s = copy();
    s.player.press = undefined;
    s.history[s.history.length - 1].result = 'Champion';
    s.pending = [];
    return s;
  };

  it('ask two questions after a title, and each answer weighs half the old three', () => {
    const s = champion();
    s.flags.fast = 0;
    pushPress(s);
    const d = s.pending[0];
    expect(d.kind).toBe('press');
    expect(d.data?.n).toBe(PRESS.bigQuestions);
    s.player.trust = 50;
    choose(s, 'humble');
    expect(s.player.trust).toBeCloseTo(50 + (PRESS.humble.trust * 3) / PRESS.bigQuestions, 6);
    expect(s.pending[0].kind).toBe('press'); // the second question
    expect(s.pending[0].data?.q).toBe(1);
    choose(s, 'humble');
    expect(s.pending.some((x) => x.kind === 'press')).toBe(false);
  });

  it('come back no sooner than the gap', () => {
    const s = champion();
    pushPress(s);
    const next = s.player.press!.next;
    expect(next - s.year).toBeGreaterThanOrEqual(PRESS.gap);
    s.pending = [];
    pushPress(s);
    expect(s.pending.length).toBe(0);
  });

  it('are one answer in fast break and none in sim mode', () => {
    const fast = champion();
    fast.flags.fast = 1;
    pushPress(fast);
    choose(fast, 'fiery');
    fastForward(fast);
    expect(fast.pending.some((x) => x.kind === 'press')).toBe(false);
    const sim = champion();
    const before = sim.log.length;
    pushPress(sim);
    sim.flags.fast = 1;
    sim.flags.sim = 1;
    fastForward(sim);
    expect(sim.log.slice(before).filter((x) => x.kind === 'press' && /humble/.test(x.text)).length).toBe(PRESS.bigQuestions);
  });
});

describe('contract talks', () => {
  it('leave fixed-scale deals alone and answer an ask at once', () => {
    const s = copy();
    expect(negotiable({ level: 'NBA', kind: 'rookie' } as never)).toBe(false);
    expect(negotiable({ level: 'NBA', kind: 'standard' } as never)).toBe(true);
    const d: Decision = {
      id: 'x',
      kind: 'offers',
      title: 'Offers',
      text: '',
      choices: [{ id: 'o1', label: 'Team' }],
      data: { offers: [{ id: 'o1', level: 'NBA', kind: 'standard', teamId: 't', teamName: 'Team', salary: 20, years: 3, role: 'starter', note: '' }] },
    } as unknown as Decision;
    s.pending = [d];
    const said = negotiate(s, 'o1', 'money');
    expect(typeof said).toBe('string');
    expect(s.log.some((x) => x.kind === 'talks')).toBe(true);
  });
});

describe('rivals, the news and the strength breakdown', () => {
  it('give an NBA player a rival', () => {
    const s = copy();
    expect(s.rivalry).toBeTruthy();
    s.rivalry = undefined;
    updateRivalry(s);
    expect((s as GameState).rivalry?.name).toBeTruthy();
  });

  it('write news whose effects stay small', () => {
    const s = copy();
    writeNews(s);
    const fx = newsFx(s);
    expect(fx.offers).toBeGreaterThanOrEqual(-3);
    expect(fx.offers).toBeLessThanOrEqual(3);
    expect(fx.salary).toBeGreaterThan(0.8);
    expect(fx.salary).toBeLessThan(1.2);
  });

  it('explain the team with items, and rank a career by its index', () => {
    const b = strengthBreakdown(copy());
    if (b) expect(b.items.length).toBeGreaterThan(0);
    const idx = careerIndex(copy());
    expect(idx.score).toBeGreaterThan(0);
  });
});

describe('the shop and the wardrobe', () => {
  it('stocks one item per shelf', () => {
    const s = copy();
    s.player.bank = 1000;
    s.pending = [];
    pushShop(s);
    const d = s.pending.find((x) => x.kind === 'shop')!;
    const shelves = d.choices.map((c) => SHOP_ITEMS.find((it) => it.id === c.id)?.category).filter(Boolean);
    expect(new Set(shelves).size).toBe(shelves.length);
  });

  it('puts a bought accessory on, and the wardrobe can take it off', () => {
    const s = copy();
    s.player.wardrobe = undefined;
    s.player.bank = 10;
    const it = SHOP_ITEMS.find((x) => x.wear)!;
    applyItem(s, it);
    const w = (s as GameState).player.wardrobe;
    expect(w?.owned).toContain(it.id);
    expect(w?.on[it.wear!.slot]).toBe(it.id);
    wearItem(s, it.wear!.slot, 'none');
    expect(w?.on[it.wear!.slot]).toBe('none');
  });
});

describe('save codes', () => {
  it('turn a career into text and back', async () => {
    const s = copy();
    const code = await exportCode(s);
    expect(code.startsWith('BTR1.')).toBe(true);
    const back = await importCode(code);
    expect(back?.player.name).toBe(s.player.name);
    expect(back?.year).toBe(s.year);
    expect(await importCode('not a code')).toBeNull();
  });
});
