// Tournaments outside the regular season: NBA preseason, NBA Cup, All-Star weekend,
// NCAA conference tournaments, the high school national invitational, the McDonald's
// game, and national-team events (youth World Cups, FIBA World Cup, Olympics).

import { FAN_VOTE, LEVELS, MORALE_PERF, ROLE_MINUTES } from '../balance';
import { chance, clamp, int, logistic, normal, range, shuffle } from '../rng';
import type { GameLog, GameState, LevelKey, RoleKey, StatLine, Team, TourneyRecord } from '../types';
import { expected, expectedGameScore, gameScore, sampleGame, usageWeight, valuePerGame, genProfile, genUsageWeight, perGame } from './statModel';
import { scoreFor, winProb, standings } from './leagueSim';
import { recordInjury } from '../player/body';
import { rollInjury } from '../player/injury';
import { ovrOf } from '../player/ovr';
import { adjust, logDecision, pushDecision, pushMoment, rankOnRoster } from '../career/common';
import { originOf } from '../../content/origins';
import { teamUsageMean, rankMinutes } from './genStats';
import { touchOf } from '../player/touch';
import { friendAllStars } from '../career/friendLeague';

interface Opp {
  name: string;
  short: string;
  strength: number;
}


const ROLE_USAGE: Record<RoleKey, number> = { key: 1.25, starter: 1.05, sixth: 1, rotation: 0.85, bench: 0.7, deep: 0.6 };
const BASE: Record<LevelKey, number> = { HSJV: 48, HSV: 60, NCAA: 72, GL: 112, EU: 82, INT: 84, NBA: 112 };

function profile(s: GameState) {
  const p = s.player;
  return { attrs: p.attrs, height: p.height, wingspan: p.wingspan, range: p.range, offhand: p.offhand + (p.hand === 'L' ? 6 : 0), touch: touchOf(p) };
}

/** One game outside the regular season with a full box score for the player. */
function exhibitionGame(
  s: GameState,
  level: LevelKey,
  role: RoleKey,
  my: Opp,
  opp: Opp,
  label: string,
  opts: { neutral?: boolean; injuries?: boolean; usage?: number } = {},
): { log: GameLog; win: boolean } {
  const rng = s.rng;
  const p = s.player;
  const L = LEVELS[level];
  let line: StatLine | null = null;
  let minutes = 0;
  if (!p.injury || p.injury.key === 'dtd') {
    if (role === 'deep') minutes = int(rng, ROLE_MINUTES.deep[0], ROLE_MINUTES.deep[1]);
    else {
      const [a, b] = ROLE_MINUTES[role];
      minutes = Math.round((range(rng, a, b) * L.gameLen) / 48);
    }
    if (minutes > 0) {
      const form = clamp(normal(rng, 1, 0.17), 0.5, 1.7);
      const morale = MORALE_PERF(p.morale) * (1 + (form - 1) * 0.3);
      const e = expected(profile(s), level, minutes, ROLE_USAGE[role] * (opts.usage ?? 1) * Math.pow(form, 0.8), morale);
      line = sampleGame(rng, e, role === 'key' || role === 'starter');
      const inj = opts.injuries !== false ? rollInjury(rng, p, 'balanced', minutes) : null;
      if (inj) recordInjury(p, inj, s.year);
    }
  }
  const ovr = ovrOf(p.attrs, p.pos);
  const impact = line ? (ovr - my.strength) * (minutes / L.gameLen) * 0.25 : 0;
  const win = chance(rng, winProb(my.strength + impact, opp.strength, opts.neutral ? 0 : 1));
  let us = Math.round(BASE[level] + normal(rng, 0, 9));
  if (line && line.pts > us - 15) us = line.pts + int(rng, 15, 30);
  const margin = int(rng, 1, 18);
  const them = win ? Math.max(20, us - margin) : us + margin;
  return { log: { n: 0, opp: opp.short, home: !opts.neutral, res: win ? 'W' : 'L', us, them, line, post: label }, win };
}

