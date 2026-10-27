// The in-season loop: preseason → first half → midseason → second half + postseason.

import {
  AGENT_CUT,
  DEEP_BENCH,
  HALF_PLANS,
  HS_VARSITY_SIZE,
  IMPACT_MULT,
  LEVELS,
  RECRUIT,
  ROLE_MINUTES,
  STAT,
} from '../balance';
import { chance, clamp, int, normal, range, type Rng } from '../rng';
import type { GameLog, GameState, HalfPlan, League, LevelKey, RoleKey, SeasonRecord, SeasonState, StatLine, Team } from '../types';
import { ovrOf } from '../player/ovr';
import { applyHalfGrowth, perfFactor } from '../player/growth';
import { healDays, rollInjury } from '../player/injury';
import { scoutEstimate } from '../player/create';
import {
  addLine,
  emptyLine,
  expected,
  expectedGameScore,
  gameScore,
  perGame,
  sampleGame,
  sumLines,
  usageWeight,
  valuePerGame,
  type Profile,
} from '../sim/statModel';
import { accumulateHalf, resetSeasonLines, teamUsageMean, type UserSlot } from '../sim/genStats';
import {
  bracketExit,
  euPlayoffs,
  glPlayoffs,
  hsPlayoffs,
  marchMadness,
  nbaPlayoffs,
  playRounds,
  standings,
  winProb,
  type UserGameHook,
} from '../sim/leagueSim';
import { buildEu, buildGl, buildHs, buildNba, buildNcaa, schoolRoster, USER_SCHOOL_ID } from '../world/leagues';
import { rosterStrength } from '../world/gen';
import { buildCandidates, nbaAwards, simpleAwards, type AwardOutcome } from '../awards/awards';
import { adjust, conferenceRank, milestone, pushDecision, rankOnRoster, roleWithTrust, teamById, userOvr } from './common';
import { queueMidseasonEvents } from '../events/resolver';
import { quickNbaSeason, warmUpNba } from './nbaYear';
import { reactionsForSeason } from '../story/reactions';

export function activeLeague(s: GameState): League {
  return (s.stage === 'NBA' ? s.nba : s.league)!;
}

export function userProfile(s: GameState): Profile {
  const p = s.player;
  return { attrs: p.attrs, height: p.height, wingspan: p.wingspan, range: p.range, offhand: p.offhand };
}

// ---------- preseason ----------

export function beginSeason(s: GameState): void {
  s.notes = [];
  const ovr = userOvr(s);
  let league: League;
  let teamId: string;
  let level: LevelKey;
  if (s.stage === 'HS') {
    const school = schoolRoster(s);
    const schoolRank = 1 + school.filter((g) => g.ovr > ovr).length;
    const varsity = schoolRank <= HS_VARSITY_SIZE;
    const squad = varsity ? school.slice(0, HS_VARSITY_SIZE - 1) : school.slice(HS_VARSITY_SIZE, HS_VARSITY_SIZE * 2);
    league = buildHs(s, s.year, varsity, squad, rosterStrength(squad));
    teamId = USER_SCHOOL_ID;
    level = varsity ? 'HSV' : 'HSJV';
    milestone(s, varsity ? 'varsity' : 'jv');
    if (varsity) milestone(s, 'jv');
    s.league = league;
  } else if (s.stage === 'NBA') {
    league = s.nba!;
    resetSeasonLines(league);
    teamId = s.teamId!;
    level = 'NBA';
    s.league = null;
  } else {
    teamId = s.teamId!;
    level = s.stage as LevelKey;
    league = s.stage === 'NCAA' ? buildNcaa(s, s.year, teamId) : s.stage === 'GL' ? buildGl(s, s.year, teamId) : buildEu(s, s.year, teamId);
    s.league = league;
  }
  league.userTeamId = teamId;
  s.teamId = teamId;
  const team = teamById(league, teamId)!;
  const rank = rankOnRoster(team, ovr);
  const role = roleWithTrust(rank, s.player.trust);
  const season: SeasonState = {
    year: s.year,
    level,
    half: 0,
    plan: 'balanced',
    plans: [],
    role,
    roleRank: rank,
    games: [],
    postGames: [],
    ovrStart: ovr,
    attrsStart: { ...s.player.attrs },
    halfLines: [],
    injuredGames: 0,
    midReport: [],
    assignedGL: false,
    summary: null,
  };
  s.season = season;
  s.step = 'preseason';
  pushPlanDecision(s, 1);
}

