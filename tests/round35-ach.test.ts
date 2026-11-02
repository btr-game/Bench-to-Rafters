// Round 35: the end-of-round batch of achievements: play with friends (a challenge, a draft class),
// the road map's stops that open the other modes, free throws, the late jump shot, and more besides.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState, SeasonRecord } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type CareerTotals } from '../src/engine/achievements';
import { ACHIEVEMENTS_35, R35_TOTALS_ONLY } from '../src/engine/achievements35';
import { hallOfFame } from '../src/engine/awards/legacy';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };

/** A full-game career played to its first NBA offseason with nothing waiting (or to its end). */
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

/** One of this round's checks on a career; `retired` stands in for a career played to its end. */
const test35 = (id: string, g: GameState, retired = g.step === 'retired', t: CareerTotals = NO_TOTALS) => {
  const a = ACHIEVEMENTS_35.find((x) => x.id === id)!;
  const nba = g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
  return a.test({ g, t, nba, retired, age: g.player.age });
};
const nbaOf = (g: GameState) => g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
/** Sets an NBA season's counting stats over 70 games (totals, not per game). */
const setLine = (h: SeasonRecord, line: Partial<SeasonRecord['line']>) => Object.assign(h.line, { gp: 70 }, line);
/** Another NBA season after the last one, a copy of it a year on. */
const nextSeason = (g: GameState): SeasonRecord => {
  const last = nbaOf(g).at(-1)!;
  const h = { ...structuredClone(last), year: last.year + 1, age: last.age + 1 };
  g.history.push(h);
  return h;
};

