// Standings, schedules and playoffs for every league. Other teams' games use
// team strength only; the user's games go through a hook that simulates a box score.

import { GAME_POINTS, HOME_COURT, HS_PLAYOFF_TEAMS, WIN_SCALE } from '../balance';
import { chance, logistic, normal, shuffle, type Rng } from '../rng';
import type { Bracket, League, LevelKey, SeriesResult, Team } from '../types';

/** Returns true if the user's team won; `last` holds the score of the game just played. */
export type UserGameHook = ((opp: Team, home: boolean, post?: string) => boolean) & { last?: { us: number; them: number } };

export const winProb = (a: number, b: number, homeA: number): number => logistic((a - b + homeA * HOME_COURT) / WIN_SCALE);

function teamWins(rng: Rng, a: Team, b: Team, home: number): boolean {
  return chance(rng, winProb(a.strength, b.strength, home));
}

/** A plausible final score for a game whose winner is already known. */
export function scoreFor(rng: Rng, level: LevelKey, diff: number, aWon: boolean): [number, number] {
  const base = GAME_POINTS[level];
  const total = base * 2 + normal(rng, 0, base * 0.09);
  const margin = Math.max(1, Math.round(Math.abs(normal(rng, Math.abs(diff) * 0.9, base * 0.1))));
  const win = Math.round((total + margin) / 2);
  const lose = win - margin;
  return aWon ? [win, lose] : [lose, win];
}

/** Plays schedule rounds [league.round, toRound). Each round is a random perfect matching. */
export function playRounds(rng: Rng, league: League, toRound: number, hook: UserGameHook | null): void {
  const teams = league.teams;
  const idx = teams.map((_, i) => i);
  while (league.round < toRound) {
    shuffle(rng, idx);
    for (let i = 0; i + 1 < idx.length; i += 2) {
      const a = teams[idx[i]];
      const b = teams[idx[i + 1]];
      const aHome = chance(rng, 0.5);
      const userA = hook && a.id === league.userTeamId;
      const userB = hook && b.id === league.userTeamId;
      let aWon: boolean;
      if (userA) aWon = hook!(b, aHome);
      else if (userB) aWon = !hook!(a, !aHome);
      else aWon = teamWins(rng, a, b, aHome ? 1 : -1);
      if (aWon) {
        a.w++;
        b.l++;
      } else {
        b.w++;
        a.l++;
      }
    }
    league.round++;
  }
}

export const winPct = (t: Team): number => (t.w + t.l > 0 ? t.w / (t.w + t.l) : 0);

export function standings(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => winPct(b) - winPct(a) || b.strength - a.strength);
}

/** A single game between two teams; `homeA` = 1 if a is at home, 0 neutral, -1 away. Returns a's and b's points. */
function game(rng: Rng, league: League, a: Team, b: Team, homeA: number, round: string, hook: UserGameHook | null): [number, number] {
  if (hook && (a.id === league.userTeamId || b.id === league.userTeamId)) {
    const userA = a.id === league.userTeamId;
    const won = userA ? hook(b, homeA > 0, round) : hook(a, homeA < 0, round);
    const sc = hook.last ?? { us: 1, them: 0 };
    // the hook decides the winner; keep the score consistent with it
    const [w, l] = [Math.max(sc.us, sc.them), Math.min(sc.us, sc.them)];
    const us = won ? w : l;
    const them = won ? (l === w ? w - 1 : l) : l === w ? w + 1 : w;
    return userA ? [us, them] : [them, us];
  }
  const aWon = teamWins(rng, a, b, homeA);
  return scoreFor(rng, league.level, a.strength - b.strength, aWon);
}

/** Best-of-N series. `a` has home court. */
export function playSeries(
  rng: Rng,
  league: League,
  a: Team,
  b: Team,
  bestOf: number,
  round: string,
  hook: UserGameHook | null,
  neutral = false,
): { winner: Team; wa: number; wb: number; games: [number, number][]; result: SeriesResult } {
  const need = Math.ceil(bestOf / 2);
  let wa = 0;
  let wb = 0;
  let g = 0;
  const games: [number, number][] = [];
  // 2-2-1-1-1 home pattern
  const homePattern = [1, 1, -1, -1, 1, -1, 1];
  while (wa < need && wb < need) {
    const home = neutral ? 0 : bestOf === 1 ? 1 : homePattern[g % 7];
    const sc = game(rng, league, a, b, home, round, hook);
    games.push(sc);
    if (sc[0] > sc[1]) wa++;
    else wb++;
    g++;
  }
  const winner = wa > wb ? a : b;
  return { winner, wa, wb, games, result: { a: a.id, b: b.id, wa, wb, winner: winner.id, games } };
}

function runBracket(
  rng: Rng,
  league: League,
  seeds: Team[],
  roundNames: string[],
  bestOf: number[],
  hook: UserGameHook | null,
  neutral: boolean[],
  pairing: 'standard' | 'ncaa' = 'standard',
): Bracket {
  const rounds: Bracket['rounds'] = [];
  let alive = seeds;
  if (pairing === 'standard') {
    // 1 v N, 2 v N-1 ... kept in bracket order so that winners meet like a real bracket
    const order = bracketOrder(alive.length);
    alive = order.map((i) => seeds[i]);
  }
  for (let r = 0; r < roundNames.length && alive.length > 1; r++) {
    const series: Bracket['rounds'][0]['series'] = [];
    const next: Team[] = [];
    for (let i = 0; i + 1 < alive.length; i += 2) {
      let a = alive[i];
      let b = alive[i + 1];
      // better seed (earlier in `seeds`) gets home court
      if (seeds.indexOf(b) < seeds.indexOf(a)) [a, b] = [b, a];
      const res = playSeries(rng, league, a, b, bestOf[r], roundNames[r], hook, neutral[r]);
      series.push(res.result);
      next.push(res.winner);
    }
    rounds.push({ name: roundNames[r], series });
    alive = next;
  }
  return { rounds, champion: alive[0].id };
}