export function pushPlanDecision(s: GameState, half: 1 | 2): void {
  const injured = !!s.player.injury && s.player.injury.key !== 'dtd';
  const plans: { id: HalfPlan; label: string; detail: string }[] = [
    { id: 'balanced', label: 'Balanced', detail: 'Normal growth and risk.' },
    { id: 'grind', label: 'Grind', detail: 'Growth ×1.25, injury risk ×1.6, morale −3.' },
    { id: 'recovery', label: 'Recovery', detail: 'Growth ×0.8, injury risk ×0.55, heal faster, morale +3.' },
    { id: 'spotlight', label: 'Spotlight', detail: 'Growth ×0.85. Reputation and endorsements up, coach trust −2.' },
    { id: 'teamfirst', label: 'Team first', detail: 'Growth ×0.95. Coach trust +6, morale +2.' },
  ];
  pushDecision(s, {
    kind: 'plan',
    title: half === 1 ? 'First-half plan' : 'Second-half plan',
    text: injured ? 'You are injured. Recovery is the only plan available.' : 'Pick how you approach the next half of the season.',
    choices: plans.map((p) => ({ id: p.id, label: p.label, detail: p.detail, disabled: injured && p.id !== 'recovery' })),
    data: { half },
  });
}

// ---------- user games ----------

interface HalfAcc {
  minutes: number;
  games: number;
  played: number;
  gmsc: number;
  expGmsc: number;
  injuredGames: number;
  line: StatLine;
}

const newAcc = (): HalfAcc => ({ minutes: 0, games: 0, played: 0, gmsc: 0, expGmsc: 0, injuredGames: 0, line: emptyLine() });

function rollMinutes(rng: Rng, role: RoleKey, level: LevelKey, post: boolean): number {
  const len = LEVELS[level].gameLen;
  if (role === 'deep') {
    if (!chance(rng, post ? DEEP_BENCH.appearChance / 2 : DEEP_BENCH.appearChance)) return 0;
    return int(rng, DEEP_BENCH.minutes[0], DEEP_BENCH.minutes[1]);
  }
  const [a, b] = ROLE_MINUTES[role];
  const bump = post && (role === 'key' || role === 'starter') ? 2 : 0;
  return clamp(Math.round(((range(rng, a, b) + bump) * len) / 48), 0, len);
}

const BASE_SCORE: Record<LevelKey, number> = { HSJV: 48, HSV: 56, NCAA: 72, GL: 115, EU: 82, NBA: 113 };

