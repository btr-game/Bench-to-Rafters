// Awards rank the player against everyone in his league (§10).

import { FAN_VOTE, LEVELS, MIN_GAMES_AWARD_FRAC } from '../balance';
import type { AwardRace, League, LevelKey, StatLine, Team } from '../types';
import { genProfile, perGame, valuePerGame } from '../sim/statModel';

export interface Cand {
  id: string;
  name: string;
  team: Team;
  line: StatLine;
  value: number;
  fhv: number;
  rep: number;
  rookie: boolean;
  starter: boolean;
  prevValue: number | null;
  def: number;
  isUser: boolean;
  age: number;
}

export interface UserCandInput {
  name: string;
  teamId: string;
  line: StatLine;
  firstHalfLine: StatLine;
  rep: number;
  rookie: boolean;
  per: number;
  int: number;
  prevValue: number | null;
  age: number;
}

function defScore(per: number, int: number, l: StatLine, team: Team): number {
  const g = Math.max(1, l.gp);
  return 0.3 * per + 0.3 * int + (4 * l.stl) / g + (4 * l.blk) / g + (team.w - team.l) * 0.06;
}

export function buildCandidates(league: League, user: UserCandInput | null): Cand[] {
  const out: Cand[] = [];
  for (const t of league.teams) {
    for (const p of t.roster) {
      if (!p.s || p.s.gp === 0) continue;
      const a = genProfile(p).attrs;
      out.push({
        id: String(p.id),
        name: p.name,
        team: t,
        line: p.s,
        value: valuePerGame(p.s),
        fhv: p.firstHalfValue ?? 0,
        rep: p.rep,
        rookie: !!p.rookie,
        starter: !!p.starter,
        prevValue: p.prevValue ?? null,
        def: defScore(a.PER, a.INT, p.s, t),
        isUser: false,
        age: p.age,
      });
    }
  }
  if (user && user.line.gp > 0) {
    const team = league.teams.find((t) => t.id === user.teamId)!;
    out.push({
      id: 'USER',
      name: user.name,
      team,
      line: user.line,
      value: valuePerGame(user.line),
      fhv: valuePerGame(user.firstHalfLine),
      rep: user.rep,
      rookie: user.rookie,
      starter: user.line.gs >= user.line.gp / 2,
      prevValue: user.prevValue,
      def: defScore(user.per, user.int, user.line, team),
      isUser: true,
      age: user.age,
    });
  }
  return out;
}

export interface AwardOutcome {
  wins: { key: string; label: string }[];
  races: AwardRace[];
  // generated players who won major awards (for rival tracking)
  winners: { key: string; name: string; team: string }[];
  allStarIds: Set<string>;
}

function race(award: string, ranked: Cand[], scoreOf: (c: Cand) => number, n = 3): AwardRace {
  const userIdx = ranked.findIndex((c) => c.isUser);
  return {
    award,
    userRank: userIdx >= 0 ? userIdx + 1 : null,
    top: ranked.slice(0, n).map((c) => ({ name: c.name, team: c.team.abbr, value: Math.round(scoreOf(c) * 10) / 10 })),
  };
}

const minGames = (level: LevelKey): number => Math.round(LEVELS[level].games * MIN_GAMES_AWARD_FRAC);

