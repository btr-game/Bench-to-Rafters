// Round 35, the draft class's own pages: the class news a season brings (the server writes the same
// line, supabase/migrations/0006_multiplayer_class.sql), reunion night's awards (owner: "revealing
// each of them one at a time ... from least important to most, so class MVP should be last"), and
// the stand-in's fair play (a posted season stands; a seat holds one career).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classNews, reunionAwards, reunionReady, REUNION_WAIT_DAYS, type ClassSeason, type DraftClass } from '../src/ui/multiplayer';

const season = (year: number, ovr: number, o: Partial<ClassSeason> = {}): ClassSeason => ({ year, age: 22, lv: 'NBA', team: 'Boston Celtics', color: '#000', ovr, gp: 70, pts: 20, reb: 5, ast: 5, w: 40, l: 42, result: '', aw: [], pn: 'Ann Lee', ...o });

describe('class news', () => {
  it('says what changed, in one line, and nothing when nothing did', () => {
    const first = season(2030, 70);
    expect(classNews([], first, 'Ann')).toBe('Ann Lee (Ann), 2030: starts his NBA career with the Boston Celtics.');
    expect(classNews([first], season(2031, 72), 'Ann')).toBeNull();
    const big = season(2031, 84, { team: 'Miami Heat', aw: ['All-Star', 'MVP', 'NBA Champion'] });
    expect(classNews([first], big, 'Ann')).toBe('Ann Lee (Ann), 2031: moves to the Miami Heat · an All-Star for the first time · the league MVP · NBA champion with the Miami Heat.');
    // a second All-Star is not news; leaving the NBA is
    expect(classNews([first, big], season(2032, 84, { team: 'Miami Heat', aw: ['All-Star'] }), 'Ann')).toBeNull();
    expect(classNews([first, big], season(2032, 70, { lv: 'EU', team: 'Real Madrid' }), 'Ann')).toBe('Ann Lee (Ann), 2032: leaves the NBA for Real Madrid.');
  });
});

describe('reunion night', () => {
  const now = Date.parse('2026-11-02T00:00:00Z');
  const k = (): DraftClass => ({
    code: 'REUNI8',
    name: 'Test',
    seed: 1,
    at: '2026-10-01T00:00:00Z',
    mine: false,
    members: [
      { id: 'a', name: 'A', seasons: [season(2030, 80, { sal: 5 }), season(2031, 88, { aw: ['All-Star', 'MVP'], sal: 30 })], rec: null, at: '2026-11-01T00:00:00Z', mine: false },
      { id: 'b', name: 'B', seasons: [season(2030, 76, { reb: 12, sal: 4 }), season(2031, 79, { reb: 11, team: 'Utah Jazz', aw: ['NBA Champion'], sal: 9 })], rec: null, at: '2026-11-01T01:00:00Z', mine: true },
      { id: 'c', name: 'C', seasons: [], rec: null, at: '2026-11-01T02:00:00Z', mine: false },
    ],
  });
  it('waits until every career that started is over, or quiet for two weeks', () => {
    const x = k();
    expect(reunionReady(x, now)).toEqual({ ready: false, done: 0, total: 2 });
    // a friend who stops posting counts as he stands after REUNION_WAIT_DAYS
    expect(reunionReady(x, now + (REUNION_WAIT_DAYS + 1) * 86400000).ready).toBe(true);
  });
  it('hands out its awards from the least to the class MVP, last', () => {
    const aw = reunionAwards(k());
    expect(aw[aw.length - 1].title).toBe('Class MVP');
    expect(aw.map((a) => a.key)).toEqual(['iron', 'travel', 'glass', 'dimes', 'bank', 'points', 'peak', 'stars', 'mvps', 'rings', 'mvp']);
    const by = (key: string) => aw.find((a) => a.key === key)!;
    // only the two who played are ranked
    expect(by('iron').rows.length).toBe(2);
    expect(by('glass').rows[0].m.id).toBe('b');
    expect(by('travel').rows[0]).toMatchObject({ value: 2, text: '2 teams' });
    expect(by('bank').rows[0]).toMatchObject({ value: 35, text: '$35.0M earned' });
    expect(by('rings').rows[0].m.id).toBe('b');
    expect(by('mvp').rows[0].m.id).toBe('a');
  });
});

describe('the stand-in keeps a seat fair', () => {
  class FakeStorage {
    m = new Map<string, string>();
    getItem(k: string) {
      return this.m.get(k) ?? null;
    }
    setItem(k: string, v: string) {
      this.m.set(k, v);
    }
    removeItem(k: string) {
      this.m.delete(k);
    }
  }
  beforeEach(() => {
    vi.stubGlobal('localStorage', new FakeStorage());
    vi.stubGlobal('sessionStorage', new FakeStorage());
    sessionStorage.setItem('btr-dev-on', '1');
  });
  afterEach(() => vi.unstubAllGlobals());
  it('keeps the first line of a season, refuses another career on the seat, and posts the news', async () => {
    vi.resetModules();
    const { multiplayer } = await import('../src/ui/multiplayer');
    const mp = (await multiplayer())!;
    expect(mp.kind).toBe('local');
    const seat = await mp.makeClass('Fair class', 'Me');
    if (typeof seat === 'string') throw new Error(seat);
    expect(await mp.postSeason(seat.code, { ...season(2030, 70), run: 'r1' })).toBe('ok');
    expect(await mp.postSeason(seat.code, { ...season(2030, 99, { aw: ['MVP'] }), run: 'r1' })).toBe('ok');
    expect(await mp.postSeason(seat.code, { ...season(2031, 75), run: 'r2' })).toBe('taken');
    const k = await mp.draftClass(seat.code);
    if (!k || k === 'error') throw new Error('no class');
    const me = k.members.find((m) => m.mine)!;
    expect(me.seasons.map((s) => s.ovr)).toEqual([70]);
    expect('run' in me.seasons[0]).toBe(false);
    const chat = await mp.chat('class', seat.code);
    expect(chat && chat !== 'error' && chat.filter((l) => l.news).map((l) => l.body)).toEqual(['Ann Lee (Me), 2030: starts his NBA career with the Boston Celtics.']);
  });
});
