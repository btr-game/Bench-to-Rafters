// Round 35: friends in each other's leagues (engine/career/friendLeague.ts), the playoff rival
// series (career/rivalSeries.ts) and asking to join a friend's team (career/team.ts, the 'friend'
// trade aim). A classmate's player lives in a career only through its copy of the class's season
// lines (GameState.mp.friends), so the same copy gives the same career, and a career without
// friends in the NBA plays exactly as it did.

import { describe, expect, it } from 'vitest';
import { advance, choose, newGame, prompt } from '../src/engine/flow';
import { smartChoice } from '../scripts/harness';
import { makeRng } from '../src/engine/rng';
import type { FriendLine, GameState } from '../src/engine/types';
import type { LiveRequest } from '../src/engine/career/live';
import { teamById } from '../src/engine/career/common';
import { activeDuo } from '../src/engine/career/duo';
import { friendBonds } from '../src/engine/career/friends';
import { friendAllStars, friendCandidates, friendGame, friendNudge, friendStatLine } from '../src/engine/career/friendLeague';
import { rivalSeriesPossible, seriesOdds } from '../src/engine/career/rivalSeries';
import { canRequestTrade, friendTeams, requestTrade, tradeOptions } from '../src/engine/career/team';
import { mvpLadder } from '../src/engine/awards/awards';
import { capFor } from '../src/engine/economy/salary';
import { valuePerGame } from '../src/engine/sim/statModel';
import { winProb } from '../src/engine/sim/leagueSim';
import { projectedLines } from '../src/engine/sim/genStats';
import { FRIEND_LEAGUE, JOIN_FRIEND } from '../src/engine/balance';

const input = { name: 'Marcus Hale', number: 23, pos: 'SF' as const, archetype: 0, focus: ['SHT', 'ATH'] as ['SHT', 'ATH'], mode: 'standard' as const };

/** A Regular guy career played until `stop` says so (simulated postseasons, the harness's calls). */
function playUntil(seed: number, stop: (g: GameState) => boolean): GameState {
  const g = newGame(seed, input);
  g.flags.simPostseason = 1;
  const r = makeRng(seed);
  for (let k = 0; k < 8000; k++) {
    if (stop(g)) return g;
    const p = prompt(g);
    if (p.type === 'retired') break;
    if (p.type === 'decision') choose(g, smartChoice(g, p.decision, r));
    else advance(g);
  }
  throw new Error(`seed ${seed} never got there`);
}
const inNba = (g: GameState) => g.stage === 'NBA' && g.history.some((h) => h.level === 'NBA');
/** The first page of his second NBA season or later, before a game is played. */
const preseason = (seed: number) => playUntil(seed, (g) => inNba(g) && g.step === 'preseason' && prompt(g).type === 'decision');
/** Midseason of his second NBA season or later, with nothing left to decide: the second half next. */
const midseason = (seed: number) => playUntil(seed, (g) => inNba(g) && g.step === 'midseason' && g.pending.length === 0);

/** Plays on until the season's step is `step` (the harness's calls). */
function playTo(g: GameState, step: GameState['step']): void {
  const r = makeRng(g.year);
  for (let k = 0; k < 400 && g.step !== step; k++) {
    const p = prompt(g);
    if (p.type === 'retired') return;
    if (p.type === 'decision') choose(g, smartChoice(g, p.decision, r));
    else advance(g);
  }
}

const line = (year: number, team: string, x: Partial<FriendLine['seasons'][number]> = {}): FriendLine['seasons'][number] => ({ year, lv: 'NBA', team, ovr: 78, pts: 18, reb: 5, ast: 4, gp: 76, sal: 10, ...x });
const friend = (id: string, seasons: FriendLine['seasons']): FriendLine => ({ id, name: `Friend ${id}`, pn: `Player ${id}`, pos: 'PG', seasons });
const other = (g: GameState, k = 0) => g.nba!.teams.filter((t) => t.id !== g.teamId)[k];
const mine = (g: GameState) => teamById(g.nba, g.teamId)!;
/** A state's JSON without the copy of the class, to compare a career with and without friends. */
const bare = (g: GameState) => JSON.stringify({ ...g, mp: undefined });

