// Round 37: the town (ui/town.ts) and its arenas (ui/arenas.ts).
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/flow';
import type { GameState } from '../src/engine/types';
import { HOUSE_AT, SIGN_MAX, STREET, layoutOf, placeFor, schoolSign, townLook, townOf } from '../src/ui/town';
import { ARENA_W, MARK_W, NBA_ARENAS, arenaFromName, arenaSpec, schoolSpec } from '../src/ui/arenas';
import { NBA_TEAMS } from '../src/content/teams';
import { TEAM_STYLE } from '../src/content/teamStyle';
import { buildNba } from '../src/engine/world/leagues';

const input = { name: 'Test Player', number: 23, pos: 'SF' as const, archetype: 1, focus: ['SHT', 'PER'], hometown: 'Akron, OH', highSchool: 'St. Vincent' };
const game = (seed = 3) => newGame(seed, input as never) as GameState;

/** The same career, moved to a stage (only what the town reads). */
function at(g: GameState, stage: GameState['stage'], history: string[] = []): GameState {
  // in the NBA he plays for one of its teams
  const nba = stage === 'NBA' ? g.nba ?? buildNba(g, g.year) : g.nba;
  const teamId = stage === 'NBA' ? nba!.teams[0].id : g.teamId;
  return { ...g, stage, nba, teamId, history: history.map((level) => ({ level })) as never } as GameState;
}

describe('round 37: the town', () => {
  it('is his hometown in high school, the campus in college, a city as a pro, a city abroad in Europe', () => {
    const g = game();
    expect(townLook(at(g, 'HS'))).toBe('hometown');
    expect(townLook(at(g, 'NCAA'))).toBe('campus');
    expect(townLook(at(g, 'NBA'))).toBe('city');
    expect(townLook(at(g, 'GL'))).toBe('city');
    expect(townLook(at(g, 'EU'))).toBe('abroad');
    expect(townLook(at(g, 'INT'))).toBe('abroad');
    // a career that is over stays on the street of the level he played last
    expect(townLook(at(g, 'RETIRED', ['HSV', 'NCAA']))).toBe('campus');
    expect(townLook(at(g, 'RETIRED', ['NCAA', 'NBA', 'EU']))).toBe('abroad');
  });

  it('has a place for every tab, and an agent’s office once he is a pro', () => {
    const g = game();
    const hs = townOf(at(g, 'HS'));
    expect(hs.places.map((p) => p.tab)).toEqual(['home', 'season', 'player', 'records', 'extras']);
    expect(hs.places.some((p) => p.id === 'agent')).toBe(false);
    expect(hs.name).toBe('Akron');
    const pro = townOf(at(g, 'NBA'));
    const agent = pro.places.find((p) => p.id === 'agent')!;
    expect(agent.tab).toBe('player');
    expect(agent.spot).toBe('contract');
    // the Player tab belongs to his house, unless he last walked into the agent's office
    expect(placeFor(pro, 'player', null)?.id).toBe('house');
    expect(placeFor(pro, 'player', 'agent')?.id).toBe('agent');
    expect(placeFor(pro, 'season', 'agent')?.id).toBe('arena');
  });

  it('a tutorial level shows only the places of its tabs', () => {
    const g = game();
    const beginner = { ...at(g, 'NBA'), flags: { ...g.flags, level: 1 } } as GameState;
    expect(townOf(beginner).places.map((p) => p.id)).toEqual(['gym', 'house']);
  });

  it('he lives in a family house, a dorm, then a flat, a house or a mansion with the bank', () => {
    const g = at(game(), 'NBA');
    const with$ = (m: number) => townOf({ ...g, player: { ...g.player, bank: m } }).house;
    expect(townOf(at(g, 'HS')).house).toBe('family');
    expect(townOf(at(g, 'NCAA')).house).toBe('dorm');
    expect(with$(HOUSE_AT.house - 0.01)).toBe('flat');
    expect(with$(HOUSE_AT.house)).toBe('house');
    expect(with$(HOUSE_AT.mansion)).toBe('mansion');
  });

  it('lays the street out left to right with no building over another, each door inside its building', () => {
    const g = game();
    for (const stage of ['HS', 'NCAA', 'NBA', 'EU'] as const) {
      for (const pad of [0, 40]) {
        const town = townOf(at(g, stage));
        const { w, slots } = layoutOf(town, pad);
        expect(slots[0].x).toBe(STREET.margin + pad);
        slots.forEach((s, i) => {
          expect(s.door).toBeGreaterThan(s.x);
          expect(s.door).toBeLessThan(s.x + s.w);
          if (i > 0) expect(s.x).toBeGreaterThanOrEqual(slots[i - 1].x + slots[i - 1].w + STREET.gap);
        });
        const last = slots[slots.length - 1];
        expect(w).toBe(last.x + last.w + STREET.margin + pad);
      }
    }
  });

  it('a long school name gets a sign that fits, real ones that fit stand as they are', () => {
    expect(schoolSign('St. Vincent')).toBe('St. Vincent');
    expect(schoolSign('Oak Hill Academy')).toBe('Oak Hill Academy');
    expect(schoolSign('Box Hill Senior Secondary')).toBe('Box Hill');
    expect(schoolSign('')).toBe('High school');
    // every school a career starts at fits on its sign
    for (let seed = 1; seed <= 300; seed++) {
      const g = game(seed);
      const sign = schoolSign(g.player.highSchool);
      expect(sign.length).toBeLessThanOrEqual(SIGN_MAX);
      expect(sign.length).toBeGreaterThan(0);
    }
  });
});

