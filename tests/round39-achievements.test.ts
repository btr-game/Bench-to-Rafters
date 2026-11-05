// Rounds 38 to 40, end of the round (the checklist, item 5): the batch of achievements for story mode
// (its chapters, the bonds, where the friend and the rival end up), the Floor (playing its last six
// minutes, winning them, the comeback, the game-winner, the late block, the points, a game seven),
// the languages and the airport's flight (kept on the device), and a few from the award races and
// the playoffs. This keeps the book, the Floor's marks (career/live.ts) and the device's counts
// (ui/achievements.ts) in step.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../src/engine/flow';
import type { GameState, SeasonRecord, StoryRole } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow, type CareerTotals } from '../src/engine/achievements';
import { ACHIEVEMENTS_39, LANG_COUNT, R39_MARKS, R39_TOTALS_ONLY } from '../src/engine/achievements39';
import { achCatOf } from '../src/engine/achievementCats';
import { buildNba } from '../src/engine/world/leagues';
import { makeRng } from '../src/engine/rng';
import { NeedLive, playLiveGame, type LiveGameArgs, type LiveRequest } from '../src/engine/career/live';
import { expected } from '../src/engine/sim/statModel';
import { userProfile } from '../src/engine/career/season';
import { floorPick } from '../src/engine/floor/career';
import { LANGS } from '../src/i18n';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 1, focus: ['SHT', 'PER'], hometown: 'Akron, OH', highSchool: 'St. Vincent' };
const hero = { name: 'Eli Carter', number: 3, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'PLY'], hometown: 'Dayton, OH', highSchool: 'Fairview High' };
const game = (seed = 3901) => newGame(seed, input as never) as GameState;
const story = (seed = 3902, names: Record<string, string> = {}) => newGame(seed, { ...hero, story: names } as never) as GameState;
const ids39 = ACHIEVEMENTS_39.map((a) => a.id);

/** One of this batch's checks on a career; `retired` stands in for a career played to its end. */
const test39 = (id: string, g: GameState, t: CareerTotals = NO_TOTALS, retired = g.step === 'retired') => {
  const a = ACHIEVEMENTS_39.find((x) => x.id === id)!;
  expect(a, id).toBeTruthy();
  return a.test({ g, t, nba: g.history.filter((h) => h.level === 'NBA' && h.line.gp > 0), retired });
};

/** A season row (only what the checks read). */
const row = (year: number, age: number, over: Partial<SeasonRecord> = {}): SeasonRecord =>
  ({ year, age, level: 'NBA', stage: 'NBA', teamId: 'BOS', teamName: 'Boston Celtics', teamColor: '#007A33', role: 'starter', line: { gp: 75, pts: 75 * 12 }, post: { gp: 0, pts: 0 }, w: 45, l: 37, result: 'Lost in the first round', ovrStart: 70, ovrEnd: 70, awards: [], races: [], ...over }) as unknown as SeasonRecord;

/** A career in the NBA with Boston, `seasons` of them from age 22. */
function pro(g: GameState, seasons: number): GameState {
  g.nba = g.nba ?? buildNba(g, g.year);
  g.history = Array.from({ length: seasons }, (_, k) => row(g.year + k, 22 + k));
  g.teamId = 'BOS';
  g.stage = 'NBA';
  g.player.age = 22 + seasons;
  return g;
}
/** A friend's or the rival's season line, as story mode writes it into mp.friends. */
const line = (g: GameState, id: 'story-friend' | 'story-rival', year: number, lv: string, team: string, ovr = 70) => {
  g.mp ??= {};
  g.mp.friends ??= [];
  let f = g.mp.friends.find((x) => x.id === id);
  if (!f) g.mp.friends.push((f = { id, name: id === 'story-friend' ? 'your friend' : 'your rival', pn: 'Pal', pos: 'PF', seasons: [] }));
  f.seasons.push({ year, lv, team, ovr, pts: 10 });
};
const race = (award: string, userRank: number) => ({ award, userRank, top: [] });