describe('friends in the box score', () => {
  it('gives a classmate a line in every game against his team and with him on yours, around his averages', () => {
    const g = midseason(3510);
    const opp = other(g, 3);
    const before = g.season!.games.length;
    g.mp = { klass: 'ABCDEF', friends: [friend('o', [line(g.year, opp.name, { pts: 24, reb: 7, ast: 5, gp: 82 })]), friend('m', [line(g.year, mine(g).name, { pts: 12, gp: 82 })])] };
    advance(g);
    expect(g.step).toBe('summary');
    const games = g.season!.games.slice(before).filter((x) => !x.post);
    const vs = games.filter((x) => x.opp === opp.short);
    expect(vs.length).toBeGreaterThan(0);
    for (const x of vs) {
      const o = x.friends?.find((f) => f.name === 'Friend o');
      expect(o, 'his line against his team').toBeTruthy();
      expect(o!.mate).toBeUndefined();
      expect(o!.pts).toBeGreaterThanOrEqual(0);
      expect(o!.reb).toBeDefined();
    }
    // the classmate on his team plays in his games (82 of 82: every one)
    for (const x of games) expect(x.friends?.some((f) => f.name === 'Friend m' && f.mate), `game ${x.n}`).toBe(true);
    const pts = games.map((x) => x.friends!.find((f) => f.name === 'Friend m')!.pts);
    const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
    expect(mean).toBeGreaterThan(9);
    expect(mean).toBeLessThan(15);
    // games against anyone else carry no line of his
    expect(games.filter((x) => x.opp !== opp.short).every((x) => !x.friends?.some((f) => f.name === 'Friend o'))).toBe(true);
    // the first half, played before the class was copied in, has none
    expect(g.season!.games.slice(0, before).every((x) => !x.friends)).toBe(true);
  });

  it('sits a classmate out about as often as his games played say, and lifts his team only from OVR 75 up', () => {
    const g = midseason(3511);
    const opp = other(g, 2);
    g.mp = { klass: 'ABCDEF', friends: [friend('o', [line(g.year, opp.name, { ovr: 85, gp: 41 })])] };
    let played = 0;
    for (let n = 1; n <= 400; n++) {
      const x = friendGame(g, mine(g), opp, n, undefined);
      if (x.box.length) {
        played++;
        expect(x.nudge).toBeCloseTo((85 - FRIEND_LEAGUE.nudge.from) * FRIEND_LEAGUE.nudge.per, 9);
      } else expect(x.nudge).toBe(0);
    }
    expect(played / 400).toBeGreaterThan(0.4);
    expect(played / 400).toBeLessThan(0.6);
    // in the playoffs he always plays
    expect(friendGame(g, mine(g), opp, 1, 'First round').box).toHaveLength(1);
    // the same game gives the same line
    expect(friendGame(g, mine(g), opp, 7, undefined)).toEqual(friendGame(g, mine(g), opp, 7, undefined));
    // a role player gives his team nothing extra; the lift stops at its cap
    g.mp.friends = [friend('o', [line(g.year, opp.name, { ovr: 75 })])];
    expect(friendNudge(g, opp)).toBe(0);
    g.mp.friends = [friend('o', [line(g.year, opp.name, { ovr: 99 })]), friend('p', [line(g.year, opp.name, { ovr: 99 })])];
    expect(friendNudge(g, opp)).toBe(FRIEND_LEAGUE.nudge.max);
  });
});