function sumLines(lines: (StatLine | null)[]): StatLine | null {
  const out: StatLine = { gp: 0, gs: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };
  let any = false;
  for (const l of lines)
    if (l) {
      any = true;
      for (const k of Object.keys(out) as (keyof StatLine)[]) out[k] += l[k];
    }
  return any ? out : null;
}

const lineText = (l: StatLine | null) => (l && l.gp ? `${perGame(l, 'pts').toFixed(1)} PTS · ${perGame(l, 'reb').toFixed(1)} REB · ${perGame(l, 'ast').toFixed(1)} AST` : 'Did not play');

function record(s: GameState, r: TourneyRecord): void {
  s.tournaments.push(r);
  if (s.tournaments.length > 60) s.tournaments.shift();
}

/** One game between two other teams: the winner and a score line. */
function otherGame(s: GameState, level: LevelKey, a: Opp, b: Opp, round: string): { winner: Opp; text: string } {
  const aWon = chance(s.rng, winProb(a.strength, b.strength, 0));
  const [x, y] = scoreFor(s.rng, level, a.strength - b.strength, aWon);
  const [w, l, sw, sl] = aWon ? [a, b, x, y] : [b, a, y, x];
  return { winner: w, text: `${round}: ${w.name} ${sw}, ${l.name} ${sl}` };
}

/**
 * Single-elimination run for the player's side. Returns games and how far he went. If he
 * goes out, the team that beat him plays on against the rest of the path, so the event
 * still gets a champion and a final score (`notes`).
 */
function knockout(s: GameState, level: LevelKey, role: RoleKey, my: Opp, opps: Opp[], rounds: string[], neutral = true) {
  const games: GameLog[] = [];
  const notes: string[] = [];
  let reached = 0;
  if (opps.length === 0) return { games, won: false, lostIn: rounds[0] ?? null, reached, notes, champion: null as string | null };
  for (let i = 0; i < rounds.length; i++) {
    const opp = opps[i % opps.length];
    const g = exhibitionGame(s, level, role, my, opp, rounds[i], { neutral });
    g.log.n = games.length + 1;
    games.push(g.log);
    if (!g.win) {
      let cur = opp;
      for (let j = i + 1; j < rounds.length; j++) {
        const other = opps[j % opps.length];
        if (other === cur) continue;
        const r = otherGame(s, level, cur, other, rounds[j]);
        notes.push(r.text);
        cur = r.winner;
      }
      notes.push(`Champion: ${cur.name}`);
      return { games, won: false, lostIn: rounds[i], reached, notes, champion: cur.name };
    }
    reached = i + 1;
  }
  notes.push(`Champion: ${my.name}`);
  return { games, won: true, lostIn: null as string | null, reached, notes, champion: my.name };
}

/** Result tables for a tournament page: the player's games, then the rest of the event. */
function tourneyRecap(games: GameLog[], notes: string[], myName: string): { heading: string; rows: string[] }[] {
  const rows = games.map((g) => `${g.post ?? 'Game'}: ${g.res} ${g.us}–${g.them} vs ${g.opp}${g.line ? ` · ${g.line.pts} pts, ${g.line.reb} reb, ${g.line.ast} ast` : ''}`);
  const out = [{ heading: `${myName}'s games`, rows }];
  if (notes.length > 0) out.push({ heading: 'Around the bracket', rows: notes });
  return out;
}

// ---------- NBA ----------

