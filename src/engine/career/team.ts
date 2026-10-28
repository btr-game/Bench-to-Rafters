// Team factors (playtest round 7: "winning a championship should not depend only on the
// player"). Titles were already decided mostly by the roster (a top-3 roster won 21.6% of
// seasons, a bottom-half one 0.3%), but the player had little say over which roster he was on
// and nothing changed it during a season. Now:
// - Chemistry: every season in a row with the same team adds a little strength.
// - Star gravity: in the NBA, a star (OVR 84+) draws talent to his team.
// - Midseason swings: a trade-deadline move, a teammate's injury, a team that finds its
//   identity or a locker room that splits. Rolled once a season.
// - Ring chasing: contenders offer veterans and role players a minimum deal (offseason.ts).
// - Trade requests: an NBA player under contract can ask out, once a summer.
// These all go into the season's team bonus, added to the team's strength in his games.

import { TEAM_FACTORS as T } from '../balance';
import { chance, clamp, int, pick, range } from '../rng';
import type { GameState, League, Team } from '../types';
import { adjust, logDecision, pushMoment, teamById, userOvr } from './common';

/** 1 = the best roster in the league. */
export function rosterRank(league: League, teamId: string): number {
  return [...league.teams].sort((a, b) => b.strength - a.strength).findIndex((t) => t.id === teamId) + 1;
}

/** Seasons in a row he has played for this team before the current one. */
function streakWith(s: GameState, teamId: string): number {
  let n = 0;
  for (let i = s.history.length - 1; i >= 0; i--) {
    const h = s.history[i];
    if (/assignment/i.test(h.teamName)) continue;
    if (h.teamId !== teamId) break;
    n++;
  }
  return n;
}

/** The team bonus at the start of a season, with lines for the season preview. */
export function startTeamFactors(s: GameState, team: Team): { bonus: number; notes: string[] } {
  const notes: string[] = [];
  let bonus = 0;
  const streak = streakWith(s, team.id);
  if (streak >= 1) {
    const c = Math.min(T.chemistryMax, streak * T.chemistryPer);
    bonus += c;
    if (streak >= 2) notes.push(`Chemistry: your ${streak + 1}th season together (+${c.toFixed(1)})`);
  }
  const ovr = userOvr(s);
  if (s.stage === 'NBA' && ovr >= T.starFrom) {
    const g = Math.min(T.starMax, (ovr - T.starFrom) * T.starPer);
    bonus += g;
    notes.push(`Star gravity: good players want to play with you (+${g.toFixed(1)})`);
  }
  return { bonus: Math.round(bonus * 10) / 10, notes };
}

const DEADLINE_NAMES = ['a veteran sharpshooter', 'an All-Star forward', 'a rim-protecting center', 'a two-way wing', 'a former Sixth Man of the Year'];

/** One midseason swing, sometimes: rolled when the first half ends. */
export function midseasonSwing(s: GameState, league: League): void {
  const season = s.season;
  const team = season && teamById(league, league.userTeamId);
  if (!season || !team || !chance(s.rng, T.swingChance)) return;
  const rank = rosterRank(league, team.id);
  const good = team.w >= team.l;
  // contenders buy at the deadline; losing teams sell, fire coaches, or fall apart
  const pool: [string, number][] = [
    ['deadline', good ? 3 : 1],
    ['injury', 2],
    ['identity', 2],
    ['split', good ? 1 : 2],
    ['coach', good ? 0.3 : 1.5],
  ];
  const total = pool.reduce((t, [, w]) => t + w, 0);
  let r = range(s.rng, 0, total);
  const kind = pool.find(([, w]) => (r -= w) < 0)?.[0] ?? 'identity';
  let delta = 0;
  let title = '';
  let text = '';
  switch (kind) {
    case 'deadline':
      delta = range(s.rng, 1.5, 3.2);
      title = 'Trade deadline';
      text = `The front office goes all in and trades for ${pick(s.rng, DEADLINE_NAMES)}. ${rank <= 6 ? 'The title favorites just got stronger.' : 'Nobody saw that coming.'}`;
      break;
    case 'injury':
      delta = -range(s.rng, 1.5, 3.2);
      title = 'A teammate goes down';
      text = 'Your team\'s second-best player tears a ligament in practice. He is out for the season.';
      break;
    case 'identity':
      delta = range(s.rng, 0.8, 2);
      title = 'The team clicks';
      text = 'Something changes in January: the ball moves, the defense talks, and everybody knows their role.';
      break;
    case 'split':
      delta = -range(s.rng, 0.8, 2);
      title = 'A split locker room';
      text = 'Two veterans stop speaking to each other. Then it spreads.';
      break;
    default:
      delta = chance(s.rng, 0.5) ? range(s.rng, 0.5, 1.8) : -range(s.rng, 0.3, 1);
      title = 'Coach fired';
      text = delta > 0 ? 'The coach is fired at midseason. The interim coach simplifies everything, and it works.' : 'The coach is fired at midseason. The new staff takes weeks to settle in.';
  }
  delta = Math.round(delta * T.swingScale * 10) / 10;
  season.teamBonus = Math.round(((season.teamBonus ?? 0) + delta) * 10) / 10;
  season.teamNotes = [...(season.teamNotes ?? []), `${title} (${delta > 0 ? '+' : ''}${delta})`];
  if (delta < 0) s.player.morale = adjust(s.player.morale, -3);
  logDecision(s, 'team', `${title}: ${text.split('.')[0].toLowerCase()}.`, team.id);
  pushMoment(s, { kind: 'event', title, color: team.color, teamName: team.name, text, lines: [`Team strength ${delta > 0 ? '+' : ''}${delta} for the rest of the season`] });
}

