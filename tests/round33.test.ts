// Round 33: the road map's three levels (engine/levels.ts): a senior-year start, one college
// season, a set number of NBA seasons, the systems each level holds, and the All-Star goal.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { fastForward } from '../src/engine/fast';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { Decision, GameState, Offer } from '../src/engine/types';
import { allows, eventInLevel, levelChoice, madeAllStar, nbaSeasons, roadOffers, talksOpen, type Level } from '../src/engine/levels';
import { ROADMAP } from '../src/engine/balance';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/** A level career played the way the game plays it (fast break between choices), with every
 * decision the player met. */
function play(level: Level, seed: number): { s: GameState; seen: Decision[] } {
  const r = makeRng(seed);
  const s = newGame(seed, { ...input, pos: (['PG', 'SG', 'SF', 'PF', 'C'] as const)[seed % 5], archetype: seed % 5, level });
  const seen: Decision[] = [];
  for (let k = 0; k < 4000; k++) {
    fastForward(s);
    const pr = prompt(s);
    if (pr.type === 'retired') break;
    if (pr.type === 'decision') {
      seen.push(structuredClone(pr.decision));
      choose(s, smartChoice(s, pr.decision, r));
    } else advance(s);
  }
  return { s, seen };
}

describe('a level career', () => {
  it('starts on the first page of his senior season', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const s = newGame(5, { ...input, level });
      expect(s.player.age).toBe(17);
      expect(s.stage).toBe('HS');
      expect(s.step).toBe('preseason');
      expect(s.moments).toHaveLength(1);
      expect(s.moments[0].text).toMatch(/Senior year/);
      expect(s.history.filter((h) => h.level === 'HSV' || h.level === 'HSJV')).toHaveLength(3);
    }
  });

  it('fast break still simulates the playoffs of the full game, and keeps playable ones in the levels', () => {
    const s = newGame(5, { ...input, mode: 'standard', fast: true });
    fastForward(s);
    expect(s.flags.simPostseason).toBe(1);
    const i = newGame(5, { ...input, level: 'intermediate' });
    fastForward(i);
    expect(i.flags.simPostseason).toBeFalsy();
    const b = newGame(5, { ...input, level: 'beginner' });
    fastForward(b);
    expect(b.flags.simPostseason).toBe(1);
  });

  it('leaves the full game as it was', () => {
    const s = newGame(5, { ...input, mode: 'standard' });
    expect(s.flags.level).toBeUndefined();
    expect(s.flags.fast).toBeUndefined();
    expect(s.player.age).toBe(14);
    expect(allows(s, 'roads') && allows(s, 'trade') && talksOpen(s)).toBe(true);
    expect(levelChoice(s, { id: 'x', kind: 'declare', title: '', text: '', choices: [{ id: 'declare', label: '' }] })).toBeNull();
    expect(eventInLevel(s, 'farewellOvation')).toBe(true);
  });

  for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
    it(`${level}: plays ${ROADMAP[level].nbaSeasons} NBA seasons, then ends (below advanced: an American, one college season)`, async () => {
      for (let i = 0; i < 6; i++) {
        const { s } = play(level, 330 + i);
        expect(s.step).toBe('retired');
        expect(s.flags.levelEnd).toBe(madeAllStar(s) ? 2 : 1);
        expect(nbaSeasons(s)).toBe(ROADMAP[level].nbaSeasons);
        if (level !== 'advanced') {
          expect(s.history.filter((h) => h.level === 'NCAA')).toHaveLength(1);
          expect(s.player.country).toBe('USA');
          expect(s.history.some((h) => h.level === 'EU' || h.level === 'INT')).toBe(false);
        }
        await breathe();
      }
    });
  }
});