/** Four preseason games before the season. Good showings earn coach trust and maybe a role. */
export function nbaPreseason(s: GameState): void {
  const season = s.season!;
  const nba = s.nba!;
  const team = nba.teams.find((t) => t.id === s.teamId)!;
  const opps = shuffle(s.rng, nba.teams.filter((t) => t.id !== team.id)).slice(0, 4);
  // preseason minutes are generous for young and bench players
  const role: RoleKey = season.role === 'deep' || season.role === 'bench' ? 'rotation' : season.role;
  let gm = 0;
  let exp = 0;
  const games: GameLog[] = [];
  for (const o of opps) {
    const g = exhibitionGame(s, 'NBA', role, { name: team.name, short: team.short, strength: team.strength - 2 }, { name: o.name, short: o.short, strength: o.strength - 2 }, 'Preseason', { injuries: false });
    g.log.n = games.length + 1;
    games.push(g.log);
    if (g.log.line) {
      gm += gameScore(g.log.line);
      const [a, b] = ROLE_MINUTES[role];
      exp += expectedGameScore(expected(profile(s), 'NBA', (a + b) / 2, ROLE_USAGE[role]));
    }
  }
  season.preGames = games;
  const ratio = exp > 0 ? gm / exp : 1;
  const delta = clamp((ratio - 1) * 40, -12, 14);
  s.player.trust = adjust(s.player.trust, delta);
  season.preReport = ratio >= 1.15 ? 'You lit up the preseason. The coaches are rethinking the rotation.' : ratio <= 0.85 ? 'A rough preseason. You have work to do to earn minutes.' : 'A solid, quiet preseason.';
  const line = sumLines(games.map((g) => g.line));
  record(s, { year: s.year, name: 'NBA preseason', team: team.name, result: `${games.filter((g) => g.res === 'W').length}–${games.filter((g) => g.res === 'L').length}`, line, games });
}

/** The NBA Cup knockout in Las Vegas after the first half: the best four records per conference. */
export function nbaCup(s: GameState): void {
  const nba = s.nba!;
  const team = nba.teams.find((t) => t.id === s.teamId)!;
  const field = ['East', 'West'].flatMap((c) => standings(nba.teams.filter((t) => t.conf === c)).slice(0, 4));
  const season = s.season!;
  if (!field.includes(team)) {
    // the Cup goes on without him: a real eight-team bracket in Las Vegas
    let alive: Opp[] = shuffle(s.rng, field.map((t) => ({ name: t.name, short: t.short, strength: t.strength })));
    const notes: string[] = [];
    for (const round of ['Quarterfinal', 'Semifinal', 'Final']) {
      const next: Opp[] = [];
      for (let i = 0; i + 1 < alive.length; i += 2) {
        const r = otherGame(s, 'NBA', alive[i], alive[i + 1], round);
        notes.push(r.text);
        next.push(r.winner);
      }
      alive = next;
    }
    season.cupResult = `Did not make the NBA Cup knockouts. ${alive[0].name} won the Cup. ${notes[notes.length - 1]}.`;
    return;
  }
  const others = shuffle(s.rng, field.filter((t) => t !== team));
  const opp = (t: Team): Opp => ({ name: t.name, short: t.short, strength: t.strength });
  const run = knockout(s, 'NBA', season.role, opp(team), others.slice(0, 3).map(opp), ['NBA Cup quarterfinal', 'NBA Cup semifinal', 'NBA Cup final']);
  season.cupGames = run.games;
  const line = sumLines(run.games.map((g) => g.line));
  if (run.won) {
    season.cupResult = 'NBA Cup champion';
    s.awards.push({ year: s.year, level: 'NBA', key: 'NBACUP', label: 'NBA Cup champion' });
    const final = run.games[run.games.length - 1];
    const mvp = line && valuePerGame(line) >= 24;
    if (mvp) s.awards.push({ year: s.year, level: 'NBA', key: 'CUPMVP', label: 'NBA Cup MVP' });
    pushMoment(s, { kind: 'title', title: 'NBA Cup champion', teamName: team.name, color: team.color, text: `${team.name} win the NBA Cup in Las Vegas.`, game: { ...final, level: 'NBA', teamShort: team.short }, lines: mvp ? ['NBA Cup MVP'] : [], recap: tourneyRecap(run.games, [], team.short) });
  } else season.cupResult = `Lost in the ${run.lostIn}. ${run.champion} won the Cup.`;
  record(s, { year: s.year, name: 'NBA Cup', team: team.name, result: run.won ? 'Champion' : `Lost in the ${run.lostIn}`, line, games: run.games, notes: run.notes });
}