function makeHook(s: GameState, league: League, level: LevelKey, acc: HalfAcc, slot: UserSlot): UserGameHook {
  const L = LEVELS[level];
  const team = teamById(league, league.userTeamId)!;
  const sorted = [...team.roster].sort((a, b) => b.ovr - a.ovr);
  const replacement = sorted[Math.min(sorted.length - 1, Math.max(0, slot.rank - 1))]?.ovr ?? L.avg;
  const usageMean = teamUsageMean(level, team.roster, slot);
  const daysPerGame = L.seasonDays / L.games;
  return (opp: Team, home: boolean, post?: string) => {
    const season = s.season!;
    const p = s.player;
    const rng = s.rng;
    const ovr = ovrOf(p.attrs, p.pos);
    let line: StatLine | null = null;
    let minutes = 0;
    acc.games++;
    if (p.injury && p.injury.key !== 'dtd') {
      acc.injuredGames++;
      season.injuredGames++;
    } else if (!season.ineligibleHalf || post) {
      minutes = rollMinutes(rng, season.role, level, !!post);
      if (p.injury && p.injury.key === 'dtd') minutes = chance(rng, 0.5) ? 0 : Math.round(minutes * 0.85);
      if (minutes > 0) {
        const moraleMult = 1 + ((p.morale - 50) / 50) * STAT.moraleSwing;
        const e = expected(userProfile(s), level, minutes, (usageWeight(p.attrs) / usageMean) * (season.fuel ? 1.06 : 1), moraleMult);
        line = sampleGame(rng, e, season.role === 'key' || season.role === 'starter');
        acc.expGmsc += expectedGameScore(e);
        acc.gmsc += gameScore(line);
        acc.minutes += minutes;
        acc.played++;
        addLine(acc.line, line);
        rollInjury(rng, p, season.plan, minutes);
      }
    }
    healDays(p, daysPerGame * (season.plan === 'recovery' ? 1.3 : 1));
    const impact = line ? (ovr - replacement) * (minutes / L.gameLen) * IMPACT_MULT : 0;
    const win = chance(rng, winProb(team.strength + impact, opp.strength, post && level !== 'NBA' ? 0 : home ? 1 : -1));
    let us = Math.round(BASE_SCORE[level] + normal(rng, 0, 9));
    if (line && line.pts > us - 15) us = line.pts + int(rng, 15, 30);
    const margin = int(rng, 1, 18);
    const them = win ? Math.max(20, us - margin) : us + margin;
    const log: GameLog = { n: (post ? season.postGames : season.games).length + 1, opp: opp.short, home, res: win ? 'W' : 'L', us, them, line, post };
    (post ? season.postGames : season.games).push(log);
    if (line && level === 'NBA') {
      s.nbaGames++;
      milestone(s, 'debut');
      if (line.pts >= 30) milestone(s, 'thirty');
    }
    return win;
  };
}

function userSlot(s: GameState, team: Team, level: LevelKey): UserSlot {
  const [a, b] = ROLE_MINUTES[s.season!.role];
  const mins = s.season!.role === 'deep' ? DEEP_BENCH.appearChance * 3 : ((a + b) / 2) * (LEVELS[level].gameLen / 48);
  return { teamId: team.id, rank: s.season!.roleRank, usageW: usageWeight(s.player.attrs), minutes: mins };
}

// ---------- halves ----------

export function playHalf(s: GameState): void {
  const season = s.season!;
  const half = (season.half + 1) as 1 | 2;
  const league = activeLeague(s);
  const level = season.level;
  const toRound = half === 1 ? Math.floor(league.rounds / 2) : league.rounds;
  const games = toRound - league.round;
  const acc = newAcc();
  if (half === 2 && season.assignedGL && s.stage === 'NBA') {
    // the NBA half goes on without the user; the user plays the half in the G League
    playRounds(s.rng, league, toRound, null);
    accumulateHalf(s.rng, league, games, null, half);
    const gl = s.league!;
    const glTeam = teamById(gl, gl.userTeamId)!;
    const glRank = rankOnRoster(glTeam, userOvr(s));
    const keepRole = season.role;
    const keepRank = season.roleRank;
    season.role = roleWithTrust(glRank, 55);
    season.roleRank = glRank;
    const slot = userSlot(s, glTeam, 'GL');
    const glGamesBefore = season.games.length;
    playRounds(s.rng, gl, gl.rounds, makeHook(s, gl, 'GL', acc, slot));
    for (let i = glGamesBefore; i < season.games.length; i++) season.games[i].post = 'G League';
    accumulateHalf(s.rng, gl, gl.rounds, slot, half);
    growthAfterHalf(s, acc, 'GL', userOvr(s));
    season.role = keepRole;
    season.roleRank = keepRank;
  } else {
    const team = teamById(league, league.userTeamId)!;
    const slot = userSlot(s, team, level);
    playRounds(s.rng, league, toRound, makeHook(s, league, level, acc, slot));
    accumulateHalf(s.rng, league, games, slot, half);
    growthAfterHalf(s, acc, level, userOvr(s));
  }
  season.halfLines.push(acc.line);
  season.half = half;
  season.ineligibleHalf = false;
  if (half === 1) beginMidseason(s, acc);
  else finishSeason(s);
}

