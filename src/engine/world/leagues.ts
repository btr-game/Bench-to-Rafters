// League construction for every level.

import {
  HS_GRADE_OVR,
  HS_GRADE_SD,
  HS_JV_TEAMS,
  HS_ROSTER_PER_GRADE,
  HS_STATE_TEAMS,
  HS_VARSITY_SIZE,
  COACHING,
  LEAGUE_STRENGTH,
  LEVELS,
  NBA_WORLD,
  NCAA_TIER_STRENGTH,
  TEAM_STRENGTH_NOISE,
} from '../balance';
import { COLLEGES, EURO_CLUBS, HS_COLORS, HS_SCHOOL_NAMES, INT_LEAGUES, NBA_TEAMS } from '../../content/teams';
import { int, normal, pick, shuffle } from '../rng';
import type { GameState, GenPlayer, League, LevelKey, Team } from '../types';
import { genPlayer, makeRoster, rosterStrength } from './gen';
import { marketValue } from '../economy/salary';

function emptyLeague(level: LevelKey, year: number, teams: Team[], userTeamId: string | null): League {
  return { level, year, teams, userTeamId, round: 0, rounds: LEVELS[level].games, bracket: null };
}

// ---------- NBA ----------

export function buildNba(s: GameState, year: number): League {
  const teams: Team[] = NBA_TEAMS.map((t) => {
    const coach = normal(s.rng, 0, COACHING.initSd);
    const strength = LEAGUE_STRENGTH.NBA + normal(s.rng, 0, NBA_WORLD.qualitySd);
    const roster = makeRoster(s, strength - coach, NBA_WORLD.rosterSize, [20, 33]);
    for (const p of roster) {
      p.teamId = t.abbr;
      p.contractYears = int(s.rng, 1, 4);
      p.salary = marketValue(year, p.ovr, p.age, p.rep, 'rotation', Math.max(0, p.age - 21));
      p.rep = Math.max(0, (p.ovr - 72) * 4);
    }
    return {
      id: t.abbr,
      name: `${t.city} ${t.nick}`,
      short: t.nick,
      abbr: t.abbr,
      color: t.color,
      conf: t.conf,
      div: t.div,
      strength: rosterStrength(roster) + coach,
      w: 0,
      l: 0,
      roster,
      coach,
    };
  });
  return emptyLeague('NBA', year, teams, null);
}

// ---------- NCAA ----------

export function buildNcaa(s: GameState, year: number, userTeamId: string | null): League {
  const teams: Team[] = COLLEGES.map((c) => {
    const strength = NCAA_TIER_STRENGTH[c.tier] + normal(s.rng, 0, TEAM_STRENGTH_NOISE.NCAA);
    return {
      id: c.name,
      name: c.name,
      short: c.name,
      abbr: c.name.slice(0, 4).toUpperCase(),
      color: c.color,
      conf: c.conf,
      strength,
      w: 0,
      l: 0,
      roster: makeRoster(s, strength, 13, [18, 22]),
      tier: c.tier,
    };
  });
  return emptyLeague('NCAA', year, teams, userTeamId);
}

// ---------- G League ----------

export function buildGl(s: GameState, year: number, userTeamId: string | null): League {
  const teams: Team[] = NBA_TEAMS.map((t) => {
    const strength = LEAGUE_STRENGTH.GL + normal(s.rng, 0, TEAM_STRENGTH_NOISE.GL);
    return {
      id: `GL-${t.abbr}`,
      name: t.gl,
      short: t.gl,
      abbr: t.abbr,
      color: t.color,
      conf: t.conf,
      strength,
      w: 0,
      l: 0,
      roster: makeRoster(s, strength, 13, [20, 28]),
    };
  });
  return emptyLeague('GL', year, teams, userTeamId);
}

// ---------- EuroLeague ----------