/**
 * All-Star selection at midseason: first-half value (expected for the league, real for the
 * player) plus a fan vote on reputation. Then the weekend: contests and the game.
 */
export function allStarWeekend(s: GameState, firstHalf: StatLine): void {
  const nba = s.nba!;
  const season = s.season!;
  const team = nba.teams.find((t) => t.id === s.teamId)!;
  const p = s.player;
  // expected first-half values for the conference
  const vals: number[] = [];
  for (const t of nba.teams.filter((x) => x.conf === team.conf)) {
    const mean = teamUsageMean('NBA', t.roster, null);
    t.roster.forEach((g, i) => {
      const e = expected(genProfile(g), 'NBA', rankMinutes('NBA', i + 1), genUsageWeight(g) / mean);
      const v = (e.pts + 0.9 * e.reb + 1.4 * e.ast + 2 * e.stl + 2 * e.blk - e.tov) * normal(s.rng, 1, 0.1);
      g.firstHalfValue = v;
      vals.push((1 - FAN_VOTE.share) * v + FAN_VOTE.share * (g.rep / 100) * FAN_VOTE.scale);
    });
  }
  const mine = firstHalf.gp >= 15 ? (1 - FAN_VOTE.share) * valuePerGame(firstHalf) + FAN_VOTE.share * (p.rep / 100) * FAN_VOTE.scale : 0;
  // round 35: classmates stand in the vote with their season's numbers (career/friendLeague.ts);
  // one in his conference can take a place ahead of him
  const friends = s.mp?.klass ? friendAllStars(s, nba, team.conf, vals, mine) : null;
  const rank = 1 + vals.filter((v) => v > mine).length + (friends?.ahead ?? 0);
  season.allStar = rank <= 12;
  season.allStarRank = rank;
  const lines: string[] = [];
  if (season.allStar) {
    lines.push(rank <= 5 ? 'Voted an All-Star starter' : 'Named an All-Star reserve');
    const g = exhibitionGame(s, 'NBA', rank <= 5 ? 'starter' : 'rotation', { name: team.conf, short: team.conf, strength: 85 }, { name: 'Other conference', short: team.conf === 'East' ? 'West' : 'East', strength: 85 }, 'All-Star Game', { neutral: true, injuries: false, usage: 1.2 });
    if (g.log.line) lines.push(`All-Star Game: ${g.log.line.pts} pts, ${g.log.line.reb} reb, ${g.log.line.ast} ast (${g.win ? 'won' : 'lost'})`);
    if (g.win && g.log.line && g.log.line.pts >= 25 && chance(s.rng, 0.5)) {
      lines.push('All-Star Game MVP');
      s.awards.push({ year: s.year, level: 'NBA', key: 'ASGMVP', label: 'All-Star Game MVP' });
    }
  } else if (s.serviceYears <= 1 && firstHalf.gp >= 10 && valuePerGame(firstHalf) >= 10) {
    lines.push('Selected for the Rising Stars game');
  }
  // contests: invitations go to the right skill sets
  if (p.attrs.SHT >= 80 && p.range >= 60 && chance(s.rng, 0.35 + (p.attrs.SHT - 80) * 0.04)) {
    const win = chance(s.rng, clamp(0.12 + (p.attrs.SHT - 85) * 0.03 + (p.range - 70) * 0.01, 0.05, 0.6));
    lines.push(win ? 'Won the 3-Point Contest' : 'Competed in the 3-Point Contest');
    if (win) s.awards.push({ year: s.year, level: 'NBA', key: '3PT', label: '3-Point Contest champion' });
  }
  if (p.attrs.ATH >= 78 && p.age <= 27 && chance(s.rng, 0.3)) {
    const win = chance(s.rng, clamp(0.15 + (p.attrs.ATH - 82) * 0.04, 0.05, 0.6));
    lines.push(win ? 'Won the Slam Dunk Contest' : 'Competed in the Slam Dunk Contest');
    if (win) s.awards.push({ year: s.year, level: 'NBA', key: 'DUNK', label: 'Slam Dunk champion' });
  }
  if (friends?.picked.length) {
    const who = friends.picked.length > 1 ? `Classmates on the All-Star teams: ${friends.picked.join(', ')}.` : `A classmate on an All-Star team: ${friends.picked[0]}.`;
    season.midReport.push(who);
    // on his own page when there is one (a classmate's place is no page of his)
    if (lines.length > 0) lines.push(who);
    // All-Star weekends he shared with a classmate (the book's All-Star Alumni reads it)
    if (season.allStar) s.flags.asPal = (s.flags.asPal ?? 0) + 1;
  }
  if (lines.length > 0) {
    p.rep = clamp(p.rep + (season.allStar ? 4 : 2), 0, 100);
    pushMoment(s, { kind: 'awards', title: season.allStar ? 'All-Star' : 'All-Star weekend', color: team.color, teamName: team.name, text: `All-Star weekend · ${s.year + 1}`, lines });
  }
}