describe('the book: rounds 38 to 40', () => {
  it('keeps every id and every name unique across the whole book, and files each one', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name.toLowerCase())).size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS_39.length).toBe(55);
    // round 39: Front Office's two archived with it, fifteen for the Floor mini-game in its place, ten for the Floor against a friend
    expect(ACHIEVEMENTS.length).toBe(938);
    expect(achCatOf('fo-win')).toBe('arcade');
    for (const a of ACHIEVEMENTS_39) {
      expect(ACHIEVEMENTS, a.id).toContain(a);
      expect(achCatOf(a.id), a.id).not.toBeNull();
      // a riddle until it is earned: a short line
      expect(a.how.length, a.id).toBeLessThan(110);
    }
    for (const id of R39_TOTALS_ONLY) expect(ids39, id).toContain(id);
    expect(achCatOf('sm-ch15')).toBe('fame');
    expect(achCatOf('sm-full')).toBe('fame');
    expect(achCatOf('sm-done')).toBe('modes');
    expect(achCatOf('sm-ring')).toBe('titles');
    expect(achCatOf('sm-rivaljoin')).toBe('team');
    expect(achCatOf('sm-coach')).toBe('team');
    expect(achCatOf('flr-win1')).toBe('titles');
    expect(achCatOf('flr-ring')).toBe('titles');
    expect(achCatOf('flr-pts15')).toBe('scoring');
    expect(achCatOf('flr-sim')).toBe('odd');
    expect(achCatOf('ln-3')).toBe('modes');
    expect(achCatOf('ap-10')).toBe('odd');
    expect(achCatOf('gn-mvp2')).toBe('awards');
    expect(achCatOf('gn-exits')).toBe('titles');
  });

  it('counts the game’s languages as the language menu has them', () => {
    expect(LANG_COUNT).toBe(LANGS.length);
  });

  it('earns nothing on a fresh career, a story or not, nor from empty totals', () => {
    for (const g of [game(), story()]) {
      expect(g.history.length).toBe(0);
      const got = earnedNow(g, NO_TOTALS);
      for (const id of ids39) expect(got, id).not.toContain(id);
    }
    const none = earnedNow(null, { ...NO_TOTALS });
    for (const id of ids39) expect(none, id).not.toContain(id);
  });

  it('earns the languages and the flights from the totals alone, with no career open', () => {
    const some = earnedNow(null, { ...NO_TOTALS, langs: ['en'], flights: 1 });
    expect(some).toContain('ap-1');
    for (const id of ['ln-1', 'ln-2', 'ap-10']) expect(some, id).not.toContain(id);
    const two = earnedNow(null, { ...NO_TOTALS, langs: ['en', 'ko'], flights: R39_MARKS.flights[1] });
    for (const id of ['ln-1', 'ln-2', 'ap-1', 'ap-10']) expect(two, id).toContain(id);
    for (const id of ['ln-3', 'ln-6']) expect(two, id).not.toContain(id);
    // one career in French is a language other than English
    expect(earnedNow(null, { ...NO_TOTALS, langs: ['fr'] })).toContain('ln-1');
    const all = earnedNow(null, { ...NO_TOTALS, langs: LANGS.map((l) => l.id) });
    for (const id of ['ln-1', 'ln-2', 'ln-3', 'ln-6']) expect(all, id).toContain(id);
    // the career ones never come from the totals
    for (const a of ACHIEVEMENTS_39.filter((x) => !R39_TOTALS_ONLY.includes(x.id))) expect(all, a.id).not.toContain(a.id);
  });
});

