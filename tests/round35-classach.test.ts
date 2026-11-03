// Round 35, later: achievements, turning points and shop things for the draft class's own careers:
// draft night (career/draftNight.ts), classmates in his league (career/friendLeague.ts), the playoff
// series against his rival classmate (career/rivalSeries.ts), joining a friend's team (the trade
// request's 'friend' aim), and the class's pages (ui/screens/ClassNight.tsx). A career without
// friends never meets any of it, and draws exactly as before.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { FriendLine, GameState, StatLine } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type CareerTotals } from '../src/engine/achievements';
import { ACHIEVEMENTS_35, R35_TOTALS_ONLY } from '../src/engine/achievements35';
import { achCatOf } from '../src/engine/achievementCats';
import { teamById } from '../src/engine/career/common';
import { friendName } from '../src/engine/career/friends';
import { canRequestTrade, requestTrade } from '../src/engine/career/team';
import { allStarWeekend } from '../src/engine/sim/tournaments';
import { ROUND35C_EVENTS } from '../src/engine/events/round35c';
import { ROUND21_EVENTS } from '../src/engine/events/round21';
import { activeDuo } from '../src/engine/career/duo';
import { offerEvent } from '../src/engine/events/resolver';
import { SHOP_ITEMS } from '../src/content/shop';
import { pushShop } from '../src/engine/economy/shop';
import { ICONS, shopIcon } from '../src/ui/art/icons';
import { CULTURE_ICONS } from '../src/ui/art/cultureIcons';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';
import { themeOf } from '../src/dev/eventThemes';
import type { ClassMember, DraftClass, ReunionAward } from '../src/ui/multiplayer';

const NEW = ['dn-pick1', 'dn-top5', 'dn-slide', 'dn-rise', 'dn-30', 'dn-roy', 'rs-win1', 'rs-win3', 'rs-back', 'rs-final', 'rs-sweep', 'rs-double', 'rs-lost3', 'fl-mvp-beat', 'fl-mvp-friend', 'fl-as-pal', 'fl-join', 'fl-ring-pal', 'mp-rmvp', 'mp-r3', 'mp-rsweep', 'mp-react10', 'mp-crown', 'mp-daily1', 'mp-watch5'];
const PAGES = ['mp-rmvp', 'mp-r3', 'mp-rsweep', 'mp-react10', 'mp-crown', 'mp-daily1', 'mp-watch5'];

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], mode: 'standard' as const };

/** Plays on with the harness's calls until `stop` says so. */
function playUntil(g: GameState, seed: number, stop: (g: GameState) => boolean): GameState {
  const r = makeRng(seed);
  g.flags.simPostseason = 1;
  for (let k = 0; k < 8000; k++) {
    if (stop(g)) return g;
    fastForward(g);
    const p = prompt(g);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(g, smartChoice(g, p.decision, r));
    else advance(g);
  }
  throw new Error(`seed ${seed} never got there`);
}

const line = (year: number, team: string, x: Partial<FriendLine['seasons'][number]> = {}): FriendLine['seasons'][number] => ({ year, lv: 'NBA', team, ovr: 78, pts: 18, reb: 5, ast: 4, gp: 76, sal: 10, ...x });
const friend = (id: string, seasons: FriendLine['seasons']): FriendLine => ({ id, name: `Friend ${id}`, pn: `Player ${id}`, pos: 'PG', seasons });
const mine = (g: GameState) => teamById(g.nba, g.teamId)!;
const other = (g: GameState, k = 0) => g.nba!.teams.filter((t) => t.id !== g.teamId)[k];
const nbaOf = (g: GameState) => g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0);
const withMp = (s: GameState, mp: GameState['mp']): GameState => {
  const t = structuredClone(s);
  t.mp = mp;
  return t;
};

/** One of this batch's checks on a career; `retired` stands in for a career played to its end. */
const test35 = (id: string, g: GameState, t: CareerTotals = NO_TOTALS) => {
  const a = ACHIEVEMENTS_35.find((x) => x.id === id)!;
  return a.test({ g, t, nba: nbaOf(g), retired: g.step === 'retired', age: g.player.age });
};

/** A draft-night career (a class's start) at the midseason and the offseason of its rookie year,
 * the class not yet copied in. */
