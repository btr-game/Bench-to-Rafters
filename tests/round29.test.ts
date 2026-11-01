// Round 29: the Season and League tabs in one, the Extras tab (the start page's four cards inside
// a career, its tab dot for a mini-game that opens), the career log's locks (five at most, never
// replaced), the timeline's line straight from season to season again, and a music loop for each
// part of the game.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import type { CareerRecord } from '../src/engine/career/record';
import { tabKey } from '../src/ui/selectors';
import { tabNews } from '../src/ui/tabNews';
import { lineCells } from '../src/ui/art/pixel';
import { TRACKS, parseVoice, trackOf, type TrackId } from '../src/ui/tracks';
import { MUSIC_LOOPS, NO_TOTALS, earnedNow } from '../src/engine/achievements';
import { TUTORIAL_LOOPS } from '../src/ui/achievements';
import { MINI_NAMES, syncMiniUnlocks } from '../src/engine/career/miniBonus';
import { CAREER_ICONS } from '../src/ui/art/careerIcons';
import { ICONS } from '../src/ui/art/icons';

/** Plays the smart way until `stop` says so (or 600 steps). */
function playUntil(s: GameState, stop: (s: GameState) => boolean): GameState {
  const r = makeRng(29);
  for (let i = 0; i < 600 && !stop(s); i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
  }
  return s;
}

describe('one tab for the season and the league', () => {
  let g: GameState;
  beforeAll(() => {
    g = newGame(290029, { name: 'Remy Okafor', number: 11, pos: 'PG', archetype: 0, focus: ['PLY', 'SHT'], hometown: 'Dayton', highSchool: 'Fairview High' });
    playUntil(g, (s) => s.nbaHistory.length >= 1 && s.step === 'firstHalf');
  });

  it('keys its dot on games played and on a new NBA champion', () => {
    const now = tabKey(g, 'season').split(':');
    expect(now).toHaveLength(3);
    expect(Number(now[2])).toBe(g.nbaHistory.length);
  });

  it('says who won the title when the record book moved on while away', () => {
    const [year, games] = tabKey(g, 'season').split(':');
    const before = `${year}:${games}:${g.nbaHistory.length - 1}`;
    const news = tabNews(g, 'season', before);
    expect(news.some((x) => x.text.includes(g.nbaHistory[g.nbaHistory.length - 1].champion) && x.sel[0] === '[data-tour="champions"]')).toBe(true);
  });
});

describe('the Extras tab', () => {
  it('puts a dot on the tab when a mini-game opens, and names it', () => {
    const g = newGame(290030, { name: 'Ana Ruiz', number: 3, pos: 'SG', archetype: 0, focus: ['SHT', 'ATH'], hometown: 'Reno', highSchool: 'Galena High' });
    const before = tabKey(g, 'extras');
    g.player.attrs.SHT = 99;
    syncMiniUnlocks(g);
    expect(tabKey(g, 'extras')).not.toBe(before);
    const news = tabNews(g, 'extras', before);
    expect(news[0].text).toContain(MINI_NAMES.threes);
    expect(news[0].sel[0]).toBe('[data-tour="minis"]');
  });

  it('tells the player where the mini-games are now', () => {
    const g = newGame(290031, { name: 'Ana Ruiz', number: 3, pos: 'SG', archetype: 0, focus: ['SHT', 'ATH'], hometown: 'Reno', highSchool: 'Galena High' });
    g.history.push({} as GameState['history'][number]);
    g.player.attrs.SHT = 99;
    syncMiniUnlocks(g);
    expect(g.toast).toContain('Extras tab');
  });
});

describe('career log locks', () => {
  class FakeStorage {
    m = new Map<string, string>();
    getItem(k: string) {
      return this.m.get(k) ?? null;
    }
    setItem(k: string, v: string) {
      this.m.set(k, String(v));
    }
    removeItem(k: string) {
      this.m.delete(k);
    }
  }
  afterEach(() => vi.unstubAllGlobals());
  const rec = (n: number) => ({ id: `c${n}`, name: `Player ${n}`, savedAt: new Date(2026, 0, n).toISOString() }) as unknown as CareerRecord;
  const fresh = async () => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.resetModules();
    return import('../src/ui/careerLog');
  };

  it('never replaces a locked card: the oldest unlocked one goes', async () => {
    const log = await fresh();
    for (let n = 1; n <= log.LOG_MAX; n++) log.logCareer(rec(n));
    expect(log.lockCard('c1', true)).toBe(true);
    expect(log.lockCard('c2', true)).toBe(true);
    expect(log.nextOut()?.id).toBe('c3');
    const r = log.logCareer(rec(11));
    expect(r.dropped?.id).toBe('c3');
    const ids = log.logCards().map((c) => c.id);
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
    expect(ids).not.toContain('c3');
    expect(ids).toHaveLength(log.LOG_MAX);
  });

  it('allows five locks, no more, and frees one on unlock', async () => {
    const log = await fresh();
    for (let n = 1; n <= 8; n++) log.logCareer(rec(n));
    for (let n = 1; n <= log.LOCK_MAX; n++) expect(log.lockCard(`c${n}`, true)).toBe(true);
    expect(log.LOCK_MAX).toBe(5);
    expect(log.lockCard('c6', true)).toBe(false);
    expect(log.logLocks()).toHaveLength(5);
    expect(log.lockCard('c1', false)).toBe(true);
    expect(log.lockCard('c6', true)).toBe(true);
  });

  it('keeps a locked card from being deleted until it is unlocked', async () => {
    const log = await fresh();
    log.logCareer(rec(1));
    log.lockCard('c1', true);
    log.deleteCard('c1');
    expect(log.logCards()).toHaveLength(1);
    log.lockCard('c1', false);
    log.deleteCard('c1');
    expect(log.logCards()).toHaveLength(0);
  });

  it('reads a log from before locks as nothing locked', async () => {
    const log = await fresh();
    localStorage.setItem('btr-log-v1', JSON.stringify({ cards: [rec(1), rec(2)], seen: ['c1', 'c2'] }));
    expect(log.logLocks()).toEqual([]);
    expect(log.lockCard('c2', true)).toBe(true);
  });
});

