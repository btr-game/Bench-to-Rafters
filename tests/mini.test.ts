// Round 10: the mini-games.

import { describe, expect, it } from 'vitest';
import { FRANCHISE_FIVES } from '../src/content/franchiseFives';
import { NBA_TEAMS } from '../src/content/teams';
import { growRookie, newLegends, playNext, playSeason } from '../src/engine/mini/legends';
import * as F from '../src/engine/mini/frontOffice';
import { contestRng, simRound, shotResult, zoneWidth } from '../src/engine/mini/threes';

describe('mini-games', () => {
  it('every franchise has an all-time five, one per position, and nobody plays for two teams', () => {
    const names = Object.values(FRANCHISE_FIVES).flat().map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of NBA_TEAMS) expect(FRANCHISE_FIVES[t.abbr].map((p) => p.pos)).toEqual(['PG', 'SG', 'SF', 'PF', 'C']);
    expect(FRANCHISE_FIVES.CLE.some((p) => p.name === 'LeBron James')).toBe(true);
  });

  it('a legends run grows a super-rookie into the five, then plays a season and the playoffs', () => {
    const st = newLegends(42, 'LAL', 'Sam Star', 'Elgin Baylor');
    expect(st.phase).toBe('grow');
    for (let i = 0; i < 4; i++) growRookie(st, 'defense');
    expect(st.phase).toBe('season');
    const five = st.teams.find((t) => t.id === 'LAL')!.five;
    expect(five.some((p) => p.rookie && p.name === 'Sam Star')).toBe(true);
    expect(five.length).toBe(5);
    expect(st.rookie.ovr).toBeGreaterThan(80);
    playSeason(st);
    for (let i = 0; i < 4 && st.phase === 'plan'; i++) playNext(st, 'star');
    expect(st.phase).toBe('over');
    expect(st.champion).toBeTruthy();
    expect(st.rounds.length).toBe(4);
  });

  it('a front office run drafts, deals and plays seasons, and the scouts never invent a ceiling below the floor', () => {
    const fo = F.newFrontOffice(7, 'BOS');
    expect(fo.phase).toBe('draft');
    for (const c of fo.draft!.cls) {
      const r = F.prospectReport(c);
      expect(r.ceiling[1]).toBeGreaterThanOrEqual(r.now[1]);
    }
    for (let guard = 0; guard < 100 && fo.phase !== 'over'; guard++) {
      if (fo.phase === 'draft') F.draftPlayer(fo, fo.draft!.cls.findIndex((c) => !c.takenBy));
      else if (fo.phase === 'market') F.toTactics(fo);
      else if (fo.phase === 'tactic') F.playSeason(fo, 'depth');
      else if (fo.phase === 'results') F.nextSeason(fo);
    }
    expect(fo.phase).toBe('over');
    expect(fo.history.length).toBeGreaterThanOrEqual(3);
    expect(F.grade(fo).letter).toBeTruthy();
  });

  it('three-point contest: simulated scores look like real contests, and a dead-centre stop is a swish', () => {
    const r = contestRng(3);
    let sum = 0;
    for (let i = 0; i < 400; i++) sum += simRound(r, 95);
    expect(sum / 400).toBeGreaterThan(19);
    expect(sum / 400).toBeLessThan(26);
    expect(shotResult(r, 0.5, zoneWidth(90, 0))).toBe('swish');
    expect(shotResult(r, 0.02, zoneWidth(90, 0))).toBe('miss');
  });
});