// ---------- college and high school ----------

/** Conference tournament before March Madness. Winning helps the at-large picture. */
export function conferenceTournament(s: GameState, team: Team, confTeams: Team[]): { won: boolean; text: string; games: GameLog[] } {
  if (confTeams.length < 4) return { won: false, text: '', games: [] };
  const seeds = standings(confTeams).slice(0, 8);
  if (!seeds.includes(team)) return { won: false, text: 'Missed the conference tournament', games: [] };
  const others = shuffle(s.rng, seeds.filter((t) => t !== team)).sort((a, b) => a.strength - b.strength);
  const role = s.season!.role;
  const opp = (t: Team): Opp => ({ name: t.name, short: t.short, strength: t.strength });
  const run = knockout(s, 'NCAA', role, opp(team), [others[0], others[Math.floor(others.length / 2)], others[others.length - 1]].map(opp), [
    'Conference quarterfinal',
    'Conference semifinal',
    'Conference final',
  ]);
  if (run.won) {
    team.strength += 0.5;
    s.awards.push({ year: s.year, level: 'NCAA', key: 'CONFTOURN', label: `${team.conf} tournament champion` });
  }
  record(s, { year: s.year, name: `${team.conf} tournament`, team: team.name, result: run.won ? 'Champion' : `Lost in the ${run.lostIn?.toLowerCase()}`, line: sumLines(run.games.map((g) => g.line)), games: run.games, notes: run.notes });
  return { won: run.won, text: run.won ? `${team.conf} tournament champion` : `Lost in the ${run.lostIn?.toLowerCase()}`, games: run.games };
}

/** National invitational for elite high school teams after the state playoffs. */
export function hsNationals(s: GameState, team: Team): void {
  const opps: Opp[] = ['Bayside Academy', 'Mountain Ridge Prep', 'Gulf Coast Academy', 'Canyon Prep'].map((n, i) => ({
    name: n,
    short: n.split(' ')[0],
    strength: 56 + i * 0.7 + normal(s.rng, 0, 1),
  }));
  const run = knockout(s, 'HSV', s.season!.role, { name: team.name, short: team.short, strength: team.strength + 1 }, shuffle(s.rng, opps).slice(0, 3), [
    'National quarterfinal',
    'National semifinal',
    'National final',
  ]);
  const line = sumLines(run.games.map((g) => g.line));
  const result = run.won ? 'National Prep Invitational champion' : `Lost in the ${run.lostIn?.toLowerCase()}`;
  record(s, { year: s.year, name: 'National Prep Invitational', team: team.name, result, line, games: run.games, notes: run.notes });
  const recap = tourneyRecap(run.games, run.won ? [] : run.notes, team.short);
  if (run.won) {
    s.awards.push({ year: s.year, level: 'HSV', key: 'HSNATL', label: 'National Prep Invitational champion' });
    const final = run.games[run.games.length - 1];
    pushMoment(s, { kind: 'title', title: 'National champions', teamName: team.name, color: team.color, text: `${team.name} win the National Prep Invitational.`, game: { ...final, level: 'HSV', teamShort: team.short }, lines: [], recap });
  } else {
    pushMoment(s, { kind: 'tournament', title: 'National Prep Invitational', color: team.color, teamName: team.name, text: `${team.name} were invited to nationals. ${result}.`, lines: [lineText(line)], recap });
  }
  s.player.rep = clamp(s.player.rep + (run.won ? 6 : 3), 0, 100);
}