describe('what each level holds', () => {
  it('beginner: six plans once a season, three things in the shop and one purchase, its own turning points, one last shot', async () => {
    let shots = 0;
    for (let i = 0; i < 4; i++) {
      const { s, seen } = play('beginner', 400 + i);
      const kinds = new Set(seen.map((d) => d.kind));
      for (const k of ['press', 'brand', 'summer', 'arc', 'offers', 'declare']) expect(kinds.has(k)).toBe(false);
      // the one playable moment: the last possession of his first NBA playoff game, nothing else
      const live = seen.filter((d) => d.kind === 'live');
      expect(live.length).toBe(s.flags.levelShot ? 1 : 0);
      for (const d of live) expect((d.data?.req as { stage: string }).stage).toBe('clutch');
      shots += live.length;
      for (const d of seen.filter((x) => x.kind === 'plan')) {
        expect(d.data?.season).toBe(true);
        expect(d.choices.filter((c) => c.id !== 'recovery').map((c) => c.id)).toEqual(['balanced', 'grind', 'shooting', 'strength', 'playmaking', 'defense']);
      }
      for (const d of seen.filter((x) => x.kind === 'shop')) {
        expect(d.choices.filter((c) => c.id !== 'leave').length).toBeLessThanOrEqual(3);
        expect(d.data?.bought).toBe(0);
      }
      expect(seen.filter((x) => x.kind === 'event').length).toBeGreaterThanOrEqual(5);
      expect(s.player.nickname).toBeFalsy();
      await breathe();
    }
    expect(shots).toBeGreaterThanOrEqual(3);
  });

  it('intermediate: offers, one or two of all twelve plans a season, no closing-tour systems', async () => {
    for (let i = 0; i < 3; i++) {
      const { seen } = play('intermediate', 420 + i);
      const kinds = new Set(seen.map((d) => d.kind));
      expect(kinds.has('offers')).toBe(true);
      for (const k of ['press', 'arc']) expect(kinds.has(k)).toBe(false);
      const plans = seen.filter((x) => x.kind === 'plan' && x.choices.length > 2);
      expect(plans.length).toBeGreaterThan(0);
      for (const d of plans) {
        expect(d.data?.season).toBe(true);
        expect(d.data?.single).toBeUndefined();
        expect(d.choices.length).toBe(12);
      }
      // offers after high school are colleges only
      const split = seen.find((d) => d.kind === 'offers' && d.data?.context === 'split')!;
      expect((split.data!.offers as Offer[]).every((o) => o.level === 'NCAA')).toBe(true);
      expect(split.choices.some((c) => c.id === 'prep')).toBe(false);
      await breathe();
    }
  });

  it('advanced: a plan for each half, and the full shop', async () => {
    const { seen } = play('advanced', 440);
    const plans = seen.filter((x) => x.kind === 'plan' && x.choices.length > 2);
    expect(plans.some((d) => d.data?.half === 2)).toBe(true);
    expect(seen.some((d) => d.kind === 'shop' && ((d.data?.bought as number) ?? 0) > 0)).toBe(true);
  });

  it('contract talks: none in beginner, the first NBA deal in intermediate, every deal in advanced', () => {
    expect(talksOpen(newGame(5, { ...input, level: 'beginner' }))).toBe(false);
    const i = newGame(5, { ...input, level: 'intermediate' });
    expect(talksOpen(i)).toBe(true);
    i.flags.nbaDeal = 1;
    expect(talksOpen(i)).toBe(false);
    const a = newGame(5, { ...input, level: 'advanced' });
    a.flags.nbaDeal = 1;
    expect(talksOpen(a)).toBe(true);
  });

  it('the closing tour stays out of every level', () => {
    const s = newGame(5, { ...input, level: 'advanced' });
    for (const id of ['farewellOvation', 'arc-love', 'duoLastShot', 'national-team', 'newborn']) expect(eventInLevel(s, id)).toBe(false);
    expect(eventInLevel(s, 'arc-rookie-wall')).toBe(true);
    const b = newGame(5, { ...input, level: 'beginner' });
    for (const id of ['arc-rookie-wall', 'hire-chef', 'coachDinner', 'shoe-sellout', 'rivalTalk']) expect(eventInLevel(b, id)).toBe(false);
  });

  it('without the roads abroad, only colleges and NBA teams call (then the G League, then anyone)', () => {
    const s = newGame(5, { ...input, level: 'intermediate' });
    const o = (level: Offer['level']) => ({ id: level, level }) as Offer;
    expect(roadOffers(s, [o('NCAA'), o('EU'), o('GL')]).map((x) => x.id)).toEqual(['NCAA']);
    expect(roadOffers(s, [o('EU'), o('GL')]).map((x) => x.id)).toEqual(['GL']);
    expect(roadOffers(s, [o('EU'), o('INT')]).map((x) => x.id)).toEqual(['EU', 'INT']);
    const a = newGame(5, { ...input, level: 'advanced' });
    expect(roadOffers(a, [o('NCAA'), o('EU')])).toHaveLength(2);
  });
});

