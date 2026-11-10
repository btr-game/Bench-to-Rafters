// Round 42: the Floor's own game. Legends from real numbers, each side's overall on its own, the
// plays added to the engine (fast breaks, the post, charges, substitutions, the calls, the line
// score) and the 16-team playoffs.

import { describe, expect, it } from 'vitest';
import { FLOOR } from '../src/engine/balance';
import { ovrOf } from '../src/engine/player/ovr';
import { ALL_LEGENDS, fiveOvr, floorLevel, legendFive, legendRatings, legendStyle, legendTeam } from '../src/engine/floor/legends';
import { BRACKET_ROUNDS, finishBracket, franchise, legendSetup, myGame, newBracket, playRound, winnerOf } from '../src/engine/floor/game';
import { floorResult, gameScore, startFloor, stepFloor, type FloorInput, type FloorState } from '../src/engine/floor/sim';
import { toRim } from '../src/engine/floor/court';
import { NBA_TEAMS } from '../src/content/teams';
import { LEGEND_STATS } from '../src/content/legendStats';

const legend = (name: string) => ALL_LEGENDS.find((x) => x.spot.name === name)!.spot;
const play = (s: FloorState) => {
  for (let i = 0; i < 200000 && s.phase !== 'over'; i++) stepFloor(s, null);
  return s;
};

describe('round 42: legends from their real numbers', () => {
  it('every one of the 150 has a line, and plays at the level of his overall', () => {
    expect(ALL_LEGENDS).toHaveLength(150);
    for (const { spot } of ALL_LEGENDS) {
      expect(LEGEND_STATS[spot.name], spot.name).toBeTruthy();
      expect(Math.abs(ovrOf(legendRatings(spot), spot.pos) - floorLevel(spot.ovr)), spot.name).toBeLessThan(0.6);
    }
  });

  it('each rating follows the number it comes from', () => {
    const r = (n: string) => legendRatings(legend(n));
    expect(r('Stephen Curry').SHT).toBeGreaterThan(r("Shaquille O'Neal").SHT + 30);
    expect(r('John Stockton').PLY).toBeGreaterThan(r('Michael Jordan').PLY);
    expect(r('Dennis Rodman').REB).toBeGreaterThan(r('Michael Jordan').REB);
    expect(r('Hakeem Olajuwon').INT).toBeGreaterThan(r('Stephen Curry').INT + 25);
    expect(r('Stephen Curry').FT).toBeGreaterThan(85);
    expect(r("Shaquille O'Neal").FT).toBeLessThan(15);
    expect(r('Larry Bird').ATH).toBe(68);
  });

  it('how he plays comes from the same numbers', () => {
    const st = (n: string) => legendStyle(legend(n));
    expect(st('Michael Jordan').use).toBeGreaterThan(st('Horace Grant').use * 2);
    expect(st('Stephen Curry').three).toBeGreaterThan(1.5);
    expect(st("Shaquille O'Neal").three).toBe(0);
    expect(st("Shaquille O'Neal").post).toBeGreaterThan(1);
    expect(st('John Stockton').pass).toBeGreaterThan(st('Michael Jordan').pass * 2);
  });

  it('each side’s overall is its own: a five can be played up or down without the other moving', () => {
    const five = legendFive('CHI');
    const mean = (ps: ReturnType<typeof legendTeam>) => ps.slice(0, 5).reduce((a, p) => a + ovrOf(p.r, p.pos), 0) / 5;
    const real = mean(legendTeam('U', five));
    expect(Math.abs(real - five.reduce((a, l) => a + floorLevel(l.ovr), 0) / 5)).toBeLessThan(0.5);
    expect(mean(legendTeam('U', five, { ovr: fiveOvr(five) - 10 }))).toBeLessThan(real - 6);
    const s = legendSetup({ seed: 5, us: franchise('CHI', 75), them: franchise('LAL'), user: 1, length: 'fourth' });
    expect(mean(s.us.players)).toBeLessThan(mean(s.them.players) - 8);
    expect(s.us.players[1].user).toBe(true);
    expect(s.us.players[1].name).toBe('Michael Jordan');
  });

  it('the star takes the most shots, the shooter the most threes', () => {
    const fga: Record<string, number> = {};
    const tpa: Record<string, number> = {};
    for (let g = 0; g < 40; g++) {
      const s = play(startFloor(legendSetup({ seed: 900 + g * 31, us: franchise('CHI'), them: franchise('GSW'), length: 'fourth' })));
      for (const p of s.players) {
        fga[p.name] = (fga[p.name] ?? 0) + p.box.fga;
        tpa[p.name] = (tpa[p.name] ?? 0) + p.box.tpa;
      }
    }
    expect(fga['Michael Jordan']).toBeGreaterThan(fga['Horace Grant'] * 4);
    expect(fga['Michael Jordan']).toBeGreaterThan(fga['Scottie Pippen']);
    expect(tpa['Stephen Curry']).toBeGreaterThan(tpa['Michael Jordan']);
    expect(tpa['Wilt Chamberlain'] ?? 0).toBeLessThan(3);
  });
});

