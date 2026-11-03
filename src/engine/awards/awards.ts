// Awards rank the player against everyone in his league (§10).

import { ALL_STAR_BAR, FAN_VOTE, LEVELS, MIN_GAMES_AWARD_FRAC, MVP_BAR } from '../balance';
import type { AwardRace, League, LevelKey, StatLine, Team } from '../types';
import { genProfile, perGame, valuePerGame } from '../sim/statModel';

interface Cand {
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
  friend?: boolean; // round 35: a classmate's player (career/friendLeague.ts)
  /** Round 36: his MVP bar (MVP_BAR), taken off his MVP score: voters want a clear case. */
  mvpBar?: number;
  allStarTop?: number; // round 37: the All-Star cut-off for him (see UserCandInput)
  age: number;
  ovr: number;
}

/** Round 35: a classmate's player, as his season line has him (career/friendLeague.ts). */
export interface FriendCandInput {
  id: string;
  name: string;
  teamId: string;
  line: StatLine;
  rep: number;
  rookie: boolean;
  prevValue: number | null;
  age: number;
  ovr: number;
}

interface UserCandInput {
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
  ovr?: number;
  dpoyWins?: number; // voter fatigue: past wins make the next one harder
  mvpWins?: number; // round 36: the same for the MVP (MVP_BAR)
  allStarTop?: number; // round 37: how far down his conference's vote he can make the team (a tutorial level keeps all twelve)
}

// ratings above 85 count for less: past that, voters see the stops, not the rating
const kneeDef = (v: number) => (v > 85 ? 85 + (v - 85) * 0.4 : v);

function defScore(per: number, int: number, l: StatLine, team: Team): number {
  const g = Math.max(1, l.gp);
  return 0.3 * kneeDef(per) + 0.3 * kneeDef(int) + (4 * l.stl) / g + (4 * l.blk) / g + (team.w - team.l) * 0.06;
}

export function buildCandidates(league: League, user: UserCandInput | null, lines?: Map<number, StatLine>, friends?: FriendCandInput[]): Cand[] {
  const out: Cand[] = [];
  for (const t of league.teams) {
    for (const p0 of t.roster) {
      const p = lines?.has(p0.id) ? { ...p0, s: lines.get(p0.id) } : p0;
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
        ovr: p.ovr,
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
      def: defScore(user.per, user.int, user.line, team) - 1.5 * (user.dpoyWins ?? 0),
      isUser: true,
      age: user.age,
      ovr: user.ovr ?? 0,
      mvpBar: MVP_BAR.margin + MVP_BAR.fatigue * (user.mvpWins ?? 0),
      allStarTop: user.allStarTop,
    });
  }
  // round 35: classmates, with their season's numbers. His line carries no defensive numbers, so
  // he stays out of the defensive race, and he counts as a starter (no Sixth Man of the Year).
  for (const f of friends ?? []) {
    const team = league.teams.find((t) => t.id === f.teamId);
    if (!team || f.line.gp === 0) continue;
    const value = valuePerGame(f.line);
    out.push({ id: `F:${f.id}`, name: f.name, team, line: f.line, value, fhv: value, rep: f.rep, rookie: f.rookie, starter: true, prevValue: f.prevValue, def: -99, isUser: false, friend: true, age: f.age, ovr: f.ovr });
  }
  return out;
}

export interface AwardOutcome {
  wins: { key: string; label: string }[];
  races: AwardRace[];
  // generated players who won major awards (for rival tracking); round 35: or a classmate
  winners: { key: string; name: string; team: string; friend?: boolean }[];
  allStarIds: Set<string>;
}

function race(award: string, ranked: Cand[], scoreOf: (c: Cand) => number, n = 3): AwardRace {
  const userIdx = ranked.findIndex((c) => c.isUser);
  return {
    award,
    userRank: userIdx >= 0 ? userIdx + 1 : null,
    top: ranked.slice(0, n).map((c) => ({
      name: c.name,
      team: c.team.abbr,
      value: Math.round(scoreOf(c) * 10) / 10,
      line: statText(c.line),
      ovr: Math.round(c.ovr),
      isUser: c.isUser,
    })),
  };
}

/** "27.4 PTS · 8.1 REB · 6.3 AST" */
export function statText(l: StatLine): string {
  if (l.gp <= 0) return '';
  return `${perGame(l, 'pts').toFixed(1)} PTS · ${perGame(l, 'reb').toFixed(1)} REB · ${perGame(l, 'ast').toFixed(1)} AST`;
}

const minGames = (level: LevelKey): number => Math.round(LEVELS[level].games * MIN_GAMES_AWARD_FRAC);