function growthAfterHalf(s: GameState, acc: HalfAcc, level: LevelKey, ovr: number): void {
  const season = s.season!;
  const p = s.player;
  const L = LEVELS[level];
  const share = acc.games > 0 ? acc.minutes / (acc.games * L.gameLen) : 0;
  const perf = perfFactor(acc.gmsc, acc.expGmsc);
  applyHalfGrowth(s.rng, p, {
    minutesShare: share,
    played: acc.played > 0,
    ovr,
    levelAvg: L.avg,
    perf,
    plan: season.plan,
    outMost: acc.injuredGames > acc.games / 2,
  });
  const plan = HALF_PLANS[season.plan];
  p.morale = adjust(p.morale, plan.morale + (season.role === 'deep' ? -3 : season.role === 'key' ? 2 : 0));
  p.trust = adjust(p.trust, plan.trust + (perf - 1) * 30 + (p.attrs.IQ - L.avg) * 0.04);
  const repGain = plan.rep[1] > 0 ? range(s.rng, plan.rep[0], plan.rep[1]) : 0;
  const v = acc.line.gp > 0 ? valuePerGame(acc.line) : 0;
  const levelW: Record<LevelKey, number> = { HSJV: 0.2, HSV: 0.5, NCAA: 1, GL: 0.6, EU: 0.8, NBA: 1.4 };
  p.rep = clamp(p.rep + repGain + Math.max(0, v - 10) * 0.12 * levelW[level], 0, 100);
  if (season.plan === 'spotlight' && s.stage !== 'HS') {
    const money = (s.stage === 'NBA' ? 0.25 : 0.01) * (1 + p.rep / 25);
    p.bank += money;
    p.earnings += money;
  }
}

function beginMidseason(s: GameState, acc: HalfAcc): void {
  const season = s.season!;
  const league = activeLeague(s);
  const team = teamById(league, league.userTeamId)!;
  const ovr = userOvr(s);
  const oldRole = season.role;
  season.roleRank = rankOnRoster(team, ovr);
  season.role = roleWithTrust(season.roleRank, s.player.trust);
  season.midReport = [
    `${team.name} are ${team.w}–${team.l}.`,
    acc.played > 0
      ? `You averaged ${perGame(acc.line, 'pts').toFixed(1)} points in ${(acc.minutes / Math.max(1, acc.played)).toFixed(1)} minutes over ${acc.played} games.`
      : 'You did not get into a game.',
  ];
  if (oldRole !== season.role) season.midReport.push(`Role change: ${oldRole} → ${season.role}.`);
  if (acc.injuredGames > 0) season.midReport.push(`Missed ${acc.injuredGames} games through injury.`);
  s.step = 'midseason';
  queueMidseasonEvents(s);
  // the G League assignment valve for end-of-bench NBA players
  if (s.stage === 'NBA' && (season.role === 'deep' || season.role === 'bench')) {
    pushDecision(s, {
      kind: 'assign',
      title: 'G League assignment',
      text: 'You are barely playing. The front office would send you to the G League for the second half so you get real minutes.',
      choices: [
        { id: 'go', label: 'Go to the G League', detail: 'Real minutes for the rest of the season. Growth counts.' },
        { id: 'stay', label: 'Stay with the NBA team', detail: 'Practice with the best, play garbage time.' },
      ],
    });
  }
  pushPlanDecision(s, 2);
}

export function assignToGl(s: GameState): void {
  const season = s.season!;
  const nbaTeam = s.teamId!;
  const gl = buildGl(s, s.year, `GL-${nbaTeam}`);
  gl.rounds = Math.floor(LEVELS.GL.games / 2);
  s.league = gl;
  season.assignedGL = true;
  s.affiliateNbaId = nbaTeam;
}

// ---------- season end ----------