describe('round 42: the plays added to the engine', () => {
  const games = (n: number, length: 'fourth' | 'full') => Array.from({ length: n }, (_, g) => startFloor(legendSetup({ seed: 40 + g * 53, us: franchise('BOS'), them: franchise('LAL'), length })));

  it('fast breaks, post-ups with hooks, a charge now and then, substitutions and isolations all happen', () => {
    const count: Record<string, number> = {};
    let hooks = 0;
    let fast = 0;
    const N = 60;
    for (const s of games(N, 'fourth')) {
      for (let i = 0; i < 200000 && s.phase !== 'over'; i++) {
        stepFloor(s, null);
        for (const e of s.feed.slice(s.fresh)) {
          count[e.kind] = (count[e.kind] ?? 0) + 1;
          if ((e.kind === 'make' || e.kind === 'miss') && e.hook) hooks++;
        }
      }
      fast += s.fast[0] + s.fast[1];
    }
    expect(count.break / N).toBeGreaterThan(2);
    expect(count.break / N).toBeLessThan(12);
    expect(fast / N).toBeGreaterThan(1.5);
    expect(count.post / N).toBeGreaterThan(1);
    expect(hooks / N).toBeGreaterThan(0.8);
    expect(count.sub / N).toBeGreaterThan(1);
    expect(count.charge ?? 0).toBeGreaterThan(0);
    // light: well under one a game for both teams together
    expect((count.charge ?? 0) / N).toBeLessThan(1);
    expect(count.call ?? 0).toBeGreaterThan(0);
  });

  it('a playoff game is four quarters in about four real minutes, with a line score that adds up', () => {
    let ticks = 0;
    const N = 12;
    for (const s of games(N, 'full')) {
      expect(s.quarter).toBe(1);
      expect(s.rate).toBe(FLOOR.rateFull);
      while (s.phase !== 'over') {
        stepFloor(s, null);
        ticks++;
      }
      const r = floorResult(s);
      expect(r.from).toBe(1);
      expect(r.periods[0].length).toBe(4 + r.overtimes);
      expect(r.periods[0].reduce((a, b) => a + b, 0)).toBe(r.us);
      expect(r.periods[1].reduce((a, b) => a + b, 0)).toBe(r.them);
      expect(r.box.filter((p) => p.starter)).toHaveLength(10);
      const top = r.box.reduce((a, b) => (gameScore(b.box) > gameScore(a.box) ? b : a));
      expect(top.box.pts).toBeGreaterThan(0);
    }
    const minutes = ticks / N / FLOOR.ticksPerSec / 60;
    expect(minutes).toBeGreaterThan(3.5);
    expect(minutes).toBeLessThan(6);
  });

  it('a quick game starts in the fourth from a close score that counts in the final', () => {
    const s = startFloor(legendSetup({ seed: 11, us: franchise('BOS'), them: franchise('LAL'), length: 'fourth' }));
    expect(s.quarter).toBe(4);
    expect(s.rate).toBe(FLOOR.rate);
    expect(Math.abs(s.score[0] - s.score[1])).toBeLessThanOrEqual(3);
    const start = [...s.score];
    const r = floorResult(play(s));
    expect(r.start).toEqual(start);
    expect(r.start[0] + r.periods[0].reduce((a, b) => a + b, 0)).toBe(r.us);
  });

  it('his calls: a side cleared and a give-and-go; a substitution he asks for is made at a dead ball', () => {
    const s = startFloor(legendSetup({ seed: 21, us: franchise('LAL'), them: franchise('BOS'), user: 4, length: 'fourth' }));
    const kinds = () => s.feed.slice(s.fresh);
    // wait for his ball
    for (let k = 0; k < 4000 && !(s.phase === 'live' && s.ball.holder === s.user && !s.ball.flight); k++) stepFloor(s, s.ball.holder === s.user ? {} : { pass: 'auto' });
    expect(s.ball.holder).toBe(s.user);
    stepFloor(s, { call: 'iso' });
    expect(kinds().some((e) => e.kind === 'call' && e.call === 'iso')).toBe(true);
    expect(s.iso?.by).toBe(s.user);
    // the give-and-go goes once a teammate has a clear lane
    let gave = false;
    for (let k = 0; k < 200 && !gave && s.ball.holder === s.user; k++) {
      stepFloor(s, { call: 'give', pass: 'auto' });
      gave = kinds().some((e) => e.kind === 'call' && e.call === 'give');
    }
    expect(gave).toBe(true);
    // a substitution asked for: waits, then happens at a dead ball
    const bench = s.players.findIndex((p) => p.team === 0 && !p.on);
    const out = s.players.findIndex((p, i) => p.team === 0 && p.on && i !== s.user);
    stepFloor(s, { sub: { out, in: bench } });
    expect(s.subQ).toHaveLength(1);
    let subbed = false;
    for (let k = 0; k < 6000 && !subbed && s.phase !== 'over'; k++) {
      stepFloor(s, {});
      subbed = s.feed.slice(s.fresh).some((e) => e.kind === 'sub' && e.by === bench);
    }
    expect(subbed).toBe(true);
    expect(s.players[bench].on).toBe(true);
    expect(s.players[out].on).toBe(false);
    expect(s.players[s.user].on).toBe(true);
  });
});