export function nbaAwards(cands: Cand[]): AwardOutcome {
  const out: AwardOutcome = { wins: [], races: [], winners: [], allStarIds: new Set() };
  const g65 = minGames('NBA');
  const elig = cands.filter((c) => c.line.gp >= g65);
  const mvpScore = (c: Cand) => c.value + (c.team.w - 41) * 0.25 - (c.mvpBar ?? 0);
  const mvp = [...elig].sort((a, b) => mvpScore(b) - mvpScore(a));
  out.races.push(race('MVP', mvp, mvpScore, 5));
  if (mvp[0]) {
    if (mvp[0].isUser) out.wins.push({ key: 'MVP', label: 'MVP' });
    else out.winners.push({ key: 'MVP', name: mvp[0].name, team: mvp[0].team.abbr, ...(mvp[0].friend ? { friend: true } : {}) });
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
    // round 36: twelve named, but he makes it only from the top ALL_STAR_BAR.userTop
    const me = pool.findIndex((c) => c.isUser);
    if (me >= (pool[me]?.allStarTop ?? ALL_STAR_BAR.userTop) && me < 12) pool.splice(me, 1);
    pool.slice(0, 12).forEach((c) => {
      out.allStarIds.add(c.id);
      if (c.isUser) out.wins.push({ key: 'ALLSTAR', label: 'All-Star' });
    });
  }
  const rookies = cands.filter((c) => c.rookie && c.line.gp >= 30).sort((a, b) => b.value - a.value);
  if (rookies.length > 0) out.races.push(race('Rookie of the Year', rookies, (c) => c.value));
  rookies.slice(0, 10).forEach((c, i) => {
    if (!c.isUser) return;
    out.wins.push(i === 0 ? { key: 'ROY', label: 'Rookie of the Year' } : { key: 'ALLROOKIE', label: 'All-Rookie Team' });
  });
  const dpoy = cands.filter((c) => c.line.gp >= g65 && c.line.min / c.line.gp >= 24).sort((a, b) => b.def - a.def);
  if (dpoy[0]?.isUser) out.wins.push({ key: 'DPOY', label: 'Defensive Player of the Year' });
  if (dpoy.length > 0) out.races.push(race('DPOY', dpoy, (c) => c.def));
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
  // the other per-game leaders (round 12)
  const leaders: [string, string, 'ast' | 'reb' | 'stl' | 'blk'][] = [
    ['ASTLEAD', 'Assists title', 'ast'],
    ['REBLEAD', 'Rebounding title', 'reb'],
    ['STLLEAD', 'Steals title', 'stl'],
    ['BLKLEAD', 'Blocks title', 'blk'],
  ];
  for (const [key, label, stat] of leaders) {
    const per = (c: Cand) => perGame(c.line, stat);
    const ranked = [...elig].sort((a, b) => per(b) - per(a));
    out.races.push(race(label, ranked, per));
    if (ranked[0]?.isUser) out.wins.push({ key, label });
  }
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

export interface MvpLadder {
  rows: { name: string; team: string; record: string; line: string; score: number; isUser: boolean }[];
  userRank: number | null;
  gap: number; // the user's score behind the leader (0 when he leads)
  games: number; // games played so far by the leaders
}

/**
 * The MVP race as it stands (round 11: "show the MVP race at the side"): the same score the
 * voters use at the end (value per game plus the team's record), from the season so far.
 */
export function mvpLadder(league: League, user: UserCandInput | null, n = 5, lines?: Map<number, StatLine>, friends?: FriendCandInput[]): MvpLadder {
  const cands = buildCandidates(league, user, lines, friends);
  const maxGp = Math.max(1, ...cands.map((c) => c.line.gp));
  // nobody who has missed most of the season so far
  const elig = cands.filter((c) => c.line.gp >= maxGp * 0.6);
  const score = (c: Cand) => {
    const g = c.team.w + c.team.l;
    return c.value + (g > 0 ? (c.team.w / g - 0.5) * 82 : 0) * 0.25 - (c.mvpBar ?? 0);
  };
  const ranked = [...elig].sort((a, b) => score(b) - score(a));
  const userIdx = ranked.findIndex((c) => c.isUser);
  const lead = ranked[0] ? score(ranked[0]) : 0;
  const pick = ranked.slice(0, n);
  if (userIdx >= n) pick.push(ranked[userIdx]);
  return {
    rows: pick.map((c) => ({ name: c.name, team: c.team.abbr, record: `${c.team.w}–${c.team.l}`, line: statText(c.line), score: Math.round(score(c) * 10) / 10, isUser: c.isUser })),
    userRank: userIdx >= 0 ? userIdx + 1 : null,
    gap: userIdx >= 0 ? Math.round((lead - score(ranked[userIdx])) * 10) / 10 : 0,
    games: maxGp,
  };
}
