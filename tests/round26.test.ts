// Round 26: the scouting report's freshman projection (capped at 99, refit to the harness), no
// achievements from the starting draw, Rough Road (Reality, master mode, nothing simplified) and
// the last possession's timed shot.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { scoutReport } from '../src/engine/career/scouting';
import { setFast, setSim } from '../src/engine/fast';
import { careerRecord } from '../src/engine/career/record';
import type { Mode } from '../src/engine/balance';

const make = (seed: number, mode: Mode, extra: Record<string, unknown> = {}): GameState =>
  newGame(seed, { name: 'Test Player', number: 7, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'], hometown: 'Dayton', highSchool: 'Lincoln High', mode, ...extra } as never);

/** Plays smart picks until `stop` says so (or the career ends). */
function playUntil(s: GameState, seed: number, stop: (s: GameState) => boolean): void {
  const r = makeRng(seed);
  for (let i = 0; i < 4000 && !stop(s); i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
}

describe('the freshman scouting report', () => {
  it('never projects past 99 and never shows a range upside down', () => {
    for (const mode of ['standard', 'reality', 'stars'] as Mode[])
      for (const age of [14, 15])
        for (let v = 30; v <= 99; v += 3) {
          const s = make(4000 + v, mode);
          s.player.age = age;
          s.player.scoutRange = null;
          for (const k of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) s.player.attrs[k] = v;
          const r = scoutReport(s);
          expect(r.peakHi, `${mode} ${age} ${v}`).toBeLessThanOrEqual(99);
          expect(r.peakLo, `${mode} ${age} ${v}`).toBeLessThanOrEqual(r.peakHi);
          // nothing is certain until it has happened
          for (const x of Object.values(r.odds)) expect(x).toBeLessThan(1);
        }
  });

  it('projects a 65 OVR freshman in Shoot for the stars in the low 90s, not past 99', () => {
    const s = make(4242, 'stars');
    s.player.age = 15;
    s.player.scoutRange = null;
    for (const k of Object.keys(s.player.attrs) as (keyof typeof s.player.attrs)[]) s.player.attrs[k] = 65;
    const r = scoutReport(s);
    expect((r.peakLo + r.peakHi) / 2).toBeGreaterThan(86);
    expect((r.peakLo + r.peakHi) / 2).toBeLessThan(97);
  });

  it('ticks a milestone only once it is reached', () => {
    const s = make(4243, 'standard');
    s.nbaGames = 10;
    expect(scoutReport(s).odds.nba).toBe(1);
  });
});

describe('achievements', () => {
  it('earns nothing from the starting draw', () => {
    for (let i = 0; i < 30; i++) {
      const s = make(5000 + i, (['standard', 'reality', 'stars'] as Mode[])[i % 3]);
      expect(earnedNow(s, { ...NO_TOTALS })).toEqual([]);
    }
  });

  it('asks Pterodactyl for the wingspan in use, not just the wingspan', () => {
    const s = make(5100, 'standard');
    s.player.wingspan = s.player.height + 9;
    playUntil(s, 5100, (x) => x.history.length > 0);
    const ptero = ACHIEVEMENTS.find((a) => a.id === 'wingspan')!;
    for (const h of s.history) (h.line.blk = 0), (h.line.stl = 0);
    expect(earnedNow(s, { ...NO_TOTALS })).not.toContain(ptero.id);
    s.history[0].line.gp = 20;
    s.history[0].line.blk = 40;
    s.history[0].line.stl = 30;
    expect(earnedNow(s, { ...NO_TOTALS })).toContain(ptero.id);
  });
});

describe('Rough Road', () => {
  it('is a Reality-only promise', () => {
    expect(make(6000, 'reality', { oath: true }).flags.oath).toBe(1);
    expect(make(6001, 'standard', { oath: true }).flags.oath).toBeUndefined();
    expect(make(6002, 'reality').flags.oath).toBeUndefined();
  });

  it('keeps fast break and sim mode off for the whole career', () => {
    const s = make(6003, 'reality', { oath: true });
    setFast(s, true);
    setSim(s, true);
    expect(s.flags.fast).toBeFalsy();
    expect(s.flags.sim).toBeFalsy();
  });

  it('is honoured: its own achievement after a season, and a mark on the career record', () => {
    const s = make(6004, 'reality', { oath: true });
    playUntil(s, 6004, (x) => x.history.length > 0);
    expect(earnedNow(s, { ...NO_TOTALS })).toContain('ns-season');
    const plain = make(6004, 'reality');
    playUntil(plain, 6004, (x) => x.history.length > 0);
    expect(earnedNow(plain, { ...NO_TOTALS })).not.toContain('ns-season');
    expect(careerRecord(s).oath).toBe(true);
    expect(careerRecord(plain).oath).toBeUndefined();
  });
});

describe('the last possession', () => {
  it('takes the timed shot and moves on (round 26: the guide tour used to throw it away in the UI)', () => {
    let found = 0;
    for (let seed = 7000; seed < 7040 && found < 2; seed++) {
      const s = make(seed, 'standard');
      const r = makeRng(seed);
      for (let i = 0; i < 4000 && found < 2; i++) {
        const p = prompt(s);
        if (p.type === 'retired') break;
        if (p.type !== 'decision') {
          advance(s);
          continue;
        }
        const d = p.decision;
        if (d.kind === 'live' && (d.data?.req as { stage: string }).stage === 'clutch') {
          found++;
          const before = d.id;
          choose(s, 'pull@perfect');
          const q = prompt(s);
          expect(q.type === 'decision' ? q.decision.id : 'moved on').not.toBe(before);
          continue;
        }
        choose(s, d.kind === 'live' ? (d.choices.find((c) => c.id === 'play' || c.id === 'steady') ?? d.choices[0]).id : smartChoice(s, d, r));
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});
