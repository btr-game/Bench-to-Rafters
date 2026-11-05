// Round 10: the mini-games.

import { describe, expect, it } from 'vitest';
import { FRANCHISE_FIVES } from '../src/content/franchiseFives';
import { NBA_TEAMS } from '../src/content/teams';
import { growRookie, newLegends, playNext, playSeason } from '../src/engine/mini/legends';
import { contestRng, simRound, shotResult, zoneWidth } from '../src/engine/mini/threes';
import { canClaimMini, claimMini, claimsUsed, MINI_CLAIMS, MINI_REWARD_MULT, miniReward, taperAt } from '../src/engine/career/miniBonus';
import { labBestSpend, labBuy, labPlaySeason, labSpreadSpend, LAB_GAME, newLabGame } from '../src/engine/mini/labGame';
import { newStreet, runDefense, runOffense, STREET, streetResult } from '../src/engine/mini/streetball';
import { accuracy, gradeOf, judgeAt, makeChart, PATTERNS } from '../src/engine/mini/rhythm';
import { bailOut, contestRng as dunkRng, DUNKERS, dunkDifficulty, dunkTaps, judge, MOVES, movesLeft, simDunks, tapQuality, type DunkDesign } from '../src/engine/mini/dunk';
import { newGame } from '../src/engine/flow';
import { modeDial } from '../src/engine/balance';

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

describe('mini-game career bonuses', () => {
  it('pays two claims a season, the second at half value, tapered near the top, and as credits in the lab', () => {
    const s = newGame(31, { name: 'Bo Nus', number: 1, pos: 'SG', archetype: 0, focus: ['SHT', 'IQ'] });
    // round 15: the three-point contest opens at shooting 85
    expect(canClaimMini(s, 'threes')).toBe(false);
    s.player.attrs.SHT = 86;
    const sht = s.player.attrs.SHT;
    const top = miniReward({ game: 'threes', score: 27, won: true, own: true }).attrs.SHT!;
    expect(top).toBe(4);
    expect(canClaimMini(s, 'threes')).toBe(true);
    claimMini(s, { game: 'threes', score: 27, won: true, own: true });
    // Regular guy turns the rating part down (round 14)
    const dial = modeDial(s.mode, 'mini') * MINI_REWARD_MULT;
    expect(modeDial(s.mode, 'mini')).toBeLessThan(1);
    expect(s.player.attrs.SHT).toBeCloseTo(sht + Math.round(top * dial * taperAt(sht) * 10) / 10, 6);
    const mid = s.player.attrs.SHT;
    claimMini(s, { game: 'threes', score: 27, won: true, own: true });
    expect(s.player.attrs.SHT).toBeCloseTo(mid + Math.round(top * MINI_CLAIMS.share[1] * dial * taperAt(mid) * 10) / 10, 6);
    expect(claimsUsed(s)).toBe(MINI_CLAIMS.perSeason);
    expect(canClaimMini(s, 'legends')).toBe(false);
    expect(claimMini(s, { game: 'threes', score: 30, won: true, own: true })).toBe('');
    expect(taperAt(96)).toBeLessThan(taperAt(91));
    expect(taperAt(91)).toBeLessThan(taperAt(70));
    s.year += 1;
    expect(canClaimMini(s, 'threes')).toBe(true);
    const lab = newGame(32, { name: 'La B', number: 1, pos: 'SG', archetype: 0, focus: [], mode: 'lab' });
    const iq = lab.player.attrs.IQ;
    expect(claimMini(lab, { game: 'legends', reached: 'champion' })).toBe(''); // locked until OVR 90
    lab.miniOpen = ['legends'];
    claimMini(lab, { game: 'legends', reached: 'champion' });
    expect(lab.player.attrs.IQ).toBe(iq);
    expect(lab.player.lab!.credits).toBeCloseTo(4.5 * MINI_REWARD_MULT, 6);
  });
});