/** Standard bracket order for n = 2^k seeds: [0, n-1, n/2-1, n/2, ...]. */
export function bracketOrder(n: number): number[] {
  let order = [0];
  while (order.length < n) {
    const m = order.length * 2;
    order = order.flatMap((x) => [x, m - 1 - x]);
  }
  return order;
}

// ---------- NBA ----------

export function nbaPlayoffs(rng: Rng, league: League, hook: UserGameHook | null): { bracket: Bracket; playIn: string[]; seeds: Record<string, number> } {
  const seedsByConf: Record<string, Team[]> = {};
  const playIn: string[] = [];
  const playInSeries: SeriesResult[] = [];
  const seedMap: Record<string, number> = {};
  for (const conf of ['East', 'West']) {
    const st = standings(league.teams.filter((t) => t.conf === conf));
    const top6 = st.slice(0, 6);
    const [s7, s8, s9, s10] = st.slice(6, 10);
    playIn.push(s7.id, s8.id, s9.id, s10.id);
    const g1 = playSeries(rng, league, s7, s8, 1, 'Play-In', hook);
    const loser78 = g1.winner === s7 ? s8 : s7;
    const g2 = playSeries(rng, league, s9, s10, 1, 'Play-In', hook);
    const g3 = playSeries(rng, league, loser78, g2.winner, 1, 'Play-In', hook);
    playInSeries.push(
      { ...g1.result, label: `${conf} 7 vs 8 (winner is the 7 seed)` },
      { ...g2.result, label: `${conf} 9 vs 10` },
      { ...g3.result, label: `${conf} final play-in game (winner is the 8 seed)` },
    );
    const seeds = [...top6, g1.winner, g3.winner];
    seeds.forEach((t, i) => (seedMap[t.id] = i + 1));
    seedsByConf[conf] = seeds;
  }
  const east = runBracket(rng, league, seedsByConf.East, ['First round', 'Conference semifinals', 'Conference finals'], [7, 7, 7], hook, [false, false, false]);
  const west = runBracket(rng, league, seedsByConf.West, ['First round', 'Conference semifinals', 'Conference finals'], [7, 7, 7], hook, [false, false, false]);
  const eChamp = league.teams.find((t) => t.id === east.champion)!;
  const wChamp = league.teams.find((t) => t.id === west.champion)!;
  const [a, b] = winPct(eChamp) >= winPct(wChamp) ? [eChamp, wChamp] : [wChamp, eChamp];
  const fin = playSeries(rng, league, a, b, 7, 'NBA Finals', hook);
  const rounds = east.rounds.map((r, i) => ({ name: r.name, series: [...r.series, ...west.rounds[i].series] }));
  rounds.push({ name: 'NBA Finals', series: [fin.result] });
  return { bracket: { rounds, champion: fin.winner.id, playIn: playInSeries }, playIn, seeds: seedMap };
}

// ---------- NCAA: March Madness (64-team field) ----------

export function marchMadness(rng: Rng, league: League, hook: UserGameHook | null): Bracket {
  const ranked = [...league.teams].sort(
    (a, b) => winPct(b) + b.strength / 60 + normal(rng, 0, 0.03) - (winPct(a) + a.strength / 60),
  );
  const field = ranked.slice(0, 64);
  // 4 regions, seeds 1-16, snake order
  const regions: Team[][] = [[], [], [], []];
  field.forEach((t, i) => {
    const line = Math.floor(i / 4);
    const pos = i % 4;
    regions[line % 2 === 0 ? pos : 3 - pos].push(t);
  });
  const order = bracketOrder(16);
  const seeds: Team[] = [];
  for (const reg of regions) for (const i of order) seeds.push(reg[i]);
  return runBracket(
    rng,
    league,
    seeds,
    ['First round', 'Second round', 'Sweet 16', 'Elite Eight', 'Final Four', 'National championship'],
    [1, 1, 1, 1, 1, 1],
    hook,
    [true, true, true, true, true, true],
    'ncaa',
  );
}

// ---------- HS / G League / EuroLeague ----------

export function hsPlayoffs(rng: Rng, league: League, hook: UserGameHook | null): Bracket {
  const seeds = standings(league.teams).slice(0, HS_PLAYOFF_TEAMS);
  return runBracket(rng, league, seeds, ['State first round', 'State quarterfinals', 'State semifinals', 'State final'], [1, 1, 1, 1], hook, [false, false, true, true]);
}

export function glPlayoffs(rng: Rng, league: League, hook: UserGameHook | null): Bracket {
  const seeds = standings(league.teams).slice(0, 8);
  const fin = league.level === 'INT' ? 'Finals' : 'G League Finals';
  return runBracket(rng, league, seeds, ['Quarterfinals', 'Semifinals', fin], [1, 1, 3], hook, [false, false, false]);
}

export function euPlayoffs(rng: Rng, league: League, hook: UserGameHook | null): Bracket {
  const seeds = standings(league.teams).slice(0, 8);
  return runBracket(rng, league, seeds, ['Playoffs', 'Final Four semifinal', 'EuroLeague final'], [5, 1, 1], hook, [false, true, true]);
}

/** Did `teamId` reach `roundIdx` (0-based) in the bracket? */
export function bracketExit(bracket: Bracket, teamId: string): { lastRound: string | null; champion: boolean } {
  let last: string | null = null;
  for (const r of bracket.rounds) {
    if (r.series.some((s) => s.a === teamId || s.b === teamId)) last = r.name;
  }
  return { lastRound: last, champion: bracket.champion === teamId };
}
