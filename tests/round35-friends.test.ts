// Round 35: friends in each other's careers (engine/career/friends.ts, events/friends.ts): a
// classmate on his NBA team is a duo (two a Big Three), and a rival classmate's team means a rival
// night once a season, with a record of their meetings. The engine reads only the copy of the
// class kept in the career.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { FriendLine, GameState } from '../src/engine/types';
import { activeDuo, activeTrio, duoEffect } from '../src/engine/career/duo';
import { friendNow, friendsOnTeam, rivalRecord, rivalTeam } from '../src/engine/career/friends';
import { offerEvent, queueMidseasonEvents } from '../src/engine/events/resolver';
import { teamById } from '../src/engine/career/common';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], mode: 'standard' as const };

/** A Regular guy career played to its second NBA season's first plan. */
function nbaCareer(seed: number): GameState {
  const g = newGame(seed, input);
  const r = makeRng(seed);
  for (let k = 0; k < 8000; k++) {
    if (g.stage === 'NBA' && g.history.some((h) => h.level === 'NBA') && prompt(g).type === 'decision' && g.step === 'preseason') break;
    const p = prompt(g);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(g, smartChoice(g, p.decision, r));
    else advance(g);
  }
  return g;
}

const friend = (id: string, team: string, year: number, extra: Partial<FriendLine> = {}): FriendLine => ({ id, name: `Friend ${id}`, pn: `Player ${id}`, pos: 'PG', seasons: [{ year, lv: 'NBA', team, ovr: 78, pts: 18 }], ...extra });

describe('friends in a career', () => {
  it('finds a friend this season, or a season behind, and nowhere further back', () => {
    const f = friend('a', 'Boston Celtics', 2030);
    expect(friendNow(f, 2030)?.team).toBe('Boston Celtics');
    expect(friendNow(f, 2031)).toMatchObject({ team: 'Boston Celtics', projected: true });
    expect(friendNow(f, 2032)).toBeNull();
  });

  it('makes a friend on his NBA team a duo, and two a Big Three, with the duo bonus to team strength', () => {
    const g = nbaCareer(3510);
    expect(g.stage).toBe('NBA');
    const mine = teamById(g.nba, g.teamId)!;
    const other = g.nba!.teams.find((t) => t.id !== g.teamId)!;
    g.mp = { klass: 'ABCDEF', friends: [friend('a', other.name, g.year)] };
    expect(friendsOnTeam(g)).toHaveLength(0);
    expect(duoEffect(g)).toBeNull();
    g.mp.friends = [friend('a', mine.name, g.year), friend('b', mine.name, g.year)];
    expect(activeDuo(g)?.name).toBe('Player a (Friend a)');
    expect(activeTrio(g)?.name).toBe('Player b (Friend b)');
    const fx = duoEffect(g)!;
    expect(fx.team).toBeGreaterThan(0);
    expect(fx.third).not.toBeNull();
    // not in a draft class: nothing
    g.mp = { challenge: 'ABCDEF', friends: [friend('a', mine.name, g.year)] };
    expect(duoEffect(g)).toBeNull();
  });

  it('queues a rival night once a season, plays it out and keeps the record', () => {
    const g = nbaCareer(3511);
    const other = g.nba!.teams.find((t) => t.id !== g.teamId)!;
    g.mp = { klass: 'ABCDEF', friends: [friend('r', other.name, g.year)] };
    // not rivals yet: nothing
    expect(rivalTeam(g)).toBeNull();
    g.mp.rival = 'r';
    expect(rivalTeam(g)?.team.name).toBe(other.name);
    g.step = 'midseason';
    g.pending = [];
    queueMidseasonEvents(g);
    const night = g.pending.find((d) => d.data?.eventId === 'rivalNight');
    expect(night, 'a rival night is queued').toBeTruthy();
    expect(night!.text).toContain('Player r');
    for (const c of night!.choices) {
      const t = structuredClone(g);
      t.pending = [t.pending.find((d) => d.data?.eventId === 'rivalNight')!];
      choose(t, c.id);
      expect(t.mp!.meets).toHaveLength(1);
      const m = t.mp!.meets![0];
      expect(m.year).toBe(g.year);
      expect(m.me).toBeGreaterThan(0);
      expect(m.him).toBeGreaterThan(0);
      expect(rivalRecord(t).w + rivalRecord(t).l).toBe(1);
      // once a season
      t.pending = [];
      queueMidseasonEvents(t);
      expect(t.pending.some((d) => d.data?.eventId === 'rivalNight')).toBe(false);
    }
  });

  it('plays the same rival night the same way from the same career', () => {
    const g = nbaCareer(3512);
    const other = g.nba!.teams.find((t) => t.id !== g.teamId)!;
    g.mp = { klass: 'ABCDEF', friends: [friend('r', other.name, g.year)], rival: 'r' };
    const run = () => {
      const t = structuredClone(g);
      t.pending = [];
      expect(offerEvent(t, 'rivalNight')).toBe(true);
      choose(t, t.pending[0].choices[1].id);
      return t.mp!.meets![0];
    };
    expect(run()).toEqual(run());
  });
});
