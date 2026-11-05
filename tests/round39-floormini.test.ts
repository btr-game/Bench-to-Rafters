// Round 39: Front Office is archived (git tag archive/front-office) and the Floor takes its place as a
// mini-game: its teams and start, its grade, its unlock and bonus, the island, the achievements, and
// old saves that still say 'office'.

import { beforeAll, describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { FLOOR, FLOOR_MINI } from '../src/engine/balance';
import { floorResult, skipFloor, startFloor, type FloorBox } from '../src/engine/floor/sim';
import { leanRatings } from '../src/engine/floor/career';
import { bestStarter, careerMe, floorCareerSetup, floorGrade, floorLineScore, floorMiniResult, floorMiniSetup, floorRoster, floorStart, onNbaTeam } from '../src/engine/floor/mini';
import { canClaimMini, claimMini, floorForOffice as careerFromOffice, MINI_NAMES, miniProgress, miniReward, syncMiniUnlocks, type MiniResult } from '../src/engine/career/miniBonus';
import { addMiniResult, ACHIEVEMENTS_MINI } from '../src/engine/achievementsMini';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { achCatOf } from '../src/engine/achievementCats';
import { ovrOf } from '../src/engine/player/ovr';

const box = (o: Partial<FloorBox> = {}): FloorBox => ({ pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, ...o });
const floor = (o: Partial<Extract<MiniResult, { game: 'floor' }>> = {}): MiniResult => ({ game: 'floor', grade: 'B', margin: 4, pts: 6, low: 0, strength: 'good', ...o });

let pro: GameState;
beforeAll(() => {
  const r = makeRng(390139);
  const s = newGame(390139, { name: 'Nate Ellis', number: 11, pos: 'PG', archetype: 0, focus: ['PLY', 'IQ'], hometown: 'Akron', highSchool: 'North High' });
  s.flags.simPostseason = 1;
  for (let i = 0; i < 6000; i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (s.stage === 'NBA' && s.serviceYears >= 1 && p.type !== 'decision' && s.step === 'offseason') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
  expect(s.stage).toBe('NBA');
  pro = s;
}, 60_000);

describe('the Floor as a mini-game: the teams and the start', () => {
  it('builds a generated team: five starters by position, three off the bench below them', () => {
    const t = floorRoster('U', 76, 1234);
    expect(t.map((p) => p.pos)).toEqual(['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SF', 'C']);
    expect(new Set(t.map((p) => p.id)).size).toBe(8);
    expect(t.some((p) => p.user)).toBe(false);
    const ovr = t.map((p) => ovrOf(p.r, p.pos));
    for (const v of ovr.slice(0, 5)) expect(Math.abs(v - 76)).toBeLessThanOrEqual(FLOOR_MINI.roster.wobble / 2 + 3);
    expect(ovr.slice(5).reduce((a, b) => a + b, 0) / 3).toBeLessThan(ovr.slice(0, 5).reduce((a, b) => a + b, 0) / 5);
    // the same seed, the same team
    expect(floorRoster('U', 76, 1234)).toEqual(t);
  });
  it('marks the starter he steers, or puts his own player in a spot (the Floor lab too)', () => {
    const t = floorRoster('U', 76, 99, { slot: 3 });
    expect(t.filter((p) => p.user).map((p) => p.pos)).toEqual(['PF']);
    expect(t[3].name).toBe(floorRoster('U', 76, 99)[3].name);
    const me = floorRoster('U', 76, 99, { slot: 1, name: 'Jordan Vale', number: 23, r: leanRatings(92, 'SG') });
    expect(me[1]).toMatchObject({ name: 'Jordan Vale', number: 23, user: true, pos: 'SG' });
    expect(me[1].r).toEqual(leanRatings(92, 'SG'));
  });
  it('steers the best starter unless he picks another', () => {
    const t = floorRoster('U', 82, 4321);
    const i = bestStarter(t);
    for (const p of t.slice(0, 5)) expect(ovrOf(p.r, p.pos)).toBeLessThanOrEqual(ovrOf(t[i].r, t[i].pos));
  });
  it('starts close, from the seed, with six minutes left on the standard difficulty', () => {
    const S = FLOOR_MINI.start;
    for (let seed = 1; seed < 200; seed++) {
      const [us, them] = floorStart(seed);
      expect(Math.abs(us - them)).toBeLessThanOrEqual(S.gap);
      expect(Math.abs(them - S.base)).toBeLessThanOrEqual(S.spread);
    }
    expect(floorStart(77)).toEqual(floorStart(77));
    const set = floorMiniSetup({ seed: 5, roster: 8, us: 'MIN', them: 'BOS', strength: 'great', slot: 2 });
    expect(set.mode).toBe('standard');
    expect(set.clock).toBe(FLOOR.from);
    expect(set.us.short).toBe('MIN');
    expect(set.them.name).toBe('Boston Celtics');
    expect(set.us.players.filter((p) => p.user).map((p) => p.pos)).toEqual(['SF']);
    // a rematch from a new seed keeps the players
    expect(floorMiniSetup({ seed: 6, roster: 8, us: 'MIN', them: 'BOS', strength: 'great', slot: 2 }).us.players).toEqual(set.us.players);
  });
  it('plays to a result the grade reads', () => {
    const st = startFloor(floorMiniSetup({ seed: 11, roster: 11, us: 'LAL', them: 'DEN', strength: 'good', slot: 0 }));
    skipFloor(st);
    const out = floorResult(st);
    expect(out.us).not.toBe(out.them);
    const r = floorMiniResult(out, 'good');
    expect(r).toMatchObject({ game: 'floor', margin: out.us - out.them, pts: out.line.pts, strength: 'good', grade: floorGrade(out.us, out.them, out.line).grade });
    expect(r.low).toBeLessThanOrEqual(Math.min(r.margin, floorStart(11)[0] - floorStart(11)[1]));
  });
  it('in a career on an NBA team: himself, on his team, against the team he picks', () => {
    expect(onNbaTeam(pro)).toBe(true);
    expect(onNbaTeam(null)).toBe(false);
    const opp = pro.nba!.teams.find((t) => t.id !== pro.teamId)!;
    const set = floorCareerSetup(pro, opp.id, 42);
    expect(set.mode).toBe('standard');
    expect(set.them.name).toBe(opp.name);
    const me = set.us.players.find((p) => p.user)!;
    expect(me.name).toBe(pro.player.name);
    expect(me.pos).toBe(pro.player.pos);
    expect(set.us.players.length).toBe(8);
    // a career off the NBA: his own ratings in his own spot
    const mine = careerMe(pro);
    const off = floorMiniSetup({ seed: 3, roster: 3, us: 'NYK', them: 'MIA', strength: 'average', slot: mine.slot }, mine);
    expect(off.us.players[mine.slot]).toMatchObject({ name: pro.player.name, user: true, r: mine.r });
  }, 30_000);
});

describe('the Floor as a mini-game: the grade and the bonus', () => {
  it('grades the margin, with a little for his line', () => {
    const quiet = box();
    expect(floorGrade(101, 100, quiet).grade).toBe('B');
    expect(floorGrade(108, 100, quiet).grade).toBe('A');
    expect(floorGrade(107, 100, quiet).grade).toBe('B');
    // a big night lifts a win into an A, and a close loss into a C, never a loss past C
    const big = box({ pts: 14, reb: 4, ast: 4 });
    expect(floorLineScore(big)).toBeCloseTo(14 + 4 * 0.4 + 4 * 0.7, 6);
    expect(floorGrade(105, 100, big)).toEqual({ grade: 'A', share: FLOOR_MINI.cap });
    expect(floorGrade(97, 100, quiet).grade).toBe('C');
    expect(floorGrade(96, 100, quiet).grade).toBe('D');
    expect(floorGrade(95, 100, big).grade).toBe('C');
    expect(floorGrade(100, 101, box({ pts: 40 })).grade).toBe('C');
    // turnovers take some away
    expect(floorGrade(97, 100, box({ tov: 4 })).grade).toBe('D');
    expect(floorGrade(100, 101, box({ tov: 30 })).share).toBe(-FLOOR_MINI.cap);
  });
  it('opens at basketball IQ 85, where Front Office did, and pays IQ and a little playmaking', () => {
    const s = structuredClone(pro);
    s.miniOpen = [];
    s.player.attrs.IQ = 84;
    expect(miniProgress(s, 'floor')).toMatchObject({ at: 85, label: 'Basketball IQ', open: false });
    s.player.attrs.IQ = 85;
    expect(syncMiniUnlocks(s)).toContain(MINI_NAMES.floor);
    expect(MINI_NAMES.floor).toBe('The Floor');
    expect(miniReward(floor({ grade: 'A' })).attrs).toEqual(FLOOR_MINI.reward.A);
    expect(miniReward(floor({ grade: 'B' })).attrs).toEqual(FLOOR_MINI.reward.B);
    expect(miniReward(floor({ grade: 'D' })).attrs).toEqual({});
    // an A pays Front Office's title run: 3 IQ and 1.5 playmaking
    expect(FLOOR_MINI.reward.A).toEqual({ IQ: 3, PLY: 1.5 });
    const before = { ...s.player.attrs };
    s.flags.miniClaims = 0;
    expect(canClaimMini(s, 'floor')).toBe(true);
    expect(claimMini(s, floor({ grade: 'A' }))).not.toBe('');
    expect(s.player.attrs.IQ).toBeGreaterThan(before.IQ);
    expect(s.miniLog!.at(-1)!.game).toBe('floor');
  }, 30_000);
});

describe('the Floor as a mini-game: the island and old saves', () => {
  it('grades the island with its own grade; a C is a loss by three on a quiet night', async () => {
    const { roadGrade, passGrade, ROAD_MINIS, ROAD_NEED } = await import('../src/ui/road');
    expect(ROAD_MINIS).toContain('floor');
    expect(ROAD_MINIS).not.toContain('office' as never);
    expect(roadGrade(floor({ grade: 'C' }))).toBe('C');
    expect(passGrade(roadGrade(floor({ grade: 'D' })))).toBe(false);
    expect(ROAD_NEED.floor).toBe(`lose by ${-FLOOR_MINI.grade.C} or less`);
  });
  it('reads a career saved with Front Office as one with the Floor', () => {
    const s = structuredClone(pro);
    s.miniOpen = ['threes', 'office' as never, 'floor'];
    s.miniLog = [{ game: 'office' as never, year: s.year, gain: 0.4 }, { game: 'dunk', year: s.year, gain: 0.2 }];
    careerFromOffice(s);
    expect(s.miniOpen).toEqual(['threes', 'floor']);
    expect(s.miniLog.map((c) => c.game)).toEqual(['floor', 'dunk']);
    expect(miniProgress(s, 'floor').open).toBe(true);
  }, 30_000);
  it('carries the island’s Front Office grade to the Floor, the better of the two', async () => {
    const { floorForOffice, islandDone } = await import('../src/ui/road');
    expect(floorForOffice({ threes: 'A', office: 'C' } as never)).toEqual({ threes: 'A', floor: 'C' });
    expect(floorForOffice({ office: 'B', floor: 'D' } as never)).toEqual({ floor: 'B' });
    expect(floorForOffice({ office: 'D', floor: 'A' } as never)).toEqual({ floor: 'A' });
    expect(floorForOffice({ dunk: 'B' })).toEqual({ dunk: 'B' });
    const minis = floorForOffice({ threes: 'C', dunk: 'C', street: 'C', legends: 'C', lab: 'C', rhythm: 'C', office: 'C' } as never);
    expect(islandDone({ passed: {}, minis })).toBe(true);
  });
  it('keeps old arcade totals and book entries from breaking anything', () => {
    // a device's totals from before: Front Office runs under 'office', and its two achievements earned
    const old = { runs: { office: 3, threes: 2, dunk: 1, legends: 1, lab: 1, street: 1, rhythm: 1 }, best: { office: 2 }, wins: { office: 2 } } as never;
    const got = earnedNow(null, { ...NO_TOTALS, mini: old });
    expect(got).toContain('mg-first');
    // every game once now means the Floor too
    expect(got).not.toContain('mg-all');
    const after = addMiniResult(old, floor({ grade: 'D', margin: -9 }));
    expect(earnedNow(null, { ...NO_TOTALS, mini: after })).toContain('mg-all');
    expect(after.runs).toMatchObject({ office: 3, floor: 1 });
    // ids the book no longer has are counted nowhere
    const book: Record<string, unknown> = { 'mg-office': {}, 'mg-office3': {}, 'mg-first': {} };
    expect(ACHIEVEMENTS.filter((a) => book[a.id]).map((a) => a.id)).toEqual(['mg-first']);
    expect(ACHIEVEMENTS.some((a) => a.id.startsWith('mg-office'))).toBe(false);
  });
});

describe('the Floor as a mini-game: the achievements', () => {
  it('counts its own marks from each finished game', () => {
    let m = addMiniResult(undefined, floor({ grade: 'A', margin: 12, pts: 21, low: -9, strength: 'great' }));
    m = addMiniResult(m, floor({ grade: 'B', margin: 3, pts: 8, strength: 'average' }));
    m = addMiniResult(m, floor({ grade: 'D', margin: -8, pts: 2, low: -10, strength: 'good' }));
    expect(m.runs.floor).toBe(3);
    expect(m.wins.floor).toBe(2);
    expect(m.best.floor).toBe(12);
    expect(m.floor).toEqual({ pts: 21, back: 1, beat: ['great', 'average'], a: 1 });
    const got = earnedNow(null, { ...NO_TOTALS, mini: m });
    expect(got).toEqual(expect.arrayContaining(['mg-floor', 'mg-floor-win', 'mg-floor-big', 'mg-floor-back', 'mg-floor-pts12', 'mg-floor-pts20', 'mg-floor-a']));
    expect(got).not.toContain('mg-floor-every');
    expect(got).not.toContain('mg-floor-home');
    m = addMiniResult(m, floor({ margin: 1, strength: 'good' }));
    m = addMiniResult(m, floor({ margin: 2, strength: 'team' }));
    const more = earnedNow(null, { ...NO_TOTALS, mini: m });
    expect(more).toEqual(expect.arrayContaining(['mg-floor-every', 'mg-floor-home']));
    // other games keep the Floor's marks
    expect(addMiniResult(m, { game: 'rhythm', grade: 'A' }).floor).toEqual(m.floor);
  });
  it('are filed with the mini-games, with names of their own, apart from the career’s Floor ones', () => {
    const mine = ACHIEVEMENTS_MINI.filter((a) => a.id.startsWith('mg-floor'));
    expect(mine.length).toBeGreaterThanOrEqual(14);
    for (const a of mine) expect(achCatOf(a.id), a.id).toBe('arcade');
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
