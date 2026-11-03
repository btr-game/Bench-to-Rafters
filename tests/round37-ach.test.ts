// Round 37: the end-of-round batch of achievements. The town (walking the street, its doors, the
// agent's office, the four looks of it, the miles; what a career puts on it: the house, the mansion,
// the car and the hoop, the statue, the banners), the landmarks beside the arenas, round 36's career
// changers, the long careers its aging allows and its higher bar, and the round's turning points and
// shop things. What the street shows is worked out in engine/career/street.ts; this keeps the book,
// the street (ui/town.ts) and the counting on the device (ui/achievements.ts) in step.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/engine/flow';
import type { GameState, SeasonRecord } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type CareerTotals } from '../src/engine/achievements';
import { ACHIEVEMENTS_37, R37_TOTALS_ONLY, TOWN_LOOKS, TOWN_MARKS, TOWN_PLACES } from '../src/engine/achievements37';
import { achCatOf } from '../src/engine/achievementCats';
import { HOUSE_BANK, cityMark, upHere } from '../src/engine/career/street';
import { raftersTeams } from '../src/engine/awards/legacy';
import { buildNba } from '../src/engine/world/leagues';
import { NBA_TEAMS } from '../src/content/teams';
import { HOUSE_AT, townLook, townOf } from '../src/ui/town';
import { NBA_ARENAS } from '../src/ui/arenas';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 1, focus: ['SHT', 'PER'], hometown: 'Akron, OH', highSchool: 'St. Vincent' };
const game = (seed = 3707) => newGame(seed, input as never) as GameState;

/** One of this round's checks on a career; `retired` stands in for a career played to its end. */
const test37 = (id: string, g: GameState, t: CareerTotals = NO_TOTALS, retired = g.step === 'retired') => {
  const a = ACHIEVEMENTS_37.find((x) => x.id === id)!;
  expect(a, id).toBeTruthy();
  return a.test({ g, t, nba: g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0), retired, age: g.player.age, ovr: 60 });
};

/** A season row (only what the checks read). */
const row = (year: number, age: number, over: Partial<SeasonRecord> = {}): SeasonRecord =>
  ({ year, age, level: 'NBA', stage: 'NBA', teamId: 'BOS', teamName: 'Boston Celtics', teamColor: '#007A33', role: 'starter', line: { gp: 75, pts: 75 * 12 }, post: { gp: 0, pts: 0 }, w: 45, l: 37, result: 'Lost in the first round', ovrStart: 70, ovrEnd: 70, awards: [], ...over }) as unknown as SeasonRecord;

/** The career in the NBA with Boston, `seasons` of them from age 22, retired or not. */
function pro(seasons: number, retired = false): GameState {
  const g = game();
  g.nba = g.nba ?? buildNba(g, g.year);
  g.history = Array.from({ length: seasons }, (_, k) => row(g.year + k, 22 + k));
  g.teamId = 'BOS';
  g.stage = retired ? 'RETIRED' : 'NBA';
  if (retired) g.step = 'retired';
  g.player.age = 22 + seasons;
  return g;
}
const award = (g: GameState, key: string, ...ys: number[]) => g.awards.push(...ys.map((year) => ({ year, level: 'NBA' as const, key, label: key })));

