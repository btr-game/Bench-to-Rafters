// Round 36 balance (owner: "let's make the aging curve diverge a little ... still be in the 6~70s
// range at 50", "set the bar a bit higher" for All-Star and MVP, and two career changers: "next
// step" and "career ending injury", "make the chances of these extremely low").

import { afterEach, describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/flow';
import { ALL_STAR_BAR, DECLINE_TABLE, GEN_DECLINE_TABLE, LEVELS, MVP_BAR, OFFSEASON_DAYS, SWINGS } from '../src/engine/balance';
import { legendMult } from '../src/engine/player/growth';
import { rollSwings } from '../src/engine/career/swings';
import { buildCandidates } from '../src/engine/awards/awards';
import { ovrOf } from '../src/engine/player/ovr';
import type { GameState } from '../src/engine/types';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High', mode: 'standard' as const };
const saved = { leap: SWINGS.leap.chance, next: SWINGS.nextStep.chance, tragedy: SWINGS.tragedy.chance };
afterEach(() => {
  SWINGS.leap.chance = saved.leap;
  SWINGS.nextStep.chance = saved.next;
  SWINGS.tragedy.chance = saved.tragedy;
});
const pro = (age: number): GameState => {
  const g = newGame(36, input);
  g.player.age = age;
  g.stage = 'NBA';
  return g;
};

describe('aging that diverges', () => {
  it('slows the decline for greatness only, and leaves the league as it was', () => {
    const at = (peakOvr: number) => legendMult({ ...newGame(1, input).player, peakOvr });
    expect(at(75)).toBe(1);
    expect(at(82)).toBe(1);
    expect(at(90)).toBeCloseTo(0.68, 9);
    expect(at(95)).toBeCloseTo(0.48, 9);
    expect(at(99)).toBe(0.4);
    // the generated players keep the table they had
    expect(GEN_DECLINE_TABLE).toEqual([-1.2, -2.0, -2.8, -3.6, -4.5, -5.5]);
    expect(DECLINE_TABLE).toEqual(GEN_DECLINE_TABLE);
  });
});

describe('a higher bar for him', () => {
  it('names him an All-Star only from the top six of his conference', () => {
    expect(ALL_STAR_BAR.userTop).toBe(6);
  });

  it('asks the MVP voters for a clear case, and a clearer one after each MVP', () => {
    const team = { id: 'T', name: 'T', short: 'T', abbr: 'T', color: '#123456', conf: 'East', strength: 70, w: 50, l: 32, roster: [] };
    const line = { gp: 70, gs: 70, min: 2400, pts: 2000, reb: 500, ast: 400, stl: 80, blk: 40, tov: 200, fgm: 700, fga: 1400, tpm: 150, tpa: 400, ftm: 450, fta: 520, pf: 150 } as never;
    const user = (mvpWins: number) => ({ name: 'Me', teamId: 'T', line, firstHalfLine: line, rep: 80, rookie: false, per: 70, int: 70, prevValue: null, age: 27, ovr: 90, mvpWins });
    const league = { teams: [team] } as never;
    expect(buildCandidates(league, user(0))[0].mvpBar).toBe(MVP_BAR.margin);
    expect(buildCandidates(league, user(2))[0].mvpBar).toBe(MVP_BAR.margin + 2 * MVP_BAR.fatigue);
  });
});

describe('the career changers', () => {
  it('the next step: from 25, a big jump and a higher ceiling, once a career', () => {
    SWINGS.leap.chance = 0;
    SWINGS.nextStep.chance = 1;
    SWINGS.tragedy.chance = 0;
    const g = pro(24);
    rollSwings(g);
    expect(g.flags.nextStep, 'not before 25').toBeUndefined();
    g.player.age = 27;
    const before = ovrOf(g.player.attrs, g.player.pos);
    const pot = g.player.potential;
    rollSwings(g);
    expect(g.flags.nextStep).toBe(g.year);
    expect(ovrOf(g.player.attrs, g.player.pos) - before).toBeGreaterThan(5);
    expect(g.player.potential).toBeGreaterThan(pot);
    const once = ovrOf(g.player.attrs, g.player.pos);
    rollSwings(g);
    expect(ovrOf(g.player.attrs, g.player.pos), 'only once').toBe(once);
  });

  it('the career-altering injury: a season or two out, the ratings and the ceiling fall hard', () => {
    SWINGS.leap.chance = 0;
    SWINGS.nextStep.chance = 0;
    SWINGS.tragedy.chance = 1;
    const g = pro(27);
    const before = ovrOf(g.player.attrs, g.player.pos);
    const pot = g.player.potential;
    rollSwings(g);
    expect(g.flags.careerInjury).toBe(g.year);
    expect(before - ovrOf(g.player.attrs, g.player.pos)).toBeGreaterThan(8);
    expect(pot - g.player.potential).toBeGreaterThanOrEqual(SWINGS.tragedy.potential[0]);
    const one = OFFSEASON_DAYS + LEVELS.NBA.seasonDays;
    expect([one - 5, 2 * one - 5]).toContain(g.player.injury?.daysOut);
  });

  it('keeps both extremely rare', () => {
    expect(saved.next).toBeLessThanOrEqual(0.002);
    expect(saved.tragedy).toBeLessThanOrEqual(0.001);
  });
});
