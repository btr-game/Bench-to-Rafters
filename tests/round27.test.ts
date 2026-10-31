// Round 27 (the UI round): the engine's words for places in a list.

import { describe, expect, it } from 'vitest';
import { ordinal } from '../src/engine/career/common';

describe('ordinal', () => {
  it('says 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, 22nd, 23rd, 101st', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });
});

describe('the dev deck password', () => {
  it('is never spelled out in what ships (the page only keeps its hash)', async () => {
    const { readdirSync, readFileSync, statSync } = await import('fs');
    const { join } = await import('path');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    const leaks = walk('src').filter((f) => /btrdev/i.test(readFileSync(f, 'utf8')));
    expect(leaks).toEqual([]);
  });
});

// ---------- round 27, the batch after the round ----------

import '../src/engine/flow';
import { EVENT_ICONS_A } from '../src/ui/art/eventIconsA';
import { EVENT_ICONS_B } from '../src/ui/art/eventIconsB';
import { EVENT_ICONS_C } from '../src/ui/art/eventIconsC';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { ICONS } from '../src/ui/art/icons';
import { brandIcon, eventIcon, injuryIcon, leagueIcon, levelIcon } from '../src/ui/art/careerArt';
import { EVENTS as BASE_EVENTS } from '../src/engine/events/defs';
import { MORE_EVENTS } from '../src/engine/events/more';
import { RISK_EVENTS } from '../src/engine/events/risks';
import { GROWTH_EVENTS } from '../src/engine/events/growthEvents';
import { SKILL_EVENTS } from '../src/engine/events/skillEvents';
import { ARC_EVENTS } from '../src/engine/events/arcs';
import { ROUND9_EVENTS } from '../src/engine/events/round9';
import { ROUND13_EVENTS } from '../src/engine/events/round13';
import { ROUND15_EVENTS } from '../src/engine/events/round15';
import { WEIGHT_EVENTS } from '../src/engine/events/weightEvents';
import { ROUND21_EVENTS } from '../src/engine/events/round21';
import { ROUND25_EVENTS } from '../src/engine/events/round25';
import { INJURY_NAMES } from '../src/engine/player/injury';
import { LEVELS } from '../src/engine/balance';
import { INT_LEAGUES } from '../src/content/teams';
import { BRANDS } from '../src/content/nicknames';
import { ACHIEVEMENTS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { addMiniResult } from '../src/engine/achievementsMini';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import { claimMini } from '../src/engine/career/miniBonus';
import HOUSE from '../src/content/house.json';
import { scoreOf } from '../src/ui/community';
import type { CareerRecord } from '../src/engine/career/record';

describe('an icon of its own (owner: "injuries, events, and some of levels and leagues have the exact same icon")', () => {
  const all = { ...ICONS, ...EVENT_ICONS_A, ...EVENT_ICONS_B, ...EVENT_ICONS_C, ...CAREER_ICONS };
  const events = [BASE_EVENTS, MORE_EVENTS, RISK_EVENTS, GROWTH_EVENTS, SKILL_EVENTS, ARC_EVENTS, ROUND9_EVENTS, ROUND13_EVENTS, ROUND15_EVENTS, WEIGHT_EVENTS, ROUND21_EVENTS, ROUND25_EVENTS].flat();
  const keys = [
    ...events.map((e) => eventIcon(e.id)),
    ...Object.values(INJURY_NAMES).flat().map(injuryIcon),
    ...Object.keys(LEVELS).map(levelIcon),
    ...INT_LEAGUES.map((l) => leagueIcon(l.key)),
    ...BRANDS.map((b) => brandIcon(b.name)),
  ];
  it('covers every event, injury, level, league and brand', () => {
    expect(keys.filter((k) => !all[k])).toEqual([]);
  });
  it('never repeats a picture', () => {
    const seen = new Map<string, string>();
    const twins = keys.filter((k) => {
      const pic = all[k].join('|');
      const dup = seen.has(pic);
      seen.set(pic, k);
      return dup;
    });
    expect(twins).toEqual([]);
  });
  it('draws on the shared 16 x 16 palette', () => {
    for (const k of keys) {
      expect(all[k].length, k).toBeLessThanOrEqual(16);
      for (const row of all[k]) expect(row, k).toMatch(/^[.OWwKRrBbGgYyNnPpSsTtCLMm]{16}$/);
    }
  });
});

describe('mini-game achievements (owner: "outside of the main game and based on the minigame\'s impact")', () => {
  it('counts the arcade with no career open', () => {
    let m = addMiniResult(undefined, { game: 'threes', score: 28, won: true, own: false });
    m = addMiniResult(m, { game: 'rhythm', grade: 'S' });
    m = addMiniResult(m, { game: 'threes', score: 12, won: false, own: false });
    expect(m.runs.threes).toBe(2);
    expect(m.best.threes).toBe(28);
    expect(m.wins.threes).toBe(1);
    const got = earnedNow(null, { ...NO_TOTALS, mini: m });
    expect(got).toEqual(expect.arrayContaining(['mg-first', 'mg-threes-20', 'mg-threes-27', 'mg-threes-win', 'mg-rhythm-a', 'mg-rhythm-s']));
    expect(got).not.toContain('mg-all');
    expect(earnedNow(null, { ...NO_TOTALS })).toEqual([]);
  });
  it('logs what a claimed bonus did for the career', () => {
    const s = newGame(81, { name: 'Mini Log', number: 4, pos: 'SG', archetype: 0, focus: ['SHT', 'FIN'], mode: 'standard' } as never);
    s.miniOpen = ['threes', 'rhythm'];
    s.player.attrs.SHT = 60;
    claimMini(s, { game: 'threes', score: 30, won: true, own: true });
    expect(s.miniLog).toHaveLength(1);
    expect(s.miniLog![0]).toMatchObject({ game: 'threes', year: s.year });
    expect(s.miniLog![0].gain).toBeGreaterThan(0);
    expect(s.miniLog![0].range).toBeGreaterThan(0);
    claimMini(s, { game: 'rhythm', grade: 'S' });
    expect(s.miniLog).toHaveLength(2);
    // three different games in one career earn Cross-Trainer
    s.miniLog!.push({ game: 'dunk', year: s.year + 1, gain: 0.4 });
    // achievements come from the end of a first season on
    const r = makeRng(81);
    for (let i = 0; i < 4000 && s.history.length === 0; i++) {
      const p = prompt(s);
      if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
      else advance(s);
    }
    expect(earnedNow(s, { ...NO_TOTALS })).toContain('mg-c3');
    expect(earnedNow(s, { ...NO_TOTALS })).toContain('mg-range');
  });
  it('are all in the book with names of their own', () => {
    const mini = ACHIEVEMENTS.filter((a) => a.id.startsWith('mg-'));
    expect(mini.length).toBeGreaterThanOrEqual(25);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('the house players (owner: "the dummies should have very low stats so that the users can quickly dominate")', () => {
  const recs = HOUSE as unknown as CareerRecord[];
  it('are small careers on every board, and a few bronze statues', () => {
    for (const mode of ['standard', 'reality', 'stars'] as const) expect(recs.filter((r) => r.mode === mode && !r.id.startsWith('house-statue')).length).toBe(10);
    expect(recs.filter((r) => r.id.startsWith('house-statue')).length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(scoreOf(r), r.name).toBeLessThan(25);
      expect(r.peak, r.name).toBeLessThan(70);
      expect(r.titles, r.name).toBe(0);
    }
  });
});

describe('the projected peak before college (owner: "it either overestimates or kind of spoils the potential")', () => {
  it('stays a wide, rough read in high school and sharpens once he is past it', async () => {
    const { scoutReport, EARLY_SCOUT } = await import('../src/engine/career/scouting');
    const s = newGame(91, { name: 'Early Read', number: 9, pos: 'SF', archetype: 0, focus: ['SHT', 'FIN'], mode: 'standard' } as never);
    const r = makeRng(91);
    let seenHs = 0;
    for (let i = 0; i < 6000 && s.step !== 'retired'; i++) {
      const rep = scoutReport(s);
      if (s.stage === 'HS') {
        seenHs++;
        expect(rep.early).toBe(true);
        expect(rep.peakHi - rep.peakLo).toBeGreaterThanOrEqual(Math.min(2 * EARLY_SCOUT.minSd - 1, 99 - rep.peakLo));
        expect(rep.notes.some((n) => /It is early/.test(n))).toBe(true);
      } else if (s.stage === 'NBA') {
        expect(rep.early).toBe(false);
        break;
      }
      const p = prompt(s);
      if (p.type === 'retired') break;
      if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
      else advance(s);
    }
    expect(seenHs).toBeGreaterThan(0);
  });
});

describe('the look he picks (owner: "let the user choose the appearance of the player")', () => {
  it('draws his name in the chosen look, with no accessories, and keeps it in the career', async () => {
    const { chooseLook, lookTraits } = await import('../src/content/looks');
    const look = { skin: 5, hair: 'r' as const, style: 'mullet' as const, face: 'bigbeard' as const };
    const s = newGame(77, { name: 'Look Picked', number: 21, pos: 'C', archetype: 0, focus: ['INT', 'REB'], mode: 'standard', look } as never);
    expect(s.player.look).toEqual(look);
    chooseLook(s.player.name, s.player.look);
    expect(lookTraits('Look Picked')).toEqual({ ...look, gear: [] });
  });
});

describe('a player drawn facing left', () => {
  it('has his number painted back to front, so it reads right once the sprite is turned round', async () => {
    const { paint, RUN_A } = await import('../src/ui/art/sprite');
    const kit = { base: '#123456', ink: '#ABCDEF', trim: '#123456', word: '' };
    const look = { skin: '#8D5524', hair: '#1B1820', style: 'short' as const, face: 'none' as const, gear: [], shoe: '#2A2D34' };
    // where the number's ink sits, as a pattern from its own left edge
    const inkAt = (g: string[][], turned: boolean) => {
      const at: [number, number][] = [];
      g.forEach((row, y) => row.forEach((c, x) => c === kit.ink && at.push([turned ? row.length - 1 - x : x, y])));
      const x0 = Math.min(...at.map(([x]) => x));
      return at.map(([x, y]) => `${x - x0},${y}`).sort();
    };
    const plain = inkAt(paint(RUN_A, kit, look, 24), false);
    const turned = inkAt(paint(RUN_A, kit, look, 24, true), true);
    expect(plain.length).toBeGreaterThan(10);
    expect(turned).toEqual(plain);
    // and drawn the plain way, a turned-round sprite would read backwards
    expect(inkAt(paint(RUN_A, kit, look, 24), true)).not.toEqual(plain);
  });
});