describe('the career timeline line', () => {
  it('runs straight between points in square pixels, with no gap at any slope', () => {
    const pts: [number, number][] = [
      [0, 100],
      [60, 20],
      [120, 24],
      [130, 90],
    ];
    const d = lineCells(pts, 2);
    const cells = new Set<string>();
    for (const m of d.matchAll(/M(-?\d+) (-?\d+)h(\d+)/g)) for (let k = 0; k < Number(m[3]) / 2; k++) cells.add(`${Number(m[1]) / 2 + k},${Number(m[2]) / 2}`);
    // every cell touches another across a side (4-connected), so nothing floats free
    for (const c of cells) {
      const [x, y] = c.split(',').map(Number);
      expect([`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`].some((n) => cells.has(n))).toBe(true);
    }
    // the ends and the corners are on the line
    for (const [x, y] of pts) expect(cells.has(`${Math.floor(x / 2)},${Math.floor(y / 2)}`)).toBe(true);
    // a slope, not a staircase of whole seasons: the cells between two points stay near the straight line
    for (const c of cells) {
      const [x, y] = c.split(',').map(Number);
      if (x * 2 > 60 || x * 2 < 0) continue;
      const onLine = 100 + ((20 - 100) * (x * 2)) / 60;
      expect(Math.abs(y * 2 - onLine)).toBeLessThanOrEqual(6);
    }
  });
});

describe('music', () => {
  const ids = Object.keys(TRACKS) as TrackId[];
  it('has every loop written out cleanly, each voice a whole number of times round the loop', () => {
    // round 33: the tutorial's two loops are not part of Full Album
    expect(ids.filter((x) => !TUTORIAL_LOOPS.includes(x))).toHaveLength(MUSIC_LOOPS);
    for (const id of ids) {
      const t = TRACKS[id];
      const lens = t.voices.map((v) => parseVoice(v.notes).length);
      const loop = Math.max(...lens, t.drums?.length ?? 0);
      for (const n of lens) expect(loop % n, `${id}: a voice of ${n} in a loop of ${loop}`).toBe(0);
      if (t.drums) expect(loop % t.drums.length).toBe(0);
      for (const v of t.voices) for (const e of parseVoice(v.notes)) if (e) for (const s of e.semis) expect(Math.abs(s)).toBeLessThanOrEqual(36);
      expect(t.step).toBeGreaterThan(0.09);
      expect(t.step).toBeLessThan(0.4);
      expect(ICONS[t.icon] ?? CAREER_ICONS[t.icon], `${id}'s icon ${t.icon}`).toBeTruthy();
    }
  });

  it('turns bad notes away', () => {
    expect(() => parseVoice('C5 H5')).toThrow();
  });

  it('picks a loop for each part of the game: intro, curtain call, every level, the offseason, each mini-game but Lockdown', () => {
    const base = { game: null, thanks: null, intro: false, mini: null };
    expect(trackOf({ ...base, intro: true })).toBe('intro');
    expect(trackOf({ ...base, thanks: {} })).toBe('thanks');
    expect(trackOf(base)).toBe('start');
    expect(trackOf({ ...base, mini: 'rhythm' })).toBeNull();
    expect(trackOf({ ...base, mini: 'daily' })).toBe('hub');
    const minis = ['office', 'threes', 'dunk', 'lab', 'street', 'legends'].map((m) => trackOf({ ...base, mini: m }));
    expect(new Set(minis).size).toBe(6);
    const g = newGame(290032, { name: 'Ana Ruiz', number: 3, pos: 'SG', archetype: 0, focus: ['SHT', 'ATH'], hometown: 'Reno', highSchool: 'Galena High' });
    const at = (stage: GameState['stage'], step: GameState['step']) => trackOf({ ...base, game: { ...g, stage, step } });
    const levels = (['HS', 'NCAA', 'GL', 'EU', 'INT', 'NBA'] as const).map((st) => at(st, 'firstHalf'));
    expect(new Set(levels).size).toBe(6);
    expect(at('NBA', 'offseason')).toBe('offseason');
    expect(at('HS', 'offseason')).toBe('offseason');
    expect(at('FA', 'preseason')).toBe('offseason');
    expect(at('NBA', 'retired')).toBe('retired');
  });

  it('gives the new systems achievements: locks and loops', () => {
    const got = (t: Partial<typeof NO_TOTALS>) => earnedNow(null, { ...NO_TOTALS, ...t });
    expect(got({ locked: 1 })).toContain('lock1');
    expect(got({ locked: 4 })).not.toContain('lock5');
    expect(got({ locked: 5 })).toContain('lock5');
    expect(got({ heard: ids.slice(0, 5) })).toContain('mixtape');
    expect(got({ heard: ids.slice(0, MUSIC_LOOPS - 1) })).not.toContain('album');
    expect(got({ heard: ids })).toContain('album');
  });
});