export function nbaAwards(cands: Cand[]): AwardOutcome {
  const out: AwardOutcome = { wins: [], races: [], winners: [], allStarIds: new Set() };
  const g65 = minGames('NBA');
  const elig = cands.filter((c) => c.line.gp >= g65);
  const mvpScore = (c: Cand) => c.value + (c.team.w - 41) * 0.25;
  const mvp = [...elig].sort((a, b) => mvpScore(b) - mvpScore(a));
  out.races.push(race('MVP', mvp, mvpScore));
  if (mvp[0]) {
    if (mvp[0].isUser) out.wins.push({ key: 'MVP', label: 'MVP' });
    else out.winners.push({ key: 'MVP', name: mvp[0].name, team: mvp[0].team.abbr });
  }
  const byValue = [...elig].sort((a, b) => b.value - a.value);
  byValue.slice(0, 15).forEach((c, i) => {
    if (c.isUser) {
      const team = Math.floor(i / 5) + 1;
      out.wins.push({ key: `ALLNBA${team}`, label: `All-NBA ${['1st', '2nd', '3rd'][team - 1]} Team` });
    }
  });
  // All-Star: first-half value plus 20% reputation (fan vote), 12 per conference
  for (const conf of ['East', 'West']) {
    const pool = cands.filter((c) => c.team.conf === conf && c.line.gp >= 20);
    const score = (c: Cand) => (1 - FAN_VOTE.share) * c.fhv + FAN_VOTE.share * (c.rep / 100) * FAN_VOTE.scale;
    pool.sort((a, b) => score(b) - score(a));
    pool.slice(0, 12).forEach((c) => {
      out.allStarIds.add(c.id);
      if (c.isUser) out.wins.push({ key: 'ALLSTAR', label: 'All-Star' });
    });
  }
  const rookies = cands.filter((c) => c.rookie && c.line.gp >= 30).sort((a, b) => b.value - a.value);
  if (rookies.some((c) => c.isUser)) out.races.push(race('Rookie of the Year', rookies, (c) => c.value));
  rookies.slice(0, 10).forEach((c, i) => {
    if (!c.isUser) return;
    out.wins.push(i === 0 ? { key: 'ROY', label: 'Rookie of the Year' } : { key: 'ALLROOKIE', label: 'All-Rookie Team' });
  });
  const dpoy = cands.filter((c) => c.line.gp >= g65 && c.line.min / c.line.gp >= 24).sort((a, b) => b.def - a.def);
  if (dpoy[0]?.isUser) out.wins.push({ key: 'DPOY', label: 'Defensive Player of the Year' });
  if (dpoy.some((c) => c.isUser)) out.races.push(race('DPOY', dpoy, (c) => c.def));
  const sixth = cands.filter((c) => c.line.gp >= 50 && c.line.gs < c.line.gp / 2).sort((a, b) => b.value - a.value);
  if (sixth[0]?.isUser) out.wins.push({ key: 'SIXTH', label: 'Sixth Man of the Year' });
  const mip = cands
    .filter((c) => c.prevValue !== null && c.line.gp >= 50)
    .sort((a, b) => b.value - (b.prevValue ?? 0) - (a.value - (a.prevValue ?? 0)));
  if (mip[0]?.isUser) out.wins.push({ key: 'MIP', label: 'Most Improved Player' });
  const ppg = (c: Cand) => perGame(c.line, 'pts');
  const scorers = [...elig].sort((a, b) => ppg(b) - ppg(a));
  out.races.push(race('Scoring title', scorers, ppg));
  if (scorers[0]?.isUser) out.wins.push({ key: 'SCORING', label: 'Scoring title' });
  return out;
}

/** NCAA, G League, EuroLeague, high school: all-league teams and a player of the year. */
export function simpleAwards(league: League, cands: Cand[], userConf: string | null): AwardOutcome {
  const out: AwardOutcome = { wins: [], races: [], winners: [], allStarIds: new Set() };
  const minG = Math.round(LEVELS[league.level].games * 0.6);
  const elig = cands.filter((c) => c.line.gp >= minG);
  const poyScore = (c: Cand) => c.value + (c.team.w - c.team.l) * 0.15;
  const ranked = [...elig].sort((a, b) => poyScore(b) - poyScore(a));
  const byVal = [...elig].sort((a, b) => b.value - a.value);
  const userVal = byVal.findIndex((c) => c.isUser);
  if (league.level === 'NCAA') {
    out.races.push(race('Naismith Player of the Year', ranked, poyScore));
    if (ranked[0]?.isUser) out.wins.push({ key: 'NAISMITH', label: 'Naismith Player of the Year' });
    else if (ranked[0]) out.winners.push({ key: 'NAISMITH', name: ranked[0].name, team: ranked[0].team.name });
    if (userVal >= 0 && userVal < 10) out.wins.push({ key: 'AA1', label: 'All-American 1st Team' });
    else if (userVal >= 10 && userVal < 20) out.wins.push({ key: 'AA2', label: 'All-American 2nd Team' });
    if (userConf) {
      const conf = ranked.filter((c) => c.team.conf === userConf);
      const ci = conf.findIndex((c) => c.isUser);
      if (ci === 0) out.wins.push({ key: 'CONFPOY', label: `${userConf} Player of the Year` });
      if (ci >= 0 && ci < 5) out.wins.push({ key: 'ALLCONF', label: `All-${userConf}` });
    }
  } else if (league.level === 'HSV') {
    if (userVal >= 0 && userVal < 10) out.wins.push({ key: 'ALLSTATE', label: 'All-State' });
    out.races.push(race('State Player of the Year', ranked, poyScore));
  } else if (league.level === 'GL' || league.level === 'EU' || league.level === 'INT') {
    const lname = league.level === 'GL' ? 'G League' : league.level === 'EU' ? 'EuroLeague' : (league.teams[0]?.conf ?? 'League');
    out.races.push(race(`${lname} MVP`, ranked, poyScore));
    if (ranked[0]?.isUser) out.wins.push({ key: `${league.level}MVP`, label: `${lname} MVP` });
    if (userVal >= 0 && userVal < 5) out.wins.push({ key: `${league.level}ALL`, label: `All-${lname} Team` });
  }
  return out;
}