export function mcdonaldsGame(s: GameState): void {
  const g = exhibitionGame(s, 'HSV', 'starter', { name: 'East', short: 'East', strength: 62 }, { name: 'West', short: 'West', strength: 62 }, "McDonald's All-American Game", { neutral: true, injuries: false, usage: 1.1 });
  const lines = [g.log.line ? `${g.log.line.pts} pts, ${g.log.line.reb} reb, ${g.log.line.ast} ast (${g.win ? 'won' : 'lost'})` : 'Did not play'];
  if (g.win && g.log.line && g.log.line.pts >= 16) {
    lines.push('Game MVP');
    s.player.rep = clamp(s.player.rep + 4, 0, 100);
  }
  record(s, { year: s.year, name: "McDonald's All-American Game", team: 'All-Americans', result: g.win ? 'Won' : 'Lost', line: g.log.line, games: [g.log] });
  pushMoment(s, { kind: 'tournament', title: "McDonald's All-American Game", color: '#C8102E', text: 'The best 24 seniors in the country, one night.', lines });
}

// ---------- national team ----------

const SENIOR: [string, number][] = [
  ['USA', 87], ['France', 82], ['Canada', 82], ['Serbia', 81], ['Germany', 81], ['Spain', 80], ['Australia', 79], ['Greece', 79],
  ['Slovenia', 78], ['Lithuania', 78], ['Italy', 77], ['Argentina', 76], ['Puerto Rico', 74], ['Nigeria', 74], ['Brazil', 75],
  ['Japan', 72], ['New Zealand', 72], ['Philippines', 70], ['China', 71], ['South Korea', 68], ['Turkey', 77], ['Senegal', 71],
  ['Cameroon', 71], ['South Sudan', 73], ['Dominican Republic', 73], ['Mexico', 70],
];

interface NationalEvent {
  name: string;
  youth: boolean;
  legacy: number; // legacy points for gold
}

/** Which national-team event happens in the summer after season `year`, for a player this age. */
const ASIAN_GAMES: [string, number][] = [
  ['China', 71], ['Japan', 72], ['South Korea', 68], ['Philippines', 70], ['Iran', 66], ['Jordan', 65], ['Lebanon', 67], ['Chinese Taipei', 63],
];

function nationalEventFor(year: number, age: number, nation = ''): NationalEvent | null {
  const summer = year + 1;
  // the Asian Games: every four years, two summers after the Olympics
  if (age >= 19 && summer % 4 === 2 && ASIAN_GAMES.some(([n]) => n === nation)) return { name: `${summer} Asian Games`, youth: false, legacy: 0.5 };
  if (age <= 16 && summer % 2 === 0) return { name: 'FIBA U17 World Cup', youth: true, legacy: 0 };
  if (age >= 17 && age <= 19 && summer % 2 === 1) return { name: 'FIBA U19 World Cup', youth: true, legacy: 0 };
  if (age >= 19 && summer % 4 === 0) return { name: `${summer} Olympics`, youth: false, legacy: 3 };
  if (age >= 19 && summer % 4 === 3) return { name: `${summer} FIBA World Cup`, youth: false, legacy: 1.5 };
  return null;
}