let dn: { mid: GameState; off: GameState };
beforeAll(() => {
  const g = newGame(3530, { ...input, start: 'draft' });
  const mid = structuredClone(playUntil(g, 3530, (x) => x.stage === 'NBA' && x.step === 'midseason'));
  const off = playUntil(g, 3530, (x) => x.stage === 'NBA' && x.step === 'offseason' && !x.pending.length);
  dn = { mid, off };
}, 60_000);

describe('the book: the draft class\'s batch', () => {
  it('adds 25, each in the book with a tier, a short how, and a category', () => {
    expect(ACHIEVEMENTS_35.length).toBe(66);
    for (const id of NEW) {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      expect(a, id).toBeTruthy();
      expect(['bench', 'rotation', 'starter', 'allstar', 'hof']).toContain(a!.tier);
      expect(a!.how.length, id).toBeGreaterThan(20);
      expect(a!.how.length, id).toBeLessThan(110);
      expect(achCatOf(id), id).not.toBeNull();
    }
    for (const id of PAGES) expect(R35_TOTALS_ONLY, id).toContain(id);
    expect(['dn-pick1', 'dn-top5', 'dn-slide', 'dn-rise', 'dn-30'].map(achCatOf)).toEqual(Array(5).fill('road'));
    expect(['dn-roy', 'fl-mvp-beat', 'fl-mvp-friend', 'fl-as-pal', 'mp-rmvp', 'mp-r3', 'mp-rsweep'].map(achCatOf)).toEqual(Array(7).fill('awards'));
    expect(['rs-win1', 'rs-win3', 'rs-back', 'rs-final', 'rs-sweep', 'rs-double', 'fl-ring-pal'].map(achCatOf)).toEqual(Array(7).fill('titles'));
    expect([achCatOf('rs-lost3'), achCatOf('fl-join'), achCatOf('mp-crown')]).toEqual(['odd', 'team', 'fame']);
    expect(['mp-react10', 'mp-daily1', 'mp-watch5'].map(achCatOf)).toEqual(Array(3).fill('modes'));
  });

  it('earns the page ones from the totals alone, and the career ones never from them', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of PAGES) expect(none, id).not.toContain(id);
    const short = earnedNow(null, { ...NO_TOTALS, mp: { react: 9, watched: 4 } });
    expect(short).not.toContain('mp-react10');
    expect(short).not.toContain('mp-watch5');
    const all = earnedNow(null, { ...NO_TOTALS, mp: { reunionMvp: 1, reunion3: 1, reunionSweep: 1, react: 10, crowned: 1, dailyTop: 1, watched: 5 } });
    for (const id of PAGES) expect(all, id).toContain(id);
    for (const id of NEW.filter((x) => !PAGES.includes(x))) expect(all, id).not.toContain(id);
  });
});