function postseason(s: GameState, league: League, hook: UserGameHook): { result: string; champion: boolean; madePost: boolean } {
  const level = s.season!.level;
  const team = teamById(league, league.userTeamId)!;
  const rng = s.rng;
  if (level === 'NBA') {
    const { bracket, seeds } = nbaPlayoffs(rng, league, hook);
    league.bracket = bracket;
    const ex = bracketExit(bracket, team.id);
    const confRank = conferenceRank(team, league);
    if (ex.champion) return { result: 'NBA Champion', champion: true, madePost: true };
    if (!seeds[team.id]) return { result: `Missed the playoffs (${ordinal(confRank)} in the ${team.conf})`, champion: false, madePost: false };
    return { result: `Lost in the ${ex.lastRound}`, champion: false, madePost: true };
  }
  if (level === 'NCAA') {
    const bracket = marchMadness(rng, league, hook);
    league.bracket = bracket;
    const ex = bracketExit(bracket, team.id);
    if (ex.champion) return { result: 'National champion', champion: true, madePost: true };
    if (!ex.lastRound) return { result: 'Missed March Madness', champion: false, madePost: false };
    return { result: `Lost in the ${ex.lastRound} of March Madness`, champion: false, madePost: true };
  }
  if (level === 'HSV' || level === 'GL' || level === 'EU') {
    const bracket = level === 'HSV' ? hsPlayoffs(rng, league, hook) : level === 'GL' ? glPlayoffs(rng, league, hook) : euPlayoffs(rng, league, hook);
    league.bracket = bracket;
    const ex = bracketExit(bracket, team.id);
    const name = level === 'HSV' ? 'State champion' : level === 'GL' ? 'G League champion' : 'EuroLeague champion';
    if (ex.champion) return { result: name, champion: true, madePost: true };
    if (!ex.lastRound) return { result: level === 'HSV' ? 'Missed the state playoffs' : 'Missed the playoffs', champion: false, madePost: false };
    return { result: `Lost in the ${ex.lastRound}`, champion: false, madePost: true };
  }
  const st = standings(league.teams);
  return { result: `JV season · ${ordinal(st.indexOf(team) + 1)} of ${st.length}`, champion: false, madePost: false };
}

export const ordinal = (n: number): string => {
  const sfx = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (sfx[(v - 20) % 10] || sfx[v] || sfx[0]);
};

