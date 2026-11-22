// Round 42: the Floor's own game. Legends from real numbers, each side's overall on its own, the
// plays added to the engine (fast breaks, the post, charges, substitutions, the calls, the line
// score) and the 16-team playoffs.

import { describe, expect, it } from 'vitest';
import { FLOOR } from '../src/engine/balance';
import { ovrOf } from '../src/engine/player/ovr';
import { ALL_LEGENDS, fiveOvr, floorLevel, legendFive, legendRatings, legendStyle, legendTeam } from '../src/engine/floor/legends';
import { BRACKET_ROUNDS, finishBracket, franchise, legendSetup, myGame, newBracket, playRound, winnerOf } from '../src/engine/floor/game';
import { floorResult, freshEvents, gameScore, meterLoad, releaseQuality, startFloor, stepFloor, type FloorInput, type FloorState } from '../src/engine/floor/sim';
import { LEGEND_TRAITS, LEGEND_TRAITS_90_OWN, OWN_90_ON, SIGNATURES_ON, legendTrait } from '../src/content/legendTraits';
import { signatureOf } from '../src/ui/floor/traits';
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

  it('three seconds: a player who stands in the lane on offence loses the ball; the AI is never called', () => {
    // (owner: "yeah add a three second rule")
    const run = (camp: boolean) => {
      const set = legendSetup({ seed: 77, us: franchise('LAL', 90), them: franchise('BOS', 90), user: 1, length: 'fourth' });
      const s = startFloor(set);
      if (!camp) s.auto = true;
      let calls = 0;
      let tov = 0;
      for (let i = 0; i < 200000 && s.phase !== 'over'; i++) {
        const u = s.players[s.user];
        // on offence he walks under the rim and stays; on defence he goes home
        const inp: FloorInput | null = !camp ? null : s.poss === 0 ? { dx: toRim(0, u) > 4 ? 1 : 0, dy: u.y > 26 ? -1 : u.y < 24 ? 1 : 0 } : { dx: toRim(1, u) > 12 ? -1 : 0, sprint: true };
        stepFloor(s, inp);
        for (const e of s.feed.slice(s.fresh)) {
          if (e.kind !== 'lane') continue;
          calls++;
          expect(e.by).toBe(s.user);
          expect(s.phase).toBe('dead');
          expect(s.inbound?.team).toBe(1);
        }
        tov = s.players[s.user].box.tov;
      }
      return { calls, tov };
    };
    expect(run(false).calls).toBe(0);
    const c = run(true);
    expect(c.calls).toBeGreaterThan(3);
    expect(c.tov).toBeGreaterThanOrEqual(c.calls);
    expect(FLOOR.lane.secs).toBe(3);
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

describe('after round 42: the legends\' signatures, the quicker meter and the hold limit', () => {
  // (owner: "can we give each legend in the floor (not all of them, maybe more than 90 ovr) a
  // signature move or unique trait? ex: dame shoots better from deep, curry's fast release")
  it('every legend rated 90 or more has a signature of his own, and nobody below has one', () => {
    const high = ALL_LEGENDS.filter((x) => x.spot.ovr >= 90).map((x) => x.spot.name);
    expect(Object.keys(LEGEND_TRAITS).sort()).toEqual([...high].sort());
    expect(new Set(Object.values(LEGEND_TRAITS).map((x) => x.name)).size).toBe(high.length);
    expect(LEGEND_TRAITS['Damian Lillard'].kind).toBe('deep');
    expect(LEGEND_TRAITS['Stephen Curry'].kind).toBe('curry');
    // (owner: "for player up to ovr 94, they just fall in the general initial categories, but from 95,
    // they actually get their own move"): a kind nobody else has from 95, a shared one below
    const SHARED = ['quick', 'deep', 'fade', 'hook', 'power', 'block', 'steal', 'handle', 'stepback', 'pass', 'glass', 'clutch', 'motor'];
    const kinds = ALL_LEGENDS.filter((x) => x.spot.ovr >= 90).map((x) => ({ ovr: x.spot.ovr, kind: LEGEND_TRAITS[x.spot.name].kind }));
    for (const k of kinds) {
      if (k.ovr >= 95) {
        expect(SHARED).not.toContain(k.kind);
        expect(kinds.filter((x) => x.kind === k.kind)).toHaveLength(1);
      } else expect(SHARED).toContain(k.kind);
    }
    expect(kinds.filter((k) => k.ovr >= 95)).toHaveLength(28);
    // it rides onto the court with him, and not with his bench (only once the owner has passed the list)
    const set = legendSetup({ seed: 5, us: franchise('GSW', 90), them: franchise('POR', 90), user: 0, length: 'fourth' });
    expect(set.us.players.find((p) => p.name === 'Stephen Curry')!.trait).toBe(SIGNATURES_ON ? 'curry' : undefined);
    expect(set.them.players.find((p) => p.name === 'Damian Lillard')!.trait).toBe(SIGNATURES_ON ? (OWN_90_ON ? 'dame' : 'deep') : undefined);
    expect(set.us.players.slice(5).every((p) => !p.trait)).toBe(true);
  });

  it('the meter fills in 0.6 real seconds; Curry\'s in half that', () => {
    // (owner: "lets make the shooting bar fill in 0.6 seconds"): game seconds over the clock's 1.5x
    expect(FLOOR.meter.load / (FLOOR.tick * FLOOR.ticksPerSec)).toBeCloseTo(0.6, 9);
    const s = startFloor(legendSetup({ seed: 5, us: franchise('GSW', 90), them: franchise('POR', 90), user: 0, length: 'fourth' }));
    const curry = s.players.find((p) => p.name === 'Stephen Curry')!;
    curry.trait = LEGEND_TRAITS['Stephen Curry'].kind;
    const other = s.players.find((p) => p.team === 0 && p !== curry && p.on)!;
    delete other.trait;
    expect(meterLoad(curry)).toBeCloseTo(FLOOR.meter.load * FLOOR.sig.curry, 9);
    expect(meterLoad(other)).toBe(FLOOR.meter.load);
    // a release that is perfect for him is far too early for anyone else
    expect(releaseQuality(s, curry, meterLoad(curry))).toBeCloseTo(1, 6);
    expect(releaseQuality(s, other, meterLoad(curry))).toBe(0);
  });

  it('a full meter cannot be held: three real seconds past full, the shot goes up by itself', () => {
    // (owner: "dont allow them to maintain filled bar for more than 3 seconds")
    expect(FLOOR.meter.hold / (FLOOR.tick * FLOOR.ticksPerSec)).toBeCloseTo(3, 9);
    const s = startFloor(legendSetup({ seed: 11, us: franchise('BOS', 90), them: franchise('LAL', 90), user: 1, length: 'fourth' }));
    const u = s.players[s.user];
    // hand him the ball in range and hold the shoot key for good
    let held = 0;
    let shot = -1;
    for (let i = 0; i < 4000 && shot < 0; i++) {
      const mine = s.phase === 'live' && s.ball.holder === s.user && s.poss === 0;
      if (mine && held === 0) {
        u.x = 70;
        u.y = 25;
      }
      stepFloor(s, mine ? { shoot: true } : {});
      if (s.load >= 0) held++;
      else if (held > 0) {
        if (freshEvents(s).some((e) => (e.kind === 'make' || e.kind === 'miss' || e.kind === 'block' || e.kind === 'foul') && e.by === s.user) || s.ball.flight?.kind === 'shot') shot = held;
        else held = 0;
      }
    }
    // it left his hands by itself, at the limit: the fill and three seconds, a tick or two either way
    const limit = (FLOOR.meter.load + FLOOR.meter.hold) / FLOOR.tick;
    expect(shot).toBeGreaterThan(limit - 3);
    expect(shot).toBeLessThan(limit + 3);
  });

  it('a signature is worth something on the court: Lillard from deep', () => {
    // the same game with and without the signatures, the AI playing both sides: more threes fall for Portland's guard
    const run = (traits: boolean) => {
      let made = 0;
      let tried = 0;
      for (let g = 0; g < 14; g++) {
        const set = legendSetup({ seed: 300 + g * 17, us: franchise('POR', 90), them: franchise('SAC', 90), length: 'full' });
        for (const p of [...set.us.players, ...set.them.players]) {
          if (traits && LEGEND_TRAITS[p.name]) p.trait = LEGEND_TRAITS[p.name].kind;
          else delete p.trait;
        }
        const s = startFloor(set);
        s.auto = true;
        play(s);
        const d = s.players.find((p) => p.name === 'Damian Lillard')!;
        made += d.box.tpm;
        tried += d.box.tpa;
      }
      return made / Math.max(1, tried);
    };
    expect(run(true)).toBeGreaterThan(run(false));
  });
});

describe('after round 42: the own signatures of the legends rated 95 or more', () => {
  const games = (team: string, opp: string, n: number, traits: boolean, look: (s: FloorState) => void) => {
    for (let g = 0; g < n; g++) {
      const set = legendSetup({ seed: 700 + g * 13, us: franchise(team, 90), them: franchise(opp, 90), length: 'full' });
      for (const p of [...set.us.players, ...set.them.players]) {
        const live = legendTrait(p.name)?.kind;
        if (traits && live) p.trait = live;
        else delete p.trait;
      }
      const s = startFloor(set);
      s.auto = true;
      play(s);
      look(s);
    }
  };

  it('Dirk\'s jumper is never blocked; Russell\'s blocks stay with Boston', () => {
    let blockedDirk = 0;
    let russellBlocks = 0;
    let russellKept = 0;
    games('DAL', 'MIL', 10, true, (s) => {
      for (const e of s.feed) {
        if (e.kind !== 'block') continue;
        const on = s.players[e.on!];
        if (on.name === 'Dirk Nowitzki' && e.zone !== 'rim') blockedDirk++;
      }
    });
    games('MIL', 'BOS', 10, true, (s) => {
      const feed = s.feed;
      feed.forEach((e, k) => {
        if (e.kind !== 'block') return;
        const by = s.players[e.by!];
        if (by.name === 'Bill Russell') {
          russellBlocks++;
          // the next thing that happens is not a rebound fight: his team has the ball at once
          if (!feed.slice(k + 1, k + 3).some((x) => x.kind === 'rebound')) russellKept++;
        }
      });
    });
    expect(blockedDirk).toBe(0);
    expect(russellBlocks).toBeGreaterThan(0);
    expect(russellKept).toBe(russellBlocks);
  });

  it('together they lift a team a little, not a lot', () => {
    const run = (traits: boolean) => {
      let pts = 0;
      let n = 0;
      games('LAL', 'BOS', 12, traits, (s) => {
        pts += s.score[0] + s.score[1];
        n += 2;
      });
      return pts / n;
    };
    const off = run(false);
    const on = run(true);
    expect(on).toBeGreaterThan(off * 0.95);
    expect(on).toBeLessThan(off * 1.12);
  });
});

describe('after round 42: the own moves of the legends rated 90 to 94', () => {
  // (owner: the 90s to 94s get a move of their own as well, each smaller than a 95's; the names stay)
  const SHARED = ['quick', 'deep', 'fade', 'hook', 'power', 'block', 'steal', 'handle', 'stepback', 'pass', 'glass', 'clutch', 'motor'];
  const nineties = ALL_LEGENDS.filter((x) => x.spot.ovr >= 90 && x.spot.ovr <= 94).map((x) => x.spot.name);

  it('each of the 46 has a kind nobody else has, neither a shared one nor a 95\'s, under his old name', () => {
    expect(nineties).toHaveLength(46);
    expect(Object.keys(LEGEND_TRAITS_90_OWN).sort()).toEqual([...nineties].sort());
    const own = Object.values(LEGEND_TRAITS_90_OWN);
    expect(new Set(own).size).toBe(46);
    const ninetyFive = ALL_LEGENDS.filter((x) => x.spot.ovr >= 95).map((x) => LEGEND_TRAITS[x.spot.name].kind);
    for (const k of own) {
      expect(SHARED).not.toContain(k);
      expect(ninetyFive).not.toContain(k);
    }
    // switched on: the game deals his own kind, under the name he always had, and says what it does
    expect(OWN_90_ON).toBe(true);
    for (const n of nineties) {
      expect(legendTrait(n)).toEqual({ kind: LEGEND_TRAITS_90_OWN[n], name: LEGEND_TRAITS[n].name });
      const sig = signatureOf(n)!;
      expect(sig.name).toBe(LEGEND_TRAITS[n].name);
      expect(sig.text.length).toBeGreaterThan(10);
    }
    expect(new Set(nineties.map((n) => signatureOf(n)!.text)).size).toBe(46);
    // the 95s keep theirs
    expect(legendTrait('Stephen Curry')!.kind).toBe('curry');
    const set = legendSetup({ seed: 5, us: franchise('POR', 90), them: franchise('UTA', 90), length: 'fourth' });
    expect(set.us.players.find((p) => p.name === 'Damian Lillard')!.trait).toBe('dame');
    expect(set.them.players.find((p) => p.name === 'John Stockton')!.trait).toBe('stockton');
    expect(set.them.players.find((p) => p.name === 'Karl Malone')!.trait).toBe('malone');
  });

  it('they lift the 90s\' scoring, less than the 95s\' own moves lift theirs', () => {
    // fourteen games for each of thirteen match-ups, the AI playing both sides: the same games with
    // nobody's signature, with only the 90s' own moves, and with only the 95s'
    const PAIRS = [['NYK', 'ORL'], ['POR', 'PHI'], ['BOS', 'NOP'], ['CLE', 'IND'], ['SAC', 'UTA'], ['PHX', 'DET'], ['ATL', 'CHI'], ['BKN', 'GSW'], ['SAS', 'WAS'], ['DEN', 'LAC'], ['TOR', 'MIA'], ['HOU', 'MIN'], ['OKC', 'LAL']];
    const SEED = 900;
    const run = (who: 'none' | '90' | '95') => {
      const pts = { 90: 0, 95: 0 };
      const n = { 90: 0, 95: 0 };
      for (let g = 0; g < 14 * PAIRS.length; g++) {
        const [a, b] = PAIRS[g % PAIRS.length];
        const set = legendSetup({ seed: SEED + g * 31, us: franchise(g % 2 ? b : a, 90), them: franchise(g % 2 ? a : b, 90), length: 'full' });
        for (const p of [...set.us.players, ...set.them.players]) {
          delete p.trait;
          const own = LEGEND_TRAITS_90_OWN[p.name];
          if (who === '90' && own) p.trait = own;
          if (who === '95' && !own && LEGEND_TRAITS[p.name]) p.trait = LEGEND_TRAITS[p.name].kind;
        }
        const s = startFloor(set);
        s.auto = true;
        play(s);
        for (const p of s.players) {
          if (!LEGEND_TRAITS[p.name]) continue;
          const k = LEGEND_TRAITS_90_OWN[p.name] ? 90 : 95;
          pts[k] += p.box.pts;
          n[k]++;
        }
      }
      return { 90: pts[90] / n[90], 95: pts[95] / n[95] };
    };
    const none = run('none');
    const rise90 = run('90')[90] - none[90];
    const rise95 = run('95')[95] - none[95];
    console.log(`points a game, nobody's / own: the 90s ${none[90].toFixed(4)} / ${(none[90] + rise90).toFixed(4)}, the 95s ${none[95].toFixed(4)} / ${(none[95] + rise95).toFixed(4)}`);
    expect(rise90).toBeGreaterThan(0);
    expect(rise90).toBeLessThan(rise95);
  }, 120000);
});
