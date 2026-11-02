// Round 35: play with friends (ui/multiplayer.ts). The pure parts: what a career keeps of its start,
// the check on a prospect another player sent, a season's line for a draft class, and the class's
// standings and best of each year.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import { ARCHETYPES } from '../src/engine/player/archetypes';
import { canChallenge, classYears, cleanCode, cleanProspect, seasonLine, standings, CODE_RE, type DraftClass } from '../src/ui/multiplayer';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], mode: 'standard' as const };

describe('a career keeps its start', () => {
  it('records the seed and the start page for a full-game career, not for a level', () => {
    const g = newGame(3501, input);
    expect(g.start).toEqual({ seed: 3501, input });
    expect(canChallenge(g)).toBe(true);
    const lv = newGame(3502, { ...input, level: 'beginner' });
    expect(lv.start).toBeUndefined();
    expect(canChallenge(lv)).toBe(false);
    expect(canChallenge(newGame(3503, { ...input, mode: 'reality' }))).toBe(false);
  });

  it('plays the same prospect into the same first season from the same start', () => {
    const play = () => {
      const g = newGame(3504, input);
      const r = makeRng(1);
      for (let k = 0; k < 400 && g.history.length < 1; k++) {
        const p = prompt(g);
        if (p.type === 'decision') choose(g, smartChoice(g, p.decision, r));
        else advance(g);
      }
      return g.history[0];
    };
    expect(play()).toEqual(play());
  });
});

describe('a prospect from another player', () => {
  const ok = { seed: 77, input: { ...input, hand: 'L', country: 'Canada', look: { skin: 2, hair: 'k', style: 'afro', face: 'none' } } };

  it('keeps what the start page can pick, in Regular guy', () => {
    const p = cleanProspect(ok)!;
    expect(p.seed).toBe(77);
    expect(p.input).toMatchObject({ name: 'Marcus Hale', number: 23, pos: 'SF', archetype: 0, focus: ['SHT', 'ATH'], mode: 'standard', hand: 'L', country: 'Canada' });
    expect(p.input.look).toEqual(ok.input.look);
  });

  it('drops what a start page could never send, and refuses what it cannot play', () => {
    const bad = (patch: Record<string, unknown>) => cleanProspect({ seed: 77, input: { ...input, ...patch } });
    // Rough Road, Comet, fast break, a level, another difficulty: all Regular guy
    const p = bad({ mode: 'stars', comet: true, oath: true, fast: true, level: 'advanced', height: 90, hometown: 'x'.repeat(500) })!;
    expect(p.input.mode).toBe('standard');
    for (const k of ['comet', 'oath', 'fast', 'level', 'height', 'hometown'] as const) expect(p.input[k], k).toBeUndefined();
    // an unknown country and a made-up look go; the game picks
    expect(bad({ country: 'Atlantis' })!.input.country).toBeUndefined();
    expect(bad({ look: { skin: 12, hair: 'k', style: 'afro', face: 'none' } })!.input.look).toBeUndefined();
    // a card of all 99s is not a reroll of the archetype's: the archetype's own card is used
    const arch = ARCHETYPES.SF[0].attrs;
    expect(bad({ attrs: { ...arch, SHT: 99 } })!.input.attrs).toBeUndefined();
    // a real reroll (each within a few points, still 320) stays
    const reroll = { ...arch, SHT: arch.SHT + 2, ATH: arch.ATH - 2 };
    expect(bad({ attrs: reroll })!.input.attrs).toEqual(reroll);
    // nothing playable
    expect(bad({ pos: 'QB' })).toBeNull();
    expect(bad({ archetype: 99 })).toBeNull();
    expect(bad({ focus: ['SHT'] })).toBeNull();
    expect(bad({ focus: ['SHT', 'SHT'] })).toBeNull();
    expect(bad({ number: 140 })).toBeNull();
    expect(bad({ name: '' })).toBeNull();
    expect(cleanProspect({ seed: -1, input })).toBeNull();
    expect(cleanProspect(null)).toBeNull();
  });
});

describe('codes', () => {
  it('reads a code the way a friend types it', () => {
    expect(cleanCode(' ab c2-34 ')).toBe('ABC234');
    expect(CODE_RE.test('ABC234')).toBe(true);
    // no I, O, 0 or 1: they read alike
    for (const c of ['ABCD10', 'ABCDIO', 'ABC23']) expect(CODE_RE.test(c), c).toBe(false);
  });
});

describe('a draft class', () => {
  it('sends each season as a short line', () => {
    const g = newGame(3505, input);
    const r = makeRng(2);
    for (let k = 0; k < 800 && g.history.length < 3; k++) {
      const p = prompt(g);
      if (p.type === 'decision') choose(g, smartChoice(g, p.decision, r));
      else advance(g);
    }
    for (const h of g.history) {
      const s = seasonLine(h, g.player.name);
      expect(s.year).toBe(h.year);
      expect(s.pn).toBe('Marcus Hale');
      expect(s.gp).toBe(h.line.gp);
      // the database takes 1.5 KB a season
      expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThan(1500);
    }
  });

  it('ranks the class and marks the best of each year', () => {
    const season = (year: number, ovr: number, pts: number, aw: string[] = [], lv = 'NBA') => ({ year, age: 20, lv, team: 'T', color: '#000', ovr, gp: 70, pts, reb: 5, ast: 5, w: 40, l: 42, result: '', aw, pn: 'P' });
    const k: DraftClass = {
      code: 'CLASS2',
      name: 'Test',
      seed: 1,
      at: '2026-11-01T00:00:00Z',
      mine: false,
      members: [
        { id: 'a', name: 'A', seasons: [season(2030, 80, 20), season(2031, 84, 22, ['All-Star'])], rec: null, at: '2026-11-01T00:00:00Z', mine: false },
        { id: 'b', name: 'B', seasons: [season(2030, 82, 18), season(2031, 83, 25, ['MVP', 'NBA Champion'])], rec: null, at: '2026-11-01T01:00:00Z', mine: true },
        { id: 'c', name: 'C', seasons: [], rec: null, at: '2026-11-01T02:00:00Z', mine: false },
      ],
    };
    const t = standings(k);
    // B: peak 83 with an MVP and a title beats A's peak 84 with one All-Star team
    expect(t.map((x) => x.m.id)).toEqual(['b', 'a', 'c']);
    expect(t[0]).toMatchObject({ peak: 83, mvps: 1, titles: 1, nba: 2 });
    expect(t[2]).toMatchObject({ peak: 0, nba: 0 });
    const y = classYears(k);
    expect(y.map((x) => x.year)).toEqual([2030, 2031]);
    expect(y[0].best).toBe('b');
    expect(y[1].best).toBe('a');
    // a year only one member played has no "best of the class"
    k.members[1].seasons = [season(2030, 82, 18)];
    expect(classYears(k)[1].best).toBeNull();
  });
});
