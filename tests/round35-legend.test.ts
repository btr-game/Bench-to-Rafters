// Round 35: the 50-40-90 club joins the legendary seasons, on the same line as the achievement.

import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/flow';
import { legendarySeasons } from '../src/engine/awards/legendary';
import type { SeasonRecord, StatLine } from '../src/engine/types';

const input = { name: 'Marcus Hale', number: 23, pos: 'SG' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], hometown: 'Dayton', highSchool: 'Fairview High' };
const line = (o: Partial<StatLine>): StatLine => ({ gp: 70, gs: 70, min: 34 * 70, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, ...o });
const season = (o: Partial<StatLine>, level: SeasonRecord['level'] = 'NBA'): SeasonRecord =>
  ({ year: 2031, age: 26, level, stage: level, teamId: 'PHX', teamName: 'Suns', teamColor: '#1d1160', role: 'starter', line: line(o), post: line({ gp: 0 }), w: 50, l: 32, result: '', ovrStart: 84, ovrEnd: 85, awards: [], races: [], salary: 30, bestGame: null }) as never;

// 70 games: 8 of 15.5 from the field, 2.3 of 5.5 from three, 4.6 of 5 at the line (51.6%, 41.8%, 92%)
const club = { pts: 70 * 22.9, fgm: 70 * 8, fga: 70 * 15.5, tpm: 70 * 2.3, tpa: 70 * 5.5, ftm: 70 * 4.6, fta: 70 * 5 };

describe('the 50-40-90 legendary season', () => {
  it('gives a full NBA season in the club its card, and only that season', () => {
    const s = newGame(35, input);
    s.history.push(season(club), season({ ...club, ftm: 70 * 4.4 }));
    const got = legendarySeasons(s);
    expect(got.map((x) => x.id)).toEqual(['fiftyfortyninety']);
    expect(got[0].name).toBe('The 50-40-90 Club');
    // rarer than thirty a night, below the triple-double season
    expect(got[0].rank).toBe(7);
  });

  it('needs a full NBA season, enough threes and free throws, and all three marks', () => {
    const s = newGame(36, input);
    s.history.push(
      season({ ...club, gp: 40, pts: 40 * 22.9, fgm: 40 * 8, fga: 40 * 15.5, tpm: 40 * 2.3, tpa: 40 * 5.5, ftm: 40 * 4.6, fta: 40 * 5 }), // too few games
      season(club, 'NCAA'), // not the NBA
      season({ ...club, tpm: 70 * 0.9, tpa: 70 * 1.5 }), // a three and a half a game: too few tries
      season({ ...club, fgm: 70 * 7.6 }), // 49.0% from the field
      season({ ...club, tpm: 70 * 2.1 }), // 38.2% from three
    );
    expect(legendarySeasons(s)).toEqual([]);
  });

  it('gives way to a rarer card the same season', () => {
    const s = newGame(37, input);
    s.history.push(season({ ...club, pts: 70 * 12, reb: 70 * 11, ast: 70 * 10.5 }));
    expect(legendarySeasons(s).map((x) => x.id)).toEqual(['tripledouble']);
  });
});