function finishSeason(s: GameState): void {
  const season = s.season!;
  const level = season.level;
  const league = activeLeague(s);
  const team = teamById(league, league.userTeamId)!;
  const p = s.player;
  const acc = newAcc();
  const slot = userSlot(s, team, level);
  const hook = makeHook(s, league, level, acc, slot);
  const post = postseason(s, league, hook);

  const nbaGames = season.games.filter((g) => g.post !== 'G League');
  const regLine = sumLines(nbaGames.map((g) => g.line));
  const postLine = sumLines(season.postGames.map((g) => g.line));
  const firstHalf = season.halfLines[0] ?? emptyLine();
  const prevNba = [...s.history].reverse().find((h) => h.level === 'NBA' && h.line.gp > 0);
  const userCand = {
    name: p.name,
    teamId: team.id,
    line: regLine,
    firstHalfLine: firstHalf,
    rep: p.rep,
    rookie: level === 'NBA' && s.serviceYears === 0,
    per: p.attrs.PER,
    int: p.attrs.INT,
    prevValue: prevNba ? valuePerGame(prevNba.line) : null,
    age: p.age,
  };
  const cands = buildCandidates(league, userCand);
  let aw: AwardOutcome;
  if (level === 'NBA') aw = nbaAwards(cands);
  else aw = simpleAwards(league, cands, level === 'NCAA' ? team.conf : null);
  const labels: string[] = aw.wins.map((w) => w.label);
  const keys: { key: string; label: string }[] = [...aw.wins];

  // titles
  if (post.champion) {
    if (level === 'NBA') {
      const isKey = season.role === 'key';
      keys.push({ key: isKey ? 'TITLEKEY' : 'TITLE', label: 'NBA Champion' });
      labels.push('Champion');
      milestone(s, 'champion');
      // Finals MVP: user's playoff value vs the team's best players
      const userPv = postLine.gp > 0 ? valuePerGame(postLine) : 0;
      const best = Math.max(...team.roster.slice(0, 3).map((g) => (g.s ? valuePerGame(g.s) : 0) * range(s.rng, 0.85, 1.15)));
      if (userPv > best) {
        keys.push({ key: 'FMVP', label: 'Finals MVP' });
        labels.push('Finals MVP');
      }
    } else {
      const key = level === 'NCAA' ? 'NCAATITLE' : level === 'EU' ? 'EUTITLE' : level === 'GL' ? 'GLTITLE' : 'STATETITLE';
      keys.push({ key, label: post.result });
      labels.push(post.result);
    }
  }
  // senior-year national honours
  if (s.stage === 'HS' && s.hsYear === 4) {
    computeRecruiting(s);
    if (s.recruitRank !== null && s.recruitRank <= 24) {
      keys.push({ key: 'MCDAA', label: "McDonald's All-American" });
      labels.push("McDonald's All-American");
    }
    if (s.recruitRank === 1) {
      keys.push({ key: 'GATORADE', label: 'Gatorade Player of the Year' });
      labels.push('Gatorade Player of the Year');
    }
  } else if (s.stage === 'HS') computeRecruiting(s);

  for (const k of keys) s.awards.push({ year: s.year, level, key: k.key, label: k.label });
  if (keys.some((k) => k.key === 'ALLSTAR')) milestone(s, 'allstar');
  if (keys.some((k) => k.key === 'MVP')) milestone(s, 'mvp');
  // rivals: generated winners who beat you
  for (const w of aw.winners) {
    const r = aw.races.find((x) => x.award === 'MVP' || x.award.startsWith('Naismith'));
    if (r && r.userRank !== null && r.userRank <= 10) s.rivals[w.name] = (s.rivals[w.name] ?? 0) + 1;
  }

  // reputation from honours
  const repBump = keys.reduce((acc2, k) => acc2 + (REP_BUMP[k.key] ?? 1), 0);
  p.rep = clamp(p.rep + repBump, 0, 100);
  if (post.champion || keys.length > 0) p.morale = adjust(p.morale, 6);

  // money
  let salary = 0;
  if (s.contract && (s.stage === 'NBA' || s.stage === 'GL' || s.stage === 'EU')) {
    salary = s.contract.salary;
    p.bank += salary * (1 - AGENT_CUT);
    p.earnings += salary * (1 - AGENT_CUT);
  }
  const endorse = s.stage === 'NBA' ? Math.pow(p.rep / 100, 3) * 20 : s.stage === 'NCAA' ? (p.rep / 100) * 0.15 : 0;
  p.bank += endorse;
  p.earnings += endorse;

  const ovrEnd = userOvr(s);
  p.peakOvr = Math.max(p.peakOvr, ovrEnd);
  const allGames = [...season.games, ...season.postGames].filter((g) => g.line);
  const bestGame = allGames.reduce<GameLog | null>((b, g) => (!b || gameScore(g.line!) > gameScore(b.line!) ? g : b), null);
  const rec: SeasonRecord = {
    year: s.year,
    age: p.age,
    level,
    stage: s.stage,
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    role: season.role,
    line: regLine,
    post: postLine,
    w: team.w,
    l: team.l,
    result: post.result,
    ovrStart: season.ovrStart,
    ovrEnd,
    awards: labels,
    races: aw.races,
    salary,
    bestGame,
  };
  s.history.push(rec);
  // G League assignment shows as its own row
  const glGames = season.games.filter((g) => g.post === 'G League');
  if (glGames.length > 0) {
    const gl = s.league!;
    const glTeam = teamById(gl, gl.userTeamId)!;
    s.history.push({
      ...rec,
      level: 'GL',
      stage: 'GL',
      teamId: glTeam.id,
      teamName: `${glTeam.name} (assignment)`,
      teamColor: glTeam.color,
      line: sumLines(glGames.map((g) => g.line)),
      post: emptyLine(),
      w: glTeam.w,
      l: glTeam.l,
      result: 'G League assignment',
      awards: [],
      races: [],
      salary: 0,
      bestGame: null,
    });
  }
  if (level === 'NBA') {
    s.serviceYears += 1;
    s.teamSeasons[team.id] = (s.teamSeasons[team.id] ?? 0) + 1;
  }
  season.summary = rec;
  s.lastSummary = rec;
  s.feed.unshift(reactionsForSeason(s, rec));
  if (s.feed.length > 12) s.feed.length = 12;

  // the NBA world keeps turning when the user is elsewhere
  if (s.stage !== 'NBA') {
    if (s.nba) quickNbaSeason(s);
    else if (s.stage === 'HS' && s.hsYear === 4) {
      s.nba = buildNba(s, s.year);
      warmUpNba(s, 2);
      quickNbaSeason(s);
    }
  } else snapshotNba(s);
  s.step = 'summary';
}