describe('story mode in the book', () => {
  it('reads the chapters seen, the names he gave and a story played to its end', () => {
    const g = pro(story(), 3);
    const st = g.story!;
    expect(test39('sm-ch15', g)).toBe(false);
    st.done = Array.from({ length: R39_MARKS.chapters[0] }, (_, k) => `ch${k}`);
    expect(test39('sm-ch15', g)).toBe(true);
    expect(test39('sm-ch18', g)).toBe(false);
    st.done.push('a', 'b', 'c');
    expect(test39('sm-ch18', g)).toBe(true);
    expect(test39('sm-named', g)).toBe(false);
    const named = pro(story(3903, { friend: 'Marcus Bell', parent: 'Denise', sibling: 'Jo', rival: 'Dante Vale' }), 2);
    expect(test39('sm-named', named)).toBe(true);
    const three = pro(story(3904, { friend: 'Marcus Bell', parent: 'Denise', rival: 'Dante Vale' }), 2);
    expect(test39('sm-named', three)).toBe(false);
    expect(test39('sm-done', g)).toBe(false);
    expect(test39('sm-done', g, NO_TOTALS, true)).toBe(true);
    // a career that is not a story earns none of the story's
    const plain = pro(game(), 3);
    expect(test39('sm-done', plain, NO_TOTALS, true)).toBe(false);
  });

  it('reads the bonds: each as warm as it goes, all four at once, one as cold as it can', () => {
    const g = pro(story(), 3);
    const st = g.story!;
    const people: [StoryRole, string][] = [['friend', 'sm-friend3'], ['parent', 'sm-parent3'], ['sibling', 'sm-sibling3'], ['rival', 'sm-rival3']];
    for (const [who, id] of people) {
      st.bond[who] = 2;
      expect(test39(id, g), id).toBe(false);
      st.bond[who] = 3;
      expect(test39(id, g), id).toBe(true);
    }
    expect(test39('sm-full', g)).toBe(true);
    st.bond.sibling = 2;
    expect(test39('sm-full', g)).toBe(false);
    expect(test39('sm-cold', g)).toBe(false);
    st.bond.rival = -3;
    expect(test39('sm-cold', g)).toBe(true);
  });

  it('reads where the friend and the rival end up, from the switches the chapters set', () => {
    const g = pro(story(), 4);
    const st = g.story!;
    for (const [id, k] of [['sm-coach', 'friendCoach'], ['sm-join', 'friendJoined'], ['sm-rivaljoin', 'rivalJoined'], ['sm-ball', 'rafterBall']] as const) {
      expect(test39(id, g), id).toBe(false);
      st.f[k] = -1;
      expect(test39(id, g), `${id}: the other answer`).toBe(false);
      st.f[k] = 1;
      expect(test39(id, g), id).toBe(true);
    }
    expect(test39('sm-star', g)).toBe(false);
    st.done.push('f-mvp');
    expect(test39('sm-star', g)).toBe(true);
    // the hit, then the apology: peace unless he closed the door
    st.done.push('t-hit');
    expect(test39('sm-hatchet', g)).toBe(false);
    st.done.push('t-apology');
    st.f.feud = 1;
    expect(test39('sm-hatchet', g)).toBe(false);
    st.f.feud = 0;
    expect(test39('sm-hatchet', g)).toBe(true);
    // the promise in the car, kept with the house
    const said = (id: string) => st.mem.push({ id, year: g.year, who: 'parent', text: '' });
    said('p-house-house');
    expect(test39('sm-keys', g), 'a house with no promise').toBe(false);
    said('p-ride-promise');
    expect(test39('sm-keys', g)).toBe(true);
  });

  it('reads a season ahead of the rival and a title with the friend beside him', () => {
    const g = pro(story(), 4);
    const y = g.history[2].year;
    g.history[2].ovrEnd = 78.4;
    line(g, 'story-rival', y, 'NBA', 'Miami Heat', 79);
    expect(test39('sm-ahead', g)).toBe(false);
    g.history[2].ovrEnd = 79.6;
    expect(test39('sm-ahead', g)).toBe(true);
    // a title, the friend elsewhere, then on the team, then on its bench
    g.history[3].result = 'NBA Champion';
    g.awards.push({ year: g.history[3].year, level: 'NBA', key: 'TITLE', label: 'NBA Champion' });
    line(g, 'story-friend', g.history[3].year, 'NBA', 'Miami Heat');
    expect(test39('sm-ring', g)).toBe(false);
    g.mp!.friends!.find((x) => x.id === 'story-friend')!.seasons[0].team = 'Boston Celtics';
    expect(test39('sm-ring', g)).toBe(true);
    g.mp!.friends!.find((x) => x.id === 'story-friend')!.seasons[0].lv = 'COACH';
    expect(test39('sm-ring', g), 'an assistant on its bench').toBe(true);
    g.mp!.friends!.find((x) => x.id === 'story-friend')!.seasons[0].lv = 'OUT';
    expect(test39('sm-ring', g), 'in the stands').toBe(false);
  });
});