describe('round 37: every arena its own', () => {
  it('every NBA team has an arena designed for it, with its colours and its city’s landmark', () => {
    for (const t of NBA_TEAMS) {
      const a = NBA_ARENAS[t.abbr];
      expect(a, t.abbr).toBeDefined();
      expect(TEAM_STYLE[t.abbr], t.abbr).toBeDefined();
      expect(a.mark).toBeDefined();
      expect(a.side === 'l' || a.side === 'r').toBe(true);
    }
    expect(Object.keys(NBA_ARENAS).length).toBe(NBA_TEAMS.length);
  });

  it('no two NBA arenas share a landmark, and no two are built alike', () => {
    const marks = Object.values(NBA_ARENAS).map((a) => a.mark);
    expect(new Set(marks).size).toBe(marks.length);
    const builds = Object.values(NBA_ARENAS).map((a) => `${a.roof}/${a.skin}/${a.mark}`);
    expect(new Set(builds).size).toBe(builds.length);
  });

  it('an NBA arena stands with its landmark beside it, and he walks to the arena’s own door', () => {
    const g = at(game(), 'NBA');
    const town = townOf(g);
    expect(town.abbr).toBeDefined();
    const slot = layoutOf(town).slots.find((s) => s.place.id === 'arena')!;
    expect(slot.w).toBe(ARENA_W + MARK_W);
    const left = NBA_ARENAS[town.abbr!].side === 'l';
    const arenaLeft = slot.x + (left ? MARK_W : 0);
    expect(slot.door).toBeGreaterThan(arenaLeft);
    expect(slot.door).toBeLessThan(arenaLeft + ARENA_W);
  });

  it('any other arena and every school is built from its name, the same every visit, and they vary', () => {
    expect(arenaFromName('Duke', 'campus')).toEqual(arenaFromName('Duke', 'campus'));
    expect(arenaSpec(undefined, 'Duke', 'campus')).toEqual(arenaFromName('Duke', 'campus'));
    expect(arenaSpec('BOS', 'Boston Celtics', 'city')).toMatchObject({ mark: 'steeple' });
    const clubs = ['Duke', 'Kansas', 'Gonzaga', 'Kentucky', 'UCLA', 'Villanova', 'Real Madrid', 'Fenerbahce', 'Olympiacos', 'Capital City Go-Go', 'Maine Celtics', 'Sioux Falls Skyforce'];
    const looks = new Set(clubs.map((c) => JSON.stringify(arenaFromName(c, 'city'))));
    expect(looks.size).toBeGreaterThan(6);
    const schools = ['St. Vincent', 'Oak Hill Academy', 'Montverde Academy', 'Lincoln High', 'Westchester', 'Box Hill Senior Secondary', 'IMG Academy', 'Findlay Prep'];
    expect(new Set(schools.map((s) => JSON.stringify(schoolSpec(s)))).size).toBeGreaterThan(4);
    expect(schoolSpec('St. Vincent')).toEqual(schoolSpec('St. Vincent'));
  });
});
