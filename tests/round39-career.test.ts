// Round 39, step 5: the Floor in a career. A game that can end his team's series, from the
// conference finals on, plays its last six minutes on the Floor; the result comes back as a pick.

import { beforeAll, describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { NeedLive, playLiveGame, type LiveGameArgs, type LiveRequest } from '../src/engine/career/live';
import { expected } from '../src/engine/sim/statModel';
import { userProfile } from '../src/engine/career/season';
import { floorDone, floorPick, floorSetup, hisRatings, type FloorTake } from '../src/engine/floor/career';
import { floorDue } from '../src/engine/floor/due';
import { FLOOR } from '../src/engine/balance';
import type { FloorPlayerIn } from '../src/engine/floor/sim';
import { fastForward, setSim } from '../src/engine/fast';

let pro: GameState;
const copy = (): GameState => structuredClone(pro);

beforeAll(() => {
  const r = makeRng(390039);
  const s = newGame(390039, { name: 'Theo Marsh', number: 8, pos: 'SF', archetype: 1, focus: ['SHT', 'ATH'], hometown: 'Tulsa', highSchool: 'Central High' });
  s.flags.simPostseason = 1;
  for (let i = 0; i < 6000; i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (s.stage === 'NBA' && s.serviceYears >= 2 && p.type !== 'decision' && s.step === 'offseason') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
  expect(s.stage).toBe('NBA');
  pro = s;
}, 60_000);

const oppOf = (s: GameState) => s.nba!.teams.find((t) => t.id !== s.teamId)!;

/** Plays one game, answering every pause with `answer`; the requests it stopped at. */
function play(seed: number, round: string, losses: number, answer: (r: LiveRequest) => string) {
  const base = copy();
  base.rng = makeRng(seed);
  const opp = oppOf(base);
  const args: LiveGameArgs = { e: expected(userProfile(base), 'NBA', 36, 1), started: true, level: 'NBA', my: 72, opp: 72, oppName: opp.name, oppId: opp.id, homeAdv: 1, round, series: { game: 4 + losses, bestOf: 7, wins: 3, losses } };
  const picks: string[] = [];
  const seen: LiveRequest[] = [];
  for (let k = 0; k < 80; k++) {
    const s = structuredClone(base);
    s.live = { picks: [...picks], i: 0, simAll: false, simSeries: null, recent: [] };
    try {
      return { res: playLiveGame(s, args), seen, s };
    } catch (e) {
      if (!(e instanceof NeedLive)) throw e;
      seen.push(e.req);
      picks.push(answer(e.req));
    }
  }
  throw new Error('the game never ended');
}
const auto = (r: LiveRequest) => (r.stage === 'floor' ? 'auto' : r.stage === 'quarter' ? 'steady' : r.stage === 'clutch' ? 'pull@good' : r.side === 'off' ? 'drive' : 'contest');

describe('which games the Floor plays', () => {
  it('is the conference finals and the Finals, one loss from going home', () => {
    expect(floorDue('Conference finals', 3, 7)).toBe(true);
    expect(floorDue('NBA Finals', 3, 7)).toBe(true);
    expect(floorDue('NBA Finals', 2, 7)).toBe(false);
    expect(floorDue('Conference semifinals', 3, 7)).toBe(false);
    expect(floorDue('First round', 3, 7)).toBe(false);
  });
});

describe('the two teams on the court', () => {
  it('puts him in his own spot with his own ratings, eight a side', () => {
    const s = copy();
    const opp = oppOf(s);
    const st = floorSetup(s, { seed: 7, score: [80, 82], oppId: opp.id, home: true, edge: 0 });
    expect(st.us.players).toHaveLength(8);
    expect(st.them.players).toHaveLength(8);
    const me = st.us.players.filter((p) => p.user);
    expect(me).toHaveLength(1);
    expect(me[0].pos).toBe(s.player.pos);
    // his ratings move with his team's, so he stands out from his teammates as much as he does
    const own = hisRatings(s);
    const d = me[0].r.SHT - own.SHT;
    for (const k of ['FIN', 'PLY', 'PER', 'IQ'] as const) if (own[k] + d >= 25 && own[k] + d <= 99) expect(Math.abs(me[0].r[k] - own[k] - d)).toBeLessThanOrEqual(1);
    expect(me[0].r.FT).toBe(own.FT);
    expect(st.us.players.slice(0, 5).map((p) => p.pos)).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(st.them.name).toBe(opp.name);
    expect(st.score).toEqual([80, 82]);
    expect(st.clock).toBe(FLOOR.from);
  });

  it('centres both fives on their midpoint, split by the gap the career sees between the teams', () => {
    const s = copy();
    const opp = oppOf(s);
    const level = (ps: FloorPlayerIn[]) => ps.slice(0, 5).reduce((n, p) => n + (p.r.SHT + p.r.FIN + p.r.PLY + p.r.PER + p.r.INT + p.r.REB + p.r.ATH + p.r.IQ) / 8, 0) / 5;
    for (const edge of [0, 3, -4]) {
      const st = floorSetup(s, { seed: 7, score: [80, 82], oppId: opp.id, home: true, edge });
      expect(level(st.us.players) - level(st.them.players)).toBeCloseTo(edge, 0);
    }
  });
});

describe('the result as a pick', () => {
  it('carries the score, his line and the marks there and back', () => {
    const s = copy();
    const take: FloorTake = { seed: 11, score: [90, 94], oppId: oppOf(s).id, home: false, edge: 0 };
    const line = { pts: 9, reb: 2, ast: 1, stl: 1, blk: 0, fgm: 3, fga: 6, tpm: 1, tpa: 3, ftm: 2, fta: 2, tov: 1, pf: 2 };
    const pick = floorPick({ us: 104, them: 101, line, marks: { low: -11, winner: true, stop: false } });
    expect(pick.split('@')[0]).toBe('floor');
    const done = floorDone(s, take, pick);
    expect(done).toEqual({ us: 104, them: 101, line, marks: { low: -11, winner: true, stop: false } });
  });

  it('has the engine play the six minutes for "auto", the same way every time', () => {
    const s = copy();
    const take: FloorTake = { seed: 23, score: [88, 88], oppId: oppOf(s).id, home: true, edge: 1.5 };
    const a = floorDone(s, take, 'auto');
    const b = floorDone(s, take, 'auto');
    expect(a).toEqual(b);
    expect(a.us).toBeGreaterThan(88);
    expect(a.them).toBeGreaterThan(88);
    expect(a.us).not.toBe(a.them);
  });
});

describe('a game the Floor plays', () => {
  it('asks nothing for the first three quarters, then hands over the last six minutes', () => {
    let floored = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const { res, seen, s } = play(seed, 'Conference finals', 3, auto);
      const f = seen.filter((r) => r.stage === 'floor');
      expect(f).toHaveLength(1);
      floored++;
      expect(seen.some((r) => r.stage === 'quarter' || r.stage === 'crunch' || r.stage === 'clutch')).toBe(false);
      const r = f[0];
      expect(r.floor).toBeDefined();
      expect(r.choices.map((c) => c.id)).toEqual(['auto', 'floor']);
      expect(r.floor!.score).toEqual([r.us, r.them]);
      // the result is the Floor's
      const want = floorDone(s, r.floor!, 'auto');
      expect(res.us).toBe(want.us);
      expect(res.them).toBe(want.them);
      expect(res.win).toBe(want.us > want.them);
      expect(s.flags.floor).toBe((pro.flags.floor ?? 0) + 1);
      // simulated: counted as a Floor game, not as one he played
      expect(s.flags.floorPlayed ?? 0).toBe(pro.flags.floorPlayed ?? 0);
      expect(s.flags.floorWon ?? 0).toBe(pro.flags.floorWon ?? 0);
      expect(res.line.min).toBeGreaterThan(30);
    }
    expect(floored).toBe(12);
  });

  it('takes a played result exactly as the Floor left it', () => {
    let first: LiveRequest | null = null;
    const line = { pts: 12, reb: 3, ast: 2, stl: 0, blk: 1, fgm: 5, fga: 8, tpm: 2, tpa: 4, ftm: 0, fta: 0, tov: 0, pf: 1 };
    const { res, s } = play(5, 'NBA Finals', 3, (r) => {
      if (r.stage !== 'floor') return auto(r);
      first = r;
      return floorPick({ us: r.us + 15, them: r.them + 9, line, marks: { low: -12, winner: true, stop: true } });
    });
    expect(first).not.toBeNull();
    expect(res.us).toBe(first!.us + 15);
    expect(res.them).toBe(first!.them + 9);
    expect(res.win).toBe(res.us > res.them);
    expect(s.flags.floorPlayed).toBe((pro.flags.floorPlayed ?? 0) + 1);
    expect(s.flags.floorPts).toBe(12);
    if (res.win) {
      expect(s.flags.floorBack).toBe((pro.flags.floorBack ?? 0) + 1);
      expect(s.flags.floorWinner).toBe((pro.flags.floorWinner ?? 0) + 1);
      expect(s.flags.floorStop).toBe((pro.flags.floorStop ?? 0) + 1);
    }
  });

  it('leaves the other games as they were', () => {
    for (let seed = 1; seed <= 6; seed++) {
      expect(play(seed, 'Conference finals', 2, auto).seen.some((r) => r.stage === 'floor')).toBe(false);
      expect(play(seed, 'First round', 3, auto).seen.some((r) => r.stage === 'floor')).toBe(false);
    }
  });
});

describe('sim mode', () => {
  it('simulates the postseason but stops for each game the Floor plays: play it or simulate it', () => {
    const s = copy();
    s.mode = 'stars';
    setSim(s, true);
    const r = makeRng(39);
    let asked: LiveRequest | null = null;
    for (let i = 0; i < 4000 && !asked; i++) {
      const p = prompt(s);
      if (p.type === 'retired') break;
      if (p.type === 'decision') {
        if (p.decision.kind === 'live') {
          asked = p.decision.data?.req as LiveRequest;
          break;
        }
        choose(s, smartChoice(s, p.decision, r));
      } else advance(s);
      fastForward(s);
    }
    expect(asked).not.toBeNull();
    expect(asked!.stage).toBe('game');
    expect(asked!.floorGame).toBe(true);
    expect(floorDue(asked!.round, asked!.losses, asked!.bestOf)).toBe(true);
    expect(asked!.choices.map((c) => c.id)).toEqual(['play', 'sim']);
    // playing it goes straight to the Floor; its result plays on to the next stop
    choose(s, 'play');
    const p = prompt(s);
    expect(p.type === 'decision' && p.decision.kind === 'live' && (p.decision.data?.req as LiveRequest).stage).toBe('floor');
    const before = s.flags.floor ?? 0;
    choose(s, 'auto');
    fastForward(s);
    const next = s.postSnap ? (s.pending[0]?.data?.req as LiveRequest | undefined) : undefined;
    if (next) expect(next.floorGame || next.stage === 'floor').toBe(true);
    else expect(s.flags.floor).toBe(before + 1);
  }, 120_000);
});