describe('round 42: the playoffs', () => {
  it('eight franchises from each conference, his among them, seeded 1 against 8', async () => {
    const { NBA_TEAMS } = await import('../src/content/teams');
    const conf = (a: string) => NBA_TEAMS.find((x) => x.abbr === a)!.conf;
    const b = newBracket('CHA', 7);
    const field = b.rounds[0].flatMap((g) => [g.a, g.b]);
    expect(new Set(field).size).toBe(16);
    expect(field).toContain('CHA');
    expect(field.slice(0, 8).every((a) => conf(a) === 'East')).toBe(true);
    expect(field.slice(8).every((a) => conf(a) === 'West')).toBe(true);
    const east = [...field.slice(0, 8)].sort((x, y) => fiveOvr(legendFive(y)) - fiveOvr(legendFive(x)) || (x < y ? -1 : 1));
    expect([b.rounds[0][0].a, b.rounds[0][0].b]).toEqual([east[0], east[7]]);
  });

  it('four wins is a title; a loss ends his run and the rest is played out', () => {
    let b = newBracket('BOS', 3);
    for (let r = 0; r < BRACKET_ROUNDS; r++) {
      expect(myGame(b)?.round).toBe(r);
      b = playRound(b, [30, 20]);
    }
    expect(b.champion).toBe('BOS');
    expect(b.out).toBeNull();
    expect(b.rounds.map((x) => x.length)).toEqual([8, 4, 2, 1]);
    let c = playRound(newBracket('BOS', 3), [10, 20]);
    expect(c.out).toBe(0);
    expect(myGame(c)).toBeNull();
    c = finishBracket(c);
    expect(c.champion).not.toBe('BOS');
    expect(c.rounds.every((round) => round.every((g) => winnerOf(g)))).toBe(true);
    // the same seed plays the same bracket
    expect(finishBracket(playRound(newBracket('BOS', 3), [10, 20])).champion).toBe(c.champion);
  });
});