describe('round 12 mini-games', () => {
  it('a lab run lasts ten seasons; spending on what matters beats spreading it evenly', () => {
    const run = (spend: (st: ReturnType<typeof newLabGame>) => void, seed: number) => {
      const st = newLabGame(seed, 'Lab Rat', 'PG', 75);
      while (!st.over) {
        spend(st);
        labPlaySeason(st);
      }
      expect(st.history.length).toBe(LAB_GAME.seasons);
      return st.peak;
    };
    let best = 0;
    let even = 0;
    for (let i = 0; i < 40; i++) {
      best += run(labBestSpend, 500 + i) / 40;
      even += run(labSpreadSpend, 500 + i) / 40;
    }
    expect(best).toBeGreaterThan(even + 3);
    expect(best).toBeGreaterThan(84);
    expect(best).toBeLessThan(93);
    const st = newLabGame(9, 'x', 'C', 84);
    const before = st.attrs.INT;
    const c = st.credits;
    expect(labBuy(st, 'INT')).toBe(true);
    expect(st.attrs.INT).toBe(Math.min(99, before + LAB_GAME.step));
    expect(st.credits).toBeCloseTo(c - 1, 6);
  });

  it('a dunk: harder designs score more when landed, and three misses get booed', () => {
    const r = dunkRng(4);
    const easy: DunkDesign = { takeoff: 'stand', moves: ['two'], prop: 'none' };
    const hard: DunkDesign = { takeoff: 'ft', moves: ['360', 'legs'], prop: 'over' };
    expect(dunkDifficulty(hard)).toBe(12);
    expect(dunkTaps(r, hard, 85).length).toBe(5);
    expect(dunkTaps(r, easy, 85).length).toBe(2);
    const t = dunkTaps(r, hard, 85)[0];
    expect(tapQuality(t.centre, t)).toBeCloseTo(1, 6);
    expect(tapQuality(t.centre + t.zone, t)).toBeNull();
    let e = 0;
    let h = 0;
    for (let i = 0; i < 30; i++) {
      e += judge(r, easy, [1, 1], 1, []).total;
      h += judge(r, hard, [0.7, 0.7, 0.7, 0.7, 0.7], 1, []).total;
    }
    expect(h / 30).toBeGreaterThan(e / 30 + 8);
    expect(judge(r, hard, [1, 1, 1, 1, 1], 1, []).total).toBeLessThanOrEqual(50);
    expect(bailOut(r).total).toBeLessThan(e / 30);
  });

  it('streetball is one game to 11, and every play says who had the ball (round 24)', () => {
    const me = { name: 'Ace Walker', FIN: 72, SHT: 70, PLY: 70, ATH: 72, PER: 68, INT: 64, REB: 66 };
    for (let seed = 1; seed <= 40; seed++) {
      const st = newStreet(seed, me, 70);
      let n = 0;
      while (!st.over && n++ < 500) {
        const p = st.ourBall ? runOffense(st, n % 2 ? 'drive' : 'pullup', 'good') : runDefense(st, 'rim');
        expect(p.handler).toBeTruthy();
        expect(p.def).toBeTruthy();
        if (p.side === 'us' && !p.steal) expect(p.handler).toBe(me.name);
      }
      expect(st.over).toBe(true);
      expect(Math.max(st.us, st.them)).toBeGreaterThanOrEqual(STREET.to);
      const r = streetResult(st);
      expect(st.us > st.them ? ['rout', 'win'] : ['close', 'out']).toContain(r);
    }
  });

  it('a dunk move is shown once a contest, by him and by the others (round 24)', () => {
    expect(movesLeft(['legs', '360']).map((m) => m.id)).not.toContain('legs');
    expect(movesLeft([]).length).toBe(MOVES.length);
    // four dunks of two moves each still leave a choice
    expect(MOVES.length).toBeGreaterThanOrEqual(10);
    const r = dunkRng(9);
    for (const d of DUNKERS) {
      const used: string[] = [];
      simDunks(r, d, 2, used);
      simDunks(r, d, 2, used);
      expect(new Set(used).size).toBe(used.length);
    }
  });

  it('Lockdown deals 30 to 60 seconds of varied sets, a press at least every 3 s, and pays defense (round 24)', () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(10);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const c = makeChart(500 + i * 7919);
      expect(c.length).toBeGreaterThanOrEqual(30);
      expect(c.length).toBeLessThanOrEqual(60);
      let prev = 0;
      for (const n of c.notes) {
        expect(n.t - prev).toBeLessThanOrEqual(3);
        prev = Math.max(prev, n.t + n.len);
      }
      c.sets.forEach((x) => seen.add(x.name));
      for (let k = 1; k < c.sets.length; k++) expect(c.sets[k].name).not.toBe(c.sets[k - 1].name);
    }
    expect(seen.size).toBe(PATTERNS.length);
    expect(judgeAt(0.02)).toBe('perfect');
    expect(judgeAt(-0.1)).toBe('good');
    expect(judgeAt(-0.18)).toBe('miss');
    expect(judgeAt(0.3)).toBeNull();
    expect(gradeOf(accuracy({ perfect: 40, good: 0, miss: 0, held: 4, dropped: 0, maxCombo: 44 }))).toBe('S');
    expect(gradeOf(accuracy({ perfect: 0, good: 0, miss: 40, held: 0, dropped: 4, maxCombo: 0 }))).toBe('D');
    const r = miniReward({ game: 'rhythm', grade: 'S' });
    expect((r.attrs.PER ?? 0) + (r.attrs.INT ?? 0)).toBeGreaterThan(0);
    expect(r.attrs.FIN ?? 0).toBe(0);
  });
});