describe('friends in the award races', () => {
  it('runs a classmate for MVP with his season\'s numbers: a monster season wins it, a quiet one is nowhere', () => {
    const g = midseason(3513);
    const best = [...g.nba!.teams].filter((t) => t.id !== g.teamId).sort((a, b) => b.w - a.w)[0];
    const quiet = other(g, 5);
    // a season past any the league's own players have (round 39: a 37-13-13 season from a generated
    // star once edged 41-12-10)
    g.mp = { klass: 'ABCDEF', friends: [friend('m', [line(g.year, best.name, { ovr: 99, pts: 46, reb: 14, ast: 12, gp: 80 })]), friend('q', [line(g.year, quiet.name, { ovr: 70, pts: 3, reb: 1, ast: 1, gp: 60 })])] };
    // the race so far, at his share of the games his team has played
    const so = friendCandidates(g, g.nba!, true);
    expect(so.find((c) => c.id === 'm')!.line.gp).toBe(Math.round((80 / 82) * (best.w + best.l)));
    const ladder = mvpLadder(g.nba!, null, 5, projectedLines(g.nba!, g.teamId, g.season!.roleRank), so);
    expect(ladder.rows[0].name).toBe('Player m (Friend m)');
    expect(ladder.rows.some((r) => r.name === 'Player q (Friend q)')).toBe(false);
    advance(g);
    expect(g.step).toBe('summary');
    const mvp = g.lastSummary!.races.find((r) => r.award === 'MVP')!;
    expect(mvp.top[0].name).toBe('Player m (Friend m)');
    expect(mvp.top.some((r) => r.name.startsWith('Player q'))).toBe(false);
    expect(g.nbaHistory[g.nbaHistory.length - 1].awards.find((a) => a.award === 'MVP')?.name).toBe('Player m (Friend m)');
    expect(g.awards.some((a) => a.key === 'MVP' && a.year === g.year)).toBe(false);
    // a classmate who beats him is never made his generated MVP rival
    expect(g.rivals['Player m (Friend m)']).toBeUndefined();
    // his scoring title too, with 41 a night
    expect(g.lastSummary!.races.find((r) => r.award === 'Scoring title')!.top[0].name).toBe('Player m (Friend m)');
  });

  it('makes a classmate a rookie only in his first NBA season, and compares him with his last one', () => {
    const g = midseason(3510);
    const t = other(g);
    g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, t.name)]), friend('b', [line(g.year - 1, t.name, { pts: 10 }), line(g.year, t.name, { pts: 20 })]), friend('c', [line(g.year - 1, t.name)])] };
    const c = Object.fromEntries(friendCandidates(g, g.nba!).map((x) => [x.id, x]));
    expect(c.a.rookie).toBe(true);
    expect(c.a.prevValue).toBeNull();
    expect(c.b.rookie).toBe(false);
    expect(c.b.prevValue).toBeCloseTo(valuePerGame(friendStatLine({ ...line(g.year - 1, t.name, { pts: 10 }) }, 76)), 9);
    // a season behind: last season's line, no rookie and nothing to improve on
    expect(c.c.rookie).toBe(false);
    expect(c.c.prevValue).toBeNull();
    // shooting at the league's average: his value is his counting stats
    const l = friendStatLine(line(g.year, t.name, { pts: 25, reb: 0, ast: 0 }), 80);
    expect(l.pts).toBe(2000);
    expect(valuePerGame(l)).toBeGreaterThan(25 - 1.5);
    expect(valuePerGame(l)).toBeLessThan(25 + 1.5);
  });
});

describe('friends on the All-Star teams', () => {
  it('names the classmates voted in, and one in his conference takes a place ahead of him', () => {
    const g = preseason(3511);
    const conf = mine(g).conf;
    const east = g.nba!.teams.find((t) => t.conf === conf && t.id !== g.teamId)!;
    const west = g.nba!.teams.find((t) => t.conf !== conf)!;
    const far = g.nba!.teams.filter((t) => t.conf !== conf)[1];
    g.mp = { klass: 'ABCDEF', friends: [friend('e', [line(g.year, east.name, { ovr: 95, pts: 36, reb: 9, ast: 8, gp: 80 })]), friend('w', [line(g.year, west.name, { ovr: 95, pts: 34, reb: 10, ast: 7, gp: 80 })]), friend('q', [line(g.year, far.name, { ovr: 70, pts: 2, reb: 1, ast: 0, gp: 70 })])] };
    playTo(g, 'midseason');
    const said = g.season!.midReport.find((x) => /All-Star team/.test(x));
    expect(said, 'the half report names them').toBeTruthy();
    expect(said).toContain(`Player e (Friend e) of the ${east.name}`);
    expect(said).toContain(`Player w (Friend w) of the ${west.name}`);
    expect(said).not.toContain('Player q');
    // the vote itself: a classmate ahead of him in his conference moves him down one
    const vals = Array.from({ length: 40 }, (_, i) => 30 - i * 0.5);
    const top = friendAllStars(g, g.nba!, conf, vals, 22);
    expect(top.ahead).toBe(1);
    expect(top.picked).toHaveLength(2);
    expect(friendAllStars(g, g.nba!, conf, vals, 99).ahead).toBe(0);
  });
});

