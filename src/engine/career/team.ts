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

import { TEAM_FACTORS as T, modeDial } from '../balance';
import { chance, clamp, int, pick, range } from '../rng';
import type { GameState, League, Team } from '../types';
import { adjust, logDecision, pushMoment, teamById, userOvr } from './common';
import { currentStyle, fitLabel, styleEffect, styleFit, TEAM_STYLES } from './identity';
import { duoEffect } from './duo';

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
export function startTeamFactors(s: GameState, team: Team): { bonus: number; notes: string[]; post: number; fx?: { perf: number; usage: number } } {
  const notes: string[] = [];
  let bonus = 0;
  const d = modeDial(s.mode, 'teamFx');
  const streak = streakWith(s, team.id);
  if (streak >= 1) {
    const c = Math.min(T.chemistryMax, streak * T.chemistryPer) * d;
    bonus += c;
    if (streak >= 2) notes.push(`Chemistry: your ${streak + 1}th season together (+${c.toFixed(1)})`);
  }
  // round 15: coach trust is part of chemistry. A trusted player steadies the locker room; a
  // player the coach does not trust splits it.
  const tr = Math.round(Math.max(T.trustMin, Math.min(T.trustMax, (s.player.trust - T.trustFrom) * T.trustPer)) * Math.max(0.5, d) * 10) / 10;
  if (tr !== 0) {
    bonus += tr;
    notes.push(tr > 0 ? `Coach trust: the locker room follows your lead (+${tr.toFixed(1)})` : `Coach trust: the coach and you are not on the same page (${tr.toFixed(1)})`);
  }
  const ovr = userOvr(s);
  if (s.stage === 'NBA' && ovr >= T.starFrom) {
    const g = Math.min(T.starMax, (ovr - T.starFrom) * T.starPer) * d;
    bonus += g;
    notes.push(`Star gravity: good players want to play with you (+${g.toFixed(1)})`);
  }
  // round 13: the team style he set (career/identity.ts)
  const style = currentStyle(s);
  let post = 0;
  let fx: { perf: number; usage: number } | undefined;
  if (style && s.teamId === team.id) {
    const e = styleEffect(s, style);
    bonus += e.regular;
    post = e.playoff - e.regular;
    fx = { perf: e.perf, usage: e.usage };
    notes.push(`${TEAM_STYLES[style].name}: ${fitLabel(styleFit(s, style)).toLowerCase()} (${e.regular >= 0 ? '+' : ''}${e.regular}, playoffs ${e.playoff >= 0 ? '+' : ''}${e.playoff})`);
  }
  // round 20: a duo lifts everyone around it (career/duo.ts)
  const duo = s.teamId === team.id ? duoEffect(s) : null;
  if (duo) {
    bonus += duo.team;
    notes.push(`${duo.b.nick}: you and ${duo.b.name} (+${duo.team.toFixed(1)})`);
  }
  return { bonus: Math.round(bonus * 10) / 10, notes, post: Math.round(post * 10) / 10, fx };
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

/**
 * Round 13 ("give the users a little choice"): where he asks to go. Each target changes the odds
 * that a deal gets done and what follows:
 * - better: any team with a better roster (the old request).
 * - contender: a top-five roster. More likely to win; he may come off the bench.
 * - champion: last year's champion or a dynasty. The best title odds, the hardest deal to get.
 * - rival: the team he is feuding with. Long odds, a headline either way: reputation if it
 *   happens, a ruined locker room if it does not.
 * - needed: a weaker team that would make him its first option. Easy to get, a bigger role.
 */
export type TradeAim = 'better' | 'contender' | 'champion' | 'rival' | 'needed';
export const TRADE_AIM: Record<TradeAim, { label: string; text: string; odds: number; risk: 'Low' | 'Medium' | 'High' }> = {
  better: { label: 'Any better team', text: 'Let the front office find a deal with a team that has a better roster.', odds: 1, risk: 'Low' },
  contender: { label: 'A contender', text: 'A top-five roster. A real shot at a ring; you may lose your starting spot.', odds: 0.85, risk: 'Medium' },
  champion: { label: 'The champions', text: 'Join last year\'s champion. The best title odds, the hardest deal to get done.', odds: 0.6, risk: 'Medium' },
  rival: { label: 'Your rival', text: 'Ask to be sent to the team you are feuding with. Long odds; huge headlines if it happens, a poisoned locker room if it does not.', odds: 0.55, risk: 'High' },
  needed: { label: 'A team that needs you', text: 'A weaker team that would build around you. Easy to get; a bigger role, fewer wins.', odds: 1.35, risk: 'Low' },
};

/** The teams each aim would send him to (best first), and the odds word for the screen. */
export function tradeOptions(s: GameState): { aim: TradeAim; teams: Team[]; chance: number }[] {
  const nba = s.nba;
  if (!nba || !s.teamId) return [];
  const ovr = userOvr(s);
  const mine = rosterRank(nba, s.teamId);
  const fits = (t: Team) => t.id !== s.teamId && ovr >= (t.roster[8]?.ovr ?? 70) - 2;
  const base = clamp(T.tradeBase + (ovr - 75) * T.tradePerOvr + s.player.rep / 140, T.tradeMin, T.tradeMax);
  const champName = s.nbaHistory[s.nbaHistory.length - 1]?.champion;
  const rivalId = (s.stories ?? []).find((x) => x.kind === 'rival')?.teamId ?? s.nemesis;
  const byRank = [...nba.teams].sort((a, b) => b.strength - a.strength);
  const pools: Record<TradeAim, Team[]> = {
    better: byRank.filter((t) => fits(t) && rosterRank(nba, t.id) < mine),
    contender: byRank.slice(0, 5).filter(fits),
    champion: nba.teams.filter((t) => t.name === champName && fits(t)),
    rival: nba.teams.filter((t) => t.id === rivalId && t.id !== s.teamId),
    needed: byRank.filter((t) => t.id !== s.teamId && (t.roster[0]?.ovr ?? 99) < ovr && rosterRank(nba, t.id) > mine),
  };
  return (Object.keys(TRADE_AIM) as TradeAim[]).map((aim) => ({ aim, teams: pools[aim], chance: clamp(base * TRADE_AIM[aim].odds, 0.05, 0.85) })).filter((o) => o.teams.length > 0);
}

export const oddsWord = (p: number): 'High' | 'Moderate' | 'Low' => (p >= 0.45 ? 'High' : p >= 0.25 ? 'Moderate' : 'Low');

/** The player asks out. A deal may get done; if not, the relationship suffers. */
export function requestTrade(s: GameState, aim: TradeAim = 'better'): void {
  if (!canRequestTrade(s)) return;
  const opt = tradeOptions(s).find((o) => o.aim === aim);
  s.flags.tradeAsk = s.year;
  const nba = s.nba!;
  if (!opt || !chance(s.rng, opt.chance)) {
    const harsh = aim === 'rival';
    s.player.trust = adjust(s.player.trust, harsh ? -16 : -10);
    s.player.morale = adjust(s.player.morale, harsh ? -7 : -4);
    logDecision(s, 'trade', `Asked for a trade (${TRADE_AIM[aim].label.toLowerCase()}). Nobody bit.`, s.teamId!);
    s.toast = harsh ? 'Word got out that you wanted to join your rival. No deal, and your teammates have not forgotten.' : 'The front office shopped you around. No deal. Things are awkward at practice now.';
    s.tradeResult = { year: s.year, ok: false, text: `No deal. ${harsh ? 'Your rival passed, and your teammates heard about it (coach trust -16, morale -7).' : 'Nobody met the price (coach trust -10, morale -4).'} You stay with the ${teamById(nba, s.teamId!)?.name ?? 'team'}.` };
    return;
  }
  const to = opt.teams[int(s.rng, 0, Math.min(aim === 'better' ? 2 : 1, opt.teams.length - 1))];
  const from = teamById(nba, s.teamId)!;
  s.teamId = to.id;
  s.contract!.teamId = to.id;
  s.player.trust = aim === 'needed' ? 60 : 45;
  s.player.morale = adjust(s.player.morale, 6);
  if (aim === 'rival') s.player.rep = clamp(s.player.rep + 4, 0, 100);
  logDecision(s, 'trade', `Traded from the ${from.name} to the ${to.name} at his request (${TRADE_AIM[aim].label.toLowerCase()}).`, to.id);
  const extra = aim === 'rival' ? ['The rivalry is personal now (reputation +4)'] : aim === 'needed' ? ['They will build around you'] : aim === 'champion' ? ['Joining the champions'] : [];
  pushMoment(s, { kind: 'commit', title: 'Traded', teamName: to.name, color: to.color, text: `You asked out, and the ${from.name} found a deal. You are a member of the ${to.name}.`, lines: [`Roster rank: ${rosterRank(nba, to.id)} of ${nba.teams.length}`, 'Same contract, new team', ...extra] });
  s.toast = `Traded to the ${to.name}.`;
  s.tradeResult = { year: s.year, ok: true, team: to.name, color: to.color, rank: rosterRank(nba, to.id), text: `Traded to the ${to.name} (roster ${rosterRank(nba, to.id)} of ${nba.teams.length}). Same contract, new team.${extra.length ? ` ${extra.join('. ')}.` : ''}` };
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