export function buildEu(s: GameState, year: number, userTeamId: string | null): League {
  const teams: Team[] = EURO_CLUBS.map((c) => {
    const strength = c.strength + normal(s.rng, 0, TEAM_STRENGTH_NOISE.EU);
    return {
      id: `EU-${c.name}`,
      name: c.name,
      short: c.name,
      abbr: c.short,
      color: c.color,
      conf: 'EuroLeague',
      strength,
      w: 0,
      l: 0,
      roster: makeRoster(s, strength, 13, [21, 33]),
    };
  });
  return emptyLeague('EU', year, teams, userTeamId);
}

// ---------- other overseas leagues ----------

/** Team ids look like `INT-NBL-Sydney Kings`. */
export const intLeagueOf = (teamId: string) => INT_LEAGUES.find((l) => teamId.startsWith(`INT-${l.key}-`)) ?? INT_LEAGUES[0];

export function buildInt(s: GameState, year: number, userTeamId: string): League {
  const info = intLeagueOf(userTeamId);
  const teams: Team[] = info.teams.map(([name, color]) => {
    const strength = info.strength + normal(s.rng, 0, TEAM_STRENGTH_NOISE.INT);
    return {
      id: `INT-${info.key}-${name}`,
      name,
      short: name.split(' ').slice(-1)[0],
      abbr: name.slice(0, 3).toUpperCase(),
      color,
      conf: info.name,
      strength,
      w: 0,
      l: 0,
      roster: makeRoster(s, strength, 12, [21, 33]),
    };
  });
  return emptyLeague('INT', year, teams, userTeamId);
}

// ---------- High school ----------

export const USER_SCHOOL_ID = 'HS-USER';

/** The user's school: 4 grades, varsity = top 12 (including the user). */
export function schoolRoster(s: GameState): GenPlayer[] {
  const out: GenPlayer[] = [];
  // a powerhouse or a post-grad prep academy has stronger teammates
  const boost = (s.flags.powerhouse ? 4 : 0) + (s.hsYear >= 5 ? 6 : 0);
  for (let g = 0; g < 4; g++) {
    for (let i = 0; i < HS_ROSTER_PER_GRADE; i++) {
      out.push(genPlayer(s, normal(s.rng, HS_GRADE_OVR[g] + boost, HS_GRADE_SD), 14 + g));
    }
  }
  out.sort((a, b) => b.ovr - a.ovr);
  return out;
}

export function buildHs(s: GameState, year: number, varsity: boolean, userSquad: GenPlayer[], userStrength: number): League {
  const level: LevelKey = varsity ? 'HSV' : 'HSJV';
  const n = varsity ? HS_STATE_TEAMS : HS_JV_TEAMS;
  const names = shuffle(s.rng, [...HS_SCHOOL_NAMES]);
  const mean = varsity ? LEAGUE_STRENGTH.HSV : LEAGUE_STRENGTH.HSJV;
  const teams: Team[] = [];
  teams.push({
    id: USER_SCHOOL_ID,
    name: s.hsYear >= 5 ? 'Northfield Prep (post-grad)' : s.player.highSchool,
    short: s.hsYear >= 5 ? 'Northfield Prep' : s.player.highSchool,
    abbr: s.player.highSchool.slice(0, 4).toUpperCase(),
    color: s.schoolColor || HS_COLORS[s.player.highSchool.length % HS_COLORS.length],
    conf: 'State',
    strength: userStrength,
    w: 0,
    l: 0,
    roster: userSquad,
  });
  for (let i = 1; i < n; i++) {
    const strength = mean + normal(s.rng, 0, TEAM_STRENGTH_NOISE[level]);
    const nm = names[(i - 1) % names.length] + (i > names.length ? ' II' : '');
    teams.push({
      id: `HS-${i}`,
      name: nm,
      short: nm,
      abbr: nm.slice(0, 4).toUpperCase(),
      color: pick(s.rng, HS_COLORS),
      conf: 'State',
      strength,
      w: 0,
      l: 0,
      roster: makeRoster(s, strength, 12, varsity ? [15, 18] : [14, 16], 2.4),
    });
  }
  return emptyLeague(level, year, teams, USER_SCHOOL_ID);
}

export { HS_VARSITY_SIZE };