describe('the book: round 37', () => {
  it('keeps every id and every name unique across the whole book, and files each one', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name.toLowerCase())).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS_37.length).toBe(45);
    expect(ACHIEVEMENTS.length).toBe(870);
    for (const a of ACHIEVEMENTS_37) {
      expect(ACHIEVEMENTS, a.id).toContain(a);
      expect(achCatOf(a.id), a.id).not.toBeNull();
      // a riddle until it is earned: a short line
      expect(a.how.length, a.id).toBeLessThan(110);
    }
    for (const id of R37_TOTALS_ONLY) expect(ACHIEVEMENTS_37.some((a) => a.id === id), id).toBe(true);
    expect(achCatOf('tw-door100')).toBe('modes');
    expect(achCatOf('tw-every')).toBe('modes');
    expect(achCatOf('tw-agent50')).toBe('money');
    expect(achCatOf('tw-mansion')).toBe('money');
    expect(achCatOf('tw-looks4')).toBe('road');
    expect(achCatOf('tw-mile')).toBe('odd');
    expect(achCatOf('ar-mark10')).toBe('team');
    expect(achCatOf('tw-statue')).toBe('career');
    expect(achCatOf('tw-banners')).toBe('titles');
    expect(achCatOf('cx-next')).toBe('rating');
    expect(achCatOf('cx-knee')).toBe('awards');
    expect(achCatOf('cx-knee-rafters')).toBe('career');
    expect(achCatOf('vt-20at40')).toBe('scoring');
    expect(achCatOf('bar-mvp3row')).toBe('awards');
    expect(achCatOf('tp-street')).toBe('fame');
    expect(achCatOf('tp-loyal')).toBe('money');
    expect(achCatOf('own-clinic')).toBe('money');
  });

  it('earns the town\'s walking ones from the totals alone, with no career open', () => {
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of R37_TOTALS_ONLY) expect(none, id).not.toContain(id);
    const some = earnedNow(null, { ...NO_TOTALS, doors: 100, agentDoors: 1, walked: TOWN_MARKS.mile, marks: ['steeple', 'bridge', 'empire', 'hall', 'cntower'], townRun: { run: 'x', places: [...TOWN_PLACES], looks: ['hometown', 'campus', 'city'] } });
    for (const id of ['tw-door1', 'tw-door100', 'tw-agent1', 'tw-every', 'tw-mile', 'ar-mark5']) expect(some, id).toContain(id);
    for (const id of ['tw-door1000', 'tw-agent50', 'tw-looks4', 'tw-marathon', 'ar-mark10', 'ar-mark30']) expect(some, id).not.toContain(id);
    const all = earnedNow(null, { ...NO_TOTALS, doors: 1000, agentDoors: 50, walked: TOWN_MARKS.mile * TOWN_MARKS.marathon, marks: Object.values(NBA_ARENAS).map((a) => a.mark!), townRun: { run: 'x', places: ['gym'], looks: [...TOWN_LOOKS] } });
    for (const id of ['tw-door1000', 'tw-agent50', 'tw-looks4', 'tw-marathon', 'ar-mark10', 'ar-mark30']) expect(all, id).toContain(id);
    expect(all, 'one place is not every place').not.toContain('tw-every');
    // the career ones never come from the totals
    for (const a of ACHIEVEMENTS_37.filter((x) => !R37_TOTALS_ONLY.includes(x.id))) expect(all, a.id).not.toContain(a.id);
  });

  it('counts the places and the looks the street has, and thirty landmarks', () => {
    const g = game();
    const nba = { ...g, stage: 'NBA', nba: g.nba ?? buildNba(g, g.year), teamId: 'BOS' } as GameState;
    expect(townOf(nba).places.map((p) => p.id)).toEqual([...TOWN_PLACES]);
    const looks = new Set((['HS', 'NCAA', 'NBA', 'EU'] as const).map((stage) => townLook({ ...g, stage } as GameState)));
    expect([...looks].sort()).toEqual([...TOWN_LOOKS].sort());
    expect(new Set(Object.values(NBA_ARENAS).map((a) => a.mark)).size).toBe(TOWN_MARKS.landmarks[2]);
  });
});