const REP_BUMP: Record<string, number> = {
  MVP: 12,
  ALLNBA1: 8,
  ALLNBA2: 6,
  ALLNBA3: 5,
  ALLSTAR: 5,
  TITLE: 5,
  TITLEKEY: 8,
  FMVP: 8,
  ROY: 5,
  DPOY: 5,
  SCORING: 4,
  NAISMITH: 10,
  AA1: 6,
  AA2: 4,
  NCAATITLE: 6,
  MCDAA: 5,
  GATORADE: 6,
  ALLSTATE: 3,
  STATETITLE: 3,
  CONFPOY: 3,
  ALLCONF: 2,
};

export function snapshotNba(s: GameState): void {
  const nba = s.nba!;
  const ppgs: number[] = [];
  for (const t of nba.teams) for (const g of t.roster) if (g.s && g.s.gp >= 58) ppgs.push(g.s.pts / g.s.gp);
  const user = s.stage === 'NBA' && s.lastSummary && s.lastSummary.level === 'NBA' ? s.lastSummary.line : null;
  if (user && user.gp >= 58) ppgs.push(user.pts / user.gp);
  const wins = nba.teams.map((t) => t.w);
  s.nbaSnapshot = {
    leader: Math.max(0, ...ppgs),
    over25: ppgs.filter((x) => x >= 25).length,
    best: Math.max(...wins),
    worst: Math.min(...wins),
  };
}

/** Recruiting rank against a national class (§8), computed analytically from the class distribution. */
export function computeRecruiting(s: GameState): void {
  const p = s.player;
  const gradeGap = (4 - s.hsYear) * 3.5;
  const R = RECRUIT;
  const ovr = ovrOf(p.attrs, p.pos);
  const pot = p.scoutRange ? scoutEstimate(p) : 68;
  const score = R.wOvr * ovr + R.wPot * pot + R.wRep * p.rep;
  const mu = R.wOvr * (R.ovrMean - gradeGap) + R.wPot * R.potMean + R.wRep * 6;
  const rho = 0.4;
  const sd = Math.sqrt(
    (R.wOvr * R.ovrSd) ** 2 + (R.wPot * R.potSd) ** 2 + (R.wRep * 5) ** 2 + 2 * R.wOvr * R.wPot * rho * R.ovrSd * R.potSd,
  );
  const z = (score - mu) / sd;
  const above = R.population * (1 - normCdf(z));
  const rank = Math.max(1, Math.round(above + 1));
  s.recruitRank = rank;
  const [five, four, three] = R.stars;
  s.stars = rank <= five ? 5 : rank <= four ? 4 : rank <= three ? 3 : ovr >= R.ovrMean - gradeGap ? 2 : 1;
}

function normCdf(z: number): number {
  // Abramowitz-Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

export function roleLine(rec: SeasonRecord): string {
  const l = rec.line;
  if (l.gp === 0) return 'Did not play';
  return `${l.gs} starts · ${(l.min / l.gp).toFixed(1)} MPG`;
}
