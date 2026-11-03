// Round 24: achievements, the career record, longevity and the roster around him.

import { describe, expect, it } from 'vitest';
import { runCareer } from '../scripts/harness';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { newGame, prompt, choose, advance } from '../src/engine/flow';
import { careerRecord } from '../src/engine/career/record';
import { ageCeiling } from '../src/engine/player/growth';
import { POSITIONS, RETIRE, ROSTER_FIT } from '../src/engine/balance';
import { fiveOf, rosterAttrs, rosterFit } from '../src/engine/career/roster';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { ovrOf } from '../src/engine/player/ovr';
import type { GenPlayer, League, Pos, Team } from '../src/engine/types';

describe('achievements', () => {
  it('have unique ids and names, and a few hundred of them in five tiers', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    const names = new Set(ACHIEVEMENTS.map((a) => a.name));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    expect(names.size).toBe(ACHIEVEMENTS.length);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(200);
    expect(new Set(ACHIEVEMENTS.map((a) => a.tier)).size).toBe(5);
  });

  it('check whole careers without throwing, and count careers from the totals alone', () => {
    for (const seed of [11, 12, 13]) {
      const s = newGame(seed, { name: 'Ach Test', number: 8, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'] });
      for (let i = 0; i < 4000; i++) {
        const pr = prompt(s);
        if (pr.type === 'retired') break;
        if (pr.type === 'decision') choose(s, pr.decision.choices.find((c) => !c.disabled)!.id);
        else advance(s);
        if (i % 50 === 0) expect(Array.isArray(earnedNow(s, NO_TOTALS))).toBe(true);
      }
      const got = earnedNow(s, { ...NO_TOTALS, finished: 3 });
      expect(got).toContain('c1');
      expect(got).toContain('c3');
      // the record for the career log keeps the card's numbers
      const rec = careerRecord(s);
      expect(rec.name).toBe('Ach Test');
      expect(rec.peak).toBeGreaterThan(0);
    }
    expect(earnedNow(null, { ...NO_TOTALS, finished: 10, daily: 7 })).toEqual(expect.arrayContaining(['c10', 'daily7']));
  });
});

describe('longevity', () => {
  // round 36: softer (it was 85 at 40, 50 at 50)
  it('has an age ceiling of 90 at 37, about 85 at 40 and 68 at 50, and nobody plays past 50', () => {
    expect(ageCeiling(36)).toBe(99);
    expect(ageCeiling(37)).toBe(90);
    expect(ageCeiling(40)).toBeCloseTo(84.9, 9);
    expect(ageCeiling(50)).toBeCloseTo(67.9, 9);
    expect(RETIRE.forcedAge).toBe(50);
    for (const seed of [5, 6, 7]) expect(runCareer(seed, 'smart', 'standard').ages.every((a) => a.age <= 50)).toBe(true);
  });
});

describe('the roster around him (career/roster.ts)', () => {
  const gp = (id: number, pos: Pos, shape: number, ovr: number): GenPlayer => ({ id, name: `P${id}`, pos, shape, age: 26, ovr, pot: ovr, height: 78, rep: 0, contractYears: 1, salary: 1 });
  const teamOf = (id: string, roster: GenPlayer[]): Team => ({ id, name: id, short: id, abbr: id, color: '#123456', conf: 'East', strength: 70, w: 0, l: 0, roster });
  const base = () => newGame(5, { name: 'Fit Test', number: 3, pos: 'SF', archetype: 0, focus: ['SHT', 'PER'], mode: 'stars' });
  const bench = (from: number, ovr: number) => [gp(from, 'PG', 0, ovr), gp(from + 1, 'SG', 0, ovr), gp(from + 2, 'PF', 0, ovr), gp(from + 3, 'C', 0, ovr)];

  it('gives roster players ratings that still add up to their OVR', () => {
    for (const pos of POSITIONS)
      ARCHETYPES[pos].forEach((_, shape) => {
        const p = gp(100 + shape, pos, shape, 74);
        expect(Math.abs(ovrOf(rosterAttrs(p), pos) - 74)).toBeLessThan(1.5);
      });
  });

  it('starts one player at each other position, and the rest come off the bench', () => {
    const roster = [gp(1, 'PG', 0, 70), gp(2, 'SG', 0, 71), gp(3, 'PF', 0, 72), gp(4, 'C', 0, 73), gp(5, 'SF', 0, 80), ...bench(10, 60)];
    const five = fiveOf(roster, 'SF');
    expect(five.map((x) => x.slot)).toEqual(['PG', 'SG', 'PF', 'C']);
    expect(five.some((x) => x.p.id === 5)).toBe(false);
  });

  it('rewards a deep bench and a five built for its system, and stays small', () => {
    const s = base();
    // the most defensive archetype at each position
    const stopper = (pos: Pos) => ARCHETYPES[pos].map((a, i) => [a.attrs.PER + a.attrs.INT - a.attrs.SHT - a.attrs.ATH, i]).sort((x, y) => y[0] - x[0])[0][1];
    s.player.attrs = { SHT: 55, FIN: 60, PLY: 55, PER: 92, INT: 90, REB: 72, ATH: 55, IQ: 80 };
    const five = (['PG', 'SG', 'PF', 'C'] as Pos[]).map((pos, i) => gp(i + 1, pos, stopper(pos), 72));
    const deep = teamOf('DEEP', [...five, ...bench(10, 70)]);
    const thin = teamOf('THIN', [...five, ...bench(20, 58)]);
    const league = { level: 'NBA', year: 2030, teams: [deep, thin, teamOf('MID', [...five, ...bench(30, 64)])], userTeamId: 'DEEP', round: 0, rounds: 82, bracket: null } as unknown as League;
    s.teamId = 'DEEP';
    const a = rosterFit(s, deep, league);
    s.teamId = 'THIN';
    const b = rosterFit(s, thin, league);
    expect(a.depth).toBeGreaterThan(b.depth);
    expect(a.bonus).toBeGreaterThan(b.bonus);
    // the same five against the system that wants its peaks, and against one that doesn't
    s.teamId = 'DEEP';
    s.teamStyle = { key: 'defense', teamId: 'DEEP' };
    const d = rosterFit(s, deep, league);
    s.teamStyle = { key: 'pace', teamId: 'DEEP' };
    const p = rosterFit(s, deep, league);
    expect(d.system).toBe('defense');
    expect(d.identity).toBeGreaterThan(p.identity);
    for (const f of [a, b, d, p]) expect(Math.abs(f.bonus)).toBeLessThanOrEqual(ROSTER_FIT.shape * 1.33 + ROSTER_FIT.depth + 0.05);
  });
});