describe('the book: round 35', () => {
  it('keeps every id and every name unique across the whole book', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name.toLowerCase())).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS_35.length).toBe(66);
    for (const id of R35_TOTALS_ONLY) expect(ACHIEVEMENTS_35.some((a) => a.id === id), id).toBe(true);
    for (const a of ACHIEVEMENTS_35) expect(ACHIEVEMENTS, a.id).toContain(a);
  });

  it('earns the friends ones and the unlocks from the totals alone, with no career open', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of R35_TOTALS_ONLY) expect(none, id).not.toContain(id);
    const once = earnedNow(null, { ...NO_TOTALS, mp: { made: 1, answered: 1, beat: 1, joined: 1, classTop: 1 }, unlocks: ['reality'] });
    for (const id of ['mp-made1', 'mp-ans1', 'mp-beat1', 'mp-join1', 'mp-top1', 'un-real']) expect(once, id).toContain(id);
    for (const id of ['mp-made5', 'mp-beat5', 'mp-top3', 'un-stars', 'un-minis', 'un-all']) expect(once, id).not.toContain(id);
    const more = earnedNow(null, { ...NO_TOTALS, mp: { made: 5, beat: 5, classTop: 3 }, unlocks: ['reality', 'stars', 'minis'] });
    for (const id of ['mp-made5', 'mp-beat5', 'mp-top3', 'un-stars', 'un-minis', 'un-all']) expect(more, id).toContain(id);
    // the career ones never come from the totals
    for (const a of ACHIEVEMENTS_35.filter((x) => !R35_TOTALS_ONLY.includes(x.id))) expect(more, a.id).not.toContain(a.id);
  });

  it('reads the free throws off a real NBA career', () => {
    const g = toNbaOffseason(35);
    expect(g.stage).toBe('NBA');
    const h = nbaOf(g)[0];
    setLine(h, { fta: 160, ftm: 152 });
    expect(test35('ft-s95', g)).toBe(true);
    setLine(h, { fta: 140, ftm: 139 });
    expect(test35('ft-s95', g), 'too few tries').toBe(false);
    setLine(h, { fta: 160, ftm: 95 });
    expect(test35('ft-bad', g)).toBe(true);
    expect(test35('ft-s95', g)).toBe(false);
    // the touch, as far as it goes
    g.player.touch = 98.5;
    expect(test35('ft-touch', g)).toBe(false);
    g.player.touch = 99;
    expect(test35('ft-touch', g)).toBe(true);
    // fifteen points better than his first season at the line
    setLine(h, { fta: 60, ftm: 39 });
    const h2 = nextSeason(g);
    setLine(h2, { fta: 120, ftm: 96 });
    expect(test35('ft-up', g)).toBe(true);
    setLine(h2, { fta: 90, ftm: 85 });
    expect(test35('ft-up', g), 'the later season needs 100 tries').toBe(false);
    // the career: a percentage at retirement, and the makes
    setLine(h, { fta: 600, ftm: 500 });
    setLine(h2, { fta: 600, ftm: 490 });
    expect(test35('ft-c80', g, false), 'not before he retires').toBe(false);
    expect(test35('ft-c80', g, true)).toBe(true);
    expect(test35('ft-c85', g, true)).toBe(false);
    setLine(h2, { fta: 600, ftm: 530 });
    expect(test35('ft-c85', g, true)).toBe(true);
    expect(test35('ft-m3k', g)).toBe(false);
    setLine(h2, { fta: 3000, ftm: 2600 });
    expect(test35('ft-m3k', g)).toBe(true);
    expect(test35('ft-m6k', g)).toBe(false);
    // a high school season at the line
    const hs = g.history.find((x) => x.stage === 'HS')!;
    Object.assign(hs.line, { fta: 70, ftm: 63 });
    expect(test35('hs-ft90', g)).toBe(true);
    Object.assign(hs.line, { fta: 50, ftm: 50 });
    expect(test35('hs-ft90', g), 'too few tries').toBe(g.history.some((x) => x !== hs && x.stage === 'HS' && x.line.fta >= 60 && x.line.ftm / x.line.fta >= 0.9));
  });

  it('knows a jump shot that kept going late', () => {
    const g = toNbaOffseason(35);
    const h = nbaOf(g)[0];
    setLine(h, { tpa: 210, tpm: 84 });
    h.age = 35;
    expect(test35('sa-late3', g)).toBe(false);
    h.age = 36;
    expect(test35('sa-late3', g)).toBe(true);
    setLine(h, { tpa: 200, tpm: 84 });
    expect(test35('sa-late3', g), 'under three tries a game').toBe(false);
    g.player.age = 38;
    g.player.attrs.SHT = 80;
    expect(test35('sa-sht80', g)).toBe(true);
    g.player.attrs.SHT = 79.9;
    expect(test35('sa-sht80', g)).toBe(false);
    g.player.attrs.SHT = 90;
    g.player.age = 37;
    expect(test35('sa-sht80', g)).toBe(false);
  });

  it('reads the careers played with friends', () => {
    const g = toNbaOffseason(35);
    const h = nbaOf(g)[0];
    g.awards = g.awards.filter((a) => a.key !== 'ALLSTAR');
    expect(test35('mp-class-as', g)).toBe(false);
    g.awards.push({ year: h.year, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' });
    expect(test35('mp-class-as', g), 'an All-Star, but no class').toBe(false);
    g.mp = { klass: 'ABCDEF' };
    expect(test35('mp-class-as', g)).toBe(true);
    h.result = 'NBA Champion';
    expect(test35('mp-ans-ring', g), 'a ring, but no challenge').toBe(false);
    g.mp = { challenge: 'GHJKLM' };
    expect(test35('mp-ans-ring', g)).toBe(true);
    // a challenge set from the career, once it is over
    g.mp = { made: 'NPQRST' };
    g.nbaGames = 0;
    expect(test35('mp-made-low', g, false)).toBe(false);
    expect(test35('mp-made-low', g, true)).toBe(true);
    const done = toNbaOffseason(36, true);
    expect(done.step).toBe('retired');
    expect(test35('mp-made-hof', done)).toBe(false);
    done.mp = { made: 'UVWXYZ' };
    expect(test35('mp-made-hof', done)).toBe(!!hallOfFame(done));
  });

  it('reads the rest of the batch off a real NBA career', () => {
    const g = toNbaOffseason(35);
    const h = nbaOf(g)[0];
    // better from three than from two: 40% on threes, 38% on twos
    setLine(h, { fga: 1000, fgm: 384, tpa: 300, tpm: 120 });
    expect(test35('x-upside', g)).toBe(true);
    setLine(h, { fga: 1000, fgm: 400, tpa: 300, tpm: 120 });
    expect(test35('x-upside', g)).toBe(false);
    // a title in his first season, with the team that drafted him
    h.result = 'NBA Champion';
    expect(test35('r-rookie-ring', g)).toBe(true);
    g.draftedBy = h.teamId;
    expect(test35('r-homegrown', g)).toBe(true);
    g.draftedBy = `${h.teamId}-not`;
    expect(test35('r-homegrown', g)).toBe(false);
    // the Finals lost, then the title
    h.result = 'Lost in the NBA Finals';
    expect(test35('r-rookie-ring', g)).toBe(false);
    const h2 = nextSeason(g);
    h2.result = 'NBA Champion';
    expect(test35('r-redeem', g)).toBe(true);
    // the All-Star team in each of his first three seasons
    nextSeason(g);
    g.awards = g.awards.filter((a) => a.key !== 'ALLSTAR');
    for (const x of nbaOf(g).slice(0, 2)) g.awards.push({ year: x.year, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' });
    expect(test35('a-as-first3', g)).toBe(false);
    g.awards.push({ year: nbaOf(g)[2].year, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' });
    expect(test35('a-as-first3', g)).toBe(true);
    // All-Rookie, then never an All-Star
    g.awards = g.awards.filter((a) => a.key !== 'ALLSTAR' && a.key !== 'ALLROOKIE' && a.key !== 'ROY');
    g.awards.push({ year: h.year, level: 'NBA', key: 'ALLROOKIE', label: 'All-Rookie' });
    expect(test35('x-flash', g, true)).toBe(true);
    expect(test35('x-flash', g, false)).toBe(false);
    // a tall point guard who runs the offence
    g.player.pos = 'PG';
    h.height = 79;
    setLine(h, { ast: 6 * 70 });
    expect(test35('x-tallpg', g)).toBe(true);
    h.height = 78;
    expect(test35('x-tallpg', g)).toBe(g.player.height >= 79 && nbaOf(g).some((x) => x !== h && x.line.gp >= 40 && x.line.ast >= 6 * x.line.gp && (x.height ?? 0) >= 79));
    // ten seasons, all in double figures, all in the playoffs
    while (nbaOf(g).length < 10) nextSeason(g);
    for (const x of nbaOf(g)) {
      setLine(x, { pts: 12 * 70 });
      x.result = 'Lost in the first round';
    }
    expect(test35('c-dfig', g, true)).toBe(true);
    expect(test35('r-every', g, true)).toBe(true);
    expect(test35('c-dfig', g, false)).toBe(false);
    nbaOf(g)[4].line.pts = 9 * 70;
    nbaOf(g)[5].result = 'Missed the playoffs (11th in the West)';
    expect(test35('c-dfig', g, true)).toBe(false);
    expect(test35('r-every', g, true)).toBe(false);
  });
});

describe('friends in each other\'s careers', () => {
  it('earns a duo or Big Three of friends and the chat from the totals, and rival nights from the career', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of ['mp-fduo', 'mp-ftrio', 'mp-chat1']) expect(none, id).not.toContain(id);
    const some = earnedNow(null, { ...NO_TOTALS, mp: { friendDuo: 1, chat: 1 } });
    expect(some).toContain('mp-fduo');
    expect(some).toContain('mp-chat1');
    expect(some).not.toContain('mp-ftrio');
    expect(earnedNow(null, { ...NO_TOTALS, mp: { friendTrio: 1 } })).toContain('mp-ftrio');
    const g = newGame(3520, { name: 'Marcus Hale', number: 23, pos: 'SF', archetype: 0, focus: ['SHT', 'ATH'], mode: 'standard' });
    const meet = (won: boolean, year: number) => ({ year, won, me: 20, him: 18, score: won ? '110–100' : '100–110', how: 'went at him' });
    g.mp = { klass: 'ABCDEF', meets: [meet(false, 2030)] };
    expect(test35('mp-rn1', g)).toBe(false);
    g.mp.meets = [meet(false, 2030), meet(true, 2031)];
    expect(test35('mp-rn1', g)).toBe(true);
    expect(test35('mp-rn5', g)).toBe(false);
    g.mp.meets = [2030, 2031, 2032, 2033, 2034].map((y) => meet(true, y));
    expect(test35('mp-rn5', g)).toBe(true);
  });
});

describe('the totals behind them (ui/achievements.ts)', () => {
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
    vi.resetModules();
    return { ach: await import('../src/ui/achievements'), road: await import('../src/ui/road'), book: await import('../src/engine/achievements') };
  };

  it('counts what was done with friends, each challenge or class once', async () => {
    const { ach, book } = await fresh();
    expect(ach.recordMp('made', 'ABC234')).toBe(true);
    expect(ach.recordMp('made', 'ABC234'), 'the same challenge again').toBe(false);
    expect(ach.recordMp('made', 'DEF567')).toBe(true);
    for (let i = 0; i < 3; i++) ach.recordMp('beat');
    ach.recordMp('joined', 'GHJ892');
    ach.recordMp('classTop', 'GHJ892');
    ach.recordMp('classTop', 'GHJ892');
    const t = ach.loadAch().totals;
    expect(t.mp).toEqual({ made: 2, beat: 3, joined: 1, classTop: 1 });
    const got = book.earnedNow(null, t);
    for (const id of ['mp-made1', 'mp-beat1', 'mp-join1', 'mp-top1']) expect(got, id).toContain(id);
    for (const id of ['mp-made5', 'mp-ans1', 'mp-beat5', 'mp-top3']) expect(got, id).not.toContain(id);
    // checking the book keeps them, with no career open
    expect(ach.checkAch(null).map((a) => a.id)).toEqual(expect.arrayContaining(['mp-made1', 'mp-beat1', 'mp-join1', 'mp-top1']));
    expect(ach.checkAch(null)).toEqual([]);
  });

  it('opens the unlocks from the stops cleared on the road map, not from the modes it was given', async () => {
    const { ach, road } = await fresh();
    const ids = () => Object.keys(ach.loadAch().got).filter((id) => id.startsWith('un-'));
    // a device that graduated before the locks keeps every mode, but has cleared no stop
    road.saveRoad({ free: 1, all: 1, v: 35, passed: { beginner: { star: false } }, minis: {} });
    ach.checkAch(null);
    expect(ids()).toEqual([]);
    road.saveRoad({ free: 1, all: 1, v: 35, passed: { beginner: { star: false }, intermediate: { star: true } }, minis: { threes: 'B' } });
    ach.checkAch(null);
    expect(ids()).toEqual(['un-real']);
    // every mini-game on the island at a C or better
    const minis = Object.fromEntries(road.ROAD_MINIS.map((m) => [m, 'C']));
    road.saveRoad({ free: 1, v: 35, passed: { beginner: { star: false }, intermediate: { star: true }, advanced: { star: false } }, minis });
    ach.checkAch(null);
    expect(ids().sort()).toEqual(['un-all', 'un-minis', 'un-real', 'un-stars']);
    expect(ach.loadAch().totals.unlocks?.sort()).toEqual(['minis', 'reality', 'stars']);
  });
});