describe('after round 42: leaking out, and the big men', () => {
  // (owner: "the game doesnt punish the users from waiting under the rim and getting easy fastbreaks
  // while abandoning defense")
  const games = (leaker: boolean, n: number) => {
    let them = 0;
    let wins = 0;
    let calls = 0;
    for (let g = 0; g < n; g++) {
      const set = legendSetup({ seed: 900 + g * 13, us: franchise(NBA_TEAMS[(g * 7) % 30].abbr, 90), them: franchise(NBA_TEAMS[(g * 7 + 11) % 30].abbr, 90), user: 1, length: 'fourth' });
      set.score = [0, 0];
      const s = startFloor(set);
      if (!leaker) s.auto = true;
      for (let i = 0; i < 200000 && s.phase !== 'over'; i++) {
        let inp: FloorInput | null = null;
        if (leaker) {
          // he never defends: he runs to the rim he attacks, waits there, and lays it in when it comes
          const u = s.players[s.user];
          const d = toRim(0, u);
          inp = s.ball.holder === s.user && d < 5 ? { finish: true } : { dx: d > 4 ? 1 : 0, dy: u.y > 26 ? -1 : u.y < 24 ? 1 : 0, sprint: d > 8 };
        }
        stepFloor(s, inp);
        for (const e of s.feed.slice(s.fresh)) if (e.kind === 'leak') calls++;
      }
      them += s.score[1];
      if (s.score[0] > s.score[1]) wins++;
    }
    return { them: them / n, wins, calls };
  };

  it('a player who waits up the floor instead of defending is told, and his team pays for it', () => {
    const N = 24;
    const honest = games(false, N);
    const leak = games(true, N);
    expect(honest.calls).toBe(0);
    expect(leak.calls).toBeGreaterThan(N * 5);
    // a man short at its own basket, his team gives up far more
    expect(leak.them).toBeGreaterThan(honest.them * 1.4);
    // and it wins far less than a team that plays it straight (43 of 60 before the rule, against 25; 7 now)
    expect(leak.wins).toBeLessThan(honest.wins);
    expect(leak.wins).toBeLessThanOrEqual(N / 4);
  });

  it('a big man rebounds and scores inside a little more easily than his numbers alone gave him', () => {
    // (owner: "i feel like guards have an advantage over bigmen. make their rebounding/scoring just a
    // little easier"): small edges, on the same scale as the rest
    expect(FLOOR.rebound.big).toBeGreaterThan(0);
    expect(FLOOR.rebound.big).toBeLessThanOrEqual(0.4);
    expect(FLOOR.shot.size).toBeLessThanOrEqual(0.08);
    expect(FLOOR.shot.strong).toBeLessThanOrEqual(0.4);
    // over many AI games the power forwards and centres out-rebound everyone else by far
    const by: Record<string, { reb: number; n: number }> = {};
    for (let g = 0; g < 16; g++) {
      const set = legendSetup({ seed: 500 + g * 31, us: franchise(NBA_TEAMS[(g * 7) % 30].abbr, 90), them: franchise(NBA_TEAMS[(g * 7 + 11) % 30].abbr, 90), length: 'full' });
      const s = startFloor(set);
      s.auto = true;
      play(s);
      s.players.forEach((p, k) => {
        if (k % (s.players.length / 2) >= 5) return;
        (by[p.pos] ??= { reb: 0, n: 0 }).reb += p.box.reb;
        by[p.pos].n++;
      });
    }
    const per = (pos: string) => by[pos].reb / by[pos].n;
    expect(Math.min(per('PF'), per('C'))).toBeGreaterThan(1.5 * Math.max(per('PG'), per('SG'), per('SF')));
  });
});