describe('what a career puts on the street', () => {
  it('reads the house, the mansion, the car and the hoop as the street draws them', () => {
    expect(HOUSE_AT).toBe(HOUSE_BANK);
    const g = pro(3);
    for (const bank of [HOUSE_BANK.house - 0.01, HOUSE_BANK.house, HOUSE_BANK.mansion - 0.01, HOUSE_BANK.mansion]) {
      g.player.bank = bank;
      const house = townOf(g).house;
      expect(test37('tw-house', g), `${bank}`).toBe(house === 'house' || house === 'mansion');
      expect(test37('tw-mansion', g), `${bank}`).toBe(house === 'mansion');
    }
    // in college the bank buys no house
    const kid = { ...g, stage: 'NCAA' } as GameState;
    expect(test37('tw-mansion', kid)).toBe(false);
    for (const purchases of [[], ['car'], ['home-court'], ['car', 'home-court'], ['car-collection', 'smart-court']]) {
      const s = { ...g, purchases };
      const t = townOf(s);
      expect(test37('tw-curb', s), purchases.join()).toBe(t.car && t.hoop);
    }
    // the hoop that came with the house on moving day
    const moved = { ...g, purchases: ['car'], flags: { ...g.flags, yardHoop: g.year } };
    expect(townOf(moved).hoop).toBe(true);
    expect(test37('tw-curb', moved)).toBe(true);
  });

  it('puts his statue outside the arena of the team he finished with, once it hangs his jersey', () => {
    const g = pro(7, true);
    // seven seasons and a legacy of 25 hang it
    g.player.legacyBonus = 60;
    expect(raftersTeams(g)).toContain('BOS');
    expect(townOf(g).statue).toBe(true);
    expect(test37('tw-statue', g)).toBe(true);
    const moved = { ...g, teamId: 'NYK' };
    expect(townOf(moved).statue).toBe(false);
    expect(test37('tw-statue', moved)).toBe(false);
    const playing = { ...g, stage: 'NBA', step: 'summary' } as GameState;
    expect(test37('tw-statue', playing)).toBe(false);
  });

  it('counts five title banners in one arena, not five rings across them', () => {
    const g = pro(8);
    award(g, 'TITLE', g.year + 1, g.year + 2, g.year + 3, g.year + 4);
    expect(test37('tw-banners', g)).toBe(false);
    g.history[7].teamName = 'Miami Heat';
    award(g, 'TITLE', g.year + 7);
    expect(test37('tw-banners', g), 'the fifth elsewhere').toBe(false);
    g.history[7].teamName = 'Boston Celtics';
    expect(test37('tw-banners', g)).toBe(true);
  });

  it('shows the street sign and the mural in the city that put them up, and nowhere else', () => {
    const g = pro(4);
    const here = cityMark(g);
    expect(NBA_TEAMS[here - 1].abbr).toBe('BOS');
    expect(townOf(g)).toMatchObject({ mural: null, sign: false });
    const up = { ...g, flags: { ...g.flags, mural: here, streetName: here } };
    expect(upHere(up, up.flags.mural)).toBe(true);
    expect(townOf(up)).toMatchObject({ mural: 23, sign: true });
    const traded = { ...up, teamId: 'NYK' };
    expect(townOf(traded)).toMatchObject({ mural: null, sign: false });
  });
});