describe('a playoff series against the rival classmate', () => {
  /** A season at midseason whose team meets `opp` in the first round when nothing changes, with him
   * fit to play it (a player out for the season is never asked: round 37, a seed's career changed). */
  function meeting(): { g: GameState; opp: string } {
    const hurt = (s: GameState) => !!s.player.injury && s.player.injury.key !== 'dtd';
    for (const seed of [3511, 3510, 3513, 3515, 3512, 3514, 3516, 3517, 3518, 3519]) {
      let g: GameState;
      try {
        g = midseason(seed);
      } catch {
        continue; // a seed whose career never reaches a second NBA season
      }
      const a = structuredClone(g);
      advance(a);
      const sr = a.nba!.bracket!.rounds[0].series.find((x) => x.a === g.teamId || x.b === g.teamId);
      if (sr && !hurt(g) && !hurt(a)) return { g, opp: sr.a === g.teamId ? sr.b : sr.a };
    }
    throw new Error('no first round');
  }
  /** His rival at OVR 75: no lift for his team, so the season up to the series plays as before. */
  const withRival = (g: GameState, opp: string) => {
    const t = teamById(g.nba, opp)!;
    g.mp = { klass: 'ABCDEF', friends: [friend('r', [line(g.year, t.name, { ovr: 75, pts: 22, gp: 80 })])], rival: 'r' };
    return t;
  };

  it('stops a simulated postseason before game 1 for the call, then plays the series and records it', () => {
    const { g, opp } = meeting();
    const t = withRival(g, opp);
    expect(rivalSeriesPossible(g)).toBe(true);
    advance(g);
    expect(g.step).toBe('postseason');
    const d = g.pending[0];
    expect(d.kind).toBe('live');
    const req = d.data!.req as LiveRequest;
    expect(req.stage).toBe('rival');
    expect(req.round).toBe('First round');
    expect(req.opp).toBe(t.name);
    expect(d.text).toContain('Player r (Friend r)');
    expect(d.choices.map((c) => c.id)).toEqual(['guard', 'duel', 'team']);
    for (const c of d.choices) expect(['Low', 'Medium', 'High']).toContain(c.risk);
    // the harness answers it like any playoff pick
    expect(smartChoice(g, d, makeRng(1))).toBe('guard');
    const run = (id: string) => {
      const x = structuredClone(g);
      choose(x, id);
      return x;
    };
    for (const id of ['guard', 'duel', 'team']) {
      const x = run(id);
      expect(x.step).toBe('summary');
      const m = x.mp!.meets!.filter((y) => y.series);
      expect(m).toHaveLength(1);
      expect(m[0]).toMatchObject({ year: g.year, series: 'First round', how: { guard: 'guarded him', duel: 'went at him', team: 'played the team game' }[id] });
      expect(m[0].score).toMatch(/^(4–[0-3]|[0-3]–4)$/);
      expect(m[0].won).toBe(m[0].score.startsWith('4'));
      expect(m[0].him).toBeGreaterThan(0);
      const page = x.moments.find((y) => /^Rival series/.test(y.title));
      expect(page, 'a page for the series').toBeTruthy();
      expect(page!.text).toContain('Player r');
      expect(page!.lines!.join(' ')).toContain('Marcus Hale');
      expect(page!.lines!.join(' ')).toContain('Player r (Friend r)');
      expect(x.log.some((l) => l.text.startsWith('Rival series, First round'))).toBe(true);
      // the series is no rival night, and the record of their meetings counts it
      expect(x.history[x.history.length - 1].year).toBe(g.year);
    }
    // the same call plays the same series
    expect(run('duel').mp).toEqual(run('duel').mp);
  });

  it('asks the same call when the games are played by hand', () => {
    const { g, opp } = meeting();
    withRival(g, opp);
    g.flags.simPostseason = 0;
    advance(g);
    let asked = false;
    for (let k = 0; k < 40 && g.step === 'postseason'; k++) {
      const d = g.pending[0];
      const req = d.data!.req as LiveRequest;
      if (req.stage === 'rival') {
        asked = true;
        choose(g, 'team');
      } else choose(g, d.choices.some((c) => c.id === 'all') ? 'all' : d.choices[0].id);
    }
    expect(asked).toBe(true);
    expect(g.step).toBe('summary');
    expect(g.mp!.meets!.find((m) => m.series)?.how).toBe('played the team game');
  });

  it('carries a game\'s chance over a best of seven', () => {
    expect(seriesOdds(0.5, 7)).toBeCloseTo(0.5, 12);
    expect(seriesOdds(0.6, 7)).toBeCloseTo(0.710208, 6);
    expect(seriesOdds(winProb(0.6, 0, 0), 7)).toBeCloseTo(0.5724871, 6);
    expect(seriesOdds(1, 7)).toBe(1);
  });

  it('is never possible without a rival classmate in the NBA on another team', () => {
    const { g, opp } = meeting();
    expect(rivalSeriesPossible(g)).toBe(false);
    const t = withRival(g, opp);
    g.mp!.friends = [friend('r', [line(g.year, t.name, { lv: 'GL' })])];
    expect(rivalSeriesPossible(g)).toBe(false);
    g.mp!.friends = [friend('r', [line(g.year, mine(g).name)])];
    expect(rivalSeriesPossible(g)).toBe(false);
  });
});