describe('the Floor in the book', () => {
  it('reads the marks floorFinish keeps: played, simulated, won, the comeback, the shots, the points', () => {
    const g = pro(game(), 6);
    const F = g.flags;
    expect(ids39.filter((id) => id.startsWith('flr-')).filter((id) => test39(id, g))).toEqual([]);
    F.floor = 1;
    expect(test39('flr-sim', g)).toBe(true);
    expect(test39('flr-1', g)).toBe(false);
    F.floorPlayed = 1;
    expect(test39('flr-sim', g), 'the one Floor game was his own').toBe(false);
    expect(test39('flr-1', g)).toBe(true);
    for (const [k, marks] of [['floorWon', [['flr-win1', 1], ['flr-win3', 3], ['flr-win10', 10]]], ['floorPts', [['flr-pts10', 10], ['flr-pts15', 15], ['flr-pts20', 20]]]] as const)
      for (const [id, at] of marks) {
        F[k] = at - 1;
        expect(test39(id, g), id).toBe(false);
        F[k] = at;
        expect(test39(id, g), id).toBe(true);
      }
    for (const [id, k] of [['flr-back', 'floorBack'], ['flr-winner', 'floorWinner'], ['flr-stop', 'floorStop'], ['flr-g7', 'floorG7'], ['flr-ring', 'floorRing']] as const) {
      expect(test39(id, g), id).toBe(false);
      F[k] = k === 'floorRing' ? g.year : 1;
      expect(test39(id, g), id).toBe(true);
    }
  });

  /** One Floor game, game seven or game six of a round, played through to his own result. */
  function floorGame(round: string, wins: number, won: boolean) {
    const base = game(3905);
    base.nba = buildNba(base, base.year);
    base.rng = makeRng(39);
    const opp = base.nba.teams[1];
    const args: LiveGameArgs = { e: expected(userProfile(base), 'NBA', 36, 1), started: true, level: 'NBA', my: 72, opp: 72, oppName: opp.name, oppId: opp.id, homeAdv: 1, round, series: { game: 4 + wins, bestOf: 7, wins, losses: 3 } };
    const picks: string[] = [];
    for (let k = 0; k < 20; k++) {
      const s = structuredClone(base);
      s.live = { picks: [...picks], i: 0, simAll: false, simSeries: null, recent: [] };
      try {
        playLiveGame(s, args);
        return s;
      } catch (e) {
        if (!(e instanceof NeedLive)) throw e;
        const r: LiveRequest = e.req;
        expect(r.stage).toBe('floor');
        const d = won ? 8 : -8;
        picks.push(floorPick({ us: r.us + 12 + Math.max(0, d), them: r.them + 12 - Math.min(0, d), line: { pts: 9, reb: 2, ast: 1, stl: 0, blk: 0, fgm: 4, fga: 7, tpm: 1, tpa: 2, ftm: 0, fta: 0, tov: 0, pf: 1 }, marks: { low: -4, winner: false, stop: false } }));
      }
    }
    throw new Error('the game never ended');
  }

  it('marks a game seven won on the Floor, the one that won the NBA title, and the summer after a loss', () => {
    const g7 = floorGame('Conference finals', 3, true);
    expect(g7.flags.floorG7).toBe(1);
    expect(g7.flags.floorRing).toBeUndefined();
    expect(g7.flags.floorLost).toBeUndefined();
    const ring = floorGame('NBA Finals', 3, true);
    expect(ring.flags.floorG7).toBe(1);
    expect(ring.flags.floorRing).toBe(ring.year);
    expect(test39('flr-ring', ring)).toBe(true);
    // game six, one loss from home: a win sends it to a seventh, nothing more
    const g6 = floorGame('NBA Finals', 2, true);
    expect(g6.flags.floorWon).toBe(1);
    expect(g6.flags.floorG7).toBeUndefined();
    expect(g6.flags.floorRing).toBeUndefined();
    const lost = floorGame('NBA Finals', 3, false);
    expect(lost.flags.floorLost).toBe(lost.year);
    expect(lost.flags.floorG7).toBeUndefined();
    expect(lost.flags.floorRing).toBeUndefined();
  });
});