const nationOf = (s: GameState): string => originOf(s.player.country).nation;
const nationColor = (s: GameState): string => originOf(s.player.country).nationColor;

/** Chance of a call-up: the nation's talent pool sets the bar. */
function callUpChance(s: GameState, ev: NationalEvent): number {
  const ovr = ovrOf(s.player.attrs, s.player.pos);
  const nation = nationOf(s);
  const usa = nation === 'USA';
  // deeper basketball countries have a higher bar
  const str = SENIOR.find(([n]) => n === nation)?.[1] ?? 70;
  const bar = ev.youth ? (usa ? 59 + (s.player.age - 15) * 3 : 50 + (str - 74) * 0.4 + (s.player.age - 15) * 2.5) : usa ? 84 : str - 12;
  return logistic((ovr - bar) / 2 + s.player.rep / 40 - 0.5);
}

export function pushNationalTeam(s: GameState): void {
  const ev = nationalEventFor(s.year, s.player.age, nationOf(s));
  if (!ev || s.player.injury?.key === 'season') return;
  if (!chance(s.rng, callUpChance(s, ev))) return;
  const nation = nationOf(s);
  pushDecision(s, {
    kind: 'national',
    title: `${nation === 'USA' ? 'Team USA' : nation} calls`,
    text: `You have been invited to play for ${nation} at the ${ev.name}. A summer of high-level games, and a long summer for your body.`,
    choices: [
      { id: 'accept', label: `Play for ${nation}`, detail: 'Reputation, maybe a medal. Some injury risk and a shorter rest.' },
      { id: 'decline', label: 'Rest this summer', detail: 'Fresher legs next season.' },
    ],
    data: { event: ev.name, youth: ev.youth, legacy: ev.legacy },
  });
}