describe('the goal', () => {
  it('most level careers make an NBA All-Star team', async () => {
    let star = 0;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const { s } = play((['beginner', 'intermediate', 'advanced'] as const)[i % 3], 500 + i);
      if (madeAllStar(s)) star++;
      if (i % 4 === 0) await breathe();
    }
    expect(star / n).toBeGreaterThanOrEqual(0.7);
  });
});

describe('the road map on this device', () => {
  it('opens the levels in order, and shows each level its own tabs', async () => {
    const { nextLevel, levelOpen, levelTabs } = await import('../src/ui/road');
    const road = { passed: {}, minis: {} };
    expect(nextLevel(road)).toBe('beginner');
    expect(levelOpen(road, 'intermediate')).toBe(false);
    const after = { passed: { beginner: { star: true } }, minis: {} };
    expect(nextLevel(after)).toBe('intermediate');
    expect(levelOpen(after, 'intermediate')).toBe(true);
    expect(levelOpen(after, 'advanced')).toBe(false);
    expect(levelTabs(newGame(5, { ...input, level: 'beginner' }))).toEqual(['home', 'player']);
    expect(levelTabs(newGame(5, { ...input, level: 'advanced' }))).toEqual(['home', 'season', 'player']);
    expect(levelTabs(newGame(5, { ...input, mode: 'standard' }))).toBeNull();
  });

  it('takes the exit code the graduation page shows, and the code is never spelled out in the source', async () => {
    const { exitCode, revealCode } = await import('../src/ui/road');
    const code = revealCode();
    expect(code).toMatch(/^[a-z]{7}$/);
    expect(exitCode(code)).toBe(true);
    expect(exitCode(` ${code.toUpperCase()} `)).toBe(true);
    expect(exitCode('btrdev')).toBe(false);
    expect(exitCode('')).toBe(false);
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    for (const f of walk('src')) expect(readFileSync(f, 'utf8').includes(code), f).toBe(false);
  });
});

describe('the island', () => {
  it('grades each mini-game run, keeps the best, and passes at C', async () => {
    const { roadGrade, bestGrade, passGrade, islandDone, roadDone, ROAD_MINIS } = await import('../src/ui/road');
    expect(roadGrade({ game: 'threes', score: 12, won: false, own: true })).toBe('D');
    expect(roadGrade({ game: 'threes', score: 13, won: false, own: true })).toBe('C');
    expect(roadGrade({ game: 'threes', score: 5, won: true, own: true })).toBe('A');
    expect(roadGrade({ game: 'office', titles: 0, playoffs: 1, seasons: 3, fired: true })).toBe('C');
    expect(roadGrade({ game: 'office', titles: 0, playoffs: 0, seasons: 3, fired: false })).toBe('D');
    expect(roadGrade({ game: 'legends', reached: 'semis' })).toBe('C');
    expect(roadGrade({ game: 'street', reached: 'close' })).toBe('C');
    expect(roadGrade({ game: 'rhythm', grade: 'S' })).toBe('S');
    expect(bestGrade('B', 'D')).toBe('B');
    expect(bestGrade('D', 'A')).toBe('A');
    expect(bestGrade(undefined, 'C')).toBe('C');
    expect(passGrade('S') && passGrade('C') && !passGrade('D') && !passGrade(undefined)).toBe(true);
    const all = Object.fromEntries(ROAD_MINIS.map((m) => [m, 'C']));
    const passed = { beginner: { star: true }, intermediate: { star: true }, advanced: { star: false } };
    expect(islandDone({ passed, minis: all })).toBe(true);
    expect(roadDone({ passed, minis: all })).toBe(false);
    expect(roadDone({ passed, minis: all, toured: 1 })).toBe(true);
    expect(roadDone({ passed, minis: { ...all, dunk: 'D' }, toured: 1 })).toBe(false);
  });
});