describe('draft night', () => {
  it('reads the pick and the mock drafts of a career that opened on draft night', () => {
    const g = withMp(dn.off, { klass: 'ABCDEF' });
    expect(nbaOf(g).length).toBe(1);
    g.awards = g.awards.filter((a) => !['ALLSTAR', 'ROY', 'ALLROOKIE'].includes(a.key));
    const y = nbaOf(g)[0].year;
    const set = (pick: number, mock: [number, number]) => Object.assign(g.draft!, { userPick: pick, mockRange: mock });
    set(1, [1, 4]);
    expect(test35('dn-pick1', g)).toBe(true);
    expect(test35('dn-top5', g)).toBe(true);
    // without the class, first overall is the book's plain pick1, not this one
    expect(test35('dn-pick1', withMp(g, undefined))).toBe(false);
    set(5, [3, 7]);
    expect(test35('dn-pick1', g)).toBe(false);
    expect(test35('dn-top5', g)).toBe(true);
    set(6, [3, 7]);
    expect(test35('dn-top5', g)).toBe(false);
    // past the mocks, then an All-Star team; above them, then All-Rookie
    set(12, [4, 9]);
    expect(test35('dn-slide', g)).toBe(false);
    g.awards.push({ year: y, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' });
    expect(test35('dn-slide', g)).toBe(true);
    set(9, [4, 9]);
    expect(test35('dn-slide', g), 'inside the range').toBe(false);
    set(2, [4, 9]);
    expect(test35('dn-rise', g)).toBe(false);
    g.awards.push({ year: y, level: 'NBA', key: 'ALLROOKIE', label: 'All-Rookie Team' });
    expect(test35('dn-rise', g)).toBe(true);
    // the last pick of the first round, an All-Star
    set(30, [26, 30]);
    expect(test35('dn-30', g)).toBe(true);
    set(29, [26, 30]);
    expect(test35('dn-30', g)).toBe(false);
    // Rookie of the Year in a class
    expect(test35('dn-roy', g)).toBe(false);
    g.awards.push({ year: y, level: 'NBA', key: 'ROY', label: 'Rookie of the Year' });
    expect(test35('dn-roy', g)).toBe(true);
    expect(test35('dn-roy', withMp(g, undefined))).toBe(false);
  });

  it('never counts a career that started in high school', () => {
    const g = withMp(dn.off, { klass: 'ABCDEF' });
    g.start = { ...g.start!, input: { ...g.start!.input, start: undefined } };
    Object.assign(g.draft!, { userPick: 1, mockRange: [3, 6] });
    g.awards.push({ year: nbaOf(g)[0].year, level: 'NBA', key: 'ALLSTAR', label: 'All-Star' }, { year: nbaOf(g)[0].year, level: 'NBA', key: 'ROY', label: 'Rookie of the Year' });
    for (const id of ['dn-pick1', 'dn-top5', 'dn-rise', 'dn-roy']) expect(test35(id, g), id).toBe(false);
  });
});

describe('the playoff series against his rival classmate', () => {
  const meet = (year: number, won: boolean, series?: string, score = won ? '4–2' : '2–4') => ({ year, won, me: 22, him: 20, score, how: 'guarded him', ...(series ? { series } : {}) });
  const g = (meets: ReturnType<typeof meet>[]) => withMp(dn.off, { klass: 'ABCDEF', meets });

  it('counts series won and lost, a sweep, the Finals, and a rival night the same season', () => {
    expect(test35('rs-win1', g([meet(2030, true)])), 'a rival night is no series').toBe(false);
    expect(test35('rs-win1', g([meet(2030, true, 'First round')]))).toBe(true);
    const three = g([meet(2030, true, 'First round'), meet(2031, false, 'Conference semifinals'), meet(2032, true, 'Conference finals'), meet(2033, true, 'First round')]);
    expect(test35('rs-win3', three)).toBe(true);
    expect(test35('rs-win3', g([meet(2030, true, 'First round'), meet(2031, true, 'First round'), meet(2031, true)]))).toBe(false);
    expect(test35('rs-final', three)).toBe(false);
    expect(test35('rs-final', g([meet(2030, true, 'NBA Finals')]))).toBe(true);
    expect(test35('rs-final', g([meet(2030, false, 'NBA Finals')]))).toBe(false);
    expect(test35('rs-sweep', three)).toBe(false);
    expect(test35('rs-sweep', g([meet(2030, true, 'First round', '4–0')]))).toBe(true);
    expect(test35('rs-sweep', g([meet(2030, false, 'First round', '0–4')]))).toBe(false);
    expect(test35('rs-double', g([meet(2030, true), meet(2031, true, 'First round')]))).toBe(false);
    expect(test35('rs-double', g([meet(2031, true), meet(2031, true, 'First round')]))).toBe(true);
    expect(test35('rs-lost3', three)).toBe(false);
    expect(test35('rs-lost3', g([meet(2030, false, 'First round'), meet(2031, false, 'First round'), meet(2032, false, 'NBA Finals')]))).toBe(true);
  });

  it('knows a series won after losing the first rival night', () => {
    expect(test35('rs-back', g([meet(2030, false), meet(2030, true, 'First round')]))).toBe(true);
    expect(test35('rs-back', g([meet(2030, true), meet(2031, false), meet(2031, true, 'First round')])), 'he won the first night').toBe(false);
    expect(test35('rs-back', g([meet(2030, false), meet(2031, false, 'First round')]))).toBe(false);
    expect(test35('rs-back', g([meet(2029, true, 'First round'), meet(2030, false)])), 'the series came first').toBe(false);
  });
});

describe('classmates in his league and on his team', () => {
  it('reads a classmate\'s MVP, and his own MVP over a classmate in the top five', () => {
    const g = withMp(dn.off, { klass: 'ABCDEF', friends: [friend('m', [line(dn.off.year, other(dn.off).name)])] });
    const pal = friendName(g.mp!.friends![0]);
    const rec = g.nbaHistory[g.nbaHistory.length - 1];
    expect(rec.year).toBe(g.year);
    const mvp = rec.awards.find((a) => a.award === 'MVP')!;
    expect(test35('fl-mvp-friend', g)).toBe(false);
    mvp.name = pal;
    expect(test35('fl-mvp-friend', g)).toBe(true);
    expect(test35('fl-mvp-friend', withMp(g, { klass: 'ABCDEF' })), 'no classmate of that name').toBe(false);
    // his MVP, with the classmate fourth in the voting
    const h = nbaOf(g)[0];
    const race = h.races.find((r) => r.award === 'MVP')!;
    g.awards.push({ year: h.year, level: 'NBA', key: 'MVP', label: 'MVP' });
    race.top = race.top.filter((x) => x.name !== pal);
    expect(test35('fl-mvp-beat', g)).toBe(false);
    race.top.splice(3, 0, { name: pal, team: other(g).short, value: 30 });
    expect(test35('fl-mvp-beat', g)).toBe(true);
    g.awards = g.awards.filter((a) => a.key !== 'MVP');
    expect(test35('fl-mvp-beat', g), 'a classmate in the race, but no MVP of his').toBe(false);
  });

  it('marks an All-Star weekend shared with a classmate, and nothing without the class', () => {
    const s = structuredClone(dn.mid);
    const firstHalf: StatLine = { gp: 41, gs: 41, min: 41 * 37, pts: 41 * 38, reb: 41 * 11, ast: 41 * 9, stl: 41 * 2, blk: 41, tov: 41 * 3, fgm: 41 * 13, fga: 41 * 24, tpm: 41 * 3, tpa: 41 * 8, ftm: 41 * 9, fta: 41 * 10 };
    const opp = other(s, 2);
    const a = withMp(s, { klass: 'ABCDEF', friends: [friend('s', [line(s.year, opp.name, { ovr: 96, pts: 39, reb: 11, ast: 9, gp: 82 })])] });
    allStarWeekend(a, firstHalf);
    expect(a.season!.allStar).toBe(true);
    expect(a.season!.midReport.join(' ')).toContain('Player s (Friend s)');
    expect(a.flags.asPal).toBe(1);
    expect(test35('fl-as-pal', a)).toBe(true);
    // a classmate who is no All-Star, or no class at all
    const b = withMp(s, { klass: 'ABCDEF', friends: [friend('q', [line(s.year, opp.name, { ovr: 70, pts: 3, reb: 1, ast: 1, gp: 60 })])] });
    allStarWeekend(b, firstHalf);
    expect(b.flags.asPal).toBeUndefined();
    const c = structuredClone(s);
    allStarWeekend(c, firstHalf);
    expect(c.flags.asPal).toBeUndefined();
  });

  it('knows a trade to a classmate\'s team asked for and got, and a title with a classmate on his team', () => {
    const base = playUntil(structuredClone(dn.off), 3531, (x) => x.stage === 'NBA' && x.step === 'offseason' && prompt(x).type === 'advance' && canRequestTrade(x));
    const t = other(base, 4);
    base.mp = { klass: 'ABCDEF', friends: [friend('a', [line(base.year, t.name, { sal: 1 })])] };
    expect(test35('fl-join', base)).toBe(false);
    let done: GameState | null = null;
    for (let k = 0; k < 200 && !done; k++) {
      const x = structuredClone(base);
      x.rng = makeRng(k + 1);
      requestTrade(x, 'friend', t.id);
      if (x.teamId === t.id) done = x;
    }
    expect(done, 'some draw gets the deal done').toBeTruthy();
    expect(test35('fl-join', done!)).toBe(true);
    // a trade asked for anywhere else is not this one
    for (let k = 0; k < 200; k++) {
      const x = structuredClone(base);
      x.rng = makeRng(k + 1);
      requestTrade(x, 'better');
      if (x.teamId !== base.teamId) {
        expect(test35('fl-join', x)).toBe(false);
        break;
      }
    }
    // a title, with a classmate on the team that season (or a season behind, as the class has him)
    const g = structuredClone(base);
    const h = nbaOf(g).at(-1)!;
    h.result = 'NBA Champion';
    g.mp = { klass: 'ABCDEF', friends: [friend('b', [line(h.year, other(g, 1).name)])] };
    expect(test35('fl-ring-pal', g)).toBe(false);
    g.mp.friends = [friend('b', [line(h.year, h.teamName)])];
    expect(test35('fl-ring-pal', g)).toBe(true);
    g.mp.friends = [friend('b', [line(h.year - 1, h.teamName)])];
    expect(test35('fl-ring-pal', g)).toBe(true);
    g.mp.friends = [friend('b', [line(h.year, h.teamName, { lv: 'GL' })])];
    expect(test35('fl-ring-pal', g), 'his affiliate is not his team').toBe(false);
    h.result = 'Lost in the first round';
    g.mp.friends = [friend('b', [line(h.year, h.teamName)])];
    expect(test35('fl-ring-pal', g)).toBe(false);
  }, 60_000);
});

describe('a duo of friends in the older duo turning points', () => {
  it('is no partner whose contract can be extended (it has none here), and asks nothing of the roster', () => {
    const s = withMp(dn.off, { klass: 'ABCDEF', friends: [friend('d', [line(dn.off.year, mine(dn.off).name)])] });
    s.bonds = [];
    expect(activeDuo(s)?.friend).toBe('Friend d');
    const ext = ROUND21_EVENTS.find((e) => e.id === 'duoExtension')!;
    expect(() => ext.when!(s)).not.toThrow();
    expect(ext.when!(s)).toBe(false);
  });
});

describe('the class\'s pages (ui/achievements.ts, ui/multiplayer.ts)', () => {
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
    return { ach: await import('../src/ui/achievements'), mp: await import('../src/ui/multiplayer') };
  };
  const member = (id: string, isMine: boolean): ClassMember => ({ id, name: id, seasons: [], rec: null, at: `2030-01-0${id.length}T00:00:00Z`, mine: isMine });
  const award = (key: string, rows: [ClassMember, number][]): ReunionAward => ({ key, title: key, icon: 'laurel', what: key, rows: rows.map(([m, value]) => ({ m, value, text: String(value) })) });

  it('names the awards of reunion night he won outright, never one nobody has any of', async () => {
    const { mp } = await fresh();
    const me = member('me', true);
    const pal = member('pal', false);
    const night = [award('iron', [[me, 900], [pal, 800]]), award('mvps', [[me, 0], [pal, 0]]), award('rings', [[pal, 2], [me, 1]]), award('mvp', [[me, 140], [pal, 120]])];
    expect(mp.reunionWon(night)).toEqual(['iron', 'mvp']);
    // the real night, on a class of two: every award goes to someone or to nobody
    const k: DraftClass = { code: 'ABC234', name: 'Class', seed: 1, at: '2030-01-01T00:00:00Z', mine: true, members: [me, pal] };
    expect(mp.reunionAwards(k).map((a) => a.key).at(-1)).toBe('mvp');
  });

  it('counts reunion night once a class, the reactions once a season, the daily board once a day, a classmate watched once', async () => {
    const { ach } = await fresh();
    const book = await import('../src/engine/achievements');
    expect(ach.recordReunion('ABC234', 2, 11, true)).toBe(true);
    expect(ach.recordReunion('ABC234', 2, 11, true), 'the same night again').toBe(false);
    expect(ach.recordReunion('DEF567', 4, 11, false)).toBe(true);
    expect(ach.recordReunion('GHJ892', 11, 11, true)).toBe(true);
    expect(ach.loadAch().totals.mp).toMatchObject({ reunionMvp: 2, reunion3: 2, reunionSweep: 1 });
    for (let y = 0; y < 9; y++) ach.recordMp('react', `ABC234:pal:${2030 + y}`);
    expect(ach.recordMp('react', 'ABC234:pal:2030'), 'the same season again').toBe(false);
    expect(book.earnedNow(null, ach.loadAch().totals)).not.toContain('mp-react10');
    ach.recordMp('react', 'DEF567:pal:2030');
    expect(book.earnedNow(null, ach.loadAch().totals)).toContain('mp-react10');
    for (const id of ['a', 'b', 'c', 'd', 'a']) ach.recordMp('watched', `ABC234:${id}`);
    expect(ach.loadAch().totals.mp?.watched).toBe(4);
    ach.recordMp('watched', 'DEF567:a');
    ach.recordMp('crowned', 'ABC234');
    ach.recordMp('dailyTop', '2030-05-01');
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of PAGES) expect(got, id).toContain(id);
  });
});