export function resolveNationalTeam(s: GameState, data: Record<string, unknown>, id: string): string {
  const name = data.event as string;
  const youth = data.youth as boolean;
  if (id !== 'accept') {
    s.player.injuryMultNext *= 0.95;
    logDecision(s, 'national', `Declined an invitation to the ${name}.`);
    return 'You stay home and rest.';
  }
  const nation = nationOf(s);
  const shift = youth ? -24 : 0;
  const asian = name.includes('Asian Games');
  const pool = (asian ? ASIAN_GAMES : SENIOR).filter(([n]) => n !== nation).map(([n, st]) => ({ name: n, short: n, strength: st + shift + normal(s.rng, 0, 1.5) }));
  const myBase = (SENIOR.find(([n]) => n === nation)?.[1] ?? 70) + shift;
  const ovr = ovrOf(s.player.attrs, s.player.pos);
  const role: RoleKey = ovr >= myBase + 5 ? 'key' : ovr >= myBase ? 'starter' : ovr >= myBase - 4 ? 'rotation' : 'bench';
  const my = { name: nation, short: nation, strength: myBase };
  const level: LevelKey = youth ? 'NCAA' : 'NBA';
  // group stage: three games, top two advance
  const groupOpps = shuffle(s.rng, [...pool]).slice(0, 3);
  const games: GameLog[] = [];
  let groupWins = 0;
  const table = new Map<string, number>([[nation, 0], ...groupOpps.map((o) => [o.name, 0] as [string, number])]);
  for (const o of groupOpps) {
    const g = exhibitionGame(s, level, role, my, o, 'Group stage', { neutral: true });
    games.push(g.log);
    if (g.win) groupWins++;
    table.set(g.win ? nation : o.name, table.get(g.win ? nation : o.name)! + 1);
  }
  // the other group games
  const notes: string[] = [];
  for (let i = 0; i < groupOpps.length; i++)
    for (let j = i + 1; j < groupOpps.length; j++) {
      const r = otherGame(s, level, groupOpps[i], groupOpps[j], 'Group stage');
      notes.push(r.text);
      table.set(r.winner.name, table.get(r.winner.name)! + 1);
    }
  notes.push(`Group table: ${[...table.entries()].sort((a, b) => b[1] - a[1]).map(([n, w]) => `${n} ${w}–${groupOpps.length - w}`).join(' · ')}`);
  let result: string;
  let medal: 'gold' | 'silver' | 'bronze' | undefined;
  if (groupWins < 2) result = 'Out in the group stage';
  else {
    const strong = [...pool].sort((a, b) => b.strength - a.strength);
    const run = knockout(s, level, role, my, [strong[int(s.rng, 4, Math.min(8, strong.length - 1))], strong[int(s.rng, 1, 3)], strong[0].name === nation ? strong[1] : strong[0]], ['Quarterfinal', 'Semifinal', 'Final']);
    games.push(...run.games);
    notes.push(...run.notes);
    if (run.won) {
      result = 'Gold medal';
      medal = 'gold';
    } else if (run.reached === 2) {
      result = 'Silver medal';
      medal = 'silver';
    } else if (run.reached === 1) {
      const bronze = exhibitionGame(s, level, role, my, strong[int(s.rng, 2, 5)], 'Bronze medal game', { neutral: true });
      games.push(bronze.log);
      result = bronze.win ? 'Bronze medal' : 'Fourth place';
      if (bronze.win) medal = 'bronze';
    } else result = 'Out in the quarterfinals';
  }
  games.forEach((g, i) => (g.n = i + 1));
  const line = sumLines(games.map((g) => g.line));
  if (groupWins < 2) {
    // the knockout rounds go on without them
    const top = [...pool].sort((a, b) => b.strength + normal(s.rng, 0, 2) - a.strength)[0];
    notes.push(`Champion: ${top.name}`);
  }
  record(s, { year: s.year + 1, name, team: nation, result, medal, line, games, notes });
  const recap = tourneyRecap(games, notes, nation);
  s.player.rep = clamp(s.player.rep + (medal === 'gold' ? 8 : medal ? 5 : 3), 0, 100);
  s.player.morale = adjust(s.player.morale, medal ? 6 : -2);
  s.player.injuryMultNext *= 1.1;
  if (medal) {
    const key = youth ? 'YOUTHMEDAL' : asian ? (medal === 'gold' ? 'ASIANGOLD' : 'ASIANMEDAL') : name.includes('Olympics') ? (medal === 'gold' ? 'OLYGOLD' : 'OLYMEDAL') : medal === 'gold' ? 'WCGOLD' : 'WCMEDAL';
    s.awards.push({ year: s.year + 1, level: youth ? 'NCAA' : 'NBA', key, label: `${name}: ${result}` });
  }
  logDecision(s, 'national', `Played for ${nation} at the ${name}: ${result.toLowerCase()}.`);
  const final = games[games.length - 1];
  if (medal === 'gold') {
    pushMoment(s, { kind: 'title', title: `${name} gold`, teamName: nation, color: nationColor(s), text: `${nation} win gold at the ${name}.`, game: { ...final, level, teamShort: nation }, lines: [], recap, mood: 'gold' });
  } else {
    // round 15: a medal is celebrated, going home empty-handed hurts
    const title = medal === 'silver' ? `${name}: silver` : medal === 'bronze' ? `${name}: bronze` : `Out of the ${name}`;
    const text = medal === 'silver' ? `${nation} reach the final and take silver at the ${name}. One game from gold.` : medal === 'bronze' ? `${nation} win the bronze medal game at the ${name}. You go home with a medal.` : `${nation} are out of the ${name}: ${result.toLowerCase()}. A long flight home.`;
    pushMoment(s, { kind: 'tournament', title, teamName: nation, color: nationColor(s), text, lines: [lineText(line)], recap, mood: medal === 'silver' ? 'silver' : medal === 'bronze' ? 'bronze' : 'out' });
  }
  return `${name}: ${result}.`;
}

export { rankOnRoster, usageWeight };