// ---------- trade requests ----------

export function canRequestTrade(s: GameState): boolean {
  return s.step === 'offseason' && s.stage === 'NBA' && !!s.contract && s.contract.years > 0 && s.flags.tradeAsk !== s.year && !!s.nba;
}

/** The player asks out. A better team may trade for him; if not, the relationship suffers. */
export function requestTrade(s: GameState): void {
  if (!canRequestTrade(s)) return;
  s.flags.tradeAsk = s.year;
  const nba = s.nba!;
  const ovr = userOvr(s);
  const mine = rosterRank(nba, s.teamId!);
  // teams with better rosters where he would at least make the rotation
  const takers = nba.teams.filter((t) => t.id !== s.teamId && rosterRank(nba, t.id) < mine && ovr >= (t.roster[8]?.ovr ?? 70) - 2);
  const p = clamp(T.tradeBase + (ovr - 75) * T.tradePerOvr + s.player.rep / 200, T.tradeMin, T.tradeMax);
  if (takers.length === 0 || !chance(s.rng, p)) {
    s.player.trust = adjust(s.player.trust, -10);
    s.player.morale = adjust(s.player.morale, -4);
    logDecision(s, 'trade', 'Asked for a trade. Nobody bit.', s.teamId!);
    s.toast = 'The front office shopped you around. No deal. Things are awkward at practice now.';
    return;
  }
  const to = takers.sort((a, b) => b.strength - a.strength)[int(s.rng, 0, Math.min(2, takers.length - 1))];
  const from = teamById(nba, s.teamId)!;
  s.teamId = to.id;
  s.contract!.teamId = to.id;
  s.player.trust = 45;
  s.player.morale = adjust(s.player.morale, 6);
  logDecision(s, 'trade', `Traded from the ${from.name} to the ${to.name} at his request.`, to.id);
  pushMoment(s, { kind: 'commit', title: 'Traded', teamName: to.name, color: to.color, text: `You asked out, and the ${from.name} found a deal. You are a member of the ${to.name}.`, lines: [`Roster rank: ${rosterRank(nba, to.id)} of ${nba.teams.length}`, 'Same contract, new team'] });
  s.toast = `Traded to the ${to.name}.`;
}

// ---------- winning players ----------

export interface WinningEdge {
  regular: number; // team strength at full minutes, regular season
  playoff: number; // ...and in the postseason, where defense and decisions matter more
  traits: string[];
}

/**
 * What a player adds to winning beyond his OVR (round 7: "defensive specialists, floor
 * generals and 3&D wings should help win titles"). It rewards the shape of his game: ratings
 * behind each trait that stand out above his own OVR. A pure scorer gets little; a defender,
 * a pass-first point guard or a 3&D wing gets more, and more again in the postseason.
 */
export function winningEdge(a: import('../types').Attrs, ovr: number): WinningEdge {
  const above = (v: number, by = 0) => Math.max(0, v - ovr - by);
  const W = T.edge;
  const parts: [string, number][] = [
    ['Lockdown defender', above(a.PER, 2) * W.perimeter],
    ['Defensive anchor', above(a.INT, 2) * W.interior + above(a.REB, 4) * W.glass],
    ['Floor general', above(Math.min(a.PLY, a.IQ)) * W.general],
    ['3&D', above(Math.min(a.SHT, a.PER), -3) * W.threeAndD],
    ['High IQ', above(a.IQ, 4) * W.iq],
  ];
  // elite players carry more of it: the same shape matters more at 85 than at 65
  const level = clamp((ovr - 55) / 25, 0.3, 1.2);
  const regular = Math.min(W.max, parts.reduce((t2, [, v]) => t2 + v, 0) * level);
  const traits = parts.filter(([, v]) => v * level >= W.traitFrom).sort((x, y) => y[1] - x[1]).map(([n]) => n);
  return { regular: Math.round(regular * 100) / 100, playoff: Math.round(Math.min(W.max * W.playoffMult, regular * W.playoffMult) * 100) / 100, traits };
}