describe('asking to join a friend\'s team', () => {
  /** An NBA offseason where he can ask for a trade. */
  const offseason = (seed: number) => playUntil(seed, (g) => inNba(g) && g.step === 'offseason' && prompt(g).type === 'advance' && canRequestTrade(g));

  it('offers each friend\'s team, with odds that fall as the two salaries rise, and not past the ceiling', () => {
    const g = offseason(3510);
    const payroll = (x: { roster: { salary: number }[] }) => x.roster.reduce((a, p) => a + p.salary, 0);
    // the team with the most room, so only the two salaries decide
    const t = [...g.nba!.teams].filter((x) => x.id !== g.teamId).sort((a, b) => payroll(a) - payroll(b))[0];
    const cap = capFor(g.year + 1);
    const at = (sal: number) => {
      g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, t.name, { sal })])] };
      return tradeOptions(g).find((o) => o.aim === 'friend');
    };
    const cheap = at(1)!;
    expect(cheap.to).toBe(t.id);
    expect(cheap.teams).toEqual([t]);
    expect(cheap.label).toBe('Join Player a (Friend a)');
    const dear = at(cap * 0.45)!;
    expect(dear.chance).toBeLessThan(cheap.chance);
    // past the ceiling: not offered, and the reason is there to show
    expect(at(cap * (JOIN_FRIEND.ceiling + 0.05))).toBeUndefined();
    expect(friendTeams(g)[0].why).toMatch(/no team can carry both/);
    // a team whose payroll has no room for both
    const rich = [...g.nba!.teams].filter((x) => x.id !== g.teamId).sort((a, b) => payroll(b) - payroll(a))[0];
    const pay = payroll(rich);
    const sal = Math.max(1, cap * JOIN_FRIEND.apron - pay - (g.contract?.salary ?? 0) + 1);
    if ((sal + (g.contract?.salary ?? 0)) / cap <= JOIN_FRIEND.ceiling) {
      g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, rich.name, { sal })])] };
      expect(tradeOptions(g).some((o) => o.aim === 'friend')).toBe(false);
      expect(friendTeams(g)[0].why).toMatch(/cannot fit both contracts/);
    }
    // two classmates on one team are one aim; on two teams, two
    const u = [...g.nba!.teams].filter((x) => x.id !== g.teamId).sort((a, b) => payroll(a) - payroll(b))[1];
    g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, t.name, { sal: 1 })]), friend('b', [line(g.year, t.name, { sal: 1 })]), friend('c', [line(g.year, u.name, { sal: 1 })])] };
    const f = tradeOptions(g).filter((o) => o.aim === 'friend');
    expect(f.map((o) => o.to)).toEqual([t.id, u.id]);
    expect(f[0].label).toBe('Join Player a (Friend a) and Player b (Friend b)');
    // a classmate on his own team, or out of the NBA, is no aim
    g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, mine(g).name)]), friend('b', [line(g.year, t.name, { lv: 'EU' })])] };
    expect(tradeOptions(g).some((o) => o.aim === 'friend')).toBe(false);
  });

  it('moves him to the friend\'s team when the deal gets done, and the duo of friends forms next season', () => {
    const g = offseason(3511);
    const t = other(g, 4);
    g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, t.name, { sal: 1 })])] };
    let done: GameState | null = null;
    for (let k = 0; k < 200 && !done; k++) {
      const x = structuredClone(g);
      x.rng = makeRng(k + 1);
      requestTrade(x, 'friend', t.id);
      if (x.teamId === t.id) done = x;
    }
    expect(done, 'some draw gets the deal done').toBeTruthy();
    const x = done!;
    expect(x.tradeResult?.ok).toBe(true);
    expect(x.moments.find((m) => m.title === 'Traded')!.lines!.join(' ')).toContain('a duo of friends');
    advance(x);
    expect(x.year).toBe(g.year + 1);
    expect(friendBonds(x)).toHaveLength(1);
    expect(friendBonds(x)[0].formed).toBe(x.year);
    expect(activeDuo(x)?.friend).toBe('Friend a');
    expect(x.moments.some((m) => m.title === 'A duo of friends')).toBe(true);
    // a deal that falls through says why
    for (let k = 0; k < 200; k++) {
      const y = structuredClone(g);
      y.rng = makeRng(k + 1);
      requestTrade(y, 'friend', t.id);
      if (y.teamId === g.teamId) {
        expect(y.tradeResult?.text).toContain(`The ${t.name} could not fit both contracts`);
        break;
      }
    }
  });
});