describe('the award races and the playoffs in the book', () => {
  it('reads second places in the races and the top five of the MVP voting', () => {
    const g = pro(game(), 8);
    for (const [id, award] of [['gn-mvp2', 'MVP'], ['gn-roy2', 'Rookie of the Year'], ['gn-dpoy2', 'DPOY']] as const) {
      g.history[1].races = [race(award, 3)];
      expect(test39(id, g), id).toBe(false);
      g.history[1].races = [race(award, 1)];
      expect(test39(id, g), `${id}: won it`).toBe(false);
      g.history[1].races = [race(award, 2)];
      expect(test39(id, g), id).toBe(true);
    }
    for (let k = 0; k < 4; k++) g.history[k].races = [race('MVP', 5)];
    expect(test39('gn-mvp5x5', g)).toBe(false);
    g.history[4].races = [race('MVP', 1)];
    expect(test39('gn-mvp5x5', g)).toBe(true);
  });

  it('reads every exit, the playoffs with four teams and a title off the bench', () => {
    const g = pro(game(), 8);
    const exits = ['Lost in the First round', 'Lost in the Conference semifinals', 'Lost in the Conference finals'];
    exits.forEach((r, k) => (g.history[k].result = r));
    expect(test39('gn-exits', g)).toBe(false);
    g.history[3].result = 'Lost in the NBA Finals';
    expect(test39('gn-exits', g)).toBe(true);
    expect(test39('gn-tourist', g)).toBe(false);
    ['NYK', 'MIA', 'LAL'].forEach((id, k) => (g.history[k + 4].teamId = id));
    expect(test39('gn-tourist', g)).toBe(true);
    g.history[6].result = 'Missed the playoffs';
    expect(test39('gn-tourist', g)).toBe(false);
    g.history[7].result = 'NBA Champion';
    expect(test39('gn-sixthring', g)).toBe(false);
    g.history[7].role = 'sixth';
    expect(test39('gn-sixthring', g)).toBe(true);
  });
});

describe('the UI’s part (ui/achievements.ts): the languages and the flights', () => {
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
    return { ach: await import('../src/ui/achievements'), book: await import('../src/engine/achievements'), i18n: await import('../src/i18n') };
  };

  it('keeps the language each career was finished in, once a language', async () => {
    const { ach, book, i18n } = await fresh();
    i18n.setLang('en');
    ach.countCareer(game(), false);
    expect(ach.loadAch().totals.langs).toEqual(['en']);
    expect(book.earnedNow(null, ach.loadAch().totals)).not.toContain('ln-1');
    i18n.setLang('ko');
    ach.countCareer(game(3906), false);
    ach.countCareer(game(3907), false);
    expect(ach.loadAch().totals.langs).toEqual(['en', 'ko']);
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['ln-1', 'ln-2']) expect(got, id).toContain(id);
    expect(ach.loadAch().totals.finished).toBe(3);
  });

  it('counts the flights back to the main land, telling the book at the first and the tenth', async () => {
    const { ach, book } = await fresh();
    let told = 0;
    for (let k = 0; k < 12; k++) told += Number(ach.recordFlight());
    expect(ach.loadAch().totals.flights).toBe(12);
    expect(told).toBe(R39_MARKS.flights.length);
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['ap-1', 'ap-10']) expect(got, id).toContain(id);
  });

  it('counts the games against friends on the Floor: wins, the streak, the close one and the rout', async () => {
    const { ach, book } = await fresh();
    expect(book.earnedNow(null, ach.loadAch().totals)).not.toContain('fo-1');
    ach.recordFloorFriend(false, -4, 8);
    for (const m of [2, 5, 11]) ach.recordFloorFriend(true, m, 12);
    ach.recordFloorFriend(false, -1, 21);
    const f = ach.loadAch().totals.floorFriend!;
    expect([f.games, f.wins, f.losses, f.streak, f.best, f.rout, f.close, f.pts]).toEqual([5, 3, 2, 0, 3, true, true, 21]);
    const got = book.earnedNow(null, ach.loadAch().totals);
    for (const id of ['fo-1', 'fo-lose', 'fo-win', 'fo-streak', 'fo-rout', 'fo-close', 'fo-pts']) expect(got, id).toContain(id);
    for (const id of ['fo-10', 'fo-win5', 'fo-win20']) expect(got, id).not.toContain(id);
  });
});