// ---------- the turning points ----------

const ALL_ICONS = { ...ICONS, ...CULTURE_ICONS, ...CAREER_ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C };
/** 16 by 16 in the palette's letters, and drawn for this one thing (no other icon is the same picture). */
function ownIcon(key: string): void {
  const pic = ALL_ICONS[key];
  expect(pic, key).toBeTruthy();
  expect(pic.length, key).toBe(16);
  for (const row of pic) expect(row, key).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
  expect(Object.entries(ALL_ICONS).filter(([k, v]) => k !== key && v.join('|') === pic.join('|')).map(([k]) => k), key).toEqual([]);
}
const ev = (id: string) => ROUND35C_EVENTS.find((e) => e.id === id)!;
const applies = (id: string, s: GameState) => ev(id).stages.includes(s.stage) && (ev(id).when?.(s) ?? true);

describe('the draft class\'s turning points', () => {
  /** Where each one applies, in a class career. */
  let where: Record<string, GameState>;
  beforeAll(() => {
    const k = (s: GameState, x: Partial<NonNullable<GameState['mp']>> = {}) => withMp(s, { klass: 'ABCDEF', ...x });
    const mid = dn.mid;
    const rivalOn = (s: GameState) => {
      const t = structuredClone(s);
      const r = other(t, 3);
      const me = mine(t);
      // both teams on top of their conferences
      Object.assign(me, { w: 40, l: 1 });
      Object.assign(r, { w: 40, l: 1 });
      t.mp = { klass: 'ABCDEF', friends: [friend('r', [line(t.year, r.name)])], rival: 'r' };
      return t;
    };
    const off = dn.off;
    const mvp = k(off, { friends: [friend('m', [line(off.year, other(off).name)])] });
    mvp.nbaHistory[mvp.nbaHistory.length - 1].awards.find((a) => a.award === 'MVP')!.name = 'Player m (Friend m)';
    const old = k(off);
    old.player.age = 32;
    where = {
      rookieDinner: k(mid),
      classmateBlock: k(mid, { friends: [friend('b', [line(mid.year, other(mid, 5).name, { ovr: 84 })]), friend('c', [line(mid.year, other(mid, 6).name, { ovr: 79 })])] }),
      rivalBracket: rivalOn(mid),
      classmateMvp: mvp,
      reunionInvite: old,
    };
  });

  it('has five, each with a pixel icon of its own and a theme in the deck', () => {
    expect(ROUND35C_EVENTS.map((e) => e.id)).toEqual(Object.keys(where));
    for (const e of ROUND35C_EVENTS) {
      ownIcon(`ev-${e.id}`);
      expect(themeOf(e.id), e.id).toBe('Friends, the draft class and challenges');
    }
  });

  it('offers each one where it applies, and every choice resolves with a result card; the harness picks one', () => {
    for (const e of ROUND35C_EVENTS) {
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
        const u = structuredClone(s);
        choose(u, c.id);
        expect(u.result).toEqual(t.result);
        expect(u.player).toEqual(t.player);
      }
    }
  });

  it('says what it is about: his pick, the classmate, the rival, the MVP', () => {
    const text = (id: string) => {
      const s = structuredClone(where[id]);
      offerEvent(s, id);
      return s.pending[0];
    };
    expect(text('rookieDinner').text).toContain(`You went No. ${dn.mid.draft!.userPick}.`);
    // the best-rated classmate elsewhere is the one on the block
    const block = text('classmateBlock');
    expect(block.text).toContain('Player b (Friend b)');
    expect(block.choices[0].label).toBe('Tell your GM to go get Player b');
    expect(text('rivalBracket').text).toContain('Player r');
    expect(text('classmateMvp').text).toContain('Player m (Friend m) is the MVP of your league');
    expect(text('reunionInvite').text).toContain('You are 32');
  });

  it('keeps each to its moment, and every one to a draft class', () => {
    for (const [id, s] of Object.entries(where)) {
      expect(applies(id, withMp(s, undefined)), `${id}: no class`).toBe(false);
      expect(applies(id, withMp(s, { challenge: 'GHJKLM', friends: s.mp?.friends, rival: s.mp?.rival })), `${id}: a challenge`).toBe(false);
      const t = structuredClone(s);
      t.mode = 'stars';
      expect(applies(id, t), `${id}: another difficulty`).toBe(false);
    }
    // the rookie dinner: draft night's rookie year only
    expect(applies('rookieDinner', withMp(dn.off, { klass: 'ABCDEF' })), 'after his first NBA season').toBe(false);
    const hs = structuredClone(where.rookieDinner);
    hs.start = { ...hs.start!, input: { ...hs.start!.input, start: undefined } };
    expect(applies('rookieDinner', hs), 'a career that began in high school').toBe(false);
    // the block: a classmate in the NBA on another team
    expect(applies('classmateBlock', withMp(dn.mid, { klass: 'ABCDEF', friends: [friend('b', [line(dn.mid.year, mine(dn.mid).name)])] })), 'on his own team').toBe(false);
    expect(applies('classmateBlock', withMp(dn.mid, { klass: 'ABCDEF', friends: [friend('b', [line(dn.mid.year, other(dn.mid).name, { lv: 'EU' })])] })), 'abroad').toBe(false);
    // the bracket: both teams in the top six
    const low = structuredClone(where.rivalBracket);
    const r = low.nba!.teams.find((t) => t.name === low.mp!.friends![0].seasons[0].team)!;
    Object.assign(r, { w: 0, l: 41 });
    expect(applies('rivalBracket', low)).toBe(false);
    // the MVP: this season's, a classmate's
    const notPal = structuredClone(where.classmateMvp);
    notPal.nbaHistory[notPal.nbaHistory.length - 1].awards.find((a) => a.award === 'MVP')!.name = 'Somebody Else';
    expect(applies('classmateMvp', notPal)).toBe(false);
    // the invitation: 32 or older
    const young = structuredClone(where.reunionInvite);
    young.player.age = 31;
    expect(applies('reunionInvite', young)).toBe(false);
  });

  it('never applies anywhere in a career without friends', () => {
    const g = newGame(3532, { ...input, start: 'draft' });
    const r = makeRng(3532);
    let seen = 0;
    for (let k = 0; k < 9000; k++) {
      fastForward(g);
      for (const e of ROUND35C_EVENTS) expect(e.when!(g), `${e.id} at ${g.year} ${g.step}`).toBe(false);
      seen++;
      const pr = prompt(g);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
      else advance(g);
    }
    expect(g.step).toBe('retired');
    expect(seen).toBeGreaterThan(50);
    for (const e of ROUND35C_EVENTS) expect(g.events.lastSeen[e.id], e.id).toBeUndefined();
  }, 60_000);
});