describe('the career changers, the long career and the higher bar', () => {
  it('reads the next step and the career-altering injury, and what came after each', () => {
    const g = pro(10);
    const y = g.history[4].year;
    expect(test37('cx-next', g)).toBe(false);
    g.flags.nextStep = y;
    expect(test37('cx-next', g)).toBe(true);
    award(g, 'ALLSTAR', y);
    expect(test37('cx-next-as', g), 'the All-Star season before the summer it came').toBe(false);
    award(g, 'ALLSTAR', y + 1);
    expect(test37('cx-next-as', g)).toBe(true);
    expect(test37('cx-both', g)).toBe(false);
    g.flags.careerInjury = y + 2;
    expect(test37('cx-both', g)).toBe(true);
    expect(test37('cx-knee', g)).toBe(false);
    g.history[7].line.gp = 60;
    g.history[8].line.gp = 69;
    g.history[9].line.gp = 69;
    expect(test37('cx-knee-back', g)).toBe(false);
    g.history[9].line.gp = 70;
    expect(test37('cx-knee-back', g)).toBe(true);
    award(g, 'ALLSTAR', y + 4);
    expect(test37('cx-knee', g)).toBe(true);
    // the rafters, once he has retired
    g.player.legacyBonus = 60;
    expect(test37('cx-knee-rafters', g)).toBe(false);
    g.stage = 'RETIRED';
    g.step = 'retired';
    expect(test37('cx-knee-rafters', g)).toBe(true);
    delete g.flags.careerInjury;
    expect(test37('cx-knee-rafters', g)).toBe(false);
  });

  it('reads the ages of his honours and his seasons', () => {
    const g = pro(20);
    // he is 22 in the first season, 41 in the last
    const at = (age: number) => g.history.find((h) => h.age === age)!;
    award(g, 'ALLSTAR', at(37).year);
    expect(test37('vt-as38', g)).toBe(false);
    award(g, 'ALLSTAR', at(38).year);
    expect(test37('vt-as38', g)).toBe(true);
    expect(test37('vt-span15', g), 'one season apart').toBe(false);
    award(g, 'ALLSTAR', at(23).year);
    expect(test37('vt-span15', g)).toBe(true);
    award(g, 'MVP', at(36).year);
    expect(test37('vt-mvp37', g)).toBe(false);
    award(g, 'MVP', at(37).year);
    expect(test37('vt-mvp37', g)).toBe(true);
    at(37).ovrEnd = 89.4;
    expect(test37('vt-ovr90', g)).toBe(false);
    at(37).ovrEnd = 89.6;
    expect(test37('vt-ovr90', g)).toBe(true);
    // his best season at 37 is his peak, past 33
    expect(test37('vt-latepeak', g)).toBe(true);
    at(25).ovrEnd = 92;
    expect(test37('vt-latepeak', g)).toBe(false);
    at(40).line = { ...at(40).line, gp: 60, pts: 60 * 19.9 };
    expect(test37('vt-20at40', g)).toBe(false);
    at(40).line = { ...at(40).line, gp: 60, pts: 60 * 20 };
    expect(test37('vt-20at40', g)).toBe(true);
    at(41).role = 'sixth';
    expect(test37('vt-start42', g)).toBe(false);
    g.history.push(row(at(41).year + 1, 42, { role: 'key' }));
    expect(test37('vt-start42', g)).toBe(true);
  });

  it('counts MVPs and All-Star teams in a row, a gap breaking the run', () => {
    const g = pro(14);
    const y0 = g.history[0].year;
    award(g, 'MVP', y0 + 1, y0 + 2, y0 + 4);
    expect(test37('bar-mvp3row', g)).toBe(false);
    award(g, 'MVP', y0 + 3);
    expect(test37('bar-mvp3row', g)).toBe(true);
    award(g, 'ALLSTAR', ...Array.from({ length: 9 }, (_, k) => y0 + k), y0 + 10);
    expect(test37('bar-as10row', g)).toBe(false);
    award(g, 'ALLSTAR', y0 + 9);
    expect(test37('bar-as10row', g)).toBe(true);
    // an honour abroad is not the NBA's
    const eu = pro(14);
    eu.awards.push(...[0, 1, 2].map((k) => ({ year: y0 + k, level: 'EU' as const, key: 'MVP', label: 'MVP' })));
    expect(test37('bar-mvp3row', eu)).toBe(false);
  });
});

describe('the round\'s turning points and shop things in the book', () => {
  it('reads the flags and the log lines the turning points leave, and what he bought', () => {
    const g = pro(6);
    const log = (text: string) => g.log.push({ year: g.year, age: 28, kind: 'event', text });
    for (const [id, flag] of [['tp-street', 'streetName'], ['tp-mural', 'mural'], ['tp-gym', 'gymNamed'], ['tp-move', 'yardHoop'], ['tp-summer', 'summerWork']] as const) {
      expect(test37(id, g), id).toBe(false);
      g.flags[flag] = 1;
      expect(test37(id, g), id).toBe(true);
    }
    for (const [id, text] of [
      ['tp-rights', 'Stood under the new name on the Boston Celtics arena for the company that bought it.'],
      ['tp-loyal', 'Turned away an agent who came poaching, and stayed with his own.'],
      ['tp-midnight', 'Lost a midnight game of HORSE on his own court to the neighbour.'],
      ['tp-knee', 'Told the truth about the knee in his first week back.'],
    ]) {
      expect(test37(id, g), id).toBe(false);
      log(text);
      expect(test37(id, g), id).toBe(true);
    }
    g.purchases = ['arena-prints', 'knee-brace', 'city-bike', 'longevity-clinic'];
    expect(test37('own-prints', g)).toBe(true);
    expect(test37('own-brace', g)).toBe(true);
    expect(test37('own-bike', g), 'no car to leave at home').toBe(false);
    g.purchases.push('car');
    expect(test37('own-bike', g)).toBe(true);
    expect(test37('own-clinic', g), 'not yet 40').toBe(false);
    g.history.push(row(g.year + 20, 40));
    expect(test37('own-clinic', g)).toBe(true);
  });
});