describe('the tutorial guide', () => {
  it('has one lesson per id, chains that point at real lessons, and every closing-tour lesson in a stop', async () => {
    const { LESSONS } = await import('../src/ui/tutorial/lessons');
    const { STOPS } = await import('../src/ui/tutorial/closing');
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LESSONS) {
      if (l.after) expect(ids, `${l.id} waits for ${l.after}`).toContain(l.after);
      expect(l.sel.length).toBeGreaterThan(0);
      expect(l.text.length).toBeGreaterThan(5);
    }
    const inStops = new Set(STOPS.flatMap((s) => s.lessons));
    for (const id of inStops) expect(ids, `stop lesson ${id}`).toContain(id);
    for (const l of LESSONS.filter((x) => x.at === 'tour')) expect(inStops.has(l.id), `${l.id} has a stop`).toBe(true);
    expect(new Set(STOPS.map((s) => s.id)).size).toBe(STOPS.length);
  });

  it('never leaves out the achievements, the career log or the community by accident: none of them is taught', async () => {
    const { LESSONS } = await import('../src/ui/tutorial/lessons');
    for (const l of LESSONS) expect(l.sel, l.id).not.toMatch(/data-tour="(ach|log|community|log-lock|log-pick|comm-tabs)"/);
  });

  it('stages its stops on real careers, kept nowhere', async () => {
    const { STOPS, stopsLeft } = await import('../src/ui/tutorial/closing');
    for (const id of ['prime', 'press', 'farewell', 'duo', 'player']) {
      const g = STOPS.find((s) => s.id === id)!.build();
      expect(g, id).toBeTruthy();
      expect(g!.flags.level).toBeFalsy();
      await breathe();
    }
    const all = STOPS.flatMap((s) => s.lessons);
    expect(stopsLeft(all)).toHaveLength(0);
    expect(stopsLeft([]).length).toBe(STOPS.length);
  });
});

