// Round 38: story mode's engine (engine/story/): the friend, the rival, the chapters.
import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import { userOvr } from '../src/engine/career/common';
import { STORY } from '../src/engine/balance';
import { setTrack } from '../src/engine/story/pals';
import { STORY_CHAPTERS } from '../src/engine/story/chapters';
import type { GameState } from '../src/engine/types';

const hero = { name: 'Eli Carter', number: 3, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'PLY'], hometown: 'Dayton, OH', highSchool: 'Fairview High' };

/** A story career played by the harness's smart player; `each` sees it at every season's start. */
function play(seed: number, names: Record<string, string> | undefined, each?: (s: GameState) => void, upTo = 9000): GameState {
  const r = makeRng(seed);
  const s = newGame(seed, { ...hero, story: names ?? {} } as never);
  let year = 0;
  for (let i = 0; i < upTo; i++) {
    const p = prompt(s);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
    else advance(s);
    if (each && s.step === 'preseason' && s.year !== year) {
      year = s.year;
      each(s);
    }
  }
  return s;
}

describe('round 38: story mode', () => {
  it('opens on the driveway with the names he gave, the rest generated, family taking his surname', () => {
    const s = newGame(7, { ...hero, story: { friend: 'Marcus Bell', parent: 'Denise', rival: 'Dante Vale' } } as never);
    expect(s.flags.story).toBe(1);
    expect(s.story!.names.friend).toBe('Marcus Bell');
    expect(s.story!.names.parent).toBe('Denise Carter');
    expect(s.story!.names.rival).toBe('Dante Vale');
    expect(s.story!.names.sibling.split(' ')[1]).toBe('Carter');
    expect(s.story!.named.sort()).toEqual(['friend', 'parent', 'rival']);
    const first = s.pending[0];
    expect(first.kind).toBe('story');
    expect(first.data?.ch).toBe('f-driveway');
    // skipping the naming names everyone, never with his surname for the friend or the rival
    const skip = newGame(8, { ...hero, story: {} } as never);
    expect(skip.story!.named).toEqual([]);
    expect(skip.story!.names.friend.split(' ')[1]).not.toBe('Carter');
  });

  it('the same seed and choices give the same story', () => {
    const a = play(31, { friend: 'Marcus' });
    const b = play(31, { friend: 'Marcus' });
    expect(a.story!.done).toEqual(b.story!.done);
    expect(a.story!.friend).toEqual(b.story!.friend);
    expect(a.story!.rival).toEqual(b.story!.rival);
    expect(a.player.peakOvr).toBe(b.player.peakOvr);
  }, 120_000);

  it('the rival is met in college and is always a small step ahead; both play in his league', () => {
    let seasons = 0;
    const s = play(55, { rival: 'Dante Vale' }, (g) => {
      const r = g.story!.rival;
      if (!r || r.lv === 'OUT') return;
      seasons++;
      const lead = r.ovr - userOvr(g);
      expect(lead).toBeGreaterThanOrEqual(STORY.rivalLead[0] - 0.01);
      expect(lead).toBeLessThanOrEqual(STORY.rivalLead[1] + 0.01);
      if (r.lv === 'NBA') {
        expect(g.mp?.friends?.some((f) => f.id === 'story-rival' && f.seasons.at(-1)?.lv === 'NBA')).toBe(true);
        expect(g.mp?.rival).toBe('story-rival');
      }
    });
    expect(seasons).toBeGreaterThan(5);
    expect(s.story!.done).toContain('r-meet');
  }, 120_000);

  it('the written hero takes the American road and reaches the NBA', () => {
    for (const seed of [11, 22, 33]) {
      const s = play(seed, {});
      expect(s.history.some((h) => h.level === 'NBA')).toBe(true);
      expect(s.history.some((h) => h.level === 'EU' || h.level === 'INT')).toBe(false);
    }
  }, 300_000);

  it('the friend’s road follows the drive the hero gave him', () => {
    const roads = (drive: number) => {
      const out = { star: 0, pro: 0, bust: 0 };
      for (let seed = 1; seed <= 400; seed++) {
        const s = newGame(seed, { ...hero, story: {} } as never);
        s.story!.friend.drive = drive;
        setTrack(s, s.story!);
        out[s.story!.friend.track!]++;
      }
      return out;
    };
    const none = roads(0);
    const lots = roads(7);
    expect(none.bust).toBeGreaterThan(lots.bust * 2);
    expect(lots.star).toBeGreaterThan(none.star * 3);
    // even given everything, a star is the rarer road
    expect(lots.star).toBeLessThan(lots.pro);
  });

  it('a career that is not a story has no story and leaves the friends system alone', () => {
    const r = makeRng(5);
    const s = newGame(5, hero as never);
    for (let i = 0; i < 1500; i++) {
      const p = prompt(s);
      if (p.type === 'retired') break;
      if (p.type === 'decision') choose(s, smartChoice(s, p.decision, r));
      else advance(s);
    }
    expect(s.story).toBeUndefined();
    expect(s.flags.story).toBeUndefined();
    expect(s.mp?.friends).toBeUndefined();
  }, 120_000);

  it('has chapters for the friend, the rival and the family, each with its own id', () => {
    const ids = STORY_CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const who of ['friend', 'rival', 'parent', 'sibling'] as const) expect(STORY_CHAPTERS.some((c) => c.who === who)).toBe(true);
    expect(STORY_CHAPTERS.length).toBeGreaterThanOrEqual(20);
  });
});