describe('the UI\'s part (ui/achievements.ts): the doors, the streets, the miles', () => {
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
    return { ach: await import('../src/ui/achievements'), book: await import('../src/engine/achievements') };
  };
  const career = (seed: number, flags: Record<string, number> = {}) => ({ seed, flags, player: { name: 'Marcus Hale', height: 78 } }) as unknown as GameState;

  it('counts every door, the agent\'s office apart, and the places of one career', async () => {
    const { ach, book } = await fresh();
    expect(ach.recordPlace(career(1), 'arena'), 'the first door and a new place').toBe(true);
    expect(ach.recordPlace(career(1), 'arena'), 'the same place again').toBe(false);
    for (const p of ['gym', 'house', 'hall', 'arcade']) ach.recordPlace(career(1), p);
    expect(book.earnedNow(null, ach.loadAch().totals)).not.toContain('tw-every');
    expect(ach.recordPlace(career(1), 'agent')).toBe(true);
    expect(ach.loadAch().totals).toMatchObject({ doors: 7, agentDoors: 1 });
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['tw-door1', 'tw-agent1', 'tw-every']) expect(got, id).toContain(id);
    // a new career starts its own street; the doors keep counting
    ach.recordPlace(career(2), 'gym');
    expect(ach.loadAch().totals.townRun).toMatchObject({ places: ['gym'] });
    expect(ach.loadAch().totals.doors).toBe(8);
    // the tutorial's levels and the closing tour count nowhere
    expect(ach.recordPlace(career(3, { level: 1 }), 'gym')).toBe(false);
    expect(ach.recordPlace(career(3, { tour: 1 }), 'gym')).toBe(false);
    expect(ach.loadAch().totals.doors).toBe(8);
    // the hundredth door tells the book
    let told = 0;
    for (let k = 0; k < 92; k++) told += Number(ach.recordPlace(career(2), k % 2 ? 'hall' : 'gym'));
    expect(ach.loadAch().totals.doors).toBe(100);
    expect(told).toBe(2);
  });

  it('keeps the looks of a career\'s street and the landmarks seen across careers', async () => {
    const { ach, book } = await fresh();
    for (const look of ['hometown', 'campus', 'abroad']) expect(ach.recordStreet(career(1), look)).toBe(true);
    expect(ach.recordStreet(career(1), 'campus'), 'seen already').toBe(false);
    expect(book.earnedNow(null, ach.loadAch().totals)).not.toContain('tw-looks4');
    expect(ach.recordStreet(career(1), 'city', 'steeple')).toBe(true);
    expect(book.earnedNow(null, ach.loadAch().totals)).toContain('tw-looks4');
    // landmarks across careers
    for (const [k, mark] of ['bridge', 'empire', 'hall', 'cntower'].entries()) expect(ach.recordStreet(career(10 + k), 'city', mark)).toBe(true);
    expect(ach.recordStreet(career(13), 'city', 'steeple'), 'a landmark and a look seen already').toBe(false);
    expect(ach.loadAch().totals.marks).toEqual(['steeple', 'bridge', 'empire', 'hall', 'cntower']);
    expect(book.earnedNow(null, ach.loadAch().totals)).toContain('ar-mark5');
    expect(ach.recordStreet(career(21, { level: 2 }), 'city', 'gate')).toBe(false);
  });

  it('walks the miles at his size, and tells the book at each whole mile', async () => {
    const { ach, book } = await fresh();
    // eleven art pixels are his 6′6″: 78 inches; 132 pixels are 78 feet
    expect(ach.recordWalk(career(1), 0)).toBe(false);
    expect(ach.recordWalk(career(1), 5000)).toBe(false);
    expect(ach.recordWalk(career(1), 300)).toBe(true);
    expect(ach.loadAch().totals.walked).toBe(5300);
    expect(book.earnedNow(null, ach.loadAch().totals)).toContain('tw-mile');
    expect(ach.recordWalk(career(1, { tour: 1 }), 9999)).toBe(false);
  });
});