describe('the draft class\'s shop things', () => {
  const ids = ['class-jersey-art', 'class-trainer', 'reunion-suit'];

  it('sells three, only to a draft class, each with a picture from the set', () => {
    for (const id of ids) {
      const it = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it, id).toBeTruthy();
      expect(it.klass, id).toBe(true);
      expect(ICONS[shopIcon(it.id, it.name)], id).toBeTruthy();
      expect(shopIcon(it.id, it.name), id).not.toBe('bag');
    }
    expect(SHOP_ITEMS.filter((x) => x.klass).map((x) => x.id)).toEqual(ids);
  });

  it('stocks them only in a class career, and draws a career without a class as before', () => {
    const s = structuredClone(dn.off);
    s.pending = [];
    s.player.bank = 0.1;
    const stocked = (t: GameState) => (t.pending.find((d) => d.kind === 'shop')?.choices ?? []).map((c) => c.id);
    let inClass = 0;
    for (let k = 0; k < 120; k++) {
      const plain = structuredClone(s);
      plain.rng = makeRng(k + 1);
      pushShop(plain);
      expect(stocked(plain).filter((id) => ids.includes(id)), `draw ${k}`).toEqual([]);
      const klass = withMp(s, { klass: 'ABCDEF' });
      klass.rng = makeRng(k + 1);
      pushShop(klass);
      if (stocked(klass).some((id) => ids.includes(id))) inClass++;
    }
    expect(inClass).toBeGreaterThan(0);
  });
});
