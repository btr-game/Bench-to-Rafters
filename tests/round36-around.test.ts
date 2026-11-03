// Round 36 (owner: "merge 12"): Home's side column is one "Around you" card that opens on what
// matters most right now.

import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/flow';
import { aroundPanes } from '../src/ui/around';
import type { GameState } from '../src/engine/types';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };
const talk = { headline: 'Hale drops 30', source: 'Hoops Daily', comments: [] };
const rival = (g: GameState, since: number): GameState['rivalry'] => ({ level: 'draft', pid: 1, name: 'Dre Banks', pos: 'SF', since, team: 'Rivals', w: 1, l: 2, seasons: [{ year: g.year, me: 70, him: 72 }], notes: [] });

describe('Around you', () => {
  it('shows only the parts with something in them, and nothing when none has', () => {
    const g = newGame(3, { ...input, mode: 'standard' });
    g.feed = [];
    g.stories = [];
    g.rivalry = undefined;
    expect(aroundPanes(g, false)).toEqual([]);
    g.feed = [talk];
    expect(aroundPanes(g, false)).toEqual(['talk']);
    expect(aroundPanes(g, true), 'the beginner level keeps the fans’ talk out').toEqual([]);
  });

  it('opens on a rivalry that began this season, ahead of the fans’ talk and the league', () => {
    const g = newGame(3, { ...input, mode: 'standard' });
    g.feed = [talk];
    g.stories = [{ kind: 'dynasty', teamId: 'x', text: 'A dynasty in the making' } as never];
    g.rivalry = rival(g, g.year);
    expect(aroundPanes(g, false)[0]).toBe('rival');
    // an old rivalry gives way to the league's stories
    g.rivalry = rival(g, g.year - 4);
    g.rivalry.seasons = [{ year: g.year - 1, me: 70, him: 72 }];
    expect(aroundPanes(g, false)).toEqual(['league', 'rival', 'talk']);
    g.rivalry.ended = 'He retired.';
    expect(aroundPanes(g, false).at(-1), 'an ended rivalry goes last').toBe('rival');
  });
});