describe('the book: efficiency, and the bad nights that are hard to have', () => {
  const line = (o: Partial<import('../src/engine/types').StatLine>) => ({ gp: 1, gs: 1, min: 34, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, ...o });
  const game = (o: Partial<import('../src/engine/types').StatLine>, post?: string) => ({ n: 1, opp: 'BOS', home: true, res: 'W' as const, us: 110, them: 100, line: line(o), post });

  it('keeps the extremes of his NBA games, and none from other levels or G League assignments', async () => {
    const { markGames } = await import('../src/engine/career/marks');
    const s = newGame(7, input);
    markGames(s, [game({ fgm: 11, fga: 11, ftm: 6, fta: 6, pts: 28, reb: 10, ast: 11 }), game({ fga: 13, tpa: 9, fta: 5, tov: 12, min: 38 })], 'NBA');
    expect(s.flags.gPerfFg).toBe(11);
    expect(s.flags.gPerfFt).toBe(6);
    expect(s.flags.gTdClean).toBe(1);
    expect(s.flags.gBrick).toBe(13);
    expect(s.flags.gBrick3).toBe(9);
    expect(s.flags.gBrickFt).toBe(5);
    expect(s.flags.gTov).toBe(12);
    expect(s.flags.gBlank).toBe(38);
    // a lesser night never lowers a mark; college and the G League never set one
    markGames(s, [game({ fgm: 4, fga: 4 })], 'NBA');
    markGames(s, [game({ fgm: 20, fga: 20 })], 'NCAA');
    markGames(s, [game({ fgm: 18, fga: 18 }, 'G League')], 'NBA');
    expect(s.flags.gPerfFg).toBe(11);
  });

  it('earns the good and the bad from real marks and seasons, and only once a career is retired for the career ones', async () => {
    const { earnedNow, NO_TOTALS, ACHIEVEMENTS } = await import('../src/engine/achievements');
    const s = newGame(9, input);
    Object.assign(s.flags, { gPerfFg: 15, gBrick: 12, gTov: 13, gPerf3: 8 });
    const nbaSeason = (o: Partial<import('../src/engine/types').StatLine>, w: number) => ({ year: 2030, age: 24, level: 'NBA' as const, stage: 'NBA' as const, teamId: 'BOS', teamName: 'Celtics', teamColor: '#000', role: 'starter' as const, line: line({ gp: 70, ...o }), post: line({ gp: 0 }), w, l: 82 - w, result: '', ovrStart: 80, ovrEnd: 24, awards: [], races: [], salary: 1, bestGame: null });
    s.history.push(nbaSeason({ pts: 70 * 26, fgm: 70 * 9, fga: 70 * 17, tpm: 70 * 2, tpa: 70 * 4, ftm: 70 * 6, fta: 70 * 6.5 }, 14) as never);
    const got = new Set(earnedNow(s, NO_TOTALS));
    for (const id of ['e-perf10', 'e-perf13', 'e-perf15', 'b-brick12', 'b-tov13', 'e-3p8', 'e-504090-25', 'b-tank15', 'b-ovr25']) expect(got.has(id), id).toBe(true);
    for (const id of ['b-brick15', 'b-tank10', 'b-ovr18', 'b-peak40', 'b-draft0', 'e-3p10']) expect(got.has(id), id).toBe(false);
    // every one of them has a name of its own and says how it is earned
    const r33 = ACHIEVEMENTS.filter((a) => /^(e|b)-/.test(a.id) && !a.id.startsWith('b-coach'));
    expect(r33.length).toBeGreaterThanOrEqual(28);
    for (const a of r33) expect(a.how.length).toBeGreaterThan(20);
  });
});

describe('the round\'s events and shop items', () => {
  it('can be offered and answered on a real NBA season, and the items have a picture of their own', async () => {
    const { ROUND33_EVENTS } = await import('../src/engine/events/round33');
    const { offerEvent } = await import('../src/engine/events/resolver');
    const { SHOP_ITEMS } = await import('../src/content/shop');
    const { shopIcon, ICONS } = await import('../src/ui/art/icons');
    // an NBA offseason with nothing waiting, in a career of the full game
    const g = newGame(33, { ...input, mode: 'stars' });
    const r = makeRng(33);
    for (let k = 0; k < 6000 && !(g.stage === 'NBA' && g.step === 'offseason' && !g.pending.length && g.history.some((h) => h.level === 'NBA')); k++) {
      fastForward(g);
      const pr = prompt(g);
      if (pr.type === 'retired') break;
      if (pr.type === 'decision') choose(g, smartChoice(g, pr.decision, r));
      else advance(g);
    }
    expect(g.stage).toBe('NBA');
    for (const e of ROUND33_EVENTS) {
      const s = structuredClone(g);
      s.flags.gPerfFg = 11;
      expect(offerEvent(s, e.id)).toBe(true);
      const d = s.pending[0];
      expect(d.text.length).toBeGreaterThan(30);
      for (const c of d.choices) {
        const t = structuredClone(s);
        expect(() => choose(t, c.id)).not.toThrow();
        expect(t.result?.title).toBe(e.title);
      }
    }
    for (const id of ['shot-chart-wall', 'ft-routine-coach', 'ball-security', 'box-score-frame', 'gold-brick']) {
      const it33 = SHOP_ITEMS.find((x) => x.id === id)!;
      expect(it33, id).toBeTruthy();
      expect(ICONS[shopIcon(it33.id, it33.name)], id).toBeTruthy();
    }
  });
});