describe('the same copy, the same career', () => {
  it('plays a season with friends the same way twice', () => {
    const g = preseason(3512);
    const t = other(g, 1);
    g.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, t.name, { ovr: 88, pts: 27 })]), friend('b', [line(g.year, mine(g).name)])], rival: 'a' };
    const run = () => {
      const x = structuredClone(g);
      playTo(x, 'summary');
      return JSON.stringify(x);
    };
    const a = run();
    expect(a).toEqual(run());
    expect(a).toContain('"friends":[{"pn":"Player');
  });

  it('leaves a class career untouched when no classmate is in the NBA, and a career without friends never meets one', () => {
    const g = preseason(3513);
    const a = structuredClone(g);
    const b = structuredClone(g);
    a.mp = { klass: 'ABCDEF', friends: [] };
    b.mp = { klass: 'ABCDEF', friends: [friend('a', [line(g.year, other(g).name, { lv: 'GL' })]), friend('b', [line(g.year - 3, other(g).name)])], rival: 'a' };
    playTo(a, 'summary');
    playTo(b, 'summary');
    expect(bare(b)).toEqual(bare(a));
    expect(b.season!.games.every((x) => !x.friends)).toBe(true);
    expect(friendCandidates(b, b.nba!)).toEqual([]);
    const c = structuredClone(g);
    playTo(c, 'summary');
    expect(c.mp).toBeUndefined();
    expect([...c.season!.games, ...c.season!.postGames].every((x) => !x.friends)).toBe(true);
    expect(friendCandidates(c, c.nba!)).toEqual([]);
    expect(friendTeams(c)).toEqual([]);
    expect(rivalSeriesPossible(c)).toBe(false);
  });
});
