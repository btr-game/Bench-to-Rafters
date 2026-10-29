// Round 15: OVR weights, mini-game unlocks, legends chemistry, ring chasers, trade results,
// the lab mini-game's difficulty.

import { describe, expect, it } from 'vitest';
import { ATTRS, OVR_WEIGHTS, POSITIONS } from '../src/engine/balance';
import { newGame } from '../src/engine/flow';
import { miniProgress, syncMiniUnlocks } from '../src/engine/career/miniBonus';
import { chemistryOf, legendTeams, newLegendsCareer } from '../src/engine/mini/legends';
import { becomeRingChaser, CHASER_ROLES, chaserRoleFor } from '../src/engine/career/ringChase';
import { labBestSpend, labPlaySeason, newLabGame } from '../src/engine/mini/labGame';
import { reclassify } from '../src/engine/player/classify';

const game = (seed = 3) => newGame(seed, { name: 'Round Fifteen', number: 15, pos: 'SF', archetype: 0, focus: ['PER', 'REB'] });

describe('round 15', () => {
  it('OVR weights still sum to 1 and scoring carries less of them', () => {
    for (const pos of POSITIONS) {
      const w = OVR_WEIGHTS[pos];
      expect(ATTRS.reduce((t, k) => t + w[k], 0)).toBeCloseTo(1, 6);
      expect(w.SHT + w.FIN + w.ATH).toBeLessThanOrEqual(0.5);
    }
  });

  it('mini-games unlock by rating in a career and stay open', () => {
    const s = game();
    expect(miniProgress(s, 'threes').open).toBe(false);
    s.player.attrs.SHT = 86;
    syncMiniUnlocks(s);
    expect(s.miniOpen).toContain('threes');
    s.player.attrs.SHT = 70; // aging does not lock it again
    expect(miniProgress(s, 'threes').open).toBe(true);
    expect(miniProgress(s, 'legends').open).toBe(false);
  });

  it('legends chemistry: a fitting role helps, a crowded one hurts, and your player joins the five', () => {
    const lal = legendTeams().find((t) => t.id === 'LAL')!;
    const fit = chemistryOf('LAL', lal.five, { pos: 'SF', tag: 'shooter' }, 'Magic Johnson');
    const crowd = chemistryOf('LAL', lal.five, { pos: 'SF', tag: 'scorer' }, 'Magic Johnson');
    expect(fit.value).toBeGreaterThan(crowd.value);
    const st = newLegendsCareer(7, 'LAL', { name: 'Me', pos: 'SF', ovr: 92, tag: 'shooter' }, 'Magic Johnson');
    expect(st.career).toBe(true);
    expect(st.phase).toBe('season');
    expect(st.teams.find((t) => t.id === 'LAL')!.five.some((p) => p.name === 'Me')).toBe(true);
  });

  it('a ring chaser sharpens his best skill, gives up what the role does not need, and keeps the role', () => {
    const s = game(11);
    s.player.attrs.PER = 90;
    s.player.attrs.INT = 88;
    expect(chaserRoleFor(s)).toBe(CHASER_ROLES.stopper);
    const before = { ...s.player.attrs };
    s.nba = { teams: [] } as never;
    const d = becomeRingChaser(s);
    expect(s.player.attrs.PER).toBeGreaterThan(before.PER);
    expect(s.player.attrs.ATH).toBeGreaterThanOrEqual(before.ATH); // a defender keeps his legs
    expect(s.player.archetype).toBe('Defensive specialist');
    expect(d.kind).toBe('offers');
    expect(reclassify(s.player)).toBe('');
    expect(s.player.archetype).toBe('Defensive specialist');
  });

  it('Built in a lab: best-value play reaches the high 80s', () => {
    let sum = 0;
    for (let i = 0; i < 40; i++) {
      const st = newLabGame(500 + i, 'X', (['PG', 'SG', 'SF', 'PF', 'C'] as const)[i % 5], 78);
      while (!st.over) {
        labBestSpend(st);
        labPlaySeason(st);
      }
      sum += st.peak;
    }
    expect(sum / 40).toBeGreaterThan(87);
  });
});
